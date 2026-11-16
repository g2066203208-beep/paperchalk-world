/* Snowbound Journey visual shell and full run navigation.
 * Screen roles: menu -> village -> party -> region map -> battle -> event ->
 * next region -> results -> village. All source character art comes from
 * the existing Paperchalk GitHub character assets.
 */
(function(){
"use strict";
const rules=window.PaperchalkSnowbound,cardArt=window.PaperchalkDuelCardArt;
if(!rules)throw Error("Snowbound rules missing");
const STORE="paperchalk-snowbound-campaign-v1",app=document.getElementById("app"),toast=document.getElementById("toast");
const saved=(()=>{try{return JSON.parse(localStorage.getItem(STORE)||"null");}catch{return null}})();
const game=rules.create(saved);
let selectedCard=-1,selectedAlly=null,help=false,infoMessage="",lastScreen="",toastTimer=null,layoutMode="",soundCtx=null;
const find=(a,id)=>a.find(x=>x.id===id);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const save=()=>{try{const s=game.state();localStorage.setItem(STORE,JSON.stringify({screen:s.screen,run:s.run,meta:s.meta,settings:s.settings}));}catch(e){console.warn("local save failed",e)}};
function flash(text){
 if(!text)return;
 toast.textContent=text;toast.hidden=false;clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>{toast.hidden=true},2400);
}
function sound(kind){
 if(!game.state().settings.sound)return;
 try{
  const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
  if(!soundCtx)soundCtx=new A();
  if(soundCtx.state==="suspended")soundCtx.resume();
  const osc=soundCtx.createOscillator(),gain=soundCtx.createGain(),t=soundCtx.currentTime;
  osc.type=kind==="battle"?"triangle":"sine";
  osc.frequency.setValueAtTime(kind==="coin"?580:kind==="battle"?170:440,t);
  osc.frequency.exponentialRampToValueAtTime(kind==="battle"?95:280,t+.11);
  gain.gain.setValueAtTime(.035,t);gain.gain.exponentialRampToValueAtTime(.001,t+.12);
  osc.connect(gain).connect(soundCtx.destination);osc.start(t);osc.stop(t+.13);
 }catch(e){}
}
function apply(action){
 const result=action();
 if(result&&result.ok===false){flash(result.message);return false}
 save();sound("tap");render();return true;
}
function backdrop(village=false){
 const trees=[
 ["2%","14%","95px","214px",false],["14%","21%","73px","152px",true],
 ["75%","19%","90px","195px",true],["89%","13%","98px","233px",false],
 ["61%","25%","73px","140px",true]
 ];
 return '<div class="scene-backdrop" aria-hidden="true"><div class="mountain"></div><div class="mountain second"></div><div class="snow-hill mid"></div><div class="snow-hill"></div>'+
 '<div class="frost-trees">'+trees.map(([x,b,w,h,d])=>'<span class="frost-tree'+(d?' dark':'')+'" style="--tree-x:'+x+';--tree-bottom:'+b+';--tree-width:'+w+';--tree-height:'+h+'"></span>').join("")+'</div>'+
 (village?villageHouses():'')+'</div>';
}
function villageHouses(){
 const homes=[["6%","175px","195px"],["35%","220px","275px"],["76%","181px","208px"]];
 return '<div class="village"><div class="warm-glow"></div>'+
 homes.map(([x,w,h])=>'<div class="house" style="--hx:'+x+';--hw:'+w+';--hh:'+h+'"><div class="house-body"></div><div class="roof"></div><div class="window"></div><div class="door"></div></div>').join("")+'</div>';
}
function commonHead(title,opts={}){
 const s=game.state(),r=s.run,coins=r?'<div class="stat"><i>◈</i>'+r.gold+'</div>':'';
 const health=r?'<div class="stat"><i>♥</i>'+r.health+'/'+r.maxHealth+'</div>':'';
 return '<header class="header '+(opts.className||'')+'">'+
 '<button class="round-icon" data-act="'+(opts.back||"town")+'" type="button" aria-label="返回">‹</button>'+
 '<b>'+esc(title)+'</b><span class="small-title">'+esc(opts.subtitle||"SNOWBOUND JOURNEY")+'</span>'+
 '<span class="grow"></span>'+health+coins+
 (r?'<button class="round-icon" data-act="deck" type="button" title="查看牌组" aria-label="打开牌组">▤</button>':'')+
 '<button class="round-icon" data-act="help" type="button" title="玩法说明" aria-label="玩法说明">?</button>'+
 '</header>';
}
function wrap(type,body,classes=""){
 return '<section class="scene '+type+' '+classes+'" data-scene="'+type+'">'+backdrop(type==="town-scene"||type==="menu-scene")+'<div class="texture"></div>'+body+'</section>';
}
function paperCard(data,options={}){
 const type=options.kind||"item",isUnit=type==="leader"||type==="companion",small=!!options.compact;
 const artSrc=data.art||null;
 const artHtml=artSrc?'<img loading="eager" src="'+esc(artSrc)+'" alt="'+esc(data.name)+'原始角色立绘">':
  isUnit?'<span class="rune">✦</span>':itemIllustration(data.id);
 const hp=isUnit&&data.hp!==undefined?'<span class="sticker" aria-label="生命">'+data.hp+'</span>':'';
 const atk=isUnit&&data.atk!==undefined?'<span class="sticker attack" aria-label="攻击">'+data.atk+'</span>':'';
 const counter=isUnit&&data.cd!==undefined?'<span class="sticker counter" aria-label="倒计时">'+data.cd+'</span>':'';
 const desc=data.desc||data.traitText||data.detail||"";
 return '<div class="paint-card '+(small?'compact ':'')+(options.selected?'selected ':'')+(options.selectable?'is-selectable ':'')+'" data-kind="'+esc(type)+'">'+
 '<div class="art-box">'+artHtml+'</div>'+
 hp+atk+counter+'<div class="type-flag">'+esc(isUnit?data.trait||"同伴":data.tag||"道具")+'</div>'+
 '<span class="title">'+esc(data.name)+'</span><span class="text">'+esc(desc)+'</span></div>';
}
function itemIllustration(id){
 const ids={bolt:"quick",silver:"silver",snow:"focus",guard:"guard",herb:"mark",burst:"burst",frost:"critical",flare:"burst",tea:"reload",pierce:"critical"};
 if(cardArt){const source={id:ids[id]||"quick"};return cardArt.render(source);}
 return '<span class="rune">'+esc(find(rules.ITEMS,id)?.icon||"✧")+'</span>';
}
function enemyIllustration(id){
 const t=find(rules.ENEMIES,id),colors={moth:["#a8d9df","#477b91"],wolf:["#aea7b5","#50506f"],shade:["#9988ad","#453959"],
 sentry:["#a5c7c9","#526d79"],witch:["#b4cce3","#4a5c88"],beast:["#b7a4a1","#63526d"],prince:["#cfa4b2","#584066"],queen:["#cfafd3","#6f4a77"]};
 const c=colors[id]||["#b0dfdf","#567a8b"];
 // Original tiny bestiary illustrations authored as SVG, never copied sprites.
 const faces={
 moth:'<path d="M65 55Q18 8 13 46Q15 75 64 66Q107 8 123 46Q125 78 65 66Z" fill="#e4f1e6" stroke="#466b80" stroke-width="4"/><circle cx="65" cy="62" r="22" fill="#5d93a2"/><circle cx="56" cy="58" r="5" fill="#f9f2cb"/><circle cx="75" cy="58" r="5" fill="#f9f2cb"/>',
 wolf:'<path d="M31 65L19 18 48 40 79 37 110 18 102 68 82 104 50 102Z" fill="#b9c6c4" stroke="#536476" stroke-width="4"/><path d="M49 76l12-5 15 3-12 15z" fill="#424a53"/><path d="M37 61h17m28 0h16" stroke="#b34f65" stroke-width="5"/>',
 shade:'<path d="M32 103Q13 74 30 37Q48 3 73 28Q104 4 113 48Q125 83 104 103Z" fill="#68546f" stroke="#3a344d" stroke-width="4"/><path d="M37 62q13-10 27 0 16-11 30 0" stroke="#d7e6db" stroke-width="5" fill="none"/><path d="M59 92l12 9 14-9" stroke="#d1a9be" stroke-width="3"/>',
 sentry:'<path d="M23 53l15-29h58l17 29-12 51H35z" fill="#879aa3" stroke="#435f70" stroke-width="5"/><path d="M42 54h51v35H42z" fill="#3c5567"/><path d="M50 66h12m14 0h12" stroke="#d6ebef" stroke-width="6"/><path d="M66 14l9 13-9 10-9-10z" fill="#ebf7ec"/>',
 witch:'<path d="M23 63L67 7 113 63 93 66 105 107H31L43 66Z" fill="#7589b5" stroke="#43516d" stroke-width="4"/><circle cx="67" cy="66" r="22" fill="#d7e0df"/><path d="M52 67h8m19 0h7" stroke="#455c8c" stroke-width="4"/><path d="M63 80q6 5 12 0" stroke="#7d3d6c" stroke-width="2"/>',
 beast:'<path d="M26 36l-11-25 41 18q14-10 29 0l37-18-10 30 13 22-19 42H26L12 63Z" fill="#a391a2" stroke="#4e455a" stroke-width="5"/><path d="M36 65l17-7m32 0l15 7" stroke="#eecebe" stroke-width="6"/><path d="M59 85l9 13 11-13" stroke="#473c4b" stroke-width="4"/>',
 prince:'<path d="M22 44l11-21 19 13 14-26 15 26 21-13 12 21-10 62H31Z" fill="#81667d" stroke="#453857" stroke-width="5"/><path d="M44 65h18m12 0h18" stroke="#f7d1c3" stroke-width="6"/><path d="M52 87q15 9 29-1" stroke="#e8b3c7" stroke-width="3"/>'
 };
 return '<svg class="creature-svg" viewBox="0 0 132 119" role="img" aria-label="'+esc(t?.name||"敌人")+'"><defs><linearGradient id="g-'+esc(id)+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+c[0]+'"/><stop offset="1" stop-color="'+c[1]+'"/></linearGradient></defs>'+
 '<rect width="132" height="119" fill="url(#g-'+esc(id)+')"/><path d="M0 100L21 72 43 93 63 61 86 91 107 62 132 96V119H0Z" fill="#283752" opacity=".27"/>'+
 (faces[id]||faces.witch)+'</svg>';
}
function headerTitle(text,desc,tag="CHAPTER"){
 return '<div class="scene-title"><small>'+esc(tag)+'</small><h1>'+esc(text)+'</h1><p>'+esc(desc)+'</p></div>';
}
function menu(){
 const s=game.state();
 return wrap("menu-scene",'<div class="menu-mascot"></div><div class="menu-layout">'+
 '<div class="hero-intro"><span class="brand-crest">✧ ☾ ✧</span><h1>雪境行旅</h1>'+
 '<p>SNOWBOUND JOURNEY · 七人团的冬夜远征</p></div>'+
 '<div class="menu-stack">'+
 '<button class="pill-button" data-act="town" type="button">进入营地</button>'+
 '<button class="wood-button" data-act="new" type="button">开始新冒险</button>'+
 (s.run?'<button class="outline-button" data-act="resume" type="button">继续当前旅程</button>':'')+
 '<button class="outline-button" data-act="settings" type="button">设置与说明</button>'+
 '</div><div class="menu-footer">原创可游玩版本 · Anima 人物美术 · 手机版 / 电脑版</div></div>');
}
function town(){
 const s=game.state();
 return wrap("town-scene",commonHead("雪境营地",{subtitle:"THE WINTER CAMP",back:"menu"})+
 '<div class="town-wrap"><div class="town-name"><h1>欢迎回到营地</h1><p>火光未熄，下一场远征已经准备就绪。</p></div>'+
 '<div class="central-fire"></div>'+
 '<div class="hub-menu">'+
 [['团员名册','招募与查看角色','♧',"roster"],["药剂工坊","战斗道具与研究","✧","workshop"],["远征档案","通关纪录与里程碑","▤","archive"],["旅者图鉴","风雪中的来客","✦","bestiary"]]
 .map(([a,b,c,id])=>'<button class="building" type="button" data-act="townbuilding" data-id="'+id+'"><span class="icon">'+c+'</span><b>'+a+'</b><small>'+b+'</small></button>').join("")+
 '</div><button class="pill-button town-cta" data-act="'+(s.run?"resume":"new")+'" type="button">'+(s.run?"继续远征":"出发 · 选择领队")+' ❯</button>'+
 '<p class="town-note">已进行 '+s.meta.totalRuns+' 次远征 · 完成 '+s.meta.wins+' 次长夜挑战</p>'+
 '</div>');
}
function leader(){
 return wrap("event-scene",commonHead("选择远征领队",{back:"town"})+
 '<div class="selection-shell">'+headerTitle("挑选你的领队","三位领队各有不同的生命、攻击与倒计时。选定后正式进入路线地图。","LEADER SELECTION")+
 '<div class="choice-row">'+rules.HEROES.map(p=>'<button data-act="leader" data-id="'+p.id+'" type="button">'+paperCard(p,{kind:"leader",selectable:true})+'</button>').join("")+'</div>'+
 '<div class="choice-footer"><span class="choice-currency">每回合可使用一张战术道具牌</span></div>'+
 '</div>');
}
const glyphs={battle:"✦",boss:"♛",recruit:"♧",treasure:"◈",shop:"⌂",charm:"✧",camp:"☼",forge:"⚒"};
function mapScene(){
 const s=game.state(),r=s.run,z=rules.ZONES[r.zone],all=rules.EVENT_ROUTES[r.zone];
 const names={battle:"遭遇",boss:"首领",recruit:"旅人",treasure:"宝箱",shop:"商店",charm:"护符",camp:"篝火",forge:"工坊"};
 // A deliberately lightweight original winding parchment route.
 const paths='<svg class="map-graphics" viewBox="0 0 1000 470" preserveAspectRatio="none" aria-hidden="true">'+
 '<path d="M110 226 C190 160 240 125 370 118S555 178 645 208S810 171 915 145"/>'+
 '<path d="M110 226 C192 263 254 345 370 349S565 269 645 279S805 302 915 235"/>'+
 '<path d="M370 118Q490 217 645 279M370 349Q490 225 645 208"/></svg>';
 const nodes=all.flatMap((events,i)=>events.map((kind,b)=>{
  const x=[12,36,65,89][i],y=(kind==="boss"||i===0)?53:b===0?34:70,done=i<r.step,now=i===r.step;
  return '<button type="button" class="map-node '+(done?"is-complete":now?"is-current":"is-future")+'"'+(!now?' disabled':'')+
   ' style="--nx:'+x+'%;--ny:'+y+'%" data-act="node" data-i="'+b+'" aria-label="'+esc(names[kind]||kind)+'">'+
   '<span class="glyph">'+(glyphs[kind]||"◇")+'</span><strong>'+esc(names[kind]||kind)+'</strong></button>';
 })).join("");
 const mobile=all.map((events,i)=>'<div class="map-mobile-row '+(i===r.step?"is-current":"")+'">'+
  '<span class="mobile-row-title">第 '+(i+1)+' 站</span>'+
 events.map((kind,b)=>'<button type="button" data-act="node" data-i="'+b+'" '+(i!==r.step?"disabled":"")+'>'+
  '<span class="mini-glyph">'+(glyphs[kind]||"◇")+'</span>'+esc(names[kind]||kind)+'</button>').join("")+'</div>').join("");
 return wrap("map-scene",commonHead("远征地图 · "+z.name,{back:"town",subtitle:"ROUTE / "+(r.zone+1)+"/3"})+
 '<div class="map-surface"><div class="map-head"><b>'+esc(z.name)+'</b><small>'+esc(z.desc)+' · 第 '+(r.step+1)+'/4 站</small></div>'+
 paths+
 '<span class="map-doodle" style="--dx:11%;--dy:19%;--rot:-12deg">✧</span>'+
 '<span class="map-doodle" style="--dx:76%;--dy:68%;--rot:12deg">◇</span>'+
 '<span class="map-doodle" style="--dx:45%;--dy:74%;--rot:4deg">❄</span>'+
 nodes+'<div class="map-mobile-list">'+mobile+'</div>'+
 '<div class="map-bottom"><span>选择一条路线推进</span><div class="map-legend"><span>◈ 事件</span><span>✦ 战斗</span><span>♛ 地区首领</span></div></div>'+
 '</div>');
}
function eventView(kind){
 const s=game.state(),r=s.run;
 const themes={shop:["行商小屋","月下商贩将珍藏的物品摆放在柜台上。","CURIOS & TRADING"],recruit:["冰封旅人","雪晶中有三位被困的旅人，只能营救其中一位。","RESCUE ONE COMPANION"],
 treasure:["遗失宝箱","从遗落的战利品中挑选一件加入牌组。","FORGOTTEN TREASURE"],charm:["护符匠铺","选择一枚永久强化领队的饰品。","WINTER CHARMS"],camp:["篝火营地","营火温暖了夜色。恢复生命，或寻找补给。","REST & RECOVER"],forge:["工匠小屋","打磨武器、升级战术或换取材料。","SMITHING WORKSHOP"]};
 const [name,desc,en]=themes[kind]||["路上遭遇","前方出现新的事件","ENCOUNTER"];
 let offers=[];
 if(["shop","treasure"].includes(kind)){
  offers=r.offers.map((p,i)=>{
   const sold=kind==="shop"&&p.sold;
   return '<div><button '+(sold?'disabled':'')+' data-act="'+(kind==="shop"?"buy":"claim")+'" data-i="'+i+'" type="button">'+paperCard(p,{selectable:true})+'</button>'+
    (kind==="shop"?'<div class="price-pill '+(sold?'sold':'')+'">'+(sold?"已售罄":p.price+" ◈")+'</div>':'')+'</div>';
  });
 }else if(kind==="recruit"){
  offers=r.offers.map((p,i)=>'<button data-act="claim" data-i="'+i+'" type="button">'+paperCard(p,{kind:"companion",selectable:true})+'</button>');
 }else if(kind==="charm"){
  offers=r.offers.map((p,i)=>'<button data-act="claim" data-i="'+i+'" type="button">'+paperCard({...p,tag:"永久强化"},{kind:"item",selectable:true})+'</button>');
 }else if(kind==="camp"){
  offers=[
   ['✿','烤火休憩','恢复领队9点生命'],['◈','搜索物资','获得25枚古金币']
  ].map(([icon,title,text],i)=>'<button data-act="claim" data-i="'+i+'" type="button">'+
   paperCard({id:i?"reload":"herb",name:title,desc:text,tag:"营地",icon},{selectable:true})+'</button>');
 }else if(kind==="forge"){
  offers=[
   ["锻造新武器","加入一张破晓钉","pierce"],["精炼银弹","升级一张猎人快枪","silver"],["回收余料","获得20枚古金币","reload"]
  ].map(([title,desc,id],i)=>'<button data-act="claim" data-i="'+i+'" type="button">'+paperCard({id,name:title,desc,tag:"工坊"},{selectable:true})+'</button>');
 }
 return wrap("event-scene",commonHead(name,{back:"leave",subtitle:en})+
 '<div class="selection-shell">'+headerTitle(name,desc,en)+
 (kind==="shop"?'<div class="speech-bubble">欢迎来到远征商店。看上哪张牌，点击购买就好！</div>':'')+
 '<div class="choice-row">'+offers.join("")+'</div>'+
 '<div class="event-rail"><span class="choice-currency">当前古金币 ◈ '+r.gold+'</span>'+
 (kind==="shop"||kind==="treasure"||kind==="charm"||kind==="forge"?
 '<button class="wood-button" data-act="leave" type="button">离开并继续旅程 ❯</button>':'')+
 '</div></div>',kind==="shop"?"shop-scene":"");
}
function battleUnit(unit,side){
 const creature=find(rules.ENEMIES,unit.template);
 const portrait=unit.art?'<img loading="eager" src="'+esc(unit.art)+'" alt="'+esc(unit.name)+'角色插画">':enemyIllustration(unit.template);
 return '<button class="battle-unit '+(side==="enemy"?"enemy":"friendly")+(unit.uid===selectedAlly?' is-selected':'')+'" data-act="'+(side==="enemy"?"enemy":"ally")+'" data-id="'+esc(unit.uid)+'" type="button" aria-label="'+esc(unit.name)+' 生命'+unit.hp+' 攻击'+unit.atk+' 倒计时'+unit.tick+'">'+
  '<span class="unit-art">'+portrait+'</span><span class="unit-name">'+esc(unit.name)+'</span>'+
  '<span class="unit-badges"><span class="badge hp">'+unit.hp+'</span><span class="badge atk">'+unit.atk+'</span><span class="badge tick">'+unit.tick+'</span>'+
  (unit.shield?'<span class="badge shield">'+unit.shield+'</span>':'')+
  (unit.stunned?'<span class="badge stun">'+unit.stunned+'</span>':'')+'</span></button>';
}
function combatSlots(units,side){
 let res="";
 for(let slot=0;slot<6;slot++){
  const u=units.find(x=>x.slot===slot&&x.hp>0);
  const target=side==="enemy"&&selectedCard>=0;
  const movable=side==="friendly"&&selectedAlly&&!u;
  res+='<div class="battle-slot '+(target?'is-active-target ':'')+(movable?'is-move-target':'')+'" data-side="'+side+'" data-slot="'+slot+'">'+
   (u?battleUnit(u,side):movable?'<button class="side-btn" type="button" data-act="slot" data-i="'+slot+'">移至此处</button>':'')+'</div>';
 }
 return '<div class="battle-grid">'+res+'</div>';
}
function battle(){
 const s=game.state(),r=s.run,b=r.battle,z=rules.ZONES[r.zone];
 const latest=b.log[0]||"留意敌人倒计时，每回合只能使用一张道具牌";
 const cardButtons=b.hand.map((card,index)=>{
  const item=find(rules.ITEMS,card.id);if(!item)return '';
  return '<button data-act="hand" data-i="'+index+'" type="button" '+(!b.playsLeft?'disabled':'')+
   ' aria-label="使用 '+esc(item.name)+'">'+paperCard(item,{kind:"item",compact:true,selectable:true,selected:selectedCard===index})+'</button>';
 }).join("");
 const selected=selectedCard>=0?find(rules.ITEMS,b.hand[selectedCard]?.id):null;
 return wrap("battle-scene "+(r.zone===1?"ice-zone":r.zone===2?"summit-zone":""),commonHead(z.name+" · "+(b.boss?"首领战":"遭遇战"),{back:"map",className:"battle-header",subtitle:"ROUND "+b.turn})+
 '<div class="battle-core"><div class="battle-field">'+
 '<div class="battle-log" aria-live="polite">'+esc(latest)+'</div>'+
 '<div class="battle-side left"><div class="side-dial"><b>'+b.foes.length+'</b><small>敌人剩余</small></div>'+
 '<button class="side-btn" data-act="deck" type="button">牌组 ▤</button>'+
 '<div class="wave-note">每回合自动结算倒计时</div></div>'+
 '<div class="double-board">'+combatSlots(b.foes,"enemy")+'<div class="board-separator"></div>'+combatSlots(b.allies,"friendly")+'</div>'+
 '<div class="battle-side right"><div class="side-dial"><b>'+b.turn+'</b><small>当前回合</small></div>'+
 '<button class="side-btn" data-act="redraw" type="button">重抽钟<br>'+b.redrawCharge+'/4</button>'+
 '<div class="wave-note">'+(b.playsLeft?"可出牌":"已出牌")+'</div></div></div>'+
 '<div class="battle-bottom"><div class="hand-indicator">手牌 '+b.hand.length+' · '+(b.playsLeft?'可出一张':'本回合已出牌')+'</div>'+
 '<div class="deck-count"><button type="button" data-act="redraw" title="点击重抽手牌">↻ '+b.draw.length+'</button><span>剩余牌堆</span></div>'+
 '<div class="hand">'+cardButtons+'</div>'+
 '<button type="button" class="wood-button endturn" data-act="endturn">结束回合 ❯</button>'+
 '<span class="battle-hint">选择道具牌 → 点击敌人 · 点击我方角色调整站位</span></div>'+
 (selected?'<div class="fight-choice"><span>'+esc(selected.name)+'：'+esc(selected.desc)+'</span>'+
 '<button type="button" data-act="playselected">打出</button><button type="button" data-act="cancel">取消</button></div>':'')+
 '</div>');
}
function battleClear(){
 const r=game.state().run,b=r.battle;
 return wrap("results-scene",commonHead("战斗胜利",{back:"continuebattle"})+
 '<div class="selection-shell"><div class="panel results-panel"><div class="dialog-crest" style="font-size:48px;color:#b58764">✦</div>'+
 '<h1>夜路平安</h1><p>敌人消散在风雪里，远征队又前进了一步。</p>'+
 '<div class="results-stats"><div><strong>◈ '+b.goldWon+'</strong><small>获得金币</small></div>'+
 '<div><strong>'+r.health+'</strong><small>领队剩余生命</small></div>'+
 '<div><strong>'+r.battlesWon+'</strong><small>胜利场次</small></div></div>'+
 '<button class="pill-button" data-act="continuebattle" type="button">继续前进 ❯</button></div></div>');
}
function results(){
 const r=game.state().run,rr=r.result;
 return wrap("results-scene",commonHead("远征结算",{back:"town"})+
 '<div class="selection-shell"><div class="panel results-panel"><div class="dialog-crest" style="font-size:49px;color:#cf9f6e">☾ ✦</div>'+
 '<h1>'+(rr.won?'冬夜终结':'风雪暂歇')+'</h1>'+
 '<p>'+(rr.won?'三片雪境已经走过，远征队带着黎明返回营地。':'远征队在长夜中失利。带着经验重新出发吧。')+'</p>'+
 '<div class="results-stats">'+[
  ['胜利',rr.battlesWon],['击败',rr.kills],['造成伤害',rr.damage],['回合',rr.turns],['金币',rr.coins],['获得同伴',rr.companions]
 ].map(([name,value])=>'<div><strong>'+value+'</strong><small>'+name+'</small></div>').join("")+'</div>'+
 '<div class="choice-footer"><button class="pill-button" data-act="backtown" type="button">返回营地 ❯</button>'+
 '<button class="wood-button" data-act="new" type="button">重新远征</button></div></div></div>');
}
function deck(){
 const s=game.state(),r=s.run;
 const cards=r.deck.map((id,i)=>{
  const item=find(rules.ITEMS,id);
  return '<div>'+paperCard(item,{compact:true})+'</div>';
 }).join("");
 const allies=r.companions.map(id=>{
  const unit=find(rules.FRIENDS,id);return '<div>'+paperCard(unit,{kind:"companion",compact:true})+'</div>';
 }).join("");
 return '<div class="deck-modal" data-modal="deck"><div class="panel">'+
 '<div class="panel-header"><h2>远征牌组 · '+r.deck.length+' 张</h2><button class="wood-button" data-act="closedeck">返回 ❯</button></div>'+
 '<div class="deck-contents">'+cards+allies+'</div><p style="font-size:12px;margin-top:15px">饰品：'+(r.charms.map(id=>find(rules.CHARMS,id)?.name).join(" · ")||"尚未获得")+'</p>'+
 '</div></div>';
}
function townBuilding(){
 const s=game.state(),key=layoutMode||"roster";
 const names={roster:"团员名册",workshop:"药剂工坊",archive:"远征档案",bestiary:"旅者图鉴"};
 const subtitles={roster:"集结已保存的 Anima 组织人物",workshop:"战术道具将随着冒险获得",archive:"累计冒险与通关记录",bestiary:"雪境中出现过的敌人"};
 let body="";
 if(key==="roster")body='<div class="choice-row">'+rules.HEROES.map(x=>paperCard(x,{kind:"leader"})).join("")+'</div>';
 else if(key==="workshop")body='<div class="choice-row">'+rules.ITEMS.slice(0,4).map(x=>paperCard(x)).join("")+'</div>';
 else if(key==="bestiary")body='<div class="choice-row">'+rules.ENEMIES.slice(0,4).map(x=>'<div class="paint-card compact"><div class="art-box">'+enemyIllustration(x.id)+'</div><b class="title">'+esc(x.name)+'</b><span class="text">'+esc(x.desc)+'</span></div>').join("")+'</div>';
 else body='<div class="panel" style="padding:20px;min-width:min(490px,92vw);text-align:center"><h2>旅程记录</h2><p>总远征 '+s.meta.totalRuns+' 次 · 通关 '+s.meta.wins+' 次</p></div>';
 return wrap("event-scene",commonHead(names[key]||"营地",{back:"town"})+
 '<div class="selection-shell">'+headerTitle(names[key]||"营地",subtitles[key]||"","THE WINTER CAMP")+body+
 '<button class="pill-button" data-act="town" type="button">返回营地 ❯</button></div>');
}
function settings(){
 const s=game.state().settings;
 return wrap("event-scene",commonHead("设置与玩法",{back:"menu"})+'<div class="selection-shell">'+headerTitle("设置与玩法","这是一款独立美术与角色的雪境卡牌冒险原型。","SETTINGS & HANDBOOK")+
 '<div class="panel" style="width:min(650px,94vw);padding:20px;overflow:auto;max-height:60vh">'+
 '<div class="panel-header"><h2>系统选项</h2></div><div class="choice-footer">'+
 '<button data-act="togglesound" class="outline-button" type="button">音效：'+(s.sound?'开启':'关闭')+'</button>'+
 '<button data-act="toggleparticles" class="outline-button" type="button">飘雪：'+(s.particles?'开启':'关闭')+'</button></div>'+
 '<div style="font:12px/2.1 sans-serif;margin-top:15px"><p>① 村庄选领队 → 地图选路线 → 战斗 / 商店 / 事件 → 地区首领 → 结算。</p>'+
 '<p>② 每回合只出一张战术道具牌。倒计时归零的敌我单位自动攻击。</p>'+
 '<p>③ 点击我方卡再点击空格可调整站位；先看敌方倒计时，保护领队。</p>'+
 '<p>④ 重抽钟四格充满时免费刷新手牌，提前重抽会结束回合。</p>'+
 '<p>⑤ 商店、护符、招募和战利品会真实修改本次远征的状态。</p></div></div></div>');
}
function helpPanel(){
 return '<div class="deck-modal"><div class="panel" style="width:min(640px,95vw);padding:20px;max-height:87vh;overflow:auto">'+
 '<div class="panel-header"><h2>雪境远征手册</h2><button class="wood-button" data-act="helpclose">返回</button></div>'+
 '<p>本游戏使用 2×3 双排阵地。玩家每回合可以打出一张手牌，队友和敌人的倒计时会推进并自动攻击。</p>'+
 '<p>敌人优先攻击我方前排。点击我方成员，再点击目标空位，就能在两排之间调整站位。</p>'+
 '<p>攻击道具：先点击手牌，再点击敌方卡牌；治疗与防御道具可以直接使用。</p>'+
 '<p>地图中沿着分叉路线推进，可经过同伴救援、商店、饰品、宝箱、营地、锻造和首领战。</p>'+
 '<p>所有旅途状态自动保存到当前浏览器。要重头开始，在营地选择新远征。</p>'+
 '</div></div>';
}
function render(){
 const view=game.view();
 if(view!==lastScreen){
  selectedCard=-1;selectedAlly=null;
  lastScreen=view;
 }
 const route={menu,town,leader,map:mapScene,battle,"battle-clear":battleClear,result,shop:()=>eventView("shop"),
 recruit:()=>eventView("recruit"),treasure:()=>eventView("treasure"),charm:()=>eventView("charm"),
 camp:()=>eventView("camp"),forge:()=>eventView("forge"),deck,townbuilding:townBuilding,settings};
 app.innerHTML=(route[view]||menu)()+(help?helpPanel():"");
 document.querySelector(".ambient-snow").style.display=game.state().settings.particles?"":"none";
 document.title=(view==="battle"?"战斗 · ":view==="map"?"地图 · ":"")+"雪境行旅";
}
function isTargetingCard(){
 const b=game.state().run?.battle;
 if(!b||selectedCard<0)return false;
 return ["hit","pierce","freeze","weaken"].includes(find(rules.ITEMS,b.hand[selectedCard]?.id)?.kind);
}
function onClick(event){
 const el=event.target.closest("[data-act]");if(!el)return;
 const act=el.dataset.act,id=el.dataset.id,index=Number(el.dataset.i||"0");
 if(act==="help"){help=true;render();return;}
 if(act==="helpclose"){help=false;render();return;}
 if(help)return;
 switch(act){
 case "menu":apply(()=>game.go("menu"));break;
 case "town":apply(()=>game.town());break;
 case "new":apply(()=>game.startFresh());break;
 case "resume":apply(()=>game.go(game.state().run?.battle&&!game.state().run.battle.finished?"battle":"map"));break;
 case "leader":apply(()=>game.selectHero(id));break;
 case "map":apply(()=>game.go("map"));break;
 case "node":apply(()=>game.selectNode(index));break;
 case "claim":apply(()=>game.claim(index));break;
 case "buy":apply(()=>game.buy(index));break;
 case "leave":apply(()=>game.leaveEvent());break;
 case "continuebattle":apply(()=>game.afterBattle());break;
 case "endturn":selectedCard=-1;selectedAlly=null;apply(()=>game.endTurn());break;
 case "redraw":selectedCard=-1;apply(()=>game.redraw());break;
 case "hand":{
  const s=game.state(),b=s.run?.battle;if(!b?.playsLeft)return flash("本回合已使用战术牌");
  if(selectedCard===index&&!isTargetingCard()){
   selectedCard=-1;apply(()=>game.play(index));
  }else if(selectedCard===index&&isTargetingCard()){
   // Clicking selected targeted card again plays it on the nearest foe.
   selectedCard=-1;apply(()=>game.play(index));
  }else{selectedCard=index;selectedAlly=null;render();flash("已选中战术牌，可以点击敌人选择目标");}
  break;
 }
 case "enemy":{
  if(selectedCard>=0){
   const i=selectedCard;selectedCard=-1;apply(()=>game.play(i,id));
  }else{
   const enemy=game.state().run?.battle?.foes.find(x=>x.uid===id);
   if(enemy)flash(enemy.name+" · 攻击"+enemy.atk+" / 倒计时"+enemy.tick);
  }
  break;
 }
 case "ally":selectedAlly=selectedAlly===id?null:id;selectedCard=-1;render();break;
 case "slot":apply(()=>game.move(selectedAlly,index));selectedAlly=null;break;
 case "playselected":if(selectedCard>=0){const i=selectedCard;selectedCard=-1;apply(()=>game.play(i));}break;
 case "cancel":selectedCard=-1;render();break;
 case "deck":apply(()=>game.showDeck());break;
 case "closedeck":apply(()=>game.closeDeck());break;
 case "backtown":apply(()=>game.backTown());break;
 case "townbuilding":layoutMode=id;apply(()=>game.go("townbuilding"));break;
 case "settings":apply(()=>game.go("settings"));break;
 case "togglesound":apply(()=>game.settings({sound:!game.state().settings.sound}));break;
 case "toggleparticles":apply(()=>game.settings({particles:!game.state().settings.particles}));break;
 default:break;
 }
}
app.addEventListener("click",onClick);
window.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&help){help=false;render();return;}
 if(e.key==="Escape"&&selectedCard>=0){selectedCard=-1;render();return;}
 if(game.view()==="battle"){
  if(e.key.toLowerCase()==="e"){selectedCard=-1;apply(()=>game.endTurn());}
  if(e.key.toLowerCase()==="r"){selectedCard=-1;apply(()=>game.redraw());}
  if(/^[1-7]$/.test(e.key)){const i=Number(e.key)-1,b=game.state().run?.battle;if(i<b.hand.length){selectedCard=i;render();}}
 }
});
window.addEventListener("beforeunload",save);
window.PaperchalkSnowboundUI=Object.freeze({
 get state(){return game.state();},
 get view(){return game.view();},
 engine:game,render,
 selectNode:branch=>apply(()=>game.selectNode(branch)),
 action:(index,target)=>apply(()=>game.play(index,target)),
 go:view=>apply(()=>game.go(view)),
 version:"1.0.0"
});
render();
})();