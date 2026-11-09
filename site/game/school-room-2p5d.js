/* Paperchalk World — independent, five-faced 2.5D school room.
 * Reuses the battle room's perspective principles, NEVER its combat state.
 * All five room materials are flat orthographic images on real 3D planes.
 */
(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PaperWorldSchoolRoom=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const ROOM=Object.freeze({width:10,height:3.38,depth:9});
  const MATERIALS=Object.freeze({
    back:'./assets/school-room/back-painted.png',floor:'./assets/school-room/floor-painted.png',
    ceiling:'./assets/school-room/ceiling.svg',left:'./assets/school-room/left-windows-alpha.svg',
    right:'./assets/school-room/right-door-painted.svg'
  });
  // One transparent drawing per object: no 3D desk/chair/podium models.
  // 3D is reserved for the room's placement, camera, depth and wall planes.
  const FURNITURE_MATERIALS=Object.freeze({
    desk:'./assets/school-room/student-desk-standee.svg',
    chair:'./assets/school-room/student-chair-standee.svg',
    podium:'./assets/school-room/teacher-podium-standee.svg'
  });
  // The distant view and fall animation are also separate 2D texture planes.
  const EXTERIOR_MATERIALS=Object.freeze({
    sky:'./assets/school-room/exterior-overcast-sky.svg',
    facade:'./assets/school-room/exterior-school-facade.svg'
  });
  const FALL_MATERIAL='./assets/school-room/falling-schoolgirl-silhouette.svg';
  // Rows face the blackboard (z=9). Clear walking lanes on each side and center.
  const CLASSROOM_LAYOUT=Object.freeze({
    columns:Object.freeze([-3.48,-1.22,1.22,3.48]),
    rows:Object.freeze([2.15,3.3,4.45,5.6,6.75]),
    desks:20,chairs:20,
    centerAisle:1.35,sideAisle:.95
  });
  const ACTORS=Object.freeze([
    {id:'boy',src:'./assets/school-room/small-boy.svg',x:-.76,z:4.55,h:1.70,ends:5},
    {id:'girl',src:'./assets/school-room/class-idol.svg',x:-1.75,z:4.43,h:1.73,ends:1},
    {id:'female2',src:'./assets/characters/civilians/schoolgirls/sg01/front.png',x:2.48,z:5.18,h:1.72},
    {id:'male1',src:'./assets/characters/char-003/front.png',x:-2.90,z:6.20,h:1.79},
    {id:'male2',src:'./assets/characters/char-016/front.png',x:2.05,z:6.10,h:1.80},
    {id:'extra2',src:'./assets/characters/civilians/npc-c002/front.png',x:1.04,z:4.82,h:1.78},
  ]);
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  function camera(px=0,py=0){
    const axis=t=>{
      const v=clamp(Number(t)||0,-1,1),m=Math.abs(v);
      if(m<.13)return 0;const s=(m-.13)/.87;
      return Math.sign(v)*s*s*(3-2*s);
    };
    // Battle-room-inspired human-scale lens. The viewer is INSIDE the
    // classroom, not photographing the whole room from beyond its back wall.
    // Let the ceiling crop naturally instead of shrinking every character.
    return {x:.10,y:1.25,z:-.90,hFov:54,yaw:axis(px)*.085,
      pitch:-.006-axis(py)*.039};
  }
  function project(p,cam,w,h){
    const dx=p[0]-cam.x,dy=p[1]-cam.y,dz=p[2]-cam.z;
    const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw);
    const cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
    const xx=cy*dx-sy*dz,z0=sy*dx+cy*dz,yy=cp*dy-sp*z0,zz=sp*dy+cp*z0;
    if(zz<.04)return null;
    const f=Math.min(w,h*16/9)/(2*Math.tan(cam.hFov*Math.PI/360));
    return {x:w/2+f*xx/zz,y:h/2-f*yy/zz,z:zz};
  }
  const projectionShader=[
    'vec3 d=a_position-u_camera;',
    'float cy=cos(u_angles.x),sy=sin(u_angles.x);',
    'float cp=cos(u_angles.y),sp=sin(u_angles.y);',
    'float xx=cy*d.x-sy*d.z,zz=sy*d.x+cy*d.z;',
    'float yy=cp*d.y-sp*zz,depth=sp*d.y+cp*zz;',
    'float n=.06,f=44.0;',
    'float cz=(f+n)/(f-n)*depth-2.0*f*n/(f-n);',
    'gl_Position=vec4(xx/u_tan.x,yy/u_tan.y,cz,depth);'
  ].join('\n');
  const uniforms='uniform vec3 u_camera;uniform vec2 u_angles;uniform vec2 u_tan;\n';
  const TVS='attribute vec3 a_position;attribute vec2 a_uv;'+uniforms+
    'varying vec2 v_uv;void main(){'+projectionShader+'v_uv=a_uv;}';
  const TFS='precision mediump float;varying vec2 v_uv;'+
    'uniform sampler2D u_tex;uniform vec3 u_light;uniform float u_sprite;'+
    'void main(){vec4 c=texture2D(u_tex,v_uv);if(c.a<.04)discard;'+
    'if(u_sprite>.5&&c.r>.965&&c.g>.965&&c.b>.965)discard;'+
    'gl_FragColor=vec4(c.rgb*u_light,c.a);}';
  const faces=Object.freeze({
    back:[[-5,0,9],[5,0,9],[5,ROOM.height,9],[-5,ROOM.height,9]],
    floor:[[-5,0,0],[-5,0,9],[5,0,9],[5,0,0]],
    ceiling:[[-5,ROOM.height,0],[5,ROOM.height,0],[5,ROOM.height,9],[-5,ROOM.height,9]],
    left:[[-5,0,0],[-5,ROOM.height,0],[-5,ROOM.height,9],[-5,0,9]],
    right:[[5,0,0],[5,0,9],[5,ROOM.height,9],[5,ROOM.height,0]]
  });
  const uvs=Object.freeze({
    back:[[0,0],[1,0],[1,1],[0,1]],
    floor:[[0,0],[0,1],[1,1],[1,0]],
    ceiling:[[0,0],[1,0],[1,1],[0,1]],
    left:[[0,0],[0,1],[1,1],[1,0]],
    right:[[0,0],[1,0],[1,1],[0,1]]
  });
  // Lightweight X/Y drawing planes at world-space Z. The camera supplies
  // perspective scaling and the depth buffer supplies correct occlusion.
  const furnitureSurfaces={desk:[],chair:[],podium:[]};
  function furnitureQuad(id,points){
    const uv=[[0,0],[1,0],[1,1],[0,1]];
    for(const i of [0,1,2,0,2,3])furnitureSurfaces[id].push(...points[i],...uv[i]);
  }
  // Far to near: each element is a single textured 2D plane.
  // No facade windows / clouds / roof are modelled in 3D.
  const EXTERIOR=Object.freeze({skyX:-10,schoolX:-8.15,windowWallX:-5});
  function exteriorQuad(x){
    const y0=-3,y1=6,z0=-10,z1=30;
    const corners=[[x,y0,z0],[x,y0,z1],[x,y1,z1],[x,y1,z0]];
    const uv=[[0,0],[1,0],[1,1],[0,1]];
    const v=[];
    for(const i of [0,1,2,0,2,3])v.push(...corners[i],...uv[i]);
    return new Float32Array(v);
  }
  const EXTERIOR_QUADS=Object.freeze({
    sky:exteriorQuad(EXTERIOR.skyX),
    facade:exteriorQuad(EXTERIOR.schoolX)
  });
  function standee(id,x,z,w,h){
    // Flat, painted, alpha-masked prop. No baked shadows or cuboids.
    furnitureQuad(id,[
      [x-w/2,0,z],[x+w/2,0,z],[x+w/2,h,z],[x-w/2,h,z]
    ]);
  }
  CLASSROOM_LAYOUT.rows.forEach((z)=>
    CLASSROOM_LAYOUT.columns.forEach((x)=>{
      standee('desk',x,z,1.14,1.05);
      standee('chair',x,z-.64,.72,.97);
    }));
  standee('podium',.48,8.12,1.65,1.44);
  function textureFaces(){
    return Object.fromEntries(Object.entries(faces).map(([id,pts])=>{
      const arr=[];
      // The painted floor is roughly 2:1. Repeat it over two actual floor
      // strips rather than stretching one image over the entire 10x9m room.
      // Each segment has independent UVs, so NPOT PNGs stay CLAMP-compatible.
      const patches=id==='floor'
        ? [0,4.5].map(z=>[
            [-5,0,z],[-5,0,z+4.5],[5,0,z+4.5],[5,0,z]
          ])
        : [pts];
      for(const patch of patches)
        for(const i of [0,1,2,0,2,3])
          arr.push(...patch[i],...uvs[id][i]);
      return [id,new Float32Array(arr)];
    }));
  }
  // Just like the ring arena's sole/crown calibration: actor.h is the
  // physical INK height, never the pixel canvas's padded height. Preserve
  // authored horizontal and vertical scale exactly, without a fixed 0.49:1
  // body squash or cutting pixels from the original 2D texture.
  const FULL_IMAGE=Object.freeze({left:0,top:0,right:1,bottom:1});
  function portraitPlacement(actor,pixels={width:512,height:960},ink=FULL_IMAGE){
    const width=Math.max(1,Number(pixels.width)||512);
    const height=Math.max(1,Number(pixels.height)||960);
    const top=clamp(ink.top,0,.98),bottom=clamp(ink.bottom,top+.02,1);
    const left=clamp(ink.left,0,.98),right=clamp(ink.right,left+.02,1);
    const inkFraction=bottom-top;
    const planeHeight=actor.h/inkFraction;
    const planeWidth=planeHeight*(width/height);
    const x0=actor.x-(left+right)*.5*planeWidth;
    const y0=-(1-bottom)*planeHeight;
    return Object.freeze({
      sourceAspect:width/height,planeAspect:planeWidth/planeHeight,
      planeHeight,planeWidth,visibleHeight:inkFraction*planeHeight,
      x0,y0,x1:x0+planeWidth,y1:y0+planeHeight,
      ink:{left,top,right,bottom}
    });
  }
  function spriteGeometry(actor,pixels,ink){
    const fit=portraitPlacement(actor,pixels,ink),z=actor.z;
    return new Float32Array([
      fit.x0,fit.y0,z,0,0,fit.x1,fit.y0,z,1,0,fit.x1,fit.y1,z,1,1,
      fit.x0,fit.y0,z,0,0,fit.x1,fit.y1,z,1,1,fit.x0,fit.y1,z,0,1
    ]);
  }
  function measurePortraitInk(image){
    // The original source pixels stay intact. Read a small temporary
    // downsample for alpha bounds only; its size never affects drawing.
    const width=image.naturalWidth||1,height=image.naturalHeight||1;
    const scale=Math.min(1,384/Math.max(width,height));
    const sample=document.createElement('canvas');
    sample.width=Math.max(1,Math.round(width*scale));
    sample.height=Math.max(1,Math.round(height*scale));
    try{
      const ctx=sample.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(image,0,0,sample.width,sample.height);
      const rgba=ctx.getImageData(0,0,sample.width,sample.height).data;
      let left=sample.width,top=sample.height,right=-1,bottom=-1,count=0;
      for(let y=0;y<sample.height;y++)for(let x=0;x<sample.width;x++){
        const p=(y*sample.width+x)*4;
        // White matte is discarded by the existing sprite shader too.
        const white=rgba[p]>247&&rgba[p+1]>247&&rgba[p+2]>247;
        if(rgba[p+3]<42||white)continue;
        left=Math.min(left,x);right=Math.max(right,x);
        top=Math.min(top,y);bottom=Math.max(bottom,y);count++;
      }
      if(count<12)return FULL_IMAGE;
      const pad=2;
      return {
        left:Math.max(0,(left-pad)/sample.width),
        top:Math.max(0,(top-pad)/sample.height),
        right:Math.min(1,(right+pad+1)/sample.width),
        bottom:Math.min(1,(bottom+pad+1)/sample.height)
      };
    }catch(_){return FULL_IMAGE;}
  }
  function fallingSprite(position){
    // The full figure stays behind the exterior side of the LEFT wall
    // (all vertices x < -5) and animates as a single alpha-masked plane.
    const z=6.1,w=.92,h=1.72,x=-5.61;
    const x0=x-w/2,x1=x+w/2,y0=position-1.50,y1=position+.22;
    return new Float32Array([
      x0,y0,z,0,0, x1,y0,z,1,0, x1,y1,z,1,1,
      x0,y0,z,0,0, x1,y1,z,1,1, x0,y1,z,0,1
    ]);
  }
  function create({stage,view}={}){
    if(!stage||!view)throw Error('School must mount inside the actual game');
    const original=stage.querySelector('#source');
    const canvas=document.createElement('canvas');
    canvas.id='school-room-surface';
    canvas.hidden=true;
    canvas.setAttribute('aria-label','方正五面三维教室，真实空间透视的课桌椅和窗户');
    original.insertAdjacentElement('afterend',canvas);
    const gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,
      powerPreference:'low-power',preserveDrawingBuffer:true});
    let renderer='not-initialized',error=null,active=false,frame=0,fallStart=0,fallTriggerCount=0,heldFallFrame=null,lastFrameKey='';
    const worldFaceData=textureFaces();
    const pt={},textures={},sprites={},faceGPU={},furnitureTextures={},furnitureGPU={};
    const exteriorTextures={},exteriorGPU={};
    let tprogram=null,fallGPU=null,fallTexture=null,ready=0;
    function compile(type,code){
      const obj=gl.createShader(type);gl.shaderSource(obj,code);gl.compileShader(obj);
      if(!gl.getShaderParameter(obj,gl.COMPILE_STATUS))
        throw Error('School shader compile: '+gl.getShaderInfoLog(obj));
      return obj;
    }
    function link(vsrc,fsrc){
      const v=compile(gl.VERTEX_SHADER,vsrc),f=compile(gl.FRAGMENT_SHADER,fsrc);
      const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);
      gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('School shader link');
      return p;
    }
    function mesh(data){
      const gpu=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,gpu);
      gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      return {gpu,count:data.length/5};
    }
    function loadTexture(src,onLoaded=null){
      const item={src,ready:false,texture:gl.createTexture(),sourcePixels:null};
      gl.bindTexture(gl.TEXTURE_2D,item.texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      const image=new Image();
      image.onload=()=>{
        try{
          gl.bindTexture(gl.TEXTURE_2D,item.texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
          if(gl.getError()!==gl.NO_ERROR)throw Error('GPU texture upload');
          item.sourcePixels={width:image.naturalWidth,height:image.naturalHeight};
          if(onLoaded)onLoaded(image,item);
          item.ready=true;ready++;lastFrameKey='';
        }catch(e){item.error=String(e);}
      };
      image.onerror=()=>item.error='Failed to load '+src;
      image.src=src;return item;
    }
    function setup(){
      if(!gl){renderer='missing-webgl';return;}
      tprogram=link(TVS,TFS);
      pt.pos=gl.getAttribLocation(tprogram,'a_position');
      pt.uv=gl.getAttribLocation(tprogram,'a_uv');
      pt.camera=gl.getUniformLocation(tprogram,'u_camera');
      pt.angles=gl.getUniformLocation(tprogram,'u_angles');
      pt.tan=gl.getUniformLocation(tprogram,'u_tan');
      pt.light=gl.getUniformLocation(tprogram,'u_light');
      pt.tex=gl.getUniformLocation(tprogram,'u_tex');
      pt.sprite=gl.getUniformLocation(tprogram,'u_sprite');
      fallGPU=mesh(fallingSprite(4.12));
      fallTexture=loadTexture(FALL_MATERIAL);
      for(const [id,src] of Object.entries(EXTERIOR_MATERIALS)){
        exteriorTextures[id]=loadTexture(src);
        exteriorGPU[id]=mesh(EXTERIOR_QUADS[id]);
      }
      for(const [id,data] of Object.entries(worldFaceData))faceGPU[id]=mesh(data);
      for(const [id,src] of Object.entries(MATERIALS))textures[id]=loadTexture(src);
      for(const [id,src] of Object.entries(FURNITURE_MATERIALS)){
        furnitureTextures[id]=loadTexture(src);
        furnitureGPU[id]=mesh(new Float32Array(furnitureSurfaces[id]));
      }
      for(const actor of ACTORS){
        const slot={...mesh(spriteGeometry(actor)),fit:null};
        slot.texture=loadTexture(actor.src,(image,item)=>{
          const ink=measurePortraitInk(image);
          const fit=portraitPlacement(actor,item.sourcePixels,ink);
          gl.bindBuffer(gl.ARRAY_BUFFER,slot.gpu);
          gl.bufferData(gl.ARRAY_BUFFER,
            spriteGeometry(actor,item.sourcePixels,ink),gl.STATIC_DRAW);
          slot.fit=fit;
        });
        sprites[actor.id]=slot;
      }
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      renderer='webgl-five-face-room';
      canvas.addEventListener('webglcontextlost',evt=>{
        evt.preventDefault();error='WebGL context lost';renderer='context-lost';
      });
    }
    try{setup()}catch(e){renderer='error';error=String(e);console.warn('School 2.5D:',e);}
    function uniforms(cam,w,h,prog,loc){
      gl.useProgram(prog);
      const focal=Math.min(w,h*16/9)/(2*Math.tan(cam.hFov*Math.PI/360));
      gl.uniform3f(loc.camera,cam.x,cam.y,cam.z);
      gl.uniform2f(loc.angles,cam.yaw,cam.pitch);
      gl.uniform2f(loc.tan,w/(2*focal),h/(2*focal));
    }
    function textureDraw(tex,mesh,cam,w,h,light,isSprite=false){
      if(!tex?.ready)return;
      uniforms(cam,w,h,tprogram,pt);gl.uniform3f(pt.light,...light);
      gl.uniform1f(pt.sprite,isSprite?1:0);
      gl.activeTexture(gl.TEXTURE0);gl.uniform1i(pt.tex,0);
      gl.bindTexture(gl.TEXTURE_2D,tex.texture);
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.gpu);
      gl.enableVertexAttribArray(pt.pos);gl.enableVertexAttribArray(pt.uv);
      gl.vertexAttribPointer(pt.pos,3,gl.FLOAT,false,20,0);
      gl.vertexAttribPointer(pt.uv,2,gl.FLOAT,false,20,12);
      gl.drawArrays(gl.TRIANGLES,0,mesh.count);
      gl.disableVertexAttribArray(pt.pos);gl.disableVertexAttribArray(pt.uv);
    }
    function visibleActors(life){
      const day=life?.day||1;
      return ACTORS.filter(a=>!a.ends||day<=a.ends);
    }
    function render(px=0,py=0,life=null){
      if(!active||!gl||!tprogram||error)return false;
      const w=stage.clientWidth,h=stage.clientHeight;
      if(w<1||h<1)return false;
      const ratio=Math.min(1.5,window.devicePixelRatio||1,Math.sqrt(2200000/w/h));
      const bw=Math.max(1,Math.round(w*ratio)),bh=Math.max(1,Math.round(h*ratio));
      if(canvas.width!==bw)canvas.width=bw;
      if(canvas.height!==bh)canvas.height=bh;
      const cam=camera(px,py),s=life||window.PaperWorldDailyLifeUI?.snapshot?.();
      // The witness reflexively turns towards the window only AFTER the fall.
      // Walls, desks, people and shadow share one fixed-position pinhole.
      const fallTime=heldFallFrame!==null?heldFallFrame:
        (fallStart?(performance.now()-fallStart)/1120:0);
      if(fallStart||heldFallFrame!==null){
        const react=clamp((fallTime-.05)/.25,0,1)*
          clamp((1.42-fallTime)/.22,0,1);
        cam.yaw-=react*.25;cam.pitch+=react*.012;
      }
      const fallFrame=heldFallFrame!==null?'frozen-'+heldFallFrame:
        fallStart?Math.floor(fallTime*52):'none';
      const fingerprint=[bw,bh,ready,s?.day||1,cam.yaw.toFixed(3),
        cam.pitch.toFixed(3),fallFrame].join('|');
      // No WebGL redraws while the head is stationary, no assets changed
      // and no event is running. Existing fluid fog animates independently.
      if(fingerprint===lastFrameKey)return true;
      lastFrameKey=fingerprint;
      gl.viewport(0,0,bw,bh);
      gl.clearColor(.44,.47,.47,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      try{
        // Independent hand-painted sky & distant building. Both are transparent
        // or opaque 2D materials on planes BEHIND the cut-out window wall.
        textureDraw(exteriorTextures.sky,exteriorGPU.sky,cam,w,h,[1,1,1]);
        textureDraw(exteriorTextures.facade,exteriorGPU.facade,cam,w,h,[1,1,1]);
        const shades={back:[.92,.95,.96],floor:[.9,.93,.95],
          ceiling:[.83,.86,.89],left:[1,1,1],right:[.86,.91,.95]};
        for(const id of Object.keys(MATERIALS))
          textureDraw(textures[id],faceGPU[id],cam,w,h,shades[id]);
        // Every classroom prop is a single hand-painted 2D standee.
        // The five real planes still determine perspective and occlusion.
        for(const [id,geo] of Object.entries(furnitureGPU))
          textureDraw(furnitureTextures[id],geo,cam,w,h,[.94,.95,.95]);
        for(const actor of visibleActors(s)){
          const sprite=sprites[actor.id];
          textureDraw(sprite.texture,sprite,cam,w,h,[.92,.94,.96],true);
        }
        if(fallStart||heldFallFrame!==null){
          const t=heldFallFrame!==null?heldFallFrame:(performance.now()-fallStart)/1120;
          if(t>=1.3&&heldFallFrame===null)fallStart=0;
          else{
            const fallVertices=fallingSprite(4.12-6.5*t*t);
            gl.bindBuffer(gl.ARRAY_BUFFER,fallGPU.gpu);
            gl.bufferData(gl.ARRAY_BUFFER,fallVertices,gl.DYNAMIC_DRAW);
            textureDraw(fallTexture,fallGPU,cam,w,h,[.88,.90,.92]);
          }
        }
        if(gl.getError()!==gl.NO_ERROR)throw Error('School GL draw');
        frame++;
      }catch(e){error=String(e);console.warn('School 2.5D render:',e);return false;}
      return true;
    }
    function setActive(value){
      active=!!value;canvas.hidden=!active;
      view.classList.toggle('school-room-active',active);
      lastFrameKey='';if(active)render(0,0);else {fallStart=0;heldFallFrame=null;}
    }
    function triggerFall(){
      if(!active)return false;
      heldFallFrame=null;fallStart=performance.now();fallTriggerCount++;lastFrameKey='';render();return true;
    }
    function inspect(){return {
      active,renderer,error,frame,room:ROOM,
      faces:Object.keys(faces),deskCount:CLASSROOM_LAYOUT.desks,
      chairCount:CLASSROOM_LAYOUT.chairs,
      classroomLayout:CLASSROOM_LAYOUT,
      propRendering:'painted-2d-standees',
      propCount:CLASSROOM_LAYOUT.desks+CLASSROOM_LAYOUT.chairs+1,
      propTriangles:Object.fromEntries(Object.entries(furnitureSurfaces).map(
        ([id,verts])=>[id,verts.length/15])),
      furnitureTextures:Object.fromEntries(
        Object.entries(furnitureTextures).map(([id,entry])=>
          [id,{src:entry.src,ready:entry.ready,error:entry.error||null}])),
      exterior:{...EXTERIOR,geometryTriangles:4,mode:'textured-2d-planes',
        materials:Object.fromEntries(Object.entries(exteriorTextures).map(
          ([id,entry])=>[id,{src:entry.src,ready:entry.ready,error:entry.error||null}]))},
      fallingTexture:fallTexture?{src:fallTexture.src,ready:fallTexture.ready,error:fallTexture.error||null}:null,
      geometryPolicy:'textured-2d-planes-only',
      solidMeshes:0,
      textureCount:ready,expectedTextures:5+ACTORS.length+
        Object.keys(FURNITURE_MATERIALS).length+
        Object.keys(EXTERIOR_MATERIALS).length+1,
      faceTextures:Object.fromEntries(Object.entries(textures).map(([id,entry])=>
        [id,{src:entry.src,ready:entry.ready,error:entry.error||null}])),
      visibleActors:active?visibleActors(window.PaperWorldDailyLifeUI?.snapshot?.()).map(a=>a.id):[],
      actorArtwork:Object.fromEntries(ACTORS.map(a=>{
        const slot=sprites[a.id];
        return [a.id,{source:a.src,physicalHeight:a.h,
          sourcePixels:slot?.texture?.sourcePixels||null,
          fit:slot?.fit||null,ready:!!slot?.texture?.ready}];
      })),
      fallActive:fallStart>0,fallTriggerCount,heldFallFrame
    };}
    function holdFallFrame(t){
      // QA captures a paused actual rendered animation frame, not a mockup.
      if(new URLSearchParams(window.location.search).get('storyCapture')!=='1')
        return false;
      heldFallFrame=clamp(Number(t)||.55,.05,1.15);
      fallStart=performance.now();lastFrameKey='';render(0,0);return true;
    }
    function releaseFallFrame(){heldFallFrame=null;return true;}
    return Object.freeze({setActive,triggerFall,holdFallFrame,releaseFallFrame,
      render,inspect,get canvas(){return canvas}});
  }
  return Object.freeze({ROOM,MATERIALS,FURNITURE_MATERIALS,EXTERIOR_MATERIALS,
    FALL_MATERIAL,CLASSROOM_LAYOUT,ACTORS,EXTERIOR,
    portraitPlacement,camera,project,create});
});