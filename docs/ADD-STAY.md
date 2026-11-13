# วิธีเพิ่มที่พักใหม่

## เพิ่มที่ไหน

ไฟล์เดียว: **`scripts/real-stays.mjs`** — วางข้อมูลที่พักใหม่ใน `const NEW = [ ... ]` (ต่อท้ายรายการ)

แล้วรัน:

```bash
node scripts/build-stays.mjs        # สร้าง src/content/stays/<slug>.md
node scripts/make-photo-folders.mjs # สร้างโฟลเดอร์รูป
npm run build                       # ตรวจว่าไม่มี error
npm run checklist                   # อัปเดต Excel
git add -A && git commit -m "Add <ชื่อที่พัก>" && git push   # ขึ้นเว็บ (Vercel deploy อัตโนมัติ)
```

## แม่แบบ (คัดลอกไปแก้)

`★` = จำเป็นต้องมี · ช่องอื่นไม่รู้ข้อมูลให้ลบทิ้งได้ (เว็บจะแสดง "สอบถาม")

```js
  {
    // ───── ตัวตน ─────
    slug: 'baan-suan-mok',            // ★ ภาษาอังกฤษตัวเล็ก คั่นด้วย - ห้ามซ้ำ = URL /stays/baan-suan-mok
    name: 'บ้านสวนหมอก',               // ★ ชื่อไทย (ข้อมูลตัวอย่างให้ต่อท้าย "(ตัวอย่าง)")
    nameEn: 'Baan Suan Mok',
    type: 'homestay',                 // ★ ดูตาราง "ประเภทที่พัก"
    zone: 'ban-pha-daeng',            // ★ หมู่บ้านหลัก (ใช้เป็นที่อยู่) ดูตาราง "หมู่บ้าน"
    zones: [],                        // หมู่บ้านอื่นที่ให้แสดงด้วย เช่น ['ban-sinchai'] (ที่พักอยู่รอยต่อ 2 หมู่บ้าน)
    routes: [],                       // เส้นทางเพิ่มเติม เช่น ['r1249'] (ปกติไม่ต้องใส่ ระบบดึงจากหมู่บ้านให้)
    summary: 'โฮมสเตย์บ้านไม้ วิวดอย ทำหมูกระทะได้ เดินทางสะดวก',   // ★ 1–2 ประโยค ไม่เกิน 220 ตัวอักษร
    featured: false,                  // true = ขึ้นหน้าแรก

    // ───── สถานะ ─────
    sample: false,                    // false = ข้อมูลจริงจากเจ้าของ (ไม่ใส่ = true = แสดงป้าย "ข้อมูลตัวอย่าง")
    status: 'open',                   // open = ยืนยันว่าเปิด | listed = พบบนเว็บจอง | unconfirmed = ข้อมูลเก่า
    verified: {                       // ใส่หลังทีมตรวจเบอร์/LINE/ชื่อบัญชีกับเจ้าของจริงแล้วเท่านั้น
      status: true,
      date: '2026-11-13',
      method: ['โทรยืนยันกับเจ้าของ', 'ตรวจชื่อบัญชีรับโอนตรงกับเจ้าของ'],
    },
    updated: '2026-11-13',            // วันที่อัปเดตข้อมูล (ปี-เดือน-วัน ค.ศ.)

    // ───── ห้องพักและราคา ─────
    rooms: [                          // ห้องแต่ละแบบ 1 ก้อน (ระบบคำนวณช่วงราคา/ความจุให้เอง)
      {
        name: 'ห้องครอบครัว',           // ★ (ในแต่ละห้อง)
        count: 2,                     // มีกี่ห้อง
        minGuests: 3,                 // พักได้ 3–4 คน (ถ้าเป็นค่าเดียว ใส่แค่ maxGuests)
        maxGuests: 4,                 // ★ (ในแต่ละห้อง)
        beds: 'เตียง 6 ฟุต 1 เตียง + ที่นอนเสริม 1',
        size: 28,                     // ตร.ม.
        unit: 'room',                 // room = ต่อห้อง | person = ต่อคน | tent = ต่อเต็นท์ | house = ต่อหลัง
        price: { weekday: 1200, weekend: 1500, peak: 1800 },   // ไม่รู้ราคา = ลบบรรทัดนี้
        breakfast: true,
        bathroom: 'private',          // private = ในตัว | shared = รวม
        extraBed: 'เสริมเตียง 300 บาท',
        features: ['ระเบียงวิวดอย', 'ฮีตเตอร์'],
      },
    ],
    price: { note: 'ช่วงพีค = 20 ธ.ค.–3 ม.ค.' },   // หมายเหตุราคา (ไม่มีห้องเลย ใส่ min/max ได้: { min: 500, max: 900 })
    seasons: { weekday: 'อาทิตย์–พฤหัส', weekend: 'ศุกร์–เสาร์', peak: '20 ธ.ค.–3 ม.ค.' },

    // ───── รายละเอียด ─────
    amenities: ['mist-view', 'bbq-grill', 'hot-water', 'parking', 'wifi'],   // ดูตาราง "สิ่งอำนวยความสะดวก"
    highlights: ['ตื่นมาเห็นทะเลหมอกหน้าบ้าน', 'เจ้าของทำอาหารยูนนานให้'],
    checkIn: '14:00',
    checkOut: '11:00',
    policies: {
      deposit: 'มัดจำ 50% ภายใน 24 ชม.',
      cancellation: 'ยกเลิกก่อน 7 วัน คืนมัดจำเต็มจำนวน',
      other: ['งดสูบบุหรี่ในห้อง', 'เงียบหลัง 22:00 น.'],
    },

    // ───── ช่องทางติดต่อ ─────
    contacts: {
      phones: [{ number: '081-234-5678', name: 'ป้าแดง (เจ้าของ)' }],
      line: { type: 'personal', id: 'suanmok' },        // LINE OA: { type: 'oa', id: '@xxxx', url: 'https://lin.ee/xxxx' } / ไม่มี LINE = ลบบรรทัดนี้
      facebook: 'https://www.facebook.com/baansuanmok',
      facebookName: 'บ้านสวนหมอก ผาแดง',
      // facebookIsPersonal: true,                      // ถ้าลิงก์เป็นโปรไฟล์ส่วนตัว ไม่ใช่เพจ
      messenger: 'https://m.me/baansuanmok',
      instagram: 'https://www.instagram.com/baansuanmok',
      tiktok: 'https://www.tiktok.com/@baansuanmok',
      website: 'https://...',
      email: 'owner@example.com',
    },
    bankAccounts: [                    // ใช้ในหน้า "ตรวจสอบก่อนโอน" (ใส่เมื่อเจ้าของยินยอม)
      { bank: 'กสิกรไทย', accountName: 'นางแดง ใจดี', accountNumber: '123-4-56789-0' },
    ],

    // ───── ตำแหน่ง ─────
    location: {
      lat: 19.8012,                   // คลิกขวาที่หมุดใน Google Maps > คัดลอกพิกัด
      lng: 99.0523,
      address: 'หมู่ 6 บ้านผาแดง',
      googleMapsUrl: 'https://maps.app.goo.gl/xxxx',
      directions: ['ใช้เส้น ทล.1178 จากบ้านอรุโณทัย', 'ถึงบ้านผาแดงเลี้ยวซ้ายตรงร้านค้า'],
      nearby: ['จุดชมวิวผาแดง ~1 กม.', 'สถานีเกษตรหลวงอ่างขาง ~20 กม.'],
    },

    // ───── ที่มา / FAQ ─────
    sources: [{ title: 'เจ้าของที่พักยืนยันทาง LINE', url: 'https://angkhangtoday.vercel.app', note: 'พ.ย. 2026' }],
    faqs: [{ q: 'บ้านสวนหมอกทำหมูกระทะได้ไหม?', a: 'ได้ มีเตาให้ยืมที่ลานหน้าบ้าน' }],
  },
```

## ค่าที่ใช้ได้

### ประเภทที่พัก (`type`)

| ค่า | แสดงบนเว็บ |
| --- | --- |
| `resort` | รีสอร์ท |
| `hotel` | โรงแรม |
| `homestay` | โฮมสเตย์ |
| `guesthouse` | บ้านพัก / เกสต์เฮาส์ |
| `cabin` | บ้านไม้ / บังกะโล |
| `house` | บ้านทั้งหลัง |
| `tent` | ลานกางเต็นท์ |

### หมู่บ้าน (`zone`) — จาก `src/data/zones.json`

| เส้นทาง / พื้นที่ | `zone` |
| --- | --- |
| บนดอยอ่างขาง | `ban-khum` บ้านคุ้ม · `royal-station` สถานีเกษตรหลวง · `mon-son` ม่อนสน · `ban-khob-dong` บ้านขอบด้ง · `ban-nor-lae` บ้านนอแล · `ban-pa-kha` บ้านป่าคา |
| เส้น ทล.1249 แม่งอน (ฝาง) | `route-1249-roadside` ริมทาง 1249 · `ban-mae-ngon` บ้านแม่งอน · `ban-yang` บ้านยาง · `fang` อ.ฝาง |
| เส้น ทล.1178 อรุโณทัย | `ban-arunothai` บ้านอรุโณทัย · `ban-santiwana` บ้านสันติวนา · `ban-sinchai` บ้านสินชัย ¹ · `ban-pha-daeng` บ้านผาแดง ¹ |
| เส้นบ้านใหม่หนองบัว | `ban-mai-nong-bua` บ้านใหม่หนองบัว · `ban-tham-ngop` บ้านถ้ำง้อบ · `chaiprakan` อ.ไชยปราการ ² |

¹ อยู่ทั้งเส้น 1178 และเส้นหนองบัว (เส้นหนองบัวมาบรรจบ 1178 ที่สามแยกบ้านสินชัย แล้วผ่านผาแดงขึ้นอ่างขาง)  
² อยู่ทั้งเส้นหนองบัวและเส้น 1249 (ทล.107 ผ่านไชยปราการก่อนถึงแยกบ้านปางควาย กม.137)

ไม่มีหมู่บ้านที่ต้องการ → เพิ่มใน `src/data/zones.json` ก่อน

### 1 ที่พักอยู่ได้หลายหมู่บ้าน / หลายเส้นทาง

ระบบรวมให้อัตโนมัติจาก 3 ที่:

| ที่มา | ใส่ที่ไหน | ตัวอย่าง |
| --- | --- | --- |
| หมู่บ้านอยู่หลายเส้นทาง | `alsoOn` ใน `src/data/zones.json` | บ้านผาแดง `area: "r1178", alsoOn: ["rnongbua"]` → ที่พักทุกแห่งในผาแดงขึ้นทั้ง 2 เส้น |
| ที่พักอยู่หลายหมู่บ้าน | `zones` ในข้อมูลที่พัก | `zone: "ban-pha-daeng", zones: ["ban-sinchai"]` |
| ที่พักอยู่เส้นทางพิเศษ | `routes` ในข้อมูลที่พัก | `routes: ["r1249"]` |

`zone` (หมู่บ้านหลัก) ยังจำเป็นเสมอ ใช้เป็นที่อยู่และ breadcrumb ส่วน `zones` / `routes` ใช้ให้ที่พักไปโผล่ในหน้าหมู่บ้าน หน้าเส้นทาง และตัวกรองค้นหาเพิ่ม

### สิ่งอำนวยความสะดวก (`amenities`) — จาก `src/data/amenities.ts`

| ค่า | ความหมาย | ค่า | ความหมาย |
| --- | --- | --- | --- |
| `mist-view` | วิวทะเลหมอก | `breakfast` | รวมอาหารเช้า |
| `sunrise-view` | วิวพระอาทิตย์ขึ้น | `restaurant` | มีร้านอาหาร |
| `bbq-grill` | ปิ้งย่าง / หมูกระทะได้ | `large-group` | รับกรุ๊ป 10+ คน |
| `campfire` | ก่อกองไฟได้ | `family` | เหมาะกับครอบครัว |
| `heater` | มีฮีตเตอร์ | `pet-friendly` | พาสัตว์เลี้ยงได้ |
| `hot-water` | น้ำอุ่น | `tent-rental` | มีเต็นท์ให้เช่า |
| `electric-blanket` | ผ้าห่มไฟฟ้า | `parking` | ที่จอดรถ |
| `private-bathroom` | ห้องน้ำในตัว | `pickup` | บริการรับ-ส่ง |
| `wifi` | Wi-Fi | `walk-to-station` | เดินไปสถานีเกษตรหลวงได้ |

## รูป (ถ้ามี)

```bash
node scripts/add-photos.mjs baan-suan-mok "C:/Users/.../รูปที่พัก" --credit "ภาพจากบ้านสวนหมอก (ได้รับอนุญาต)"
node scripts/add-photos.mjs baan-suan-mok "C:/Users/.../รูปห้อง1" --room 1
```

## ข้อมูลขั้นต่ำที่ขึ้นเว็บได้

```js
  {
    slug: 'baan-suan-mok',
    name: 'บ้านสวนหมอก',
    type: 'homestay',
    zone: 'ban-pha-daeng',
    summary: 'โฮมสเตย์บ้านไม้ วิวดอย',
    contacts: { phones: [{ number: '081-234-5678' }] },
  },
```
