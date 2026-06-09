---
title: "The Forgotten Developer Who Saved JavaScript: Douglas Crockford and the Story of JSON"
date: 2026-05-31T08:57:39.266Z
category: tech
tags: ["javascript", "json", "web", "history", "open-source"]
lang: en
tldr: "Douglas Crockford didn't create JavaScript, but he may be the single most important reason it went from a mocked scripting language to the foundation of the modern web: he formalized JSON, created JSLint, and wrote JavaScript: The Good Parts — a book that showed developers JavaScript actually had a good side."
description: "How Douglas Crockford changed JavaScript's fate through JSON, JSLint, and JavaScript: The Good Parts — from a toy language mocked by professional developers to the core technology of modern web development."
type: explainer
original_url: "https://www.youtube.com/watch?v=JfPWbttemYE"
draft: false
---

Everyone knows Brendan Eich created JavaScript in 10 days in 1995. But there's a less-told story: in the decade after JavaScript was born, serious developers largely considered it a toy.

What changed that wasn't an upgrade to the language itself. It was the work of one person.

## TL;DR

Douglas Crockford was an architect at Yahoo! who did three things that brought JavaScript back from the dead: (1) "discovered" and formalized the JSON format in 2001, freeing web APIs from the XML nightmare; (2) created JSLint, the first tool to bring code quality standards to JavaScript; (3) published *JavaScript: The Good Parts* in 2008, demonstrating that beneath all the bad parts, JavaScript actually had an elegant core.

## What It Is

Douglas Crockford is an engineer who started writing software in the 1980s and served as JavaScript Architect at Yahoo! in the 2000s. He didn't create JavaScript, but he's the person who made JavaScript taken seriously.

In the early 2000s, JavaScript had a terrible reputation. It was riddled with design flaws: the chaos of `==` versus `===`, the unpredictable behavior of `this`, global namespace pollution, no module system. Many backend developers treated it as a "beginner language" to be avoided whenever possible.

## Why It Matters

### The Birth of JSON

In 2001, Crockford needed a way for browsers and servers to pass data to each other. The standard approach at the time was XML + SOAP, but the implementation cost and parsing complexity of that combination struck him as absurd.

He noticed that JavaScript's object literal syntax (`{key: value}`) was itself a perfect data format — readable, lightweight, and natively parseable by every JavaScript environment. He registered `json.org`, wrote the complete specification for the format, and promoted it.

In 2006, JSON became the official IETF RFC 4627 standard.

Today, JSON is the default data format for virtually all web APIs. You use it every day — whether in RESTful APIs, configuration files, or frontend-backend communication. Crockford didn't invent JSON's syntax (it was just JavaScript object literals), but he formalized it and got the industry to adopt it.

### JSLint: Giving JavaScript Quality Standards

In 2002, Crockford released JSLint — a static analysis tool that scans JavaScript code and flags potential errors and bad practices.

His description became famous: "JSLint will hurt your feelings." Because it's extremely strict — nearly any code written casually gets flagged with a pile of problems.

But that was precisely the value: before JSLint, JavaScript had no static analysis tools, no code style standards, and the entire ecosystem operated on "if it runs, it's fine." JSLint was the first tool to assert that JavaScript could have quality standards. Today's ESLint is its spiritual successor.

### *JavaScript: The Good Parts*: A Book That Changed Perception

In 2008, Crockford published a 176-page book titled *JavaScript: The Good Parts*.

The book's central argument, in Crockford's own words, was "one of the most important discoveries of the 21st century" — that JavaScript actually contained a well-designed language, but it was surrounded by large amounts of bad design decisions. If you chose to use only "the good parts" (prototypal inheritance, closures, functional features), JavaScript was an elegant language.

This was genuinely heterodox at the time. The prevailing view was "JavaScript is just a bad language all the way through." Crockford said no — the problem is you're using it wrong.

The book changed how an entire generation of developers saw JavaScript, and was the cultural starting point for JavaScript being taken seriously.

## How It Differs from Brendan Eich's Contribution

Brendan Eich created JavaScript — that's unquestionable. But his contribution was largely buried under waves of negative criticism in the language's first decade.

Crockford's contribution came during that low point: using tools and arguments to redefine what "good JavaScript" meant, laying the cultural groundwork for the later explosion of Node.js, the V8 engine, and the npm ecosystem.

Without Crockford's JSON specification, web APIs might still be using XML today. Without JSLint and *The Good Parts*, JavaScript might have waited much longer to be taken seriously by backend developers.

## Bottom Line

Douglas Crockford isn't in JavaScript's origin story, but he's in JavaScript's redemption story.

There's another layer to this story: sometimes a language or technology's success doesn't depend on its original design. It depends on whether someone takes the time to organize its usage patterns, establish its best practices, and say "this deserves to be taken seriously."

## References

- [Douglas Crockford - Wikipedia](https://en.wikipedia.org/wiki/Douglas_Crockford)
- [Big Thinkers: Douglas Crockford – The Man Behind JSON and JSLint](https://build5nines.com/big-thinkers-douglas-crockford-the-man-behind-json-and-jslint/)
- [When Was JSON Invented? Complete History & Timeline](https://www.merge-json-files.com/blog/when-json-was-invented-and-who-invented-it)
- [The forgotten developer who saved JavaScript...](https://www.youtube.com/watch?v=JfPWbttemYE)
