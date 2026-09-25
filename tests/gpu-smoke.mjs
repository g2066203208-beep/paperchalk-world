import process from 'node:process';
import { chromium } from 'playwright-core';

function assert(condition,message){
  if(!condition)throw new Error(message);
}

const errors=[];
const browser=await chromium.launch({
  executablePath:process.env.CHROME_PATH,
  headless:true,
  args:[
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader'
  ]
});

try{
  const page=await browser.newPage({
    viewport:{width:1536,height:691},
    isMobile:true,
    hasTouch:true,
    deviceScaleFactor:1
  });
  page.on('pageerror',e=>errors.push('PAGE '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});
  page.on('requestfailed',r=>errors.push('REQUEST '+r.url()+' '+JSON.stringify(r.failure())));

  await page.goto('http://127.0.0.1:8080/?ci=gpu-smoke',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.PaperchalkRenderer&&!!window.PaperchalkRuntime,{timeout:5000});
  const cold=await page.evaluate(()=>({
    ready:window.PaperchalkRenderer.ready,
    mode:window.PaperchalkRenderer.mode,
    requested:window.PaperchalkRenderer.requested,
    active:window.PaperchalkRenderer.active,
    pixiResources:performance.getEntriesByType('resource').filter(e=>e.name.includes('/vendor/pixi/')).length,
    worldMinutes:window.PaperchalkRuntime.getSnapshot().time.minutes
  }));
  await page.waitForTimeout(320);
  const coldLater=await page.evaluate(()=>({
    pixiResources:performance.getEntriesByType('resource').filter(e=>e.name.includes('/vendor/pixi/')).length,
    worldMinutes:window.PaperchalkRuntime.getSnapshot().time.minutes
  }));
  assert(cold.mode==='dom'&&cold.requested==='auto','Auto renderer must be DOM on both desktop and mobile '+JSON.stringify(cold));
  assert(cold.ready===false&&cold.pixiResources===0,'Pixi loaded before world entry '+JSON.stringify(cold));
  assert(coldLater.pixiResources===0,'Pixi vendor fetched while still on menu '+JSON.stringify(coldLater));
  assert(Math.abs(coldLater.worldMinutes-cold.worldMinutes)<0.001,'world time advanced on menu '+JSON.stringify({cold,coldLater}));

  // Enter a real world session. Auto mode remains DOM on mobile for exact desktop/mobile parity.
  // GPU-specific assertions explicitly switch to Pixi after entry.
  await page.locator('#authBtn').click();
  await page.waitForTimeout(450);
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('gpu_audit');
  await page.locator('#regName').fill('GPU审计');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('uiShell')?.classList.contains('is-hidden'),{timeout:3000});
  const autoAfterEnter=await page.evaluate(()=>({
    mode:window.PaperchalkRenderer.mode,
    requested:window.PaperchalkRenderer.requested,
    actorWidth:document.querySelector('.actor')?.getBoundingClientRect().width||0,
    actorHeight:document.querySelector('.actor')?.getBoundingClientRect().height||0,
    visual:window.PaperchalkRuntime.worldData.playerVisual
  }));
  assert(autoAfterEnter.mode==='dom','mobile auto mode diverged from desktop '+JSON.stringify(autoAfterEnter));
  assert(autoAfterEnter.visual.scale<1&&autoAfterEnter.visual.scale>.90,
    'mobile viewport scale is outside expected automatic range '+JSON.stringify(autoAfterEnter));
  assert(Math.abs(autoAfterEnter.actorWidth-autoAfterEnter.visual.w)<1&&Math.abs(autoAfterEnter.actorHeight-autoAfterEnter.visual.h)<1,
    'DOM player size diverged from shared responsive visual '+JSON.stringify(autoAfterEnter));
  await page.evaluate(()=>window.PaperchalkRenderer.setMode('pixi'));
  await page.waitForFunction(()=>window.PaperchalkRenderer?.mode==='pixi'&&window.PaperchalkRenderer?.ready,{timeout:12000});

  const initial=await page.evaluate(()=>({
    renderer:window.PaperchalkRenderer.stats,
    visual:window.PaperchalkRuntime.worldData.playerVisual,
    mode:window.PaperchalkRenderer.mode,
    active:window.PaperchalkRenderer.active,
    pixiResources:performance.getEntriesByType('resource').filter(e=>e.name.includes('/vendor/pixi/')).length,
    canvas:{
      exists:!!document.querySelector('#pixiEntityLayer canvas'),
      width:document.querySelector('#pixiEntityLayer canvas')?.width||0,
      height:document.querySelector('#pixiEntityLayer canvas')?.height||0
    },
    worldClass:document.getElementById('world').className,
    actorVisibility:getComputedStyle(document.querySelector('.actor')).visibility,
    entityVisibility:getComputedStyle(document.querySelector('.entity-layer')).visibility
  }));
  assert(initial.mode==='pixi'&&initial.active,'Pixi renderer did not activate after explicit switch '+JSON.stringify(initial));
  assert(initial.visual.scale<1&&initial.visual.scale>.90,'shared responsive player visual is invalid '+JSON.stringify(initial.visual));
  assert(Math.abs(initial.renderer.playerDisplayW-initial.visual.w)<1&&Math.abs(initial.renderer.playerDisplayH-initial.visual.h)<1,
    'Pixi idle player size diverged from shared responsive visual '+JSON.stringify(initial.renderer));
  assert(initial.pixiResources>0,'Pixi vendor was not lazy-loaded after world entry '+JSON.stringify(initial));
  assert(initial.canvas.exists&&initial.canvas.width>500&&initial.canvas.height>250,'Pixi canvas invalid '+JSON.stringify(initial.canvas));
  assert(initial.worldClass.includes('renderer-pixi-dynamic'),'renderer class missing');
  assert(initial.actorVisibility==='hidden'&&initial.entityVisibility==='hidden','DOM dynamic entities are still visible');

  await page.evaluate(()=>window.PaperchalkCombat.crouch(true));
  await page.waitForTimeout(100);
  const gpuCrouch=await page.evaluate(()=>({
    action:window.PaperchalkCombat.player.action,
    actionScale:window.PaperchalkCombat.player.actionScale,
    rendererAction:window.PaperchalkRenderer.stats.playerAction,
    rendererScale:window.PaperchalkRenderer.stats.playerActionScale,
    sourceFacing:window.PaperchalkRenderer.stats.playerSourceFacing,
    displayW:window.PaperchalkRenderer.stats.playerDisplayW,
    visual:{...window.PaperchalkRuntime.worldData.playerVisual}
  }));
  assert(gpuCrouch.action==='crouch'&&gpuCrouch.rendererAction==='crouch'&&
    Math.abs(gpuCrouch.actionScale-.76)<.001&&Math.abs(gpuCrouch.rendererScale-.76)<.001&&
    gpuCrouch.sourceFacing===1&&Math.abs(gpuCrouch.displayW-gpuCrouch.visual.w*.76)<1,
    'Pixi renderer did not follow normalized crouch metadata '+JSON.stringify(gpuCrouch));
  await page.evaluate(()=>window.PaperchalkCombat.crouch(false));
  await page.waitForTimeout(80);

  await page.evaluate(()=>{
    window.PaperchalkCombat.placeEnemyNear(320);
    window.PaperchalkCombat.toggleEnemyAi(true);
  });
  await page.waitForTimeout(180);
  const before=await page.evaluate(()=>({
    simX:window.PaperchalkCombat.enemy.x,
    frames:window.PaperchalkRenderer.stats.frameCount,
    gpuX:window.PaperchalkRenderer.stats.playerWorldX,
    rendered:window.PaperchalkRenderer.stats.renderedEnemies
  }));
  await page.waitForTimeout(650);
  const after=await page.evaluate(()=>({
    simX:window.PaperchalkCombat.enemy.x,
    frames:window.PaperchalkRenderer.stats.frameCount,
    gpuX:window.PaperchalkRenderer.stats.playerWorldX,
    rendered:window.PaperchalkRenderer.stats.renderedEnemies,
    snapshotRevision:window.PaperchalkRenderer.stats.snapshotRevision
  }));
  assert(after.frames>=before.frames+2,'Pixi render-on-state-change is not advancing '+JSON.stringify({before,after}));
  assert(after.rendered>0,'near enemy was not rendered by Pixi '+JSON.stringify(after));
  assert(Math.abs(after.simX-before.simX)>10,'enemy simulation did not advance '+JSON.stringify({before,after}));
  assert(after.snapshotRevision>0,'renderer is not receiving runtime snapshots');

  // Deterministic player-state synchronization. Keyboard movement is already covered
  // by Core/UI regressions; this test isolates the renderer contract from CI frame-rate/input jitter.
  const targetPlayerX=900;
  await page.evaluate(x=>window.PaperchalkMap.teleport(x,{notice:''}),targetPlayerX);
  await page.waitForTimeout(140);
  const player=await page.evaluate(()=>({
    sim:window.PaperchalkCombat.player.x,
    gpu:window.PaperchalkRenderer.stats.playerWorldX,
    screen:window.PaperchalkRenderer.stats.playerScreenX,
    revision:window.PaperchalkRenderer.stats.snapshotRevision
  }));
  assert(Math.abs(player.sim-targetPlayerX)<1,'player simulation did not reach deterministic target '+JSON.stringify(player));
  assert(Math.abs(player.sim-player.gpu)<1,'Pixi player state is out of sync '+JSON.stringify(player));

  // Renderer switching is a supported recovery path.
  await page.evaluate(()=>window.PaperchalkRenderer.setMode('dom'));
  await page.waitForFunction(()=>window.PaperchalkRenderer.mode==='dom');
  const dom=await page.evaluate(()=>({
    actor:getComputedStyle(document.querySelector('.actor')).visibility,
    entity:getComputedStyle(document.querySelector('.entity-layer')).visibility,
    host:document.getElementById('pixiEntityLayer').hidden
  }));
  assert(dom.actor!=='hidden'&&dom.entity!=='hidden'&&dom.host===true,'DOM fallback did not restore '+JSON.stringify(dom));

  await page.evaluate(()=>window.PaperchalkRenderer.setMode('pixi'));
  await page.waitForFunction(()=>window.PaperchalkRenderer.mode==='pixi');
  const restored=await page.evaluate(()=>({
    actor:getComputedStyle(document.querySelector('.actor')).visibility,
    entity:getComputedStyle(document.querySelector('.entity-layer')).visibility,
    host:document.getElementById('pixiEntityLayer').hidden,
    frames:window.PaperchalkRenderer.stats.frameCount
  }));
  assert(restored.actor==='hidden'&&restored.entity==='hidden'&&!restored.host,'Pixi reactivation failed '+JSON.stringify(restored));

  assert(errors.length===0,'runtime errors: '+JSON.stringify(errors));
  console.log('GPU_RENDERER_SMOKE_PASS',JSON.stringify({cold,coldLater,initial,before,after,player,dom,restored}));
}finally{
  await browser.close();
}
