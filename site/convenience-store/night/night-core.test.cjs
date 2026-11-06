'use strict';const assert=require('node:assert/strict');const api=require('./night-core.js');
function complete(g,bag=true){const o=g.snapshot().order;assert.ok(o);for(const id of o.items){assert.equal(g.select(id).ok,true);assert.equal(g.scan().ok,true)}assert.equal(g.charge().ok,true);assert.equal(g.handoff(bag).ok,true)}
{
 const db=new Map();const storage={getItem:k=>db.get(k),setItem:(k,v)=>db.set(k,v)};
 const g=api.create({storage});assert.equal(g.start().ok,true);
 assert.equal(g.snapshot().order.who,'夜班护士');assert.equal(g.manual().length,5);
 assert.equal(g.charge().ok,false,'cannot charge before scan');complete(g);
 assert.ok(g.snapshot().money>0);
 g.advance(98);assert.ok(g.snapshot().flags['event:door3']);
 assert.equal(g.choose('lock').ok,true);assert.equal(g.snapshot().violations,0);
 assert.equal(g.snapshot().door,'locked');g.advance(40);assert.ok(g.snapshot().flags['event:hood']);
 g.choose('silent');assert.equal(g.snapshot().violations,0);
 g.advance(40);assert.ok(g.snapshot().flags['event:self']);
 g.camera(4);assert.equal(g.snapshot().flags.sawSelf,true);g.power();assert.equal(g.snapshot().power,'on');
 g.advance(55);assert.ok(g.snapshot().flags['event:sixth']);g.camera(3);g.choose('avoid');
 g.advance(78);assert.ok(g.snapshot().flags['event:knock']);g.choose('refuseKnock');
 g.advance(34);assert.ok(g.snapshot().flags['event:call']);g.choose('ignoreCall');
 g.advance(10);assert.ok(g.snapshot().flags.archiveAvailable);g.choose('archive');
 assert.equal(g.snapshot().flags.archive,true);
 const g2=api.create({storage});assert.equal(g2.snapshot().flags.archive,true,'save restored');
 g2.advance(100);assert.equal(g2.snapshot().finished,true);assert.equal(g2.snapshot().ending,'truth');
 assert.equal(g2.snapshot().violations,0);assert.ok(g2.snapshot().wage>=480);
 console.log('PASS entire first night: original work/verified rules, door, hood, CCTV4 power, sixth, forged notes, phone, archival truth ending and save');
}
{
 const g=api.create();g.start();g.advance(98);g.choose('unlock');g.advance(30);
 g.advance(10);g.choose('greet');g.advance(32);g.camera(4);g.power();g.advance(54);g.move('cooler');
 g.advance(70);g.choose('openKnock');g.advance(32);g.choose('answerCall');g.advance(100);
 assert.equal(g.snapshot().finished,true);assert.equal(g.snapshot().ending,'replaced');
 assert.ok(g.snapshot().violations>=3);
 console.log('PASS forged instructions and repeated rule violations produce replacement ending');
}
{
 const g=api.create();g.start();g.advance(200);g.advance(67);
 assert.ok(g.snapshot().order);
 // Force legal special transaction via completing all preceding customers.
 let guard=0;while(g.snapshot().orderIndex<5&&guard++<10){if(!g.snapshot().order){g.advance(12);continue}const order=g.snapshot().order;complete(g,!order.special)}
 assert.equal(g.snapshot().orderIndex,5);
 assert.ok(g.snapshot().flags['resolved:special'],'special must be handed over WITHOUT shopping bag');
 console.log('PASS actual cash register special merchandise: salt + black milk + candle, no bag');
}
