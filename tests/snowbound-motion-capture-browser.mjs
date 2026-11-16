/* Real Chromium cinematic captures and semantic event/timeline assertions. */
import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const OUT="artifacts/snowbound-motion-v2";
fs.mkdirSync(OUT+"/videos",{recursive:true});
const scenarios=[
 {name:"desktop-1920x1080",width:1920,height:1080,touch:false},
 {name:"portrait-390x844",width:390,height:844,touch:true}
];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const results=[];
for(const cfg of scenarios){
 const context=await browser.newContext({
  viewport:{width:cfg.width,height:cfg.height},
  deviceScaleFactor:1,isMobile:cfg.touch,hasTouch:cfg.touch,
  recordVideo:{dir:OUT+"/videos",size:{width:cfg.width,height:cfg.height}}
 });
 const page=await context.newPage(),pageErrors=[];
 page.on("pageerror",err=>pageErrors.push(err.message));
 const idle=()=>page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),null,{timeout:22000});
 const click=async act=>{await page.locator('[data-act="'+act+'"]:visible:not([disabled])').first().click();await idle()};
 try{
  await page.goto("http://127.0.0.1:4173/card-battle/snowbound-journey.html",{waitUntil:"networkidle"});
  await idle();
  await click("town");await click("new");await click("leader");
  await page.locator('[data-act="node"]:visible:not([disabled])').first().click();
  assert(await page.evaluate(()=>window.PaperchalkSnowboundUI.motion.isBusy()),"battle intro should animate");
  await page.screenshot({path:OUT+"/"+cfg.name+"-intro-start.png"});
  await page.waitForTimeout(240);
  await page.screenshot({path:OUT+"/"+cfg.name+"-intro-mid.png"});
  await idle();
  await page.screenshot({path:OUT+"/"+cfg.name+"-intro-final.png"});
  const game=()=>page.evaluate(()=>window.PaperchalkSnowboundUI.state);
  assert.equal((await game()).screen,"battle");
  const traceIntro=await page.evaluate(()=>window.PaperchalkSnowboundUI.motion.trace());
  assert(traceIntro.some(t=>t.event==="transaction"&&t.stage==="begin"&&t.detail.includes("battleIntro")));
  let attack=false,count=0;
  for(;count<5;count++){
   if((await game()).screen!=="battle")break;
   await page.locator('[data-act="endturn"]:visible:not([disabled])').first().click();
   await page.waitForTimeout(70);
   if(await page.evaluate(()=>!!document.querySelector(".motion-cinema")))
     await page.screenshot({path:OUT+"/"+cfg.name+"-turn-animation.png"});
   await idle();
   const log=await page.evaluate(()=>window.PaperchalkSnowboundUI.motion.trace());
   if(log.some(t=>t.stage==="impact")){attack=true;break;}
  }
  assert(attack,"at least one auto attack with distinct impact frame");
  const timeline=await page.evaluate(()=>window.PaperchalkSnowboundUI.motion.trace());
  const impacts=timeline.filter(x=>x.stage==="impact"),starts=timeline.filter(x=>x.stage==="start");
  assert(impacts.length>=1&&starts.length>=1);
  assert(impacts[0].t>=starts[0].t,"hit cannot precede start");
  await page.screenshot({path:OUT+"/"+cfg.name+"-post-attack.png"});
  // Harness-only jump; merchant UX below uses actual UI clicks.
  await page.evaluate(()=>{const g=window.PaperchalkSnowboundUI.engine;g.finishNode();window.PaperchalkSnowboundUI.render()});
  await page.locator('[data-act="node"]:visible:not([disabled])').first().click();
  await idle();
  if((await game()).screen==="recruit"){await page.locator('[data-act="claim"]:visible:not([disabled])').first().click();await idle();}
  await page.locator('[data-act="node"]:visible:not([disabled])').first().click();
  await idle();
  assert.equal((await game()).screen,"shop");
  const cashBefore=(await game()).run.gold;
  await page.locator('[data-act="shopinspect"]').first().click();
  assert(await page.locator(".shop-inspect-backdrop").isVisible());
  assert.equal((await game()).run.gold,cashBefore,"inspection must not spend gold");
  await page.screenshot({path:OUT+"/"+cfg.name+"-shop-inspect.png"});
  await page.locator('[data-act="shopcancel"]').last().click();
  assert.equal((await game()).run.gold,cashBefore);
  await page.locator('[data-act="shopinspect"]').first().click();
  await page.locator('[data-act="shopconfirm"]').click();
  assert((await game()).run.gold<cashBefore,"only confirmation purchases");
  await idle();
  assert.equal(await page.locator(".shop-inspect-backdrop").count(),0);
  await page.screenshot({path:OUT+"/"+cfg.name+"-shop-purchased.png"});
  const lastTrace=await page.evaluate(()=>window.PaperchalkSnowboundUI.motion.trace());
  assert(lastTrace.some(t=>t.event==="transaction"&&t.stage==="begin"&&t.detail.includes("shopPurchase")));
  assert.deepEqual(pageErrors,[]);
  const result={name:cfg.name,passed:true,impactCount:impacts.length,playedTurns:count+1,
   goldBefore:cashBefore,goldAfter:(await game()).run.gold,trace:lastTrace,
   videoPath:await page.video()?.path()};
  fs.writeFileSync(OUT+"/"+cfg.name+"-trace.json",JSON.stringify(result,null,2));
  results.push(result);
  console.log("PASS cinematic "+cfg.name+" | intro, impact, inspect/cancel/confirm, video");
 }catch(e){
  results.push({name:cfg.name,passed:false,error:String(e.stack||e),pageErrors});
  await page.screenshot({path:OUT+"/"+cfg.name+"-FAIL.png"}).catch(()=>{});
  console.error("FAIL cinematic "+cfg.name+" "+e.stack,pageErrors);
 }finally{await context.close()}
}
fs.writeFileSync(OUT+"/summary.json",JSON.stringify(results.map(({trace,...rest})=>rest),null,2));
await browser.close();
assert(results.every(x=>x.passed),"cinematic browser test failed");
console.log("ALL CINEMATIC BROWSER RECORDINGS COMPLETE");
