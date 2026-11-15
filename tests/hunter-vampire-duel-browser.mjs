/* Real Chromium visual and interaction QA for Silver Moon Road.
 * Checks 16:9 desktop, landscape phone, portrait phone and tablet.
 * Exports pixel screenshots and machine-readable per-viewport layout metrics.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium,devices } from 'playwright';

const BASE='http://127.0.0.1:4173/card-battle/hunter-vampire-duel.html';
const OUT='artifacts/hunter-vampire-duel';
fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let failures=0;
const cases=[
 {name:'desktop-1920x1080',viewport:{width:1920,height:1080},mobile:false},
 {name:'laptop-1366x768',viewport:{width:1366,height:768},mobile:false},
 {name:'phone-landscape-844x390',viewport:{width:844,height:390},mobile:true},
 {name:'phone-portrait-390x844',viewport:{width:390,height:844},mobile:true},
 {name:'tablet-1024x768',viewport:{width:1024,height:768},mobile:true}
];
const summaries=[];
for(const test of cases){
 const context=await browser.newContext({viewport:test.viewport,isMobile:test.mobile,hasTouch:test.mobile,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('JS: '+e.message));
 page.on('response',response=>{if(response.status()>=400&&/hunter-vampire|bounty-markswoman|vampire-princess|duel-card-art|duel-night-forest/i.test(response.url()))errors.push('HTTP '+response.status()+' '+response.url());});
 try{
  await page.goto(BASE,{waitUntil:'networkidle',timeout:25000});
  await page.waitForFunction(()=>!!window.__hunterVampireDuel?.state,{timeout:12000});
  await page.locator('#start-game').click();
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.action-card').count(),5,'initially exactly five cards');
  const metric=await page.evaluate(()=>{
   const rect=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)}};
   const cards=[...document.querySelectorAll('.action-card')].map(e=>{const r=e.getBoundingClientRect();return {name:e.querySelector('.card-title')?.textContent,x:+r.x.toFixed(1),y:+r.y.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1),w:+r.width.toFixed(1)}});
   const img=id=>{const e=document.getElementById(id);return {loaded:!!e.naturalWidth,w:e.naturalWidth,h:e.naturalHeight}};
   return {viewport:{width:innerWidth,height:innerHeight},hero:rect('#hero-wrap'),enemy:rect('#vampire-wrap'),top:rect('.topbar'),arena:rect('.arena'),dock:rect('.action-dock'),energy:rect('.energy-orb'),draw:rect('#draw-cards'),discard:rect('#discard-pile'),end:rect('#end-turn'),intent:rect('#intent-panel'),cards,origins:{hunter:img('hero-original'),vampire:img('vampire-original')},cutouts:{hunter:document.getElementById('hero-wrap').classList.contains('is-cutout'),vampire:document.getElementById('vampire-wrap').classList.contains('is-cutout')},horizOverflow:document.documentElement.scrollWidth-innerWidth,vertOverflow:document.documentElement.scrollHeight-innerHeight,gameState:window.__hunterVampireDuel.state};
  });
  assert(metric.origins.hunter.loaded,'hunter source image must load');
  assert(metric.origins.vampire.loaded,'vampire source image must load');
  assert(metric.cutouts.hunter&&metric.cutouts.vampire,'both Anima art cutouts must be present');
  assert(metric.hero.x<metric.enemy.x,'hunter must be left of vampire');
  assert(metric.cards.length===5,'fan hand five');
  assert(metric.cards.every(c=>c.right>=0&&c.x<=test.viewport.width),'cards accessible on screen');
  assert(metric.end.right<=test.viewport.width+2,'end turn must not spill outside viewport');
  assert(metric.draw.x>=-3,'draw pile accessible');
  assert(metric.intent.x>=0&&metric.intent.right<=test.viewport.width+3,'enemy intent visible');
  assert(metric.horizOverflow<4,'no horizontal document overflow');
  assert(metric.vertOverflow<4,'no vertical document overflow');

  // Portrait and landscape touch targets must not be covered by any card.
  const intersectArea=(a,b)=>{
   const w=Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x));
   const h=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
   return w*h;
  };
  for(const control of [metric.energy,metric.draw,metric.discard,metric.end]){
   assert(control,'primary battle control present');
   for(const c of metric.cards){
    const overlap=intersectArea(control,c);
    const max=Math.min(control.w*control.h,c.w*(c.bottom-c.y));
    assert(overlap<max*.11,'card must not cover energy, deck, discard or end-turn controls: '+test.name+' '+JSON.stringify({control,c,overlap,max}));
   }
  }

  await page.screenshot({path:OUT+'/'+test.name+'-initial.png',fullPage:true});
  const first=page.locator('.action-card').first();
  await first.click();
  assert.equal(await page.locator('#selected-preview').isVisible(),true,'clicking selects and previews');
  await page.locator('#play-selected').click();
  await page.waitForTimeout(750);
  const afterAttack=await page.evaluate(()=>window.__hunterVampireDuel.state);
  assert.equal(afterAttack.ap,2,'first quick shot costs 1 AP');
  assert.equal(afterAttack.hand.length,4,'first shot consumes one hand card');
  await page.locator('#end-turn').click();
  await page.waitForTimeout(1350);
  const afterTurn=await page.evaluate(()=>window.__hunterVampireDuel.state);
  assert.equal(afterTurn.turn,2,'turn advances');
  assert.equal(afterTurn.hand.length,0,'next turn starts with manual draw');
  assert.equal(afterTurn.drawAllowance,5,'five manual draws available');
  await page.locator('#draw-cards').click();
  await page.waitForTimeout(250);
  const afterDraw=await page.evaluate(()=>window.__hunterVampireDuel.state);
  assert.equal(afterDraw.hand.length,1,'drawing yields card');
  assert.equal(afterDraw.drawAllowance,4,'draw uses one allowance');
  await page.screenshot({path:OUT+'/'+test.name+'-turn2.png',fullPage:true});
  assert.deepEqual(errors,[],'no script or asset errors');
  summaries.push({...test,ok:true,metric:{...metric,gameState:undefined},steps:{firstCardPlayed:true,advancedToTurn2:true,manualDraw:true},errors});
  console.log('PASS',test.name,JSON.stringify({hero:metric.hero,enemy:metric.enemy,cardXs:metric.cards.map(x=>x.x),cardWidth:metric.cards[0].w,footerTop:metric.dock.y,portraitLoaded:metric.origins,cutouts:metric.cutouts}));
 }catch(e){
  failures++;
  try{await page.screenshot({path:OUT+'/'+test.name+'-FAILED.png',fullPage:true})}catch{}
  console.error('FAIL',test.name,e.stack||e,errors);
  summaries.push({...test,ok:false,error:String(e),errors});
 }finally{await context.close();}
}
fs.writeFileSync(OUT+'/metrics.json',JSON.stringify(summaries,null,2)+'\n');
await browser.close();
assert.equal(failures,0,failures+' responsive browser cases failed');
console.log('All Hunter × Vampire mobile + desktop browser interaction tests passed.');
