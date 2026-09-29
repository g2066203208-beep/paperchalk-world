import process from 'node:process';
import {chromium} from 'playwright-core';
function assert(c,m){if(!c)throw new Error(m)}
const errors=[];
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1365,height:768}});
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:8080/?ci=voxel3d-engine',{waitUntil:'networkidle'});
  await page.locator('#authBtn').click();
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('voxel3d_engine');
  await page.locator('#regName').fill('Engine');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>window.Paperchalk3D?.ready&&window.Paperchalk3D?.active,{timeout:15000});
  await page.waitForTimeout(1800);
  const initial=await page.evaluate(()=>window.Paperchalk3D.stats);
  assert(initial.renderer==='WebGLRenderer','not WebGLRenderer');
  assert(initial.worldMode==='infinite-voxel-3d','wrong world mode');
  assert(initial.terrainMode==='streamed-3d-voxel-chunks','wrong terrain mode');
  assert(initial.terrain?.visibleChunks>0&&initial.terrain?.renderedSolidVoxels>0,'no streamed voxel geometry');
  assert(initial.terrain?.dimensions===3&&initial.terrain?.infinite===true,'not true 3D terrain');
  assert(initial.terrain?.greedyRatio>=1,'greedy mesher stats missing');
  assert(initial.playerTextureSize?.width===768&&initial.playerTextureSize?.height===1536,'HD player texture missing');
  assert(initial.camera.stageView?.enabled===false,'3D orbit camera must be default');
  assert(initial.flatShading===true,'flat shading renderer flag missing');
  assert(initial.ocean?.mode==='analytic-ocean-plane','analytic ocean renderer missing '+JSON.stringify(initial.ocean));
  assert(initial.farTerrain?.mode==='coarse-heightfield-ring','far terrain LOD missing '+JSON.stringify(initial.farTerrain));
  assert(initial.fishEcology?.disabled===true&&initial.fishEcology.active===0,'fish ecology should be disabled '+JSON.stringify(initial.fishEcology));
  const canvas=page.locator('#threeWorldLayer canvas'),box=await canvas.boundingBox();
  assert(box,'canvas missing');
  const before=initial.camera.yaw;
  await page.mouse.move(box.x+box.width*.6,box.y+box.height*.45);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.72,box.y+box.height*.52,{steps:8});
  await page.mouse.up();
  await page.waitForTimeout(100);
  const after=await page.evaluate(()=>window.Paperchalk3D.stats.camera.yaw);
  assert(Math.abs(after-before)>.1,'3D camera did not orbit');
  await page.evaluate(()=>window.PaperchalkHealth.set(5));
  await page.waitForTimeout(100);
  const hp=await page.evaluate(()=>window.Paperchalk3D.stats.health);
  assert(hp?.value===5,'health bar failed');
  const torchItem=await page.evaluate(()=>window.PaperchalkInventory.items.find(i=>i?.id==='hand-torch')||null);
  assert(torchItem?.action==='toggle-torch','starter torch missing');
  const torchState=await page.evaluate(()=>({
    result:window.PaperchalkCombat.toggleTorch(true,{notice:false,persist:false}),
    player:window.PaperchalkRuntime.getSnapshot().player
  }));
  assert(torchState.result===true&&torchState.player.torchOn===true,'torch gameplay state did not activate '+JSON.stringify(torchState));
  const atmosphere=await page.evaluate(()=>window.Paperchalk3D.stats.environment);
  assert(atmosphere&&typeof atmosphere.fogDensity==='number','weather atmosphere missing '+JSON.stringify(atmosphere));
  assert(errors.length===0,'engine errors: '+errors.join(' | '));
  console.log('INFINITE_VOXEL_3D_ENGINE_OK');
}finally{await browser.close()}
