import test from 'node:test';
import assert from 'node:assert/strict';
import {render,customerExpression} from './kiosk-view.js';
import {initialShop,join} from './kiosk-core.js';
const context=()=>new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
test('all fixtures and open storage targets remain 44 CSS pixels on compact phones and rotated screens',()=>{
 for(const [W,H] of [[320,568],[390,844],[568,320],[844,390],[1280,720]]){
  const s=initialShop();join(s,'solo','店长');s.windowOpen=true;s.spoken=true;s.orderIndex=1;
  for(const key of Object.keys(s.open))s.open[key]=true;
  const hits=render(context(),s,{W,H},0,'solo',{stage:'idle',visible:true,speechVisible:true});
  for(const h of hits){assert.ok(h.w>=44&&h.h>=44,`${W}x${H}: ${JSON.stringify(h)}`);assert.ok(h.x>=0&&h.y>=0&&h.x+h.w<=W+1&&h.y+h.h<=H+1);}
  for(const key of Object.keys(s.slots))assert.ok(hits.some(h=>h.cmd==='slot'&&h.key===key),key);
  for(const page of ['goods','improve']){
   const catalog=render(context(),s,{W,H},0,'solo',null,null,{catalog:true,page});
   assert.ok(catalog.every(h=>h.w>=44&&h.h>=44));
   assert.ok(!catalog.some(h=>h.cmd==='slot'),'modal book must block hidden fixtures');
  }
 }
});

test('local facial expression follows refusal, handoff and speech without changing character body',()=>{
 assert.equal(customerExpression({refusing:true,receiving:true},15),'concern');
 assert.equal(customerExpression({receiving:true},15),'smile');
 assert.equal(customerExpression({talking:true},15),'talk');
 assert.equal(customerExpression({},0),null);
 assert.equal(customerExpression({},239),'smile');
});
