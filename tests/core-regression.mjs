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
  check('Fresh A starts at A-village map spawn',
    Math.abs(s.playerWorldX-460)<2&&Math.abs(s.worldX)<1&&initialMap.terrainCount===6&&initialMap.objectCount===2&&initialMap.spawnCount===2&&initialMap.npcCount===1,
    JSON.stringify({s,initialMap}));
  const parents=await page.evaluate(()=>[
    document.getElementById('enemy')?.parentElement?.id,
    document.getElementById('enemy2')?.parentElement?.id
  ]);
  check('Both enemies are mounted on the scrolling world entity track',
    parents[0]==='entityTrack'&&parents[1]==='entityTrack',
    JSON.stringify(parents));

  const enemyMoveBefore=await page.evaluate(()=>window.PaperchalkCombat.enemies);
  await page.waitForTimeout(420);
  const enemyMoveAfter=await page.evaluate(()=>window.PaperchalkCombat.enemies);
  check('Far enemy patrols visibly inside its map spawn zone',
    enemyMoveAfter[0].x<enemyMoveBefore[0].x-10 &&
    enemyMoveAfter[0].x>=enemyMoveAfter[0].patrolMin &&
    enemyMoveAfter[0].x<=enemyMoveAfter[0].patrolMax &&
    enemyMoveAfter[0].state==='patrol',
    JSON.stringify({enemyMoveBefore,enemyMoveAfter}));

  const jumpStarted=await page.evaluate(()=>window.PaperchalkCombat.jump());
  await page.waitForTimeout(140);
  const jumpAir=await page.evaluate(()=>window.PaperchalkCombat.player);
  check('Jump enters airborne state',jumpStarted===true&&jumpAir.y>20&&!jumpAir.grounded,JSON.stringify(jumpAir));
  await page.waitForTimeout(850);
  const jumpLanded=await page.evaluate(()=>window.PaperchalkCombat.player);
  check('Jump returns to map ground',jumpLanded.grounded&&Math.abs(jumpLanded.y)<1,JSON.stringify(jumpLanded));

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
    debugView.terrainBoxes>=7&&debugView.spawnBoxes===2&&debugView.cameraDisplay!=='none',
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

  // Falling onto platform-2 should land on its 116px top surface.
  await page.evaluate(()=>window.eval("playerWorldX=3060;playerY=205;playerVy=-40;playerGrounded=false;updateCamera();renderWorld();"));
  await page.waitForTimeout(500);
  const platformLanding=await state(page);
  check('Platform collider catches a falling player on its top surface',
    platformLanding.playerY>114&&platformLanding.playerY<118,
    JSON.stringify(platformLanding));

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

  // Exit is a real finite-map endpoint.
  await page.evaluate(()=>window.PaperchalkMap.teleport(5750,{notice:''}));
  await page.waitForTimeout(160);
  const exitState=await mapState(page);
  check('Map exit trigger is reached and recorded',exitState.map.exitReached===true,JSON.stringify(exitState.map));

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
  await page.waitForTimeout(100);
  const npcTalk=await page.evaluate(()=>({
    text:document.getElementById('mapNotice')?.textContent||'',
    shown:document.getElementById('mapNotice')?.classList.contains('is-show')||false
  }));
  check('E talks to the map NPC',
    npcTalk.shown&&npcTalk.text.includes('村口老匠')&&npcTalk.text.includes('跳起来越过障碍'),
    JSON.stringify(npcTalk));

  // Return to a safe mid-map position for the legacy save/UI tests.
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
    saveA?.mapState?.broken?.includes('crate-1')&&saveA?.mapState?.collected?.includes('herb-crate')&&saveA?.mapState?.exitReached===true,
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
  check('Map destruction/pickups/exit state survive reload',
    mapReloaded.map.broken.includes('crate-1')&&mapReloaded.map.collected.includes('herb-crate')&&mapReloaded.map.exitReached===true,
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
    bMap.map.broken.length===0&&bMap.map.collected.length===0&&bMap.map.exitReached===false,
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
    aReturnMap.map.broken.includes('crate-1')&&aReturnMap.map.collected.includes('herb-crate')&&aReturnMap.map.exitReached===true,
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
