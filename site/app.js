import {DISTRICTS,CREW,MISSIONS,GOALS,initialGame,restore,availableCrew,crewInfo,zoneInfo,canOrder,setOrder,endDay,phoneDetails,answerPhone,markGunSeen} from './engine.js';
const $=id=>document.getElementById(id);
const STORE='night-office-game-v4';
const escapeHTML=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let state;try{state=restore(localStorage.getItem(STORE));}catch{state=initialGame();}
let currentPanel=null,focusBefore=null,timer;
let plan={crew:'kai',zone:'harbor',mission:'deliver'};
const fmt=n=>'＄'+n.toLocaleString('en-US');
function save(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch{}}
function toast(message){const n=$('toast');n.textContent=message;n.classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>n.classList.remove('visible'),2600);}
function refresh(){
 $('day').textContent=String(state.day).padStart(2,'0');
 $('ribbon-day').textContent=String(state.day).padStart(3,'0');
 $('cash').textContent=fmt(state.cash);
 $('heat').textContent=String(state.heat).padStart(2,'0');
 $('respect').textContent=String(state.respect).padStart(2,'0');
 const recent=state.reports[0];
 $('speaker').textContent=(crewInfo(recent?.crew)?.name||'办公室')+' · 最新汇报';
 $('briefing-text').textContent=recent?.body||'地图已放好。';
 $('goal-marker').textContent=state.won?'◆ 城市开始承认你的名字':'目标 · 两区影响力 55 / 声望 24 / 现金 1400';
 document.title='夜港 · 首领办公室 · DAY '+state.day;
 save();
}
const header=(eyebrow,title,sub='')=>'<div class="eyebrow">'+escapeHTML(eyebrow)+'</div><h2 id="panel-title">'+escapeHTML(title)+'</h2>'+(sub?'<p>'+escapeHTML(sub)+'</p>':'');
function panel(type){
 currentPanel=type;
 focusBefore=document.activeElement;
 $('overlay').hidden=false;
 $('panel-kicker').textContent=({'map':'CITY STRATEGY / 004','phone':'INCOMING CALL / PRIVATE','reports':'REPORTS / CONFIDENTIAL','ledger':'FINANCIAL RECORDS','gun':'PERSONAL EFFECTS / 001','calendar':'THE NEXT DAY / 001','help':'HOW TO PLAY'})[type]||'OFFICE FILE';
 repaintPanel();
 $('close-panel').focus();
}
function closePanel(){currentPanel=null;$('overlay').hidden=true;focusBefore?.focus?.();}
const mapSVG=()=>{
 const p=zoneInfo(plan.zone),route=plan.zone?'<path class="route-path" d="M350 245L'+p.x+' '+p.y+'"/>':'';
 const nodes=DISTRICTS.map(d=>{
 const z=state.zones[d.id],active=plan.zone===d.id;
 return '<g tabindex="0" role="button" aria-label="'+d.name+'，影响力'+z.influence+'" data-map-zone="'+d.id+'" class="city-node '+(active?'active':'')+'">'+
  '<circle class="node-circle" cx="'+d.x+'" cy="'+d.y+'" r="18" fill="'+d.color+'"/>'+
  '<text x="'+(d.x+26)+'" y="'+(d.y+6)+'">'+d.name+'</text>'+
  '<text x="'+(d.x+26)+'" y="'+(d.y+24)+'" font-size="11">影响 '+z.influence+'</text></g>';
 }).join('');
 return '<svg class="city-map" viewBox="0 0 700 470" role="img" aria-label="可操作的四区平面街道地图，可选择任务目的地">'+
 '<rect width="700" height="470" fill="#e1d2b5"/>'+
 '<path d="M0 78L704 34V128L0 178Z" fill="#d1c29e"/><path d="M0 336L700 292V390L0 447Z" fill="#cca798"/>'+
 '<path d="M98 0L186 0L342 470L262 470Z" fill="#c5b08e"/>'+
 '<path d="M480 0L538 0L443 470L389 470Z" fill="#b7b8a8"/>'+
 '<g fill="#b6a080" opacity=".85"><path d="M45 30H150V101H45Z"/><path d="M249 49H320V117H249Z"/><path d="M410 64H485V126H410Z"/><path d="M550 163H659V244H550Z"/><path d="M82 335H160V424H82Z"/><path d="M513 367H635V425H513Z"/></g>'+
 '<path class="map-road-border" d="M75 236L642 236"/><path class="map-road" d="M75 236L642 236"/>'+
 '<path class="map-road-border" d="M346 41L346 445"/><path class="map-road" d="M346 41L346 445"/>'+
 '<path class="map-road-border" d="M115 393L572 83"/><path class="map-road" d="M115 393L572 83"/>'+
 route+'<circle cx="350" cy="245" r="26" fill="#1d2d3a" stroke="#f7e5c8" stroke-width="6"/>'+
 '<text x="331" y="250" fill="#fff0d2" font-size="12" font-weight="900">HQ</text>'+
 '<text x="16" y="24" fill="#243340" font-size="16" font-weight="900">NIGHT HARBOR · STREET ATLAS</text>'+
 nodes+'</svg>';
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
 '<div class="paper-grid"><div><div class="map-shell">'+mapSVG()+'</div><p class="map-hint">点击地图上的城区圆点选择路线终点 · 总部 HQ 是固定出发点</p>'+
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
 const d=phoneDetails(state);
 return header('HOTLINE / TELEPHONE',state.call.answered?'通话记录':'电话正在响……','今天的电话会影响你的资金、关系和风险。每次通话只能回复一次。')+
 '<div class="paper-grid"><div><div class="dialog-punch">☎ &nbsp; '+escapeHTML(d.from)+'<br/><br/>'+escapeHTML(d.text)+'</div>'+
 '<div class="mini-title">最近通话</div>'+(state.callHistory.length?state.callHistory.slice(0,5).map(c=>'<p class="map-hint">DAY '+c.day+' · '+escapeHTML(c.from)+' · '+escapeHTML(c.answer)+'</p>').join(''):'<p class="map-hint">还没有通话历史。</p>')+'</div>'+
 '<div><div class="mini-title">你的回应</div><div class="phone-lines">'+(state.call.answered?'<div class="info-box">今天的电话已经接听完毕。新的一天会带来新的消息。</div>':
 d.options.map(o=>'<button type="button" class="choice" data-phone="'+o.id+'"><strong>'+o.name+'</strong><small>'+o.description+'</small></button>').join(''))+'</div></div></div>';
}
function reportsPanel(){
 return header('PERSONAL REPORTS','小弟汇报','每份报告都对应真实派遣的结算结果。看完报告，再调整下一天的行动。')+
 '<div class="paper-grid"><div>'+(state.reports.length?state.reports.map(r=>'<article class="report-card"><small>DAY '+String(r.day).padStart(2,'0')+' / '+(crewInfo(r.crew)?.name||'来访者')+'</small><h3>'+escapeHTML(r.title)+'</h3><p>'+escapeHTML(r.body)+'</p><span class="outcome">'+escapeHTML(r.outcome)+'</span></article>').join(''):'<p>暂无报告</p>')+'</div>'+
 '<div><div class="mini-title">人员档案 / CREW</div>'+CREW.filter(c=>state.crew.includes(c.id)).map(c=>'<div class="report-card"><span class="paper-chip">NO. '+c.id.toUpperCase()+'</span><h3>'+c.name+'</h3><p>'+c.role+'｜'+c.trait+'</p><small>'+(availableCrew(state).includes(c.id)?'今天尚未安排任务':'已在外执行任务')+'</small></div>').join('')+
 '<p class="map-hint">有新汇报时，桌边人物会自动念出摘要。</p></div></div>';
}
function ledgerPanel(){
 const delta=state.ledger.reduce((sum,e)=>sum+e.amount,0);
 return header('CASH & EXPENDITURE','办公室账本','账本的每一笔资金变化来自电话决策、行动安排或成员归来，不是凭空增加的数字。')+
 '<div class="paper-grid"><div><table class="account"><thead><tr><th>日期</th><th>事项</th><th>金额</th></tr></thead><tbody>'+
 state.ledger.map(l=>'<tr><td>DAY '+l.day+'</td><td>'+escapeHTML(l.label)+'</td><td class="'+(l.amount<0?'negative':'')+'">'+(l.amount>0?'+':'')+fmt(l.amount)+'</td></tr>').join('')+
 '</tbody></table></div><div><div class="mini-title">办公室财务状况</div><h2>'+fmt(state.cash)+'</h2>'+
 '<div class="info-box"><b>当前团队：</b>'+state.crew.length+' 人<br/><b>累计记录：</b>'+state.ledger.length+' 笔<br/><b>净资产变动：</b>'+fmt(delta)+'</div>'+
 '<div class="mini-title">势力目标</div><p>至少两个城区影响力达到 55，声望达到 '+GOALS.respect+'，现金达到 '+fmt(GOALS.cash)+'。</p>'+
 (state.won?'<div class="achievement">★ 你已经在这座城站稳脚跟。</div>':'')+'</div></div>';
}
function gunPanel(){
 return header('PERSONAL EFFECTS','刻着旧誓言的枪','它静静躺在桌上，并不是战斗按钮，而是关于这间办公室上一任主人的物件。')+
 '<div class="paper-grid"><div><div class="dialog-punch">NO KINGS.<br/><br/>握把的刻字已经磨损。前任主人没留下名字，只留下一句奇怪的警告。</div>'+
 '<p>屋内所有人都知道：你的组织最终能否立足，取决于信任、经营和决策，而不只是武器。</p></div><div>'+
 '<div class="mini-title">个人物件调查</div><div class="info-box"><b>状态：</b>'+(state.flags.gunSeen?'已经查看':'尚未查看')+'</div>'+
 '<button type="button" class="primary" data-gun="1" '+(state.flags.gunSeen?'disabled':'')+'>检查刻字</button></div></div>';
}
function calendarPanel(){
 return header('THE MORNING AFTER','翻到下一天','只有结束当天，才能收到外出成员的实际成果。没有任务时也可以处理电话，继续推进时间。')+
 '<div class="paper-grid"><div><div class="dialog-punch">DAY '+String(state.day).padStart(2,'0')+' → DAY '+String(state.day+1).padStart(2,'0')+'</div>'+
 '<p>今天安排了 '+state.orders.length+' 项行动；电话'+(state.call.answered?'已经处理':'尚未处理')+'。翻页将结算收入、日常开支，以及街区关系变化。</p>'+
 '<button class="primary" type="button" data-next="1">翻过今天 · 听取明日汇报</button></div>'+
 '<div><div class="mini-title">成员今日状态</div>'+CREW.filter(c=>state.crew.includes(c.id)).map(c=>{
 const o=state.orders.find(o=>o.crew===c.id);
 return '<p class="map-hint">'+c.name+' · '+(o?zoneInfo(o.zone).name+' / '+MISSIONS.find(m=>m.id===o.mission).title:'留在办公室')+'</p>';
 }).join('')+'<hr class="line"/><p class="map-hint">日常办公室租金和团队开支：'+fmt(35+state.crew.length*14)+'</p></div></div>';
}
function helpPanel(){
 return header('WELCOME / YOUR FIRST DAY','从零开始的首领','这不是管理表格。所有重要操作都藏在办公室里的物件上，你可以用鼠标或手机触摸它们。')+
 '<div class="paper-grid"><div><div class="report-card"><h3>地图</h3><p>点桌上的地图，选择小弟、目的地和行动，然后派出去。你能看到地图上绘出的派遣路线。</p></div>'+
 '<div class="report-card"><h3>电话</h3><p>每一天都有联系人打进电话。你选择回答方式，改变资金、风险或声望。</p></div>'+
 '<div class="report-card"><h3>报告与账本</h3><p>派出去的人第二天带回有结果的报告。账本记录真实的收支。</p></div></div><div>'+
 '<div class="report-card"><h3>日历</h3><p>翻到下一天结算任务。第三天会有新成员加入。</p></div>'+
 '<div class="report-card"><h3>旧枪</h3><p>是故事道具，不是攻击按钮；细节会逐步揭开。</p></div>'+
 '<div class="achievement">第一目标：至少两个城区影响力达到 55、现金 '+fmt(GOALS.cash)+'、声望 '+GOALS.respect+'。</div>'+
 '<button class="primary" type="button" data-help-close="1">回到办公室</button></div></div>';
}
function repaintPanel(){
 if(!currentPanel)return;
 const html={
 map:mapPanel,phone:phonePanel,reports:reportsPanel,ledger:ledgerPanel,gun:gunPanel,calendar:calendarPanel,help:helpPanel
 }[currentPanel]();
 $('panel-body').innerHTML=html;
}
document.getElementById('game').addEventListener('click',e=>{
 const trigger=e.target.closest('button[data-open]');
 if(trigger)panel(trigger.dataset.open);
});
$('open-reports').addEventListener('click',()=>panel('reports'));
$('help-btn').addEventListener('click',()=>panel('help'));
$('close-panel').addEventListener('click',closePanel);
$('overlay').addEventListener('click',e=>{if(e.target===$('overlay'))closePanel();});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!$('overlay').hidden){closePanel();return;}
 if(!$('overlay').hidden&&(e.key==='Enter'||e.key===' ')){
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
  state=r.state;refresh();repaintPanel();toast(r.message);return;
 }
 if(node.dataset.gun){
  const r=markGunSeen(state);state=r.state;refresh();repaintPanel();toast(r.message);return;
 }
 if(node.dataset.next){
  const r=endDay(state);
  if(!r.ok){toast(r.message);return;}
  state=r.state;plan.crew=availableCrew(state)[0]||null;refresh();closePanel();
  toast(r.message);panel('reports');return;
 }
 if(node.dataset.helpClose){closePanel();}
});
refresh();
window.__OFFICE__={version:4,state:()=>structuredClone(state),open:panel,close:closePanel,
 dispatch:(type,...args)=>{
  const r=type==='assign'?setOrder(state,...args):type==='next'?endDay(state):type==='phone'?answerPhone(state,args[0]):{ok:false,state,message:'无效操作'};
  if(r.ok){state=r.state;refresh();if(currentPanel)repaintPanel();}
  return r;
 }};
