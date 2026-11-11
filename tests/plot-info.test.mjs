import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVisit} from '../supabase/functions/connect-admin/normalize.js';
import {automaticVisit} from '../supabase/functions/connect-auto-sync/model.js';
import {reportModel} from '../portal/src/report-model.js';
import {reportDetailsHtml} from '../portal/src/report-view.js';
import {pdfDefinition,docxBlob} from '../portal/src/reports.js';

test('manual and automatic imports carry only recorded plot facts, including zero',()=>{
 const raw={'plot_profile/location':'<ทดสอบ>','plot_profile/area_rai':0,'plot_profile/planting_when':'2564–2567','plot_profile/coordinator':'PRIVATE','plot_profile/phone':'PRIVATE','quantitative/tree_counts/trees_alive':700};
 for(const fn of [normalizeVisit,automaticVisit]){
  const v=fn(raw,{survey:[],choices:[]});
  assert.deepEqual(v.plot_info,{location:'<ทดสอบ>',planting_when:'2564–2567',area_rai:'0'});
  assert.doesNotMatch(JSON.stringify(v.plot_info),/PRIVATE|700/);
 }
});
test('all report formats include basics after the executive opening; absent planting data is not inferred',async()=>{
 const m=reportModel({id:'fixture',title:'ทดสอบ',summary:'บทสรุปเดิม',plot:'TEST',plot_info:{location:'<ทดสอบ>',area_rai:'0',gps:'13.1 100.2 4 5'},ecology:'จำนวนต้นที่ตรวจ: 700'},{name:'โครงการทดสอบ'},{});
 assert.equal(m.basics.find(r=>r[0]==='พื้นที่แปลง (ไร่)')[1],'0');
 assert.equal(m.basics.find(r=>r[0].startsWith('พิกัด'))[1],'13.1 / 100.2');
 assert.match(m.basics.find(r=>r[0].startsWith('จำนวนต้นที่ปลูก'))[1],/^ไม่มีข้อมูล/);
 const html=reportDetailsHtml(m);assert.match(html,/&lt;ทดสอบ&gt;/);assert.ok(html.indexOf('ข้อมูลพื้นฐาน')<html.indexOf('ขอบเขตและวิธี'));
 const pdf=pdfDefinition(m);assert.match(JSON.stringify(pdf.content),/ข้อมูลพื้นฐานโครงการและแปลง/);assert.match(JSON.stringify(pdf.content),/<ทดสอบ>/);
 assert.ok(pdf.content.findIndex(x=>x.text==='ข้อมูลพื้นฐานโครงการและแปลง')>pdf.content.findIndex(x=>x.text==='สรุปสำหรับผู้บริหาร'));
 assert.ok((await docxBlob(m)).size>0);
 const empty=reportModel({id:'old'}, {}, {});assert.equal(empty.basics.find(r=>r[0]==='ที่ตั้งแปลง')[1],'ไม่มีข้อมูล');
});
