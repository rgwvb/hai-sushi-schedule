import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, escapeMarkdown } from 'discord.js';
import { stages, stamp, GameError } from './game.mjs';
const safe=value=>escapeMarkdown(String(value));
const blue=0x2463b2;
const card=(title,text)=>new EmbedBuilder().setColor(blue).setTitle(title).setDescription(text).setFooter({text:'DC 獨立存檔 · 生涯與升遷採簡化遊戲規則'});
const button=(id,label,style=ButtonStyle.Secondary)=>new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
const row=(...buttons)=>new ActionRowBuilder().addComponents(...buttons);
const nav=user=>row(button('nav:'+user+':mission','接下一件勤務',ButtonStyle.Primary),button('nav:'+user+':profile','我的角色'),button('nav:'+user+':promotion','升遷條件'));
export const help=()=>({embeds:[card('台灣警察生涯｜文字頻道版',
  '**/開始** 建立已正式任職的警員角色\n**/任務** 依目前職務接案，以 A／B／C 選擇處置\n**/角色** 查看階級、年資、績效與考績\n**/履歷** 查看最近的生涯紀錄\n**/訓練** 進行下一職務需要的模擬研習\n**/升遷** 查看條件及申請下一職務\n**/排名** 查看本伺服器生涯排行榜\n**/遊戲頻道** 管理員設定三個專用頻道\n\n遊玩與角色資料公開；只有本人可操作自己的案件按鈕。每件正式勤務推進一個遊戲月份；每 12 件自動結算年度考績。研習連續答對 3 題即完成，不增加年資或績效。每位玩家、每個伺服器各自存檔，與網頁版分開。')],components:[]});
export function creationModal(){return new ModalBuilder().setCustomId('create-career').setTitle('建立警察生涯').addComponents(
  row(new TextInputBuilder().setCustomId('name').setLabel('角色姓名').setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(20).setRequired(true)),
  row(new TextInputBuilder().setCustomId('unit').setLabel('任職單位（可填全台各縣市單位）').setPlaceholder('例：新北市政府警察局板橋分局某派出所').setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(80).setRequired(true))
);}
export function profile(p,user){const r=stages[p.stage];return {embeds:[card(safe(p.name)+'｜'+r.title,
  '**'+r.rank+' '+r.title+'**\n'+safe(p.unit)+'\n\n'+stamp(p.month)+'｜'+(22+Math.floor(p.month/12))+' 歲\n服務年資 '+(p.month/12).toFixed(1)+' 年｜完成勤務 '+p.completed+' 件\n**勤務績效 '+p.merit.toFixed(1)+'**\n最近考績：'+(p.appraisals.slice(-2).map(a=>a.year+' '+a.grade+'（'+a.score+'）').join('、')||'尚未滿一年')+(p.month>=516?'\n\n已屆本版模擬退休年齡。':'') )],components:[nav(user)]};}
export function missionCard(p,m,user){const r=stages[p.stage];return {embeds:[card((m.kind==='training'?'模擬研習｜':'勤務｜')+m.title,
  '**'+safe(p.name)+'｜'+r.rank+' '+r.title+'** · '+safe(p.unit)+'\n'+(m.kind==='training'?m.training+'｜連續答對 '+p.trainingProgress+'／3 題\n':'')+'\n'+m.story+'\n\n'+m.choices.map((c,i)=>'**'+['A','B','C'][i]+'** '+c.text).join('\n\n')+'\n\n'+(r.deck==='patrol'?'你負責本人及搭檔勤務；跨單位調度請通報主管。':r.title.includes('副')?'依授權協助正主管，超出範圍須呈報核定。':r.deck==='staff'?'你負責承辦、查驗與呈報，資源需經權責核定。':'依職務權責協調分工，跨單位需求仍須核定。'))],
  components:[row(...m.choices.map((_,i)=>button(`answer:${user}:${m.id}:${i}`,['A','B','C'][i],ButtonStyle.Primary)))]};}
export function resultCard(result,user){const {p,mission:m,choice,before,after,award,annual}=result;
  let text='**你的處置：**'+choice.text+'\n\n**案件分析**\n'+m.analysis+'\n\n'+(choice.quality===100?'✅ 處置妥適。':choice.quality===60?'🟡 有處理，但查證或銜接仍可改善。':'🔴 這項處置有程序或安全風險，建議重新檢視。');
  if(m.kind==='training')text+='\n\n'+(p.trained.includes(m.training)?'✅ '+m.training+' 已完成。':'研習連續答對 '+p.trainingProgress+'／3 題；答錯會重新累計。');
  else text+='\n\n**勤務績效 '+before.toFixed(1)+' → '+after.toFixed(1)+'（+'+award.toFixed(1)+'）**\n時間推進至 '+stamp(p.month)+(annual?'\n'+annual.year+' 年度考績：**'+annual.grade+'**（'+annual.score+' 分）':'');
  const controls=m.kind==='training'&&!p.trained.includes(m.training)?row(button('nav:'+user+':training','繼續研習',ButtonStyle.Primary),button('nav:'+user+':promotion','查看升遷')):nav(user);
  return {embeds:[card('處理結果｜'+safe(p.name)+'｜'+m.title,text)],components:[controls]};
}
export function promotionCard(game,p,user){const q=game.requirements(p);return {embeds:[card('升遷申請',
  (q.next?'下一職務：**'+q.next.rank+' '+q.next.title+'**\n\n':'')+q.lines.join('\n')+'\n\n此為 DC 版簡化遊戲條件，實際任用須依正式法規與職缺。')],components:q.next?[row(
    ...(q.ready?[button('promote:'+user+':'+p.stage,'確認申請升遷',ButtonStyle.Success)]:[]),
    ...(q.next.training&&!p.trained.includes(q.next.training)?[button('nav:'+user+':training','開始模擬研習',ButtonStyle.Primary)]:[]),button('nav:'+user+':mission','繼續勤務'))]:[]};}
export function historyCard(p,user){return {embeds:[card('生涯履歷｜'+safe(p.name),
  p.history.slice(-16).reverse().map(h=>'**'+h.date+'**\n'+safe(h.text)).join('\n\n'))],components:[nav(user)]};}
export async function handle(interaction,game,{community}={}){
  if(!interaction.isChatInputCommand()&&!interaction.isButton()&&!interaction.isModalSubmit())return;
  const guild=interaction.guildId,user=interaction.user.id;
  const options={allowedMentions:{parse:[]}};
  const send=async payload=>{
    const result=interaction.isButton()?await interaction.update({...options,...payload}):await interaction.reply({...options,...payload,flags:0});
    community?.schedule(guild,user);return result;
  };
  try{
    if(!guild)throw new GameError('請到已加入機器人的伺服器文字頻道使用。');
    let action=interaction.commandName;
    if(action==='遊戲頻道'){
      if(!community)throw new GameError('目前啟動方式尚未提供頻道設定。');
      return await community.setup(interaction);
    }
    if(action==='排名'){
      const {rankingCard}=await import('./community.mjs');
      return await send(rankingCard(game.players(guild)));
    }
    community?.guard(interaction);
    if(interaction.isButton()){
      const [type,owner,value,index]=interaction.customId.split(':');
      if(owner!==user)throw new GameError('這是另一位玩家的生涯，請使用 /開始 或 /任務。');
      if(type==='answer')return await send(resultCard(game.answer(guild,user,owner,value,Number(index)),user));
      if(type==='promote')return await send(profile(game.promote(guild,user,Number(value)),user));
      if(type!=='nav')throw new GameError('這個按鈕無法使用，請輸入 /任務。');
      action={mission:'任務',profile:'角色',promotion:'升遷',training:'訓練'}[value];
    }
    if(interaction.isModalSubmit()){
      if(interaction.customId!=='create-career')return;
      return await send(profile(game.create(guild,user,interaction.fields.getTextInputValue('name'),interaction.fields.getTextInputValue('unit')),user));
    }
    if(action==='說明')return await send(help());
    const p=game.get(guild,user);
    if(action==='開始'){
      if(p)return await send(profile(p,user));
      return await interaction.showModal(creationModal());
    }
    if(!p)throw new GameError('請先輸入 /開始 建立已正式任職的警員角色。');
    if(action==='角色')return await send(profile(p,user));
    if(action==='履歷')return await send(historyCard(p,user));
    if(action==='升遷')return await send(promotionCard(game,p,user));
    if(action==='任務'||action==='訓練'){
      const r=game.mission(guild,user,action==='訓練'?'training':'duty');
      return await send(missionCard(r.p,r.mission,user));
    }
    throw new GameError('請輸入 /說明 查看可用指令。');
  }catch(e){
    // Never log interaction tokens, input fields or player state.
    if(!(e instanceof GameError))console.error('Interaction failed:',e.name,e.code||'');
    if(interaction.replied||interaction.deferred)return;
    await interaction.reply({content:e instanceof GameError?e.message:'操作未完成。若已結算，請用 /角色 查看存檔；再用 /任務 繼續。',flags:64,allowedMentions:{parse:[]}}).catch(()=>{});
  }
}
