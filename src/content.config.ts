import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 기술 글
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const shortForm = (folder) =>
  defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: `./src/content/${folder}` }),
    schema: z.object({
      title: z.string(),
      date: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
  });

const study = shortForm('study'); // 개인 공부
const work = shortForm('work');   // 실무 학습
const diary = shortForm('diary'); // 일기

export const collections = { posts, study, work, diary };
