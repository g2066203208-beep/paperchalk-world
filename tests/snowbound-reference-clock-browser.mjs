/* Compare actual browser performance timestamps with verified source clocks.
 * Source assets are NOT redistributed. Only the existing original game art
 * is filmed. Promo montage cuts are not attributed to in-game frame timings.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const OUT="artifacts/snowbound-motion-reference-clocks";
fs.mkdirSync(OUT+"/videos",{recursive:true});
const cfgs=[
 {name:"desktop-1920",width:1920,height:1080,touch:false},
 {name:"portrait-390",width:390,height:844,touch:true}
];
const FRAME=1000/60;
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const results=[];
function requireClock(trace,name,stages,speed,tolerance=110){
 const a=trace.filter(m=>m.event===name);
 assert(a.length>=stages.length,name+" missing source-frame marks "+JSON.stringify(a));
 for(const [stage,ms] of stages){
  const m=a.find(t=>t.stage===stage);
  assert(m,name+" missing phase "+stage);
  const actual=m.t-a[0].t,expected=ms/speed;
  assert(Math.abs(actual-expected)<=tolerance,
   name+" "+stage+" at "+actual.toFixed(1)+"ms; expected "+expected.toFixed(1)+" ±"+tolerance+"ms at "+speed+"x");
 }
 return a.map(m=>({stage:m.stage,t:+(m.t-a[0].t).toFixed(1)}));
}
for(const cfg of cfgs){
 const context=await browser.newContext({
  viewport:{width:cfg.width,height:cfg.height},deviceScaleFactor:1,
  isMobile:cfg.touch,hasTouch:cfg.touch,
  recordVideo:{dir:OUT+"/videos",size:{width:cfg.width,height:cfg.height}}
 });
 const page=await context.newPage();const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto("http://127.0.0.1:4173/card-battle/snowbound-journey.html",{waitUntil:"networkidle"});
  for(const act of ["town","new","leader","node"]){
   await page.locator('[data-act="'+act+'"]:visible:not([disabled])').first().click();
   await page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),null,{timeout:16000});
  }
  await page.waitForFunction(()=>[...document.querySelectorAll(".stage-actor .unit-art img")]
    .every(i=>i.dataset.cutoutReady==="1"),null,{timeout:12000});
  const clocks=await page.evaluate(()=>window.PaperchalkMotion.REFERENCE_CLOCK);
  assert.equal(clocks.balatroHand.frames,35);assert.equal(clocks.balatroHand.fps,12.5);
  assert.equal(clocks.balatroHand.totalMs,2800);
  assert.equal(clocks.slotsAttack.frames,16);assert.equal(clocks.slotsAttack.fps,60);
  function runScene(type,speed){
   // Direct use of the same motion director running in the actual web game,
   // with a display-only semantic event; no fake pre-rendered frame assets.
   return page.evaluate(async(args)=>{
    const app=document.querySelector("#app");
    const d=window.PaperchalkMotion.create({app,getSoundEnabled:()=>false});
    d.setSpeed(args.speed);
    const snap=d.capture();
    const state=window.PaperchalkSnowboundUI.state.run.battle;
    let cues;
    if(args.type==="hand")cues=[{type:"redraw"}];
    else if(args.type==="score")cues=[{type:"victory",gold:50}];
    else{
     const source=state.allies.find(u=>u.hp>0),target=state.foes.find(u=>u.hp>0);
     if(!source||!target)throw Error("no live stage actors for motion reference check");
     cues=[{type:"attack",actorId:source.uid,targetId:target.uid,actorSide:"friendly",
       kind:"gun",damage:1,hpAfter:target.hp-1,lethal:false}];
    }
    await d.play(snap,{visualEvents:cues},"battle");
    return {trace:d.trace(),lastError:d.lastError()};
   },{type,speed});
  }
  for(const speed of [1,2]){
   const hand=runScene("hand",speed);
   await page.waitForFunction(()=>!!document.querySelector(".motion-draw-card .motion-draw-back"),null,{timeout:4000});
   const handWAAPI=await page.evaluate(()=>{
    const card=document.querySelector(".motion-draw-card");
    const back=card?.querySelector(".motion-draw-back");
    return {deal:card?.getAnimations()?.[0]?.effect?.getTiming(),
      flip:back?.getAnimations()?.[0]?.effect?.getTiming()};
   });
   assert(handWAAPI.deal&&handWAAPI.flip,"real card and card-back compositor keyframe animations are required");
   assert(Math.abs(handWAAPI.deal.delay-1040/speed)<=2,
    "source F13 first deal must begin at actual 1040ms at 1x");
   assert(Math.abs(handWAAPI.flip.delay-2160/speed)<=2,
    "source F27 face reveal must begin at actual 2160ms at 1x");
   await page.waitForTimeout(Math.round(1430/speed));
   const ghostCount=await page.locator(".motion-cinema .motion-draw-card").count();
   assert(ghostCount>=2,"new hand must animate its real game card artwork");
   await page.screenshot({path:OUT+"/"+cfg.name+"-hand-"+speed+"x-draw.jpg",type:"jpeg",quality:76});
   const h=await hand;assert.equal(h.lastError,null);
   const handTrace=requireClock(h.trace,"reference-hand",[
    ["F00-start",0],["F04-exit",320],["F13-draw",1040],
    ["F27-flip",2160],["F35-end",2800]],speed,185);
   const attackJob=runScene("attack",speed);
   await page.waitForFunction(()=>!!document.querySelector(".motion-strike-slash"),null,{timeout:4000});
   const slashWAAPI=await page.evaluate(()=>document.querySelector(".motion-strike-slash")
    .getAnimations()[0]?.effect?.getTiming());
   assert(slashWAAPI,"real attack slash must have a compositor animation");
   assert(Math.abs(slashWAAPI.delay-100/speed)<=2,
    "visual flash must start at source video frame F06, including 2x");
   assert(Math.abs(slashWAAPI.duration-(10*FRAME)/speed)<=2,
    "actual 60fps slash tween must last ten original source frames");
   const attack=await attackJob;
   assert.equal(attack.lastError,null);
   const attackTrace=requireClock(attack.trace,"reference-attack",[
    ["F00-light",0],["F06-flash",6*FRAME],
    ["F10-impact",10*FRAME],["F16-tail-end",16*FRAME]],speed,72);
   const scoreJob=runScene("score",speed);
   await page.waitForFunction(()=>!!document.querySelector(".motion-score-surge"),null,{timeout:4000});
   const scoreWAAPI=await page.evaluate(()=>document.querySelector(".motion-score-surge")
    .getAnimations()[0]?.effect?.getTiming());
   assert(scoreWAAPI&&Math.abs(scoreWAAPI.duration-700/speed)<=2,
    "native compositor score burst must match seven 100ms GIF frames");
   const score=await scoreJob;
   assert.equal(score.lastError,null);
   const scoreTrace=requireClock(score.trace,"reference-score",[
    ["F46-burst-start",0],["F53-burst-end",700]],speed,75);
   results.push({viewport:cfg.name,speed,passed:true,
    sourceHandMs:2800,sourceAttackCoreMs:16*FRAME,sourceScoreBurstMs:700,ghostCount,
    measuredHand:handTrace,measuredAttack:attackTrace,measuredScore:scoreTrace,
    compositor:{dealDelayMs:handWAAPI.deal.delay,flipDelayMs:handWAAPI.flip.delay,
      slashDelayMs:slashWAAPI.delay,slashDurationMs:slashWAAPI.duration,
      scoreDurationMs:scoreWAAPI.duration}});
   console.log("PASS "+cfg.name+" "+speed+"x; real hand, impact and score original source-clock stages",
    handTrace,attackTrace,scoreTrace);
  }
  assert.deepEqual(errors,[],"browser runtime errors");
 }catch(err){
  console.error("FAIL "+cfg.name,err.stack||err,errors);
  results.push({viewport:cfg.name,passed:false,error:String(err.stack||err),errors});
  await page.screenshot({path:OUT+"/"+cfg.name+"-FAILED.png"}).catch(()=>{});
 }finally{
  await context.close();
 }
}
fs.writeFileSync(OUT+"/results.json",JSON.stringify(results,null,2));
await browser.close();
assert(results.every(r=>r.passed),"Source-speed browser motion QA failed");
console.log("ALL ACTUAL SOURCE-SPEED BROWSER PLAYBACK CHECKS PASSED");
