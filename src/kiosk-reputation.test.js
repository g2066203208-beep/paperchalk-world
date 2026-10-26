import test from "node:test";
import assert from "node:assert/strict";
import {initialShop,join,apply,nextDay,visitor,visible,validate,loyaltyTip,reputationLevel} from "./kiosk-core.js";
function sale(s){
 const sku=visitor(s).sku;
 let key=Object.keys(s.slots).find(k=>s.slots[k].sku===sku&&s.slots[k].qty>0);
 if(!key){
  assert.equal(apply(s,"host",{cmd:"restock",sku}),true);
  key=Object.keys(s.slots).find(k=>visible(s,k)&&(!s.slots[k].sku||s.slots[k].sku===sku)&&s.slots[k].qty<Math.floor(4/1));
  assert.ok(key,"restock slot");
  assert.equal(apply(s,"host",{cmd:"slot",key}),true);
 }
 if(!visible(s,key))assert.equal(apply(s,"host",{cmd:"toggle",key}),true);
 assert.equal(apply(s,"host",{cmd:"slot",key}),true);
 assert.equal(apply(s,"host",{cmd:"counter"}),true);
 assert.equal(apply(s,"host",{cmd:"sell"}),true);
}
test("wrong product counts once per visitor, never consumes stock or cash",()=>{
 const s=initialShop();join(s,"host","店长");join(s,"guest","店员");
 apply(s,"host",{cmd:"window"});
 apply(s,"guest",{cmd:"slot",key:"shelfR1"});apply(s,"guest",{cmd:"counter"});
 assert.equal(apply(s,"guest",{cmd:"sell"}),true);
 assert.equal(s.mistakes,1);assert.equal(s.totalMistakes,1);
 assert.equal(s.counter,"battery");assert.equal(s.cash,100);
 const revision=s.revision;
 assert.equal(apply(s,"host",{cmd:"sell"}),true);
 assert.equal(s.mistakes,1);assert.ok(s.revision>revision);
 apply(s,"guest",{cmd:"counter"});apply(s,"guest",{cmd:"slot",key:"shelfR1"});
 sale(s);
 assert.equal(s.wrongAttempted,false);
 assert.equal(s.totalServed,1);assert.equal(validate(s),true);
});
test("five physical sales settle a rating and preserve reputation into next day",()=>{
 const s=initialShop();join(s,"host","店长");apply(s,"host",{cmd:"window"});
 for(let i=0;i<5;i++)sale(s);
 assert.equal(s.phase,"summary");assert.equal(s.dayRating,4);
 assert.equal(s.dayReputationDelta,4);assert.equal(s.reputation,4);
 assert.equal(s.dayNet,46);assert.equal(s.loyaltyTips,0);
 assert.equal(nextDay(s,"host"),true);
 assert.equal(s.reputation,4);assert.equal(s.dayRating,0);assert.equal(s.dayReputationDelta,0);
 assert.equal(s.mistakes,0);assert.equal(validate(JSON.parse(JSON.stringify(s))),true);
});
test("trusted shop earns real, separately accounted per-sale thank-you tips",()=>{
 const s=initialShop();join(s,"host","店长");s.reputation=20;
 assert.equal(reputationLevel(s),2);assert.equal(loyaltyTip(s),1);
 apply(s,"host",{cmd:"window"});
 for(let i=0;i<5;i++)sale(s);
 assert.equal(s.earnings,60);assert.equal(s.loyaltyTips,5);
 assert.equal(s.totalLoyaltyTips,5);assert.equal(s.dayNet,51);
 assert.equal(s.cash,151);assert.equal(s.reputation,24);
 assert.equal(nextDay(s,"host"),true);
 assert.equal(s.loyaltyTips,0);assert.equal(s.totalLoyaltyTips,5);
});
test("old version 3 saves remain valid and corrupt reputation is rejected",()=>{
 const s=initialShop();join(s,"host","店长");
 for(const k of ["reputation","dayRating","dayReputationDelta","mistakes","totalMistakes","wrongAttempted","loyaltyTips","totalLoyaltyTips"])delete s[k];
 assert.equal(validate(s),true);
 apply(s,"host",{cmd:"window"});sale(s);
 assert.equal(s.loyaltyTips,0);assert.equal(validate(s),true);
 for(const bad of [-1,101,1.2,"20",null]){
  const copy=structuredClone(s);copy.reputation=bad;assert.equal(validate(copy),false);
 }
});
