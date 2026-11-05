/* 3D cylindrical background: fixed mesh + projective texture + camera yaw/pitch.
 * Original image remains unchanged at neutral view, and is the safe fallback.
 * Other game layers, effects and scene/save logic are not touched.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PaperWorldCylinderBackground=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const HALF_FOV_X=39*Math.PI/180;
  const MAX_YAW=6*Math.PI/180;
  const MAX_PITCH=4.6*Math.PI/180;
  const SEGMENTS=160;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function buildCylinderMesh(halfHeight,segments=SEGMENTS){
    const data=new Float32Array(segments*18);
    for(let i=0;i<segments;i++){
      const a=-Math.PI*.49+Math.PI*.98*i/segments;
      const b=-Math.PI*.49+Math.PI*.98*(i+1)/segments;
      const x0=Math.sin(a),z0=-Math.cos(a);
      const x1=Math.sin(b),z1=-Math.cos(b);
      data.set([x0,-halfHeight,z0,x1,-halfHeight,z1,x0,halfHeight,z0,
        x0,halfHeight,z0,x1,-halfHeight,z1,x1,halfHeight,z1],i*18);
    }
    return data;
  }
  // Original virtual camera samples exactly the original artwork at zero yaw.
  function projectUV(point,tanX,tanY,frameAspect=16/9,imageAspect=16/9){
    const d=-point.z;
    const sx=.5+point.x/(2*d*tanX);
    const sy=.5+point.y/(2*d*tanY);
    return {
      u:.5+(sx-.5)*Math.max(1,frameAspect/imageAspect),
      v:.5+(sy-.5)*Math.max(1,imageAspect/frameAspect)
    };
  }
  const VERT=[
    'attribute vec3 a_world;',
    'uniform vec2 u_tanHalf;',
    'uniform vec2 u_camera;',
    'varying vec3 v_world;',
    'void main(){',
    'float cy=cos(u_camera.x),sy=sin(u_camera.x);',
    'float cp=cos(u_camera.y),sp=sin(u_camera.y);',
    'float x=cy*a_world.x+sy*a_world.z;',
    'float z=-sy*a_world.x+cy*a_world.z;',
    'float y=cp*a_world.y+sp*z;',
    'float depth=sp*a_world.y-cp*z;',
    'gl_Position=vec4(x/u_tanHalf.x,y/u_tanHalf.y,depth*0.5,depth);',
    'v_world=a_world;',
    '}'
  ].join('\n');
  const FRAG=[
    'precision highp float;',
    'uniform sampler2D u_image;',
    'uniform vec2 u_tanHalf;',
    'uniform vec2 u_uvScale;',
    'varying vec3 v_world;',
    'void main(){',
    'float depth=-v_world.z;',
    'vec2 uv=vec2(0.5+v_world.x/(depth*2.0*u_tanHalf.x),',
    '0.5+v_world.y/(depth*2.0*u_tanHalf.y));',
    'uv=(uv-0.5)*u_uvScale+0.5;',
    'if(uv.x<=0.0||uv.x>=1.0||uv.y<=0.0||uv.y>=1.0){',
    'gl_FragColor=vec4(0.0,0.0,0.0,1.0);return;}',
    'float edge=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));',
    'float feather=smoothstep(0.0,0.012,edge);',
    'vec4 col=texture2D(u_image,uv);',
    'gl_FragColor=vec4(col.rgb*feather,1.0);',
    '}'
  ].join('\n');
  function create({stage,source}={}){
    if(!stage||!source)throw new Error('Cylinder needs #scene and #source');
    const canvas=document.createElement('canvas');
    canvas.className='scene-cylinder-surface';
    canvas.setAttribute('aria-hidden','true');
    canvas.hidden=true;
    source.insertAdjacentElement('afterend',canvas);
    let gl=null,program=null,vertexBuffer=null,texture=null,vertexCount=0;
    let pos=-1,tanHalfLoc=null,cameraLoc=null,uvScaleLoc=null,imageLoc=null;
    let enabled=false,ready=false,frames=0,textureKey='';
    let yaw=0,pitch=0,drawnYaw=NaN,drawnPitch=NaN;
    let width=0,height=0,failureReason='not-ready';
    function showSource(reason){
      ready=false;failureReason=reason;
      source.classList.remove('scene-cylinder-source-hidden');
      canvas.hidden=true;
      stage.dataset.backgroundSurface='flat-fallback';
    }
    function compile(type,code){
      const sh=gl.createShader(type);
      if(!sh)throw Error('shader unavailable');
      gl.shaderSource(sh,code);gl.compileShader(sh);
      if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
        const message=gl.getShaderInfoLog(sh)||'shader compile failed';
        gl.deleteShader(sh);throw Error(message);
      }
      return sh;
    }
    function setup(){
      if(!gl)gl=canvas.getContext('webgl',{
        alpha:false,antialias:true,depth:false,stencil:false,
        preserveDrawingBuffer:false,powerPreference:'low-power'
      });
      if(!gl)throw Error('WebGL unavailable');
      const vert=compile(gl.VERTEX_SHADER,VERT);
      const frag=compile(gl.FRAGMENT_SHADER,FRAG);
      const p=gl.createProgram();
      if(!p)throw Error('program unavailable');
      gl.attachShader(p,vert);gl.attachShader(p,frag);
      gl.linkProgram(p);
      gl.deleteShader(vert);gl.deleteShader(frag);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(p)||'link failed');
      program=p;
      pos=gl.getAttribLocation(program,'a_world');
      tanHalfLoc=gl.getUniformLocation(program,'u_tanHalf');
      cameraLoc=gl.getUniformLocation(program,'u_camera');
      uvScaleLoc=gl.getUniformLocation(program,'u_uvScale');
      imageLoc=gl.getUniformLocation(program,'u_image');
      vertexBuffer=gl.createBuffer();texture=gl.createTexture();
      if(!vertexBuffer||!texture||pos<0)throw Error('mesh unavailable');
      gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
      const tanY=Math.tan(HALF_FOV_X)/(16/9);
      const mesh=buildCylinderMesh(1.65*tanY);
      vertexCount=mesh.length/3;
      gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.disable(gl.CULL_FACE);gl.disable(gl.DEPTH_TEST);
      gl.clearColor(0,0,0,1);
      textureKey='';
    }
    function draw(force=false){
      if(!enabled||!source.complete||!source.naturalWidth||
          !source.naturalHeight)return false;
      const cssW=stage.clientWidth,cssH=stage.clientHeight;
      if(cssW<1||cssH<1)return false;
      try{
        if(!gl||!program)setup();
        const dpi=Math.min(1.5,window.devicePixelRatio||1,
          Math.sqrt(2073600/(cssW*cssH)));
        const w=Math.max(1,Math.round(cssW*dpi));
        const h=Math.max(1,Math.round(cssH*dpi));
        const resized=canvas.width!==w||canvas.height!==h;
        const key=source.currentSrc||source.src;
        if(!force&&!resized&&ready&&textureKey===key&&
          Math.abs(yaw-drawnYaw)<0.00012&&
          Math.abs(pitch-drawnPitch)<0.00012)return true;
        if(resized){canvas.width=w;canvas.height=h}
        const sizeLimit=gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if(source.naturalWidth>sizeLimit||source.naturalHeight>sizeLimit)
          throw Error('image exceeds GPU texture limit');
        gl.bindTexture(gl.TEXTURE_2D,texture);
        if(textureKey!==key){
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
          if(gl.getError()!==gl.NO_ERROR)throw Error('texture upload failed');
          textureKey=key;
        }
        gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        const frameAspect=cssW/cssH;
        const tanX=Math.tan(HALF_FOV_X);
        const tanY=tanX/frameAspect;
        const imageAspect=source.naturalWidth/source.naturalHeight;
        gl.uniform2f(tanHalfLoc,tanX,tanY);
        gl.uniform2f(cameraLoc,yaw,pitch);
        gl.uniform2f(uvScaleLoc,
          Math.max(1,frameAspect/imageAspect),
          Math.max(1,imageAspect/frameAspect));
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.uniform1i(imageLoc,0);
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos,3,gl.FLOAT,false,0,0);
        gl.drawArrays(gl.TRIANGLES,0,vertexCount);
        if(gl.getError()!==gl.NO_ERROR)throw Error('GPU draw failed');
        canvas.hidden=false;
        source.classList.add('scene-cylinder-source-hidden');
        stage.dataset.backgroundSurface='cylinder-webgl';
        failureReason='';
        ready=true;frames++;width=w;height=h;
        drawnYaw=yaw;drawnPitch=pitch;
        return true;
      }catch(error){
        showSource(String(error?.message||error));
        return false;
      }
    }
    function setScene(name){
      enabled=name!=='menu';
      if(!enabled){showSource('menu-flat');return}
      showSource('loading-image');draw(true);
    }
    function setView(x=0,y=0){
      yaw=clamp(x,-1,1)*MAX_YAW;
      pitch=clamp(y,-1,1)*MAX_PITCH;
      return draw();
    }
    source.addEventListener('load',()=>{
      if(enabled){textureKey='';showSource('image-updated');draw(true)}
    });
    source.addEventListener('error',()=>showSource('source-load-error'));
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();gl=null;program=null;
      showSource('webgl-context-lost');
    });
    canvas.addEventListener('webglcontextrestored',()=>{
      gl=null;program=null;textureKey='';
      if(enabled)draw(true);
    });
    if(typeof ResizeObserver==='function'){
      new ResizeObserver(()=>{if(enabled)draw(true)}).observe(stage);
    }else window.addEventListener('resize',()=>draw(true),{passive:true});
    return Object.freeze({
      setScene,setView,refresh:()=>draw(true),
      inspect:()=>({
        enabled,ready,frames,width,height,
        renderer:ready?'webgl-3d-cylinder':'flat-fallback',
        reason:failureReason,segments:SEGMENTS,
        yawDegrees:yaw*180/Math.PI,pitchDegrees:pitch*180/Math.PI,
        source:source.currentSrc||source.src
      })
    });
  }
  return Object.freeze({create,buildCylinderMesh,projectUV,FOV:HALF_FOV_X*2,SEGMENTS});
});
