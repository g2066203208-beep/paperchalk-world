import {freshCombat,normalizeCombat,draw,holster,beginEncounter,reload,finishReload,fire,enemyTick,retreat,settle,signalEncounter,buyAmmo} from './combat.js';
const q=id=>document.getElementById(id);
const STORE='night-office-combat-v1';
export function setupCombat({getWorld,setWorld,toast}){
 let game;try{game=normalizeCombat(JSON.parse(localStorage.getItem(STORE)));}catch{game=freshCombat();}
 let reloadTimer=null,lastShot=0,flashTimer=null,enemyTimer=null;
 const root=q('combat-root'),svg=q('combat-viewport'),gun=q('combat-weapon'),flash=q('muzzle-flash'),ping=q('shot-ripple');
 const esc=t=>String(t).replace(/[&<>"']/g,'');
 const isActive=()=>game.mode!=='holstered';
 const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(game));}catch{}};
 const enemySVG=e=>'<g class="combat-enemy" transform="translate('+e.x+' '+e.y+')">'+
  '<ellipse cx="0" cy="80" rx="35" ry="9" fill="#0e1b29" opacity=".48"/>'+
  '<path class="enemy-jacket" d="M-34 -25L-48 18L-40 75L38 75L48 21L33 -25L12 -36L-15 -36Z" fill="'+e.color+'"/>'+
  '<path d="M-24 67L-21 83H-3L0 55L7 83H27L30 61Z" fill="#18232f"/>'+
  '<path d="M-19 -35L-15 -58L14 -58L19 -31L0 -13Z" fill="#d9a88b"/>'+
  '<path d="M-29 -58Q-27 -93 2 -97Q31 -92 29 -55L16 -32L-17 -33Z" fill="#cba18b" stroke="#1a2633" stroke-width="4"/>'+
  '<path class="enemy-mask" d="M-27 -70L-14 -80L17 -80L27 -69L25 -54L-23 -52Z"/>'+
  '<path class="enemy-eyes" d="M-17 -65L-6 -63L-6 -59L-18 -61ZM5 -63L18 -65L19 -60L6 -59Z"/>'+
  '<path d="M-36 5L-53 42M34 6L47 48" fill="none" stroke="#293a46" stroke-width="15" stroke-linecap="round"/>'+
  '<rect x="-24" y="2" width="49" height="8" rx="2" fill="#182b36" opacity=".6"/>'+
 '</g>';
 const practice=()=>'<g class="combat-target-board" transform="translate(991 300)">'+
  '<rect x="-58" y="-79" width="116" height="151" rx="3" fill="#dfcfb0" stroke="#1c2b38" stroke-width="7"/>'+
  '<circle r="50" fill="#eee0cb" stroke="#b65259" stroke-width="8"/>'+
  '<circle r="32" fill="#c25b5e"/><circle r="17" fill="#f5e5cd"/><circle r="8" fill="#243644"/>'+
  '<path d="M0 -60V-44M0 44V61M-60 0H-45M45 0H61" stroke="#1b2e39" stroke-width="3"/>'+
  '<text x="-50" y="-89" font-size="12" font-weight="900" fill="#f8e6cc" letter-spacing="2">PRACTICE</text>'+
 '</g>';
 function render(message){
  const mode=game.mode;
  root.hidden=mode==='holstered';
  root.classList.toggle('combat-victory',mode==='won');
  root.classList.toggle('combat-defeat',mode==='lost');
  root.classList.toggle('combat-reloading',game.reloading);
  if(mode==='holstered'){save();return;}
  q('combat-targets').innerHTML=mode==='aim'?practice():(mode==='fight'?game.enemies.map(enemySVG).join(''):'');
  q('combat-mag').textContent=String(game.mag).padStart(2,'0');
  q('combat-reserve').textContent='/ '+game.reserve;
  q('combat-hp').textContent=game.hp;
  q('combat-hits').textContent=game.hits;
  q('combat-status').textContent=mode==='aim'?(game.alert?'警报：门外有敌袭':'持枪 · 试射模式'):
   mode==='fight'?'办公室遭袭 · '+game.enemies.length+' 人未被击退':mode==='won'?'防守成功':'防守失利';
  if(message)q('combat-message').textContent=message;
  else q('combat-message').textContent=mode==='aim'?'用鼠标瞄准门口靶板并点击射击，R 换弹。':
   mode==='fight'?'瞄准敌人躯干点射，生命耗尽前阻止他们。':
   mode==='won'?'全部威胁已解除，可以结算防守成果。':'你已退到掩体，确认损失后返回办公室。';
  q('combat-start').hidden=mode!=='aim';
  q('combat-retreat').hidden=mode!=='fight';
  q('combat-holster').hidden=mode!=='aim';
  q('combat-settle').hidden=!['won','lost'].includes(mode);
  q('combat-reload').disabled=game.reloading||!['aim','fight'].includes(mode)||game.mag===game.maxMag||!game.reserve;
  q('combat-ammo').hidden=!['aim'].includes(mode);
  save();
 }
 function sound(){
  try{
   const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
   const ctx=new C(),osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type='square';osc.frequency.setValueAtTime(160,ctx.currentTime);
   osc.frequency.exponentialRampToValueAtTime(60,ctx.currentTime+.085);
   gain.gain.setValueAtTime(.032,ctx.currentTime);
   gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.10);
   osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.11);
   osc.onended=()=>ctx.close().catch(()=>{});
  }catch{}
 }
 function act(r){
  if(!r.ok){toast(r.message);return false;}
  game=r.combat;render(r.message);return true;
 }
 function drawGun(){
  const {meta}=getWorld();
  if(meta.venue==='street'){toast('请先回到办公室，再拿起桌上的枪');return;}
  act(draw(game));
 }
 function holsterGun(){
  if(act(holster(game)))q('combat-viewport').blur();
 }
 function startFight(){
  const {state,meta}=getWorld();
  if(meta.visitor){toast('有人正在桌前，先完成接待');return;}
  if(act(beginEncounter(game,1,state.day)))q('combat-viewport').focus();
 }
 function reloadGun(){
  const r=reload(game);if(!act(r))return;
  clearTimeout(reloadTimer);
  reloadTimer=setTimeout(()=>{if(!game.reloading)return;act(finishReload(game));},720);
 }
 function shoot(e){
  if(!['aim','fight'].includes(game.mode))return;
  const t=Date.now();
  if(t-lastShot<195)return;
  const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
  const matrix=svg.getScreenCTM();if(!matrix)return;
  const cursor=p.matrixTransform(matrix.inverse());
  const r=fire(game,cursor.x,cursor.y,t);
  if(!r.ok){toast(r.message);render(r.message);return;}
  lastShot=t;
  game=r.combat;
  sound();
  gun.classList.remove('kick');void gun.getBoundingClientRect();gun.classList.add('kick');
  flash.classList.remove('blast');void flash.getBoundingClientRect();flash.classList.add('blast');
  ping.setAttribute('transform','translate('+cursor.x+' '+cursor.y+')');
  ping.classList.remove('ping');void ping.getBoundingClientRect();ping.classList.add('ping');
  render(r.knocked?'对手倒地 · '+game.enemies.length+' 人剩余':r.message);
 }
 function tick(){
  if(game.mode!=='fight')return;
  const r=enemyTick(game);
  if(!r.ok)return;
  game=r.combat;const hit=q('combat-flash');
  hit.classList.remove('damaged');void hit.getBoundingClientRect();hit.classList.add('damaged');
  render(r.message);
 }
 function settlement(){
  const w=getWorld(),r=settle(game,w.state,w.meta);
  if(!r.ok){toast(r.message);return;}
  game=r.combat;setWorld(r.state,r.meta);
  render();toast(r.message);
 }
 function checkDay(day,heat){
  const n=signalEncounter(game,day,heat);
  if(!game.alert&&n.alert){game=n;save();toast('有人在门外徘徊……桌上的枪或许用得上');}
  else if(n.alertDay!==game.alertDay){game=n;save();}
 }
 function purchase(){
  const w=getWorld(),r=buyAmmo(game,w.state);
  if(!r.ok){toast(r.message);return;}
  game=r.combat;setWorld(r.state,w.meta);render(r.message);toast(r.message);
 }
 svg.addEventListener('pointermove',e=>{
  if(!isActive())return;
  const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
  const c=p.matrixTransform(svg.getScreenCTM().inverse());
  if(c.x>=0&&c.x<=1200&&c.y>=0&&c.y<=670)q('aim-crosshair').setAttribute('transform','translate('+c.x+' '+c.y+')');
 });
 svg.addEventListener('click',shoot);
 q('combat-reload').addEventListener('click',reloadGun);
 q('combat-ammo').addEventListener('click',purchase);
 q('combat-start').addEventListener('click',startFight);
 q('combat-holster').addEventListener('click',holsterGun);
 q('combat-retreat').addEventListener('click',()=>act(retreat(game)));
 q('combat-settle').addEventListener('click',settlement);
 document.addEventListener('keydown',e=>{
  if(!isActive()||e.target.closest?.('input,textarea'))return;
  if(e.key.toLowerCase()==='r'){e.preventDefault();reloadGun();}
  if(e.key==='Escape'&&game.mode==='aim'){e.preventDefault();holsterGun();}
 });
 enemyTimer=setInterval(tick,1750);
 render();
 return {draw:drawGun,isActive,state:()=>clone(game),start:startFight,reload:reloadGun,
  shoot:(x,y)=>{const r=fire(game,x,y,Date.now());if(r.ok){game=r.combat;render(r.message);}return r;},
  tick:()=>{tick();return clone(game);},settle:settlement,checkDay,holster:holsterGun};
}
