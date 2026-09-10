export type Project = {
  name: string;
  description: string;
  href: string;
  tags: string[];
};

// TODO: 랜딩에 올릴 프로젝트 카드
export const projects: Project[] = [];

// TODO: 배지로 표시할 스택
export const stack: string[] = [];
