import process from 'node:process';
import fs from 'node:fs';
import {chromium} from 'playwright-core';
function assert(c,m){if(!c)throw new Error(m)}
const errors=[];
fs.mkdirSync('artifacts',{recursive:true});
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
  assert(initial.paperStyle?.enabled===true&&initial.paperStyle?.visualOnly===true,'paper style not active '+JSON.stringify(initial.paperStyle));
  assert(initial.paperTerrain?.mode==='visual-only-paper-diorama-v2','paper terrain renderer missing '+JSON.stringify(initial.paperTerrain));
  assert(initial.paperTerrain?.visiblePaperChunks>0,'no visible paper chunks '+JSON.stringify(initial.paperTerrain));
  assert(initial.paperTerrain?.paperVertices>0&&initial.paperTerrain?.paperTriangles>0,'paper terrain geometry empty '+JSON.stringify(initial.paperTerrain));
  assert(initial.paperTerrain?.topRects>0&&initial.paperTerrain?.sideQuads>0&&initial.paperTerrain?.bevelQuads>0,'paper top/side/bevel geometry incomplete '+JSON.stringify(initial.paperTerrain));
  assert(initial.paperTerrain?.renderGridExposed===false,'render grid is still exposed');
  assert(initial.paperTerrain?.authority==='TerrainWorld-gameplay-grid-unchanged','gameplay authority changed');
  assert(initial.paperTerrain?.paperMaterial?.mode==='procedural-paper-pbr-v3-reference','PaperMaterial v3 missing '+JSON.stringify(initial.paperTerrain?.paperMaterial));
  assert(initial.paperTerrain?.paperMaterial?.textureResolution===512,'paper texture resolution wrong '+JSON.stringify(initial.paperTerrain?.paperMaterial));
  assert(initial.paperTerrain?.paperMaterial?.diffusePulpDominant===true,'paper pulp/albedo must dominate');
  assert(initial.paperTerrain?.paperMaterial?.weakMicroNormal===true,'paper micro normal must remain weak');
  assert(initial.paperTerrain?.paperMaterial?.physicalFibreSheen===true,'paper fibre sheen missing');
  assert(initial.paperTerrain?.paperMaterial?.correlatedNormalRoughness===true,'paper normal/roughness correlation missing');
  assert(initial.paperTerrain?.paperMaterial?.perFrameHeavyNoise===false,'paper material should be precomputed, not heavy per-frame noise');
  assert(initial.playerTextureSize?.width===768&&initial.playerTextureSize?.height===1536,'HD player texture missing');
  assert(initial.camera.stageView?.enabled===false,'3D orbit camera must be default');
  assert(initial.flatShading===true,'flat shading renderer flag missing');
  assert(initial.fishing?.renderMode==='line+bobber+worldspace-bite-ui-v2','fishing renderer missing '+JSON.stringify(initial.fishing));
  assert(initial.fishEcology?.renderMode==='pooled-instanced-paper-fish','fish ecology renderer missing '+JSON.stringify(initial.fishEcology));
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
  // Fishing gameplay state transitions are covered by core-regression.mjs.
  // This engine smoke already verifies the FishingRenderer render mode above.

  // Real framebuffer A/B runs after all existing gameplay checks so it cannot
  // perturb fishing/water timing. Old voxel visual and new paper visual use the
  // same authoritative TerrainWorld state.
  const paperOff=await page.evaluate(()=>window.Paperchalk3D.setPaperStyle(false));
  assert(paperOff===false,'paper style did not switch off');
  await page.waitForTimeout(1200);
  await page.screenshot({path:'artifacts/paper-phase1-before.png'});

  const paperOn=await page.evaluate(()=>window.Paperchalk3D.setPaperStyle(true));
  assert(paperOn===true,'paper style did not switch on');
  await page.waitForTimeout(1600);
  await page.screenshot({path:'artifacts/paper-phase1-after.png'});

  const tuned=await page.evaluate(()=>window.Paperchalk3D.configurePaperTerrain({
    fiberStrength:.055,microNormalStrength:.38,roughnessVariation:.04,printNoiseStrength:.07
  }));
  assert(tuned?.paperMaterial?.mode==='procedural-paper-pbr-v2','paper material tuning API failed '+JSON.stringify(tuned));
  await page.waitForTimeout(350);
  await page.evaluate(()=>window.Paperchalk3D.setCameraConfig({distance:9.5,height:.15,pitch:-8}));
  await page.waitForTimeout(250);
  await page.screenshot({path:'artifacts/paper-material-v3-reference-closeup.png'});

  const beforeBytes=fs.statSync('artifacts/paper-phase1-before.png').size;
  const afterBytes=fs.statSync('artifacts/paper-phase1-after.png').size;
  const materialBytes=fs.statSync('artifacts/paper-material-v3-reference-closeup.png').size;
  assert(beforeBytes>10000&&afterBytes>10000&&materialBytes>10000,'paper framebuffer screenshots missing');
  assert(beforeBytes!==afterBytes,'paper A/B screenshots are byte-identical');
  fs.writeFileSync('artifacts/paper-phase1-stats.json',JSON.stringify({beforeBytes,afterBytes,materialBytes,stats:initial.paperTerrain,tuned},null,2));
  assert(errors.length===0,'engine errors: '+errors.join(' | '));
  console.log('PAPER_TERRAIN_PHASE1_ENGINE_OK');
}finally{await browser.close()}
