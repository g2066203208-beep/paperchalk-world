/* Real reference-inspired original gold payout test.
 * Three viewport sizes, repeatable fixed-ms rendering, real chrome/WebGL
 * screenshot + WebM, actual reel win and existing Snowbound game overlay.
 * Independent source reference is linked in docs, not falsely pixel-matched.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {chromium} from "playwright";

const out="artifacts/slot-daggers-coin-fx";
fs.mkdirSync(out+"/videos",{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 "--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"
]});
const devices=[
 {name:"desktop-1920x1080",w:1920,h:1080,mobile:false},
 {name:"phone-390x844",w:390,h:844,mobile:true},
 {name:"landscape-844x390",w:844,h:390,mobile:true}
];
const sha=b=>createHash("sha256").update(b).digest("hex");
const result=[];
for(const d of devices){
 const context=await browser.newContext({viewport:{width:d.w,height:d.h},deviceScaleFactor:1,
  isMobile:d.mobile,hasTouch:d.mobile,recordVideo:{dir:out+"/videos",size:{width:d.w,height:d.h}}});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.stack||e.message));
 try{
  const r=await page.goto("http://127.0.0.1:4173/card-battle/coin-fx-lab.html",{waitUntil:"networkidle"});
  assert.equal(r.status(),200);
  assert(await page.locator("#payout").isVisible());
  assert.equal(await page.locator(".reel").count(),3,"game needs three physical slot reel windows");
  await page.screenshot({path:out+"/"+d.name+"-00-physical-slot-machine-rest.png"});
  await page.locator("#payout").click();
  await page.waitForFunction(()=>window.PaperchalkCoinCascade?.played===1, null,{timeout:7000});
  assert.deepEqual(await page.locator(".reel").allTextContents(),["◈","◈","◈"],
   "three matching coin symbols must trigger the prize");
  // Allow asynchronous DOM wallet number tween to complete. The shader
  // timeline is subsequently rendered in deterministic fixed-step seconds.
  await page.waitForTimeout(3060);
  assert.equal(await page.locator("#balance").textContent(),"0048",
    "money counter must count up in sync with physical payout");
  const checkpoints=[
   [0,"01-before-ejection"],[120,"02-nozzle"],[280,"03-rim-flip"],
   [480,"04-warm-softbox-highlight"],[700,"05-first-impact"],
   [980,"06-bounce-and-scatter"],[1380,"07-rolling-and-specular"],
   [1920,"08-tray-settling"],[2310,"09-gather-to-wallet"],
   [2640,"10-final-payout"]
  ];
  const frames=[],hashes=[];
  for(const [ms,label] of checkpoints){
   assert(await page.evaluate(ms=>window.PaperchalkCoinLab.frame(ms),ms),
    "seek must allow true exact-timestamp screenshots");
   const inspect=await page.evaluate(()=>window.PaperchalkCoinCascade.inspect());
   assert(Math.abs(inspect.timeMs-ms)<7, "cannot reproduce requested deterministic frame at "+ms);
   const bytes=await page.screenshot({path:out+"/"+d.name+"-"+label+".png",animations:"disabled"});
   frames.push({ms,label,inspect,hash:sha(bytes)});
   hashes.push(sha(bytes));
  }
  assert(new Set(hashes).size>=7,"coins must visibly move between sampled physical frames");
  assert(frames.some(x=>x.inspect.impacts>=10),"coins must physically bounce against tray");
  assert(frames.some(x=>x.inspect.glints>=1),"specular sparkles must actually appear");
  // Browser compositor / text polling is not the GPU physics clock.
  // Compare the COMPLETE seeded particle simulation data at frame 480
  // rather than incorrectly asserting the whole HTML page's PNG bytes.
  const physicsA=await page.evaluate(()=>{
   window.PaperchalkCoinLab.frame(480);
   return window.PaperchalkCoinCascade.inspect();
  });
  await page.screenshot({path:out+"/"+d.name+"-13-repeatability-A-480ms.png",animations:"disabled"});
  const physicsB=await page.evaluate(()=>{
   window.PaperchalkCoinLab.frame(480);
   return window.PaperchalkCoinCascade.inspect();
  });
  await page.screenshot({path:out+"/"+d.name+"-14-repeatability-B-480ms.png",animations:"disabled"});
  assert.deepEqual(physicsA,physicsB,
   "same seed & frame time must reproduce each coin coordinate, rotation, hit and highlight state");
  const proof=await page.evaluate(()=>{
   const fx=window.PaperchalkCoinCascade;
   const c=fx.canvas,gl=c?.getContext("webgl");
   return {played:fx.played,shader:gl?.getParameter(gl.CURRENT_PROGRAM)!==null,
    seed:fx.seed,simulatedMs:fx.simulatedMs,
    size:[gl?.drawingBufferWidth,gl?.drawingBufferHeight],
    glints:fx.reflectionGlints,impacts:fx.impacts};
  });
  assert(proof.shader,"material reflection must be real WebGL, not CSS circles");
  assert(proof.size[0]>=d.w*.98&&proof.size[1]>=d.h*.98,
   "physical metallic WebGL buffer must cover the viewport");
  await page.locator("#few").click();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.PaperchalkCoinCascade.lastBurst.count),12);
  await page.locator("#many").click();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.PaperchalkCoinCascade.lastBurst.count),
   d.mobile&&d.w<=600?76:76);
  await page.evaluate(()=>window.PaperchalkCoinLab.frame(600));
  await page.screenshot({path:out+"/"+d.name+"-11-jackpot-76-metal-coins.png"});
  assert.deepEqual(errors,[],"actual WebGL slot machine must not throw JS errors");
  // Render actual game's module on actual UI (Snowbound gold + victory call
  // it from game state in normal play; this test uses one isolated trigger).
  await page.goto("http://127.0.0.1:4173/card-battle/snowbound-journey.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>typeof window.PaperchalkCoinCascade?.burst==="function",
   null,{timeout:10000});
  await page.evaluate(()=>window.PaperchalkCoinCascade.burst({
   count:38,seed:20261118,x:innerWidth*.42,y:innerHeight*.30,
   floorY:innerHeight*.74,sound:false
  }));
  await page.evaluate(()=>window.PaperchalkCoinCascade.seek(700));
  await page.screenshot({path:out+"/"+d.name+"-12-inside-actual-snowbound-game.png"});
  assert.deepEqual(errors,[],"original Snowbound game + gold effect must not throw errors");
  result.push({viewport:d.name,passed:true,frames,proof});
  console.log("PASS gold casino payout",d.name,
   JSON.stringify({seed:proof.seed,samples:frames.length,
     maxImpacts:Math.max(...frames.map(f=>f.inspect.impacts)),
     maxGlints:Math.max(...frames.map(f=>f.inspect.glints))}));
 }catch(e){
  result.push({viewport:d.name,passed:false,error:String(e.stack||e),errors});
  console.error("FAIL gold casino payout",d.name,e.stack||e);
  await page.screenshot({path:out+"/"+d.name+"-FAIL.png"}).catch(()=>{});
 }finally{await context.close();}
}
await browser.close();
fs.writeFileSync(out+"/results.json",JSON.stringify(result,null,2));
assert(result.every(x=>x.passed),"At least one device failed to show real metallic coin payout");
