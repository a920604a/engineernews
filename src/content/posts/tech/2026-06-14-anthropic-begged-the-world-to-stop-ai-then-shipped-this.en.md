---
title: "Anthropic Asked the World to Stop, Shipped Fable 5, Then Got It Shut Down"
date: 2026-06-14T04:54:52.915Z
category: tech
tags: ["AI", "Anthropic", "Fable 5", "safety", "policy", "government"]
lang: en
tldr: "Anthropic published a pause-AI paper on June 4, launched Fable 5 on June 9, and had it forcibly taken offline by the US government on June 12. All within ten days."
description: "Fable 5 went from launch to government-mandated shutdown in four days. A case study in the gap between AI safety rhetoric and shipping reality."
type: newsjacking
original_url: "https://www.youtube.com/watch?v=1PBRhm5ZnjU"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_202708_500781.mp3"
---

"We call on the world to pause." — Anthropic, June 4, 2026

"Fable 5 is now available at $50/million output tokens." — Anthropic, June 9, 2026

"Fable 5 must be taken offline immediately." — US Government, June 12, 2026

Three statements. Ten days. Every possible contradiction packed into one story.

## TL;DR

Anthropic co-signed a paper calling for a conditional global pause on frontier AI development on June 4. Five days later they launched Fable 5, their most powerful public model. Four days after that, the US government forced it offline citing a known jailbreak and national security concerns. Pause call to government shutdown: 10 days.

## What Happened

**June 4 — The Pause Paper**

*When AI Builds Itself*, co-authored by Anthropic staff and co-founder Jack Clark, made the case for caution:
- Claude writes 80%+ of commits in Anthropic's own codebase
- Engineers are shipping 8x more code than their 2021–2025 baseline
- Model task horizon doubles every 4 months (Opus 3: 4-minute tasks → Opus 4.6: 12-hour tasks)
- Jack Clark's personal estimate: 60% probability of recursive self-improvement by 2028

The paper called for governments and AI labs to coordinate a "conditional global pause"—halt frontier training if capability crosses certain thresholds.

Simultaneously, Anthropic was in active IPO preparation with a $47B annual revenue run rate.

**June 9 — Fable 5**

Five days after the pause call, Fable 5 launched. It is Anthropic's strongest public model to date: SWE-bench Verified 88.6%, enterprise and science-optimized, priced at $50/million output tokens. Mythos 5 (restricted access) launched alongside it.

Five days after "we call for a pause."

**June 12 — Shutdown**

At 5:21 PM ET on June 12, a US export control directive arrived. Reason: a known jailbreak could bypass Fable 5's safety controls. Shutdown effective immediately, globally—including foreign nationals at US offices. Prorated refunds issued.

Anthropic's response: the jailbreak was "relatively simple" and also worked on GPT-5.5; the government action was a "misunderstanding."

Days since launch: **4**.

## Why This Matters

**Safety messaging and shipping pressure are simultaneously true—and in tension.** Anthropic can genuinely believe AI poses existential risk and genuinely need to ship to stay competitive. The paper and the launch don't have to be cynical moves. But holding both positions at once doesn't resolve the tension—it just makes it more visible.

**Reactive governance can't keep pace.** A shutdown order arriving four days after launch, triggered by a reported jailbreak, is not a monitoring system—it's an alarm that went off after the door was already open. With task horizons doubling every four months, governance needs architectural rethinking, not faster manual review.

**"Conditional pause" needs an implementation spec.** Who determines when the threshold is crossed? What's the actual pause mechanism? Without answers, it's a moral statement, not a policy. The paper describes what should happen in principle; what's missing is how it would actually work.

## Technical Angle

The specific jailbreak that triggered the government shutdown wasn't disclosed publicly, but Anthropic's framing—"relatively simple, also works on GPT-5.5"—reveals something important: the government's risk threshold is not the same as the industry's.

Anthropic considered the jailbreak low-severity by comparison. The government considered it high-severity in absolute terms. As models gain more autonomous capability, "what can this jailbreak actually do" gets a more serious answer over time. A jailbreak that enables minor misuse on a chatbot becomes more dangerous on a model that can autonomously run 12-hour agentic tasks.

## What to Watch

- Under what conditions does Fable 5 come back online?
- Does GPT-5.5 face equivalent scrutiny for the same jailbreak?
- Does the IPO timeline slip given the regulatory friction?
- Will the pause paper get any concrete implementation from governments or standards bodies?

## References

- [Anthropic begged the world to stop AI… then shipped this](https://www.youtube.com/watch?v=1PBRhm5ZnjU)
- [When AI Builds Itself — Jack Clark et al.](https://jack-clark.net)
- [Fable 5 announcement — Anthropic](https://anthropic.com)
