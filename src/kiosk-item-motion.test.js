import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeldItemMotion,ITEM_PICKUP_MS,ITEM_PLACE_MS,ITEM_TAKE_MS} from './kiosk-item-motion.js';
const shop=()=>({players:{solo:{hand:null},clerk:{hand:null}},counter:null});
test('pickup becomes visible held product without changing inventory',()=>{
 const s=shop(),sample=createHeldItemMotion();sample(s,'solo',0);
 s.players.solo.hand='tea';const before=JSON.stringify(s);
 assert.equal(sample(s,'solo',100).stage,'pickup');
 const mid=sample(s,'solo',100+ITEM_PICKUP_MS/2);
 assert.ok(mid.progress>0&&mid.progress<1);
 assert.equal(sample(s,'solo',100+ITEM_PICKUP_MS).stage,'held');
 assert.equal(JSON.stringify(s),before);
});
test('placing product hides authoritative counter sprite until animation finishes',()=>{
 const s=shop(),sample=createHeldItemMotion();s.players.solo.hand='bread';
 assert.equal(sample(s,'solo',0).stage,'held');
 s.players.solo.hand=null;s.counter='bread';
 const start=sample(s,'solo',10);
 assert.equal(start.stage,'place');assert.equal(start.sku,'bread');assert.equal(start.hideCounter,true);
 assert.equal(sample(s,'solo',10+ITEM_PLACE_MS/2).hideCounter,true);
 assert.deepEqual(sample(s,'solo',10+ITEM_PLACE_MS),{stage:'empty',sku:null,progress:1,hideCounter:false});
 assert.equal(s.counter,'bread');
});
test('taking a counter item animates back to the personal hand',()=>{
 const s=shop(),sample=createHeldItemMotion();s.counter='cocoa';sample(s,'solo',0);
 s.counter=null;s.players.solo.hand='cocoa';
 assert.equal(sample(s,'solo',10).stage,'take');
 assert.equal(sample(s,'solo',10+ITEM_TAKE_MS).stage,'held');
});
test('another player selling during placement cancels the ghost sprite',()=>{
 const s=shop(),sample=createHeldItemMotion();s.players.solo.hand='tea';sample(s,'solo',0);
 s.players.solo.hand=null;s.counter='tea';assert.equal(sample(s,'solo',10).stage,'place');
 s.counter=null;assert.equal(sample(s,'solo',40).stage,'empty');
});
test('viewer switch or restored save never animates someone elses product',()=>{
 const s=shop(),sample=createHeldItemMotion();s.players.solo.hand='tea';
 assert.equal(sample(s,'solo',0).stage,'held');
 assert.equal(sample(s,'clerk',50).stage,'empty');
 s.players.clerk.hand='bread';assert.equal(sample(s,'clerk',60).stage,'pickup');
 assert.equal(sample(s,'missing',70).stage,'empty');
 assert.equal(sample(s,'solo',80).stage,'held');
});
