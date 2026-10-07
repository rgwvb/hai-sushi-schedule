import fs from 'node:fs';
import {JSDOM, VirtualConsole} from 'jsdom';
const assert = (value, message) => { if (!value) throw new Error(message); };
const source = fs.readFileSync('scripts/exam_archive.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const official = 'https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?';
const paper = {id:'115060-201-0908',year:115,category:'警察人員考試三等考試_行政警察人員類別',subject:'警察政策與犯罪預防',track:'警察特考',grade:'三等',questionCount:2,officialAnswerCount:25,bank:'fixture',questionUrl:official+'t=Q&code=115060&c=201&s=0908&q=1',answerUrl:official+'t=S&code=115060&c=201&s=0908&q=1',correctionUrl:official+'t=M&code=115060&c=201&s=0908&q=1'};
const essay = {...paper,id:'115060-401-0701',track:'一般警察特考',subject:'刑法',questionCount:0,answerUrl:null,correctionUrl:null};
const row1 = [4,'為有效打擊電信網路詐欺犯罪，113年政府增修所謂「打詐新四法」，下列所述何者錯誤？',['科技偵查及保障法','通訊保障及監察法','證券投資諮詢及信託法','洗錢防制法'],[0,2],1,'第4題答A或C者均給分'];
const row2 = [5,'依據內政部警政署113年工作計畫，揭示的目的有三，下列所述何者錯誤？',['紮根建檔','強力壓制','溯源刨根','分進合擊'],[1],1,''];
const files = {
  'manifest.json':{source:'考選部',sourceUrl:'https://wwwq.moex.gov.tw/exam/wFrmExamQandASearch.aspx',declaration:'官方資料宣示',paperCount:3,questionCount:3,years:[{year:115,paperCount:2,catalogFile:'115.catalog.json',bankFile:'115.json'},{year:114,paperCount:1,catalogFile:'114.catalog.json',bankFile:'114.json'}]},
  '115.catalog.json':{year:115,papers:[paper,essay]},
  '114.catalog.json':{year:114,papers:[{...paper,id:'114060-201-0908',year:114,questionCount:1,bank:'older'}]},
  '115.json':{year:115,banks:{fixture:[row1,row2]}},
  '114.json':{year:114,banks:{older:[row1]}},
};
const errors = [], requests = [], timers = new Map(); let timerId=0, failManifest=true;
const console = new VirtualConsole(); console.on('jsdomError',err=>errors.push(err.message));
const dom = new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
const w=dom.window,d=w.document;
w.fetch=async url=>{const file=String(url).split('/').at(-1);requests.push(file);if(file==='manifest.json'&&failManifest){failManifest=false;throw new Error('temporary network error');}assert(files[file],'unexpected data request '+file);return {ok:true,json:async()=>files[file]};};
w.setTimeout=fn=>{timers.set(++timerId,fn);return timerId;};w.clearTimeout=id=>timers.delete(id);
w.eval('var s = {quizTotal:0, quizCorrect:0, knowledge:0, simEpoch:123456789};');
w.eval(source);
const click=id=>{const el=typeof id==='string'?d.getElementById(id):id;assert(el,'missing target '+id);el.click();};
const settle=async()=>{for(let i=0;i<18;i++)await Promise.resolve();};
assert(requests.length===0,'banks must not load during game startup');
click('examArchiveOpenBtn');await settle();assert(d.getElementById('examArchiveStatus').textContent.includes('失敗'),'load error should be visible');
click('examArchiveOpenBtn');await settle();
assert(d.getElementById('examYearFilter').value==='115','latest year should be selected');
assert(d.querySelectorAll('.exam-paper-card').length===2,'paper and essay catalogs should display');
assert(!requests.includes('115.json'),'bank should load only when practice starts');
const original=d.querySelector('.exam-paper-card a');assert(original.href===paper.questionUrl,'original full PDF source must remain linked');
d.getElementById('examAutoNext').checked=false;
click(d.querySelector('[data-exam-paper]'));await settle();
assert(d.getElementById('examQuizDialog').open,'paper practice dialog should open');
assert(d.getElementById('examQuizMeta').textContent.includes('原卷第 4 題'),'original numbering should be retained');
click(d.querySelector('[data-exam-answer="2"]'));
assert(d.getElementById('examQuizResult').textContent.includes('答對了'),'alternate corrected answer C must be accepted');
assert(d.getElementById('examQuizResult').textContent.includes('A或C'),'official correction note must be shown');
assert(d.querySelectorAll('.exam-answer-btn.is-correct').length===2,'both accepted choices should be highlighted');
assert(w.s.quizTotal===1 && w.s.quizCorrect===1 && w.s.knowledge===3,'one correct answer should update game counters once');
const storedBefore=w.localStorage.getItem('twPoliceHistoricalPracticeV1');
d.querySelector('[data-exam-answer="0"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
assert(w.localStorage.getItem('twPoliceHistoricalPracticeV1')===storedBefore,'duplicate answer must not change progress');
assert(w.s.quizTotal===1 && w.s.knowledge===3,'duplicate clicks must not award extra game points');
assert(w.s.simEpoch===123456789,'practice must not advance the career clock');
assert(timers.size===0,'manual practice must not auto-advance');
click('examQuizNextBtn');assert(d.getElementById('examQuizMeta').textContent.includes('原卷第 5 題'),'next should retain original question numbers');
assert(d.getElementById('examQuizResult').textContent.includes('第 4 題'),'previous feedback should survive auto/manual next');
click(d.querySelector('[data-exam-answer="0"]'));click('examQuizNextBtn');
assert(d.getElementById('examQuizQuestion').textContent==='答對 1 / 2 題','round score should be accurate');
click('examQuizNextBtn');assert(!d.getElementById('examQuizDialog').open,'finish should close dialog');
assert(!d.getElementById('examWrongBtn').disabled,'wrong-answer practice should become available');
click('examWrongBtn');await settle();assert(d.getElementById('examQuizMeta').textContent.includes('原卷第 5 題'),'wrong-answer practice should target the missed question');
click(d.querySelector('[data-exam-answer="1"]'));click('examQuizCloseBtn');
click('examArchiveOpenBtn');await settle();assert(d.getElementById('examWrongBtn').disabled,'correct re-answer should remove the wrong item');
d.getElementById('examAutoNext').checked=true;click(d.querySelector('[data-exam-paper]'));await settle();click(d.querySelector('[data-exam-answer="0"]'));assert(timers.size===1,'automatic mode should schedule a single next question');
const advance=[...timers.values()][0];timers.clear();advance();assert(d.getElementById('examQuizMeta').textContent.includes('原卷第 5 題'),'automatic next must stay within the round');
click(d.querySelector('[data-exam-answer="1"]'));click('examQuizCloseBtn');assert(timers.size===0,'close should cancel pending auto-advance');assert(d.body.style.overflow==='','close should restore page scrolling');
const track=d.getElementById('examTrackFilter');track.value='一般警察特考';track.dispatchEvent(new w.Event('change'));assert(d.getElementById('examMixBtn').disabled,'original-only filters should disable graded practice');
track.value='';track.dispatchEvent(new w.Event('change'));
const year=d.getElementById('examYearFilter');year.value='';year.dispatchEvent(new w.Event('change'));await settle();assert(requests.includes('114.catalog.json'),'all-year filter should include older catalogs');
assert(requests.filter(x=>x==='115.json').length===1,'already-loaded banks should be cached');
assert(errors.length===0,'browser runtime errors: '+errors.join('; '));
dom.window.close();
process.stdout.write('EXAM_ARCHIVE_OK lazy loading, source links, corrected answers, duplicates, manual/automatic next, scores, wrong-answer review, filters, retry, scrolling\n');
