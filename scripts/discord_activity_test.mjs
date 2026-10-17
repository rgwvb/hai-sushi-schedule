import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM, VirtualConsole} from 'jsdom';
import {discordActivityContext, startDiscordActivity} from './discord_activity.mjs';

const appId='123456789012345678';
const url=`https://${appId}.discordsays.com/.proxy/?frame_id=test-frame&instance_id=test-instance&platform=desktop`;
const html=fs.readFileSync('index.html','utf8');
const bare=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const main=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>/\bid="standalone(?:BackendConfig|Backend|App|Systems)"/.test(m[1])).map(m=>m[2]).join('\n;\n');
const sdkSource=fs.readFileSync('scripts/vendor/discord-sdk.mjs','utf8');
const sdkForTest=sdkSource.replace(/export\s*\{\s*(\w+)\s+as\s+DiscordSDK\s*\}\s*;?/,'window.__RealDiscordSDK=$1;');
assert.notEqual(sdkSource,sdkForTest,'the real vendored SDK export must be available to the test');
const settle=async()=>{for(let i=0;i<25;i++)await Promise.resolve();};
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...args)=>errors.push(args.join(' ')));
const make=(address=url)=>new JSDOM(bare,{url:address,referrer:'https://discord.com/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
assert.deepEqual(discordActivityContext(url,true),{clientId:appId});
assert.equal(discordActivityContext(url,false),null);
assert.equal(discordActivityContext(url.replace('platform=desktop','platform=invalid'),true),null);
assert.equal(discordActivityContext(url.replace('instance_id=test-instance&',''),true),null);
assert.equal(discordActivityContext(url.replace('.discordsays.com','.discordsays.com.evil.test'),true),null);
assert.deepEqual(discordActivityContext(url.replace('platform=desktop','platform=mobile'),true),{clientId:appId});
assert.deepEqual(discordActivityContext(`https://example.test/?frame_id=f&instance_id=i&platform=desktop&discord_client_id=${appId}`,true),{clientId:appId});

const ordinary=make('https://rgwvb.github.io/hai-sushi-schedule/');
try{
  let imports=0;
  assert.equal(await startDiscordActivity({win:ordinary.window,loadSdk:()=>{imports++;throw new Error('must remain lazy');}}),null);
  assert.equal(imports,0);assert(!ordinary.window.document.getElementById('discordActivityStatus'));
  assert(!ordinary.window.policeDiscord,'normal web play should not gain Discord-only behavior');
}finally{ordinary.window.close();}

const dom=make(),w=dom.window,d=w.document,messages=[];
const reply=payload=>queueMicrotask(()=>w.dispatchEvent(new w.MessageEvent('message',{origin:'https://discord.com',data:[1,payload]})));
const parent={postMessage(tuple,origin){
  messages.push({tuple,origin});
  if(tuple[0]===0)reply({cmd:'DISPATCH',evt:'READY',nonce:null,data:{v:1,config:{api_endpoint:'//discord.com/api',environment:'production'}}});
  else if(tuple[0]===1&&tuple[1].cmd==='OPEN_EXTERNAL_LINK')reply({cmd:'OPEN_EXTERNAL_LINK',evt:null,nonce:tuple[1].nonce,data:{opened:true}});
}};
Object.defineProperty(w,'parent',{value:parent});
w.confirm=()=>{throw new Error('Discord reset must not use a browser confirmation modal');};
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
const requests=[];
w.fetch=async address=>{requests.push(address);return {ok:true,json:async()=>({meta:{divisionCount:0,stationCount:0},counties:{}})};};
try{
  w.eval(main);await settle();w.eval(sdkForTest);
  const state=await startDiscordActivity({win:w,loadSdk:async()=>({DiscordSDK:w.__RealDiscordSDK}),timeoutMs:1000});
  assert.equal(state.status,'ready','the real official SDK should complete a simulated Discord handshake');
  assert.equal(messages[0].tuple[0],0);assert.equal(messages[0].tuple[1].client_id,appId);
  assert.equal(messages[0].tuple[1].frame_id,'test-frame');
  assert.equal(d.getElementById('discordActivityStatus').textContent,'DC 活動｜已連線');
  assert(requests.includes('police-directory.json'),'the police directory must use a proxy-compatible relative URL');
  assert.equal(new URL('police-directory.json',w.location.href).pathname,'/.proxy/police-directory.json');
  assert.equal(await startDiscordActivity({win:w}),state,'starting twice should reuse the connection');
  assert.equal(d.querySelectorAll('#discordActivityStatus').length,1);
  const link=d.createElement('a');link.href='https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=D0080001';link.textContent='法規';d.body.append(link);
  const click=new w.MouseEvent('click',{bubbles:true,cancelable:true});link.dispatchEvent(click);await settle();
  assert(click.defaultPrevented);
  const rpc=messages.find(m=>m.tuple[1]?.cmd==='OPEN_EXTERNAL_LINK');
  assert.equal(rpc.tuple[1].args.url,link.href,'source links must be opened using Discord RPC');
  const internal=d.createElement('a');internal.href='#dashboard';d.body.append(internal);
  const internalClick=new w.MouseEvent('click',{bubbles:true,cancelable:true});internal.dispatchEvent(internalClick);
  assert(!internalClick.defaultPrevented,'same-origin game links should remain normal links');
  const clockBefore=w.localStorage.getItem('twPoliceCareerClockMax');
  d.getElementById('saveBtn').click();const save=w.localStorage.getItem('twPoliceCareerSaveV1');
  assert(save);d.getElementById('resetBtn').click();assert(d.getElementById('discordResetDialog').open);
  assert.equal(w.localStorage.getItem('twPoliceCareerSaveV1'),save,'opening reset confirmation must preserve the save');
  d.getElementById('discordResetCancel').click();assert(!d.getElementById('discordResetDialog').open);
  assert.equal(w.localStorage.getItem('twPoliceCareerSaveV1'),save);
  assert.equal(w.localStorage.getItem('twPoliceCareerClockMax'),clockBefore);
  d.getElementById('resetBtn').click();d.getElementById('discordResetConfirm').click();
  assert(!d.getElementById('discordResetDialog').open);assert.equal(w.localStorage.getItem('twPoliceCareerSaveV1'),null);
  assert(!messages.some(m=>['AUTHORIZE','AUTHENTICATE'].includes(m.tuple[1]?.cmd)),'guest play must not silently request account scopes');
}finally{w.close();}

for(const fail of ['timeout','import']){
  const failed=make();Object.defineProperty(failed.window,'parent',{value:{}});
  try{
    const state=await startDiscordActivity({win:failed.window,timeoutMs:10,loadSdk:async()=>{
      if(fail==='import')throw new Error('network failure');
      return {DiscordSDK:class{ready(){return new Promise(()=>{});}}};
    }});
    assert.equal(state.status,'error');
    assert(failed.window.document.getElementById('discordActivityStatus').textContent.includes('重新開啟活動'));
    assert(failed.window.document.getElementById('continueBtn'),'SDK failure must leave game controls intact');
  }finally{failed.window.close();}
}
assert.equal(errors.length,0,errors.join('\n'));
console.log('DISCORD_ACTIVITY_OK real-SDK simulated handshake and external-link RPC, lazy web fallback, proxy paths, safe reset, duplicate boot, import failure and timeout; actual Discord app acceptance remains pending');
