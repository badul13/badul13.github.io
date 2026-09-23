// /write 의 본문 편집기. 노션처럼 쓰는 화면이 곧 결과 화면이고, 저장은 마크다운으로 한다.
//
// 편집기와 사이트가 같은 모양을 내도록 마크다운 쪽 규칙을 맞춰 둔다.
// - Enter 는 새 문단, Shift+Enter 는 바로 아랫줄(줄바꿈 하나)
// - 빈 문단은 `&nbsp;` 한 줄로 남긴다. 그래야 빈 줄을 여러 번 넣은 만큼 사이트에서도 벌어진다.
// - 연달아 친 공백은 줄바꿈 없는 공백(U+00A0)으로 넣는다. 보통 공백은 HTML 에서 하나로 뭉친다.
// 사이트는 remark-breaks 로 줄바꿈 하나를 <br> 로 그리므로, 손으로 쓴 .md 도 같은 규칙을 따른다.
import { Editor, Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Paragraph from '@tiptap/extension-paragraph';
import { ListKit } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from '@tiptap/suggestion';

const NBSP = '\u00a0';

/* ── 빈 문단 ───────────────────────────────────────────── */

// 기본값은 빈 문단이 두 개 이상 이어질 때만 `&nbsp;` 를 남긴다. 하나만 비워도 벌어지게 한다.
const KeepEmptyParagraph = Paragraph.extend({
  renderMarkdown: (node, helpers) => {
    const content = Array.isArray(node?.content) ? node.content : [];
    return content.length ? helpers.renderChildren(content) : '&nbsp;';
  },
});

/* ── 떠 있는 목록 (명령 · 이모지 자동완성) ─────────────────── */

type Item = { key: string; icon: string; label: string; hint?: string };

/** 커서 옆에 뜨는 목록 하나. 방향키로 고르고 Enter 로 넣는다. */
function floatingList<T extends Item>(className: string) {
  let box: HTMLDivElement | null = null;
  let items: T[] = [];
  let active = 0;
  let pick: (item: T) => void = () => {};

  const draw = () => {
    if (!box) return;
    box.innerHTML = items.length
      ? items
          .map(
            (item, i) =>
              `<button type="button" class="wr-pop-item${i === active ? ' on' : ''}" data-i="${i}">` +
              `<span class="wr-pop-icon">${item.icon}</span><span>${item.label}</span>` +
              (item.hint ? `<small>${item.hint}</small>` : '') +
              '</button>',
          )
          .join('')
      : '<p class="wr-pop-empty">결과 없음</p>';
    box.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  };

  const place = (rect: DOMRect | null | undefined) => {
    if (!box || !rect) return;
    const below = rect.bottom + 6;
    const fits = below + box.offsetHeight < innerHeight;
    box.style.left = `${Math.min(rect.left, innerWidth - box.offsetWidth - 12)}px`;
    box.style.top = `${fits ? below : rect.top - box.offsetHeight - 6}px`;
  };

  return {
    onStart(props: SuggestionProps<T>) {
      box = document.createElement('div');
      box.className = `wr-pop ${className}`;
      // 누르는 순간 편집기가 포커스를 잃으면 제안이 닫히므로 mousedown 에서 막는다.
      box.addEventListener('mousedown', (event) => event.preventDefault());
      box.addEventListener('click', (event) => {
        const i = (event.target as HTMLElement).closest<HTMLElement>('[data-i]')?.dataset.i;
        if (i !== undefined) pick(items[Number(i)]);
      });
      document.body.append(box);
      this.onUpdate(props);
    },
    onUpdate(props: SuggestionProps<T>) {
      items = props.items;
      active = 0;
      pick = (item) => props.command(item);
      draw();
      place(props.clientRect?.());
    },
    onKeyDown({ event }: SuggestionKeyDownProps) {
      if (event.key === 'Escape') {
        box?.remove();
        box = null;
        return true;
      }
      if (!items.length) return false;
      if (event.key === 'ArrowDown') active = (active + 1) % items.length;
      else if (event.key === 'ArrowUp') active = (active - 1 + items.length) % items.length;
      else if (event.key === 'Enter' || event.key === 'Tab') {
        pick(items[active]);
        return true;
      } else return false;
      draw();
      return true;
    },
    onExit() {
      box?.remove();
      box = null;
    },
  };
}

/* ── 슬래시 명령 ───────────────────────────────────────── */

type Command = Item & { words: string; run: (editor: Editor) => void };

let openEmojiAtCaret: (editor: Editor) => void = () => {};

const COMMANDS: Command[] = [
  { key: 'p', icon: '¶', label: '본문', words: 'text paragraph 본문 텍스트', run: (e) => e.chain().focus().setParagraph().run() },
  { key: 'h2', icon: 'H2', label: '제목 2', words: 'h2 heading 제목', run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { key: 'h3', icon: 'H3', label: '제목 3', words: 'h3 heading 제목', run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { key: 'h4', icon: 'H4', label: '제목 4', words: 'h4 heading 제목', run: (e) => e.chain().focus().setHeading({ level: 4 }).run() },
  { key: 'ul', icon: '•', label: '글머리 목록', words: 'ul bullet list 목록 글머리', run: (e) => e.chain().focus().toggleBulletList().run() },
  { key: 'ol', icon: '1.', label: '번호 목록', words: 'ol number list 번호 목록', run: (e) => e.chain().focus().toggleOrderedList().run() },
  { key: 'task', icon: '☐', label: '체크리스트', words: 'todo task check 체크 할일', run: (e) => e.chain().focus().toggleTaskList().run() },
  { key: 'quote', icon: '❝', label: '인용', words: 'quote blockquote 인용', run: (e) => e.chain().focus().toggleBlockquote().run() },
  { key: 'pre', icon: '{ }', label: '코드 블록', words: 'code block pre 코드', run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { key: 'hr', icon: '—', label: '구분선', words: 'hr divider line 구분선', run: (e) => e.chain().focus().setHorizontalRule().run() },
  { key: 'table', icon: '▦', label: '표', words: 'table 표', run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { key: 'emoji', icon: '😀', label: '이모지', words: 'emoji 이모지 이모티콘', run: (e) => openEmojiAtCaret(e) },
];

const SlashCommand = Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [
      Suggestion<Command, Command>({
        editor: this.editor,
        pluginKey: new PluginKey('slashCommand'),
        char: '/',
        items: ({ query }) => {
          const q = query.toLowerCase().trim();
          return COMMANDS.filter((c) => !q || c.label.includes(q) || c.words.includes(q));
        },
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.run(editor);
        },
        render: () => floatingList<Command>('wr-pop-cmd'),
      }),
    ];
  },
});

/* ── 이모지 ────────────────────────────────────────────── */

type Emoji = { u: string; g: number; l: string; s: string };

const GROUPS = [
  { g: 0, icon: '😀', label: '표정' },
  { g: 1, icon: '👋', label: '사람' },
  { g: 3, icon: '🐻', label: '동물·자연' },
  { g: 4, icon: '🍔', label: '음식' },
  { g: 5, icon: '✈️', label: '여행·장소' },
  { g: 6, icon: '⚽', label: '활동' },
  { g: 7, icon: '💡', label: '사물' },
  { g: 8, icon: '❤️', label: '기호' },
  { g: 9, icon: '🚩', label: '깃발' },
];

let emojiData: Emoji[] | null = null;

/** 데이터가 1MB 남짓이라 처음 열 때 받아 온다. 한글 이름과 영문 이름 모두로 찾는다. */
async function loadEmoji() {
  if (emojiData) return emojiData;
  const [ko, en] = await Promise.all([
    import('emojibase-data/ko/compact.json'),
    import('emojibase-data/en/compact.json'),
  ]);
  const english = new Map(en.default.map((e) => [e.hexcode, e]));
  emojiData = ko.default
    .filter((e) => e.group !== undefined && e.group !== 2) // 2 는 피부색 같은 조각
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((e) => {
      const other = english.get(e.hexcode);
      const words = [e.label, ...(e.tags ?? []), other?.label ?? '', ...(other?.tags ?? [])];
      return { u: e.unicode, g: e.group!, l: e.label, s: words.join(' ').toLowerCase() };
    });
  return emojiData;
}

const RECENT_KEY = 'wr_emoji_recent';
const recent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
};
function remember(emoji: string) {
  const list = [emoji, ...recent().filter((e) => e !== emoji)].slice(0, 24);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

function searchEmoji(data: Emoji[], query: string) {
  const q = query.toLowerCase().trim();
  return q ? data.filter((e) => e.s.includes(q)) : data;
}

type EmojiItem = Item;

// `:하트` 처럼 쓰면 바로 고를 수 있다. 시간(10:30)과 헷갈리지 않게 한 글자 이상 쳐야 뜬다.
const EmojiSuggest = Extension.create({
  name: 'emojiSuggest',
  addProseMirrorPlugins() {
    return [
      Suggestion<EmojiItem, EmojiItem>({
        editor: this.editor,
        pluginKey: new PluginKey('emojiSuggest'),
        char: ':',
        allow: ({ state, range }) => state.doc.textBetween(range.from, range.to).length > 1,
        items: async ({ query }) => {
          if (!query.trim()) return [];
          const data = await loadEmoji();
          return searchEmoji(data, query)
            .slice(0, 8)
            .map((e) => ({ key: e.u, icon: e.u, label: e.l }));
        },
        command: ({ editor, range, props }) => {
          remember(props.key);
          editor.chain().focus().deleteRange(range).insertContent(props.key).run();
        },
        render: () => floatingList<EmojiItem>('wr-pop-emoji'),
      }),
    ];
  },
});

/** 도구 막대의 😀 와 `/이모지` 가 여는 고르기 판. */
export function createEmojiPicker(onPick: (emoji: string) => void) {
  const panel = document.createElement('div');
  panel.className = 'wr-emoji';
  panel.hidden = true;
  panel.innerHTML =
    '<input class="wr-emoji-search" type="text" placeholder="검색 · 하트, smile" autocomplete="off" />' +
    `<div class="wr-emoji-tabs">${[{ g: -1, icon: '🕘', label: '최근' }, ...GROUPS]
      .map((t) => `<button type="button" data-g="${t.g}" title="${t.label}">${t.icon}</button>`)
      .join('')}</div>` +
    '<div class="wr-emoji-grid"></div>';
  document.body.append(panel);

  const search = panel.querySelector<HTMLInputElement>('.wr-emoji-search')!;
  const grid = panel.querySelector<HTMLDivElement>('.wr-emoji-grid')!;
  let group = 0;

  const cell = (u: string) => `<button type="button" data-u="${u}">${u}</button>`;
  async function draw() {
    const data = await loadEmoji();
    for (const tab of panel.querySelectorAll<HTMLElement>('[data-g]')) {
      tab.classList.toggle('on', !search.value && Number(tab.dataset.g) === group);
    }
    let list: string[];
    if (search.value) list = searchEmoji(data, search.value).map((e) => e.u);
    else if (group === -1) list = recent();
    else list = data.filter((e) => e.g === group).map((e) => e.u);
    grid.innerHTML = list.length ? list.map(cell).join('') : '<p class="wr-pop-empty">결과 없음</p>';
    grid.scrollTop = 0;
  }

  panel.addEventListener('mousedown', (event) => {
    if (event.target !== search) event.preventDefault();
  });
  panel.addEventListener('click', (event) => {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const tab = target.closest<HTMLElement>('[data-g]');
    if (tab) {
      group = Number(tab.dataset.g);
      search.value = '';
      draw();
      return;
    }
    const u = target.closest<HTMLElement>('[data-u]')?.dataset.u;
    if (u) {
      remember(u);
      onPick(u);
      close();
    }
  });
  search.addEventListener('input', draw);
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
    if (event.key === 'Enter') {
      event.preventDefault();
      grid.querySelector<HTMLElement>('[data-u]')?.click();
    }
  });
  document.addEventListener('click', (event) => {
    if (!panel.hidden && !panel.contains(event.target as Node)) close();
  });

  function close() {
    panel.hidden = true;
  }

  return {
    open(rect: { left: number; bottom: number }) {
      group = recent().length ? -1 : 0;
      search.value = '';
      panel.hidden = false;
      panel.style.left = `${Math.min(rect.left, innerWidth - panel.offsetWidth - 12)}px`;
      const top = rect.bottom + 6;
      panel.style.top = `${top + panel.offsetHeight > innerHeight ? Math.max(12, rect.bottom - panel.offsetHeight - 30) : top}px`;
      draw();
      search.focus();
    },
    close,
    get isOpen() {
      return !panel.hidden;
    },
  };
}

/* ── 편집기 ────────────────────────────────────────────── */

export function createEditor(element: HTMLElement, options: { onDropImage: (file: File) => Promise<{ src: string; alt: string } | null> }) {
  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        paragraph: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        // 마크다운에 밑줄 문법이 없어서, 저장하면 사라질 서식은 처음부터 막는다.
        underline: false,
        link: { openOnClick: false },
      }),
      KeepEmptyParagraph,
      ListKit.configure({ taskItem: { nested: true } }),
      TableKit.configure({ table: { resizable: false } }),
      Image,
      Placeholder.configure({ placeholder: "/ 명령 · : 이모지 · Shift+Enter 바로 아랫줄" }),
      Markdown.configure({ markedOptions: { gfm: true, breaks: true } }),
      SlashCommand,
      EmojiSuggest,
    ],
    editorProps: {
      attributes: { class: 'prose wr-doc', spellcheck: 'false' },
      // 줄 맨 앞이나 공백 뒤에 치는 공백은 U+00A0 로 넣는다 — 여러 칸 띄어쓰기가 사이트에서도 남는다.
      handleTextInput(view, from, to, text) {
        if (text !== ' ') return false;
        const $from = view.state.doc.resolve(from);
        if ($from.parent.type.spec.code) return false;
        const before = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1), $from.parentOffset, '\0', '\0');
        if ($from.parentOffset > 0 && before !== ' ' && before !== NBSP) return false;
        view.dispatch(view.state.tr.insertText(NBSP, from, to));
        return true;
      },
      handleDrop(view, event) {
        const files = [...(event.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
        if (!files.length) return false;
        event.preventDefault();
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        (async () => {
          for (const file of files) {
            const image = await options.onDropImage(file);
            if (!image) return;
            const chain = editor.chain().focus();
            (at !== undefined ? chain.setTextSelection(at) : chain).setImage(image).run();
          }
        })();
        return true;
      },
    },
  });

  const picker = createEmojiPicker((emoji) => editor.chain().focus().insertContent(emoji).run());
  openEmojiAtCaret = (e) => {
    const at = e.view.coordsAtPos(e.state.selection.from);
    picker.open({ left: at.left, bottom: at.bottom });
  };

  return {
    editor,
    picker,
    /** 마크다운 → 편집기. 앞뒤 빈 줄은 떼고 넣는다. */
    setMarkdown(markdown: string) {
      editor.commands.setContent(markdown.replace(/^\s+/, ''), { contentType: 'markdown' });
    },
    /** 편집기 → 마크다운. 끝에 남은 빈 문단은 저장하지 않는다. */
    getMarkdown() {
      return editor
        .getMarkdown()
        .replace(/(\s*&nbsp;)+\s*$/, '')
        .replace(/\s+$/, '') + '\n';
    },
  };
}
