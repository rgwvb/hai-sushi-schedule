import { Client, Events, GatewayIntentBits } from 'discord.js';
import { Game } from './game.mjs';
import { handle } from './ui.mjs';
import { config } from './config.mjs';
let client,game;
try{
  const c=config();game=new Game(c.path);
  client=new Client({intents:[GatewayIntentBits.Guilds],allowedMentions:{parse:[]}});
  client.once(Events.ClientReady,ready=>{
    if(ready.application.id!==c.application){console.error('Application ID 與 Bot Token 不符。');stop(1);return;}
    console.log('警察生涯機器人已上線。請到伺服器文字頻道輸入 /開始。關閉此視窗就會離線。');
  });
  client.on(Events.InteractionCreate,i=>{
    if(i.guildId!==c.guild)return;
    void handle(i,game);
  });
  client.on(Events.Error,e=>console.error('Discord connection error:',e.code||e.name));
  await client.login(c.token);
}catch(e){console.error(e.message?.startsWith('請先')?e.message:'啟動失敗：請確認 .env、網路與資料庫目錄權限。');client?.destroy();game?.close();process.exitCode=1;}
function stop(code=0){client?.destroy();game?.close();process.exit(code);}
process.once('SIGINT',()=>stop());process.once('SIGTERM',()=>stop());
