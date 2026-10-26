import test from "node:test";
import assert from "node:assert/strict";
import {windowFrostPattern} from "./kiosk-view.js";

test("snowy service-window trim is deterministic and resolution-independent",()=>{
 for(const [w,h] of [[120,145],[240,170],[32,40],[420,250]]){
  const a=windowFrostPattern(w,h),b=windowFrostPattern(w,h);
  assert.ok(a.length>=4,"frost must have separate pixel pieces");
  assert.deepEqual(a,b,"same aperture must produce identical handmade pixels");
  assert.notStrictEqual(a,b,"each render must not mutate cached shared geometry");
  for(const p of a){
   assert.ok(Number.isInteger(p.x)&&Number.isInteger(p.y));
   assert.ok(p.w>0&&p.h>0&&typeof p.color==="string");
   assert.ok(p.x>=0&&p.x+p.w<=w,"snow must remain within the window width");
   assert.ok(p.y>=-7&&p.y+p.h<=h+7,"snow must stay on frame or sill");
   assert.ok(p.y<0||p.y>=h,"snow cannot occlude the customer's face");
  }
 }
});
test("invalid and tiny apertures do not create off-screen snow",()=>{
 for(const [w,h] of [[0,0],[12,12],[-5,200],[NaN,40],[40,Infinity]]){
  assert.deepEqual(windowFrostPattern(w,h),[]);
 }
});
