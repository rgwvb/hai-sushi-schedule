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
  load({});assert.equal(score(),54.8,'neutral stats should retain the existing base score');
  const base=score();
  load({quality:90,service:85});assert(score()>base+5,'existing good duty performance should count immediately after loading');
  assert(d.getElementById('officerQualificationBox').textContent.includes('勤務實績'));
  assert(d.getElementById('promotionScoreBox').textContent.includes('勤務實績'));
  const current=score();click('saveBtn');click('loadBtn');assert.equal(score(),current,'reload must not award the derived bonus a second time');

  load({});const beforeCommand=score(),xp=api.state().xp;
  click('nextCommandBtn');const best=d.querySelector('#commandChoices [data-cmd="0"]');click(best);
  assert(score()>beforeCommand,'good decisions should increase merit now, without waiting for the next commendation');
  assert.equal(api.state().service,52,'good decisions should record service results');
  assert.equal(api.state().xp,xp,'a command decision must not also award duty XP');
  assert(d.getElementById('commandResult').textContent.includes('資績 54.8 →'));
  const afterCommand=score(),service=api.state().service;click(best);
  assert.equal(score(),afterCommand);assert.equal(api.state().service,service,'duplicate click must not add another service result');
  assert.equal(api.state().position,'巡佐','performance gain must not automatically promote the player');
  click('promotionBtn');assert.equal(api.state().position,'巡佐');
  assert(d.getElementById('careerMsg').textContent.includes('警正官等資格'),'existing appointment qualification gates must remain');

  load({});const beforeDuty=score();click('nextDutyBtn');click(d.querySelector('#dutyChoices [data-advd="0"]'));
  assert(score()>beforeDuty,'good duty work should increase the merit score immediately');
  assert(d.getElementById('dutyResult').textContent.includes('資績 54.8 →'));

  load({quality:80,service:80,commandScore:80});const beforeBad=score();
  click('nextCommandBtn');click(d.querySelector('#commandChoices [data-cmd="2"]'));
  assert(score()<beforeBad,'a poor decision must not produce a performance bonus');
  assert.equal(api.state().service,79);

  load({quality:100,service:100,commandScore:100});const maximum=score();
  assert(maximum<=base+12,'performance contribution should have a bounded maximum');
  for(let i=0;i<12;i++){click('nextCommandBtn');click(d.querySelector('#commandChoices [data-cmd="0"]'));}
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
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PERFORMANCE_PROGRESS_OK immediate duty/decision merit, legacy benefit, bounded contribution, duplicate/reload guards, poor-decision penalties, unchanged qualification gates and practice separation');
}finally{w.close();}
