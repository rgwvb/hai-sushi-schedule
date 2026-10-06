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
      {position:"巡佐",seq:10,expected:["巡佐兼副所長","巡佐兼小隊長"]},
      {position:"巡官",seq:9,expected:["巡官兼副所長","巡官兼小隊長"]}
    ];
    for(const scenario of rotationScenarios){
      const state={created:true,passed:true,route:"tpa",county:"臺北市",localAgency:"臺北市政府警察局",precinct:"中正第一分局",unit:"station",unitName:"臺北市政府警察局中正第一分局忠孝西路派出所",assignmentType:"station",stationName:"忠孝西路派出所",position:scenario.position,rank:scenario.position,careerSequenceNo:scenario.seq,careerStage:"basic_active",unitSelectionOpen:true,rotationEligible:false,rotationOffers:[],selectedUnit:"",pendingStationPick:false,year:5,xp:500};
      window.eval("Object.assign(s,"+JSON.stringify(state)+");units()");
      const shown=[...window.document.querySelectorAll("#unitCards .vacancy-position")].map(x=>x.textContent);
      for(const title of scenario.expected)assert(shown.includes(title),scenario.position+" rotation missing "+title);
    }
    window.eval("s=NEW();render()");
    assert(window.document.querySelectorAll("#charHomeCounty option").length===22,"county select should contain 22 options");
    click(window,window.document.getElementById("createCharacterBtn"));await wait(0);
    click(window,window.document.querySelector('#routeCards [data-r="tpa"]'));await wait(0);
    click(window,window.document.getElementById("confirmRouteBtn"));await wait(0);
    assert(window.document.getElementById("routeMsg").textContent.includes("已選擇"),"confirm route did not update feedback");
    const before=Number(window.document.getElementById("studyLaw").textContent);
    click(window,window.document.querySelector('#studyActions [data-a="law"]'));await wait(0);
    assert(Number(window.document.getElementById("studyLaw").textContent)>before,"study action did not change law score");
    const savedState=JSON.parse(window.localStorage.getItem("twPoliceCareerSaveV1")||"{}");Object.assign(savedState,{created:true,route:"tpa",passed:true,county:"臺北市",localAgency:"臺北市政府警察局",precinct:"中正第一分局",unit:"station",unitName:"臺北市政府警察局中正第一分局忠孝西路派出所",assignmentType:"station",stationName:"忠孝西路派出所",selectedStation:"忠孝西路派出所",selectedUnit:"station",position:"警員",rank:"警員",careerSequenceNo:11,sequence:"第十一序列",careerStage:"basic_active",unitSelectionOpen:false,joinDate:"2026-01-01T08:00:00"});window.localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(savedState));click(window,window.document.getElementById("manualLoadBtn"));await wait(0);
    click(window,window.document.querySelector('.nav-btn[data-page="duty"]'));await wait(0);
    click(window,window.document.getElementById("nextDutyBtn"));await wait(0);
    const choice=window.document.querySelector("#dutyChoices [data-advd]");
    assert(choice,"duty scenario choices did not render");
    click(window,choice);await wait(250);
    assert(window.document.querySelector("#dutyChoices [data-advd]"),"next duty scenario did not render after answer");
    const seniorState=JSON.parse(window.localStorage.getItem("twPoliceCareerSaveV1")||"{}");Object.assign(seniorState,{route:"g3",passed:true,county:"臺北市",unit:"station",unitName:"臺北市政府警察局某分局",assignmentType:"station",position:"分局長",rank:"分局長",officialRank:"警正一階",careerSequenceNo:4,sequence:"第四序列",careerStage:"basic_active",rotationEligible:false,joinDate:"2019-01-01T08:00:00",positionStartDate:"2019-01-01T08:00:00",simDate:"2026-01-01T08:00:00",simEpoch:new Date("2026-01-01T08:00:00").getTime(),maxSimEpoch:new Date("2026-01-01T08:00:00").getTime(),discipline:100,law:100,knowledge:100,service:100,appraisals:[{year:115,grade:"甲等",type:"年度考績"},{year:114,grade:"甲等",type:"年度考績"},{year:113,grade:"乙等",type:"年度考績"}]});window.localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(seniorState));click(window,window.document.getElementById("manualLoadBtn"));await wait(0);click(window,window.document.querySelector('.nav-btn[data-page="unit"]'));await wait(0);
    assert(!window.document.getElementById("policeMonitorTrainingBtn").disabled,"qualified police senior training should unlock on the rotation page");
    click(window,window.document.getElementById("policeMonitorTrainingBtn"));await wait(0);
    assert(window.document.getElementById("policeMonitorTrainingStatus").textContent.includes("已完成警正升警監訓練"),"police senior training completion did not update");
    if(errors.length)throw new Error("Runtime console errors:\n"+errors.join("\n"));
    console.log("SMOKE_OK standalone app, route, study, duty scenario");
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
