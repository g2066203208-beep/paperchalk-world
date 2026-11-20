(() => {
'use strict';
const {makeCanvas,label,glow,clamp,lerp,items}=SlotStudy;
const XC=[272,379,487,598,708],A=()=>window.CabinetArt;
function pulse(age,duration){return Math.max(0,1-age/duration)}
function tube(c,x,y,w,h,ratio,color,vertical=false){
 ratio=clamp(ratio,0,1);c.fillStyle='#141b17';c.fillRect(x,y,w,h);
 const frames=vertical?Math.floor(h/3.8):Math.floor(w/4.3);
 for(let i=0;i<frames;i++){
  const on=(i+.42)/frames<=ratio,grad=on?color:'#363b2b';
  if(vertical){
   const sy=Math.round(y+h-(i+1)*h/frames);
   c.fillStyle=grad;c.fillRect(x+1,sy,w-2,Math.max(1,h/frames-1));
   if(on){c.fillStyle='#f8efaa70';c.fillRect(x+2,sy,1,2)}
  }else{
   const sx=Math.round(x+i*w/frames);c.fillStyle=grad;c.fillRect(sx,y+1,Math.max(1,w/frames-.6),h-2);
   if(on){c.fillStyle='#ffe9ac59';c.fillRect(sx,y+1,2,1)}
  }
 }
}
function etched(c,text,x,y,s,color,align='left',w){
 label(c,text,x,y+1.15,s,'#111b16',align,w);label(c,text,x,y,s,color,align,w);
}
function cornerTag(c,x,y,n,sold){
 c.save();c.translate(x,y);
 c.fillStyle='#1a1c17';c.fillRect(1,2,24,18);c.fillStyle=sold?'#635849':'#c3b394';c.fillRect(0,0,23,17);
 c.fillStyle='#e8cda2';c.fillRect(0,0,21,1);c.fillStyle='#4f4939';c.fillRect(22,1,1,16);
 label(c,sold?'--':n,11.7,3.5,1.47,'#332d25','center');c.restore();
}
function crtFilm(){
 const im=makeCanvas(328,179),ic=im.getContext('2d'),pixels=ic.createImageData(328,179);
 for(let y=0;y<179;y++)for(let x=0;x<328;x++){
  const i=(y*328+x)*4,xx=(x-164)/165,yy=(y-89)/91;
  const edge=Math.min(.75,(xx*xx+yy*yy)*.10+Math.max(0,xx*xx*yy*yy*.57));
  pixels.data[i]=25;pixels.data[i+1]=28;pixels.data[i+2]=21;
  pixels.data[i+3]=Math.round(5+edge*115+(y%3===0?9:0)+(x%3===1?2:0));
 }
 ic.putImageData(pixels,0,0);return im;
}
class Graphics{
 constructor(seed,onClink){
  this.scale=1;this.world=makeCanvas(960,540);this.c=this.world.getContext('2d',{alpha:false});
  this.coinTable=new CoinTable(seed^0x5e4e,onClink);
  this.effects=new CombatEffects(seed^0x5fe6d);this.lighting=new DeskLights();
  this.film=crtFilm();this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.hover='';this.stage=-1;this.shutter=new Float32Array(5);this.resetVisuals();
 }
 resetVisuals(){
  this.drawer=1;this.shopLift=0;this.pressedAt=-100;this.denyAt=-100;this.boughtAt=-100;this.purchaseSlot=-1;
  this.motion={body:0,bodyV:0,cup:0,cupV:0,die:0,dieV:0};
  this.clock=0;this.effects.reset();this.shutter.fill(0);this.cashChange=null;
 }
 stateReset(g){
  this.resetVisuals();this.stage=g.stage;this.clock=g.time;this.cash=g.cash;this.hp=g.hp;
  this.enemyHp=g.enemyHp;this.shield=g.armor;this.coinTable.reset(g.cash);this.lighting.last=-100;
 }
 event(name,e,g){
  this.effects.event(name,e,g);const now=g.time;
  const impulse=name==='latch'?22:name==='enemyHit'?90:name==='impact'&&e.damage?(e.crit?71:38):name==='payout'?28:0;
  if(impulse&&!this.reduced){
   this.motion.bodyV+=impulse;
   this.motion.cupV+=impulse*.69;
   this.motion.dieV+=impulse*.93;
  }
  if(name==='press')this.pressedAt=now;
  if(name==='deny')this.denyAt=now;
  if(name==='impact'&&e.money){this.coinTable.award(e.money,e.crit?'critical':'coin');this.tally(g,e.money)}
  if(name==='payout'){this.coinTable.award(e.count,'victory');this.tally(g,e.count)}
  if(name==='purchase'){
   this.coinTable.spend(e.cost);this.tally(g,-e.cost);this.boughtAt=now;this.purchaseSlot=e.slot;
  }
 }
 tally(g,amount){
  if(amount<0){this.cash=g.cash;this.cashChange=null;return}
  this.cashChange={start:g.time,from:this.cash,to:g.cash,
   time:Math.max(1,amount)/30};
 }
 update(dt,g){
  this.clock=g.time;
  // Distinct damped oscillators: a bolted cabinet, a glass rocking on its rim and a loose die.
  const m=this.motion;
  m.bodyV-=dt*(1940*m.body+30*m.bodyV);m.body+=dt*m.bodyV;
  m.cupV-=dt*(610*m.cup+13.5*m.cupV);m.cup+=dt*m.cupV;
  m.dieV-=dt*(1140*m.die+10.8*m.dieV);m.die+=dt*m.dieV;
  if(this.stage!==g.stage){this.stage=g.stage;this.enemyHp=g.enemyHp}
  this.coinTable.update(dt);this.effects.step(dt);
  const approach=(a,b,s)=>Math.abs(a-b)<.003?b:lerp(a,b,1-Math.exp(-s*dt));
  this.hp=approach(this.hp,g.hp,13);this.enemyHp=approach(this.enemyHp,g.enemyHp,13);
  this.shield=approach(this.shield,g.armor,14);
  if(this.cashChange){
   const a=this.cashChange,t=clamp((g.time-a.start)/a.time,0,1);
   this.cash=lerp(a.from,a.to,t);if(t>=1){this.cash=a.to;this.cashChange=null}
  }
  const visible=['spin','complete','defeat'].includes(g.phase);
  this.drawer=approach(this.drawer,visible?1:0,18);
  this.shopLift=approach(this.shopLift,g.phase==='shop'?1:0,19);
  for(let i=0;i<5;i++){
   const close=!g.active.includes(i)||['enemyWind','enemyHit','reward','arrival','complete','defeat'].includes(g.phase);
   this.shutter[i]=close?Math.min(1,this.shutter[i]+dt*8.9):Math.max(0,this.shutter[i]-dt*8.1);
  }
 }
 coinLight(g){return Math.max(pulse(g.time-this.effects.payTime,.29),pulse(g.time-this.boughtAt,.21)*.52)}
 drawCoins(c,g){this.coinTable.draw(c,{time:g.time,flash:this.coinLight(g),reduce:this.reduced})}
 display(c,g){
  const x=326,y=54,w=328,h=179,t=g.time,ef=this.effects;
  const dmg=ef.shot?.damage?pulse(t-ef.hitTime,.20):0;
  const hit=this.reduced?dmg*.4:dmg;
  const wind=g.phase==='enemyWind'?Math.sin(Math.PI*Math.min(1,g.age/.64)):0;
  const death=g.phase==='reward'?clamp(g.age/.47,0,1):0;
  c.save();c.beginPath();c.roundRect(x,y,w,h,3);c.clip();
  c.save();c.translate(x,y);
  WorldArt.draw(c,g.foe.id,t,{wind,hit,death,arrival:g.phase==='arrival'?clamp(g.age/.7,0,1):1,reduce:this.reduced});c.restore();
  ef.glass(c,g,this.reduced);
  c.drawImage(this.film,x,y);
  const reflect=c.createLinearGradient(x,y,x+w*.7,y+h);
  reflect.addColorStop(0,'rgba(230,224,182,.081)');reflect.addColorStop(.29,'rgba(241,222,168,.028)');
  reflect.addColorStop(.305,'rgba(241,222,168,.008)');reflect.addColorStop(1,'rgba(225,217,172,0)');
  c.fillStyle=reflect;c.fillRect(x,y,w,h);
  if(g.phase==='arrival'){
   c.fillStyle='rgba(23,25,21,'+clamp(1-g.age/.9,0,1)+')';c.fillRect(x,y,w,h);
   c.globalAlpha=clamp((1.35-g.age)*2,0,1);
   etched(c,'ENTERING',490,115,1.4,'#e5c691','center');
   etched(c,g.foe.place,490,141,2.4,'#ffe4a4','center',300);
  }else if(g.phase==='reward'||g.phase==='complete'||g.phase==='defeat'){
   const reward=g.phase==='reward';c.globalAlpha=reward?clamp((g.age-.24)*3.7,0,1):1;
   if(!reward){c.fillStyle='#171d18ac';c.fillRect(x,y,w,h)}
   etched(c,reward?'VICTORY':g.phase==='defeat'?'GAME OVER':'JOURNEY COMPLETE',490,117,reward?3.1:2.5,'#ffe3a3','center',294);
   etched(c,reward?'+'+g.gain+' COINS':'PRESS TO RESTART',490,153,1.4,'#e5bf85','center');
  }
  c.restore();
 }
 hud(c,g){
  const foeTurn=g.phase==='enemyWind'||g.phase==='enemyHit',shop=g.phase==='shop';
  etched(c,shop?'UPGRADE SHOP':foeTurn?"ENEMY'S TURN":"PLAYER'S TURN",762,72,1.95,shop?'#d6c190':foeTurn?'#dfa373':'#cba86f','center',153);
  const words=(g.log||'SPINNING!').split(/\s+/);let line='',lineIndex=0;
  function write(text){etched(c,text,697,129+lineIndex++*12,1.14,g.time-this.denyAt<.5?'#f0a578':'#b59a69','left',77)}
  for(const word of words){
   if((line+' '+word).trim().length>10&&line){write.call(this,line);line=word}
   else line=(line+' '+word).trim()
  }if(line)write.call(this,line);
  etched(c,Math.round(this.cash),153,316,3.3,'#b3945b','center',61);
  etched(c,'$',153,354,2.5,'#978052','center');
  tube(c,803,128,13,198,this.hp/g.maxHp,'#c6a160',true);
  tube(c,821,128,13,198,this.shield/125,'#a2b890',true);
  etched(c,'+',807,333,1.0,'#b29967','center');etched(c,'S',827,333,1,'#9ca37b','center');
  etched(c,g.hp,822,357,2.15,'#d2b47e','center',46);etched(c,'/'+g.maxHp,822,378,1.4,'#b79e70','center',47);
  if(shop)return;
  tube(c,370,254,276,11,this.enemyHp/g.foe.hp,'#e4af66');
  etched(c,g.enemyHp,351,255,1.35,'#d6bd83','right',31);
  etched(c,'ATK',258,244,.86,'#9d8a65');etched(c,g.foe.power+(g.turn%3===0?5:0),306,243,1.12,'#d0aa72','right');
  etched(c,'TURN',258,255,.86,'#9d8a65');etched(c,g.turn,306,254,1.12,'#b8a67d','right');
 }
 spinner(c,g){
  const cx=XC[g.current],y=426,kind=({bow:'aim',bolt:'ring',charm:'ring',star:'ring'})[g.currentItem]||'bar';
  A().drawer(c,cx-40,410,80,83,pulse(g.time-this.pressedAt,.12),'GO');
  const u=g.needle();c.save();
  // The panel under the GO key follows the active mechanical socket.
  c.fillStyle='#23291e';c.fillRect(cx-32,y+40,64,15);c.strokeStyle='#615b40';c.strokeRect(cx-32.5,y+39.5,65,16);
  if(kind==='ring'){
   c.strokeStyle='#c39651';c.lineWidth=1.5;c.beginPath();c.arc(cx,y+47,5.2,0,Math.PI*2);c.stroke();
   c.strokeStyle='#fff4b8';c.beginPath();c.arc(cx,y+47,2.2+u*4.2,0,Math.PI*2);c.stroke();
  }else{
   c.fillStyle='#77633b';c.fillRect(cx+5,y+43,14,7);
   if(kind==='aim'){
    c.strokeStyle='#d7a45e';c.strokeRect(cx+10,y+43,6,7);c.fillStyle='#f9e9aa';
    c.fillRect(cx-30+u*59,y+41,2,12);c.fillRect(cx-34+u*59,y+47,9,1);
   }else{c.fillStyle='#efd698';c.fillRect(cx-31+Math.round(u*61),y+42,2,11)}
  }
  c.restore();
 }
 board(c,g){
  for(let i=0;i<5;i++){
   const active=g.active.includes(i);
   if(active)ReelArt.draw(c,g,i,{reduced:this.reduced});
   const open=this.shutter[i],x=XC[i]-43;
   if(!active||open>.004){
    c.save();c.beginPath();c.rect(x-1,296,88,100);c.clip();
    A().cap(c,x,295-(1-(active?open:1))*104,86,100);c.restore();
   }
  }
  if(this.drawer>.004){
   const pos=430+(1-this.drawer)*116;
   const down=clamp(pulse(g.time-this.pressedAt,.118)+(this.hover==='action'?.06:0),0,1);
   A().drawer(c,296,pos,394,110,down,g.phase==='complete'||g.phase==='defeat'?'RESTART':'STOP');
  }
  if(g.phase==='skill')this.spinner(c,g);
  if(g.feedback&&g.hit&&g.current>=0){
   const age=g.time-g.feedback.time,hit=g.hit;
   if(age<.69&&hit.crit){
    c.save();c.globalAlpha=clamp((.69-age)*5,0,1)*clamp(age*22,0,1);
    etched(c,hit.mega?'MEGA CRIT!':hit.skill?'Critical Success!':'Critical Hit!',XC[g.current]+12,322-Math.min(11,age*23),1.55,'#fff0bd','center',139);c.restore();
   }
  }
 }
 shop(c,g){
  const lift=1-this.shopLift;
  c.save();c.beginPath();c.rect(326,53,329,182);c.clip();
  const grad=c.createLinearGradient(0,52,0,236);grad.addColorStop(0,'#464732');grad.addColorStop(1,'#252d25');
  c.fillStyle=grad;c.fillRect(326,53,329,182);
  c.translate(0,Math.round(-lift*24));A().plaque(c,338,69,171,35);
  etched(c,'ACTIVE SYMBOLS',424,80,1.53,'#d6bd83','center',148);
  g.pool.forEach((key,i)=>{const x=344+i%6*50,y=120+Math.floor(i/6)*50;
   A().recess(c,x,y,44,44);ReelArt.face(c,key,x+4,y+4,36,36,{iconOnly:true})});
  c.restore();c.drawImage(this.film,326,54);
  A().panel(c,196,274,590,143);
  for(let i=0;i<3;i++){
   const x=338+i*109,y=304+Math.round(lift*26),sold=g.purchases.has(i);
   A().recess(c,x-4,y-5,91,96);
   ReelArt.face(c,g.offers[i],x+1,y+1,79,81,{});
   if(sold){
    c.fillStyle='#17241ac4';c.fillRect(x+1,y+1,79,81);
    etched(c,'SOLD',x+40,y+35,2,'#c4c09d','center');
   }
   if(this.hover==='buy'+i&&!sold||g.focusOffer===i&&!sold){
    c.strokeStyle='#e9b865';c.lineWidth=2.5;c.strokeRect(x-5,y-6,93,98);
   }cornerTag(c,x+64,y-11,g.prices[i],sold);
  }
  const bottom=414+Math.round(lift*95);A().panel(c,115,bottom,742,117);
  const supplies=['gouge','shield','charm'],prices=[5,7,10];
  supplies.forEach((k,i)=>{const x=137+i*94;A().recess(c,x,bottom+10,77,73);
   ReelArt.face(c,k,x+10,bottom+16,54,51,{iconOnly:true});cornerTag(c,x+48,bottom+67,prices[i],false)});
  A().plaque(c,784,bottom+7,65,67);
  c.fillStyle='#ecc47f';c.beginPath();c.moveTo(806,bottom+23);c.lineTo(831,bottom+40);c.lineTo(806,bottom+56);c.fill();
  this.hud(c,g);
 }
 paint(g,portable=false){
  const c=this.c,t=g.time;c.clearRect(0,0,960,540);
  A().desk(c,false,540,this.motion);
  this.drawCoins(c,g);
  c.save();c.translate(this.motion.body*.16,-this.motion.body);
  A().chassis(c);
  if(g.phase==='shop')this.shop(c,g);
  else{this.display(c,g);this.hud(c,g);this.board(c,g)}
  const e=this.effects;
  const v=g.current>=0&&['resolve','skill'].includes(g.phase)?Math.max(.30,pulse(g.age,.36)):.0;
  this.lighting.update(t,g.foe.id,XC[g.current]||490,v,e.impactEnergy(t),e.enemyEnergy(t),this.coinLight(g),g.phase==='shop');
  this.lighting.draw(c);
  const cast=e.enemyEnergy(t),flash=this.coinLight(g);
  if(cast>.035)A().light(c,{x:813,y:341,strength:cast*.99,radius:186,color:'#ffd287',height:59});
  if(flash>.07)A().light(c,{x:282,y:160,strength:flash*.76,radius:105,color:'#ffd884',height:40});
  if(!portable)e.onCase(c,g,this.reduced);
  c.restore();
  if(!portable)A().leafShade(c,t,false,540);
  return this.world;
 }
}
Object.assign(SlotStudy,{Graphics,etched});
})();
