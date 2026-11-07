'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ring=require('../site/game/ring-arena-runtime.js');
assert.equal(ring.WALL_TEXTURE.url,'./assets/ring-arena/convenience-wall.webp');
assert.equal(ring.WALL_TEXTURE.repeats,9);
assert.equal(ring.WALL_TEXTURE.heightMeters,2.85);
assert.equal(ring.SPEC.wallHeight,2.85);
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
assert.deepEqual(ring.STAGING.outer.enemies.map(x=>x[1]),[7.20,8.05,7.43,6.95]);
assert.deepEqual(ring.STAGING.inner.enemies.map(x=>x[1]),[10.96,11.35,10.94,11.26]);
assert.equal(ring.camera('outer').fov,55);
assert.equal(ring.camera('inner').fov,52);
for(const mode of ['outer','inner']){
 const backdrop=ring.backdropPoint(mode,0),camera=ring.camera(mode),aspect=1917/906;
 const dist=Math.abs(backdrop.z-camera.eye.z);
 assert.ok(dist>6.20&&dist<6.30,'wall-to-camera distance calibrated for '+mode);
 const end=ring.project({x:0,y:ring.SPEC.wallHeight,z:backdrop.z},camera,aspect);
 const start=ring.project({x:0,y:0,z:backdrop.z},camera,aspect);
 assert.ok(end.valid&&start.valid);
 assert.ok(end.y>.70&&end.y<.78,'real ceiling begins at a consistent screen height in '+mode);
 const foe=ring.layout(mode).enemies[1],b=ring.portraitBounds(foe,camera,aspect);
 const relative=(end.y-start.y)/(b.top-b.bottom);
 assert.ok(relative>.90&&relative<1.20,
  'a 2.85m wall must not make 1.6m enemies look like miniature people in '+mode+': '+relative);
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
assert.equal(ring.SPEC.floorTileMeters,1.2);
assert.equal(ring.SPEC.ceilingTileMeters,1.9);
assert.equal(ring.SPEC.surfaceDepth,10);
assert.equal(ring.SPEC.arcSegments,160);
assert.equal(ring.SPEC.surfaceSegments,24);
// The 1024px assets contain a 2x2 panel grid; each ground tile is 0.6m,
// each ceiling module 0.95m, and the fixture artwork is roughly 1.0m long.
assert.ok(Math.abs(ring.SPEC.floorTileMeters/2-.6)<1e-7);
assert.ok(Math.abs(ring.SPEC.ceilingTileMeters/2-.95)<1e-7);
for(const kind of ['floor','ceiling']){
 const file=path.resolve(__dirname,'../site/assets/ring-arena/'+
  (kind==='floor'?'convenience-floor.svg':'convenience-ceiling.svg'));
 const texture=fs.readFileSync(file,'utf8');
 assert.match(texture,/<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1024" height="1024"/);
 assert.ok(texture.includes('1024'),'the original source is a rectangular 1024 image');
}
// Light spacing is NOT tied to acoustic ceiling tile repetition.
const ceilingSource=fs.readFileSync(path.resolve(__dirname,
 '../site/assets/ring-arena/convenience-ceiling.svg'),'utf8');
assert.doesNotMatch(ceilingSource,/fill="url\(#lamp\)"/,
 'ceiling texture cannot contain two lamps repeated every 1.9 meters');
assert.doesNotMatch(src,/vec2 lampUv=abs/,
 'no periodic fake luminous ceiling decals after conversion to actual 3D fixtures');
assert.match(src,/fixture=program\(gl,fixtureVertex,fixtureFragment/,
 'real ceiling lamp geometry must exist as a WebGL draw call');
assert.match(src,/drawFixtures\(vp\)/);
assert.match(src,/drawProjectedShadows\(presented,cam,vp\)/,
 'floor shadows MUST be projected from original L2D silhouettes');
assert.match(src,/texture2D\(uTexture,uv\)\.a/,
 'real L2D alpha drives physical projected floor shadow coverage');
assert.match(src,/uLampLevels\[6\]/,'each fluorescent lamp independently switchable');
assert.match(src,/float radius=mix\(mix\(\.047,\.0030,sole\),\.0025,uContact\)/,
 'cast edge softness must increase with height while shoes stay grounded');
const shadowProgram=src.split('const projectedShadowFragment=[')[1].split('function projectedShadowMesh(gl)')[0];
assert.equal((shadowProgram.match(/texture2D\(uTexture,uv/g)||[]).length,13,
 '13 source-alpha samples are required for the soft penumbra');
assert.match(src,/float shadow=smoothstep\(\.07,\.94,clamp\(a,0\.0,1\.0\)\)/,
 'do not re-quantize alpha into a sharp silhouette edge');
assert.match(src,/float shoes=smoothstep\(\.81,\.98,vUv\.y\)/,
 'shoe contact cannot become a solid all-body ellipse');

// Real-time light fixtures must occupy the physical emissive centers of the
// actual same curved 3D ceiling, in BOTH camera orientations. The texture,
 // environment and original L2D sprites must share one light rig.
assert.equal(ring.LIGHTING.kind,'world-space-six-motivated-fluorescents');
assert.ok(ring.LIGHTING.depths[1]-ring.LIGHTING.depths[0]>4.0,
 'ceiling lamp rows must have enough real depth for legible cast silhouette geometry');
for(const mode of ['outer','inner']){
 const rig=ring.lightRig(mode);
 assert.equal(rig.count,6);assert.equal(rig.positions.length,18);
 assert.equal(rig.colors.length,18);
 for(let i=0;i<rig.count;i++){
  assert.ok(Math.abs(rig.positions[i*3+1]-(ring.SPEC.ceilingHeight-.07))<.001);
  const arc=ring.LIGHTING.columns[i%3];
  const depth=ring.LIGHTING.depths[Math.floor(i/3)];
  const angle=ring.angleForArcMeters(arc);
  const geom=ring.curvedSurfacePoint(mode,angle,depth,ring.LIGHTING.height);
  assert.ok(Math.abs(geom.x-rig.positions[i*3])<.00001);
  assert.ok(Math.abs(geom.z-rig.positions[i*3+2])<.00001);
  assert.ok(Math.abs(rig.positions[i*3+1]-ring.LIGHTING.height)<1e-7);
 }
}
// The blackout must extinguish source geometry AND remove its lighting and
// physically cast shadows. Emergency is a physically positioned red source.
for(const mode of ['outer','inner']){
 const on=ring.lightingFrame('on',0,mode);
 const half=ring.lightingFrame('partial',0,mode);
 const off=ring.lightingFrame('outage',0,mode);
 const flicker=ring.lightingFrame('flicker',2.00,mode);
 assert.deepEqual([...on.levels],[1,1,1,1,1,1]);
 assert.ok([...half.levels].some(x=>x===0));
 assert.deepEqual([...off.levels],[0,0,0,0,0,0]);
 assert.equal(off.emergencyPower,1);
 assert.ok([...off.ambient].every(x=>x<.04));
 assert.ok(flicker.levels[1]<.1);
 assert.equal(off.emergencyPosition.length,3);
 const story0=ring.lightingFrame('horror',0,mode);
 const storyFault=ring.lightingFrame('horror',1.3,mode);
 const storyFailure=ring.lightingFrame('horror',2.8,mode);
 const storyReturn=ring.lightingFrame('horror',6.0,mode);
 assert.deepEqual([...story0.levels],[1,1,1,1,1,1]);
 assert.ok(storyFault.levels[1]<.1&&storyFault.levels[4]<.1,
  'ballast strobe needs a visibly failed pair of lamps');
 assert.deepEqual([...storyFailure.levels],[0,0,0,0,0,0],
  'horror beat must truly kill all six luminaires, not draw an overlay');
 assert.equal(storyFailure.emergencyPower,1,
  'late red emergency light must be independently controllable');
 assert.ok([...storyReturn.levels].some(x=>x>0)&&
  [...storyReturn.levels].some(x=>x===0),
  'partial restoration must not silently bring all lights back');
}
assert.match(src,/uniform mat4 uVP;uniform highp int uSurface;uniform float uMode;/,
 '3D vertex shader must use highp int matching the fragment shader');
assert.match(src,/vIrradiance;varying float vFloorSpecular;uniform float uTime;uniform highp int uSurface;/,
 '3D fragment shader must use matching highp precision under ANGLE');
assert.match(src,/uLampPositions\[6\]/);
assert.match(src,/uLampColors\[6\]/);
assert.match(src,/vIrradiance=ringIrradiance\(aP,n\)/,
 'static 3D surfaces must evaluate lamps at mesh vertices, not every pixel');
assert.match(src,/vFloorSpecular\+=pow\(nh,14\.0\)\*uLampLevels\[i\]/,
 'wet-tile reflections must use the same physically powered lights');
assert.match(src,/gl\.uniform3fv\(world\.uViewEye/,
 'specular must be calculated from the actual game 3D camera');
assert.match(src,/uGlow/,
 'each physical fluorescent fixture has optional powered halo');
assert.match(src,/gl\.blendFunc\(gl\.SRC_ALPHA,gl\.ONE\)/,
 'emissive light halos use additive blending');

assert.match(src,/ringTone\(color,vIrradiance\)/,
 'fragment shader must interpolate physical lamp irradiance');
assert.doesNotMatch(src,/color=ringShade\(color,vWorld,normal\)/);
assert.match(src,/ringShade\(rgb,vWorld,pseudoNormal\)/,
 'original L2D portraits must still receive pixel-wise dynamic lighting');
assert.doesNotMatch(src,/function drawContactShadows\(/,
 'fake circular contact shadow path must be gone');
assert.doesNotMatch(src,/shadowVertex=\[/,
 'ellipse sprite shader must be removed entirely');
assert.match(src,/gl\.uniform1f\(projectedShadow\.uContact,0\)/,
 'project main original-L2D silhouette');
assert.match(src,/gl\.uniform1f\(projectedShadow\.uContact,1\)/,
 'shoe contact must also use L2D alpha instead of synthetic circle');
assert.match(src,/const data=\[\],N=28,M=36/,
 'silhouette projection needs adequately subdivided ground geometry');
assert.match(src,/score=readability\/\(1\+\.085\*distance\)/,
 'shadow source choice MUST NOT depend on momentary lamp power');
assert.doesNotMatch(src,/if\(level<\.08\)continue/,
 'flickering lamp must not teleport a body shadow to another live fixture');
assert.match(src,/shadowLampAssignments:\{\.\.\.shadowLampAssignments\}/,
 'real browser QA must inspect stable per-actor projector identity');
assert.match(src,/vec2 uv=mix\(uClipUv.xy,uClipUv.zw,aUv\)/,
 'projected quads sample only actual alpha content UV');
assert.match(src,/function maskEmbeddedFogForBattle\(tex,ctx,size,id\)/,
 'prepainted opaque fog must be excluded from the temporary battle texture');
assert.match(src,/ctx\.globalCompositeOperation='destination-in'/,
 'fog removal must be an alpha mask, not paint-over on source art');
assert.match(src,/maskEmbeddedFogForBattle\(targetTexture,ctx,size,a\.id\)/,
 'real animated source must pass through non-destructive battle mask before upload');
assert.ok(Math.abs(ring.STAGING.outer.enemies[1][0]-
 ring.STAGING.outer.enemies[0][0]-1.00)<1e-7,
 'the first two fighters have a full meter of width');
assert.ok(Math.abs(ring.STAGING.outer.enemies[3][0]-
 ring.STAGING.outer.enemies[2][0]-1.77)<1e-7,
 'broad fourth coat needs extra world-space width');
assert.ok(Math.abs(ring.STAGING.inner.enemies[1][0]-
 ring.STAGING.inner.enemies[0][0]+.88)<1e-7,
 'the reverse battle line needs the same visual clearance');
assert.deepEqual([ring.LOOK_LIMITS.yawLeftDeg,ring.LOOK_LIMITS.yawRightDeg,
 ring.LOOK_LIMITS.pitchUpDeg,ring.LOOK_LIMITS.pitchDownDeg],[24,24,12,12]);
assert.match(src,/shadowClipUv=/,
 'the shadow penumbra must have a separately padded alpha crop');
assert.match(src,/projectedHeadOffset=Math\.sqrt\(distance\)/,
 'cast lamps must be selected by real projected body silhouette geometry');
assert.match(src,/float shoes=smoothstep\(\.81,\.98,vUv\.y\)/,
 'contact shader must be limited to real shoe / trouser alpha');
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
  assert.equal(ring.curvedSurfaceUV(mode,theta,distance,'floor').v,
   distance/ring.SPEC.floorTileMeters);
  assert.equal(ring.curvedSurfaceUV(mode,theta,distance,'ceiling').v,
   distance/ring.SPEC.ceilingTileMeters);
  assert.equal(ring.curvedSurfaceUV(mode,theta,0,'floor').v,0);
  assert.equal(ring.curvedSurfaceUV(mode,theta,0,'ceiling').v,0);
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
// Pure stationary-camera yaw/pitch keeps the same 3D eye and projection.
for(const side of ['outer','inner']){
 const base=ring.camera(side);
 for(const [x,y] of [[-1,-1],[-1,1],[1,-1],[1,1],[0,0]]){
  const looked=ring.immersiveCamera(base,x,y);
  assert.deepEqual(looked.eye,base.eye,
   'mouse is allowed to rotate view but must never translate world camera');
  assert.equal(looked.fov,base.fov);
  // At extreme yaw players may look away from enemies toward the shop wall.
  const roomPoint=ring.project(looked.focus,looked);
  assert.ok(roomPoint.valid,'real world must remain visible under camera turn');
  assert.ok(Math.abs(ring.cameraPitchDeg(looked))<=12.0001);
 }
}
const gameHtml=fs.readFileSync(path.resolve(__dirname,'../site/index.html'),'utf8');
assert.match(gameHtml,/const cameraFrameDt=Math.min\(\.25,Math.max\(0,rawFrameDt\)\)/,
 'mouse-look easing must use actual elapsed time even with slow software WebGL');
assert.match(gameHtml,/ringScene\.render\(dt,currentX,currentY\)/,
 'only one shared 3D world-camera receives smoothed cursor direction');
const bridgeSource=fs.readFileSync(path.resolve(__dirname,'../site/dev/character-bridge.js'),'utf8');
assert.match(bridgeSource,/const visibleFirst=\['player','enemy','enemy2','enemy3','enemy4'/,
 'all five visible 3D battle L2D must load before non-visible reserve allies');
console.log('PASS compact 2.85m convenience-store bay, nine aspect-correct wall sections, four closer actors and switchable shadow-casting lights');
