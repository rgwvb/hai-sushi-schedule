import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';

const raw=fs.readFileSync('index.html','utf8');
const scripts=[...raw.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(m=>/\bid="standalone(?:BackendConfig|Backend|App|Systems)"/.test(m[1]))
  .map(m=>m[2]).join('\n;\n');
const errors=[],vc=new VirtualConsole();
vc.on('jsdomError',e=>errors.push(e.message));
vc.on('error',(...a)=>errors.push(a.map(String).join(' ')));
const dom=new JSDOM(raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),{
  url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc
});
const w=dom.window,d=w.document;
w.confirm=()=>true;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.setTimeout=()=>1;w.clearTimeout=()=>{};
w.fetch=async()=>({ok:true,json:async()=>({meta:{divisionCount:0,stationCount:0},counties:{}})});
w.eval(scripts+'\n;window.__careerTest={state:()=>s,replace:value=>{s=Object.assign(NEW(),value);},record:rec,render:records,save};');
for(let i=0;i<35;i++)await Promise.resolve();
const api=w.__careerTest;
const appointments=()=>d.getElementById('historyList').textContent;
const events=()=>d.getElementById('careerEventList').textContent;

try{
  api.render();
  assert.equal(d.querySelectorAll('#historyList .career-record').length,0,'candidate must have no invented appointments');
  assert(!appointments().includes('2011')&&!appointments().includes('2016')&&!appointments().includes('XX派出所'));

  api.replace({created:true,name:'測試角色',route:'tpa',passed:true,county:'臺北市',localAgency:'臺北市政府警察局',precinct:'中正第一分局',unit:'station',unitName:'臺北市政府警察局中正第一分局忠孝西路派出所',stationName:'忠孝西路派出所',position:'警員',rank:'警員',officialRank:'警佐三階',careerSequenceNo:11,history:[],careerAppointments:[]});
  api.record('派出所報到','臺北市｜中正第一分局｜忠孝西路派出所');
  const first=api.state().careerAppointments[0];
  assert.equal(first.officialRank,'警佐三階');
  assert.equal(first.position,'警員');
  assert.equal(first.year,2010);
  Object.assign(api.state(),{officialRank:'警佐二階',position:'巡佐兼副所長',rank:'巡佐兼副所長',careerSequenceNo:10,unitName:'臺北市政府警察局南港分局玉成派出所',precinct:'南港分局',stationName:'玉成派出所'});
  api.record('職務輪調','臺北市政府警察局南港分局玉成派出所｜巡佐兼副所長');
  api.record('輪調資格開放','完成18個月歷練，開放輪調');
  api.record('年度考績','甲等');
  api.record('陞遷甄審','申請巡官｜本次因缺額未獲陞任');
  api.render();
  assert.equal(d.querySelectorAll('#historyList .career-record').length,2);
  assert(appointments().includes('警佐三階')&&appointments().includes('警員')&&appointments().includes('忠孝西路派出所'));
  assert(appointments().includes('警佐二階')&&appointments().includes('巡佐兼副所長')&&appointments().includes('玉成派出所'));
  assert(!appointments().includes('輪調資格開放')&&!appointments().includes('甲等')&&!appointments().includes('未獲陞任'));
  assert(events().includes('輪調資格開放')&&events().includes('甲等')&&events().includes('未獲陞任'));
  assert(!events().includes('派出所報到')&&!events().includes('職務輪調'));
  assert.equal(first.officialRank,'警佐三階','later promotions must not rewrite a past rank');
  assert.equal(first.unitName,'臺北市政府警察局中正第一分局忠孝西路派出所','later transfers must not rewrite a past unit');
  for(let i=0;i<105;i++)api.record('情境演練','第'+i+'次');
  api.render();api.render();api.save();
  assert.equal(api.state().history.length,100);
  assert.equal(api.state().careerAppointments.length,2,'appointments must survive ordinary event history truncation');
  const saved=JSON.parse(w.localStorage.getItem('twPoliceCareerSaveV1'));
  assert.equal(saved.careerAppointments.length,2,'appointment snapshots must survive saving');
  api.replace(saved);api.render();
  assert.equal(d.querySelectorAll('#historyList .career-record').length,2,'reload must not duplicate appointments');

  api.replace({position:'考生',history:[
    {time:'2019年12月29日 23:00',title:'職務輪調',detail:'臺北市政府警察局南港分局玉成派出所｜警務員兼所長'},
    {time:'2016年7月5日 08:00',title:'職務輪調',detail:'臺北市政府警察局南港分局玉成派出所｜警佐二階｜巡佐兼副所長'},
    {time:'2011年1月2日 08:00',title:'派出所報到',detail:'臺北市｜中正第一分局｜忠孝西路派出所'},
    {time:'2019年12月29日 23:00',title:'輪調資格開放',detail:'已開放'},
  ]});
  api.render();api.render();
  assert.equal(api.state().careerAppointments.length,3,'legacy migration must be repeatable');
  assert.deepEqual([...d.querySelectorAll('#historyList .career-year')].map(x=>x.textContent),['2011','2016','2019']);
  const rows=[...d.querySelectorAll('#historyList .career-record')];
  assert(rows[0].textContent.includes('官階未記錄')&&rows[0].textContent.includes('警員')&&rows[0].textContent.includes('忠孝西路派出所'));
  assert(rows[1].textContent.includes('警佐二階')&&rows[1].textContent.includes('巡佐兼副所長'));
  assert(rows[2].textContent.includes('官階未記錄')&&rows[2].textContent.includes('警務員兼所長'));
  assert(events().includes('輪調資格開放'));

  api.replace({unit:'station',position:'警員',officialRank:'警佐三階',unitName:'某分局某派出所',history:[]});
  api.render();
  assert(appointments().includes('現職補記')&&appointments().includes('未保留報到日期'));
  assert.equal(api.state().careerAppointments.length,0,'rendering a current-post fallback must not invent an appointment date in the save');
  api.replace({position:'考生',history:[{title:'年度考績',time:'2016年1月1日 08:00',detail:'<img src=x onerror=alert(1)>'}]});
  api.render();
  assert.equal(d.querySelectorAll('#careerEventList img').length,0,'imported event text must not create markup');
  assert(events().includes('<img'));
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('CAREER_RECORDS_OK split appointments/events, historical ranks and units, concurrent roles, candidate gate, legacy migration, saved snapshots, truncation and safe text');
}finally{w.close();}
