/* PAPERWORLD / NIGHTFALL ROUTES — original deterministic open-zone survival card combat.
 * No poker scoring: action cards spend stamina, zombies telegraph attacks,
 * the player navigates an unbounded coordinate map and collects persistent loot.
 * All state is plain JSON so the Android WebView resumes the same world.
 */
export const VERSION=2;
export const CARD_DEFS={
 knife:{name:'折刀突击',icon:'✦',cost:1,type:'attack',text:'对一名敌人造成 7 点伤害',damage:7},
 guard:{name:'临时掩体',icon:'▣',cost:1,type:'skill',text:'获得 7 点防御',block:7},
 shove:{name:'推开尸群',icon:'↯',cost:1,type:'attack',text:'造成 4 点伤害，目标下回合攻击 -3',damage:4,weak:3},
 shot:{name:'最后一发',icon:'◈',cost:2,type:'attack',text:'造成 15 点伤害。噪音 +2',damage:15,noise:2},
 bandage:{name:'止血绷带',icon:'✚',cost:1,type:'skill',text:'恢复 9 生命；本战斗移除',heal:9,exhaust:true},
 search:{name:'观察破绽',icon:'⌕',cost:0,type:'skill',text:'抽 2 张牌',draw:2},
 sprint:{name:'翻越障碍',icon:'➜',cost:1,type:'skill',text:'获得 4 防御，抽 1 张牌',block:4,draw:1},
 fire:{name:'燃烧瓶',icon:'♨',cost:2,type:'attack',text:'所有敌人受到 6 点伤害，附加 3 点燃烧',damage:6,all:true,burn:3},
 brace:{name:'堵住门板',icon:'▤',cost:2,type:'skill',text:'获得 15 点防御',block:15},
 counter:{name:'反手一击',icon:'⤴',cost:1,type:'attack',text:'造成 5 点伤害并获得 4 防御',damage:5,block:4},
 focus:{name:'稳住呼吸',icon:'◇',cost:0,type:'skill',text:'恢复 1 点体力；本战斗移除',energy:1,exhaust:true},
 cleave:{name:'横扫铁棍',icon:'✣',cost:2,type:'attack',text:'所有敌人受到 9 点伤害',damage:9,all:true}
};
export const ENEMIES={
 drifter:{name:'游荡感染者',hp:18,attack:7,icon:'♟',intent:'撕咬'},
 sprinter:{name:'狂奔感染者',hp:14,attack:9,icon:'♞',intent:'扑袭'},
 bloated:{name:'肿胀感染者',hp:26,attack:6,icon:'♜',intent:'碾压'},
 watcher:{name:'潜伏感染者',hp:21,attack:8,icon:'♝',intent:'突刺'}
};
export const LOCATIONS=[
 {id:'street',name:'寂静街区',mark:'▦',color:'#718199',desc:'路边的车门开着，风把塑料袋吹得沙沙作响。'},
 {id:'store',name:'废弃商店',mark:'▤',color:'#cfaa84',desc:'收银台后面还有半瓶水。货架深处传来细小的刮擦声。'},
 {id:'clinic',name:'社区诊所',mark:'✚',color:'#b6bacc',desc:'药品柜子被砸碎了，消毒水的气味还留在空气里。'},
 {id:'apartment',name:'旧居民楼',mark:'⌂',color:'#c9a5b9',desc:'楼道里贴满断电通知，窗帘后似乎有人走过。'},
 {id:'garage',name:'地下车库',mark:'▥',color:'#91a4aa',desc:'深处偶尔传来金属撞击声。汽油味令人不安。'},
 {id:'warehouse',name:'货运仓库',mark:'▧',color:'#bcae8d',desc:'货箱散落在雨后的水泥地上，脚印延伸进黑暗。'},
 {id:'park',name:'荒芜公园',mark:'♧',color:'#8b9f87',desc:'游乐设施吱呀作响，石椅上留着刚被翻动的背包。'}
];
const STARTER={knife:4,guard:4,shove:2,shot:1,bandage:1,search:2};
const REWARDS=['fire','brace','counter','sprint','focus','cleave','knife','guard','shot'];
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const key=(x,y)=>x+','+y;
const safeNumber=n=>Number.isSafeInteger(n)&&Math.abs(n)<=1000000;
function hash(seed,x,y){
 let n=(Math.imul((x+1013904223)|0,374761393)^Math.imul((y+668265263)|0,1274126177)^seed)>>>0;
 n=Math.imul(n^(n>>>13),1274126177)>>>0;
 return (n^(n>>>16))>>>0;
}
export function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296}
export function shuffle(s,arr){for(let i=arr.length-1;i>0;i--){let j=Math.floor(random(s)*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
export function locationAt(s,x=s.x,y=s.y){
 if(x===0&&y===0)return {id:'shelter',name:'十三号避难所',mark:'⌂',color:'#F2A5C2',desc:'地下工作台和一盏还能亮的灯。这里暂时安全。',risk:0};
 const dist=Math.abs(x)+Math.abs(y),n=hash(s.seed,x,y),loc=LOCATIONS[n%LOCATIONS.length];
 return {...loc,risk:clamp(1+Math.floor(dist/3)+(n%5===0?1:0),1,4)};
}
export function visitedAt(s,x=s.x,y=s.y){return s.visited[key(x,y)]||null}
export function appendLog(s,message){s.log.unshift(message);s.log=s.log.slice(0,10);s.notice=message}
function addCard(s,type){if(!CARD_DEFS[type])throw Error('未知卡牌');const uid='d'+s.nextCard++;s.cards.push({uid,type});return uid}
function populateStarter(s){for(const [type,count] of Object.entries(STARTER))for(let i=0;i<count;i++)addCard(s,type)}
export function createGame(seed=1729){
 const s={version:VERSION,seed:seed>>>0,rng:seed>>>0,x:0,y:0,day:1,hour:17,moves:0,
  phase:'explore',hp:60,maxHp:60,block:0,energy:3,maxEnergy:3,hunger:80,thirst:80,food:3,water:3,medkit:1,scrap:2,noise:0,infection:0,
  cards:[],nextCard:1,hand:[],draw:[],discard:[],exhaust:[],enemies:[],turn:0,
  visited:{'0,0':{cleared:true,searched:false}},reward:[],kills:0,notice:'在安全屋整备物资，选择方向进入废墟。',log:[]};
 populateStarter(s);appendLog(s,'无线电传来杂音：别让他们听到你的脚步。');
 return s;
}
function drawCards(s,count){
 for(let i=0;i<count;i++){
  if(!s.draw.length){if(!s.discard.length)break;s.draw=shuffle(s,s.discard.splice(0))}
  s.hand.push(s.draw.pop());
 }
}
const cardByUid=(s,uid)=>s.cards.find(c=>c.uid===uid);
const getDef=(s,uid)=>CARD_DEFS[cardByUid(s,uid)?.type];
function startCombat(s){
 const loc=locationAt(s),dist=Math.abs(s.x)+Math.abs(s.y),count=clamp(1+Math.floor((dist+1)/4),1,3);
 const kinds=Object.keys(ENEMIES);
 s.enemies=Array.from({length:count},(_,i)=>{
  const type=kinds[hash(s.seed+77,s.x*11+i,s.y*7+i)%kinds.length],b=ENEMIES[type];
  const bonus=Math.floor(dist/3)*2;
  return {id:'z'+i,type,name:b.name,hp:b.hp+bonus,maxHp:b.hp+bonus,attack:b.attack+Math.floor(dist/4),weak:0,burn:0,intent:'attack'};
 });
 s.phase='combat';s.turn=1;s.energy=s.maxEnergy;s.block=0;
 s.hand=[];s.discard=[];s.exhaust=[];s.draw=shuffle(s,s.cards.map(c=>c.uid));drawCards(s,5);
 appendLog(s,loc.name+'：发现 '+count+' 名感染者，准备战斗。');
}
function timePasses(s){
 s.hour++;
 if(s.hour>=24){s.hour=0;s.day++}
 s.moves++;s.hunger=clamp(s.hunger-3,0,100);s.thirst=clamp(s.thirst-4,0,100);
 s.noise=clamp(s.noise-1,0,10);
 if(s.hunger===0||s.thirst===0){s.hp=clamp(s.hp-3,0,s.maxHp);appendLog(s,'缺乏补给，身体开始衰弱。')}
 if(s.hp<=0){s.phase='dead';appendLog(s,'你倒在了无人应答的街道上。')}
}
export function travel(s,dx,dy){
 if(s.phase!=='explore'||!safeNumber(dx)||!safeNumber(dy)||Math.abs(dx)+Math.abs(dy)!==1)return false;
 if(Math.abs(s.x+dx)>999||Math.abs(s.y+dy)>999)return false;
 s.x+=dx;s.y+=dy;timePasses(s);if(s.phase==='dead')return true;
 const id=key(s.x,s.y),loc=locationAt(s);
 if(!s.visited[id])s.visited[id]={cleared:false,searched:false};
 if(!s.visited[id].cleared){
  const value=hash(s.seed+19,s.x,s.y)%100;
  if(value<64+loc.risk*6+Math.min(s.noise,8)){startCombat(s);return true}
  s.visited[id].cleared=true;
 }
 appendLog(s,'抵达 '+loc.name+'。'+loc.desc);
 return true;
}
export function searchArea(s){
 if(s.phase!=='explore')return false;
 const v=visitedAt(s);
 if(!v||v.searched)return false;
 v.searched=true;timePasses(s);if(s.phase==='dead')return true;
 const loc=locationAt(s),r=hash(s.seed+319,s.x,s.y)%5;
 let item='scrap';
 if(loc.id==='clinic'||r===0){s.medkit++;item='急救包'}
 else if(loc.id==='store'||r===1){s.food++;item='罐头'}
 else if(r===2){s.water++;item='饮用水'}
 else{s.scrap+=2;item='零件 ×2'}
 appendLog(s,'搜刮 '+loc.name+'：找到 '+item+'。');
 return true;
}
export function useItem(s,id){
 if(!['explore','combat'].includes(s.phase))return false;
 if(s.phase==='combat'&&s.energy<1)return false;
 let allowed=false;
 if(id==='food'&&s.food>0&&s.hunger<100){s.food--;s.hunger=clamp(s.hunger+28,0,100);allowed=true}
 if(id==='water'&&s.water>0&&s.thirst<100){s.water--;s.thirst=clamp(s.thirst+35,0,100);allowed=true}
 if(id==='medkit'&&s.medkit>0&&s.hp<s.maxHp){s.medkit--;s.hp=clamp(s.hp+22,0,s.maxHp);s.infection=clamp(s.infection-3,0,100);allowed=true}
 if(!allowed)return false;
 if(s.phase==='combat')s.energy--;
 appendLog(s,'使用物资：'+({food:'罐头',water:'饮用水',medkit:'急救包'})[id]);
 return true;
}
export function rest(s){
 if(s.phase!=='explore'||s.x!==0||s.y!==0||s.food<=0||s.water<=0)return false;
 s.food--;s.water--;s.hp=clamp(s.hp+22,0,s.maxHp);s.hunger=clamp(s.hunger+20,0,100);
 s.thirst=clamp(s.thirst+22,0,100);s.infection=clamp(s.infection-2,0,100);
 s.hour+=8;while(s.hour>=24){s.hour-=24;s.day++}
 appendLog(s,'在避难所休息，耗费一份食物和水，恢复生命。');return true;
}
function win(s){
 s.kills+=s.enemies.length;
 s.visited[key(s.x,s.y)].cleared=true;
 s.phase='reward';s.energy=0;s.block=0;s.enemies=[];s.hand=[];s.draw=[];s.discard=[];s.exhaust=[];
 s.scrap+=2;s.food+=(random(s)<0.38?1:0);s.water+=(random(s)<0.45?1:0);
 s.reward=shuffle(s,[...REWARDS]).slice(0,3);
 appendLog(s,'尸群已清除，得到零件 ×2。选择一张战术卡，或跳过。');
}
export function playCard(s,uid,target=0){
 if(s.phase!=='combat'||!s.hand.includes(uid))return {ok:false,reason:'该卡牌不在手上'};
 const def=getDef(s,uid);
 if(!def||s.energy<def.cost)return {ok:false,reason:'体力不足'};
 let enemy=s.enemies[target];
 if(def.damage&&!def.all&&(!enemy||enemy.hp<=0))return {ok:false,reason:'选择有效敌人'};
 s.energy-=def.cost;s.hand.splice(s.hand.indexOf(uid),1);
 (def.exhaust?s.exhaust:s.discard).push(uid);
 const events=[];
 if(def.block){s.block+=def.block;events.push('获得 '+def.block+' 防御')}
 if(def.heal){s.hp=clamp(s.hp+def.heal,0,s.maxHp);events.push('恢复 '+def.heal+' 生命')}
 if(def.energy){s.energy=clamp(s.energy+def.energy,0,9);events.push('体力 +'+def.energy)}
 if(def.damage){
  const targets=def.all?s.enemies.filter(e=>e.hp>0):[enemy];
  for(const e of targets){e.hp=Math.max(0,e.hp-def.damage);if(def.burn)e.burn+=def.burn;if(def.weak)e.weak=Math.max(e.weak,def.weak);
   events.push(e.name+' -'+def.damage);if(e.hp===0)events.push(e.name+' 倒下')}
 }
 if(def.noise)s.noise=clamp(s.noise+def.noise,0,10);
 if(def.draw)drawCards(s,def.draw);
 appendLog(s,def.name+'：'+events.join('，'));
 if(s.enemies.every(e=>e.hp<=0))win(s);
 return {ok:true,events,victory:s.phase==='reward'};
}
export function endTurn(s){
 if(s.phase!=='combat')return false;
 s.discard.push(...s.hand.splice(0));
 const events=[];
 for(const e of s.enemies){
  if(e.hp<=0)continue;
  if(e.burn>0){e.hp=Math.max(0,e.hp-e.burn);events.push(e.name+' 燃烧 -'+e.burn);e.burn=Math.max(0,e.burn-1)}
  if(e.hp<=0)continue;
  const total=Math.max(1,e.attack-e.weak)+(s.turn%3===0?2:0);
  const blocked=Math.min(s.block,total);s.block-=blocked;
  const damage=total-blocked;s.hp=Math.max(0,s.hp-damage);
  events.push(e.name+' 攻击 '+total+(blocked?'（格挡 '+blocked+'）':''));
  if(damage>0&&e.type==='watcher')s.infection=clamp(s.infection+2,0,100);
  e.weak=0;
 }
 s.turn++;s.block=0;
 if(s.hp<=0){s.phase='dead';appendLog(s,'你被尸群吞没了。');return true}
 if(s.enemies.every(e=>e.hp<=0)){win(s);return true}
 s.energy=s.maxEnergy;s.discard.push(...s.hand.splice(0));drawCards(s,5);
 appendLog(s,events.join('；')+'。第 '+s.turn+' 回合。');
 return true;
}
export function chooseReward(s,cardType=null){
 if(s.phase!=='reward'||(cardType!==null&&!s.reward.includes(cardType)))return false;
 if(cardType){addCard(s,cardType);appendLog(s,'习得战术卡：'+CARD_DEFS[cardType].name)}
 else appendLog(s,'没有拾取新战术卡，继续赶路。');
 s.reward=[];s.phase='explore';return true;
}
export function loadGame(raw){
 const s=typeof raw==='string'?JSON.parse(raw):clone(raw);
 if(!s||s.version!==VERSION||!['explore','combat','reward','dead'].includes(s.phase))throw Error('存档版本不匹配');
 if(!safeNumber(s.x)||!safeNumber(s.y)||!safeNumber(s.hp)||!safeNumber(s.maxHp)||s.maxHp<1||s.hp<0||s.hp>s.maxHp)throw Error('玩家数据损坏');
 if(!Array.isArray(s.cards)||s.cards.length>300||!Array.isArray(s.hand)||!Array.isArray(s.draw)||!Array.isArray(s.discard)||!Array.isArray(s.exhaust)||!Array.isArray(s.enemies)||!Array.isArray(s.reward))throw Error('牌堆存档损坏');
 if(!s.visited||typeof s.visited!=='object'||!Array.isArray(s.log)||!safeNumber(s.nextCard)||!safeNumber(s.energy))throw Error('地图存档损坏');
 const ids=s.cards.map(c=>c.uid);if(new Set(ids).size!==ids.length||s.cards.some(c=>!CARD_DEFS[c.type]||!/^d[0-9]+$/.test(c.uid)))throw Error('牌堆含未知卡牌');
 const active=[...s.hand,...s.draw,...s.discard,...s.exhaust];
 if(active.length&& (active.length!==ids.length||new Set(active).size!==ids.length||active.some(id=>!ids.includes(id))))throw Error('战斗抽牌状态损坏');
 if(s.phase==='combat'&&(!s.enemies.length||!active.length))throw Error('战斗状态损坏');
 if(s.enemies.length>4||s.enemies.some(e=>!ENEMIES[e.type]||!safeNumber(e.hp)||e.hp<0))throw Error('敌人数据损坏');
 return s;
}
export function getMap(s,radius=2){
 const nodes=[];for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  const x=s.x+dx,y=s.y+dy,l=locationAt(s,x,y),v=visitedAt(s,x,y);
  nodes.push({x,y,...l,here:dx===0&&dy===0,known:!!v,cleared:!!v?.cleared});
 }return nodes;
}
export function currentStatus(s){return {location:locationAt(s),visited:visitedAt(s),cards:s.hand.map(uid=>({...cardByUid(s,uid),...getDef(s,uid)}))}}
