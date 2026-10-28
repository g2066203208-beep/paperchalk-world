import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame,availableCrew} from '../site/engine.js';
import {CONTACTS,initialOffice,normalizeOffice,dial,decideDossier,allocate,transferSafe,equip,openDoor,visitorAction,travel,advance,queueVisitor} from '../site/office-features.js';

test('actual telephone number keypad service changes stock and ledger, one-call/day limit',()=>{
 const state=initialGame(),meta=initialOffice();
 assert.equal(CONTACTS.find(c=>c.num==='305').name,'仓库供货商');
 const bad=dial(state,meta,'999');assert.equal(bad.ok,false);
 let r=dial(state,meta,'305');assert.equal(r.ok,true,r.message);
 assert.equal(r.state.cash,130);assert.equal(r.meta.supply,1);
 assert.equal(r.state.ledger[0].amount,-60);
 assert.equal(dial(r.state,r.meta,'305').ok,false);
 const m=dial(r.state,r.meta,'221');assert.equal(m.ok,true);
 assert.equal(m.meta.visitorQueue.length,2,'phone summons real visitor');
});
test('door is a stateful arrival and street entrance; visitor changes real respect',()=>{
 let s=initialGame(),m=initialOffice();
 let r=openDoor(s,m);assert.equal(r.ok,true);s=r.state;m=r.meta;
 assert.equal(m.visitor.id,'kai');assert.equal(m.doorOpen,true);
 r=visitorAction(s,m,'hear');assert.equal(r.ok,true);s=r.state;m=r.meta;
 assert.equal(s.respect,2);assert.equal(s.reports[0].title,'到访汇报');
 assert.equal(m.visitor,null);assert.equal(m.doorOpen,false);
 r=openDoor(s,m);assert.equal(r.ok,true);s=r.state;m=r.meta;
 assert.equal(m.venue,'street');
 r=travel(s,m,'harbor');assert.equal(r.ok,true);s=r.state;m=r.meta;
 assert.equal(s.cash,225);
 assert.equal(travel(s,m,'harbor').ok,false,'cannot farm repeated street visits');
 r=travel(s,m,'office');assert.equal(r.meta.venue,'office');
});
test('file approvals create an actual dispatched assignment and prevent duplicate approvals',()=>{
 let s=initialGame(),m=initialOffice();
 const r=decideDossier(s,m,'freight','approve');assert.equal(r.ok,true,r.message);
 s=r.state;m=r.meta;
 assert.equal(s.orders.length,1);
 assert.equal(s.orders[0].zone,'harbor');
 assert.equal(m.dossierStatus.freight,'approved');
 assert.equal(decideDossier(s,m,'freight','approve').ok,false);
 assert.equal(availableCrew(s).length,0);
});
test('ledger funding and supplier stock produce measurable extra mission revenue',()=>{
 let s=initialGame(),m=initialOffice();
 let r=dial(s,m,'305');s=r.state;m=r.meta;
 r=allocate(s,m,'logistics');s=r.state;m=r.meta;
 assert.equal(s.cash,90);assert.equal(m.bonus.logistics,1);
 r=decideDossier(s,m,'freight','approve');s=r.state;m=r.meta;
 r=advance(s,m);assert.equal(r.ok,true,r.message);s=r.state;m=r.meta;
 assert.equal(s.day,2);assert.equal(m.supply,0);assert.equal(m.bonus.logistics,0);
 assert.ok(s.ledger.some(x=>x.label==='运输补给和预算追加收益'&&x.amount===95));
});
test('secure drawer stores cash, retrieves cash and assigns item custody with risk',()=>{
 let s=initialGame(),m=initialOffice();
 let r=transferSafe(s,m,50);assert.equal(r.ok,true);s=r.state;m=r.meta;
 assert.equal(s.cash,140);assert.equal(m.storedCash,50);
 r=transferSafe(s,m,-50);s=r.state;m=r.meta;
 assert.equal(s.cash,190);assert.equal(m.storedCash,0);
 r=equip(s,m,'kai');assert.equal(r.ok,true);s=r.state;m=r.meta;
 assert.equal(s.heat,14);assert.equal(m.equipment,'kai');
 r=equip(s,m,'locked');assert.equal(r.ok,true);assert.equal(r.state.heat,12);
});
test('office meta can recover from malformed data and synchronizes day',()=>{
 const s=initialGame();
 assert.equal(normalizeOffice(null,s).visitorQueue[0].id,'kai');
 const m=initialOffice();m.day=99;m.contactsUsed=['supplier'];
 const restored=normalizeOffice(m,s);
 assert.equal(restored.day,s.day);assert.deepEqual(restored.contactsUsed,[]);
 assert.equal(queueVisitor(s,initialOffice(),'mio').ok,false,'unhired member cannot be summoned');
});
