import {reportRuns} from './report-text.js';
import {mapNotes} from './report-map.js';
import {fileName} from './report-model.js';
import {reportLayout,detailText,followupText,photoTitle} from './report-layout.js';
const green='#0F392B',muted='#65756C';
const statusText=m=>m.statusLabel || (m.draft?'ฉบับร่าง — รอตรวจทาน':'เผยแพร่แล้ว');
const photoLabel=(p,i)=>`ภาพที่ ${i+1}${p.code?'  '+p.code:''}`;
export function pdfDefinition(m){
 const report=reportLayout(m);
 const textBlocks=text=>reportRuns(text).map(runs=>({text:runs.map(run=>({text:run.text,...(run.kind==='code'?{fontSize:9,color:muted}:run.kind==='label'?{bold:true}:{})})),margin:[0,0,0,9]}));
 const heading=(text,extra={})=>({text,bold:true,fontSize:15,color:green,margin:[0,20,0,10],headlineLevel:1,...extra});
 const table=(headers,rows,widths)=>({margin:[0,4,0,14],fontSize:10.5,table:{headerRows:1,widths,body:[headers.map(text=>({text,bold:true,color:'#FFFFFF',fillColor:green,fontSize:10})),...rows.map((row,i)=>row.map(cell=>({...typeof cell==='string'?{text:cell}:cell,fillColor:i%2?'#F2F6F3':'#FFFFFF'})))]},layout:{hLineWidth:()=>.5,vLineWidth:()=>.5,hLineColor:()=>'#D9E1DB',vLineColor:()=>'#D9E1DB',paddingTop:()=>9,paddingBottom:()=>9,paddingLeft:()=>7,paddingRight:()=>7}});
 const photoBlocks=photos=>photos.flatMap(p=>[
  {unbreakable:true,stack:[{image:p.dataUrl,fit:[499,290],alignment:'center',margin:[0,12,0,10]},
  {text:photoTitle(p),bold:true,fontSize:11,color:green,margin:[0,0,0,5]}]},
  ...textBlocks(p.caption || 'ไม่ได้ระบุคำบรรยายภาพ'),
  {text:`ประเด็นที่เกี่ยวข้อง: ${p.question || 'ไม่ได้ระบุ'}\nที่มา: ไฟล์แนบ Kobo ของรายการสำรวจนี้ • รหัสไฟล์ ${p.id}`,fontSize:9,color:muted,margin:[0,0,0,12]},
 ]);
 return {
  info:{title:m.title,author:'Eco Companion Consultants',subject:'รายงานการติดตามและประเมินผลโครงการ'},
  pageSize:'A4',pageMargins:[48,62,48,62],
  defaultStyle:{font:'Sarabun',fontSize:11.5,lineHeight:1.25,color:'#263C32'},
  header:{columns:[...(m.logo?[{image:m.logo,width:25,margin:[0,0,10,0]}]:[]),{stack:[{text:'ECO COMPANION CONSULTANTS',bold:true,fontSize:9,color:green},{text:'รายงานการติดตามและประเมินผล',fontSize:8,color:muted,margin:[0,3,0,0]}]}],margin:[48,22,48,0]},
  footer:(page,count)=>({columns:[{text:`${statusText(m)}\nรหัสรายงาน ${m.id}`,fontSize:7.5,color:muted,width:'*'},{text:`${page} / ${count}`,fontSize:9,color:muted,width:50,alignment:'right'}],margin:[48,18,48,0]}),
  ...((m.draft||m.automatic)?{watermark:{text:m.automatic?'AUTO':'DRAFT',color:green,opacity:.055}}:{}),
  content:[
   {text:'รายงานการติดตามและประเมินผลโครงการ',fontSize:11,color:green,margin:[0,12,0,12]},
   {text:m.title,fontSize:23,bold:true,color:'#182A21',margin:[0,0,0,15]},
   {text:`จัดทำสำหรับ ${m.client}`,fontSize:13,color:green,margin:[0,0,0,5]},
   {text:`โครงการ ${m.project}`,fontSize:11,margin:[0,0,0,20]},
   {table:{widths:[100,'*'],body:m.metadata.map(([key,value])=>[{text:key,color:muted,fontSize:10},value])},layout:{hLineWidth:()=>.5,vLineWidth:()=>0,hLineColor:()=>'#DFE5E0',paddingTop:()=>7,paddingBottom:()=>7,paddingLeft:()=>4,paddingRight:()=>8}},
   heading('สรุปสำหรับผู้บริหาร'),...textBlocks(m.sections[0].text),
   heading('ประเด็นเสนอเพื่อพิจารณา'),...textBlocks(m.decisions || 'ยังไม่ได้ระบุประเด็นเสนอเพื่อพิจารณา'),
   heading('ข้อมูลพื้นฐานโครงการและแปลง',{pageBreak:'before'}),table(['รายการ','ข้อมูลที่บันทึก'],m.basics || [],[160,'*']),
   {text:m.basicsNote || '',fontSize:9,color:muted,margin:[0,0,0,12]},
   heading('แผนที่และภาพดาวเทียมประกอบ',m.map?.status==='ready'?{pageBreak:'before'}:{}),
   ...(m.map?.status==='ready'?[{image:m.map.dataUrl,fit:[499,312],margin:[0,0,0,12]}]:[]),
   ...mapNotes(m.map).map(text=>({text,fontSize:9,color:muted,margin:[0,0,0,6]})),
   heading('ขอบเขตและวิธีการสำรวจ'),...textBlocks(m.scope || 'ยังไม่ระบุ'),
   ...report.groups.flatMap(g=>[heading(g.title),...(g.rows.length?[table(['ประเด็นประเมิน','ผลที่บันทึก','รายละเอียด / หลักฐาน'],g.rows.map(r=>[{text:[{text:r.title,bold:true},...(r.codes.length?[{text:` (${r.codes.join(' · ')})`,fontSize:9,color:muted}]:[])]},r.result || 'ไม่มีข้อมูล',detailText(r)]),[145,100,'*'])]:[]),...g.notes.flatMap(textBlocks),...photoBlocks(g.photos)]),
   heading('หลักฐานและข้อจำกัดของข้อมูล'),...textBlocks(m.sections[4].text),
   heading('ข้อเสนอแนะและการดำเนินงานถัดไป'),
   ...(report.actions.length?[table(['ประเด็นสำคัญ','งานที่ต้องดำเนินการ','ผู้รับผิดชอบ','กำหนดเวลา'],report.actions.map(a=>[a.issue || 'ยังไม่ระบุ',a.task || 'ยังไม่ระบุ',a.owner || 'ยังไม่ระบุ',a.due || 'ยังไม่ระบุ']),[110,'*',72,64])]:[]),
   ...report.followup.flatMap(p=>textBlocks(followupText(p))),
   heading('การตรวจทานรายงาน'),{text:`ผู้ประเมิน: ${m.metadata[2][1]}\nผู้ตรวจทาน: ${m.reviewer || 'ยังไม่ระบุ'}\nสถานะ: ${statusText(m)}`,margin:[0,0,0,15]},
   ...(report.appendix.length?[heading('ภาพถ่ายและหลักฐานเพิ่มเติม',{pageBreak:'before'}),...photoBlocks(report.appendix)]:report.photoCount?[]:[heading('ภาพถ่ายประกอบการประเมิน'),{text:'ไม่มีรูปภาพที่เลือกแนบในรายงานฉบับนี้',color:muted}]),
  ],
  pageBreakBefore:(node,following)=>node.headlineLevel===1&&following.length===0,
 };
}
function bytesToBase64(bytes){let text='';for(const b of bytes)text+=String.fromCharCode(b);return btoa(text);}
async function logo(m){if(m.logo)return m;const response=await fetch(`${import.meta.env.BASE_URL}favicon.png`);if(!response.ok)throw Error('โหลดโลโก้ไม่สำเร็จ');return {...m,logo:`data:image/png;base64,${bytesToBase64(new Uint8Array(await response.arrayBuffer()))}`};}
export async function downloadPdf(model){
 const m=await logo(model);const {default:pdfMake}=await import('pdfmake/build/pdfmake.js');const vfs={};
 await Promise.all(['Sarabun-Regular.ttf','Sarabun-Bold.ttf'].map(async name=>{const response=await fetch(`${import.meta.env.BASE_URL}fonts/${name}`,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('โหลดฟอนต์ไทยไม่สำเร็จ');vfs[name]=bytesToBase64(new Uint8Array(await response.arrayBuffer()));}));
 const fonts={Sarabun:{normal:'Sarabun-Regular.ttf',bold:'Sarabun-Bold.ttf',italics:'Sarabun-Regular.ttf',bolditalics:'Sarabun-Bold.ttf'}};
 await new Promise((resolve,reject)=>{try{pdfMake.createPdf(pdfDefinition(m),undefined,fonts,vfs).getBlob(blob=>{saveBlob(blob,fileName(m,'pdf'));resolve();});}catch(error){reject(error);}});
}
export async function docxBlob(m){
 const {Document,Packer,Paragraph,TextRun,HeadingLevel,Header,Footer,PageNumber,Table,TableRow,TableCell,WidthType,ImageRun,AlignmentType,BorderStyle,VerticalAlign,TableLayoutType}=await import('docx');
 const p=(text,opts={})=>new Paragraph({...opts,children:[new TextRun({text,font:'Sarabun',...(opts.bold?{bold:true}:{})})]});
 const blocks=text=>reportRuns(text).map(runs=>new Paragraph({children:runs.map(run=>new TextRun({text:run.text,font:'Sarabun',...(run.kind==='code'?{size:18,color:'65756C'}:run.kind==='label'?{bold:true}:{})}))}));
 const h=(text,opts={})=>p(text,{heading:HeadingLevel.HEADING_1,keepNext:true,spacing:{before:320,after:160},...opts});
 const report=reportLayout(m);
 const table=(headers,rows,widths)=>new Table({layout:TableLayoutType.FIXED,width:{size:9986,type:WidthType.DXA},columnWidths:widths,rows:[headers,...rows].map((row,index)=>new TableRow({tableHeader:index===0,children:row.map((cell,col)=>new TableCell({width:{size:widths[col],type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,shading:{fill:index===0?'0F392B':index%2===0?'F2F6F3':'FFFFFF'},margins:{top:150,bottom:150,left:140,right:140},borders:Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{style:BorderStyle.SINGLE,size:3,color:'D9E1DB'}])),children:[new Paragraph({spacing:{after:0,line:270},children:(typeof cell==='string'?[{text:cell}]:cell).map(run=>new TextRun({font:'Sarabun',size:21,color:index===0?'FFFFFF':'263C32',bold:index===0,...run}))})]}))}))});
 const photoBlocks=photos=>photos.flatMap(photo=>{const scale=Math.min(620/photo.width,360/photo.height);return [new Paragraph({spacing:{before:220,after:120},alignment:AlignmentType.CENTER,keepNext:true,children:[new ImageRun({type:'jpg',data:bytes(photo.dataUrl),transformation:{width:Math.round(photo.width*scale),height:Math.round(photo.height*scale)}})]}),p(photoTitle(photo),{bold:true,keepNext:true}),...blocks(photo.caption || 'ไม่ได้ระบุคำบรรยายภาพ'),p('ประเด็นที่เกี่ยวข้อง: '+(photo.question || 'ไม่ได้ระบุ')),p('ที่มา: ไฟล์แนบ Kobo ของรายการสำรวจนี้ • รหัสไฟล์ '+photo.id)];});
 const bytes=dataUrl=>Uint8Array.from(atob(dataUrl.split(',')[1]),c=>c.charCodeAt(0));
 const headerRuns=[...(m.logo?[new ImageRun({type:'png',data:bytes(m.logo),transformation:{width:30,height:30}})]:[]),new TextRun({text:'   ECO COMPANION CONSULTANTS',font:'Sarabun',bold:true,size:17,color:'0F392B'})];
 const doc=new Document({creator:'Eco Companion Consultants',title:m.title,
  styles:{default:{document:{run:{font:'Sarabun',size:23,color:'263C32'},paragraph:{spacing:{after:160,line:310}}}},paragraphStyles:[{id:'Title',name:'Title',basedOn:'Normal',next:'Normal',run:{font:'Sarabun',size:44,bold:true,color:'182A21'},paragraph:{spacing:{after:280}}},{id:'Heading1',name:'heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:'Sarabun',size:30,bold:true,color:'0F392B'},paragraph:{keepNext:true,spacing:{before:320,after:160}}}]},
  sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1240,bottom:1240,left:960,right:960,header:420,footer:480}}},
   headers:{default:new Header({children:[new Paragraph({children:headerRuns})]})},
   footers:{default:new Footer({children:[new Paragraph({children:[new TextRun({text:`${statusText(m)} • ${m.id}   |   `,size:15,font:'Sarabun',color:'65756C'}),new TextRun({children:[PageNumber.CURRENT,' / ',PageNumber.TOTAL_PAGES],size:16,font:'Sarabun'})]})]})},
   children:[p('รายงานการติดตามและประเมินผลโครงการ'),p(m.title,{heading:HeadingLevel.TITLE}),p(`จัดทำสำหรับ ${m.client}`),p(`โครงการ ${m.project}`),
    new Table({width:{size:100,type:WidthType.PERCENTAGE},columnWidths:[2200,7786],rows:m.metadata.map(([key,value])=>new TableRow({children:[key,value].map((text,i)=>new TableCell({width:{size:i?7786:2200,type:WidthType.DXA},margins:{top:100,bottom:100,left:100,right:140},borders:{top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.SINGLE,size:3,color:'DFE5E0'},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE}},children:[p(text,{spacing:{after:0},bold:i===0})]}))}))}),
    h('สรุปสำหรับผู้บริหาร'),...blocks(m.sections[0].text),h('ประเด็นเสนอเพื่อพิจารณา'),...blocks(m.decisions || 'ยังไม่ระบุ'),
    h('ข้อมูลพื้นฐานโครงการและแปลง',{pageBreakBefore:true}),table(['รายการ','ข้อมูลที่บันทึก'],m.basics || [],[3400,6586]),p(m.basicsNote || ''),
    h('แผนที่และภาพดาวเทียมประกอบ',m.map?.status==='ready'?{pageBreakBefore:true}:{}),
    ...(m.map?.status==='ready'?[new Paragraph({keepNext:true,children:[new ImageRun({type:'jpg',data:bytes(m.map.dataUrl),transformation:{width:620,height:388}})]})]:[]),
    ...mapNotes(m.map).map(text=>p(text,{spacing:{after:100}})),
    h('ขอบเขตและวิธีการสำรวจ'),...blocks(m.scope || 'ยังไม่ระบุ'),
    ...report.groups.flatMap(g=>[h(g.title),...(g.rows.length?[table(['ประเด็นประเมิน','ผลที่บันทึก','รายละเอียด / หลักฐาน'],g.rows.map(r=>[[{text:r.title,bold:true},...(r.codes.length?[{text:' ('+r.codes.join(' · ')+')',size:18,color:'65756C'}]:[])],r.result || 'ไม่มีข้อมูล',detailText(r)]),[3000,2100,4886]),p('',{spacing:{after:80}})]:[]),...g.notes.flatMap(blocks),...photoBlocks(g.photos)]),
    h('หลักฐานและข้อจำกัดของข้อมูล'),...blocks(m.sections[4].text),
    h('ข้อเสนอแนะและการดำเนินงานถัดไป'),...(report.actions.length?[table(['ประเด็นสำคัญ','งานที่ต้องดำเนินการ','ผู้รับผิดชอบ','กำหนดเวลา'],report.actions.map(a=>[a.issue || 'ยังไม่ระบุ',a.task || 'ยังไม่ระบุ',a.owner || 'ยังไม่ระบุ',a.due || 'ยังไม่ระบุ']),[2450,4050,1800,1686]),p('',{spacing:{after:80}})]:[]),...report.followup.flatMap(item=>blocks(followupText(item))),h('การตรวจทานรายงาน'),p(`ผู้ประเมิน: ${m.metadata[2][1]}`),p(`ผู้ตรวจทาน: ${m.reviewer || 'ยังไม่ระบุ'}`),p(`สถานะ: ${statusText(m)}`),
    ...(report.appendix.length?[h('ภาพถ่ายและหลักฐานเพิ่มเติม',{pageBreakBefore:true}),...photoBlocks(report.appendix)]:report.photoCount?[]:[h('ภาพถ่ายประกอบการประเมิน'),p('ไม่มีรูปภาพที่เลือกแนบในรายงานฉบับนี้')]),
   ]}],
 });return Packer.toBlob(doc);
}
export async function downloadDocx(model){saveBlob(await docxBlob(await logo(model)),fileName(model,'docx'));}
function saveBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
