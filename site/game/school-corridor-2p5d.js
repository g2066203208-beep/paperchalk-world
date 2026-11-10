/* Paperchalk World: 27m Japanese school corridor, first actual 2.5D-space blockout.
 * An independent real WebGL perspective volume using the APPROVED painted
 * classroom walls, windows, floor and ceiling as planar 2D art. Not an image panorama.
 * 3 classroom modules x 9m = 27m; width 2.8m, ceiling 3.38m.
 */
(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PaperWorldSchoolCorridor=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const SIZE=Object.freeze({width:2.8,height:3.38,length:27,moduleLength:9,modules:3});
 const ASSETS=Object.freeze({
   doors:'./assets/school-room/classroom-right-two-doors-2048x768.webp',
   windows:'./assets/school-room/gpt-left-wall-painted-alpha-2048x768.webp',
   floor:'./assets/school-room/floor-painted.png',
   ceiling:'./assets/school-room/classroom-ceiling-painted-1774x887.webp',
   sky:'./assets/school-room/exterior-overcast-sky.svg',
   facade:'./assets/school-room/exterior-school-facade-gpt-2560x576.webp',
   end:'./assets/school-room/corridor-end-door-blockout.svg'
 });
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 function camera(px=0,py=0,walk=0){
   const axis=t=>{const v=clamp(Number(t)||0,-1,1),m=Math.abs(v);
     return m<.1?0:Math.sign(v)*Math.pow((m-.1)/.9,1.3);};
   return {x:0,y:1.57,z:.70+clamp(walk,0,24),yaw:axis(px)*.79,
     pitch:-.025-axis(py)*.17,hFov:68};
 }
 function addQuad(vertices,pts,uv){
   for(const i of [0,1,2,0,2,3])vertices.push(...pts[i],...uv[i]);
 }
 function buildGeometry(){
   const g=Object.fromEntries(Object.keys(ASSETS).map(k=>[k,[]]));
   const W=SIZE.width/2,H=SIZE.height;
   for(let n=0;n<3;n++){
     const z=n*SIZE.moduleLength,z1=z+SIZE.moduleLength;
     addQuad(g.doors,[[W,0,z],[W,0,z1],[W,H,z1],[W,H,z]],
       [[0,0],[1,0],[1,1],[0,1]]);
     addQuad(g.windows,[[-W,0,z],[-W,H,z],[-W,H,z1],[-W,0,z1]],
       [[0,0],[0,1],[1,1],[1,0]]);
   }
   // The floor/ceiling are 2:1 painted material strips, sampled at their
   // physical 2.8m room-width portion, *not stretched across 27m*.
   for(let n=0;n<6;n++){
     const z=n*4.5,z1=z+4.5,u0=.36,u1=.64;
     addQuad(g.floor,[[-W,0,z],[-W,0,z1],[W,0,z1],[W,0,z]],
       [[u0,0],[u0,1],[u1,1],[u1,0]]);
     addQuad(g.ceiling,[[-W,H,z],[W,H,z],[W,H,z1],[-W,H,z1]],
       [[u0,0],[u1,0],[u1,1],[u0,1]]);
   }
   addQuad(g.end,[[-W,0,27],[W,0,27],[W,H,27],[-W,H,27]],
     [[0,0],[1,0],[1,1],[0,1]]);
   // Independent outdoor image planes: 4 transparent window groups per bay
   // reveal the same building and sky depth used by the actual classroom.
   addQuad(g.sky,[[-7,-4,-5],[-7,-4,37],[-7,8,37],[-7,8,-5]],
     [[0,0],[1,0],[1,1],[0,1]]);
   addQuad(g.facade,[[-4.8,-4,-5],[-4.8,-4,37],[-4.8,8,37],[-4.8,8,-5]],
     [[0,0],[1,0],[1,1],[0,1]]);
   return Object.freeze(Object.fromEntries(Object.entries(g).map(([k,v])=>[k,new Float32Array(v)])));
 }
 const GEOMETRY=buildGeometry();
 const VS=[
  'attribute vec3 a_pos; attribute vec2 a_uv;',
  'uniform vec3 u_eye;uniform vec2 u_angles;uniform vec2 u_tan;',
  'varying vec2 v_uv;varying vec3 v_world;varying float v_distance;',
  'void main(){vec3 d=a_pos-u_eye;float cy=cos(u_angles.x),sy=sin(u_angles.x);',
  'float cp=cos(u_angles.y),sp=sin(u_angles.y);',
  'float x=cy*d.x-sy*d.z,forward=sy*d.x+cy*d.z;',
  'float y=cp*d.y-sp*forward,depth=sp*d.y+cp*forward;',
  'float n=.05,f=90.;float cz=(f+n)/(f-n)*depth-2.*f*n/(f-n);',
  'gl_Position=vec4(x/u_tan.x,y/u_tan.y,cz,depth);',
  'v_uv=a_uv;v_world=a_pos;v_distance=max(0.,depth);}'
 ].join('\n');
 const FS=[
  'precision mediump float;',
  'varying vec2 v_uv;varying vec3 v_world;varying float v_distance;',
  'uniform sampler2D u_image;uniform vec3 u_ambient,u_sunColor,u_skyColor;',
  'uniform float u_sunPower,u_lampPower,u_kind;',
  'void main(){',
  'vec4 ink=texture2D(u_image,v_uv);if(ink.a<.04)discard;',
  'if(u_kind>4.5){',
  'if(u_kind<5.5){gl_FragColor=vec4(mix(ink.rgb,u_skyColor,.55),ink.a);return;}',
  'gl_FragColor=vec4(ink.rgb*(u_ambient*.72+.25),ink.a);return;}',
  'float lamps=0.;',
  'for(int i=0;i<6;i++){float z=2.25+float(i)*4.5;',
  'float d=(v_world.z-z)/2.2;lamps+=exp(-d*d);}',
  'lamps=min(lamps,1.2);',
  'float daylight=u_sunPower*(v_world.x<0.0?.23:.10);',
  'vec3 ambient=vec3(.40)+u_ambient*.56;',
  'vec3 shade=ambient+u_sunColor*daylight+',
  'vec3(.98,.91,.82)*u_lampPower*(.12+.26*lamps);',
  'if(u_kind>.5&&u_kind<1.5)shade*=vec3(.97,.99,1.0);',
  'if(u_kind>1.5&&u_kind<2.5)shade*=vec3(.92,.95,1.02);',
  'vec3 c=ink.rgb*min(vec3(1.22),shade);',
  'float mist=smoothstep(10.,41.,v_distance)*.45;',
  'c=mix(c,vec3(.55,.59,.60)*u_ambient*.96,mist);',
  'gl_FragColor=vec4(clamp(c,0.,1.),ink.a);}'
 ].join('\n');
 function create({stage,view}={}){
   if(!stage||!view)throw Error('Corridor requires the existing game stage');
   const original=stage.querySelector('#source');
   const canvas=document.createElement('canvas');
   canvas.id='school-corridor-surface';canvas.hidden=true;
   canvas.setAttribute('aria-label','真实3D狭长教学楼走廊：一侧连续教室门，一侧落地窗，纵深27米');
   original.insertAdjacentElement('afterend',canvas);
   const gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,
     preserveDrawingBuffer:true,powerPreference:'low-power'});
   let active=false,ready=0,error=null,frames=0,progress=0,lastKey='';
   const textures={},geometries={},loc={};let program=null,previewMinute=null;
   function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
     if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Corridor shader '+gl.getShaderInfoLog(s));return s;}
   function setup(){
     if(!gl)throw Error('WebGL unavailable');
     const v=compile(gl.VERTEX_SHADER,VS),f=compile(gl.FRAGMENT_SHADER,FS);
     program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);
     gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);
     if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Corridor link '+gl.getProgramInfoLog(program));
     for(const [k,data] of Object.entries(GEOMETRY)){
       const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
       gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
       geometries[k]={buffer,count:data.length/5};
     }
     for(const name of ['a_pos','a_uv'])loc[name]=gl.getAttribLocation(program,name);
     for(const name of ['u_eye','u_angles','u_tan','u_image','u_ambient','u_sunColor',
       'u_skyColor','u_sunPower','u_lampPower','u_kind'])loc[name]=gl.getUniformLocation(program,name);
     gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
     gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
     for(const [k,src] of Object.entries(ASSETS)){
       const item={src,ready:false,texture:gl.createTexture()};textures[k]=item;
       gl.bindTexture(gl.TEXTURE_2D,item.texture);
       gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
       gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
       gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
       const image=new Image();image.onload=()=>{
         try{
           gl.bindTexture(gl.TEXTURE_2D,item.texture);
           gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
           gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
           item.ready=true;item.pixels=[image.naturalWidth,image.naturalHeight];ready++;lastKey='';
         }catch(e){item.error=String(e);error=String(e);}
       };
       image.onerror=()=>{item.error='Failed to load '+src;error=item.error;};image.src=src;
     }
   }
   try{setup()}catch(e){error=String(e);console.warn('[corridor]',e);}
   function render(px=0,py=0,life){
     if(!active||error||!gl||!program)return false;
     const width=stage.clientWidth,height=stage.clientHeight;
     if(width<1||height<1)return false;
     const ratio=Math.min(1.5,window.devicePixelRatio||1,Math.sqrt(2300000/(width*height)));
     const w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
     if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
     const cam=camera(px,py,progress);
     const minute=previewMinute??life?.minute??window.PaperWorldDailyLifeUI?.snapshot?.()?.minute??750;
     const lighting=window.PaperWorldSchoolRoom?.lightingAt?.(minute)||{
       ambient:[.73,.77,.80],sunColor:[.96,.93,.85],skyColor:[.66,.74,.80],sunPower:.3,lampPower:.45
     };
     const key=[w,h,ready,cam.yaw.toFixed(3),cam.pitch.toFixed(3),cam.z,minute].join('|');
     if(key===lastKey)return true;lastKey=key;
     gl.viewport(0,0,w,h);gl.clearColor(.43,.47,.49,1);
     gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
     gl.useProgram(program);
     const focal=Math.min(w,h*16/9)/(2*Math.tan(cam.hFov*Math.PI/360));
     gl.uniform3f(loc.u_eye,cam.x,cam.y,cam.z);
     gl.uniform2f(loc.u_angles,cam.yaw,cam.pitch);
     gl.uniform2f(loc.u_tan,w/(2*focal),h/(2*focal));
     gl.uniform3fv(loc.u_ambient,lighting.ambient);
     gl.uniform3fv(loc.u_sunColor,lighting.sunColor);
     gl.uniform3fv(loc.u_skyColor,lighting.skyColor);
     gl.uniform1f(loc.u_sunPower,lighting.sunPower);
     gl.uniform1f(loc.u_lampPower,lighting.lampPower);
     gl.uniform1i(loc.u_image,0);
     // Draw back-to-front while true 3D depth testing handles overlap.
     const order=['sky','facade','end','floor','ceiling','doors','windows'];
     try{
       for(const name of order){
         const tex=textures[name],geo=geometries[name];if(!tex.ready)continue;
         gl.uniform1f(loc.u_kind,({doors:0,windows:1,floor:2,ceiling:3,end:4,sky:5,facade:6})[name]);
         gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex.texture);
         gl.bindBuffer(gl.ARRAY_BUFFER,geo.buffer);
         gl.enableVertexAttribArray(loc.a_pos);gl.enableVertexAttribArray(loc.a_uv);
         gl.vertexAttribPointer(loc.a_pos,3,gl.FLOAT,false,20,0);
         gl.vertexAttribPointer(loc.a_uv,2,gl.FLOAT,false,20,12);
         gl.drawArrays(gl.TRIANGLES,0,geo.count);
       }
       const err=gl.getError();if(err!==gl.NO_ERROR)throw Error('Corridor GL '+err);
       frames++;return true;
     }catch(e){error=String(e);console.warn('[corridor]',e);return false;}
   }
   function setActive(flag){active=!!flag;canvas.hidden=!active;
     view.classList.toggle('school-corridor-active',active);lastKey='';
     if(active)render(0,0);}
   function setPreviewPosition(distance){progress=clamp(Number(distance)||0,0,24);lastKey='';return progress;}
   function setLightingPreview(minute){previewMinute=minute===null?null:clamp(Number(minute)||0,0,1440);lastKey='';}
   function inspect(){return {active,ready,error,frames,
     renderer:'webgl-long-narrow-corridor',dimensions:SIZE,
     camera:camera(0,0,progress),geometryPolicy:'textured-2d-planes-only',
     moduleCounts:{doorWall:3,windowWall:3,floorStrips:6,ceilingStrips:6},
     textureCount:ready,expectedTextures:Object.keys(ASSETS).length,
     textures:Object.fromEntries(Object.entries(textures).map(([k,v])=>
       [k,{src:v.src,ready:v.ready,pixels:v.pixels||null,error:v.error||null}]))};}
   return Object.freeze({setActive,render,setPreviewPosition,setLightingPreview,
     inspect,get canvas(){return canvas;}});
 }
 return Object.freeze({SIZE,ASSETS,GEOMETRY,camera,create});
});