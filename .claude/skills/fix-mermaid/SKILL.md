# fix-mermaid

Scan `src/content/posts/**/*.md` for mermaid code blocks, validate each one by attempting to render it with `mmdc`, and fix any syntax errors — looping until every diagram renders cleanly.

---

## Steps

### 1. Discover all mermaid blocks

Use Grep to find every file that contains ` ```mermaid `:

```
pattern: ```mermaid
path: src/content/posts
glob: **/*.md
```

### 2. For each file found

Read the file and extract every mermaid block (text between `\`\`\`mermaid` and the closing `\`\`\``).

### 3. Validate by rendering

For each extracted block, write it to a temp file and run:

```bash
echo '<mermaid-content>' > /tmp/test_diagram.mmd
mmdc -i /tmp/test_diagram.mmd -o /tmp/test_out.svg --quiet 2>&1
```

- If exit code is 0 → diagram is valid. Skip.
- If exit code is non-zero → capture the error output and proceed to fix.

### 4. Fix the block

Analyze the error message from mmdc together with the diagram source to identify the problem. Common issues to look for:

| Issue | Fix |
|---|---|
| Missing/wrong diagram type keyword | Add/correct `flowchart TD`, `sequenceDiagram`, `graph LR`, etc. |
| Node labels with special characters unquoted | Wrap label in `"..."` |
| Arrow syntax wrong (e.g. `->` instead of `-->`) | Correct arrow tokens |
| Subgraph missing `end` | Add `end` |
| Missing newline between statements | Add newlines |
| `graph` used instead of `flowchart` for newer syntax | Convert keyword |
| Participant/actor missing in sequenceDiagram | Add participant declarations |
| Chinese/special chars in node IDs | Move to label: `A["中文"]` |

After making the fix, **re-run mmdc** on the corrected block to verify it renders. If it still fails, analyze the new error and fix again. Loop up to **5 attempts** per diagram. If still failing after 5 attempts, log the file path and skip — do not modify the file.

### 5. Write fixes back

Once a corrected block is confirmed working (mmdc exits 0), use the Edit tool to replace the original broken block with the corrected one in the source file. Replace **only** the mermaid block content, leave the surrounding markdown untouched.

### 6. Report

After scanning all files, output a summary:

```
## Mermaid Fix Report

✅ Valid (no changes):   N diagrams
✏️  Fixed:               N diagrams  
  - src/content/posts/tech/some-file.md (block 1): <short description of fix>
❌ Could not fix:        N diagrams
  - src/content/posts/...: <error snippet>
```

---

## Constraints

- Never remove a mermaid block entirely — only fix its syntax.
- If a diagram is ambiguous (unclear intent), make the minimal change needed to make it parse, preserving the original meaning as best as possible.
- Do not change anything outside of the mermaid code fences.
- One block at a time — fix, verify, write, then move to the next.
