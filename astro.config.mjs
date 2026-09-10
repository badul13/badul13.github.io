// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// user site(badul13.github.io)라 base는 루트, 별도 설정 불필요
export default defineConfig({
  site: 'https://badul13.github.io',
  integrations: [mdx(), sitemap()],
});
