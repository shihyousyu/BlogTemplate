---
title: 相簿暨作品集部落格模板
date: 2026-07-24
tags: [project]
---

# 一、動機  
作者買了網域想要活用，但懶得找框架，因此做了這個專案。  

# 二、專案架構  
```
website/
├── index.html
├── package.json
├── README.md
├── config/
│   ├── site.yaml                   # 網站標題、語言
│   ├── profile.yaml                # 側欄大頭照、名稱、簡介
│   ├── navbar.yaml                 # 導覽列項目、樣式
│   ├── theme.yaml                  # 顏色、背景、導覽列外觀
│   ├── layout.yaml                 # 首頁區塊順序/標題/顯示筆數
│   └── content.yaml                # 路徑/網址/樣板/標題
├── content/
│   ├── posts/
|   |   ├── *.md
|   |   └── manifest.json(自動產生)
│   ├── projects/
|   |   ├── *.md
|   |   └── manifest.json(自動產生)
│   ├── photography/
|   |   ├── <分類>/
|   |   |   └── <相簿名稱>/
|   |   |       ├── *.jpg
|   |   |       └── album.yaml
|   |   └── manifest.json(自動產生)
│   └── about.md                    # 固定路由頁面，格式與文章相同，但不需要 header
├── components/
|   ├── Navbar.js                   # 繪製導覽列
|   ├── Profile.js                  # 繪製左側個人檔案
|   ├── Markdown.js                 # 渲染 markdown
|   ├── Gallery.js                  # 相簿樣板
|   ├── Renderer.js                 # 分類渲染
|   ├── Home.js                     # 繪製首頁
|   ├── Footer.js                   # 繪製頁尾
|   └── util.js                     # 共用工具
├── engine/
|   ├── yamlLite.js                 # 簡化版 yaml 解析器
|   ├── markdownParser.js           # 分段讀取 .md 檔案 (header 及正文)
|   ├── configLoader.js             # 載入設定檔
|   ├── contentIndex.js             # 讀取文章及相簿
|   └── contentScanner.js           # 更新檔案後更新 mainfest
└── public/
    ├── css/style.css
    ├── js/
    │   ├── app.js                  # 路由(hash-based)+ 啟動
    │   └── vendor/
    |       ├── marked.esm.js       # 渲染 markdown
    |       └── highlight.esm.js    # 程式碼嵌入 highlight
    └── images/                     # 大頭照、背景圖
```  

# 三、使用說明  
這份網站的所有**內容**跟**外觀**都放在 `config/` 和 `content/`，不需要碰任何程式碼。  

* 每次改完 `content/` 底下的檔案(新增/刪除/改名文章、專案或相簿)之後須在 `website/` 目錄下執行
    ```
    node engine/contentScanner.js
    ```
    改 `config/*.yaml` 則直接重新整理網頁即可。  

## 1. `config/site.yaml` — 網站基本資訊  
```yaml
site:
    title: blog                 # 網站標題、頁尾版權文字
    tagline:                    # 頁尾標題下方的說明文字，可為空
    language: zh-TW             # <html lang="..">，影響瀏覽器判斷語言，不影響顯示文字
    url: blog.example.com       # 目前僅作紀錄用途，網站本身程式碼沒有讀取這個欄位
```

## 2. `config/profile.yaml` — 側欄個人資料  
```yaml
profile:
    name: Your Name
    avatar:
        image: /public/images/avatar.png   # 頭像路徑
    description:                           # 側欄簡介
        - "text"                           # 可多行
    links:                                 # 側欄按鈕，可不填
        - name: GitHub
            url: https://github.com/yourname
            icon: github
        - name: Email
            url: mailto:you@example.com
            icon: mail
```
可用的 `icon` 值：`github`、`twitter`（或 `x`）、`linkedin`、`instagram`、`mail`、`rss`、`globe`，不支援會顯示通用連結圖示。  

## 3. `config/navbar.yaml` — 導覽列  
```yaml
navbar:
    enabled: true              # 是否顯示導覽列

    style:
        type: floating          # 目前只有 floating 這個樣式
        blur: true               # 是否有模糊效果

    scroll:
        direction: horizontal    # 項目太多時導覽列允許橫向捲動

    items:
        - name: Home
            url: /

        - name: Article
            url: /article

        - name: Photography
            url: /photography
            children:                    # 下拉選單
                - name: Film
                    url: /photography/film
                - name: Digital
                    url: /photography/digital

        - name: Projects
            url: /projects

        - name: About
            url: /about
```

## 4. `config/theme.yaml` — 顏色與外觀  
```yaml
theme:
    default: dark                   # 網站第一次載入時使用的模式，dark 或 light
    colors:
        dark:
            primary: "#7bb8d9"          # 連結、按鈕、選中狀態
            secondary: "#e8a89c"        # 程式碼關鍵字、數字等
            background: "#0d1016"       # 純色模式，或圖片模式下的底色
            surface: "#161a22"          # 卡片、導覽列、程式碼區塊的底色
            text: "#e5e8ee"             # 主要文字顏色
            muted: "#7f8794"            # 日期、說明文字顏色
        light:
            primary: "#2f6690"
            secondary: "#c96a4e"
            background: "#f6f4ef"
            surface: "#ffffff"
            text: "#22242a"
            muted: "#6b7280"
    background:
        image: "/public/images/background.jpg"  # 留空 = 純色背景
        overlay:
            dark: 0.8             # 暗色模式的遮罩深淺，0~1（黑色遮罩）
            light: 0.2            # 淺色模式的遮罩深淺，0~1（白色遮罩）
    navbar:
        opacity: 0.55            # 導覽列不透明度，0~1
        radius: 999              # 導覽列 & 按鈕圓角，0~999
```
右下角有一顆圓形按鈕可以切換 dark / light，使用者點過一次之後，選擇會存在瀏覽器 `localStorage`，下次造訪會記得上次選的模式；沒點過的話就用 `default` 那個模式。

## 5. `config/layout.yaml` — 首頁區塊  
```yaml
home:
    components:
        - key: intro                        # 自我介紹欄位
            title: Hello, World             # 標題文字，可自由更改
            text:
                - "text"
            linkText: 閱讀更多關於我 ->
            linkUrl: /about

        - key: recentPosts                  # 固定值，代表 "最新文章" 區塊
            title: Recent Posts
            limit: 3                        # 顯示幾篇

        - key: featuredPhotography          # 固定值，代表 "精選攝影" 區塊
            title: Featured Photography
            limit: 4                        # 顯示幾本相簿
```

## 6. `config/content.yaml` — 內容分類總開關  
```yaml
categories:
    posts:
        path: posts              # 對應 content/posts/ 資料夾
        route: article           # 網址是 #/article
        renderer: article        # 用「文章列表 + 內文」樣板顯示
        label: Article            # 頁面標題文字

    photography:
        path: photography
        route: photography
        renderer: gallery         # 用「相簿格狀列表 + 相簿內頁」樣板顯示
        label: Photography

    projects:
        path: projects
        route: projects
        renderer: article
        label: Projects
```

### 新增一整個新的內容分類(例如想加一個「Notes」筆記分類): 
1. 在 `config/content.yaml` 的 `categories` 底下新增一段，例如: 
    ```yaml
    notes:
        path: notes
        route: notes
        renderer: article
        label: Notes
    ```
2. 在 `content/` 底下建立對應資料夾: `content/notes/`
3. 在 `config/navbar.yaml` 的 `items` 加一筆讓使用者點得到: 
    ```yaml
    - name: Notes
        url: /notes
    ```
4. 在 `content/notes/` 底下依照第 7 節「文章」的格式新增 `.md` 檔案
5. 執行 `node engine/contentScanner.js`

## 7. `content/posts` — 文章(Article)  
文章放在 `content/posts/`，**一個 `.md` 檔案 = 一篇文章**，檔名(不含 `.md`)即為網址  

### 新增一篇文章  
在 `content/posts/` 底下新增檔案，例如 `content/posts/example.md`:   

```markdown
---
title: example
date: yyyy-mm-dd
category: category
tags: tag
---

# 標題
內文

## 小標題
```
也可以放程式碼區塊:   
```javascript
console.log("hello");
```
存檔後執行 `node engine/contentScanner.js`，重新整理網頁，Article 列表就會出現這篇文章，最新日期排在最前面。  

header 欄位:   
* `title`: 文章標題(列表和內頁都會用到)  
* `date`: 日期，格式 `YYYY-MM-DD`，用來排序，缺少的話會被排到最後面  
* `category`: 目前主要是資料欄位，可自由填寫  
* `tags`: 清單格式 `[a, b, c]`，會顯示在日期旁邊，用頓號分隔  

網址代稱(slug)就是檔名，例如上例會是 `#/article/example`。  

### 編輯 / 刪除文章  
* 編輯: 直接改對應 `.md` 檔案內容，存檔重新整理即可，不用重跑 scanner  
* 刪除: 刪掉檔案，執行一次 `node engine/contentScanner.js`  
* 改檔名(改網址): 改完檔名也要重跑 scanner  

## 8. `content/projects` — 專案(Projects)  
同第 7 點，但檔案放在 `content/projects/` 資料夾底下，網址會是 `#/projects/檔名`。  

## 9. `content/photography` — 相簿  
相簿放在 `content/photography/<分類>/<相簿代稱>/`，一個資料夾就是一本相簿，裡面放一個 `album.yaml`(相簿資訊)和照片檔案本身。  

### 新增一本相簿
1. 建立資料夾，例如: `content/photography/film/taipei-2026/`  
2. 把照片放進去，例如 `001.jpg`、`002.jpg`、`003.jpg`  
3. 在同一個資料夾建立 `album.yaml`:  
    ```yaml
    title: 台北 2026
    category: film
    camera: Leica M6
    lens: Summicron 35mm
    film: Kodak Portra 400
    date: 2026-05-01
    images:
        - 001.jpg
        - 002.jpg
        - 003.jpg
    ```
4. 執行 `node engine/contentScanner.js`  
5. 重新整理網頁，Photography 列表 (或導覽列 Film / Digital 下拉選單，依`category` 而定) 就會出現這本相簿  

### 換封面  
封面 = `images` 清單第一張。把想當封面的照片檔名移到第一個位置即可:  
```yaml
images:
    - 003.jpg   # 換到第一個，變成新封面
    - 001.jpg
    - 002.jpg
```

存檔重新整理即可看到變化，不用重跑 scanner(除非你新增/刪除/改名了照片
檔案或相簿資料夾本身)。  

### 新增照片到現有相簿
把新照片丟進相簿資料夾，並在 `album.yaml` 的 `images` 清單加上檔名: 
```yaml
images:
    - 001.jpg
    - 002.jpg
    - 004-new-photo.jpg   # 新加的
```
只有列在 `images` 裡的檔案才會顯示，資料夾裡多放沒列進去的圖不會出現。  

## 10. Markdown 語法  
* 標題: `#` 到 `######`，共 6 級 (h1~h6)  
* 段落與換行: 空兩格以換行，空一行以分段  
* 強調: `**粗體**`、`*斜體*`、`~~刪除線~~`  
* 清單:  
    * 無序: `-` 開頭
    * 有序: `1. 2. ...`
* 任務清單: `- [ ]` 待辦、`- [x]` 已完成  
* 連結:  
    * 行內連結: \[文字](https://example.com)  
    * 參照式連結: \[文字][ref] + 另外一行 [ref]: https://example.com  
    * 自動連結: https://example.com 或 \<email@example.com>  
* 圖片: \![txt](href)  
* 程式碼:  
    * 行內: \`code\`
    * 區塊: 三個反引號 ``` 圍起來，可以標語言做語法標色，例如: 
        ```python
        def hello():
            print("hi")
        ```
        * 支援語言: `javascript`、`typescript`、`python`、`java`、`c`、`cpp`、`rust`、`go`、`bash`、`x86asm`、`verilog`、`yaml`、`json`
* 引用區塊: `> `  
    > 這是引言  
* 分隔線: `---`、`***`、`___`  
* 表格: 
    ```markdown
    | 1 | 2 | 3 |
    | - | - | - |
    | a | b | c |
    ```
* 跳脫字元: `\*` 這樣可以讓 `*` 顯示成普通符號，不被當成強調語法  
* 行內 HTML  

## 11. YAML 注意事項
本專案內建輕量化 YAML 解析器，僅支援本模板需要的 YAML 語法，修改 `config/` 時請注意以下限制:  

1. 使用空白縮排 (4 格)  
2. `:` 後須空格  
3. 特殊符號建議加上引號  
4. 日期使用 `yyyy-mm-dd`  
5. 僅支援以下語法:  

    * 物件: `key: value`  
    * 陣列: `- item`  
    * 巢狀結構