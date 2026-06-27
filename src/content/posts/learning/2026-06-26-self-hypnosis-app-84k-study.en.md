---
title: "84,395 Users, Effect Size 0.7: Why a Pretty Number Doesn't Mean a Self-Hypnosis App 'Works'"
date: 2026-06-26
category: learning
tags: ["research", "digital-health", "data-analysis", "study-design", "statistics"]
lang: en
tldr: "An npj Digital Medicine study analyzed 84,395 users and 282,893 sessions on the self-hypnosis app Reveri. Self-rated stress dropped with a Cohen's d of −0.71 to −0.78 (a 'large' effect). But it's a retrospective observational study with no control group and a single-item Likert measure — a great case study in why 'big N + big effect' still can't prove causation."
description: "A breakdown of the npj Digital Medicine self-hypnosis app study: 84k users and an effect size of 0.7 look strong, but no control group, self-report, regression to the mean, and selection bias keep it at 'correlation,' not 'causation.' A good data-literacy exercise."
type: research
original_url: "https://www.nature.com/articles/s41746-025-02182-0"
draft: false
key_points:
  - "A huge sample and large effect size prove nothing without a control group — that's correlation, not causation"
  - "Single-item self-ratings buy engagement and sample size, but trade away measurement rigor and objectivity"
  - "Pre/post designs invite regression to the mean and expectation bias, inflating effects that never happened"
audio_url: "/api/tts/r2/tts/tts_20260627_091409_618414.mp3"
---

If you saw a headline — "84,000 users, an app significantly reduces stress, effect size 0.7" — what should your first reaction be?

Not "great, downloading it," and not "must be an ad." It's: **look at the study design first.** A December 2025 npj Digital Medicine paper on a self-hypnosis app is a perfect exercise for exactly this — the numbers are pretty, but underneath them sits a row of question marks that deserve to be raised.

## TL;DR

- Subject: the self-hypnosis app **Reveri** (Stanford's David Spiegel is co-founder / scientific advisor) — **84,395 users, 282,893** stress sessions, Nov 2021–Jan 2025
- Result: a **single-item 10-point Likert** self-rating before/after each session; across the first 10 sessions, Cohen's d = **−0.71 to −0.78** (statistically a "large" effect), mean drop 1.45–1.62 points
- But it's a **retrospective observational study, no control group, self-reported single-item measure** — which keeps it at "correlation," and it **can't prove hypnosis caused the change**
- For engineers / anyone reading data: a classic case of "big N ≠ rigorous" and "big effect size ≠ causation"

## What the study actually did

It's not a randomized controlled trial (RCT) — it's a **retrospective observational study**: take the real usage data the app accumulated and analyze it. Users self-rated stress **before and after** each session (1 = lowest, 10 = highest); the study looked at "after − before."

The authors openly state why they used a single-item Likert instead of a multi-item validated questionnaire: **to maximize engagement and data collection.** An honest but crucial tradeoff — you trade a coarse measurement for an 84k sample.

## The numbers themselves

Across the first 10 sessions, Cohen's d sits at **−0.71 to −0.78.** By convention d≈0.2 is small, 0.5 medium, 0.8 large — so this is close to "large." Mean stress dropped 1.45–1.62 points (out of 10).

Some interesting moderators:

- **Higher hypnotizability → bigger drop** — but the correlation is actually weak (ρ ≈ −0.11 to −0.15)
- **Interactive / standard-length sessions were 1.8× as effective** as the brief version (−2.02 vs −1.13)
- Younger users dropped more on session 1; older users got more cumulative benefit
- Paying members dropped more in sessions 1–10
- **Repeating sessions did NOT compound the effect** over time

Safety looked good: of 84,395 users, only **10** reported worsening symptoms or other problems, all minor.

## Why a pretty number still isn't a conclusion

This is the point. Each item below is a reason d=0.7 loses its persuasive power:

**1. No control group.** The most fatal. You only know "users self-rate lower stress after a session" — you **don't know whether they'd have dropped just as much doing nothing, or sitting with eyes closed for 5 minutes.** The authors themselves admit this limits causal inference.

**2. Regression to the mean.** People usually open a stress app **when stress is high.** An unusually high state tends to drift back toward average on the next measurement — even with no intervention. A pre/post design bakes this natural rebound into the "effect."

**3. Self-report + single item + expectation.** The user knows they're using a stress tool, knows the question is about stress, and just spent time on something that "should" help. How much of the drop is real physiological relaxation vs "I expected it to work, so I gave a lower number"? A one-item Likert can't tell them apart.

**4. Selection bias.** The sample is "people who downloaded a paid self-hypnosis app and bothered to fill in pre/post ratings" — heavily self-selected, not representative. Paying members doing better is likely just "more invested people feel more effect."

**5. A big sample doesn't fix any of the above.** Many see N=84,395 and think "surely that many people is trustworthy." But **a large sample only makes your estimate more precise; it doesn't make a biased design unbiased.** Regression to the mean at 84k is still regression to the mean — you just measure a contaminated number with great confidence. The authors say the large sample "helps mitigate" confounding; that's true for random error, not for systematic bias.

## So is the study worthless?

No. Put it back where it belongs and it's valuable:

- It shows **real-world usage data can be systematically collected and analyzed** (the data backbone of digital therapeutics)
- It gives a **signal and an effect-size range worth confirming** with a follow-up RCT
- The safety data (10/84,395) is genuinely informative at that scale
- The moderators (interactivity, hypnotizability) have real product-design implications

It just **cannot** be read as "the hypnosis app is proven to reduce stress." It can be read as "among self-selected users, self-rated stress drops after a session — worth a controlled trial."

## What to take away (the data-literacy version)

Next time you see a "huge N, beautiful effect size" health/behavior study, ask in order:

1. **Is there a control group?** No → probably only correlation.
2. **Is it pre/post?** Yes → watch for regression to the mean and expectation effects.
3. **How was it measured?** Self-reported single item → subjective, expectation-prone.
4. **Where did the sample come from?** Self-selected → don't extrapolate.
5. **Is the big sample solving random error, or being used to paper over a design flaw?**

The same instinct applies in engineering: **an A/B test without a control isn't an A/B test.** A pretty metric with no control and no randomized split usually shows you regression to the mean and selection effects — not the merit of your change. Reading papers and reading dashboards require the same caution.

## References

- [Effects of app delivered self hypnosis on stress management — npj Digital Medicine (2025)](https://www.nature.com/articles/s41746-025-02182-0)
- [Full text — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12775527/)
- [Cohen's d effect size](https://en.wikipedia.org/wiki/Effect_size#Cohen's_d)
- [Regression toward the mean — why pre/post overstates effects](https://en.wikipedia.org/wiki/Regression_toward_the_mean)
