// สร้างไฟล์ Excel เช็กลิสต์สำหรับทีมประสานงานติดต่อที่พัก
// ใช้: npm run checklist  -> docs/angkhang-contact-checklist.xlsx
//
// แท็บ: วิธีใช้ · รายชื่อที่พัก (จัดกลุ่มตามเส้นทาง > หมู่บ้าน, มีลิงก์หน้าเว็บ + ข้อความพร้อมส่งทุกแถว)
//       · ข้อความติดต่อ (หลายเวอร์ชัน รวมแบบสั้นสำหรับผู้สูงอายุ) · ที่พักใหม่ (พบจากกลุ่ม FB ฯลฯ) · แบบฟอร์มข้อมูล · สรุป
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { STAYS } from './real-stays.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const ExcelJS = require('exceljs');

const SITE_URL = 'https://angkhangtoday.vercel.app';
const TEAM = { name: 'Angkhang Today', line: 'ak.today' };
const OUT = path.join(root, 'docs', 'angkhang-contact-checklist.xlsx');
const FONT = 'Tahoma';

const zones = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(root, 'src/data/zones.json'), 'utf8')).map((z) => [z.id, z]));
const AREA = {
  top: 'บนดอยอ่างขาง',
  r1249: 'เส้น ทล.1249 แม่งอน (ฝาง)',
  r1178: 'เส้น ทล.1178 อรุโณทัย',
  rnongbua: 'เส้นบ้านใหม่หนองบัว (ไชยปราการ)',
};
const AREA_ORDER = ['top', 'r1249', 'r1178', 'rnongbua'];
const TYPE = { resort: 'รีสอร์ท', hotel: 'โรงแรม', homestay: 'โฮมสเตย์', guesthouse: 'บ้านพัก/เกสต์เฮาส์', cabin: 'บ้านไม้/บังกะโล', house: 'บ้านทั้งหลัง', tent: 'ลานกางเต็นท์' };
const STATUS = { open: 'ยืนยันแล้วว่าเปิด', listed: 'พบบนเว็บจอง ต.ค. 2026', unconfirmed: 'ข้อมูลเก่า ยังไม่ยืนยัน' };

const clean = (n) => n.replace(/\s*\(ตัวอย่าง\)\s*/g, '').trim();
const pageUrl = (s) => `${SITE_URL}/stays/${s.slug}`;
const hasPhotos = (slug) => {
  const dir = path.join(root, 'src/assets/stays', slug);
  return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => /\.(jpe?g|png|webp)$/i.test(f));
};

function priceText(s) {
  const all = (s.rooms ?? []).flatMap((r) => (r.price ? [r.price.weekday, r.price.weekend, r.price.peak] : [])).filter((n) => n != null);
  const min = all.length ? Math.min(...all) : s.price?.min;
  const max = all.length ? Math.max(...all) : (s.price?.max ?? s.price?.min);
  if (min == null) return '';
  return min === max ? `${min.toLocaleString()} บาท` : `${min.toLocaleString()}–${max.toLocaleString()} บาท`;
}

function missing(s) {
  const c = s.contacts ?? {};
  const m = [];
  if (!priceText(s)) m.push('ราคาห้องพัก');
  if (!(s.rooms ?? []).length) m.push('ประเภท/จำนวนห้อง');
  else if ((s.rooms ?? []).some((r) => !r.count)) m.push('จำนวนห้องแต่ละแบบ');
  if (s.location?.lat == null) m.push('พิกัด/หมุด Google Maps');
  if (!(c.phones ?? []).length) m.push('เบอร์โทร');
  if (!c.line) m.push('LINE (OA หรือส่วนตัว)');
  if (!c.facebook) m.push('เพจ Facebook');
  if (!s.checkIn) m.push('เวลาเช็กอิน-เอาท์');
  if (!s.policies?.deposit) m.push('เงื่อนไขมัดจำ/ยกเลิก');
  if (!hasPhotos(s.slug)) m.push('รูปที่พัก + รูปแต่ละห้อง');
  m.push('ชื่อบัญชีรับโอน (สำหรับการันตี)');
  return m.join(', ');
}

function reliability(s) {
  const titles = (s.sources ?? []).map((x) => x.title).join(' ');
  if (/เว็บไซต์(ของ)?ยูนนาน|เว็บไซต์ที่พัก/.test(titles)) return 'จากเว็บไซต์ของที่พักเอง';
  if (s.status === 'listed') return 'พบบนเว็บจอง/รีวิว ต.ค. 2026 (ช่องทางอาจไม่ครบ)';
  return 'จากบทความเก่า — เบอร์/เพจอาจเปลี่ยนแล้ว';
}

function bestChannel(s) {
  const c = s.contacts ?? {};
  if (c.line?.type === 'oa') return 'LINE OA';
  if ((c.phones ?? []).length) return 'โทร';
  if (c.line) return 'LINE ส่วนตัว';
  if (c.messenger || (c.facebook && !c.facebookIsPersonal)) return 'Messenger ของเพจ';
  if (c.facebook) return 'Facebook (โปรไฟล์ส่วนตัว)';
  if (c.website) return 'เว็บไซต์';
  return 'ยังไม่มีช่องทาง — ค้นใน Google Maps / กลุ่ม FB';
}

// ข้อความพร้อมส่งรายแถว (คัดลอกไปวางใน LINE / Messenger ได้ทันที)
const rowMessage = (s) =>
  `สวัสดีค่ะ/ครับ ติดต่อจาก Angkhang Today เว็บรวมที่พักดอยอ่างขาง (ลงข้อมูลฟรี โปรโมทฟรี)\n` +
  `เราทำหน้าของ "${clean(s.name)}" ไว้ที่ ${pageUrl(s)}\n` +
  `รบกวนช่วยดูว่าข้อมูลถูกต้องไหม ถ้ามีส่วนไหนผิด หรืออยากเพิ่มรูป ราคา ห้องพัก แจ้งได้เลยนะคะ/ครับ ขอบคุณค่ะ/ครับ`;
const rowMessageShort = (s) =>
  `สวัสดีค่ะ จาก Angkhang Today\nเราลงข้อมูล "${clean(s.name)}" ให้ฟรีที่\n${pageUrl(s)}\nข้อมูลถูกต้องไหมคะ ผิดตรงไหนบอกได้เลยค่ะ`;

const link = (url, text) => (url ? { text: text ?? url, hyperlink: url } : '');
const mapLink = (s, z) =>
  s.location?.lat != null
    ? `https://www.google.com/maps/search/?api=1&query=${s.location.lat},${s.location.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([clean(s.name), z.name, z.district && 'อ.' + z.district, 'เชียงใหม่'].filter(Boolean).join(' '))}`;

const colLetter = (n) => {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

// ---------------- workbook ----------------
const wb = new ExcelJS.Workbook();
wb.creator = 'Angkhang Today';
wb.created = new Date();
wb.calcProperties.fullCalcOnLoad = true;

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const HEAD_FILL = fill('FF194F3D');
const INPUT_HEAD_FILL = fill('FFC64B75');
const INPUT_FILL = fill('FFFFF2CC');
const LINK_FILL = fill('FFE8F4EE');
const AREA_FILL = fill('FF2F7A57');
const ZONE_FILL = fill('FFD6EADF');
const thin = { style: 'thin', color: { argb: 'FFD9D9D9' } };
const border = { top: thin, bottom: thin, left: thin, right: thin };

// ===== Sheet: วิธีใช้ =====
const guide = wb.addWorksheet('วิธีใช้', { properties: { tabColor: { argb: 'FF194F3D' } } });
guide.columns = [{ width: 26 }, { width: 110 }];
const g = [
  ['เช็กลิสต์ติดต่อที่พัก Angkhang Today', ''],
  ['อัปเดต', new Date().toLocaleDateString('en-GB')],
  ['จำนวนที่พัก', STAYS.length],
  ['เว็บไซต์', SITE_URL],
  ['', ''],
  ['ขั้นตอน', '1) เปิดแท็บ "รายชื่อที่พัก" — เรียงและจัดกลุ่มตาม เส้นทาง > หมู่บ้าน (กดเครื่องหมาย − / + ด้านซ้ายเพื่อพับ/กางแต่ละกลุ่ม)'],
  ['', '2) คอลัมน์ "ลิงก์หน้าเว็บ" = หน้าของที่พักนั้นบนเว็บจริง ส่งให้เจ้าของดูได้ทันที'],
  ['', '3) คอลัมน์ "ข้อความพร้อมส่ง" มี 2 แบบ (ปกติ / สั้นสำหรับผู้สูงอายุ) ใส่ชื่อที่พักและลิงก์ให้แล้ว — คลิกช่อง > คัดลอก > วางใน LINE หรือ Messenger'],
  ['', '4) ข้อความแบบอื่น ๆ (ทักครั้งแรก เชิญเข้าร่วม โทร ทักซ้ำ ขอบคุณ ฯลฯ) อยู่ในแท็บ "ข้อความติดต่อ"'],
  ['', '5) หลังติดต่อ กรอกช่องพื้นเหลือง (ผู้ประสานงาน วันที่ ผลการติดต่อ ฯลฯ)'],
  ['', '6) ข้อมูลใหม่ที่ได้ (ห้อง ราคา รูป หมุด) จดในแท็บ "แบบฟอร์มข้อมูล" แล้วส่งทีมเว็บอัปเดต — หลังอัปเดต ส่งลิงก์เดิมให้เจ้าของตรวจอีกครั้ง'],
  ['', '7) เจอที่พักใหม่ที่ยังไม่มีในรายชื่อ (เช่น จากกลุ่ม Facebook) จดในแท็บ "ที่พักใหม่"'],
  ['', '8) ดูความคืบหน้าในแท็บ "สรุป"'],
  ['', ''],
  ['ช่องที่ต้องกรอก', 'เฉพาะคอลัมน์หัวสีชมพู / ช่องพื้นเหลือง — คอลัมน์หัวสีเขียวเป็นข้อมูลจากเว็บ ห้ามแก้ (ถ้าข้อมูลผิด ให้เขียนใน "หมายเหตุ")'],
  ['ตัวอย่างการกรอก', 'ผู้ประสานงาน: น้องเอ | ช่องทางที่ใช้: LINE | วันที่ติดต่อ: 12/11/2026 | ผลการติดต่อ: รอตอบกลับ | อนุญาตใช้รูป: รอ | นัดติดตาม: 15/11/2026'],
  ['', ''],
  ['ข้อควรระวัง', 'ช่องทางติดต่อรวบรวมจากแหล่งสาธารณะ ยังไม่ได้ยืนยันทุกแห่ง — ดูคอลัมน์ "ความน่าเชื่อถือของช่องทาง"'],
  ['', 'ถ้าเบอร์/เพจไม่ใช่ของที่พักจริง หรือที่พักปิดกิจการแล้ว ให้เลือกผล "ช่องทางผิด" หรือ "ปิดกิจการ" และจดช่องทางที่ถูกต้อง'],
  ['', 'ห้ามขอหรือรับเงินใด ๆ จากที่พัก — การลงข้อมูลและโปรโมทฟรีทั้งหมด / ไม่ขอรหัสผ่าน รหัส OTP หรือเลขบัตรใด ๆ'],
  ['', 'ถ้าที่พักไม่ต้องการให้แสดงบนเว็บ ให้เลือก "ไม่ประสงค์ลงเว็บ" ทีมเว็บจะนำออก'],
];
g.forEach((r, i) => {
  const row = guide.addRow(r);
  row.font = { name: FONT, size: 11, bold: i === 0 || !!r[0] };
  row.alignment = { vertical: 'top', wrapText: true };
});
guide.getRow(1).font = { name: FONT, size: 16, bold: true, color: { argb: 'FF194F3D' } };
guide.getCell('B4').value = link(SITE_URL);
guide.getCell('B4').font = { name: FONT, size: 11, color: { argb: 'FF0563C1' }, underline: true };

// ===== Sheet: รายชื่อที่พัก =====
const ws = wb.addWorksheet('รายชื่อที่พัก', {
  properties: { tabColor: { argb: 'FFC64B75' }, outlineProperties: { summaryBelow: false } },
  views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }],
});
const COLS = [
  // ข้อมูลจากเว็บ (หัวเขียว)
  ['ลำดับ', 6], ['ชื่อที่พัก', 28], ['ลิงก์หน้าเว็บ (ส่งให้เจ้าของตรวจ)', 34],
  ['ข้อความพร้อมส่ง (ปกติ)', 46], ['ข้อความพร้อมส่ง (สั้น / ผู้สูงอายุ)', 36],
  ['ประเภท', 14], ['เส้นทาง/พื้นที่', 22], ['หมู่บ้าน/โซน', 18], ['ที่อยู่', 28], ['แผนที่ Google Maps', 14], ['พิกัด', 18],
  ['เบอร์โทร', 18], ['ผู้รับสาย', 20], ['LINE (ประเภท)', 11], ['LINE ID / ลิงก์', 18], ['เพจ Facebook', 22], ['Messenger', 12],
  ['Instagram / TikTok', 18], ['เว็บไซต์', 16], ['ราคาที่มีข้อมูล', 15], ['สถานะข้อมูล', 18], ['ความน่าเชื่อถือของช่องทาง', 24],
  ['ช่องทางแนะนำ', 16], ['ข้อมูลที่ต้องขอเพิ่ม', 40], ['แหล่งข้อมูล', 28],
  // ทีมประสานงานกรอก (หัวชมพู)
  ['ผู้ประสานงาน', 14], ['ช่องทางที่ใช้', 13], ['วันที่ติดต่อ', 12], ['ผลการติดต่อ', 19], ['อนุญาตใช้ข้อมูล', 12], ['อนุญาตใช้รูป', 12],
  ['ได้รับรูปแล้ว', 11], ['ยืนยันบัญชีรับโอน', 12], ['ตรวจหน้าเว็บแล้ว', 12], ['ช่องทางที่ถูกต้อง (ถ้าต่างจากเดิม)', 26], ['นัดติดตาม', 12], ['หมายเหตุ', 32],
];
const C = Object.fromEntries(COLS.map(([h], i) => [h, i + 1]));
const L = (h) => colLetter(C[h]);
const FIRST_INPUT = C['ผู้ประสานงาน'];
ws.columns = COLS.map(([header, width]) => ({ header, width }));
const head = ws.getRow(1);
head.height = 40;
head.eachCell((cell, col) => {
  cell.font = { name: FONT, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = col >= FIRST_INPUT ? INPUT_HEAD_FILL : HEAD_FILL;
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = border;
});

const sorted = [...STAYS].sort(
  (a, b) =>
    AREA_ORDER.indexOf(zones[a.zone].area) - AREA_ORDER.indexOf(zones[b.zone].area) ||
    zones[a.zone].order - zones[b.zone].order ||
    clean(a.name).localeCompare(clean(b.name), 'th'),
);

function groupRow(text, level) {
  const row = ws.addRow([]);
  row.getCell(1).value = text;
  ws.mergeCells(row.number, 1, row.number, COLS.length);
  const cell = row.getCell(1);
  cell.font = { name: FONT, size: level === 0 ? 13 : 11, bold: true, color: { argb: level === 0 ? 'FFFFFFFF' : 'FF194F3D' } };
  cell.fill = level === 0 ? AREA_FILL : ZONE_FILL;
  cell.alignment = { vertical: 'middle', indent: level };
  row.height = level === 0 ? 26 : 20;
  if (level === 1) row.outlineLevel = 1;
}

const stayRows = [];
let n = 0;
for (const area of AREA_ORDER) {
  const inArea = sorted.filter((s) => zones[s.zone].area === area);
  if (!inArea.length) continue;
  groupRow(`${AREA[area]}  —  ${inArea.length} ที่พัก`, 0);
  const zoneIds = [...new Set(inArea.map((s) => s.zone))];
  for (const zid of zoneIds) {
    const inZone = inArea.filter((s) => s.zone === zid);
    groupRow(`${zones[zid].name}  (${inZone.length})`, 1);
    for (const s of inZone) {
      n++;
      const z = zones[s.zone];
      const c = s.contacts ?? {};
      const phones = c.phones ?? [];
      const addr = [s.location?.address ?? z.name, z.subdistrict && `ต.${z.subdistrict}`, z.district && `อ.${z.district}`, 'จ.เชียงใหม่'].filter(Boolean).join(' ');
      const lineVal = c.line
        ? link(c.line.url ?? (c.line.type === 'oa' ? `https://line.me/R/ti/p/${encodeURIComponent(c.line.id)}` : `https://line.me/R/ti/p/~${c.line.id}`), c.line.id ?? c.line.url)
        : '';
      const values = {
        'ลำดับ': n,
        'ชื่อที่พัก': clean(s.name),
        'ลิงก์หน้าเว็บ (ส่งให้เจ้าของตรวจ)': link(pageUrl(s)),
        'ข้อความพร้อมส่ง (ปกติ)': rowMessage(s),
        'ข้อความพร้อมส่ง (สั้น / ผู้สูงอายุ)': rowMessageShort(s),
        'ประเภท': TYPE[s.type],
        'เส้นทาง/พื้นที่': AREA[z.area],
        'หมู่บ้าน/โซน': z.name,
        'ที่อยู่': addr,
        'แผนที่ Google Maps': link(mapLink(s, z), s.location?.lat != null ? 'เปิดหมุด' : 'ค้นหาจากชื่อ'),
        'พิกัด': s.location?.lat != null ? `${s.location.lat}, ${s.location.lng}` : '',
        'เบอร์โทร': phones.map((p) => p.number).join('\n'),
        'ผู้รับสาย': phones.map((p) => p.name ?? '').filter(Boolean).join('\n'),
        'LINE (ประเภท)': c.line ? (c.line.type === 'oa' ? 'OA' : 'ส่วนตัว') : 'ไม่มี',
        'LINE ID / ลิงก์': lineVal,
        'เพจ Facebook': c.facebook ? link(c.facebook, c.facebookName ?? (c.facebookIsPersonal ? 'โปรไฟล์ส่วนตัว' : 'เปิดเพจ')) : '',
        'Messenger': link(c.messenger, 'เปิดแชต'),
        'Instagram / TikTok': [c.instagram, c.tiktok].filter(Boolean).join('\n'),
        'เว็บไซต์': link(c.website),
        'ราคาที่มีข้อมูล': priceText(s),
        'สถานะข้อมูล': STATUS[s.status ?? 'unconfirmed'],
        'ความน่าเชื่อถือของช่องทาง': reliability(s),
        'ช่องทางแนะนำ': bestChannel(s),
        'ข้อมูลที่ต้องขอเพิ่ม': missing(s),
        'แหล่งข้อมูล': (s.sources ?? []).map((x) => `${x.title}${x.note ? ` (${x.note})` : ''}`).join('\n'),
        'ผลการติดต่อ': 'ยังไม่ติดต่อ',
      };
      const row = ws.addRow(COLS.map(([h]) => values[h] ?? ''));
      row.outlineLevel = 2;
      row.alignment = { vertical: 'top', wrapText: true };
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = { name: FONT, size: 10, ...(cell.value?.hyperlink ? { color: { argb: 'FF0563C1' }, underline: true } : {}) };
        cell.border = border;
        if (col >= FIRST_INPUT) cell.fill = INPUT_FILL;
        else if (col <= C['ข้อความพร้อมส่ง (สั้น / ผู้สูงอายุ)'] && col >= C['ลิงก์หน้าเว็บ (ส่งให้เจ้าของตรวจ)']) cell.fill = LINK_FILL;
      });
      row.getCell(C['ชื่อที่พัก']).font = { name: FONT, size: 10, bold: true };
      row.getCell(C['ข้อความพร้อมส่ง (สั้น / ผู้สูงอายุ)']).font = { name: FONT, size: 12 };
      row.height = 88;
      stayRows.push(row.number);
    }
  }
}

const last = ws.rowCount;
const list = (header, items) => {
  for (const r of stayRows) ws.getCell(r, C[header]).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${items.join(',')}"`] };
};
const RESULTS = ['ยังไม่ติดต่อ', 'ติดต่อไม่ได้', 'รอตอบกลับ', 'ตอบรับ รอส่งข้อมูล', 'ได้ข้อมูลครบแล้ว', 'ไม่ประสงค์ลงเว็บ', 'ช่องทางผิด', 'ปิดกิจการ'];
list('ช่องทางที่ใช้', ['LINE', 'โทร', 'Messenger', 'Facebook', 'Instagram', 'ไปหาที่พัก', 'อื่น ๆ']);
list('ผลการติดต่อ', RESULTS);
for (const h of ['อนุญาตใช้ข้อมูล', 'อนุญาตใช้รูป', 'ได้รับรูปแล้ว', 'ยืนยันบัญชีรับโอน', 'ตรวจหน้าเว็บแล้ว']) list(h, ['ใช่', 'ไม่', 'รอ']);
for (const h of ['วันที่ติดต่อ', 'นัดติดตาม']) for (const r of stayRows) ws.getCell(r, C[h]).numFmt = 'dd/mm/yyyy';
ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: last, column: COLS.length } };

// ===== Sheet: ข้อความติดต่อ (หลายเวอร์ชัน) =====
const msg = wb.addWorksheet('ข้อความติดต่อ', { properties: { tabColor: { argb: 'FFEC8AA8' } } });
msg.columns = [{ width: 30 }, { width: 18 }, { width: 100 }];
const T = `${TEAM.name} · LINE ${TEAM.line}`;
const MESSAGES = [
  ['ก. ทักครั้งแรก / เชิญเข้าร่วม', 'เต็ม (ละเอียด)', `สวัสดีค่ะ/ครับ ขอรบกวนเวลาสักครู่นะคะ/ครับ

พวกเราเป็นกลุ่มคนรุ่นใหม่ที่รักดอยอ่างขาง อยากช่วยสนับสนุนการท่องเที่ยวบนดอย จึงทำเว็บไซต์ "Angkhang Today (อ่างขาง ทูเดย์)" รวมที่พักบนดอยอ่างขางและที่พักตามเส้นทางขึ้นดอย ทั้งเส้นแม่งอน (ฝาง) เส้นอรุโณทัย และเส้นบ้านใหม่หนองบัว ให้นักท่องเที่ยวหาที่พักได้ง่าย ไม่ต้องไปโพสต์ถามในกลุ่ม และติดต่อที่พักได้โดยตรง ไม่โดนเพจปลอมหลอกโอนเงิน

อยากเชิญ [ชื่อที่พัก] มาร่วมกับเราค่ะ/ครับ
- ลงข้อมูลฟรี ไม่มีค่าใช้จ่าย ไม่หักค่าคอมมิชชั่น
- ช่วยโปรโมทให้ฟรี ลูกค้าติดต่อและโอนเงินให้ที่พักโดยตรง
- ได้หน้าเว็บของที่พักเอง มีรูป ห้องพัก ราคา แผนที่ ช่องทางติดต่อครบ และค้นเจอใน Google
- ได้เครื่องหมาย "การันตีช่องทางติดต่อ" ให้ลูกค้ามั่นใจว่าเป็นที่พักจริง

เราทำหน้าตัวอย่างไว้ให้ดูแล้วที่ [ลิงก์หน้าเว็บ] รบกวนช่วยตรวจว่าข้อมูลถูกต้องไหม และถ้าสะดวกส่งข้อมูลเพิ่มเติมให้ด้วยนะคะ/ครับ ถ้าไม่ต้องการให้แสดงบนเว็บ แจ้งได้เลย เราจะนำออกให้ทันที

ขอบคุณมากค่ะ/ครับ
[ชื่อผู้ประสานงาน] · ${T}`],
  ['ก. ทักครั้งแรก / เชิญเข้าร่วม', 'กระชับ', `สวัสดีค่ะ/ครับ เราเป็นทีมคนรุ่นใหม่ทำเว็บ Angkhang Today รวมที่พักดอยอ่างขาง เพื่อช่วยโปรโมทการท่องเที่ยวบนดอย
ขอเชิญ [ชื่อที่พัก] ลงข้อมูลกับเรา ฟรีทั้งหมด ไม่หักค่าคอม ลูกค้าติดต่อที่พักโดยตรงค่ะ/ครับ
หน้าตัวอย่างของที่พัก: [ลิงก์หน้าเว็บ]
รบกวนช่วยดูว่าข้อมูลถูกต้องไหม ผิดตรงไหนแจ้งได้เลยค่ะ/ครับ ขอบคุณค่ะ/ครับ`],
  ['ก. ทักครั้งแรก / เชิญเข้าร่วม', 'สั้นมาก (ผู้สูงอายุ)', `สวัสดีค่ะ
หนูชื่อ [ชื่อ] จากเว็บ Angkhang Today ค่ะ
เราช่วยลงข้อมูลที่พักบนดอยอ่างขาง ฟรี ไม่เสียเงินค่ะ
หน้าของที่พัก: [ลิงก์หน้าเว็บ]
ข้อมูลถูกไหมคะ ผิดตรงไหนบอกได้เลยค่ะ
ขอบคุณค่ะ`],
  ['ก. ทักครั้งแรก / เชิญเข้าร่วม', 'ทางการ (รีสอร์ท / หน่วยงาน)', `เรียน ผู้จัดการ [ชื่อที่พัก]

ทีมงาน Angkhang Today (อ่างขาง ทูเดย์) จัดทำเว็บไซต์รวบรวมข้อมูลที่พักบริเวณดอยอ่างขางและเส้นทางขึ้นดอย โดยไม่มีค่าใช้จ่ายและไม่เก็บค่าคอมมิชชั่น เพื่อสนับสนุนการท่องเที่ยวในพื้นที่ และช่วยลดปัญหาเพจปลอมแอบอ้างชื่อที่พัก

ทางเราได้จัดทำหน้าข้อมูลของ [ชื่อที่พัก] จากข้อมูลสาธารณะไว้ที่ [ลิงก์หน้าเว็บ] จึงใคร่ขอความอนุเคราะห์ตรวจสอบความถูกต้อง และพิจารณาอนุญาตให้ใช้ข้อมูลและรูปภาพบนเว็บไซต์ หากไม่ประสงค์ให้เผยแพร่ ทางเรายินดีนำออกทันที

ขอแสดงความนับถือ
[ชื่อผู้ประสานงาน]
${T}`],
  ['ข. ขอให้ตรวจข้อมูลบนเว็บ', 'กระชับ', `สวัสดีค่ะ/ครับ ตอนนี้หน้าของ [ชื่อที่พัก] ขึ้นบนเว็บแล้วนะคะ/ครับ
[ลิงก์หน้าเว็บ]
รบกวนช่วยเช็กชื่อ เบอร์โทร LINE ราคา และหมุดแผนที่ว่าถูกต้องไหม ถ้าต้องแก้ตรงไหน พิมพ์บอกได้เลยค่ะ/ครับ`],
  ['ข. ขอให้ตรวจข้อมูลบนเว็บ', 'สั้นมาก (ผู้สูงอายุ)', `หน้าที่พักขึ้นเว็บแล้วค่ะ
[ลิงก์หน้าเว็บ]
ช่วยดูเบอร์โทร กับราคา ว่าถูกไหมคะ`],
  ['ค. รายการข้อมูลที่ขอ', 'เต็ม', `ข้อมูลที่อยากขอค่ะ/ครับ (ส่งเท่าที่สะดวกได้เลย)
1) ชื่อที่พัก (ไทย/อังกฤษ) และยืนยันว่ายังเปิดให้บริการ
2) ประเภทห้อง แต่ละแบบมีกี่ห้อง พักได้กี่คน เตียงแบบไหน
3) ราคาต่อคืน วันธรรมดา / วันหยุด / ช่วงปีใหม่ (รวมอาหารเช้าไหม เสริมเตียงเท่าไร)
4) เวลาเช็กอิน-เช็กเอาท์ เงื่อนไขมัดจำและการยกเลิก
5) สิ่งอำนวยความสะดวก เช่น น้ำอุ่น ฮีตเตอร์ ปิ้งย่าง/หมูกระทะได้ไหม พาสัตว์เลี้ยงได้ไหม ที่จอดรถ Wi-Fi
6) ช่องทางติดต่อที่ใช้จริง: เบอร์โทร (ชื่อผู้รับสาย), LINE (OA หรือส่วนตัว), เพจ Facebook
7) หมุด Google Maps ของที่พัก (กดแชร์ตำแหน่งมาได้เลย)
8) รูปที่พัก 5–15 รูป และรูปแต่ละห้อง พร้อมอนุญาตให้ใช้บนเว็บ (เราใส่เครดิต "ภาพจาก [ชื่อที่พัก]")
9) (ไม่บังคับ) ชื่อบัญชีรับโอน เพื่อรับเครื่องหมายการันตี — เราไม่ขอรหัสหรือข้อมูลอื่นใดเด็ดขาด`],
  ['ค. รายการข้อมูลที่ขอ', 'สั้น (5 ข้อ)', `ขอข้อมูล 5 อย่างค่ะ
1. มีห้องกี่แบบ แบบละกี่ห้อง
2. ราคาต่อคืน
3. เบอร์โทร / LINE
4. หมุดแผนที่ (แชร์ตำแหน่ง)
5. รูปที่พัก 5–10 รูป`],
  ['ง. สคริปต์โทรศัพท์', 'ปกติ', `สวัสดีค่ะ/ครับ ใช่ [ชื่อที่พัก] ไหมคะ/ครับ
ชื่อ [ชื่อ] จาก Angkhang Today ค่ะ/ครับ พวกเราเป็นกลุ่มคนรุ่นใหม่ที่ทำเว็บรวมที่พักดอยอ่างขาง ช่วยโปรโมทการท่องเที่ยวบนดอยฟรีค่ะ/ครับ
อยากขออนุญาตลงข้อมูลที่พักบนเว็บ ลงฟรี ไม่มีค่าใช้จ่าย ลูกค้าติดต่อที่พักโดยตรงค่ะ/ครับ
- ตอนนี้ยังเปิดให้บริการอยู่ไหมคะ/ครับ
- สะดวกให้ส่งรายละเอียดทาง LINE ไหมคะ/ครับ ขอ LINE หรือเพจที่ใช้ติดต่อลูกค้าได้ไหม
(ได้ LINE: ส่งข้อความ ก. กับ ค. ตามไป / ไม่สะดวก: จดข้อมูลทางโทรศัพท์ลงแท็บ "แบบฟอร์มข้อมูล")
ขอบคุณมากค่ะ/ครับ`],
  ['ง. สคริปต์โทรศัพท์', 'ผู้สูงอายุ (พูดช้า ชัด สั้น)', `สวัสดีค่ะ ใช่ [ชื่อที่พัก] ไหมคะ
หนูชื่อ [ชื่อ] ค่ะ ทำเว็บช่วยหาลูกค้าให้ที่พักบนดอยอ่างขาง
ลงให้ฟรีค่ะ ไม่เสียเงิน ไม่ต้องจ่ายอะไรเลย
ลูกค้าจะโทรหาที่พักเองโดยตรงค่ะ
ขอถามนิดเดียวนะคะ
- ตอนนี้ยังเปิดให้พักอยู่ไหมคะ
- ห้องคืนละเท่าไหร่คะ
- เบอร์นี้ใช้รับจองใช่ไหมคะ
- มีลูกหลานใช้ LINE ไหมคะ หนูจะส่งรูปหน้าเว็บไปให้ดูค่ะ
ขอบคุณมากค่ะ`],
  ['จ. ทักซ้ำ (ไม่ตอบใน 3–5 วัน)', 'กระชับ', `สวัสดีค่ะ/ครับ ขอทักมาอีกครั้งนะคะ/ครับ จาก Angkhang Today (ลงข้อมูลและโปรโมทฟรี)
ใกล้ช่วงหน้าหนาวแล้ว นักท่องเที่ยวเริ่มหาที่พักกันเยอะ ถ้า [ชื่อที่พัก] สะดวกส่งข้อมูลห้อง ราคา และรูปมา เราจะรีบอัปเดตให้ก่อนช่วงพีคค่ะ/ครับ
หน้าของที่พัก: [ลิงก์หน้าเว็บ]
ถ้าไม่สะดวก ไม่เป็นไรเลยค่ะ/ครับ ขอบคุณค่ะ/ครับ`],
  ['จ. ทักซ้ำ (ไม่ตอบใน 3–5 วัน)', 'สั้นมาก (ผู้สูงอายุ)', `สวัสดีค่ะ ทักมาอีกครั้งค่ะ
หน้าที่พักบนเว็บ (ฟรี): [ลิงก์หน้าเว็บ]
ว่างเมื่อไหร่ช่วยดูให้หน่อยนะคะ ขอบคุณค่ะ`],
  ['ฉ. ขอบคุณ / แจ้งว่าอัปเดตแล้ว', 'กระชับ', `ขอบคุณมากค่ะ/ครับ ได้รับข้อมูลแล้ว
อัปเดตหน้าเว็บของ [ชื่อที่พัก] เรียบร้อย ดูได้ที่ [ลิงก์หน้าเว็บ]
ถ้ามีเปลี่ยนราคา ห้องเต็ม หรือมีโปรโมชันช่วงหน้าหนาว ทักมาบอกได้ตลอด เราช่วยโปรโมทให้ฟรีค่ะ/ครับ`],
  ['ฉ. ขอบคุณ / แจ้งว่าอัปเดตแล้ว', 'สั้นมาก (ผู้สูงอายุ)', `ขอบคุณค่ะ แก้ข้อมูลให้แล้วนะคะ
ดูได้ที่ [ลิงก์หน้าเว็บ]`],
  ['ช. กรณีไม่ประสงค์ลงเว็บ', 'กระชับ', `รับทราบค่ะ/ครับ ขอบคุณที่สละเวลาตอบนะคะ/ครับ เราจะนำข้อมูลของ [ชื่อที่พัก] ออกจากเว็บภายใน 1–2 วัน
ถ้าเปลี่ยนใจภายหลัง ทักมาได้ตลอดค่ะ/ครับ ขอให้กิจการเติบโตนะคะ/ครับ`],
  ['ซ. ตอบข้อสงสัย "เป็นมิจฉาชีพหรือเปล่า"', 'กระชับ', `เข้าใจเลยค่ะ/ครับ ช่วงนี้มิจฉาชีพเยอะจริง ๆ
- เราไม่เก็บเงินใด ๆ ทั้งสิ้น ไม่มีค่าสมัคร ไม่มีค่าโปรโมท
- ไม่ขอรหัสผ่าน รหัส OTP เลขบัตร หรือให้กดลิงก์แปลก ๆ
- ลิงก์ของเราขึ้นต้นด้วย ${SITE_URL} เท่านั้น เปิดดูหน้าเว็บก่อนตัดสินใจได้เลย
- ถ้าไม่สะดวก ไม่ต้องตอบก็ได้ค่ะ/ครับ`],
  ['ฌ. โพสต์เชิญชวนในกลุ่ม Facebook', 'โพสต์สาธารณะ', `[ชวนเจ้าของที่พักดอยอ่างขาง ลงข้อมูลฟรี]
สวัสดีค่ะ/ครับ พวกเราเป็นกลุ่มคนรุ่นใหม่ที่รักดอยอ่างขาง ทำเว็บ Angkhang Today รวมที่พักบนดอยและตามเส้นทางขึ้นดอย (แม่งอน–ฝาง / อรุโณทัย / บ้านใหม่หนองบัว)
ให้นักท่องเที่ยวหาที่พักง่าย ติดต่อเจ้าของโดยตรง ไม่โดนเพจปลอม
- ลงข้อมูลฟรี ไม่หักค่าคอม
- ได้หน้าเว็บของที่พักเอง พร้อมแผนที่ และเครื่องหมายการันตีช่องทางติดต่อ
เจ้าของที่พักที่สนใจ คอมเมนต์ชื่อที่พัก หรือทัก LINE ${TEAM.line} ได้เลยค่ะ/ครับ
ดูเว็บ: ${SITE_URL}`],
];
const mh = msg.addRow(['ข้อความสำหรับติดต่อที่พัก — แก้ [ ... ] ก่อนส่ง', '', '']);
mh.font = { name: FONT, size: 14, bold: true, color: { argb: 'FF194F3D' } };
msg.addRow(['เวอร์ชัน "สั้นมาก (ผู้สูงอายุ)" ใช้คำง่าย ประโยคสั้น บรรทัดละเรื่อง — ส่งแบบนี้ให้เจ้าของที่พักที่อายุมาก หรือไม่ถนัดอ่านข้อความยาว', '', '']).font = { name: FONT, size: 10, italic: true, color: { argb: 'FF808080' } };
const mhead = msg.addRow(['ใช้เมื่อ', 'เวอร์ชัน', 'ข้อความ']);
mhead.eachCell((cell) => {
  cell.font = { name: FONT, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = HEAD_FILL;
  cell.border = border;
});
let prev = '';
for (const [purpose, version, body] of MESSAGES) {
  const elderly = version.includes('ผู้สูงอายุ');
  const r = msg.addRow([purpose === prev ? '' : purpose, version, body]);
  prev = purpose;
  r.alignment = { vertical: 'top', wrapText: true };
  r.getCell(1).font = { name: FONT, size: 11, bold: true, color: { argb: 'FF194F3D' } };
  r.getCell(2).font = { name: FONT, size: 10, bold: elderly, color: { argb: elderly ? 'FFC64B75' : 'FF404040' } };
  r.getCell(3).font = { name: FONT, size: elderly ? 14 : 11 };
  r.height = Math.min(409, (elderly ? 22 : 17) * body.split('\n').length + 16 + (body.length > 300 ? 40 : 0));
  r.eachCell({ includeEmpty: true }, (cell) => (cell.border = border));
  if (elderly) r.getCell(3).fill = fill('FFFDF1F5');
}

// ===== Sheet: ที่พักใหม่ (พบจากกลุ่ม FB / ป้าย / คนในพื้นที่) =====
const nw = wb.addWorksheet('ที่พักใหม่', { properties: { tabColor: { argb: 'FFF4B183' } }, views: [{ state: 'frozen', ySplit: 2 }] });
const NEW_COLS = [
  ['ชื่อที่พัก', 26], ['เส้นทาง/พื้นที่', 22], ['หมู่บ้าน', 16], ['พบจาก', 16], ['ลิงก์โพสต์ / เพจ', 30], ['เบอร์โทร', 16], ['LINE (OA/ส่วนตัว + ID)', 20],
  ['ราคาที่เห็น', 14], ['วันที่โพสต์', 12], ['ซ้ำกับรายชื่อเดิมไหม', 14], ['ผู้บันทึก', 14], ['หมายเหตุ', 30],
];
nw.mergeCells(1, 1, 1, NEW_COLS.length);
nw.getCell(1, 1).value = 'จดที่พักที่ยังไม่มีในรายชื่อ — ค้นในกลุ่ม Facebook ที่พักดอยอ่างขาง ด้วยคำว่า "ห้องว่าง", "รับจอง", "โฮมสเตย์", "ลานกางเต็นท์", ชื่อหมู่บ้าน แล้วจดเฉพาะโพสต์ของที่พักเอง (ไม่จดข้อมูลส่วนตัวของสมาชิกทั่วไป)';
nw.getCell(1, 1).font = { name: FONT, size: 10, italic: true, color: { argb: 'FF404040' } };
nw.getCell(1, 1).alignment = { wrapText: true, vertical: 'middle' };
nw.getRow(1).height = 34;
const nwHead = nw.getRow(2);
NEW_COLS.forEach(([h, w], i) => {
  nw.getColumn(i + 1).width = w;
  const cell = nwHead.getCell(i + 1);
  cell.value = h;
  cell.font = { name: FONT, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = INPUT_HEAD_FILL;
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = border;
});
nwHead.height = 34;
for (let r = 3; r <= 102; r++) {
  for (let col = 1; col <= NEW_COLS.length; col++) {
    const cell = nw.getCell(r, col);
    cell.fill = INPUT_FILL;
    cell.border = border;
    cell.font = { name: FONT, size: 10 };
  }
  nw.getCell(r, 2).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${Object.values(AREA).join(',')}"`] };
  nw.getCell(r, 4).dataValidation = { type: 'list', allowBlank: true, formulae: ['"กลุ่ม Facebook,เพจ Facebook,Google Maps,ป้ายหน้าที่พัก,คนในพื้นที่,อื่น ๆ"'] };
  nw.getCell(r, 10).dataValidation = { type: 'list', allowBlank: true, formulae: ['"ใหม่,ซ้ำ,ไม่แน่ใจ"'] };
  nw.getCell(r, 9).numFmt = 'dd/mm/yyyy';
}

// ===== Sheet: แบบฟอร์มข้อมูล =====
const form = wb.addWorksheet('แบบฟอร์มข้อมูล', { properties: { tabColor: { argb: 'FFAFD5C0' } }, views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
const FORM = [
  ['ชื่อที่พัก (ตรงกับแท็บรายชื่อ)', 28], ['ยังเปิดให้บริการ', 12], ['ชื่ออังกฤษ', 22], ['ประเภทห้อง 1: ชื่อ / จำนวนห้อง / พักได้ / เตียง', 34],
  ['ห้อง 1: ราคา ธรรมดา / วันหยุด / ปีใหม่', 26], ['ประเภทห้อง 2', 30], ['ห้อง 2: ราคา', 22], ['ประเภทห้อง 3', 30], ['ห้อง 3: ราคา', 22],
  ['รวมอาหารเช้า / เสริมเตียง', 22], ['เช็กอิน / เช็กเอาท์', 16], ['มัดจำ / การยกเลิก', 28], ['สิ่งอำนวยความสะดวก', 34],
  ['เบอร์โทร + ชื่อผู้รับสาย', 26], ['LINE (OA/ส่วนตัว + ID)', 22], ['เพจ Facebook (ลิงก์)', 26], ['หมุด Google Maps (ลิงก์)', 26],
  ['ลิงก์โฟลเดอร์รูป (Drive/LINE)', 26], ['ชื่อบัญชีรับโอน', 22], ['ผู้บันทึก / วันที่', 18],
];
form.columns = FORM.map(([header, width]) => ({ header, width }));
form.getRow(1).eachCell((cell) => {
  cell.font = { name: FONT, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = INPUT_HEAD_FILL;
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = border;
});
form.getRow(1).height = 48;
const example = form.addRow([
  'ตัวอย่าง: ยูนนานโฮมสเตย์', 'ใช่', 'Yunnan Home Stay', 'ห้องเตียงเดี่ยว / 4 ห้อง / 1–2 คน / เตียง 5 ฟุต', '600 / 600 / 800',
  'ห้องเตียงคู่ / 3 ห้อง / 3–4 คน / เตียง 5 ฟุต ×2', '1,000 / 1,000 / 1,200', '', '', 'รวมอาหารเช้า / เสริมเตียง 200', '14:00 / 11:00',
  'มัดจำ 50% / ยกเลิกก่อน 7 วันคืนมัดจำ', 'น้ำอุ่น, Wi-Fi, ที่จอดรถ', '062-426-6052 (เจ๊หอม)', 'OA @579lmqrb', 'facebook.com/…', 'maps.app.goo.gl/…',
  'drive.google.com/…', '(ชื่อบัญชี)', 'น้องเอ 12/11/2026',
]);
example.font = { name: FONT, size: 10, italic: true, color: { argb: 'FF808080' } };
example.alignment = { vertical: 'top', wrapText: true };
form.addRow(['↑ แถวตัวอย่าง (ตัวเลขห้อง/ราคาในแถวนี้เป็นค่าสมมติ) — เริ่มกรอกจริงตั้งแต่แถวถัดไป']).font = { name: FONT, size: 9, color: { argb: 'FFC64B75' } };
for (let r = 4; r <= 4 + STAYS.length; r++) {
  const row = form.getRow(r);
  for (let col = 1; col <= FORM.length; col++) {
    const cell = row.getCell(col);
    cell.fill = INPUT_FILL;
    cell.border = border;
    cell.font = { name: FONT, size: 10 };
    cell.alignment = { vertical: 'top', wrapText: true };
  }
  row.getCell(2).dataValidation = { type: 'list', allowBlank: true, formulae: ['"ใช่,ไม่,ไม่แน่ใจ"'] };
}

// ===== Sheet: สรุป =====
const sum = wb.addWorksheet('สรุป', { properties: { tabColor: { argb: 'FF2F7A57' } } });
sum.columns = [{ width: 36 }, { width: 14 }, { width: 16 }];
const R = `'รายชื่อที่พัก'`;
const rng = (h) => `${R}!$${L(h)}$2:$${L(h)}$${last}`;
const addSum = (vals, bold = false) => {
  const r = sum.addRow(vals);
  r.font = { name: FONT, size: 11, bold };
  r.eachCell((cell) => (cell.border = border));
  return r;
};
sum.addRow(['สรุปความคืบหน้าการติดต่อ']).font = { name: FONT, size: 14, bold: true, color: { argb: 'FF194F3D' } };
sum.addRow([]);
addSum(['ผลการติดต่อ', 'จำนวน', 'สัดส่วน'], true);
const startRow = sum.rowCount + 1;
const totalRowNo = startRow + RESULTS.length;
for (const name of RESULTS) {
  const r = sum.rowCount + 1;
  addSum([name, { formula: `COUNTIF(${rng('ผลการติดต่อ')},A${r})` }, { formula: `IF($B$${totalRowNo}=0,0,B${r}/$B$${totalRowNo})` }]);
  sum.getCell(`C${r}`).numFmt = '0.0%';
}
addSum(['รวมทั้งหมด', { formula: `SUM(B${startRow}:B${totalRowNo - 1})` }, ''], true);
sum.addRow([]);
addSum(['เจ้าของตรวจหน้าเว็บแล้ว', { formula: `COUNTIF(${rng('ตรวจหน้าเว็บแล้ว')},"ใช่")` }, '']);
addSum(['อนุญาตใช้รูปแล้ว', { formula: `COUNTIF(${rng('อนุญาตใช้รูป')},"ใช่")` }, '']);
addSum(['ได้รับรูปแล้ว', { formula: `COUNTIF(${rng('ได้รับรูปแล้ว')},"ใช่")` }, '']);
addSum(['ยืนยันบัญชีรับโอน (พร้อมการันตี)', { formula: `COUNTIF(${rng('ยืนยันบัญชีรับโอน')},"ใช่")` }, '']);
sum.addRow([]);
addSum(['ตามเส้นทาง/พื้นที่', 'ที่พัก', 'ได้ข้อมูลครบ'], true);
for (const a of AREA_ORDER) {
  const r = sum.rowCount + 1;
  addSum([AREA[a], { formula: `COUNTIF(${rng('เส้นทาง/พื้นที่')},A${r})` }, { formula: `COUNTIFS(${rng('เส้นทาง/พื้นที่')},A${r},${rng('ผลการติดต่อ')},"ได้ข้อมูลครบแล้ว")` }]);
}
sum.addRow([]);
addSum(['ช่องทางที่มีในข้อมูลปัจจุบัน', 'จำนวน', ''], true);
addSum(['มีเบอร์โทร', { formula: `COUNTIF(${rng('เบอร์โทร')},"?*")` }, '']);
addSum(['มี LINE', { formula: `COUNTIF(${rng('LINE (ประเภท)')},"OA")+COUNTIF(${rng('LINE (ประเภท)')},"ส่วนตัว")` }, '']);
addSum(['ไม่มีช่องทางติดต่อเลย', { formula: `COUNTIF(${rng('ช่องทางแนะนำ')},"ยังไม่มีช่องทาง*")` }, '']);
addSum(['ที่พักใหม่ที่จดเพิ่ม (แท็บ "ที่พักใหม่")', { formula: `COUNTA('ที่พักใหม่'!$A$3:$A$102)` }, '']);

// ลำดับแท็บ: วิธีใช้ > รายชื่อ > ข้อความ > ที่พักใหม่ > แบบฟอร์ม > สรุป
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await wb.xlsx.writeFile(OUT);
console.log(`สร้าง ${path.relative(root, OUT)} (${sorted.length} ที่พัก, ${MESSAGES.length} ข้อความ)`);
