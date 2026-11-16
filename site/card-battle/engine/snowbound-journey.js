/* Snowbound Journey: complete original prototype rules, inspired by broad
 * deckbuilder mechanics, with original faction characters and event names.
 * Pure JS: no DOM or copyrighted external game assets.
 */
(function(root){
"use strict";
const HEROES=[
 {id:"marksman",name:"赏金枪手",title:"猎人组织",hp:24,atk:5,cd:3,art:"../assets/characters/monster-hunters/04-bounty-markswoman.png",trait:"弹雨",traitText:"首领攻击时对目标附加1层破甲"},
 {id:"frostwitch",name:"霜语魔女",title:"魔女工坊",hp:21,atk:4,cd:2,art:"../assets/characters/witch-workshop/frost-witch.png",trait:"冰咒",traitText:"每轮攻击使敌人倒计时延后1"},
 {id:"warden",name:"封印守卫",title:"猎人组织",hp:30,atk:3,cd:3,art:"../assets/characters/monster-hunters/05-seal-warden.png",trait:"铁誓",traitText:"开始战斗时获得3护盾"}
];
const FRIENDS=[
 {id:"medic",name:"疫医",hp:12,atk:2,cd:3,art:"../assets/characters/monster-hunters/02-blood-physician.png",trait:"治愈",desc:"攻击后治疗我方首领2点"},
 {id:"engineer",name:"陷阱匠",hp:15,atk:3,cd:3,art:"../assets/characters/monster-hunters/03-trap-engineer.png",trait:"破甲",desc:"攻击附加2层破甲"},
 {id:"duelist",name:"夜行剑士",hp:13,atk:4,cd:2,art:"../assets/characters/crimson-vampires/moonlight-duelist.png",trait:"速击",desc:"倒计时2，每次4伤害"},
 {id:"scout",name:"斧刃斥候",hp:17,atk:3,cd:2,art:"../assets/characters/monster-hunters/07-axe-scout.png",trait:"卫护",desc:"每次攻击为首领提供1护盾"}
];
const ENEMIES=[
 {id:"moth",name:"夜巡信使",hp:8,atk:2,cd:3,icon:"❄",art:"../assets/characters/crimson-vampires/minions/01-vampire-messenger.png",desc:"在雪松林传递密信的血族信使"},
 {id:"wolf",name:"提灯侍从",hp:12,atk:3,cd:2,icon:"◆",art:"../assets/characters/crimson-vampires/minions/02-vampire-lantern-bearer.png",desc:"为夜行血族照亮雪路的侍从"},
 {id:"shade",name:"夜幕随从",hp:14,atk:4,cd:3,icon:"☾",art:"../assets/characters/crimson-vampires/minions/03-vampire-retainer.png",desc:"隐藏在大雪中的血族随从"},
 {id:"sentry",name:"冰甲守卫",hp:18,atk:3,cd:3,icon:"◇",desc:"寒霜盔甲保护他的躯体"},
 {id:"witch",name:"霜魇术士",hp:24,atk:4,cd:3,icon:"✷",desc:"施加刺骨寒意"},
 {id:"beast",name:"山脊凶兽",hp:28,atk:6,cd:3,icon:"✦",desc:"轰鸣的山野巨兽"},
 {id:"prince",name:"暮雪领主",hp:38,atk:6,cd:3,icon:"♜",desc:"第二幕守门人"},
 {id:"queen",name:"永夜公主",hp:48,atk:7,cd:3,icon:"♛",desc:"长夜尽头的最终首领",art:"../assets/characters/crimson-vampires/vampire-princess.png"}
];
const ITEMS=[
 {id:"bolt",name:"猎人快枪",tag:"攻击",desc:"造成5点伤害",power:5,kind:"hit",icon:"✦"},
 {id:"silver",name:"银制子弹",tag:"攻击",desc:"造成7伤害，破甲1",power:7,kind:"pierce",icon:"✧"},
 {id:"snow",name:"霜封瓶",tag:"控制",desc:"造成2伤害，延缓目标倒计时2",power:2,kind:"freeze",icon:"❄"},
 {id:"guard",name:"临时掩护",tag:"防御",desc:"首领获得6护盾",power:6,kind:"shield",icon:"⬡"},
 {id:"herb",name:"采药包",tag:"治疗",desc:"首领恢复5生命",power:5,kind:"heal",icon:"✿"},
 {id:"burst",name:"连环铳",tag:"攻击",desc:"对敌方前排全体造成4伤害",power:4,kind:"all",icon:"✣"},
 {id:"frost",name:"月银毒刃",tag:"控制",desc:"造成3伤害，目标攻击-1",power:3,kind:"weaken",icon:"☾"},
 {id:"flare",name:"信号火",tag:"战术",desc:"所有友军倒计时-1",power:1,kind:"haste",icon:"✺"},
 {id:"tea",name:"暖心热茶",tag:"支援",desc:"获得4护盾并治疗2点",power:4,kind:"tea",icon:"♧"},
 {id:"pierce",name:"破晓钉",tag:"攻击",desc:"造成9点伤害",power:9,kind:"hit",icon:"✵"}
];
const CHARMS=[
 {id:"heart",name:"莓果护符",icon:"♥",desc:"领队最大生命+5",kind:"hp"},
 {id:"power",name:"猎鹰徽章",icon:"✦",desc:"领队攻击力+1",kind:"atk"},
 {id:"clock",name:"月牙发条",icon:"◴",desc:"领队倒计时-1",kind:"cd"},
 {id:"coin",name:"旧铜金币",icon:"◈",desc:"每场战斗额外获得15金币",kind:"gold"},
 {id:"shell",name:"旧木战盾",icon:"⬡",desc:"每场战斗开始获得5护盾",kind:"shield"}
];
const ZONES=[
 {name:"雪松林地",short:"林地",desc:"松林与微光，雪夜初临",color:"#7bc8ce",battle:["moth","wolf"],boss:"witch"},
 {name:"寒晶洞穴",short:"冰洞",desc:"冰晶深处传来的回声",color:"#9bbcff",battle:["wolf","sentry","shade"],boss:"prince"},
 {name:"长夜山脊",short:"山脊",desc:"月影之下的最后山门",color:"#d1b7dc",battle:["sentry","shade","beast"],boss:"queen"}
];
const EVENT_ROUTES=[
 [["battle","battle"],["recruit","treasure"],["shop","charm"],["boss","boss"]],
 [["battle","battle"],["camp","recruit"],["shop","forge"],["boss","boss"]],
 [["battle","battle"],["treasure","camp"],["charm","shop"],["boss","boss"]]
];
const dict=(a,id)=>a.find(v=>v.id===id);
const range=(n,min,max)=>Math.max(min,Math.min(max,n));
const clone=o=>JSON.parse(JSON.stringify(o));
const random=(seed)=>{let v=(Math.imul(seed^0x9e3779b9,1664525)+1013904223)>>>0;return v;};
function create(initial){
 let s={screen:"menu",meta:{totalRuns:0,wins:0,unlocks:0},run:null,settings:{sound:true,particles:true}};
 let uid=1;let logs=[];
 if(initial&&typeof initial==="object"){s.meta={...s.meta,...initial.meta};s.settings={...s.settings,...initial.settings};if(initial.run&&initial.run.heroId){s.run=clone(initial.run);s.screen=initial.screen||"town";}}
 const emit=(text,type="info")=>{logs.unshift({text,type,at:Date.now()});logs=logs.slice(0,28);return text};
 const current=()=>s.run;
 const activeView=()=>s.screen;
 const present=()=>clone({...s,logs});
 function go(screen){s.screen=screen;return present();}
 function town(){return go("town");}
 function startFresh(){
  s.run=null;logs=[];s.meta.totalRuns=(s.meta.totalRuns||0)+1;
  return go("leader");
 }
 function heroWithCharm(id,run=s.run){
  let h=dict(HEROES,id);if(!h)return null;h={...h};
  for(const charm of run?.charms||[]){const c=dict(CHARMS,charm);if(!c)continue;if(c.kind==="hp")h.hp+=5;if(c.kind==="atk")h.atk+=1;if(c.kind==="cd")h.cd=Math.max(1,h.cd-1);}
  return h;
 }
 function selectHero(id){
  if(!dict(HEROES,id))return {ok:false,message:"没有这个领队"};
  s.run={heroId:id,health:dict(HEROES,id).hp,maxHealth:dict(HEROES,id).hp,gold:45,zone:0,step:0,
   deck:["bolt","bolt","silver","snow","guard","herb","flare","bolt"],companions:[],charms:[],
   visited:[],battlesWon:0,kills:0,damageDealt:0,turns:0,offers:[],battle:null,event:null,result:null};
  emit("雪境探险队出发了","narrative");return {ok:true,state:go("map"),visualEvents:[{type:"depart",heroId:id}]};
 }
 function choices(){
  if(!s.run)return [];
  const row=EVENT_ROUTES[s.run.zone]?.[s.run.step]||[];
  return row.map((type,branch)=>({id:s.run.zone+"-"+s.run.step+"-"+branch,kind:type,branch,
   name:{battle:"雪境遭遇",boss:"守门首领",recruit:"冰封旅人",treasure:"遗失宝箱",shop:"行商小屋",charm:"护符匠铺",camp:"篝火营地",forge:"工匠小屋"}[type],
   desc:{battle:"进入战斗，获取金币",boss:"击败首领推进地区",recruit:"从三位旅人中带走一位",treasure:"从三件遗物中挑选",shop:"用金币购入补给",charm:"挑选永久强化饰品",camp:"恢复首领生命",forge:"强化手牌或移除卡牌"}[type]}));
 }
 function seededList(list,count,offset=0){
  if(!s.run)return list.slice(0,count);
  let seed=12+s.run.zone*399+s.run.step*79+offset*17+s.run.visited.length*43;
  const arr=list.slice();
  for(let i=arr.length-1;i>0;i--){seed=random(seed);const j=seed%(i+1);[arr[i],arr[j]]=[arr[j],arr[i]];}
  return arr.slice(0,count);
 }
 function selectNode(branch=0){
  if(!s.run)return {ok:false,message:"请先选择领队"};
  const c=choices()[branch];if(!c)return {ok:false,message:"该路线不可选择"};
  s.run.event={kind:c.kind,branch,zone:s.run.zone,step:s.run.step,done:false};
  emit("抵达「"+c.name+"」","travel");
  if(c.kind==="battle"||c.kind==="boss"){
   const result=startBattle(c.kind==="boss");
   return {...result,visualEvents:[{type:"mapTravel",kind:c.kind,branch},...(result.visualEvents||[])]};
  }
  if(c.kind==="recruit")s.run.offers=seededList(FRIENDS.filter(x=>!s.run.companions.includes(x.id)),3,1);
  if(c.kind==="treasure")s.run.offers=seededList(ITEMS.filter(x=>!s.run.deck.includes(x.id)),3,2);
  if(c.kind==="charm")s.run.offers=seededList(CHARMS.filter(x=>!s.run.charms.includes(x.id)),3,3);
  if(c.kind==="shop")s.run.offers=seededList(ITEMS,4,4).map((x,i)=>({...x,price:[35,48,52,62][i],sold:false}));
  if(c.kind==="forge")s.run.offers=seededList(ITEMS,3,5);
  return {ok:true,state:go(c.kind),visualEvents:[{type:"mapTravel",kind:c.kind,branch}]};
 }
 function finishNode(){
  const r=s.run;if(!r)return {ok:false,message:"暂无冒险"};
  r.visited.push({zone:r.zone,step:r.step,kind:r.event?.kind||"unknown",branch:r.event?.branch||0});
  const wasBoss=r.event?.kind==="boss";
  if(wasBoss){r.zone++;r.step=0;}
  else r.step++;
  r.event=null;r.offers=[];r.battle=null;
  if(r.zone>=ZONES.length)return resolveRun(true);
  return {ok:true,state:go("map")};
 }
 function awardAndFinish(kind,offer,index){
  const cue={type:"reward",kind,index,name:offer?.name||"",cardId:offer?.id||null};
  const finished=finishNode();
  return {...finished,visualEvents:[cue]};
 }
 function claim(index){
  const r=s.run;if(!r||!r.event)return {ok:false,message:"没有待领取奖励"};
  const kind=r.event.kind,offer=r.offers[index];
  if(kind==="camp"){if(index===0){r.health=range(r.health+9,0,r.maxHealth);emit("在篝火边恢复9点生命","heal");}else{r.gold+=25;emit("搜寻到25枚古金币","coin");}return awardAndFinish("camp",null,index);}
  if(kind==="forge"){if(index===0){r.deck.push("pierce");emit("工匠锻造了一张破晓钉","reward");}else if(index===1){const i=r.deck.indexOf("bolt");if(i>=0)r.deck.splice(i,1);r.deck.push("silver");emit("一张猎人快枪升级为银制子弹","reward");}else{r.gold+=20;emit("工坊支付了20枚材料金币","coin");}return awardAndFinish("forge",offer,index);}
  if(kind==="treasure"){if(!offer)return {ok:false,message:"请选择一张宝物牌"};r.deck.push(offer.id);emit("宝箱取得「"+offer.name+"」","reward");return awardAndFinish("treasure",offer,index);}
  if(kind==="recruit"){if(!offer)return {ok:false,message:"请选择一名同伴"};r.companions.push(offer.id);emit("「"+offer.name+"」加入了队伍","reward");return awardAndFinish("recruit",offer,index);}
  if(kind==="charm"){if(!offer)return {ok:false,message:"请选择一枚护符"};r.charms.push(offer.id);const h=heroWithCharm(r.heroId,r);if(offer.kind==="hp"){r.maxHealth=h.hp;r.health+=5;}emit("装备「"+offer.name+"」","reward");return awardAndFinish("charm",offer,index);}
  return {ok:false,message:"当前事件不支持该操作"};
 }
 function buy(index){
  const r=s.run;if(!r||r.event?.kind!=="shop")return {ok:false,message:"目前不在商店"};
  const item=r.offers[index];if(!item||item.sold)return {ok:false,message:"商品已售罄"};
  if(r.gold<item.price)return {ok:false,message:"古金币不足"};
  r.gold-=item.price;item.sold=true;r.deck.push(item.id);
  emit("购买了「"+item.name+"」 · "+item.price+"金币","shop");
  return {ok:true,state:present(),visualEvents:[{type:"shopPurchase",index,cardId:item.id,price:item.price,goldAfter:r.gold,name:item.name}]};
 }
 function leaveEvent(){
  if(!s.run||!s.run.event)return {ok:false,message:"暂无事件"};
  if(s.run.event.kind==="battle"||s.run.event.kind==="boss")return {ok:false,message:"请先结束战斗"};
  if(s.run.event.kind==="recruit")return {ok:false,message:"请先选择一名旅人"};
  const returned=finishNode();return {...returned,visualEvents:[{type:"mapReturn"}]};
 }
 function foeFrom(id,slot,level){
  const t=dict(ENEMIES,id)||ENEMIES[0];
  return {uid:"foe-"+uid++,template:id,name:t.name,icon:t.icon,art:t.art||null,
   slot,hp:t.hp+level*2,maxHp:t.hp+level*2,atk:t.atk+Math.floor(level/2),cd:t.cd,
   tick:t.cd,shield:0,weak:0,mark:0,stunned:0};
 }
 function allyFrom(template,slot,leader=false){
  const t=leader?heroWithCharm(template):dict(FRIENDS,template);
  if(!t)return null;
  const h=leader?s.run.health:t.hp;
  return {uid:"ally-"+uid++,template,name:t.name,art:t.art,slot,
   hp:h,maxHp:leader?s.run.maxHealth:t.hp,atk:t.atk,cd:t.cd,tick:t.cd,
   shield:leader&&(s.run.charms.includes("shield")||template==="warden")?5:0,
   weak:0,mark:0,stunned:0,leader};
 }
 function newCards(r){return r.deck.map((id,i)=>({key:"card-"+i+"-"+r.zone+"-"+r.step,id}));}
 function shuffle(arr,seed){
  const a=arr.slice();for(let i=a.length-1;i>0;i--){seed=random(seed+i);let j=seed%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;
 }
 function deal(b,count=5){
  const dealt=[];
  for(let n=0;n<count;n++){
   if(!b.draw.length&&b.discard.length){b.draw=shuffle(b.discard,151+b.turn*17+s.run.zone*3);b.discard=[];}
   if(!b.draw.length)break;
   if(b.hand.length>=7)break;
   const c=b.draw.pop();b.hand.push(c);dealt.push(c);
  }
  return dealt;
 }
 function startBattle(boss=false){
  const r=s.run,zone=r.zone;
  const enemyIds=boss?[ZONES[zone].boss,ZONES[zone].battle[0]]:ZONES[zone].battle;
  const foes=enemyIds.map((id,i)=>foeFrom(id,[0,3,1,4,2,5][i]??(i%6),zone));
  const allies=[allyFrom(r.heroId,0,true)];
  // A previously rescued companion joins the board at the start of battle.
  if(r.companions.length)allies.push(allyFrom(r.companions[0],3));
  r.battle={turn:1,playsLeft:1,redrawCharge:4,boss,foes,allies,
   draw:shuffle(newCards(r),21+r.zone*9+r.step*23),hand:[],discard:[],
   log:[],finished:false,victory:false,goldWon:0,reinforcement:9,wavesSpawned:0,selected:null,fallenCompanions:[]};
  deal(r.battle,5);
  emit(boss?"首领出现在雪路尽头！":"遇到了雪境巡游者","battle");
  return {ok:true,state:go("battle"),visualEvents:[{type:"battleIntro",foes:foes.map(x=>x.uid),allies:allies.map(x=>x.uid),hand:r.battle.hand.map(x=>x.key)}]};
 }
 function applyDamage(unit,damage){
  const shield=Math.min(unit.shield,Math.max(0,damage));unit.shield-=shield;
  const actual=Math.min(unit.hp,Math.max(0,damage-shield));unit.hp-=actual;
  return {actual,blocked:shield};
 }
 function alive(arr){return arr.filter(u=>u.hp>0);}
 // Slots are row-major: 0..2 upper lane, 3..5 lower lane.
 // Within both camps index 0/3 is the front rank nearest the centre.
 function ordered(units){
  return alive(units).sort((a,b)=>(a.slot%3)-(b.slot%3) || Math.floor(a.slot/3)-Math.floor(b.slot/3));
 }
 function frontTarget(units,attackerSlot){
  const row=Math.floor((attackerSlot??0)/3);
  const targets=ordered(units);
  return targets.find(u=>Math.floor(u.slot/3)===row) || targets[0] || null;
 }
 function hasDefeatedBoss(b){
  return b.boss&&!b.foes.some(u=>u.hp>0&&u.template===ZONES[s.run.zone].boss);
 }
 function takeTurn(){
  const r=s.run,b=r?.battle;if(!b||b.finished)return {ok:false,message:"没有正在进行的战斗"};
  b.turn++;r.turns++;b.playsLeft=1;b.redrawCharge=Math.min(4,b.redrawCharge+1);
  const log=[],visuals=[{type:"turnTick",turn:b.turn}];
  // First tick enemy countdowns, then ally countdowns, deterministic target selection.
  for(const unit of ordered(b.foes)){
   if(unit.stunned>0){unit.stunned--;log.push(unit.name+"被冰霜困住");visuals.push({type:"frozen",actorId:unit.uid,side:"enemy"});continue;}
   unit.tick--;
   if(unit.tick<=0){
    const target=frontTarget(b.allies,unit.slot);
    if(target){
     const amount=Math.max(1,unit.atk-unit.weak),previousHp=target.hp,previousShield=target.shield;
     const out=applyDamage(target,amount);
     visuals.push({type:"attack",actorId:unit.uid,targetId:target.uid,actorSide:"enemy",kind:"basic",damage:out.actual,blocked:out.blocked,hpBefore:previousHp,hpAfter:target.hp,shieldBefore:previousShield,shieldAfter:target.shield,lethal:target.hp<=0});
     log.push(unit.name+"攻击"+target.name+" · "+out.actual+"伤害");
     if(target.leader)r.health=Math.max(0,target.hp);
    }
    unit.tick=unit.cd;
   }
  }
  for(const fallen of b.allies.filter(x=>!x.leader&&x.hp<=0)){
   if(!b.fallenCompanions.includes(fallen.template))b.fallenCompanions.push(fallen.template);
  }
  b.allies=b.allies.filter(x=>x.leader||x.hp>0);
  if(r.health<=0)return resolveBattle(false,log,visuals);
  for(const unit of ordered(b.allies)){
   if(unit.stunned>0){unit.stunned--;continue;}
   unit.tick--;
   if(unit.tick<=0){
    const target=frontTarget(b.foes,unit.slot);
    if(target){
     const amount=unit.atk+Math.max(0,target.mark),previousHp=target.hp,previousShield=target.shield;
     const hit=applyDamage(target,amount);
     visuals.push({type:"attack",actorId:unit.uid,targetId:target.uid,actorSide:"friendly",kind:unit.template==="marksman"?"gun":"basic",damage:hit.actual,blocked:hit.blocked,hpBefore:previousHp,hpAfter:target.hp,shieldBefore:previousShield,shieldAfter:target.shield,lethal:target.hp<=0});
     r.damageDealt+=hit.actual;
     log.push(unit.name+"命中"+target.name+" · "+hit.actual+"伤害");
     if(unit.template==="marksman")target.mark+=1;
     if(unit.template==="frostwitch")target.stunned+=1;
     if(unit.template==="medic"){const l=b.allies.find(x=>x.leader);if(l){l.hp=Math.min(l.maxHp,l.hp+2);r.health=l.hp;}}
     if(unit.template==="engineer")target.mark+=2;
     if(unit.template==="scout"){const l=b.allies.find(x=>x.leader);if(l)l.shield+=1;}
    }
    unit.tick=unit.cd;
   }
  }
  b.foes=b.foes.filter(x=>{if(x.hp<=0){r.kills++;return false;}return true;});
  if(!b.foes.length||hasDefeatedBoss(b))return resolveBattle(true,log,visuals);
  if(b.turn>=b.reinforcement&&!b.boss&&b.wavesSpawned<1&&b.foes.length>=2){
   const occupied=new Set(b.foes.map(x=>x.slot));
   const spot=[1,2,4,5].find(x=>!occupied.has(x));
   if(spot!==undefined){const reinforcement=foeFrom(ZONES[r.zone].battle[(b.turn+1)%ZONES[r.zone].battle.length],spot,r.zone);b.foes.push(reinforcement);visuals.push({type:"reinforcement",actorId:reinforcement.uid,slot:spot});log.push("新的巡游者加入战斗");}
   b.wavesSpawned++;b.reinforcement=999;
  }
  b.log=[...log,...b.log].slice(0,20);
  emit("第"+b.turn+"回合 · "+(log[0]||"战局继续"),"turn");
  return {ok:true,events:log,visualEvents:visuals,state:present()};
 }
 function checkBattleAlive(log=[],visuals=[]){
  const r=s.run,b=r.battle;
  b.foes=b.foes.filter(x=>{if(x.hp<=0){r.kills++;return false;}return true;});
  if(!b.foes.length||hasDefeatedBoss(b))return resolveBattle(true,log,visuals);
  const hero=b.allies.find(x=>x.leader);
  if(!hero||hero.hp<=0)return resolveBattle(false,log,visuals);
  return null;
 }
 function play(index,targetUid=null){
  const r=s.run,b=r?.battle;if(!b||b.finished)return {ok:false,message:"没有正在进行的战斗"};
  if(!b.playsLeft)return {ok:false,message:"本回合只能出一张牌"};
  if(!Number.isInteger(index)||index<0||index>=b.hand.length)return {ok:false,message:"请先选择手牌"};
  const card=b.hand[index],def=dict(ITEMS,card.id);
  if(!def)return {ok:false,message:"缺少卡牌配置"};
  const enemy=alive(b.foes).find(x=>x.uid===targetUid)||frontTarget(b.foes,3);
  const needsEnemy=["hit","pierce","freeze","weaken"].includes(def.kind);
  if(needsEnemy&&!enemy)return {ok:false,message:"没有可攻击的目标"};
  b.hand.splice(index,1);b.discard.push(card);b.playsLeft=0;
  let message="",out={actual:0};const visuals=[];
  if(needsEnemy){
   const previousHp=enemy.hp,previousShield=enemy.shield;
   out=applyDamage(enemy,def.power+(def.kind==="pierce"?Math.max(0,enemy.shield):0));
   visuals.push({type:"itemHit",cardKey:card.key,cardId:card.id,targetId:enemy.uid,kind:def.kind,damage:out.actual,blocked:out.blocked,hpBefore:previousHp,hpAfter:enemy.hp,shieldBefore:previousShield,shieldAfter:enemy.shield,lethal:enemy.hp<=0});
   if(def.kind==="pierce")enemy.mark+=1;
   if(def.kind==="freeze")enemy.stunned+=2;
   if(def.kind==="weaken")enemy.weak+=1;
   r.damageDealt+=out.actual;
   message=def.name+" → "+enemy.name+" · "+out.actual+"伤害";
  }else if(def.kind==="all"){
   for(const unit of [frontTarget(b.foes,0),frontTarget(b.foes,3)].filter((u,i,a)=>u&&a.indexOf(u)===i)){
    const previousHp=unit.hp,previousShield=unit.shield;
    const hit=applyDamage(unit,def.power);r.damageDealt+=hit.actual;
    visuals.push({type:"itemHit",cardKey:card.key,cardId:card.id,targetId:unit.uid,kind:"all",damage:hit.actual,blocked:hit.blocked,hpBefore:previousHp,hpAfter:unit.hp,shieldBefore:previousShield,shieldAfter:unit.shield,lethal:unit.hp<=0});
   }
   message="连环铳横扫敌人前排";
  }else if(def.kind==="shield"){const hero=b.allies.find(x=>x.leader);hero.shield+=def.power;message="首领获得"+def.power+"护盾";}
  else if(def.kind==="heal"){const hero=b.allies.find(x=>x.leader);hero.hp=Math.min(hero.maxHp,hero.hp+def.power);r.health=hero.hp;message="首领恢复"+def.power+"生命";}
  else if(def.kind==="tea"){const hero=b.allies.find(x=>x.leader);hero.shield+=4;hero.hp=Math.min(hero.maxHp,hero.hp+2);r.health=hero.hp;message="暖心热茶 · 护盾+4 治疗+2";}
  else if(def.kind==="haste"){for(const unit of alive(b.allies))unit.tick=Math.max(1,unit.tick-1);message="全队行动倒计时-1";}
  if(!visuals.length)visuals.push({type:"itemSupport",cardKey:card.key,cardId:card.id,kind:def.kind,power:def.power||0});
  b.log.unshift(message);emit(message,"action");
  const result=checkBattleAlive([message],visuals);
  if(result)return result;
  return {ok:true,events:[message],visualEvents:visuals,state:present()};
 }
 function move(uid,slot){
  const b=s.run?.battle;if(!b||b.finished)return {ok:false,message:"不在战斗中"};
  const unit=alive(b.allies).find(x=>x.uid===uid);
  if(!unit)return {ok:false,message:"请选择我方角色"};
  if(!Number.isInteger(slot)||slot<0||slot>5)return {ok:false,message:"格子无效"};
  const previousSlot=unit.slot;
  const other=b.allies.find(x=>x.hp>0&&x.slot===slot);
  if(other&&other.uid===uid)return {ok:true,state:present()};
  if(other)other.slot=unit.slot;
  unit.slot=slot;
  emit("调整了"+unit.name+"的位置","move");
  return {ok:true,state:present(),visualEvents:[{type:"move",actorId:uid,fromSlot:previousSlot,toSlot:slot}]};
 }
 // Companions may be called from the reserve during the player action phase.
 // No beast restriction: the summoned identity is the actual recruited team member.
 function summon(template,slot){
  const b=s.run?.battle,r=s.run;
  if(!b||b.finished)return {ok:false,message:"不在战斗中"};
  if(!r.companions.includes(template))return {ok:false,message:"这名同伴不在远征队"};
  if(b.fallenCompanions?.includes(template))return {ok:false,message:"阵亡同伴本场不可再召唤"};
  if(b.allies.some(x=>x.hp>0&&x.template===template))return {ok:false,message:"这名同伴已经在场"};
  if(!b.playsLeft)return {ok:false,message:"本回合行动次数已用完"};
  if(!Number.isInteger(slot)||slot<0||slot>5)return {ok:false,message:"没有合法的召唤位置"};
  if(b.allies.some(x=>x.hp>0&&x.slot===slot))return {ok:false,message:"目标位置已有队友"};
  const unit=allyFrom(template,slot,false);
  if(!unit)return {ok:false,message:"缺少同伴角色资料"};
  b.allies.push(unit);b.playsLeft=0;
  emit("召唤「"+unit.name+"」加入战斗","summon");
  return {ok:true,state:present(),visualEvents:[{type:"summon",actorId:unit.uid,template,slot,side:"friendly"}]};
 }
 // Recall is explicitly not death. Recalled units can be played again next turn.
 function recall(uid){
  const b=s.run?.battle;
  if(!b||b.finished)return {ok:false,message:"不在战斗中"};
  const unit=b.allies.find(x=>x.uid===uid&&x.hp>0);
  if(!unit||unit.leader)return {ok:false,message:"领队不可召回"};
  b.allies=b.allies.filter(x=>x.uid!==uid);
  emit("「"+unit.name+"」返回队伍后备席","recall");
  return {ok:true,state:present(),visualEvents:[{type:"recall",actorId:uid,slot:unit.slot,template:unit.template}]};
 }
 function redraw(){
  const b=s.run?.battle;if(!b||b.finished)return {ok:false,message:"目前无法重抽"};
  b.discard.push(...b.hand);b.hand=[];
  const free=b.redrawCharge>=4;
  b.redrawCharge=0;deal(b,5);
  emit(free?"免费重抽了手牌":"重抽手牌并结束本回合","draw");
  if(!free){const result=takeTurn();return {...result,visualEvents:[{type:"redraw",free:false},...(result.visualEvents||[])]};}
  return {ok:true,state:present(),visualEvents:[{type:"redraw",free:true}]};
 }
 function endTurn(){
  const b=s.run?.battle;if(!b||b.finished)return {ok:false,message:"没有正在进行的战斗"};
  b.playsLeft=0;return takeTurn();
 }
 function resolveBattle(victory,log=[],visuals=[]){
  const r=s.run,b=r.battle;
  b.finished=true;b.victory=victory;
  if(!victory){emit("长夜吞没了远征队","defeat");const result=resolveRun(false,log.at(-1)||"领队倒下");return {...result,visualEvents:[...visuals,{type:"defeat",cause:log.at(-1)||"领队倒下"}]};}
  r.battlesWon++;
  const recovered=Math.max(3,Math.ceil((r.maxHealth-r.health)*.75));
  r.health=Math.min(r.maxHealth,r.health+recovered);
  const amount=(b.boss?65:30)+r.zone*12+(r.charms.includes("coin")?15:0);
  r.gold+=amount;b.goldWon=amount;
  emit("获胜！取得"+amount+"枚古金币","victory");
  return {ok:true,events:log,state:go("battle-clear"),visualEvents:[...visuals,{type:"victory",gold:amount}]};
 }
 function afterBattle(){if(s.screen!=="battle-clear")return {ok:false,message:"请完成本场战斗"};const r=finishNode();return {...r,visualEvents:[{type:"battleExit"}]};}
 function resolveRun(won,cause=""){
  const r=s.run;if(!r)return {ok:false,message:"没有冒险记录"};
  r.result={won,heroName:dict(HEROES,r.heroId)?.name||"",battlesWon:r.battlesWon,
   coins:r.gold,kills:r.kills,turns:r.turns,damage:r.damageDealt,
   charms:r.charms.length,companions:r.companions.length,cause};
  if(won){s.meta.wins=(s.meta.wins||0)+1;s.meta.unlocks=Math.max(s.meta.unlocks||0,1);}
  return {ok:true,state:go("result")};
 }
 function backTown(){s.run=null;return go("town");}
 function showDeck(){const prev=s.screen;s.deckBack=prev;return go("deck");}
 function closeDeck(){return go(s.deckBack||"map");}
 function settings(partial){s.settings={...s.settings,...partial};return present();}
 function setScreen(name){return go(name);}
 return Object.freeze({
  HEROES,FRIENDS,ENEMIES,ITEMS,CHARMS,ZONES,EVENT_ROUTES,
  state:present,view:activeView,go:setScreen,startFresh,town,selectHero,choices,
  selectNode,claim,buy,leaveEvent,finishNode,afterBattle,play,move,redraw,endTurn,
  startBattle,summon,recall,backTown,showDeck,closeDeck,settings,heroWithCharm,
  version:"2.2.0-route-reward-and-defeat-events"
 });
}
root.PaperchalkSnowbound=Object.freeze({create,HEROES,FRIENDS,ENEMIES,ITEMS,CHARMS,ZONES,EVENT_ROUTES});
})(window);