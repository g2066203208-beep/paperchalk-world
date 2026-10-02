// Paperchalk Demo v12.32 visual baseline. Extracted without changing shader or art parameters.
import {rng} from './math.js';

export function createPaperFog({THREE,scene,renderer,camera,state,flags,getSize,mistTexture,celestials}){
const {sky,starField,sunDisc,moonDisc}=celestials;
const forestMist=new THREE.Group();
scene.add(forestMist);

const fogTex=mistTexture(11);
const fogUniforms={
  map:{value:fogTex},
  tint:{value:new THREE.Color(0xe4ebe2)},
  // Thin warm haze keeps the handmade layers visible on small screens.
  opacity:{value:.015},
  time:{value:0},
  tDepth:{value:null},
  resolution:{value:new THREE.Vector2(1,1)},
  depthFade:{value:.0045}
};

const fogVertex=`
  varying vec2 vUv;
  varying vec3 vMistWorld;
  void main(){
    vUv=uv;
    vec4 worldPosition=modelMatrix*instanceMatrix*vec4(position,1.0);
    vMistWorld=worldPosition.xyz;
    vec4 mvPosition=viewMatrix*worldPosition;
    gl_Position=projectionMatrix*mvPosition;
  }
`;

const fogFragment=`
  uniform sampler2D map;
  uniform sampler2D tDepth;
  uniform vec3 tint;
  uniform float opacity;
  uniform float time;
  uniform vec2 resolution;
  uniform float depthFade;
  varying vec2 vUv;
  varying vec3 vMistWorld;

  void main(){
    // Gentle wind ripple inside the paper strip.
    vec2 uv=vUv;
    uv.x += sin(uv.y*10.0 + time*.55)*.008;
    uv.y += sin(uv.x*8.0 - time*.38)*.004;

    vec4 paper=texture2D(map,uv);
    float a=paper.a;

    // Visible breathing in the fibres, without becoming smoke.
    a *= .91 + .09*sin(time*.72 + uv.x*11.0);

    // Soft-particle depth fade: remove the hard card/terrain intersection.
    vec2 suv=gl_FragCoord.xy/resolution;
    float sceneDepth=texture2D(tDepth,suv).x;
    float delta=sceneDepth-gl_FragCoord.z;
    float soft=smoothstep(.00035,depthFade,max(delta,0.0));

    // Haze belongs between forest layers. Foreground cards used to wash over
    // the character and erase precisely the small fibre contrast we need.
    float backgroundLayer=1.0-smoothstep(-12.0,-.8,vMistWorld.z);
    float layerOpacity=.08+backgroundLayer*1.42;
    float heightFalloff=1.0-smoothstep(1.45,3.8,vMistWorld.y);
    a *= soft*opacity*layerOpacity*heightFalloff;
    if(a<.002) discard;

    float sunSide=1.0-smoothstep(-7.0,6.0,vMistWorld.x);
    vec3 localTint=mix(tint*vec3(.96,.96,1.04),tint*vec3(1.045,1.0,.90),sunSide);
    gl_FragColor=vec4(paper.rgb*localTint,a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const fogMat=new THREE.ShaderMaterial({
  uniforms:fogUniforms,
  vertexShader:fogVertex,
  fragmentShader:fogFragment,
  transparent:true,
  depthWrite:false,
  depthTest:true,
  side:THREE.DoubleSide,
  toneMapped:true
});

const BANK_COUNT=18;
const GROUND_COUNT=10;
const bankGeo=new THREE.PlaneGeometry(1,1);
const groundGeo=new THREE.PlaneGeometry(1,1);
const fogBanks=new THREE.InstancedMesh(bankGeo,fogMat,BANK_COUNT);
const groundFog=new THREE.InstancedMesh(groundGeo,fogMat,GROUND_COUNT);
fogBanks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
groundFog.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
fogBanks.frustumCulled=false;groundFog.frustumCulled=false;
fogBanks.renderOrder=4;groundFog.renderOrder=5;
forestMist.add(fogBanks,groundFog);

const fogDummy=new THREE.Object3D();
const fogBankData=[];
const groundFogData=[];

function seedFogData(){
  const r=rng(99127);
  for(let i=0;i<BANK_COUNT;i++){
    const lane=i%3; // near/mid/far
    const spread=lane===0?7.5:lane===1?11.0:14.5;
    fogBankData.push({
      baseX:(r()-.5)*spread*1.8,
      baseZ: lane===0 ? -1.4-r()*1.5 : lane===1 ? -5.8+r()*1.7 : -11.8+r()*2.8,
      baseY: lane===0 ? .64+r()*.38 : lane===1 ? .85+r()*.55 : 1.10+r()*.75,
      width:(lane===0?3.8:lane===1?5.4:7.0)+r()*(lane===0?2.3:3.2),
      height:(lane===0?1.2:1.5)+r()*(lane===2?1.2:.8),
      speed:(lane===0?.22:lane===1?.13:.075)*(r()>.5?1:-1),
      phase:r()*Math.PI*2,
      bob:.035+r()*.06
    });
  }
  for(let i=0;i<GROUND_COUNT;i++){
    groundFogData.push({
      baseX:(r()-.5)*13,
      baseZ:-2-r()*8,
      baseY:.49+r()*.30,
      width:4.2+r()*4.4,
      depth:2.0+r()*2.8,
      speed:.055+r()*.085,
      phase:r()*Math.PI*2,
      bob:.018+r()*.035
    });
  }
}
seedFogData();

function updateFogInstances(t){
  for(let i=0;i<BANK_COUNT;i++){
    const d=fogBankData[i];
    const x=d.baseX+Math.sin(t*d.speed+d.phase)*.65;
    const y=d.baseY+Math.sin(t*.36+d.phase)*d.bob;
    const z=d.baseZ+Math.cos(t*d.speed*.43+d.phase)*.14;

    fogDummy.position.set(x,y,z);
    // Upright billboard to camera.
    const dx=camera.position.x-x,dz=camera.position.z-z;
    fogDummy.rotation.set(0,Math.atan2(dx,dz),0);
    fogDummy.scale.set(d.width,d.height,1);
    fogDummy.updateMatrix();
    fogBanks.setMatrixAt(i,fogDummy.matrix);
  }
  fogBanks.instanceMatrix.needsUpdate=true;

  for(let i=0;i<GROUND_COUNT;i++){
    const d=groundFogData[i];
    fogDummy.position.set(
      d.baseX+Math.sin(t*d.speed+d.phase)*.48,
      d.baseY+Math.sin(t*.28+d.phase)*d.bob,
      d.baseZ+Math.cos(t*d.speed*.5+d.phase)*.28
    );
    fogDummy.rotation.set(-Math.PI/2,0,Math.sin(t*.12+d.phase)*.035);
    fogDummy.scale.set(d.width,d.depth,1);
    fogDummy.updateMatrix();
    groundFog.setMatrixAt(i,fogDummy.matrix);
  }
  groundFog.instanceMatrix.needsUpdate=true;
}
updateFogInstances(0);


// Cached low-resolution scene depth for soft intersection fading.
let depthTarget=null;
flags.depth=true;
function resizeDepthTarget(){
  const size=getSize();
  const scale=(size.compact??(Math.min(size.width,size.height)<600||size.width<760)) ? .32 : .38;
  const drawSize=new THREE.Vector2();
  renderer.getDrawingBufferSize(drawSize);
  const w=Math.max(256,Math.floor(drawSize.x*scale));
  const h=Math.max(144,Math.floor(drawSize.y*scale));
  if(depthTarget)depthTarget.dispose();
  depthTarget=new THREE.WebGLRenderTarget(w,h,{
    minFilter:THREE.NearestFilter,
    magFilter:THREE.NearestFilter
  });
  depthTarget.depthTexture=new THREE.DepthTexture(w,h);
  depthTarget.depthTexture.type=THREE.UnsignedShortType;
  fogUniforms.tDepth.value=depthTarget.depthTexture;
  // gl_FragCoord is in the main framebuffer's pixel coordinates.
  fogUniforms.resolution.value.copy(drawSize);
  flags.depth=true;
}
resizeDepthTarget();

function updateDepthTexture(){
  if(!flags.depth||!state.fog)return;
  const mistWasVisible=forestMist.visible;
  const skyWasVisible=sky.visible;
  const sunWasVisible=sunDisc.visible;
  const moonWasVisible=moonDisc.visible;
  const starsWereVisible=starField.visible;
  forestMist.visible=false;sky.visible=false;starField.visible=false;sunDisc.visible=false;moonDisc.visible=false;

  renderer.setRenderTarget(depthTarget);
  renderer.clear();
  renderer.render(scene,camera);
  renderer.setRenderTarget(null);

  forestMist.visible=mistWasVisible;sky.visible=skyWasVisible;
  sunDisc.visible=sunWasVisible;moonDisc.visible=moonWasVisible;starField.visible=starsWereVisible;
  flags.depth=false;
}


return {forestMist,fogUniforms,updateFogInstances,updateDepthTexture,resize:resizeDepthTarget,dispose(){depthTarget?.dispose();}};
}
