---
title: "Loop Engineering: Designing Systems That Prompt Agents for You"
date: 2026-06-20
category: tech
tags: ["loop-engineering", "ai-agent", "claude-code", "harness-engineering", "automation"]
lang: en
series:
  name: "AI Agent 實戰"
  order: 4
type: deep-dive
tldr: "Loop Engineering replaces you as the person who prompts the agent. You design the system that does it instead."
description: "From Boris Cherny's daily practice to Addy Osmani's naming to Blake Crosley's core insight — the five building blocks of Loop Engineering, the verification bottleneck, and three things you can start today."
draft: false
audio_url: "/api/tts/r2/tts/tts_20260620_090641_928210.mp3"
key_points:
  - "Stop prompting agents; build systems that prompt them. Prompts become one component of a self-running loop, not the job."
  - "Verification cost, not loop complexity, decides what you can automate. Machine-checkable success conditions are the real prerequisite."
  - "Never let the agent that did the work judge whether it's done; early exit needs a separate verifier."
---

Boris Cherny runs hundreds of agents during the day and thousands overnight.

Not because he's prompting harder — he says he's stopped manually prompting Claude at all. He's designing systems that prompt agents. That shift is Loop Engineering.

---

## TL;DR

Loop Engineering is "designing the system that prompts agents," not the practice of prompting them better. The core insight: **verification cost — not loop complexity — decides what you can automate.**

---

## Four Abstraction Jumps

From 2023 to 2026, the core skill in AI development jumped one abstraction level per year:

| Year | Core Skill | Developer Role |
|------|------------|----------------|
| 2023 | Prompt Engineering | Write precise prompts for good outputs |
| 2024 | Agent Orchestration | Coordinate multiple agents on complex tasks |
| 2025 | Harness Engineering | Configure the agent's environment via CLAUDE.md, hooks |
| 2026 | Loop Engineering | Design self-running feedback loops for autonomous agents |

Each layer doesn't replace the one below — it pushes it down into infrastructure. You still write prompts. Prompts are just a component of the loop now, not the job itself.

---

## Three People, One Week

In June 2026, three separate statements converged inside a week and triggered a recognition moment in the developer community.

**Boris Cherny** (head of Claude Code) described his evolution on the Acquired Unplugged podcast: IDE → prompt Claude → 5–10 parallel sessions → uninstalled IDE in November 2024 → hundreds of agents during the day, thousands overnight. He no longer manually prompts Claude. The loop runs itself.

**Peter Steinberger** (founder of OpenClaw) tweeted: stop directly prompting agents, design the system that prompts agents instead.

**Addy Osmani** (engineering lead, Google Chrome) followed with the clearest definition:

> "Loop engineering is replacing yourself as the person who prompts the agent. You design the system that does it instead."

He positions loop one layer above harness: "Harness configures the environment — but a loop has timers, spawns helpers, and can feed itself."

---

## Basic Loop Structure

```
Discover work → Dispatch to agent → Agent executes → Observe output
  → Verify correctness → Record state → Decide next step → Repeat
```

A prompt is a one-shot trigger. A loop is a continuously self-driving system.

The practical difference: prompts consume your attention, loops consume token budget. Attention is scarce; tokens can be bought.

---

## Five Building Blocks + Memory

Osmani breaks a complete loop into five components plus a memory layer. He notes that Claude Code and OpenAI Codex now ship with all five: "the shape is the same across products."

**Scheduled Automations** — The loop's entry point: cron jobs, GitHub Actions webhooks, or tool-native scheduling. Osmani cites real internal use at OpenAI: daily issue triage, CI failure summaries, commit briefings, weekly bug searches.

**Git Worktrees** — Each agent works in an isolated worktree, sharing git history without conflicts. This is what lets multiple agents run in parallel — one fixing a bug, one writing tests, one refactoring — while you sleep.

**Skills** — Project knowledge encoded in CLAUDE.md, AGENTS.md, and skill files. Osmani's framing: "An agent starts every session cold and will fill any hole in your intent with a confident guess. A skill is intent written down." Without skills, agents re-derive your conventions every time.

**Plugins / MCP Connectors** — External integrations via MCP (Model Context Protocol): GitHub, Slack, databases, monitoring systems. This layer defines the boundary of what agents can sense and act on.

**Sub-agents (Maker-Checker Split)** — Executor and verifier are separate. This is the most critical design decision. Osmani: "The reason it matters specifically inside a loop is the loop runs while you are not watching, so a verifier you actually trust is the only reason you can walk away." Claude Code's `/goal` implements this — a separate model judges completion, not the agent that did the work.

**Durable Memory** — Agents are amnesiac; the filesystem isn't. Files like `progress.txt`, `AGENTS.md`, and `prd.json` carry state across sessions. This is what lets a loop remember where it left off.

---

## Verification Cost Is the Real Bottleneck

Blake Crosley's analysis cuts to the real constraint:

> "Verification cost, not loop construction, decides what you can automate."

Every successful loop Cherny has named has **machine-checkable success conditions** — CI fixes, auto-rebasing, feedback clustering — not open-ended feature work.

The logic is clean:

- Verification is automatable (test suite passes, lint clean, type check clear) → loop can run indefinitely
- Verification requires human judgment (does this UI look good, is this architecture decision right) → loop degrades to "produces a pile of things for you to review"

Four conditions for a loop worth running:

1. **Task is repeatable** — not a one-off exploration
2. **Verification is automatable** — test suite, linter, type checker exists
3. **Token budget absorbs waste** — loops retry, explore dead ends
4. **Agent has the tools it needs** — no human required to operate external systems

Miss any one of these and the loop's cost exceeds its benefit. This isn't a limitation of Loop Engineering — it's a sharp filter you can run over any incoming requirement.

---

## Known Limitations

**Token cost** is real. Loops re-read context, retry, explore multiple paths. Osmani: "usage patterns can vary wildly if you are token rich or poor."

**Comprehension debt** is subtler than technical debt. The gap between what exists in your codebase and what you actually understand. With tech debt you at least know what you owe; with comprehension debt you don't know what you don't know.

**Cognitive surrender** is the trap: "When the loop runs itself it's very tempting to stop having an opinion and just take whatever it gives back." A loop accelerates work you already understand. It's poison for work you're trying to avoid understanding.

**Early exit** happens when agents declare completion prematurely. This is exactly why maker-checker isn't optional — the agent that did the work cannot be trusted to evaluate whether it's done.

**Review becomes the new bottleneck.** Your throughput isn't capped by token budget; it's capped by how fast you can inspect output. Loop Engineering shifts the scarce resource from execution to judgment.

---

## Three Things to Start Today

**Write your conventions into CLAUDE.md / AGENTS.md.** "We don't do it this way because of what happened last time" — that knowledge written down is a skill. Without it, every agent session starts with guessing.

**Run your first loop with a clear verification condition.** Start small: babysit one PR, run lint check hourly. The loop size doesn't matter. What matters is that "done" is machine-checkable — "CI passes" beats "looks good."

**Always use a separate agent to verify.** Never let the agent that did the work evaluate whether it's finished. This single rule prevents early exit and forces you to define completion criteria before the loop starts.

---

## Bottom Line

Osmani's closing line is worth keeping:

> "Build the loop. But build it like someone who intends to stay the engineer, not just the person who presses go."

The loop does the typing. The thinking is still your job.

---

## References

- [Addy Osmani - Loop Engineering](https://addyosmani.com/blog/loop-engineering/)
- [Addy Osmani - Self-Improving Coding Agents](https://addyosmani.com/blog/self-improving-coding-agents/)
- [Addy Osmani - Long-running Agents](https://addyosmani.com/blog/long-running-agents/)
- [Boris Cherny - Acquired Unplugged](https://www.acquired.fm/episodes/unplugged-claude-code)
- [Blake Crosley - Loops Win Where Verification Is Cheap](https://blakecrosley.com/loops-win-where-verification-is-cheap)
- [Claude Code Docs](https://docs.anthropic.com/claude-code)
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io)
