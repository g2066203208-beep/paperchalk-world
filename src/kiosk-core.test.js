import test from "node:test";
import assert from "node:assert/strict";
import {initialShop,GOODS,FIXTURES,join,apply,nextDay,visible,validate,visitor,leave,resumeSolo} from "./kiosk-core.js";
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
 assert.equal(g.players.guest.hand,"battery");assert.equal(g.slots.shelfR1.qty,1);
 assert.equal(apply(g,"guest",{cmd:"counter"}),true);
 assert.equal(g.counter,"battery");
 apply(g,"host",{cmd:"window"});
 assert.equal(apply(g,"host",{cmd:"sell"}),true,"wrong item warning synchronizes");
 assert.equal(g.totalServed,0);assert.equal(g.cash,start);assert.equal(g.mistakes,1);
 assert.equal(apply(g,"guest",{cmd:"counter"}),true);
 assert.equal(g.players.guest.hand,"battery");
 assert.equal(apply(g,"guest",{cmd:"slot",key:"shelfR1"}),true);
 assert.equal(g.slots.shelfR1.qty,2);
 apply(g,"guest",{cmd:"slot",key:"shelfL1"});
 assert.equal(g.players.guest.hand,"tea");
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
  assert.equal(g.players.host.hand,requested);
  apply(g,"host",{cmd:"counter"});
  assert.equal(apply(g,"host",{cmd:"sell"}),true);
 }
 assert.equal(g.phase,"summary");assert.equal(g.served,5);
 const resumed=JSON.parse(JSON.stringify(g));assert.equal(validate(resumed),true);
 assert.equal(nextDay(resumed,"host"),true);
 assert.equal(resumed.day,2);assert.equal(resumed.totalServed,5);
});

test("two hands and manager-only restock remain isolated",()=>{
 const s=initialShop();join(s,"host","店长");join(s,"guest","店员");
 assert.equal(s.players.host.role,"manager");assert.equal(s.players.guest.role,"clerk");
 assert.equal(apply(s,"guest",{cmd:"restock",sku:"tea"}),false);
 assert.equal(apply(s,"host",{cmd:"restock",sku:"tea"}),true);
 apply(s,"guest",{cmd:"slot",key:"shelfL3"});
 assert.equal(s.cash,100);assert.equal(s.slots.shelfL3.qty,0);
 apply(s,"host",{cmd:"slot",key:"shelfL3"});assert.equal(s.cash,96);
 apply(s,"host",{cmd:"slot",key:"shelfL2"});
 apply(s,"guest",{cmd:"slot",key:"shelfL1"});
 assert.equal(s.players.host.hand,"bread");assert.equal(s.players.guest.hand,"tea");
 apply(s,"host",{cmd:"counter"});
 assert.equal(apply(s,"guest",{cmd:"counter"}),false);
 assert.equal(s.players.guest.hand,"tea");
 assert.equal(validate(s),true);
});
test("leave restores stock and resume preserves old and new v3 hands",()=>{
 const s=initialShop();join(s,"host","店长");join(s,"guest","店员");
 apply(s,"guest",{cmd:"slot",key:"shelfL1"});
 leave(s,"guest");assert.equal(s.slots.shelfL1.qty,2);
 join(s,"guest2","店员2");
 apply(s,"host",{cmd:"slot",key:"shelfL1"});
 apply(s,"guest2",{cmd:"slot",key:"shelfL2"});
 resumeSolo(s,"店长");
 assert.equal(s.players.solo.hand,"tea");assert.equal(s.slots.shelfL2.qty,2);
 const old=initialShop();old.hand="cocoa";old.selectedRestock="bread";
 resumeSolo(old,"店长");
 assert.equal(old.players.solo.hand,"cocoa");assert.equal(old.players.solo.restock,"bread");
});


test("optional neighbor commission consumes a real item once without replacing the main sale",()=>{
 const s=initialShop();join(s,"host","店长");join(s,"guest","店员");
 apply(s,"host",{cmd:"window"});
 // First visitor has no side request; serve their main tea order.
 apply(s,"host",{cmd:"slot",key:"shelfL1"});
 apply(s,"host",{cmd:"counter"});
 assert.equal(apply(s,"host",{cmd:"sell"}),true);
 const request=visitor(s).favor;
 assert.deepEqual({sku:request.sku,tip:request.tip},{sku:"tea",tip:8});
 assert.equal(s.favorDone,false);
 // The optional task is separate from the bread order.
 assert.equal(apply(s,"guest",{cmd:"commission"}),true);
 assert.equal(s.cash,109,"unspoken request pays nothing");
 apply(s,"guest",{cmd:"talk"});
 apply(s,"host",{cmd:"slot",key:"shelfL2"});
 apply(s,"host",{cmd:"counter"});
 assert.equal(apply(s,"guest",{cmd:"commission"}),true);
 assert.equal(s.counter,"bread","wrong SKU stays on counter");
 assert.equal(s.cash,109);
 apply(s,"host",{cmd:"counter"});
 apply(s,"host",{cmd:"slot",key:"shelfL2"});
 apply(s,"guest",{cmd:"slot",key:"shelfL1"});
 apply(s,"guest",{cmd:"counter"});
 assert.equal(apply(s,"guest",{cmd:"commission"}),true);
 assert.equal(s.cash,117);
 assert.equal(s.counter,null);
 assert.equal(s.favorDone,true);
 assert.equal(s.favorCount,1);assert.equal(s.favorTips,8);assert.equal(s.totalFavors,1);
 assert.equal(apply(s,"host",{cmd:"commission"}),true);
 assert.equal(s.cash,117,"second worker cannot collect same tip twice");
 assert.equal(s.totalFavors,1);
 apply(s,"host",{cmd:"slot",key:"shelfL2"});
 apply(s,"host",{cmd:"counter"});
 assert.equal(apply(s,"guest",{cmd:"sell"}),true);
 assert.equal(s.cash,129);
 assert.equal(s.favorDone,false,"next visitor has a fresh request");
 assert.equal(s.totalServed,2);
 assert.equal(validate(JSON.parse(JSON.stringify(s))),true);
});
test("legacy version 3 saves gain optional commission counters without migration or lost stock",()=>{
 const s=initialShop();join(s,"host","店长");
 delete s.favorDone;delete s.favorCount;delete s.favorTips;delete s.totalFavors;
 const old=JSON.parse(JSON.stringify(s));
 assert.equal(validate(old),true);
 apply(old,"host",{cmd:"window"});
 apply(old,"host",{cmd:"slot",key:"shelfL1"});apply(old,"host",{cmd:"counter"});
 apply(old,"host",{cmd:"sell"});
 apply(old,"host",{cmd:"talk"});
 apply(old,"host",{cmd:"slot",key:"shelfL1"});apply(old,"host",{cmd:"counter"});
 apply(old,"host",{cmd:"commission"});
 assert.equal(old.favorCount,1);assert.equal(old.favorTips,8);
 assert.equal(old.totalFavors,1);assert.equal(old.favorDone,true);
 assert.equal(old.slots.shelfL2.qty,2);
 assert.equal(validate(old),true);
});

test("physical reorder identity survives a sold-out shelf and legacy v3 save",()=>{
 const s=initialShop();join(s,"solo","店长");
 assert.equal(s.slots.shelfL1.lastSku,"tea");
 assert.equal(apply(s,"solo",{cmd:"slot",key:"shelfL1"}),true);
 assert.equal(apply(s,"solo",{cmd:"counter"}),true);
 assert.equal(apply(s,"solo",{cmd:"window"}),true);
 assert.equal(apply(s,"solo",{cmd:"sell"}),true);
 assert.equal(apply(s,"solo",{cmd:"slot",key:"shelfL1"}),true);
 assert.equal(s.slots.shelfL1.qty,0);
 assert.equal(s.slots.shelfL1.sku,null);
 assert.equal(s.slots.shelfL1.lastSku,"tea","a physically empty shelf keeps its reorder identity");
 assert.equal(apply(s,"solo",{cmd:"counter"}),true,"place the last tea on the real counter before ordering");
 assert.equal(apply(s,"solo",{cmd:"restock",sku:"tea"}),true);
 const cash=s.cash;
 assert.equal(apply(s,"solo",{cmd:"slot",key:"shelfL1"}),true);
 assert.equal(s.slots.shelfL1.qty,1);
 assert.equal(s.cash,cash-GOODS.tea.buy);
 assert.equal(validate(s),true);
 const legacy=structuredClone(s);
 for(const v of Object.values(legacy.slots))delete v.lastSku;
 assert.equal(validate(legacy),true,"previous version-3 saves remain readable");
});
