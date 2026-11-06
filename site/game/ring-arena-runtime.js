/* Paperchalk World — cinematic shallow-arc battlefield with ORIGINAL running L2D canvases.
 * Actors have immutable ground anchors. A single moving WebGL view/projection
 * draws a panoramic curved stage AND animated L2D textures. No CSS parallax,
 * no flat proxy boxes, no portrait overwrites and no invented rear artwork.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperWorldRingArena=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
 const rad=d=>d*Math.PI/180;
 const SPEC=Object.freeze({
  stageType:'wide-cinematic-arc',wallRadius:32,wallHeight:13,
  wallCenterZ:-16,wallArcHalfAngle:rad(78),
  floorWidth:96,floorFrontZ:48,floorBackZ:-55,
  outerRoleRadius:10.55,innerRoleRadius:8.30,
  outerCameraRadius:11.5,innerCameraRadius:7.47,
  verticalFov:48,battleFocusZ:6.8
 });
 // Art-directed 3D footholds: four enemies occupy a deliberately WIDER
 // shallow arc. Unlike the old small circle, everyone keeps an independent,
 // immutable position, and perspective is made by a real shared camera.
 const STAGING=Object.freeze({
  outer:Object.freeze({
   allies:Object.freeze([[0,10.55],[-1.8,9.6],[1.8,9.6],[-3.5,9.0]]),
   enemies:Object.freeze([[-1.65,6.85],[-.57,6.47],[.57,6.47],[1.65,6.85]])
  }),
  inner:Object.freeze({
   allies:Object.freeze([[0,8.3],[-1.8,8.0],[1.8,8.0],[-3.5,7.7]]),
   enemies:Object.freeze([[-1.62,12.48],[-.55,12.87],[.55,12.87],[1.62,12.48]])
  })
 });
 const bindings=Object.freeze({
  hero:'player', 'ally-2':'ally2','ally-3':'ally3','ally-4':'ally4',
  'enemy-1':'enemy','enemy-2':'enemy2','enemy-3':'enemy3','enemy-4':'enemy4'
 });
 const heights=Object.freeze({
  hero:1.62,'ally-2':1.64,'ally-3':1.60,'ally-4':1.59,
  'enemy-1':1.58,'enemy-2':1.59,'enemy-3':1.60,'enemy-4':1.58
 });
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
 function actor(id,team,position){
  const [x,z]=position;
  return Object.freeze({id,slot:bindings[id],team,
   angle:Math.atan2(x,z),height:heights[id],
   soleX:.5,soleY:.979,crownY:.028,x,y:0,z});
 }
 const LAYOUTS=Object.freeze(Object.fromEntries(['outer','inner'].map(mode=>{
  const coords=STAGING[mode];
  return [mode,Object.freeze({mode,
   allies:Object.freeze(['hero','ally-2','ally-3','ally-4']
    .map((id,i)=>actor(id,'ally',coords.allies[i]))),
   enemies:Object.freeze(['enemy-1','enemy-2','enemy-3','enemy-4']
    .map((id,i)=>actor(id,'enemy',coords.enemies[i])))
  })];
 })));
 // Camera moves, while ALL actor coordinates remain bit-for-bit unchanged.
 function layout(mode='outer'){return LAYOUTS[mode]||LAYOUTS.outer}
 // Keep all eight immutable world anchors for the future full-team mode,
 // but this cinematic rear-battle presentation draws ONLY the heroine and
 // the four opponents. Allied teammates are intentionally invisible, not removed.
 const HIDDEN_ALLY_IDS=Object.freeze(['ally-2','ally-3','ally-4']);
 const VISIBLE_LAYOUTS=Object.freeze(Object.fromEntries(['outer','inner'].map(mode=>{
  const scene=layout(mode);
  return [mode,Object.freeze([scene.allies[0],...scene.enemies])];
 })));
 function visibleActors(mode='outer'){return VISIBLE_LAYOUTS[mode]||VISIBLE_LAYOUTS.outer}
 // One fixed left-foreground camera per battle mode; both look straight
 // at the center of the enemy formation on a horizontal optical axis.
 const SHOT_NAMES=Object.freeze(['固定左机位']);
 const CAMERA_STOPS=Object.freeze({
  outer:Object.freeze([Object.freeze({
   id:'left',eyeX:1.30,eyeZ:11.55,eyeY:1.50,
   focusX:0,focusY:1.50,focusZ:6.80,fov:56
  })]),
  inner:Object.freeze([Object.freeze({
   id:'left',eyeX:-1.30,eyeZ:7.15,eyeY:1.50,
   focusX:0,focusY:1.50,focusZ:12.50,fov:52
  })])
 });
 const cameraPitchDeg=c=>Math.atan2(c.eye.y-c.focus.y,
  Math.hypot(c.focus.x-c.eye.x,c.focus.z-c.eye.z))*180/Math.PI;
 const stopIndex=()=>0;
 function camera(mode='outer',index=0){
  const i=stopIndex(index),p=(CAMERA_STOPS[mode]||CAMERA_STOPS.outer)[i];
  const eye={x:p.eyeX,y:p.eyeY,z:p.eyeZ};
  return {mode,index:i,shot:p.id,
   angle:Math.atan2(eye.x,eye.z),radius:Math.hypot(eye.x,eye.z),fov:p.fov,
   eye,focus:{x:p.focusX,y:p.focusY,z:p.focusZ}};
 }
 // Preserve the DESIGNED horizontal battle framing when a browser or
 // device changes aspect ratio. Portrait canvases no longer crop half the
 // team by reusing a desktop vertical field of view.
 function responsiveFov(fov,aspect=16/9){
  const valid=clamp(Number(aspect)||16/9,.35,3.5);
  return clamp(2*Math.atan(Math.tan(rad(fov/2))*(16/9)/valid)*180/Math.PI,25,125);
 }
 // Tall character source images must retain their authored aspect ratio.
 function portraitFit(w,h,size){
  const width=Math.max(1,Number(w)||1),height=Math.max(1,Number(h)||1);
  const scale=size/Math.max(width,height);
  const drawW=width*scale,drawH=height*scale;
  return {x:(size-drawW)/2,y:(size-drawH)/2,width:drawW,height:drawH};
 }
 // Cap rendered output pixels on high-DPR devices, without CSS distortion.
 function renderPixelRatio(w,h,dpr=1){
  const raw=Math.max(.5,Math.min(Number(dpr)||1,1.75));
  return Math.max(.55,Math.min(raw,Math.sqrt(2400000/Math.max(1,w*h))));
 }
 const VERTICAL_LENS_SHIFT=.23;
 function cameraVP(cam,aspect=16/9){
  // Off-axis lens: raise the composition without pitching the actual optical axis.
  // The EXACT same matrix is used by WebGL and 3D occlusion/safe-zone tests.
  const vp=multiply(perspective(responsiveFov(cam.fov||SPEC.verticalFov,aspect),aspect),lookAt(cam.eye,cam.focus));
  for(const i of [0,4,8,12])vp[i+1]+=VERTICAL_LENS_SHIFT*vp[i+3];
  return vp;
 }
 function project(p,cam,aspect=16/9){
  const vp=cameraVP(cam,aspect);
  const x=p.x,y=p.y,z=p.z,m=vp;
  const w=m[3]*x+m[7]*y+m[11]*z+m[15];
  if(w<=0)return {valid:false};
  return {valid:true,x:(m[0]*x+m[4]*y+m[8]*z+m[12])/w,
   y:(m[1]*x+m[5]*y+m[9]*z+m[13])/w,depth:w};
 }
 // Actual WebGL billboard quad bounds from the SAME 3D projection used in
 // the render shader. Used to prevent enemy clipping on authored camera stops.
 function portraitBounds(actor,cam,aspect=16/9){
  const forward=normalize({x:cam.focus.x-cam.eye.x,y:0,z:cam.focus.z-cam.eye.z});
  const right=normalize(cross(forward,{x:0,y:1,z:0}));
  const h=actor.height/Math.max(.01,actor.soleY-actor.crownY),points=[];
  for(const u of [0,1])for(const v of [0,1])
   points.push(project({
    x:actor.x+right.x*(u-actor.soleX)*h,
    y:actor.y+(actor.soleY-v)*h,
    z:actor.z+right.z*(u-actor.soleX)*h
   },cam,aspect));
  if(points.some(p=>!p.valid))return {valid:false};
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  return {valid:true,left:Math.min(...xs),right:Math.max(...xs),
   top:Math.max(...ys),bottom:Math.min(...ys),
   heightFraction:(Math.max(...ys)-Math.min(...ys))/2};
 }
 // Protagonist original back art occupies x≈377..655 of its untouched 1024
 // RGBA canvas. This padded *measurement* is for overlap checks only, never
 // crops, paints, or replaces any of the user's 3D/L2D source pixels.
 const CANONICAL_BACK_UV=Object.freeze({left:.32,right:.68,top:.02,bottom:.985});
 function portraitVisibleBounds(actor,cam,uv=CANONICAL_BACK_UV,aspect=16/9){
  const f=normalize({x:cam.focus.x-cam.eye.x,y:0,z:cam.focus.z-cam.eye.z});
  const right=normalize(cross(f,{x:0,y:1,z:0}));
  const h=actor.height/Math.max(.01,actor.soleY-actor.crownY),pts=[];
  for(const u of [uv.left,uv.right])for(const v of [uv.top,uv.bottom])
   pts.push(project({x:actor.x+right.x*(u-actor.soleX)*h,
    y:actor.y+(actor.soleY-v)*h,z:actor.z+right.z*(u-actor.soleX)*h},
    cam,aspect));
  if(pts.some(p=>!p.valid))return {valid:false};
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  return {valid:true,left:Math.min(...xs),right:Math.max(...xs),
   top:Math.max(...ys),bottom:Math.min(...ys)};
 }
 function battleVisualSafety(mode='outer',index=0,aspect=16/9,heroUv=CANONICAL_BACK_UV){
  const c=camera(mode,index),actors=layout(mode),hero=portraitVisibleBounds(actors.allies[0],c,heroUv,aspect);
  const foes=actors.enemies.map(a=>portraitBounds(a,c,aspect));
  const gap=Math.min(...foes.map(b=>b.left))-hero.right;
  return {valid:hero.valid&&foes.every(b=>b.valid),gap,hero,foes,
   clear:gap>=.045&&foes.every(b=>b.left>=-.93&&b.right<=.93)};
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
  'precision highp float;varying vec3 vWorld;uniform float uTime;uniform int uSurface;uniform float uMode;',
  'float hash(float x){return fract(sin(x*131.13)*43758.5453);}',
  'float line(float v,float n,float w){return 1.0-smoothstep(w,w+.025,abs(fract(v*n)-.5));}',
  'void main(){vec3 color;',
  'if(uSurface==0){',
  'float r=length(vWorld.xz);float a=atan(vWorld.x,vWorld.z)/6.2831853+.5;',
  'float radial=line(r/32.0,40.0,.016);float spokes=line(a,78.0,.013);',
  'float allies=1.0-smoothstep(.016,.065,abs(r-mix(10.55,8.3,uMode)));',
  'float enemies=1.0-smoothstep(.016,.065,abs(r-mix(6.65,12.9,uMode)));',
  'color=vec3(.005,.013,.016)+vec3(.009,.055,.049)*(radial*.40+spokes*.10)',
  '+vec3(.006,.085,.08)*(allies+enemies)*.22;',
  'color+=vec3(.008,.019,.016)*(allies+enemies)*.18;',
  '}else{',
  'float col=floor(vWorld.x*3.0);float v=vWorld.y*8.0+uTime*(.35+hash(col)*1.1);',
  'float cellX=fract(vWorld.x*3.0);float cellY=fract(v);',
  'float glyph=step(.18,cellX)*step(cellX,.80)*step(.16,cellY)*step(cellY,.83);',
  'float bit=step(.55,hash(col*11.1+floor(v)*3.4));',
  'float bright=pow(max(0.0,sin(v*1.4+hash(col)*6.28)),13.0);',
  'color=vec3(.003,.011,.014)+vec3(.006,.045,.038)*line(vWorld.x,3.0,.016)',
  '+glyph*bit*(vec3(.009,.13,.085)+vec3(.04,.37,.22)*bright);',
  '}gl_FragColor=vec4(color,1.0);}'
 ].join('\n');
 // Alpha-blended original L2D canvas pixels on CAMERA-FACING 3D planes.
 // Vertical pivot uses the source canvas's measured shoe & crown fractions.
 // No regenerated textures or destructive crop operations.
 const portraitVertex=[
  'precision highp float;attribute vec2 aUv;',
  'uniform mat4 uVP;uniform vec3 uFoot;uniform vec3 uRight;',
  'uniform vec3 uUp;uniform float uHeight;uniform float uSoleX;',
  'uniform float uSoleY;uniform float uCrownY;uniform float uWidthScale;',
  'varying vec2 vUv;',
  'void main(){float H=uHeight/max(.01,uSoleY-uCrownY);',
  'vec3 pos=uFoot+uRight*((aUv.x-uSoleX)*H*uWidthScale)',
  '+uUp*((uSoleY-aUv.y)*H);',
  'vUv=aUv;gl_Position=uVP*vec4(pos,1.0);}'
 ].join('\n');
 const portraitFragment=[
  'precision mediump float;varying vec2 vUv;uniform sampler2D uTexture;',
  'uniform float uHit;uniform float uDim;',
  'void main(){vec4 t=texture2D(uTexture,vec2(vUv.x,1.0-vUv.y));',
  'if(t.a<.025)discard;',
  'vec3 rgb=mix(t.rgb,vec3(1.0,.81,.70),clamp(uHit,0.0,1.0));',
  'rgb*=1.0-clamp(uDim,0.0,.80);',
  'gl_FragColor=vec4(rgb,t.a);}'
 ].join('\n');
 // Lightweight ground contact: one blended elliptical quad under each
 // visible actor, leaving all original L2D textures and lights untouched.
 const shadowVertex=[
  'precision highp float;attribute vec2 aUv;uniform mat4 uVP;',
  'uniform vec3 uFoot;uniform float uRadius;varying vec2 vLocal;',
  'void main(){vLocal=aUv*2.0-1.0;',
  'vec3 p=uFoot+vec3(vLocal.x*uRadius,0.016,vLocal.y*uRadius*.55);',
  'gl_Position=uVP*vec4(p,1.0);}'
 ].join('\n');
 const shadowFragment=[
  'precision mediump float;varying vec2 vLocal;',
  'void main(){float d=dot(vLocal,vLocal);float w=1.0-smoothstep(.14,1.0,d);',
  'gl_FragColor=vec4(.010,.035,.029,.23*w);}'
 ].join('\n');
 // Physically reversed wall bend when viewed from the opposite side.
 function backdropPoint(mode='outer',angle=0){
  const a=clamp(angle,-SPEC.wallArcHalfAngle,SPEC.wallArcHalfAngle);
  const bow=SPEC.wallRadius*(1-Math.cos(a));
  return mode==='inner'
   ? {x:SPEC.wallRadius*Math.sin(a),z:26.0-bow*.35}
   : {x:SPEC.wallRadius*Math.sin(a),z:3.4-bow*.7};
 }
 function worldMesh(gl){
  const floor=[],backInner=[],backOuter=[];
  const push=(to,a,b,c)=>to.push(...a,...b,...c);
  const w=SPEC.floorWidth/2,z0=SPEC.floorFrontZ,z1=SPEC.floorBackZ;
  push(floor,[-w,0,z0],[-w,0,z1],[w,0,z1]);
  push(floor,[-w,0,z0],[w,0,z1],[w,0,z0]);
  // A pair of broad curved BACKDROPS, not one enormous closed cylinder.
  // Each faces its respective camera mode, and both are real 3D surfaces.
  const N=160;
  const addWall=(dest,face)=>{
   const point=angle=>backdropPoint(face==='inner'?'outer':'inner',angle);
   for(let i=0;i<N;i++){
    const a=-SPEC.wallArcHalfAngle+i*2*SPEC.wallArcHalfAngle/N;
    const b=-SPEC.wallArcHalfAngle+(i+1)*2*SPEC.wallArcHalfAngle/N;
    const p=point(a),q=point(b);
    push(dest,[p.x,0,p.z],[p.x,SPEC.wallHeight,p.z],[q.x,SPEC.wallHeight,q.z]);
    push(dest,[p.x,0,p.z],[q.x,SPEC.wallHeight,q.z],[q.x,0,q.z]);
   }
  };
  addWall(backInner,'inner');addWall(backOuter,'outer');
  return [floor,backInner,backOuter].map(arr=>{
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
  return {texture,painted:false,updated:-999,frames:0,source:null,uploadedSize:0};
 }
 function create({stage,view,onExit}={}){
  if(!stage||!view)throw Error('Ring arena must mount in the real game');
  const style=document.createElement('style');
  style.textContent=[
   '#view.ring-arena-active #scene{width:100cqw!important;height:100cqh!important;max-width:none!important;aspect-ratio:auto!important;border-radius:0!important;overflow:hidden}',
   '#view.ring-arena-active #scene::after{content:none!important}',
   '#view.ring-arena-active #source{visibility:hidden!important}',
   '#view.ring-arena-active > #fog,#view.ring-arena-active > #ui-edge-fog,#view.ring-arena-active > #novel-ui{display:none!important}',
   '#ring-arena-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1;touch-action:manipulation;pointer-events:auto;cursor:default}',
   '#ring-arena-canvas[hidden],#ring-arena-controls[hidden]{display:none!important}',
   // Keep existing L2D artists' exact original rigs animating while visually
   // routing their finished canvases into WebGL instead of the old DOM stage.
   '#view.ring-arena-active [data-l2d-actor]{display:block!important;position:absolute!important;left:-1500px!important;top:0!important;width:1024px!important;height:1024px!important;opacity:0!important;pointer-events:none!important;overflow:visible!important;transform:none!important;translate:none!important}',
   '#view.ring-arena-active [data-l2d-actor] [data-l2d-image]{position:absolute!important;left:0!important;top:0!important;width:1024px!important;height:1024px!important;max-width:none!important;display:block!important;object-fit:fill!important;transform:none!important;scale:1!important}',
   '#view.ring-arena-active [data-l2d-actor] [data-l2d-canvas]{transform:none!important;scale:1!important}',
   '#ring-arena-controls{position:absolute;inset:0;z-index:15;pointer-events:none;color:#d9f6e9;font:500 12px/1.4 system-ui,sans-serif}',
   '#ring-arena-controls .top{position:absolute;left:14px;top:12px;padding:6px 9px;background:rgba(1,14,18,.52);border-left:2px solid #81d8bb}',
   '#ring-arena-controls .top b{display:block;letter-spacing:.15em;font-size:11px}',
   '#ring-arena-controls .top small{font-size:10px;color:#99b5af}',
   '#ring-arena-controls .bottom{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:7px;align-items:center;justify-content:center;flex-wrap:wrap;width:94%}',
   '#ring-arena-controls button{pointer-events:auto;min-height:40px;padding:8px 12px;border:1px solid rgba(118,196,166,.4);border-radius:8px;background:rgba(2,17,23,.85);font:inherit;color:#e7fff3;cursor:pointer}',
   '#ring-arena-controls button[aria-pressed=true]{background:#185b4a;border-color:#aaf9d6}',
   '#ring-arena-controls button:disabled{opacity:.36;cursor:default}',
   '#ring-arena-controls .status{position:absolute;right:14px;top:14px;font:11px/1.5 monospace;color:#b1dccc;text-align:right}',
   '@media(max-width:690px){#ring-arena-controls .status,#ring-arena-controls .top small{display:none}#ring-arena-controls button{padding:6px 8px;min-height:36px}#ring-arena-controls .bottom{gap:5px;bottom:max(8px,env(safe-area-inset-bottom))}}'
  ].join('\n');
  document.head.append(style);
  const canvas=document.createElement('canvas');canvas.id='ring-arena-canvas';
  canvas.hidden=true;canvas.setAttribute('aria-label','真实3D战场，3/4背面主角，固定左侧平视过肩机位');stage.append(canvas);
  const hud=document.createElement('section');hud.id='ring-arena-controls';hud.hidden=true;
  hud.innerHTML=[
   '<div class="top"><b>ARC BATTLE / 3D</b><small>平视 3/4 背面 · 固定左机位</small></div>',
   '<div class="status" role="status"></div><div class="bottom">',
   '<button data-mode="outer" aria-pressed="true" type="button">我方包围敌人</button>',
   '<button data-mode="inner" aria-pressed="false" type="button">敌人包围我方</button>',
   '<button data-exit type="button">返回</button></div>',
   '<div class="director-deck"><button class="director-card" data-attack-card="slash" aria-pressed="false" type="button" aria-label="攻击牌：斧柄横扫，基础伤害12。选择后点击敌人">',
   '<span class="director-card-type">ATTACK / 01</span>',
   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
   '<path d="M10 9 29 28M8 12l5-5M7 7l5 5M28 28l8 8M36 32l-4 4M38 9 19 28M40 12l-5-5M41 7l-5 5M20 28l-8 8M12 32l4 4"/>',
   '</svg><strong>斧柄横扫</strong><span class="director-stats">12 伤害 · 1 / 1 / 1</span></button>',
   '<span class="director-prompt" data-director-prompt>攻击牌演出预览 · 点牌选目标</span></div>',
   '<div class="director-targets" data-director-targets hidden>',
   ...[1,2,3,4].map(i=>'<button class="director-target" type="button" data-director-enemy="'+i+'" aria-label="攻击'+i+'号敌人"><span class="director-num">'+i+'</span><span>敌人 '+i+'</span></button>'),
   '</div><div class="director-cinematic" data-director-cinematic data-phase="idle" data-cut="none" data-hit-portrait="no" hidden>',
   '<div class="director-stage-dark"></div><div class="director-action-lines"></div>',
   '<img class="director-action-image director-action-hero" data-action-hero src="./assets/characters/hero-axe-attack.webp" alt="" draggable="false" decoding="async">',
   '<img class="director-action-image director-action-enemy" data-action-enemy src="./assets/characters/enemy-suit-hit-no-hud.webp" alt="" draggable="false" decoding="async">',
   '<div class="director-attack-title">斧柄横扫</div>',
   '<div class="director-attack-target" data-director-victim-name>敌人 1 · 受击</div>',
   '<div class="director-hitframe"></div><div class="director-white-hit"></div>',
   '<div class="director-hit-vignette"></div><div class="director-cue" data-director-cue></div>',
   '<div class="director-impact"><svg viewBox="0 0 200 200" fill="none" aria-hidden="true">',
   '<path d="M18 159 Q80 99 178 23" stroke="#fdf7ee" stroke-width="9" stroke-linecap="round"/>',
   '<path d="M35 173 Q94 113 189 47" stroke="#ee647b" stroke-width="5" stroke-linecap="round"/>',
   '<path d="M40 55 174 146M49 25 145 172" stroke="#fff7e4" stroke-width="2" opacity=".9"/>',
   '</svg></div><strong class="director-damage" data-director-damage>-12</strong></div>'
  ].join('');
  stage.append(hud);
  const status=hud.querySelector('.status');
  const director=window.PaperchalkBattleDirector;
  if(!director)throw Error('Battle director module was not loaded');
  // QA-only fixed timeline frame: real WebGL draw and actual loaded artwork,
  // but the clock is held so slow CI screenshots cannot skip a 160ms hit.
  const directorQA=new URLSearchParams(window.location.search).get('directorQA')==='1';
  const attackCard=director.pickCard(window.Timegrid?.CARD);
  const attackButton=hud.querySelector('[data-attack-card]');
  const attackPrompt=hud.querySelector('[data-director-prompt]');
  const targets=hud.querySelector('[data-director-targets]');
  const cinematic=hud.querySelector('[data-director-cinematic]');
  const cinematicCue=hud.querySelector('[data-director-cue]');
  const cinematicDamage=hud.querySelector('[data-director-damage]');
  const victimName=hud.querySelector('[data-director-victim-name]');
  const heroActionArt=hud.querySelector('[data-action-hero]');
  const enemyHitArt=hud.querySelector('[data-action-enemy]');
  const actionAssets=[heroActionArt,enemyHitArt];
  const targetButtons=[...hud.querySelectorAll('[data-director-enemy]')];
  // Normal-eye-height three-quarter back pose is the default. The old V17
  // low-angle 3/4 sprite is retained behind heroPose=3q for comparison;
  // heroPose=original restores the untouched original animated L2D.
  const requestedPose=new URLSearchParams(window.location.search).get('heroPose');
  const previewPose=requestedPose==='original'?'original':
   requestedPose==='3q'?'3q':'level';
  const posePreviewEnabled=previewPose!=='original';
  const poseImage=new Image();
  poseImage.decoding='async';
  if(posePreviewEnabled)poseImage.src=previewPose==='level'
   ?'./assets/characters/protagonist-back-combat-eye-level-preview.webp'
   :'./assets/characters/protagonist-back-combat-3q-final.webp';
  let gl=null,world=null,portrait=null,shadow=null,floor=null,backInner=null,backOuter=null,quad=null;
  const textures=new Map();
  const actionTextures=new Map(); // separate GPU action poses at real 3D anchors
  let drawnPoses={};
  try{
   gl=canvas.getContext('webgl',{depth:true,alpha:false,antialias:true});
   if(!gl)throw Error('WebGL unavailable');
   world=program(gl,worldVertex,worldFragment,['aP'],['uVP','uTime','uSurface','uMode']);
   shadow=program(gl,shadowVertex,shadowFragment,['aUv'],['uVP','uFoot','uRadius']);
   portrait=program(gl,portraitVertex,portraitFragment,['aUv'],
     ['uVP','uFoot','uRight','uUp','uHeight','uSoleX','uSoleY','uCrownY','uWidthScale','uTexture','uHit','uDim']);
   [floor,backInner,backOuter]=worldMesh(gl);
   quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,0,1,1,0,0,1,1,1,1,0]),gl.STATIC_DRAW);
   for(const id of Object.keys(bindings))textures.set(id,prepareTexture(gl));
   actionTextures.set('hero-attack',prepareTexture(gl));
   actionTextures.set('enemy-2-hit',prepareTexture(gl));
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  }catch(err){
   canvas.dataset.error=String(err.message||err);status.textContent='WebGL failed '+String(err.message||err);
   gl=null;
  }
  let active=false,mode='outer',shotIndex=0,lens=null,elapsed=0,frames=0,paintCount=0,drawnActorIds=[];
  let lastDuet=null,presentedActors=[];
  let armed=false,attack=null,attackApplied=false,attackSample=null,qaTimeMs=null;
  let completedAttacks=0,lastTarget=null;
  const enemyHP=new Map([1,2,3,4].map(i=>['enemy-'+i,36]));
  const actorForTarget=id=>layout(mode).enemies.find(a=>a.id===id);
  const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
  let audioContext=null,previousBeat='idle';
  // Original, synthesized-only battle effects. No third-party copyrighted audio.
  function playDirectorSound(kind){
   try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    if(!audioContext)audioContext=new Ctx();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const now=audioContext.currentTime;
    const osc=audioContext.createOscillator();
    const gain=audioContext.createGain();
    osc.type=kind==='impact'?'triangle':'sawtooth';
    const duration=kind==='impact'?.13:kind==='swing'?.12:.07;
    osc.frequency.setValueAtTime(kind==='impact'?95:kind==='swing'?240:150,now);
    osc.frequency.exponentialRampToValueAtTime(kind==='impact'?42:kind==='swing'?90:75,now+duration);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(kind==='impact'?.20:.085,now+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(now);osc.stop(now+duration+.02);
    if(kind==='impact'||kind==='swing'){
     const n=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*duration),audioContext.sampleRate);
     const buffer=n.getChannelData(0);
     for(let i=0;i<buffer.length;i++)buffer[i]=(Math.random()*2-1);
     const noise=audioContext.createBufferSource();noise.buffer=n;
     const filter=audioContext.createBiquadFilter();
     filter.type=kind==='impact'?'lowpass':'highpass';
     filter.frequency.setValueAtTime(kind==='impact'?600:1250,now);
     const g=audioContext.createGain();
     g.gain.setValueAtTime(.0001,now);
     g.gain.linearRampToValueAtTime(kind==='impact'?.12:.068,now+.018);
     g.gain.exponentialRampToValueAtTime(.0001,now+duration);
     noise.connect(filter).connect(g).connect(audioContext.destination);
     noise.start(now);noise.stop(now+duration+.01);
    }
   }catch(_){/* Audio is optional; never block the director. */}
  }
  function resetCombatPreview(){
   attack=null;attackSample=null;attackApplied=false;armed=false;qaTimeMs=null;
   previousBeat='idle';lastTarget=null;completedAttacks=0;
   for(const id of enemyHP.keys())enemyHP.set(id,36);
   cinematic.hidden=true;cinematic.dataset.phase='idle';
   cinematic.dataset.cut='none';
   refreshDirectorUI();
  }
  function refreshDirectorUI(){
   hud.classList.toggle('director-playing',!!attack);
   attackButton.disabled=!!attack||[...enemyHP.values()].every(n=>n<=0);
   attackButton.setAttribute('aria-pressed',String(armed));
   attackPrompt.textContent=attack?'导演演出中 · 自动回场':armed?
    '选择敌人 1～4 · Esc 取消':'攻击牌演出预览 · 点牌选目标';
   targets.hidden=!armed||!!attack;
   for(const button of targetButtons){
    const hp=enemyHP.get('enemy-'+button.dataset.directorEnemy);
    button.disabled=hp<=0;
    button.title='敌方生命 '+hp+'/36';
   }
   for(const b of hud.querySelectorAll('[data-mode]'))b.disabled=!!attack;
   hud.querySelector('[data-exit]').disabled=!!attack;
  }
  function startAttack(targetId){
   if(!armed||attack||!actorForTarget(targetId)||enemyHP.get(targetId)<=0)return false;
   armed=false;qaTimeMs=null;
   attack=director.createAttack(targetId,performance.now(),
    {mode,reducedMotion:reducedMotion()});
   attackApplied=false;attackSample=director.sample(attack,attack.startedAt);
   previousBeat='lock';playDirectorSound('windup');
   cinematic.hidden=false;cinematic.dataset.phase='lock';cinematic.dataset.cut='none';
   cinematic.dataset.hitPortrait=director.hasEnemyHitPortrait(targetId)?'yes':'no';
   cinematicCue.textContent='目标锁定';
   victimName.textContent='敌人 '+targetId.slice(-1)+' · 受击';
   cinematicDamage.textContent='-'+attackCard.damage;
   refreshDirectorUI();
   render(0);
   return true;
  }
  function updateTargetPositions(cam,aspect){
   if(!armed)return;
   for(const button of targetButtons){
    const actor=actorForTarget('enemy-'+button.dataset.directorEnemy);
    const p=director.projectScreen(project,actor,cam,aspect);
    button.hidden=!p.valid||p.x<7||p.x>93||p.y<5||p.y>86;
    if(p.valid){button.style.left=p.x.toFixed(2)+'%';
     button.style.top=(p.y-4).toFixed(2)+'%';}
   }
  }
  function finishDirector(){
   const target=attack?.targetId||null;
   completedAttacks++;
   lastTarget=target;
   attack=null;attackSample=null;attackApplied=false;qaTimeMs=null;
   cinematic.hidden=true;cinematic.dataset.phase='idle';cinematic.dataset.cut='none';
   refreshDirectorUI();
  }
  function onDirectorKey(e){
   if(!active||e.altKey||e.ctrlKey||e.metaKey||
      e.target?.matches?.('input,textarea,select,[contenteditable=true]'))return;
   if(e.key==='Escape'&&armed){e.preventDefault();armed=false;refreshDirectorUI();return;}
   if(armed&&/^[1-4]$/.test(e.key)){e.preventDefault();startAttack('enemy-'+e.key);}
  }
  window.addEventListener('keydown',onDirectorKey);
  refreshDirectorUI();
  hud.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   e.preventDefault();e.stopPropagation();
   if(b.hasAttribute('data-attack-card')){
    if(!attack){armed=!armed;refreshDirectorUI();render(0);}
    return;
   }
   if(b.hasAttribute('data-director-enemy')){
    startAttack('enemy-'+b.dataset.directorEnemy);
    return;
   }
   if(b.hasAttribute('data-mode')){
    if(attack)return;
    const requestedMode=b.dataset.mode;
    if(requestedMode!=='outer'&&requestedMode!=='inner')return;
    mode=requestedMode;
    lens=camera(mode,0);
    resetCombatPreview();
    for(const option of hud.querySelectorAll('[data-mode]'))
     option.setAttribute('aria-pressed',String(option.dataset.mode===mode));
    render(0);
   }
   if(b.hasAttribute('data-exit')&&!attack&&typeof onExit==='function')onExit();
  });
  function sourceFor(actor){
   if(actor.id==='hero'&&posePreviewEnabled){
    if(!poseImage.complete||!poseImage.naturalWidth)return null;
    return {
     runtime:{
      img:{dataset:{characterId:'protagonist-'+previewPose+'-fixed-left',characterSide:'back'}},
      root:{dataset:{l2dEdition:'fixed-left-v17',l2dMode:'static-3q'}}
     },
     source:poseImage,w:poseImage.naturalWidth,h:poseImage.naturalHeight
    };
   }
   const runtime=window.PaperchalkL2D?.get(actor.slot);
   if(!runtime||runtime.root.hidden||runtime.img.hidden||
     runtime.root.dataset.l2dState!=='ready')return null;
   // An IndexedDB scene assignment can outlive a previous DEV session.
   // A back-view battle must NEVER render another character or the front
   // portrait as the heroine while the canonical model is being reattached.
   if(actor.id==='hero'){
    if(runtime.img.dataset.characterId!=='protagonist'||
       runtime.img.dataset.characterSide!=='back')return null;
    // "ready" on a DOM image can occur BEFORE the latest genuine
    // 2D L2D frame arrives. Do not upload the previous character's pixels.
    if(runtime.clip?.type==='decoder'&&runtime.clip.frame<0)return null;
    if(runtime.libraryPlayer&&(
      runtime.libraryPlayer.disposed||
      runtime.libraryPlayer.renderedFrames<1||
      !['protagonist','protagonist-rig-v1','protagonist-unified-v1']
       .includes(runtime.libraryPlayer.model?.characterId)))return null;
    if(!runtime.clip&&!runtime.libraryPlayer&&
       runtime.lastSource!==(runtime.img.currentSrc||runtime.img.src))return null;
   }
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
  // Derive the runtime's REAL transparent-art footprint at low resolution.
  // An entire 1024x1024 transparent canvas is never a valid collision box.
  // Sampling is throttled; original L2D canvases and textures are untouched.
  function probeOpaqueUv(texture,now){
   if(texture.nextProbe&&now<texture.nextProbe)return;
   texture.nextProbe=now+1700;
   if(!texture.probe){
    texture.probe=document.createElement('canvas');
    texture.probe.width=96;texture.probe.height=96;
    texture.probeCtx=texture.probe.getContext('2d',{willReadFrequently:true});
   }
   const ctx=texture.probeCtx,N=96;
   ctx.clearRect(0,0,N,N);
   ctx.drawImage(texture.stage,0,0,N,N);
   const data=ctx.getImageData(0,0,N,N).data;
   let x0=N,y0=N,x1=-1,y1=-1;
   let combatX0=N,combatX1=-1;
   const combatTopRows=Math.floor(N*.55);
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    if(data[(y*N+x)*4+3]<44)continue;
    x0=Math.min(x0,x);x1=Math.max(x1,x);
    y0=Math.min(y0,y);y1=Math.max(y1,y);
    // Distinguish the readable upper-body lane from the long poleaxe blade
    // crossing the LOWER foreground: full-body min/max is not a face blocker.
    if(y<combatTopRows){
     combatX0=Math.min(combatX0,x);combatX1=Math.max(combatX1,x);
    }
   }
   if(x1<0)return;
   texture.opaqueUv={
    left:clamp(x0/N-.045,0,1),right:clamp((x1+1)/N+.045,0,1),
    top:clamp(y0/N-.025,0,1),bottom:clamp((y1+1)/N+.01,0,1)
   };
   texture.opaqueCombatUv=combatX1>=0?{
    left:clamp(combatX0/N-.018,0,1),
    right:clamp((combatX1+1)/N+.018,0,1),
    top:clamp(y0/N-.012,0,1),bottom:combatTopRows/N
   }:texture.opaqueUv;
  }
  function updateTexture(a,now){
   const targetTexture=textures.get(a.id),desc=sourceFor(a);
   if(!desc){
    // Never show a stale wrong-identity WebGL texture.
    targetTexture.painted=false;
    targetTexture.opaqueUv=null;targetTexture.opaqueCombatUv=null;
    return false;
   }
   const identity=desc.runtime.img.dataset.characterId+'|'+
    desc.runtime.img.dataset.characterSide+'|'+
    (desc.runtime.root.dataset.l2dEdition||'')+'|'+
    (desc.runtime.root.dataset.l2dMode||'');
   if(targetTexture.identity!==identity){
    targetTexture.identity=identity;
    targetTexture.painted=false;targetTexture.opaqueUv=null;targetTexture.opaqueCombatUv=null;
    targetTexture.nextProbe=0;targetTexture.updated=-999;
   }
   const fixedPose=a.id==='hero'&&posePreviewEnabled;
   // Static heroine: one GPU upload only. All animated L2D remain dynamic.
   if(fixedPose&&targetTexture.painted)return true;
   const interval=a.id==='hero'?50:78;
   if(now-targetTexture.updated<interval&&targetTexture.painted)return true;
   const size=a.id==='hero'?(fixedPose?1024:768):512;
   if(!targetTexture.stage||targetTexture.stage.width!==size){
    targetTexture.stage=document.createElement('canvas');
    targetTexture.stage.width=size;targetTexture.stage.height=size;
    targetTexture.ctx=targetTexture.stage.getContext('2d',{alpha:true});
   }
   const ctx=targetTexture.ctx;
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,size,size);
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   try{
    if(fixedPose){
     const fitted=portraitFit(desc.w,desc.h,size);
     // The eye-level 3/4 source has a leftward ponytail silhouette.
     // Recenter its *transparent artwork inside the padded texture* rather
     // than moving the 3D camera away from the opponent eye line.
     const portraitInsetX=previewPose==='level'?32:0;
     ctx.drawImage(desc.source,fitted.x+portraitInsetX,fitted.y,
      fitted.width,fitted.height);
    }else ctx.drawImage(desc.source,0,0,size,size);
    gl.bindTexture(gl.TEXTURE_2D,targetTexture.texture);
    if(targetTexture.uploadedSize!==size){
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,targetTexture.stage);
     targetTexture.uploadedSize=size;
    }else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,targetTexture.stage);
    targetTexture.updated=now;
    targetTexture.painted=true;
    targetTexture.frames++;
    paintCount++;
    // The latest real ArtMesh pose defines its own visible screen silhouette.
    try{probeOpaqueUv(targetTexture,now)}catch(error){
     targetTexture.probeError=String(error.message||error);
    }
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
  function drawContactShadows(actors,vp){
   gl.useProgram(shadow.handle);
   gl.uniformMatrix4fv(shadow.uVP,false,new Float32Array(vp));
   gl.bindBuffer(gl.ARRAY_BUFFER,quad);
   gl.enableVertexAttribArray(shadow.aUv);
   gl.vertexAttribPointer(shadow.aUv,2,gl.FLOAT,false,8,0);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   gl.depthMask(false);
   for(const a of actors){
    gl.uniform3fv(shadow.uFoot,new Float32Array([a.x,0,a.z]));
    gl.uniform1f(shadow.uRadius,a.id==='hero'?.46:.35);
    gl.drawArrays(gl.TRIANGLES,0,6);
   }
   gl.depthMask(true);gl.disable(gl.BLEND);
   gl.disableVertexAttribArray(shadow.aUv);
  }
  // The image stays on the actor's ground-anchored billboard, never a DOM
  // fullscreen illustration. One GPU upload is enough per static pose.
  function uploadActionImage(id,img){
   if(!gl||!img?.complete||!img.naturalWidth)return false;
   const t=actionTextures.get(id);if(!t)return false;
   if(t.painted)return true;
   const size=768;
   if(!t.stage){
    t.stage=document.createElement('canvas');
    t.stage.width=size;t.stage.height=size;
    t.ctx=t.stage.getContext('2d',{alpha:true});
   }
   const ctx=t.ctx;ctx.clearRect(0,0,size,size);
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   const rect=portraitFit(img.naturalWidth,img.naturalHeight,size);
   ctx.drawImage(img,rect.x,rect.y,rect.width,rect.height);
   try{
    gl.bindTexture(gl.TEXTURE_2D,t.texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,t.stage);
    t.uploadedSize=size;t.painted=true;t.frames++;return true;
   }catch(error){t.error=String(error);return false}
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
    const a=item.actor;
    const requested=director.poseFor(a.id,attack,attackSample);
    const key=requested==='attack'?'hero-attack':
     requested==='hurt-art'?'enemy-2-hit':null;
    const art=key?actionTextures.get(key):null;
    const t=art?.painted?art:textures.get(a.id);
    drawnPoses[a.id]=art?.painted?requested:
     requested==='hurt-original'?'hurt-original':'idle';
    if(!t?.painted)continue;
    gl.uniform3fv(portrait.uFoot,new Float32Array([a.x,a.y,a.z]));
    gl.uniform1f(portrait.uHeight,a.height);
    gl.uniform1f(portrait.uSoleX,a.soleX);
    gl.uniform1f(portrait.uSoleY,a.soleY);
    gl.uniform1f(portrait.uCrownY,a.crownY);
    gl.uniform1f(portrait.uWidthScale,1);
    gl.uniform1f(portrait.uHit,attack&&a.id===attack.targetId&&attackSample?
     attackSample.hitFlash:0);
    const duelPerformer=!!attack&&(a.id==='hero'||a.id===attack.targetId);
    gl.uniform1f(portrait.uDim,!duelPerformer&&attackSample?
     .65*attackSample.stageStrength:0);
    gl.bindTexture(gl.TEXTURE_2D,t.texture);
    gl.drawArrays(gl.TRIANGLES,0,6);
   }
   gl.depthMask(true);gl.disable(gl.BLEND);
  }
  function render(dt=1/60){
   if(!active)return false;
   const base=camera(mode,0);
   if(attack){
    const frame=director.sample(attack,qaTimeMs===null?
     performance.now():attack.startedAt+qaTimeMs);
    // Gameplay may run at 10FPS or worse in software WebGL. A skipped
    // impact *visual* frame must NEVER skip the event/damage settlement.
    if(frame.hit&&!attackApplied){
     enemyHP.set(attack.targetId,Math.max(0,enemyHP.get(attack.targetId)-attackCard.damage));
     attackApplied=true;
     if(!frame.finished)playDirectorSound('impact');
    }
    if(frame.finished)finishDirector();
    else{
     attackSample=frame;
     if(frame.stage!==previousBeat){
      previousBeat=frame.stage;
      if(frame.stage==='swing')playDirectorSound('swing');
     }
    }
   }
   const target=attack?actorForTarget(attack.targetId):null;
   lens=target?director.cinematicCamera(base,attack,attackSample,target):base;
   elapsed+=clamp(Number(dt)||0,0,.06);frames++;
   if(!gl)return false;
   const w=canvas.clientWidth,h=canvas.clientHeight;
   if(w<2||h<2)return false;
   const pixel=renderPixelRatio(w,h,window.devicePixelRatio||1);
   const W=Math.floor(w*pixel),H=Math.floor(h*pixel);
   if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
   const cam=lens,vp=cameraVP(cam,w/h);
   gl.viewport(0,0,W,H);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.depthMask(true);
   gl.clearColor(.001,.005,.008,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.useProgram(world.handle);gl.enableVertexAttribArray(world.aP);
   gl.uniformMatrix4fv(world.uVP,false,new Float32Array(vp));
   gl.uniform1f(world.uTime,elapsed);
   gl.uniform1f(world.uMode,mode==='inner'?1:0);
   drawWorld(floor,0,vp);drawWorld(mode==='outer'?backInner:backOuter,1,vp);
   gl.disableVertexAttribArray(world.aP);
   const all=visibleActors(mode);
   const now=performance.now();
   for(const a of all)updateTexture(a,now);
   uploadActionImage('hero-attack',heroActionArt);
   uploadActionImage('enemy-2-hit',enemyHitArt);
   // V23 shared duel center: selected attacker/target move together from
   // their original queue to central opposing ground points (36.5% / 63.5%).
   // Other actors stay at original anchors, subdued rather than removed.
   const duet=attack&&attackSample&&target?
    director.duelLayout(director.duelCamera(base),project,w/h,all[0],target):null;
   lastDuet=duet;
   const presented=duet?all.map(a=>{
    const motion=director.actorMotion(a.id,attack,attackSample,all[0],target,duet);
    return {...a,x:a.x+motion.x,y:a.y+motion.y,
     z:a.z+motion.z,height:a.height*motion.scale};
   }):all;
   presentedActors=presented;
   // BOTH participants stay visible at once, sharing ONE 3D camera.
   // Render a pose swap at the same anchor rather than a fullscreen cut.
   drawnPoses={};
   drawnActorIds=presented.map(a=>a.id);
   // The same temporary lunge transforms affect cast shadows and portraits.
   drawContactShadows(presented,vp);
   drawActors(presented,cam,vp);
   if(armed)updateTargetPositions(base,w/h);
   if(attack&&attackSample){
    const victim=presented.find(a=>a.id===target.id)||target;
    const impact=project({x:victim.x,y:victim.y+victim.height*.68,z:victim.z},cam,w/h);
    if(impact.valid){
     cinematic.style.setProperty('--impact-x',((impact.x+1)*50).toFixed(2)+'%');
     cinematic.style.setProperty('--impact-y',((1-impact.y)*50).toFixed(2)+'%');
    }
    if(cinematic.dataset.phase!==attackSample.stage){
     cinematic.dataset.phase=attackSample.stage;
     cinematic.dataset.cut=attackSample.cut;
     cinematicCue.textContent=attackSample.cue||'';
    }
    cinematic.style.setProperty('--director-progress',(attackSample.elapsed/director.DURATION).toFixed(3));
    cinematic.style.setProperty('--attack-intensity',attackSample.hitFlash.toFixed(3));
   }
   if(frames%12===0){
    const ready=all.filter(a=>textures.get(a.id).painted).length;
    status.textContent=(mode==='outer'?'外圈':'内圈')+
     ' · 固定左机位 · 人物 '+ready+'/'+all.length+
     (posePreviewEnabled?' · 主角3/4 平视':' · 原版动态');
    canvas.dataset.l2dReady=String(ready);
    canvas.dataset.renderedFrames=String(frames);
   }
   return true;
  }
  function setActive(value){
   active=!!value;canvas.hidden=!active;hud.hidden=!active;
   view.classList.toggle('ring-arena-active',active);
   if(active){elapsed=0;frames=0;shotIndex=0;
    resetCombatPreview();lens=camera(mode,0);render(0)}
   else resetCombatPreview();
  }
  const inspect=()=>({active,renderer:gl?'webgl-l2d':'unavailable',
   mode,shotIndex,shotName:SHOT_NAMES[shotIndex],posePreviewEnabled,previewPose,lensShift:VERTICAL_LENS_SHIFT,
   cameraTarget:camera(mode,shotIndex),
   cameraPitchDeg:cameraPitchDeg(lens||camera(mode,shotIndex)),
   settled:!!lens&&Math.hypot(lens.eye.x-camera(mode,0).eye.x,
     lens.eye.z-camera(mode,0).eye.z)<.001,actors:layout(mode),
   cameraCount:1,eyeLevel:Math.abs((lens||camera(mode,0)).eye.y-1.50)<.001,
   heroStatic:posePreviewEnabled,heroTextureUploads:textures.get('hero').frames,
   director:{card:attackCard.name,baseDamage:attackCard.damage,
    armed,playing:!!attack,phase:attackSample?.stage||'idle',
    targetId:attack?.targetId||null,applied:attackApplied,
    completedAttacks,lastTarget,enemyHP:Object.fromEntries(enemyHP)},
   directorCameraTemporary:!!lens?.cinematic,
   duel:lastDuet?{...lastDuet,playedPositions:presentedActors.filter(a=>
    lastDuet.actorIds.includes(a.id)).map(a=>({id:a.id,x:a.x,z:a.z,height:a.height}))}:null,
   directorArt:{hero:{
     loaded:heroActionArt.complete&&heroActionArt.naturalWidth>0,
     src:heroActionArt.getAttribute('src')
    },enemy:{
     loaded:enemyHitArt.complete&&enemyHitArt.naturalWidth>0,
     src:enemyHitArt.getAttribute('src')
    },
    cut:cinematic.dataset.cut,hitPortrait:cinematic.dataset.hitPortrait,
    drawnActorIds:[...drawnActorIds],
    renderedPoses:{...drawnPoses},
    spriteTextures:Object.fromEntries([...actionTextures].map(([id,t])=>[id,{
     ready:!!t.painted,uploads:t.frames}]))},
   visibleActorIds:visibleActors(mode).map(a=>a.id),
   hiddenAlliedTeammateIds:HIDDEN_ALLY_IDS,
   camera:lens||camera(mode,shotIndex),ring:SPEC,
   projectionAspect:canvas.clientHeight?canvas.clientWidth/canvas.clientHeight:16/9,
   effectiveVerticalFov:responsiveFov((lens||camera(mode,shotIndex)).fov,
    canvas.clientHeight?canvas.clientWidth/canvas.clientHeight:16/9),
   l2dReady:visibleActors(mode).filter(a=>textures.get(a.id).painted).length,
   heroine:{
    id:window.PaperchalkL2D?.get('player')?.img?.dataset.characterId||null,
    side:window.PaperchalkL2D?.get('player')?.img?.dataset.characterSide||null,
    l2dMode:window.PaperchalkL2D?.get('player')?.root?.dataset.l2dMode||null,
    ready:textures.get('hero').painted,
    sourceUv:textures.get('hero').opaqueUv||null,
    combatUpperUv:textures.get('hero').opaqueCombatUv||null
   },
   safety:battleVisualSafety(mode,shotIndex,
    canvas.clientHeight?canvas.clientWidth/canvas.clientHeight:16/9,
    textures.get('hero').opaqueCombatUv||CANONICAL_BACK_UV),
   l2dFrames:Object.fromEntries([...textures.entries()].map(([id,t])=>[id,t.frames])),
   pixelsFrom:posePreviewEnabled?'fixed-left 3/4 heroine + animated original enemy L2D':'original animated L2D actors'});
  function qaFrame(targetId,elapsedMs){
   if(!directorQA)throw Error('Director QA mode is disabled');
   if(!actorForTarget(targetId)||!Number.isFinite(elapsedMs))throw Error('Invalid QA frame');
   attack=director.createAttack(targetId,performance.now(),{mode,reducedMotion:false});
   qaTimeMs=clamp(elapsedMs,0,director.DURATION-1);
   attackApplied=false;armed=false;previousBeat='qa';
   cinematic.hidden=false;
   cinematic.dataset.hitPortrait=director.hasEnemyHitPortrait(targetId)?'yes':'no';
   victimName.textContent='敌人 '+targetId.slice(-1)+' · 受击';
   cinematicDamage.textContent='-'+attackCard.damage;
   refreshDirectorUI();
   render(0);
   return inspect().director;
  }
  const api={setActive,render,inspect,get canvas(){return canvas}};
  if(directorQA)api.qaFrame=qaFrame;
  return Object.freeze(api);
 }
 return Object.freeze({SPEC,STAGING,bindings,layout,visibleActors,HIDDEN_ALLY_IDS,
  SHOT_NAMES,CAMERA_STOPS,cameraPitchDeg,backdropPoint,camera,portraitBounds,
  portraitVisibleBounds,battleVisualSafety,CANONICAL_BACK_UV,responsiveFov,portraitFit,renderPixelRatio,cameraVP,VERTICAL_LENS_SHIFT,lookAt,
  perspective,multiply,project,create});
});