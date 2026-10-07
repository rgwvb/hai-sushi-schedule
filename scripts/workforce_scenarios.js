/* Authored police scenarios. Numbers describe the game case, not official staffing standards. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const dialog = $('workforceScenarioDialog'), game = window.policeScenarioGame;
  if (!dialog || !game) return;
  const sources = {
    duty: ['警察勤務條例：勤務規劃、機動警力與指揮協調', 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0080026'],
    traffic: ['警政署：道路交通事故處理事項', 'https://www.npa.gov.tw/ch/app/data/view?id=2306&module=wg076&serno=007a0e28-43f1-4f22-8e49-41908d78fc66'],
    missing: ['警政署：協尋失蹤人口政策宣導', 'https://police.npa.gov.tw/ch/app/video/view?id=1839&module=video&serno=a9f9e168-cea1-4596-9771-db18abc87170'],
    crowd: ['臺北市警察局：活動人車疏導與安全', 'https://td.police.gov.taipei/News_Content.aspx?n=B19CFD7B4346611D&s=D36D8F6F60AA48A8&sms=72544237BBE4C5F6']
  };
  const task = (label, hint, minimum, initial) => ({label, hint, minimum, initial});
  const cases = [
    {id:'collision',title:'下班尖峰｜路口交通事故',local:6,medical:true,source:'traffic',
      story:'兩輛車在路口碰撞，一名民眾受傷。救護車尚未到場，兩個主要車流方向都需要有人疏導。先到場的你與同仁共 2 人。',
      facts:['本班共 8 人，2 人維持值班與其他既定勤務，可調用 6 人。','傷者協助與救護聯繫需同步；兩個車流方向各由一人照看。','完整處理另需現場紀錄一人、民眾引導與通報一人；規劃一名機動備援。'],
      priority:['先保障傷者與現場安全，同時通報救護及勤務中心','先在車道中央爭論肇事責任','先完成所有書面紀錄，再處理傷者'],correct:0,
      tasks:[task('傷者協助與救護聯繫','照護協助與救護聯繫兩項工作同步進行。',2,1),task('車流疏導','兩個主要車流方向需持續有人照看。',2,1),task('現場紀錄與資料保全','由一人整理現場資料，避免影響救護。',1,0),task('民眾引導與通報','由一人引導當事人並保持通聯。',1,0)]},
    {id:'missing-child',title:'公園勤務｜走失兒童協尋',local:6,medical:false,source:'missing',
      story:'家長在公園服務台報案，孩子剛才在兩處遊戲區附近走失。沒有受傷或遭人帶走的已知資訊。你與同仁共 2 人先到服務台。',
      facts:['本題可調用 6 人，兩處遊戲區各需一人查訪。','家長陪同與特徵確認、服務台聯繫、資訊彙整各需一人。','保留一名機動人員，收到新線索後再由指揮中心協調調整。'],
      priority:['要求家長自行找滿一天後再報案','立即受理、確認特徵及最後位置，回報並啟動協尋','未確認資料就公開孩子完整個資'],correct:1,
      tasks:[task('搜尋與查訪','兩處遊戲區各需一人查訪；先到場先確認最後位置。',2,1),task('家屬陪同與資料確認','一人陪同家長，確認描述與聯繫方式。',1,1),task('服務台及通報聯繫','一人保持服務台與勤務中心的聯繫。',1,0),task('資訊彙整','一人比對新線索，避免重複搜尋。',1,0)]},
    {id:'event-exit',title:'活動散場｜市集人潮引導',local:6,medical:false,source:'crowd',
      story:'市集即將散場，兩個出口都有排隊人潮，旁邊兩個路口的車流增加。目前未有受傷通報。先到場的你與同仁共 2 人。',
      facts:['本題可調用 6 人，兩個出口各需一人引導。','兩個路口各需一人疏導，服務諮詢與通報協調各需一人。','維持出口及救護通道暢通，另規劃一名機動備援。'],
      priority:['把兩個出口都封住，等民眾停止移動','集中所有人處理一個路口，忽略出口人潮','先掌握出口及車流風險，分流引導並回報增派需求'],correct:2,
      tasks:[task('出口人潮引導','兩個出口各需一人引導；先到場先掌握一處出口。',2,1),task('周邊路口疏導','兩個路口各需一人；先到場先維持一處安全動線。',2,1),task('民眾諮詢與協助','一人處理服務需求，避免人潮停滯。',1,0),task('通報與跨組聯繫','一人彙整各點回報並與勤務中心聯繫。',1,0)]},
    {id:'rain-hazard',title:'豪雨通報｜積水路段協助',local:6,medical:true,source:'duty',
      story:'豪雨造成道路積水，附近一名居民身體不適，兩個入口需要引導用路人改道。你與同仁共 2 人抵達安全區域，消防及道路管理單位尚未到場。',
      facts:['本題可調用 6 人；禁止把員警分配進未知深度的積水區。','兩個入口各需一人引導改道，居民協助與救護聯繫需同步。','災情通報與民眾引導各需一人，另規劃一名機動備援。'],
      priority:['在安全區域先阻止民眾誤入，通報救護及道路管理單位','直接進入未知深度積水區，再決定是否通報','先拍照上網，等其他人到場才處理風險'],correct:0,
      tasks:[task('入口警示與改道','兩個入口各需一人引導；先到場先處理最急迫入口。',2,1),task('居民協助與救護聯繫','安全區域的協助與救護聯繫兩項工作同步。',2,1),task('災情回報與協調','一人回報道路及現場狀況，聯繫相關單位。',1,0),task('民眾引導','一人在安全區域引導等待協助的民眾。',1,0)]},
    {id:'service-desk',title:'多案湧入｜派出所服務分工',local:5,medical:false,source:'duty',
      story:'服務台同時有兩組民眾提出報案及求助，另一位民眾正在等待文件協助。你與值班同仁共 2 人在現場，需要向帶班人員回報忙碌情況。',
      facts:['本題在維持其他勤務後，另有可調用 5 人。','兩組報案各需一人接待，文件協助及進度聯繫各需一人。','保留一名機動人員，遇有急迫案件可協助接手。'],
      priority:['先把所有報案民眾請回，等不忙再受理','先辨識有無急迫危害，受理並回報需要支援的工作','只處理文件，其他報案不用記錄'],correct:1,
      tasks:[task('報案與求助受理','兩組民眾各需一人；先到場先受理一組急迫需求。',2,1),task('等待民眾與文件協助','一人協助等待民眾；先到場先做基本引導。',1,1),task('進度通報與聯繫','一人統整處理進度與後續派遣需求。',1,0)]},
    {id:'school-crossing',title:'放學時段｜校門周邊勤務',local:5,medical:false,source:'duty',
      story:'放學時段有兩處行人穿越點，接送車輛排隊回堵。學校窗口已在校門內協助，你與同仁共 2 人先抵達校門周邊。',
      facts:['本題可調用 5 人，兩處行人穿越點各需一人。','接送車流引導、學校窗口聯繫各需一人。','保留一名機動人員，必要時協助臨時求助或改道。'],
      priority:['先維護行人及學生動線安全，回報車流與支援需求','只求車輛快速通過，讓學生自己穿越','全部人員離開現場，等車潮自行消散'],correct:0,
      tasks:[task('行人穿越點協助','兩處穿越點各需一人；先到場先處理最繁忙的一處。',2,1),task('接送車流引導','一人引導接送車輛，避免危險停等。',1,1),task('學校窗口與通報','一人保持與學校及勤務中心的聯繫。',1,0)]}
  ];
  const autoKey = 'twPoliceWorkforceAutoNextV1';
  let run = null, cursor = 0, timer = null, focusBefore = null, overflowBefore = '';
  const node = (tag,text,className) => {const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  const total = values => values.reduce((sum,n)=>sum+n,0);
  const isOfficer = () => run.context.mode === 'officer';
  const capacity = () => isOfficer() ? 2 : run.scenario.local + run.support;
  const neededSupport = () => Math.max(0,total(run.scenario.tasks.map(t=>t.minimum)) - 2);
  const clearTimer = () => {if(timer!==null)clearTimeout(timer);timer=null;};
  try {$('workforceAutoNext').checked=localStorage.getItem(autoKey)!=='false';} catch (_) {}

  function refresh() {
    const context=game.context();
    for(const entry of document.querySelectorAll('[data-workforce-entry]')) {
      const location=entry.dataset.workforceEntry;
      const title=entry.querySelector('[data-workforce-entry-title]'),desc=entry.querySelector('[data-workforce-entry-description]');
      if(context.mode==='officer') {
        title.textContent='現場分工與支援回報';
        desc.textContent='安排自己與同仁的 2 人先到場分工，判斷應回報多少支援。';
      } else if(context.mode==='command') {
        title.textContent='案件指揮｜人力配置與派遣規劃';
        desc.textContent='依各組工作量安排人數、申請支援並保留機動警力。';
      } else {
        title.textContent='學堂情境｜人力配置練習';
        desc.textContent='用案件練習人力與處置順序，完成分析後不推進遊戲日期。';
      }
      const button=entry.querySelector('[data-workforce-open]');
      button.disabled=location!=='academy'&&!context.employed;
    }
    if(run&&run.context.key!==context.key) {
      clearTimer();run=null;close();
      $('workforceScenarioStatus').textContent='角色或職位已變更，請重新開啟情境演練。';
    }
  }
  function open(event) {
    const entry=event?.currentTarget?.closest('[data-workforce-entry]');
    const context=game.context();
    if(entry?.dataset.workforceEntry!=='academy'&&!context.employed)return;
    if(entry?.dataset.workforceEntry==='command'&&context.mode!=='command')return;
    if(dialog.open)return;
    focusBefore=document.activeElement;overflowBefore=document.body.style.overflow;
    document.body.style.overflow='hidden';
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    nextCase();
  }
  function close() {
    clearTimer();run=null;
    if(typeof dialog.close==='function'&&dialog.open)dialog.close();else dialog.removeAttribute('open');
    document.body.style.overflow=overflowBefore;
    if(focusBefore?.isConnected)focusBefore.focus();
  }
  function nextCase() {
    clearTimer();
    const previous=run?.report||null;
    run={scenario:cases[cursor++%cases.length],context:game.context(),counts:[],support:0,priority:-1,notify:false,medical:false,answered:false,report:null};
    run.counts=run.scenario.tasks.map(()=>0);if(!isOfficer())run.counts.push(0);
    showCase();
    if(previous){renderAnalysis(previous,true);$('workforceScenarioStatus').textContent='新案件已準備好；上一案分析保留在下方。';}
  }
  function stepper(label,type,index) {
    const box=node('div',undefined,'wf-stepper');
    for(const delta of [-1,1]) {
      if(delta===1){const value=node('output','0');value.dataset.workforceCount=type==='support'?'support':String(index);value.setAttribute('aria-label',label+'人數');box.append(value);}
      const button=node('button',delta===1?'+':'−');button.type='button';button.dataset.workforceStep=String(delta);
      if(type==='support')button.dataset.workforceSupport='true';else button.dataset.workforceTask=String(index);
      button.setAttribute('aria-label',(delta===1?'增加':'減少')+label+'人數');box.append(button);
    }
    return box;
  }
  function showCase() {
    const c=run.scenario,officer=isOfficer();
    $('workforceScenarioRole').textContent=run.context.mode==='training'?'學堂模擬 · 不影響任用':run.context.role+(officer?' · 現場回報':' · 指揮配置');
    $('workforceScenarioTitle').textContent=officer?'現場分工與支援回報':'案件人力配置';
    $('workforceCaseNumber').textContent='情境 '+((cursor-1)%cases.length+1)+' / '+cases.length+' · 人數與工作量為題目設定';
    $('workforceCaseTitle').textContent=c.title;$('workforceCaseStory').textContent=c.story;
    $('workforceCaseFacts').replaceChildren(...c.facts.map(f=>node('li',f)));
    $('workforceModeNote').textContent=officer?'本題你是先到場警員，只安排現場 2 人。增援為向勤務中心提出的需求，核定、到場與完整派遣由主管協調。':'本題規劃支援到場後的完整分工，尚未到場的支援不可當作已到場警力。先到場人員仍需優先處理急迫風險。';
    $('workforcePriorityChoices').replaceChildren(...c.priority.map((text,index)=>{
      const label=node('label'),input=node('input');input.type='radio';input.name='workforce-priority';input.value=String(index);input.dataset.workforcePriority='true';label.append(input,node('span',text));return label;
    }));
    const resources=officer?[['先到場警員','2 人'],['完整處理工作',total(c.tasks.map(t=>t.minimum))+' 人'],['申請支援上限','6 人']]:[['可調用本班警力',c.local+' 人'],['可申請支援上限','4 人'],['機動備援目標','1 人']];
    $('workforceResources').replaceChildren(...resources.map(([label,value])=>{const box=node('div');box.append(node('span',label),node('b',value));return box;}));
    $('workforceSupportControl').replaceChildren();
    const support=node('div',undefined,'wf-task'),supportText=node('div');supportText.append(node('strong',officer?'申請增援人數':'支援到場後納入規劃的人數'),node('p',officer?'需求送交勤務中心，這些人尚未到場，不能先分配進你的 2 人分工。':'支援需先提出需求並等待核定，本題只模擬到場後的配置。'));support.append(supportText,stepper('支援','support'));$('workforceSupportControl').append(support);
    $('workforceTaskControls').replaceChildren();
    const tasks=c.tasks.map(t=>({label:t.label,hint:t.hint}));
    if(!officer)tasks.push({label:'機動備援',hint:'保留一人，避免下一件急迫案件無人可用。'});
    tasks.forEach((t,index)=>{const row=node('div',undefined,'wf-task'),text=node('div');text.append(node('strong',t.label),node('p',t.hint));row.append(text,stepper(t.label,'task',index));$('workforceTaskControls').append(row);});
    $('workforceNotify').checked=false;$('workforceMedical').checked=false;$('workforceMedicalLabel').hidden=!c.medical;
    $('workforceNext').hidden=true;$('workforceSubmit').hidden=false;$('workforceAnalysis').hidden=true;
    $('workforceScenarioStatus').textContent='先選處置順序，再用 ＋／− 安排人數並勾選通報。';
    $('workforceSourceLinks').replaceChildren(...[sources.duty,...(c.source==='duty'?[]:[sources[c.source]])].map(([title,url])=>{
      const a=node('a',title+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
    }));
    updateInputs();$('workforceCaseTitle').focus();
  }
  function updateInputs() {
    if(!run)return;
    const assigned=total(run.counts),limit=capacity();
    for(const output of dialog.querySelectorAll('[data-workforce-count]'))output.textContent=output.dataset.workforceCount==='support'?String(run.support):String(run.counts[Number(output.dataset.workforceCount)]);
    for(const button of dialog.querySelectorAll('[data-workforce-step]')) {
      const delta=Number(button.dataset.workforceStep),support=button.dataset.workforceSupport==='true';
      const value=support?run.support:run.counts[Number(button.dataset.workforceTask)];
      button.disabled=run.answered||(delta<0?value===0:support?value>=(isOfficer()?6:4):assigned>=limit);
    }
    for(const input of dialog.querySelectorAll('#workforceScenarioForm input'))input.disabled=run.answered;
    $('workforceBudget').textContent=isOfficer()?'現場已分工 '+assigned+' / 2 人 · 尚有 '+Math.max(0,2-assigned)+' 人未安排 · 已申請支援 '+run.support+' 人（未到場）':'已配置 '+assigned+' / '+limit+' 人 · 本班 '+run.scenario.local+' + 規劃支援 '+run.support+' · 尚餘 '+Math.max(0,limit-assigned)+' 人未安排';
    $('workforceBudget').classList.toggle('over-budget',assigned>limit);
    $('workforceSubmit').disabled=run.answered||assigned>limit;
    if(assigned>limit)$('workforceScenarioStatus').textContent='配置超過可用人數，請減少分工人數或調整支援需求。';
  }
  function evaluate() {
    const c=run.scenario,officer=isOfficer(),targets=c.tasks.map(t=>officer?t.initial:t.minimum);
    const covered=total(targets.map((target,i)=>Math.min(target,run.counts[i]))),required=total(targets);
    const issues=[],notes=[];let score=Math.round(covered/required*(officer?40:50));
    targets.forEach((target,i)=>{if(run.counts[i]<target)issues.push(c.tasks[i].label+'少 '+(target-run.counts[i])+' 人；'+c.tasks[i].hint);});
    if(run.priority===c.correct)score+=officer?25:20;else issues.push('優先順序需調整：'+c.priority[c.correct]+'。');
    if(run.notify)score+=c.medical?10:15;else issues.push('尚未勾選回報勤務指揮中心，支援需求與分工需同步通報。');
    if(c.medical){if(run.medical)score+=5;else issues.push('本案有傷者或身體不適者，尚未聯繫救護。');}
    if(officer) {
      const need=neededSupport();score+=need?Math.round(Math.min(run.support,need)/need*20):20;
      if(run.support<need)issues.push('完整工作需 '+total(c.tasks.map(t=>t.minimum))+' 人，已到場 2 人，尚須申請至少 '+need+' 人支援；目前少 '+(need-run.support)+' 人。');
      else notes.push('增援需求涵蓋後續工作；仍需等待勤務中心核定與到場。');
      if(run.support>need+1){score-=5;notes.push('申請支援超過本題工作缺口，可再說明額外需求或減少占用。');}
    } else {
      if(run.counts.at(-1)>=1)score+=10;else notes.push('尚未安排機動備援；可把未分配警力列為備援，或申請支援。');
      const efficient=total(run.counts)<=total(targets)+2&&run.support<=Math.max(0,total(targets)+1-c.local)+1;
      if(efficient)score+=5;else notes.push('部分人力超過本題需求，調整後可保留更多警力處理其他案件。');
    }
    score=Math.max(0,Math.min(100,score));
    return {id:c.id,title:c.title,contextKey:run.context.key,mode:run.context.mode,score,issues,notes,
      status:issues.length?'需要調整':score>=85?'配置可行':'配置尚可',
      rows:c.tasks.map((t,i)=>({label:t.label,actual:run.counts[i],target:targets[i],full:t.minimum})),
      reserve:officer?null:run.counts.at(-1),support:run.support,referenceSupport:officer?neededSupport():Math.max(0,total(c.tasks.map(t=>t.minimum))+1-c.local),
      priority:c.priority[c.correct],medical:c.medical,knowledge:0};
  }
  function renderAnalysis(report,previous=false) {
    const box=$('workforceAnalysis');box.hidden=false;box.replaceChildren();
    box.append(node('h3',(previous?'上一案分析｜':'配置分析｜')+report.title));
    const summary=node('p');summary.append(node('span',report.score+' 分','wf-score'),node('span',' · '+report.status));box.append(summary);
    box.append(node('p',report.mode==='officer'?'檢視先到場 2 人的分工與後續增援需求。支援申請不等於人員已到場。':'依本題同時進行的工作量、支援需求與備援安排評分。人數足夠之外，也要維持安全與通聯。'));
    const table=node('table'),thead=node('thead'),head=node('tr');
    for(const title of ['工作','你的安排','本題最低需求'])head.append(node('th',title));thead.append(head);table.append(thead);
    const body=node('tbody');for(const row of report.rows){const tr=node('tr');tr.append(node('td',row.label),node('td',row.actual+' 人'),node('td',row.target+' 人'+(report.mode==='officer'?'（初期）':'')));body.append(tr);}
    if(report.reserve!==null){const tr=node('tr');tr.append(node('td','機動備援'),node('td',report.reserve+' 人'),node('td','1 人'));body.append(tr);}table.append(body);box.append(table);
    if(report.issues.length){box.append(node('h4','需要調整的地方'));const list=node('ul');list.append(...report.issues.map(t=>node('li',t)));box.append(list);}
    if(report.notes.length){const list=node('ul');list.append(...report.notes.map(t=>node('li',t)));box.append(list);}
    const details=node('details'),title=node('summary','參考配置與處置順序');details.append(title,node('p','優先處置：'+report.priority),node('p','支援參考：'+report.referenceSupport+' 人；你提出 '+report.support+' 人。這是本題需求推算，可有其他可行配置。'));
    if(report.mode==='officer')details.append(node('p','支援到場後的完整工作需求：'+report.rows.map(r=>r.label+' '+r.full+' 人').join('、')+'。'));
    box.append(details,node('p',report.knowledge?'知識 +'+report.knowledge+'。同一情境及模式達標只獎勵一次；本次練習不增加 XP、不推進日期。':'本次配置已記錄；同一情境及模式達標只獎勵一次，練習不增加 XP、不推進日期。'));
  }
  function submit(event) {
    event.preventDefault();if(!run||run.answered)return;
    if(game.context().key!==run.context.key){refresh();return;}
    if(run.priority<0){$('workforceScenarioStatus').textContent='請先選擇優先處置，再送出人力配置。';return;}
    if(total(run.counts)>capacity()){$('workforceScenarioStatus').textContent='配置超過可用人數，請先調整。';return;}
    const report=evaluate(),submittedRun=run;run.answered=true;
    try {report.knowledge=game.record(report).knowledge;} catch (_) {run.answered=false;$('workforceScenarioStatus').textContent='情境記錄失敗，請重新開啟後再試。';return;}
    if(run!==submittedRun)return;
    run.report=report;updateInputs();renderAnalysis(report);
    $('workforceAnalysis').focus({preventScroll:true});$('workforceAnalysis').scrollIntoView({block:'start',behavior:'smooth'});
    $('workforceSubmit').hidden=true;$('workforceNext').hidden=false;
    $('workforceScenarioStatus').textContent=report.issues.length?'分析完成，請查看缺口與參考配置。':'分析完成，本次配置已涵蓋主要工作。';schedule();
  }
  function schedule() {clearTimer();if(run?.answered&&$('workforceAutoNext').checked){timer=setTimeout(()=>{timer=null;if(run?.answered&&dialog.open)nextCase();},6000);$('workforceScenarioStatus').textContent+=' 6 秒後自動換案。';}}
  dialog.addEventListener('click',event=>{
    const button=event.target.closest('[data-workforce-step]');
    if(!button||!run||run.answered||button.disabled)return;
    if(game.context().key!==run.context.key){refresh();return;}
    const delta=Number(button.dataset.workforceStep);
    if(button.dataset.workforceSupport==='true')run.support=Math.max(0,Math.min(isOfficer()?6:4,run.support+delta));
    else {const index=Number(button.dataset.workforceTask);run.counts[index]=Math.max(0,run.counts[index]+delta);}
    $('workforceScenarioStatus').textContent='配置調整後，送出即可查看人力與程序分析。';updateInputs();
  });
  $('workforceScenarioForm').addEventListener('change',event=>{
    if(!run||run.answered)return;
    if(event.target.dataset.workforcePriority)run.priority=Number(event.target.value);
    if(event.target.id==='workforceNotify')run.notify=event.target.checked;
    if(event.target.id==='workforceMedical')run.medical=event.target.checked;
  });
  $('workforceScenarioForm').addEventListener('submit',submit);
  $('workforceScenarioClose').onclick=close;$('workforceNext').onclick=()=>{if(run?.answered)nextCase();};
  $('workforceAutoNext').onchange=()=>{try{localStorage.setItem(autoKey,String($('workforceAutoNext').checked));}catch(_){}clearTimer();if(run?.answered)schedule();};
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  for(const button of document.querySelectorAll('[data-workforce-open]'))button.onclick=open;
  window.policeWorkforceScenarios=Object.freeze({refresh});refresh();
})();
