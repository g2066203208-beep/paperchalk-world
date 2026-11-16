/* Screen-by-screen real Chromium regression for the Snowbound Journey.
 * Covers the menu, hub, hero selection, three-zone parchment map, two-row
 * combat, companion event, storefront and boss. Screenshots prove rendering.
 */
import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const base="http://127.0.0.1:4173/card-battle/snowbound-journey.html";
const out="artifacts/snowbound-journey";
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const scenarios=[
 {id:"desktop-1920x1080",viewport:{width:1920,height:1080},mobile:false},
 {id:"laptop-1366x768",viewport:{width:1366,height:768},mobile:false},
 {id:"phone-landscape-844x390",viewport:{width:844,height:390},mobile:true},
 {id:"phone-portrait-390x844",viewport:{width:390,height:844},mobile:true},
 {id:"tablet-1024x768",viewport:{width:1024,height:768},mobile:true}
];
const summaries=[];
for(const cfg of scenarios){
 const context=await browser.newContext({viewport:cfg.viewport,isMobile:cfg.mobile,hasTouch:cfg.mobile,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[],shots=[],metrics=[];
 page.on("pageerror",err=>errors.push("PAGE "+err.message));
 page.on("response",resp=>{
  if(resp.status()>=400&&/snowbound-journey|duel-card-art|04-bounty-markswoman|frost-witch/i.test(resp.url()))
   errors.push("HTTP "+resp.status()+" "+resp.url());
 });
 const screenshot=async name=>{
  await page.waitForTimeout(180);
  const label=out+"/"+cfg.id+"-"+name+".png";
  await page.screenshot({path:label,fullPage:true});shots.push(label);
  const m=await page.evaluate(()=>{
   const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),right:Math.round(r.right),bottom:Math.round(r.bottom),w:Math.round(r.width),h:Math.round(r.height)}};
   const buttons=[...document.querySelectorAll('button:not([disabled])')].filter(e=>{const st=getComputedStyle(e);return st.display!=='none'&&st.visibility!=='hidden'}).map(e=>({text:(e.textContent||"").trim().slice(0,35),rect:rect(e)}));
   return {view:window.PaperchalkSnowboundUI?.view,screen:rect(document.querySelector(".scene")),overflowX:document.documentElement.scrollWidth-innerWidth,overflowY:document.documentElement.scrollHeight-innerHeight,
    buttons:buttons.length,firstButtons:buttons.slice(0,10),cards:document.querySelectorAll(".paint-card").length,
    units:document.querySelectorAll(".battle-unit").length,slots:document.querySelectorAll(".battle-slot").length};
  });
  assert(m.screen,"view must have a visible scene");
  assert(m.overflowX<4,"no document horizontal scroll: "+name);
  assert(m.overflowY<4,"no document vertical scroll: "+name);
  assert(m.buttons>0,"active buttons present: "+name);
  metrics.push({name,...m});
 };
 const click=async (act,index=0)=>{
  const q=page.locator('[data-act="'+act+'"]:visible:not([disabled])');
  assert(await q.count()>index,"visible enabled action "+act+" #"+index);
  await q.nth(index).click();
  await page.waitForTimeout(65);
 };
 try{
  await page.goto(base,{waitUntil:"networkidle",timeout:30000});
  await page.waitForFunction(()=>!!window.PaperchalkSnowboundUI,{timeout:10000});
  assert.equal(await page.locator('[data-scene="menu-scene"]').count(),1);
  await screenshot("01-menu");
  await click("town");await screenshot("02-town");
  await click("new");await screenshot("03-leader");
  assert.equal(await page.locator('.choice-row .paint-card').count(),3);
  await click("leader");
  assert.equal(await page.locator('[data-scene="map-scene"]').count(),1);
  await screenshot("04-map");
  await click("node");
  assert.equal(await page.locator('[data-scene*="battle-scene"]').count(),1);
  assert.equal(await page.locator(".battle-slot").count(),12);
  assert.equal(await page.locator(".battle-grid").count(),2);
  assert(await page.locator(".battle-unit").count()>=3);
  const heroLoaded=await page.locator('.battle-unit.friendly .unit-art img').first().evaluate(img=>img.complete&&img.naturalWidth>0);
  assert(heroLoaded,"real Anima portrait loaded in formation card");
  await screenshot("05-battle");
  const before=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run.battle);
  await click("hand");
  assert(await page.locator(".fight-choice").count()===1,"selected hand preview");
  await click("enemy");
  const after=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run.battle);
  assert.equal(after.playsLeft,0,"one item play per turn");
  assert.equal(after.hand.length,before.hand.length-1,"item moved to discard");
  await click("endturn");
  const turn=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run.battle.turn);
  assert.equal(turn,2,"countdown turn advances");
  await screenshot("06-turn-two");
  // Fast-travel only within the test harness, to confirm every event renderer
  // without bypassing the player-facing route controls.
  await page.evaluate(()=>{window.PaperchalkSnowboundUI.engine.finishNode();window.PaperchalkSnowboundUI.render()});
  assert.equal(await page.locator('[data-scene="map-scene"]').count(),1);
  await screenshot("07-route-next");
  await click("node"); // current 1st branch: frozen traveller
  assert.equal(await page.locator('[data-scene="event-scene"]').count(),1);
  await screenshot("08-recruit");
  await click("claim");
  const recruit=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run);
  assert.equal(recruit.companions.length,1,"companion recruited");
  await click("node"); // current 1st branch: shop
  assert.equal(await page.locator(".shop-scene").count(),1);
  await screenshot("09-shop");
  const gold=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run.gold);
  const firstOffer=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run.offers[0]);
  if(gold>=firstOffer.price){
   await click("buy");
   const afterGold=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run.gold);
   assert(afterGold<gold,"coins spent on goods");
  }
  await screenshot("10-shop-after-purchase");
  await click("leave");
  await click("node"); // boss
  assert.equal(await page.locator('[data-scene*="battle-scene"]').count(),1);
  await screenshot("11-boss");
  assert.deepEqual(errors,[],"page, script and image resources load without errors");
  summaries.push({...cfg,ok:true,metrics,shots,errors});
  console.log("PASS",cfg.id,JSON.stringify({scenes:metrics.map(m=>m.view),buttons:metrics[0].buttons,screenshots:shots.length}));
 }catch(err){
  try{await page.screenshot({path:out+"/"+cfg.id+"-FAILED.png",fullPage:true})}catch{}
  summaries.push({...cfg,ok:false,error:String(err.stack||err),metrics,shots,errors});
  console.error("FAIL",cfg.id,err.stack||err,errors);
 }finally{await context.close();}
}
fs.writeFileSync(out+"/qa-metrics.json",JSON.stringify(summaries,null,2));
await browser.close();
assert(summaries.every(s=>s.ok),"One or more Snowbound visual flows failed");
console.log("Snowbound Journey: full navigation, interaction and viewport QA passed");
