/* Reusable rules: seven independent physical class decks, one shared hand.
 * The PLAYER decides which deck to click and how many cards to draw (up to cap).
 * No auto opening draw, no auto turn draw, no first-play draw lock.
 * Unplayed hand cards survive turn boundaries; played cards enter discard.
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
 {id:'strike',name:'普通攻击',family:'common',power:2},
 {id:'heavy-strike',name:'重劈',family:'common',power:3},
 {id:'sunder',name:'破甲斩',family:'common',power:3},
 {id:'guard-blow',name:'防守反击',family:'common',power:2},
 {id:'cleave',name:'强力挥砍',family:'common',power:3},
 {id:'firewood-chop',name:'伐木劈砍',family:'faction',power:4},
 {id:'wood-grain',name:'顺纹劈斩',family:'faction',power:3},
 {id:'forest-axe',name:'林地斧击',family:'faction',power:4},
 {id:'timber-split',name:'柴薪分裂',family:'faction',power:3},
 {id:'stump-strike',name:'树桩重击',family:'faction',power:3}
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
const ENGINEER_CARDS=Object.freeze([
 {id:'repair',name:'修理',family:'common',power:1},
 {id:'setup',name:'快速搭建',family:'common',power:1},
 {id:'soil-work',name:'整地',family:'common',power:1},
 {id:'wooden-fence',name:'木栅栏',family:'common',power:1},
 {id:'maintenance',name:'维护',family:'common',power:1},
 {id:'sow-seeds',name:'播种',family:'faction',power:1},
 {id:'water-wheel',name:'水车',family:'faction',power:1},
 {id:'farm-field',name:'农田',family:'faction',power:1},
 {id:'food-supply',name:'粮食补给',family:'faction',power:1},
 {id:'harvest',name:'丰收',family:'faction',power:1}
]);
const BASE_POOL=Object.freeze({warrior:WARRIOR_CARDS,ranger:RANGER_CARDS,engineer:ENGINEER_CARDS});
function create(options={}){
 const cap=options.maxHand??10;
 if(!Number.isInteger(cap)||cap<1)throw Error('Invalid shared hand cap');
  // First-level VISUAL prototype: seven independent functional decks with the
 // same temporary warrior-card contents. The normal class gate is unchanged.
 const prototypeAllClasses=options.prototypeAllClasses===true;
 const unlocked=prototypeAllClasses?new Set(CLASSES.map(c=>c.id)):new Set(options.unlocked||['warrior']);
 let seed=options.seed??618231;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const pool={};
 for(const c of CLASSES){
  const source=prototypeAllClasses?WARRIOR_CARDS:(BASE_POOL[c.id]||[]);
  pool[c.id]=source.map((x,i)=>({...x,profession:c.id,instance:c.id+'-'+i}));
 }
 const piles=new Map(),discards=new Map();
 let hand=[],played=[],turn=1;
 function shuffle(a){
  for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
 }
 function reload(){
  piles.clear();discards.clear();
  // Same temporary card art AND the same face-up order in all seven columns,
  // but each column owns a separate real stack and separate remaining count.
  const prototypeOrder=prototypeAllClasses
    ? shuffle([...pool.warrior]).map(card=>card.id):null;
  for(const c of CLASSES){
   discards.set(c.id,[]);
   if(!unlocked.has(c.id)){piles.set(c.id,[]);continue;}
   if(prototypeOrder){
    const byId=new Map(pool[c.id].map(card=>[card.id,card]));
    piles.set(c.id,prototypeOrder.map(id=>byId.get(id)));
   }else piles.set(c.id,shuffle([...pool[c.id]]));
  }
 }
 function count(){return hand.length;}
 function snapshot(){
  return {
   turn,locked:false,manualDraw:true,played:played.length,maxHand:cap,count:count(),
   hand:hand.map(x=>({...x})),
   classes:CLASSES.map(c=>({...c,unlocked:unlocked.has(c.id),
     handCount:hand.filter(card=>card.profession===c.id).length,
     deckCount:piles.get(c.id)?.length||0,discardCount:discards.get(c.id)?.length||0}))
  };
 }
 function draw(profession){
  if(!unlocked.has(profession))return {ok:false,reason:'locked-class'};
  if(count()>=cap)return {ok:false,reason:'hand-full'};
  const deck=piles.get(profession);
  if(!deck)return {ok:false,reason:'box-empty'};
  if(!deck.length){
   // Draw pile only refills when exhausted; cards previously used this fight
   // return from their class discard, rather than resetting every turn.
   const discard=discards.get(profession);
   if(discard?.length){deck.push(...shuffle(discard.splice(0)));}
  }
  if(!deck.length)return {ok:false,reason:'box-empty'};
  const card=deck.pop();hand.push(card);
  return {ok:true,card:{...card},state:snapshot()};
 }
 function play(instance){
  const index=hand.findIndex(x=>x.instance===instance);
  if(index<0)return {ok:false,reason:'not-in-hand'};
  const card=hand.splice(index,1)[0];
  played.push(card);
  return {ok:true,card:{...card},state:snapshot()};
 }
 // A card/effect calls this explicitly. The UI never offers a generic discard button.
 function specialDiscard(instance){
  const index=hand.findIndex(x=>x.instance===instance);
  if(index<0)return {ok:false,reason:'not-in-hand'};
  const card=hand.splice(index,1)[0];played.push(card);
  return {ok:true,card:{...card},state:snapshot()};
 }
 function nextTurn(){
  // No forced discard of a player's unused cards and no automatic dealing.
  for(const card of played)discards.get(card.profession)?.push(card);
  played=[];turn++;
  return snapshot();
 }
 function reset(){
  turn=1;hand=[];played=[];reload();
  return snapshot();
 }
 reload();reset();
 function remainingCards(profession){return (piles.get(profession)||[]).map(card=>({...card}));}
 return Object.freeze({snapshot,remainingCards,draw,play,specialDiscard,nextTurn,reset,
  classes:CLASSES,get cap(){return cap;}});
}
root.PaperchalkProfessionDecks=Object.freeze({version:'3.1.0',CLASSES,WARRIOR_CARDS,RANGER_CARDS,ENGINEER_CARDS,create});
})(window);
