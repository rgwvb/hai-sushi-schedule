import {ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,EmbedBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,escapeMarkdown} from 'discord.js';
import {GameError} from './game.mjs';
import {preparePayload,withInsignia} from './insignia.mjs';
const row=(...x)=>new ActionRowBuilder().addComponents(...x);
const button=(id,label,style=ButtonStyle.Secondary)=>new ButtonBuilder().setCustomId(id).setLabel(label.slice(0,80)||'操作').setStyle(style);
export function fullCard(view,user,{controlsPage=0}={}){
  const prefix=`web:${user}:${view.revision}:`,text=escapeMarkdown(view.text||'請選擇下方操作。');
  const display=Math.min(Math.max(0,view.display||0),Math.max(0,Math.ceil(text.length/3300)-1));
  const embed=new EmbedBuilder().setColor(0x2463b2).setTitle((view.title+'｜'+(view.role||'考生')).slice(0,256)).setDescription((view.notice?'**'+escapeMarkdown(view.notice)+'**\n\n':'')+text.slice(display*3300,(display+1)*3300)).setFooter({text:'網頁版共用遊戲程式 · DC 按鈕操作 · 獨立存檔｜'+view.date});
  // Candidates have neither rank nor insignia.
  if(view.rank&&view.rank!=='—'&&!['考生','待分發'].includes(view.role))withInsignia(embed,{badge:view.badge});
  if(view.links?.length)embed.addFields({name:'資料來源',value:view.links.map(l=>'['+escapeMarkdown(l.label).slice(0,80)+']('+l.url+')').join('\n').slice(0,1000)});
  const components=[];
  if(view.selection){
    const a=view.selection;
    if(a.kind!=='select')throw new GameError('請用輸入按鈕填寫資料。');
    const offset=Math.min(a.offset,Math.max(0,a.options.length-1)),options=a.options.slice(offset,offset+25);
    if(options.length)components.push(row(new StringSelectMenuBuilder().setCustomId(prefix+'select:'+a.action).setPlaceholder(a.label.slice(0,150)).addOptions(options.map((o,i)=>({label:o.label.trim().slice(0,100)||'未選擇',value:String(offset+i)})))));
    components.push(row(...(offset>0?[button(prefix+'options:'+a.action+':'+Math.max(0,offset-25),'上一頁選項')]:[]),...(offset+25<a.options.length?[button(prefix+'options:'+a.action+':'+(offset+25),'下一頁選項')]:[]),button(prefix+'home','返回畫面')));
    embed.setDescription('**'+escapeMarkdown(a.label)+'**\n目前：'+escapeMarkdown(a.options.find(o=>o.value===a.value)?.label||'未選擇')+'\n\n從下方選單選擇；第 '+(offset+1)+'～'+Math.min(offset+25,a.options.length)+' 項，共 '+a.options.length+' 項。');
  }else{
    if(view.pages.length)components.push(row(new StringSelectMenuBuilder().setCustomId(prefix+'nav').setPlaceholder('切換功能：勤務／學堂／升遷／考績…').addOptions(view.pages.slice(0,25).map((p,i)=>({label:p.label.slice(0,100),value:String(view.controls.length+i)})))));
    const page=Math.min(Math.max(0,controlsPage),Math.max(0,Math.ceil(view.controls.length/10)-1));
    const controls=view.controls.slice(page*10,(page+1)*10);
    for(let i=0;i<controls.length;i+=5)components.push(row(...controls.slice(i,i+5).map((c,j)=>button(prefix+(c.kind==='input'?'edit:':'act:')+(page*10+i+j),c.label,c.kind==='click'?ButtonStyle.Primary:ButtonStyle.Secondary))));
    if(view.controls.length>10)components.push(row(...(page>0?[button(prefix+'controls:'+(page-1),'上一頁操作')]:[]),...(page+1<Math.ceil(view.controls.length/10)?[button(prefix+'controls:'+(page+1),'下一頁操作')]:[])));
    if(text.length>3300)components.push(row(...(display>0?[button(prefix+'text:'+(display-1),'上一頁內容')]:[]),...(display+1<Math.ceil(text.length/3300)?[button(prefix+'text:'+(display+1),'下一頁內容')]:[])));
  }
  return {embeds:[embed],components};
}
const commands={開始:null,角色:'dashboard',任務:'duty',訓練:'career',升遷:'career',輪調:'unit',履歷:'records'};
export async function handleWeb(i,game,{community,mirror}={}){
  const isSelect=i.isStringSelectMenu?.()||false;
  const custom=i.customId?.startsWith('web:');
  if(!custom&&!Object.hasOwn(commands,i.commandName))return false;
  const user=i.user.id,guild=i.guildId;
  if(!guild)return false;
  const parts=custom?i.customId.split(':'):[];
  if(custom&&parts[1]!==user)throw new GameError('這是另一位玩家的生涯，請使用自己的指令。');
  if(game.remote&&parts[3]!=='edit'&&!i.deferred){if(i.isButton()||isSelect)await i.deferUpdate();else await i.deferReply({flags:0});}
  let p=await game.get(guild,user);
  if(!custom&&!p&&i.commandName!=='開始')return false;
  if(!custom&&p&&!p.webCareer)return false;
  await community?.guard(i);
  if(custom&&parts[2]!=='enable'&&(!p?.webView||parts[2]!==p.webView.revision))throw new GameError('這張操作卡已更新，請用 /開始 開啟最新進度。');
  const op=parts[3],index=Number(parts[4]);
  const action=custom?p?.webView?.actions[index]:null;
  if(custom&&op==='edit'&&action?.kind==='input'){
    const modal=new ModalBuilder().setCustomId(`web:${user}:${p.webView.revision}:input:${index}`).setTitle(action.label.slice(0,45));
    const input=new TextInputBuilder().setCustomId('value').setLabel(action.label.slice(0,45)).setStyle(TextInputStyle.Short).setMaxLength(action.path==='#charName'?20:100).setRequired(true);
    if(action.value)input.setValue(action.value.slice(0,100));
    await i.showModal(modal.addComponents(row(input)));return true;
  }
  if(!i.deferred){if(i.isButton()||isSelect)await i.deferUpdate();else await i.deferReply({flags:0});}
  let request={};
  if(!p){p=await game.create(guild,user,'新考生','尚未分發');request={start:true};}
  else if(parts[2]==='enable')request={start:true};
  else if(custom){
    if(op==='act'||op==='options')request={revision:parts[2],action:index,offset:op==='options'?Number(parts[5]):0};
    else if(op==='nav')request={revision:parts[2],action:Number(i.values[0])};
    else if(op==='input')request={revision:parts[2],action:index,value:i.fields.getTextInputValue('value')};
    else if(op==='select'){
      const value=Number(i.values[0]);
      if(!action?.options||!Number.isInteger(value)||!action.options[value])throw new GameError('無效選項。');
      request={revision:parts[2],action:index,value:action.options[value].value};
    }else if(op==='text')request={display:index};
    else if(op==='controls')request={display:0};
    else if(op!=='home')throw new GameError('無效操作。');
  }else if(commands[i.commandName]){
    const page=commands[i.commandName];
    // Before appointment, /任務 continues the entrance flow rather than exposing officer controls.
    request=p.webSummary?.sequence===99?{}:{page};
  }
  const result=await game.fullAction(guild,user,request);
  if(result.view.selection)result.view.selection.action=index;
  await i.editReply({allowedMentions:{parse:[]},...preparePayload(fullCard(result.view,user,{controlsPage:op==='controls'?index:0}))});
  community?.schedule(guild,user);mirror?.schedule();return true;
}
