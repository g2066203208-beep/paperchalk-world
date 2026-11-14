/* Reusable bandit CHARACTER roster, not anonymous enemy tokens.
 * Each bandit has distinct stats, five authored action cards, target preferences
 * and a stable identity. Intent previews are deliberately not rendered by the UI.
 */
(function(root){'use strict';
const PROFILES=Object.freeze({
 bruiser:Object.freeze({
  characterId:'bandit-bruiser',name:'山贼刀手',role:'warrior',
  faction:'bandit',weapon:'柴刀',hp:10,attack:2,targetPolicy:'frontline',
  cards:Object.freeze([
   {id:'bandit-cut',name:'砍刀',kind:'attack',damage:2},
   {id:'bandit-shove',name:'凶狠劈砍',kind:'attack',damage:3},
   {id:'bandit-block',name:'架刀防守',kind:'guard',block:2},
   {id:'bandit-rush',name:'扑击',kind:'attack',damage:3},
   {id:'bandit-finish',name:'追斩',kind:'attack',damage:2}
  ])
 }),
 crossbow:Object.freeze({
  characterId:'bandit-crossbow',name:'山贼弩手',role:'ranger',
  faction:'bandit',weapon:'短弩',hp:7,attack:2,targetPolicy:'weakest',
  cards:Object.freeze([
   {id:'crossbow-shot',name:'弩箭',kind:'attack',damage:2},
   {id:'crossbow-aim',name:'找准时机',kind:'guard',block:2},
   {id:'crossbow-precise',name:'精准射击',kind:'attack',damage:3},
   {id:'crossbow-pierce',name:'穿甲弩箭',kind:'attack',damage:2,pierce:true},
   {id:'crossbow-rapid',name:'快速装填',kind:'attack',damage:2}
  ])
 }),
 captain:Object.freeze({
  characterId:'bandit-captain',name:'强盗头目',role:'skirmisher',
  faction:'bandit',weapon:'大弯刀',hp:13,attack:3,targetPolicy:'nearest',
  cards:Object.freeze([
   {id:'captain-raid',name:'劫掠',kind:'raid',damage:2,steal:1},
   {id:'captain-order',name:'凶徒号令',kind:'rally',block:2},
   {id:'captain-cleave',name:'重刀',kind:'attack',damage:3},
   {id:'captain-steal',name:'强行掠夺',kind:'raid',damage:3,steal:1},
   {id:'captain-guard',name:'戒备',kind:'guard',block:3}
  ])
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
root.PaperchalkBanditRoster=Object.freeze({version:'1.0.0',PROFILES,unit});
})(window);
