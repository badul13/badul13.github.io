// /write 동작 - 이전 write.astro 스크립트를 그대로 옮긴 것 (화면 마크업은 routes/write.tsx)
// 브라우저 전용 - 편집기는 마운트 뒤 동적 import
import { WRITE_API, WRITE_READY, COLLECTIONS } from './config';

export async function startWrite() {
  const $ = (id: string) => document.getElementById(id)!;

  /**
   * 세션 - 쿠키 대신 헤더
   * 블로그와 Worker 가 다른 오리진이라 쿠키는 third-party 취급, 사파리 등에서 차단
   * 저장값 - 서버 키로 봉인된 덩어리, 안의 깃허브 토큰은 브라우저에서 읽기 불가
   */
  const KEY = 'gw_session';
  let token = localStorage.getItem(KEY);

  async function api(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (token) headers.set('authorization', 'Bearer ' + token);
    const response = await fetch(WRITE_API + path, { ...init, headers });

    // 토큰 갱신 시 서버가 새 봉인 반환
    const renewed = response.headers.get('x-session');
    if (renewed) {
      token = renewed;
      localStorage.setItem(KEY, renewed);
    }
    return response;
  }

  const boot = $('boot');
  const editor = $('editor');
  const status = $('status');
  const fields = {
    collection: $('collection') as HTMLSelectElement,
    title: $('title') as HTMLInputElement,
    summary: $('summary') as HTMLInputElement,
    tags: $('tags') as HTMLInputElement,
    message: $('message') as HTMLInputElement,
  };

  /* ── 날짜 ──────────────────────────────────────────── */

  const pad = (n: number) => String(n).padStart(2, '0');
  const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  let picked = new Date();
  let shown = new Date();

  // 고치러 들어온 글. 없으면 새 글
  let editing: { collection: string; slug: string } | null = null;
  let sha: string | null = null;
  let messageTouched = false;
  // 그 컬렉션의 기존 파일 이름 - 새 글 이름 중복 방지 전용
  let taken = new Set<string>();

  function drawPicker() {
    $('month').textContent = `${shown.getFullYear()}. ${pad(shown.getMonth() + 1)}`;

    const first = new Date(shown.getFullYear(), shown.getMonth(), 1).getDay();
    const days = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate();
    const cells = [
      ...WEEKDAYS.map((w) => `<span>${w}</span>`),
      ...Array.from({ length: first }, () => '<button class="blank" type="button"></button>'),
      ...Array.from({ length: days }, (_, i) => {
        const date = new Date(shown.getFullYear(), shown.getMonth(), i + 1);
        const on = key(date) === key(picked) ? ' on' : '';
        return `<button class="${on.trim()}" type="button" data-day="${key(date)}">${i + 1}</button>`;
      }),
    ];
    $('grid').innerHTML = cells.join('');
  }

  function setDate(date: Date) {
    picked = date;
    shown = new Date(date.getFullYear(), date.getMonth(), 1);
    $('date-open').textContent = key(picked);
    drawPicker();
    sync();
  }

  function togglePicker(open: boolean) {
    $('picker').hidden = !open;
    if (open) drawPicker();
  }

  function bindPicker() {
    $('date-open').addEventListener('click', (event) => {
      event.stopPropagation();
      togglePicker($('picker').hidden);
    });
    $('picker').addEventListener('click', (event) => {
      event.stopPropagation();
      const day = (event.target as HTMLElement).dataset.day;
      if (!day) return;
      const [y, m, d] = day.split('-').map(Number);
      setDate(new Date(y, m - 1, d));
      togglePicker(false);
    });
    $('prev').addEventListener('click', () => {
      shown = new Date(shown.getFullYear(), shown.getMonth() - 1, 1);
      drawPicker();
    });
    $('next').addEventListener('click', () => {
      shown = new Date(shown.getFullYear(), shown.getMonth() + 1, 1);
      drawPicker();
    });
    $('today').addEventListener('click', () => {
      setDate(new Date());
      togglePicker(false);
    });
    document.addEventListener('click', () => togglePicker(false));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') togglePicker(false);
    });
  }

  /* ── 이름과 메시지 ─────────────────────────────────── */

  /**
   * 파일 이름 - 사람이 정하지 않음. 날짜와 제목에서 생성, 겹치면 번호
   * 한글 제목 - 슬러그로 남는 글자가 없어 날짜만
   */
  function baseName() {
    const date = key(picked);
    if (fields.collection.value === 'diary') return date;

    const ascii = fields.title.value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60)
      .replace(/^-+|-+$/g, '');
    return ascii.length >= 3 ? `${date}-${ascii}` : date;
  }

  function fileName() {
    if (editing) return editing.slug;
    const base = baseName();
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }

  function autoMessage() {
    return `${editing ? 'Update' : 'Add'} ${fields.collection.value}: ${fileName()}`;
  }

  function sync() {
    if (!messageTouched) fields.message.value = autoMessage();
    // 요약·태그 - posts 스키마 전용
    const onlyPosts = fields.collection.value !== 'posts';
    $('summary-field').hidden = onlyPosts;
    $('tags-field').hidden = onlyPosts;
  }

  const templateOf = (id: string) => COLLECTIONS.find((c) => c.id === id)?.template ?? '';
  // 줄바꿈·공백만 다른 것은 같은 것 - 뼈대에 엔터만 친 상태도 '안 쓴 글'
  const bare = (text: string) => text.replace(/\s+/g, ' ').trim();

  // 편집기를 거치면 마크다운 모양이 조금 달라져서, 방금 깐 뼈대를 편집기 기준으로 기억
  let untouched = '';

  function say(text: string, bad = false) {
    status.textContent = text;
    status.classList.toggle('bad', bad);
  }

  function asNew() {
    editing = null;
    sha = null;
    $('heading').textContent = 'Write';
    $('save').textContent = '저장하고 푸시';
    document.title = 'Write';
  }

  function asEditing(collection: string, slug: string) {
    editing = { collection, slug };
    $('heading').textContent = 'Edit';
    $('save').textContent = '수정 내용 저장';
    document.title = 'Edit';
  }

  /** 이름 중복 확인용 목록 - 화면 표시 없음 */
  async function loadTaken() {
    taken = new Set();
    const response = await api('/api/list?collection=' + fields.collection.value);
    if (!response.ok) return;
    const { entries } = await response.json();
    for (const entry of entries) taken.add(entry.slug);
  }

  /* ── 고치기 ────────────────────────────────────────── */

  /** 프런트매터 - 우리가 쓴 모양만 되돌려 읽기 */
  function parse(text: string) {
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    const data: Record<string, string> = {};
    if (!match) return { data, body: text };
    for (const line of match[1].split(/\r?\n/)) {
      const pair = line.match(/^(\w+):\s*(.*)$/);
      if (pair) data[pair[1]] = pair[2].trim();
    }
    return { data, body: text.slice(match[0].length) };
  }

  const unquote = (value = '') => value.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  /* ── 이미지 ────────────────────────────────────────── */

  /** 끌어다 놓은 이미지 - 레포에 올리고 주소 반환. 넣는 자리는 편집기 담당 */
  async function uploadImage(file: File) {
    say(`${file.name} 올리는 중…`);
    const data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(file);
    });

    const response = await api('/api/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: file.name, type: file.type, data }),
    });
    const result = await response.json();
    if (!response.ok) {
      say(result.error ?? '이미지 업로드 실패', true);
      return null;
    }
    say(`${file.name} 업로드 완료`);
    return { src: result.url as string, alt: file.name.replace(/\.[^.]+$/, '') };
  }

  /** 수정 버튼이 붙여 보내는 ?edit=posts/2026-09-22-something */
  function editTarget() {
    const value = new URLSearchParams(location.search).get('edit');
    if (!value) return null;
    const [collection, ...rest] = value.split('/');
    const slug = rest.join('/');
    const known = COLLECTIONS.some((c) => c.id === collection);
    return known && /^[\w가-힣.-]+$/.test(slug) ? { collection, slug } : null;
  }

  /** 각 섹션의 쓰기 버튼이 붙여 보내는 ?new=posts / ?new=diary&date=2026-09-22 */
  function newTarget() {
    const params = new URLSearchParams(location.search);
    const collection = params.get('new');
    if (!collection || !COLLECTIONS.some((c) => c.id === collection)) return null;

    const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(params.get('date') ?? '');
    return {
      collection,
      date: day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : null,
    };
  }

  /** 로그인 후 봉인 세션이 조각(#)에 실려 옴 - 주소에는 남기지 않음 */
  function catchSession() {
    const match = location.hash.match(/^#s=(.+)$/);
    if (!match) return;
    token = decodeURIComponent(match[1]);
    localStorage.setItem(KEY, token);
    history.replaceState(null, '', location.pathname + location.search);
  }

  /* ── 시작 ──────────────────────────────────────────── */

  if (!WRITE_READY) {
    boot.hidden = true;
    $('setup').hidden = false;
    return;
  }

  catchSession();
  const response = await api('/api/session');
  boot.hidden = true;

  if (!response.ok) {
    localStorage.removeItem(KEY);
    localStorage.removeItem('gw');
    ($('login') as HTMLAnchorElement).href = WRITE_API + '/auth/login?return=' + encodeURIComponent(location.href);
    $('gate').hidden = false;
    return;
  }

  const me = await response.json();
  // 이 표시가 있는 브라우저에서만 다른 페이지가 세션 확인
  localStorage.setItem('gw', '1');
  $('who').textContent = me.login;
  editor.hidden = false;

  const { createEditor } = await import('./editor');
  const doc = createEditor($('body'), { onDropImage: uploadImage });

  /** 손대지 않은 뼈대만 교체 - 쓰기 시작한 글은 그대로 */
  function fillTemplate() {
    const body = doc.getMarkdown();
    if (bare(body) === '' || body === untouched) {
      doc.setMarkdown(templateOf(fields.collection.value));
      untouched = doc.getMarkdown();
    }
  }

  async function openForEdit(collection: string, slug: string) {
    const res = await api('/api/file?path=' + encodeURIComponent(`src/content/${collection}/${slug}.md`));
    if (!res.ok) return say('불러오기 실패 · 주소 확인 필요', true);

    const file = await res.json();
    const { data, body } = parse(file.text);

    asEditing(collection, slug);
    sha = file.sha;
    fields.collection.value = collection;
    fields.title.value = unquote(data.title);
    fields.summary.value = unquote(data.summary ?? '');
    fields.tags.value = (data.tags ?? '')
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((t) => unquote(t.trim()))
      .filter(Boolean)
      .join(', ');
    doc.setMarkdown(body);
    untouched = '';

    const [y, m, d] = (data.date ?? '').slice(0, 10).split('-').map(Number);
    if (y) setDate(new Date(y, m - 1, d));
    else sync();
  }

  /* ── 저장 ──────────────────────────────────────────── */

  async function save() {
    const button = $('save') as HTMLButtonElement;
    const slug = fileName();

    // 일기 - 날짜 하나에 하나
    if (!editing && fields.collection.value === 'diary' && taken.has(slug)) {
      return say('그 날짜 일기 존재 · 해당 일기의 수정 버튼 사용', true);
    }

    button.disabled = true;
    say('저장 중…');

    const res = await api('/api/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        collection: fields.collection.value,
        slug,
        title: fields.title.value,
        date: key(picked),
        summary: fields.summary.value,
        tags: fields.tags.value.split(',').map((t) => t.trim()).filter(Boolean),
        body: doc.getMarkdown(),
        message: fields.message.value,
        sha,
      }),
    });

    const result = await res.json();
    button.disabled = false;

    if (!res.ok) return say(result.error ?? '저장 실패', true);

    // 저장 뒤 - 그 글을 고치는 중인 상태
    asEditing(fields.collection.value, slug);
    sha = result.sha;
    messageTouched = false;
    sync();

    status.classList.remove('bad');
    status.innerHTML =
      `커밋 완료 · <a href="${result.commit}" target="_blank" rel="noreferrer">커밋 보기</a>` +
      ' · 배포 후(1분쯤) 사이트에 반영';
  }

  /* ── 도구 막대 ─────────────────────────────────────── */

  const e = doc.editor;
  const chain = () => e.chain().focus();
  const TOOLS: Record<string, { run: () => void; on: () => boolean }> = {
    h2: { run: () => chain().toggleHeading({ level: 2 }).run(), on: () => e.isActive('heading', { level: 2 }) },
    h3: { run: () => chain().toggleHeading({ level: 3 }).run(), on: () => e.isActive('heading', { level: 3 }) },
    h4: { run: () => chain().toggleHeading({ level: 4 }).run(), on: () => e.isActive('heading', { level: 4 }) },
    bold: { run: () => chain().toggleBold().run(), on: () => e.isActive('bold') },
    italic: { run: () => chain().toggleItalic().run(), on: () => e.isActive('italic') },
    strike: { run: () => chain().toggleStrike().run(), on: () => e.isActive('strike') },
    code: { run: () => chain().toggleCode().run(), on: () => e.isActive('code') },
    pre: { run: () => chain().toggleCodeBlock().run(), on: () => e.isActive('codeBlock') },
    quote: { run: () => chain().toggleBlockquote().run(), on: () => e.isActive('blockquote') },
    ul: { run: () => chain().toggleBulletList().run(), on: () => e.isActive('bulletList') },
    ol: { run: () => chain().toggleOrderedList().run(), on: () => e.isActive('orderedList') },
    task: { run: () => chain().toggleTaskList().run(), on: () => e.isActive('taskList') },
  };

  /** 커서 위치의 서식을 도구 막대에 표시 */
  function paintTools() {
    for (const button of $('tools').querySelectorAll<HTMLElement>('[data-md]')) {
      button.classList.toggle('on', TOOLS[button.dataset.md!]?.on() ?? false);
    }
  }

  /* ── 표 ────────────────────────────────────────────── */

  const TABLE_MAX = 8;
  let tableRows = 0;
  let tableCols = 0;

  function buildTableGrid() {
    const cells = [];
    for (let row = 1; row <= TABLE_MAX; row++) {
      for (let col = 1; col <= TABLE_MAX; col++) cells.push(`<i data-row="${row}" data-col="${col}"></i>`);
    }
    $('table-grid').innerHTML = cells.join('');
  }

  /** 칸을 지웠다 다시 만들면 누르는 도중 노드가 바뀌어 클릭이 깨짐 - 표시만 변경 */
  function paintTableGrid() {
    for (const cell of $('table-grid').children as HTMLCollectionOf<HTMLElement>) {
      const on = Number(cell.dataset.row) <= tableRows && Number(cell.dataset.col) <= tableCols;
      cell.classList.toggle('on', on);
    }
    $('table-size').textContent = tableRows ? `${tableRows} × ${tableCols}` : '칸 고르기';
  }

  function bindTable() {
    buildTableGrid();

    $('table-open').addEventListener('click', (event) => {
      event.stopPropagation();
      const open = $('table-pick').hidden;
      tableRows = 0;
      tableCols = 0;
      paintTableGrid();
      $('table-pick').hidden = !open;
    });
    $('table-pick').addEventListener('click', (event) => event.stopPropagation());
    $('table-grid').addEventListener('mouseover', (event) => {
      const cell = event.target as HTMLElement;
      if (!cell.dataset.row) return;
      tableRows = Number(cell.dataset.row);
      tableCols = Number(cell.dataset.col);
      paintTableGrid();
    });
    $('table-grid').addEventListener('click', (event) => {
      const cell = event.target as HTMLElement;
      if (!cell.dataset.row) return;
      doc.editor
        .chain()
        .focus()
        .insertTable({ rows: Number(cell.dataset.row), cols: Number(cell.dataset.col), withHeaderRow: true })
        .run();
      $('table-pick').hidden = true;
    });
    document.addEventListener('click', () => ($('table-pick').hidden = true));
  }

  function bind() {
    bindPicker();

    fields.collection.addEventListener('change', async () => {
      // 수정 중 위치 변경 - 그 컬렉션의 새 글, 쓰던 내용 유지
      if (editing && editing.collection !== fields.collection.value) asNew();
      if (!editing) fillTemplate();
      await loadTaken();
      sync();
    });
    fields.title.addEventListener('input', sync);
    fields.message.addEventListener('input', () => {
      messageTouched = true;
    });

    // 누르는 순간 편집기 선택 유지
    $('tools').addEventListener('mousedown', (event) => {
      if ((event.target as HTMLElement).closest('button')) event.preventDefault();
    });
    $('tools').addEventListener('click', (event) => {
      const kind = (event.target as HTMLElement).closest('button')?.dataset.md;
      if (kind) TOOLS[kind]?.run();
    });
    doc.editor.on('transaction', paintTools);
    bindTable();

    $('emoji-open').addEventListener('click', (event) => {
      event.stopPropagation();
      if (doc.picker.isOpen) return doc.picker.close();
      const rect = $('emoji-open').getBoundingClientRect();
      doc.picker.open({ left: rect.left, bottom: rect.bottom });
    });
    $('save').addEventListener('click', save);
    $('logout').addEventListener('click', async () => {
      await api('/auth/logout', { method: 'POST' });
      localStorage.removeItem(KEY);
      localStorage.removeItem('gw');
      location.href = '/write/';
    });

    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        save();
      }
    });
  }

  bind();
  setDate(new Date());

  const target = editTarget();
  if (target) {
    fields.collection.value = target.collection;
    await openForEdit(target.collection, target.slug);
    return;
  }

  // 들어온 섹션 = 작성 위치 (위에서 변경 가능)
  const fresh = newTarget();
  if (fresh) {
    fields.collection.value = fresh.collection;
    if (fresh.date) setDate(fresh.date);
  }

  fillTemplate();
  await loadTaken();
  sync();
}
