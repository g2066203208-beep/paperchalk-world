/* Reusable bandit CHARACTER roster, not anonymous enemy tokens.
 * Each bandit has distinct stats, five authored action cards, target preferences
 * and a stable identity. Intent previews are deliberately not rendered by the UI.
 */
(function(root){'use strict';
const catalog=root.PaperchalkCardCatalog;
if(!catalog)throw Error('Registered card catalog missing');
function profile(archetype,traits){
 const cards=catalog.forArchetype(archetype);
 if(cards.length!==5)throw Error('Enemy must register five cards: '+archetype);
 return Object.freeze({...traits,
  cards:Object.freeze(cards.map(card=>Object.freeze(card)))});
}
const PROFILES=Object.freeze({
 bruiser:profile('bruiser',{
  characterId:'bandit-bruiser',name:'山贼刀手',role:'warrior',
  faction:'bandit',weapon:'柴刀',hp:10,attack:2,targetPolicy:'frontline'
 }),
 crossbow:profile('crossbow',{
  characterId:'bandit-crossbow',name:'山贼弩手',role:'ranger',
  faction:'bandit',weapon:'短弩',hp:7,attack:2,targetPolicy:'weakest'
 }),
 captain:profile('captain',{
  characterId:'bandit-captain',name:'强盗头目',role:'skirmisher',
  faction:'bandit',weapon:'大弯刀',hp:13,attack:3,targetPolicy:'nearest'
 })
});
function unit(profileId,id,r,c){
 const p=PROFILES[profileId];
 if(!p)throw Error('Unknown bandit archetype: '+profileId);
 return {id,side:'enemy',r,c,role:p.role,faction:p.faction,
  name:p.name,characterId:p.characterId,weapon:p.weapon,
  hp:p.hp,attack:p.attack,targetPolicy:p.targetPolicy,
  enemyCardPool:p.cards.map(x=>({...x})),intentCycle:p.cards.map(x=>({...x}))};
}
root.PaperchalkBanditRoster=Object.freeze({version:'1.1.0-card-registry',PROFILES,unit});
})(window);
