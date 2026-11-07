'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ring=require('../site/game/ring-arena-runtime.js');
assert.equal(ring.WALL_TEXTURE.url,'./assets/ring-arena/convenience-wall.webp');
assert.equal(ring.WALL_TEXTURE.repeats,7);
assert.equal(ring.WALL_TEXTURE.heightMeters,4.15);
assert.ok(ring.SPEC.wallHeight>ring.WALL_TEXTURE.heightMeters,'retail wall material must not stretch up the entire tall battle backdrop');
const p=path.resolve(__dirname,'../site/assets/ring-arena/convenience-wall.webp');
const buffer=fs.readFileSync(p);
assert.ok(buffer.length>40000,'original authored convenience-wall asset must exist');
assert.equal(buffer.toString('ascii',0,4),'RIFF');
assert.equal(buffer.toString('ascii',8,12),'WEBP');
for(const y of [0,ring.WALL_TEXTURE.heightMeters/2,ring.WALL_TEXTURE.heightMeters,ring.SPEC.wallHeight]){
 const uv=ring.wallTextureUV(0,y);
 assert.ok(Math.abs(uv.u-.5)<1e-7,'front center must map to image center');
 assert.ok(Math.abs(uv.v-Math.min(1,y/ring.WALL_TEXTURE.heightMeters))<1e-7);
}
for(const x of [-31.25,-17,0,17,31.25]){
 const uv=ring.wallTextureUV(x,5);
 assert.ok(uv.u>=0&&uv.u<1);
}
const src=fs.readFileSync(path.resolve(__dirname,'../site/game/ring-arena-runtime.js'),'utf8');
assert.match(src,/texture2D\(uWallTexture/);
assert.match(src,/smoothstep\(4\.07,4\.30,vWorld\.y\)/,'upper surface needs a clean neutral overhead transition');
assert.match(src,/float u=fract\(\(theta\/2\.7227136\+\.5\)\*7\.0\)/);
assert.match(src,/float v=clamp\(vWorld\.y\/4\.15/);
assert.match(src,/gl\.uniform1f\(world\.uWallReady,wallMaterialReady\?1:0\)/);
assert.match(src,/gl\.texImage2D\(gl\.TEXTURE_2D,0,gl\.RGBA,gl\.RGBA,gl\.UNSIGNED_BYTE,wallImage\)/);
assert.deepEqual(ring.STAGING.outer.enemies.map(x=>x[1]),[5.7,5.7,5.7,5.7]);
// Both battle orientations must film the authored wall from comparable
// distances. Previously the inner orientation placed its wall at z=26,
// exposing ~190px of empty overhead in the 1917x906 battle composition.
const outerWall=ring.backdropPoint('outer',0);
const innerWall=ring.backdropPoint('inner',0);
const outerShot=ring.camera('outer');
const innerShot=ring.camera('inner');
const outerWallDistance=Math.abs(outerShot.eye.z-outerWall.z);
const innerWallDistance=Math.abs(innerShot.eye.z-innerWall.z);
assert.ok(Math.abs(outerWallDistance-innerWallDistance)<.15,
 'both orientations must keep the 3D wall at nearly equal camera distance');
assert.ok(innerWall.z>ring.STAGING.inner.enemies[0][1]+1.8,
 'inner wall must remain behind all four opponent anchors');
for(const angle of [-ring.SPEC.wallArcHalfAngle,0,ring.SPEC.wallArcHalfAngle]){
 const p=ring.backdropPoint('inner',angle);
 assert.ok(p.z>innerShot.eye.z+1.5,
  'full reverse arc must stay beyond the inner camera near field');
}
const innerPaintTop=ring.project({
 x:0,y:ring.WALL_TEXTURE.heightMeters,z:innerWall.z
},innerShot,1917/906);
assert.ok(innerPaintTop.valid&&innerPaintTop.y>.99,
 'wide-screen inner wall must fill the former empty upper band');
console.log('PASS authored WebP + curved 3D wall UV + GPU shader + unchanged actors');
