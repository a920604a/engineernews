---
title: "Is This Thing On? Verifying Your Technical Communication from the Audience's Perspective"
date: 2026-06-06T19:42:16.514Z
category: tech
tags: ["technical-communication", "presentation", "documentation", "engineering-culture"]
lang: en
tldr: "The most common engineering communication failure isn't poor technical knowledge — it's assuming the audience knows as much as you do. 'Is This Thing On?' is a concrete practice: after any technical explanation, stop and confirm the signal actually got through."
description: "Starting from a stage audio metaphor, examining the core problem in engineer technical communication: how to confirm your explanation was actually understood, not just assumed to be clear."
type: explainer
original_url: "https://www.youtube.com/watch?v=2Hke7Utt_qQ"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_201419_416774.mp3"
---

"Is This Thing On?" is what a performer says when stepping onto a stage, tapping the microphone. It's not filler — it's verification: did the signal reach the audience?

Engineers almost never ask this question when doing technical communication.

## TL;DR

The biggest problem in technical communication isn't insufficient detail — it's not confirming whether the signal was successfully received. "Is This Thing On?" as a mental model reminds you to do one thing after any technical explanation: pause, confirm the other person actually understood, rather than nodding to let you continue.

## Why Engineer Communication Often Fails

When an engineer explains a technical problem, they have the complete context in their head: why this design, what pitfalls they hit, what the background assumptions are. The other person usually doesn't.

This knowledge asymmetry causes several typical failures:

**Explaining too fast**: You finish one concept and immediately move to the next, but the other person is still processing the first.

**Using jargon without explanation**: "Eventual consistency" and "idempotent" are everyday language for you but may not be for your audience.

**Not verifying understanding**: Asking "Any questions?" after a long explanation is basically useless — most people don't know what they don't understand, or don't want to admit it in a group setting.

**Assuming diagrams are self-explanatory**: Your architecture diagram is clear in your mind, but to someone seeing it for the first time, it might just be boxes and arrows.

## Practical Applications

### Writing Technical Documentation

Good technical documentation assumes the reader is "smart but without this background." Every time you're about to write "as you know..." or "obviously...", stop and ask: for which readers is this "as you know"? Which readers might not know at all?

A concrete approach: after writing a section of documentation, have a related engineer who doesn't work deeply in this subsystem read it. Ask them: "Where did you have to stop and reread, or look something up?" Those places are where you need to add clarification.

### Code Review Feedback

"This is wrong" is the least valuable code review feedback. It conveys your judgment but not your reasoning. A more effective approach:

```
# Unhelpful feedback
This query will have performance issues

# Helpful feedback
This query will do a full table scan when the users table exceeds 1M rows
(no WHERE condition uses the index on the email column)
Consider adding a covering index: CREATE INDEX ON users(email, id)
```

The second version lets the reviewer genuinely understand the problem and make the right call independently in similar situations next time.

### Tech Talks and Presentations

In technical presentations, do an "Is This Thing On?" check every 5–10 minutes:

- Pause and ask a specific question (not "Any questions?"): "About the CAP theorem I just explained — any questions about the 'partition tolerance' part specifically?"
- Verify with an analogy: "The event sourcing concept I described — does the analogy of a bank ledger recording every transaction rather than just the current balance help?"
- Ask for active comprehension: "If you were implementing this, which part would you start with?"

### Async Communication: Slack and PRs

Async communication's challenge is no immediate feedback. After sending a Slack message or PR description, you don't know if the other person genuinely understood or just added an emoji and moved on.

Some approaches:
- PR descriptions should explain "why this change" not just "what changed"
- For important design decisions, after writing actively ask: "Did I describe the trade-offs clearly? Is there a scenario you think I didn't consider?"
- When explaining complex issues, end with: "If this isn't clear, happy to do a 15-minute call to sync."

## Difference from General Communication Advice

Most "technical communication" advice teaches you how to "explain better": use simpler language, use analogies, draw diagrams. All useful, but all one-directional — from you to the audience.

"Is This Thing On?" emphasizes **bidirectional confirmation**: not just whether you explained clearly, but confirming the other person actually received the signal. This is actively designing an acknowledgment mechanism into your communication, rather than assuming the signal will naturally get through.

In engineering systems, we design acknowledgments, retries, and dead letter queues to ensure messages are actually processed. In human communication, we often don't have this mechanism at all.

## Summary

"Is This Thing On?" isn't a complex methodology, but it requires building an active habit: after every technical explanation, spend 30 seconds confirming the signal was successfully received, rather than assuming that speaking equals communicating.

For engineers, the marginal return on communication skills often exceeds an additional technical skill. An architect who can get five engineers to genuinely understand a design decision is more valuable than one who only they themselves understand.

## References

- [The Feynman Technique for Learning](https://fs.blog/feynman-technique/)
- [Why write ADRs](https://increment.com/documentation/why-write-adrs/)
- [Google's technical writing guide](https://developers.google.com/tech-writing)
