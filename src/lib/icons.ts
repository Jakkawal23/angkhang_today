// ไอคอนทั้งเว็บ: Lucide (เส้น) + Simple Icons (โลโก้แบรนด์ LINE / Facebook / Instagram / TikTok)
// render เป็น SVG string ตอน build -> ไม่มี JavaScript ฝั่ง client
import * as L from 'lucide-static';
import { siFacebook, siInstagram, siLine, siTiktok } from 'simple-icons';

const LUCIDE = {
  'cloud-fog': L.CloudFog,
  sunrise: L.Sunrise,
  beef: L.Beef,
  flame: L.Flame,
  heater: L.Heater,
  'shower-head': L.ShowerHead,
  'bed-double': L.BedDouble,
  'bed-single': L.BedSingle,
  bath: L.Bath,
  'egg-fried': L.EggFried,
  utensils: L.UtensilsCrossed,
  users: L.Users,
  baby: L.Baby,
  'paw-print': L.PawPrint,
  tent: L.Tent,
  parking: L.SquareParking,
  car: L.CarFront,
  footprints: L.Footprints,
  wifi: L.Wifi,
  hotel: L.Hotel,
  house: L.House,
  'house-plus': L.HousePlus,
  'tree-pine': L.TreePine,
  trees: L.Trees,
  'shield-check': L.ShieldCheck,
  'shield-alert': L.ShieldAlert,
  'shield-x': L.ShieldX,
  alert: L.TriangleAlert,
  phone: L.Phone,
  'map-pin': L.MapPin,
  navigation: L.Navigation,
  search: L.Search,
  sliders: L.SlidersHorizontal,
  check: L.Check,
  x: L.X,
  'chevron-down': L.ChevronDown,
  copy: L.Copy,
  calendar: L.CalendarDays,
  clock: L.Clock,
  globe: L.Globe,
  mail: L.Mail,
  info: L.Info,
  snowflake: L.Snowflake,
  route: L.Route,
  signpost: L.Signpost,
  mountain: L.Mountain,
  ruler: L.Ruler,
  coffee: L.Coffee,
  'arrow-right': L.ArrowRight,
  banknote: L.Banknote,
  wallet: L.Wallet,
  message: L.MessageCircle,
  'circle-check': L.CircleCheck,
  'circle-x': L.CircleX,
  plus: L.Plus,
  map: L.Map,
  'thumbs-up': L.ThumbsUp,
  images: L.Images,
  'external-link': L.ExternalLink,
  lightbulb: L.Lightbulb,
  'list-checks': L.ListChecks,
  'badge-check': L.BadgeCheck,
  thermometer: L.Thermometer,
  building: L.Building2,
  scroll: L.ScrollText,
  send: L.Send,
} as const;

const BRANDS = {
  line: siLine,
  facebook: siFacebook,
  instagram: siInstagram,
  tiktok: siTiktok,
} as const;

export type LucideName = keyof typeof LUCIDE;
export type BrandName = keyof typeof BRANDS;
export type IconName = LucideName | BrandName;

export const BRAND_COLORS: Record<BrandName, string> = {
  line: '#06C755',
  facebook: '#0866FF',
  instagram: '#E4405F',
  tiktok: '#000000',
};

export function iconSvg(name: IconName, cls = 'h-5 w-5', strokeWidth = 1.8): string {
  if (name in BRANDS) {
    const b = BRANDS[name as BrandName];
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="${b.path}"/></svg>`;
  }
  return LUCIDE[name as LucideName]
    .replace(/class="[^"]*"/, `class="${cls}" aria-hidden="true" focusable="false"`)
    .replace(/\s*width="24"\s*height="24"/, '')
    .replace(/stroke-width="2"/, `stroke-width="${strokeWidth}"`);
}
