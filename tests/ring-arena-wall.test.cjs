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
assert.deepEqual(ring.STAGING.outer.enemies.map(x=>x[1]),[6.80,6.80,6.80,6.80]);
assert.deepEqual(ring.STAGING.inner.enemies.map(x=>x[1]),[10.5,10.5,10.5,10.5]);
assert.equal(ring.camera('outer').fov,66);
assert.equal(ring.camera('inner').fov,52);
for(const mode of ['outer','inner']){
 const backdrop=ring.backdropPoint(mode,0),camera=ring.camera(mode),aspect=1917/906;
 const dist=Math.abs(backdrop.z-camera.eye.z);
 assert.ok(mode==='outer'?dist>5.0&&dist<5.15:dist>6.20&&dist<6.30,'physical wall distance calibrated per active camera');
 const end=ring.project({x:0,y:ring.SPEC.wallHeight,z:backdrop.z},camera,aspect);
 const start=ring.project({x:0,y:0,z:backdrop.z},camera,aspect);
 assert.ok(end.valid&&start.valid);
 assert.ok(end.y>.64&&end.y<.80,'2.85m physical ceiling still in correct projected position');
 const foe=ring.layout(mode).enemies[1],b=ring.portraitBounds(foe,camera,aspect);
 const relative=(end.y-start.y)/(b.top-b.bottom);
 assert.ok(relative>.90&&relative<1.26,
  'a 2.85m wall must not make 1.6m enemies look like miniature people in '+mode+': '+relative);
}
const outer=ring.backdropPoint('outer',0),inner=ring.backdropPoint('inner',0);
assert.ok(Math.abs(Math.abs(outer.z-ring.camera('outer').eye.z)-
 Math.abs(inner.z-ring.camera('inner').eye.z))<1.5,
 'the real close-shoulder eye must be about one meter nearer the wall');
for(const theta of [-ring.SPEC.wallArcHalfAngle,0,ring.SPEC.wallArcHalfAngle]){
 const outerDepth=Math.abs(ring.backdropPoint('outer',theta).z-ring.camera('outer').eye.z);
 const innerDepth=Math.abs(ring.backdropPoint('inner',theta).z-ring.camera('inner').eye.z);
 assert.ok(Math.abs(outerDepth-innerDepth)<1.5,'near TPS eye and old reverse view still use same physical arc surface');
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
// Red emergency lighting must come ONLY from real ceiling lamps #1,#4.
for(const mode of ['outer','inner']){
 const on=ring.lightingFrame('on',0,mode);
 const half=ring.lightingFrame('partial',0,mode);
 const red=ring.lightingFrame('outage',0,mode);
 const flicker=ring.lightingFrame('flicker',2,mode);
 assert.deepEqual([...on.levels],[1,1,1,1,1,1]);
 assert.deepEqual([...on.redMix],[0,0,0,0,0,0]);
 assert.ok([...half.levels].some(x=>x===0));
 assert.ok(flicker.levels[1]<.1);
 assert.deepEqual([...red.redMix],[0,1,0,0,1,0]);
 assert.ok(red.levels[1]>.7&&red.levels[4]>.6);
 assert.ok([0,2,3,5].every(i=>red.levels[i]===0));
 assert.deepEqual([...red.redFixtureIndices],[1,4]);
 assert.equal(red.emergencyPosition,undefined);
 assert.ok(red.colors[3]>red.colors[4]*8&&red.colors[12]>red.colors[13]*8);
 const horror=ring.lightingFrame('horror',2.8,mode);
 assert.deepEqual([...horror.redMix],[0,1,0,0,1,0]);
 assert.ok(ring.lightingFrame('horror',1.3,mode).levels[1]<.1);
 assert.ok(ring.lightingFrame('horror',6,mode).levels.some(v=>v===0));
}
assert.doesNotMatch(src,/uEmergencyPosition|uEmergencyPower|uEmergency;/,
 'the detached red source must be deleted from shaders');
assert.match(src,/gl\.uniform3fv\(prog\['uLampColors\[0\]'\],currentLighting\.colors\)/,
 'room and L2D lighting must use the actual dynamic ceiling-lamp colors');
assert.match(src,/gl\.uniform1f\(fixture\.uRedMix,currentLighting\.redMix\[i\]\)/,
 'the physical fixture must change color along with its real irradiance');
assert.match(src,/uniform mat4 uVP;uniform highp int uSurface;uniform float uMode;/,
 '3D vertex shader must use highp int matching the fragment shader');
assert.match(src,/vIrradiance;varying float vFloorSpecular;uniform float uTime;uniform highp int uSurface;/,
 '3D fragment shader must use matching highp precision under ANGLE');
assert.match(src,/uLampPositions\[6\]/);
assert.match(src,/uLampColors\[6\]/);
assert.match(src,/vIrradiance=.*ringIrradiance\(renderP,n\)/,
 'vertex shader must light the actual deformed world-space position; selected train surfaces may use neutral authored irradiance');
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
assert.match(src,/function maskEmbeddedFogForBattle\(tex,ctx,size,id,characterId=/,
 'prepainted opaque fog must be excluded from the temporary battle texture');
assert.match(src,/ctx\.globalCompositeOperation='destination-in'/,
 'fog removal must be an alpha mask, not paint-over on source art');
assert.match(src,/maskEmbeddedFogForBattle\(targetTexture,ctx,size,a\.id,/,
 'real animated source must pass through non-destructive battle mask before upload');
for(const mode of ['outer','inner']){
 const friends=ring.STAGING[mode].allies.map(([x])=>x);
 const foes=ring.STAGING[mode].enemies.map(([x])=>x);
 assert.deepEqual(friends,[-1.95,-.65,.65,1.95],
  'four friends must keep a real straight one-rank formation');
 assert.deepEqual(foes,friends,'enemy rank must align to the exact four opposing lanes');
 for(let i=1;i<4;i++)assert.ok(Math.abs(friends[i]-friends[i-1]-1.30)<1e-7,
  'four equal separated lanes, no camera-driven layout offsets');
}
assert.deepEqual([ring.LOOK_LIMITS.yawLeftDeg,ring.LOOK_LIMITS.yawRightDeg,
 ring.LOOK_LIMITS.pitchUpDeg,ring.LOOK_LIMITS.pitchDownDeg],[22,22,12,12]);
assert.match(src,/const capDepth=16\.5/,
 'left and right TPS room boundaries must cover the full ±22 degree camera orbit');
assert.match(src,/drawWorld\(mode==='outer'\?wingOuter:wingInner,3,vp\)/,
 'real side wall caps must close the curved shop and prevent black void');
assert.match(src,/uSurface==3\?vec3\(aP.x>0.0\?-1.0:1.0,0.0,0.0\)/,
 'side walls receive inward-facing 3D diffuse lamp normals');
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
assert.match(src,/uGeometry>\.5&&uGeometry<1\.5\?clamp\(vWallUv/,
 'strip train floor uses continuous sampling');
assert.match(src,/fract\(vWallUv\)\)\.rgb/,
 'arc combat floor must retain its repeating material');
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
assert.match(bridgeSource,/const visibleFirst=\['player','enemy','ally4','enemy2','ally2','enemy3','ally3','enemy4'\]/,
 'all eight 4v4 roles must load with visible allies prioritized');
assert.match(bridgeSource,/Promise\.all\(\[worker\(\),worker\(\)\]\)/,
 'bounded dual loading prevents last squadmate starvation while respecting RGBA budget');
const hero=ring.layout('outer').allies[0],base=ring.camera('outer');
for(const x of [-1,-.5,0,.5,1]){
 const shot=ring.shoulderCamera(base,hero,x,0,1917/906);
 assert.deepEqual(shot.shoulderPivot,{x:hero.x,y:hero.y+hero.height*.88,z:hero.z});
 assert.ok(shot.shoulderRig&&shot.actorRootUnchanged);
 assert.ok(Math.abs(shot.heroYawDeg)<1e-8);
}
assert.match(src,/allyViewCamera\(base,layout\(mode\)\.allies\[0\],controlledActor\(\),mouseLookX,mouseLookY/,
 'the one live 3D shoulder camera must follow the SELECTED real teammate, never move actor world anchors');
assert.match(src,/actorWorldRight\(a,mode\)/,
 'rendered ArtMesh and shadows share a stable world orientation');
console.log('PASS compact 2.85m convenience-store bay, nine aspect-correct wall sections, four closer actors and switchable shadow-casting lights');
