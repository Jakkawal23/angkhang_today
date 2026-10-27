// แปลงโลโก้ที่เป็นรูป (เช่น SVG จาก Canva ที่ฝัง JPEG ไว้ข้างใน) ให้เป็นเวกเตอร์จริง 2 สี (เขียว + ชมพู)
// ใช้: node scripts/trace-logo.mjs "<ไฟล์โลโก้สัญลักษณ์ .svg/.png>"  -> src/data/logo-traced.json
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const sharp = require('sharp');
const potrace = require('potrace');

const input = process.argv[2];
if (!input) {
  console.error('ใช้: node scripts/trace-logo.mjs "<ไฟล์โลโก้>"');
  process.exit(1);
}

// render ให้ใหญ่พอสำหรับเส้นที่เนียน
const { data, info } = await sharp(fs.readFileSync(input), { density: 216 })
  .resize({ width: 3000 })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

// จัดกลุ่มสีต่อพิกเซล
const isGreen = (r, g, b) => g > r + 12 && g > b - 5 && r < 140 && g < 170 && r + g + b < 420;
const isPink = (r, g, b) => r > 170 && r - g > 60 && b > 90 && b < 200;

function mask(test) {
  const buf = Buffer.alloc(W * H);
  let x0 = W, y0 = H, x1 = 0, y1 = 0, sum = [0, 0, 0], n = 0;
  for (let i = 0, p = 0; i < W * H; i++, p += 3) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    if (test(r, g, b)) {
      buf[i] = 0;
      const x = i % W, y = (i / W) | 0;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
      // เก็บสีจากเนื้อในของเส้น (ไม่เอาขอบที่ผสมกับพื้นขาว)
      if (r + g + b < 400 || test === isPink) { sum[0] += r; sum[1] += g; sum[2] += b; n++; }
    } else buf[i] = 255;
  }
  const hex = '#' + sum.map((v) => Math.round(v / Math.max(1, n)).toString(16).padStart(2, '0')).join('').toUpperCase();
  return { buf, box: { x0, y0, x1, y1 }, color: hex };
}

const green = mask(isGreen);
const pink = mask(isPink);

const pad = 6;
const bx0 = Math.max(0, Math.min(green.box.x0, pink.box.x0) - pad);
const by0 = Math.max(0, Math.min(green.box.y0, pink.box.y0) - pad);
const bx1 = Math.min(W - 1, Math.max(green.box.x1, pink.box.x1) + pad);
const by1 = Math.min(H - 1, Math.max(green.box.y1, pink.box.y1) + pad);
const cw = bx1 - bx0 + 1;
const ch = by1 - by0 + 1;

async function trace(m) {
  const png = await sharp(m.buf, { raw: { width: W, height: H, channels: 1 } })
    .extract({ left: bx0, top: by0, width: cw, height: ch })
    .blur(1.2) // ลบรอยหยักของ JPEG ก่อน trace
    .png()
    .toBuffer();
  const svg = await new Promise((res, rej) =>
    potrace.trace(png, { threshold: 128, turdSize: 80, optTolerance: 0.35, alphaMax: 1.1 }, (err, out) => (err ? rej(err) : res(out))),
  );
  return [...svg.matchAll(/ d="([^"]+)"/g)].map((x) => x[1]).join(' ');
}

const result = {
  source: path.basename(input),
  width: cw,
  height: ch,
  green: { color: green.color, d: await trace(green) },
  pink: { color: pink.color, d: await trace(pink) },
};
const out = path.join(root, 'src/data/logo-traced.json');
fs.writeFileSync(out, JSON.stringify(result) + '\n');
console.log(`traced ${cw}x${ch}  green ${green.color}  pink ${pink.color}  -> ${path.relative(root, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
