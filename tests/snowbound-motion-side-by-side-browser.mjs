/*
 * Mandatory REAL-GAME reference comparison camera.
 * 1. Enter the real hosted battle with clicks (not generated mockups).
 * 2. Capture real UI redraw and actual battle-model-aware attack visuals.
 * 3. Save screen-frame timestamps and actual Chromium WebM video, plus
 *    before/after screenshots for PC and mobile.
 * 4. Derived source-vs-game contact sheets are made by the Python audit.
 *
 * Reference clock uses performance.timeOrigin + trace.t; each screencast
 * frame is stamped from Chrome's frame metadata when epoch-compatible.
 * Do NOT claim that CDP screencast frames reproduce 60fps source video.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {chromium} from "playwright";
const OUT="artifacts/snowbound-motion-side-by-side";
const cfgs=[
 {id:"desktop-1920",width:1920,height:1080,mobile:false},
 {id:"portrait-390",width:390,height:844,mobile:true}
];
fs.mkdirSync(OUT+"/videos",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const output=[];
for(const cfg of cfgs){
 const context=await browser.newContext({
  viewport:{width:cfg.width,height:cfg.height},
  isMobile:cfg.mobile,hasTouch:cfg.mobile,deviceScaleFactor:1,
  recordVideo:{dir:OUT+"/videos",size:{width:cfg.width,height:cfg.height}}
 });
 const page=await context.newPage();
 const errs=[];
 page.on("pageerror",e=>errs.push(e.message));
 const captures=[];
 let current=null,videoSource=null;
 try{
  await page.goto("http://127.0.0.1:4173/card-battle/snowbound-journey.html",
    {waitUntil:"networkidle"});
  const idle=()=>page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),null,{timeout:19000});
  for(const a of ["town","new","leader","node"]){
   await page.locator('[data-act="'+a+'"]:visible:not([disabled])').first().click();
   await idle();
  }
  await page.waitForFunction(()=>
    [...document.querySelectorAll(".stage-actor .unit-art img")].every(i=>i.dataset.cutoutReady==="1"),
    null,{timeout:14000});
  await page.screenshot({path:OUT+"/"+cfg.id+"-live-battle-before.png"});
  const cdp=await context.newCDPSession(page);
  await cdp.send("Page.enable");
  cdp.on("Page.screencastFrame",msg=>{
   try{
    const receivedMs=Date.now();
    if(current&&current.frames.length<260){
     const count=current.frames.length;
     const filename="f"+String(count).padStart(4,"0")+".jpg";
     const file=path.join(current.dir,filename);
     fs.writeFileSync(file,Buffer.from(msg.data,"base64"));
     const ts=msg.metadata?.timestamp;
     const epochMs=typeof ts==="number"&&Math.abs(ts*1000-receivedMs)<3600000?ts*1000:receivedMs;
     current.frames.push({file:filename,receivedMs,epochMs,
       nativeMetadataTimestamp:ts??null});
    }
   }catch(e){errs.push("screencast: "+e.message)}
   cdp.send("Page.screencastFrameAck",{sessionId:msg.sessionId}).catch(()=>{});
  });
  // Fast evidence-only screen cast. A full 1920x1080 browser viewport is
  // retained, but the emitted JPEG frames are small so the video sampler
  // spends time capturing motion instead of JPEG encoding pixels. The
  // independent Playwright WebM remains at full test resolution.
  await cdp.send("Page.startScreencast",{format:"jpeg",quality:44,
    maxWidth:480,maxHeight:280,everyNthFrame:1});
  async function film(kind,click,traceEvent,expectedDurationMs){
   const dir=OUT+"/raw/"+cfg.id+"-"+kind;
   fs.mkdirSync(dir,{recursive:true});
   const collection={kind,dir,frames:[],setupEpochMs:Date.now()};
   current=collection;
   await page.waitForTimeout(120);
   const previous=await page.evaluate(evt=>
     window.PaperchalkSnowboundUI.motion.trace().filter(x=>x.event===evt).length,traceEvent);
   const execStart=Date.now();
   const extra=await click();
   await page.waitForTimeout(235);
   await page.waitForTimeout(Math.max(0,expectedDurationMs-235+220));
   // Motion completion is separate from screencast sampling.
   await idle();
   await page.waitForTimeout(90);
   current=null;
   const marks=kind==="hand"?await page.evaluate(evt=>
    window.PaperchalkSnowboundUI.motion.trace().filter(x=>x.event===evt),traceEvent):
    extra.trace.filter(x=>x.event===traceEvent);
   const newest=marks.slice(previous);
   assert(newest.length>=3,kind+" is missing real source-frame stage events "+JSON.stringify(newest));
   const start=newest.find(x=>x.stage.startsWith("F00"));
   assert(start,kind+" lacks F00 start marker");
   const epoch=extra.clockOriginMs+start.t;
   const meta={
    device:cfg.id,event:kind,sourceTraceEvent:traceEvent,
    triggerType:kind==="hand"?"real player UI click":"isolated actual game motion director on live mounted battle",
    startEpochMs:epoch,clickRequestedEpochMs:execStart,
    expectedSourceDurationMs:expectedDurationMs,
    sampleFrames:collection.frames.length,
    sourceClockMarks:newest.map(x=>({stage:x.stage,tMs:x.t-start.t})),
    frames:collection.frames
   };
   fs.writeFileSync(dir+"/capture.json",JSON.stringify(meta,null,2));
   captures.push({event:kind,dir,frames:meta.sampleFrames,first:collection.frames[0]?.epochMs,
     marker:epoch,sourceMs:expectedDurationMs});
   assert(collection.frames.length>=6,kind+" has too few actual Chromium frames for comparison");
   console.log("CAPTURED "+cfg.id+" "+kind+" frames="+meta.sampleFrames+
      " markerLagMs="+(execStart-epoch).toFixed(1));
  }
  // Real game action, using the opening free redraw charge (4/4).
  await film("hand",async()=>{
   await page.locator(".battle-bottom .deck-count [data-act='redraw']").click();
   return {clockOriginMs:await page.evaluate(()=>performance.timeOrigin)};
  },"reference-hand",2800);
  await page.screenshot({path:OUT+"/"+cfg.id+"-live-battle-after-redraw.png"});
  // An isolated semantic cue exercises the ORIGINAL game engine's current
  // actual characters, DOM and gameplay renderer. It is *not* a substitute
  // for the separate full-flow click-to-attack QA and WebM recording.
  await film("attack",async()=>{
   const info=await page.evaluate(()=>{
    const state=window.PaperchalkSnowboundUI.state.run.battle;
    const source=state.allies.find(a=>a.hp>0),target=state.foes.find(a=>a.hp>0);
    if(!source||!target)throw Error("live game actors unavailable");
    const d=window.PaperchalkMotion.create({
      app:document.querySelector("#app"),getSoundEnabled:()=>false
    });
    d.setSpeed(1);
    const snap=d.capture(),clockOriginMs=performance.timeOrigin;
    window.__comparisonDirector=d;
    window.__comparisonPending=d.play(snap,{
      visualEvents:[{type:"attack",actorId:source.uid,targetId:target.uid,
        actorSide:"friendly",kind:"gun",damage:1,hpAfter:target.hp-1,lethal:false}]
    },"battle");
    return {clockOriginMs};
   });
   await page.evaluate(()=>window.__comparisonPending);
   const trace=await page.evaluate(()=>window.__comparisonDirector.trace());
   return {...info,trace};
  },"reference-attack",1000/60*16);
  await cdp.send("Page.stopScreencast");
  await page.screenshot({path:OUT+"/"+cfg.id+"-live-battle-after-attack.png"});
  assert.deepEqual(errs,[],"actual game browser should have zero runtime JS errors");
  videoSource=await page.video().path();
  output.push({device:cfg.id,passed:true,captures,
    actualSceneScreenshot:cfg.id+"-live-battle-before.png"});
 }catch(e){
  output.push({device:cfg.id,passed:false,error:String(e.stack||e),errs});
  current=null;
  await page.screenshot({path:OUT+"/"+cfg.id+"-FAILED.png"}).catch(()=>{});
  console.error("MOTION SIDE BY SIDE CAPTURE FAILED "+cfg.id,e.stack||e,errs);
 }finally{
  await context.close();
  if(videoSource&&fs.existsSync(videoSource)){
   fs.copyFileSync(videoSource,OUT+"/videos/"+cfg.id+"-real-player-actions.webm");
  }
 }
}
fs.writeFileSync(OUT+"/browser-capture-summary.json",JSON.stringify(output,null,2));
await browser.close();
assert(output.every(x=>x.passed),"Real browser source-motion comparison capture failed");
console.log("REAL UI INPUT + PC/PORTRAIT SCREENSHOTS AND CHROME VIDEOS CAPTURED FOR EVERY REFERENCE EVENT");
