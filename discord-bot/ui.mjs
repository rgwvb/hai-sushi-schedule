import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, escapeMarkdown } from 'discord.js';
import { stages, stamp, GameError,careerRole,currentRank } from './game.mjs';
import { withInsignia,preparePayload } from './insignia.mjs';
import { positionSummary } from './career.mjs';
import {handleWeb} from './web-ui.mjs';
const safe=value=>escapeMarkdown(String(value));
const blue=0x2463b2;
const card=(title,text)=>new EmbedBuilder().setColor(blue).setTitle(title).setDescription(text).setFooter({text:'DC 獨立存檔 · 生涯與升遷採簡化遊戲規則'});
const button=(id,label,style=ButtonStyle.Secondary)=>new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
const row=(...buttons)=>new ActionRowBuilder().addComponents(...buttons);
const nav=user=>row(button('nav:'+user+':mission','接下一件勤務',ButtonStyle.Primary),button('nav:'+user+':profile','我的角色'),button('nav:'+user+':promotion','升遷條件'),button('nav:'+user+':rotation','輪調選缺'));
export const help=()=>({embeds:[card('台灣警察生涯｜文字頻道版',
  '**/開始** 開啟生涯。新玩家從考生建立身分，依序選路線、備考、考試、受訓及分發。\n**/任務** 依目前職務處理案件與法規題\n**/角色** 查看角色、階級與進度\n**/履歷** 查看生涯紀錄\n**/訓練、/升遷** 查看網頁版的訓練及升遷條件\n**/輪調** 選填一般或兼任職缺\n**/排名** 查看伺服器榜單\n\n新版使用網頁版同一份遊戲程式；下方選單可切換備考、學堂、指揮、考績與生活。只有本人可操作，解析後用按鈕繼續。考生沒有階級；主管功能依職務開放。DC 與網頁存檔仍各自獨立。\n\n舊版角色可在 /角色 按「切換網頁規則」保留職位、階級、年資及既有成果；原始存檔另保留備份。舊版的簡化研習不視為完成新版官等訓練。')],components:[]});
export function creationModal(){return new ModalBuilder().setCustomId('create-career').setTitle('建立警察生涯').addComponents(
  row(new TextInputBuilder().setCustomId('name').setLabel('角色姓名').setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(20).setRequired(true)),
  row(new TextInputBuilder().setCustomId('unit').setLabel('任職單位（可填全台各縣市單位）').setPlaceholder('例：新北市政府警察局板橋分局某派出所').setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(80).setRequired(true))
);}
export function profile(p,user){const r=careerRole(p);return {embeds:[withInsignia(card(safe(p.name)+'｜'+r.title,
  '**職位：'+r.title+'**\n\n**個人官階（遊戲）：'+currentRank(p)+'**\n\n**職務配階：'+r.badge+'**\n'+positionSummary(r)+'\n\n**任職單位**\n'+safe(p.unit)+(r.scopeNote?'\n'+r.scopeNote:'')+'\n\n'+stamp(p.month)+'｜'+(22+Math.floor(p.month/12))+' 歲\n服務年資 '+(p.month/12).toFixed(1)+' 年｜完成勤務 '+p.completed+' 件\n**勤務績效 '+p.merit.toFixed(1)+'**\n最近考績：'+(p.appraisals.slice(-2).map(a=>a.year+' '+a.grade+'（'+a.score+'）').join('、')||'尚未滿一年')+(p.month>=516?'\n\n已屆本版模擬退休年齡。':'') ),r)],components:[nav(user),row(button('web:'+user+':enable:start','切換網頁規則（保留進度）',ButtonStyle.Success))]};}
export function missionCard(p,m,user){const r=careerRole(p);return {embeds:[withInsignia(card((m.kind==='training'?'模擬研習｜':'勤務｜')+m.title,
  '**'+safe(p.name)+'｜'+r.title+'**\n\n**'+currentRank(p)+'｜'+r.badge+'**\n\n'+safe(p.unit)+'\n'+(m.kind==='training'?m.training+'｜連續答對 '+p.trainingProgress+'／3 題\n':'')+'\n'+m.story+'\n\n'+m.choices.map((c,i)=>'**'+['A','B','C'][i]+'** '+c.text).join('\n\n')+'\n\n'+(r.deck==='patrol'?'你負責本人及搭檔勤務；跨單位調度請通報主管。':(r.authority==='deputy'||r.title.includes('副'))?'依授權協助正主管，超出範圍須呈報核定。':(r.authority==='staff'||r.deck==='staff')?'你負責承辦、查驗與呈報，資源需經權責核定。':r.authority==='team'?'依授權帶領本班或小隊；超出範圍須呈報主管。':'依職務權責協調分工，跨單位需求仍須核定。')),r)],
  components:[row(...m.choices.map((_,i)=>button(`answer:${user}:${m.id}:${i}`,['A','B','C'][i],ButtonStyle.Primary)))]};}
export function resultCard(result,user){const {p,mission:m,choice,before,after,award,annual}=result;
  const r=careerRole(p);
  let text='**'+r.title+'｜'+r.badge+'**\n\n**你的處置：**'+choice.text+'\n\n**案件分析**\n'+m.analysis+'\n\n'+(choice.quality===100?'✅ 處置妥適。':choice.quality===60?'🟡 有處理，但查證或銜接仍可改善。':'🔴 這項處置有程序或安全風險，建議重新檢視。');
  if(m.kind==='training')text+='\n\n'+(p.trained.includes(m.training)?'✅ '+m.training+' 已完成。':'研習連續答對 '+p.trainingProgress+'／3 題；答錯會重新累計。');
  else text+='\n\n**勤務績效 '+before.toFixed(1)+' → '+after.toFixed(1)+'（+'+award.toFixed(1)+'）**\n時間推進至 '+stamp(p.month)+(annual?'\n'+annual.year+' 年度考績：**'+annual.grade+'**（'+annual.score+' 分）':'');
  const controls=m.kind==='training'&&!p.trained.includes(m.training)?row(button('nav:'+user+':training','繼續研習',ButtonStyle.Primary),button('nav:'+user+':promotion','查看升遷')):nav(user);
  return {embeds:[withInsignia(card('處理結果｜'+safe(p.name)+'｜'+m.title,text),r)],components:[controls]};
}
export function promotionCard(game,p,user){const q=game.requirements(p);return {embeds:[withInsignia(card('升遷申請',
  (q.next?'下一職務層級：**'+q.next.title+'等職缺｜'+q.next.badge+'**\n'+positionSummary(q.next)+'\n\n':'')+q.lines.join('\n')+'\n\n個人官階與職務等階分開；研習、年資及績效門檻仍為 DC 版模擬規則，並非完整法定任用條件。'),q.next||careerRole(p))],components:q.next?[row(
    ...(q.ready?[button('promote:'+user+':'+p.stage,'查看可選升遷職缺',ButtonStyle.Success)]:[]),
    ...(q.next.training&&!p.trained.includes(q.next.training)?[button('nav:'+user+':training','開始模擬研習',ButtonStyle.Primary)]:[]),button('nav:'+user+':mission','繼續勤務'))]:[]};}
export function vacancyCard(p,offer,user,page=0){
  const pages=Math.ceil(offer.rows.length/4);
  if(!Number.isInteger(page)||page<0||page>=pages)throw new GameError('無效職缺頁碼。');
  const start=page*4,rows=offer.rows.slice(start,start+4);
  return {embeds:[withInsignia(card(offer.kind==='promotion'?'升遷｜選填職缺':'輪調｜選填同序列職缺',
    '一般職務與兼任職務都可選，按下職缺即確認派任。\n'+(offer.kind==='rotation'?'輪調保留升遷年資、績效、考績及研習進度。':'符合條件後，由你選擇下一個職缺。')+'\n\n'+rows.map((r,i)=>`**${start+i+1}. ${r.role.title}**\n${safe(r.unit)}`).join('\n\n')+`\n\n第 ${page+1}／${pages} 頁；以上為模擬職缺。`),careerRole({...p,post:null},offer.target))],components:[
    ...rows.map((r,i)=>row(button(`choose:${user}:${offer.id}:${start+i}`,`${start+i+1}. ${r.role.title}`,ButtonStyle.Success))),
    row(...(page>0?[button(`jobs:${user}:${offer.id}:${page-1}`,'上一頁')]:[]),...(page+1<pages?[button(`jobs:${user}:${offer.id}:${page+1}`,'下一頁')]:[]),button('nav:'+user+':profile','回角色'))]};
}
export function historyCard(p,user){return {embeds:[card('生涯履歷｜'+safe(p.name),
  p.history.slice(-16).reverse().map(h=>'**'+h.date+'**\n'+safe(h.text)).join('\n\n'))],components:[nav(user)]};}
export async function handle(interaction,game,{community,mirror}={}){
  if(!interaction.isChatInputCommand()&&!interaction.isButton()&&!interaction.isModalSubmit()&&!interaction.isStringSelectMenu?.())return;
  const guild=interaction.guildId,user=interaction.user.id;
  const options={allowedMentions:{parse:[]}};
  const send=async payload=>{
    const result=interaction.deferred?await interaction.editReply({...options,...preparePayload(payload)}):interaction.isButton()?await interaction.update({...options,...preparePayload(payload)}):await interaction.reply({...options,...preparePayload(payload),flags:0});
    community?.schedule(guild,user);mirror?.schedule();return result;
  };
  try{
    if(!guild)throw new GameError('請到已加入機器人的伺服器文字頻道使用。');
    if(await handleWeb(interaction,game,{community,mirror}))return;
    let action=interaction.commandName;
    if(game.remote){
      if(interaction.isButton()&&interaction.customId.split(':')[1]!==user)throw new GameError('這是另一位玩家的生涯，請使用自己的指令。');
      if(interaction.isButton()&&interaction.customId==='nav:'+user+':create')return await interaction.showModal(creationModal());
      if(action!=='遊戲頻道'&&!interaction.deferred){
        if(interaction.isButton())await interaction.deferUpdate();else await interaction.deferReply({flags:0});
      }
    }
    if(interaction.isButton()){
      if(interaction.customId.split(':')[1]!==user)throw new GameError('這是另一位玩家的生涯，請使用自己的指令。');
      if((await game.get(guild,user))?.webCareer)throw new GameError('角色已切換網頁版規則，請用 /開始 開啟新版操作卡。');
    }
    if(action==='遊戲頻道'){
      if(!community)throw new GameError('目前啟動方式尚未提供頻道設定。');
      return await community.setup(interaction);
    }
    if(action==='排名'){
      const {rankingCard}=await import('./community.mjs');
      return await send(rankingCard(await game.players(guild)));
    }
    await community?.guard(interaction);
    if(interaction.isButton()){
      const [type,owner,value,index]=interaction.customId.split(':');
      if(owner!==user)throw new GameError('這是另一位玩家的生涯，請使用 /開始 或 /任務。');
      if(type==='answer')return await send(resultCard(await game.answer(guild,user,owner,value,Number(index)),user));
      if(type==='promote'){
        if((await game.get(guild,user))?.stage!==Number(value))throw new GameError('升遷卡已過期，請重新輸入 /升遷。');
        const r=await game.offers(guild,user,'promotion');return await send(vacancyCard(r.p,r.offer,user));
      }
      if(type==='jobs'){
        const p=await game.get(guild,user);if(!p?.offer||p.offer.id!==value)throw new GameError('職缺表已過期，請重新選填。');
        return await send(vacancyCard(p,p.offer,user,Number(index)));
      }
      if(type==='choose')return await send(profile(await game.appoint(guild,user,value,Number(index)),user));
      if(type!=='nav')throw new GameError('這個按鈕無法使用，請輸入 /任務。');
      action={mission:'任務',profile:'角色',promotion:'升遷',training:'訓練',rotation:'輪調'}[value];
    }
    if(interaction.isModalSubmit()){
      if(interaction.customId!=='create-career')return;
      return await send(profile(await game.create(guild,user,interaction.fields.getTextInputValue('name'),interaction.fields.getTextInputValue('unit')),user));
    }
    if(action==='說明')return await send(help());
    const p=await game.get(guild,user);
    if(action==='開始'){
      if(p)return await send(profile(p,user));
      if(game.remote)return await send({embeds:[card('建立警察生涯','按下「建立角色」填寫姓名與任職單位。')],components:[row(button('nav:'+user+':create','建立角色',ButtonStyle.Primary))]});
      return await interaction.showModal(creationModal());
    }
    if(!p)throw new GameError('請先輸入 /開始 建立已正式任職的警員角色。');
    if(action==='角色')return await send(profile(p,user));
    if(action==='履歷')return await send(historyCard(p,user));
    if(action==='輪調'){const r=await game.offers(guild,user,'rotation');return await send(vacancyCard(r.p,r.offer,user));}
    if(action==='升遷')return await send(promotionCard(game,p,user));
    if(action==='任務'||action==='訓練'){
      const r=await game.mission(guild,user,action==='訓練'?'training':'duty');
      return await send(missionCard(r.p,r.mission,user));
    }
    throw new GameError('請輸入 /說明 查看可用指令。');
  }catch(e){
    // Never log interaction tokens, input fields or player state.
    if(!(e instanceof GameError))console.error('Interaction failed:',e.name,e.code||'');
    if(interaction.replied)return;
    if(interaction.deferred){await interaction.editReply({content:e instanceof GameError?e.message:'操作未完成，請重新查詢角色存檔後再試。',embeds:[],components:[],attachments:[]}).catch(()=>{});return;}
    await interaction.reply({content:e instanceof GameError?e.message:'操作未完成。若已結算，請用 /角色 查看存檔；再用 /任務 繼續。',flags:64,allowedMentions:{parse:[]}}).catch(()=>{});
  }
}
