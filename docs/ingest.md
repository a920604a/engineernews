# 對話攝取工具

對話攝取腳本位於 `scripts/ingest.ts`，用途是把對話或筆記轉成文章草稿並存入 `src/content`。

常見工作流程：

1. 跟 Claude / GPT 產出文章草稿
2. 透過 ingest 腳本將草稿轉成 Markdown 並加入 frontmatter
3. 使用 `scripts/sync-to-d1.ts` 同步到 D1 並建立向量索引

參數與範例請查看 scripts 內的說明註解。

