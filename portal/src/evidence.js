export async function evidenceCall(db,body){
 const {data,error}=await db.functions.invoke('connect-evidence',{body});
 if(error){let detail;try{detail=await error.context?.json();}catch{}throw Error(detail?.error || 'ดึงรูปจาก Kobo ไม่สำเร็จ');}
 if(data?.error)throw Error(data.error);return data;
}
// Decode, orient and resize for portable PDF/Word output. Originals stay in Kobo.
export async function prepareImage(blob){
 if(!(blob instanceof Blob)||!blob.type.startsWith('image/'))throw Error('ไม่ได้รับไฟล์รูปภาพ');
 const url=URL.createObjectURL(blob);
 try{
  const image=new Image();image.src=url;await image.decode();
  const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  return {dataUrl:canvas.toDataURL('image/jpeg',.86),width:canvas.width,height:canvas.height};
 }finally{URL.revokeObjectURL(url);}
}
export async function photoImage(db,visitId,photo){return {...photo,...await prepareImage(await evidenceCall(db,{action:'image',visit_id:visitId,photo_id:photo.id}))};}
export async function reportImages(db,visitId,photos){
 const images=[];for(const photo of photos){try{images.push(await photoImage(db,visitId,photo));}catch(error){throw Error(`โหลดรูป ${photo.code || photo.id} ไม่สำเร็จ: ${error.message} กรุณาลองใหม่ หรือแก้ไขรายงานเพื่อนำรูปนี้ออกก่อนดาวน์โหลด`);}}
 return images;
}
