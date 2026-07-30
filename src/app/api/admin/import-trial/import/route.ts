import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeImportedClassName,
  normalizeRegistrationNumber,
  parseScoreSheetWorkbook,
  ParsedScoreRecord,
} from '@/lib/adminScoreSheetImport';

export const dynamic = 'force-dynamic';

const classType = (className: string) => {
  const name = className.toLowerCase();
  if (name.includes('games')) return 'games';
  if (name.includes('obedience')) return 'obedience';
  if (['starter', 'advanced', 'pro', 'arf', 'zoom'].some((term) => name.includes(term))) return 'rally';
  return 'scent';
};

const chunks = <T,>(values: T[], size = 200) => {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
};

const loadRegistry = async (supabase: SupabaseClient, registrationNumbers: string[]) => {
  const rows: any[] = [];
  for (const group of chunks(registrationNumbers)) {
    const { data, error } = await supabase.from('cwags_registry').select('*').in('cwags_number', group);
    if (error) throw new Error(`Unable to match registrations: ${error.message}`);
    rows.push(...(data || []));
  }
  return new Map(rows.map((row) => [normalizeRegistrationNumber(row.cwags_number), row]));
};

const groupBy = <T,>(values: T[], keyFor: (value: T) => string) => {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const key = keyFor(value);
    grouped.set(key, [...(grouped.get(key) || []), value]);
  }
  return grouped;
};

export async function POST(request: NextRequest) {
  let createdTrialId: string | null = null;
  let supabase: SupabaseClient | null = null;
  try {
    const authHeader = request.headers.get('authorization');
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'administrator') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    const parsed = parseScoreSheetWorkbook(await file.arrayBuffer(), file.name);
    if (parsed.errors.length || parsed.records.length === 0) {
      return NextResponse.json({ error: parsed.errors.join(' ') || 'No scores found.' }, { status: 400 });
    }

    const dates = Array.from(new Set(parsed.records.map((record) => record.trialDate))).sort();
    const { data: trial, error: trialError } = await supabase
      .from('trials')
      .insert({
        trial_name: parsed.trialName,
        club_name: parsed.clubName || 'Imported Trial',
        location: parsed.clubName || 'Imported Trial',
        start_date: dates[0],
        end_date: dates[dates.length - 1],
        created_by: user.id,
        trial_status: 'completed',
        entry_status: 'closed',
        trial_secretary: user.email || '',
        secretary_email: user.email || '',
        waiver_text: 'Imported from completed C-WAGS score sheets',
        fee_configuration: { regular: 0, feo: 0 },
      })
      .select()
      .single();
    if (trialError || !trial) throw new Error(`Failed to create trial: ${trialError?.message || 'unknown error'}`);
    createdTrialId = trial.id;

    const dayIds = new Map<string, string>();
    for (let index = 0; index < dates.length; index++) {
      const { data: day, error } = await supabase
        .from('trial_days')
        .insert({ trial_id: trial.id, day_number: index + 1, trial_date: dates[index], day_status: 'completed' })
        .select('id')
        .single();
      if (error || !day) throw new Error(`Failed to create trial day ${dates[index]}: ${error?.message || 'unknown error'}`);
      dayIds.set(dates[index], day.id);
    }

    const classGroups = groupBy(parsed.records, (record) => `${record.trialDate}|${normalizeImportedClassName(record.className)}`);
    const roundIds = new Map<string, string>();
    let classOrder = 0;
    for (const [classKey, classRecords] of classGroups) {
      classOrder++;
      const example = classRecords[0];
      const dayId = dayIds.get(example.trialDate);
      if (!dayId) throw new Error(`No trial day was created for ${example.trialDate}.`);
      const { data: trialClass, error: classError } = await supabase
        .from('trial_classes')
        .insert({
          trial_day_id: dayId,
          class_name: example.className,
          class_type: classType(example.className),
          entry_fee: 0,
          feo_price: 0,
          class_order: classOrder,
          class_status: 'completed',
        })
        .select('id')
        .single();
      if (classError || !trialClass) throw new Error(`Failed to create ${example.className}: ${classError?.message || 'unknown error'}`);

      const rounds = groupBy(classRecords, (record) => String(record.roundNumber));
      for (const [roundNumber, roundRecords] of rounds) {
        const roundExample = roundRecords[0];
        const { data: round, error: roundError } = await supabase
          .from('trial_rounds')
          .insert({
            trial_class_id: trialClass.id,
            round_number: Number(roundNumber),
            judge_name: roundExample.judgeName,
            round_status: 'completed',
          })
          .select('id')
          .single();
        if (roundError || !round) throw new Error(`Failed to create ${example.className} round ${roundNumber}: ${roundError?.message || 'unknown error'}`);
        roundIds.set(`${classKey}|${roundNumber}`, round.id);
      }
    }

    const registrationNumbers = Array.from(new Set(parsed.records.map((record) => record.registrationNumber)));
    const registry = await loadRegistry(supabase, registrationNumbers);
    const entryIds = new Map<string, string>();
    for (const registrationNumber of registrationNumbers) {
      const source = parsed.records.find((record) => record.registrationNumber === registrationNumber)!;
      const registryDog = registry.get(registrationNumber);
      const { data: entry, error: entryError } = await supabase
        .from('entries')
        .insert({
          trial_id: trial.id,
          handler_name: registryDog?.handler_name || 'Imported Handler',
          dog_call_name: registryDog?.dog_call_name || source.dogName || 'Imported Dog',
          cwags_number: registrationNumber,
          handler_email: registryDog?.handler_email || 'imported@trial.com',
          handler_phone: registryDog?.handler_phone || null,
          waiver_accepted: true,
          total_fee: 0,
          payment_status: 'paid',
          entry_status: 'confirmed',
        })
        .select('id')
        .single();
      if (entryError || !entry) throw new Error(`Failed to create entry ${registrationNumber}: ${entryError?.message || 'unknown error'}`);
      entryIds.set(registrationNumber, entry.id);
    }

    let scoresCreated = 0;
    const positions = new Map<string, number>();
    for (const record of parsed.records) {
      const classKey = `${record.trialDate}|${normalizeImportedClassName(record.className)}`;
      const roundId = roundIds.get(`${classKey}|${record.roundNumber}`);
      const entryId = entryIds.get(record.registrationNumber);
      if (!roundId || !entryId) throw new Error(`Unable to link ${record.registrationNumber} to ${record.className} round ${record.roundNumber}.`);
      const runningPosition = (positions.get(roundId) || 0) + 1;
      positions.set(roundId, runningPosition);
      const { data: selection, error: selectionError } = await supabase
        .from('entry_selections')
        .insert({
          entry_id: entryId,
          trial_round_id: roundId,
          entry_type: 'regular',
          fee: 0,
          entry_status: 'confirmed',
          running_position: runningPosition,
        })
        .select('id')
        .single();
      if (selectionError || !selection) throw new Error(`Failed to create a run for ${record.registrationNumber}: ${selectionError?.message || 'unknown error'}`);
      const { error: scoreError } = await supabase.from('scores').insert({
        entry_selection_id: selection.id,
        trial_round_id: roundId,
        pass_fail: record.result,
        entry_status: record.result === 'ABS' ? 'ABS' : 'present',
      });
      if (scoreError) throw new Error(`Failed to save ${record.result} for ${record.registrationNumber}: ${scoreError.message}`);
      scoresCreated++;
    }

    const resultCounts = parsed.records.reduce(
      (counts, record: ParsedScoreRecord) => ({ ...counts, [record.result]: counts[record.result] + 1 }),
      { Pass: 0, Fail: 0, NQ: 0, ABS: 0 }
    );
    return NextResponse.json({
      success: true,
      trialId: trial.id,
      warnings: parsed.warnings,
      stats: { entriesCreated: entryIds.size, scoresCreated, ...resultCounts },
    });
  } catch (error) {
    console.error('Score-sheet import error:', error);
    if (createdTrialId && supabase) {
      const { error: rollbackError } = await supabase.from('trials').delete().eq('id', createdTrialId);
      if (rollbackError) console.error('Unable to roll back incomplete imported trial:', rollbackError);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import score sheets' },
      { status: 500 }
    );
  }
}
