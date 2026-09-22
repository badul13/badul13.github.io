// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// user site(badul13.github.io)라 base는 루트, 별도 설정 불필요
export default defineConfig({
  site: 'https://badul13.github.io',
  // /write 는 나만 쓰는 작성 화면이라 사이트맵에서 뺀다.
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/write') })],
});
