// 작성 화면 - 빌드에 포함되지만 로그인 전에는 작성 칸 없음 (가리기가 아니라 권한으로 차단), 검색 제외
// 새 글은 여기서, 기존 글은 그 글의 수정 버튼으로 ?edit= 을 달고 진입
import { useEffect } from 'react';
import { Shell } from '~/components/Shell';
import { COLLECTIONS } from '~/write/config';
import '~/styles/write.css';

export function meta() {
  return [{ title: 'Write' }, { name: 'robots', content: 'noindex, nofollow' }];
}

export default function Write() {
  useEffect(() => {
    import('~/write/controller').then(({ startWrite }) => startWrite());
  }, []);

  return (
    <Shell>
      <p id="boot" className="muted small">
        확인 중…
      </p>

      <div id="setup" className="wr-note" hidden>
        <b>Worker 주소 미설정</b>
        <p>
          <code>worker/</code> 배포 후 받은 주소를 <code>app/write/config.ts</code> 에 입력
        </p>
      </div>

      <div id="gate" hidden>
        <h1>Write</h1>
        <p className="muted small">작성하려면 깃허브 로그인 필요</p>
        <a id="login" className="wr-btn" href="#">
          GitHub 로 로그인
        </a>
      </div>

      <div id="editor" hidden>
        <div className="wr-top">
          <h1 id="heading">Write</h1>
          <span className="muted small">
            <span id="who" />
            <button id="logout" className="wr-link" type="button">
              로그아웃
            </button>
          </span>
        </div>

        <div className="wr-row wr-lead">
          <label className="wr-field">
            <span>작성 위치</span>
            <select id="collection" defaultValue={COLLECTIONS[0].id}>
              {COLLECTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="wr-field wr-title">
            <span>제목</span>
            <input id="title" type="text" autoComplete="off" placeholder="제목" />
          </label>
        </div>

        <div id="tools" className="wr-tools">
          <button type="button" data-md="h2">
            H2
          </button>
          <button type="button" data-md="h3">
            H3
          </button>
          <button type="button" data-md="h4">
            H4
          </button>
          <span className="wr-tools-gap" />
          <button type="button" data-md="bold" title="굵게">
            <b>B</b>
          </button>
          <button type="button" data-md="italic" title="기울임">
            <i>I</i>
          </button>
          <button type="button" data-md="strike" title="취소선">
            <s>S</s>
          </button>
          <span className="wr-tools-gap" />
          <button type="button" data-md="code">
            코드
          </button>
          <button type="button" data-md="pre">
            코드블록
          </button>
          <button type="button" data-md="quote">
            인용
          </button>
          <span className="wr-tools-gap" />
          <button type="button" data-md="ul">
            목록
          </button>
          <button type="button" data-md="ol">
            번호
          </button>
          <button type="button" data-md="task">
            체크
          </button>
          <span className="wr-tools-gap" />
          <span className="wr-tool-wrap">
            <button id="table-open" type="button">
              표
            </button>
            <div id="table-pick" className="wr-table-pick" hidden>
              <div id="table-grid" className="wr-table-grid" />
              <span id="table-size" className="wr-table-size" />
            </div>
          </span>
          <button id="emoji-open" type="button" title="이모지">
            😎
          </button>
        </div>
        <div id="body" className="wr-editor" />

        <details className="wr-more">
          <summary>발행 설정</summary>
          <div className="wr-more-in">
            <div className="wr-row">
              <div className="wr-field">
                <span>날짜</span>
                <div className="wr-date">
                  <button id="date-open" className="wr-date-value" type="button" />
                  <div id="picker" className="wr-picker" hidden>
                    <div className="wr-picker-head">
                      <button id="prev" type="button" aria-label="이전 달">
                        ‹
                      </button>
                      <span id="month" />
                      <button id="next" type="button" aria-label="다음 달">
                        ›
                      </button>
                    </div>
                    <div id="grid" className="wr-picker-grid" />
                    <button id="today" className="wr-picker-today" type="button">
                      오늘
                    </button>
                  </div>
                </div>
              </div>
              <label className="wr-field" id="tags-field">
                <span>태그</span>
                <input id="tags" type="text" autoComplete="off" placeholder="astro, blog" />
              </label>
            </div>

            <label className="wr-field" id="summary-field">
              <span>요약</span>
              <input id="summary" type="text" autoComplete="off" placeholder="한 줄 요약" />
            </label>

            <label className="wr-field">
              <span>커밋 메시지</span>
              <input id="message" type="text" autoComplete="off" spellCheck={false} />
            </label>
          </div>
        </details>

        <div className="wr-actions">
          <button id="save" className="wr-btn" type="button">
            저장하고 푸시
          </button>
        </div>
        <p id="status" className="wr-status" />
      </div>
    </Shell>
  );
}
