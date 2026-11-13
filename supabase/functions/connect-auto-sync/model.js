import {normalizeVisit} from '../connect-admin/normalize.js';
import {evidenceManifest} from '../connect-evidence/evidence.js';
export function sourceMatches(raw,source){
 return source.whole_asset===true || (typeof source.filter_field==='string' && source.filter_field.length>0 && source.filter_value!==null && String(raw[source.filter_field] ?? '')===source.filter_value);
}
export function automaticVisit(raw,schema){
 const visit=normalizeVisit(raw,schema);
 visit.evidence=visit.evidence.replace('ข้อมูลถอดจากแบบสำรวจ Kobo ต้องตรวจเทียบข้อมูลต้นฉบับก่อนเผยแพร่ ภาพถ่ายประกอบรายงานแสดงเฉพาะรูปที่ผู้ดูแลเลือกและตรวจทานแล้ว','รายงานจัดจากคำตอบและภาพที่แนบใน Kobo โดยอัตโนมัติ ยังไม่ผ่านการตรวจทาน ควรตรวจสอบก่อนใช้ประกอบการตัดสินใจ');
 const scope=schema.survey?.find(f=>f.name==='inspection_scope_text');
 const scopeValue=scope?.$xpath?raw[scope.$xpath]:null;
 return {...visit,status:'automatic',auto_update:true,scope:typeof scopeValue==='string'?scopeValue:'',decisions:[1,2].map(n=>{const prefix=`closeout/priority_${n}/priority_${n}_`;return [raw[prefix+'issue'],raw[prefix+'task']].filter(x=>typeof x==='string'&&x.trim()).join(' — ');}).filter(Boolean).join('\n\n'),reviewer:'',report_photos:evidenceManifest(raw)};
}
export function canAutoUpdate(visit){return visit?.status==='automatic' && visit.auto_update===true;}
// GPS remains sourced from Kobo even when an automatic report's narrative is edited.
// Published reports and drafts retain their frozen metadata.
export function gpsOnlyPatch(visit,raw){
 if(visit?.status!=='automatic'||canAutoUpdate(visit))return null;
 const info={...(visit.plot_info||{})};const value=raw['plot_profile/gps'];
 if(typeof value==='string'&&value.trim())info.gps=value.trim();else delete info.gps;
 return sameSubmission(info,visit.plot_info||{})?null:{plot_info:info};
}
export function sourceKey(source){return JSON.stringify([source.asset_uid,source.whole_asset,source.filter_field,source.filter_value]);}

const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export const sameSubmission=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));

export async function submissionHash(raw){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(raw))));return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');}
