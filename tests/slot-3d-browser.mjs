/* Chrome screenshot / WebM QA for true-XYZ untextured cylindrical coin payout. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const dir='artifacts/slot-daggers-3d-coin-whitebox';fs.mkdirSync(dir+'/videos',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const samples=[{name:'desktop',w:1365,h:900},{name:'phone',w:390,h:844},{name:'landscape',w:844,h:390}];
const results=[];
for(const d of samples){
 const context=await browser.newContext({viewport:{width:d.w,height:d.h},deviceScaleFactor:1,
  isMobile:d.name!=='desktop',hasTouch:d.name!=='desktop',
  recordVideo:{dir:dir+'/videos',size:{width:d.w,height:d.h}}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e.stack||e)));
 try{
  const response=await page.goto('http://127.0.0.1:4173/card-battle/coin-whitebox-lab.html',{waitUntil:'networkidle'});
  assert.equal(response.status(),200);
  assert(await page.locator('#fire').isVisible());
  assert.equal(await page.evaluate(()=>typeof window.PaperchalkCoin3DQA?.seek),'function');
  const initial=await page.evaluate(()=>PaperchalkCoin3DQA.start(48));
  assert.equal(initial.total,18);
  const saved=[];
  for(const ms of [0,180,500,1100,2000,4300,7200]){
   const s=await page.evaluate(ms=>PaperchalkCoin3DQA.seek(ms),ms);
   await page.screenshot({path:`${dir}/${d.name}-${String(ms).padStart(5,'0')}ms.png`,animations:'disabled'});
   saved.push({ms,emitted:s.emitted,coinContacts:s.coinContacts,zMax:s.zRange[1]});
  }
  const full=await page.evaluate(()=>PaperchalkCoin3DQA.seek(2000));
  assert.equal(full.emitted,48);
  assert(full.peakSpeed>19,'strong 3D coin ejection must be obvious');
  assert(full.peakHeight>3,'coins must launch visibly into the air');
  assert(full.coinContacts>80,'independent 3D bodies must collide');
  assert(full.coins.some(c=>c.p[2]>.4),'true Z-axis stacking and bouncing');
  assert(full.coins.some(c=>c.vel[1]!==0),'true Y-depth, not a 2D X-Z solver');
  assert(full.coins.some(c=>Math.abs(c.q[0])>.1),'rotation must change in 3D');
  const a=await page.evaluate(()=>PaperchalkCoin3DQA.seek(1380));
  const b=await page.evaluate(()=>PaperchalkCoin3DQA.seek(1380));
  assert.deepEqual(a,b,'same seeded 120Hz simulation must reproduce across seek');
  for(const view of ['side','top','angle']){
   await page.evaluate(view=>PaperchalkCoin3DQA.view(view),view);
   await page.screenshot({path:`${dir}/${d.name}-${view}-at-1380ms.png`,animations:'disabled'});
  }
  await page.locator('#jackpot').click();await page.waitForTimeout(700);
  const next=await page.evaluate(()=>PaperchalkCoin3DQA.state);
  assert(next.total>full.total,'subsequent rewards must join existing 3D pile');
  assert.equal(errors.length,0,errors.join('\n'));
  results.push({name:d.name,passed:true,saved,after:next.total,errors});
  console.log('PASS 3D coin physical Chrome',d.name,JSON.stringify(saved));
 }catch(e){
  results.push({name:d.name,passed:false,error:String(e.stack||e),errors});
  await page.screenshot({path:`${dir}/${d.name}-FAIL.png`}).catch(()=>{});
 }finally{await context.close();}
}
await browser.close();
fs.writeFileSync(dir+'/results.json',JSON.stringify(results,null,2));
assert(results.every(r=>r.passed),'Chrome 3D whitebox checks failed');