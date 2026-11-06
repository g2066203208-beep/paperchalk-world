/* V1.7 deterministic balance layer: generated and original class cards share one
   tunable class modifier; the same data feeds simulation, UI, loot and upgrades.
   No runtime randomness or client-specific state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.PaperchalkBalance=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const FACTORS={axe:1.06,gun:.93,guard:1.00,mage:1.06};
const SIGNATURE={
 sweep:{damage:13},buckshot:{damage:12},shockwave:{damage:12,breakPower:5},
 nova:{damage:8},trance:{buff:6,charge:15}
};
function apply(G,EXP){
 // Iconic rare cards must remain meaningful alternatives to procedurally
 // combined rares. Upgrade their identity-specific baseline, not every rare.
 for(const [id,change] of Object.entries(SIGNATURE)){
  const card=G.CARD[id];if(!card)throw Error('Missing signature '+id);
  for(const [field,next] of Object.entries(change)){
   const old=card[field];card[field]=next;
   if((field==='damage'||field==='buff')&&old!==next){
    card.desc=String(card.desc||'').replace(new RegExp('(?<!\\d)'+old+'(?=(?:伤害|，持续|，后摇|，前摇|，敌方|，群体|，对))','g'),String(next));
   }
  }
 }
 const owners=new Map();for(const [cls,keys] of Object.entries(EXP.pools))for(const key of keys){if(!owners.has(key))owners.set(key,new Set());owners.get(key).add(cls)}
 let adjusted=0;for(const [key,cl] of owners){if(cl.size!==1)continue;const card=G.CARD[key];if(!card?.damage)continue;
  if(card.baseBalanceDamage===undefined)card.baseBalanceDamage=card.damage;
  const owner=[...cl][0];const factor=owner==='mage'?(card.aoe?.94:1.12):FACTORS[owner];const prev=card.damage,amount=Math.max(1,Math.round(card.baseBalanceDamage*factor));card.damage=amount;
  if(amount!==prev){const before=String(card.desc||'');card.desc=before.replace(new RegExp('(?<!\\d)'+String(prev)+'(?=(?:伤害|点伤害))','g'),String(amount));adjusted++;}
 }
 const signatureDescriptions={
  sweep:()=>`全体敌人各${G.CARD.sweep.damage}伤害，较长后摇`,
  buckshot:()=>`全体敌人各${G.CARD.buckshot.damage}伤害`,
  shockwave:()=>`全体敌人各${G.CARD.shockwave.damage}伤害，追加${G.CARD.shockwave.breakPower}破防压力`,
  nova:()=>`全体敌人连续${G.CARD.nova.a}格各${G.CARD.nova.damage}伤害`,
  trance:()=>`随后2次命中伤害+${G.CARD.trance.buff}，充能+${G.CARD.trance.charge}`
 };
 for(const [id,describe] of Object.entries(signatureDescriptions))G.CARD[id].desc=describe();
 for(const [fight,tier] of Object.entries(G.ENCOUNTER_SCALING.team)){
   if(!tier.originalV17){tier.originalV17={hp:tier.hp,damage:tier.damage}}
   tier.hp=+(tier.originalV17.hp*1.12).toFixed(4);
   tier.damage=+(tier.originalV17.damage*1.09).toFixed(4);
 }
 return{adjusted,factors:{...FACTORS},teamEncounterHp:1.12,teamEncounterDamage:1.09};}
return{FACTORS,SIGNATURE,apply};
});
