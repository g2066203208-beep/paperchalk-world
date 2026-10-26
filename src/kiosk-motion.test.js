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
 assert.ok(sample(s,1100+CUSTOMER_EXIT_MS/2).offset<0);
 const arriving=sample(s,1100+CUSTOMER_EXIT_MS);
 assert.equal(arriving.stage,"enter");assert.equal(arriving.tone,CUSTOMERS[1].tone);
 assert.equal(arriving.receiving,false);
 assert.equal(sample(s,1100+CUSTOMER_EXIT_MS+CUSTOMER_ENTER_MS).stage,"idle");
});
test("shutter close interrupts animation and re-opening starts a fresh arrival",()=>{
 const s=shop(),sample=createCustomerMotion();s.windowOpen=true;
 sample(s,100);s.orderIndex=1;sample(s,150);
 s.windowOpen=false;assert.equal(sample(s,170).stage,"hidden");
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
