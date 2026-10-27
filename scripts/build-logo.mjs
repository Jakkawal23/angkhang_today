// โลโก้ Angkhang Today — สร้างทุกไฟล์จากสัญลักษณ์ชิ้นเดียวกัน
// ใช้: npm run logo  (node scripts/build-logo.mjs) -> public/brand/*.svg, *.png และ favicon
//
// สัญลักษณ์มาจากไฟล์ออกแบบของเจ้าของแบรนด์ (Canva) ที่ trace เป็นเวกเตอร์แล้ว: src/data/logo-traced.json
// ถ้าแก้แบบโลโก้ใหม่: node scripts/trace-logo.mjs "<ไฟล์สัญลักษณ์ใหม่>" แล้วรัน npm run logo
//
// คอนเซปต์: โล่ (น่าเชื่อถือ) + ภูเขาที่สันเขาตวัดเป็นเครื่องหมายถูกทะลุโล่ (ตรวจสอบแล้ว / ก้าวไปข้างหน้า)
//          + เส้นหมอก + ถนนคดเคี้ยวขึ้นดอย (การหา/การเดินทาง) + ดวงอาทิตย์ชมพู (Today/อนาคต)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const opentype = require('opentype.js');
const sharp = require('sharp');

const OUT = path.join(root, 'public/brand');
fs.mkdirSync(OUT, { recursive: true });

const T = JSON.parse(fs.readFileSync(path.join(root, 'src/data/logo-traced.json'), 'utf8'));
const C = { pine: T.green.color, sakura: T.pink.color, white: '#FFFFFF', sakuraLight: '#F4B6CA' };
const font = opentype.loadSync(path.join(root, 'node_modules/@fontsource/nunito/files/nunito-latin-800-normal.woff'));

// ---------- สัญลักษณ์ (ระบบพิกัดของภาพที่ trace: T.width x T.height) ----------
const SYM_W = T.width;
const SYM_H = T.height;

/** tone: 'color' = เขียว + ชมพู / 'white' = ขาว + ชมพู (ใช้บนพื้นเข้ม) */
function symbol(tone = 'color') {
  const main = tone === 'white' ? C.white : C.pine;
  return `<path fill-rule="evenodd" fill="${main}" d="${T.green.d}"/><path fill-rule="evenodd" fill="${C.sakura}" d="${T.pink.d}"/>`;
}

// ---------- ตัวหนังสือ 2 บรรทัด "Angkhang" / "Today" (แปลงเป็นเส้น ไม่ต้องติดตั้งฟอนต์) ----------
function wordmark(x, baseline, size, { align = 'left', tone = 'color', lead = 0.98 } = {}) {
  const lines = [
    { text: 'Angkhang', color: tone === 'white' ? C.white : C.pine },
    { text: 'Today', color: tone === 'white' ? C.sakuraLight : C.sakura },
  ];
  const widths = lines.map((l) => font.getAdvanceWidth(l.text, size));
  const svg = lines
    .map((l, i) => {
      const lx = align === 'center' ? x - widths[i] / 2 : x;
      return `<path d="${font.getPath(l.text, lx, baseline + i * size * lead, size).toPathData(1)}" fill="${l.color}"/>`;
    })
    .join('');
  return { svg, width: Math.max(...widths) };
}

const svgDoc = (w, h, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Angkhang Today">` +
  `<title>Angkhang Today</title>${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>\n`;

/** วางสัญลักษณ์ให้สูง h หน่วย ที่ตำแหน่ง (x, y) */
const placeSymbol = (x, y, h, tone) => {
  const s = h / SYM_H;
  return { svg: `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(5)})">${symbol(tone)}</g>`, w: SYM_W * s };
};

const files = {};

// 1) สัญลักษณ์อย่างเดียว (ต้นฉบับเวกเตอร์)
files['logo-symbol.svg'] = svgDoc(SYM_W, SYM_H, symbol('color'));
files['logo-symbol-white.svg'] = svgDoc(SYM_W, SYM_H, symbol('white'));

// 2) แนวนอน: สัญลักษณ์ซ้าย ตัวหนังสือ 2 บรรทัดขวา (สัดส่วนตามไฟล์ Today.svg)
function horizontal(tone) {
  const H = 600;
  const sym = placeSymbol(0, 0, H, tone);
  const size = 268;
  const x = sym.w + 72;
  const w = wordmark(x, 262, size, { tone });
  return svgDoc(Math.ceil(x + w.width + 10), H, sym.svg + w.svg);
}
files['logo-horizontal.svg'] = horizontal('color');
files['logo-horizontal-white.svg'] = horizontal('white');

// 3) จัตุรัส ไม่มีตัวหนังสือ
{
  const h = 720;
  const w = (SYM_W * h) / SYM_H;
  files['logo-square.svg'] = svgDoc(1000, 1000, placeSymbol((1000 - w) / 2, (1000 - h) / 2, h).svg, C.white);
}

// 4) จัตุรัส โลโก้บน ตัวหนังสือล่าง (กลาง)
{
  const h = 470;
  const w = (SYM_W * h) / SYM_H;
  const top = 120;
  const text = wordmark(500, top + h + 150, 118, { align: 'center' });
  files['logo-square-text.svg'] = svgDoc(1000, 1000, placeSymbol((1000 - w) / 2, top, h).svg + text.svg, C.white);
}

// favicon: สัญลักษณ์ในกรอบจัตุรัส (พื้นใส)
{
  const h = 120;
  const w = (SYM_W * h) / SYM_H;
  files['../favicon.svg'] = svgDoc(120, 120, placeSymbol((120 - w) / 2, 0, h).svg);
}

for (const [name, svg] of Object.entries(files)) fs.writeFileSync(path.join(OUT, name), svg);

// ---------- PNG ----------
const png = (svgName, outName, width) =>
  sharp(Buffer.from(files[svgName]), { density: 300 }).resize({ width }).png({ compressionLevel: 9 }).toFile(path.join(OUT, outName));

await Promise.all([
  png('logo-horizontal.svg', 'logo-horizontal.png', 1600),
  png('logo-horizontal-white.svg', 'logo-horizontal-white.png', 1600),
  png('logo-square.svg', 'logo-square.png', 1024),
  png('logo-square-text.svg', 'logo-square-text.png', 1024),
  png('logo-symbol.svg', 'logo-symbol-512.png', 512),
  png('../favicon.svg', '../apple-touch-icon.png', 180),
  png('../favicon.svg', '../favicon-32.png', 32),
]);

const sizes = fs.readdirSync(OUT).filter((f) => f.endsWith('.svg')).map((f) => `${f} ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0)}KB`);
console.log('สร้างโลโก้ที่ public/brand/:\n ' + sizes.join('\n '));
