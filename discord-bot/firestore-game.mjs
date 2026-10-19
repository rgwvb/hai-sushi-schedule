import {backup} from 'node:sqlite';
import {existsSync} from 'node:fs';
import {Game,GameError,cases} from './game.mjs';
import {normalizeCareer,stages} from './career.mjs';
const key=(...parts)=>parts.map(x=>encodeURIComponent(String(x))).join('~');
export class FirestoreGame {
  remote=true;
  constructor(db){this.db=db;this.rules=new Game(':memory:');}
  close(){this.rules.close();}
  requirements(p){return this.rules.requirements(p);}
  playerRef(guild,user){return this.db.collection('discord_saves').doc(key(guild,user));}
  async get(guild,user){const d=await this.playerRef(guild,user).get();return d.exists?normalizeCareer(JSON.parse(d.data().state)):null;}
  async players(guild){const q=await this.db.collection('discord_saves').where('guild','==',guild).get();return q.docs.map(d=>({user:d.data().user,p:normalizeCareer(JSON.parse(d.data().state))}));}
  async settings(guild){const d=await this.db.collection('discord_settings').doc(key(guild)).get();return d.exists?JSON.parse(d.data().state):{};}
  async setSettings(guild,state){await this.db.collection('discord_settings').doc(key(guild)).set({guild,state:JSON.stringify(state)});}
  async message(guild,channel,slot){const d=await this.db.collection('discord_messages').doc(key(guild,channel,slot)).get();return d.exists?d.data().message:undefined;}
  async setMessage(guild,channel,slot,message){await this.db.collection('discord_messages').doc(key(guild,channel,slot)).set({guild,channel,slot,message});}
  async mutate(guild,user,method,args){
    const ref=this.playerRef(guild,user);
    return this.db.runTransaction(async tx=>{
      const saved=await tx.get(ref),game=new Game(':memory:');
      try{
        if(saved.exists)game.db.prepare('INSERT INTO players VALUES (?,?,?)').run(guild,user,saved.data().state);
        const result=await game[method](guild,user,...args),p=game.get(guild,user);
        if(!p)throw new GameError('角色存檔未建立。');
        const state=JSON.stringify(p);
        if(Buffer.byteLength(state)>850000)throw new GameError('存檔容量接近上限，請先聯絡管理員備份。');
        tx.set(ref,{guild,user,state,version:1,updatedAt:new Date().toISOString()});
        return result;
      }finally{game.close();}
    });
  }
  create(g,u,...a){return this.mutate(g,u,'create',a);}
  mission(g,u,...a){return this.mutate(g,u,'mission',a);}
  answer(g,u,...a){return this.mutate(g,u,'answer',a);}
  offers(g,u,...a){return this.mutate(g,u,'offers',a);}
  appoint(g,u,...a){return this.mutate(g,u,'appoint',a);}
  promote(g,u,...a){return this.mutate(g,u,'promote',a);}
  fullAction(g,u,...a){return this.mutate(g,u,'fullAction',a);}
}
export async function migrateSqlite(source,target){
  const counts={players:0,settings:0,messages:0,skipped:0};
  async function copy(ref,data,type){const added=await target.db.runTransaction(async tx=>{const existing=await tx.get(ref);if(existing.exists)return false;tx.set(ref,data);return true;});if(added)counts[type]++;else counts.skipped++;}
  for(const row of source.db.prepare('SELECT guild,user,state FROM players').all()){
    await copy(target.playerRef(row.guild,row.user),{...row,version:1,migratedAt:new Date().toISOString()},'players');
  }
  for(const row of source.db.prepare('SELECT guild,state FROM community_settings').all())await copy(target.db.collection('discord_settings').doc(key(row.guild)),row,'settings');
  for(const row of source.db.prepare('SELECT guild,channel,slot,message FROM community_messages').all())await copy(target.db.collection('discord_messages').doc(key(row.guild,row.channel,row.slot)),row,'messages');
  return counts;
}
export async function createGame(path,env=process.env,{logger=console}={}){
  if(!env.FIREBASE_PROJECT_ID)return new Game(path);
  if(!env.FIREBASE_SERVICE_ACCOUNT_JSON&&!env.GOOGLE_APPLICATION_CREDENTIALS&&!env.FIRESTORE_EMULATOR_HOST)throw new Error('Firebase credentials are required before enabling cloud storage');
  const [{initializeApp,cert,applicationDefault,getApps},{getFirestore}]=await Promise.all([import('firebase-admin/app'),import('firebase-admin/firestore')]);
  const credential=env.FIREBASE_SERVICE_ACCOUNT_JSON?cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)):applicationDefault();
  const app=getApps().find(a=>a.name==='police-career')||initializeApp({projectId:env.FIREBASE_PROJECT_ID,credential},'police-career');
  const target=new FirestoreGame(getFirestore(app));
  // Migration is additive and idempotent: Firebase wins on conflicts; SQLite is retained.
  const old=new Game(path);
  try{
    if(path!==':memory:'&&!existsSync(path+'.pre-firebase.sqlite')){
      await backup(old.db,path+'.pre-firebase.sqlite');
      logger.log('FIREBASE_SQLITE_BACKUP_READY');
    }
    const counts=await migrateSqlite(old,target);logger.log('FIREBASE_MIGRATION '+JSON.stringify(counts));}finally{old.close();}
  const docs=[['duty_cases',{state:JSON.stringify(cases),version:1}],['positions',{state:JSON.stringify(stages),version:1}]];
  for(const [id,data] of docs)await target.db.runTransaction(async tx=>{const ref=target.db.collection('game_data').doc(id),s=await tx.get(ref);if(!s.exists)tx.set(ref,data);});
  const remote=await target.db.collection('game_data').doc('duty_cases').get();
  const decks=JSON.parse(remote.data().state);
  for(const [name,rows] of Object.entries(cases))if(!Array.isArray(decks[name])||!decks[name].length||decks[name].some(c=>!c.id||!c.title||!c.story||!Array.isArray(c.choices)||c.choices.length!==3||!c.analysis))throw new Error('Invalid Firebase duty catalog');
  Object.assign(cases,decks);logger.log('FIREBASE_STORAGE_READY');return target;
}
