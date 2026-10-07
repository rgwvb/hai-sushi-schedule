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
const events=()=>api.state().history.map(h=>h.title+' '+h.detail).join('\n');

try{
  api.render();
  assert.equal(d.getElementById('careerEventList'),null,'career page should no longer display an event panel');
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
  assert(events().includes('派出所報到')&&events().includes('職務輪調'),'removing the event panel must preserve the saved history');
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
  api.replace({position:'考生',history:[{title:'職務輪調',time:'2016年1月1日 08:00',detail:'某分局<img src=x onerror=alert(1)>｜巡官'}]});
  api.render();
  assert.equal(d.querySelectorAll('#historyList img').length,0,'imported appointment text must not create markup');
  assert(appointments().includes('<img'));

  const currentUnit='臺東縣警察局局本部';
  api.replace({created:true,route:'g4',passed:true,county:'臺東縣',localAgency:'臺東縣警察局',joinDate:'2027-06-01T08:00:00',simDate:'2052-05-03T06:00:00',unit:'admin',unitName:currentUnit,officialRank:'警監三階',position:'局長',careerAppointments:[
    {time:'2030年1月1日 08:00',kind:'職務陞遷',position:'科長',officialRank:'',unitName:'',source:'legacy'},
    {time:'2033年2月1日 08:00',kind:'職務輪調',position:'科長',officialRank:'',unitName:'內政部警政署',source:'legacy'}
  ],history:[{time:'2036年5月3日 06:00',title:'年度考績',detail:'甲等'}],promotionReviews:[
    {date:'2035年1月1日 08:00',result:'陞任',target:'臺東縣警察局局本部｜局長'},
    {date:'2034年1月1日 08:00',result:'未獲陞任',target:'副局長'},
    {date:'2030年1月1日 08:00',result:'陞任',target:'內政部警政署｜科長'},
    {date:'2025年1月1日 08:00',result:'陞任',target:'警務正'},
    {date:'2021年1月1日 08:00',result:'陞任',target:'警務員'},
    {date:'2018年1月1日 08:00',result:'陞任',target:'巡官'},
    {date:'2014年1月1日 08:00',result:'陞任',target:'巡佐'}
  ]});
  api.render();api.render();
  assert.equal(api.state().careerAppointments.length,8,'recover initial post and successful reviews without duplicating existing promotions');
  const recovered=[...d.querySelectorAll('#historyList .career-record')];
  assert.equal(recovered[0].querySelector('.career-year').textContent,'2011');
  assert(recovered[0].textContent.includes('警佐三階')&&recovered[0].textContent.includes('警員'));
  assert(!recovered[0].textContent.includes(currentUnit),'current unit must not be assigned to an unknown initial unit');
  assert(appointments().includes('巡佐')&&appointments().includes('巡官')&&appointments().includes('警務員')&&appointments().includes('警務正'));
  assert(!appointments().includes('副局長'),'failed promotion must not become an appointment');
  assert.equal(recovered.at(-1).querySelector('.career-year').textContent,'2036');
  assert(recovered.at(-1).textContent.includes('警監三階')&&recovered.at(-1).textContent.includes('局長'));
  assert.equal(api.state().careerAppointments.find(x=>x.position==='科長'&&x.kind==='職務陞遷').unitName,'內政部警政署','promotion target should recover the missing historical unit');
  api.save();
  const rebuilt=JSON.parse(w.localStorage.getItem('twPoliceCareerSaveV1'));
  api.replace(rebuilt);api.render();
  assert.equal(api.state().careerAppointments.length,8,'saving and loading must not duplicate recovered appointments');
  api.state().promotionReviews.unshift({date:'2036年5月3日 06:00',result:'陞任',target:'內政部警政署｜副署長'});
  Object.assign(api.state(),{position:'副署長',officialRank:'警監二階',unitName:'內政部警政署'});
  api.record('職務陞遷','經甄審陞任 第二序列 內政部警政署｜副署長');
  api.render();
  const finalPromotion=api.state().careerAppointments.filter(x=>x.time==='2036年5月3日 06:00'&&x.position==='副署長');
  assert.equal(finalPromotion.length,1,'a new review and its appointment snapshot should produce one row');
  assert.equal(finalPromotion[0].source,'snapshot');
  assert.equal(finalPromotion[0].officialRank,'警監二階');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('CAREER_RECORDS_OK appointments only, full career recovery, successful-review deduplication, historical ranks/units, concurrent roles, candidate gate, saved snapshots, truncation and safe text');
}finally{w.close();}
