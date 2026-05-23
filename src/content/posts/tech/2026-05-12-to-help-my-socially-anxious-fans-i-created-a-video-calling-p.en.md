---
title: "To Help My Socially Anxious Fans, I Built an AI Video Calling Product"
date: 2026-05-12T11:24:47.018Z
category: tech
tags: ["indie-developer", "ai", "video-calling", "social-anxiety", "webrtc", "product-development"]
lang: en
tldr: "A YouTuber/indie developer noticed fans couldn't speak up due to social anxiety, so he built an AI-powered video call practice platform. This article breaks down the technical architecture and trade-offs of building this kind of product from scratch."
description: "Indie developer case study: using AI video calling to help users with social anxiety, covering WebRTC, real-time AI voice, Tavus, and the engineering decisions from idea to MVP."
type: case-study
original_url: "https://www.youtube.com/watch?v=M1bifAQSVcY"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260522_235049_221747.wav"
---

Some products come from market research. Some come from personal pain points. This one came from a fan message. A tech YouTuber with a significant following received a comment: "I'd love to ask you questions on YouTube, but I have social anxiety — even typing feels stressful, let alone a real call." He decided to do something about it — not write an advice post, but actually build a product.

This article traces the technical architecture of an "AI-assisted video calling" product, and the engineering decisions an indie developer makes with limited resources.

## TL;DR

- **Target user**: People with social anxiety who want to practice real conversation but are afraid of real human interaction
- **Core feature**: AI plays a conversation partner, providing real-time voice responses in a video call interface simulating a real conversation
- **Tech stack**: WebRTC video streaming + real-time ASR (speech recognition) + LLM + TTS (speech synthesis) + AI avatar (Tavus or HeyGen-type service)
- **Biggest challenge**: End-to-end latency must stay under 800ms for conversation to feel natural

## Background and Challenge

Social Anxiety Disorder affects approximately 7% of adults globally, with excessive fear of judgment as its core symptom. This makes many people feel extreme stress during in-person communication or video calls.

Traditional solutions involve cognitive behavioral therapy (CBT), with exposure therapy as a core method — gradually exposing patients to anxiety-inducing social situations. The theory is sound, but there are real-world problems:
- Therapist appointments are expensive with long waitlists
- Practice opportunities are limited (you can't find a real person to practice with every day)
- Failure cost is high (failing with a real person may reinforce anxiety)

The AI video calling hypothesis: provide a "low-risk practice space" — the conversation partner is AI, so you can restart if you mess up, with no one judging you.

## Solution Design

### Core UX Assumptions

A successful AI social anxiety practice tool needs to satisfy:
1. **Visual realism**: It should look like a real person talking, not a text box or disembodied voice
2. **Low enough latency**: Response delay over 1 second breaks the rhythm of conversation
3. **Natural conversation**: AI must understand context and not forget what was said earlier
4. **Sense of safety**: Clearly tell users this is AI — don't make them feel deceived

### Technology Stack Choices

#### Video Streaming: WebRTC

Browser-native WebRTC support, no app install required. P2P connection latency is low — under 50ms in the same region under optimal conditions.

For an indie developer, self-hosting a WebRTC signaling server + TURN server costs significant effort. More practical choices are managed services:
- **Daily.co**: $0.004/participant-minute, has SDK, fastest to ship
- **Livekit**: Open source, self-hostable, higher free tier
- **Agora**: Enterprise-grade, stable but more complex pricing

#### AI Avatar: Giving AI a Face

Options for making AI visually present break into tiers:

**Option A (simplest)**: Static avatar + audio. AI is a still image that doesn't move its mouth, only has sound. Easiest to implement, but poor user experience.

**Option B (medium)**: 2D avatar + lip sync. Use Ready Player Me or TalkingHead.js to map audio waveforms to mouth animations. Low cost, but looks like a virtual YouTuber rather than a real person.

**Option C (most realistic)**: AI-generated real-time video stream. Tavus and HeyGen provide this type of API — upload a real person video as a base, and the API generates a speaking video stream in real time with speech matching your text or voice input. Latency runs 300–800ms, and results are closest to a real person. Tavus's Conversational Video Interface (CVI) is purpose-built for this scenario.

For indie developers: validate with Option A/B first, upgrade to Option C once you have enough users.

#### Real-Time Speech Recognition (ASR)

User speaks → converts to text → sends to LLM. Speed and accuracy are both critical.

- **Whisper (OpenAI)**: High accuracy, but real-time streaming latency is 500ms+
- **Deepgram**: Optimized for real-time streaming, latency under 200ms, API pricing at $0.0059/minute
- **AssemblyAI**: Middle option with speaker diarization capability

Indie developer first choice: Deepgram or AssemblyAI's real-time API.

#### LLM Response Generation

Once ASR has the text, send it to an LLM for response generation. Latency-sensitive, so you want fast models:
- **GPT-4.1 (OpenAI)**: Fast time to first token, good for streaming output
- **Claude Haiku 3.5**: Low latency, low cost, smart enough for conversation handling
- **Gemini Flash**: Google's low-latency option

The LLM layer also needs carefully engineered system prompts to simulate specific conversation scenarios (job interview practice, asking for directions, calling someone on the phone) and control response pacing and tone.

#### Text-to-Speech (TTS)

LLM outputs text → convert to speech → play for user.

- **ElevenLabs**: Best audio quality, supports real-time streaming, many voice clone options
- **OpenAI TTS**: $15/million characters, decent quality, simple API
- **Play.ai**: Designed for conversation, supports emotional tone adjustment

## Implementation Details

### End-to-End Latency Budget

```
User finishes speaking (VAD detects silence)
    → ASR recognition: ~200ms (Deepgram)
    → LLM first token: ~300ms (Claude Haiku)
    → TTS first audio chunk: ~200ms (ElevenLabs streaming)
    ─────────────────────────────────────────
    Total: ~700ms
```

700ms is near the acceptable edge. When any link encounters latency (network fluctuation, LLM load), it exceeds the ~1 second "natural feel" threshold. This is the hardest engineering problem in this type of product.

### VAD (Voice Activity Detection)

Must accurately detect "user finished talking" before sending to ASR. Triggering too early (user is still talking) causes the AI to interrupt; triggering too late increases latency. WebRTC has built-in VAD; you can also use Silero VAD (open source, high accuracy).

### Conversation Memory Management

Multi-turn conversation requires remembering context, but LLM APIs are stateless — you need to manage conversation history yourself. Strategy:
- Keep the last N turns in full
- Summarize earlier turns (compress token usage)
- Store important facts in a vector database (Pinecone, Supabase pgvector)

## Market Context

AI companion apps globally crossed 220 million downloads in 2025, with the number of AI companion apps growing 700% in two years. Born (the company behind virtual pet Pengu) raised a $15 million Series A in 2025 specifically for social AI companions.

For indie developers, there's sufficient user demand in this market, but competition is also increasing rapidly. Differentiation comes from going deep on specific scenarios (focus only on interview practice, or only on phone call anxiety) rather than trying to build a general-purpose AI chat product.

## Lessons Learned

1. **Latency is the first engineering problem**: Conversation feel is subjective, but response latency over 800ms is perceptible to nearly all users
2. **Visual realism > feature richness**: Users care about "does this feel like a real conversation," not how long the feature list is
3. **Validate with the cheap version first**: An ElevenLabs + Deepgram + Claude MVP is low-cost and quickly validates whether users actually use it
4. **System prompt is the core product differentiator**: Prompt engineering that makes AI behave naturally in conversation matters more than any infrastructure optimization

## References

- [Tavus: Conversational Video Interface](https://www.tavus.io/)
- [Deepgram Real-Time ASR API](https://deepgram.com/)
- [Livekit: Open-source WebRTC Framework](https://livekit.io/)
- [ElevenLabs TTS API](https://elevenlabs.io/)
- [TechCrunch: Born AI social companion funding](https://techcrunch.com/2025/09/10/born-maker-of-virtual-pet-pengu-raises-15m-to-launch-a-new-wave-of-social-ai-companions/)
- [Original video](https://www.youtube.com/watch?v=M1bifAQSVcY)
