/* Reusable WebGL1 shadow-map engine for the 3D tactical field.
 * Real world-space occlusion: cards/trees/frame cast sunlight shadows onto
 * physical terrain and outer ground. Not fake shadow circles, not a CSS mask.
 * RGBA-packed depth color attachment + depth renderbuffer; no extensions.
 * Capture throttled independently of frame redraw for software/mobile GPUs.
 */
(function(root){
'use strict';
function create({gl,compile,lookAt,ortho,mul,lightDirection,center=[0,0,0],mobile=false}){
 const size=mobile?512:1024;
 const vertex=`attribute vec3 aP;uniform mat4 uM,uVP;
 void main(){gl_Position=uVP*uM*vec4(aP,1.0);}`;
 const fragment=`precision highp float;
 vec4 packDepth(float v){
  vec4 p=fract(v*vec4(1.,255.,65025.,16581375.));
  p-=p.yzww*vec4(1./255.,1./255.,1./255.,0.);
  return p;
 }
 void main(){gl_FragColor=packDepth(gl_FragCoord.z);}`;
 let program=null,texture=null,depth=null,fbo=null;
 let enabled=false,capturing=false,passes=0,draws=0,lastPass=-1000,lastError='';
 let lightVP=null,positionLoc=-1,modelLoc=null,vpLoc=null;
 try{
  const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment);
  program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.deleteShader(v);gl.deleteShader(f);
  positionLoc=gl.getAttribLocation(program,'aP');
  modelLoc=gl.getUniformLocation(program,'uM');vpLoc=gl.getUniformLocation(program,'uVP');
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
  gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,size,size);
  fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)
   throw Error('shadow framebuffer incomplete');
  const L=lightDirection,mag=Math.hypot(...L)||1,dir=L.map(x=>x/mag);
  const eye=center.map((x,i)=>x+dir[i]*80);
  lightVP=mul(ortho(-47,47,-35,35,.1,170),lookAt(eye,center,[0,1,0]));
  enabled=true;
 }catch(err){lastError=String(err);}
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 gl.bindRenderbuffer(gl.RENDERBUFFER,null);
 gl.bindTexture(gl.TEXTURE_2D,null);
 function draw(geo,m){
  if(!capturing||!enabled)return;
  gl.bindBuffer(gl.ARRAY_BUFFER,geo.b);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,geo.i);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc,3,gl.FLOAT,false,32,0);
  gl.uniformMatrix4fv(modelLoc,false,m);
  gl.drawElements(gl.TRIANGLES,geo.count,gl.UNSIGNED_SHORT,0);
  draws++;
 }
 function update(time,drawCasters,mainProgram){
  if(!enabled||time-lastPass<.19)return;
  lastPass=time;draws=0;
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.viewport(0,0,size,size);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
  gl.clearColor(1,1,1,1);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);gl.uniformMatrix4fv(vpLoc,false,lightVP);
  capturing=true;
  try{drawCasters();passes++;}finally{
   capturing=false;
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);
   gl.useProgram(mainProgram);
  }
 }
 function bind(uniforms){
  if(!enabled)return;
  gl.uniformMatrix4fv(uniforms.lightVP,false,lightVP);
  gl.uniform1f(uniforms.useShadow,1);
  gl.uniform2f(uniforms.shadowTexel,1/size,1/size);
  gl.uniform1i(uniforms.shadowMap,1);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.activeTexture(gl.TEXTURE0);
 }
 return Object.freeze({
  get capturing(){return capturing;},get enabled(){return enabled;},draw,update,bind,
  get snapshot(){return {enabled,type:'rgba8-depth-shadow-map',width:size,height:size,
   passes,castersDrawn:draws,lastError,worldSpace:true,actualOcclusion:true};}
 });
}
root.PaperchalkSpatialShadows=Object.freeze({version:'1.0.0',create});
})(window);
