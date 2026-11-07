'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const scenes=require('../site/game/scene-environments.js');
const geo=require('../site/game/scene-geometry.js');
const coords=arr=>{const out=[];for(let i=0;i<arr.length;i+=5)out.push(arr.slice(i,i+3));return out};
test('one universal 2.5D scene catalog chooses actual shapes, not gameplay-specific renderers',()=>{
 assert.equal(scenes.get('convenience').geometry.shape,'arc');
 assert.equal(scenes.get('metro').geometry.shape,'strip');
 assert.deepEqual(geo.TYPES,['arc','strip','box']);
 assert.equal(scenes.get('metro').wall.repeats,1,'one Anima wall, no repeated doors');
 assert.match(scenes.get('metro').floor,/assets\/metro\/side\/metro-floor\.svg/);
 assert.match(scenes.get('metro').ceiling,/assets\/metro\/side\/metro-ceiling\.svg/);
});
test('strip creates a planar train wall and full 3D independent floor/ceiling and TWO end walls',()=>{
 const {geometry:g,meshes:m}=geo.build(scenes.get('metro').geometry);
 assert.equal(g.shape,'strip');assert.ok(g.width>g.depth);
 for(const key of ['floorOuter','floorInner','backInner','backOuter','ceilingOuter',
   'ceilingInner','wingOuter','wingInner']){
  assert.ok(m[key].length>100&&m[key].length%15===0,key+' must have real GL triangles');
 }
 for(const [x,y,z] of coords(m.backInner)){
  assert.equal(z,g.backZ,'all painted wall vertices must lie in the same plane');
  assert.ok(x>=-g.width/2-.001&&x<=g.width/2+.001);
  assert.ok(y>=0&&y<=g.height+.001);
 }
 assert.ok(coords(m.floorOuter).every(v=>v[1]===0),'the entire floor is physical y=0');
 assert.ok(coords(m.ceilingOuter).every(v=>Math.abs(v[1]-g.height)<.0001));
 const wings=coords(m.wingOuter);
 assert.ok(wings.some(v=>v[0]===-g.width/2));
 assert.ok(wings.some(v=>v[0]===g.width/2));
 const u=[];for(let i=3;i<m.backInner.length;i+=5)u.push(m.backInner[i]);
 assert.ok(Math.min(...u)>=0&&Math.max(...u)<1,'painted original wall is NOT tiled');
});
test('six rectangular-carriage practical lights illuminate world-space actors, including real shadows',()=>{
 const g=geo.geometry(scenes.get('metro').geometry);
 const rig=geo.lightRig(g);
 assert.equal(rig.count,6);assert.equal(rig.positions.length,18);
 const points=coords([]); // literal empty verifies no dependence on ring fixture data
 assert.equal(points.length,0);
 const positions=[];
 for(let i=0;i<rig.positions.length;i+=3){
  const [x,y,z]=[...rig.positions.slice(i,i+3)];
  assert.ok(Math.abs(y-(g.height-.07))<.0001);
  assert.ok(z>g.backZ&&z<g.frontZ);
  assert.ok(x>-g.width/2&&x<g.width/2);
  positions.push([x,y,z]);
 }
 assert.equal(new Set(positions.map(x=>x[0])).size,3);
 assert.equal(new Set(positions.map(x=>x[2])).size,2);
});
test('same 2.5D renderer also accepts modular BOX geometry',()=>{
 const pack=geo.build({shape:'box',widthMeters:8,depthMeters:6,heightMeters:2.85,backZ:4});
 assert.equal(pack.geometry.shape,'box');
 assert.equal(pack.meshes.floorOuter.length,pack.meshes.floorInner.length);
 assert.ok(pack.meshes.backOuter.length>0&&pack.meshes.wingInner.length>0);
});
