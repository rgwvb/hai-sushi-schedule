import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from './game.mjs';
import {FirestoreGame,migrateSqlite,createGame} from './firestore-game.mjs';
import {handle} from './ui.mjs';
import {startCloud} from './cloud.mjs';
import {EventEmitter} from 'node:events';
import {Events} from 'discord.js';
class FakeFirestore {
  docs=new Map();queue=Promise.resolve();fail=false;
  snap(path){const d=this.docs.get(path);return {exists:!!d,data:()=>structuredClone(d)};}
  collection(name){const db=this;return {doc(id){const path=name+'/'+id;return {path,get:async()=>db.snap(path),set:async value=>db.docs.set(path,structuredClone(value))};},where(field,op,value){assert.equal(op,'==');return {get:async()=>({docs:[...db.docs].filter(([p,d])=>p.startsWith(name+'/')&&d[field]===value).map(([p])=>db.snap(p))})};}};}
  runTransaction(fn){const run=this.queue.catch(()=>{}).then(async()=>{const staged=[];const result=await fn({get:async ref=>this.snap(ref.path),set:(ref,data)=>staged.push([ref.path,structuredClone(data)])});if(this.fail)throw Error('network unavailable');for(const [path,data] of staged)this.docs.set(path,data);return result;});this.queue=run;return run;}
}
test('Firestore persistence survives restart, scopes users/guilds and atomically rejects replay',async()=>{
  const db=new FakeFirestore(),game=new FirestoreGame(db);
  try{
    await game.create('g','u','玩家','新北市警察局');await game.create('g2','u','別服','其他單位');
    const {mission}=await game.mission('g','u'),quality=mission.choices.findIndex(c=>c.quality===100);
    game.close();const other=new FirestoreGame(db);
    try{
      assert.deepEqual((await other.get('g','u')).pending,mission);
      const results=await Promise.allSettled([other.answer('g','u','u',mission.id,quality),other.answer('g','u','u',mission.id,quality)]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await other.get('g','u')).merit,.2);
      assert.equal((await other.get('g2','u')).merit,0);assert.equal((await other.players('g')).length,1);
      db.fail=true;await assert.rejects(()=>other.mission('g','u'));db.fail=false;assert.equal((await other.get('g','u')).pending,null);
    }finally{other.close();}
  }finally{/* first game already closed */}
});
test('additive migration preserves pending cases, channel and message IDs without overwriting Firebase',async()=>{
  const old=new Game(':memory:'),remote=new FirestoreGame(new FakeFirestore());try{
    old.create('g','u','舊角色','臺北市警察局');const m=old.mission('g','u').mission;
    old.setSettings('g',{play:'play'});old.setMessage('g','play','lobby','message');
    const c=await migrateSqlite(old,remote);assert.deepEqual(c,{players:1,settings:1,messages:1,skipped:0});
    assert.deepEqual((await remote.get('g','u')).pending,m);assert.equal(await remote.message('g','play','lobby'),'message');
    await remote.answer('g','u','u',m.id,0);const saved=await remote.get('g','u');
    const repeat=await migrateSqlite(old,remote);assert.equal(repeat.skipped,3);assert.deepEqual(await remote.get('g','u'),saved);assert(old.get('g','u').pending);
  }finally{old.close();remote.close();}
});
test('shared web actions persist atomically and reject concurrent replay or failed writes',async()=>{
 const db=new FakeFirestore(),game=new FirestoreGame(db),options={random:()=>.9,fetcher:async()=>({ok:true,json:async()=>({meta:{},counties:{}})})};
 try{
 await game.create('g','u','考生','尚未分發');const r=await game.fullAction('g','u',{start:true},options);
 const action=r.view.controls.findIndex(c=>c.path==='#createCharacterBtn');
 const results=await Promise.allSettled([game.fullAction('g','u',{revision:r.view.revision,action},options),game.fullAction('g','u',{revision:r.view.revision,action},options)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await game.get('g','u')).webCareer.state.created,true);
 const before=await game.get('g','u');db.fail=true;await assert.rejects(()=>game.fullAction('g','u',{page:'academy'},options));db.fail=false;assert.deepEqual(await game.get('g','u'),before);
 }finally{game.close();}
});
test('no Firebase configuration keeps the existing SQLite backend; Admin SDK modules load',async()=>{
  await assert.rejects(()=>createGame(':memory:',{FIREBASE_PROJECT_ID:'not-connected'}),/credentials/);
  const game=await createGame(':memory:',{});try{assert.equal(game.remote,undefined);}finally{game.close();}
  const [{initializeApp},{getFirestore}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore')]);assert.equal(typeof initializeApp,'function');assert.equal(typeof getFirestore,'function');
});
test('remote interactions acknowledge before reading and preserve spectator ownership',async()=>{
  const game=new FirestoreGame(new FakeFirestore());try{
    await game.create('g','u','角色','臺北市警察局');
    const calls=[];const i={guildId:'g',user:{id:'u'},commandName:'角色',deferred:false,replied:false,isChatInputCommand:()=>true,isButton:()=>false,isModalSubmit:()=>false,
      deferReply:async function(){this.deferred=true;calls.push('defer');},editReply:async p=>{calls.push('edit');assert(p.embeds[0].data.title.includes('角色'));}};
    const original=game.get.bind(game);game.get=async(...args)=>{assert.equal(calls[0],'defer');return original(...args);};
    await handle(i,game);assert.deepEqual(calls,['defer','edit']);
    const spectator={...i,deferred:false,user:{id:'other'},customId:'answer:u:fake:0',isChatInputCommand:()=>false,isButton:()=>true,reply:async p=>{assert.equal(p.flags,64);calls.push('private-error');}};
    await handle(spectator,game);assert.equal(calls.at(-1),'private-error');
  }finally{game.close();}
});

test('production default storage factory starts the existing bot without Firebase credentials',async()=>{
 class Client extends EventEmitter{application={id:'app'};guilds={cache:new Map([['guild',{}]])};async login(){queueMicrotask(()=>this.emit(Events.ClientReady,this));}destroy(){}}
 const logs=[];const app=await startCloud({env:{DISCORD_TOKEN:'fake-test-only',DISCORD_DB_PATH:':memory:'},client:new Client(),
 restFactory:()=>({get:async()=>({id:'app'}),post:async()=>{}}),logger:{log:x=>logs.push(x),error:()=>{}},
 communityFactory:()=>({ensure:async()=>({profiles:'p',play:'g',ranking:'r',guide:'s'}),syncAll:async()=>{},stop:()=>{},log:()=>{}})});
 try{assert(logs.some(x=>x.includes('已上線')));}finally{app.stop();}
});
