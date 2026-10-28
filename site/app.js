import {LOCATIONS, ENEMY, MAX_AP, createGame, perform, restoreGame, allCleared, canMove, currentEnemies} from './rules.js';
import {ART} from './art.js';
const KEY='night-remains-save-v1';
const byId=(id)=>document.getElementById(id);
const escapeHtml=(text)=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state;
try {state=restoreGame(localStorage.getItem(KEY));}catch {state=createGame();}
let noticeTimer=null;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
function toast(text){
  const el=byId('toast');el.textContent=text;el.classList.add('visible');
  if(noticeTimer!==null)clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>el.classList.remove('visible'),2400);
}
function enemyHTML(enemy,index){
  const d=ENEMY[enemy.type];const sel=state.selected===enemy.id;
  return '<div class="enemy-slot"><button type="button" class="enemy-card distance-'+enemy.distance+(sel?' selected':'')+'" data-action="select" data-id="'+enemy.id+'" aria-pressed="'+sel+'" aria-label="瞄准 '+d.name+'，距离 '+enemy.distance+'，生命 '+enemy.hp+'">'
    +'<header><span>DIST '+enemy.distance+'</span><b>'+enemy.distance+'</b></header>'
    +'<img draggable="false" alt="'+d.name+'" src="'+ART.enemy(enemy.type)+'">'
    +'<footer><span>'+d.en+'</span><strong>♥ '+enemy.hp+'</strong></footer>'
    +'</button></div>';
}
function handHTML(){
  const hasEnemy=(state.enemies[state.current].length>0);
  const canAct=state.status==='playing'&&state.ap>0;
  const cards=[
    {kind:'player',label:'幸存者',stat:state.hp+'/'+state.maxHp,action:'none',desc:'PLAYER',sub:'生命',enabled:false,cost:'—'},
    {kind:'rifle',label:'步枪',stat:state.mag+'/'+state.magCap,action:'shoot',desc:'RIFLE',sub:'伤害 2 · 射程 3',enabled:canAct&&state.mag>0&&hasEnemy,cost:'1 AP'},
    {kind:'pack',label:'背包 / 换弹',stat:'+'+state.reserve,action:'reload',desc:'BACKPACK',sub:'补满弹匣',enabled:canAct&&state.mag<state.magCap&&state.reserve>0,cost:'1 AP'},
    {kind:'medkit',label:'医疗包',stat:'×'+state.medkits,action:'heal',desc:'MEDKIT',sub:'回复 3 HP',enabled:canAct&&state.medkits>0&&state.hp<state.maxHp,cost:'1 AP'},
    {kind:'flare',label:'照明弹',stat:'×'+state.flares,action:'flare',desc:'FLARE',sub:'全场敌人后退',enabled:canAct&&state.flares>0&&hasEnemy,cost:'1 AP'}
  ];
  return cards.map(c=>'<button class="paper-card '+(c.kind==='player'?'player-card':'')+'" type="button" data-action="'+c.action+'" '+(!c.enabled?'disabled':'')+' aria-label="'+c.label+' '+c.sub+'">'
    +'<div class="card-top"><span>'+c.label+'</span><b>'+c.stat+'</b></div>'
    +'<img draggable="false" class="card-illustration" alt="" src="'+ART.item(c.kind)+'">'
    +'<div class="card-bottom"><span>'+c.sub+'</span><span class="cost">'+c.cost+'</span></div></button>').join('');
}
function locationHTML(loc){
  const now=state.current===loc.id;
  const accessible=canMove(state.current,loc.id);
  const count=state.enemies[loc.id].length;
  let status=now?'当前位置':count===0?'已肃清':accessible?'可移动':'需经教堂';
  return '<button type="button" class="location-card '+(now?'active':accessible?'reachable':'inaccessible')+'" data-action="move" data-to="'+loc.id+'" aria-pressed="'+now+'" '+(now?'disabled':'')+' aria-label="'+loc.name+'，'+status+'，敌人 '+count+'">'
  +'<div class="location-caption"><span>'+loc.name+'</span><small>'+loc.en+'</small></div>'
  +'<img alt="" draggable="false" src="'+ART.scene(loc.id)+'">'
  +'<div class="location-state"><span>'+status+'</span><b>'+String(count).padStart(2,'0')+' 敌人</b></div>'
  +'</button>';
}
function render(){
  const loc=LOCATIONS.find(l=>l.id===state.current);
  byId('turn').textContent=String(state.turn).padStart(2,'0');
  byId('ap').textContent=state.ap+' / '+MAX_AP;
  byId('ammo').innerHTML=state.mag+' / '+state.magCap+' <em>+'+state.reserve+'</em>';
  byId('health').innerHTML=Array.from({length:state.maxHp},(_,i)=>'<i class="'+(i>=state.hp?'empty':'')+'"></i>').join('');
  byId('health').setAttribute('aria-label','生命 '+state.hp+'/'+state.maxHp);
  byId('remaining').textContent=String(LOCATIONS.reduce((a,l)=>a+state.enemies[l.id].length,0)).padStart(2,'0');
  byId('map-progress').innerHTML=LOCATIONS.map(l=>'<div class="progress-item '+(state.enemies[l.id].length===0?'done':'')+'"><span>'+l.name+'</span><b>'+(state.enemies[l.id].length===0?'✓':'×'+state.enemies[l.id].length)+'</b></div>').join('');
  byId('log').innerHTML=state.log.slice(0,5).map(x=>'<p>'+escapeHtml(x)+'</p>').join('');
  byId('field-name').textContent=loc.name;
  byId('field-hint').textContent=loc.hint;
  byId('scene-image').style.backgroundImage='url("'+ART.scene(loc.id)+'")';
  const enemies=currentEnemies(state);
  byId('field-threat').innerHTML=String(enemies.length).padStart(2,'0')+' <span>ENEMIES</span>';
  byId('enemy-lanes').innerHTML=enemies.length?enemies.map(enemyHTML).join(''):'<div class="empty-field">'+(state.status==='won'?'所有区域已肃清':'当前区域安全 · CLEAR')+'</div>';
  byId('hand').innerHTML=handHTML();
  byId('locations').innerHTML=LOCATIONS.map(locationHTML).join('');
  byId('guidance').textContent=state.status==='won'?'全部敌人已经清除，胜利！':state.status==='lost'?'生命耗尽，行动结束。':state.ap===0?'行动点耗尽，请结束回合':enemies.length?'选择敌人，再点步枪射击；距离 1 的敌人会攻击':'当前场地安全，可前往其他场地';
  const end=byId('end-btn');
  end.innerHTML=state.status==='playing'?'结束回合 <span>↳</span>':'重新开始 <span>↻</span>';
  end.dataset.action=state.status==='playing'?'end':'restart';
  document.title='余烬之夜 · '+loc.name+' · 第'+state.turn+'回合';
  save();
}
function dispatch(action){
 const result=perform(state,action);
 if(!result.ok){toast(result.message);return false;}
 state=result.state;
 render();
 if(action.type!=='select')toast(result.message);
 if(state.status!=='playing')toast(state.status==='won'?'胜利！三个场地全部肃清':'失败：幸存者生命耗尽');
 return true;
}
byId('game').addEventListener('click',e=>{
  const control=e.target.closest('[data-action]');
  if(!control||control.disabled)return;
  const type=control.dataset.action;
  if(type==='none')return;
  dispatch({type,id:control.dataset.id,to:control.dataset.to});
});
byId('reset-btn').addEventListener('click',()=>{
  if(window.confirm('确定重新开始？当前游戏存档将被覆盖。'))dispatch({type:'restart'});
});
const overlay=byId('help-overlay');
function closeHelp(){overlay.hidden=true;}
byId('help-btn').addEventListener('click',()=>{overlay.hidden=false;byId('close-help').focus();});
byId('close-help').addEventListener('click',closeHelp);
byId('help-ok').addEventListener('click',closeHelp);
overlay.addEventListener('click',e=>{if(e.target===overlay)closeHelp();});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!overlay.hidden){closeHelp();return;}
  if(!overlay.hidden||e.altKey||e.ctrlKey||e.metaKey)return;
  const ids=LOCATIONS.map(l=>l.id);
  const ix=ids.indexOf(state.current);
  if(e.key==='ArrowUp'||e.key==='ArrowLeft'){
    const to=ids[(ix+ids.length-1)%ids.length];
    if(canMove(state.current,to))dispatch({type:'move',to});
    e.preventDefault();
  }else if(e.key==='ArrowDown'||e.key==='ArrowRight'){
    const to=ids[(ix+1)%ids.length];
    if(canMove(state.current,to))dispatch({type:'move',to});
    e.preventDefault();
  }else if(e.key===' '){
    dispatch({type:'end'});e.preventDefault();
  }
});
render();
window.__NIGHT_REMAINS__={
  state:()=>structuredClone(state),
  dispatch,
  version:1
};
