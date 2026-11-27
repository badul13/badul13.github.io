import fs from 'node:fs';
import { type RouteConfig, index, route } from '@react-router/dev/routes';

// 글 상세 - 글이 하나라도 있을 때만 등록 (ssr:false 에서는 로더 있는 경로를 전부 미리 구워야 해서, 0건이면 빌드 실패)
const hasPosts = fs.existsSync('src/content/posts') && fs.readdirSync('src/content/posts').some((f) => /\.mdx?$/.test(f));

// 기존 블로그 주소(/posts /study /work /diary /write) 유지 - 나간 링크 보존, Worker 무수정
export default [
  index('routes/home.tsx'),
  route('projects/:id', 'routes/project.tsx'),
  route('blog', 'routes/blog.tsx'),
  route('posts', 'routes/posts.tsx'),
  ...(hasPosts ? [route('posts/:slug', 'routes/post.tsx')] : []),
  route('study', 'routes/log.tsx', { id: 'study' }),
  route('work', 'routes/log.tsx', { id: 'work' }),
  route('diary', 'routes/diary.tsx'),
  route('diary/:date', 'routes/diary-day.tsx'),
  route('write', 'routes/write.tsx'),
] satisfies RouteConfig;
