/* Seven independent physical deck boxes, one shared free-order ten-card hand.
   Deck boxes deal their top card. Once drawn, ALL hand cards are individually playable.
   The first action played locks ordinary draws until the next turn.
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
 const opening=options.openingDraw??5; // configurable test value, not per-turn quota
 const unlocked=new Set(options.unlocked||['warrior']);
 let seed=options.seed??618231;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const pool={};
 for(const c of CLASSES)pool[c.id]=(BASE_POOL[c.id]||[]).map((x,i)=>({...x,profession:c.id,instance:c.id+'-'+i}));
 const piles=new Map();
 let hand=[],played=[],locked=false,turn=1;
 function shuffle(a){
  for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
 }
 function reload(){
  piles.clear();
  for(const c of CLASSES)piles.set(c.id,unlocked.has(c.id)?shuffle([...pool[c.id]]):[]);
 }
 function count(){return hand.length;}
 function snapshot(){
  return {
   turn,locked,played:played.length,maxHand:cap,count:count(),
   hand:hand.map(x=>({...x})),
   classes:CLASSES.map(c=>({...c,unlocked:unlocked.has(c.id),
     handCount:hand.filter(card=>card.profession===c.id).length,
     deckCount:piles.get(c.id)?.length||0}))
  };
 }
 function draw(profession,{special=false}={}){
  if(!unlocked.has(profession))return {ok:false,reason:'locked-class'};
  if(locked&&!special)return {ok:false,reason:'draw-locked'};
  if(count()>=cap)return {ok:false,reason:'hand-full'};
  const deck=piles.get(profession);
  if(!deck||!deck.length)return {ok:false,reason:'box-empty'};
  const card=deck.pop();hand.push(card);
  return {ok:true,card:{...card},state:snapshot()};
 }
 function play(instance){
  const index=hand.findIndex(x=>x.instance===instance);
  if(index<0)return {ok:false,reason:'not-in-hand'};
  const card=hand.splice(index,1)[0];
  played.push(card);locked=true;
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
  turn++;hand=[];played=[];locked=false;reload();
  return snapshot();
 }
 function reset(){
  turn=1;hand=[];played=[];locked=false;reload();
  for(let i=0;i<opening&&count()<cap;i++){
   const profession=unlocked.has('warrior')?'warrior':CLASSES.find(c=>unlocked.has(c.id))?.id;
   if(!profession||!draw(profession).ok)break;
  }
  return snapshot();
 }
 reload();reset();
 return Object.freeze({snapshot,draw,play,specialDiscard,nextTurn,reset,
  classes:CLASSES,get cap(){return cap;}});
}
root.PaperchalkProfessionDecks=Object.freeze({version:'2.0.0',CLASSES,WARRIOR_CARDS,RANGER_CARDS,ENGINEER_CARDS,create});
})(window);
