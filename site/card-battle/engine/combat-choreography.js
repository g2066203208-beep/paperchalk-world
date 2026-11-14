/* One clean, heavyweight CARD hit: short anticipation, a sharp impact,
 * brief hit-stop, target recoil and immediate settle. Zero idle wobble.
 * Pure animation clock + event handoff: gameplay damage commits at impact.
 */
(function(root){'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const q=clamp(v);return q*q*(3-2*q);};
const ZERO=Object.freeze({dx:0,dy:0,dz:0,pitch:0,roll:0,scale:1,hit:0});
function create(){
 let active=null,serial=0,last=null;
 const duration=.66,impactAt=.215,holdUntil=.263,settleAt=.62;
 function start({attackerId,targetId,from,to,damage=0,blocked=0,onImpact,onFinish,at=0,kind='attack'}){
  if(active)return false;
  const x=to.x-from.x,z=to.z-from.z,len=Math.hypot(x,z)||1;
  active={serial:++serial,attackerId,targetId,from:{...from},to:{...to},
   dir:{x:x/len,z:z/len},damage,blocked,at,kind,
   hitFired:false,finishFired:false,onImpact,onFinish};
  last={serial,attackerId,targetId,kind,at,damage,blocked};
  return true;
 }
 function elapsed(time){return active?Math.max(0,time-active.at):0;}
 function timeline(t){
  const u=clamp(t);
  // Eight frames worth of motion without a long fly-across-board action.
  if(u<.095)return {push:-.13*smooth(u/.095),rise:.015,pitch:-.11*smooth(u/.095)};
  if(u<impactAt){
   const v=smooth((u-.095)/(impactAt-.095));
   return {push:-.13+.56*v,rise:.035+Math.sin(v*Math.PI)*.09,pitch:-.11+.25*v};
  }
  if(u<holdUntil)return {push:.43,rise:.035,pitch:.14}; // 48ms hitstop
  if(u<.43){
   const v=smooth((u-holdUntil)/(.43-holdUntil));
   return {push:.43*(1-v),rise:.035*(1-v),pitch:.14*(1-v)};
  }
  return {push:0,rise:0,pitch:0};
 }
 function pose(unitId,time){
  if(!active||active.kind!=='attack')return ZERO;
  const t=elapsed(time);
  if(t>=duration)return ZERO;
  if(unitId===active.attackerId){
   const p=timeline(t);
   return {dx:active.dir.x*p.push,dy:p.rise,dz:active.dir.z*p.push,
    pitch:p.pitch,roll:0,scale:1,hit:0};
  }
  if(unitId===active.targetId){
   if(t<impactAt||t>=.54)return ZERO;
   const u=clamp((t-impactAt)/(.54-impactAt));
   const kick=(1-smooth(u))*.19;
   const hit=Math.max(0,1-u);
   return {dx:active.dir.x*kick,dy:Math.sin(Math.PI*u)*.045,dz:active.dir.z*kick,
    pitch:-kick*.5,roll:0,scale:1-.075*(1-smooth(u)),hit};
  }
  return ZERO;
 }
 function visible(time){
  if(!active||active.kind!=='attack')return null;
  const t=elapsed(time);
  if(t<impactAt-.024||t>.48)return null;
  const u=clamp((t-(impactAt-.024))/.29);
  return {targetId:active.targetId,to:{...active.to},from:{...active.from},
   age:u,alpha:u<.17?smooth(u/.17):1-smooth((u-.17)/.83),
   serial:active.serial,damage:active.damage,blocked:active.blocked};
 }
 function update(time){
  if(!active)return;
  const t=elapsed(time);
  if(t>=impactAt&&!active.hitFired){
   active.hitFired=true;
   active.onImpact?.({...active});
  }
  // Callback can reset the battle; guard against reentrance.
  if(active&&t>=duration&&!active.finishFired){
   const item=active;active=null;item.finishFired=true;
   item.onFinish?.({...item});
  }
 }
 function reset(){active=null;last=null;}
 return Object.freeze({start,pose,visible,update,reset,
  get busy(){return !!active;},
  get snapshot(){return{busy:!!active,active:active?{
   serial:active.serial,attackerId:active.attackerId,targetId:active.targetId,
   kind:active.kind,hitFired:active.hitFired,at:active.at
  }:null,last};},
  timeline:{duration,impactAt,holdUntil,settleAt}});
}
root.PaperchalkCombatChoreography=Object.freeze({version:'1.0.0',create});
})(window);
