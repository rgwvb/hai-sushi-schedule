# 台灣警察生涯：Discord 指令與按鈕版

這是文字頻道機器人，不需要 Activities 或 URL Mappings。程式需在電腦或伺服器持續運行；GitHub Pages 只能提供網頁，不能執行這個機器人。程式已提供，尚需用你自己的 Discord 應用設定啟動及驗收。

## Windows 第一次啟動

1. 安裝 [Node.js 24 LTS](https://nodejs.org/)（24.17.0 以上）。
2. 下載這個 GitHub 專案的 ZIP，**先全部解壓縮**，打開 `discord-bot` 資料夾，雙擊 `start-windows.bat`。
3. 第一次會開啟記事本，在 `.env` 的等號後填入：

| 設定 | 哪裡找 |
|---|---|
| `DISCORD_TOKEN` | [Developer Portal](https://discord.com/developers/applications) → 你的應用 → Bot → Reset Token／Copy |
| `DISCORD_APPLICATION_ID` | 同一應用的 General Information → Application ID |
| `DISCORD_GUILD_ID` | DC 使用者設定 → 進階 → 開發者模式；右鍵你的伺服器圖示 → 複製伺服器 ID |

4. 儲存並關閉記事本，啟動檔會安裝套件、註冊指令及連線。看到「機器人已上線」，到**指定伺服器的文字頻道**輸入 `/開始`。

**Token 是密碼，只填在自己電腦的 `.env`；不要傳給任何人或提交 GitHub。** 如果曾外洩，到 Bot 頁面重新產生，再更新 `.env`。Application ID 與伺服器 ID 可以公開，不能拿 Client Secret 或 Public Key 代替 Bot Token。

第二次起直接雙擊啟動檔，沿用存檔與設定。關閉視窗、電腦休眠或關機，機器人就會離線。設定有誤時，以記事本開啟 `.env` 修正後重啟。

## Discord 後台與權限

- 可沿用已加入伺服器的同一個應用。私人應用的 Installation → Install Link 維持 **None／無**。
- 如需重新邀請：OAuth2 → URL Generator → 選 `bot` 和 `applications.commands`，選 Guild Install，用產生的網址邀請。私人應用使用擁有者帳號邀請。
- 頻道需允許機器人「檢視頻道、傳送訊息、嵌入連結」，玩家需能使用應用程式指令。**不需要管理員權限**。
- 本程式用 Gateway 接收互動，General Information → **Interactions Endpoint URL 留空**。不需要公開網址、轉發埠或 ngrok。
- 不需開啟 Message Content、Server Members 等特權 Intent，也不需要開啟 Activities。
- 沒看到指令：確認註冊成功、ID 是同一個應用與伺服器、邀請有 `applications.commands`，再重新開啟 Discord。指令僅註冊至 `.env` 指定的伺服器。

## 玩法

| 指令 | 用途 |
|---|---|
| `/開始` | 輸入姓名、單位；建立從 2010 年開始、22 歲且已正式任職的警員。已有角色就繼續，不覆蓋 |
| `/任務` | 依目前職務出情境題，點 A／B／C，立即看分析與績效變化 |
| `/角色` | 階級、職務、年月、年資、勤務績效及最近考績 |
| `/履歷` | 最近 16 筆勤務、任命、研習紀錄，完整歷史保留在資料庫 |
| `/訓練` | 下一職務有研習要求時可開始，連續答對 3 題即完成；完成後立刻記錄 |
| `/升遷` | 列出現職年資、現職績效、最近兩年考績及研習條件；符合後按鈕確認 |
| `/說明` | 查看規則 |

每件正式勤務推進 1 個遊戲月份。妥適處置績效 +0.2、部分妥適 +0.1、有風險處置 +0；12 件勤務自動結算一年考績。年度平均 85 分以上為 A、70 分以上為 B，其餘 C。訓練不推進月份、不給勤務績效。績效累積無上限，不因載入重複給分。

警員只處理本人與搭檔勤務；巡佐兼副所長、巡官兼所長、警務員兼所長會有帶班題；警務正處理承辦呈核；分局長及更高職務處理對應層級協調。題材取自現有網站，答案順序隨機，題組循環前盡量不重複。**這是 DC 首版的簡化生涯規則，不代表真實任用資格，也尚未包含網頁版全部考試、職缺輪調及歷屆題庫。** 目前沒有考生模式：建立時就是已任職警員。

升遷各階段現職年資門檻依序為 2、3、4、4、5、5、6、6 年；還需對應績效、最近兩年 B 以上考績及指定研習。每次升遷重新計算現職年資與績效，不能連按跳級。模擬退休年齡 65 歲。研習題庫是業務情境練習，並非官方升官等訓練考題。

## 存檔與部署

### Railway 雲端啟動

Railway 服務設定 Root Directory 為 `/discord-bot`、Start Command 為 `npm run cloud`、Node 版本為 24。掛載持久 Volume 至 `/data`，設定 `DISCORD_DB_PATH=/data/careers.sqlite`，保持單一副本並停用休眠。

在服務的 **Variables** 新增 `DISCORD_TOKEN`，值填入同一個應用的 Bot Token，儲存並部署。這個啟動方式不需要 `.env` 檔；應用 ID 自動辨識，機器人只加入一個伺服器時，伺服器 ID 也自動辨識並註冊指令。若機器人已加入多個伺服器，再補填 `DISCORD_GUILD_ID` 指定目標。未加入伺服器時，先使用 `bot` 與 `applications.commands` 範圍邀請，再重新部署。

沒有 Token 時容器只會顯示「等待設定」，**不代表 Discord 機器人已上線**。看到「機器人已上線，7 個指令已註冊」後才可到指定伺服器使用 `/開始`。只用 Bot Token，不能填 Client Secret 或 Public Key；Token 只填入 Railway，不傳聊天室。雲端與 Windows 啟動方式請擇一運行，避免同一 Bot 同時連線。

每個伺服器、每位 Discord 使用者各自保存 SQLite 生涯，預設檔案是 `data/careers.sqlite`。只有本人可操作其案件按鈕。重複作答與過期按鈕不會重複加分；重啟可繼續未完成案件。回覆預設只有操作的玩家看得到，避免洗版。DC 存檔與網頁版不互通。

在其他主機使用 Node.js 24.17.0 以上，進入 `discord-bot` 後：

```sh
npm ci
# 將 .env.example 複製為 .env，填好三項設定
npm run register
npm start
```

主機需允許連外至 Discord REST／Gateway。若要全天在線，可將相同資料夾部署到持續執行的 Node 主機，設定啟動命令 `npm start`，並將 `DISCORD_DB_PATH` 指到**持久磁碟**。單一資料庫只啟動一個機器人程序；不要在電腦及雲端同時開同一個 Bot。備份前先停止機器人，再複製整個 `data` 資料夾；刪除該資料夾會失去所有玩家進度。程式僅保存遊戲所需的伺服器 ID、使用者 ID、角色名稱、任職單位與遊戲紀錄，不讀取聊天內容。

## 開發驗證

`npm test` 使用真實 SQLite 與 Discord 元件序列化，測試多人隔離、權限、重複作答、資料庫重開、研習結算、升遷門檻與互動流程；不會登入 Discord 或傳送訊息。用 `node export-cases.mjs` 從網站重新匯出題組。正式上線仍需在真實 Discord 應用驗收。

官方參考：[Discord 機器人教學](https://docs.discord.com/developers/quick-start/getting-started)、[Discord 互動回應](https://docs.discord.com/developers/interactions/receiving-and-responding)、[discord.js](https://discord.js.org/docs/packages/discord.js/14.24.0)。
