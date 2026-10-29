import {DISTRICTS,CREW,MISSIONS,GOALS,initialGame,restore,availableCrew,crewInfo,zoneInfo,canOrder,setOrder,endDay,phoneDetails,answerPhone,markGunSeen} from './engine.js';
import {CONTACTS,DOSSIERS,initialOffice,normalizeOffice,dial,queueVisitor,decideDossier,allocate,transferSafe,equip,openDoor,visitorAction,travel,advance} from './office-features.js';
import {createWorld,applyWorld,advanceWorld} from './core/game.js';
import {renderWorldPanel} from './ui/world-panel.js';
import {renderCityBook} from './ui/city-book.js';
import {renderOriginBook} from './ui/origin-book.js';
import {SHIFTS} from './systems/clock.js';
import {createStage} from './presentation/stage.js';
import {createExploreLayer} from './scenes/explore.js';
import {todayStory,activeStoryBeat,SEASON_ARCS} from './systems/campaign.js';
import {clockLabel} from './systems/clock.js';
const $=id=>document.getElementById(id);
const STORE='night-office-game-v4', META_STORE='night-office-features-v1';
const escapeHTML=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let state;try{state=restore(localStorage.getItem(STORE));}catch{state=initialGame();}
let meta;try{meta=normalizeOffice(JSON.parse(localStorage.getItem(META_STORE)||'null'),state);}catch{meta=initialOffice();}
const WORLD_STORE='night-office-world-v1';
let world;try{world=createWorld(state,localStorage.getItem(WORLD_STORE));}catch{world=createWorld(state,null);}
let currentPanel=null,focusBefore=null,timer,dialBuffer='',lastDial='',fileTab='dossiers',callZone='harbor',doorTimer=null;
let explorer=null;
let worldUI={cell:'s0',lot:'lot-1',person:'kai',talker:'kai',courier:'kai',target:'bell-lu',operation:'pressure',from:null,destination:'s1',source:'job',candidate:'mio',faction:'bell'};
const originTabs=new Set(['society','recruitment','politics']);
const cityTabs=new Set(['clock','estates','transport','citizens','operations','contacts','justice']);
const worldTabs=new Set(['city','personnel','news','civic','dialogue',...cityTabs,...originTabs]);
let plan={crew:'kai',zone:'harbor',mission:'deliver'};
const fmt=n=>'＄'+n.toLocaleString('en-US');
function save(){try{localStorage.setItem(STORE,JSON.stringify(state));localStorage.setItem(META_STORE,JSON.stringify(meta));localStorage.setItem(WORLD_STORE,JSON.stringify(world));}catch{}}
function toast(message){const n=$('toast');n.textContent=message;n.classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>n.classList.remove('visible'),2600);}
function refresh(){
 $('day').textContent=String(state.day).padStart(2,'0');
 const dateLabel=$('game-date');if(dateLabel)dateLabel.textContent=clockLabel(state.day,world.slices.clock.shift).replace('1998-','');

 $('ribbon-day').textContent=String(state.day).padStart(3,'0');
 $('cash').textContent=fmt(state.cash);
 $('heat').textContent=String(state.heat).padStart(2,'0');
 const scene=document.querySelector('.scene');
 scene.classList.toggle('door-open',meta.doorOpen);
 scene.classList.toggle('visitor-here',Boolean(meta.visitor));
 scene.classList.toggle('has-knock',Boolean(meta.visitorQueue.length)&&!meta.visitor);
 const street=$('street-scene');if(street)street.hidden=meta.venue!=='street';
 $('respect').textContent=String(state.respect).padStart(2,'0');
 const recent=state.reports[0];
 if(meta.visitor){
  $('speaker').textContent=(crewInfo(meta.visitor.id)?.name||'来客')+' · 当面汇报';
  $('briefing-text').textContent='老板，人已经到桌前了。请直接点击我，交代今天的事务。';
 } else if(meta.visitorQueue.length){
  $('speaker').textContent='办公室门口 · 敲门声';
  $('briefing-text').textContent='咚、咚。有人在门外等候。点击整扇门接待来客。';
 } else {
  $('speaker').textContent=(crewInfo(recent?.crew)?.name||'办公室')+' · 最新汇报';
  $('briefing-text').textContent=recent?.body||'地图已放好。';
 }
 $('goal-marker').textContent=state.won?'◆ 城市开始承认你的名字':state.day<=6?'第一目标 · 结识街坊、建立信任、保护旧港居民':'目标 · 两区影响力 55 / 声望 24 / 现金 1400';
 document.title='夜港 · 两个无名者 · DAY '+state.day;
 save();
 explorer?.render();
}
const header=(eyebrow,title,sub='')=>'<div class="eyebrow">'+escapeHTML(eyebrow)+'</div><h2 id="panel-title">'+escapeHTML(title)+'</h2>'+(sub?'<p>'+escapeHTML(sub)+'</p>':'');
function panel(type){
 if(type==='gun'&&!state.flags.gunSeen)state=markGunSeen(state).state;
 currentPanel=type;
 focusBefore=document.activeElement;
 $('overlay').hidden=false;
 $('panel-kicker').textContent=({'map':'CITY STRATEGY / 004','phone':'INCOMING CALL / PRIVATE','reports':'REPORTS / CONFIDENTIAL','ledger':'FINANCIAL RECORDS','gun':'PERSONAL EFFECTS / 001','calendar':'THE NEXT DAY / 001','visitor':'PRIVATE MEETING / VISITOR','help':'HOW TO PLAY'})[type]||'OFFICE FILE';
 repaintPanel();
 $('close-panel').focus();
}
function closePanel(){currentPanel=null;$('overlay').hidden=true;focusBefore?.focus?.();}
/** Atomic adapter: world commands carry declarative cash/respect effects. */
function performWorldCommand(action){
 const result=applyWorld(world,action,state);
 if(!result.ok){toast(result.message||'行动暂时无法执行');return result;}
 const next=structuredClone(state);
 let stagedWorld=result.state;
 for(const effect of result.effects){
   if(effect.kind==='cash'){
     if(next.cash+effect.amount<0){toast('资金不足');return {ok:false,message:'资金不足'};}
     next.cash+=effect.amount;
     next.ledger.unshift({day:next.day,label:effect.label||'组织行动',amount:effect.amount});
   } else if(effect.kind==='respect'){
     next.respect=Math.max(0,Math.min(100,next.respect+effect.amount));
   } else if(effect.kind==='heat'){
     next.heat=Math.max(0,Math.min(100,next.heat+effect.amount));
   } else if(effect.kind==='recruit'){
     if(!next.crew.includes(effect.person)){
       next.crew.push(effect.person);
       const member=CREW.find(x=>x.id===effect.person);
       next.reports.unshift({id:'join-'+next.day+'-'+effect.person,day:next.day,crew:effect.person,
         title:'志愿入职',body:(member?.name||effect.person)+'签署了劳动合同，承诺遵守组织保护街坊的原则。',outcome:'新成员加入'});
       next.reports=next.reports.slice(0,40);
     }
   } else if(effect.kind==='dismiss'){
     next.crew=next.crew.filter(id=>id!==effect.person);
     next.orders=next.orders.filter(o=>o.crew!==effect.person);
   } else if(effect.kind==='time-phase'){
     while(stagedWorld.slices.clock.shift<effect.to){
       const passed=applyWorld(stagedWorld,{module:'clock',type:'advance-shift'},next);
       if(!passed.ok)break;
       stagedWorld=passed.state;
     }
   }
 }
 state=next;world=stagedWorld;refresh();repaintPanel();
 const message=result.events[0]?.text||'行动完成';
 if(action.module!=='origin'&&action.module!=='dialogue'&&action.module!=='campaign'){
   if(result.events.length)stage.speak(result.events[0].title||'办公室消息',message);
   else stage.cue('paper');
   toast(message);
 }
 return result;
}
const mapSVG=()=>{
 const routes={
  harbor:'M350 245L279 245L279 280L143 272',
  market:'M350 245L350 159L330 132',
  midtown:'M350 245L439 245L439 270L520 270',
  neon:'M350 245L350 346L363 376'
 };
 const route='<path class="route-path" d="'+routes[plan.zone]+'"/>';
 const nodes=DISTRICTS.map(d=>{
  const z=state.zones[d.id],active=plan.zone===d.id;
  const side=d.id==='harbor'?'right':d.id==='midtown'?'left':'right';
  const lx=side==='right'?d.x+27:d.x-27;
  const anchor=side==='right'?'start':'end';
  return '<g tabindex="0" role="button" aria-label="'+d.name+'，影响力'+z.influence+'" data-map-zone="'+d.id+'" class="city-node '+(active?'active':'')+'">'+
   '<circle cx="'+d.x+'" cy="'+d.y+'" r="25" fill="#f5e6d0" stroke="#243642" stroke-width="2"/>'+
   '<circle class="node-circle" cx="'+d.x+'" cy="'+d.y+'" r="15" fill="'+d.color+'"/>'+
   '<text x="'+lx+'" y="'+(d.y-2)+'" text-anchor="'+anchor+'">'+d.name+'</text>'+
   '<text x="'+lx+'" y="'+(d.y+16)+'" font-size="11" text-anchor="'+anchor+'">INFL. '+z.influence+'</text></g>';
 }).join('');
 const roads=[
  'M165 15L208 465','M266 0L277 470','M404 0L402 470','M565 0L516 470',
  'M108 105L695 72','M74 215L705 209','M93 346L702 336','M213 428L700 414',
  'M190 25L639 417','M159 448L570 39'
 ];
 const street=roads.map((d,i)=>'<path d="'+d+'" fill="none" stroke="#8b7d69" stroke-width="'+(i<4?15:10)+'" opacity=".55"/>'+
  '<path d="'+d+'" fill="none" stroke="#f4e4c8" stroke-width="'+(i<4?11:7)+'"/>').join('');
 const blocks=[
 [215,45,37,33],[286,24,67,45],[450,38,76,43],[550,119,69,61],[171,148,41,37],
 [227,160,56,37],[466,138,65,39],[587,253,63,37],[200,291,52,38],
 [299,291,38,33],[443,302,61,38],[501,365,45,28],[575,387,73,38]
 ].map(([x,y,w,h],i)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+
 '" rx="1" fill="'+(i%4===0?'#ba7975':i%4===1?'#bea887':i%4===2?'#85969b':'#c6ac91')+'" opacity=".84"/>').join('');
 return '<svg class="city-map" viewBox="0 0 700 470" role="img" aria-label="街道线路图：选择城区派遣手下">'+
 '<defs><pattern id="grain" width="17" height="17" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1" fill="#bca786" opacity=".35"/></pattern></defs>'+
 '<rect width="700" height="470" fill="#e4d6bd"/>'+
 '<path d="M0 0H109L154 102L103 223L163 317L116 470H0Z" fill="#829aaa"/>'+
 '<path d="M0 0H109L154 102L103 223L163 317L116 470" fill="none" stroke="#f9eee0" stroke-width="9"/>'+
 '<path d="M10 64L108 77M0 179L112 198M11 346L143 326" fill="none" stroke="#c6d2cd" stroke-width="4" stroke-dasharray="13 7"/>'+
 '<path d="M155 0H700V125L172 173Z" fill="#c6b7a0" opacity=".47"/>'+
 '<path d="M160 325L699 259V470H121Z" fill="#b7c1b9" opacity=".38"/>'+
 '<path d="M486 0H700V176L557 195L446 85Z" fill="#cc928a" opacity=".36"/>'+
 blocks+street+
 '<g fill="#675d52" opacity=".23"><path d="M600 7H648V44H600Z"/><path d="M335 380H394V410H335Z"/><path d="M560 50H590V96H560Z"/></g>'+
 '<path d="M94 225L174 227" stroke="#394e5d" stroke-width="13" stroke-linecap="butt"/>'+
 '<path d="M94 225L174 227" stroke="#edd5b4" stroke-width="7" stroke-dasharray="10 7"/>'+
 '<g fill="#243441"><text x="19" y="29" font-family="Georgia" font-weight="900" font-size="15" letter-spacing="3">NIGHT HARBOR / 04</text>'+
 '<text x="15" y="444" font-family="Georgia" font-size="10" letter-spacing="2" transform="rotate(-90 15 444)">OLD HARBOR · PIER DISTRICT</text>'+
 '<text x="585" y="457" font-size="10" letter-spacing="2">CITY ATLAS / 04</text></g>'+
 route+
 '<circle cx="350" cy="245" r="24" fill="#243642" stroke="#f6e4c5" stroke-width="6"/>'+
 '<text x="337" y="250" font-size="12" font-weight="900" fill="#fff0d4" stroke="none">HQ</text>'+
 nodes+
 '<rect width="700" height="470" fill="url(#grain)" pointer-events="none"/>'+
 '</svg>';
};
function mapPanel(){
 const slots=availableCrew(state),planned=state.orders;
 if(!slots.includes(plan.crew))plan.crew=slots[0]||null;
 if(!plan.zone)plan.zone='harbor';
 if(!plan.mission)plan.mission='deliver';
 const check=canOrder(state,plan.crew,plan.zone,plan.mission);
 const crewButtons=CREW.filter(c=>state.crew.includes(c.id)).map(c=>{
   const active=c.id===plan.crew,used=!slots.includes(c.id);
   return '<button class="crew-ticket '+(active?'active':'')+'" type="button" data-map-crew="'+c.id+'" '+(used?'disabled':'')+'>'+
   '<span class="crew-avatar">'+c.face+'</span><span><strong>'+c.name+'</strong><small>'+c.role+(used?' · 已安排':'')+'</small></span></button>';
 }).join('');
 const jobButtons=MISSIONS.map(m=>'<button type="button" class="choice '+(plan.mission===m.id?'active':'')+'" data-map-mission="'+m.id+'">'+m.short+'</button>').join('');
 const district=zoneInfo(plan.zone);
 return header('MAP / ASSIGNMENT','城区路线规划','选择成员、街区与行动，再派出。路线会标在地图上，结果在第二天成为小弟递来的汇报。')+
 '<div class="paper-grid"><div><div class="map-shell">'+mapSVG()+'</div><button class="world-atlas-link" type="button" data-world-tab="city">展开城市势力版图 · 16 街区 / 5 家族 ›</button><div class="city-actions"><button class="choice" type="button" data-world-tab="recruitment">人才市场</button><button class="choice" type="button" data-world-tab="society">平民互助</button><button class="choice" type="button" data-world-tab="politics">家族产业</button></div><div class="city-actions"><button class="choice" type="button" data-world-tab="estates">地产购置</button><button class="choice" type="button" data-world-tab="transport">运输路线</button><button class="choice" type="button" data-world-tab="citizens">街区居民</button></div><p class="map-hint">点击地图上的城区圆点选择路线终点 · 总部 HQ 是固定出发点</p>'+
 '<div class="info-box"><b>'+district.name+'</b>｜'+district.blurb+'<br/>当前影响力 '+state.zones[district.id].influence+' · 竞争压力 '+state.zones[district.id].pressure+'</div></div>'+
 '<div><div class="mini-title">01 / 派谁出门</div><div class="selection-list">'+crewButtons+'</div>'+
 '<hr class="line"/><div class="mini-title">02 / 执行什么任务</div><div class="selection-list">'+jobButtons+'</div>'+
 '<div class="order-preview"><strong>'+escapeHTML(crewInfo(plan.crew)?.name||'暂无空闲成员')+' → '+district.name+'</strong><small>'+MISSIONS.find(m=>m.id===plan.mission).description+'</small></div>'+
 '<p class="map-hint">安排：'+state.orders.length+' / '+state.crew.length+' 人 · 今天尚未派遣的成员可以继续安排。</p>'+
 '<button class="primary" type="button" data-assign="1" '+(!check.ok?'disabled':'')+'>'+(check.ok?'确定派遣':'无法派遣')+'</button>'+
 (!check.ok?'<p class="map-hint">'+escapeHTML(check.reason)+'</p>':'')+
 (planned.length?'<hr class="line"/><div class="mini-title">已派遣的行动</div>'+planned.map(o=>'<p class="map-hint">'+crewInfo(o.crew).name+' → '+zoneInfo(o.zone).name+' · '+MISSIONS.find(m=>m.id===o.mission).title+'</p>').join(''):'')+
 '</div></div>';
}
function phonePanel(){
 const incoming=phoneDetails(state),screen=dialBuffer||'— — —';
 const buttons=['1','2','3','4','5','6','7','8','9','*','0','#'].map(k=>'<button type="button" data-digit="'+k+'" aria-label="电话按键'+k+'">'+k+'</button>').join('');
 const book=CONTACTS.map(c=>'<div class="contact-line"><div><strong>'+c.name+'</strong><small style="display:block;font-size:10px">'+c.type+' · '+c.hint+'</small></div><button type="button" data-dialpreset="'+c.num+'">'+c.num+'</button></div>').join('');
 const incomingBlock=!state.call.answered?'<div class="phone-result"><b>☎ 未接来电：'+escapeHTML(incoming.from)+'</b><p>'+escapeHTML(incoming.text)+'</p><div class="phone-options">'+incoming.options.map(o=>'<button type="button" data-phone="'+o.id+'">'+o.name+'<small>'+o.description+'</small></button>').join('')+'</div></div>':'';
 return header('HOTLINE · 01','座机通讯台','输入三位分机号码，拨出后由对方实际执行工作。')+
 '<div class="phone-station"><div><div class="phone-device"><div class="phone-handset"></div>'+
 '<div class="phone-display"><small>LINE 01 / '+(state.call.answered?'IDLE':'INCOMING')+'</small><strong id="dial-screen">'+escapeHTML(screen)+'</strong></div>'+
 '<div class="phone-keypad">'+buttons+'</div><div class="phone-controls"><button type="button" data-phoneclear="1">退格</button><button type="button" data-dial="1">拨号 ☎</button><button type="button" data-phonehang="1">挂机</button></div></div>'+
 '<div class="phone-result" id="dial-result">'+escapeHTML(lastDial||'拨号输入三位号码，或者从通讯录里选一个。')+'</div></div>'+
 '<div><div class="mini-title">CONTACT BOOK / 通讯录</div><div class="phone-book">'+book+'</div>'+
 incomingBlock+
 '<div class="info-box"><b>情报目标：</b>'+zoneInfo(callZone).name+
 '<div class="selection-list">'+['harbor','market','midtown','neon'].map(id=>'<button class="choice '+(id===callZone?'active':'')+'" data-callzone="'+id+'">'+zoneInfo(id).name+'</button>').join('')+'</div></div>'+
 (meta.phoneHistory.length?'<div class="mini-title">最近通话 · '+escapeHTML(meta.phoneHistory[0].name)+' / DAY '+meta.phoneHistory[0].day+'</div>':'')+
 '</div></div>';
}
function reportsPanel(){
 if(originTabs.has(fileTab))return renderOriginBook(fileTab,world,state,worldUI);
 if(cityTabs.has(fileTab))return renderCityBook(fileTab,world,state,worldUI);
 if(worldTabs.has(fileTab))return renderWorldPanel(fileTab,world,state,worldUI);
 const tabs='<div class="file-tabs"><button type="button" data-filetab="dossiers" class="'+(fileTab==='dossiers'?'selected':'')+'">待批示卷宗</button><button type="button" data-filetab="reports" class="'+(fileTab==='reports'?'selected':'')+'">实际行动汇报</button><button type="button" data-filetab="crew" class="'+(fileTab==='crew'?'selected':'')+'">组织成员档案</button><button type="button" data-world-tab="personnel">人事任命册</button><button type="button" data-world-tab="news">夜港晚报</button><button type="button" data-world-tab="civic">治安与世界</button><button type="button" data-world-tab="dialogue">会谈</button><button type="button" data-world-tab="estates">地皮地产</button><button type="button" data-world-tab="transport">运输</button><button type="button" data-world-tab="clock">时间</button><button type="button" data-world-tab="citizens">路人</button><button type="button" data-world-tab="operations">高风险事务</button><button type="button" data-world-tab="contacts">雇佣线人</button><button type="button" data-world-tab="justice">警方卷宗</button><button type="button" data-world-tab="recruitment">人才市场</button><button type="button" data-world-tab="society">国家民生</button><button type="button" data-world-tab="politics">各大家族</button></div>';
 let view='';
 if(fileTab==='dossiers'){
  view='<div class="dossier-list">'+DOSSIERS.map(d=>{
   const status=meta.dossierStatus[d.id]||'pending';
   return '<section class="dossier-tile" data-status="'+status+'"><span class="paper-chip">'+d.dept+'</span><h3>'+d.name+'</h3><p>'+d.description+'</p>'+
   '<div class="mini-title">状态：'+(status==='pending'?'等待批示':status==='approved'?'已批准':'已退回')+'</div>'+
   (status==='pending'?'<div class="dossier-actions"><button type="button" data-filedecision="approve" data-case="'+d.id+'">签署批准</button><button type="button" data-filedecision="decline" data-case="'+d.id+'">盖章退回</button></div>':'')+'</section>';
  }).join('')+'</div>';
 } else if(fileTab==='reports'){
  view=state.reports.map(r=>'<article class="report-card"><small>DAY '+String(r.day).padStart(2,'0')+' / '+(crewInfo(r.crew)?.name||'来访者')+'</small><h3>'+escapeHTML(r.title)+'</h3><p>'+escapeHTML(r.body)+'</p><span class="outcome">'+escapeHTML(r.outcome)+'</span></article>').join('');
 }else{
  view='<div class="dossier-list">'+CREW.filter(c=>state.crew.includes(c.id)).map(c=>{
   const o=state.orders.find(o=>o.crew===c.id);
   return '<article class="dossier-tile"><span class="paper-chip">PERSONNEL / '+c.id.toUpperCase()+'</span><h3>'+c.name+'</h3><p>'+c.trait+' · '+c.role+'</p><p>当前状态：'+(o?'执行 '+zoneInfo(o.zone).name+' / '+o.mission:'办公室待命')+'</p>'+
   (!o?'<div class="dossier-actions"><button type="button" data-crewvisit="'+c.id+'">召他当面汇报</button></div>':'')+'</article>';
  }).join('')+'</div>';
 }
 return header('OFFICIAL FILES / APPROVAL','小弟汇报','卷宗有实际的批准/退回操作。批准委托会直接向空闲成员分配任务；报告来自每天实际行动。')+tabs+view;
}
function ledgerPanel(){
 return header('ACCOUNTING / BUDGET','组织账本','不仅记录收支：你可以给运输和街区关系拨款，投入在次日结算时发挥作用。')+
 '<div class="paper-grid"><div><div class="mini-title">当日流水 / CASH FLOW</div><table class="account"><thead><tr><th>日期</th><th>用途</th><th>金额</th></tr></thead><tbody>'+
 state.ledger.slice(0,24).map(l=>'<tr><td>DAY '+l.day+'</td><td>'+escapeHTML(l.label)+'</td><td class="'+(l.amount<0?'negative':'')+'">'+(l.amount>0?'+':'')+fmt(l.amount)+'</td></tr>').join('')+
 '</tbody></table></div><div><div class="mini-title">可用现金</div><h2>'+fmt(state.cash)+'</h2>'+
 '<div class="budget-row"><div><strong>运输保障 · 40元</strong><small>每个跑单任务明天额外收入 30元 · 已投入 '+meta.bonus.logistics+'/2</small></div><button data-budget="logistics" type="button">划拨</button></div>'+
 '<div class="budget-row"><div><strong>社区关系 · 35元</strong><small>明日声望 +2，市集影响 +3 · 已投入 '+meta.bonus.relations+'/2</small></div><button data-budget="relations" type="button">划拨</button></div>'+
 '<div class="info-box"><b>仓库待出货：</b>'+meta.supply+' 批<br/><b>保险抽屉：</b>'+fmt(meta.storedCash)+'<br/><b>预计日常开支：</b>'+fmt(35+state.crew.length*14)+'</div>'+
 '<p class="map-hint">财务划拨会即时扣款并记入流水，效果在翻日历后结算。</p></div></div>';
}
function gunPanel(){
 return header('SECURE DRAWER / INVENTORY','办公桌保管抽屉','检查和管理办公用品与备用现金。物件安全保管状态直接改变关注风险。')+
 '<div class="paper-grid"><div><div class="mini-title">保管记录</div><div class="report-card"><h3>旧式手枪 · NO KINGS</h3>'+
 '<p>当前保管方式：'+(meta.equipment==='locked'?'锁在办公室抽屉':'由阿凯登记保管')+'</p>'+
 '<div class="dossier-actions"><button type="button" data-equip="locked">锁进抽屉 · 关注-2</button><button type="button" data-equip="kai">交给阿凯登记 · 关注+2</button></div></div>'+
 '<div class="report-card"><h3>备用现金</h3><p>已经收存 '+fmt(meta.storedCash)+'。</p>'+
 '<div class="dossier-actions"><button type="button" data-safe="50">存入 50</button><button type="button" data-safe="-50">取出 50</button></div></div></div>'+
 '<div><div class="mini-title">保管原则</div><div class="info-box"><b>风险：'+state.heat+'</b><br/>将旧枪安全上锁可以降低关注。外带需要登记并提升关注，不提供枪战操作。</div>'+
 '<div class="mini-title">仓库供应</div><p>库存 '+meta.supply+' 批。需要备货请拿起电话拨打 <b>305</b>。</p></div></div>';
}
function visitorPanel(){
 const v=meta.visitor,c=v?crewInfo(v.id):null;
 if(!v||!c)return header('VISITOR','来客已离开');
 return header('IN PERSON / OFFICE AUDIENCE',c.name+' · 到场汇报','他从对面的门进入，站在办公桌前等待你的指示。')+
 '<div class="visitor-page"><div class="visitor-portrait">'+c.face+'</div><div>'+
 '<div class="dialog-punch">“老板，我过来了。今天是听取情况，还是马上安排我出去办事？”</div>'+
 '<p>身份：'+c.role+'　　状态：'+(availableCrew(state).includes(c.id)?'可以安排行动':'已安排任务')+'</p>'+
 '<div class="visitor-actions"><button type="button" data-visitact="hear">听他当面汇报 · 声望+1</button>'+
 '<button type="button" data-visitact="assign">直接安排工作</button>'+
 '<button type="button" data-visitact="dismiss">让他离开</button></div></div></div>';
}
function calendarPanel(){
 const episode=todayStory(world),beat=activeStoryBeat(world),progress=world.slices.campaign;
 const arc=SEASON_ARCS.find(x=>state.day<=x.end)||SEASON_ARCS[SEASON_ARCS.length-1];
 return header('THE MORNING AFTER','翻到下一天','只有结束当天，才能收到外出成员的实际成果。没有任务时也可以处理电话，继续推进时间。')+
 '<div class="paper-grid"><div><div class="dialog-punch">DAY '+String(state.day).padStart(2,'0')+' → DAY '+String(state.day+1).padStart(2,'0')+'</div>'+
 '<div class="daily-calendar-record"><small>'+clockLabel(state.day,world.slices.clock.shift)+'</small><strong>'+arc.title+'</strong><p>'+ (episode?.title||'城市自由经营') +'</p>'+
 '<p>当日安排 '+progress.actionsToday+' / 2 · 街坊支持 '+progress.communityTrust+' · 可查证线索 '+progress.evidence+'</p>'+
 '<p>下一件事：'+(beat?beat.title+' · 在'+({office:'办公室',alley:'旧港背街',market:'清晨集市',labor:'旧厂就业所',docks:'旧港码头'}[beat.venue]||beat.venue)+'进行':'今天已无新的主线安排')+'</p>'+
 '<p>本阶段期限：DAY '+arc.end+'。未处理的事件不会让世界停止。</p></div><p>当前时段：'+SHIFTS[world.slices.clock.shift]+'</p><button type="button" class="choice" data-world-tab="clock">打开城市时钟</button>'+
 '<p>今天安排了 '+state.orders.length+' 项行动；电话'+(state.call.answered?'已经处理':'尚未处理')+'。翻页将结算收入、日常开支，以及街区关系变化。</p>'+
 '<button class="primary" type="button" data-next="1">翻过今天 · 听取明日汇报</button></div>'+
 '<div><div class="mini-title">成员今日状态</div>'+CREW.filter(c=>state.crew.includes(c.id)).map(c=>{
 const o=state.orders.find(o=>o.crew===c.id);
 return '<p class="map-hint">'+c.name+' · '+(o?zoneInfo(o.zone).name+' / '+MISSIONS.find(m=>m.id===o.mission).title:'留在办公室')+'</p>';
 }).join('')+'<hr class="line"/><p class="map-hint">自有办公室日常维护、水电和团队开支：'+fmt(35+state.crew.length*14)+'</p></div></div>';
}
function helpPanel(){
 return header('WELCOME / YOUR FIRST DAY','从零开始的首领','这不是管理表格。所有重要操作都藏在办公室里的物件上，你可以用鼠标或手机触摸它们。')+
 '<div class="paper-grid"><div><div class="report-card"><h3>地图</h3><p>点桌上的地图，选择小弟、目的地和行动，然后派出去。你能看到地图上绘出的派遣路线。</p></div>'+
 '<div class="report-card"><h3>电话</h3><p>每一天都有联系人打进电话。你选择回答方式，改变资金、风险或声望。</p></div>'+
 '<div class="report-card"><h3>报告与账本</h3><p>派出去的人第二天带回有结果的报告。账本记录真实的收支。</p></div></div><div>'+
 '<div class="report-card"><h3>日历</h3><p>翻到下一天结算任务。新成员需要从人才市场自愿面谈与正式招聘。</p></div>'+
 '<div class="report-card"><h3>旧枪</h3><p>是故事道具，不是攻击按钮；细节会逐步揭开。</p></div>'+
 '<div class="achievement">第一目标：至少两个城区影响力达到 55、现金 '+fmt(GOALS.cash)+'、声望 '+GOALS.respect+'。</div>'+
 '<button class="primary" type="button" data-help-close="1">回到办公室</button><div class="info-box"><b>新战役：</b>从零地盘、租房、只有兄弟阿凯重新开始。系统会先备份上一段进度。</div><div class="city-actions"><button class="choice" type="button" data-new-campaign="1">开始新战役（先备份）</button><button class="choice" type="button" data-restore-campaign="1">恢复上次战役备份</button></div></div></div>';
}
function repaintPanel(){
 if(!currentPanel)return;
 const html={
 map:mapPanel,phone:phonePanel,reports:reportsPanel,ledger:ledgerPanel,gun:gunPanel,calendar:calendarPanel,visitor:visitorPanel,help:helpPanel
 }[currentPanel]();
 $('panel-body').innerHTML=html;
 document.querySelector('.paper-panel').classList.toggle('mode-phone',currentPanel==='phone');
}
function applyResult(r,updatePanel=true){
 if(!r.ok){toast(r.message);return false;}
 state=r.state;meta=r.meta;refresh();
 if(currentPanel&&updatePanel)repaintPanel();
 toast(r.message);return true;
}
function activateOfficeObject(type){
 if(meta.venue==='street')return;
 if(type==='door'){
  if(meta.visitor){panel('visitor');return;}
  const r=openDoor(state,meta);
  if(applyResult(r,false)){
   if(r.visitor){
    clearTimeout(doorTimer);
    doorTimer=setTimeout(()=>{if(meta.visitor&&currentPanel===null)toast(crewInfo(meta.visitor.id).name+' 已到桌前，点击人物听取汇报');},850);
   }
  }
  return;
 }
 if(type==='visitor'){
  if(!meta.visitor){toast('目前没有来客，留意对面的门');return;}
  panel('visitor');return;
 }
 if(type==='reports')fileTab='dossiers';
 panel(type);
}
$('game').addEventListener('click',e=>{
 const spot=e.target.closest('[data-open]');
 if(spot){activateOfficeObject(spot.dataset.open);return;}
 const travelButton=e.target.closest('[data-travel]');
 if(travelButton){applyResult(travel(state,meta,travelButton.dataset.travel),false);return;}
});
$('open-reports').addEventListener('click',()=>{fileTab='reports';panel('reports');});
$('help-btn').addEventListener('click',()=>panel('help'));
$('close-panel').addEventListener('click',closePanel);
$('overlay').addEventListener('click',e=>{if(e.target===$('overlay'))closePanel();});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!$('overlay').hidden){closePanel();return;}
 if(e.key==='Enter'||e.key===' '){
  const object=e.target.closest?.('[data-open][role="button"]');
  if(object){e.preventDefault();activateOfficeObject(object.dataset.open);return;}
  const node=e.target.closest?.('[data-map-zone][role="button"]');
  if(node){e.preventDefault();plan.zone=node.dataset.mapZone;repaintPanel();}
 }
});
$('panel-body').addEventListener('click',e=>{
 const node=e.target.closest('button,[data-map-zone]');
 if(!node)return;
 if(node.dataset.mapCrew){plan.crew=node.dataset.mapCrew;repaintPanel();return;}
 if(node.dataset.mapZone){plan.zone=node.dataset.mapZone;repaintPanel();return;}
 if(node.dataset.mapMission){plan.mission=node.dataset.mapMission;repaintPanel();return;}
 if(node.dataset.assign){
  const r=setOrder(state,plan.crew,plan.zone,plan.mission);
  if(!r.ok){toast(r.message);return;}
  state=r.state;refresh();repaintPanel();toast(r.message);return;
 }
 if(node.dataset.phone){
  const r=answerPhone(state,node.dataset.phone);
  if(!r.ok){toast(r.message);return;}
  state=r.state;lastDial='来电处理完毕：'+r.message;refresh();repaintPanel();toast(r.message);return;
 }
 if(node.dataset.digit){dialBuffer=(dialBuffer+node.dataset.digit).slice(-3);repaintPanel();return;}
 if(node.dataset.dialpreset){dialBuffer=node.dataset.dialpreset;repaintPanel();return;}
 if(node.dataset.phoneclear){dialBuffer=dialBuffer.slice(0,-1);repaintPanel();return;}
 if(node.dataset.phonehang){dialBuffer='';lastDial='听筒已挂回。';repaintPanel();return;}
 if(node.dataset.callzone){callZone=node.dataset.callzone;repaintPanel();return;}
 if(node.dataset.dial){
  if(dialBuffer.length!==3){lastDial='请输入三位联系号码。';repaintPanel();return;}
  const r=dial(state,meta,dialBuffer,callZone);
  if(!r.ok){lastDial=r.message;repaintPanel();toast(r.message);return;}
  lastDial='已接通 '+r.contact.name+'：'+r.message;
  dialBuffer='';applyResult(r,true);return;
 }
 if(node.dataset.newCampaign){
  if(!window.confirm('确定开启全新战役？现有进度会先保留在本机旧存档备份中。'))return;
  try{localStorage.setItem('night-office-campaign-backup',JSON.stringify({state,meta,world}));}
  catch{toast('备份失败，已取消重开');return;}
  state=initialGame();meta=initialOffice();world=createWorld(state,null);
  fileTab='dossiers';plan={crew:'kai',zone:'harbor',mission:'deliver'};
  worldUI={cell:'s0',lot:'lot-1',person:'kai',talker:'kai',courier:'kai',target:'bell-lu',
    operation:'pressure',from:null,destination:'s1',source:'job',candidate:'mio',faction:'bell'};
  closePanel();refresh();explorer.show();stage.transition();
  toast('新战役：两个人的毛坯办公室；街头流传着匿名蒙面人的故事。');return;
 }
 if(node.dataset.restoreCampaign){
   let backup=null;try{backup=JSON.parse(localStorage.getItem('night-office-campaign-backup')||'null');}catch{}
   if(!backup?.state||!backup?.world){toast('没有找到可恢复的战役备份');return;}
   if(!window.confirm('恢复之前备份的战役，会覆盖当前进度，确定继续？'))return;
   state=restore(backup.state);meta=normalizeOffice(backup.meta,state);world=createWorld(state,backup.world);
   closePanel();refresh();stage.transition();toast('上次战役已恢复');return;
 }
 if(node.dataset.recruitSource){worldUI.source=node.dataset.recruitSource;worldUI.candidate=null;repaintPanel();return;}
 if(node.dataset.recruitPerson){worldUI.candidate=node.dataset.recruitPerson;repaintPanel();return;}
 if(node.dataset.politicsFaction){worldUI.faction=node.dataset.politicsFaction;repaintPanel();return;}
 if(node.dataset.recruitInterview){performWorldCommand({module:'recruitment',type:'interview',person:node.dataset.recruitInterview});return;}
 if(node.dataset.recruitSign){performWorldCommand({module:'recruitment',type:'recruit',person:node.dataset.recruitSign});return;}
 if(node.dataset.recruitDismiss){performWorldCommand({module:'recruitment',type:'dismiss',person:node.dataset.recruitDismiss});return;}
 if(node.dataset.aid){performWorldCommand({module:'society',type:'aid',action:node.dataset.aid});return;}
 if(node.dataset.voluntaryDues){performWorldCommand({module:'society',type:'dues'});return;}
 if(node.dataset.diplomacy){performWorldCommand({module:'politics',type:'offer',faction:worldUI.faction,offer:node.dataset.diplomacy});return;}
 if(node.dataset.protect){performWorldCommand({module:'politics',type:'protect',cell:node.dataset.protect});return;}
 if(node.dataset.cityLot){worldUI.lot=node.dataset.cityLot;repaintPanel();return;}
 if(node.dataset.cityOrigin){worldUI.from=node.dataset.cityOrigin;repaintPanel();return;}
 if(node.dataset.cityDestination){worldUI.destination=node.dataset.cityDestination;repaintPanel();return;}
 if(node.dataset.cityCourier){worldUI.courier=node.dataset.cityCourier;repaintPanel();return;}
 if(node.dataset.cityTarget){worldUI.target=node.dataset.cityTarget;repaintPanel();return;}
 if(node.dataset.cityOperation){worldUI.operation=node.dataset.cityOperation;repaintPanel();return;}
 if(node.dataset.cityNextshift){performWorldCommand({module:'clock',type:'advance-shift'});return;}
 if(node.dataset.cityBuy){performWorldCommand({module:'estates',type:'buy',lot:node.dataset.cityBuy});return;}
 if(node.dataset.cityBuild){performWorldCommand({module:'estates',type:'build',lot:node.dataset.cityBuild,building:node.dataset.cityBuilding});return;}
 if(node.dataset.cityUpgrade){performWorldCommand({module:'estates',type:'upgrade',lot:node.dataset.cityUpgrade});return;}
 if(node.dataset.cityMode){performWorldCommand({module:'estates',type:'operate',lot:node.dataset.cityMode,mode:node.dataset.mode});return;}
 if(node.dataset.cityDispatch){performWorldCommand({module:'transport',type:'dispatch',from:worldUI.from||world.slices.estates.parcels.find(p=>p.owner==='player'&&['garage','warehouse'].includes(p.building?.type))?.id,to:worldUI.destination,courier:worldUI.courier});return;}
 if(node.dataset.cityCommission){performWorldCommand({module:'operations',type:'commission',operation:worldUI.operation,agent:worldUI.courier,target:worldUI.target});return;}
 if(node.dataset.cityHire){performWorldCommand({module:'contacts',type:'hire',role:node.dataset.cityHire});return;}
 if(node.dataset.cityDismiss){performWorldCommand({module:'contacts',type:'dismiss',staff:node.dataset.cityDismiss});return;}
 if(node.dataset.cityIntel){performWorldCommand({module:'contacts',type:'ask-informant'});return;}
 if(node.dataset.cityBribe){performWorldCommand({module:'contacts',type:'bribe'});return;}
 if(node.dataset.cityCounsel){performWorldCommand({module:'justice',type:'counsel',caseId:node.dataset.cityCounsel});return;}
 if(node.dataset.worldBack){fileTab='dossiers';currentPanel='reports';repaintPanel();return;}
 if(node.dataset.worldTab){fileTab=node.dataset.worldTab;currentPanel='reports';repaintPanel();stage.cue('paper');return;}
 if(node.dataset.worldCell){worldUI.cell=node.dataset.worldCell;repaintPanel();return;}
 if(node.dataset.worldPerson){worldUI.person=node.dataset.worldPerson;repaintPanel();return;}
 if(node.dataset.worldTalk){worldUI.talker=node.dataset.worldTalk;repaintPanel();return;}
 if(node.dataset.worldInfluence){performWorldCommand({module:'factions',type:'influence',cell:node.dataset.worldInfluence});return;}
 if(node.dataset.worldAppoint){performWorldCommand({module:'people',type:'appoint',person:node.dataset.worldAppoint,job:node.dataset.job});return;}
 if(node.dataset.worldTrain){performWorldCommand({module:'people',type:'train',person:node.dataset.worldTrain,skill:node.dataset.skill});return;}
 if(node.dataset.worldDialogue){performWorldCommand({module:'dialogue',type:'choose',person:node.dataset.worldDialogue,node:'greet',choice:node.dataset.dialogueChoice});return;}
 if(node.dataset.filetab){fileTab=node.dataset.filetab;repaintPanel();return;}
 if(node.dataset.filedecision){
  applyResult(decideDossier(state,meta,node.dataset.case,node.dataset.filedecision));return;
 }
 if(node.dataset.crewvisit){
  applyResult(queueVisitor(state,meta,node.dataset.crewvisit));return;
 }
 if(node.dataset.budget){applyResult(allocate(state,meta,node.dataset.budget));return;}
 if(node.dataset.equip){applyResult(equip(state,meta,node.dataset.equip));return;}
 if(node.dataset.safe){applyResult(transferSafe(state,meta,Number(node.dataset.safe)));return;}
 if(node.dataset.visitact){
  const r=visitorAction(state,meta,node.dataset.visitact);
  if(applyResult(r,false))closePanel();
  return;
 }
 if(node.dataset.next){
  // A narrative day may end without a business mission or a telephone conversation.
  const spentStory=world.slices.campaign?.actionsToday>0;
  const dayInput=spentStory&&!state.call.answered&&!state.orders.length?
   {...state,call:{...state.call,answered:true}}:state;
  const r=advance(dayInput,meta);
  if(!r.ok){toast(r.message);return;}
  const sim=advanceWorld(world,dayInput,r.state);
  const settled=structuredClone(r.state);
  for(const effect of sim.effects){
    if(effect.kind==='cash'){
      settled.cash+=effect.amount;
      settled.ledger.unshift({day:settled.day,label:effect.label||'组织运营',amount:effect.amount});
    }else if(effect.kind==='heat')settled.heat=Math.max(0,Math.min(100,settled.heat+effect.amount));
  }
  settled.detained=[...new Set(sim.state.slices.justice.custody.map(x=>x.subject))];
  world=sim.state;state=settled;meta=r.meta;plan.crew=availableCrew(state)[0]||null;refresh();
  stage.transition();
  const morning=sim.events.find(x=>x.type==='campaign.morning'||x.type==='campaign.chapter');
  if(morning)stage.speak(morning.title,morning.text,'news');
  else if(sim.events.length)stage.speak('夜港消息',sim.events[0].text,'news');
  fileTab='reports';closePanel();toast(r.message);panel('reports');return;
 }
 if(node.dataset.helpClose){closePanel();}
});
const stage=createStage(document.querySelector('.scene'));
explorer=createExploreLayer(document.querySelector('.scene'),{
  readWorld:()=>world,
  readLegacy:()=>state,
  command:performWorldCommand,
  cue:(tone)=>stage.cue(tone),
  openPanel:(kind,tab)=>{
    if(tab){fileTab=tab;panel('reports');}
    else panel(kind);
  },
  onToggle:shown=>{
    const button=$('explore-toggle');if(button){
      button.setAttribute('aria-pressed',String(shown));
      button.textContent=shown?'旧桌面':'探索街区';
    }
  }
});
$('explore-toggle').addEventListener('click',()=>{
  if(explorer.isVisible())explorer.hide();else explorer.show();
});
refresh();
window.__OFFICE__={version:5,state:()=>structuredClone(state),meta:()=>structuredClone(meta),world:()=>structuredClone(world),worldCommand:performWorldCommand,exploration:explorer,open:panel,close:closePanel,
 dispatch:(type,...args)=>{
  const r=type==='assign'?setOrder(state,...args):type==='next'?advance(state,meta):type==='phone'?answerPhone(state,args[0]):
  type==='dial'?dial(state,meta,...args):type==='dossier'?decideDossier(state,meta,...args):type==='budget'?allocate(state,meta,args[0]):
  type==='door'?openDoor(state,meta):type==='visitor'?visitorAction(state,meta,args[0]):type==='travel'?travel(state,meta,args[0]):
  {ok:false,state,meta,message:'无效操作'};
  if(r.ok){state=r.state;meta=r.meta||meta;refresh();if(currentPanel)repaintPanel();}
  return r;
 }};
