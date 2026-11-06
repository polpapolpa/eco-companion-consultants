import { fileName } from './report-model.js';
const green='#0F392B';
export function pdfDefinition(m) {
 return {
  info:{title:m.title,author:'Eco Companion Consultants'},
  pageSize:'A4',pageMargins:[48,55,48,55],
  defaultStyle:{font:'Sarabun',fontSize:11,lineHeight:1.35,color:'#263C32'},
  header:{text:'ECO COMPANION CONSULTANTS  /  CONNECT',fontSize:8,color:green,margin:[48,24]},
  footer:(page,count)=>({columns:[{text:`${m.draft?'ฉบับร่าง • ':''}สำหรับ ${m.client}\nรหัสรายงาน ${m.id}`,width:'*'},{text:`${page} / ${count}`,alignment:'right',width:50}],fontSize:8,margin:[48,12]}),
  ...(m.draft ? {watermark:{text:'DRAFT',color:'gray',opacity:0.1}} : {}),
  content:[
   {text:'รายงานการติดตามและประเมินผล',color:green,fontSize:12,margin:[0,8,0,10]},
   {text:m.title,bold:true,fontSize:24,color:green,margin:[0,0,0,16]},
   {text:`โครงการ: ${m.project}\nลูกค้า: ${m.client}`,margin:[0,0,0,16]},
   {table:{widths:[100,'*'],body:m.metadata.map(([k,v])=>[{text:k,bold:true,fillColor:'#E6F0EB'},v])},layout:'lightHorizontalLines',margin:[0,0,0,20]},
   ...m.sections.flatMap(s=>[{text:s.title,bold:true,fontSize:14,color:green,margin:[0,16,0,8],headlineLevel:1},{text:s.text}]),
  ],
  pageBreakBefore:(node,following)=>node.headlineLevel===1 && following.length===0,
 };
}
export async function downloadPdf(m) {
 const {default:pdfMake}=await import('pdfmake/build/pdfmake.js');
 const base=new URL(`${import.meta.env.BASE_URL}fonts/`,window.location.origin).href;
 const vfs={};
 await Promise.all(['Sarabun-Regular.ttf','Sarabun-Bold.ttf'].map(async name=>{
  const response=await fetch(base+name,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('โหลดฟอนต์ไทยไม่สำเร็จ กรุณาลองใหม่');
  const bytes=new Uint8Array(await response.arrayBuffer());
  let text='';for(const byte of bytes)text+=String.fromCharCode(byte);vfs[name]=btoa(text);
 }));
 const fonts={Sarabun:{normal:'Sarabun-Regular.ttf',bold:'Sarabun-Bold.ttf',italics:'Sarabun-Regular.ttf',bolditalics:'Sarabun-Bold.ttf'}};
 await new Promise((resolve,reject)=>{
  try { pdfMake.createPdf(pdfDefinition(m),undefined,fonts,vfs).getBlob(blob=>{saveBlob(blob,fileName(m,'pdf'));resolve();}); }
  catch(error){reject(error);}
 });
}
export async function docxBlob(m) {
 const {Document,Packer,Paragraph,TextRun,HeadingLevel,Header,Footer,PageNumber,Table,TableRow,TableCell,WidthType}=await import('docx');
 const p=(text,opts={})=>new Paragraph({...opts,children:[new TextRun({text,font:'Sarabun'})]});
 const doc=new Document({
  creator:'Eco Companion Consultants',title:m.title,
  styles:{default:{document:{run:{font:'Sarabun',size:24,color:'263C32'},paragraph:{spacing:{after:160,line:330}}}}},
  sections:[{properties:{page:{margin:{top:900,bottom:900,left:900,right:900}}},
   headers:{default:new Header({children:[p('ECO COMPANION CONSULTANTS / CONNECT')]})},
   footers:{default:new Footer({children:[new Paragraph({children:[new TextRun(`${m.draft?'ฉบับร่าง • ':''}สำหรับ ${m.client}   |   `),new TextRun({children:[PageNumber.CURRENT]})]})]})},
   children:[p('รายงานการติดตามและประเมินผล'),p(m.title,{heading:HeadingLevel.TITLE}),p(`โครงการ: ${m.project}`),p(`ลูกค้า: ${m.client}`),
    new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:m.metadata.map(([k,v])=>new TableRow({children:[new TableCell({children:[p(k)]}),new TableCell({children:[p(v)]})]}))}),
    ...m.sections.flatMap(s=>[p(s.title,{heading:HeadingLevel.HEADING_1,keepNext:true}),...s.text.split('\n').map(t=>p(t))]),p(`รหัสรายงาน ${m.id}`),
   ]}],
 });
 return Packer.toBlob(doc);
}
export async function downloadDocx(m) {saveBlob(await docxBlob(m),fileName(m,'docx'));}
function saveBlob(blob,name) {const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}
