import { createClient } from 'npm:@supabase/supabase-js@2';
import { normalizeVisit } from './normalize.js';

const cors = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
 'Access-Control-Allow-Methods': 'POST, OPTIONS',
 'Cache-Control': 'no-store',
};
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers:{ ...cors, 'Content-Type':'application/json' } });
class Failure extends Error { constructor(message:string, public status=400) { super(message); } }
function required(value:unknown, label:string, max=200) {
 if(typeof value!=='string' || !value.trim() || value.length>max) throw new Failure(`${label} ไม่ถูกต้อง`);
 return value.trim();
}
function check(error: {message:string} | null) { if(error) throw new Failure('ฐานข้อมูลไม่สามารถบันทึกได้',500); }

// Gateway JWT verification is off because this function validates every JWT with Auth itself.
// No action, including Kobo calls, can run before the explicit admin check.
Deno.serve(async req => {
 if(req.method==='OPTIONS') return new Response(null,{headers:cors});
 if(req.method!=='POST') return reply({error:'Method not allowed'},405);
 try {
  const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token) throw new Failure('กรุณาเข้าสู่ระบบ',401);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await db.auth.getUser(token);
  if(authError || !user) throw new Failure('กรุณาเข้าสู่ระบบใหม่',401);
  const {data:admin,error:adminError}=await db.from('ecc_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  if(adminError || !admin) throw new Failure('เฉพาะผู้ดูแลระบบ',403);
  const bodyText=await req.text();
  if(bodyText.length>16000) throw new Failure('คำขอใหญ่เกินไป',413);
  const body=JSON.parse(bodyText);
  if(body.action==='inspect_kobo') {
   const secret=Deno.env.get('KOBO_API_TOKEN') || Deno.env.get('KOBO') || Deno.env.get('kobo');
   if(!secret) throw new Failure('ยังไม่ได้ตั้ง Secret ชื่อ KOBO หรือ KOBO_API_TOKEN',409);
   const uid=required(body.asset_uid,'Asset UID',80);
   if(!/^[A-Za-z0-9_-]{10,80}$/.test(uid)) throw new Failure('Asset UID ไม่ถูกต้อง');
   const response=await fetch(`https://kf.kobotoolbox.org/api/v2/assets/${uid}/?format=json`,{headers:{Authorization:`Token ${secret}`},redirect:'error',signal:AbortSignal.timeout(25000)});
   if(!response.ok) throw new Failure(`Kobo ตอบกลับ ${response.status} กรุณาตรวจสอบ Token และ Asset UID`,502);
   const asset=await response.json();
   const sampleResponse=await fetch(`https://kf.kobotoolbox.org/api/v2/assets/${uid}/data/?format=json&limit=100`,{headers:{Authorization:`Token ${secret}`},redirect:'error',signal:AbortSignal.timeout(25000)});
   let projectValues=[];
   if(sampleResponse.ok){const sample=await sampleResponse.json();projectValues=[...new Set((sample.results || []).map(r=>r['identity/project']).filter(v=>typeof v==='string' && v.trim()))];}
   return reply({name:asset.name,submission_count:asset.deployment__submission_count ?? null,project_values:projectValues,survey:asset.content?.survey ?? [],choices:asset.content?.choices ?? []});
  }
  const projectId=required(body.project_id,'โครงการ',36);
  const {data:project,error:projectError}=await db.from('ecc_projects').select('id').eq('id',projectId).maybeSingle();
  if(projectError || !project) throw new Failure('ไม่พบโครงการ',404);

  if(body.action==='grant_access') {
   const email=required(body.email,'อีเมล',254).toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Failure('อีเมลไม่ถูกต้อง');
   // Resolve existing users without changing their passwords or claiming their identity.
   let target=null;
   for(let page=1;page<=20;page++) {
    const {data,error}=await db.auth.admin.listUsers({page,perPage:100}); check(error);
    target=data.users.find(u=>u.email?.toLowerCase()===email) ?? null;
    if(target || data.users.length<100) break;
    if(page===20) throw new Failure('โปรดจัดการบัญชีนี้ใน Supabase Dashboard');
   }
   let created=false;
   if(!target) {
    const password=body.password;
    if(typeof password!=='string' || password.length<12 || password.length>128) throw new Failure('บัญชีใหม่ต้องมีรหัสผ่าน 12–128 ตัวอักษร');
    const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true});
    if(error || !data.user) throw new Failure('สร้างบัญชีไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน');
    target=data.user; created=true;
   }
   const {error}=await db.from('ecc_members').upsert({project_id:projectId,user_id:target.id});check(error);
   return reply({created,user_id:target.id});
  }
  if(body.action==='sync') {
   const secret=Deno.env.get('KOBO_API_TOKEN') || Deno.env.get('KOBO') || Deno.env.get('kobo');
   if(!secret) throw new Failure('ยังไม่ได้ตั้ง Secret ชื่อ KOBO หรือ KOBO_API_TOKEN',409);
   const {data:source,error}=await db.from('ecc_sources').select('*').eq('project_id',projectId).single();
   if(error || !source) throw new Failure('กรุณาตั้งแหล่งข้อมูล Kobo ก่อน');
   const offset=Number(body.offset ?? 0);
   if(!Number.isSafeInteger(offset) || offset<0 || offset>100000) throw new Failure('ตำแหน่งข้อมูลไม่ถูกต้อง');
   const url=new URL(`https://kf.kobotoolbox.org/api/v2/assets/${source.asset_uid}/data/`);
   url.searchParams.set('format','json');url.searchParams.set('limit','100');url.searchParams.set('start',String(offset));
   url.searchParams.set('sort',JSON.stringify({_id:1}));
   if(!source.whole_asset) url.searchParams.set('query',JSON.stringify({[source.filter_field]:source.filter_value}));
   const upstream=await fetch(url,{headers:{Authorization:`Token ${secret}`},redirect:'error',signal:AbortSignal.timeout(25000)});
   if(!upstream.ok) throw new Failure(`Kobo ตอบกลับ ${upstream.status} กรุณาตรวจสอบสิทธิ์และ Asset UID`,502);
   const payload=await upstream.json();
   if(!Array.isArray(payload.results) || payload.results.length>100) throw new Failure('รูปแบบข้อมูลจาก Kobo ไม่ถูกต้อง',502);
   const schemaResponse=await fetch(`https://kf.kobotoolbox.org/api/v2/assets/${source.asset_uid}/?format=json`,{headers:{Authorization:`Token ${secret}`},redirect:'error',signal:AbortSignal.timeout(25000)});
   if(!schemaResponse.ok)throw new Failure('อ่านคำถามและตัวเลือก Kobo ไม่สำเร็จ',502);
   const asset=await schemaResponse.json();
   const supported=asset.content?.survey?.some(f=>f.$xpath==='identity/project') && asset.content?.survey?.some(f=>f.$xpath==='identity/visit_date');
   let imported=0,drafts=0;
   for(const raw of payload.results) {
    // Defense in depth: do not trust the provider's filter alone.
    if(!source.whole_asset && String(raw[source.filter_field] ?? '')!==source.filter_value) continue;
    const sourceId=raw._uuid ?? raw._id;
    if(sourceId===undefined || sourceId===null) throw new Failure('ข้อมูล Kobo ไม่มีรหัสประจำรายการ',502);
    const {data:record,error:upsertError}=await db.from('ecc_imports').upsert({project_id:projectId,asset_uid:source.asset_uid,source_id:String(sourceId),raw,imported_at:new Date().toISOString()}, {onConflict:'project_id,asset_uid,source_id'}).select('id').single();
    check(upsertError);imported++;
    if(supported && record){
     const {data:inserted,error:draftError}=await db.from('ecc_visits').upsert({...normalizeVisit(raw,asset.content),project_id:projectId,import_id:record.id},{onConflict:'import_id',ignoreDuplicates:true}).select('id');
     check(draftError);drafts+=inserted?.length || 0;
    }
   }
   return reply({imported,drafts,next_offset:payload.next ? offset+payload.results.length : null});
  }
  throw new Failure('ไม่พบคำสั่ง');
 } catch(error) {
  if(error instanceof Failure) return reply({error:error.message},error.status);
  // Never echo provider payloads, tokens, raw submissions or passwords into logs/responses.
  return reply({error:'ดำเนินการไม่สำเร็จ กรุณาลองใหม่หรือตรวจสอบการตั้งค่า'},500);
 }
});
