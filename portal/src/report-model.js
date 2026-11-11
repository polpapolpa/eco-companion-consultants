import {initialMap} from './report-map.js';
export const sections = [
 ['summary','สรุปสำหรับผู้บริหาร'], ['ecology','ผลการประเมินด้านนิเวศ'],
 ['social','ผลการประเมินด้านสังคม'], ['economics','ผลการประเมินด้านเศรษฐกิจ'],
 ['evidence','หลักฐานและข้อจำกัดของข้อมูล'], ['recommendations','ข้อเสนอแนะและการดำเนินงานถัดไป'],
];
export const reportStatus=status=>status==='automatic'?'รายงานอัตโนมัติ — ยังไม่ผ่านการตรวจทาน':status==='published'?'เผยแพร่แล้ว':'ฉบับร่าง — รอตรวจทาน';
export const display = value => value === null || value === undefined || String(value).trim()==='' ? 'ไม่มีข้อมูล' : String(value);
export const reportDate=value=>{if(!value)return 'ไม่ระบุ';const d=new Date(value);return Number.isNaN(d.getTime())?'ไม่ระบุ':d.toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Bangkok'});};
export function reportModel(visit,project,client) {
 const info=visit.plot_info || {};
 return {
  map:initialMap(visit),
  basics:[['โครงการ',display(project?.name)],['รหัสแปลง',display(visit.plot)],
   ['ที่ตั้งแปลง',display(info.location)],['พื้นที่แปลง (ไร่)',display(info.area_rai)],
   ['ประเภทป่า',display(info.forest_type)],['ช่วงเวลาที่ปลูก',display(info.planting_when)],
   ['พิกัดจุดอ้างอิง (ละติจูด / ลองจิจูด)',display(info.gps?.trim().split(/\s+/).slice(0,2).join(' / '))],
   ['วิธีการฟื้นฟู','ไม่มีข้อมูล — แบบฟอร์มต้นทางยังไม่มีช่องเก็บข้อมูลนี้'],
   ['จำนวนต้นที่ปลูกเดิม (ต้น)','ไม่มีข้อมูล — แบบฟอร์มต้นทางยังไม่มีช่องเก็บข้อมูลนี้']],
  basicsNote:'ที่มา: ข้อมูลพื้นฐานที่บันทึกใน Kobo สำหรับการสำรวจครั้งนี้ ช่องว่างหมายถึงไม่มีข้อมูล ไม่ใช่ศูนย์ จำนวนต้นที่ตรวจและจำนวนที่มีชีวิตแสดงแยกในผลสำรวจ ไม่ใช้แทนจำนวนต้นที่ปลูกเดิม',
  title:display(visit.title), client:display(client?.name), project:display(project?.name),
  draft:visit.status!=='published' && visit.status!=='automatic', automatic:visit.status==='automatic', statusLabel:reportStatus(visit.status), id:visit.id,
  scope:visit.scope?.trim() || 'ยังไม่ได้ระบุขอบเขตและวิธีสำรวจเพิ่มเติม โปรดอ่านข้อจำกัดที่ระบุในแต่ละมิติก่อนใช้ผลประเมิน',
  decisions:visit.decisions?.trim() || 'ยังไม่ได้ระบุประเด็นที่เสนอให้ผู้บริหารพิจารณา',
  reviewer:visit.reviewer?.trim() || 'ยังไม่ระบุผู้ตรวจทาน',
  photos:Array.isArray(visit.report_photos)?visit.report_photos:[],
  metadata:[['วันที่สำรวจ',reportDate(visit.survey_date)],['พื้นที่ / แปลง',display(visit.plot)],['ผู้ประเมิน',display(visit.assessor)],['ปรับปรุงล่าสุด',reportDate(visit.updated_at)]],
  sections:sections.map(([key,title])=>({key,title,text:display(visit[key]).replace('รูปภาพและไฟล์แนบยังไม่รวมในรายงานอัตโนมัติ','ภาพถ่ายประกอบรายงานแสดงเฉพาะรูปที่ผู้ดูแลเลือกและตรวจทานแล้ว')})),
 };
}
export function fileName(model,extension) {
 return `ECC-${model.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,70)}-${String(model.id).slice(0,8)}.${extension}`;
}
