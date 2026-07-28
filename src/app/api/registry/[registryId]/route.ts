import { NextResponse } from 'next/server';
import {
  AuthorizationError,
  getSupabaseAdmin,
  requireAdministrator,
} from '@/lib/server/authorization';

type RegistryUpdate = {
  handler_name?: string;
  dog_call_name?: string;
  handler_email?: string | null;
  handler_phone?: string | null;
  emergency_contact?: string | null;
  breed?: string | null;
  dog_sex?: string | null;
  is_junior_handler?: boolean;
  is_active?: boolean;
};

const textOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ registryId: string }> }
) {
  try {
    await requireAdministrator();
    const { registryId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const db = getSupabaseAdmin();

    const { data: existing, error: lookupError } = await db
      .from('cwags_registry')
      .select('*')
      .eq('id', registryId)
      .single();
    if (lookupError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Registry record not found.' },
        { status: 404 }
      );
    }

    const registryUpdates: RegistryUpdate = {
      handler_name: textOrNull(body.handler_name) ?? existing.handler_name,
      dog_call_name: textOrNull(body.dog_call_name) ?? existing.dog_call_name,
      handler_email: textOrNull(body.handler_email),
      handler_phone: textOrNull(body.handler_phone),
      emergency_contact: textOrNull(body.emergency_contact),
      breed: textOrNull(body.breed),
      dog_sex: textOrNull(body.dog_sex),
      is_junior_handler:
        typeof body.is_junior_handler === 'boolean'
          ? body.is_junior_handler
          : Boolean(existing.is_junior_handler),
      is_active: typeof body.is_active === 'boolean' ? body.is_active : Boolean(existing.is_active),
    };

    const { data: updatedRegistry, error: registryError } = await db
      .from('cwags_registry')
      .update(registryUpdates)
      .eq('id', registryId)
      .select()
      .single();
    if (registryError) throw registryError;

    const entryUpdates = {
      handler_name: registryUpdates.handler_name,
      dog_call_name: registryUpdates.dog_call_name,
      handler_email: registryUpdates.handler_email ?? '',
      handler_phone: registryUpdates.handler_phone,
      emergency_contact: registryUpdates.emergency_contact,
      dog_breed: registryUpdates.breed,
      dog_sex: registryUpdates.dog_sex,
      is_junior_handler: registryUpdates.is_junior_handler,
    };
    const { data: updatedEntries, error: entriesError } = await db
      .from('entries')
      .update(entryUpdates)
      .eq('cwags_number', existing.cwags_number)
      .select('id');

    if (entriesError) {
      const rollback = {
        handler_name: existing.handler_name,
        dog_call_name: existing.dog_call_name,
        handler_email: existing.handler_email,
        handler_phone: existing.handler_phone,
        emergency_contact: existing.emergency_contact,
        breed: existing.breed,
        dog_sex: existing.dog_sex,
        is_junior_handler: existing.is_junior_handler,
        is_active: existing.is_active,
      };
      await db.from('cwags_registry').update(rollback).eq('id', registryId);
      throw entriesError;
    }

    return NextResponse.json({
      success: true,
      registry: updatedRegistry,
      updatedEntries: updatedEntries?.length ?? 0,
    });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : 'Registry update failed.';
    console.error('Synchronized registry update failed:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
