/* Paperchalk World — circular battlefield with ORIGINAL running L2D canvases.
 * Actors have immutable ground anchors. A single moving WebGL view/projection
 * draws the cylindrical room AND the animated L2D textures. No CSS parallax,
 * no flat proxy boxes, no portrait overwrites and no invented rear artwork.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperWorldRingArena=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const TAU=Math.PI*2,clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
 const lerp=(a,b,t)=>a+(b-a)*t,rad=(d)=>d*Math.PI/180;
 const SPEC=Object.freeze({
  wallRadius:11.4,wallHeight:6.3,outerRoleRadius:7.42,
  innerRoleRadius:4.28,outerCameraRadius:9.78,
  innerCameraRadius:1.54,verticalFov:61,
  cameraStartAngle:rad(14),cameraEndAngle:rad(-14)
 });
 // Deliberately human-authored STATIONARY formation angles; never derive
 // actors from camera interpolation or pointer delta.
 const formation=Object.freeze({
  allies:Object.freeze([0,rad(-61),rad(-29),rad(37)]),
  enemies:Object.freeze([rad(-51),rad(-17),rad(17),rad(52)])
 });
 const bindings=Object.freeze({
  hero:'player', 'ally-2':'ally2','ally-3':'ally3','ally-4':'ally4',
  'enemy-1':'enemy','enemy-2':'enemy2','enemy-3':'enemy3','enemy-4':'enemy4'
 });
 const heights=Object.freeze({
  hero:1.62,'ally-2':1.64,'ally-3':1.60,'ally-4':1.59,
  'enemy-1':1.58,'enemy-2':1.59,'enemy-3':1.60,'enemy-4':1.58
 });
 const polar=(r,a,y=0)=>({x:r*Math.sin(a),y,z:r*Math.cos(a)});
 const radius=v=>Math.hypot(v.x,v.z);
 const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
 const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
 const normalize=a=>{const m=Math.hypot(a.x,a.y,a.z)||1;return {x:a.x/m,y:a.y/m,z:a.z/m}};
 function lookAt(eye,target){
  const f=normalize({x:target.x-eye.x,y:target.y-eye.y,z:target.z-eye.z});
  const s=normalize(cross(f,{x:0,y:1,z:0})),u=cross(s,f);
  return [s.x,u.x,-f.x,0,s.y,u.y,-f.y,0,s.z,u.z,-f.z,0,
    -dot(s,eye),-dot(u,eye),dot(f,eye),1];
 }
 function perspective(fov,aspect,near=.07,far=100){
  const f=1/Math.tan(fov*Math.PI/360);
  return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
 }
 function multiply(a,b){
  const result=new Array(16).fill(0);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++)
   for(let k=0;k<4;k++)result[c*4+r]+=a[k*4+r]*b[c*4+k];
  return result;
 }
 const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 function actor(id,team,r,angle){
  const pos=polar(r,angle);
  return Object.freeze({id,slot:bindings[id],team,angle,
   height:heights[id],soleX:.5,soleY:.979,crownY:.028,
   x:pos.x,y:0,z:pos.z});
 }
 const LAYOUTS=Object.freeze(Object.fromEntries(['outer','inner'].map(mode=>{
  const outer=mode==='outer';
  const allyRadius=outer?SPEC.outerRoleRadius:SPEC.innerRoleRadius;
  const enemyRadius=outer?SPEC.innerRoleRadius:SPEC.outerRoleRadius;
  return [mode,Object.freeze({
   mode,
   allies:Object.freeze(['hero','ally-2','ally-3','ally-4'].map((id,i)=>
    actor(id,'ally',allyRadius,formation.allies[i]))),
   enemies:Object.freeze(['enemy-1','enemy-2','enemy-3','enemy-4'].map((id,i)=>
    actor(id,'enemy',enemyRadius,formation.enemies[i])))
  })];
 })));
 // Camera moves, while ALL actor coordinates remain bit-for-bit unchanged.
 function layout(mode='outer'){return LAYOUTS[mode]||LAYOUTS.outer}
 function camera(mode='outer',progress=0){
  const t=clamp(Number(progress)||0,0,1),outer=mode==='outer';
  const angle=outer?lerp(SPEC.cameraStartAngle,SPEC.cameraEndAngle,t):
   lerp(rad(-19),rad(19),t);
  const R=outer?SPEC.outerCameraRadius:SPEC.innerCameraRadius;
  const eye=polar(R,angle,1.45);
  const focus=polar(outer?2.9:8.0,angle,1.12);
  return {mode,progress:t,radius:R,angle,eye,focus};
 }
 function project(p,cam,aspect=16/9){
  const vp=multiply(perspective(SPEC.verticalFov,aspect),lookAt(cam.eye,cam.focus));
  const x=p.x,y=p.y,z=p.z,m=vp;
  const w=m[3]*x+m[7]*y+m[11]*z+m[15];
  if(w<=0)return {valid:false};
  return {valid:true,x:(m[0]*x+m[4]*y+m[8]*z+m[12])/w,
   y:(m[1]*x+m[5]*y+m[9]*z+m[13])/w,depth:w};
 }
 function shader(gl,type,source){
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
   const info=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(info);
  }
  return s;
 }
 function program(gl,vsource,fsource,attrs,uniforms){
  const p=gl.createProgram();
  const v=shader(gl,gl.VERTEX_SHADER,vsource),f=shader(gl,gl.FRAGMENT_SHADER,fsource);
  gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
  gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  const result={handle:p};
  for(const name of attrs)result[name]=gl.getAttribLocation(p,name);
  for(const name of uniforms)result[name]=gl.getUniformLocation(p,name);
  return result;
 }
 const worldVertex=[
  'precision highp float;',
  'attribute vec3 aP;uniform mat4 uVP;varying vec3 vWorld;',
  'void main(){vWorld=aP;gl_Position=uVP*vec4(aP,1.0);}'
 ].join('\n');
 const worldFragment=[
  'precision highp float;varying vec3 vWorld;uniform float uTime;uniform int uSurface;',
  'float hash(float x){return fract(sin(x*131.13)*43758.5453);}',
  'float line(float v,float n,float w){return 1.0-smoothstep(w,w+.025,abs(fract(v*n)-.5));}',
  'void main(){vec3 color;',
  'if(uSurface==0){',
  'float r=length(vWorld.xz);float a=atan(vWorld.x,vWorld.z)/6.2831853+.5;',
  'float radial=line(r/11.4,24.0,.027);float spokes=line(a,48.0,.019);',
  'float allies=1.0-smoothstep(.016,.053,abs(r-7.42));',
  'float enemies=1.0-smoothstep(.016,.053,abs(r-4.28));',
  'color=vec3(.006,.019,.023)+vec3(.02,.18,.14)*(radial*.6+spokes*.26)',
  '+vec3(.01,.16,.14)*(allies+enemies);',
  'float innerCam=1.0-smoothstep(.01,.05,abs(r-1.54));',
  'float outerCam=1.0-smoothstep(.01,.05,abs(r-9.78));',
  'color+=vec3(.25,.20,.04)*(innerCam+outerCam)*.35;',
  '}else{',
  'float a=atan(vWorld.x,vWorld.z)/6.2831853+.5;',
  'float col=floor(a*92.0);float v=vWorld.y*8.3+uTime*(.4+hash(col)*1.8);',
  'float glyph=step(.19,fract(a*92.0))*step(fract(a*92.0),.82)',
  '*step(.16,fract(v))*step(fract(v),.82);',
  'float bit=step(.5,hash(col*11.1+floor(v)*3.4));',
  'float bright=pow(max(0.0,sin(v*1.9+hash(col)*6.28)),12.0);',
  'color=vec3(.003,.010,.014)+vec3(.008,.075,.06)*line(a,92.0,.012)',
  '+glyph*bit*(vec3(.018,.20,.13)+vec3(.05,.48,.26)*bright);',
  '}gl_FragColor=vec4(color,1.0);}'
 ].join('\n');
 // Alpha-blended original L2D canvas pixels on CAMERA-FACING 3D planes.
 // Vertical pivot uses the source canvas's measured shoe & crown fractions.
 // No regenerated textures or destructive crop operations.
 const portraitVertex=[
  'precision highp float;attribute vec2 aUv;',
  'uniform mat4 uVP;uniform vec3 uFoot;uniform vec3 uRight;',
  'uniform vec3 uUp;uniform float uHeight;uniform float uSoleX;',
  'uniform float uSoleY;uniform float uCrownY;',
  'varying vec2 vUv;',
  'void main(){float H=uHeight/max(.01,uSoleY-uCrownY);',
  'vec3 pos=uFoot+uRight*((aUv.x-uSoleX)*H)',
  '+uUp*((uSoleY-aUv.y)*H);',
  'vUv=aUv;gl_Position=uVP*vec4(pos,1.0);}'
 ].join('\n');
 const portraitFragment=[
  'precision mediump float;varying vec2 vUv;uniform sampler2D uTexture;',
  'void main(){vec4 t=texture2D(uTexture,vec2(vUv.x,1.0-vUv.y));',
  'if(t.a<.025)discard;gl_FragColor=t;}'
 ].join('\n');
 function worldMesh(gl){
  const floor=[],wall=[];
  const push=(to,a,b,c)=>to.push(...a,...b,...c);
  const N=160;
  for(let i=0;i<N;i++){
   const a=i*TAU/N,b=(i+1)*TAU/N;
   const p=polar(SPEC.wallRadius,a),q=polar(SPEC.wallRadius,b);
   push(floor,[0,0,0],[p.x,0,p.z],[q.x,0,q.z]);
   push(wall,[p.x,0,p.z],[p.x,SPEC.wallHeight,p.z],[q.x,SPEC.wallHeight,q.z]);
   push(wall,[p.x,0,p.z],[q.x,SPEC.wallHeight,q.z],[q.x,0,q.z]);
  }
  return [floor,wall].map(arr=>{
   const buffer=gl.createBuffer(),data=new Float32Array(arr);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
   return {buffer,count:data.length/3};
  });
 }
 function prepareTexture(gl){
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
  return {texture,painted:false,updated:-999,frames:0,source:null};
 }
 function create({stage,view,onExit}={}){
  if(!stage||!view)throw Error('Ring arena must mount in the real game');
  const style=document.createElement('style');
  style.textContent=[
   '#view.ring-arena-active #scene{width:100cqw!important;height:100cqh!important;max-width:none!important;aspect-ratio:auto!important;border-radius:0!important;overflow:hidden}',
   '#view.ring-arena-active #scene::after{content:none!important}',
   '#view.ring-arena-active #source{visibility:hidden!important}',
   '#view.ring-arena-active > #fog,#view.ring-arena-active > #ui-edge-fog,#view.ring-arena-active > #novel-ui{display:none!important}',
   '#ring-arena-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1;touch-action:none;pointer-events:auto;cursor:grab}',
   '#ring-arena-canvas[hidden],#ring-arena-controls[hidden]{display:none!important}',
   // Keep existing L2D artists' exact original rigs animating while visually
   // routing their finished canvases into WebGL instead of the old DOM stage.
   '#view.ring-arena-active [data-l2d-actor]{display:block!important;position:absolute!important;left:-1500px!important;top:0!important;width:1024px!important;height:1024px!important;opacity:0!important;pointer-events:none!important;overflow:visible!important;transform:none!important;translate:none!important}',
   '#view.ring-arena-active [data-l2d-actor] [data-l2d-image]{position:absolute!important;left:0!important;top:0!important;width:1024px!important;height:1024px!important;max-width:none!important;display:block!important;object-fit:fill!important;transform:none!important;scale:1!important}',
   '#view.ring-arena-active [data-l2d-actor] [data-l2d-canvas]{transform:none!important;scale:1!important}',
   '#ring-arena-controls{position:absolute;inset:0;z-index:15;pointer-events:none;color:#d9f6e9;font:500 12px/1.4 system-ui,sans-serif}',
   '#ring-arena-controls .top{position:absolute;left:14px;top:12px;padding:8px 12px;background:rgba(1,14,18,.68);border-left:2px solid #81d8bb}',
   '#ring-arena-controls .top b{display:block;letter-spacing:.15em;font-size:11px}',
   '#ring-arena-controls .top small{font-size:10px;color:#99b5af}',
   '#ring-arena-controls .bottom{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:7px;align-items:center;justify-content:center;flex-wrap:wrap;width:94%}',
   '#ring-arena-controls button{pointer-events:auto;min-height:38px;padding:8px 11px;border:1px solid rgba(118,196,166,.5);border-radius:7px;background:rgba(2,17,23,.86);font:inherit;color:#e7fff3;cursor:pointer}',
   '#ring-arena-controls button[aria-pressed=true]{background:#185b4a;border-color:#aaf9d6}',
   '#ring-arena-controls .status{position:absolute;right:14px;top:14px;font:11px/1.5 monospace;color:#b1dccc;text-align:right}',
   '@media(max-width:690px){#ring-arena-controls .status,#ring-arena-controls .top small{display:none}#ring-arena-controls button{padding:6px 8px;min-height:35px}}'
  ].join('\n');
  document.head.append(style);
  const canvas=document.createElement('canvas');canvas.id='ring-arena-canvas';
  canvas.hidden=true;canvas.setAttribute('aria-label','固定八人站位的圆形3D战场，滑动只移动摄像机');stage.append(canvas);
  const hud=document.createElement('section');hud.id='ring-arena-controls';hud.hidden=true;
  hud.innerHTML=[
   '<div class="top"><b>RING BATTLE / 3D</b><small>人物世界坐标固定 · 镜头沿圆环运动</small></div>',
   '<div class="status" role="status"></div><div class="bottom">',
   '<button data-shift="-1" type="button">◀ 镜头向左</button>',
   '<button data-mode="outer" aria-pressed="true" type="button">我方包围敌人</button>',
   '<button data-mode="inner" aria-pressed="false" type="button">敌人包围我方</button>',
   '<button data-shift="1" type="button">镜头向右 ▶</button>',
   '<button data-exit type="button">返回</button></div>'
  ].join('');
  stage.append(hud);
  const status=hud.querySelector('.status');
  let gl=null,world=null,portrait=null,floor=null,wall=null,quad=null;
  const textures=new Map();
  try{
   gl=canvas.getContext('webgl',{depth:true,alpha:false,antialias:true});
   if(!gl)throw Error('WebGL unavailable');
   world=program(gl,worldVertex,worldFragment,['aP'],['uVP','uTime','uSurface']);
   portrait=program(gl,portraitVertex,portraitFragment,['aUv'],
     ['uVP','uFoot','uRight','uUp','uHeight','uSoleX','uSoleY','uCrownY','uTexture']);
   [floor,wall]=worldMesh(gl);
   quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,0,1,1,0,0,1,1,1,1,0]),gl.STATIC_DRAW);
   for(const id of Object.keys(bindings))textures.set(id,prepareTexture(gl));
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  }catch(err){
   canvas.dataset.error=String(err.message||err);status.textContent='WebGL failed '+String(err.message||err);
   gl=null;
  }
  let active=false,mode='outer',position=0,target=.0,elapsed=0,frames=0,paintCount=0;
  let drag=null;
  const shift=d=>{target=clamp(target+d,0,1)};
  canvas.addEventListener('pointerdown',e=>{
   if(!active)return;e.preventDefault();e.stopPropagation();
   drag={id:e.pointerId,x:e.clientX,y:e.clientY,initial:target};
   canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
   if(!drag||drag.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();
   const dx=e.clientX-drag.x;
   target=clamp(drag.initial+dx/Math.max(270,canvas.clientWidth)*1.5,0,1);
  });
  for(const type of ['pointerup','pointercancel']){
   canvas.addEventListener(type,e=>{if(drag&&drag.id===e.pointerId){drag=null;e.stopPropagation()}});
  }
  hud.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   e.preventDefault();e.stopPropagation();
   if(b.hasAttribute('data-shift'))shift(Number(b.dataset.shift)*.14);
   if(b.hasAttribute('data-mode')){
    mode=b.dataset.mode;
    for(const option of hud.querySelectorAll('[data-mode]'))
     option.setAttribute('aria-pressed',String(option.dataset.mode===mode));
    render(0);
   }
   if(b.hasAttribute('data-exit')&&typeof onExit==='function')onExit();
  });
  document.addEventListener('keydown',e=>{
   if(!active||e.metaKey||e.ctrlKey||e.altKey)return;
   if(['ArrowRight','d','D'].includes(e.key)){e.preventDefault();shift(.07)}
   if(['ArrowLeft','a','A'].includes(e.key)){e.preventDefault();shift(-.07)}
  });
  function sourceFor(actor){
   const runtime=window.PaperchalkL2D?.get(actor.slot);
   if(!runtime||runtime.root.hidden||runtime.img.hidden||
     runtime.root.dataset.l2dState!=='ready')return null;
   const source=runtime.clip?.type==='native'?runtime.clip.img:runtime.canvas;
   if(!source)return null;
   const w=source.videoWidth||source.naturalWidth||source.width;
   const h=source.videoHeight||source.naturalHeight||source.height;
   if(!w||!h)return null;
   return {runtime,source,w,h};
  }
  // Throttle pixel uploads, preserving the original 30 fps source animation.
  // Uploads are a view of the real current L2D canvas, not a flattened art
  // asset checked into the repository. Distinct characters keep distinct rigs.
  function updateTexture(a,now){
   const targetTexture=textures.get(a.id),desc=sourceFor(a);
   if(!desc)return targetTexture.painted;
   const interval=a.id==='hero'?50:78;
   if(now-targetTexture.updated<interval&&targetTexture.painted)return true;
   const size=a.id==='hero'?768:512;
   if(!targetTexture.stage||targetTexture.stage.width!==size){
    targetTexture.stage=document.createElement('canvas');
    targetTexture.stage.width=size;targetTexture.stage.height=size;
    targetTexture.ctx=targetTexture.stage.getContext('2d',{alpha:true});
   }
   const ctx=targetTexture.ctx;
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,size,size);
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   try{
    ctx.drawImage(desc.source,0,0,size,size);
    gl.bindTexture(gl.TEXTURE_2D,targetTexture.texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,targetTexture.stage);
    targetTexture.updated=now;
    targetTexture.painted=true;
    targetTexture.frames++;
    paintCount++;
   }catch(error){
    targetTexture.error=String(error.message||error);
   }
   return targetTexture.painted;
  }
  function drawWorld(mesh,kind,viewProjection){
   gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
   gl.vertexAttribPointer(world.aP,3,gl.FLOAT,false,12,0);
   gl.uniform1i(world.uSurface,kind);
   gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  }
  function drawActors(actors,cam,vp){
   // Transparent L2D textures are sorted far to near; pixels share the same
   // depth-test as the floor and cylinder, no independent DOM z-index.
   const ordered=actors.map(a=>({actor:a,d:Math.hypot(a.x-cam.eye.x,a.z-cam.eye.z)}))
    .sort((a,b)=>b.d-a.d);
   gl.useProgram(portrait.handle);
   gl.uniformMatrix4fv(portrait.uVP,false,new Float32Array(vp));
   gl.bindBuffer(gl.ARRAY_BUFFER,quad);
   gl.enableVertexAttribArray(portrait.aUv);
   gl.vertexAttribPointer(portrait.aUv,2,gl.FLOAT,false,8,0);
   const f=normalize({x:cam.focus.x-cam.eye.x,y:cam.focus.y-cam.eye.y,z:cam.focus.z-cam.eye.z});
   const right=normalize(cross(f,{x:0,y:1,z:0}));
   gl.uniform3fv(portrait.uRight,new Float32Array([right.x,right.y,right.z]));
   gl.uniform3fv(portrait.uUp,new Float32Array([0,1,0]));
   gl.activeTexture(gl.TEXTURE0);gl.uniform1i(portrait.uTexture,0);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   gl.depthMask(false);
   for(const item of ordered){
    const a=item.actor,t=textures.get(a.id);
    if(!t.painted)continue;
    gl.uniform3fv(portrait.uFoot,new Float32Array([a.x,a.y,a.z]));
    gl.uniform1f(portrait.uHeight,a.height);
    gl.uniform1f(portrait.uSoleX,a.soleX);
    gl.uniform1f(portrait.uSoleY,a.soleY);
    gl.uniform1f(portrait.uCrownY,a.crownY);
    gl.bindTexture(gl.TEXTURE_2D,t.texture);
    gl.drawArrays(gl.TRIANGLES,0,6);
   }
   gl.depthMask(true);gl.disable(gl.BLEND);
  }
  function render(dt=1/60){
   if(!active)return false;
   const k=1-Math.exp(-clamp(Number(dt)||0,0,.06)*7);
   position=lerp(position,target,k);
   if(Math.abs(position-target)<.00005)position=target;
   elapsed+=clamp(Number(dt)||0,0,.06);frames++;
   if(!gl)return false;
   const w=canvas.clientWidth,h=canvas.clientHeight;
   if(w<2||h<2)return false;
   const pixel=Math.min(window.devicePixelRatio||1,1.75);
   const W=Math.floor(w*pixel),H=Math.floor(h*pixel);
   if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
   const cam=camera(mode,position),vp=multiply(perspective(SPEC.verticalFov,w/h),lookAt(cam.eye,cam.focus));
   gl.viewport(0,0,W,H);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.depthMask(true);
   gl.clearColor(.001,.005,.008,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.useProgram(world.handle);gl.enableVertexAttribArray(world.aP);
   gl.uniformMatrix4fv(world.uVP,false,new Float32Array(vp));
   gl.uniform1f(world.uTime,elapsed);
   drawWorld(floor,0,vp);drawWorld(wall,1,vp);
   gl.disableVertexAttribArray(world.aP);
   const all=[...layout(mode).allies,...layout(mode).enemies];
   const now=performance.now();
   for(const a of all)updateTexture(a,now);
   drawActors(all,cam,vp);
   if(frames%12===0){
    const ready=all.filter(a=>textures.get(a.id).painted).length;
    status.textContent=(mode==='outer'?'外侧镜头':'内侧镜头')+
     ' · L2D '+ready+'/8 · 相机 '+Math.round(cam.angle*180/Math.PI)+'°';
    canvas.dataset.l2dReady=String(ready);
    canvas.dataset.renderedFrames=String(frames);
   }
   return true;
  }
  function setActive(value){
   active=!!value;canvas.hidden=!active;hud.hidden=!active;
   view.classList.toggle('ring-arena-active',active);
   if(active){elapsed=0;frames=0;render(0)}
  }
  const inspect=()=>({active,renderer:gl?'webgl-l2d':'unavailable',
   mode,progress:position,target,actors:layout(mode),
   camera:camera(mode,position),ring:SPEC,
   l2dReady:[...textures.values()].filter(t=>t.painted).length,
   l2dFrames:Object.fromEntries([...textures.entries()].map(([id,t])=>[id,t.frames])),
   pixelsFrom:'existing PaperchalkL2D actors; source assets unchanged'});
  return Object.freeze({setActive,render,inspect,get canvas(){return canvas}});
 }
 return Object.freeze({SPEC,formation,bindings,layout,camera,lookAt,
  perspective,multiply,project,create});
});