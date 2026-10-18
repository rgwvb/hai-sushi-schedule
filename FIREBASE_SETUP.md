# Firebase 儲存切換

狀態：程式與規則已準備；未填 Firebase 專案設定前，線上仍使用原存檔。不要宣稱已完成搬移。

## 專案與權限

1. 使用 Firebase Spark 方案，建立 Firestore **Standard** `(default)` 資料庫。維持未綁計費帳戶，不啟用 Blaze、Cloud Functions、PITR 或付費自動備份。
2. 註冊 Web App，啟用 Authentication 的電子郵件／密碼登入，授權網域加入 `rgwvb.github.io`。DC 內嵌活動另須處理其實際網域／代理設定，不能假設與一般瀏覽器相同。
3. 部署本目錄的 `firestore.rules` 與 `firestore.indexes.json`。預設拒絕；網頁僅可讀寫自己的存檔，禁止列出所有玩家；DC 集合禁止瀏覽器存取。
4. 將 Web App 公開設定寫入 `firebase-config.js`，包含 `apiKey`、`authDomain`、`projectId`、`appId`。這裡絕不可放私鑰。
5. 機器人使用專用服務帳戶，僅給 Firestore 資料存取所需權限。將其憑證直接放入 Railway 的 `FIREBASE_SERVICE_ACCOUNT_JSON`，並設定 `FIREBASE_PROJECT_ID`。也支援標準 Application Default Credentials。憑證不得貼進聊天或 GitHub。

## 資料分區

- `web_saves/{Firebase UID}`：網頁主角色、履歷、歷屆題目作答進度，使用 revision 防止跨裝置覆寫。
- `discord_saves/{guild~user}`：DC 角色；遊戲結算在 Firestore transaction 成功後才回覆成功。
- `discord_settings/{guild}`：頻道配置。
- `discord_messages/{guild~channel~slot}`：角色卡、榜單、說明訊息 ID，保留舊 ID 避免重複發文。
- `game_data/duty_cases`：勤務題庫，從目前已匯出的網站勤務題庫初始建立；機器人啟動會讀取雲端題庫。
- `game_data/positions`：職務與配階的初始資料。玩法規則程式碼仍由版本控制管理；這次只處理資料儲存，不代表兩版玩法已完全一致。
- 靜態圖片、官方試卷 PDF、網站程式仍為靜態資源，不塞進 Firestore 文件。

## 舊存檔搬移與驗證

DC 啟用 Firebase 後，機器人啟動時逐筆新增舊 SQLite 角色、頻道與訊息資料。已存在的 Firestore 文件不覆寫，重啟可續搬；原 SQLite 磁碟保留。啟用前應建立 Railway 磁碟備份。若 Firebase 授權或搬移失敗，啟動失敗並保留原資料；不會悄悄退回本機形成兩份分歧存檔。

網頁舊存檔在玩家自己的瀏覽器，無法由伺服器代取。玩家登入後按「上傳本機進度」，成功後開始自動雲端儲存；新裝置按「載入雲端進度」。已有雲端版本時拒絕直接覆蓋，須先載入。未登入、離線或未完成設定時仍保留本機備份，介面不會謊報已儲存到雲端。

驗證：確認 `FIREBASE_MIGRATION` 計數與 `FIREBASE_STORAGE_READY`，再實際測試 DC 作答、重啟後讀取、網頁上傳／載入、跨帳號拒絕、重複作答拒絕及不同裝置版本衝突。只有這些在真實專案通過後，才算正式搬移完成。單元測試使用可注入的交易儲存，不代表真實 Firebase 或 Security Rules 已驗證。
