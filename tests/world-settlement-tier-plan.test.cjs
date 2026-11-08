'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const plan=JSON.parse(fs.readFileSync(
 path.join(root,'site/data/world-settlement-tier-plan.v1.json'),'utf8'));
const scope={window:{}};
for(const file of ['world-atlas.js','metro-graph.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'site/game',file),'utf8'),scope);
const atlas=scope.window.PaperWorldAtlas;
const metro=scope.window.PaperWorldMetro;

test('every existing municipality is graded exactly once without renaming or moving it',()=>{
 assert.equal(plan.status,'planning-proposal-only');
 assert.equal(plan.runtimeAuthoritative,false);
 assert.equal(plan.municipalities.length,10);
 assert.deepEqual(new Set(plan.municipalities.map(c=>c.id)),
  new Set(atlas.CITIES.map(c=>c.id)));
 for(const city of plan.municipalities){
  assert.equal(city.populationWan,atlas.CITY_BY_ID[city.id].pop);
  assert.ok(plan.settlementTiers[city.tier],city.id);
  assert.ok(city.metro.plannedLines>=city.metro.currentlyRegisteredLines);
  assert.ok(city.metro.plannedUniqueStations>=city.metro.currentlyRegisteredUniqueStations);
 }
});

test('initial city stays a large tier A; supercity is a genuinely separate future world region',()=>{
 const initial=plan.municipalities.find(c=>c.id==='kirihama');
 assert.equal(initial.tier,'A');
 assert.equal(initial.urbanType,'initial-large-city');
 assert.equal(initial.metro.plannedLines,10);
 assert.equal(initial.metro.plannedUniqueStations,170);
 assert.equal(metro.LINES.filter(l=>!l.locked).length,initial.metro.currentlyRegisteredLines);
 assert.equal(Object.values(metro.STATIONS).filter(s=>!s.locked).length,
  initial.metro.currentlyRegisteredUniqueStations);
 const future=plan.futureReservations.find(c=>c.tier==='S');
 assert.ok(future);
 assert.equal(future.status,'unmapped-do-not-render');
 assert.equal(future.regionId,'future-mega-region-01');
 assert.equal(future.worldCoordinates,null);
 assert.equal(atlas.CITY_BY_ID[future.id],undefined);
});

test('subway planning never invents metro for a village, town or rural municipality',()=>{
 const rows=plan.municipalities;
 for(const city of rows){
  if(['C','D','E'].includes(city.tier)||
     ['homori','minamioka'].includes(city.id)){
   assert.equal(city.metro.plannedLines,0,city.id);
   assert.equal(city.metro.plannedUniqueStations,0,city.id);
  }
 }
 const operational=rows.filter(c=>c.metro.plannedLines>0);
 assert.deepEqual(operational.map(c=>c.id),['kirihama','kirihara','shiomi']);
 assert.equal(operational.reduce((n,c)=>n+c.metro.plannedLines,0),14);
 assert.equal(operational.reduce((n,c)=>n+c.metro.plannedUniqueStations,0),235);
 assert.equal(plan.plannedSubwayTotalExistingArea.lines,14);
 assert.equal(plan.plannedSubwayTotalExistingArea.uniqueStations,235);
});
