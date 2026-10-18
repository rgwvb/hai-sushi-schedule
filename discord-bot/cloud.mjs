import { Client, Events, GatewayIntentBits, REST } from 'discord.js';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { GameError } from './game.mjs';
import { createGame } from './firestore-game.mjs';
import { handle } from './ui.mjs';
import { register, commands } from './register.mjs';
import { Community } from './community.mjs';
import { createSheetsMirror } from './sheets.mjs';

export function safeStartupFailure(error){
  const phases={login:'Discord 登入',context:'應用與伺服器辨識',save:'持久存檔初始化',commands:'註冊指令'};
  const label=phases[error.cloudPhase]||'啟動';
  const value=String(error.code||error.name||'UNKNOWN');
  const code=/^[A-Za-z0-9_]{1,60}$/.test(value)?value:'UNKNOWN';
  return `${label}失敗（代碼 ${code}）`;
}

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

export async function startCloud({env=process.env,client=new Client({intents:[GatewayIntentBits.Guilds],allowedMentions:{parse:[]}}),restFactory=token=>new REST({version:'10'}).setToken(token),gameFactory=path=>createGame(path,env,{logger}),communityFactory=(c,g)=>new Community(c,g,{logger}),sheetsFactory=(g,id)=>createSheetsMirror(g,id,env,{logger}),logger=console}={}){
  const token=env.DISCORD_TOKEN?.trim();
  if(!token)throw new Error('請在 Railway 的 Variables 新增 DISCORD_TOKEN，填入 Bot Token 後部署。');
  client.on(Events.Error,e=>logger.error(safeStartupFailure(e)));
  let game,scope,community,mirror,stopped=false,phase='login';
  const stop=()=>{if(stopped)return;stopped=true;mirror?.stop();community?.stop();client.destroy();game?.close();};
  const initialized=new Promise((resolveReady,reject)=>{
    client.once(Events.ClientReady,async ready=>{
      try{
        phase='context';scope=cloudContext(ready,env);
        phase='save';
        game=await gameFactory(env.DISCORD_DB_PATH||'./data/careers.sqlite');
        phase='commands';
        await register(restFactory(token),scope);
        community=communityFactory(client,game);
        try{mirror=await sheetsFactory(game,scope.guild);mirror?.start();}catch{logger.error('GOOGLE_SHEETS_SETUP_PENDING');}
        client.on(Events.InteractionCreate,i=>{if(i.guildId===scope.guild)void handle(i,game,{community,mirror});});
        logger.log(`警察生涯機器人已上線，${commands.length} 個指令已註冊。`);
        resolveReady({stop,scope,community});
        // Channel permissions must never prevent the existing game from starting.
        void community.ensure(scope.guild).then(settings=>{
          logger.log(`COMMUNITY_CHANNELS_READY profiles=${settings.profiles} play=${settings.play} ranking=${settings.ranking} guide=${settings.guide}`);
          return community.syncAll(scope.guild);
        }).then(()=>logger.log('COMMUNITY_BOARDS_SYNCED')).catch(e=>{
          logger.error(e instanceof GameError?e.message:'COMMUNITY_SETUP_PENDING');
          community.log(e);
        });
      }catch(e){reject(e);}
    });
  });
  // Prevent an unhandled rejection if initialization fails while login resolves.
  const connected=Promise.all([client.login(token),initialized]);
  try{
    const [,ready]=await connected;
    return ready;
  }catch(e){e.cloudPhase=phase;stop();throw e;}
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
      console.error(publicMessages.some(p=>e.message?.startsWith(p))?e.message:safeStartupFailure(e)+'。請確認設定與權限後重新部署。');
      process.exitCode=1;
    }
  }
}
