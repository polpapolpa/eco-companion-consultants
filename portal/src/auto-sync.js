let busy=false,lastAttempt=0;
// The Edge Function independently verifies project access; browser IDs grant no permission.
export async function syncProjects(db,ids,onState){
 if(busy || Date.now()-lastAttempt<15000)return {changed:false,checked:false};
 busy=true;lastAttempt=Date.now();let changed=false,checked=false,backlog=false;
 try{
  for(const id of ids){
   for(let page=0;page<5;page++){
    onState('กำลังตรวจข้อมูลรอบใหม่จาก Kobo…');
    const {data,error}=await db.functions.invoke('connect-auto-sync',{body:{project_id:id}});
    if(error || data?.error)throw Error('ยังตรวจ Kobo ไม่สำเร็จ แสดงข้อมูลที่มีอยู่และจะลองใหม่อัตโนมัติ');
    changed ||= data.changed>0;checked ||= !!data.last_synced_at;
    if(!data.more)break;
    if(page===4)backlog=true;
   }
  }
  onState(backlog?'มีข้อมูลย้อนหลังเพิ่มเติม ระบบจะดึงต่ออัตโนมัติ':checked?`ตรวจ Kobo ล่าสุด ${new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})} · รอบใหม่จะแสดงเป็นรายงานอัตโนมัติ`:'ตรวจข้อมูลโครงการแล้ว · หากเพิ่งส่ง Kobo ระบบจะตรวจอีกครั้งอัตโนมัติ');
  return {changed,checked:true};
 }catch(error){onState(error.message);return {changed,checked:true};}
 finally{busy=false;}
}
