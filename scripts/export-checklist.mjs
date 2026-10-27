// สร้างไฟล์ Excel เช็กลิสต์สำหรับทีมประสานงานติดต่อที่พัก
// ใช้: node scripts/export-checklist.mjs   -> docs/angkhang-contact-checklist.xlsx
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { STAYS } from './real-stays.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const ExcelJS = require('exceljs');

const SITE_URL = 'https://www.angkhang.today';
const OUT = path.join(root, 'docs', 'angkhang-contact-checklist.xlsx');
const FONT = 'Tahoma';

const zones = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(root, 'src/data/zones.json'), 'utf8')).map((z) => [z.id, z]));
const AREA = {
  top: 'บนดอยอ่างขาง',
  r1249: 'เส้น ทล.1249 แม่งอน (ฝาง)',
  r1178: 'เส้น ทล.1178 อรุโณทัย',
  rnongbua: 'เส้นบ้านใหม่หนองบัว (ไชยปราการ)',
};
const TYPE = { resort: 'รีสอร์ท', hotel: 'โรงแรม', homestay: 'โฮมสเตย์', guesthouse: 'บ้านพัก/เกสต์เฮาส์', cabin: 'บ้านไม้/บังกะโล', house: 'บ้านทั้งหลัง', tent: 'ลานกางเต็นท์' };
const STATUS = { open: 'ยืนยันแล้วว่าเปิด', listed: 'พบบนเว็บจอง ต.ค. 2026', unconfirmed: 'ข้อมูลเก่า ยังไม่ยืนยัน' };

const clean = (n) => n.replace(/\s*\(ตัวอย่าง\)\s*/g, '').trim();
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
  return 'ยังไม่มีช่องทาง — ค้นใน Google Maps / Facebook';
}

const link = (url, text) => (url ? { text: text ?? url, hyperlink: url } : '');
const mapLink = (s, z) =>
  s.location?.lat != null
    ? `https://www.google.com/maps/search/?api=1&query=${s.location.lat},${s.location.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([clean(s.name), z.name, z.district && 'อ.' + z.district, 'เชียงใหม่'].filter(Boolean).join(' '))}`;

// ---------------- workbook ----------------
const wb = new ExcelJS.Workbook();
wb.creator = 'Angkhang Today';
wb.created = new Date();
wb.calcProperties.fullCalcOnLoad = true;

const HEAD_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D523D' } };
const INPUT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
const INPUT_HEAD_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC64B75' } };
const border = { top: { style: 'thin', color: { argb: 'FFD9D9D9' } }, bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } }, left: { style: 'thin', color: { argb: 'FFD9D9D9' } }, right: { style: 'thin', color: { argb: 'FFD9D9D9' } } };

// ===== Sheet 1: วิธีใช้ =====
const guide = wb.addWorksheet('วิธีใช้', { properties: { tabColor: { argb: 'FF1D523D' } } });
guide.columns = [{ width: 26 }, { width: 100 }];
const g = [
  ['เช็กลิสต์ติดต่อที่พัก Angkhang Today', ''],
  ['สร้างเมื่อ', new Date().toLocaleDateString('en-GB')],
  ['จำนวนที่พัก', STAYS.length],
  ['', ''],
  ['ขั้นตอน', '1) เปิดแท็บ "รายชื่อที่พัก" กรองตาม "ผู้ประสานงาน" หรือ "เส้นทาง/พื้นที่"'],
  ['', '2) ติดต่อตาม "ช่องทางแนะนำ" โดยใช้ข้อความในแท็บ "ข้อความติดต่อ"'],
  ['', '3) กรอกช่องสีเหลือง (ผู้ประสานงาน, วันที่, ผลการติดต่อ ฯลฯ) หลังติดต่อทุกครั้ง'],
  ['', '4) ข้อมูลที่ได้มา จดในแท็บ "แบบฟอร์มข้อมูล" (1 แถวต่อ 1 ที่พัก) แล้วส่งให้ทีมเว็บอัปเดต'],
  ['', '5) ดูภาพรวมความคืบหน้าในแท็บ "สรุป"'],
  ['', ''],
  ['ช่องที่ต้องกรอก', 'เฉพาะคอลัมน์หัวสีชมพู / ช่องพื้นเหลือง เท่านั้น — คอลัมน์หัวสีเขียวเป็นข้อมูลจากเว็บ ห้ามแก้ (ถ้าข้อมูลผิด ให้เขียนใน "หมายเหตุ")'],
  ['ตัวอย่างการกรอก', 'ผู้ประสานงาน: น้องเอ | ช่องทางที่ใช้: LINE | วันที่ติดต่อ: 26/10/2026 | ผลการติดต่อ: รอตอบกลับ | อนุญาตใช้รูป: รอ | นัดติดตาม: 28/10/2026'],
  ['', ''],
  ['ข้อควรระวัง', 'ช่องทางติดต่อรวบรวมจากแหล่งสาธารณะ ยังไม่ได้ยืนยันทุกแห่ง — ดูคอลัมน์ "ความน่าเชื่อถือของช่องทาง"'],
  ['', 'ถ้าเบอร์/เพจไม่ใช่ของที่พักจริง หรือที่พักปิดกิจการแล้ว ให้เลือกผล "ช่องทางผิด" หรือ "ปิดกิจการ" และจดช่องทางที่ถูกต้องในหมายเหตุ'],
  ['', 'ห้ามขอหรือรับโอนเงินใด ๆ จากที่พัก — การลงข้อมูลและโปรโมทฟรีทั้งหมด'],
  ['', 'ถ้าที่พักไม่ต้องการให้แสดงบนเว็บ ให้เลือก "ไม่ประสงค์ลงเว็บ" ทีมเว็บจะนำออก'],
];
g.forEach((r, i) => {
  const row = guide.addRow(r);
  row.font = { name: FONT, size: 11, bold: i === 0 || !!r[0] };
  row.alignment = { vertical: 'top', wrapText: true };
});
guide.getRow(1).font = { name: FONT, size: 16, bold: true, color: { argb: 'FF1D523D' } };

// ===== Sheet 2: รายชื่อที่พัก =====
const ws = wb.addWorksheet('รายชื่อที่พัก', { properties: { tabColor: { argb: 'FFC64B75' } }, views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] });
const COLS = [
  // ข้อมูลจากเว็บ
  ['ลำดับ', 6], ['ชื่อที่พัก', 30], ['ชื่ออังกฤษ', 24], ['ประเภท', 14], ['เส้นทาง/พื้นที่', 22], ['หมู่บ้าน/โซน', 18], ['ที่อยู่', 30],
  ['แผนที่ Google Maps', 16], ['พิกัด', 18], ['เบอร์โทร', 22], ['ผู้รับสาย', 22], ['LINE (ประเภท)', 12], ['LINE ID / ลิงก์', 22],
  ['เพจ Facebook', 22], ['Messenger', 14], ['Instagram / TikTok', 18], ['เว็บไซต์', 18], ['ราคาที่มีข้อมูล', 16], ['สถานะข้อมูล', 20],
  ['ความน่าเชื่อถือของช่องทาง', 26], ['ช่องทางแนะนำ', 18], ['ข้อมูลที่ต้องขอเพิ่ม', 44], ['หน้าเว็บของเรา', 18], ['แหล่งข้อมูล', 30],
  // ทีมประสานงานกรอก
  ['ผู้ประสานงาน', 16], ['ช่องทางที่ใช้', 14], ['วันที่ติดต่อ', 13], ['ผลการติดต่อ', 20], ['อนุญาตใช้ข้อมูล', 14], ['อนุญาตใช้รูป', 13],
  ['ได้รับรูปแล้ว', 12], ['ยืนยันบัญชีรับโอน', 14], ['ช่องทางที่ถูกต้อง (ถ้าต่างจากเดิม)', 28], ['นัดติดตาม', 13], ['หมายเหตุ', 34],
];
const FIRST_INPUT = 25;
ws.columns = COLS.map(([header, width]) => ({ header, width }));
const head = ws.getRow(1);
head.height = 36;
head.eachCell((cell, col) => {
  cell.font = { name: FONT, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = col >= FIRST_INPUT ? INPUT_HEAD_FILL : HEAD_FILL;
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = border;
});

const order = { top: 0, r1249: 1, r1178: 2, rnongbua: 3 };
const sorted = [...STAYS].sort(
  (a, b) => order[zones[a.zone].area] - order[zones[b.zone].area] || zones[a.zone].order - zones[b.zone].order || clean(a.name).localeCompare(clean(b.name), 'th'),
);

sorted.forEach((s, i) => {
  const z = zones[s.zone];
  const c = s.contacts ?? {};
  const phones = c.phones ?? [];
  const addr = [s.location?.address ?? z.name, z.subdistrict && `ต.${z.subdistrict}`, z.district && `อ.${z.district}`, 'จ.เชียงใหม่'].filter(Boolean).join(' ');
  const lineVal = c.line ? link(c.line.url ?? (c.line.type === 'oa' ? `https://line.me/R/ti/p/${encodeURIComponent(c.line.id)}` : `https://line.me/R/ti/p/~${c.line.id}`), c.line.id ?? c.line.url) : '';
  const social = [c.instagram, c.tiktok].filter(Boolean).join('\n');
  const row = ws.addRow([
    i + 1,
    clean(s.name),
    s.nameEn ?? '',
    TYPE[s.type],
    AREA[z.area],
    z.name,
    addr,
    link(mapLink(s, z), s.location?.lat != null ? 'เปิดหมุด' : 'ค้นหาจากชื่อ'),
    s.location?.lat != null ? `${s.location.lat}, ${s.location.lng}` : '',
    phones.map((p) => p.number).join('\n'),
    phones.map((p) => p.name ?? '').filter(Boolean).join('\n'),
    c.line ? (c.line.type === 'oa' ? 'OA' : 'ส่วนตัว') : 'ไม่มี',
    lineVal,
    c.facebook ? link(c.facebook, c.facebookName ?? (c.facebookIsPersonal ? 'โปรไฟล์ส่วนตัว' : 'เปิดเพจ')) : '',
    link(c.messenger, 'เปิดแชต'),
    social,
    link(c.website),
    priceText(s),
    STATUS[s.status ?? 'unconfirmed'],
    reliability(s),
    bestChannel(s),
    missing(s),
    link(`${SITE_URL}/stays/${s.slug}`, s.slug),
    (s.sources ?? []).map((x) => `${x.title}${x.note ? ` (${x.note})` : ''}`).join('\n'),
    '', '', '', 'ยังไม่ติดต่อ', '', '', '', '', '', '', '',
  ]);
  row.alignment = { vertical: 'top', wrapText: true };
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.font = { name: FONT, size: 10, ...(cell.value?.hyperlink ? { color: { argb: 'FF0563C1' }, underline: true } : {}) };
    cell.border = border;
    if (col >= FIRST_INPUT) cell.fill = INPUT_FILL;
  });
  if (i % 2 === 1)
    for (let col = 1; col < FIRST_INPUT; col++) ws.getCell(row.number, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7F6' } };
});

const last = sorted.length + 1;
const list = (col, items) => {
  for (let r = 2; r <= last; r++) ws.getCell(r, col).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${items.join(',')}"`] };
};
list(26, ['LINE', 'โทร', 'Messenger', 'Facebook', 'Instagram', 'ไปหาที่พัก', 'อื่น ๆ']);
list(28, ['ยังไม่ติดต่อ', 'ติดต่อไม่ได้', 'รอตอบกลับ', 'ตอบรับ รอส่งข้อมูล', 'ได้ข้อมูลครบแล้ว', 'ไม่ประสงค์ลงเว็บ', 'ช่องทางผิด', 'ปิดกิจการ']);
for (const col of [29, 30, 31, 32]) list(col, ['ใช่', 'ไม่', 'รอ']);
for (const col of [27, 34]) for (let r = 2; r <= last; r++) ws.getCell(r, col).numFmt = 'dd/mm/yyyy';
ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: last, column: COLS.length } };

// ===== Sheet 3: สรุป =====
const sum = wb.addWorksheet('สรุป', { properties: { tabColor: { argb: 'FF2F7A57' } } });
sum.columns = [{ width: 34 }, { width: 14 }, { width: 14 }];
const R = `'รายชื่อที่พัก'`;
const addSum = (vals, bold = false) => {
  const r = sum.addRow(vals);
  r.font = { name: FONT, size: 11, bold };
  r.eachCell((cell) => (cell.border = border));
  return r;
};
sum.addRow(['สรุปความคืบหน้าการติดต่อ']).font = { name: FONT, size: 14, bold: true, color: { argb: 'FF1D523D' } };
sum.addRow([]);
addSum(['ผลการติดต่อ', 'จำนวน', 'สัดส่วน'], true);
const results = ['ยังไม่ติดต่อ', 'ติดต่อไม่ได้', 'รอตอบกลับ', 'ตอบรับ รอส่งข้อมูล', 'ได้ข้อมูลครบแล้ว', 'ไม่ประสงค์ลงเว็บ', 'ช่องทางผิด', 'ปิดกิจการ'];
const startRow = sum.rowCount + 1;
results.forEach((name) => {
  const r = sum.rowCount + 1;
  addSum([name, { formula: `COUNTIF(${R}!$AB$2:$AB$${last},A${r})` }, { formula: `IF($B$${startRow + results.length}=0,0,B${r}/$B$${startRow + results.length})` }]);
  sum.getCell(`C${r}`).numFmt = '0.0%';
});
const totalRow = sum.rowCount + 1;
addSum(['รวมทั้งหมด', { formula: `SUM(B${startRow}:B${totalRow - 1})` }, ''], true);
sum.addRow([]);
addSum(['อนุญาตใช้รูปแล้ว', { formula: `COUNTIF(${R}!$AD$2:$AD$${last},"ใช่")` }, ''], false);
addSum(['ได้รับรูปแล้ว', { formula: `COUNTIF(${R}!$AE$2:$AE$${last},"ใช่")` }, ''], false);
addSum(['ยืนยันบัญชีรับโอน (พร้อมการันตี)', { formula: `COUNTIF(${R}!$AF$2:$AF$${last},"ใช่")` }, ''], false);
sum.addRow([]);
addSum(['ตามเส้นทาง/พื้นที่', 'ที่พัก', 'ได้ข้อมูลครบ'], true);
for (const a of Object.values(AREA)) {
  const r = sum.rowCount + 1;
  addSum([a, { formula: `COUNTIF(${R}!$E$2:$E$${last},A${r})` }, { formula: `COUNTIFS(${R}!$E$2:$E$${last},A${r},${R}!$AB$2:$AB$${last},"ได้ข้อมูลครบแล้ว")` }]);
}
sum.addRow([]);
addSum(['ช่องทางที่มีในข้อมูลปัจจุบัน', 'จำนวน', ''], true);
addSum(['มีเบอร์โทร', { formula: `COUNTIF(${R}!$J$2:$J$${last},"?*")` }, '']);
addSum(['มี LINE', { formula: `COUNTIF(${R}!$L$2:$L${last},"OA")+COUNTIF(${R}!$L$2:$L${last},"ส่วนตัว")` }, '']);
addSum(['ไม่มีช่องทางติดต่อเลย', { formula: `COUNTIF(${R}!$U$2:$U$${last},"ยังไม่มีช่องทาง*")` }, '']);

// ===== Sheet 4: ข้อความติดต่อ =====
const msg = wb.addWorksheet('ข้อความติดต่อ', { properties: { tabColor: { argb: 'FFEC8AA8' } } });
msg.columns = [{ width: 26 }, { width: 110 }];
const MESSAGES = [
  [
    '1. ทักครั้งแรก (LINE / Messenger)',
    `สวัสดีค่ะ/ครับ ขอรบกวนเวลาสักครู่นะคะ/ครับ 🙏

พวกเราเป็นกลุ่มคนรุ่นใหม่ที่รักดอยอ่างขาง กำลังทำเว็บไซต์ "Angkhang Today (อ่างขาง ทูเดย์)" รวมที่พักบนดอยอ่างขางและที่พักตามเส้นทางขึ้นดอย ทั้งเส้นแม่งอน (ฝาง) เส้นอรุโณทัย และเส้นบ้านใหม่หนองบัว เพื่อช่วยให้นักท่องเที่ยวหาที่พักได้ง่าย ไม่ต้องไปโพสต์หาในกลุ่ม และติดต่อที่พักได้ตรง ไม่โดนเพจปลอมหลอกโอนเงิน

เราอยากขออนุญาตลงข้อมูลของ [ชื่อที่พัก] บนเว็บค่ะ/ครับ
✅ ลงข้อมูลฟรี ไม่มีค่าใช้จ่าย ไม่หักค่าคอมมิชชั่น
✅ ช่วยโปรโมทฟรี ลูกค้าติดต่อและโอนเงินให้ที่พักโดยตรง
✅ ได้หน้าเว็บของที่พักเอง มีรูป ห้องพัก ราคา แผนที่ และช่องทางติดต่อครบ ค้นเจอใน Google
✅ ได้เครื่องหมาย "การันตีช่องทางติดต่อ" ให้ลูกค้ามั่นใจว่าเป็นที่พักจริง

ตอนนี้เราทำหน้าตัวอย่างไว้ให้ดูแล้วที่ [ลิงก์หน้าเว็บของเรา] ถ้าสะดวก รบกวนช่วยตรวจและส่งข้อมูลที่ถูกต้องให้หน่อยนะคะ/ครับ (รายการด้านล่าง) ถ้าไม่สะดวกลงเว็บ แจ้งได้เลย เราจะนำออกให้ทันทีค่ะ/ครับ

ขอบคุณมากค่ะ/ครับ
[ชื่อผู้ประสานงาน] · Angkhang Today · LINE [@angkhangtoday] · โทร [เบอร์ทีม]`,
  ],
  [
    '2. รายการข้อมูลที่ขอ (ส่งต่อจากข้อความแรก)',
    `ข้อมูลที่อยากขอค่ะ/ครับ (ส่งเท่าที่สะดวกได้เลย)
1) ชื่อที่พัก (ไทย/อังกฤษ) และยืนยันว่ายังเปิดให้บริการ
2) ประเภทห้อง แต่ละแบบมีกี่ห้อง พักได้กี่คน เตียงแบบไหน
3) ราคาต่อคืน วันธรรมดา / วันหยุด / ช่วงปีใหม่ (รวมอาหารเช้าไหม เสริมเตียงเท่าไร)
4) เวลาเช็กอิน-เช็กเอาท์ เงื่อนไขมัดจำและการยกเลิก
5) สิ่งอำนวยความสะดวก เช่น น้ำอุ่น ฮีตเตอร์ ปิ้งย่าง/หมูกระทะได้ไหม พาสัตว์เลี้ยงได้ไหม ที่จอดรถ Wi-Fi
6) ช่องทางติดต่อที่ใช้จริง: เบอร์โทร (ชื่อผู้รับสาย), LINE (OA หรือส่วนตัว), เพจ Facebook
7) หมุด Google Maps ของที่พัก (กดแชร์ตำแหน่งมาได้เลย)
8) รูปที่พัก 5–15 รูป และรูปแต่ละห้อง (แนวนอน) พร้อมอนุญาตให้ใช้บนเว็บ โดยเราใส่เครดิต "ภาพจาก [ชื่อที่พัก]"
9) (ไม่บังคับ) ชื่อบัญชีรับโอน เพื่อรับเครื่องหมายการันตี ป้องกันเพจปลอมแอบอ้าง — เราไม่ขอรหัสหรือข้อมูลอื่นใดเด็ดขาด`,
  ],
  [
    '3. สคริปต์โทรศัพท์',
    `สวัสดีค่ะ/ครับ ใช่ [ชื่อที่พัก] ไหมคะ/ครับ
ชื่อ [ชื่อ] จาก Angkhang Today ค่ะ/ครับ พวกเราเป็นกลุ่มคนรุ่นใหม่ที่ทำเว็บรวมที่พักดอยอ่างขาง ช่วยโปรโมทการท่องเที่ยวบนดอยฟรีค่ะ/ครับ
อยากขออนุญาตลงข้อมูลที่พักบนเว็บ ลงฟรี ไม่มีค่าใช้จ่าย ลูกค้าติดต่อที่พักโดยตรงค่ะ/ครับ
- ตอนนี้ยังเปิดให้บริการอยู่ไหมคะ/ครับ
- สะดวกให้ส่งรายละเอียดทาง LINE ไหมคะ/ครับ ขอ LINE หรือเพจที่ใช้ติดต่อลูกค้าได้ไหม
(ถ้าได้ LINE: ส่งข้อความที่ 1 และ 2 ตามไปทันที / ถ้าไม่สะดวก: จดข้อมูลทางโทรศัพท์ลงแท็บ "แบบฟอร์มข้อมูล")
ขอบคุณมากค่ะ/ครับ`,
  ],
  [
    '4. ทักซ้ำ (ไม่ตอบใน 3–5 วัน)',
    `สวัสดีค่ะ/ครับ ขอทักมาอีกครั้งนะคะ/ครับ จาก Angkhang Today เว็บรวมที่พักดอยอ่างขาง (ลงข้อมูลและโปรโมทฟรี)
ใกล้ช่วงหน้าหนาวแล้ว นักท่องเที่ยวเริ่มหาที่พักกันเยอะ ถ้า [ชื่อที่พัก] สะดวกส่งข้อมูลห้องพัก ราคา และรูปมา เราจะรีบขึ้นหน้าเว็บให้ก่อนช่วงพีคค่ะ/ครับ
หน้าตัวอย่าง: [ลิงก์หน้าเว็บของเรา]
ถ้าไม่สะดวก ไม่เป็นไรเลยค่ะ/ครับ ขอบคุณมากค่ะ/ครับ 🙏`,
  ],
  [
    '5. ขอบคุณหลังได้ข้อมูล',
    `ขอบคุณมากค่ะ/ครับ ได้รับข้อมูลและรูปแล้ว 🙏
เราจะอัปเดตหน้าเว็บของ [ชื่อที่พัก] ภายใน [จำนวน] วัน แล้วส่งลิงก์ให้ตรวจอีกครั้งก่อนเผยแพร่นะคะ/ครับ
ถ้ามีการเปลี่ยนราคา ห้องเต็ม หรือมีโปรโมชันช่วงหน้าหนาว ทักมาบอกได้ตลอด เราช่วยโปรโมทให้ฟรีค่ะ/ครับ`,
  ],
  [
    '6. กรณีที่พักไม่ประสงค์ลงเว็บ',
    `รับทราบค่ะ/ครับ ขอบคุณที่สละเวลาตอบนะคะ/ครับ เราจะนำข้อมูลของ [ชื่อที่พัก] ออกจากเว็บภายใน 1–2 วัน
ถ้าเปลี่ยนใจภายหลัง ทักมาได้ตลอดค่ะ/ครับ ขอให้กิจการเติบโตนะคะ/ครับ 🙏`,
  ],
];
const mh = msg.addRow(['ข้อความสำหรับติดต่อที่พัก (แก้ [ ... ] ก่อนส่ง)', '']);
mh.font = { name: FONT, size: 14, bold: true, color: { argb: 'FF1D523D' } };
msg.addRow([]);
for (const [title, body] of MESSAGES) {
  const r = msg.addRow([title, body]);
  r.font = { name: FONT, size: 11 };
  r.getCell(1).font = { name: FONT, size: 11, bold: true, color: { argb: 'FF1D523D' } };
  r.alignment = { vertical: 'top', wrapText: true };
  r.height = Math.min(409, 16 * body.split('\n').length + 24);
  r.eachCell((cell) => (cell.border = border));
  msg.addRow([]);
}

// ===== Sheet 5: แบบฟอร์มข้อมูล =====
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
  'drive.google.com/…', '(ชื่อบัญชี)', 'น้องเอ 26/10/2026',
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

fs.mkdirSync(path.dirname(OUT), { recursive: true });
await wb.xlsx.writeFile(OUT);
console.log(`สร้าง ${path.relative(root, OUT)} (${sorted.length} ที่พัก)`);
