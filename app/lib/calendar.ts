// 일기 달력 - /blog 와 /diary 공용, 올해 9~12월
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const FIRST_MONTH = 8; // 0 기준 - 9월
const MONTHS = 4;

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export type Month = { label: string; cells: (string | null)[] };

/** 달마다 42칸(6주) - 달끼리 높이 같게 */
export function months(year: number): Month[] {
  return Array.from({ length: MONTHS }, (_, i) => {
    const month = FIRST_MONTH + i;
    const cells: (string | null)[] = [
      ...Array.from({ length: new Date(year, month, 1).getDay() }, () => null),
      ...Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, d) => dayKey(year, month, d + 1)),
    ];
    while (cells.length < 42) cells.push(null);
    return { label: `${year}. ${pad(month + 1)}`, cells };
  });
}

/** 달력에서 누를 수 있는 날짜 전부 - 프리렌더 목록용 */
export function allDays(year: number) {
  return months(year).flatMap((m) => m.cells.filter((c): c is string => c !== null));
}
