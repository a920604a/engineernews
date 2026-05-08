import type { APIRoute } from 'astro';

type Env = {
  ADMIN_TOKEN?: string;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
};

const ghHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'engineer-news',
});

async function moveToTrash(
  srcPath: string,
  trashPath: string,
  token: string,
  owner: string,
  repo: string,
  commitMsg: string,
): Promise<boolean> {
  const base = `https://api.github.com/repos/${owner}/${repo}/contents`;

  const srcRes = await fetch(`${base}/${srcPath}`, { headers: ghHeaders(token) });
  if (!srcRes.ok) return false;
  const src = await srcRes.json() as { content: string; sha: string };
  const content = src.content.replace(/\n/g, '');

  const trashRes = await fetch(`${base}/${trashPath}`, { headers: ghHeaders(token) });
  const putBody: Record<string, unknown> = { message: commitMsg, content };
  if (trashRes.ok) {
    const existing = await trashRes.json() as { sha: string };
    putBody.sha = existing.sha;
  }

  const putRes = await fetch(`${base}/${trashPath}`, {
    method: 'PUT',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(putBody),
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`trash write failed ${putRes.status}: ${err}`);
  }

  const delRes = await fetch(`${base}/${srcPath}`, {
    method: 'DELETE',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: commitMsg, sha: src.sha }),
  });
  if (!delRes.ok) {
    const err = await delRes.text();
    throw new Error(`delete failed ${delRes.status}: ${err}`);
  }

  return true;
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

  let body: { slug: string };
  try {
    body = await request.json() as { slug: string };
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { slug } = body;
  if (!slug || typeof slug !== 'string') {
    return Response.json({ error: 'Missing slug' }, { status: 400 });
  }
  if (!/^[a-z]+\/_?\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug format' }, { status: 400 });
  }

  const title = slug.split('/').pop() ?? slug;
  const commitMsg = `trash: ${title}`;
  const moved: string[] = [];

  const zhSrc = `src/content/posts/${slug}.md`;
  if (await moveToTrash(zhSrc, `_trash/${slug}.md`, env.GITHUB_TOKEN, env.GITHUB_OWNER, env.GITHUB_REPO, commitMsg)) {
    moved.push(zhSrc);
  }

  const enSrc = `src/content/posts/${slug}.en.md`;
  if (await moveToTrash(enSrc, `_trash/${slug}.en.md`, env.GITHUB_TOKEN, env.GITHUB_OWNER, env.GITHUB_REPO, commitMsg)) {
    moved.push(enSrc);
  }

  if (moved.length === 0) {
    return Response.json({ error: 'No files found to delete' }, { status: 404 });
  }

  return Response.json({ moved });
};
