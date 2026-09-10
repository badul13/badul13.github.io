import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

// posts만 노출. log(회사 일기)는 피드에 넣지 않는다.
export async function GET(context) {
  const posts = (await getCollection('posts')).filter((p) => !p.data.draft);
  return rss({
    title: 'badul13',
    description: '', // TODO: 피드 설명
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.summary ?? '',
      pubDate: p.data.date,
      link: `/posts/${p.id}/`,
    })),
  });
}
