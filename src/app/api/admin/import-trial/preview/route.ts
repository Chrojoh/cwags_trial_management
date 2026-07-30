import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseScoreSheetWorkbook } from '@/lib/adminScoreSheetImport';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const supabase = createClient(
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
    const dates = Array.from(new Set(parsed.records.map((record) => record.trialDate))).sort();
    const rounds = new Map<string, typeof parsed.records>();
    for (const record of parsed.records) {
      const key = `${record.trialDate}|${record.className}|${record.roundNumber}`;
      const group = rounds.get(key) || [];
      group.push(record);
      rounds.set(key, group);
    }
    const days = dates.map((date, dayIndex) => {
      const dayRecords = parsed.records.filter((record) => record.trialDate === date);
      const classNames = Array.from(new Set(dayRecords.map((record) => record.className)));
      return {
        dayNumber: dayIndex + 1,
        date: new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        classes: classNames.map((className) => ({
          className,
          rounds: new Set(dayRecords.filter((record) => record.className === className).map((record) => record.roundNumber)).size,
          entries: new Set(dayRecords.filter((record) => record.className === className).map((record) => record.registrationNumber)).size,
        })),
      };
    });
    const resultCounts = parsed.records.reduce(
      (counts, record) => ({ ...counts, [record.result]: counts[record.result] + 1 }),
      { Pass: 0, Fail: 0, NQ: 0, ABS: 0 }
    );
    const summary = {
      trialId: '',
      trialName: parsed.trialName,
      clubName: parsed.clubName,
      dateRange: dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : '',
      stats: {
        totalDays: dates.length,
        totalClasses: new Set(parsed.records.map((record) => `${record.trialDate}|${record.className}`)).size,
        totalRounds: rounds.size,
        totalEntries: new Set(parsed.records.map((record) => record.registrationNumber)).size,
        totalScores: parsed.records.length,
        ...resultCounts,
      },
      days,
      detections: parsed.detections,
      warnings: parsed.warnings,
      errors: parsed.errors,
    };
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Score-sheet preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process score sheets' },
      { status: 500 }
    );
  }
}
