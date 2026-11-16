/* Synthetic deterministic fatal/finish states, exercised through REAL UI
 * controls. These tests do not pretend to be organic playthroughs.
 */
import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const OUT="artifacts/snowbound-outcome-cinema";fs.mkdirSync(OUT+"/videos",{recursive:true});
const url="http://127.0.0.1:4173/card-battle/snowbound-journey.html";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const summary=[];
for(const cfg of [{label:"desktop",width:1920,height:1080},{label:"portrait",width:390,height:844}]){
 const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},
   isMobile:cfg.width<500,hasTouch:cfg.width<500,recordVideo:{dir:OUT+"/videos"}});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(url,{waitUntil:"networkidle"});
  for(const a of ["town","new","leader","node"]){
   await page.locator('[data-act="'+a+'"]:visible:not([disabled])').first().click();
   await page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),null,{timeout:14000});
  }
  assert.equal(await page.evaluate(()=>window.PaperchalkSnowboundUI.view),"battle");
  // Victory: one enemy with 1 HP, guaranteed offensive hand preserved.
  await page.evaluate(()=>{
   const ui=window.PaperchalkSnowboundUI,s=ui.state;
   s.run.battle.foes=s.run.battle.foes.slice(0,1);
   s.run.battle.foes[0].hp=1;
   localStorage.setItem("paperchalk-snowbound-campaign-v1",JSON.stringify({
    screen:s.screen,run:s.run,meta:s.meta,settings:s.settings
   }));
  });
  await page.reload({waitUntil:"networkidle"});
  const offenseIndex=await page.evaluate(()=>{
   const ui=window.PaperchalkSnowboundUI,b=ui.state.run.battle;
   return b.hand.findIndex(c=>["hit","pierce","freeze","weaken","all"].includes(ui.engine.ITEMS.find(x=>x.id===c.id)?.kind));
  });
  assert(offenseIndex>=0);
  await page.locator('[data-act="hand"][data-i="'+offenseIndex+'"]').click();
  await page.locator('[data-act="enemy"]').first().click();
  assert.equal(await page.evaluate(()=>window.PaperchalkSnowboundUI.view),"battle-clear");
  await page.waitForFunction(()=>window.PaperchalkSnowboundUI.motion.trace().some(e=>e.stage==="death-start"),null,{timeout:13000});
  await page.screenshot({path:OUT+"/"+cfg.label+"-victory-death-frame.png"});
  await page.waitForFunction(()=>!window.PaperchalkSnowboundUI.motion.isBusy(),null,{timeout:14000});
  await page.screenshot({path:OUT+"/"+cfg.label+"-victory-final.png"});
  const winTrace=await page.evaluate(()=>window.PaperchalkSnowboundUI.motion.trace());
  assert(winTrace.some(x=>x.stage==="death-end"),"fallen foe must finish paper death exit");
  assert(winTrace.some(x=>x.event==="transaction"&&x.detail.includes("victory")));
  // Defeat: synthetic one-HP hero, one due enemy; actual End Turn action.
  await page.evaluate(()=>{
   const ui=window.PaperchalkSnowboundUI,s=ui.state;
   s.screen="battle";s.run.result=null;
   s.run.battle.finished=false;s.run.battle.victory=false;
   s.run.battle.playsLeft=1;s.run.battle.foes=[s.run.battle.foes[0]||ui.engine.ENEMIES[0]];
   s.run.battle.foes[0].tick=1;s.run.battle.foes[0].hp=Math.max(1,s.run.battle.foes[0].hp);
   const hero=s.run.battle.allies.find(x=>x.leader);
   hero.hp=1;hero.shield=0;s.run.health=1;
   localStorage.setItem("paperchalk-snowbound-campaign-v1",JSON.stringify({screen:s.screen,run:s.run,meta:s.meta,settings:s.settings}));
  });
  await page.reload({waitUntil:"networkidle"});
  await page.locator('[data-act="endturn"]').click();
  assert.equal(await page.evaluate(()=>window.PaperchalkSnowboundUI.view),"result");
  await page.waitForFunction(()=>window.PaperchalkSnowboundUI.motion.trace().some(e=>e.stage==="death-start"),null,{timeout:13000});
  await page.screenshot({path:OUT+"/"+cfg.label+"-defeat-death-frame.png"});
  await page.waitForFunction(()=>!window.PaperchalkSnowboundUI.motion.isBusy(),null,{timeout:14000});
  await page.screenshot({path:OUT+"/"+cfg.label+"-defeat-result.png"});
  const defeatState=await page.evaluate(()=>window.PaperchalkSnowboundUI.state.run.result);
  assert.equal(defeatState.won,false);
  assert(defeatState.cause&&defeatState.cause.length>2);
  const defeatTrace=await page.evaluate(()=>window.PaperchalkSnowboundUI.motion.trace());
  assert(defeatTrace.some(e=>e.stage==="death-end"));
  assert(defeatTrace.some(e=>e.event==="transaction"&&e.detail.includes("defeat")));
  assert.deepEqual(errors,[],"no browser errors");
  summary.push({screen:cfg.label,passed:true,cause:defeatState.cause,
   victoryImpact:winTrace.filter(e=>e.stage==="impact").length,
   defeatImpact:defeatTrace.filter(e=>e.stage==="impact").length});
  console.log("PASS "+cfg.label+" fatal damage → death → victory / defeat audit");
 }catch(e){
  summary.push({screen:cfg.label,passed:false,error:String(e.stack||e),errors});
  await page.screenshot({path:OUT+"/"+cfg.label+"-FAIL.png"}).catch(()=>{});
  console.error("FAIL outcomes "+cfg.label,e.stack);
 }finally{await context.close()}
}
fs.writeFileSync(OUT+"/summary.json",JSON.stringify(summary,null,2));
await browser.close();
assert(summary.every(s=>s.passed),"Cinematic victory/defeat test failed");
