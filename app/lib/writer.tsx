// 쓰기 입구 - 로그인한 브라우저에서만
// writer - 이 브라우저에 로그인 표시(gw)가 있음. 섹션 쓰기 버튼·달력 더블클릭에 사용
// me - Worker 로 세션까지 확인됨. 수정 링크에 사용
// 표시 없는 방문자 - Worker 요청 자체 없음
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { WRITE_API, WRITE_READY } from '~/write/config';

type Writer = { writer: boolean; me: boolean };

const WriterContext = createContext<Writer>({ writer: false, me: false });

export function WriterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Writer>({ writer: false, me: false });

  useEffect(() => {
    if (!WRITE_READY || localStorage.getItem('gw') !== '1') return;
    setState({ writer: true, me: false });
    const token = localStorage.getItem('gw_session');
    fetch(WRITE_API + '/api/session', { headers: token ? { authorization: 'Bearer ' + token } : {} })
      .then((response) => {
        if (!response.ok) {
          localStorage.removeItem('gw');
          setState({ writer: false, me: false });
          return;
        }
        setState({ writer: true, me: true });
      })
      .catch(() => {});
  }, []);

  return <WriterContext.Provider value={state}>{children}</WriterContext.Provider>;
}

export const useWriter = () => useContext(WriterContext);

/** 새 글 쓰기 주소 */
export const newPostHref = (collection: string, date?: string) =>
  `/write/?new=${collection}` + (date ? `&date=${date}` : '');

/** 고치기 주소 */
export const editHref = (collection: string, id: string) => `/write/?edit=${collection}/${id}`;
