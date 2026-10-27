// Data-driven business registry and host-authoritative service workflows.
// This module deliberately contains no drawing or asset generation.
export const RECYCLING=Object.freeze({capacity:3,handlingCost:1,batchPayout:12});
export const BUSINESS_REGISTRY=Object.freeze({
 retail:Object.freeze({id:"retail",name:"窗口零售",category:"goods",station:"counter",steps:Object.freeze(["take","place","sell"]),unlock:"always"}),
 recycling:Object.freeze({id:"recycling",name:"旧电池回收",category:"service",station:"drawerR",steps:Object.freeze(["receive","store","dispatch"]),commands:Object.freeze(["recycleReceive","recycleStore","recycleShip"]),unlock:"one_sale"})
});
// A single core dispatcher works for future registered businesses as well.
export function businessCommand(cmd){return Object.values(BUSINESS_REGISTRY).some(b=>b.commands?.includes(cmd));}
export function businessUnlocked(s,id){
 const rule=BUSINESS_REGISTRY[id]?.unlock;
 return rule==="always"||rule==="one_sale"&&(s?.totalServed||0)>=1;
}
export function availableBusinesses(s){
 return Object.values(BUSINESS_REGISTRY).filter(b=>businessUnlocked(s,b.id));
}
export function recyclingState(s){
 const r=s?.businesses?.recycling;
 return r||{stored:0,carriedBy:null,lastOrder:-1,shipments:0,revenue:0,handling:0};
}
function ensureRecycling(s){
 s.businesses??={};
 s.businesses.recycling??={stored:0,carriedBy:null,lastOrder:-1,shipments:0,revenue:0,handling:0};
 return s.businesses.recycling;
}
export function recyclingOffer(s){
 const r=recyclingState(s);
 return Boolean(s?.phase==="operating"&&s.windowOpen&&businessUnlocked(s,"recycling")&&
  s.orderIndex%4!==0&&r.lastOrder!==s.orderIndex&&r.stored<RECYCLING.capacity&&
  (s.slots?.drawerR?.qty||0)===0&&!r.carriedBy);
}
export function recyclingCarried(s,by){return recyclingState(s).carriedBy===by;}
export function recyclingValid(s){
 const r=s?.businesses?.recycling;
 if(r===undefined)return true; // Old version-3 saves have no business data.
 if(!r||typeof r!=="object"||Array.isArray(r))return false;
 if(!Number.isInteger(r.stored)||r.stored<0||r.stored>RECYCLING.capacity)return false;
 if(r.carriedBy!==null&&(typeof r.carriedBy!=="string"||!s.players?.[r.carriedBy]||r.stored>=RECYCLING.capacity))return false;
 for(const field of ["shipments","revenue","handling"])
  if(!Number.isSafeInteger(r[field])||r[field]<0)return false;
 if(!Number.isInteger(r.lastOrder)||r.lastOrder< -1||r.lastOrder>s.orderIndex)return false;
 if(r.stored>0&&(s.slots?.drawerR?.qty||0)>0)return false; // Physical drawer cannot hold both stocks.
 return true;
}
export function reclaimRecyclingOnLeave(s,by){
 const r=s?.businesses?.recycling;
 if(!r||r.carriedBy!==by)return false;
 // Accepted stock is never lost or duplicated when a player disconnects.
 if(r.stored>=RECYCLING.capacity)throw Error("Recycling capacity invariant violated");
 r.carriedBy=null;r.stored++;return true;
}
export function applyBusinessAction(s,by,a){
 if(!s||s.version!==3||s.phase!=="operating"||!s.players?.[by]||!a)return false;
 const p=s.players[by],cmd=a.cmd;
 if(!businessCommand(cmd))return false;
 const r=recyclingState(s);
 if(cmd==="recycleReceive"){
  if(!recyclingOffer(s)||p.hand||p.restock||s.cash<RECYCLING.handlingCost)return false;
  const next=ensureRecycling(s);
  s.cash-=RECYCLING.handlingCost;
  s.dayExpenses=(s.dayExpenses||0)+RECYCLING.handlingCost;
  next.handling+=RECYCLING.handlingCost;
  next.carriedBy=by;next.lastOrder=s.orderIndex;
  s.notice="接过顾客的旧电池。打开右抽屉，把它放进回收格。";
 }else if(cmd==="recycleStore"){
  if(r.carriedBy!==by||!s.open?.drawerR||s.slots?.drawerR?.qty!==0||r.stored>=RECYCLING.capacity)return false;
  const next=ensureRecycling(s);
  next.carriedBy=null;next.stored++;
  s.notice="旧电池已放入回收抽屉："+next.stored+"/"+RECYCLING.capacity;
 }else{
  if(!s.open?.drawerR||r.carriedBy||r.stored!==RECYCLING.capacity||s.slots?.drawerR?.qty!==0)return false;
  const next=ensureRecycling(s);
  next.stored=0;next.shipments++;next.revenue+=RECYCLING.batchPayout;
  s.cash+=RECYCLING.batchPayout;s.earnings+=RECYCLING.batchPayout;
  s.notice="回收箱打包交运，获得回收结算 ¥"+RECYCLING.batchPayout+"。";
 }
 s.revision++;return true;
}
