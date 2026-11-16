/* Dedicated first-phase scene and drag tests. Screenshots are captured from
 * a real Chromium viewport after full visual layout and pointer interactions.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const OUT="artifacts/snowbound-phase1";
fs.mkdirSync(OUT,{recursive:true});
const cases=[
 {id:"desktop-1920x1080",width:1920,height:1080,mobile:false},
 {id:"laptop-1366x768",width:1366,height:768,mobile:false},
 {id:"phone-landscape-844x390",width:844,height:390,mobile:true},
 {id:"phone-portrait-390x844",width:390,height:844,mobile:true},
 {id:"tablet-1024x768",width:1024,height:768,mobile:true}
];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const results=[];
for(const cfg of cases){
 const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},isMobile:cfg.mobile,hasTouch:cfg.mobile,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",err=>errors.push(err.message));
 try{
  await page.goto("http://127.0.0.1:4173/card-battle/snowbound-journey.html",{waitUntil:"networkidle"});
  for(const act of ["town","new","leader","node"]){
   await page.locator('[data-act="'+act+'"]:visible:not([disabled])').first().click();
   await page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),null,{timeout:14000});
  }
  await page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),null,{timeout:14000});
  await page.waitForFunction(()=>[...document.querySelectorAll(".stage-actor .unit-art img")].every(i=>i.dataset.cutoutReady==="1"),null,{timeout:12000});
  await page.waitForTimeout(80);
  const state=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run.battle);
  assert(state.allies.length>=1,"hunter art loaded");
  const rows=await page.locator(".double-board .battle-grid").count();
  assert.equal(rows,2,"2 horizontal lanes");
  assert.equal(await page.locator(".double-board .battle-slot").count(),12);
  const heroBefore=state.allies.find(u=>u.leader);
  const src=page.locator('.battle-unit.friendly[data-id="'+heroBefore.uid+'"]');
  const destination=page.locator('.battle-slot[data-side="friendly"][data-slot="3"]');
  await page.evaluate(()=>{
    window.__snowboundDragAudit=[];
    for(const type of ["pointerdown","pointermove","pointerup","pointercancel","click"]){
      document.addEventListener(type,e=>{
        if(window.__snowboundDragAudit.length>60)return;
        window.__snowboundDragAudit.push({type,x:e.clientX,y:e.clientY,id:e.pointerId,
          origin:e.target?.closest?.(".battle-unit")?.dataset?.id||null,
          slot:e.target?.closest?.(".battle-slot")?.dataset?.slot||null});
      },true);
    }
  });
  await src.dragTo(destination,{force:true,timeout:15000});
  await page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),null,{timeout:14000});
  const moved=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run.battle.allies.find(u=>u.leader).slot);
  if(moved!==3){
    const diag=await page.evaluate(()=>({
      pointerEvents:window.__snowboundDragAudit,
      toast:document.getElementById("toast")?.textContent,
      slots:[...document.querySelectorAll(".battle-slot[data-side='friendly']")].map(el=>{
        const r=el.getBoundingClientRect();
        return {slot:el.dataset.slot,x:r.x,y:r.y,w:r.width,h:r.height,centerHit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.className};
      })
    }));
    console.log("DRAG_DIAG "+cfg.id+" "+JSON.stringify(diag));
  }
  assert.equal(moved,3,"drag ally across rows from upper front to lower front");
  const handBefore=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run.battle.hand.length);
  const cards=await page.locator('.battle-bottom .hand>button').all();
  const handState=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run.battle.hand.map(c=>c.id));
  const attackIds=["bolt","silver","snow","frost","pierce"];
  let i=handState.findIndex(id=>attackIds.includes(id));
  assert(i>=0,"at least one targeted card in initial hand");
  const source=page.locator('.battle-bottom .hand>button').nth(i);
  const target=page.locator('.battle-unit.enemy').first();
  await source.dragTo(target,{force:true,timeout:15000});
  await page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),null,{timeout:14000});
  const after=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run.battle);
  assert.equal(after.playsLeft,0,"drag-to-foe uses tactical card");
  assert.equal(after.hand.length,handBefore-1,"drag uses one card");
  assert.deepEqual(errors,[],"no runtime errors");
  const stageMetrics=await page.evaluate(()=>{
   const r=el=>{const p=el.getBoundingClientRect();return {x:+p.x.toFixed(1),y:+p.y.toFixed(1),w:+p.width.toFixed(1),h:+p.height.toFixed(1),right:+p.right.toFixed(1),bottom:+p.bottom.toFixed(1)}};
   return {viewport:{w:innerWidth,h:innerHeight},scene:r(document.querySelector(".battle-scene")),
    board:r(document.querySelector(".double-board")),cards:[...document.querySelectorAll(".battle-unit")].map(r),
    buttons:[...document.querySelectorAll(".battle-bottom button")].map(r),
    noDocumentOverflow:document.documentElement.scrollWidth<=innerWidth+3};
  });
  assert(stageMetrics.noDocumentOverflow,"no page-level mobile overflow");
  await page.screenshot({path:OUT+"/"+cfg.id+"-after-drag.png",fullPage:true});
  results.push({id:cfg.id,passed:true,heroMovedTo:moved,cardConsumed:true,stageMetrics});
  console.log("PASS "+cfg.id+" | ally drag, card drag, 12 slots, no overflow");
 }catch(err){
  await page.screenshot({path:OUT+"/"+cfg.id+"-FAIL.png",fullPage:true}).catch(()=>{});
  results.push({id:cfg.id,passed:false,error:String(err.stack||err),errors});
  console.error("FAIL "+cfg.id,err.stack||err,errors);
 }finally{await context.close();}
}
fs.writeFileSync(OUT+"/result.json",JSON.stringify(results,null,2));
await browser.close();
assert(results.every(x=>x.passed),"One or more drag interaction viewports failed");
console.log("ALL FIRST-STAGE CHROMIUM DRAG QA PASSED");
