import { REST, Routes, SlashCommandBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { config } from './config.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
export const commands=[['開始','建立或繼續你的警察生涯'],['任務','接取符合目前職務的案件'],['角色','查看階級、績效、年資與考績'],['履歷','回顧最近生涯紀錄'],['訓練','完成下一職務需要的模擬研習'],['升遷','查看升遷條件與申請'],['說明','查看玩法與指令']].map(([name,description])=>new SlashCommandBuilder().setName(name).setDescription(description).toJSON());
commands.push(new SlashCommandBuilder().setName('排名').setDescription('查看本伺服器的警察生涯排行榜').toJSON());
commands.push(new SlashCommandBuilder().setName('遊戲頻道').setDescription('管理員設定角色、遊戲及排行榜頻道；未指定時自動建立')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption(o=>o.setName('角色').setDescription('角色資料頻道').addChannelTypes(ChannelType.GuildText))
  .addChannelOption(o=>o.setName('遊戲').setDescription('公開遊玩頻道').addChannelTypes(ChannelType.GuildText))
  .addChannelOption(o=>o.setName('排名').setDescription('排行榜頻道').addChannelTypes(ChannelType.GuildText)).toJSON());
export async function register(rest,c){
  const app=await rest.get('/oauth2/applications/@me');
  if(app.id!==c.application)throw new Error('Bot Token 與 Application ID 不屬於同一個應用程式。');
  // Upsert only our named commands; do not bulk-delete existing app commands.
  for(const command of commands)await rest.post(Routes.applicationGuildCommands(c.application,c.guild),{body:command});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{const c=config();await register(new REST({version:'10'}).setToken(c.token),c);console.log(`已註冊 ${commands.length} 個指令。請在遊戲頻道輸入 /開始。`);}
  catch(e){console.error(e.message?.startsWith('請先')||e.message?.startsWith('Bot Token')?e.message:'指令註冊失敗：請確認 Token、應用程式 ID、伺服器 ID，以及機器人已加入該伺服器。');process.exitCode=1;}
}
