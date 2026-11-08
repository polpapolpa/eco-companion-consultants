import {reportParagraphs} from './report-text.js';

// A presentation of saved report text. Never infer scores, sources or missing answers.
const groupInfo=[['care','สภาพแปลงและการดูแล'],['ecology','ผลการประเมินด้านนิเวศ'],['social','ผลการประเมินด้านสังคม'],['economics','ผลการประเมินด้านเศรษฐกิจ']];
const codePattern=/(?:^|[\s,;(/])((?:A\d+[a-z]?|E\d+[a-z]?|S\d+[a-z]?|EP|EA|EO|EW|ED))(?=$|[\s,;)/.:])/g;
const photoCodes=photo=>[...String(photo.question || '').matchAll(codePattern)].map(m=>m[1]);
function groupFor(codes,fallback){
 if(codes.some(c=>['EP','EA','EO','EW','ED'].includes(c)))return 'economics';
 if(codes.some(c=>/^A\d/.test(c)))return 'care';
 if(codes.includes('E3a'))return 'social';
 return fallback;
}
function entries(text){
 return reportParagraphs(text).map(p=>{
  if(p.codes)return p;
  const value=p.text || '';const colon=value.indexOf(':');
  // Uncoded imported questions have an explicit parent/question separator.
  if(colon>0 && value.slice(0,colon).includes(' — ') && !value.slice(0,colon).includes('\n'))return {title:value.slice(0,colon),codes:[],body:value.slice(colon+1).trimStart()};
  return p;
 });
}
export function reportLayout(model){
 const groups=groupInfo.map(([key,title])=>({key,title,rows:[],notes:[],photos:[]}));
 const photos=(model.photos || []).map((p,i)=>({...p,number:i+1,codes:photoCodes(p)}));
 for(const section of model.sections.filter(s=>['ecology','social','economics'].includes(s.key))){
  for(const item of entries(section.text)){
   const group=groups.find(g=>g.key===groupFor(item.codes || [],section.key));
   if(!item.title){group.notes.push(item.text);continue;}
   if(!item.codes.length){group.notes.push(item.title+': '+item.body);continue;}
   const isDetail=/ — รายละเอียดเพิ่มเติม(?: \(ถ้ามี\))?$/.test(item.title);
   const baseTitle=item.title.replace(/ — รายละเอียดเพิ่มเติม(?: \(ถ้ามี\))?$/,'');
   const row=isDetail?group.rows.findLast(r=>r.title===baseTitle && r.codes.join('|')===item.codes.join('|')):null;
   if(row)row.details.push(item.body);
   else group.rows.push({title:item.title,codes:item.codes,result:item.body,details:[]});
  }
 }
 for(const group of groups){
  for(const row of group.rows){row.photoNumbers=photos.filter(p=>p.codes.some(c=>row.codes.includes(c))).map(p=>p.number);}
 }
 const appendix=[];
 for(const photo of photos){
  const matches=groups.filter(g=>g.rows.some(r=>r.photoNumbers.includes(photo.number)));
  if(matches.length===1)matches[0].photos.push(photo);else appendix.push(photo);
 }
 const actions=[],followup=[];
 for(const item of entries(model.sections.find(s=>s.key==='recommendations')?.text || '')){
  const match=item.title?.match(/^งานสำคัญเรื่องที่ (\d+) — (.+)$/);
  if(!match){followup.push(item);continue;}
  const label=match[2];let key;
  if(label==='เรื่องหรือคำถามที่ต้องตอบ')key='issue';
  else if(label==='ต้องทำอะไร เก็บอะไร จากใครหรือจุดใด')key='task';
  else if(/ผู้รับผิดชอบ/.test(label))key='owner';
  else if(/วันนัด|กำหนด|นัดหมาย|เมื่อไร/.test(label))key='due';
  if(!key){followup.push(item);continue;}
  let action=actions.find(a=>a.number===match[1]);if(!action){action={number:match[1],issue:'',task:'',owner:'',due:''};actions.push(action);}
  action[key]=[action[key],item.body].filter(Boolean).join('\n');
 }
 return {groups:groups.filter(g=>g.key!=='care' || g.rows.length || g.notes.some(n=>n && n!=='ไม่มีข้อมูล')),actions,followup,appendix,photoCount:photos.length};
}
export const detailText=row=>[...row.details,...(row.photoNumbers.length?[`ภาพประกอบ: ${row.photoNumbers.map(n=>'ภาพที่ '+n).join(', ')}`]:[])].join('\n\n') || 'ไม่ได้ระบุเพิ่มเติม';
export const followupText=item=>item.title?`${item.title}${item.codes?.length?' ('+item.codes.join(' · ')+')':''}: ${item.body}`:item.text;
export const photoTitle=photo=>`ภาพที่ ${photo.number}${photo.code?' · '+photo.code:''}`;
