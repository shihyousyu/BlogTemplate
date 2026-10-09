# BlogTemplate

原生 HTML、CSS、JavaScript 製作的設定驅動部落格模板。它不使用前端框架，建置時會產生完整靜態 HTML；載入後再以 History API 提供不重新整理的站內導覽。

## 建置與部署

需使用支援 ES modules 的 Node.js（建議 Node 18 以上）。

```bash
npm run build
```

此指令會重新掃描 `content/`、清空並產生 `dist/`、複製網站執行所需的資源，以及建立 `sitemap.xml` 和 `robots.txt`。不要手動編輯 `dist/`，每次建置都會完全重建它。

### 建置流程

`npm run build` 依序執行以下工作：

1. 掃描 `config/content.yaml` 定義的內容資料夾，更新各分類的 `manifest.json`。
2. 讀取 YAML 設定、Markdown Front Matter、相簿 `album.yaml` 與 Markdown 正文。
3. 產生首頁、分類列表、文章、專案、相簿、相簿分類及 About 的靜態 HTML。
4. 為每個頁面寫入 title、description、canonical 與 Open Graph metadata；文章未填 `description` 時，會從正文純文字取最多 160 個字元作為摘要。
5. 複製 `public/`、`config/`、`content/` 及執行期所需模組到 `dist/`，並產生 `sitemap.xml`、`robots.txt`。

建置完成後，部署 `dist/` 即可；不要部署專案根目錄。新文章、相簿或內容分類只要加入來源資料後重新執行 build，就會自動產生對應 HTML 與 sitemap 項目。

Cloudflare Pages 設定：

- Build command：`npm run build`
- Build output directory：`dist`

設定正式網址於 `config/site.yaml` 的 `site.url`（必須是 HTTPS URL）。此值用於 canonical、Open Graph URL、sitemap 與 robots.txt；核心程式沒有硬編碼網域。

## 網址與導覽

文章使用標準網址，例如 `/article/CF_R2/`；專案與相簿也會依 `config/content.yaml` 的 `route` 動態產生。巢狀 Markdown 檔案會保留巢狀 slug。

現有 `#/article/example` 連結在瀏覽器進站時會自動轉到 `/article/example/`。靜態內頁已經存在於 `dist/`，因此直接開啟或重新整理不會依賴 SPA fallback。

## 新增內容

### 文章與專案

在 `content/posts/` 或 `content/projects/` 新增 `.md`。檔名（可含資料夾）就是 slug。Front Matter 支援舊欄位，也可加入 SEO description：

```markdown
---
title: 文章標題
description: 顯示於搜尋結果的摘要
date: 2026-10-10
category: notes
tags: [linux, notes]
---

文章正文。
```

若不填 `description`，建置器會從 Markdown 內文產生摘要。每篇文章的靜態頁都含 title、description、canonical 及 Open Graph metadata；與 Front Matter `title` 重複的開頭 H1 會在靜態頁內避免重複。

### 相簿

在 `content/photography/<category>/<slug>/` 建立 `album.yaml` 和圖片。`images` 的第一張是封面與 Open Graph image。外部 R2 圖片仍可透過既有內容索引邏輯與 YAML 設定使用。

### 新分類

在 `config/content.yaml` 新增分類（`path`、`route`、`renderer`、`label`），再建立相應 `content/<path>/` 資料夾。`renderer: article` 會產生文章列表與內容頁；`renderer: gallery` 會產生相簿列表、分類頁與相簿頁。下一次 `npm run build` 會自動納入內容及 sitemap。

## SSG 與 SEO

`engine/staticGenerator.js` 重用內建 YAML 與 Markdown 解析器，輸出首頁、分類列表、內容頁、相簿與 About 頁。所有生成頁都有可閱讀的 HTML 正文，因此 JavaScript 停用時仍可閱讀並使用一般連結。`dist/sitemap.xml` 只列出本次實際生成的公開頁；可信的 `YYYY-MM-DD` 文章日期會輸出為 `lastmod`。

執行期的 JavaScript 不會在初始載入時清空已生成的同一路由內容；只在使用者站內導覽或瀏覽器上一頁／下一頁時重新渲染內容。
