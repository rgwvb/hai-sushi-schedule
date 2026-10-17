import { Client, Events, GatewayIntentBits, REST } from 'discord.js';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Game } from './game.mjs';
import { handle } from './ui.mjs';
import { register } from './register.mjs';

export function cloudContext(ready,env){
  const application=ready.application.id;
  if(env.DISCORD_APPLICATION_ID&&env.DISCORD_APPLICATION_ID.trim()!==application)throw new Error('Application ID 與 Bot Token 不符。');
  const ids=[...ready.guilds.cache.keys()];
  const requested=env.DISCORD_GUILD_ID?.trim();
  if(requested&&!ids.includes(requested))throw new Error('機器人尚未加入 DISCORD_GUILD_ID 指定的伺服器。');
  if(!requested&&ids.length===0)throw new Error('請先將機器人邀請到你的伺服器，包含 bot 和 applications.commands，再重新部署。');
  if(!requested&&ids.length>1)throw new Error('機器人已加入多個伺服器，請在 Railway 設定 DISCORD_GUILD_ID 指定要玩的伺服器，再重新部署。');
  return {application,guild:requested||ids[0]};
}

export async function startCloud({env=process.env,client=new Client({intents:[GatewayIntentBits.Guilds],allowedMentions:{parse:[]}}),restFactory=token=>new REST({version:'10'}).setToken(token),gameFactory=path=>new Game(path),logger=console}={}){
  const token=env.DISCORD_TOKEN?.trim();
  if(!token)throw new Error('請在 Railway 的 Variables 新增 DISCORD_TOKEN，填入 Bot Token 後部署。');
  client.on(Events.Error,e=>logger.error('Discord connection error:',e.code||e.name));
  let game,scope,stopped=false;
  const stop=()=>{if(stopped)return;stopped=true;client.destroy();game?.close();};
  const initialized=new Promise((resolveReady,reject)=>{
    client.once(Events.ClientReady,async ready=>{
      try{
        scope=cloudContext(ready,env);
        game=gameFactory(env.DISCORD_DB_PATH||'./data/careers.sqlite');
        await register(restFactory(token),scope);
        client.on(Events.InteractionCreate,i=>{if(i.guildId===scope.guild)void handle(i,game);});
        logger.log('警察生涯機器人已上線，7 個指令已註冊。請在指定伺服器文字頻道輸入 /開始。');
        resolveReady({stop,scope});
      }catch(e){reject(e);}
    });
  });
  // Prevent an unhandled rejection if initialization fails while login resolves.
  const connected=Promise.all([client.login(token),initialized]);
  try{
    const [,ready]=await connected;
    return ready;
  }catch(e){stop();throw e;}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(!process.env.DISCORD_TOKEN?.trim()){
    // A deployed container can wait for its owner to add the secret in Railway.
    // Changing Variables triggers a fresh deployment; never call this bot online.
    console.log('等待設定：請在 Railway → Variables 新增 DISCORD_TOKEN，再按 Deploy。機器人目前尚未連線。');
    const waiting=setInterval(()=>{},60000);
    const stop=()=>{clearInterval(waiting);process.exit(0);};
    process.once('SIGINT',stop);process.once('SIGTERM',stop);
  }else{
    try{
      const app=await startCloud();
      process.once('SIGINT',()=>{app.stop();process.exit(0);});
      process.once('SIGTERM',()=>{app.stop();process.exit(0);});
    }catch(e){
      // Do not expose SDK/REST request bodies, headers or the token in logs.
      const publicMessages=['Application ID','機器人尚未加入','請先將機器人','機器人已加入多個','請在 Railway'];
      console.error(publicMessages.some(p=>e.message?.startsWith(p))?e.message:'Discord 啟動失敗：請確認 Bot Token、邀請權限及網路，修改 Variables 後重新部署。');
      process.exitCode=1;
    }
  }
}
