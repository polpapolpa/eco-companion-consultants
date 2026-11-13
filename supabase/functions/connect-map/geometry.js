export const MAP_VERSION='sentinel2-v1';
export function parseGps(value){
 if(typeof value!=='string'||!value.trim())return null;
 const parts=value.trim().split(/\s+/);
 if(![2,3,4].includes(parts.length)||parts.some(p=>!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(p)))return null;
 const [lat,lon,altitude,accuracy]=parts.map(Number);
 if(!parts.every(p=>Number.isFinite(Number(p)))||Math.abs(lat)>90||Math.abs(lon)>180||(accuracy!==undefined&&accuracy<0))return null;
 return {lat,lon,...(accuracy!==undefined?{accuracy}:{} )};
}
export function mapWindow(point){
 if(!point||Math.abs(point.lat)>80||Math.abs(point.lon)>179.9)return null;
 const radius=6378137,rad=Math.PI/180,scale=Math.cos(point.lat*rad);
 const x=radius*point.lon*rad,y=radius*Math.log(Math.tan(Math.PI/4+point.lat*rad/2));
 const halfWidth=1000/scale,halfHeight=625/scale;
 return {bbox:[x-halfWidth,y-halfHeight,x+halfWidth,y+halfHeight],groundWidth:2000,width:640,height:400};
}
export function searchPeriod(surveyDate,now=new Date()){
 if(typeof surveyDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(surveyDate))return null;
 const date=new Date(surveyDate+'T00:00:00Z');
 if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==surveyDate||date>now)return null;
 const end=new Date(Math.min(date.getTime()+86400000-1,now.getTime()));
 const start=new Date(date.getTime()-60*86400000);
 return {from:start.toISOString(),to:end.toISOString()};
}
export function mapState(gps,date){
 if(typeof gps!=='string'||!gps.trim())return {status:'missing_gps',message:'ยังไม่มีพิกัดแปลงใน Kobo กรุณาบันทึกพิกัดจุดอ้างอิงแปลง แล้วส่งข้อมูลให้ระบบซิงก์อีกครั้ง'};
 const point=parseGps(gps);
 if(!point)return {status:'invalid_gps',message:'พิกัดแปลงไม่ถูกต้อง กรุณาตรวจค่าละติจูดและลองจิจูดใน Kobo'};
 if(!mapWindow(point))return {status:'unsupported',message:'พิกัดอยู่นอกขอบเขตที่แผนที่รุ่นนี้รองรับ',point};
 const period=searchPeriod(date);
 if(!period)return {status:'invalid_date',message:'ยังดึงภาพไม่ได้ กรุณาตรวจวันที่สำรวจให้เป็นวันที่จริงและไม่เกินวันนี้',point};
 return {status:'loading',message:'กำลังเตรียมภาพดาวเทียมของแปลง…',point,period};
}
