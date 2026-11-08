/* Paperchalk World: real 3D heightfield under the existing dot-grid map.
 * Orthographic top-down and free orbit are two cameras on ONE XY/Z surface.
 * No photo backdrop, fake CSS tilt, additional fog, or duplicate map data.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperWorldDotTerrain3D=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const TAU=Math.PI*2;
 function create({map,viewport,camera,cell=40,width=2000,height=1280,enabled=true}){
  if(!enabled||!map||!map.ownerDocument)return null;
  const doc=map.ownerDocument;
  const surface=doc.createElement('canvas');
  surface.className='pw-dot-terrain-surface';
  surface.setAttribute('aria-hidden','true');
  const toggle=doc.createElement('button');
  toggle.className='pw-dot-camera-toggle';
  toggle.type='button';toggle.textContent='3D';
  toggle.setAttribute('aria-label','切换到三维自由视角');
  toggle.setAttribute('aria-pressed','false');
  toggle.title='平面 / 三维视角';
  map.prepend(surface);
  map.append(toggle);
  let gl=null;
  try{gl=surface.getContext('webgl',{alpha:true,antialias:true,depth:true,
    premultipliedAlpha:false,preserveDrawingBuffer:false});}catch(_){}
  if(!gl){surface.remove();toggle.remove();map.dataset.terrainRenderer='unavailable';return null}
  const vert='attribute vec3 a_position; uniform vec2 u_focus; uniform vec2 u_screen; uniform float u_scale; uniform float u_yaw; uniform float u_pitch; uniform float u_camDist; uniform float u_time; uniform float u_pointMode; varying float v_light; void main(){'+
   'vec2 p=(a_position.xy-u_focus)*u_scale;float sn=sin(u_yaw),cs=cos(u_yaw);'+
   'vec2 q=vec2(cs*p.x-sn*p.y,sn*p.x+cs*p.y);'+
   'float zz=a_position.z*u_scale;'+
   'float py=cos(u_pitch)*q.y-sin(u_pitch)*zz;'+
   'float depth=sin(u_pitch)*q.y+cos(u_pitch)*zz;'+
   'float factor=clamp(u_camDist/max(60.0,u_camDist-depth),0.1,7.0);'+
   'gl_Position=vec4(2.0*q.x*factor/u_screen.x,-2.0*py*factor/u_screen.y,clamp(-depth/u_camDist,-0.98,0.98),1.0);'+
   'float breath=0.006*sin(u_time*0.14+a_position.x*0.00625+a_position.y*0.0045);'+
   'gl_PointSize=clamp((2.92+breath)*pow(factor,0.64),1.25,6.5);'+
   'v_light=0.43+breath;'+
   '}';
  const frag='precision mediump float; uniform float u_pointMode; varying float v_light; void main(){'+
   'if(u_pointMode<0.5){gl_FragColor=vec4(0.0,0.0,0.0,1.0);return;}'+
   'vec2 v=gl_PointCoord*2.0-1.0; float d=dot(v,v);'+
   'if(d>1.0)discard;'+
   'float edge=1.0-smoothstep(0.52,1.0,d);'+
   'gl_FragColor=vec4(0.73,0.77,0.76,v_light*edge);'+
   '}';
  const makeShader=(type,source)=>{
   const s=gl.createShader(type);
   gl.shaderSource(s,source);gl.compileShader(s);
   if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
    const err=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(err);
   }return s;
  };
  let program,buffer,indexBuffer;
  try{
   program=gl.createProgram();
   const vs=makeShader(gl.VERTEX_SHADER,vert),fs=makeShader(gl.FRAGMENT_SHADER,frag);
   gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
   gl.deleteShader(vs);gl.deleteShader(fs);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   buffer=gl.createBuffer();indexBuffer=gl.createBuffer();
  }catch(error){
   surface.remove();toggle.remove();map.dataset.terrainRenderer='shader-error';
   console.warn('3D dot terrain unavailable:',error);
   return null;
  }
  const cols=Math.floor(width/cell),rows=Math.floor(height/cell);
  const count=(cols+1)*(rows+1);
  const coords=new Float32Array(count*3);
  const heights=new Float32Array(count);
  const indices=new Uint16Array(cols*rows*6);
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
   const i=y*(cols+1)+x;
   coords[i*3]=x*cell;coords[i*3+1]=y*cell;coords[i*3+2]=0;
  }
  for(let y=0,k=0;y<rows;y++)for(let x=0;x<cols;x++){
   const a=y*(cols+1)+x,b=a+1,c=a+(cols+1),d=c+1;
   indices[k++]=a;indices[k++]=b;indices[k++]=c;
   indices[k++]=b;indices[k++]=d;indices[k++]=c;
  }
  function upload(){
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,coords,gl.DYNAMIC_DRAW);
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
  }
  upload();
  let target=0,mix=0,yaw=0,pitch=.72,last=0,frames=0,active=true;
  map.dataset.cameraMode='2d';
  map.dataset.terrainRenderer='webgl-heightfield';
  map.dataset.terrainVertices=String(count);
  map.dataset.terrainTriangles=String(indices.length/3);
  map.dataset.terrainFaces='true';
  const uniforms={};
  gl.useProgram(program);
  for(const name of ['u_focus','u_screen','u_scale','u_yaw','u_pitch','u_camDist','u_time','u_pointMode'])
   uniforms[name]=gl.getUniformLocation(program,name);
  const aPosition=gl.getAttribLocation(program,'a_position');
  function updateToggle(){
   const enabled=target>0.5;
   map.dataset.cameraMode=enabled?'3d':'2d';
   toggle.textContent=enabled?'平面':'3D';
   toggle.setAttribute('aria-label',enabled?'返回平面地图':'切换到三维自由视角');
   toggle.setAttribute('aria-pressed',String(enabled));
   toggle.title=enabled?'返回正交俯视':'进入透视三维视角';
  }
  function setMode(next){
   target=next==='3d'?1:0;
   updateToggle();
  }
  function toggleMode(){setMode(target>0.5?'2d':'3d')}
  toggle.addEventListener('click',e=>{e.stopPropagation();toggleMode()});
  function orbitBy(dx,dy){
   if(target<0.5)return;
   yaw=(yaw+dx*.0048)%TAU;
   pitch=clamp(pitch-dy*.0038,.12,1.36);
  }
  function resetOrbit(){yaw=0;pitch=.72}
  const getHeight=(col,row)=>{
   if(!Number.isInteger(col)||!Number.isInteger(row)||col<0||col>cols||row<0||row>rows)return null;
   return heights[row*(cols+1)+col];
  };
  function setHeight(col,row,value){
   if(!Number.isInteger(col)||!Number.isInteger(row)||col<0||col>cols||row<0||row>rows||!Number.isFinite(value))return false;
   const i=row*(cols+1)+col;
   heights[i]=clamp(value,-800,800);
   coords[i*3+2]=heights[i];
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferSubData(gl.ARRAY_BUFFER,i*3*4,coords.subarray(i*3,i*3+3));
   return true;
  }
  function render(now){
   if(!active||!map.isConnected||doc.hidden)return;
   // The 3D grid is nearly motionless. A 30fps GPU cap saves substantial
   // fill-rate on software WebGL and phones without stepping the camera.
   if(last&&now-last<30)return;
   const dt=last?Math.min(.09,(now-last)*.001):.033;last=now;
   const ease=1-Math.exp(-dt*5.6);
   mix+=(target-mix)*ease;
   if(Math.abs(mix-target)<.0004)mix=target;
   map.dataset.cameraBlend=mix.toFixed(3);
   if(mix===0){
    surface.style.opacity='0';
    const flat=map.querySelector('.pw-dot-wave-surface');
    if(flat)flat.style.opacity='1';
    return;
   }
   const v=viewport(),c=camera();
   const w=Math.max(1,Math.round(v.w)),h=Math.max(1,Math.round(v.h));
   if(!Number.isFinite(c.scale)||c.scale<=0)return;
   const dpr=Math.min(doc.defaultView?.devicePixelRatio||1,1.35);
   const dw=Math.round(w*dpr),dh=Math.round(h*dpr);
   if(surface.width!==dw||surface.height!==dh){
    surface.width=dw;surface.height=dh;gl.viewport(0,0,dw,dh);
   }
   // The same on-map center and zoom in both modes: no map teleport.
   const focusX=(w*.5-c.x)/c.scale;
   const focusY=(h*.5-c.y)/c.scale;
   const eased=mix*mix*(3-2*mix);
   const effectiveYaw=yaw*eased;
   const effectivePitch=pitch*eased;
   const focal=Math.max(350,h*1.45);
   gl.clearColor(0,0,0,0);
   gl.clearDepth(1);
   gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.enable(gl.DEPTH_TEST);
   gl.depthFunc(gl.LEQUAL);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   gl.useProgram(program);
   gl.uniform2f(uniforms.u_focus,focusX,focusY);
   gl.uniform2f(uniforms.u_screen,w,h);
   gl.uniform1f(uniforms.u_scale,c.scale);
   gl.uniform1f(uniforms.u_yaw,effectiveYaw);
   gl.uniform1f(uniforms.u_pitch,effectivePitch);
   gl.uniform1f(uniforms.u_camDist,focal);
   gl.uniform1f(uniforms.u_time,now*.001);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.enableVertexAttribArray(aPosition);
   gl.vertexAttribPointer(aPosition,3,gl.FLOAT,false,0,0);
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
   gl.uniform1f(uniforms.u_pointMode,0);
   gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
   gl.uniform1f(uniforms.u_pointMode,1);
   gl.drawArrays(gl.POINTS,0,count);
   surface.style.opacity=String(eased);
   const flat=map.querySelector('.pw-dot-wave-surface');
   if(flat)flat.style.opacity=String(1-eased);
   map.dataset.terrainFrame=String(++frames);
   map.dataset.cameraPitch=effectivePitch.toFixed(3);
   map.dataset.cameraYaw=effectiveYaw.toFixed(3);
  }
  function inspect(){return Object.freeze({
   mode:target>.5?'3d':'2d',blend:mix,pitch,yaw,
   vertices:count,triangles:indices.length/3,cols,rows,
   heightsDefined:heights.some(h=>h!==0),
   renderer:map.dataset.terrainRenderer,frames
  })}
  const onContext=e=>{if(target>.5)e.preventDefault()};
  map.addEventListener('contextmenu',onContext);
  return Object.freeze({
   render,setMode,toggleMode,is3D:()=>target>.5,orbitBy,resetOrbit,
   getHeight,setHeight,inspect,
   dispose(){
    active=false;map.removeEventListener('contextmenu',onContext);
    toggle.remove();surface.remove();
    if(gl){gl.deleteBuffer(buffer);gl.deleteBuffer(indexBuffer);gl.deleteProgram(program)}
   }
  });
 }
 return Object.freeze({create});
});
