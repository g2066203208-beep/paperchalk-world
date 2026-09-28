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
  await page.locator('#regUser').fill('paper_engine');
  await page.locator('#regName').fill('Engine');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:12000});
  await page.waitForTimeout(420);

  const initial=await page.evaluate(()=>({
    stats:window.Paperchalk3D.stats,
    resources:performance.getEntriesByType('resource').filter(e=>e.name.includes('/vendor/')).map(e=>e.name),
    canvas:document.querySelector('#threeWorldLayer canvas')?.className||'',
    terrain:window.PaperchalkTerrainActions.stats
  }));
  assert(initial.stats.renderer==='WebGLRenderer','renderer is not WebGLRenderer '+JSON.stringify(initial.stats));
  assert(initial.stats.worldMode==='paper-stage-2.5d','wrong world mode '+JSON.stringify(initial.stats));
  assert(initial.stats.terrainMode==='single-layer-3d-cubes','wrong terrain mode '+JSON.stringify(initial.stats));
  assert(initial.stats.entityMode==='2d-textured-planes','non-terrain entities are not planes '+JSON.stringify(initial.stats));
  assert(initial.stats.playerGeometry==='PlaneGeometry','player is not a paper plane '+JSON.stringify(initial.stats));
  assert(initial.stats.playerTextureSize?.width===768&&initial.stats.playerTextureSize?.height===1536,'HD protagonist texture did not decode '+JSON.stringify(initial.stats.playerTextureSize));
  assert(initial.stats.paperEntities>=6,'paper entity scene not constructed '+JSON.stringify(initial.stats));
  assert(initial.stats.terrain.visibleChunks>=20,'not enough streamed chunks '+JSON.stringify(initial.stats.terrain));
  assert(initial.stats.terrain.oneLayer===true,'terrain unexpectedly gained Z gameplay layers '+JSON.stringify(initial.stats.terrain));
  assert(initial.stats.terrain.blockGeometry==='3d-cube','terrain blocks are not real 3D cube geometry '+JSON.stringify(initial.stats.terrain));
  assert(Math.abs(initial.stats.terrain.thickness-1)<1e-6,'terrain cube thickness must be 1m '+JSON.stringify(initial.stats.terrain));
  assert(initial.stats.terrain.tileSize===1&&initial.stats.terrain.pixelsPerMeter===128&&initial.stats.terrain.texturePixels===128,'terrain scale must be 1m / 128px '+JSON.stringify(initial.stats.terrain));
  assert(initial.stats.terrain.renderedQuads>0&&initial.stats.terrain.terrainTriangles>0,'cube mesher emitted no geometry '+JSON.stringify(initial.stats.terrain));
  assert(initial.stats.terrain.culledInternalFaces>0,'internal cube faces were not culled '+JSON.stringify(initial.stats.terrain));
  assert(initial.stats.terrain.greedyRatio>1,'greedy meshing did not merge any faces '+JSON.stringify(initial.stats.terrain));
  assert(initial.stats.terrain.renderedSolidTiles>100,'terrain mesher produced too little geometry '+JSON.stringify(initial.stats.terrain));
  assert(initial.resources.some(x=>x.includes('three.module.js'))&&initial.resources.some(x=>x.includes('three.core.js')),'Three module/core pair missing');
  assert(initial.resources.some(x=>x.includes('/vendor/fastnoise-lite/FastNoiseLite.js')),'FastNoiseLite browser resource missing '+JSON.stringify(initial.resources));
  assert(initial.terrain.noiseBackend==='FastNoiseLite-1.1.1','FastNoiseLite terrain backend not active '+JSON.stringify(initial.terrain));
  assert(initial.canvas==='three-world-canvas','paper-stage canvas class missing');
  assert(initial.stats.health?.cells===10&&initial.stats.health?.tail===true,'world-space health bar missing '+JSON.stringify(initial.stats.health));

  const beforeCam=initial.stats.camera;
  assert(beforeCam.stageView?.enabled===true&&beforeCam.stageView?.axis==='z','stage must start locked to Z '+JSON.stringify(beforeCam));
  const canvas=page.locator('#threeWorldLayer canvas');
  const box=await canvas.boundingBox();assert(box,'canvas bounds unavailable');
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
  await page.mouse.up();await page.waitForTimeout(80);
  const freeAfter=await page.evaluate(()=>window.Paperchalk3D.stats.camera);
  assert(Math.abs(freeAfter.yaw-freeBefore.yaw)>.15,'debug free camera did not orbit '+JSON.stringify({freeBefore,freeAfter}));
  await page.evaluate(()=>window.Paperchalk3D.setStageView(true,'z'));

  const projection=await page.evaluate(()=>{
    const canvas=document.querySelector('#threeWorldLayer canvas'),r=canvas.getBoundingClientRect();
    return window.Paperchalk3D.screenToWorld(r.left+r.width*.5,r.top+r.height*.5);
  });
  assert(Number.isFinite(projection?.x)&&Number.isFinite(projection?.y)&&Math.abs(projection.z-.125)<1e-6,'screen-to-cube-front projection failed '+JSON.stringify(projection));
  const targeted=await page.evaluate(()=>{
    const canvas=document.querySelector('#threeWorldLayer canvas'),r=canvas.getBoundingClientRect();
    return window.Paperchalk3D.screenToTerrainCell(r.left+r.width*.5,r.top+r.height*.5,{showCursor:true});
  });
  assert(Number.isInteger(targeted?.gx)&&Number.isInteger(targeted?.gy),'screen terrain-cell targeting failed '+JSON.stringify(targeted));

  await page.evaluate(()=>window.PaperchalkHealth.set(5));
  await page.waitForTimeout(90);
  const health5=await page.evaluate(()=>window.Paperchalk3D.stats.health);
  assert(health5.value===5&&health5.animating>0,'damage animation did not start '+JSON.stringify(health5));
  await page.waitForFunction(()=>window.Paperchalk3D?.stats?.health?.animating===0,null,{timeout:2500});

  await page.locator('#worldMenuBtn').click();await page.waitForTimeout(100);
  const off=await page.evaluate(()=>({active:window.Paperchalk3D.active,loop:window.Paperchalk3D.stats.loopActive,hidden:document.getElementById('threeWorldLayer').hidden}));
  assert(!off.active&&!off.loop&&off.hidden,'paper-stage renderer did not suspend '+JSON.stringify(off));
  assert(errors.length===0,'paper-stage runtime errors:\n'+errors.join('\n'));
  console.log(JSON.stringify({ok:true,initial:initial.stats,beforeCam,freeAfter,projection,health5,off},null,2));
}finally{await browser.close()}
