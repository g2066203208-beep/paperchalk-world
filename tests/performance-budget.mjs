import fs from 'node:fs';
function assert(c,m){if(!c)throw new Error(m)}
const size=p=>fs.statSync(p).size;
assert(size('src/game.js')<83000,'gameplay runtime exceeds 83KB budget');
assert(size('src/core/open-world-runtime.js')<2500,'open-world helper exceeds 2.5KB budget');
assert(size('src/scenes/prologue-city.js')<7000,'prologue city scene exceeds 7KB budget');
assert(size('src/scenes/PrologueSchoolFence.js')<5000,'school fence renderer exceeds 5KB budget');
assert(fs.existsSync('assets/prologue/school-fence-panel.svg'),'school fence texture missing');
assert(fs.existsSync('assets/prologue/school-gate-leaf.svg'),'school gate texture missing');
assert(!fs.existsSync('src/scenes/school-layout.js'),'rejected school layout must stay removed');
assert(!fs.existsSync('src/scenes/PrologueSchoolBuilding.js'),'rejected school building renderer must stay removed');
for(const asset of ['school-wall-paper.svg','school-window.svg','school-door.svg','school-sign.svg'])assert(!fs.existsSync('assets/prologue/'+asset),'rejected school building asset returned '+asset);
assert(size('src/engine3d/World3DEngine.js')<56000,'paper-stage engine exceeds 56KB budget');
assert(size('src/terrain/terrain-runtime.js')<30000,'terrain+water runtime exceeds 30KB budget');
assert(size('src/terrain/voxel-block-mesh.js')<24000,'cube mesher exceeds 24KB budget');
assert(size('src/engine3d/PaperTerrainRenderer.js')<20000,'paper terrain renderer exceeds 20KB budget');
assert(size('src/engine3d/PaperMaterial.js')<16000,'paper material runtime exceeds 16KB budget');
assert(size('src/engine3d/AtmospherePass.js')<19000,'world-space atmosphere pass exceeds 19KB budget');
assert(size('src/debug/world-debug.js')<5000,'world debug controls exceed 5KB budget');
assert(size('src/entities/PaperSpriteEntity.js')<16000,'paper entity runtime exceeds 16KB budget');
assert(size('src/entities/npc-runtime.js')<12000,'NPC gameplay runtime exceeds 12KB budget');
assert(size('src/entities/NPCActorRenderer.js')<8000,'NPC actor renderer exceeds 8KB budget');
assert(!fs.existsSync('src/prologue/PrologueSchoolScene.js'),'obsolete 3D school model must stay removed');
assert(size('src/ai/npc-navigation.js')<9000,'NPC navigation exceeds 9KB budget');
assert(size('src/ai/npc-brain.js')<13000,'NPC brain exceeds 13KB budget');
assert(size('src/ai/npc-dialogue.js')<7000,'NPC dialogue/quest runtime exceeds 7KB budget');
assert(size('vendor/fastnoise-lite/FastNoiseLite.js')<125000,'FastNoiseLite vendor exceeds 125KB budget');
assert(size('styles/game.css')<30000,'UI stylesheet exceeds 30KB budget');
assert(size('index.html')<19000,'HTML shell exceeds 19KB budget');
assert(fs.existsSync('assets/materials/grass-reference.webp'),'supplied grass texture missing');
assert(size('assets/materials/grass-reference.webp')<30000,'grass texture exceeds 30KB budget');
assert(fs.existsSync('assets/materials/dirt-reference.webp'),'supplied dirt texture missing');
assert(size('assets/materials/dirt-reference.webp')<30000,'dirt texture exceeds 30KB budget');
assert(fs.existsSync('assets/materials/sky-paper-blue.webp'),'supplied blue paper sky missing');
assert(size('assets/materials/sky-paper-blue.webp')<15000,'blue paper sky exceeds 15KB budget');
assert(!fs.existsSync('src/engine3d/PhotonPipeline.js'),'Photon pipeline must stay removed');
assert(!fs.existsSync('src/engine3d/PhotonSkyWeatherPass.js'),'Photon weather/cloud pass must stay removed');
assert(!fs.existsSync('src/engine3d/PhotonWaterPass.js'),'Photon water pass must stay removed');
assert(!fs.existsSync('src/engine3d/PhotonVoxelLightVolume.js'),'Photon voxel-light pass must stay removed');
assert(!fs.existsSync('src/engine3d/PhotonSpecularSSRPass.js'),'Photon SSR pass must stay removed');
assert(fs.existsSync('assets/player/protagonist.webp'),'authored protagonist paper asset missing');
assert(size('assets/player/protagonist.webp')<100000,'protagonist paper asset exceeds 100KB budget');
assert(!fs.existsSync('vendor/pixi'),'Pixi vendor tree should remain removed');
console.log(JSON.stringify({
  ok:true,
  game:size('src/game.js'),
  openWorld:size('src/core/open-world-runtime.js'),
  prologueScene:size('src/scenes/prologue-city.js'),
  schoolFence:size('src/scenes/PrologueSchoolFence.js'),
  fenceTexture:size('assets/prologue/school-fence-panel.svg'),
  gateTexture:size('assets/prologue/school-gate-leaf.svg'),
  engine:size('src/engine3d/World3DEngine.js'),
  terrain:size('src/terrain/terrain-runtime.js'),
  cubeMesher:size('src/terrain/voxel-block-mesh.js'),
  paperTerrain:size('src/engine3d/PaperTerrainRenderer.js'),
  paperMaterial:size('src/engine3d/PaperMaterial.js'),
  atmosphere:size('src/engine3d/AtmospherePass.js'),
  worldDebug:size('src/debug/world-debug.js'),
  grassReference:size('assets/materials/grass-reference.webp'),
  dirtReference:size('assets/materials/dirt-reference.webp'),
  skyPaper:size('assets/materials/sky-paper-blue.webp'),
  sprites:size('src/entities/PaperSpriteEntity.js'),
  npcRuntime:size('src/entities/npc-runtime.js'),
  npcRenderer:size('src/entities/NPCActorRenderer.js'),
  npcNavigation:size('src/ai/npc-navigation.js'),
  npcBrain:size('src/ai/npc-brain.js'),
  npcDialogue:size('src/ai/npc-dialogue.js'),
  fastNoise:size('vendor/fastnoise-lite/FastNoiseLite.js'),
  css:size('styles/game.css'),
  html:size('index.html'),
  protagonist:size('assets/player/protagonist.webp')
}));
