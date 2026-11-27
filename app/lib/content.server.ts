// 글 읽기 - 빌드 때만 실행 (로더·프리렌더 목록 전용, 브라우저 번들 제외)
// 글 위치 - src/content/<컬렉션>/<이름>.md (Worker 커밋 경로와 동일, 바꾸면 Worker 도 수정)
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkSmartypants from 'remark-smartypants';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeShiki from '@shikijs/rehype';
import rehypeStringify from 'rehype-stringify';

export type CollectionName = 'posts' | 'study' | 'work' | 'diary';

export type Entry = {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  summary: string;
  tags: string[];
  body: string;
};

const ROOT = path.resolve('src/content');

/** 날짜 - 프런트매터 값을 YYYY-MM-DD 로 (YAML 날짜는 UTC 자정이라 ISO 앞부분이 그 날) */
function day(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? '' : date.toISOString().slice(0, 10);
}

/** 컬렉션 전체 - 초안 제외, 최신순 */
export function getCollection(name: CollectionName): Entry[] {
  const dir = path.join(ROOT, name);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
      return {
        id: file.replace(/\.mdx?$/, ''),
        title: String(data.title ?? ''),
        date: day(data.date),
        summary: String(data.summary ?? ''),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        body: content,
        draft: data.draft === true,
      };
    })
    .filter((entry) => !entry.draft && entry.date)
    .map(({ draft: _draft, ...entry }) => entry)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// 마크다운 규칙 - 이전 Astro 설정과 동일 (GFM, 줄바꿈 하나 = <br>, 따옴표 다듬기, github-dark 코드 강조)
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkSmartypants)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeShiki, { theme: 'github-dark', defaultLanguage: 'plaintext', fallbackLanguage: 'plaintext', lazy: true })
  .use(rehypeStringify);

export async function renderMarkdown(markdown: string) {
  return String(await processor.process(markdown));
}

/** 목록 발췌 - 제목·빈 줄·구분선·코드 블록을 건너뛴 첫 문단, 마크다운 기호 제거 */
export function excerpt(body: string) {
  const plain = (text: string) =>
    text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s*(?:>|[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/gm, '')
      .replace(/[*_~`]+/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  return (
    body
      .split(/\n\s*\n/)
      .filter((block) => !/^\s*(#{1,6}\s|&nbsp;\s*$|(?:-{3,}|\*{3,})\s*$|```)/.test(block))
      .map(plain)
      .find(Boolean) ?? ''
  );
}

/** 읽는 시간 - 500자당 1분 */
export const readMin = (body: string) => Math.max(1, Math.round(body.length / 500));
