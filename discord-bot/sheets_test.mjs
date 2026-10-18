import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from './game.mjs';
import {playerSheetRows,sheetUpdateRequests,SheetsMirror,createSheetsMirror,sheetTitle} from './sheets.mjs';
const guild='1549022269836238869',user='1234567890123456789';
test('Sheets rows preserve long Discord IDs and use the same role/rank and leaderboard rules',()=>{
 const g=new Game(':memory:');try{const p=g.create(guild,user,'=UNTRUSTED()','新北市警察局');p.stage=9;p.personalRank='警正一階';p.merit=6;p.stageMerit=1;p.month=120;const q=g.create(guild,'other','警員','花蓮縣警察局');
 const rows=playerSheetRows([{user,p},{user:'other',p:q}],guild,new Date('2026-10-18T03:00:00Z'));
 assert.equal(rows.length,2);assert.equal(rows[0][1],'=UNTRUSTED()');assert.equal(rows[0][3],'副分局長');assert.equal(rows[0][4],'二線四星');assert.equal(rows[0][13],user);assert.equal(typeof rows[0][13],'string');assert.equal(typeof rows[0][15],'number');assert.equal(rows[1][4],'一線三星');
 const req=sheetUpdateRequests({sheetId:42,gridProperties:{rowCount:100,columnCount:16}},rows,new Date());
 const data=req.find(r=>r.updateCells?.range)?.updateCells;
 assert.equal(data.range.sheetId,42);assert.equal(data.range.endRowIndex-data.range.startRowIndex,data.rows.length);assert.deepEqual(data.rows[1].values[1].userEnteredValue,{stringValue:'=UNTRUSTED()'});
 assert.equal(req.find(r=>r.repeatCell)?.repeatCell.range.startRowIndex,7);
 for(const r of req)assert.equal(Object.keys(r).length,1);
 }finally{g.close();}
});
test('Sheets mirror reads only its configured guild, preserves unrelated tabs, and reports success after write',async()=>{
 const g=new Game(':memory:');try{g.create(guild,user,'玩家','新北市警察局');g.create('other','hidden','其他伺服器','臺北市警察局');const calls=[],logs=[];
 const mirror=new SheetsMirror({game:g,guild,spreadsheetId:'sheet_test_12345',logger:{log:m=>logs.push(m),error:m=>logs.push(m)},request:async r=>{calls.push(r);return {data:r.method==='GET'?{sheets:[{properties:{sheetId:1,title:'個人筆記',gridProperties:{rowCount:100,columnCount:26}}},{properties:{sheetId:2,title:sheetTitle,gridProperties:{rowCount:100,columnCount:26}}}]}:{}};}});
 await mirror.flush();assert.equal(calls.length,2);const data=calls[1].data.requests.find(r=>r.updateCells?.range).updateCells;assert.equal(data.rows.length,2);assert.equal(data.range.sheetId,2);assert.equal(logs[0],'GOOGLE_SHEETS_SYNC_READY rows=1');mirror.stop();
 }finally{g.close();}
});
test('Sheets failures never reject the game or log credentials and recover on the next sync',async()=>{
 let failed=true;const logs=[];const mirror=new SheetsMirror({game:{players:async()=>[]},guild,spreadsheetId:'sheet_test_12345',request:async()=>{if(failed)throw Object.assign(new Error('secret-private-key'),{code:403});return {data:{sheets:[{properties:{sheetId:2,title:sheetTitle,gridProperties:{rowCount:10,columnCount:16}}}]}};},logger:{log:m=>logs.push(m),error:m=>logs.push(m)}});
 await mirror.flush();assert.deepEqual(logs,['GOOGLE_SHEETS_SYNC_FAILED 403']);failed=false;await mirror.flush();assert.equal(logs[1],'GOOGLE_SHEETS_SYNC_READY rows=0');mirror.stop();
 assert.equal(await createSheetsMirror({},guild,{}),null);
});
test('overlapping sync notifications never run concurrent writes and stop cancels queued work',async()=>{
 let release;const gate=new Promise(r=>release=r);let posts=0,active=0,maxActive=0;
 const mirror=new SheetsMirror({game:{players:async()=>[]},guild,spreadsheetId:'sheet_test_12345',debounceMs:1000,logger:{log(){},error(){}},request:async r=>{
  if(r.method==='GET'){await gate;return {data:{sheets:[{properties:{sheetId:2,title:sheetTitle,gridProperties:{rowCount:10,columnCount:16}}}]}};}
  active++;maxActive=Math.max(maxActive,active);posts++;await Promise.resolve();active--;return {data:{}};
 }});
 const a=mirror.flush(),b=mirror.flush();release();await Promise.all([a,b]);mirror.stop();assert.equal(posts,1);assert.equal(maxActive,1);assert.equal(mirror.timer,null);
});
