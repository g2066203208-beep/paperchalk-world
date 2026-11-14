'use strict';
// Rule-level regression: actual five farmer cards, essence, building footprints,
// well bonus, tree/lumber resource tradeoff, scarecrow and bandit skills.
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx=vm.createContext({window:{},Math,Map,Set,Array,Object,Number,Error});
for(const file of ['engine/card-registry.js','data/card-packs.js',
 'engine/farmer-facilities.js','engine/bandit-roster.js',
 'engine/level-engine.js','levels/forest-02.js','engine/profession-decks.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../site/card-battle/',file),'utf8'),ctx,{filename:file});
}
const {PaperchalkFarmerFacilities:F,PaperchalkBanditRoster:B,
 PaperchalkLevelEngine:L,PaperchalkProfessionDecks:D}=ctx.window;
const owned=[
 {id:'woodcutter',profession:'warrior',characterId:'farmer-warrior-loli-lumberjack'},
 {id:'farmer',profession:'engineer',characterId:'farmer-engineer-farmer'}
];
const hand=D.create({ownedCharacters:owned,maxHand:10,seed:618231});
const w=hand.remainingCards('woodcutter'),a=hand.remainingCards('farmer');
assert.equal(new Set(w.map(x=>x.id)).size,5);
assert.equal(new Set(a.map(x=>x.id)).size,5);
assert.equal(w.filter(x=>x.id==='lumber').length,2);
assert.ok(a.every(x=>x.type==='facility'));
assert.equal(a.length,10);
for(let i=0;i<10;i++)assert.equal(hand.draw('farmer').ok,true);
assert.equal(hand.snapshot().count,10);
assert.equal(hand.draw('woodcutter').reason,'hand-full');
const selected=hand.snapshot().hand[0];
assert.equal(hand.play(selected.instance).ok,true);
assert.equal(hand.snapshot().count,9);
hand.nextTurn();
assert.equal(hand.snapshot().count,9,'do not automatically discard remaining cards');

const farm=F.create({maxEssence:5});
const place=(id,c,r,tiles=[{tileC:c,tileR:r}])=>
 farm.place(id,{tileC:c,tileR:r,flank:c<8?'left':'right'},tiles);
assert.ok(place('farm-field',1,3).ok);
assert.ok(place('water-well',2,3).ok);
const tree=place('plant-tree',3,3);
assert.ok(tree.ok);
assert.ok(place('scarecrow',10,5).ok);
const mill=place('windmill',11,3,[{tileC:11,tileR:3},{tileC:12,tileR:3},
 {tileC:11,tileR:4},{tileC:12,tileR:4}]);
assert.ok(mill.ok);
assert.equal(place('farm-field',1,3).reason,'occupied');
assert.equal(place('windmill',11,4).reason,'invalid-footprint');
assert.equal(place('windmill',13,3,[
 {tileC:13,tileR:3},{tileC:14,tileR:3},
 {tileC:13,tileR:4},{tileC:15,tileR:4}
]).reason,'invalid-footprint','correct number of cells is not enough');
const t1=farm.nextTurn();
assert.equal(t1.state.essence.life,1,'well doubles farm LIFE, mill converts one to MATERIAL');
assert.equal(t1.state.essence.material,1);
const blocked=farm.intercept(3,3);
assert.equal(blocked.cardId,'plant-tree');
assert.equal(blocked.blocked,2);
assert.equal(farm.intercept({tileC:14,tileR:3,damage:3}).blocked,0,
 'left-side tree cannot protect a far-away unit on the right');
assert.equal(farm.snapshot.facilities.find(x=>x.id===tree.facility.id).hp,3);
farm.nextTurn();
assert.equal(farm.snapshot.facilities.find(x=>x.id===tree.facility.id).hp,5,
 'well accelerates tree regeneration');
const fake=farm.intercept(5,7);
assert.equal(fake.cardId,'scarecrow');
assert.equal(fake.blocked,7);
assert.ok(fake.destroyed);
assert.equal(farm.snapshot.facilities.filter(x=>x.cardId==='scarecrow').length,0);
assert.equal(farm.grant('material',9),3,'shared essence capped at five');
assert.equal(farm.spend('material',4),true);
assert.equal(farm.snapshot.essence.material,1);
assert.equal(farm.steal(1),1,'bandit steals stored shared essence');
assert.equal(farm.snapshot.essence.material,0);

const terrain={cols:16,rows:6,center:(c,r)=>({x:c,z:r}),cell:()=>({height:0})};
const chapter=L.create('forest-02',terrain,{physicalColumns:[6,7,8]});
assert.equal(chapter.snapshot().units.filter(u=>u.side==='enemy').length,3);
assert.equal(chapter.getUnit('bandit-bruiser-a').enemyCardPool.length,5);
assert.equal(chapter.getUnit('bandit-crossbow-a').enemyCardPool.length,5);
assert.equal(chapter.getUnit('bandit-captain-a').enemyCardPool.length,5);
assert.equal(chapter.getUnit('bandit-crossbow-a').targetPolicy,'weakest');
assert.equal(chapter.deploy('woodcutter',1,0).ok,true);
assert.equal(chapter.deploy('farmer',1,2).ok,true);
assert.equal(chapter.targetForEnemy('bandit-crossbow-a').id,'farmer',
 'crossbow shoots the lower HP actor');
assert.equal(chapter.endTurn().ok,true);
const first=[];
while(chapter.snapshot().enemyQueue.length)first.push(chapter.resolveEnemyAction());
assert.equal(first.find(x=>x.unitId==='bandit-captain-a').kind,'raid');
assert.equal(chapter.beginPlayerTurn().ok,true);
assert.equal(chapter.endTurn().ok,true);
let rally=null;
while(chapter.snapshot().enemyQueue.length){
 const action=chapter.resolveEnemyAction();
 if(action.kind==='rally')rally=action;
}
assert.ok(rally,'captain turn 2 uses an actual squad-wide defensive skill');
assert.equal(rally.affected.length,3);
assert.ok(chapter.getUnit('bandit-crossbow-a').currentBlock>=2);
console.log('FARMER_FIVE_FACILITIES_AND_BANDIT_SKILLS_PASS');
