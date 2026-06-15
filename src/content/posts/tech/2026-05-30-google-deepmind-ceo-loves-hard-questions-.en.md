---
title: "Demis Hassabis: Why I Love Hard Questions — The Core of a Research Philosophy"
date: 2026-05-30T04:05:43.130Z
category: tech
tags: ["deepmind", "ai", "research", "demis-hassabis", "philosophy"]
lang: en
tldr: "Hassabis's preference for 'hard questions' isn't a personality quirk — it's a research strategy: choose problems that unlock large amounts of downstream value when solved, not problems easy enough to publish quickly. This strategy is the core reason DeepMind keeps breaking through at the scientific frontier."
description: "Demis Hassabis's research philosophy: why choosing difficult but high-leverage problems matters more than choosing tractable ones, and how this philosophy concretely shapes AlphaFold, AlphaGo, and DeepMind's research direction choices."
type: explainer
original_url: "https://www.youtube.com/shorts/kIvvzCR5NjA"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_200256_451763.mp3"
---

"I love hard questions."

Demis Hassabis has said this in various interviews, but it's not just an expression of personal temperament. It's the declaration of a research strategy.

## TL;DR

Behind Hassabis's preference for "hard questions" is a clear-eyed calculation: the highest-leverage problems are neither the easiest nor the hardest — they're the ones where **solving them unlocks a large amount of subsequent progress**. AlphaFold solved the protein folding problem, then hundreds of drug development projects used it to accelerate their own work. AlphaGo solved the Go problem, then the same technical path was applied to materials discovery, mathematical proof, and algorithm optimization. Picking the right problem is more important than solving the problem.

## What It Is

A "hard question" preference is actually rare in research institutions. Most research institutions' incentive systems point in the opposite direction: publish papers, accumulate citations, demonstrate quantifiable progress. These metrics favor selecting "moderately difficult problems with results in a year" over "foundational problems that might produce nothing for a decade."

Hassabis has been fighting this incentive structure in DeepMind's research choices: AlphaGo took years from conception to publication; AlphaFold work began in 2018 and only achieved its breakthrough at CASP14 in 2020.

## Why It Matters

The "hard question preference" isn't heroism — it's a return-on-investment calculation.

The problem with easy questions: if you can solve them, many others can too, and your contribution's marginal value approaches zero. The return on difficult but high-leverage problems: once solved, they unlock a large number of other things.

Concrete examples:

**The protein folding problem**: Extremely difficult (nobody solved it for 50 years), but the downstream impact of solving it is acceleration of the entire biomedical research enterprise. How many research projects worldwide shortened their timelines by years because of AlphaFold?

**Go AI**: Go was considered a game AI couldn't crack within a decade (before AlphaGo defeated Lee Sedol in 2016). The technology that solved it — deep RL + self-play — was later transferred directly into AlphaFold's training methodology.

**Mathematical proof automation**: AlphaGeometry and AlphaProof demonstrated in 2024 that AI can solve Olympiad-level math problems. If AI can assist mathematical research, its influence spans every science that depends on mathematics.

## How to Identify "Hard Questions Worth Attacking"

Hassabis has mentioned in interviews how he judges whether a problem is worth investing in:

**Evaluate leverage**: After solving this problem, how many other problems become solvable or easier? A high-leverage problem's solution is typically a "methodological breakthrough" — not just an isolated result.

**Confirm there's a quantifiable evaluation function**: DeepMind favors problems with objective evaluation criteria — chess has win/loss, protein folding has structural accuracy scores, math problems have correct/incorrect. Problems without objective evaluation functions are hard to attack with AI.

**Confirm nobody is attacking it with the right methods**: Sometimes a "hard problem" is hard not because of the problem's intrinsic complexity, but because everyone is using the wrong methods. Using the right tools (deep RL, Transformers) to attack a problem that's been stuck due to wrong tools can yield breakthroughs faster than the problem's surface difficulty suggests.

## How It Differs from Typical Problem-Solving Thinking

Normal engineering problem-solving: **decompose, simplify, find the nearest feasible path**. This is the correct methodology in engineering practice.

Research problem selection has a different logic: **find the highest-leverage problem first, then consider feasibility**. If you've chosen the right problem, an "infeasible" problem is often only temporarily infeasible — when the tools catch up, it becomes solvable.

AlphaGo was impossible in 2013-2014 because GPU compute wasn't there. But when compute arrived in 2015-2016, the problem opened up. DeepMind, having chosen the right problem, was more prepared than competitors who'd chosen easier ones.

## Bottom Line

The complete meaning of "I love hard questions" is: I choose to invest my time in problems that, once solved, will generate a large amount of subsequent impact — rather than choosing problems that produce quick results with limited marginal contributions.

For engineers, there's a borrowable version of this philosophy: in your work, find the core bottleneck where solving it would unlock a large number of other things, and prioritize attacking that — rather than continuously accumulating easy wins with limited downstream impact.

## References

- [Google DeepMind CEO Loves Hard Questions 🙂](https://www.youtube.com/shorts/kIvvzCR5NjA)
- [Demis Hassabis — Google DeepMind](https://deepmind.google/about/our-team/demis-hassabis/)
