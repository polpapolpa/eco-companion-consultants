# Eco Companion Connect

พื้นที่ลูกค้าสำหรับโครงการฟื้นฟูป่า: Username หรืออีเมลผู้ดูแล/รหัสผ่าน, สิทธิ์รายโครงการ, Dashboard, ตรวจข้อมูล Kobo, รายงานฉบับร่าง/เผยแพร่ และดาวน์โหลด PDF/Word (.docx)

## ขอบเขตข้อมูล

- ไม่มีข้อมูลลูกค้าหรือผลสำรวจจริงใน repository นี้
- `src/config.js` มีเฉพาะ Supabase publishable key ซึ่งออกแบบให้ใช้ใน browser ได้
- Kobo API Token อยู่ใน Supabase Edge Function Secrets ชื่อ `KOBO` หรือ `KOBO_API_TOKEN` เท่านั้น
- ลูกค้าเห็นเฉพาะโครงการที่ได้รับสิทธิ์และรายงาน `published` หรือ `automatic` ผ่าน RLS
- `ecc_imports` และ `ecc_sources` อ่านได้เฉพาะผู้ดูแล ข้อมูลดิบไม่ถูกส่งไปหน้าลูกค้า
- การเปิดเว็บตรวจ Kobo อัตโนมัติและสร้างรายงาน `automatic` สำหรับรอบใหม่โดยระบุว่ายังไม่ผ่านการตรวจทาน ส่วนปุ่มนำเข้าของผู้ดูแลยังสร้างฉบับร่าง
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
- รูปหลักฐาน 1–3 จาก Kobo โหลดผ่าน Edge Function ที่ตรวจสิทธิ์ เลือกรูปและแก้คำบรรยายก่อนแนบ PDF/DOCX ได้
- ยังไม่ตั้ง cron, email อัตโนมัติ หรือบริการเสียเงิน
- ลืมรหัสผ่าน: ผู้ดูแล Supabase จัดการใน Auth Dashboard; ยังไม่พึ่ง SMTP ภายนอก
- ฟรีภายในโควตาผู้ให้บริการ ต้องติดตามพื้นที่และปริมาณใช้งาน; Supabase Free อาจ pause เมื่อไม่ได้ใช้งาน

## หลักฐานทดสอบ

- Build และ unit tests ของ report model / DOCX
- SQL RLS: anonymous denied, A/B isolation, drafts/raw hidden, client writes denied, self-promotion denied, admin review, revoked membership
- HTTP Edge Function: ไม่มี JWT และ JWT ปลอม → 401
- ตรวจ PDF ภาษาไทยจาก render fixture ด้วยภาพจริง
- บัญชีผู้ดูแลจริงเข้าสู่ระบบ local ได้แล้ว

เชื่อมต่อ Kobo จริงผ่าน Secret KOBO และอ่านโครงสร้างแบบฟอร์มสำเร็จแล้ว เปิดหน้า login และ Dashboard บน Cloudflare จริงสำเร็จแล้ว ทดสอบดาวน์โหลด PDF และ Word ของฉบับร่างจริงผ่านบัญชีผู้ดูแลบนเว็บที่เผยแพร่สำเร็จ

การเผยแพร่ครั้งแรกใช้ Cloudflare Pages Direct Upload: เปลี่ยน source ใน GitHub แล้วต้อง build และ upload `dist` ใหม่จึงจะอัปเดต portal ส่วนหน้าแรกบริษัทใช้ GitHub Pages ตามเดิม

## รูปแบบเว็บไซต์

หน้า Connect ใช้โลโก้ `favicon.png`, สี และภาพป่าภาพเดียวกับหน้าแรกบริษัท ฟอนต์บนหน้าจอคือ IBM Plex Sans Thai, Noto Serif Thai และ Playfair Display (บรรจุผ่าน @fontsource) ส่วน PDF ใช้ Sarabun เพื่อความสม่ำเสมอของเอกสารไทย

ภาพ `public/forest.jpg` มาจาก URL เดิมที่หน้าแรกใช้: https://images.unsplash.com/photo-1447752875215-b2761acb3c5d รูปแบบเมนูด้านบนและลิงก์กลับเว็บไซต์บริษัทใช้ร่วมกันทั้งหน้า login และพื้นที่ทำงาน


## รายงานผู้บริหารและ Username

- หน้าแรกของรายงาน: ข้อมูลโครงการ บทสรุป และประเด็นเสนอเพื่อพิจารณา; ตามด้วยขอบเขต ผล 3 มิติ ข้อจำกัด ข้อเสนอแนะ ผู้ตรวจทาน และภาพประกอบ
- กดแก้ไขบทสรุป / รายงานเพื่อบันทึกข้อความเอง ยังไม่มี AI เรียกใช้บริการภายนอก
- จัดการรูปจาก Kobo → ดึงรูปจาก Kobo ล่าสุด → เลือกรูปและบันทึกคำบรรยาย รูปต้องอยู่ในรายการสำรวจเดียวกัน JPEG/PNG/WebP ไม่เกิน 12 MB ต่อรูป
- ดาวน์โหลดจะหยุดหากรูปที่เลือกโหลดไม่ได้ เพื่อไม่ให้ส่งเอกสารที่ขาดรูปโดยไม่ทราบ; ภาพสำหรับเอกสารย่อไม่เกิน 1600px เก็บต้นฉบับไว้ Kobo
- Deploy connect-evidence พร้อม evidence.js; verify_jwt=false เพราะตรวจ Auth ด้วย getUser และอ่าน visit ผ่าน RLS ก่อนใช้ service role ต้องไม่ลบการตรวจนี้
- ผู้ดูแลเลือกโครงการและตั้ง Username/รหัสผ่านเริ่มต้น; Username ใช้ a-z 0-9 . _ - จำนวน 3–40 ตัว รหัสผ่าน 12–128 ตัว
- ภายในใช้ reserved alias @clients.eco-companion.invalid ไม่มีการส่งอีเมล และตรวจ protected app_metadata เพื่อไม่รับบัญชีที่คนอื่นสมัครดักชื่อไว้
- ลูกค้าเปลี่ยนรหัสผ่านได้เองหลังเข้าสู่ระบบ บัญชีผู้ดูแลเดิมยังใช้อีเมลได้; ไม่เก็บรหัสผ่านในฐานข้อมูลแอปหรือ log
- ข้อมูลจริงที่มีอยู่ยังไม่มีภาพแนบ จึงทดสอบการจัดภาพด้วย fixture ที่ระบุชัดว่าเป็นภาพจำลอง; ยังต้องตรวจการดึงภาพจริงหลังมีรูปใน Kobo


## รายงานรอบใหม่อัตโนมัติ

- Apply migration automatic_client_reports แล้ว deploy connect-auto-sync พร้อม model.js, connect-admin/normalize.js และ connect-evidence/evidence.js ก่อนอัปเดต frontend
- Function ตรวจ auth.getUser() และสิทธิ์โครงการผ่าน RLS ก่อนอ่าน source หรือเรียก Kobo; ใช้ verify_jwt=false เพราะตรวจ token ในฟังก์ชันเอง
- ตรวจเมื่อเข้าสู่ระบบ/เปิดโครงการ และทุก 30 วินาทีขณะที่หน้าเว็บเปิดอยู่ ไม่มี cron หรือ webhook ขณะไม่มีใครเปิดเว็บ
- ต้องส่งแบบฟอร์มถึง Kobo server แล้ว ไม่ใช่เพียงบันทึกร่างออฟไลน์ ชื่อโครงการต้องตรง filter ที่ผู้ดูแลตั้งครั้งแรก
- บทสรุปใช้คำตอบสรุปผลจากแบบฟอร์มที่รองรับ ไม่เรียก LLM ไม่สร้างข้อเท็จจริงเพิ่ม
- แนบรูปจากช่องหลักฐาน 1–3 เมื่อไฟล์ภาพพร้อมและตรงรายการ ดึงผ่าน server ที่ตรวจสิทธิ์ ไม่ส่ง Kobo token ไป browser
- รายงานใหม่แสดง “รายงานอัตโนมัติ — ยังไม่ผ่านการตรวจทาน” ทั้งเว็บ/PDF/Word ลูกค้าที่มีสิทธิ์อ่านได้
- draft/published และรายงานที่ผู้ดูแลบันทึกแก้ไขจะไม่ถูกเขียนทับ การแก้ไขตั้ง auto_update=false
- ใช้ hash ของข้อมูล Kobo เพื่ออัปเดตรายงาน automatic รองรับ retry หลังบันทึกข้อมูลดิบสำเร็จแต่บันทึกรายงานล้มเหลว
- Lease ป้องกันเรียกซ้อน 100 รายการต่อ batch; browser ไม่เกิน 5 batches ต่อรอบแล้วทำย้อนหลังต่อครั้งถัดไป
- ตั้งแหล่งข้อมูลและสิทธิ์แต่ละโครงการครั้งแรก โครงการใหม่ต้องตั้งเพิ่ม แต่ไม่ต้องจัดทำรายงานทุกครั้ง
- การลบรายการหรือเปลี่ยนโครงการใน Kobo ยังไม่ถอนรายงานเดิมอัตโนมัติ ผู้ดูแลตรวจรายงานเดิมแยกต่างหาก
