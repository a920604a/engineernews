---
title: "10 Weird OSS Projects You Actually Need"
date: 2026-06-04T12:02:03.080Z
category: tech
tags: ["open-source", "developer-tools", "productivity", "cli", "devtools"]
lang: en
tldr: "From Carbon (code-to-image), nektos/act (run GitHub Actions locally), to Ink (React-based terminal UI) — 10 OSS projects that each solve one specific problem really well."
description: "10 open-source projects that solve specific developer pain points: visual code sharing, local CI execution, runtime type validation, and terminal UI building — none of them are 'yet another X replacement.'"
type: listicle
original_url: "https://www.youtube.com/watch?v=qPuzWFvRajk"
draft: false
---

Your GitHub stars list probably has a bunch of "use this later" repos you've never actually opened. These aren't those. Each one solves a very specific pain point, and most of them are things you'll reach for within three days of installing them.

## TL;DR

10 practical open-source tools you likely don't have yet: code visualization, local CI execution, terminal UI generation, API testing, Git workflow enhancement, and more. Each has a clear use case and isn't trying to be a general-purpose platform.

## 1. Carbon — Turn Code Snippets into Designer-Quality Images

**GitHub**: `carbon-app/carbon`

Posting code screenshots on Twitter or tech blogs with a raw screenshot looks rough. Carbon lets you choose a theme, font, and background color and export a polished PNG/SVG.

Good for: tech blog posts, presentation slides, README example images.
Not for: code that needs to be copy-pasted — images can't be copied.

## 2. Excalidraw — Whiteboard-Style Architecture Diagrams

**GitHub**: `excalidraw/excalidraw`

Lucidchart and Draw.io diagrams look too formal. Sometimes you need a "quick sketch" feel. Excalidraw produces deliberately hand-drawn style diagrams, is fully open-source, self-hostable, and supports real-time collaboration and SVG export.

There's a VS Code extension that opens `.excalidraw` files directly in the editor.

## 3. nektos/act — Run GitHub Actions Locally

**GitHub**: `nektos/act`

Pushing to test CI workflow is one of the biggest time wasters in development. `act` lets you run GitHub Actions workflows locally with Docker, making iteration ten times faster.

```bash
# Install (macOS)
brew install act

# Run all workflows for push events
act push

# Run a specific job
act -j build
```

Limitation: some GitHub-specific actions (like `actions/checkout`) require extra configuration to work correctly locally.

## 4. Hoppscotch — Open-Source Postman Alternative, Self-Hostable

**GitHub**: `hoppscotch/hoppscotch`

Postman's free tier is increasingly restricted, and it stores your API collections in their cloud. Hoppscotch is fully open-source, supports REST, GraphQL, and WebSocket testing, and can be self-hosted so your data stays with you.

## 5. Bun Shell (`$`) — Shell Scripts in JavaScript

**GitHub**: `oven-sh/bun`

`child_process.exec` is ugly, `shelljs` is old, Bun's built-in `$` lets you write shell syntax directly in JavaScript/TypeScript:

```typescript
import { $ } from "bun";

const result = await $`ls -la`.text();
const files = await $`find . -name "*.ts"`.lines();
```

Cross-platform (works on Windows), fully typed, and the modern alternative for build scripts in Node.js projects.

## 6. Ink — Build Terminal UIs with React

**GitHub**: `vadimdemedes/ink`

You don't need to learn ncurses to build interactive CLIs. Ink lets you write terminal interfaces as React components:

```jsx
import React from 'react';
import { render, Text, Box } from 'ink';

const App = () => (
  <Box flexDirection="column">
    <Text color="green">Build complete!</Text>
    <Text dimColor>3 files processed</Text>
  </Box>
);

render(<App />);
```

Gatsby CLI and Parcel's CLI are both built with Ink.

## 7. Slidev — Presentations for Engineers, Written in Markdown

**GitHub**: `slidevjs/slidev`

If you hate PowerPoint but need to give technical talks, Slidev lets you write slides in Markdown with Vue components, syntax-highlighted code blocks, interactive demos, and PDF/web export.

For engineers, putting presentation slides in Git for version control is itself a compelling feature.

## 8. Zod — Runtime Type Validation for TypeScript

**GitHub**: `colinhacks/zod`

TypeScript types disappear at runtime. When you receive data from an API, you can't be certain it matches your expected type. Zod lets you define a schema and validate at runtime:

```typescript
import { z } from "zod";

const User = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

const user = User.parse(apiResponse); // throws with clear error if invalid
```

Works especially well with tRPC — share the same schema between front-end and back-end.

## 9. Playwright — Modern E2E Testing

**GitHub**: `microsoft/playwright`

Selenium's API design dates to 2004. Playwright, released by Microsoft in 2020, is the modern alternative: supports Chromium, Firefox, and WebKit, has auto-waiting (no manual `sleep` calls), and includes codegen to record interactions and generate test code.

```bash
npx playwright codegen https://your-app.com
```

## 10. Mermaid — Diagrams Directly in Markdown

**GitHub**: `mermaid-js/mermaid`

GitHub, Notion, and GitLab all support Mermaid natively. Write text in Markdown, get rendered flowcharts, sequence diagrams, and Gantt charts. No diagramming tool needed:

```
graph LR
    A[User Request] --> B[API Gateway]
    B --> C[Service A]
    B --> D[Service B]
```

Architecture diagrams living in the same repo as code and going through code review — that's what documentation should look like.

## Summary

What these 10 tools have in common: they each solve one specific problem instead of trying to be an "everything platform." That focus is exactly what makes them easy to evaluate, easy to adopt, and actually useful in practice.

## References

- [carbon-app/carbon](https://github.com/carbon-app/carbon)
- [excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)
- [nektos/act](https://github.com/nektos/act)
- [hoppscotch/hoppscotch](https://github.com/hoppscotch/hoppscotch)
- [vadimdemedes/ink](https://github.com/vadimdemedes/ink)
- [slidevjs/slidev](https://github.com/slidevjs/slidev)
- [colinhacks/zod](https://github.com/colinhacks/zod)
- [microsoft/playwright](https://github.com/microsoft/playwright)
- [mermaid-js/mermaid](https://github.com/mermaid-js/mermaid)
