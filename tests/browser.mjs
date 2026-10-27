import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdir} from "node:fs/promises";
import {chromium} from "playwright";
const origin="http://127.0.0.1:4173/paperchalk-world/";
const server=spawn(process.execPath,["./node_modules/vite/bin/vite.js","--host","127.0.0.1","--port","4173","--strictPort"],{stdio:"pipe",env:process.env});
let output="";server.stderr.on("data",d=>output+=d.toString());server.stdout.on("data",d=>output+=d.toString());
async function awaitServer(){
 for(let i=0;i<80;i++){
  try{if((await fetch(origin)).ok)return;}catch{}
  await new Promise(done=>setTimeout(done,300));
 }
 throw Error("Vite server did not start: "+output);
}
const errors=[];
try{
 await awaitServer();await mkdir("artifacts",{recursive:true});
 const browser=await chromium.launch({headless:true,args:["--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--disable-dev-shm-usage"]});
 try{
  for(const [name,width,height,mobile] of [["desktop",1280,800,false],["portrait",390,844,true],["landscape",844,390,true]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
   const page=await context.newPage();
   page.on("pageerror",e=>errors.push(name+": "+e.message));
   await page.goto(origin+"?model=kiosk",{waitUntil:"domcontentloaded",timeout:35000});
   await page.waitForFunction(()=>window.__WORLD_STUDIO_TEST__?.objects()>10,{timeout:35000});
   assert.equal(await page.locator("canvas").count(),1,"renderer must create one canvas");
   assert.equal(await page.locator("#presets button").count(),3,"three public projects");
   assert.ok((await page.locator("canvas").boundingBox())?.width>100);
   const tabs=page.locator(".mobiletabs");
   if(mobile){assert.equal(await tabs.isVisible(),true);await page.getByRole("button",{name:"项目 / 结构"}).click();}
   await page.locator("#presets button").nth(1).click();
   assert.equal(await page.evaluate(()=>window.__WORLD_STUDIO_TEST__.scene().id),"street");
   if(mobile)await page.getByRole("button",{name:"3D 预览"}).click();
   await page.screenshot({path:"artifacts/"+name+"-street.png"});
   if(mobile)await page.getByRole("button",{name:"项目 / 结构"}).click();
   await page.locator("#presets button").nth(2).click();
   assert.equal(await page.evaluate(()=>window.__WORLD_STUDIO_TEST__.scene().id),"home");
   if(mobile)await page.getByRole("button",{name:"3D 预览"}).click();
   await page.screenshot({path:"artifacts/"+name+"-home.png"});
   if(mobile)await page.getByRole("button",{name:"项目 / 结构"}).click();
   await page.locator("#presets button").nth(0).click();
   const initial=await page.evaluate(()=>window.__WORLD_STUDIO_TEST__.scene().parts.length);
   await page.locator("#objects .object-item").first().click();
   if(mobile)await page.getByRole("button",{name:"参数 / 导出"}).click();
   assert.equal(await page.locator("#inspectorForm").isVisible(),true);
   const value=Number(await page.locator("#posX").inputValue())+1;
   await page.locator("#posX").fill(String(value));await page.locator("#posX").press("Tab");
   assert.equal(await page.evaluate(()=>window.__WORLD_STUDIO_TEST__.scene().parts[0].from[0]),value,"position input must mutate scene geometry");
   const wait=page.waitForEvent("download");await page.locator("#export").click();
   const dl=await wait;assert.ok(dl.suggestedFilename().endsWith(".bbmodel"));
   const exported=await page.evaluate(()=>window.__WORLD_STUDIO_TEST__.exportBBModel());
   assert.equal(exported.elements.length,initial);
   assert.ok(exported.textures[0].source.startsWith("data:image/png;base64,"));
   await page.locator("#pickFile").setInputFiles({name:"roundtrip.bbmodel",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(exported))});
   await page.waitForFunction(n=>window.__WORLD_STUDIO_TEST__.scene().id.startsWith("imported-"),undefined,{timeout:10000});
   assert.equal(await page.evaluate(()=>window.__WORLD_STUDIO_TEST__.scene().parts.length),initial);
   if(mobile)await page.getByRole("button",{name:"3D 预览"}).click();
   await page.screenshot({path:"artifacts/"+name+"-kiosk-imported.png"});
   await context.close();
   console.log("PASS browser "+name+" / model import, export, edit and responsive viewport");
  }
  assert.deepEqual(errors,[],"console page errors");
 }finally{await browser.close();}
}finally{server.kill("SIGTERM");}
