import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomInt, randomUUID } from 'node:crypto';
export const cases=JSON.parse(readFileSync(new URL('cases.json',import.meta.url),'utf8')).decks;
// Explicitly simplified game progression, not statutory appointment eligibility.
export const stages=[
  {title:'警員',rank:'警佐三階',deck:'patrol',years:2,merit:4},
  {title:'巡佐兼副所長',rank:'警佐二階',deck:'station_lead',years:3,merit:6},
  {title:'巡官兼所長',rank:'警佐一階',deck:'station_lead',years:4,merit:8,training:'警佐升警正模擬研習'},
  {title:'警務員兼所長',rank:'警正四階',deck:'station_lead',years:4,merit:8},
  {title:'警務正',rank:'警正二階',deck:'staff',years:5,merit:10},
  {title:'分局長',rank:'警正一階',deck:'precinct',years:5,merit:10},
  {title:'副局長',rank:'警監三階',deck:'bureau',years:6,merit:12,training:'警正升警監模擬研習'},
  {title:'局長',rank:'警監二階',deck:'bureau',years:6,merit:12},
  {title:'署長',rank:'警監特階',deck:'npa'}
];
export class GameError extends Error {}
const requireGame=(p)=>{if(!p)throw new GameError('請先輸入 /開始 建立角色。');};
export const stamp=m=>`${2010+Math.floor(m/12)} 年 ${m%12+1} 月`;
export class Game {
  constructor(path) {
    if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
    this.db=new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS players (guild TEXT NOT NULL, user TEXT NOT NULL, state TEXT NOT NULL, PRIMARY KEY(guild,user));');
    this.db.exec('CREATE TABLE IF NOT EXISTS community_settings (guild TEXT PRIMARY KEY, state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS community_messages (guild TEXT NOT NULL, channel TEXT NOT NULL, slot TEXT NOT NULL, message TEXT NOT NULL, PRIMARY KEY(guild,channel,slot));');
  }
  close(){this.db.close();}
  get(guild,user){const row=this.db.prepare('SELECT state FROM players WHERE guild=? AND user=?').get(guild,user);return row?JSON.parse(row.state):null;}
  players(guild){return this.db.prepare('SELECT user,state FROM players WHERE guild=? ORDER BY user').all(guild).map(r=>({user:r.user,p:JSON.parse(r.state)}));}
  settings(guild){const r=this.db.prepare('SELECT state FROM community_settings WHERE guild=?').get(guild);return r?JSON.parse(r.state):{};}
  setSettings(guild,state){this.db.prepare('INSERT INTO community_settings(guild,state) VALUES (?,?) ON CONFLICT(guild) DO UPDATE SET state=excluded.state').run(guild,JSON.stringify(state));}
  message(guild,channel,slot){return this.db.prepare('SELECT message FROM community_messages WHERE guild=? AND channel=? AND slot=?').get(guild,channel,slot)?.message;}
  setMessage(guild,channel,slot,message){this.db.prepare('INSERT INTO community_messages(guild,channel,slot,message) VALUES (?,?,?,?) ON CONFLICT(guild,channel,slot) DO UPDATE SET message=excluded.message').run(guild,channel,slot,message);}
  transaction(guild,user,fn){
    this.db.exec('BEGIN IMMEDIATE');
    try{
      const p=this.get(guild,user),result=fn(p);
      if(p)this.db.prepare('UPDATE players SET state=? WHERE guild=? AND user=?').run(JSON.stringify(p),guild,user);
      this.db.exec('COMMIT');return result;
    }catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  create(guild,user,name,unit){
    name=String(name||'').trim();unit=String(unit||'').trim();
    if(!name||name.length>20||!unit||unit.length>80)throw new GameError('姓名需為 1～20 字，單位需為 1～80 字。');
    const p={name,unit,stage:0,month:0,appointed:0,merit:0,stageMerit:0,completed:0,yearScores:[],appraisals:[],trained:[],trainingProgress:0,seen:{},pending:null,history:[{date:stamp(0),text:'警佐三階警員｜'+unit}]};
    const r=this.db.prepare('INSERT OR IGNORE INTO players(guild,user,state) VALUES (?,?,?)').run(guild,user,JSON.stringify(p));
    if(!r.changes)throw new GameError('你已經有角色；輸入 /角色 繼續原本的生涯。');
    return p;
  }
  mission(guild,user,kind='duty'){
    return this.transaction(guild,user,p=>{
      requireGame(p);
      if(p.pending)return {p,mission:p.pending};
      if(p.month>=43*12)throw new GameError('角色已達本版模擬退休年齡 65 歲，可用 /履歷 回顧生涯。');
      if(!['duty','training'].includes(kind))throw new GameError('無效任務類型。');
      const next=stages[p.stage+1];
      if(kind==='training'&&(!next?.training||p.trained.includes(next.training)))throw new GameError('目前沒有待完成的升官等模擬研習；輸入 /升遷 查看條件。');
      const deck=kind==='training'?'staff':stages[p.stage].deck;
      const rows=cases[deck],key=kind+':'+deck;
      let left=p.seen[key]||[];
      if(!left.length){left=rows.map(x=>x.id).filter(id=>rows.length===1||id!==p.lastCase);}
      const id=left.splice(randomInt(left.length),1)[0];p.seen[key]=left;p.lastCase=id;
      const row=rows.find(x=>x.id===id),choices=row.choices.map((text,i)=>({text,quality:[100,60,20][i]}));
      for(let i=choices.length-1;i>0;i--){const j=randomInt(i+1);[choices[i],choices[j]]=[choices[j],choices[i]];}
      p.pending={id:randomUUID(),kind,title:row.title,story:row.story,analysis:row.analysis,choices,training:kind==='training'?next.training:null};
      return {p,mission:p.pending};
    });
  }
  answer(guild,user,owner,id,index){
    if(user!==owner)throw new GameError('這是另一位玩家的案件，請輸入 /任務 開啟自己的案件。');
    return this.transaction(guild,user,p=>{
      requireGame(p);const m=p.pending;
      if(!m||m.id!==id)throw new GameError('這題已結算或已過期，輸入 /任務 繼續。');
      if(!Number.isInteger(index)||index<0||index>=m.choices.length)throw new GameError('無效選項。');
      const choice=m.choices[index],before=p.merit;let award=0,annual=null;
      p.pending=null;
      if(m.kind==='training'){
        p.trainingProgress=choice.quality===100?p.trainingProgress+1:0;
        if(p.trainingProgress>=3){p.trained.push(m.training);p.trainingProgress=0;p.history.push({date:stamp(p.month),text:'完成 '+m.training});}
      }else{
        award=choice.quality===100?.2:choice.quality===60?.1:0;
        p.merit=Math.round((p.merit+award)*10)/10;p.completed++;p.month++;
        p.yearScores.push(choice.quality);
        if(p.month%12===0){
          const score=Math.round(p.yearScores.reduce((a,b)=>a+b,0)/p.yearScores.length);
          annual={year:2010+Math.floor((p.month-1)/12),grade:score>=85?'A':score>=70?'B':'C',score};
          p.appraisals.push(annual);p.yearScores=[];
        }
        p.history.push({date:stamp(p.month-1),text:m.title+'｜'+(choice.quality===100?'妥適處理':choice.quality===60?'仍可改善':'需檢討')+'｜績效 +'+award.toFixed(1)});
      }
      return {p,mission:m,choice,before,award,annual,after:p.merit};
    });
  }
  requirements(p){
    requireGame(p);const current=stages[p.stage],next=stages[p.stage+1];
    if(!next)return {ready:false,lines:['已達本版最高職務。']};
    const years=(p.month-p.appointed)/12,merit=Math.round((p.merit-p.stageMerit)*10)/10;
    const good=p.appraisals.slice(-2).length===2&&p.appraisals.slice(-2).every(a=>a.grade!=='C');
    const checks=[{ok:years>=current.years,text:`現職年資 ${years.toFixed(1)}／${current.years} 年`},
      {ok:merit>=current.merit,text:`現職勤務績效 ${merit.toFixed(1)}／${current.merit}`},
      {ok:good,text:'最近兩年考績皆為 B 以上'}];
    if(next.training)checks.push({ok:p.trained.includes(next.training),text:next.training});
    if(p.pending)checks.push({ok:false,text:'請先完成目前案件或研習題目'});
    return {ready:checks.every(c=>c.ok),lines:checks.map(c=>(c.ok?'✅ ':'⬜ ')+c.text),next};
  }
  promote(guild,user,expectedStage){return this.transaction(guild,user,p=>{
    requireGame(p);
    if(p.stage!==expectedStage)throw new GameError('這張升遷卡已過期，請重新輸入 /升遷。');
    if(p.month>=43*12)throw new GameError('角色已退休。');
    if(!this.requirements(p).ready)throw new GameError('升遷條件尚未完成，請輸入 /升遷 查看。');
    p.stage++;p.appointed=p.month;p.stageMerit=p.merit;p.trainingProgress=0;
    const r=stages[p.stage];p.history.push({date:stamp(p.month),text:r.rank+r.title+'｜'+p.unit});return p;
  });}
}
