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
    assert(window.document.querySelectorAll("#charHomeCounty option").length===22,"county select should contain 22 options");
    click(window,window.document.getElementById("createCharacterBtn"));await wait(0);
    click(window,window.document.querySelector('#routeCards [data-r="tpa"]'));await wait(0);
    click(window,window.document.getElementById("confirmRouteBtn"));await wait(0);
    assert(window.document.getElementById("routeMsg").textContent.includes("已選擇"),"confirm route did not update feedback");
    const before=Number(window.document.getElementById("studyLaw").textContent);
    click(window,window.document.querySelector('#studyActions [data-a="law"]'));await wait(0);
    assert(Number(window.document.getElementById("studyLaw").textContent)>before,"study action did not change law score");
    const save=JSON.parse(window.localStorage.getItem("twPoliceCareerSaveV1")||"{}");Object.assign(save,{created:true,route:"tpa",passed:true,county:"臺北市",localAgency:"臺北市政府警察局",precinct:"中正第一分局",unit:"station",unitName:"臺北市政府警察局中正第一分局忠孝西路派出所",assignmentType:"station",stationName:"忠孝西路派出所",selectedStation:"忠孝西路派出所",selectedUnit:"station",position:"警員",rank:"警員",careerSequenceNo:11,sequence:"第十一序列",careerStage:"basic_active",unitSelectionOpen:false,joinDate:"2026-01-01T08:00:00"});window.localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(save));click(window,window.document.getElementById("manualLoadBtn"));await wait(0);
    const save=JSON.parse(window.localStorage.getItem("twPoliceCareerSaveV1")||"{}");Object.assign(save,{created:true,route:"tpa",passed:true,county:"臺北市",localAgency:"臺北市政府警察局",precinct:"中正第一分局",unit:"station",unitName:"臺北市政府警察局中正第一分局忠孝西路派出所",assignmentType:"station",stationName:"忠孝西路派出所",selectedStation:"忠孝西路派出所",selectedUnit:"station",position:"警員",rank:"警員",careerSequenceNo:11,sequence:"第十一序列",careerStage:"basic_active",unitSelectionOpen:false,joinDate:"2026-01-01T08:00:00"});window.localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(save));click(window,window.document.getElementById("manualLoadBtn"));await wait(0);
    click(window,window.document.querySelector('.nav-btn[data-page="duty"]'));await wait(0);
    click(window,window.document.getElementById("nextDutyBtn"));await wait(0);
    const choice=window.document.querySelector("#dutyChoices [data-advd]");
    assert(choice,"duty scenario choices did not render");
    click(window,choice);await wait(250);
    assert(window.document.querySelector("#dutyChoices [data-advd]"),"next duty scenario did not render after answer");
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
