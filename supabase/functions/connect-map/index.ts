import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {mapState,MAP_VERSION,mapWindow} from './geometry.js';
import {TOKEN_URL,CATALOG_URL,PROCESS_URL,catalogRequest,selectScene,processRequest,pngValid} from './provider.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
class Failure extends Error{constructor(message:string,public status=400){super(message);}}
let authCache={token:'',until:0};let authPending:Promise<string>|null=null;
async function accessToken(id:string,secret:string){
 if(authCache.until>Date.now()+60000)return authCache.token;
 if(authPending)return authPending;
 authPending=(async()=>{
  const r=await fetch(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:id,client_secret:secret}),redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Failure('เชื่อมบัญชีภาพดาวเทียมไม่สำเร็จ กรุณาให้ผู้ดูแลตรวจการตั้งค่า',503);
  const p=await r.json();if(!p.access_token)throw new Failure('ไม่ได้รับสิทธิ์ดึงภาพดาวเทียม',503);
  authCache={token:p.access_token,until:Date.now()+Number(p.expires_in||300)*1000};return authCache.token;
 })();try{return await authPending;}finally{authPending=null;}
}
const hash=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join('');
async function post(url:string,body:unknown,token:string){
 const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(25000)});
 if(r.status===429)throw new Failure('โควตาภาพดาวเทียมชั่วคราวเต็ม กรุณาลองภายหลัง ระบบจะไม่เปลี่ยนไปใช้บริการเสียเงิน',429);
 if(r.status===401)authCache={token:'',until:0};
 if(!r.ok)throw new Failure('ผู้ให้บริการภาพดาวเทียมยังไม่พร้อม กรุณาลองภายหลัง',502);return r;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 let service:any,lease:any,key='';
 try{
  const authorization=req.headers.get('Authorization')||'',token=authorization.match(/^Bearer (.+)$/i)?.[1];
  if(!token)throw new Failure('กรุณาเข้าสู่ระบบ',401);
  const url=Deno.env.get('SUPABASE_URL')!;
  service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await service.auth.getUser(token);if(authError||!user)throw new Failure('กรุณาเข้าสู่ระบบใหม่',401);
  const scoped=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const text=await req.text();if(text.length>300)throw new Failure('คำขอใหญ่เกินไป',413);
  let body;try{body=JSON.parse(text);}catch{throw new Failure('คำขอไม่ถูกต้อง');}
  let visit:any;
  if(body.action==='demo'){
   const {data:admin}=await scoped.from('ecc_admins').select('user_id').eq('user_id',user.id).maybeSingle();
   if(!admin)throw new Failure('ไม่มีสิทธิ์',403);
   // Fixed public test location; never a customer's record and no arbitrary coordinate API.
   visit={id:null,plot_info:{gps:'13.75 100.50'},survey_date:'2026-11-01'};
  }else{
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.visit_id||''))throw new Failure('รหัสรายงานไม่ถูกต้อง');
   const {data,error}=await scoped.from('ecc_visits').select('id,plot_info,survey_date').eq('id',body.visit_id).maybeSingle();
   if(error||!data)throw new Failure('ไม่พบรายงานหรือไม่มีสิทธิ์',404);visit=data;
  }
  const state=mapState(visit.plot_info?.gps,visit.survey_date);
  if(state.status!=='loading')return json(state);
  key=await hash(JSON.stringify([MAP_VERSION,visit.id||'admin-demo',state.point,visit.survey_date]));
  const {data:cached,error:cacheError}=await service.from('ecc_report_maps').select('result,retry_after').eq('cache_key',key).maybeSingle();
  if(cacheError)throw new Failure('ระบบแผนที่ยังไม่พร้อม',503);
  if(cached?.result&&(cached.result.status==='ready'||Date.parse(cached.retry_after)>Date.now()))return json(cached.result);
  const id=Deno.env.get('CDSE_CLIENT_ID'),secret=Deno.env.get('CDSE_CLIENT_SECRET');
  if(!id||!secret)return json({...state,status:'not_configured',message:'ยังไม่ได้เชื่อมบัญชีภาพดาวเทียม กรุณาแจ้งผู้ดูแลระบบ'});
  const {data:claimed,error:claimError}=await service.rpc('ecc_claim_report_map',{p_key:key,p_visit_id:visit.id});
  if(claimError)throw new Failure('ระบบแผนที่ยังไม่พร้อม',503);
  if(!claimed)return json({...state,status:'busy',message:'กำลังเตรียมภาพหรือพักการเรียกบริการชั่วคราว กรุณาลองอีกครั้งในอีกสักครู่'});lease=claimed;
  const providerToken=await accessToken(id,secret);
  const catalog=await (await post(CATALOG_URL,catalogRequest(state.point,state.period),providerToken)).json();
  const scene=selectScene(catalog.features,state.period);let result:any;
  if(!scene)result={...state,status:'no_imagery',message:'ไม่พบภาพ Sentinel-2 ที่ผ่านเกณฑ์เมฆภายใน 60 วันก่อนหรือในวันสำรวจ'};
  else{
   const image=await post(PROCESS_URL,processRequest(state.point,scene),providerToken);
   if(Number(image.headers.get('content-length'))>2000000)throw new Failure('ไฟล์แผนที่ใหญ่เกินขนาดที่รองรับ',502);
   const bytes=new Uint8Array(await image.arrayBuffer());if(!pngValid(bytes))throw new Failure('รูปแบบภาพดาวเทียมไม่ถูกต้อง',502);
   let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
   result={status:'ready',point:state.point,dataUrl:'data:image/png;base64,'+btoa(binary),date:scene.properties.datetime.slice(0,10),cloudCover:scene.properties['eo:cloud_cover'],source:'Copernicus Sentinel-2 L2A / Copernicus Data Space Ecosystem',attribution:'Contains modified Copernicus Sentinel data ('+scene.properties.datetime.slice(0,4)+')',...mapWindow(state.point)};
  }
  const {error:saveError}=await service.from('ecc_report_maps').update({result,retry_after:new Date(Date.now()+86400000).toISOString()}).eq('cache_key',key).eq('lease_id',lease.lease_id);
  if(saveError)throw new Failure('บันทึกภาพแผนที่ไม่สำเร็จ กรุณาลองภายหลัง',503);
  return json(result);
 }catch(error){
  if(service&&lease)await service.from('ecc_report_maps').update({retry_after:new Date(Date.now()+300000).toISOString()}).eq('cache_key',key).eq('lease_id',lease.lease_id);
  return json({error:error instanceof Failure?error.message:'ดึงภาพดาวเทียมไม่สำเร็จ กรุณาลองภายหลัง'},error instanceof Failure?error.status:500);
 }
});
