import { Link } from 'react-router';
import type { Route } from './+types/diary-day';
import { getCollection, renderMarkdown } from '~/lib/content.server';
import { Shell } from '~/components/Shell';
import { editHref, useWriter } from '~/lib/writer';

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `${params.date} · 일기` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const entry = getCollection('diary').find((e) => e.date === params.date);
  return {
    date: params.date,
    entry: entry ? { id: entry.id, title: entry.title, html: await renderMarkdown(entry.body) } : null,
  };
}

function EditLink({ id }: { id: string }) {
  const { me } = useWriter();
  if (!me) return null;
  return (
    <a className="edit-link" href={editHref('diary', id)}>
      수정
    </a>
  );
}

export default function DiaryDay({ loaderData }: Route.ComponentProps) {
  const { date, entry } = loaderData;
  return (
    <Shell>
      <p className="muted small">
        <Link to="/diary">← 달력</Link>
      </p>
      <h1>{date}</h1>
      {entry ? (
        <div className="log-body" style={{ marginTop: 24 }}>
          <h2>
            {entry.title}
            <EditLink id={entry.id} />
          </h2>
          <div dangerouslySetInnerHTML={{ __html: entry.html }} />
        </div>
      ) : (
        <p className="muted small" style={{ marginTop: 24 }}>
          이 날은 기록 없음
        </p>
      )}
    </Shell>
  );
}
