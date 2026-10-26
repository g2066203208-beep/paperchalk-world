import test from "node:test";
import assert from "node:assert/strict";
import {createCustomerMotion,CUSTOMER_HANDOFF_MS,CUSTOMER_FAVOR_MS,CUSTOMER_EXIT_MS,CUSTOMER_ENTER_MS} from "./kiosk-motion.js";
import {CUSTOMERS} from "./kiosk-core.js";
const shop=()=>({windowOpen:false,orderIndex:0,spoken:false,phase:"operating"});
test("closed window hides visitor; opening brings an independent sprite into view",()=>{
 const s=shop(),sample=createCustomerMotion();
 assert.equal(sample(s,0).visible,false);
 s.windowOpen=true;
 const start=sample(s,100);
 assert.equal(start.stage,"enter");assert.equal(start.tone,CUSTOMERS[0].tone);
 assert.ok(start.offset>.7);
 const halfway=sample(s,100+CUSTOMER_ENTER_MS/2);
 assert.ok(halfway.offset>0&&halfway.offset<start.offset);
 assert.equal(sample(s,100+CUSTOMER_ENTER_MS).stage,"idle");
});
test("paid order waits for physical item handoff before the customer walks away",()=>{
 const s=shop(),sample=createCustomerMotion();s.windowOpen=true;
 sample(s,0);sample(s,1000);s.spoken=true;
 assert.equal(sample(s,1010).talking,true);
 s.orderIndex=1;s.spoken=false;
 const start=sample(s,1100);
 assert.equal(start.stage,"handoff");assert.equal(start.tone,CUSTOMERS[0].tone);
 assert.equal(start.receiving,true);assert.equal(start.offset,0);
 assert.equal(start.handoff.sku,"tea");assert.equal(start.handoff.progress,0);
 const mid=sample(s,1100+CUSTOMER_HANDOFF_MS/2);
 assert.equal(mid.stage,"handoff");
 assert.ok(mid.handoff.progress>0&&mid.handoff.progress<1);
 assert.equal(mid.offset,0,"customer must not leave before receiving the item");
 const departing=sample(s,1100+CUSTOMER_HANDOFF_MS);
 assert.equal(departing.stage,"exit");
 assert.equal(departing.handoff.progress,1);
 assert.ok(sample(s,1100+CUSTOMER_HANDOFF_MS+CUSTOMER_EXIT_MS/2).offset<0);
 const arriving=sample(s,1100+CUSTOMER_HANDOFF_MS+CUSTOMER_EXIT_MS);
 assert.equal(arriving.stage,"enter");assert.equal(arriving.tone,CUSTOMERS[1].tone);
 assert.equal(arriving.receiving,false);
 assert.equal(arriving.handoff,null,"next customer cannot inherit the old purchase");
 assert.equal(sample(s,1100+CUSTOMER_HANDOFF_MS+CUSTOMER_EXIT_MS+CUSTOMER_ENTER_MS).stage,"idle");
});
test("closing shutter interrupts sale animation and reopening starts a fresh arrival",()=>{
 const s=shop(),sample=createCustomerMotion();s.windowOpen=true;
 sample(s,100);s.orderIndex=1;sample(s,150);
 s.windowOpen=false;const closed=sample(s,170);
 assert.equal(closed.stage,"hidden");assert.equal(closed.handoff,null);
 s.windowOpen=true;const next=sample(s,200);
 assert.equal(next.stage,"enter");assert.equal(next.tone,CUSTOMERS[1].tone);
});
test("last sale finishes handing off and departing without introducing a new customer",()=>{
 const s=shop(),sample=createCustomerMotion();s.windowOpen=true;
 sample(s,0);sample(s,900);
 s.orderIndex=5;s.phase="summary";
 assert.equal(sample(s,1000).stage,"handoff");
 assert.equal(sample(s,1000+CUSTOMER_HANDOFF_MS).stage,"exit");
 assert.equal(sample(s,1000+CUSTOMER_HANDOFF_MS+CUSTOMER_EXIT_MS).visible,false);
});
test("handoff uses the previous customer's product and never writes shared stock",()=>{
 const s=shop(),sample=createCustomerMotion();s.windowOpen=true;
 sample(s,0);sample(s,1000);
 const before=JSON.stringify(s);
 s.orderIndex=1;
 const first=sample(s,1100);
 assert.equal(first.handoff.sku,"tea");
 sample(s,1100+CUSTOMER_HANDOFF_MS+CUSTOMER_EXIT_MS+CUSTOMER_ENTER_MS);
 s.orderIndex=2;
 const second=sample(s,3300);
 assert.equal(second.stage,"handoff");
 assert.equal(second.handoff.sku,"bread");
 assert.equal(second.handoff.progress,0);
 assert.equal(JSON.stringify({...s,orderIndex:0}),before,
  "presentation sampling must not write to the shop model");
});

test("neighbor commission hands over the requested physical SKU without moving to next customer",()=>{
 const s=shop(),sample=createCustomerMotion();s.windowOpen=true;s.orderIndex=1;s.favorDone=false;
 sample(s,0);assert.equal(sample(s,1000).stage,"idle");
 const before=JSON.stringify(s);
 s.favorDone=true;
 const start=sample(s,1100);
 assert.equal(start.stage,"favor");assert.equal(start.tone,CUSTOMERS[1].tone);
 assert.equal(start.receiving,true);assert.equal(start.offset,0);
 assert.deepEqual(start.handoff,{sku:"tea",progress:0});
 const mid=sample(s,1100+CUSTOMER_FAVOR_MS/2);
 assert.equal(mid.stage,"favor");
 assert.ok(mid.handoff.progress>0&&mid.handoff.progress<1);
 assert.equal(mid.offset,0);
 assert.equal(sample(s,1100+CUSTOMER_FAVOR_MS).stage,"idle");
 assert.equal(sample(s,2000).handoff,null,"commission animation runs only once");
 assert.equal(s.orderIndex,1,"commission must not advance the paid order");
 assert.equal(JSON.stringify({...s,favorDone:false}),before,"animation never mutates host state");
});
test("joining after a completed commission must not replay an old delivery",()=>{
 const s=shop();s.windowOpen=true;s.orderIndex=1;s.favorDone=true;
 const sample=createCustomerMotion();
 assert.equal(sample(s,0).stage,"enter");
 assert.equal(sample(s,1000).stage,"idle");
 assert.equal(sample(s,1000).handoff,null);
});
test("sale immediately after a commission interrupts the favor animation without duplicate merchandise",()=>{
 const s=shop(),sample=createCustomerMotion();s.windowOpen=true;s.orderIndex=1;
 sample(s,0);sample(s,1000);
 s.favorDone=true;assert.equal(sample(s,1100).stage,"favor");
 s.orderIndex=2;s.favorDone=false;
 const sale=sample(s,1200);
 assert.equal(sale.stage,"handoff");
 assert.equal(sale.handoff.sku,"bread","the previous customer's main order takes precedence");
 assert.equal(sale.handoff.progress,0);
 assert.equal(sample(s,1200+CUSTOMER_HANDOFF_MS).stage,"exit");
});

test("wrong item produces a visible refusal pose and resets without changing inventory",()=>{
 const s=shop(),sample=createCustomerMotion();s.windowOpen=true;
 sample(s,0);assert.equal(sample(s,1000).stage,"idle");
 s.wrongAttempted=true;
 const before=JSON.stringify(s),refusal=sample(s,1010);
 assert.equal(refusal.stage,"idle");assert.equal(refusal.refusing,true);
 assert.equal(refusal.receiving,false);assert.equal(refusal.handoff,null);
 assert.equal(JSON.stringify(s),before,"animation never changes authoritative shop state");
 s.wrongAttempted=false;assert.equal(sample(s,1020).refusing,false);
 s.wrongAttempted=true;s.orderIndex=1;
 assert.equal(sample(s,1100).stage,"handoff");
 assert.equal(sample(s,1100).refusing,false,"handoff overrides the previous refusal");
 s.wrongAttempted=false; // Host resets this on a successful sale.
 assert.equal(sample(s,1100+CUSTOMER_HANDOFF_MS+CUSTOMER_EXIT_MS+CUSTOMER_ENTER_MS).refusing,false,
  "next customer must not inherit the previous refusal pose");
});
