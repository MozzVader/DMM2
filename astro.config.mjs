import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://dosminutosmas.pages.dev',
  base: '/',
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