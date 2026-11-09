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
    back:'./assets/school-room/back.svg',floor:'./assets/school-room/floor.svg',
    ceiling:'./assets/school-room/ceiling.svg',left:'./assets/school-room/left.svg',
    right:'./assets/school-room/right.svg'
  });
  const ACTORS=Object.freeze([
    {id:'boy',src:'./assets/school-room/small-boy.svg',x:-.76,z:4.55,h:1.70,ends:5},
    {id:'girl',src:'./assets/school-room/class-idol.svg',x:-1.75,z:4.43,h:1.73,ends:1},
    {id:'female2',src:'./assets/characters/civilians/schoolgirls/sg01/front.png',x:2.48,z:5.18,h:1.72},
    {id:'male1',src:'./assets/characters/char-003/front.png',x:-3.43,z:6.20,h:1.79},
    {id:'male2',src:'./assets/characters/char-016/front.png',x:3.30,z:6.10,h:1.80},
    {id:'extra2',src:'./assets/characters/civilians/npc-c002/front.png',x:1.04,z:4.82,h:1.78},
  ]);
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  function camera(px=0,py=0){
    const axis=t=>{
      const v=clamp(Number(t)||0,-1,1),m=Math.abs(v);
      if(m<.13)return 0;const s=(m-.13)/.87;
      return Math.sign(v)*s*s*(3-2*s);
    };
    return {x:.10,y:1.58,z:-1.45,hFov:67,yaw:axis(px)*.085,
      pitch:-.013-axis(py)*.039};
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
  const VS='attribute vec3 a_position;attribute vec4 a_color;'+uniforms+
    'varying vec4 v_color;void main(){'+projectionShader+'v_color=a_color;}';
  const FS='precision mediump float;varying vec4 v_color;void main(){gl_FragColor=v_color;}';
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
  const color=(v,a=1)=>{
    const n=parseInt(v.slice(1),16);
    return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255,a];
  };
  const solids=[];
  function quad(a,b,c,d,tone){
    const rgba=typeof tone==='string'?color(tone):tone;
    for(const v of [a,b,c,a,c,d])solids.push(...v,...rgba);
  }
  function cuboid(x,z,w,d,y0,y1,tones){
    const xl=x-w/2,xr=x+w/2,z0=z-d/2,z1=z+d/2;
    quad([xl,y1,z0],[xr,y1,z0],[xr,y1,z1],[xl,y1,z1],tones[0]);
    quad([xl,y0,z0],[xr,y0,z0],[xr,y1,z0],[xl,y1,z0],tones[1]);
    quad([xr,y0,z0],[xr,y0,z1],[xr,y1,z1],[xr,y1,z0],tones[2]);
    quad([xl,y0,z1],[xr,y0,z1],[xr,y1,z1],[xl,y1,z1],tones[1]);
    quad([xl,y0,z0],[xl,y0,z1],[xl,y1,z1],[xl,y1,z0],tones[2]);
  }
  function oval(x,z,rx,rz){
    const c=color('#303b42',.13);
    for(let i=0;i<18;i++){
      const t=i*Math.PI/9,u=(i+1)*Math.PI/9;
      solids.push(x,.008,z,...c,x+rx*Math.cos(t),.008,z+rz*Math.sin(t),...c,
        x+rx*Math.cos(u),.008,z+rz*Math.sin(u),...c);
    }
  }
  function desk(x,z,n){
    const wood=['#baa58f','#b09a83','#c0a88e','#b8a08a'][n%4];
    oval(x,z,.69,.60);
    cuboid(x,z,1.04,.68,.705,.755,[wood,'#96816d','#85786c']);
    cuboid(x,z+.04,.87,.54,.57,.655,['#aa9681','#8c796a','#786e65']);
    for(const dx of [-.39,.39])for(const dz of [-.22,.22])
      cuboid(x+dx,z+dz,.052,.052,.05,.7,['#88939a','#637078','#5d6a71']);
    const chairZ=z-.63;oval(x,chairZ,.43,.33);
    cuboid(x,chairZ,.75,.45,.42,.50,['#657783','#52626d','#485863']);
    cuboid(x,chairZ-.185,.75,.073,.49,.95,['#71818b','#586874','#4d5d69']);
    for(const dx of [-.27,.27])for(const dz of [-.13,.15])
      cuboid(x+dx,chairZ+dz,.046,.046,.03,.43,['#899297','#637079','#5f6a72']);
  }
  const columns=[-3.58,-1.76,.06,1.88,3.7];
  const rows=[2.26,3.51,4.76,6.01,7.26];
  rows.forEach((z,i)=>columns.forEach((x,j)=>desk(x,z,i+j)));
  oval(.45,8.25,1.25,.63);
  cuboid(.48,8.29,1.50,.67,.03,.99,['#a38d76','#756a60','#6b635b']);
  cuboid(.48,7.96,1.60,.75,.98,1.045,['#b9a389','#9b8771','#8e7f6d']);
  cuboid(1.04,7.95,.32,.25,1.05,1.09,['#ddd5c4','#8b9c9f','#879596']);
  for(const z of [3.43,6.87])for(const x of [-2,2]){
    cuboid(x,z,1.55,.13,ROOM.height-.16,ROOM.height-.05,
      ['#d5d8d2','#aeb6b3','#a4ada9']);
    cuboid(x,z,1.41,.07,ROOM.height-.177,ROOM.height-.16,
      ['#f3f1e8','#e5e6dd','#d9dace']);
  }
  function textureFaces(){
    return Object.fromEntries(Object.entries(faces).map(([id,pts])=>{
      const arr=[];for(const i of [0,1,2,0,2,3])
        arr.push(...pts[i],...uvs[id][i]);
      return [id,new Float32Array(arr)];
    }));
  }
  function spriteGeometry(actor){
    const x=actor.x,z=actor.z,h=actor.h,w=h*.49,a=x-w/2,b=x+w/2;
    return new Float32Array([
      a,0,z,0,0,b,0,z,1,0,b,h,z,1,1,
      a,0,z,0,0,b,h,z,1,1,a,h,z,0,1
    ]);
  }
  function silhouette(position){
    const c=color('#222c37',.96),v=[],x=-4.64,z=7.65;
    function triangle(a,b,d){v.push(...a,...c,...b,...c,...d,...c);}
    function point(y,side){return [x+side,position+y,z];}
    for(let i=0;i<16;i++){
      let a=i*Math.PI/8,b=(i+1)*Math.PI/8;
      triangle(point(0,0),point(.17*Math.sin(a),.13*Math.cos(a)),
        point(.17*Math.sin(b),.13*Math.cos(b)));
    }
    const polygon=pts=>{
      for(let i=1;i+1<pts.length;i++)
        triangle(point(...pts[0]),point(...pts[i]),point(...pts[i+1]));
    };
    polygon([[0,-.10],[-.33,-.10],[-.31,-.52],[.25,-.49]]);
    polygon([[-.25,-.36],[-.53,-.46],[-.46,-.59],[-.23,-.50]]);
    polygon([[.23,-.34],[.49,-.42],[.54,-.56],[.20,-.49]]);
    polygon([[-.30,-.47],[-.36,-.96],[-.20,-1.06],[-.05,-.49]]);
    polygon([[.07,-.48],[.05,-.99],[.21,-1.07],[.28,-.48]]);
    return new Float32Array(v);
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
      powerPreference:'low-power',preserveDrawingBuffer:false});
    let renderer='not-initialized',error=null,active=false,frame=0,fallStart=0,heldFallFrame=null;
    const props=new Float32Array(solids),worldFaceData=textureFaces();
    const pc={},pt={},textures={},sprites={},faceGPU={};
    let program=null,tprogram=null,colorGPU=null,fallGPU=null,ready=0;
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
    function loadTexture(src){
      const item={src,ready:false,texture:gl.createTexture()};
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
          item.ready=true;ready++;
        }catch(e){item.error=String(e);}
      };
      image.onerror=()=>item.error='Failed to load '+src;
      image.src=src;return item;
    }
    function setup(){
      if(!gl){renderer='missing-webgl';return;}
      program=link(VS,FS);tprogram=link(TVS,TFS);
      pc.pos=gl.getAttribLocation(program,'a_position');
      pc.color=gl.getAttribLocation(program,'a_color');
      pt.pos=gl.getAttribLocation(tprogram,'a_position');
      pt.uv=gl.getAttribLocation(tprogram,'a_uv');
      for(const [obj,prog] of [[pc,program],[pt,tprogram]]){
        obj.camera=gl.getUniformLocation(prog,'u_camera');
        obj.angles=gl.getUniformLocation(prog,'u_angles');
        obj.tan=gl.getUniformLocation(prog,'u_tan');
      }
      pt.light=gl.getUniformLocation(tprogram,'u_light');
      pt.tex=gl.getUniformLocation(tprogram,'u_tex');
      pt.sprite=gl.getUniformLocation(tprogram,'u_sprite');
      colorGPU=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,colorGPU);
      gl.bufferData(gl.ARRAY_BUFFER,props,gl.STATIC_DRAW);
      fallGPU=gl.createBuffer();
      for(const [id,data] of Object.entries(worldFaceData))faceGPU[id]=mesh(data);
      for(const [id,src] of Object.entries(MATERIALS))textures[id]=loadTexture(src);
      for(const actor of ACTORS)
        sprites[actor.id]={texture:loadTexture(actor.src),...mesh(spriteGeometry(actor))};
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
    function solidDraw(gpu,count,cam,w,h){
      uniforms(cam,w,h,program,pc);
      gl.bindBuffer(gl.ARRAY_BUFFER,gpu);
      gl.enableVertexAttribArray(pc.pos);gl.enableVertexAttribArray(pc.color);
      gl.vertexAttribPointer(pc.pos,3,gl.FLOAT,false,28,0);
      gl.vertexAttribPointer(pc.color,4,gl.FLOAT,false,28,12);
      gl.drawArrays(gl.TRIANGLES,0,count);
      gl.disableVertexAttribArray(pc.pos);gl.disableVertexAttribArray(pc.color);
    }
    function visibleActors(life){
      const day=life?.day||1;
      return ACTORS.filter(a=>!a.ends||day<=a.ends);
    }
    function render(px=0,py=0,life=null){
      if(!active||!gl||!program||error)return false;
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
      gl.viewport(0,0,bw,bh);
      gl.clearColor(.44,.47,.47,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      try{
        const shades={back:[.92,.95,.96],floor:[.9,.93,.95],
          ceiling:[.83,.86,.89],left:[1,1,1],right:[.86,.91,.95]};
        for(const id of Object.keys(MATERIALS))
          textureDraw(textures[id],faceGPU[id],cam,w,h,shades[id]);
        solidDraw(colorGPU,props.length/7,cam,w,h);
        for(const actor of visibleActors(s)){
          const sprite=sprites[actor.id];
          textureDraw(sprite.texture,sprite,cam,w,h,[.92,.94,.96],true);
        }
        if(fallStart||heldFallFrame!==null){
          const t=heldFallFrame!==null?heldFallFrame:(performance.now()-fallStart)/1120;
          if(t>=1.3&&heldFallFrame===null)fallStart=0;
          else{
            const silhouetteData=silhouette(4.12-6.5*t*t);
            gl.bindBuffer(gl.ARRAY_BUFFER,fallGPU);
            gl.bufferData(gl.ARRAY_BUFFER,silhouetteData,gl.DYNAMIC_DRAW);
            solidDraw(fallGPU,silhouetteData.length/7,cam,w,h);
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
      if(active)render(0,0);else {fallStart=0;heldFallFrame=null;}
    }
    function triggerFall(){
      if(!active)return false;
      heldFallFrame=null;fallStart=performance.now();render();return true;
    }
    function inspect(){return {
      active,renderer,error,frame,room:ROOM,
      faces:Object.keys(faces),deskCount:25,chairCount:25,
      textureCount:ready,expectedTextures:5+ACTORS.length,
      visibleActors:active?visibleActors(window.PaperWorldDailyLifeUI?.snapshot?.()).map(a=>a.id):[],
      fallActive:fallStart>0,heldFallFrame
    };}
    function holdFallFrame(t){
      // QA captures a paused actual rendered animation frame, not a mockup.
      if(new URLSearchParams(window.location.search).get('storyCapture')!=='1')
        return false;
      heldFallFrame=clamp(Number(t)||.55,.05,1.15);
      fallStart=performance.now();render(0,0);return true;
    }
    function releaseFallFrame(){heldFallFrame=null;return true;}
    return Object.freeze({setActive,triggerFall,holdFallFrame,releaseFallFrame,
      render,inspect,get canvas(){return canvas}});
  }
  return Object.freeze({ROOM,MATERIALS,ACTORS,camera,project,create});
});