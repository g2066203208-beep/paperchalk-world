/* In-game REAL WebGL 3D classroom, five world-space planes (not a picture).
 * The live L2D protagonist/NPC are billboards projected by precisely the same
 * pinhole camera used by the WebGL vertex shader. Mouse controls move the
 * camera through 3D space with small yaw/pitch and damping already performed
 * in the game's tick; meshes NEVER deform, scale, or rotate with the mouse.
 * Original game layers, saved character rigs, fog and UI are untouched.
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
  player:Object.freeze({x:-.9,y:0,z:1,height:1.62,soleX:.51,soleY:.978,visible:.945}),
  enemy:Object.freeze({x:1.3,y:0,z:2.4,height:1.55,soleX:.6,soleY:.987,visible:.95})
});
const COLORS=Object.freeze({
  ceiling:'#a8b1be',floor:'#bca17f',back:'#70899b',
  left:'#86a69e',right:'#b78e82'
});
const FACES=Object.freeze([
  {id:'back',label:'后墙',vertices:[[-4.8,0,8],[4.8,0,8],[4.8,3.2,8],[-4.8,3.2,8]],center:[0,2.2,8]},
  {id:'floor',label:'地板',vertices:[[-4.8,0,0],[-4.8,0,8],[4.8,0,8],[4.8,0,0]],center:[0,0,4]},
  {id:'ceiling',label:'天花板',vertices:[[-4.8,3.2,0],[4.8,3.2,0],[4.8,3.2,8],[-4.8,3.2,8]],center:[0,3.2,7.3]},
  {id:'left',label:'左墙',vertices:[[-4.8,0,0],[-4.8,3.2,0],[-4.8,3.2,8],[-4.8,0,8]],center:[-4.8,1.45,6.5]},
  {id:'right',label:'右墙',vertices:[[4.8,0,0],[4.8,0,8],[4.8,3.2,8],[4.8,3.2,0]],center:[4.8,1.45,6.5]}
]);
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const easing=x=>x*(.74+.26*x*x);
// Input is the game loop's already time-damped aim. Do not smooth twice.
function camera(inputX=0,inputY=0){
  const a=easing(clamp(Number(inputX)||0,-1,1));
  const b=easing(clamp(Number(inputY)||0,-1,1));
  return {x:BASE_CAMERA.x+a*.18,y:BASE_CAMERA.y-b*.065,z:BASE_CAMERA.z,
    yaw:a*.0125,pitch:-b*.009,hFov:BASE_CAMERA.hFov};
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
function actorGeometry(id,cam,width,height,metrics){
  const a=CHARACTERS[id];if(!a)return null;
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
function buildMesh(){
  const solids=[],edges=[],shadows=[];
  const edgeColor=hexColor('#344251',.8);
  for(const face of FACES){
    const c=hexColor(COLORS[face.id]);
    const v=face.vertices;
    for(const i of [0,1,2,0,2,3])meshVertex(solids,v[i],c);
    for(let i=0;i<4;i++){
      meshVertex(edges,v[i],edgeColor);
      meshVertex(edges,v[(i+1)%4],edgeColor);
    }
  }
  for(const id of ['player','enemy']){
    const a=CHARACTERS[id],center=[a.x,.009,a.z];
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
    shadows:new Float32Array(shadows),faceCount:5};
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
  const geometry=buildMesh();
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
    for(const [key,arr] of Object.entries(geometry).filter(([,v])=>v instanceof Float32Array)){
      const buffer=gl.createBuffer();
      if(!buffer)throw Error('GPU vertex buffer failed');
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);
      buffers[key]={buffer,count:arr.length/7};
    }
    positions={p,c};
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(.08,.12,.17,1);
    surface.addEventListener('webglcontextlost',event=>{
      event.preventDefault();program=null;buffers=null;renderer='context-lost';
    });
    surface.addEventListener('webglcontextrestored',()=>{
      program=null;buffers=null;gl=null;lastKey='';if(enabled)render();
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
    draw('solids',gl.TRIANGLES,true);
    draw('edges',gl.LINES,false);
    draw('shadows',gl.TRIANGLES,false);
    gl.depthMask(true);
    if(gl.getError()!==gl.NO_ERROR)throw Error('WebGL mesh draw failed');
  }
  function drawCPU(cam,w,h){
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#172430';ctx.fillRect(0,0,w,h);
    for(const face of FACES){
      const v=face.vertices.map(point=>project(point,cam,w,h));
      if(v.some(x=>!x))continue;
      ctx.beginPath();ctx.moveTo(v[0].x,v[0].y);
      for(let i=1;i<v.length;i++)ctx.lineTo(v[i].x,v[i].y);
      ctx.closePath();ctx.fillStyle=COLORS[face.id];ctx.fill();
      ctx.strokeStyle='#344251';ctx.lineWidth=1;ctx.stroke();
    }
    for(const a of Object.values(CHARACTERS)){
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
  function setVar(id,key,value){
    const prop='--room-'+id+'-'+key;
    if(view.style.getPropertyValue(prop)!==value)view.style.setProperty(prop,value);
  }
  function metrics(){
    const prior=window.PaperWorldL2DGround?.state?.();
    return Object.fromEntries(['player','enemy'].map(id=>
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
    const cam=camera(inputX,inputY);
    const info=metrics();
    const player=actorGeometry('player',cam,w,h,info.player);
    const enemy=actorGeometry('enemy',cam,w,h,info.enemy);
    const left=(view.clientWidth-w)/2,top=(view.clientHeight-h)/2;
    applyActor('player',player,left,top);
    applyActor('enemy',enemy,left,top);
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
    lastState={active:true,faceCount:5,room:ROOM,camera:cam,player,enemy,
      renderer,meshFaceCount:5,vertexCount:geometry.solids.length/7,
      projection:'physical-perspective-camera',frames,
      floorY:0,actorRendering:'real-game-l2d',canvasSize:{w:bw,h:bh}};
    return true;
  }
  function setActive(state){
    enabled=!!state;surface.hidden=!enabled;labels.hidden=!enabled;
    view.classList.toggle('room-blockout-active',enabled);
    if(!enabled){
      lastKey='';lastState=null;
      for(const id of ['player','enemy'])for(const key of ['size','left','top'])
        view.style.removeProperty('--room-'+id+'-'+key);
    }else render(0,0);
  }
  return Object.freeze({setActive,render,
    inspect:()=>lastState||{active:false,faceCount:5,room:ROOM},
    get canvas(){return surface}
  });
}
return Object.freeze({ROOM,BASE_CAMERA,CHARACTERS,COLORS,FACES,
  camera,project,actorGeometry,buildMesh,create});
});