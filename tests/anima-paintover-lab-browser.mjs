/* Three.js / Anima touch-first scene actual browser test.
 * Genuine Chromium+WebGL screenshots, portrait/landscape phone HUD, pinch zoom,
 * touch-safe material drawer, whitebox, material masks and original actor.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const out="artifacts/anima-paintover-lab";
fs.mkdirSync(out+"/videos",{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 "--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"
]});
const sizes=[
 {id:"desktop-1920x1080",width:1920,height:1080,mobile:false},
 {id:"portrait-390x844",width:390,height:844,mobile:true},
 {id:"landscape-844x390",width:844,height:390,mobile:true},
 {id:"small-320x568",width:320,height:568,mobile:true},
 {id:"tablet-768x1024",width:768,height:1024,mobile:true}
];
const results=[];
for(const d of sizes){
 const ctx=await browser.newContext({viewport:{width:d.width,height:d.height},deviceScaleFactor:1,
  isMobile:d.mobile,hasTouch:d.mobile,recordVideo:{dir:out+"/videos",size:{width:d.width,height:d.height}}});
 const page=await ctx.newPage();const errors=[];
 page.on("pageerror",e=>errors.push(e.stack||e.message));
 page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 const open=async()=>{
  if(!d.mobile)return;
  await page.locator("#mobile-panel").click();
  await page.waitForFunction(()=>window.PaintoverStudio.drawerOpen,null,{timeout:4000});
 };
 const close=async()=>{
  if(!d.mobile)return;
  await page.locator("#mobile-close").click();
  await page.waitForFunction(()=>!window.PaintoverStudio.drawerOpen,null,{timeout:4000});
 };
 const range=async(id,value)=>page.locator("#"+id).evaluate((el,v)=>{
  el.value=String(v);el.dispatchEvent(new Event("input",{bubbles:true}));
 },value);
 try{
  const nav=await page.goto("http://127.0.0.1:4173/card-battle/anima-paintover-lab.html",{
   waitUntil:"domcontentloaded",timeout:30000
  });
  assert.equal(nav.status(),200);
  await page.waitForFunction(()=>window.PaintoverStudio?.frameCount>7&&
    window.PaintoverStudio.drawCalls>15&&window.PaintoverStudio.loadedActor,null,{timeout:27000});
  const first=await page.evaluate(()=>{
   const s=window.PaintoverStudio,c=document.querySelector("#world"),scene=document.querySelector(".stage"),ui=document.querySelector(".mobile-toolbar");
   const gl=c.getContext("webgl2")||c.getContext("webgl");
   const stage=scene.getBoundingClientRect(),toolbar=ui.getBoundingClientRect();
   return {loaded:s.loadedActor,drawCalls:s.drawCalls,frame:s.frameCount,mode:s.mode,
    viewportMode:s.viewportMode,ratio:s.renderRatio,cameraDistance:s.cameraDistance,
    viewport:[innerWidth,innerHeight],stage:{x:stage.x,y:stage.y,width:stage.width,height:stage.height},
    toolbar:{x:toolbar.x,y:toolbar.y,width:toolbar.width,height:toolbar.height},
    buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],
    overflowX:document.documentElement.scrollWidth-innerWidth,
    overflowY:document.documentElement.scrollHeight-innerHeight,
    drawerOpen:s.drawerOpen};
  });
  assert(first.loaded&&first.drawCalls>15,"scene must be real WebGL with original Anima actor");
  assert(first.overflowX<=2,"no horizontal clipping or page overflow");
  if(d.mobile){
   assert(first.viewportMode!=="desktop","touch-size viewport must be framed independently");
   assert(first.stage.width>=d.width*.98,"3D world must occupy entire phone width");
   assert(first.stage.height>=d.height*.73,"3D world must occupy nearly all phone height");
   assert(first.overflowY<=2,"game viewport must not scroll vertically");
   assert(first.toolbar.height>=48,"game toolbar touch targets are too small");
   assert(!first.drawerOpen,"mobile materials must not cover initial 3D scene");
   assert(first.ratio<=1,"mobile rendering must use bounded pixel ratio");
  }
  await page.screenshot({path:out+"/"+d.id+"-01-immersive-scene.png",animations:"disabled"});
  if(d.mobile){
   await open();
   await page.screenshot({path:out+"/"+d.id+"-02-material-drawer.png",animations:"disabled"});
   const state=await page.locator("#mobile-panel").getAttribute("aria-expanded");
   assert.equal(state,"true");
  }
  await page.locator("#whitebox").click();
  assert.equal(await page.evaluate(()=>window.PaintoverStudio.mode),"whitebox");
  await close();
  await page.screenshot({path:out+"/"+d.id+"-03-whitebox.png",animations:"disabled"});
  if(d.mobile){
   await page.locator("#mobile-view").click();
   assert.equal(await page.evaluate(()=>window.PaintoverStudio.mode),"composite");
  }else{await page.locator("#finished").click();}
  await open();
  await range("grime",0);await range("growth",0);
  await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(()=>[
   window.PaintoverStudio.layerWeights.grime,window.PaintoverStudio.layerWeights.growth]),[0,0]);
  await close();
  await page.screenshot({path:out+"/"+d.id+"-04-clean-materials.png",animations:"disabled"});
  await open();
  await range("grime",100);await range("growth",100);
  await page.waitForTimeout(150);
  await close();
  await page.screenshot({path:out+"/"+d.id+"-05-heavy-materials.png",animations:"disabled"});
  if(d.mobile){
   await page.locator("#mobile-light").click();
   assert.equal(await page.locator("#mobile-light").getAttribute("aria-pressed"),"true");
  }else{await page.locator("#day").click();}
  await page.screenshot({path:out+"/"+d.id+"-06-daylight.png",animations:"disabled"});
  if(d.mobile){
   const canvas=page.locator("#world"),rect=await canvas.boundingBox();
   const middle={x:Math.floor(rect.x+rect.width*.50),y:Math.floor(rect.y+rect.height*.55)};
   const startDistance=await page.evaluate(()=>window.PaintoverStudio.cameraDistance);
   const client=await ctx.newCDPSession(page);
   const events=[
    ["touchStart",[{x:middle.x-30,y:middle.y},{x:middle.x+30,y:middle.y}]],
    ["touchMove",[{x:middle.x-52,y:middle.y},{x:middle.x+52,y:middle.y}]],
    ["touchMove",[{x:middle.x-67,y:middle.y},{x:middle.x+67,y:middle.y}]],
    ["touchEnd",[]]
   ];
   for(const [type,touchPoints] of events){
    await client.send("Input.dispatchTouchEvent",{type,touchPoints});
    await page.waitForTimeout(95);
   }
   const zoomDistance=await page.evaluate(()=>window.PaintoverStudio.cameraDistance);
   assert(zoomDistance<startDistance-.35,
    "true touch pinch-out must zoom into 3D scene: "+JSON.stringify({startDistance,zoomDistance}));
   await page.screenshot({path:out+"/"+d.id+"-07-pinch-zoom.png",animations:"disabled"});
   await page.locator("#mobile-fit").click();
   assert.equal(await page.evaluate(()=>window.PaintoverStudio.resetCount),1,
    "HUD must reset composition after pinch");
   await page.screenshot({path:out+"/"+d.id+"-08-camera-reset.png",animations:"disabled"});
  }
  await open();
  await page.locator("#foreground").uncheck();
  await page.locator("#actor").uncheck();
  await close();
  await page.screenshot({path:out+"/"+d.id+"-09-hidden-actor-foreground.png",animations:"disabled"});
  await open();
  await page.locator("#reset").click();
  await close();
  assert.equal(await page.evaluate(()=>window.PaintoverStudio.mode),"composite");
  await page.screenshot({path:out+"/"+d.id+"-10-restored.png",animations:"disabled"});
  assert.deepEqual(errors,[],"no WebGL or runtime errors");
  console.log("PASS actual mobile gameplay UI",d.id,JSON.stringify(first));
  results.push({viewport:d.id,pass:true,first,screenshots:d.mobile?10:8});
 }catch(err){
  console.error("FAIL actual mobile gameplay UI",d.id,err.stack||err);
  results.push({viewport:d.id,pass:false,error:String(err.stack||err),errors});
  await page.screenshot({path:out+"/"+d.id+"-ERROR.png"}).catch(()=>{});
 }finally{await ctx.close()}
}
await browser.close();
fs.writeFileSync(out+"/results.json",JSON.stringify(results,null,2));
assert(results.every(r=>r.pass),"Some responsive 3D Anima real-browser checks failed");
