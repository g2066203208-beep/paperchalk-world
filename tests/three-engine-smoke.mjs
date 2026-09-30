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
  await page.waitForFunction(()=>window.Paperchalk3D?.stats?.npcs?.count===5,{timeout:5000,polling:'raf'});
  await page.waitForFunction(()=>{const s=window.Paperchalk3D?.stats,p=s?.paperTerrain?.paperMaterial;return p?.grassReferenceLoaded===true&&p?.dirtReferenceLoaded===true&&s?.atmosphere?.paperSkyLoaded===true},{timeout:6000,polling:'raf'});

  const initial=await page.evaluate(()=>window.Paperchalk3D.stats);
  assert(initial.renderer==='WebGLRenderer','not WebGLRenderer');
  assert(initial.worldMode==='finite-side-scroll-voxel','wrong world mode');
  assert(initial.paperStyle?.enabled===false,'prologue road must use cube voxels '+JSON.stringify(initial.paperStyle));
  assert(initial.terrainMode==='finite-voxel-road','finite voxel road renderer mode missing '+JSON.stringify(initial));
  assert(initial.paperStage?.enabled===true&&initial.paperStage?.mode==='instanced-2d-multilayer-paper-school'&&initial.paperStage?.source==='python-generated-school-paper-atlas','96-card paper school missing '+JSON.stringify(initial.paperStage));
  assert(initial.paperStage?.cards===96&&initial.paperStage?.assetTypes===28&&initial.paperStage?.noCollision===true&&initial.paperStage?.real3DBuilding===false,'paper school card contract wrong '+JSON.stringify(initial.paperStage));
  assert(Array.isArray(initial.paperStage?.layers)&&initial.paperStage.layers.length===8&&initial.paperStage.layers.map(x=>x.count).join(',')==='6,8,10,12,28,16,10,6','paper school layer counts wrong '+JSON.stringify(initial.paperStage));
  await page.waitForFunction(()=>window.Paperchalk3D?.stats?.paperStage?.atlasReady===true,{timeout:6000,polling:'raf'});
  await page.screenshot({path:'artifacts/prologue-paper-layers.png'});
  assert(initial.voxelTerrain?.visibleChunks>0,'no visible voxel chunks '+JSON.stringify(initial.voxelTerrain));
  assert(initial.voxelTerrain?.blockGeometry==='3d-cube','road is not cube voxel geometry '+JSON.stringify(initial.voxelTerrain));
  assert(initial.voxelTerrain?.infinite===false&&initial.voxelTerrain?.finiteDepth===true,'voxel road is not finite '+JSON.stringify(initial.voxelTerrain));
  assert(initial.voxelTerrain?.gameplayDimensions===2&&initial.voxelTerrain?.zMovementLocked===true,'voxel road gameplay plane wrong '+JSON.stringify(initial.voxelTerrain));
  assert(initial.paperTerrain?.paperMaterial?.mode==='procedural-paper-pbr-v6-macro-relief-ao','PaperMaterial v3 missing '+JSON.stringify(initial.paperTerrain?.paperMaterial));
  assert(initial.paperTerrain?.paperMaterial?.textureResolution===256,'paper texture resolution wrong '+JSON.stringify(initial.paperTerrain?.paperMaterial));
  assert(initial.paperTerrain?.paperMaterial?.diffusePulpDominant===true,'paper pulp/albedo must dominate');
  assert(initial.paperTerrain?.paperMaterial?.weakMicroNormal===true,'paper micro normal must remain weak');
  assert(initial.paperTerrain?.paperMaterial?.physicalFibreSheen===true,'paper fibre sheen missing');
  assert(initial.paperTerrain?.paperMaterial?.correlatedNormalRoughness===true,'paper normal/roughness correlation missing');
  assert(initial.paperTerrain?.grassTopMaterialGroup===true,'dedicated grass material group missing '+JSON.stringify(initial.paperTerrain));
  assert(initial.paperTerrain?.dirtMaterialGroup===true,'dedicated dirt material group missing '+JSON.stringify(initial.paperTerrain));
  assert(initial.paperTerrain?.targetGroundStyle==='terraced-paper-stage-r1','target ground renderer missing '+JSON.stringify(initial.paperTerrain));
  assert(initial.paperTerrain?.continuousMergedEdges===true,'terrain sides are still cell-by-cell '+JSON.stringify(initial.paperTerrain));
  assert(initial.paperTerrain?.paperMaterial?.liftedCardboardShadow===true,'cardboard side shadow lift missing '+JSON.stringify(initial.paperTerrain?.paperMaterial));
  assert(initial.paperTerrain?.paperMaterial?.userGrassReference===true&&initial.paperTerrain?.paperMaterial?.grassReferenceLoaded===true,'supplied grass texture not loaded '+JSON.stringify(initial.paperTerrain?.paperMaterial));
  assert(initial.paperTerrain?.paperMaterial?.grassColorSource==='user-texture-only','grass still uses procedural tint '+JSON.stringify(initial.paperTerrain?.paperMaterial));
  assert(initial.paperTerrain?.paperMaterial?.userDirtReference===true&&initial.paperTerrain?.paperMaterial?.dirtReferenceLoaded===true,'supplied dirt texture not loaded '+JSON.stringify(initial.paperTerrain?.paperMaterial));
  assert(initial.paperTerrain?.paperMaterial?.dirtColorSource==='user-texture-only','dirt still uses procedural tint '+JSON.stringify(initial.paperTerrain?.paperMaterial));
  assert(initial.paperTerrain?.paperMaterial?.dirtTextureTransform==='native-world-uv-repeat-1x','dirt texture scaling regression '+JSON.stringify(initial.paperTerrain?.paperMaterial));
  assert(initial.paperTerrain?.paperMaterial?.grassTextureTransform==='native-world-uv-repeat-1x','grass texture scaling regression '+JSON.stringify(initial.paperTerrain?.paperMaterial));
  assert(initial.paperTerrain?.paperMaterial?.groundAnisotropy===8&&initial.paperTerrain?.paperMaterial?.authoredSurfaceMicroMaps===true&&initial.paperTerrain?.paperMaterial?.genericTopMicroMaps===true,'ground anti-shimmer sampling missing '+JSON.stringify(initial.paperTerrain?.paperMaterial));
  assert(initial.paperTerrain?.topUvScale===.06,'ground UV scale regression '+JSON.stringify(initial.paperTerrain));
  assert(initial.paperTerrain?.paperMaterial?.perFrameHeavyNoise===false,'paper material should be precomputed, not heavy per-frame noise');
  assert(initial.paperEntities===6&&initial.npcActors===5&&initial.legacyStagePlaceholders===0,'paper actor counts wrong '+JSON.stringify({paperEntities:initial.paperEntities,npcActors:initial.npcActors,legacyStagePlaceholders:initial.legacyStagePlaceholders}));
  assert(initial.npcs?.count===5&&initial.npcs?.sharedEntityClassWithPlayer===true,'NPC PaperSpriteEntity renderer missing '+JSON.stringify(initial.npcs));
  assert(initial.npcs?.sharedPlayerTexture===true&&initial.npcs?.actorAsset==='assets/player/protagonist.webp','NPC is not using player character asset '+JSON.stringify(initial.npcs));
  const npcAI=await page.evaluate(()=>window.PaperchalkNPCs.stats);
  assert(npcAI?.aiStack?.voxelAStar&&npcAI?.aiStack?.utility&&npcAI?.aiStack?.offscreenLOD&&npcAI?.simulationHz===20,'NPC AI renderer/runtime bridge/performance throttle missing '+JSON.stringify(npcAI));
  assert(initial.atmosphere?.technique==='shadowmap-worldspace-heightfog-mie-raymarch','world-space atmosphere missing '+JSON.stringify(initial.atmosphere));
  assert(initial.atmosphere?.volumetric===false&&initial.atmosphere?.samples===6,'prologue atmosphere performance profile missing '+JSON.stringify(initial.atmosphere));
  assert(initial.atmosphere?.shadowMapOcclusion===true&&initial.atmosphere?.dynamicSky===true,'shadow-map volumetric lighting missing '+JSON.stringify(initial.atmosphere));
  assert(initial.atmosphere?.paperSky===true&&initial.atmosphere?.paperSkyLoaded===true,'supplied blue paper sky not loaded '+JSON.stringify(initial.atmosphere));
  assert(initial.atmosphere?.paperSkyAsset==='assets/materials/sky-paper-blue.webp'&&initial.atmosphere?.skyClouds===false,'paper sky asset/cloud gate wrong '+JSON.stringify(initial.atmosphere));
  assert(initial.atmosphere?.paperSkyStrength===.58,'paper sky texture is too weak '+JSON.stringify(initial.atmosphere));
  assert(initial.atmosphere?.jitteredRaymarch===true&&initial.atmosphere?.minecraftShaderInspired===true,'Minecraft-style volumetric integration missing '+JSON.stringify(initial.atmosphere));
  assert((initial.atmosphere?.mieAnisotropy||0)>.6,'Mie forward scattering missing '+JSON.stringify(initial.atmosphere));
  assert(initial.atmosphere?.buffer?.[0]>0&&initial.atmosphere?.buffer?.[1]>0,'atmosphere render target missing '+JSON.stringify(initial.atmosphere));
  assert(initial.atmosphere?.fogDensity>0,'distance air/fog missing '+JSON.stringify(initial.atmosphere));
  assert(initial.playerTextureSize?.width===768&&initial.playerTextureSize?.height===1536,'HD player texture missing');
  assert(initial.interaction?.threeDimensional===false&&initial.interaction?.zMovementLocked===true,'side-scroll interaction did not lock Z '+JSON.stringify(initial.interaction));
  assert(initial.pixelRatio>=1&&initial.pixelRatio<=1.35,'prologue DPR cap missing '+JSON.stringify(initial.pixelRatio));
  assert(initial.lighting?.shadowAcneGuard===true&&(initial.lighting?.sunShadowNormalBias||0)>=.05,'ground shadow-acne protection missing '+JSON.stringify(initial.lighting));
  assert(!Object.prototype.hasOwnProperty.call(initial,'photon'),'removed renderer stack leaked into stats');
  assert(initial.camera.stageView?.enabled===false,'side-scroll camera stage view should start disabled '+JSON.stringify(initial.camera));
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
  assert(Math.abs(after-before)>.1,'camera orbit adjustment did not respond '+JSON.stringify({before,after}));
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
  assert(tuned?.paperMaterial?.mode==='procedural-paper-pbr-v6-macro-relief-ao','paper material tuning API failed '+JSON.stringify(tuned));
  await page.waitForTimeout(350);
  await page.evaluate(()=>window.Paperchalk3D.setCameraConfig({distance:9.5,height:.15,pitch:-0.14}));
  await page.waitForTimeout(250);
  await page.screenshot({path:'artifacts/paper-material-v3-reference-closeup.png'});
  await page.evaluate(()=>window.PaperchalkTimeDebug.set(900));
  await page.waitForTimeout(240);
  await page.screenshot({path:'artifacts/paper-sky-ground-antialias.png'});

  const timeSet=await page.evaluate(()=>window.PaperchalkTimeDebug.set(390));
  assert(timeSet?.clock==='06:30','visual debug time control failed '+JSON.stringify(timeSet));
  const duskSet=await page.evaluate(()=>window.PaperchalkTimeDebug.set(1136));
  assert(duskSet?.clock==='18:56','18:56 time preset API failed '+JSON.stringify(duskSet));
  await page.waitForTimeout(180);
  await page.evaluate(()=>window.PaperchalkTimeDebug.set(390));
  await page.evaluate(()=>window.Paperchalk3D.setCameraConfig({orbitYaw:-2.05,pitch:-.17,distance:12,height:.45}));
  await page.waitForTimeout(2200);
  const atmosphereOff=await page.evaluate(()=>window.Paperchalk3D.configureAtmosphere({volumetric:false,intensity:.32,anisotropy:.72,fogDensity:.0026}));
  assert(atmosphereOff?.volumetric===false,'volumetric atmosphere did not disable '+JSON.stringify(atmosphereOff));
  await page.waitForTimeout(220);
  await page.screenshot({path:'artifacts/atmosphere-volumetric-off.png'});
  const atmosphereOn=await page.evaluate(()=>window.Paperchalk3D.configureAtmosphere({volumetric:true,intensity:.32,anisotropy:.72,fogDensity:.0026}));
  assert(atmosphereOn?.volumetric===true,'volumetric atmosphere did not enable '+JSON.stringify(atmosphereOn));
  await page.waitForFunction(()=>window.Paperchalk3D.stats.atmosphere?.visibleLastFrame===true,{timeout:3500,polling:'raf'});
  const liveAtmosphere=await page.evaluate(()=>({...window.Paperchalk3D.stats.atmosphere}));
  assert((liveAtmosphere?.currentStrength||0)>.01&&(liveAtmosphere?.renders||0)>0,'world-space volumetric pass did not render '+JSON.stringify(liveAtmosphere));
  await page.screenshot({path:'artifacts/atmosphere-volumetric-on.png'});

  const beforeBytes=fs.statSync('artifacts/paper-phase1-before.png').size;
  const afterBytes=fs.statSync('artifacts/paper-phase1-after.png').size;
  const materialBytes=fs.statSync('artifacts/paper-material-v3-reference-closeup.png').size;
  const skyGroundBytes=fs.statSync('artifacts/paper-sky-ground-antialias.png').size;
  const raysOffBytes=fs.statSync('artifacts/atmosphere-volumetric-off.png').size;
  const raysOnBytes=fs.statSync('artifacts/atmosphere-volumetric-on.png').size;
  assert(beforeBytes>10000&&afterBytes>10000&&materialBytes>10000&&skyGroundBytes>10000&&raysOffBytes>10000&&raysOnBytes>10000,'paper/atmosphere framebuffer screenshots missing');
  assert(beforeBytes!==afterBytes,'paper A/B screenshots are byte-identical');
  assert(raysOffBytes!==raysOnBytes,'volumetric on/off framebuffers are byte-identical');
  fs.writeFileSync('artifacts/paper-phase1-stats.json',JSON.stringify({beforeBytes,afterBytes,materialBytes,raysOffBytes,raysOnBytes,stats:initial.paperTerrain,atmosphere:liveAtmosphere,tuned},null,2));
  assert(errors.length===0,'engine errors: '+errors.join(' | '));
  console.log('PAPER_TERRAIN_PHASE1_ENGINE_OK');
}finally{await browser.close()}
