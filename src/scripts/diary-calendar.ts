// 일기 달력 날짜 - 로그인한 브라우저 전용
// 한 번 클릭은 그 날 보기, 더블클릭은 쓰기(글이 있으면 수정)
// 첫 클릭 이동 보류 - 링크를 그대로 두면 두 번째 클릭 전에 페이지 이동
if (localStorage.getItem('gw') === '1') {
  let pending: ReturnType<typeof setTimeout> | null = null;
  const cellOf = (event: Event) => (event.target as HTMLElement).closest<HTMLAnchorElement>('.cal-cell[data-day]');

  document.addEventListener('click', (event) => {
    const cell = cellOf(event);
    if (!cell) return;
    event.preventDefault();
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => (location.href = cell.href), 220);
  });

  document.addEventListener('dblclick', (event) => {
    const cell = cellOf(event);
    if (!cell) return;
    event.preventDefault();
    if (pending) clearTimeout(pending);
    const entry = cell.dataset.entry;
    location.href = entry
      ? `/write/?edit=diary/${entry}`
      : `/write/?new=diary&date=${cell.dataset.day}`;
  });
}
