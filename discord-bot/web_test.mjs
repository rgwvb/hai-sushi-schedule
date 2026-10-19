import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Game} from './game.mjs';
import {runtime} from './web-game.mjs';
import {fullCard} from './web-ui.mjs';
import {preparePayload} from './insignia.mjs';
import {currentRank,careerRole} from './career.mjs';
import {publicProfile,rankedPlayers} from './community.mjs';
import {playerSheetRows} from './sheets.mjs';
import {handle} from './ui.mjs';
const options={random:()=>0.9,fetcher:async()=>({ok:true,json:async()=>({meta:{divisionCount:0,stationCount:0},counties:{}})})};
const g='111111111111111111',u='222222222222222222';
function validate(v){
 const p=preparePayload(fullCard(v,u));assert(p.components.length<=5);
 let count=0;for(const e of p.embeds){const x=e.toJSON();assert(x.description.length<=4096);count+=JSON.stringify(x).length;}
 assert(count<6000);for(const r of p.components)for(const c of r.toJSON().components){assert(c.custom_id.length<=100);if(c.label)assert(c.label.length<=80);if(c.options){assert(c.options.length<=25);for(const o of c.options)assert(o.label.length<=100&&o.value.length<=100);}}
 return p;
}
const act=async(game,result,path,value)=>{
 const index=result.view.controls.findIndex(c=>c.path===path);assert(index>=0,'Missing '+path+' on '+result.view.title);
 const next=await game.fullAction(g,u,{revision:result.view.revision,action:index,...(value!==undefined?{value}:{})},options);validate(next.view);return next;
};
test('packaged engine is generated from the actual website, not a separate progression model',async()=>{
 if(existsSync(new URL('../index.html',import.meta.url))){const {webBundle}=await import('./sync-web.mjs');assert.deepEqual(JSON.parse(readFileSync(new URL('web-engine.json',import.meta.url))),webBundle());}
 const r=await runtime(null,options);try{assert.equal(r.w.dcCore.state().position,'考生');assert(r.w.dcSystems&&r.w.dcArchive&&r.w.dcWorkforce);}finally{r.close();}
});
test('candidate inputs, route and study survive fresh runtimes; no candidate insignia or officer authority',async()=>{
 const game=new Game(':memory:');try{
 game.create(g,u,'考生甲','尚未分發');let r=await game.fullAction(g,u,{start:true},options);let p=validate(r.view);
 assert.equal(p.files.length,0);assert.equal(currentRank(r.p),'—');assert(!r.view.pages.some(x=>x.value==='command'));
 r=await act(game,r,'#charName','考生乙');r=await act(game,r,'#charAge','24');r=await act(game,r,'#charEducation','大學畢業');
 r=await act(game,r,'#createCharacterBtn');assert.equal(r.p.webCareer.state.name,'考生乙');assert.equal(r.p.webSummary.age,24);
 const route=r.view.controls.find(c=>c.label.includes('一般警察特考四等'));assert(route);
 r=await act(game,r,route.path);r=await act(game,r,'#confirmRouteBtn');assert.equal(r.p.webCareer.state.route,'g4');
 const before=r.p.webCareer.state.law;r=await act(game,r,'#studyActions > div:nth-child(1)');assert.equal(r.p.webCareer.state.law,before+5);
 const stored=game.get(g,u);r=await game.fullAction(g,u,{},options);assert.equal(r.p.webCareer.state.law,stored.webCareer.state.law);
 await assert.rejects(()=>game.fullAction(g,u,{page:'command'},options),/尚未開放/);
 const pub=publicProfile(r.p,u).embeds[0].toJSON();assert.equal(pub.image,undefined);assert(!pub.description.includes('警佐三階'));
 const sheet=playerSheetRows([{user:u,p:r.p}],g);assert.equal(sheet[0][2],'—');assert.equal(sheet[0][12],'備考／受訓／待分發');
 }finally{game.close();}
});
test('old career imports without resetting position/rank/year/earned performance, keeps original backup, and duties settle once',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'web-dc-')),path=join(folder,'save.sqlite');let game=new Game(path);try{
 game.create(g,u,'舊角色','新北市政府警察局｜警備單位');
 game.transaction(g,u,p=>Object.assign(p,{stage:1,month:25,appointed:24,completed:25,merit:4.8,appraisals:[{year:2010,grade:'A',score:100},{year:2011,grade:'B',score:75}],post:{unit:p.unit,role:{title:'小隊長',deck:'security',authority:'team'}}}));
 const original=game.get(g,u);let r=await game.fullAction(g,u,{start:true},options);validate(r.view);
 assert.deepEqual(r.p.webLegacyBackup,original);assert.equal(careerRole(r.p).title,'小隊長');assert.equal(currentRank(r.p),'警佐二階');assert.equal(r.p.completed,25);assert(r.p.webSummary.years>=2);assert.equal(r.p.webCareer.state.outcomePerformance,4.8);assert.equal(r.p.webCareer.state.appraisals[0].grade,'乙等');
 r=await game.fullAction(g,u,{page:'duty'},options);r=await act(game,r,'#nextDutyBtn');
 const pending=structuredClone(r.p.webCareer.systems.active);assert(pending);const revision=r.view.revision;
 game.close();game=new Game(path);r=await game.fullAction(g,u,{},options);assert.deepEqual(r.p.webCareer.systems.active,pending);
 const best=pending.row[2].reduce((a,c,i,all)=>c[1]>all[a][1]?i:a,0);
 const choice=r.view.controls.find(c=>c.path.includes('#dutyChoices')&&c.label.startsWith(String.fromCharCode(65+best)+'.'));assert(choice);
 const old=r.p.webCareer.state.outcomePerformance,oldCount=r.p.completed,index=r.view.controls.findIndex(c=>c.path===choice.path),token=r.view.revision;
 r=await act(game,r,choice.path);assert.equal(r.p.completed,oldCount+1);assert(r.p.webCareer.state.outcomePerformance>old);
 await assert.rejects(()=>game.fullAction(g,u,{revision:token,action:index},options),/已更新/);assert.equal(game.get(g,u).completed,oldCount+1);
 assert.notEqual(revision,r.view.revision);assert.deepEqual(r.p.webLegacyBackup,original);
 }finally{game.close();rmSync(folder,{recursive:true,force:true});}
});
test('workforce configuration and question survive reload; owner guard rejects before storage',async()=>{
 const game=new Game(':memory:');try{
 game.create(g,u,'甲','尚未分發');let r=await game.fullAction(g,u,{start:true},options);r=await game.fullAction(g,u,{page:'academy'},options);
 const open=r.view.controls.find(c=>c.path.includes('workforce')||c.label.includes('人力')||c.label.includes('情境'));assert(open);
 r=await act(game,r,open.path);assert(r.p.webCareer.workforce.run);const scenario=r.p.webCareer.workforce.run.scenario.id;
 const step=r.view.controls.find(c=>c.label.includes('增加支援'));assert(step);r=await act(game,r,step.path);assert.equal(r.p.webCareer.workforce.run.support,1);
 const saved=game.get(g,u);r=await game.fullAction(g,u,{},options);assert.equal(r.p.webCareer.workforce.run.scenario.id,scenario);assert.equal(r.p.webCareer.workforce.run.support,1);
 let read=false;await handle({guildId:g,user:{id:'other'},customId:'web:'+u+':'+r.view.revision+':act:0',isChatInputCommand:()=>false,isButton:()=>true,isModalSubmit:()=>false,reply:async p=>assert.equal(p.flags,64)},{get:async()=>{read=true;}});assert.equal(read,false);
 assert.equal(saved.completed,r.p.completed);
 }finally{game.close();}
});

const paper={id:'fixture',year:115,track:'警察特考',grade:'三等',category:'行政警察人員',subject:'警察法規',questionCount:2,bank:'fixture',questionUrl:'https://wwwq.moex.gov.tw/exam/fixture-question',answerUrl:'https://wwwq.moex.gov.tw/exam/fixture-answer'};
const files={
 'manifest.json':{source:'考選部',sourceUrl:'https://wwwq.moex.gov.tw/exam/',declaration:'官方資料宣示',paperCount:1,questionCount:2,years:[{year:115,paperCount:1,questionCount:2,catalogFile:'115.catalog.json',bankFile:'115.json'}]},
 '115.catalog.json':{year:115,papers:[paper]},
 '115.json':{year:115,banks:{fixture:[[1,'官方題目甲',['甲','乙','丙','丁'],[0,2],1,'接受 A 或 C'],[2,'官方題目乙',['甲','乙','丙','丁'],[1],1,'']]}}
};
const historical={random:()=>.9,fetcher:async path=>({ok:true,json:async()=>structuredClone(files[String(path).split('/').at(-1)]||{meta:{},counties:{}})})};
test('historical source, accepted answers, archive filters and round survive restart without persisting large catalogs',async()=>{
 const game=new Game(':memory:');try{
 game.create(g,u,'考生','尚未分發');let r=await game.fullAction(g,u,{start:true},historical);
 async function click(path,value){const n=r.view.controls.findIndex(c=>c.path===path);assert(n>=0,path);r=await game.fullAction(g,u,{revision:r.view.revision,action:n,...(value!==undefined?{value}:{})},historical);validate(r.view);}
 r=await game.fullAction(g,u,{page:'academy'},historical);await click('#examArchiveOpenBtn');assert(r.view.controls.some(x=>x.path==='#examMixBtn'));
 r=await game.fullAction(g,u,{},historical);assert(r.view.controls.some(x=>x.path==='#examMixBtn'));assert.equal(r.p.webCareer.archive.papers,undefined);
 await click('#examMixBtn');assert(r.p.webCareer.archive.round);const question=r.p.webCareer.archive.round.items[0];
 r=await game.fullAction(g,u,{},historical);assert.equal(r.p.webCareer.archive.round.items[0].row[1],question.row[1]);
 const answer=r.view.controls.find(c=>c.label.startsWith(String.fromCharCode(65+question.row[3][0])+'.'));assert(answer);await click(answer.path);
 assert.equal(r.p.webCareer.state.quizCorrect,1);assert.equal(r.p.webCareer.archive.round.answers[0],true);assert(r.p.webCareer.practice.includes('fixture:'));
 r=await game.fullAction(g,u,{},historical);assert.equal(r.p.webCareer.state.quizCorrect,1);assert(r.view.controls.some(x=>x.path==='#examQuizNextBtn'));assert(!r.view.controls.some(x=>x.path.includes('#examQuizChoices')));
 assert(r.view.links.some(l=>l.url.includes('wwwq.moex.gov.tw')));
 }finally{game.close();}
});
test('complete entrance flow reaches a real assignment through web exam and distribution handlers',async()=>{
 const game=new Game(':memory:');try{
 game.create(g,u,'測試生涯','尚未分發');let r=await game.fullAction(g,u,{start:true},options);
 r=await act(game,r,'#createCharacterBtn');r=await act(game,r,r.view.controls.find(c=>c.label.includes('一般警察特考四等')).path);r=await act(game,r,'#confirmRouteBtn');
 for(const [idx,count] of [[1,15],[2,3],[3,5],[6,7]])for(let n=0;n<count;n++)r=await act(game,r,'#studyActions > div:nth-child('+idx+')');
 r=await act(game,r,'#writtenExamBtn');assert(r.p.webCareer.state.written>=55);r=await act(game,r,'#physicalExamBtn');assert(r.p.webCareer.state.physical>=55);
 r=await act(game,r,'#trainingBtn');assert.equal(r.p.webCareer.state.passed,true);
 const pref=r.view.controls.find(c=>c.path==='#pref1');r=await act(game,r,'#pref1',pref.options.find(x=>x.value).value);r=await act(game,r,'#runDistributionBtn');
 r=await act(game,r,'#unitCards > div:nth-child(1)');r=await act(game,r,'#confirmUnitBtn');assert(r.p.webCareer.state.pendingStationPick);r=await act(game,r,'#unitCards > div:nth-child(1)');r=await act(game,r,'#confirmUnitBtn');assert(r.p.webCareer.state.unit);assert.equal(r.p.webCareer.state.position,'警員');assert.equal(currentRank(r.p),'警佐三階');assert(!r.view.pages.some(x=>x.value==='command'));assert(preparePayload(fullCard(r.view,u)).files.length===1);
 }finally{game.close();}
});
test('senior training uses the web eligibility and immediately persists the 28-day completion',async()=>{
 const r=await runtime(null,options);try{
 const s=r.w.dcCore.state();Object.assign(s,{created:true,name:'主管',passed:true,route:'g3',position:'分局長',rank:'分局長',careerSequenceNo:4,officialRank:'警正一階',county:'新北市',unit:'admin',unitName:'新北市政府警察局',careerStage:'officer_rotation',joinDate:'2026-01-01T08:00:00',positionStartDate:'2026-01-01T08:00:00',simDate:'2032-01-01T08:00:00',simEpoch:new Date('2032-01-01T08:00:00').getTime(),appraisals:[{year:2015,grade:'甲等',type:'年度考績'},{year:2014,grade:'甲等',type:'年度考績'}],law:100,knowledge:100,service:100});s.maxSimEpoch=s.simEpoch;
 r.w.dcCore.replace(s);await r.act({kind:'page',value:'unit'});assert(r.view().controls.some(c=>c.path==='#policeMonitorTrainingBtn'));
 const before=r.w.dcCore.state().simEpoch;await r.act({kind:'click',path:'#policeMonitorTrainingBtn'});const saved=r.snapshot();assert.equal(saved.state.policeMonitorTrainingPassed,true);assert.equal(saved.state.simEpoch-before,28*86400000);
 const again=await runtime(saved,options);try{assert(again.d.getElementById('policeMonitorTrainingStatus').textContent.includes('警監班訓練完成'));assert(!again.view().controls.some(c=>c.path==='#policeMonitorTrainingBtn'));}finally{again.close();}
 }finally{r.close();}
});
test('Discord slash, input modal and dropdown work with early acknowledgements and persistent revisions',async()=>{
 const game=new Game(':memory:');game.remote=true;const raw=game.fullAction.bind(game);game.fullAction=(g,u,a)=>raw(g,u,a,options);
 function interaction({command,custom,modal=false,selected}={}){return {guildId:g,user:{id:u},commandName:command,customId:custom,deferred:false,replied:false,values:selected,calls:[],isChatInputCommand:()=>!!command,isButton:()=>!!custom&&!modal&&!selected,isModalSubmit:()=>modal,isStringSelectMenu:()=>!!selected,fields:{getTextInputValue:()=> '輸入姓名'},async deferReply(){this.deferred=true;this.calls.push('defer');},async deferUpdate(){this.deferred=true;this.calls.push('defer');},async editReply(p){this.calls.push(p);},async showModal(m){this.calls.push(m);},async reply(p){this.calls.push(p);}};}
 try{
 let i=interaction({command:'開始'});await handle(i,game);assert.equal(i.calls[0],'defer');assert(game.get(g,u).webCareer);
 let p=game.get(g,u),n=p.webView.actions.findIndex(a=>a.path==='#charName');i=interaction({custom:`web:${u}:${p.webView.revision}:edit:${n}`});await handle(i,game);assert.equal(i.deferred,false);assert(i.calls[0].toJSON().custom_id.includes(':input:'));
 i=interaction({custom:i.calls[0].toJSON().custom_id,modal:true});await handle(i,game);assert.equal(i.calls[0],'defer');
 p=game.get(g,u);n=p.webView.actions.findIndex(a=>a.path==='#charEducation');i=interaction({custom:`web:${u}:${p.webView.revision}:act:${n}`});await handle(i,game);assert(i.calls.at(-1).components[0].toJSON().components[0].options.length>0);
 i=interaction({custom:`web:${u}:${p.webView.revision}:select:${n}`,selected:['2']});await handle(i,game);assert.equal(i.calls[0],'defer');p=game.get(g,u);assert.equal(p.webCareer.inputs.find(a=>a.path==='#charEducation').value,'大學畢業');assert.equal(p.webCareer.inputs.find(a=>a.path==='#charName').value,'輸入姓名');
 }finally{game.close();}
});
test('shared rotation explains waiting and recovers accrued eligibility without adding time or lowering thresholds',async()=>{
 const r=await runtime(null,options);try{
 for(const [route,stage,seq,required] of [['g3','officer_initial',9,360],['g3','officer_rotation',9,540],['g4','patrol_rotation',10,540]]){
   const s=r.w.dcCore.state();Object.assign(s,{created:true,passed:true,route,county:'臺北市',precinct:'',unit:'admin',unitName:'臺北市政府警察局行政單位',assignmentType:'administration',position:seq===10?'巡佐':'巡官',rank:seq===10?'巡佐':'巡官',officialRank:seq===10?'警佐二階':'警正四階',careerSequenceNo:seq,careerStage:stage,rotationCycleDays:required-1,rotationEligible:false,rotationOffers:[],selectedUnit:''});
   r.w.dcCore.replace(s);await r.act({kind:'page',value:'unit'});assert.equal(r.w.dcCore.state().rotationEligible,false);assert(!r.view().controls.some(c=>c.path.startsWith('#unitCards')));
   if(stage==='officer_rotation')assert(r.view().text.includes('尚差 1 個月'));
   const ready=r.w.dcCore.state(),time=ready.simEpoch;ready.rotationCycleDays=required;r.w.dcCore.replace(ready);await r.act({kind:'page',value:'unit'});assert.equal(r.w.dcCore.state().rotationEligible,true);assert(r.view().controls.some(c=>c.path.startsWith('#unitCards')));assert.equal(r.w.dcCore.state().simEpoch,time);
 }
 }finally{r.close();}
});
test('imported patrol supervisors retain their ongoing rotation clock and open vacancies when the wait completes',async()=>{
 const game=new Game(':memory:');try{
 game.create(g,u,'巡佐','新北市政府警察局');game.transaction(g,u,p=>Object.assign(p,{stage:1,completed:40,month:40,appointed:12,lastRotation:22}));
 const r=await game.fullAction(g,u,{start:true},options);assert.equal(r.p.webCareer.state.careerStage,'patrol_rotation');
 const opened=await game.fullAction(g,u,{page:'unit',rotation:true},options);assert(opened.view.controls.some(c=>c.path.startsWith('#unitCards')));assert(opened.p.webCareer.state.rotationOffers.some(o=>o.position==='巡佐兼副所長'));
 }finally{game.close();}
});

test('duty card presents only question, direct answers and analysis with one insignia; quick navigation closes dialogs',async()=>{
 const game=new Game(':memory:');try{
 game.create(g,u,'鍾SIR','花蓮縣警察局吉安分局偵查隊');game.transaction(g,u,p=>Object.assign(p,{stage:1,month:40,completed:43,post:{unit:p.unit,role:{title:'偵查佐',deck:'criminal',authority:'staff'}}}));
 let r=await game.fullAction(g,u,{start:true},options);r=await game.fullAction(g,u,{page:'duty'},options);r=await act(game,r,'#nextDutyBtn');
 assert.equal(r.view.compact.mode,'question');let payload=validate(r.view),e=payload.embeds[0].toJSON(),rows=payload.components.map(r=>r.toJSON().components);
 assert.equal(payload.content,'');assert(e.thumbnail);assert(!e.image);assert(!/勤務數據|值勤原則|混合派題/.test(e.description));assert.deepEqual(rows[0].map(b=>b.label),['勤務','角色','輪調','升遷','更多']);assert.deepEqual(rows[1].map(b=>b.label),['A','B','C','D']);
 const ans=r.view.controls.find(c=>c.path.startsWith('#dutyChoices >'));r=await act(game,r,ans.path);payload=validate(r.view);assert(payload.embeds[0].toJSON().description.includes('作答解析'));assert(payload.components.some(row=>row.toJSON().components.some(b=>b.label==='下一題')));
 const menu=fullCard(r.view,u,{menu:true});assert(menu.components.length<=5);assert(menu.components.every(row=>row.toJSON().components.every(b=>b.type===2)));assert.equal(menu.embeds[0].toJSON().description,'點選下方按鈕切換功能。');
 r=await game.fullAction(g,u,{page:'academy'},historical);const open=r.view.controls.findIndex(c=>c.path==='#examArchiveOpenBtn');r=await game.fullAction(g,u,{revision:r.view.revision,action:open},historical);r=await game.fullAction(g,u,{page:'dashboard'},historical);assert.equal(r.view.compact.mode,'summary');assert(!r.view.controls.some(c=>c.path==='#examMixBtn'));
 }finally{game.close();}
});
test('long question text is completely reachable without exceeding Discord embed limits',()=>{
 const body='長題幹'.repeat(2300),view={title:'勤務中心',role:'偵查佐',date:'2013',revision:'r',pages:[],controls:[],rank:'—',compact:{mode:'question',meta:'角色',text:body,primary:[]}};
 let joined='';for(let display=0;display<Math.ceil(body.length/2700);display++){const p=fullCard({...view,display},u);const e=p.embeds[0].toJSON();assert(e.description.length<=4096);assert(p.components.length<=5);joined+=e.description.split('\n\n')[1];}assert.equal(joined,body);
});
test('shared rotation exposes all 21 external counties in four-choice pages without resetting rank or time',async()=>{
 const r=await runtime(null,options);try{
 const s=r.w.dcCore.state();Object.assign(s,{created:true,name:'巡佐',passed:true,route:'g4',county:'花蓮縣',localAgency:'花蓮縣警察局',unit:'criminal',unitName:'花蓮縣警察局吉安分局偵查隊',assignmentType:'criminal',position:'偵查佐',rank:'偵查佐',officialRank:'警佐二階',careerSequenceNo:10,careerStage:'patrol_rotation',rotationCycleDays:540,rotationEligible:true,rotationOffers:[],selectedUnit:''});
 r.w.dcCore.replace(s);await r.act({kind:'page',value:'unit'});const v=r.view();assert.equal(v.compact.mode,'vacancies');const offers=r.w.dcCore.state().rotationOffers;
 for(const county of ['臺北市','基隆市','臺東縣','澎湖縣','金門縣','連江縣'])assert(offers.some(o=>o.county===county),county);
 assert.equal(new Set(offers.filter(o=>o.county&&o.county!=='花蓮縣').map(o=>o.county)).size,21);
 const card=fullCard({...v,revision:'r'},u);assert(card.components.length<=5);assert(card.components.some(row=>row.toJSON().components.some(b=>b.label==='下一頁職缺／操作')));assert.equal(r.w.dcCore.state().officialRank,'警佐二階');assert.equal(r.w.dcCore.state().simEpoch,s.simEpoch);
 }finally{r.close();}
});
