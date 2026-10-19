import { ChannelType, PermissionFlagsBits as P, EmbedBuilder, escapeMarkdown } from 'discord.js';
import { GameError, stages, stamp,careerRole,currentRank } from './game.mjs';
import { withInsignia,preparePayload } from './insignia.mjs';
import { careerSources,positionSummary,careerDisplayOrder,nextStage } from './career.mjs';

export const channelNames={profiles:'警察角色',play:'警察遊戲',ranking:'警察排名',guide:'警察說明'};
const safe=x=>escapeMarkdown(String(x));
const embed=(title,text)=>new EmbedBuilder().setColor(0x2463b2).setTitle(title).setDescription(text);
export function guideCards(channels){
  const duties=[
    '本人與搭檔的巡邏、報案受理、現場查證與安全處置；需要額外警力時向主管回報。',
    '可選一般巡佐、警務佐、偵查佐、小隊長，或派出所兼任職務；依所選職務執勤。',
    '可選行政、防治、民防巡官、偵查員、分隊長，或兼任所長／副所長；兼任不是升遷必經條件。',
    '可選警務員、偵查員、組員或警務員兼所長，承辦與主管權責依實際職缺區分。',
    '查驗業務資料、聯繫窗口、整理方案並呈報審議，承辦職務不等於機關首長調度權。',
    '整合轄內所隊需求、案件資料與跨所支援，安排分工並追蹤執行。',
    '依授權協助局長整合全局業務與資源，重大決策及超出授權事項須呈報。',
    '統籌警察局政策、跨分局資源配置、行政風險與執行成效。',
    '處理全國層級政策、跨縣市與署屬機關協調，現場勤務仍由權責指揮體系執行。'
  ];
  const cards=[
    ['overview','01｜新手入門與頻道導覽',
      `到 <#${channels.play}> 輸入 **/開始**。新版從 **2010 年、18 歲考生** 開始；考生沒有階級圖。先建立身分、選警專／警大／一般特考路線，再備考、筆試、體測、受訓與分發。下方選單會依身分開放功能。\n\n<#${channels.profiles}>：角色資料自動更新。\n<#${channels.play}>：公開遊玩，只有本人可操作。\n<#${channels.ranking}>：生涯排行榜。\n<#${channels.guide}>：玩法與職位說明。\n\nDC 使用網頁版同一份遊戲程式。舊角色在 /角色 按「切換網頁規則（保留進度）」匯入，原始進度另外保留備份。`],
    ['positions','02｜角色權責與階級圖',
      '**個人官階與職務配階分開顯示。** 考生沒有官階；正式任用後依職務顯示階級圖。一般承辦、帶班、兼任主管與機關首長的題目及權責不同。只有取得主管職的角色會顯示指揮功能。兼任不是必經條件，可依網頁版開放職缺選填。\n\n下方職位卡為機關編制示例；實際可選職位與配階以自己的操作卡、服務機關及網頁規則為準。原始階級圖為 Akira123／Wikimedia Commons，CC BY-SA 4.0。'],
    ['promotion','03｜升遷、訓練與輪調',
      '**/升遷、/訓練** 查看現職對應的年資、考績、資績與官等訓練條件，逐項完成後申請；使用與網頁相同的資格判定。**/輪調** 開啟任職選填，包含一般、兼任及開放的外縣市職缺。\n\n舊版的「連續答對 3 題研習」只保留於備份，不會當作已取得網頁版官等訓練資格。原有職位、個人官階、已完成勤務、年資、績效及考績匯入後保留；後續採網頁版規則。'],
    ['performance','04｜績效、時間與考績',
      '勤務、主管決策、獎懲與考績全部由網頁版程式結算。正式勤務通常推進約 30 天；學堂題目與人力演練依網頁規則增加知識。勤務／決策成果與考績績效持續累積。\n\n在功能選單選 **獎懲考績**，依頁面顯示的年度／階段門檻辦理考績；不是舊版固定 12 件自動評 A／B／C。解析後按「開始／換一題」或「下一題」繼續，方便在頻道閱讀。舊操作卡失效後不會重複加分。'],
    ['faq','05｜存檔、操作與題庫',
      '**資料存在哪？** Firebase 保存每位玩家的角色、未完成題目及操作狀態。重啟後用 /開始 繼續。角色卡、排名及 Google 試算表同步顯示新版進度；網頁存檔與 DC 存檔仍分開。\n\n**怎麼操作？** 選單切換頁面，按鈕執行動作；姓名／年齡會跳輸入視窗，縣市等使用分頁選單。內容與操作超過一頁時用上下頁按鈕。人力演練可逐項調整人數並送出分析。\n\n**題目來源？** 共用網頁的職務情境與學堂題庫；歷屆原卷按需載入，依當年度官方答案判定。歷屆法規可能已修正，原卷沒有詳解時會明確標示。\n\n**退休？** 依網頁版現職的退休設定判斷，不再固定所有人 65 歲。']
  ];
  const articles=cards.map(([slot,title,text])=>({slot:'guide:'+slot,payload:{embeds:[embed(title,text).setFooter({text:'DC 版遊戲說明 · 隨版本更新原訊息'})],components:[]}}));
  const positions=[];
  for(const index of careerDisplayOrder){
    const variants=[{id:'metro',role:careerRole({stage:index,unit:'新北市政府警察局'}),label:[5,6,7,9].includes(index)?'直轄市':''}];
    if([5,6,7].includes(index))variants.push({id:'county',role:careerRole({stage:index,unit:'花蓮縣警察局'}),label:'縣（市）'});
    for(const {id,role,label} of variants){
      const title=role.title+(label?'｜'+label:'')+'｜'+role.badge;
      const detail='**職務配階：'+role.badge+'**\n\n'+positionSummary(role)+'\n\n**工作與可選職缺**\n'+(index===9?'依授權協助分局長處理跨所隊勤務、業務協調與執行追蹤。':duties[index])+'\n\n個人官階依角色任官資料顯示，兼任職務為選項。';
      positions.push({slot:`guide:position:${index}:${id}`,payload:{embeds:[withInsignia(embed('職位圖鑑｜'+title,detail),role).setImage(null).setFooter({text:'每個職位各有對應配階圖 · 機關編制不同，職務列等可能不同'})],components:[]}});
    }
  }
  return [...articles.slice(0,2),...positions,...articles.slice(2)];
}
export function rankedPlayers(players){
  const level=p=>careerRole(p).sequence??0;
  const rows=players.slice().sort((a,b)=>level(a.p)-level(b.p)||b.p.merit-a.p.merit||b.p.completed-a.p.completed||a.user.localeCompare(b.user));
  let rank=0,last;
  return rows.map((r,i)=>{const key=JSON.stringify([level(r.p),r.p.merit,r.p.completed]);if(key!==last)rank=i+1;last=key;return {...r,rank};});
}
export function publicProfile(p,user){
  if(p.webCareer){const s=p.webCareer.state,v=p.webSummary,r=careerRole(p);return {embeds:[withInsignia(embed(safe(p.name)+'｜'+r.title,`玩家：<@${user}>\n**職位：${safe(r.title)}**\n**個人官階：${currentRank(p)}**\n${v.badge?'**職務配階：'+v.badge+'**\n':''}\n**單位**\n${safe(p.unit)}\n\n${v.date}｜${v.age} 歲\n服務年資 ${v.years.toFixed(1)} 年｜完成勤務 ${p.completed} 件\n**累計績效 ${p.merit.toFixed(1)}**\n最近考績：${p.appraisals.slice(0,2).map(a=>a.year+' '+a.grade).join('、')||'尚未結算'}\n狀態：${s.retired?'退休':s.unit?'在職':'備考／受訓／待分發'}`).setFooter({text:'網頁版共用規則 · DC 獨立存檔 · 角色進度自動更新'}),r)],components:[]};}
  const role=careerRole(p);return {embeds:[withInsignia(embed(safe(p.name)+'｜'+role.title,
    `玩家：<@${user}>\n**職位：${role.title}**\n\n**個人官階（遊戲）：${currentRank(p)}**\n\n**職務配階：${role.badge}**\n${positionSummary(role)}\n\n**單位**\n${safe(p.unit)}${role.scopeNote?'\n'+role.scopeNote:''}\n\n${stamp(p.month)}｜年資 ${(p.month/12).toFixed(1)} 年\n績效 **${p.merit.toFixed(1)}**｜完成勤務 **${p.completed}** 件\n最近考績：${p.appraisals.slice(-2).map(a=>a.year+' '+a.grade).join('、')||'尚未結算'}${p.month>=516?'\n狀態：退休':''}`
  ).setFooter({text:'角色進度自動更新 · 前往「警察遊戲」頻道遊玩'}),role)],components:[]};
}
export function rankingCard(players){
  const rows=rankedPlayers(players),top=rows.slice(0,20);
  const text=top.length?top.map(({user,p,rank})=>{const r=careerRole(p);return `**${rank}. ${safe(p.name)}** · <@${user}>\n${r.badge} ${r.title}｜官階 ${currentRank(p)}｜績效 ${p.merit.toFixed(1)}｜勤務 ${p.completed} 件`;}).join('\n\n'):'還沒有人建立角色，前往「警察遊戲」輸入 /開始，成為第一位玩家。';
  return {embeds:[embed('警察生涯排行榜｜前 20 名',text).setFooter({text:`共 ${rows.length} 位玩家 · 依職務序列、績效、完成勤務數排序；完全相同並列`})],components:[]};
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
    const state={...await this.game.settings(id)};
    for(const key of Object.keys(channelNames)){
      let channel=chosen[key]||(state[key]?all.get(state[key]):null)||all.find(c=>c?.name===channelNames[key]&&c.type===ChannelType.GuildText);
      if(!channel){
        if(!me.permissions.has(P.ManageChannels))throw new GameError('請授予機器人「管理頻道」權限，再輸入 /遊戲頻道；也可先建立所需文字頻道，用 /遊戲頻道 指定。');
        channel=await guild.channels.create({name:channelNames[key],type:ChannelType.GuildText,
          topic:key==='guide'?'警察生涯遊戲說明：新手入門、職位職責、升遷門檻、績效考績及模擬研習。':key==='play'?'公開遊玩台灣警察生涯。輸入 /開始 或 /任務；只有本人可操作自己的案件按鈕。':key==='profiles'?'每位玩家的角色、階級、職位、單位與績效；由機器人自動更新。':'依職位、績效、勤務數排列的本伺服器排行榜；由機器人自動更新。',
          permissionOverwrites:[
            {id:guild.id,allow:[P.ViewChannel,...(key==='play'?[P.SendMessages,P.UseApplicationCommands]:[])],deny:key==='play'?[]:[P.SendMessages,P.UseApplicationCommands]},
            {id:this.client.user.id,allow:[P.ViewChannel,P.SendMessages,P.EmbedLinks,P.ReadMessageHistory,P.AttachFiles]}],
          reason:'建立警察生涯的角色、遊戲、排名及說明專用頻道'});
      }
      if(channel.guildId!==id||channel.type!==ChannelType.GuildText)throw new GameError('請指定同一伺服器的普通文字頻道。');
      if(!channel.permissionsFor(me)?.has(P.AttachFiles)){
        await channel.permissionOverwrites.edit(this.client.user.id,{AttachFiles:true},{reason:'讓階級圖隨訊息附加，避免外部圖片失效'});
      }
      if(!channel.permissionsFor(me)?.has([P.ViewChannel,P.SendMessages,P.EmbedLinks,P.ReadMessageHistory,P.AttachFiles]))throw new GameError('機器人在指定頻道需有「檢視頻道、傳送訊息、嵌入連結、讀取訊息歷史、附加檔案」權限。');
      state[key]=channel.id;
      await this.game.setSettings(id,state); // Retain partial setup; retry never duplicates created channels.
    }
    if(new Set(Object.keys(channelNames).map(k=>state[k])).size!==4)throw new GameError('角色、遊戲、排名及說明請分別使用四個不同的頻道。');
    await this.game.setSettings(id,state);
    await this.upsert(id,state.play,'lobby',{embeds:[embed('警察生涯｜遊戲大廳',
      `在這裡輸入 **/開始** 建立角色，**/任務** 接案件，以 A／B／C 作答。\n\n遊玩內容公開，其他人能觀看，但只有案件本人可以操作按鈕。\n\n角色資料：<#${state.profiles}>\n生涯排名：<#${state.ranking}>\n玩法與職位說明：<#${state.guide}>\n\n/角色、/履歷、/訓練、/升遷、/輪調、/說明 都在本頻道使用。`)],components:[]});
    const cards=guideCards(state);
    for(const card of cards)await this.upsert(id,state.guide,card.slot,card.payload);
    this.logger.log(`COMMUNITY_GUIDE_SYNCED channel=${state.guide} messages=${cards.length}`);
    return state;
  });}
  async guard(i){const s=await this.game.settings(i.guildId);if(s.play&&i.channelId!==s.play)throw new GameError(`請到 <#${s.play}> 遊玩，角色資料與排名頻道會自動更新。`);}
  async upsert(guild,channelId,slot,payload){
    if(this.closed)return;
    const channel=await this.client.channels.fetch(channelId);
    if(!channel||channel.guildId!==guild||channel.type!==ChannelType.GuildText)throw new GameError('遊戲頻道已移除，請重新執行 /遊戲頻道。');
    const options={...preparePayload(payload),allowedMentions:{parse:[]}},id=await this.game.message(guild,channelId,slot);
    if(id){
      try{const old=await channel.messages.fetch(id);const updated=await old.edit(options);this.verifyMedia(options,updated);return;}
      catch(e){if(e.code!==10008)throw e;} // Only recreate a genuinely deleted message.
    }
    const message=await channel.send(options);this.verifyMedia(options,message);await this.game.setMessage(guild,channelId,slot,message.id);
  }
  verifyMedia(options,message){
    if(!options.files.length)return;
    const images=(message?.embeds||[]).flatMap(e=>[e.image?.url,e.thumbnail?.url]).filter(Boolean);
    const hosted=images.some(url=>/^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\//.test(url));
    this.logger.log(`COMMUNITY_INSIGNIA_DELIVERY files=${options.files.length} attachments=${message?.attachments?.size??0} discordImage=${hosted}`);
  }
  async syncAll(guild){return this.serialize(guild,async()=>{
    const s=await this.game.settings(guild);if(!s.profiles||!s.ranking)return;
    const players=await this.game.players(guild);
    for(const {user,p} of players){if(this.closed)return;await this.upsert(guild,s.profiles,'profile:'+user,publicProfile(p,user));}
    await this.upsert(guild,s.ranking,'ranking',rankingCard(await this.game.players(guild)));
  });}
  schedule(guild,user){
    if(this.closed)return;
    if(!this.dirty.has(guild))this.dirty.set(guild,new Set());
    this.dirty.get(guild).add(user);
    if(this.workers.has(guild))return;
    const work=this.serialize(guild,async()=>{
      while(!this.closed&&this.dirty.get(guild)?.size){
        const users=[...this.dirty.get(guild)];this.dirty.get(guild).clear();
        const s=await this.game.settings(guild);if(!s.profiles||!s.ranking)continue;
        for(const user of users){const p=await this.game.get(guild,user);if(p)await this.upsert(guild,s.profiles,'profile:'+user,publicProfile(p,user));}
        await this.upsert(guild,s.ranking,'ranking',rankingCard(await this.game.players(guild)));
      }
    });
    this.workers.set(guild,work);
    void work.catch(e=>this.log(e)).finally(()=>{this.workers.delete(guild);if(!this.closed&&this.dirty.get(guild)?.size)this.schedule(guild,this.dirty.get(guild).values().next().value);});
  }
  async setup(i){
    if(!i.memberPermissions?.has(P.ManageGuild))throw new GameError('只有具備「管理伺服器」權限的成員可設定遊戲頻道。');
    const chosen={profiles:i.options.getChannel('角色'),play:i.options.getChannel('遊戲'),ranking:i.options.getChannel('排名'),guide:i.options.getChannel('說明')};
    const core=[chosen.profiles,chosen.play,chosen.ranking];
    if(core.some(Boolean)&&core.some(c=>!c))throw new GameError('指定既有核心頻道時，請同時選好角色、遊戲、排名三個頻道；說明頻道可單獨指定。');
    const future={...await this.game.settings(i.guildId),...Object.fromEntries(Object.entries(chosen).filter(([,c])=>c).map(([k,c])=>[k,c.id]))};
    const ids=Object.keys(channelNames).map(k=>future[k]).filter(Boolean);
    if(new Set(ids).size!==ids.length)throw new GameError('請為不同用途指定不同的頻道。');
    if(Object.values(chosen).some(c=>c&&(c.guildId!==i.guildId||c.type!==ChannelType.GuildText)))throw new GameError('請指定同一伺服器的普通文字頻道。');
    await i.deferReply({flags:64});
    try{
      const s=await this.ensure(i.guildId,chosen);
      await i.editReply({content:`已設定：角色 <#${s.profiles}>｜遊戲 <#${s.play}>｜排名 <#${s.ranking}>｜說明 <#${s.guide}>。資料正在更新。`,allowedMentions:{parse:[]}});
      void this.syncAll(i.guildId).catch(e=>this.log(e));
    }catch(e){await i.editReply({content:e instanceof GameError?e.message:'頻道設定未完成，請確認機器人權限後重試。',allowedMentions:{parse:[]}});this.log(e);}
  }
}
