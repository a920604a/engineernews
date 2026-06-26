---
name: update-about
description: Refresh the /about page (src/pages/about.astro + src/pages/en/about.astro) from the user's canonical sources — the GitHub profile repo (a920604a/a920604a README) and the resume site repo (a920604a/self-reusme-website public/data/*.json). Pulls work experience, projects, certifications, skills, and contacts; preserves the hand-written tagline / principles / interests. Use when the user says 更新 about / 同步 about / about 過時了 / refresh about / 我履歷更新了.
---

# update-about skill

把 `/about` 跟兩個「真實來源」對齊。資料散在兩處，這個 skill 去抓最新、合併、更新中英兩個 about 檔。

## 來源（單一事實來源 SoT）

| 內容 | 來源 |
|---|---|
| 姓名 / title / bio / email / 履歷下載 | resume repo `public/data/profile.json` |
| 工作經歷（時間軸） | resume repo `public/data/works.json`（`company / position / years / description[]`） |
| Projects / 技能 / 教育 | resume repo `public/data/projects.json`、`skills.json`、`education.json` |
| Key Projects（含 tech stack + repo 連結） | GitHub profile `a920604a/a920604a` README「Key Projects」 |
| 其他 projects | 同上 README「Things I'm Currently Learning」清單 |
| 證照（依年份 + 驗證連結） | 同上 README「Certifications」 |
| 聯絡連結 | 同上 README「Find Me」+ profile.json email |

## 抓取指令

```bash
# GitHub profile README
gh api repos/a920604a/a920604a/contents/README.md --jq '.content' | base64 -d

# 履歷站結構化資料
for f in profile works projects education skills; do
  echo "=== $f.json ==="
  gh api "repos/a920604a/self-reusme-website/contents/public/data/$f.json" --jq '.content' | base64 -d
done
```

> 履歷站本體是 React SPA，**WebFetch 抓不到內容**，一定要從 repo 的 `public/data/*.json` 拿。

## 對映到 about.astro 的 const

`src/pages/about.astro`（zh-TW）frontmatter 裡是一堆 TS const，逐一更新：

| about const | 來自 |
|---|---|
| `profile` (name/title/location/bio/email) | profile.json（`bio1`=title、`bio2`=bio） |
| `timeline[]` (company/role/years/desc) | works.json（desc 取 description[] 濃縮成一句，別整段貼） |
| `projects[]` (name/desc/stack/repo/article?) | README Key Projects + projects.json |
| `moreProjects[]` | README 其他 repo 連結 |
| `skills[]` (group/items) | skills.json / README competencies |
| `certifications[]` (year/items{name,issuer,url}) | README Certifications（**保留每個 url**） |
| `contacts[]` | README Find Me + email |

`projects[]` 的 `article` 欄位：**保留現有的**（Stock MLOps、Arxiv 連到站內介紹文）。新 project 若站內有介紹文（掃 `src/content/posts/` 找標題對得上的）就補，沒有就不加。

## ⚠️ 絕對不要覆蓋（手寫、非來源生成）

這幾個 const 是使用者親自定的個人內容，**抓資料時跳過、原封不動**：
- `tagline`
- `principles`（理念）
- `interests`（興趣）
- `focus`（焦點 chips，除非使用者要求更新）

## 英文版

`src/pages/en/about.astro` 結構相同，**同一份資料翻成英文**：
- 經歷描述、bio、project desc、興趣 why → 自然英文
- 證照名稱、發證單位、url、tech stack tag → 照搬（已是英文/連結）
- 公司名沿用英文（works.json 多為中文描述 → 翻譯 desc，公司名用通用英文寫法）

## 執行步驟

1. 抓兩個來源（上面指令）。
2. 跟現有 about.astro **逐欄 diff**，只改有變動的；**列出將更動的項目給使用者確認**（新工作、新證照、改過的 bio 等）。
3. 更新 `about.astro` 與 `en/about.astro` 的對應 const（保留禁改清單）。
4. node 20（`nvm use v20.20.2`）跑 `npx astro build`，確認兩頁正常。
5. commit：`chore(about): sync from profile/resume sources`（作者只掛使用者，不加 Co-Authored-By）。

## 常見錯誤
- 用 WebFetch 抓履歷站：錯，SPA 讀不到，要用 repo 的 json。
- 覆蓋 tagline/principles/interests：錯，那是手寫個人內容。
- 工作描述整段 description[] 貼上：太長，濃縮成一句重點。
- 漏更新英文版：兩個檔都要同步。
- 證照漏帶驗證 url：每個 cert 都要保留可點的連結。
