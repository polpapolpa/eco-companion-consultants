import {mapWindow} from './geometry.js';
export const TOKEN_URL='https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
export const CATALOG_URL='https://sh.dataspace.copernicus.eu/catalog/v1/search';
export const PROCESS_URL='https://sh.dataspace.copernicus.eu/process/v1';
export function catalogRequest(point,period){return {collections:['sentinel-2-l2a'],intersects:{type:'Point',coordinates:[point.lon,point.lat]},datetime:period.from+'/'+period.to,limit:100,filter:'eo:cloud_cover <= 35','filter-lang':'cql2-text'};}
export function selectScene(features,period){
 return (Array.isArray(features)?features:[]).filter(f=>{
  const p=f.properties||{},t=Date.parse(p.datetime);
  return f.collection==='sentinel-2-l2a'&&Number.isFinite(t)&&t>=Date.parse(period.from)&&t<=Date.parse(period.to)&&typeof p['eo:cloud_cover']==='number'&&p['eo:cloud_cover']<=35;
 }).sort((a,b)=>Date.parse(b.properties.datetime)-Date.parse(a.properties.datetime)||a.properties['eo:cloud_cover']-b.properties['eo:cloud_cover'])[0]||null;
}
export function processRequest(point,scene){
 const date=scene.properties.datetime.slice(0,10),window=mapWindow(point);
 return {input:{bounds:{properties:{crs:'http://www.opengis.net/def/crs/EPSG/0/3857'},bbox:window.bbox},data:[{type:'sentinel-2-l2a',dataFilter:{timeRange:{from:date+'T00:00:00Z',to:date+'T23:59:59Z'},mosaickingOrder:'leastCC',maxCloudCoverage:35}}]},output:{width:window.width,height:window.height,responses:[{identifier:'default',format:{type:'image/png'}}]},evalscript:`//VERSION=3
function setup(){return {input:["B02","B03","B04","SCL","dataMask"],output:{bands:4}};}
function evaluatePixel(s){let valid=s.dataMask&&![0,1,3,8,9,10].includes(s.SCL);return [2.5*s.B04,2.5*s.B03,2.5*s.B02,valid?1:0];}`};
}
export function pngValid(bytes){return bytes.length>24&&bytes.length<=2000000&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)&&new DataView(bytes.buffer,bytes.byteOffset).getUint32(16)===640&&new DataView(bytes.buffer,bytes.byteOffset).getUint32(20)===400;}
