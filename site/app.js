import {LOCATIONS,ENEMY,MAX_AP,MAX_DEPTH,LANE_COUNT,createGame,perform,restoreGame,canMove,currentEnemies,effectiveDistance} from './rules.js';
import {projectCard} from './board.js';
import {ART} from './art.js';
import {environmentImage} from './environment.js';

const SAVE_KEY='night-remains-save-v2';
const $=id=>document.getElementById(id);
const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state;
try{state=restoreGame(localStorage.getItem(SAVE_KEY));}catch{state=createGame();}
let noticeTimer,boardLocation=null;
const cardNodes=new Map();

function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{}}
function toast(message){
  const el=$('toast');el.textContent=message;el.classList.add('visible');
  clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>el.classList.remove('visible'),2300);
}
function makeStand(enemy){
  const el=document.createElement('button');
  el.type='button';
  el.className='stand-card '+enemy.side;
  el.dataset.action='select';
  el.dataset.id=enemy.id;
  el.innerHTML='<span class="stand-shadow" aria-hidden="true"></span>'
  +'<span class="stand-face"><span class="stand-top"><b class="stand-side"></b><strong class="stand-distance"></strong></span>'
  +'<img draggable="false" class="stand-art" alt="" src="'+ART.enemy(enemy.type)+'">'
  +'<span class="stand-bottom"><b class="stand-name"></b><strong class="stand-hp"></strong></span></span>'
  +'<span class="stand-foot" aria-hidden="true"></span>';
  return el;
}
function renderBoard(){
  const root=$('enemy-lanes'),board=$('board');
  const bounds=board.getBoundingClientRect();
  if(bounds.width<1||bounds.height<1)return;
  if(boardLocation!==state.current){
    root.replaceChildren();cardNodes.clear();boardLocation=state.current;
  }
  const living=new Set();
  for(const enemy of currentEnemies(state)){
    living.add(enemy.id);
    let el=cardNodes.get(enemy.id);
    if(!el){
      el=makeStand(enemy);cardNodes.set(enemy.id,el);root.append(el);
    }
    const p=projectCard(enemy,bounds.width,bounds.height,state.advance);
    el.style.left=p.xPercent+'%';
    el.style.top=p.yPercent+'%';
    el.style.width=p.cardWidth+'px';
    el.style.height=p.cardHeight+'px';
    el.style.zIndex=p.zIndex;
    el.dataset.depth=String(enemy.depth);
    el.dataset.effective=String(p.effective);
    el.dataset.lane=String(enemy.lane);
    el.dataset.side=enemy.side;
    el.style.setProperty('--card-shadow-size', Math.round(p.cardWidth*.74)+'px');
    el.classList.toggle('selected',state.selected===enemy.id);
    el.classList.toggle('rear',enemy.side==='rear');
    el.classList.toggle('front',enemy.side==='front');
    el.setAttribute('aria-pressed',String(state.selected===enemy.id));
    el.setAttribute('aria-label',ENEMY[enemy.type].name+'，'+(enemy.side==='rear'?'后方':'前方')+
      '第'+(enemy.lane+1)+'道，距离'+p.effective+'，生命'+enemy.hp+'，点击瞄准');
    el.querySelector('.stand-side').textContent=enemy.side==='rear'?'REAR / 背后':'FRONT';
    el.querySelector('.stand-distance').textContent='D '+p.effective;
    el.querySelector('.stand-name').textContent=ENEMY[enemy.type].name;
    el.querySelector('.stand-hp').textContent='♥ '+enemy.hp;
  }
  for(const [id,el] of cardNodes)if(!living.has(id)){el.remove();cardNodes.delete(id);}
  $('player-marker').style.left=(50+(state.lane-2)*19.8)+'%';
  $('player-marker').style.top=(90-state.advance*9)+'%';
  $('player-marker').setAttribute('aria-label','你在第'+(state.lane+1)+'条道路，前进深度'+state.advance);
  $('board').dataset.current=state.current;
}
function handHTML(){
  const active=state.status==='playing'&&state.ap>0;
  const enemies=state.enemies[state.current];
  const sameLane=enemies.some(e=>e.lane===state.lane);
  const cards=[
    {kind:'rifle',label:'步枪',stat:state.mag+'/'+state.magCap,action:'shoot',sub:state.advance===2?'正面伤害 3':'伤害 2 · 同道路',enabled:active&&state.mag>0&&sameLane&&!!state.selected,cost:'1 AP'},
    {kind:'pack',label:'背包 / 换弹',stat:'+'+state.reserve,action:'reload',sub:'补满弹匣',enabled:active&&state.mag<state.magCap&&state.reserve>0,cost:'1 AP'},
    {kind:'medkit',label:'医疗包',stat:'×'+state.medkits,action:'heal',sub:'恢复 5 HP',enabled:active&&state.medkits>0&&state.hp<state.maxHp,cost:'1 AP'},
    {kind:'flare',label:'照明弹',stat:'×'+state.flares,action:'flare',sub:'当前道路击退 2 格',enabled:active&&state.flares>0&&sameLane,cost:'1 AP'}
  ];
  return cards.map(c=>'<button type="button" class="paper-card '+(c.kind==='player'?'player-card':'')+'" data-action="'+c.action+'" '+(!c.enabled?'disabled':'')+' aria-label="'+c.label+' '+c.sub+'">'
    +'<div class="card-top"><span>'+c.label+'</span><b>'+c.stat+'</b></div>'
    +'<img class="card-illustration" draggable="false" alt="" src="'+ART.item(c.kind)+'">'
    +'<div class="card-bottom"><span>'+c.sub+'</span><span class="cost">'+c.cost+'</span></div></button>').join('');
}
function locationHTML(loc){
  const now=state.current===loc.id,reachable=canMove(state.current,loc.id),count=state.enemies[loc.id].length;
  const status=now?'当前位置':count===0?'已肃清':reachable?'可移动':'需经教堂';
  return '<button type="button" class="location-card '+(now?'active':reachable?'reachable':'inaccessible')+
    '" data-action="move" data-to="'+loc.id+'" aria-pressed="'+now+'" '+(now?'disabled':'')+
    ' aria-label="'+loc.name+'，'+status+'，敌人 '+count+'">'+
    '<div class="location-caption"><span>'+loc.name+'</span><small>'+loc.en+'</small></div>'+
    '<img draggable="false" alt="" src="'+ART.scene(loc.id)+'">'+
    '<div class="location-state"><span>'+status+'</span><b>'+count+' 敌人</b></div></button>';
}
function render(){
  const loc=LOCATIONS.find(l=>l.id===state.current), enemies=currentEnemies(state);
  $('turn').textContent=String(state.turn).padStart(2,'0');
  $('ap').textContent=state.ap+' / '+MAX_AP;
  $('ammo').innerHTML=state.mag+' / '+state.magCap+' <em>+'+state.reserve+'</em>';
  $('health').innerHTML=Array.from({length:state.maxHp},(_,i)=>'<i class="'+(i>=state.hp?'empty':'')+'"></i>').join('');
  $('health').setAttribute('aria-label','生命 '+state.hp+'/'+state.maxHp);
  $('remaining').textContent=String(LOCATIONS.reduce((sum,l)=>sum+state.enemies[l.id].length,0)).padStart(2,'0');
  $('map-progress').innerHTML=LOCATIONS.map(l=>'<div class="progress-item '+(state.enemies[l.id].length===0?'done':'')+'"><span>'+
    l.name+'</span><b>'+(state.enemies[l.id].length===0?'✓':'×'+state.enemies[l.id].length)+'</b></div>').join('');
  $('log').innerHTML=state.log.slice(0,6).map(t=>'<p>'+escapeText(t)+'</p>').join('');
  $('field-name').textContent=loc.name;
  $('field-hint').textContent=loc.hint;
  $('scene-image').style.backgroundImage='url("'+environmentImage(loc.id)+'")';
  $('scene-image').dataset.location=loc.id;
  $('field-threat').innerHTML=String(enemies.length).padStart(2,'0')+' <span>ENEMIES</span>';
  $('locations').innerHTML=LOCATIONS.map(locationHTML).join('');
  $('hand').innerHTML=handHTML();
  $('lane-selector').innerHTML=Array.from({length:LANE_COUNT},(_,i)=>{
    const count=enemies.filter(e=>e.lane===i).length;
    return '<button type="button" data-action="lane" data-lane="'+i+'" '+(state.status!=='playing'||state.ap===0||state.lane===i?'disabled':'')+
      ' class="lane-button '+(state.lane===i?'active':'')+'" aria-pressed="'+(state.lane===i)+'" aria-label="第'+(i+1)+'道路，'+count+'个敌人">'+
      '<span class="lane-numeral">'+(i+1)+'</span><span class="lane-threat">'+(count||'')+'</span></button>';
  }).join('');
  $('forward-btn').disabled=state.status!=='playing'||state.ap===0||state.advance>=2;
  $('retreat-btn').disabled=state.status!=='playing'||state.ap===0||state.advance<=0;
  $('player-status').textContent='第 '+(state.lane+1)+' 道 · '+(['后线','中线','前线'][state.advance]);
  const chosen=enemies.find(e=>e.id===state.selected);
  $('target-status').textContent=chosen?ENEMY[chosen.type].name+' · '+(chosen.side==='rear'?'背后':'正面')+'第'+(chosen.lane+1)+'道 · 距离'+effectiveDistance(state,chosen)
    :enemies.length?'点立式卡牌瞄准，再切换到对应道路':'当前场地安全，去其他场地探索';
  $('guidance').textContent=state.status==='won'?'三个场地已经肃清 · 胜利':state.status==='lost'?'防线已被突破 · 失败':
    !state.ap?'行动点已用尽，请结束回合':enemies.some(e=>e.side==='rear')?'留意背后红色标记！改变前后站位可防包抄':'五条道路独立防守；近排会挡住同路远排';
  const end=$('end-btn');
  end.innerHTML=state.status==='playing'?'<span class="bell-icon" aria-hidden="true">♢</span><span class="bell-label">敲钟<br><small>结束回合</small></span>':'<span class="bell-icon" aria-hidden="true">↻</span><span class="bell-label">重新<br><small>开始</small></span>';
  end.dataset.action=state.status==='playing'?'end':'restart';
  end.setAttribute('aria-label',state.status==='playing'?'敲钟结束回合':'重新开始');
  renderBoard();persist();
  document.title='余烬之夜 · 五道桌面战场 · '+loc.name;
}
function dispatch(action){
  const result=perform(state,action);
  if(!result.ok){toast(result.message);return false;}
  state=result.state;
  render();
  if(action.type!=='select')toast(result.message);
  if(state.status==='won')toast('胜利！三个场地已肃清');
  if(state.status==='lost')toast('生命耗尽，游戏结束');
  return true;
}
$('game').addEventListener('click',event=>{
  const el=event.target.closest('[data-action]');
  if(!el||el.disabled)return;
  const type=el.dataset.action;
  if(type==='none')return;
  dispatch({type,id:el.dataset.id,to:el.dataset.to,lane:el.dataset.lane});
});
$('reset-btn').addEventListener('click',()=>{
  if(confirm('重新开始？当前对局进度将被覆盖。'))dispatch({type:'restart'});
});
const overlay=$('help-overlay');
function closeHelp(){overlay.hidden=true;}
$('help-btn').addEventListener('click',()=>{overlay.hidden=false;$('close-help').focus();});
$('close-help').addEventListener('click',closeHelp);
$('help-ok').addEventListener('click',closeHelp);
overlay.addEventListener('click',e=>{if(e.target===overlay)closeHelp();});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!overlay.hidden){closeHelp();return;}
  if(!overlay.hidden||e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){
    const options=LOCATIONS.filter(l=>canMove(state.current,l.id));
    if(options.length){dispatch({type:'move',to:options[e.key==='ArrowUp'?0:options.length-1].id});}
    e.preventDefault();
  }else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
    const next=state.lane+(e.key==='ArrowLeft'?-1:1);
    if(next>=0&&next<LANE_COUNT)dispatch({type:'lane',lane:next});
    e.preventDefault();
  }else if(e.key===' '&&e.target.tagName!=='BUTTON'){dispatch({type:'end'});e.preventDefault();}
});
new ResizeObserver(()=>renderBoard()).observe($('board'));
render();
window.__NIGHT_REMAINS__={state:()=>structuredClone(state),dispatch,version:2,projectCard};
