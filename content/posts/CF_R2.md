---
title: 優化本部落格專案: 將圖片存於 Cloudflare R2 以 rclone 管理並改寫 contentIndex.js
date: 2026-07-26
category: notes
tags: [notes]
---

## 一、動機
相簿照片太多，家裡網路不好，從外面載入很慢，且若要丟到 GitHub 會有大小限制，因此將圖片存在雲端，repo 只留檔案清單與路徑。

## 二、建立 R2 Bucket
登入 Cloudflare dashboard，在左側搜尋找到 R2 Object Storage，建立 bucket，取個名字，這裡以 `my-photos` 做例子。

進入 bucket，在 Settings 找到 Public Development URL，Enable 它，得到一串網址，這裡以 `<pub-url>` 代替。

回到 R2 Object Storage，在右下角找到 Account Details，會看到 Account id，等等會用到，進入 Manage，Create 一個 API token，給予 Read & Write 的權限，下一步得到 Access Key ID 與 Secret Access Key，同樣複製起來，等等會用到這兩個。

## 三、安裝 CLI 管理工具
檔案可以在頁面拖拉上傳，這裡採用雲端儲存管理工具 rclone (AWS 的 S3 也能用這個)。

1. 安裝 rclone
    * Linux: 
        ```bash
        curl https://rclone.org/install.sh | sudo bash
        ```
    * macOS: 
        ```
        brew install rclone
        ```
    * Windows: 
        ```powershell
        winget install Rclone.Rclone
        ```

2. 設定 R2 連線
    ```powershell
    rclone config
    ```
    依序填這幾項:  
    1. `n`，新增 remote，取個名字，這裡以 `r2` 舉例
    2. Storage type 選最長的那一串
    3. Provider 選 `Cloudflare R2 Storage`
    4. env_auth 選 `Enter AWS credentials in the next step`
    5. 填入 Access Key ID 與 Secret Access Key
    6. 下一步按 Enter 跳過，endpoint 填入 `https://<account id>.r2.cloudflarestorage.com`
    7. 下兩步按 Enter 跳過，最後按 `q` 離開 config
    8. 測試連線: `rclone lsd r2:`

## 四、上傳檔案
rclone 常用語法: 

### 查看
```powershell
# 列出所有 bucket
rclone lsd r2:

# 列出 bucket 底下的資料夾結構
rclone lsd r2: my-photos

# 列出某路徑底下所有檔案(含大小)
rclone ls r2: my-photos/{path}
```

### 上傳
```powershell
# 把本地資料夾同步上傳到 R2，除了 yaml 檔
rclone copy "C:\{path1}" r2:my-photos/{path2} --exclude "*.yaml"

# 同步(會刪除 R2 上本地沒有的檔案)
rclone sync "C:\{path1}" r2:my-photos/{path2} --exclude "*.yaml"
```

`copy`: 只新增  
`sync`: 多的會被刪掉

### 搬移 / 改名
```powershell
# 資料夾改名(在 R2 內部搬移)
rclone move r2:my-photos/{path}/{name1} r2:my-photos/{path}/{name2}

# 單一檔案改名
rclone moveto r2:my-photos/{path}/old.jpg r2:my-photos/{path}/new.jpg
```

### 刪除

```powershell
# 刪除單一檔案
rclone delete r2:my-photos/{path}/001.jpg

# 刪除整個資料夾
rclone purge r2:my-photos/{path}
```

## 五、更改 contentIndex.js
將讀取 album 的 `engine/loadAlbum(basePath, file)` 中原本路徑的位置改成網址。

原本: 
```js
const res = await fetch(`${basePath}/${file}`);
```

改成:
```js
const CDN_BASE = 'https://<pub-url>';
const folder = `${CDN_BASE}/${slug}`;
```

這樣讀取時會從本地的 `album.yaml` 讀取需要的檔案，但改從 R2 抓。