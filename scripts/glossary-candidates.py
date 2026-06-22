#!/usr/bin/env python3
"""Extract glossary candidate terms from all .en.md prose.

Strips frontmatter, fenced/inline code, markdown links, headings and math —
mirroring the parts BilingualView's applyGlossary() will NOT mark — then ranks
unigram/bigram/trigram candidates by document frequency, excluding terms already
in src/data/glossary.ts and a stoplist of common English.
"""
import re, sys, glob, collections, json

ROOT = "src/content/posts"

# --- load existing glossary keys (normalized: lowercase, spaces/hyphens removed) ---
gloss_src = open("src/data/glossary.ts", encoding="utf-8").read()
existing = set()
existing_raw = set()
for m in re.finditer(r'^\s*"([^"]+)"\s*:', gloss_src, re.M):
    k = m.group(1).lower()
    existing_raw.add(k)
    existing.add(re.sub(r'[\s\-/]', '', k))

STOP = set("""the a an and or but if then else for to of in on at by with from into over under
is are was were be been being am do does did have has had having will would shall should can could
may might must this that these those it its their his her our your my me you we they them he she
as so not no nor only own same than too very just also can't dont don't i'm it's that's there here
what which who whom whose when where why how all any both each few more most other some such off out up
down again further once about above below between through during before after while because until against
one two three four five six seven eight nine ten first second third new old good bad big small high low
your you they we our their use used using uses make makes made get gets got like need needs want wants
work works working thing things way ways lot lots time times day days year years people person world
example examples case cases part parts kind sort type types means mean number numbers point points
problem problems question questions answer answers idea ideas reason reasons fact facts result results
real really actually basically simply just even still yet much many less least every another via per
let lets let's see seen look looks looking find finds found give gives given take takes taken come comes
go goes going know knows knew think thinks thought say says said tell tells told call calls called
without within across along around among toward towards upon onto unlike whether either neither
something anything everything nothing someone anyone everyone whatever whenever wherever however
text post article video paper author video's youtube original references reference summary tldr
section approach approaches method methods design designs system systems model models data
""".split())

def strip(md):
    # remove frontmatter
    md = re.sub(r'^---\n.*?\n---\n', '', md, flags=re.S)
    # fenced code
    md = re.sub(r'```.*?```', ' ', md, flags=re.S)
    # math blocks / inline
    md = re.sub(r'\$\$.*?\$\$', ' ', md, flags=re.S)
    md = re.sub(r'\$[^$]*\$', ' ', md)
    # inline code
    md = re.sub(r'`[^`]*`', ' ', md)
    # links/images -> drop entirely (linked text isn't marked)
    md = re.sub(r'!?\[[^\]]*\]\([^)]*\)', ' ', md)
    # drop heading lines and table separator rows
    lines = []
    for ln in md.splitlines():
        if ln.lstrip().startswith('#'):
            continue
        lines.append(ln)
    return '\n'.join(lines)

TOKEN = re.compile(r"[A-Za-z][A-Za-z0-9+./-]*")

def ngrams(md):
    # tokenize per-line so n-grams don't cross sentence-ish boundaries badly
    out_uni, out_bi, out_tri = set(), set(), set()
    for ln in re.split(r'[.!?;:|\n]', md):
        toks = [t.lower() for t in TOKEN.findall(ln)]
        toks = [t for t in toks if len(t) > 1]
        for i, t in enumerate(toks):
            out_uni.add(t)
            if i+1 < len(toks):
                out_bi.add(t + ' ' + toks[i+1])
            if i+2 < len(toks):
                out_tri.add(t + ' ' + toks[i+1] + ' ' + toks[i+2])
    return out_uni, out_bi, out_tri

dfu, dfb, dft = collections.Counter(), collections.Counter(), collections.Counter()
nfiles = 0
for f in glob.glob(f"{ROOT}/**/*.en.md", recursive=True):
    nfiles += 1
    md = strip(open(f, encoding="utf-8").read())
    u, b, t = ngrams(md)
    for x in u: dfu[x] += 1
    for x in b: dfb[x] += 1
    for x in t: dft[x] += 1

def norm(s): return re.sub(r'[\s\-/]', '', s.lower())

def keep(term, df, minlen=3):
    n = norm(term)
    if n in existing: return False
    words = term.split()
    if all(w in STOP for w in words): return False
    if len(words) == 1 and (term in STOP or len(term) < minlen): return False
    return True

def dump(title, counter, topn, minlen=3):
    print(f"\n===== {title} =====")
    rows = [(t, c) for t, c in counter.items() if keep(t, c, minlen)]
    rows.sort(key=lambda x: (-x[1], x[0]))
    for t, c in rows[:topn]:
        print(f"{c:3d}  {t}")

print(f"scanned {nfiles} files; existing glossary keys: {len(existing_raw)}")
dump("BIGRAMS (df>=3)", {k:v for k,v in dfb.items() if v>=3}, 80)
dump("UNIGRAMS (df>=4)", {k:v for k,v in dfu.items() if v>=4}, 120, minlen=4)

# --- Title-Case sequences & ALL-CAPS acronyms (strong jargon signal) ---
ACR = collections.Counter()       # acronyms like TPU, RLHF, MoE, KV
TITLE = collections.Counter()     # Title Case phrases like Mixture of Experts
acr_re = re.compile(r'\b([A-Z][A-Za-z0-9]*[A-Z0-9][A-Za-z0-9+./-]*)\b')   # has >=2 caps
title_re = re.compile(r'\b((?:[A-Z][a-z]+)(?:[ -](?:[A-Z][a-z]+|of|the|to|and|for|in)){0,3}(?:[ -][A-Z][a-z]+))\b')
for f in glob.glob(f"{ROOT}/**/*.en.md", recursive=True):
    md = strip(open(f, encoding="utf-8").read())
    seen_a, seen_t = set(), set()
    for m in acr_re.findall(md):
        if 2 <= len(m) <= 7 and norm(m) not in existing: seen_a.add(m)
    for m in title_re.findall(md):
        if norm(m) not in existing and not all(w.lower() in STOP for w in m.split()):
            seen_t.add(m.strip())
    for x in seen_a: ACR[x]+=1
    for x in seen_t: TITLE[x]+=1

print("\n===== ACRONYMS / MIXED-CAPS (df>=2) =====")
for t,c in sorted([r for r in ACR.items() if r[1]>=2], key=lambda x:(-x[1],x[0]))[:120]:
    print(f"{c:3d}  {t}")
print("\n===== TITLE-CASE PHRASES (df>=2) =====")
for t,c in sorted([r for r in TITLE.items() if r[1]>=2], key=lambda x:(-x[1],x[0]))[:120]:
    print(f"{c:3d}  {t}")
