import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';
const raw=fs.readFileSync('index.html','utf8');
const main=[...raw.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>/\bid="standalone(?:BackendConfig|Backend|App|Systems)"/.test(m[1])).map(m=>m[2]).join('\n;\n');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...a)=>errors.push(a.join(' ')));
const dom=new JSDOM(raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document,timers=new Map();let timerId=0;
w.confirm=()=>true;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.setTimeout=(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;};w.clearTimeout=id=>timers.delete(id);
w.fetch=async()=>({ok:true,json:async()=>({meta:{divisionCount:0,stationCount:0},counties:{}})});
w.eval(main+'\n;'+fs.readFileSync('scripts/workforce_scenarios.js','utf8')+'\n;window.__performanceTest={state:()=>s,replace:value=>{s=Object.assign(NEW(),value);render();},refresh:()=>render()};');
for(let i=0;i<35;i++)await Promise.resolve();
const api=w.__performanceTest;
const click=id=>{const el=typeof id==='string'?d.getElementById(id):id;assert(el,'missing action');el.click();};
const baseline={created:true,name:'資績測試',route:'g4',passed:true,county:'臺北市',localAgency:'臺北市政府警察局',unit:'admin',unitName:'臺北市政府警察局勤務單位',assignmentType:'administration',position:'巡佐',rank:'巡佐',careerSequenceNo:10,officialRank:'警佐一階',careerStage:'basic_active',year:3,commend:52,merit:0,greatMerit:0,admonition:0,demerit:0,greatDemerit:0,discipline:96,quality:50,service:50,commandScore:50,appraisals:[{grade:'甲等',type:'年度考績',year:2012},{grade:'甲等',type:'年度考績',year:2011}],policeZhengQualified:false,officerEducationQualified:false,knowledge:0};
const load=extra=>{api.replace({...baseline,...extra});w.Math.random=()=>.99;};
const score=()=>api.state().promotionScore;
try{
  load({});assert.equal(score(),58.8,'two recorded annual A grades should add four points of appraisal performance');
  const base=score();
  load({quality:90,service:85});assert(score()>base+5,'existing good duty performance should count immediately after loading');
  assert(d.getElementById('officerQualificationBox').textContent.includes('勤務實績'));
  assert(d.getElementById('promotionScoreBox').textContent.includes('勤務實績'));
  const current=score();click('saveBtn');click('loadBtn');assert.equal(score(),current,'reload must not award the derived bonus a second time');

  load({});const beforeCommand=score(),xp=api.state().xp;
  click('nextCommandBtn');const best=d.querySelector('#commandChoices [data-cmd="0"]');click(best);
  assert(score()>beforeCommand,'good decisions should increase merit now, without waiting for the next commendation');
  assert.equal(api.state().service,52,'good decisions should record service results');
  assert.equal(api.state().outcomePerformance,.2,'a resolved good decision should earn independent outcome credit');
  assert.equal(api.state().xp,xp,'a command decision must not also award duty XP');
  assert(d.getElementById('commandResult').textContent.includes('資績 '+beforeCommand.toFixed(1)+' →'));
  const afterCommand=score(),service=api.state().service;click(best);
  assert.equal(score(),afterCommand);assert.equal(api.state().service,service,'duplicate click must not add another service result');
  assert.equal(api.state().outcomePerformance,.2,'duplicate click must not earn another outcome reward');
  assert.equal(api.state().position,'巡佐','performance gain must not automatically promote the player');
  click('promotionBtn');assert.equal(api.state().position,'巡佐');
  assert(d.getElementById('careerMsg').textContent.includes('警正官等資格'),'existing appointment qualification gates must remain');

  load({});const beforeDuty=score();click('nextDutyBtn');click(d.querySelector('#dutyChoices [data-advd="0"]'));
  assert(score()>beforeDuty,'good duty work should increase the merit score immediately');
  assert(d.getElementById('dutyResult').textContent.includes('資績 '+beforeDuty.toFixed(1)+' →'));

  load({quality:80,service:80,commandScore:80});const beforeBad=score();
  click('nextCommandBtn');click(d.querySelector('#commandChoices [data-cmd="2"]'));
  assert(score()<beforeBad,'a poor decision must not produce a performance bonus');
  assert.equal(api.state().service,79);
  assert.equal(api.state().outcomePerformance,0,'a poor decision must not earn outcome credit');

  // Reproduce the reported 72.1 -> 72.1 failure with all rating stats already capped.
  const capped={quality:100,service:100,commandScore:100,morale:100,commend:45,goodNotes:0,appraisals:[{type:'年度考績',grade:'甲等',year:2013},{type:'年度考績',grade:'甲等',year:2012},{type:'年度考績',grade:'甲等',year:2011}]};
  load(capped);assert.equal(score(),72.1);click('nextCommandBtn');assert.equal(api.state().outcomePerformance,0,'merely opening a decision must not earn credit');
  const cappedChoice=d.querySelector('#commandChoices [data-cmd="0"]');click(cappedChoice);
  assert.equal(score(),72.3,'a correct decision should still increase merit when quality, service and command rating are capped');
  assert(d.getElementById('commandResult').textContent.includes('資績 72.1 → 72.3（+0.2）'));
  assert(d.getElementById('commandResult').textContent.includes('決策績效 +0.2'));
  assert(d.getElementById('commandResult').textContent.includes('主管評價 +0（目前 100／100，已達上限）'),'rating feedback should report the actual capped change');
  assert(d.getElementById('commandResult').textContent.includes('士氣 +0'),'morale feedback should not claim an increase above the cap');
  click(cappedChoice);assert.equal(score(),72.3);assert.equal(api.state().outcomePerformance,.2);
  click('saveBtn');click('loadBtn');assert.equal(score(),72.3);assert.equal(api.state().outcomePerformance,.2,'saved outcome credit must persist without a repeated award');
  assert(d.getElementById('promotionScoreBox').textContent.includes('勤務／決策成果 +0.2'));
  assert(d.getElementById('officerQualificationBox').textContent.includes('勤務／決策成果 +0.2'));
  assert(api.state().history.some(x=>x.title==='主管決策'&&x.detail.includes('決策績效 +0.2')));
  load(capped);click('nextCommandBtn');click(d.querySelector('#commandChoices [data-cmd="1"]'));
  assert.equal(api.state().outcomePerformance,.1,'an adequate decision should earn smaller outcome credit');
  load(capped);const cappedDutyBefore=score();click('nextDutyBtn');const cappedDutyChoice=d.querySelector('#dutyChoices [data-advd="0"]');click(cappedDutyChoice);
  assert(score()>cappedDutyBefore,'good field duty must still earn merit with capped stats');
  assert(api.state().outcomePerformance>=.1);assert(d.getElementById('dutyResult').textContent.includes('勤務績效 +'));
  const dutyOutcome=api.state().outcomePerformance;click(cappedDutyChoice);assert.equal(api.state().outcomePerformance,dutyOutcome);
  load(capped);click('nextCommandBtn');const retiredChoice=d.querySelector('#commandChoices [data-cmd="0"]');api.state().retired=true;click(retiredChoice);
  assert.equal(api.state().outcomePerformance,0,'a pending decision must not earn credit after retirement');

  load({quality:100,service:100,commandScore:100});const maximum=score();
  assert(maximum<=base+12,'performance contribution should have a bounded maximum');
  for(let i=0;i<12;i++){const prior=score();click('nextCommandBtn');click(d.querySelector('#commandChoices [data-cmd="0"]'));assert(score()-prior>=.2-1e-8,'each resolved good decision should earn credit even after many capped decisions');}
  assert.equal(api.state().outcomePerformance,2.4);
  assert.equal(api.state().quality,100);assert.equal(api.state().service,100);assert.equal(api.state().commandScore,100);
  // Further actual rewards may increase base merit; the performance contribution itself is bounded.
  assert(d.getElementById('promotionScoreBox').textContent.includes('勤務實績 +12.0'));
  load({discipline:0});assert(score()<base-9,'zero discipline must not be interpreted as perfect discipline');

  load({position:'警員',rank:'警員',careerSequenceNo:11,quality:100,service:100,commandScore:100});
  assert.equal(score(),base+10,'non-supervisors should not receive a supervisor-only contribution');

  // Academy staffing practice is learning, not another source of actual duty merit.
  load({});const beforePractice=score(),beforeDate=api.state().simDate;
  click(d.querySelector('[data-workforce-entry="academy"] [data-workforce-open]'));
  d.getElementById('workforceAutoNext').checked=false;
  d.querySelector('#workforcePriorityChoices input[value="0"]').click();
  const plus=(selector,n)=>{for(let i=0;i<n;i++)click(d.querySelector(selector));};
  plus('[data-workforce-support][data-workforce-step="1"]',1);
  [2,2,1,1,1].forEach((n,i)=>plus('[data-workforce-task="'+i+'"][data-workforce-step="1"]',n));
  click('workforceNotify');click('workforceMedical');click('workforceSubmit');
  assert.equal(score(),beforePractice,'practice should not farm actual duty performance');
  assert.equal(api.state().simDate,beforeDate,'practice should not advance game tenure');
  assert.equal(api.state().knowledge,2);

  // Appraisal rewards must be earned through settlement, never by previewing or reloading.
  const appraisalLoad=(extra={})=>{
    w.localStorage.clear();
    const date='2026-06-01T08:00:00',epoch=new w.Date(date).getTime();
    load({appraisals:[],dutyCount:4,lastAppraisalDutyCount:0,lastAppraisalYear:null,appraisalRounds:0,goodNotes:0,commend:0,quality:100,service:100,commandScore:100,discipline:100,rep:100,salary:50000,simDate:date,simEpoch:epoch,maxSimEpoch:epoch,...extra});
  };
  const settle=()=>d.getElementById('closeYearBtn').onclick();
  appraisalLoad({dutyCount:3});const beforePreview=score();
  assert(d.getElementById('closeYearBtn').disabled);
  assert(d.getElementById('appraisalBox').textContent.includes('預計 +1.0'));
  api.refresh();assert.equal(score(),beforePreview);settle();
  assert.equal(api.state().appraisals.length,0,'under-threshold appraisals must not award points');
  api.state().dutyCount=4;api.refresh();const beforeAppraisal=score(),dateBeforeAppraisal=api.state().simDate;
  click('closeYearBtn');
  assert.equal(api.state().appraisals[0].grade,'甲等');
  assert.equal(api.state().appraisals[0].type,'階段考績');
  assert(score()>beforeAppraisal,'the first good appraisal must increase merit rather than replace the neutral baseline with a lower score');
  assert.equal(api.state().simDate,dateBeforeAppraisal,'settlement must not advance tenure');
  const result=d.getElementById('appraisalBox').textContent;
  assert(result.includes('考績績效 +1.0'));
  assert(result.includes('資績 '+beforeAppraisal.toFixed(1)+' →'),'settlement feedback must survive the final render');
  const settledScore=score();settle();assert.equal(score(),settledScore);assert.equal(api.state().appraisals.length,1,'duplicate settlement must not award another appraisal');
  click('saveBtn');click('loadBtn');assert.equal(score(),settledScore);
  assert(d.getElementById('appraisalBox').textContent.includes('+1.0／6.0'));
  assert(api.state().history.some(x=>x.title==='階段考績'&&x.detail.includes('考績績效 +1.0')),'earned results should remain in the saved history');
  assert.equal(api.state().position,'巡佐','settlement must not auto-promote the player');

  appraisalLoad({quality:70,service:70,discipline:90,rep:60,commandScore:50});const beforeB=score();
  click('closeYearBtn');assert.equal(api.state().appraisals[0].grade,'乙等');assert(score()>beforeB);
  assert(d.getElementById('appraisalBox').textContent.includes('考績績效 +0.5'));
  appraisalLoad({quality:20,service:20,discipline:60,rep:20,commandScore:20});const beforeC=score();
  click('closeYearBtn');assert.equal(api.state().appraisals[0].grade,'丙等');assert(score()<beforeC);
  assert(d.getElementById('appraisalBox').textContent.includes('考績績效 +0.0'));

  const december='2026-12-01T08:00:00',decEpoch=new w.Date(december).getTime();
  appraisalLoad({dutyCount:0,simDate:december,simEpoch:decEpoch,maxSimEpoch:decEpoch});const cash=api.state().savings;
  click('closeYearBtn');assert.equal(api.state().appraisals[0].type,'年度考績');
  assert(d.getElementById('appraisalBox').textContent.includes('考績績效 +2.0'));
  assert.equal(api.state().savings,cash+50000,'the existing annual cash bonus must remain');
  const annualScore=score();settle();assert.equal(score(),annualScore);assert.equal(api.state().appraisals.length,1);
  appraisalLoad({dutyCount:0,quality:70,service:70,discipline:90,rep:60,commandScore:50,simDate:december,simEpoch:decEpoch,maxSimEpoch:decEpoch});
  click('closeYearBtn');assert.equal(api.state().appraisals[0].grade,'乙等');
  assert(d.getElementById('appraisalBox').textContent.includes('考績績效 +1.0'));

  appraisalLoad({appraisals:Array.from({length:5},(_,i)=>({type:'階段考績',grade:'甲等',round:i+1}))});
  click('closeYearBtn');assert(d.getElementById('appraisalBox').textContent.includes('考績績效 +1.0（累積上限 6 分）'));
  api.state().dutyCount+=4;api.refresh();click('closeYearBtn');
  assert(d.getElementById('appraisalBox').textContent.includes('考績績效 +0.0（累積上限 6 分）'));
  assert(d.getElementById('promotionScoreBox').textContent.includes('考績績效 +6.0／6.0'));
  assert(d.getElementById('officerQualificationBox').textContent.includes('考績績效 +6.0／6.0'));
  appraisalLoad({joinDate:'2015-06-01T08:00:00',seq10Days:1095,commend:52,fit:100,appraisals:Array.from({length:6},()=>({type:'階段考績',grade:'甲等'}))});
  assert(d.getElementById('sergeantClass1Btn').disabled,'stage appraisals must not replace annual qualification requirements');
  api.state().appraisals.unshift({type:'年度考績',grade:'甲等',year:2025},{type:'年度考績',grade:'乙等',year:2024});api.refresh();
  assert(!d.getElementById('sergeantClass1Btn').disabled,'eligible annual results should still satisfy the existing training qualification');
  for(const invalid of [{retired:true},{unit:'',position:'考生'}]){
    appraisalLoad(invalid);const blockedScore=score();settle();
    assert.equal(api.state().appraisals.length,0);assert.equal(score(),blockedScore);
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PERFORMANCE_PROGRESS_OK capped-stat 72.1 -> 72.3 regression, continued duty/decision credit, actual capped feedback, appraisal rewards, preview/duplicate/reload/retirement guards, unchanged tenure/cash/qualification gates and practice separation');
}finally{w.close();}
