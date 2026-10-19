// Official position ranges and insignia are distinct from simulated personal rank.
// Checked against the current attachments to D0080111 on 2026-10-17.
export const careerSources={
  personnel:'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=S0020005',
  positions:'https://law.moj.gov.tw/LawClass/LawGetFile.ashx?FileId=0000397539&lan=C',
  insignia:'https://www.npa.gov.tw/ch/app/data/doc?detailNo=1322036622744621056&module=wg033&type=s',
  commissioner:'https://www.exam.gov.tw/News_Content.aspx?n=1&s=18970'
};
const rankOrder=['警佐四階','警佐三階','警佐二階','警佐一階','警正四階','警正三階','警正二階','警正一階','警監四階','警監三階','警監二階','警監一階','警監特階'];
const between=(low,high)=>rankOrder.slice(rankOrder.indexOf(low),rankOrder.indexOf(high)+1);
export const stages=[
  {title:'警員',rank:'警佐三階',rankRange:'警佐三階至一階或警正四階',allowedRanks:between('警佐三階','警正四階'),badge:'一線三星',sequence:11,scope:'地方警察機關基層單位',deck:'patrol',years:2,merit:4},
  {title:'巡佐',rank:'警佐二階',rankRange:'警佐二階至警正四階',allowedRanks:between('警佐二階','警正四階'),badge:'一線四星',sequence:10,scope:'地方警察機關勤務單位',deck:'patrol',years:3,merit:6},
  {title:'巡官',rank:'警正四階',rankRange:'警佐一階至警正三階',allowedRanks:between('警佐一階','警正三階'),badge:'二線一星',sequence:9,scope:'地方警察機關業務單位',deck:'staff',years:4,merit:8,training:'警佐升警正模擬研習'},
  {title:'警務員',rank:'警正三階',rankRange:'警佐一階至警正三階',allowedRanks:between('警佐一階','警正三階'),badge:'二線二星',sequence:8,scope:'地方警察機關業務單位',deck:'staff',years:4,merit:8},
  {title:'警務正',rank:'警正二階',rankRange:'警正四階至警正二階',allowedRanks:between('警正四階','警正二階'),badge:'二線三星',sequence:6,scope:'警政署或直轄市警察局',deck:'staff',years:5,merit:10},
  {title:'分局長',rank:'警正一階',rankRange:'警正一階至警監四階',allowedRanks:between('警正一階','警監四階'),badge:'三線一星',sequence:4,scope:'直轄市警察局所屬分局',deck:'precinct',years:5,merit:10},
  {title:'副局長',rank:'警監三階',rankRange:'警監三階至警監二階',allowedRanks:between('警監三階','警監二階'),badge:'三線二星',sequence:3,scope:'直轄市警察局',deck:'bureau',years:6,merit:12,training:'警正升警監模擬研習'},
  {title:'局長',rank:'警監一階',rankRange:'警監一階',allowedRanks:['警監一階'],badge:'三線三星',sequence:1,scope:'直轄市警察局',deck:'bureau',years:6,merit:12},
  {title:'署長',rank:'警監特階',rankRange:'警監一階至警監特階',allowedRanks:between('警監一階','警監特階'),badge:'三線四星',sequence:null,scope:'內政部警政署',deck:'npa'},
  {title:'副分局長',rank:'警正一階',rankRange:'警正三階至警正一階',allowedRanks:between('警正三階','警正一階'),badge:'二線四星',sequence:5,scope:'直轄市警察局所屬分局',deck:'precinct',years:3,merit:6}
];
const countyVariants={
  5:{rank:'警正一階',rankRange:'警正二階至警正一階',allowedRanks:between('警正二階','警正一階'),badge:'二線四星',sequence:5,scope:'縣（市）警察局所屬分局'},
  6:{rank:'警監四階',rankRange:'警正一階至警監四階',allowedRanks:between('警正一階','警監四階'),badge:'三線一星',sequence:4,scope:'縣（市）警察局'},
  7:{rank:'警監三階',rankRange:'警監四階至警監三階',allowedRanks:between('警監四階','警監三階'),badge:'三線二星',sequence:3,scope:'縣（市）警察局'}
};
const metros=['臺北市','新北市','桃園市','臺中市','臺南市','高雄市'];
const counties=['基隆市','新竹市','嘉義市','新竹縣','苗栗縣','彰化縣','南投縣','雲林縣','嘉義縣','屏東縣','宜蘭縣','花蓮縣','臺東縣','澎湖縣','金門縣','連江縣'];
export function careerArea(text){const normalized=String(text||'').replaceAll('台','臺');const county=[...metros,...counties].find(c=>normalized.includes(c));return {county:county||null,type:county?(metros.includes(county)?'metro':'county'):'unspecified'};}
export function careerRole(p,index=p.stage){
  if(p.webCareer&&index===p.stage){const s=p.webCareer.state,v=p.webSummary||{};return {title:s.position||'考生',rank:s.officialRank||'—',rankRange:'依網頁版職務與機關判定',allowedRanks:[s.officialRank||'—'],badge:v.badge||'尚無配階',sequence:v.sequence??99,scope:s.unitName||'尚未分發',deck:'staff',area:careerArea(s.unitName),scopeNote:''};}
  const area=careerArea(p.careerHome||p.homeUnit||p.unit),variant=area.type==='county'?countyVariants[index]:null;
  return {...stages[index],...variant,...(index===p.stage?p.post?.role:null),area,scopeNote:area.type==='unspecified'&&index>=5&&index<=7?'未辨識縣市，主管職務暫按直轄市範例模擬。':''};
}
export function currentRank(p){if(p.webCareer)return p.webCareer.state.officialRank||'—';const role=careerRole(p);return role.allowedRanks.includes(p.personalRank)?p.personalRank:role.rank;}
export const sequenceLabel=r=>r.sequence===null?'未列一般陞遷序列':`第 ${r.sequence} 序列`;
export function positionSummary(r){return `${r.badge}｜${sequenceLabel(r)}\n職務等階：${r.rankRange}\n機關層級：${r.scope}`;}
export function normalizeCareer(p){
  if(!p)return p;
  if(p.webCareer)return p;
  p.homeUnit ||= p.unit;
  p.personalRank=currentRank(p);
  if((p.careerModelVersion||0)<3&&[1,2,3].includes(p.stage)&&!p.post){
    p.post={unit:p.unit,role:{title:['','巡佐兼副所長','巡官兼所長','警務員兼所長'][p.stage],deck:'station_lead',authority:p.stage===1?'deputy':'head'}};
  }
  p.careerModelVersion=3;
  return p;
}
export function promoteRank(p){
  const role=careerRole(p),old=p.personalRank||role.rank;
  // Game appointment rank is an explicit simulation choice within the official range.
  // It is not a statement that everyone holding this title has the same personal rank.
  const preferred=rankOrder.indexOf(old)>rankOrder.indexOf(role.rank)?old:role.rank;
  p.personalRank=role.allowedRanks.includes(preferred)?preferred:role.rank;
}
export function appointmentUnit(p){
  const role=careerRole(p),area=role.area,home=p.careerHome||p.homeUnit||p.unit;
  if(p.stage<4)return home;
  if(p.stage===8)return '內政部警政署';
  if(p.stage===4)return area.type==='metro'?`${area.county}政府警察局｜業務單位（模擬任命）`:'內政部警政署｜業務單位（模擬任命）';
  const agency=home.match(/^(.*?警察局)/)?.[1]||(area.type==='metro'?`${area.county}政府警察局`:area.county?`${area.county}警察機關（模擬任命）`:'直轄市警察局（遊戲預設）');
  if(p.stage===5||p.stage===9){const precinct=home.match(/^(.*?分局)/)?.[1];return precinct||`${role.scope}（模擬任命；原轄區 ${area.county||'未填'}）`;}
  return agency;
}

// Available simulated vacancies, matching the web game's choice-based appointments.
// Concurrent station duties are alternatives to ordinary and specialist posts.
export function vacancies(p,index=p.stage){
  const base=careerRole({...p,post:null},index);
  const local=p.careerHome||p.homeUnit||p.unit;
  const agency=local.match(/^(.*?警察局)/)?.[1]||'原轄警察機關';
  const groups=[
    [['警員','patrol','staff','派出所'],['警員','traffic','staff','交通隊'],['警員','criminal','staff','刑事單位']],
    [['巡佐','patrol','team','勤務單位'],['警務佐','staff','staff','行政單位'],['偵查佐','criminal','staff','偵查隊'],['小隊長','security','team','警備單位'],['巡佐兼副所長','station_lead','deputy','派出所'],['巡佐兼小隊長','station_lead','team','派出所'],['巡佐兼所長','station_lead','head','派出所']],
    [['巡官','staff','staff','行政組'],['巡官','prevention','staff','防治組'],['巡官','civil','staff','民防組'],['偵查員','criminal','staff','偵查隊'],['分隊長','traffic','team','交通分隊'],['巡官兼副所長','station_lead','deputy','派出所'],['巡官兼所長','station_lead','head','派出所']],
    [['警務員','staff','staff','行政組'],['警務員','traffic','staff','交通組'],['組員','prevention','staff','防治單位'],['偵查員','criminal','staff','偵查隊'],['警務員兼所長','station_lead','head','派出所']],
    [['警務正','staff','staff','業務單位'],['警務正','inspection','staff','督察單位'],['警務正','dispatch','staff','勤務指揮中心']],
  ];
  let specs=groups[index]||[[base.title,base.deck,[6,9].includes(index)?'deputy':'head','']];
  const rows=specs.map(([title,deck,authority,suffix],i)=>({id:'local-'+i,unit:index<4?agency+'｜'+suffix:appointmentUnit({...p,post:null,stage:index}),role:{title,deck,authority}}));
  if(index<4)for(const county of ['新北市','臺中市','高雄市','屏東縣','花蓮縣']){
    if(local.includes(county))continue;
    const [title,deck,authority,suffix]=specs[0];
    rows.push({id:'transfer-'+county,unit:county+'政府警察局｜'+suffix+'（模擬職缺）',role:{title,deck,authority}});
  }
  return rows;
}

// Stable IDs keep existing saves intact while inserting the missing municipal level.
export function nextStage(p){
  if(p.stage===8)return null;
  if(p.stage===9)return 5;
  if(p.stage===4&&careerArea(p.careerHome||p.homeUnit||p.unit).type!=='county')return 9;
  return p.stage+1;
}
export const careerDisplayOrder=[0,1,2,3,4,9,5,6,7,8];
