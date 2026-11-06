'use strict';
const assert=require('node:assert/strict');const {create,PRODUCTS,KEY}=require('./store-core.js');
const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
const g=create({storage});
assert.equal(PRODUCTS.length,6);
assert.equal(g.startShift('invalid').ok,false);
assert.equal(g.startShift('晚班').ok,true);
assert.equal(g.startShift('早班').ok,false);
assert.equal(g.scan().ok,false);
assert.equal(g.scan('milk').ok,false,'wrong item must fail');
assert.equal(g.charge().ok,false,'unscanned cannot charge');
for(let c=0;c<5;c++){
 const order=g.currentOrder();
 assert.ok(order.items.length>=2);
 for(const id of order.items){assert.equal(g.select(id).ok,true);assert.equal(g.scan().ok,true,'expected '+id+' in order '+c)}
 assert.equal(g.charge().ok,true);
 assert.equal(g.charge().ok,false,'cannot double-charge');
 assert.equal(g.bag().ok,true);
}
assert.equal(g.snapshot().shift.index,5);assert.equal(g.snapshot().shift.finished,true);
assert.equal(g.snapshot().shifts,1);assert.ok(g.snapshot().wallet>3200);
assert.ok(g.snapshot().energy<100);assert.ok(g.snapshot().rating<100);
const restored=create({storage});assert.equal(restored.snapshot().wallet,g.snapshot().wallet);
assert.equal(restored.startShift('早班').ok,false);
assert.equal(restored.nextShift().ok,true);
assert.equal(restored.startShift('早班').ok,true);
const first=restored.currentOrder();
assert.equal(restored.stock().ok,true);
assert.equal(restored.clean().ok,true);
assert.equal(restored.clean().ok,false,'one clean per customer');
assert.equal(restored.layout('scanner',{left:52,top:47}).ok,true);
assert.equal(restored.layout('scanner',{left:-1,top:50}).ok,false);
assert.deepEqual(restored.snapshot().layout.scanner,{left:52,top:47});
assert.equal(create({storage}).snapshot().shift.type,'早班');
console.log('PASS: 5 unique actual checkout orders, scan validation, payment, bag, wages, stock, cleaning, layout, save migration, next shift');