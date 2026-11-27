// 첫 화면 배너 - 화면 전체가 모니터 (이전 블로그 메인 배너 그대로)
// 고정 배치, 스크롤하면 제자리에서 아래쪽부터 사라짐
// 날짜 장치 - 화면 아래 스프링 부트 기동 로그에 방문한 날의 시각
import { useEffect, useState } from 'react';

const CODE = [
  '<span class="ln">17</span> <span class="ann">@SpringBootApplication</span>',
  '<span class="ln">18</span> <span class="kw">public class</span> <span class="cls">Badul13Application</span> {',
  '<span class="ln">19</span>   <span class="kw">public static void</span> <span class="fn">main</span>(<span class="cls">String</span>[] args) {',
  '<span class="ln">20</span>     <span class="cls">SpringApplication</span>.<span class="fn">run</span>(<span class="cls">Badul13Application</span>.<span class="kw">class</span>, args);',
  '<span class="ln">21</span>   }',
  '<span class="ln">22</span> }',
  '<span class="ln">23</span>',
  '<span class="ln">24</span> <span class="ann">@RestController</span>',
  '<span class="ln">25</span> <span class="ann">@RequiredArgsConstructor</span>',
  '<span class="ln">26</span> <span class="kw">class</span> <span class="cls">ProjectController</span> {',
  '<span class="ln">27</span>   <span class="kw">private final</span> <span class="cls">ProjectService</span> service;',
  '<span class="ln">28</span>',
  '<span class="ln">29</span>   <span class="ann">@GetMapping</span>(<span class="str">"/projects/&#123;id&#125;"</span>)',
  '<span class="ln">30</span>   <span class="cls">ResponseEntity</span>&lt;<span class="cls">Project</span>&gt; <span class="fn">get</span>(<span class="ann">@PathVariable</span> <span class="cls">String</span> id) {',
  '<span class="ln">31</span>     <span class="kw">return</span> <span class="cls">ResponseEntity</span>.<span class="fn">ok</span>(service.<span class="fn">find</span>(id));  <span class="cmt">// 200 OK</span>',
  '<span class="ln">32</span>   }',
  '<span class="ln">33</span> }',
].join('\n');

const TITLE = "Taehyeon's portfolio";
const SUB = 'Started badul13 in 0.42 seconds';

/** 2026-11-27T21:04:13.512+09:00 모양 - 방문자 시간대 기준 */
function stamp(date: Date) {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const tz = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}${tz}`
  );
}

export function Hero() {
  const [title, setTitle] = useState('');
  const [sub, setSub] = useState('');
  const [phase, setPhase] = useState<'title' | 'sub'>('title');
  const [log, setLog] = useState<string[]>([]);

  // 기동 로그 - 서버 렌더와 어긋나지 않게 마운트 뒤에 채움
  useEffect(() => {
    const now = new Date();
    const later = new Date(now.getTime() + 420);
    setLog([
      `${stamp(now)}  INFO 1 --- [badul13] [main] c.b.Badul13Application : Starting Badul13Application using Java 21`,
      `${stamp(later)}  INFO 1 --- [badul13] [main] c.b.Badul13Application : ${SUB} (process running for 0.61)`,
    ]);
  }, []);

  // 문구 - 제목을 찍고 그다음 부제
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTitle(TITLE);
      setSub(SUB);
      setPhase('sub');
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const type = (text: string, set: (s: string) => void, min: number, jit: number, done?: () => void) => {
      let i = 0;
      const tick = () => {
        set(text.slice(0, ++i));
        if (i < text.length) timers.push(setTimeout(tick, min + Math.random() * jit));
        else done?.();
      };
      tick();
    };
    timers.push(
      setTimeout(
        () =>
          type(TITLE, setTitle, 88, 62, () =>
            timers.push(
              setTimeout(() => {
                setPhase('sub');
                type(SUB, setSub, 34, 26);
              }, 340),
            ),
          ),
        420,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // 스크롤 진행도 - 배너 흐려짐(--p --pe), 네비 등장
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const vh = innerHeight;
        const y = scrollY;
        const room = (document.scrollingElement!.scrollHeight - vh) * 0.88;
        const range = Math.max(1, Math.min(vh * 0.95, room));
        const p = Math.min(1, Math.max(0, y / range));
        root.style.setProperty('--p', p.toFixed(4));
        root.style.setProperty('--pe', (p * p * (3 - 2 * p)).toFixed(4));
        root.classList.toggle('past-hero', y > vh * 0.8);
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    onScroll();
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
      root.classList.remove('past-hero');
      root.style.removeProperty('--p');
      root.style.removeProperty('--pe');
    };
  }, []);

  return (
    <>
      <div className="hero" aria-hidden="true">
        <div className="hero-art" />
        <div className="screen">
          <pre className="code" dangerouslySetInnerHTML={{ __html: CODE }} />
          <pre className="boot-log">{log.join('\n')}</pre>
        </div>
      </div>
      <div className="hero-mid">
        <h1>
          <span>{title}</span>
          <span className={phase === 'title' ? 'caret' : 'caret gone'} aria-hidden="true" />
        </h1>
        <p>
          <span>{sub}</span>
          <span className={phase === 'sub' ? 'caret slow' : 'caret hidden'} aria-hidden="true" />
        </p>
        <span className="cue">
          <svg viewBox="0 0 16 16">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </span>
      </div>
      <div className="gap" />
    </>
  );
}
