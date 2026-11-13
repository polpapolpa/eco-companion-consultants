import {reportLayout,followupText,photoTitle} from './report-layout.js';
import {reportRuns} from './report-text.js';
import {mapHtml} from './report-map.js';
const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs=text=>reportRuns(text).map(runs=>'<p class="pre">'+runs.map(r=>r.kind==='code'?'<small class="question-code">'+esc(r.text)+'</small>':r.kind==='label'?'<strong>'+esc(r.text)+'</strong>':esc(r.text)).join('')+'</p>').join('');
const table=(headers,rows)=>'<div class="report-table-wrap"><table class="report-results"><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const photos=items=>items.map(p=>'<figure class="evidence-photo" id="evidence-'+p.number+'"><div data-report-photo="'+esc(p.id)+'"><p class="help">กำลังโหลดภาพ…</p></div><figcaption><strong>'+esc(photoTitle(p))+'</strong><p class="pre">'+esc(p.caption || 'ไม่ได้ระบุคำบรรยายภาพ')+'</p><small>ประเด็น: '+esc(p.question || 'ไม่ได้ระบุ')+' · ไฟล์ Kobo '+esc(p.id)+'</small></figcaption></figure>').join('');
export function reportDetailsHtml(model){
 const report=reportLayout(model);
 return '<section class="report-basics"><h2>ข้อมูลพื้นฐานโครงการและแปลง</h2>'+table(['รายการ','ข้อมูลที่บันทึก'],(model.basics || []).map(row=>row.map(v=>'<div class="pre">'+esc(v)+'</div>')))+'<p class="help">'+esc(model.basicsNote)+'</p></section>'+
 '<section class="report-map"><h2>แผนที่และภาพดาวเทียมประกอบ</h2><div data-report-map>'+mapHtml(model.map)+'</div></section>'+
 '<section class="report-scope"><h2>ขอบเขตและวิธีการสำรวจ</h2>'+paragraphs(model.scope)+'</section>'+
 report.groups.map(g=>'<section class="report-dimension"><h2>'+esc(g.title)+'</h2>'+ 
 (g.rows.length?table(['ประเด็นประเมิน','ผลที่บันทึก','รายละเอียด / หลักฐาน'],g.rows.map(r=>[
 '<strong>'+esc(r.title)+'</strong>'+(r.codes.length?' <small class="question-code">('+esc(r.codes.join(' · '))+')</small>':''),
 '<span class="result-answer">'+esc(r.result || 'ไม่มีข้อมูล')+'</span>',
 '<div class="pre">'+esc(r.details.join('\n\n') || 'ไม่ได้ระบุเพิ่มเติม')+'</div>'+(r.photoNumbers.length?'<div class="photo-links">'+r.photoNumbers.map(n=>'<a href="#evidence-'+n+'">ภาพที่ '+n+'</a>').join(' · ')+'</div>':'')
 ])):'')+g.notes.map(paragraphs).join('')+photos(g.photos)+'</section>').join('')+
 '<section><h2>หลักฐานและข้อจำกัดของข้อมูล</h2>'+paragraphs(model.sections.find(s=>s.key==='evidence')?.text)+'</section>'+
 '<section><h2>ข้อเสนอแนะและการดำเนินงานถัดไป</h2>'+
 (report.actions.length?table(['ประเด็นสำคัญ','งานที่ต้องดำเนินการ','ผู้รับผิดชอบ','กำหนดเวลา'],report.actions.map(a=>[a.issue,a.task,a.owner,a.due].map(v=>'<div class="pre">'+esc(v || 'ยังไม่ระบุ')+'</div>'))):'')+
 report.followup.map(p=>paragraphs(followupText(p))).join('')+'</section>'+
 '<section><h2>การตรวจทานรายงาน</h2><p>ผู้ตรวจทาน: '+esc(model.reviewer)+'</p><p>'+esc(model.statusLabel)+'</p></section>'+
 (report.appendix.length?'<section><h2>ภาพถ่ายและหลักฐานเพิ่มเติม</h2>'+photos(report.appendix)+'</section>':report.photoCount?'':'<section><h2>ภาพถ่ายประกอบการประเมิน</h2><p class="help">ไม่มีรูปภาพที่เลือกแนบในรายงานฉบับนี้</p></section>');
}
