# Project Frontmatter Schema

## 基本欄位

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `title` | string | ✅ | 專案名稱 |
| `description` | string | — | 一句話摘要（用於 meta/SEO） |
| `category` | string | ✅ | 分類（見下方） |
| `tags` | string[] | ✅ | 所有標籤（主題 + 技術，見下方清單） |
| `github` | string | — | GitHub repo URL |
| `url` | string | — | 線上服務或 demo URL |
| `pinned` | boolean | — | 是否置頂，預設 false |

---

## 內文結構

結構化內容放在 markdown body，分四個段落：

```markdown
{{summary：1–2 句，讓讀者 30 秒內理解專案}}

## 背景
說明使用情境、為什麼做、誰有這個問題（2–4 句）

## 挑戰
具體的技術/產品限制與難點（2–3 句）

## 解法
總覽設計策略 + core contributions 列表（每項 `以 **X** 建置 Y`）

## 成果
可量化指標或可觀察的狀態（1–2 句）
```

---

## category

| 值 | 適用 |
|----|------|
| `tech` | 技術工具、基礎設施、工程平台 |
| `product` | 面向用戶的產品、服務、應用 |
| `learning` | 研究工具、教育平台、知識系統 |
| `creative` | 創意媒體、設計工具 |
| `life` | 個人工具、日常輔助 |

---

## tags 清單

主題與技術標籤合併使用，全小寫 kebab-case：

**主題**
`ai` / `education` / `marketing` / `design` / `film` / `anime` / `career` / `policy` / `travel` / `coffee` / `surf`

**Languages**
`python` / `javascript` / `typescript` / `kotlin` / `sql` / `csharp` / `cpp` / `java` / `shell-script`

**Frameworks & Libraries**
`fastapi` / `flask` / `react` / `pytorch`

**Infrastructure & Databases**
`docker` / `ansible` / `terraform` / `gcp` / `ubuntu` / `cloudflare`
`postgresql` / `redis` / `mongodb` / `firebase` / `Elasticsearch` 
`cassandra` / `jenkins` / `CICD`

**Observability**
`prometheus` / `grafana`

**MLOps & Data**
`mlflow` / `airflow`

**Other**
`git` / `android` / `claude`

> 範例：`["python", "fastapi", "docker", "postgresql", "gcp", "ai"]`

---

## 檔案路徑

```
src/content/projects/<project-slug>.md
```
