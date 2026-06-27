---
title: "Dialogue as Documentation: Turning a Debug Session into an Article with Claude Code"
date: 2026-04-21T08:03:40+08:00
category: learning
tags: ["ai", "claude-code", "debugging", "writing-automation"]
lang: en
series:
  name: "Claude Code 自動化指南"
  order: 2
description: "How to turn engineering conversations and debugging sessions into technical articles automatically with Claude Code — including prompt design and the practical tweaks that make it work."
tldr: "Treat a conversation as raw material for an article: with a structured prompt and a template, Claude Code turns a debugging thread into a publishable technical post."
type: "case-study"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260627_054516_715920.mp3"
---

**Claude Code** is Anthropic's CLI tool that lets developers collaborate with Claude on code and docs straight from the terminal. It supports a "skill" extension point — custom workflow scripts. This site's `post` skill turns conversation or notes into structured Markdown articles; under the hood, the `ingest.ts` script handles secret redaction, calls an LLM to extract metadata, and finally writes an article file with complete frontmatter.

## TL;DR

Run `make ingest FILE=<conversation-file>` to turn an engineering conversation into a structured technical article in one step: `ingest.ts` automatically redacts secrets, extracts frontmatter metadata, and applies a debug-article template. The output is ~80% usable; the remaining 20% is human work — filling in the technical root cause and the takeaways.

## Background and challenge

When several people debug together, the conversation usually looks like this:

```
[10:32] @alice: My D1 query keeps timing out, I'm on wrangler 2.x
[10:33] @bob: Can you paste the error log?
[10:34] @alice: Error: D1_EXEC_ERROR: Error in line 1: ...SQLITE_BUSY
[10:35] @alice: I already added a retry but it still fails
[10:47] @bob: Are you using batch()?
[10:51] @alice: No, should I be?
[10:52] @bob: Try it, I got bitten by this last time too
[11:08] @alice: batch() works! But inserts still die occasionally
```

A 40-minute thread interleaved with code snippets and error messages is a puzzle-solving process for the people involved, but pure noise for a later reader. Paste it straight onto a blog? Completely unreadable.

Worse, this kind of conversation usually carries secrets: API tokens, internal URLs, staging database IDs. Publishing it as-is would be a security problem.

The goal is to turn this conversation into a complete technical article — "The D1 SQLITE_BUSY error and the batch() fix" — without rewriting the whole thing by hand. And this isn't a one-off: almost every engineering team has a pile of valuable debug knowledge buried in chat logs that never gets organized.

## Designing the solution

The most obvious approach: throw the whole conversation at Claude and ask it to "summarize" and "list the steps." That hits problems fast: the model tends toward free-form prose, producing an essay rather than a structured article you can paste into a blog. Run the same conversation twice and the output format differs; sometimes the section order changes, sometimes a key error message gets dropped.

Second attempt: use Claude Code's templated output, prefixing the prompt with explicit field requirements (background, problem, attempts, solution, lessons) and formatting rules (Markdown, fenced code blocks, a list of sensitive terms). Now the structure was consistent, but it still needed a human to fill in the "why it happens" section — the model only described *what* happened, not *why*.

Another problem was secret handling. Manually listing "please remove the following terms" in the prompt was unreliable: the model sometimes ignored them, sometimes rewrote them into something that meant something different. What I needed was a filter that runs *before* the prompt reaches the model.

The final approach: split it into two stages. First, `make ingest` runs `ingest.ts` to handle secret redaction and basic metadata extraction automatically; then a human fills in the "why it happens" and "what I learned" sections. Automation does the mechanical work; humans keep the parts that require judgment.

## Implementation details

### Step 1: Prepare the input file

Copy the conversation into a plain-text file, strip platform metadata (Slack reactions, read receipts, etc.), and keep the timestamps and speaker labels. Save it as `debug-session.txt`.

Note: you don't need to clean the content beforehand — `ingest.ts`'s secret filter handles that. Just make sure it's readable plain text.

### Step 2: Run ingest

```bash
make ingest FILE=debug-session.txt
```

This produces a new Markdown file under `src/content/posts/`, named automatically from the extracted title.

`ingest.ts` does three things:

1. Scans for and redacts secrets (API tokens, internal URL patterns, database ID formats)

2. Calls `llama-3.1-8b` to extract title, tags, tldr, and description, emitting them as YAML frontmatter

3. Applies a section template based on the article type (bug/debugging), instructing the model to emit a complete Markdown structure

The core of the prompt (inside `ingest.ts`):

```
You are a technical blog editor. Below is an engineering conversation.
Output a well-structured Traditional Chinese technical article in this format:

---
title: ""
date: <today>
category: "tech"
tags: []
lang: zh-TW
tldr: ""
description: ""
draft: false
---

## TL;DR
## Context
## Problem
## Attempts
## Solution
## Why it happens
## What I learned

Rules:
- Use fenced code blocks with a language tag
- Secrets are already redacted; do not reconstruct them
- "Why it happens" must explain the root cause, not just describe symptoms
- Each section needs at least 2-3 sentences; single-line bullets are not accepted
```

### Step 3: Human review and additions

The output article is usually 80% usable. The parts that need a human:

- The technical depth of "why it happens" (the model tends to describe symptoms rather than the root cause)

- Citing specific error messages (the model sometimes skips the key stack trace)

- The judgment in the conclusion (when to use batch(), when not to)

Review usually takes 10-15 minutes — versus 60-90 minutes to write a 1000-word technical article from scratch, a roughly 75% time saving.

### Input → output comparison

**Input (raw conversation snippet):**
```
[10:34] @alice: Error: D1_EXEC_ERROR: SQLITE_BUSY
[10:52] @bob: Try batch()
[11:08] @alice: batch() works
```

**Output (the corresponding section after ingest):**

````markdown
## Solution

Switch to `DB.batch()` to merge multiple statements into a single transaction:

```ts
await DB.batch([
  DB.prepare('INSERT INTO logs ...').bind(...),
  DB.prepare('UPDATE posts ...').bind(...),
]);
```

batch() wraps multiple operations into an atomic transaction, avoiding lock
contention under concurrent writes.
````

## Results

Once the conversation-to-article workflow ran smoothly, the team's knowledge-leakage problem improved concretely: each week's debug sessions yield about 3-4 cases worth recording. That knowledge used to vanish entirely after the next sprint; now each case takes about 20 minutes to turn into a searchable article. Over a few months, the article library grew from zero to 40+ posts — and every one is a real problem we hit, not a textbook example.

## What I learned

**Specify the output format explicitly**: asking for "Markdown output" isn't enough. You need to specify section headings, code formatting rules, and which fields are required. The more explicit the format, the less post-processing. A practical trick is to paste a blank template (headings only, no content) directly into the prompt so the model "fills in the blanks" instead of "free-styling."

**Automation is an accelerator, not a replacement**: `ingest.ts` handles mechanical work — formatting, secret redaction, metadata extraction. The judgment work (explaining the technical root cause, getting the conclusion right) still needs a human. Treat automation as a "draft generator" rather than "one-click publish" and quality improves a lot.

**Keep an index to the original conversation**: don't delete the original `debug-session.txt` after publishing. Months later, the original timestamps and conversational context often supply context that isn't in the article.

**Batched processing beats one shot**: if the conversation is long (over 200 lines), split it into a "problem description" segment and a "solution" segment, ingest them separately, then merge by hand. This usually beats throwing the whole thing at the model at once — the model catches key details more easily within a shorter context.

**The root cause of D1 SQLITE_BUSY**: D1 (Cloudflare's SQLite) is prone to `SQLITE_BUSY` under concurrent writes, because SQLite's write lock is database-wide, not a row or table lock. `batch()` wraps multiple statements into a single transaction, sharply cutting lock contention: N individual lock requests become one atomic operation.

## References

- [Claude Code official docs](https://code.claude.com/docs/en/common-workflows)
- [Streamlining Blog Writing with Claude Code](https://www.aaronheld.com/post/streamlining-blog-writing-with-claude-code/)
- [Working Effectively with Claude: Context Engineering for Technical Content](https://dev.to/drguthals/working-effectively-with-claude-from-vibe-prompting-to-context-engineering-for-technical-content-46gl)
