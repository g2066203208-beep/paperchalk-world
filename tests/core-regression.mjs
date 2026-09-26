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
    const raw=localStorage.getItem('paperchalk.save.v3.'+encodeURIComponent(a));
    return raw?JSON.parse(raw):null;
  },account);
}
async function paperState(page){
  return page.evaluate(()=>({
    ball:getComputedStyle(document.getElementById('paperFxBall')).opacity,
    unfold:getComputedStyle(document.getElementById('paperFxUnfold')).opacity
  }));
}
async function npcGroundLockState(page){
  return page.evaluate(()=>{
    const npc=document.querySelector('[data-npc-id="npc-phone-girl"]');
    const canvas=document.getElementById('cardGroundCanvas');
    if(!npc||!canvas)return {ok:false};
    const r=npc.getBoundingClientRect();
    const grid=window.PaperchalkMap.project(768,0,0);
    const ground=window.PaperchalkMap.project(760,0,0);
    const npcX=r.left+r.width*.5;
    const canvasRect=canvas.getBoundingClientRect();
    return {
      ok:Number.isFinite(grid.x)&&Number.isFinite(ground.y)&&canvas.width>0&&canvas.height>0,
      playerX:window.PaperchalkMap.playerX,
      npcX,npcFootY:r.bottom,gridX:grid.x,zeroY:ground.y,
      horizontalOffset:grid.x-npcX,
      footError:r.bottom-ground.y,
      npcCssX:getComputedStyle(npc).left,
      npcVarX:npc.style.getPropertyValue('--npc-x'),
      canvas:{left:canvasRect.left,top:canvasRect.top,width:canvasRect.width,height:canvasRect.height}
    };
  });
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
    initialMap.terrainCount===0&&initialMap.objectCount===0&&initialMap.spawnCount===21&&initialMap.npcCount===1,
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
  const cleanGround=await page.evaluate(()=>({
    roadHidden:document.querySelector('.road-layer')?.hasAttribute('hidden')||false,
    groundY:Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ground-screen-y'))||null,
    roadDisplay:getComputedStyle(document.querySelector('.road-layer')).display
  }));
  check('Card stage keeps legacy road hidden while the perspective ground anchor remains valid',
    cleanGround.roadHidden&&cleanGround.roadDisplay==='none'&&cleanGround.groundY>0,
    JSON.stringify(cleanGround));

  const finiteGround=await page.evaluate(()=>{
    const canvas=document.getElementById('cardGroundCanvas');
    const sky=document.querySelector('.paper-sky');
    const stats=window.PaperchalkDomCardProjection?.stats||{};
    const horizonY=window.PaperchalkMap.project(window.PaperchalkMap.playerX,1280,0).y;
    const midMainY=window.PaperchalkMap.project(window.PaperchalkMap.playerX,0,0).y;
    const skyRect=sky?.getBoundingClientRect();
    const rect=canvas?.getBoundingClientRect();
    const dpr=rect?.width?canvas.width/rect.width:1;
    const ctx=canvas?.getContext('2d');
    function bestPixel(y){
      let best=[0,0,0,0],bestScore=-1;
      if(!ctx)return best;
      const px=Math.max(0,Math.round(20*dpr));
      const py=Math.round(y*dpr);
      for(let dy=-3;dy<=3;dy++){
        const data=ctx.getImageData(px,Math.max(0,py+dy),1,1).data;
        const score=data[3]+Math.max(data[0],data[1],data[2]);
        if(score>bestScore){bestScore=score;best=[...data]}
      }
      return best;
    }
    return {
      farDepth:Number(canvas?.dataset.farDepth),
      depthLines:Number(canvas?.dataset.depthLineCount),
      worldLines:Number(canvas?.dataset.worldLineCount),
      sceneLines:Number(canvas?.dataset.sceneLineCount),
      sceneMainLines:Number(canvas?.dataset.sceneMainCount),
      sceneSubLines:Number(canvas?.dataset.sceneSubCount),
      guideDepths:canvas?.dataset.sceneGuideDepths||'',
      childNodes:canvas?.childNodes?.length??-1,
      backingPixels:(canvas?.width||0)*(canvas?.height||0),
      horizonY,
      skyBottom:skyRect?.bottom??null,
      midMainY,
      horizonPixel:bestPixel(horizonY),
      midMainPixel:bestPixel(midMainY),
      nearMainPixel:bestPixel(stats.sceneGuideYs?.['near-main']??-100),
      farMainPixel:bestPixel(stats.sceneGuideYs?.['far-main']??-100),
      renderer:stats
    };
  });
  check('Ground grid has 3x3 scene sublayers plus one horizon line',
    finiteGround.farDepth===1280&&finiteGround.depthLines<=14&&finiteGround.worldLines<=40&&
    finiteGround.sceneLines===10&&finiteGround.sceneMainLines===4&&finiteGround.sceneSubLines===6&&
    finiteGround.guideDepths==='near-front:-160,near-main:-128,near-back:-96,mid-front:-32,mid-main:0,mid-back:32,far-front:512,far-main:640,far-back:768,horizon:1280'&&
    finiteGround.childNodes===0&&finiteGround.backingPixels>0&&
    Math.abs(finiteGround.skyBottom-finiteGround.horizonY)<1&&
    finiteGround.horizonPixel[0]>180&&finiteGround.horizonPixel[1]>150&&finiteGround.horizonPixel[2]<150&&
    finiteGround.midMainPixel[2]>finiteGround.midMainPixel[0]&&
    finiteGround.nearMainPixel[0]>finiteGround.nearMainPixel[2]&&
    finiteGround.farMainPixel[2]>finiteGround.farMainPixel[0],
    JSON.stringify(finiteGround));
  const perspectiveMetrics=await page.evaluate(()=>{
    const zs=[-128,0,640,1280];
    const points=zs.map(z=>window.PaperchalkMap.project(window.PaperchalkMap.playerX,z,0));
    return {
      zs,
      scales:points.map(p=>p.scale),
      ys:points.map(p=>p.y),
      expected:zs.map(z=>900/(900+z))
    };
  });
  check('Main scene lines use real pinhole perspective at meter-aligned depths',
    perspectiveMetrics.scales.every((s,i)=>Math.abs(s-perspectiveMetrics.expected[i])<1e-9)&&
    (perspectiveMetrics.ys[1]-perspectiveMetrics.ys[2])>(perspectiveMetrics.ys[2]-perspectiveMetrics.ys[3]),
    JSON.stringify(perspectiveMetrics));
  const guideOrder=Object.values(finiteGround.renderer.sceneGuideYs||{});
  check('Near/mid/far front-main-back guides are ordered toward the horizon',
    guideOrder.length===10&&guideOrder.every((y,i)=>i===0||guideOrder[i-1]>y),
    JSON.stringify(finiteGround.renderer.sceneGuideYs));
  check('Off-screen enemy projection is culled before camera/DOM work',
    finiteGround.renderer.culledEnemies>=20&&finiteGround.renderer.projectedEnemies<=1&&
    finiteGround.renderer.projectedNpcs===1,
    JSON.stringify(finiteGround.renderer));

  await page.waitForFunction(()=>window.PaperchalkOldTownBuildings&&document.querySelectorAll('#oldTownBuildingTrack .oldtown-building').length===20,null,{timeout:3000});
  await page.waitForTimeout(120);
  const oldTownScene=await page.evaluate(()=>{
    const slots=[...document.querySelectorAll('#oldTownBuildingTrack .oldtown-building')];
    const visible=slots.filter(el=>!el.hidden&&getComputedStyle(el).display!=='none');
    const ids=[...new Set(slots.map(el=>el.dataset.buildingId).filter(Boolean))];
    const firstRow=slots.slice(0,10).map(el=>el.dataset.buildingId);
    const sequential=Array.from({length:10},(_,i)=>'oldtown-building-'+String(i+1).padStart(2,'0'));
    const layer=document.getElementById('oldTownBuildingLayer');
    const actor=document.querySelector('.actor');
    const firstRect=visible[0]?.getBoundingClientRect();
    return {
      poolId:window.PaperchalkOldTownBuildings.poolId,
      rowWidth:window.PaperchalkOldTownBuildings.rowWidth,
      slots:slots.length,
      visible:visible.length,
      uniqueIds:ids.length,
      firstRow,
      shuffled:firstRow.some((id,i)=>id!==sequential[i]),
      layerZ:Number.parseFloat(getComputedStyle(layer).zIndex)||0,
      actorZ:Number.parseFloat(getComputedStyle(actor).zIndex)||0,
      atlasRequested:performance.getEntriesByType('resource').some(e=>e.name.includes('oldtown-building-atlas-r1.webp')),
      firstRect:firstRect?{w:firstRect.width,h:firstRect.height,left:firstRect.left,top:firstRect.top}:null,
      perf:window.PaperchalkOldTownBuildings.stats
    };
  });
  check('Old-town scene uses all 10 supplied buildings in a retained seeded row pool',
    oldTownScene.poolId==='real-world.old-town.buildings'&&
    oldTownScene.slots===20&&oldTownScene.uniqueIds===10&&oldTownScene.shuffled&&oldTownScene.rowWidth>1000&&
    oldTownScene.perf.projected<oldTownScene.slots&&oldTownScene.perf.coarseCulled>0,
    JSON.stringify(oldTownScene));
  check('Old-town buildings are visible in the deepest midground behind the protagonist',
    oldTownScene.visible>0&&oldTownScene.firstRect?.w>40&&oldTownScene.firstRect?.h>80&&
    oldTownScene.layerZ<oldTownScene.actorZ&&oldTownScene.atlasRequested,
    JSON.stringify(oldTownScene));

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
  const crouchTransition=await page.evaluate(()=>{
    const animations=document.getElementById('playerFlip')?.getAnimations()||[];
    return animations.map(a=>a.effect?.getKeyframes?.()||[]).flat().map(k=>({
      scale:k.scale||'',
      transform:k.transform||''
    }));
  });
  await page.waitForFunction(()=>document.querySelector('.actor')?.dataset.playerState==='crouch',null,{timeout:900});
  await page.waitForTimeout(90);
  const crouched=await page.evaluate(()=>({
    player:window.PaperchalkCombat.player,
    state:document.querySelector('.actor')?.dataset.playerState,
    src:document.getElementById('playerSprite')?.getAttribute('src')||'',
    button:document.getElementById('crouchBtn')?.classList.contains('is-active')||false
  }));
  const crouchHasScaleTransition=crouchTransition.some(k=>k.scale&&k.scale!=='none');
  const crouchHasFullFlip=crouchTransition.some(k=>String(k.transform||'').includes('rotateY'));
  check('Crouch swaps directly without shrinking the standing card',
    crouchAccepted===true&&!crouchHasScaleTransition&&!crouchHasFullFlip&&crouched.player.crouching&&crouched.player.action==='crouch'&&
    crouched.player.bodyH===78&&Math.abs(crouched.player.actionScale-.76)<.001&&crouched.state==='crouch'&&
    crouched.src.includes('/assets/player/runtime/crouch.webp')&&crouched.button,
    JSON.stringify({crouchAccepted,crouchTransition,crouched}));

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

  // Gameplay is strictly X/Y. Z remains available only as authored scene depth.
  await page.evaluate(()=>window.PaperchalkMap.teleport(460,{notice:''}));
  await page.waitForTimeout(100);
  const xyCameraBefore=await page.evaluate(()=>{
    const actor=document.querySelector('.actor').getBoundingClientRect();
    const snap=window.PaperchalkRuntime.getSnapshot();
    const groundZero=window.PaperchalkMap.project(window.PaperchalkMap.playerX,0,0);
    const groundFar=window.PaperchalkMap.project(window.PaperchalkMap.playerX,640,0);
    return {
      player:window.PaperchalkCombat.player,
      camera:snap.camera,
      near:window.PaperchalkMap.project(760,0,0),
      far:window.PaperchalkMap.project(760,640,0),
      cameraY:document.getElementById('world').style.getPropertyValue('--card-camera-y'),
      groundZeroY:groundZero.y,
      groundFarY:groundFar.y,
      actor:{left:actor.left,top:actor.top,width:actor.width,height:actor.height}
    };
  });
  check('Gameplay player owns only X/Y while camera Z stays fixed',
    !('z' in xyCameraBefore.player)&&Math.abs(xyCameraBefore.camera.z||0)<.001,
    JSON.stringify(xyCameraBefore));
  check('Authored Z still produces scene depth without player Z movement',
    xyCameraBefore.near.scale>xyCameraBefore.far.scale&&
    xyCameraBefore.near.y>xyCameraBefore.far.y,
    JSON.stringify({near:xyCameraBefore.near,far:xyCameraBefore.far}));

  await page.keyboard.down('KeyW');
  await page.waitForFunction(()=>window.PaperchalkCombat?.player?.y>20,null,{timeout:900});
  const xyCameraRaised=await page.evaluate(()=>{
    const actor=document.querySelector('.actor').getBoundingClientRect();
    const groundZero=window.PaperchalkMap.project(window.PaperchalkMap.playerX,0,0);
    const groundFar=window.PaperchalkMap.project(window.PaperchalkMap.playerX,640,0);
    return {
      player:window.PaperchalkCombat.player,
      cameraY:document.getElementById('world').style.getPropertyValue('--card-camera-y'),
      groundZeroY:groundZero.y,
      groundFarY:groundFar.y,
      actor:{left:actor.left,top:actor.top,width:actor.width,height:actor.height}
    };
  });
  await page.keyboard.up('KeyW');
  check('W/Up is Y jump, not Z movement',
    xyCameraRaised.player.y>20&&!('z' in xyCameraRaised.player),
    JSON.stringify(xyCameraRaised));
  const nearGroundRise=xyCameraRaised.groundZeroY-xyCameraBefore.groundZeroY;
  const farGroundRise=xyCameraRaised.groundFarY-xyCameraBefore.groundFarY;
  check('Rising in Y moves the shared-camera ground downward with correct depth scaling',
    Number.parseFloat(xyCameraRaised.cameraY)>20&&
    Math.abs(nearGroundRise-xyCameraRaised.player.y)<1.2&&
    farGroundRise>0&&farGroundRise<nearGroundRise,
    JSON.stringify({before:xyCameraBefore,raised:xyCameraRaised,nearGroundRise,farGroundRise}));
  check('XY camera keeps the protagonist fixed while the world moves vertically',
    Math.abs(xyCameraRaised.actor.left-xyCameraBefore.actor.left)<1&&
    Math.abs(xyCameraRaised.actor.top-xyCameraBefore.actor.top)<1&&
    Math.abs(xyCameraRaised.actor.width-xyCameraBefore.actor.width)<1&&
    Math.abs(xyCameraRaised.actor.height-xyCameraBefore.actor.height)<1,
    JSON.stringify({before:xyCameraBefore.actor,raised:xyCameraRaised.actor}));
  await page.waitForFunction(()=>window.PaperchalkCombat?.player?.grounded,null,{timeout:1800});

  await page.keyboard.down('KeyS');
  await page.waitForFunction(()=>window.PaperchalkCombat?.player?.crouching===true,null,{timeout:600});
  const sCrouch=await page.evaluate(()=>window.PaperchalkCombat.player);
  await page.keyboard.up('KeyS');
  await page.waitForTimeout(100);
  const sRelease=await page.evaluate(()=>window.PaperchalkCombat.player);
  check('S/Down crouches instead of moving in depth',
    sCrouch.crouching===true&&!('z' in sCrouch)&&sRelease.crouching===false,
    JSON.stringify({sCrouch,sRelease}));

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

  const playerRectBeforeJump=await page.evaluate(()=>{
    const r=document.querySelector('.actor').getBoundingClientRect();
    return {left:r.left,top:r.top};
  });
  const jumpStarted=await page.evaluate(()=>window.PaperchalkCombat.jump());
  await page.waitForFunction(()=>document.querySelector('.actor')?.dataset.playerState==='jump-up'&&
    window.PaperchalkCombat?.player?.y>20,null,{timeout:900});
  const jumpAir=await page.evaluate(()=>({
    player:window.PaperchalkCombat.player,
    state:document.querySelector('.actor')?.dataset.playerState,
    src:document.getElementById('playerSprite')?.getAttribute('src')||''
  }));
  const playerRectInJump=await page.evaluate(()=>{
    const r=document.querySelector('.actor').getBoundingClientRect();
    return {left:r.left,top:r.top};
  });
  check('Jump ascent uses supplied upward pose',
    jumpStarted===true&&jumpAir.player.y>20&&!jumpAir.player.grounded&&
    jumpAir.player.vy>0&&jumpAir.player.action==='jump-up'&&jumpAir.state==='jump-up'&&
    jumpAir.src.includes('/assets/player/runtime/jump-up.webp'),
    JSON.stringify(jumpAir));
  check('Jump moves the world vertically while player screen position stays fixed',
    Math.abs(playerRectInJump.left-playerRectBeforeJump.left)<1&&
    Math.abs(playerRectInJump.top-playerRectBeforeJump.top)<1,
    JSON.stringify({playerRectBeforeJump,playerRectInJump}));

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
  check('Debug panel exposes combat/spawn/camera overlays with no authored terrain colliders',
    debugView.combat.hitboxes&&debugView.combat.attackRange&&debugView.combat.mapColliders&&debugView.combat.spawnZones&&debugView.combat.camera&&
    debugView.playerHurt.width>40&&debugView.attack.width>80&&debugView.attack.preview&&
    debugView.terrainBoxes===0&&debugView.spawnBoxes>0&&debugView.cameraDisplay!=='none',
    JSON.stringify(debugView));
  check('Inactive enemy attack box leaves no red-line residual',
    debugView.enemyAttack.hidden===true&&debugView.enemyAttack.width===0,
    JSON.stringify(debugView.enemyAttack));

  await page.locator('[data-debug-action="flightMode"]').click();
  await page.locator('#debugCloseBtn').click();
  await page.waitForTimeout(60);
  const flightStart=await page.evaluate(()=>window.PaperchalkCombat.player);
  const flightRectStart=await page.evaluate(()=>{
    const r=document.querySelector('.actor').getBoundingClientRect();
    return {left:r.left,top:r.top};
  });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(280);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(80);
  const flightUp=await page.evaluate(()=>window.PaperchalkCombat.player);
  check('Debug flight moves vertically upward',
    flightUp.y>flightStart.y+35,
    JSON.stringify({flightStart,flightUp}));
  const flightX0=flightUp.x;
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(220);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(60);
  const flightRight=await page.evaluate(()=>window.PaperchalkCombat.player);
  check('Free flight moves horizontally as well as vertically',
    flightRight.x>flightX0+25,
    JSON.stringify({flightX0,flightRight}));
  const flightRectAfter=await page.evaluate(()=>{
    const r=document.querySelector('.actor').getBoundingClientRect();
    return {left:r.left,top:r.top};
  });
  check('Free flight moves only the world while player stays fixed on screen',
    Math.abs(flightRectAfter.left-flightRectStart.left)<1&&
    Math.abs(flightRectAfter.top-flightRectStart.top)<1,
    JSON.stringify({flightRectStart,flightRectAfter}));

  await page.evaluate(()=>window.eval(
    'playerWorldX=5950;playerY=4200;playerVy=0;updateCamera();renderWorld(true);'
  ));
  const highFlightBefore=await page.evaluate(()=>{
    const r=document.querySelector('.actor').getBoundingClientRect();
    const s=window.PaperchalkRuntime.getSnapshot();
    return {x:s.player.x,y:s.player.y,camera:s.camera,rect:{left:r.left,top:r.top}};
  });
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(520);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(80);
  const highFlightAfter=await page.evaluate(()=>{
    const r=document.querySelector('.actor').getBoundingClientRect();
    const s=window.PaperchalkRuntime.getSnapshot();
    return {x:s.player.x,y:s.player.y,camera:s.camera,rect:{left:r.left,top:r.top}};
  });
  check('Free flight crosses a 6000px route boundary without resetting Y',
    highFlightAfter.x>6000&&highFlightAfter.y>highFlightBefore.y+80&&
    Math.abs(highFlightAfter.camera.y-highFlightAfter.y)<1,
    JSON.stringify({highFlightBefore,highFlightAfter}));
  check('High-altitude XY camera keeps the player fixed on screen',
    Math.abs(highFlightAfter.rect.left-highFlightBefore.rect.left)<1&&
    Math.abs(highFlightAfter.rect.top-highFlightBefore.rect.top)<1,
    JSON.stringify({highFlightBefore,highFlightAfter}));

  await page.locator('#debugToggleBtn').click();
  await page.waitForTimeout(50);
  await page.locator('[data-debug-action="flightMode"]').click();
  const flightOff=await page.evaluate(()=>window.PaperchalkDebug.flight);
  check('Debug flight can be disabled',flightOff===false,'flight='+flightOff);

  // Isolate the following ground-combat checks from the intentional 4km-high
  // flight-camera regression above.
  await page.evaluate(()=>window.PaperchalkMap.teleport(6000,{notice:''}));
  await page.waitForTimeout(80);

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

  // Clean stage: no authored rocks, platforms, crates or pickups may remain.
  await page.evaluate(()=>{
    window.PaperchalkCombat.toggleEnemyAi(false);
    window.PaperchalkMap.teleport(1060,{notice:''});
  });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(800);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(80);
  const unobstructed=await state(page);
  check('Clean stage has no assistant-authored obstacle blocking movement',
    unobstructed.playerWorldX>1140,
    JSON.stringify(unobstructed));
  const cleanMapObjects=await mapState(page);
  check('Clean stage publishes zero authored terrain and map objects',
    cleanMapObjects.terrainCount===0&&cleanMapObjects.objectCount===0&&
    cleanMapObjects.map.broken.length===0&&cleanMapObjects.map.collected.length===0,
    JSON.stringify(cleanMapObjects));

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
  await page.waitForFunction(()=>{
    const img=document.querySelector('[data-npc-id="npc-phone-girl"] .map-npc-art');
    return !!img&&img.complete&&img.naturalWidth>0&&img.naturalHeight>0;
  },null,{timeout:3000});
  await page.waitForTimeout(80);
  const npcNear=await page.evaluate(()=>{
    const img=document.querySelector('[data-npc-id="npc-phone-girl"] .map-npc-art');
    return {
      near:document.querySelector('[data-npc-id="npc-phone-girl"]')?.classList.contains('is-near')||false,
      interactDisabled:document.getElementById('interactBtn')?.disabled,
      playerX:window.PaperchalkMap.playerX,
      art:{
        naturalW:img?.naturalWidth||0,naturalH:img?.naturalHeight||0,
        layoutW:img?.offsetWidth||0,layoutH:img?.offsetHeight||0
      }
    };
  });
  check('Village NPC proximity enables talk prompt',
    npcNear.near===true&&npcNear.interactDisabled===false&&Math.abs(npcNear.playerX-760)<2&&
    npcNear.art.naturalW===326&&npcNear.art.naturalH===1002&&
    npcNear.art.layoutH===128&&npcNear.art.layoutW>=41&&npcNear.art.layoutW<=43,
    JSON.stringify(npcNear));

  // Ground/NPC lock: the NPC is authored at x=760,z=0. The nearest 1 m grid
  // line is x=768, so their screen-space offset must remain exactly 8 px while
  // the player/camera moves horizontally.
  const npcGroundBefore=await npcGroundLockState(page);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(260);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(80);
  const npcGroundAfter=await npcGroundLockState(page);
  check('Fixed NPC stays locked to the same ground coordinates during horizontal camera motion',
    npcGroundBefore.ok&&npcGroundAfter.ok&&
    npcGroundAfter.playerX>npcGroundBefore.playerX+20&&
    Math.abs(npcGroundBefore.horizontalOffset-8)<1&&
    Math.abs(npcGroundAfter.horizontalOffset-8)<1&&
    Math.abs(npcGroundAfter.horizontalOffset-npcGroundBefore.horizontalOffset)<.6&&
    Math.abs(npcGroundBefore.footError)<.8&&Math.abs(npcGroundAfter.footError)<.8,
    JSON.stringify({before:npcGroundBefore,after:npcGroundAfter}));
  await page.evaluate(()=>window.PaperchalkMap.teleport(760,{notice:''}));
  await page.waitForTimeout(80);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(120);
  const npcTalk=await page.evaluate(()=>({
    open:document.getElementById('dialogueStage')?.classList.contains('is-open')||false,
    name:document.getElementById('dialogueNpcName')?.textContent||'',
    phase:window.PaperchalkDialogue?.state?.phase||''
  }));
  check('E opens the map NPC dialogue stage',
    npcTalk.open&&npcTalk.name==='？？？'&&npcTalk.phase==='opening',
    JSON.stringify(npcTalk));
  await page.evaluate(()=>window.PaperchalkDialogue.close({immediate:true}));
  const stagePlayerBefore=await page.evaluate(()=>({
    screenX:window.PaperchalkScene.playerScreenX,
    centerX:window.PaperchalkScene.centerX,
    rect:(()=>{const r=document.querySelector('.actor').getBoundingClientRect();return {x:r.left,y:r.top}})()
  }));
  const stageEnter=await page.evaluate(()=>window.PaperchalkScene.enter());
  check('Apartment door stage transition can start',stageEnter===true,'enter='+stageEnter);
  await page.waitForTimeout(360);
  const stagePlayerMid=await page.evaluate(()=>({
    screenX:window.PaperchalkScene.playerScreenX,
    rect:(()=>{const r=document.querySelector('.actor').getBoundingClientRect();return {x:r.left,y:r.top}})()
  }));
  check('Player stays fixed while the outgoing exterior world leaves',
    Math.abs(stagePlayerMid.screenX-stagePlayerBefore.screenX)<1&&
    Math.abs(stagePlayerMid.rect.y-stagePlayerBefore.rect.y)<2.5,
    JSON.stringify({stagePlayerBefore,stagePlayerMid}));

  await page.waitForFunction(()=>window.PaperchalkScene.location==='interior'&&window.PaperchalkScene.transitioning,null,{timeout:2200});
  const interiorReveal=await page.evaluate(()=>({
    anchorError:window.PaperchalkScene.lastDoorAnchorErrorX,
    anchorX:window.PaperchalkScene.interiorDoorAnchorX,
    startPlayerX:window.PaperchalkScene.playerScreenX
  }));
  check('Interior world reveals with its doorway bound to the player anchor',
    Math.abs(interiorReveal.anchorError)<1&&Math.abs(interiorReveal.anchorX-stagePlayerBefore.screenX)<1,
    JSON.stringify({stagePlayerBefore,interiorReveal}));

  await page.waitForFunction(()=>window.PaperchalkScene.location==='interior'&&!window.PaperchalkScene.transitioning,null,{timeout:2500});
  const interiorStage=await page.evaluate(()=>({
    location:window.PaperchalkScene.location,
    visible:getComputedStyle(document.getElementById('interiorScene')).visibility,
    worldClass:document.getElementById('world').className,
    playerX:window.PaperchalkScene.playerScreenX,
    centerX:window.PaperchalkScene.centerX,
    doorX:window.PaperchalkScene.interiorDoorScreenX
  }));
  check('Interior world settles around the fixed player screen anchor',
    interiorStage.location==='interior'&&interiorStage.visible==='visible'&&
    interiorStage.worldClass.includes('scene-interior')&&
    Math.abs(interiorStage.playerX-interiorStage.centerX)<1&&
    Math.abs(interiorStage.doorX-interiorStage.playerX)<1,
    JSON.stringify(interiorStage));

  const interiorDepth=await page.evaluate(()=>{
    const z=id=>Number.parseInt(getComputedStyle(document.getElementById(id)).zIndex,10);
    const door=document.getElementById('interiorExitDoor').getBoundingClientRect();
    const scene=document.getElementById('interiorScene').getBoundingClientRect();
    const stage=document.getElementById('world').getBoundingClientRect();
    return {
      far:z('interiorFarLayer'),
      mid:z('interiorMidLayer'),
      player:Number.parseInt(getComputedStyle(document.querySelector('.actor')).zIndex,10),
      near:z('interiorNearLayer'),
      doorCenterX:door.left+door.width/2,
      doorGroundY:window.innerHeight-door.bottom,
      interiorDoorX:window.PaperchalkScene.interiorDoorScreenX,
      playerX:window.PaperchalkScene.playerScreenX,
      expectedGroundY:window.PaperchalkScene.interiorDoorGroundY,
      sceneAligned:Math.abs(scene.left-stage.left)<1&&Math.abs(scene.top-stage.top)<1&&
        Math.abs(scene.width-stage.width)<1&&Math.abs(scene.height-stage.height)<1
    };
  });
  check('Interior scene shares the exterior stage coordinate origin',
    interiorDepth.sceneAligned,
    JSON.stringify(interiorDepth));
  check('Interior depth order is far -> mid -> player -> near',
    interiorDepth.far<interiorDepth.mid&&interiorDepth.mid<interiorDepth.player&&interiorDepth.player<interiorDepth.near,
    JSON.stringify(interiorDepth));
  check('Interior doorway stays physically attached to the centered player after camera settle',
    Math.abs(interiorDepth.doorCenterX-interiorDepth.interiorDoorX)<2&&
    Math.abs(interiorDepth.doorCenterX-interiorDepth.playerX)<2,
    JSON.stringify(interiorDepth));
  check('Interior doorway threshold stays on the exterior ground line',
    Math.abs(interiorDepth.doorGroundY-interiorDepth.expectedGroundY)<2,
    JSON.stringify(interiorDepth));

  const indoorMap=await page.evaluate(()=>{
    const m=window.PaperchalkScene.interiorMap;
    const left=document.querySelector('.interior-wall-left').getBoundingClientRect();
    const right=document.querySelector('.interior-wall-right').getBoundingClientRect();
    const stairs=document.getElementById('interiorStaircase').getBoundingClientRect();
    const lower=document.querySelector('.interior-stair-run-lower').getBoundingClientRect();
    const upper=document.querySelector('.interior-stair-run-upper').getBoundingClientRect();
    return {
      m,leftW:left.width,rightW:right.width,
      stairsW:stairs.width,stairsH:stairs.height,
      lower:{w:lower.width,h:lower.height},
      upper:{w:upper.width,h:upper.height}
    };
  });
  check('Interior uses residential 12m x 6m proportions with real side walls',
    indoorMap.m.width===1536&&indoorMap.m.height===768&&
    indoorMap.m.secondFloorY===384&&
    indoorMap.leftW>=60&&indoorMap.rightW>=60,
    JSON.stringify(indoorMap));
  check('Interior draws two opposite stair runs with a half landing',
    indoorMap.stairsW>=380&&indoorMap.stairsH>=380&&
    indoorMap.lower.w>=315&&indoorMap.lower.h>=188&&
    indoorMap.upper.w>=315&&indoorMap.upper.h>=188&&
    indoorMap.m.stairs.x0===768&&indoorMap.m.stairs.x1===1088&&
    indoorMap.m.stairs.midY===192,
    JSON.stringify(indoorMap));

  // Start just before the lower flight. Real input must climb right to the
  // half landing, then reverse left onto the upper flight.
  await page.evaluate(()=>window.eval(
    "interiorPlayerWorldX=INTERIOR_STAIRS.x0-24;interiorStairState='floor1';"+
    "playerY=0;playerVy=0;playerGrounded=true;updateInteriorCamera();renderWorld(true);"
  ));
  const stairStart=await page.evaluate(()=>{
    const r=document.querySelector('.actor').getBoundingClientRect();
    return {
      x:window.PaperchalkScene.interiorX,
      y:window.PaperchalkScene.interiorY,
      state:window.PaperchalkScene.interiorStairState,
      camera:window.PaperchalkScene.interiorCamera,
      rect:{left:r.left,top:r.top}
    };
  });

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(70);
  const lowerRun=await page.evaluate(()=>({
    x:window.PaperchalkScene.interiorX,
    y:window.PaperchalkScene.interiorY,
    state:window.PaperchalkScene.interiorStairState,
    camera:window.PaperchalkScene.interiorCamera
  }));
  check('Lower stair run raises Y continuously while walking right',
    lowerRun.state==='lower'&&
    lowerRun.x>indoorMap.m.stairs.x0&&lowerRun.x<indoorMap.m.stairs.x1&&
    lowerRun.y>35&&lowerRun.y<indoorMap.m.stairs.midY,
    JSON.stringify(lowerRun));

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(70);
  const halfLanding=await page.evaluate(()=>({
    x:window.PaperchalkScene.interiorX,
    y:window.PaperchalkScene.interiorY,
    state:window.PaperchalkScene.interiorStairState
  }));
  check('Lower run reaches the 1.5m half landing and requires a turn',
    halfLanding.state==='landing-up'&&
    Math.abs(halfLanding.x-indoorMap.m.stairs.x1)<1&&
    Math.abs(halfLanding.y-indoorMap.m.stairs.midY)<1,
    JSON.stringify(halfLanding));

  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(70);
  const upperRun=await page.evaluate(()=>({
    x:window.PaperchalkScene.interiorX,
    y:window.PaperchalkScene.interiorY,
    state:window.PaperchalkScene.interiorStairState,
    camera:window.PaperchalkScene.interiorCamera
  }));
  check('After turning, upper stair run raises Y while walking left',
    upperRun.state==='upper'&&
    upperRun.x>indoorMap.m.stairs.x0&&upperRun.x<indoorMap.m.stairs.x1&&
    upperRun.y>indoorMap.m.stairs.midY&&upperRun.y<indoorMap.m.secondFloorY,
    JSON.stringify(upperRun));

  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(70);
  const secondFloor=await page.evaluate(()=>{
    const r=document.querySelector('.actor').getBoundingClientRect();
    return {
      x:window.PaperchalkScene.interiorX,
      y:window.PaperchalkScene.interiorY,
      state:window.PaperchalkScene.interiorStairState,
      camera:window.PaperchalkScene.interiorCamera,
      rect:{left:r.left,top:r.top}
    };
  });
  check('Second stair run reaches the 3m second floor',
    secondFloor.state==='floor2'&&
    secondFloor.x<=indoorMap.m.stairs.x0&&
    Math.abs(secondFloor.y-indoorMap.m.secondFloorY)<1&&
    Math.abs(secondFloor.camera.y-secondFloor.y)<1,
    JSON.stringify(secondFloor));
  check('Player remains fixed while both stair runs move the room in X and Y',
    Math.abs(secondFloor.rect.left-stairStart.rect.left)<1&&
    Math.abs(secondFloor.rect.top-stairStart.rect.top)<1&&
    secondFloor.camera.y>stairStart.camera.y,
    JSON.stringify({stairStart,secondFloor}));

  // Indoor jump is a real jump, independent of stair traversal.
  await page.evaluate(()=>window.eval(
    "interiorPlayerWorldX=INTERIOR_DOOR_X;interiorStairState='floor1';"+
    "playerY=0;playerVy=0;playerGrounded=true;updateInteriorCamera();renderWorld(true);"
  ));
  const indoorJumpBefore=await page.evaluate(()=>{
    const r=document.querySelector('.actor').getBoundingClientRect();
    return {y:window.PaperchalkScene.interiorY,rect:{left:r.left,top:r.top}};
  });
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.PaperchalkScene.interiorY>24&&
    !window.PaperchalkCombat.player.grounded,null,{timeout:900});
  const indoorJumpAir=await page.evaluate(()=>{
    const r=document.querySelector('.actor').getBoundingClientRect();
    return {
      y:window.PaperchalkScene.interiorY,
      vy:window.PaperchalkCombat.player.vy,
      rect:{left:r.left,top:r.top}
    };
  });
  check('Indoor jump key launches the player in world Y',
    indoorJumpAir.y>24&&indoorJumpAir.vy>0,
    JSON.stringify(indoorJumpAir));
  check('Indoor jump moves the room while player stays fixed on screen',
    Math.abs(indoorJumpAir.rect.left-indoorJumpBefore.rect.left)<1&&
    Math.abs(indoorJumpAir.rect.top-indoorJumpBefore.rect.top)<1,
    JSON.stringify({indoorJumpBefore,indoorJumpAir}));
  await page.waitForFunction(()=>window.PaperchalkCombat.player.grounded&&
    Math.abs(window.PaperchalkScene.interiorY)<1,null,{timeout:2200});

  // Walls are physical limits.
  await page.evaluate(()=>window.eval(
    "interiorPlayerWorldX=interiorHorizontalBounds().left+3;interiorStairState='floor1';"+
    "playerY=0;playerVy=0;playerGrounded=true;updateInteriorCamera();renderWorld(true);"
  ));
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(260);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(60);
  const wallStop=await page.evaluate(()=>({
    x:window.PaperchalkScene.interiorX,
    map:window.PaperchalkScene.interiorMap
  }));
  check('Indoor left wall blocks movement at the finite room boundary',
    wallStop.x>wallStop.map.leftWall&&wallStop.x<wallStop.map.leftWall+40,
    JSON.stringify(wallStop));

  // Return to the door for the exit-transition regression below.
  await page.evaluate(()=>window.eval(
    'interiorPlayerWorldX=INTERIOR_DOOR_X;playerY=0;playerVy=0;playerGrounded=true;'+
    'updateInteriorCamera();renderWorld(true);updateNpcPrompt();'
  ));
  await page.waitForTimeout(80);

  const exitPlayerBefore=await page.evaluate(()=>({
    screenX:window.PaperchalkScene.playerScreenX,
    rect:(()=>{const r=document.querySelector('.actor').getBoundingClientRect();return {x:r.left,y:r.top}})()
  }));
  const stageExit=await page.evaluate(()=>window.PaperchalkScene.exit());
  check('Interior exit starts the return paper-stage transition',stageExit===true,'exit='+stageExit);
  await page.waitForTimeout(300);
  const exitPlayerMid=await page.evaluate(()=>({
    screenX:window.PaperchalkScene.playerScreenX,
    rect:(()=>{const r=document.querySelector('.actor').getBoundingClientRect();return {x:r.left,y:r.top}})()
  }));
  check('Player stays fixed while the outgoing interior world leaves',
    Math.abs(exitPlayerMid.screenX-exitPlayerBefore.screenX)<1&&
    Math.abs(exitPlayerMid.rect.y-exitPlayerBefore.rect.y)<1,
    JSON.stringify({exitPlayerBefore,exitPlayerMid}));

  await page.waitForFunction(()=>window.PaperchalkScene.location==='outside'&&window.PaperchalkScene.transitioning,null,{timeout:1800});
  const exteriorReveal=await page.evaluate(()=>{
    const snap=window.PaperchalkRuntime.getSnapshot();
    const transform=getComputedStyle(document.getElementById('mapTrack')).transform;
    const matrix=transform&&transform!=='none'?new DOMMatrix(transform):new DOMMatrix();
    return {
      anchorError:window.PaperchalkScene.lastDoorAnchorErrorX,
      playerX:window.PaperchalkScene.playerScreenX,
      doorX:window.PaperchalkScene.doorScreenX,
      cameraX:snap.camera.x,
      visualOriginX:snap.camera.visualOriginX,
      mapTransformX:matrix.m41,
      projectedPlayerX:window.PaperchalkMap.project(snap.player.x,snap.player.z||0,0).x
    };
  });
  check('Exterior world reveals with its doorway bound to the player anchor',
    Math.abs(exteriorReveal.anchorError)<1,
    JSON.stringify(exteriorReveal));
  check('Exterior reveal uses screen-space track plus live per-entity projection',
    Math.abs(exteriorReveal.mapTransformX)<1&&
    Math.abs(exteriorReveal.projectedPlayerX-exteriorReveal.playerX)<1,
    JSON.stringify(exteriorReveal));

  await page.waitForFunction(()=>window.PaperchalkScene.location==='outside'&&!window.PaperchalkScene.transitioning,null,{timeout:2500});
  const exteriorSettled=await page.evaluate(()=>{
    const snap=window.PaperchalkRuntime.getSnapshot();
    const r=document.querySelector('.actor').getBoundingClientRect();
    return {
      cameraX:snap.camera.x,
      playerWorldX:snap.player.x,
      playerScreenX:snap.player.screenX,
      doorX:window.PaperchalkScene.doorScreenX,
      anchorX:window.PaperchalkScene.playerScreenAnchorX,
      mapWidth:snap.map.width,
      viewportWidth:snap.viewport.width,
      rect:{x:r.left,y:r.top}
    };
  });
  const expectedExitCamera=Math.max(
    0,
    Math.min(
      exteriorSettled.mapWidth-exteriorSettled.viewportWidth,
      exteriorSettled.playerWorldX-exteriorSettled.anchorX
    )
  );
  check('Exterior door remains pinned to the player after the exit animation finishes',
    Math.abs(exteriorSettled.doorX-exteriorSettled.playerScreenX)<1&&
    Math.abs(exteriorSettled.doorX-exteriorReveal.doorX)<1,
    JSON.stringify({exteriorReveal,exteriorSettled}));
  check('Exit has no secondary camera drift after exterior reveal',
    Math.abs(exteriorSettled.cameraX-exteriorReveal.cameraX)<1,
    JSON.stringify({revealCamera:exteriorReveal.cameraX,settledCamera:exteriorSettled.cameraX}));
  check('Player stays fixed for the entire exit transition',
    Math.abs(exteriorSettled.rect.x-exitPlayerBefore.rect.x)<1&&
    Math.abs(exteriorSettled.rect.y-exitPlayerBefore.rect.y)<1,
    JSON.stringify({exitPlayerBefore,exteriorSettled}));
  check('Exterior world is internally rebased to the fixed player anchor',
    Math.abs(exteriorSettled.cameraX-expectedExitCamera)<1&&
    Math.abs(exteriorSettled.playerScreenX-exteriorSettled.anchorX)<1,
    JSON.stringify({expectedExitCamera,exteriorSettled}));

  const exitFollowBefore=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot());
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(90);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(40);
  const exitFollowAfter=await page.evaluate(()=>window.PaperchalkRuntime.getSnapshot());
  const firstMovePlayerDx=exitFollowAfter.player.x-exitFollowBefore.player.x;
  const firstMoveCameraDx=exitFollowAfter.camera.x-exitFollowBefore.camera.x;
  check('First movement after exit moves the world while player screen X stays fixed',
    firstMovePlayerDx>0&&Math.abs(firstMoveCameraDx-firstMovePlayerDx)<2&&
    Math.abs(exitFollowAfter.player.screenX-exitFollowBefore.player.screenX)<2,
    JSON.stringify({firstMovePlayerDx,firstMoveCameraDx,before:exitFollowBefore.player.screenX,after:exitFollowAfter.player.screenX}));


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
  const entityMapSync=await page.evaluate(()=>{
    const npc=window.PaperchalkMap.npcs.find(n=>n.id==='npc-phone-girl');
    const projected=window.PaperchalkMap.project(npc.x,npc.z||0,0);
    const npcEl=document.querySelector('[data-npc-id="npc-phone-girl"]');
    return {
      transform:document.getElementById('entityTrack').style.transform,
      projectedX:projected.x,
      domX:Number.parseFloat(npcEl?.style.getPropertyValue('--npc-x'))||0,
      display:getComputedStyle(npcEl).display
    };
  });
  const entityTranslateX=Number((entityMapSync.transform.match(/translate3d\((-?[0-9.]+)px/)||[])[1]||0);
  check('World tracks stay screen-space while visible entities receive perspective projection',
    Math.abs(entityTranslateX)<0.5&&entityMapSync.display!=='none'&&
    Math.abs(entityMapSync.domX-entityMapSync.projectedX)<1,
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
  check('Clean map window creates no filler nodes when visiting empty areas',
    poolFirstVisit.visualOriginX>poolBefore.visualOriginX&&
    poolFirstVisit.mapVisualCreateCount===poolBefore.mapVisualCreateCount&&
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
  check('A clean map state stays empty in save',
    (saveA?.mapState?.broken?.length||0)===0&&(saveA?.mapState?.collected?.length||0)===0,
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
  check('Clean map state survives reload',
    mapReloaded.map.broken.length===0&&mapReloaded.map.collected.length===0,
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
  check('A restores its empty clean map state',
    aReturnMap.map.broken.length===0&&aReturnMap.map.collected.length===0,
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
