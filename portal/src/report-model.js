export const sections = [
 ['summary','สรุปสำหรับผู้บริหาร'], ['ecology','ผลการประเมินด้านนิเวศ'],
 ['social','ผลการประเมินด้านสังคม'], ['economics','ผลการประเมินด้านเศรษฐกิจ'],
 ['evidence','หลักฐานและข้อจำกัดของข้อมูล'], ['recommendations','ข้อเสนอแนะและการดำเนินงานถัดไป'],
];
export const display = value => value === null || value === undefined || String(value).trim()==='' ? 'ไม่มีข้อมูล' : String(value);
export function reportModel(visit,project,client) {
 return {
  title:display(visit.title), client:display(client?.name), project:display(project?.name),
  draft:visit.status!=='published', id:visit.id,
  metadata:[['วันที่สำรวจ',display(visit.survey_date)],['พื้นที่ / แปลง',display(visit.plot)],['ผู้ประเมิน',display(visit.assessor)],['ปรับปรุงล่าสุด',display(visit.updated_at)]],
  sections:sections.map(([key,title])=>({title,text:display(visit[key])})),
 };
}
export function fileName(model,extension) {
 return `ECC-${model.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,70)}-${String(model.id).slice(0,8)}.${extension}`;
}
