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
console.log('PASS shared physical height, ground plane, resize stability, shoe/horizon validation');
