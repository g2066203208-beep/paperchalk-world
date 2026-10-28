import {DISTRICTS,CONFIG,cashText,createGame,getDistrict,photoUrl,ownedCount,sitesCount,payroll,districtRevenue,weeklyFinance,actionInfo,act,eventInfo,resolveEvent,restore} from './engine.js';
const $=id=>document.getElementById(id);
const SAVE='night-harbor-empire-v3';
let state;
try{state=restore(localStorage.getItem(SAVE));}catch{state=createGame();}
let tab='street',dialogType=null,toastTimer;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const persist=()=>{try{localStorage.setItem(SAVE,JSON.stringify(state));}catch{}};
const rank=s=>{
 const owned=ownedCount(s);
 return owned>=5?'夜港掌舵人':owned>=3?'城区教父':owned>=1?'街区头目':s.crew>=3?'小有名气':'无名之辈';
};
function toast(msg){
 const el=$('toast');el.textContent=msg;el.classList.add('visible');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2500);
}
const actionsByTab={
 street:[
  {key:'hustle',eyebrow:'01 / STREET',title:'接街头委托',description:'赚取起步资金。会增加警方关注与竞争压力。',icon:'◈'},
  {key:'network',eyebrow:'02 / CONTACTS',title:'结识本地人',description:'花钱拜访商户，快速建立影响力和声望。',icon:'✧'},
  {key:'negotiate',eyebrow:'03 / INFLUENCE',title:'商谈合作',description:'改善与当地势力的关系，降低竞争压力。',icon:'⚜'},
  {key:'claim',eyebrow:'04 / TERRITORY',title:'确立街区控制',description:'影响力达到 65，且有足够的人手才能正式扩张。',icon:'✦'}
 ],
 business:[
  {key:'open',eyebrow:'01 / ESTABLISH',title:'开设产业',description:'投入资金，建立可以每周持续产生收入的事业。',icon:'◈'},
  {key:'upgrade',eyebrow:'02 / INVEST',title:'升级现有产业',description:'扩大经营规模，提高未来每周现金流。',icon:'↗'},
  {key:'community',eyebrow:'03 / NEIGHBORHOOD',title:'资助社区',description:'改善地区关系与团队忠诚，顺带降低关注。',icon:'✣'}
 ],
 crew:[
  {key:'recruit',eyebrow:'01 / CREW',title:'招募新伙伴',description:'人数越多，能经营与控制的地区越多；薪水也越高。',icon:'♧'},
  {key:'quiet',eyebrow:'02 / HEAT',title:'低调休整',description:'主动降低警方关注度，保持团队状态。',icon:'☾'},
  {key:'community',eyebrow:'03 / LOYALTY',title:'照顾街坊与团队',description:'维护人脉、忠诚与街头名声。',icon:'✣'}
 ]
};
function fill(id,value){$(id).style.width=Math.max(0,Math.min(100,value))+'%';}
function updatePhoto(d){
 const photo=$('district-photo');
 const newSrc=photoUrl(d,1250);
 if(photo.dataset.district!==d.id){
  photo.dataset.district=d.id;
  photo.src=newSrc;
  photo.alt=d.name+'夜景';
 }
}
function renderDistricts(){
 $('district-list').innerHTML=DISTRICTS.map((d,i)=>{
  const zone=state.zones[d.id],active=d.id===state.selected;
  return '<button type="button" class="district-card '+(active?'active':'')+'" data-district="'+d.id+
   '" aria-pressed="'+active+'" aria-label="查看'+d.name+'，影响力'+zone.influence+'，'+(zone.controlled?'已掌控':'未掌控')+'">'+
   '<img loading="lazy" alt="" src="'+photoUrl(d,480)+'" referrerpolicy="no-referrer">'+
   '<span class="district-label"><strong>'+d.name+'</strong><small>'+d.en+'</small></span>'+
   '<span class="district-mark">'+(zone.controlled?'★':String(i+1).padStart(2,'0'))+'</span></button>';
 }).join('');
}
function renderActions(){
 const d=getDistrict(state.selected),z=state.zones[d.id];
 const descriptions={
  street:'街区关系与势力变化 · 你可以自由决定先经营哪里',
  business:d.business+' / 当前等级 '+z.level+' · 预计每周 '+cashText(districtRevenue(state,d)),
  crew:'现有 '+state.crew+' 人 · 每周团队工资与固定开支 '+cashText(payroll(state))+' · 忠诚 '+state.loyalty
 };
 $('tab-hint').textContent=descriptions[tab];
 $('action-list').innerHTML=actionsByTab[tab].map((a,i)=>{
  const info=actionInfo(state,a.key);
  let title=a.title;
  if(a.key==='open')title='开设'+d.business;
  if(a.key==='upgrade')title='升级'+d.business;
  const price=info.cost===0?'自由行动':'费用 '+cashText(info.cost);
  return '<button type="button" class="action-card '+(!info.ok?'locked':'')+'" data-action="'+a.key+
   '" aria-disabled="'+(!info.ok)+'" title="'+(info.reason||a.description)+'">'+
   '<span class="action-symbol" aria-hidden="true">'+a.icon+'</span>'+
   '<span class="action-copy"><small>'+a.eyebrow+'</small><strong>'+title+'</strong><span>'+a.description+'</span></span>'+
   '<span class="action-end"><b>'+price+'</b><small>'+(!info.ok?esc(info.reason):'执行 ↗')+'</small></span></button>';
 }).join('');
}
function renderLedger(){
 const f=weeklyFinance(state);
 $('income').textContent='＋'+cashText(f.income);
 $('upkeep').textContent='－'+cashText(f.wages);
 $('penalty').textContent='－'+cashText(f.enforcement);
 $('net').textContent=(f.net>=0?'+':'－')+cashText(Math.abs(f.net));
 $('net').classList.toggle('negative',f.net<0);
 $('organization-count').textContent='地盘 '+ownedCount(state)+' / '+DISTRICTS.length;
 $('organization-sites').textContent='产业 '+sitesCount(state)+' / '+DISTRICTS.length;
 $('organization-loyalty').textContent='忠诚 '+state.loyalty;
 $('goal').textContent=state.won?'★ 成就：夜港掌舵人。你可以继续经营城市。':
 '目标：五个城区全部掌控 · 声望 '+CONFIG.goalRespect+' · 现金 '+cashText(CONFIG.goalCash);
 $('log').innerHTML=state.log.slice(0,3).map((e,i)=>'<div class="entry"><small>W'+String(e.week).padStart(2,'0')+
  ' · '+esc(e.title)+'</small><p>'+esc(e.body)+'</p></div>').join('');
}
function render(){
 const d=getDistrict(state.selected),z=state.zones[d.id];
 $('week').textContent=String(state.week).padStart(2,'0');
 $('rank').textContent=rank(state);
 $('money').textContent=cashText(state.cash);
 $('respect').textContent=String(state.respect).padStart(2,'0');
 $('heat').textContent=String(state.heat).padStart(2,'0');
 $('heat').classList.toggle('alert',state.heat>=65);
 $('crew').textContent=String(state.crew).padStart(2,'0');
 $('district-no').textContent='DISTRICT / '+String(DISTRICTS.indexOf(d)+1).padStart(2,'0');
 $('district-name').textContent=d.name;
 $('district-flavor').textContent=d.flavor;
 $('territory-status').textContent=z.controlled?'✦ 已纳入势力':'自由街区 · '+d.tag;
 $('territory-status').classList.toggle('controlled',z.controlled);
 $('influence').textContent=z.influence+' / 100';
 $('rival').textContent=z.rival+' / 100';
 $('local-income').textContent=cashText(districtRevenue(state,d));
 fill('influence-fill',z.influence);fill('rival-fill',z.rival);
 updatePhoto(d);renderDistricts();
 document.querySelectorAll('[data-tab]').forEach(el=>{
  const active=el.dataset.tab===tab;el.setAttribute('aria-selected',String(active));el.classList.toggle('active',active);
 });
 renderActions();renderLedger();
 $('next-week').disabled=!!state.event||state.bankrupt;
 persist();
 document.title='夜港 · 第 '+state.week+' 周 · '+d.name;
 if(state.event)showEvent();
 else if(dialogType==='event')closeDialog();
}
function dispatch(type){
 const r=act(state,type);
 if(!r.ok){toast(r.message);return;}
 state=r.state;toast(r.message);render();
}
function showDialog(meta,title,body,options,type){
 dialogType=type;
 $('dialog-meta').textContent=meta;$('dialog-title').textContent=title;$('dialog-text').textContent=body;
 $('dialog-options').innerHTML=options;
 $('veil').hidden=false;
}
function showEvent(){
 const e=eventInfo(state);
 if(!e)return;
 const content=['a','b'].map(choice=>{
  const v=e[choice],cant=state.cash<v.cost;
  return '<button type="button" data-event="'+choice+'" class="event-choice" '+(cant?'disabled':'')+'><strong>'+v.text+'</strong><small>'+
     (v.cost?'需要 '+cashText(v.cost):'无需费用')+(cant?' · 资金不足':'')+'</small></button>';
 }).join('');
 showDialog('WEEK '+state.week+' / CITY EVENT',e.title,e.text,content,'event');
}
function showHelp(){
 const body='你从 '+cashText(320)+' 和一个伙伴开始。选择右侧城区照片，街区事务帮助你积累资金与影响力；产业能产生每周持续收入；招募人手支持多区经营。点击「进入下一周」结算收入、工资和城市事件。\n\n每个街区影响力达到 65 后，招够人手并支付费用才能建立地盘。最终目标：掌控全部五区，声望至少 70，现金积累 '+cashText(CONFIG.goalCash)+'。没有行动点和回合上限，可长期经营；高关注度和激烈竞争会提高风险。\n\n所有进度自动保存在此设备。';
 showDialog('HOW TO PLAY / THE RULES','从一个人，到一座城',body,
 '<button type="button" class="event-choice close-choice" data-close="1"><strong>回到城市</strong></button>','help');
}
function closeDialog(){dialogType=null;$('veil').hidden=true;}
$('game').addEventListener('click',e=>{
 const node=e.target.closest('button');
 if(!node)return;
 if(node.dataset.district){
  state={...state,selected:node.dataset.district};render();return;
 }
 if(node.dataset.tab){tab=node.dataset.tab;render();return;}
 if(node.dataset.action){dispatch(node.dataset.action);return;}
 if(node.dataset.event){
  const r=resolveEvent(state,node.dataset.event);
  if(!r.ok){toast(r.message);return;}
  state=r.state;closeDialog();toast(r.message);render();return;
 }
 if(node.dataset.close){closeDialog();return;}
});
$('next-week').addEventListener('click',()=>dispatch('next'));
$('help').addEventListener('click',()=>{if(state.event){showEvent();toast('请先处理本周的城市事件');}else showHelp();});
$('reset').addEventListener('click',()=>{
 if(confirm('重新开始夜港？这将清除当前存档。')){
  state=createGame();tab='street';closeDialog();render();toast('从码头重新起步。');
 }
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&dialogType==='help')closeDialog();
 if(e.altKey||e.metaKey||e.ctrlKey||dialogType)return;
 if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
  const index=DISTRICTS.findIndex(d=>d.id===state.selected);
  const next=Math.max(0,Math.min(DISTRICTS.length-1,index+(e.key==='ArrowRight'?1:-1)));
  if(next!==index){state.selected=DISTRICTS[next].id;render();e.preventDefault();}
 }
});
render();
window.__HARBOR__={state:()=>structuredClone(state),act:dispatch,select:id=>{if(getDistrict(id)){state.selected=id;render();}},next:()=>dispatch('next'),version:3};
