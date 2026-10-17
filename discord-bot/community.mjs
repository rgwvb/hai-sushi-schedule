import { ChannelType, PermissionFlagsBits as P, EmbedBuilder, escapeMarkdown } from 'discord.js';
import { GameError, stages, stamp } from './game.mjs';

export const channelNames={profiles:'警察角色',play:'警察遊戲',ranking:'警察排名'};
const safe=x=>escapeMarkdown(String(x));
const embed=(title,text)=>new EmbedBuilder().setColor(0x2463b2).setTitle(title).setDescription(text);
export function rankedPlayers(players){
  const rows=players.slice().sort((a,b)=>b.p.stage-a.p.stage||b.p.merit-a.p.merit||b.p.completed-a.p.completed||a.user.localeCompare(b.user));
  let rank=0,last;
  return rows.map((r,i)=>{const key=JSON.stringify([r.p.stage,r.p.merit,r.p.completed]);if(key!==last)rank=i+1;last=key;return {...r,rank};});
}
export function publicProfile(p,user){
  const role=stages[p.stage];return {embeds:[embed(safe(p.name)+'｜'+role.title,
    `玩家：<@${user}>\n**階級：${role.rank}**\n**職位：${role.title}**\n單位：${safe(p.unit)}\n\n${stamp(p.month)}｜年資 ${(p.month/12).toFixed(1)} 年\n績效 **${p.merit.toFixed(1)}**｜完成勤務 **${p.completed}** 件\n最近考績：${p.appraisals.slice(-2).map(a=>a.year+' '+a.grade).join('、')||'尚未結算'}${p.month>=516?'\n狀態：退休':''}`
  ).setFooter({text:'角色進度自動更新 · 前往「警察遊戲」頻道遊玩'})],components:[]};
}
export function rankingCard(players){
  const rows=rankedPlayers(players),top=rows.slice(0,20);
  const text=top.length?top.map(({user,p,rank})=>`**${rank}. ${safe(p.name)}** · <@${user}>\n${stages[p.stage].rank} ${stages[p.stage].title}｜績效 ${p.merit.toFixed(1)}｜勤務 ${p.completed} 件`).join('\n\n'):'還沒有人建立角色，前往「警察遊戲」輸入 /開始，成為第一位玩家。';
  return {embeds:[embed('警察生涯排行榜｜前 20 名',text).setFooter({text:`共 ${rows.length} 位玩家 · 依職位、績效、完成勤務數排序；完全相同並列`})],components:[]};
}
export class Community {
  constructor(client,game,{logger=console}={}){this.client=client;this.game=game;this.logger=logger;this.queues=new Map();this.dirty=new Map();this.workers=new Map();this.closed=false;}
  stop(){this.closed=true;this.dirty.clear();}
  log(error){this.logger.error('COMMUNITY_SYNC_FAILED',String(error.code||error.name||'UNKNOWN').replace(/[^A-Za-z0-9_]/g,'').slice(0,60));}
  serialize(guild,fn){const previous=this.queues.get(guild)||Promise.resolve();const next=previous.catch(()=>{}).then(()=>{if(!this.closed)return fn();});this.queues.set(guild,next);void next.finally(()=>{if(this.queues.get(guild)===next)this.queues.delete(guild);}).catch(()=>{});return next;}
  async guild(id){return this.client.guilds.cache.get(id)||this.client.guilds.fetch(id);}
  async ensure(id,chosen={}){return this.serialize(id,async()=>{
    const guild=await this.guild(id),all=await guild.channels.fetch();
    const me=guild.members.me||await guild.members.fetchMe();
    const state={...this.game.settings(id)};
    for(const key of Object.keys(channelNames)){
      let channel=chosen[key]||(state[key]?all.get(state[key]):null)||all.find(c=>c?.name===channelNames[key]&&c.type===ChannelType.GuildText);
      if(!channel){
        if(!me.permissions.has(P.ManageChannels))throw new GameError('請授予機器人「管理頻道」權限，再輸入 /遊戲頻道；也可先建立三個文字頻道，用 /遊戲頻道 指定。');
        channel=await guild.channels.create({name:channelNames[key],type:ChannelType.GuildText,
          topic:key==='play'?'公開遊玩台灣警察生涯。輸入 /開始 或 /任務；只有本人可操作自己的案件按鈕。':key==='profiles'?'每位玩家的角色、階級、職位、單位與績效；由機器人自動更新。':'依職位、績效、勤務數排列的本伺服器排行榜；由機器人自動更新。',
          permissionOverwrites:[
            {id:guild.id,allow:[P.ViewChannel,...(key==='play'?[P.SendMessages,P.UseApplicationCommands]:[])],deny:key==='play'?[]:[P.SendMessages,P.UseApplicationCommands]},
            {id:this.client.user.id,allow:[P.ViewChannel,P.SendMessages,P.EmbedLinks,P.ReadMessageHistory]}],
          reason:'建立警察生涯的角色、遊戲及排名專用頻道'});
      }
      if(channel.guildId!==id||channel.type!==ChannelType.GuildText)throw new GameError('請指定同一伺服器的普通文字頻道。');
      if(!channel.permissionsFor(me)?.has([P.ViewChannel,P.SendMessages,P.EmbedLinks,P.ReadMessageHistory]))throw new GameError('機器人在指定頻道需有「檢視頻道、傳送訊息、嵌入連結、讀取訊息歷史」權限。');
      state[key]=channel.id;
      this.game.setSettings(id,state); // Retain partial setup; retry never duplicates created channels.
    }
    if(new Set(Object.keys(channelNames).map(k=>state[k])).size!==3)throw new GameError('角色、遊戲及排名請分別使用三個不同的頻道。');
    this.game.setSettings(id,state);
    await this.upsert(id,state.play,'lobby',{embeds:[embed('警察生涯｜遊戲大廳',
      `在這裡輸入 **/開始** 建立角色，**/任務** 接案件，以 A／B／C 作答。\n\n遊玩內容公開，其他人能觀看，但只有案件本人可以操作按鈕。\n\n角色資料：<#${state.profiles}>\n生涯排名：<#${state.ranking}>\n\n/角色、/履歷、/訓練、/升遷、/說明 都在本頻道使用。`)],components:[]});
    return state;
  });}
  guard(i){const s=this.game.settings(i.guildId);if(s.play&&i.channelId!==s.play)throw new GameError(`請到 <#${s.play}> 遊玩，角色資料與排名頻道會自動更新。`);}
  async upsert(guild,channelId,slot,payload){
    if(this.closed)return;
    const channel=await this.client.channels.fetch(channelId);
    if(!channel||channel.guildId!==guild||channel.type!==ChannelType.GuildText)throw new GameError('遊戲頻道已移除，請重新執行 /遊戲頻道。');
    const options={...payload,allowedMentions:{parse:[]}},id=this.game.message(guild,channelId,slot);
    if(id){
      try{const old=await channel.messages.fetch(id);await old.edit(options);return;}
      catch(e){if(e.code!==10008)throw e;} // Only recreate a genuinely deleted message.
    }
    const message=await channel.send(options);this.game.setMessage(guild,channelId,slot,message.id);
  }
  async syncAll(guild){return this.serialize(guild,async()=>{
    const s=this.game.settings(guild);if(!s.profiles||!s.ranking)return;
    const players=this.game.players(guild);
    for(const {user,p} of players){if(this.closed)return;await this.upsert(guild,s.profiles,'profile:'+user,publicProfile(p,user));}
    await this.upsert(guild,s.ranking,'ranking',rankingCard(this.game.players(guild)));
  });}
  schedule(guild,user){
    if(this.closed)return;
    if(!this.dirty.has(guild))this.dirty.set(guild,new Set());
    this.dirty.get(guild).add(user);
    if(this.workers.has(guild))return;
    const work=this.serialize(guild,async()=>{
      while(!this.closed&&this.dirty.get(guild)?.size){
        const users=[...this.dirty.get(guild)];this.dirty.get(guild).clear();
        const s=this.game.settings(guild);if(!s.profiles||!s.ranking)continue;
        for(const user of users){const p=this.game.get(guild,user);if(p)await this.upsert(guild,s.profiles,'profile:'+user,publicProfile(p,user));}
        await this.upsert(guild,s.ranking,'ranking',rankingCard(this.game.players(guild)));
      }
    });
    this.workers.set(guild,work);
    void work.catch(e=>this.log(e)).finally(()=>{this.workers.delete(guild);if(!this.closed&&this.dirty.get(guild)?.size)this.schedule(guild,this.dirty.get(guild).values().next().value);});
  }
  async setup(i){
    if(!i.memberPermissions?.has(P.ManageGuild))throw new GameError('只有具備「管理伺服器」權限的成員可設定遊戲頻道。');
    const chosen={profiles:i.options.getChannel('角色'),play:i.options.getChannel('遊戲'),ranking:i.options.getChannel('排名')};
    if(Object.values(chosen).some(Boolean)&&Object.values(chosen).some(c=>!c))throw new GameError('指定既有頻道時，請同時選好角色、遊戲、排名三個頻道。');
    if(Object.values(chosen).some(Boolean)&&new Set(Object.values(chosen).map(c=>c.id)).size!==3)throw new GameError('請指定三個不同的頻道。');
    if(Object.values(chosen).some(c=>c&&(c.guildId!==i.guildId||c.type!==ChannelType.GuildText)))throw new GameError('請指定同一伺服器的普通文字頻道。');
    await i.deferReply({flags:64});
    try{
      const s=await this.ensure(i.guildId,chosen);
      await i.editReply({content:`已設定：角色 <#${s.profiles}>｜遊戲 <#${s.play}>｜排名 <#${s.ranking}>。資料正在更新。`,allowedMentions:{parse:[]}});
      void this.syncAll(i.guildId).catch(e=>this.log(e));
    }catch(e){await i.editReply({content:e instanceof GameError?e.message:'頻道設定未完成，請確認機器人權限後重試。',allowedMentions:{parse:[]}});this.log(e);}
  }
}
