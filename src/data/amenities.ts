import type { IconName } from '../lib/icons';

// คุณสมบัติที่คนมักระบุตอนโพสต์หาห้องในกลุ่ม Facebook -> ใช้เป็นตัวกรองและหน้า SEO (/stays/tag/<key>)
export const AMENITIES = {
  'mist-view': { label: 'วิวทะเลหมอก', icon: 'cloud-fog', seoTitle: 'ที่พักอ่างขาง วิวทะเลหมอก', popular: true },
  'sunrise-view': { label: 'วิวพระอาทิตย์ขึ้น', icon: 'sunrise', seoTitle: 'ที่พักอ่างขาง ชมพระอาทิตย์ขึ้นหน้าที่พัก', popular: false },
  'bbq-grill': { label: 'ปิ้งย่าง / หมูกระทะได้', icon: 'beef', seoTitle: 'ที่พักอ่างขาง ทำหมูกระทะ ปิ้งย่างได้', popular: true },
  campfire: { label: 'ก่อกองไฟได้', icon: 'flame', seoTitle: 'ที่พักอ่างขาง ก่อกองไฟได้', popular: false },
  heater: { label: 'มีฮีตเตอร์', icon: 'heater', seoTitle: 'ที่พักอ่างขาง มีฮีตเตอร์ กันหนาว', popular: true },
  'hot-water': { label: 'น้ำอุ่น', icon: 'shower-head', seoTitle: 'ที่พักอ่างขาง มีน้ำอุ่น', popular: false },
  'electric-blanket': { label: 'ผ้าห่มไฟฟ้า', icon: 'thermometer', seoTitle: 'ที่พักอ่างขาง มีผ้าห่มไฟฟ้า', popular: false },
  'private-bathroom': { label: 'ห้องน้ำในตัว', icon: 'bath', seoTitle: 'ที่พักอ่างขาง ห้องน้ำในตัว', popular: false },
  breakfast: { label: 'รวมอาหารเช้า', icon: 'egg-fried', seoTitle: 'ที่พักอ่างขาง รวมอาหารเช้า', popular: false },
  restaurant: { label: 'มีร้านอาหาร', icon: 'utensils', seoTitle: 'ที่พักอ่างขาง มีร้านอาหารในที่พัก', popular: false },
  'large-group': { label: 'รับกรุ๊ป 10+ คน', icon: 'users', seoTitle: 'ที่พักอ่างขาง สำหรับกรุ๊ปใหญ่ หมู่คณะ', popular: true },
  family: { label: 'เหมาะกับครอบครัว', icon: 'baby', seoTitle: 'ที่พักอ่างขาง สำหรับครอบครัว', popular: false },
  'pet-friendly': { label: 'พาสัตว์เลี้ยงได้', icon: 'paw-print', seoTitle: 'ที่พักอ่างขาง พาสัตว์เลี้ยงได้ (Pet Friendly)', popular: true },
  'tent-rental': { label: 'มีเต็นท์ให้เช่า', icon: 'tent', seoTitle: 'ลานกางเต็นท์อ่างขาง มีเต็นท์ให้เช่า', popular: false },
  parking: { label: 'ที่จอดรถ', icon: 'parking', seoTitle: 'ที่พักอ่างขาง มีที่จอดรถ', popular: false },
  pickup: { label: 'บริการรับ-ส่ง', icon: 'car', seoTitle: 'ที่พักอ่างขาง มีบริการรับส่ง', popular: false },
  'walk-to-station': { label: 'เดินไปสถานีเกษตรหลวงได้', icon: 'footprints', seoTitle: 'ที่พักอ่างขาง ใกล้สถานีเกษตรหลวง เดินได้', popular: true },
  wifi: { label: 'Wi-Fi', icon: 'wifi', seoTitle: 'ที่พักอ่างขาง มี Wi-Fi', popular: false },
} as const satisfies Record<string, { label: string; icon: IconName; seoTitle: string; popular: boolean }>;

export type Amenity = keyof typeof AMENITIES;
export const AMENITY_KEYS = Object.keys(AMENITIES) as [Amenity, ...Amenity[]];
