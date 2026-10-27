// นำเข้ารูปที่พักที่ "ได้รับอนุญาตแล้ว" (จากเจ้าของที่พัก หรือรูปที่ถ่ายเอง) เข้าโฟลเดอร์ที่ถูกต้อง
//
// ใช้:
//   node scripts/add-photos.mjs <slug> <โฟลเดอร์รูป> [--room 1] [--credit "ภาพจากเจ้าของที่พัก"] [--date 2026-10]
//
// ตัวอย่าง:
//   node scripts/add-photos.mjs yunnan-homestay "C:/Users/me/Downloads/yunnan" --credit "ภาพจากยูนนานโฮมสเตย์"
//   node scripts/add-photos.mjs yunnan-homestay "C:/Users/me/Downloads/yunnan-room1" --room 1
//
// สิ่งที่สคริปต์ทำ: หมุนรูปตาม EXIF, ย่อด้านยาวไม่เกิน 2000px, บันทึกเป็น JPG คุณภาพ 82, ลบ metadata (เช่น พิกัด GPS ในรูป),
// ตั้งชื่อต่อจากรูปเดิม (01.jpg, 02.jpg, ...) และบันทึกเครดิตลง credits.json
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const sharp = require('sharp');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const room = flag('room');
const credit = flag('credit');
const date = flag('date') ?? new Date().toISOString().slice(0, 7);
const [slug, srcDir] = args;

if (!slug || !srcDir) {
  console.error('ใช้: node scripts/add-photos.mjs <slug> <โฟลเดอร์รูป> [--room N] [--credit "..."] [--date YYYY-MM]');
  process.exit(1);
}
const stayFile = path.join(root, 'src/content/stays', `${slug}.md`);
if (!fs.existsSync(stayFile)) {
  console.error(`ไม่พบที่พัก "${slug}" (ไม่มีไฟล์ src/content/stays/${slug}.md)`);
  process.exit(1);
}

const stayDir = path.join(root, 'src/assets/stays', slug);
const outDir = room ? path.join(stayDir, 'rooms', String(room)) : stayDir;
fs.mkdirSync(outDir, { recursive: true });

const isImage = (f) => /\.(jpe?g|png|webp|heic|heif|avif|tiff?)$/i.test(f);
const inputs = fs.readdirSync(srcDir).filter(isImage).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
if (!inputs.length) {
  console.error('ไม่พบไฟล์รูปในโฟลเดอร์นี้');
  process.exit(1);
}

const existing = fs.readdirSync(outDir).filter((f) => /^\d+\.jpg$/.test(f)).map((f) => parseInt(f, 10));
let n = existing.length ? Math.max(...existing) : 0;

for (const file of inputs) {
  n += 1;
  const name = `${String(n).padStart(2, '0')}.jpg`;
  await sharp(path.join(srcDir, file))
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(outDir, name));
  console.log(`  ${file} -> ${path.relative(root, path.join(outDir, name))}`);
}

// เครดิต
const creditsPath = path.join(stayDir, 'credits.json');
const credits = fs.existsSync(creditsPath) ? JSON.parse(fs.readFileSync(creditsPath, 'utf8')) : { files: {} };
if (credit) credits.credit = credit;
credits.date = date;
fs.writeFileSync(creditsPath, JSON.stringify(credits, null, 2) + '\n');
fs.rmSync(path.join(outDir, '.gitkeep'), { force: true });

console.log(`นำเข้า ${inputs.length} รูปให้ ${slug}${room ? ` (ห้องประเภทที่ ${room})` : ''} เรียบร้อย`);
console.log('แก้คำอธิบายรูป (alt) ได้ที่', path.relative(root, creditsPath));
