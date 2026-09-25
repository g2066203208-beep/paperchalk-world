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

  await page.goto('http://127.0.0.1:8080/?ci=gpu-smoke&renderer=pixi',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.PaperchalkRenderer?.mode==='pixi'&&window.PaperchalkRenderer?.ready,{timeout:12000});

  const initial=await page.evaluate(()=>({
    renderer:window.PaperchalkRenderer.stats,
    mode:window.PaperchalkRenderer.mode,
    canvas:{
      exists:!!document.querySelector('#pixiEntityLayer canvas'),
      width:document.querySelector('#pixiEntityLayer canvas')?.width||0,
      height:document.querySelector('#pixiEntityLayer canvas')?.height||0
    },
    worldClass:document.getElementById('world').className,
    actorVisibility:getComputedStyle(document.querySelector('.actor')).visibility,
    entityVisibility:getComputedStyle(document.querySelector('.entity-layer')).visibility
  }));
  assert(initial.mode==='pixi','Pixi renderer did not activate '+JSON.stringify(initial));
  assert(initial.canvas.exists&&initial.canvas.width>500&&initial.canvas.height>250,'Pixi canvas invalid '+JSON.stringify(initial.canvas));
  assert(initial.worldClass.includes('renderer-pixi-dynamic'),'renderer class missing');
  assert(initial.actorVisibility==='hidden'&&initial.entityVisibility==='hidden','DOM dynamic entities are still visible');

  // Enter a real world session.
  await page.locator('#authBtn').click();
  await page.waitForTimeout(450);
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('gpu_audit');
  await page.locator('#regName').fill('GPU审计');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('uiShell')?.classList.contains('is-hidden'),{timeout:3000});

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
  assert(after.frames>before.frames+5,'Pixi ticker is not advancing '+JSON.stringify({before,after}));
  assert(after.rendered>0,'near enemy was not rendered by Pixi '+JSON.stringify(after));
  assert(Math.abs(after.simX-before.simX)>10,'enemy simulation did not advance '+JSON.stringify({before,after}));
  assert(after.snapshotRevision>0,'renderer is not receiving runtime snapshots');

  // Player movement must stay synchronized with the renderer contract.
  const px0=await page.evaluate(()=>window.PaperchalkCombat.player.x);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(420);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(80);
  const player=await page.evaluate(()=>({
    sim:window.PaperchalkCombat.player.x,
    gpu:window.PaperchalkRenderer.stats.playerWorldX,
    screen:window.PaperchalkRenderer.stats.playerScreenX
  }));
  assert(player.sim>px0+25,'player simulation did not move '+JSON.stringify({px0,player}));
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
  console.log('GPU_RENDERER_SMOKE_PASS',JSON.stringify({initial,before,after,player,dom,restored}));
}finally{
  await browser.close();
}
