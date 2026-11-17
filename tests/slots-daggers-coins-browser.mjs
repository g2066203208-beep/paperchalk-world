/* Real Chromium metal-coin proof, three viewport sizes, screenshot+WebM.
 * Tests the exact GitHub playable module; does not fabricate source footage.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
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
const result=[];
for(const d of devices){
 const context=await browser.newContext({viewport:{width:d.w,height:d.h},deviceScaleFactor:1,
  isMobile:d.mobile,hasTouch:d.mobile,recordVideo:{dir:out+"/videos",size:{width:d.w,height:d.h}}});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.stack||e.message));
 try{
  await page.goto("http://127.0.0.1:4173/card-battle/coin-fx-lab.html",{waitUntil:"networkidle"});
  assert(await page.locator("#payout").isVisible());
  await page.screenshot({path:out+"/"+d.name+"-00-rest.png"});
  await page.locator("#payout").click();
  await page.waitForFunction(()=>window.PaperchalkCoinCascade?.status==="playing"&&
    Number(document.querySelector(".paperchalk-coin-webgl")?.dataset.coinFrame)>2,null,{timeout:8000});
  let last=0;
  const shots=[];
  for(const [ms,label] of [[120,"01-launch"],[340,"02-metal-flip"],[650,"03-first-bounce"],[980,"04-scattering"],[1500,"05-resting"],[2200,"06-collect"]]){
   await page.waitForTimeout(ms-last);last=ms;
   const name=out+"/"+d.name+"-"+label+".png";
   await page.screenshot({path:name});shots.push(name);
  }
  const fx=await page.evaluate(()=>{
   const c=document.querySelector(".paperchalk-coin-webgl");
   const ctx=c?.getContext("webgl");
   return {status:window.PaperchalkCoinCascade.status,
    played:window.PaperchalkCoinCascade.played,
    frame:Number(c?.dataset.coinFrame),drawWidth:ctx?.drawingBufferWidth,drawHeight:ctx?.drawingBufferHeight,
    particles:window.PaperchalkCoinCascade.count};
  });
  assert(fx.frame>20,"coins must actually animate every browser frame");
  assert(fx.drawWidth>=d.w&&fx.drawHeight>=d.h,"metallic WebGL drawing buffer must cover viewport");
  assert(fx.played===1,"one payout request must spawn one physical event");
  assert.deepEqual(errors,[],"no uncaught browser errors");
  // Test other reward counts and replay without a page reload.
  await page.locator("#few").click();
  await page.waitForTimeout(400);
  assert((await page.evaluate(()=>window.PaperchalkCoinCascade.played))===2);
  await page.locator("#many").click();
  await page.waitForTimeout(400);
  assert((await page.evaluate(()=>window.PaperchalkCoinCascade.played))===3);
  await page.screenshot({path:out+"/"+d.name+"-07-max-payout.png"});
  // Actual snowbound page loads the same physical coin module.
  await page.goto("http://127.0.0.1:4173/card-battle/snowbound-journey.html",{waitUntil:"networkidle"});
  assert(await page.evaluate(()=>typeof window.PaperchalkCoinCascade?.burst==="function"),
    "game must integrate the exact reusable physical coin shader");
  await page.evaluate(()=>window.PaperchalkCoinCascade.burst({
    count:28,x:innerWidth*.4,y:innerHeight*.3,floorY:innerHeight*.7,sound:false
  }));
  await page.waitForFunction(()=>Number(document.querySelector(".paperchalk-coin-webgl")?.dataset.coinFrame)>2);
  await page.waitForTimeout(180);
  await page.screenshot({path:out+"/"+d.name+"-08-in-real-game.png"});
  assert.deepEqual(errors,[],"game and metal coin effect must not throw JS errors");
  result.push({name:d.name,passed:true,fx,screenshots:shots.length+3});
  console.log("PASS physical coins",d.name,fx);
 }catch(e){
  result.push({name:d.name,passed:false,error:String(e.stack||e)});
  await page.screenshot({path:out+"/"+d.name+"-FAIL.png"}).catch(()=>{});
  console.error("FAIL physical coin effect",d.name,e.stack||e);
 }finally{await context.close();}
}
await browser.close();
fs.writeFileSync(out+"/results.json",JSON.stringify(result,null,2));
assert(result.every(r=>r.passed),"Physical coin effect/browser screenshot test failed");
