// 빌드 뒤 RSS·사이트맵 생성 - build/client 에 기록
// RSS - posts 만 (work 는 회사 일기라 제외)
// 사이트맵 - /write 제외, 이전 Astro 사이트맵과 같은 파일 이름(sitemap-index.xml, sitemap-0.xml)
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const SITE = 'https://badul13.github.io';
const OUT = path.resolve('build/client');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const posts = fs.existsSync('src/content/posts')
  ? fs
      .readdirSync('src/content/posts')
      .filter((f) => /\.mdx?$/.test(f))
      .map((f) => ({ id: f.replace(/\.mdx?$/, ''), ...matter.read(path.join('src/content/posts', f)).data }))
      .filter((p) => p.draft !== true && p.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  : [];

const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>badul13</title><description></description><link>${SITE}/</link>${posts
  .map(
    (p) =>
      `<item><title>${esc(p.title)}</title><link>${SITE}/posts/${p.id}/</link><guid isPermaLink="true">${SITE}/posts/${p.id}/</guid><description>${esc(p.summary ?? '')}</description><pubDate>${new Date(p.date).toUTCString()}</pubDate></item>`,
  )
  .join('')}</channel></rss>`;
fs.writeFileSync(path.join(OUT, 'rss.xml'), rss);

// 프리렌더된 페이지 = index.html 이 있는 폴더
const pages = [];
const walk = (dir, rel) => {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, `${rel}${name}/`);
    else if (name === 'index.html') pages.push(rel);
  }
};
walk(OUT, '/');
const urls = pages.filter((p) => !p.startsWith('/write')).sort();
fs.writeFileSync(
  path.join(OUT, 'sitemap-0.xml'),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map((u) => `<url><loc>${SITE}${u}</loc></url>`)
    .join('')}</urlset>`,
);
fs.writeFileSync(
  path.join(OUT, 'sitemap-index.xml'),
  `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE}/sitemap-0.xml</loc></sitemap></sitemapindex>`,
);
console.log(`feeds: rss ${posts.length}건, sitemap ${urls.length}건`);
