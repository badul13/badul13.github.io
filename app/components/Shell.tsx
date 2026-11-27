// 블로그 쪽 껍데기 - 네비, 왼쪽 프로필, 본문 폭, 푸터 (이전 Base.astro)
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { WriterProvider } from '~/lib/writer';
import { profile } from '~/data/portfolio';

const NAV = [
  { to: '/blog', label: 'Blog' },
  { to: '/posts', label: 'Post' },
  { to: '/study', label: 'Study' },
  { to: '/work', label: 'Work' },
  { to: '/diary', label: 'Diary' },
];

export function Nav({ className = '' }: { className?: string }) {
  return (
    <header className={`nav ${className}`}>
      <div className="nav-in">
        <Link className="nav-home" to="/">
          Portfolio
        </Link>
        <nav className="menu">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'on' : undefined)}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function Profile({ className = '' }: { className?: string }) {
  return (
    <aside className={`side ${className}`}>
      <img className="pfp" src="/art/avatar.jpg" width={60} height={60} alt={profile.name} />
      <div>
        <h2>{profile.name}</h2>
        <p className="role">{profile.role}</p>
        <div className="links">
          <a href={profile.github}>GitHub</a>
          <span className="dotsep" />
          <a href={`mailto:${profile.mail}`}>Mail</a>
        </div>
      </div>
    </aside>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <span className="dots" aria-hidden="true" />© Taehyeon Jeong | {new Date().getFullYear()}
    </footer>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <WriterProvider>
      <Nav />
      <div className="content">
        <Profile />
        <main>
          {children}
          <Footer />
        </main>
      </div>
    </WriterProvider>
  );
}
