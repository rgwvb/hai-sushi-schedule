const C=["臺北市","新北市","桃園市","臺中市","臺南市","高雄市","基隆市","新竹市","嘉義市","宜蘭縣","新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義縣","屏東縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
const LOCAL_POLICE_AGENCIES=[
  ["臺北市","臺北市政府警察局",34,76,true],
  ["新北市","新北市政府警察局",38,74,true],
  ["桃園市","桃園市政府警察局",32,71,true],
  ["臺中市","臺中市政府警察局",36,73,true],
  ["臺南市","臺南市政府警察局",32,69,true],
  ["高雄市","高雄市政府警察局",36,72,true],
  ["基隆市","基隆市警察局",18,62,false],
  ["新竹市","新竹市警察局",18,66,false],
  ["嘉義市","嘉義市政府警察局",16,61,false],
  ["宜蘭縣","宜蘭縣政府警察局",18,62,false],
  ["新竹縣","新竹縣政府警察局",22,67,false],
  ["苗栗縣","苗栗縣警察局",18,61,false],
  ["彰化縣","彰化縣警察局",24,64,false],
  ["南投縣","南投縣政府警察局",18,60,false],
  ["雲林縣","雲林縣警察局",20,60,false],
  ["嘉義縣","嘉義縣警察局",18,59,false],
  ["屏東縣","屏東縣政府警察局",22,61,false],
  ["花蓮縣","花蓮縣警察局",18,60,false],
  ["臺東縣","臺東縣警察局",18,59,false],
  ["澎湖縣","澎湖縣政府警察局",12,56,false],
  ["金門縣","金門縣警察局",10,55,false],
  ["連江縣","連江縣警察局",8,54,false]
];
const CENTRAL_POLICE_AGENCIES=[
  "內政部警政署","內政部警政署刑事警察局","內政部警政署航空警察局","內政部警政署國道公路警察局","內政部警政署鐵路警察局",
  "內政部警政署保安警察第一總隊","內政部警政署保安警察第二總隊","內政部警政署保安警察第三總隊","內政部警政署保安警察第四總隊",
  "內政部警政署保安警察第五總隊","內政部警政署保安警察第六總隊","內政部警政署保安警察第七總隊",
  "內政部警政署基隆港務警察總隊","內政部警政署臺中港務警察總隊","內政部警政署高雄港務警察總隊","內政部警政署花蓮港務警察總隊"
];
function agencyRecord(city){return LOCAL_POLICE_AGENCIES.find(x=>x[0]===city)||null}
function localAgencyName(){return (s&&s.localAgency)||agencyRecord(s&&s.county)?.[1]||((s&&s.county)?s.county+"警察局":"")}
function localPrefix(){return localAgencyName()+((s&&s.precinct)?s.precinct:"")}
const P=[
["大同分局","老城區、商圈、交通節點",28,66],
["大安分局","住宅商業混合、校園與大型道路",24,72],
["中山分局","商業旅館、娛樂場所與交通勤務",30,74],
["萬華分局","老城區、商圈、交通樞紐與複合治安勤務",32,70],
["中正第一分局","中央行政機關、重要設施與大型活動勤務",20,78],
["中正第二分局","交通樞紐、住宅商業與一般治安勤務",24,69],
["南港分局","展覽活動、交通節點、商辦住宅勤務",18,65],
["士林分局","觀光商圈、住宅與大型活動勤務",26,68],
["北投分局","住宅、觀光與山區勤務",18,64],
["松山分局","商業住宅、活動與交通勤務",22,71],
["信義分局","大型商圈、活動、夜間人潮與重要場所勤務",30,76],
["內湖分局","科技商辦、住宅與交通勤務",22,68],
["文山第一分局","校園、住宅與山區勤務",18,65],
["文山第二分局","校園、住宅與山區勤務",18,64]
];

const DISTRIBUTION_POSTS=[
  ...P.map(p=>({id:"taipei:"+p[0],label:"臺北市｜"+p[0],county:"臺北市",agency:"臺北市政府警察局",precinct:p[0],desc:p[1],vacancy:p[2],threshold:p[3]})),
  ...LOCAL_POLICE_AGENCIES.filter(x=>x[0]!=="臺北市").map(x=>({id:"local:"+x[0],label:x[1],county:x[0],agency:x[1],precinct:"",desc:"地方警察局分發；後續可在局本部、分局／警察所、直屬隊與基層單位歷練。",vacancy:x[2],threshold:x[3]}))
];
function distributionPost(id){return DISTRIBUTION_POSTS.find(x=>x.id===id)||null}
const STATIONS={
  "大同分局":["寧夏路派出所","延平派出所","建成派出所","民族路派出所","民生西路派出所","重慶北路派出所"],
  "大安分局":["和平東路派出所","安和路派出所","敦化南路派出所","新生南路派出所","瑞安街派出所","羅斯福路派出所","臥龍街派出所"],
  "中山分局":["中山一派出所","中山二派出所","圓山派出所","長春路派出所","長安東路派出所","民權一派出所","建國派出所","大直派出所"],
  "萬華分局":["龍山派出所","康定路派出所","東園街派出所","西園路派出所","大理街派出所","華江派出所","莒光派出所","西門町派出所","青年路派出所"],
  "中正第一分局":["仁愛路派出所","介壽路派出所","博愛路派出所","忠孝東路派出所","忠孝西路派出所"],
  "中正第二分局":["思源街派出所","廈門街派出所","南昌路派出所","南海路派出所","泉州街派出所"],
  "南港分局":["同德派出所","南港派出所","舊莊派出所","玉成派出所"],
  "士林分局":["天母派出所","山仔后派出所","後港派出所","文林派出所","永福派出所","溪山派出所","社子派出所","翠山派出所","芝山岩派出所","蘭雅派出所","平等駐在所"],
  "北投分局":["光明派出所","公園派出所","大屯派出所","奇岩派出所","永明派出所","石牌派出所","竹子湖派出所","長安派出所","關渡派出所"],
  "松山分局":["松山派出所","中崙派出所","東社派出所","三民派出所","民有派出所"],
  "信義分局":["三張犁派出所","五分埔派出所","六張犁派出所","吳興街派出所","福德街派出所"],
  "內湖分局":["內湖派出所","潭美派出所","西湖派出所","大湖派出所","文德派出所","東湖派出所","康樂派出所","康寧派出所","港墘派出所"],
  "文山第一分局":["木柵派出所","木新派出所","復興派出所","指南派出所","萬芳派出所"],
  "文山第二分局":["景美派出所","興隆派出所","萬盛派出所"]
};
function stationList(){return s&&s.county==="臺北市"?(STATIONS[s.precinct]||[]):[]}
function randomStation(){const a=stationList();return a.length?a[Math.floor(Math.random()*a.length)]:"轄內派出所"}
function stationFullName(name){return localPrefix()+name}
function stationDutyText(){return "常見職務：所長、副所長、巡佐、警員。主要勤務：110報案、巡邏、值班、守望、臨檢、交通事故、失蹤人口、家暴婦幼、詐欺、竊盜、毒品、通緝犯與為民服務。"}
const PRECINCT_ORG=[
  ["組","行政組","勤務規劃、法規、公關、總務等"],
  ["組","督察組","勤務督導、考核、風紀與內部管理"],
  ["組","防治組","婦幼、社區警政、失蹤人口、警勤區等"],
  ["組","保防組","安全防護、保防與社會治安調查"],
  ["組","民防組","民防、義警、防空疏散、災害防救"],
  ["組","交通組","交通勤務規劃、申訴、專案與疏導"],
  ["室","秘書室","文書、檔案、研考、出納與綜合行政"],
  ["室","人事室","任免、考核、差勤、訓練與人事服務"],
  ["室","會計室","歲計、會計與內部審核"],
  ["中心","勤務指揮中心","110受理、指揮、派遣、管制與通報"],
  ["隊","偵查隊","刑案偵查、案件管制與刑事勤務"],
  ["隊","警備隊","機動支援、重大事故與臨時勤務"]
];
function renderPrecinctOrg(){
  if(!$("precinctOrgDirectory")||!$("precinctOrgCards"))return;
  $("precinctOrgDirectory").style.display=s.county?"block":"none";
  if($("precinctOrgTitle"))$("precinctOrgTitle").textContent=(s.precinct||localAgencyName())+" 組織概覽";
  $("precinctOrgCards").innerHTML=PRECINCT_ORG.map(x=>'<div class="station-directory-item"><b>'+x[0]+'｜'+x[1]+'</b><span>'+x[2]+'</span></div>').join("");
}
const R=[
["tpa","👮","警專二年制 → 四等警察人員特考","警專正期教育2年；完成學業後仍須通過相應四等警察人員特考與任用流程，初任以警員職務為主。",3,180,"警佐三階任官資格","警佐三階","警員","第十一序列",730,11],
["cpu","🎓","警大四年制 → 三等警察人員特考","警大學士班4年；畢業後仍須通過相應三等警察人員特考與任用流程，依類科分發巡官、分隊長或同等職務。",4,220,"警正四階任官資格","警正四階","巡官","第九序列",1460,9],
["g4","📝","一般警察特考四等","一般教育體系報考；通過考試後進行教育與實務訓練，完成後取得相應四等任官資格並分發基層職務。",3,210,"警佐三階任官資格","警佐三階","警員","第十一序列",540,11],
["g3","📚","一般警察特考三等","大學以上學歷路線；通過三等一般警察特考後接受較長教育與實務訓練，再依類科分發。",5,270,"警正四階任官資格","警正四階","巡官","第九序列",720,9]
];
const U=[
["station","🏢","派出所",0,0,"該分局轄內派出所：值班、巡邏、110、家暴、失蹤、詐騙與一般治安案件。"],
["security","🛡️","警備隊",0,60,"分局警備隊支援機動、重大事故、聚眾與臨時勤務。"],
["traffic","🏍️","交通分隊",1,80,"交通警察大隊配賦分隊：事故、酒駕、疏導與交通執法。"],
["detective","🔎","偵查隊",2,180,"分局偵查隊：刑案偵查、筆錄、監視器與案件追查。"],
["admin","🗂️","分局組室",2,150,"分局行政、保防、防治、督察等內勤業務職務。"]
];
const D=[
["110 民眾糾紛","超商兩名男子爭吵，其中一人疑似酒後情緒激動。",[["確認安全、分隔雙方並詢問店員",16,4,-8],["只要求雙方離開",6,-2,-4],["查詢紀錄並呼叫支援共同到場",13,3,-7]]],
["交通事故","路口兩車碰撞，一名駕駛頸部不適，車流快速回堵。",[["先確認傷者、通知救護並疏導交通",18,5,-10],["先爭論肇責再決定救護",5,-4,-6],["只拍照後請雙方自行協調",3,-5,-3]]],
["疑似酒駕","巡邏發現前車行車不穩，多次偏離車道。",[["保持安全距離、通報車號並安全攔查",17,4,-9],["高速超車強行攔停",5,-4,-12],["持續觀察並請支援注意前方",14,3,-7]]],
["疑似詐騙車手","銀行通報男子持多張提款卡連續提領大量現金。",[["查證身分、提款紀錄與監視器",20,6,-10],["未查證前直接上銬",4,-6,-8],["先觀察動線再上前查證",17,5,-8]]],
["失蹤人口","家長報案：13歲孩子放學後未返家，手機無法聯繫。",[["立即整理資訊並啟動協尋",19,6,-8],["請家長再等到深夜",1,-8,-1],["只請家長自行找",1,-10,-1]]],
["家暴案件","住宅區傳出激烈爭吵與摔物聲，屋內可能有孩童。",[["確認安全、分隔當事人並完整紀錄",19,6,-11],["只勸雙方不要吵就離開",4,-6,-4],["先請支援再依現場狀況處理",16,4,-9]]]];
const isOfficerTrack=()=>["cpu","g3"].includes(s?.route);
const officerInitialPool=()=>[
  {id:"admin_officer",unit:"admin",assignmentType:"administration",unitName:localPrefix()+"行政組",position:"巡官",seq:9,desc:"勤務規劃、法規、公關、總務等分局行政業務。"},
  {id:"prevention_officer",unit:"admin",assignmentType:"prevention",unitName:localPrefix()+"防治組",position:"巡官",seq:9,desc:"婦幼、社區警政、失蹤人口、警勤區與外事相關業務。"},
  {id:"security_officer",unit:"admin",assignmentType:"security_affairs",unitName:localPrefix()+"保防組",position:"巡官",seq:9,desc:"安全防護、社會治安調查、保防與特種勤務情報相關業務。"},
  {id:"civil_officer",unit:"admin",assignmentType:"civil_defense",unitName:localPrefix()+"民防組",position:"巡官",seq:9,desc:"民防、義警、防空疏散、災害防救與城鎮韌性等業務。"},
  {id:"traffic_officer",unit:"admin",assignmentType:"traffic_office",unitName:localPrefix()+"交通組",position:"巡官",seq:9,desc:"交通勤務規劃、疏導、申訴與專案等業務。"},
  {id:"detective_officer",unit:"detective",assignmentType:"detective",unitName:localPrefix()+"偵查隊",position:"巡官",seq:9,desc:"刑案偵查、案件管制、偵查支援與刑事勤務。"},
  {id:"guard_officer",unit:"security",assignmentType:"guard",unitName:localPrefix()+"警備隊",position:"巡官",seq:9,desc:"機動支援、駐地安全、重大事故與臨時勤務。"}
];
function pickOfficerOffers(pool,count=3){
  const a=[...pool],out=[];
  while(a.length&&out.length<count){out.push(a.splice(Math.floor(Math.random()*a.length),1)[0])}
  return out;
}
function officerInitialOffers(){
  if(!Array.isArray(s.initialOffers)||!s.initialOffers.length)s.initialOffers=pickOfficerOffers(officerInitialPool(),3);
  return s.initialOffers;
}
function effectiveOfficerSequence(){
  let seq=Number(s&&s.careerSequenceNo);
  if(!Number.isFinite(seq)||seq<0||seq>9)seq=9;
  const pos=String((s&&s.position)||(s&&s.rank)||"");
  if(/警務員/.test(pos))seq=Math.min(seq,8);
  if(/警務正|偵查正|分局.*組長|偵查隊長/.test(pos))seq=Math.min(seq,6);
  else if(/第七序列警務員|督察員|警備隊長|偵查隊副隊長/.test(pos))seq=Math.min(seq,7);
  if(/組長|偵查隊長|主任/.test(pos))seq=Math.min(seq,6);
  if(/副分局長|科長|大隊長|專員/.test(pos))seq=Math.min(seq,5);
  if(/分局長|大隊長/.test(pos))seq=Math.min(seq,4);
  if(/警政署組長|勤務指揮中心主任|刑事警察局副局長|直轄市.*警察局副局長/.test(pos))seq=Math.min(seq,3);
  if(/警政委員|警政署主任秘書|警政署督察室主任|航空警察局局長|國道公路警察局局長|保安警察第[一二]總隊總隊長/.test(pos))seq=Math.min(seq,2);
  if(/警政署副署長|刑事警察局局長|直轄市.*警察局局長|臺灣警察專科學校校長/.test(pos))seq=Math.min(seq,1);
  if(/警政署署長|中央警察大學校長/.test(pos))seq=0;
  return Math.max(0,Math.min(9,seq));
}
function officerRotationOffers(){
  const seq=effectiveOfficerSequence();
  const pfx=localPrefix();

  // 職務輪調是「同序列／相當職務」的橫向歷練，不應把已升任警務員的人降回巡官。
  const pools={
    9:[
      {id:"rotation_admin",unit:"admin",assignmentType:"administration",unitName:pfx+"行政組",position:"巡官",seq:9,desc:"分局行政、勤務規劃與法規歷練。"},
      {id:"rotation_security",unit:"admin",assignmentType:"security_affairs",unitName:pfx+"保防組",position:"巡官",seq:9,desc:"保防、安全防護與社會治安調查歷練。"},
      {id:"rotation_prevention",unit:"admin",assignmentType:"prevention",unitName:pfx+"防治組",position:"巡官",seq:9,desc:"婦幼、社區警政與失蹤人口業務歷練。"},
      {id:"rotation_civil",unit:"admin",assignmentType:"civil_defense",unitName:pfx+"民防組",position:"巡官",seq:9,desc:"民防、義警、防災與城鎮韌性歷練。"},
      {id:"rotation_traffic",unit:"admin",assignmentType:"traffic_office",unitName:pfx+"交通組",position:"巡官",seq:9,desc:"交通勤務規劃與專案歷練。"},
      {id:"rotation_detective",unit:"detective",assignmentType:"detective",unitName:pfx+"偵查隊",position:"偵查員",seq:9,desc:"刑案偵查與案件管制歷練。"},
      {id:"rotation_guard",unit:"security",assignmentType:"guard",unitName:pfx+"警備隊",position:"巡官",seq:9,desc:"機動與重大勤務歷練。"},
      {id:"station_deputy",unit:"station",assignmentType:"station_command",stationName:randomStation(),position:"巡官兼副所長",seq:9,desc:"派出所副主管，兼顧勤務、帶班與所務。"}
    ],
    8:[
      {id:"rotation_admin8",unit:"admin",assignmentType:"administration",unitName:pfx+"行政組",position:"警務員",seq:8,desc:"分局行政業務之較高層級幕僚歷練。"},
      {id:"rotation_security8",unit:"admin",assignmentType:"security_affairs",unitName:pfx+"保防組",position:"警務員",seq:8,desc:"保防與安全防護業務之幕僚歷練。"},
      {id:"rotation_prevention8",unit:"admin",assignmentType:"prevention",unitName:pfx+"防治組",position:"警務員",seq:8,desc:"防治、婦幼與社區警政業務之幕僚歷練。"},
      {id:"rotation_civil8",unit:"admin",assignmentType:"civil_defense",unitName:pfx+"民防組",position:"警務員",seq:8,desc:"民防與防災業務之幕僚歷練。"},
      {id:"rotation_traffic8",unit:"admin",assignmentType:"traffic_office",unitName:pfx+"交通組",position:"警務員",seq:8,desc:"交通業務之幕僚與協調歷練。"},
      {id:"rotation_detective8",unit:"detective",assignmentType:"detective",unitName:pfx+"偵查隊",position:"偵查員",seq:8,desc:"刑案偵查與專案案件之較高層級歷練。"},
      {id:"rotation_guard8",unit:"security",assignmentType:"guard",unitName:pfx+"警備隊",position:"警務員",seq:8,desc:"機動勤務與隊務幕僚歷練。"},
      {id:"station_chief",unit:"station",assignmentType:"station_command",stationName:randomStation(),position:"警務員兼所長",seq:8,desc:"派出所主管職，負責所務、勤務、人員與轄區治安。"}
    ],
    7:[
      {id:"rotation_admin7",unit:"admin",assignmentType:"administration",unitName:pfx+"行政組",position:"第七序列警務員",seq:7,desc:"分局較高層級幕僚與業務督導歷練。"},
      {id:"rotation_security7",unit:"admin",assignmentType:"security_affairs",unitName:pfx+"保防組",position:"第七序列警務員",seq:7,desc:"保防與安全防護業務督導歷練。"},
      {id:"rotation_prevention7",unit:"admin",assignmentType:"prevention",unitName:pfx+"防治組",position:"第七序列警務員",seq:7,desc:"防治、婦幼與社區警政業務督導歷練。"},
      {id:"rotation_inspector7",unit:"admin",assignmentType:"inspection",unitName:pfx+"督察組",position:"督察員",seq:7,desc:"勤務督導、考核與風紀業務歷練。"},
      {id:"rotation_guard7",unit:"security",assignmentType:"guard",unitName:pfx+"警備隊",position:"警備隊長",seq:7,desc:"警備隊主管職，負責隊務與機動勤務督導。"},
      {id:"rotation_detective7",unit:"detective",assignmentType:"detective",unitName:pfx+"偵查隊",position:"偵查隊副隊長",seq:7,desc:"刑案與偵查勤務副主管歷練。"}
    ],
    6:[
      {id:"rotation_policeaffairs6a",unit:"admin",assignmentType:"administration",unitName:pfx+"行政組",position:"警務正",seq:6,desc:"第六序列警務正，辦理較高層級幕僚、督導及專案工作。"},
      {id:"rotation_admin6",unit:"admin",assignmentType:"administration",unitName:pfx+"行政組",position:"行政組長",seq:6,desc:"分局行政組主管職。"},
      {id:"rotation_security6",unit:"admin",assignmentType:"security_affairs",unitName:pfx+"保防組",position:"保防組長",seq:6,desc:"分局保防組主管職。"},
      {id:"rotation_prevention6",unit:"admin",assignmentType:"prevention",unitName:pfx+"防治組",position:"防治組長",seq:6,desc:"分局防治組主管職。"},
      {id:"rotation_civil6",unit:"admin",assignmentType:"civil_defense",unitName:pfx+"民防組",position:"民防組長",seq:6,desc:"分局民防組主管職。"},
      {id:"rotation_traffic6",unit:"admin",assignmentType:"traffic_office",unitName:pfx+"交通組",position:"交通組長",seq:6,desc:"分局交通組主管職。"},
      {id:"rotation_detective6",unit:"detective",assignmentType:"detective",unitName:pfx+"偵查隊",position:"偵查隊長",seq:6,desc:"分局偵查隊主管職。"},
      {id:"rotation_command6",unit:"admin",assignmentType:"command_center",unitName:pfx+"勤務指揮中心",position:"主任",seq:6,desc:"勤務指揮中心主管職，負責110、派遣、管制及重大事故通報。"}
    ]
  };

  const genericSeq=Math.min(seq,6);
  let base=pools[seq]||pools[genericSeq]||pools[9];

  // 高階生涯擴展到全國與中央警察機關。第3至第1序列依警政署公開陞遷序列表建模；最高職務層級另列署長／警大校長。
  if(seq===3){
    base=[
      {id:"npa_dir3",unit:"central",assignmentType:"central_command",unitName:"內政部警政署",position:"組長",seq:3,desc:"警政署業務單位主管。"},
      {id:"npa_cmd3",unit:"central",assignmentType:"central_command",unitName:"內政部警政署勤務指揮中心",position:"主任",seq:3,desc:"全國重大治安、交通、災害與110勤務指揮。"},
      {id:"cib_deputy3",unit:"central",assignmentType:"central_cib",unitName:"內政部警政署刑事警察局",position:"副局長",seq:3,desc:"刑事警察局副首長，參與全國刑事偵防政策與指揮。"},
      {id:"metro_deputy3",unit:"central",assignmentType:"central_local",unitName:"直轄市政府警察局",position:"副局長",seq:3,desc:"直轄市警察局副首長職務。"}
    ];
  }else if(seq===2){
    base=[
      {id:"npa_sec2",unit:"central",assignmentType:"central_command",unitName:"內政部警政署",position:"主任秘書",seq:2,desc:"署本部高階幕僚主管。"},
      {id:"npa_inspector2",unit:"central",assignmentType:"central_command",unitName:"內政部警政署督察室",position:"主任",seq:2,desc:"全國警察督察、考核與風紀高階主管。"},
      {id:"npa_commissioner2",unit:"central",assignmentType:"central_command",unitName:"內政部警政署",position:"警政委員",seq:2,desc:"警政署高階警政幕僚職務。"},
      {id:"aviation_chief2",unit:"central",assignmentType:"central_special",unitName:"內政部警政署航空警察局",position:"局長",seq:2,desc:"航空警察局首長。"},
      {id:"highway_chief2",unit:"central",assignmentType:"central_special",unitName:"內政部警政署國道公路警察局",position:"局長",seq:2,desc:"國道公路警察局首長。"},
      {id:"spc1_chief2",unit:"central",assignmentType:"central_special",unitName:"內政部警政署保安警察第一總隊",position:"總隊長",seq:2,desc:"保安警察第一總隊首長。"},
      {id:"spc2_chief2",unit:"central",assignmentType:"central_special",unitName:"內政部警政署保安警察第二總隊",position:"總隊長",seq:2,desc:"保安警察第二總隊首長。"}
    ];
  }else if(seq===1){
    const metro=LOCAL_POLICE_AGENCIES.filter(x=>x[4]).map(x=>x[1]);
    const metroAgency=metro[Math.floor(Math.random()*metro.length)];
    base=[
      {id:"npa_deputy1",unit:"central",assignmentType:"central_command",unitName:"內政部警政署",position:"副署長",seq:1,desc:"警政署副首長。"},
      {id:"cib_chief1",unit:"central",assignmentType:"central_cib",unitName:"內政部警政署刑事警察局",position:"局長",seq:1,desc:"刑事警察局首長，統籌全國重大刑案與刑事偵防。"},
      {id:"metro_chief1",unit:"central",assignmentType:"central_local",unitName:metroAgency,position:"局長",seq:1,desc:"直轄市政府警察局首長。"},
      {id:"tpa_chief1",unit:"central",assignmentType:"central_school",unitName:"臺灣警察專科學校",position:"校長",seq:1,desc:"臺灣警察專科學校校長。"}
    ];
  }else if(seq===0){
    base=[
      {id:"npa_chief0",unit:"central",assignmentType:"central_command",unitName:"內政部警政署",position:"署長",seq:0,desc:"全國警察行政最高首長，統一指揮、監督全國警察機關（構）執行警察任務。"},
      {id:"cpu_president0",unit:"central",assignmentType:"central_school",unitName:"中央警察大學",position:"校長",seq:0,desc:"中央警察大學校長，屬警察體系最高層級職務之一。"}
    ];
  }else if(seq<=5){
    base=[
      {id:"senior_staff",unit:"admin",assignmentType:"senior",unitName:"臺北市政府警察局局本部／所屬單位",position:seq===5?"專員":"高階主管職",seq,desc:"較高序列之局本部或大型單位主管／幕僚職務；依缺額與資格產生。"},
      {id:"senior_command",unit:"admin",assignmentType:"senior",unitName:"臺北市政府警察局所屬分局／大隊",position:seq===5?"副主管職":"分局長／大隊長等高階主管職",seq,desc:"較高序列主管職務；不再回到基層巡官職缺。"}
    ];
  }

  return pickOfficerOffers(base,Math.min(3,base.length)).map(o=>{if(o.stationName)o.unitName=stationFullName(o.stationName);return o});
}
function retirementProfile(){
  if(s&&s.retired&&s.retirementClass)return {kind:s.retirementClass,voluntary:Number(s.retirementVoluntaryAge||60),mandatory:Number(s.retirementMandatoryAge||65),note:"退休時適用之退休類別"};
  const pos=String((s&&s.position)||(s&&s.rank)||"");
  const type=String((s&&s.assignmentType)||"");

  // 108/1/1生效之警察危勞職務標準：第一類屆齡59；第二類屆齡60。
  const firstClass=/^(警員|巡佐|小隊長|偵查佐|隊員|教育班長)$/.test(pos);
  if(firstClass)return {kind:"危勞第一類",voluntary:50,mandatory:59,note:"警員、巡佐、小隊長、偵查佐等第一類危勞職務"};

  const secondTitle=/(巡官|分隊長|偵查員|偵查正|督察員|警備隊長|副所長|所長|副分局長|分局長|大隊長|副大隊長|隊長|副隊長|中隊長|副中隊長)/.test(pos);
  const operationalPolice=/^(station_command|detective|guard|traffic|traffic_office|inspection|command_center)$/.test(type);
  const policeOfficerInOperationalRole=/(警務員|警務正|組長|主任)/.test(pos)&&operationalPolice;
  if(secondTitle||policeOfficerInOperationalRole)return {kind:"危勞第二類",voluntary:55,mandatory:60,note:"巡官以上及表列主管、偵查、警備等第二類危勞職務"};

  return {kind:"一般屆齡",voluntary:60,mandatory:65,note:"未列入危勞降齡範圍之警察內勤／一般職務"};
}
function serviceYearsExact(){
  if(!s||!s.joinDate)return 0;
  const join=parseLocalDateTime(s.joinDate);
  return Math.max(0,(simNow().getTime()-join.getTime())/86400000/365.2425);
}
function canVoluntaryRetire(){
  if(!s||!s.unit||s.retired)return false;
  const p=retirementProfile();
  return s.age>=p.voluntary||serviceYearsExact()>=25;
}
function checkMandatoryRetirement(){
  if(!s||s.retired||!s.unit)return false;
  const p=retirementProfile();
  if(s.age<p.mandatory)return false;
  s.retired=true;
  s.retirementAge=s.age;
  s.retirementDate=rocDateTime();
  s.retirementReason=p.kind+"屆齡退休";
  s.retirementClass=p.kind;s.retirementVoluntaryAge=p.voluntary;s.retirementMandatoryAge=p.mandatory;
  s.lastActivePosition=s.position||s.rank||"";
  s.lastActiveUnit=s.unitName||"";
  s.position="退休警察人員";
  s.rank="退休警察人員";
  s.salary=0;
  s.rotationEligible=false;
  s.rotationOffers=[];
  rec("屆齡退休",p.kind+"｜"+s.retirementAge+"歲｜原職："+s.lastActivePosition+"｜"+s.lastActiveUnit);
  return true;
}
function voluntaryRetire(){
  if(s.retired)return;
  if(!s.unit)return toast("尚未正式任職");
  const p=retirementProfile();
  if(!canVoluntaryRetire())return toast("目前尚未符合自願退休條件");
  s.lastActivePosition=s.position||s.rank||"";
  s.lastActiveUnit=s.unitName||"";
  s.retired=true;
  s.retirementAge=s.age;
  s.retirementDate=rocDateTime();
  s.retirementReason=(serviceYearsExact()>=25&&s.age<p.voluntary?"任職滿25年自願退休":p.kind+"自願退休");
  s.retirementClass=p.kind;s.retirementVoluntaryAge=p.voluntary;s.retirementMandatoryAge=p.mandatory;
  s.position="退休警察人員";
  s.rank="退休警察人員";
  s.salary=0;
  s.rotationEligible=false;
  s.rotationOffers=[];
  rec("自願退休",s.retirementReason+"｜"+s.retirementAge+"歲｜原職："+s.lastActivePosition);
  save();render();go("life");
}
const NEW=()=>({created:false,name:"",age:18,initialAge:18,gender:"男",education:"高中畢業",homeCounty:"臺北市",family:"與家人同住",route:"",routeName:"",selectedRoute:"",days:180,law:20,eng:40,fit:50,comm:50,stress:35,health:100,written:null,physical:null,training:false,passed:false,score:0,ranking:null,county:"",localAgency:"",precinct:"",unit:"",unitName:"",assignmentType:"",stationName:"",selectedStation:"",pendingStationPick:false,selectedUnit:"",rank:"考生",qualification:"尚未取得",officialRank:"—",position:"考生",sequence:"—",careerSequenceNo:null,careerStage:"",rotationMonths:0,rotationEligible:false,rotationCycleMonths:0,rotationCycleDays:0,initialOffers:[],rotationOffers:[],dutyMode:"patrol",year:0,xp:0,rep:50,energy:100,dutyCount:0,savings:80000,salary:0,promo:0,cases:[],history:[],simDate:"2026-01-01T08:00:00",simEpoch:null,maxSimEpoch:null,startDate:"2026-01-01T08:00:00",joinDate:"",retired:false,retirementDate:"",retirementReason:"",retirementAge:null,retirementClass:"",retirementVoluntaryAge:null,retirementMandatoryAge:null,lastActivePosition:"",lastActiveUnit:""});
function normalizeState(){
  s=Object.assign(NEW(),s||{});
  if(!C.includes(s.homeCounty))s.homeCounty="臺北市";
  if(s.county&&!C.includes(s.county))s.county="";
  if(s.county&&!s.localAgency)s.localAgency=agencyRecord(s.county)?.[1]||"";
  if(s.county==="臺北市"&&s.precinct&&!P.some(p=>p[0]===s.precinct))s.precinct="";
  if(s.county!=="臺北市"&&s.precinct==="地方分發")s.precinct="";
  if(!Array.isArray(s.history))s.history=[];
  if(!Array.isArray(s.cases))s.cases=[];
  if(!Array.isArray(s.initialOffers))s.initialOffers=[];
  if(!Array.isArray(s.rotationOffers))s.rotationOffers=[];
  if(s.rotationOffers.length){
    const seqNow=isOfficerTrack()?effectiveOfficerSequence():Number(s.careerSequenceNo||9);
    const stale=s.rotationOffers.some(o=>Number(o.seq||99)!==seqNow);
    if(stale){s.rotationOffers=[];s.selectedUnit=""}
  }
  if(!Number.isFinite(Number(s.rotationCycleDays)))s.rotationCycleDays=0;
  if(!Number.isFinite(Number(s.rotationCycleMonths)))s.rotationCycleMonths=0;
  if(!Number.isFinite(Number(s.rotationMonths)))s.rotationMonths=0;
  if(typeof s.retired!=="boolean")s.retired=false;
  if(s.retired){
    s.salary=0;
    s.position="退休警察人員";
    s.rank="退休警察人員";
    s.rotationEligible=false;
  }
  if(isOfficerTrack()){
    const eff=effectiveOfficerSequence();
    if(Number(s.careerSequenceNo)!==eff){
      s.careerSequenceNo=eff;
      s.sequence="第"+["零","一","二","三","四","五","六","七","八","九","十","十一"][eff]+"序列";
      s.rotationOffers=[];
      s.selectedUnit="";
    }
  }
  if(s.stationName&&s.precinct&&!stationList().includes(s.stationName))s.stationName="";
  if(!s.county){
    s.unit="";s.unitName="";s.assignmentType="";s.stationName="";s.selectedStation="";s.pendingStationPick=false;s.selectedUnit="";
  }
  if(s.unit==="station"&&s.precinct){
    if(!s.stationName){
      s.pendingStationPick=true;s.unit="";s.unitName="";s.selectedUnit="station";
    }else{
      s.unitName=stationFullName(s.stationName);
    }
  }
  if(isOfficerTrack()&&s.unit==="precinct_guard"){
    s.unit="";s.unitName="";s.assignmentType="";s.stationName="";
    s.careerStage="officer_initial_offer";s.initialOffers=[];s.selectedUnit="";
  }
  if(isOfficerTrack()&&s.careerStage==="officer_initial_offer"&&effectiveOfficerSequence()<9){
    s.careerStage="officer_rotation";
    s.rotationEligible=true;
    s.initialOffers=[];
    s.rotationOffers=[];
    s.selectedUnit="";
  }
  if(isOfficerTrack()&&s.county&&!s.careerStage&&s.passed){
    s.careerStage=s.unit?"officer_initial":"officer_initial_offer";
  }
  if(!isOfficerTrack()&&s.careerStage&&String(s.careerStage).startsWith("officer_")){
    s.careerStage=s.unit?"basic_active":"basic_initial";
  }
  return s;
}
let s=NEW(),active=null;
const CLOCK_KEY="twPoliceClockMaxV1";
const $=x=>document.getElementById(x),cl=(x)=>Math.max(0,Math.min(100,x)),cash=x=>"NT$ "+Math.round(x).toLocaleString("zh-TW");
function parseLocalDateTime(v){
  if(typeof v==="number"&&Number.isFinite(v))return new Date(v);
  const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6]||0),0);
  return new Date(2026,0,1,8,0,0,0);
}
function localIso(d){
  const p=n=>String(n).padStart(2,"0");
  return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes())+":"+p(d.getSeconds());
}
function parseRocStamp(v){
  const m=String(v||"").match(/(\d{2,3})年(\d{1,2})月(\d{1,2})日(?:\s+(\d{1,2}):(\d{2}))?/);
  if(!m)return NaN;
  return new Date(Number(m[1])+1911,Number(m[2])-1,Number(m[3]),Number(m[4]||0),Number(m[5]||0),0,0).getTime();
}
function migrateClock(){
  let epoch=Number(s.simEpoch);
  if(!Number.isFinite(epoch)||epoch<=0)epoch=parseLocalDateTime(s.simDate).getTime();

  let maxEpoch=Number(s.maxSimEpoch);
  if(!Number.isFinite(maxEpoch)||maxEpoch<=0)maxEpoch=epoch;

  const persistedMax=Number(localStorage.getItem(CLOCK_KEY)||0);

  // Recover from every durable source we have. The calendar is strictly monotonic.
  const historyMax=Math.max(0,...(s.history||[]).map(x=>parseRocStamp(x.time)).filter(Number.isFinite));
  const caseMax=Math.max(0,...(s.cases||[]).map(x=>parseRocStamp(x.date)).filter(Number.isFinite));

  epoch=Math.max(epoch,maxEpoch,historyMax,caseMax,Number.isFinite(persistedMax)?persistedMax:0);

  s.simEpoch=epoch;
  s.maxSimEpoch=epoch;
  s.simDate=localIso(new Date(epoch));
  localStorage.setItem(CLOCK_KEY,String(epoch));
}
function simNow(){migrateClock();return new Date(s.simEpoch)}
function setSim(d){
  const next=d.getTime();
  migrateClock();
  const persistedMax=Number(localStorage.getItem(CLOCK_KEY)||0);
  // Hard rule: no game action, reload, stale save, or browser refresh may move time backward.
  const fixed=Math.max(next,s.simEpoch||0,s.maxSimEpoch||0,Number.isFinite(persistedMax)?persistedMax:0);
  s.simEpoch=fixed;
  s.maxSimEpoch=fixed;
  s.simDate=localIso(new Date(fixed));
  localStorage.setItem(CLOCK_KEY,String(fixed));
}
function advanceHours(h){if(h<0)return;let d=simNow();d.setHours(d.getHours()+h);setSim(d);syncClock()}
function advanceDays(n){if(n<0)return;let d=simNow();d.setDate(d.getDate()+n);setSim(d);syncClock();const retiredNow=checkMandatoryRetirement();if(!s.retired&&!retiredNow&&typeof window.onGameDaysAdvanced==="function")window.onGameDaysAdvanced(n)}
function rocDateTime(){let d=simNow(),y=d.getFullYear()-1911,m=d.getMonth()+1,day=d.getDate(),hh=String(d.getHours()).padStart(2,"0"),mm=String(d.getMinutes()).padStart(2,"0");return y+"年"+m+"月"+day+"日 "+hh+":"+mm}
function syncClock(){
  migrateClock();
  if(!s.startDate)s.startDate="2026-01-01T08:00:00";
  if(s.initialAge==null)s.initialAge=s.age||18;
  const start=parseLocalDateTime(s.startDate);
  let elapsed=Math.max(0,(simNow().getTime()-start.getTime())/86400000);
  s.age=s.initialAge+Math.floor(elapsed/365.2425);
  if(s.joinDate){
    const join=parseLocalDateTime(s.joinDate);
    let jy=Math.max(0,(simNow().getTime()-join.getTime())/86400000/365.2425);
    s.year=1+Math.floor(jy);
  }
}
function shiftName(){let h=simNow().getHours();if(h<8)return"00:00–08:00 夜勤";if(h<12)return"08:00–12:00 日勤";if(h<16)return"12:00–16:00 日勤";if(h<20)return"16:00–20:00 晚勤";return"20:00–24:00 夜勤"}
function rec(a,b){s.history.unshift({title:a,detail:b,time:rocDateTime()});s.history=s.history.slice(0,100)}
function toast(m){let t=document.querySelector(".toast");if(!t){t=document.createElement("div");t.className="toast";document.body.appendChild(t)}t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1600)}
function save(){normalizeState();migrateClock();s.maxSimEpoch=Math.max(s.maxSimEpoch||0,s.simEpoch||0);localStorage.setItem(CLOCK_KEY,String(s.maxSimEpoch));localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(s));toast("已儲存")}
function load(){let x=localStorage.getItem("twPoliceCareerSaveV1");if(!x)return toast("找不到存檔");try{const before=Number(localStorage.getItem(CLOCK_KEY)||0);s=Object.assign(NEW(),JSON.parse(x));normalizeState();migrateClock();if(before>0&&s.simEpoch<before){s.simEpoch=before;s.maxSimEpoch=before;s.simDate=localIso(new Date(before))}render();toast("已讀取存檔（已修復舊狀態）")}catch(e){console.error(e);toast("存檔損壞")}}
function fb(id,m,g){let e=$(id);e.className="feedback "+(g?"good":"bad");e.textContent=m}
function go(p){document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===p));document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.page===p));window.scrollTo({top:0,behavior:"smooth"});render()}
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>go(b.dataset.page));
function next(){if(s.retired)return"life";if(!s.created)return"character";if(!s.route)return"route";if(!s.passed)return s.written===null?"study":"exam";if(!s.county)return"distribution";if(isOfficerTrack()&&(s.careerStage==="officer_initial_offer"||(["officer_initial","officer_rotation"].includes(s.careerStage)&&s.rotationEligible)))return"unit";if(!s.unit)return"unit";return"duty"}
function dashboard(){
$("miniName").textContent=s.created?s.name:"尚未建立角色";$("miniStatus").textContent=s.position||s.rank;$("careerYearChip").textContent="生涯第 "+s.year+" 年";if($("dateChip"))$("dateChip").textContent=rocDateTime();$("rankChip").textContent="職務："+(s.position||s.rank);$("moneyChip").textContent="存款："+cash(s.savings);
$("dashboardSub").textContent=s.created?[s.name,s.routeName||"尚未選路線",s.county?([s.county,s.precinct].filter(Boolean).join("｜")):"尚未分發",s.unitName||""].join("｜"):"建立角色後開始你的警察生涯。";
[["Law",s.law],["Eng",s.eng],["Fit",s.fit],["Comm",s.comm],["Stress",s.stress],["Rep",s.rep]].forEach(v=>{$("dash"+v[0]).textContent=v[1];$("dash"+v[0]+"Bar").style.width=v[1]+"%"});
$("dashName").textContent=s.name||"—";if($("dashAge"))$("dashAge").textContent=s.age+" 歲";$("dashRoute").textContent=s.routeName||"—";$("dashCounty").textContent=[s.county,s.precinct].filter(Boolean).join("｜")||"—";$("dashUnit").textContent=s.unitName||"—";$("dashRank").textContent=s.position||s.rank;if($("dashQualification"))$("dashQualification").textContent=s.qualification||"尚未取得";if($("dashOfficialRank"))$("dashOfficialRank").textContent=s.officialRank||"—";if($("dashSequence"))$("dashSequence").textContent=s.sequence||"—";
let a=s.retired?"已退休":"先建立角色",b=s.retired?((s.retirementReason||"退休")+"｜原職："+(s.lastActivePosition||"—")+"｜退休日："+(s.retirementDate||"—")):"完成基本資料後，選擇警專、警大或特考路線。";
if(!s.retired&&s.created&&!s.route){a="選擇入警路線";b="依學歷與規劃選擇路線。"}else if(s.route&&!s.passed){a="完成考試與受訓";b="備考、筆試、體測與訓練。"}else if(s.passed&&!s.county){a="填寫全國警察機關志願";b="依模擬成績與缺額分發至全臺地方警察機關。"}else if(isOfficerTrack()&&s.careerStage==="officer_initial_offer"){a="選填初任職務";b="分局分發完成後，從本次實際型態的組、隊職缺中選擇3個初任職務之一。"}else if(isOfficerTrack()&&s.careerStage==="officer_initial"&&!s.rotationEligible){a="完成初任歷練";b="目前在 "+(s.unitName||"分局單位")+" 擔任 "+(s.position||"巡官")+"；累積約12個月歷練後開放下一輪缺額。"}else if(isOfficerTrack()&&s.rotationEligible&&["officer_initial","officer_rotation"].includes(s.careerStage)){a="選填下一階段職務";b="依目前資格與缺額，從分局組室、偵查隊、警備隊或派出所副主管等職務中選擇。"}else if(s.county&&!s.unit){a="選擇服務單位";b="依任用路線、分局與可用職缺選擇服務單位。"}else if(s.unit){a="開始勤務與累積職涯";b="處理勤務、累積資績與年資，等待輪調、甄審與陞遷機會。"}
$("goalTitle").textContent=a;$("goalText").textContent=b;renderRankInsignia();$("recentEvents").innerHTML=s.history.length?s.history.slice(0,6).map(h=>'<div class="timeline-item"><b>'+h.title+'</b><span>'+h.detail+'</span></div>').join(""):'<div class="empty-state">還沒有生涯事件。</div>';
}
function character(){if(!$("charHomeCounty").options.length)$("charHomeCounty").innerHTML=C.map(c=>"<option>"+c+"</option>").join("");$("charName").value=s.name||"林子維";$("charAge").value=s.age;$("charGender").value=s.gender;$("charEducation").value=s.education;$("charHomeCounty").value=s.homeCounty;$("charFamily").value=s.family}
$("createCharacterBtn").onclick=()=>{s.created=true;s.name=$("charName").value.trim()||"無名警員";s.age=Math.max(18,Math.min(45,+$("charAge").value||18));s.initialAge=s.age;s.gender=$("charGender").value;s.education=$("charEducation").value;s.homeCounty=$("charHomeCounty").value;s.family=$("charFamily").value;rec("建立角色",s.name+"，"+s.age+"歲，"+s.education+"，居住 "+s.homeCounty);fb("characterMsg","角色建立完成。",1);save();render()}
function routes(){ $("routeCards").innerHTML=R.map(r=>'<div class="choice-card '+((s.selectedRoute===r[0]||s.route===r[0])?"selected":"")+'" data-r="'+r[0]+'"><h3>'+r[1]+" "+r[2]+'</h3><p>'+r[3]+'</p><div class="meta"><span class="tag">難度 '+"★".repeat(r[4])+'</span><span class="tag">準備 '+r[5]+' 天</span><span class="tag">'+r[6]+'</span></div></div>').join("");document.querySelectorAll("[data-r]").forEach(e=>e.onclick=()=>{s.selectedRoute=e.dataset.r;routes()})}
$("confirmRouteBtn").onclick=()=>{if(!s.created)return fb("routeMsg","請先建立角色。",0);let r=R.find(x=>x[0]===s.selectedRoute);if(!r)return fb("routeMsg","請先選擇路線。",0);if(r[0]==="g3"&&!["大學畢業","研究所畢業"].includes(s.education))return fb("routeMsg","本遊戲中三等需大學以上學歷。",0);s.route=r[0];s.routeName=r[2];s.days=r[5];s.written=null;s.physical=null;s.training=false;s.passed=false;s.rank="考生";s.position="考生";s.qualification="尚未取得";s.officialRank="—";s.sequence="—";rec("選擇入警路線",r[2]);fb("routeMsg","已選擇 "+r[2]+"。",1);save();render()}
function study(){ $("studyDaysChip").textContent="距考試 "+s.days+" 天";$("studyLaw").textContent=s.law;$("studyEng").textContent=s.eng;$("studyFit").textContent=s.fit;$("studyStress").textContent=s.stress;let A=[["law","📖 讀法學","法學 +5、壓力 +3"],["eng","🇬🇧 讀英文","英文 +5、壓力 +2"],["fit","🏃 體能訓練","體能 +5、健康 +1"],["mock","📝 刷題模考","法學 +3、英文 +2"],["work","💼 打工","存款 +NT$2,500"],["rest","😴 休息","壓力 -10"]];$("studyActions").innerHTML=A.map(a=>'<div class="action-card" data-a="'+a[0]+'"><strong>'+a[1]+'</strong><p>'+a[2]+'</p></div>').join("");document.querySelectorAll("[data-a]").forEach(e=>e.onclick=()=>train(e.dataset.a));let w=s.law*.6+s.eng*.4,o=w*.65+s.fit*.35-s.stress*.08;$("writtenProgress").style.width=cl(w)+"%";$("fitnessProgress").style.width=s.fit+"%";$("overallProgress").style.width=cl(o)+"%";$("studyAdvice").textContent=!s.route?"先選擇入警路線。":s.law<55?"建議優先讀法學。":s.fit<60?"建議加強體能。":s.stress>70?"壓力偏高，建議休息。":"目前狀態穩定。"}
function train(a){if(!s.route)return toast("請先選入警路線");if(s.days<=0)return toast("已到考試日期");if(a==="law"){s.law=cl(s.law+5);s.stress=cl(s.stress+3);s.savings-=300}if(a==="eng"){s.eng=cl(s.eng+5);s.stress=cl(s.stress+2);s.savings-=200}if(a==="fit"){s.fit=cl(s.fit+5);s.health=cl(s.health+1)}if(a==="mock"){s.law=cl(s.law+3);s.eng=cl(s.eng+2);s.stress=cl(s.stress+4)}if(a==="work"){s.savings+=2500;s.stress=cl(s.stress+3)}if(a==="rest"){s.stress=cl(s.stress-10);s.health=cl(s.health+2)}s.days=Math.max(0,s.days-7);advanceDays(7);save();render()}
function exam(){
  $("examRoute").textContent=s.routeName||"尚未選擇";
  if($("trainingBtn"))$("trainingBtn").textContent=s.route==="tpa"?"完成警專教育＋四等任用流程":s.route==="cpu"?"完成警大教育＋三等任用流程":s.route==="g4"?"完成四等教育／實務訓練":s.route==="g3"?"完成三等教育／實務訓練":"完成受訓";
  $("examWritten").textContent=s.written===null?"—":s.written;
  $("examPhysical").textContent=s.physical===null?"—":s.physical;
  $("examRank").textContent=s.ranking?"第 "+s.ranking+" 名":"—";

  ["stepWritten","stepPhysical","stepTraining","stepResult"].forEach(i=>$(i).className="step");
  if(s.written===null||s.written<55){
    $("stepWritten").classList.add("active");
  }else{
    $("stepWritten").classList.add("done");
    if(s.physical===null||s.physical<55){
      $("stepPhysical").classList.add("active");
    }else{
      $("stepPhysical").classList.add("done");
      if(!s.training){
        $("stepTraining").classList.add("active");
      }else{
        $("stepTraining").classList.add("done");
        $("stepResult").classList.add("done");
      }
    }
  }

  const w=$("writtenExamBtn"),p=$("physicalExamBtn"),tr=$("trainingBtn"),next=$("examNextPageBtn");
  [w,p,tr,next].forEach(b=>{if(b){b.style.display="none";b.classList.remove("primary-btn");b.classList.add("secondary-btn")}});
  let activeBtn=null;
  if(!s.route){ activeBtn=w; }
  else if(s.written===null||s.written<55){ activeBtn=w; }
  else if(s.physical===null||s.physical<55){ activeBtn=p; }
  else if(!s.training){ activeBtn=tr; }
  else { activeBtn=next; }

  if(activeBtn){
    activeBtn.style.display="";
    activeBtn.classList.remove("secondary-btn");
    activeBtn.classList.add("primary-btn");
  }
  if($("examActionHint")){
    $("examActionHint").textContent=
      activeBtn===w?"目前步驟：筆試。通過後會自動切換到「參加體測」。":
      activeBtn===p?"筆試已通過。現在進行體測，通過後會自動切換到受訓。":
      activeBtn===tr?"體測已通過。完成受訓後會切換到分局分發。":
      activeBtn===next?"錄取流程完成，可前往臺北市分局分發。":"";
  }
}
$("writtenExamBtn").onclick=()=>{if(!s.route)return fb("examMsg","請先選擇路線。",0);let r=R.find(x=>x[0]===s.route),z=Math.round(s.law*.55+s.eng*.25+s.comm*.1+s.fit*.1-r[4]*2.8-Math.max(0,(s.stress-50)*.12)+(Math.random()*12-4));s.written=cl(z);advanceHours(3);rec("參加筆試","成績 "+s.written);fb("examMsg",s.written>=55?"筆試通過，成績 "+s.written+"。已自動切換到下一步：體測。":"未達遊戲門檻55分，可回備考重考。",s.written>=55);save();render();setTimeout(()=>{if(s.written>=55&&$("physicalExamBtn"))$("physicalExamBtn").focus()},0)}
$("physicalExamBtn").onclick=()=>{if(s.written===null||s.written<55)return fb("examMsg","需先通過筆試。",0);s.physical=cl(Math.round(s.fit-s.stress*.08+s.health*.06+(Math.random()*10-3)));advanceDays(7);rec("參加體測","成績 "+s.physical);fb("examMsg",s.physical>=55?"體測通過，成績 "+s.physical+"。已自動切換到下一步：受訓。":"未達遊戲門檻55分。",s.physical>=55);save();render();setTimeout(()=>{if(s.physical>=55&&$("trainingBtn"))$("trainingBtn").focus()},0)}
$("trainingBtn").onclick=()=>{if(s.physical===null||s.physical<55)return fb("examMsg","需先通過前階段測驗。",0);let r=R.find(x=>x[0]===s.route);if(!r)return fb("examMsg","找不到任用路線。",0);s.training=true;advanceDays(r[10]);s.score=Math.round(s.written*.68+s.physical*.32);s.ranking=Math.max(1,Math.round(1800-s.score*17+Math.random()*120));s.passed=true;s.qualification=r[6];s.officialRank=r[7];s.position="待分發";s.rank="待分發";s.sequence=r[9];s.careerSequenceNo=r[11];s.comm=cl(s.comm+5);let detail=(s.route==="tpa"?"完成警專教育並通過四等警察人員特考任用流程":s.route==="cpu"?"完成警大教育並通過三等警察人員特考任用流程":s.route==="g4"?"完成四等一般警察特考教育與實務訓練":"完成三等一般警察特考教育與實務訓練");rec("取得任官資格",detail+"｜"+s.qualification);fb("examMsg",detail+"。目前任官資格："+s.qualification+"；已切換到下一步：臺北市分局分發。",1);save();render();setTimeout(()=>{if($("examNextPageBtn"))$("examNextPageBtn").focus()},0)}
if($("examNextPageBtn"))$("examNextPageBtn").onclick=()=>{if(!s.passed)return fb("examMsg","尚未完成錄取流程。",0);go("distribution")};
function cn(id){let row=distributionPost(id);return row?[row.vacancy,row.threshold]:[20,65]}
function dist(){
  [1,2,3].forEach(n=>{
    let e=$("pref"+n),v=e.value;
    e.innerHTML='<option value="">請選擇分發志願</option>'+DISTRIBUTION_POSTS.map(p=>'<option value="'+p.id+'">'+p.label+'</option>').join("");
    if(v&&distributionPost(v))e.value=v;
  });
  $("countyCards").innerHTML=DISTRIBUTION_POSTS.map(p=>'<div class="county-card"><h3>'+p.label+'</h3><p>'+p.desc+'</p><div class="numbers"><span>模擬缺額 '+p.vacancy+'</span><span>模擬門檻 '+p.threshold+'</span></div></div>').join("");
}
$("runDistributionBtn").onclick=()=>{
  if(!s.passed)return fb("distributionResult","尚未完成錄取流程。",0);
  let prefs=[$("pref1").value,$("pref2").value,$("pref3").value].filter(Boolean);
  if(!prefs.length)return fb("distributionResult","至少填一個分發志願。",0);
  let chosenId=prefs.find(id=>s.score>=cn(id)[1])||prefs[prefs.length-1];
  const post=distributionPost(chosenId);
  if(!post)return fb("distributionResult","分發資料錯誤，請重新選擇。",0);
  let r=R.find(x=>x[0]===s.route);
  s.county=post.county;s.localAgency=post.agency;s.precinct=post.precinct||"";s.position=r?r[8]:"警員";s.rank=s.position;s.sequence=r?r[9]:"第十一序列";s.careerSequenceNo=r?r[11]:11;
  if(!s.joinDate)s.joinDate=s.simDate;s.year=1;s.salary=(s.officialRank==="警正四階"?64000:56500);
  if(["cpu","g3"].includes(s.route)){
    s.unit="";s.unitName="";s.assignmentType="";s.position="巡官";s.rank="巡官";s.careerSequenceNo=9;s.sequence="第九序列";s.careerStage="officer_initial_offer";s.rotationMonths=0;s.rotationEligible=false;s.rotationCycleMonths=0;s.rotationCycleDays=0;s.initialOffers=pickOfficerOffers(officerInitialPool(),3);s.rotationOffers=[];
    rec("分發",post.label+"｜待選初任職務");
    fb("distributionResult","分發成功："+post.label+"。下一步會從該機關常見的組、隊或分局職務中抽出3個初任職缺。",1);
  }else{
    s.careerStage="basic_initial";s.unit="";s.unitName="";
    rec("分發",post.label);
    fb("distributionResult","分發成功："+post.label+"。下一步選擇基層服務單位。",1);
  }
  save();render();
}
function rankInsigniaSpec(seq){
  const map={
    11:{label:"一線三星",file:"10"},
    10:{label:"一線四星",file:"09"},
    9:{label:"二線一星",file:"08"},
    8:{label:"二線二星",file:"07"},
    7:{label:"二線二星",file:"07"},
    6:{label:"二線三星",file:"06"},
    5:{label:"二線四星",file:"05"},
    4:{label:"三線一星",file:"04"},
    3:{label:"三線二星",file:"03"},
    2:{label:"三線三星",file:"02"},
    1:{label:"三線三星",file:"02"},
    0:{label:"三線四星",file:"01"}
  };
  return map[Number(seq)]||{label:"未配階",file:""};
}
function rankInsigniaURL(file){
  return file?"https://commons.wikimedia.org/wiki/Special:Redirect/file/TW-Police-Rank_"+file+".svg":"";
}
function rankInsigniaHTML(seq,compact=false){
  const spec=rankInsigniaSpec(seq);
  if(!spec.file)return '<span class="rank-insignia-label">未配階</span>';
  return '<span class="rank-insignia '+(compact?"compact":"")+'" title="'+spec.label+'"><img src="'+rankInsigniaURL(spec.file)+'" alt="'+spec.label+' 階級識別圖"></span><span class="rank-insignia-label">'+spec.label+"</span>";
}
function renderRankInsignia(){
  const seq=(typeof effectiveOfficerSequence==="function"&&isOfficerTrack())?effectiveOfficerSequence():Number(s.careerSequenceNo||11);
  if($("dashInsignia"))$("dashInsignia").innerHTML=rankInsigniaHTML(seq);
  if($("careerInsignia"))$("careerInsignia").innerHTML=rankInsigniaHTML(seq);
  if($("rankInsigniaChip"))$("rankInsigniaChip").innerHTML=rankInsigniaHTML(seq,true);
}
function rocDay(d){
  return (d.getFullYear()-1911)+"年"+(d.getMonth()+1)+"月"+d.getDate()+"日";
}
function rotationForecastText(){
  if(!isOfficerTrack())return "基層警員線以單位甄選、分局調任與職缺為主，不設定固定輪調倒數。";
  if(s.careerStage==="officer_initial_offer")return "初任職缺：現在已開放，可直接選填。";
  if(s.rotationEligible)return "下一輪職缺：現在已開放，可直接選填。";
  if(!s.unit)return "完成初任派職後，系統才會開始計算下一輪職缺時間。";
  const needDays=s.careerStage==="officer_initial"?360:540;
  const elapsed=Math.max(0,Number(s.rotationCycleDays)||0);
  const remain=Math.max(0,needDays-elapsed);
  const d=simNow();
  d.setDate(d.getDate()+remain);
  const months=Math.ceil(remain/30);
  return "預計下一輪職缺："+rocDay(d)+"（約 "+months+" 個月後）｜目前歷練 "+Math.floor(elapsed/30)+"/"+Math.round(needDays/30)+" 個月";
}
function renderRotationForecast(){
  const txt=rotationForecastText();
  if($("rotationForecast"))$("rotationForecast").textContent=txt;
  if($("careerVacancyForecast"))$("careerVacancyForecast").textContent=txt;
}
function renderStationDirectory(){
  if(!$("stationDirectory"))return;
  $("stationDirectory").style.display=stationList().length?"block":"none";
  if(!$("stationDirectoryCards"))return;
  $("stationDirectoryTitle").textContent=(s.precinct||"")+" 派出所／駐在所";
  $("stationDirectoryCards").innerHTML=stationList().map(name=>'<div class="station-directory-item '+(s.stationName===name?"current":"")+'"><b>'+name+'</b><span>'+stationDutyText()+'</span>'+(s.stationName===name?'<em>目前服務單位</em>':'')+'</div>').join("");
}
function officerVacancyCard(o,extraTag=""){
  const seq=Number(o.seq||9);
  const selected=s.selectedUnit===o.id?"selected":"";
  const rank=rankInsigniaHTML(seq,true);
  return '<div class="choice-card officer-vacancy-card '+selected+'" data-o="'+o.id+'">'+
    '<div class="vacancy-card-head"><div><h3>'+o.unitName+'</h3><strong class="vacancy-position">'+o.position+'</strong></div>'+
    '<div class="vacancy-rank">'+rank+'</div></div>'+
    '<p>'+o.desc+'</p>'+
    '<div class="meta"><span class="tag">第'+seq+'序列職務</span>'+(extraTag?'<span class="tag">'+extraTag+'</span>':'')+'<span class="tag">'+rankInsigniaSpec(seq).label+'</span></div>'+
  '</div>';
}
function units(){
  renderStationDirectory();renderPrecinctOrg();renderRotationForecast();
  if(isOfficerTrack()){
    if(s.careerStage==="officer_initial_offer"){
      $("confirmUnitBtn").style.display="";
      $("unitBanner").textContent="已分發至 "+([s.county,s.precinct].filter(Boolean).join("｜"))+"。以下為本次3個模擬初任職缺。";
      const offers=officerInitialOffers();
      $("unitCards").innerHTML=offers.map(o=>officerVacancyCard(o,"初任職缺")).join("");
      document.querySelectorAll("[data-o]").forEach(e=>e.onclick=()=>{s.selectedUnit=e.dataset.o;units()});
      return;
    }
    if(s.careerStage==="officer_initial"&&!s.rotationEligible){
      $("unitBanner").textContent="目前初任："+(s.unitName||"—")+"｜"+(s.position||"巡官")+"。遊戲以12個月作為第一階段歷練期（僅為遊戲節奏設定）。";
      $("unitCards").innerHTML='<div class="choice-card selected officer-vacancy-card"><div class="vacancy-card-head"><div><h3>🏢 '+(s.unitName||"目前單位")+'</h3><strong class="vacancy-position">'+(s.position||"巡官")+'</strong></div><div class="vacancy-rank">'+rankInsigniaHTML(effectiveOfficerSequence(),true)+'</div></div><p>目前任職中｜'+s.sequence+'</p><div class="meta"><span class="tag">歷練 '+(s.rotationMonths||0)+'/12 個月</span><span class="tag">'+rankInsigniaSpec(effectiveOfficerSequence()).label+'</span></div></div>';
      $("confirmUnitBtn").style.display="none";
      return;
    }
    if(s.rotationEligible&&["officer_initial","officer_rotation"].includes(s.careerStage)){
      $("confirmUnitBtn").style.display="";
      const seqNow=effectiveOfficerSequence();
      s.careerSequenceNo=seqNow;
      s.sequence="第"+["零","一","二","三","四","五","六","七","八","九","十","十一"][seqNow]+"序列";
      const badOffers=!Array.isArray(s.rotationOffers)||!s.rotationOffers.length||s.rotationOffers.some(o=>Number(o.seq)!==seqNow);
      if(badOffers){s.rotationOffers=officerRotationOffers();s.selectedUnit="";}
      $("unitBanner").textContent="目前職務："+(s.position||"—")+"｜"+s.sequence+"。本次只顯示同序列／相當層級職缺；已升任警務員時，不會再出現第九序列巡官缺額。";
      $("unitCards").innerHTML=s.rotationOffers.map(o=>officerVacancyCard(o,"輪調職缺")).join("");
      document.querySelectorAll("[data-o]").forEach(e=>e.onclick=()=>{s.selectedUnit=e.dataset.o;units()});
      return;
    }
    $("unitBanner").textContent="目前職務："+(s.unitName||"—")+"｜"+(s.position||"—")+"。後續職務輪調將依缺額與序列開放。";
    $("unitCards").innerHTML='<div class="empty-state">目前沒有新的輪調缺額。</div>';
    $("confirmUnitBtn").style.display="none";
    return;
  }

  $("confirmUnitBtn").style.display="";
  if(s.pendingStationPick){
    $("unitBanner").textContent="請選擇 "+s.precinct+" 轄內實際派出所。";
    const stations=stationList();
    $("unitCards").innerHTML=stations.map(name=>'<div class="choice-card '+(s.selectedStation===name?"selected":"")+'" data-station="'+name+'"><h3>🏢 '+name+'</h3><p>'+stationDutyText()+'</p><div class="meta"><span class="tag">'+s.precinct+'</span><span class="tag">外勤24小時</span></div></div>').join("")+'<div class="choice-card" data-station-back="1"><h3>← 返回單位類型</h3><p>改選警備隊、交通分隊、偵查隊或分局組室。</p></div>';
    document.querySelectorAll("[data-station]").forEach(e=>e.onclick=()=>{s.selectedStation=e.dataset.station;units()});
    const back=document.querySelector("[data-station-back]");if(back)back.onclick=()=>{s.pendingStationPick=false;s.selectedStation="";units()};
    if($("stationDirectory"))$("stationDirectory").style.display="none";
    return;
  }
  $("unitBanner").textContent=s.county?"目前分發："+[s.county,s.precinct].filter(Boolean).join("｜")+"。":"尚未完成分發。";
  $("unitCards").innerHTML=U.map(u=>{
    let l=s.year<u[3]||s.xp<u[4];
    let label=(u[0]==="traffic"
      ?localAgencyName()+"交通警察單位"
      :localPrefix()+u[2]);
    return '<div class="choice-card '+((s.selectedUnit===u[0]||s.unit===u[0])?"selected":"")+'" data-u="'+u[0]+'"><h3>'+u[1]+" "+label+'</h3><p>'+u[5]+'</p><div class="meta"><span class="tag">遊戲年資 '+u[3]+' 年</span><span class="tag">XP '+u[4]+'</span><span class="tag">'+(l?"🔒 尚未解鎖":"可申請")+'</span></div></div>';
  }).join("");
  document.querySelectorAll("[data-u]").forEach(e=>e.onclick=()=>{s.selectedUnit=e.dataset.u;units()});
}

$("confirmUnitBtn").onclick=()=>{
  if(!s.county)return fb("unitMsg","請先完成分發。",0);

  if(isOfficerTrack()&&s.careerStage==="officer_initial_offer"){
    const o=(s.initialOffers||[]).find(x=>x.id===s.selectedUnit);
    if(!o)return fb("unitMsg","請先選擇一個初任職缺。",0);
    s.unit=o.unit;
    s.unitName=o.unitName;
    s.assignmentType=o.assignmentType||o.unit;
    s.stationName=o.stationName||"";
    s.position=o.position;
    s.rank=o.position;
    s.careerSequenceNo=o.seq;
    s.sequence="第九序列";
    s.careerStage="officer_initial";
    s.rotationEligible=false;
    s.rotationMonths=0;
    s.rotationCycleMonths=0;
    s.rotationCycleDays=0;
    s.rotationOffers=[];
    s.selectedUnit="";
    rec("初任派職",o.unitName+"｜"+o.position);
    fb("unitMsg","初任派職完成："+o.unitName+"｜"+o.position+"。",1);
    save();render();return;
  }

  if(isOfficerTrack()&&s.rotationEligible&&["officer_initial","officer_rotation"].includes(s.careerStage)){
    const seqNow=effectiveOfficerSequence();
    const o=(s.rotationOffers||[]).find(x=>x.id===s.selectedUnit);
    if(!o)return fb("unitMsg","請先選擇一個本次職缺。",0);
    if(Number(o.seq)!==seqNow){
      s.rotationOffers=officerRotationOffers();s.selectedUnit="";save();render();
      return fb("unitMsg","偵測到舊版不相符職缺，已依目前 "+s.position+"／第"+seqNow+"序列重新產生。",0);
    }
    s.unit=o.unit;
    s.unitName=o.unitName;
    s.assignmentType=o.assignmentType||o.unit;
    s.stationName=o.stationName||"";
    s.position=o.position;
    s.rank=o.position;
    s.careerSequenceNo=o.seq;
    s.sequence="第"+["零","一","二","三","四","五","六","七","八","九","十","十一"][o.seq]+"序列";
    s.careerStage="officer_rotation";
    s.rotationEligible=false;
    s.rotationMonths=0;
    s.rotationCycleMonths=0;
    s.rotationCycleDays=0;
    s.rotationOffers=[];
    s.selectedUnit="";
    rec("職務輪調",o.unitName+"｜"+o.position);
    fb("unitMsg","已派任："+o.unitName+"｜"+o.position+"。",1);
    save();render();return;
  }

  let u=U.find(x=>x[0]===s.selectedUnit);
  if(!u&&!s.pendingStationPick)return fb("unitMsg","請先選擇單位。",0);
  if(s.pendingStationPick){
    if(!s.selectedStation)return fb("unitMsg","請先選擇一間派出所。",0);
    s.unit="station";s.assignmentType="station";s.stationName=s.selectedStation;s.unitName=stationFullName(s.selectedStation);s.position="警員";s.rank="警員";s.pendingStationPick=false;s.selectedUnit="station";
    rec("派出所報到","臺北市｜"+s.precinct+"｜"+s.stationName);
    fb("unitMsg","已報到："+s.unitName+"。",1);save();render();return;
  }
  if(s.year<u[3]||s.xp<u[4])return fb("unitMsg","條件不足：需年資 "+u[3]+" 年、XP "+u[4]+"。",0);
  if(u[0]==="station"){
    if(stationList().length){s.pendingStationPick=true;s.selectedStation="";units();return}
    s.unit="station";s.assignmentType="station";s.stationName="轄內派出所";s.unitName=localAgencyName()+"轄內派出所";s.position="警員";s.rank="警員";
    rec("派出所報到",s.county+"｜"+s.unitName);fb("unitMsg","已報到："+s.unitName+"。目前非臺北地區先採警察局層級／概略派出所資料。",1);save();render();return;
  }
  s.unit=u[0];
  s.unitName=(u[0]==="traffic"?localAgencyName()+"交通警察單位":localPrefix()+u[2]);
  s.assignmentType=u[0];s.stationName="";
  rec("單位報到",[s.county,s.precinct,u[2]].filter(Boolean).join("｜"));
  fb("unitMsg","已報到："+s.unitName+"。",1);
  save();render();
}
function duty(){
  if($("shiftChip"))$("shiftChip").textContent=shiftName()+"｜"+rocDateTime();
  if($("energyChip"))$("energyChip").textContent="體力 "+s.energy;
  if($("dutyCount"))$("dutyCount").textContent=s.dutyCount+" 件";
  if($("dutyXp"))$("dutyXp").textContent=s.xp+" XP";
  if($("dutyRep"))$("dutyRep").textContent=s.rep;
  if($("dutyEnergy"))$("dutyEnergy").textContent=s.energy;

  if(s.retired){
    if($("dutySubtitle"))$("dutySubtitle").textContent="已退休｜"+(s.retirementReason||"退休")+"｜原職："+(s.lastActivePosition||"—");
    if($("nextDutyBtn"))$("nextDutyBtn").disabled=true;
    if($("dutyCase"))$("dutyCase").innerHTML="<b>生涯勤務已結束</b><br>退休後不再接受勤務派案。";
    if($("dutyChoices"))$("dutyChoices").innerHTML="";
    return;
  }

  if($("nextDutyBtn"))$("nextDutyBtn").disabled=false;
  if($("dutySubtitle"))$("dutySubtitle").textContent=s.unit?[s.name,s.county||"",s.precinct||"",s.unitName,s.position||s.rank,s.officialRank||"—"].filter(Boolean).join("｜"):"完成分發後即可上勤。";
}
function cases(){ $("caseList").innerHTML=s.cases.length?s.cases.map(c=>'<div class="case-item"><h3>#'+c.id+"｜"+c.type+'</h3><div class="case-meta">'+c.date+"｜"+c.xp+' XP</div><p><b>處置：</b>'+c.action+'<br><b>結果：</b>'+c.result+"</p></div>").join(""):'<div class="empty-state">目前沒有案件卷宗。</div>'}
function career(){document.querySelectorAll(".career-node").forEach((n,i)=>n.classList.toggle("current",i===s.promo))}
$("specialUnitBtn").onclick=()=>{
  if(s.retired)return fb("careerMsg","已退休，不能再參加職務甄選。",0);
  if(!s.unit)return fb("careerMsg","尚未正式任職。",0);
  if(isOfficerTrack()){
    if(s.rotationEligible){go("unit");return}
    return fb("careerMsg","警官線的專業職務以輪調缺額方式開放；目前尚未產生新的輪調缺額。",0);
  }
  if(s.year<2||s.xp<180)return fb("careerMsg","遊戲化甄選門檻：需一定年資與勤務資績；目前尚未達標。",0);
  rec("取得專業職務申請資格","可到職務輪調頁查看偵查隊、交通分隊或分局組室等可用單位");
  fb("careerMsg","已取得本次專業職務申請資格，請到「職務輪調」查看可用單位。",1);
  go("unit");
}
$("transferBtn").onclick=()=>{
  if(s.retired)return fb("careerMsg","已退休，不能再申請調任。",0);
  if(s.year<3)return fb("careerMsg","跨機關調任至少需一定年資；本遊戲以3年作為模擬門檻。",0);
  const currentKey=s.county==="臺北市"&&s.precinct?("taipei:"+s.precinct):("local:"+s.county);
  const choices=DISTRIBUTION_POSTS.filter(p=>p.id!==currentKey);
  const post=choices[Math.floor(Math.random()*choices.length)];
  const ok=Math.random()<.42+s.rep/260;
  if(!ok){fb("careerMsg","本次跨機關調任申請未獲核定。",0);save();render();return}

  const oldLabel=[s.county,s.precinct].filter(Boolean).join("｜");
  const oldPosition=s.position,oldOfficialRank=s.officialRank,oldSeq=isOfficerTrack()?effectiveOfficerSequence():Number(s.careerSequenceNo||11);
  s.county=post.county;s.localAgency=post.agency;s.precinct=post.precinct||"";s.stationName="";s.selectedStation="";s.selectedUnit="";s.initialOffers=[];s.rotationOffers=[];

  if(isOfficerTrack()){
    s.careerSequenceNo=oldSeq;s.sequence=oldSeq===0?"最高職務層級":"第"+["零","一","二","三","四","五","六","七","八","九","十","十一"][oldSeq]+"序列";
    s.officialRank=oldOfficialRank;s.position=oldPosition;s.rank=oldPosition;s.unit="";s.unitName="";s.assignmentType="";s.careerStage="officer_rotation";s.rotationEligible=true;s.rotationCycleDays=0;s.rotationCycleMonths=0;s.rotationMonths=0;s.rotationOffers=officerRotationOffers();
    rec("全國警察機關調任",oldLabel+" → "+post.label+"｜保留 "+s.sequence+"／"+oldPosition+" 層級");
    fb("careerMsg","調任核定："+post.label+"。官階與職務序列不變，請選擇相當職務。",1);save();render();go("unit");return;
  }
  s.unit="";s.unitName="";s.assignmentType="";rec("全國警察機關調任",oldLabel+" → "+post.label);fb("careerMsg","調任成功："+post.label+"。",1);save();render();go("unit");
}
function life(){ $("salaryStat").textContent=cash(s.salary);$("savingsStat").textContent=cash(s.savings);$("lifeStress").textContent=s.stress;$("healthStat").textContent=s.health;let A=s.retired?[["rent","🏠 支付生活費","退休後生活支出"],["rest","🛌 休息","壓力 -15、體力 +25"],["exercise","🏋️ 運動","健康 +3、體能 +2"],["social","👥 社交活動","溝通 +2、聲望 +1"]]:[["salary","💵 領取月薪","加入本月薪資"],["rent","🏠 支付生活費","扣除生活成本"],["rest","🛌 完整休假","壓力 -15、體力 +25"],["exercise","🏋️ 運動","健康 +3、體能 +2"],["study","📘 在職進修","法學 +2、英文 +2"],["social","👥 同事聚餐","溝通 +2、聲望 +1"]];$("lifeActions").innerHTML=A.map(a=>'<div class="action-card" data-l="'+a[0]+'"><strong>'+a[1]+'</strong><p>'+a[2]+'</p></div>').join("");document.querySelectorAll("[data-l]").forEach(e=>e.onclick=()=>live(e.dataset.l))}
function live(a){if(a==="salary"){if(!s.salary)return toast("尚未任職");s.savings+=s.salary;advanceDays(30);rec("領取薪資",cash(s.salary))}if(a==="rent"){s.savings-=s.family==="與家人同住"?9000:s.family==="自行租屋"?18000:14000;advanceDays(30)}if(a==="rest"){s.stress=cl(s.stress-15);s.energy=cl(s.energy+25);advanceDays(1)}if(a==="exercise"){s.health=cl(s.health+3);s.fit=cl(s.fit+2);s.stress=cl(s.stress-4);advanceDays(1)}if(a==="study"){s.savings-=1500;s.law=cl(s.law+2);s.eng=cl(s.eng+2);advanceDays(7)}if(a==="social"){s.savings-=800;s.comm=cl(s.comm+2);s.rep=cl(s.rep+1);advanceDays(1)}save();render()}
function records(){ $("historyList").innerHTML=s.history.length?s.history.map(h=>'<div class="timeline-item"><b>'+h.title+'</b><span>'+h.detail+"｜"+h.time+"</span></div>").join(""):'<div class="empty-state">尚無生涯紀錄。</div>'}
function render(){normalizeState();syncClock();checkMandatoryRetirement();dashboard();character();routes();study();exam();dist();units();duty();cases();career();life();records();renderPrecinctOrg();renderStationDirectory();renderRankInsignia();renderRetirement()}
$("continueBtn").onclick=()=>go(next());["saveBtn","manualSaveBtn"].forEach(id=>$(id).onclick=save);["loadBtn","manualLoadBtn"].forEach(id=>$(id).onclick=load);
$("resetBtn").onclick=()=>{if(confirm("確定清除目前生涯存檔並重新開始？")){localStorage.removeItem("twPoliceCareerSaveV1");localStorage.removeItem(CLOCK_KEY);s=NEW();migrateClock();render();go("dashboard");toast("已重新開始")}};
window.addEventListener("beforeunload",()=>{migrateClock();localStorage.setItem(CLOCK_KEY,String(s.maxSimEpoch||s.simEpoch||0));localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(s))});
let raw=localStorage.getItem("twPoliceCareerSaveV1");if(raw){try{s=Object.assign(NEW(),JSON.parse(raw))}catch(e){console.error(e)}}
normalizeState();
render();

const retireBtn=$("voluntaryRetireBtn");if(retireBtn)retireBtn.onclick=voluntaryRetire;
function runSelfCheck(){
  normalizeState();
  const issues=[];
  if(s.county&&!C.includes(s.county))issues.push("地方警察機關資料無效");
  if(s.county==="臺北市"&&s.precinct&&!P.some(p=>p[0]===s.precinct))issues.push("臺北市分局資料無效");
  if(s.stationName&&!stationList().includes(s.stationName))issues.push("派出所不屬於目前分局");
  if(s.unit==="station"&&!s.stationName)issues.push("派出所勤務缺少實際派出所");if(s.stationName&&!stationList().includes(s.stationName))issues.push("目前派出所與分局不一致");
  if(isOfficerTrack()&&s.careerStage==="officer_initial_offer"&&s.unit)issues.push("警官初任待選階段卻已有單位");if(isOfficerTrack()&&s.rotationOffers?.some(o=>Number(o.seq)!==effectiveOfficerSequence()))issues.push("輪調職缺序列與目前職務不一致");if(isOfficerTrack()&&/警務正/.test(String(s.position))&&effectiveOfficerSequence()>6)issues.push("警務正不應被降回第七至第九序列");
  if((s.simEpoch||0)<(Number(localStorage.getItem(CLOCK_KEY)||0)))issues.push("遊戲時間落後歷史最晚時間");if(!s.retired&&s.unit&&s.age>=retirementProfile().mandatory)issues.push("已達屆齡退休年齡但尚未退休");
  const result=issues.length?"發現 "+issues.length+" 項問題："+issues.join("；"):"自我檢查通過：臺北市範圍、分局／派出所、職務狀態與時間資料目前一致。";
  if($("selfCheckResult")){$("selfCheckResult").textContent=result;$("selfCheckResult").className="info-banner "+(issues.length?"bad":"good")}
  if(!issues.length)save();
  return issues;
}
const sc=$("selfCheckBtn");if(sc)sc.onclick=runSelfCheck;

function applyTheme(name){
  const allowed=["warroom","police","game"];
  const theme=allowed.includes(name)?name:"warroom";
  document.documentElement.dataset.theme=theme;
  localStorage.setItem("twPoliceTheme",theme);
  const sel=document.getElementById("themeSelect");
  if(sel&&sel.value!==theme)sel.value=theme;
}
const themeSel=document.getElementById("themeSelect");
if(themeSel){
  themeSel.value=localStorage.getItem("twPoliceTheme")||"warroom";
  themeSel.onchange=()=>applyTheme(themeSel.value);
}
applyTheme(localStorage.getItem("twPoliceTheme")||"warroom");

const advDay=document.getElementById("advanceDayBtn");
if(advDay){
  advDay.textContent="⏩ 推進30天";
  advDay.onclick=()=>{
    advanceDays(30);
    s.energy=cl(Math.min(100,s.energy+15));
    s.stress=cl(Math.max(0,s.stress-5));
    rec("時間推進","跳過約一個月，日期前進至 "+rocDateTime());
    save();
    render();
  };
}
