import fs from 'node:fs';
import {JSDOM, VirtualConsole} from 'jsdom';

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const raw = fs.readFileSync('index.html', 'utf8');
const main = [...raw.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(m => /\bid="standalone(?:BackendConfig|Backend|App|Systems)"/.test(m[1]))
  .map(m => m[2]).join('\n;\n');
const html = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const errors = [], requests = [], timers = new Map();
let timerId = 0;
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(e.message));
vc.on('error', (...args) => errors.push(args.map(String).join(' ')));
const dom = new JSDOM(html, {url:'https://example.test/', runScripts:'outside-only', pretendToBeVisual:true, virtualConsole:vc});
const w = dom.window, d = w.document;
w.confirm = () => true; w.scrollTo = () => {};
w.HTMLElement.prototype.scrollIntoView = () => {};
w.setTimeout = (fn, delay) => { timers.set(++timerId, {fn, delay}); return timerId; };
w.clearTimeout = id => timers.delete(id);
const official = 'https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?';
const paper = {id:'115060-201-0908',year:115,category:'警察人員考試三等考試_行政警察人員類別',subject:'警察政策與犯罪預防',track:'警察特考',grade:'三等',questionCount:2,officialAnswerCount:25,bank:'fixture',questionUrl:official+'t=Q&code=115060&c=201&s=0908&q=1',answerUrl:official+'t=S&code=115060&c=201&s=0908&q=1',correctionUrl:official+'t=M&code=115060&c=201&s=0908&q=1'};
const corrected = [4,'打詐新四法，下列何者錯誤？ <img src=x onerror="throw 1">',['科技偵查及保障法','通訊保障及監察法','證券投資諮詢及信託法','洗錢防制法'],[0,2],1,'第4題答A或C者均給分'];
const single = [5,'依警政署工作計畫，下列何者錯誤？',['紮根建檔','強力壓制','溯源刨根','分進合擊'],[1],1,''];
const files = {
  'manifest.json':{source:'考選部',sourceUrl:'https://wwwq.moex.gov.tw/exam/wFrmExamQandASearch.aspx',declaration:'官方資料宣示',years:[{year:115,questionCount:2,catalogFile:'115.catalog.json',bankFile:'115.json'}]},
  '115.catalog.json':{year:115,papers:[paper,{...paper,id:'duplicate',category:'刑事警察類別'}, {...paper,id:'fire',subject:'消防警察情境實務',bank:'unrelated'}]},
  '115.json':{year:115,banks:{fixture:[corrected,single],unrelated:[[1,'不應抽到消防專業題',['甲','乙','丙','丁'],[0],1,'']]}},
};
w.fetch = async url => {
  if (!String(url).startsWith('data/exams/')) return {ok:true,json:async()=>({meta:{divisionCount:0,stationCount:0},counties:{}})};
  const file=String(url).split('/').at(-1); requests.push(file);
  assert(files[file], 'unexpected file '+file); return {ok:true,json:async()=>files[file]};
};
w.eval(main + '\n;\n' + fs.readFileSync('scripts/exam_archive.js', 'utf8') + '\n;window.__testState=()=>s;');
const state = () => w.__testState();
const click = target => { const el = typeof target === 'string' ? d.getElementById(target) : target; assert(el,'missing click target'); el.click(); };
const settle = async () => { for (let i=0;i<45;i++) await Promise.resolve(); };
const runTimer = delay => {
  const found=[...timers].find(([,t])=>t.delay===delay); assert(found,'missing timer '+delay);
  timers.delete(found[0]); found[1].fn();
};
const stopAdvance = () => { for (const [id,t] of timers) if (t.delay===1500) timers.delete(id); };
try {
  assert(!requests.length,'historical data must not load at startup');
  w.Math.random=()=>0;
  const clock=state().simEpoch;
  click('newQuizBtn');
  assert(d.getElementById('quizQuestion').textContent.includes('正在抽取'),'first load should show progress');
  assert(!d.querySelector('#quizChoices button'),'cannot answer while loading');
  await settle();
  assert(requests.join(',')==='manifest.json,115.catalog.json,115.json','only one year should load on first request');
  assert(d.getElementById('quizQuestion').textContent.includes('民國 115 年') && d.getElementById('quizQuestion').textContent.includes('原題 4'),'historical provenance missing');
  assert(!d.querySelector('#quizQuestion img'),'PDF text must be rendered as text');
  assert(d.querySelectorAll('#quizChoices button[data-q]').length===4,'mobile choices must be native buttons');
  const total=state().quizTotal||0, correctCount=state().quizCorrect||0;
  const choice=d.querySelector('#quizChoices [data-q="2"]');click(choice);click(choice);
  assert(state().quizTotal===total+1 && state().quizCorrect===correctCount+1,'accepted C should score once');
  assert(d.getElementById('quizResult').textContent.includes('第4題答A或C者均給分'),'official correction missing');
  assert(d.getElementById('quizResult').textContent.includes('官方答案：A.') && d.getElementById('quizResult').textContent.includes('或 C.'),'correct answers should remain readable after auto-next');
  assert(d.querySelector('#quizResult a').href.includes('t=M'),'corrected answer must link to correction');
  assert(d.querySelectorAll('#quizResult a').length===3,'question, standard and correction links should remain available');
  assert(d.getElementById('quizResult').textContent.includes('官方資料宣示'),'source declaration missing');
  assert(JSON.parse(w.localStorage.getItem('twPoliceHistoricalPracticeV1'))[paper.id+':4'].correct,'game answer should join archive progress');
  runTimer(1500);await settle();
  assert(d.getElementById('quizQuestion').textContent.includes('原題 5'),'automatic next should use a different original question');
  assert(d.getElementById('quizResult').textContent.includes('第4題答A或C'),'previous analysis should stay available while the next question is shown');
  click(d.querySelector('#quizChoices [data-q="0"]'));
  assert(d.getElementById('quizResult').textContent.includes('正確答案是 B. 強力壓制'),'single accepted answer feedback incorrect');
  assert(state().simEpoch===clock,'practice must not advance the game clock');
  assert(requests.filter(x=>x==='115.json').length===1,'next question should reuse the bank');
  stopAdvance();

  // Duty and command reuse the same real provider. Keep role gates intact.
  Object.assign(state(),{created:true,passed:true,unit:'station',county:'臺北市',localAgency:'臺北市政府警察局',unitName:'測試派出所',assignmentType:'station',position:'警員',rank:'警員',careerSequenceNo:11,careerStage:'basic_active'});
  click('nextDutyBtn');await settle();
  assert(d.getElementById('dutyCase').textContent.includes('民國 115 年'),'duty practice did not use historical questions');
  const dutyChoice=d.querySelector('#dutyChoices [data-dutyquiz="0"]');click(dutyChoice);click(dutyChoice);
  assert(d.querySelector('#dutyResult a')?.href.includes('t=M'),'duty should show official correction');
  runTimer(1500);await settle();
  assert(d.getElementById('dutyResult').textContent.includes('第4題答A或C') && d.querySelectorAll('#dutyChoices [data-dutyquiz]').length===4,'duty auto-next must retain official feedback');
  Object.assign(state(),{position:'分局長',rank:'分局長',positionLevel:6,careerSequenceNo:4});
  click('nextCommandBtn');await settle();
  assert(d.getElementById('commandCase').textContent.includes('民國 115 年'),'command practice did not use historical questions');
  click(d.querySelector('#commandChoices [data-cmdquiz="1"]'));
  assert(d.querySelector('#commandResult a')?.href.includes('wwwq.moex.gov.tw'),'command should show official answer');
  stopAdvance();
  Object.assign(state(),{position:'警員',rank:'警員',positionLevel:0,careerSequenceNo:11});
  const commandBefore=d.getElementById('commandCase').textContent;
  click('nextCommandBtn');await settle();
  assert(d.getElementById('commandCase').textContent===commandBefore,'ordinary officer must not start command practice');

  // Out-of-order responses must never replace the newest requested question.
  const real=w.policeHistoricalQuestions, pending=[];
  w.policeHistoricalQuestions={next:()=>new Promise(resolve=>pending.push(resolve)),record:()=>{}};
  click('newQuizBtn');click('newQuizBtn');await settle();
  assert(pending.length===2,'both requests should be testable');
  pending[1](['最新題目',['甲','乙','丙','丁'],1,'測試','解析','','']);await settle();
  pending[0](['過期題目',['甲','乙','丙','丁'],0,'測試','解析','','']);await settle();
  assert(d.getElementById('quizQuestion').textContent.includes('最新題目')&&!d.getElementById('quizQuestion').textContent.includes('過期'),'stale request replaced current quiz');

  w.policeHistoricalQuestions={next:async()=>{throw new Error('offline');},record:()=>{}};
  click('newQuizBtn');await settle();
  assert(d.querySelectorAll('#quizChoices [data-q]').length===4,'failed historical request should leave a playable fallback');
  assert(d.getElementById('quizResult').textContent.includes('暫時無法載入'),'fallback should explain its source');
  w.policeHistoricalQuestions={next:()=>new Promise(resolve=>pending.push(resolve)),record:()=>{}};
  click('newQuizBtn');await settle();runTimer(8000);
  const fallbackText=d.getElementById('quizQuestion').textContent;
  pending.at(-1)(['太晚回來的題目',['甲','乙','丙','丁'],0,'測試','解析','','']);await settle();
  assert(d.getElementById('quizQuestion').textContent===fallbackText,'late network response replaced timeout fallback');
  w.policeHistoricalQuestions=real;click('newQuizBtn');await settle();
  assert(d.getElementById('quizQuestion').textContent.includes('民國 115 年'),'subsequent request should recover real historical questions');
  assert(!errors.length,errors.join('\n'));
  console.log('GAME_HISTORY_OK lazy shared cache, original provenance, corrected answers, progress, auto-next, duty, command gates, stale responses, duplicate scores, fallback and retry');
} finally { w.close(); }
