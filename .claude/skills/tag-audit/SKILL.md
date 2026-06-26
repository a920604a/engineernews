---
name: tag-audit
description: Audit all tags across src/content/posts/, surface case-variant splits (AI/ai), Chinese↔English duplicates (系統設計/system-design), synonym splits (agent/ai-agent), and single-use noise, then normalize to the CLAUDE.md convention (lowercase kebab-case English). Produces a rename map for approval before batch-replacing. Use when the user says 整理 tags / tag 重複 / 清理標籤 / tag 太亂 / tag audit / 標籤正規化.
---

# tag-audit skill

掃全站 tags，收斂到 **lowercase-kebab 英文**（CLAUDE.md 規範），**先列改名提案、不直接動**；使用者拍板後才批次替換。

## 規範（north star）

CLAUDE.md：`tags: required; lowercase kebab-case`。所以正規化方向固定：
- 大小寫 → 全小寫（`AI→ai`、`LLM→llm`、`GitHub→github`）
- 中文 → 英文等價詞（`系統設計→system-design`、`職涯→career`、`機器學習→machine-learning`）
- 空白/符號 → kebab（`Agent 框架→agent-framework`）
- 明顯同義 → 合併（`agent→ai-agent`、`large-language-model→llm`、`ai-agents→ai-agent`）
- 垃圾 tag（人名、podcast 系列名如 `郝旭烈`、`大人的small-talk`）→ 刪除或併入主題

## 執行步驟

### 1. 收集現況
```bash
node -e '
const fs=require("fs"),path=require("path");
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):p.endsWith(".md")?[p]:[]})}
const m=new Map();
for(const f of walk("src/content/posts")){const s=fs.readFileSync(f,"utf8");const mm=s.match(/^tags:\s*\[(.*)\]/m);if(!mm)continue;for(let t of mm[1].split(",")){t=t.trim().replace(/^["\x27]|["\x27]$/g,"");if(t)m.set(t,(m.get(t)||0)+1)}}
const e=[...m].sort((a,b)=>b[1]-a[1]);
console.log("unique:",e.length,"singletons:",e.filter(([,c])=>c===1).length);
const low=new Map();for(const[t,c]of e){const k=t.toLowerCase();(low.get(k)||low.set(k,[]).get(k)).push([t,c])}
console.log("\nCASE/變形重複:");for(const[,a]of low)if(a.length>1)console.log("  "+a.map(([t,c])=>`${t}(${c})`).join(" vs "))
console.log("\nCJK tags:");for(const[t,c]of e)if(/[一-鿿]/.test(t))console.log(`  ${c}\t${t}`)
'
```

### 2. 列改名提案（rename map）
逐項決定 `舊 tag → 新 tag`（或 `→ 刪除`）。同一概念只留一個 canonical。**給使用者確認**。

### 3. 批次套用（確認後）
寫一支 normalize 腳本（參考過往做法）：
- 預設 `tag.toLowerCase().replace(/\s+/g,'-')` 處理大小寫/kebab
- 一份 `ZH` 對照表處理中文（`''` = 刪除）
- 一份 `SYN` 表處理英文同義合併
- 逐篇重寫 `tags: [...]`，**單篇內去重**
- **先 dry-run**（印 before→after 數字 + top tags），再 `--write`

### 4. 驗證
- node 20 跑 `npx astro build`，確認 tags 頁正常重建、無 schema 錯誤
- 抽查幾篇文章 frontmatter

## 常見錯誤
- 直接改不先列提案：錯，先讓使用者看 rename map。
- 把不同概念硬併（如 `machine-learning` 併進 `ai`）：錯，只併真正同義。
- 漏掉單篇內去重：正規化後可能同篇出現兩個相同 tag。
- 忘了英文版 `.en.md` 也要一起改（腳本掃 `**/*.md` 即可涵蓋）。
