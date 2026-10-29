/**
 * A genuine unmodified-save playthrough of all nine story chapters in Chromium.
 * NO injected days, metrics, command handlers or imported reducer calls.
 * Every operation is a visible UI button / route-map choice / calendar click.
 * World snapshots are read-only assertions and to select available story dialogue.
 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

await mkdir('artifacts/full-playthrough',{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.setDefaultTimeout(11000);
const log=[];
const report=async(step)=>{log.push({...step,at:new Date().toISOString()});console.log('PLAYTHROUGH '+JSON.stringify(step));};
const snapshot=()=>page.evaluate(()=>window.__OFFICE__.world());
const legacy=()=>page.evaluate(()=>window.__OFFICE__.state());

async function toLocation(target){
 const where=(await snapshot()).slices.origin.venue;
 if(where===target)return;
 await page.locator('.explore-root [data-explore-type="exit"]').click();
 await page.locator('.street-route-layer [data-route-place="'+target+'"]').click();
 await page.locator('.street-route-layer [data-route-go]').click();
 await page.waitForFunction(expected=>window.__OFFICE__.world().slices.origin.venue===expected,target,{timeout:12000});
 assert.equal((await snapshot()).slices.origin.venue,target,'physical route must actually change scene');
}
async function closeDialogue(){
 const exit=page.locator('.explore-dialogue:not([hidden]) [data-talk-close]');
 if(await exit.count())await exit.click();
}
async function getStory(){
 return page.evaluate(async()=>{
  const {activeStoryBeat}=await import('./systems/campaign.js');
  const w=window.__OFFICE__.world();
  const story=activeStoryBeat(w);
  return story?{...story,day:w.day,actionsToday:w.slices.campaign.actionsToday}:null;
 });
}
function selectChoice(beat){
 // All picked options really exist in the rendered dialogue. Never cheat by setting world state.
 const must={keys:'return-key','final-door':'people-rule'};
 if(must[beat.id])return must[beat.id];
 const candidates=beat.choices.filter(o=>(o.benefits?.cash||0)>=0);
 const ranked=(candidates.length?candidates:beat.choices).slice().sort((a,b)=>{
   const x=o=>(o.benefits?.resolve||0)*1.5+(o.benefits?.trust||0)*1.2+
     (o.benefits?.clues||0)*1.25+(o.benefits?.cash||0)*0.01;
   return x(b)-x(a);
 });
 return ranked[0].id;
}
let lastDay=1;
try{
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
 await page.locator('.explore-root').waitFor({state:'visible'});
 assert.equal((await legacy()).day,1,'new browser context must begin at DAY 1');
 assert.equal((await legacy()).cash,190,'first day must start with real 190 cash');
 assert.equal((await snapshot()).slices.origin.prologue.status,'active','intro begins normally');
 // Play the entire opening prologue, including the authored choice. NEVER click skip.
 for(let i=0;i<20;i++){
   const w=await snapshot(); if(w.slices.origin.prologue.status==='complete')break;
   const selected=page.locator('.prologue-presentation:not([hidden]) [data-prologue-step="choose"]');
   if(await selected.count())await selected.first().click();
   else await page.locator('.prologue-presentation:not([hidden]) [data-prologue-step="next"]').click();
 }
 assert.equal((await snapshot()).slices.origin.prologue.status,'complete','played full prologue');
 await page.screenshot({path:'artifacts/full-playthrough/00-prologue.png'});
 await report({event:'prologue-complete',day:1});
 // Do not patch localStorage; on this single save, physically click all 78 story encounters.
 for(let day=1;day<=39;day++){
   lastDay=day;
   let w=await snapshot(),l=await legacy();
   assert.equal(w.day,day,'world day must progress naturally');
   assert.equal(l.day,day,'economic day must remain synchronized with world');
   for(let index=0;index<2;index++){
     const beat=await getStory();
     assert.ok(beat, 'missing actionable story on DAY '+day+', action '+index);
     assert.equal(beat.actionsToday,index,'cannot skip or repeat a plot beat');
     await closeDialogue();
     await toLocation(beat.venue);
     const marker=page.locator('.explore-root [data-scene-day]');
     await marker.waitFor({state:'visible'});
     assert.match(await marker.innerText(),new RegExp(beat.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
     await marker.click();
     assert.ok(await page.locator('.explore-dialogue [data-talk-choice]').count()>=2,
       'story dialogue must show actionable choices');
     const selected=selectChoice(beat);
     const button=page.locator('.explore-dialogue [data-talk-choice="'+selected+'"]');
     assert.equal(await button.count(),1,'chosen action must be available in UI: '+selected);
     await button.click();
     w=await snapshot();
     assert.equal(w.slices.campaign.actionsToday,index+1,
       'scene click must actually advance campaign on day '+day);
     assert.equal(w.slices.campaign.decisions[beat.id],selected,
       'decision must actually persist in world');
     l=await legacy();
     assert.ok(Number.isFinite(l.cash),'cash must remain valid');
     await report({day,event:'choice',scene:beat.venue,beat:beat.id,decision:selected,cash:l.cash});
     await closeDialogue();
   }
   if([7,15,18,21,24,27,30,33,36,39].includes(day)){
     await page.screenshot({path:'artifacts/full-playthrough/chapter-day-'+day+'.png'});
   }
   if(day===39)break;
   // Phone call and earnings are played normally, including days with no earnings.
   await toLocation('office');
   await page.locator('.scene-object[data-explore-id="phone"]').click();
   const incoming=page.locator('#panel-body [data-phone="yes"]');
   assert.equal(await incoming.count(),1,'real daily call must be available on day '+day);
   await incoming.click();
   assert.equal((await legacy()).call.answered,true,'daily phone action must register');
   await page.locator('#close-panel').click();
   // Flip the physical calendar and pay normal operating expenses, no time travel.
   await page.locator('.story-wall-calendar').click();
   assert.match(await page.locator('#panel-title').innerText(),/翻到下一天/);
   await page.locator('#panel-body [data-next]').click();
   await page.waitForFunction(expected=>window.__OFFICE__.world().day===expected,day+1);
   assert.equal((await legacy()).day,day+1);
   assert.equal((await snapshot()).slices.campaign.actionsToday,0,
       'new day must reset narrative action counter');
   const balance=(await legacy()).cash;
   assert.ok(balance>=0,'normal playable economy cannot silently bankrupt the player: '+balance+' on DAY '+(day+1));
   await page.locator('#close-panel').click();
   if([7,15,21,27,33].includes(day)){
     // Actually reload from user save after major story milestones, not a fake fixture.
     await page.reload({waitUntil:'networkidle'});
     await page.locator('.explore-root').waitFor({state:'visible'});
     assert.equal((await snapshot()).day,day+1,'must resume naturally after chapter save');
     assert.ok((await snapshot()).slices.campaign.history.length>=day*2,
       'history survives browser restart');
   }
 }
 const finished=await snapshot();
 assert.ok(finished.slices.campaign.ending?.key,'the final choice must produce a genuine ending');
 assert.equal(finished.slices.campaign.history.length,78,'all 78 playable events completed');
 assert.equal(Object.keys(finished.slices.campaign.decisions).length,78,'all choices stored');
 assert.equal((await legacy()).day,39,'no injected time travel');
 await toLocation('office');
 await page.locator('.story-wall-calendar').click();
 const finale=page.locator('.chapter-finale');
 assert.ok(await finale.isVisible(),'finale available in calendar without data injection');
 assert.match(await finale.innerText(),new RegExp(finished.slices.campaign.ending.title));
 await page.screenshot({path:'artifacts/full-playthrough/39-endgame-archive.png',fullPage:true});
 await report({event:'FINAL_VERIFIED',day:39,ending:finished.slices.campaign.ending.key,
  choices:finished.slices.campaign.history.length,cash:(await legacy()).cash});
 await page.reload({waitUntil:'networkidle'});
 assert.deepEqual((await snapshot()).slices.campaign.ending,finished.slices.campaign.ending,
  'ending remains after the final browser reload');
 assert.deepEqual(errors,[],'zero uncaught page errors during 39-day run');
}catch(error){
 await report({event:'FAILED',day:lastDay,message:error.message});
 await page.screenshot({path:'artifacts/full-playthrough/FAILED-day-'+lastDay+'.png',fullPage:true}).catch(()=>{});
 await writeFile('artifacts/full-playthrough/report.json',JSON.stringify({
  result:'failure',day:lastDay,error:String(error.stack),logs:log,jsErrors:errors
 },null,2));
 await browser.close();
 throw error;
}
await writeFile('artifacts/full-playthrough/report.json',JSON.stringify({
 result:'pass',days:39,scenes:78,ending:(await snapshot()).slices.campaign.ending,
 chapterOutcomes:(await snapshot()).slices.campaign.chapterOutcomes,
 logs:log,jsErrors:errors
},null,2));
await browser.close();
console.log('PASS real UI complete playthrough DAY 1 to DAY 39');
