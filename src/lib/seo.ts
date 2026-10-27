import { SITE } from '../data/site';
import { STAY_TYPES } from '../data/stay-types';
import { AMENITIES } from '../data/amenities';
import type { Faq } from '../data/faqs';
import { stayCapacity, stayPrice, type Stay, type Zone } from './stays';

export interface Crumb {
  name: string;
  href: string;
}

const abs = (path: string) => new URL(path, SITE.url).href;

export function breadcrumbLd(items: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.href),
    })),
  };
}

export function faqLd(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function itemListLd(stays: Stay[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: stays.length,
    itemListElement: stays.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: abs(`/stays/${s.id}`),
      name: s.data.name,
    })),
  };
}

export function lodgingLd(stay: Stay, zone: Zone) {
  const d = stay.data;
  const c = d.contacts;
  const price = stayPrice(stay);
  const cap = stayCapacity(stay);
  const sameAs = [c.facebook, c.website, c.instagram, c.tiktok, c.line?.url, d.location?.googleMapsUrl].filter(Boolean);
  const locality = [zone.data.subdistrict && `ต.${zone.data.subdistrict}`, zone.data.district && `อ.${zone.data.district}`]
    .filter(Boolean)
    .join(' ');
  return {
    '@context': 'https://schema.org',
    '@type': STAY_TYPES[d.type].schema,
    '@id': abs(`/stays/${stay.id}#lodging`),
    name: d.name,
    ...(d.nameEn && { alternateName: d.nameEn }),
    description: d.summary,
    url: abs(`/stays/${stay.id}`),
    ...(d.images.length && { image: d.images.map((i) => abs(i.src)) }),
    ...(c.phones[0] && { telephone: c.phones[0].number }),
    ...(c.email && { email: c.email }),
    address: {
      '@type': 'PostalAddress',
      ...(d.location?.address && { streetAddress: d.location.address }),
      ...(locality && { addressLocality: locality }),
      addressRegion: 'เชียงใหม่',
      addressCountry: 'TH',
    },
    ...(d.location?.lat != null &&
      d.location.lng != null && {
        geo: { '@type': 'GeoCoordinates', latitude: d.location.lat, longitude: d.location.lng },
      }),
    ...(d.location?.googleMapsUrl && { hasMap: d.location.googleMapsUrl }),
    ...(price && { priceRange: `THB ${price.min}${price.max !== price.min ? '–' + price.max : ''}` }),
    currenciesAccepted: 'THB',
    ...(d.checkIn && { checkinTime: d.checkIn }),
    ...(d.checkOut && { checkoutTime: d.checkOut }),
    ...(cap && { numberOfRooms: cap.units }),
    amenityFeature: d.amenities.map((a) => ({
      '@type': 'LocationFeatureSpecification',
      name: AMENITIES[a].label,
      value: true,
    })),
    ...(d.amenities.includes('pet-friendly') && { petsAllowed: true }),
    ...(d.rooms.length && {
      makesOffer: d.rooms.map((r) => ({
        '@type': 'Offer',
        name: r.name,
        ...(r.price && { price: r.price.weekday, priceCurrency: 'THB' }),
        ...(r.description && { description: r.description }),
        itemOffered: {
          '@type': d.type === 'tent' ? 'Accommodation' : 'HotelRoom',
          name: r.name,
          ...(r.beds && { bed: r.beds }),
          occupancy: { '@type': 'QuantitativeValue', maxValue: r.maxGuests },
          ...(r.size && { floorSize: { '@type': 'QuantitativeValue', value: r.size, unitCode: 'MTK' } }),
        },
      })),
    }),
    ...(sameAs.length && { sameAs }),
  };
}

export function websiteLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE.name,
      alternateName: SITE.nameTh,
      url: SITE.url,
      inLanguage: 'th-TH',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE.url}/stays?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE.name,
      url: SITE.url,
      logo: abs('/favicon.svg'),
    },
  ];
}
