# Eco Companion Connect

พื้นที่ลูกค้าสำหรับโครงการฟื้นฟูป่า: อีเมล/รหัสผ่าน, สิทธิ์รายโครงการ, Dashboard, ตรวจข้อมูล Kobo, รายงานฉบับร่าง/เผยแพร่ และดาวน์โหลด PDF/Word (.docx)

## ขอบเขตข้อมูล

- ไม่มีข้อมูลลูกค้าหรือผลสำรวจจริงใน repository นี้
- `src/config.js` มีเฉพาะ Supabase publishable key ซึ่งออกแบบให้ใช้ใน browser ได้
- Kobo API Token อยู่ใน Supabase Edge Function Secrets ชื่อ `KOBO` หรือ `KOBO_API_TOKEN` เท่านั้น
- ลูกค้าเห็นเฉพาะโครงการที่ได้รับสิทธิ์และรายงาน `published` ผ่าน RLS
- `ecc_imports` และ `ecc_sources` อ่านได้เฉพาะผู้ดูแล ข้อมูลดิบไม่ถูกส่งไปหน้าลูกค้า
- การนำเข้า Kobo สร้างฉบับร่างอัตโนมัติจากชื่อฟิลด์และตัวเลือกจริงสำหรับแบบฟอร์มที่รองรับ ไม่เผยแพร่จนกว่าผู้ดูแลตรวจรายงานก่อน
- ฟอร์มรวมหลายโครงการต้องตั้งชื่อฟิลด์และค่าโครงการ ห้ามเลือกทั้งแบบฟอร์มถ้ามีข้อมูลหลายโครงการ
- เก็บ session ใน sessionStorage ของแท็บ ไม่เก็บรหัสผ่านในเว็บ
- PDF/DOCX สร้างใน browser ไม่มีค่า API แปลงเอกสาร; PDF ฝัง Sarabun (OFL)
- DOCX อ้างอิงฟอนต์ Sarabun ผู้เปิด Word ควรติดตั้งฟอนต์นี้เพื่อให้หน้าตาเหมือน PDF

## พัฒนาและทดสอบ

Node.js 22+:

```sh
npm ci --prefix portal
npm run dev --prefix portal
npm test --prefix portal
npm run package --prefix portal
node tests/render-reports.mjs
```

เปิด URL ที่ Vite แสดงพร้อม path `/connect/` การทดสอบ render ใช้ข้อมูลจำลองที่ติดป้ายชัดเจนและบันทึกเฉพาะ `test-output/` ซึ่งไม่เข้า Git

ทดสอบสิทธิ์ด้วย `tests/rls.sql` ใน Supabase SQL Editor: ใช้ transaction และ rollback ข้อมูลจำลองทั้งหมด

## โฮสต์ฟรีบน Cloudflare Pages

ใช้ GitHub เก็บ source; โฮสต์ client portal ที่ Cloudflare Pages ซึ่งแยกจากเว็บบริษัทเดิมได้

- Framework: None
- Root directory: repository root
- Build command: `npm ci --prefix portal && npm run package --prefix portal`
- Build output directory: `dist`
- Node version: 22 หรือ 24
- ไม่ต้องตั้ง private environment variable ใน Cloudflare
- หรือ Direct Upload โฟลเดอร์ `dist` / ZIP ที่สร้างจากเนื้อหาภายในโฟลเดอร์นี้
- URL ที่เผยแพร่แล้ว: `https://eco-companion-connect.pages.dev/connect/` แล้วค่อยผูก subdomain ของบริษัท เช่น `connect.<company-domain>`
- เพิ่มลิงก์ Connect ที่เว็บไซต์บริษัทหลังตรวจ deployment จริง

`dist` มีเฉพาะ static portal, redirect หน้าแรก และ HTTP security headers ไม่รวม SQL, source, credentials, ข้อมูลลูกค้า หรือเว็บบริษัทเดิม

ไม่ใช้ GitHub Pages สำหรับระบบ login ลูกค้า: [ข้อจำกัด GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) ระบุว่าไม่ควรใช้กับธุรกรรมที่เกี่ยวข้องกับรหัสผ่าน

## Supabase

1. ใช้ Free project; apply migrations ตามลำดับใน `supabase/migrations`
2. Deploy `supabase/functions/connect-admin/index.ts` เป็น `connect-admin`
3. Gateway `verify_jwt=false` เพราะโค้ดตรวจ bearer token ผ่าน `auth.getUser()` เองทุกคำขอ และตรวจ `ecc_admins` ก่อนใช้ service role ทุกครั้ง ห้ามนำการตรวจนี้ออก
4. ตั้ง secret `KOBO` หรือ `KOBO_API_TOKEN` ที่ Dashboard → Edge Functions → Secrets
5. สร้าง Auth user ผู้ดูแลใน Dashboard ผู้ใช้ตั้งรหัสผ่านเอง แล้วเพิ่ม `user_id` ที่ยืนยันแล้วลง `ecc_admins` ด้วย SQL โดยผู้ดูแลโครงการ Supabase
6. ปิด public signups ใน Auth settings หากไม่ต้องการเปิดรับสมัครด้วยตนเอง แม้ผู้สมัครใหม่จะไม่มีสิทธิ์อ่านข้อมูลใด ๆ ตาม RLS อยู่แล้ว
7. เพิ่มลูกค้า → โครงการ → บัญชีลูกค้าใน portal ให้ลูกค้าเปลี่ยนรหัสผ่านเริ่มต้นเมื่อเข้าสู่ระบบ
8. ถอนสิทธิ์รายโครงการได้จากหน้าผู้ดูแล; ไฟล์ที่ดาวน์โหลดออกไปแล้วเรียกคืนไม่ได้

## การใช้งานและข้อจำกัดรุ่นแรก

- Dashboard แสดงจำนวนโครงการ จำนวนรายงานที่เผยแพร่ และรอบสำรวจล่าสุดจากข้อมูลจริง
- รายงานมีสรุปผู้บริหาร นิเวศ สังคม เศรษฐกิจ หลักฐาน/ข้อจำกัด และข้อเสนอแนะ
- ช่องที่ไม่มีข้อมูลแสดงว่าไม่มีข้อมูล ไม่แทนด้วยเลขศูนย์หรือคำนวณคะแนนขึ้นเอง
- นำเข้าทีละ 100 รายการ สามารถกดดึงหน้าถัดไป การดึงซ้ำใช้ upsert ไม่สร้างข้อมูลดิบซ้ำ
- รายงานที่ตรวจแล้วไม่ถูกเขียนทับเมื่อดึง Kobo ซ้ำ
- หลักฐานในรุ่นนี้เป็นข้อความอ้างอิง ยังไม่คัดลอกรูปแนบ Kobo หรือทำแผนที่/กราฟตัวชี้วัดเฉพาะฟอร์ม
- ยังไม่ตั้ง cron, email อัตโนมัติ หรือบริการเสียเงิน
- ลืมรหัสผ่าน: ผู้ดูแล Supabase จัดการใน Auth Dashboard; ยังไม่พึ่ง SMTP ภายนอก
- ฟรีภายในโควตาผู้ให้บริการ ต้องติดตามพื้นที่และปริมาณใช้งาน; Supabase Free อาจ pause เมื่อไม่ได้ใช้งาน

## หลักฐานทดสอบ

- Build และ unit tests ของ report model / DOCX
- SQL RLS: anonymous denied, A/B isolation, drafts/raw hidden, client writes denied, self-promotion denied, admin review, revoked membership
- HTTP Edge Function: ไม่มี JWT และ JWT ปลอม → 401
- ตรวจ PDF ภาษาไทยจาก render fixture ด้วยภาพจริง
- บัญชีผู้ดูแลจริงเข้าสู่ระบบ local ได้แล้ว

เชื่อมต่อ Kobo จริงผ่าน Secret KOBO และอ่านโครงสร้างแบบฟอร์มสำเร็จแล้ว เปิดหน้า login บน Cloudflare จริงสำเร็จแล้ว การดาวน์โหลดจาก browser หลังเข้าสู่ระบบยังต้องตรวจแยก

การเผยแพร่ครั้งแรกใช้ Cloudflare Pages Direct Upload: เปลี่ยน source ใน GitHub แล้วต้อง build และ upload `dist` ใหม่จึงจะอัปเดต portal ส่วนหน้าแรกบริษัทใช้ GitHub Pages ตามเดิม

## รูปแบบเว็บไซต์

หน้า Connect ใช้โลโก้ `favicon.png`, สี และภาพป่าภาพเดียวกับหน้าแรกบริษัท ฟอนต์บนหน้าจอคือ IBM Plex Sans Thai, Noto Serif Thai และ Playfair Display (บรรจุผ่าน @fontsource) ส่วน PDF ใช้ Sarabun เพื่อความสม่ำเสมอของเอกสารไทย

ภาพ `public/forest.jpg` มาจาก URL เดิมที่หน้าแรกใช้: https://images.unsplash.com/photo-1447752875215-b2761acb3c5d รูปแบบเมนูด้านบนและลิงก์กลับเว็บไซต์บริษัทใช้ร่วมกันทั้งหน้า login และพื้นที่ทำงาน
