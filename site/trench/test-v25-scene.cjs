const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
for(const m of src.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(m[1]);
const scene=src.slice(src.indexOf('function makeScene()'),src.indexOf('const PROP='));
const phys=src.slice(src.indexOf('function makeScenePhysics(world)'),src.indexOf('const scenePhysics='));
const {w,p}=new Function(scene+phys+';const w=makeScene();return {w,p:makeScenePhysics(w)}')();
assert.ok(p.counts.total>1800);
assert.equal(p.overlap(-8,-27.85,p.floor(-8,-27.85),2.04),null);
assert.ok(Math.abs(p.ceiling(-8,-27.85,.15)-2.645)<.01);
const wall=p.move(-8,-27.85,0,-10,0,'stand');assert.ok(wall[1]>-30.9&&wall[1]<-28.5);
const east=p.move(-8,-28.8,7,0,0,'stand');assert.ok(east[0]>-3.8);
const west=p.move(-8,-29.4,-7,0,0,'stand');assert.ok(west[0]<-12);
const off=p.move(-8,-26,7,0,0,'stand');assert.ok(off[0]<-5.3);
for(const kind of ['beam','rock']){const o=w.objects.find(o=>o.kind===kind);assert.ok(p.point(o.x,o.y,o.z));}
console.log(JSON.stringify({status:'PASS',checks:8,counts:p.counts,wall,east,west,off},null,2));
