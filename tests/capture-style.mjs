import {chromium} from "playwright";
import {spawn} from "node:child_process";
import {mkdir} from "node:fs/promises";
import assert from "node:assert/strict";
const child=spawn(process.execPath,["node_modules/vite/bin/vite.js","--host","127.0.0.1","--port","4173","--strictPort"],{stdio:"pipe"});
let output="";child.stdout.on("data",d=>output+=d);child.stderr.on("data",d=>output+=d);
const address="http://127.0.0.1:4173/paperchalk-world/style-study.html";
async function ready(){for(let k=0;k<60;k++){try{if((await fetch(address)).ok)return;}catch{}await new Promise(r=>setTimeout(r,350));}throw Error("Vite not ready "+output);}
await mkdir("screenshots",{recursive:true});
try{
 await ready();
 const browser=await chromium.launch({headless:true,args:["--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--disable-dev-shm-usage"]});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(address,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.__PAPER_STUDY_TEST__?.modelCounts()?.store>=30,{timeout:30000});
  await page.waitForTimeout(1600);
  const counts=await page.evaluate(()=>window.__PAPER_STUDY_TEST__.modelCounts());
  assert.ok(counts.car>=2&&counts.store>=30,"real old car and new store must both load");
  const canvas=page.locator("#stage canvas");
  assert.ok((await canvas.boundingBox()).width>800,"WebGL stage not visible");
  await page.locator(".studio").screenshot({path:"screenshots/paper-car-kiosk-front.png"});
  await page.locator("#threequarter").click();
  await page.waitForTimeout(1200);
  await page.locator(".studio").screenshot({path:"screenshots/paper-car-kiosk-threequarter.png"});
  await page.screenshot({path:"screenshots/paper-style-workshop-page.png",fullPage:true});
  assert.deepEqual(errors,[], "no page errors");
  console.log("REAL WEBGL SCREENSHOTS CAPTURED",counts);
  await page.close();
  const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await phone.goto(address,{waitUntil:"domcontentloaded"});
  await phone.waitForFunction(()=>window.__PAPER_STUDY_TEST__?.modelCounts()?.store>=30,{timeout:30000});
  await phone.waitForTimeout(1200);
  await phone.screenshot({path:"screenshots/paper-style-mobile.png",fullPage:true});
  await phone.close();
 }finally{await browser.close();}
}finally{child.kill("SIGTERM");}
