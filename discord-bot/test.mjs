import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Game, GameError, stages, cases } from './game.mjs';
import { handle, missionCard, profile, resultCard, historyCard, promotionCard, creationModal } from './ui.mjs';
import { register, commands } from './register.mjs';
import { config } from './config.mjs';
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
    const m=game.mission(g,u).mission;assert(cases.station_lead.some(c=>c.title===m.title));
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
    for(let stage=0;stage<stages.length;stage++){
      let p=game.get(g,u);assert.equal(p.stage,stage);valid(profile(p,u));valid(promotionCard(game,p,u));
      const m=game.mission(g,u).mission;assert(cases[stages[stage].deck].some(c=>c.title===m.title));
      valid(missionCard(p,m,u));valid(resultCard(finish(game),u));
      if(stage===stages.length-1)break;
      const months=stages[stage].years*12-1;for(let i=0;i<months;i++)finish(game);
      p=game.get(g,u);if(stages[stage+1].training)for(let i=0;i<3;i++)finish(game,100,'training');
      assert(game.requirements(game.get(g,u)).ready);game.promote(g,u,stage);
    }
    valid(historyCard(game.get(g,u),u));
    while(game.get(g,u).month<516)finish(game);
    assert.throws(()=>game.mission(g,u),/退休/);
    valid(profile(game.get(g,u),u));assert(game.get(g,u).merit>6);
  }finally{game.close();}
});
test('Discord command/modal/button lifecycle, private replies and replay protection',async()=>{
  const game=new Game(':memory:');try{
    let i=mock({command:'開始'});await handle(i,game);assert.equal(i.calls[0][0],'modal');creationModal().toJSON();
    i=mock({modal:'create-career'});await handle(i,game);assert.equal(i.calls[0][1].flags,64);assert.equal(game.get(g,u).stage,0);
    i=mock();await handle(i,game);const payload=i.calls[0][1];valid(payload);
    const id=payload.components[0].toJSON().components[0].custom_id;
    i=mock({button:id,actor:other});await handle(i,game);assert.equal(i.calls[0][0],'reply');assert(game.get(g,u).pending);
    i=mock({button:id});await handle(i,game);assert.equal(i.calls[0][0],'update');assert.equal(game.get(g,u).completed,1);
    i=mock({button:id});await handle(i,game);assert.equal(i.calls[0][0],'reply');assert.equal(game.get(g,u).completed,1);
    i=mock({guild:null});await handle(i,game);assert.match(i.calls[0][1].content,/伺服器/);
    i=mock({command:'角色',actor:other});await handle(i,game);assert.match(i.calls[0][1].content,/開始/);
  }finally{game.close();}
});
test('registration upserts only seven named commands and validates matching application; config rejects blanks',async()=>{
  const c={application:g,guild:u},calls=[];
  await register({get:async()=>({id:g}),post:async(path,{body})=>{calls.push({path,body});}},c);
  assert.equal(calls.length,7);assert.equal(new Set(commands.map(c=>c.name)).size,7);
  assert(calls.every(c=>c.path.includes('/guilds/'+u+'/commands')));
  await assert.rejects(()=>register({get:async()=>({id:other})},c),/同一個/);
  assert.throws(()=>config({}),/請先/);
  assert.equal(config({DISCORD_TOKEN:'local-only-test',DISCORD_APPLICATION_ID:g,DISCORD_GUILD_ID:u}).guild,u);
});
