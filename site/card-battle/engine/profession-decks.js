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
const WARRIOR_CARDS=Object.freeze([
 {id:'strike',name:'斧劈',family:'common',type:'attack',power:3,description:'近战造成3点伤害'},
 {id:'heavy-strike',name:'重劈',family:'common',type:'attack',power:5,description:'重斧造成5点伤害'},
 {id:'cleave',name:'横扫',family:'common',type:'attack',power:2,shape:'row',description:'对目标所在排造成2点伤害'},
 {id:'guard',name:'架斧',family:'common',type:'guard',block:3,description:'获得3点格挡'},
 {id:'lumber',name:'伐木',family:'character',characterId:'farmer-warrior-loli-lumberjack',type:'resource',essence:'material',amount:1,description:'获得1点材料精华；砍树额外获得2点'}
]);
const RANGER_CARDS=Object.freeze([
 {id:'aimed-shot',name:'瞄准射击',family:'common',power:2},
 {id:'quick-shot',name:'快速射击',family:'common',power:2},
 {id:'piercing-shot',name:'穿透箭',family:'common',power:3},
 {id:'cover-fire',name:'掩护射击',family:'common',power:2},
 {id:'tracking-shot',name:'追踪箭',family:'common',power:3},
 {id:'woodsman-arrow',name:'猎户箭',family:'faction',power:3},
 {id:'forest-ambush',name:'林间伏射',family:'faction',power:4},
 {id:'prey-mark',name:'猎物标记',family:'faction',power:2},
 {id:'snare-shot',name:'陷阱射击',family:'faction',power:3},
 {id:'hunting-volley',name:'狩猎连射',family:'faction',power:3}
]);
// Farmer character cards: these are not generic engineering structures.
const ENGINEER_CARDS=Object.freeze([
 {id:'farm-field',name:'农田',family:'character',characterId:'farmer-engineer-farmer',type:'facility',footprint:[1,1],description:'每回合生产1点生命精华'},
 {id:'plant-tree',name:'植树',family:'character',characterId:'farmer-engineer-farmer',type:'facility',footprint:[1,1],description:'5耐久，遮挡攻击并逐回合恢复'},
 {id:'water-well',name:'水井',family:'character',characterId:'farmer-engineer-farmer',type:'facility',footprint:[1,1],description:'相邻农夫设施持续效果额外触发'},
 {id:'scarecrow',name:'稻草人',family:'character',characterId:'farmer-engineer-farmer',type:'facility',footprint:[1,1],description:'替附近队友承受一次攻击'},
 {id:'windmill',name:'风车磨坊',family:'character',characterId:'farmer-engineer-farmer',type:'facility',footprint:[2,2],description:'每回合将1生命精华转为材料精华'}
]);
const BASE_POOL=Object.freeze({warrior:WARRIOR_CARDS,ranger:RANGER_CARDS,engineer:ENGINEER_CARDS});
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
  return Object.freeze({id,name:c.name||id,profession,portrait:c.portrait||null,
   characterId:c.characterId||id,slot:i});
 });
 if(new Set(owned.map(x=>x.id)).size!==owned.length)throw Error('Duplicate character deck');
 const byId=new Map(owned.map(c=>[c.id,c]));
 let seed=options.seed??618231;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const piles=new Map(),discards=new Map();
 let hand=[],played=[],turn=1;
 const pool=Object.freeze({warrior:WARRIOR_CARDS,ranger:RANGER_CARDS,engineer:ENGINEER_CARDS});
 function shuffle(list){
  for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  return list;
 }
 function reload(){
  piles.clear();discards.clear();
  for(const owner of owned){
   const source=(pool[owner.profession]||[]).filter(card=>!card.characterId||card.characterId===owner.characterId);
   piles.set(owner.id,shuffle(source.flatMap((card,i)=>[0,1].map(copy=>({
    ...card,profession:owner.profession,ownerId:owner.id,
    instance:owner.id+'-'+i+'-'+copy
   }))));
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
 version:'5.0.0-character-cards',CLASSES,WARRIOR_CARDS,RANGER_CARDS,ENGINEER_CARDS,create
});
})(window);
