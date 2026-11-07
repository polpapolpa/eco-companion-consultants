import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {automaticVisit,sourceMatches,canAutoUpdate,sourceKey,sameSubmission,submissionHash} from './model.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
class Failure extends Error{constructor(message:string,public status=400){super(message);}}
function check(error:unknown){if(error)throw new Failure('บันทึกรายงานอัตโนมัติไม่สำเร็จ กรุณาลองใหม่',500);}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 let service:any,lease:any=null;
 try{
  const authorization=req.headers.get('Authorization') || '';const token=authorization.match(/^Bearer (.+)$/i)?.[1];
  if(!token)throw new Failure('กรุณาเข้าสู่ระบบ',401);
  const url=Deno.env.get('SUPABASE_URL')!;
  service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await service.auth.getUser(token);if(authError||!user)throw new Failure('กรุณาเข้าสู่ระบบใหม่',401);
  const text=await req.text();if(text.length>1000)throw new Failure('คำขอใหญ่เกินไป',413);
  let body;try{body=JSON.parse(text);}catch{throw new Failure('คำขอไม่ถูกต้อง');}
  if(!/^[0-9a-f-]{36}$/i.test(body.project_id || ''))throw new Failure('รหัสโครงการไม่ถูกต้อง');
  const scoped=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  // Use the caller's RLS view before reading any privileged source or starting a Kobo request.
  const {data:project,error:projectError}=await scoped.from('ecc_projects').select('id').eq('id',body.project_id).maybeSingle();
  if(projectError||!project)throw new Failure('ไม่พบโครงการหรือไม่มีสิทธิ์',404);
  const {data:source,error:sourceError}=await service.from('ecc_sources').select('*').eq('project_id',project.id).maybeSingle();check(sourceError);
  if(!source)return json({skipped:'not_configured',changed:0,more:false});
  if(!source.auto_reports)return json({skipped:'disabled',changed:0,more:false});
  if(!/^[A-Za-z0-9_-]{10,80}$/.test(source.asset_uid))throw new Failure('แหล่งข้อมูลไม่ถูกต้อง',409);
  const secret=Deno.env.get('KOBO_API_TOKEN')||Deno.env.get('KOBO')||Deno.env.get('kobo');
  if(!secret)throw new Failure('โครงการยังไม่พร้อมซิงก์อัตโนมัติ',409);
  const {data:claimed,error:claimError}=await service.rpc('ecc_claim_auto_sync',{p_project_id:project.id,p_source_key:sourceKey(source)});check(claimError);
  if(!claimed)return json({skipped:'busy',changed:0,more:false});lease=claimed;
  const headers={Authorization:`Token ${secret}`};
  const endpoint=`https://kf.kobotoolbox.org/api/v2/assets/${source.asset_uid}/`;
  const dataUrl=new URL(endpoint+'data/');dataUrl.searchParams.set('format','json');dataUrl.searchParams.set('limit','100');dataUrl.searchParams.set('start',String(lease.next_offset));dataUrl.searchParams.set('sort',JSON.stringify({_id:-1}));
  if(!source.whole_asset)dataUrl.searchParams.set('query',JSON.stringify({[source.filter_field]:source.filter_value}));
  const [dataResponse,schemaResponse]=await Promise.all([fetch(dataUrl,{headers,redirect:'error',signal:AbortSignal.timeout(25000)}),fetch(endpoint+'?format=json',{headers,redirect:'error',signal:AbortSignal.timeout(25000)})]);
  if(!dataResponse.ok||!schemaResponse.ok)throw new Failure('Kobo ยังไม่ตอบกลับ กรุณาลองใหม่ภายหลัง',502);
  const payload=await dataResponse.json(),asset=await schemaResponse.json();
  if(!Array.isArray(payload.results)||payload.results.length>100)throw new Failure('รูปแบบข้อมูล Kobo ไม่ถูกต้อง',502);
  if(!asset.content?.survey?.some(f=>f.$xpath==='identity/project')||!asset.content?.survey?.some(f=>f.$xpath==='identity/visit_date'))throw new Failure('แบบฟอร์มนี้ยังไม่รองรับรายงานอัตโนมัติ',409);
  const rows=payload.results.filter(raw=>sourceMatches(raw,source));
  let changed=0;const processingStarted=Date.now();
  for(const raw of rows){
   if(Date.now()-processingStarted>80000)throw new Failure('กำลังเตรียมข้อมูลจำนวนมาก ระบบจะทำต่อในการตรวจครั้งถัดไป',503);
   const sid=raw._uuid ?? raw._id;if(sid===undefined||sid===null)throw new Failure('ข้อมูล Kobo ไม่มีรหัสประจำรายการ',502);
   const sourceId=String(sid);
   const {data:previous,error:previousError}=await service.from('ecc_imports').select('id,raw').eq('project_id',project.id).eq('asset_uid',source.asset_uid).eq('source_id',sourceId).maybeSingle();check(previousError);
   let record=previous;
   const rawChanged=!previous || !sameSubmission(previous.raw,raw);
   if(rawChanged){const r=await service.from('ecc_imports').upsert({project_id:project.id,asset_uid:source.asset_uid,source_id:sourceId,raw,imported_at:new Date().toISOString()},{onConflict:'project_id,asset_uid,source_id'}).select('id').single();check(r.error);record=r.data;}
   const {data:existing,error:existingError}=await service.from('ecc_visits').select('id,status,auto_update,auto_source_hash').eq('import_id',record.id).maybeSingle();check(existingError);
   // Curated drafts, published reports and administrator-edited auto reports are immutable to this sync.
   const hash=await submissionHash(raw);
   if(existing && (!canAutoUpdate(existing)||existing.auto_source_hash===hash))continue;
   const row={...automaticVisit(raw,asset.content),auto_source_hash:hash,project_id:project.id,import_id:record.id};
   if(existing){const r=await service.from('ecc_visits').update(row).eq('id',existing.id).eq('status','automatic').eq('auto_update',true).select('id');check(r.error);changed+=r.data?.length || 0;}
   else{const r=await service.from('ecc_visits').upsert(row,{onConflict:'import_id',ignoreDuplicates:true}).select('id');check(r.error);changed+=r.data?.length || 0;}
  }
  const more=!!payload.next && payload.results.length>0;
  const now=new Date().toISOString();const nextOffset=more?lease.next_offset+payload.results.length:0;
  const {error:finishError}=await service.from('ecc_auto_sync').update({next_offset:nextOffset,locked_until:now,next_allowed_at:new Date(Date.now()+(more?0:15000)).toISOString(),last_synced_at:now}).eq('project_id',project.id).eq('lease_id',lease.lease_id);check(finishError);lease=null;
  return json({changed,more,last_synced_at:now});
 }catch(error){
  if(lease&&service)await service.from('ecc_auto_sync').update({locked_until:new Date().toISOString(),next_allowed_at:new Date(Date.now()+15000).toISOString()}).eq('project_id',lease.project_id).eq('lease_id',lease.lease_id);
  return error instanceof Failure?json({error:error.message},error.status):json({error:'ตรวจข้อมูลรอบใหม่ไม่สำเร็จ กรุณาลองใหม่ภายหลัง'},500);
 }
});
