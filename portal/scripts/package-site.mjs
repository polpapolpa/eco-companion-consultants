import { cp,mkdir,writeFile,rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
// Only this generated directory is replaced. Existing company website files are not copied or changed.
const dist=new URL('../../dist/',import.meta.url);
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await cp(new URL('../../connect/',import.meta.url),new URL('connect/',dist),{recursive:true});
await writeFile(new URL('index.html',dist),'<!doctype html><html lang="th"><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/connect/"><title>Eco Companion Connect</title><a href="/connect/">เข้าสู่ Eco Companion Connect</a></html>');
await writeFile(new URL('_headers',dist),`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://mlledbfojyydklqknvxt.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
/connect/
  Cache-Control: no-store
/connect/index.html
  Cache-Control: no-store
`);
console.log(`Cloudflare Pages upload directory: ${fileURLToPath(dist)}`);
