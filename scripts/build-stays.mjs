// สร้างไฟล์ src/content/stays/<slug>.md จาก scripts/real-stays.mjs
// ใช้: node scripts/build-stays.mjs   (เขียนทับเฉพาะไฟล์ที่มีอยู่ในรายการ)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAYS } from './real-stays.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src/content/stays');
const UPDATED = '2026-10-25';

// YAML แบบง่าย: string ใส่ "..." (JSON string ใช้เป็น YAML ได้), array/object เป็น block
function yaml(value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return ' []';
    return value
      .map((v) => {
        if (v && typeof v === 'object') {
          const body = yaml(v, indent + 2).replace(/^\n/, '').replace(/^ +/, '');
          return `\n${pad}- ${body}`;
        }
        return `\n${pad}- ${scalar(v)}`;
      })
      .join('');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => (v && typeof v === 'object' ? `\n${pad}${k}:${yaml(v, indent + 2)}` : `\n${pad}${k}: ${scalar(v)}`))
      .join('');
  }
  return ' ' + scalar(value);
}
const scalar = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));

fs.mkdirSync(outDir, { recursive: true });
for (const { slug, ...data } of STAYS) {
  const fm = {
    sample: true,
    status: 'unconfirmed',
    ...data,
    verified: { status: false },
    updated: UPDATED,
  };
  const file = path.join(outDir, `${slug}.md`);
  const header = '# ข้อมูลตัวอย่าง: รวบรวมจากแหล่งข้อมูลสาธารณะ ยังไม่ได้ยืนยันกับเจ้าของที่พัก (แก้ข้อมูลต้นทางที่ scripts/real-stays.mjs)';
  fs.writeFileSync(file, `---\n${header}${yaml(fm)}\n---\n`);
}
console.log(`เขียน ${STAYS.length} ไฟล์ที่ ${path.relative(root, outDir)}`);
