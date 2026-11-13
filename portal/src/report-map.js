import {mapState} from '../../supabase/functions/connect-map/geometry.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const initialMap=(visit)=>mapState(visit.plot_info?.gps,visit.survey_date);
export const mapNotes=map=>map?.status==='ready'?[
 `วันที่ภาพดาวเทียม: ${map.date} (UTC) — แยกจากวันที่สำรวจภาคสนาม`,
 `พิกัดจุดอ้างอิง: ${map.point.lat.toFixed(6)}, ${map.point.lon.toFixed(6)}${map.point.accuracy!==undefined?' · ความแม่นยำ GPS ที่บันทึก '+map.point.accuracy+' เมตร':''}`,
 `แหล่งภาพ: ${map.source} · ความละเอียดต้นฉบับ 10 เมตร · ${map.attribution}`,
 'หมุดแสดงจุดอ้างอิงที่บันทึกใน Kobo ไม่ใช่ขอบเขตแปลง พื้นที่สีเทาคือส่วนที่ไม่มีข้อมูลหรือถูกกรองเมฆ/เงา ไม่ใช้ภาพนี้นับต้นไม้หรือยืนยันอัตรารอด',
]:[map?.message || 'ยังไม่มีข้อมูลแผนที่'];
export function mapHtml(map){
 if(map?.status!=='ready')return '<p class="map-status">'+esc(map?.message || 'ยังไม่มีข้อมูลแผนที่')+'</p>';
 if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(map.dataUrl||''))return '<p class="map-status">ไม่สามารถแสดงภาพแผนที่ได้</p>';
 return '<figure class="satellite-figure"><img src="'+map.dataUrl+'" alt="ภาพดาวเทียมพร้อมหมุดจุดอ้างอิงแปลง ลูกศรทิศเหนือ และมาตราส่วน" width="'+map.width+'" height="'+map.height+'"><figcaption>'+mapNotes(map).map(t=>'<p>'+esc(t)+'</p>').join('')+'</figcaption></figure>';
}
export async function composeMap(result){
 if(result.status!=='ready')return result;
 if(!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(result.dataUrl||''))throw Error('รูปแบบภาพดาวเทียมไม่ถูกต้อง');
 const image=new Image();image.src=result.dataUrl;await image.decode();
 if(image.naturalWidth!==640||image.naturalHeight!==400)throw Error('ขนาดภาพดาวเทียมไม่ถูกต้อง');
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=800;
 const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,1280,800);
 const pixels=ctx.getImageData(0,0,1280,800).data;let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)visible++;
 if(visible/(1280*800)<.05)return {...result,status:'no_imagery',dataUrl:undefined,message:'ภาพที่พบมีเมฆ เงา หรือข้อมูลขาดหายมากเกินไป จึงยังไม่แสดงภาพประกอบ'};
 ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#e2e6e4';ctx.fillRect(0,0,1280,800);ctx.globalCompositeOperation='source-over';
 // The reference point is at the centre of the symmetric Web Mercator request.
 ctx.lineWidth=5;ctx.strokeStyle='#fff';ctx.fillStyle='#b93832';ctx.beginPath();ctx.moveTo(640,400);ctx.bezierCurveTo(630,380,616,369,616,352);ctx.arc(640,352,24,Math.PI,0);ctx.bezierCurveTo(664,369,650,380,640,400);ctx.fill();ctx.stroke();
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(640,352,7,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#ffffffed';ctx.fillRect(1160,25,90,125);ctx.fillStyle='#173c2c';ctx.font='bold 28px sans-serif';ctx.fillText('N',1194,62);ctx.beginPath();ctx.moveTo(1205,75);ctx.lineTo(1185,125);ctx.lineTo(1205,114);ctx.lineTo(1225,125);ctx.closePath();ctx.fill();
 const scaleWidth=1280*500/result.groundWidth;
 ctx.fillStyle='#ffffffed';ctx.fillRect(25,700,scaleWidth+45,78);ctx.strokeStyle='#173c2c';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(45,733);ctx.lineTo(45,749);ctx.lineTo(45+scaleWidth,749);ctx.lineTo(45+scaleWidth,733);ctx.stroke();ctx.fillStyle='#173c2c';ctx.font='24px sans-serif';ctx.fillText('500 m',45,728);
 return {...result,width:1280,height:800,dataUrl:canvas.toDataURL('image/jpeg',.9)};
}
export async function loadReportMap(db,visit,action){
 const initial=action==='demo'?{status:'loading'}:initialMap(visit);
 if(initial.status!=='loading')return initial;
 try{
  const {data,error}=await db.functions.invoke('connect-map',{body:action==='demo'?{action:'demo'}:{visit_id:visit.id}});
  if(error){let detail;try{detail=await error.context?.json();}catch{}throw Error(detail?.error || 'โหลดแผนที่ไม่สำเร็จ กรุณาลองอีกครั้ง');}
  if(data?.error)throw Error(data.error);
  return await composeMap(data);
 }catch(error){return {...initial,status:'error',message:error.message || 'โหลดแผนที่ไม่สำเร็จ'};}
}
