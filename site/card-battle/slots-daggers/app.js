(() => {
'use strict';
const {Machine,Graphics,foes,items,clamp,label,makeCanvas}=SlotStudy;
const $=id=>document.getElementById(id);
const display=$('glass'),screen=display.getContext('2d',{alpha:false});
const menu=$('settings'),keys=$('keys'),params=new URLSearchParams(location.search);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let gfx,game,layout,portraitTable,portraitTray,heldSince=0,lastRepeat=0,viewWidth=0,viewHeight=0,stylePhase='';
let soundOn=true;try{soundOn=localStorage.getItem('cabinet.study.sound')!=='off'}catch{}
const buttons=new Map();
function telemetry(s){$('status').textContent=s}
class Sound{
 constructor(){this.bus=null;this.lastCoin=0;}
 unlock(){
  try{if(!this.bus){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
   this.bus=new AC();this.gain=this.bus.createGain();this.gain.gain.value=.68;
   const comp=this.bus.createDynamicsCompressor();this.gain.connect(comp).connect(this.bus.destination);
  }if(this.bus.state==='suspended')this.bus.resume().catch(()=>{});}catch{}
 }
 tone(freq,length,type,volume,end,delay=0){
  if(!soundOn||!this.bus||this.bus.state!=='running')return;
  const a=this.bus,t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(25,end||freq),t+length);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.003);
  g.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(g).connect(this.gain);o.start(t);o.stop(t+length+.004);
  o.onended=()=>{o.disconnect();g.disconnect()};
 }
 play(name,e){
  switch(name){
   case 'tick':this.tone(424,.024,'triangle',.023,167);break;
   case 'press':this.tone(130,.063,'square',.044,48);break;
   case 'latch':this.tone(105,.11,'triangle',.14,37);this.tone(680+e.i*96,.069,'square',.025,171);break;
   case 'focus':this.tone(480+e.i*61,.075,'triangle',.083,416);break;
   case 'impact':
    if(e.damage){this.tone(184,.14,'sawtooth',.083,49);this.tone(2040,.082,'triangle',.048,239)}
    if(e.armor){this.tone(558,.16,'triangle',.12,320);this.tone(1106,.112,'sine',.06,829)}
    if(e.money)this.tone(1570,.13,'triangle',.105,1390);
    if(e.crit)[660,880,1320].forEach((f,i)=>this.tone(f,.16,'triangle',.105,undefined,i*.052));break;
   case 'enemyHit':this.tone(126,.25,'sawtooth',.13,36);this.tone(793,.12,'triangle',.064,133);break;
   case 'clink':
    if(this.bus&&this.bus.currentTime-this.lastCoin>.032){this.lastCoin=this.bus.currentTime;this.tone(1020+e.power*610,.09,'sine',.058*e.power,875);this.tone(2380,.05,'triangle',.035*e.power,1520)}
    break;
   case 'payout':[392,494,587,784].forEach((f,i)=>this.tone(f,.21,'triangle',.1,undefined,i*.085));break;
   case 'purchase':this.tone(740,.12,'sine',.12,920);this.tone(1200,.14,'sine',.07,1460,.075);break;
   case 'deny':this.tone(86,.18,'square',.038,53);break;
   case 'end':this.tone(180,.65,'triangle',.19,38);break;
  }
 }
}
const audio=new Sound();
function notify(event,e){
 if(!game)return;
 gfx.event(event,e,game);audio.play(event,e);
 if(event==='reset'){gfx.stateReset(game)}
 if(event==='phase'){stylePhase='';telemetry({
  spin:'转动中，点 STOP 依次停轮。',settled:'卷轴已停止，依次结算。',skill:'点 GO 完成时机判定。',
  enemyWind:'敌方回合。',reward:'战斗胜利，金币落入左侧托盘。',shop:'选择符号升级，或点三角键前往下一场。',
  defeat:'战败，点 RESTART 再试。',complete:'通关，点 RESTART 重新开始。'
 }[e.phase]||game.log)}
}
function loadImage(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('无法读取机台材质'));im.src=url;})}
function setupLayout(){
 const box=display.getBoundingClientRect();viewWidth=box.width;viewHeight=box.height;
 const dpr=Math.min(devicePixelRatio||1,2);display.width=Math.max(1,Math.round(box.width*dpr));display.height=Math.max(1,Math.round(box.height*dpr));
 const portrait=box.height>box.width*1.06;
 const w=portrait?480:960,h=portrait?clamp(box.height/box.width*480,685,1160):540;
 const s=Math.min(box.width/w,box.height/h);
 layout={portrait,w,h,s,ox:(box.width-w*s)/2,oy:(box.height-h*s)/2,dpr,parts:{}};
 stylePhase='';
}
function blit(c,world,src,dst){
 const k=gfx.scale;c.drawImage(world,src[0]*k,src[1]*k,src[2]*k,src[3]*k,...dst);
}
function part(c,world,key,src,dst){blit(c,world,src,dst);layout.parts[key]={src,dst}}
function casePanel(c,x,y,w,h){
 c.fillStyle='#171c17';c.fillRect(x,y,w,h);const b=5;
 c.fillStyle='#545343';c.fillRect(x+b,y,w-2*b,2);c.fillRect(x,y+b,2,h-2*b);
 c.fillStyle='#101512';c.fillRect(x+w-3,y+b,3,h-2*b);c.fillRect(x+b,y+h-3,w-2*b,3);
 gfx.sprite(c,'meterFace',x+4,y+4,w-8,h-8);
 for(const [a,d] of [[x+3,y+3],[x+w-16,y+3],[x+3,y+h-16],[x+w-16,y+h-16]])gfx.sprite(c,'screw',a,d,13,13);
}
function portrait(c,world,g){
 const h=layout.h;
 const head=clamp(97+(h-730)*.40,79,263),mid=head+254;
 const reelY=mid+clamp((h-570)*.10,10,46);
 const footer=reelY+123+clamp((h-590)*.13,12,49);
 // A physical reassembly of the same glass, rail, gauge and button mouldings for a tall cabinet.
 c.drawImage(portraitTable,0,0,480,h);
 const trayScale=clamp((head-21)/302,.32,.73);
 c.save();c.translate(-7,-4);c.scale(trayScale,trayScale);
 c.drawImage(portraitTray,0,0,290,327);gfx.drawCoins(c,g.time);c.restore();
 casePanel(c,7,head-11,466,footer+93-head+11);
 const shop=g.phase==='shop';
 part(c,world,'main',shop?[285,15,396,260]:[282,20,395,252],[13,head,385,246]);
 part(c,world,'meter',[789,108,66,300],[404,head+5,59,245]);
 part(c,world,'turn',[670,53,185,51],[151,head-65,185,51]);
 // Coins and log remain adjacent to the individual gauges and can be read while all reels are in view.
 part(c,world,'funds',[105,292,89,120],[12,mid+2,49,66]);
 const logX=71;casePanel(c,logX,mid+2,391,41);
 label(c,g.log,266,mid+16,1.52,'#bfa477','center',336);
 const actualReel=Math.max(reelY,mid+66);
 part(c,world,'rail',shop?[197,272,596,153]:[191,270,595,154],[9,actualReel,462,119]);
 const buttonY=Math.max(footer,actualReel+123);
 if(shop)part(c,world,'foot',[110,412,748,123],[8,buttonY,464,76]);
 else if(g.phase==='skill')part(c,world,'foot',[217,410,540,92],[12,buttonY,456,80]);
 else part(c,world,'foot',[296,430,394,110],[70,buttonY,340,95]);

}
function screenPos(key,rect){
 let [x,y,w,h]=rect;
 if(layout.portrait){
  const block=layout.parts[key];if(!block)return null;
  const {src,dst}=block;x=dst[0]+(x-src[0])*dst[2]/src[2];y=dst[1]+(y-src[1])*dst[3]/src[3];w*=dst[2]/src[2];h*=dst[3]/src[3];
 }
 return [layout.ox+x*layout.s,layout.oy+y*layout.s,w*layout.s,h*layout.s];
}
function draw(){
 const world=gfx.paint(game),a=layout;const pixel=a.dpr;
 screen.setTransform(1,0,0,1,0,0);screen.fillStyle='#101511';screen.fillRect(0,0,display.width,display.height);
 screen.setTransform(a.s*pixel,0,0,a.s*pixel,a.ox*pixel,a.oy*pixel);
 if(a.portrait)portrait(screen,world,game);
 else{
  // Letterbox on extra-wide displays. The glass and reel openings always retain reference aspect.
  screen.drawImage(world,0,0,960,540);
 }
 const bx=a.portrait?32:21,by=a.portrait?24:21;
 screen.save();screen.globalAlpha=gfx.hover==='menu'?.88:.43;screen.fillStyle='#182019';screen.fillRect(bx-10,by-10,22,22);
 screen.fillStyle='#ccb887';screen.fillRect(bx-4,by-4,2.3,9);screen.fillRect(bx+2,by-4,2.3,9);screen.restore();
 syncControls();
}
function bind(name,aria,run){
 const b=document.createElement('button');b.type='button';b.dataset.key=name;b.setAttribute('aria-label',aria);keys.appendChild(b);
 b.addEventListener('pointerenter',()=>{if(gfx)gfx.hover=name});
 b.addEventListener('pointerleave',()=>{if(gfx?.hover===name)gfx.hover=''});
 b.addEventListener('pointerdown',e=>{if(e.button!==0)return;audio.unlock();
  if(name==='action'&&game.phase==='spin'){heldSince=performance.now();lastRepeat=heldSince;}
 });
 b.addEventListener('click',e=>{e.preventDefault();audio.unlock();if(heldSince!==-1)run();heldSince=0;});
 buttons.set(name,b);
}
function place(name,coords,aria){
 const b=buttons.get(name);if(!coords){b.hidden=true;return}b.hidden=false;
 const [x,y,w,h]=coords;
 Object.assign(b.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
 if(aria)b.setAttribute('aria-label',aria);
}
const xCenters=[272,379,487,598,708];
function syncControls(){
 const g=game,id=[g.phase,g.current,g.count,g.nextStop,layout.portrait,viewWidth,viewHeight,g.paused,g.purchases.size].join(':');
 const glass=display.dataset;
 if(glass.phase!==g.phase)glass.phase=g.phase;
 glass.encounter=g.foe.id;glass.foeHp=g.enemyHp;glass.playerHp=g.hp;glass.gold=g.cash;glass.armor=g.armor;glass.reels=g.count;glass.stopped=g.nextStop;
 if(stylePhase===id)return;stylePhase=id;
 for(const b of buttons.values())b.hidden=true;
 const a=layout;
 place('menu',[a.ox+Math.max(0,(a.portrait?7:0)*a.s),a.oy,Math.max(34,45*a.s),Math.max(34,45*a.s)]);
 if(g.paused)return;
 if(g.phase==='spin'&&g.nextStop<g.active.length){
  place('action',screenPos('foot',[298,430,389,110]),'STOP · 停第'+(g.nextStop+1)+'个卷轴');
  for(const i of g.active)place('reel'+i,screenPos('rail',[xCenters[i]-48,290,96,111]),'停轮 · 槽位 '+(i+1));
 }else if(g.phase==='skill')place('action',screenPos('foot',[xCenters[g.current]-44,410,88,78]),'GO · 时机判定');
 else if(g.phase==='defeat'||g.phase==='complete')place('action',screenPos('foot',[298,430,389,110]),'RESTART · 再来一局');
 else if(g.phase==='reward')place('action',screenPos('main',[326,54,328,179]),'领取战利品');
 else if(g.phase==='shop'){
  place('action',screenPos('foot',[785,413,73,87]),'下一场');
  for(let i=0;i<3;i++){
   const name=g.offers[i]==='reel'?'增加一个卷轴':items[g.offers[i]].name;
   if(!g.purchases.has(i))place('buy'+i,screenPos('rail',[330+i*109,291,103,113]),'购买 '+name+' · '+g.prices[i]+' 金币');
   place('use'+i,screenPos('foot',[129+i*94,425,88,94]),['补血','购买护甲','提高生命上限'][i]);
  }
 }
}
function pauseGame(){
 if(!game)return;heldSince=0;game.paused=true;$('encounter').value=String(game.stage);menu.showModal();stylePhase='';
}
function resumeGame(){menu.close();game.paused=false;stylePhase='';heldSince=0;}
function controls(){
 bind('action','STOP',()=>game.action());
 bind('menu','暂停与机台手册',pauseGame);
 for(let i=0;i<5;i++)bind('reel'+i,'停轮',()=>game.action());
 for(let i=0;i<3;i++){bind('buy'+i,'购买符号',()=>game.buy(i));bind('use'+i,'购买补给',()=>game.buy(i+3))}
 foes.forEach((f,i)=>{const op=document.createElement('option');op.value=i;op.textContent=f.place+' · '+f.name;$('encounter').append(op)});
 $('menuResume').onclick=resumeGame;
 $('practice').onclick=()=>{game.reset(Number($('encounter').value));gfx.stateReset(game);resumeGame();draw()};
 $('sound').textContent='声音 · '+(soundOn?'开':'关');
 $('sound').onclick=()=>{audio.unlock();soundOn=!soundOn;try{localStorage.setItem('cabinet.study.sound',soundOn?'on':'off')}catch{}$('sound').textContent='声音 · '+(soundOn?'开':'关');};
 menu.addEventListener('cancel',e=>{e.preventDefault();resumeGame()});
 addEventListener('keydown',e=>{
  if(!game||e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
  if(game.paused)return;
  if(e.key==='Escape'||e.key.toLowerCase()==='p'){e.preventDefault();pauseGame();return}
  if(e.code==='Space'||e.key==='Enter'){e.preventDefault();audio.unlock();game.action();return}
  if(game.phase==='shop'&&'123'.includes(e.key)){audio.unlock();game.buy(Number(e.key)-1)}
 });
 // Uninterrupted hold engages the ratchet. Quick taps still give independent timing control.
 addEventListener('pointerup',()=>{if(heldSince>0)heldSince=0;setTimeout(()=>{if(heldSince===-1)heldSince=0},80)});
 addEventListener('pointercancel',()=>{heldSince=0});addEventListener('blur',()=>{heldSince=0;lastRepeat=0});
}
async function run(){
 const urls=window.MACHINE_FILES||{shell:'machine-shell.webp',atlas:'components.webp',table:'portrait-table.webp',tray:'portrait-tray.webp',poses:'motion.webp'};
 const [shell,atlas,table,tray,poses]=await Promise.all([urls.shell,urls.atlas,urls.table,urls.tray,urls.poses].map(loadImage));
 portraitTable=table;portraitTray=tray;
 gfx=new Graphics(shell,atlas,window.MACHINE_MATERIALS,poses);
 const seed=params.has('seed')?Number(params.get('seed'))>>>0:Math.random()*4294967296>>>0;
 const stage=foes.findIndex(v=>v.id===params.get('encounter'));
 game=new Machine(seed,notify,Math.max(0,stage));gfx.stateReset(game);
 controls();setupLayout();draw();$('loading').hidden=true;
 telemetry('点 STOP 依次停下三个卷轴，或按空格。');
 new ResizeObserver(()=>{setupLayout();draw()}).observe(display);
 let last=performance.now(),acc=0;
 document.addEventListener('visibilitychange',()=>{acc=0;last=performance.now();heldSince=0});
 function loop(now){
  const delta=clamp((now-last)/1000,0,.36);last=now;
  if(!document.hidden&&!game.paused){
   acc+=delta;
   while(acc>=1/120){game.update(1/120);gfx.update(1/120,game);acc-=1/120;}
   if((heldSince>0&&now-heldSince>430||heldSince===-1)&&now-lastRepeat>405&&game.phase==='spin'){
    game.action();lastRepeat=now;heldSince=-1;
   }
   draw();
  }
  requestAnimationFrame(loop);
 }
 requestAnimationFrame(loop);
}
run().catch(e=>{const p=$('loading');p.textContent=e.message+' · 点击重新载入';p.onclick=()=>location.reload();console.error(e)});
})();
