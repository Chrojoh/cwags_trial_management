import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';
import { loadPostTrialPackageModel } from '@/lib/server/postTrialPackage';

async function inspect(trialId: string) {
  const { ready, issues } = await loadPostTrialPackageModel(trialId);
  return { ready, issues };
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
