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
 "precision mediump float;",
 "varying vec3 vNormal,vLocal;varying float vPart,vShadow;",
 "uniform float uTime,uOpacity;",
 "void main(){",
 "if(vShadow>.5){float r=length(vLocal.xy);float a=(1.-smoothstep(.05,.97,r))*.35*uOpacity;gl_FragColor=vec4(.015,.035,.035,a);return;}",
 "vec3 n=normalize(vNormal);vec3 l=normalize(vec3(-.52,.81,.91));vec3 h=normalize(l+vec3(0.,0.,1.));",
 "float nd=max(dot(n,l),0.);float spec=pow(max(dot(n,h),0.),32.);float glint=pow(max(dot(n,normalize(vec3(.76,.14,1.))),0.),135.);",
 "float edge=step(1.5,vPart);float back=step(2.5,vPart);",
 "float r=length(vLocal.xy);float radial=sin(r*65.)*.022;",
 "vec3 metal=mix(vec3(.43,.245,.065),vec3(1.0,.72,.19),.30+.70*nd);",
 "metal+=vec3(.48,.42,.20)*spec+vec3(1.0,.89,.65)*glint;",
 "metal+=vec3(.23,.20,.10)*pow(max(dot(reflect(vec3(.42,-.6,-.66),n),vec3(.0,1.,.35)),0.),4.);",
 "if(vPart>.5&&vPart<1.5)metal=metal*1.15+vec3(.12,.085,.01);",
 "if(edge>.5&&back<.5)metal*=.69+.24*abs(sin(atan(vLocal.y,vLocal.x)*36.));",
 "if(back>.5)metal*=.67;",
 "if(vPart<.5){",
 " float minted=step(.53,r)*step(r,.61)*.12+step(.66,r)*step(r,.70)*.16;",
 " float crest=step(length(vLocal.xy),.30)*(0.09+.07*sin(vLocal.x*19.)*cos(vLocal.y*22.));",
 " metal+=vec3(.16,.10,.02)*(minted+crest);metal+=radial;",
 "}",
 "float vignette=.88+.12*max(n.z,0.);",
 "gl_FragColor=vec4(clamp(metal*vignette,0.,1.),uOpacity);",
 "}"
].join("\n");
function shader(gl,type,code){
 const obj=gl.createShader(type);gl.shaderSource(obj,code);gl.compileShader(obj);
 if(!gl.getShaderParameter(obj,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(obj));return obj;
}
function link(gl){
 const p=gl.createProgram();
 gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));
 gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
}
function makeMesh(){
 const v=[],seg=32;
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
 const v=[],seg=36;for(let i=0;i<seg;i++){for(const a of [-1,i/seg*TAU,(i+1)/seg*TAU]){let x=a===-1?0:Math.cos(a),y=a===-1?0:Math.sin(a);v.push(x,y,0,0,0,1,0);}}return new Float32Array(v);
}
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>t*t*(3-2*t);
let cv=null,gl=null,p=null,buf=null,sbuf=null,meshCount=0,shadowCount=0,loc=null,attrib=null;
let particles=[],raf=0,last=0,frame=0,played=0,ctx=null,soundEnabled=()=>true,lastClink=0;
let status="idle",fallingActive=false;
const reduce=()=>window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
function audioContext(){
 try{if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(C)ctx=new C();}if(ctx&&ctx.state==="suspended")ctx.resume().catch(()=>{});}catch(_){}
}
function clink(weight=1){
 if(!soundEnabled()||!ctx||ctx.state!=="running")return;
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
 gl=cv.getContext("webgl",{alpha:true,antialias:true,depth:false,premultipliedAlpha:false,preserveDrawingBuffer:false});
 if(!gl){status="webgl-unavailable";cv.remove();cv=null;return false;}
 try{
  p=link(gl);gl.useProgram(p);
  loc={};for(const k of ["uViewport","uCenter","uSize","uSpin","uRoll","uTilt","uFloor","uShadow","uTime","uOpacity"])loc[k]=gl.getUniformLocation(p,k);
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
 const dpr=Math.min(devicePixelRatio||1,1.5);
 const w=Math.floor(innerWidth*dpr),h=Math.floor(innerHeight*dpr);
 if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
 gl.viewport(0,0,w,h);
 gl.uniform2f(loc.uViewport,innerWidth,innerHeight);
}
function render(){
 fit();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 gl.useProgram(p);
 const t=performance.now()/1000;
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
  gl.drawArrays(gl.TRIANGLES,0,shadowCount);
 }
 bind(buf);gl.uniform1f(loc.uShadow,0);
 for(const c of particles){
  if(c.age<0||c.alpha<=0)continue;
  gl.uniform2f(loc.uCenter,c.x,c.y);
  gl.uniform1f(loc.uSize,c.size*(1+clamp((c.floor-c.y)/850,0,.35)));
  gl.uniform1f(loc.uFloor,c.floor);
  gl.uniform1f(loc.uSpin,c.spin);gl.uniform1f(loc.uRoll,c.roll);gl.uniform1f(loc.uTilt,c.tilt);
  gl.uniform1f(loc.uOpacity,c.alpha);
  gl.drawArrays(gl.TRIANGLES,0,meshCount);
 }
 cv.dataset.coinParticles=String(particles.filter(c=>c.age>=0).length);
 cv.dataset.coinFrame=String(++frame);
 cv.dataset.coinEffectStatus="rendering";
}
function update(dt){
 const mobile=innerWidth<600;
 for(const c of particles){
  c.age+=dt;if(c.age<0)continue;
  const inFlight=c.age<1.9;
  if(inFlight){
   c.vy+=1000*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;
   c.roll+=c.vr*dt;c.spin+=c.vs*dt;c.tilt+=c.vt*dt;
   if(c.y>=c.floor){
    c.y=c.floor;
    if(c.vy>58&&c.hits<4){
     c.vy=-c.vy*(c.hits===0?rand(.32,.47):.31);
     c.vx*=.76;
     c.vs*=.73;c.vr*=.84;
     c.hits++;
     clink(.52+c.size/27);
    }else{c.vy=0;c.vx*=.77; c.vr*=.87;}
   }
   if(c.x<c.size){c.x=c.size;c.vx=Math.abs(c.vx)*.58;}
   if(c.x>innerWidth-c.size){c.x=innerWidth-c.size;c.vx=-Math.abs(c.vx)*.58;}
  }else{
   if(!c.gathered){c.gathered=true;c.gx=c.x;c.gy=c.y;}
   const t=clamp((c.age-1.9-c.delay*.08)/.72,0,1),q=ease(t);
   c.x=c.gx+(c.targetX-c.gx)*q;
   c.y=c.gy+(c.targetY-c.gy)*q-68*Math.sin(t*Math.PI);
   c.roll+=dt*10;c.spin+=dt*19;
   c.alpha=1-smoothstep(.62,1,t);
   c.size*=1-dt*.36;
  }
 }
 particles=particles.filter(c=>c.age<2.75+c.delay*.08&&c.alpha>.02);
}
function smoothstep(a,b,t){let q=clamp((t-a)/(b-a),0,1);return q*q*(3-2*q);}
function tick(ts){
 if(!particles.length){raf=0;last=0;fallingActive=false;if(cv){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);cv.dataset.coinParticles="0";cv.dataset.coinEffectStatus="idle";}return;}
 let dt=last?Math.min((ts-last)/1000,.05):1/60;last=ts;
 if(document.hidden)dt=0;
 update(dt);render();raf=requestAnimationFrame(tick);
}
function start(){if(!raf){last=0;fallingActive=true;raf=requestAnimationFrame(tick);}}
function targetPosition(){
 const el=document.querySelector(".scene .header .stat:last-of-type, .scene .choice-currency, .scene .shop-balance");
 if(el){const r=el.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];}
 return [innerWidth*.16,Math.min(52,innerHeight*.08)];
}
function burst(options={}){
 if(!init())return false;
 const count=clamp(Number(options.count)||36,1,reduce()?12:76);
 const originX=Number.isFinite(options.x)?options.x:innerWidth*.43;
 const originY=Number.isFinite(options.y)?options.y:innerHeight*.33;
 const floor=Number.isFinite(options.floorY)?options.floorY:innerHeight*.72;
 const tar=targetPosition(),direction=options.direction||"reward";
 for(let i=0;i<count;i++){
  const delay=i*.0125,spread=direction==="spend"?.64:1;
  particles.push({
   age:-delay,delay,x:originX+rand(-10,10),y:originY+rand(-7,7),
   vx:rand(-360,320)*spread,vy:rand(-550,-215),
   size:rand(9,18)*(innerWidth<580?.72:1),floor:floor+rand(-7,12),
   spin:rand(0,TAU),roll:rand(0,TAU),tilt:rand(-.7,.7),
   vs:rand(-18,18),vr:rand(-11,11),vt:rand(-9,9),
   hits:0,alpha:1,targetX:tar[0]+rand(-8,8),targetY:tar[1],
   gathered:false,gx:0,gy:0
  });
 }
 played++;
 status="playing";
 if(options.sound!==false)audioContext();
 clink(.95);
 start();
 return true;
}
function stop(){particles.length=0; if(raf)cancelAnimationFrame(raf);raf=0;last=0;if(gl){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}}
function soundFn(fn){soundEnabled=typeof fn==="function"?fn:()=>!!fn;}
document.addEventListener("pointerdown",()=>{if(soundEnabled()&&ctx?.state==="suspended")audioContext()},{passive:true,capture:true});
window.PaperchalkCoinCascade=Object.freeze({burst,stop,setSoundEnabled:soundFn,get status(){return status},get count(){return particles.length},get played(){return played},get canvas(){return cv}});
})();
