'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ring=require('../site/game/ring-arena-runtime.js');
assert.equal(ring.WALL_TEXTURE.url,'./assets/ring-arena/convenience-wall.webp');
assert.equal(ring.WALL_TEXTURE.repeats,8);
assert.equal(ring.WALL_TEXTURE.heightMeters,3.2);
assert.equal(ring.SPEC.wallHeight,3.2);
assert.equal(ring.SPEC.ceilingHeight,ring.SPEC.wallHeight);
const tileWorldWidth=2*ring.wallArcMeters(ring.SPEC.wallArcHalfAngle)/ring.WALL_TEXTURE.repeats;
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
// Opposite camera direction must reverse physical UV orientation but never
// mirror letters on the convenience-store signs.
assert.ok(ring.wallTextureUV(-.25,1,'outer').u<
 ring.wallTextureUV(.25,1,'outer').u);
assert.ok(ring.wallTextureUV(.25,1,'inner').u<
 ring.wallTextureUV(-.25,1,'inner').u);
assert.match(fs.readFileSync(path.resolve(__dirname,'../site/game/ring-arena-runtime.js'),'utf8'),
 /face==='outer'\?'inner':'outer'/,'reverse side must receive the correct text orientation');
for(const x of [-31.25,-17,0,17,31.25]){
 const uv=ring.wallTextureUV(x,2);
 assert.ok(uv.u>=0&&uv.u<1);
}
const src=fs.readFileSync(path.resolve(__dirname,'../site/game/ring-arena-runtime.js'),'utf8');
assert.match(src,/texture2D\(uWallTexture/);
assert.match(src,/texture2D\(uWallTexture,vec2\(clamp\(fract\(vWallUv.x\)/);
assert.match(src,/gl\.vertexAttribPointer\(world\.aUv,2,gl\.FLOAT,false,20,12\)/);
assert.match(src,/return \{buffer,count:data\.length\/5\};/,'five-component geometry must render only actual vertices');
assert.match(src,/else if\(uSurface==2\)/,'real 3D ceiling needs distinct lighting material');
assert.match(src,/drawWorld\(mode==='outer'\?ceilingOuter:ceilingInner,2,vp\)/,'curved ceiling triangles must be rendered');
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
// Curved ceiling AND floor share the exact wall edge (not a flat rectangle
// whose corners cut through the photograph-wrapped 3D wall).
assert.equal(ring.SPEC.surfaceTileMeters,4);
assert.equal(ring.SPEC.surfaceDepth,34);
for(const kind of ['floor','ceiling']){
 const file=path.resolve(__dirname,'../site/assets/ring-arena/'+
  (kind==='floor'?'convenience-floor.svg':'convenience-ceiling.svg'));
 const texture=fs.readFileSync(file,'utf8');
 assert.match(texture,/<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1024" height="1024"/);
 assert.ok(texture.includes('1024'),'the original source is a rectangular 1024 image');
}
assert.equal(ring.SURFACE_TEXTURES.floor,'./assets/ring-arena/convenience-floor.svg');
assert.equal(ring.SURFACE_TEXTURES.ceiling,'./assets/ring-arena/convenience-ceiling.svg');
for(const mode of ['outer','inner']){
 for(const theta of [-ring.SPEC.wallArcHalfAngle,-.45,0,.5,ring.SPEC.wallArcHalfAngle]){
  const wall=ring.backdropPoint(mode,theta);
  const foot=ring.curvedSurfacePoint(mode,theta,0,0);
  const roof=ring.curvedSurfacePoint(mode,theta,0,ring.SPEC.ceilingHeight);
  assert.equal(foot.x,wall.x);assert.equal(roof.x,wall.x);
  assert.equal(foot.z,wall.z);assert.equal(roof.z,wall.z);
  assert.equal(foot.y,0);assert.equal(roof.y,ring.SPEC.wallHeight);
  const distance=ring.SPEC.surfaceDepth,far=ring.curvedSurfacePoint(mode,theta,distance,0);
  assert.equal(far.z-wall.z,mode==='inner'?-distance:distance);
  assert.equal(ring.curvedSurfaceUV(mode,theta,distance).v,distance/4);
  assert.equal(ring.curvedSurfaceUV(mode,theta,0).v,0);
 }
 const actors=ring.visibleActors(mode);
 for(const actor of actors){
  const a=Math.asin(actor.x/ring.SPEC.wallRadius);
  const anchor=ring.curvedSurfacePoint(mode,a,0,0);
  const depth=(actor.z-anchor.z)*(mode==='inner'?-1:1);
  assert.ok(depth>=-.001&&depth<ring.SPEC.surfaceDepth,
   'real floor must cover the actor shoe world position '+mode+' '+actor.id);
 }
}
assert.match(src,/drawWorld\(mode==='outer'\?floorOuter:floorInner,0,vp\)/);
assert.match(src,/drawWorld\(mode==='outer'\?ceilingOuter:ceilingInner,2,vp\)/);
assert.match(src,/texture2D\(uFloorTexture,fract\(vWallUv\)\)/);
assert.match(src,/texture2D\(uCeilingTexture,fract\(vWallUv\)\)/);
assert.doesNotMatch(src,/push\(floor,\[-w,0,z0\]/,
 'old square floor with unmatched wall curve must be removed');
console.log('PASS 3.2m human-scale convenience walls, 8 physically accurate arc-length repeats, real ceiling, mirrored view perspective, unchanged actor anchors');
