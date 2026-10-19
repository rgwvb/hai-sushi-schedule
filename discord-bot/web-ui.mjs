import {ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,EmbedBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,escapeMarkdown} from 'discord.js';
import {GameError} from './game.mjs';
import {preparePayload,withInsignia} from './insignia.mjs';
const row=(...x)=>new ActionRowBuilder().addComponents(...x);
const button=(id,label,style=ButtonStyle.Secondary)=>new ButtonBuilder().setCustomId(id).setLabel(label.slice(0,80)||'操作').setStyle(style);
function compactCard(view,user,controlsPage=0){
  const c=view.compact,prefix=`web:${user}:${view.revision}:`,components=[];
  const quick=[['duty','勤務'],['dashboard','角色'],['unit','輪調'],['career','升遷']].map(([value,label])=>{const i=view.pages.findIndex(p=>p.value===value);return i<0?null:button(prefix+'act:'+(view.controls.length+i),label);}).filter(Boolean);
  components.push(row(...quick,button(prefix+'menu','更多')));
  let body=c.text,primary=c.primary,answerIndexes=c.answerIndexes||[];
  let page=Math.max(0,controlsPage),pages=1;
  if(c.mode==='vacancies'&&c.cards.length){
    pages=Math.ceil(c.cards.length/4);page=Math.min(page,pages-1);
    const cards=c.cards.slice(page*4,page*4+4);body+='\n\n'+cards.map((v,i)=>`${v.selected?'✅ ':''}${page*4+i+1}. ${v.unit}\n${v.title}${v.badge?'｜'+v.badge:''}`).join('\n\n');
    primary=cards.map(v=>v.action).concat(c.primary);if(c.feedback)body+='\n\n'+c.feedback;
  }else{
    pages=Math.max(1,Math.ceil(primary.length/8));page=Math.min(page,pages-1);primary=primary.slice(page*8,page*8+8);
  }
  const fieldPages=[[]];let fieldSize=0;
  for(const f of c.fields||[]){
    const value=escapeMarkdown(f.value||'—');
    for(let offset=0;offset<value.length;offset+=850){
      const chunk={name:f.name+(offset?'（續）':''),value:value.slice(offset,offset+850),inline:f.inline};
      if(fieldPages.at(-1).length>=6||fieldSize+chunk.value.length>2200){fieldPages.push([]);fieldSize=0;}
      fieldPages.at(-1).push(chunk);fieldSize+=chunk.value.length;
    }
  }
  const escaped=escapeMarkdown(body),bodySize=c.fields?.length?1200:2700,textPages=Math.max(1,Math.ceil(escaped.length/bodySize),fieldPages.length),display=Math.min(Math.max(0,view.display||0),textPages-1);
  const heading=c.mode==='career'?'陞遷中心｜'+view.role:view.title.includes(view.role)?view.title:view.title+'｜'+view.role;
  const embed=new EmbedBuilder().setColor(0x2463b2).setTitle(heading.slice(0,256)).setDescription((c.meta?'**'+escapeMarkdown(c.meta).slice(0,500)+'**\n\n':'')+(escaped.length<=bodySize?escaped:escaped.slice(display*bodySize,(display+1)*bodySize))).setFooter({text:view.date+' · '+(textPages>1?`內容 ${display+1}/${textPages} · `:'')+'網頁共用規則 · DC 獨立存檔'});
  let credit='';
  if(view.rank&&view.rank!=='—'&&!['考生','待分發'].includes(view.role)){
    const description=embed.data.description;
    withInsignia(embed,{badge:view.badge}).setImage(null);
    if(c.fields?.length){credit=embed.data.description.slice(description.length).trim();embed.setDescription(description);}
  }
  if(fieldPages[display]?.length)embed.addFields(fieldPages[display]);
  if(view.notice&&view.notice!=='已儲存')embed.addFields({name:'操作結果',value:escapeMarkdown(view.notice).slice(0,500)});
  if(credit)embed.addFields({name:'階級圖來源',value:credit,inline:false});
  if(view.links?.length&&c.mode==='question')embed.addFields({name:'題目來源',value:view.links.slice(0,2).map(l=>'['+escapeMarkdown(l.label).slice(0,70)+']('+l.url+')').join('\n').slice(0,900)});
  for(let i=0;i<primary.length;i+=4)components.push(row(...primary.slice(i,i+4).map(n=>{
    const control=view.controls[n],isAnswer=answerIndexes.includes(n),letter=control.label.match(/^[A-D](?:\.|．|\s)/)?.[0]?.trim().replace(/[.．]/,'');
    return button(prefix+(control.kind==='input'?'edit:':'act:')+n,isAnswer?(letter||String(answerIndexes.indexOf(n)+1)):control.path==='#'+c.nextId?'下一題':c.labels?.[control.path]||control.label,isAnswer||control.path==='#promotionBtn'?ButtonStyle.Primary:ButtonStyle.Secondary);
  })));
  if(pages>1)components.push(row(...(page?[button(prefix+'controls:'+(page-1),'上一頁職缺／操作')]:[]),...(page+1<pages?[button(prefix+'controls:'+(page+1),'下一頁職缺／操作')]:[])));
  if(textPages>1)components.push(row(...(display?[button(prefix+'text:'+(display-1),'上一頁內容')]:[]),...(display+1<textPages?[button(prefix+'text:'+(display+1),'下一頁內容')]:[])));
  return {content:'',embeds:[embed],components};
}
export function fullCard(view,user,{controlsPage=0,menu=false}={}){
  if(menu){
    const prefix=`web:${user}:${view.revision}:`,pages=view.pages.slice(0,16),components=[];
    for(let i=0;i<pages.length;i+=4)components.push(row(...pages.slice(i,i+4).map((p,j)=>button(prefix+'act:'+(view.controls.length+i+j),p.label))));
    components.push(row(button(prefix+'home','返回目前畫面')));
    return {content:'',embeds:[new EmbedBuilder().setColor(0x2463b2).setTitle('其他功能').setDescription('點選下方按鈕切換功能。')],components};
  }
  if(view.compact&&!view.selection&&!menu)return compactCard(view,user,controlsPage);
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
    if(view.controls.length>10)components.push(row(...(page>0?[button(prefix+(menu?'menucontrols:':'controls:')+(page-1),'上一頁操作')]:[]),...(page+1<Math.ceil(view.controls.length/10)?[button(prefix+(menu?'menucontrols:':'controls:')+(page+1),'下一頁操作')]:[])));
    if(text.length>3300)components.push(row(...(display>0?[button(prefix+'text:'+(display-1),'上一頁內容')]:[]),...(display+1<Math.ceil(text.length/3300)?[button(prefix+'text:'+(display+1),'下一頁內容')]:[])));
  }
  return {content:'',embeds:[embed.setImage(null)],components};
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
    else if(op==='controls'||op==='menu'||op==='menucontrols')request={display:0};
    else if(op!=='home')throw new GameError('無效操作。');
  }else if(commands[i.commandName]){
    const page=commands[i.commandName];
    // Before appointment, /任務 continues the entrance flow rather than exposing officer controls.
    request=p.webSummary?.sequence===99?{}:{page,...(i.commandName==='輪調'?{rotation:true}:{})};
  }
  const result=await game.fullAction(guild,user,request);
  if(result.view.selection)result.view.selection.action=index;
  await i.editReply({allowedMentions:{parse:[]},...preparePayload(fullCard(result.view,user,{controlsPage:['controls','menucontrols'].includes(op)?index:0,menu:['menu','menucontrols'].includes(op)}))});
  community?.schedule(guild,user);mirror?.schedule();return true;
}
