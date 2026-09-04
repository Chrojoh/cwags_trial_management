import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, requireTrialPermission } from '@/lib/apiAuth';

export async function POST(request: NextRequest,{params}:{params:Promise<{trialId:string}>}) {
  try {
    const {trialId}=await params;
    const auth=await requireTrialPermission(request,trialId,'manage_entries');
    if(!auth.authorized) return auth.response;
    const body=await request.json();
    const operation=body.operation;
    const rpc=operation==='substitute'?'substitute_entry_selection_atomic':operation==='entry_type'?'switch_entry_type_atomic':null;
    if(!rpc) return NextResponse.json({error:'Invalid operation'},{status:400});
    const args=operation==='substitute'
      ? {p_trial_id:trialId,p_selection_id:body.selectionId,p_new_cwags:body.cwagsNumber,p_changed_by:auth.userId}
      : {p_trial_id:trialId,p_selection_id:body.selectionId,p_entry_type:body.entryType,p_changed_by:auth.userId};
    const {data,error}=await getServiceRoleClient().rpc(rpc,args);
    if(error) {
      const known=['SELECTION_NOT_FOUND','SELECTION_ALREADY_SCORED','HANDLER_NUMBER_MISMATCH','REGISTRY_DOG_NOT_FOUND','FEO_NOT_AVAILABLE','INVALID_ENTRY_TYPE'].find(code=>error.message.includes(code));
      return NextResponse.json({error:known||'Entry operation failed',code:known},{status:known==='SELECTION_NOT_FOUND'?404:409});
    }
    return NextResponse.json({success:true,result:data});
  } catch(error) { console.error('Atomic entry operation failed:',error); return NextResponse.json({error:'Entry operation failed'},{status:500}); }
}
