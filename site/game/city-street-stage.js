/* Paperchalk World — open-air urban street, actual WebGL perspective space.
   Geometry is spatial: road and pavements are horizontal textured quads, shops
   and distant skyline are painted vertical planes, vehicles are moving world
   billboards at separate Z coordinates. No CSS transform parallax or panorama.
 */
(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PaperWorldCityStreet=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const SIZE=Object.freeze({streetLength:96,roadWidth:17,nearSidewalk:6,farSidewalk:4,
   storefrontZ:28,storefrontHeight:11.5,eyeHeight:1.65});
 const ASSETS=Object.freeze({
   road:'./assets/city-street/asphalt-material.svg',
   sidewalk:'./assets/city-street/sidewalk-material.svg',
   buildingsA:'./assets/city-street/shopfront-a.svg',
   buildingsB:'./assets/city-street/shopfront-b.svg',
   buildingsC:'./assets/city-street/shopfront-c.svg',
   tree:'./assets/city-street/roadside-tree.svg',
   skyline:'./assets/city-street/skyline-painted.svg',
   sky:'./assets/city-street/sky-painted.svg',
   white:'./assets/city-street/white-marking.svg',
   cream:'./assets/city-street/traffic-cream.svg',
   coral:'./assets/city-street/traffic-coral.svg',
   bus:'./assets/city-street/traffic-bus.svg',
   shadow:'./assets/city-street/car-shadow.svg'
 });
 const VEHICLES=Object.freeze([
   {id:'bus-far',texture:'bus',lane:'far',z:20.8,w:9.5,h:3.35,direction:1,speed:4.3,offset:11},
   {id:'car-far',texture:'coral',lane:'far',z:20.1,w:4.5,h:1.7,direction:1,speed:6.6,offset:37},
   {id:'car-near',texture:'cream',lane:'near',z:11.2,w:4.5,h:1.7,direction:-1,speed:6.2,offset:18},
   {id:'car-near-two',texture:'coral',lane:'near',z:10.9,w:4.5,h:1.7,direction:-1,speed:5.6,offset:56}
 ]);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const axis=v=>{const n=clamp(Number(v)||0,-1,1),a=Math.abs(n);
   return a<.09?0:Math.sign(n)*Math.pow((a-.09)/.91,1.35)};
 function camera(px=0,py=0,walk=0){
   return {x:clamp(walk,-20,20),y:SIZE.eyeHeight,z:-1.0,
     yaw:axis(px)*.45,pitch:-.087-axis(py)*.14,hFov:68};
 }
 function quad(out,pts,uv){
   const t=uv||[[0,0],[1,0],[1,1],[0,1]];
   for(const i of [0,1,2,0,2,3])out.push(...pts[i],...t[i]);
 }
 function floor(out,x0,x1,z0,z1,y=.005){
   quad(out,[[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]]);
 }
 function standing(out,x,y,z,w,h,flip=false){
   quad(out,[[x-w/2,y,z],[x+w/2,y,z],[x+w/2,y+h,z],[x-w/2,y+h,z]],
     flip?[[1,0],[0,0],[0,1],[1,1]]:undefined);
 }
 function geometry(){
   const g=Object.fromEntries(Object.keys(ASSETS).map(k=>[k,[]]));
   // Plane geometry in REAL metre coordinates, not a stage-sized image.
   for(let x=-48;x<48;x+=6){
     for(let z=6;z<24;z+=6)floor(g.road,x,x+6,z,z+6);
     for(let z=-4;z<6;z+=5)floor(g.sidewalk,x,x+6,z,z+5,.019);
     for(let z=24;z<29;z+=5)floor(g.sidewalk,x,x+6,z,z+5,.019);
     // edge markings and curbs are separate world-space surfaces
     floor(g.white,x+.1,x+5.9,6.03,6.13,.03);
     floor(g.white,x+.1,x+5.9,23.8,23.91,.03);
     floor(g.white,x+.7,x+4.35,14.90,15.02,.032);
   }
   // A row of front-facing painted architecture as 2D texture planes.
   for(let i=-4;i<=3;i++){
     const x0=i*12,x1=x0+12,z=28.6+(i%3)*.16;
     quad(g[['buildingsA','buildingsB','buildingsC'][((i%3)+3)%3]],
       [[x0,0,z],[x1,0,z],[x1,11.5,z],[x0,11.5,z]]);
   }
   // Atmospheric distant skyline and full sky are ALSO actual planes.
   quad(g.skyline,[[-120,-4,47],[120,-4,47],[120,34,47],[-120,34,47]]);
   quad(g.sky,[[-270,-34,125],[270,-34,125],[270,115,125],[-270,115,125]]);
   return Object.freeze(Object.fromEntries(Object.entries(g).map(([k,v])=>[k,new Float32Array(v)])));
 }
 const GEOMETRY=geometry();
 const VS=[
   'attribute vec3 a_pos;attribute vec2 a_uv;',
   'uniform vec3 u_eye;uniform vec2 u_angles,u_tan;',
   'varying vec2 v_uv;varying vec3 v_world;varying float v_depth;',
   'void main(){vec3 d=a_pos-u_eye;float cy=cos(u_angles.x),sy=sin(u_angles.x);',
   'float cp=cos(u_angles.y),sp=sin(u_angles.y);',
   'float x=cy*d.x-sy*d.z,front=sy*d.x+cy*d.z;',
   'float y=cp*d.y-sp*front,depth=sp*d.y+cp*front;',
   'float n=.07,f=260.;float cz=(f+n)/(f-n)*depth-2.*f*n/(f-n);',
   'gl_Position=vec4(x/u_tan.x,y/u_tan.y,cz,depth);',
   'v_uv=a_uv;v_world=a_pos;v_depth=depth;}'
 ].join('\n');
 const FS=[
   'precision mediump float;',
   'uniform sampler2D u_tex;uniform float u_brightness,u_fog,u_kind;',
   'varying vec2 v_uv;varying vec3 v_world;varying float v_depth;',
   'void main(){vec4 a=texture2D(u_tex,v_uv);if(a.a<.05)discard;',
   'vec3 c=a.rgb;',
   'if(u_kind<4.5)c*=u_brightness;',
   'else if(u_kind<5.5)c*=mix(.62,1.0,u_brightness);',
   'else c*=min(1.0,.88+u_brightness*.12);',
   'float fog=clamp((v_depth-29.)/95.,0.,1.)*u_fog;',
   'if(u_kind>5.5)fog=0.;',
   'c=mix(c,vec3(.66,.71,.73)*u_brightness,fog);',
   'gl_FragColor=vec4(c,a.a);}'
 ].join('\n');
 function create({stage,view}={}){
   if(!stage||!view)throw Error('City Street requires the real game stage');
   const canvas=document.createElement('canvas');canvas.id='city-street-surface';canvas.hidden=true;
   canvas.setAttribute('aria-label','真实WebGL城市双向马路：三维地板、对街立面、世界坐标车流');
   const original=stage.querySelector('#source');
   if(original)original.insertAdjacentElement('afterend',canvas);else stage.appendChild(canvas);
   const gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,
     preserveDrawingBuffer:true,powerPreference:'low-power'});
   let active=false,frame=0,error=null,ready=0,previewMinute=null,heldTrafficTime=null;
   let walkX=0,program=null,lastTime=0;
   const gpu={},tex={},uni={};
   const keys=new Set();
   function keydown(e){if(!active||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||''))return;
     if(['a','d','ArrowLeft','ArrowRight'].includes(e.key)){
       keys.add(e.key);e.preventDefault();
     }}
   function keyup(e){keys.delete(e.key)}
   window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);
   function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
     if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
   function init(){
     if(!gl)throw Error('WebGL unavailable');
     let vs=compile(gl.VERTEX_SHADER,VS),fs=compile(gl.FRAGMENT_SHADER,FS);
     program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);
     gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
     if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
     for(const name of ['a_pos','a_uv'])uni[name]=gl.getAttribLocation(program,name);
     for(const name of ['u_eye','u_angles','u_tan','u_tex','u_brightness','u_fog','u_kind'])
       uni[name]=gl.getUniformLocation(program,name);
     for(const [k,verts] of Object.entries(GEOMETRY)){
       if(!verts.length)continue;
       const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
       gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STATIC_DRAW);
       gpu[k]={buf,count:verts.length/5};
     }
     for(const [k,path] of Object.entries(ASSETS)){
       const slot={path,texture:gl.createTexture(),ready:false,error:null};tex[k]=slot;
       gl.bindTexture(gl.TEXTURE_2D,slot.texture);
       gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
       gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
       gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
       const img=new Image();
       img.onload=()=>{try{gl.bindTexture(gl.TEXTURE_2D,slot.texture);
         gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
         gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
         slot.ready=true;slot.size=[img.naturalWidth,img.naturalHeight];ready++;
       }catch(e){slot.error=String(e);error=slot.error}};
       img.onerror=()=>{slot.error='Cannot load '+path;error=slot.error};img.src=path;
     }
     gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
     gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   }
   try{init()}catch(e){error=String(e);console.warn('[city-street]',e)}
   function draw(name,kind,cam,w,h,mesh){
     const texture=tex[name],data=mesh||gpu[name];if(!texture?.ready||!data)return;
     gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture.texture);
     gl.uniform1i(uni.u_tex,0);gl.uniform1f(uni.u_kind,kind);
     gl.bindBuffer(gl.ARRAY_BUFFER,data.buf);
     gl.enableVertexAttribArray(uni.a_pos);gl.enableVertexAttribArray(uni.a_uv);
     gl.vertexAttribPointer(uni.a_pos,3,gl.FLOAT,false,20,0);
     gl.vertexAttribPointer(uni.a_uv,2,gl.FLOAT,false,20,12);
     gl.drawArrays(gl.TRIANGLES,0,data.count);
   }
   function dynamicQuad(texture,x,y,z,width,height,flip){
     const data=[];standing(data,x,y,z,width,height,flip);
     const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
     gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STREAM_DRAW);
     draw(texture,3,null,0,0,{buf,count:6});gl.deleteBuffer(buf);
   }
   function drawShadow(x,z,w){
     const data=[];floor(data,x-w/2,x+w/2,z-.95,z+.95,.048);
     const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
     gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STREAM_DRAW);
     gl.depthMask(false);draw('shadow',3,null,0,0,{buf,count:6});
     gl.depthMask(true);gl.deleteBuffer(buf);
   }
   function trafficX(vehicle,t){
     const span=76;
     const phase=((vehicle.offset+t*vehicle.speed)%span+span)%span;
     return vehicle.direction===1?phase-38:38-phase;
   }
   function render(px=0,py=0,life=null){
     if(!active||error||!gl||!program)return false;
     const w=stage.clientWidth,h=stage.clientHeight;if(w<1||h<1)return false;
     const now=performance.now();const dt=lastTime?Math.min((now-lastTime)/1000,.06):0;
     lastTime=now;
     if(keys.has('a')||keys.has('ArrowLeft'))walkX-=dt*3.5;
     if(keys.has('d')||keys.has('ArrowRight'))walkX+=dt*3.5;
     walkX=clamp(walkX,-20,20);
     const scale=Math.min(1.5,window.devicePixelRatio||1,Math.sqrt(2300000/(w*h)));
     const bw=Math.round(w*scale),bh=Math.round(h*scale);
     if(canvas.width!==bw)canvas.width=bw;if(canvas.height!==bh)canvas.height=bh;
     const cam=camera(px,py,walkX);
     const minute=previewMinute??life?.minute??window.PaperWorldDailyLifeUI?.snapshot?.()?.minute??810;
     const day=Math.max(.19,Math.min(1.0,Math.sin(((minute-360)/780)*Math.PI)*.8+.27));
     const t=heldTrafficTime??performance.now()/1000;
     try{
       gl.viewport(0,0,bw,bh);gl.clearColor(.69,.73,.76,1);
       gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
       gl.useProgram(program);
       const focal=Math.min(bw,bh*16/9)/(2*Math.tan(cam.hFov*Math.PI/360));
       gl.uniform3f(uni.u_eye,cam.x,cam.y,cam.z);
       gl.uniform2f(uni.u_angles,cam.yaw,cam.pitch);
       gl.uniform2f(uni.u_tan,bw/(2*focal),bh/(2*focal));
       gl.uniform1f(uni.u_brightness,day);gl.uniform1f(uni.u_fog,.22);
       // Real depth buffer handles surfaces; sky drawn first.
       draw('sky',6);draw('skyline',5);
       draw('buildingsA',1);draw('buildingsB',1);draw('buildingsC',1);
       draw('sidewalk',2);draw('road',2);draw('white',2);
       for(const x of [-37,-17,5,25,43])dynamicQuad('tree',x,0,26.8,3.3,5.0,false);
       // Cars have physical sizes and different road-lane depth coordinates.
       // Draw far lane before near for correct depth-buffer transparency.
       for(const v of VEHICLES.filter(v=>v.lane==='far').concat(VEHICLES.filter(v=>v.lane==='near'))){
         const x=trafficX(v,t);
         drawShadow(x,v.z,v.w*.9);
         dynamicQuad(v.texture,x,0.07,v.z,v.w,v.h,v.direction<0);
       }
       const err=gl.getError();if(err!==gl.NO_ERROR)throw Error('Street WebGL '+err);
       frame++;return true;
     }catch(e){error=String(e);console.warn('[city-street]',e);return false}
   }
   function setActive(flag){active=!!flag;canvas.hidden=!active;
     view.classList.toggle('city-street-active',active);
     if(active){lastTime=0;render(0,0)}}
   function setTrafficPreviewTime(seconds){heldTrafficTime=seconds===null?null:Math.max(0,Number(seconds)||0)}
   function setLightingPreview(minute){previewMinute=minute===null?null:clamp(Number(minute)||0,0,1440)}
   function inspect(){return {active,error,frame,renderer:'webgl-open-air-street',
     perspective:true,geometryPolicy:'textured-2d-art-on-3d-world-planes',
     camera:camera(0,0,walkX),dimensions:SIZE,
     road:'bidirectional',vehicleCount:VEHICLES.length,
     traffic:VEHICLES.map(v=>({id:v.id,lane:v.lane,direction:v.direction,z:v.z})),
     textureCount:ready,expectedTextures:Object.keys(ASSETS).length,
     imagesLoaded:ready===Object.keys(ASSETS).length,
     textures:Object.fromEntries(Object.entries(tex).map(([k,v])=>[k,{src:v.path,ready:v.ready,error:v.error}]))};}
   return Object.freeze({setActive,render,setTrafficPreviewTime,setLightingPreview,inspect,
     get canvas(){return canvas}});
 }
 return Object.freeze({SIZE,ASSETS,VEHICLES,GEOMETRY,camera,create});
});