export const sections = [
 ['summary','สรุปสำหรับผู้บริหาร'], ['ecology','ผลการประเมินด้านนิเวศ'],
 ['social','ผลการประเมินด้านสังคม'], ['economics','ผลการประเมินด้านเศรษฐกิจ'],
 ['evidence','หลักฐานและข้อจำกัดของข้อมูล'], ['recommendations','ข้อเสนอแนะและการดำเนินงานถัดไป'],
];
export const display = value => value === null || value === undefined || String(value).trim()==='' ? 'ไม่มีข้อมูล' : String(value);
export const reportDate=value=>{if(!value)return 'ไม่ระบุ';const d=new Date(value);return Number.isNaN(d.getTime())?'ไม่ระบุ':d.toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Bangkok'});};
export function reportModel(visit,project,client) {
 return {
  title:display(visit.title), client:display(client?.name), project:display(project?.name),
  draft:visit.status!=='published', id:visit.id,
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
