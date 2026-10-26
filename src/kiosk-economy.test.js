import test from "node:test";
import assert from "node:assert/strict";
import {GOODS,initialShop,join,apply,nextDay,visitor,visible,validate,heatingUpgradeCost,dailyOverhead} from "./kiosk-core.js";
function serveFive(s){
 apply(s,"host",{cmd:"window"});
 for(let i=0;i<5;i++){
  const sku=visitor(s).sku;
  const key=Object.keys(s.slots).find(k=>s.slots[k].sku===sku&&s.slots[k].qty>0);
  assert.ok(key,"physical inventory needed: "+sku);
  if(!visible(s,key))assert.equal(apply(s,"host",{cmd:"toggle",key}),true);
  assert.equal(apply(s,"host",{cmd:"slot",key}),true);
  assert.equal(s.players.host.hand,sku);
  assert.equal(apply(s,"host",{cmd:"counter"}),true);
  assert.equal(apply(s,"host",{cmd:"sell"}),true);
 }
}
test("rent and heating are charged once on the fifth actual sale",()=>{
 const s=initialShop();join(s,"host","店长");join(s,"clerk","店员");
 assert.deepEqual(dailyOverhead(s),{rent:6,heating:8,total:14});
 serveFive(s);
 assert.equal(s.phase,"summary");assert.equal(s.earnings,60);
 assert.equal(s.dayOverhead,14);assert.equal(s.dayNet,46);
 assert.equal(s.cash,146);assert.equal(s.totalOverhead,14);
 assert.equal(nextDay(s,"clerk"),false);
 assert.equal(nextDay(s,"host"),true);
 assert.equal(s.day,2);assert.equal(s.dayOverhead,0);
 assert.equal(s.dayNet,0);assert.equal(s.totalOverhead,14);
 assert.equal(validate(JSON.parse(JSON.stringify(s))),true);
});
test("manager-only insulation permanently reduces the real overhead",()=>{
 const s=initialShop();join(s,"host","店长");join(s,"clerk","店员");
 assert.equal(heatingUpgradeCost(s),36);
 assert.equal(apply(s,"clerk",{cmd:"heat"}),false);
 assert.equal(s.cash,100);
 assert.equal(apply(s,"host",{cmd:"heat"}),true);
 assert.equal(s.cash,64);assert.equal(s.upgrades.heating,1);
 assert.equal(heatingUpgradeCost(s),null);
 assert.deepEqual(dailyOverhead(s),{rent:6,heating:2,total:8});
 assert.equal(apply(s,"host",{cmd:"heat"}),true);
 assert.equal(s.cash,64,"repeated click must not pay twice");
 serveFive(s);
 assert.equal(s.cash,116);assert.equal(s.dayNet,52);
 assert.equal(s.totalOverhead,8);assert.equal(validate(s),true);
});
test("restocking reduces operating net; upgrades are separate investment",()=>{
 const s=initialShop();join(s,"host","店长");
 apply(s,"host",{cmd:"restock",sku:"tea"});
 assert.equal(apply(s,"host",{cmd:"slot",key:"shelfL1"}),true);
 assert.equal(s.dayExpenses,GOODS.tea.buy);
 assert.equal(s.cash,96);
 apply(s,"host",{cmd:"heat"});assert.equal(s.cash,60);
 serveFive(s);
 assert.equal(s.earnings,60);assert.equal(s.dayExpenses,4);
 assert.equal(s.dayNet,48);
 assert.equal(s.cash,112);
 assert.equal(nextDay(s,"host"),true);
 assert.equal(s.dayExpenses,0);assert.equal(validate(s),true);
});
test("legacy version 3 save remains valid; corrupted economy data is rejected",()=>{
 const s=initialShop();join(s,"host","店长");
 delete s.upgrades.heating;
 for(const k of ["dayExpenses","dayOverhead","dayNet","totalOverhead"])delete s[k];
 assert.equal(validate(s),true);
 assert.equal(apply(s,"host",{cmd:"heat"}),true);
 assert.equal(s.upgrades.heating,1);assert.equal(validate(s),true);
 for(const heating of [-1,2,1.5,"1",null]){
  const bad=structuredClone(s);bad.upgrades.heating=heating;
  assert.equal(validate(bad),false);
 }
 const bad=structuredClone(s);bad.dayExpenses=-1;
 assert.equal(validate(bad),false);
});
