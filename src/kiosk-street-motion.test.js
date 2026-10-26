import test from "node:test";
import assert from "node:assert/strict";
import {streetAnimationFrame} from "./kiosk-pixel.js";

test("winter street motion is deterministic and safe for old saves",()=>{
 const a=streetAnimationFrame(1234);
 assert.deepEqual(a,streetAnimationFrame(1234));
 assert.deepEqual(streetAnimationFrame(NaN),streetAnimationFrame(0));
 assert.equal(a.smoke.length,5);
 for(const p of a.smoke){
  assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y));
  assert.ok(p.size>=1&&p.size<=3);
 }
});
test("street walkers and distant bus move independently of customer state",()=>{
 const first=streetAnimationFrame(0),later=streetAnimationFrame(120);
 assert.notEqual(first.walkerX,later.walkerX);
 assert.notEqual(first.busX,later.busX);
 assert.ok([0,1,2,3].includes(later.stride));
 assert.equal(typeof later.lampBright,"boolean");
});
test("street loop positions stay bounded for long-running sessions",()=>{
 for(const phase of [0,1,1000,1000000,Number.POSITIVE_INFINITY,-400]){
  const f=streetAnimationFrame(phase);
  assert.ok(f.walkerX>=-18&&f.walkerX<178);
  assert.ok(f.busX>=-38&&f.busX<198);
 }
});
