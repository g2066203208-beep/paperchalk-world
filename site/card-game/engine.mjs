/* PAPERWORLD: CARD PARADOX / deterministic poker deckbuilding engine v1.
   Pure JavaScript, no DOM/WebGL needed. Original content and original art.
   Design touchstones: poker roguelike deck-building and readable triggered effects.
   Rules are intentionally distinct from any proprietary game's exact tables.
*/
export const VERSION=1;
export const SUITS=['♠','♥','♣','♦'];
export const RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export const HANDS=[
 {id:'high',name:'高牌',chips:8,mult:1},
 {id:'pair',name:'对子',chips:16,mult:2},
 {id:'twoPair',name:'两对',chips:26,mult:2},
 {id:'three',name:'三条',chips:32,mult:3},
 {id:'straight',name:'顺子',chips:42,mult:4},
 {id:'flush',name:'同花',chips:36,mult:4},
 {id:'full',name:'葫芦',chips:52,mult:5},
 {id:'four',name:'四条',chips:65,mult:7},
 {id:'straightFlush',name:'同花顺',chips:100,mult:8}
];
const HAND_BY_ID=Object.fromEntries(HANDS.map(h=>[h.id,h]));
export const JOKERS=[
 {id:'lantern',name:'长明灯',cost:4,desc:'每次出牌 +5 倍率',color:'pink',glyph:'lamp'},
 {id:'gear',name:'齿轮钟',cost:5,desc:'每张计分牌 +7 筹码',color:'blue',glyph:'gear'},
 {id:'rose',name:'荆棘玫瑰',cost:6,desc:'对子或两对 +12 倍率',color:'pink',glyph:'rose'},
 {id:'mirror',name:'双生镜',cost:7,desc:'含两对时 ×2 倍率',color:'blue',glyph:'mirror'},
 {id:'moon',name:'残月',cost:6,desc:'计分牌中每张黑桃 +4 倍率',color:'blue',glyph:'moon'},
 {id:'star',name:'坠星',cost:8,desc:'顺子或同花顺 ×2 倍率',color:'pink',glyph:'star'},
 {id:'clock',name:'倒流沙漏',cost:7,desc:'少于 3 张计分牌时 +32 筹码',color:'blue',glyph:'clock'},
 {id:'crown',name:'纸王冠',cost:9,desc:'三条、葫芦或四条 ×2 倍率',color:'pink',glyph:'crown'},
 {id:'rune',name:'秘文',cost:5,desc:'计分牌中每张 A +20 筹码',color:'blue',glyph:'rune'},
 {id:'vessel',name:'空杯',cost:7,desc:'每次结算 +3 × 当前弃牌次数的倍率',color:'pink',glyph:'vessel'},
 {id:'orbit',name:'轨道',cost:8,desc:'同花或同花顺时 +45 筹码',color:'blue',glyph:'orbit'},
 {id:'ember',name:'余烬',cost:6,desc:'当前剩余出牌次数每次 +6 倍率',color:'pink',glyph:'ember'}
];
const JOKER_MAP=Object.fromEntries(JOKERS.map(j=>[j.id,j]));
export const BLINDS=[
 {name:'起始试炼',target:250,reward:5},{name:'铁面试炼',target:380,reward:6},{name:'钟楼守卫',target:560,reward:8,boss:true},
 {name:'深影试炼',target:750,reward:6},{name:'回响试炼',target:1050,reward:7},{name:'白骨书吏',target:1450,reward:9,boss:true},
 {name:'暮光试炼',target:1850,reward:8},{name:'终局试炼',target:2400,reward:9},{name:'无面裁定者',target:3200,reward:12,boss:true}
];
export function rngNext(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296}
export function shuffle(s,arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(rngNext(s)*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
export function cardValue(card){return card.rank===1?11:Math.min(card.rank,10)}
export function makeDeck(){
 const deck=[];let i=0;
 for(let suit=0;suit<4;suit++)for(let rank=1;rank<=13;rank++)
  deck.push({id:'c'+(++i),rank,suit});
 return deck;
}
export function sortedUnique(vals){return [...new Set(vals)].sort((a,b)=>a-b)}
export function detectHand(cards){
 if(!cards.length||cards.length>5)throw Error('必须选择 1–5 张牌');
 const counts=new Map();
 for(const c of cards)counts.set(c.rank,(counts.get(c.rank)||0)+1);
 const groups=[...counts.entries()].map(([rank,n])=>({rank,n})).sort((a,b)=>b.n-a.n||b.rank-a.rank);
 const n=cards.length,nums=sortedUnique(cards.map(c=>c.rank===1?14:c.rank));
 // A can count low in A-2-3-4-5.
 const seq=n===5&&(nums[4]-nums[0]===4||nums.join(',')==='2,3,4,5,14');
 const flush=n===5&&cards.every(c=>c.suit===cards[0].suit);
 let id='high';
 if(seq&&flush)id='straightFlush';
 else if(groups[0].n===4)id='four';
 else if(n===5&&groups[0].n===3&&groups[1]?.n===2)id='full';
 else if(flush)id='flush';
 else if(seq)id='straight';
 else if(groups[0].n===3)id='three';
 else if(groups.filter(g=>g.n===2).length>=2)id='twoPair';
 else if(groups[0].n===2)id='pair';
 const relevant=id==='straightFlush'||id==='straight'||id==='flush'||id==='full'?cards:
 id==='twoPair'?cards.filter(c=>counts.get(c.rank)===2):
 id==='high'?cards.filter(c=>c.rank===Math.max(...cards.map(p=>p.rank===1?14:p.rank))):
 cards.filter(c=>counts.get(c.rank)===groups[0].n);
 return {id,name:HAND_BY_ID[id].name,scoredIds:relevant.map(c=>c.id),baseChips:HAND_BY_ID[id].chips,baseMult:HAND_BY_ID[id].mult};
}
export function scoreHand(cards,jokerIds=[],levels={},context={}){
 const hand=detectHand(cards),selected=cards.filter(c=>hand.scoredIds.includes(c.id));
 let chips=hand.baseChips+(levels[hand.id]||0)*10;
 let mult=hand.baseMult+(levels[hand.id]||0);
 const events=[{type:'hand',name:hand.name,chips,mult}];
 for(const card of selected){
  const add=cardValue(card);
  chips+=add;events.push({type:'card',id:card.id,label:RANKS[card.rank-1]+SUITS[card.suit],chips:add});
 }
 const active=new Set();
 for(const id of jokerIds){
  const joker=JOKER_MAP[id];if(!joker||active.has(id))continue;
  active.add(id);
  let add=0,mul=1,chip=0;
  switch(id){
   case 'lantern':add=5;break;
   case 'gear':chip=7*selected.length;break;
   case 'rose':if(hand.id==='pair'||hand.id==='twoPair')add=12;break;
   case 'mirror':if(hand.id==='twoPair')mul=2;break;
   case 'moon':add=4*selected.filter(c=>c.suit===0).length;break;
   case 'star':if(hand.id==='straight'||hand.id==='straightFlush')mul=2;break;
   case 'clock':if(selected.length<3)chip=32;break;
   case 'crown':if(['three','full','four'].includes(hand.id))mul=2;break;
   case 'rune':chip=20*selected.filter(c=>c.rank===1).length;break;
   case 'vessel':add=3*(context.discardsRemaining||0);break;
   case 'orbit':if(['flush','straightFlush'].includes(hand.id))chip=45;break;
   case 'ember':add=6*(context.handsRemaining||0);break;
  }
  if(add||mul!==1||chip){
   chips+=chip;mult=(mult+add)*mul;
   events.push({type:'joker',id,name:joker.name,chips:chip,mult:add,multiply:mul,totalChips:chips,totalMult:mult});
  }
 }
 const score=Math.round(chips*mult);
 events.push({type:'total',score,chips,mult});
 return {...hand,chips,mult,score,events};
}
export function currentBlind(s){return BLINDS[Math.min(s.blind,BLINDS.length-1)]}
export function stateClone(s){return JSON.parse(JSON.stringify(s))}
function draw(s,n){
 for(let k=0;k<n;k++){
  if(!s.deck.length){if(!s.discard.length)break;s.deck=shuffle(s,s.discard.splice(0))}
  s.hand.push(s.deck.pop());
 }
}
function enterBlind(s){
 s.phase='battle';s.score=0;s.hands=4+s.bonusHands;s.discards=3+s.bonusDiscards;
 s.hand=[];s.deck=shuffle(s,[...s.deck,...s.discard]);s.discard=[];
 draw(s,8);
 s.selected=[];s.shop=[];s.lastScore=null;s.notice='选择 1–5 张手牌，打出组合击败盲注。';
}
function availableJokers(s){
 const excluded=new Set([...s.jokers,...s.shop]);
 const choices=shuffle(s,JOKERS.filter(j=>!excluded.has(j.id)).map(j=>j.id));
 return choices.slice(0,3);
}
export function createGame(seed=1729){
 const s={version:VERSION,seed:seed>>>0,rng:seed>>>0,phase:'battle',blind:0,score:0,
 money:8,hand:[],deck:shuffle({rng:seed>>>0},makeDeck()),discard:[],
 jokers:[],selected:[],shop:[],hands:4,discards:3,bonusHands:0,bonusDiscards:0,
 levels:{},lastScore:null,notice:'',stats:{played:0,highest:0,won:0},rerollCost:3};
 // Seed both card order and subsequent shop RNG deterministically.
 s.rng=(seed>>>0);
 s.deck=shuffle(s,makeDeck());enterBlind(s);
 return s;
}
export function selection(s,id){
 if(s.phase!=='battle')return false;
 if(!s.hand.some(c=>c.id===id))return false;
 const n=s.selected.indexOf(id);
 if(n>=0)s.selected.splice(n,1);
 else if(s.selected.length<5)s.selected.push(id);
 else return false;
 return true;
}
export function play(s){
 if(s.phase!=='battle'||!s.selected.length||!s.hands)return {ok:false,reason:'请先选择要打出的牌'};
 const cards=s.hand.filter(c=>s.selected.includes(c.id));
 const result=scoreHand(cards,s.jokers,s.levels,{discardsRemaining:s.discards,handsRemaining:s.hands-1});
 s.lastScore=result;s.score+=result.score;s.stats.played++;s.stats.highest=Math.max(s.stats.highest,result.score);
 s.hands--;s.hand=s.hand.filter(c=>!s.selected.includes(c.id));
 s.discard.push(...cards);s.selected=[];
 const blind=currentBlind(s);
 if(s.score>=blind.target){
  s.phase='shop';s.money+=blind.reward;s.stats.won++;
  s.shop=availableJokers(s);
  s.notice=blind.name+' 已击破！获得 $'+blind.reward+'，进入商店。';
 }else if(s.hands===0){
  s.phase='lost';s.notice='本次挑战失败，可重新开始。';
 }else{
  draw(s,8-s.hand.length);
  s.notice='得分 '+result.score.toLocaleString('zh-CN')+' · 继续组合手牌。';
 }
 return {ok:true,result,won:s.phase==='shop',lost:s.phase==='lost'};
}
export function discardSelected(s){
 if(s.phase!=='battle'||!s.selected.length||s.discards<=0)return false;
 const removed=s.hand.filter(c=>s.selected.includes(c.id));
 s.hand=s.hand.filter(c=>!s.selected.includes(c.id));s.discard.push(...removed);s.selected=[];
 s.discards--;draw(s,8-s.hand.length);s.notice='弃掉 '+removed.length+' 张牌，重新摸牌。';
 return true;
}
export function purchase(s,id){
 if(s.phase!=='shop'||!s.shop.includes(id)||s.jokers.length>=5)return false;
 const j=JOKER_MAP[id];if(!j||s.money<j.cost)return false;
 s.money-=j.cost;s.jokers.push(id);s.shop=s.shop.filter(x=>x!==id);
 s.notice='获得 '+j.name+'。小丑牌从左到右结算。';
 return true;
}
export function reroll(s){
 if(s.phase!=='shop'||s.money<s.rerollCost)return false;
 s.money-=s.rerollCost;s.rerollCost++;
 s.shop=availableJokers(s);s.notice='已刷新商店，刷新费用递增。';
 return true;
}
export function levelUp(s){
 if(s.phase!=='shop'||s.money<5)return false;
 const id=HANDS[Math.floor(rngNext(s)*HANDS.length)].id;
 s.money-=5;s.levels[id]=(s.levels[id]||0)+1;s.notice=HAND_BY_ID[id].name+'升级至 '+(s.levels[id]+1)+' 级。';
 return true;
}
export function proceed(s){
 if(s.phase!=='shop')return false;
 if(s.blind>=BLINDS.length-1){s.phase='victory';s.notice='九场试炼全部完成！';return true;}
 s.blind++;s.rerollCost=3;enterBlind(s);return true;
}
export function sortHand(s,method='rank'){
 if(method==='suit')s.hand.sort((a,b)=>a.suit-b.suit||b.rank-a.rank);
 else s.hand.sort((a,b)=>(b.rank===1?14:b.rank)-(a.rank===1?14:a.rank)||a.suit-b.suit);
}
export function preview(s){
 const cards=s.hand.filter(c=>s.selected.includes(c.id));
 return cards.length?scoreHand(cards,s.jokers,s.levels,{discardsRemaining:s.discards,handsRemaining:s.hands-1}):null;
}
export function loadGame(raw){
 const s=typeof raw==='string'?JSON.parse(raw):raw;
 if(!s||s.version!==VERSION||!['battle','shop','lost','victory'].includes(s.phase))throw Error('存档版本无效');
 if(!Array.isArray(s.hand)||!Array.isArray(s.deck)||!Array.isArray(s.discard)||!Array.isArray(s.jokers)||!Array.isArray(s.selected)||!Array.isArray(s.shop))throw Error('存档损坏');
 if(s.hand.length>52||s.jokers.length>5||s.blind<0||s.blind>=BLINDS.length||!Number.isFinite(s.money))throw Error('存档数据超限');
 const all=[...s.hand,...s.deck,...s.discard];
 if(all.length!==52||new Set(all.map(c=>c.id)).size!==52||all.some(c=>!/^c(?:[1-9]|[1-4][0-9]|5[0-2])$/.test(c.id)||c.rank<1||c.rank>13||c.suit<0||c.suit>3))throw Error('牌组验证失败');
 if(s.selected.some(id=>!s.hand.some(c=>c.id===id))||s.selected.length>5)throw Error('选牌记录损坏');
 if(s.jokers.some(id=>!JOKER_MAP[id])||new Set(s.jokers).size!==s.jokers.length)throw Error('小丑牌无效');
 return s;
}
