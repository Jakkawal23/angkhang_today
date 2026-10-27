# Angkhang Today (อ่างขาง ทูเดย์)

เว็บรวมที่พักดอยอ่างขางและที่พักตามเส้นทางขึ้นดอย ค้นหาตาม **เส้นทาง / หมู่บ้าน / งบ / จำนวนคน / สิ่งที่ต้องการ**
แล้วติดต่อเจ้าของที่พักได้โดยตรง พร้อมเครื่องหมาย **การันตีช่องทางติดต่อ** และหน้า **ตรวจสอบก่อนโอน** เพื่อป้องกันเพจปลอมและมิจฉาชีพ

> เฟสแรกเป็นเว็บ static (ไม่มี backend) ข้อมูลเก็บเป็นไฟล์ในโปรเจกต์ — เฟสถัดไปจะย้ายไปฐานข้อมูล เพิ่มระบบจอง โฆษณา สถานที่ท่องเที่ยว และร้านอาหาร
> (ดู [docs/RESEARCH-AND-DESIGN.md](docs/RESEARCH-AND-DESIGN.md))

## ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
| --- | --- |
| ค้นหาที่พัก | กรองตามเส้นทางขึ้นดอย หมู่บ้าน ประเภท งบ จำนวนคน มี LINE การันตี และคุณสมบัติ 18 แบบ (ทะเลหมอก หมูกระทะ ฮีตเตอร์ ฯลฯ) — แชร์ลิงก์ผลค้นหาได้ |
| หน้าที่พัก = เว็บของที่พัก | ห้องพักและราคาแต่ละแบบ แผนที่ Google Maps วิธีเดินทาง ช่องทางติดต่อทั้งหมด เงื่อนไข FAQ และที่มาของข้อมูล |
| ถามห้องว่าง | สร้างข้อความ (วันที่ วว/ดด/ปปปป ค.ศ. จำนวนคน ห้องที่สนใจ) — LINE OA เปิดแชตพร้อมข้อความ, LINE ส่วนตัวคัดลอกให้, ไม่มี LINE ใช้ Messenger/เพจ/โทร |
| ตรวจสอบก่อนโอน | วางเบอร์ / LINE / ลิงก์เพจ / เลขบัญชี แล้วเทียบกับช่องทางที่ทีมงานการันตี |
| รูปที่พัก | วางรูปที่ได้รับอนุญาตในโฟลเดอร์ → ขึ้นเป็นรูปปก แกลเลอรี และรูปห้องอัตโนมัติ (แปลง WebP ให้) / ยังไม่มีรูปแต่มีเพจ → แสดงเพจ Facebook ผ่านปลั๊กอินทางการ |
| SEO / AEO | HTML static ทุกหน้า, JSON-LD (LodgingBusiness + ห้องพัก/ราคา, FAQPage, Breadcrumb, ItemList), sitemap, `llms.txt`, หน้าตามเส้นทาง/หมู่บ้าน/ประเภท/คุณสมบัติ |
| มือถือ | เมนูล่าง ปุ่มถามห้องว่างลอย ตัวกรองแบบพับได้ |

## Tech stack

| | |
| --- | --- |
| Framework | [Astro 7](https://astro.build) (static site) |
| Styling | Tailwind CSS v4 |
| ไอคอน | [Lucide](https://lucide.dev/icons) + [Simple Icons](https://simpleicons.org) (โลโก้ LINE / Facebook / IG / TikTok) |
| ปฏิทิน | flatpickr (แสดง วว/ดด/ปปปป ค.ศ. ทุกเบราว์เซอร์) |
| ข้อมูล | Markdown + JSON ตรวจ schema ด้วย Zod (`src/content.config.ts`) |
| รูป | `astro:assets` + sharp (ย่อ + WebP หลายขนาดตอน build) |
| Deploy | static hosting ใดก็ได้ เช่น Cloudflare Pages / Vercel / Netlify |

## เริ่มใช้งาน

ต้องมี Node.js 22 ขึ้นไป

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # ตรวจ type + สร้างเว็บไว้ที่ dist/
npm run preview    # ดูผล build
npm run checklist  # สร้าง Excel เช็กลิสต์ติดต่อที่พัก -> docs/angkhang-contact-checklist.xlsx
```

ถ้าเจอ `Another astro dev server is already running` แปลว่ามี dev server เปิดอยู่แล้ว — เปิด http://localhost:4321 ได้เลย
หรือปิดตัวเดิมด้วย `npx astro dev stop`

> **หมายเหตุ Windows:** ถ้าเปิด Smart App Control จะบล็อกไฟล์ native ของ Astro compiler โปรเจกต์จึงติดตั้ง
> `@astrojs/compiler-binding-wasm32-wasi` (WebAssembly) ไว้ และตั้ง `force=true` ใน `.npmrc` ให้ `npm install` ติดตั้งตัวนี้ได้
> (ข้อความ `npm warn using --force` จึงขึ้นทุกครั้ง ไม่มีผลกับการทำงาน)

## ข้อมูลที่พัก

ข้อมูลต้นทางอยู่ที่ **`scripts/real-stays.mjs`** (62 แห่ง) แล้วสร้างเป็นไฟล์ `src/content/stays/<slug>.md` ด้วย

```bash
node scripts/build-stays.mjs
```

ไฟล์ `.md` จะถูกเขียนทับทุกครั้งที่รันสคริปต์ — ให้แก้ที่ `scripts/real-stays.mjs` เสมอ

> **ข้อมูลปัจจุบันเป็น "ข้อมูลตัวอย่าง"** รวบรวมจากแหล่งสาธารณะ (emagtravel, Kapook, Sale Here, Wongnai, Traveloka, Booking.com,
> Trip.com, เว็บไซต์ที่พัก ฯลฯ — ดูที่มาในหน้าที่พักแต่ละแห่ง) ชื่อลงท้ายด้วย "(ตัวอย่าง)" และยังไม่ได้ยืนยันกับเจ้าของที่พัก
> เมื่อทีมประสานงานยืนยันแล้ว ให้ลบคำว่า (ตัวอย่าง) ตั้ง `sample: false` และเปลี่ยน `status`

### สถานะข้อมูล (`status`)

| ค่า | แสดงบนเว็บ | ความหมาย |
| --- | --- | --- |
| `open` | ยืนยันว่าเปิดให้บริการ | ทีมงานยืนยันกับที่พักแล้ว |
| `listed` | พบประกาศบนเว็บจองล่าสุด | พบประกาศ/รีวิวบนเว็บจอง (ต.ค. 2026) |
| `unconfirmed` | ยังไม่ยืนยันสถานะ (ข้อมูลเก่า) | มาจากบทความเก่า อาจปิดไปแล้ว |

`verified.status: true` = แสดงเครื่องหมาย **การันตีช่องทางติดต่อ** (ใส่หลังตรวจเบอร์ LINE และชื่อบัญชีรับโอนกับเจ้าของจริงแล้วเท่านั้น)

### เส้นทางและหมู่บ้าน (`src/data/areas.ts` + `src/data/zones.json`)

| พื้นที่ (`area`) | หมู่บ้าน / โซน (`zone`) |
| --- | --- |
| `top` บนดอยอ่างขาง | บ้านคุ้ม, สถานีเกษตรหลวงอ่างขาง, ม่อนสน, บ้านขอบด้ง, บ้านนอแล, บ้านป่าคา |
| `r1249` เส้น ทล.1249 แม่งอน (ฝาง) | ริมทาง ทล.1249, บ้านแม่งอน, บ้านยาง, อำเภอฝาง |
| `r1178` เส้น ทล.1178 อรุโณทัย | บ้านอรุโณทัย, บ้านสินชัย, บ้านผาแดง |
| `rnongbua` เส้นบ้านใหม่หนองบัว (ไชยปราการ) | บ้านใหม่หนองบัว, บ้านถ้ำง้อบ, อำเภอไชยปราการ |

### field สำคัญ

| field | ความหมาย |
| --- | --- |
| `zone` | id จาก `src/data/zones.json` |
| `type` | `resort` `hotel` `homestay` `guesthouse` `cabin` `house` `tent` |
| `rooms` | ประเภทห้อง: `name`, `count`, `minGuests`/`maxGuests`, `beds`, `size`, `price.weekday/weekend/peak`, `breakfast`, `bathroom`, `features` — ระบบคำนวณช่วงราคาและความจุรวมให้ (ไม่รู้ราคา = ไม่ต้องใส่ จะแสดง "สอบถามราคา") |
| `contacts.phones` | `[{ number, name }]` เบอร์ + ชื่อผู้รับสาย |
| `contacts.line` | `{ type: 'oa', id: '@xxxx', url }` LINE OA / `{ type: 'personal', id }` LINE ส่วนตัว / ไม่มี LINE = ไม่ต้องใส่ |
| `contacts.*` | `facebook`, `facebookName`, `facebookIsPersonal`, `messenger`, `instagram`, `tiktok`, `website`, `email` |
| `location` | `lat`/`lng` (คลิกขวาที่หมุด Google Maps → คัดลอกพิกัด), `googleMapsUrl`, `directions`, `nearby` — ไม่มีพิกัด ระบบค้นหาจากชื่อแทน |
| `bankAccounts` | บัญชีรับโอนที่ถูกต้อง (ใช้ในหน้าตรวจสอบก่อนโอน) |
| `sources` | ที่มาของข้อมูล แสดงท้ายหน้าที่พัก |
| `faqs` | คำถาม-คำตอบเฉพาะที่พัก (ช่วย SEO/AEO) |

## รูปที่พัก

ใส่เฉพาะรูปที่ **ได้รับอนุญาต** แล้ว (รายละเอียด: [src/assets/stays/README.md](src/assets/stays/README.md))

```
src/assets/stays/<slug>/
  01.jpg 02.jpg ...      รูปรวม (01 = รูปปก)
  rooms/1/01.jpg ...     รูปห้องพักประเภทที่ 1
  credits.json           เครดิตและคำอธิบายรูป
```

```bash
node scripts/add-photos.mjs <slug> "<โฟลเดอร์รูป>" --credit "ภาพจาก ชื่อที่พัก (ได้รับอนุญาต)"
node scripts/add-photos.mjs <slug> "<โฟลเดอร์รูปห้อง>" --room 1
node scripts/make-photo-folders.mjs   # สร้างโฟลเดอร์รูปให้ที่พักใหม่
```

## โลโก้

ไฟล์โลโก้ทุกแบบอยู่ที่ [public/brand/](public/brand/README.md) (SVG + PNG: แนวนอน, จัตุรัส, จัตุรัสมีตัวหนังสือ, แบบสีขาว, favicon)

```bash
npm run logo                                   # สร้างไฟล์โลโก้ทุกแบบใหม่
npm run logo:trace -- "<ไฟล์สัญลักษณ์ใหม่.svg>"   # เปลี่ยนแบบโลโก้ (แปลงรูปเป็นเวกเตอร์ 2 สี)
```

## ทีมประสานงาน

- `npm run checklist` → [docs/angkhang-contact-checklist.xlsx](docs/angkhang-contact-checklist.xlsx) รายชื่อที่พัก ช่องทางติดต่อ ตำแหน่ง
  ข้อมูลที่ต้องขอเพิ่ม ช่องบันทึกผลการติดต่อ แบบฟอร์มเก็บข้อมูล และข้อความติดต่อพร้อมส่ง
- ข้อความขออนุญาตใช้ข้อมูลและรูป: [docs/photo-permission-request.md](docs/photo-permission-request.md)

## โครงสร้างโปรเจกต์

```
scripts/
  real-stays.mjs           ข้อมูลที่พักต้นทาง (แก้ที่นี่)
  build-stays.mjs          สร้าง src/content/stays/*.md
  add-photos.mjs           นำเข้ารูปที่ได้รับอนุญาต
  make-photo-folders.mjs   สร้างโฟลเดอร์รูปของทุกที่พัก
  export-checklist.mjs     สร้าง Excel เช็กลิสต์
src/
  content/stays/*.md       ข้อมูลที่พัก (สร้างจากสคริปต์)
  content.config.ts        schema ข้อมูล (ต้นแบบตารางฐานข้อมูลในอนาคต)
  data/                    เส้นทาง, หมู่บ้าน, ประเภท, สิ่งอำนวยความสะดวก, FAQ, ค่าเว็บ
  assets/stays/<slug>/     รูปที่พัก
  lib/                     stays (ราคา/แผนที่/LINE), seo (JSON-LD), images, icons, contact-keys
  components/              StayCard, StayGallery, RoomCard, ContactBox, ContactChannels, MapSection, ...
  scripts/datepicker.ts    ปฏิทิน วว/ดด/ปปปป
  pages/
    index.astro            หน้าแรก
    stays/                 ค้นหา, หน้าที่พัก, tag/[tag], type/[type]
    routes/[route].astro   หน้าเส้นทางขึ้นดอย
    zones/                 หน้าหมู่บ้าน/โซน และภาพรวมเส้นทาง
    verify.astro           ตรวจสอบก่อนโอน
    safety, faq, about, for-owners, 404
    llms.txt.ts            สรุปเว็บสำหรับ AI search
docs/                      เอกสารออกแบบ, เช็กลิสต์ Excel, ข้อความติดต่อ
```

## ก่อนเปิดเว็บจริง

- [ ] เปลี่ยนโดเมนใน `astro.config.mjs`, `src/data/site.ts`, `public/robots.txt`
- [ ] ใส่ LINE / อีเมลจริงของทีมใน `src/data/site.ts` (ตอนนี้ `@angkhangtoday` เป็นค่าสมมติ)
- [ ] ยืนยันข้อมูลกับที่พัก เอาคำว่า (ตัวอย่าง) ออก และนำที่พักที่ไม่ประสงค์ลงเว็บออก
- [ ] เพิ่มแบนเนอร์ขอความยินยอมคุกกี้ (ปลั๊กอิน Facebook และแผนที่ Google ส่งข้อมูลผู้เข้าชมไปยังผู้ให้บริการ)
- [ ] เปลี่ยน `public/og-default.jpg` เป็นรูปจริงของดอยอ่างขาง (1200×630)
- [ ] ส่ง sitemap ใน Google Search Console
