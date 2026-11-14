/* Reusable headless hand adapter for any registered battle level.
 * EXPLICIT dependency injection: no global debug-state or late-script timing.
 * One independent pile per owned character, up to seven left-packed slots;
 * shared ten-card hand, manual draw only, no automatic start/turn deal.
 */
(function(root){'use strict';
function create({level,characterRegistry=root.PaperchalkCharacterRegistry,
 maxHand=10,seed=618231}={}){
 const factory=root.PaperchalkProfessionDecks;
 if(!factory||!level||typeof level.snapshot!=='function')
  throw Error('Card hand requires level and registered deck engine');
 const units=level.snapshot().units;
 const ownedCharacters=units.filter(u=>u.side==='ally').map(u=>({
  id:u.id,name:u.name,profession:u.role,faction:u.faction||null,
  characterId:u.characterId,
  portrait:characterRegistry?.get(u.characterId)?.portrait||null
 }));
 const model=factory.create({maxHand,ownedCharacters,seed});
 let selectedInstance=null;
 const active=()=>level.phase==='active'&&!root.__forestCombat?.busy;
 function snapshot(){return model.snapshot();}
 function selectedCard(){return snapshot().hand.find(c=>c.instance===selectedInstance)||null;}
 function selectCard(instance){
  if(!active()||!snapshot().hand.some(c=>c.instance===instance))return false;
  selectedInstance=selectedInstance===instance?null:instance;
  return true;
 }
 function draw(ownerId){
  if(level.phase!=='active')return {ok:false,reason:'not-player-turn'};
  if(root.__forestCombat?.busy)return {ok:false,reason:'combat-animation'};
  return model.draw(ownerId);
 }
 function consumeSelected(type){
  if(!active())return null;
  const card=selectedCard();
  if(!card||card.type!==type)return null;
  const played=model.play(card.instance);
  if(!played.ok)return null;
  selectedInstance=null;return played.card;
 }
 function consumeForTarget(targetId){
  const card=selectedCard();
  if(!active()||!card||(card.type&&card.type!=='attack'))return null;
  const played=model.play(card.instance);
  if(!played.ok)return null;
  selectedInstance=null;
  return{damage:played.card.power,card:played.card,targetId,
   block:0,shape:played.card.shape||'single',
   pierce:played.card.pierce===true};
 }
 function reset(){selectedInstance=null;return model.reset();}
 function onDeployment(){
  selectedInstance=null;return model.snapshot();
 }
 function nextTurn(){
  if(level.phase!=='active')return false;
  selectedInstance=null;
  return model.nextTurn();
 }
 return Object.freeze({
  consumeForTarget,consumeSelected,selectedCard,reset,onDeployment,nextTurn,
  selectCard,draw,snapshotFn:snapshot,
  clearSelection(){selectedInstance=null;},
  remainingCards:ownerId=>model.remainingCards(ownerId),
  get selected(){return selectedInstance;},
  get snapshot(){return snapshot();},
  selectTop(profession){
   const card=snapshot().hand.find(c=>c.profession===profession);
   return card?selectCard(card.instance):false;
  }
 });
}
root.PaperchalkForestHand=Object.freeze({version:'2.0.0-injected-level',create});
})(window);
