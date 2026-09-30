// 메인 섹션 제목 옆 한글(기록·개인 공부·실무 학습) 클릭 - 그 갈래 새 글 쓰기. 로그인한 브라우저 전용
if (localStorage.getItem('gw') === '1') {
  document.documentElement.dataset.writer = '1';
  document.addEventListener('click', (event) => {
    const note = (event.target as HTMLElement).closest<HTMLElement>('.h3-note[data-write]');
    if (!note) return;
    location.href = `/write/?new=${note.dataset.write}`;
  });
}
