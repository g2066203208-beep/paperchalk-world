/* 表世界/便利店 V1 — deterministic economy, persisted shift state, NO nightworld coupling.
 * Browser UMD + Node CommonJS. Rules, save format, costs and validation belong here;
 * presentation and all 8 independently drawn cashier/fixture parts belong to store.js. */
(function(root,factory){'use strict';const api=factory();if(root)root.PaperWorldConvenience=api;if(typeof module==='object'&&module.exports)module.exports=api})(typeof window==='object'?window:null,function(){
 'use strict';
 const VERSION=1,KEY='paperchalk-convenience-store-v1';
 const PRODUCTS=Object.freeze([
  Object.freeze({id:'cola',name:'可乐',icon:'🥤',price:5}),
  Object.freeze({id:'onigiri',name:'饭团',icon:'🍙',price:8}),
  Object.freeze({id:'bread',name:'面包',icon:'🥐',price:7}),
  Object.freeze({id:'milk',name:'牛奶',icon:'🥛',price:9}),
  Object.freeze({id:'tea',name:'茶饮',icon:'🍵',price:6}),
  Object.freeze({id:'bento',name:'便当',icon:'🍱',price:18})
 ]);
 const byId=Object.freeze(Object.fromEntries(PRODUCTS.map(p=>[p.id,p])));
 const PATTERNS=Object.freeze([
  Object.freeze({name:'下班的职员',items:['cola','onigiri']}),
  Object.freeze({name:'放学的学生',items:['bread','milk','cola']}),
  Object.freeze({name:'附近的居民',items:['bento','tea']}),
  Object.freeze({name:'赶时间的客人',items:['cola','cola','bread']}),
  Object.freeze({name:'夜班工作人员',items:['onigiri','bento','milk']}),
  Object.freeze({name:'外卖骑手',items:['tea','bread','tea']}),
  Object.freeze({name:'散步的老人',items:['milk','bread']}),
  Object.freeze({name:'路过的旅客',items:['bento','cola','tea']})
 ]);
 const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
 function initial(){return {version:VERSION,wallet:3200,earned:0,shifts:0,rating:90,energy:100,inventory:Object.fromEntries(PRODUCTS.map(p=>[p.id,7])),layout:{},shift:null}}
 function clone(x){return JSON.parse(JSON.stringify(x))}
 function valid(s){return !!(s&&s.version===VERSION&&Number.isFinite(s.wallet)&&s.wallet>=0&&Number.isFinite(s.rating)&&s.rating>=0&&s.rating<=100&&Number.isFinite(s.energy)&&s.energy>=0&&s.energy<=100&&PRODUCTS.every(p=>Number.isInteger(s.inventory?.[p.id])&&s.inventory[p.id]>=0)&&(!s.shift||(Array.isArray(s.shift.orders)&&s.shift.orders.length===5&&Number.isInteger(s.shift.index)&&s.shift.index>=0&&s.shift.index<=5&&Array.isArray(s.shift.scanned))))}
 function create({storage=null}={}){
  let state=initial(),listeners=new Set();
  if(storage){try{const saved=JSON.parse(storage.getItem(KEY)||'null');if(valid(saved))state=saved}catch(_){}}
  const snapshot=()=>clone(state);
  const persist=()=>{try{storage?.setItem(KEY,JSON.stringify(state));return true}catch(_){return false}};
  const notify=(type,detail='')=>{persist();for(const fn of listeners){try{fn(snapshot(),type,detail)}catch(_){}}};
  function fail(reason){return {ok:false,reason}}
  function ok(reason){notify('change',reason);return {ok:true,reason}}
  const getOrder=()=>state.shift?.orders[state.shift.index]||null;
  function startShift(type){
   if(state.shift)return fail('请先完成当前班次');
   if(!['早班','晚班'].includes(type))return fail('无效班次');
   if(state.energy<20){state.energy=clamp(state.energy+40,0,100);notify('rest','恢复体力后开始上班')}
   const offset=(state.shifts*3)%PATTERNS.length;
   state.shift={type,startHour:type==='早班'?8:16,minutes:0,index:0,finished:false,
    scanned:[],paid:false,selected:null,errors:0,earnings:0,cleanedFor:-1,
    stockRuns:0,cleanRuns:0,orders:Array.from({length:5},(_,i)=>clone(PATTERNS[(offset+i)%PATTERNS.length]))};
   return ok('已开始'+type);
  }
  function select(id){if(!state.shift||state.shift.finished)return fail('还没有开始班次');if(!byId[id])return fail('没有这种商品');state.shift.selected=id;return ok('已选择 '+byId[id].name)}
  function needCount(id){const order=getOrder();return order?order.items.filter(i=>i===id).length:0}
  function scannedCount(id){return state.shift?.scanned.filter(i=>i===id).length||0}
  function scan(id=state.shift?.selected){
   const shift=state.shift;
   if(!shift||shift.finished)return fail('请先上班');
   if(shift.paid)return fail('已经收款，请先装袋');
   if(!byId[id])return fail('先选择顾客要买的商品');
   if(needCount(id)<=scannedCount(id)){
    shift.errors++;state.rating=clamp(state.rating-2,0,100);shift.minutes+=1;
    notify('mistake','这件商品不在订单里，或已扫描足够数量');return fail('商品不在订单里，或已经扫够了');
   }
   if(state.inventory[id]<=0)return fail('货架缺货：请先补货');
   state.inventory[id]--;shift.scanned.push(id);shift.minutes+=3;
   state.energy=clamp(state.energy-1,0,100);shift.selected=null;
   return ok('扫码成功：'+byId[id].name);
  }
  function charge(){
   const s=state.shift,order=getOrder();if(!s||s.finished||!order)return fail('没有待处理订单');
   if(s.paid)return fail('已经完成收款');
   if(s.scanned.length!==order.items.length||order.items.some(id=>needCount(id)!==scannedCount(id)))return fail('还有商品没有正确扫码');
   s.paid=true;s.minutes+=2;return ok('收款成功，可装袋交货');
  }
  function bag(){
   const s=state.shift,order=getOrder();if(!s||s.finished||!order)return fail('没有待处理订单');
   if(!s.paid)return fail('请先完成扫码与收款');
   const tip=Math.max(0,5-s.errors*2),wage=46+tip;
   state.wallet+=wage;state.earned+=wage;s.earnings+=wage;
   state.energy=clamp(state.energy-3,0,100);state.rating=clamp(state.rating+1,0,100);
   s.index++;s.scanned=[];s.selected=null;s.paid=false;s.errors=0;s.minutes+=5;
   if(s.index===s.orders.length){s.finished=true;state.wallet+=120;state.earned+=120;s.earnings+=120;state.shifts++;notify('finished','完成5单，底薪及订单奖金已结算');return {ok:true,reason:'完成班次'}}
   return ok('已装袋，下一位顾客来了');
  }
  function stock(){
   const s=state.shift;if(!s||s.finished)return fail('需在班次中补货');
   const item=PRODUCTS.reduce((x,y)=>state.inventory[y.id]<state.inventory[x.id]?y:x,PRODUCTS[0]);
   state.inventory[item.id]+=5;s.stockRuns++;s.minutes+=8;state.energy=clamp(state.energy-3,0,100);
   return ok('已补货：'+item.name+' +5（耗时8分钟）');
  }
  function clean(){
   const s=state.shift;if(!s||s.finished)return fail('需在班次中清洁');
   if(s.cleanedFor===s.index)return fail('本位顾客期间已经清洁过');
   s.cleanedFor=s.index;s.cleanRuns++;s.minutes+=6;state.energy=clamp(state.energy-2,0,100);
   state.rating=clamp(state.rating+2,0,100);return ok('清洁完毕：评价 +2，耗时6分钟');
  }
  function nextShift(){if(!state.shift?.finished)return fail('当前班次还没结束');state.shift=null;state.energy=clamp(state.energy+32,0,100);return ok('完成休息，可以安排下一班')}
  function layout(id,value){if(!/^(pos-terminal|scanner|card-reader|food-warmer|bag-rack)$/.test(id))return fail('不可调整此部件');if(!value||![value.left,value.top].every(n=>Number.isFinite(n)&&n>=0&&n<=100))return fail('无效坐标');state.layout[id]={left:Math.round(value.left*10)/10,top:Math.round(value.top*10)/10};return ok('已保存柜台部件位置')}
  function subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn)}
  function reset(){state=initial();notify('reset','重置便利店存档')}
  return Object.freeze({snapshot,subscribe,persist,startShift,select,scan,charge,bag,stock,clean,nextShift,layout,reset,currentOrder:()=>clone(getOrder()),products:PRODUCTS});
 }
 return Object.freeze({VERSION,KEY,PRODUCTS,create});
});