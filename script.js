const C=["臺北市","新北市","桃園市","臺中市","臺南市","高雄市","基隆市","新竹市","新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義市","嘉義縣","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
const R=[
["tpa","👮","警專路線","高中畢業後報考，通過招生、體測與教育訓練。",2,180],
["cpu","🎓","警大路線","幹部與專業警察養成，學科要求較高。",4,240],
["g4","📝","一般警察特考四等","一般民眾依資格報考，錄取後受訓與分發。",3,210],
["g3","📚","一般警察特考三等","較高等別考試，本遊戲需大學以上學歷。",5,270],
["pe","🏫","警察人員特考","警察教育背景與任用制度的模擬路線。",4,200],
["sp","🎯","特考班／專業班模擬","遊戲化特殊養成與甄選路線。",4,220]];
const U=[
["station","🏢","派出所",0,0,"值班、巡邏、110、家暴、失蹤、詐騙與一般治安案件。"],
["traffic","🏍️","交通分隊",1,80,"交通事故、酒駕、疏導與違規勤務。"],
["detective","🔎","偵查隊",2,180,"刑案偵查、筆錄、監視器與案件追查。"],
["security","🛡️","保安警察",1,120,"大型活動、重要設施與支援勤務。"],
["cyber","💻","科技偵查",2,220,"網路犯罪、數位跡證與詐欺資料分析。"],
["admin","🗂️","內勤行政",1,100,"勤務規劃、行政業務與資料彙整。"],
["highway","🚓","國道公路警察",3,260,"高速公路交通執法與重大道路事件。"],
["rail","🚆","鐵路警察",2,200,"車站、列車與鐵路設施治安勤務。"],
["airport","✈️","航空警察",3,280,"機場安全、旅客秩序與航空治安勤務。"]];
const D=[
["110 民眾糾紛","超商兩名男子爭吵，其中一人疑似酒後情緒激動。",[["確認安全、分隔雙方並詢問店員",16,4,-8],["只要求雙方離開",6,-2,-4],["查詢紀錄並呼叫支援共同到場",13,3,-7]]],
["交通事故","路口兩車碰撞，一名駕駛頸部不適，車流快速回堵。",[["先確認傷者、通知救護並疏導交通",18,5,-10],["先爭論肇責再決定救護",5,-4,-6],["只拍照後請雙方自行協調",3,-5,-3]]],
["疑似酒駕","巡邏發現前車行車不穩，多次偏離車道。",[["保持安全距離、通報車號並安全攔查",17,4,-9],["高速超車強行攔停",5,-4,-12],["持續觀察並請支援注意前方",14,3,-7]]],
["疑似詐騙車手","銀行通報男子持多張提款卡連續提領大量現金。",[["查證身分、提款紀錄與監視器",20,6,-10],["未查證前直接上銬",4,-6,-8],["先觀察動線再上前查證",17,5,-8]]],
["失蹤人口","家長報案：13歲孩子放學後未返家，手機無法聯繫。",[["立即整理資訊並啟動協尋",19,6,-8],["請家長再等到深夜",1,-8,-1],["只請家長自行找",1,-10,-1]]],
["家暴案件","住宅區傳出激烈爭吵與摔物聲，屋內可能有孩童。",[["確認安全、分隔當事人並完整紀錄",19,6,-11],["只勸雙方不要吵就離開",4,-6,-4],["先請支援再依現場狀況處理",16,4,-9]]]];
const NEW=()=>({created:false,name:"",age:18,initialAge:18,gender:"男",education:"高中畢業",homeCounty:"新北市",family:"與家人同住",route:"",routeName:"",selectedRoute:"",days:180,law:20,eng:40,fit:50,comm:50,stress:35,health:100,written:null,physical:null,training:false,passed:false,score:0,ranking:null,county:"",unit:"",unitName:"",selectedUnit:"",rank:"考生",year:0,xp:0,rep:50,energy:100,dutyCount:0,savings:80000,salary:0,promo:0,cases:[],history:[],simDate:"2026-01-01T08:00:00",simEpoch:null,maxSimEpoch:null,startDate:"2026-01-01T08:00:00",joinDate:""});
let s=NEW(),active=null;
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
function migrateClock(){
  let epoch=Number(s.simEpoch);
  if(!Number.isFinite(epoch)||epoch<=0)epoch=parseLocalDateTime(s.simDate).getTime();
  let maxEpoch=Number(s.maxSimEpoch);
  if(!Number.isFinite(maxEpoch)||maxEpoch<=0)maxEpoch=epoch;
  epoch=Math.max(epoch,maxEpoch);
  s.simEpoch=epoch;
  s.maxSimEpoch=epoch;
  s.simDate=localIso(new Date(epoch));
}
function simNow(){migrateClock();return new Date(s.simEpoch)}
function setSim(d){
  const next=d.getTime();
  migrateClock();
  // Time is monotonic: normal game actions can never move the calendar backward.
  const fixed=Math.max(next,s.simEpoch,s.maxSimEpoch||0);
  s.simEpoch=fixed;s.maxSimEpoch=fixed;s.simDate=localIso(new Date(fixed));
}
function advanceHours(h){if(h<0)return;let d=simNow();d.setHours(d.getHours()+h);setSim(d);syncClock()}
function advanceDays(n){if(n<0)return;let d=simNow();d.setDate(d.getDate()+n);setSim(d);syncClock()}
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
function save(){migrateClock();s.maxSimEpoch=Math.max(s.maxSimEpoch||0,s.simEpoch||0);localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(s));toast("已儲存")}
function load(){let x=localStorage.getItem("twPoliceCareerSaveV1");if(!x)return toast("找不到存檔");try{s=Object.assign(NEW(),JSON.parse(x));migrateClock();render();toast("已讀取存檔")}catch(e){toast("存檔損壞")}}
function fb(id,m,g){let e=$(id);e.className="feedback "+(g?"good":"bad");e.textContent=m}
function go(p){document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===p));document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.page===p));window.scrollTo({top:0,behavior:"smooth"});render()}
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>go(b.dataset.page));
function next(){if(!s.created)return"character";if(!s.route)return"route";if(!s.passed)return s.written===null?"study":"exam";if(!s.county)return"distribution";if(!s.unit)return"unit";return"duty"}
function dashboard(){
$("miniName").textContent=s.created?s.name:"尚未建立角色";$("miniStatus").textContent=s.rank;$("careerYearChip").textContent="生涯第 "+s.year+" 年";if($("dateChip"))$("dateChip").textContent=rocDateTime();$("rankChip").textContent="身分："+s.rank;$("moneyChip").textContent="存款："+cash(s.savings);
$("dashboardSub").textContent=s.created?[s.name,s.routeName||"尚未選路線",s.county||"尚未分發",s.unitName||""].join("｜"):"建立角色後開始你的警察生涯。";
[["Law",s.law],["Eng",s.eng],["Fit",s.fit],["Comm",s.comm],["Stress",s.stress],["Rep",s.rep]].forEach(v=>{$("dash"+v[0]).textContent=v[1];$("dash"+v[0]+"Bar").style.width=v[1]+"%"});
$("dashName").textContent=s.name||"—";$("dashRoute").textContent=s.routeName||"—";$("dashCounty").textContent=s.county||"—";$("dashUnit").textContent=s.unitName||"—";$("dashRank").textContent=s.rank;
let a="先建立角色",b="完成基本資料後，選擇警專、警大或特考路線。";
if(s.created&&!s.route){a="選擇入警路線";b="依學歷與規劃選擇路線。"}else if(s.route&&!s.passed){a="完成考試與受訓";b="備考、筆試、體測與訓練。"}else if(s.passed&&!s.county){a="填寫縣市志願";b="依模擬成績與缺額完成分發。"}else if(s.county&&!s.unit){a="選擇服務單位";b="派出所可立即報到，專業單位需年資與XP。"}else if(s.unit){a="開始勤務與累積職涯";b="處理勤務、累積XP與聲望，解鎖調任與升遷。"}
$("goalTitle").textContent=a;$("goalText").textContent=b;$("recentEvents").innerHTML=s.history.length?s.history.slice(0,6).map(h=>'<div class="timeline-item"><b>'+h.title+'</b><span>'+h.detail+'</span></div>').join(""):'<div class="empty-state">還沒有生涯事件。</div>';
}
function character(){if(!$("charHomeCounty").options.length)$("charHomeCounty").innerHTML=C.map(c=>"<option>"+c+"</option>").join("");$("charName").value=s.name||"林子維";$("charAge").value=s.age;$("charGender").value=s.gender;$("charEducation").value=s.education;$("charHomeCounty").value=s.homeCounty;$("charFamily").value=s.family}
$("createCharacterBtn").onclick=()=>{s.created=true;s.name=$("charName").value.trim()||"無名警員";s.age=Math.max(18,Math.min(45,+$("charAge").value||18));s.initialAge=s.age;s.gender=$("charGender").value;s.education=$("charEducation").value;s.homeCounty=$("charHomeCounty").value;s.family=$("charFamily").value;rec("建立角色",s.name+"，"+s.age+"歲，"+s.education+"，居住 "+s.homeCounty);fb("characterMsg","角色建立完成。",1);save();render()}
function routes(){ $("routeCards").innerHTML=R.map(r=>'<div class="choice-card '+((s.selectedRoute===r[0]||s.route===r[0])?"selected":"")+'" data-r="'+r[0]+'"><h3>'+r[1]+" "+r[2]+'</h3><p>'+r[3]+'</p><div class="meta"><span class="tag">難度 '+"★".repeat(r[4])+'</span><span class="tag">準備 '+r[5]+' 天</span></div></div>').join("");document.querySelectorAll("[data-r]").forEach(e=>e.onclick=()=>{s.selectedRoute=e.dataset.r;routes()})}
$("confirmRouteBtn").onclick=()=>{if(!s.created)return fb("routeMsg","請先建立角色。",0);let r=R.find(x=>x[0]===s.selectedRoute);if(!r)return fb("routeMsg","請先選擇路線。",0);if(r[0]==="g3"&&!["大學畢業","研究所畢業"].includes(s.education))return fb("routeMsg","本遊戲中三等需大學以上學歷。",0);s.route=r[0];s.routeName=r[2];s.days=r[5];s.written=null;s.physical=null;s.training=false;s.passed=false;s.rank="考生";rec("選擇入警路線",r[2]);fb("routeMsg","已選擇 "+r[2]+"。",1);save();render()}
function study(){ $("studyDaysChip").textContent="距考試 "+s.days+" 天";$("studyLaw").textContent=s.law;$("studyEng").textContent=s.eng;$("studyFit").textContent=s.fit;$("studyStress").textContent=s.stress;let A=[["law","📖 讀法學","法學 +5、壓力 +3"],["eng","🇬🇧 讀英文","英文 +5、壓力 +2"],["fit","🏃 體能訓練","體能 +5、健康 +1"],["mock","📝 刷題模考","法學 +3、英文 +2"],["work","💼 打工","存款 +NT$2,500"],["rest","😴 休息","壓力 -10"]];$("studyActions").innerHTML=A.map(a=>'<div class="action-card" data-a="'+a[0]+'"><strong>'+a[1]+'</strong><p>'+a[2]+'</p></div>').join("");document.querySelectorAll("[data-a]").forEach(e=>e.onclick=()=>train(e.dataset.a));let w=s.law*.6+s.eng*.4,o=w*.65+s.fit*.35-s.stress*.08;$("writtenProgress").style.width=cl(w)+"%";$("fitnessProgress").style.width=s.fit+"%";$("overallProgress").style.width=cl(o)+"%";$("studyAdvice").textContent=!s.route?"先選擇入警路線。":s.law<55?"建議優先讀法學。":s.fit<60?"建議加強體能。":s.stress>70?"壓力偏高，建議休息。":"目前狀態穩定。"}
function train(a){if(!s.route)return toast("請先選入警路線");if(s.days<=0)return toast("已到考試日期");if(a==="law"){s.law=cl(s.law+5);s.stress=cl(s.stress+3);s.savings-=300}if(a==="eng"){s.eng=cl(s.eng+5);s.stress=cl(s.stress+2);s.savings-=200}if(a==="fit"){s.fit=cl(s.fit+5);s.health=cl(s.health+1)}if(a==="mock"){s.law=cl(s.law+3);s.eng=cl(s.eng+2);s.stress=cl(s.stress+4)}if(a==="work"){s.savings+=2500;s.stress=cl(s.stress+3)}if(a==="rest"){s.stress=cl(s.stress-10);s.health=cl(s.health+2)}s.days=Math.max(0,s.days-7);advanceDays(7);save();render()}
function exam(){ $("examRoute").textContent=s.routeName||"尚未選擇";$("examWritten").textContent=s.written===null?"—":s.written;$("examPhysical").textContent=s.physical===null?"—":s.physical;$("examRank").textContent=s.ranking?"第 "+s.ranking+" 名":"—";["stepWritten","stepPhysical","stepTraining","stepResult"].forEach(i=>$(i).className="step");if(s.written===null)$("stepWritten").classList.add("active");else{$("stepWritten").classList.add("done");if(s.physical===null)$("stepPhysical").classList.add("active");else{$("stepPhysical").classList.add("done");if(!s.training)$("stepTraining").classList.add("active");else{$("stepTraining").classList.add("done");$("stepResult").classList.add("done")}}}}
$("writtenExamBtn").onclick=()=>{if(!s.route)return fb("examMsg","請先選擇路線。",0);let r=R.find(x=>x[0]===s.route),z=Math.round(s.law*.55+s.eng*.25+s.comm*.1+s.fit*.1-r[4]*2.8-Math.max(0,(s.stress-50)*.12)+(Math.random()*12-4));s.written=cl(z);advanceHours(3);rec("參加筆試","成績 "+s.written);fb("examMsg",s.written>=55?"筆試通過，成績 "+s.written+"。":"未達遊戲門檻55分，可回備考重考。",s.written>=55);save();render()}
$("physicalExamBtn").onclick=()=>{if(s.written===null||s.written<55)return fb("examMsg","需先通過筆試。",0);s.physical=cl(Math.round(s.fit-s.stress*.08+s.health*.06+(Math.random()*10-3)));advanceDays(7);rec("參加體測","成績 "+s.physical);fb("examMsg",s.physical>=55?"體測通過，成績 "+s.physical+"。":"未達遊戲門檻55分。",s.physical>=55);save();render()}
$("trainingBtn").onclick=()=>{if(s.physical===null||s.physical<55)return fb("examMsg","需先通過體測。",0);s.training=true;advanceDays(s.route==="cpu"?365*4:s.route==="tpa"?365*2:180);s.score=Math.round(s.written*.68+s.physical*.32);s.ranking=Math.max(1,Math.round(1800-s.score*17+Math.random()*120));s.passed=true;s.rank="準警員";s.comm=cl(s.comm+5);rec("完成受訓與錄取","總成績 "+s.score+"，排名第 "+s.ranking+" 名");fb("examMsg","完成受訓！總成績 "+s.score+"，排名第 "+s.ranking+" 名。",1);save();render()}
function cn(c){let i=C.indexOf(c);return[8+((i*13+23)%88),55+((i*7+5)%31)]}
function dist(){[1,2,3].forEach(n=>{let e=$("pref"+n),v=e.value;if(!e.options.length)e.innerHTML='<option value="">請選擇</option>'+C.map(c=>"<option>"+c+"</option>").join("");if(v)e.value=v});$("countyCards").innerHTML=C.map(c=>{let n=cn(c);return '<div class="county-card"><h3>'+c+'</h3><p>遊戲化勤務設定</p><div class="numbers"><span>缺額 '+n[0]+'</span><span>門檻 '+n[1]+'</span></div></div>'}).join("")}
$("runDistributionBtn").onclick=()=>{if(!s.passed)return fb("distributionResult","尚未完成錄取流程。",0);let p=[$("pref1").value,$("pref2").value,$("pref3").value].filter(Boolean);if(!p.length)return fb("distributionResult","至少填一個志願。",0);let a=p.find(c=>s.score>=cn(c)[1])||p[p.length-1];s.county=a;s.rank="警員";if(!s.joinDate)s.joinDate=s.simDate;s.year=1;s.salary=56500;rec("縣市分發","分發至 "+a);fb("distributionResult","分發成功："+a+"。",1);save();render()}
function units(){ $("unitBanner").textContent=s.county?"目前分發："+s.county+"。":"尚未完成縣市分發。";$("unitCards").innerHTML=U.map(u=>{let l=s.year<u[3]||s.xp<u[4];return '<div class="choice-card '+((s.selectedUnit===u[0]||s.unit===u[0])?"selected":"")+'" data-u="'+u[0]+'"><h3>'+u[1]+" "+u[2]+'</h3><p>'+u[5]+'</p><div class="meta"><span class="tag">年資 '+u[3]+' 年</span><span class="tag">XP '+u[4]+'</span><span class="tag">'+(l?"🔒 尚未解鎖":"可申請")+'</span></div></div>'}).join("");document.querySelectorAll("[data-u]").forEach(e=>e.onclick=()=>{s.selectedUnit=e.dataset.u;units()})}
$("confirmUnitBtn").onclick=()=>{if(!s.county)return fb("unitMsg","請先完成縣市分發。",0);let u=U.find(x=>x[0]===s.selectedUnit);if(!u)return fb("unitMsg","請先選擇單位。",0);if(s.year<u[3]||s.xp<u[4])return fb("unitMsg","條件不足：需年資 "+u[3]+" 年、XP "+u[4]+"。",0);s.unit=u[0];s.unitName=u[2];s.rank=["警員","巡佐","警務員","主管職"][s.promo];rec("單位報到",s.county+"｜"+u[2]);fb("unitMsg","已報到："+s.county+" "+u[2]+"。",1);save();render()}
function duty(){ if($("shiftChip"))$("shiftChip").textContent=shiftName()+"｜"+rocDateTime(); $("dutySubtitle").textContent=s.unit?[s.name,s.county,s.unitName,s.rank].join("｜"):"完成分發後即可上勤。";$("energyChip").textContent="體力 "+s.energy;$("dutyCount").textContent=s.dutyCount+" 件";$("dutyXp").textContent=s.xp+" XP";$("dutyRep").textContent=s.rep;$("dutyEnergy").textContent=s.energy}
$("nextDutyBtn").onclick=()=>{if(!s.unit)return toast("請先完成單位分發");active=D[Math.floor(Math.random()*D.length)];$("dutyCase").innerHTML="<b>"+active[0]+"</b><br>"+active[1];$("dutyChoices").innerHTML=active[2].map((c,i)=>'<div class="action-card" data-d="'+i+'"><strong>'+String.fromCharCode(65+i)+". "+c[0]+'</strong><p>依安全、程序與完整性判定。</p></div>').join("");document.querySelectorAll("[data-d]").forEach(e=>e.onclick=()=>resolve(+e.dataset.d))}
function resolve(i){let c=active[2][i];s.xp+=c[1];s.rep=cl(s.rep+c[2]);s.energy=cl(s.energy+c[3]);s.stress=cl(s.stress+Math.max(1,Math.round(-c[3]*.35)));s.dutyCount++;advanceHours(2);s.cases.unshift({id:String(Date.now()).slice(-7),type:active[0],action:c[0],result:c[1]>=14?"處置完整":"仍有改善空間",xp:c[1],date:rocDateTime()});rec("完成勤務",active[0]+"｜+"+c[1]+" XP");fb("dutyResult","勤務完成：+"+c[1]+" XP，聲望 "+(c[2]>=0?"+":"")+c[2]+"。",c[1]>=14);$("dutyChoices").innerHTML="";active=null;if(s.dutyCount%6===0){s.energy=100;s.stress=cl(s.stress-5)}save();render()}
function cases(){ $("caseList").innerHTML=s.cases.length?s.cases.map(c=>'<div class="case-item"><h3>#'+c.id+"｜"+c.type+'</h3><div class="case-meta">'+c.date+"｜"+c.xp+' XP</div><p><b>處置：</b>'+c.action+'<br><b>結果：</b>'+c.result+"</p></div>").join(""):'<div class="empty-state">目前沒有案件卷宗。</div>'}
function career(){document.querySelectorAll(".career-node").forEach((n,i)=>n.classList.toggle("current",i===s.promo))}
$("promotionBtn").onclick=()=>{let N=[[3,300,65],[6,650,72],[10,1100,80]][s.promo];if(!s.unit)return fb("careerMsg","尚未正式任職。",0);if(!N)return fb("careerMsg","已達本版本最高層級。",1);if(s.year<N[0]||s.xp<N[1]||s.rep<N[2])return fb("careerMsg","需年資 "+N[0]+" 年、XP "+N[1]+"、聲望 "+N[2]+"。",0);s.promo++;s.rank=["警員","巡佐","警務員","主管職"][s.promo];s.salary+=7000;rec("升遷","晉升為 "+s.rank);fb("careerMsg","升遷成功："+s.rank+"。",1);save();render()}
$("specialUnitBtn").onclick=()=>{if(s.year<2||s.xp<180)return fb("careerMsg","甄選至少需年資2年、XP180。",0);s.comm=cl(s.comm+3);s.rep=cl(s.rep+2);rec("完成專業甄選","專業單位申請資格提升");fb("careerMsg","甄選完成。",1);save();render()}
$("transferBtn").onclick=()=>{if(s.year<3)return fb("careerMsg","跨縣市調任至少需年資3年。",0);let a=C.filter(c=>c!==s.county),t=a[Math.floor(Math.random()*a.length)],ok=Math.random()<.45+s.rep/250;if(ok){s.county=t;rec("跨縣市調任","調任至 "+t);fb("careerMsg","調任成功："+t+"。",1)}else fb("careerMsg","本次申請未錄取。",0);save();render()}
function life(){ $("salaryStat").textContent=cash(s.salary);$("savingsStat").textContent=cash(s.savings);$("lifeStress").textContent=s.stress;$("healthStat").textContent=s.health;let A=[["salary","💵 領取月薪","加入本月薪資"],["rent","🏠 支付生活費","扣除生活成本"],["rest","🛌 完整休假","壓力 -15、體力 +25"],["exercise","🏋️ 運動","健康 +3、體能 +2"],["study","📘 在職進修","法學 +2、英文 +2"],["social","👥 同事聚餐","溝通 +2、聲望 +1"]];$("lifeActions").innerHTML=A.map(a=>'<div class="action-card" data-l="'+a[0]+'"><strong>'+a[1]+'</strong><p>'+a[2]+'</p></div>').join("");document.querySelectorAll("[data-l]").forEach(e=>e.onclick=()=>live(e.dataset.l))}
function live(a){if(a==="salary"){if(!s.salary)return toast("尚未任職");s.savings+=s.salary;advanceDays(30);rec("領取薪資",cash(s.salary))}if(a==="rent"){s.savings-=s.family==="與家人同住"?9000:s.family==="自行租屋"?18000:14000;advanceDays(30)}if(a==="rest"){s.stress=cl(s.stress-15);s.energy=cl(s.energy+25);advanceDays(1)}if(a==="exercise"){s.health=cl(s.health+3);s.fit=cl(s.fit+2);s.stress=cl(s.stress-4);advanceDays(1)}if(a==="study"){s.savings-=1500;s.law=cl(s.law+2);s.eng=cl(s.eng+2);advanceDays(7)}if(a==="social"){s.savings-=800;s.comm=cl(s.comm+2);s.rep=cl(s.rep+1);advanceDays(1)}save();render()}
function records(){ $("historyList").innerHTML=s.history.length?s.history.map(h=>'<div class="timeline-item"><b>'+h.title+'</b><span>'+h.detail+"｜"+h.time+"</span></div>").join(""):'<div class="empty-state">尚無生涯紀錄。</div>'}
function render(){syncClock();dashboard();character();routes();study();exam();dist();units();duty();cases();career();life();records()}
$("continueBtn").onclick=()=>go(next());["saveBtn","manualSaveBtn"].forEach(id=>$(id).onclick=save);["loadBtn","manualLoadBtn"].forEach(id=>$(id).onclick=load);
$("resetBtn").onclick=()=>{if(confirm("確定清除目前生涯存檔並重新開始？")){localStorage.removeItem("twPoliceCareerSaveV1");s=NEW();render();go("dashboard");toast("已重新開始")}};
window.addEventListener("beforeunload",()=>localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(s)));
let raw=localStorage.getItem("twPoliceCareerSaveV1");if(raw){try{s=Object.assign(NEW(),JSON.parse(raw))}catch(e){}}
render();

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
  advDay.onclick=()=>{
    advanceDays(1);
    s.energy=cl(Math.min(100,s.energy+8));
    s.stress=cl(Math.max(0,s.stress-2));
    rec("時間推進","休整一天，日期前進至 "+rocDateTime());
    save();
    render();
  };
}
