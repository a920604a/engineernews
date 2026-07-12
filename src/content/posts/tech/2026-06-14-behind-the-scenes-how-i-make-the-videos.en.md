---
title: "How a Tech YouTuber Actually Makes Videos: The Full Workflow"
date: 2026-06-14T19:48:08.223Z
category: tech
tags: ["video-production", "workflow", "tools", "ai", "content-creation"]
lang: en
tldr: "A complete behind-the-scenes look at tech YouTube production: topic selection, scripting, recording, editing, and how AI tools have changed each step."
description: "A tech YouTuber breaks down the complete production workflow for a 10-minute video—research, scripting, recording setup, editing tools, and where AI actually saves time."
type: explainer
original_url: "https://www.youtube.com/watch?v=d6V-nGaNbhw"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260712_004547_145776.mp3"
---

If you've watched tech YouTube and wondered "how does someone produce this every week," behind-the-scenes videos give a rare concrete answer. The workflow has more in common with software engineering than it might seem: topic selection is backlog management, scripts are design docs, editing is code review. The deliverable is video instead of code.

## TL;DR

A 10-minute tech YouTube video takes 11–22 hours across: topic selection → research → scripting → recording → editing → publishing. AI tools have compressed roughly 20–30% of that time, mostly in research synthesis and subtitles. Human judgment hasn't moved out of the loop—it's just applied at different points.

## Topic Selection

The filtering logic for tech channels: "Can I explain this clearly in under 10 minutes to an engineer who cares about it?"

Sources:
- ArXiv preprints and AI lab technical blogs (Anthropic, OpenAI, DeepMind)
- GitHub Trending and Hacker News front page
- Personal engineering problems and frustrations
- Comment sections from previous videos

Priority: evergreen topics over news. A video explaining Kafka's architecture keeps getting views for three years. A video about a specific product launch fades in two weeks, unless the product is historically significant.

## Research

This is the longest phase. A 10-minute video typically needs 4–8 hours of research—read to the depth where you can answer comment questions, not just restate the official documentation.

Current workflow: use Claude or ChatGPT for a "first-pass synthesis"—structure a paper's main claims into a list, identify which points you're uncertain about, then verify those specific points against primary sources.

The AI synthesis can't be trusted wholesale. It sometimes fills gaps with confident-sounding "common knowledge" that isn't in the source. The verification step isn't optional.

## Scripting

A 10-minute video is roughly 1,500–1,800 words of script.

The key difference from writing an article: **spoken syntax and reading syntax are not the same**. Readers can go back. Listeners can't. A good script completes each concept before moving on, rather than assuming the audience remembers what was said two minutes ago.

Standard structure:
1. Hook (first 15 seconds—viewer decides whether to continue)
2. One-sentence topic definition ("Today we're covering X, which is Y")
3. Why you should care (use case)
4. Core breakdown (3–5 concepts)
5. The "so what" conclusion (takeaway)

AI is useful for draft speed here, but the hook and the "so what" still need to be written by hand—those are where personal perspective shows up most.

## Recording

Commonly asked: "What camera do you use?" Common answer: "Lighting and audio matter more than camera."

A Sony ZV-E10 with a good key light and a condenser mic will outperform a Sony A7S III in a dark, echoey room. The camera is rarely the bottleneck.

Typical format:
- **Talking head** (direct to camera): stand at a motorized sit/stand desk—voice quality noticeably better than sitting for an hour
- **Screen recording**: OBS or QuickTime for code walkthroughs and tool demos
- **B-roll**: mostly screen recordings or free stock footage; real location shots are expensive and rarely worth it

Recording one 10-minute video generates 30–50 minutes of raw footage (including retakes). Use a teleprompter app or memorize by section—no need to nail the full script in one take.

## Editing

The tech YouTube standard is **DaVinci Resolve** (free version covers everything most creators need), followed by Final Cut Pro (Mac users), then Adobe Premiere. Premiere's subscription cost pushes many toward DaVinci.

Editing steps:
1. Rough cut: remove mistakes, long pauses, obvious filler
2. Audio processing: noise reduction (DaVinci's built-in Fairlight, or Adobe Podcast for browser-based)
3. Subtitles: Whisper-based tools generate accurate subtitles in minutes; manual correction for a handful of errors
4. Insert B-roll and screen recordings
5. Color grading (apply LUT for consistency)
6. Intro/outro

AI has most changed two things: **subtitles** (from hours to minutes) and **audio noise reduction** (automated). Editorial judgment in the cut itself is still manual.

## Thumbnails

Thumbnails determine click-through rate. Click-through rate determines algorithmic reach. A well-made video with a bad thumbnail gets buried.

Basic rules:
- Large text, high contrast, include a face (human faces attract attention faster than icons)
- Subject text: 5 words or fewer (anything longer isn't legible at mobile scale)
- Must be identifiable at 1/4 size on a phone screen

Tools: Canva or Photoshop, sometimes Midjourney/Stable Diffusion for background generation with manual text overlay.

## Publishing

Title and the first two lines of description determine search discoverability. The title needs to satisfy: contains search keywords, makes people want to click, isn't clickbait.

The first two lines of description (visible before "Show more" collapse) should contain the topic keywords. Chapter timestamps (00:00 Intro, 02:30 Core Concept...) measurably improve average watch duration.

Publish timing: for Taiwan-based channels, Wednesday or Thursday morning tends to work well—covers commute time in the Taiwan time zone and early evening the prior day in US West Coast.

## Time Breakdown

| Phase | 10-Minute Video |
|-------|----------------|
| Topic selection + research | 4–8 hours |
| Scripting | 2–4 hours |
| Recording | 1–2 hours |
| Editing | 3–6 hours |
| Thumbnail + metadata | 1–2 hours |
| **Total** | **11–22 hours** |

AI tools have cut roughly 20–30% of total time, primarily in research synthesis and subtitle generation.

## References

- [Behind the Scenes: How I make the Videos](https://www.youtube.com/watch?v=d6V-nGaNbhw)
- [DaVinci Resolve (free editing software)](https://www.blackmagicdesign.com/products/davinciresolve)
- [Adobe Podcast audio enhancement](https://podcast.adobe.com)
