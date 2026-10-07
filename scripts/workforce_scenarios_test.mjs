import fs from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const raw=fs.readFileSync('index.html','utf8');
const main=[...raw.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>/\bid="standalone(?:BackendConfig|Backend|App|Systems)"/.test(m[1])).map(m=>m[2]).join('\n;\n');
const module=fs.readFileSync('scripts/workforce_scenarios.js','utf8');
const html=raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const settle=async()=>{for(let i=0;i<35;i++)await Promise.resolve();};
function setup(mode='training') {
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...a)=>errors.push(a.map(String).join(' ')));
  const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window,d=w.document,timers=new Map();let timerId=0;
  w.confirm=()=>true;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.setTimeout=(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;};w.clearTimeout=id=>timers.delete(id);
  let requests=0;w.fetch=async()=>{requests++;return {ok:true,json:async()=>({meta:{divisionCount:0,stationCount:0},counties:{}})};};
  if(mode!=='training')w.localStorage.setItem('twPoliceCareerSaveV1',JSON.stringify({created:true,name:'測試角色',passed:true,route:'tpa',county:'臺北市',localAgency:'臺北市政府警察局',precinct:'中正第一分局',stationName:'忠孝西路派出所',unit:'station',unitName:'臺北市政府警察局中正第一分局忠孝西路派出所',assignmentType:'station',position:mode==='command'?'巡官':'警員',rank:mode==='command'?'巡官':'警員',careerSequenceNo:mode==='command'?9:11,careerStage:'basic_active',unitSelectionOpen:false,knowledge:0}));
  w.eval(main+'\n;\n'+module+'\n;window.__workforceState=()=>s;');
  const state=()=>w.__workforceState();
  const click=target=>{const el=typeof target==='string'?d.getElementById(target):target;assert(el,'missing target');el.click();};
  const change=(id,value)=>{const el=d.getElementById(id);el.checked=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
  const step=(selector,n=1)=>{for(let i=0;i<n;i++)click(d.querySelector(selector));};
  const support=n=>step('[data-workforce-support][data-workforce-step="1"]',n);
  const assign=(index,n)=>step('[data-workforce-task="'+index+'"][data-workforce-step="1"]',n);
  const priority=index=>{const el=d.querySelector('[data-workforce-priority][value="'+index+'"]');el.checked=true;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
  const open=()=>click(d.querySelector('[data-workforce-entry="academy"] [data-workforce-open]'));
  const analyze=()=>click('workforceSubmit');
  return {w,d,errors,timers,state,click,change,support,assign,priority,open,analyze,requests:()=>requests};
}

// Full planning: feasible staffing, budget enforcement, all cases and reward bounds.
const planning=setup('command');await settle();
try {
  const {d,w,state,timers,click,change,support,assign,priority,open,analyze}=planning;
  const startClock=state().simEpoch,startXP=state().xp,startKnowledge=state().knowledge;
  const requestCount=planning.requests();open();
  assert(d.getElementById('workforceScenarioDialog').open,'command scenario should open');
  assert(d.getElementById('workforceScenarioRole').textContent.includes('指揮配置'),'command role label missing');
  assert(d.querySelectorAll('[data-workforce-task][data-workforce-step="1"]').length===5,'commander should allocate four jobs plus reserve');
  assert(planning.requests()===requestCount,'scenarios should not trigger any fetch');
  analyze();assert(d.getElementById('workforceScenarioStatus').textContent.includes('請先選擇'),'missing priority must be explained');
  assert(!state().scenarioPractice,'incomplete submission must not score');
  support(1);[2,2,1,1,1].forEach((n,i)=>assign(i,n));
  assert(d.getElementById('workforceBudget').textContent.includes('7 / 7'),'full staffing budget incorrect');
  assert(d.querySelector('[data-workforce-task="0"][data-workforce-step="1"]').disabled,'cannot assign more people than available');
  click(d.querySelector('[data-workforce-support][data-workforce-step="-1"]'));
  assert(d.getElementById('workforceSubmit').disabled,'reducing support must block an over-budget plan');
  analyze();assert(!state().scenarioPractice,'over-budget plan should not score');
  support(1);priority(0);change('workforceNotify',true);change('workforceMedical',true);analyze();analyze();
  assert(d.getElementById('workforceAnalysis').textContent.includes('100 分'),'complete collision plan should score 100');
  assert(state().scenarioPractice['collision|command'].attempts===1,'duplicate submission should count once');
  assert(state().knowledge===startKnowledge+2,'first successful practice should award knowledge once');
  assert(d.activeElement===d.getElementById('workforceAnalysis'),'analysis should receive focus');
  assert(d.querySelectorAll('#workforceSourceLinks a').length===2,'case and legal source links missing');
  assert([...timers.values()].some(t=>t.delay===6000),'auto next should be scheduled');
  change('workforceAutoNext',false);assert(![...timers.values()].some(t=>t.delay===6000),'turning auto off should cancel timer');
  click('workforceNext');
  assert(d.getElementById('workforceCaseTitle').textContent.includes('走失兒童'),'next case should rotate');
  assert(d.getElementById('workforceAnalysis').textContent.includes('上一案分析')&&d.getElementById('workforceAnalysis').textContent.includes('交通事故'),'previous report should remain readable');
  assert(!d.querySelector('[data-workforce-priority]:checked')&&!d.getElementById('workforceNotify').checked,'new case must reset choices');
  const remaining=[
    {counts:[2,1,1,1,1],support:0,priority:1,medical:false},
    {counts:[2,2,1,1,1],support:1,priority:2,medical:false},
    {counts:[2,2,1,1,1],support:1,priority:0,medical:true},
    {counts:[2,1,1,1],support:0,priority:1,medical:false},
    {counts:[2,1,1,1],support:0,priority:0,medical:false}
  ];
  for(const plan of remaining){support(plan.support);plan.counts.forEach((n,i)=>assign(i,n));priority(plan.priority);change('workforceNotify',true);if(plan.medical)change('workforceMedical',true);analyze();assert(d.getElementById('workforceAnalysis').textContent.includes('100 分'),'complete scenario plan must be feasible');click('workforceNext');}
  assert(Object.keys(state().scenarioPractice).length===6,'all six planning scenarios should be recorded');
  support(1);[2,2,1,1,1].forEach((n,i)=>assign(i,n));priority(0);change('workforceNotify',true);change('workforceMedical',true);analyze();
  assert(state().knowledge===startKnowledge+12,'replaying a case must not farm knowledge');
  assert(state().xp===startXP&&state().simEpoch===startClock,'practice must not advance XP or game date');
  assert(JSON.parse(w.localStorage.getItem('twPoliceCareerSaveV1')).scenarioPractice['collision|command'].best===100,'practice must persist with save');
  change('workforceAutoNext',true);
  click('workforceScenarioClose');assert(!d.getElementById('workforceScenarioDialog').open&&d.body.style.overflow==='','close should restore scrolling');
  assert(![...timers.values()].some(t=>t.delay===6000),'close should cancel auto next');
  assert(!planning.errors.length,planning.errors.join('\n'));
} finally {planning.w.close();}

// Officer: own team is capped at two, requested support stays separate.
const officer=setup('officer');await settle();
try {
  const {d,state,timers,click,change,support,assign,priority,open,analyze}=officer;
  const clock=state().simEpoch;open();change('workforceAutoNext',false);
  assert(d.getElementById('workforceScenarioRole').textContent.includes('現場回報'),'officer should get reporting mode');
  assert(d.querySelectorAll('[data-workforce-task][data-workforce-step="1"]').length===4,'officer must not get command reserve control');
  assert(d.getElementById('workforceModeNote').textContent.includes('只安排現場 2 人'),'own-team boundary missing');
  support(4);assign(0,1);assign(1,1);assign(2,5);
  assert(d.querySelector('[data-workforce-count="2"]').textContent==='0','support must not expand officer allocation capacity');
  assert(d.getElementById('workforceBudget').textContent.includes('2 / 2'),'officer allocation budget incorrect');
  priority(0);change('workforceNotify',true);change('workforceMedical',true);analyze();
  assert(d.getElementById('workforceAnalysis').textContent.includes('100 分'),'appropriate officer plan and support should pass');
  assert(state().scenarioPractice['collision|officer'].best===100,'officer report should persist under officer mode');
  assert(state().simEpoch===clock,'officer practice should not advance date');
  click('workforceNext');priority(0);analyze();
  const analysis=d.getElementById('workforceAnalysis').textContent;
  assert(analysis.includes('少 1 人')&&analysis.includes('優先順序需調整')&&analysis.includes('尚未勾選')&&analysis.includes('申請至少 3 人'),'incorrect plan must explain staffing, priority and communication gaps');
  change('workforceAutoNext',true);
  const pending=[...timers.values()].find(t=>t.delay===6000);assert(pending,'timer missing');
  officer.w.localStorage.setItem('twPoliceCareerSaveV1',JSON.stringify({created:false,name:'',position:'考生',rank:'考生',unit:'',retired:false}));click('loadBtn');
  assert(!d.getElementById('workforceScenarioDialog').open,'role changes must close the old plan');
  assert(![...timers.values()].some(t=>t.delay===6000),'role change must cancel pending auto next');
  assert(!officer.errors.length,officer.errors.join('\n'));
} finally {officer.w.close();}

// Candidate preview is explicitly academy training, without command authority.
const training=setup();await settle();
try {
  const {d,state,timers,click,change,support,assign,priority,open,analyze}=training;
  assert(d.querySelector('[data-workforce-entry="duty"] button').disabled,'candidate duty entry must stay locked');
  const command=d.querySelector('[data-workforce-entry="command"] button');command.dispatchEvent(new training.w.MouseEvent('click',{bubbles:true}));
  assert(!d.getElementById('workforceScenarioDialog').open,'candidate cannot open command planning via command entry');
  open();assert(d.getElementById('workforceScenarioRole').textContent.includes('學堂模擬'),'candidate preview must say training');
  support(1);[2,2,1,1,1].forEach((n,i)=>assign(i,n));priority(0);change('workforceNotify',true);change('workforceMedical',true);analyze();
  assert(state().position==='考生'&&!state().unit,'academy planning must not appoint a candidate');
  const found=[...timers].find(([,t])=>t.delay===6000);timers.delete(found[0]);found[1].fn();
  assert(d.getElementById('workforceCaseTitle').textContent.includes('走失兒童')&&d.getElementById('workforceAnalysis').textContent.includes('上一案分析'),'auto next should retain the report');
  click('workforceScenarioClose');assert(d.body.style.overflow==='','training dialog should restore scrolling');
  assert(!training.errors.length,training.errors.join('\n'));
} finally {training.w.close();}
console.log('WORKFORCE_OK six feasible scenarios, staffing limits, support arrival, officer/command/training gates, analysis, duplicate rewards, saved progress, auto/manual next, role changes, scrolling and lazy operation');
