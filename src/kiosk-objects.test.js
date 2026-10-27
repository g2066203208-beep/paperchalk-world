import test from 'node:test';import assert from 'node:assert/strict';
import {initialShop,join,apply,leave,resumeSolo,validate} from './kiosk-core.js';
import {objectsAt,reconcileObjects,validateObjects} from './kiosk-objects.js';
test('legacy quantity saves migrate to stable individual units and exact clicked unit survives transfers and reload',()=>{
 const s=initialShop();join(s,'a','甲');join(s,'b','乙');
 const [first,second]=objectsAt(s,'slot:shelfL1');assert.notEqual(first.id,second.id);
 assert.ok(apply(s,'a',{cmd:'slot',key:'shelfL1',itemId:first.id}));
 assert.equal(objectsAt(s,'hand:a')[0].id,first.id);assert.equal(objectsAt(s,'slot:shelfL1')[0].socket,second.socket);assert.equal(objectsAt(s,'slot:shelfL1')[0].id,second.id);
 assert.equal(apply(s,'b',{cmd:'slot',key:'shelfL1',itemId:first.id}),false,'stale unit cannot be grabbed by two workers');
 assert.ok(apply(s,'a',{cmd:'counter'}));assert.equal(objectsAt(s,'counter')[0].id,first.id);
 assert.ok(apply(s,'b',{cmd:'counter'}));assert.equal(objectsAt(s,'hand:b')[0].id,first.id);
 const saved=JSON.parse(JSON.stringify(s));resumeSolo(saved,'店长');assert.equal(objectsAt(saved,'hand:solo')[0].id,first.id);assert.ok(validate(saved));
});
test('sold units disappear once, restocks get new identities and leaver-held units return to real storage',()=>{
 const s=initialShop();join(s,'a','甲');const id=objectsAt(s,'slot:shelfL1')[0].id;
 apply(s,'a',{cmd:'window'});apply(s,'a',{cmd:'slot',key:'shelfL1',itemId:id});apply(s,'a',{cmd:'counter'});apply(s,'a',{cmd:'sell'});
 assert.equal(s.physicalItems[id],undefined);assert.equal(s.served,1);
 const old=new Set(Object.keys(s.physicalItems));apply(s,'a',{cmd:'restock',sku:'tea'});apply(s,'a',{cmd:'slot',key:'shelfL1'});
 const added=Object.keys(s.physicalItems).filter(id=>!old.has(id));assert.equal(added.length,1);
 apply(s,'a',{cmd:'slot',key:'shelfL1',itemId:added[0]});leave(s,'a');assert.equal(s.physicalItems[added[0]].place,'slot:shelfL1');assert.ok(validateObjects(s));
});
test('duplicate physical placements are invalid even if quantities look right',()=>{
 const s=initialShop();reconcileObjects(s);const units=objectsAt(s,'slot:shelfL1');s.physicalItems[units[1].id].index=0;assert.equal(validateObjects(s),false);
});

test('remaining merchandise keeps its physical socket and dimensions after another unit is picked up',async()=>{
 const {sceneObjectRects}=await import('./kiosk-view.js');const s=initialShop();join(s,'a','甲');const [first,second]=objectsAt(s,'slot:shelfL1');const rect=sceneObjectRects(s).find(v=>v.id===second.id);
 apply(s,'a',{cmd:'slot',key:'shelfL1',itemId:first.id});const after=sceneObjectRects(s).find(v=>v.id===second.id);
 for(const key of ['x','y','w','h'])assert.equal(after[key],rect[key]);
 apply(s,'a',{cmd:'slot',key:'shelfL1'});assert.equal(s.physicalItems[first.id].socket,first.socket);
});
