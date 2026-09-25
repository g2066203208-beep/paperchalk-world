import { chromium } from 'playwright-core';

const result={checks:[],errors:[]};
function check(name,pass,detail=''){
  result.checks.push({name,pass:!!pass,detail});
  console.log((pass?'PASS':'FAIL')+' | '+name+' | '+detail);
}
async function state(page){
  return page.evaluate(()=>window.eval('({worldX,playerWorldX,playerY,worldMinutes,actorX,playerHp})'));
}
async function mapState(page){
  return page.evaluate(()=>({
    playerX:window.PaperchalkMap?.playerX,
    map:window.PaperchalkMap?.state,
    enemies:window.PaperchalkCombat?.enemies||[],
    debug:window.PaperchalkCombat?.debug||{},
    terrainCount:window.PaperchalkMap?.terrain?.length||0,
    objectCount:window.PaperchalkMap?.objects?.length||0,
    spawnCount:window.PaperchalkMap?.enemySpawns?.length||0,
    npcCount:window.PaperchalkMap?.npcs?.length||0
  }));
}
async function healthState(page){
  return page.evaluate(()=>({
    hp:window.PaperchalkHealth?.hp,
    maxHp:window.PaperchalkHealth?.maxHp,
    pieces:document.querySelectorAll('#playerHealthBar .hp-segment').length,
    cells:document.querySelectorAll('#playerHealthBar .hp-segment--cell').length,
    tails:document.querySelectorAll('#playerHealthBar .hp-segment--tail').length,
    tailIsLast:document.querySelector('#playerHealthBar .hp-segment:last-child')?.classList.contains('hp-segment--tail')||false,
    empty:document.querySelectorAll('#playerHealthBar .hp-segment.is-empty').length,
    hit:document.querySelectorAll('#playerHealthBar .hp-segment.is-hit').length,
    healing:document.querySelectorAll('#playerHealthBar .hp-segment.is-heal').length,
    healDelays:[...document.querySelectorAll('#playerHealthBar .hp-segment.is-heal')].map(el=>el.style.animationDelay),
    ariaNow:document.getElementById('playerHealthHud')?.getAttribute('aria-valuenow'),
    loaded:[...document.querySelectorAll('#playerHealthBar .hp-segment')].every(img=>img.complete&&img.naturalWidth>0),
    seam:(()=>{
      const pieces=[...document.querySelectorAll('#playerHealthBar .hp-segment')];
      if(pieces.length<10)return {ok:false,cellOverlap:null,tailOverlap:null};
      const a=pieces[0].getBoundingClientRect();
      const b=pieces[1].getBoundingClientRect();
      const p=pieces[8].getBoundingClientRect();
      const tail=pieces[9].getBoundingClientRect();
      const cellOverlap=a.right-b.left;
      const tailOverlap=p.right-tail.left;
      return {
        ok:cellOverlap>=1&&cellOverlap<=4&&tailOverlap>=1&&tailOverlap<=5,
        cellOverlap,
        tailOverlap
      };
    })()
  }));
}
async function save(page,account){
  return page.evaluate(a=>{
    const raw=localStorage.getItem('paperchalk.save.v2.'+encodeURIComponent(a));
    return raw?JSON.parse(raw):null;
  },account);
}
async function paperState(page){
  return page.evaluate(()=>({
    ball:getComputedStyle(document.getElementById('paperFxBall')).opacity,
    unfold:getComputedStyle(document.getElementById('paperFxUnfold')).opacity
  }));
}

const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROME_PATH,
  args:['--no-sandbox','--disable-dev-shm-usage']
});
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>result.errors.push('PAGEERROR '+String(e)));
page.on('response',r=>{if(r.status()>=400)result.errors.push('HTTP '+r.status()+' '+r.url())});
page.on('requestfailed',r=>result.errors.push('REQUEST_FAILED '+r.url()+' '+JSON.stringify(r.failure())));
page.on('console',m=>{
  if(m.type()==='error'&&!m.text().startsWith('Failed to load resource:'))result.errors.push('CONSOLE '+m.text());
});

try{
  await page.goto('http://127.0.0.1:8080/index.html?core-regression=1',{waitUntil:'networkidle'});

  // Register A through the actual UI.
  await page.locator('#authBtn').click();
  await page.waitForTimeout(750);
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('audit_a');
  await page.locator('#regName').fill('审计A');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForTimeout(500);

  let s=await state(page);
  check('A enters a fresh world',Math.abs(s.worldX)<1&&Math.abs(s.playerWorldX-460)<2,JSON.stringify(s));

  // Finite-map + realtime-combat foundation.
  const initialMap=await mapState(page);
  check('Fresh A starts in the 20-zone continuous world',
    Math.abs(s.playerWorldX-460)<2&&Math.abs(s.worldX)<1&&
    initialMap.terrainCount>100&&initialMap.objectCount>40&&initialMap.spawnCount===21&&initialMap.npcCount===1,
    JSON.stringify({s,initialMap}));
  const parents=await page.evaluate(()=>[
    document.getElementById('enemy')?.parentElement?.id,
    document.getElementById('enemy2')?.parentElement?.id
  ]);
  check('Both enemies are mounted on the scrolling world entity track',
    parents[0]==='entityTrack'&&parents[1]==='entityTrack',
    JSON.stringify(parents));

  await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/player/runtime/')).length>=5,null,{timeout:5000});
  const initialAction=await page.evaluate(()=>({
    player:window.PaperchalkCombat.player,
    state:document.querySelector('.actor')?.dataset.playerState,
    src:document.getElementById('playerSprite')?.getAttribute('src')||'',
    visual:{...window.PaperchalkRuntime.worldData.playerVisual},
    rect:(()=>{const r=document.querySelector('.actor')?.getBoundingClientRect();return r?{w:r.width,h:r.height}:null})()
  }));
  const paperGround=await page.evaluate(()=> {
    const layer=document.querySelector('.road-layer');
    const stage=document.getElementById('world');
    const tile=document.getElementById('roadTile');
    const layerRect=layer?.getBoundingClientRect();
    const stageRect=stage?.getBoundingClientRect();
    return {
      tileClass:tile?.className||'',
      tileTag:tile?.tagName||'',
      groundY:Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ground-screen-y'))||null,
      layerTop:layerRect&&stageRect?layerRect.top-stageRect.top:null,
      stageH:stageRect?.height||0,
      layerH:layerRect?.height||0,
      background:getComputedStyle(tile).backgroundImage
    };
  });
  check('Paper ground strip aligns to physics ground',
    paperGround.tileTag==='DIV'&&paperGround.tileClass.includes('paper-ground-tile')&&
    Math.abs(paperGround.layerH-paperGround.groundY)<1.5&&
    Math.abs(paperGround.layerTop-(paperGround.stageH-paperGround.groundY))<1.5&&
    paperGround.background!=='none',
    JSON.stringify(voxelGround));

  check('Player starts in optimized supplied idle pose',
    initialAction.player.action==='idle'&&initialAction.state==='idle'&&initialAction.src.includes('/assets/player/runtime/idle.webp'),
    JSON.stringify(initialAction));
  check('Desktop player size comes from unified viewport scale',
    initialAction.visual.scale>1&&initialAction.visual.scale<=1.081&&
    Math.abs(initialAction.rect.w-initialAction.visual.w)<1&&Math.abs(initialAction.rect.h-initialAction.visual.h)<1,
    JSON.stringify(initialAction));

  await page.setViewportSize({width:900,height:540});
  await page.waitForTimeout(220);
  const compactViewport=await page.evaluate(()=>({
    visual:{...window.PaperchalkRuntime.worldData.playerVisual},
    rect:(()=>{const r=document.querySelector('.actor')?.getBoundingClientRect();return r?{w:r.width,h:r.height}:null})()
  }));
  check('Player automatically adapts to a compact viewport without device-specific sizing',
    Math.abs(compactViewport.visual.scale-.82)<.01&&
    Math.abs(compactViewport.rect.w-compactViewport.visual.w)<1&&Math.abs(compactViewport.rect.h-compactViewport.visual.h)<1,
    JSON.stringify(compactViewport));
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(220);

  const crouchAccepted=await page.evaluate(()=>window.PaperchalkCombat.crouch(true));
  await page.waitForTimeout(35);
  const crouchFlip=await page.evaluate(()=>document.getElementById('playerFlip')?.getAnimations().length||0);
  await page.waitForFunction(()=>document.querySelector('.actor')?.dataset.playerState==='crouch',null,{timeout:900});
  await page.waitForTimeout(90);
  const crouched=await page.evaluate(()=>({
    player:window.PaperchalkCombat.player,
    state:document.querySelector('.actor')?.dataset.playerState,
    src:document.getElementById('playerSprite')?.getAttribute('src')||'',
    button:document.getElementById('crouchBtn')?.classList.contains('is-active')||false
  }));
  check('Crouch uses paper flip, normalized supplied pose and shorter real body',
    crouchAccepted===true&&crouchFlip>0&&crouched.player.crouching&&crouched.player.action==='crouch'&&
    crouched.player.bodyH===78&&Math.abs(crouched.player.actionScale-.76)<.001&&crouched.state==='crouch'&&
    crouched.src.includes('/assets/player/runtime/crouch.webp')&&crouched.button,
    JSON.stringify({crouchAccepted,crouchFlip,crouched}));

  await page.evaluate(()=>window.PaperchalkCombat.crouch(false));
  await page.waitForTimeout(180);
  const stood=await page.evaluate(()=>window.PaperchalkCombat.player);
  check('Crouch release returns to standing body',
    !stood.crouching&&stood.bodyH===108&&stood.action==='idle',
    JSON.stringify(stood));

  await page.keyboard.down('KeyD');
  await page.waitForFunction(()=>document.querySelector('.actor')?.dataset.playerState==='walk',null,{timeout:900});
  await page.waitForTimeout(45);
  const walking=await page.evaluate(()=>({
    player:window.PaperchalkCombat.player,
    state:document.querySelector('.actor')?.dataset.playerState,
    src:document.getElementById('playerSprite')?.getAttribute('src')||'',
    left:document.querySelector('.actor')?.classList.contains('facing-left')||false,
    sourceFacing:getComputedStyle(document.querySelector('.actor')).getPropertyValue('--source-facing').trim()
  }));
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(180);
  check('Right movement and newest walking art face the same direction',
    walking.player.x>460&&walking.player.facing===1&&walking.player.sourceFacing===-1&&
    walking.player.action==='walk'&&walking.state==='walk'&&!walking.left&&walking.sourceFacing==='-1'&&
    walking.src.includes('/assets/player/runtime/walk.webp'),
    JSON.stringify(walking));

  // Restore the original regression position before checking far-enemy sleep radius.
  await page.evaluate(()=>window.PaperchalkMap.teleport(460,{notice:''}));
  await page.waitForTimeout(220);

  const enemyMoveBefore=await page.evaluate(()=>window.PaperchalkCombat.enemies);
  await page.waitForTimeout(420);
  const enemyMoveAfter=await page.evaluate(()=>window.PaperchalkCombat.enemies);
  check('Far enemies sleep outside the active simulation radius',
    enemyMoveBefore[0].state==='sleep'&&enemyMoveAfter[0].state==='sleep'&&
    Math.abs(enemyMoveAfter[0].x-enemyMoveBefore[0].x)<0.01,
    JSON.stringify({enemyMoveBefore:enemyMoveBefore[0],enemyMoveAfter:enemyMoveAfter[0]}));

  const jumpStarted=await page.evaluate(()=>window.PaperchalkCombat.jump());
  await page.waitForFunction(()=>document.querySelector('.actor')?.dataset.playerState==='jump-up',null,{timeout:900});
  await page.waitForTimeout(45);
  const jumpAir=await page.evaluate(()=>({
    player:window.PaperchalkCombat.player,
    state:document.querySelector('.actor')?.dataset.playerState,
    src:document.getElementById('playerSprite')?.getAttribute('src')||''
  }));
  check('Jump ascent uses supplied upward pose',
    jumpStarted===true&&jumpAir.player.y>20&&!jumpAir.player.grounded&&
    jumpAir.player.vy>0&&jumpAir.player.action==='jump-up'&&jumpAir.state==='jump-up'&&
    jumpAir.src.includes('/assets/player/runtime/jump-up.webp'),
    JSON.stringify(jumpAir));

  await page.waitForFunction(()=>window.PaperchalkCombat?.player?.action==='jump-down',null,{timeout:1100});
  await page.waitForFunction(()=>document.querySelector('.actor')?.dataset.playerState==='jump-down',null,{timeout:900});
  await page.waitForTimeout(45);
  const jumpDown=await page.evaluate(()=>({
    player:window.PaperchalkCombat.player,
    state:document.querySelector('.actor')?.dataset.playerState,
    src:document.getElementById('playerSprite')?.getAttribute('src')||''
  }));
  check('Jump descent switches to supplied falling pose',
    jumpDown.player.vy<=0&&jumpDown.player.action==='jump-down'&&jumpDown.state==='jump-down'&&
    jumpDown.src.includes('/assets/player/runtime/jump-down.webp'),
    JSON.stringify(jumpDown));

  await page.waitForFunction(()=>window.PaperchalkCombat?.player?.grounded&&Math.abs(window.PaperchalkCombat.player.y)<1,null,{timeout:1800});
  await page.waitForTimeout(60);
  const jumpLanded=await page.evaluate(()=>window.PaperchalkCombat.player);
  check('Jump landing returns to idle pose',
    jumpLanded.grounded&&Math.abs(jumpLanded.y)<1&&jumpLanded.action==='idle',
    JSON.stringify(jumpLanded));

  // All debugging lives in the visible in-game debug panel.
  await page.locator('#debugToggleBtn').click();
  await page.waitForTimeout(80);
  await page.locator('[data-debug-action="hitboxes"]').click();
  await page.locator('[data-debug-action="attackRange"]').click();
  await page.locator('[data-debug-action="mapColliders"]').click();
  await page.locator('[data-debug-action="spawnZones"]').click();
  await page.locator('[data-debug-action="cameraDebug"]').click();
  await page.waitForTimeout(80);
  const debugView=await page.evaluate(()=>({
    combat:window.PaperchalkCombat.debug,
    worldClass:document.getElementById('world').className,
    playerHurt:{
      hidden:document.getElementById('playerHurtboxDebug').hidden,
      width:document.getElementById('playerHurtboxDebug').getBoundingClientRect().width
    },
    attack:{
      hidden:document.getElementById('playerAttackDebug').hidden,
      width:document.getElementById('playerAttackDebug').getBoundingClientRect().width,
      preview:document.getElementById('playerAttackDebug').classList.contains('is-preview')
    },
    enemyAttack:{
      hidden:document.getElementById('enemyAttackDebug').hidden,
      width:document.getElementById('enemyAttackDebug').getBoundingClientRect().width
    },
    terrainBoxes:[...document.querySelectorAll('#mapDebugTrack .collider')].filter(el=>getComputedStyle(el).display!=='none').length,
    spawnBoxes:[...document.querySelectorAll('#mapDebugTrack .spawn')].filter(el=>getComputedStyle(el).display!=='none').length,
    cameraDisplay:getComputedStyle(document.getElementById('cameraLeftDebug')).display
  }));
  check('Debug panel exposes combat, terrain, spawn-zone and Camera overlays',
    debugView.combat.hitboxes&&debugView.combat.attackRange&&debugView.combat.mapColliders&&debugView.combat.spawnZones&&debugView.combat.camera&&
    debugView.playerHurt.width>40&&debugView.attack.width>80&&debugView.attack.preview&&
    debugView.terrainBoxes>0&&debugView.spawnBoxes>0&&debugView.cameraDisplay!=='none',
    JSON.stringify(debugView));
  check('Inactive enemy attack box leaves no red-line residual',
    debugView.enemyAttack.hidden===true&&debugView.enemyAttack.width===0,
    JSON.stringify(debugView.enemyAttack));

  await page.locator('[data-debug-action="enemyNear"]').click();
  await page.waitForTimeout(60);
  const nearEnemy=await page.evaluate(()=>({
    enemy:window.PaperchalkCombat.enemy,
    playerX:window.PaperchalkMap.playerX
  }));
  check('Debug panel can place an enemy at a reachable map position',
    Math.abs((nearEnemy.enemy.x-nearEnemy.playerX)-210)<2,
    JSON.stringify(nearEnemy));

  // Switch overlays off before gameplay checks.
  await page.locator('[data-debug-action="attackRange"]').click();
  await page.locator('[data-debug-action="hitboxes"]').click();
  await page.locator('[data-debug-action="mapColliders"]').click();
  await page.locator('[data-debug-action="spawnZones"]').click();
  await page.locator('[data-debug-action="cameraDebug"]').click();
  await page.locator('#debugCloseBtn').click();
  await page.waitForTimeout(80);

  await page.evaluate(()=>window.PaperchalkCombat.resetEnemy(68));
  const enemyBefore=await page.evaluate(()=>window.PaperchalkCombat.enemy);
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(190);
  const enemyAfter=await page.evaluate(()=>window.PaperchalkCombat.enemy);
  check('Gameplay melee hitbox damages nearby enemy exactly once',
    enemyBefore.hp===3&&enemyAfter.hp===2,
    JSON.stringify({enemyBefore,enemyAfter}));

  // Terrain collision: rock-1 begins at x=1120, so player center must stop near 1093.
  await page.evaluate(()=>{
    window.PaperchalkCombat.toggleEnemyAi(false);
    window.PaperchalkMap.teleport(1060,{notice:''});
  });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(550);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(80);
  const blockedByRock=await state(page);
  check('Ground obstacle collider blocks horizontal movement',
    blockedByRock.playerWorldX>=1088&&blockedByRock.playerWorldX<=1094,
    JSON.stringify(blockedByRock));

  // Jump over the 70px rock and continue to the other side.
  await page.keyboard.press('Space');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(950);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(120);
  const clearedRock=await state(page);
  check('Jump can clear a low map obstacle',
    clearedRock.playerWorldX>1225,
    JSON.stringify(clearedRock));

  // Falling onto platform-2 should land exactly on the currently-authored platform top.
  const platformTop=await page.evaluate(()=>{
    const p=window.PaperchalkMap.terrain.find(v=>v.id==='platform-2');
    return p.y+p.h;
  });
  await page.evaluate(()=>window.eval("playerWorldX=3060;playerY=205;playerVy=-40;playerGrounded=false;updateCamera();renderWorld();"));
  await page.waitForFunction(top=>window.PaperchalkCombat?.player?.grounded&&Math.abs(window.PaperchalkCombat.player.y-top)<1,platformTop,{timeout:1400});
  const platformLanding=await state(page);
  check('Platform collider catches a falling player on its authored top surface',
    Math.abs(platformLanding.playerY-platformTop)<1,
    JSON.stringify({platformLanding,platformTop}));

  // Breakable crate and pickup pipeline.
  await page.evaluate(()=>window.PaperchalkMap.teleport(2335,{notice:''}));
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(220);
  let mapAfterBreak=await mapState(page);
  check('Attack can break the map crate',
    mapAfterBreak.map.broken.includes('crate-1'),
    JSON.stringify(mapAfterBreak.map));

  await page.evaluate(()=>window.PaperchalkMap.teleport(2434,{notice:''}));
  await page.waitForTimeout(180);
  const mapAfterPickup=await mapState(page);
  const pickedInventory=await page.evaluate(()=>window.eval("inventoryItems.find(v=>v&&v.id==='rough-herb')"));
  check('Crate reveals a collectible and proximity pickup enters inventory',
    mapAfterPickup.map.collected.includes('herb-crate')&&pickedInventory?.action==='heal'&&pickedInventory?.heal===2,
    JSON.stringify({map:mapAfterPickup.map,pickedInventory}));

  // Crossing the old 6000px boundary must stay inside the continuous world with no loading gate.
  await page.evaluate(()=>window.PaperchalkMap.teleport(6250,{notice:''}));
  await page.waitForTimeout(160);
  const continuousWorld=await page.evaluate(()=>({
    x:window.PaperchalkMap.playerX,
    route:window.PaperchalkMap.traversal.routeIndex
  }));
  check('Crossing 6000px enters the next continuous-world route with no exit gate',
    continuousWorld.x>6000&&continuousWorld.route===1,
    JSON.stringify(continuousWorld));

  // NPC is a map-bound entity with proximity prompt and real interaction.
  await page.evaluate(()=>window.PaperchalkMap.teleport(760,{notice:''}));
  await page.waitForTimeout(140);
  const npcNear=await page.evaluate(()=>({
    near:document.querySelector('[data-npc-id="npc-old-crafter"]')?.classList.contains('is-near')||false,
    interactDisabled:document.getElementById('interactBtn')?.disabled,
    playerX:window.PaperchalkMap.playerX
  }));
  check('Village NPC proximity enables talk prompt',
    npcNear.near===true&&npcNear.interactDisabled===false&&Math.abs(npcNear.playerX-760)<2,
    JSON.stringify(npcNear));
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(120);
  const npcTalk=await page.evaluate(()=>({
    open:document.getElementById('dialogueStage')?.classList.contains('is-open')||false,
    name:document.getElementById('dialogueNpcName')?.textContent||'',
    phase:window.PaperchalkDialogue?.state?.phase||''
  }));
  check('E opens the map NPC dialogue stage',
    npcTalk.open&&npcTalk.name==='白翼引路人'&&npcTalk.phase==='opening',
    JSON.stringify(npcTalk));
  await page.evaluate(()=>window.PaperchalkDialogue.close({immediate:true}));

  // Return to a safe mid-map position for persistence/UI tests.
  await page.evaluate(()=>window.PaperchalkMap.teleport(700,{notice:''}));
  await page.waitForTimeout(80);

  const healthInitial=await healthState(page);
  check('Health HUD is 10 stitched pieces',
    healthInitial.pieces===10&&healthInitial.cells===9&&healthInitial.tails===1&&healthInitial.tailIsLast&&healthInitial.loaded&&healthInitial.seam.ok,
    JSON.stringify(healthInitial));
  check('New player starts at 10 HP',
    healthInitial.hp===10&&healthInitial.maxHp===10&&healthInitial.empty===0&&healthInitial.ariaNow==='10',
    JSON.stringify(healthInitial));

  await page.evaluate(()=>window.PaperchalkHealth.damage(3));
  await page.waitForTimeout(120);
  const healthDamaged=await healthState(page);
  check('Damage drains from right across three segments',
    healthDamaged.hp===7&&healthDamaged.empty===3&&healthDamaged.ariaNow==='7'&&healthDamaged.hit===3,
    JSON.stringify(healthDamaged));

  await page.evaluate(()=>window.PaperchalkHealth.heal(1));
  await page.waitForTimeout(120);
  const healthHealed=await healthState(page);
  check('Healing restores one segment with its own pop animation',
    healthHealed.hp===8&&healthHealed.empty===2&&healthHealed.ariaNow==='8'&&healthHealed.healing===1,
    JSON.stringify(healthHealed));

  // In-game debug panel: visible button, shortcuts, commands, and movement lock.
  await page.locator('#debugToggleBtn').click();
  await page.waitForTimeout(100);
  check('Debug button opens in-game debug panel',
    await page.locator('#debugPanel').evaluate(el=>el.classList.contains('is-open')) &&
    await page.locator('#debugToggleBtn').getAttribute('aria-expanded')==='true',
    'panel open');

  await page.locator('[data-debug-action="damage1"]').click();
  await page.waitForTimeout(80);
  let healthDebug=await healthState(page);
  check('Debug -1 HP button works',healthDebug.hp===7&&healthDebug.empty===3,JSON.stringify(healthDebug));

  await page.locator('[data-debug-action="heal1"]').click();
  await page.waitForTimeout(80);
  healthDebug=await healthState(page);
  check('Debug +1 HP button works',healthDebug.hp===8&&healthDebug.empty===2,JSON.stringify(healthDebug));

  await page.locator('#debugCommandInput').fill('hp 5');
  await page.locator('#debugCommandForm').evaluate(form=>form.requestSubmit());
  await page.waitForTimeout(80);
  healthDebug=await healthState(page);
  check('Debug hp command works',
    healthDebug.hp===5 && (await page.locator('#debugOutput').textContent()).includes('HP -> 5 / 10'),
    JSON.stringify(healthDebug));

  await page.locator('#debugCommandInput').fill('hp +3');
  await page.locator('#debugCommandForm').evaluate(form=>form.requestSubmit());
  await page.waitForTimeout(80);
  healthDebug=await healthState(page);
  check('Debug relative hp command works',healthDebug.hp===8,JSON.stringify(healthDebug));
  check('Multi-point healing staggers restored pieces by 45ms',
    healthDebug.healing===3 &&
    JSON.stringify(healthDebug.healDelays)===JSON.stringify(['0ms','45ms','90ms']),
    JSON.stringify(healthDebug));

  const beforeBlockedMove=await state(page);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyD');
  const afterBlockedMove=await state(page);
  check('Opening debug panel pauses movement input',
    Math.abs(afterBlockedMove.worldX-beforeBlockedMove.worldX)<0.1 &&
    Math.abs(afterBlockedMove.actorX-beforeBlockedMove.actorX)<0.1,
    JSON.stringify({beforeBlockedMove,afterBlockedMove}));

  await page.locator('#debugCloseBtn').click();
  await page.waitForTimeout(80);
  check('Debug close button closes panel',
    !(await page.locator('#debugPanel').evaluate(el=>el.classList.contains('is-open'))),
    'panel closed');

  // Let world time advance and move.
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1800);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(300);
  const moved=await state(page);
  check('Movement works',moved.worldX>0||moved.actorX>s.actorX,JSON.stringify(moved));
  check('World time advances',moved.worldMinutes>1,'worldMinutes='+moved.worldMinutes);
  const entityMapSync=await page.evaluate(()=>({
    worldX:window.eval('worldX'),
    transform:document.getElementById('entityTrack').style.transform
  }));
  const entityTranslateX=Number((entityMapSync.transform.match(/translate3d\((-?[0-9.]+)px/)||[])[1]);
  check('World entity track scrolls with map coordinates',
    Number.isFinite(entityTranslateX)&&Math.abs(entityTranslateX+entityMapSync.worldX)<0.5,
    JSON.stringify({...entityMapSync,entityTranslateX}));

  const compositorPlayer=await page.evaluate(()=>({
    left:document.querySelector('.actor').style.left,
    bottom:document.querySelector('.actor').style.bottom,
    actorX:document.querySelector('.actor').style.getPropertyValue('--actor-x'),
    actorY:document.querySelector('.actor').style.getPropertyValue('--actor-y'),
    willChange:getComputedStyle(document.querySelector('.actor')).willChange
  }));
  check('Player motion uses compositor transform instead of per-frame left/bottom layout',
    compositorPlayer.left===''&&compositorPlayer.bottom===''&&
    compositorPlayer.actorX.endsWith('px')&&compositorPlayer.actorY.endsWith('px')&&
    compositorPlayer.willChange.includes('transform'),
    JSON.stringify(compositorPlayer));

  const poolBefore=await page.evaluate(()=>window.PaperchalkDebug.perf());
  await page.evaluate(()=>window.PaperchalkMap.teleport(9000,{notice:''}));
  await page.waitForTimeout(100);
  const poolFirstVisit=await page.evaluate(()=>window.PaperchalkDebug.perf());
  await page.evaluate(x=>window.PaperchalkMap.teleport(x,{notice:''}),moved.playerWorldX);
  await page.waitForTimeout(100);
  const poolReturn=await page.evaluate(()=>window.PaperchalkDebug.perf());
  check('Map visual window reuses retained DOM nodes when revisiting an area',
    poolFirstVisit.visualOriginX>poolBefore.visualOriginX&&
    poolFirstVisit.pooledMapNodes>=poolBefore.pooledMapNodes&&
    poolReturn.mapVisualCreateCount===poolFirstVisit.mapVisualCreateCount,
    JSON.stringify({poolBefore,poolFirstVisit,poolReturn}));

  // Open menu from world: paper effects must clean themselves up.
  await page.locator('#worldMenuBtn').click();
  await page.waitForTimeout(900);
  const fx1=await paperState(page);
  check('Paper ball cleans up after world-menu transition',fx1.ball==='0',JSON.stringify(fx1));
  const saveA=await save(page,'audit_a');
  check('A save uses account-specific v2 key',saveA?.account==='audit_a',JSON.stringify(saveA));
  check('A camera position saved',Math.abs((saveA?.worldX||0)-moved.worldX)<5,'saved='+saveA?.worldX+' runtime='+moved.worldX);
  check('A player world position saved',Math.abs((saveA?.playerWorldX||0)-moved.playerWorldX)<5,'saved='+saveA?.playerWorldX+' runtime='+moved.playerWorldX);
  check('A map changes are saved',
    saveA?.mapState?.broken?.includes('crate-1')&&saveA?.mapState?.collected?.includes('herb-crate'),
    JSON.stringify(saveA?.mapState));
  check('A health saved with world state',saveA?.playerHp===8,'saved playerHp='+saveA?.playerHp);

  // Continue must visually hide shell, not merely disable pointer events.
  await page.locator('#continueBtn').click();
  await page.waitForTimeout(450);
  const shell=await page.locator('#uiShell').evaluate(el=>({
    cls:el.className,opacity:getComputedStyle(el).opacity,pointer:getComputedStyle(el).pointerEvents
  }));
  check('Continue visually hides menu',shell.cls.includes('is-hidden')&&Number(shell.opacity)<0.02,JSON.stringify(shell));

  // Inventory: inject a serializable consumable and persist it.
  await page.evaluate(()=>{
    window.eval("inventoryItems[0]={name:'测试叶片',desc:'回归测试',weight:1,count:3,consumable:true,icon:'./assets/ui/inventory-v2/leaf.png'};inventorySelected=0;renderInventory();saveWorldState();");
  });
  let invSave=await save(page,'audit_a');
  check('Inventory is persisted in account save',invSave?.inventory?.[0]?.count===3,JSON.stringify(invSave?.inventory?.[0]));

  // Reload to prove persistence.
  await page.reload({waitUntil:'networkidle'});
  await page.waitForTimeout(250);
  await page.locator('#continueBtn').click();
  await page.waitForTimeout(450);
  await page.evaluate(()=>window.PaperchalkCombat.toggleEnemyAi(false));
  const healthReloaded=await healthState(page);
  check('Health survives reload',healthReloaded.hp===8&&healthReloaded.empty===2,JSON.stringify(healthReloaded));
  const mapReloaded=await mapState(page);
  check('Map destruction and pickups survive reload',
    mapReloaded.map.broken.includes('crate-1')&&mapReloaded.map.collected.includes('herb-crate'),
    JSON.stringify(mapReloaded.map));
  await page.locator('#backpackBtn').click();
  await page.waitForTimeout(850);
  let inv=await page.evaluate(()=>window.eval('inventoryItems[0]'));
  check('Inventory survives reload',inv?.count===3,JSON.stringify(inv));

  // Focus trap.
  await page.locator('#backpackClose').focus();
  let escaped=false;
  for(let i=0;i<30;i++){
    await page.keyboard.press('Tab');
    const inside=await page.evaluate(()=>!!document.activeElement?.closest('#backpackFrame'));
    if(!inside){escaped=true;break}
  }
  check('Backpack traps keyboard focus',!escaped,'escaped='+escaped);

  // Use and drop both mutate + persist.
  await page.evaluate(()=>window.eval('inventorySelected=0;renderInventory();'));
  await page.locator('#inventoryUse').click();
  await page.waitForTimeout(100);
  inv=await page.evaluate(()=>window.eval('inventoryItems[0]'));
  check('Use consumes one consumable',inv?.count===2,JSON.stringify(inv));
  await page.locator('#inventoryDrop').click();
  await page.waitForTimeout(100);
  inv=await page.evaluate(()=>window.eval('inventoryItems[0]'));
  check('Drop removes one item',inv?.count===1,JSON.stringify(inv));
  invSave=await save(page,'audit_a');
  check('Use/drop persist immediately',invSave?.inventory?.[0]?.count===1,JSON.stringify(invSave?.inventory?.[0]));

  await page.locator('#backpackClose').click();
  await page.waitForTimeout(120);

  // Settings are real and persist.
  await page.locator('#worldMenuBtn').click();
  await page.waitForTimeout(850);
  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(850);
  check('Settings controls exist',
    await page.locator('#settingLanguage,#settingTimeScale,#settingLandscape').count()===3,
    'controls='+await page.locator('#settingLanguage,#settingTimeScale,#settingLandscape').count());
  await page.locator('#settingTimeScale').selectOption('2');
  await page.locator('#settingLandscape').uncheck();
  const settings=await page.evaluate(()=>JSON.parse(localStorage.getItem('paperchalk.settings.v1')));
  check('Settings persist',settings?.timeScale===2&&settings?.preferLandscape===false,JSON.stringify(settings));

  // Switch to B, which must not inherit A.
  await page.locator('#pageSettings [data-back="menu"]').click();
  await page.waitForTimeout(800);
  await page.locator('#authBtn').click();
  await page.waitForTimeout(800);
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('audit_b');
  await page.locator('#regName').fill('审计B');
  await page.locator('#regPass').fill('test5678');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForTimeout(450);
  await page.evaluate(()=>window.PaperchalkCombat.toggleEnemyAi(false));
  const bState=await state(page);
  const saveB=await save(page,'audit_b');
  check('B gets a fresh independent save',
    Math.abs(bState.worldX)<1&&Math.abs(bState.playerWorldX-460)<2&&saveB?.account==='audit_b',
    JSON.stringify({bState,saveB}));
  const bInv=await page.evaluate(()=>window.eval('inventoryItems[0]'));
  check('B does not inherit A inventory',bInv===null,JSON.stringify(bInv));
  const bHealth=await healthState(page);
  check('B starts with independent full health',bHealth.hp===10&&saveB?.playerHp===10,JSON.stringify({bHealth,saveHp:saveB?.playerHp}));
  const bMap=await mapState(page);
  check('B does not inherit A map destruction or pickups',
    bMap.map.broken.length===0&&bMap.map.collected.length===0,
    JSON.stringify(bMap.map));

  // Save B, then return A and prove A is intact.
  await page.locator('#worldMenuBtn').click();
  await page.waitForTimeout(850);
  await page.locator('#authBtn').click();
  await page.waitForTimeout(800);
  await page.locator('#tabLogin').click();
  await page.locator('#loginUser').fill('audit_a');
  await page.locator('#loginPass').fill('test1234');
  await page.locator('#loginForm button[type=submit]').click();
  await page.waitForTimeout(450);
  await page.evaluate(()=>window.PaperchalkCombat.toggleEnemyAi(false));
  const aReturn=await state(page);
  const aReturnInv=await page.evaluate(()=>window.eval('inventoryItems[0]'));
  check('A restores its own position',
    Math.abs(aReturn.playerWorldX-saveA.playerWorldX)<5&&Math.abs(aReturn.worldX-saveA.worldX)<5,
    JSON.stringify({returned:aReturn,expected:{worldX:saveA.worldX,playerWorldX:saveA.playerWorldX}}));
  check('A restores its own inventory',aReturnInv?.count===1,JSON.stringify(aReturnInv));
  const aReturnHealth=await healthState(page);
  check('A restores its own health',aReturnHealth.hp===8&&aReturnHealth.empty===2,JSON.stringify(aReturnHealth));
  const aReturnMap=await mapState(page);
  check('A restores its own persistent map state',
    aReturnMap.map.broken.includes('crate-1')&&aReturnMap.map.collected.includes('herb-crate'),
    JSON.stringify(aReturnMap.map));

  // Paper cleanup after backpack too.
  await page.locator('#backpackBtn').click();
  await page.waitForTimeout(850);
  const fx2=await paperState(page);
  check('Paper ball cleans up after backpack transition',fx2.ball==='0',JSON.stringify(fx2));

  const backClosed=await page.evaluate(()=>window.PaperchalkHandleBack());
  await page.waitForTimeout(120);
  check('Native back closes backpack first',
    backClosed===true && !(await page.locator('#backpackOverlay').evaluate(el=>el.classList.contains('is-open'))),
    'handled='+backClosed);

  await page.locator('#debugToggleBtn').click();
  await page.waitForTimeout(100);
  check('Visible debug button opens the debug panel',
    await page.locator('#debugPanel').evaluate(el=>el.classList.contains('is-open')),
    'open='+await page.locator('#debugPanel').evaluate(el=>el.classList.contains('is-open')));
  const backClosedDebug=await page.evaluate(()=>window.PaperchalkHandleBack());
  await page.waitForTimeout(100);
  check('Native back closes debug panel first',
    backClosedDebug===true && !(await page.locator('#debugPanel').evaluate(el=>el.classList.contains('is-open'))),
    'handled='+backClosedDebug);

  const backOpenedMenu=await page.evaluate(()=>window.PaperchalkHandleBack());
  await page.waitForTimeout(120);
  check('Native back from world opens game menu',
    backOpenedMenu===true && !(await page.locator('#uiShell').evaluate(el=>el.classList.contains('is-hidden'))),
    'handled='+backOpenedMenu);

  check('No uncaught runtime errors',result.errors.length===0,JSON.stringify(result.errors));
} finally {
  await browser.close();
}

result.summary={
  total:result.checks.length,
  passed:result.checks.filter(x=>x.pass).length,
  failed:result.checks.filter(x=>!x.pass).length
};
console.log('CORE_REGRESSION '+JSON.stringify(result));
if(result.summary.failed>0)process.exitCode=1;
