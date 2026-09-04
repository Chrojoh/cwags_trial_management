import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';

const placeholderJudge = (name: unknown) => !String(name || '').trim() || ['TBA','TBD','NO JUDGE ASSIGNED'].includes(String(name).trim().toUpperCase());

async function inspect(trialId:string) {
  const db=getServiceRoleClient();
  const [{data:entries,error:entryError},{data:rounds,error:roundError}]=await Promise.all([
    db.from('entries').select('id,cwags_number,registration_pending,amount_owed,amount_paid,fees_waived,entry_status').eq('trial_id',trialId),
    db.from('trial_rounds').select('id,judge_name,trial_classes!inner(trial_id)').eq('trial_classes.trial_id',trialId),
  ]);
  if(entryError) throw entryError; if(roundError) throw roundError;
  const activeEntries=(entries||[]).filter(e=>!['withdrawn','waitlisted'].includes(String(e.entry_status).toLowerCase()));
  const entryIds=activeEntries.map(e=>e.id);
  const roundIds=(rounds||[]).map(r=>r.id);
  const [{data:selections,error:selectionError},{data:scores,error:scoreError}]=await Promise.all([
    entryIds.length?db.from('entry_selections').select('id,entry_id,trial_round_id,entry_status').in('entry_id',entryIds):Promise.resolve({data:[],error:null}),
    roundIds.length?db.from('scores').select('entry_selection_id').in('trial_round_id',roundIds):Promise.resolve({data:[],error:null}),
  ]);
  if(selectionError) throw selectionError; if(scoreError) throw scoreError;
  const activeSelections=(selections||[]).filter(s=>!['withdrawn','waitlisted'].includes(String(s.entry_status).toLowerCase()));
  const scored=new Set((scores||[]).map(s=>s.entry_selection_id));
  const issues={
    pendingRegistration:activeEntries.filter(e=>e.registration_pending||!e.cwags_number).length,
    placeholderJudges:(rounds||[]).filter(r=>placeholderJudge(r.judge_name)).length,
    missingScores:activeSelections.filter(s=>!scored.has(s.id)&&!['no_show'].includes(String(s.entry_status).toLowerCase())).length,
    outstandingBalances:activeEntries.filter(e=>!e.fees_waived&&Number(e.amount_owed||0)-Number(e.amount_paid||0)>0.005).length,
  };
  return {ready:Object.values(issues).every(v=>v===0),issues};
}

export async function GET(request:NextRequest,{params}:{params:Promise<{trialId:string}>}) {
  const {trialId}=await params; const auth=await requireTrialPermission(request,trialId,'edit_trial'); if(!auth.authorized)return auth.response;
  try{return NextResponse.json(await inspect(trialId));}catch(error){console.error(error);return NextResponse.json({error:'Failed to inspect trial readiness'},{status:500});}
}

export async function POST(request:NextRequest,{params}:{params:Promise<{trialId:string}>}) {
  const {trialId}=await params; const auth=await requireTrialPermission(request,trialId,'edit_trial'); if(!auth.authorized)return auth.response;
  try {
    const body=await request.json().catch(()=>({})); const readiness=await inspect(trialId); const reason=String(body.overrideReason||'').trim();
    if(!readiness.ready&&!reason)return NextResponse.json({error:'An override reason is required while readiness items remain.',readiness},{status:409});
    const db=getServiceRoleClient();
    const {error:updateError}=await db.from('trials').update({trial_status:'completed'}).eq('id',trialId); if(updateError)throw updateError;
    const {error:logError}=await db.from('trial_activity_log').insert({trial_id:trialId,activity_type:'trial_completed',user_id:auth.userId,user_name:'Trial secretary',snapshot_data:{readiness,override_reason:reason||null}}); if(logError)throw logError;
    return NextResponse.json({success:true,readiness});
  } catch(error){console.error(error);return NextResponse.json({error:'Failed to complete trial'},{status:500});}
}
