import type { APIRoute } from 'astro';
import { findDefaultGlossaryEntry, type GlossaryEntry, type GlossaryLink } from '../../../lib/glossary/terms';

const CHAT_MODEL = '@cf/qwen/qwen1.5-14b-chat-awq';
const MAX_TERM_LENGTH = 80;
const MAX_CONTEXT_LENGTH = 420;

type Level = 'beginner' | 'advanced';
type Lang = 'zh-TW' | 'en';

interface GlossaryRequest {
  term?: string;
  level?: Level;
  lang?: Lang;
  context?: string;
  slug?: string;
  seed?: GlossaryEntry;
}

interface GlossaryResponse {
  term: string;
  level: Level;
  definition: string;
  context: string;
  reading: GlossaryLink[];
  source: 'ai' | 'local';
}

interface D1Like {
  prepare(query: string): { bind(...values: unknown[]): { run(): Promise<unknown> } };
}
interface AiLike {
  run(model: string, opts: unknown): Promise<{ response?: string }>;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function clean(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

/** Pick the right field from an entry given level + lang. */
function pickDefinition(entry: GlossaryEntry | undefined, level: Level, lang: Lang): string | undefined {
  if (!entry) return undefined;
  if (lang === 'en') {
    return level === 'advanced'
      ? entry.advanced_en ?? entry.definition_en ?? entry.advanced ?? entry.definition
      : entry.definition_en ?? entry.advanced_en ?? entry.definition ?? entry.advanced;
  }
  return level === 'advanced'
    ? entry.advanced ?? entry.definition
    : entry.definition ?? entry.advanced;
}

function pickContext(entry: GlossaryEntry | undefined, lang: Lang): string | undefined {
  if (!entry) return undefined;
  return lang === 'en' ? entry.context_en ?? entry.context : entry.context;
}

function pickLinks(entry: GlossaryEntry | undefined, lang: Lang): GlossaryLink[] | undefined {
  if (!entry) return undefined;
  return lang === 'en' ? entry.links_en ?? entry.links : entry.links;
}

function buildLocalResponse(term: string, level: Level, lang: Lang, context: string, seed?: GlossaryEntry): GlossaryResponse {
  const entry = seed ?? findDefaultGlossaryEntry(term);
  const fallbackDef = lang === 'en'
    ? `${term} is a technical term used in this article. The original context is kept here so you can pick up where you left off.`
    : `${term} 是本文中的技術名詞。這裡先保留原文脈絡，方便你不用離開頁面就回到剛剛讀到的位置。`;
  const fallbackCtx = lang === 'en'
    ? 'The precise meaning depends on the surrounding article.'
    : '這個詞彙的精確意思會依文章脈絡而變。';

  return {
    term,
    level,
    definition: pickDefinition(entry, level, lang) ?? fallbackDef,
    context: pickContext(entry, lang) ?? context ?? fallbackCtx,
    reading: pickLinks(entry, lang) ?? [
      { label: lang === 'en' ? `Search ${term}` : `搜尋 ${term}`, url: `${lang === 'en' ? '/en' : ''}/search?q=${encodeURIComponent(term)}` },
    ],
    source: 'local',
  };
}

function parseModelJson(text: string): Partial<GlossaryResponse> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Partial<GlossaryResponse>;
  } catch {
    return null;
  }
}

async function explainWithModel(
  AI: AiLike | undefined,
  term: string,
  level: Level,
  lang: Lang,
  context: string,
  seed?: GlossaryEntry,
): Promise<GlossaryResponse | null> {
  if (!AI) return null;
  const fallback = buildLocalResponse(term, level, lang, context, seed);
  const entry = seed ?? findDefaultGlossaryEntry(term);

  const isEn = lang === 'en';
  const system = isEn
    ? 'You are an inline glossary card inside a blog post. Output JSON only, no markdown. Keep it short, accurate, and grounded in the context the reader is looking at.'
    : '你是部落格文章內的互動詞彙卡。只輸出 JSON，不要 Markdown。說明要短、準確、貼近讀者正在看的上下文。';

  const payload = {
    term,
    level,
    article_context: context,
    seed_definition: pickDefinition(entry, 'beginner', lang),
    seed_advanced: pickDefinition(entry, 'advanced', lang),
    output_schema: {
      definition: level === 'beginner'
        ? (isEn ? 'A 1-2 sentence beginner explanation' : '用初學者能懂的 1-2 句中文解釋')
        : (isEn ? 'Technical detail for advanced readers, max 2 sentences' : '進階讀者需要的技術細節，最多 2 句中文'),
      context: isEn ? 'What this term means in this article, 1 sentence' : '這個詞在本文脈絡中代表什麼，1 句中文',
    },
  };

  try {
    const result = await AI.run(CHAT_MODEL, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      stream: false,
    }) as { response?: string };
    const parsed = parseModelJson(result.response ?? '');
    if (!parsed) return null;
    return {
      term,
      level,
      definition: clean(parsed.definition, fallback.definition),
      context: clean(parsed.context, fallback.context),
      reading: fallback.reading,
      source: 'ai',
    };
  } catch {
    return null;
  }
}

async function recordLookup(
  DB: D1Like | undefined,
  term: string,
  slug: string,
  level: Level,
  context: string,
): Promise<void> {
  if (!DB) return;
  await DB.prepare(
    `INSERT INTO glossary_lookup_stats (term, slug, level, lookup_count, last_context, last_seen_at)
     VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(term, slug, level) DO UPDATE SET
       lookup_count = lookup_count + 1,
       last_context = excluded.last_context,
       last_seen_at = CURRENT_TIMESTAMP`,
  ).bind(term, slug, level, context).run();
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime?: { env?: { DB?: D1Like; AI?: AiLike } } }).runtime?.env ?? {};
  const DB = env.DB;
  const AI = env.AI;

  let body: GlossaryRequest;
  try {
    body = await request.json() as GlossaryRequest;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const term = truncate(clean(body.term), MAX_TERM_LENGTH);
  const level: Level = body.level === 'advanced' ? 'advanced' : 'beginner';
  const lang: Lang = body.lang === 'en' ? 'en' : 'zh-TW';
  const context = truncate(clean(body.context), MAX_CONTEXT_LENGTH);
  const slug = truncate(clean(body.slug), 180);

  if (!term) return json({ error: 'missing_term' }, 400);

  await recordLookup(DB, term, slug, level, context).catch(() => {});

  const response = await explainWithModel(AI, term, level, lang, context, body.seed).catch(() => null);

  return json(response ?? buildLocalResponse(term, level, lang, context, body.seed));
};
