import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/apiAuth';

const clean = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const normalizedName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  try {
    const { trialId } = await params;
    const body = await request.json();
    const cwagsNumber = clean(body.cwags_number, 32);
    const handlerName = clean(body.handler_name, 160);
    const dogCallName = clean(body.dog_call_name, 120);

    if (!cwagsNumber || !handlerName || !dogCallName) {
      return NextResponse.json(
        { error: 'Registration number, handler name, and dog name are required.' },
        { status: 400 }
      );
    }

    const db = getServiceRoleClient();
    const { data: trial, error: trialError } = await db
      .from('trials')
      .select('id,entry_status')
      .eq('id', trialId)
      .maybeSingle();
    if (trialError) throw trialError;
    if (!trial) return NextResponse.json({ error: 'Trial not found.' }, { status: 404 });
    if (trial.entry_status !== 'open') {
      return NextResponse.json({ error: 'Entries are not currently open.' }, { status: 403 });
    }

    const submittedEmail = clean(body.verification_email, 254).toLowerCase();
    const { data: verifiedEntry, error: verificationError } = await db
      .from('entries')
      .select('id')
      .eq('trial_id', trialId)
      .eq('cwags_number', cwagsNumber)
      .ilike('handler_email', submittedEmail)
      .limit(1)
      .maybeSingle();
    if (verificationError) throw verificationError;
    if (!submittedEmail || !verifiedEntry) {
      return NextResponse.json(
        { error: 'The submitted entry could not be verified.' },
        { status: 403 }
      );
    }

    const { data: existing, error: registryError } = await db
      .from('cwags_registry')
      .select('id,handler_name,dog_call_name,breed,dog_sex')
      .eq('cwags_number', cwagsNumber)
      .maybeSingle();
    if (registryError) throw registryError;

    const contactValues = {
      handler_email: clean(body.handler_email, 254) || null,
      handler_phone: clean(body.handler_phone, 64) || null,
      emergency_contact: clean(body.emergency_contact, 300) || null,
    };

    if (existing) {
      if (
        normalizedName(existing.handler_name || '') !== normalizedName(handlerName) ||
        normalizedName(existing.dog_call_name || '') !== normalizedName(dogCallName)
      ) {
        return NextResponse.json(
          { error: 'The registration number does not match the supplied handler and dog.' },
          { status: 409 }
        );
      }

      const updates = {
        ...contactValues,
        ...(!existing.breed && clean(body.dog_breed, 120)
          ? { breed: clean(body.dog_breed, 120) }
          : {}),
        ...(!existing.dog_sex && clean(body.dog_sex, 32)
          ? { dog_sex: clean(body.dog_sex, 32) }
          : {}),
      };
      const { error } = await db.from('cwags_registry').update(updates).eq('id', existing.id);
      if (error) throw error;
      return NextResponse.json({ success: true, action: 'updated' });
    }

    const { error: insertError } = await db.from('cwags_registry').insert({
      cwags_number: cwagsNumber,
      dog_call_name: dogCallName,
      handler_name: handlerName,
      ...contactValues,
      breed: clean(body.dog_breed, 120) || null,
      dog_sex: clean(body.dog_sex, 32) || null,
      is_junior_handler: body.is_junior_handler === true,
      is_active: true,
    });
    if (insertError) throw insertError;
    return NextResponse.json({ success: true, action: 'created' });
  } catch (error) {
    console.error('Public registry synchronization failed:', error);
    return NextResponse.json({ error: 'Unable to synchronize registry information.' }, { status: 500 });
  }
}
