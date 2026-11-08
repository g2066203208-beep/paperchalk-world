'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const p=require('../site/game/metro-platform-3d.js');
const g=require('../site/game/scene-geometry.js');
const scene=require('../site/game/scene-environments.js').get('metro');
const runtime=fs.readFileSync(path.resolve(__dirname,'../site/game/ring-arena-runtime.js'),'utf8');
const cabin=fs.readFileSync(path.resolve(__dirname,'../site/game/metro-cabin.js'),'utf8');
const html=fs.readFileSync(path.resolve(__dirname,'../site/index.html'),'utf8');
const coords=mesh=>{
 const a=[];
 for(let i=0;i<mesh.length;i+=5)a.push({x:mesh[i],y:mesh[i+1],z:mesh[i+2],u:mesh[i+3],v:mesh[i+4]});
 return a;
};
test('station is a true volume, not the former flat procedural backdrop',()=>{
 const box=p.build();
 for(const key of ['platformFloor','platformBack','platformCeiling','platformColumns','platformLightboxes']){
  assert.ok(box[key]?.length>=30,key+' is a true triangle surface');
 }
 const back=coords(box.platformBack);
 const floor=coords(box.platformFloor);
 const ceil=coords(box.platformCeiling);
 const cols=coords(box.platformColumns);
 assert.ok(back.every(v=>Math.abs(v.z-4.42)<.0001));
 assert.ok(floor.every(v=>Math.abs(v.y+.16)<.0001));
 assert.ok(ceil.every(v=>Math.abs(v.y-3.02)<.0001));
 assert.ok(new Set(cols.map(v=>v.z)).size>=4,'columns extrude in physical depth');
 assert.ok(new Set(cols.map(v=>v.x)).size>4,'columns occupy their own locations');
 const tunnel=coords(g.build(scene.geometry).meshes.exterior);
 assert.ok(tunnel.every(v=>v.z<4.42),'tunnel backdrop stays BEHIND real platform box');
});
test('all four actual illustrated 3D door panels have independent quads and original source UV',()=>{
 const box=p.build();
 assert.equal(p.DOORS.length,2);
 assert.equal(box.doorLeafLeft.length,12*5);
 assert.equal(box.doorLeafRight.length,12*5);
 const left=coords(box.doorLeafLeft),right=coords(box.doorLeafRight);
 assert.ok(left.every(v=>Math.abs(v.z-8.045)<.0001));
 assert.ok(right.every(v=>Math.abs(v.z-8.045)<.0001));
 assert.ok(left.some(v=>Math.abs(v.u-p.DOORS[0].min)<.0001));
 assert.ok(left.some(v=>Math.abs(v.u-p.DOORS[1].center)<.0001));
 assert.ok(right.some(v=>Math.abs(v.u-p.DOORS[1].max)<.0001));
 assert.ok(Math.abs(p.leafTravelMeters-.752)<.03);
});
test('real WebGL mesh is rendered into same depth buffer through physical door openings',()=>{
 assert.match(runtime,/makePlatformMeshes\(\)/);
 assert.match(runtime,/drawWorld\(platformMeshes\[name\],kind,vp\)/);
 assert.match(runtime,/drawWorld\(platformMeshes\.doorLeafLeft,9,vp\)/);
 assert.match(runtime,/drawWorld\(platformMeshes\.doorLeafRight,10,vp\)/);
 assert.match(runtime,/uDoorOpen/);
 assert.match(runtime,/renderP\.x-=uDoorOpen\*\.752/);
 assert.match(runtime,/renderP\.x\+=uDoorOpen\*\.752/);
 assert.match(runtime,/if\(\(leftDoor\|\|rightDoor\)\&\&vWallUv\.y<\.735\)discard/);
 assert.match(runtime,/station3D:\{enabled:transitMode/);
 assert.ok(html.indexOf('metro-platform-3d.js')<html.indexOf('ring-arena-runtime.js'));
});
test('doors physically lock before acceleration and open after the train has stopped',()=>{
 const close=cabin.indexOf('if(!await animateDoors(0,930))');
 const depart=cabin.indexOf('motion.begin(global.performance.now())');
 const arrives=cabin.indexOf("section.dataset.travelPhase='docked';",depart);
 const open=cabin.indexOf('if(!await animateDoors(1,1050))',arrives);
 assert.ok(close>=0&&depart>close);
 assert.ok(open>arrives);
 assert.match(cabin,/door\.open=door\.from\+\(door\.target-door\.from\)\*ease/);
 assert.match(cabin,/doorSequence/);
 assert.match(cabin,/setTransitDoorOpen\?\.\(door\.open,false\)/);
});
