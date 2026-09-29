const fs=require('fs');
function assert(c,m){if(!c)throw new Error(m)}
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),game=read('src/game.js'),engine=read('src/engine3d/World3DEngine.js'),content=read('src/content/game-content.js'),terrain=read('src/terrain/terrain-runtime.js'),water=read('src/terrain/water-runtime.js'),biome=read('src/terrain/biome-generator.js'),mesher=read('src/terrain/voxel-block-mesh.js'),paperEntity=read('src/entities/PaperSpriteEntity.js'),environment=read('src/engine3d/EnvironmentFX.js'),ocean=read('src/engine3d/OceanRenderer.js'),farTerrain=read('src/engine3d/FarTerrainRenderer.js');

assert(html.includes('world-core-r2'),'build key missing');
assert(html.includes('id="hungerFill"')&&html.includes('id="staminaFill"')&&html.includes('id="fishingStatusHud"'),'survival HUD missing');
assert(content.includes("mode:'infinite-voxel-3d'"),'world mode missing');
assert(!content.includes("'fishing-rod'")&&!content.includes("'paper-carp'"),'fishing/fish content should be absent during foundation phase');

assert(html.includes('src/terrain/biome-generator.js'),'biome generator script missing');
assert(content.includes("generator:'multi-noise-macro-landform-v2'"),'biome generator config missing');
assert(biome.includes('class BiomeLandformGenerator'),'BiomeLandformGenerator missing');
assert(biome.includes("MEADOW:'meadow'")&&biome.includes("ALPINE:'alpine'")&&biome.includes("MARSH:'marsh'"),'biome catalogue missing');
assert(biome.includes("MOUNTAIN:'mountain'")&&biome.includes("VALLEY:'river-valley'"),'landform catalogue missing');
assert(biome.includes('mountainMask')&&biome.includes('riverMask'),'mountain/river fields missing');
assert(biome.includes("domain-warp")&&biome.includes("plateau"),'macro terrain fields missing');
assert(terrain.includes('this.biomeGenerator=BiomeGenerator'),'terrain biome integration missing');
assert(terrain.includes('terrainProfile(gx,gz=0)'),'terrain biome profile missing');
assert(terrain.includes('surfaceTile(gx,gz=0)'),'biome surface material missing');
assert(terrain.includes('biomeSummaryForChunk(cx,cz)'),'biome chunk summary missing');
assert(terrain.includes('generatorVersion=5'),'terrain generator version missing');
assert(game.includes('window.PaperchalkBiomes'),'biome runtime API missing');
assert(game.includes('biome:environment.biome'),'biome snapshot missing');

assert(terrain.includes('class TerrainWorld'),'TerrainWorld missing');
assert(mesher.includes('buildVoxelChunkGeometry'),'voxel mesher missing');
assert(water.includes('class WaterWorld'),'WaterWorld missing');
assert(water.includes("flowModel:'connected-body-priority-flood-v5'"),'connected water solver missing');
assert(water.includes("flowPlane:'single-stage-depth-with-y-gravity'"),'full 3D water plane missing');
assert(water.includes('settleAll()'),'water settle missing');
assert(water.includes('_heapPush'),'priority flood heap missing');
assert(water.includes('afterLayers!==beforeLayers')&&water.includes('rollback:true'),'water conservation rollback missing');
assert(water.includes('highestSurfaceY(gx,gz)'),'water surface query missing');
assert(water.includes('surfaceCache'),'water surface cache missing');
assert(water.includes('boundsCache'),'water bounds cache missing');
assert(water.includes('columnBounds(gx,gz)'),'water column bounds query missing');

assert(game.includes('const hunger={current:HUNGER_MAX'),'hunger state missing');
assert(game.includes('HUNGER_DRAIN_PER_SECOND'),'hunger drain missing');
assert(game.includes('STAMINA_MAX=100'),'stamina state missing');
assert(game.includes('snapDownToGround(1.05)'),'voxel ground snap missing');
assert(game.includes('window.PaperchalkStamina'),'stamina API missing');
assert(game.includes('save.stamina=stamina.current'),'stamina persistence missing');
assert(game.includes("item.action==='eat'"),'fish eating missing');
assert(game.includes('window.PaperchalkFishEcology'),'fish ecology disabled API missing');
assert(game.includes('enabled:false,active:0'),'fish ecology must be disabled');
assert(game.includes('terrain.water.needsSettle'),'idle water solver optimization missing');
assert(game.includes('save.hunger=hunger.current'),'hunger persistence missing');
assert(game.includes('Fishing ecology/rod onboarding is paused'),'starter fishing disabled marker missing');

assert(!engine.includes('class FishSchoolRenderer')&&!engine.includes('class FishingRenderer'),'fish/fishing renderers should be removed');
assert(engine.includes('flatShading:true'),'flat shading missing');
assert(paperEntity.includes('MeshStandardMaterial'),'paper actors are not PBR lit');
assert(paperEntity.includes('castShadow=true'),'paper actor shadows missing');
assert(mesher.includes('vertexAO(side1,side2,corner)'),'voxel ambient occlusion missing');
assert(mesher.includes("ambientOcclusionMode:'0fps-style-vertex-ao'"),'voxel AO metadata missing');
assert(engine.includes('MeshStandardMaterial'),'PBR terrain material missing');
assert(engine.includes('roughnessMap:this.paperSurfaceTexture'),'paper roughness map missing');
assert(engine.includes('bumpMap:this.paperSurfaceTexture'),'paper bump map missing');
assert(engine.includes('THREE.ACESFilmicToneMapping'),'ACES tone mapping missing');
assert(engine.includes('THREE.PMREMGenerator'),'PMREM environment lighting missing');
assert(engine.includes("imageBasedLighting:'PMREM-studio-paper'"),'IBL stats missing');
assert(engine.includes("materialMode:'MeshStandardMaterial-paper-PBR'"),'terrain PBR stats missing');
assert(engine.includes("mobileQualityProfile"),'mobile quality profile missing');
assert(engine.includes("renderMode:'event-driven-greedy-water-v6'"),'3D water renderer missing');
assert(engine.includes('internalFacesCulled:true'),'water internal face culling missing');
assert(engine.includes('screenToWaterSurface'),'water click raycast missing');

assert(html.includes('src/terrain/water-runtime.js'),'dedicated water runtime missing');
assert(terrain.includes('analyticOcean:true'),'analytic ocean terrain API missing');
assert(ocean.includes('analytic-ocean-surface'),'analytic ocean renderer missing');
assert(farTerrain.includes('far-terrain-lod-ring'),'far terrain LOD missing');
assert(environment.includes('FogExp2')&&environment.includes('gpu-vertex-shader'),'weather atmosphere missing');
assert(biome.includes("DEEP_OCEAN:'deep-ocean'")&&biome.includes("CLIFF:'cliff'")&&biome.includes("SNOWFIELD:'snowfield'"),'macro landforms missing');
console.log('WEB_INFINITE_VOXEL_3D_SMOKE_OK');

assert(engine.includes("paperchalk-pbr-voxel-ao-v17-weather"),'PBR voxel AO shader cache key missing');
assert(engine.includes("vVoxelWorldNormal"),'whole voxel owner normal missing');
assert(engine.includes("vVoxelWorldPos-vVoxelWorldNormal*(uVoxelSize*0.01)"),'whole voxel tint ownership missing');
assert(water.includes('_packRemainderToBoundary'),'shoreline remainder packing missing');
assert(water.includes('_surfaceAuditFromStates'),'hydrostatic surface audit missing');
assert(engine.includes('greedyTopSurface:true'),'greedy water top surface missing');
assert(engine.includes('topMergeRatio'),'water top merge metric missing');
assert(game.includes('result.waterSettle=waterSettle'),'bucket immediate settle missing');
