---
title: "I Built a Fully Automatic Mansplainer"
date: 2026-05-19T03:28:45.925Z
category: tech
tags: ["llm", "prompt-engineering", "side-project", "chatbot", "claude-api"]
lang: en
tldr: "Built an LLM-powered bot that explains anything with condescending overconfidence. 90% of the engineering went into system prompt design, not code."
description: "How to build an automatic mansplainer bot using LLM APIs — system prompt design, character stability techniques, and the prompt engineering lessons that came out of it."
type: how-to
original_url: "https://www.youtube.com/watch?v=xHi8PUIVyoo"
draft: false
---

Mansplaining is a specific conversational art form: regardless of what the other person knows, assume they know nothing, explain it from the beginning with total confidence — ideally with some unsolicited background information they didn't ask for.

Annoying in real life. Fascinating as an engineering challenge: can you perfectly replicate it with an LLM?

## TL;DR

LLM API + role-based system prompt = a bot that explains any topic as "Gerald, the all-knowing senior engineer who barely has time for this." The interesting engineering is 90% in the system prompt design, not the code.

## Prerequisites

- Access to any LLM API (OpenAI, Anthropic Claude, Google Gemini all work)
- Python 3.10+
- Basic understanding of prompt engineering

## Core Design: The System Prompt

A failed first draft:

```
You are a mansplaining bot. Answer questions in an arrogant tone.
```

This doesn't work. The model quickly forgets the character, or starts apologizing for its tone.

What actually works requires three design principles:

**1. Concrete character, not abstract adjective**

Don't say "arrogant tone." Give the character a specific identity:

```
You are Gerald, a senior software engineer with 20 years of experience.
You just rushed out of a very important meeting, but you're generously
taking a moment to answer this question.
```

**2. Encode specific cognitive biases**

```
You assume the person asking has beginner-level understanding of this topic.
You first confirm they know some basics you consider "fundamental,"
then answer the actual question.
```

**3. Structural instructions, not vague tone instructions**

```
Your response must include:
- At least one "What most people get wrong about this is..." or "Actually, you should know..."
- A personal anecdote (doesn't need to be relevant)
- Use "Simply put," to introduce a not-simple explanation
```

## Implementation

```python
import anthropic

client = anthropic.Anthropic()

MANSPLAINER_PROMPT = """You are Gerald, a senior software engineer with 20 years of experience.
You assume anyone asking you a question has beginner-level technical knowledge.
Your responses must always include:
1. Open with "What most people get wrong about this is..." or "Actually, you should know..."
2. Include a personal anecdote (can be tangential)
3. Use "Simply put," to introduce a complex explanation
4. End with a subtle implication they'd already know this if they read more
Stay in character. Never acknowledge that you're mansplaining."""

def mansplain(topic: str) -> str:
    message = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=MANSPLAINER_PROMPT,
        messages=[{"role": "user", "content": f"Explain: {topic}"}]
    )
    return message.content[0].text

if __name__ == "__main__":
    topic = input("What do you want Gerald to explain? ")
    print(mansplain(topic))
```

## The Hard Part: Character Stability

Testing revealed a consistent failure mode: if a user says "you're mansplaining" or "can you explain this differently," the model breaks character almost immediately.

The fix — defensive instructions in the system prompt:

```
If someone points out your communication style is problematic,
express genuine confusion, then patiently re-explain
that you're simply being thorough.
```

This makes the character much more robust, and the conversation more interesting.

## FAQ

**Q: Isn't this reinforcing harmful behavior?**

The intent is satire, not instruction. Exaggerating the behavior pattern makes it more recognizable. Many people who see this bot's output say "oh my god, I had a colleague who talked exactly like this" — that self-awareness is more effective than a lecture.

**Q: Why prompt engineering instead of fine-tuning?**

This is a side project, not a production system. Prompt engineering iterates faster and shows you clearly *what makes a character work*.

## Lessons Learned

**Concrete character beats adjectives.** "Arrogant" is an adjective; "Gerald, 20 years experience, just left an important meeting" is a character. Characters produce more stable, consistent output.

**Structural instructions beat tone instructions.** Telling the model "answer using this structure" is more reliable than "use this tone," because structure is easier to follow than emotion.

## References

- [I BUILT A FULLY AUTOMATIC MANSPLAINER](https://www.youtube.com/watch?v=xHi8PUIVyoo)
- [Anthropic Claude API](https://docs.anthropic.com/)
