import { Link } from 'react-router';
import type { Route } from './+types/post';
import { getCollection, renderMarkdown } from '~/lib/content.server';
import { Shell } from '~/components/Shell';
import { editHref, useWriter } from '~/lib/writer';

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: 'badul13' }];
  return [{ title: `${data.title} · badul13` }, { name: 'description', content: data.summary }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const post = getCollection('posts').find((p) => p.id === params.slug);
  if (!post) throw new Response('Not Found', { status: 404 });
  return {
    id: post.id,
    title: post.title,
    date: post.date,
    tags: post.tags,
    summary: post.summary,
    html: await renderMarkdown(post.body),
  };
}

type Post = Route.ComponentProps['loaderData'];

/** 수정 링크 - WriterProvider(Shell) 안에서 읽어야 해서 따로 */
function EditLink({ id }: { id: string }) {
  const { me } = useWriter();
  if (!me) return null;
  return (
    <a className="edit-link" href={editHref('posts', id)}>
      수정
    </a>
  );
}

function Article({ post }: { post: Post }) {
  return (
    <>
      <article className="prose">
        <h1 style={{ marginBottom: 4 }}>{post.title}</h1>
        <p className="muted small" style={{ marginTop: 0 }}>
          <time dateTime={post.date}>{post.date}</time>
          {post.tags.length > 0 && ' · ' + post.tags.join(', ')}
          <EditLink id={post.id} />
        </p>
        <div dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>
      <p className="small">
        <Link to="/posts">← 목록으로</Link>
      </p>
    </>
  );
}

export default function PostPage({ loaderData }: Route.ComponentProps) {
  return (
    <Shell>
      <Article post={loaderData} />
    </Shell>
  );
}
