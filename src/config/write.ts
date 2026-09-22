// /write 화면이 부르는 Worker 주소. 비밀값이 아니라 그냥 주소다.
// worker/ 를 배포하면 wrangler 가 알려주는 주소를 여기에 적는다.
export const WRITE_API = 'https://badul13-write.WORKERS-SUBDOMAIN.workers.dev';

// 주소를 아직 안 채웠으면 화면에서 안내만 띄우고 아무것도 부르지 않는다.
export const WRITE_READY = !WRITE_API.includes('WORKERS-SUBDOMAIN');

// 작성 위치마다 본문에 미리 깔아 두는 뼈대.
//
// 기술 글은 도입(무엇을 왜) → 본문(단계별) → 맺음(요약) 이 공통 뼈대이고,
// 트러블슈팅은 문제 상황 → 원인 → 해결 → 배운 것 순으로 쓴다.
// 특히 "처음 의심한 것이 범인이 아니었던 과정"이 남아 있는 글이 좋은 글로 꼽히므로,
// 원인 칸을 결과가 아니라 '찾아간 과정'으로 열어 둔다.
export const COLLECTIONS = [
  {
    id: 'posts',
    label: 'Posts',
    template: [
      '무엇을 다루는 글인지, 결론이 무엇인지 두어 줄.',
      '',
      '## 문제 상황',
      '',
      '',
      '## 원인을 찾은 과정',
      '',
      '처음 의심한 것과 실제 원인.',
      '',
      '## 해결',
      '',
      '',
      '## 배운 것',
      '',
    ].join('\n'),
  },
  {
    id: 'study',
    label: 'Study',
    template: ['## 학습 내용', '', '', '## 핵심 정리', '', '', '## 실습', '', '', '## 참고 자료', ''].join('\n'),
  },
  {
    id: 'work',
    label: 'Work',
    template: ['## 상황', '', '', '## 대응', '', '', '## 정리', '', '', '## 적용 계획', ''].join('\n'),
  },
  {
    id: 'diary',
    label: 'Diary',
    template: ['## 오늘', '', '', '## 메모', ''].join('\n'),
  },
] as const;
