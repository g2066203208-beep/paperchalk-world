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
  stageType:'compact-convenience-curved-aisle',wallRadius:32,wallHeight:2.85,ceilingHeight:2.85,wallBend:.7,
  wallCenterZ:-16,wallArcHalfAngle:rad(78),
  floorWidth:96,floorFrontZ:48,floorBackZ:-55,
  surfaceDepth:10.0,floorTileMeters:1.2,ceilingTileMeters:1.9,surfaceSegments:24,arcSegments:160,
  roomWidthMeters:11.5,roomLengthMeters:7.6,
  outerRoleRadius:10.55,innerRoleRadius:8.30,
  outerCameraRadius:11.5,innerCameraRadius:7.47,
  verticalFov:48,battleFocusZ:6.8
 });
 // The authored convenience-store wall image is drawn on the existing curved
 // 3D backdrops; actor anchors, depth and camera remain exactly unchanged.
 const WALL_TEXTURE=Object.freeze({
  url:'./assets/ring-arena/convenience-wall.webp',width:2172,height:724,repeats:9,heightMeters:2.85
 });
 let ACTIVE_WALL=WALL_TEXTURE;
 let ACTIVE_GEOMETRY=Object.freeze({shape:'arc'});
 const SURFACE_TEXTURES=Object.freeze({
  floor:'./assets/ring-arena/convenience-floor.svg',
  ceiling:'./assets/ring-arena/convenience-ceiling.svg'
 });
 // CPU-side real surface-length UV mapping. The 0.7-curvature walls are
 // shallower than perfect cylinders, so an angle-based repeat stretches shop
 // signs horizontally. Arc-length approximation (<0.08% error at 78 degrees)
 // is evaluated only for the 160 wall-segment vertices, not per fragment.
 function wallArcMeters(theta){
  const m=1-SPEC.wallBend*SPEC.wallBend,m2=m*m,m3=m2*m;
  return SPEC.wallRadius*(
   theta*(1-m/4-3*m2/64-5*m3/256)
   +Math.sin(2*theta)*(m/8+m2/32+15*m3/1024)
   -Math.sin(4*theta)*(m2/256+3*m3/1024)
   +Math.sin(6*theta)*m3/3072
  );
 }
 function wallTextureUV(x,y,mode='outer'){
  const theta=Math.asin(clamp(x/SPEC.wallRadius,-.975,.975));
  const tileWidth=ACTIVE_WALL.heightMeters*ACTIVE_WALL.width/ACTIVE_WALL.height;
  // When the camera looks toward +Z in inner mode, screen-right is world -X.
  // Reverse the UV run so all shop signs stay legible, never mirror text.
  const sign=mode==='inner'?-1:1;
  const u=sign*wallArcMeters(theta)/tileWidth+ACTIVE_WALL.repeats/2;
  return {u:u-Math.floor(u),v:clamp(y/ACTIVE_WALL.heightMeters,0,1)};
 }
 // ONE playable, standard encounter (not alternating 'surround' patterns).
 // Four foes remain on the FAR side at z=6.8; every ally has to occupy a
 // separate NEAR-SIDE world-space band (z>=8.2). Never mix both factions
 // into the same depth row just to show all eight full bodies.
 // All soles remain y=0; original ArtMesh dimensions stay unchanged.
 const STAGING=Object.freeze({
  outer:Object.freeze({
   allies:Object.freeze([[-1.05,9.30],[-1.65,9.05],[-.75,8.50],[-.85,8.25]]),
   enemies:Object.freeze([[-.46,6.80],[.73,6.80],[1.92,6.80],[3.38,6.80]])
  }),
  inner:Object.freeze({
   allies:Object.freeze([[1.64,8.72],[3.20,8.0],[.30,8.0],[4.50,7.70]]),
   enemies:Object.freeze([[.73,10.96],[-.15,11.35],[-.95,10.94],[-1.91,11.26]])
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
 // All four existing allied ArtMeshes now participate in the same 3D battle.
 // The squad forms a real NEAR-SIDE cluster within 0.9m of heroine x=-1.05.
 // Ally2 is 0.25m behind heroine in world depth (z9.05), keeping its
 // separate face visible without stealing the heroine's visual dominance.
 // Ally3 is the middle echelon (z8.50), ally4 is the farthest ally (z8.25)
 // and offsets 20cm right to separate the two heads. Enemy rank is z6.80;
 // 1.45m of empty floor always separates the two teams. Normal 3D occlusion
 // is intentional: never move friends into the enemy rank to reveal torsos.
 // Metro still chooses only its one named passenger via scene actors.visible.
 const HIDDEN_ALLY_IDS=Object.freeze([]);
 const VISIBLE_LAYOUTS=Object.freeze(Object.fromEntries(['outer','inner'].map(mode=>{
  const scene=layout(mode);
  return [mode,Object.freeze([...scene.allies,...scene.enemies])];
 })));
 function visibleActors(mode='outer'){return VISIBLE_LAYOUTS[mode]||VISIBLE_LAYOUTS.outer}
 // Single cinematic TPS right-shoulder rig. The authored rear ArtMesh is
 // physically grounded and remains part of the SAME 3D world as all foes.
 // The camera stays close behind her and ORBITS her world-space root;
 // it is not a fixed eye with the heroine pushed out to the left.
 const SHOT_NAMES=Object.freeze(['固定左机位']);
 const CAMERA_STOPS=Object.freeze({
  outer:Object.freeze([Object.freeze({
   id:'left',eyeX:-.28,eyeZ:10.40,eyeY:1.50,
   focusX:-.24,focusY:1.50,focusZ:5.40,fov:66
  })]),
  inner:Object.freeze([Object.freeze({
   id:'left',eyeX:.78,eyeZ:7.15,eyeY:1.50,
   focusX:.78,focusY:1.50,focusZ:13.0,fov:52
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
 // One stationary eye pivot; only camera.focus rotates. The real room,
 // animated L2D quads, world-space shadow geometry and targets project via
 // exactly ONE shared cameraVP. Never reposition individual layers.
 const LOOK_LIMITS=Object.freeze({yawLeftDeg:22,yawRightDeg:22,
  pitchUpDeg:12,pitchDownDeg:12});
 function immersiveCamera(base,cursorX=0,cursorY=0){
  const x=clamp(Number(cursorX)||0,-1,1),y=clamp(Number(cursorY)||0,-1,1);
  if(Math.abs(x)+Math.abs(y)<1e-9)return base;
  const yaw=rad((x<0?LOOK_LIMITS.yawLeftDeg:LOOK_LIMITS.yawRightDeg)*x);
  const pitch=rad((y<0?LOOK_LIMITS.pitchUpDeg:LOOK_LIMITS.pitchDownDeg)*y);
  const f=normalize({x:base.focus.x-base.eye.x,y:0,z:base.focus.z-base.eye.z});
  const right=normalize(cross(f,{x:0,y:1,z:0}));
  const distance=Math.hypot(base.focus.x-base.eye.x,base.focus.z-base.eye.z);
  const cp=Math.cos(pitch);
  return {...base,focus:{
   x:base.eye.x+distance*cp*(f.x*Math.cos(yaw)+right.x*Math.sin(yaw)),
   y:base.eye.y-distance*Math.sin(pitch),
   z:base.eye.z+distance*cp*(f.z*Math.cos(yaw)+right.z*Math.sin(yaw))
  },lookYawDeg:yaw*180/Math.PI,lookPitchDeg:pitch*180/Math.PI};
 }
 // SHOULDER RIG:
 // The heroine is fixed in WORLD POSITION and WORLD ORIENTATION for all mouse
 // inputs. Only the camera orbits her shoulder pivot: no turn-to-cursor,
 // cursor-linked sprite lean, or screen-space portrait translation.
 // Every actor, shadow and surface still shares the exact same WebGL VP.
 // On portrait phones the shoulder boom extends to show all four opponents.
 function shoulderCamera(base,hero,cursorX=0,cursorY=0,aspect=16/9){
  const x=clamp(Number(cursorX)||0,-1,1);
  const y=clamp(Number(cursorY)||0,-1,1);
  const yaw=rad((x<0?LOOK_LIMITS.yawLeftDeg:LOOK_LIMITS.yawRightDeg)*x);
  const pitch=rad((y<0?LOOK_LIMITS.pitchUpDeg:LOOK_LIMITS.pitchDownDeg)*y);
  const phone=clamp((.85-clamp(Number(aspect)||16/9,.35,3.5))/.25,0,1);
  const x0=base.eye.x+(.60-base.eye.x)*phone;
  const z0=base.eye.z+(11.20-base.eye.z)*phone;
  const fx0=base.focus.x+(.75-base.focus.x)*phone;
  const fz0=base.focus.z;
  const pivot={x:hero.x,y:hero.y+hero.height*.88,z:hero.z};
  const dx=x0-hero.x,dz=z0-hero.z,cs=Math.cos(yaw),sn=Math.sin(yaw);
  const eye={x:pivot.x+dx*cs-dz*sn,y:base.eye.y,
   z:pivot.z+dx*sn+dz*cs};
  const f=normalize({x:fx0-x0,y:0,z:fz0-z0});
  const right=normalize(cross(f,{x:0,y:1,z:0}));
  const worldF={x:f.x*cs+right.x*sn,z:f.z*cs+right.z*sn};
  const d=Math.hypot(fx0-x0,fz0-z0);
  const focus={x:eye.x+d*Math.cos(pitch)*worldF.x,
   y:eye.y-d*Math.sin(pitch),
   z:eye.z+d*Math.cos(pitch)*worldF.z};
  const yawDeg=yaw*180/Math.PI;
  return {...base,eye,focus,
   shoulderRig:true,shoulderPivot:pivot,
   shoulderBoomMeters:Math.hypot(dx,dz),
   heroYawDeg:0,lookYawDeg:yawDeg,
   lookPitchDeg:pitch*180/Math.PI,
   phoneShoulderFit:phone,actorRootUnchanged:true};
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
  // Fixed passenger scenes retain a human-scale vertical FOV on phones.
  // The battle rig still keeps its authored horizontal framing algorithm.
  const field=cam.sceneStatic&&cam.fovMode==='vertical'?
   (cam.fov||SPEC.verticalFov):responsiveFov(cam.fov||SPEC.verticalFov,aspect);
  const vp=multiply(perspective(field,aspect),lookAt(cam.eye,cam.focus));
  const lensShift=Number.isFinite(cam.lensShift)?cam.lensShift:VERTICAL_LENS_SHIFT;
   for(const i of [0,4,8,12])vp[i+1]+=lensShift*vp[i+3];
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
 // Live2D ArtMesh textures are rigid, WORLD-ORIENTED 3D portrait planes.
 // They are NOT screen overlays and do NOT swivel to chase the camera when
 // an attack temporarily changes the view. Their local yaw preserves the
 // original authored rear/side pose while providing real foreshortening.
 function actorWorldRight(actor,mode='outer'){
  const flip=mode==='inner'?-1:1;
  // All actors, including the heroine, retain one stable world orientation.
  // Moving the mouse may orbit the camera but cannot rotate the painted art.
  const yaw=actor?.id==='hero'?-0.05:0;
  return {x:flip*Math.cos(yaw),y:0,z:Math.sin(yaw)};
 }
 // Actual WebGL billboard quad bounds from the SAME 3D projection used in
 // the render shader. Used to prevent enemy clipping on authored camera stops.
 function portraitBounds(actor,cam,aspect=16/9){
  const right=actorWorldRight(actor,cam.mode);
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
 // The user-approved 1141x2048 female07 RGBA alpha bbox x=12..1117,
 // y=34..2048, square-fitted to the GPU stage; include actual weapon
 // extents in screen safety rather than the former protagonist's narrow UV.
 const FEMALE07_BACK_UV=Object.freeze({left:.222,right:.775,top:.012,bottom:1});
 function portraitVisibleBounds(actor,cam,uv=CANONICAL_BACK_UV,aspect=16/9){
  const right=actorWorldRight(actor,cam.mode);
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
 // These native atlas footprints were measured from the real game L2D
 // canvases (including the battle-only alpha mask for enemy #3). Projection
 // safety must use VISIBLE art, not discarded transparent square borders.
 const ENEMY_VISIBLE_SAFETY_UV=Object.freeze({
  'enemy-1':Object.freeze({left:.31,right:.69,top:0,bottom:1}),
  'enemy-2':Object.freeze({left:.32,right:.69,top:0,bottom:1}),
  'enemy-3':Object.freeze({left:.30,right:.76,top:0,bottom:1}),
  'enemy-4':Object.freeze({left:0,right:.58,top:0,bottom:1})
 });
 function battleVisualSafety(mode='outer',index=0,aspect=16/9,heroUv=CANONICAL_BACK_UV,overrideCamera=null){
  const c=overrideCamera||camera(mode,index),actors=layout(mode),hero=portraitVisibleBounds(actors.allies[0],c,heroUv,aspect);
  const foes=actors.enemies.map(a=>{
   const raw=portraitBounds(a,c,aspect);
   const cropped=portraitVisibleBounds(a,c,ENEMY_VISIBLE_SAFETY_UV[a.id],aspect);
   return {...raw,left:cropped.left,right:cropped.right};
  });
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
 // The very same world-space luminaires illuminating walls and sprite
 // billboards sit below the six actual emissive ceiling fixtures. 3 columns
 // across the wall arc (5.7m apart), two rows into the shop (4.75m apart).
 // This is a performance-bounded analytic lighting approximation, NOT a
 // fake fullscreen color overlay or an invented L2D normal map.
 const LIGHTING=Object.freeze({
  kind:'world-space-six-motivated-fluorescents',
  columns:Object.freeze([-3.5,0,3.5]),
  depths:Object.freeze([.90,5.20]),
  height:SPEC.ceilingHeight-.07,
  coolAmbient:Object.freeze([.23,.27,.34]),
  color:Object.freeze([2.00,1.88,1.72]),
  redColor:Object.freeze([3.1,.12,.075]),
  redCeilingIndices:Object.freeze([1,4]),
  strength:1
 });
 function angleForArcMeters(meters){
  let lo=-SPEC.wallArcHalfAngle,hi=SPEC.wallArcHalfAngle;
  for(let i=0;i<22;i++){
   const mid=(lo+hi)/2;
   if(wallArcMeters(mid)<meters)lo=mid;
   else hi=mid;
  }
  return (lo+hi)/2;
 }
 function lightRig(mode='outer'){
  const positions=[],colors=[];
  // Stable index ordering: all three lamps along first row, then second.
  for(const depth of LIGHTING.depths)for(const arc of LIGHTING.columns){
   const p=curvedSurfacePoint(mode,angleForArcMeters(arc),depth,LIGHTING.height);
   positions.push(p.x,p.y,p.z);
   // A slightly warmer leading row; farther row acts as soft neutral fill.
   const intensity=depth===LIGHTING.depths[0]?1.04:.83;
   colors.push(...LIGHTING.color.map(c=>c*intensity));
  }
  return Object.freeze({mode,positions:new Float32Array(positions),
   colors:new Float32Array(colors),count:6});
 }
 const lightRigs=Object.freeze({outer:lightRig('outer'),inner:lightRig('inner')});
 const LIGHT_STATES=Object.freeze(['on','partial','flicker','outage','horror']);
 function lightingFrame(state='on',seconds=0,whichMode='outer'){
  const valid=LIGHT_STATES.includes(state)?state:'on';
  const levels=new Float32Array(6).fill(1),redMix=new Float32Array(6);
  if(valid==='partial')levels.set([1,0,.95,.3,0,.65]);
  else if(valid==='outage'){
   // Red emitters are IN original ceiling fixtures, not a floating light.
   levels.fill(0);levels[1]=.86;levels[4]=.72;redMix[1]=redMix[4]=1;
  }else if(valid==='flicker'){
   const p=((Number(seconds)||0)%6.2+6.2)%6.2;
   levels[1]=(p>1.62&&p<1.78)||(p>1.9&&p<2.25)||(p>4.86&&p<5.24)?0:1;
   levels[4]=(p>4.83&&p<5.36)?.07:1;
  }else if(valid==='horror'){
   const t=Math.max(0,Number(seconds)||0);
   if(t>=.95&&t<1.68){
    const pulse=Math.sin(t*81)*.5+.5;
    levels[1]=pulse>.64?.98:.025;levels[4]=pulse>.72?.78:0;
   }else if(t>=1.68&&t<2.36)levels.set([1,0,.65,.15,0,.22]);
   else if(t>=2.36&&t<4.42){
    levels.fill(0);if(t>3.70&&t<3.77)levels[2]=.92;
   }else if(t>=4.42&&t<5.08){
    const surge=t<4.70?.82:.05;
    levels.set([surge,0,surge*.9,0,0,surge*.4]);
   }else if(t>=5.08&&t<5.66)levels.fill(0);
   else if(t>=5.66)levels.set([.7,0,.55,.20,0,.28]);
   if(t>=2.75&&t<5.66){
    levels[1]=.86;levels[4]=.72;redMix[1]=redMix[4]=1;
   }
  }
  const red=redMix.some(x=>x>.5),t=Number(seconds)||0;
  const ambient=valid==='outage'||red?[.023,.010,.014]:
   valid==='partial'||valid==='horror'&&t>=1.68?[.09,.12,.15]:
   [...LIGHTING.coolAmbient];
  const rig=lightRigs[whichMode]||lightRigs.outer;
  const colors=new Float32Array(rig.colors);
  for(let i=0;i<rig.count;i++)if(redMix[i]>.5){
   const intensity=i<3?1.04:.83;
   for(let c=0;c<3;c++)colors[i*3+c]=LIGHTING.redColor[c]*intensity;
  }
  return {state:valid,levels,redMix,colors,
   redFixtureIndices:LIGHTING.redCeilingIndices,ambient:new Float32Array(ambient)};
 }
 const lightingGLSL=[
  'uniform vec3 uLampPositions[6];uniform vec3 uLampColors[6];',
  'uniform float uLampLevels[6];uniform vec3 uAmbient;',
  // Lights physically located outside the glass are distinct from ceiling
  // lights. The same lamps illuminate floor vertices AND original L2D
  // raster surfaces. Zero strength leaves every battle shader unchanged.
  'uniform vec3 uPlatformPositions[4];uniform vec3 uPlatformColors[4];',
  'uniform float uPlatformExposure;uniform float uPlatformBackZ;uniform float uDoorLightOpen;'
  'uniform float uTrainPosition;uniform float uTrainSpeed;',
  'float platformWindowTransmission(vec3 p,vec3 src,int side){',
  'float windowZ=side==3?uPlatformBackZ+3.85:uPlatformBackZ;',
  'float dz=src.z-p.z;',
  'float t=(windowZ-p.z)/(abs(dz)<.001?.001:dz);',
  'if(t<=0.0||t>=1.0)return 0.0;',
  'vec3 q=mix(p,src,t);',
  'float vertical=smoothstep(.67,1.04,q.y)*(1.0-smoothstep(2.23,2.54,q.y));',
  'if(side==3)return vertical*smoothstep(-3.9,-3.5,q.x)*(1.0-smoothstep(3.4,3.86,q.x));',
  // Source image authentic window groups: left two door glasses and a
  // continuous central side-window. The intervening metal blocks light.
  'float door=smoothstep(-3.78,-3.50,q.x)*(1.0-smoothstep(-1.72,-1.47,q.x));',
  'float bench=smoothstep(-.30,-.07,q.x)*(1.0-smoothstep(3.10,3.34,q.x));',
  // Opening a metal door creates a much larger real aperture than its
  // narrow glass. Station lamps now illuminate the carriage floor AND
  // original L2D silhouette through the aperture, not a screen vignette.
  'float doorH=smoothstep(.06,.28,q.y)*(1.0-smoothstep(2.02,2.20,q.y));',
  'float doorLeft=smoothstep(-3.49,-3.31,q.x)*(1.0-smoothstep(-2.06,-1.92,q.x));',
  'float doorRight=smoothstep(1.92,2.06,q.x)*(1.0-smoothstep(3.31,3.49,q.x));',
  'float opening=uDoorLightOpen*doorH*max(doorLeft,doorRight);',
  'return max(vertical*max(door,bench),opening);',
  '}',
  'vec3 ringIrradiance(vec3 p,vec3 n){',
  'vec3 ambient=uAmbient;',
  'vec3 normal=normalize(n);',
  'for(int i=0;i<6;i++){',
  'vec3 d=uLampPositions[i]-p;',
  'float ds=max(dot(d,d),.01);',
  'float cosine=max(dot(normal,d*inversesqrt(ds)),0.0);',
  'float attenuation=1.0/(1.0+ds*.22);',
  'ambient+=uLampColors[i]*uLampLevels[i]*(cosine*1.25+.025)*attenuation;',
  '}',
  'if(uPlatformExposure>.001){',
  'for(int i=0;i<4;i++){',
  'vec3 d=uPlatformPositions[i]-p;',
  'float ds=max(dot(d,d),.01);',
  'float through=platformWindowTransmission(p,uPlatformPositions[i],i);',
  'float cosine=max(dot(normal,d*inversesqrt(ds)),0.0);',
  'float areaFalloff=1.0/(1.0+ds*.24);',
  // Floor gets direct window light; neutral diffuse fill makes a subtle
  // rim on original illustrated L2D even when its flat normal faces away.
  // Real overhead platform fixture pools move across the carriage ONLY
  // as train DISTANCE changes. There is no frame-clock-driven fake motion.
  'float spatialPool=.77+.23*cos((p.x+uTrainPosition)*.82+float(i)*1.3);',
  'ambient+=uPlatformColors[i]*uPlatformExposure*through*',
  '(cosine*1.6+.10)*areaFalloff*spatialPool;',
  '}',
  '}',
  'return ambient;',
  '}',
  'vec3 ringTone(vec3 paint,vec3 irradiance){',
  'vec3 linearPaint=pow(clamp(paint,0.0,1.0),vec3(2.2));',
  'vec3 hdr=linearPaint*irradiance;',
  'return pow(clamp(hdr/(vec3(1.0)+hdr),0.0,1.0),vec3(.45454545));',
  '}',
  'vec3 ringShade(vec3 paint,vec3 p,vec3 n){',
  'return ringTone(paint,ringIrradiance(p,n));',
  '}'
 ].join('\n');
 // Six analytic lamps are evaluated PER 3D VERTEX, never per wall/floor pixel.
 // Original 160x20 curved meshes offer fine enough geometric interpolation
 // for broad overhead fluorescent pools, including software WebGL.
 const worldVertex=[
  'precision highp float;',
  'attribute vec3 aP;attribute vec2 aUv;',
  'uniform mat4 uVP;uniform highp int uSurface;uniform float uMode;',
  'uniform vec3 uViewEye;uniform float uGeometry;uniform float uDoorOpen;'
  'varying vec3 vWorld;varying vec2 vWallUv;varying vec3 vIrradiance;',
  'varying float vFloorSpecular;',
  lightingGLSL,
  'void main(){',
  'vec3 renderP=aP;',
  'if((uSurface>=5&&uSurface<=8)||uSurface==11)renderP.x-=mod(uTrainPosition+44.0,88.0)-44.0;',
  'if(uSurface==9)renderP.x-=uDoorOpen*.752;',
  'if(uSurface==10)renderP.x+=uDoorOpen*.752;',
  'vWorld=renderP;vWallUv=aUv;',
  'float theta=asin(clamp(aP.x/32.0,-.975,.975));',
  'vec3 n=uSurface==0?vec3(0.0,1.0,0.0):',
  'uSurface==2?vec3(0.0,-1.0,0.0):',
  'uSurface==3?vec3(aP.x>0.0?-1.0:1.0,0.0,0.0):',
  'uGeometry>.5?vec3(0.0,0.0,1.0):',
  'normalize(vec3(.7*sin(theta),0.0,(uMode>.5?-1.0:1.0)*cos(theta)));',
  'vIrradiance=((uSurface>=5&&uSurface<=8)||uSurface==11)?vec3(.90,.94,.89):ringIrradiance(renderP,n);'
  'vFloorSpecular=0.0;',
  'if(uSurface==0){',
  'vec3 viewDir=normalize(uViewEye-aP);',
  'for(int i=0;i<6;i++){',
  'vec3 delta=uLampPositions[i]-aP;',
  'float ds=max(dot(delta,delta),.01);',
  'vec3 L=delta*inversesqrt(ds);',
  'vec3 halfVec=normalize(viewDir+L);',
  'float nh=max(dot(vec3(0.0,1.0,0.0),halfVec),0.0);',
  'vFloorSpecular+=pow(nh,14.0)*uLampLevels[i]/(1.0+ds*.20);',
  '}',
  '}',
  'gl_Position=uVP*vec4(renderP,1.0);}'
 ].join('\n');
 const worldColorGLSL=[
  'vec3 ringTone(vec3 paint,vec3 irradiance){',
  'vec3 linearPaint=pow(clamp(paint,0.0,1.0),vec3(2.2));',
  'vec3 hdr=linearPaint*irradiance;',
  'return pow(clamp(hdr/(vec3(1.0)+hdr),0.0,1.0),vec3(.45454545));',
  '}'
 ].join('\n');
 const worldFragment=[
  'precision highp float;varying vec3 vWorld;varying vec2 vWallUv;varying vec3 vIrradiance;varying float vFloorSpecular;uniform float uTime;uniform highp int uSurface;uniform float uMode;uniform float uGeometry;',
  'uniform sampler2D uWallTexture;uniform float uWallReady;',
  'uniform sampler2D uFloorTexture;uniform sampler2D uCeilingTexture;uniform sampler2D uWingTexture;uniform float uWingReady;',
  'uniform float uFloorReady;uniform float uCeilingReady;uniform float uWindowCutouts;',
  'uniform float uPlatformExposure;uniform float uTrainPosition;uniform float uTrainSpeed;uniform float uDoorOpen;'
  worldColorGLSL,
  'float hash(float x){return fract(sin(x*131.13)*43758.5453);}',
  'float line(float v,float n,float w){return 1.0-smoothstep(w,w+.025,abs(fract(v*n)-.5));}',
  'void main(){vec3 color;',
  // This is a physical background plane behind actual pierced windows.
  // During a normal journey, exterior light slides across the glass.
  'if(uSurface==4){',
  // STATION AND TUNNEL BOTH STAY PUT IN WORLD SPACE: only a single train
  // odometer advances. Exterior movement comes from worldX, never uTime.
  // The train metal/glass, heroine, floor, lamps and camera NEVER move.
  'float worldX=(vWallUv.x-.5)*8.5+uTrainPosition;',
  'float stopX=mod(worldX+44.0,88.0)-44.0;',
  'float stationMask=1.0-smoothstep(11.0,19.5,abs(stopX));',
  'float station=stationMask*uPlatformExposure;',
  'float sy=vWallUv.y;',
  // Tunnel: receding reinforced concrete, cable trough, occasional signal
  // housings and cool maintenance lamps. All details advect at true metres.
  'float tunnelRib=1.0-smoothstep(.012,.036,abs(fract(worldX/4.2)-.5));',
  'float seam=1.0-smoothstep(.004,.010,abs(fract(sy*9.0)-.5));',
  'float cable=smoothstep(.32,.34,sy)*(1.0-smoothstep(.365,.38,sy));',
  'float signalZone=1.0-smoothstep(.16,.24,abs(fract(worldX/13.0)-.51));',
  'float signalHeight=smoothstep(.63,.66,sy)*(1.0-smoothstep(.74,.77,sy));',
  'float lampZone=1.0-smoothstep(.075,.145,abs(fract(worldX/8.0)-.48));',
  'float lampHeight=smoothstep(.79,.815,sy)*(1.0-smoothstep(.84,.865,sy));',
  'vec3 tunnel=vec3(.029,.041,.052)+vec3(.023,.027,.028)*sy;',
  'tunnel-=vec3(.018,.016,.015)*tunnelRib;',
  'tunnel-=vec3(.010,.009,.008)*seam;',
  'tunnel+=vec3(.038,.042,.041)*cable;',
  'tunnel+=vec3(.19,.21,.16)*lampZone*lampHeight;',
  'tunnel+=vec3(.036,.105,.062)*signalZone*signalHeight;',
  // A far wall moves at reduced parallax compared with foreground pillars.
  // Its dark bay outlines read as a real station beyond the glass.
  'float farX=worldX*.58;',
  'float bayEdge=1.0-smoothstep(.013,.035,abs(fract(farX/3.8)-.5));',
  'float tileX=1.0-smoothstep(.005,.012,abs(fract(farX/1.18)-.5));',
  'float tileY=1.0-smoothstep(.007,.015,abs(fract(sy*7.0)-.5));',
  'float pillar=1.0-smoothstep(.038,.065,abs(fract(worldX/4.6)-.50));',
  'float sideShadow=smoothstep(.42,.58,abs(fract(worldX/4.6)-.5));',
  'float lightbox=smoothstep(.755,.79,sy)*(1.0-smoothstep(.855,.89,sy));',
  'float indirect=exp(-pow((sy-.80)*7.0,2.0));',
  'float signBand=smoothstep(.38,.41,sy)*(1.0-smoothstep(.48,.51,sy));',
  'float signPanel=1.0-smoothstep(.06,.10,abs(fract(worldX/18.5)-.5));',
  'float caution=smoothstep(.23,.242,sy)*(1.0-smoothstep(.25,.265,sy));',
  'float kick=1.0-smoothstep(.14,.21,sy);',
  'vec3 platform=vec3(.405,.433,.425);',
  'platform-=vec3(.035,.033,.031)*max(tileX,tileY);',
  'platform-=vec3(.043,.048,.049)*bayEdge;',
  'platform-=vec3(.035,.043,.047)*sideShadow;',
  'platform=mix(platform,vec3(.105,.170,.196),signBand*.83);',
  'platform=mix(platform,vec3(.685,.655,.444),signPanel*signBand*.66);',
  'platform+=vec3(.19,.19,.145)*indirect;',
  'platform=mix(platform,vec3(.88,.90,.81),lightbox);',
  'platform=mix(platform,vec3(.72,.61,.33),caution);',
  'platform-=vec3(.18,.18,.17)*kick;',
  'platform=mix(platform,vec3(.09,.115,.125),pillar*.88);',
  // Only parts currently next to the windows illuminate the real coach.
  // Train speed stretches highlights through window glass, never the cabin.
  'float streak=smoothstep(9.0,15.0,uTrainSpeed)*.032;',
  'vec3 outside=mix(tunnel,platform,station);',
  'outside+=vec3(.22,.235,.20)*streak*lampZone*lampHeight;',
  'gl_FragColor=vec4(outside,1.0);return;',
  '}',
  'if((uSurface>=5&&uSurface<=8)||uSurface==11){',
  'if(uPlatformExposure<.08)discard;',
  'float jointX=1.0-smoothstep(.014,.035,abs(fract(vWallUv.x*1.45)-.5));',
  'float jointY=1.0-smoothstep(.010,.025,abs(fract(vWorld.y*3.1)-.5));',
  'float beam=1.0-smoothstep(.10,.22,abs(fract(vWorld.x/3.7)-.50));',
  'vec3 stationPaint=vec3(.45,.47,.46);',
  'if(uSurface==5){',
  'stationPaint-=vec3(.043,.042,.041)*max(jointX,jointY);',
  'float band=smoothstep(1.03,1.12,vWorld.y)*(1.0-smoothstep(1.37,1.46,vWorld.y));',
  'stationPaint=mix(stationPaint,vec3(.105,.23,.255),band*.86);',
  'stationPaint-=vec3(.14,.13,.12)*(1.0-smoothstep(.20,.28,vWorld.y));',
  'stationPaint+=vec3(.11,.095,.075)*exp(-pow((vWorld.y-2.55)*1.4,2.0));',
  '}else if(uSurface==6){',
  'float tile=1.0-smoothstep(.018,.034,abs(fract(vWorld.x*.9)-.5));',
  'float course=1.0-smoothstep(.014,.030,abs(fract(vWorld.z*.9)-.5));',
  'stationPaint=vec3(.36,.39,.385)-vec3(.04)*max(tile,course);',
  'float edge=smoothstep(7.30,7.34,vWorld.z)*(1.0-smoothstep(7.54,7.58,vWorld.z));',
  'stationPaint=mix(stationPaint,vec3(.80,.68,.35),edge*.88);',
  '}else if(uSurface==7){',
  'stationPaint=vec3(.39,.42,.425)-vec3(.075)*beam;',
  '}else if(uSurface==8){',
  'stationPaint=vec3(.22,.26,.275);',
  'stationPaint+=vec3(.075)*abs(sin(vWorld.x*9.0+vWorld.z*6.0));',
  '}else{stationPaint=vec3(1.08,1.05,.81);}',
  'float tube=exp(-pow((vWorld.y-2.78)*2.0,2.0));',
  'stationPaint+=vec3(.13,.12,.09)*tube*uPlatformExposure;',
  'if(uSurface==11)stationPaint=vec3(.96,.98,.82)*(.72+.28*uPlatformExposure);',
  'gl_FragColor=vec4(stationPaint*uPlatformExposure,1.0);return;',
  '}',
  'if(uSurface==0){',
  'float r=length(vWorld.xz);float a=atan(vWorld.x,vWorld.z)/6.2831853+.5;',
  'float radial=line(r/32.0,40.0,.016);float spokes=line(a,78.0,.013);',
  'float allies=1.0-smoothstep(.016,.065,abs(r-mix(10.55,8.3,uMode)));',
  'float enemies=1.0-smoothstep(.016,.065,abs(r-mix(6.65,12.9,uMode)));',
  'color=vec3(.18,.20,.22);',
  // The strip carriage floor is ONE unbroken vinyl sheet (no fract seams).
  'if(uFloorReady>.5)color=texture2D(uFloorTexture,',
  'uGeometry>.5&&uGeometry<1.5?clamp(vWallUv,vec2(.001),vec2(.999)):fract(vWallUv)).rgb*.89;',
  'color+=vec3(.007,.018,.018)*(radial*.3+spokes*.08)*(1.0-step(.5,uGeometry));',
  'color+=vec3(.002,.019,.018)*(allies+enemies)*.10*(1.0-step(.5,uGeometry));',
  '}else if(uSurface==2){',
  'color=vec3(.46,.48,.51);',
  'if(uCeilingReady>.5)color=texture2D(uCeilingTexture,fract(vWallUv)).rgb*.83;',
  '}else{',
  'float col=floor(vWorld.x*3.0);float v=vWorld.y*8.0+uTime*(.35+hash(col)*1.1);',
  'float cellX=fract(vWorld.x*3.0);float cellY=fract(v);',
  'float glyph=step(.18,cellX)*step(cellX,.80)*step(.16,cellY)*step(cellY,.83);',
  'float bit=step(.55,hash(col*11.1+floor(v)*3.4));',
  'float bright=pow(max(0.0,sin(v*1.4+hash(col)*6.28)),13.0);',
  'color=vec3(.003,.011,.014)+vec3(.006,.045,.038)*line(vWorld.x,3.0,.016)',
  '+glyph*bit*(vec3(.009,.13,.085)+vec3(.04,.37,.22)*bright);',
  'if(uSurface==1&&uGeometry>.5&&uGeometry<1.5&&uDoorOpen>.002){',
  'float u=vWallUv.x;',
  'bool leftDoor=u>.0975&&u<.2735;',
  'bool rightDoor=u>.7265&&u<.9055;',
  'if((leftDoor||rightDoor)&&vWallUv.y<.735)discard;',
  '}',
  'if(uWallReady>.5){',
  // The Anima train wall has a transparent 8-10% LOWER export margin.
  // Sample from the first actual painted row at physical floor height:
  // otherwise an opaque flat grey trench floats between seats and floor.
  'float wallV=((uSurface==1||uSurface==9||uSurface==10)&&uGeometry>.5&&uGeometry<1.5)?',
  '(.10+.90*vWallUv.y):vWallUv.y;',
  'vec4 wallSample=texture2D(uWallTexture,vec2(clamp(fract(vWallUv.x),.002,.998),clamp(wallV,.003,.997)));',
  'if((uSurface==1||uSurface==9||uSurface==10)&&uWindowCutouts>.5&&wallSample.a<.70){'
  // Empty source-image margin is not an exterior WINDOW. It belongs to
  // the lower wall trim and must not show a bright tunnel through the floor.
  'if(vWallUv.y>.10||uSurface==9||uSurface==10)discard;'
  'wallSample.rgb=vec3(.20,.22,.23);',
  '}',
  'vec3 wallArt=wallSample.rgb;',
  'float footAO=mix(.75,1.0,smoothstep(.04,.82,vWorld.y));',
  'color=wallArt*vec3(.81,.83,.88)*footAO;',
  // Real wall-foot trim masks the alpha edge without a floating dark strip.
  // A continuous real painted lower-wall apron replaces source alpha holes.
  // The one-piece vinyl floor meets this skirting at world y=0 (no black moat).
  'if(uSurface==1&&uGeometry>.5&&uGeometry<1.5)',
  'color=mix(vec3(.37,.42,.43),color,smoothstep(.008,.07,vWorld.y));',
  'if(uSurface==3&&uWingReady>.5){',
  'color=texture2D(uWingTexture,vec2(clamp(vWallUv.x,.001,.999),clamp(vWallUv.y,.001,.999))).rgb*.89;',
  '}',
   // Source art 2172x724 is 3:1. Eight real arc-length repeats across
   // the 76.7m curved surface = 9.58m x 3.2m (aspect preserved).
  '}',
  '}',
  'color=ringTone(color,vIrradiance);',
  'if(uSurface==0){',
  'float patches=.7+.3*sin(vWallUv.x*17.1+sin(vWallUv.y*11.7));',
  'color+=vec3(.47,.47,.42)*min(.21,vFloorSpecular*1.35)*patches;',
  '}',
  'gl_FragColor=vec4(color,1.0);}'
 ].join('\n');
 // Alpha-blended original L2D canvas pixels on CAMERA-FACING 3D planes.
 // Vertical pivot uses the source canvas's measured shoe & crown fractions.
 // No regenerated textures or destructive crop operations.
 const portraitVertex=[
  'precision highp float;attribute vec2 aUv;',
  'uniform mat4 uVP;uniform vec3 uFoot;uniform vec3 uRight;',
  'uniform vec3 uUp;uniform float uHeight;uniform float uSoleX;',
  'uniform float uSoleY;uniform float uCrownY;uniform float uWidthScale;',
  'uniform vec4 uClipUv;uniform float uLean;varying vec2 vUv;varying vec3 vWorld;',
  'void main(){vec2 uv=mix(uClipUv.xy,uClipUv.zw,aUv);',
  'float H=uHeight/max(.01,uSoleY-uCrownY);',
  'float bodyHeight=clamp((uSoleY-uv.y)/max(.01,uSoleY-uCrownY),0.0,1.0);',
  'vec3 pos=uFoot+uRight*((uv.x-uSoleX)*H*uWidthScale+uLean*H*bodyHeight)',
  '+uUp*((uSoleY-uv.y)*H);',
  'vUv=uv;vWorld=pos;gl_Position=uVP*vec4(pos,1.0);}'
 ].join('\n');
 // Portrait quad vertices now span only the live alpha content rectangle.
 const portraitFragment=[
  'precision highp float;varying vec2 vUv;varying vec3 vWorld;',
  'uniform sampler2D uTexture;uniform vec4 uClipUv;',
  'uniform float uHit;uniform float uDim;uniform float uBlur;',
  'uniform vec3 uFacing;uniform vec3 uRightDir;',
  lightingGLSL,
  'void main(){vec2 uv=vec2(vUv.x,1.0-vUv.y);',
  'vec4 t=texture2D(uTexture,uv);',
  'if(uBlur>0.01){',
  'vec2 d=vec2(.0028,.0028);',
  'vec4 soft=(texture2D(uTexture,uv+vec2(d.x,0.0))+',
  'texture2D(uTexture,uv-vec2(d.x,0.0))+',
  'texture2D(uTexture,uv+vec2(0.0,d.y))+',
  'texture2D(uTexture,uv-vec2(0.0,d.y)))*.25;',
  't=mix(t,soft,clamp(uBlur,0.0,1.0)*.78);',
  '}',
  'float edgeDist=min(min(vUv.x-uClipUv.x,uClipUv.z-vUv.x),',
  'min(vUv.y-uClipUv.y,uClipUv.w-vUv.y));',
  't.a*=smoothstep(0.0,.012,edgeDist)*smoothstep(.055,.23,t.a);',
  'if(t.a<.025)discard;',
  'vec3 rgb=mix(t.rgb,vec3(1.0,.81,.70),clamp(uHit,0.0,1.0));',
  'vec3 pseudoNormal=normalize(uFacing+vec3(0.0,.62,0.0)',
  '+uRightDir*(vUv.x-.5)*.17);',
  'rgb=ringShade(rgb,vWorld,pseudoNormal);',
  // Preserve painted linework; rim only traces the true alpha silhouette,
  // not a white outline drawn across interior facial/body details.
  'float nearbyAlpha=texture2D(uTexture,uv+vec2(.004,0.0)).a;',
  'float edge=clamp((t.a-nearbyAlpha)*1.6,0.0,1.0);',
  'rgb+=vec3(.045,.055,.067)*edge;',
  'rgb*=1.0-clamp(uDim,0.0,.80);',
  'gl_FragColor=vec4(rgb,t.a);}'
 ].join('\n');
 // A physical luminaire is independent 3D geometry, not a periodically
 // repeating bright pixel painted into the ceiling texture. It remains
 // dark when its light level is zero and emits only while powered.
 const fixtureVertex=[
  'precision highp float;attribute vec2 aUv;',
  'uniform mat4 uVP;uniform vec3 uCenter;uniform vec2 uSize;',
  'varying vec2 vUv;',
  'void main(){vUv=aUv;',
  'vec3 pos=uCenter+vec3((aUv.x-.5)*uSize.x,-.018,(aUv.y-.5)*uSize.y);',
  'gl_Position=uVP*vec4(pos,1.0);}'
 ].join('\n');
 const fixtureFragment=[
  'precision mediump float;varying vec2 vUv;',
  'uniform float uLevel;uniform float uRedMix;uniform float uGlow;',
  'void main(){',
  'if(uGlow>.5){',
  'vec2 p=(vUv-vec2(.5))*vec2(2.4,1.7);',
  'float halo=exp(-dot(p,p)*5.8);',
  'vec3 warm=mix(vec3(.90,.84,.70),vec3(.98,.08,.045),uRedMix);',
  'gl_FragColor=vec4(warm,halo*clamp(uLevel,0.0,1.0)*.22);',
  'return;',
  '}',
  'float edge=max(abs(vUv.x-.5)*2.0,abs(vUv.y-.5)*2.0);',
  'float core=1.0-smoothstep(.68,.85,edge);',
  'vec3 dark=vec3(.10,.12,.14);',
  'vec3 lit=mix(vec3(.88,.91,.89),vec3(1.0,.95,.83),core);',
  'vec3 color=mix(dark,lit,clamp(uLevel,0.0,1.0));',
  'color=mix(color,mix(vec3(.13,.035,.038),vec3(1.0,.055,.030),clamp(uLevel,0.0,1.0)),uRedMix);',
  'gl_FragColor=vec4(color,1.0);}'
 ].join('\n');
 // Project each ORIGINAL L2D alpha silhouette from a real ceiling lamp
 // onto the y=0 3D floor. No sprite replacement, fake circle-only shadow,
 // or screen-space sticker. The 12x18 UV grid preserves planar projection.
 const projectedShadowVertex=[
  'precision highp float;attribute vec2 aUv;uniform mat4 uVP;',
  'uniform vec3 uFoot;uniform vec3 uRight;uniform vec3 uLamp;',
  'uniform float uHeight;uniform float uSoleX;uniform float uSoleY;',
  'uniform float uCrownY;uniform highp float uContact;uniform vec4 uClipUv;varying vec2 vUv;',
  'void main(){vec2 uv=mix(uClipUv.xy,uClipUv.zw,aUv);',
  'float h=uHeight/max(.01,uSoleY-uCrownY);',
  'vec3 person=uFoot+uRight*(uv.x-uSoleX)*h',
  '+vec3(0.0,(uSoleY-uv.y)*h,0.0);',
  'float factor=uLamp.y/max(.15,uLamp.y-person.y);',
  'vec3 p=uLamp+(person-uLamp)*factor;',
  'p.xz=mix(p.xz,uFoot.xz,uContact*.82);',
  'p.y=.022+uContact*.003;vUv=uv;gl_Position=uVP*vec4(p,1.0);}'
 ].join('\n');
 // Distance-dependent area-light penumbra from the actual animated L2D
 // alpha occluder. The shoe contact stays tight; projected head/hair edges
 // spread wider. No painted ground ellipse or binary cutout.
 const projectedShadowFragment=[
  'precision mediump float;varying vec2 vUv;',
  'uniform sampler2D uTexture;uniform float uStrength;uniform highp float uContact;',
  'void main(){',
  'vec2 uv=vec2(vUv.x,1.0-vUv.y);',
  'float sole=smoothstep(.50,.96,vUv.y);',
  'float radius=mix(mix(.047,.0030,sole),.0025,uContact);',
  'vec2 d=vec2(radius,radius);',
  'float a=texture2D(uTexture,uv).a*.16;',
  'a+=texture2D(uTexture,uv+vec2(d.x,0.0)).a*.11;',
  'a+=texture2D(uTexture,uv-vec2(d.x,0.0)).a*.11;',
  'a+=texture2D(uTexture,uv+vec2(0.0,d.y)).a*.11;',
  'a+=texture2D(uTexture,uv-vec2(0.0,d.y)).a*.11;',
  'a+=texture2D(uTexture,uv+vec2(d.x*.72,d.y*.72)).a*.075;',
  'a+=texture2D(uTexture,uv+vec2(-d.x*.72,d.y*.72)).a*.075;',
  'a+=texture2D(uTexture,uv+vec2(d.x*.72,-d.y*.72)).a*.075;',
  'a+=texture2D(uTexture,uv+vec2(-d.x*.72,-d.y*.72)).a*.075;',
  'a+=texture2D(uTexture,uv+vec2(d.x*1.85,0.0)).a*.025;',
  'a+=texture2D(uTexture,uv-vec2(d.x*1.85,0.0)).a*.025;',
  'a+=texture2D(uTexture,uv+vec2(0.0,d.y*1.85)).a*.025;',
  'a+=texture2D(uTexture,uv-vec2(0.0,d.y*1.85)).a*.025;',
  'float shadow=smoothstep(.07,.94,clamp(a,0.0,1.0));',
  'float shoes=smoothstep(.81,.98,vUv.y);',
  'shadow*=mix(1.0,shoes,uContact);',
  'float softFade=mix(.90,1.0,sole);',
  'gl_FragColor=vec4(.008,.012,.018,shadow*uStrength*softFade);}',
 ].join('\n');
 function projectedShadowMesh(gl){
  const data=[],N=28,M=36;
  const v=(x,y)=>[x/N,y/M];
  for(let y=0;y<M;y++)for(let x=0;x<N;x++){
   const a=v(x,y),b=v(x+1,y),c=v(x+1,y+1),d=v(x,y+1);
   data.push(...a,...b,...c,...a,...c,...d);
  }
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
  return {buffer,count:data.length/2};
 }
 // Contact and cast shadows now BOTH use the original L2D texture alpha;
 // fake circular/elliptical ground shadows are never drawn.
 // Physically reversed wall bend when viewed from the opposite side.
 function backdropPoint(mode='outer',angle=0){
  const a=clamp(angle,-SPEC.wallArcHalfAngle,SPEC.wallArcHalfAngle);
  const bow=SPEC.wallRadius*(1-Math.cos(a));
  return mode==='inner'
   // Reverse-facing mode had its center wall at z=26, nearly 19m beyond
   // the camera. The 4.15m authored wall then ended far below screen top,
   // leaving a huge empty overhead band. Match the outer view's ~8m
   // camera-to-wall distance without touching actor anchors or optics.
   // Mirror the outer arc's depth curvature, maintaining equal perspective
   // scale across the wall in both camera directions.
   ? {x:SPEC.wallRadius*Math.sin(a),z:13.40+bow*SPEC.wallBend}
   : {x:SPEC.wallRadius*Math.sin(a),z:5.30-bow*SPEC.wallBend};
 }
 // The ceiling and floor begin as rectangular 1024x1024 source images.
 // Their far edges follow the curved wall exactly at all 160 wall joints.
 function curvedSurfacePoint(mode,angle,depth,height){
  const p=backdropPoint(mode,angle);
  return {x:p.x,y:height,z:p.z+(mode==='inner'?-1:1)*depth};
 }
 function curvedSurfaceUV(mode,angle,depth,kind='floor'){
  const sign=mode==='inner'?-1:1;
  const tile=kind==='ceiling'?SPEC.ceilingTileMeters:SPEC.floorTileMeters;
  // Each original rectangle is painted as a 2x2 module sheet: physically
  // 0.6m floor tiles and 0.95m ceiling tiles, not 2m oversized blocks.
  return {u:sign*wallArcMeters(angle)/tile+9,v:depth/tile};
 }
 function worldMesh(gl){
  if(ACTIVE_GEOMETRY.shape!=='arc'){
   const room=window.PaperWorldSceneGeometry?.build?.(ACTIVE_GEOMETRY);
   if(!room)throw Error('Unavailable room template '+ACTIVE_GEOMETRY.shape);
   const names=['floorOuter','floorInner','backInner','backOuter',
    'ceilingOuter','ceilingInner','wingOuter','wingInner','exterior'];
   return names.map(name=>{
    const data=new Float32Array(room.meshes[name]);
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    return {buffer,count:data.length/5};
   });
  }
  const floorOuter=[],floorInner=[],backInner=[],backOuter=[],ceilingOuter=[],ceilingInner=[],wingOuter=[],wingInner=[];
  const push=(to,a,b,c)=>{for(const v of [a,b,c])to.push(...v,...(v.length===3?[0,0]:[]));};
  const N=SPEC.arcSegments,D=SPEC.surfaceSegments;
  const theta=i=>-SPEC.wallArcHalfAngle+i*2*SPEC.wallArcHalfAngle/N;
  const addSheet=(dest,mode,height)=>{
   const vertex=(i,j)=>{
    const angle=theta(i),depth=SPEC.surfaceDepth*j/D;
    const p=curvedSurfacePoint(mode,angle,depth,height),uv=curvedSurfaceUV(mode,angle,depth,height?'ceiling':'floor');
    return [p.x,p.y,p.z,uv.u,uv.v];
   };
   for(let i=0;i<N;i++)for(let j=0;j<D;j++){
    const a=vertex(i,j),b=vertex(i+1,j),c=vertex(i+1,j+1),d=vertex(i,j+1);
    push(dest,a,b,c);push(dest,a,c,d);
   }
  };
  addSheet(floorOuter,'outer',0);addSheet(floorInner,'inner',0);
  addSheet(ceilingOuter,'outer',SPEC.ceilingHeight);
  addSheet(ceilingInner,'inner',SPEC.ceilingHeight);
  const addWall=(dest,face)=>{
   const point=angle=>backdropPoint(face==='inner'?'outer':'inner',angle);
   const uv=(p,angle,y)=>{
    const tex=wallTextureUV(p.x,y,face==='outer'?'inner':'outer');
    const tileWidth=ACTIVE_WALL.heightMeters*ACTIVE_WALL.width/ACTIVE_WALL.height;
    const signed=face==='outer'?-1:1;
    return [p.x,y,p.z,signed*wallArcMeters(angle)/tileWidth+
     ACTIVE_WALL.repeats/2,tex.v];
   };
   for(let i=0;i<N;i++){
    const a=theta(i),b=theta(i+1),p=point(a),q=point(b);
    push(dest,uv(p,a,0),uv(p,a,SPEC.wallHeight),uv(q,b,SPEC.wallHeight));
    push(dest,uv(p,a,0),uv(q,b,SPEC.wallHeight),uv(q,b,0));
   }
  };
  addWall(backInner,'inner');addWall(backOuter,'outer');
  // Fill the actual left/right end walls of the curved 3D shop, closed from
  // the backdrop all the way to the same physical floor/ceiling front edge.
  // A ±24° pan used to expose empty black space where the arc mesh stopped.
  const addWing=(dest,whichMode,side)=>{
   const angle=side*SPEC.wallArcHalfAngle;
   const texW=ACTIVE_WALL.heightMeters*ACTIVE_WALL.width/ACTIVE_WALL.height;
   const sign=whichMode==='outer'?1:-1;
   const baseU=sign*wallArcMeters(angle)/texW+ACTIVE_WALL.repeats/2;
   const vertex=(depth,y)=>{
    const p=curvedSurfacePoint(whichMode,angle,depth,y);
    return [p.x,p.y,p.z,baseU+sign*side*depth/texW,y/SPEC.wallHeight];
   };
   // The shoulder rig can see beyond the old 10m end walls at ±22°.
   // Extend only the real vertical boundary meshes (not fake screen masks),
   // keeping the floor/ceiling and source art at their original scale.
   const capDepth=16.5;
   for(let j=0;j<D;j++){
    const z0=capDepth*j/D,z1=capDepth*(j+1)/D;
    const a=vertex(z0,0),b=vertex(z0,SPEC.wallHeight);
    const c=vertex(z1,SPEC.wallHeight),d=vertex(z1,0);
    push(dest,a,b,c);push(dest,a,c,d);
   }
  };
  for(const side of [-1,1]){addWing(wingOuter,'outer',side);addWing(wingInner,'inner',side);}
  return [floorOuter,floorInner,backInner,backOuter,ceilingOuter,ceilingInner,wingOuter,wingInner].map(arr=>{
   const buffer=gl.createBuffer(),data=new Float32Array(arr);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
   return {buffer,count:data.length/5};
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

  // Use the VIEW-DIRECTION dot product, never radial 3D distance.
  // In our eye-level composition all four opponents have identical depth
  // and must retain their authored source stacking order.
  function sortActorsForAlpha(actors,cam){
   const facing=normalize({x:cam.focus.x-cam.eye.x,
    y:cam.focus.y-cam.eye.y,z:cam.focus.z-cam.eye.z});
   return actors.map((a,i)=>({actor:a,index:i,
    depth:(a.x-cam.eye.x)*facing.x+(a.y-cam.eye.y)*facing.y+
     (a.z-cam.eye.z)*facing.z}))
    .sort((a,b)=>(b.depth-a.depth)||(a.index-b.index));
  }
 function create({stage,view,onExit}={}){
  if(!stage||!view)throw Error('Ring arena must mount in the real game');
  const style=document.createElement('style');
  style.textContent=[
   '#view.ring-arena-active #scene{width:100cqw!important;height:100cqh!important;max-width:none!important;aspect-ratio:auto!important;border-radius:0!important;overflow:hidden}',
   '#view.ring-arena-active #scene::after{content:none!important}',
   '#view.ring-arena-active #source{visibility:hidden!important}',
   '#view.ring-arena-active > #fog,#view.ring-arena-active > #ui-edge-fog,#view.ring-arena-active > #novel-ui{display:none!important}',
   '#view.ring-arena-transit > #novel-ui{display:block!important;visibility:visible!important}',
   '#view.ring-arena-transit #pw-metro-cabin{background:transparent!important}',
   '#view.ring-arena-transit #pw-metro-cabin>.pw-cabin-canvas{display:none!important}',
   '#view.ring-arena-transit #pw-metro-cabin>.pw-cabin-foreground{display:none!important}',
   '#view.ring-arena-transit #pw-metro-cabin>.pw-cabin-live-actors{display:none!important}',
   // The WebGL canvas MUST physically live in the same stacking context as
   // the transit interface. Otherwise other higher-level overlays can cover
   // the whole textured 3D room while leaving passengers and controls visible.
   '#view.ring-arena-transit #pw-metro-cabin>#ring-arena-canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;z-index:1!important;pointer-events:none!important}',
   '#view.ring-arena-transit #pw-metro-cabin>.pw-cabin-top,#view.ring-arena-transit #pw-metro-cabin>.pw-cabin-station,#view.ring-arena-transit #pw-metro-cabin>.pw-cabin-speech,#view.ring-arena-transit #pw-metro-cabin>.pw-cabin-actions,#view.ring-arena-transit #pw-metro-cabin>.pw-cabin-anomaly{z-index:5!important}',
   '#view.ring-arena-transit #novel-ui>:not(#pw-metro-cabin){visibility:hidden!important;pointer-events:none!important}',
   '#view.ring-arena-transit #pw-metro-cabin .pw-cabin-l2d-seat[hidden]{display:none!important}',
   '#view.ring-arena-transit #pw-metro-cabin .pw-cabin-l2d-seat{position:absolute!important;left:var(--metro-seat-x)!important;top:31%!important;width:15%!important;height:54%!important;opacity:1!important;transform:translateX(-50%)!important;overflow:hidden!important;pointer-events:none!important}',
   '#view.ring-arena-transit #pw-metro-cabin .pw-cabin-l2d-seat [data-l2d-image]{position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;object-fit:contain!important;opacity:1!important}',
   '#view.ring-arena-transit #pw-metro-cabin .pw-cabin-l2d-seat [data-l2d-canvas]{position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important}',
   '#ring-arena-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1;touch-action:manipulation;pointer-events:auto;cursor:default}',
   '#ring-arena-canvas[hidden],#ring-arena-controls[hidden]{display:none!important}',
   // Keep existing L2D artists' exact original rigs animating while visually
   // routing their finished canvases into WebGL instead of the old DOM stage.
   '#view.ring-arena-active [data-l2d-actor]{display:block!important;position:absolute!important;left:-1500px!important;top:0!important;width:1024px!important;height:1024px!important;opacity:0!important;pointer-events:none!important;overflow:visible!important;transform:none!important;translate:none!important}',
   '#view.ring-arena-active [data-l2d-actor] [data-l2d-image]{position:absolute!important;left:0!important;top:0!important;width:1024px!important;height:1024px!important;max-width:none!important;display:block!important;object-fit:fill!important;transform:none!important;scale:1!important}',
   '#view.ring-arena-active [data-l2d-actor] [data-l2d-canvas]{transform:none!important;scale:1!important}',
   '#ring-arena-controls{position:absolute;inset:0;z-index:15;pointer-events:none;color:#d9f6e9;font:500 12px/1.4 system-ui,sans-serif}',
   '#ring-arena-controls .status{display:none!important}',
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
  canvas.hidden=true;canvas.setAttribute('aria-label','真实3D越肩战斗场景，摄像机围绕主角肩后转动，主角身体跟随鼠标');stage.append(canvas);
  const hud=document.createElement('section');hud.id='ring-arena-controls';hud.hidden=true;
  hud.innerHTML=[
   '<div class="status" role="status" hidden></div><div class="bottom">',
   '<button data-lighting type="button" title="正常 / 部分熄灭 / 故障闪烁 / 停电 / 恐怖演出，按 L 可切换">灯光：正常</button>',
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
  // User-approved FEMALE 07 rear battle cutout is the DEFAULT leading
  // silhouette of the fixed-left, New-Moon-style shoulder-close camera.
  // Old protagonist L2D is preserved behind heroPose=original, and legacy
  // 3q/level camera studies stay available but never replace the new lead.
  // If an IndexedDB model is slow, missing, or temporarily reassigning,
  // always show the REAL protagonist's original back-facing asset instead
  // of leaving a disturbing empty subway. This is a temporary SOURCE fallback
  // on the very same 3D actor, never a CSS billboard or invented character.
  const metroCanonicalBack=new Image();
  metroCanonicalBack.decoding='async';
  metroCanonicalBack.src='./assets/characters/protagonist-back.webp';
  const metroCanonicalSource=()=>metroCanonicalBack.complete&&metroCanonicalBack.naturalWidth>0?{
   runtime:{
    img:{dataset:{characterId:'protagonist',characterSide:'back'}},
    root:{dataset:{l2dEdition:'metro-canonical-original-back',
     l2dMode:'original-source-fallback-waiting-for-live-l2d'}}
   },
   source:metroCanonicalBack,w:metroCanonicalBack.naturalWidth,
   h:metroCanonicalBack.naturalHeight
  }:null;
  // "L2D ready" previously only meant texImage2D did not throw. Transparent
  // 1024x1024 canvases were therefore counted as actual passengers. Probe
  // source ALPHA, not metadata, before replacing the guaranteed canonical
  // rear illustration with an animated L2D frame. Mobile/IndexedDB rigs may
  // be ready-but-blank while their first part sprites are still resolving.
  const metroAlphaProbe=document.createElement('canvas');
  metroAlphaProbe.width=48;metroAlphaProbe.height=48;
  const metroAlphaCtx=metroAlphaProbe.getContext('2d',{willReadFrequently:true});
  let metroAlphaStamp=0,metroAlphaSource=null,metroAlphaVisible=false;
  function metroLivePortraitHasPixels(source){
   const now=performance.now();
   if(source===metroAlphaSource&&now-metroAlphaStamp<180)return metroAlphaVisible;
   metroAlphaSource=source;metroAlphaStamp=now;
   if(!metroAlphaCtx)return false;
   try{
    metroAlphaCtx.clearRect(0,0,48,48);
    metroAlphaCtx.drawImage(source,0,0,48,48);
    const alpha=metroAlphaCtx.getImageData(0,0,48,48).data;
    let filled=0;
    for(let i=3;i<alpha.length;i+=4){
     if(alpha[i]>48&&++filled>=14)break;
    }
    metroAlphaVisible=filled>=14;
    return metroAlphaVisible;
   }catch(error){
    metroAlphaVisible=false;
    return false;
   }
  }
  const requestedPose=new URLSearchParams(window.location.search).get('heroPose');
  const previewPose=['original','3q','level'].includes(requestedPose)
   ?requestedPose:'female7';
  const posePreviewEnabled=previewPose!=='original';
  const poseImage=new Image();
  poseImage.decoding='async';
  if(posePreviewEnabled)poseImage.src=previewPose==='female7'
   ?'./assets/characters/female-07/back.webp'
   :previewPose==='level'
    ?'./assets/characters/protagonist-back-combat-eye-level-preview.webp'
    :'./assets/characters/protagonist-back-combat-3q-final.webp';
  let gl=null,world=null,portrait=null,fixture=null,projectedShadow=null,shadowGrid=null,backInner=null,backOuter=null,wingOuter=null,wingInner=null,quad=null;
   let floorOuter=null,floorInner=null,ceilingOuter=null,ceilingInner=null,exteriorMesh=null;
  let platformMeshes=Object.create(null);
  function makePlatformMeshes(){
   const parts=window.PaperWorldMetroPlatform3D?.build?.();
   if(!parts)return;
   for(const [name,vertices] of Object.entries(parts)){
    const data=new Float32Array(vertices),buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    platformMeshes[name]={buffer,count:data.length/5};
   }
  }
  let wallMaterial=null,wallImage=null,wallMaterialReady=false,wallMaterialError=null;
   const surfaceMaterials=Object.fromEntries(Object.entries({...SURFACE_TEXTURES,wing:null})
    .map(([kind,url])=>[kind,{url,texture:null,image:null,ready:false,error:null}]));
  let projectedShadowDraws=0;
  let shadowLampAssignments={};
  const textures=new Map();
  const actionTextures=new Map(); // separate GPU action poses at real 3D anchors
  let drawnPoses={};
  try{
   gl=canvas.getContext('webgl',{depth:true,alpha:false,antialias:true});
   if(!gl)throw Error('WebGL unavailable');
   world=program(gl,worldVertex,worldFragment,['aP','aUv'],['uVP','uTime','uSurface','uMode','uWallTexture','uWallReady','uFloorTexture','uCeilingTexture','uFloorReady','uCeilingReady','uWingTexture','uWingReady','uLampPositions[0]','uLampColors[0]','uLampLevels[0]','uAmbient','uPlatformPositions[0]','uPlatformColors[0]','uPlatformExposure','uPlatformBackZ','uTrainPosition','uTrainSpeed','uDoorLightOpen','uViewEye','uGeometry','uWindowCutouts','uDoorOpen']);
   portrait=program(gl,portraitVertex,portraitFragment,['aUv'],
     ['uVP','uFoot','uRight','uUp','uHeight','uSoleX','uSoleY','uCrownY','uWidthScale','uLean','uClipUv','uTexture','uHit','uDim','uBlur','uFacing','uRightDir','uLampPositions[0]','uLampColors[0]','uLampLevels[0]','uAmbient','uPlatformPositions[0]','uPlatformColors[0]','uPlatformExposure','uPlatformBackZ','uTrainPosition','uTrainSpeed','uDoorLightOpen']);
   fixture=program(gl,fixtureVertex,fixtureFragment,['aUv'],
    ['uVP','uCenter','uSize','uLevel','uRedMix','uGlow']);
   projectedShadow=program(gl,projectedShadowVertex,projectedShadowFragment,['aUv'],
    ['uVP','uFoot','uRight','uLamp','uHeight','uSoleX','uSoleY','uCrownY','uClipUv','uTexture','uStrength','uContact']);
   [floorOuter,floorInner,backInner,backOuter,ceilingOuter,ceilingInner,wingOuter,wingInner,exteriorMesh]=worldMesh(gl);
   makePlatformMeshes();
   shadowGrid=projectedShadowMesh(gl);
   quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,0,1,1,0,0,1,1,1,1,0]),gl.STATIC_DRAW);
   for(const id of Object.keys(bindings))textures.set(id,prepareTexture(gl));
   actionTextures.set('hero-attack',prepareTexture(gl));
   actionTextures.set('enemy-2-hit',prepareTexture(gl));
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
   // GPU texture with an original-procedural fallback while image loads.
   wallMaterial=gl.createTexture();
   if(!wallMaterial)throw Error('3D wall texture creation failed');
   gl.bindTexture(gl.TEXTURE_2D,wallMaterial);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,
    new Uint8Array([22,25,28,255]));
   wallImage=new Image();
   wallImage.decoding='async';
   canvas.dataset.wallTexture='loading';
   wallImage.onload=()=>{
    if(environmentEpoch!==0)return;
    if(!gl||!wallMaterial)return;
    try{
     gl.bindTexture(gl.TEXTURE_2D,wallMaterial);
     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,wallImage);
     wallMaterialReady=true;
     wallMaterialError=null;
     canvas.dataset.wallTexture='ready';
    }catch(error){
     wallMaterialError=String(error.message||error);
     canvas.dataset.wallTexture='error';
    }
   };
   wallImage.onerror=()=>{
    if(environmentEpoch!==0)return;
    wallMaterialError='Image loading failed: '+WALL_TEXTURE.url;
    canvas.dataset.wallTexture='error';
   };
   wallImage.src=WALL_TEXTURE.url;
   // The source art stays 2D and rectangular. Surface meshes bend its UVs.
   for(const [kind,unit] of [['floor',1],['ceiling',2],['wing',3]]){
    const material=surfaceMaterials[kind];
    material.texture=gl.createTexture();
    gl.activeTexture(gl.TEXTURE0+unit);
    gl.bindTexture(gl.TEXTURE_2D,material.texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,
     new Uint8Array([60,65,70,255]));
    material.image=new Image();
    material.image.decoding='async';
    material.image.onload=()=>{
     if(environmentEpoch!==0)return;
     if(!gl)return;
     try{
      gl.activeTexture(gl.TEXTURE0+unit);
      gl.bindTexture(gl.TEXTURE_2D,material.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,material.image);
      material.ready=true;
      canvas.dataset[kind+'Texture']='ready';
     }catch(error){material.error=String(error);canvas.dataset[kind+'Texture']='error';}
    };
    material.image.onerror=()=>{
     if(environmentEpoch!==0)return;
     material.error='Unable to load '+material.url;
     canvas.dataset[kind+'Texture']='error';
    };
    canvas.dataset[kind+'Texture']='loading';
    // The worn floor art changed; invalidate long-lived browser texture caches.
    if(material.url)material.image.src=material.url+(kind==='floor'?'?v=cinematic-floor-v19-20261107':'');
   }
  }catch(err){
   canvas.dataset.error=String(err.message||err);status.textContent='WebGL failed '+String(err.message||err);
   gl=null;
  }
  let active=false,mode='outer',shotIndex=0,lens=null,elapsed=0,frames=0,paintCount=0,drawnActorIds=[];
  let transitMode=false,environmentId='convenience',environmentEpoch=0;
  let platformExposure=0,platformExposureOverride=null;
  let doorOpen=0;
  function setTransitDoorOpen(value,redraw=true){
   // The existing carriage RAF owns all door animation frames. No extra
   // render on the same tick and no second canvas/video composite.
   doorOpen=clamp(Number(value)||0,0,1);
   if(redraw&&active&&transitMode)render(0);
   return doorOpen;
  }
  let trainState={distanceMeters:0,speedMps:0,stationExposure:1,
   phase:'docked',moving:false,progress:1,legs:0};
  function setTransitDynamics(next){
   if(!transitMode||!next)return null;
   trainState={
    distanceMeters:Math.max(0,Number(next.distanceMeters)||0),
    speedMps:Math.max(0,Number(next.speedMps)||0),
    stationExposure:clamp(Number(next.stationExposure)||0,0,1),
    phase:next.phase||'docked',moving:!!next.moving,
    progress:clamp(Number(next.progress)||0,0,1),
    legs:Math.max(0,Math.floor(next.legs||0))
   };
   // A manual lamp state (anomaly and screenshot QA) persists while parked.
   // During travel, external light is always owned by proximity to a station.
   if(trainState.moving)platformExposureOverride=null;
   platformExposure=platformExposureOverride??trainState.stationExposure;
   return {...trainState};
  }
  const DARK_PLATFORM_POSITIONS=new Float32Array(12);
  const DARK_PLATFORM_COLORS=new Float32Array(12);
  function setPlatformExposure(value){
   platformExposureOverride=clamp(Number(value)||0,0,1);
   platformExposure=platformExposureOverride;
   if(active&&transitMode)render(0);
   return platformExposure;
  }
  let transitHeroSource=null,transitHeroAssignment=null;
  async function ensureTransitHero(){
   // The battle preview defaults to female-07. A metro ride MUST instead
   // show the real canonical protagonist's animated rear L2D, not that
   // unrelated preview or a blank frame from a hidden offscreen source.
   for(let retry=0;retry<15&&transitMode;retry++){
    const dev=window.PaperchalkCharacterDev;
    if(dev?.ready){
     const current=dev.assigned?.player;
     if(current&&(current.id!=='protagonist'||current.side!=='back')){
      transitHeroAssignment={id:current.id,side:current.side};
      await dev.assign('player','protagonist','back',false);
     }
     return;
    }
    await new Promise(resolve=>setTimeout(resolve,120));
   }
  }
  let environmentLightRig=null,environmentActorIds=null;
  const sceneRig=whichMode=>environmentLightRig||lightRigs[whichMode]||lightRigs.outer;
  function fixedEnvironmentCamera(base,preset,aspect){
   const t=clamp((1.05-clamp(Number(aspect)||16/9,.35,3.5))/.4875,0,1);
   const blend=(desktop,phone)=>({
    x:desktop.x+(phone.x-desktop.x)*t,
    y:desktop.y+(phone.y-desktop.y)*t,
    z:desktop.z+(phone.z-desktop.z)*t
   });
   return {...base,shot:'scene-passenger-eye',
    eye:preset.phoneEye?blend(preset.eye,preset.phoneEye):{...preset.eye},
    focus:preset.phoneFocus?blend(preset.focus,preset.phoneFocus):{...preset.focus},
    fov:preset.fov,sceneStatic:true,fovMode:preset.fovMode||null,
    ...(Number.isFinite(preset.lensShift)?{lensShift:preset.lensShift}:{})};
  }
  let mouseLookX=0,mouseLookY=0;
  const params=new URLSearchParams(window.location.search);
  let lightState=LIGHT_STATES.includes(params.get('lights'))?params.get('lights'):'on';
  let currentLighting=lightingFrame(lightState,0,mode);
  const lightLabel=hud.querySelector('[data-lighting]');
  const lightStateNames={on:'正常',partial:'部分熄灭',flicker:'故障闪烁',outage:'应急红灯',horror:'恐怖演出'};
  let lightingStartedAt=performance.now()/1000;
  let lightingPhasePreview=null;
  function setLighting(state,previewPhase=null){
   lightState=LIGHT_STATES.includes(state)?state:'on';
   lightingStartedAt=performance.now()/1000;
   // A fixed phase is used only for deterministic horror beat screenshots;
   // ordinary player light failures use independent true wall-clock time.
   lightingPhasePreview=Number.isFinite(previewPhase)?previewPhase:null;
   currentLighting=lightingFrame(lightState,lightingPhasePreview??0,mode);
   lightLabel.textContent='灯光：'+lightStateNames[lightState];
   lightLabel.setAttribute('aria-label','灯光状态 '+lightStateNames[lightState]+',点击切换');
   if(active)render(0);
   return lightState;
  }
  lightLabel.textContent='灯光：'+lightStateNames[lightState];
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
   if(e.key.toLowerCase()==='l'&&!e.repeat){e.preventDefault();setLighting(LIGHT_STATES[(LIGHT_STATES.indexOf(lightState)+1)%LIGHT_STATES.length]);}
  }
  window.addEventListener('keydown',onDirectorKey);
  window.addEventListener('paperworld:lighting',e=>{
   if(e.detail?.state)setLighting(e.detail.state);
  });
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
   if(b.hasAttribute('data-lighting')){
    setLighting(LIGHT_STATES[(LIGHT_STATES.indexOf(lightState)+1)%LIGHT_STATES.length]);
    return;
   }
   if(b.hasAttribute('data-exit')&&!attack&&typeof onExit==='function')onExit();
  });
  function sourceFor(actor){
   const safeHero=()=>actor.id==='hero'&&transitMode?metroCanonicalSource():null;
   if(actor.id==='hero'&&posePreviewEnabled&&!transitMode){
    if(!poseImage.complete||!poseImage.naturalWidth)return null;
    return {
     runtime:{
      img:{dataset:{characterId:previewPose==='female7'?'female-07':'protagonist-'+previewPose+'-fixed-left',characterSide:'back'}},
      root:{dataset:{l2dEdition:previewPose==='female7'?'female07-original-cutout':'fixed-left-v17',l2dMode:'static-camera-billboard'}}
     },
     source:poseImage,w:poseImage.naturalWidth,h:poseImage.naturalHeight
    };
   }
   const runtime=window.PaperchalkL2D?.get(actor.slot);
   if(!runtime||runtime.root.hidden||runtime.img.hidden||
     runtime.root.dataset.l2dState!=='ready')return safeHero();
   // An IndexedDB scene assignment can outlive a previous DEV session.
   // A back-view battle must NEVER render another character or the front
   // portrait as the heroine while the canonical model is being reattached.
   if(actor.id==='hero'){
    if(runtime.img.dataset.characterId!=='protagonist'||
       runtime.img.dataset.characterSide!=='back')return safeHero();
    // "ready" on a DOM image can occur BEFORE the latest genuine
    // 2D L2D frame arrives. Do not upload the previous character's pixels.
    if(runtime.clip?.type==='decoder'&&runtime.clip.frame<0)return safeHero();
    if(runtime.libraryPlayer&&(
      runtime.libraryPlayer.disposed||
      runtime.libraryPlayer.renderedFrames<1||
      !['protagonist','protagonist-rig-v1','protagonist-unified-v1']
       .includes(runtime.libraryPlayer.model?.characterId)))return safeHero();
    if(!runtime.clip&&!runtime.libraryPlayer&&
       runtime.lastSource!==(runtime.img.currentSrc||runtime.img.src))return safeHero();
   }
   const source=runtime.clip?.type==='native'?runtime.clip.img:runtime.canvas;
   if(!source)return safeHero();
   const w=source.videoWidth||source.naturalWidth||source.width;
   const h=source.videoHeight||source.naturalHeight||source.height;
   if(!w||!h)return safeHero();
   if(actor.id==='hero'&&transitMode&&!metroLivePortraitHasPixels(source))
    return safeHero();
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
   const alpha=(x,y)=>data[(y*N+x)*4+3];
   let high=0,medium=0;
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const a=alpha(x,y);
    if(a>=168)high++;
    if(a>=88)medium++;
   }
   // Exclude diffuse fog from the body rectangle; fallback for deliberately
   // translucent characters only if no strong foreground alpha exists.
   const cutoff=high>=60?168:medium>=60?88:44;
   const columns=new Uint16Array(N),rows=new Uint16Array(N);
   let combatX0=N,combatX1=-1;
   const combatTopRows=Math.floor(N*.55);
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    if(alpha(x,y)<cutoff)continue;
    columns[x]++;rows[y]++;
    if(y<combatTopRows){combatX0=Math.min(combatX0,x);combatX1=Math.max(combatX1,x)}
   }
   let x0=N,y0=N,x1=-1,y1=-1;
   for(let i=0;i<N;i++){
    if(columns[i]>=2){x0=Math.min(x0,i);x1=Math.max(x1,i)}
    if(rows[i]>=2){y0=Math.min(y0,i);y1=Math.max(y1,i)}
   }
   if(x1<0||y1<0)return;
   const fresh={
    left:clamp(x0/N-.028,0,1),right:clamp((x1+1)/N+.028,0,1),
    top:clamp(y0/N-.028,0,1),bottom:clamp((y1+1)/N+.028,0,1)
   };
   // Animated limbs may leave the initial rectangle. Grow, never shrink:
   // no crop jumping when L2D animates or fluorescent fixtures flicker.
   const prev=texture.visibleUv;
   const visible=prev?{
    left:Math.min(prev.left,fresh.left),right:Math.max(prev.right,fresh.right),
    top:Math.min(prev.top,fresh.top),bottom:Math.max(prev.bottom,fresh.bottom)
   }:fresh;
   texture.visibleUv=visible;
   texture.shadowClipUv={
    left:clamp(visible.left-.057,0,1),right:clamp(visible.right+.057,0,1),
    top:clamp(visible.top-.057,0,1),bottom:clamp(visible.bottom+.057,0,1)
   };
   // Shoe and crown reference cannot change every time a ponytail moves.
   // Lock the first reliable alpha body rectangle for this character ID.
   if(!texture.opaqueUv)texture.opaqueUv={
    left:visible.left,right:visible.right,
    top:clamp(y0/N-.007,0,.45),bottom:clamp((y1+1)/N+.004,.5,1)
   };
   texture.opaqueCombatUv=combatX1>=0?{
    left:clamp(combatX0/N-.018,0,1),
    right:clamp((combatX1+1)/N+.018,0,1),
    top:texture.opaqueUv.top,bottom:combatTopRows/N
   }:texture.opaqueUv;
  }
  // Source 3rd enemy includes TWO large, opaque, prepainted fog clouds.
  // A normal alpha bbox cannot remove them (their alpha exceeds 168/255).
  // For the 3D BATTLE texture ONLY, apply a feathered body-shaped alpha mask;
  // the original story L2D image, rig, poses and saved pixels remain intact.
  function maskEmbeddedFogForBattle(tex,ctx,size,id,characterId=''){
   // Same original CHAR-006 artwork is temporarily assigned to both teams.
   // Remove the opaque prepainted cloud in BOTH battle views without touching
   // its real L2D source, but never apply a CHAR-006 mask to a reassigned ally.
   if(id!=='enemy-3'&&!(id==='ally-4'&&characterId==='char-006'))return;
   if(!tex.subjectMask||tex.subjectMask.width!==size){
    const mask=document.createElement('canvas');
    mask.width=size;mask.height=size;
    const m=mask.getContext('2d',{alpha:true});
    const profile=[
     [0,.395,.634],[.12,.39,.635],[.23,.355,.655],
     [.39,.332,.665],[.52,.350,.665],[.60,.365,.720],
     [.75,.38,.720],[.84,.39,.68],[1,.40,.59]
    ];
    m.save();
    m.filter='blur('+Math.max(3,Math.round(size*.008))+'px)';
    m.beginPath();
    for(const [y,left]of profile)m.lineTo(left*size,y*size);
    for(let i=profile.length-1;i>=0;i--){
     const [y,,right]=profile[i];m.lineTo(right*size,y*size);
    }
    m.closePath();m.fillStyle='white';m.fill();
    m.restore();
    tex.subjectMask=mask;
   }
   ctx.save();
   ctx.globalCompositeOperation='destination-in';
   ctx.drawImage(tex.subjectMask,0,0,size,size);
   ctx.restore();
   tex.sourceMask='battle-only-feathered-subject-separates-opaque-clouds';
  }
  function updateTexture(a,now){
   const targetTexture=textures.get(a.id),desc=sourceFor(a);
   if(!desc){
    // Never show a stale wrong-identity WebGL texture.
    targetTexture.painted=false;
    targetTexture.opaqueUv=null;targetTexture.opaqueCombatUv=null;
    targetTexture.visibleUv=null;targetTexture.shadowClipUv=null;
    return false;
   }
   const identity=desc.runtime.img.dataset.characterId+'|'+
    desc.runtime.img.dataset.characterSide+'|'+
    (desc.runtime.root.dataset.l2dEdition||'')+'|'+
    (desc.runtime.root.dataset.l2dMode||'');
   if(targetTexture.identity!==identity){
    targetTexture.identity=identity;
    targetTexture.painted=false;targetTexture.opaqueUv=null;targetTexture.opaqueCombatUv=null;
    targetTexture.visibleUv=null;targetTexture.shadowClipUv=null;
    targetTexture.nextProbe=0;targetTexture.updated=-999;
   }
   const fixedPose=a.id==='hero'&&posePreviewEnabled&&!transitMode;
   // Static heroine: one GPU upload only. All animated L2D remain dynamic.
   const canonicalMetroFallback=actor.id==='hero'&&transitMode&&
    desc.runtime.root.dataset.l2dMode==='original-source-fallback-waiting-for-live-l2d';
   // A static source fallback needs ONE upload, not repeated GPU uploads.
   // sourceFor still checks for an eventual nonblank true L2D on every render.
   if((fixedPose||canonicalMetroFallback)&&targetTexture.painted)return true;
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
     const portraitInsetX=previewPose==='level'?32:0; // No offsets for female-07 original
     ctx.drawImage(desc.source,fitted.x+portraitInsetX,fitted.y,
      fitted.width,fitted.height);
    }else ctx.drawImage(desc.source,0,0,size,size);
    maskEmbeddedFogForBattle(targetTexture,ctx,size,a.id,
     desc.runtime.img.dataset.characterId);
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
   gl.vertexAttribPointer(world.aP,3,gl.FLOAT,false,20,0);
   gl.vertexAttribPointer(world.aUv,2,gl.FLOAT,false,20,12);
   gl.uniform1i(world.uSurface,kind);
   gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  }
  function setSceneLighting(prog,whichMode){
   const rig=sceneRig(whichMode);
   gl.uniform3fv(prog['uLampPositions[0]'],rig.positions);
   gl.uniform3fv(prog['uLampColors[0]'],currentLighting.colors);
   gl.uniform1fv(prog['uLampLevels[0]'],currentLighting.levels);
   gl.uniform3fv(prog.uAmbient,currentLighting.ambient);
   const lights=transitMode?window.PaperWorldEnvironments?.get?.('metro')?.platformLighting:null;
   gl.uniform3fv(prog['uPlatformPositions[0]'],lights?.positions||DARK_PLATFORM_POSITIONS);
   gl.uniform3fv(prog['uPlatformColors[0]'],lights?.colors||DARK_PLATFORM_COLORS);
   gl.uniform1f(prog.uPlatformExposure,transitMode?platformExposure:0);
   gl.uniform1f(prog.uPlatformBackZ,lights?.backZ??8.0);
   gl.uniform1f(prog.uTrainPosition,transitMode?trainState.distanceMeters:0);
   gl.uniform1f(prog.uTrainSpeed,transitMode?trainState.speedMps:0);
   gl.uniform1f(prog.uDoorLightOpen,transitMode?doorOpen:0);
  }
  // Fix the selected real-world luminaire PER ACTOR at its immutable base
  // anchor. Power only modulates shadow intensity. It must NEVER switch the
  // shadow to a different fixture when the chosen lamp flickers off.
  // Physical actor lunges still move the actual shadow within that fixed light.
  function assignedShadowLamp(actor,whichMode=mode){
   const rig=sceneRig(whichMode);
   // Lamp distance must use the SAME actual per-scene actor footprint.
   const anchor=ACTIVE_GEOMETRY.shape==='arc'?
    (visibleActors(whichMode).find(a=>a.id===actor.id)||actor):actor;
   const choices=[];
   for(let i=0;i<rig.count;i++){
    const dx=anchor.x-rig.positions[i*3],dz=anchor.z-rig.positions[i*3+2];
    const distance=dx*dx+dz*dz;
    const headY=Math.min(LIGHTING.height-.20,anchor.height*.88);
    const projectedHeadOffset=Math.sqrt(distance)*
     headY/Math.max(.20,rig.positions[i*3+1]-headY);
    const readability=Math.exp(-1.8*Math.abs(projectedHeadOffset-1.75));
    const score=readability/(1+.085*distance);
    choices.push({index:i,distance,score,
     position:rig.positions.subarray(3*i,3*i+3)});
   }
   choices.sort((a,b)=>b.score-a.score||(a.index-b.index));
   const selected=choices[0];
   return {index:selected.index,position:selected.position,
    strength:currentLighting.levels[selected.index]/(1.0+.16*selected.distance)};
  }
  function drawFixtures(vp){
   gl.useProgram(fixture.handle);
   gl.uniformMatrix4fv(fixture.uVP,false,new Float32Array(vp));
   gl.bindBuffer(gl.ARRAY_BUFFER,quad);
   gl.enableVertexAttribArray(fixture.aUv);
   gl.vertexAttribPointer(fixture.aUv,2,gl.FLOAT,false,8,0);
   gl.uniform1f(fixture.uGlow,0);
   gl.uniform2f(fixture.uSize,.21,1.08);
   const rig=sceneRig(mode);
   for(let i=0;i<rig.count;i++){
    gl.uniform3fv(fixture.uCenter,rig.positions.subarray(i*3,i*3+3));
    gl.uniform1f(fixture.uLevel,currentLighting.levels[i]);
    gl.uniform1f(fixture.uRedMix,currentLighting.redMix[i]);
    gl.drawArrays(gl.TRIANGLES,0,6);
   }
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
   gl.depthMask(false);gl.uniform1f(fixture.uGlow,1);
   gl.uniform2f(fixture.uSize,.76,2.05);
   for(let i=0;i<rig.count;i++){
    if(currentLighting.levels[i]<.01)continue;
    gl.uniform3fv(fixture.uCenter,rig.positions.subarray(i*3,i*3+3));
    gl.uniform1f(fixture.uLevel,currentLighting.levels[i]);
    gl.uniform1f(fixture.uRedMix,currentLighting.redMix[i]);
    gl.drawArrays(gl.TRIANGLES,0,6);
   }
   gl.depthMask(true);gl.disable(gl.BLEND);
   gl.disableVertexAttribArray(fixture.aUv);
  }
  function drawProjectedShadows(actors,cam,vp){
   projectedShadowDraws=0;
   shadowLampAssignments={};
   if(!shadowGrid)return;
   gl.useProgram(projectedShadow.handle);
   gl.uniformMatrix4fv(projectedShadow.uVP,false,new Float32Array(vp));
   gl.activeTexture(gl.TEXTURE0);
   gl.uniform1i(projectedShadow.uTexture,0);
   gl.bindBuffer(gl.ARRAY_BUFFER,shadowGrid.buffer);
   gl.enableVertexAttribArray(projectedShadow.aUv);
   gl.vertexAttribPointer(projectedShadow.aUv,2,gl.FLOAT,false,8,0);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   gl.depthMask(false);
   for(const a of actors){
    const tex=textures.get(a.id);
    if(!tex?.painted)continue;
    const pivot=tex.opaqueUv;
    const crown=pivot?clamp(pivot.top,0,.40):a.crownY;
    const sole=pivot?clamp(pivot.bottom,crown+.20,1):a.soleY;
    const right=actorWorldRight(a,mode);
    gl.uniform3fv(projectedShadow.uRight,new Float32Array([right.x,0,right.z]));
    gl.uniform3fv(projectedShadow.uFoot,new Float32Array([a.x,a.y,a.z]));
    gl.uniform1f(projectedShadow.uHeight,a.height);
    gl.uniform1f(projectedShadow.uSoleX,a.soleX);
    gl.uniform1f(projectedShadow.uSoleY,sole);
    gl.uniform1f(projectedShadow.uCrownY,crown);
    const clip=tex.shadowClipUv||{left:0,top:0,right:1,bottom:1};
    gl.uniform4f(projectedShadow.uClipUv,clip.left,clip.top,clip.right,clip.bottom);
    gl.bindTexture(gl.TEXTURE_2D,tex.texture);
    const lamp=assignedShadowLamp(a,mode);
    shadowLampAssignments[a.id]=lamp.index;
    if(lamp.strength>.012){
     gl.uniform3fv(projectedShadow.uLamp,lamp.position);
     gl.uniform1f(projectedShadow.uContact,0);
     gl.uniform1f(projectedShadow.uStrength,Math.min(.25,lamp.strength*.32));
     gl.drawArrays(gl.TRIANGLES,0,shadowGrid.count);
     projectedShadowDraws++;
     gl.uniform1f(projectedShadow.uContact,1);
     gl.uniform1f(projectedShadow.uStrength,Math.min(.38,lamp.strength*.43));
     gl.drawArrays(gl.TRIANGLES,0,shadowGrid.count);
     projectedShadowDraws++;
    }
    // These are the SAME measured L2D alpha silhouettes, projected from
    // real platform lamps THROUGH the windows. They remain even if the
    // carriage ceiling flickers off, unlike the train's ceiling shadows.
    if(transitMode&&platformExposure>.08){
     const outside=window.PaperWorldEnvironments?.get?.('metro')?.platformLighting;
     if(outside?.positions){
      for(const [offset,weight] of [[0,.16],[9,.10]]){
       gl.uniform3fv(projectedShadow.uLamp,
        new Float32Array(outside.positions.slice(offset,offset+3)));
       gl.uniform1f(projectedShadow.uContact,0);
       gl.uniform1f(projectedShadow.uStrength,weight*platformExposure);
       gl.drawArrays(gl.TRIANGLES,0,shadowGrid.count);
       projectedShadowDraws++;
      }
     }
    }
   }
   gl.depthMask(true);gl.disable(gl.BLEND);
   gl.disableVertexAttribArray(projectedShadow.aUv);
  }
  // The image stays on the actor's ground-anchored billboard, never a DOM
  // fullscreen illustration. One GPU upload is enough per static pose.
  // Only transparent margins of the TEMPORARY GPU action texture are
  // trimmed. The original L2D and saved action source are NEVER modified.
  function actionOpaqueRect(img){
   const n=256,probe=document.createElement('canvas');
   probe.width=n;probe.height=n;
   const ctx=probe.getContext('2d',{willReadFrequently:true});
   ctx.drawImage(img,0,0,n,n);
   const px=ctx.getImageData(0,0,n,n).data;
   let l=n,t=n,r=-1,b=-1;
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    if(px[(y*n+x)*4+3]<26)continue;
    l=Math.min(l,x);r=Math.max(r,x);
    t=Math.min(t,y);b=Math.max(b,y);
   }
   if(r<l)return null;
   const padding=9;
   l=Math.max(0,l-padding);r=Math.min(n-1,r+padding);
   t=Math.max(0,t-padding);b=Math.min(n-1,b+padding);
   const sx=Math.floor(l/n*img.naturalWidth),sy=Math.floor(t/n*img.naturalHeight);
   return {sx,sy,sw:Math.min(img.naturalWidth-sx,Math.max(1,Math.ceil((r-l+1)/n*img.naturalWidth))),
    sh:Math.min(img.naturalHeight-sy,Math.max(1,Math.ceil((b-t+1)/n*img.naturalHeight)))};
  }
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
   let crop={sx:0,sy:0,sw:img.naturalWidth,sh:img.naturalHeight};
   try{crop=actionOpaqueRect(img)||crop}catch(_){/* use full art */}
   const fit=portraitFit(crop.sw,crop.sh,size*.94),pad=size*.03;
   ctx.drawImage(img,crop.sx,crop.sy,crop.sw,crop.sh,
    fit.x+pad,fit.y+pad,fit.width,fit.height);
   try{
    gl.bindTexture(gl.TEXTURE_2D,t.texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,t.stage);
    t.uploadedSize=size;t.painted=true;t.frames++;
    t.alphaTrim={source:{width:img.naturalWidth,height:img.naturalHeight},crop};
    return true;
   }catch(error){t.error=String(error);return false}
  }
  function drawActors(actors,cam,vp){
   // Transparent L2D textures MUST sort by CAMERA VIEW DEPTH, not by
   // Euclidean radial distance (which falsely reorders a same-Z four-person
   // row by x-distance and paints one actor's attached fog OVER the next).
   // Stable source order for equal depths puts the final character last.
   const ordered=sortActorsForAlpha(actors,cam);
   gl.useProgram(portrait.handle);
   gl.uniformMatrix4fv(portrait.uVP,false,new Float32Array(vp));
   gl.bindBuffer(gl.ARRAY_BUFFER,quad);
   gl.enableVertexAttribArray(portrait.aUv);
   gl.vertexAttribPointer(portrait.aUv,2,gl.FLOAT,false,8,0);
   gl.uniform3fv(portrait.uUp,new Float32Array([0,1,0]));
   setSceneLighting(portrait,mode);
   gl.activeTexture(gl.TEXTURE0);gl.uniform1i(portrait.uTexture,0);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   gl.depthMask(false);
   for(const item of ordered){
    const a=item.actor;
    const requested=director.poseFor(a.id,attack,attackSample);
    // This picture IS female-07. Never switch her to a completely different
    // red-haired protagonist's axe poster during an attack. Keep the same
    // original back-facing art on the real 3D actor and drive a grounded
    // frame-timed lean, fast forward lunge, and the existing impact VFX.
    const female07Actor=a.id==='hero'&&previewPose==='female7';
    const key=requested==='attack'&&!female07Actor?'hero-attack':
     requested==='hurt-art'?'enemy-2-hit':null;
    const art=key?actionTextures.get(key):null;
    const t=art?.painted?art:textures.get(a.id);
    drawnPoses[a.id]=female07Actor&&requested==='attack'?'female07-axe-lunge':
     art?.painted?requested:
     requested==='hurt-original'?'hurt-original':'idle';
    if(!t?.painted)continue;
    const right=actorWorldRight(a,mode);
    const forward=normalize(cross(right,{x:0,y:1,z:0}));
    gl.uniform3fv(portrait.uRight,new Float32Array([right.x,0,right.z]));
    gl.uniform3fv(portrait.uRightDir,new Float32Array([right.x,0,right.z]));
    gl.uniform3fv(portrait.uFacing,new Float32Array([forward.x,0,forward.z]));
    gl.uniform3fv(portrait.uFoot,new Float32Array([a.x,a.y,a.z]));
    gl.uniform1f(portrait.uHeight,a.height);
    gl.uniform1f(portrait.uSoleX,a.soleX);
    // Authentic L2D artwork contains wildly different transparent shoe
    // margins. Using .979 for all actors made the visible boots hover above
    // their physically correct y=0 world foot. This ALPHA-derived pivot
    // makes the visible shoes TOUCH the actual 3D floor with unchanged
    // artist source PNGs, character height and world-space ground anchors.
    const alphaPivot=art?.painted?null:textures.get(a.id)?.opaqueUv;
    const crown=alphaPivot?clamp(alphaPivot.top,0,.40):a.crownY;
    const sole=alphaPivot?clamp(alphaPivot.bottom,crown+.20,1):a.soleY;
    gl.uniform1f(portrait.uSoleY,sole);
    gl.uniform1f(portrait.uCrownY,crown);
    const clip=art?.painted?{left:0,top:0,right:1,bottom:1}:
     t.visibleUv||{left:0,top:0,right:1,bottom:1};
    gl.uniform4f(portrait.uClipUv,clip.left,clip.top,clip.right,clip.bottom);
    gl.uniform1f(portrait.uWidthScale,1);
    // Mouse movement does not animate, tilt or translate the heroine.
    // An actual attack still has its authored one-shot physical lunge.
    gl.uniform1f(portrait.uLean,
     female07Actor&&attackSample?.advance
      ? .095*attackSample.advance-.028*attackSample.recoil:0);
    gl.uniform1f(portrait.uHit,attack&&a.id===attack.targetId&&attackSample?
     attackSample.hitFlash:0);
    const duelPerformer=!!attack&&(a.id==='hero'||a.id===attack.targetId);
    // DD source: spectator queue remains faint and softly out of focus
    // during the 46-frame central shot, not erased or moved to DOM.
    const backgroundCue=!duelPerformer&&attackSample?attackSample.zoom:0;
    gl.uniform1f(portrait.uDim,.72*backgroundCue);
    gl.uniform1f(portrait.uBlur,.88*backgroundCue);
    gl.bindTexture(gl.TEXTURE_2D,t.texture);
    gl.drawArrays(gl.TRIANGLES,0,6);
   }
   gl.depthMask(true);gl.disable(gl.BLEND);
  }
  function render(dt=1/60,inputX=mouseLookX,inputY=mouseLookY){
   if(!active)return false;
   mouseLookX=clamp(Number(inputX)||0,-1,1);
   mouseLookY=clamp(Number(inputY)||0,-1,1);
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
   // One articulated TPS camera anchored to the real heroine, not a screen
   // overlay. Attack direction remains under the existing action director.
   // One identical real battle shoulder camera for every environment.
   // Only an actual combat attack uses the existing cinematic director.
   // One 2.5D renderer with declarative camera rigs. A standing-passenger
   // eye camera looks into the actual carriage. It doesn't inherit the
   // oversized heroine-centric battle shoulder closeup.
   const scenePack=window.PaperWorldEnvironments?.get?.(environmentId);
   const lensPreset=scenePack?.camera;
   const regular=target?director.cinematicCamera(base,attack,attackSample,target):
    shoulderCamera(base,layout(mode).allies[0],mouseLookX,mouseLookY,
     canvas.clientHeight?canvas.clientWidth/canvas.clientHeight:16/9);
   lens=lensPreset?.mode==='fixed'?fixedEnvironmentCamera(base,lensPreset,
    canvas.clientHeight?canvas.clientWidth/canvas.clientHeight:16/9):regular;
   if(Number.isFinite(lensPreset?.lensShift))
    lens={...lens,lensShift:lensPreset.lensShift};
   elapsed+=clamp(Number(dt)||0,0,.06);frames++;
   currentLighting=lightingFrame(lightState,
    lightingPhasePreview??(performance.now()/1000-lightingStartedAt),mode);
   if(!gl)return false;
   const w=canvas.clientWidth,h=canvas.clientHeight;
   if(w<2||h<2)return false;
   // On mobile trains use fewer fill-rate pixels during relative exterior
   // motion. Preserve authored texture resolution and CSS image geometry.
   // Desktop/battle keep their original unrestricted render pixel policy.
   const pixel=Math.min(renderPixelRatio(w,h,window.devicePixelRatio||1),
    transitMode&&w<900?1.5:1.75);
   const W=Math.floor(w*pixel),H=Math.floor(h*pixel);
   if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
   const cam=lens,vp=cameraVP(cam,w/h);
   gl.viewport(0,0,W,H);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
   gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.depthMask(true);
   gl.clearColor(.001,.005,.008,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.useProgram(world.handle);gl.enableVertexAttribArray(world.aP);gl.enableVertexAttribArray(world.aUv);
   gl.uniformMatrix4fv(world.uVP,false,new Float32Array(vp));
   gl.uniform3fv(world.uViewEye,new Float32Array([cam.eye.x,cam.eye.y,cam.eye.z]));
   gl.uniform1f(world.uTime,elapsed);
   gl.uniform1f(world.uMode,mode==='inner'?1:0);
   gl.uniform1f(world.uGeometry,ACTIVE_GEOMETRY.shape==='arc'?0:
    ACTIVE_GEOMETRY.shape==='strip'?1:2);
   gl.uniform1f(world.uWindowCutouts,ACTIVE_WALL.alphaWindows?1:0);
   gl.uniform1f(world.uDoorOpen,transitMode?doorOpen:0);
   setSceneLighting(world,mode);
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D,wallMaterial);
   gl.uniform1i(world.uWallTexture,0);
   gl.uniform1f(world.uWallReady,wallMaterialReady?1:0);
   gl.activeTexture(gl.TEXTURE1);
   gl.bindTexture(gl.TEXTURE_2D,surfaceMaterials.floor.texture);
   gl.uniform1i(world.uFloorTexture,1);
   gl.uniform1f(world.uFloorReady,surfaceMaterials.floor.ready?1:0);
   gl.activeTexture(gl.TEXTURE2);
   gl.bindTexture(gl.TEXTURE_2D,surfaceMaterials.ceiling.texture);
   gl.uniform1i(world.uCeilingTexture,2);
   gl.uniform1f(world.uCeilingReady,surfaceMaterials.ceiling.ready?1:0);
   gl.activeTexture(gl.TEXTURE3);
   gl.bindTexture(gl.TEXTURE_2D,surfaceMaterials.wing.texture);
   gl.uniform1i(world.uWingTexture,3);
   gl.uniform1f(world.uWingReady,surfaceMaterials.wing.ready?1:0);
   drawWorld(mode==='outer'?floorOuter:floorInner,0,vp);
   drawWorld(mode==='outer'?ceilingOuter:ceilingInner,2,vp);
   if(ACTIVE_WALL.alphaWindows&&exteriorMesh?.count)drawWorld(exteriorMesh,4,vp);
   if(transitMode&&platformExposure>.08&&platformMeshes.platformBack?.count){
    // Actual physical station volume, rendered with the train in ONE depth
    // buffer. All parts are STATIC GPU buffers shifted only in vertex shader.
    for(const [name,kind] of [
     ['platformBack',5],['platformFloor',6],['platformCeiling',7],
     ['platformColumns',8],['platformLightboxes',11]]){
     if(platformMeshes[name]?.count)drawWorld(platformMeshes[name],kind,vp);
    }
   }
   drawWorld(mode==='outer'?backInner:backOuter,1,vp);
   if(transitMode&&doorOpen>.002){
    if(platformMeshes.doorLeafLeft?.count)drawWorld(platformMeshes.doorLeafLeft,9,vp);
    if(platformMeshes.doorLeafRight?.count)drawWorld(platformMeshes.doorLeafRight,10,vp);
   }
   drawWorld(mode==='outer'?wingOuter:wingInner,3,vp);
   gl.disableVertexAttribArray(world.aP);gl.disableVertexAttribArray(world.aUv);
   drawFixtures(vp);
   const all=visibleActors(mode).filter(a=>!environmentActorIds||environmentActorIds.has(a.id))
    .map(a=>({...a,...(scenePack?.actors?.positions?.[a.id]||{})}));
   const now=performance.now();
   for(const a of all)updateTexture(a,now);
   uploadActionImage('hero-attack',heroActionArt);
   uploadActionImage('enemy-2-hit',enemyHitArt);
   // V29 original-source measured shared center: performers at 30% / 70%.
   // Their portraits stay in ACTION form through the entire 7-frame retreat.
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
   // Reuse the exact 3D grounded actors, L2D UVs and projected light shadows.
   // No flat portrait DOM plane just because this is a metro wall texture.
   drawProjectedShadows(presented,cam,vp);drawActors(presented,cam,vp);
   if(armed)updateTargetPositions(cam,w/h);
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
    cinematic.style.setProperty('--fx-opacity',attackSample.fxOpacity.toFixed(3));
    cinematic.style.setProperty('--damage-opacity',attackSample.damageOpacity.toFixed(3));
    cinematic.style.setProperty('--damage-shift',(attackSample.damageLift*26).toFixed(2)+'px');
   }
   if(frames%12===0){
    const ready=all.filter(a=>textures.get(a.id).painted).length;
    status.textContent='4v4 标准遭遇 · 原地环顾 · 人物 '+ready+'/'+all.length+
     (previewPose==='female7'?' · 女七背面持斧':' · '+(posePreviewEnabled?'旧版3/4 平视':'原版动态'));
    canvas.dataset.l2dReady=String(ready);
    canvas.dataset.renderedFrames=String(frames);
   }
   return true;
  }
  // The very same battle room WebGL meshes, camera, lighting and
  // material shaders are reused for transit. Only texture slots change.
  function changeEnvironment(id){
   if(id===environmentId)return true;
   const pack=window.PaperWorldEnvironments?.get?.(id);
   if(!pack||!gl)return false;
   environmentId=id;ACTIVE_WALL=pack.wall;
   ACTIVE_GEOMETRY=pack.geometry||{shape:'arc'};
   environmentLightRig=ACTIVE_GEOMETRY.shape==='arc'?null:
    window.PaperWorldSceneGeometry?.lightRig?.(ACTIVE_GEOMETRY)||null;
   environmentActorIds=Array.isArray(pack.actors?.visible)?
    new Set(pack.actors.visible):null;
   const epoch=++environmentEpoch;
   const oldMeshes=[floorOuter,floorInner,backInner,backOuter,
    ceilingOuter,ceilingInner,wingOuter,wingInner,exteriorMesh];
   [floorOuter,floorInner,backInner,backOuter,ceilingOuter,
    ceilingInner,wingOuter,wingInner,exteriorMesh]=worldMesh(gl);
   for(const mesh of oldMeshes)if(mesh?.buffer)gl.deleteBuffer(mesh.buffer);
   wallMaterialReady=false;wallMaterialError=null;
   canvas.dataset.wallTexture='loading';canvas.dataset.environment=id;
   const picture=new Image();
   picture.decoding='async';wallImage=picture;
   picture.onload=()=>{
    if(environmentEpoch!==epoch)return;
    try{
     gl.bindTexture(gl.TEXTURE_2D,wallMaterial);
     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,picture);
     wallMaterialReady=true;canvas.dataset.wallTexture='ready';
    }catch(err){wallMaterialError=String(err);canvas.dataset.wallTexture='error'}
   };
   picture.onerror=()=>{if(environmentEpoch===epoch){
    wallMaterialError='Unable to load '+pack.wall.url;canvas.dataset.wallTexture='error';
   }};
   picture.src=pack.wall.url;
   for(const [kind,path,unit] of [['floor',pack.floor,1],['ceiling',pack.ceiling,2],['wing',pack.ends||null,3]]){
    const target=surfaceMaterials[kind],im=new Image();
    target.url=path;target.ready=false;target.error=null;target.image=im;
    canvas.dataset[kind+'Texture']=path?'loading':'unused';
    if(!path)continue;
    im.onload=()=>{
     if(environmentEpoch!==epoch)return;
     try{
      gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,target.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);
      target.ready=true;canvas.dataset[kind+'Texture']='ready';
     }catch(err){target.error=String(err);canvas.dataset[kind+'Texture']='error'}
    };
    im.onerror=()=>{if(environmentEpoch===epoch){
     target.error='Unable to load '+path;canvas.dataset[kind+'Texture']='error';
    }};
    im.src=path+(path.startsWith('./assets/metro/side/')?'?v=station-platform-art-v47-20261108':'');
   }
   return true;
  }
  // Transit has NO bespoke camera, projection, world scale or actor placement.
  // Its scene is the real battlefield with one different author-painted wall.
  function enterTransit(){
   if(active&&!transitMode)return false;
   const carriage=document.getElementById('pw-metro-cabin');
   if(!carriage||!changeEnvironment('metro'))return false;
   transitMode=true;active=true;mode='outer';
   platformExposure=1;platformExposureOverride=null;doorOpen=0;
   trainState={distanceMeters:0,speedMps:0,stationExposure:1,
    phase:'docked',moving:false,progress:1,legs:0};
   // The renderer uploads from the real L2D source canvas, which normally
   // lives in a hidden battle-source DOM root. Unpause it while keeping the
   // DOM node optically invisible: one 3D actor, never a second flat actor.
   const protagonist=window.PaperchalkL2D?.get?.('player');
   if(protagonist?.root){
    transitHeroSource={root:protagonist.root,hidden:protagonist.root.hidden,
     visibility:protagonist.root.style.visibility};
    protagonist.root.hidden=false;
    protagonist.root.style.visibility='hidden';
   }
   ensureTransitHero().catch(error=>console.warn('[Metro L2D hero]',error));
   // Reparent the EXISTING WebGL drawing buffer, not a raster screenshot.
   // In the old implementation it sat in #scene (z=1), behind overlays
   // above #novel-ui (z=6). That produces an empty dark subway view.
   carriage.prepend(canvas);
   canvas.dataset.mount='metro';
   canvas.hidden=false;hud.hidden=true;
   view.classList.add('ring-arena-active','ring-arena-transit');
   elapsed=0;frames=0;mouseLookX=0;mouseLookY=0;
   resetCombatPreview();lens=camera(mode,0);setLighting('on');render(0,0,0);
   return true;
  }
  function exitTransit(){
   if(!transitMode)return false;
   transitMode=false;active=false;platformExposure=0;platformExposureOverride=null;doorOpen=0;
   if(transitHeroSource){
    transitHeroSource.root.hidden=transitHeroSource.hidden;
    transitHeroSource.root.style.visibility=transitHeroSource.visibility;
    transitHeroSource=null;
   }
   if(transitHeroAssignment){
    const previous=transitHeroAssignment;transitHeroAssignment=null;
    window.PaperchalkCharacterDev?.assign?.('player',previous.id,previous.side,false)
     .catch(error=>console.warn('[Metro restore original L2D slot]',error));
   }
   canvas.hidden=true;hud.hidden=true;
   // Restore the SAME canvas and GL context for ordinary ring encounters.
   if(canvas.parentElement!==stage)stage.append(canvas);
   canvas.dataset.mount='ring';
   view.classList.remove('ring-arena-transit','ring-arena-active');
   changeEnvironment('convenience');
   return true;
  }
  function setActive(value){
   if(transitMode)exitTransit();
   active=!!value;canvas.hidden=!active;hud.hidden=!active;
   view.classList.toggle('ring-arena-active',active);
   if(active){mode='outer';elapsed=0;frames=0;shotIndex=0;mouseLookX=0;mouseLookY=0;
    currentLighting=lightingFrame(lightState,0,mode);
    resetCombatPreview();lens=camera(mode,0);render(0)}
   else resetCombatPreview();
  }
  const inspect=()=>({active,transitMode,canvasParent:canvas.parentElement?.id||null,
   cameraParity:(()=>{
    if(!lens||lens.cinematic)return false;
    const base=camera(mode,0);
    const cfg=window.PaperWorldEnvironments?.get?.(environmentId)?.camera;
    const actual=cfg?.mode==='fixed'?fixedEnvironmentCamera(base,cfg,
     canvas.clientHeight?canvas.clientWidth/canvas.clientHeight:16/9):
     shoulderCamera(base,layout(mode).allies[0],mouseLookX,mouseLookY,
     canvas.clientHeight?canvas.clientWidth/canvas.clientHeight:16/9);
    return Math.abs(lens.eye.x-actual.eye.x)<.00001&&
     Math.abs(lens.eye.y-actual.eye.y)<.00001&&
     Math.abs(lens.eye.z-actual.eye.z)<.00001&&
     Math.abs(lens.focus.x-actual.focus.x)<.00001&&
     Math.abs(lens.focus.y-actual.focus.y)<.00001&&
     Math.abs(lens.focus.z-actual.focus.z)<.00001&&
     Math.abs(lens.fov-actual.fov)<.00001;
   })(),
   environment:environmentId,geometry:{...ACTIVE_GEOMETRY},
   transitMotion:{...trainState,carriageWorldFixed:true,heroWorldFixed:true,exteriorDistanceDriven:true},
   station3D:{enabled:transitMode,kind:'genuine-box-meshes',
    components:Object.fromEntries(Object.entries(platformMeshes)
     .map(([key,mesh])=>[key,mesh.count])),
    floorHeight:-.16,backWallZ:4.42,ceilingHeight:3.02,
    doorOpen,doorLeafCount:4,
    doorMaterial:'original-wall-image-texture-with-alpha-glass'},
   platformLighting:{active:transitMode,exposure:platformExposure,
    sources:transitMode?(window.PaperWorldEnvironments?.get?.('metro')?.platformLighting?.positions.length||0)/3:0,
    rearSideWindows:true,oppositeSideWindows:true,
    affects:['floor','wall','original-l2d','real-alpha-shadows'],
    kind:'world-space-lamps-filtered-by-actual-window-bands'},
   windowOpenings:{alpha:!!ACTIVE_WALL.alphaWindows,exteriorMeshVertices:exteriorMesh?.count||0},
   connectionMaterial:{url:surfaceMaterials.wing.url,ready:surfaceMaterials.wing.ready,
    error:surfaceMaterials.wing.error},
   actorAnchors:window.PaperWorldEnvironments?.get?.(environmentId)?.actors?.positions||null,
   encounter:'one-centered-grounded-opponents',encounterControls:0,
   renderer:gl?'webgl-l2d':'unavailable',
    cameraLook:{mode:'hero-root-tps-shoulder-rig',
     yawDeg:lens?.lookYawDeg||0,pitchDeg:lens?.lookPitchDeg||0,
     heroYawDeg:lens?.heroYawDeg||0,
     pivot:lens?.shoulderPivot||null,
     shoulderBoomMeters:lens?.shoulderBoomMeters||null,
     inputX:mouseLookX,inputY:mouseLookY,
     orbitAroundHero:!!lens?.shoulderRig,heroRootWorldStatic:true,
     sharedProjection:true},
    initError:canvas.dataset.error||null,
   mode,shotIndex,shotName:SHOT_NAMES[shotIndex],posePreviewEnabled,previewPose,lensShift:lens?.lensShift??VERTICAL_LENS_SHIFT,
   cameraTarget:camera(mode,shotIndex),
   cameraPitchDeg:cameraPitchDeg(lens||camera(mode,shotIndex)),
   settled:!!lens&&Math.hypot(lens.eye.x-camera(mode,0).eye.x,
     lens.eye.z-camera(mode,0).eye.z)<.001,actors:layout(mode),
   sideWalls:{vertices:(mode==='outer'?wingOuter:wingInner)?.count||0,
     kind:'real-textured-end-wall-mesh',closedSides:2,
     physicalDepth:16.5},
    roomSurfaces:Object.fromEntries(Object.entries(surfaceMaterials).map(([kind,s])=>
     [kind,{url:s.url,ready:s.ready,error:s.error,
      size:s.image?.naturalWidth?[s.image.naturalWidth,s.image.naturalHeight]:null,
      vertices:kind==='floor'?(mode==='outer'?floorOuter:floorInner)?.count:
       (mode==='outer'?ceilingOuter:ceilingInner)?.count,
      mapping:ACTIVE_GEOMETRY.shape==='strip'?'one-piece-train-vinyl-with-underlap':'curved-wall-arc-and-depth'}])),
    lighting:{kind:LIGHTING.kind,count:sceneRig(mode).count,
     state:lightState,levels:[...currentLighting.levels],redMix:[...currentLighting.redMix],
     redFixtureIndices:[...currentLighting.redFixtureIndices],
     ambient:[...currentLighting.ambient],noDetachedRedLight:true,
     physicallyGroundedShadows:projectedShadowDraws,
     silhouetteProjection:'original-L2D-alpha-ray-intersection-y0',
     contactShadow:'original-L2D-shoe-alpha-no-ellipse',
     shadowMode:'live-ceiling-source-world-planar-occlusion',
     shadowFilter:'13-tap-distance-dependent-area-light-penumbra',
     shadowLampAssignments:{...shadowLampAssignments},
     sourcePolicy:'fixed-per-actor-world-luminaire-power-only',
     switchableFixtures:true,
     fixtureHeight:LIGHTING.height,
     positions:[...sceneRig(mode).positions],
     colors:[...currentLighting.colors],
     colorPipeline:'linear-sRGB-shading-filmic-compression',
     spriteNormal:'camera-facing-pseudonormal-preserves-artist-source'},
    wallMaterial:{url:ACTIVE_WALL.url,ready:wallMaterialReady,error:wallMaterialError,
    sourceSize:wallImage?.naturalWidth?[wallImage.naturalWidth,wallImage.naturalHeight]:null,
    repeats:ACTIVE_WALL.repeats,heightMeters:ACTIVE_WALL.heightMeters,
     kind:'curved-webgl-wall'},
   cameraCount:1,eyeLevel:Math.abs((lens||camera(mode,0)).eye.y-1.50)<.001,
   heroStatic:posePreviewEnabled&&!transitMode,heroTextureUploads:textures.get('hero')?.frames??0,
   heroTextureIdentity:textures.get('hero')?.identity||null,
   heroOriginalFallback:!!(transitMode&&textures.get('hero')?.identity?.includes('metro-canonical-original-back')),
   heroTextureError:textures.get('hero')?.error||null,
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
     ready:!!t.painted,uploads:t.frames,alphaTrim:t.alphaTrim||null}]))},
   visibleActorIds:visibleActors(mode).filter(a=>!environmentActorIds||environmentActorIds.has(a.id)).map(a=>a.id),
   hiddenAlliedTeammateIds:HIDDEN_ALLY_IDS,
   camera:lens||camera(mode,shotIndex),ring:SPEC,
   projectionAspect:canvas.clientHeight?canvas.clientWidth/canvas.clientHeight:16/9,
   effectiveVerticalFov:lens?.sceneStatic&&lens?.fovMode==='vertical'?lens.fov:
    responsiveFov((lens||camera(mode,shotIndex)).fov,
     canvas.clientHeight?canvas.clientWidth/canvas.clientHeight:16/9),
   // Per-actor true alpha shoe edges; separately inspectable in browser QA.
   actorVisibleUv:Object.fromEntries(visibleActors(mode).map(a=>{
     const t=textures.get(a.id);
     return [a.id,{clip:t?.visibleUv||null,
      shadowClip:t?.shadowClipUv||null,
      originalQuadKept:false,
      sourcePixelsUntouched:true,sourceMask:t?.sourceMask||null}];
    })),
    measuredShoePivots:Object.fromEntries(visibleActors(mode).map(a=>{
    const uv=textures.get(a.id)?.opaqueUv;
    return [a.id,{crownY:uv?.top??a.crownY,
     soleY:uv?.bottom??a.soleY,fromAlpha:!!uv}];
   })),
   l2dReady:visibleActors(mode).filter(a=>textures.get(a.id)?.painted).length,
   heroine:{
    id:!transitMode&&previewPose==='female7'?'female-07':
     window.PaperchalkL2D?.get('player')?.img?.dataset.characterId||null,
    side:!transitMode&&previewPose==='female7'?'back':
     window.PaperchalkL2D?.get('player')?.img?.dataset.characterSide||null,
    l2dMode:!transitMode&&previewPose==='female7'?'static-back-battle-cutout':
     window.PaperchalkL2D?.get('player')?.root?.dataset.l2dMode||null,
    ready:!!textures.get('hero')?.painted,
    sourceUv:textures.get('hero')?.opaqueUv||null,
    combatUpperUv:textures.get('hero')?.opaqueCombatUv||null
   },
   safety:battleVisualSafety(mode,shotIndex,
    canvas.clientHeight?canvas.clientWidth/canvas.clientHeight:16/9,
    previewPose==='female7'?FEMALE07_BACK_UV:
     textures.get('hero')?.opaqueCombatUv||CANONICAL_BACK_UV,
     lens?.cinematic?null:lens),
   l2dFrames:Object.fromEntries([...textures.entries()].map(([id,t])=>[id,t.frames])),
   pixelsFrom:transitMode?'canonical protagonist animated back L2D from real game slot':
    previewPose==='female7'?'user-approved female-07 original back art (static), four animated enemy L2D actors':
    posePreviewEnabled?'legacy fixed-left 3/4 heroine + animated original enemy L2D':
    'original animated L2D actors'});
  function qaFrame(targetId,elapsedMs){
   if(!directorQA)throw Error('Director QA mode is disabled');
   if(!actorForTarget(targetId)||!Number.isFinite(elapsedMs))throw Error('Invalid QA frame');
   // QA snapshots are INDEPENDENT frozen render frames, not a series of
   // real attacks. Reset enemy HP so advancing from impact to arrival never
   // appears to inflict a second hit in screenshots.
   for(const id of enemyHP.keys())enemyHP.set(id,36);
   attack=director.createAttack(targetId,performance.now(),{mode,reducedMotion:false});
   qaTimeMs=clamp(elapsedMs,0,director.DURATION);
   attackApplied=false;armed=false;previousBeat='qa';
   cinematic.hidden=false;
   cinematic.dataset.hitPortrait=director.hasEnemyHitPortrait(targetId)?'yes':'no';
   victimName.textContent='敌人 '+targetId.slice(-1)+' · 受击';
   cinematicDamage.textContent='-'+attackCard.damage;
   refreshDirectorUI();
   render(0);
   return inspect().director;
  }
  const api={setActive,enterTransit,exitTransit,render,inspect,setLighting,setPlatformExposure,setTransitDynamics,setTransitDoorOpen,get canvas(){return canvas}};
  if(directorQA)api.qaFrame=qaFrame;
  return Object.freeze(api);
 }
 return Object.freeze({SPEC,SURFACE_TEXTURES,STAGING,LIGHTING,LIGHT_STATES,lightingFrame,lightRig,angleForArcMeters,bindings,layout,visibleActors,HIDDEN_ALLY_IDS,wallArcMeters,curvedSurfacePoint,curvedSurfaceUV,
  SHOT_NAMES,CAMERA_STOPS,LOOK_LIMITS,immersiveCamera,shoulderCamera,WALL_TEXTURE,wallTextureUV,cameraPitchDeg,backdropPoint,camera,sortActorsForAlpha,actorWorldRight,portraitBounds,
  portraitVisibleBounds,battleVisualSafety,CANONICAL_BACK_UV,FEMALE07_BACK_UV,responsiveFov,portraitFit,renderPixelRatio,cameraVP,VERTICAL_LENS_SHIFT,lookAt,
  perspective,multiply,project,create});
});