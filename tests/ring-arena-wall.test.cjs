'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ring=require('../site/game/ring-arena-runtime.js');
assert.equal(ring.WALL_TEXTURE.url,'./assets/ring-arena/convenience-wall.webp');
assert.equal(ring.WALL_TEXTURE.repeats,9);
assert.equal(ring.WALL_TEXTURE.heightMeters,3.2);
assert.equal(ring.SPEC.wallHeight,3.2);
assert.equal(ring.SPEC.ceilingHeight,ring.SPEC.wallHeight);
const tileWorldWidth=2*ring.SPEC.wallArcHalfAngle*ring.SPEC.wallRadius/ring.WALL_TEXTURE.repeats;
const tileImageWorldWidth=ring.WALL_TEXTURE.heightMeters*ring.WALL_TEXTURE.width/ring.WALL_TEXTURE.height;
assert.ok(Math.abs(tileWorldWidth/tileImageWorldWidth-1)<.03,
 'the real 2172x724 image must repeat at its physically correct aspect ratio');
const p=path.resolve(__dirname,'../site/assets/ring-arena/convenience-wall.webp');
const buffer=fs.readFileSync(p);
assert.ok(buffer.length>40000,'authored convenience-wall asset must exist');
assert.equal(buffer.toString('ascii',0,4),'RIFF');
assert.equal(buffer.toString('ascii',8,12),'WEBP');
for(const y of [0,ring.WALL_TEXTURE.heightMeters/2,ring.WALL_TEXTURE.heightMeters]){
 const uv=ring.wallTextureUV(0,y);
 assert.ok(Math.abs(uv.u-.5)<1e-7);
 assert.ok(Math.abs(uv.v-y/ring.WALL_TEXTURE.heightMeters)<1e-7);
}
for(const x of [-31.25,-17,0,17,31.25]){
 const uv=ring.wallTextureUV(x,2);
 assert.ok(uv.u>=0&&uv.u<1);
}
const src=fs.readFileSync(path.resolve(__dirname,'../site/game/ring-arena-runtime.js'),'utf8');
assert.match(src,/texture2D\(uWallTexture/);
assert.match(src,/float u=fract\(\(theta\/2\.7227136\+\.5\)\*9\.0\)/);
assert.match(src,/float v=clamp\(vWorld\.y\/3\.2/);
assert.match(src,/else if\(uSurface==2\)/,'real 3D ceiling needs distinct lighting material');
assert.match(src,/drawWorld\(ceiling,2,vp\)/,'ceiling triangles must be rendered');
assert.match(src,/gl\.uniform1f\(world\.uWallReady,wallMaterialReady\?1:0\)/);
assert.match(src,/gl\.texImage2D\(gl\.TEXTURE_2D,0,gl\.RGBA,gl\.RGBA,gl\.UNSIGNED_BYTE,wallImage\)/);
assert.deepEqual(ring.STAGING.outer.enemies.map(x=>x[1]),[5.7,5.7,5.7,5.7]);
for(const mode of ['outer','inner']){
 const backdrop=ring.backdropPoint(mode,0),camera=ring.camera(mode),aspect=1917/906;
 const dist=Math.abs(backdrop.z-camera.eye.z);
 assert.ok(dist>8&&dist<8.3,'wall-to-camera distance calibrated for '+mode);
 const end=ring.project({x:0,y:ring.SPEC.wallHeight,z:backdrop.z},camera,aspect);
 const start=ring.project({x:0,y:0,z:backdrop.z},camera,aspect);
 assert.ok(end.valid&&start.valid);
 assert.ok(end.y>.65&&end.y<.80,'real ceiling begins at a consistent screen height in '+mode);
 const foe=ring.layout(mode).enemies[1],b=ring.portraitBounds(foe,camera,aspect);
 const relative=(end.y-start.y)/(b.top-b.bottom);
 assert.ok(relative>1.25&&relative<1.65,
  'a 3.2m wall must not make 1.6m enemies look like miniature people in '+mode+': '+relative);
}
const outer=ring.backdropPoint('outer',0),inner=ring.backdropPoint('inner',0);
assert.ok(Math.abs(Math.abs(outer.z-ring.camera('outer').eye.z)-
 Math.abs(inner.z-ring.camera('inner').eye.z))<.1);
for(const theta of [-ring.SPEC.wallArcHalfAngle,0,ring.SPEC.wallArcHalfAngle]){
 const outerDepth=Math.abs(ring.backdropPoint('outer',theta).z-ring.camera('outer').eye.z);
 const innerDepth=Math.abs(ring.backdropPoint('inner',theta).z-ring.camera('inner').eye.z);
 assert.ok(Math.abs(outerDepth-innerDepth)<.1,'mirrored arcs have equal perspective depth across the image');
}
console.log('PASS 3.2m human-scale convenience walls, 9 correct-aspect repeats, real ceiling, mirrored view perspective, unchanged actor anchors');
