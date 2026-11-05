/* Native WebGL dual-ring battle arena.
 * All actors, the floor and curved wall share one world coordinate system,
 * one view-projection matrix and one depth buffer. 3D stand-ins are temporary.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperWorldRingArena=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const TAU=Math.PI*2,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 const lerp=(a,b,t)=>a+(b-a)*t;
 const SPEC=Object.freeze({wallRadius:11,wallHeight:6.2,outerRoleRadius:7.25,
  innerRoleRadius:4.15,heroOuterRadius:7.42,heroInnerRadius:3.95,
  outerCameraRadius:9.55,innerCameraRadius:1.55,verticalFov:64,
  heroStartAngle:-1.13,heroEndAngle:1.13});
 const allyAngles=Object.freeze([-.70,.08,.86]);
 const enemyAngles=Object.freeze([-.91,-.31,.33,.94]);
 const polar=(r,a,y=0)=>({x:r*Math.sin(a),y,z:r*Math.cos(a)});
 function layout(mode='outer',progress=0){
  if(!['outer','inner'].includes(mode))throw Error('Invalid ring mode');
  const t=clamp(Number(progress)||0,0,1),outer=mode==='outer';
  const angle=lerp(SPEC.heroStartAngle,SPEC.heroEndAngle,t);
  const hero={id:'hero',team:'ally',angle,height:1.62,...polar(outer?SPEC.heroOuterRadius:SPEC.heroInnerRadius,angle)};
  const allies=[hero,...allyAngles.map((a,i)=>({id:'ally-'+(i+2),team:'ally',angle:a,
    height:1.59+i*.03,...polar(outer?SPEC.outerRoleRadius:SPEC.innerRoleRadius,a)}))];
  const enemies=enemyAngles.map((a,i)=>({id:'enemy-'+(i+1),team:'enemy',
    angle:a,height:1.65+i*.05,...polar(outer?SPEC.innerRoleRadius:SPEC.outerRoleRadius,a)}));
  return {mode,progress:t,allies,enemies};
 }
 function camera(mode='outer',progress=0){
  const t=clamp(Number(progress)||0,0,1),outer=mode==='outer';
  const a=lerp(SPEC.heroStartAngle,SPEC.heroEndAngle,t)+(outer?1:-1)*lerp(.12,-.12,t);
  const radius=outer?SPEC.outerCameraRadius:SPEC.innerCameraRadius;
  return {angle:a,radius,eye:polar(radius,a,1.47),
    focus:polar(outer?2.55:7.8,a,1.11),mode};
 }
 const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
 const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
 const unit=v=>{const d=Math.hypot(v.x,v.y,v.z)||1;return {x:v.x/d,y:v.y/d,z:v.z/d}};
 function lookAt(eye,target){
  const f=unit({x:target.x-eye.x,y:target.y-eye.y,z:target.z-eye.z});
  const s=unit(cross(f,{x:0,y:1,z:0})),u=cross(s,f);
  return [s.x,u.x,-f.x,0,s.y,u.y,-f.y,0,s.z,u.z,-f.z,0,
    -dot(s,eye),-dot(u,eye),dot(f,eye),1];
 }
 function perspective(fov,aspect,near=.06,far=80){
  const f=1/Math.tan(fov*Math.PI/360);
  return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
 }
 function multiply(a,b){
  const r=new Array(16).fill(0);
  for(let c=0;c<4;c++)for(let row=0;row<4;row++)
   for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];
  return r;
 }
 const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 function model(actor,mode){
  const facingIn=(actor.team==='ally')===(mode==='outer');
  const a=actor.angle+(facingIn?Math.PI:0),c=Math.cos(a),s=Math.sin(a);
  const h=actor.height/1.62;
  return [c*h,0,-s*h,0,0,h,0,0,s*h,0,c*h,0,actor.x,0,actor.z,1];
 }
 function project(point,cam,aspect=16/9){
  const vp=multiply(perspective(SPEC.verticalFov,aspect),lookAt(cam.eye,cam.focus));
  const m=vp,x=point.x,y=point.y,z=point.z;
  const w=m[3]*x+m[7]*y+m[11]*z+m[15];
  if(w<=0)return {valid:false};
  return {valid:true,x:(m[0]*x+m[4]*y+m[8]*z+m[12])/w,
    y:(m[1]*x+m[5]*y+m[9]*z+m[13])/w,depth:w};
 }
 const VS=[
 'precision highp float;','attribute vec3 aPosition;','attribute vec3 aColor;',
 'uniform mat4 uVP;','uniform mat4 uModel;','varying vec3 vWorld;','varying vec3 vColor;',
 'void main(){vec4 p=uModel*vec4(aPosition,1.0);vWorld=p.xyz;vColor=aColor;gl_Position=uVP*p;}'
 ].join('\n');
 const FS=[
 'precision highp float;','varying vec3 vWorld;','varying vec3 vColor;',
 'uniform float uKind;','uniform float uTime;','uniform vec3 uTint;',
 'float rnd(float n){return fract(sin(n*127.1+8.9)*43758.5453);}',
 'float grid(float p,float n,float w){return 1.0-smoothstep(w,w+.022,abs(fract(p*n)-.5));}',
 'void main(){vec3 color;',
 'if(uKind<.5){',
 'float r=length(vWorld.xz);float a=atan(vWorld.x,vWorld.z)/6.2831853+.5;',
 'float lines=max(grid(r/11.0,22.0,.026)*.70,grid(a,40.0,.018)*.40);',
 'float outer=1.0-smoothstep(.018,.055,abs(r-7.25));',
 'float inner=1.0-smoothstep(.018,.055,abs(r-4.15));',
 'float camA=1.0-smoothstep(.015,.045,abs(r-9.55));',
 'float camB=1.0-smoothstep(.015,.045,abs(r-1.55));',
 'color=vec3(.004,.018,.018)+vec3(.019,.23,.135)*lines',
 '+vec3(.015,.39,.31)*(outer+inner)*.7+vec3(.41,.27,.05)*(camA+camB)*.7;',
 '}else if(uKind<1.5){',
 'float a=atan(vWorld.x,vWorld.z)/6.2831853+.5;float col=floor(a*116.0);',
 'float v=vWorld.y*8.0+uTime*(.65+rnd(col)*1.7);float row=floor(v);',
 'float x=fract(a*116.0);float y=fract(v);',
 'float glyph=step(.18,x)*step(x,.83)*step(.16,y)*step(y,.81);',
 'float bit=step(.52,rnd(col*19.0+row*7.3));',
 'float streak=pow(max(0.0,sin(v*2.2+rnd(col)*6.283)),12.0);',
 'color=vec3(.002,.012,.014)+vec3(.012,.08,.06)*grid(a,116.0,.014)',
 '+vec3(.012,.26,.15)*glyph*bit+vec3(.1,.72,.32)*glyph*bit*streak',
 '+vec3(.005,.09,.08)*grid(a,24.0,.009);',
 '}else{color=uTint*vColor*(.66+.34*smoothstep(0.0,1.65,vWorld.y));}',
 'gl_FragColor=vec4(min(color,vec3(1.0)),1.0);}'
 ].join('\n');
 function compile(gl,type,src){
  const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));
  return sh;
 }
 function initProgram(gl){
  const p=gl.createProgram(),v=compile(gl,gl.VERTEX_SHADER,VS),f=compile(gl,gl.FRAGMENT_SHADER,FS);
  gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
  gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  return {p,pos:gl.getAttribLocation(p,'aPosition'),col:gl.getAttribLocation(p,'aColor'),
   vp:gl.getUniformLocation(p,'uVP'),model:gl.getUniformLocation(p,'uModel'),
   kind:gl.getUniformLocation(p,'uKind'),time:gl.getUniformLocation(p,'uTime'),
   tint:gl.getUniformLocation(p,'uTint')};
 }
 function geometry(){
  const g={floor:[],wall:[],person:[]};
  function tri(dest,a,b,c,color){for(const v of [a,b,c])dest.push(...v,...color)}
  for(let i=0;i<160;i++){
   const a=i*TAU/160,b=(i+1)*TAU/160;
   const p=[11*Math.sin(a),0,11*Math.cos(a)],q=[11*Math.sin(b),0,11*Math.cos(b)];
   const pt=[p[0],SPEC.wallHeight,p[2]],qt=[q[0],SPEC.wallHeight,q[2]];
   tri(g.floor,[0,0,0],p,q,[1,1,1]);
   tri(g.wall,p,pt,qt,[1,1,1]);tri(g.wall,p,qt,q,[1,1,1]);
  }
  function box(x0,y0,z0,x1,y1,z1,color){
   const a=[x0,y0,z0],b=[x1,y0,z0],c=[x1,y1,z0],d=[x0,y1,z0];
   const e=[x0,y0,z1],f=[x1,y0,z1],h=[x1,y1,z1],i=[x0,y1,z1];
   for(const face of [[a,b,c,d],[f,e,i,h],[e,a,d,i],[b,f,h,c],[d,c,h,i],[e,f,b,a]]){
    tri(g.person,face[0],face[1],face[2],color);
    tri(g.person,face[0],face[2],face[3],color);
   }
  }
  const core=[.72,.85,1],skin=[1,.95,.82],deep=[.26,.34,.40];
  box(-.22,.71,-.14,.22,1.28,.14,core);
  box(-.18,.04,-.12,-.035,.73,.13,deep);
  box(.035,.04,-.12,.18,.73,.13,deep);
  box(-.31,.75,-.105,-.215,1.25,.11,core);
  box(.215,.75,-.105,.31,1.25,.11,core);
  box(-.21,1.28,-.17,.21,1.64,.17,skin);
  box(-.23,0,-.18,-.01,.12,.23,skin);
  box(.01,0,-.18,.23,.12,.23,skin);
  box(-.21,.92,-.176,.21,1.18,-.135,deep);
  return g;
 }
 function makeMesh(gl,raw){
  const data=new Float32Array(raw),buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  return {buffer,count:data.length/6};
 }
 function create({stage,view,onExit}={}){
  if(!stage||!view)throw Error('Ring arena must mount inside game stage');
  const css=document.createElement('style');
  css.textContent=[
   '#view.ring-arena-active #scene{width:100cqw!important;height:100cqh!important;max-width:none!important;aspect-ratio:auto!important;border-radius:0!important;overflow:hidden}',
   '#view.ring-arena-active #scene::after{content:none!important}',
   '#view.ring-arena-active #source{visibility:hidden!important}',
   '#view.ring-arena-active > #fog,#view.ring-arena-active > #ui-edge-fog,#view.ring-arena-active > #novel-ui{display:none!important}',
   '#ring-arena-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1;touch-action:none;cursor:grab;pointer-events:auto}',
   '#ring-arena-canvas[hidden],#ring-arena-controls[hidden]{display:none!important}',
   '#ring-arena-controls{position:absolute;z-index:13;inset:0;pointer-events:none;font:500 12px/1.5 system-ui,sans-serif;color:#d6ffef}',
   '#ring-arena-controls .caption{position:absolute;left:14px;top:12px;background:rgba(0,17,17,.78);border:1px solid rgba(89,201,155,.36);border-radius:10px;padding:9px 12px;max-width:60%}',
   '#ring-arena-controls .caption strong{display:block;color:#adffd0;font-size:14px}',
   '#ring-arena-controls .caption small{display:block;opacity:.7;font-size:10px}',
   '#ring-arena-controls .actions{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:7px;flex-wrap:wrap;justify-content:center;width:94%}',
   '#ring-arena-controls button{pointer-events:auto;border:1px solid #378a72;background:rgba(0,23,25,.86);color:#dbfff2;border-radius:8px;padding:7px 10px;font:inherit;min-height:36px;cursor:pointer}',
   '#ring-arena-controls button[aria-pressed=true]{background:#175b4c;border-color:#a5ffe0}',
   '#ring-arena-controls .status{position:absolute;right:12px;top:12px;font:11px/1.5 monospace;text-align:right;color:#a8eacf}',
   '@media(max-width:690px){#ring-arena-controls .caption small,#ring-arena-controls .status{display:none}#ring-arena-controls button{font-size:11px;padding:5px 8px}}'
  ].join('\n');
  document.head.append(css);
  const canvas=document.createElement('canvas');canvas.id='ring-arena-canvas';
  canvas.hidden=true;canvas.setAttribute('aria-label','WebGL 3D 圆形战场，左右滑动让主角沿弧移动');stage.append(canvas);
  const hud=document.createElement('section');hud.id='ring-arena-controls';hud.hidden=true;
  hud.innerHTML=[
   '<div class="caption"><strong>RING / DIGITAL SPACE</strong>真实3D圆柱场景 · 四人弧阵',
   '<small>左右滑动或 A / D、方向键移动主角，摄像机独立绕环跟随</small></div>',
   '<div class="status" role="status"></div><div class="actions">',
   '<button data-shift="-1" type="button">◀ 左移</button>',
   '<button data-mode="outer" aria-pressed="true" type="button">我方外环</button>',
   '<button data-mode="inner" aria-pressed="false" type="button">我方内环</button>',
   '<button data-shift="1" type="button">右移 ▶</button>',
   '<button data-exit type="button">返回场景</button></div>'
  ].join('');stage.append(hud);
  const status=hud.querySelector('.status');
  let gl=null,shader=null,floor=null,wall=null,person=null;
  try{
   gl=canvas.getContext('webgl',{depth:true,antialias:true,alpha:false});
   if(!gl)throw Error('WebGL is unavailable');
   shader=initProgram(gl);const g=geometry();
   floor=makeMesh(gl,g.floor);wall=makeMesh(gl,g.wall);person=makeMesh(gl,g.person);
  }catch(error){
   gl=null;canvas.dataset.error=String(error.message||error);
   status.textContent=String(error.message||error);
  }
  let active=false,mode='outer',progress=0,target=0,seconds=0,lastCamera=null;
  let drag=null;
  const shift=amount=>{target=clamp(target+amount,0,1)};
  canvas.addEventListener('pointerdown',e=>{
   if(!active)return;
   e.preventDefault();e.stopPropagation();
   drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:target};
   canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;
   e.preventDefault();e.stopPropagation();
   const vertical=view.classList.contains('virtual-landscape');
   const delta=vertical?-(e.clientY-drag.y):(e.clientX-drag.x);
   target=clamp(drag.start+delta/Math.max(250,canvas.clientWidth)*1.9,0,1);
  });
  for(const type of ['pointerup','pointercancel'])
   canvas.addEventListener(type,e=>{if(drag&&e.pointerId===drag.id){drag=null;e.stopPropagation()}});
  hud.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   e.preventDefault();e.stopPropagation();
   if(b.hasAttribute('data-shift'))shift(Number(b.dataset.shift)*.16);
   if(b.hasAttribute('data-mode')){
    mode=b.dataset.mode;
    for(const choice of hud.querySelectorAll('[data-mode]'))
     choice.setAttribute('aria-pressed',String(choice.dataset.mode===mode));
    // Reproject immediately when changing orbit modes, even if the host
    // animation loop is throttled or the pointer is idle.
    render(0);
   }
   if(b.hasAttribute('data-exit')&&typeof onExit==='function')onExit();
  });
  document.addEventListener('keydown',e=>{
   if(!active||e.altKey||e.ctrlKey||e.metaKey||e.target.matches('input,textarea,select'))return;
   if(['ArrowRight','d','D'].includes(e.key)){e.preventDefault();shift(.075)}
   if(['ArrowLeft','a','A'].includes(e.key)){e.preventDefault();shift(-.075)}
  });
  function draw(obj,transform,kind,tint){
   gl.bindBuffer(gl.ARRAY_BUFFER,obj.buffer);
   gl.enableVertexAttribArray(shader.pos);gl.enableVertexAttribArray(shader.col);
   gl.vertexAttribPointer(shader.pos,3,gl.FLOAT,false,24,0);
   gl.vertexAttribPointer(shader.col,3,gl.FLOAT,false,24,12);
   gl.uniformMatrix4fv(shader.model,false,new Float32Array(transform));
   gl.uniform1f(shader.kind,kind);
   gl.uniform3fv(shader.tint,new Float32Array(tint));
   gl.drawArrays(gl.TRIANGLES,0,obj.count);
  }
  function render(dt=1/60){
   if(!active)return false;
   progress=lerp(progress,target,1-Math.exp(-clamp(dt,0,.06)*8));
   if(Math.abs(target-progress)<.00005)progress=target;
   seconds+=clamp(dt,0,.06);
   const c=camera(mode,progress);lastCamera=c;
   if(!gl)return false;
   const w=canvas.clientWidth,h=canvas.clientHeight;
   if(w<2||h<2)return false;
   const ratio=Math.min(2,window.devicePixelRatio||1),sw=Math.floor(w*ratio),sh=Math.floor(h*ratio);
   if(canvas.width!==sw||canvas.height!==sh){canvas.width=sw;canvas.height=sh}
   gl.viewport(0,0,sw,sh);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.disable(gl.CULL_FACE);gl.clearColor(.001,.006,.009,1);
   gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(shader.p);
   gl.uniformMatrix4fv(shader.vp,false,new Float32Array(multiply(
    perspective(SPEC.verticalFov,w/h),lookAt(c.eye,c.focus))));
   gl.uniform1f(shader.time,seconds);
   draw(floor,identity(),0,[1,1,1]);draw(wall,identity(),1,[1,1,1]);
   const people=layout(mode,progress);
   for(const a of people.enemies)draw(person,model(a,mode),2,[.98,.22,.25]);
   for(const a of people.allies)draw(person,model(a,mode),2,
    a.id==='hero'?[.98,.78,.30]:[.13,.80,.9]);
   if(Math.floor(seconds*6)!==Math.floor((seconds-dt)*6))
    status.textContent=(mode==='outer'?'外侧摄像机':'内侧摄像机')+' R '+c.radius+
     'm | 主角 '+(people.allies[0].angle*180/Math.PI).toFixed(0)+'°';
   return true;
  }
  function setActive(on){
   active=!!on;canvas.hidden=!active;hud.hidden=!active;
   view.classList.toggle('ring-arena-active',active);
   if(active)render(0);
  }
  const inspect=()=>({active,renderer:gl?'webgl':'unavailable',mode,progress,target,
   rings:SPEC,actors:layout(mode,progress),camera:camera(mode,progress),
   art:'3D proxy actors only; original L2D assets untouched'});
  return Object.freeze({setActive,render,inspect,get canvas(){return canvas}});
 }
 return Object.freeze({SPEC,layout,camera,lookAt,perspective,multiply,model,project,create});
});