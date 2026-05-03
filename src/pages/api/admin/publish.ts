import type { APIRoute } from 'astro';

type Env = {
  ADMIN_TOKEN?: string;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
};

type PublishRequest = {
  slug: string; // e.g. "tech/2026-04-23-ai-agent"
};

type GitHubFileResponse = {
  content: string; // base64
  sha: string;
  name: string;
  path: string;
};

type PublishResult = {
  file: string;
  commitSha: string;
};

async function publishFile(
  filePath: string,
  token: string,
  owner: string,
  repo: string,
  title: string,
): Promise<PublishResult | null> {
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  const getRes = await fetch(apiBase, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!getRes.ok) return null;

  const file = await getRes.json() as GitHubFileResponse;
  const original = atob(file.content.replace(/\n/g, ''));
  const updated = original.replace(/^draft:\s*true/m, 'draft: false');

  if (original === updated) return null; // already published

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `publish: ${title}`,
      content: btoa(unescape(encodeURIComponent(updated))),
      sha: file.sha,
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub API error ${putRes.status}: ${err}`);
  }

  const result = await putRes.json() as { commit: { sha: string } };
  return { file: filePath, commitSha: result.commit.sha };
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

  let body: PublishRequest;
  try {
    body = await request.json() as PublishRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { slug } = body;
  if (!slug || typeof slug !== 'string') {
    return Response.json({ error: 'Missing slug' }, { status: 400 });
  }
  if (!/^[a-z]+\/\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug format' }, { status: 400 });
  }

  const slugTitle = slug.split('/').pop() ?? slug;

  const published: PublishResult[] = [];

  const zhPath = `src/content/posts/${slug}.md`;
  const zhResult = await publishFile(zhPath, env.GITHUB_TOKEN, env.GITHUB_OWNER, env.GITHUB_REPO, slugTitle);
  if (zhResult) published.push(zhResult);

  const enPath = `src/content/posts/${slug}.en.md`;
  const enResult = await publishFile(enPath, env.GITHUB_TOKEN, env.GITHUB_OWNER, env.GITHUB_REPO, slugTitle);
  if (enResult) published.push(enResult);

  if (published.length === 0) {
    return Response.json({ error: 'No files updated (already published or not found)' }, { status: 404 });
  }

  const latestSha = published[published.length - 1].commitSha;
  const actionsUrl = `https://github.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/deploy.yml`;

  return Response.json({
    published,
    commitSha: latestSha,
    actionsUrl,
  });
};
