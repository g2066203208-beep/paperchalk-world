import test from "node:test";
import assert from "node:assert/strict";
import {initialShop,join,apply,leave,resumeSolo,validate,nextDay} from "./kiosk-core.js";
import {BUSINESS_REGISTRY,availableBusinesses,businessUnlocked,recyclingOffer,recyclingState,RECYCLING} from "./kiosk-business.js";

const start=()=>{const s=initialShop();join(s,"host","店长");join(s,"clerk","店员");apply(s,"host",{cmd:"window"});return s;};
const firstSale=s=>{
 apply(s,"host",{cmd:"slot",key:"shelfL1"});
 apply(s,"host",{cmd:"counter"});
 assert.equal(apply(s,"host",{cmd:"sell"}),true);
};

test("registry defines independent real workflows and unlocks recycling only after a sale",()=>{
 const s=start();
 assert.deepEqual(availableBusinesses(s).map(x=>x.id),["retail"]);
 assert.notDeepEqual(BUSINESS_REGISTRY.retail.steps,BUSINESS_REGISTRY.recycling.steps);
 assert.equal(apply(s,"host",{cmd:"recycleReceive"}),false);
 firstSale(s);
 assert.equal(businessUnlocked(s,"recycling"),true);
 assert.deepEqual(availableBusinesses(s).map(x=>x.id),["retail","recycling"]);
 assert.equal(recyclingOffer(s),true);
});
test("battery recycling has physical take-store-dispatch workflow, expenses and one-time batch settlement",()=>{
 const s=start();firstSale(s);
 const cash=s.cash,rev=s.earnings,exp=s.dayExpenses;
 assert.equal(apply(s,"clerk",{cmd:"recycleReceive"}),true);
 assert.equal(s.cash,cash-1);assert.equal(s.dayExpenses,exp+1);
 assert.equal(recyclingState(s).carriedBy,"clerk");
 assert.equal(apply(s,"clerk",{cmd:"recycleReceive"}),false,"one battery per visitor");
 assert.equal(apply(s,"host",{cmd:"recycleStore"}),false,"another player cannot teleport the item");
 assert.equal(apply(s,"clerk",{cmd:"recycleStore"}),false,"closed drawer cannot accept battery");
 assert.equal(apply(s,"clerk",{cmd:"toggle",key:"drawerR"}),true);
 assert.equal(apply(s,"clerk",{cmd:"recycleStore"}),true);
 assert.equal(recyclingState(s).stored,1);
 assert.equal(apply(s,"clerk",{cmd:"recycleShip"}),false,"incomplete batch cannot pay");
 for(let i=0;i<2;i++){
  const person=s.orderIndex;
  // Advance the ordinary sales while recycling remains independent.
  const sku=["tea","bread","battery","cocoa"][s.orderIndex%4];
  const key={tea:"shelfL1",bread:"shelfL2",battery:"shelfR1",cocoa:"drawerL"}[sku];
  if(key==="drawerL"&&!s.open.drawerL)apply(s,"host",{cmd:"toggle",key});
  assert.equal(apply(s,"host",{cmd:"slot",key}),true);
  assert.equal(apply(s,"host",{cmd:"counter"}),true);
  assert.equal(apply(s,"host",{cmd:"sell"}),true);
  assert.equal(s.orderIndex,person+1);
  assert.equal(apply(s,"clerk",{cmd:"recycleReceive"}),true);
  assert.equal(apply(s,"clerk",{cmd:"recycleStore"}),true);
 }
 assert.equal(recyclingState(s).stored,3);
 const before=s.cash;
 assert.equal(apply(s,"clerk",{cmd:"recycleShip"}),true);
 assert.equal(s.cash,before+RECYCLING.batchPayout);
 assert.equal(recyclingState(s).stored,0);
 assert.equal(recyclingState(s).shipments,1);
 assert.equal(apply(s,"clerk",{cmd:"recycleShip"}),false,"cannot pay twice");
 assert.equal(validate(s),true);
});
test("disconnect and legacy solo save preserve accepted physical recycling stock",()=>{
 const s=start();firstSale(s);
 assert.equal(apply(s,"clerk",{cmd:"recycleReceive"}),true);
 leave(s,"clerk");
 assert.equal(recyclingState(s).stored,1);
 assert.equal(recyclingState(s).carriedBy,null);
 assert.equal(validate(s),true);
 const saved=structuredClone(s);
 resumeSolo(saved,"店长");
 assert.equal(recyclingState(saved).stored,1);
 assert.equal(validate(saved),true);
 const old=initialShop();delete old.businesses;
 assert.equal(validate(old),true,"old v3 saves without business fields are accepted");
});
test("service cannot accept used batteries while carrying retail stock or with a full drawer",()=>{
 const s=start();firstSale(s);
 assert.equal(apply(s,"host",{cmd:"slot",key:"shelfL2"}),true);
 assert.equal(apply(s,"host",{cmd:"recycleReceive"}),false);
 assert.equal(apply(s,"host",{cmd:"slot",key:"shelfL2"}),true);
 assert.equal(apply(s,"host",{cmd:"recycleReceive"}),true);
 assert.equal(apply(s,"host",{cmd:"slot",key:"shelfL2"}),false,"service hand cannot pick retail goods");
});
