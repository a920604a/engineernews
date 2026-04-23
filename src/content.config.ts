import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.string(),
    tags: z.array(z.string()),
    lang: z.enum(['zh-TW', 'en']).default('zh-TW'),
    description: z.string().optional(),
    tldr: z.string().optional(),
    draft: z.boolean().default(false),
    pinned: z.boolean().default(false),
    type: z.enum(['debug', 'deep-dive', 'guide', 'project', 'crawled']).optional(),
    readingTime: z.number().optional(),
    series: z.object({
      name: z.string(),
      order: z.number(),
    }).optional(),
    source: z.string().optional(),
    source_url: z.string().url().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    description: z.string().optional(),
    category: z.string(),
    tags: z.array(z.string()),
    github: z.string().url().optional(),
    url: z.string().url().optional(),
    pinned: z.boolean().default(false),
  }),
});

export const collections = { posts, projects };
