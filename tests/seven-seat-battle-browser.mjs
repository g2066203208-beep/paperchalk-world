import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const out='artifacts/seven-seat-battle';
fs.mkdirSync(out+'/videos',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
for(const d of [
 {name:'desktop',width:1440,height:900,touch:false},
 {name:'phone-portrait',width:390,height:844,touch:true},
 {name:'phone-landscape',width:844,height:390,touch:true}
]){
 const context=await browser.newContext({
  viewport:{width:d.width,height:d.height},deviceScaleFactor:1,
  isMobile:d.touch,hasTouch:d.touch,
  recordVideo:{dir:out+'/videos',size:{width:d.width,height:d.height}}
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(String(err.stack||err)));
 try{
  const response=await page.goto('http://127.0.0.1:4173/card-battle/character-card-machine.html',
   {waitUntil:'domcontentloaded',timeout:20000});
  assert.equal(response.status(),200,'the ORIGINAL slot-machine URL must host the NEW seven-seat game');
  await page.waitForFunction(()=>window.SevenSeatBattleQA?.state?.heroes?.length===7,{timeout:30000});
  const first=await page.evaluate(()=>window.SevenSeatBattleQA.snapshot);
  assert.equal(first.seats.enemy.length,7);
  assert.equal(first.seats.ally.length,7);
  assert.equal(first.hand.length,0,'DO NOT automatically draw the action hand');
  assert.equal(first.round,1);
  assert.deepEqual(first.seats.enemy.map(Boolean),[false,true,false,true,false,true,false]);
  assert.equal(await page.locator('#enemy-seats .seat').count(),7);
  assert.equal(await page.locator('#ally-seats .seat').count(),7);
  assert.equal(await page.locator('#hero-reserve .reserve').count(),7);
  assert.equal(await page.locator('#ally-seats .pocket-deck').count(),0,
   'undeployed heroes have NO unlocked physical action decks under their cards');
  assert.equal(await page.locator('#ally-seats .pocket-mini').count(),0,
   'all seven ally card-position pockets must begin empty');
  assert.equal(await page.locator('#ally-seats .seat-column').count(),7);
  assert.equal(await page.locator('#enemy-seats .seat-column').count(),7);
  assert.equal(await page.locator('#enemy-seats .enemy-pile').count(),3,
   'each live enemy has a real face-down action cue under its character');
  const oldSlotSources=await page.evaluate(()=>window.SevenSeatBattleQA.cardPhysics);
  assert(oldSlotSources.legacyLighting&&oldSlotSources.legacyRevealTiming,
   'the new battle must REUSE the existing slot PBR lighting and card-reveal timing');
  assert.equal(oldSlotSources.physicalIntegrator,'semi-implicit-euler-spring-impulse');
  assert(oldSlotSources.realCardGeometry,'battle card flights must use real Three.js 3D mesh, not CSS-only fades');
  assert((await page.evaluate(()=>window.SevenSeatBattleQA.actualAssets.ally))
   .every(url=>url.includes('/assets/characters/wonder-circus/')&&/\.(png|webp)$/.test(url)),
   'the user-approved REAL character artwork must be loaded from GitHub');
  const geometry=await page.evaluate(()=>{
   const bb=document.querySelector('.board').getBoundingClientRect();
   const ally=[...document.querySelectorAll('#ally-seats .seat')].map(el=>el.getBoundingClientRect().toJSON());
   const foe=[...document.querySelectorAll('#enemy-seats .seat')].map(el=>el.getBoundingClientRect().toJSON());
   return {board:bb.toJSON(),ally,foe,bodyScroll:document.documentElement.scrollWidth,
    viewport:window.innerWidth,cssViewport:document.documentElement.clientWidth,
    visualViewport:window.visualViewport?.width,
    overflowNodes:[...document.querySelectorAll('.top,.bottom,.board,.rail,.decks,.hand,.tool-label,.controls')].map(e=>({tag:e.tagName,cls:e.className,rect:e.getBoundingClientRect().toJSON()})).filter(x=>x.rect.width>document.documentElement.clientWidth+5).slice(0,8)};
  });
  for(const [label,seats] of Object.entries({ally:geometry.ally,foe:geometry.foe})){
   assert.equal(seats.length,7);
   assert(seats.every(x=>x.width>=29 && x.height>=43),
    label+' must show all seven real tappable card-sized positions on '+d.name);
   assert(seats.every(x=>x.left>=geometry.board.left-2&&x.right<=geometry.board.right+2),
    label+' positions must not clip beyond board container');
  }
  assert(Math.abs(geometry.viewport-d.width)<=2,
   'mobile CSS viewport must be '+d.width+'px, got '+JSON.stringify(geometry));
  assert(Math.abs(geometry.cssViewport-d.width)<=2,
   'layout viewport must match the actual device width, not an inflated virtual phone');
  assert(geometry.bodyScroll<=d.width+4,
   'no horizontal page overflow on '+d.name+' '+JSON.stringify(geometry.overflowNodes));
  await page.waitForFunction(()=>{
   const img=document.querySelector('#hero-reserve img');
   return img?.complete&&img.naturalWidth>=320;
  },{timeout:18000});
  const baselinePNG=await page.screenshot({path:out+'/'+d.name+'-00-first-game-seven-vs-seven.png',fullPage:true});
  assert.equal(baselinePNG.readUInt32BE(16),d.width,
    'a true '+d.width+'px device screenshot must not be wider because of uncontained game UI');
  await page.locator('#hero-reserve .reserve').first().click();
  assert.equal(await page.locator('#ally-seats [data-selectable="true"]').count(),7);
  await page.locator('#ally-seats .seat').nth(3).click();
  let deployed=await page.evaluate(()=>window.SevenSeatBattleQA.snapshot);
  assert(deployed.seats.ally[3]?.includes('团长'),'actual ringmaster should deploy into player seat 4');
  assert.equal(deployed.decks[Object.keys(deployed.decks)[0]].unlocked,true);
  assert.equal(await page.locator('#ally-seats .pocket-deck').count(),1);
  assert.equal(await page.locator('#ally-seats .pocket-mini').count(),0);
  assert.equal((await page.evaluate(()=>window.SevenSeatBattleQA.ownerStacks))[3].ownerId,
   (await page.evaluate(()=>window.SevenSeatBattleQA.state.heroes[0].id)),
   "ringmaster stack belongs ONLY under the ringmaster seat");
  assert.equal(await page.locator('#owner-fan[hidden]').count(),1);
  assert.equal(deployed.energy,3);
  await page.waitForTimeout(980);
  await page.screenshot({path:out+'/'+d.name+'-01-real-ringmaster-deployed.png',fullPage:true});
  await page.locator('#ally-seats .pocket-deck').first().click();
  assert.equal(await page.locator('#owner-fan-cards .action').count(),1,
   "manual draw from deployed ringmaster-owned deck");
  assert.equal((await page.evaluate(()=>window.SevenSeatBattleQA.snapshot)).hand.length,1);
  assert.equal(await page.locator('#ally-seats .pocket-mini').count(),1,
   'the drawn card must be visibly STACKED UNDER ITS OWNER, not in a detached action rail');
  assert.equal(await page.locator('#owner-fan').isVisible(),true,
   'clicking own card back should physically unfold only this hero\'s hand');
  assert.equal(await page.locator('.hand-section').count(),0,
   'previous global hand strip must be removed altogether');
  assert.equal(await page.locator('.deck-section').count(),0,
   'previous global deck strip must be removed altogether');
  await page.waitForTimeout(1200);
  const realPhysics=await page.evaluate(()=>window.SevenSeatBattleQA.cardPhysics);
  assert(realPhysics.cardFlights>=2,'real Three.js flights must run on both deployment and manual draw');
  await page.locator('#owner-fan-cards .action').first().click();
  const noValid=await page.locator('#enemy-seats [data-target="true"]').count();
  assert.equal(noValid,3,'target hints must exclude all four empty enemy seats');
  const before=await page.evaluate(()=>window.SevenSeatBattleQA.snapshot);
  await page.locator('#enemy-seats .seat').first().click();
  const refused=await page.evaluate(()=>window.SevenSeatBattleQA.snapshot);
  assert.equal(refused.energy,before.energy,'illegal target does not spend energy');
  assert.equal(refused.hand.length,before.hand.length,'illegal target does not burn the card');
  await page.locator('#enemy-seats .seat').nth(1).click();
  // Frame-synchronized proof of blackjack-style warm edge, small numeric
  // damage and bright localized contact pool on a REAL WebGL card hit.
  await page.waitForFunction(()=>document.querySelectorAll('.battle-floating-number').length>0,
   {timeout:2500});
  assert.equal(await page.locator('#battle-sparks .battle-lightpool').count(),1,
   'card impact MUST create a short-lived amber light pool, not flat CSS border');
  assert.equal(await page.locator('#battle-sparks .battle-impact-ring').count(),1);
  assert((await page.locator('#battle-sparks .battle-floating-number').first().textContent()).startsWith('-'),
   'damage must produce timed floating numeric impact');
  const flourish=await page.evaluate(()=>{
   const el=document.querySelector('#enemy-seats .seat:nth-child(1)');
   const card=[...document.querySelectorAll('#enemy-seats .seat')][1];
   return {impactClass:card?.classList.contains('hit-shock'),
    frameCss:performance.now(),
    visual:window.SevenSeatBattleQA.presentation,
    motion:window.SevenSeatBattleQA.cardPhysics};
  });
  assert.equal(flourish.impactClass,true,'physical card landing triggers real target recoil');
  assert(flourish.visual.feltTextureReady&&flourish.visual.impactLayerReady&&flourish.visual.blackjackFeelCSS,
   'worn dark felt, material and impact layer actually integrated into hosted game');
  assert(flourish.motion.tableMotionTimings.action<=500,
   'battle uses reference-inspired brisk card rhythm, NOT the old 1.65 sec elastic flight');
  // Avoid wall-clock assumptions on slow headless GPU: sample the
  // actual animated pseudo-element and capture once its amber rim reaches
  // visible brightness. Tests otherwise accidentally screenshot t=0 or
  // after the class has finished on overloaded CI.
  await page.waitForFunction(()=>{
   const card=[...document.querySelectorAll('#enemy-seats .seat')][1];
   return Number(getComputedStyle(card,'::after').opacity)>.60;
  },{timeout:1300});
  assert.equal(await page.locator('#battle-sparks .battle-floating-number').count(),1,
   'a readable floating damage number must overlap the bright rim beat');
  const flareCss=await page.evaluate(()=>{
   const hit=[...document.querySelectorAll('#enemy-seats .seat')][1];
   const after=window.getComputedStyle(hit,'::after');
   const pool=window.getComputedStyle(document.querySelector('.battle-lightpool'));
   return {edgeOpacity:Number(after.opacity),edgeShadow:after.boxShadow,
    poolOpacity:Number(pool.opacity),poolBackground:pool.backgroundImage};
  });
  assert(flareCss.edgeOpacity>.45,
   'gold edge should remain visibly bright on captured reference peak: '+JSON.stringify(flareCss));
  assert(flareCss.edgeShadow!=='none','physical card should have an active warm emissive rim');
  assert(flareCss.poolBackground.includes('radial-gradient'),
   'impact glow gradient did not render: '+JSON.stringify(flareCss));
  await page.screenshot({path:out+'/'+d.name+'-08-amber-edge-hit-flare.png',fullPage:true});
  const hit=await page.evaluate(()=>window.SevenSeatBattleQA.snapshot);
  assert.equal(hit.hand.length,0);
  assert(hit.health.enemy[1]<before.health.enemy[1],'actual enemy HP decreases on damage');
  await page.screenshot({path:out+'/'+d.name+'-02-first-attack-on-enemy.png',fullPage:true});
  // A newly drawn friendly shield can target our own character card.
  await page.locator('#ally-seats .pocket-deck').first().click();
  await page.locator('#owner-fan-cards .action').first().click();
  await page.locator('#ally-seats .seat').nth(3).click();
  const shield=await page.evaluate(()=>window.SevenSeatBattleQA.state.allySeats[3]?.shield);
  assert(shield>0,'playing onto an ally must apply a real shield');
  await page.waitForTimeout(770);
  await page.screenshot({path:out+'/'+d.name+'-03-support-ally-card.png',fullPage:true});
  await page.locator('#ally-seats .pocket-deck').first().click();
  await page.locator('#owner-fan-cards .action').first().click();
  await page.locator('#enemy-seats .seat').nth(1).click();
  assert((await page.evaluate(()=>window.SevenSeatBattleQA.snapshot)).health.enemy[1]>
   hit.health.enemy[1],'healing an enemy is deliberately allowed for any-target cards');
  const oldRound=await page.evaluate(()=>window.SevenSeatBattleQA.snapshot);
  await page.locator('#end-turn').click();
  const next=await page.evaluate(()=>window.SevenSeatBattleQA.snapshot);
  assert.equal(next.round,2);
  assert.equal(next.energy,4);
  assert.equal(next.hand.length,oldRound.hand.length,'no automatic draws on next turn');
  assert(next.health.ally[3]<=oldRound.health.ally[3],
   'enemy turn should apply real combat changes');
  await page.screenshot({path:out+'/'+d.name+'-04-enemy-turn-and-next-round.png',fullPage:true});
  // Touch tap and desktop pointer drag use same deployment engine.
  if(d.touch){
   await page.locator('#hero-reserve .reserve').nth(1).tap();
   await page.locator('#ally-seats .seat').nth(5).tap();
  }else{
   await page.locator('#hero-reserve .reserve').nth(1).dragTo(
    page.locator('#ally-seats .seat').nth(5),{timeout:15000});
  }
  const second=await page.evaluate(()=>window.SevenSeatBattleQA.snapshot);
  assert(second.seats.ally[5], 'second hero must be deployable by pointer/touch');
  assert.equal(Object.values(second.decks).filter(x=>x.unlocked).length,2,
   'each hero unlocks its own DECK, not the whole roster');
  assert.equal(await page.locator('#ally-seats .pocket-deck').count(),2);
  // Demonstrate ACTUAL overlapping hands beneath each separate hero card.
  await page.locator('#ally-seats .pocket-deck').nth(0).click();
  await page.locator('#ally-seats .pocket-deck').nth(0).click();
  await page.locator('#ally-seats .pocket-deck').nth(1).click();
  const grouped=await page.evaluate(()=>window.SevenSeatBattleQA.ownerStacks);
  assert.equal(grouped[3].hand.length,2,
   'ringmaster holds two physical action cards beneath seat 4');
  assert.equal(grouped[5].hand.length,1,
   'acrobat holds one different physical action card beneath seat 6');
  assert.equal(await page.locator('#ally-seats .seat-column').nth(3).locator('.pocket-mini').count(),2);
  assert.equal(await page.locator('#ally-seats .seat-column').nth(5).locator('.pocket-mini').count(),1);
  assert.equal(await page.locator('#ally-seats .pocket-mini').count(),3,
   'all three drawn cards must overlap THEIR OWN character, not the global hand rail');
  await page.waitForTimeout(1050);
  await page.screenshot({path:out+'/'+d.name+'-05-two-owners-two-independent-decks.png',fullPage:true});
  // Drawing from the second deck auto-focuses that owner. Clicking its
  // same pocket toggles COLLAPSE, so first switch to ringmaster, then back.
  await page.locator('#ally-seats [data-owner-open]').first().click();
  await page.locator('#ally-seats [data-owner-open]').last().click();
  assert.equal(
   await page.evaluate(()=>window.SevenSeatBattleQA.focusedOwner),
   await page.evaluate(()=>window.SevenSeatBattleQA.state.heroes[1].id),
   'second character expands HER own pocket, not another hero card');
  assert.equal(await page.locator('#owner-fan-cards .action').count(),1,
   'expansion shows ONLY the acrobat\'s action card, never the ringmaster\'s two cards');
  await page.locator('#owner-fan-draw').click();
  const localDraw=await page.evaluate(()=>window.SevenSeatBattleQA.ownerStacks);
  assert.equal(localDraw[3].hand.length,2,'local draw must never modify another character\'s hand');
  assert.equal(localDraw[5].hand.length,2,'large touch draw button must draw from selected character ONLY');
  assert.equal(await page.locator('#owner-fan-cards .action').count(),2,
   'expanded owner pocket must now show two acrobat-only cards');
  await page.waitForTimeout(850);
  await page.screenshot({path:out+'/'+d.name+'-07-physical-owner-hand-unfold.png',fullPage:true});
  await page.locator('#owner-fan-close').click();
  assert.equal(await page.locator('#owner-fan[hidden]').count(),1,
   'closing a hand must tuck the fan back under the owner character');
  assert.equal(await page.locator('#ally-seats .seat-column').count(),7);
  const owners=await page.evaluate(()=>window.SevenSeatBattleQA.ownerStacks);
  assert.equal(owners[3].ownerId===owners[5].ownerId,false,
   'two separate characters must NOT share one visible hand stack');
  assert.equal(await page.locator('#owner-fan').count(),1,
   'only one focused character fan may be unfolded at a time');
  await page.waitForFunction(()=>window.SevenSeatBattleQA.cardPhysics.coinSpriteReady,{
   timeout:25000
  });
  const award=await page.evaluate(()=>window.SevenSeatBattleQA.triggerWinCoins());
  assert.equal(award,true,'battle must call actual slot FastCoinPayout physics, not fake particles');
  await page.waitForTimeout(680);
  const gold=await page.evaluate(()=>window.SevenSeatBattleQA.cardPhysics);
  assert.equal(gold.reusedSlotCoinPhysics,true);
  assert(gold.actualCoinBodies>=8,'real 3D coin bodies must spawn in win burst');
  assert(gold.coinPhysicsModel.includes('spatial-hash'),'reuse the exact proven slot coin collision engine');
  await page.screenshot({path:out+'/'+d.name+'-06-real-physical-ten-sided-gold-reward.png',fullPage:true});

  await page.locator('#restart').click();
  const restarted=await page.evaluate(()=>window.SevenSeatBattleQA.snapshot);
  assert.equal(restarted.hand.length,0);
  assert.equal(restarted.seats.ally.filter(Boolean).length,0);
  assert.equal(restarted.round,1);
  assert.equal(await page.locator('#ally-seats .seat').count(),7);
  assert.equal(await page.locator('#enemy-seats .seat').count(),7);
  assert.equal(errors.length,0,'JavaScript page errors: '+errors.join('\n'));
  console.log('PASS',d.name,'real portraits and functional 7+7 tableau: deploy, draw, target both sides, turns, reset');
  results.push({viewport:d.name,passed:true,slots:14,characters:7,
   screenshotCount:9,issues:errors});
 }catch(err){
  console.error('FAIL',d.name,err.stack||err);
  results.push({viewport:d.name,passed:false,error:String(err.stack||err),issues:errors});
  await page.screenshot({path:out+'/'+d.name+'-FAIL.png',fullPage:true}).catch(()=>{});
 }finally{await context.close();}
}
await browser.close();
fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
assert(results.every(x=>x.passed),'Seven-seat Black Jacket-style real browser QA did not pass all three screens');
