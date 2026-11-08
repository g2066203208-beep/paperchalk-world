/* Infinite terrain surface on the existing black dot world.
 * Orthographic and orbit perspectives share the same integer world grid.
 * Nearby tiles are real 3D triangular heightfield geometry; distant tiles
 * stream at lower density so no rectangular terrain boundary ever appears.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperWorldDotTerrain3D=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const CHUNK_CELLS=16,MAX_FAR_CHUNKS=200,MAX_NEAR_CHUNKS=100;
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
  const vert='attribute vec3 a_position; uniform vec2 u_focus; uniform vec2 u_screen; uniform float u_scale; uniform float u_yaw; uniform float u_pitch; uniform float u_camDist; uniform float u_time; uniform float u_pointMode; uniform float u_fadeStart; uniform float u_fadeEnd; varying float v_light; varying float v_fade; void main(){'+
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
   'float dist=length(p);'+
   'v_fade=1.0-smoothstep(u_fadeStart,u_fadeEnd,dist);'+
   '}';
  const frag='precision mediump float; uniform float u_pointMode; varying float v_light; varying float v_fade; void main(){'+
   'if(u_pointMode<0.5){gl_FragColor=vec4(0.0,0.0,0.0,1.0);return;}'+
   'if(u_pointMode>1.5){gl_FragColor=vec4(0.69,0.72,0.70,0.115*v_fade);return;}'+
   'vec2 v=gl_PointCoord*2.0-1.0; float d=dot(v,v);'+
   'if(d>1.0)discard;'+
   'float edge=1.0-smoothstep(0.52,1.0,d);'+
   'gl_FragColor=vec4(0.73,0.77,0.76,v_light*edge*v_fade);'+
   '}';
  const makeShader=(type,source)=>{
   const s=gl.createShader(type);
   gl.shaderSource(s,source);gl.compileShader(s);
   if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
    const err=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(err);
   }return s;
  };
  let program,buffer,indexBuffer,gridEdgeBuffer;
  try{
   program=gl.createProgram();
   const vs=makeShader(gl.VERTEX_SHADER,vert),fs=makeShader(gl.FRAGMENT_SHADER,frag);
   gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
   gl.deleteShader(vs);gl.deleteShader(fs);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   buffer=gl.createBuffer();indexBuffer=gl.createBuffer();
   gridEdgeBuffer=gl.createBuffer();
  }catch(error){
   surface.remove();toggle.remove();map.dataset.terrainRenderer='shader-error';
   console.warn('3D dot terrain unavailable:',error);
   return null;
  }

  // Tiles are anchored to integer grid coordinates, not screen positions.
  // Only the small visible region is in GPU memory at any moment; edits
  // outside that region remain in sparse world-space height storage.
  const authoredCols=Math.floor(width/cell),authoredRows=Math.floor(height/cell);
  const overrides=new Map();
  let count=0,triangleCount=0,coords=new Float32Array(0);
  let indices=new Uint16Array(0),gridEdges=new Uint16Array(0),lookup=new Map(),meshKey='';
  let originX=0,originY=0,nearTiles=0,farTiles=0,farCellStep=1;
  let fadeStart=5000,fadeEnd=9000;
  function keyFor(gx,gy){return gx+','+gy}
  function getHeight(col,row){
   if(!Number.isSafeInteger(col)||!Number.isSafeInteger(row))return null;
   return overrides.get(keyFor(col,row))||0;
  }
  function setHeight(col,row,value){
   if(!Number.isSafeInteger(col)||!Number.isSafeInteger(row)||
      !Number.isFinite(value))return false;
   const key=keyFor(col,row),z=clamp(value,-800,800);
   if(z===0)overrides.delete(key);else overrides.set(key,z);
   const index=lookup.get(key);
   if(index!==undefined){
    coords[index*3+2]=z;
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER,index*12+8,coords.subarray(index*3+2,index*3+3));
   }
   return true;
  }
  // Sparse terrain edits are independent of streaming chunks and survive
  // the disappearance/recreation of visible GPU buffers.
  function exportHeights(){
   return Array.from(overrides,([key,height])=>{
    const comma=key.indexOf(',');
    return [+key.slice(0,comma),+key.slice(comma+1),height];
   });
  }
  function importHeights(rows){
   if(!Array.isArray(rows))return false;
   overrides.clear();
   if(rows.length>500000)return false;
   for(const row of rows){
    if(!Array.isArray(row)||row.length!==3)continue;
    const [gx,gy,z]=row;
    if(!Number.isSafeInteger(gx)||!Number.isSafeInteger(gy)||!Number.isFinite(z))continue;
    const height=clamp(z,-800,800);
    if(height!==0)overrides.set(keyFor(gx,gy),height);
   }
   // Existing vertices are updated immediately, not after a camera movement.
   for(const [key,index] of lookup){
    const next=overrides.get(key)||0;
    coords[index*3+2]=next;
   }
   if(count){
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER,0,coords);
   }
   return true;
  }
  function sampleHeight(gx,gy){
   const ax=Math.floor(gx),ay=Math.floor(gy),tx=gx-ax,ty=gy-ay;
   const a=getHeight(ax,ay),b=getHeight(ax+1,ay);
   const d=getHeight(ax,ay+1),e=getHeight(ax+1,ay+1);
   return a*(1-tx)*(1-ty)+b*tx*(1-ty)+d*(1-tx)*ty+e*tx*ty;
  }
  // Project ground coordinates and invert their real 3D perspective. The
  // editing cursor uses the SAME projection as the renderer, not the old
  // 2D-only camera math or a fake skewed overlay.
  function project(wx,wy,height){
   const v=viewport(),c=camera(),w=v.w,h=v.h;
   const eased=mix*mix*(3-2*mix);
   const ya=yaw*eased,pt=pitch*eased,D=Math.max(350,h*1.45);
   const sn=Math.sin(ya),cs=Math.cos(ya);
   const px=(wx-(w*.5-c.x)/c.scale)*c.scale;
   const py=(wy-(h*.5-c.y)/c.scale)*c.scale;
   const qx=cs*px-sn*py,qy=sn*px+cs*py,zz=height*c.scale;
   const depth=Math.sin(pt)*qy+Math.cos(pt)*zz;
   const factor=clamp(D/Math.max(60,D-depth),.1,7);
   return {x:w*.5+qx*factor,y:h*.5+(Math.cos(pt)*qy-Math.sin(pt)*zz)*factor};
  }
  function unproject(screenX,screenY){
   const v=viewport(),c=camera(),D=Math.max(350,v.h*1.45);
   const eased=mix*mix*(3-2*mix);
   const ya=yaw*eased,pt=pitch*eased;
   const sp=Math.sin(pt),cp=Math.cos(pt),cr=Math.cos(ya),sr=Math.sin(ya);
   const sy=screenY-v.h*.5,sx=screenX-v.w*.5;
   const denom=D*cp+sy*sp;
   if(denom<1)return null;
   let height=0,worldX=0,worldY=0;
   for(let iteration=0;iteration<4;iteration++){
    const z=height*c.scale;
    const qy=(sy*D+z*(D*sp-sy*cp))/denom;
    const depth=sp*qy+cp*z;
    if(D-depth<=65)return null;
    const factor=clamp(D/(D-depth),.1,7);
    const qx=sx/factor;
    worldX=(v.w*.5-c.x)/c.scale+(cr*qx+sr*qy)/c.scale;
    worldY=(v.h*.5-c.y)/c.scale+(-sr*qx+cr*qy)/c.scale;
    height=sampleHeight(worldX/cell,worldY/cell);
   }
   return {x:worldX,y:worldY,z:height,gx:Math.round(worldX/cell),gy:Math.round(worldY/cell)};
  }
  function rectangleForView(v,c,angle,rotation,camDist){
   const focusX=(v.w*.5-c.x)/c.scale;
   const focusY=(v.h*.5-c.y)/c.scale;
   const sn=Math.sin(angle),cs=Math.cos(angle);
   const yr=Math.sin(rotation),xr=Math.cos(rotation);
   // A slightly larger world-space field reaches behind the perspective
   // horizon. Beyond this distance the last points smoothly disappear into
   // black, NOT a flat rectangular mesh edge.
   const distanceLimit=Math.max(8000,Math.max(v.w,v.h)*13/c.scale);
   const corners=[];
   for(const sy of [-v.h*.8,-v.h*.5,0,v.h*.5,v.h*.8]){
    const denom=camDist*cs+sy*sn;
    const qy=denom>camDist*.012?clamp(sy*camDist/denom,
     -distanceLimit,distanceLimit):-distanceLimit;
    const factor=camDist/(camDist-sy*0+Math.max(-distanceLimit,qy)*(-sn));
    for(const sx of [-v.w*.8,-v.w*.5,0,v.w*.5,v.w*.8]){
     const qx=clamp(sx/Math.max(.04,factor),-distanceLimit,distanceLimit);
     const wx=focusX+(xr*qx+yr*qy)/c.scale;
     const wy=focusY+(-yr*qx+xr*qy)/c.scale;
     corners.push([wx,wy]);
    }
   }
   const minX=Math.min(...corners.map(p=>p[0]));
   const maxX=Math.max(...corners.map(p=>p[0]));
   const minY=Math.min(...corners.map(p=>p[1]));
   const maxY=Math.max(...corners.map(p=>p[1]));
   return {minX,maxX,minY,maxY,focusX,focusY,
    distanceLimit,range:distanceLimit*c.scale};
  }
  function streamTiles(v,c,angle,rotation,camDist){
   const view=rectangleForView(v,c,angle,rotation,camDist);
   const s=CHUNK_CELLS*cell;
   const nearRadius=Math.min(2450,
    Math.max(1500,Math.max(v.w,v.h)*1.15/c.scale));
   const nx0=Math.floor((view.focusX-nearRadius)/s);
   const nx1=Math.ceil((view.focusX+nearRadius)/s)-1;
   const ny0=Math.floor((view.focusY-nearRadius)/s);
   const ny1=Math.ceil((view.focusY+nearRadius)/s)-1;
   // Far tiles have a power-of-two cell step and power-of-two world span.
   // At a glancing view the projected region can span kilometers; far
   // cells are still mathematically aligned with the same 40-unit grid.
   let macro=1;
   const widthWorld=view.maxX-view.minX+2*s;
   const heightWorld=view.maxY-view.minY+2*s;
   while((widthWorld/(s*macro)+2)*(heightWorld/(s*macro)+2)>MAX_FAR_CHUNKS
      &&macro<64)macro*=2;
   const farSpanCells=CHUNK_CELLS*macro,farSize=farSpanCells*cell;
   const fx0=Math.floor((view.minX-s)/farSize);
   const fx1=Math.ceil((view.maxX+s)/farSize)-1;
   const fy0=Math.floor((view.minY-s)/farSize);
   const fy1=Math.ceil((view.maxY+s)/farSize)-1;
   const signature=[nx0,nx1,ny0,ny1,fx0,fx1,fy0,fy1,macro].join('/');
   if(signature===meshKey)return view;
   // A floating origin prevents shader vertex jitter millions of units
   // away from the original authored city.
   originX=Math.floor(view.focusX/s)*s;
   originY=Math.floor(view.focusY/s)*s;
   const vertices=[],triangles=[],edges=[],seenEdges=new Set(),vertexIndices=new Map();
   function join(a,b){
    // Draw only the actual square-lattice edges, never triangle diagonals.
    const k=a<b?a+','+b:b+','+a;
    if(seenEdges.has(k))return;
    seenEdges.add(k);edges.push(a,b);
   }
   function point(gx,gy){
    const key=keyFor(gx,gy);
    let id=vertexIndices.get(key);
    if(id!==undefined)return id;
    id=vertices.length/3;
    if(id>=65535)throw Error('Terrain streaming exceeded 16-bit geometry budget');
    vertexIndices.set(key,id);
    vertices.push(gx*cell-originX,gy*cell-originY,getHeight(gx,gy));
    return id;
   }
   function tile(tx,ty,span,segments){
    const startX=tx*span,startY=ty*span,step=span/segments;
    const rows=[];
    for(let y=0;y<=segments;y++){
     const row=[];
     for(let x=0;x<=segments;x++)row.push(point(startX+x*step,startY+y*step));
     rows.push(row);
    }
    for(let y=0;y<segments;y++)for(let x=0;x<segments;x++){
     const a=rows[y][x],b=rows[y][x+1];
     const d=rows[y+1][x],e=rows[y+1][x+1];
     triangles.push(a,b,d,b,e,d);
    }
    for(let y=0;y<=segments;y++)
     for(let x=0;x<segments;x++)join(rows[y][x],rows[y][x+1]);
    for(let y=0;y<segments;y++)
     for(let x=0;x<=segments;x++)join(rows[y][x],rows[y+1][x]);
   }
   const totalNear=(nx1-nx0+1)*(ny1-ny0+1);
   const nearStride=totalNear>MAX_NEAR_CHUNKS?2:1;
   const minNearX=nx0*s,maxNearX=(nx1+1)*s;
   const minNearY=ny0*s,maxNearY=(ny1+1)*s;
   // Coarse far terrain never takes over the high fidelity near grid.
   farTiles=0;nearTiles=0;
   for(let ty=fy0;ty<=fy1;ty++)for(let tx=fx0;tx<=fx1;tx++){
    const x0=tx*farSize,y0=ty*farSize;
    if(x0>=minNearX&&x0+farSize<=maxNearX&&
       y0>=minNearY&&y0+farSize<=maxNearY)continue;
    if(farTiles>=MAX_FAR_CHUNKS*2)continue;
    tile(tx,ty,farSpanCells,8);farTiles++;
   }
   for(let ty=ny0;ty<=ny1;ty+=nearStride)for(let tx=nx0;tx<=nx1;tx+=nearStride){
    tile(Math.floor(tx/nearStride),Math.floor(ty/nearStride),
     CHUNK_CELLS*nearStride,CHUNK_CELLS);
    nearTiles++;
   }
   coords=new Float32Array(vertices);
   indices=new Uint16Array(triangles);
   gridEdges=new Uint16Array(edges);
   lookup=vertexIndices;
   count=coords.length/3;triangleCount=indices.length/3;
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,coords,gl.DYNAMIC_DRAW);
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.DYNAMIC_DRAW);
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gridEdgeBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,gridEdges,gl.DYNAMIC_DRAW);
   meshKey=signature;
   farCellStep=macro*2;
   // The visible near field is solid dots; distant dots fade towards the
   // perspective horizon without an artificial world edge.
   fadeStart=view.range*.52;fadeEnd=view.range*.96;
   map.dataset.terrainVertices=String(count);
   map.dataset.terrainTriangles=String(triangleCount);
   map.dataset.terrainGridEdges=String(gridEdges.length/2);
   map.dataset.gridMesh='orthogonal-hairlines';
   map.dataset.terrainNearTiles=String(nearTiles);
   map.dataset.terrainFarTiles=String(farTiles);
   map.dataset.terrainChunkStep=String(farCellStep);
   map.dataset.terrainOrigin=originX+','+originY;
   return view;
  }
  let target=0,mix=0,yaw=0,pitch=.72,last=0,frames=0,active=true;
  map.dataset.cameraMode='2d';
  map.dataset.terrainRenderer='webgl-streamed-heightfield';
  map.dataset.terrainWorld='infinite';
  map.dataset.terrainVertices='0';
  map.dataset.terrainTriangles='0';
  map.dataset.terrainFaces='true';
  const uniforms={};
  gl.useProgram(program);
  for(const name of ['u_focus','u_screen','u_scale','u_yaw','u_pitch','u_camDist','u_time','u_pointMode','u_fadeStart','u_fadeEnd'])
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
   streamTiles({w,h},c,effectivePitch,effectiveYaw,focal);
   gl.clearColor(0,0,0,0);
   gl.clearDepth(1);
   gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.enable(gl.DEPTH_TEST);
   gl.depthFunc(gl.LEQUAL);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   gl.useProgram(program);
   gl.uniform2f(uniforms.u_focus,focusX-originX,focusY-originY);
   gl.uniform2f(uniforms.u_screen,w,h);
   gl.uniform1f(uniforms.u_scale,c.scale);
   gl.uniform1f(uniforms.u_yaw,effectiveYaw);
   gl.uniform1f(uniforms.u_pitch,effectivePitch);
   gl.uniform1f(uniforms.u_camDist,focal);
   gl.uniform1f(uniforms.u_time,now*.001);
   gl.uniform1f(uniforms.u_fadeStart,fadeStart);
   gl.uniform1f(uniforms.u_fadeEnd,fadeEnd);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.enableVertexAttribArray(aPosition);
   gl.vertexAttribPointer(aPosition,3,gl.FLOAT,false,0,0);
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
   // Keep black terrain triangles for hidden-surface depth, but slightly
   // offset their depth so delicate actual surface edges don't flicker.
   gl.depthMask(true);
   gl.enable(gl.POLYGON_OFFSET_FILL);
   gl.polygonOffset(1,1);
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
   gl.uniform1f(uniforms.u_pointMode,0);
   gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
   gl.disable(gl.POLYGON_OFFSET_FILL);
   gl.depthMask(false);
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gridEdgeBuffer);
   gl.uniform1f(uniforms.u_pointMode,2);
   gl.drawElements(gl.LINES,gridEdges.length,gl.UNSIGNED_SHORT,0);
   gl.uniform1f(uniforms.u_pointMode,1);
   gl.drawArrays(gl.POINTS,0,count);
   gl.depthMask(true);
   surface.style.opacity=String(eased);
   const flat=map.querySelector('.pw-dot-wave-surface');
   if(flat)flat.style.opacity=String(1-eased);
   map.dataset.terrainFrame=String(++frames);
   map.dataset.cameraPitch=effectivePitch.toFixed(3);
   map.dataset.cameraYaw=effectiveYaw.toFixed(3);
  }
  function inspect(){return Object.freeze({
   mode:target>.5?'3d':'2d',blend:mix,pitch,yaw,
   vertices:count,triangles:triangleCount,gridEdges:gridEdges.length/2,
   meshStyle:'orthogonal-hairlines',cols:authoredCols,rows:authoredRows,
   world:'infinite',nearTiles,farTiles,farCellStep,origin:[originX,originY],
   heightsDefined:overrides.size>0,heightOverrides:overrides.size,
   renderer:map.dataset.terrainRenderer,frames
  })}
  const onContext=e=>{if(target>.5)e.preventDefault()};
  map.addEventListener('contextmenu',onContext);
  return Object.freeze({
   render,setMode,toggleMode,is3D:()=>target>.5,orbitBy,resetOrbit,
   getHeight,setHeight,heightAt:sampleHeight,exportHeights,importHeights,project,unproject,inspect,
   dispose(){
    active=false;map.removeEventListener('contextmenu',onContext);
    toggle.remove();surface.remove();
    if(gl){gl.deleteBuffer(buffer);gl.deleteBuffer(indexBuffer);
     gl.deleteBuffer(gridEdgeBuffer);gl.deleteProgram(program)}
   }
  });
 }
 return Object.freeze({create});
});
