import test from "node:test";
import assert from "node:assert/strict";
import {initialShop,GOODS,FIXTURES,join,apply,nextDay,visible,validate,visitor} from "./kiosk-core.js";
test("a hatch must open before speaking or selling",()=>{
 const g=initialShop();join(g,"host","店长");
 assert.equal(apply(g,"host",{cmd:"talk"}),false);
 assert.equal(apply(g,"host",{cmd:"window"}),true);
 assert.equal(g.windowOpen,true);
 assert.equal(apply(g,"host",{cmd:"talk"}),true);
 assert.equal(g.spoken,true);
 assert.equal(apply(g,"host",{cmd:"window"}),true);
 assert.equal(g.windowOpen,false);
});
test("all shelves cabinets and drawers have independent bounded capacity",()=>{
 const g=initialShop();join(g,"host","老板");
 for(const key of Object.keys(FIXTURES))assert.ok(g.slots[key]);
 assert.equal(visible(g,"cabinetL"),false);
 assert.equal(apply(g,"host",{cmd:"toggle",key:"cabinetL"}),true);
 assert.equal(visible(g,"cabinetL"),true);
 assert.equal(apply(g,"host",{cmd:"toggle",key:"cabinetL"}),true);
 assert.equal(visible(g,"cabinetL"),false);
 assert.equal(apply(g,"host",{cmd:"slot",key:"cabinetL"}),false);
 assert.equal(validate(g),true);
});
test("physical shelf -> hand -> counter -> wrong product -> return -> correct paid sale",()=>{
 const g=initialShop();join(g,"host","店长");join(g,"guest","店员");
 const start=g.cash;
 assert.equal(apply(g,"guest",{cmd:"slot",key:"shelfR1"}),true);
 assert.equal(g.hand,"battery");assert.equal(g.slots.shelfR1.qty,1);
 assert.equal(apply(g,"guest",{cmd:"counter"}),true);
 assert.equal(g.counter,"battery");
 apply(g,"host",{cmd:"window"});
 assert.equal(apply(g,"host",{cmd:"sell"}),false);
 assert.equal(g.totalServed,0);assert.equal(g.cash,start);
 assert.equal(apply(g,"guest",{cmd:"counter"}),true);
 assert.equal(g.hand,"battery");
 assert.equal(apply(g,"guest",{cmd:"slot",key:"shelfR1"}),true);
 assert.equal(g.slots.shelfR1.qty,2);
 apply(g,"guest",{cmd:"slot",key:"shelfL1"});
 assert.equal(g.hand,"tea");
 apply(g,"guest",{cmd:"counter"});
 assert.equal(apply(g,"host",{cmd:"sell"}),true);
 assert.equal(g.totalServed,1);assert.equal(g.cash,start+GOODS.tea.price);
 assert.equal(g.counter,null);assert.equal(validate(g),true);
});
test("restock costs money, respects SKU occupancy and volume limits",()=>{
 const g=initialShop();join(g,"host","老板");
 const old=g.cash;
 apply(g,"host",{cmd:"restock",sku:"bread"});
 assert.equal(apply(g,"host",{cmd:"slot",key:"shelfL1"}),false,"cannot mix different products");
 assert.equal(g.cash,old);
 assert.equal(apply(g,"host",{cmd:"slot",key:"shelfR2"}),true);
 assert.equal(g.slots.shelfR2.sku,"bread");
 assert.equal(g.cash,old-GOODS.bread.buy);
 apply(g,"host",{cmd:"restock",sku:"bread"});
 apply(g,"host",{cmd:"slot",key:"shelfR2"});
 assert.equal(g.slots.shelfR2.qty,2);
 apply(g,"host",{cmd:"restock",sku:"bread"});
 assert.equal(apply(g,"host",{cmd:"slot",key:"shelfR2"}),false,"size 2 in capacity 4");
 assert.equal(validate(g),true);
});
test("five visitors can be served, day advances, and JSON saves are recoverable",()=>{
 const g=initialShop();join(g,"host","老板");apply(g,"host",{cmd:"window"});
 for(let i=0;i<5;i++){
  const requested=visitor(g).sku;
  let found=Object.keys(g.slots).find(key=>g.slots[key].sku===requested&&g.slots[key].qty>0);
  if(!found){
   apply(g,"host",{cmd:"restock",sku:requested});
   const candidate=Object.keys(g.slots).find(key=>visible(g,key)&&(!g.slots[key].sku||g.slots[key].sku===requested)&&g.slots[key].qty<Math.floor(FIXTURES[key].capacity/GOODS[requested].size));
   assert.ok(candidate);
   apply(g,"host",{cmd:"slot",key:candidate});
   found=candidate;
  }
  if(!visible(g,found))apply(g,"host",{cmd:"toggle",key:found});
  assert.equal(apply(g,"host",{cmd:"slot",key:found}),true);
  assert.equal(g.hand,requested);
  apply(g,"host",{cmd:"counter"});
  assert.equal(apply(g,"host",{cmd:"sell"}),true);
 }
 assert.equal(g.phase,"summary");assert.equal(g.served,5);
 const resumed=JSON.parse(JSON.stringify(g));assert.equal(validate(resumed),true);
 assert.equal(nextDay(resumed,"host"),true);
 assert.equal(resumed.day,2);assert.equal(resumed.totalServed,5);
});
