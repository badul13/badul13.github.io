// 포트폴리오 공용 조각 - 번호 네비, 섹션 제목, 점선 태그
import { Link } from 'react-router';

export const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'career', label: 'Career' },
  { id: 'stack', label: 'Stack' },
  { id: 'work', label: 'Work' },
  { id: 'side', label: 'Side' },
  { id: 'education', label: 'Education' },
  { id: 'contact', label: 'Contact' },
];

const num = (i: number) => String(i + 1).padStart(2, '0');

/** 고정 네비 - 섹션 번호 + 블로그 입구. 첫 화면에서는 배너가 지나간 뒤 등장 */
export function PortfolioNav({ hideUntilScroll = false }: { hideUntilScroll?: boolean }) {
  return (
    <header className={hideUntilScroll ? 'pf-nav wait' : 'pf-nav'}>
      <div className="pf-nav-in">
        <Link className="pf-logo" to="/">
          badul13<span>.</span>
        </Link>
        <nav className="pf-menu">
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`/#${s.id}`}>
              <small>{num(i)}</small>
              {s.label}
            </a>
          ))}
          <Link className="pf-blog" to="/blog">
            Blog
            <svg viewBox="0 0 16 16">
              <path d="M5 11 11 5M6 5h5v5" />
            </svg>
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** 섹션 제목 - 번호 + 외곽선 큰 글씨 + 화살표 */
export function SecTitle({ id }: { id: string }) {
  const i = SECTIONS.findIndex((s) => s.id === id);
  return (
    <div className="sec-title">
      <span className="sec-n">{num(i)}</span>
      <h2 className="sec-word">{SECTIONS[i].label.toUpperCase()}</h2>
      <svg className="sec-arrow" viewBox="0 0 96 40" aria-hidden="true">
        <path d="M4 20h84M70 4l18 16-18 16" />
      </svg>
    </div>
  );
}

export function Chips({ items }: { items: string[] }) {
  return (
    <ul className="chips">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}
