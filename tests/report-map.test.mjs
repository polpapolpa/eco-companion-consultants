import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGps,mapWindow,searchPeriod,mapState} from '../supabase/functions/connect-map/geometry.js';
import {catalogRequest,selectScene,processRequest,pngValid} from '../supabase/functions/connect-map/provider.js';
import {reportModel} from '../portal/src/report-model.js';
import {reportDetailsHtml} from '../portal/src/report-view.js';
import {mapNotes,mapHtml,loadReportMap} from '../portal/src/report-map.js';
import {pdfDefinition,docxBlob} from '../portal/src/reports.js';
import {gpsOnlyPatch} from '../supabase/functions/connect-auto-sync/model.js';
test('new Kobo GPS can reach an edited automatic report without changing its narrative or published metadata',()=>{
 const visit={status:'automatic',auto_update:false,summary:'CURATED',plot_info:{location:'original'}};
 assert.deepEqual(gpsOnlyPatch(visit,{'plot_profile/gps':'13.75 100.5 0 5'}),{plot_info:{location:'original',gps:'13.75 100.5 0 5'}});
 assert.equal(gpsOnlyPatch({...visit,status:'published'},{'plot_profile/gps':'13 100'}),null);
 assert.equal(gpsOnlyPatch({...visit,status:'draft'},{'plot_profile/gps':'13 100'}),null);
 assert.equal(gpsOnlyPatch(visit,{}),null);assert.equal(visit.summary,'CURATED');assert.equal(visit.auto_update,false);
});
test('GPS uses Kobo lat/lon order, preserves zero, rejects malformed or swapped Thai coordinates',()=>{
 assert.deepEqual(parseGps('13.75 100.50 8 4.5'),{lat:13.75,lon:100.5,accuracy:4.5});
 assert.deepEqual(parseGps('0 0'),{lat:0,lon:0});
 for(const value of ['',null,{},'100.5 13.75','13.7,100.5','Infinity 0','13 101 extra','0 0 0 -1','13 101 0 1 extra','0x10 100'])assert.equal(parseGps(value),null);
 assert.equal(mapState('',null).status,'missing_gps');assert.equal(mapState('bad','2026-11-01').status,'invalid_gps');
 assert.equal(mapWindow({lat:85,lon:0}),null);
 const box=mapWindow({lat:13.75,lon:100.5});assert.ok(Math.abs((box.bbox[2]-box.bbox[0])/(box.bbox[3]-box.bbox[1])-1.6)<1e-9);
});
test('image search never uses a future/invalid survey date and scenes remain within the requested period',()=>{
 const now=new Date('2026-11-11T12:00:00Z'),period=searchPeriod('2026-11-01',now);
 assert.equal(searchPeriod('2026-11-12',now),null);assert.equal(searchPeriod('2026-02-30',now),null);assert.equal(searchPeriod('',now),null);
 assert.equal(period.to,'2026-11-01T23:59:59.999Z');
 const item=(date,cloud,collection='sentinel-2-l2a')=>({collection,properties:{datetime:date+'T04:00:00Z','eo:cloud_cover':cloud}});
 const chosen=selectScene([item('2026-11-02',0),item('2026-10-31',95),item('2026-10-29',5),item('2026-10-30',20),item('2026-10-31',0,'wrong')],period);
 assert.equal(chosen.properties.datetime,'2026-10-30T04:00:00Z');
 const point={lat:13.75,lon:100.5};assert.deepEqual(catalogRequest(point,period).intersects.coordinates,[100.5,13.75]);
 const request=processRequest(point,chosen);assert.equal(request.output.width,640);assert.equal(request.output.height,400);assert.equal(request.input.data[0].dataFilter.timeRange.from,'2026-10-30T00:00:00Z');assert.match(request.evalscript,/dataMask/);
 assert.equal(selectScene([],period),null);assert.equal(pngValid(new Uint8Array(30)),false);
});
test('missing GPS avoids provider calls and remains explicit in web/PDF/Word',async()=>{
 let calls=0;const db={functions:{invoke:()=>{calls++;throw Error('should not call');}}};
 const v={id:'test',title:'ทดสอบ',survey_date:'2026-11-01'};
 const map=await loadReportMap(db,v);assert.equal(calls,0);assert.equal(map.status,'missing_gps');
 const m=reportModel(v,{},{});assert.match(reportDetailsHtml(m),/ยังไม่มีพิกัดแปลงใน Kobo/);assert.match(JSON.stringify(pdfDefinition(m)),/ยังไม่มีพิกัดแปลงใน Kobo/);assert.ok((await docxBlob(m)).size>0);
});
test('provider failures are visible, map markup escapes text and never embeds provider URLs',async()=>{
 const error=await loadReportMap({functions:{invoke:async()=>({error:{context:{json:async()=>({error:'โควตาเต็ม'})}}})}},{id:'test',survey_date:'2026-11-01',plot_info:{gps:'13.75 100.5'}});
 assert.equal(error.status,'error');assert.equal(error.message,'โควตาเต็ม');
 assert.match(mapHtml({message:'<script>bad</script>'}),/&lt;script&gt;/);
 assert.doesNotMatch(mapHtml({status:'ready',dataUrl:'https://private.invalid/image'}),/<img/);
 const notes=mapNotes({status:'ready',point:{lat:13.75,lon:100.5},date:'2026-10-30',source:'source',attribution:'source attribution'}).join(' ');
 assert.match(notes,/2026-10-30/);assert.match(notes,/ไม่ใช่ขอบเขตแปลง/);assert.match(notes,/ไม่ใช้ภาพนี้นับต้นไม้/);
});
