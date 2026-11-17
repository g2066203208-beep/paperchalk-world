/* Actual browser/visual QA: no mocked DOM, same hosted game Three.js module. */
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const out="artifacts/anima-paintover-lab";
fs.mkdirSync(out+"/videos",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const sizes=[{id:"desktop-1920x1080",width:1920,height:1080,mobile:false},
 {id:"portrait-390x844",width:390,height:844,mobile:true},
 {id:"landscape-844x390",width:844,height:390,mobile:true}];
const results=[];
for(const d of sizes){
 const context=await browser.newContext({viewport:{width:d.width,height:d.height},deviceScaleFactor:1,
  isMobile:d.mobile,hasTouch:d.mobile,recordVideo:{dir:out+"/videos",size:{width:d.width,height:d.height}}});
 const page=await context.newPage();let errors=[];
 page.on("pageerror",e=>errors.push(e.stack||e.message));
 page.on("console",message=>{if(message.type()==="error")errors.push(message.text())});
 try{
  const nav=await page.goto("http://127.0.0.1:4173/card-battle/anima-paintover-lab.html",{waitUntil:"networkidle",timeout:30000});
  assert.equal(nav.status(),200);
  await page.waitForFunction(()=>window.PaintoverStudio?.frameCount>5&&window.PaintoverStudio?.drawCalls>15,null,{timeout:25000});
  await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("已加载"),null,{timeout:16000});
  let first=await page.evaluate(()=>{
   const s=window.PaintoverStudio,c=document.querySelector("#world");
   const gl=c.getContext("webgl2")||c.getContext("webgl");
   return {ready:s.ready,loaded:s.loadedActor,drawCalls:s.drawCalls,frames:s.frameCount,mode:s.mode,
     buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],weights:s.layerWeights,canvas:[c.width,c.height]};
  });
  assert(first.ready&&first.loaded,"actual Anima doctor cutout must render in 3D");
  assert(first.drawCalls>15,"real 3D whitebox geometry must render, not one flat background");
  assert(first.buffer[0]>=d.width*.9,"canvas backing buffer too narrow");
  await page.screenshot({path:out+"/"+d.id+"-01-composite.png"});
  await page.locator("#whitebox").click();
  assert.equal(await page.evaluate(()=>window.PaintoverStudio.mode),"whitebox");
  await page.screenshot({path:out+"/"+d.id+"-02-whitebox.png"});
  await page.locator("#finished").click();
  await page.locator("#grime").fill("0");
  await page.locator("#growth").fill("0");
  assert.deepEqual(await page.evaluate(()=>[window.PaintoverStudio.layerWeights.grime,window.PaintoverStudio.layerWeights.growth]),[0,0]);
  await page.screenshot({path:out+"/"+d.id+"-03-clean-paint.png"});
  await page.locator("#grime").fill("100");
  await page.locator("#growth").fill("100");
  await page.screenshot({path:out+"/"+d.id+"-04-heavy-masks.png"});
  await page.locator("#day").click();
  await page.screenshot({path:out+"/"+d.id+"-05-daylight.png"});
  await page.locator("#foreground").uncheck();
  await page.locator("#actor").uncheck();
  await page.screenshot({path:out+"/"+d.id+"-06-no-cards.png"});
  await page.locator("#reset").click();
  assert.equal(await page.evaluate(()=>window.PaintoverStudio.mode),"composite");
  await page.screenshot({path:out+"/"+d.id+"-07-restored.png"});
  assert.deepEqual(errors,[],"no JS/WebGL runtime console errors");
  results.push({viewport:d.id,pass:true,first});
  console.log("PASS 3D PAINTOVER",d.id,first);
 }catch(err){
  results.push({viewport:d.id,pass:false,error:String(err.stack||err),errors});
  console.error("FAIL 3D PAINTOVER",d.id,err.stack||err);
  await page.screenshot({path:out+"/"+d.id+"-ERROR.png"}).catch(()=>{});
 }finally{await context.close();}
}
await browser.close();
fs.writeFileSync(out+"/results.json",JSON.stringify(results,null,2));
assert(results.every(r=>r.pass),"One or more real 3D Anima demo viewport checks failed");