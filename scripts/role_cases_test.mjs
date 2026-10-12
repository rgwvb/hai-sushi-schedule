import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';
const raw=fs.readFileSync('index.html','utf8');
const scripts=[...raw.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>/\bid="standalone(?:BackendConfig|Backend|App|Systems)"/.test(m[1])).map(m=>m[2]).join('\n;\n');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...a)=>errors.push(a.join(' ')));
const dom=new JSDOM(raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document,timers=new Map();let timerId=0,fetchCount=0;
w.confirm=()=>true;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.setTimeout=(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;};w.clearTimeout=id=>timers.delete(id);
w.fetch=async()=>{fetchCount++;return {ok:true,json:async()=>({meta:{divisionCount:0,stationCount:0},counties:{}})}};
w.eval(scripts+'\n;'+fs.readFileSync('scripts/workforce_scenarios.js','utf8')+'\n;window.__roleCasesTest={state:()=>s,replace:value=>{s=Object.assign(NEW(),value);render();}};');
const settle=async()=>{for(let i=0;i<35;i++)await Promise.resolve();};await settle();
const api=w.__roleCasesTest;
const click=id=>{const el=typeof id==='string'?d.getElementById(id):id;assert(el,'missing action');el.click();};
const baseline={created:true,name:'職務測試',route:'g4',passed:true,county:'臺北市',localAgency:'臺北市政府警察局',unit:'admin',unitName:'臺北市政府警察局局本部',position:'科長',rank:'科長',officialRank:'警正一階',careerSequenceNo:4,careerStage:'basic_active',knowledge:0,unitSelectionOpen:false};
const roles=[
 ['patrol','警員','station','station','臺北市政府警察局某分局某派出所',11],
 ['station_lead','巡佐兼副所長','station','station_command','臺北市政府警察局某分局某派出所',10],
 ['precinct','分局長','admin','administration','臺北市政府警察局某分局',4],
 ['bureau','局長','admin','administration','臺北市政府警察局局本部',3],
 ['npa','署長','central','central_command','內政部警政署',0],
 ['criminal','偵查隊長','detective','detective','臺北市政府警察局偵查隊',6],
 ['traffic','交通組長','admin','traffic_office','臺北市政府警察局交通組',6],
 ['highway','大隊長','central','central_special','內政部警政署國道公路警察局大隊',5],
 ['rail','局長','central','central_special','內政部警政署鐵路警察局',3],
 ['airport','局長','central','central_special','內政部警政署航空警察局',2],
 ['security','中隊長','security','guard','內政部警政署保安警察總隊',7],
 ['dispatch','主任','admin','command_center','臺北市政府警察局勤務指揮中心',6],
 ['inspection','督察長','admin','inspection','臺北市政府警察局局本部',4],
 ['education','校長','central','central_school','中央警察大學',0],
 ['staff','警務正','admin','administration','臺北市政府警察局行政科',6],
 ['prevention','防治組長','admin','prevention','臺北市政府警察局某分局防治組',6],
 ['civil','民防組長','admin','civil_defense','臺北市政府警察局某分局民防組',6],
 ['protection','保防組長','admin','security_affairs','臺北市政府警察局某分局保防組',6]
];
function loadRole(spec,extra={}){const [,position,unit,assignmentType,unitName,seq]=spec;api.replace({...baseline,position,rank:position,unit,assignmentType,unitName,careerSequenceNo:seq,...extra});w.Math.random=()=>.99;}
function openPractice(){click(d.querySelector('[data-workforce-entry="academy"] [data-workforce-open]'));assert(d.getElementById('workforceScenarioDialog').open);d.getElementById('workforceAutoNext').checked=false;}
function plus(selector,n){for(let i=0;i<n;i++)click(d.querySelector(selector));}
try{
  for(const spec of roles){
    loadRole(spec);const context=w.policeScenarioGame.context();
    assert.equal(context.profile.id,spec[0],spec[1]+' got wrong unit topic');
    const nextFetch=fetchCount;
    if(spec[0]==='patrol'){assert.equal(context.mode,'officer');assert.equal(context.workforceCases.length,0);continue;}
    if(spec[0]==='staff'){assert.equal(context.mode,'staff');assert(d.getElementById('commandContent').style.display==='none');}
    else assert.equal(context.mode,'command',spec[1]+' should have command mode');
    const seen=[];
    for(let n=0;n<5;n++){
      click(context.mode==='command'?'nextCommandBtn':'nextDutyBtn');
      const box=d.getElementById(context.mode==='command'?'commandCase':'dutyCase');
      assert.equal(box.dataset.roleProfile,spec[0]);
      const title=box.querySelector('b').textContent;
      assert(n===0||title!==seen.at(-1),'consecutive repeat for '+spec[1]);seen.push(title);
    }
    assert.equal(new Set(seen.slice(0,3)).size,3,'first cycle should contain all three distinct cases');
    if(spec[0]!=='station_lead'){
      const actualTitle=d.getElementById(context.mode==='command'?'commandCase':'dutyCase').textContent;
      assert(!actualTitle.includes('值班受理詐騙')&&!actualTitle.includes('校園周邊守望'),'specialized role got patrol task');
      assert.equal(context.workforceCases.length,3);
      openPractice();
      for(let n=0;n<3;n++){
        const c=w.policeScenarioGame.context().workforceCases[n];
        assert.equal(d.getElementById('workforceCaseTitle').textContent,c.title);
        assert(d.getElementById('workforceModeNote').textContent.includes(context.profile.authority));
        const correctLabel=[...d.querySelectorAll('#workforcePriorityChoices label')].find(el=>el.textContent===c.priority[c.correct]);
        assert(correctLabel,'correct priority missing after shuffling');correctLabel.querySelector('input').click();
        plus('[data-workforce-support][data-workforce-step="1"]',1);
        c.tasks.forEach((t,i)=>plus('[data-workforce-task="'+i+'"][data-workforce-step="1"]',t.minimum));
        plus('[data-workforce-task="4"][data-workforce-step="1"]',1);
        click('workforceNotify');
        click('workforceSubmit');
        assert(d.getElementById('workforceAnalysis').textContent.includes('100 分'),spec[1]+' has infeasible staffing case');
        assert(d.getElementById('workforceAnalysis').textContent.includes('工作備援'));
        assert(d.querySelector('#workforceSourceLinks a'));
        if(n<2)click('workforceNext');
      }
      click('workforceScenarioClose');
      assert.equal(api.state().knowledge,6,'practice rewards should use each scenario once');
    }
    assert.equal(fetchCount,nextFetch,'role cases should work without network loading');
  }
  // Non-supervisor specialists execute their own work and cannot allocate an entire unit.
  for(const specialist of [
    ['traffic','警員','traffic','traffic','臺北市政府警察局交通警察大隊',11],
    ['highway','警員','central','central_special','內政部警政署國道公路警察局',11],
    ['rail','警員','central','central_special','內政部警政署鐵路警察局',11],
    ['airport','警員','central','central_special','內政部警政署航空警察局',11],
    ['criminal','偵查佐','detective','detective','臺北市政府警察局偵查隊',10],
    ['security','警員','security','guard','內政部警政署保安警察總隊',11]
  ]){
    loadRole(specialist);const context=w.policeScenarioGame.context();
    assert.equal(context.profile.id,specialist[0]);assert.equal(context.mode,'officer');
    click('nextDutyBtn');assert.equal(d.getElementById('dutyCase').dataset.roleProfile,specialist[0]);
    assert.equal(d.getElementById('commandContent').style.display,'none');
    openPractice();
    assert.equal(d.querySelectorAll('[data-workforce-task][data-workforce-step="1"]').length,4);
    plus('[data-workforce-task="0"][data-workforce-step="1"]',1);
    plus('[data-workforce-task="1"][data-workforce-step="1"]',1);
    assert(d.querySelector('[data-workforce-task="2"][data-workforce-step="1"]').disabled);
    assert(d.getElementById('workforceModeNote').textContent.includes('2 人'));
    click('workforceScenarioClose');
  }
  // Actual office wins over obsolete unit fields after promotion.
  loadRole(roles[3],{unit:'station',assignmentType:'station',unitName:'臺北市政府警察局某分局某派出所'});
  assert.equal(w.policeScenarioGame.context().profile.id,'bureau');click('nextDutyBtn');
  assert(d.getElementById('dutyCase').textContent.includes('全局')||d.getElementById('dutyCase').textContent.includes('政策')||d.getElementById('dutyCase').textContent.includes('資源'));
  loadRole(roles[3],{position:'副局長',rank:'副局長'});click('nextCommandBtn');
  assert(d.getElementById('commandCase').textContent.includes('正主管'));
  assert(d.getElementById('positionDescription').textContent.includes('呈報核定'));
  // A different assignment with the same title/unit invalidates unanswered work.
  loadRole(roles[14],{position:'巡官',rank:'巡官',careerSequenceNo:9});click('nextDutyBtn');openPractice();
  assert(d.getElementById('workforceScenarioDialog').open);
  Object.assign(api.state(),{assignmentType:'prevention'});click('saveBtn');click('loadBtn');
  assert(!d.getElementById('workforceScenarioDialog').open,'assignment change should close stale practice');
  assert(!d.querySelector('#dutyChoices [data-advd]'),'old office choices should clear after assignment change');
  click('nextDutyBtn');assert.equal(d.getElementById('dutyCase').dataset.roleProfile,'prevention');
  // Answering a detached control after a role change cannot score or spawn a next case.
  loadRole(roles[3]);click('nextCommandBtn');const oldButton=d.querySelector('#commandChoices [data-cmd]'),before=api.state().commandScore;
  Object.assign(api.state(),{position:'警員',rank:'警員',careerSequenceNo:11});oldButton.click();
  assert.equal(api.state().commandScore,before);
  assert(!d.querySelector('#commandChoices [data-cmd]'));
  // A late shared-law response cannot resurrect a prior job's question.
  loadRole(roles[3]);w.Math.random=()=>0;let resolveOld;
  w.policeHistoricalQuestions={next:()=>new Promise(resolve=>{resolveOld=resolve;}),record:()=>{}};
  click('nextCommandBtn');await settle();assert(resolveOld);
  Object.assign(api.state(),{position:'警務正',rank:'警務正',careerSequenceNo:6,unit:'admin',assignmentType:'prevention'});
  click('saveBtn');w.Math.random=()=>.99;click('nextDutyBtn');
  const currentDuty=d.getElementById('dutyCase').textContent;
  resolveOld(['過期局長題目',['甲','乙','丙','丁'],0,'共同法規','解析','','']);await settle();
  assert.equal(d.getElementById('dutyCase').textContent,currentDuty);
  assert(!d.getElementById('commandCase').textContent.includes('過期局長題目'));
  assert(!d.querySelector('#commandChoices [data-cmdquiz]'));
  // Shared legal questions remain available and preserve their provenance.
  loadRole(roles[3]);w.Math.random=()=>0;
  let requested=0;w.policeHistoricalQuestions={next:async()=>{requested++;return ['共同法規題',['甲','乙','丙','丁'],0,'憲法','官方題解','https://wwwq.moex.gov.tw/','https://wwwq.moex.gov.tw/'];},record:()=>{}};
  click('nextCommandBtn');await settle();
  assert.equal(requested,1);assert.equal(d.querySelectorAll('#commandChoices [data-cmdquiz]').length,4);
  click(d.querySelector('#commandChoices [data-cmdquiz="0"]'));
  assert(d.getElementById('commandResult').querySelector('a'));
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('ROLE_CASES_OK 18 topics, authority levels, 51 distinct decisions, duty routing, 48 feasible staffing cases, shuffled choices, nonrepeat cycles, stale-role cancellation, saved progress and shared legal questions');
}finally{w.close();}
