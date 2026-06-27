---
title: "RTK: A Rust Tool That Cuts AI Coding Assistant Token Usage by 60–90%"
date: 2026-05-11T09:00:00.000Z
category: tech
tags: ["ai", "llm", "cli"]
lang: en
github: https://github.com/rtk-ai/rtk
draft: false
description: "RTK (Rust Token Killer) filters and compresses shell command output before it ever enters the AI context, saving 60–90% of tokens on common dev commands. A single Rust binary, zero dependencies, 100+ supported commands, and under 10ms overhead."
tldr: "Install one Rust binary, and the output of commands like git/grep/test/docker gets compressed before reaching the AI context — a 30-minute Claude Code session drops from roughly 118,000 tokens to about 23,900."
key_points:
  - "The problem isn't the AI — it's that command output is stuffed with things meaningless to an AI: color escape codes, blank lines, repeated headers, verbose stack traces."
  - "RTK intercepts and compresses output before it hits the context, saving 60–90% of tokens on common commands, with under 10ms overhead — a single Rust binary, zero dependencies."
  - "It complements 9Router: RTK compresses 'command output' while 9Router handles 'provider routing and cost' — two entirely different dimensions."
audio_url: "/api/tts/r2/tts/tts_20260627_150644_744190.mp3"
---

When you write code with Claude Code, a single `git diff` can eat up thousands of tokens. The problem isn't that the AI is dumb — it's that the output itself is full of stuff that means nothing to an AI: color escape codes, blank lines, repeated headers, verbose stack traces. You pay for those tokens all the same, your context window gets filled all the same, and none of it helps the model understand your code.

[RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk) takes this angle: it intercepts, filters, and compresses command output **before it enters the AI context**, then hands a clean version to the LLM. It's a single Rust binary, zero dependencies, supports 100+ commands, and adds under 10ms of overhead. The project has 66k stars on GitHub, is actively maintained, and is Apache 2.0 licensed.

## Design Philosophy: Compress the Noise, Not the Signal

RTK doesn't mindlessly truncate output — it does semantic compression tailored to each command's output format: stripping ANSI color codes, collapsing repeated blocks, removing meaningless whitespace, and keeping the parts that actually carry information. For an AI, what matters about `git status` is "which files changed," not the pile of formatting and prompt text around it.

The official estimate for a 30-minute Claude Code session (a medium-sized TypeScript / Rust project):

| Command | Count | Original tokens | After RTK | Savings |
|---|---|---|---|---|
| `ls` / `tree` | 10× | 2,000 | 400 | −80% |
| `cat` / `read` | 20× | 40,000 | 12,000 | −70% |
| `grep` / `rg` | 8× | 16,000 | 3,200 | −80% |
| `git status` | 10× | 3,000 | 600 | −80% |
| `git diff` | 5× | 10,000 | 2,500 | −75% |
| `git add/commit/push` | 8× | 1,600 | 120 | −92% |
| `cargo test` / `npm test` | 5× | 25,000 | 2,500 | −90% |
| `pytest` / `go test` | 7× | 14,000 | 1,400 | −90% |
| **Total** | | **~118,000** | **~23,900** | **−80%** |

> This is an estimate for a medium-sized project; actual savings vary with project size. Overall it lands in the 60–90% range.

## Installation and Setup

```bash
# Homebrew (recommended)
brew install rtk

# Or one-line install (Linux / macOS)
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh

# Or from source
cargo install --git https://github.com/rtk-ai/rtk
```

Wire it into your AI coding tool (it writes the right config for each tool):

```bash
rtk init -g --copilot     # GitHub Copilot
rtk init -g --claude      # Claude Code
# Same idea for other tools
```

After that, whenever the tool runs a shell command, the output passes through RTK's compression before entering the context. Your workflow doesn't change at all — the AI just sees a cleaner version.

## How It Differs from Vector Compression / Provider Routing

RTK solves token waste at the **command-output layer**, which is easy to confuse with two other things:

- It is **not** response compression on the model side, and it doesn't touch your prompt; it only acts on the "tool output → context" segment.
- It's complementary to, not competing with, [9Router](https://github.com/decolua/9router): 9Router solves "multi-provider switching and cost" at the **request-routing layer**, while RTK solves "context getting blown out by noise" at the **output layer**. Using both together causes no conflict.

> A naming note: 9Router ships a compression middleware also called RTK, but that's 9Router's own thing — it just happens to share an acronym with this standalone Rust tool.

## Who It's For

Anyone using a CLI-based AI coding tool (Claude Code, Copilot, Codex, Cursor…) who frequently has the AI run commands like `git`, tests, `grep`, or `docker`. The bigger the project and the more often the AI runs commands, the more tokens you save. The cost is near zero: one binary, <10ms overhead, no change to your workflow.

## References

- [RTK GitHub](https://github.com/rtk-ai/rtk)
- [RTK official docs](https://www.rtk-ai.app/guide)
