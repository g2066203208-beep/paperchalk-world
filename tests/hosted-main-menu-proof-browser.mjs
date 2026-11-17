/* Root menu integration QA: user-approved deletion of Silver Moon duel and
   official main-menu entry for the real Anima 3D paintover scene.
   Verify live DOM, real WebGL and screenshot + video; report hosted deployment
   separately from deterministic checked-out local source. */
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";

const out="artifacts/hosted-main-menu-proof";
fs.mkdirSync(out+"/video",{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 "--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"
]});
const viewports=[
 {name:"desktop-1920x1080",width:1920,height:1080,mobile:false},
 {name:"phone-390x844",width:390,height:844,mobile:true}
];
const report={test:"Replace Silver Moon Duel with 3D Anima Hall",local:[],hosted:null,deleted:[]};
const retired=[
 "site/card-battle/hunter-vampire-duel.html",
 "site/card-battle/engine/hunter-vampire-duel.js",
 "site/card-battle/ui/hunter-vampire-duel.css",
 "site/card-battle/ui/hunter-vampire-duel.js",
 "site/card-battle/ui/duel-card-art.js",
 "site/card-battle/ui/duel-night-forest.svg",
 "tests/hunter-vampire-duel-browser.mjs",
 ".github/workflows/hunter-vampire-duel-qa.yml"
];
for(const file of retired){
 report.deleted.push({file,removed:!fs.existsSync(file)});
 assert(!fs.existsSync(file),"Old duel-only file remains: "+file);
}
const root=fs.readFileSync("site/index.html","utf8");
assert(!root.includes("menu-hunter-vampire"),"Old Silver Moon root menu button remains");
assert(!root.includes("hunter-vampire-duel.html"),"Retired duel URL remains linked in main menu");
assert(root.includes('id="menu-anima-paintover"'),"Missing Anima hall entry in root menu");
assert(root.includes("./card-battle/anima-paintover-lab.html"),"Missing working Anima hall route");

for(const vp of viewports){
 const context=await browser.newContext({
  viewport:{width:vp.width,height:vp.height},isMobile:vp.mobile,hasTouch:vp.mobile,
  deviceScaleFactor:1,recordVideo:{dir:out+"/video",size:{width:vp.width,height:vp.height}}
 });
 const page=await context.newPage();
 const errors=[];
 page.on("pageerror",e=>errors.push(String(e)));
 try{
  const response=await page.goto("http://127.0.0.1:4173/index.html",{waitUntil:"domcontentloaded",timeout:30000});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.getElementById("source")?.naturalWidth>0 &&
    document.getElementById("scene")?.dataset.scene==="menu",null,{timeout:20000});
  await page.waitForTimeout(900);
  const labels=await page.locator("#scene-menu-main button").allTextContents();
  assert(labels.some(t=>t.includes("褪色的会客厅")),"New scene entry must appear in main menu");
  assert(labels.every(t=>!t.includes("银月夜路")&&!t.includes("影月夜路")),"Legacy duel still in main menu");
  assert.equal(await page.locator("#menu-anima-paintover").count(),1);
  await page.screenshot({path:out+"/"+vp.name+"-01-new-main-menu.png",animations:"disabled"});
  await page.locator("#scene-menu-main").evaluate(el=>el.scrollTop=el.scrollHeight);
  await page.screenshot({path:out+"/"+vp.name+"-02-main-menu-bottom.png",animations:"disabled"});
  await page.locator("#menu-anima-paintover").click();
  await page.waitForURL("**/card-battle/anima-paintover-lab.html",{timeout:15000});
  await page.waitForFunction(()=>window.PaintoverStudio?.frameCount>6 &&
    window.PaintoverStudio.drawCalls>15 && window.PaintoverStudio.loadedActor,
    null,{timeout:25000});
  await page.waitForTimeout(360);
  const lab=await page.evaluate(()=>({
   mode:window.PaintoverStudio.mode,
   frameCount:window.PaintoverStudio.frameCount,
   drawCalls:window.PaintoverStudio.drawCalls,
   actorLoaded:window.PaintoverStudio.loadedActor,
   hasCanvas:!!document.querySelector("canvas#world"),
   textureControls:document.querySelectorAll(".setting input[type=range]").length
  }));
  assert(lab.mode==="composite"&&lab.actorLoaded&&lab.drawCalls>15&&lab.textureControls===5,
   "Cannot enter working real 3D Anima scene via main menu: "+JSON.stringify(lab));
  await page.screenshot({path:out+"/"+vp.name+"-03-anima-3d-composite.png",animations:"disabled"});
  // Phone controls moved into the compact game HUD. Old hidden desktop
  // control must not be clicked in a mobile integration test.
  if(vp.mobile)await page.locator("#mobile-view").click();
  else await page.locator("#whitebox").click();
  assert.equal(await page.evaluate(()=>window.PaintoverStudio.mode),"whitebox");
  await page.screenshot({path:out+"/"+vp.name+"-04-anima-3d-whitebox.png",animations:"disabled"});
  assert.deepEqual(errors,[],"Browser runtime errors on main menu/3D scene");
  report.local.push({viewport:vp.name,pass:true,labels,lab,errors});
  console.log("PASS local actual root menu -> 3D hall",vp.name,JSON.stringify(lab));
 }catch(e){
  report.local.push({viewport:vp.name,pass:false,error:String(e.stack||e),errors});
  console.error("FAIL local actual root menu",vp.name,e);
  await page.screenshot({path:out+"/"+vp.name+"-ERROR.png"}).catch(()=>{});
 }finally{await context.close()}
}
// Do not mislabel the source build as published GitHub Pages.
// Capture externally deployed main menu and explicitly report its status.
const ctx=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const page=await ctx.newPage();
try{
 const response=await page.goto("https://g2066203208-beep.github.io/paperchalk-world/",{
  waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForFunction(()=>document.querySelector("#scene-menu-main")!==null,null,{timeout:12000});
 await page.waitForTimeout(500);
 const menu=await page.locator("#scene-menu-main button").allTextContents();
 const hasNew=menu.some(x=>x.includes("褪色的会客厅"));
 const hasOld=menu.some(x=>x.includes("银月夜路"));
 const snapshot=out+"/desktop-1920x1080-05-hosted-main-menu.png";
 await page.screenshot({path:snapshot,animations:"disabled"});
 report.hosted={http:response?.status(),hasNew,hasOld,menu,url:page.url(),screenshot:snapshot,
  state:hasNew&&!hasOld?"live-updated":"deploy-pending"};
 console.log("HOSTED PAGE",JSON.stringify(report.hosted));
}catch(e){report.hosted={state:"unavailable",error:String(e)};console.log("Hosted unavailable",String(e));}
finally{await ctx.close()}
// Verify the public deployed 3D scene independently; a passed local source
// test is not evidence that GitHub Pages has published this exact revision.
const hostedMobile=await browser.newContext({
 viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true
});
const livePage=await hostedMobile.newPage();
try{
 const response=await livePage.goto(
  "https://g2066203208-beep.github.io/paperchalk-world/card-battle/anima-paintover-lab.html",
  {waitUntil:"domcontentloaded",timeout:30000});
 await livePage.waitForFunction(()=>window.PaintoverStudio?.frameCount>4,null,{timeout:20000});
 const live=await livePage.evaluate(()=>{
  const stage=document.querySelector(".stage").getBoundingClientRect();
  const mobile=document.querySelector(".mobile-toolbar");
  return {hudVisible:getComputedStyle(mobile).display!=="none",
    stageHeight:stage.height,viewportHeight:innerHeight,
    shadowCache:window.PaintoverStudio.renderRatio<=1,
    viewportMode:window.PaintoverStudio.viewportMode};
 });
 report.hostedMobile={
  http:response?.status(),...live,
  updated:live.hudVisible&&live.stageHeight>=live.viewportHeight*.73&&
    live.viewportMode==="portrait"
 };
 await livePage.screenshot({path:out+"/phone-390x844-06-hosted-anima-scene.png"});
 console.log("HOSTED MOBILE 3D",JSON.stringify(report.hostedMobile));
}catch(e){report.hostedMobile={updated:false,error:String(e)};
 console.log("Hosted 3D deployment not verified",String(e));}
finally{await hostedMobile.close()}
await browser.close();
fs.writeFileSync(out+"/results.json",JSON.stringify(report,null,2));
assert(report.local.every(r=>r.pass),"Updated root menu and Anima 3D scene must pass Chromium");
