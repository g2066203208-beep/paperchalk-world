const fs=require('fs');
function assert(c,m){if(!c)throw new Error(m)}
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),game=read('src/game.js'),engine=read('src/engine3d/World3DEngine.js'),content=read('src/content/game-content.js'),terrain=read('src/terrain/terrain-runtime.js'),biome=read('src/terrain/biome-generator.js'),mesher=read('src/terrain/voxel-block-mesh.js');

assert(html.includes('voxel3d-r42'),'build key missing');
assert(html.includes('id="hungerFill"')&&html.includes('id="fishingStatusHud"'),'survival HUD missing');
assert(content.includes("mode:'infinite-voxel-3d'"),'world mode missing');
assert(content.includes("'fishing-rod'"),'fishing rod item missing');
assert(content.includes("'paper-carp'")&&content.includes("'bluefin-minnow'")&&content.includes("'golden-paperfish'"),'fish items missing');

assert(html.includes('src/terrain/biome-generator.js'),'biome generator script missing');
assert(content.includes("generator:'multi-noise-landform-v1'"),'biome generator config missing');
assert(biome.includes('class BiomeLandformGenerator'),'BiomeLandformGenerator missing');
assert(biome.includes("MEADOW:'meadow'")&&biome.includes("ALPINE:'alpine'")&&biome.includes("MARSH:'marsh'"),'biome catalogue missing');
assert(biome.includes("MOUNTAIN:'mountain'")&&biome.includes("VALLEY:'river-valley'"),'landform catalogue missing');
assert(biome.includes('mountainMask')&&biome.includes('riverMask'),'mountain/river fields missing');
assert(biome.includes("fields:['continentalness','erosion','ridge','temperature','moisture','river','detail']"),'multi-noise fields missing');
assert(terrain.includes('this.biomeGenerator=BiomeGenerator'),'terrain biome integration missing');
assert(terrain.includes('terrainProfile(gx,gz=0)'),'terrain biome profile missing');
assert(terrain.includes('surfaceTile(gx,gz=0)'),'biome surface material missing');
assert(terrain.includes('biomeSummaryForChunk(cx,cz)'),'biome chunk summary missing');
assert(terrain.includes('generatorVersion=4'),'legacy terrain generator compatibility missing');
assert(game.includes('window.PaperchalkBiomes'),'biome runtime API missing');
assert(game.includes('biome:environment.biome'),'biome snapshot missing');

assert(terrain.includes('class TerrainWorld'),'TerrainWorld missing');
assert(mesher.includes('buildVoxelChunkGeometry'),'voxel mesher missing');
assert(terrain.includes('class WaterWorld'),'WaterWorld missing');
assert(terrain.includes("flowModel:'priority-flood-shared-volume-hydrostatic-v3-visible-flow'"),'global hydrostatic solver missing');
assert(terrain.includes("flowPlane:'full-x-z-with-y-gravity'"),'full 3D water plane missing');
assert(terrain.includes('settleAll()'),'global water settle missing');
assert(terrain.includes('_heapPush'),'priority flood heap missing');
assert(terrain.includes('afterLayers!==beforeLayers')&&terrain.includes('rollback:true'),'water conservation rollback missing');
assert(terrain.includes('highestSurfaceY(gx,gz)'),'water surface query missing');
assert(terrain.includes('surfaceCache'),'water surface cache missing');
assert(terrain.includes('boundsCache'),'water bounds cache missing');
assert(terrain.includes('columnBounds(gx,gz)'),'water column bounds query missing');

assert(game.includes('const hunger={current:HUNGER_MAX'),'hunger state missing');
assert(game.includes('HUNGER_DRAIN_PER_SECOND'),'hunger drain missing');
assert(game.includes("item.action==='eat'"),'fish eating missing');
assert(game.includes("state:'idle'")&&game.includes('castFishingRod')&&game.includes('reelFishingRod'),'fishing state machine missing');
assert(game.includes("fishing.state==='bite'"),'bite window missing');
assert(game.includes("window.PaperchalkFishing"),'fishing API missing');
assert(game.includes('window.PaperchalkFishEcology'),'fish ecology API missing');
assert(game.includes('updateFishEcology(dt)'),'fish ecology simulation missing');
assert(game.includes('rebuildFishSpatial()'),'fish spatial hash missing');
assert(game.includes('acquireFishForBobber()'),'fish-to-bobber targeting missing');
assert(game.includes('FISH_MAX_ACTIVE=24'),'fish active cap missing');
assert(game.includes("best.state='approach'")||game.includes("fish.state='approach'"),'fish approach state missing');
assert(game.includes("fish.state='nibbling'"),'fish bite approach missing');
assert(game.includes('terrain.water.needsSettle'),'idle water solver optimization missing');
assert(game.includes('save.hunger=hunger.current'),'hunger persistence missing');
assert(game.includes('CONTENT.items[\'fishing-rod\']'),'starter fishing rod missing');

assert(engine.includes('class FishingRenderer'),'fishing renderer missing');
assert(engine.includes('class FishSchoolRenderer'),'fish school renderer missing');
assert(engine.includes('InstancedMesh'),'instanced fish rendering missing');
assert(engine.includes("renderMode:'pooled-instanced-paper-fish'"),'pooled fish render mode missing');
assert(engine.includes("renderMode:'line+bobber+worldspace-bite-ui-v2'"),'world-space bite UI missing');
assert(engine.includes('flatShading:true'),'flat shading missing');
assert(engine.includes("mobileQualityProfile"),'mobile quality profile missing');
assert(engine.includes("renderMode:'chunked-visible-surface-water-v5-wavefront'"),'3D water renderer missing');
assert(engine.includes('internalFacesCulled:true'),'water internal face culling missing');
assert(engine.includes('screenToWaterSurface'),'water click raycast missing');

console.log('WEB_INFINITE_VOXEL_3D_SMOKE_OK');

assert(engine.includes("paperchalk-whole-voxel-color-v15"),'whole voxel tint cache key missing');
assert(engine.includes("vVoxelWorldNormal"),'whole voxel owner normal missing');
assert(engine.includes("vVoxelWorldPos-vVoxelWorldNormal*(uVoxelSize*0.01)"),'whole voxel tint ownership missing');
assert(game.includes("fishing.state='landed'"),'land cast fishing state missing');
assert(game.includes("waterTarget||(terrainTarget?"),'cast-anywhere terrain fallback missing');
assert(terrain.includes("sources:sources.slice(0,24)"),'water wavefront source tracking missing');
