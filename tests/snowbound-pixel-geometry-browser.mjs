import assert from "node:assert/strict";
import {chromium} from "playwright";
import fs from "node:fs";
const OUT="artifacts/snowbound-pixel-audit";
fs.mkdirSync(OUT,{recursive:true});
const scenarios=[
 ["desktop-1920",1920,1080,190,205],
 ["laptop-1366",1366,768,128,160],
 ["mobile-landscape-844",844,390,69,70],
 ["mobile-portrait-390",390,844,76,85],
 ["tablet-1024",1024,768,96,145],
 ["compact-android-360",360,740,70,79],
 ["large-iphone-430",430,932,83,100]
];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const reports=[];
for(const [name,width,height,minW,minH] of scenarios){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 try{
  await page.goto("http://127.0.0.1:4173/card-battle/snowbound-journey.html",{waitUntil:"networkidle"});
  for(const action of ["town","new","leader","node"]){
   await page.locator('[data-act="'+action+'"]:visible:not([disabled])').first().click();
   await page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),null,{timeout:14000});
  }
  await page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),null,{timeout:14000});
  await page.waitForTimeout(90);
  const enemyPortraits=await page.locator(".battle-unit.enemy img").evaluateAll(imgs=>imgs.map(img=>({src:img.getAttribute("src"),loaded:img.complete&&img.naturalWidth>0})));
  assert.equal(enemyPortraits.length,2,"forest encounter uses two original Anima enemy character illustrations");
  assert(enemyPortraits.every(i=>i.loaded),"both original vampire minion portraits must load");
  const m=await page.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect();return{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)}};
    const q=s=>[...document.querySelectorAll(s)].map(e=>({name:e.getAttribute("aria-label")||e.textContent.trim().slice(0,14),box:box(e)}));
    const units=[...document.querySelectorAll(".battle-unit")].map(e=>({name:e.querySelector(".unit-name").textContent,font:parseFloat(getComputedStyle(e.querySelector(".unit-name")).fontSize),box:box(e)}));
    return {units,slots:q(".battle-grid .battle-slot"),cards:q(".battle-unit"),hand:q(".battle-bottom .hand .paint-card"),controls:q(".battle-field .battle-bell,.battle-field .reinforcement-bell,.battle-field .side-btn"),deck:box(document.querySelector(".battle-bottom")),field:box(document.querySelector(".battle-field")),overflowX:document.documentElement.scrollWidth-innerWidth,overflowY:document.documentElement.scrollHeight-innerHeight};
  });
  const intersect=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
  assert.equal(m.slots.length,12,"all 12 slots present");
  assert(m.cards.length>=3,"initial encounter visible");
  assert(m.cards.every(c=>c.box.w+2>=minW&&c.box.h+2>=minH),"cards too small: "+JSON.stringify(m.cards));
  assert(m.cards.every(c=>c.box.x>=-2&&c.box.right<=width+2&&c.box.y>=0&&c.box.bottom<=m.deck.y+2),"cards overlap tabletop or leave screen");
  assert(m.units.every(u=>u.font>=8),"character name smaller than 8 CSS pixels");
  assert(m.hand.length>=5&&m.hand.every(c=>c.box.x>=-2&&c.box.right<=width+2&&c.box.bottom<=height+2),"initial five-card hand clipped");
  assert(m.overflowX<=3&&m.overflowY<=3,"screen scroll overflow");
  for(let i=0;i<m.cards.length;i++)for(let j=i+1;j<m.cards.length;j++)
   assert(intersect(m.cards[i].box,m.cards[j].box)<4,"deployed cards overlap");
  for(const c of m.cards)for(const ctl of m.controls)
   assert(intersect(c.box,ctl.box)<c.box.w*c.box.h*.04,"UI control covers player card");
  const report={name,passed:true,size:[width,height],cardWidth:m.cards[0].box.w,cardHeight:m.cards[0].box.h,deckHeightPercent:+(100*m.deck.h/height).toFixed(1),units:m.units,controls:m.controls,slots:m.slots};
  await page.screenshot({path:OUT+"/"+name+"-real-battle.png",fullPage:true});
  await page.evaluate(()=>{
    for(const lane of document.querySelectorAll(".battle-grid")){
      for(const cell of lane.querySelectorAll(".battle-slot")){
        if(cell.querySelector(".battle-unit"))continue;
        const donor=document.querySelector(cell.dataset.side==="friendly"?".battle-unit.friendly":".battle-unit.enemy");
        if(!donor)continue;
        const clone=donor.cloneNode(true);
        clone.removeAttribute("data-act");clone.removeAttribute("data-id");
        clone.classList.remove("is-selected");
        cell.append(clone);
      }
    }
  });
  await page.screenshot({path:OUT+"/"+name+"-full-capacity-STRESS.png",fullPage:true});
  reports.push(report);
  console.log("PASS "+name+" card "+Math.round(report.cardWidth)+"x"+Math.round(report.cardHeight)+"px deck "+report.deckHeightPercent+"%");
 }catch(e){
  reports.push({name,passed:false,error:String(e.stack||e)});
  await page.screenshot({path:OUT+"/"+name+"-FAIL.png",fullPage:true}).catch(()=>{});
  console.error("FAIL "+name+" "+String(e.stack||e));
 }finally{await page.close();}
}
fs.writeFileSync(OUT+"/metrics.json",JSON.stringify(reports,null,2));
await browser.close();
assert(reports.every(r=>r.passed),"visual pixel geometry check failed");
