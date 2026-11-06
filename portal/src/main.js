import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL,SUPABASE_KEY } from './config.js';
import { sections,display,reportModel } from './report-model.js';
import '@fontsource/ibm-plex-sans-thai/400.css';
import '@fontsource/ibm-plex-sans-thai/600.css';
import '@fontsource/noto-serif-thai/700.css';
import '@fontsource/playfair-display/700.css';
import {masthead,companyFooter,workspaceHtml} from './brand.js';
import './style.css';
import './company-theme.css';

let recovering=new URLSearchParams(location.hash.slice(1)).get('type')==='recovery';
const db=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,storage:window.sessionStorage,detectSessionInUrl:true}});
const app=document.querySelector('#app');
let user=null,admin=false,clients=[],projects=[],visits=[],selected='',view='dashboard';
const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query=async task=>{const {data,error}=await task;if(error) throw error;return data;};
const select=(items,key='id',label='name')=>items.map(x=>`<option value="${esc(x[key])}">${esc(x[label])}</option>`).join('');
const field=(name,label,value='',type='text',required=false)=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${type==='password'?'autocomplete="new-password" minlength="12" maxlength="128"':''}></label>`;
function notify(message,error=false) {const n=document.querySelector('#notice');n.textContent=message;n.className=error?'show error':'show';clearTimeout(notify.timer);notify.timer=setTimeout(()=>n.className='',8000);}
async function action(button,work) {if(button.disabled)return;button.disabled=true;try{await work();}catch(error){notify(error.message || 'ดำเนินการไม่สำเร็จ',true);}finally{button.disabled=false;}}
function bindForm(id,work) {document.getElementById(id)?.addEventListener('submit',event=>{event.preventDefault();action(event.submitter,()=>work(new FormData(event.target),event.target));});}
function shell(content) {
 app.innerHTML=workspaceHtml({content,view,admin,email:esc(user.email)});
 document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{view=b.dataset.nav;render();});
 document.querySelector('#logout').onclick=()=>action(document.querySelector('#logout'),async()=>{await db.auth.signOut();user=null;admin=false;clients=[];projects=[];visits=[];login();});
 document.querySelector('#password').onclick=()=>{
  modal(`<h2>เปลี่ยนรหัสผ่าน</h2><form id="pw">${field('password','รหัสผ่านใหม่ อย่างน้อย 12 ตัวอักษร','','password',true)}${field('confirm','ยืนยันรหัสผ่าน','','password',true)}<button class="primary">บันทึกรหัสผ่าน</button></form>`);
  bindForm('pw',async f=>{if(f.get('password')!==f.get('confirm'))throw Error('รหัสผ่านไม่ตรงกัน');await query(db.auth.updateUser({password:f.get('password')}));closeModal();notify('เปลี่ยนรหัสผ่านแล้ว');});
 };
}
function modal(html) {const el=document.querySelector('#modal');el.innerHTML=`<button class="close quiet" aria-label="ปิด">×</button>${html}`;el.querySelector('.close').onclick=()=>el.close();el.showModal();}
function closeModal(){document.querySelector('#modal').close();}
function login() {
 app.innerHTML=`${masthead()}<div class="login"><section class="login-story"><div class="story-copy"><span class="eyebrow">ECO COMPANION CONNECT</span><h1>ติดตามความเปลี่ยนแปลง<br>ร่วมสร้างการฟื้นฟูที่ยั่งยืน</h1><p>ข้อมูลภาคสนาม ผลการติดตาม และรายงานโครงการ<br>ในพื้นที่ทำงานเดียวสำหรับคุณ</p><div class="dimensions"><span>01 &nbsp; นิเวศ</span><span>02 &nbsp; สังคม</span><span>03 &nbsp; เศรษฐกิจ</span></div></div><small>FROM FIELD EVIDENCE TO INFORMED ACTION</small></section><section class="login-panel"><div class="login-box"><span class="eyebrow">YOUR PROJECT WORKSPACE</span><h2>ยินดีต้อนรับ</h2><p>เข้าสู่ระบบเพื่อดูข้อมูลโครงการของคุณ</p><form id="login"><label>อีเมล<input type="email" name="email" autocomplete="username" required placeholder="name@company.com"></label><label>รหัสผ่าน<input type="password" name="password" autocomplete="current-password" required placeholder="รหัสผ่านของคุณ"></label><button class="primary full">เข้าสู่ระบบ <span>→</span></button></form><p class="help">หากยังไม่มีบัญชีหรือลืมรหัสผ่าน<br>กรุณาติดต่อผู้ประสานงาน Eco Companion</p><div class="login-note"><span class="secure-dot"></span> เข้าถึงเฉพาะข้อมูลโครงการที่คุณได้รับสิทธิ์</div></div></section></div>${companyFooter()}`;
 bindForm('login',async f=>{const {data,error}=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)throw Error('เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน');user=data.user;await load();});
}
async function load() {
 admin=(await query(db.from('ecc_admins').select('user_id'))).some(x=>x.user_id===user.id);
 [clients,projects,visits]=await Promise.all([
  query(db.from('ecc_clients').select('*').order('name')),
  query(db.from('ecc_projects').select('*').order('name')),
  query(db.from('ecc_visits').select('*').order('survey_date',{ascending:false,nullsFirst:false})),
 ]);
 if(selected && !projects.some(p=>p.id===selected))selected='';render();
}
function heading(kicker,title,text,extra='') {return `<div class="page-heading"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${text}</p></div>${extra}</div>`;}
function render() {
 if(view==='admin' && admin){adminPage();return;}
 const filtered=visits.filter(v=>!selected || v.project_id===selected);
 const published=filtered.filter(v=>v.status==='published');
 const projectFilter=`<label class="filter">โครงการ<select id="project-filter"><option value="">ทุกโครงการที่ได้รับสิทธิ์</option>${select(projects)}</select></label>`;
 if(view==='reports') shell(heading('FIELD REPORTS','รายงานการประเมิน','เลือกอ่านรายงาน หรือดาวน์โหลด PDF และ Word เพื่อนำไปใช้งาน',projectFilter)+reportList(filtered));
 else shell(heading('PROJECT OVERVIEW','ภาพรวมการติดตามโครงการ','เชื่อมโยงข้อมูลภาคสนามกับความก้าวหน้าของโครงการ',projectFilter)+
  `<section class="stats"><article><span>โครงการที่เข้าถึงได้</span><strong>${selected?1:projects.length}</strong><small>ตามสิทธิ์บัญชีของคุณ</small></article><article><span>รายงานที่เผยแพร่แล้ว</span><strong>${published.length}</strong><small>พร้อมอ่านและดาวน์โหลด</small></article><article><span>รอบสำรวจล่าสุด</span><strong class="date">${esc(published.filter(v=>v.survey_date).map(v=>v.survey_date).sort().at(-1) || 'ยังไม่มีข้อมูล')}</strong><small>จากรายงานที่เผยแพร่</small></article></section><section class="insight"><div><span class="eyebrow">THREE DIMENSIONS OF RESTORATION</span><h2>มองการฟื้นฟูอย่างรอบด้าน</h2><p>อ่านผลการสำรวจ พร้อมหลักฐาน ข้อจำกัด และข้อเสนอแนะในแต่ละรายงาน</p></div><div class="dimension-chips"><span>นิเวศ</span><span>สังคม</span><span>เศรษฐกิจ</span></div></section><div class="section-title"><h2>รายงานล่าสุด</h2><span>${filtered.length} รายการ</span></div>`+reportList(filtered.slice(0,6)));
 document.querySelector('#project-filter').value=selected;
 document.querySelector('#project-filter').onchange=e=>{selected=e.target.value;render();};
 bindReports();
}
function reportList(items) {
 if(!items.length)return `<section class="empty"><div>▤</div><h3>ยังไม่มีรายงานในพื้นที่นี้</h3><p>${admin?'เพิ่มโครงการและนำเข้าข้อมูล Kobo เพื่อเริ่มจัดทำรายงาน':'รายงานจะแสดงเมื่อทีมงานตรวจสอบและเผยแพร่แล้ว'}</p></section>`;
 return `<div class="report-grid">${items.map(v=>`<article class="report-card"><div class="card-top"><span class="badge ${v.status==='draft'?'draft':''}">${v.status==='draft'?'ฉบับร่าง':'เผยแพร่แล้ว'}</span><time>${esc(v.survey_date || 'ไม่ระบุวันที่')}</time></div><p class="project-name">${esc(projects.find(p=>p.id===v.project_id)?.name)}</p><h3>${esc(v.title)}</h3><p class="excerpt">${esc(v.summary || 'เปิดรายงานเพื่ออ่านรายละเอียดการประเมิน')}</p><div class="card-bottom"><span>${esc(v.plot || 'ไม่ระบุแปลง')}</span><button class="link" data-report="${v.id}">เปิดรายงาน →</button></div></article>`).join('')}</div>`;
}
function bindReports(){document.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>report(b.dataset.report));}
function report(id) {
 const v=visits.find(x=>x.id===id);const project=projects.find(x=>x.id===v.project_id);const m=reportModel(v,project,clients.find(c=>c.id===project.client_id));
 shell(`<div class="report-toolbar"><button class="quiet" id="back">← กลับหน้ารายงาน</button><div><button id="pdf" class="primary">ดาวน์โหลด PDF</button><button id="docx" class="secondary">ดาวน์โหลด Word</button>${admin?'<button id="edit" class="secondary">แก้ไขรายงาน</button>':''}</div></div><article class="document"><div class="document-brand">ECO COMPANION CONSULTANTS <span>${m.draft?'ฉบับร่าง':'รายงานที่เผยแพร่แล้ว'}</span></div><p class="eyebrow">รายงานการติดตามและประเมินผล</p><h1>${esc(m.title)}</h1><p>${esc(m.project)} · ${esc(m.client)}</p><dl>${m.metadata.map(([k,val])=>`<div><dt>${k}</dt><dd>${esc(val)}</dd></div>`).join('')}</dl>${m.sections.map(s=>`<section><h2>${s.title}</h2><p class="pre">${esc(s.text)}</p></section>`).join('')}<small>รหัสรายงาน ${v.id}</small></article>`);
 document.querySelector('#back').onclick=()=>{view='reports';render();};
 document.querySelector('#pdf').onclick=e=>action(e.currentTarget,async()=>{const {downloadPdf}=await import('./reports.js');await downloadPdf(m);notify('สร้างไฟล์ PDF แล้ว');});
 document.querySelector('#docx').onclick=e=>action(e.currentTarget,async()=>{const {downloadDocx}=await import('./reports.js');await downloadDocx(m);notify('สร้างไฟล์ Word แล้ว');});
 if(admin)document.querySelector('#edit').onclick=()=>editReport(v);
}
function adminPage() {
 shell(heading('WORKSPACE ADMINISTRATION','จัดการข้อมูลและสิทธิ์','ข้อมูล Kobo จะยังไม่แสดงให้ลูกค้าเห็น จนกว่าจะบันทึกและเผยแพร่รายงาน')+
  `<section class="panel"><h2>ตรวจสอบแบบฟอร์ม Kobo</h2><p class="help">ตรวจฟิลด์จริงเพื่อเลือกรหัสโครงการให้ตรงกัน ก่อนตั้งค่าการนำเข้าข้อมูลหลายโครงการ</p><form id="inspect-kobo">${field('asset_uid','Asset UID ของแบบฟอร์ม','aKSW6sV9VPkFPjjkKJEd75','text',true)}<button class="secondary">ตรวจการเชื่อมต่อและดูคำถาม</button></form><div id="kobo-schema"></div></section>`+
  `<div class="admin-grid"><section class="panel"><h2>1. เพิ่มลูกค้า</h2><form id="client">${field('name','ชื่อบริษัท / ลูกค้า','','text',true)}<button class="primary">เพิ่มลูกค้า</button></form></section><section class="panel"><h2>2. เพิ่มโครงการ</h2><form id="project"><label>ลูกค้า<select name="client_id" required><option value="">เลือกลูกค้า</option>${select(clients)}</select></label>${field('name','ชื่อโครงการจริง','','text',true)}<button class="primary">เพิ่มโครงการ</button></form></section></div><section class="panel"><h2>3. เลือกโครงการเพื่อจัดการ</h2><select id="manage-project"><option value="">เลือกโครงการ</option>${select(projects)}</select><div id="project-tools"></div></section>`);
 bindForm('client',async f=>{await query(db.from('ecc_clients').insert({name:f.get('name').trim()}));await load();notify('เพิ่มลูกค้าแล้ว');});
 bindForm('inspect-kobo',async f=>{const asset=await api({action:'inspect_kobo',asset_uid:f.get('asset_uid')});document.querySelector('#kobo-schema').innerHTML=`<h3>${esc(asset.name)}</h3><p>จำนวนข้อมูลที่ Kobo รายงาน: ${esc(display(asset.submission_count))}</p><p>ชื่อโครงการที่พบใน 100 รายการแรก: ${esc((asset.project_values || []).join(' / ') || 'ยังไม่พบ')}</p><details><summary>ดูคำถามและตัวเลือกต้นฉบับ</summary><pre>${esc(JSON.stringify({survey:asset.survey,choices:asset.choices},null,2))}</pre></details>`;notify('เชื่อมต่อ Kobo สำเร็จ');});
 bindForm('project',async f=>{await query(db.from('ecc_projects').insert({client_id:f.get('client_id'),name:f.get('name').trim()}));await load();notify('เพิ่มโครงการแล้ว');});
 const picker=document.querySelector('#manage-project');picker.value=selected;
 picker.onchange=()=>{selected=picker.value;action(picker,projectTools);};
 if(selected)action(picker,projectTools);
}
async function api(body) {const {data,error}=await db.functions.invoke('connect-admin',{body});if(error){let detail;try{detail=await error.context?.json();}catch{}throw Error(detail?.error || 'เชื่อมต่อบริการไม่สำเร็จ');}if(data.error)throw Error(data.error);return data;}
async function projectTools() {
 const container=document.querySelector('#project-tools');const pid=selected;if(!pid){container.innerHTML='';return;}
 const [source,imports,members]=await Promise.all([
  query(db.from('ecc_sources').select('*').eq('project_id',pid).maybeSingle()),
  query(db.from('ecc_imports').select('id,source_id,imported_at').eq('project_id',pid).order('imported_at',{ascending:false}).limit(100)),
  query(db.from('ecc_members').select('*').eq('project_id',pid)),
 ]);if(selected!==pid)return;
 container.innerHTML=`<div class="admin-grid tools"><section><h3>บัญชีลูกค้า</h3><form id="access">${field('email','อีเมลสำหรับเข้าสู่ระบบ','','email',true)}${field('password','รหัสผ่านเริ่มต้น (เฉพาะบัญชีใหม่)','','password')}<p class="help">ตั้งรหัสผ่านอย่างน้อย 12 ตัวอักษร ให้ลูกค้าเปลี่ยนเมื่อเข้าครั้งแรก บัญชีที่มีอยู่แล้วจะใช้รหัสผ่านเดิม</p><button class="primary">ให้สิทธิ์เข้าถึงโครงการนี้</button></form><details><summary>บัญชีที่มีสิทธิ์ (${members.length})</summary>${members.map(m=>`<div class="member"><code>${m.user_id}</code><button class="quiet revoke" data-user="${m.user_id}">ถอนสิทธิ์</button></div>`).join('') || '<p>ยังไม่มีบัญชีลูกค้า</p>'}</details></section><section><h3>เชื่อมต่อ Kobo</h3><form id="source">${field('asset_uid','Asset UID',source?.asset_uid || 'aKSW6sV9VPkFPjjkKJEd75','text',true)}${field('filter_field','ชื่อฟิลด์ที่ระบุโครงการ (ชื่อในข้อมูลดิบ)',source?.filter_field || 'identity/project')}${field('filter_value','ค่าที่ต้องตรงกันแบบข้อความ',source?.filter_value || '')}<label class="check"><input name="whole_asset" type="checkbox" ${source?.whole_asset?'checked':''}> แบบฟอร์มนี้เป็นของโครงการนี้ทั้งหมด</label><p class="help">หากแบบฟอร์มมีหลายโครงการ ต้องกำหนดชื่อฟิลด์และค่าให้ชัดเจนก่อนดึงข้อมูล</p><button class="secondary">บันทึกแหล่งข้อมูล</button></form><button class="primary" id="sync" ${source?'':'disabled'}>ดึงข้อมูล Kobo (ครั้งละ 100 รายการ)</button><p id="sync-state" class="help"></p></section></div><div class="section-title"><h3>ข้อมูลนำเข้าล่าสุด (${imports.length})</h3><button class="secondary" id="new-report">สร้างรายงานด้วยตนเอง</button></div><p class="help">เปิดข้อมูลต้นฉบับเพื่อตรวจสอบ แล้วคัดเลือกเฉพาะข้อมูลที่เหมาะสมลงในรายงาน ระบบไม่เผยแพร่ข้อมูลดิบให้ลูกค้า</p><div class="import-list">${imports.map(i=>`<div><span>Kobo · ${esc(i.source_id)}<small>${esc(i.imported_at)}</small></span><button class="secondary" data-import="${i.id}">ตรวจสอบ / จัดทำรายงาน</button></div>`).join('') || '<p>ยังไม่มีข้อมูลนำเข้า</p>'}</div>`;
 bindForm('access',async(f,form)=>{const r=await api({action:'grant_access',project_id:pid,email:f.get('email'),password:f.get('password')});form.reset();notify(r.created?'สร้างบัญชีและให้สิทธิ์แล้ว':'ให้สิทธิ์บัญชีที่มีอยู่แล้ว');await projectTools();});
 document.querySelectorAll('.revoke').forEach(b=>b.onclick=()=>{modal(`<h2>ถอนสิทธิ์โครงการนี้</h2><p>บัญชี ${esc(b.dataset.user)} จะไม่สามารถอ่านข้อมูลโครงการนี้ผ่านระบบได้อีก ไฟล์ที่ดาวน์โหลดไปแล้วจะยังอยู่</p><button id="confirm-revoke" class="primary">ยืนยันถอนสิทธิ์</button>`);document.querySelector('#confirm-revoke').onclick=e=>action(e.currentTarget,async()=>{await query(db.from('ecc_members').delete().eq('project_id',pid).eq('user_id',b.dataset.user));closeModal();await projectTools();});});
 bindForm('source',async f=>{const whole=f.has('whole_asset');if(!whole && (!f.get('filter_field').trim() || !f.get('filter_value').trim()))throw Error('ระบุฟิลด์และค่าโครงการ หรือยืนยันว่าทั้งแบบฟอร์มเป็นโครงการนี้');await query(db.from('ecc_sources').upsert({project_id:pid,asset_uid:f.get('asset_uid').trim(),whole_asset:whole,filter_field:whole?null:f.get('filter_field').trim(),filter_value:whole?null:f.get('filter_value').trim()}));notify('บันทึกแหล่งข้อมูลแล้ว');await projectTools();});
 let offset=0;
 document.querySelector('#sync').onclick=e=>action(e.currentTarget,async()=>{const r=await api({action:'sync',project_id:pid,offset});offset=r.next_offset ?? 0;document.querySelector('#sync-state').textContent=`นำเข้า ${r.imported} รายการ / ฉบับร่างใหม่ ${r.drafts} รายงาน ${r.next_offset!==null?'กดอีกครั้งเพื่อดึงหน้าถัดไป':'ครบแล้ว • กลับมาหน้านี้เพื่อดูรายการใหม่'}`;e.target.textContent=r.next_offset!==null?'ดึง 100 รายการถัดไป':'ดึงข้อมูลใหม่อีกครั้ง';notify('นำเข้าแล้ว เปิดโครงการนี้อีกครั้งเพื่อดูรายการล่าสุด');});
 document.querySelector('#new-report').onclick=()=>editReport({project_id:pid,status:'draft'});
 document.querySelectorAll('[data-import]').forEach(b=>b.onclick=()=>action(b,async()=>{const raw=await query(db.from('ecc_imports').select('*').eq('id',b.dataset.import).single());const existing=visits.find(v=>v.import_id===raw.id);editReport(existing || {project_id:pid,import_id:raw.id,status:'draft'},raw.raw);}));
}
function editReport(v,raw=null) {
 modal(`<h2>${v.id?'แก้ไขรายงาน':'จัดทำรายงาน'}</h2>${raw?`<details><summary>ข้อมูล Kobo ต้นฉบับ (ผู้ดูแลเท่านั้น)</summary><pre>${esc(JSON.stringify(raw,null,2))}</pre></details>`:''}<form id="report-form">${field('title','ชื่อรายงาน',v.title || '','text',true)}<div class="two-col">${field('survey_date','วันที่สำรวจ',v.survey_date || '','date')}${field('plot','พื้นที่ / แปลง',v.plot || '')}</div>${field('assessor','ผู้ประเมิน',v.assessor || '')}${sections.map(([key,label])=>`<label>${label}<textarea name="${key}" rows="4" placeholder="เว้นว่างหากไม่มีข้อมูล หรือระบุว่าไม่เกี่ยวข้องพร้อมเหตุผล">${esc(v[key] || '')}</textarea></label>`).join('')}<label>สถานะ<select name="status"><option value="draft">ฉบับร่าง — ผู้ดูแลเห็นเท่านั้น</option><option value="published">เผยแพร่ให้ลูกค้าที่ได้รับสิทธิ์</option></select></label><label class="check"><input type="checkbox" name="reviewed"> ตรวจสอบความถูกต้องและข้อมูลส่วนบุคคลในรายงานนี้แล้ว</label><button class="primary">บันทึกรายงาน</button></form>`);
 document.querySelector('[name="status"]').value=v.status;
 bindForm('report-form',async f=>{if(f.get('status')==='published' && !f.has('reviewed'))throw Error('กรุณาตรวจสอบและยืนยันก่อนเผยแพร่');const row={project_id:v.project_id,import_id:v.import_id || null,title:f.get('title').trim(),survey_date:f.get('survey_date') || null,plot:f.get('plot').trim(),assessor:f.get('assessor').trim(),status:f.get('status')};sections.forEach(([k])=>row[k]=f.get(k).trim());if(v.id)await query(db.from('ecc_visits').update(row).eq('id',v.id));else await query(db.from('ecc_visits').insert(row));closeModal();await load();notify('บันทึกรายงานแล้ว');});
}
function recoveryForm() {
 app.innerHTML=`<div class="login-panel" style="min-height:100vh"><div class="login-box"><span class="eyebrow">ECO COMPANION CONNECT</span><h2>ตั้งรหัสผ่านใหม่</h2><p>ตั้งรหัสผ่านสำหรับบัญชี Connect ของคุณ</p><form id="recover">${field('password','รหัสผ่านใหม่ อย่างน้อย 12 ตัวอักษร','','password',true)}${field('confirm','ยืนยันรหัสผ่าน','','password',true)}<button class="primary full">บันทึกรหัสผ่านใหม่</button></form></div></div>`;
 bindForm('recover',async f=>{if(f.get('password')!==f.get('confirm'))throw Error('รหัสผ่านไม่ตรงกัน');await query(db.auth.updateUser({password:f.get('password')}));recovering=false;await db.auth.signOut();user=null;login();notify('ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบ');});
}
db.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){recovering=true;setTimeout(recoveryForm,0);}});
db.auth.getSession().then(async({data:{session}})=>{
 if(session){user=session.user;if(recovering){recoveryForm();return;}try{await load();}catch{login();notify('โหลดข้อมูลไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่',true);}}
 else login();
});
