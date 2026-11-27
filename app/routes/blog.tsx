// 블로그 입구 - 최근 글, 갈래별 짧은 기록, 일기 달력 (이전 메인 화면의 본문)
import { Link } from 'react-router';
import type { Route } from './+types/blog';
import { excerpt, getCollection, readMin } from '~/lib/content.server';
import { Shell } from '~/components/Shell';
import { DiaryCalendar } from '~/components/DiaryCalendar';
import { newPostHref, useWriter } from '~/lib/writer';

export function meta() {
  return [{ title: "Blog · Taehyeon's" }, { name: 'description', content: '기록 · 개인 공부 · 실무 학습 · 일기' }];
}

export async function loader() {
  const posts = getCollection('posts')
    .slice(0, 5)
    .map((p) => ({ id: p.id, title: p.title, date: p.date, tags: p.tags, summary: p.summary, min: readMin(p.body) }));
  // 짧은 기록 - 따로 페이지가 없어 목록 페이지의 그 글 자리로
  const short = (name: 'study' | 'work') =>
    getCollection(name)
      .slice(0, 3)
      .map((e) => ({ id: e.id, title: e.title, date: e.date, excerpt: excerpt(e.body), href: `/${name}/#${e.id}` }));
  const written = Object.fromEntries(getCollection('diary').map((e) => [e.date, e.id]));
  return {
    posts,
    sections: [
      { id: 'study', label: 'Study', note: '개인 공부', items: short('study') },
      { id: 'work', label: 'Work', note: '실무 학습', items: short('work') },
    ],
    written,
    year: new Date().getFullYear(),
  };
}

function Note({ collection, children }: { collection?: string; children: string }) {
  const { writer } = useWriter();
  if (!collection || !writer) return <span className="h3-note">{children}</span>;
  return (
    <a className="h3-note writable" href={newPostHref(collection)}>
      {children}
    </a>
  );
}

function BlogBody({ data }: { data: Route.ComponentProps['loaderData'] }) {
  return (
    <div className="blog-home">
      <section>
        <h3>
          <i className="mk" />
          Post
          <Note collection="posts">기록</Note>
        </h3>
        <ul className="list">
          {data.posts.map((p) => (
            <li key={p.id}>
              <Link to={`/posts/${p.id}`}>
                <span className="t">{p.title}</span>
                <span className="s">{p.summary}</span>
                <span className="li-meta">
                  <time>{p.date}</time>
                  <span className="tags">{p.tags.join(' / ')}</span>
                  <span className="min">{p.min} min</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {data.posts.length === 0 && <p className="empty">아직 글 없음</p>}
        <Link className="more" to="/posts">
          모든 글{' '}
          <svg viewBox="0 0 16 16">
            <path d="m6 4 4 4-4 4" />
          </svg>
        </Link>
      </section>

      {data.sections.map((g) => (
        <section key={g.id}>
          <h3>
            <i className="mk dim" />
            {g.label}
            <Note collection={g.id}>{g.note}</Note>
          </h3>
          <ul className="list log">
            {g.items.map((e) => (
              <li key={e.id}>
                <Link to={e.href}>
                  <span className="t">{e.title}</span>
                  <span className="s">{e.excerpt}</span>
                  <span className="li-meta">
                    <time>{e.date}</time>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {g.items.length === 0 && <p className="empty">아직 기록 없음</p>}
        </section>
      ))}

      <section>
        <h3>
          <i className="mk dim" />
          Diary
          <Note>일기</Note>
        </h3>
        <DiaryCalendar year={data.year} written={data.written} />
      </section>
    </div>
  );
}

export default function Blog({ loaderData }: Route.ComponentProps) {
  return (
    <Shell>
      <BlogBody data={loaderData} />
    </Shell>
  );
}
