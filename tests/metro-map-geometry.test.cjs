'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ctx={window:{}};
for(const f of ['metro-graph.js','metro-map-geometry.js'])
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../site/game',f),'utf8'),ctx);
const metro=ctx.window.PaperWorldMetro;
const geo=ctx.window.PaperWorldMetroGeometry;
test('Every rail edge has visible geometry',()=>{
 for(const line of metro.LINES){
  const edges=geo.segments(line);
  assert.equal(edges.length,line.stops.length-1+(line.ring?1:0));
  for(const [a,b] of edges){
   const d=geo.pathFor(line.id,a,b,metro.STATIONS,1440,810);
   assert.match(d,/^M\d/);
   assert.ok(d.length>8,line.id+' '+a+' '+b);
  }
 }
});
test('Residential line is horizontal rather than jagged',()=>{
 for(const [a,b] of geo.segments(metro.getLine('a'))){
  const d=geo.pathFor('a',a,b,metro.STATIONS,1440,810);
  assert.ok(!d.includes(' Q '),d);
  assert.equal(metro.STATIONS[a].y,metro.STATIONS[b].y);
 }
});
test('Closed city ring has genuine rounded quarter-turn corners',()=>{
 const ring=metro.getLine('b');
 assert.equal(ring.ring,true);
 assert.equal(metro.nextStop('b','northgate',1),'central');
 const turns=[];
 for(const [a,b] of geo.segments(ring)){
  const d=geo.pathFor('b',a,b,metro.STATIONS,1440,810);
  if(d.includes(' Q'))turns.push(a+'>'+b);
 }
 assert.ok(turns.length>=4,JSON.stringify(turns));
});
test('Corners remain round at desktop and mobile landscape aspect ratios',()=>{
 for(const [w,h] of [[1440,810],[844,390]]){
  const d=geo.pathFor('b','central','cafe',metro.STATIONS,w,h,19);
  assert.ok(d.includes(' Q'),d);
  assert.ok(!d.includes('NaN'),d);
  const points=[...d.matchAll(/(?:M|L|Q)\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g)];
  assert.ok(points.length>=3,d);
 }
});
