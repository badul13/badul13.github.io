// 일기 달력 - 숫자만, 글 있는 날은 아래 점
// 로그인한 브라우저 - 한 번 클릭은 그 날 보기, 더블클릭은 쓰기(글이 있으면 수정)
// 첫 클릭 이동 보류 - 링크 그대로 두면 두 번째 클릭 전에 페이지 이동
import { useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { months, WEEKDAYS } from '~/lib/calendar';
import { editHref, newPostHref, useWriter } from '~/lib/writer';

export function DiaryCalendar({ year, written }: { year: number; written: Record<string, string> }) {
  const { writer } = useWriter();
  const navigate = useNavigate();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onClick = (event: React.MouseEvent, day: string) => {
    if (!writer) return;
    event.preventDefault();
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => navigate(`/diary/${day}`), 220);
  };
  const onDoubleClick = (event: React.MouseEvent, day: string) => {
    if (!writer) return;
    event.preventDefault();
    if (pending.current) clearTimeout(pending.current);
    // 작성 화면은 새로 불러와야 하므로 전체 이동
    location.href = written[day] ? editHref('diary', written[day]) : newPostHref('diary', day);
  };

  return (
    <div className="cal-year">
      {months(year).map((m) => (
        <div className="cal" key={m.label}>
          <h2>{m.label}</h2>
          <div className="cal-grid">
            {WEEKDAYS.map((w) => (
              <span className="cal-head" key={w}>
                {w}
              </span>
            ))}
            {m.cells.map((day, i) =>
              day === null ? (
                <span className="cal-cell empty" key={`e${i}`} />
              ) : (
                <Link
                  key={day}
                  to={`/diary/${day}`}
                  className={written[day] ? 'cal-cell has' : 'cal-cell'}
                  onClick={(e) => onClick(e, day)}
                  onDoubleClick={(e) => onDoubleClick(e, day)}
                >
                  {Number(day.slice(8))}
                </Link>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
