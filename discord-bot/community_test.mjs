import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ChannelType,Collection,PermissionFlagsBits as P,PermissionsBitField } from 'discord.js';
import { Game,GameError } from './game.mjs';
import { Community,rankingCard,rankedPlayers,publicProfile,channelNames } from './community.mjs';
import { handle } from './ui.mjs';
import { commands } from './register.mjs';
const guild='111111111111111111',user='222222222222222222',other='333333333333333333';
function harness(game,{manage=true}={}){
  const channels=new Collection(),log=[],created=[],sent=[];let next=1000000000000000000n,failCreate=false;
  const me={permissions:new PermissionsBitField(manage?P.ManageChannels:0n)};
  function channel(name){
    const rows=new Collection();const c={id:String(next++),guildId:guild,type:ChannelType.GuildText,name,
      permissionsFor:()=>({has:()=>true}),rows,
      messages:{fetch:async id=>{if(c.fetchFailure)throw Object.assign(new Error('blocked'),{code:c.fetchFailure});if(!rows.has(id))throw Object.assign(new Error('deleted'),{code:10008});return rows.get(id);}},
      send:async payload=>{const m={id:String(next++),payload,edits:0,edit:async p=>{m.payload=p;m.edits++;return m;}};rows.set(m.id,m);sent.push({channel:c.id,payload});return m;}};
    channels.set(c.id,c);return c;
  }
  const g={id:guild,members:{me},channels:{fetch:async()=>channels,create:async args=>{
    if(failCreate&&created.length===1){failCreate=false;throw Object.assign(new Error('permission changed'),{code:50013});}
    const c=channel(args.name);created.push({...args,id:c.id});return c;
  }}};
  const client={user:{id:'444444444444444444'},guilds:{cache:new Collection([[guild,g]])},channels:{fetch:async id=>channels.get(id)}};
  const community=new Community(client,game,{logger:{log:()=>{},error:(...x)=>log.push(x)}});
  return {community,client,channels,created,sent,channel,me,log,failNextCreate:()=>{failCreate=true;}};
}
function valid(payload){
  let size=0;
  for(const e of payload.embeds){const r=e.toJSON();assert(r.description.length<=4096);size+=r.description.length+r.title.length+(r.footer?.text.length||0);}
  assert(size<=6000);assert.deepEqual(payload.components,[]);
}
const player=game=>game.create(guild,user,'**角色**','新北市某分局某派出所');
test('automatic setup creates exactly three public text channels and reuses persisted channels and messages',async()=>{
  const game=new Game(':memory:'),h=harness(game);try{
    player(game);const s=await h.community.ensure(guild);await h.community.syncAll(guild);
    assert.equal(h.created.length,3);assert.equal(new Set(Object.values(s)).size,3);
    for(const c of h.created){const everyone=c.permissionOverwrites[0];assert(everyone.allow.includes(P.ViewChannel));
      if(c.name!==channelNames.play){assert(everyone.deny.includes(P.SendMessages));assert(everyone.deny.includes(P.UseApplicationCommands));}}
    assert.equal(h.sent.length,3); // lobby, one profile, leaderboard
    await h.community.ensure(guild);await h.community.syncAll(guild);assert.equal(h.sent.length,3);assert.equal(h.created.length,3);
    for(const c of h.channels.values())for(const m of c.rows.values()){valid(m.payload);assert.deepEqual(m.payload.allowedMentions,{parse:[]});assert(m.edits>0);}
    const next=new Community(h.client,game);await next.ensure(guild);await next.syncAll(guild);assert.equal(h.created.length,3);assert.equal(h.sent.length,3);next.stop();
  }finally{h.community.stop();game.close();}
});
test('missing manage-channel permission asks for the narrow permission and leaves careers intact; partial retry does not duplicate',async()=>{
  const game=new Game(':memory:'),h=harness(game,{manage:false});try{
    const p=player(game);await assert.rejects(()=>h.community.ensure(guild),/管理頻道/);assert.equal(h.created.length,0);assert.deepEqual(game.get(guild,user),p);
    h.me.permissions=new PermissionsBitField(P.ManageChannels);h.failNextCreate();
    await assert.rejects(()=>h.community.ensure(guild));assert.equal(h.created.length,1);assert(game.settings(guild).profiles);
    await h.community.ensure(guild);assert.equal(h.created.length,3);
  }finally{h.community.stop();game.close();}
});
test('server-scoped leaderboard orders by career, merit and duties with ties, limits output and escapes user text',()=>{
  const rows=Array.from({length:50},(_,i)=>({user:String(i),p:{name:'*'.repeat(20),stage:i===0?2:1,unit:'測試',merit:10,completed:60,month:60,appraisals:[]}}));
  rows[1].p.merit=12;rows[2].p.merit=12;
  const ranked=rankedPlayers(rows);assert.equal(ranked[0].user,'0');assert.equal(ranked[1].rank,2);assert.equal(ranked[2].rank,2);assert.equal(ranked[3].rank,4);
  const board=rankingCard(rows);valid(board);assert.equal((board.embeds[0].data.description.match(/勤務/g)||[]).length,20);
  assert(board.embeds[0].data.description.includes('\\*'));valid(publicProfile(rows[0].p,user));valid(rankingCard([]));
  const game=new Game(':memory:');try{player(game);game.create('another-guild',other,'另一服角色','另一服單位');assert.equal(game.players(guild).length,1);assert.equal(game.players(guild)[0].user,user);}finally{game.close();}
});
test('mirrors update one profile per player and one board; concurrent scheduling uses latest saved state',async()=>{
  const game=new Game(':memory:'),h=harness(game);try{
    player(game);game.create(guild,other,'第二位玩家','另一個單位');const s=await h.community.ensure(guild);await h.community.syncAll(guild);
    const ids=[game.message(guild,s.profiles,'profile:'+user),game.message(guild,s.profiles,'profile:'+other),game.message(guild,s.ranking,'ranking')];
    const m=game.mission(guild,user).mission;game.answer(guild,user,user,m.id,m.choices.findIndex(c=>c.quality===100));
    h.community.schedule(guild,user);h.community.schedule(guild,other);h.community.schedule(guild,user);
    while(h.community.workers.size)await Promise.all([...h.community.workers.values()]);
    assert.deepEqual(ids,[game.message(guild,s.profiles,'profile:'+user),game.message(guild,s.profiles,'profile:'+other),game.message(guild,s.ranking,'ranking')]);
    assert.equal(h.sent.length,4);assert(h.channels.get(s.profiles).rows.get(ids[0]).payload.embeds[0].data.description.includes('0.2'));
    const ranking=h.channels.get(s.ranking).rows.get(ids[2]).payload.embeds[0].data.description;assert(ranking.indexOf(user)<ranking.indexOf(other));
  }finally{h.community.stop();game.close();}
});
test('deleted board is recreated once; permission failure never creates duplicate messages or rolls back player merit',async()=>{
  const game=new Game(':memory:'),h=harness(game);try{
    player(game);const s=await h.community.ensure(guild);await h.community.syncAll(guild);const c=h.channels.get(s.ranking),old=game.message(guild,s.ranking,'ranking');
    c.rows.delete(old);await h.community.syncAll(guild);const current=game.message(guild,s.ranking,'ranking');assert.notEqual(current,old);assert.equal(h.sent.length,4);
    c.fetchFailure=50013;const count=h.sent.length;await assert.rejects(()=>h.community.syncAll(guild));assert.equal(h.sent.length,count);assert.equal(game.message(guild,s.ranking,'ranking'),current);
    assert.equal(game.get(guild,user).merit,0);
  }finally{h.community.stop();game.close();}
});
test('channel settings and message references survive database reopen without touching player save',()=>{
  const dir=mkdtempSync(join(tmpdir(),'police-community-')),path=join(dir,'save.sqlite');let game=new Game(path);
  try{const p=player(game);game.setSettings(guild,{profiles:'1',play:'2',ranking:'3'});game.setMessage(guild,'1','profile:'+user,'99');game.close();game=new Game(path);
    assert.equal(game.settings(guild).play,'2');assert.equal(game.message(guild,'1','profile:'+user),'99');assert.deepEqual(game.get(guild,user),p);
  }finally{game.close();rmSync(dir,{recursive:true});}
});
function interaction({channel='wrong',actor=user,command='任務',button,admin=false}={}){
  const i={guildId:guild,channelId:channel,user:{id:actor},commandName:command,customId:button,calls:[],replied:false,deferred:false,
    memberPermissions:new PermissionsBitField(admin?P.ManageGuild:0n),options:{getChannel:()=>null},
    isChatInputCommand:()=>!button,isButton:()=>!!button,isModalSubmit:()=>false,
    reply:async function(p){this.replied=true;this.calls.push(['reply',p]);},update:async function(p){this.replied=true;this.calls.push(['update',p]);},
    deferReply:async function(p){this.deferred=true;this.calls.push(['defer',p]);},editReply:async function(p){this.replied=true;this.calls.push(['edit',p]);}};
  return i;
}
test('public play is restricted to game channel, spectator buttons fail privately and admin-only setup is enforced',async()=>{
  const game=new Game(':memory:'),h=harness(game);try{
    player(game);const s=await h.community.ensure(guild);
    let i=interaction();await handle(i,game,{community:h.community});assert.equal(i.calls[0][1].flags,64);assert.match(i.calls[0][1].content,/請到/);assert.equal(game.get(guild,user).pending,null);
    i=interaction({channel:s.play});await handle(i,game,{community:h.community});assert.equal(i.calls[0][1].flags,0);
    const id=i.calls[0][1].components[0].toJSON().components[0].custom_id;
    i=interaction({channel:s.play,button:id,actor:other});await handle(i,game,{community:h.community});assert.equal(i.calls[0][1].flags,64);assert.equal(game.get(guild,user).completed,0);
    i=interaction({command:'遊戲頻道'});await handle(i,game,{community:h.community});assert.equal(i.calls[0][1].flags,64);assert.match(i.calls[0][1].content,/管理伺服器/);
    i=interaction({command:'遊戲頻道',admin:true});await handle(i,game,{community:h.community});assert.equal(i.calls[0][0],'defer');assert.equal(i.calls[0][1].flags,64);assert(i.calls[1][1].content.includes(s.play));
    assert.equal(commands.find(c=>c.name==='遊戲頻道').default_member_permissions,String(P.ManageGuild));
    while(h.community.workers.size)await Promise.all([...h.community.workers.values()]);
    await (h.community.queues.get(guild)||Promise.resolve());
  }finally{h.community.stop();game.close();}
});
