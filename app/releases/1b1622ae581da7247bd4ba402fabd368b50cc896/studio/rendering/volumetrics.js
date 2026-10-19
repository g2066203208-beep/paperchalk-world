// Paperchalk Demo v12.32 visual baseline. Extracted without changing shader or art parameters.
import {smoothstep} from './math.js';
import {createContactAO} from './contact-ao.js';
import {cityLightProfile} from './city-light-profile.js';

// The volumetric path renders the scene once into an HDR buffer before adding
// the shafts.  Three.js does not tone-map ordinary render targets, so an
// RGBA8 target would clamp the lit paper before the final output pass.  Keep
// this probe deliberately small and capability based: unsupported WebGL
// contexts use the regular renderer output instead of risking a broken
// framebuffer on mobile browsers.
export function supportsHdrRenderTarget(renderer){
  try{
    if(renderer?.capabilities?.isWebGL2===false)return false;
    const extensions=renderer?.extensions;
    if(!extensions||typeof extensions.has!=='function')return false;
    return extensions.has('EXT_color_buffer_float')||extensions.has('EXT_color_buffer_half_float');
  }catch{
    return false;
  }
}

export function createVolumetrics({THREE,scene,renderer,camera,state,flags,getSize,lights,celestials,fog,actor}){
const {sun,moon}=lights;
const {sky,starField,sunDisc,moonDisc,sunGlow,moonGlow}=celestials;
const {forestMist}=fog;
const {contactShadow}=actor;
const fsCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const fsGeo=new THREE.PlaneGeometry(2,2);
const contactAO=createContactAO({THREE,renderer,camera,screenCamera:fsCamera,screenGeometry:fsGeo});
let shaftStrength=1,shaftFrames=0;

let sceneTarget=null,volumeTarget=null;
let sunVolumeShadowTarget=null,moonVolumeShadowTarget=null;
const volumeScale=()=>{const size=getSize();return (size.compact??(Math.min(size.width,size.height)<600||size.width<760)) ? .34 : .40;};
let VOLUME_SCALE=volumeScale();
const VOLUME_SHADOW_SIZE=512;

const sunVolumeCamera=new THREE.OrthographicCamera(-18,18,15,-6,.1,60);
const moonVolumeCamera=new THREE.OrthographicCamera(-18,18,15,-6,.1,60);
const sunVolumeMatrix=new THREE.Matrix4();
const moonVolumeMatrix=new THREE.Matrix4();
const volumeLightTarget=new THREE.Vector3(0,1.0,.6);

const volumeDepthMat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
volumeDepthMat.colorWrite=false;
volumeDepthMat.depthWrite=true;
volumeDepthMat.depthTest=true;
const localShadowSlots=[0,1].map(()=>({light:null,target:null,camera:new THREE.PerspectiveCamera(),
  matrix:new THREE.Matrix4(),signature:'',sceneSignature:'',renders:0}));
const alphaDepthMaterials=new Map();
let casterSignature='';

const volumeUniforms={
  sceneDepth:{value:null},
  sunLightDepth:{value:null},
  moonLightDepth:{value:null},
  cameraProjectionInv:{value:new THREE.Matrix4()},
  cameraMatrixWorld:{value:new THREE.Matrix4()},
  sunLightMatrix:{value:new THREE.Matrix4()},
  moonLightMatrix:{value:new THREE.Matrix4()},
  cameraPos:{value:new THREE.Vector3()},
  sunLightDir:{value:new THREE.Vector3(0,-1,0)},
  moonLightDir:{value:new THREE.Vector3(0,-1,0)},
  sunScatteringColor:{value:new THREE.Color(0xffa05f)},
  moonScatteringColor:{value:new THREE.Color(0x88b2ff)},
  sunDensity:{value:.038},
  moonDensity:{value:.016},
  sunIntensity:{value:.76},
  moonIntensity:{value:.18},
  cityMode:{value:state.sceneId==='city-prologue'?1:0},
  maxDistance:{value:46.0},
  time:{value:0},
  shadowBias:{value:.0022},
  steps:{value:32.0}
};
for(let i=0;i<2;i++){
  volumeUniforms['localDepth'+i]={value:null};
  volumeUniforms['localMatrix'+i]={value:new THREE.Matrix4()};
  volumeUniforms['localPosition'+i]={value:new THREE.Vector3()};
  volumeUniforms['localDirection'+i]={value:new THREE.Vector3(0,-1,0)};
  volumeUniforms['localColor'+i]={value:new THREE.Color()};
  volumeUniforms['localCone'+i]={value:new THREE.Vector3(.9,.96,14)};
  volumeUniforms['localIntensity'+i]={value:0};
}

const volumeMat=new THREE.ShaderMaterial({
  uniforms:volumeUniforms,
  depthWrite:false,depthTest:false,toneMapped:false,
  vertexShader:`
    varying vec2 vUv;
    void main(){
      vUv=uv;
      gl_Position=vec4(position.xy,0.0,1.0);
    }
  `,
  fragmentShader:`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D sceneDepth;
    uniform sampler2D sunLightDepth;
    uniform sampler2D moonLightDepth;
    uniform mat4 cameraProjectionInv;
    uniform mat4 cameraMatrixWorld;
    uniform mat4 sunLightMatrix;
    uniform mat4 moonLightMatrix;
    uniform vec3 cameraPos;
    uniform vec3 sunLightDir;
    uniform vec3 moonLightDir;
    uniform vec3 sunScatteringColor;
    uniform vec3 moonScatteringColor;
    uniform float sunDensity;
    uniform float moonDensity;
    uniform float sunIntensity;
    uniform float moonIntensity;
    uniform float cityMode;
    uniform sampler2D localDepth0;
    uniform sampler2D localDepth1;
    uniform mat4 localMatrix0;
    uniform mat4 localMatrix1;
    uniform vec3 localPosition0;
    uniform vec3 localPosition1;
    uniform vec3 localDirection0;
    uniform vec3 localDirection1;
    uniform vec3 localColor0;
    uniform vec3 localColor1;
    uniform vec3 localCone0;
    uniform vec3 localCone1;
    uniform float localIntensity0;
    uniform float localIntensity1;
    uniform float maxDistance;
    uniform float time;
    uniform float shadowBias;
    uniform float steps;

    float hash12(vec2 p){
      vec3 p3=fract(vec3(p.xyx)*.1031);
      p3+=dot(p3,p3.yzx+33.33);
      return fract((p3.x+p3.y)*p3.z);
    }

    vec3 worldFromDepth(vec2 uv,float depth){
      vec4 clip=vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);
      vec4 view=cameraProjectionInv*clip;
      view/=max(view.w,1e-6);
      return (cameraMatrixWorld*view).xyz;
    }

    float sunVisibility(vec3 worldPos){
      vec4 lp=sunLightMatrix*vec4(worldPos,1.0);
      vec3 ndc=lp.xyz/max(lp.w,1e-6);
      vec3 uvz=ndc*.5+.5;
      if(uvz.x<=0.0||uvz.x>=1.0||uvz.y<=0.0||uvz.y>=1.0||uvz.z<=0.0||uvz.z>=1.0)return 0.0;
      float blocker=texture2D(sunLightDepth,uvz.xy).x;
      return step(uvz.z-shadowBias,blocker);
    }

    float moonVisibility(vec3 worldPos){
      vec4 lp=moonLightMatrix*vec4(worldPos,1.0);
      vec3 ndc=lp.xyz/max(lp.w,1e-6);
      vec3 uvz=ndc*.5+.5;
      if(uvz.x<=0.0||uvz.x>=1.0||uvz.y<=0.0||uvz.y>=1.0||uvz.z<=0.0||uvz.z>=1.0)return 0.0;
      float blocker=texture2D(moonLightDepth,uvz.xy).x;
      return step(uvz.z-shadowBias,blocker);
    }

    float spotVisibility(sampler2D depthMap,mat4 lightMatrix,vec3 p){
      vec4 projected=lightMatrix*vec4(p,1.0);
      if(projected.w<=0.0)return 0.0;
      vec3 uvz=projected.xyz/projected.w*.5+.5;
      if(uvz.x<=0.0||uvz.x>=1.0||uvz.y<=0.0||uvz.y>=1.0||uvz.z<=0.0||uvz.z>=1.0)return 0.0;
      return step(uvz.z-.0007,texture2D(depthMap,uvz.xy).x);
    }
    float spotScatter(sampler2D depthMap,mat4 lightMatrix,vec3 lightPosition,
      vec3 lightDirection,vec3 cone,vec3 p,vec3 viewRay){
      vec3 fromLight=p-lightPosition;
      float distanceToLight=length(fromLight);
      if(distanceToLight<.02||distanceToLight>=cone.z)return 0.0;
      vec3 incoming=fromLight/distanceToLight;
      float angle=smoothstep(cone.x,cone.y,dot(incoming,lightDirection));
      if(angle<.001)return 0.0;
      float falloff=pow(max(0.0,1.0-distanceToLight/cone.z),1.5)/(1.0+distanceToLight*distanceToLight*.025);
      float phase=.52+.48*pow(max(0.0,dot(viewRay,-incoming)),3.0);
      return angle*falloff*phase*spotVisibility(depthMap,lightMatrix,p);
    }

    void main(){
      float depth=texture2D(sceneDepth,vUv).x;
      vec3 endPos=worldFromDepth(vUv,depth);
      vec3 ray=endPos-cameraPos;
      float fullDist=length(ray);
      if(fullDist<.001){gl_FragColor=vec4(0.0);return;}

      vec3 dir=ray/fullDist;
      float rayDist=min(fullDist,maxDistance);
      float stepLen=rayDist/max(steps,1.0);
      float jitter=hash12(gl_FragCoord.xy);
      float sunAccum=0.0;
      float moonAccum=0.0;
      float localAccum0=0.0,localAccum1=0.0;

      for(int i=0;i<32;i++){
        if(float(i)>=steps)break;
        float t=(float(i)+jitter)*stepLen;
        vec3 p=cameraPos+dir*t;

        float lowMist=1.0-smoothstep(1.3,4.5,p.y);
        // Air lives between the forest layers. The clear playable foreground
        // must not acquire a uniform yellow veil when shafts are restored.
        float forestAir=1.0-smoothstep(-3.8,1.2,p.z);
        float airVariation=.78+.22*sin(p.x*.46+p.z*.19)*sin(p.y*.61-p.z*.29);
        // A localized bank preserves the diagonal gaps in the canopy shadow.
        // Broad uniform mist integrates across many alternating shadow bands,
        // averaging the shafts into a flat veil even with correct occlusion.
        // Put the bank between the first two tree rows: foreground trunks
        // stay dark against illuminated air instead of being washed over.
        float forestBank=exp(-pow((p.z+6.6)/1.7,2.0));
        // Break the bank into broad, hand-painted gaps. The modulation is
        // deliberately low frequency so shafts read as paper diorama light
        // bands instead of noisy volumetric fog.
        float canopyGaps=.58+.42*(.5+.5*sin(p.x*1.31+p.z*.77+p.y*.42+time*.04));
        float forestVeil=forestBank*(.58+.42*canopyGaps);
        float pulpMotes=.94+.06*sin(p.x*4.0+p.y*7.0+p.z*2.4+time*.15);
        float medium=lowMist*(.035+.965*forestAir)*airVariation*pulpMotes*(.025+forestVeil*4.0);
        if(cityMode>.5){
          // Suspended street air reaches the lamps. Clear camera-side air and
          // a narrow depth envelope prevent an additive blue sheet over town.
          float streetDepth=exp(-pow((p.z+1.4)/3.0,2.0));
          float streetHeight=smoothstep(-.1,.35,p.y)*(1.0-smoothstep(5.3,7.0,p.y));
          float clearForeground=1.0-smoothstep(1.5,3.4,p.z);
          float pockets=.72+.28*pow(.5+.5*sin(p.x*.59-p.z*.31),2.0);
          medium=streetDepth*streetHeight*clearForeground*pockets*.92;
        }
        // Keep foreground air clear; light accumulates in the low forest bank.
        float nearFade=smoothstep(1.2,4.2,t);

        float sCos=clamp(dot(dir,-normalize(sunLightDir)),-1.0,1.0);
        float mCos=clamp(dot(dir,-normalize(moonLightDir)),-1.0,1.0);
        float sPhase=.34+.66*pow(max(sCos,0.0),5.0);
        float mPhase=mix(.30+.70*pow(max(mCos,0.0),4.6),.48+.52*pow(max(mCos,0.0),3.0),cityMode);

        // Both celestial lights coexist. Only shadow-map-visible fog glows.
        if(sunIntensity>.001)sunAccum+=medium*sunDensity*sunVisibility(p)*stepLen*nearFade*sPhase;
        if(moonIntensity>.001)moonAccum+=medium*moonDensity*moonVisibility(p)*stepLen*nearFade*mPhase;
        if(localIntensity0>.001)localAccum0+=medium*.075*stepLen*nearFade*
          spotScatter(localDepth0,localMatrix0,localPosition0,localDirection0,localCone0,p,dir);
        if(localIntensity1>.001)localAccum1+=medium*.075*stepLen*nearFade*
          spotScatter(localDepth1,localMatrix1,localPosition1,localDirection1,localCone1,p,dir);
      }

      float sunScatter=(1.0-exp(-sunAccum*2.28))*sunIntensity;
      float moonScatter=(1.0-exp(-moonAccum*2.45))*moonIntensity;
      vec3 rays=sunScatteringColor*sunScatter+moonScatteringColor*moonScatter;
      rays+=localColor0*(1.0-exp(-localAccum0*2.4))*localIntensity0;
      rays+=localColor1*(1.0-exp(-localAccum1*2.4))*localIntensity1;
      // Linear ray length lets the final filter reject silhouette crossings.
      gl_FragColor=vec4(rays,fullDist);
    }
  `
});
const volumeScene=new THREE.Scene();
volumeScene.add(new THREE.Mesh(fsGeo,volumeMat));

const compositeUniforms={
  sceneColor:{value:null},
  volumeColor:{value:null},
  volumeTexel:{value:new THREE.Vector2(1,1)},
  volumeStrength:{value:1.0},
  aoTexture:{value:null},sceneDepth:{value:null},aoTexel:{value:new THREE.Vector2(1,1)},
  cameraNearFar:{value:new THREE.Vector2(camera.near,camera.far)},aoEnabled:{value:1}
};
const compositeMat=new THREE.ShaderMaterial({
  uniforms:compositeUniforms,
  // This is the only pass that maps the linear HDR scene to the display.
  // ShaderMaterial uses the renderer's tone mapping only when drawing to the
  // default framebuffer; the explicit include below makes the ordering clear
  // and keeps the color-space conversion as the final operation.
  depthWrite:false,depthTest:false,toneMapped:true,
  vertexShader:`
    varying vec2 vUv;
    void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
  `,
  fragmentShader:`
    varying vec2 vUv;
    uniform sampler2D sceneColor;
    uniform sampler2D volumeColor;
    uniform vec2 volumeTexel;
    uniform float volumeStrength;
    uniform sampler2D aoTexture;
    uniform sampler2D sceneDepth;
    uniform vec2 aoTexel;
    uniform vec2 cameraNearFar;
    uniform float aoEnabled;
    vec3 filteredShafts(vec2 uv){
      vec4 center=texture2D(volumeColor,uv);
      vec3 sum=vec3(0.0);float weights=0.0;
      for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
        vec4 sampleValue=texture2D(volumeColor,uv+vec2(float(x),float(y))*volumeTexel);
        float spatial=(x==0?2.0:1.0)*(y==0?2.0:1.0);
        float w=spatial*exp(-abs(sampleValue.a-center.a)/max(.12,center.a*.018));
        sum+=sampleValue.rgb*w;weights+=w;
      }
      return sum/max(weights,.0001);
    }
    float contactVisibility(){
      if(aoEnabled<.5)return 1.0;
      float depth=texture2D(sceneDepth,vUv).x;
      if(depth>=.99999)return 1.0;
      float viewDepth=-(cameraNearFar.x*cameraNearFar.y)/((cameraNearFar.y-cameraNearFar.x)*depth-cameraNearFar.y);
      vec2 grid=vUv/aoTexel-.5;
      vec2 corner=(floor(grid)+.5)*aoTexel;
      vec2 f=fract(grid);
      float sum=0.0,weight=0.0;
      // Depth-aware bilinear reconstruction keeps the low-resolution AO from
      // bleeding off the cutout character or over a foreground paper edge.
      for(int i=0;i<4;i++){
        vec2 offset=vec2(mod(float(i),2.0),floor(float(i)/2.0));
        vec2 sampleValue=textureLod(aoTexture,corner+offset*aoTexel,0.0).rg;
        vec2 bilinear=mix(vec2(1.0)-f,f,offset);
        float w=bilinear.x*bilinear.y*exp(-abs(sampleValue.y-viewDepth)/max(.018,viewDepth*.004));
        sum+=sampleValue.x*w;weight+=w;
      }
      return weight>.00001?mix(1.0,sum/weight,.85):1.0;
    }
    void main(){
      vec4 base=texture2D(sceneColor,vUv);
      vec3 core=filteredShafts(vUv);
      vec3 rays=core*volumeStrength*1.22;

      // Cheap ray-only bloom: it samples ONLY the already shadow-tested
      // volumetric buffer, so dark air stays clear and only real shafts glow.
      vec2 r=volumeTexel*2.2;
      vec3 halo=(
        texture2D(volumeColor,vUv+vec2(r.x,0.0)).rgb+
        texture2D(volumeColor,vUv-vec2(r.x,0.0)).rgb+
        texture2D(volumeColor,vUv+vec2(0.0,r.y)).rgb+
        texture2D(volumeColor,vUv-vec2(0.0,r.y)).rgb
      )*.25;
      halo=max(halo-vec3(.012),vec3(0.0));
      vec3 glow=halo*.34*volumeStrength;

      gl_FragColor=vec4(base.rgb*contactVisibility()+rays+glow,base.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
});
const compositeScene=new THREE.Scene();
compositeScene.add(new THREE.Mesh(fsGeo,compositeMat));

function makeVolumeShadowTarget(){
  const rt=new THREE.WebGLRenderTarget(VOLUME_SHADOW_SIZE,VOLUME_SHADOW_SIZE,{
    minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,
    format:THREE.RGBAFormat,type:THREE.UnsignedByteType
  });
  rt.depthTexture=new THREE.DepthTexture(VOLUME_SHADOW_SIZE,VOLUME_SHADOW_SIZE);
  rt.depthTexture.type=THREE.UnsignedIntType;
  rt.depthTexture.format=THREE.DepthFormat;
  rt.depthTexture.compareFunction=null;
  rt.depthTexture.minFilter=THREE.NearestFilter;
  rt.depthTexture.magFilter=THREE.NearestFilter;
  return rt;
}

function resizeVolumetricTargets(){
  VOLUME_SCALE=volumeScale();
  const size=new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const w=Math.max(2,Math.floor(size.x)),h=Math.max(2,Math.floor(size.y));
  const vw=Math.max(160,Math.floor(w*VOLUME_SCALE));
  const vh=Math.max(90,Math.floor(h*VOLUME_SCALE));

  if(sceneTarget)sceneTarget.dispose();
  sceneTarget=new THREE.WebGLRenderTarget(w,h,{
    minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
    format:THREE.RGBAFormat,type:HDR_ENABLED?THREE.HalfFloatType:THREE.UnsignedByteType
  });
  // Canvas antialiasing does not apply inside the HDR render target. Resolve a
  // small hardware multisample buffer before AO and final output, including its
  // depth, so cut-paper silhouettes retain smooth edges without a blur pass.
  sceneTarget.samples=HDR_ENABLED?Math.min(2,renderer.capabilities.maxSamples??2):0;
  sceneTarget.depthTexture=new THREE.DepthTexture(w,h);
  sceneTarget.depthTexture.type=THREE.UnsignedIntType;
  sceneTarget.depthTexture.minFilter=sceneTarget.depthTexture.magFilter=THREE.NearestFilter;
  contactAO.resize(w,h);
  flags.ao=true;

  if(volumeTarget)volumeTarget.dispose();
  volumeTarget=new THREE.WebGLRenderTarget(vw,vh,{
    minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
    format:THREE.RGBAFormat,type:HDR_ENABLED?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:false
  });

  if(!sunVolumeShadowTarget)sunVolumeShadowTarget=makeVolumeShadowTarget();
  if(!moonVolumeShadowTarget)moonVolumeShadowTarget=makeVolumeShadowTarget();

  volumeUniforms.sceneDepth.value=sceneTarget.depthTexture;
  volumeUniforms.sunLightDepth.value=sunVolumeShadowTarget.depthTexture;
  volumeUniforms.moonLightDepth.value=moonVolumeShadowTarget.depthTexture;
  compositeUniforms.sceneColor.value=sceneTarget.texture;
  compositeUniforms.volumeColor.value=volumeTarget.texture;
  compositeUniforms.volumeTexel.value.set(1/vw,1/vh);
  compositeUniforms.sceneDepth.value=sceneTarget.depthTexture;
  compositeUniforms.aoTexture.value=contactAO.texture;
  compositeUniforms.aoTexel.value.copy(contactAO.texel);
}
const HDR_ENABLED=supportsHdrRenderTarget(renderer);
resizeVolumetricTargets();

flags.volumeShadow=true;

function updateVolumetricSettings(t){
  const a=((t%1)+1)%1*Math.PI*2-Math.PI/2;
  const ma=a+Math.PI;
  const rawSun=Math.sin(a),rawMoon=Math.sin(ma);
  const sunUp=Math.max(rawSun,0),moonUp=Math.max(rawMoon,0);
  const sunFade=smoothstep(-.16,.18,rawSun);
  const moonFade=smoothstep(-.16,.18,rawMoon);
  const twilight=1-smoothstep(.025,.34,Math.abs(rawSun));

  volumeUniforms.sunLightDir.value.copy(volumeLightTarget).sub(sun.position).normalize();
  volumeUniforms.moonLightDir.value.copy(volumeLightTarget).sub(moon.position).normalize();

  const dayColor=new THREE.Color(0xfff0cc);
  const dawnColor=new THREE.Color(0xffc86c);
  const sunsetColor=new THREE.Color(0xff7054);
  const moonColor=new THREE.Color(0x72a3ff);
  const warmColor=state.time<.5?dawnColor:sunsetColor;

  volumeUniforms.sunScatteringColor.value.copy(dayColor).lerp(warmColor,twilight*.98);
  volumeUniforms.moonScatteringColor.value.copy(moonColor);

  // Both real volumetric contributions coexist. Night gets a deliberately
  // stronger cold-blue in-scattering so moon shafts are actually readable.
  volumeUniforms.sunIntensity.value=sunFade*(.38+sunUp*.24+twilight*.78);
  volumeUniforms.moonIntensity.value=moonFade*(.22+moonUp*.36+twilight*.10);
  volumeUniforms.sunDensity.value=.021+twilight*.030;
  volumeUniforms.moonDensity.value=.018+moonUp*.010;
  const city=state.sceneId==='city-prologue';
  volumeUniforms.cityMode.value=city?1:0;
  if(city){
    const profile=cityLightProfile(t);
    volumeUniforms.sunScatteringColor.value.copy(dayColor).lerp(new THREE.Color(profile.sunWarm),twilight*.98);
    volumeUniforms.moonScatteringColor.value.setHex(profile.moonScatterColor);
    volumeUniforms.sunIntensity.value=profile.sunScattering;
    volumeUniforms.moonIntensity.value=profile.moonScattering;
    volumeUniforms.sunDensity.value=profile.sunDensity;
    volumeUniforms.moonDensity.value=profile.moonDensity;
  }
}

function updateVolumeShadowCamera(lightPos,cam,matrix,uniformMatrix,targetRT,lookTarget=volumeLightTarget){
  cam.position.copy(lightPos);
  cam.lookAt(lookTarget);
  cam.updateMatrixWorld(true);
  cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  cam.updateProjectionMatrix();
  matrix.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);
  uniformMatrix.value.copy(matrix);

  renderer.setRenderTarget(targetRT);
  renderer.clear();
  renderer.render(scene,cam);
}

function syncLocalLights(){
  const locals=state.sceneId==='city-prologue'?(lights.locals??[]).filter(light=>light.isSpotLight&&light.visible).slice(0,2):[];
  const active=[];
  for(let i=0;i<2;i++){
    const light=locals[i],slot=localShadowSlots[i];
    volumeUniforms['localIntensity'+i].value=0;
    if(!light)continue;
    if(slot.light!==light){slot.light=light;slot.signature='';slot.sceneSignature='';}
    slot.target??=makeVolumeShadowTarget();
    const position=light.getWorldPosition(new THREE.Vector3());
    const target=light.target.getWorldPosition(new THREE.Vector3());
    const direction=target.clone().sub(position).normalize();
    const angle=Math.max(.02,Math.min(Math.PI*.49,light.angle));
    const range=Math.max(.2,light.distance||20),outer=Math.cos(angle);
    const inner=Math.max(outer+.0001,Math.cos(angle*(1-light.penumbra)));
    volumeUniforms['localDepth'+i].value=slot.target.depthTexture;
    volumeUniforms['localPosition'+i].value.copy(position);
    volumeUniforms['localDirection'+i].value.copy(direction);
    volumeUniforms['localColor'+i].value.copy(light.color).lerp(new THREE.Color(0x709deb),.62);
    volumeUniforms['localCone'+i].value.set(outer,inner,range);
    const base=Math.max(.001,light.userData.cityBaseIntensity??light.intensity);
    volumeUniforms['localIntensity'+i].value=Math.min(2,Math.max(0,
      (light.userData.volumetricIntensity??.85)*light.intensity/base*.38));
    const signature=[...position.toArray(),...target.toArray(),angle,range].map(value=>value.toFixed(4)).join(',');
    active.push({i,slot,position,target,angle,range,signature});
  }
  return active;
}

function getCasterSignature(){
  const signature=[];scene.updateMatrixWorld(true);
  scene.traverseVisible(object=>{
    if(!object.isMesh||!object.castShadow||object===actor.playerMesh||object.userData.volumeShadow===false)return;
    const geometry=object.geometry,materials=Array.isArray(object.material)?object.material:[object.material];
    signature.push(object.uuid,geometry?.uuid,geometry?.attributes.position?.version,geometry?.index?.version,
      ...object.matrixWorld.elements.map(value=>value.toFixed(4)),
      ...materials.map(material=>[material?.uuid,material?.alphaTest,material?.map?.version].join(':')));
  });
  return signature.join('|');
}

function alphaDepthMaterial(material){
  if(!(material?.alphaTest>0)||(!material.map&&!material.alphaMap))return material;
  let depth=alphaDepthMaterials.get(material);
  if(!depth){
    depth=new THREE.MeshBasicMaterial({map:material.map,alphaMap:material.alphaMap,
      alphaTest:material.alphaTest,opacity:material.opacity,side:THREE.DoubleSide});
    depth.colorWrite=false;depth.allowOverride=false;
    alphaDepthMaterials.set(material,depth);
  }
  return depth;
}

function updateVolumetricShadow(force=false){
  if(!state.godrays)return;
  const localLights=syncLocalLights(),celestialDirty=force||flags.volumeShadow;
  if(celestialDirty||(!casterSignature&&localLights.length))casterSignature=getCasterSignature();
  const localDirty=localLights.filter(local=>force||local.slot.signature!==local.signature||local.slot.sceneSignature!==casterSignature);
  if(!celestialDirty&&!localDirty.length)return;

  const fogVisible=forestMist.visible,skyVisible=sky.visible;
  const sunDiscVisible=sunDisc.visible,moonDiscVisible=moonDisc.visible;
  const sunGlowVisible=sunGlow.visible,moonGlowVisible=moonGlow.visible;
  const starVisible=starField.visible;
  const contactVisible=contactShadow.visible;
  const playerVisible=actor.playerMesh?actor.playerMesh.visible:false;

  forestMist.visible=false;sky.visible=false;starField.visible=false;
  sunDisc.visible=false;moonDisc.visible=false;
  sunGlow.visible=false;moonGlow.visible=false;
  contactShadow.visible=false;
  if(actor.playerMesh)actor.playerMesh.visible=false;

  // Use the same caster set as the surface shadow pass. In particular, porous
  // canopy cards must not close the sky only in the volumetric calculation.
  const nonCasters=[];
  scene.traverse(object=>{
    if(object.isMesh&&object.visible&&!object.castShadow){nonCasters.push(object);object.visible=false;}
    if(object.isMesh&&object.visible&&object.userData.volumeShadow===false){nonCasters.push(object);object.visible=false;}
  });

  const oldOverride=scene.overrideMaterial;
  const replacedMaterials=[];
  scene.traverseVisible(object=>{
    if(!object.isMesh||!object.castShadow)return;
    const original=object.material;
    const replacement=Array.isArray(original)?original.map(alphaDepthMaterial):alphaDepthMaterial(original);
    if(replacement!==original){replacedMaterials.push([object,original]);object.material=replacement;}
  });
  scene.overrideMaterial=volumeDepthMat;

  try{
  if(celestialDirty&&volumeUniforms.sunIntensity.value>.015){
    updateVolumeShadowCamera(
      sun.position,sunVolumeCamera,sunVolumeMatrix,
      volumeUniforms.sunLightMatrix,sunVolumeShadowTarget
    );
  }
  if(celestialDirty&&volumeUniforms.moonIntensity.value>.015){
    updateVolumeShadowCamera(
      moon.position,moonVolumeCamera,moonVolumeMatrix,
      volumeUniforms.moonLightMatrix,moonVolumeShadowTarget
    );
  }
  for(const {i,slot,position,target,angle,range,signature} of localDirty){
    slot.camera.fov=THREE.MathUtils.radToDeg(angle*2);slot.camera.aspect=1;
    slot.camera.near=.06;slot.camera.far=range;
    updateVolumeShadowCamera(position,slot.camera,slot.matrix,
      volumeUniforms['localMatrix'+i],slot.target,target);
    slot.signature=signature;slot.sceneSignature=casterSignature;slot.renders++;
  }
  }finally{
  renderer.setRenderTarget(null);
  scene.overrideMaterial=oldOverride;
  for(const [object,material] of replacedMaterials)object.material=material;
  for(const object of nonCasters)object.visible=true;

  forestMist.visible=fogVisible;sky.visible=skyVisible;
  sunDisc.visible=sunDiscVisible;moonDisc.visible=moonDiscVisible;
  sunGlow.visible=sunGlowVisible;moonGlow.visible=moonGlowVisible;starField.visible=starVisible;
  contactShadow.visible=contactVisible;
  if(actor.playerMesh)actor.playerMesh.visible=playerVisible;
  }

  flags.volumeShadow=false;
}

function renderWithVolumetrics(){
  // Half-float color attachments are not universally renderable (notably on
  // older WebViews).  Let Three.js perform its normal ACES + sRGB output in
  // that case; this preserves the scene rather than compositing a clipped
  // RGBA8 intermediate.
  if(!HDR_ENABLED){
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene,camera);
    return;
  }

  renderer.setRenderTarget(sceneTarget);
  renderer.clear();
  renderer.render(scene,camera);

  if(state.ao&&flags.ao){contactAO.render(sceneTarget.depthTexture);flags.ao=false;}
  compositeUniforms.aoEnabled.value=state.ao?1:0;
  compositeUniforms.cameraNearFar.value.set(camera.near,camera.far);
  compositeUniforms.volumeStrength.value=state.godrays?shaftStrength:0;
  if(state.godrays){
    updateVolumetricShadow(false);
    volumeUniforms.cameraProjectionInv.value.copy(camera.projectionMatrixInverse);
    volumeUniforms.cameraMatrixWorld.value.copy(camera.matrixWorld);
    volumeUniforms.cameraPos.value.copy(camera.position);
    renderer.setRenderTarget(volumeTarget);
    renderer.clear();
    renderer.render(volumeScene,fsCamera);
    shaftFrames++;
  }

  renderer.setRenderTarget(null);
  renderer.render(compositeScene,fsCamera);
}


function setShaftStrength(value){
  if(Number.isFinite(value)){
    shaftStrength=Math.max(0,Math.min(2,value));
    state.shaftStrength=shaftStrength;
    flags.render=true;
  }
  return shaftStrength;
}

return {volumeUniforms,volumeLightTarget,updateVolumetricSettings,renderWithVolumetrics,setShaftStrength,
resize:resizeVolumetricTargets,dispose(){
  sceneTarget?.dispose();volumeTarget?.dispose();sunVolumeShadowTarget?.dispose();moonVolumeShadowTarget?.dispose();
  for(const slot of localShadowSlots)slot.target?.dispose();
  for(const material of alphaDepthMaterials.values())material.dispose();
  volumeMat.dispose();compositeMat.dispose();volumeDepthMat.dispose();fsGeo.dispose();
  contactAO.dispose();
},stats(){return {
  supported:HDR_ENABLED,enabled:!!state.godrays&&HDR_ENABLED,
  fallback:HDR_ENABLED?null:'hdr-unavailable',
  effectiveStrength:HDR_ENABLED&&state.godrays?shaftStrength:0,renderedFrames:shaftFrames,
  steps:volumeUniforms.steps.value,scale:VOLUME_SCALE,shadowSize:VOLUME_SHADOW_SIZE,
  city:state.sceneId==='city-prologue',localLights:localShadowSlots.filter(slot=>slot.light).length,
  localShadowRenders:localShadowSlots.reduce((sum,slot)=>sum+slot.renders,0),
  hdr:HDR_ENABLED,sceneTargetType:HDR_ENABLED?'half-float':'rgba8-fallback',ao:{supported:HDR_ENABLED,...contactAO.stats()}
}}};
}
