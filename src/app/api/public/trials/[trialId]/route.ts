// src/app/api/public/trials/[trialId]/route.ts
import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/apiAuth'

// This endpoint is PUBLIC - no authentication required
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trialId: string }> }
) {
  try {
    const { trialId } = await params

    const db = getServiceRoleClient()
    const { data: trial, error: trialError } = await db
      .from('trials')
      .select(`id,trial_name,club_name,location,start_date,end_date,entries_open,
        entries_close_date,entry_status,trial_secretary,secretary_email,
        secretary_phone,default_entry_fee,default_feo_price,waiver_text`)
      .eq('id', trialId)
      .maybeSingle()

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
      trial_secretary: trial.trial_secretary,
      secretary_email: trial.secretary_email,
      secretary_phone: trial.secretary_phone,
      default_entry_fee: trial.default_entry_fee,
      default_feo_price: trial.default_feo_price,
      waiver_text: trial.waiver_text,
    }

    return NextResponse.json({
      trial: publicTrial,
      rounds: sortedRounds
    })
  } catch (error) {
    console.error('Public trial API error:', error)
    return NextResponse.json({ error: 'Failed to load trial' }, { status: 500 })
  }
}
