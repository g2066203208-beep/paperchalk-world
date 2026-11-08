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
 let turns=0;
 for(const [a,b] of geo.segments(ring)){
  const d=geo.pathFor('b',a,b,metro.STATIONS,1440,810);
  turns+=(d.match(/ Q/g)||[]).length;
 }
 assert.ok(turns>=4,'Expected multiple 90-degree rounded corners, found '+turns);
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

test('All location nodes are INTEGER intersections of one 12×6 grid',()=>{
 assert.equal(metro.GRID.columns,12);
 assert.equal(metro.GRID.rows,6);
 for(const [id,st] of Object.entries(metro.STATIONS)){
  assert.ok(Number.isInteger(st.gx)&&Number.isInteger(st.gy),id);
  assert.ok(st.gx>=0&&st.gx<=metro.GRID.columns,id);
  assert.ok(st.gy>=0&&st.gy<=metro.GRID.rows,id);
  assert.equal(st.x,st.gx/metro.GRID.columns*100);
  assert.equal(st.y,st.gy/metro.GRID.rows*100);
 }
 for(const [edge,turns] of Object.entries(geo.routes)){
  assert.ok(Array.isArray(turns),edge);
  for(const [column,row] of turns){
   assert.ok(Number.isInteger(column)&&Number.isInteger(row),edge);
   assert.ok(column>=0&&column<=metro.GRID.columns,edge);
   assert.ok(row>=0&&row<=metro.GRID.rows,edge);
  }
 }
});
test('Dot array cells have precisely the same X/Y spacing at all viewports',()=>{
 for(const [width,height] of [[1320,760],[844,390],[640,360]]){
  const space=geo.layout(width,height),origin=geo.point(0,0,space);
  const right=geo.point(1,0,space),down=geo.point(0,1,space);
  assert.ok(Math.abs((right.x-origin.x)-(down.y-origin.y))<1e-8);
  const last=geo.point(12,6,space);
  assert.ok(origin.x>=0&&origin.y>=0&&last.x<=width&&last.y<=height);
 }
});

test('ring diagram follows a short coherent subway loop instead of northern spaghetti detours',()=>{
 const direct=geo.routes['b:central:cafe'];
 const northern=geo.routes['b:convenience:northgate'];
 assert.deepEqual(Array.from(direct,p=>Array.from(p)),[[8,3],[2,3]]);
 assert.deepEqual(Array.from(northern,p=>Array.from(p)),[[11,2],[11,1]]);
 for(const turns of [direct,northern])for(const [gx,gy] of turns){
  assert.ok(gy>=1&&gy<=4,'rail corner outside metro route');
  assert.ok(gx>=2&&gx<=11,'rail corner uses fictional outlying tracks');
 }
 assert.equal(geo.segments(metro.getLine('a')).length,3);
 assert.equal(geo.segments(metro.getLine('b')).length,6);
});
