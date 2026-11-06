const basename=value=>String(value ?? '').split('/').at(-1);
export function evidenceManifest(raw){
 const attachments=Array.isArray(raw?._attachments)?raw._attachments:[];
 const photos=[];
 for(let n=1;n<=3;n++){
  const prefix=`closeout/evidence/evidence_${n}/evidence_${n}_`;
  const filename=raw[prefix+'image'];if(!filename)continue;
  const matches=attachments.filter(a=>basename(a.filename)===basename(filename) && /^(image\/(jpeg|png|webp))$/.test(a.mimetype || ''));
  if(matches.length!==1)continue;
  const a=matches[0];if(!/^\d+$/.test(String(a.id)))continue;
  photos.push({id:String(a.id),caption:String(raw[prefix+'caption'] || ''),question:String(raw[prefix+'question'] || ''),code:String(raw[prefix+'code'] || ''),field:prefix+'image'});
 }
 return photos;
}
export function authorizedPhoto(manifest,selected,id,isAdmin){
 const source=manifest.find(p=>p.id===String(id));
 if(!source)return null;
 return isAdmin || (Array.isArray(selected) && selected.some(p=>p.id===String(id)))?source:null;
}
export function safeImage(bytes,type){
 return type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:
 type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:
 type==='image/webp'?String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP':false;
}
