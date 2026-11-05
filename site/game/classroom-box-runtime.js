/* True WebGL 3D room and L2D actors share ONE pinhole camera.
 * Mouse input moves ONLY the actual camera within safe bounds, with
 * composition-preserving look-at rotation. All walls, floor, ceiling and
 * the actors stay at their unchanged world-space coordinates.
 * Frame-time damping happens once in the host game loop.
 */
(function(root,factory){
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.PaperWorldClassroomBox=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const ROOM=Object.freeze({width:9.6,depth:8,height:3.2});
const BASE_CAMERA=Object.freeze({x:0,y:1.22,z:-1.25,hFov:68});
const CHARACTERS=Object.freeze({
  player:Object.freeze({x:-.58,y:0,z:.55,height:1.62,soleX:.51,soleY:.978,visible:.945}),
  enemy:Object.freeze({x:1.12,y:0,z:2.6,height:1.58,soleX:.5,soleY:.978,visible:.95}),
  enemy2:Object.freeze({x:.12,y:0,z:3.25,height:1.59,soleX:.5,soleY:.978,visible:.95}),
  enemy3:Object.freeze({x:2.1,y:0,z:3.5,height:1.60,soleX:.5,soleY:.978,visible:.95})
});
const COLORS=Object.freeze({
  ceiling:'#a8b1be',floor:'#bca17f',back:'#70899b',
  left:'#86a69e',right:'#b78e82'
});
// Every surface is a separately authored, flat/orthographic image file.
// A matching PNG/WebP may replace any SVG without changing world geometry.
// Game performs perspective; no camera perspective is baked into assets.
const MATERIALS=Object.freeze({
  floor:'./assets/room-box/floor.svg',
  ceiling:'./assets/room-box/ceiling.svg',
  back:'./assets/room-box/back.svg',
  left:'./assets/room-box/left.svg',
  right:'./assets/room-box/right.svg'
});
const TEX_UV=Object.freeze({
  // uv.v=1 means the top of a source image after WebGL UNPACK_FLIP_Y.
  floor:[[0,0],[0,1],[1,1],[1,0]],
  ceiling:[[0,0],[1,0],[1,1],[0,1]],
  back:[[0,0],[1,0],[1,1],[0,1]],
  left:[[0,0],[0,1],[1,1],[1,0]],
  right:[[0,0],[1,0],[1,1],[0,1]]
});
const FACES=Object.freeze([
  {id:'back',label:'后墙',vertices:[[-4.8,0,8],[4.8,0,8],[4.8,3.2,8],[-4.8,3.2,8]],center:[0,2.2,8]},
  {id:'floor',label:'地板',vertices:[[-4.8,0,0],[-4.8,0,8],[4.8,0,8],[4.8,0,0]],center:[0,0,4]},
  {id:'ceiling',label:'天花板',vertices:[[-4.8,3.2,0],[4.8,3.2,0],[4.8,3.2,8],[-4.8,3.2,8]],center:[0,3.2,7.3]},
  {id:'left',label:'左墙',vertices:[[-4.8,0,0],[-4.8,3.2,0],[-4.8,3.2,8],[-4.8,0,8]],center:[-4.8,1.45,6.5]},
  {id:'right',label:'右墙',vertices:[[4.8,0,0],[4.8,0,8],[4.8,3.2,8],[4.8,3.2,0]],center:[4.8,1.45,6.5]}
]);
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
// Cinematic bounded dolly with a soft pointer dead zone and an anchored
// composition target. This is an actual camera transform, NOT per-layer
// parallax. The nearby L2D person and distant wall naturally diverge
// because project() and the WebGL vertex shader share this camera.
// First-person head look (Cinemachine-style Pan/Tilt): the camera pivot is
// fixed in world space; ONLY orientation changes, never X/Y/Z position.
// The bounds are deliberately small for an intimate visual novel room.
const CAMERA_RIG=Object.freeze({
  yawLimitDeg:7, pitchLimitDeg:3.8, deadzone:.08
});
const smoothstep=t=>t*t*(3-2*t);
function pointerAxis(value,deadzone=CAMERA_RIG.deadzone){
  const v=clamp(Number(value)||0,-1,1);
  const size=Math.abs(v);
  if(size<=deadzone)return 0;
  const t=clamp((size-deadzone)/(1-deadzone),0,1);
  return Math.sign(v)*smoothstep(t);
}
function camera(inputX=0,inputY=0,strength=1){
  // Pointer values are SCREEN coordinates: right positive, DOWN positive.
  // Our camera convention is yaw positive = look right, pitch positive = up.
  // Never use look-at compensation, dolly, pan, roll or per-layer offsets.
  const sx=pointerAxis(inputX),sy=pointerAxis(inputY);
  const intensity=clamp(Number(strength)||0,0,1.5);
  const yaw=sx*CAMERA_RIG.yawLimitDeg*Math.PI/180*intensity;
  const pitch=-sy*CAMERA_RIG.pitchLimitDeg*Math.PI/180*intensity;
  return {x:BASE_CAMERA.x,y:BASE_CAMERA.y,z:BASE_CAMERA.z,
    yaw,pitch,hFov:BASE_CAMERA.hFov};
}
// Reference CPU projector matches the WebGL vertex shader exactly.
function project(point,cam,width,height){
  const [px,py,pz]=point;
  const dx=px-cam.x,dy=py-cam.y,dz=pz-cam.z;
  const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw);
  const cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
  const xx=cy*dx-sy*dz;
  const z0=sy*dx+cy*dz;
  const yy=cp*dy-sp*z0;
  const depth=sp*dy+cp*z0;
  if(depth<=.03)return null;
  const focal=width/(2*Math.tan(cam.hFov*Math.PI/360));
  return {x:width/2+focal*xx/depth,
    y:height/2-focal*yy/depth,depth,focal};
}
function actorGeometry(id,cam,width,height,metrics,worldActor=null){
  const a=worldActor||CHARACTERS[id];if(!a)return null;
  const shoe=project([a.x,0,a.z],cam,width,height);
  const head=project([a.x,a.height,a.z],cam,width,height);
  if(!shoe||!head)return null;
  const src=metrics||{};
  const sY=clamp(Number.isFinite(src.soleY)?src.soleY:a.soleY,.6,1);
  const sX=clamp(Number.isFinite(src.soleX)?src.soleX:a.soleX,0,1);
  const vis=clamp(Number.isFinite(src.visibleFraction)?src.visibleFraction:a.visible,.5,1);
  const drawnHeight=Math.max(1,shoe.y-head.y);
  const canvasSize=drawnHeight/vis;
  return {id,shoe,head,drawnHeight,canvasSize,soleX:sX,soleY:sY,
    localLeft:shoe.x-canvasSize*sX,
    localTop:shoe.y-canvasSize*sY,depth:shoe.depth};
}
function hexColor(hex,opacity=1){
  const n=parseInt(hex.slice(1),16);
  return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255,opacity];
}
function meshVertex(out,pt,color){out.push(pt[0],pt[1],pt[2],...color)}
function buildMesh(actors=CHARACTERS){
  const solids=[],edges=[],shadows=[],guides=[],textured={},solidFaces={},edgeFaces={};
  const edgeColor=hexColor('#344251',.8);
  for(const face of FACES){
    const c=hexColor(COLORS[face.id]);
    const v=face.vertices;
    const uv=TEX_UV[face.id];
    const triangleOrder=[0,1,2,0,2,3];
    for(const i of triangleOrder)meshVertex(solids,v[i],c);
    textured[face.id]=new Float32Array(triangleOrder.flatMap(i=>
      [...v[i],...uv[i]]));
    solidFaces[face.id]=new Float32Array(triangleOrder.flatMap(i=>
      [...v[i],...c]));
    const faceEdges=[];
    for(let i=0;i<4;i++){
      meshVertex(edges,v[i],edgeColor);
      meshVertex(edges,v[(i+1)%4],edgeColor);
      meshVertex(faceEdges,v[i],edgeColor);
      meshVertex(faceEdges,v[(i+1)%4],edgeColor);
    }
    edgeFaces[face.id]=new Float32Array(faceEdges);
  }
  // Ground inspector guides exist as TRUE 3D line geometry at Y=0.016.
  // They are drawn only when explicitly toggled in DEV.
  const guideColor=hexColor('#d1e8dd',.58);
  const axisColor=hexColor('#f2cc82',.8);
  for(let x=-4;x<=4;x+=1){
    const color=x===0?axisColor:guideColor;
    meshVertex(guides,[x,.016,0],color);
    meshVertex(guides,[x,.016,8],color);
  }
  for(let z=0;z<=8;z+=1){
    const color=z===0?axisColor:guideColor;
    meshVertex(guides,[-4.8,.016,z],color);
    meshVertex(guides,[4.8,.016,z],color);
  }
  for(const id of Object.keys(actors)){
    const a=actors[id],center=[a.x,.009,a.z];
    const tone=hexColor('#26313b',.58);
    for(let i=0;i<32;i++){
      const t=i*Math.PI*2/32,u=(i+1)*Math.PI*2/32;
      meshVertex(shadows,center,tone);
      meshVertex(shadows,[a.x+.25*Math.cos(t),.009,
        a.z+.15*Math.sin(t)],tone);
      meshVertex(shadows,[a.x+.25*Math.cos(u),.009,
        a.z+.15*Math.sin(u)],tone);
    }
  }
  return {solids:new Float32Array(solids),edges:new Float32Array(edges),
    shadows:new Float32Array(shadows),guides:new Float32Array(guides),
    textured,solidFaces,edgeFaces,faceCount:5};
}
const VS=[
'attribute vec3 a_position;',
'attribute vec4 a_color;',
'uniform vec3 u_camera;',
'uniform vec2 u_angles;',
'uniform vec2 u_tanHalf;',
'varying vec4 v_color;',
'void main(){',
'vec3 d=a_position-u_camera;',
'float cy=cos(u_angles.x),sy=sin(u_angles.x);',
'float cp=cos(u_angles.y),sp=sin(u_angles.y);',
'float x=cy*d.x-sy*d.z;',
'float z0=sy*d.x+cy*d.z;',
'float y=cp*d.y-sp*z0;',
'float depth=sp*d.y+cp*z0;',
'float n=0.08,f=30.0;',
'float clipZ=(f+n)/(f-n)*depth-(2.0*f*n)/(f-n);',
'gl_Position=vec4(x/u_tanHalf.x,y/u_tanHalf.y,clipZ,depth);',
'v_color=a_color;',
'}'
].join('\n');
const FS=[
'precision mediump float;',
'varying vec4 v_color;',
'void main(){gl_FragColor=v_color;}'
].join('\n');
// Same exact camera as the colored mesh; the GPU interpolates UV across
// the five actual 3D planes with perspective-correct interpolation.
const TEXTURE_VS=[
'attribute vec3 a_position;',
'attribute vec2 a_uv;',
'uniform vec3 u_camera;',
'uniform vec2 u_angles;',
'uniform vec2 u_tanHalf;',
'varying vec2 v_uv;',
'void main(){',
'vec3 d=a_position-u_camera;',
'float cy=cos(u_angles.x),sy=sin(u_angles.x);',
'float cp=cos(u_angles.y),sp=sin(u_angles.y);',
'float x=cy*d.x-sy*d.z;',
'float z0=sy*d.x+cy*d.z;',
'float y=cp*d.y-sp*z0;',
'float depth=sp*d.y+cp*z0;',
'float n=0.08,f=30.0;',
'float clipZ=(f+n)/(f-n)*depth-(2.0*f*n)/(f-n);',
'gl_Position=vec4(x/u_tanHalf.x,y/u_tanHalf.y,clipZ,depth);',
'v_uv=a_uv;',
'}'
].join('\n');
const TEXTURE_FS=[
'precision mediump float;',
'varying vec2 v_uv;',
'uniform sampler2D u_tex;',
'uniform float u_selected;',
'void main(){',
'vec4 color=texture2D(u_tex,v_uv);',
'gl_FragColor=vec4(mix(color.rgb,vec3(1.0,.83,.50),u_selected*.25),color.a);',
'}'
].join('\n');

function create({stage,view,playerRoot,enemyRoot}={}){
  if(!stage||!view||!playerRoot||!enemyRoot)
    throw Error('Classroom box must be mounted inside the actual game');
  const original=stage.querySelector('#source');
  if(!original)throw Error('Classroom box requires existing scene source');
  const surface=document.createElement('canvas');
  surface.id='classroom-box-surface';
  surface.setAttribute('aria-label','WebGL 三维教室：五面真实平面加 L2D 人物');
  surface.setAttribute('aria-hidden','true');
  surface.hidden=true;
  original.insertAdjacentElement('afterend',surface);
  let gl=null,program=null,buffers=null,positions=null,ctx=null,renderer='uninitialized';
  let cameraLoc=null,anglesLoc=null,tanLoc=null,enabled=false,lastKey='',lastState=null,frames=0;
  let texturedProgram=null,texturedLocations=null,materialBuffers=null,textureResources=null;
  let debugMode=false,debugCamera=null,selectedFace=null,
    selectedReference=null,guidesVisible=false;
  let pointerStrength=1;
  const pointerKey='paperchalk-classroom-camera-range-v1';
  try{
    const stored=Number(localStorage.getItem(pointerKey));
    if(localStorage.getItem(pointerKey)!==null&&Number.isFinite(stored))
      pointerStrength=clamp(stored,0,1.5);
  }catch(_){}
  const visibleFaces=Object.fromEntries(FACES.map(face=>[face.id,true]));
  const materialStatus=Object.fromEntries(Object.keys(MATERIALS).map(id=>[id,'not-loaded']));
  const actorWorld=Object.fromEntries(Object.entries(CHARACTERS).map(([id,a])=>[id,{...a}]));
  let geometry=buildMesh(actorWorld);
  // Versioned so prior two-character experimental positions cannot overwrite this composition.
  const savedActorKey='paperchalk-classroom-3d-actor-world-v2';
  try{
    const stored=JSON.parse(localStorage.getItem(savedActorKey)||'null');
    if(stored&&typeof stored==='object'){
      for(const id of Object.keys(actorWorld)){
        const a=stored[id];if(!a)continue;
        for(const [key,lo,hi] of [['x',-4.5,4.5],['z',.1,7.8],['height',1.2,1.95]]){
          const n=Number(a[key]);
          if(Number.isFinite(n))actorWorld[id][key]=clamp(n,lo,hi);
        }
      }
      geometry=buildMesh(actorWorld);
    }
  }catch(_){/* Corrupted local saves must not block the room. */}
  const labels=document.createElement('div');
  labels.id='classroom-box-labels';
  labels.setAttribute('aria-hidden','true');
  labels.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:1;';
  for(const face of FACES){
    const el=document.createElement('span');
    el.dataset.face=face.id;
    el.textContent=face.label;
    el.style.cssText='position:absolute;transform:translate(-50%,-50%);'+
      'padding:4px 9px;background:#182a3dc4;color:#edf6fa;border-radius:2px;'+
      'font:600 clamp(10px,1.1vw,14px) system-ui,"Microsoft YaHei",sans-serif;';
    labels.appendChild(el);
  }
  surface.insertAdjacentElement('afterend',labels);
  labels.hidden=true;
  // Editor-only reference planes are computed from SAME world coordinates
  // and camera projector as the GPU mesh. These do not replace the real fog.
  const references=document.createElement('canvas');
  references.id='classroom-box-reference-planes';
  references.setAttribute('aria-label','DEV 3D 黑雾、玩家及敌人参考平面');
  references.setAttribute('aria-hidden','true');
  references.style.cssText='position:absolute;inset:0;width:100%;height:100%;'+
    'pointer-events:none;z-index:2;';
  references.hidden=true;
  surface.insertAdjacentElement('afterend',references);
  const refCtx=references.getContext('2d',{alpha:true});
  function compile(type,code){
    const shader=gl.createShader(type);
    if(!shader)throw Error('WebGL shader creation failed');
    gl.shaderSource(shader,code);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))
      throw Error('WebGL shader compile: '+gl.getShaderInfoLog(shader));
    return shader;
  }
  function setup(){
    if(program||ctx)return;
    gl=surface.getContext('webgl',{
      alpha:false,antialias:true,depth:true,stencil:false,
      preserveDrawingBuffer:false,powerPreference:'low-power'
    });
    if(!gl){
      // Unsupported GPU: still show real geometric surfaces via CPU pinhole
      // projection, never an old baked-perspective background image.
      ctx=surface.getContext('2d',{alpha:false});
      if(!ctx)throw Error('No canvas renderer available');
      renderer='cpu-perspective-fallback';return;
    }
    const vs=compile(gl.VERTEX_SHADER,VS),fs=compile(gl.FRAGMENT_SHADER,FS);
    program=gl.createProgram();
    if(!program)throw Error('WebGL program failed');
    gl.attachShader(program,vs);gl.attachShader(program,fs);
    gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))
      throw Error('WebGL link: '+gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const p=gl.getAttribLocation(program,'a_position');
    const c=gl.getAttribLocation(program,'a_color');
    if(p<0||c<0)throw Error('WebGL geometry attributes missing');
    cameraLoc=gl.getUniformLocation(program,'u_camera');
    anglesLoc=gl.getUniformLocation(program,'u_angles');
    tanLoc=gl.getUniformLocation(program,'u_tanHalf');
    buffers={};
    const meshArrays={
      solids:geometry.solids,edges:geometry.edges,
      shadows:geometry.shadows,guides:geometry.guides
    };
    for(const face of FACES){
      meshArrays['solid-'+face.id]=geometry.solidFaces[face.id];
      meshArrays['edge-'+face.id]=geometry.edgeFaces[face.id];
    }
    for(const [key,arr] of Object.entries(meshArrays)){
      const buffer=gl.createBuffer();
      if(!buffer)throw Error('GPU vertex buffer failed');
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);
      buffers[key]={buffer,count:arr.length/7};
    }
    positions={p,c};
    const tv=compile(gl.VERTEX_SHADER,TEXTURE_VS);
    const tf=compile(gl.FRAGMENT_SHADER,TEXTURE_FS);
    texturedProgram=gl.createProgram();
    if(!texturedProgram)throw Error('3D surface material shader unavailable');
    gl.attachShader(texturedProgram,tv);gl.attachShader(texturedProgram,tf);
    gl.linkProgram(texturedProgram);gl.deleteShader(tv);gl.deleteShader(tf);
    if(!gl.getProgramParameter(texturedProgram,gl.LINK_STATUS))
      throw Error('Material shader link: '+gl.getProgramInfoLog(texturedProgram));
    texturedLocations={
      position:gl.getAttribLocation(texturedProgram,'a_position'),
      uv:gl.getAttribLocation(texturedProgram,'a_uv'),
      camera:gl.getUniformLocation(texturedProgram,'u_camera'),
      angles:gl.getUniformLocation(texturedProgram,'u_angles'),
      tan:gl.getUniformLocation(texturedProgram,'u_tanHalf'),
      image:gl.getUniformLocation(texturedProgram,'u_tex'),
      selected:gl.getUniformLocation(texturedProgram,'u_selected')
    };
    if(texturedLocations.position<0||texturedLocations.uv<0)
      throw Error('3D material UV attributes unavailable');
    materialBuffers={};
    for(const [id,arr] of Object.entries(geometry.textured)){
      const buffer=gl.createBuffer();
      if(!buffer)throw Error('Surface UV buffer unavailable: '+id);
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);
      materialBuffers[id]={buffer,count:arr.length/5};
    }
    // Separate image/texture for each physical face. Keep the solid face
    // under it as an explicit fallback if an asset is missing.
    textureResources={};
    const generation=textureResources;
    for(const [id,url] of Object.entries(MATERIALS)){
      const texture=gl.createTexture();
      if(!texture)throw Error('Material texture creation failed: '+id);
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      textureResources[id]={texture,url,ready:false};
      materialStatus[id]='loading';
      const img=new Image();
      img.onload=()=>{
        if(textureResources!==generation)return;
        try{
          gl.bindTexture(gl.TEXTURE_2D,texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,
            gl.UNSIGNED_BYTE,img);
          if(gl.getError()!==gl.NO_ERROR)throw Error('GPU upload failed');
          generation[id].ready=true;materialStatus[id]='ready';
        }catch(error){
          materialStatus[id]='error';
          console.warn('3D material '+id+' unavailable',error);
        }
        lastKey=''; // repaint on the next normal game frame
      };
      img.onerror=()=>{
        if(textureResources!==generation)return;
        materialStatus[id]='error';
        console.warn('3D material failed to load:',id,url);
        lastKey='';
      };
      img.src=url;
    }
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(.08,.12,.17,1);
    surface.addEventListener('webglcontextlost',event=>{
      event.preventDefault();program=null;buffers=null;
      texturedProgram=null;materialBuffers=null;textureResources=null;
      renderer='context-lost';
    });
    surface.addEventListener('webglcontextrestored',()=>{
      program=null;buffers=null;texturedProgram=null;
      materialBuffers=null;textureResources=null;gl=null;lastKey='';
      if(enabled)render();
    });
    renderer='webgl-3d-mesh';
  }
  function drawGPU(cam,w,h,pixelW,pixelH){
    gl.viewport(0,0,pixelW,pixelH);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform3f(cameraLoc,cam.x,cam.y,cam.z);
    gl.uniform2f(anglesLoc,cam.yaw,cam.pitch);
    const tanX=Math.tan(cam.hFov*Math.PI/360);
    gl.uniform2f(tanLoc,tanX,tanX/(w/h));
    const draw=(name,mode,depthWrite)=>{
      const b=buffers[name];
      gl.depthMask(depthWrite);
      gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);
      gl.enableVertexAttribArray(positions.p);
      gl.enableVertexAttribArray(positions.c);
      gl.vertexAttribPointer(positions.p,3,gl.FLOAT,false,28,0);
      gl.vertexAttribPointer(positions.c,4,gl.FLOAT,false,28,12);
      gl.drawArrays(mode,0,b.count);
    };
    for(const face of FACES){
      if(visibleFaces[face.id])draw('solid-'+face.id,gl.TRIANGLES,true);
    }
    // The five independently authored orthographic assets are attached to
    // five different world-space surfaces, not composited as one wallpaper.
    gl.disableVertexAttribArray(positions.p);
    gl.disableVertexAttribArray(positions.c);
    gl.useProgram(texturedProgram);
    const m=texturedLocations;
    gl.uniform3f(m.camera,cam.x,cam.y,cam.z);
    gl.uniform2f(m.angles,cam.yaw,cam.pitch);
    gl.uniform2f(m.tan,tanX,tanX/(w/h));
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(m.image,0);
    gl.depthMask(true);
    for(const face of FACES){
      const resource=textureResources?.[face.id];
      if(!visibleFaces[face.id]||!resource?.ready)continue;
      gl.uniform1f(m.selected,debugMode&&selectedFace===face.id?1:0);
      const gpu=materialBuffers[face.id];
      gl.bindTexture(gl.TEXTURE_2D,resource.texture);
      gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);
      gl.enableVertexAttribArray(m.position);
      gl.enableVertexAttribArray(m.uv);
      gl.vertexAttribPointer(m.position,3,gl.FLOAT,false,20,0);
      gl.vertexAttribPointer(m.uv,2,gl.FLOAT,false,20,12);
      gl.drawArrays(gl.TRIANGLES,0,gpu.count);
    }
    gl.disableVertexAttribArray(m.position);
    gl.disableVertexAttribArray(m.uv);
    gl.useProgram(program);
    for(const face of FACES){
      if(visibleFaces[face.id])draw('edge-'+face.id,gl.LINES,false);
    }
    if(debugMode&&guidesVisible&&visibleFaces.floor)
      draw('guides',gl.LINES,false);
    if(!debugMode)draw('shadows',gl.TRIANGLES,false);
    gl.depthMask(true);
    if(gl.getError()!==gl.NO_ERROR)throw Error('WebGL mesh draw failed');
  }
  function drawCPU(cam,w,h){
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#172430';ctx.fillRect(0,0,w,h);
    for(const face of FACES){
      if(!visibleFaces[face.id])continue;
      const v=face.vertices.map(point=>project(point,cam,w,h));
      if(v.some(x=>!x))continue;
      ctx.beginPath();ctx.moveTo(v[0].x,v[0].y);
      for(let i=1;i<v.length;i++)ctx.lineTo(v[i].x,v[i].y);
      ctx.closePath();ctx.fillStyle=COLORS[face.id];ctx.fill();
      if(debugMode&&selectedFace===face.id){
        ctx.fillStyle='#ffe1a347';ctx.fill();
      }
      ctx.strokeStyle='#344251';ctx.lineWidth=1;ctx.stroke();
    }
    if(debugMode&&guidesVisible&&visibleFaces.floor){
      ctx.lineWidth=1;ctx.strokeStyle='#d1e8ddaa';
      const lines=[];
      for(let x=-4;x<=4;x++)lines.push([[x,.016,0],[x,.016,8]]);
      for(let z=0;z<=8;z++)lines.push([[-4.8,.016,z],[4.8,.016,z]]);
      for(const line of lines){
        const a=project(line[0],cam,w,h),b=project(line[1],cam,w,h);
        if(!a||!b)continue;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
    }
    if(!debugMode)for(const a of Object.values(actorWorld)){
      const ring=[];
      for(let i=0;i<32;i++){
        const t=i*2*Math.PI/32;
        ring.push(project([a.x+.25*Math.cos(t),.009,
          a.z+.15*Math.sin(t)],cam,w,h));
      }
      if(ring.some(x=>!x))continue;
      ctx.beginPath();ctx.moveTo(ring[0].x,ring[0].y);
      ring.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
      ctx.closePath();ctx.fillStyle='#26313b9c';ctx.fill();
    }
  }
  function drawReferences(cam,w,h){
    if(!refCtx||!debugMode||!selectedReference){references.hidden=true;return}
    const dpi=Math.min(1.5,window.devicePixelRatio||1);
    const rw=Math.round(w*dpi),rh=Math.round(h*dpi);
    if(references.width!==rw)references.width=rw;
    if(references.height!==rh)references.height=rh;
    refCtx.setTransform(rw/w,0,0,rh/h,0,0);
    refCtx.clearRect(0,0,w,h);
    let verts,color,description;
    if(selectedReference==='fog'){
      // The fog is a fixed viewport-space fluid layer. This is a 3D
      // calibration plane for its virtual separation, NOT a new fog layer.
      verts=[[-3.8,0,1.75],[3.8,0,1.75],
        [3.8,3.2,1.75],[-3.8,3.2,1.75]];
      color='#9cc5d9';description='雾层参考 · 游戏黑雾仍为屏幕特效';
    }else{
      const actor=actorWorld[selectedReference];
      if(!actor){references.hidden=true;return}
      verts=[[actor.x-.43,0,actor.z],[actor.x+.43,0,actor.z],
        [actor.x+.43,actor.height,actor.z],
        [actor.x-.43,actor.height,actor.z]];
      color=selectedReference==='player'?'#edc5a1':'#bde2c1';
      description=selectedReference==='player'?'玩家 L2D 参考平面':
        selectedReference+' L2D 参考平面';
    }
    const p=verts.map(v=>project(v,cam,w,h));
    if(p.some(q=>!q)){references.hidden=true;return}
    references.hidden=false;
    refCtx.beginPath();refCtx.moveTo(p[0].x,p[0].y);
    for(let i=1;i<4;i++)refCtx.lineTo(p[i].x,p[i].y);
    refCtx.closePath();refCtx.fillStyle=color+'20';refCtx.fill();
    refCtx.strokeStyle=color;refCtx.lineWidth=1.8;
    refCtx.setLineDash([7,4]);refCtx.stroke();refCtx.setLineDash([]);
    refCtx.beginPath();refCtx.moveTo(p[0].x,p[0].y);
    refCtx.lineTo(p[2].x,p[2].y);refCtx.moveTo(p[1].x,p[1].y);
    refCtx.lineTo(p[3].x,p[3].y);refCtx.globalAlpha=.45;
    refCtx.stroke();refCtx.globalAlpha=1;
    const cx=p.reduce((sum,v)=>sum+v.x,0)/4;
    const cy=Math.max(15,Math.min(h-15,p[0].y-18));
    refCtx.font='12px system-ui,sans-serif';refCtx.textAlign='center';
    const tw=refCtx.measureText(description).width+18;
    refCtx.fillStyle='#142734d9';refCtx.fillRect(cx-tw/2,cy-12,tw,23);
    refCtx.fillStyle='#e6f1f5';refCtx.fillText(description,cx,cy+4);
  }
  function setVar(id,key,value){
    const prop='--room-'+id+'-'+key;
    if(view.style.getPropertyValue(prop)!==value)view.style.setProperty(prop,value);
  }
  function metrics(){
    const prior=window.PaperWorldL2DGround?.state?.();
    return Object.fromEntries(Object.keys(actorWorld).map(id=>
      [id,prior?.actors?.find(a=>a.id===id)||null]));
  }
  function applyActor(id,geometry,offsetX,offsetY){
    if(!geometry)return;
    const fix=v=>v.toFixed(3)+'px';
    setVar(id,'size',fix(geometry.canvasSize));
    setVar(id,'left',fix(offsetX+geometry.localLeft));
    setVar(id,'top',fix(offsetY+geometry.localTop));
  }
  function updateLabels(cam,w,h){
    if(labels.hidden)return;
    for(const face of FACES){
      const el=labels.querySelector('[data-face="'+face.id+'"]');
      const p=project(face.center,cam,w,h);
      if(!p||p.x<24||p.x>w-24||p.y<20||p.y>h-20){
        el.hidden=true;continue;
      }
      el.hidden=false;el.style.left=p.x.toFixed(2)+'px';el.style.top=p.y.toFixed(2)+'px';
    }
  }
  function render(inputX=0,inputY=0){
    if(!enabled)return false;
    const w=stage.clientWidth,h=stage.clientHeight;
    if(w<1||h<1)return false;
    const cam=debugMode&&debugCamera?debugCamera:
      camera(inputX,inputY,pointerStrength);
    const info=metrics();
    const player=actorGeometry('player',cam,w,h,info.player,actorWorld.player);
    const enemy=actorGeometry('enemy',cam,w,h,info.enemy,actorWorld.enemy);
    const enemy2=actorGeometry('enemy2',cam,w,h,info.enemy2,actorWorld.enemy2);
    const enemy3=actorGeometry('enemy3',cam,w,h,info.enemy3,actorWorld.enemy3);
    const left=(view.clientWidth-w)/2,top=(view.clientHeight-h)/2;
    applyActor('player',player,left,top);
    applyActor('enemy',enemy,left,top);
    applyActor('enemy2',enemy2,left,top);
    applyActor('enemy3',enemy3,left,top);
    const pixelRatio=Math.min(1.5,window.devicePixelRatio||1,
      Math.sqrt(2000000/(w*h)));
    const bw=Math.max(1,Math.round(w*pixelRatio));
    const bh=Math.max(1,Math.round(h*pixelRatio));
    const key=[w,h,cam.x,cam.y,cam.yaw,cam.pitch,bw,bh].map(x=>x.toFixed(5)).join(',');
    if(key!==lastKey){
      try{
        setup();
        if(surface.width!==bw)surface.width=bw;
        if(surface.height!==bh)surface.height=bh;
        if(gl&&program)drawGPU(cam,w,h,bw,bh);
        else{
          ctx.setTransform(bw/w,0,0,bh/h,0,0);
          drawCPU(cam,w,h);
        }
        updateLabels(cam,w,h);
        frames++;
        lastKey=key;
      }catch(error){
        renderer='webgl-error';
        console.error('Room box renderer:',error);
        // Never break the surrounding game fog, L2D or UI loops.
        return false;
      }
    }
    drawReferences(cam,w,h);
    lastState={active:true,faceCount:5,room:ROOM,camera:cam,player,enemy,enemy2,enemy3,
      renderer,meshFaceCount:5,vertexCount:geometry.solids.length/7,
      materialSources:MATERIALS,materials:{...materialStatus},
      loadedMaterialCount:Object.values(materialStatus).filter(v=>v==='ready').length,
      debugMode,visibleFaces:{...visibleFaces},selectedFace,
      selectedReference,guidesVisible,
      worldActors:Object.fromEntries(Object.entries(actorWorld).map(([id,a])=>[id,{...a}])),
      pointerStrength,cameraRig:CAMERA_RIG,
      projection:'physical-perspective-camera',frames,
      floorY:0,actorRendering:'real-game-l2d',canvasSize:{w:bw,h:bh}};
    return true;
  }
  function setDevMode(active,settings){
    debugMode=!!active;
    if(!debugMode){
      debugCamera=null;selectedFace=null;
      selectedReference=null;guidesVisible=false;references.hidden=true;
      for(const face of FACES)visibleFaces[face.id]=true;
    }else if(settings){
      debugCamera={...BASE_CAMERA,...settings};
    }
    lastKey='';if(enabled)render();
  }
  function setDevCamera(settings){
    if(!debugMode)return false;
    debugCamera={...BASE_CAMERA,...settings};lastKey='';
    if(enabled)render();
    return true;
  }
  function setActorWorld(id,updates){
    if(!debugMode||!actorWorld[id]||!updates)return false;
    const actor=actorWorld[id];
    for(const [key,lo,hi] of [['x',-4.5,4.5],['z',.1,7.8],['height',1.2,1.95]]){
      if(!Object.hasOwn(updates,key))continue;
      const n=Number(updates[key]);
      if(Number.isFinite(n))actor[key]=clamp(n,lo,hi);
    }
    geometry=buildMesh(actorWorld);
    if(gl&&buffers?.shadows){
      gl.bindBuffer(gl.ARRAY_BUFFER,buffers.shadows.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,geometry.shadows,gl.STATIC_DRAW);
      buffers.shadows.count=geometry.shadows.length/7;
    }
    lastKey='';if(enabled)render();
    return true;
  }
  function saveActorWorld(){
    try{localStorage.setItem(savedActorKey,JSON.stringify(actorWorld));return true}
    catch(_){return false}
  }
  function resetActorWorld(){
    for(const id of Object.keys(actorWorld))Object.assign(actorWorld[id],CHARACTERS[id]);
    geometry=buildMesh(actorWorld);
    if(gl&&buffers?.shadows){
      gl.bindBuffer(gl.ARRAY_BUFFER,buffers.shadows.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,geometry.shadows,gl.STATIC_DRAW);
      buffers.shadows.count=geometry.shadows.length/7;
    }
    try{localStorage.removeItem(savedActorKey)}catch(_){}
    lastKey='';if(enabled)render();
    return true;
  }
  function setPointerStrength(value){
    const next=clamp(Number(value)||0,0,1.5);
    pointerStrength=next;lastKey='';
    try{localStorage.setItem(pointerKey,String(pointerStrength))}catch(_){}
    return pointerStrength;
  }
  function setReferenceLayer(id){
    if(id!==null&&id!=='fog'&&!Object.hasOwn(actorWorld,id))return false;
    selectedReference=id;references.hidden=!debugMode||!id;lastKey='';
    if(enabled)render();
    return true;
  }
  function setGuidesVisible(value){
    guidesVisible=!!value;lastKey='';
    if(enabled)render();
    return true;
  }
  function setFaceVisible(id,visible){
    if(!Object.hasOwn(visibleFaces,id))return false;
    visibleFaces[id]=!!visible;
    lastKey='';if(enabled)render();
    return true;
  }
  function selectFace(id){
    if(id!==null&&!Object.hasOwn(visibleFaces,id))return false;
    selectedFace=id;
    lastKey='';if(enabled)render();
    return true;
  }
  function setActive(state){
    enabled=!!state;surface.hidden=!enabled;
    references.hidden=!enabled||!debugMode||!selectedReference;
    // Material drawings provide the wall/floor geometry; labels only on
    // explicit debug request, not as floating wallpaper-like decorations.
    labels.hidden=!enabled||
      new URLSearchParams(window.location.search).get('roomlabels')!=='1';
    view.classList.toggle('room-blockout-active',enabled);
    if(!enabled){
      lastKey='';lastState=null;
      for(const id of Object.keys(actorWorld))for(const key of ['size','left','top'])
        view.style.removeProperty('--room-'+id+'-'+key);
    }else render(0,0);
  }
  return Object.freeze({setActive,setDevMode,setDevCamera,
    setFaceVisible,setGuidesVisible,setReferenceLayer,
    setPointerStrength,setActorWorld,saveActorWorld,
    resetActorWorld,selectFace,render,
    inspect:()=>lastState||{active:false,faceCount:5,room:ROOM},
    get canvas(){return surface}
  });
}
return Object.freeze({ROOM,BASE_CAMERA,CAMERA_RIG,CHARACTERS,COLORS,FACES,MATERIALS,
  camera,pointerAxis,project,actorGeometry,buildMesh,create});
});