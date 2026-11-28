// 포트폴리오 첫 화면 - 배너 → 01 About ~ 07 Contact
// 구성 참고 - 번호 섹션(mjaedot), 맡은 부분이 보이는 카드(namhyebin), 날짜 장치 하나(nykim)
import { useEffect } from 'react';
import { Link } from 'react-router';
import { Hero } from '~/components/Hero';
import { Chips, PortfolioNav, SecTitle } from '~/components/PortfolioParts';
import { career, education, educationFolded, profile, school, sideProjects, stack, work, type School } from '~/data/portfolio';
import '~/styles/portfolio.css';

export function meta() {
  return [
    { title: `${profile.name} · ${profile.nameEn} | Portfolio` },
    { name: 'description', content: '사내 AI 플랫폼 백엔드 개발자 정태현의 포트폴리오' },
  ];
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m6 4 4 4-4 4" />
    </svg>
  );
}

function SchoolRow({ s }: { s: School }) {
  return (
    <li className="edu-row">
      <span className="edu-period">{s.period}</span>
      <div>
        <b>{s.title}</b>
        <p>{s.summary}</p>
        <Chips items={s.tags} />
      </div>
      {s.href && (
        <a className="edu-link" href={s.href} target="_blank" rel="noreferrer">
          GitHub
        </a>
      )}
    </li>
  );
}

/** 실무·사이드 카드 전체를 가장 큰 카드 높이로 통일 - 기술 스택은 CSS로 카드 아래 고정 */
function useEqualCards() {
  useEffect(() => {
    const cards = [...document.querySelectorAll<HTMLElement>('.pf .card')];
    const fit = () => {
      cards.forEach((c) => (c.style.minHeight = ''));
      const max = Math.max(...cards.map((c) => c.offsetHeight));
      cards.forEach((c) => (c.style.minHeight = `${max}px`));
    };
    fit();
    // 폭이 바뀔 때만 다시 잼 - 높이 변화에 반응하면 자기 자신을 다시 부름
    let width = innerWidth;
    const ro = new ResizeObserver(() => {
      if (innerWidth === width) return;
      width = innerWidth;
      fit();
    });
    ro.observe(document.querySelector('.pf') as Element);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, []);
}

export default function Home() {
  const [lead, ...rest] = education;
  useEqualCards();
  return (
    <div className="pf-page">
      <Hero />
      <PortfolioNav hideUntilScroll />

      <main className="pf">
        {/* 01 About */}
        <section id="about" className="pf-sec">
          <SecTitle id="about" />
          <div className="about">
            <div className="about-card">
              <img src="/art/photo.jpg" width={150} height={210} alt={profile.name} />
              <b>{profile.name}</b>
              <span>{profile.role}</span>
              <a href={profile.github}>github.com/badul13</a>
            </div>
            <div className="about-text">
              {profile.intro.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <dl className="facts">
                {profile.facts.map((f) => (
                  <div key={f.k}>
                    <dt>{f.k}</dt>
                    <dd>
                      {f.v}
                      {f.sub?.map((x) => (
                        <span className="fact-sub" key={x}> · {x}</span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="about-bio">{profile.bio}</p>
            </div>
          </div>
        </section>

        {/* 02 Career */}
        <section id="career" className="pf-sec">
          <SecTitle id="career" />
          <ol className="timeline">
            {career.map((c) => (
              <li key={c.period} className={c.minor ? 'minor' : undefined}>
                <span className="tl-period">{c.period}</span>
                <div className="tl-body">
                  <b>{c.title}</b>
                  <span className="tl-org">{c.org}</span>
                  {c.points.length > 0 && (
                    <ul>
                      {c.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 03 Stack */}
        <section id="stack" className="pf-sec">
          <SecTitle id="stack" />
          <div className="stack">
            {stack.map((g) => (
              <div className="stack-row" key={g.group}>
                <span className="stack-group">{g.group}</span>
                <Chips items={g.items} />
              </div>
            ))}
          </div>
        </section>

        {/* 04 Work - 실무 (대표) */}
        <section id="work" className="pf-sec">
          <SecTitle id="work" />
          <p className="sec-lead">회사에서 만든 것</p>
          <div className="cards">
            {work.map((w) => (
              <article className="card" key={w.id}>
                <div className="card-screen" aria-hidden="true">
                  <span>
                    <span className="kw">GET</span> /projects/<span className="str">{w.id}</span>
                  </span>
                  <span className="ok">200 OK</span>
                </div>
                <div className="card-body">
                  <span className="card-period">{w.period}</span>
                  <h3 className="card-title">
                    {w.title}
                    {w.badge && <span className="badge card-badge">{w.badge}</span>}
                  </h3>
                  <p className="card-summary">{w.summary}</p>
                  <dl className="card-meta">
                    <dt>맡은 부분</dt>
                    <dd>{w.role}</dd>
                  </dl>
                  <ul className="card-points">
                    {w.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                  <Chips items={w.tags} />
                  <Link className="card-btn" to={`/projects/${w.id}`}>
                    자세히 보기 <Arrow />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 05 Side - 사이드 프로젝트 (부) */}
        <section id="side" className="pf-sec">
          <SecTitle id="side" />
          <div className="cards">
            {sideProjects.map((s) => (
              <article className="card" key={s.title}>
                <div className="card-screen" aria-hidden="true">
                  <span>
                    <span className="cmt">$</span> {s.screen.cmd}
                  </span>
                  <span className="ok">{s.screen.ok}</span>
                </div>
                <div className="card-body">
                  <span className="card-period">{s.period}</span>
                  <h3 className="card-title">{s.title}</h3>
                  <p className="card-summary">{s.summary}</p>
                  <dl className="card-meta">
                    <dt>맡은 부분</dt>
                    <dd>{s.role}</dd>
                  </dl>
                  <ul className="card-points">
                    {s.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                  <Chips items={s.tags} />
                  {s.href && (
                    <a className="card-btn" href={s.href} target="_blank" rel="noreferrer">
                      GitHub <Arrow />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 06 Education */}
        <section id="education" className="pf-sec">
          <SecTitle id="education" />
          <div className="school">
            <div>
              <b>{school.name}</b>
              <span>{school.period}</span>
            </div>
            <dl>
              <div>
                <dt>학점</dt>
                <dd>{school.gpa}</dd>
              </div>
              {school.extras.map((x) => (
                <div key={x}>
                  <dt>·</dt>
                  <dd>{x}</dd>
                </div>
              ))}
            </dl>
          </div>
          <article className="edu-lead">
            <div>
              <span className="card-period">{lead.period}</span>
              <h3 className="card-title">{lead.title}</h3>
              {lead.badge && <span className="badge">{lead.badge}</span>}
              <p className="card-summary">{lead.summary}</p>
              <ul className="card-points">
                {lead.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <Chips items={lead.tags} />
            </div>
            {lead.href && (
              <a className="card-btn" href={lead.href} target="_blank" rel="noreferrer">
                GitHub <Arrow />
              </a>
            )}
          </article>
          <ul className="edu-list">
            {rest.map((s) => (
              <SchoolRow key={s.title} s={s} />
            ))}
          </ul>
          <details className="edu-fold">
            <summary>AI 모델링 경험</summary>
            <ul className="edu-list">
              {educationFolded.map((s) => (
                <SchoolRow key={s.title} s={s} />
              ))}
            </ul>
          </details>
        </section>

        {/* 07 Contact */}
        <section id="contact" className="pf-sec">
          <SecTitle id="contact" />
          <div className="contact">
            <p className="contact-hand">Thanks for stopping by.</p>
            <ul>
              <li>
                <span>GitHub</span>
                <a href={profile.github}>github.com/badul13</a>
              </li>
              <li>
                <span>Blog</span>
                <Link to="/blog">badul13.github.io/blog</Link>
              </li>
              <li>
                <span>Mail</span>
                <a href={`mailto:${profile.mail}`}>{profile.mail}</a>
              </li>
            </ul>
          </div>
        </section>

        <footer className="foot pf-foot">
          <span className="dots" aria-hidden="true" />© Taehyeon Jeong | {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  );
}
