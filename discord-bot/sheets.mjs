import {careerRole,currentRank,normalizeCareer} from './career.mjs';
import {rankedPlayers} from './community.mjs';
import {stamp} from './game.mjs';
export const sheetTitle='DC玩家總表';
export const sheetHeaders=['排名','角色姓名','個人官階','現任職務','職務配階','服務單位','遊戲年月','年資（年）','總績效','現職績效','完成勤務','最近考績','角色狀態','Discord 玩家 ID','伺服器 ID','同步時間'];
export const sheetDate=now=>new Date(now).getTime()/86400000+25569+8/24;
export function playerSheetRows(players,guild,now=new Date()){
  return rankedPlayers(players.map(r=>({...r,p:normalizeCareer(structuredClone(r.p))}))).map(({user,p,rank})=>{
    const role=careerRole(p);
    const v=p.webSummary;
    return [rank,p.name,currentRank(p),role.title,role.badge,p.unit,v?.date||stamp(p.month),Number((v?.years??p.month/12).toFixed(1)),Number(p.merit.toFixed(1)),Number((p.stageMerit||0).toFixed(1)),p.completed,(v?p.appraisals.slice(0,2):p.appraisals.slice(-2)).map(a=>a.year+' '+a.grade).join('、')||'尚未結算',v?(v.retired?'退休':p.webCareer.state.unit?'在職':'備考／受訓／待分發'):p.month>=516?'退休':'在職',String(user),String(guild),sheetDate(now)];
  });
}
const cell=value=>({userEnteredValue:typeof value==='number'?{numberValue:value}:{stringValue:String(value??'')}});
export function sheetUpdateRequests(properties,rows,now){
  const {sheetId,gridProperties}=properties,requests=[];
  const needed=5+rows.length,rowCount=Math.max(needed,gridProperties.rowCount),columnCount=Math.max(16,gridProperties.columnCount);
  if(needed>gridProperties.rowCount||columnCount>gridProperties.columnCount)requests.push({updateSheetProperties:{properties:{sheetId,gridProperties:{rowCount,columnCount}},fields:'gridProperties.rowCount,gridProperties.columnCount'}});
  // Only this dedicated mirror tab's A:P data area is replaced. Explicit strings cannot execute formulas.
  requests.push({updateCells:{range:{sheetId,startRowIndex:4,endRowIndex:needed,startColumnIndex:0,endColumnIndex:16},rows:[sheetHeaders,...rows].map(values=>({values:values.map(cell)})),fields:'userEnteredValue'}});
  if(rowCount>needed)requests.push({repeatCell:{range:{sheetId,startRowIndex:needed,endRowIndex:rowCount,startColumnIndex:0,endColumnIndex:16},cell:{},fields:'userEnteredValue'}});
  if(rows.length)requests.push({copyPaste:{source:{sheetId,startRowIndex:5,endRowIndex:6,startColumnIndex:0,endColumnIndex:16},destination:{sheetId,startRowIndex:5,endRowIndex:needed,startColumnIndex:0,endColumnIndex:16},pasteType:'PASTE_FORMAT'}});
  requests.push({updateCells:{start:{sheetId,rowIndex:1,columnIndex:0},rows:[{values:['同步狀態','自動更新中','','最後同步',sheetDate(now),sheetDate(now),'玩家數',rows.length].map(cell)}],fields:'userEnteredValue'}});
  return requests;
}
export class SheetsMirror {
  constructor({game,guild,spreadsheetId,request,logger=console,intervalMs=60000,debounceMs=5000,now=()=>new Date()}){
    Object.assign(this,{game,guild,spreadsheetId,request,logger,intervalMs,debounceMs,now});this.closed=false;this.active=null;this.timer=null;this.interval=null;this.dirty=false;
  }
  start(){if(this.interval)return;this.schedule(0);this.interval=setInterval(()=>this.schedule(0),this.intervalMs);this.interval.unref?.();}
  stop(){this.closed=true;clearTimeout(this.timer);clearInterval(this.interval);this.timer=null;this.interval=null;}
  schedule(delay=this.debounceMs){if(this.closed)return;this.dirty=true;if(this.active||this.timer)return;this.timer=setTimeout(()=>{this.timer=null;void this.flush();},delay);this.timer.unref?.();}
  async sync(){
    const base='https://sheets.googleapis.com/v4/spreadsheets/'+this.spreadsheetId;
    const meta=(await this.request({url:base,method:'GET',params:{fields:'sheets(properties)'},timeout:20000})).data;
    const properties=meta.sheets?.map(s=>s.properties).find(p=>p.title===sheetTitle);
    if(!properties)throw Object.assign(new Error('Dedicated mirror tab missing'),{code:'MIRROR_TAB_MISSING'});
    const players=await this.game.players(this.guild),now=this.now(),rows=playerSheetRows(players,this.guild,now);
    if(this.closed)return;
    await this.request({url:base+':batchUpdate',method:'POST',data:{requests:sheetUpdateRequests(properties,rows,now)},timeout:20000});
    this.logger.log('GOOGLE_SHEETS_SYNC_READY rows='+rows.length);
  }
  async flush(){
    if(this.closed)return;
    if(this.active){this.dirty=true;return this.active;}
    this.dirty=false;
    this.active=this.sync().catch(e=>{const code=String(e.code||e.response?.status||e.name||'UNKNOWN').replace(/[^A-Za-z0-9_]/g,'').slice(0,40);this.logger.error('GOOGLE_SHEETS_SYNC_FAILED '+code);}).finally(()=>{this.active=null;if(this.dirty&&!this.closed)this.schedule();});
    return this.active;
  }
}
export async function createSheetsMirror(game,guild,env=process.env,{logger=console}={}){
  const spreadsheetId=env.GOOGLE_SHEETS_ID?.trim();if(!spreadsheetId)return null;
  if(!/^[A-Za-z0-9_-]{10,}$/.test(spreadsheetId))throw Error('Invalid Google Sheets ID');
  if(!env.FIREBASE_SERVICE_ACCOUNT_JSON)throw Error('Service account credentials required for Sheets');
  const {GoogleAuth}=await import('google-auth-library');
  const auth=new GoogleAuth({credentials:JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON),scopes:['https://www.googleapis.com/auth/spreadsheets']});
  const client=await auth.getClient();
  return new SheetsMirror({game,guild,spreadsheetId,request:options=>client.request(options),logger});
}
