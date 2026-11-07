import {reportRuns} from './report-text.js';
import {fileName} from './report-model.js';
const green='#0F392B',muted='#65756C';
const statusText=m=>m.statusLabel || (m.draft?'ฉบับร่าง — รอตรวจทาน':'เผยแพร่แล้ว');
const photoLabel=(p,i)=>`ภาพที่ ${i+1}${p.code?'  '+p.code:''}`;
export function pdfDefinition(m){
 const textBlocks=text=>reportRuns(text).map(runs=>({text:runs.map(run=>({text:run.text,...(run.kind==='code'?{fontSize:9,color:muted}:run.kind==='label'?{bold:true}:{})})),margin:[0,0,0,9]}));
 const heading=(text,extra={})=>({text,bold:true,fontSize:15,color:green,margin:[0,20,0,10],headlineLevel:1,...extra});
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
   heading('ขอบเขตและวิธีการสำรวจ',{pageBreak:'before'}),...textBlocks(m.scope || 'ยังไม่ระบุ'),
   ...m.sections.slice(1,4).flatMap(s=>[heading(s.title),...textBlocks(s.text)]),
   heading('หลักฐานและข้อจำกัดของข้อมูล'),...textBlocks(m.sections[4].text),
   heading('ข้อเสนอแนะและการดำเนินงานถัดไป',{pageBreak:'before'}),...textBlocks(m.sections[5].text),
   heading('การตรวจทานรายงาน'),{text:`ผู้ประเมิน: ${m.metadata[2][1]}\nผู้ตรวจทาน: ${m.reviewer || 'ยังไม่ระบุ'}\nสถานะ: ${statusText(m)}`,margin:[0,0,0,15]},
   ...(m.photos?.length?m.photos.flatMap((p,i)=>[
    heading(i===0?'ภาพถ่ายประกอบการประเมิน':'ภาพถ่ายประกอบการประเมินต่อ',{pageBreak:'before'}),
    {image:p.dataUrl,fit:[499,365],alignment:'center',margin:[0,8,0,18]},
    {text:photoLabel(p,i),bold:true,fontSize:12,color:green,margin:[0,0,0,8]},
    ...textBlocks(p.caption || 'ไม่ได้ระบุคำบรรยายภาพ'),
    {text:`ประเด็นที่เกี่ยวข้อง: ${p.question || 'ไม่ได้ระบุ'}\nที่มา: ไฟล์แนบ Kobo ของรายการสำรวจนี้ • รหัสไฟล์ ${p.id}`,fontSize:9,color:muted,margin:[0,8,0,0]},
   ]):[heading('ภาพถ่ายประกอบการประเมิน'),{text:'ไม่มีรูปภาพที่เลือกแนบในรายงานฉบับนี้',color:muted}]),
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
 const {Document,Packer,Paragraph,TextRun,HeadingLevel,Header,Footer,PageNumber,Table,TableRow,TableCell,WidthType,ImageRun,AlignmentType,BorderStyle}=await import('docx');
 const p=(text,opts={})=>new Paragraph({...opts,children:[new TextRun({text,font:'Sarabun',...(opts.bold?{bold:true}:{})})]});
 const blocks=text=>reportRuns(text).map(runs=>new Paragraph({children:runs.map(run=>new TextRun({text:run.text,font:'Sarabun',...(run.kind==='code'?{size:18,color:'65756C'}:run.kind==='label'?{bold:true}:{})}))}));
 const h=(text,opts={})=>p(text,{heading:HeadingLevel.HEADING_1,keepNext:true,spacing:{before:320,after:160},...opts});
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
    h('ขอบเขตและวิธีการสำรวจ',{pageBreakBefore:true}),...blocks(m.scope || 'ยังไม่ระบุ'),
    ...m.sections.slice(1,5).flatMap(s=>[h(s.title),...blocks(s.text)]),
    h('ข้อเสนอแนะและการดำเนินงานถัดไป',{pageBreakBefore:true}),...blocks(m.sections[5].text),h('การตรวจทานรายงาน'),p(`ผู้ประเมิน: ${m.metadata[2][1]}`),p(`ผู้ตรวจทาน: ${m.reviewer || 'ยังไม่ระบุ'}`),p(`สถานะ: ${m.draft?'ฉบับร่าง รอการตรวจสอบและรับรอง':'เผยแพร่แล้ว'}`),
    ...(m.photos?.length?m.photos.flatMap((photo,i)=>{const scale=Math.min(640/photo.width,470/photo.height);return [h(i===0?'ภาพถ่ายประกอบการประเมิน':'ภาพถ่ายประกอบการประเมินต่อ',{pageBreakBefore:true}),new Paragraph({alignment:AlignmentType.CENTER,keepNext:true,children:[new ImageRun({type:'jpg',data:bytes(photo.dataUrl),transformation:{width:Math.round(photo.width*scale),height:Math.round(photo.height*scale)}})]}),p(photoLabel(photo,i),{bold:true,keepNext:true}),...blocks(photo.caption || 'ไม่ได้ระบุคำบรรยายภาพ'),p(`ประเด็นที่เกี่ยวข้อง: ${photo.question || 'ไม่ได้ระบุ'}`),p(`ที่มา: ไฟล์แนบ Kobo ของรายการสำรวจนี้ • รหัสไฟล์ ${photo.id}`)];}):[h('ภาพถ่ายประกอบการประเมิน'),p('ไม่มีรูปภาพที่เลือกแนบในรายงานฉบับนี้')]),
   ]}],
 });return Packer.toBlob(doc);
}
export async function downloadDocx(model){saveBlob(await docxBlob(await logo(model)),fileName(model,'docx'));}
function saveBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
