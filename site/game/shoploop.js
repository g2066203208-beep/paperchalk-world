/* PAPERWORLD physical first-day shop loop, not a fake menu timer. */
export const SHOP_KEY='paperworld-shop-opening-v1';
export const PICKUP=Object.freeze({x:0,y:0,name:'广场物资点'});
export const STORE=Object.freeze({x:24,y:0,name:'街角店铺门口'});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class ShopOpeningLoop{
 constructor(storage=null){
  this.storage=storage;this.progress={phase:'pickup',deliveries:0,cash:0,reputation:0,level:1};
  try{
   const v=JSON.parse(storage?.getItem(SHOP_KEY)||'null');
   if(v&&['pickup','deliver'].includes(v.phase)){
    const valid=(x,cap)=>Number.isSafeInteger(x)&&x>=0?Math.min(x,cap):0;
    this.progress={phase:v.phase,deliveries:valid(v.deliveries,100000),cash:valid(v.cash,10000000),
     reputation:valid(v.reputation,100000),level:Math.max(1,valid(v.level,4))};
   }
  }catch{}
 }
 get target(){return this.progress.phase==='pickup'?PICKUP:STORE}
 get reward(){return 35+10*(this.progress.level-1)}
 get upgradeCost(){return this.progress.level>=4?null:80*this.progress.level}
 get shopName(){
  try{const v=JSON.parse(this.storage?.getItem('paperworld-lease-v1')||'null');
   if(typeof v?.shopName==='string'&&v.shopName.trim())return v.shopName.trim().slice(0,20)}catch{}
  return '街角试营业';
 }
 snapshot(){return {...this.progress,target:{...this.target},reward:this.reward,upgradeCost:this.upgradeCost}}
 describe(position){
  const distance=dist(position,this.target),atStore=dist(position,STORE)<=2.65;
  return {...this.snapshot(),distance,canInteract:distance<=2.65,
   canUpgrade:atStore&&this.progress.deliveries>=2&&this.upgradeCost!==null&&this.progress.cash>=this.upgradeCost,
   action:this.progress.phase==='pickup'?'领取开业物资':'交付开业物资'};
 }
 save(){try{this.storage?.setItem(SHOP_KEY,JSON.stringify(this.progress))}catch{}}
 interact(position){
  const info=this.describe(position);
  if(!info.canInteract)return {ok:false,message:'请靠近'+this.target.name+'，距离 '+info.distance.toFixed(1)+'m'};
  if(this.progress.phase==='pickup'){
   this.progress.phase='deliver';this.save();
   return {ok:true,event:'pickup',message:'已领开业物资 · 前往 X 24 的店铺'};
  }
  const money=this.reward;this.progress.phase='pickup';this.progress.deliveries++;
  this.progress.cash+=money;this.progress.reputation++;this.save();
  return {ok:true,event:'delivery',money,message:'交付成功 · +'+money+' 营业金，声望 +1'};
 }
 upgrade(position){
  const cost=this.upgradeCost;
  if(cost===null)return {ok:false,message:'店铺已达到最高等级'};
  if(dist(position,STORE)>2.65)return {ok:false,message:'请到店铺门口'};
  if(this.progress.deliveries<2)return {ok:false,message:'先完成两次备货'};
  if(this.progress.cash<cost)return {ok:false,message:'升级需要 '+cost+' 营业金'};
  this.progress.cash-=cost;this.progress.level++;this.save();
  return {ok:true,event:'upgrade',message:'升级到 Lv.'+this.progress.level+' · 以后交付收入提高'};
 }
}
