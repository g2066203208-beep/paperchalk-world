/* Independent cabinet simulation. All input, reel motion and combat share one clock. */
(() => {
'use strict';
const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
const mod=(x,n)=>((x%n)+n)%n;
const lerp=(a,b,t)=>a+(b-a)*t;
const randomStream=seed=>()=>{
  let t=seed+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;
};
const foes=[
 {id:'warden', name:'LANCE WARDEN',place:'PLAINS OF PAIN',hp:160,power:15,color:'#e4a857'},
 {id:'egg',name:'EGGO',place:'PLAINS OF PAIN',hp:95,power:17,color:'#ffce80'},
 {id:'skeleton',name:'GRAVE SENTINEL',place:'DARK CEMETERY',hp:170,power:21,color:'#83c8d3'},
 {id:'maw',name:'HOLLOW MAW',place:'HOLLOW GROTTO',hp:185,power:22,color:'#b5d86e'},
 {id:'guard',name:'IRON WARDEN',place:'CINDER KEEP',hp:215,power:24,color:'#ed9e66'},
 {id:'toad',name:'MARSH KING',place:'THE MARSH',hp:230,power:27,color:'#ccdf69'},
 {id:'reaper',name:'DUNE REAPER',place:'EMBER WASTES',hp:260,power:32,color:'#ffae68'}
];
const items={
 sword:{name:'RUSTY SWORD',verb:'ATTACK!',damage:22},
 shield:{name:'WOODEN SHIELD',verb:'BLOCK!',armor:20},
 coin:{name:'GOLD COIN',verb:'GAIN COINS',money:3},
 dagger:{name:'RITUAL DAGGER',verb:'STAB!',damage:24,check:true},
 bolt:{name:'STORM ROD',verb:'LIGHTNING!',damage:30},
 bow:{name:'SHORT BOW',verb:'LOOSE!',damage:28,check:true},
 gouge:{name:'BLOOD DROP',verb:'LIFE DRAIN!',damage:13,heal:9},
 charm:{name:'WARDING CHARM',verb:'WARD!',armor:15,heal:8},
 star:{name:'NOVA',verb:'STARFALL!',damage:38}
};
const activeRails=n=>n===3?[1,2,3]:n===4?[0,1,2,3]:[0,1,2,3,4];
class Machine{
 constructor(seed,emit,start=0){
  this.seed=seed;this.emit=emit;this.rng=randomStream(seed);this.time=0;this.paused=false;
  this.reset(start);
 }
 reset(start=0){
  this.hp=125;this.maxHp=125;this.armor=0;this.cash=11;this.stage=start;this.count=3;
  this.pool=['shield','sword','coin','dagger'];this.levels={};this.purchases=new Set();
  this.turn=1;this.gain=0;this.lastAction='';this.streak=0;
  this.enterFight(start,true);this.emit('reset',{});
 }
 get foe(){return foes[this.stage]}
 get active(){return activeRails(this.count)}
 setPhase(phase){this.phase=phase;this.age=0;this.emit('phase',{phase});}
 enterFight(index,instant=false){
  this.stage=index;this.enemyHp=this.foe.hp;this.turn=1;this.enemyShield=0;
  this.current=-1;this.hit=null;this.lastAction='';this.log='SPINNING!';this.feedback=null;
  this.wheels=Array.from({length:5},(_,i)=>this.makeWheel(i));this.nextStop=0;
  if(instant&&index===0){
   ['shield','sword','shield'].forEach((face,n)=>{
    const wheel=this.wheels[this.active[n]];wheel.p=wheel.strip.indexOf(face)+.18;
   });
  }
  if(instant)this.startSpin();else this.setPhase('arrival');
 }
 makeWheel(i){
  const strip=[...this.pool,...this.pool,...this.pool];
  for(let n=strip.length-1;n>0;n--){const j=Math.floor(this.rng()*(n+1));[strip[n],strip[j]]=[strip[j],strip[n]]}
  return {strip,p:this.rng()*strip.length,speed:4.35+i*.21+this.rng()*.35,status:'moving',brake:0,lastLatch:-99};
 }
 startSpin(){
  this.current=-1;this.lastAction='';this.feedback=null;this.nextStop=0;this.log='SPINNING!';
  this.wheels.forEach(w=>{w.status='moving';w.brake=0;});
  this.setPhase('spin');
 }
 symbol(i){const w=this.wheels[i];return w.strip[mod(Math.round(w.p),w.strip.length)];}
 action(){
  if(this.paused)return;
  if(this.phase==='spin'&&this.nextStop<this.active.length){
   const i=this.active[this.nextStop++],w=this.wheels[i];
   w.start=w.p;w.end=Math.ceil(w.p+.16);w.status='braking';w.brake=0;
   w.travel=clamp(2*(w.end-w.start)/w.speed,.17,.39);
   this.emit('press',{i});return;
  }
  if(this.phase==='skill'&&this.age>.13){
   this.skillWon=Math.abs(this.needle()-.71)<.12;
   this.emit('press',{i:this.current});this.playSymbol(this.skillWon);return;
  }
  if(this.phase==='reward'&&this.age>.45){this.enterShop();return}
  if(this.phase==='shop'){this.leaveShop();return}
  if(this.phase==='defeat'||this.phase==='complete'){this.reset();return}
 }
 needle(){return .5-.5*Math.cos(this.age*5.7)}
 updateWheels(dt){
  if(this.phase!=='spin')return;
  for(const i of this.active){
   const w=this.wheels[i],prior=Math.floor(w.p);
   if(w.status==='moving')w.p+=dt*w.speed;
   else if(w.status==='braking'){
    w.brake+=dt;const t=Math.min(1,w.brake/w.travel);
    w.p=lerp(w.start,w.end,1-(1-t)*(1-t));
    if(t===1){w.p=w.end;w.status='set';w.lastLatch=this.time;this.emit('latch',{i})}
   }
   if(i===this.active[0]&&w.status==='moving'&&Math.floor(w.p)!==prior)this.emit('tick',{});
  }
  if(this.active.every(i=>this.wheels[i].status==='set')){
   this.order=[...this.active];this.orderIndex=0;this.critSet=new Set();
   for(let j=0;j<this.order.length;){
    let k=j+1;while(k<this.order.length&&this.symbol(this.order[j])===this.symbol(this.order[k]))k++;
    if(k-j>=3)for(let n=j;n<k;n++)this.critSet.add(this.order[n]);
    j=k;
   }
   this.setPhase('settled');
  }
 }
 nextSymbol(){
  if(this.orderIndex>=this.order.length){this.current=-1;this.log='ENEMY ATTACK';this.setPhase('enemyWind');return}
  this.current=this.order[this.orderIndex++];this.currentItem=this.symbol(this.current);
  this.feedback=null;this.log=items[this.currentItem].name;
  this.emit('focus',{i:this.current});
  if(items[this.currentItem].check&&!this.critSet.has(this.current)){
   this.setPhase('skill');return;
  }
  this.playSymbol(false);
 }
 playSymbol(skill){
  const item=items[this.currentItem],crit=skill||this.critSet.has(this.current);
  const scale=(1+(this.levels[this.currentItem]||0)*.35)*(crit?2:1);
  this.hit={item:this.currentItem,crit,skill,damage:Math.round((item.damage||0)*scale),heal:Math.round((item.heal||0)*scale),money:Math.round((item.money||0)*scale),armor:Math.round((item.armor||0)*scale)};
  this.didHit=false;this.log=item.verb;this.setPhase('resolve');
  this.emit('cast',{i:this.current,item:this.currentItem,crit});
 }
 applyHit(){
  const hit=this.hit;
  if(hit.damage){
   const blocked=Math.min(hit.damage,this.enemyShield);this.enemyShield-=blocked;
   this.enemyHp=Math.max(0,this.enemyHp-hit.damage+blocked);
   this.log=(hit.damage-blocked)+' DAMAGE';
  }
  if(hit.armor){this.armor=Math.min(125,this.armor+hit.armor);this.log='BLOCK +'+hit.armor;}
  if(hit.heal)this.hp=Math.min(this.maxHp,this.hp+hit.heal);
  if(hit.money){this.cash+=hit.money;this.log='GAIN '+hit.money+' COINS';}
  this.feedback={time:this.time,text:hit.skill?'Critical Success!':hit.crit?'Critical Hit!':hit.damage?String(hit.damage):hit.armor?'+'+hit.armor:'+'+hit.money};
  this.emit('impact',{...hit,i:this.current});
 }
 takeHit(){
  const dmg=this.foe.power+(this.turn%3===0?5:0);
  const blocked=Math.min(this.armor,dmg);this.armor-=blocked;this.hp=Math.max(0,this.hp-dmg+blocked);
  this.log=blocked===dmg?'BLOCKED!':(dmg-blocked)+' DAMAGE';
  this.feedback={time:this.time,text:blocked===dmg?'Blocked!':'-'+(dmg-blocked)};
  this.emit('enemyHit',{damage:dmg-blocked,blocked});
 }
 win(){
  this.current=-1;this.gain=9+this.stage*2;this.cash+=this.gain;this.streak++;
  this.log='ENEMY DEFEATED';this.feedback=null;this.setPhase('reward');this.emit('payout',{count:this.gain});
 }
 enterShop(){
  if(this.stage===foes.length-1){this.setPhase('complete');return}
  this.offers=[this.pool[(this.stage+1)%this.pool.length],['bow','bolt','gouge','charm','star','dagger'][this.stage%6],this.count<5?'reel':'star'];
  this.prices=[6+this.stage,9+this.stage,12+this.stage];this.purchases.clear();
  this.focusOffer=0;this.log='UPGRADE A SYMBOL';this.setPhase('shop');
 }
 buy(slot){
  if(this.paused||this.phase!=='shop')return;
  if(slot>=3){
   const cost=slot===3?5:slot===4?7:10;
   if(this.cash<cost){this.reject();return}
   if(slot===3&&this.hp===this.maxHp){this.log='HEALTH FULL';return}
   this.cash-=cost;
   if(slot===3){this.hp=Math.min(this.maxHp,this.hp+35);this.log='HEALED +35'}
   if(slot===4){this.armor=Math.min(125,this.armor+25);this.log='GUARD +25'}
   if(slot===5){this.maxHp+=10;this.hp+=10;this.log='MAX HP +10'}
   this.emit('purchase',{slot,cost});return;
  }
  if(this.purchases.has(slot))return;
  const key=this.offers[slot],cost=this.prices[slot];this.focusOffer=slot;
  if(this.cash<cost){this.reject();return}
  this.cash-=cost;this.purchases.add(slot);
  if(key==='reel')this.count=Math.min(5,this.count+1);
  else if(this.pool.includes(key))this.levels[key]=(this.levels[key]||0)+1;
  else this.pool.push(key);
  this.log=key==='reel'?'REEL UNLOCKED':items[key].name+' +';
  this.emit('purchase',{slot,cost});
 }
 reject(){this.log='NEED MORE COINS';this.emit('deny',{})}
 leaveShop(){if(this.phase==='shop')this.enterFight(this.stage+1)}
 update(dt){
  if(this.paused)return;
  this.time+=dt;this.age+=dt;this.updateWheels(dt);
  switch(this.phase){
   case 'arrival':if(this.age>=1.3)this.startSpin();break;
   case 'settled':if(this.age>=.43)this.nextSymbol();break;
   case 'skill':if(this.age>=3.4)this.playSymbol(false);break;
   case 'resolve':
    if(!this.didHit&&this.age>=.115){this.didHit=true;this.applyHit()}
    if(this.age>=(this.hit.crit?.85:.49)){
     if(this.enemyHp===0)this.win();else this.nextSymbol();
    }break;
   case 'enemyWind':if(this.age>=.64){this.takeHit();this.setPhase('enemyHit')}break;
   case 'enemyHit':if(this.age>=.82){
    if(!this.hp){this.setPhase('defeat');this.emit('end',{})}
    else{this.turn++;this.startSpin()}
   }break;
   case 'reward':if(this.age>=2.25)this.enterShop();break;
  }
 }
}
window.SlotStudy={Machine,foes,items,clamp,lerp,mod,randomStream};
})();
