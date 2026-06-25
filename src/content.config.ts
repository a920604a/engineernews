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
    audio_url: z.string().optional(),
    srt_url: z.string().optional(),
    draft: z.boolean().default(false),
    pinned: z.boolean().default(false),
    type: z.enum([
      'debug',
      'deep-dive',
      'guide',
      'how-to',
      'listicle',
      'explainer',
      'case-study',
      'comparison',
      'research',
      'newsjacking',
    ]).optional(),
    readingTime: z.number().optional(),
    series: z.object({
      name: z.string(),
      order: z.number(),
    }).optional(),
    glossary: z.array(z.object({
      term: z.string(),
      aliases: z.array(z.string()).optional(),
      zh: z.string().optional(),
      definition: z.string().optional(),
      advanced: z.string().optional(),
      context: z.string().optional(),
      links: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
      definition_en: z.string().optional(),
      advanced_en: z.string().optional(),
      context_en: z.string().optional(),
      links_en: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
    })).optional(),
    source: z.string().optional(),
    source_url: z.string().url().optional(),
    github: z.string().url().optional(),
    url: z.string().url().optional(),
    original_url: z.string().url().optional(),
  }),
});

export const collections = { posts };
