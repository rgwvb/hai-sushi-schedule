export class CloudConflict extends Error {}
export function createCloudStore({db,auth,doc,getDoc,runTransaction,serverTimestamp}){
  let revision=null;
  const ref=()=>{if(!auth.currentUser)throw Error('請先登入 Firebase 帳號。');return doc(db,'web_saves',auth.currentUser.uid);};
  return {
    reset(){revision=null;},
    async inspect(){const d=await getDoc(ref());return d.exists();},
    async load(){const uid=auth.currentUser?.uid,d=await getDoc(ref());if(auth.currentUser?.uid!==uid)throw Error('帳號已切換，請重新載入。');if(!d.exists())throw Error('尚未建立雲端存檔，請先上傳本機進度。');const data=d.data(),p=JSON.parse(data.state);revision=data.revision;return p;},
    async save(state,{initial=false}={}){
      const target=ref(),uid=auth.currentUser.uid,text=JSON.stringify(state);
      if(new TextEncoder().encode(text).length>850000)throw Error('存檔接近雲端單筆容量上限，請先備份。');
      const expected=revision;
      const result=await runTransaction(db,async tx=>{
        const old=await tx.get(target),data=old.exists()?old.data():null;
        if(data&&(expected===null||data.revision!==expected))throw new CloudConflict('雲端已有其他版本。請先載入雲端進度，避免覆蓋。');
        if(!data&&!initial&&expected!==0)throw new CloudConflict('雲端存檔已變更，請重新登入後確認。');
        const next=(data?.revision||0)+1;
        tx.set(target,{userId:uid,state:text,revision:next,version:1,updatedAt:serverTimestamp()});return next;
      });
      if(auth.currentUser?.uid!==uid)throw Error('帳號已切換，請重新確認存檔。');revision=result;return result;
    }
  };
}
export async function installFirebaseCareer(win=window){
  const d=win.document,dialog=d.createElement('dialog');dialog.id='firebaseCareerDialog';
  dialog.setAttribute('aria-labelledby','firebaseDialogTitle');
  dialog.innerHTML=`<div class="fc-topline"><span class="fc-brand"><span class="fc-brand-dot"></span> POLICE CAREER</span><form method="dialog"><button class="fc-close" aria-label="關閉雲端存檔">×</button></form></div><header class="fc-hero"><span class="fc-emblem" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M16 3 26 7v8c0 6-4 10-10 14C10 25 6 21 6 15V7L16 3Z" stroke="currentColor" stroke-width="1.6"/><path d="M11 19h10a3 3 0 0 0 .2-6 5.2 5.2 0 0 0-10-1A3.5 3.5 0 0 0 11 19Z" stroke="currentColor" stroke-width="1.5"/><path d="m13 22 3-3 3 3m-3-3v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><p class="fc-eyebrow">你的每一步，都值得保存</p><h2 id="firebaseDialogTitle">生涯雲端存檔</h2></div></header><div class="fc-status"><span class="fc-status-dot" aria-hidden="true"></span><p id="firebaseSaveStatus" role="status" aria-live="polite">正在連接雲端…</p></div><div id="firebaseAuthFields"><p class="fc-section-title">登入你的存檔帳號</p><label for="firebaseEmail">電子郵件</label><input id="firebaseEmail" type="email" inputmode="email" autocomplete="username" placeholder="you@example.com" autofocus><div class="fc-label-row"><label for="firebasePassword">密碼</label><span>至少 6 個字元</span></div><input id="firebasePassword" type="password" autocomplete="current-password" minlength="6" placeholder="輸入你的密碼"><div class="fc-auth-actions"><button type="button" id="firebaseSignIn" class="fc-primary">登入存檔帳號 <span aria-hidden="true">→</span></button><button type="button" id="firebaseSignUp" class="fc-secondary">建立新帳號</button></div></div><div id="firebaseSaveActions" hidden><p class="fc-section-title">選擇這次的存檔操作</p><div class="fc-save-actions"><button type="button" id="firebaseUpload" class="fc-primary">上傳本機進度 <span aria-hidden="true">↑</span></button><button type="button" id="firebaseLoad" class="fc-secondary">載入雲端進度 <span aria-hidden="true">↓</span></button><button type="button" id="firebaseSignOut" class="fc-signout">登出帳號</button></div></div><footer class="fc-footer"><span class="fc-note-icon" aria-hidden="true">✓</span><div><p>本機進度會保留，網頁與 Discord 分開存檔。</p><small>首次登入請上傳本機進度；換裝置時載入雲端進度。<br>顯示「已儲存至 Firebase」即代表雲端儲存完成。</small></div></footer><div class="fc-powered">CLOUD SAVE <span>Firebase</span></div>`;
  const style=d.createElement('style');style.textContent=`
#firebaseCareerDialog{--fc-text:#edf4ff;--fc-muted:#9cacc4;--fc-line:#2a3d58;box-sizing:border-box;width:min(92vw,520px);max-height:90vh;max-height:90dvh;margin:auto;padding:28px;border:1px solid #385477;border-radius:24px;background:linear-gradient(145deg,#14283f 0%,#0b1728 64%);color:var(--fc-text);font:400 15px/1.6 system-ui,-apple-system,"Noto Sans TC",sans-serif;box-shadow:0 30px 100px #0009;text-align:left;color-scheme:dark;overflow:auto;overscroll-behavior:contain}
#firebaseCareerDialog::backdrop{background:#030b18b8;backdrop-filter:blur(8px)}
#firebaseCareerDialog *{box-sizing:border-box}
#firebaseCareerDialog [hidden]{display:none!important}
#firebaseCareerDialog p,#firebaseCareerDialog h2,#firebaseCareerDialog form{margin:0}
#firebaseCareerDialog button{font:inherit;cursor:pointer;transition:background .18s,border-color .18s,transform .18s;min-height:48px;margin:0;border-radius:12px;box-shadow:none;letter-spacing:0}
#firebaseCareerDialog button:active{transform:translateY(1px)}
#firebaseCareerDialog button:focus-visible,#firebaseCareerDialog input:focus-visible{outline:3px solid #73baff;outline-offset:3px}
#firebaseCareerDialog button:disabled{opacity:.45;cursor:not-allowed}
#firebaseCareerDialog .fc-topline{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}
#firebaseCareerDialog .fc-brand{display:flex;align-items:center;gap:8px;color:#91b3d6;font-size:10px;letter-spacing:2px;font-weight:700}
#firebaseCareerDialog .fc-brand-dot{width:6px;height:6px;border-radius:50%;background:#7ab9ff;box-shadow:0 0 12px #66adff80}
#firebaseCareerDialog .fc-close{display:grid;place-items:center;width:44px;min-height:44px;padding:0;border:1px solid #354760;background:#ffffff07;color:#bccce0;font-size:26px;line-height:1}
#firebaseCareerDialog .fc-close:hover{background:#ffffff12;color:white}
#firebaseCareerDialog .fc-hero{display:flex;align-items:center;gap:16px;margin-bottom:24px}
#firebaseCareerDialog .fc-emblem{flex:0 0 62px;display:grid;place-items:center;height:68px;border:1px solid #426a96;border-radius:18px;background:linear-gradient(150deg,#28517a,#17314d);color:#b6d9ff;box-shadow:inset 0 1px #ffffff17}
#firebaseCareerDialog .fc-emblem svg{width:40px;height:40px}
#firebaseCareerDialog .fc-eyebrow{color:var(--fc-muted);font-size:12px;letter-spacing:1px;margin-bottom:3px}
#firebaseCareerDialog h2{font-size:27px;line-height:1.4;font-weight:750;color:var(--fc-text);letter-spacing:.5px}
#firebaseCareerDialog .fc-status{display:flex;gap:10px;align-items:flex-start;padding:13px 15px;border:1px solid #365c86;border-radius:13px;background:#1c416530;margin-bottom:24px}
#firebaseCareerDialog .fc-status-dot{flex:0 0 6px;height:6px;margin-top:9px;border-radius:50%;background:#79bfff}
#firebaseCareerDialog #firebaseSaveStatus{font-size:13px;font-weight:500;line-height:1.7;color:#c1dfff;overflow-wrap:anywhere}
#firebaseCareerDialog .fc-section-title{color:#d8e6f7;font-size:13px;font-weight:650;margin-bottom:16px}
#firebaseCareerDialog label{display:block;color:#bdcde0;font-size:13px;font-weight:550;margin:0 0 7px}
#firebaseCareerDialog input{display:block;width:100%;height:52px;margin:0 0 17px;padding:0 15px;border:1px solid #3a4e69;border-radius:12px;background:#081423;color:#f1f6ff;font:inherit;font-size:16px;box-shadow:inset 0 1px 3px #0002;transition:border-color .18s}
#firebaseCareerDialog input::placeholder{color:#74869f;opacity:1}
#firebaseCareerDialog input:focus{border-color:#7abaff;background:#0a1a2d}
#firebaseCareerDialog input:-webkit-autofill{-webkit-text-fill-color:#edf4ff;box-shadow:0 0 0 100px #10243b inset}
#firebaseCareerDialog .fc-label-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
#firebaseCareerDialog .fc-label-row span{font-size:11px;color:#8a9bb2}
#firebaseCareerDialog .fc-auth-actions,#firebaseCareerDialog .fc-save-actions{display:grid;gap:10px;margin-top:7px}
#firebaseCareerDialog .fc-primary,#firebaseCareerDialog .fc-secondary{display:flex;justify-content:center;align-items:center;gap:12px;padding:12px 18px;font-weight:700;border:1px solid transparent;min-height:52px}
#firebaseCareerDialog .fc-primary{background:linear-gradient(110deg,#3f8ee9,#276ed0);border-color:#5da2f0;color:white;box-shadow:0 4px 16px #1463c72b}
#firebaseCareerDialog .fc-primary:hover{background:linear-gradient(110deg,#53a0f6,#337cdf)}
#firebaseCareerDialog .fc-secondary{background:#1b2d44;border-color:#3b516f;color:#d6e7fb}
#firebaseCareerDialog .fc-secondary:hover{background:#263d59;border-color:#6382a7}
#firebaseCareerDialog .fc-signout{border:0;background:transparent;color:#9db0c9;font-size:13px;min-height:44px}
#firebaseCareerDialog .fc-footer{display:flex;align-items:flex-start;gap:10px;border-top:1px solid var(--fc-line);margin-top:24px;padding-top:18px}
#firebaseCareerDialog .fc-note-icon{display:grid;place-items:center;flex:0 0 18px;height:18px;border:1px solid #496987;border-radius:50%;font-size:11px;color:#91b7dc;margin-top:2px}
#firebaseCareerDialog .fc-footer p{font-size:12px;color:#b4c4d8;margin-bottom:4px}
#firebaseCareerDialog .fc-footer small{font-size:11px;line-height:1.7;color:#8296b0}
#firebaseCareerDialog .fc-powered{margin-top:20px;text-align:center;color:#617994;font-size:9px;font-weight:600;letter-spacing:2px}
#firebaseCareerDialog .fc-powered span{color:#9cb0c8;margin-left:5px;letter-spacing:.5px}
@media(max-width:480px){#firebaseCareerDialog{width:calc(100vw - 24px);padding:21px;border-radius:21px}#firebaseCareerDialog .fc-topline{margin-bottom:18px}#firebaseCareerDialog h2{font-size:24px}#firebaseCareerDialog .fc-emblem{flex-basis:54px;height:60px;border-radius:15px}#firebaseCareerDialog .fc-hero{gap:12px;margin-bottom:20px}#firebaseCareerDialog .fc-status{margin-bottom:20px}#firebaseCareerDialog .fc-footer{margin-top:20px}}
@media(prefers-reduced-motion:reduce){#firebaseCareerDialog button,#firebaseCareerDialog input{transition:none}}
`;d.head.append(style);d.body.append(dialog);
  const open=d.createElement('button');open.type='button';open.textContent='雲端存檔';open.className='secondary-btn';open.onclick=()=>dialog.showModal();(d.querySelector('.header-actions')||d.body).append(open);
  const status=d.getElementById('firebaseSaveStatus'),tell=text=>{status.textContent=text;open.title=text;};
  const config=win.FIREBASE_CONFIG;
  win.FirebaseCareer={queueSave(){},status:'unconfigured'};
  if(!config?.projectId||!config?.apiKey||!config?.authDomain){tell('Firebase 尚未連接；現有本機進度已保留。');for(const b of dialog.querySelectorAll('#firebaseAuthFields button'))b.disabled=true;return;}
  try{
    const version='12.19.0',base=`https://www.gstatic.com/firebasejs/${version}/`;
    const [appSdk,authSdk,fireSdk]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
    const app=appSdk.initializeApp(config),auth=authSdk.getAuth(app),db=fireSdk.getFirestore(app);
    const store=createCloudStore({db,auth,...fireSdk});
    let active=false,timer,writing=Promise.resolve();
    const buttonIds=['firebaseUpload','firebaseLoad','firebaseSignIn','firebaseSignUp','firebaseSignOut'];
    const busy=async fn=>{for(const id of buttonIds)d.getElementById(id).disabled=true;try{await fn();}catch(e){if(e instanceof CloudConflict)active=false;tell(e instanceof CloudConflict?e.message:'操作未完成：'+(e.code||e.message||'請稍後重試'));}finally{for(const id of buttonIds)d.getElementById(id).disabled=false;}};
    const enqueue=(state,initial=false)=>{
      const owner=auth.currentUser?.uid;
      const work=writing.catch(()=>{}).then(async()=>{if(!owner||auth.currentUser?.uid!==owner)throw Error('帳號已切換，請重新確認存檔。');return store.save(state,{initial});});
      writing=work;return work;
    };
    const saveNow=async()=>{if(!active||!auth.currentUser)return;tell('正在儲存至 Firebase…');try{await enqueue(win.getPoliceCareerState());tell('已儲存至 Firebase。');}catch(e){active=false;tell(e instanceof CloudConflict?e.message:'雲端儲存未完成，本機備份已保留。');}};
    win.FirebaseCareer={status:'ready',queueSave(){if(!active)return;clearTimeout(timer);tell('進度已更新，等待雲端儲存…');timer=win.setTimeout(()=>void saveNow(),1500);},saveNow};
    authSdk.onAuthStateChanged(auth,async user=>{
      active=false;clearTimeout(timer);store.reset();
      d.getElementById('firebaseAuthFields').hidden=!!user;d.getElementById('firebaseSaveActions').hidden=!user;
      d.getElementById('firebasePassword').value='';
      if(!user){tell('請登入，啟用 Firebase 雲端存檔。');return;}
      tell('已登入，正在檢查雲端進度…');
      try{const exists=await store.inspect();if(auth.currentUser?.uid!==user.uid)return;tell(exists?'雲端已有存檔，請按「載入雲端進度」。':'尚無雲端存檔，請按「上傳本機進度」搬移目前角色。');}catch{tell('暫時無法讀取 Firebase，本機備份已保留。');}
    });
    const credentials=()=>[d.getElementById('firebaseEmail').value.trim(),d.getElementById('firebasePassword').value];
    d.getElementById('firebaseSignIn').onclick=()=>void busy(async()=>{await authSdk.signInWithEmailAndPassword(auth,...credentials());});
    d.getElementById('firebaseSignUp').onclick=()=>void busy(async()=>{await authSdk.createUserWithEmailAndPassword(auth,...credentials());});
    d.getElementById('firebaseUpload').onclick=()=>void busy(async()=>{clearTimeout(timer);await enqueue(win.getPoliceCareerState(),true);active=true;tell('已儲存至 Firebase；後續進度會自動儲存。');});
    d.getElementById('firebaseLoad').onclick=()=>void busy(async()=>{clearTimeout(timer);await writing.catch(()=>{});const state=await store.load();win.applyPoliceCloudState(state);active=true;tell('已載入 Firebase 進度；後續進度會自動儲存。');});
    d.getElementById('firebaseSignOut').onclick=()=>void busy(async()=>{active=false;clearTimeout(timer);await writing.catch(()=>{});await authSdk.signOut(auth);});
    d.addEventListener('visibilitychange',()=>{if(d.visibilityState==='hidden'){clearTimeout(timer);void saveNow();}});
  }catch{tell('Firebase 連接未完成，本機進度已保留；請檢查網路與專案設定。');}
}
if(typeof window!=='undefined')void installFirebaseCareer();
