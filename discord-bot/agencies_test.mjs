import test from 'node:test';
import assert from 'node:assert/strict';
import {agencyHeaders,defaultAgencyRows,parseAgencyRows,getAgencyCatalog,setAgencyCatalog,AgencyCatalogSync} from './agencies.mjs';
import {vacancies} from './career.mjs';
const values=()=>[agencyHeaders,...defaultAgencyRows()];
const reset=()=>setAgencyCatalog(parseAgencyRows(values()));
test('canonical agency table covers 22 counties and rejects incomplete, duplicate or malformed replacements',()=>{
 const rows=parseAgencyRows(values());assert.equal(rows.length,22);assert.equal(rows.filter(a=>a.type==='metro').length,6);assert.equal(new Set(rows.map(a=>a.county)).size,22);
 assert.equal(rows.find(a=>a.county==='基隆市').name,'基隆市警察局');assert.equal(rows.find(a=>a.county==='花蓮縣').name,'花蓮縣警察局');
 for(const mutate of [v=>v.pop(),v=>v[0][0]='ID',v=>v[2]=v[1],v=>v[1][5]='YES',v=>v[1][2]='=IMPORTDATA("x")']){const v=structuredClone(values());mutate(v);assert.throws(()=>parseAgencyRows(v));}
});
test('read-only catalog refresh is atomic, coalesces requests, preserves last good data and redacts errors',async()=>{
 reset();let resolve,calls=0,mode='pending';const logs=[];const updated=values();updated[2][5]='停用';
 const sync=new AgencyCatalogSync({spreadsheetId:'test-sheet',request:async r=>{calls++;assert.equal(r.method,'GET');assert(decodeURIComponent(r.url).endsWith("'機關資料庫'!A5:I100"));assert.equal(r.timeout,15000);if(mode==='pending')return new Promise(r=>resolve=r);if(mode==='bad')return {data:{values:updated.slice(1)}};throw Error('PRIVATE_TOKEN');},logger:{log:x=>logs.push(x),error:x=>logs.push(x)}});
 const p=sync.refresh(),q=sync.refresh();assert.equal(calls,1);resolve({data:{values:updated}});await Promise.all([p,q]);assert.equal(getAgencyCatalog().filter(a=>a.enabled).length,21);
 mode='bad';await sync.refresh();assert.equal(getAgencyCatalog().filter(a=>a.enabled).length,21);mode='error';await sync.refresh();assert(!logs.join('').includes('PRIVATE_TOKEN'));
 sync.stop();const before=calls;await sync.refresh();assert.equal(calls,before);reset();
});
test('legacy rotation includes all enabled eligible counties and honors authoritative agency names',()=>{
 reset();const p={stage:1,unit:'花蓮縣警察局吉安分局',homeUnit:'花蓮縣警察局吉安分局',personalRank:'警佐二階'};
 const all=vacancies(p);for(const a of getAgencyCatalog().filter(a=>a.county!=='花蓮縣'))assert(all.some(v=>v.unit.startsWith(a.name)),a.name);
 const rows=getAgencyCatalog();rows.find(a=>a.county==='基隆市').enabled=false;setAgencyCatalog(rows);assert(!vacancies(p).some(v=>v.unit.startsWith('基隆市警察局')));reset();
});
