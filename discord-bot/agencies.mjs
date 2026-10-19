import {readFileSync} from 'node:fs';
const fallback=JSON.parse(readFileSync(new URL('agencies.json',import.meta.url),'utf8'));
export const agencySheetTitle='機關資料庫';
export const agencyHeaders=['機關ID','縣市','警察局全名','機關類型','遊戲區域','跨縣市選填','官方名錄來源','核對日期','備註'];
let active=fallback.agencies;
export const getAgencyCatalog=()=>active.map(a=>({...a}));
export const availableAgencies=()=>getAgencyCatalog().filter(a=>a.enabled);
export const defaultAgencyRows=()=>fallback.agencies.map(a=>[a.id,a.county,a.name,a.type==='metro'?'直轄市':'縣市',a.region,'啟用',fallback.source,fallback.checkedAt,'遊戲機關名錄；不是即時人事缺額']);
export function parseAgencyRows(values){
  if(!Array.isArray(values)||agencyHeaders.some((h,i)=>values[0]?.[i]!==h))throw Error('AGENCY_HEADERS_INVALID');
  const rows=values.slice(1).filter(row=>row.some(x=>String(x??'').trim()));
  if(rows.length!==22)throw Error('AGENCY_COUNT_INVALID');
  const ids=new Set(),names=new Set();
  return rows.map(row=>{
    const [id,county,name,type,region,enabled]=row.map(x=>String(x??'').trim()),original=fallback.agencies.find(a=>a.id===id);
    if(!original||original.county!==county||type!==(original.type==='metro'?'直轄市':'縣市')||ids.has(id)||names.has(name)||!name.startsWith(county)||!name.endsWith('警察局')||name.length>60||!['北部','中部','南部','東部','離島'].includes(region)||!['啟用','停用'].includes(enabled))throw Error('AGENCY_ROW_INVALID');
    ids.add(id);names.add(name);return {id,county,name,type:original.type,region,enabled:enabled==='啟用'};
  });
}
export function setAgencyCatalog(rows){const validated=parseAgencyRows([agencyHeaders,...rows.map(a=>[a.id,a.county,a.name,a.type==='metro'?'直轄市':'縣市',a.region,a.enabled?'啟用':'停用'])]);active=validated;}
export class AgencyCatalogSync {
  constructor({spreadsheetId,request,logger=console,intervalMs=60000}){Object.assign(this,{spreadsheetId,request,logger,intervalMs});this.closed=false;this.pending=null;this.timer=null;}
  start(){if(this.timer)return;void this.refresh();this.timer=setInterval(()=>void this.refresh(),this.intervalMs);this.timer.unref?.();}
  stop(){this.closed=true;clearInterval(this.timer);this.timer=null;}
  async refresh(){
    if(this.closed)return;if(this.pending)return this.pending;
    this.pending=(async()=>{try{
      const range=encodeURIComponent("'"+agencySheetTitle+"'!A5:I100");
      const r=await this.request({url:'https://sheets.googleapis.com/v4/spreadsheets/'+this.spreadsheetId+'/values/'+range,method:'GET',params:{valueRenderOption:'UNFORMATTED_VALUE'},timeout:15000});
      const rows=parseAgencyRows(r.data.values);if(this.closed)return;active=rows;
      this.logger.log('AGENCY_CATALOG_SYNC_READY rows='+rows.length+' enabled='+rows.filter(a=>a.enabled).length);
    }catch(e){const code=String(e.code||e.response?.status||'INVALID_DATA').replace(/[^A-Za-z0-9_]/g,'').slice(0,40);this.logger.error('AGENCY_CATALOG_SYNC_FAILED '+code);}
    })().finally(()=>{this.pending=null;});return this.pending;
  }
}
