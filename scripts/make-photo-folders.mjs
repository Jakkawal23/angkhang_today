// สร้างโฟลเดอร์รูปให้ที่พักทุกแห่ง: src/assets/stays/<slug>/ และ rooms/<n>/ ตามจำนวนประเภทห้อง
// ใช้: node scripts/make-photo-folders.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAYS } from './real-stays.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'src/assets/stays');
const keep = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.readdirSync(dir).some((f) => f !== '.gitkeep')) fs.writeFileSync(path.join(dir, '.gitkeep'), '');
};

for (const s of STAYS) {
  keep(path.join(base, s.slug));
  (s.rooms ?? []).forEach((_, i) => keep(path.join(base, s.slug, 'rooms', String(i + 1))));
}
console.log(`สร้าง/ตรวจโฟลเดอร์รูป ${STAYS.length} ที่พัก ที่ src/assets/stays/`);
