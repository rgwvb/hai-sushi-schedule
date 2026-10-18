# Discord 玩家試算表

Google 試算表是 Firebase 的顯示副本。它只匯出指定伺服器的角色姓名、官階、職務、配階、單位、遊戲年月、年資、績效、考績及 Discord ID，不包含憑證或其他伺服器資料。修改試算表不會回寫遊戲。

以既有服務帳戶的專用金鑰授權 Sheets API；只分享目標試算表的編輯權限給該帳戶。啟用 Google Sheets API，將試算表 ID 存入 Railway 的 `GOOGLE_SHEETS_ID`。既有 `FIREBASE_SERVICE_ACCOUNT_JSON` 保持私密，不寫入版本控制。試算表需保留名稱為 `DC玩家總表` 的專用工作表。

啟動後同步一次；玩家操作後約 5 秒更新，另每 60 秒同步。同步只替換該分頁 A:P 的資料區域，保留其他分頁。資料列使用明確的字串／數字型別，Discord ID 保留完整字串，玩家名稱不當成公式。同步失敗不影響 Firebase 結算與 Discord 遊玩，後續會重試。

正式記錄 `GOOGLE_SHEETS_SYNC_READY rows=...` 才代表該次寫入完成；失敗記錄只含錯誤碼，不列印請求憑證。
