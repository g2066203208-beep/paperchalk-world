/* Slots & Daggers reference study — independently built, original WebGL coins.
 * Solid extruded disks, milled edges, rotating environment highlights,
 * particle gravity, rebound, shadow and bright physical clinks.
 * No screenshots, original sprites or assets are used as effects.
 */
(function(){
"use strict";
if(window.PaperchalkCoinCascade)return;
const TAU=Math.PI*2;
const vs=[
 "attribute vec3 aPos,aNormal; attribute float aPart;",
 "uniform vec2 uViewport,uCenter;uniform float uSize,uSpin,uRoll,uTilt,uFloor,uShadow;",
 "varying vec3 vNormal,vLocal;varying float vPart,vShadow;",
 "void main(){",
 "float cs=cos(uSpin),sn=sin(uSpin),ct=cos(uTilt),st=sin(uTilt),cr=cos(uRoll),sr=sin(uRoll);",
 "mat3 ry=mat3(cs,0.,-sn,0.,1.,0.,sn,0.,cs);",
 "mat3 rx=mat3(1.,0.,0.,0.,ct,st,0.,-st,ct);",
 "mat3 rz=mat3(cr,sr,0.,-sr,cr,0.,0.,0.,1.);",
 "mat3 m=rz*rx*ry;",
 "vec3 p=m*aPos; vNormal=normalize(m*aNormal);vLocal=aPos;vPart=aPart;vShadow=uShadow;",
 "vec2 pixel=uShadow>.5?vec2(uCenter.x+aPos.x*uSize*1.35,uFloor-aPos.y*uSize*.27):uCenter+vec2(p.x,-p.y)*uSize;",
 "gl_Position=vec4(pixel.x/uViewport.x*2.-1.,1.-pixel.y/uViewport.y*2.,0.,1.);",
 "}"
].join("\n");
const fs=[
 "precision highp float;",
 "varying vec3 vNormal,vLocal;varying float vPart,vShadow;",
 "uniform float uTime,uOpacity,uGlint;",
 "void main(){",
 "if(vShadow>.5){float r=length(vLocal.xy);float a=(1.-smoothstep(.05,.97,r))*.31*uOpacity;gl_FragColor=vec4(.009,.021,.024,a);return;}",
 "vec3 n=normalize(vNormal);vec3 view=vec3(0.,0.,1.);",
 "vec3 key=normalize(vec3(-.64,.78,.83));vec3 fill=normalize(vec3(.84,-.24,1.));",
 "float lit=max(dot(n,key),0.);float fillLit=max(dot(n,fill),0.);",
 "float reflKey=max(dot(reflect(-key,n),view),0.);float reflFill=max(dot(reflect(-fill,n),view),0.);",
 "float broad=pow(reflKey,11.);float narrow=pow(reflKey,78.);float rimFlash=pow(reflFill,88.);",
 "float softbox=pow(max(dot(n,normalize(vec3(-.24,.12,1.))),0.),34.);",
 "float movingStrip=pow(max(dot(n,normalize(vec3(.66+.09*sin(uTime*1.7+uGlint),.27,1.))),0.),88.);",
 "float fresnel=pow(1.-abs(dot(n,view)),3.);",
 "float r=length(vLocal.xy);float theta=atan(vLocal.y,vLocal.x);",
 "vec3 goldShadow=vec3(.255,.137,.031),goldMid=vec3(.80,.50,.115),goldHigh=vec3(1.,.86,.43);",
 "vec3 metal=mix(goldShadow,goldMid,clamp(.23+.72*lit+.22*fillLit,0.,1.));",
 "metal=mix(metal,goldHigh,clamp(.52*softbox+.52*broad,0.,.92));",
 "metal+=vec3(.87,.86,.73)*narrow*1.22+vec3(.89,.94,.85)*rimFlash*1.15;",
 "metal+=vec3(.93,.90,.70)*movingStrip*.72;",
 "metal+=vec3(.28,.24,.16)*fresnel;",
 "float rim=step(1.5,vPart)*step(vPart,2.5);",
 "float bevel=step(.5,vPart)*step(vPart,1.5);",
 "float reverseFace=step(2.5,vPart);",
 "if(rim>.5){",
 " float milling=.65+.29*pow(abs(sin(theta*44.)),3.);",
 " metal=metal*(.78+.19*milling)+vec3(.20,.14,.055)*milling;",
 " metal+=vec3(.21,.17,.11)*pow(max(dot(n,fill),0.),22.);",
 "}",
 "if(bevel>.5)metal+=vec3(.10,.074,.025)+vec3(.18,.16,.11)*broad;",
 "if(reverseFace>.5)metal=mix(metal,metal*.58,clamp(.37-.22*lit,0.,1.));",
 "if(vPart<.5){",
 " float embossOuter=(1.-smoothstep(.018,.042,abs(r-.67)))*.20;",
 " float embossInner=(1.-smoothstep(.020,.040,abs(r-.53)))*.25;",
 " float engraved=(1.-smoothstep(.011,.025,abs(r-.34)))*.19;",
 " float rosette=cos(theta*12.)*(1.-smoothstep(.23,.37,r))*.052;",
 " float brushed=sin(r*153.+theta*16.)*.014+cos(vLocal.x*91.)*.010;",
 " metal+=vec3(.33,.26,.10)*(embossOuter+embossInner+engraved+rosette)+brushed;",
 "}",
 "metal=clamp(metal,0.,1.);",
 "gl_FragColor=vec4(metal,uOpacity);",
 "}"
].join("\n");function shader(gl,type,code){
 const obj=gl.createShader(type);gl.shaderSource(obj,code);gl.compileShader(obj);
 if(!gl.getShaderParameter(obj,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(obj));return obj;
}
function link(gl){
 const p=gl.createProgram();
 gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));
 gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
}
function makeMesh(){
 const v=[],seg=44;
 function vertex(x,y,z,nx,ny,nz,part){v.push(x,y,z,nx,ny,nz,part);}
 function tri(a,b,c,part){for(const t of [a,b,c])vertex(...t,part)}
 function strip(a,b,c,d,part){tri(a,b,c,part);tri(a,c,d,part)}
 function pt(angle,r,z,nRad,nz){return [Math.cos(angle)*r,Math.sin(angle)*r,z,Math.cos(angle)*nRad,Math.sin(angle)*nRad,nz]}
 for(let i=0;i<seg;i++){
  const a=i/seg*TAU,b=(i+1)/seg*TAU;
  tri([0,0,.137,0,0,1],pt(a,.79,.137,0,1),pt(b,.79,.137,0,1),0);
  strip(pt(a,.79,.137,.1,.99),pt(a,.94,.104,.54,.84),pt(b,.94,.104,.54,.84),pt(b,.79,.137,.1,.99),1);
  strip(pt(a,.94,.104,.94,.35),pt(a,1,.058,1,0),pt(b,1,.058,1,0),pt(b,.94,.104,.94,.35),1);
  strip(pt(a,1,.058,1,0),pt(a,1,-.058,1,0),pt(b,1,-.058,1,0),pt(b,1,.058,1,0),2);
  strip(pt(a,1,-.058,1,0),pt(a,.84,-.135,.52,-.85),pt(b,.84,-.135,.52,-.85),pt(b,1,-.058,1,0),2);
  tri([0,0,-.137,0,0,-1],pt(b,.84,-.137,0,-1),pt(a,.84,-.137,0,-1),3);
 }
 return new Float32Array(v);
}
function shadowMesh(){
 const v=[],seg=40;for(let i=0;i<seg;i++){for(const a of [-1,i/seg*TAU,(i+1)/seg*TAU]){let x=a===-1?0:Math.cos(a),y=a===-1?0:Math.sin(a);v.push(x,y,0,0,0,1,0);}}return new Float32Array(v);
}
const rand=(a,b)=>a+Math.random()*(b-a);
function makeRng(seed){let n=seed>>>0;return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const PAYOUT={emitInterval:.0077,gravity:1510,gatherStart:2.08,gatherDuration:.67,finish:2.86,step:1/120};
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>t*t*(3-2*t);
let cv=null,gl=null,p=null,buf=null,sbuf=null,meshCount=0,shadowCount=0,loc=null,attrib=null;
let particles=[],sparks=[],raf=0,last=0,accumulator=0,simTime=0,frame=0,played=0,ctx=null,soundEnabled=()=>true,lastClink=0;
let startParticles=[],lastBurst=null,pausedForFrame=false,silentPhysics=false;
let glints=null,gctx=null,glintCount=0,hitCount=0,phase="idle",seedUsed=0,glowStrength=0;
let status="idle",fallingActive=false,burstSound=true;
const reduce=()=>window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
function audioContext(){
 try{if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(C)ctx=new C();}if(ctx&&ctx.state==="suspended")ctx.resume().catch(()=>{});}catch(_){}
}
function clink(weight=1){
 if(!burstSound||!soundEnabled()||!ctx||ctx.state!=="running")return;
 const now=performance.now();if(now-lastClink<24)return;lastClink=now;
 try{
  const t=ctx.currentTime,base=rand(870,1460);
  for(let k=0;k<3;k++){
   const osc=ctx.createOscillator(),gain=ctx.createGain(),f=ctx.createBiquadFilter();
   osc.type=k===2?"sine":"triangle";osc.frequency.setValueAtTime(base*[1,2.09,3.73][k],t);
   osc.frequency.exponentialRampToValueAtTime(base*[.91,1.93,3.35][k],t+.09);
   f.type="highpass";f.frequency.value=480;
   gain.gain.setValueAtTime(.0001,t);
   gain.gain.exponentialRampToValueAtTime((k===0?.019:.009)*weight,t+.004);
   gain.gain.exponentialRampToValueAtTime(.0001,t+rand(.085,.15));
   osc.connect(f);f.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.17);
  }
 }catch(_){}
}
function init(){
 if(cv)return true;
 cv=document.createElement("canvas");cv.className="paperchalk-coin-webgl";
 Object.assign(cv.style,{position:"fixed",inset:"0",width:"100vw",height:"100dvh",pointerEvents:"none",zIndex:"2147483200",display:"block"});
 document.body.append(cv);
 glints=document.createElement("canvas");
 glints.className="paperchalk-coin-glints";
 Object.assign(glints.style,{position:"fixed",inset:"0",width:"100vw",height:"100dvh",
  pointerEvents:"none",zIndex:"2147483201",mixBlendMode:"screen"});
 document.body.append(glints);gctx=glints.getContext("2d");
 gl=cv.getContext("webgl",{alpha:true,antialias:true,depth:false,premultipliedAlpha:false,preserveDrawingBuffer:location.pathname.endsWith("/coin-fx-lab.html")});
 if(!gl){status="webgl-unavailable";cv.remove();cv=null;return false;}
 try{
  p=link(gl);gl.useProgram(p);
  loc={};for(const k of ["uViewport","uCenter","uSize","uSpin","uRoll","uTilt","uFloor","uShadow","uTime","uOpacity","uGlint"])loc[k]=gl.getUniformLocation(p,k);
  attrib={pos:gl.getAttribLocation(p,"aPos"),normal:gl.getAttribLocation(p,"aNormal"),part:gl.getAttribLocation(p,"aPart")};
  const arr=makeMesh(),sa=shadowMesh();meshCount=arr.length/7;shadowCount=sa.length/7;
  buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);
  sbuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,sbuf);gl.bufferData(gl.ARRAY_BUFFER,sa,gl.STATIC_DRAW);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  status="ready";
  return true;
 }catch(e){status="shader-error";console.error("Coin cascade WebGL init",e);return false;}
}
function bind(buffer){
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.enableVertexAttribArray(attrib.pos);gl.vertexAttribPointer(attrib.pos,3,gl.FLOAT,false,28,0);
 gl.enableVertexAttribArray(attrib.normal);gl.vertexAttribPointer(attrib.normal,3,gl.FLOAT,false,28,12);
 gl.enableVertexAttribArray(attrib.part);gl.vertexAttribPointer(attrib.part,1,gl.FLOAT,false,28,24);
}
function fit(){
 const dpr=Math.min(devicePixelRatio||1,innerWidth<600?1.15:1.5);
 const w=Math.floor(innerWidth*dpr),h=Math.floor(innerHeight*dpr);
 if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
 if(glints?.width!==w||glints?.height!==h){glints.width=w;glints.height=h;}
 gl.viewport(0,0,w,h);
 gl.uniform2f(loc.uViewport,innerWidth,innerHeight);
}
function renderGlints(){
 if(!gctx)return;
 const dpr=glints.width/Math.max(1,innerWidth);
 gctx.setTransform(dpr,0,0,dpr,0,0);
 gctx.clearRect(0,0,innerWidth,innerHeight);
 gctx.save();gctx.globalCompositeOperation="lighter";
 glintCount=0;
 for(const c of particles){
  if(c.age<0||c.alpha<.08)continue;
  const reflectStrength=Math.pow(Math.max(0,Math.cos(c.roll*.75+c.spin*.52+c.glintSeed)),17);
  const r=Math.abs(Math.cos(c.spin));
  const a=reflectStrength*(.48+.52*r)*c.alpha;
  if(a<.26)continue;
  glintCount++;
  const size=c.size*(.33+.46*a);
  const px=c.x+Math.sin(c.spin)*c.size*.27;
  const py=c.y+Math.sin(c.roll)*c.size*.20;
  gctx.globalAlpha=Math.min(1,a*.9);
  gctx.strokeStyle="#fff4ce";gctx.lineWidth=Math.max(.7,1.7*a);
  gctx.beginPath();gctx.moveTo(px-size,py);gctx.lineTo(px+size,py);
  gctx.moveTo(px,py-size*.84);gctx.lineTo(px,py+size*.84);
  gctx.stroke();
  gctx.fillStyle="#fffef0";gctx.beginPath();gctx.arc(px,py,Math.max(.9,2.2*a),0,TAU);gctx.fill();
 }
 for(const p of sparks){
  const a=(1-p.age/p.life)*p.brightness;
  if(a<=0)continue;
  gctx.globalAlpha=a*.76;gctx.strokeStyle="#ffe4a1";gctx.lineWidth=1.1;
  gctx.beginPath();gctx.moveTo(p.x,p.y);
  gctx.lineTo(p.x-p.vx*.022,p.y-p.vy*.022);
  gctx.stroke();
 }
 gctx.restore();
}
function render(){
 fit();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 gl.useProgram(p);
 const t=simTime;
 gl.uniform1f(loc.uTime,t);
 bind(sbuf);gl.uniform1f(loc.uShadow,1);
 for(const c of particles){
  if(c.age<0||c.alpha<=0)continue;
  const shadowOpacity=clamp(.65-(c.floor-c.y)/650,.10,.67)*c.alpha;
  gl.uniform2f(loc.uCenter,c.x,c.y);
  gl.uniform1f(loc.uSize,c.size*1.08);
  gl.uniform1f(loc.uFloor,c.floor+3);
  gl.uniform1f(loc.uOpacity,shadowOpacity);
  gl.uniform1f(loc.uSpin,c.spin);gl.uniform1f(loc.uRoll,c.roll);gl.uniform1f(loc.uTilt,c.tilt);
  gl.uniform1f(loc.uGlint,c.glintSeed);
  gl.drawArrays(gl.TRIANGLES,0,shadowCount);
 }
 bind(buf);gl.uniform1f(loc.uShadow,0);
 for(const c of particles){
  if(c.age<0||c.alpha<=0)continue;
  gl.uniform2f(loc.uCenter,c.x,c.y);
  gl.uniform1f(loc.uSize,c.size*(1+clamp((c.floor-c.y)/850,0,.35)));
  gl.uniform1f(loc.uFloor,c.floor);
  gl.uniform1f(loc.uSpin,c.spin);gl.uniform1f(loc.uRoll,c.roll);gl.uniform1f(loc.uTilt,c.tilt);
  gl.uniform1f(loc.uGlint,c.glintSeed);gl.uniform1f(loc.uOpacity,c.alpha);
  gl.drawArrays(gl.TRIANGLES,0,meshCount);
 }
 renderGlints();
 cv.dataset.coinParticles=String(particles.filter(c=>c.age>=0).length);
 cv.dataset.coinFrame=String(++frame);
 cv.dataset.coinEffectStatus="rendering";
}
function addImpactSparks(c){
 // Each collision chooses particles only from its seed + hit index, so
 // replaying physics frame 120 produces the same image, no random drift.
 const brightness=.6+Math.min(1,c.size/22)*.4;
 for(let i=0;i<4;i++){
  const a=(-.75+i*.47)+c.hits*.31;
  const r=(Math.sin(c.glintSeed*17.1+i*41.3+c.hits*71.5)*43758.5453)%1;
  const q=Math.abs(r);
  sparks.push({x:c.x,y:c.floor-3,vx:Math.cos(a)*(25+90*q),
   vy:-(52+104*(1-q)),age:0,life:.12+.12*q,brightness});
 }
}
function update(dt){
 simTime+=dt;
 phase=simTime<PAYOUT.emitInterval*particles.length+.08?"eject":
  simTime<.9?"scatter":simTime<PAYOUT.gatherStart?"bounce":
  simTime<PAYOUT.finish?"collect":"complete";
 for(const c of particles){
  c.age+=dt;if(c.age<0)continue;
  if(c.age<PAYOUT.gatherStart){
   c.vy+=PAYOUT.gravity*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;
   c.roll+=c.vr*dt;c.spin+=c.vs*dt;c.tilt+=c.vt*dt;
   if(c.y>=c.floor){
    c.y=c.floor;
    if(c.vy>48&&c.hits<4){
     const restitution=c.hits===0?.36+c.bounceSeed*.11:.25+c.bounceSeed*.05;
     c.vy=-c.vy*restitution;
     c.vx*=.76;c.vs*=.68;c.vr*=.84;c.hits++;
     hitCount++;addImpactSparks(c);
     if(!silentPhysics)clink(.42+c.size/28);
    }else{c.vy=0;c.vx*=.81;c.vr*=.87}
   }
   if(c.x<c.minX+c.size){c.x=c.minX+c.size;c.vx=Math.abs(c.vx)*.44}
   if(c.x>c.maxX-c.size){c.x=c.maxX-c.size;c.vx=-Math.abs(c.vx)*.44}
  }else{
   if(!c.gathered){c.gathered=true;c.gx=c.x;c.gy=c.y;c.initialSize=c.size}
   const t=clamp((c.age-PAYOUT.gatherStart-c.delay*.03)/PAYOUT.gatherDuration,0,1);
   const q=ease(t);
   c.x=lerp(c.gx,c.targetX,q);
   c.y=lerp(c.gy,c.targetY,q)-58*Math.sin(t*Math.PI);
   c.roll+=dt*7;c.spin+=dt*17;
   c.alpha=1-smoothstep(.65,1,t);
   c.size=c.initialSize*(1-.36*q);
  }
 }
 for(const s of sparks){s.age+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=800*dt}
 sparks=sparks.filter(s=>s.age<s.life);
 particles=particles.filter(c=>c.age<PAYOUT.finish+c.delay*.03&&c.alpha>.01);
}
function smoothstep(a,b,t){let q=clamp((t-a)/(b-a),0,1);return q*q*(3-2*q);}
function finishFrame(){
 if(!particles.length){
  raf=0;last=0;accumulator=0;fallingActive=false;phase="complete";
  if(cv){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
   cv.dataset.coinParticles="0";cv.dataset.coinEffectStatus="idle";}
  if(gctx)gctx.clearRect(0,0,glints.width,glints.height);
  status="idle";return true;
 }
 return false;
}
function tick(ts){
 if(finishFrame())return;
 const dt=last?Math.min((ts-last)/1000,.05):1/60;last=ts;
 if(!document.hidden){
  accumulator+=dt;let n=0;
  while(accumulator>=PAYOUT.step&&n++<10){
   update(PAYOUT.step);accumulator-=PAYOUT.step;
  }
 }
 render();raf=requestAnimationFrame(tick);
}
function start(){
 pausedForFrame=false;
 if(!raf){last=0;accumulator=0;fallingActive=true;raf=requestAnimationFrame(tick)}
}
function seek(ms){
 if(!lastBurst||!gl)return false;
 if(raf)cancelAnimationFrame(raf);
 raf=0;last=0;accumulator=0;pausedForFrame=true;
 particles=startParticles.map(c=>({...c}));sparks=[];simTime=0;hitCount=0;
 silentPhysics=true;
 const steps=Math.min(600,Math.max(0,Math.round(Number(ms)/1000/PAYOUT.step)));
 for(let i=0;i<steps;i++)update(PAYOUT.step);
 silentPhysics=false;status="paused";render();
 if(gl.flush)gl.flush();
 cv.dataset.coinPreviewMs=String(Math.round(steps*PAYOUT.step*1000));
 return true;
}
function play(){if(pausedForFrame&&particles.length)start();}
function targetPosition(){
 const el=document.querySelector(".scene .header .stat:last-of-type, .scene .choice-currency, .scene .shop-balance");
 if(el){const r=el.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];}
 return [innerWidth*.16,Math.min(52,innerHeight*.08)];
}
function burst(options={}){
 if(!init())return false;
 // Fixed seed provides screenshot-at-the-same-frame reproducibility.
 seedUsed=Number.isFinite(options.seed)?(Number(options.seed)>>>0):((Date.now()^played*2654435761)>>>0);
 const rng=makeRng(seedUsed),r=(a,b)=>a+(b-a)*rng();
 const count=clamp(Math.round(Number(options.count)||36),1,reduce()?12:76);
 const originX=Number.isFinite(options.x)?options.x:innerWidth*.43;
 const originY=Number.isFinite(options.y)?options.y:innerHeight*.33;
 const floor=Number.isFinite(options.floorY)?options.floorY:innerHeight*.72;
 const tar=targetPosition();
 const targetX=Number.isFinite(options.targetX)?options.targetX:tar[0];
 const targetY=Number.isFinite(options.targetY)?options.targetY:tar[1];
 const direction=options.direction||"reward";
 burstSound=options.sound!==false;
 if(raf)cancelAnimationFrame(raf);raf=0;last=0;accumulator=0;
 particles=[];sparks=[];simTime=0;hitCount=0;glintCount=0;phase="eject";
 for(let i=0;i<count;i++){
  const delay=i*PAYOUT.emitInterval,spread=direction==="spend"?.65:1;
  const size=r(14,23)*(innerWidth<580?.75:innerWidth<1000?.90:1);
  particles.push({
   age:-delay,delay,x:originX+r(-7,7),y:originY+r(-5,5),
   vx:r(-230,360)*spread,vy:r(-630,-310),
   size,floor:floor+r(-5,8),
   minX:Number.isFinite(options.minX)?options.minX:0,
   maxX:Number.isFinite(options.maxX)?options.maxX:innerWidth,
   spin:r(0,TAU),roll:r(0,TAU),tilt:r(-.65,.65),
   vs:r(-18,18),vr:r(-9,9),vt:r(-7,7),
   hits:0,alpha:1,targetX:targetX+r(-8,8),targetY,
   gathered:false,gx:0,gy:0,bounceSeed:r(0,1),glintSeed:r(0,TAU)
  });
 }
 startParticles=particles.map(c=>({...c}));
 lastBurst={...options,count,seed:seedUsed};
 played++;status="playing";
 if(options.sound!==false)audioContext();
 if(!silentPhysics)clink(.85);
 start();return true;
}
function stop(){particles.length=0;sparks.length=0;
 if(raf)cancelAnimationFrame(raf);raf=0;last=0;accumulator=0;phase="idle";status="idle";
 if(gl){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)}
 if(gctx)gctx.clearRect(0,0,glints.width,glints.height);
}
function soundFn(fn){soundEnabled=typeof fn==="function"?fn:()=>!!fn;}
document.addEventListener("pointerdown",()=>{if(soundEnabled()&&ctx?.state==="suspended")audioContext()},{passive:true,capture:true});
window.PaperchalkCoinCascade=Object.freeze({burst,stop,seek,play,unlockAudio:audioContext,setSoundEnabled:soundFn,
 get status(){return status},get count(){return particles.length},
 get played(){return played},get canvas(){return cv},get seed(){return seedUsed},
 get phase(){return phase},get simulatedMs(){return Math.round(simTime*1000)},
 get reflectionGlints(){return glintCount},get impacts(){return hitCount},
 get timeline(){return {...PAYOUT}},get lastBurst(){return lastBurst&&{...lastBurst}},
 inspect(){return {status,seed:seedUsed,phase,timeMs:Math.round(simTime*1000),liveCoins:particles.length,
  impacts:hitCount,glints:glintCount,sparks:sparks.length,particles:particles.slice(0,5).map(c=>({
   x:Math.round(c.x),y:Math.round(c.y),spin:c.spin,roll:c.roll,hits:c.hits}))}}
});
})();
