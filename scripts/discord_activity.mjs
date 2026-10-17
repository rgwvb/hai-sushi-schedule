/* Discord Activity adapter. Normal browser sessions never load the SDK. */
export function discordActivityContext(href, framed) {
  const url = new URL(href);
  if (!framed || !url.searchParams.get('frame_id') || !url.searchParams.get('instance_id')) return null;
  if (!['desktop', 'mobile'].includes(url.searchParams.get('platform'))) return null;
  const proxy = url.hostname.match(/^(\d{17,22})\.discord(?:says|sez)\.com$/);
  // Public ID also supports Discord's development URL override.
  const clientId = proxy?.[1] || url.searchParams.get('discord_client_id');
  return /^\d{17,22}$/.test(clientId || '') ? {clientId} : null;
}

export async function startDiscordActivity({
  win = window,
  loadSdk = () => import('./vendor/discord-sdk.mjs'),
  timeoutMs = 15000
} = {}) {
  const context = discordActivityContext(win.location.href, win.parent !== win);
  if (!context) return null;
  if (win.policeDiscord) return win.policeDiscord;
  const doc = win.document;
  const state = {active: true, status: 'connecting'};
  win.policeDiscord = state;
  doc.documentElement.classList.add('discord-activity');
  const badge = doc.createElement('span');
  badge.id = 'discordActivityStatus'; badge.className = 'status-chip';
  badge.setAttribute('role', 'status'); badge.setAttribute('aria-live', 'polite');
  badge.textContent = 'DC 活動連線中…';
  (doc.querySelector('.header-actions') || doc.body).append(badge);
  const note = text => { badge.textContent = text; };
  const style = doc.createElement('style');
  style.textContent = '.discord-activity body{min-height:100dvh;padding-bottom:env(safe-area-inset-bottom)}#discordActivityStatus{max-width:100%;white-space:normal}';
  doc.head.append(style);
  let sdk, deadline;
  const openLink = async event => {
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor || (event.type === 'auxclick' && event.button !== 1)) return;
    let url;
    try { url = new URL(anchor.href, win.location.href); } catch { return; }
    if (!['https:', 'http:'].includes(url.protocol) || url.origin === win.location.origin) return;
    event.preventDefault();
    if (state.status !== 'ready') { note('DC 尚未連線，請稍後再開啟參考資料。'); return; }
    try {
      const result = await sdk.commands.openExternalLink({url: url.href});
      note(result?.opened === false ? '未開啟外部資料，可再次點選連結。' : 'DC 活動｜已連線');
    } catch { note('暫時無法開啟參考資料，請稍後重試。'); }
  };
  doc.addEventListener('click', openLink, true);
  doc.addEventListener('auxclick', openLink, true);
  try {
    const connection = (async () => {
      const {DiscordSDK} = await loadSdk();
      sdk = new DiscordSDK(context.clientId, {disableConsoleLogOverride: true});
      await sdk.ready();
    })();
    await Promise.race([connection, new Promise((_, reject) => {
      deadline = win.setTimeout(() => reject(new Error('Activity connection timed out')), timeoutMs);
    })]);
    state.status = 'ready'; note('DC 活動｜已連線');
  } catch {
    state.status = 'error'; note('DC 連線失敗，請關閉後重新開啟活動。');
  } finally { win.clearTimeout(deadline); }
  return state;
}

if (typeof window !== 'undefined') void startDiscordActivity();
