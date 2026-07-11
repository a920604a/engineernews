---
title: "WWDC 2026: Siri Rebuilt, Intel Macs Out, Liquid Glass Fixed"
date: 2026-06-12T03:50:52.651Z
category: tech
tags: ["wwdc", "apple", "ios", "macos", "siri", "apple-intelligence"]
lang: en
tldr: "WWDC 2026's biggest moves: Siri rebuilt from scratch using Google Gemini, macOS Golden Gate ends Intel Mac support, and iOS 27 adds an opacity slider to fix Liquid Glass readability."
description: "WWDC 2026 overview for developers: Siri AI rewrite with Gemini, iOS 27 Liquid Glass fixes, macOS Golden Gate going Apple Silicon-only, and Apple Intelligence updates."
type: explainer
original_url: "https://www.youtube.com/watch?v=_gCXmKjDecU"
draft: false
---

WWDC 2026 ran June 8–12. The overall tone: measured expectations, mostly met. Siri got a real rebuild, Liquid Glass got its readability fix, and Intel Macs got their official farewell. No major surprises—but every announced change is real and shipping.

## TL;DR

- **Siri** rebuilt as a standalone app with system-wide personal context, powered by Google Gemini via Private Cloud Compute—but waitlisted and not available in EU at launch
- **iOS 27**: Liquid Glass opacity slider, custom AirPods EQ, enhanced parental controls
- **macOS 27 Golden Gate**: last version supporting Intel Macs; Apple Silicon only going forward
- **Apple Intelligence**: Image Playground adds photorealistic generation, Photos gets Extend/Reframe tools
- Developer beta now; public beta July; general availability September with iPhone 18 Pro

## The Siri Rebuild

This is the headline. The new Siri is a standalone app with access to your emails, messages, photos, calendar, and files—a genuine personal context engine, not a voice-activated search shortcut.

Key technical detail: the backend is **Google Gemini**, running through Apple's Private Cloud Compute architecture. Apple's claim: your personal data isn't used to train Gemini; inference runs in an isolated environment.

What's missing at launch:
- **Waitlisted**—not available to all users immediately
- **Not available in the EU** on iOS 27/iPadOS 27 at release (Digital Markets Act complications)
- **No third-party developer API**—apps can't deeply integrate with Siri AI yet

That last point is the important one for developers. Apple spent enormous resources rebuilding Siri, but the integration surface for third-party apps hasn't opened up. That's probably WWDC 2027's story.

## macOS 27 Golden Gate

The Intel Mac era officially ends here. macOS Golden Gate is the last version that supports Intel hardware.

Compatible: Apple Silicon Macs from 2020+ (M1 and later).

If you're still on an Intel MacBook Pro, you're not forced to upgrade today—but you're on the last safety net.

Feature highlights: Visual Intelligence in Spotlight (query using on-screen content), unified toolbar, edge-to-edge sidebars, AirDrop speed improvements, faster network file browsing, improved Messages sync, Liquid Glass opacity slider.

## iOS 27

The readability complaints about iOS 26's Liquid Glass design (translucent, fluid UI) were loud enough that iOS 27 ships with an **opacity slider**—users can tune transparency from fully opaque to the original Liquid Glass look. Pragmatic fix.

Other updates:
- Custom AirPods EQ per device
- Granular parental controls (per-app, per-website)
- Compatible: iPhone 11 and later

## Apple Intelligence Updates

**Image Playground** now generates **photorealistic images**, not just the stylized illustration/animation modes from before.

**Photos app** new tools:
- **Extend**: stretch image edges outward (similar to Adobe Generative Fill)
- **Reframe**: adjust composition, crop, fill empty space
- **Clean Up**: improved object removal detection

**Home app**: natural language search of security camera footage ("the person on the driveway yesterday between 10 and 11am"); 4K iCloud video storage.

## Developer Takeaways

The "Yeah, That's About Right" framing says it all: solid, unsurprising, and Apple playing catch-up in AI with waitlist-gated features.

What's notably absent:
- Open Siri integration API for third-party apps
- Cross-device unified development framework
- Vision Pro updates
- EU-compatible Siri AI at launch

macOS going Apple Silicon-only is the most operationally significant change for developer tooling—if you're still running CI or build servers on Intel Mac hardware, the clock is ticking.

## References

- [WWDC 2026 Impressions: Yeah, That's About Right](https://www.youtube.com/watch?v=_gCXmKjDecU)
- [Apple WWDC 2026 — developer.apple.com](https://developer.apple.com/wwdc26/)
- [iOS 27 preview — Apple](https://www.apple.com/ios/ios-27-preview/)
- [macOS Golden Gate preview — Apple](https://www.apple.com/macos/macos-26-preview/)
