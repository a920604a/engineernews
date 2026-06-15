---
title: "Why New Smartphone Cameras Feel Worse: The Hidden Cost of AI Computational Photography"
date: 2026-05-23T03:57:22.064Z
category: tech
tags: ["smartphone", "camera", "computational-photography", "ai", "product"]
lang: en
tldr: "Phone cameras increasingly produce an 'AI feeling' — skin looks like plastic, moons are pasted-on textures, details are fabricated. The problem isn't hardware performance; it's manufacturers using AI to paper over physical sensor limitations without telling users what's real."
description: "Why flagship smartphone cameras in 2025-2026 feel increasingly artificial: over-aggressive AI noise reduction, AI-synthesized details, the Samsung moon controversy, and what it means for trust in smartphone photography."
type: explainer
original_url: "https://www.youtube.com/watch?v=coX4duwUCpw"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_195322_861183.mp3"
---

Have you noticed that portraits taken with new flagship phones have an uncanny waxy quality to skin? Or that night mode shots look bright as day, but zoom in and the stars and leaves have a "CGI" unreality to them?

You're not imagining it. This is the collateral damage of computational photography relying too heavily on AI.

## TL;DR

Modern smartphone camera problems aren't hardware — they're over-aggressive AI post-processing. Manufacturers use AI super-resolution to compensate for small sensor limitations, AI noise reduction to mask high-ISO grain, and training data to synthesize details. The side effects: color inaccuracy, erased or fabricated detail, photos that feel fake. Samsung's moon controversy is the most notorious example: AI detected the moon and pasted on a texture from training data instead of what the camera actually captured.

## What's Happening

"Computational photography" refers to using software and algorithms to compensate for optical hardware limits. The field itself is sound — HDR multi-frame compositing, night mode long exposures, OIS combined with EIS are all computational photography, and they work well.

The problem starts when manufacturers use AI to **actively create image details that were never captured by the camera**.

### AI Noise Reduction Causes the Plastic Skin Effect

Phone sensors are small. Low-light environments require high ISO settings to maintain proper exposure. High ISO generates noise. Manufacturers solve this with AI noise reduction applied in post-processing. The problem: noise reduction is fundamentally **blurring** — it smooths each pixel toward its neighbors' average, eliminating noise but also texture and detail. The result is skin without pores, hair that becomes a blurry mass, iris detail that disappears.

Google Pixel has faced consistent criticism here: the algorithm-heavy approach produces a characteristic "Google Look" — unusually saturated colors and strange noise reduction artifacts in shadow areas.

### AI Super-Resolution Fills In Non-Existent Details

Some camera apps apply AI super-resolution when saving photos, upscaling a 12MP raw sensor capture to 50MP or higher. In this process, AI uses training data to "guess" and add detail that doesn't exist.

Mathematically, this cannot restore real information — AI-supplied detail is statistically "most likely to exist" detail, not information actually produced by photons on the sensor.

### The Samsung Moon Controversy

The Samsung moon incident, which gained wide attention starting in 2023, became the defining case study. A user photographed a blurry image of the moon and received a sharp, detailed result with clear crater texture. Investigation revealed Samsung's scene optimization recognized the moon and replaced the camera's blurry capture with a lunar texture from AI training data.

The photo was "retouched" by AI without informing the user — and retouched with information that wasn't present at the scene.

## Why It Matters

Smartphone photography's trust foundation rests on the premise: "this is a faithful record of what happened." When AI begins creating details never captured, that premise is challenged.

Practical implications:
- You believe you captured a particular expression or moment, but that detail was AI-synthesized
- News photography credibility questions (if consumer phones routinely AI-process images, where's the standard?)
- Travel photos you see on social media are more saturated than what the photographer's eyes saw

## The Root Cause Is Hardware

The fundamental cause is physical constraint: the ultra-thin smartphone form factor means sensors will always be smaller than full-frame cameras. Smaller sensor = fewer photons captured in low light = lower signal-to-noise ratio.

Given this constraint, manufacturers face a fork:
1. **Accept hardware limits**, present real but noisy images
2. **Use AI to mask limits**, present more "appealing" but inaccurate images

Most chose option 2 because it photographs better in launch event demos.

As Android Authority noted: "Rather than plastering over the cracks with AI, in all the cases where we've been let down, these phones would have performed much better simply by having better hardware."

## How It Differs From Traditional Cameras

Traditional cameras (including mirrorless) take a more conservative computational photography approach: multi-frame compositing, OIS, RAW format support. Manufacturers provide RAW output so users control post-processing extent.

The smartphone problem is that this choice is typically taken away — the default is AI-processed JPEG. Some manufacturers (Apple, Pixel) offer ProRAW or RAW+ formats for advanced users to get minimally-processed images, but this isn't mainstream usage.

## Bottom Line

The smartphone camera AI post-processing problem is fundamentally a **transparency problem**: manufacturers don't clearly disclose which details are genuinely captured versus AI-synthesized. When someone says "I took this photo with my phone," do they mean "light hit a sensor and produced this image," or "AI generated the most appealing version of this scene"?

These two things are increasingly hard to distinguish. And manufacturers have no commercial incentive to make them clearer.

## References

- [The Smartphone AI Photography Controversy - Glyn Dewis](https://glyndewis.com/blog/mobile-photography-controversy)
- [If there's one smartphone camera feature we leave in 2025, it should be this - Android Authority](https://www.androidauthority.com/smartphone-camera-feature-leave-in-2025-ai-zoom-3628559/)
- [If there's one thing I want from my next phone it's less AI in my camera - Android Authority](https://www.androidauthority.com/less-ai-photos-phones-2026-3631398/)
