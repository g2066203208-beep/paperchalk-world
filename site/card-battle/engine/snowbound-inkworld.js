/* Ink-world: original procedural 3D gothic courtyard for Snowbound Journey.
 * Research reference: Forgive Me Father 2's 3D geometry + painted material +
 * directional light + comic ink approach. NOT extracted game art or source.
 * Uses native WebGL 1, no texture downloads, preserves original Anima actors.
 */
(function(){
"use strict";
const KEY="paperchalk-inkworld-v1",APP=document.getElementById("app");
if(!APP)return;
let enabled=true;
try{enabled=localStorage.getItem(KEY)!=="off"}catch(_){}
let active=null,scene=null;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function mat4Perspective(fov,aspect,near,far){
 const f=1/Math.tan(fov/2),n=1/(near-far);
 return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*n,-1,0,0,2*far*near*n,0]);
}
function lookAt(eye,to){
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const norm=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l)};
 const z=norm(eye.map((v,i)=>v-to[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((a,v,i)=>a+v*eye[i],0),-y.reduce((a,v,i)=>a+v*eye[i],0),-z.reduce((a,v,i)=>a+v*eye[i],0),1]);
}
function shader(gl,type,code){
 const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error("InkWorld shader: "+gl.getShaderInfoLog(s));
 return s;
}
function program(gl,v,f){
 const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,f));gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error("InkWorld link: "+gl.getProgramInfoLog(p));
 return p;
}
function geometry(){
 const verts=[],cols={
 stone:[.37,.47,.48],stone2:[.40,.49,.48],stone3:[.31,.41,.45],ledge:[.46,.49,.45],
 mortar:[.18,.27,.30],ink:[.087,.15,.18],blue:[.20,.48,.53],glass:[.17,.53,.53],
 amber:[.98,.54,.20],gold:[.72,.47,.20],floor:[.29,.40,.42],floor2:[.37,.48,.48],
 water:[.21,.36,.40],snow:[.54,.62,.58],iron:[.12,.22,.25],wood:[.21,.25,.23]
 };
 let seed=92471;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 function tri(a,b,c,n,col){for(const p of [a,b,c])verts.push(...p,...n,...col)}
 function quad(a,b,c,d,n,col){tri(a,b,c,n,col);tri(a,c,d,n,col)}
 function box(x,y,z,w,h,d,c){
  const col=cols[c]||c,x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;
  quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],col);
  quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1],col);
  quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0],col);
  quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0],col);
  quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0],col);
  quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],col);
 }
 function prism(x,y,z,w,h,d,c){
  const color=cols[c]||c,base=y-h/2,top=y+h/2,front=z+d/2,back=z-d/2;
  quad([x-w/2,base,front],[x+w/2,base,front],[x,top,front],[x,top,front],[0,0,1],color);
  tri([x-w/2,base,back],[x,top,back],[x+w/2,base,back],[0,0,-1],color);
  quad([x-w/2,base,back],[x-w/2,base,front],[x,top,front],[x,top,back],[-.55,.65,0],color);
  quad([x+w/2,base,front],[x+w/2,base,back],[x,top,back],[x,top,front],[.55,.65,0],color);
 }
 // Actual horizontal 3D ground, not a large painted plane.
 box(0,-.54,-1,70,.90,48,"water");
 box(0,-.02,-1,26,.13,41,"floor");
 for(let r=0;r<15;r++){
  const z=-9+r*1.38;
  for(let c=0;c<21;c++){
   const x=(c-10)*1.31+(r%2?.63:0),j=(rnd()-.5)*.08;
   box(x,.045+j,z+(rnd()-.5)*.12,1.19+rnd()*.08,.10+j*.35,1.21,"floor"+(rnd()>.48?"2":""));
   if(rnd()>.82)box(x+(rnd()-.5)*.5,.12,z,.17,.016,.022,"mortar");
  }
 }
 // Central wall has a heavy ink-dark structural core and layered masonry.
 box(0,3.9,-13.4,34,8.6,2.2,"ink");
 box(0,4.0,-12.05,33.4,7.9,.34,"stone3");
 for(let r=0;r<17;r++){
  for(let c=0;c<34;c++){
   const x=-16.1+c*.98+(r%2?.47:0),y=.33+r*.425,sh=rnd();
   box(x,y,-11.79,.90,.35,.13,sh>.70?"stone2":sh>.3?"stone":"stone3");
  }
 }
 // Gothic windows: dark void, teal stained glass and lead frames.
 function windowGothic(x,y,w,h){
  box(x,y,-11.47,w+1.10,h+1.28,.34,"ink");
  box(x,y,-11.23,w+.55,h+.77,.18,"stone2");
  box(x,y,-11.06,w,h,.18,"glass");
  for(let k=1;k<4;k++)box(x-w/2+w*k/4,y,-10.91,.092,h,.10,"iron");
  for(let k=1;k<5;k++)box(x,y-h/2+h*k/5,-10.89,w,.072,.10,"iron");
  prism(x,y+h*.52,-11.09,w+1,h*.60,.25,"stone3");
  box(x,y-h*.54,-10.82,w+1.5,.22,.7,"ledge");
 }
 windowGothic(-9,4.7,2.0,3.2);windowGothic(9,4.7,2.0,3.2);
 windowGothic(-14,4.1,1.3,2.4);windowGothic(14,4.1,1.3,2.4);
 // Deep central entrance: pointed lancet arch in real spatial geometry.
 box(0,2.9,-11.12,6.65,5.7,.35,"ink");
 box(0,2.74,-10.93,4.15,5.18,.19,"wood");
 for(let i=-1;i<=1;i++)box(i*1.37,2.74,-10.77,.075,5.18,.09,"iron");
 prism(0,6.1,-10.88,6.75,3.0,.6,"stone3");
 for(const side of [-1,1]){
  box(side*3.30,3.3,-10.65,.65,6.65,1.12,"stone2");
  box(side*4.1,6.52,-10.28,2.8,.37,1.55,"ledge");
  box(side*4.1,2.92,-10.4,.95,5.85,1.43,"stone3");
 }
 box(0,7.7,-11.03,8.1,.42,1.8,"mortar");
 prism(0,9.1,-11.14,9.7,3.0,2,"stone3");
 // Tall asymmetric buttresses and broken tower silhouette.
 for(const [x,h] of [[-16.8,10.3],[16.8,11.6],[-12.3,8.4],[12.3,8.9]]){
  box(x,h/2,-12.3,2.7,h,3.2,"stone3");
  box(x,h*.74,-10.52,3.2,.3,3.65,"ledge");
  prism(x,h+1.28,-12.3,3.55,2.7,4.2,"stone3");
  box(x,h+2.7,-12.35,.37,.9,.4,"ink");
 }
 // Side ruins supply readable true parallax, with near/far column silhouettes.
 for(const side of [-1,1]){
  for(let i=0;i<5;i++){
   const z=-9+i*3.55,x=side*(13.4+i*.62);
   box(x,2.25,z,1.0,4.6,1.1,i%2?"stone2":"stone3");
   box(x,4.67,z,1.55,.33,1.55,"ledge");
   box(x,4.94,z,.9,.30,.9,"ink");
   box(x+side*.82,.59,z,1.8,1.1,1.50,"stone");
   if(i<4)box(side*(14.4+i*.55),1.2,z+1.4,1.35,2.4,2.5,"stone3");
  }
  // Lanterns cast flickering warm color on nearby world surfaces.
  const lx=side*8.0;
  box(lx,3.0,-6.5,.17,5.8,.17,"iron");
  box(lx,5.5,-6.5,.90,1.1,.90,"ink");
  box(lx,5.52,-5.91,.49,.64,.13,"amber");
  prism(lx,6.17,-6.5,1.12,.68,1.12,"iron");
  // Broken stairs and slabs anchored in actual world coordinates.
  for(let i=0;i<4;i++)box(side*(10.1+i*.30),.18+i*.08,-1+i*2.5,2.0,.3,.96,i%2?"stone":"stone2");
 }
 // Forged iron fencing with a tall, irregular profile at true depth.
 for(const side of [-1,1]){
  for(let i=0;i<13;i++){
   const z=-7.5+i*1.48,x=side*11.2;
   box(x,1.20,z,.12,2.45,.14,"iron");
   prism(x,2.65,z,.36,.52,.30,"iron");
  }
  box(side*11.2,1.0,1.34,.13,.13,19.3,"iron");
  box(side*11.2,1.97,1.34,.13,.11,19.3,"iron");
 }
 // Ground clutter, sparse stones and fallen church architecture.
 for(let i=0;i<76;i++){
  const x=(rnd()-.5)*29,z=(rnd()-.5)*33;
  if(Math.abs(x)<8&&z>-8)continue;
  box(x,.16,z,.28+rnd()*.7,.15+rnd()*.39,.28+rnd()*.68,rnd()>.5?"stone":"stone3");
 }
 return new Float32Array(verts);
}
const V=String.raw`
attribute vec3 aPos;attribute vec3 aNormal;attribute vec3 aColor;
uniform mat4 uProj;uniform mat4 uView;
varying vec3 vPos;varying vec3 vNormal;varying vec3 vCol;varying float vDistance;
void main(){vec4 view=uView*vec4(aPos,1.);gl_Position=uProj*view;
 vPos=aPos;vNormal=aNormal;vCol=aColor;vDistance=-view.z;}
`;
const F=String.raw`
precision highp float;
varying vec3 vPos,vNormal,vCol;varying float vDistance;
uniform float uTime;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
void main(){
 vec3 n=normalize(vNormal);
 float grain=hash(floor(vPos*16.))*0.09;
 float strokes=step(.93,fract(vPos.x*5.8+vPos.y*2.3+sin(vPos.z*1.1)*.3))*.075;
 vec3 base=vCol*(.87+grain-strokes);
 vec3 lightDir=normalize(vec3(-.52,.82,.42));
 float diffuse=max(dot(n,lightDir),0.0);
 float toon=floor((.35+diffuse*.73)*4.)/4.;
 vec3 ink=base*(.53+toon*.53);
 float flicker=.92+.08*sin(uTime*9.)*sin(uTime*13.);
 for(int i=0;i<2;i++){
   float x=i==0?-8.:8.;
   float d=length((vPos-vec3(x,5.3,-6.5))*vec3(1.0,.84,1.0));
   ink+=vec3(.62,.27,.06)*flicker*2.4/(1.4+d*d*.23);
 }
 // Stylised ground blue bounce and distance fog.
 ink+=vec3(.023,.058,.064)*max(0.,n.y);
 float fog=clamp((vDistance-10.)/43.,0.,.82);
 fog+=.025*sin(vPos.x*.16+uTime*.20)*sin(vPos.z*.14-uTime*.15);
 ink=mix(ink,vec3(.23,.34,.40),fog);
 gl_FragColor=vec4(pow(clamp(ink,0.,1.),vec3(.92)),clamp(vDistance/58.,0.,.98));
}
`;
const PV=String.raw`
attribute vec2 aPos;varying vec2 uv;void main(){uv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}
`;
const PF=String.raw`
precision highp float;
varying vec2 uv;uniform sampler2D uScene;uniform vec2 uPixel;uniform float uTime;
vec3 col(vec2 p){return texture2D(uScene,p).rgb;}
void main(){
 vec4 s=texture2D(uScene,uv);
 float depth=s.a,edge=0.,colorEdge=0.;
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
   if(x==0&&y==0)continue;
   vec4 b=texture2D(uScene,uv+vec2(float(x),float(y))*uPixel);
   edge=max(edge,abs(depth-b.a));
   colorEdge=max(colorEdge,length(s.rgb-b.rgb));
 }
 float outline=smoothstep(.009,.036,edge)*.67+smoothstep(.15,.33,colorEdge)*.29;
 vec3 ink=mix(s.rgb,vec3(.029,.066,.079),clamp(outline,0.,.86));
 float screenVignette=pow(length((uv-.5)*vec2(1.15,1.0)),1.9);
 ink*=1.-screenVignette*.45;
 // Subtle film grain; stable scene geometry, animated atmosphere only.
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233))+uTime*.2)*43758.5453);
 ink+=(grain-.5)*.017;
 gl_FragColor=vec4(clamp(ink,0.,1.),1.);
}
`;
function run(canvas){
 const gl=canvas.getContext("webgl",{alpha:false,antialias:true,preserveDrawingBuffer:false,depth:true});
 if(!gl){canvas.dataset.inkStatus="unavailable";return {stop(){}};}
 let mesh,post,buf,quadBuf,fbo,tex,depthBuf,width=0,height=0,raf=0,stopped=false;
 try{
  mesh=program(gl,V,F);post=program(gl,PV,PF);
  buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  const data=geometry();gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  quadBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  fbo=gl.createFramebuffer();tex=gl.createTexture();depthBuf=gl.createRenderbuffer();
  const meshLoc={pos:gl.getAttribLocation(mesh,"aPos"),normal:gl.getAttribLocation(mesh,"aNormal"),col:gl.getAttribLocation(mesh,"aColor")};
  const postLoc=gl.getAttribLocation(post,"aPos"),indexCount=data.length/9;
  gl.useProgram(mesh);gl.uniformMatrix4fv(gl.getUniformLocation(mesh,"uView"),false,lookAt([0,6.0,17.2],[0,3.0,-5]));
  function resize(){
   const r=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.5);
   const w=clamp(Math.floor(r.width*ratio),1,2560),h=clamp(Math.floor(r.height*ratio),1,1500);
   if(w===width&&h===height)return;
   width=w;height=h;canvas.width=w;canvas.height=h;
   gl.bindTexture(gl.TEXTURE_2D,tex);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.bindRenderbuffer(gl.RENDERBUFFER,depthBuf);
   gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);
   gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
   gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
   gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depthBuf);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error("InkWorld FBO incomplete");
  }
  const start=performance.now(),reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  function tick(now){
   if(stopped||!canvas.isConnected)return;
   if(document.hidden){raf=requestAnimationFrame(tick);return;}
   resize();
   const t=reduced?0:(now-start)/1000,aspect=width/height;
   const proj=mat4Perspective((aspect<.85?66:53)*Math.PI/180,aspect,.1,95);
   gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.viewport(0,0,width,height);
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.clearColor(.12,.22,.29,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.useProgram(mesh);
   gl.uniformMatrix4fv(gl.getUniformLocation(mesh,"uProj"),false,proj);
   gl.uniform1f(gl.getUniformLocation(mesh,"uTime"),t);
   gl.bindBuffer(gl.ARRAY_BUFFER,buf);
   gl.enableVertexAttribArray(meshLoc.pos);gl.vertexAttribPointer(meshLoc.pos,3,gl.FLOAT,false,36,0);
   gl.enableVertexAttribArray(meshLoc.normal);gl.vertexAttribPointer(meshLoc.normal,3,gl.FLOAT,false,36,12);
   gl.enableVertexAttribArray(meshLoc.col);gl.vertexAttribPointer(meshLoc.col,3,gl.FLOAT,false,36,24);
   gl.drawArrays(gl.TRIANGLES,0,indexCount);
   gl.disableVertexAttribArray(meshLoc.pos);gl.disableVertexAttribArray(meshLoc.normal);gl.disableVertexAttribArray(meshLoc.col);
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.DEPTH_TEST);
   gl.useProgram(post);gl.viewport(0,0,width,height);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(gl.getUniformLocation(post,"uScene"),0);
   gl.uniform2f(gl.getUniformLocation(post,"uPixel"),1/width,1/height);
   gl.uniform1f(gl.getUniformLocation(post,"uTime"),t);
   gl.bindBuffer(gl.ARRAY_BUFFER,quadBuf);gl.enableVertexAttribArray(postLoc);
   gl.vertexAttribPointer(postLoc,2,gl.FLOAT,false,8,0);gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(postLoc);
   canvas.dataset.inkStatus="running";
   raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
 }catch(e){console.error("InkWorld init failed:",e);canvas.dataset.inkStatus="error";}
 return {stop(){stopped=true;cancelAnimationFrame(raf);if(fbo)gl.deleteFramebuffer(fbo);if(tex)gl.deleteTexture(tex);if(depthBuf)gl.deleteRenderbuffer(depthBuf);if(buf)gl.deleteBuffer(buf);if(quadBuf)gl.deleteBuffer(quadBuf);if(mesh)gl.deleteProgram(mesh);if(post)gl.deleteProgram(post);}};
}
function sync(){
 const c=APP.querySelector(".battle-scene .fmf2-world-canvas");
 if(c!==scene||(enabled&&!active)||(!enabled&&active)){
  if(active)active.stop();active=null;scene=c;
  if(c&&enabled)active=run(c);
 }
 if(c){
  const root=c.closest(".battle-scene");
  root.classList.toggle("fmf2-world-active",enabled&&c.dataset.inkStatus!=="error"&&c.dataset.inkStatus!=="unavailable");
  const toggle=root.querySelector(".fmf2-world-toggle");
  if(toggle){const label=enabled?"原画场景":"漫画3D场景";if(toggle.textContent!==label)toggle.textContent=label;toggle.setAttribute("aria-pressed",String(enabled));}
 }
}
APP.addEventListener("click",e=>{
 const b=e.target.closest(".fmf2-world-toggle");if(!b)return;
 e.preventDefault();e.stopPropagation();enabled=!enabled;
 try{localStorage.setItem(KEY,enabled?"on":"off")}catch(_){}
 sync();
},true);
new MutationObserver(sync).observe(APP,{subtree:true,childList:true});
sync();
window.PaperchalkInkWorld=Object.freeze({get enabled(){return enabled},get status(){return scene?.dataset.inkStatus||"idle"},setEnabled(v){enabled=!!v;sync();}});
})();
