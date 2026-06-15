---
title: "Git & GitHub from Scratch: Your First Version Control Lesson"
date: 2026-05-21T12:20:28.877Z
category: learning
tags: ["git", "github", "version-control", "tools", "development"]
lang: en
tldr: "A plain-language walkthrough of Git core concepts — from init to branch merging — so beginners actually understand what version control does."
description: "A beginner's guide to Git and GitHub covering installation, repository setup, committing changes, branching, and merging through hands-on examples."
type: how-to
original_url: "https://www.youtube.com/watch?v=bWUUHBVg-7E"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_140852_952309.mp3"
---

Most people's first question about Git is: "Why do I need this?"

The answer is simple: with Git, you never have to name files `final.docx`, `final_v2.docx`, or `final_FINAL_really.docx` again. Every commit is a snapshot of your project at a specific point in time. You can go back to any version, see exactly what changed, and why. When collaborating with others, you stop worrying about accidentally overwriting each other's work.

## TL;DR

Git is a version control tool. GitHub is a cloud platform for hosting Git repositories. Master the "add → commit → push" cycle and you'll handle 90% of everyday use cases.

## Prerequisites

- Install Git from [git-scm.com](https://git-scm.com/)
- Create a GitHub account at [github.com](https://github.com/)
- Access to a terminal (macOS Terminal, Windows PowerShell, or Git Bash)

After installation, run `git --version` in your terminal. Seeing a version number means you're good to go.

## Understanding the Three Working Areas

Git has three "working areas." Get these straight and most commands will make sense:

**Working Directory**: Where you actually edit files — just your regular folder on disk.

**Staging Area**: A holding area for changes you're about to commit. `git add` moves things here.

**Repository**: The permanent record of all your commits. `git commit` writes the staging area into the repository.

## Step 1: Create Your First Repository

On GitHub, click the "+" button in the top-right corner, select "New repository," fill in the name, and click "Create repository."

Then on your computer:

```bash
mkdir my-project
cd my-project

git init
git remote add origin https://github.com/your-username/my-project.git
```

## Step 2: Make Your First Commit

```bash
echo "Hello, Git!" > README.md

git add README.md
git commit -m "Initial commit: add README"
git push -u origin main
```

The `-u origin main` flag sets the default push target. After this, just `git push` is enough.

## Step 3: Use Branches to Experiment Safely

Think of branches as parallel universes. You make changes in a branch, confirm everything works, then merge it back into main. The main branch stays stable throughout.

```bash
git checkout -b feature/add-login

echo "Login page" > login.html
git add login.html
git commit -m "Add login page"

git checkout main
git merge feature/add-login

# Clean up after merging
git branch -d feature/add-login
```

## Handling Merge Conflicts

If two branches modify the same line of the same file, Git can't decide which version to keep and marks it as a conflict. The file will look like this:

```
<<<<<<< HEAD
This is the main branch version
=======
This is the feature branch version
>>>>>>> feature/add-login
```

Edit the file to keep what you want, remove the conflict markers, then `git add` and `git commit` to finish.

## Useful Commands for Daily Use

```bash
git status          # See which files have changes
git log --oneline   # View commit history in brief
git show <hash>     # Inspect a specific commit
```

## Common Questions

**Getting "permission denied" when pushing?**
This is usually an authentication issue. GitHub recommends using a Personal Access Token — generate one in your account settings and use it as your password when prompted.

**Can I fix a commit message after committing?**
If you haven't pushed yet, `git commit --amend` lets you edit the last message. If you've already pushed, it's better to leave it — rewriting history affects collaborators.

**How do I tell Git to ignore certain files?**
Create a `.gitignore` file in the project root and add the paths you want to skip, like `node_modules/` or `.env`. GitHub provides templates for most languages.

## References

- [Git Official Documentation](https://git-scm.com/doc)
- [GitHub Documentation](https://docs.github.com/)
- [Pro Git Book (free)](https://git-scm.com/book/en/v2)
