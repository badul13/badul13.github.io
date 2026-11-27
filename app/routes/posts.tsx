import { Link } from 'react-router';
import type { Route } from './+types/posts';
import { getCollection, readMin } from '~/lib/content.server';
import { Shell } from '~/components/Shell';

export function meta() {
  return [{ title: 'Post · badul13' }];
}

export async function loader() {
  return {
    posts: getCollection('posts').map((p) => ({
      id: p.id,
      title: p.title,
      date: p.date,
      tags: p.tags,
      summary: p.summary,
      min: readMin(p.body),
    })),
  };
}

export default function Posts({ loaderData }: Route.ComponentProps) {
  const { posts } = loaderData;
  return (
    <Shell>
      <div className="page-head">
        <h1>Post</h1>
      </div>
      <ul className="list">
        {posts.map((p) => (
          <li key={p.id}>
            <Link to={`/posts/${p.id}`}>
              <span className="t">{p.title}</span>
              {p.summary && <span className="s">{p.summary}</span>}
              <span className="li-meta">
                <time>{p.date}</time>
                <span className="tags">{p.tags.join(' / ')}</span>
                <span className="min">{p.min} min</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {posts.length === 0 && <p className="empty">아직 글 없음</p>}
    </Shell>
  );
}
