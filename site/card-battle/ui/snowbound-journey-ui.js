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
const motion=window.PaperchalkMotion?.create({app,getSoundEnabled:()=>game.state().settings.sound})||null;
let shopInspectIndex=-1;

let selectedCard=-1,selectedAlly=null,selectedCompanion=null,help=false,infoMessage="",lastScreen="",toastTimer=null,layoutMode="",soundCtx=null;
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
 // Any prior cinematic may be skipped to a safe, already-committed rules
 // checkpoint. Rapid player inputs never execute against a stale view.
 if(motion?.isBusy())motion.skipToSafeCheckpoint();
 const before=motion?.capture();
 const result=action();
 if(result&&result.ok===false){flash(result.message);return false}
 save();
 render();
 if(motion){
  motion.play(before,result,game.view()).catch(err=>console.error("Cinematic fallback",err));
 }else sound("tap");
 return true;
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
  if((i===0||i===3)&&b===1)return '';
  const x=[12,36,65,89][i],y=(kind==="boss"||i===0)?53:b===0?34:70,done=i<r.step,now=i===r.step;
  return '<button type="button" class="map-node '+(done?"is-complete":now?"is-current":"is-future")+'"'+(!now?' disabled':'')+
   ' style="--nx:'+x+'%;--ny:'+y+'%" data-act="node" data-i="'+b+'" aria-label="'+esc(names[kind]||kind)+'">'+
   '<span class="glyph">'+(glyphs[kind]||"◇")+'</span><strong>'+esc(names[kind]||kind)+'</strong></button>';
 })).join("");
 const mobile=all.map((events,i)=>'<div class="map-mobile-row '+(i===r.step?"is-current":"")+'">'+
  '<span class="mobile-row-title">第 '+(i+1)+' 站</span>'+
 events.map((kind,b)=>(i===0||i===3)&&b===1?'':'<button type="button" data-act="node" data-i="'+b+'" '+(i!==r.step?"disabled":"")+'>'+
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
   return '<div><button '+(sold&&kind!=="shop"?'disabled':'')+' data-act="'+(kind==="shop"?"shopinspect":"claim")+'" data-i="'+i+'" type="button" aria-label="'+(kind==="shop"?"查看商品 ":"领取 ")+esc(p.name)+'">'+paperCard(p,{selectable:true})+'</button>'+
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
 (kind==="treasure"?'<div class="event-chest" aria-hidden="true"><span class="chest-lid"></span><span class="chest-body"></span><span class="chest-lock">◈</span></div>':'')+
 (kind==="shop"?'<div class="speech-bubble">欢迎来到远征商店。看上哪张牌，点击购买就好！</div>':'')+
 '<div class="choice-row">'+offers.join("")+'</div>'+
 '<div class="event-rail"><span class="choice-currency">当前古金币 ◈ '+r.gold+'</span>'+
 (kind==="shop"||kind==="treasure"||kind==="charm"||kind==="forge"?
 '<button class="wood-button" data-act="leave" type="button">离开并继续旅程 ❯</button>':'')+
 '</div></div>',kind+"-scene");
}

function closeShopInspect(){
 shopInspectIndex=-1;
 app.querySelector(".shop-inspect-backdrop")?.remove();
}
function showShopInspect(index){
 const state=game.state(),item=state.run?.offers?.[index];
 if(state.screen!=="shop"||!item)return;
 closeShopInspect();shopInspectIndex=index;
 const enough=state.run.gold>=item.price;
 const sold=!!item.sold;
 const overlay=document.createElement("div");
 overlay.className="shop-inspect-backdrop";
 overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
 overlay.setAttribute("aria-label","查看"+item.name);
 overlay.innerHTML='<div class="shop-inspect" role="document">'+
 '<button type="button" class="shop-close" data-act="shopcancel" aria-label="关闭商品详情">×</button>'+
 '<div class="shop-card-preview">'+paperCard(item,{selectable:false})+'</div>'+
 '<div class="shop-details"><h2>'+esc(item.name)+'</h2>'+
 '<p>'+esc(item.desc||"远征旅途中可以使用的战术道具")+'</p>'+
 '<div class="shop-price">◈ '+item.price+'</div>'+
 '<div class="shop-balance">当前古金币：◈ '+state.run.gold+'</div>'+
 '<div class="shop-status" aria-live="polite">'+(sold?'该商品已售罄':enough?'确认购买后才会扣款':'金币不足，还差 ◈ '+(item.price-state.run.gold))+'</div>'+
 '<div class="shop-buttons"><button type="button" class="wood-button" data-act="shopcancel">返回</button>'+
 '<button type="button" class="pill-button" data-act="shopconfirm" '+(sold||!enough?'disabled':'')+'>确认购买</button></div></div></div>';
 overlay.addEventListener("click",e=>{if(e.target===overlay)closeShopInspect()});
 app.append(overlay);
 overlay.querySelector(".shop-close").focus({preventScroll:true});
 motion?.beep("paper");
}

function showCompanionPicker(){
 const r=game.state().run,b=r?.battle;
 if(!b)return;
 const reserve=r.companions.filter(id=>!b.fallenCompanions?.includes(id)&&!b.allies.some(u=>u.hp>0&&u.template===id));
 if(!reserve.length){flash("没有可召唤的后备伙伴");return}
 app.querySelector(".battle-summon-picker")?.remove();
 const pane=document.createElement("div");pane.className="battle-summon-picker";
 pane.setAttribute("role","dialog");pane.setAttribute("aria-modal","true");
 pane.setAttribute("aria-label","选择召唤伙伴");
 pane.innerHTML='<div class="summon-picker-paper"><h2>伙伴后备席</h2><p>选择一名伙伴，再点击我方空阵位。召唤消耗本回合出牌机会。</p>'+
 '<div class="summon-roster">'+reserve.map(id=>{
  const info=find(rules.FRIENDS,id);
  return '<button type="button" data-act="selectsummon" data-id="'+esc(id)+'">'+
    '<span class="summon-portrait"><img loading="eager" src="'+esc(info?.art||"")+'" alt=""></span>'+
    '<strong>'+esc(info?.name||id)+'</strong><small>HP '+(info?.hp||0)+' · 攻击 '+(info?.atk||0)+'</small></button>';
 }).join("")+'</div><button class="wood-button" type="button" data-act="summonclose">返回战斗</button></div>';
 pane.addEventListener("click",e=>{if(e.target===pane)pane.remove()});
 app.append(pane);
}

function battleUnit(unit,side){
 const creature=find(rules.ENEMIES,unit.template);
 const portrait=unit.art?'<img loading="eager" src="'+esc(unit.art)+'" alt="'+esc(unit.name)+'角色插画">':enemyIllustration(unit.template);
 return '<button class="battle-unit '+(side==="enemy"?"enemy":"friendly")+(unit.uid===selectedAlly?' is-selected':'')+'" data-act="'+(side==="enemy"?"enemy":"ally")+'" data-id="'+esc(unit.uid)+'" type="button" aria-label="'+esc(unit.name)+' 生命'+unit.hp+' 攻击'+unit.atk+' 倒计时'+unit.tick+'">'+
  '<span class="unit-art">'+portrait+'</span><span class="unit-name">'+esc(unit.name)+'</span><span class="unit-trait">'+esc(unit.leader?'队长':unit.template==='medic'?'治愈':unit.template==='engineer'?'破甲':unit.template==='scout'?'卫护':'自动攻击')+'</span>'+
  '<span class="unit-badges"><span class="badge hp">'+unit.hp+'</span><span class="badge atk">'+unit.atk+'</span><span class="badge tick">'+unit.tick+'</span>'+
  (unit.shield?'<span class="badge shield">'+unit.shield+'</span>':'')+
  (unit.stunned?'<span class="badge stun">'+unit.stunned+'</span>':'')+'</span></button>';
}
function combatCell(units,side,slot){
 const unit=units.find(x=>x.slot===slot&&x.hp>0);
 const target=side==="enemy"&&selectedCard>=0;
 const movable=side==="friendly"&&(selectedAlly||selectedCompanion)&&!unit;
 return '<div class="battle-slot '+(target?'is-active-target ':'')+(movable?'is-move-target':'')+'" data-side="'+side+'" data-slot="'+slot+'" data-row="'+Math.floor(slot/3)+'" role="group" aria-label="'+
  (side==="friendly"?'我方':'敌方')+(Math.floor(slot/3)===0?'上':'下')+'排第'+(slot%3+1)+'号位">'+
  (unit?battleUnit(unit,side):movable?'<button class="slot-drop" type="button" data-act="slot" data-i="'+slot+'" aria-label="放置或移动到空格">＋</button>':'')+'</div>';
}
function combatRow(allies,foes,row){
 const friendSlots=row===0?[2,1,0]:[5,4,3];
 const enemySlots=row===0?[0,1,2]:[3,4,5];
 return '<div class="battle-grid battle-lane" data-row="'+row+'">'+
  friendSlots.map(slot=>combatCell(allies,"friendly",slot)).join("")+
  enemySlots.map(slot=>combatCell(foes,"enemy",slot)).join("")+'</div>';
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
 const reserve=r.companions.filter(id=>!b.fallenCompanions?.includes(id)&&!b.allies.some(a=>a.hp>0&&a.template===id));
 return wrap("battle-scene "+(r.zone===1?"ice-zone":r.zone===2?"summit-zone":""),commonHead(z.name+" · "+(b.boss?"首领战":"遭遇战"),{back:"map",className:"battle-header",subtitle:"ROUND "+b.turn})+
 '<div class="battle-core"><div class="battle-field">'+
 '<div class="battle-log" aria-live="polite">'+esc(latest)+'</div><div class="battle-caption"><span>己方</span><span>双排战线</span><span>敌方</span></div>'+
 '<div class="battle-side left"><button class="battle-bell" data-act="redraw" type="button" title="重抽钟"><span class="bell-glyph">♧</span><b>重抽 '+b.redrawCharge+'/4</b></button><button class="side-btn" data-act="summonlist" type="button" '+(!reserve.length||!b.playsLeft?'disabled':'')+'>召唤 '+reserve.length+'</button></div>'+
 '<div class="double-board" aria-label="双方各三列上下两排，共12阵位">'+combatRow(b.allies,b.foes,0)+combatRow(b.allies,b.foes,1)+'</div>'+
 '<div class="battle-side right"><div class="reinforcement-bell" aria-label="敌方增援倒计时"><span>♜</span><b>'+(b.boss?"首领":b.wavesSpawned?"已增援":Math.max(0,b.reinforcement-b.turn)+"回合")+'</b><small>敌方援军</small></div><div class="wave-note">回合 '+b.turn+'</div></div></div>'+
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
 const state=game.state(),r=state.run,rr=r.result;
 const recent=state.logs.filter(x=>x&&typeof x.text==="string").slice(0,3);
 const defeatAudit=!rr.won?'<section class="defeat-audit"><h2>最后战况</h2><p>战败原因：'+esc(rr.cause||"领队生命归零")+'</p>'+
 '<ol>'+recent.map(x=>'<li>'+esc(x.text)+'</li>').join("")+'</ol></section>':'';
 return wrap("results-scene",commonHead("远征结算",{back:"town"})+
 '<div class="selection-shell"><div class="panel results-panel"><div class="dialog-crest" style="font-size:49px;color:#cf9f6e">☾ ✦</div>'+
 '<h1>'+(rr.won?'冬夜终结':'风雪暂歇')+'</h1>'+
 '<p>'+(rr.won?'三片雪境已经走过，远征队带着黎明返回营地。':'远征队在长夜中失利。带着经验重新出发吧。')+'</p>'+
 '<div class="results-stats">'+[
  ['胜利',rr.battlesWon],['击败',rr.kills],['造成伤害',rr.damage],['回合',rr.turns],['金币',rr.coins],['获得同伴',rr.companions]
 ].map(([name,value])=>'<div><strong>'+value+'</strong><small>'+name+'</small></div>').join("")+'</div>'+
 defeatAudit+
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
 '<button data-act="toggleparticles" class="outline-button" type="button">飘雪：'+(s.particles?'开启':'关闭')+'</button>'+
 '<button data-act="motionspeed" data-speed="1" class="outline-button" type="button">正常 1×</button>'+
 '<button data-act="motionspeed" data-speed="2" class="outline-button" type="button">快速 2×</button></div>'+
 '<div style="font:12px/2.1 sans-serif;margin-top:15px"><p>① 村庄选领队 → 地图选路线 → 战斗 / 商店 / 事件 → 地区首领 → 结算。</p>'+
 '<p>② 每回合只出一张战术道具牌。倒计时归零的敌我单位自动攻击。</p>'+
 '<p>③ 点击我方卡再点击空格调整站位；伙伴详情可召回同伴，召唤按钮用于派遣后备伙伴。</p>'+
 '<p>④ 重抽钟四格充满时免费刷新手牌，提前重抽会结束回合。</p>'+
 '<p>⑤ 商店先查看再确认购买；动画可按空格跳到安全检查点，不改变规则结算。</p></div></div></div>');
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

const portraitCache=new Map();
function prepareBattlePortraits(){
 for(const img of app.querySelectorAll(".battle-unit .unit-art img")){
  const src=img.getAttribute("src");
  if(!src||src.startsWith("data:"))continue;
  if(portraitCache.has(src)){img.src=portraitCache.get(src);continue;}
  const process=()=>{
   if(portraitCache.has(src)){img.src=portraitCache.get(src);return;}
   try{
    const nativeW=img.naturalWidth,nativeH=img.naturalHeight;
    if(!nativeW||!nativeH)return;
    const scale=Math.min(1,850/Math.max(nativeW,nativeH));
    const w=Math.max(1,Math.round(nativeW*scale)),h=Math.max(1,Math.round(nativeH*scale));
    const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);
    const frame=ctx.getImageData(0,0,w,h),pixels=frame.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
    let start=0,end=0;
    function add(i){
     if(seen[i])return;seen[i]=1;
     const n=i*4,r=pixels[n],g=pixels[n+1],b=pixels[n+2];
     if(r>232&&g>232&&b>232&&Math.max(r,g,b)-Math.min(r,g,b)<25)queue[end++]=i;
    }
    for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}
    for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
    while(start<end){
     const n=queue[start++],x=n%w;pixels[n*4+3]=0;
     if(x>0)add(n-1);if(x<w-1)add(n+1);
     if(n>=w)add(n-w);if(n<(h-1)*w)add(n+w);
    }
    ctx.putImageData(frame,0,0);
    const result=canvas.toDataURL("image/png");
    portraitCache.set(src,result);if(img.isConnected)img.src=result;
   }catch(error){console.warn("Preserving original Anima artwork",error);}
  };
  if(img.complete&&img.naturalWidth)process();
  else img.addEventListener("load",process,{once:true});
 }
}
function traceAttack(source,target){
 if(!source||!target)return;
 const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
 const x=a.left+a.width/2,y=a.top+a.height*.3,tx=b.left+b.width/2,ty=b.top+b.height/2;
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
 svg.setAttribute("class","battle-shot-fx");svg.setAttribute("viewBox","0 0 "+innerWidth+" "+innerHeight);
 const path=document.createElementNS("http://www.w3.org/2000/svg","path");
 path.setAttribute("d","M"+x+","+y+" Q"+((x+tx)/2)+","+(Math.min(y,ty)-80)+" "+tx+","+ty);
 svg.append(path);document.querySelector(".game-shell").append(svg);
 setTimeout(()=>svg.remove(),510);
}
function pulseTarget(id){
 const node=[...app.querySelectorAll(".battle-unit.enemy")].find(e=>e.dataset.id===id);
 if(node){node.classList.add("damage-pulse");setTimeout(()=>node.classList.remove("damage-pulse"),440);}
}
function inspectUnit(node){
 if(!node)return;
 document.querySelector(".battle-inspect-backdrop")?.remove();
 const img=node.querySelector(".unit-art"),name=node.querySelector(".unit-name")?.textContent||"卡牌详情";
 const hp=node.querySelector(".badge.hp")?.textContent||"0",atk=node.querySelector(".badge.atk")?.textContent||"0",tick=node.querySelector(".badge.tick")?.textContent||"0";
 const overlay=document.createElement("div");overlay.className="battle-inspect-backdrop";
 const panel=document.createElement("div");panel.className="inspect-card";
 const title=document.createElement("h2");title.textContent=name;
 const art=document.createElement("div");art.className="inspect-picture";
 if(img)art.append(...[...img.childNodes].map(el=>el.cloneNode(true)));
 const detail=document.createElement("p");detail.textContent="♥ 生命 "+hp+"　✦ 攻击 "+atk+"　◴ 倒计时 "+tick;
 const button=document.createElement("button");button.className="pill-button";button.textContent="返回战斗 ×";
 button.addEventListener("click",()=>overlay.remove());
 overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove();});
 panel.append(art,title,detail);
 const uid=node.dataset.id;
 const active=game.state().run?.battle?.allies?.find(x=>x.uid===uid);
 if(active&&!active.leader){
  const recallButton=document.createElement("button");
  recallButton.className="wood-button";recallButton.textContent="召回伙伴";
  recallButton.addEventListener("click",()=>{
   overlay.remove();selectedAlly=null;selectedCompanion=null;
   apply(()=>game.recall(uid));
  });
  panel.append(recallButton);
 }
 panel.append(button);overlay.append(panel);
 document.querySelector(".game-shell").append(overlay);
}
let dragState=null,holdTimer=0,suppressClickUntil=0;
function installCardGestures(){
 app.addEventListener("pointerdown",e=>{
  const origin=e.target.closest(".battle-bottom .hand>button, .battle-unit.friendly");
  if(!origin||e.button!==0||game.view()!=="battle"||dragState)return;
  if(motion?.isBusy()){motion.skipToSafeCheckpoint();return;}
  const isHand=origin.matches(".battle-bottom .hand>button");
  dragState={origin,isHand,pointerId:e.pointerId,x:e.clientX,y:e.clientY,moved:false,
   index:Number(origin.dataset.i),uid:origin.dataset.id};
  try{origin.setPointerCapture(e.pointerId)}catch(error){}
  clearTimeout(holdTimer);
  if(!isHand)holdTimer=setTimeout(()=>{
    if(dragState&&!dragState.moved){
     inspectUnit(origin);dragState=null;suppressClickUntil=Date.now()+250;
    }
  },580);
 },{passive:true});
 app.addEventListener("pointermove",e=>{
  if(!dragState||e.pointerId!==dragState.pointerId)return;
  const dx=e.clientX-dragState.x,dy=e.clientY-dragState.y;
  if(Math.hypot(dx,dy)>13){
   dragState.moved=true;clearTimeout(holdTimer);
   const node=dragState.origin;
   node.style.setProperty("--drag-x",dx+"px");node.style.setProperty("--drag-y",dy+"px");
   node.classList.add("is-dragging");
   if(!dragState.isHand){
    app.querySelectorAll(".battle-slot[data-side=friendly]").forEach(v=>v.classList.add("is-move-target"));
   }
  }
 },{passive:true});
 app.addEventListener("pointerup",e=>{
  if(!dragState||e.pointerId!==dragState.pointerId)return;
  const info=dragState;dragState=null;clearTimeout(holdTimer);
  try{info.origin.releasePointerCapture(e.pointerId)}catch(error){}
  info.origin.style.removeProperty("--drag-x");info.origin.style.removeProperty("--drag-y");
  info.origin.classList.remove("is-dragging");
  app.querySelectorAll(".battle-slot.is-move-target").forEach(v=>v.classList.remove("is-move-target"));
  if(!info.moved)return;
  suppressClickUntil=Date.now()+260;
  // A moving card can visually cover the destination while its transform eases back.
  // Exclude the dragged card from hit-testing before resolving the actual slot.
  const originalPointerEvents=info.origin.style.pointerEvents;
  info.origin.style.pointerEvents="none";
  const slot=document.elementFromPoint(e.clientX,e.clientY)?.closest(".battle-slot");
  info.origin.style.pointerEvents=originalPointerEvents;
  if(!slot)return;
  if(info.isHand&&slot.dataset.side==="enemy"){
   const target=slot.querySelector(".battle-unit.enemy");
   if(!target)return;
   const c=game.state().run?.battle?.hand[info.index],definition=find(rules.ITEMS,c?.id);
   if(!definition||!["hit","pierce","freeze","weaken"].includes(definition.kind)){flash("这张道具不能指定敌方目标");return;}
   const targetId=target.dataset.id;traceAttack(info.origin,target);
   selectedCard=-1;
   if(apply(()=>game.play(info.index,targetId)))pulseTarget(targetId);
  }else if(!info.isHand&&slot.dataset.side==="friendly"){
   selectedAlly=null;apply(()=>game.move(info.uid,Number(slot.dataset.slot)));
  }
 },{passive:true});
 app.addEventListener("pointercancel",()=>{
  clearTimeout(holdTimer);
  if(dragState){
   try{dragState.origin.releasePointerCapture(dragState.pointerId)}catch(error){}
   dragState.origin.style.removeProperty("--drag-x");dragState.origin.style.removeProperty("--drag-y");
   dragState.origin.classList.remove("is-dragging");dragState=null;
  }
 },{passive:true});
}

function render(){
 const view=game.view();
 if(view!==lastScreen){
  selectedCard=-1;selectedAlly=null;selectedCompanion=null;
  lastScreen=view;
 }
 const route={menu,town,leader,map:mapScene,battle,"battle-clear":battleClear,result:results,shop:()=>eventView("shop"),
 recruit:()=>eventView("recruit"),treasure:()=>eventView("treasure"),charm:()=>eventView("charm"),
 camp:()=>eventView("camp"),forge:()=>eventView("forge"),deck,townbuilding:townBuilding,settings};
 const html=(route[view]||menu)()+(help?helpPanel():"");
 // Keep the physical DOM identity of surviving units between game updates.
 // A keyed mount moves the existing element into its new slot while updating
 // only the changing data, preserving image decoding and browser animation IDs.
 if(view==="battle"&&app.querySelector(".battle-scene")){
  const current=new Map([...app.querySelectorAll(".battle-unit[data-id]")].map(el=>[el.dataset.id,el]));
  const template=document.createElement("template");template.innerHTML=html;
  for(const fresh of [...template.content.querySelectorAll(".battle-unit[data-id]")]){
   const existing=current.get(fresh.dataset.id);
   if(!existing)continue;
   const oldPortrait=existing.querySelector(".unit-art img");
   const freshPortrait=fresh.querySelector(".unit-art img");
   // Images generated from the existing Anima original must not reload.
   const priorImage=oldPortrait?.src;
   existing.className=fresh.className;
   existing.setAttribute("aria-label",fresh.getAttribute("aria-label")||"");
   for(const badge of fresh.querySelectorAll(".badge")){
    const key=[...badge.classList].find(c=>c!=="badge");
    const previous=existing.querySelector(".badge."+key);
    if(previous){previous.textContent=badge.textContent;previous.className=badge.className}
   }
   const name=existing.querySelector(".unit-name"),freshName=fresh.querySelector(".unit-name");
   if(name&&freshName)name.textContent=freshName.textContent;
   if(oldPortrait&&freshPortrait&&priorImage)oldPortrait.src=priorImage;
   fresh.replaceWith(existing);
  }
  app.replaceChildren(template.content);
 }else app.innerHTML=html;
 if(view==='battle')prepareBattlePortraits();
 document.querySelector(".ambient-snow").style.display=game.state().settings.particles?"":"none";
 document.title=(view==="battle"?"战斗 · ":view==="map"?"地图 · ":"")+"雪境行旅";
}
function isTargetingCard(){
 const b=game.state().run?.battle;
 if(!b||selectedCard<0)return false;
 return ["hit","pierce","freeze","weaken"].includes(find(rules.ITEMS,b.hand[selectedCard]?.id)?.kind);
}
function onClick(event){
 if(Date.now()<suppressClickUntil)return;
 const el=event.target.closest("[data-act]");if(!el)return;
 const act=el.dataset.act,id=el.dataset.id,index=Number(el.dataset.i||"0");
 if(motion?.isBusy()){
  motion.skipToSafeCheckpoint();
  if(["endturn","redraw","shopconfirm","claim","continuebattle","leave"].includes(act))return;
 }
 if(act==="help"){help=true;render();return;}
 if(act==="helpclose"){help=false;render();return;}
 if(help)return;
 switch(act){
 case "menu":apply(()=>game.go("menu"));break;
 case "town":apply(()=>game.town());break;
 case "new":apply(()=>game.startFresh());break;
 case "resume":{const rr=game.state().run;const target=rr?.result?"result":rr?.battle?.finished?"battle-clear":rr?.battle?"battle":"map";apply(()=>game.go(target));break;}
 case "leader":apply(()=>game.selectHero(id));break;
 case "map":apply(()=>game.go("map"));break;
 case "node":apply(()=>game.selectNode(index));break;
 case "claim":apply(()=>game.claim(index));break;
 case "summonlist":showCompanionPicker();break;
 case "summonclose":app.querySelector(".battle-summon-picker")?.remove();break;
 case "selectsummon":{
  selectedCompanion=id;selectedAlly=null;selectedCard=-1;
  app.querySelector(".battle-summon-picker")?.remove();
  render();break;
 }
 case "shopinspect":showShopInspect(index);break;
 case "shopcancel":closeShopInspect();break;
 case "shopconfirm":{
  if(shopInspectIndex<0)break;
  const i=shopInspectIndex;
  closeShopInspect();
  apply(()=>game.buy(i));
  break;
 }
 case "buy":showShopInspect(index);break;
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
  }else{selectedCard=index;selectedAlly=null;render();}
  break;
 }
 case "enemy":{
  if(selectedCard>=0){
   const source=app.querySelector('.battle-bottom .hand>button:nth-child('+(selectedCard+1)+')');
   traceAttack(source,el.closest('.battle-unit'));
   const i=selectedCard;selectedCard=-1;
   if(apply(()=>game.play(i,id)))pulseTarget(id);
  }else inspectUnit(el.closest('.battle-unit'));
  break;
 }
 case "ally":if(selectedAlly===id){inspectUnit(el.closest(".battle-unit"));break;} selectedAlly=id;selectedCard=-1;render();break;
 case "slot":{
  if(selectedCompanion){
   const id=selectedCompanion;selectedCompanion=null;
   apply(()=>game.summon(id,index));
  }else if(selectedAlly){
   const id=selectedAlly;selectedAlly=null;
   apply(()=>game.move(id,index));
  }
  break;
 }
 case "playselected":if(selectedCard>=0){const i=selectedCard;selectedCard=-1;apply(()=>game.play(i));}break;
 case "cancel":selectedCard=-1;selectedCompanion=null;render();break;
 case "deck":apply(()=>game.showDeck());break;
 case "closedeck":apply(()=>game.closeDeck());break;
 case "backtown":apply(()=>game.backTown());break;
 case "townbuilding":layoutMode=id;apply(()=>game.go("townbuilding"));break;
 case "settings":apply(()=>game.go("settings"));break;
 case "motionspeed":motion?.setSpeed(Number(el.dataset.speed)||1);render();break;
 case "togglesound":apply(()=>game.settings({sound:!game.state().settings.sound}));break;
 case "toggleparticles":apply(()=>game.settings({particles:!game.state().settings.particles}));break;
 default:break;
 }
}
app.addEventListener("click",onClick);
installCardGestures();
window.addEventListener("keydown",e=>{
 if(e.code==="Space"&&motion?.isBusy()){e.preventDefault();motion.skipToSafeCheckpoint();return;}
 if(motion?.isBusy()&&["e","r"].includes(e.key.toLowerCase())){e.preventDefault();motion.skipToSafeCheckpoint();return;}
 if(e.key==="Escape"&&app.querySelector(".shop-inspect-backdrop")){closeShopInspect();return;}
 if(e.key==="Escape"&&app.querySelector(".battle-summon-picker")){app.querySelector(".battle-summon-picker").remove();return;}
 if(e.key==="Escape"&&document.querySelector(".battle-inspect-backdrop")){document.querySelector(".battle-inspect-backdrop").remove();return;}
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
 motion,
 get timeline(){return motion?.trace()||[];},
 skipAnimation:()=>motion?.skipToSafeCheckpoint(),
 selectNode:branch=>apply(()=>game.selectNode(branch)),
 action:(index,target)=>apply(()=>game.play(index,target)),
 go:view=>apply(()=>game.go(view)),
 version:"1.1.0-battle-ux"
});
render();
})();