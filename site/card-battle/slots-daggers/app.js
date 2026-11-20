(() => {
'use strict';
const {Machine,Graphics,foes,items,clamp,label}=SlotStudy;
const $=id=>document.getElementById(id);
const display=$('glass'),screen=display.getContext('2d',{alpha:false});
const menu=$('settings'),keys=$('keys'),params=new URLSearchParams(location.search);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let gfx,game,layout,heldSince=0,lastRepeat=0,viewWidth=0,viewHeight=0,stylePhase='';
const buttons=new Map();
function telemetry(s){$('status').textContent=s}
const audio=new CabinetSound();
function notify(event,e){
 if(!game)return;
 gfx.event(event,e,game);audio.event(event,e);
 if(event==='reset'){gfx.stateReset(game)}
 if(event==='phase'){stylePhase='';telemetry({
  spin:'转动中，点 STOP 依次停轮。',settled:'卷轴已停止，依次结算。',skill:'点 GO 完成时机判定。',
  enemyWind:'敌方回合。',reward:'战斗胜利，金币落入左侧托盘。',shop:'选择符号升级，或点三角键前往下一场。',
  defeat:'战败，点 RESTART 再试。',complete:'通关，点 RESTART 重新开始。'
 }[e.phase]||game.log)}
}
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
function portrait(c,world,g){
 const h=layout.h,head=clamp(117+(h-685)*.35,117,274),mid=head+254;
 const actualReel=mid+66,buttonY=actualReel+123+clamp((h-780)*.085,0,32);
 CabinetArt.desk(c,true,h,gfx.motion);
 const trayScale=clamp((head-21)/302,.32,.73);
 c.save();c.translate(-7,-4);c.scale(trayScale,trayScale);gfx.drawCoins(c,g);c.restore();
 CabinetArt.portraitChassis(c,head,actualReel,buttonY,h);
 part(c,world,'main',[282,20,395,252],[13,head,385,246]);
 part(c,world,'meter',[789,108,66,300],[404,head+5,59,245]);
 part(c,world,'turn',[670,53,185,51],[158,head-65,185,51]);
 part(c,world,'funds',[105,292,89,120],[12,mid+2,49,66]);
 CabinetArt.plaque(c,69,mid+9,391,42);
 label(c,g.log,265,mid+24,1.52,'#cbb782','center',336);
 part(c,world,'rail',[191,270,595,154],[9,actualReel,462,119]);
 if(g.phase==='shop'){
   part(c,world,'foot',[110,412,748,123],[8,buttonY,464,76]);
 }else if(g.phase==='skill'){
   const src=[217,410,540,92],dst=[12,buttonY,456,80];
   layout.parts.foot={src,dst};
   c.save();c.translate(dst[0],dst[1]);c.scale(dst[2]/src[2],dst[3]/src[3]);c.translate(-src[0],-src[1]);gfx.spinner(c,g);c.restore();
 }else{
   layout.parts.foot={src:[296,430,394,110],dst:[70,buttonY,340,95]};
   if(gfx.drawer>.002){
    c.save();c.beginPath();c.rect(67,buttonY-1,346,97);c.clip();
    CabinetArt.drawer(c,70,buttonY+99*(1-gfx.drawer),340,95,clamp(1-(g.time-gfx.pressedAt)/.12,0,1),g.phase==='defeat'||g.phase==='complete'?'RESTART':'STOP');c.restore();
   }
 }
 function local(key,x,y){
   const {src,dst}=layout.parts[key];
   return [dst[0]+(x-src[0])*dst[2]/src[2],dst[1]+(y-src[1])*dst[3]/src[3]];
 }
 gfx.effects.onPortrait(c,g,gfx.reduced,local);
 CabinetArt.leafShade(c,g.time,true,h);
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
 const a=layout,world=gfx.paint(game,a.portrait);const pixel=a.dpr;
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
  const i=g.active[g.nextStop];place('reel'+i,screenPos('rail',[xCenters[i]-48,290,96,111]),'停轮 · 槽位 '+(i+1));
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
 if(!game)return;heldSince=0;audio.suspend();game.paused=true;$('encounter').value=game.training||String(game.stage);menu.showModal();stylePhase='';
}
function resumeGame(){menu.close();game.paused=false;audio.unlock();stylePhase='';heldSince=0;}
function controls(){
 bind('action','STOP',()=>game.action());
 bind('menu','暂停与机台手册',pauseGame);
 for(let i=0;i<5;i++)bind('reel'+i,'停轮',()=>game.action());
 for(let i=0;i<3;i++){bind('buy'+i,'购买符号',()=>game.buy(i));bind('use'+i,'购买补给',()=>game.buy(i+3))}
 foes.forEach((f,i)=>{const op=document.createElement('option');op.value=i;op.textContent=f.place+' · '+f.name;$('encounter').append(op)});
 $('menuResume').onclick=resumeGame;
 $('practice').onclick=()=>{
  const choice=$('encounter').value;
  if(choice==='coins'||choice==='single')game.coinPractice(choice);else game.reset(Number(choice));
  resumeGame();draw();
 };
 for(const [value,name] of [['single','单枚出币 · 空托盘'],['coins','金币暴击 · 三个相邻金币符号']]){
  const op=document.createElement('option');op.value=value;op.textContent=name;$('encounter').append(op);
 }
 $('sound').textContent='声音 · '+(audio.enabled?'开':'关');
 $('sound').onclick=()=>{audio.setEnabled(!audio.enabled);$('sound').textContent='声音 · '+(audio.enabled?'开':'关')};
 menu.addEventListener('cancel',e=>{e.preventDefault();resumeGame()});
 addEventListener('keydown',e=>{
  if(!game||e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
  if(game.paused)return;
  if(e.key==='Escape'||e.key.toLowerCase()==='p'){e.preventDefault();pauseGame();return}
  if(e.code==='Space'||e.key==='Enter'){e.preventDefault();audio.unlock();game.action();return}
  if(game.phase==='shop'&&/^[123]$/.test(e.key)){audio.unlock();game.buy(Number(e.key)-1)}
 });
 // Uninterrupted hold engages the ratchet. Quick taps still give independent timing control.
 addEventListener('pointerup',()=>{if(heldSince>0)heldSince=0;setTimeout(()=>{if(heldSince===-1)heldSince=0},80)});
 addEventListener('pointercancel',()=>{heldSince=0});addEventListener('blur',()=>{heldSince=0;lastRepeat=0});
}
async function run(){
 const seed=params.has('seed')?Number(params.get('seed'))>>>0:Math.random()*4294967296>>>0;
 gfx=new Graphics(seed,e=>audio.coin(e));
 const stage=foes.findIndex(v=>v.id===params.get('encounter'));
 game=new Machine(seed,notify,Math.max(0,stage));
 const practice=params.get('practice');
 if(practice==='coins'||practice==='single')game.coinPractice(practice);
 gfx.stateReset(game);
 controls();setupLayout();draw();$('loading').hidden=true;
 telemetry('点 STOP 依次停下三个卷轴，或按空格。');
 new ResizeObserver(()=>{setupLayout();draw()}).observe(display);
 let last=performance.now(),acc=0,frame=0,watchdog=0;
 function nextFrame(){
  frame=requestAnimationFrame(loop);
  if(!document.hidden&&!game.paused){
   // Some embedded mobile browsers temporarily starve rAF while the page is visible.
   watchdog=setTimeout(()=>{cancelAnimationFrame(frame);loop(performance.now())},54);
  }
 }
 document.addEventListener('visibilitychange',()=>{acc=0;last=performance.now();heldSince=0;if(document.hidden)audio.suspend();else if(audio.ac&&!game.paused)audio.unlock()});
 function loop(now){
  clearTimeout(watchdog);
  // Hidden tabs reset the clock below. A visible dropped frame must preserve the payout and reel cadence.
  const delta=clamp((now-last)/1000,0,2);last=now;
  if(!document.hidden&&!game.paused){
   acc+=delta;
   while(acc>=1/120){game.update(1/120);gfx.update(1/120,game);acc-=1/120;}
   if((heldSince>0&&now-heldSince>430||heldSince===-1)&&now-lastRepeat>405&&game.phase==='spin'){
    game.action();lastRepeat=now;heldSince=-1;
   }
   audio.pump(game);draw();
  }
  nextFrame();
 }
 nextFrame();
}
run().catch(e=>{const p=$('loading');p.textContent=e.message+' · 点击重新载入';p.onclick=()=>location.reload();console.error(e)});
})();
