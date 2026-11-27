// 실무 카드 상세 - 대표 기능 · 정비 · 트러블슈팅
import { Link } from 'react-router';
import type { Route } from './+types/project';
import { Chips, PortfolioNav } from '~/components/PortfolioParts';
import { work } from '~/data/portfolio';
import '~/styles/portfolio.css';

export async function loader({ params }: Route.LoaderArgs) {
  const index = work.findIndex((w) => w.id === params.id);
  if (index < 0) throw new Response('Not Found', { status: 404 });
  return { index };
}

export function meta({ data }: Route.MetaArgs) {
  const w = data ? work[data.index] : null;
  return w ? [{ title: `${w.title} · Portfolio` }, { name: 'description', content: w.summary }] : [{ title: 'Portfolio' }];
}

export default function Project({ loaderData }: Route.ComponentProps) {
  const w = work[loaderData.index];
  const prev = work[loaderData.index - 1];
  const next = work[loaderData.index + 1];
  return (
    <div className="pf-page">
      <PortfolioNav />
      <main className="pf detail">
        <p className="detail-back">
          <Link to="/#work">← Work</Link>
        </p>
        <span className="sec-n">W{loaderData.index + 1}</span>
        <h1 className="detail-title">{w.title}</h1>
        <p className="detail-summary">{w.summary}</p>

        <dl className="detail-meta">
          <div>
            <dt>기간</dt>
            <dd>{w.period}</dd>
          </div>
          <div>
            <dt>맡은 부분</dt>
            <dd>{w.role}</dd>
          </div>
          <div>
            <dt>기술</dt>
            <dd>
              <Chips items={w.tags} />
            </dd>
          </div>
        </dl>

        {w.sections.map((s) => (
          <section className="detail-sec" key={s.heading}>
            <h2>{s.heading}</h2>
            {s.stories?.map((story) => (
              <article className="story" key={story.title}>
                <h3>{story.title}</h3>
                <dl>
                  {story.rows.map((r) => (
                    <div className={r.label ? 'story-row' : 'story-row plain'} key={r.text}>
                      {r.label && <dt>{r.label}</dt>}
                      <dd>
                        {r.text}
                        {r.list && (
                          <ul>
                            {r.list.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
            <ul>
              {(s.items ?? []).map((item) => {
                const [head, ...body] = item.split(' - ');
                return (
                  <li key={item}>
                    {body.length ? (
                      <>
                        <b>{head}</b>
                        <span>{body.join(' - ')}</span>
                      </>
                    ) : (
                      <span>{item}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {w.troubles.length > 0 && (
          <section className="detail-sec">
            <h2>트러블슈팅</h2>
            <div className="troubles">
              {w.troubles.map((t) => (
                <article key={t.title}>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <nav className="detail-pager">
          {prev ? (
            <Link to={`/projects/${prev.id}`}>
              <small>이전</small>
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link className="next" to={`/projects/${next.id}`}>
              <small>다음</small>
              {next.title}
            </Link>
          ) : (
            <span />
          )}
        </nav>

        <footer className="foot pf-foot">
          <span className="dots" aria-hidden="true" />© Taehyeon Jeong | {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  );
}
