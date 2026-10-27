// รูปที่พัก: วางไฟล์ไว้ในโฟลเดอร์ แล้วระบบดึงมาแสดงเอง (Astro ย่อขนาด + แปลงเป็น WebP ให้ตอน build)
//
// src/assets/stays/<slug>/
//   01.jpg, 02.jpg, ...        รูปรวมของที่พัก (เรียงตามชื่อไฟล์, รูปแรก = รูปปก)
//   rooms/1/01.jpg ...         รูปห้องพักประเภทที่ 1 (ลำดับตาม rooms ใน data)
//   rooms/2/01.jpg ...
//   credits.json               (ไม่บังคับ) เครดิต/คำอธิบายรูป
//
// credits.json ตัวอย่าง:
// { "credit": "ภาพจากเจ้าของที่พัก", "date": "2026-10", "files": { "01.jpg": { "alt": "วิวทะเลหมอกจากระเบียง" } } }
import type { ImageMetadata } from 'astro';

interface CreditFile {
  credit?: string;
  date?: string;
  files?: Record<string, { alt?: string; credit?: string }>;
}

export interface StayPhoto {
  src: ImageMetadata;
  alt: string;
  credit?: string;
}

const FILES = import.meta.glob<ImageMetadata>('/src/assets/stays/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  import: 'default',
});
const CREDITS = import.meta.glob<CreditFile>('/src/assets/stays/*/credits.json', { eager: true, import: 'default' });

const ROOT = '/src/assets/stays/';

function collect(slug: string, sub: string, altBase: string): StayPhoto[] {
  const prefix = `${ROOT}${slug}/${sub}`;
  const credits = CREDITS[`${ROOT}${slug}/credits.json`];
  return Object.entries(FILES)
    .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
    .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
    .map(([path, src], i) => {
      const file = path.slice(prefix.length);
      const meta = credits?.files?.[`${sub}${file}`] ?? credits?.files?.[file];
      return { src, alt: meta?.alt ?? `${altBase} รูปที่ ${i + 1}`, credit: meta?.credit ?? credits?.credit };
    });
}

/** รูปรวมของที่พัก (รูปแรก = รูปปก) */
export const stayPhotos = (slug: string, name: string) => collect(slug, '', name);

/** รูปของห้องพักประเภทที่ index (เริ่มที่ 0 ตามลำดับใน rooms) */
export const roomPhotos = (slug: string, index: number, roomName: string) => collect(slug, `rooms/${index + 1}/`, roomName);

export function photoCredit(slug: string): { credit?: string; date?: string } {
  const c = CREDITS[`${ROOT}${slug}/credits.json`];
  return { credit: c?.credit, date: c?.date };
}
