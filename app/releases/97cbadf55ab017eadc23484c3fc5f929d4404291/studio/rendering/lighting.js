// Paperchalk Demo v12.32 visual baseline. Extracted without changing shader or art parameters.
import {smoothstep} from './math.js';
import {cityLightProfile} from './city-light-profile.js';

export function createLights({THREE,scene,target}){
const hemi=new THREE.HemisphereLight(0xdceeff,0x8b6549,1.45);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe1b1,3.0);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=15;sun.shadow.camera.bottom=-6;
sun.shadow.camera.near=.1;sun.shadow.camera.far=52;sun.shadow.bias=-.0007;sun.shadow.normalBias=.045;sun.shadow.radius=2.4;
scene.add(sun);scene.add(sun.target);sun.target.position.set(0,1.0,.6);

const moon=new THREE.DirectionalLight(0xa9c4ff,0);
moon.castShadow=true;moon.shadow.mapSize.set(512,512);
moon.shadow.camera.left=-18;moon.shadow.camera.right=18;moon.shadow.camera.top=15;moon.shadow.camera.bottom=-6;
moon.shadow.camera.near=.1;moon.shadow.camera.far=42;moon.shadow.bias=-.0004;moon.shadow.normalBias=.02;moon.shadow.radius=3;
scene.add(moon);scene.add(moon.target);moon.target.position.set(0,1.0,.6);

// Cheap stylized ground bounce.
// The previous version used two PointLights close to the floor. Those created the
// two visible white hotspots and were expensive on every paper fragment.
// A single no-shadow DirectionalLight gives broad colour bleed with no hotspot.
const groundBounce=new THREE.DirectionalLight(0xc6cf9a,.34);
groundBounce.position.set(0,-3,6);
groundBounce.castShadow=false;
scene.add(groundBounce);scene.add(groundBounce.target);
groundBounce.target.position.set(0,1.0,0);

// Art-directed fill for a comfortable stylized game look.
// AmbientFill prevents deep blacks; viewFill is a very soft camera-side light
// so the player and terrain silhouettes stay readable without looking self-lit.
const ambientFill=new THREE.AmbientLight(0xdde8f2,.38);
scene.add(ambientFill);

const viewFill=new THREE.DirectionalLight(0xf5efe5,.24);
viewFill.castShadow=false;
scene.add(viewFill);scene.add(viewFill.target);
viewFill.target.position.copy(target);


return {hemi,sun,moon,groundBounce,ambientFill,viewFill};
}

export function createLightingController({THREE,scene,camera,renderer,state,flags,lights,celestials,fog,atmosphere,actor}){
const {hemi,sun,moon,groundBounce,ambientFill,viewFill}=lights;
const {skyUniforms,starUniforms,starField,sunDisc,moonDisc,sunGlow,moonGlow}=celestials;
const {fogUniforms}=fog;
const {volumeLightTarget,updateVolumetricSettings}=atmosphere;
const {contactShadow}=actor;
const playerDayTint=new THREE.Color(0xffffff);
const playerDuskTint=new THREE.Color(0xffead8);
const playerNightTint=new THREE.Color(0xc9d6ee);
const playerTintTmp=new THREE.Color();
function updateSkyBlend(t){skyUniforms.time01.value=((t%1)+1)%1;}
function updateLighting(t){
  state.time=((t%1)+1)%1;
  const city=state.sceneId==='city-prologue',cityProfile=city?cityLightProfile(state.time):null;
  const a=state.time*Math.PI*2-Math.PI/2;
  const ma=a+Math.PI;
  const rawSun=Math.sin(a),rawMoon=Math.sin(ma);
  const sunUp=Math.max(rawSun,0),moonUp=Math.max(rawMoon,0);
  const sunFade=smoothstep(-.16,.18,rawSun);
  const moonFade=smoothstep(-.16,.18,rawMoon);
  const twilight=1-smoothstep(.025,.34,Math.abs(rawSun));

  // Two real directional lights orbit continuously, 180 degrees apart.
  // Nothing is turned on/off at sunset: only their smooth intensities change.
  const orbitX=18,orbitY=18,orbitBaseY=1.1,orbitZ=-9;
  let sx=-Math.cos(a)*orbitX,sy=orbitBaseY+Math.sin(a)*orbitY,sz=orbitZ;
  let mx=-Math.cos(ma)*orbitX,my=orbitBaseY+Math.sin(ma)*orbitY,mz=orbitZ;
  // Keep the dawn palette while lifting the key above the tree-line. At the
  // default dawn the old orbit was only 5 degrees high and never lit the pulp.
  sy+=12.0*twilight*sunFade;
  // Dawn enters from behind the left-hand tree gaps, not almost sideways.
  // Surface shadows and volumetric occlusion share this exact light position.
  sz-=10.0*twilight*sunFade;
  if(city){
    // A stable diagonal reads through alleys and roof gaps. Only its strength
    // follows the clock; sunrise still turns the moon off continuously.
    mx=-10;my=16;mz=8;
  }

  // Manual control still steers the sun; the moon continues its clock orbit.
  if(state.manualSun){
    const az=THREE.MathUtils.degToRad(state.sunAzimuth);
    const el=THREE.MathUtils.degToRad(state.sunElevation);
    const radius=23;
    const horizontal=Math.cos(el)*radius;
    sx=Math.sin(az)*horizontal;
    sy=3.0+Math.sin(el)*radius;
    sz=-Math.cos(az)*horizontal;
  }
  sun.position.set(sx+volumeLightTarget.x,sy,sz);
  moon.position.set(mx+volumeLightTarget.x,my,mz);

  const sunDawn=new THREE.Color(city?0xff8bc5:0xffd894);
  const sunSunset=new THREE.Color(city?0xff668f:0xff654d);
  const sunWarm=state.time<.5?sunDawn:sunSunset;
  const sunDay=new THREE.Color(0xffe8c4);
  sun.color.copy(sunWarm).lerp(sunDay,smoothstep(.08,.72,sunUp));
  // Golden grazing light has to reveal fibre relief, not clip a broad area of
  // rough paper to yellow-white. The bevels supply the narrow bright accents.
  sun.intensity=sunFade*(.45+sunUp*3.6+twilight*3.8);

  moon.color.set(0x72a4ff);
  moon.intensity=moonFade*(.16+moonUp*1.46+twilight*.12);
  if(city){
    sun.intensity=cityProfile.sunIntensity;
    moon.color.setHex(cityProfile.moonColor);moon.intensity=cityProfile.moonIntensity;
    if(moon.shadow.mapSize.x!==1024){
      moon.shadow.mapSize.set(1024,1024);moon.shadow.map?.dispose();moon.shadow.map=null;
      moon.shadow.camera.far=58;moon.shadow.bias=-.0006;moon.shadow.normalBias=.04;
      moon.shadow.camera.updateProjectionMatrix();
    }
    for(const local of lights.locals??[]){
      local.userData.cityBaseIntensity??=local.intensity;
      local.intensity=local.userData.cityBaseIntensity*cityProfile.localLightFactor;
    }
  }

  sun.castShadow=state.shadow&&sun.intensity>.10;
  moon.castShadow=state.shadow&&moon.intensity>.10;

  // Environment fill follows both celestial lights continuously.
  const dayMix=sunFade;
  const nightMix=moonFade*(1-sunFade*.55);
  hemi.intensity=.40+dayMix*.76+nightMix*.16+twilight*.10*sunFade;
  if(city)hemi.intensity=cityProfile.hemiIntensity;
  const hemiDay=new THREE.Color(0xcbd8d5);
  const hemiNight=new THREE.Color(city?0xbfc5e2:0x7897d0);
  const hemiWarm=new THREE.Color(city?0x9b79b4:0xdce1bd);
  hemi.color.copy(hemiNight).lerp(hemiDay,dayMix).lerp(hemiWarm,twilight*.18*sunFade);

  const groundDay=new THREE.Color(0x9c7656);
  const groundNight=new THREE.Color(0x455777);
  const groundWarm=new THREE.Color(0xb86f50);
  hemi.groundColor.copy(groundNight).lerp(groundDay,dayMix).lerp(groundWarm,twilight*.22*sunFade);

  ambientFill.intensity=.16+dayMix*.14+nightMix*.10;
  if(city)ambientFill.intensity=cityProfile.ambientIntensity;
  const ambientDay=new THREE.Color(0xe7edf0);
  const ambientNight=new THREE.Color(city?0xe5dce3:0x789bd5);
  const ambientWarm=new THREE.Color(city?0xd896c9:0xffd2b8);
  ambientFill.color.copy(ambientNight).lerp(ambientDay,dayMix).lerp(ambientWarm,twilight*.20*sunFade);

  // A broad warm bounce opens printed ink and vertical soil faces in the
  // backlit dawn. Contact AO, rather than black fill, supplies recess depth.
  viewFill.intensity=.50+(1-dayMix)*.12+twilight*.24*sunFade;
  if(city)viewFill.intensity=cityProfile.viewIntensity;
  const viewDay=new THREE.Color(0xf7f0e6);
  const viewNight=new THREE.Color(city?0xffe9cf:0x88aff0);
  const viewWarm=new THREE.Color(city?0xe7b5d6:0xffdfb5);
  viewFill.color.copy(viewNight).lerp(viewDay,dayMix).lerp(viewWarm,twilight*.48*sunFade);

  const horizonDay=new THREE.Color(0xb9d0d6);
  const horizonNight=new THREE.Color(city?0x717ba1:0x445b88);
  const horizonWarm=new THREE.Color(city?0x9c6f9c:0xf3b6a0);
  const horizonGold=new THREE.Color(0xffdfa5);
  const fogColor=horizonNight.clone().lerp(horizonDay,dayMix).lerp(horizonWarm,twilight*.88*sunFade).lerp(horizonGold,twilight*.28*sunFade);

  if(state.fog){
    // A clear near field and a deliberately separated distant forest. An
    // exponential veil starting at the camera greyed the character and pulp.
    const fogNear=city?26:16.0-twilight*.5;
    const fogFar=city?85:53.0-twilight*3.0+nightMix*3.0;
    if(!scene.fog?.isFog)scene.fog=new THREE.Fog(fogColor,fogNear,fogFar);
    else{scene.fog.color.copy(fogColor);scene.fog.near=fogNear;scene.fog.far=fogFar;}
  }

  const mistDay=new THREE.Color(0xe2d5b3);
  const mistNight=new THREE.Color(city?0x536d9f:0x94b4e8);
  const mistWarm=new THREE.Color(city?0xc588b1:0xe9be8f);
  const mistColor=mistNight.clone().lerp(mistDay,dayMix).lerp(mistWarm,twilight*.34*sunFade);
  fogUniforms.tint.value.copy(mistColor);
  fogUniforms.opacity.value=.014+twilight*.017*sunFade+nightMix*.006;
  if(city)fogUniforms.opacity.value=.0015+twilight*.002;

  // Dawn rays stay warm, but never wash the pulp layers to white on a phone.
  renderer.toneMappingExposure=state.tone?(.91+dayMix*.12+twilight*.012):1;
  if(city&&state.tone)renderer.toneMappingExposure=cityProfile.exposure;
  scene.background.copy(fogColor);
  updateSkyBlend(state.time);

  const sunDir=new THREE.Vector3().copy(sun.position).sub(volumeLightTarget).normalize();
  const moonDir=new THREE.Vector3().copy(moon.position).sub(volumeLightTarget).normalize();

  // Stars appear only after civil twilight, then deepen smoothly into night.
  // No hard night switch and no sky/star image assets.
  const starStrength=1-smoothstep(-.30,-.045,rawSun);
  starUniforms.strength.value=starStrength*1.22;
  starUniforms.moonDir.value.copy(moonDir);
  starField.visible=state.sky&&starStrength>.002;
  sunDisc.position.copy(camera.position).addScaledVector(sunDir,34);
  moonDisc.position.copy(camera.position).addScaledVector(moonDir,34);
  sunGlow.position.copy(sunDisc.position);
  moonGlow.position.copy(moonDisc.position);
  sunDisc.lookAt(camera.position);
  moonDisc.lookAt(camera.position);

  // Discs never hard-toggle at the horizon. Opacity does the continuous fade.
  sunDisc.visible=state.sky;
  moonDisc.visible=state.sky&&!city;
  sunGlow.visible=state.sky;
  moonGlow.visible=state.sky&&!city;
  sunDisc.material.opacity=sunFade*(.42+sunUp*.55);
  moonDisc.material.opacity=moonFade*(.42+moonUp*.46);
  sunDisc.material.color.copy(sun.color).lerp(new THREE.Color(0xfff0c7),.22);
  moonDisc.material.color.set(0xc4d8ff);
  sunGlow.material.color.copy(sun.color);
  moonGlow.material.color.set(0x6797ff);
  sunGlow.material.opacity=sunFade*(.11+twilight*.38+sunUp*.08);
  moonGlow.material.opacity=moonFade*(.14+moonUp*.28);

  if(actor.playerMat){
    const dayAmount=dayMix;
    playerTintTmp.copy(city?playerDayTint:playerNightTint).lerp(playerDayTint,dayAmount);
    if(twilight>0)playerTintTmp.lerp(playerDuskTint,twilight*.28*sunFade);
    actor.playerMat.color.copy(playerTintTmp);
    actor.playerMat.emissiveIntensity=0;
  }
  // Store lighting before the asynchronous character texture is ready too.
  const keyIsSun=sun.intensity>=moon.intensity;
  actor.setPaperLighting?.(keyIsSun?sunDir:moonDir,keyIsSun?sun.color:moon.color,
    keyIsSun?sun.intensity*.16:moon.intensity*(city?.44:.28));

  const bounceDay=.20+dayMix*.30+twilight*.08*sunFade;
  const bounceNight=nightMix*.16;
  groundBounce.intensity=state.bounce?(bounceDay+bounceNight):0;
  if(city)groundBounce.intensity=state.bounce?cityProfile.bounceIntensity:0;
  const bounceDayColor=new THREE.Color(0xc8d49b);
  const bounceNightColor=new THREE.Color(0x849dc8);
  const bounceWarmColor=new THREE.Color(0xd3946e);
  groundBounce.color.copy(bounceNightColor).lerp(bounceDayColor,dayMix).lerp(bounceWarmColor,twilight*.18*sunFade);

  if(contactShadow?.material){
    contactShadow.userData.baseOpacity=.30+dayMix*.38+nightMix*.08+twilight*.04;
    contactShadow.material.opacity=contactShadow.userData.baseOpacity*(contactShadow.userData.groundFactor??1);
  }

  updateVolumetricSettings(state.time);
  flags.volumeShadow=true;
  flags.render=true;
  flags.shadow=true;
}

return {updateLighting};
}
