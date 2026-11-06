const domain='clients.eco-companion.invalid';
export function username(value){
 const name=String(value ?? '').trim().toLowerCase();
 if(!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(name))throw Error('Username ต้องเป็น a-z, 0-9, จุด ขีดกลาง หรือขีดล่าง 3–40 ตัว และขึ้นต้นด้วยตัวอักษรหรือตัวเลข');
 return name;
}
export const usernameEmail=value=>`${username(value)}@${domain}`;
export function loginEmail(value){const text=String(value ?? '').trim().toLowerCase();return text.includes('@')?text:usernameEmail(text);}
export function accountLabel(email){return email?.endsWith('@'+domain)?email.slice(0,-domain.length-1):email;}
