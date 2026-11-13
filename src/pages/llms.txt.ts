// /llms.txt — สรุปเนื้อหาเว็บแบบข้อความล้วนสำหรับ AI search (ChatGPT, Perplexity, Gemini, Claude)
import type { APIRoute } from 'astro';
import { SITE } from '../data/site';
import { SITE_FAQS } from '../data/faqs';
import { AMENITIES } from '../data/amenities';
import { STAY_TYPES, UNIT_NOUN } from '../data/stay-types';
import { AREAS, AREA_KEYS } from '../data/areas';
import { formatTHB, getStays, getZoneAreas, getZoneNames, getZones, guestsText, priceRange, priceUnit, stayAreas, stayCapacity, stayZoneIds, zoneAreas } from '../lib/stays';

export const GET: APIRoute = async () => {
  const [stays, zones, zoneNames, areasByZone] = await Promise.all([getStays(), getZones(), getZoneNames(), getZoneAreas()]);
  const url = (p: string) => new URL(p, SITE.url).href;

  const lines = [
    `# ${SITE.name} (${SITE.nameTh})`,
    '',
    `> ${SITE.description}`,
    '',
    'Angkhang Today ไม่รับจองหรือรับเงินแทนที่พัก ผู้ใช้ติดต่อเจ้าของที่พักโดยตรง ที่พักที่มี "การันตีช่องทางติดต่อ" ผ่านการตรวจสอบเบอร์โทร LINE และชื่อบัญชีรับโอนโดยทีมงานแล้ว',
    '',
    '## หน้าหลัก',
    `- [ค้นหาที่พัก](${url('/stays')}): กรองตามโซน ประเภท งบ จำนวนคน สิ่งอำนวยความสะดวก`,
    `- [ตรวจสอบก่อนโอน](${url('/verify')}): ตรวจเบอร์ LINE เพจ เลขบัญชี ว่าเป็นของที่พักจริงหรือไม่`,
    `- [วิธีสังเกตเพจที่พักปลอม](${url('/safety')})`,
    `- [คำถามที่พบบ่อย](${url('/faq')})`,
    '',
    '## เส้นทางขึ้นดอยอ่างขางและหมู่บ้าน',
    ...AREA_KEYS.flatMap((a) => [
      `### [${AREAS[a].name}](${url(`/routes/${a}`)})`,
      AREAS[a].summary,
      ...zones.filter((z) => zoneAreas(z).includes(a)).map((z) => `- [${z.data.name}](${url(`/zones/${z.id}`)}): ${z.data.summary}`),
      '',
    ]),
    '',
    '## ที่พัก',
    ...stays.map((s) => {
      const d = s.data;
      const tags = d.amenities.map((a) => AMENITIES[a].label).join(', ');
      const head = `- [${d.name}](${url(`/stays/${s.id}`)}): ${STAY_TYPES[d.type].label} ${stayZoneIds(s).map((id) => zoneNames[id]).join(' / ')} (${stayAreas(s, areasByZone).map((a) => AREAS[a].short).join(', ')}) · ${priceRange(s)} ${priceUnit(s)} ${stayCapacity(s) ? ` · รองรับ ${stayCapacity(s)!.total} คน` : ''} · ${d.verified.status ? 'การันตีช่องทางติดต่อแล้ว' : 'ยังไม่ได้ตรวจสอบ'}${d.sample ? ' · (ข้อมูลตัวอย่าง)' : ''} · ${tags}`;
      const rooms = d.rooms.map(
        (r) =>
          `  - ${[
            r.name,
            r.count && `${r.count} ${UNIT_NOUN[d.type]}`,
            `พักได้ ${guestsText(r)} คน`,
            r.beds,
            r.price ? `${formatTHB(r.price.weekday)}${r.price.weekend ? ` / วันหยุด ${formatTHB(r.price.weekend)}` : ''}` : 'สอบถามราคา',
          ]
            .filter(Boolean)
            .join(', ')}`,
      );
      return [head, ...rooms].join('\n');
    }),
    '',
    '## คำถามที่พบบ่อย',
    ...SITE_FAQS.flatMap((f) => [`### ${f.q}`, f.a, '']),
  ];

  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
