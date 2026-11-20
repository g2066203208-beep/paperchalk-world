/* Playfield effects use the same fixed clock as the reel latch and the coin bodies. */
(() => {
'use strict';
const {clamp,lerp,glow,randomStream}=SlotStudy;
const TAU=2*Math.PI;
const targets={warden:[491,150],egg:[488,169],skeleton:[497,147],guard:[483,157],maw:[490,172],toad:[492,174],reaper:[497,151]};
const castColors={bow:'#f9d188',sword:'#ffdf9a',dagger:'#ffb56e',bolt:'#f6dda8',star:'#e9eca3',gouge:'#f08c68',charm:'#b5db9a'};
function ring(c,x,y,r,color,w=1){
 c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.arc(x,y,Math.max(.1,r),0,TAU);c.stroke();
}
function line(c,points,color,w=1){
 c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);
 c.strokeStyle=color;c.lineWidth=w;c.stroke();
}
function star(c,x,y,r,ink){
 c.fillStyle=ink;c.beginPath();
 for(let i=0;i<8;i++){const a=i*TAU/8,rr=i%2?r*.13:r,px=x+rr*Math.cos(a),py=y+rr*Math.sin(a);
  if(i===0)c.moveTo(px,py);else c.lineTo(px,py)}
 c.closePath();c.fill();
}
function pointLight(c,x,y,rx,ry,ink,level){
 if(level<.004)return;c.save();c.translate(x,y);c.scale(1,ry/rx);glow(c,0,0,rx,ink,level);c.restore();
}
function arcSlash(c,x,y,u,sign,size,ink){
 const rot=sign>0?-.7:.55,length=size*(.38+u*.79);
 c.save();c.translate(x,y);c.rotate(rot);c.scale(1,sign);
 const left=-length*.95,right=length*.92,tipY=length*.14;
 c.beginPath();c.moveTo(left,tipY);c.quadraticCurveTo(-2,-length*.26,right,-tipY);
 c.quadraticCurveTo(0,-length*.08,left,tipY);c.fillStyle=ink;c.fill();
 c.beginPath();c.moveTo(left,tipY);c.quadraticCurveTo(0,-length*.23,right,-tipY);
 c.strokeStyle='#fff5cf';c.lineWidth=1.4;c.stroke();c.restore();
}
function beamCurve(sx,sy,ex,ey,t,i){
 const u=i/15,envelope=Math.sin(Math.PI*u);
 const jitter=(Math.sin(i*5.29+Math.floor(t*32)*1.04)+.48*Math.sin(i*8.07+t*31))*envelope*5.2;
 return [lerp(sx,ex,u)+jitter*.46,lerp(sy,ey,u)-jitter];
}
function chromaticBeam(c,from,to,elapsed,power){
 if(power<.01)return;
 const e=clamp(elapsed/.04,0,1),ex=lerp(from[0],to[0],e),ey=lerp(from[1],to[1],e);
 const path=Array.from({length:16},(_,i)=>beamCurve(...from,ex,ey,elapsed,i));
 c.save();c.lineCap='round';c.lineJoin='bevel';c.globalCompositeOperation='screen';
 for(const [w,color,a] of [[42,'#ad6e32',.19],[23,'#e4913f',.31],[12,'#ffc66b',.62],[5,'#ffe8a0',.92],[1.8,'#ffffe4',1]]){
  c.globalAlpha=power*a;line(c,path,color,w*(.76+.24*power));
 }
 c.globalAlpha=.65*power;
 for(const i of [3,6,9,12]){
  const [x,y]=path[i],sign=i%2?1:-1;
  line(c,[[x,y],[x+sign*5,y-8],[x+sign*11,y-9],[x+sign*17,y-18]],'#ffe9b9',1.4);
 }
 c.restore();
}
function greatsword(c,from,to,age,power){
 const dx=to[0]-from[0],dy=to[1]-from[1],direction=Math.atan2(dy,dx);
 const length=Math.hypot(dx,dy),travel=clamp(age/.095,0,1);
 const distance=length*(.67+.33*(1-(1-travel)**2));
 const tipX=from[0]+Math.cos(direction)*distance,tipY=from[1]+Math.sin(direction)*distance;
 c.save();c.translate(tipX,tipY);c.rotate(direction);
 const blade=length*.62;
 const polygon=(pts,color)=>{c.beginPath();c.moveTo(...pts[0]);for(const k of pts.slice(1))c.lineTo(...k);c.closePath();c.fillStyle=color;c.fill()};
 c.globalCompositeOperation='screen';
 for(const [width,a,color] of [[65,.15,'#e3933e'],[39,.25,'#f5a143'],[19,.5,'#ffc16a']]){
  c.globalAlpha=power*a;line(c,[[-blade-8,0],[-blade*.55,0],[0,0]],color,width);
 }
 c.globalAlpha=power;
 polygon([[-blade,-5],[-blade+21,-10],[-41,-5],[0,0],[-39,6],[-blade+16,11],[-blade,7]],'#ffeab2');
 polygon([[-blade,-5],[-blade+22,-8],[-29,-4],[0,0],[-blade+8,1]],'#fffcd6');
 polygon([[-blade+10,1],[-12,1],[-42,5],[-blade+20,8]],'#ecaa62');
 line(c,[[-blade-7,-20],[-blade+1,-13],[-blade+4,0],[-blade+1,13],[-blade-7,20]],'#ffefc1',4);
 line(c,[[-blade-34,0],[-blade-6,0]],'#e9b77c',7);
 for(let j=0;j<4;j++)line(c,[[-blade-28+j*6,-4],[-blade-24+j*6,4]],'#fff3cf',2);
 c.strokeStyle='#fff1c8';c.lineWidth=3;c.beginPath();c.arc(-blade-42,0,6,0,TAU);c.stroke();
 c.restore();
}
class CombatEffects{
 constructor(seed){this.rng=randomStream(seed);this.reset();}
 reset(){this.particles=[];this.shot=null;this.hitTime=-100;this.enemyTime=-100;this.castAt=-100;this.victoryTime=-100;this.payTime=-100;this.row=-1;this.rowTime=-100;}
 emitParticles(x,y,n,rate,kind,layer){
  if(this.particles.length>280)this.particles.splice(0,this.particles.length-230);
  for(let i=0;i<n;i++){
   const a=this.rng()*TAU,energy=rate*(.18+this.rng()*.82),big=this.rng();
   this.particles.push({x,y,vx:Math.cos(a)*energy,vy:Math.sin(a)*energy-12,age:0,
    life:.16+this.rng()*.42,size:big>.87?2.7:big>.48?1.6:.9,kind,layer,drag:2.0+this.rng()*1.8});
  }
 }
 step(dt){
  let n=0;
  for(const s of this.particles){s.age+=dt;if(s.age>=s.life)continue;
   s.x+=s.vx*dt;s.y+=s.vy*dt;
   const decay=Math.exp(-s.drag*dt);s.vx*=decay;s.vy=s.vy*decay+dt*104;this.particles[n++]=s;
  }this.particles.length=n;
 }
 event(name,e,g){
  const now=g.time,p=targets[g.foe.id]||targets.warden;
  if(name==='phase'&&e.phase==='enemyWind')this.castAt=now+.64-.097;
  if(name==='focus'){this.row=e.i;this.rowTime=now}
  if(name==='payout'){this.victoryTime=this.payTime=now;}
  if(name==='impact'){
   this.shot={...e,pos:p};this.hitTime=now;
   if(e.money)this.payTime=now;
   if(e.damage){this.emitParticles(...p,e.crit?43:15,e.crit?151:91,e.item,'glass')}
   if(e.armor)this.emitParticles(827,309,e.crit?16:7,55,'charm','case');
  }
  if(name==='enemyHit'){
   this.enemyTime=now;this.enemyBlocked=!e.damage;
   this.emitParticles(813,340,e.blocked?34:46,e.damage?162:113,'bolt','case');
  }
 }
 enemyEnergy(time){
  const t=time-this.enemyTime;
  if(t<0||t>.68)return 0;
  if(t<.026)return t/.026;
  if(t<.167)return 1-.07*Math.sin(t*34)**2;
  return Math.exp(-(t-.167)/.071);
 }
 impactEnergy(time){
  const t=time-this.hitTime;if(t<0||t>.58||!this.shot)return 0;
  const kind=this.shot;
  if(kind.damage)return Math.exp(-t/(kind.crit?.17:.089))*(kind.crit?1:.6);
  return Math.exp(-t/.095)*.21;
 }
 particlesOn(c,layer){
  c.save();c.lineCap='square';
  for(const p of this.particles){if(p.layer!==layer)continue;
   const remaining=1-p.age/p.life;c.globalAlpha=Math.min(1,remaining*2.5);
   const color=remaining>.70?'#fff5c9':remaining>.31?(castColors[p.kind]||'#ffe3a9'):'#ae6b3b';
   if(remaining>.68&&p.size>1.5)line(c,[[p.x-p.vx*.014,p.y-p.vy*.014],[p.x,p.y]],color,p.size);
   else{c.fillStyle=color;c.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size)}
  }c.restore();
 }
 glass(c,g,reduce){
  const t=g.time-this.hitTime,s=this.shot;
  if(g.phase==='enemyWind'){
   const a=clamp(g.age/.64,0,1);c.save();
   for(let i=0;i<4;i++){const x=473+i*14,y=81-4*Math.sin(i*1.21);
    c.globalAlpha=clamp(a*2-i*.2,0,1);star(c,x,y,2.1+2.1*a,'#ffefac')}
   c.restore();
  }
  if(s&&t>=0&&t<.66){
   const [x,y]=s.pos,u=t/.54,light=this.impactEnergy(g.time),ink=castColors[s.item]||'#ffe3a0';
   c.save();
   if(s.damage){
    pointLight(c,x,y,s.crit?116:62,s.crit?90:33,ink,light*(reduce?.48:.94));
    const streak=Math.max(0,1-t/(s.crit?.43:.28));c.globalAlpha=streak;
    if(s.item==='sword'||s.item==='dagger'){
     arcSlash(c,x,y,u,1,s.crit?74:49,ink);
     if(s.crit&&t>.065)arcSlash(c,x+5,y+1,Math.min(1,(t-.065)/.38),-1,55,'#ffc88a');
    }else if(s.item==='bow'){
     const tip=x+lerp(-42,22,clamp(t/.18,0,1));
     line(c,[[tip-71,y+19],[tip,y]],'#fff2c3',2);line(c,[[tip-11,y-1],[tip,y],[tip-6,y+7]],ink,2);
    }else if(s.item==='bolt'||s.item==='star'){
     chromaticBeam(c,[x-38,58],[x,y],t,Math.max(streak,light));
     ring(c,x,y,4+u*55,ink,2);if(s.item==='star')star(c,x,y,9+28*u,'#fff1ac');
    }else{
     const curve=[];for(let i=0;i<19;i++){const q=i/18;curve.push([x+(x-550)*q+Math.sin(q*7+u*6)*12,y+q*52]);}
     line(c,curve,'#ec9a6e',2.4);
    }
    c.globalAlpha=light;star(c,x,y,reduce?9:18+(s.crit?22:0),'#fff7d2');
   }
   if(s.armor&&t<.38){
    c.globalAlpha=(.38-t)*2.55;
    for(let i=0;i<2;i++){const r=10+i*4+t*22;line(c,[[x-r,y-2],[x-r*.7,y+7],[x,y+14],[x+r*.7,y+7],[x+r,y-2]],'#d8db9b',1.5);}
   }
   c.restore();
  }
  this.particlesOn(c,'glass');
 }
 onPortrait(c,g,reduce,local){
  const origin=targets[g.foe.id]||targets.warden,from=local('main',origin[0]+13,86),to=local('meter',813,341);
  const age=g.time-this.castAt,blade=age>=0&&age<.57?Math.min(1,age/.021)*Math.exp(-Math.max(0,age-.261)/.073):0;
  const energy=this.enemyEnergy(g.time)*(reduce?.52:1);
  if(blade>.007)greatsword(c,from,to,age,blade*(reduce?.58:1));
  if(energy>.005){
   pointLight(c,...to,64,41,'#ffc97e',energy*.79);
   c.save();c.globalAlpha=energy;star(c,...to,25,'#fff5be');c.restore();
  }
 }
 onCase(c,g,reduce){
  const age=g.time-this.enemyTime,energy=this.enemyEnergy(g.time)*(reduce?.54:1);
  const travelAge=g.time-this.castAt,blade=travelAge>=0&&travelAge<.57?Math.min(1,travelAge/.021)*Math.exp(-Math.max(0,travelAge-.261)/.073):0;
  if(Math.max(energy,blade)>.005){
   const origin=targets[g.foe.id]||targets.warden,from=[origin[0]+13,86],to=[813,341];
   greatsword(c,from,to,travelAge,blade*(reduce?.58:1));
   pointLight(c,to[0],to[1],104,89,'#ffc469',energy*.91);
   c.save();c.globalAlpha=energy;star(c,to[0],to[1],36+13*Math.sin(age*19),'#fff6cb');c.restore();
  }
  const e=Math.max(energy,this.impactEnergy(g.time)*.78);
  if(e>.025||g.phase==='enemyWind'){
   c.save();const wind=g.phase==='enemyWind'?g.age/.64:0;
   const pts=[];
   for(let i=0;i<16;i++)pts.push([332+i*21.5,46]);
   for(let i=0;i<9;i++)pts.push([662,60+i*20.4]);
   for(let i=0;i<16;i++)pts.push([655-i*21.5,239]);
   for(let i=0;i<9;i++)pts.push([318,225-i*20.4]);
   pts.forEach(([x,y],i)=>{
    const trail=((wind*pts.length*2-i)%pts.length+pts.length)%pts.length;
    const chase=wind>0?Math.exp(-trail*.22)*Math.min(1,wind*9):0;
    const a=Math.max(e*.77,chase);
    if(a<.07)return;c.globalAlpha=Math.min(.98,a);
    if(a>.72)pointLight(c,x,y,9,13,'#ebb35e',a*.42);
    c.fillStyle='#efbf72';c.fillRect(x-1,y-1,4,4);
    c.fillStyle='#fff7d7';c.fillRect(x,y,2,2);
   });c.restore();
  }
  this.particlesOn(c,'case');
 }
}
window.CombatEffects=CombatEffects;
})();
