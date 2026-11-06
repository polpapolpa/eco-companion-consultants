// Mapping verified against the live forest-visit form on 2026-11-06.
// Choice wording comes from Kobo's schema, never from a guessed score interpretation.
const label=x=>Array.isArray(x)?x[0]:typeof x==='string'?x:'';
const has=v=>v!==undefined && v!==null && String(v).trim()!=='';
export function normalizeVisit(raw,schema) {
 const survey=schema.survey || [];
 const choices=schema.choices || [];
 const groups=new Map(survey.filter(f=>f.type==='begin_group').map(f=>[f.$xpath,label(f.label)]));
 const buckets={summary:[],ecology:[],social:[],economics:[],evidence:[],recommendations:[]};
 for(const f of survey){
  const path=f.$xpath;
  if(!path || !has(raw[path]) || ['begin_group','end_group','note','calculate','start','end','geopoint','image','file'].includes(f.type))continue;
  let section=null;
  if(path.startsWith('closeout/evidence/') || path.startsWith('quantitative/inspection_scope/'))section='evidence';
  else if(path.startsWith('closeout/') && (f.name.startsWith('action_') || path.includes('/priority_') || path.startsWith('closeout/urgent_review/')))section='recommendations';
  else if(path.startsWith('closeout/') && f.name.startsWith('finding_'))section='summary';
  else if(path.startsWith('field_observation/') || path.startsWith('quantitative/tree_counts/') || path.includes('/g_e3a/'))section='ecology';
  else if(path.startsWith('economy/') || path.startsWith('quantitative/water/') || path.startsWith('quantitative/reported_impact/'))section='economics';
  else if(path.startsWith('interview_section/') || /^quantitative\/s[123]/.test(path))section='social';
  if(!section)continue;
  // These direct identifiers remain in the admin-only original, not automatic drafts.
  if(['informant_code','caretaker_role','informant_role','s1_groups'].includes(f.name) || f.name.endsWith('_owner_code'))continue;
  let value=String(raw[path]);
  if(f.type==='select_one' || f.type==='select_multiple'){
   const dictionary=new Map(choices.filter(c=>c.list_name===f.select_from_list_name).map(c=>[String(c.name),label(c.label)]));
   value=(f.type==='select_multiple'?value.split(/\s+/):[value]).map(v=>dictionary.get(v) || v).join(', ');
  }
  const parent=groups.get(path.slice(0,path.lastIndexOf('/')));
  buckets[section].push(`${parent?parent+' — ':''}${label(f.label) || f.name}: ${value}`);
 }
 const plot=has(raw['identity/plot_id'])?String(raw['identity/plot_id']):null;
 const date=String(raw['identity/visit_date'] || '');
 const surveyDate=/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date))?date:null;
 const result={title:`รายงานตรวจเยี่ยม${plot?'แปลง '+plot:''}${surveyDate?' · '+surveyDate:''}`,survey_date:surveyDate,plot,assessor:raw['identity/recorder'] || null,status:'draft'};
 for(const [key,values] of Object.entries(buckets))result[key]=values.join('\n\n');
 if(result.social)result.social='ข้อมูลจากการสัมภาษณ์/การนับตามช่วงที่ระบุ ความเห็นรายบุคคลไม่ใช่ข้อสรุปแทนทั้งชุมชน\n\n'+result.social;
 if(result.economics)result.economics='เงินที่ได้รับไม่ใช่กำไร และคำบอกเล่ายังไม่ยืนยันสาเหตุจากโครงการ ไม่รวมยอดต่างหน่วยหรือช่วงเวลาเข้าด้วยกัน\n\n'+result.economics;
 if(result.ecology)result.ecology+='\n\nขอบเขตการแปลผล: ไม่พบในการตรวจนี้ไม่ได้ยืนยันว่าไม่มีในพื้นที่ หาไม่พบไม่เท่ากับตาย จำนวนต้นมีชีวิตในการตรวจนี้ไม่ใช่อัตรารอดของรุ่นปลูกเดิม';
 result.evidence+=(result.evidence?'\n\n':'')+'ข้อมูลถอดจากแบบสำรวจ Kobo ต้องตรวจเทียบข้อมูลต้นฉบับก่อนเผยแพร่ รูปภาพและไฟล์แนบยังไม่รวมในรายงานอัตโนมัติ';
 return result;
}
