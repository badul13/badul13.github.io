# 작성 화면 Worker

블로그의 `/write` 화면이 부르는 작은 API. 하는 일은 두 가지다.

1. 깃허브 OAuth 로 **badul13 본인인지만** 확인한다 (`OWNER` 와 로그인 이름이 다르면 세션을 안 만든다).
2. 확인된 요청에 한해 `src/content/<컬렉션>/<파일>.md` 를 커밋한다. 커밋이 들어가면
   `deploy.yml` 이 알아서 빌드·배포한다.

깃허브 토큰은 **브라우저에 내려가지 않는다.** AES-GCM 으로 암호화해서 HttpOnly 쿠키 안에만
들어가므로 자바스크립트로 읽을 수 없다. 세션 저장소(KV)도 쓰지 않는다 — 붙일 것을 하나 줄였다.

## 차리는 순서

Worker 주소가 있어야 깃허브 App 의 콜백 주소를 적을 수 있고, App 이 있어야 Worker 가 동작한다.
그래서 **먼저 빈 채로 배포해서 주소를 받는다.**

### 1. Worker 배포해서 주소 받기

```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```

`https://badul13-write.<내-서브도메인>.workers.dev` 가 나온다. 이 주소를 아래에서 계속 쓴다.

### 2. 깃허브 App 만들기

https://github.com/settings/apps/new 에서:

| 칸 | 값 |
|---|---|
| GitHub App name | `badul13-blog-writer` (아무 이름) |
| Homepage URL | `https://badul13.github.io` |
| Callback URL | `https://badul13-write.<내-서브도메인>.workers.dev/auth/callback` |
| Request user authorization (OAuth) during installation | **체크** |
| Webhook → Active | **체크 해제** |
| Repository permissions → Contents | **Read and write** |
| Where can this app be installed | Only on this account |

만든 뒤 **Install App → Only select repositories → `badul13.github.io` 만** 선택해서 설치한다.
이 레포 하나에만 권한이 묶이는 게 OAuth App(공개 레포 전체 쓰기) 대신 이걸 쓰는 이유다.

App 페이지에서 **Client ID** 를 복사하고, **Generate a new client secret** 으로 시크릿을 만든다
(시크릿은 그 화면을 벗어나면 다시 못 본다).

### 3. 값 넣기

`wrangler.toml` 의 `GITHUB_CLIENT_ID` 에 Client ID 를 적는다. 비밀이 아니라 공개돼도 되는 값이다.

세션 암호화 키를 하나 만든다.

```bash
node -e "console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url'))"
```

나머지 둘은 시크릿으로 넣는다. 프롬프트가 뜨면 직접 붙여넣는다.

```bash
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put SESSION_KEY
npx wrangler deploy
```

### 4. 블로그에 주소 알려주기

`src/config/write.ts` 의 `WRITE_API` 를 1번에서 받은 주소로 바꾸고 커밋·푸시한다.
배포가 끝나면 https://badul13.github.io/write/ 에서 로그인 버튼이 보인다.

첫 로그인에서 한 번만 깃허브 승인 화면이 뜨고, 그다음부터는 눌렀을 때 바로 되돌아온다.
세션은 30일, 깃허브 토큰은 8시간마다 리프레시 토큰으로 자동 갱신되므로 그 때문에 다시 로그인할 일은 없다.

## 엔드포인트

| | |
|---|---|
| `GET /auth/login?return=` | 깃허브로 보낸다. `return` 은 우리 사이트 안이어야 한다 |
| `GET /auth/callback` | 토큰 교환 → 본인 확인 → 세션 쿠키 |
| `POST /auth/logout` | 쿠키 삭제 |
| `GET /api/session` | 로그인 상태. 아니면 401 |
| `GET /api/list?collection=` | 그 컬렉션의 파일 목록 |
| `GET /api/file?path=` | 파일 원문과 sha |
| `POST /api/save` | 커밋. `sha` 를 같이 보내면 덮어쓰기 |

## 문 잠금 장치

- `OWNER` 와 깃허브 로그인 이름이 다르면 세션 자체를 만들지 않는다.
- CORS 허용 오리진은 `ALLOWED_ORIGINS` 한 곳뿐이고, `POST /api/save` 는 `Origin` 을 한 번 더 확인한다.
- 세션은 `Authorization: Bearer` 헤더로 오간다. 블로그와 Worker 가 다른 오리진이라 쿠키는
  third-party 로 취급돼 사파리 등에서 막힌다. 헤더에 실리는 값은 서버 키로 봉인된 덩어리라
  안에 든 깃허브 토큰은 브라우저에서 못 읽는다. 쿠키도 같이 내리지만 보조 수단이다.
- OAuth `state` 는 짧은 수명의 서명 쿠키로 왕복을 검증한다.
- 커밋 신원은 서버가 정한다(`COMMIT_NAME` / `COMMIT_EMAIL`). 클라이언트가 바꿀 수 없다.

## 로그

```bash
npx wrangler tail
```
