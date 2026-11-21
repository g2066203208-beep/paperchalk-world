/* Work coin pusher · independent arcade experiment.
   Uses original CoinTable.make and CoinTable.draw for every visible coin.
   Work's coin-art.js, cabinet-art.js, and original game are NOT modified. */
(() => {
'use strict';
const W=960,H=540,TAU=Math.PI*2;
const $=id=>document.getElementById(id);
const canvas=$('screen'),ctx=canvas.getContext('2d',{alpha:false});
const {clamp,label}=window.SlotStudy;
const Art=window.CabinetArt;
const G={x:223,y:133,left:231,right:729,front:375,pushBack:179};
const camera={x:0,y:0,shake:0};
const R=(seed)=>{let a=seed>>>0;return ()=>{a+=0x6d2b79f5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};};
const rand=R(20261121);
const coins=new window.CoinTable(20261121,e=>coinSound(e));
let discs=[],credits=72,prize=0,inserted=0,dropX=485,clock=0,accum=0,front=196,oldFront=196,frontV=0,auto=false,paused=false,gameOver=false;
let rumble=0,flash=0,bursts=[],collecting=[],toneClock=0,towerBroken=0,towerBreakingStarted=false;
let audio=null,clickAt=0, last=0,seed=1, frameCount=0, fps=60, frameT=0, frames=0;
const MAX=68,TARGET=24,STEP=1/180;
const mouse={down:false,x:480,y:250};
function sound(freq=780,strength=.3,metal=true){
 try{
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  audio=audio||new AC();if(audio.state==='suspended')audio.resume();
  const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
  osc.type=metal?'triangle':'sine';osc.frequency.setValueAtTime(freq,t);
  if(metal)osc.frequency.exponentialRampToValueAtTime(Math.max(100,freq*.61),t+.08);
  gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(Math.max(.001,Math.min(.11,strength*.10)),t+.008);
  gain.gain.exponentialRampToValueAtTime(.001,t+.11);
  osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.115);
 }catch(e){}
}
function coinSound(e){if(e.power>.08)sound(e.frequency||1450,e.power,true);}
function poly(points,color,stroke,width=1){
 ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
 ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function quad(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function gradient(x,y,w,h,colors){
 const g=ctx.createLinearGradient(x,y,x+w,y+h);
 for(const [p,col] of colors)g.addColorStop(p,col);return g;
}
function text(str,x,y,size=2,color='#e9cb8e',align='left'){label(ctx,String(str),x,y,size,color,align);}
function border(x,y,w,h,r=2){
 ctx.strokeStyle='#ae966a';ctx.lineWidth=r;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
 ctx.strokeStyle='rgba(13,26,17,.8)';ctx.lineWidth=.7;ctx.strokeRect(x+3.5,y+3.5,w-7,h-7);
}
function sparkle(x,y,energy=1,n=8){
 for(let i=0;i<n;i++){const a=rand()*TAU,s=40+rand()*125;
  bursts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,age:0,life:.15+rand()*.25,power:energy});
 }
 if(bursts.length>180)bursts.splice(0,bursts.length-180);
}
function qm(q,p){return [q[3]*p[0]+q[0]*p[3]+q[1]*p[2]-q[2]*p[1],q[3]*p[1]-q[0]*p[2]+q[1]*p[3]+q[2]*p[0],q[3]*p[2]+q[0]*p[1]-q[1]*p[0]+q[2]*p[3],q[3]*p[3]-q[0]*p[0]-q[1]*p[1]-q[2]*p[2]];}
function axis(x,y,z,angle){let m=Math.hypot(x,y,z)||1,s=Math.sin(angle*.5)/m;return [s*x,s*y,s*z,Math.cos(angle*.5)];}
function mat(q){const [x,y,z,w]=q;return [1-2*(y*y+z*z),2*(x*y-w*z),2*(x*z+w*y),2*(x*y+w*z),1-2*(x*x+z*z),2*(y*z-w*x),2*(x*z-w*y),2*(y*z+w*x),1-2*(x*x+y*y)];}
function rotation(b,h,amount=1){
 const spin=Math.hypot(b.wx,b.wy,b.wz);
 if(spin*amount*h>.00001){
  b.q=qm(axis(b.wx,b.wy,b.wz,spin*h*amount),b.q);
  let v=Math.hypot(...b.q)||1;b.q=b.q.map(u=>u/v);b.matrix=mat(b.q);
 }
 b.height=b.r*(Math.sqrt(Math.max(0,1-b.matrix[8]*b.matrix[8]))+.134*Math.abs(b.matrix[8]));
}
/*
 * IMPORTANT: The complete original WORK CoinTable solver is reused here.
 * CoinTable.update() -> CoinTable.step() -> contact()/pairs()/rotate()/bounds().
 * We override only cabinet geometry in bounds and add a moving plunger.
 * All original 3D coin support, angular momentum, face settlement, rendering
 * and contact impulse code remains in ../coin-art.js unchanged.
 */
const fallers=[];
function setPose(b,q){
 b.q=q;b.matrix=mat(q);const z=b.matrix[8];
 b.height=b.r*(Math.sqrt(Math.max(0,1-z*z))+.134*Math.abs(z));
}
function addCoin(x,y,kind='pile',below=null){
 const b=coins.make(1,0);b.x=x;b.y=y;b.kind=kind;
 setPose(b,qm(axis(0,0,1,rand()*TAU),axis(1,0,0,(rand()-.5)*.15)));
 b.base=below?below.z+below.height:0;
 b.z=b.base+b.height;b.support=below?below.id:0;
 b.vx=b.vy=b.vz=b.wx=b.wy=b.wz=0;
 b.mode='rest';b.firstHit=null;b.age=0;
 b.tower=kind==='tower';b.towerFree=false;
 coins.discs.push(b);discs=coins.discs;return b;
}
function build(){
 coins.reset(0);discs=coins.discs;fallers.length=0;
 credits=72;prize=0;inserted=0;clock=0;accum=0;
 front=196;oldFront=196;frontV=0;auto=false;paused=false;gameOver=false;
 rumble=0;flash=0;bursts=[];collecting=[];towerBroken=0;towerBreakingStarted=false;dropX=485;
 const positions=[
  [257,284],[288,314],[319,273],[349,327],[376,287],[405,341],
  [449,347],[480,334],[517,347],[566,334],[604,282],[650,319],[686,280],
  [265,355],[323,358],[390,361],[589,360],[667,355],
  [290,241],[354,244],[416,255],[558,254],[637,236]
 ];
 for(const [x,y] of positions)addCoin(x,y,'pile');
 // The tower is not held up by an artificial per-tier height flag.
 // Each coin references an actual lower coin, exactly like Work reset().
 const tiers=[];
 for(let tier=0;tier<5;tier++){
  const radius=[22,19,15,10,4][tier],count=[5,5,5,4,2][tier];
  const level=[];
  for(let i=0;i<count;i++){
   const angle=TAU*i/count+(tier%2)*.23;
   const x=480+Math.cos(angle)*radius,y=278+Math.sin(angle)*radius*.72;
   const below=tier===0?null:tiers[tier-1].reduce((best,c)=>!best||Math.hypot(c.x-x,c.y-y)<Math.hypot(best.x-x,best.y-y)?c:best,null);
   const coin=addCoin(x,y,'tower',below);level.push(coin);
  }
  tiers.push(level);
 }
 // Preserve the original world's 240-Hz stepped solver, including stack
 // supports, actual 3D rim heights, pair contacts and quaternion rotation.
 // Only bounds/overflow differ from the old felt tray.
 coins.bounds=pusherBounds;
}
function dropped(){
 if(paused||credits<1||gameOver||coins.discs.length>=MAX)return false;
 credits--;inserted++;
 const b=addCoin(clamp(dropX+(rand()-.5)*11,248,714),155,'drop');
 b.mode='air';b.firstHit=null;
 b.z=68+rand()*28;b.y=151+b.z*.67;
 b.vz=-60-rand()*140;b.vy=155+rand()*180;b.vx=(rand()-.5)*210;
 b.wx=(rand()-.5)*32;b.wy=(rand()-.5)*43;b.wz=(rand()-.5)*23;
 setPose(b,qm(axis(0,0,1,rand()*TAU),axis(1,.33,0,1.1+rand()*2)));
 sparkle(b.x,132,.5,5);sound(1220,.28);
 flash=Math.max(flash,.34);return true;
}
function pusherBounds(b){
 if(b.mode==='gone')return;
 const moving=b.mode!=='rest';
 const limL=G.left+b.r*.7,limR=G.right-b.r*.7;
 let wallSpeed=0;
 if(b.x<limL){wallSpeed=Math.abs(b.vx);b.x=limL;b.vx=Math.abs(b.vx)*.26;}
 if(b.x>limR){wallSpeed=Math.abs(b.vx);b.x=limR;b.vx=-Math.abs(b.vx)*.26;}
 if(b.y<G.y+b.r*.48){wallSpeed=Math.max(wallSpeed,Math.abs(b.vy));b.y=G.y+b.r*.48;b.vy=Math.abs(b.vy)*.27;}
 if(wallSpeed>100){coins.sound('wall',b,wallSpeed/700);b.wz+=(rand()-.5)*wallSpeed*.018;}
 if(b.y>G.front+1 && b.firstHit!==null){
  const falling={...b,q:b.q.slice(),matrix:b.matrix.slice(),mode:'air',vz:-60-rand()*85,vy:Math.max(130,b.vy+90),fallAge:0,scored:false};
  fallers.push(falling);b.mode='gone';b.value=0;
  coins.sound('wall',b,.44);
  return;
 }
 // Gravity-like slope affects sliding coins, not static stacks.
 if(moving && b.mode==='roll' && b.y>238)b.vy+=.08;
}
function step(h){
 clock+=h;oldFront=front;
 front=192+38*Math.sin(clock*3.32);frontV=(front-oldFront)/h;
 // The pusher is an actual moving contact boundary; the normal
 // impulse propagates through Work's unmodified CoinTable.pairs().
 if(frontV>0){
  for(const b of coins.discs){
   if(b.mode==='air'||b.mode==='gone'||b.mode==='spend')continue;
   if(b.x<G.left+2||b.x>G.right-2||b.y<G.y||b.y>G.front)continue;
   const lip=front+b.r*.76;
   if(b.y<lip && b.y>front-20){
    b.y=lip;
    b.vy=Math.max(b.vy,frontV*.92+29);
    b.mode='roll';b.firstHit=b.firstHit??(coins.time-.24);
    b.wx+=frontV*.012;b.wz+=(rand()-.5)*.5;
   }
  }
 }
 // This is the original fixed-step 3D body solver, NOT an imitation.
 coins.update(h);
 discs=coins.discs;
 for(const b of discs){
  if(b.tower && !b.towerFree && b.mode!=='rest'){
   b.towerFree=true;towerBreakingStarted=true;towerBroken++;
   sparkle(b.x,b.y-b.z*.67,.38,3);
  }
 }
 for(let i=fallers.length-1;i>=0;i--){
  const b=fallers[i];b.fallAge+=h;
  b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h-.5*2600*h*h;b.vz-=2600*h;
  b.q=qm(axis(b.wx,b.wy,b.wz,Math.hypot(b.wx,b.wy,b.wz)*h),b.q);
  let len=Math.hypot(...b.q)||1;setPose(b,b.q.map(v=>v/len));
  if(b.y>449 || b.fallAge>1.1){
   if(b.x>G.left+12 && b.x<G.right-12){
    prize++;collecting.push({x:b.x,y:442,age:0});
    sparkle(clamp(b.x,363,635),445,.85,9);sound(1300+rand()*700,.55);
    flash=Math.max(flash,.75);
   }
   fallers.splice(i,1);
  }
 }
 for(const p of collecting)p.age+=h;
 collecting=collecting.filter(p=>p.age<1.3);
 for(const p of bursts){p.age+=h;p.x+=p.vx*h;p.y+=p.vy*h;p.vy+=170*h;p.vx*=Math.exp(-2*h);}
 bursts=bursts.filter(p=>p.age<p.life);
 rumble=Math.max(0,rumble-9*h);flash=Math.max(0,flash-1.8*h);
 if(prize>=TARGET)gameOver=true;
}
function press(){
 dropped();
}
function fixed(dt){
 accum=Math.min(.25,accum+dt);
 let count=0;while(accum>=STEP && count<12){if(!paused)step(STEP);accum-=STEP;count++;}
 if(auto&&!paused&&!gameOver&&clock-clickAt>.20&&credits>0&&discs.length<MAX-2){dropX=340+rand()*270;press();clickAt=clock;}
}
function stageBase(){
 // The exact Work wood desk generator, original tabletop props and cast-metal primitives.
 Art.desk(ctx,false,540,{cup:Math.sin(clock)*.17,die:0});
 ctx.save();ctx.globalAlpha=.45;ctx.fillStyle='#060b08';
 ctx.beginPath();ctx.ellipse(489,483,348,28,0,0,TAU);ctx.fill();ctx.restore();
 Art.plaque(ctx,172,20,617,497);
 Art.panel(ctx,186,35,591,458);
 Art.plaque(ctx,191,39,581,444);
 // Main front-panel glass aperture, wide and high, almost no ornamental wings.
 Art.recess(ctx,214,77,537,344);
 ctx.save();
 ctx.beginPath();ctx.rect(G.left-5,G.y-11,G.right-G.left+10,G.front-G.y+35);ctx.clip();
 quad(225,117,518,284,gradient(225,112,0,281,[[0,'#0d1715'],[.28,'#232e25'],[.69,'#2b3228'],[1,'#101815']]));
 // Work-like inked steel with hammered micro-ruling and directional light.
 for(let y=G.y;y<G.front;y+=12){
  ctx.strokeStyle=y%24<12?'rgba(184,148,90,.052)':'rgba(8,23,17,.15)';
  ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(230,y);ctx.lineTo(733,y);ctx.stroke();
 }
 for(let x=G.left;x<G.right;x+=19){
  ctx.strokeStyle='rgba(180,159,106,.037)';
  ctx.beginPath();ctx.moveTo(x,122);ctx.lineTo(x+26,G.front);ctx.stroke();
 }
 // Raised rear shelf; the brass plunger itself advances and retracts each stroke.
 quad(G.left-2,130,G.right-G.left+4,front-131,gradient(G.left,130,0,front-130,
  [[0,'#1f2c25'],[.25,'#525544'],[.74,'#38463a'],[1,'#8e7b52']]));
 for(let x=235;x<727;x+=27){
  quad(x,143,1,Math.max(1,front-154),'rgba(180,177,119,.15)');
 }
 ctx.save();ctx.shadowColor='#060906';ctx.shadowBlur=11;ctx.shadowOffsetY=6;
 quad(231,front-8,498,14,gradient(231,front-8,0,16,
  [[0,'#ac9665'],[.13,'#746744'],[.51,'#3b4537'],[.85,'#a18c5c'],[1,'#30352a']]));
 ctx.restore();
 quad(235,front-8,490,1,'rgba(253,225,153,.44)');
 // Fixed base, visible mechanical coin chute beyond the near edge.
 quad(226,377,518,25,gradient(226,377,0,25,[[0,'#121b16'],[.20,'#555139'],[.56,'#222b22'],[1,'#0b1210']]));
 for(let x=253;x<729;x+=32){quad(x,384,14,2,'#6f6445');quad(x+2,389,10,1,'#9a875b');}
 ctx.restore();
 // Coin entry funnel and aim runner: visible at the top of the glass.
 Art.panel(ctx,282,97,402,34);
 Art.recess(ctx,300,104,366,22);
 quad(315,114,333,4,'#111714');
 ctx.fillStyle='#cfb57d';ctx.fillRect(dropX-14,109,28,2);
 ctx.fillStyle='#eed19b';ctx.fillRect(dropX-2,109,4,7);
 Art.bolt(ctx,224,80,2.6);Art.bolt(ctx,744,80,2.6);
 Art.bolt(ctx,224,413,2.6);Art.bolt(ctx,744,413,2.6);
}
function glass(){
 ctx.save();ctx.beginPath();ctx.rect(219,87,528,329);ctx.clip();
 // Work drinking-glass optical language: glass edge, glints and warm room reflections.
 ctx.globalCompositeOperation='screen';
 const edge=gradient(219,90,527,300,[[0,'rgba(224,215,158,.17)'],[.2,'rgba(77,124,99,.025)'],[.47,'rgba(188,184,139,.025)'],[1,'rgba(244,194,110,.09)']]);
 quad(219,87,528,329,edge);
 ctx.strokeStyle='rgba(223,206,153,.39)';ctx.lineWidth=1.5;ctx.strokeRect(219,87,528,329);
 ctx.strokeStyle='rgba(85,107,82,.45)';ctx.lineWidth=1;ctx.strokeRect(222,90,522,323);
 poly([[229,90],[247,90],[339,406],[331,406]],'rgba(234,242,213,.038)');
 poly([[628,89],[636,89],[713,410],[702,410]],'rgba(252,230,166,.031)');
 ctx.restore();
}
function fallingCoins(){
 coins.discs=discs.concat(fallers);
 ctx.save();ctx.beginPath();ctx.rect(218,101,529,348);ctx.clip();
 coins.draw(ctx,{time:clock,light:{x:370+23*Math.sin(clock*.13),y:109+20*Math.cos(clock*.15)},flash});
 coins.discs=discs;
 ctx.restore();
 for(const p of bursts){
  const u=1-p.age/p.life;
  ctx.globalAlpha=Math.max(0,u*.95);ctx.fillStyle=u>.5?'#fff2be':'#d5a459';
  ctx.fillRect(p.x,p.y,u>.6?2.2:1.1,u>.6?2.2:1.1);
 }
 ctx.globalAlpha=1;
 for(const p of collecting){
  const t=p.age;
  ctx.save();ctx.globalAlpha=Math.max(0,1-t/1.3);
  ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(clamp(p.x,380,630),453,0,clamp(p.x,380,630),453,28);
  g.addColorStop(0,'rgba(252,216,122,.65)');g.addColorStop(1,'rgba(205,145,39,0)');
  ctx.fillStyle=g;ctx.fillRect(clamp(p.x,380,630)-28,426,56,56);ctx.restore();
 }
}
function controls(){
 Art.plaque(ctx,205,38,558,42);
 text('THE BRASS TOWER',475,49,2.4,'#ebd6a5','center');
 text('WORK  /  COIN PUSHER',475,69,1,'#a9aa80','center');
 // A real metal catch tray and numeric mechanical odometers.
 Art.panel(ctx,202,429,546,70);Art.recess(ctx,210,440,536,49);
 Art.plaque(ctx,212,445,158,38);Art.plaque(ctx,377,445,182,38);
 Art.plaque(ctx,567,445,166,38);
 text('CREDITS',221,453,1.15,'#b8ab7d');
 text(String(credits).padStart(3,'0'),353,451,2.2,'#f6dc96','right');
 text('COLLECT',390,453,1.15,'#b8ab7d');
 text(String(prize).padStart(3,'0'),543,451,2.2,'#f6dc96','right');
 text('GOAL  '+TARGET,579,452,1.25,'#e4d6a2');
 const prog=Math.min(1,prize/TARGET);
 quad(579,468,140,4,'#171f18');quad(580,469,Math.round(138*prog),2,'#d9ab62');
 // Side panel holds one beautiful electromechanical DROP control.
 Art.plaque(ctx,765,92,112,313);
 Art.panel(ctx,780,117,84,72);Art.recess(ctx,791,128,60,50);
 text('AIM',820,137,1.65,'#eedaa5','center');
 text('LEFT',820,161,1.25,'#a5a580','center');
 Art.panel(ctx,778,220,86,72);
 ctx.save();ctx.shadowColor='#d9943d';ctx.shadowBlur=12;ctx.shadowOffsetY=3;
 Art.drawer(ctx,785,229,72,51,0,'DROP');ctx.restore();
 Art.panel(ctx,779,303,83,39);
 text(auto?'AUTO ON':'AUTO OFF',820,317,1.2,auto?'#f4d491':'#b6ad87','center');
 Art.panel(ctx,782,357,78,37);text(paused?'RESUME':'PAUSE',820,370,1.14,'#d7b784','center');
 text('TURN COIN',820,202,.97,'#9f9e78','center');
 Art.bolt(ctx,773,101,2.8);Art.bolt(ctx,869,101,2.8);
 Art.bolt(ctx,773,394,2.8);Art.bolt(ctx,869,394,2.8);
 // Hand-run plunger drive and intake chute behind the plate.
 for(const x of [237,253,714,728]){quad(x,400,7,12,'#9e875a');quad(x+1,405,5,6,'#3e442e');}
 if(gameOver){
  ctx.save();ctx.fillStyle='rgba(8,16,12,.70)';ctx.fillRect(283,197,378,90);
  Art.plaque(ctx,295,208,354,65);
  text('TOWER CLEARED',472,224,2.25,'#f5d79a','center');
  text('PRESS R TO PLAY AGAIN',472,252,1.34,'#d9c092','center');
  ctx.restore();
 }
}
function draw(){
 ctx.save();ctx.setTransform(1,0,0,1,0,0);
 ctx.clearRect(0,0,W,H);
 ctx.translate(camera.shake?(rand()-.5)*camera.shake:0,camera.shake?(rand()-.5)*camera.shake:0);
 stageBase();fallingCoins();glass();controls();
 // Top lighting, an optical edge on Work's weathered castings.
 if(flash>.01){
  ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=flash*.15;
  quad(205,58,552,438,gradient(205,58,120,300,[[0,'rgba(254,212,112,0)'],[.5,'rgba(255,196,85,.19)'],[1,'rgba(225,148,46,0)']]));
  ctx.restore();
 }
 Art.leafShade(ctx,clock,false,540);
 ctx.restore();
}
function animate(time){
 if(!last)last=time;const dt=Math.min(.05,(time-last)/1000);last=time;
 frameT+=dt;frames++;if(frameT>.75){fps=Math.round(frames/frameT);frames=0;frameT=0;}
 fixed(dt);camera.shake=rumble;draw();frameCount++;
 requestAnimationFrame(animate);
}
function pointer(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
function interact(x,y){
 if(x>775&&y>215&&y<300){press();return;}
 if(x>775&&y>295&&y<356){auto=!auto;clickAt=clock;return;}
 if(x>775&&y>357&&y<408){paused=!paused;return;}
 if(x>786&&y>118&&y<197){dropX=clamp(dropX+(x<820?-42:42),G.left+20,G.right-20);sound(490,.16,false);return;}
 if(y>95&&y<421&&x>=G.left&&x<=G.right){dropX=clamp(x,G.left+20,G.right-20);return;}
}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();const p=pointer(e);interact(p.x,p.y);});
window.addEventListener('keydown',e=>{
 if(e.code==='Space'||e.code==='Enter'){e.preventDefault();press();}
 if(e.code==='KeyA'||e.code==='ArrowLeft'){e.preventDefault();dropX=clamp(dropX-30,G.left+20,G.right-20);}
 if(e.code==='KeyD'||e.code==='ArrowRight'){e.preventDefault();dropX=clamp(dropX+30,G.left+20,G.right-20);}
 if(e.code==='KeyR')build();
 if(e.code==='KeyP')paused=!paused;
 if(e.code==='KeyF')auto=!auto;
});
build();requestAnimationFrame(animate);
window.CoinPusherQA={
 state:()=>({credits,prize,inserted,coins:discs.length,tower:towerBroken,stacked:discs.filter(b=>b.support>0).length,airborne:discs.filter(b=>b.mode==='air').length,fallers:fallers.length,nativeFixedPhysics:!!coins.step&&!!coins.contact&&!!coins.pairs,nativeTime:Math.round(coins.time*100)/100,front:Math.round(front),time:Math.round(clock*100)/100,fps,auto,paused,gameOver,visibleSprites:discs.filter(b=>b.sprite&&b.buf&&b.buf.data.some((v,i)=>i%4===3&&v>0)).length,badMatrices:discs.filter(b=>b.matrix.length!==9||!Number.isFinite(b.z)||!Number.isFinite(b.height)).length}),
 drop:()=>dropped(),reset:()=>build(),setAim:x=>{dropX=clamp(x,G.left+20,G.right-20);},
 auto:on=>{auto=!!on;clickAt=clock;},pause:on=>{paused=!!on;}
};
})();
