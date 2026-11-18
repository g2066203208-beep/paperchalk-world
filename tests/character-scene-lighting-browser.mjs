/* Real browser compare: identical GitHub character source, unchanged camera;
 * toggle runtime relighting, then day/night while preserving geometry and art. */
import fs from "node:fs";
import assert from "node:assert/strict";
import {chromium} from "playwright";
const out="artifacts/character-scene-lighting";
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 "--no-sandbox","--enable-webgl","--use-gl=angle",
 "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const modes=[
 {name:"desktop-1440x900",width:1440,height:900,mobile:false},
 {name:"portrait-390x844",width:390,height:844,mobile:true},
 {name:"landscape-844x390",width:844,height:390,mobile:true}
];
let failed=false;
for(const mode of modes){
 const pageErrors=[];
 const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},
  isMobile:mode.mobile,hasTouch:mode.mobile,deviceScaleFactor:1});
 const page=await context.newPage();
 page.on("pageerror",e=>pageErrors.push(e.message));
 page.on("console",m=>{if(m.type()==="error")pageErrors.push(m.text())});
 try{
  await page.goto("http://127.0.0.1:4173/card-battle/anima-paintover-lab.html?dev=1",
   {waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForFunction(()=>{
   const s=window.PaintoverStudio;
   return s?.loadedActor && s.relightReady&&s.relightMaterialCount>=2&&s.frameCount>7;
  },null,{timeout:30000});
  await page.waitForTimeout(400);
  const before=await page.evaluate(()=>{
   const s=PaintoverStudio;
   s.setRelighting(false);
   return {ready:s.relightReady,enabled:s.relightEnabled,materials:s.relightMaterialCount,
    shader:s.relightShadersInstalled,preset:s.relightPreset,
    uniforms:s.relightUniforms,loadedActor:s.loadedActor};
  });
  assert.equal(before.preset,"hall");
  assert(before.shader&&before.materials>=2&&before.loadedActor);
  assert(before.uniforms.every(x=>x.strength===0));
  await page.waitForTimeout(160);
  await page.screenshot({path:out+"/"+mode.name+"-01-original-no-relight.png"});
  const after=await page.evaluate(()=>{
   const s=PaintoverStudio;s.setRelighting(true);
   return {enabled:s.relightEnabled,uniforms:s.relightUniforms};
  });
  assert(after.enabled && after.uniforms.every(x=>x.strength>.2));
  await page.waitForTimeout(160);
  await page.screenshot({path:out+"/"+mode.name+"-02-scene-relight-on.png"});
  await page.evaluate(()=>document.getElementById("day").click());
  await page.waitForTimeout(210);
  const day=await page.evaluate(()=>PaintoverStudio.relightUniforms);
  await page.screenshot({path:out+"/"+mode.name+"-03-daylight.png"});
  assert(day.every(x=>x.strength>.2));
  assert.deepEqual(pageErrors,[],"No WebGL/JS errors for "+mode.name);
  console.log("PASS character relighting",mode.name,JSON.stringify({before,after,day}));
 }catch(e){
  failed=true;console.error("FAIL character relighting",mode.name,e.stack||e,pageErrors);
  await page.screenshot({path:out+"/"+mode.name+"-ERROR.png"}).catch(()=>{});
 }finally{await context.close()}
}
await browser.close();
if(failed)process.exitCode=1;
