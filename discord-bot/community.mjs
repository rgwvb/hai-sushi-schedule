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
      `先到 <#${channels.play}> 輸入 **/開始**，填角色姓名與任職單位。角色從 **2010 年、22 歲、已正式任職的警員** 開始；再次輸入 /開始 會繼續原存檔。\n\n**/任務** 接案 → 按 A／B／C → 看分析與績效 → 按「接下一件勤務」。\n\n**四個頻道**\n<#${channels.profiles}>：每人一張自動更新的角色卡。\n<#${channels.play}>：公開遊玩與案件處置。\n<#${channels.ranking}>：本伺服器排行榜。\n<#${channels.guide}>：玩法、職位與規則說明。\n\n**其他指令**\n/角色：階級與績效｜/履歷：最近生涯紀錄\n/訓練：模擬研習｜/升遷：條件與選缺\n/輪調：同序列選缺\n/排名：榜單｜/說明：快速指令表\n\n遊玩內容公開，但只有本人能操作自己的案件。此版本沒有考生模式，建立時即為正式任職警員。`],
    ['positions','02｜職位、職務等階與胸章配階',
      '**官、職分立：三個欄位分開看**\n個人官階是角色的任官階級；職務等階是職缺列等範圍；幾線幾星是職務配階。兼任所長或副所長不會直接變成另一個官階。\n\n'+
      '每個職位改為獨立卡片，右側各有對應階級圖；請往下查看「職位圖鑑」。\n直轄市：主管職缺按直轄市編制標示。\n縣（市）：配階不同的主管職務另有獨立卡片。'+
      `\n\n兼任配置及特定所隊仍須個別核對編制；上列縣市不含另有準用直轄市規定的情形。角色的個人官階由遊戲任命設定，不代表同職位的人都敘同一階。\n\n[階級原圖：Akira123／Wikimedia Commons](https://commons.wikimedia.org/wiki/File:TW-Police-Rank_06.svg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)｜[官方陞遷序列表](${careerSources.positions})｜[人事條例](${careerSources.personnel})\n[警政署職務配階圖（第13頁）](${careerSources.insignia})｜[署長職務等階](${careerSources.commissioner})`],
    ['promotion','03｜升遷條件與職涯順序',
      '**先符合升遷條件，再由玩家選填職缺；兼任不是必經路線。**\n\n/升遷 → 查看可選升遷職缺 → 選擇一般或兼任職缺 → 確認派任。巡佐可走一般巡佐、警務佐、偵查佐或兼任職；巡官可走業務承辦、偵查、交通或派出所主管職。勤務題目隨選定職務切換。\n\n**二線四星**\n直轄市路線在警務正與分局長之間新增副分局長；縣（市）分局長也依機關編制顯示二線四星。\n\n**同序列輪調**\n輸入 /輪調 選填不同單位或職務。初任滿 12 個遊戲月開放，後續派任滿 18 個月再開放；基層職缺含外縣市選項。輪調保留升遷年資、績效、考績與研習。\n\n**升遷門檻（遊戲規則）**\n'+careerDisplayOrder.filter(i=>i!==8).map(i=>{const r=stages[i];return `${r.title}等職務層級：滿 ${r.years} 年、現職績效 ${r.merit.toFixed(1)}，可選下一層級職缺${stages[nextStage({stage:i,unit:'新北市警察局'})]?.training?'；另須 '+stages[nextStage({stage:i,unit:'新北市警察局'})]?.training:''}。`}).join('\n')+'\n\n最近兩年考績須 B 以上，先結算未完成案件。升遷後重計現職年資與績效，生涯總績效保留。DC 的月份與門檻仍採簡化規則，存檔與網頁分開。'],
    ['performance','04｜績效、時間與年度考績',
      '**一件正式勤務＝一個遊戲月份**\n妥適處置：績效 **+0.2**，年度評分 100 分。\n部分妥適：績效 **+0.1**，年度評分 60 分。\n有風險的處置：績效 **+0**，年度評分 20 分。\n\n**每 12 件正式勤務，自動結算一個年度**\n該年度處置評分平均 **85 分以上為 A**、**70 分以上為 B**、未滿 70 分為 C。不必額外申請考績。\n\n總績效持續累積，沒有終身 6 點上限。研習不增加月份或勤務績效；重複按同一題、查看資料卡或載入存檔都不會重複加分。結果卡會顯示績效前後變化，/角色 可查總分與最近考績。'],
    ['faq','05｜研習、排名與常見問題',
      '**研習申請後怎麼完成？**\n下一職務有研習需求時輸入 /訓練，連續答對 **3 題** 即完成並立即記錄；答錯重新累計。回到 /升遷 確認條件。研習使用遊戲業務情境，並非官方訓練試題。\n\n**排名怎麼比？**\n先比職務序列，再比總績效，最後比完成勤務數；完全相同並列。固定榜單顯示前 20 名，角色頻道則顯示所有已建立角色的玩家。\n\n**為什麼不能按別人的案件？**\n每位玩家各自存檔，只有本人能作答與申請升遷，其他人可以觀看。\n\n**重新啟動會重玩嗎？**\n不會。角色、未完成案件、頻道與資料卡都存於雲端持久資料庫。DC 與網頁版存檔分開。\n\n**退休後呢？**\n本版模擬退休年齡為 65 歲；退休後可查看角色與履歷。\n\n**頻道不見或資料卡被刪？**\n管理員可輸入 /遊戲頻道 修復；機器人需要管理頻道及頻道內讀寫、嵌入連結與讀取訊息歷史權限。']
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
    const state={...this.game.settings(id)};
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
      this.game.setSettings(id,state); // Retain partial setup; retry never duplicates created channels.
    }
    if(new Set(Object.keys(channelNames).map(k=>state[k])).size!==4)throw new GameError('角色、遊戲、排名及說明請分別使用四個不同的頻道。');
    this.game.setSettings(id,state);
    await this.upsert(id,state.play,'lobby',{embeds:[embed('警察生涯｜遊戲大廳',
      `在這裡輸入 **/開始** 建立角色，**/任務** 接案件，以 A／B／C 作答。\n\n遊玩內容公開，其他人能觀看，但只有案件本人可以操作按鈕。\n\n角色資料：<#${state.profiles}>\n生涯排名：<#${state.ranking}>\n玩法與職位說明：<#${state.guide}>\n\n/角色、/履歷、/訓練、/升遷、/輪調、/說明 都在本頻道使用。`)],components:[]});
    const cards=guideCards(state);
    for(const card of cards)await this.upsert(id,state.guide,card.slot,card.payload);
    this.logger.log(`COMMUNITY_GUIDE_SYNCED channel=${state.guide} messages=${cards.length}`);
    return state;
  });}
  guard(i){const s=this.game.settings(i.guildId);if(s.play&&i.channelId!==s.play)throw new GameError(`請到 <#${s.play}> 遊玩，角色資料與排名頻道會自動更新。`);}
  async upsert(guild,channelId,slot,payload){
    if(this.closed)return;
    const channel=await this.client.channels.fetch(channelId);
    if(!channel||channel.guildId!==guild||channel.type!==ChannelType.GuildText)throw new GameError('遊戲頻道已移除，請重新執行 /遊戲頻道。');
    const options={...preparePayload(payload),allowedMentions:{parse:[]}},id=this.game.message(guild,channelId,slot);
    if(id){
      try{const old=await channel.messages.fetch(id);const updated=await old.edit(options);this.verifyMedia(options,updated);return;}
      catch(e){if(e.code!==10008)throw e;} // Only recreate a genuinely deleted message.
    }
    const message=await channel.send(options);this.verifyMedia(options,message);this.game.setMessage(guild,channelId,slot,message.id);
  }
  verifyMedia(options,message){
    if(!options.files.length)return;
    const images=(message?.embeds||[]).flatMap(e=>[e.image?.url,e.thumbnail?.url]).filter(Boolean);
    const hosted=images.some(url=>/^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\//.test(url));
    this.logger.log(`COMMUNITY_INSIGNIA_DELIVERY files=${options.files.length} attachments=${message?.attachments?.size??0} discordImage=${hosted}`);
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
    const chosen={profiles:i.options.getChannel('角色'),play:i.options.getChannel('遊戲'),ranking:i.options.getChannel('排名'),guide:i.options.getChannel('說明')};
    const core=[chosen.profiles,chosen.play,chosen.ranking];
    if(core.some(Boolean)&&core.some(c=>!c))throw new GameError('指定既有核心頻道時，請同時選好角色、遊戲、排名三個頻道；說明頻道可單獨指定。');
    const future={...this.game.settings(i.guildId),...Object.fromEntries(Object.entries(chosen).filter(([,c])=>c).map(([k,c])=>[k,c.id]))};
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
