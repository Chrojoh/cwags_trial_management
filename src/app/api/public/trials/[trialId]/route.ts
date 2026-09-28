// src/app/api/public/trials/[trialId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth'
import { getEffectiveEntryStatus } from '@/lib/entryWindow'

async function addAvailability(rounds: any[]) {
  if (!rounds.length || !process.env.SUPABASE_SERVICE_ROLE_KEY) return rounds
  const db = getServiceRoleClient()
  const roundIds = rounds.map((round) => round.id).filter(Boolean)
  if (!roundIds.length) return rounds
  const { data, error } = await db
    .from('entry_selections')
    .select('trial_round_id,entry_status')
    .in('trial_round_id', roundIds)
  if (error) {
    console.warn('Unable to add public round availability', { code: error.code, message: error.message })
    return rounds
  }
  const occupied = new Map<string, number>()
  for (const selection of data || []) {
    if (['waitlisted', 'withdrawn'].includes(String(selection.entry_status || '').toLowerCase())) continue
    occupied.set(selection.trial_round_id, (occupied.get(selection.trial_round_id) || 0) + 1)
  }
  return rounds.map((round) => {
    const occupiedEntries = occupied.get(round.id) || 0
    const maximum = round.max_entries == null ? null : Number(round.max_entries)
    return {
      ...round,
      occupied_entries: occupiedEntries,
      is_full: maximum !== null && occupiedEntries >= maximum,
    }
  })
}

// This endpoint is PUBLIC - no authentication required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trialId: string }> }
) {
  try {
    const { trialId } = await params
    const staffEdit = request.nextUrl.searchParams.get('staffEdit') === 'true'
    if (staffEdit) {
      const auth = await requireTrialPermission(request, trialId, 'manage_entries')
      if (!auth.authorized) return auth.response
    }

    // Prefer the narrowly scoped public RPC. It exposes only published trial
    // entry-form data and does not depend on a deployment service-role secret.
    if (!staffEdit) {
      const publicDb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      const { data: publicPayload, error: publicError } = await publicDb.rpc(
        'get_public_trial_entry_form',
        { p_trial_id: trialId }
      )
      if (!publicError && publicPayload) {
        const payload = publicPayload as any
        if (payload?.trial) {
          payload.trial.entry_status = getEffectiveEntryStatus(payload.trial)
        }
        payload.rounds = await addAvailability(payload.rounds || [])
        return NextResponse.json(payload)
      }

      // Temporary compatibility path while the additive RPC migration is being
      // installed in an existing Supabase project.
      if (publicError) {
        console.warn('Public trial RPC unavailable; using compatibility lookup', {
          code: publicError.code,
          message: publicError.message,
        })
      } else {
        console.warn('Public trial RPC returned no eligible trial; checking active-trial compatibility')
      }
    }

    const db = getServiceRoleClient()
    let trialQuery = db
      .from('trials')
      .select(`id,trial_name,club_name,location,start_date,end_date,entries_open,
        entries_close_date,entry_status,entry_open_at,entry_timezone,trial_secretary,secretary_email,
        secretary_phone,default_entry_fee,default_feo_price,waiver_text`)
      .eq('id', trialId)
    if (!staffEdit) trialQuery = trialQuery.in('trial_status', ['published', 'active'])
    const { data: trial, error: trialError } = await trialQuery.maybeSingle()

    if (trialError) throw trialError
    if (!trial) {
      return NextResponse.json({ error: 'Trial not found' }, { status: 404 })
    }

    const { data: rounds, error: roundsError } = await db
      .from('trial_rounds')
      .select(`id,round_number,judge_name,trial_class_id,feo_available,max_entries,
        trial_classes!inner(
          class_name,games_subclass,trial_day_id,class_level,class_type,
          entry_fee,feo_available,feo_price,
          trial_days!inner(id,trial_id,trial_date,day_number,is_accepting_entries)
        )`)
      .eq('trial_classes.trial_days.trial_id', trialId)
    if (roundsError) throw roundsError

    const sortedRounds = (rounds || []).sort((a: any, b: any) => {
      const dayA = a.trial_classes?.trial_days?.day_number || 0
      const dayB = b.trial_classes?.trial_days?.day_number || 0
      return dayA - dayB || Number(a.round_number || 0) - Number(b.round_number || 0)
    })

    const publicTrial = {
      id: trial.id,
      trial_name: trial.trial_name,
      club_name: trial.club_name,
      location: trial.location,
      start_date: trial.start_date,
      end_date: trial.end_date,
      entries_open: trial.entries_open,
      entries_close_date: trial.entries_close_date,
      entry_status: trial.entry_status,
      entry_open_at: trial.entry_open_at,
      entry_timezone: trial.entry_timezone,
      trial_secretary: trial.trial_secretary,
      secretary_email: trial.secretary_email,
      secretary_phone: trial.secretary_phone,
      default_entry_fee: trial.default_entry_fee,
      default_feo_price: trial.default_feo_price,
      waiver_text: trial.waiver_text,
    }

    return NextResponse.json({
      trial: { ...publicTrial, entry_status: getEffectiveEntryStatus(publicTrial) },
      rounds: await addAvailability(sortedRounds),
      staff_edit_authorized: staffEdit,
    })
  } catch (error) {
    console.error('Public trial API error:', error)
    return NextResponse.json({ error: 'Failed to load trial' }, { status: 500 })
  }
}
