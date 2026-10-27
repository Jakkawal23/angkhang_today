import type { IconName } from '../lib/icons';

export const STAY_TYPES = {
  resort: { label: 'รีสอร์ท', icon: 'hotel', seoTitle: 'รีสอร์ทดอยอ่างขาง', schema: 'Resort' },
  hotel: { label: 'โรงแรม', icon: 'building', seoTitle: 'โรงแรมใกล้ดอยอ่างขาง', schema: 'Hotel' },
  homestay: { label: 'โฮมสเตย์', icon: 'house-plus', seoTitle: 'โฮมสเตย์ดอยอ่างขาง', schema: 'BedAndBreakfast' },
  guesthouse: { label: 'บ้านพัก / เกสต์เฮาส์', icon: 'bed-double', seoTitle: 'บ้านพัก เกสต์เฮาส์ ดอยอ่างขาง', schema: 'LodgingBusiness' },
  cabin: { label: 'บ้านไม้ / บังกะโล', icon: 'tree-pine', seoTitle: 'บ้านไม้ บังกะโล ดอยอ่างขาง', schema: 'LodgingBusiness' },
  house: { label: 'บ้านทั้งหลัง', icon: 'house', seoTitle: 'บ้านพักทั้งหลัง ดอยอ่างขาง (เหมาหลัง)', schema: 'LodgingBusiness' },
  tent: { label: 'ลานกางเต็นท์', icon: 'tent', seoTitle: 'ลานกางเต็นท์ดอยอ่างขาง', schema: 'Campground' },
} as const satisfies Record<string, { label: string; icon: IconName; seoTitle: string; schema: string }>;

export type StayType = keyof typeof STAY_TYPES;
export const STAY_TYPE_KEYS = Object.keys(STAY_TYPES) as [StayType, ...StayType[]];

export const PRICE_UNITS = {
  room: 'ต่อห้อง / คืน',
  person: 'ต่อคน / คืน',
  tent: 'ต่อเต็นท์ / คืน',
  house: 'ต่อหลัง / คืน',
} as const;
export type PriceUnit = keyof typeof PRICE_UNITS;
export const PRICE_UNIT_KEYS = Object.keys(PRICE_UNITS) as [PriceUnit, ...PriceUnit[]];

/** หน่วยนับของ "ห้อง" แต่ละประเภทที่พัก */
export const UNIT_NOUN: Record<StayType, string> = {
  resort: 'ห้อง',
  hotel: 'ห้อง',
  homestay: 'ห้อง',
  guesthouse: 'ห้อง',
  cabin: 'หลัง',
  house: 'หลัง',
  tent: 'จุด',
};
