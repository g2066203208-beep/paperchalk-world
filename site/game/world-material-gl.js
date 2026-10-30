/* Shared WebGL1 material pipeline: real UV-mapped surfaces, one 64x32 atlas,
 * 16x16 integer texels, NEAREST filtering and texel-center sampling.
 */
import {atlasRGBA} from '../world-builder/materials-core.js';
function makeProgram(gl,vertex,fragment){
 const shader=(type,src)=>{
  const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
  return s;
 };
 const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
 gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 return program;
}
const FRAGMENT=[
 'precision mediump float;',
 'varying vec2 vUV;varying float vMaterial;',
 'uniform sampler2D uAtlas;',
 'void main(){',
 '  vec2 local=floor(fract(vUV)*16.0);',
 '  float column=mod(floor(vMaterial+0.5),4.0);',
 '  float row=floor((vMaterial+0.5)/4.0);',
 '  vec2 atlasPixel=vec2(column*16.0+local.x+0.5,32.0-(row*16.0+local.y+0.5));',
 '  gl_FragColor=texture2D(uAtlas,atlasPixel/vec2(64.0,32.0));',
 '}'
].join('\n');
function makeTexture(gl,pack){
 const atlas=atlasRGBA(pack,true),tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,atlas.width,atlas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,atlas.rgba);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 return tex;
}
export function createMaterialBatch(gl,mesh,pack,mode='world'){
 const vert=mode==='world'?
  ['attribute vec3 aPosition;attribute vec2 aUV;attribute float aMaterial;',
   'uniform mat4 uView;varying vec2 vUV;varying float vMaterial;',
   'void main(){gl_Position=uView*vec4(aPosition,1.0);vUV=aUV;vMaterial=aMaterial;}'].join('\n'):
  ['attribute vec3 aPosition;attribute vec2 aUV;attribute float aMaterial;',
   'uniform float uYaw;uniform float uPitch;uniform float uAspect;',
   'varying vec2 vUV;varying float vMaterial;',
   'void main(){',
   'float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);',
   'vec3 p=vec3(cy*aPosition.x+sy*aPosition.z,aPosition.y,-sy*aPosition.x+cy*aPosition.z);',
   'p=vec3(p.x,cp*p.y-sp*p.z,sp*p.y+cp*p.z);',
   'float z=4.25-p.z;',
   'gl_Position=vec4(p.x*2.2/uAspect,p.y*2.2,z*1.05-0.35,z);',
   'vUV=aUV;vMaterial=aMaterial;',
   '}'].join('\n');
 const program=makeProgram(gl,vert,FRAGMENT),texture=makeTexture(gl,pack);
 const loc={position:gl.getAttribLocation(program,'aPosition'),uv:gl.getAttribLocation(program,'aUV'),
  material:gl.getAttribLocation(program,'aMaterial'),atlas:gl.getUniformLocation(program,'uAtlas'),
  view:gl.getUniformLocation(program,'uView'),yaw:gl.getUniformLocation(program,'uYaw'),
  pitch:gl.getUniformLocation(program,'uPitch'),aspect:gl.getUniformLocation(program,'uAspect')};
 function buffer(data){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return b}
 const buffers=[buffer(mesh.position),buffer(mesh.uv),buffer(mesh.id)];
 const count=mesh.position.length/3;
 function bindAttribute(buffer,loc,size){
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);
 }
 function render(params){
  gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.uniform1i(loc.atlas,0);
  bindAttribute(buffers[0],loc.position,3);bindAttribute(buffers[1],loc.uv,2);bindAttribute(buffers[2],loc.material,1);
  if(mode==='world')gl.uniformMatrix4fv(loc.view,false,params.matrix);
  else{gl.uniform1f(loc.yaw,params.yaw);gl.uniform1f(loc.pitch,params.pitch);gl.uniform1f(loc.aspect,params.aspect)}
  gl.drawArrays(gl.TRIANGLES,0,count);
 }
 function destroy(){buffers.forEach(b=>gl.deleteBuffer(b));gl.deleteTexture(texture);gl.deleteProgram(program)}
 return {render,destroy,count};
}
export function cubeMaterialMesh(material=0){
 const p=[],uv=[],id=[];
 const push=(a,b,c,d)=>{
  const coords=[a,b,c,a,c,d],tex=[[0,0],[2,0],[2,2],[0,0],[2,2],[0,2]];
  coords.forEach((point,i)=>{p.push(...point);uv.push(...tex[i]);id.push(material)});
 };
 const n=-1,s=1;
 push([n,n,s],[s,n,s],[s,s,s],[n,s,s]); // front
 push([s,n,n],[n,n,n],[n,s,n],[s,s,n]); // back
 push([n,n,n],[n,n,s],[n,s,s],[n,s,n]); // left
 push([s,n,s],[s,n,n],[s,s,n],[s,s,s]); // right
 push([n,s,s],[s,s,s],[s,s,n],[n,s,n]); // top
 push([n,n,n],[s,n,n],[s,n,s],[n,n,s]); // bottom
 return {position:new Float32Array(p),uv:new Float32Array(uv),id:new Float32Array(id)};
}
export function createMaterialCube(canvas,pack,material=0){
 const gl=canvas.getContext('webgl',{antialias:false,alpha:false,depth:true,preserveDrawingBuffer:true});
 if(!gl)throw Error('设备不支持 WebGL 材质预览');
 gl.disable(gl.DITHER);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 let batch=createMaterialBatch(gl,cubeMaterialMesh(material),pack,'preview');
 let yaw=.63,pitch=-.30,last=null;
 function draw(){
  const dpr=Math.min(2,window.devicePixelRatio||1),width=Math.max(1,Math.floor(canvas.clientWidth*dpr)),height=Math.max(1,Math.floor(canvas.clientHeight*dpr));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
  gl.viewport(0,0,width,height);gl.clearColor(57/255,54/255,87/255,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  batch.render({yaw,pitch,aspect:width/height});
 }
 function update(nextPack,nextMaterial){
  batch.destroy();batch=createMaterialBatch(gl,cubeMaterialMesh(nextMaterial),nextPack,'preview');draw();
 }
 const down=e=>{last={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)};
 const move=e=>{if(!last||e.pointerId!==last.id)return;
  yaw+=(e.clientX-last.x)*.009;pitch=Math.max(-1.2,Math.min(1.2,pitch+(e.clientY-last.y)*.009));
  last.x=e.clientX;last.y=e.clientY;draw();
 };
 const up=e=>{if(last?.id===e.pointerId)last=null};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
 canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 return {draw,update,destroy(){batch.destroy();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up)}};
}
