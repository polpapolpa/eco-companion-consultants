# ต้นจิกทะเลทรงปลูก ๒๕๕๒ — Royal Botanical Memorial Page

หน้าเว็บที่ระลึก ต้นจิกทะเลพระราชทาน ที่สมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดา ฯ
สยามบรมราชกุมารี ทรงปลูกไว้เมื่อวันที่ ๔ สิงหาคม พุทธศักราช ๒๕๕๒ ณ ตำบลโคกขาม อำเภอเมืองสมุทรสาคร

## File Structure
```
jiktale-page/
├── index.html              # หน้าเว็บหลัก (CSS/JS inline)
├── monogram.svg            # พระนามาภิไธยย่อ ส.ธ. (Royal Monogram)
├── royal-planting.jpg      # ภาพประวัติศาสตร์ทรงปลูก ๔ ส.ค. ๒๕๕๒
├── educational-sign.png    # ป้ายให้ความรู้เรื่องจิกทะเล
└── README.md               # เอกสารนี้
```

## หน้าเว็บประกอบด้วย 7 ส่วน (Narrative Arc)

1. **Hero** — ป้ายอนุสรณ์ custom design พร้อม Royal Monogram
   - h1: "ต้นจิกทะเลทรงปลูก ใต้ร่มพระบารมี"
   - Plaque: รายละเอียดทางการแบบราชสำนัก

2. **The Royal Planting (✨ NEW)** — ภาพประวัติศาสตร์ในวันที่ทรงปลูก
   - ภาพ `royal-planting.jpg` กรอบทอง 4 มุม
   - Caption: เมื่อวันที่ ๔ สิงหาคม พุทธศักราช ๒๕๕๒
   - Narrative: สะพานเชื่อมระหว่างต้นไม้เล็กในวันนั้นกับต้นไม้ใหญ่ในวันนี้

3. **Tree Dimensions** — ภาพประกอบ realistic + DBH/Height/Years
   - SVG ต้นจิกแบบ dense dome (38 rosette clusters)
   - มีดอก powderpuff + ดอกตูม peek ผ่านใบ
   - Trunk เห็นแค่ฐาน เหมือนต้นจริง

4. **CO₂ Sequestration** — เลข 73 kg CO₂e + compare cards + breakdown

5. **Tree Species** — ข้อมูลพฤกษศาสตร์ + ป้ายให้ความรู้

6. **Project อพ.สธ.** — โครงการพระราชดำริ + Royal Monogram seal

7. **Footer** — Eco Companion brand

## Visual Story
```
[Plaque: formal record]  →  [Photo: historical moment]
                              ↓
[Today's tree]  ←  [Carbon stored]  ←  [Species info]  ←  [Project context]
```

## Design System

### โทนสี (CSS Variables)
- **Royal Purple (สีม่วงพระเทพฯ):** `#5C2C7E` · deep `#3F1B5A` · light `#8A6BA8` · mist `#E8DFF0`
- **Gold:** `#B8902C` · light `#D4B764` · deep `#8E6C1B`
- **Forest:** `#1F3326` · leaf `#3D6147` · moss `#5C7A5F`
- **Paper:** `#F6F1E4` · soft `#FBF8F0`

### Typography
- **Bai Jamjuree** — Thai display + body
- **Sarabun** — Thai content text
- **Cormorant Garamond italic** — Latin accent, dates, captions
- **Cinzel** — Latin uppercase eyebrow + large numbers (lining figures)

### Key Technical Decisions
- **Cinzel for big numbers** — fixes Cormorant Garamond's old-style figures clipping (เลข 3, 7 ไม่ตกขอบ)
- **`font-feature-settings: "lnum" 1, "tnum" 1`** — lining + tabular numerals on all numeric displays
- **Custom royal plaque** — HTML/CSS instead of JPG, embeds `monogram.svg`
- **Photo frame** — gold corner ornaments + purple-tinted gradient mat

## CO₂ Calculation Methodology

Using **Chave et al. 2014 pantropical equation:**
```
AGB (kg) = 0.0673 × (ρ × D² × H)^0.976
```
- ρ (wood density of *Barringtonia asiatica*) = 0.55 g/cm³
- D (DBH) = 15 cm
- H (height) = 4.8 m
- AGB = 34.3 kg
- BGB = AGB × 0.24 = 8.2 kg (root-shoot ratio for tropical trees, IPCC 2006)
- Carbon stock = (AGB + BGB) × 0.47 = 20.0 kg C
- **CO₂e = C × 3.67 = ~73 kg CO₂ equivalent**

## Deployment
- Static site — deploy to any host (Netlify, Cloudflare Pages, S3+CloudFront, etc.)
- Single folder upload — all assets relative
- Recommended subdomain: `https://jiktale.ecocompanion.co/`
- QR code → URL → print on acrylic sign (0.6 × 0.4 m)

## Browser Support
- Modern browsers 2023+ (Chrome, Safari, Firefox, Edge)
- Mobile responsive (320px and up)
- Google Fonts CDN required

## Credits & References
- **Royal Monogram SVG:** Wikimedia Commons (public domain royal heraldry)
- **Historical photo:** provided by client (likely from อบจ. สมุทรสาคร archive)
- **Educational sign image:** provided by client
- **Tree illustration:** hand-crafted SVG (no copyrighted source)
- **Carbon methodology:** Chave et al. (2014), IPCC Guidelines (2006), TNFD v1.0

---
**Built by Claude for Eco Companion Consultants**
*In reverence to Her Royal Highness's vision of conservation*
