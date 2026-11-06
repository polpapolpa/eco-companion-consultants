// Synthetic render fixture only; never inserted into Supabase or shown as actual project data.
import { createRequire } from 'node:module';
import { mkdir,writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import { resolve } from 'node:path';
import { reportModel } from '../portal/src/report-model.js';
import { pdfDefinition,docxBlob } from '../portal/src/reports.js';
const require=createRequire(new URL('../portal/package.json',import.meta.url));
const PdfPrinter=require('pdfmake');
const font=resolve('portal/public/fonts');
const printer=new PdfPrinter({Sarabun:{normal:font+'/Sarabun-Regular.ttf',bold:font+'/Sarabun-Bold.ttf',italics:font+'/Sarabun-Regular.ttf',bolditalics:font+'/Sarabun-Bold.ttf'}});
const m=reportModel({id:'render-test-only',title:'ตัวอย่างทดสอบรูปแบบรายงานภาษาไทย',status:'draft',survey_date:'2026-11-06',plot:'ข้อมูลจำลองสำหรับตรวจรูปแบบเท่านั้น',assessor:'ไม่ใช่ข้อมูลการสำรวจจริง',summary:'เอกสารนี้ใช้ทดสอบการจัดหน้าและฟอนต์ภาษาไทย ไม่ใช่รายงานผลของโครงการจริง',ecology:'ตรวจสอบสระและวรรณยุกต์: พื้นที่ฟื้นฟูป่า น้ำ ดิน ต้นไม้ ความหลากหลายทางชีวภาพ\nไม่มีข้อมูลภาคสนามในเอกสารทดสอบนี้',social:'ไม่มีข้อมูล',economics:'ไม่เกี่ยวข้องกับการทดสอบนี้',evidence:'ตัวอย่างทดสอบซอฟต์แวร์',recommendations:'ตรวจสอบรูปแบบก่อนใช้งานกับข้อมูลจริง'}, {name:'ตัวอย่างสำหรับทดสอบเท่านั้น'}, {name:'ไม่มีลูกค้าจริง'});
await mkdir('test-output',{recursive:true});
const pdf=printer.createPdfKitDocument(pdfDefinition(m));const output=createWriteStream('test-output/report-thai.pdf');pdf.pipe(output);pdf.end();await finished(output);
await writeFile('test-output/report-thai.docx',new Uint8Array(await (await docxBlob(m)).arrayBuffer()));
console.log('Created synthetic PDF + DOCX render fixtures in test-output/');
