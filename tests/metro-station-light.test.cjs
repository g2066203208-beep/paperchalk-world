'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const scenes=require('../site/game/scene-environments.js');
const metro=scenes.get('metro');
const source=fs.readFileSync(path.resolve(__dirname,'../site/game/ring-arena-runtime.js'),'utf8');
const cabin=fs.readFileSync(path.resolve(__dirname,'../site/game/metro-cabin.js'),'utf8');
const floor=fs.readFileSync(path.resolve(__dirname,'../site/assets/metro/side/metro-floor.svg'),'utf8');
test('one art-directed original train floor texture matches carriage and no game shop checker tiles',()=>{
 assert.match(floor,/防滑橡胶地板/);
 assert.match(floor,/rubberPips/);
 assert.match(floor,/subtleGrain/);
 assert.doesNotMatch(floor,/M0 0H1024M0 1024/);
 assert.ok(floor.includes('#535b5d'),'floor based on graphite steel gray');
 assert.equal(metro.floor,'./assets/metro/side/metro-floor.svg');
});
test('opposite station light sources are registered in scene data, not a screen overlay',()=>{
 const p=metro.platformLighting;
 assert.equal(p.positions.length,12);
 assert.equal(p.colors.length,12);
 assert.equal(p.backZ,metro.geometry.backZ);
 assert.ok(p.positions[2]<p.backZ);
 assert.ok(p.positions[11]>metro.geometry.backZ+metro.geometry.depthMeters);
 for(let i=0;i<12;i+=3)assert.ok(p.positions[i]>=-4.25&&p.positions[i]<=4.25);
});
test('real window side and opposite platform lamps illuminate original WebGL 3D floor AND 2D L2D art',()=>{
 assert.match(source,/float platformWindowTransmission\(vec3 p,vec3 src,int side\)/);
 assert.match(source,/uPlatformPositions\[4\]/);
 assert.match(source,/uPlatformColors\[4\]/);
 assert.match(source,/ringIrradiance\(aP,n\)/,'floor receives analytic light');
 assert.match(source,/ringShade\(rgb,vWorld,pseudoNormal\)/,'original L2D body receives same analytic light');
 assert.match(source,/uPlatformExposure\*through/);
 assert.match(source,/projectedShadow\.uLamp,[\s\S]{0,100}outside\.positions\.slice/);
 assert.match(source,/vec3 outside=mix\(tunnel,platform,station\)/);
 assert.match(source,/float worldX=\(vWallUv.x-.5\)\*8.5\+uTrainPosition/);
 assert.match(source,/float stationMask=1.0-smoothstep/);
 assert.match(source,/float station=stationMask\*uPlatformExposure/);
 assert.match(source,/spatialPool=/);
 assert.doesNotMatch(source,/float lane=fract\(vWallUv.x\*7.0-uTime/);
 assert.match(cabin,/setPlatformExposure\?\.\(0\)/,'horror event switches off platform');
 assert.match(cabin,/setPlatformExposure\?\.\(1\)/,'station stop illuminates platform');
});

test('subway refuses transparent L2D canvases and limits emergency original-art GPU upload',()=>{
 assert.match(source,/function metroLivePortraitHasPixels\(source\)/);
 assert.match(source,/getImageData\(0,0,48,48\)/);
 assert.match(source,/metroLivePortraitHasPixels\(source\)\)/);
 assert.match(source,/canonicalMetroFallback.{0,28}targetTexture[.]painted/);
 assert.match(source,/heroOriginalFallback:/);
 assert.match(source,/protagonist-back\.webp/);
});

test('metro movement is driven by real world-distance, never by a moving cabin, actor or camera',()=>{
 const motion=require('../site/game/metro-motion.js');
 assert.equal(motion.LEG_METERS,88);
 assert.equal(motion.sampleLeg(0).stationExposure,1);
 assert.equal(motion.sampleLeg(motion.DURATION_MS*.5).stationExposure,0);
 assert.match(source,/function setTransitDynamics\(next\)/);
 assert.match(source,/uTrainPosition/);
 assert.match(cabin,/const motion=global[.]PaperWorldMetroMotion/);
 assert.match(cabin,/setTransitDynamics[?][.]\(stage\)/);
 assert.match(cabin,/await animateRailLeg\(\)/);
 assert.match(cabin,/motion[?][.]isMoving\(\)/);
});
