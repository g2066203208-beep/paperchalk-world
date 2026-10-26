import test from "node:test";
import assert from "node:assert/strict";
import {initialShop,join,apply,validate,slotRoom,shelfUpgradeCost} from "./kiosk-core.js";

test("only the manager can spend shared cash on permanent shelf capacity",()=>{
 const s=initialShop();join(s,"host","店长");join(s,"clerk","店员");
 assert.equal(slotRoom("shelfL1","tea",s),3);
 assert.equal(slotRoom("drawerL","tea",s),4);
 assert.equal(shelfUpgradeCost(s),35);
 assert.equal(apply(s,"clerk",{cmd:"upgrade"}),false);
 assert.equal(s.cash,100);
 assert.equal(apply(s,"host",{cmd:"upgrade"}),true);
 assert.equal(s.cash,65);
 assert.equal(s.upgrades.shelves,1);
 assert.equal(slotRoom("shelfL1","tea",s),5);
 assert.equal(slotRoom("shelfL2","bread",s),3);
 assert.equal(slotRoom("drawerL","tea",s),4,"drawers do not magically expand");
 assert.equal(shelfUpgradeCost(s),70);
 assert.equal(validate(JSON.parse(JSON.stringify(s))),true);
});

test("second tier requires revenue; max tier never charges twice",()=>{
 const s=initialShop();join(s,"host","店长");
 apply(s,"host",{cmd:"upgrade"});
 assert.equal(apply(s,"host",{cmd:"upgrade"}),true,"insufficient cash returns visible feedback");
 assert.equal(s.upgrades.shelves,1);
 assert.equal(s.cash,65);
 assert.match(s.notice,/不足/);
 s.cash+=5;
 assert.equal(apply(s,"host",{cmd:"upgrade"}),true);
 assert.equal(s.cash,0);
 assert.equal(s.upgrades.shelves,2);
 assert.equal(slotRoom("shelfL1","tea",s),7);
 assert.equal(shelfUpgradeCost(s),null);
 assert.equal(apply(s,"host",{cmd:"upgrade"}),true);
 assert.equal(s.cash,0);
 assert.equal(s.upgrades.shelves,2);
 assert.equal(validate(s),true);
});

test("extra physical stock fits only after upgrade, never beyond upgraded volume",()=>{
 const s=initialShop();join(s,"host","店长");
 apply(s,"host",{cmd:"restock",sku:"tea"});
 apply(s,"host",{cmd:"slot",key:"shelfL1"});
 assert.equal(s.slots.shelfL1.qty,3);
 apply(s,"host",{cmd:"restock",sku:"tea"});
 assert.equal(apply(s,"host",{cmd:"slot",key:"shelfL1"}),false);
 assert.equal(s.slots.shelfL1.qty,3);
 assert.equal(s.cash,96);
 apply(s,"host",{cmd:"upgrade"});
 for(let i=0;i<2;i++){
  apply(s,"host",{cmd:"restock",sku:"tea"});
  assert.equal(apply(s,"host",{cmd:"slot",key:"shelfL1"}),true);
 }
 assert.equal(s.slots.shelfL1.qty,5);
 apply(s,"host",{cmd:"restock",sku:"tea"});
 assert.equal(apply(s,"host",{cmd:"slot",key:"shelfL1"}),false);
 assert.equal(s.slots.shelfL1.qty,5);
 assert.equal(validate(s),true);
});

test("legacy version 3 save upgrades without migration and rejects corrupted tiers",()=>{
 const s=initialShop();join(s,"host","店长");
 delete s.upgrades;
 assert.equal(validate(s),true);
 assert.equal(slotRoom("shelfR1","battery",s),3);
 assert.equal(apply(s,"host",{cmd:"upgrade"}),true);
 assert.equal(s.upgrades.shelves,1);
 assert.equal(validate(s),true);
 for(const invalid of [-1,3,1.5,"2",null]){
  const bad=JSON.parse(JSON.stringify(s));bad.upgrades={shelves:invalid};
  assert.equal(validate(bad),false);
 }
});
