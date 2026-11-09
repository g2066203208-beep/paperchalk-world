// Real published game DOM + calendar + first-arc cinematics, not a mock scene.
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
mkdirSync('artifacts/act-one',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:1});
page.setDefaultTimeout(30000);
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const snap=name=>page.screenshot({path:'artifacts/act-one/'+name,animations:'disabled'});
const state=()=>page.evaluate(()=>window.PaperWorldDailyLifeUI.snapshot());
const story=()=>page.evaluate(()=>window.PaperWorldDailyLifeUI.actOne.snapshot());
async function to(location){
  const r=await page.evaluate(async loc=>window.PaperWorldDailyLifeUI.navigate(loc),location);
  assert.equal(r?.ok,true,'Cannot travel to '+location+': '+JSON.stringify(r));
  await page.waitForFunction(loc=>window.PaperWorldDailyLifeUI.snapshot().location===loc,location);
}
async function clearDirector(){
  for(let j=0;j<4;j++){
    await page.evaluate(()=>window.PaperWorldDailyLifeUI.director?.close());
    await page.waitForTimeout(160);
  }
}
async function sceneAction(id){
  await clearDirector();
  await page.mouse.click(320,270);
  const button=page.locator('#overworld-scene-prompts [data-action="'+id+'"]');
  if(!await button.isVisible())await page.mouse.click(470,390);
  await button.waitFor({state:'visible'});
  await button.click();
}
try{
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#menu-start').click();
  const n=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
  for(let i=0;i<n;i++)await page.locator('#next-line').click();
  await page.waitForFunction(()=>window.PaperWorldDailyLifeUI?.isModeActive());
  await page.evaluate(()=>window.PaperWorldQuickTools?.phone?.close?.());
  await to('entrance');await to('school');
  await page.waitForFunction(()=>window.PaperWorldDailyLifeUI.actOne.snapshot().seen.includes('confession'));
  await page.waitForFunction(()=>window.PaperWorldDailyLifeUI.director?.active());
  assert.match(await page.locator('#pw-world-director').innerText(),/教室|女二|作业/);
  await snap('01-classroom-confession.png');
  await clearDirector();
  // Simulate the player's ordinary two sleeps, not an arbitrary story flag.
  let result=await page.evaluate(()=>{
    const e=window.PaperWorldDailyLifeUI.engine;
    return [e.travel('entrance'),e.travel('bedroom'),e.sleep(),e.sleep()].map(x=>({ok:x.ok,reason:x.reason}));
  });
  assert.ok(result.every(x=>x.ok),JSON.stringify(result));
  assert.equal((await state()).day,3);
  await to('entrance');await to('school');
  assert.equal((await story()).seen.includes('beforeFall'),false);
  // It must take place inside a class session, not on entering school.
  await sceneAction('study');
  await page.waitForFunction(()=>window.PaperWorldDailyLifeUI.actOne.snapshot().seen.includes('beforeFall'));
  for(let j=0;j<5;j++)await page.locator('#pw-world-director .pw-director-next').click();
  await page.waitForFunction(()=>document.querySelector('.pw-act-one-fall')?.classList.contains('is-falling'));
  assert.equal(await page.locator('#scene').getAttribute('data-scene'),'school');
  await snap('02-real-window-fall.png');
  await clearDirector();
  result=await page.evaluate(()=>{
    const e=window.PaperWorldDailyLifeUI.engine;
    return [e.travel('entrance'),e.travel('bedroom'),...Array.from({length:5},()=>e.sleep())]
      .map(x=>({ok:x.ok,reason:x.reason}));
  });
  assert.ok(result.every(x=>x.ok),JSON.stringify(result));
  assert.equal((await state()).day,8);
  await to('entrance');await to('school');
  await page.waitForFunction(()=>window.PaperWorldDailyLifeUI.actOne.snapshot().seen.includes('aftermath'));
  // Let the director sequence the later events, but advance dialogue at user speed.
  for(let j=0;j<65;j++){
    if((await story()).seen.includes('boyDeath'))break;
    const active=await page.evaluate(()=>window.PaperWorldDailyLifeUI.director?.active());
    if(active)await page.locator('#pw-world-director .pw-director-next').click();
    else await page.waitForTimeout(110);
  }
  assert.equal((await story()).seen.includes('boyDeath'),true);
  await snap('03-boy-death-news.png');
  await sceneAction('boy-home');
  await page.waitForFunction(()=>window.PaperWorldDailyLifeUI.snapshot().location==='classmate-home');
  assert.equal(await page.locator('#overworld-city-stage').getAttribute('data-location'),'classmate-home');
  await snap('04-home-hallway.png');
  await sceneAction('records');
  assert.equal((await story()).clues.includes('home-records'),true);
  await snap('05-private-company-records.png');
  // No big task UI or supernatural information given to every NPC.
  assert.equal(await page.locator('#daily-life-ui').count(),0);
  assert.deepEqual(errors,[],'Uncaught browser errors');
  console.log('PASS Act I: daily navigation, confession, class-window fall, dated deaths, house, optional contract trail');
}finally{await browser.close();}
