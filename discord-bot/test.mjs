import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Game, GameError, stages, cases } from './game.mjs';
import { handle, missionCard, profile, resultCard, historyCard, promotionCard, creationModal, vacancyCard } from './ui.mjs';
import { register, commands } from './register.mjs';
import { config } from './config.mjs';
import { cloudContext, startCloud, safeStartupFailure } from './cloud.mjs';
import { EventEmitter } from 'node:events';
import { Events,MessagePayload } from 'discord.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { preparePayload,withInsignia } from './insignia.mjs';
import { EmbedBuilder } from 'discord.js';
import { careerRole,currentRank,positionSummary,nextStage,careerDisplayOrder } from './career.mjs';
const g='111111111111111111',u='222222222222222222',other='333333333333333333';
const create=game=>game.create(g,u,'測試警員','新北市政府警察局板橋分局某派出所');
function finish(game,quality=100,kind='duty'){
  const {mission}=game.mission(g,u,kind);
  return game.answer(g,u,u,mission.id,mission.choices.findIndex(c=>c.quality===quality));
}
function years(game,n){for(let i=0;i<n*12;i++)finish(game);}
function valid(payload){
  assert(payload.embeds.length<=10);
  let total=0;
  for(const embed of payload.embeds){const e=embed.toJSON();assert(e.description.length<=4096);total+=e.description.length+e.title.length+(e.footer?.text.length||0);}
  assert(total<=6000);
  for(const row of payload.components||[])for(const c of row.toJSON().components){assert(c.custom_id.length<=100);assert(c.label.length<=80);}
}
function mock({command='任務',button,modal,actor=u,guild=g}={}){
  const i={guildId:guild,user:{id:actor},commandName:command,customId:button||modal,replied:false,calls:[],
    isChatInputCommand:()=>!button&&!modal,isButton:()=>!!button,isModalSubmit:()=>!!modal,
    reply:async function(p){this.replied=true;this.calls.push(['reply',p]);},
    update:async function(p){this.replied=true;this.calls.push(['update',p]);},
    showModal:async function(p){this.replied=true;this.calls.push(['modal',p]);},
    fields:{getTextInputValue:key=>key==='name'?'新玩家':'某縣市某分局某派出所'}};
  return i;
}
test('existing website cases are complete, valid and available for every career stage',()=>{
  assert.equal(Object.values(cases).flat().length,60);assert.equal(Object.keys(cases).length,18);
  for(const deck of Object.values(cases))for(const c of deck){assert.equal(c.choices.length,3);assert(c.analysis);}
  for(const s of stages)assert(cases[s.deck]?.length);
});
test('creation is appointed officer; existing characters and other users/servers are isolated',()=>{
  const game=new Game(':memory:');try{
    const p=create(game);assert.equal(p.stage,0);assert.equal(p.month,0);assert.equal(p.merit,0);
    assert.throws(()=>create(game),GameError);
    assert.throws(()=>game.create(g,other,' ','某單位'),GameError);
    game.create(g,other,'其他玩家','其他單位');game.create('other-guild',u,'另一服角色','其他單位');
    finish(game);assert.equal(game.get(g,other).month,0);assert.equal(game.get('other-guild',u).merit,0);
  }finally{game.close();}
});
test('pending missions persist across database reopen; owner check, malformed and duplicate answers cannot give merit',()=>{
  const dir=mkdtempSync(join(tmpdir(),'police-bot-')),path=join(dir,'save.sqlite');let game=new Game(path);
  try{
    create(game);const first=game.mission(g,u).mission;
    assert.deepEqual(game.mission(g,u).mission,first);
    game.close();game=new Game(path);assert.deepEqual(game.mission(g,u).mission,first);
    assert.throws(()=>game.answer(g,other,u,first.id,0),/另一位/);
    assert.throws(()=>game.answer(g,u,u,first.id,NaN),/無效/);
    assert(game.get(g,u).pending);
    const result=game.answer(g,u,u,first.id,first.choices.findIndex(c=>c.quality===100));
    assert.equal(result.after,.2);assert.equal(result.p.month,1);assert.equal(result.p.completed,1);
    assert.throws(()=>game.answer(g,u,u,first.id,0),/結算/);
    const second=game.mission(g,u).mission;
    assert.throws(()=>game.answer(g,u,u,first.id,0),/過期/);
    assert.equal(game.get(g,u).pending.id,second.id);
    assert.equal(game.get(g,u).merit,.2);
  }finally{game.close();rmSync(dir,{recursive:true});}
});
test('all patrol cases appear in a cycle and consecutive cases do not repeat',()=>{
  const game=new Game(':memory:');try{
    create(game);const titles=[];
    for(let i=0;i<18;i++){titles.push(game.mission(g,u).mission.title);finish(game);}
    assert.equal(new Set(titles.slice(0,9)).size,9);
    for(let i=1;i<titles.length;i++)assert.notEqual(titles[i],titles[i-1]);
  }finally{game.close();}
});
test('annual appraisals settle once and two qualifying years gate first promotion',()=>{
  const game=new Game(':memory:');try{
    create(game);assert.throws(()=>game.promote(g,u,0),/尚未/);
    years(game,1);assert.equal(game.get(g,u).appraisals[0].grade,'A');
    assert(!game.requirements(game.get(g,u)).ready);
    years(game,1);let p=game.get(g,u);assert.equal(p.appraisals.length,2);assert.equal(p.merit,4.8);
    assert(game.requirements(p).ready);
    p=game.promote(g,u,0);assert.equal(p.stage,1);assert.equal(p.stageMerit,4.8);
    assert.throws(()=>game.promote(g,u,0),/過期/);assert.throws(()=>game.promote(g,u,1),/尚未/);
    const m=game.mission(g,u).mission;assert(cases.patrol.some(c=>c.title===m.title));
    assert(game.requirements(game.get(g,u)).lines.some(l=>l.includes('先完成')));
  }finally{game.close();}
});
test('poor annual appraisal blocks promotion even with merit and years; risky work gives no merit',()=>{
  const game=new Game(':memory:');try{
    create(game);years(game,2);
    for(let i=0;i<12;i++)finish(game,20);
    const p=game.get(g,u);assert.equal(p.merit,4.8);assert.equal(p.month,36);assert.equal(p.appraisals.at(-1).grade,'C');
    assert(!game.requirements(p).ready);assert.throws(()=>game.promote(g,u,0),/尚未/);
  }finally{game.close();}
});
test('training progresses, resets on incorrect answer, settles immediately and cannot be farmed for merit',()=>{
  const game=new Game(':memory:');try{
    create(game);assert.throws(()=>game.mission(g,u,'training'),/沒有待完成/);
    years(game,2);game.promote(g,u,0);years(game,3);
    assert(!game.requirements(game.get(g,u)).ready);
    const before=game.get(g,u);finish(game,100,'training');assert.equal(game.get(g,u).trainingProgress,1);
    finish(game,60,'training');assert.equal(game.get(g,u).trainingProgress,0);
    for(let i=0;i<3;i++)finish(game,100,'training');
    const after=game.get(g,u);assert(after.trained.includes(stages[2].training));assert.equal(after.month,before.month);assert.equal(after.merit,before.merit);
    assert.throws(()=>game.mission(g,u,'training'),/沒有待完成/);
    assert(game.requirements(after).ready);assert.equal(game.promote(g,u,1).stage,2);
  }finally{game.close();}
});
test('entire career plays through role changes with valid Discord embeds, no instant promotion and retirement',()=>{
  const game=new Game(':memory:');try{
    create(game);
    for(const stage of careerDisplayOrder){
      let p=game.get(g,u);assert.equal(p.stage,stage);valid(profile(p,u));valid(promotionCard(game,p,u));
      const m=game.mission(g,u).mission;assert(cases[stages[stage].deck].some(c=>c.title===m.title));
      valid(missionCard(p,m,u));valid(resultCard(finish(game),u));
      if(nextStage(p)===null)break;
      const months=stages[stage].years*12-1;for(let i=0;i<months;i++)finish(game);
      p=game.get(g,u);if(stages[nextStage(p)].training)for(let i=0;i<3;i++)finish(game,100,'training');
      assert(game.requirements(game.get(g,u)).ready);game.promote(g,u,stage);
    }
    valid(historyCard(game.get(g,u),u));
    while(game.get(g,u).month<516)finish(game);
    assert.throws(()=>game.mission(g,u),/退休/);
    valid(profile(game.get(g,u),u));assert(game.get(g,u).merit>6);
  }finally{game.close();}
});
test('Discord command/modal/button lifecycle, public replies and private replay errors',async()=>{
  const game=new Game(':memory:');try{
    creationModal().toJSON();
    let i=mock({modal:'create-career'});await handle(i,game);assert.equal(i.calls[0][1].flags,0);assert.equal(game.get(g,u).stage,0);
    i=mock({command:'開始'});await handle(i,game);assert.equal(i.calls[0][0],'reply');assert.match(i.calls[0][1].embeds[0].data.title,/新玩家/);
    i=mock();await handle(i,game);const payload=i.calls[0][1];valid(payload);
    const id=payload.components[0].toJSON().components[0].custom_id;
    i=mock({button:id,actor:other});await handle(i,game);assert.equal(i.calls[0][0],'reply');assert.equal(i.calls[0][1].flags,64);assert(game.get(g,u).pending);
    i=mock({button:id});await handle(i,game);assert.equal(i.calls[0][0],'update');assert.equal(game.get(g,u).completed,1);
    i=mock({button:id});await handle(i,game);assert.equal(i.calls[0][0],'reply');assert.equal(game.get(g,u).completed,1);
    i=mock({guild:null});await handle(i,game);assert.match(i.calls[0][1].content,/伺服器/);
    i=mock({command:'角色',actor:other});await handle(i,game);assert.match(i.calls[0][1].content,/開始/);
  }finally{game.close();}
});
test('registration upserts only game commands and validates matching application; config rejects blanks',async()=>{
  const c={application:g,guild:u},calls=[];
  await register({get:async()=>({id:g}),post:async(path,{body})=>{calls.push({path,body});}},c);
  assert.equal(calls.length,10);assert.equal(new Set(commands.map(c=>c.name)).size,10);
  assert(calls.every(c=>c.path.includes('/guilds/'+u+'/commands')));
  await assert.rejects(()=>register({get:async()=>({id:other})},c),/同一個/);
  assert.throws(()=>config({}),/請先/);
  assert.equal(config({DISCORD_TOKEN:'local-only-test',DISCORD_APPLICATION_ID:g,DISCORD_GUILD_ID:u}).guild,u);
});
test('cloud startup infers application and sole guild; ambiguous or absent guild requires owner configuration',()=>{
  const ready=ids=>({application:{id:g},guilds:{cache:new Map(ids.map(id=>[id,{}]))}});
  assert.deepEqual(cloudContext(ready([u]),{}),{application:g,guild:u});
  assert.throws(()=>cloudContext(ready([]),{}),/邀請/);
  assert.throws(()=>cloudContext(ready([u,other]),{}),/多個/);
  assert.deepEqual(cloudContext(ready([u,other]),{DISCORD_GUILD_ID:other}),{application:g,guild:other});
  assert.throws(()=>cloudContext(ready([u]),{DISCORD_GUILD_ID:other}),/尚未加入/);
  assert.throws(()=>cloudContext(ready([u]),{DISCORD_APPLICATION_ID:other}),/不符/);
});
test('cloud connects and registers before serving interactions; no .env needed and shutdown closes database',async()=>{
  class FakeClient extends EventEmitter{
    application={id:g};guilds={cache:new Map([[u,{}]])};destroyed=false;
    async login(token){assert.equal(token,'fake-local-only');queueMicrotask(()=>this.emit(Events.ClientReady,this));}
    destroy(){this.destroyed=true;}
  }
  const client=new FakeClient(),registered=[],logs=[];let db;
  const app=await startCloud({env:{DISCORD_TOKEN:'fake-local-only',DISCORD_DB_PATH:':memory:'},client,
    restFactory:()=>({get:async()=>({id:g}),post:async(_,body)=>registered.push(body)}),
    gameFactory:path=>(db=new Game(path)),logger:{log:x=>logs.push(x),error:()=>{}}});
  assert.equal(registered.length,10);assert.equal(app.scope.guild,u);assert.equal(client.listenerCount(Events.InteractionCreate),1);
  assert(logs.some(x=>x.includes('已上線')));assert(logs.every(x=>!x.includes('fake-local-only')));
  app.stop();app.stop();assert(client.destroyed);assert.throws(()=>db.get(g,u),/closed|not open/i);
  await assert.rejects(()=>startCloud({env:{},client:new FakeClient()}),/DISCORD_TOKEN/);
});
test('cloud failed registration destroys connection and closes save without reporting online',async()=>{
  class FakeClient extends EventEmitter{
    application={id:g};guilds={cache:new Map([[u,{}]])};destroyed=false;
    async login(){queueMicrotask(()=>this.emit(Events.ClientReady,this));}
    destroy(){this.destroyed=true;}
  }
  const client=new FakeClient(),logs=[];let db;
  await assert.rejects(()=>startCloud({env:{DISCORD_TOKEN:'fake-local-only'},client,
    restFactory:()=>({get:async()=>({id:g}),post:async()=>{throw new Error('registration failed');}}),
    gameFactory:()=>(db=new Game(':memory:')),logger:{log:x=>logs.push(x),error:()=>{}}}),/registration failed/);
  assert(client.destroyed);assert.equal(logs.length,0);assert.throws(()=>db.get(g,u),/closed|not open/i);
});
test('cloud diagnostics identify the failing stage without logging request payloads or secret error messages',()=>{
  const secret='fake-token-not-for-logs';
  assert.equal(safeStartupFailure({cloudPhase:'login',code:'TokenInvalid',message:secret}),'Discord 登入失敗（代碼 TokenInvalid）');
  assert.equal(safeStartupFailure({cloudPhase:'save',code:'ERR_SQLITE_ERROR',message:secret}),'持久存檔初始化失敗（代碼 ERR_SQLITE_ERROR）');
  assert.equal(safeStartupFailure({cloudPhase:'commands',code:50001,message:secret}),'註冊指令失敗（代碼 50001）');
  assert(!safeStartupFailure({message:secret,code:'not allowed / value'}).includes(secret));
  assert.match(safeStartupFailure({message:secret,code:'not allowed / value'}),/UNKNOWN/);
});
test('official position ranges and duty insignia do not collapse into a fixed personal rank',()=>{
  const municipal=stage=>careerRole({stage,unit:'新北市政府警察局板橋分局某派出所'});
  const county=stage=>careerRole({stage,unit:'花蓮縣警察局吉安分局某派出所'});
  assert.equal(municipal(2).rankRange,'警佐一階至警正三階');assert.equal(municipal(2).badge,'二線一星');
  assert.equal(municipal(3).rankRange,'警佐一階至警正三階');assert.equal(municipal(3).badge,'二線二星');
  assert.equal(municipal(4).rankRange,'警正四階至警正二階');assert.equal(municipal(4).badge,'二線三星');
  assert.equal(municipal(7).rankRange,'警監一階');assert.equal(municipal(7).rank,'警監一階');
  assert.equal(county(5).rankRange,'警正二階至警正一階');assert.equal(county(5).badge,'二線四星');
  assert.equal(county(6).rankRange,'警正一階至警監四階');assert.equal(county(6).badge,'三線一星');
  assert.equal(county(7).rankRange,'警監四階至警監三階');assert.equal(county(7).badge,'三線二星');
  for(let stage=0;stage<stages.length;stage++)for(const role of [municipal(stage),county(stage)])assert(role.allowedRanks.includes(role.rank));
  const a={stage:2,unit:'新北市某派出所',personalRank:'警佐一階'},b={...a,personalRank:'警正四階'};
  assert.notEqual(currentRank(a),currentRank(b));assert.equal(careerRole(a).badge,careerRole(b).badge);
  assert(positionSummary(careerRole(a)).includes('第 9 序列'));
});
test('legacy career upgrade corrects rank context while preserving progress, pending case and channel message IDs',()=>{
  const dir=mkdtempSync(join(tmpdir(),'police-ranks-')),path=join(dir,'save.sqlite');let game=new Game(path);
  try{
    const p=create(game);p.stage=7;p.month=240;p.appointed=220;p.merit=41.2;p.completed=240;p.trained=['已完成研習'];p.pending={id:'existing-case',kind:'duty',choices:[],title:'保留案件'};
    delete p.personalRank;delete p.homeUnit;delete p.careerModelVersion;
    game.db.prepare('UPDATE players SET state=? WHERE guild=? AND user=?').run(JSON.stringify(p),g,u);
    game.setSettings(g,{play:'existing-channel'});game.setMessage(g,'existing-channel','lobby','existing-message');game.close();game=new Game(path);
    const upgraded=game.get(g,u);assert.equal(upgraded.personalRank,'警監一階');assert.equal(upgraded.homeUnit,p.unit);assert.equal(upgraded.unit,'新北市政府警察局');
    for(const key of ['stage','month','appointed','merit','completed','trained','pending','history','yearScores','appraisals'])assert.deepEqual(upgraded[key],p[key]);
    assert.equal(game.settings(g).play,'existing-channel');assert.equal(game.message(g,'existing-channel','lobby'),'existing-message');
    game.close();game=new Game(path);assert.deepEqual(game.get(g,u),upgraded);
  }finally{game.close();rmSync(dir,{recursive:true});}
});
test('personal rank never falls on promotion and stays in the target official range; county units retain their own track',()=>{
  const game=new Game(':memory:');try{
    create(game);game.transaction(g,u,p=>{p.personalRank='警正四階';});years(game,2);
    const p=game.promote(g,u,0);assert.equal(p.personalRank,'警正四階');assert.equal(careerRole(p).badge,'一線四星');
  }finally{game.close();}
  const countyGame=new Game(':memory:');try{
    countyGame.create(g,u,'縣市角色','花蓮縣警察局吉安分局某派出所');
    for(let stage=0;stage<7;stage++){
      years(countyGame,stages[stage].years);if(stages[stage+1].training)for(let i=0;i<3;i++)finish(countyGame,100,'training');
      const p=countyGame.promote(g,u,stage);assert(careerRole(p).allowedRanks.includes(p.personalRank));
      assert.equal(p.homeUnit,'花蓮縣警察局吉安分局某派出所');
      if(p.stage===4)assert(p.unit.includes('警政署'));if(p.stage===5)assert.equal(p.unit,'花蓮縣警察局吉安分局');
    }
    const chief=countyGame.get(g,u);assert.equal(chief.personalRank,'警監三階');assert.equal(careerRole(chief).badge,'三線二星');assert.equal(chief.unit,'花蓮縣警察局');
  }finally{countyGame.close();}
});

test('players choose ordinary or concurrent posts; rotation preserves promotion progress and changes duties',()=>{
  const game=new Game(':memory:');try{
    create(game);years(game,2);
    let {p,offer}=game.offers(g,u,'promotion');
    assert(offer.rows.some(r=>r.role.title==='巡佐'));
    assert(offer.rows.some(r=>r.role.title==='巡佐兼副所長'));
    assert(offer.rows.some(r=>r.unit.includes('屏東縣')));
    for(let page=0;page<Math.ceil(offer.rows.length/4);page++)valid(vacancyCard(p,offer,u,page));
    const oldToken=offer.id;
    p=game.appoint(g,u,offer.id,offer.rows.findIndex(r=>r.role.title==='巡佐'));
    assert.equal(careerRole(p).title,'巡佐');assert.equal(careerRole(p).deck,'patrol');
    assert.throws(()=>game.appoint(g,u,oldToken,0),/過期/);
    assert.throws(()=>game.offers(g,u,'rotation'),/18/);
    for(let i=0;i<18;i++)finish(game);
    const before=game.get(g,u);
    ({offer}=game.offers(g,u,'rotation'));
    assert.throws(()=>game.appoint(g,u,offer.id,999),/無效/);
    p=game.appoint(g,u,offer.id,offer.rows.findIndex(r=>r.role.title==='巡佐兼副所長'));
    assert.equal(careerRole(p).deck,'station_lead');
    for(const key of ['stage','appointed','stageMerit','merit','appraisals','trained','month'])assert.deepEqual(p[key],before[key]);
    const m=game.mission(g,u).mission;assert(cases.station_lead.some(c=>c.title===m.title));
    assert.throws(()=>game.offers(g,u,'rotation'),/先完成/);
  }finally{game.close();}
});
test('vacancy choices persist; newer lists invalidate old buttons and spectators cannot appoint',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'police-posts-')),path=join(dir,'save.sqlite');let game=new Game(path);
  try{
    create(game);years(game,2);const first=game.offers(g,u,'promotion').offer;
    game.close();game=new Game(path);assert.deepEqual(game.get(g,u).offer,first);
    let i=mock({button:`choose:${u}:${first.id}:0`,actor:other});await handle(i,game);
    assert.equal(i.calls[0][1].flags,64);assert.equal(game.get(g,u).stage,0);
    const second=game.offers(g,u,'promotion').offer;
    assert.throws(()=>game.appoint(g,u,first.id,0),/過期/);
    i=mock({button:`choose:${u}:${second.id}:1`});await handle(i,game);
    assert.equal(i.calls[0][0],'update');assert.equal(careerRole(game.get(g,u)).title,'警務佐');
    assert.equal(careerRole(game.get(g,u)).deck,'staff');
    const m=game.mission(g,u).mission;assert(cases.staff.some(c=>c.title===m.title));
    game.close();game=new Game(path);assert.equal(careerRole(game.get(g,u)).title,'警務佐');
  }finally{game.close();rmSync(dir,{recursive:true});}
});
test('existing concurrent appointments remain until player chooses a change, without resetting progress',()=>{
  const game=new Game(':memory:');try{
    const p=create(game);p.stage=2;p.careerModelVersion=2;p.month=80;p.personalRank='警正四階';
    game.db.prepare('UPDATE players SET state=? WHERE guild=? AND user=?').run(JSON.stringify(p),g,u);
    const old=game.get(g,u);assert.equal(careerRole(old).title,'巡官兼所長');assert.equal(old.month,80);
    const {offer}=game.offers(g,u,'rotation');
    const changed=game.appoint(g,u,offer.id,offer.rows.findIndex(r=>r.role.title==='巡官'));
    assert.equal(careerRole(changed).title,'巡官');assert.equal(changed.month,80);assert.equal(changed.personalRank,'警正四階');
  }finally{game.close();}
});

test('cross-county choices carry the new agency context into later appointments',()=>{
  const game=new Game(':memory:');try{
    create(game);years(game,1);
    const {offer}=game.offers(g,u,'rotation');
    const p=game.appoint(g,u,offer.id,offer.rows.findIndex(r=>r.unit.includes('屏東縣')));
    assert.equal(careerRole(p,5).sequence,5);assert.equal(careerRole(p,5).badge,'二線四星');
    assert(p.homeUnit.includes('新北市'));assert(p.careerHome.includes('屏東縣'));
  }finally{game.close();}
});

test('municipal career includes two-line four-star deputy precinct chief; county chief and legacy progress stay intact',()=>{
  const game=new Game(':memory:');try{
    create(game);game.transaction(g,u,p=>{p.stage=4;p.month=240;p.appointed=180;p.merit=40;p.stageMerit=20;p.appraisals=[{grade:'A'},{grade:'A'}];});
    const {p,offer}=game.offers(g,u,'promotion');assert.equal(offer.target,9);
    assert.equal(game.requirements(p).next.badge,'二線四星');
    const appointed=game.appoint(g,u,offer.id,0);assert.equal(careerRole(appointed).title,'副分局長');assert.equal(careerRole(appointed).badge,'二線四星');
    assert.equal(nextStage(appointed),5);assert.equal(nextStage({stage:4,unit:'花蓮縣警察局'}),5);
    assert.equal(nextStage({stage:8,unit:'新北市警察局'}),null);
    assert.equal(careerRole({stage:5,unit:'花蓮縣警察局'}).badge,'二線四星');
  }finally{game.close();}
});
test('role, mission, result, promotion and vacancy cards show matching PNG insignia thumbnails',()=>{
  const game=new Game(':memory:');try{
    create(game);let p=game.get(g,u);let m=game.mission(g,u).mission;
    for(const card of [profile(p,u),missionCard(p,m,u),resultCard(finish(game),u)]){
      valid(card);assert.match(card.embeds[0].toJSON().thumbnail.url,/^attachment:\/\/rank-10.png$/);
    }
    years(game,2);p=game.get(g,u);const q=promotionCard(game,p,u);assert.match(q.embeds[0].toJSON().thumbnail.url,/rank-09.png$/);
    const x=game.offers(g,u,'promotion');valid(vacancyCard(x.p,x.offer,u));assert.match(vacancyCard(x.p,x.offer,u).embeds[0].toJSON().thumbnail.url,/rank-09.png$/);
  }finally{game.close();}
});

test('every insignia is a real bundled PNG; multipart sends and edits carry one file, a heading, and no stale attachments',async()=>{
  for(const badge of new Set(stages.map(r=>r.badge))){
    const payload=preparePayload({embeds:[withInsignia(new EmbedBuilder().setTitle('測試角色').setDescription('職務資訊'),{badge})],components:[]});
    assert.equal(payload.content,'## 測試角色');assert.equal(payload.files.length,1);assert.deepEqual(payload.attachments,[]);
    const file=payload.files[0];assert.equal(file.attachment.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(file.attachment.readUInt32BE(16),960);assert.equal(file.attachment.readUInt32BE(20),276);
    const data=payload.embeds[0].toJSON();assert.equal(data.image.url,'attachment://'+file.name);assert.equal(data.thumbnail.url,data.image.url);
    const message=MessagePayload.create({},payload);await message.resolveFiles();assert.equal(message.files.length,1);assert.equal(message.files[0].name,file.name);
  }
  const game=new Game(':memory:');try{
    create(game);const i=mock({command:'角色'});await handle(i,game);
    assert(i.calls[0][1].content.startsWith('## '));assert.equal(i.calls[0][1].files.length,1);
    const j=mock({button:'nav:'+u+':mission'});await handle(j,game);assert.equal(j.calls[0][0],'update');assert.equal(j.calls[0][1].files.length,1);assert.deepEqual(j.calls[0][1].attachments,[]);
  }finally{game.close();}
});

test('bundled images match the downloaded original Wikimedia PNG bytes exactly',()=>{
  const sources=JSON.parse(readFileSync(new URL('insignia-sources.json',import.meta.url)));
  const assets=JSON.parse(readFileSync(new URL('insignia-assets.json',import.meta.url)));
  assert.equal(sources.files.length,10);assert.equal(sources.author,'Akira123');
  for(const item of sources.files){
    const data=Buffer.from(assets[item.file],'base64');
    assert.equal(data.length,item.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),item.sha256);
    assert(item.source.startsWith('https://commons.wikimedia.org/wiki/File:TW-Police-Rank_'));
  }
});
