// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// เปลี่ยนเป็นโดเมนจริงก่อน deploy (ใช้สร้าง canonical URL, sitemap และ JSON-LD)
export default defineConfig({
  site: 'https://www.angkhang.today',
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
