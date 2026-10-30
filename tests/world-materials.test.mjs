import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const moduleText=readFileSync('site/world-builder/materials-core.js','utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(moduleText).toString('base64'));

test('world material pack has exactly 32 deterministic hand-structured 16x16 four-ink tiles',()=>{
 const a=m.freshPack(),b=m.freshPack();
 assert.deepEqual(a,b,'fresh materials must be deterministic without random speckles');
 assert.equal(m.validatePack(a),a);
 assert.equal(a.materials.length,32);assert.equal(a.palette.length,4);
 assert.deepEqual(['ground','building','nature'].map(group=>m.MATERIALS.filter(x=>x.group===group).length),[16,12,4]);
 assert.ok(a.materials.every(x=>x.pixels.length===256&&new Set(x.pixels).size>=2));
 assert.ok(a.materials.every(x=>x.pixels.every(c=>Number.isInteger(c)&&c>=1&&c<=4)));
 assert.ok(!moduleText.includes('Math.random'));
});
test('tileable sample wraps both negative and positive coordinates',()=>{
 const p=m.freshPack();
 for(let id=0;id<32;id++)for(const [x,y] of [[0,0],[4,7],[15,15]]){
  assert.equal(m.sample(p,id,x,y),m.sample(p,id,x+16,y-16));
  assert.equal(m.sample(p,id,x,y),m.sample(p,id,x-32,y+48));
 }
});
test('seam-crossing pencil stroke and toroidal bucket preserve exact 4 colors',()=>{
 const p=m.freshPack(),s=p.materials[0].pixels;
 s.fill(1);s[0]=2;s[15]=2;
 assert.equal(m.flood(p,0,0,0,3),true);
 assert.equal(m.sample(p,0,15,0),3,'bucket wraps to opposite seam');
 assert.equal(m.sample(p,0,1,0),1);
 assert.equal(m.stroke(p,0,15,3,16,3,4),true);
 assert.equal(m.sample(p,0,15,3),4);assert.equal(m.sample(p,0,0,3),4);
});
test('128x64 atlas packs 32 materials with exact RGB and full alpha, GL orientation reversible',()=>{
 const p=m.freshPack();
 const a=m.atlasRGBA(p),gl=m.atlasRGBA(p,true);
 assert.deepEqual([a.width,a.height],[128,64]);
 assert.equal(a.rgba.length,128*64*4);
 assert.equal(gl.rgba.length,a.rgba.length);
 for(let material=0;material<32;material++)for(const [x,y] of [[0,0],[7,7],[15,15]]){
  const col=material%8,row=Math.floor(material/8),u=col*16+x,v=row*16+y;
  const offset=(v*128+u)*4,glOffset=((63-v)*128+u)*4;
  const pigment=p.materials[material].pixels[y*16+x];
  const hex=m.PALETTE[pigment-1];
  assert.deepEqual(Array.from(a.rgba.slice(offset,offset+4)),[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255]);
  assert.deepEqual(Array.from(gl.rgba.slice(glOffset,glOffset+4)),Array.from(a.rgba.slice(offset,offset+4)));
 }
});
test('round-trip editable project through browser-compatible storage and reject malformed input',()=>{
 const cache=new Map(),storage={setItem:(k,v)=>cache.set(k,v),getItem:k=>cache.get(k)};
 const p=m.freshPack();m.paint(p,1,0,0,4);m.writePack(storage,p);
 assert.deepEqual(m.tryReadPack(storage),p);
 const tampered=structuredClone(p);tampered.materials[0].pixels[0]=5;
 assert.throws(()=>m.validatePack(tampered));
 const broken=structuredClone(p);broken.materials.pop();
 assert.throws(()=>m.validatePack(broken));
 cache.set(m.STORAGE_KEY,'invalid');assert.deepEqual(m.tryReadPack(storage),m.freshPack());
});
test('native WebGL world mesh actually carries UVs and material IDs without altering collisions',()=>{
 const source=readFileSync('site/game/world3d.js','utf8');
 const begin=source.indexOf('function makeTown(lod='),end=source.indexOf('\nfunction program(gl,',begin);
 assert.ok(begin>0&&end>begin);
 const ink=[57/255,54/255,87/255],pink=[242/255,165/255,194/255],blue=[169/255,186/255,233/255],paper=[1,245/255,230/255];
 const town=new Function('INK','PINK','BLUE','PAPER','PALETTE',source.slice(begin,end)+'\nreturn makeTown;')(ink,pink,blue,paper,[ink,pink,blue,paper]);
 const mesh=town('full'),mobile=town('mobile');
 assert.ok(mesh.materialPosition.length>20000,'city surfaces really have UV mesh');
 assert.equal(mesh.materialPosition.length/3,mesh.materialUV.length/2);
 assert.equal(mesh.materialPosition.length/3,mesh.materialID.length);
 assert.ok(mesh.materialUV.every(Number.isFinite));
 assert.ok(mesh.materialID.every(id=>Number.isInteger(id)&&id>=0&&id<32));
 const types=new Set(mesh.materialID);
 for(const id of [6,8,10,11,16,17,18,19,22,23,24,25,26,27,28,29,30,31])assert.ok(types.has(id),'world actually uses material '+m.MATERIALS[id].id);
 assert.deepEqual(mesh.solids,mobile.solids,'material layer preserves collision geometry');
 assert.ok(mesh.tri.length/9>15000,'buildings, realistic doors and tree crowns are actual modeled solids');
 assert.ok(source.includes('materialPass?.render({matrix:projection})'));
 assert.ok(source.includes('createMaterialBatch'));
 const gl=readFileSync('site/game/world-material-gl.js','utf8');
 for(const flag of ['gl.NEAREST','gl.CLAMP_TO_EDGE','texSubImage2D','gl.drawArrays(gl.TRIANGLES','128.0,64.0'])assert.ok(gl.includes(flag));
});

test('saved eight-material user pack migrates without repainting first eight assets',()=>{
 const old=m.freshPack();old.materials=old.materials.slice(0,8);
 old.materials[0].pixels[37]=4;
 const upgraded=m.migratePack(old);
 assert.equal(upgraded.materials.length,32);
 assert.equal(upgraded.materials[0].pixels[37],4);
 assert.deepEqual(m.validatePack(upgraded),upgraded);
});
