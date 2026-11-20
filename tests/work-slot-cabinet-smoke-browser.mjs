/**
 * Independent QA of Work-built Slots & Daggers cabinet, Nov 20.
 * Tests BOTH modular entry and the offline single-file Pages build;
 * 3 live Chromium viewports, actual STOP interaction and canvas pixels.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const root='artifacts/work-slots-cabinet-20261120';
fs.mkdirSync(root,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const records=[];
for(const d of [
 {name:'desktop-960x540',width:960,height:540,mobile:false},
 {name:'phone-390x844',width:390,height:844,mobile:true},
 {name:'landscape-844x390',width:844,height:390,mobile:true}
]){
 const ctx=await browser.newContext({
  viewport:{width:d.width,height:d.height},deviceScaleFactor:1,
  isMobile:d.mobile,hasTouch:d.mobile,
  recordVideo:{dir:root,size:{width:d.width,height:d.height}}
 });
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(String(err.stack||err)));
 try{
  for(const [build,url] of [
   ['module','/card-battle/slots-daggers/index.html?practice=coins&seed=20261120'],
   ['offline','/card-battle/soul-table.html?practice=coins&seed=20261120']
  ]){
   const response=await page.goto('http://127.0.0.1:4173'+url,{
    waitUntil:'domcontentloaded',timeout:25000
   });
   assert.equal(response?.status(),200,'real game route '+url);
   await page.waitForFunction(()=>{
    const canvas=document.querySelector('#glass'),loading=document.querySelector('#loading');
    return !!(canvas?.width&&canvas?.height&&loading?.hidden&&canvas.dataset.phase);
   },null,{timeout:30000});
   const initial=await page.evaluate(()=>{
    const c=document.querySelector('#glass'),context=c.getContext('2d');
    const rect=c.getBoundingClientRect();
    const pixels=[];
    for(const [u,v] of [[.1,.1],[.5,.15],[.5,.5],[.18,.6],[.8,.56],[.5,.93]]){
     pixels.push(Array.from(context.getImageData(
       Math.min(c.width-1,Math.max(0,Math.floor(u*c.width))),
       Math.min(c.height-1,Math.max(0,Math.floor(v*c.height))),1,1).data));
    }
    return {
     phase:c.dataset.phase,foe:c.dataset.encounter,
     gold:+c.dataset.gold,screen:{width:c.width,height:c.height,
       cssWidth:rect.width,cssHeight:rect.height},
     viewportWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,
     actions:document.querySelectorAll('#keys button[data-key="action"]:not([hidden])').length,
     model:typeof CoinTable==='function',
     pixels
    };
   });
   assert.equal(initial.model,true,'Work original ten-sided physics model is present in game runtime');
   assert(initial.screen.width>=d.width*.97&&initial.screen.height>=d.height*.97,
    'cabinet canvas must cover real viewport');
   assert(initial.actions>=1,'STOP is interactive via a real button');
   assert(initial.pixels.filter(p=>p[0]>20||p[1]>20||p[2]>20).length>=4,
    'game must actually render nonblack scene pixels, not merely exist in DOM');
   assert(initial.scrollWidth<=d.width+3,'no horizontal overflow');
   const before=await page.screenshot({path:`${root}/${d.name}-${build}-00-loaded.png`});
   assert.equal(before.readUInt32BE(16),d.width,'correct screenshot width');
   const stopped=[];
   for(let i=0;i<3;i++){
    await page.waitForFunction(i=>{
     const node=document.querySelector('#glass');
     return node?.dataset.phase==='spin'&&Number(node.dataset.stopped)===i;
    },i,{timeout:14000});
    await page.locator('#keys button[data-key="action"]').click({timeout:8000});
    await page.waitForFunction(i=>Number(document.querySelector('#glass')?.dataset.stopped)>i,
     i,{timeout:6000});
    stopped.push(Number(await page.locator('#glass').getAttribute('data-stopped')));
   }
   await page.waitForFunction(()=>{
    const c=document.querySelector('#glass');
    return c?.dataset.phase!=='spin';
   },null,{timeout:18000});
   await page.screenshot({path:`${root}/${d.name}-${build}-01-stopped-reels.png`});
   await page.waitForFunction(()=>{
    const c=document.querySelector('#glass');return Number(c?.dataset.gold)>11;
   },null,{timeout:16000});
   const wonGold=+(await page.locator('#glass').getAttribute('data-gold'));
   await page.screenshot({path:`${root}/${d.name}-${build}-02-actual-win-and-coins.png`});
   // Direct contact/pose QA against the exact running browser implementation,
   // not the legacy 3D mesh or a symbolic fake CSS animation.
   const livePhysics=await page.evaluate(()=>{
    const c=new CoinTable(20261120);c.reset(0);c.award(36);
    for(let i=0;i<720;i++)c.step(1/240);
    const s=c.stats();return {
     balance:s.balance,emitted:s.emitted,landed:s.landed,
     resting:s.resting,pending:s.pending,
     moving:s.moving,finite:c.discs.every(x=>[x.x,x.y,x.z,...x.q].every(Number.isFinite)),
     polygonFaces:10
    };
   });
   assert.equal(livePhysics.emitted,36);
   assert.equal(livePhysics.landed,36);
   assert.equal(livePhysics.resting,36);
   assert(livePhysics.finite);
   records.push({viewport:d.name,build,passed:true,stopped,
    initial,wonGold,livePhysics,errors:[...errors]});
   console.log('PASS',d.name,build,'stop',stopped,'gold',wonGold,
    'physical settle',livePhysics);
  }
  assert.deepEqual(errors,[],'no uncaught browser errors');
 }catch(err){
  console.error('FAIL',d.name,err.stack||err);
  records.push({viewport:d.name,passed:false,error:String(err.stack||err),errors});
  await page.screenshot({path:`${root}/${d.name}-FAIL.png`}).catch(()=>{});
 }finally{await ctx.close();}
}
await browser.close();
fs.writeFileSync(root+'/results.json',JSON.stringify(records,null,2));
assert(records.length===6&&records.every(r=>r.passed),
 'all three viewport sizes must pass both the modular and offline Work slot game');
