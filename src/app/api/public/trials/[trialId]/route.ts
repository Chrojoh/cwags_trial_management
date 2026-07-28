// src/app/api/public/trials/[trialId]/route.ts
import { NextResponse } from 'next/server'
import { simpleTrialOperations } from '@/lib/trialOperationsSimple'

// This endpoint is PUBLIC - no authentication required
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ trialId: string }> }
) {
  try {
    const { trialId } = await params

    // Get basic trial info (public data only)
    const trialResult = await simpleTrialOperations.getTrial(trialId)
    
    if (!trialResult.success) {
      return NextResponse.json({ error: 'Trial not found' }, { status: 404 })
    }

    // Get trial rounds
    const roundsResult = await simpleTrialOperations.getAllTrialRounds(trialId)

    const trial = trialResult.data
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
      rounds: roundsResult.data || []
    })
  } catch (error) {
    console.error('Public trial API error:', error)
    return NextResponse.json({ error: 'Failed to load trial' }, { status: 500 })
  }
}
