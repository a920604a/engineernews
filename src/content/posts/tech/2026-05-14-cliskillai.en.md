---
title: "OpenClaw × Playwright CLI: Three-Stage AI Browser Automation with Zero Tokens at Runtime"
date: 2026-05-14T11:18:29.270Z
category: tech
tags: ["automation", "playwright", "openclaw", "ai-agent", "browser", "workflow"]
lang: en
tldr: "OpenClaw's three-stage workflow — AI exploration, Skill distillation, zero-token execution — cuts browser automation runtime costs to zero after the initial learning run."
description: "A guide to OpenClaw × Playwright CLI's three-stage AI browser automation: AI explores once, encodes the workflow into a reusable Skill file, then runs indefinitely with zero token consumption."
type: how-to
original_url: "https://www.youtube.com/watch?v=nlK7-zuYDcs"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260522_235235_077608.wav"
---

The same login flow, the same form fills, the same data scraping — you've done these workflows before, yet every run still burns tokens on AI inference.

OpenClaw's approach is direct: **let the AI learn once, distill it into a Skill file, then run token-free forever**.

## TL;DR

- **Playwright CLI** (not MCP) paired with **OpenClaw Skills** is one of the most token-efficient AI browser automation setups available
- Three-stage workflow: AI exploration (~41% tokens) → Skill distillation (~5% tokens) → zero-token execution
- A Skill is a Markdown file describing browser steps; once created, subsequent runs consume zero inference tokens
- The ClawHub registry has thousands of community Skills ready to install

## Why Not Playwright MCP?

Connecting Playwright MCP directly to an AI agent works, but every step requires live model inference — high token cost, high latency.

**Playwright CLI** is a browser control interface purpose-built for AI agents:

- Wraps browser operations (navigate, click, fill, screenshot, tab management) as structured CLI commands
- Roughly **4x lower token consumption** compared to Playwright MCP solutions
- Outputs AI-readable plain text summaries rather than raw DOM trees

The efficiency gap comes from a key design decision: MCP solutions have the model re-reason between every single step; Playwright CLI serializes browser state into compact, AI-friendly snapshots.

## The Three-Stage Workflow

The core insight: **concentrate AI inference costs in a one-time learning phase, not every execution**.

### Stage 1: AI Exploration (~41% tokens)

Have the AI agent operate the target site once using Playwright CLI:

```bash
# Install the Playwright CLI Skill
clawhub install playwright-cli

# Run an exploratory session
openclaw "Log into the target site and retrieve today's notifications"
```

The AI reasons in real time — discovering UI structure, finding correct selectors, handling dynamic content. Token cost is highest here, but this happens only **once**.

### Stage 2: Skill Distillation (~5% tokens)

After exploration, encode the workflow into a Skill file (plain Markdown):

```markdown
# skill: login-and-fetch-notifications
## Description
Log into the site and retrieve the latest notifications

## Prerequisites
- playwright-cli installed

## Steps
1. playwright-cli navigate {{TARGET_URL}}
2. playwright-cli fill [name="username"] {{USERNAME}}
3. playwright-cli fill [name="password"] {{PASSWORD}}
4. playwright-cli click button[type="submit"]
5. playwright-cli wait .notification-list
6. playwright-cli snapshot .notification-list
```

The Skill is the "operations playbook" — every step is explicit, no AI reasoning required to follow it.

### Stage 3: Zero-Token Execution

With the Skill in place, every subsequent run is just:

```bash
clawhub run login-and-fetch-notifications \
  --TARGET_URL=https://example.com \
  --USERNAME=me@example.com \
  --PASSWORD=***
```

**No model inference at runtime.** Playwright CLI follows the Skill script directly. Run it three times, a hundred times, or on a cron schedule — inference token cost stays at zero.

## Skill Design Principles

OpenClaw Skills have a few properties worth noting:

**Parameterized**: `{{VARIABLE}}` placeholders inject runtime values, so one Skill covers multiple accounts or target URLs.

**Composable**: Skills can invoke other Skills, enabling compound workflows:

```markdown
## Steps
1. skill: login-and-fetch-notifications  # calls another Skill
2. playwright-cli click .mark-all-read
3. playwright-cli screenshot cleared.png
```

**Shareable**: Publish to ClawHub for the community to install:

```bash
clawhub search "form automation"
clawhub install openclaw/playwright-cli
clawhub publish ./my-skill/
```

## When to Use (and When Not To)

**Good fit:**

| Scenario | Notes |
|----------|-------|
| Recurring data extraction | Daily price scraping, social metrics |
| Account operation automation | Bulk logins, form fills, notification handling |
| Test flow recording | Lock down QA manual paths into repeatable Skills |
| Cross-platform data sync | Move data between platforms with no API |

**Poor fit:**

- Tasks requiring real-time decision-making based on page content
- Sites with frequently changing UI structure
- Flows blocked by CAPTCHA or interactive verification

## Quick Start

```bash
npm install -g openclaw
npx clawhub install playwright-cli
npx playwright install chromium

# First exploratory run (spends tokens — but only once)
openclaw "Open GitHub and screenshot my open pull requests"
```

## References

- [Say Goodbye to Repetitive Tasks: CLI+Skill AI Browser Automation Framework (YouTube)](https://www.youtube.com/watch?v=nlK7-zuYDcs)
- [Playwright CLI + Skill Three-Stage: Zero-Token AI Browser Automation](https://www.heyuan110.com/zh/posts/ai/2026-04-18-playwright-cli-skill-zero-token-automation/)
- [GitHub - openclaw/clawhub: Skill Directory for OpenClaw](https://github.com/openclaw/clawhub)
