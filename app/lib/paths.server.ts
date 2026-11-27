// 빌드 때 정적 HTML 로 굽는 주소 전부
import { getCollection } from './content.server';
import { allDays } from './calendar';
import { work } from '../data/portfolio';

export function prerenderPaths() {
  const year = new Date().getFullYear();
  return [
    '/',
    ...work.map((w) => `/projects/${w.id}`),
    '/blog',
    '/posts',
    ...getCollection('posts').map((p) => `/posts/${p.id}`),
    '/study',
    '/work',
    '/diary',
    ...allDays(year).map((d) => `/diary/${d}`),
    '/write',
  ];
}
