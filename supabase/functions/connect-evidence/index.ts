import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {evidenceManifest,authorizedPhoto,safeImage} from './evidence.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
class Failure extends Error{constructor(message:string,public status=400){super(message);}}
const limit=12*1024*1024;
async function imageBytes(response:Response){
 if(Number(response.headers.get('content-length'))>limit)throw new Failure('รูปใหญ่กว่า 12 MB กรุณาลดขนาดใน Kobo',413);
 const reader=response.body?.getReader();if(!reader)throw new Failure('อ่านรูปไม่สำเร็จ',502);
 let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw new Failure('รูปใหญ่กว่า 12 MB',413);chunks.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const authorization=req.headers.get('Authorization') || '';const token=authorization.match(/^Bearer (.+)$/i)?.[1];
  if(!token)throw new Failure('กรุณาเข้าสู่ระบบ',401);
  const url=Deno.env.get('SUPABASE_URL')!;
  const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await service.auth.getUser(token);if(authError||!user)throw new Failure('กรุณาเข้าสู่ระบบใหม่',401);
  const scoped=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const text=await req.text();if(text.length>4000)throw new Failure('คำขอใหญ่เกินไป',413);const body=JSON.parse(text);
  if(!/^[0-9a-f-]{36}$/i.test(body.visit_id || ''))throw new Failure('รหัสรายงานไม่ถูกต้อง');
  // RLS enforces membership, publication state and admin access before privileged reads.
  const {data:visit,error}=await scoped.from('ecc_visits').select('id,project_id,import_id,report_photos').eq('id',body.visit_id).maybeSingle();
  if(error||!visit)throw new Failure('ไม่พบรายงานหรือไม่มีสิทธิ์',404);
  const {data:admin}=await scoped.from('ecc_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  const isAdmin=!!admin;
  if(!visit.import_id)return json({photos:[],message:'รายงานนี้ไม่ได้เชื่อมกับรายการ Kobo'});
  const {data:record,error:recordError}=await service.from('ecc_imports').select('*').eq('id',visit.import_id).eq('project_id',visit.project_id).single();
  if(recordError||!record)throw new Failure('ไม่พบข้อมูลต้นฉบับ',404);
  const secret=Deno.env.get('KOBO_API_TOKEN')||Deno.env.get('KOBO')||Deno.env.get('kobo');
  if(!secret)throw new Failure('ยังไม่ได้ตั้งการเชื่อมต่อ Kobo',409);
  if(!/^[A-Za-z0-9_-]{10,80}$/.test(record.asset_uid)||!/^\d+$/.test(String(record.raw._id)))throw new Failure('รหัสต้นฉบับไม่ถูกต้อง',409);
  const endpoint=`https://kf.kobotoolbox.org/api/v2/assets/${record.asset_uid}/data/${record.raw._id}/`;
  if(body.action==='refresh'){
   if(!isAdmin)throw new Failure('เฉพาะผู้ดูแลระบบ',403);
   const upstream=await fetch(endpoint+'?format=json',{headers:{Authorization:`Token ${secret}`},redirect:'error',signal:AbortSignal.timeout(25000)});
   if(!upstream.ok)throw new Failure('อ่านรายการล่าสุดจาก Kobo ไม่สำเร็จ',502);
   const latest=await upstream.json();
   if(String(latest._id)!==String(record.raw._id)||latest._uuid!==record.raw._uuid||latest['identity/project']!==record.raw['identity/project'])throw new Failure('ข้อมูลโครงการใน Kobo เปลี่ยน กรุณาตรวจสอบแหล่งข้อมูลก่อน',409);
   // Refresh media only; never overwrite curated report text or reassign projects.
   const {error:saveError}=await service.from('ecc_imports').update({raw:latest,imported_at:new Date().toISOString()}).eq('id',record.id);
   if(saveError)throw new Failure('บันทึกข้อมูลล่าสุดไม่สำเร็จ',500);record.raw=latest;
  }
  const manifest=evidenceManifest(record.raw);
  if(body.action==='refresh'||body.action==='manifest')return json({photos:isAdmin?manifest:(visit.report_photos||[]).filter(s=>manifest.some(p=>p.id===s.id)),message:manifest.length?'':'ยังไม่มีรูปแนบในรายการ Kobo นี้'});
  if(body.action!=='image')throw new Failure('ไม่พบคำสั่ง');
  const photo=authorizedPhoto(manifest,visit.report_photos,body.photo_id,isAdmin);if(!photo)throw new Failure('ไม่พบรูปหรือไม่มีสิทธิ์',404);
  // Never accept a user-supplied URL and never forward the Kobo secret to a redirect.
  const response=await fetch(`${endpoint}attachments/${photo.id}/`,{headers:{Authorization:`Token ${secret}`},redirect:'error',signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Failure('ดาวน์โหลดรูปจาก Kobo ไม่สำเร็จ กรุณาลองใหม่',502);
  const type=(response.headers.get('content-type')||'').split(';')[0];const bytes=await imageBytes(response);
  if(!safeImage(bytes,type))throw new Failure('รองรับเฉพาะรูป JPEG PNG หรือ WebP ที่ถูกต้อง',415);
  return new Response(bytes,{headers:{...cors,'Content-Type':type,'Content-Disposition':'inline'}});
 }catch(error){return error instanceof Failure?json({error:error.message},error.status):json({error:'ดึงรูปไม่สำเร็จ กรุณาลองใหม่'},500);}
});
