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
  dialog.innerHTML=`<form method="dialog"><button aria-label="關閉雲端存檔" style="float:right">關閉</button></form><h2>Firebase 雲端存檔</h2><p id="firebaseSaveStatus" role="status" aria-live="polite">正在檢查設定…</p><p>網頁與 DC 各自存檔。本機備份會保留，登入後由你選擇上傳或載入。</p><div id="firebaseAuthFields"><label>電子郵件<input id="firebaseEmail" type="email" autocomplete="username"></label><label>密碼<input id="firebasePassword" type="password" autocomplete="current-password" minlength="6"></label><div class="button-row"><button type="button" id="firebaseSignIn">登入</button><button type="button" id="firebaseSignUp">註冊</button></div></div><div id="firebaseSaveActions" hidden><div class="button-row"><button type="button" id="firebaseUpload">上傳本機進度</button><button type="button" id="firebaseLoad">載入雲端進度</button><button type="button" id="firebaseSignOut">登出</button></div></div><p>顯示「已儲存至 Firebase」才代表雲端寫入完成。</p>`;
  const style=d.createElement('style');style.textContent='#firebaseCareerDialog{width:min(92vw,560px);max-height:88dvh;overflow:auto;border-radius:18px;padding:24px}#firebaseCareerDialog label{display:block;margin:12px 0}#firebaseCareerDialog input{display:block;width:100%;box-sizing:border-box;padding:12px;font-size:16px;margin-top:6px}#firebaseCareerDialog button{min-height:44px}#firebaseSaveStatus{font-weight:700;line-height:1.6}';d.head.append(style);d.body.append(dialog);
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
