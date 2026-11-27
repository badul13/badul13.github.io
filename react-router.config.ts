import type { Config } from '@react-router/dev/config';
import { prerenderPaths } from './app/lib/paths.server';

// GitHub Pages - 서버 없이 빌드 때 모든 주소를 정적 HTML 로 굽기
// 글 추가 - /write → Worker 커밋 → Actions 재빌드로 반영
export default {
  appDirectory: 'app',
  ssr: false,
  prerender: prerenderPaths,
} satisfies Config;
