import test from "node:test";
import assert from "node:assert/strict";
import {windowFrostPattern,customerSpeech,wrapSpeech} from "./kiosk-view.js";
import {initialShop,join,apply} from "./kiosk-core.js";

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

test("customer dialogue appears as speaker-anchored information, not a saved bottom-bar message",()=>{
 const shop=initialShop();join(shop,"solo","测试店长");
 assert.equal(customerSpeech(shop),null,"closed window has no customer speech");
 assert.equal(apply(shop,"solo",{cmd:"window"}),true);
 assert.equal(customerSpeech(shop,{stage:"enter"}),null,"offscreen entrance is silent");
 assert.match(customerSpeech(shop,{stage:"idle"}).text,/热茶/,"arrived visitor speaks their order");
 assert.equal(apply(shop,"solo",{cmd:"talk"}),true);
 assert.match(customerSpeech(shop,{stage:"idle"}).text,/热茶/);
 shop.counter="bread";
 assert.equal(apply(shop,"solo",{cmd:"sell"}),true);
 assert.match(customerSpeech(shop,{stage:"idle"}).text,/不是我要的/,"mistake is spoken by the visitor");
 assert.equal(customerSpeech(shop,{stage:"handoff"}),null,"departing customer does not leak next order");
});
test("NPC speech wraps Chinese across short lines without clipping the full message",()=>{
 assert.deepEqual(wrapSpeech("热茶",9),["热茶"]);
 const v=wrapSpeech("这是一段非常长的委托内容要被分行显示且不能溢出",7,3);
 assert.equal(v.length,3);
 assert.ok(v.every(row=>Array.from(row).length<=7));
 assert.ok(v[2].endsWith("…"));
});
