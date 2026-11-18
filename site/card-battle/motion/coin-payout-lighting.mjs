/**
 * Paperchalk payout lighting & HDR post-processing.
 *
 * Reference implementation principles:
 * - three.js docs: MeshStandardMaterial, PMREMGenerator, post-processing and OutputPass;
 * - Filament PBR guide: roughness, metals, environment reflections;
 * - GPU Gems 3 and John Hable: scene-linear HDR, highlight extraction, glow, filmic mapping.
 *
 * Original shader implementation, no copied third-party shader code.
 * Set all light/mesh color in scene-linear Three.js; tone-map once at FINAL output.
 */
const VERTEX=String.raw`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
`;
const BRIGHT=String.raw`
precision highp float;
varying vec2 vUv;
uniform sampler2D tInput;
uniform float uThreshold;
uniform float uKnee;
void main(){
  vec3 c=texture2D(tInput,vUv).rgb;
  float l=max(c.r,max(c.g,c.b));
  float soft=clamp((l-uThreshold+uKnee)/(2.0*uKnee),0.0,1.0);
  float contribution=max(soft*soft*(3.0-2.0*soft)*uKnee, l-uThreshold);
  gl_FragColor=vec4(c*contribution/max(l,0.0001),1.0);
}
`;
const BLUR=String.raw`
precision highp float;
varying vec2 vUv;
uniform sampler2D tInput;
uniform vec2 uStep;
void main(){
 vec3 c=texture2D(tInput,vUv).rgb*0.227027;
 c+=(texture2D(tInput,vUv+uStep*1.384615).rgb+
      texture2D(tInput,vUv-uStep*1.384615).rgb)*0.316216;
 c+=(texture2D(tInput,vUv+uStep*3.230769).rgb+
      texture2D(tInput,vUv-uStep*3.230769).rgb)*0.070270;
 gl_FragColor=vec4(c,1.);
}
`;
const COMPOSITE=String.raw`
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloom;
uniform float uExposure;
uniform float uVignette;
uniform float uGrain;
vec3 acesFilm(vec3 x){
 return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.);
}
vec3 linearToSrgb(vec3 c){
 vec3 hi=1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-0.055;
 vec3 lo=12.92*c;
 return mix(lo,hi,step(vec3(0.0031308),c));
}
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec3 sceneColor=texture2D(tScene,vUv).rgb;
 vec3 bloom=texture2D(tBloom,vUv).rgb;
 // Scene-linear addition occurs BEFORE exposure/tone mapping.
 vec3 color=sceneColor+max(vec3(0.),bloom)*uBloom;
 color=acesFilm(max(vec3(0.),color)*uExposure);
 float radius=dot((vUv-.5)*vec2(1.15,1.0),(vUv-.5)*vec2(1.15,1.0));
 float vignette=1.0-uVignette*smoothstep(.16,.68,radius);
 color*=vignette;
 // Small, stable display-space noise (not a noisy fullscreen filter).
 color+=(hash21(floor(gl_FragCoord.xy))-0.5)*uGrain;
 gl_FragColor=vec4(linearToSrgb(clamp(color,0.,1.)),1.);
}
`;

function proceduralWearTexture(THREE){
 const c=document.createElement('canvas');c.width=128;c.height=128;
 const g=c.getContext('2d');const im=g.createImageData(128,128);
 let seed=0x4f2a1b;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4;
  const grain=(rnd()-.5)*16;
  const edge=(x%32===0||y%37===0)?-8:0;
  const v=Math.max(195,Math.min(255,243+grain+edge));
  im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;
 }
 g.putImageData(im,0,0);
 for(let i=0;i<36;i++){
  const x=rnd()*128,y=rnd()*128,w=2+rnd()*21;
  g.fillStyle=i%3?'rgba(25,23,20,.055)':'rgba(255,251,225,.22)';
  g.fillRect(x,y,w,.45+rnd()*.6);
 }
 const t=new THREE.CanvasTexture(c);
 t.colorSpace=THREE.SRGBColorSpace;
 t.wrapS=t.wrapT=THREE.RepeatWrapping;
 t.minFilter=THREE.NearestMipmapNearestFilter;
 t.magFilter=THREE.NearestFilter;
 t.repeat.set(2,2);
 return t;
}
function studioEnvironment(THREE,renderer){
 const c=document.createElement('canvas');c.width=512;c.height=256;
 const g=c.getContext('2d');
 let bg=g.createLinearGradient(0,0,0,256);
 bg.addColorStop(0,'#283a42');bg.addColorStop(.48,'#4b5350');
 bg.addColorStop(.78,'#211e18');bg.addColorStop(1,'#080f14');
 g.fillStyle=bg;g.fillRect(0,0,512,256);
 for(const source of [
  [110,86,58,'rgba(255,224,168,.95)'],
  [315,92,42,'rgba(183,210,220,.75)'],
  [440,121,33,'rgba(255,152,62,.72)']
 ]){
  const [x,y,r,col]=source;
  const grd=g.createRadialGradient(x,y,0,x,y,r);
  grd.addColorStop(0,col);grd.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=grd;g.fillRect(x-r,y-r,r*2,r*2);
 }
 const tex=new THREE.CanvasTexture(c);
 tex.mapping=THREE.EquirectangularReflectionMapping;
 tex.colorSpace=THREE.SRGBColorSpace;
 try{
  const pmrem=new THREE.PMREMGenerator(renderer);
  const rt=pmrem.fromEquirectangular(tex);
  pmrem.dispose();tex.dispose();
  return {texture:rt.texture,dispose:()=>rt.dispose()};
 }catch(e){
  console.warn('HDR environment convolution unavailable; direct PBR lights still active',e);
  tex.dispose();return {texture:null,dispose(){}};
 }
}
export function createPayoutMaterialFactory(THREE){
 const wear=proceduralWearTexture(THREE);
 const cache=new Map();
 function material(color){
  if(cache.has(color))return cache.get(color);
  const c=new THREE.Color(color);
  const brightness=(c.r+c.g+c.b)/3;
  const yellow=c.r>c.b*1.55&&c.g>c.b*1.2;
  const shadow=brightness<.03;
  const metal=yellow?0.82:shadow?0.14:0.52;
  const roughness=yellow?.35:shadow?.86:.65;
  const m=new THREE.MeshStandardMaterial({
   color,metalness:metal,roughness,
   map:shadow?null:wear,envMapIntensity:yellow?1.8:1.25,
   side:THREE.DoubleSide
  });
  cache.set(color,m);return m;
 }
 return {material,dispose(){
  for(const m of cache.values())m.dispose();
  wear.dispose();
 }};
}
export function upgradeCoinMaterials(THREE,original){
 const material=Array.isArray(original)?original:[original];
 const side=new THREE.MeshStandardMaterial({
  color:'#272219',metalness:.72,roughness:.38,envMapIntensity:2.2,
  side:THREE.DoubleSide,flatShading:true
 });
 const face=new THREE.MeshStandardMaterial({
  map:material[1]?.map||material[0]?.map,
  color:'#ffedc0',metalness:.30,roughness:.40,envMapIntensity:1.5,
  side:THREE.DoubleSide,flatShading:true
 });
 // Preserve the hand-authored 48px sprite texture and facet topology.
 return [side,face,face];
}
export function installPayoutLighting(THREE,renderer,scene,{compact=false}={}){
 renderer.toneMapping=THREE.NoToneMapping; // HDR pipeline tone maps ONCE, in final shader.
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const sky=new THREE.HemisphereLight('#a5c8c5','#241b18',.66);
 const key=new THREE.DirectionalLight('#ffe0a8',3.0);
 key.position.set(-4,8,6);key.castShadow=true;
 key.shadow.mapSize.set(compact?512:1024,compact?512:1024);
 key.shadow.camera.left=-11;key.shadow.camera.right=11;
 key.shadow.camera.top=9;key.shadow.camera.bottom=-9;
 key.shadow.camera.near=.1;key.shadow.camera.far=36;
 key.shadow.bias=-.00015;key.shadow.normalBias=.025;
 const fill=new THREE.DirectionalLight('#8fb7cb',1.10);
 fill.position.set(4,5,-5);
 const warm=new THREE.PointLight('#ffad55',28,10,2);
 warm.position.set(.45,3.6,2.8);
 const gold=new THREE.PointLight('#ffc577',10,6,2);
 gold.position.set(-3.1,2.6,2.5);
 scene.add(sky,key,fill,warm,gold);
 scene.fog=new THREE.Fog('#181f21',18,40);
 const env=studioEnvironment(THREE,renderer);
 if(env.texture){scene.environment=env.texture;scene.environmentIntensity=1.35;}
 return {env,lights:{sky,key,fill,warm,gold},dispose(){
  env.dispose();scene.remove(sky,key,fill,warm,gold);
 }};
}
export function createPayoutBloom(THREE,renderer,{compact=false}={}){
 const quadGeo=new THREE.PlaneGeometry(2,2);
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const quad=new THREE.Mesh(quadGeo,null);
 quad.frustumCulled=false;
 const stage=new THREE.Scene();stage.add(quad);
 const targetOptions={
  type:THREE.HalfFloatType,format:THREE.RGBAFormat,
  minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
  depthBuffer:true,stencilBuffer:false
 };
 const sceneRT=new THREE.WebGLRenderTarget(4,4,targetOptions);
 sceneRT.texture.colorSpace=THREE.LinearSRGBColorSpace;
 const bloomOptions={...targetOptions,depthBuffer:false};
 const brightRT=new THREE.WebGLRenderTarget(4,4,bloomOptions);
 const blurRT1=new THREE.WebGLRenderTarget(4,4,bloomOptions);
 const blurRT2=new THREE.WebGLRenderTarget(4,4,bloomOptions);
 for(const rt of [brightRT,blurRT1,blurRT2])rt.texture.colorSpace=THREE.LinearSRGBColorSpace;
 const makeShader=(fragmentShader,uniforms)=>new THREE.ShaderMaterial({
  vertexShader:VERTEX,fragmentShader,uniforms,
  depthTest:false,depthWrite:false,toneMapped:false
 });
 const bright=makeShader(BRIGHT,{
  tInput:{value:sceneRT.texture},uThreshold:{value:1.15},uKnee:{value:.58}
 });
 const blur=makeShader(BLUR,{
  tInput:{value:brightRT.texture},uStep:{value:new THREE.Vector2(1,0)}
 });
 const composite=makeShader(COMPOSITE,{
  tScene:{value:sceneRT.texture},tBloom:{value:blurRT1.texture},
  uBloom:{value:1.22},uExposure:{value:.95},
  uVignette:{value:.24},uGrain:{value:.008}
 });
 const size=new THREE.Vector2();
 let width=4,height=4,smallW=4,smallH=4,pixelMode=false;
 function resize(){
  renderer.getDrawingBufferSize(size);
  const renderScale=pixelMode?.7:1;
  width=Math.max(2,Math.floor(size.x*renderScale));
  height=Math.max(2,Math.floor(size.y*renderScale));
  smallW=Math.max(8,Math.ceil(width/(compact?5:4)));
  smallH=Math.max(8,Math.ceil(height/(compact?5:4)));
  sceneRT.setSize(width,height);
  for(const rt of [brightRT,blurRT1,blurRT2])rt.setSize(smallW,smallH);
 }
 function render(scene,camera){
  renderer.setRenderTarget(sceneRT);
  renderer.render(scene,camera);
  quad.material=bright;bright.uniforms.tInput.value=sceneRT.texture;
  renderer.setRenderTarget(brightRT);renderer.render(stage,postCamera);
  quad.material=blur;
  blur.uniforms.tInput.value=brightRT.texture;
  blur.uniforms.uStep.value.set(1/smallW,0);
  renderer.setRenderTarget(blurRT2);renderer.render(stage,postCamera);
  blur.uniforms.tInput.value=blurRT2.texture;
  blur.uniforms.uStep.value.set(0,1/smallH);
  renderer.setRenderTarget(blurRT1);renderer.render(stage,postCamera);
  quad.material=composite;
  renderer.setRenderTarget(null);
  renderer.render(stage,postCamera);
 }
 const postCamera=camera;
 resize();
 return {
  resize,render,
  setBloom(v){composite.uniforms.uBloom.value=Math.max(0,Math.min(2.7,v));},
  setThreshold(v){bright.uniforms.uThreshold.value=Math.max(.5,Math.min(3,v));},
  setExposure(v){composite.uniforms.uExposure.value=Math.max(.5,Math.min(2,v));},
  setPixelMode(v){pixelMode=Boolean(v);resize();},
  get state(){return {
   bloom:composite.uniforms.uBloom.value,
   threshold:bright.uniforms.uThreshold.value,
   exposure:composite.uniforms.uExposure.value,
   pixelMode,width,height,smallW,smallH,
   HDR:sceneRT.texture.type===THREE.HalfFloatType,
   linearSource:sceneRT.texture.colorSpace===THREE.LinearSRGBColorSpace
  };},
  dispose(){
   for(const m of [bright,blur,composite])m.dispose();
   quadGeo.dispose();for(const rt of [sceneRT,brightRT,blurRT1,blurRT2])rt.dispose();
  }
 };
}
