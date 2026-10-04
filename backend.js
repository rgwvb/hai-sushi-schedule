(() => {
  const cfg = window.SUPABASE_CONFIG || {};
  const ok = /^https:\/\/.+\.supabase\.co$/.test(cfg.url || "") && (cfg.anonKey || "").length > 20;

  function headers(token) {
    const h = {
      "apikey": cfg.anonKey,
      "Authorization": "Bearer " + (token || cfg.anonKey),
      "Content-Type": "application/json"
    };
    return h;
  }

  async function signUp(email, password, displayName) {
    if (!ok) throw new Error("Supabase 尚未設定");
    const r = await fetch(cfg.url + "/auth/v1/signup", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ email, password, data: { display_name: displayName || "" } })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.msg || data.error_description || "註冊失敗");
    if (data.access_token) localStorage.setItem("twPoliceAccessToken", data.access_token);
    if (data.refresh_token) localStorage.setItem("twPoliceRefreshToken", data.refresh_token);
    return data;
  }

  async function signIn(email, password) {
    if (!ok) throw new Error("Supabase 尚未設定");
    const r = await fetch(cfg.url + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error_description || "登入失敗");
    localStorage.setItem("twPoliceAccessToken", data.access_token);
    localStorage.setItem("twPoliceRefreshToken", data.refresh_token);
    return data;
  }

  function signOut() {
    localStorage.removeItem("twPoliceAccessToken");
    localStorage.removeItem("twPoliceRefreshToken");
  }

  function token() {
    return localStorage.getItem("twPoliceAccessToken") || "";
  }

  async function me() {
    if (!ok || !token()) return null;
    const r = await fetch(cfg.url + "/auth/v1/user", { headers: headers(token()) });
    if (!r.ok) return null;
    return r.json();
  }

  async function saveGame(state, slotName = "main") {
    if (!ok) throw new Error("Supabase 尚未設定");
    const user = await me();
    if (!user) throw new Error("請先登入");
    const url = cfg.url + "/rest/v1/game_saves?on_conflict=user_id,slot_name";
    const payload = [{ user_id: user.id, slot_name: slotName, version: 1, state }];
    const r = await fetch(url, {
      method: "POST",
      headers: { ...headers(token()), "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "雲端儲存失敗");
    return data[0] || null;
  }

  async function loadGame(slotName = "main") {
    if (!ok) throw new Error("Supabase 尚未設定");
    const user = await me();
    if (!user) throw new Error("請先登入");
    const q = encodeURIComponent(user.id);
    const s = encodeURIComponent(slotName);
    const r = await fetch(cfg.url + "/rest/v1/game_saves?user_id=eq." + q + "&slot_name=eq." + s + "&select=state&limit=1", {
      headers: headers(token())
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "雲端讀取失敗");
    return data[0]?.state || null;
  }

  async function addCase(caseRecord) {
    if (!ok) return;
    const user = await me();
    if (!user) return;
    const payload = [{
      user_id: user.id,
      case_no: caseRecord.id || String(Date.now()),
      case_type: caseRecord.type || "未分類",
      action: caseRecord.action || "",
      result: caseRecord.result || "",
      xp: Number(caseRecord.xp || 0),
      case_date: new Date().toISOString().slice(0,10)
    }];
    await fetch(cfg.url + "/rest/v1/case_records", {
      method: "POST",
      headers: { ...headers(token()), "Prefer": "return=minimal" },
      body: JSON.stringify(payload)
    });
  }

  window.CloudDB = { configured: ok, signUp, signIn, signOut, me, saveGame, loadGame, addCase };
})();
