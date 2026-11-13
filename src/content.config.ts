import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { AMENITY_KEYS } from './data/amenities';
import { AREA_KEYS } from './data/areas';
import { PRICE_UNIT_KEYS, STAY_TYPE_KEYS } from './data/stay-types';

// โซน = หมู่บ้าน / พื้นที่ ซึ่งอยู่ "บนดอย" หรืออยู่บนเส้นทางขึ้นดอยเส้นใดเส้นหนึ่ง (ดู src/data/areas.ts)
const zones = defineCollection({
  loader: file('src/data/zones.json'),
  schema: z.object({
    /** เส้นทาง/พื้นที่หลัก */
    area: z.enum(AREA_KEYS),
    /** เส้นทางอื่นที่หมู่บ้านนี้อยู่ด้วย (เช่น บ้านผาแดงอยู่ทั้งเส้น 1178 และเส้นหนองบัว) */
    alsoOn: z.array(z.enum(AREA_KEYS)).default([]),
    order: z.number(),
    name: z.string(),
    nameEn: z.string(),
    summary: z.string(),
    description: z.string(),
    goodFor: z.array(z.string()).default([]),
    subdistrict: z.string().optional(),
    district: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
});

const image = z.object({ src: z.string(), alt: z.string() });

/** ประเภทห้องพัก 1 แบบ เช่น "ห้องดีลักซ์ เตียงคู่" */
const room = z.object({
  name: z.string(),
  description: z.string().optional(),
  /** จำนวนห้อง (หรือหลัง / จุดกางเต็นท์) ของประเภทนี้ */
  count: z.number().int().positive().optional(),
  /** พักได้กี่คนต่อห้อง (minGuests ใช้เมื่อเป็นช่วง เช่น 3–4 คน) */
  minGuests: z.number().int().positive().optional(),
  maxGuests: z.number().int().positive(),
  beds: z.string().optional(),
  /** ขนาดห้อง ตร.ม. */
  size: z.number().positive().optional(),
  unit: z.enum(PRICE_UNIT_KEYS).default('room'),
  /** ไม่ทราบราคา = ไม่ต้องใส่ (จะแสดง "สอบถามราคา") */
  price: z
    .object({
      weekday: z.number().int().nonnegative(),
      weekend: z.number().int().nonnegative().optional(),
      peak: z.number().int().nonnegative().optional(),
    })
    .optional(),
  breakfast: z.boolean().default(false),
  bathroom: z.enum(['private', 'shared']).optional(),
  extraBed: z.string().optional(),
  features: z.array(z.string()).default([]),
  images: z.array(image).default([]),
});

const phone = z
  .union([z.string(), z.object({ number: z.string(), name: z.string().optional() })])
  .transform((p) => (typeof p === 'string' ? { number: p, name: undefined } : p));

// ที่พัก 1 แห่ง = ไฟล์ .md 1 ไฟล์ใน src/content/stays (ชื่อไฟล์ = URL slug)
const stays = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stays' }),
  schema: z.object({
      name: z.string(),
      nameEn: z.string().optional(),
      /** ข้อมูลตัวอย่าง (รวบรวมจากแหล่งสาธารณะ ยังไม่ได้ยืนยันกับเจ้าของ) */
      sample: z.boolean().default(false),
      /** open = ทีมงานยืนยันแล้วว่าเปิด / listed = พบประกาศบนเว็บจองล่าสุด / unconfirmed = ยังไม่ได้ยืนยัน (ข้อมูลเก่า) */
      status: z.enum(['open', 'listed', 'unconfirmed']).default('unconfirmed'),
      /** แหล่งที่มาของข้อมูล (แสดงในหน้าที่พัก) */
      sources: z.array(z.object({ title: z.string(), url: z.string(), note: z.string().optional() })).default([]),
      draft: z.boolean().default(false),
      featured: z.boolean().default(false),
      type: z.enum(STAY_TYPE_KEYS),
      /** หมู่บ้าน/โซนหลัก (ใช้ทำที่อยู่และ breadcrumb) */
      zone: reference('zones'),
      /** หมู่บ้าน/โซนเพิ่มเติมที่ที่พักนี้ควรแสดงด้วย */
      zones: z.array(reference('zones')).default([]),
      /** เส้นทางเพิ่มเติม (นอกเหนือจากเส้นทางของหมู่บ้าน) */
      routes: z.array(z.enum(AREA_KEYS)).default([]),
      summary: z.string().max(220),
      /** ถ้ามี rooms ระบบคำนวณราคาต่ำสุด/สูงสุดให้เอง ไม่ต้องกรอก min/max */
      price: z
        .object({
          min: z.number().int().nonnegative().optional(),
          max: z.number().int().nonnegative().optional(),
          unit: z.enum(PRICE_UNIT_KEYS).optional(),
          note: z.string().optional(),
        })
        .default({}),
      /** นิยามช่วงราคา ใช้กับตารางราคาห้อง */
      seasons: z
        .object({
          weekday: z.string().default('อาทิตย์–พฤหัสบดี'),
          weekend: z.string().default('ศุกร์–เสาร์ และคืนก่อนวันหยุดนักขัตฤกษ์'),
          peak: z.string().default('ช่วงปีใหม่และวันหยุดยาวหน้าหนาว'),
        })
        .prefault({}),
      rooms: z.array(room).default([]),
      /** ใช้เมื่อไม่มี rooms (ถ้ามี rooms ระบบคำนวณให้) */
      capacity: z
        .object({
          units: z.number().int().positive(),
          maxPerUnit: z.number().int().positive(),
          total: z.number().int().positive(),
        })
        .optional(),
      amenities: z.array(z.enum(AMENITY_KEYS)).default([]),
      highlights: z.array(z.string()).default([]),
      checkIn: z.string().optional(),
      checkOut: z.string().optional(),
      policies: z
        .object({
          deposit: z.string().optional(),
          cancellation: z.string().optional(),
          /** กฎของที่พัก */
          other: z.array(z.string()).default([]),
        })
        .prefault({}),
      contacts: z
        .object({
          phones: z.array(phone).default([]),
          /**
           * LINE (ไม่มี = ไม่ต้องใส่)
           * type: 'oa' = LINE Official Account (ID ขึ้นต้น @) เปิดแชตพร้อมข้อความได้
           *       'personal' = LINE ส่วนตัว ต้องเพิ่มเพื่อนแล้ววางข้อความเอง
           */
          line: z
            .object({
              type: z.enum(['oa', 'personal']),
              id: z.string().optional(),
              /** ลิงก์เพิ่มเพื่อนที่ถูกต้อง เช่น https://lin.ee/xxxx */
              url: z.string().optional(),
            })
            .refine((l) => l.id || l.url, 'LINE ต้องมี id หรือ url อย่างน้อยหนึ่งอย่าง')
            .optional(),
          /** ลิงก์ Messenger เช่น https://m.me/xxxx */
          messenger: z.string().optional(),
          facebook: z.string().optional(),
          facebookName: z.string().optional(),
          /** true = ลิงก์เป็นโปรไฟล์ส่วนตัว ไม่ใช่เพจ (ฝังปลั๊กอินเพจไม่ได้) */
          facebookIsPersonal: z.boolean().optional(),
          instagram: z.string().optional(),
          tiktok: z.string().optional(),
          website: z.string().optional(),
          email: z.string().optional(),
        })
        .prefault({}),
      bankAccounts: z
        .array(z.object({ bank: z.string(), accountName: z.string(), accountNumber: z.string() }))
        .default([]),
      verified: z
        .object({
          status: z.boolean(),
          date: z.coerce.date().optional(),
          method: z.array(z.string()).default([]),
        })
        .default({ status: false, method: [] }),
      location: z
        .object({
          /** พิกัดจาก Google Maps (คลิกขวาที่หมุด -> คัดลอกพิกัด) — ไม่ทราบให้เว้นไว้ ระบบจะค้นหาจากชื่อแทน */
          lat: z.number().optional(),
          lng: z.number().optional(),
          address: z.string().optional(),
          /** ลิงก์หมุดที่พักบน Google Maps (ถ้าที่พักมีหมุดของตัวเอง) */
          googleMapsUrl: z.string().optional(),
          /** วิธีเดินทาง ทีละขั้น */
          directions: z.array(z.string()).default([]),
          nearby: z.array(z.string()).default([]),
        })
        .optional(),
      images: z.array(image).default([]),
      faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
      updated: z.coerce.date(),
    })
});

export const collections = { zones, stays };
