import fs from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

const htmlRaw=fs.readFileSync("index.html","utf8");
const appRef=(htmlRaw.match(/<script src="(app-v\d+\.js)"><\/script>/)||[])[1];
const systemsRef=(htmlRaw.match(/<script src="(systems-v\d+\.js)"><\/script>/)||[])[1];
if(!appRef||!systemsRef) throw new Error("Could not locate current app/systems script refs");

const html=htmlRaw.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g,"");
const app=fs.readFileSync(appRef,"utf8");
const systems=fs.readFileSync(systemsRef,"utf8");

const vc=new VirtualConsole();
const errors=[];
vc.on("jsdomError",e=>errors.push("jsdom: "+e.message));
vc.on("error",(...args)=>errors.push("console.error: "+args.map(String).join(" ")));

const dom=new JSDOM(html,{
  url:"https://example.test/",
  runScripts:"dangerously",
  pretendToBeVisual:true,
  virtualConsole:vc,
  beforeParse(window){
    window.confirm=()=>true;
    window.scrollTo=()=>{};
    window.HTMLElement.prototype.scrollIntoView=()=>{};
    window.fetch=async()=>({
      ok:true,
      json:async()=>({meta:{divisionCount:0,stationCount:0},counties:{}})
    });
  }
});
const {window}=dom;
const wait=(ms=0)=>new Promise(r=>window.setTimeout(r,ms));

function assert(cond,msg){if(!cond)throw new Error(msg)}
function click(el){
  assert(el,"click target missing");
  el.dispatchEvent(new window.MouseEvent("click",{bubbles:true,cancelable:true,view:window}));
}

try{
  window.eval(app);
  window.eval(systems);
  await wait(20);

  assert(window.document.querySelectorAll("#charHomeCounty option").length===22,"county select should contain 22 options");

  const routes=window.document.querySelectorAll("#routeCards [data-r]");
  assert(routes.length===4,"route cards should render 4 choices");
  click(window.document.querySelector('#routeCards [data-r="tpa"]'));
  await wait(0);
  assert(window.document.querySelector('#routeCards [data-r="tpa"]')?.classList.contains("selected"),"route card click did not select TPA");

  // Character is required before confirming a route.
  click(window.document.getElementById("createCharacterBtn"));
  await wait(0);
  click(window.document.querySelector('#routeCards [data-r="tpa"]'));
  click(window.document.getElementById("confirmRouteBtn"));
  await wait(0);
  assert(window.document.getElementById("routeMsg").textContent.includes("已選擇"),"confirm route did not update feedback");

  const before=Number(window.document.getElementById("studyLaw").textContent);
  click(window.document.querySelector('#studyActions [data-a="law"]'));
  await wait(0);
  const after=Number(window.document.getElementById("studyLaw").textContent);
  assert(after>before,"study action click did not change law score");

  // Verify basic-unit chooser closes after reporting.
  // We use exposed UI path by writing a minimal save then reloading through the page's load control.
  const raw=JSON.parse(window.localStorage.getItem("twPoliceCareerSaveV1")||"{}");
  Object.assign(raw,{
    created:true,route:"tpa",routeName:"警專二年制 → 四等警察人員特考",passed:true,
    county:"臺北市",localAgency:"臺北市政府警察局",precinct:"中正第一分局",
    unit:"station",unitName:"臺北市政府警察局中正第一分局忠孝西路派出所",assignmentType:"station",
    stationName:"忠孝西路派出所",selectedStation:"忠孝西路派出所",selectedUnit:"station",
    position:"警員",rank:"警員",careerSequenceNo:11,sequence:"第十一序列",
    careerStage:"basic_active",unitSelectionOpen:false,joinDate:"2026-01-01T08:00:00"
  });
  window.localStorage.setItem("twPoliceCareerSaveV1",JSON.stringify(raw));
  click(window.document.getElementById("manualLoadBtn"));
  await wait(0);
  const chooserText=window.document.getElementById("unitCards").textContent;
  assert(chooserText.includes("已報到"),"unit page should show current assignment after reporting");
  assert(window.document.getElementById("confirmUnitBtn").style.display==="none","confirm unit button should be hidden after reporting");

  // Duty choice must accept a click and advance automatically.
  click(window.document.getElementById("nextDutyBtn"));
  await wait(0);
  let dutyChoice=window.document.querySelector("#dutyChoices [data-advd]");
  assert(dutyChoice,"duty choice did not render");
  click(dutyChoice);
  await wait(250);
  dutyChoice=window.document.querySelector("#dutyChoices [data-advd]");
  assert(dutyChoice,"next duty did not auto-render after answer");

  if(errors.length)throw new Error("Runtime console errors:\n"+errors.join("\n"));
  console.log("SMOKE_OK", {appRef,systemsRef});
}catch(err){
  console.error("SMOKE_FAIL",err.stack||err);
  if(errors.length)console.error(errors.join("\n"));
  process.exit(1);
}
