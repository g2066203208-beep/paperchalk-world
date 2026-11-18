/* Actual game QA: source-controlled Three.js chapter, real Anima actor,
   clickable spatial clues, A* navigation, 3D hall/corridor/courtyard,
   desktop and mobile screenshots + real browser video. No DOM-mocked gameplay. */
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const out="artifacts/fading-hall-playable-chapter";
fs.mkdirSync(out+"/videos",{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 "--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"
]});
const devices=[
 {id:"desktop-1440x900",w:1440,h:900,mobile:false},
 {id:"phone-390x844",w:390,h:844,mobile:true},
 {id:"landscape-844x390",w:844,h:390,mobile:true}
];
const results=[];
for(const d of devices){
 const context=await browser.newContext({viewport:{width:d.w,height:d.h},
  deviceScaleFactor:1,isMobile:d.mobile,hasTouch:d.mobile,
  recordVideo:{dir:out+"/videos",size:{width:d.w,height:d.h}}});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.stack||e.message));
 page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 const shot=async(name)=>page.screenshot({path:out+"/"+d.id+"-"+name+".png",animations:"disabled"});
 const clickHotspot=async(id)=>{
  // The in-world 3D marker remains spatial, while the bottom action
  // shortcut is fixed and reachable even if a cinematic camera hides it.
  // Both go through the exact same walk-and-interact function.
  const btn=page.locator('[data-quick-action="'+id+'"]');
  assert(await btn.isVisible(),"Game action "+id+" is not reachable in "+d.id);
  await btn.click({timeout:8000});
 };
 try{
  await page.goto("http://127.0.0.1:4173/card-battle/anima-paintover-lab.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.PaintoverStudio?.loadedActor&&
    window.PaintoverStudio?.frameCount>4&&window.HallGame?.markerCount===4,null,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.HallGame.room),"hall");
  assert(await page.locator("#game-hud").isVisible());
  assert.equal(await page.locator("#whitebox").isVisible(),false);
  const first=await page.evaluate(()=>{
   const rect=document.querySelector(".stage").getBoundingClientRect(),g=window.HallGame;
   return {room:g.room,markers:g.markerCount,npcLoaded:g.npcLoaded,
    drawCalls:window.PaintoverStudio.drawCalls,
    stageHeight:rect.height,viewportHeight:innerHeight,
    overflowX:document.documentElement.scrollWidth-innerWidth,
    overflowY:document.documentElement.scrollHeight-innerHeight};
  });
  assert.equal(first.markers,4);
  assert(await page.locator('[data-quick-action="table"]').isVisible(),"Handwritten note must be reachable through player UI");
  assert(await page.locator('[data-hotspot="table"]').isVisible(),"At least one projected physical prop marker must be visible");
  assert(first.stageHeight>=d.h*.95,"real playable scene must fill game viewport");
  assert(first.overflowX<=2&&first.overflowY<=2,"game stage must not scroll");
  await shot("01-hall-first-playable-frame");
  // Screen-space click on the actual WebGL canvas must move actor via
  // ground-plane ray and A* (not a CSS avatar animation).
  const before=await page.evaluate(()=>window.HallGame.position);
  const rect=await page.locator("#world").boundingBox();
  await page.locator("#world").click({position:{x:rect.width*.62,y:rect.height*.76}});
  await page.waitForFunction(a=>{
   const b=window.HallGame.position;
   return Math.hypot(a.x-b.x,a.z-b.z)>.18;
  },before,{timeout:13000});
  await shot("02-tap-to-walk");
  // Access the real in-world buttons, wait for A* travel, then storyline.
  await clickHotspot("table");
  await page.waitForFunction(()=>window.HallGame.clues.paper&&window.HallGame.dialogueOpen,null,{timeout:25000});
  assert.match(await page.locator("#game-message").textContent(),/手札|纸页/);
  await shot("03-table-investigation-dialogue");
  await page.locator("#game-dialogue-next").click();
  await clickHotspot("window");
  await page.waitForFunction(()=>window.HallGame.clues.symbol&&window.HallGame.dialogueOpen,null,{timeout:25000});
  assert.match(await page.locator("#game-message").textContent(),/彩窗|符号/);
  await page.locator("#game-dialogue-next").click();
  assert.deepEqual(await page.evaluate(()=>window.HallGame.clues),{paper:true,symbol:true});
  await shot("04-two-clues-found");
  await clickHotspot("door");
  await page.waitForFunction(()=>window.HallGame.room==="corridor",null,{timeout:25000});
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(()=>window.HallGame.markerCount),3);
  assert(await page.locator("#game-location").textContent()==="古堡长廊");
  await shot("05-real-3d-corridor-after-opening-door");
  await clickHotspot("bell");
  await page.waitForFunction(()=>window.HallGame.dialogueOpen,null,{timeout:24000});
  assert.match(await page.locator("#game-message").textContent(),/钟铃|第三声/);
  await shot("06-corridor-bell-dialogue");
  await page.locator("#game-dialogue-next").click();
  // From corridor stone gate into an ACTUAL independent Three.js courtyard.
  await clickHotspot("sealed");
  await page.waitForFunction(()=>window.HallGame.room==="courtyard"&&window.HallGame.courtyardVisible,null,{timeout:25000});
  await page.waitForTimeout(650);
  assert.equal(await page.evaluate(()=>window.HallGame.markerCount),4);
  assert.equal(await page.locator("#game-location").textContent(),"月下古堡庭院");
  const actualCourtyard=await page.evaluate(()=>({roomCount:window.HallGame.roomCount,
   sceneMeshes:window.HallGame.courtyardMeshCount,
   props:window.HallGame.courtyardPropNames}));
  assert.equal(actualCourtyard.roomCount,3,"three actual playable 3D scene groups");
  assert(actualCourtyard.sceneMeshes>45,"courtyard must be actual geometry, not a flat picture");
  assert(actualCourtyard.props.includes("fountain")&&actualCourtyard.props.includes("dead-tree"));
  await shot("07-real-3d-moonlit-courtyard");
  await clickHotspot("fountain");
  await page.waitForFunction(()=>window.HallGame.dialogueOpen,null,{timeout:25000});
  assert.match(await page.locator("#game-message").textContent(),/喷泉|石盆/);
  await shot("08-courtyard-fountain-investigation");
  await page.locator("#game-dialogue-next").click();
  await clickHotspot("courtyardBack");
  await page.waitForFunction(()=>window.HallGame.room==="corridor",null,{timeout:25000});
  await page.waitForTimeout(650);
  await shot("09-return-from-courtyard-to-corridor");
  await clickHotspot("return");
  await page.waitForFunction(()=>window.HallGame.room==="hall",null,{timeout:25000});
  await page.waitForTimeout(650);
  await shot("10-return-to-hall-persistent-clues");
  assert.deepEqual(await page.evaluate(()=>window.HallGame.clues),{paper:true,symbol:true});
  assert.equal(await page.evaluate(()=>window.HallGame.transitions),4);
  assert.deepEqual(errors,[],"No WebGL/audio/JS runtime errors");
  console.log("PASS playable Fading Hall",d.id,first);
  results.push({device:d.id,pass:true,first,
    ending:await page.evaluate(()=>({room:window.HallGame.room,
     clues:window.HallGame.clues,transitions:window.HallGame.transitions}))});
 }catch(e){
  console.error("FAIL playable Fading Hall",d.id,e.stack||e);
  await shot("ERROR").catch(()=>{});
  results.push({device:d.id,pass:false,error:String(e.stack||e),errors});
 }finally{await context.close()}
}
await browser.close();
fs.writeFileSync(out+"/results.json",JSON.stringify(results,null,2));
assert(results.every(r=>r.pass),"Playable 3D chapter failed on at least one viewport");
