import fs from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

const htmlRaw=fs.readFileSync("index.html","utf8");
function assert(cond,msg){if(!cond)throw new Error(msg)}
function click(window,el){assert(el,"click target missing");el.dispatchEvent(new window.MouseEvent("click",{bubbles:true,cancelable:true,view:window}))}

const standaloneIds=["standaloneBackendConfig","standaloneBackend","standaloneApp","standaloneSystems"];
if(standaloneIds.every(id=>htmlRaw.includes(`id="${id}"`))){
  const scripts=[...htmlRaw.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(m=>/\bid="standalone(?:BackendConfig|Backend|App|Systems)"/.test(m[1]));
  assert(scripts.length===4,"standalone app scripts are incomplete");
  const source=scripts.map(m=>m[2]).join("\n;\n");
  const html=htmlRaw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"");
  const vc=new VirtualConsole(),errors=[];
  vc.on("jsdomError",e=>errors.push("jsdom: "+e.message));
  vc.on("error",(...args)=>errors.push("console.error: "+args.map(String).join(" ")));
  const dom=new JSDOM(html,{url:"https://example.test/",runScripts:"dangerously",pretendToBeVisual:true,virtualConsole:vc,beforeParse(window){
    window.confirm=()=>true;window.scrollTo=()=>{};window.HTMLElement.prototype.scrollIntoView=()=>{};
    window.fetch=async()=>({ok:true,json:async()=>({meta:{divisionCount:0,stationCount:0},counties:{}})});
  }});
  const {window}=dom,wait=(ms=0)=>new Promise(r=>window.setTimeout(r,ms));
  try{
    window.eval(source);await wait(20);
    assert(window.document.title.includes("台灣警察生涯模擬器"),"standalone simulator title missing");
    assert(window.document.querySelectorAll(".nav-btn").length>=12,"main navigation did not render");
    const rotationScenarios=[
      {position:"巡佐",seq:10,route:"tpa",stage:"basic_active",openWithButton:true,expected:["巡佐兼副所長","巡佐兼小隊長","巡佐兼所長"]},
      {position:"巡官",seq:9,route:"cpu",stage:"officer_rotation",openWithButton:false,expected:["巡官兼副所長","巡官兼所長"]},
      {position:"警務員",seq:8,route:"cpu",stage:"officer_rotation",openWithButton:false,expected:["警務員兼所長"]},
      {position:"督察員",seq:7,route:"cpu",stage:"officer_rotation",openWithButton:false,expected:["警務員兼所長","警務員兼副隊長"]},
      {position:"警務正",seq:6,route:"cpu",stage:"officer_rotation",openWithButton:false,expected:["警務員兼副隊長"]},
      {position:"專員",seq:5,route:"cpu",stage:"officer_rotation",openWithButton:false,expected:["專員"]},
      {position:"分局長",seq:4,route:"cpu",stage:"officer_rotation",openWithButton:false,expected:["分局長"]},
      {position:"副局長",seq:3,route:"cpu",stage:"officer_rotation",openWithButton:false,expected:["副局長"]},
      {position:"主任秘書",seq:2,route:"cpu",stage:"officer_rotation",openWithButton:false,expected:["主任秘書"],transferTag:"跨機關"},
      {position:"副署長",seq:1,route:"cpu",stage:"officer_rotation",openWithButton:false,expected:["副署長"],transferTag:"外縣市"},
      {position:"署長",seq:0,route:"cpu",stage:"officer_rotation",openWithButton:false,expected:["署長","校長"],noTransfer:true},
      {position:"主任秘書",seq:5,route:"cpu",stage:"officer_rotation",openWithButton:false,county:"屏東縣",localAgency:"屏東縣政府警察局",currentUnit:"admin",currentAssignmentType:"administration",expected:["主任秘書"]}
    ];
    for(const scenario of rotationScenarios){
      const oldOffers=scenario.seq===9?[
        {id:"rotation_admin",unit:"admin",assignmentType:"administration",unitName:"臺北市政府警察局行政組",position:"巡官",seq:9},
        {id:"rotation_external_9_新北市",unit:"admin",assignmentType:"administration",unitName:"新北市政府警察局｜局本部／所屬單位",position:"巡官",seq:9,crossCounty:true,county:"新北市",localAgency:"新北市政府警察局"}
      ]:[];
      const county=scenario.county||"臺北市",localAgency=scenario.localAgency||"臺北市政府警察局",currentUnit=scenario.currentUnit||"station",currentAssignmentType=scenario.currentAssignmentType||"station",stationName=scenario.county?"":"忠孝西路派出所",precinct=scenario.county?"":"中正第一分局";
      const state={created:true,passed:true,route:scenario.route,county,localAgency,precinct,unit:currentUnit,unitName:currentUnit==="station"?localAgency+"｜"+precinct+stationName:localAgency+"本部",assignmentType:currentAssignmentType,stationName,position:scenario.position,rank:scenario.position,careerSequenceNo:scenario.seq,careerStage:scenario.stage,unitSelectionOpen:false,rotationEligible:scenario.seq!==10,rotationOffers:oldOffers||[],selectedUnit:"",pendingStationPick:false,year:5,xp:500,officerEducationQualified:true};
      window.localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(state));
      click(window,window.document.getElementById("loadBtn"));await wait(0);
      if(scenario.openWithButton){
        click(window,window.document.querySelector('.nav-btn[data-page="career"]'));await wait(0);
        click(window,window.document.getElementById("specialUnitBtn"));await wait(0);
      }else{
        click(window,window.document.querySelector('.nav-btn[data-page="unit"]'));await wait(0);
      }
      const shown=[...window.document.querySelectorAll("#unitCards .vacancy-position")].map(x=>x.textContent);
      const diagnostic="active="+(window.document.querySelector(".page.active")?.id||"")+"; feedback="+(window.document.getElementById("careerMsg")?.textContent||"")+"; banner="+(window.document.getElementById("unitBanner")?.textContent||"")+"; cards="+shown.join("|");
      for(const title of scenario.expected)assert(shown.includes(title),scenario.position+" rotation missing "+title+"; "+diagnostic);
      for(const placeholder of ["高階主管職","副主管職","分局長／大隊長等高階主管職"])assert(!shown.includes(placeholder),"generic placeholder remains in "+scenario.seq+"; "+diagnostic);
      const tags=[...window.document.querySelectorAll("#unitCards .tag")].map(x=>x.textContent);
      if(scenario.transferTag)assert(tags.includes(scenario.transferTag),scenario.position+" should show "+scenario.transferTag+"; "+diagnostic);
      if(scenario.noTransfer)assert(!tags.some(x=>x==="外縣市"||x==="跨機關"),scenario.position+" should not show a transfer vacancy; "+diagnostic);
    }
    click(window,window.document.getElementById("resetBtn"));await wait(0);
    assert(window.document.querySelectorAll("#charHomeCounty option").length===22,"county select should contain 22 options");
    click(window,window.document.getElementById("createCharacterBtn"));await wait(0);
    click(window,window.document.querySelector('#routeCards [data-r="tpa"]'));await wait(0);
    click(window,window.document.getElementById("confirmRouteBtn"));await wait(0);
    assert(window.document.getElementById("routeMsg").textContent.includes("已選擇"),"confirm route did not update feedback");
    const before=Number(window.document.getElementById("studyLaw").textContent);
    click(window,window.document.querySelector('#studyActions [data-a="law"]'));await wait(0);
    assert(Number(window.document.getElementById("studyLaw").textContent)>before,"study action did not change law score");
    click(window,window.document.querySelector('.nav-btn[data-page="career"]'));await wait(0);
    assert(window.document.querySelectorAll("#careerPath .sequence-rank-reference img").length===12,"career sequence rank insignia references did not render");
    click(window,window.document.querySelector('.nav-btn[data-page="academy"]'));await wait(0);
    const randomBeforeQuiz=window.Math.random;window.Math.random=()=>0;click(window,window.document.getElementById("newQuizBtn"));await wait(0);
    assert(window.document.querySelectorAll("#quizChoices [data-q]").length===4,"mixed quiz did not render four choices");
    const firstMixedQuestion=window.document.getElementById("quizQuestion").textContent;
    assert(firstMixedQuestion.includes("警察法"),"mixed quiz did not include sourced police law");
    click(window,window.document.querySelector("#quizChoices [data-q='0']"));await wait(200);
    assert(window.document.getElementById("quizResult").querySelector("a")?.href.includes("law.moj.gov.tw"),"quiz feedback did not link to the official law source");
    assert(window.document.getElementById("quizResult").textContent.includes("警察任務"),"quiz feedback did not show an explanation");
    assert(!window.document.querySelector("#quizChoices [data-q]"),"quiz answer choices should clear after one answer");
    window.Math.random=()=>0.99;await wait(1400);window.Math.random=randomBeforeQuiz;
    assert(window.document.getElementById("quizQuestion").textContent!==firstMixedQuestion,"study quiz did not automatically advance");
    const savedState=JSON.parse(window.localStorage.getItem("twPoliceCareerSaveV1")||"{}");Object.assign(savedState,{created:true,route:"tpa",passed:true,county:"臺北市",localAgency:"臺北市政府警察局",precinct:"中正第一分局",unit:"station",unitName:"臺北市政府警察局中正第一分局忠孝西路派出所",assignmentType:"station",stationName:"忠孝西路派出所",selectedStation:"忠孝西路派出所",selectedUnit:"station",position:"警員",rank:"警員",careerSequenceNo:11,sequence:"第十一序列",careerStage:"basic_active",unitSelectionOpen:false,joinDate:"2026-01-01T08:00:00"});window.localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(savedState));click(window,window.document.getElementById("manualLoadBtn"));await wait(0);
    click(window,window.document.querySelector('.nav-btn[data-page="duty"]'));await wait(0);
    assert(!window.document.querySelector("#dutyModeCards [data-dmode]"),"duty types should be mixed instead of selectable");
    const randomBeforeDuty=window.Math.random;window.Math.random=()=>0.99;
    click(window,window.document.getElementById("nextDutyBtn"));await wait(0);
    const choice=window.document.querySelector("#dutyChoices [data-advd]");
    assert(choice,"mixed duty scenario choices did not render");
    click(window,choice);await wait(200);
    assert(!window.document.querySelector("#dutyChoices [data-advd]"),"duty result should remain visible before auto-advance");
    assert(window.document.getElementById("dutyResult").textContent.includes("遊戲時間前進約 30 天"),"duty result feedback was not visible");
    await wait(1400);
    assert(window.document.querySelector("#dutyChoices [data-advd]"),"duty scenario did not auto-advance after feedback");
    window.Math.random=()=>0;
    click(window,window.document.getElementById("nextDutyBtn"));await wait(0);
    assert(window.document.querySelectorAll("#dutyChoices [data-dutyquiz]").length===4,"legal questions were not mixed into the duty queue");
    click(window,window.document.querySelector("#dutyChoices [data-dutyquiz='0']"));await wait(200);
    assert(window.document.getElementById("dutyResult").querySelector("a")?.href.includes("law.moj.gov.tw"),"duty law question did not show an official source");
    assert(!window.document.querySelector("#dutyChoices [data-dutyquiz]"),"duty law answer should be single-use");
    window.Math.random=()=>0.99;await wait(1400);
    assert(window.document.querySelector("#dutyChoices [data-advd]"),"duty law question did not auto-advance");
    window.Math.random=randomBeforeDuty;
    const seniorState=JSON.parse(window.localStorage.getItem("twPoliceCareerSaveV1")||"{}");Object.assign(seniorState,{route:"g3",passed:true,county:"臺北市",unit:"station",unitName:"臺北市政府警察局某分局",assignmentType:"station",position:"分局長",rank:"分局長",officialRank:"警正一階",careerSequenceNo:4,sequence:"第四序列",careerStage:"basic_active",rotationEligible:false,joinDate:"2019-01-01T08:00:00",positionStartDate:"2019-01-01T08:00:00",simDate:"2026-01-01T08:00:00",simEpoch:new Date("2026-01-01T08:00:00").getTime(),maxSimEpoch:new Date("2026-01-01T08:00:00").getTime(),discipline:100,law:100,knowledge:100,service:100,appraisals:[{year:115,grade:"甲等",type:"年度考績"},{year:114,grade:"甲等",type:"年度考績"}]});window.localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(seniorState));click(window,window.document.getElementById("manualLoadBtn"));await wait(0);click(window,window.document.querySelector('.nav-btn[data-page="unit"]'));await wait(0);
    click(window,window.document.querySelector('.nav-btn[data-page="command"]'));await wait(0);
    const randomBeforeCommand=window.Math.random;window.Math.random=()=>0;
    click(window,window.document.getElementById("nextCommandBtn"));await wait(0);
    assert(window.document.querySelectorAll("#commandChoices [data-cmdquiz]").length===4,"supervisor screen did not mix in legal questions");
    click(window,window.document.querySelector("#commandChoices [data-cmdquiz='0']"));await wait(200);
    assert(window.document.getElementById("commandResult").querySelector("a")?.href.includes("law.moj.gov.tw"),"supervisor law question did not show an official source");
    assert(!window.document.querySelector("#commandChoices [data-cmdquiz]"),"supervisor question should accept only one answer");
    window.Math.random=()=>0.99;await wait(1400);
    assert(window.document.querySelector("#commandChoices [data-cmd]"),"supervisor event did not auto-advance after legal feedback");
    window.Math.random=randomBeforeCommand;
    click(window,window.document.querySelector('.nav-btn[data-page="unit"]'));await wait(0);
    assert(!window.document.getElementById("policeMonitorTrainingBtn").disabled,"two A-grade annual appraisals should unlock senior training");
    assert(window.document.getElementById("policeMonitorTrainingStatus").textContent.includes("參訓資格符合"),"training status should accept exactly two A-grade records");
    click(window,window.document.getElementById("policeMonitorTrainingBtn"));await wait(0);
    assert(window.document.getElementById("policeMonitorTrainingStatus").textContent.includes("警監班訓練完成，模擬成績"),"police senior training completion did not update");
    const retryState={...seniorState,law:0,knowledge:0,service:0,policeMonitorTrainingPassed:false,policeMonitorTrainingLastResult:""};
    window.localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(retryState));click(window,window.document.getElementById("manualLoadBtn"));await wait(0);click(window,window.document.querySelector('.nav-btn[data-page="unit"]'));await wait(0);
    const originalRandom=window.Math.random;window.Math.random=()=>0;click(window,window.document.getElementById("policeMonitorTrainingBtn"));await wait(0);window.Math.random=originalRandom;
    assert(window.document.getElementById("policeMonitorTrainingStatus").textContent.includes("本次警監班訓練未通過"),"failed training result should be visible on the training card");
    const blockedState={...retryState,officialRank:"警正二階",policeMonitorTrainingLastResult:""};window.localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(blockedState));click(window,window.document.getElementById("manualLoadBtn"));await wait(0);click(window,window.document.querySelector('.nav-btn[data-page="unit"]'));await wait(0);
    assert(window.document.getElementById("policeMonitorTrainingBtn").disabled,"ineligible training button should remain disabled");
    assert(window.document.getElementById("policeMonitorTrainingStatus").textContent.includes("官階須為警正一階"),"ineligible training blocker should be explained on the training card");
    if(errors.length)throw new Error("Runtime console errors:\n"+errors.join("\n"));
    console.log("SMOKE_OK standalone app, mixed quiz, duty and command auto-advance, two-A training eligibility, rank insignia");
  }catch(err){console.error("SMOKE_FAIL",err.stack||err);if(errors.length)console.error(errors.join("\n"));process.exit(1)}
  finally{window.close()}
}else{
  const appRef=(htmlRaw.match(/<script src="(app-v\d+\.js)"><\/script>/)||[])[1];
  const systemsRef=(htmlRaw.match(/<script src="(systems-v\d+\.js)"><\/script>/)||[])[1];
  if(!appRef||!systemsRef)throw new Error("Could not locate current app/systems script refs");
  const html=htmlRaw.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g,"");
  const app=fs.readFileSync(appRef,"utf8"),systems=fs.readFileSync(systemsRef,"utf8");
  const vc=new VirtualConsole(),errors=[];vc.on("jsdomError",e=>errors.push("jsdom: "+e.message));vc.on("error",(...args)=>errors.push("console.error: "+args.map(String).join(" ")));
  const dom=new JSDOM(html,{url:"https://example.test/",runScripts:"dangerously",pretendToBeVisual:true,virtualConsole:vc,beforeParse(window){window.confirm=()=>true;window.scrollTo=()=>{};window.HTMLElement.prototype.scrollIntoView=()=>{};window.fetch=async()=>({ok:true,json:async()=>({meta:{divisionCount:0,stationCount:0},counties:{}})})}});
  const {window}=dom,wait=(ms=0)=>new Promise(r=>window.setTimeout(r,ms));
  try{
    window.eval(app+"\n;"+systems);await wait(20);
    assert(window.document.querySelectorAll("#charHomeCounty option").length===22,"county select should contain 22 options");
    click(window,window.document.querySelector('#routeCards [data-r="tpa"]'));await wait(0);
    click(window,window.document.getElementById("createCharacterBtn"));await wait(0);
    click(window,window.document.querySelector('#routeCards [data-r="tpa"]'));click(window,window.document.getElementById("confirmRouteBtn"));await wait(0);
    assert(window.document.getElementById("routeMsg").textContent.includes("已選擇"),"confirm route did not update feedback");
    const before=Number(window.document.getElementById("studyLaw").textContent);click(window,window.document.querySelector('#studyActions [data-a="law"]'));await wait(0);
    assert(Number(window.document.getElementById("studyLaw").textContent)>before,"study action click did not change law score");
    const raw=JSON.parse(window.localStorage.getItem("twPoliceCareerSaveV1")||"{}");Object.assign(raw,{created:true,route:"tpa",routeName:"警專二年制 → 四等警察人員特考",passed:true,county:"臺北市",localAgency:"臺北市政府警察局",precinct:"中正第一分局",unit:"station",unitName:"臺北市政府警察局中正第一分局忠孝西路派出所",assignmentType:"station",stationName:"忠孝西路派出所",selectedStation:"忠孝西路派出所",selectedUnit:"station",position:"警員",rank:"警員",careerSequenceNo:11,sequence:"第十一序列",careerStage:"basic_active",unitSelectionOpen:false,joinDate:"2026-01-01T08:00:00"});window.localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(raw));click(window,window.document.getElementById("manualLoadBtn"));await wait(0);
    assert(window.document.getElementById("unitCards").textContent.includes("已報到"),"unit page should show current assignment after reporting");
    assert(window.document.getElementById("confirmUnitBtn").style.display==="none","confirm unit button should be hidden after reporting");
    click(window,window.document.getElementById("nextDutyBtn"));await wait(0);let dutyChoice=window.document.querySelector("#dutyChoices [data-advd]");assert(dutyChoice,"duty choice did not render");click(window,dutyChoice);await wait(250);assert(window.document.querySelector("#dutyChoices [data-advd]"),"next duty did not auto-render after answer");
    if(errors.length)throw new Error("Runtime console errors:\n"+errors.join("\n"));console.log("SMOKE_OK",{appRef,systemsRef});
  }catch(err){console.error("SMOKE_FAIL",err.stack||err);if(errors.length)console.error(errors.join("\n"));process.exit(1)}finally{window.close()}
}
