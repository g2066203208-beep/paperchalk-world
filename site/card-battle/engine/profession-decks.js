/* Seven class deck-boxes, independent from the 3D scene and character cards.
   Normal draws are unlimited until the first played action, capped at 10 cards in hand.
   Each profession's hand is a LIFO stack. Discard is NOT a general player action.
*/
(function(root){
'use strict';
const CLASSES=Object.freeze([
 {id:'engineer',name:'工程师',icon:'⚙'},
 {id:'guardian',name:'守卫',icon:'盾'},
 {id:'warrior',name:'战士',icon:'斧'},
 {id:'ranger',name:'射手',icon:'弓'},
 {id:'skirmisher',name:'游击者',icon:'影'},
 {id:'medic',name:'医师',icon:'药'},
 {id:'summoner',name:'召唤师',icon:'兽'}
]);
const WARRIOR_CARDS=Object.freeze([
 {id:'strike',name:'普通攻击',family:'common',power:2,description:'造成2点伤害'},
 {id:'heavy-strike',name:'重劈',family:'common',power:3,description:'造成3点伤害'},
 {id:'sunder',name:'破甲斩',family:'common',power:3,description:'造成3点伤害'},
 {id:'guard-blow',name:'防守反击',family:'common',power:2,description:'造成2点伤害'},
 {id:'cleave',name:'强力挥砍',family:'common',power:3,description:'造成3点伤害'},
 {id:'firewood-chop',name:'伐木劈砍',family:'faction',power:4,description:'农民战士专属：4点伤害'},
 {id:'wood-grain',name:'顺纹劈斩',family:'faction',power:3,description:'农民战士专属：3点伤害'},
 {id:'forest-axe',name:'林地斧击',family:'faction',power:4,description:'农民战士专属：4点伤害'},
 {id:'timber-split',name:'柴薪分裂',family:'faction',power:3,description:'农民战士专属：3点伤害'},
 {id:'stump-strike',name:'树桩重击',family:'faction',power:3,description:'农民战士专属：3点伤害'}
]);
function create(options={}){
 const cap=options.maxHand??10;
 const opening=options.openingDraw??5; // tutorial default; never a per-turn draw quota
 const unlocked=new Set(options.unlocked||['warrior']);
 let seed=options.seed??613280;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const pool={warrior:WARRIOR_CARDS.map((x,index)=>({...x,instance:'warrior-'+index,profession:'warrior'}))};
 const piles=new Map(),hands=new Map();
 let locked=false,turn=1,played=0;
 function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function reload(){
  piles.clear();
  for(const classDef of CLASSES)piles.set(classDef.id,shuffle([...(pool[classDef.id]||[])]));
 }
 function count(){return [...hands.values()].reduce((total,a)=>total+a.length,0);}
 function snapshot(){
  return {turn,locked,maxHand:cap,count:count(),played,classes:CLASSES.map(c=>{
    const stack=hands.get(c.id)||[],deck=piles.get(c.id)||[];
    return {...c,unlocked:unlocked.has(c.id),handCount:stack.length,deckCount:deck.length,top:stack.length?{...stack[stack.length-1]}:null};
  })};
 }
 function draw(classId,{special=false}={}){
  if(!unlocked.has(classId))return {ok:false,reason:'locked-class'};
  if(locked&&!special)return {ok:false,reason:'draw-locked'};
  if(count()>=cap)return {ok:false,reason:'hand-full'};
  const deck=piles.get(classId);
  if(!deck||!deck.length)return {ok:false,reason:'box-empty'};
  const card=deck.pop();
  if(!hands.has(classId))hands.set(classId,[]);
  hands.get(classId).push(card);
  return {ok:true,card:{...card},state:snapshot()};
 }
 function playTop(classId,expectedInstance){
  const stack=hands.get(classId)||[];
  const card=stack[stack.length-1];
  if(!card||expectedInstance&&card.instance!==expectedInstance)return {ok:false,reason:'not-top'};
  stack.pop();
  locked=true;played++;
  return {ok:true,card:{...card},state:snapshot()};
 }
 // Only explicitly triggered effects may force a discard.
 function specialDiscardTop(classId){
  const stack=hands.get(classId)||[];
  if(!stack.length)return {ok:false};
  const card=stack.pop();return {ok:true,card:{...card},state:snapshot()};
 }
 function nextTurn(){
  turn++;locked=false;played=0;hands.clear();
  reload();return snapshot();
 }
 function reset(){
  turn=1;locked=false;played=0;hands.clear();reload();
  for(let i=0;i<opening&&count()<cap;i++){
   const classId=unlocked.has('warrior')?'warrior':CLASSES.find(c=>unlocked.has(c.id))?.id;
   if(!classId||!draw(classId).ok)break;
  }
  return snapshot();
 }
 reload();reset();
 return Object.freeze({snapshot,draw,playTop,specialDiscardTop,nextTurn,reset,classes:CLASSES,get cap(){return cap}});
}
root.PaperchalkProfessionDecks=Object.freeze({version:'1.0.0',CLASSES,WARRIOR_CARDS,create});
})(window);
