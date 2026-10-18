import {readFile,writeFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,deleteDoc,serverTimestamp,Timestamp,setLogLevel} from 'firebase/firestore';
setLogLevel('silent');
const env=await initializeTestEnvironment({projectId:'demo-police-career',firestore:{host:'127.0.0.1',port:8085,rules:await readFile('firestore.rules','utf8')}});
const a=env.authenticatedContext('alice').firestore(),b=env.authenticatedContext('bob').firestore(),guest=env.unauthenticatedContext().firestore();
const ref=db=>doc(db,'web_saves/alice');
const save=(patch={})=>({userId:'alice',state:'{"year":2010}',revision:1,version:1,updatedAt:serverTimestamp(),...patch});
const report=[];
async function check(name,fn){await fn();report.push(name+': PASS');}
try{
 await check('owner create/read',async()=>{await assertSucceeds(setDoc(ref(a),save()));await assertSucceeds(getDoc(ref(a)));});
 await check('public/private collection queries denied',async()=>{await assertFails(getDocs(collection(guest,'web_saves')));await assertFails(getDocs(collection(a,'web_saves')));});
 for(const [name,db] of [['unauthenticated',guest],['cross-user',b]])await check(name+' get/create/update/delete denied',async()=>{await assertFails(getDoc(ref(db)));await assertFails(setDoc(ref(db),save({revision:2})));await assertFails(setDoc(doc(db,'web_saves/charlie'),save({userId:'charlie'})));await assertFails(deleteDoc(ref(db)));});
 await check('valid owner update increments revision',()=>assertSucceeds(setDoc(ref(a),save({revision:2}))));
 for(const [name,patch] of Object.entries({ownership:{userId:'bob'},extraRole:{isAdmin:true},schemaPollution:{extraData:'x'},wrongStateType:{state:3},hugeState:{state:'x'.repeat(850000)},emptyState:{state:''},wrongTimestamp:{updatedAt:'tomorrow'},forgedTimestamp:{updatedAt:Timestamp.fromMillis(0)},negativeRevision:{revision:-1},overflowRevision:{revision:2147483648},replay:{revision:2},skippedRevision:{revision:4},wrongVersion:{version:2}})){
  await check(name+' rejected on update',()=>assertFails(setDoc(ref(a),save({revision:3,...patch}))));
  await check(name+' rejected on create',()=>assertFails(setDoc(doc(b,'web_saves/bob'),save({userId:'bob',...patch,...(name==='ownership'?{userId:'alice'}:{})}))));
 }
 for(const field of ['userId','state','revision','version','updatedAt'])await check('required '+field+' cannot be removed',async()=>{const d=save({revision:3});delete d[field];await assertFails(setDoc(ref(a),d));const fresh=save({userId:'bob'});delete fresh[field];await assertFails(setDoc(doc(b,'web_saves/bob'),fresh));});
 await check('create ownership spoof denied',()=>assertFails(setDoc(doc(b,'web_saves/bob'),save())));
 for(const path of ['discord_saves/g~u','discord_settings/g','discord_messages/g~c~s','game_data/duty_cases','web_saves/alice/nested/secret'])await check('protected path '+path,async()=>{await assertFails(getDoc(doc(a,path)));await assertFails(setDoc(doc(a,path),{isAdmin:true}));});
 await check('owner delete allowed',()=>assertSucceeds(deleteDoc(ref(a))));
 console.log(report.join('\n'));console.log('RULES_TESTS_PASSED '+report.length);
 if(process.env.FIRESTORE_AUDIT_OUTPUT)await writeFile(process.env.FIRESTORE_AUDIT_OUTPUT,report.join('\n'));
}finally{await env.cleanup();}
