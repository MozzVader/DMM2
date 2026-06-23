import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://mozzvader.github.io',
  base: '/DMM2',
  build: {
    assets: 'assets',
  },
  prefetch: {
    defaultStrategy: 'viewport',
  },
  integrations: [
    sitemap(),
  ],
});