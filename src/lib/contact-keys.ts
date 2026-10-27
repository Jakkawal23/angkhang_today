// แปลงช่องทางติดต่อให้เป็น "key" มาตรฐาน ใช้เทียบในหน้าตรวจสอบก่อนโอน (ใช้ทั้งตอน build และในเบราว์เซอร์)

/** facebook.com/<ชื่อเพจ>, facebook.com/profile.php?id=<เลข>, facebook.com/p/<ชื่อ>-<เลข> -> key เดียวกัน */
export function fbKey(url: string): string {
  let u = url.trim();
  try {
    u = decodeURIComponent(u);
  } catch {
    /* ปล่อยตามเดิมถ้า decode ไม่ได้ */
  }
  u = u
    .toLowerCase()
    .replace(/^https?:\/\/(www\.|m\.|web\.)?/, '')
    .replace(/^(facebook|fb)\.com\//, '');
  const id = u.match(/[?&]id=(\d+)/)?.[1] ?? u.match(/^(?:p|people)\/[^?#]*?(\d{10,})\/?/)?.[1];
  if (id) return `id:${id}`;
  return u.replace(/[?#].*$/, '').replace(/\/+$/, '');
}

export const lineKey = (id: string) => id.trim().toLowerCase().replace(/^[@~]/, '');

export function phoneKey(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('66') && d.length === 11) d = '0' + d.slice(2); // +66 -> 0
  return d;
}
