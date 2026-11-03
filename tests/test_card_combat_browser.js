/* Playwright smoke/integration for in-game card combat.
 * GitHub Actions runs this after building the real L2D source-part catalog.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const base=process.env.COMBAT_TEST_URL||'http://127.0.0.1:8133';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 try{
  fs.mkdirSync('artifacts/combat',{recursive:true});
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?combat=1&combatSeed=42',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperWorldCombatUI?.running&&
    document.querySelectorAll('#cb-hand .cb-card').length===5,
    null,{timeout:30000});
  assert.equal(await page.locator('#cb-allies .cb-unit').count(),2);
  assert.equal(await page.locator('#cb-enemies .cb-unit').count(),3);
  assert.equal(await page.locator('#cb-result').isVisible(),false);
  const state=await page.evaluate(()=>window.PaperWorldCombatUI.snapshot);
  assert.equal(state.phase,'player');
  assert.equal(state.energy,4);
  assert.equal(state.intents.length,3);
  assert.ok(await page.locator('#cb-intents').count()===0,
    'do not duplicate enemy preview panels');
  // The live L2D library is the existing game renderer, not a static screenshot.
  await page.waitForFunction(()=>window.PaperchalkCharacterDev?.ready,
    null,{timeout:30000});
  await page.waitForFunction(()=>window.PaperchalkL2DLibrary?.get('enemy')?.layers?.length===18&&
    window.PaperchalkCharacterDev.assigned.player.side==='front',
    null,{timeout:25000});
  await page.waitForFunction(()=>{
   const canvases=[...document.querySelectorAll('#cb-allies canvas[data-portrait]')];
   if(canvases.length!==2)return false;
   return canvases.every(canvas=>{
    const pixels=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
    for(let i=3;i<pixels.length;i+=16)if(pixels[i]>30)return true;
    return false;
   });
  },null,{timeout:25000});
  await page.screenshot({path:'artifacts/combat/01-opening.png'});
  const card=state.hand.find(x=>x.type==='attack');
  assert.ok(card);
  await page.locator('[data-card="'+card.uid+'"]').click();
  await page.locator('#cb-enemies [data-target="shade"]').click();
  let next=await page.evaluate(()=>window.PaperWorldCombatUI.snapshot);
  assert.ok(next.enemies[0].hp<state.enemies[0].hp);
  assert.ok(next.stats.allyAssists>=1,'ally must actually strike with the lead attacker');
  assert.ok(next.events.some(e=>e.kind==='assist'&&e.side==='ally'));
  await page.screenshot({path:'artifacts/combat/02-ally-chain.png'});
  await page.locator('#cb-end').click();
  next=await page.evaluate(()=>window.PaperWorldCombatUI.snapshot);
  assert.equal(next.round,2);
  assert.equal(next.phase,'player');
  assert.ok(next.stats.enemyAssists>=1,'enemies must coordinate too');
  assert.ok(next.events.some(e=>e.kind==='assist'&&e.side==='enemy'));
  await page.screenshot({path:'artifacts/combat/03-enemy-chain.png'});
  await page.locator('#cb-close').click();
  await page.waitForFunction(()=>window.PaperWorldCombatUI.running===false&&
    window.PaperchalkCharacterDev.assigned.player.side==='back',
    null,{timeout:20000});
  assert.ok(!errors.length,'no JS page errors: '+errors.join(' | '));
  await page.close();
  const small=await browser.newPage({viewport:{width:780,height:440},hasTouch:true});
  await small.goto(base+'/?combat=1',{waitUntil:'load'});
  await small.waitForFunction(()=>window.PaperWorldCombatUI?.running&&
    document.querySelectorAll('#cb-hand .cb-card').length===5,
    null,{timeout:25000});
  assert.ok(await small.locator('#cb-end').isVisible());
  assert.ok(await small.locator('#cb-hand').isVisible());
  assert.ok(await small.locator('#cb-enemies').isVisible());
  await small.screenshot({path:'artifacts/combat/04-compact-landscape.png'});
  await small.close();
  console.log('PASS real browser: 2 allies + 3 enemies, original live ArtMesh portraits, player and enemy follow-ups, slot restoration and compact viewport');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
