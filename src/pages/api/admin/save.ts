import type { APIRoute } from 'astro';

type Env = {
  ADMIN_TOKEN?: string;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
};

type SaveRequest = {
  slug: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

function buildFrontmatter(fm: Record<string, unknown>): string {
  const lines: string[] = ['---'];
  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map(v => `"${String(v)}"`).join(', ')}]`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else {
      const str = String(value);
      if (str.includes('"') || str.includes(': ') || str !== str.trim()) {
        lines.push(`${key}: "${str.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${str}`);
      }
    }
  }
  lines.push('---');
  return lines.join('\n');
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
    return Response.json({ error: 'GitHub env vars not configured' }, { status: 500 });
  }

  let body: SaveRequest;
  try {
    body = await request.json() as SaveRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { slug, frontmatter, body: markdownBody } = body;
  if (!slug || typeof slug !== 'string') {
    return Response.json({ error: 'Missing slug' }, { status: 400 });
  }
  if (!/^[a-z]+\/\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug format' }, { status: 400 });
  }
  if (!frontmatter || typeof frontmatter !== 'object') {
    return Response.json({ error: 'Missing frontmatter' }, { status: 400 });
  }

  const content = `${buildFrontmatter(frontmatter)}\n\n${markdownBody.trimStart()}`;
  const filePath = `src/content/posts/${slug}.md`;
  const apiUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${filePath}`;

  const getRes = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'engineer-news',
    },
  });
  if (!getRes.ok) {
    return Response.json({ error: `GitHub GET ${getRes.status}` }, { status: getRes.status });
  }
  const existing = await getRes.json() as { sha: string };

  const title = String(frontmatter.title ?? slug.split('/').pop());
  const isDraft = frontmatter.draft === true;

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'engineer-news',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: isDraft ? `draft: update ${title}` : `publish: ${title}`,
      content: btoa(unescape(encodeURIComponent(content))),
      sha: existing.sha,
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    return Response.json({ error: `GitHub PUT ${putRes.status}: ${err}` }, { status: 502 });
  }

  const result = await putRes.json() as { commit: { sha: string } };
  const actionsUrl = `https://github.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/deploy.yml`;

  return Response.json({
    commitSha: result.commit.sha,
    actionsUrl,
    draft: isDraft,
  });
};
