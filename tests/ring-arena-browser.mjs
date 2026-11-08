/* Actual Chromium proof: never substitute an AI mock for the real game. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
 '.json':'application/json','.webp':'image/webp','.png':'image/png',
 '.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!file.startsWith(root+'/'))return res.writeHead(403).end();
 let bytes;
 try{bytes=readFileSync(file)}catch{res.writeHead(404).end('not found');return}
 res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(bytes);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
mkdirSync('artifacts/ring-arena',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/index.html?scene=ring-arena',{waitUntil:'domcontentloaded',timeout:50000});
 const inspect=()=>page.evaluate(()=>window.PaperWorldGameRingArena?.inspect());
 await page.waitForFunction(()=>{
  const a=window.PaperWorldGameRingArena?.inspect();
  return a?.active&&a?.renderer==='webgl-l2d'&&a?.heroStatic===true&&
   a?.previewPose==='female7'&&a?.eyeLevel===true&&a?.l2dReady===8&&a?.heroTextureUploads>=1;
 },null,{timeout:160000});
 await page.waitForFunction(()=>window.PaperWorldGameRingArena?.inspect()?.wallMaterial?.ready===true,
  null,{timeout:15000});
 await page.waitForTimeout(650);
 const outer=await inspect();
 assert.equal(outer.wallMaterial.kind,'curved-webgl-wall');
 assert.equal(outer.wallMaterial.repeats,9);
 assert.equal(outer.wallMaterial.heightMeters,2.85);
 assert.ok(outer.lighting.physicallyGroundedShadows>=8,'original 3D L2D silhouettes must cast on floor');
 assert.equal(outer.lighting.state,'on');
 assert.deepEqual(outer.wallMaterial.sourceSize,[2172,724]);
 assert.equal(await page.locator('#ring-arena-canvas').getAttribute('data-wall-texture'),'ready');
 assert.equal(outer.mode,'outer');assert.equal(outer.shotIndex,0);
 assert.equal(outer.shotName,'四人同排 · 自由切换');
 assert.equal(outer.camera.shot,'left');
 assert.equal(outer.cameraCount,1);
 assert.equal(outer.eyeLevel,true,'camera is at heroine true eye height');
 assert.equal(outer.camera.eye.y,1.50);
 assert.equal(outer.camera.focus.y,1.50);
 assert.equal(outer.lensShift,.23);
 assert.equal(outer.previewPose,'female7');
 assert.equal(outer.uniformBattlePreview,true,'default 4v4 is uniform-source staging only');
 const artIdentity=outer.actorTextureIdentities;
 for(const id of ['ally-2','ally-3','ally-4'])
  assert.equal(artIdentity[id],artIdentity.hero,'all four friendly actors must use IDENTICAL original heroine source');
 for(const id of ['enemy-2','enemy-3','enemy-4'])
  assert.equal(artIdentity[id],artIdentity['enemy-1'],'all four opponents must use ONE original L2D source');
 assert.notEqual(artIdentity.hero,artIdentity['enemy-1'],
  'friendly and enemy source art must stay visually distinct');
 assert.equal(outer.heroine.id,'female-07');
 assert.equal(outer.heroine.side,'back');
 assert.equal(outer.heroine.l2dMode,'static-back-battle-cutout');
 assert.ok(Math.abs(outer.cameraPitchDeg)<.001);
 assert.equal(outer.heroTextureUploads,1,'static heroine must not upload every frame');
 assert.deepEqual(outer.visibleActorIds,['hero','ally-2','ally-3','ally-4','enemy-1','enemy-2','enemy-3','enemy-4']);
 assert.ok(outer.safety.valid&&outer.safety.clear,'actual alpha must preserve enemy view');
 // The source painter's actual RGBA shoe/crown fractions MUST drive real
 // WebGL foot placement, not the old hard-coded source .979 fraction.
 assert.deepEqual(Object.keys(outer.measuredShoePivots).sort(),
  ['hero','ally-2','ally-3','ally-4','enemy-1','enemy-2','enemy-3','enemy-4'].sort());
 for(const [actor,pivot]of Object.entries(outer.measuredShoePivots)){
  assert.ok(pivot.fromAlpha,'pixel alpha must be inspected for '+actor);
  assert.ok(pivot.soleY>.55&&pivot.soleY<=1,'valid true shoe pivot: '+actor);
  assert.ok(pivot.crownY>=0&&pivot.crownY<pivot.soleY);
 }
 assert.equal(await page.locator('[data-shot]').count(),0,'remove BOTH camera-switch buttons');
 assert.equal(await page.locator('[data-pose]').count(),0,'no redundant pose toggle');
 assert.equal(await page.locator('[data-mode]').count(),0,'only one normal battle scene');
 assert.ok(await page.locator('[data-exit]').isVisible());
 const originalCamera=JSON.stringify(outer.cameraTarget);
 const originalActors=JSON.stringify(outer.actors);
 assert.equal(outer.controlledActorId,'hero','the original heroine controls the first view');
 assert.deepEqual(outer.partyLine.map(p=>p.z),[9.30,9.30,9.30,9.30]);
 assert.deepEqual(outer.opposingLine.map(p=>p.z),[6.80,6.80,6.80,6.80]);
 assert.equal(await page.locator('[data-control-ally]').count(),4,
  'the player can select one of four actual allied slots, including on phones');
 for(let index=2;index<=4;index++){
  await page.locator('[data-control-ally="'+index+'"]').click();
  const switched=await inspect();
  const chosen=outer.actors.allies[index-1];
  assert.equal(switched.controlledActorId,chosen.id);
  assert.equal(switched.controlledAllyIndex,index-1);
  assert.equal(switched.cameraParity,true,
   'the single WebGL camera follows the real selected world-space teammate');
  assert.equal(switched.cameraLook.pivot.x,chosen.x);
  assert.equal(switched.cameraLook.pivot.z,chosen.z);
  assert.equal(JSON.stringify(switched.actors),originalActors,
   'switching control cannot move even one ally or enemy root');
  assert.equal(await page.locator('[data-control-ally="'+index+'"]').getAttribute('aria-pressed'),'true');
  const crowd=await page.evaluate(()=>{
   const ring=window.PaperWorldRingArena,s=window.PaperWorldGameRingArena.inspect();
   return s.actors.enemies.map(a=>ring.portraitVisibleBounds(a,s.camera,
    s.actorVisibleUv['enemy-1'].clip||{left:.347,right:.664,top:0,bottom:1},s.projectionAspect));
  });
  assert.ok(crowd.every(b=>b.valid&&b.left>-.96&&b.right<.96),
   'ALL four targets must remain on screen from each selected character view');
  await page.screenshot({path:'artifacts/ring-arena/party-controlled-'+index+'-1280x720.png'});
 }
 await page.locator('[data-control-ally="1"]').click();
 assert.equal((await inspect()).controlledActorId,'hero');
 await page.screenshot({path:'artifacts/ring-arena/final-eye-level-3q-1280x720.png'});
 // Reproduce the user's ACTUAL 1917x906 screenshot dimensions. Measure the
 // screen-space positions from the very projection matrix used by WebGL.
 await page.setViewportSize({width:1917,height:906});
 await page.waitForTimeout(380);
 const groundProof=await page.evaluate(()=>{
  const engine=window.PaperWorldRingArena;
  const state=window.PaperWorldGameRingArena.inspect();
  const aspects=state.projectionAspect,camera=state.camera;
  const feet=state.actors.enemies.map(a=>
   engine.project({x:a.x,y:0,z:a.z},camera,aspects));
  const hero=engine.portraitVisibleBounds(state.actors.allies[0],
   camera,engine.FEMALE07_BACK_UV,aspects);
  return {aspect:aspects,feet,hero,safety:state.safety,
   enemySizes:state.actors.enemies.map(a=>
    engine.portraitBounds(a,camera,aspects).heightFraction)};
 });
 assert.ok(groundProof.feet.every(x=>x.valid));
 assert.ok(Math.abs(groundProof.aspect-1917/906)<.001);
 const midY=groundProof.feet[0].y;
 assert.ok(groundProof.feet.every(x=>x.valid));
 const verticalRange=Math.max(...groundProof.feet.map(p=>p.y))-
  Math.min(...groundProof.feet.map(p=>p.y));
 assert.ok(verticalRange<.065,
  'four enemies are physically grounded on the same world y=0 plane; the close off-axis shoulder camera creates natural projected baselines');
 const centers=groundProof.feet.map(x=>x.x);
 const gaps=centers.slice(1).map((x,i)=>x-centers[i]);
 assert.ok(gaps.every(x=>x>.28&&x<.47)&&
  centers.reduce((sum,x)=>sum+x,0)/4>.15&&
  centers.reduce((sum,x)=>sum+x,0)/4<.42,
  'four distinct fighters should spread symmetrically around visual center');
 assert.ok(groundProof.hero.left< -.99&&groundProof.hero.right<-.20&&groundProof.hero.right>-.28,
  'foreground heroine can crop naturally on the left without obscuring any centered enemy');
 assert.ok(groundProof.hero.top>.47,
  'the heroine is enlarged yet fully composed, with head and axe inside the default shot');
 assert.ok(groundProof.safety.gap>.055&&groundProof.safety.clear,
  'weapon and enemy1 cannot overlap');
 const foemeter=groundProof.enemySizes.map((h,i)=>
  h/outer.actors.enemies[i].height);
 assert.ok(Math.max(...foemeter)-Math.min(...foemeter)<.105,
  'foe scale differences must come from real distance and remain human-sized');
 await page.screenshot({path:'artifacts/ring-arena/V31-woman7-four-enemies-ground-aligned-1917x906.png'});
 await page.setViewportSize({width:1280,height:720});
 await page.waitForTimeout(220);
 // Play the real authored Attack card, select explicitly numbered target #2,
 // and verify the complete director: lock, motion, impact, HP update, return.
 assert.equal(outer.director.card,'斧柄横扫');
 assert.equal(outer.director.baseDamage,12);
 assert.equal(outer.director.playing,false);
 await page.waitForFunction(()=>{
  const a=window.PaperWorldGameRingArena?.inspect()?.directorArt;
  return a?.hero?.loaded&&a?.enemy?.loaded;
 },null,{timeout:12000});
 const art=await inspect();
 assert.ok(art.directorArt.hero.src.endsWith('/hero-axe-attack.webp'));
 assert.ok(art.directorArt.enemy.src.endsWith('/enemy-suit-hit-no-hud.webp'));
 assert.equal(await page.locator('[data-attack-card]').count(),1);
 await page.locator('[data-attack-card]').click();
 await page.waitForFunction(()=>window.PaperWorldGameRingArena?.inspect()?.director?.armed);
 assert.equal(await page.locator('[data-director-targets]').isVisible(),true);
 assert.equal(await page.locator('[data-director-enemy]').count(),4);
 await page.screenshot({path:'artifacts/ring-arena/director-attack-target-selection.png'});
 await page.locator('[data-director-enemy="2"]').click();
 // A 400ms action may complete while Chromium's software renderer yields.
 // Verify persistent HP/completed outcome, not a fleeting animation phase.
 // In slow software WebGL a single draw may skip across the entire
 // impact window. Validate the irrevocable, single target damage RESULT
 // rather than waiting for a short-lived director.applied=true property.
 // The frozen real-WebGL QA scene below verifies visible impact frames.
 await page.waitForFunction(()=>{
  const d=window.PaperWorldGameRingArena?.inspect()?.director;
  return d?.enemyHP?.['enemy-2']===24;
 },null,{timeout:14000});
 const impact=await inspect();
 assert.equal(impact.director.enemyHP['enemy-2'],24);
 assert.equal(impact.director.baseDamage,12);
 await page.screenshot({path:'artifacts/ring-arena/director-attack-impact.png'});
 await page.waitForFunction(()=>{
  const d=window.PaperWorldGameRingArena?.inspect()?.director;
  return d?.completedAttacks===1&&!d?.playing;
 },null,{timeout:15000});
 const returned=await inspect();
 assert.equal(returned.director.phase,'idle');
 assert.equal(returned.director.lastTarget,'enemy-2');
 assert.equal(returned.director.enemyHP['enemy-1'],36);
 assert.equal(returned.director.enemyHP['enemy-2'],24);
 assert.equal(returned.director.enemyHP['enemy-3'],36);
 assert.equal(returned.director.enemyHP['enemy-4'],36);
 assert.equal(JSON.stringify(returned.cameraTarget),originalCamera);
 assert.equal(JSON.stringify(returned.actors),originalActors);
 assert.equal(returned.heroTextureUploads,1);
 assert.equal(returned.directorCameraTemporary,false);
 assert.equal(returned.directorArt.cut,'none');
 assert.equal(returned.directorArt.hero.loaded,true);
 assert.equal(returned.directorArt.enemy.loaded,true);
 await page.screenshot({path:'artifacts/ring-arena/director-attack-return.png'});
 // Do not miscast the suited male hit portrait as the third female enemy.
 await page.locator('[data-attack-card]').click();
 await page.locator('[data-director-enemy="3"]').click();
 // Gender-safe art is asserted below with fixed-frame WebGL QA mode.
 await page.waitForFunction(()=>{
  const d=window.PaperWorldGameRingArena?.inspect()?.director;
  return d?.completedAttacks===2&&!d?.playing;
 },null,{timeout:20000});
 const followup=await inspect();
 assert.equal(followup.director.enemyHP['enemy-2'],24);
 assert.equal(followup.director.enemyHP['enemy-3'],24);
 assert.equal(followup.director.enemyHP['enemy-4'],36);
 assert.equal(JSON.stringify(followup.cameraTarget),originalCamera);
 assert.equal(JSON.stringify(followup.actors),originalActors);
 // Touch/keyboard inputs must never reveal a second camera.
 await page.mouse.move(420,250);await page.mouse.down();
 await page.mouse.move(850,260,{steps:7});await page.mouse.up();
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
 await page.keyboard.press('a');await page.keyboard.press('d');
 await page.waitForTimeout(350);
 const stable=await inspect();
 assert.equal(stable.shotIndex,0);
 assert.ok(Math.hypot(stable.camera.eye.x-outer.camera.eye.x,
  stable.camera.eye.z-outer.camera.eye.z)>.02,
  'true third-person camera must orbit the protagonist shoulder, not pivot from a fixed eye');
 assert.equal(stable.cameraLook.mode,'hero-root-tps-shoulder-rig');
 assert.equal(stable.cameraLook.heroYawDeg,0,
  'protagonist world orientation must remain locked during mouse orbit');
 assert.ok(Math.abs(stable.cameraLook.yawDeg)>.35,
  'the mouse should now truly rotate the 3D camera focus');
 assert.equal(stable.cameraLook.sharedProjection,true);
 assert.equal(JSON.stringify(stable.actors),originalActors);
 // Reset mouse to center after shoulder orbit before inspecting
 // the canonical forward camera.
 await page.mouse.move(640,360);
 await page.waitForTimeout(850);
 assert.equal(stable.heroTextureUploads,1);
 // Single canonical encounter, with four physically separated foes.
 // A camera movement never switches into a second 'surround' map.
 assert.equal(await page.locator('[data-mode]').count(),0);
 assert.equal((await inspect()).mode,'outer');
 await page.setViewportSize({width:1917,height:906});
 await page.waitForTimeout(380);
 const standard=await inspect();
 const foeSpots=standard.actors.enemies.map(a=>a.x);
 assert.ok(Math.max(...foeSpots)-Math.min(...foeSpots)>3.7&&
  Math.max(...foeSpots)-Math.min(...foeSpots)<4,
  'four enemies stand farther back on a 3.84m single rank');
 assert.deepEqual(standard.actors,outer.actors,
  'all world-space actors must stay fixed after mouse look and attack');
 await page.screenshot({path:'artifacts/ring-arena/V32-single-encounter-wide-1917x906.png'});
 // Responsive full stage, same perspective, no second camera or cutoff.
 await page.setViewportSize({width:1920,height:1080});
 await page.waitForTimeout(400);
 assert.ok((await inspect()).safety.clear);
 const desktopCard=await page.locator('[data-attack-card]').boundingBox();
 assert.ok(desktopCard&&desktopCard.x>1550&&desktopCard.y>700,
  'attack selector belongs in the quiet right margin, never over the centered fighters');
 await page.screenshot({path:'artifacts/ring-arena/final-desktop-1920x1080.png'});
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(400);
 const landscape=await inspect();assert.equal(landscape.shotIndex,0);
 const landCard=await page.locator('[data-attack-card]').boundingBox();
 assert.ok(landCard&&landCard.x>700&&landCard.y<95&&landCard.height<90,
  'on short landscape screens the attack card must not cover opponent torsos');
 assert.ok(landscape.safety.clear);
 await page.screenshot({path:'artifacts/ring-arena/final-mobile-landscape.png'});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(400);
 const portrait=await inspect();
 const portraitCard=await page.locator('[data-attack-card]').boundingBox();
 assert.ok(portraitCard&&portraitCard.x>280&&portraitCard.y<100&&portraitCard.height<90,
  'portrait mode keeps action controls above the tiny 4-foe lineup');
 assert.equal(portrait.shotIndex,0);
 assert.ok(portrait.safety.clear);
 await page.screenshot({path:'artifacts/ring-arena/final-mobile-portrait.png'});
 // Developer rollback works with original approved dynamic L2D untouched.
 // Control of a teammate includes that teammate's attack, not a camera
 // trick where the original heroine still performs every move.
 await page.locator('[data-control-ally="3"]').click();
 await page.locator('[data-attack-card]').click();
 await page.locator('[data-director-enemy="4"]').click();
 await page.waitForFunction(()=>{
  const d=window.PaperWorldGameRingArena?.inspect()?.director;
  return d?.completedAttacks===3&&!d?.playing;
 },null,{timeout:20000});
 const teammateAttack=await inspect();
 assert.equal(teammateAttack.director.lastAttacker,'ally-3');
 assert.equal(teammateAttack.director.lastTarget,'enemy-4');
 assert.equal(teammateAttack.controlledActorId,'ally-3');
 assert.equal(teammateAttack.cameraParity,true,'camera returns to the active teammate after attack');
 assert.equal(JSON.stringify(teammateAttack.actors),originalActors,
  'the attack must not permanently rearrange the two parallel rows');
 await page.locator('[data-control-ally="1"]').click();
 await page.goto(origin+'/index.html?scene=ring-arena&heroPose=original',
  {waitUntil:'domcontentloaded',timeout:50000});
 await page.waitForFunction(()=>{
  const s=window.PaperWorldGameRingArena?.inspect();
  return s?.active&&!s.heroStatic&&s.previewPose==='original'&&s.l2dReady===8&&
   s.heroine?.id==='protagonist'&&s.heroine?.side==='back'&&s.heroine?.ready;
 },null,{timeout:160000});
 const restored=await inspect();
 assert.equal(restored.cameraCount,1);
 assert.equal(restored.shotIndex,0);
 assert.ok(restored.safety.valid&&restored.safety.clear);
 await page.screenshot({path:'artifacts/ring-arena/final-original-L2D-recovery.png'});
 assert.deepEqual(errors,[],'unexpected JavaScript exceptions');
 // Repeat the QA capture on the same ACTUAL scene, but hold the
 // deterministic director clock for screenshot generation only. Gameplay
 // remains real-time and never exposes qaFrame without directorQA=1.
 await page.close();
 const qa=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const qaErrors=[];
 qa.on('pageerror',e=>qaErrors.push(e.message));
 await qa.goto(origin+'/index.html?scene=ring-arena&directorQA=1',
  {waitUntil:'domcontentloaded',timeout:50000});
 await qa.waitForFunction(()=>{
  const game=window.PaperWorldGameRingArena;
  return game?.inspect()?.active&&game?.inspect()?.l2dReady===8&&
   game?.inspect()?.directorArt?.hero?.loaded&&game?.inspect()?.directorArt?.enemy?.loaded;
 },null,{timeout:160000});
 const invoke=async(target,ms)=>qa.evaluate(([t,at])=>
  window.PaperWorldGameRingArena.qaFrame(t,at),[target,ms]);
 const frameHero=await invoke('enemy-2',38);
 assert.equal(frameHero.phase,'swing');
 assert.equal(frameHero.applied,false);
 assert.equal(await qa.locator('[data-director-cinematic]').getAttribute('data-cut'),'attacker');
 assert.deepEqual((await qa.evaluate(()=>
  window.PaperWorldGameRingArena.inspect().directorArt.drawnActorIds)).sort(),
 ['hero','ally-2','ally-3','ally-4','enemy-1','enemy-2','enemy-3','enemy-4'].sort(),
 'all eight actors must remain in the SAME 3D scene');
 assert.equal((await qa.evaluate(()=>
  window.PaperWorldGameRingArena.inspect().directorArt.renderedPoses.hero)),
 'female07-axe-lunge','same female07 back art remains on its world-space billboard');
 const enter=await qa.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.deepEqual(enter.duel.actorIds,['hero','enemy-2']);
 assert.equal(enter.duel.playedPositions.length,2);
 assert.ok(Math.abs(enter.duel.playedPositions[0].z-
  enter.duel.playedPositions[1].z)>.20,
  'the swing is in TRANSIT: both characters are not at the center yet');
 assert.ok(Math.abs(enter.duel.playedPositions[0].z-
  enter.actors.allies[0].z)>.3,
  'hero is actually moving while swinging');
 assert.ok(Math.hypot(
  enter.duel.playedPositions[1].x-enter.actors.enemies[1].x,
  enter.duel.playedPositions[1].z-enter.actors.enemies[1].z)>.3,
  'target must travel decisively on the real 3D floor during the swing');
 assert.equal(enter.directorCameraTemporary,true,
  'duel center zoom activates while remaining left-side and eye-level');
 assert.equal((await qa.evaluate(()=>
  window.PaperWorldGameRingArena.inspect().directorArt.spriteTextures['hero-attack'].uploads)),
 1,'legacy hero action art remains cached but is never drawn for female07');
 await qa.screenshot({path:'artifacts/ring-arena/v25-strike-while-moving-hero-swing.png'});
 const frameHit=await invoke('enemy-2',70);
 assert.equal(frameHit.applied,true);
 assert.equal(await qa.locator('[data-director-cinematic]').getAttribute('data-cut'),'victim');
 assert.equal(await qa.locator('[data-director-cinematic]').getAttribute('data-hit-portrait'),'yes');
 assert.equal(await qa.evaluate(()=>
  window.PaperWorldGameRingArena.inspect().directorArt.drawnActorIds.includes('enemy-2')),true,
  'victim must stay in 3D scene, not vanish behind an overlay poster');
 assert.equal(await qa.evaluate(()=>
  window.PaperWorldGameRingArena.inspect().directorArt.renderedPoses['enemy-2']),
 outer.uniformBattlePreview?'idle':'hurt-art','the temporary same-model preview must NOT swap the foe into a different identity on hit');
 assert.equal(await qa.evaluate(()=>
  window.PaperWorldGameRingArena.inspect().directorArt.renderedPoses.hero),
 'female07-axe-lunge','hit frame must keep user approved female07 while showing victim');
 const duoFrame=await qa.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.equal(duoFrame.duel.playedPositions.length,2);
 assert.ok(duoFrame.camera.fov<duoFrame.cameraTarget.fov);
 await qa.screenshot({path:'artifacts/ring-arena/v25-strike-while-moving-simultaneous-impact.png'});
 // Arrival happens AFTER the hit: no new attack pose or delayed hit in
 // the center. It is already resolved and the damage may not repeat.
 const arrival=await invoke('enemy-2',170);
 assert.equal(arrival.phase,'reaction');
 assert.equal(arrival.applied,true);
 const arrived=await qa.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.ok(Math.abs(arrived.duel.playedPositions[0].z-
  arrived.duel.playedPositions[1].z)<.20,
  'both performers arrive at the same central duel plane');
 assert.equal(arrived.directorArt.renderedPoses.hero,'female07-axe-lunge',
  'attacker MUST RETAIN action portrait at center, until original queue return');
 assert.equal(arrived.director.enemyHP['enemy-2'],24,
  'damage has already happened before arriving');
 await qa.screenshot({path:'artifacts/ring-arena/v25-center-after-hit-no-attack.png'});
 const frameRecoil=await invoke('enemy-2',200);
 assert.equal(frameRecoil.phase,'reaction');
 await qa.screenshot({path:'artifacts/ring-arena/v25-strike-while-moving-enemy-recoil.png'});
 // The user-supplied DD sequence visibly remains enlarged for about 46
 // frames after the opening strike. Verify BOTH sprites remain action art.
 const held=await invoke('enemy-2',46*(1000/30)+.01);
 assert.equal(held.phase,'hold');
 const heldSnap=await qa.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.equal(heldSnap.directorArt.renderedPoses.hero,'female07-axe-lunge',
  'never switch to idle during original 46-frame tableau');
 assert.equal(heldSnap.directorArt.renderedPoses['enemy-2'],outer.uniformBattlePreview?'idle':'hurt-art');
 assert.ok(heldSnap.camera.fov<heldSnap.cameraTarget.fov-10,
  'original cinematic is an actual strong enlargement, not a tiny FOV twitch');
 await qa.screenshot({path:'artifacts/ring-arena/v29-frame46-source-matched-central-held-art.png'});
 // Both performers must RETREAT still in action art. The poses change only
 // after their ORIGINAL immutable world anchors are restored.
 const retreat=await invoke('enemy-2',52*(1000/30)+.01);
 assert.equal(retreat.phase,'recover');
 const retreatSnap=await qa.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.equal(retreatSnap.directorArt.renderedPoses.hero,'female07-axe-lunge');
 assert.equal(retreatSnap.directorArt.renderedPoses['enemy-2'],outer.uniformBattlePreview?'idle':'hurt-art');
 assert.notEqual(retreatSnap.duel.playedPositions[0].z,retreatSnap.actors.allies[0].z);
 await qa.screenshot({path:'artifacts/ring-arena/v29-frame52-backward-motion-still-action.png'});
 const home=await invoke('enemy-2',55*(1000/30)+.01);
 assert.equal(home.phase,'recover');
 const homeSnap=await qa.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.equal(homeSnap.directorArt.renderedPoses.hero,'female07-axe-lunge');
 assert.equal(homeSnap.directorArt.renderedPoses['enemy-2'],outer.uniformBattlePreview?'idle':'hurt-art');
 assert.equal(homeSnap.duel.playedPositions[0].x,homeSnap.actors.allies[0].x);
 assert.equal(homeSnap.duel.playedPositions[0].z,homeSnap.actors.allies[0].z);
 assert.equal(homeSnap.duel.playedPositions[1].x,homeSnap.actors.enemies[1].x);
 assert.equal(homeSnap.duel.playedPositions[1].z,homeSnap.actors.enemies[1].z);
 assert.equal(homeSnap.directorCameraTemporary,true,
  'camera must keep the duel composition until actors are already home');
 await qa.screenshot({path:'artifacts/ring-arena/v29-frame55-home-but-still-action-art.png'});
 const afterHome=await invoke('enemy-2',56*(1000/30)+.01);
 assert.equal(afterHome.phase,'settle');
 const afterSnap=await qa.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.equal(afterSnap.directorArt.renderedPoses.hero,'idle');
 assert.equal(afterSnap.directorArt.renderedPoses['enemy-2'],'idle');
 assert.ok(afterSnap.camera.fov<afterSnap.cameraTarget.fov,
  'camera finishes retracting only AFTER character images have switched');
 await qa.screenshot({path:'artifacts/ring-arena/v29-frame56-idle-art-after-origin.png'});
 const finalFrame=await invoke('enemy-2',58*(1000/30));
 assert.equal(finalFrame.phase,'idle');
 const settled=await qa.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.equal(settled.directorCameraTemporary,false);
 assert.equal(settled.camera.fov,settled.cameraTarget.fov);
 await qa.screenshot({path:'artifacts/ring-arena/v29-frame58-full-queue-restored.png'});
 const frameFemale=await invoke('enemy-3',190);
 assert.equal(await qa.locator('[data-director-cinematic]').getAttribute('data-hit-portrait'),'no');
 assert.equal(await qa.locator('[data-action-enemy]').evaluate(
  el=>getComputedStyle(el).display),'none',
  'viewport-sized art overlay must remain disabled');
 assert.equal(await qa.evaluate(()=>
  window.PaperWorldGameRingArena.inspect().directorArt.drawnActorIds.includes('enemy-3')),true,
  'female target remains anchored in the original L2D line');
 assert.equal(await qa.evaluate(()=>
  window.PaperWorldGameRingArena.inspect().directorArt.renderedPoses['enemy-3']),
 'hurt-original','female target never inherits male hurt artwork');
 assert.equal(await qa.evaluate(()=>
  window.PaperWorldGameRingArena.inspect().directorArt.spriteTextures['enemy-2-hit'].uploads),
 1,'male hurt artwork is uploaded only once');
 await qa.screenshot({path:'artifacts/ring-arena/v25-strike-while-moving-female-original-reaction.png'});
 assert.equal(await qa.locator('.director-stage-dark').evaluate(
  el=>getComputedStyle(el).display),'none',
  'full-screen cinematic black curtain is forbidden');
 assert.equal(await qa.locator('[data-action-hero]').evaluate(
  el=>getComputedStyle(el).display),'none',
  'hero attack should NOT be a DOM poster');
 assert.deepEqual(qaErrors,[]);
 // The opt-in frame-inspector must scrub REAL WebGL, not an image mock.
 await qa.goto(origin+'/index.html?scene=ring-arena&directorQA=1&frameInspector=1',
  {waitUntil:'domcontentloaded',timeout:50000});
 await qa.waitForSelector('#ring-frame-inspector #fi-seek',{timeout:120000});
 await qa.waitForFunction(()=>window.PaperWorldGameRingArena?.inspect()?.l2dReady===8,
  null,{timeout:120000});
 const scrub=async i=>qa.locator('#fi-seek').evaluate((el,frame)=>{
  el.value=String(frame);
  el.dispatchEvent(new Event('input',{bubbles:true}));
 },i);
 await scrub(1);
 assert.equal((await qa.evaluate(()=>window.PaperWorldGameRingArena.inspect().director.enemyHP['enemy-2'])),36,
  'inspector frame 1 before 67ms source-frame impact');
 await scrub(2);
 assert.equal((await qa.evaluate(()=>window.PaperWorldGameRingArena.inspect().director.enemyHP['enemy-2'])),24,
  'inspector frame 2 settles damage while both actors still in transit');
 await scrub(10);
 assert.equal((await qa.evaluate(()=>window.PaperWorldGameRingArena.inspect().director.phase)),'hold');
 await scrub(58);
 assert.equal((await qa.evaluate(()=>window.PaperWorldGameRingArena.inspect().director.phase)),'idle',
  'end frame restores world view without retaining duel');
 await qa.screenshot({path:'artifacts/ring-arena/v29-59frame-inspector-real-webgl.png'});
 await qa.close();
 console.log('PASS: user female07 original rear axe art is default heroine, unchanged identity through attack, 4 enemies, old protagonist original L2D recoverable, responsive');
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}
