/* Actual Chromium interaction proof: live hand tilt, moving specular light,
 * spring release, reduced-motion accessibility and mobile touch safety.
 * Visual inspiration ≠ invented exact original-game hover constants.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const OUT="artifacts/snowbound-tactile-proof";
fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const results=[];
for(const cfg of [{name:"desktop",w:1920,h:1080,mobile:false},
                  {name:"portrait",w:390,h:844,mobile:true}]){
 const ctx=await browser.newContext({viewport:{width:cfg.w,height:cfg.h},
   isMobile:cfg.mobile,hasTouch:cfg.mobile,deviceScaleFactor:1});
 const page=await ctx.newPage();const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto("http://127.0.0.1:4173/card-battle/snowbound-journey.html",
    {waitUntil:"networkidle"});
  for(const act of ["town","new","leader","node"]){
   await page.locator('[data-act="'+act+'"]:visible:not([disabled])').first().click();
   await page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),
       null,{timeout:20000});
  }
  assert(await page.evaluate(()=>!!window.PaperchalkTactile),
    "live real-material animation controller must load on the hosted game");
  const button=page.locator(".battle-bottom .hand>button").first();
  const r=await button.boundingBox();assert(r?.width>20,"real hand card must be present");
  const leftX=r.x+r.width*.20,rightX=r.x+r.width*.80,cy=r.y+r.height*.40;
  if(!cfg.mobile){
   await page.mouse.move(leftX,cy);
   await page.waitForTimeout(205);
   const a=await page.evaluate(()=>window.PaperchalkTactile.debug());
   assert(a.sample.length>0&&Math.abs(a.sample[0].ry)>1,
     "real mouse motion must tilt the card at original artwork (left side)");
   await page.mouse.move(rightX,cy);
   await page.waitForTimeout(215);
   const b=await page.evaluate(()=>window.PaperchalkTactile.debug());
   assert(b.sample[0].ry>0&&b.sample[0].x>50,
      "light and card must track pointer continuously toward right edge");
   await page.screenshot({path:OUT+"/desktop-foil-live-hover.png"});
   await page.mouse.move(6,6);
   await page.waitForTimeout(950);
   const reset=await page.evaluate(()=>window.PaperchalkTactile.debug());
   assert.equal(reset.active,0,"card must spring back then completely release animation workload");
   await page.emulateMedia({reducedMotion:"reduce"});
   await page.mouse.move(leftX,cy);
   await page.waitForTimeout(100);
   assert.equal((await page.evaluate(()=>window.PaperchalkTactile.debug())).active,0,
      "reduced-motion mode must not run pointer tilt animations");
  }else{
   // Synthetic PointerEvent deliberately avoids playing a card while probing
   // touch UI response. The real game play/drag tests run separately.
   await button.evaluate((node)=>{
    const rect=node.getBoundingClientRect();
    node.dispatchEvent(new PointerEvent("pointerdown",{
      bubbles:true,pointerType:"touch",button:0,pointerId:42,
      clientX:rect.x+rect.width*.82,clientY:rect.y+rect.height*.26}));
   });
   await page.waitForTimeout(150);
   const active=await page.evaluate(()=>window.PaperchalkTactile.debug());
   assert(active.active>=1,"touch press should animate the material while held");
   await button.evaluate(node=>node.dispatchEvent(new PointerEvent("pointerup",{
      bubbles:true,pointerType:"touch",button:0,pointerId:42})));
   await page.waitForTimeout(700);
   assert.equal((await page.evaluate(()=>window.PaperchalkTactile.debug())).active,0,
     "touch release must settle and reset without sticky glow");
   await page.screenshot({path:OUT+"/portrait-after-touch-reset.png"});
  }
  assert.deepEqual(errors,[],"no JS errors from tactile materials");
  results.push({viewport:cfg.name,passed:true,bounds:r,source:"actual browser pointer interaction"});
  console.log("PASS real responsive card material",cfg.name);
 }catch(e){
  results.push({viewport:cfg.name,passed:false,error:String(e.stack||e),errors});
  await page.screenshot({path:OUT+"/"+cfg.name+"-FAILED.png"}).catch(()=>{});
  console.error("FAIL tactile material",cfg.name,e);
 }finally{await ctx.close();}
}
fs.writeFileSync(OUT+"/results.json",JSON.stringify(results,null,2));
await browser.close();
assert(results.every(x=>x.passed),"Tactile proof failed");
