/**
 * 블로그 작성 화면(/write)의 뒤를 받는 Worker.
 *
 * 블로그는 GitHub Pages 정적 사이트라 서버가 없다. 그래서 이 Worker 하나가
 *   1) 깃허브 OAuth 로 "이 사람이 badul13 본인인지" 만 확인하고
 *   2) 확인된 요청에 한해 레포에 파일을 커밋한다.
 *
 * 토큰을 브라우저에 두지 않는 것이 이 구조의 이유다. 깃허브 토큰은 암호화해서
 * HttpOnly 쿠키 안에만 들어가고, 자바스크립트는 그 값을 읽을 수 없다.
 * 세션 저장소(KV)를 쓰지 않는 것도 의도다 — 붙일 것을 하나라도 줄인다.
 */

const API = 'https://api.github.com';
const GITHUB = 'https://github.com';
const SESSION_COOKIE = 'gw_session';
const STATE_COOKIE = 'gw_state';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30일. 그 사이엔 로그인 화면을 다시 안 본다.
const STATE_TTL = 600;
const COLLECTIONS = ['posts', 'study', 'work', 'diary'];

const enc = new TextEncoder();
const dec = new TextDecoder();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsFor(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      switch (url.pathname) {
        case '/auth/login':
          return await login(request, env, url);
        case '/auth/callback':
          return await callback(request, env, url);
        case '/auth/logout':
          return logout(cors);
        case '/api/session':
          return await getSession(request, env, cors);
        case '/api/list':
          return await listEntries(request, env, url, cors);
        case '/api/file':
          return await readFile(request, env, url, cors);
        case '/api/save':
          return await saveFile(request, env, cors);
        case '/api/upload':
          return await uploadImage(request, env, cors);
        default:
          return json({ error: 'not found' }, 404, cors);
      }
    } catch (error) {
      return json({ error: String(error && error.message ? error.message : error) }, 500, cors);
    }
  },
};

/* ── 인증 ──────────────────────────────────────────────── */

async function login(request, env, url) {
  const back = safeReturn(url.searchParams.get('return'), env);
  const state = randomToken();
  const authorize = new URL(GITHUB + '/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', url.origin + '/auth/callback');
  authorize.searchParams.set('state', state);

  const headers = new Headers({ Location: authorize.toString() });
  // 콜백은 github.com 에서 오는 최상위 이동이므로 SameSite=Lax 로도 쿠키가 따라온다.
  headers.append(
    'Set-Cookie',
    cookie(STATE_COOKIE, await seal(env, { state, back }, STATE_TTL), {
      maxAge: STATE_TTL,
      sameSite: 'Lax',
    }),
  );
  return new Response(null, { status: 302, headers });
}

async function callback(request, env, url) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const pending = await unseal(env, readCookie(request, STATE_COOKIE));

  if (!code || !state || !pending || pending.state !== state) {
    return notice('로그인 상태 불일치 · 다시 시도', 400);
  }

  const token = await exchange(env, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: url.origin + '/auth/callback',
  });
  if (!token) return notice('깃허브 토큰 수신 실패', 502);

  const who = await fetch(API + '/user', { headers: ghHeaders(token.access) });
  if (!who.ok) return notice('깃허브 계정 확인 실패', 502);
  const user = await who.json();

  // 이 한 줄이 실제 출입문이다. 주인이 아니면 세션을 아예 만들지 않는다.
  if (user.login !== env.OWNER) return notice('비공개 페이지', 403);

  const sealed = await seal(env, { login: user.login, avatar: user.avatar_url, ...token }, SESSION_TTL);

  // 세션은 조각(#)에 실어 보낸다. 조각은 서버로 가지 않으므로 기록에 남지 않는다.
  // 쿠키도 같이 내리지만, 블로그와 Worker 가 다른 오리진이라 사파리 등에서는 막힌다.
  const headers = new Headers({ Location: pending.back + '#s=' + encodeURIComponent(sealed) });
  headers.append('Set-Cookie', sessionCookie(sealed));
  headers.append('Set-Cookie', cookie(STATE_COOKIE, '', { maxAge: 0, sameSite: 'Lax' }));
  return new Response(null, { status: 302, headers });
}

function sessionCookie(sealed) {
  return cookie(SESSION_COOKIE, sealed, { maxAge: SESSION_TTL, sameSite: 'None' });
}

/** 헤더가 먼저다. 쿠키는 같은 사이트에서 쓸 때를 위한 보조 수단으로만 남겨 둔다. */
function sessionToken(request) {
  const header = request.headers.get('Authorization') ?? '';
  const bearer = header.match(/^Bearer\s+(.+)$/i);
  return bearer ? bearer[1] : readCookie(request, SESSION_COOKIE);
}

function logout(cors) {
  const headers = new Headers(cors);
  headers.append('Set-Cookie', cookie(SESSION_COOKIE, '', { maxAge: 0, sameSite: 'None' }));
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

async function getSession(request, env, cors) {
  const session = await unseal(env, sessionToken(request));
  if (!session) return json({ error: 'unauthorized' }, 401, cors);
  return json({ login: session.login, avatar: session.avatar }, 200, cors);
}

/** 코드→토큰, 리프레시 둘 다 같은 엔드포인트를 쓴다. */
async function exchange(env, params) {
  const response = await fetch(GITHUB + '/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      ...params,
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (!data.access_token) return null;
  return { access: data.access_token, refresh: data.refresh_token ?? null };
}

/* ── 깃허브 호출 ───────────────────────────────────────── */

function ghHeaders(token) {
  return {
    authorization: 'Bearer ' + token,
    accept: 'application/vnd.github+json',
    'user-agent': 'badul13-blog-writer',
    'x-github-api-version': '2022-11-28',
  };
}

/**
 * 깃허브 App 의 사용자 토큰은 8시간이면 만료된다. 401이 오면 리프레시 토큰으로
 * 한 번 갱신해서 다시 시도하고, 갱신됐으면 호출한 쪽이 쿠키를 새로 내려주게 표시한다.
 */
async function callGitHub(env, session, path, init = {}) {
  let response = await fetch(API + path, { ...init, headers: ghHeaders(session.access) });
  if (response.status === 401 && session.refresh) {
    const renewed = await exchange(env, { grant_type: 'refresh_token', refresh_token: session.refresh });
    if (renewed) {
      session.access = renewed.access;
      session.refresh = renewed.refresh ?? session.refresh;
      session.renewed = true;
      response = await fetch(API + path, { ...init, headers: ghHeaders(session.access) });
    }
  }
  return response;
}

async function withSession(request, env, cors, handler) {
  const session = await unseal(env, sessionToken(request));
  if (!session) return json({ error: 'unauthorized' }, 401, cors);

  const result = await handler(session);
  if (!session.renewed) return result;

  // 토큰이 갱신됐으면 같은 응답에 새 봉인을 실어 보낸다. 브라우저가 그걸로 갈아 끼운다.
  delete session.renewed;
  const sealed = await seal(env, session, SESSION_TTL);
  const headers = new Headers(result.headers);
  headers.set('X-Session', sealed);
  headers.append('Set-Cookie', sessionCookie(sealed));
  return new Response(result.body, { status: result.status, headers });
}

function contentsPath(env, path) {
  return `/repos/${env.OWNER}/${env.REPO}/contents/${path}?ref=${env.BRANCH}`;
}

async function listEntries(request, env, url, cors) {
  const collection = url.searchParams.get('collection');
  if (!COLLECTIONS.includes(collection)) return json({ error: 'bad collection' }, 400, cors);

  return withSession(request, env, cors, async (session) => {
    const response = await callGitHub(env, session, contentsPath(env, `src/content/${collection}`));
    if (response.status === 404) return json({ entries: [] }, 200, cors);
    if (!response.ok) return json({ error: 'list failed' }, response.status, cors);

    const files = await response.json();
    const entries = files
      .filter((f) => f.type === 'file' && /\.mdx?$/.test(f.name))
      .map((f) => ({ name: f.name, path: f.path, slug: f.name.replace(/\.mdx?$/, ''), sha: f.sha }))
      .sort((a, b) => b.slug.localeCompare(a.slug));
    return json({ entries }, 200, cors);
  });
}

async function readFile(request, env, url, cors) {
  const path = url.searchParams.get('path') ?? '';
  if (!isContentPath(path)) return json({ error: 'bad path' }, 400, cors);

  return withSession(request, env, cors, async (session) => {
    const response = await callGitHub(env, session, contentsPath(env, path));
    if (!response.ok) return json({ error: 'read failed' }, response.status, cors);
    const file = await response.json();
    return json({ path: file.path, sha: file.sha, text: fromBase64(file.content) }, 200, cors);
  });
}

async function saveFile(request, env, cors) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405, cors);
  // CORS 허용 오리진은 정확히 한 곳이고, 여기서 Origin 을 한 번 더 확인한다.
  if (!allowedOrigin(request.headers.get('Origin'), env)) return json({ error: 'origin' }, 403, cors);

  const input = await request.json();
  const collection = input.collection;
  const slug = String(input.slug ?? '').trim();

  if (!COLLECTIONS.includes(collection)) return json({ error: '컬렉션 값 오류' }, 400, cors);
  if (!/^[\w가-힣.-]+$/.test(slug)) return json({ error: '파일 이름에 쓸 수 없는 글자 포함' }, 400, cors);
  if (!String(input.title ?? '').trim()) return json({ error: '제목 비어 있음' }, 400, cors);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? '')) return json({ error: '날짜 형식 오류' }, 400, cors);

  const path = `src/content/${collection}/${slug}.md`;
  const body = {
    message: String(input.message ?? '').trim() || `${input.sha ? 'Update' : 'Add'} ${collection}: ${slug}`,
    content: toBase64(markdown(collection, input)),
    branch: env.BRANCH,
    // 커밋 신원은 서버가 정한다. 개인 레포라 노리플라이 주소로 박혀야 잔디도 심긴다.
    author: { name: env.COMMIT_NAME, email: env.COMMIT_EMAIL },
    committer: { name: env.COMMIT_NAME, email: env.COMMIT_EMAIL },
  };
  if (input.sha) body.sha = input.sha;

  return withSession(request, env, cors, async (session) => {
    const response = await callGitHub(env, session, `/repos/${env.OWNER}/${env.REPO}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) {
      const conflict = response.status === 409 || response.status === 422;
      return json(
        { error: conflict ? '파일이 그 사이 변경됨 · 다시 불러온 뒤 저장' : result.message },
        response.status,
        cors,
      );
    }
    return json(
      { path, sha: result.content.sha, commit: result.commit.html_url, message: body.message },
      200,
      cors,
    );
  });
}

/* ── 이미지 ────────────────────────────────────────────── */

const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
const IMAGE_LIMIT = 8 * 1024 * 1024;

/**
 * 끌어다 놓은 이미지를 public/art 에 커밋한다.
 * 글과 같은 레포에 들어가므로 따로 이미지 호스팅을 두지 않는다.
 */
async function uploadImage(request, env, cors) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405, cors);
  if (!allowedOrigin(request.headers.get('Origin'), env)) return json({ error: 'origin' }, 403, cors);

  const input = await request.json();
  const extension = IMAGE_TYPES[input.type];
  if (!extension) return json({ error: '올릴 수 없는 형식 · png, jpg, gif, webp 만 가능' }, 400, cors);

  const data = String(input.data ?? '');
  // base64 는 원본보다 4/3 크다.
  if (data.length * 0.75 > IMAGE_LIMIT) return json({ error: '이미지가 너무 큼 · 8MB 까지' }, 400, cors);

  const stem = String(input.name ?? 'image')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'image';
  const today = new Date().toISOString().slice(0, 10);

  return withSession(request, env, cors, async (session) => {
    // 이름이 겹치면 뒤에 번호를 붙인다.
    let name = `${today}-${stem}.${extension}`;
    for (let n = 2; ; n++) {
      const check = await callGitHub(env, session, contentsPath(env, `public/art/${name}`));
      if (check.status === 404) break;
      if (!check.ok) return json({ error: '레포를 확인하지 못했습니다.' }, check.status, cors);
      name = `${today}-${stem}-${n}.${extension}`;
    }

    const response = await callGitHub(env, session, `/repos/${env.OWNER}/${env.REPO}/contents/public/art/${name}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Add image: ${name}`,
        content: data,
        branch: env.BRANCH,
        author: { name: env.COMMIT_NAME, email: env.COMMIT_EMAIL },
        committer: { name: env.COMMIT_NAME, email: env.COMMIT_EMAIL },
      }),
    });
    const result = await response.json();
    if (!response.ok) return json({ error: result.message }, response.status, cors);

    return json({ url: `/art/${name}`, commit: result.commit.html_url }, 200, cors);
  });
}

/* ── 마크다운 ──────────────────────────────────────────── */

/** content.config.ts 의 스키마를 그대로 따라간다. 없는 필드는 아예 쓰지 않는다. */
function markdown(collection, input) {
  const lines = ['---', `title: ${yaml(input.title.trim())}`, `date: ${input.date}`];

  if (collection === 'posts') {
    const summary = String(input.summary ?? '').trim();
    if (summary) lines.push(`summary: ${yaml(summary)}`);
    const tags = (input.tags ?? []).map((t) => String(t).trim()).filter(Boolean);
    if (tags.length) lines.push(`tags: [${tags.map(yaml).join(', ')}]`);
  }

  lines.push('---', '');

  return lines.join('\n') + '\n' + String(input.body ?? '').replace(/\s*$/, '') + '\n';
}

function yaml(value) {
  return '"' + String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

/* ── 잡일 ──────────────────────────────────────────────── */

function corsFor(request, env) {
  const origin = request.headers.get('Origin');
  const headers = {
    vary: 'Origin',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-expose-headers': 'X-Session',
    'access-control-max-age': '86400',
  };
  if (allowedOrigin(origin, env)) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
  }
  return headers;
}

function allowedOrigin(origin, env) {
  if (!origin) return false;
  return String(env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .includes(origin);
}

/** 로그인 후 돌아갈 곳은 우리 사이트 안이어야 한다. */
function safeReturn(value, env) {
  const fallback = env.SITE + '/write/';
  if (!value) return fallback;
  try {
    const target = new URL(value, env.SITE);
    return target.origin === new URL(env.SITE).origin ? target.toString() : fallback;
  } catch {
    return fallback;
  }
}

function isContentPath(path) {
  return /^src\/content\/(posts|study|work|diary)\/[\w가-힣.-]+\.mdx?$/.test(path) && !path.includes('..');
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'content-type': 'application/json; charset=utf-8' },
  });
}

function notice(text, status) {
  return new Response(`<!doctype html><meta charset="utf-8"><body style="font:15px system-ui;padding:40px">${text}`, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function cookie(name, value, { maxAge, sameSite }) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAge}`;
}

function readCookie(request, name) {
  const header = request.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

function randomToken() {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
}

async function aesKey(env) {
  return crypto.subtle.importKey('raw', fromBase64Url(env.SESSION_KEY), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

async function seal(env, data, ttl) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = enc.encode(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + ttl }));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(env), payload));
  const out = new Uint8Array(iv.length + sealed.length);
  out.set(iv);
  out.set(sealed, iv.length);
  return toBase64Url(out);
}

async function unseal(env, token) {
  if (!token) return null;
  try {
    const raw = fromBase64Url(token);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: raw.slice(0, 12) },
      await aesKey(env),
      raw.slice(12),
    );
    const data = JSON.parse(dec.decode(plain));
    return data.exp > Date.now() / 1000 ? data : null;
  } catch {
    return null;
  }
}

function toBase64(text) {
  const bytes = enc.encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(String(value).replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return dec.decode(bytes);
}

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  const padded = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
