import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {JSDOM,VirtualConsole} from 'jsdom';
import {GameError} from './game.mjs';
import {careerRole,currentRank,careerArea} from './career.mjs';
const bundle=JSON.parse(readFileSync(new URL('web-engine.json',import.meta.url),'utf8'));
const origin='https://rgwvb.github.io/hai-sushi-schedule/';
const cache=new Map();
async function assetFetch(path){
  const url=new URL(path,origin);
  if(url.origin!==new URL(origin).origin||!/^\/hai-sushi-schedule\/(?:police-directory\.json|data\/exams\/[\w.-]+\.json)$/.test(url.pathname))throw Error('Asset URL rejected');
  if(!cache.has(url.href)){
    const request=fetch(url,{signal:AbortSignal.timeout(5500)}).then(async r=>{if(!r.ok)throw Error('Asset unavailable');return r.json();}).catch(e=>{cache.delete(url.href);throw e;});
    if(cache.size>=30)cache.delete(cache.keys().next().value);
    cache.set(url.href,request);
  }
  const data=await cache.get(url.href);return {ok:true,json:async()=>structuredClone(data)};
}
const fragments=['dutyCase','dutyChoices','dutyResult','commandCase','commandChoices','commandResult','quizQuestion','quizChoices','quizResult','topicQuizTitle','topicQuizProgress','topicQuizQuestion','topicQuizChoices','topicQuizResult','topicQuizStatus','examQuizTitle','examQuizMeta','examQuizProgress','examQuizQuestion','examQuizChoices','examQuizResult','examQuizStatus','examQuizSources','workforceAnalysis'];
const clean=text=>String(text||'').replace(/[\t ]+/g,' ').replace(/\n\s*\n\s*\n/g,'\n\n').trim();
function pathFor(el){
  if(el.id)return '#'+el.id;
  return pathFor(el.parentElement)+' > '+el.tagName.toLowerCase()+':nth-child('+([...el.parentElement.children].indexOf(el)+1)+')';
}
function visible(el,window){
  for(let n=el;n&&n.nodeType===1;n=n.parentElement){
    if(n.hidden||n.style.display==='none'||n.getAttribute('aria-hidden')==='true'||(n.tagName==='DIALOG'&&!n.open))return false;
    if(n.classList.contains('page')&&!n.classList.contains('active'))return false;
  }
  return true;
}
function label(el,document){
  const parentLabel=el.labels?.[0]||document.querySelector('label[for="'+el.id+'"]');
  const copy=parentLabel?.cloneNode(true);copy?.querySelectorAll('input,select,textarea').forEach(n=>n.remove());
  return clean(el.getAttribute('aria-label')||copy?.textContent||el.querySelector('h3,strong,.knowledge-title')?.textContent||el.textContent||el.id).replace(/\s+/g,' ').slice(0,80)||'操作';
}
function pageText(root,window){
  function walk(n){
    if(n.nodeType===3)return n.textContent;
    if(n.nodeType!==1||!visible(n,window)||['SCRIPT','STYLE','SVG','SELECT','OPTION','INPUT'].includes(n.tagName))return '';
    const value=[...n.childNodes].map(walk).join('');
    return ['DIV','SECTION','P','H1','H2','H3','H4','LI','TR','BUTTON','LABEL','BR','OUTPUT'].includes(n.tagName)?'\n'+value+'\n':value;
  }
  return clean(walk(root));
}
export async function runtime(saved,{fetcher=assetFetch,random}={}){
  const pending=new Set(),errors=[];
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));vc.on('error',()=>errors.push(Error('Web engine render failed')));
  const dom=new JSDOM(bundle.html,{url:origin,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>false;
    if(random)w.Math.random=random;
    w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
    w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
    // In chat the player reads feedback and presses Next. Never mutate a save on a background UI timer.
    const timer=w.setTimeout.bind(w);w.setTimeout=(fn,ms,...args)=>ms>=1000?0:timer(fn,ms,...args);
    w.fetch=(...args)=>{const p=Promise.resolve().then(()=>fetcher(...args));pending.add(p);p.finally(()=>pending.delete(p)).catch(()=>{});return p;};
    if(saved?.state)w.localStorage.setItem('twPoliceCareerSaveV1',JSON.stringify(saved.state));
    if(saved?.practice)w.localStorage.setItem('twPoliceHistoricalPracticeV1',saved.practice);
  }});
  const w=dom.window,d=w.document;
  const settle=async()=>{for(let n=0;n<30;n++){await Promise.resolve();if(pending.size)await Promise.allSettled([...pending]);await new Promise(r=>setImmediate(r));if(!pending.size)break;}if(errors.length)throw Error('Web engine failed');};
  try{
    w.eval(bundle.source);await settle();
    if(saved){
      w.dcCore.go(saved.page||'dashboard');
      w.dcSystems.restore(saved.systems);await w.dcArchive?.restore(saved.archive);w.dcWorkforce?.restore(saved.workforce);
      for(const [id,html] of Object.entries(saved.fragments||{}))if(d.getElementById(id))d.getElementById(id).innerHTML=html;
      for(const id of saved.dialogs||[])d.getElementById(id)?.setAttribute('open','');
      for(const v of saved.inputs||[]){const el=d.querySelector(v.path);if(el){el.value=v.value;el.checked=v.checked;}}
      for(const [id,x] of Object.entries(saved.flags||{})){const el=d.getElementById(id);if(el){el.hidden=x.hidden;el.disabled=x.disabled;}}
    }
    return {w,d,settle,close:()=>w.close(),snapshot(){
      return JSON.parse(JSON.stringify({version:1,engineHash:bundle.hash,state:w.dcCore.state(),page:d.querySelector('.page.active')?.id||'dashboard',systems:w.dcSystems.snapshot(),archive:w.dcArchive?.snapshot(),workforce:w.dcWorkforce?.snapshot(),practice:w.localStorage.getItem('twPoliceHistoricalPracticeV1'),
        fragments:Object.fromEntries(fragments.filter(id=>d.getElementById(id)).map(id=>[id,d.getElementById(id).innerHTML])),
        dialogs:[...d.querySelectorAll('dialog[open]')].map(e=>e.id),
        inputs:[...d.querySelectorAll('input,select,textarea')].map(el=>({path:pathFor(el),value:el.value,checked:el.checked})),
        flags:Object.fromEntries(['topicQuizNextBtn','examQuizNextBtn','workforceNext','workforceSubmit','workforceAnalysis'].map(id=>[id,{hidden:d.getElementById(id)?.hidden,disabled:d.getElementById(id)?.disabled}]))}));
    },view(selection){
      const root=d.querySelector('dialog[open]')||d.querySelector('.page.active');
      const controls=[];
      const blocked=new Set(['resetBtn','manualLoadBtn','loadBtn','manualSaveBtn','saveBtn','selfCheckBtn','exportSaveBtn','importSaveBtn']);
      for(const el of root.querySelectorAll('button,input,select,textarea,.choice-card,.action-card')){
        if(!visible(el,w)||el.disabled||blocked.has(el.id))continue;
        let kind=['SELECT'].includes(el.tagName)?'select':['INPUT','TEXTAREA'].includes(el.tagName)?(['checkbox','radio'].includes(el.type)?'toggle':'input'):'click';
        if(kind==='click'&&el.tagName!=='BUTTON'&&typeof el.onclick!=='function')continue;
        controls.push({kind,path:pathFor(el),label:(kind==='toggle'?(el.checked?'☑ ':'☐ '):'')+label(el,d),value:el.value||'',type:el.type||'',options:kind==='select'?[...el.options].map(o=>({label:o.textContent,value:o.value})):undefined});
      }
      const pages=[...d.querySelectorAll('.sidebar .nav-btn[data-page]')].filter(el=>visible(el,w)&&el.dataset.page!=='settings').map(el=>({value:el.dataset.page,label:clean(el.textContent)}));
      const links=[...root.querySelectorAll('a[href]')].filter(a=>visible(a,w)&&a.href.startsWith('https://')).slice(0,3).map(a=>({label:clean(a.textContent),url:a.href}));
      return {title:clean(root.querySelector('h1,h2')?.textContent)||'警察生涯',text:pageText(root,w),controls,pages,links,selection,notice:clean(d.querySelector('.toast.show')?.textContent),date:w.dcCore.stats().date,role:w.dcCore.state().position,rank:w.dcCore.state().officialRank,...w.dcSystems.stats()};
    },async act(a){
      if(a.kind==='page'){
        const allowed=[...d.querySelectorAll('.nav-btn[data-page]')].some(el=>el.dataset.page===a.value&&visible(el,w));
        if(!allowed||a.value==='settings')throw new GameError('此身分尚未開放這個功能。');
        w.dcCore.go(a.value);
      }else{
        const el=d.querySelector(a.path);
        if(!el||!visible(el,w)||el.disabled)throw new GameError('這項操作已失效，請重新開啟頁面。');
        if(a.kind==='input'||a.kind==='select'){
          if(a.kind==='select'&&![...el.options].some(o=>o.value===a.value))throw new GameError('選項已失效。');
          if(el.type==='number'&&(!Number.isFinite(Number(a.value))||Number(a.value)<Number(el.min||0)||Number(a.value)>Number(el.max||1e9)))throw new GameError('輸入數字超出範圍。');
          el.value=String(a.value).slice(0,Math.min(Number(el.maxLength)>0?el.maxLength:100,100));el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));
        }else if(a.kind==='toggle'){el.click();el.dispatchEvent(new w.Event('change',{bubbles:true}));}
        else if(!w.dcSystems.click(el)&&!w.dcArchive?.click(el))el.click();
      }
      await settle();
    }};
  }catch(e){w.close();throw e;}
}

// Old DC characters remain playable under their existing rules until the owner explicitly imports them.
// This avoids inventing equivalent statutory qualifications from simplified DC training or merit.
export async function fullAction(p,request,options){
  if(request?.start){
    if(p.webCareer)throw new GameError('你已啟用網頁規則。');
  }
  if(!p.webCareer&&!request?.start)throw new GameError('請先啟用網頁規則。');
  const rt=await runtime(p.webCareer,options);
  try{
    if(request?.start){
      if(p.completed||p.month){
        p.webLegacyBackup=structuredClone(p);
        const role=careerRole(p),county=careerArea(p.unit).county||'臺北市';
        const seq=role.sequence??0,officer=seq<=9;
        const now=new Date(2026,Number(p.month)||0,1,8),positionStart=new Date(2026,Number(p.appointed)||0,1,8);
        const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T08:00:00`;
        const base=rt.w.dcCore.state();
        const unit=({criminal:'criminal',traffic:'traffic',security:'security',patrol:'station',station_lead:'station'})[role.deck]||'admin';
        const precinct=p.unit.match(/([^｜]*?分局)/)?.[1]?.replace(/^.*警察局/,'')||'';
        const stationName=p.unit.match(/([^｜分局]*?(?:派出所|分駐所))/)?.[1]||'';
        rt.w.dcCore.replace({...base,created:true,name:p.name,initialAge:22,age:22+Math.floor(p.month/12),education:officer?'大學畢業':'高中畢業',route:officer?'g3':'g4',routeName:officer?'一般警察特考三等':'一般警察特考四等',passed:true,training:true,written:70,physical:70,qualification:officer?'警正四階任官資格':'警佐三階任官資格',officialRank:currentRank(p),position:role.title,rank:role.title,careerSequenceNo:seq,sequence:'第'+['零','一','二','三','四','五','六','七','八','九','十','十一'][seq]+'序列',county,localAgency:p.unit.match(/^(.*?警察局)/)?.[1]||county+'警察局',precinct,stationName,unit:unit==='station'&&!stationName?'security':unit,unitName:p.unit,assignmentType:unit==='station'?'station':unit==='admin'?'administration':unit,careerStage:officer?'officer_rotation':'basic_active',rotationEligible:officer&&p.month-(p.lastRotation??p.appointed)>=18,rotationCycleDays:30*(p.month-(p.lastRotation??p.appointed)),officerEducationQualified:officer,policeZhengQualified:officer,unitSelectionOpen:false,startDate:'2026-01-01T08:00:00',joinDate:'2026-01-01T08:00:00',positionStartDate:iso(positionStart),simDate:iso(now),simEpoch:now.getTime(),maxSimEpoch:now.getTime(),dutyCount:p.completed,lastAppraisalDutyCount:Math.min(p.completed,p.appraisals.length*12),lastAppraisalYear:p.appraisals.length?Number(p.appraisals.at(-1).year)+16:null,xp:p.completed*18,outcomePerformance:p.merit,merit:0,appraisals:p.appraisals.slice().reverse().map(a=>({...a,type:'年度考績',grade:{A:'甲等',B:'乙等',C:'丙等'}[a.grade]||a.grade})),history:p.history.slice().reverse().map(h=>({time:h.date.replace(' 年 ','年').replace(' 月','月1日 08:00'),title:'舊版生涯',detail:h.text})),salary:officer?64000:56500});
        rt.w.dcCore.go('dashboard');
      }else{
        rt.w.dcCore.go('character');
        rt.d.getElementById('charName').value=p.name;
      }
    }else if(request?.action!==undefined){
      if(request.revision!==p.webView?.revision)throw new GameError('這張操作卡已更新，請用 /開始 開啟最新進度。');
      const a=p.webView.actions[request.action];if(!a)throw new GameError('無效操作。');
      if(a.kind==='input'||a.kind==='select'){
        if(request.value===undefined){const selection={...a,offset:Math.max(0,Number(request.offset)||0)};return {p,view:{...rt.view(selection),revision:p.webView.revision}};}
        await rt.act({...a,value:request.value});
      }else await rt.act(a);
    }else if(request?.page)await rt.act({kind:'page',value:request.page});
    if(request?.display!==undefined){return {p,view:{...rt.view(),revision:p.webView.revision,display:Math.max(0,Number(request.display)||0)}};}
    p.webCareer=rt.snapshot();
    const view=rt.view(),revision=randomBytes(8).toString('hex');
    p.webView={revision,actions:[...view.controls,...view.pages.map(a=>({kind:'page',...a}))]};
    const state=p.webCareer.state,stats=rt.w.dcCore.stats();
    p.webSummary={title:view.role,rank:view.rank,badge:['考生','待分發'].includes(view.role)?null:view.badge,sequence:['考生','待分發'].includes(view.role)?99:view.sequence,date:view.date,performance:view.performance,supervisor:view.supervisor,age:stats.age,years:stats.years,retired:state.retired};
    p.name=state.name||p.name;p.unit=state.unitName||'尚未分發';p.personalRank=state.officialRank;
    p.merit=view.performance;p.completed=state.dutyCount;p.appraisals=state.appraisals;
    p.month=Math.max(0,Math.floor((new Date(state.simDate)-new Date('2026-01-01T08:00:00'))/86400000/30));
    return {p,view:{...view,revision}};
  }finally{rt.close();}
}
