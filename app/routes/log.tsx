// Study · Work 공용 - 짧은 기록을 한 페이지에 타임라인으로 (같은 파일, 라우트 id 로 갈래 구분)
import type { Route } from './+types/log';
import { getCollection, renderMarkdown } from '~/lib/content.server';
import { Shell } from '~/components/Shell';
import { editHref, useWriter } from '~/lib/writer';

const LABEL = { study: 'Study', work: 'Work' } as const;
type Name = keyof typeof LABEL;

const nameOf = (url: string): Name => (new URL(url).pathname.startsWith('/work') ? 'work' : 'study');

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data ? LABEL[data.name] : 'Log'} · badul13` }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const name = nameOf(request.url);
  const entries = await Promise.all(
    getCollection(name).map(async (e) => ({ id: e.id, title: e.title, date: e.date, html: await renderMarkdown(e.body) })),
  );
  return { name, entries };
}

function EditLink({ name, id }: { name: Name; id: string }) {
  const { me } = useWriter();
  if (!me) return null;
  return (
    <a className="edit-link" href={editHref(name, id)}>
      수정
    </a>
  );
}

export default function Log({ loaderData }: Route.ComponentProps) {
  const { name, entries } = loaderData;
  return (
    <Shell>
      <div className="page-head">
        <h1>{LABEL[name]}</h1>
      </div>
      <div style={{ marginTop: 32 }}>
        {entries.map((entry) => (
          <div className="log-entry" id={entry.id} key={entry.id}>
            <div className="log-head">
              <h3>{entry.title}</h3>
              <span className="log-actions">
                <EditLink name={name} id={entry.id} />
              </span>
            </div>
            <time className="muted small" dateTime={entry.date}>
              {entry.date}
            </time>
            <div className="log-body" dangerouslySetInnerHTML={{ __html: entry.html }} />
          </div>
        ))}
        {entries.length === 0 && <p className="muted small">아직 기록 없음</p>}
      </div>
    </Shell>
  );
}
