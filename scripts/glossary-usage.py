#!/usr/bin/env python3
"""Count how many distinct glossary terms each article uses.

Mirrors BilingualView.applyGlossary():
  - only the English column is marked, so we scan *.en.md prose
  - one combined `\b(term)\b` case-insensitive regex, keys sorted longest-first
  - code / pre / links / headings / math are NOT marked, so we strip them
  - a term counts once per article (markedTerms Set)
"""
import re, glob, os, sys, collections

ROOT = "src/content/posts"

# --- load glossary keys (preserve zh for reporting) ---
src = open("src/data/glossary.ts", encoding="utf-8").read()
gloss = {}
for m in re.finditer(r'^\s*"([^"]+)"\s*:\s*\{\s*zh:\s*"([^"]*)"', src, re.M):
    gloss[m.group(1).lower()] = m.group(2)

keys = sorted(gloss.keys(), key=len, reverse=True)
regex = re.compile(r'\b(' + '|'.join(re.escape(k) for k in keys) + r')\b', re.I)

def strip(md):
    md = re.sub(r'^---\n.*?\n---\n', '', md, flags=re.S)   # frontmatter
    md = re.sub(r'```.*?```', ' ', md, flags=re.S)          # fenced code
    md = re.sub(r'\$\$.*?\$\$', ' ', md, flags=re.S)        # math block
    md = re.sub(r'\$[^$]*\$', ' ', md)                      # inline math
    md = re.sub(r'`[^`]*`', ' ', md)                        # inline code
    md = re.sub(r'!?\[[^\]]*\]\([^)]*\)', ' ', md)          # links/images
    lines = [ln for ln in md.splitlines() if not ln.lstrip().startswith('#')]
    return '\n'.join(lines)

rows = []          # (count, slug, [terms])
term_freq = collections.Counter()
for f in sorted(glob.glob(f"{ROOT}/**/*.en.md", recursive=True)):
    text = strip(open(f, encoding="utf-8").read())
    found = []
    seen = set()
    for m in regex.finditer(text):
        t = m.group(0).lower()
        if t in gloss and t not in seen:
            seen.add(t)
            found.append(t)
    for t in seen:
        term_freq[t] += 1
    slug = os.path.relpath(f, ROOT)
    rows.append((len(found), slug, found))

rows.sort(key=lambda r: -r[0])

total = len(rows)
used  = sum(1 for r in rows if r[0])
print(f"Glossary terms: {len(gloss)}   |   .en.md articles scanned: {total}")
print(f"Articles using >=1 term: {used}   |   none: {total-used}")
counts = [r[0] for r in rows]
print(f"Avg terms/article: {sum(counts)/total:.1f}   max: {max(counts)}   median: {sorted(counts)[total//2]}")

print("\n===== PER-ARTICLE (sorted by count) =====")
for c, slug, found in rows:
    print(f"{c:3d}  {slug}")

if "-v" in sys.argv:
    print("\n===== PER-ARTICLE TERMS =====")
    for c, slug, found in rows:
        if c:
            print(f"\n[{c}] {slug}\n     {', '.join(found)}")

print("\n===== MOST-USED TERMS (article frequency) =====")
for t, c in term_freq.most_common(40):
    print(f"{c:3d}  {t}  ({gloss[t]})")

unused = [k for k in keys if term_freq[k] == 0]
print(f"\n===== UNUSED GLOSSARY TERMS ({len(unused)}) =====")
print(", ".join(sorted(unused)))
