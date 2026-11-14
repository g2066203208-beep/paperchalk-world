/* Reusable owner-based card decks: the seven-bay case starts EMPTY.
 * Acquired characters are packed in acquisition order from the LEFT.
 * Each character owns one independent action pile; no fake stacks, no
 * class-only placeholders and no automatic opening/turn draw.
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
// All base cards can act without essence. Cards with a named owner are
// unique to that character; never copy "伐木" into other warriors' pools.
// Game-wide authoritative definitions; profession, faction and hero scopes
// are resolved centrally. The deck engine only owns instances and shuffling.
const catalog=root.PaperchalkCardCatalog;
if(!catalog)throw Error('Registered card catalog missing');
const WARRIOR_CARDS=Object.freeze(catalog.forProfession('warrior'));
const RANGER_CARDS=Object.freeze(catalog.forProfession('ranger'));
const ENGINEER_CARDS=Object.freeze(catalog.forProfession('engineer'));
function create(options={}){
 const cap=options.maxHand??10;
 if(!Number.isInteger(cap)||cap<1)throw Error('Invalid shared hand cap');
 const sourceCharacters=options.ownedCharacters||
  (options.unlocked||['warrior']).map(role=>({id:role,profession:role,name:CLASSES.find(c=>c.id===role)?.name||role}));
 if(!Array.isArray(sourceCharacters)||sourceCharacters.length>7)throw Error('Physical card case supports at most seven characters');
 const owned=sourceCharacters.map((c,i)=>{
  const id=c.id||c.unitId||c.characterId;
  const profession=c.profession||c.role;
  if(!id||!CLASSES.some(job=>job.id===profession))throw Error('Invalid owned character');
  return Object.freeze({id,name:c.name||id,profession,faction:c.faction||null,
   portrait:c.portrait||null,characterId:c.characterId||id,slot:i});
 });
 if(new Set(owned.map(x=>x.id)).size!==owned.length)throw Error('Duplicate character deck');
 const byId=new Map(owned.map(c=>[c.id,c]));
 let seed=options.seed??618231;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const piles=new Map(),discards=new Map();
 let hand=[],played=[],turn=1;
 function shuffle(list){
  for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  return list;
 }
 function reload(){
  piles.clear();discards.clear();
  for(const owner of owned){
   const source=catalog.cardsFor(owner);
   piles.set(owner.id,shuffle(source.flatMap((card,i)=>[0,1].map(copy=>({
    ...card,profession:owner.profession,ownerId:owner.id,
    instance:owner.id+'-'+i+'-'+copy
   })))));
   discards.set(owner.id,[]);
  }
 }
 const resolveOwner=key=>byId.get(key)||owned.find(c=>c.profession===key)||null;
 function snapshot(){
  return {
   turn,locked:false,manualDraw:true,played:played.length,
   maxHand:cap,count:hand.length,hand:hand.map(x=>({...x})),
   roster:owned.map(x=>({...x,deckCount:piles.get(x.id)?.length||0,
    handCount:hand.filter(c=>c.ownerId===x.id).length,
    discardCount:discards.get(x.id)?.length||0})),
   classes:CLASSES.map(job=>{
    const roles=owned.filter(x=>x.profession===job.id);
    return {...job,unlocked:roles.length>0,
     deckCount:roles.reduce((n,x)=>n+(piles.get(x.id)?.length||0),0),
     handCount:hand.filter(x=>x.profession===job.id).length,
     discardCount:roles.reduce((n,x)=>n+(discards.get(x.id)?.length||0),0)};
   })
  };
 }
 function draw(ownerKey){
  const owner=resolveOwner(ownerKey);
  if(!owner)return {ok:false,reason:'locked-character'};
  if(hand.length>=cap)return {ok:false,reason:'hand-full'};
  const deck=piles.get(owner.id);
  if(!deck.length){
   const discard=discards.get(owner.id);
   if(discard.length)deck.push(...shuffle(discard.splice(0)));
  }
  if(!deck.length)return {ok:false,reason:'box-empty'};
  const card=deck.pop();
  hand.push(card);
  return {ok:true,card:{...card},state:snapshot()};
 }
 function play(instance){
  const at=hand.findIndex(x=>x.instance===instance);
  if(at<0)return {ok:false,reason:'not-in-hand'};
  const card=hand.splice(at,1)[0];
  played.push(card);
  return {ok:true,card:{...card},state:snapshot()};
 }
 function specialDiscard(instance){
  const at=hand.findIndex(x=>x.instance===instance);
  if(at<0)return {ok:false,reason:'not-in-hand'};
  const card=hand.splice(at,1)[0];played.push(card);
  return {ok:true,card:{...card},state:snapshot()};
 }
 function nextTurn(){
  for(const card of played)discards.get(card.ownerId).push(card);
  played=[];turn++;
  return snapshot();
 }
 function reset(){turn=1;hand=[];played=[];reload();return snapshot();}
 function remainingCards(ownerKey){return [...(piles.get(resolveOwner(ownerKey)?.id)||[])].map(c=>({...c}));}
 reset();
 return Object.freeze({snapshot,remainingCards,draw,play,specialDiscard,nextTurn,reset,
  get roster(){return owned.map(x=>({...x}));},
  classes:CLASSES,get cap(){return cap;}});
}
root.PaperchalkProfessionDecks=Object.freeze({
 version:'6.0.0-card-registry',CLASSES,WARRIOR_CARDS,RANGER_CARDS,ENGINEER_CARDS,create
});
})(window);
