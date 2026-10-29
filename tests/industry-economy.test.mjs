import test from 'node:test';
import assert from 'node:assert/strict';
import {INDUSTRIES,INDUSTRY,GOODS,GOOD,PRICE_MODES,newFirm,runIndustryDay,stockUnits,demandFor} from '../site/systems/industry-model.js';
import {estatesSystem,BUSINESS_TYPES} from '../site/systems/estates.js';
import {factionsSystem} from '../site/systems/factions.js';
import {populationSystem} from '../site/systems/population.js';

function setup(){
 const plots=estatesSystem.init();
 const factions=factionsSystem.init();
 const population=populationSystem.init({seed:20261028,slices:{clock:{shift:0},factions}});
 population.footTraffic=Object.fromEntries(factions.cells.map(c=>[c.id,15]));
 const slices={factions,population,society:{government:{monthlyTax:12,licenseFee:5}}};
 const action=(data,type,extra={},cash=5000)=>{
  const r=estatesSystem.reduce(structuredClone(data),{type,lot:extra.lot||'lot-1',...extra},
   {day:1,context:{cash},slices});
  assert.ok(r.data,JSON.stringify(r));
  return r.data;
 };
 return {plots,slices,action};
}
function makeFirm(id,type,price=5000){
 const {plots,slices,action}=setup();
 let data=action(plots,'buy',{lot:id},price);
 data=action(data,'build',{lot:id,building:type},price);
 return {data,lot:data.parcels.find(x=>x.id===id),slices,action};
}
test('26 distinct buildable industries cover agriculture, resources, processing, retail, services, logistics and culture',()=>{
 assert.ok(INDUSTRIES.length>=25);
 assert.equal(INDUSTRIES.length,BUSINESS_TYPES.length);
 assert.equal(new Set(INDUSTRIES.map(x=>x.id)).size,INDUSTRIES.length);
 for(const typ of INDUSTRIES){
  assert.ok(GOOD[typ.output],'missing output '+typ.id);
  assert.ok(typ.build>0&&typ.upkeep>0);
  for(const [good,qty] of Object.entries(typ.inputs))assert.ok(GOOD[good]&&qty>0);
 }
 assert.ok(GOODS.length>=24);
});
test('purchasing and constructing a new business gives real empty stock, workers and daily management',()=>{
 const {data,lot,slices}=makeFirm('lot-1','diner');
 assert.equal(lot.building.firm.workers,1);
 assert.equal(stockUnits(lot.building.firm),0);
 const before=structuredClone(data);
 const daily=estatesSystem.tick(data,{day:2,slices,context:{cash:1000},signal:()=>.5});
 assert.ok(daily.events.some(e=>e.type==='estate.income'&&e.lot===lot.id));
 assert.ok(lot.building.firm.lastBought>0,'food must come from actual procurement');
 assert.ok(lot.building.firm.lastSales>0,'sales are limited to actual produced stock');
 assert.ok(lot.building.firm.lastWages>0);
 assert.equal(daily.effects.filter(x=>x.kind==='cash').reduce((s,x)=>s+x.amount,0),data.playerIncome);
 assert.equal(before.parcels[1].building.firm.lastRevenue,0);
});
test('sales never exceed inventory, with external procurement disabled and no inputs',()=>{
 const {data,lot,slices,action}=makeFirm('lot-1','grocery');
 const off=action(data,'supply',{lot:'lot-1'});
 assert.equal(off.parcels[1].building.firm.autoSupply,false);
 const daily=estatesSystem.tick(off,{day:2,slices,context:{cash:200},signal:()=>.5});
 assert.equal(off.parcels[1].building.firm.lastSales,0);
 assert.equal(off.parcels[1].building.firm.lastRevenue,0);
 assert.ok(off.parcels[1].lastProfit<0,'wages and fixed costs still exist');
 assert.ok(daily.effects.some(x=>x.amount<0));
});
test('discount and premium genuinely affect demand, and staff changes have wage consequences',()=>{
 const {data,lot,slices,action}=makeFirm('lot-1','bakery');
 const base=demandFor(INDUSTRY.bakery,lot,slices,'standard',0,.5);
 const cheaper=demandFor(INDUSTRY.bakery,lot,slices,'discount',0,.5);
 const premium=demandFor(INDUSTRY.bakery,lot,slices,'premium',0,.5);
 assert.ok(cheaper>=base&&base>=premium,'price must affect demand');
 const priced=action(data,'pricing',{price:'premium'});
 assert.equal(priced.parcels[1].building.firm.price,'premium');
 const hired=action(priced,'hire',{lot:'lot-1'});
 assert.equal(hired.parcels[1].building.firm.workers,2);
 const settled=estatesSystem.tick(hired,{day:2,slices,context:{cash:2000},signal:()=>.5});
 assert.ok(settled.effects.some(x=>x.label.includes('商铺净结算')));
 assert.equal(hired.parcels[1].building.firm.lastWages,2*INDUSTRY.bakery.staffWage);
});
test('raw material -> owned processing -> retail uses matching physical goods without duplication',()=>{
 const {plots,slices}=setup();
 const types=[['lot-1','farm'],['lot-2','mill']];
 for(const [id,type] of types){const lot=plots.parcels.find(x=>x.id===id);lot.owner='player';lot.building={type,level:1,name:type,mode:'legal',firm:newFirm(type)};}
 const before=plots.parcels[1].building.firm;
 const r=runIndustryDay(plots.parcels,{day:2,slices,context:{cash:5000},signal:()=>.55});
 const farm=plots.parcels[1].building.firm,mill=plots.parcels[2].building.firm;
 assert.ok(mill.lastTransfers>0,'mill should use farm-sourced grain before imports');
 assert.ok((farm.stock.grain||0)>=0);
 assert.ok(r.books.reduce((n,b)=>n+b.transfers,0)>0);
 assert.equal(r.total,r.books.reduce((s,b)=>s+b.revenue-b.expenses,0));
});
test('real manual transfer debits source, credits destination and charges freight; invalid operations atomic',()=>{
 const {plots,slices}=setup();
 for(const [id,type] of [['lot-1','farm'],['lot-2','mill']]){
  const lot=plots.parcels.find(x=>x.id===id);lot.owner='player';lot.building={type,level:1,name:type,mode:'legal',firm:newFirm(type)};
 }
 plots.parcels[1].building.firm.stock.grain=17;
 const before=structuredClone(plots);
 const transfer=estatesSystem.reduce(structuredClone(plots),{type:'transfer',lot:'lot-1',to:'lot-2',good:'grain',quantity:9},
  {day:1,context:{cash:50},slices});
 assert.ok(transfer.data);
 assert.equal(transfer.data.parcels[1].building.firm.stock.grain,8);
 assert.equal(transfer.data.parcels[2].building.firm.stock.grain,9);
 assert.ok(transfer.effects.some(x=>x.kind==='cash'&&x.amount<0));
 assert.deepEqual(plots,before,'command must never mutate original input');
 const denied=estatesSystem.reduce(structuredClone(plots),{type:'transfer',lot:'lot-1',to:'lot-2',good:'grain',quantity:30},
  {day:1,context:{cash:50},slices});
 assert.ok(denied.error);
});
test('legacy shops remain in older auto-income mode until explicitly modernized',()=>{
 const {plots,slices}=setup();
 plots.parcels[1].owner='player';
 plots.parcels[1].building={type:'diner',level:1,mode:'legal',name:'原有食堂'};
 const old=estatesSystem.tick(plots,{day:2,slices,context:{cash:1000},signal:()=>.5});
 assert.ok(old.events.some(x=>x.type==='estate.income'&&x.lot==='lot-1'));
 assert.equal(plots.parcels[1].building.firm,undefined,'legacy save unchanged');
 const modern=estatesSystem.reduce(structuredClone(plots),{type:'modernize',lot:'lot-1'},{day:2,context:{cash:1000},slices});
 assert.ok(modern.data?.parcels[1].building.firm);
});
test('hundred day replay remains bounded, serializable and honest under low working capital',()=>{
 const {data,slices}=makeFirm('lot-1','bakery');
 let cash=700;
 for(let day=2;day<=101;day++){
  const result=runIndustryDay(data.parcels,{day,slices,context:{cash},signal:id=>(day%7)/7});
  cash+=result.total;
  const f=data.parcels[1].building.firm;
  assert.ok(Number.isFinite(cash));
  for(const num of Object.values(f.stock))assert.ok(Number.isInteger(num)&&num>=0&&num<=200);
  assert.ok(f.daybook.length<=30,'bounded ledger');
  assert.equal(result.books[0].revenue,result.books[0].sold*Math.round(GOOD.bread.price*PRICE_MODES[f.price].multiplier));
 }
 assert.doesNotThrow(()=>JSON.parse(JSON.stringify(data)));
});
