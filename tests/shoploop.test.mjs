import test from 'node:test';
import assert from 'node:assert/strict';
import {ShopOpeningLoop,SHOP_KEY,PICKUP,STORE} from '../site/game/shoploop.js';
const memory=()=>{const x=new Map();return {getItem:k=>x.get(k)||null,setItem:(k,v)=>x.set(k,v)}};
test('pickup and delivery require physical proximity',()=>{
 const l=new ShopOpeningLoop(memory());
 assert.equal(l.interact(STORE).ok,false);
 assert.equal(l.interact(PICKUP).event,'pickup');
 assert.equal(l.interact(PICKUP).ok,false);
 assert.equal(l.interact(STORE).event,'delivery');
 assert.deepEqual(l.progress,{phase:'pickup',deliveries:1,cash:35,reputation:1,level:1});
});
test('upgrade, contract name and earnings persist',()=>{
 const st=memory();st.setItem('paperworld-lease-v1',JSON.stringify({shopName:'我的商店'}));
 const l=new ShopOpeningLoop(st);
 for(let i=0;i<3;i++){l.interact(PICKUP);l.interact(STORE)}
 assert.equal(l.progress.cash,105);assert.equal(l.upgrade(PICKUP).ok,false);
 assert.equal(l.upgrade(STORE).event,'upgrade');
 const next=new ShopOpeningLoop(st);
 assert.equal(next.progress.cash,25);assert.equal(next.progress.level,2);
 assert.equal(next.shopName,'我的商店');
 next.interact(PICKUP);assert.equal(next.interact(STORE).money,45);
});
test('corrupted saved economy is rejected',()=>{
 const st=memory();st.setItem(SHOP_KEY,'bad');assert.equal(new ShopOpeningLoop(st).progress.cash,0);
 st.setItem(SHOP_KEY,JSON.stringify({phase:'deliver',cash:'infinity',deliveries:-5,reputation:-2,level:999}));
 const l=new ShopOpeningLoop(st);assert.equal(l.progress.cash,0);assert.equal(l.progress.deliveries,0);
});
