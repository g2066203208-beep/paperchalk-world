import test from 'node:test';import assert from 'node:assert/strict';
import {SHOP,SHOP_WORLD,cameraTarget,screenPoint,worldPoint,clampCamera} from './kiosk-shop-layout.js';
import {customerExpression,render,sceneObjectRects} from './kiosk-view.js';
import {initialShop,join} from './kiosk-core.js';
const context=()=>new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
test('rotation changes view only: all item and fixture world coordinates remain identical',()=>{
 const s=initialShop();join(s,'solo','店长');const original=JSON.stringify(SHOP),units=JSON.stringify(sceneObjectRects(s));
 for(const [W,H] of [[320,568],[390,844],[568,320],[844,390],[1280,720]]){
  for(const key of ['front','counter',...SHOP.shelves.map(v=>v.key),...SHOP.drawers.map(v=>v.key),...SHOP.cabinets.map(v=>v.key)]){
   const c=cameraTarget(W,H,key),p={x:1055,y:940},back=worldPoint(screenPoint(p,c,W,H),c,W,H);
   assert.ok(Math.abs(back.x-p.x)<1e-8&&Math.abs(back.y-p.y)<1e-8);
   const hx=W/(2*c.z),hy=(H-56)/(2*c.z);assert.ok(c.x-hx>=-1e-6&&c.x+hx<=SHOP_WORLD.w+1e-6&&c.y-hy>=-1e-6&&c.y+hy<=SHOP_WORLD.h+1e-6);
   const hits=render(context(),s,{W,H},0,'solo',null,null,{camera:c});
   assert.ok(hits.every(h=>h.w>=44&&h.h>=44));
  }
  assert.equal(JSON.stringify(SHOP),original);assert.equal(JSON.stringify(sceneObjectRects(s)),units);
 }
});
test('offscreen objects have no live hitbox, focused objects expose individual IDs',()=>{
 const s=initialShop();join(s,'solo','店长');const c=cameraTarget(390,844,'shelfL1');
 const hits=render(context(),s,{W:390,H:844},0,'solo',null,null,{camera:c});
 const units=hits.filter(h=>h.cmd==='slot'&&h.key==='shelfL1'&&h.itemId);assert.equal(units.length,2);assert.notEqual(units[0].itemId,units[1].itemId);
 assert.ok(!hits.some(h=>h.cmd==='slot'&&h.key==='shelfR1'));
});
test('local facial state follows refusal, handoff and speech',()=>{assert.equal(customerExpression({refusing:true},0),'concern');assert.equal(customerExpression({receiving:true},0),'smile');assert.equal(customerExpression({talking:true},15),'talk');});
