import type { APIRoute } from 'astro';

type Env = {
  ADMIN_TOKEN?: string;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
};

function parseFrontmatter(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of yaml.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const raw = line.slice(colonIdx + 1).trim();
    if (!key) continue;

    if (raw.startsWith('[') && raw.endsWith(']')) {
      const inner = raw.slice(1, -1).trim();
      result[key] = inner
        ? inner.split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"'))
        : [];
      continue;
    }
    if (raw === 'true')  { result[key] = true;  continue; }
    if (raw === 'false') { result[key] = false; continue; }
    if (raw.startsWith('"') && raw.endsWith('"')) {
      result[key] = raw.slice(1, -1).replace(/\\"/g, '"');
      continue;
    }
    result[key] = raw;
  }
  return result;
}

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const slug = url.searchParams.get('slug') ?? '';

  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!/^[a-z]+\/\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug' }, { status: 400 });
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
    return Response.json({ error: 'GitHub env vars not configured' }, { status: 500 });
  }

  const filePath = `src/content/posts/${slug}.md`;
  const apiUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}`;

  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    return Response.json({ error: `GitHub API ${res.status}` }, { status: res.status });
  }

  const file = await res.json() as { content: string; sha: string };
  const raw = atob(file.content.replace(/\n/g, ''));

  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return Response.json({ error: 'Could not parse frontmatter' }, { status: 422 });
  }

  const frontmatter = parseFrontmatter(match[1]);
  const body = match[2].trimStart();

  return Response.json({ frontmatter, body });
};
