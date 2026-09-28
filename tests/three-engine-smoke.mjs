import process from 'node:process';
import {chromium} from 'playwright-core';
function assert(c,m){if(!c)throw new Error(m)}
const errors=[];
const browser=await chromium.launch({
  executablePath:process.env.CHROME_PATH,
  headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
try{
  const page=await browser.newPage({viewport:{width:1365,height:768}});
  page.on('pageerror',e=>errors.push('PAGE '+String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});
  page.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url())});

  await page.goto('http://127.0.0.1:8080/?ci=paper-stage-engine',{waitUntil:'networkidle'});
  await page.locator('#authBtn').click();
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('paper_stage_engine');
  await page.locator('#regName').fill('Stage');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:12000});
  await page.waitForTimeout(350);

  const initial=await page.evaluate(()=>({
    stats:window.Paperchalk3D.stats,
    runtime:window.PaperchalkRuntime.getSnapshot(),
    terrain:window.PaperchalkTerrain.stats(),
    resources:performance.getEntriesByType('resource').map(e=>e.name),
    canvas:document.querySelector('#threeWorldLayer canvas')?.className||''
  }));
  assert(initial.stats.renderer==='WebGLRenderer','renderer is not WebGLRenderer '+JSON.stringify(initial.stats));
  assert(initial.stats.mode==='paper-stage-x-y-voxel','paper-stage mode missing '+JSON.stringify(initial.stats));
  assert(initial.stats.drawCalls>3&&initial.stats.triangles>100,'stage not drawing enough geometry '+JSON.stringify(initial.stats));
  assert(initial.stats.terrain?.singleLayer===true&&initial.stats.terrain?.activeChunks>=9,'single-layer voxel chunks missing '+JSON.stringify(initial.stats.terrain));
  assert(initial.stats.paperEntities>=10&&initial.stats.playerRepresentation==='PlaneGeometry','2D paper entities missing '+JSON.stringify(initial.stats));
  assert(initial.terrain.noiseBackend==='FastNoiseLite-1.1.1','FastNoiseLite not used '+JSON.stringify(initial.terrain));
  assert(initial.resources.some(x=>x.includes('/vendor/three/three.module.js')),'Three module missing');
  assert(initial.resources.some(x=>x.includes('/vendor/fastnoise-lite/FastNoiseLite.js')),'FastNoiseLite resource missing');
  assert(initial.canvas==='three-world-canvas','stage canvas class missing');
  assert(initial.stats.health?.cells===10&&initial.stats.health?.tail===true,'world-space health bar missing '+JSON.stringify(initial.stats.health));

  const beforeCam=initial.stats.camera;
  assert(beforeCam.stageView?.enabled===true&&beforeCam.stageView?.axis==='z','stage camera must start fixed on Z '+JSON.stringify(beforeCam));
  const canvas=page.locator('#threeWorldLayer canvas');
  const box=await canvas.boundingBox();
  assert(box,'canvas bounds unavailable');

  await page.mouse.move(box.x+box.width*.55,box.y+box.height*.45);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.70,box.y+box.height*.52,{steps:8});
  await page.mouse.up();
  await page.waitForTimeout(80);
  const lockedCam=await page.evaluate(()=>window.Paperchalk3D.stats.camera);
  assert(Math.abs(lockedCam.yaw-beforeCam.yaw)<1e-6,'locked paper-stage camera rotated '+JSON.stringify({beforeCam,lockedCam}));

  await page.evaluate(()=>window.Paperchalk3D.setStageView(false));
  const freeBefore=await page.evaluate(()=>window.Paperchalk3D.stats.camera);
  await page.mouse.move(box.x+box.width*.55,box.y+box.height*.45);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.70,box.y+box.height*.52,{steps:8});
  await page.mouse.up();
  await page.waitForTimeout(80);
  const freeAfter=await page.evaluate(()=>window.Paperchalk3D.stats.camera);
  assert(Math.abs(freeAfter.yaw-freeBefore.yaw)>.15,'free debug camera did not orbit '+JSON.stringify({freeBefore,freeAfter}));
  await page.evaluate(()=>window.Paperchalk3D.setStageView(true,'z'));

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(220);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(190);
  const right=await page.evaluate(()=>window.Paperchalk3D.stats);
  assert(right.playerFacing===1,'paper actor did not face right '+JSON.stringify(right));

  await page.keyboard.down('KeyA');
  await page.waitForTimeout(260);
  await page.keyboard.up('KeyA');
  await page.waitForTimeout(220);
  const left=await page.evaluate(()=>window.Paperchalk3D.stats);
  assert(left.playerFacing===-1,'paper actor did not switch left '+JSON.stringify(left));
  assert(Math.abs(Math.abs(left.playerTurnRotationY)-Math.PI)<.18,'paper actor did not complete edge-on flip turn '+JSON.stringify(left));

  const terrainEdit=await page.evaluate(()=>{
    const t=window.PaperchalkTerrain;
    const p=window.PaperchalkRuntime.getSnapshot().player;
    const tx=Math.floor(p.x/t.tileSize);
    const ty=Math.floor((p.y-.03)/t.tileSize);
    const before=t.getTile(tx,ty);
    const removed=t.breakTile(tx,ty);
    return {tx,ty,before,removed,stats:t.stats()};
  });
  assert(terrainEdit.removed!==false&&terrainEdit.before!==0,'terrain edit did not remove a voxel '+JSON.stringify(terrainEdit));
  await page.waitForTimeout(120);
  const terrainAfter=await page.evaluate(([tx,ty])=>({
    tile:window.PaperchalkTerrain.getTile(tx,ty),
    stats:window.Paperchalk3D.stats
  }),[terrainEdit.tx,terrainEdit.ty]);
  assert(terrainAfter.tile===0&&terrainAfter.stats.terrain.deltas>=1,'terrain mesh/data did not rebuild after edit '+JSON.stringify(terrainAfter));

  await page.evaluate(()=>window.Paperchalk3D.setDebugColliders(true));
  assert((await page.evaluate(()=>window.Paperchalk3D.stats.debugColliders))===true,'terrain/entity debug view did not enable');

  await page.evaluate(()=>window.PaperchalkHealth.set(5));
  await page.waitForTimeout(90);
  const health5=await page.evaluate(()=>window.Paperchalk3D.stats.health);
  assert(health5.value===5&&health5.animating>0,'damage animation did not start '+JSON.stringify(health5));
  await page.waitForFunction(()=>window.Paperchalk3D?.stats?.health?.animating===0,null,{timeout:2500});

  await page.evaluate(()=>window.PaperchalkHealth.set(8));
  await page.waitForTimeout(70);
  const healing=await page.evaluate(()=>window.Paperchalk3D.stats.health);
  assert(healing.value===8&&healing.animating>0,'heal animation did not start '+JSON.stringify(healing));

  await page.locator('#worldMenuBtn').click();
  await page.waitForTimeout(100);
  const off=await page.evaluate(()=>({active:window.Paperchalk3D.active,loop:window.Paperchalk3D.stats.loopActive,hidden:document.getElementById('threeWorldLayer').hidden}));
  assert(!off.active&&!off.loop&&off.hidden,'renderer did not suspend on menu '+JSON.stringify(off));
  assert(errors.length===0,'runtime errors:\n'+errors.join('\n'));

  console.log(JSON.stringify({ok:true,initial:initial.stats,beforeCam,lockedCam,freeAfter,right,left,terrainEdit,terrainAfter,health5,healing,off},null,2));
}finally{
  await browser.close();
}
