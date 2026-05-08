# Draft Filename `_` Prefix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prefix all draft article filenames with `_` so they are immediately identifiable in VSCode and file browsers, while keeping published post URLs clean (no `_`).

**Architecture:** `crawl.ts` writes `_YYYY-MM-DD-slug.md` when creating drafts. Existing draft files are renamed via `git mv`. Admin APIs (`publish`, `save`) detect the `_` prefix and rename the file when promoting to published. Slug validation regexes in all 4 admin APIs are relaxed to allow the `_` prefix. No Astro routing changes needed — drafts are already filtered out of `getStaticPaths`.

**Tech Stack:** TypeScript, Astro content collections, GitHub Contents API, `git mv`

---

## Files Modified

| File | Change |
|------|--------|
| `scripts/crawl.ts` | Prefix draft filenames with `_` |
| `src/pages/api/admin/raw.ts` | Update slug regex |
| `src/pages/api/admin/delete.ts` | Update slug regex |
| `src/pages/api/admin/save.ts` | Update slug regex + rename on publish |
| `src/pages/api/admin/publish.ts` | Update slug regex + rename on publish |
| 10 existing draft `.md` files | `git mv` to add `_` prefix |

---

## Task 1: Rename Existing Draft Files

**Files:**
- Modify: all current `draft: true` files (rename via `git mv`)

- [ ] **Step 1: Identify all draft files**

```bash
grep -rl "draft: true" src/content/posts
```

- [ ] **Step 2: Rename each file with `git mv`**

Run for each `zh-TW` file:
```bash
git mv src/content/posts/career/2026-04-30-ep667-small-talk.md \
       src/content/posts/career/_2026-04-30-ep667-small-talk.md

git mv src/content/posts/career/2026-04-27-alruckqq_pw.en.md \
       src/content/posts/career/_2026-04-27-alruckqq_pw.en.md

git mv src/content/posts/tech/2026-04-28-what-games-can-we-build-with-a-small-model-10b-active-parame.en.md \
       src/content/posts/tech/_2026-04-28-what-games-can-we-build-with-a-small-model-10b-active-parame.en.md

git mv src/content/posts/tech/2026-05-02-ep150etftsmccpu.en.md \
       src/content/posts/tech/_2026-05-02-ep150etftsmccpu.en.md

git mv src/content/posts/tech/2026-05-02-ep150etftsmccpu.md \
       src/content/posts/tech/_2026-05-02-ep150etftsmccpu.md

git mv src/content/posts/tech/2026-05-03-ai-decodingworkflow-reasoning-.md \
       src/content/posts/tech/_2026-05-03-ai-decodingworkflow-reasoning-.md

git mv src/content/posts/tech/2026-04-30--system-design-.en.md \
       src/content/posts/tech/_2026-04-30--system-design-.en.md

git mv src/content/posts/tech/2026-05-06-github113ai-skill-codex-ai.en.md \
       src/content/posts/tech/_2026-05-06-github113ai-skill-codex-ai.en.md

git mv src/content/posts/career/2026-04-30-ep667-small-talk.en.md \
       src/content/posts/career/_2026-04-30-ep667-small-talk.en.md

git mv src/content/posts/tech/2026-05-03-ai-decodingworkflow-reasoning-.en.md \
       src/content/posts/tech/_2026-05-03-ai-decodingworkflow-reasoning-.en.md
```

- [ ] **Step 3: Verify**

```bash
git status
# Expected: 10 renamed files shown
grep -rl "draft: true" src/content/posts
# All results should now show _ prefix in filename
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: rename draft files with _ prefix for local visibility"
```

---

## Task 2: Update `crawl.ts` Draft Filename Generation

**Files:**
- Modify: `scripts/crawl.ts` (lines 668, 711)

- [ ] **Step 1: Update `writePost` filename**

In `scripts/crawl.ts`, find line 668:
```typescript
  const fileName = `${today}-${slug}.md`;
```
Change to:
```typescript
  const fileName = `_${today}-${slug}.md`;
```

- [ ] **Step 2: Update `writeEnglishPost` filename**

Find line 711:
```typescript
  const fileName = `${today}-${slug}.en.md`;
```
Change to:
```typescript
  const fileName = `_${today}-${slug}.en.md`;
```

- [ ] **Step 3: Verify the functions still produce correct paths**

```bash
grep -n "fileName\|outputPath" scripts/crawl.ts | head -20
# Expected: both functions show _ prefix
```

- [ ] **Step 4: Commit**

```bash
git add scripts/crawl.ts
git commit -m "feat: prefix crawl-generated draft filenames with _"
```

---

## Task 3: Update Slug Validation Regex in Admin APIs

The current regex `/^[a-z]+\/\d{4}-\d{2}-\d{2}-[\w-]+$/` rejects slugs with `_` before the date. Update all 4 files to allow an optional `_` prefix after the category slash.

**Files:**
- Modify: `src/pages/api/admin/raw.ts:46`
- Modify: `src/pages/api/admin/save.ts:78`
- Modify: `src/pages/api/admin/delete.ts:85`
- Modify: `src/pages/api/admin/publish.ts:123`

- [ ] **Step 1: Update `raw.ts`**

Find in `src/pages/api/admin/raw.ts`:
```typescript
  if (!/^[a-z]+\/\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug' }, { status: 400 });
  }
```
Change to:
```typescript
  if (!/^[a-z]+\/_?\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug' }, { status: 400 });
  }
```

- [ ] **Step 2: Update `save.ts`**

Find in `src/pages/api/admin/save.ts`:
```typescript
  if (!/^[a-z]+\/\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug format' }, { status: 400 });
  }
```
Change to:
```typescript
  if (!/^[a-z]+\/_?\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug format' }, { status: 400 });
  }
```

- [ ] **Step 3: Update `delete.ts`**

Find in `src/pages/api/admin/delete.ts`:
```typescript
  if (!/^[a-z]+\/\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug format' }, { status: 400 });
  }
```
Change to:
```typescript
  if (!/^[a-z]+\/_?\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug format' }, { status: 400 });
  }
```

- [ ] **Step 4: Update `publish.ts`**

Find in `src/pages/api/admin/publish.ts`:
```typescript
  if (!/^[a-z]+\/\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug format' }, { status: 400 });
  }
```
Change to:
```typescript
  if (!/^[a-z]+\/_?\d{4}-\d{2}-\d{2}-[\w-]+$/.test(slug)) {
    return Response.json({ error: 'Invalid slug format' }, { status: 400 });
  }
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/admin/raw.ts src/pages/api/admin/save.ts \
        src/pages/api/admin/delete.ts src/pages/api/admin/publish.ts
git commit -m "fix: allow _ prefix in admin API slug validation"
```

---

## Task 4: Update `publish.ts` to Rename File on Publish

When publishing a `_`-prefixed draft via the Publish button, the API must:
1. Create the new file (without `_`) with `draft: false`
2. Delete the old file (with `_`)

This keeps published post URLs clean.

**Files:**
- Modify: `src/pages/api/admin/publish.ts`

- [ ] **Step 1: Add `renameAndPublishFile` function**

Add this function after the existing `publishFile` function (after line 97):

```typescript
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
```

- [ ] **Step 2: Update main handler to detect and route `_` prefix**

Replace the section from `const slugTitle = ...` to the end of the `published` array building (lines 127–137):

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/admin/publish.ts
git commit -m "feat: rename _ prefixed draft file when publishing"
```

---

## Task 5: Update `save.ts` to Rename File When Saving as Published

When the edit panel saves with `draft: false` (「儲存並發布」path), if the slug has a `_` prefix, rename the file.

**Files:**
- Modify: `src/pages/api/admin/save.ts`

- [ ] **Step 1: Add `renameAndSaveFile` helper after `buildFrontmatter`**

Add after the `buildFrontmatter` function (after line 53):

```typescript
async function renameAndSaveFile(
  oldPath: string,
  newPath: string,
  content: string,
  oldSha: string,
  token: string,
  owner: string,
  repo: string,
  commitMsg: string,
): Promise<string> {
  const base = `https://api.github.com/repos/${owner}/${repo}/contents`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'engineer-news',
    'Content-Type': 'application/json',
  };

  const putRes = await fetch(`${base}/${newPath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: commitMsg,
      content: btoa(unescape(encodeURIComponent(content))),
    }),
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub create ${putRes.status}: ${err}`);
  }
  const result = await putRes.json() as { commit: { sha: string } };

  const delRes = await fetch(`${base}/${oldPath}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ message: commitMsg, sha: oldSha }),
  });
  if (!delRes.ok) {
    const err = await delRes.text();
    throw new Error(`GitHub delete ${delRes.status}: ${err}`);
  }

  return result.commit.sha;
}
```

- [ ] **Step 2: Update main handler to detect rename-on-publish case**

Replace the block from `const filePath = ...` through the final `return Response.json(...)` with:

```typescript
  const basename = slug.split('/').pop() ?? '';
  const hasDraftPrefix = basename.startsWith('_');
  const cleanSlug = hasDraftPrefix ? slug.replace(/\/_/, '/') : slug;

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
  const existing = await getRes.json() as GitHubFileResponse;
  const existingRaw = new TextDecoder().decode(
    Uint8Array.from(atob(existing.content.replace(/\n/g, '')), c => c.charCodeAt(0))
  );

  const title = String(frontmatter.title ?? cleanSlug.split('/').pop());
  const isDraft = frontmatter.draft === true;
  const fmToSave = { ...frontmatter };
  if (wasDraftTrue(existingRaw) && fmToSave.draft === false) {
    fmToSave.date = todayInTaipei();
  }

  const content = `${buildFrontmatter(fmToSave)}\n\n${markdownBody.trimStart()}`;
  const commitMsg = isDraft ? `draft: update ${title}` : `publish: ${title}`;
  const actionsUrl = `https://github.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/deploy.yml`;

  let commitSha: string;

  if (!isDraft && hasDraftPrefix) {
    const oldPath = filePath;
    const newPath = `src/content/posts/${cleanSlug}.md`;
    commitSha = await renameAndSaveFile(oldPath, newPath, content, existing.sha, env.GITHUB_TOKEN, env.GITHUB_OWNER, env.GITHUB_REPO, commitMsg);
  } else {
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
        message: commitMsg,
        content: btoa(unescape(encodeURIComponent(content))),
        sha: existing.sha,
      }),
    });
    if (!putRes.ok) {
      const err = await putRes.text();
      return Response.json({ error: `GitHub PUT ${putRes.status}: ${err}` }, { status: 502 });
    }
    const result = await putRes.json() as { commit: { sha: string } };
    commitSha = result.commit.sha;
  }

  return Response.json({ commitSha, actionsUrl, draft: isDraft });
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/admin/save.ts
git commit -m "feat: rename _ prefixed draft file when saving as published"
```

---

## Verification

- [ ] Run local dev server and open `/review?token=dev-secret`
- [ ] Confirm draft articles appear in the list (with `_` prefixed IDs)
- [ ] Confirm edit panel loads correctly for a draft
- [ ] Check that `src/content/posts/*/` in VSCode/Finder shows all drafts sorted to top
- [ ] Run `make build` — confirm no Astro build errors
- [ ] Run `grep -rl "draft: true" src/content/posts` — all results should have `_` prefix
