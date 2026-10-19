import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const base='http://127.0.0.1:8080/studios/nocturne/';
async function run(w,h){
 const page=await browser.newPage({viewport:{width:w,height:h},isMobile:true,hasTouch:true});
 const errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()})});
 try{
  const response=await page.goto(base,{waitUntil:'load'});assert.equal(response.status(),200);
  if(h>w){await page.locator('#stayPortrait').click();}
  await page.locator('#newGame').click();
  assert.equal(await page.locator('#titleLayer').isVisible(),false);
  for(let i=0;i<3;i++){await page.waitForTimeout(850);await page.locator('#nextText').click();}
  assert.equal(await page.locator('#roomMode').isVisible(),true);
  await page.screenshot({path:'artifacts/nocturne-cinematic-'+w+'x'+h+'.png',animations:'disabled'});
  await page.locator('[data-scene="phone"]').click();
  assert.equal(await page.locator('#phoneLayer').isVisible(),true);
  await page.locator('.thread').first().click();
  assert.ok((await page.locator('#phoneContent').innerText()).includes('校友照片'));
  await page.locator('.chat-actions button').first().click();
  assert.equal(await page.locator('#deskLayer').isVisible(),true);
  await page.locator('#evidenceActions button').nth(0).click();
  await page.locator('#evidenceActions button').nth(1).click();
  assert.equal(await page.locator('#evidenceActions button').count(),3);
  await page.locator('#evidenceActions button').nth(2).click();
  for(let i=0;i<2;i++){await page.waitForTimeout(850);await page.locator('#nextText').click();}
  await page.locator('[data-scene="phone"]').click();
  await page.locator('.thread').first().click();
  const choices=page.locator('.chat-actions button');
  await choices.last().click();
  for(let i=0;i<2;i++){await page.waitForTimeout(850);await page.locator('#nextText').click();}
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('paperworld.nocturne.cinematic.v3')));
  assert.equal(save.choice,'obey');assert.equal(save.flags.inferred,true);assert.equal(save.clues.clock,true);assert.equal(save.clues.caption,true);
  const m=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,sceneWidth:document.querySelector('.world').getBoundingClientRect().width}));
  assert.ok(m.scrollWidth<=m.width+1,JSON.stringify(m));assert.ok(m.scrollHeight<=m.height+1,JSON.stringify(m));
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log('PASS',w+'x'+h,JSON.stringify(m));
 }finally{await page.close()}
}
try{for(const [w,h] of [[844,390],[667,375],[1280,720],[390,844]])await run(w,h)}
finally{await browser.close()}
