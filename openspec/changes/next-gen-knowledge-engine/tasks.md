## 1. Backend RAG & Streaming

- [ ] 1.1 重構 `/api/search` 以支援 RAG 流程（檢索 + 生成）
- [ ] 1.2 實作 Web Streams API 以轉發 Workers AI 的流式輸出
- [ ] 1.3 在 Prompt 中加入引用歸因指令與結構化要求

## 2. Automated Visuals in Crawler

- [ ] 2.1 更新 `crawl.ts` 以提取技術結構並產出 Mermaid 圖表
- [ ] 2.2 測試不同類型的影片內容，確保 Mermaid 圖表生成的穩定性

## 3. Automated i18n Pipeline

- [ ] 3.1 在 `crawl.ts` 中加入自動翻譯與雙語檔案產出流程
- [ ] 3.2 驗證雙語內容同步提交至 Git 的正確性
