import test from 'node:test';
import assert from 'node:assert/strict';
import {reportModel} from '../portal/src/report-model.js';
import {reportLayout,detailText} from '../portal/src/report-layout.js';
import {reportDetailsHtml} from '../portal/src/report-view.js';
import {pdfDefinition} from '../portal/src/reports.js';
const make=v=>reportModel({id:'fixture',title:'ทดสอบเท่านั้น',...v},{},{});
test('merge adjacent coded answers and details while preserving notes and values',()=>{
 const m=make({ecology:'A1b การเข้าถึง — A1b การเข้าถึง: เข้าได้บางส่วน\n\nA1b การเข้าถึง — รายละเอียดเพิ่มเติม (ถ้ามี): ข้อจำกัดจริง\n\nE1c กล้าไม้ — E1c กล้าไม้: ยังไม่ตรวจ\n\nหมายเหตุ: ห้ามสรุปแทนทั้งแปลง',economics:'EW น้ำ: 0\n\nED S5 ผลกระทบ: ไม่ทราบ'});
 const r=reportLayout(m);
 assert.deepEqual(r.groups.find(g=>g.key==='care').rows[0],{title:'การเข้าถึง',codes:['A1b'],result:'เข้าได้บางส่วน',details:['ข้อจำกัดจริง'],photoNumbers:[]});
 assert.equal(r.groups.find(g=>g.key==='ecology').rows[0].result,'ยังไม่ตรวจ');
 assert.ok(r.groups.find(g=>g.key==='ecology').notes.includes('หมายเหตุ: ห้ามสรุปแทนทั้งแปลง'));
 assert.deepEqual(r.groups.find(g=>g.key==='economics').rows.map(r=>r.result),['0','ไม่ทราบ']);
});
test('do not merge unrelated same-code questions or drop edited narratives',()=>{
 const r=reportLayout(make({social:'ข้อความที่ผู้ดูแลแก้เอง\nมีบรรทัดต่อเนื่อง\n\nS1 บทบาท: ร่วมดูแล\n\nS1 กลุ่มผู้ร่วม — รายละเอียดเพิ่มเติม (ถ้ามี): กลุ่มตัวอย่าง'}));
 const g=r.groups.find(g=>g.key==='social');assert.equal(g.rows.length,2);assert.equal(g.notes[0],'ข้อความที่ผู้ดูแลแก้เอง\nมีบรรทัดต่อเนื่อง');
});
test('separate perception and care without asserting interview provenance',()=>{
 const r=reportLayout(make({ecology:'E3a ความเย็นสบาย: ไม่มีความเห็น',social:'A4 การดูแล: ดูแลบางครั้ง'}));
 assert.equal(r.groups.find(g=>g.key==='care').rows[0].codes[0],'A4');
 assert.equal(r.groups.find(g=>g.key==='social').rows[0].codes[0],'E3a');
});
test('map only explicit priority labels, retain unknown fields and missing owner/date',()=>{
 const r=reportLayout(make({recommendations:'งานสำคัญเรื่องที่ 1 — เรื่องหรือคำถามที่ต้องตอบ: ไฟ\n\nงานสำคัญเรื่องที่ 1 — ต้องทำอะไร เก็บอะไร จากใครหรือจุดใด: แนวกันไฟ\n\nงานสำคัญเรื่องที่ 1 — งบประมาณ: ไม่ทราบ\n\nข้อเสนอเพิ่มเติมที่แก้เอง'}));
 assert.deepEqual(r.actions,[{number:'1',issue:'ไฟ',task:'แนวกันไฟ',owner:'',due:''}]);
 assert.equal(r.followup.length,2);
});
test('place photos once only when explicit question codes identify one group',()=>{
 const r=reportLayout(make({ecology:'E1b สัตว์: พบ',economics:'EW น้ำ: ยังไม่ใช้',report_photos:[{id:'1',question:'E1b',caption:'ภาพ A'},{id:'2',question:'E1b EW',caption:'ภาพ B'},{id:'3',question:'ไม่ได้ระบุรหัส',caption:'ภาพ C'}]}));
 assert.deepEqual(r.groups.find(g=>g.key==='ecology').photos.map(p=>p.id),['1']);
 assert.deepEqual(r.appendix.map(p=>p.id),['2','3']);
 assert.match(detailText(r.groups.find(g=>g.key==='ecology').rows[0]),/ภาพที่ 1, ภาพที่ 2/);
});
test('web escapes arbitrary answers and retains review state',()=>{
 const html=reportDetailsHtml(make({status:'automatic',ecology:'E1b สัตว์: <img src=x onerror=alert(1)>',recommendations:'ผู้ดูแลเขียนเอง'}));
 assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('ยังไม่ผ่านการตรวจทาน'));assert.ok(html.includes('ผู้ดูแลเขียนเอง'));
});
test('opening PDF content and metadata stay before structured results',()=>{
 const m=make({summary:'บทสรุปเดิม',decisions:'ประเด็นเดิม',ecology:'E1b สัตว์: พบ'});
 const d=pdfDefinition(m);const split=d.content.findIndex(c=>c.text==='ข้อมูลพื้นฐานโครงการและแปลง');
 assert.ok(JSON.stringify(d.content.slice(0,split)).includes('บทสรุปเดิม'));
 assert.ok(!d.content.slice(0,split).some(c=>c.table?.headerRows));
 assert.ok(d.content.slice(split).some(c=>c.table?.headerRows===1));
});
