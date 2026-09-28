const fs=require('fs');
function assert(c,m){if(!c)throw new Error(m)}
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),game=read('src/game.js'),engine=read('src/engine3d/World3DEngine.js'),content=read('src/content/game-content.js'),terrain=read('src/terrain/terrain-runtime.js'),mesher=read('src/terrain/voxel-block-mesh.js');

assert(html.includes('voxel3d-r35'),'build key missing');
assert(html.includes('id="hungerFill"')&&html.includes('id="fishingStatusHud"'),'survival HUD missing');
assert(content.includes("mode:'infinite-voxel-3d'"),'world mode missing');
assert(content.includes("'fishing-rod'"),'fishing rod item missing');
assert(content.includes("'paper-carp'")&&content.includes("'bluefin-minnow'")&&content.includes("'golden-paperfish'"),'fish items missing');

assert(terrain.includes('class TerrainWorld'),'TerrainWorld missing');
assert(mesher.includes('buildVoxelChunkGeometry'),'voxel mesher missing');
assert(terrain.includes('class WaterWorld'),'WaterWorld missing');
assert(terrain.includes("flowModel:'priority-flood-global-hydrostatic-settle-v1'"),'global hydrostatic solver missing');
assert(terrain.includes("flowPlane:'full-x-z-with-y-gravity'"),'full 3D water plane missing');
assert(terrain.includes('settleAll()'),'global water settle missing');
assert(terrain.includes('_heapPush'),'priority flood heap missing');
assert(terrain.includes('conserved:beforeLayers===afterLayers'),'water conservation check missing');
assert(terrain.includes('highestSurfaceY(gx,gz)'),'water surface query missing');
assert(terrain.includes('surfaceCache'),'water surface cache missing');

assert(game.includes('const hunger={current:HUNGER_MAX'),'hunger state missing');
assert(game.includes('HUNGER_DRAIN_PER_SECOND'),'hunger drain missing');
assert(game.includes("item.action==='eat'"),'fish eating missing');
assert(game.includes("state:'idle'")&&game.includes('castFishingRod')&&game.includes('reelFishingRod'),'fishing state machine missing');
assert(game.includes("fishing.state==='bite'"),'bite window missing');
assert(game.includes("window.PaperchalkFishing"),'fishing API missing');
assert(game.includes('terrain.water.needsSettle'),'idle water solver optimization missing');
assert(game.includes('save.hunger=hunger.current'),'hunger persistence missing');
assert(game.includes('CONTENT.items[\'fishing-rod\']'),'starter fishing rod missing');

assert(engine.includes('class FishingRenderer'),'fishing renderer missing');
assert(engine.includes("renderMode:'line+bobber+worldspace-bite-ui'"),'world-space bite UI missing');
assert(engine.includes('flatShading:true'),'flat shading missing');
assert(engine.includes("mobileQualityProfile"),'mobile quality profile missing');
assert(engine.includes("renderMode:'chunked-visible-surface-water-v3-3d'"),'3D water renderer missing');
assert(engine.includes('internalFacesCulled:true'),'water internal face culling missing');

console.log('WEB_INFINITE_VOXEL_3D_SMOKE_OK');
