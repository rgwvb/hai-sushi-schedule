import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudStore,CloudConflict,installFirebaseCareer} from './firebase_web.mjs';
import {JSDOM} from 'jsdom';
function fake(){const map=new Map(),auth={currentUser:{uid:'a'}};return {map,auth,db:{},doc:(_,collection,id)=>collection+'/'+id,getDoc:async ref=>({exists:()=>map.has(ref),data:()=>structuredClone(map.get(ref))}),serverTimestamp:()=>123,runTransaction:async(_,fn)=>fn({get:async ref=>({exists:()=>map.has(ref),data:()=>structuredClone(map.get(ref))}),set:(ref,data)=>map.set(ref,structuredClone(data))})};}
test('cloud saves use owner IDs, revisions and reject replacing another browser version',async()=>{
 const sdk=fake(),a=createCloudStore(sdk),b=createCloudStore(sdk);
 assert.equal(await a.inspect(),false);await a.save({name:'角色',merit:1},{initial:true});
 await assert.rejects(()=>b.save({merit:99},{initial:true}),CloudConflict);
 assert.equal((await b.load()).merit,1);await b.save({merit:2});
 await assert.rejects(()=>a.save({merit:3}),CloudConflict);
 sdk.auth.currentUser={uid:'b'};a.reset();assert.equal(await a.inspect(),false);await a.save({name:'其他角色'},{initial:true});
 assert.equal(sdk.map.size,2);assert.equal(JSON.parse(sdk.map.get('web_saves/a').state).merit,2);
});
test('missing Firebase setup preserves local save and does not load SDK or claim cloud success',async()=>{
 const dom=new JSDOM('<div class="header-actions"></div>',{url:'https://example.test'});const w=dom.window;
 w.localStorage.setItem('twPoliceCareerSaveV1','{"name":"保留角色"}');await installFirebaseCareer(w);
 assert.equal(w.FirebaseCareer.status,'unconfigured');assert(w.document.getElementById('firebaseSaveStatus').textContent.includes('本機進度已保留'));
 assert.equal(w.localStorage.getItem('twPoliceCareerSaveV1'),'{"name":"保留角色"}');assert(w.document.getElementById('firebaseSignIn').disabled);dom.window.close();
});

test('account switching during a cloud load does not apply the old account state',async()=>{
 const sdk=fake(),store=createCloudStore(sdk);await store.save({name:'帳號A'},{initial:true});
 const get=sdk.getDoc;sdk.getDoc=async ref=>{const result=await get(ref);sdk.auth.currentUser={uid:'b'};return result;};
 const switched=createCloudStore(sdk);await assert.rejects(()=>switched.load(),/帳號已切換/);
});
