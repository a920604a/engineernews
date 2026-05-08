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

function todayInTaipei(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function publishDraft(original: string, publishDate: string): string {
  if (!/^draft:\s*true\s*$/m.test(original)) return original;

  const withDraftFalse = original.replace(/^draft:\s*true\s*$/m, 'draft: false');
  if (/^date:\s*.*$/m.test(withDraftFalse)) {
    return withDraftFalse.replace(/^date:\s*.*$/m, `date: ${publishDate}`);
  }

  return withDraftFalse.replace(/^---\n/, `---\ndate: ${publishDate}\n`);
}

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
      'User-Agent': 'engineer-news',
    },
  });

  if (!getRes.ok) return null;

  const file = await getRes.json() as GitHubFileResponse;
  const original = new TextDecoder().decode(
    Uint8Array.from(atob(file.content.replace(/\n/g, '')), c => c.charCodeAt(0))
  );
  const updated = publishDraft(original, todayInTaipei());

  if (original === updated) return null; // already published

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'engineer-news',
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

async function renameAndPublishFile(
  oldPath: string,
  newPath: string,
  token: string,
  owner: string,
  repo: string,
  title: string,
  publishDate: string,
): Promise<PublishResult | null> {
  const base = `https://api.github.com/repos/${owner}/${repo}/contents`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'engineer-news',
  };

  const getRes = await fetch(`${base}/${oldPath}`, { headers });
  if (!getRes.ok) return null;

  const file = await getRes.json() as GitHubFileResponse;
  const original = new TextDecoder().decode(
    Uint8Array.from(atob(file.content.replace(/\n/g, '')), c => c.charCodeAt(0))
  );
  const updated = publishDraft(original, publishDate);
  if (original === updated) return null;

  const putRes = await fetch(`${base}/${newPath}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `publish: ${title}`,
      content: btoa(unescape(encodeURIComponent(updated))),
    }),
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub create ${putRes.status}: ${err}`);
  }
  const result = await putRes.json() as { commit: { sha: string } };

  const delRes = await fetch(`${base}/${oldPath}`, {
    method: 'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `publish: rename ${title}`, sha: file.sha }),
  });
  if (!delRes.ok) {
    const err = await delRes.text();
    throw new Error(`GitHub delete ${delRes.status}: ${err}`);
  }

  return { file: newPath, commitSha: result.commit.sha };
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
  if (!/^[a-z]+\/_?\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug format' }, { status: 400 });
  }

  const basename = slug.split('/').pop() ?? '';
  const hasDraftPrefix = basename.startsWith('_');
  const cleanSlug = hasDraftPrefix ? slug.replace(/\/_/, '/') : slug;
  const slugTitle = cleanSlug.split('/').pop() ?? cleanSlug;
  const publishDate = todayInTaipei();

  const published: PublishResult[] = [];

  const zhOldPath = `src/content/posts/${slug}.md`;
  const zhNewPath = `src/content/posts/${cleanSlug}.md`;
  const zhResult = hasDraftPrefix
    ? await renameAndPublishFile(zhOldPath, zhNewPath, env.GITHUB_TOKEN, env.GITHUB_OWNER, env.GITHUB_REPO, slugTitle, publishDate)
    : await publishFile(zhOldPath, env.GITHUB_TOKEN, env.GITHUB_OWNER, env.GITHUB_REPO, slugTitle);
  if (zhResult) published.push(zhResult);

  const enOldPath = `src/content/posts/${slug}.en.md`;
  const enNewPath = `src/content/posts/${cleanSlug}.en.md`;
  const enResult = hasDraftPrefix
    ? await renameAndPublishFile(enOldPath, enNewPath, env.GITHUB_TOKEN, env.GITHUB_OWNER, env.GITHUB_REPO, slugTitle, publishDate)
    : await publishFile(enOldPath, env.GITHUB_TOKEN, env.GITHUB_OWNER, env.GITHUB_REPO, slugTitle);
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
