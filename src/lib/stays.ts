import { getCollection, type CollectionEntry } from 'astro:content';
import { AREAS, type Area } from '../data/areas';
import { PRICE_UNITS, type PriceUnit } from '../data/stay-types';

export type Stay = CollectionEntry<'stays'>;
export type Zone = CollectionEntry<'zones'>;
export type Room = Stay['data']['rooms'][number];
export type LineContact = NonNullable<Stay['data']['contacts']['line']>;

const statusRank = (s: Stay) => ({ open: 2, listed: 1, unconfirmed: 0 })[s.data.status];

/** การันตี -> ยืนยันว่าเปิด -> แนะนำ -> มีช่องทางติดต่อ -> ชื่อ */
export async function getStays(): Promise<Stay[]> {
  const stays = await getCollection('stays', (s) => !s.data.draft);
  const contactScore = (s: Stay) => Number(hasAnyContact(s)) + Number(!!stayPrice(s));
  return stays.sort(
    (a, b) =>
      Number(b.data.verified.status) - Number(a.data.verified.status) ||
      statusRank(b) - statusRank(a) ||
      Number(b.data.featured) - Number(a.data.featured) ||
      contactScore(b) - contactScore(a) ||
      a.data.name.localeCompare(b.data.name, 'th'),
  );
}

export async function getZones(): Promise<Zone[]> {
  return (await getCollection('zones')).sort((a, b) => a.data.order - b.data.order);
}

export async function getZoneNames(): Promise<Record<string, string>> {
  return Object.fromEntries((await getZones()).map((z) => [z.id, z.data.name]));
}

/** zone id -> area (บนดอย / เส้นทาง) */
export async function getZoneAreas(): Promise<Record<string, Area>> {
  return Object.fromEntries((await getZones()).map((z) => [z.id, z.data.area]));
}

export const areaName = (a: Area) => AREAS[a].name;

// ---------- ราคา / ความจุ (คำนวณจาก rooms ถ้ามี) ----------

/** null = ยังไม่มีข้อมูลราคา */
export function stayPrice(stay: Stay): { min: number; max: number; unit: PriceUnit } | null {
  const d = stay.data;
  const all = d.rooms
    .flatMap((r) => (r.price ? [r.price.weekday, r.price.weekend, r.price.peak] : []))
    .filter((n): n is number => n != null);
  if (all.length) return { min: Math.min(...all), max: Math.max(...all), unit: d.price.unit ?? d.rooms[0].unit };
  if (d.price.min == null) return null;
  return { min: d.price.min, max: d.price.max ?? d.price.min, unit: d.price.unit ?? 'room' };
}

/** null = ยังไม่มีข้อมูลจำนวนห้อง */
export function stayCapacity(stay: Stay): { units: number; maxPerUnit: number; total: number } | null {
  const d = stay.data;
  if (d.capacity) return d.capacity;
  if (d.rooms.length && d.rooms.every((r) => r.count)) {
    return {
      units: d.rooms.reduce((n, r) => n + r.count!, 0),
      maxPerUnit: Math.max(...d.rooms.map((r) => r.maxGuests)),
      total: d.rooms.reduce((n, r) => n + r.count! * r.maxGuests, 0),
    };
  }
  return null;
}

export const formatTHB = (n: number) => '฿' + n.toLocaleString('th-TH');

export function priceRange(stay: Stay): string {
  const p = stayPrice(stay);
  if (!p) return 'สอบถามราคา';
  return p.max !== p.min ? `${formatTHB(p.min)}–${formatTHB(p.max)}` : formatTHB(p.min);
}

export const priceUnit = (stay: Stay) => {
  const p = stayPrice(stay);
  return p ? PRICE_UNITS[p.unit] : 'ติดต่อที่พักโดยตรง';
};

export const guestsText = (r: Room) => (r.minGuests && r.minGuests !== r.maxGuests ? `${r.minGuests}–${r.maxGuests}` : `${r.maxGuests}`);

// ---------- วันที่: วัน/เดือน/ปี ค.ศ. ----------

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric' });

// ---------- ติดต่อ ----------

export const digits = (s: string) => s.replace(/\D/g, '');

export const telUrl = (phone: string) => 'tel:' + phone.replace(/[^\d+]/g, '');

/** ลิงก์เพิ่มเพื่อน LINE: ใช้ url ที่ที่พักให้มาก่อน, ไม่งั้นสร้างจาก ID (OA = @id, ส่วนตัว = ~id) */
export function lineAddUrl(line: LineContact): string {
  if (line.url) return line.url;
  const id = line.id!.trim();
  return line.type === 'oa'
    ? `https://line.me/R/ti/p/${encodeURIComponent(id.startsWith('@') ? id : '@' + id)}`
    : `https://line.me/R/ti/p/~${encodeURIComponent(id)}`;
}

/** เปิดแชตพร้อมข้อความ (ทำได้เฉพาะ LINE OA ที่รู้ ID) */
export function lineMessageBase(line: LineContact): string | undefined {
  if (line.type !== 'oa' || !line.id) return undefined;
  const id = line.id.startsWith('@') ? line.id : '@' + line.id;
  return `https://line.me/R/oaMessage/${encodeURIComponent(id)}/`;
}

export const lineLabel = (line: LineContact) => (line.type === 'oa' ? 'LINE Official Account' : 'LINE ส่วนตัว');

export function hasAnyContact(stay: Stay): boolean {
  const c = stay.data.contacts;
  return !!(c.phones.length || c.line || c.facebook || c.messenger || c.website || c.email || c.instagram || c.tiktok);
}

/** ชื่อที่พักโดยไม่มีคำว่า (ตัวอย่าง) — ใช้ในข้อความถึงเจ้าของและคำค้นแผนที่ */
export const cleanName = (name: string) => name.replace(/\s*\(ตัวอย่าง\)\s*/g, '').trim();

// ---------- แผนที่ ----------

export const hasCoords = (stay: Stay) => stay.data.location?.lat != null && stay.data.location?.lng != null;

/** คำค้น Google Maps เมื่อยังไม่มีพิกัด */
export function mapQuery(stay: Stay, zone: Zone): string {
  const d = stay.data;
  if (hasCoords(stay)) return `${d.location!.lat},${d.location!.lng}`;
  return [cleanName(d.name), zone.data.name, zone.data.district && `อ.${zone.data.district}`, 'เชียงใหม่']
    .filter(Boolean)
    .join(' ');
}

export const mapUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const directionsUrl = (query: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;

/** แผนที่ฝัง (ไม่ต้องใช้ API key) */
export const mapEmbedUrl = (query: string, zoom = 15) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&hl=th&output=embed`;

export function fullAddress(stay: Stay, zone: Zone): string {
  const z = zone.data;
  return [
    stay.data.location?.address ?? z.name,
    z.subdistrict && `ต.${z.subdistrict}`,
    z.district && `อ.${z.district}`,
    'จ.เชียงใหม่',
  ]
    .filter(Boolean)
    .join(' ');
}
