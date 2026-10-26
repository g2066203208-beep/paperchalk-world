import test from "node:test";
import assert from "node:assert/strict";
import {createCustomerMotion,CUSTOMER_EXIT_MS,CUSTOMER_ENTER_MS} from "./kiosk-motion.js";
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
test("paid order change shows previous customer leaving before the next arrives",()=>{
 const s=shop(),sample=createCustomerMotion();s.windowOpen=true;
 sample(s,0);sample(s,1000);s.spoken=true;
 assert.equal(sample(s,1010).talking,true);
 s.orderIndex=1;s.spoken=false;
 const departing=sample(s,1100);
 assert.equal(departing.stage,"exit");assert.equal(departing.tone,CUSTOMERS[0].tone);
 assert.equal(departing.receiving,true);
 assert.equal(departing.handoff.sku,"tea");
 assert.equal(departing.handoff.progress,0);
 const mid=sample(s,1100+CUSTOMER_EXIT_MS/3);
 assert.ok(mid.handoff.progress>0&&mid.handoff.progress<1);
 assert.ok(sample(s,1100+CUSTOMER_EXIT_MS*.8).handoff.progress===1);
 assert.ok(sample(s,1100+CUSTOMER_EXIT_MS/2).offset<0);
 const arriving=sample(s,1100+CUSTOMER_EXIT_MS);
 assert.equal(arriving.stage,"enter");assert.equal(arriving.tone,CUSTOMERS[1].tone);
 assert.equal(arriving.receiving,false);
 assert.equal(arriving.handoff,null,"a new customer must not inherit the previous purchase");
 assert.equal(sample(s,1100+CUSTOMER_EXIT_MS+CUSTOMER_ENTER_MS).stage,"idle");
});
test("shutter close interrupts animation and re-opening starts a fresh arrival",()=>{
 const s=shop(),sample=createCustomerMotion();s.windowOpen=true;
 sample(s,100);s.orderIndex=1;sample(s,150);
 s.windowOpen=false;const closed=sample(s,170);
 assert.equal(closed.stage,"hidden");assert.equal(closed.handoff,null);
 s.windowOpen=true;const next=sample(s,200);
 assert.equal(next.stage,"enter");assert.equal(next.tone,CUSTOMERS[1].tone);
});
test("day-end departure does not introduce a new customer under summary overlay",()=>{
 const s=shop(),sample=createCustomerMotion();s.windowOpen=true;
 sample(s,0);sample(s,900);
 s.orderIndex=5;s.phase="summary";
 assert.equal(sample(s,1000).stage,"exit");
 assert.equal(sample(s,1000+CUSTOMER_EXIT_MS).visible,false);
});

test("each paid customer carries only their own requested product, without changing stock",()=>{
 const s=shop(),sample=createCustomerMotion();s.windowOpen=true;
 sample(s,0);sample(s,1000);
 const before=JSON.stringify(s);
 s.orderIndex=1;
 const first=sample(s,1100);
 assert.equal(first.handoff.sku,"tea");
 sample(s,1100+CUSTOMER_EXIT_MS+CUSTOMER_ENTER_MS);
 s.orderIndex=2;
 const second=sample(s,2500);
 assert.equal(second.handoff.sku,"bread");
 assert.equal(second.handoff.progress,0);
 assert.equal(s.orderIndex,2);
 assert.equal(s.windowOpen,true);
 assert.equal(JSON.stringify({...s,orderIndex:1}),before.replace('"orderIndex":0','"orderIndex":1'),
  "motion must not write to shared shop state");
});
