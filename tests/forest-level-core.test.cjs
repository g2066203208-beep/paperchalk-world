'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx=vm.createContext({window:{},console,Math,Map,Set,Array,Object,Number,Error});
function load(file){
 const code=fs.readFileSync(path.join(__dirname,'../site/card-battle/',file),'utf8');
 vm.runInContext(code,ctx,{filename:file});
}
load('engine/voxel-terrain.js');
load('engine/level-engine.js');
load('levels/forest-01.js');
load('levels/forest-02.js');
load('engine/voxel-animations.js');
const {PaperchalkVoxelTerrain:T,PaperchalkLevelEngine:L,PaperchalkVoxelAnimations:A}=ctx.window;
assert.deepEqual([...L.list()],['forest-01','forest-02']);
const terrain=T.create({cols:3,rows:6,tileW:2.65,tileD:2.65,levelStep:2.65,minLevel:-3,maxLevel:3});
const level=L.create('forest-01',terrain),fx=A.create(terrain);
assert.equal(terrain.cols*terrain.rows,18);
const units=level.snapshot().units;
assert.equal(units.length,3);
assert.equal(units.filter(x=>x.side==='ally').length,1);
assert.equal(units.filter(x=>x.side==='enemy').length,2);
assert.equal(level.getSlot('ally',1,1).r,1);
assert.equal(level.getSlot('ally',1,1).tileR,4);
assert.equal(level.getSlot('enemy',1,0).tileR,1);
assert.equal(level.snapshot().phase,'deployment');
assert.equal(level.getUnit('woodcutter').deployed,false);
assert.equal(level.occupancy(1,4),false);
assert.equal(level.actAttack('woodcutter','forest-foe-a').reason,'not-player-turn');
assert.equal(level.deploy('woodcutter',-1,1).reason,'outside-ally-grid');
assert.equal(level.deploy('woodcutter',1,1).ok,true);
assert.equal(level.snapshot().phase,'active');
assert.equal(level.getUnit('woodcutter').deployed,true);
assert.equal(level.occupancy(1,4),true);
assert.equal(level.occupancy(0,1),true);
assert.equal(level.canModify(1,4,1),false);
assert.equal(level.canModify(1,0,1),true);
assert.equal(fx.adjust(1,0,1),true);
assert.equal(terrain.cell(1,0).level,1);
assert.ok(fx.particles.length>=20);
const start=fx.height(1,0);
assert.equal(start,terrain.topY);
fx.update(.25);
const mid=fx.height(1,0);
assert.ok(mid>start&&mid<terrain.cell(1,0).height,'visual cubic transition is continuous');
assert.equal(fx.isBusy(1,0),true);
for(let i=0;i<30;i++)fx.update(.05);
assert.equal(fx.isBusy(1,0),false);
assert.equal(fx.height(1,0),terrain.cell(1,0).height);
assert.equal(fx.adjust(1,0,-1),true);
fx.reset();assert.equal(fx.snapshot().busy,0);assert.equal(fx.snapshot().particleCount,0);
// Player attacks never implicitly trigger an enemy volley or advance turns.
assert.equal(level.actAttack('woodcutter','forest-foe-a').ok,true);
assert.equal(level.getUnit('forest-foe-a').currentHp,1);
assert.equal(level.getUnit('woodcutter').currentHp,12);
assert.equal(level.turn,1);
assert.equal(level.endTurn().ok,true);
assert.equal(level.snapshot().phase,'enemy');
assert.equal(level.actAttack('woodcutter','forest-foe-a').ok,false);
assert.equal(level.beginPlayerTurn().ok,false,'pending enemies must act before next round');
assert.deepEqual([...level.snapshot().enemyQueue],['forest-foe-a','forest-foe-b']);
assert.equal(level.resolveEnemyAction('forest-foe-b').reason,'wrong-action-order');
const enemyA=level.resolveEnemyAction('forest-foe-a');
assert.equal(enemyA.damage,1);
assert.equal(level.getUnit('woodcutter').currentHp,11);
assert.equal(level.resolveEnemyAction('forest-foe-b').damage,1);
assert.equal(level.getUnit('woodcutter').currentHp,10);
assert.equal(level.beginPlayerTurn().ok,true);
assert.equal(level.turn,2);
assert.equal(level.snapshot().phase,'active');
assert.equal(level.enemyIntents().find(x=>x.unitId==='forest-foe-b').kind,'guard',
 'enemy B telegraphs a defensive move every third round offset');
assert.equal(level.actAttack('woodcutter','forest-foe-a').ok,true);
assert.equal(level.getUnit('forest-foe-a').alive,false);
assert.equal(level.actAttack('woodcutter','forest-foe-b',{power:3,block:2}).ok,true);
assert.equal(level.getUnit('woodcutter').currentBlock,2);
assert.equal(level.getUnit('forest-foe-b').currentHp,1);
assert.equal(level.actAttack('woodcutter','forest-foe-b').phase,'victory');
assert.equal(level.snapshot().phase,'victory');
assert.equal(level.actAttack('woodcutter','forest-foe-b').ok,false);
// A full no-action battle must eventually end in defeat, not run forever.
level.reset();level.deploy('woodcutter',1,1);
let enemyRounds=0;
while(level.phase==='active'&&enemyRounds<20){
 const result=level.endTurn();assert.equal(result.ok,true);
 while(level.snapshot().enemyQueue.length)level.resolveEnemyAction();
 if(level.phase==='enemy')assert.equal(level.beginPlayerTurn().ok,true);
 enemyRounds++;
}
assert.equal(level.phase,'defeat','enemy attacks must reach a terminal outcome');
assert.equal(level.getUnit('woodcutter').alive,false);
assert.ok(enemyRounds>=5&&enemyRounds<20);
level.reset();assert.equal(level.snapshot().turn,1);
assert.equal(level.snapshot().phase,'deployment');
assert.equal(level.getUnit('woodcutter').deployed,false);

// Original full 16x6 terrain is restored in the actual forest-level WebGL game.
// Only the center three columns accept characters, with 4+4 facility columns.
const full=T.create({cols:16,rows:6,tileW:2.65,tileD:2.65,levelStep:2.65,minLevel:-3,maxLevel:3});
const fullLevel=L.create('forest-01',full,{physicalColumns:[6,7,8]});
assert.equal(full.snapshot().length,96);
assert.equal(fullLevel.snapshot().columns,3,'combat stays 3x3 per side');
assert.equal(fullLevel.getSlot('ally',1,0).tileC,6);
assert.equal(fullLevel.getSlot('enemy',1,1).tileC,7);
assert.equal(fullLevel.getSlot('enemy',1,2).tileC,8);
assert.equal(fullLevel.occupancy(6,1),true,'enemy occupies physical terrain column six');
assert.equal(fullLevel.occupancy(0,1),false,'empty outer column is not enemy occupied');
assert.equal(fullLevel.deploy('woodcutter',0,1).ok,true);
assert.equal(fullLevel.occupancy(7,3),true,'ally now occupies center physical terrain');
assert.equal(fullLevel.canModify(7,3,1),false,'do not dig occupied battlefield tile');
assert.equal(fullLevel.canModify(2,3,1),true,'facility and outer terrain remain editable');
assert.equal(fullLevel.getSlot('ally',0,1).tileR,3);

// A reusable level's enemy intent must be driven by its data, not the enemy ID.
// No suffix like "-b" and no forest-specific logic in level-engine.
L.register({id:'generic-intent-regression',columns:3,rowsPerSide:3,
 title:'Data driven intent regression',units:[
  {id:'player',side:'ally',r:1,c:1,hp:9,attack:2},
  {id:'unrelated-monster',side:'enemy',r:0,c:0,hp:5,attack:1,
   intentCycle:[{kind:'guard',block:3},{kind:'attack',damage:2}]}
 ]});
const custom=L.create('generic-intent-regression',terrain);
assert.equal(custom.snapshot().phase,'active');
assert.equal(custom.enemyIntents()[0].kind,'guard');
assert.equal(custom.endTurn().ok,true);
assert.equal(custom.resolveEnemyAction('unrelated-monster').kind,'guard');
assert.equal(custom.beginPlayerTurn().turn,2);
assert.equal(custom.enemyIntents()[0].kind,'attack');
assert.equal(custom.getUnit('unrelated-monster').currentBlock,3,
 'guard lasts through the next player turn');
assert.equal(custom.actAttack('player','unrelated-monster',{power:2}).blocked,2);
assert.equal(custom.getUnit('unrelated-monster').currentHp,5);
assert.equal(custom.endTurn().ok,true);
assert.equal(custom.resolveEnemyAction('unrelated-monster').damage,2);
assert.equal(custom.getUnit('player').currentHp,7);

// Level 2 shares ALL core rules and physical 16x6 terrain, but adds the
// already approved farmer Anima character as a real second staged ally.
const chapter2=L.create('forest-02',full,{physicalColumns:[6,7,8]});
assert.equal(chapter2.snapshot().units.filter(u=>u.side==='ally').length,2);
assert.equal(chapter2.snapshot().units.filter(u=>u.side==='enemy').length,3);
assert.deepEqual(chapter2.snapshot().units.filter(u=>u.side==='ally').map(u=>u.id),['woodcutter','farmer']);
const farmer=chapter2.getUnit('farmer');
assert.equal(farmer.role,'engineer');
assert.equal(farmer.name,'农夫');
assert.equal(farmer.characterId,'farmer-engineer-farmer');
assert.equal(farmer.deployed,false);
assert.equal(chapter2.deploy('woodcutter',1,0).ok,true);
assert.equal(chapter2.phase,'deployment','farm woman still needs placement');
assert.equal(chapter2.deploy('farmer',1,2).ok,true);
assert.equal(chapter2.phase,'active');
assert.equal(chapter2.getUnit('farmer').deployed,true);
assert.equal(chapter2.occupancy(8,4),true);
const farmerHit=chapter2.actAttack('farmer','forest-foe-a',{power:2});
assert.equal(farmerHit.ok,true,'farmer is a real combat actor, not decorative art');
assert.equal(chapter2.getUnit('forest-foe-a').currentHp,4);
assert.equal(chapter2.endTurn().ok,true);
while(chapter2.snapshot().enemyQueue.length)chapter2.resolveEnemyAction();
assert.equal(chapter2.beginPlayerTurn().ok,true);
assert.equal(chapter2.turn,2);
console.log('FOREST_LEVEL_CORE_OK 18_logic_and_96_full_terrain_cells level2_farmer_engineer 2vs3 data_driven_enemy_intents');
