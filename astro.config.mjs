import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { remarkReadingTime } from './src/plugins/remarkReadingTime.ts';

export default defineConfig({
  site: 'https://engineer-news.pages.dev',
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true }
  }),
  integrations: [react(), sitemap()],
  markdown: {
    remarkPlugins: [remarkReadingTime],
  },
  i18n: {
    defaultLocale: 'zh-TW',
    locales: ['zh-TW', 'en'],
    routing: { prefixDefaultLocale: false }
  }
});
