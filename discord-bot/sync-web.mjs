import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
export function webBundle(){
  const html=readFileSync(new URL('index.html',root),'utf8');
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>/\bid="standalone(?:App|Systems)"/.test(m[1])).map(m=>m[2]);
  if(scripts.length!==2)throw Error('Web engine scripts changed; review adapter');
  const systemsHook=readFileSync(new URL('web-system-bridge.js',import.meta.url),'utf8');
  const marker='  // Wrap the base render so all advanced systems remain synchronized.';
  if(!scripts[1].includes(marker))throw Error('Web engine bridge marker changed');
  scripts[1]=scripts[1].replace(marker,systemsHook+'\n'+marker);
  scripts[0]+='\nwindow.dcCore={state:()=>JSON.parse(JSON.stringify(s)),next,go,stats:()=>({date:rocDateTime(),years:serviceYearsExact(),age:s.age}),replace:x=>{s=Object.assign(NEW(),x);normalizeState();migrateClock();render();}};';
  const workforce=readFileSync(new URL('scripts/workforce_scenarios.js',root),'utf8').replace('  window.policeWorkforceScenarios=','  window.dcWorkforce={snapshot:()=>({run,cursor,poolKey}),restore:x=>{if(!x)return;run=x.run;cursor=x.cursor;poolKey=x.poolKey;if(run){const saved=JSON.parse(JSON.stringify(run));showCase();run=saved;updateInputs();if(run.report)renderAnalysis(run.report);}}};\n  window.policeWorkforceScenarios=');
  const archiveHook=readFileSync(new URL('web-archive-bridge.js',import.meta.url),'utf8');
  const archive=readFileSync(new URL('scripts/exam_archive.js',root),'utf8').replace("  $('examArchiveOpenBtn').onclick = openArchive;",archiveHook+"\n  $('examArchiveOpenBtn').onclick = openArchive;");
  return {version:1,hash:createHash('sha256').update(html+workforce+archive+systemsHook).digest('hex'),html:html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),source:scripts.join('\n;\n')+'\n;'+archive+'\n;'+workforce};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const serialized=JSON.stringify(webBundle());if(process.argv.includes('--check')){if(readFileSync(new URL('web-engine.json',import.meta.url),'utf8')!==serialized)throw Error('Run node discord-bot/sync-web.mjs to sync the web and Discord game');console.log('WEB_ENGINE_MATCH');}else{writeFileSync(new URL('web-engine.json',import.meta.url),serialized);console.log('WEB_ENGINE_EXPORTED');}}
