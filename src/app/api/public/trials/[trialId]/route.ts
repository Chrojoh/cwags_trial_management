// src/app/api/public/trials/[trialId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { simpleTrialOperations } from '@/lib/trialOperationsSimple'

// This endpoint is PUBLIC - no authentication required
export async function GET(
  request: NextRequest,
  { params }: { params: { trialId: string } }
) {
  try {
    const trialId = params.trialId

    // Get basic trial info (public data only)
    const trialResult = await simpleTrialOperations.getTrial(trialId)
    
    if (!trialResult.success) {
      return NextResponse.json({ error: 'Trial not found' }, { status: 404 })
    }

    // Get trial rounds
    const roundsResult = await simpleTrialOperations.getAllTrialRounds(trialId)

    return NextResponse.json({
      trial: trialResult.data,
      rounds: roundsResult.data || []
    })
  } catch (error) {
    console.error('Public trial API error:', error)
    return NextResponse.json({ error: 'Failed to load trial' }, { status: 500 })
  }
}