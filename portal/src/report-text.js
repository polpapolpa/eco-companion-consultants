// Presentation only: stored Kobo answers and field identifiers remain untouched.
const codeStart=/^(EDS5|A\d+[a-z]?|E\d+[a-z]?|S\d+[a-z]?|EP|EA|EO|EW|ED)(?=\s|$)/;
const interviewLabels=new Map([
 ['2 คุยกับผู้ดูแลและชุมชน — ครั้งนี้ได้สัมภาษณ์ผู้ดูแลหรือผู้ให้ข้อมูลหลักหรือไม่','การสัมภาษณ์'],
 ['2 คุยกับผู้ดูแลและชุมชน — รายละเอียดเพิ่มเติม (ถ้ามี)','รายละเอียดการสัมภาษณ์'],
]);
function labelParts(value){
 let title=value.trim();const codes=[];
 while(true){const match=title.match(codeStart);if(!match)break;codes.push(...(match[1]==='EDS5'?['ED','S5']:[match[1]]));title=title.slice(match[0].length).trimStart();}
 return {title,codes};
}
export function reportParagraphs(value){
 return String(value || '').split(/\n\s*\n/).filter(Boolean).map(text=>{
  const colon=text.indexOf(':');if(colon<0 || text.slice(0,colon).includes('\n'))return {text};
  // Only rename known form labels. Details can be reasons or context, not a person's name.
  const interviewLabel=interviewLabels.get(text.slice(0,colon));
  if(interviewLabel)return {text:interviewLabel+text.slice(colon)};
  const labels=text.slice(0,colon).split(' — ').map(labelParts);
  const codes=[...new Set(labels.flatMap(l=>l.codes))];if(!codes.length)return {text};
  // An imported parent group and its question often repeat both the code and title.
  // Prefer the question label when it names the same coded item.
  const last=labels.at(-1);const titles=last.codes.length && labels.length>1 && labels.slice(0,-1).some(l=>l.codes.some(c=>last.codes.includes(c)))
   ?[last.title]:[...new Set(labels.map(l=>l.title).filter(Boolean))];
  if(!titles.some(Boolean))return {text};
  return {title:titles.join(' — '),codes,body:text.slice(colon+1).trimStart()};
 });
}
export function reportRuns(value){
 return reportParagraphs(value).map(p=>p.codes?[
  {text:p.title,kind:'label'},
  {text:` (${p.codes.join(' · ')})`,kind:'code'},
  {text:': '+p.body,kind:'text'},
 ]:[{text:p.text,kind:'text'}]);
}
