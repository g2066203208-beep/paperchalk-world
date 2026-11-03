import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const context={module:{exports:{}},globalThis:{}};
runInNewContext(readFileSync('site/game/ground-perspective.js','utf8'),context);
const perspective=context.module.exports;
assert.equal(typeof perspective.fit,'function');
assert.equal(perspective.metricsFor('protagonist').heightCm,162);
assert.equal(perspective.metricsFor('char-002').heightCm,155);
const reference={
  referenceHeightCm:162,actorHeightCm:155,
  referenceCanvasHeight:432,referenceCanvasBottom:552,
  actorCanvasBottom:469,actorPlaneHeight:540,horizonY:300
};
const fit=perspective.fit(reference);
assert.equal(fit.valid,true);
assert.ok(fit.sizePercent>49&&fit.sizePercent<54,
  'Default near-field NPC should be around 52% of scene height, not the old 34%');
assert.ok(fit.depthRatio>.65&&fit.depthRatio<.71);
assert.ok(fit.relativeVisibleHeight>.62&&fit.relativeVisibleHeight<.68);
// The world is a common perspective floor. Equal-depth shoe contact,
// same material framing and equal height means exactly 1:1 appearance.
const same=perspective.fit({...reference,actorCanvasBottom:552,
  referenceSole:1,actorSole:1,referenceCrown:.033,actorCrown:.033});
assert.equal(same.valid,true);
assert.ok(Math.abs(same.relativeVisibleHeight-155/162)<1e-9,
  'At the same depth only the 155/162 physical-height ratio remains');
// Resizing the logical game viewport must preserve the percentage geometry.
const enlarged=perspective.fit({
  ...reference,referenceCanvasHeight:864,referenceCanvasBottom:1104,
  actorCanvasBottom:938,actorPlaneHeight:1080,horizonY:600
});
assert.ok(Math.abs(enlarged.sizePercent-fit.sizePercent)<1e-9);
assert.equal(perspective.fit({...reference,actorCanvasBottom:200}).valid,false,
  'Feet must be below horizon; never project an off-floor actor silently');
// A stronger perspective distance MUST shrink an actor smoothly.
const far=perspective.fit({...reference,actorCanvasBottom:400});
assert.ok(far.valid&&far.heightPx<fit.heightPx);
assert.ok(fit.actorFootY>fit.horizonY);
const g0=perspective.floorMotion({y:77,z:-215},720);
const gy=perspective.floorMotion({y:83,z:-215},720);
const gz=perspective.floorMotion({y:83,z:-165},720);
assert.equal(g0.valid,true);
assert.equal(g0.screenDeltaY,0);
assert.equal(g0.worldDeltaZ,0);
assert.ok(Math.abs(gy.screenDeltaY-43.2)<.00001,
  'Moving the common floor by 6% must move all actor shoe points 43.2px');
assert.equal(gz.screenDeltaY,gy.screenDeltaY);
assert.equal(gz.worldDeltaZ,50,
  'Floor depth must carry all actor planes by the exact same world-Z displacement');
assert.equal(perspective.floorMotion({y:77,z:-215},-1).valid,false);
const near=perspective.depthScale(250);
const base=perspective.depthScale(160);
const distantScale=perspective.depthScale(-330);
assert.ok(near>base&&base>distantScale,'Moving closer MUST make a grounded actor larger');
assert.equal(base,1,'Reference heroine must retain the 1× reference scale');
assert.ok(perspective.depthScale(-190)>.7&&perspective.depthScale(-190)<.8);
const normalScale=perspective.renderScale({
  actorHeightCm:155,referenceHeightCm:162,
  actorCanvasHeight:220,referenceCanvasHeight:550,
  actorVisibleFraction:.86,referenceVisibleFraction:.9,actorZ:-190,
  referenceZ:160,dev:false
});
const devScale=perspective.renderScale({
  actorHeightCm:155,referenceHeightCm:162,
  actorCanvasHeight:220,referenceCanvasHeight:550,
  actorVisibleFraction:.86,referenceVisibleFraction:.9,actorZ:-190,
  referenceZ:160,dev:true
});
assert.equal(normalScale.valid,true);
assert.equal(devScale.valid,true);
assert.ok(normalScale.scale<devScale.scale,
 'Normal 2D view needs camera depth compensation; DEV already has CSS 3D projection');
assert.ok(Math.abs(normalScale.scale/devScale.scale-perspective.depthScale(-190))<1e-10,
 'Do not double apply CSS perspective in the 3D DEV scene');
const expectedPhys=(155/162)*(perspective.depthScale(-190));
const visibleRatio=(220*.86*normalScale.scale)/(550*.9);
assert.ok(Math.abs(visibleRatio-expectedPhys)<1e-10,
 'The real alpha silhouette plus actual stature must predict apparent height');
assert.ok(!perspective.renderScale({actorHeightCm:0}).valid);
console.log('PASS shared L2D floor, physically normalized character height, camera distance shrink/grow and no double perspective');
