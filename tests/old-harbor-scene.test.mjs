import test from 'node:test';
import assert from 'node:assert/strict';
import {
 isOldHarborCell,oldHarborBuildings,OLD_HARBOR_WALKERS,paintOldHarborPlaza
} from '../site/scenes/pixel/old-harbor-plaza.js';
import {streetBuildingsAt,findStreetPath,canStandAt,interiorFor} from '../site/world/walkable-street.js';

test('opening plaza is an authored district, not a copy of the 6x4 procedural grid',()=>{
 assert.equal(isOldHarborCell(125,112),true);
 assert.equal(isOldHarborCell(126,112),false);
 const a=streetBuildingsAt(125,112),b=oldHarborBuildings();
 assert.deepEqual(a,b);
 assert.equal(a.length,11);
 assert.equal(new Set(a.map(p=>p.name)).size,a.length,'each visible building needs a real name');
 assert.equal(new Set(a.map(p=>p.id)).size,a.length);
 assert.ok(a.some(p=>p.style==='clock'));
 assert.ok(a.some(p=>p.name==='旧港报社'));
 assert.ok(new Set(a.map(p=>p.y)).size>4,'the authored road must not be a four-row grid');
 assert.ok(a.every(p=>p.curated));
 assert.ok(streetBuildingsAt(126,112).length>=10,'other country cells still use fallback');
});
test('every bespoke entrance remains attached to a real, independently entered interior',()=>{
 const b=streetBuildingsAt(125,112),origin={x:124,y:100};
 assert.equal(canStandAt(origin.x,origin.y,b),true);
 assert.equal(canStandAt(10,290,b),false,'canal is not a walkable street');
 assert.equal(canStandAt(581,314,b),false,'fountain cannot be walked through');
 for(const building of b){
  assert.ok(canStandAt(building.doorX,building.doorY,b),'blocked door: '+building.id);
  const path=findStreetPath(origin,{x:building.doorX,y:building.doorY},b);
  assert.ok(path.length>0,'no walking path to '+building.id);
  assert.ok(path.every(p=>canStandAt(p.x,p.y,b)),'walked through building: '+building.id);
  assert.equal(path.at(-1).x,building.doorX);
  assert.equal(path.at(-1).y,building.doorY);
  assert.equal(interiorFor(building).id,building.id);
 }
 assert.ok(OLD_HARBOR_WALKERS.length>=12);
});
test('the opening frame paints distinct authored architecture, streets and landmark',()=>{
 let n=0;const colors=new Set(),labels=[],rects=[];
 const mock={
  fillStyle:'#000',lineWidth:1,strokeStyle:'#000',
  save(){},restore(){},fillText(s){labels.push(s);},strokeText(){},
  fillRect(x,y,w,h){n++;colors.add(this.fillStyle);rects.push({x,y,w,h,color:this.fillStyle});}
 };
 paintOldHarborPlaza(mock,{buildings:oldHarborBuildings()});
 assert.ok(n>450,'scene must contain handcrafted scene geometry, not plain blocks');
 assert.ok(colors.size>=24,'rich, controlled scene color range');
 assert.ok(labels.includes('旧港站'),'street should show neighborhood identity');
 assert.ok(labels.some(s=>s.includes('钟楼')),'landmark must have visible signage');
 assert.ok(rects.some(r=>r.color==='#e9c487'),'clock uses warm highlight color');
 assert.ok(rects.some(r=>r.color==='#437987'),'riverside/water landmark visible');
});
