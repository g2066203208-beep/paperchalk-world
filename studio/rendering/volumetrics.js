// Paperchalk Demo v12.32 visual baseline. Extracted without changing shader or art parameters.
import {smoothstep} from './math.js';

export function createVolumetrics({THREE,scene,renderer,camera,state,flags,getSize,lights,celestials,fog,actor}){
const {sun,moon}=lights;
const {sky,starField,sunDisc,moonDisc,sunGlow,moonGlow}=celestials;
const {forestMist}=fog;
const {contactShadow}=actor;
const fsCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const fsGeo=new THREE.PlaneGeometry(2,2);

let sceneTarget=null,volumeTarget=null;
let sunVolumeShadowTarget=null,moonVolumeShadowTarget=null;
let VOLUME_SCALE=getSize().width<760?.34:.40;
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
  maxDistance:{value:46.0},
  time:{value:0},
  shadowBias:{value:.0022},
  steps:{value:24.0}
};

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

    void main(){
      float depth=texture2D(sceneDepth,vUv).x;
      vec3 endPos=worldFromDepth(vUv,depth);
      vec3 ray=endPos-cameraPos;
      float fullDist=length(ray);
      if(fullDist<.001){gl_FragColor=vec4(0.0);return;}

      vec3 dir=ray/fullDist;
      float rayDist=min(fullDist,maxDistance);
      float stepLen=rayDist/max(steps,1.0);
      float jitter=fract(hash12(gl_FragCoord.xy)+time*.071);
      float sunAccum=0.0;
      float moonAccum=0.0;

      for(int i=0;i<32;i++){
        if(float(i)>=steps)break;
        float t=(float(i)+jitter)*stepLen;
        vec3 p=cameraPos+dir*t;

        float lowMist=1.0-smoothstep(.45,6.6,p.y);
        float medium=.10+.90*lowMist;
        float nearFade=smoothstep(.8,3.0,t);

        float sVis=sunVisibility(p);
        float mVis=moonVisibility(p);

        float sCos=clamp(dot(dir,-normalize(sunLightDir)),-1.0,1.0);
        float mCos=clamp(dot(dir,-normalize(moonLightDir)),-1.0,1.0);
        float sPhase=.34+.66*pow(max(sCos,0.0),5.0);
        float mPhase=.30+.70*pow(max(mCos,0.0),4.6);

        // Both celestial lights coexist. Only shadow-map-visible fog glows.
        sunAccum+=medium*sunDensity*sVis*stepLen*nearFade*sPhase;
        moonAccum+=medium*moonDensity*mVis*stepLen*nearFade*mPhase;
      }

      float sunScatter=(1.0-exp(-sunAccum*2.15))*sunIntensity;
      float moonScatter=(1.0-exp(-moonAccum*2.45))*moonIntensity;
      vec3 rays=sunScatteringColor*sunScatter+moonScatteringColor*moonScatter;
      gl_FragColor=vec4(rays,max(sunScatter,moonScatter));
    }
  `
});
const volumeScene=new THREE.Scene();
volumeScene.add(new THREE.Mesh(fsGeo,volumeMat));

const compositeUniforms={
  sceneColor:{value:null},
  volumeColor:{value:null},
  volumeTexel:{value:new THREE.Vector2(1,1)},
  volumeStrength:{value:1.0}
};
const compositeMat=new THREE.ShaderMaterial({
  uniforms:compositeUniforms,
  depthWrite:false,depthTest:false,toneMapped:false,
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
    void main(){
      vec4 base=texture2D(sceneColor,vUv);
      vec3 core=texture2D(volumeColor,vUv).rgb;
      vec3 rays=core*volumeStrength*1.16;

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
      vec3 glow=halo*.30*volumeStrength;

      gl_FragColor=vec4(base.rgb+rays+glow,base.a);
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
  VOLUME_SCALE=getSize().width<760?.34:.40;
  const size=new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const w=Math.max(2,Math.floor(size.x)),h=Math.max(2,Math.floor(size.y));
  const vw=Math.max(160,Math.floor(w*VOLUME_SCALE));
  const vh=Math.max(90,Math.floor(h*VOLUME_SCALE));

  if(sceneTarget)sceneTarget.dispose();
  sceneTarget=new THREE.WebGLRenderTarget(w,h,{
    minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
    format:THREE.RGBAFormat,type:THREE.UnsignedByteType
  });
  sceneTarget.depthTexture=new THREE.DepthTexture(w,h);
  sceneTarget.depthTexture.type=THREE.UnsignedShortType;

  if(volumeTarget)volumeTarget.dispose();
  volumeTarget=new THREE.WebGLRenderTarget(vw,vh,{
    minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
    format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:false
  });

  if(!sunVolumeShadowTarget)sunVolumeShadowTarget=makeVolumeShadowTarget();
  if(!moonVolumeShadowTarget)moonVolumeShadowTarget=makeVolumeShadowTarget();

  volumeUniforms.sceneDepth.value=sceneTarget.depthTexture;
  volumeUniforms.sunLightDepth.value=sunVolumeShadowTarget.depthTexture;
  volumeUniforms.moonLightDepth.value=moonVolumeShadowTarget.depthTexture;
  compositeUniforms.sceneColor.value=sceneTarget.texture;
  compositeUniforms.volumeColor.value=volumeTarget.texture;
  compositeUniforms.volumeTexel.value.set(1/vw,1/vh);
}
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
  const dawnColor=new THREE.Color(0xff9a64);
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
}

function updateVolumeShadowCamera(lightPos,cam,matrix,uniformMatrix,targetRT){
  cam.position.copy(lightPos);
  cam.lookAt(volumeLightTarget);
  cam.updateMatrixWorld(true);
  cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  cam.updateProjectionMatrix();
  matrix.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);
  uniformMatrix.value.copy(matrix);

  renderer.setRenderTarget(targetRT);
  renderer.clear();
  renderer.render(scene,cam);
}

function updateVolumetricShadow(force=false){
  if(!state.godrays||(!force&&!flags.volumeShadow))return;

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

  const oldOverride=scene.overrideMaterial;
  scene.overrideMaterial=volumeDepthMat;

  if(volumeUniforms.sunIntensity.value>.015){
    updateVolumeShadowCamera(
      sun.position,sunVolumeCamera,sunVolumeMatrix,
      volumeUniforms.sunLightMatrix,sunVolumeShadowTarget
    );
  }
  if(volumeUniforms.moonIntensity.value>.015){
    updateVolumeShadowCamera(
      moon.position,moonVolumeCamera,moonVolumeMatrix,
      volumeUniforms.moonLightMatrix,moonVolumeShadowTarget
    );
  }

  renderer.setRenderTarget(null);
  scene.overrideMaterial=oldOverride;

  forestMist.visible=fogVisible;sky.visible=skyVisible;
  sunDisc.visible=sunDiscVisible;moonDisc.visible=moonDiscVisible;
  sunGlow.visible=sunGlowVisible;moonGlow.visible=moonGlowVisible;starField.visible=starVisible;
  contactShadow.visible=contactVisible;
  if(actor.playerMesh)actor.playerMesh.visible=playerVisible;

  flags.volumeShadow=false;
}

function renderWithVolumetrics(){
  renderer.setRenderTarget(sceneTarget);
  renderer.clear();
  renderer.render(scene,camera);

  updateVolumetricShadow(false);
  volumeUniforms.cameraProjectionInv.value.copy(camera.projectionMatrixInverse);
  volumeUniforms.cameraMatrixWorld.value.copy(camera.matrixWorld);
  volumeUniforms.cameraPos.value.copy(camera.position);

  renderer.setRenderTarget(volumeTarget);
  renderer.clear();
  renderer.render(volumeScene,fsCamera);

  renderer.setRenderTarget(null);
  renderer.render(compositeScene,fsCamera);
}


return {volumeUniforms,volumeLightTarget,updateVolumetricSettings,renderWithVolumetrics,
resize:resizeVolumetricTargets,dispose(){
  sceneTarget?.dispose();volumeTarget?.dispose();sunVolumeShadowTarget?.dispose();moonVolumeShadowTarget?.dispose();
  volumeMat.dispose();compositeMat.dispose();volumeDepthMat.dispose();fsGeo.dispose();
},stats(){return {steps:volumeUniforms.steps.value,scale:VOLUME_SCALE,shadowSize:VOLUME_SHADOW_SIZE}}};
}
