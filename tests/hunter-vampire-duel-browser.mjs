/* Legacy hosted duel URL is now the canonical Snowbound Journey entry.
 * Verify redirect and source-accurate 704x1024 character cards in real Chromium.
 * Existing hunter/vampire JS is retained for archive only, not loaded here.
 */
import assert from "node:assert/strict";
import {chromium} from "playwright";
import fs from "node:fs";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const OUT="artifacts/hunter-vampire-duel";
fs.mkdirSync(OUT,{recursive:true});
const viewports=[
 {name:"desktop-1920x1080",w:1920,h:1080,mobile:false},
 {name:"laptop-1366x768",w:1366,h:768,mobile:false},
 {name:"phone-landscape-844x390",w:844,h:390,mobile:true},
 {name:"phone-portrait-390x844",w:390,h:844,mobile:true},
 {name:"tablet-1024x768",w:1024,h:768,mobile:true}
];
const reports=[];
for(const x of viewports){
 const ctx=await browser.newContext({viewport:{width:x.w,height:x.h},hasTouch:x.mobile,isMobile:x.mobile});
 const page=await ctx.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto("http://127.0.0.1:4173/card-battle/hunter-vampire-duel.html?via=legacy#original",{waitUntil:"networkidle",timeout:30000});
  assert.match(page.url(),/\/card-battle\/snowbound-journey\.html\?via=legacy#original$/);
  assert.equal(await page.locator("#fighter-hunter").count(),0,"old duel UI must not be shown");
  await page.waitForFunction(()=>!!window.PaperchalkSnowboundUI,{timeout:13000});
  assert.equal(await page.locator('[data-scene="menu-scene"]').count(),1,"new adventure menu is shown");
  await page.screenshot({path:OUT+"/"+x.name+"-new-game-entry.png",fullPage:true});
  for(const action of ["town","new","leader","node"]){
   await page.locator('[data-act="'+action+'"]:visible:not([disabled])').first().click();
   await page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),null,{timeout:15000});
  }
  assert.equal(await page.locator(".battle-slot").count(),12);
  const metrics=await page.evaluate(()=>{
   const units=[...document.querySelectorAll(".battle-unit")];
   return {cards:units.map(u=>{
    const b=u.getBoundingClientRect(),img=u.querySelector("img");
    return {width:+b.width.toFixed(2),height:+b.height.toFixed(2),ratio:+(b.width/b.height).toFixed(5),
     sourceW:img?.naturalWidth,sourceH:img?.naturalHeight,fit:img&&getComputedStyle(img).objectFit};
   }),scrollX:document.documentElement.scrollWidth-innerWidth};
  });
  assert(metrics.cards.length>=3,"real art character cards should be visible");
  assert(metrics.cards.every(c=>Math.abs(c.ratio-11/16)<.006),"all card shapes match 704:1024");
  assert(metrics.cards.every(c=>c.sourceW===704&&c.sourceH===1024),"Anima sources still 704x1024");
  assert(metrics.cards.every(c=>c.fit==="contain"),"no crop or cover mode");
  assert(metrics.scrollX<=3,"no horizontal overflow");
  assert.deepEqual(errors,[],"no page runtime errors");
  await page.screenshot({path:OUT+"/"+x.name+"-redirected-battle.png",fullPage:true});
  reports.push({viewport:x.name,pass:true,finalUrl:page.url(),cardRatios:metrics.cards.map(c=>c.ratio)});
  console.log("PASS "+x.name+" old public URL -> full Snowbound Journey; 11:16 original fullbody card");
 }catch(e){
  reports.push({viewport:x.name,pass:false,error:String(e.stack||e),errors});
  await page.screenshot({path:OUT+"/"+x.name+"-FAIL.png",fullPage:true}).catch(()=>{});
  console.error("FAIL "+x.name,e.stack);
 }finally{await ctx.close()}
}
fs.writeFileSync(OUT+"/redirect-and-original-art-metrics.json",JSON.stringify(reports,null,2));
await browser.close();
assert(reports.every(x=>x.pass),"legacy hosted URL replacement / original portrait checks failed");
