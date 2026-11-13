/* Headless action-hand bridge. ALL visual action cards and seven physical deck
 * boxes are WebGL meshes rendered by scene-card-hud.js, not DOM elements.
 */
(function(root){
'use strict';
const factory=root.PaperchalkProfessionDecks;
if(!factory)throw Error('Profession model missing');
const units=root.__forestLevelDebug?.state?.units||[];
const activeJobs=units.filter(u=>u.side==='ally').map(u=>u.role).filter(Boolean);
const model=factory.create({maxHand:10,openingDraw:5,unlocked:activeJobs.length?activeJobs:['warrior'],seed:618231});
let selectedInstance=null;
function snapshot(){return model.snapshot();}
function selectedCard(){return snapshot().hand.find(c=>c.instance===selectedInstance)||null;}
function selectCard(instance){
 if(!snapshot().hand.some(c=>c.instance===instance))return false;
 selectedInstance=selectedInstance===instance?null:instance;
 return true;
}
function draw(profession,opts){
 return model.draw(profession,opts);
}
function consumeForTarget(targetId){
 if(!selectedInstance)return null;
 const card=selectedCard();
 if(!card){selectedInstance=null;return null;}
 const result=model.play(selectedInstance);
 if(!result.ok)return null;
 selectedInstance=null;
 return{damage:result.card.power,card:result.card,targetId};
}
function reset(){selectedInstance=null;return model.reset();}
function nextTurn(){
 if(root.__forestLevelDebug?.state?.phase!=='active')return false;
 selectedInstance=null;
 return model.nextTurn();
}
root.__forestHand=Object.freeze({
 consumeForTarget,reset,nextTurn,selectCard,draw,
 get selected(){return selectedInstance;},
 get snapshot(){return model.snapshot();},
 // Compatibility for existing tests and older tutorial shortcuts.
 selectTop(profession){
  const card=snapshot().hand.find(c=>c.profession===profession);
  return card?selectCard(card.instance):false;
 }
});
})(window);
