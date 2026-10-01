// Paperchalk Demo v12.32 visual baseline. Extracted without changing shader or art parameters.
import {smoothstep} from './math.js';

export function createLights({THREE,scene,target}){
const hemi=new THREE.HemisphereLight(0xdceeff,0x8b6549,1.45);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe1b1,3.0);
sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=15;sun.shadow.camera.bottom=-6;
sun.shadow.camera.near=.1;sun.shadow.camera.far=42;sun.shadow.bias=-.0005;sun.shadow.normalBias=.025;sun.shadow.radius=3.5;
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
  const a=state.time*Math.PI*2-Math.PI/2;
  const ma=a+Math.PI;
  const rawSun=Math.sin(a),rawMoon=Math.sin(ma);
  const sunUp=Math.max(rawSun,0),moonUp=Math.max(rawMoon,0);
  const sunFade=smoothstep(-.16,.18,rawSun);
  const moonFade=smoothstep(-.16,.18,rawMoon);
  const twilight=1-smoothstep(.025,.34,Math.abs(rawSun));

  // Two real directional lights orbit continuously, 180 degrees apart.
  // Nothing is turned on/off at sunset: only their smooth intensities change.
  const orbitX=18,orbitY=18,orbitBaseY=1.1,orbitZ=-18;
  let sx=-Math.cos(a)*orbitX,sy=orbitBaseY+Math.sin(a)*orbitY,sz=orbitZ;
  let mx=-Math.cos(ma)*orbitX,my=orbitBaseY+Math.sin(ma)*orbitY,mz=orbitZ;

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
  sun.position.set(sx,sy,sz);
  moon.position.set(mx,my,mz);

  const sunDawn=new THREE.Color(0xff9b5f);
  const sunSunset=new THREE.Color(0xff654d);
  const sunWarm=state.time<.5?sunDawn:sunSunset;
  const sunDay=new THREE.Color(0xffe8c4);
  sun.color.copy(sunWarm).lerp(sunDay,smoothstep(.08,.72,sunUp));
  sun.intensity=sunFade*(.14+sunUp*2.62+twilight*.96);

  moon.color.set(0x72a4ff);
  moon.intensity=moonFade*(.16+moonUp*1.46+twilight*.12);

  sun.castShadow=state.shadow&&sun.intensity>.10;
  moon.castShadow=state.shadow&&moon.intensity>.10;

  // Environment fill follows both celestial lights continuously.
  const dayMix=sunFade;
  const nightMix=moonFade*(1-sunFade*.55);
  hemi.intensity=.66+dayMix*.72+nightMix*.18+twilight*.10;
  const hemiDay=new THREE.Color(0xdceeff);
  const hemiNight=new THREE.Color(0x7897d0);
  const hemiWarm=new THREE.Color(0xffcfb0);
  hemi.color.copy(hemiNight).lerp(hemiDay,dayMix).lerp(hemiWarm,twilight*.22*sunFade);

  const groundDay=new THREE.Color(0x9c7656);
  const groundNight=new THREE.Color(0x455777);
  const groundWarm=new THREE.Color(0xb86f50);
  hemi.groundColor.copy(groundNight).lerp(groundDay,dayMix).lerp(groundWarm,twilight*.22*sunFade);

  ambientFill.intensity=.29+dayMix*.14+nightMix*.11+twilight*.05;
  const ambientDay=new THREE.Color(0xe7edf0);
  const ambientNight=new THREE.Color(0x789bd5);
  const ambientWarm=new THREE.Color(0xffd2b8);
  ambientFill.color.copy(ambientNight).lerp(ambientDay,dayMix).lerp(ambientWarm,twilight*.16*sunFade);

  viewFill.intensity=.17+(1-dayMix)*.18+twilight*.08;
  const viewDay=new THREE.Color(0xf7f0e6);
  const viewNight=new THREE.Color(0x88aff0);
  const viewWarm=new THREE.Color(0xffc3a1);
  viewFill.color.copy(viewNight).lerp(viewDay,dayMix).lerp(viewWarm,twilight*.28*sunFade);

  const horizonDay=new THREE.Color(0xb9d9e2);
  const horizonNight=new THREE.Color(0x445b88);
  const horizonWarm=new THREE.Color(0xdf6a83);
  const horizonGold=new THREE.Color(0xf2a06a);
  const fogColor=horizonNight.clone().lerp(horizonDay,dayMix).lerp(horizonWarm,twilight*.42*sunFade).lerp(horizonGold,twilight*.18*sunFade);

  if(state.fog){
    const density=.0070+twilight*.0022+nightMix*.0014;
    scene.fog=new THREE.FogExp2(fogColor,density);
  }

  const mistDay=new THREE.Color(0xe4ece3);
  const mistNight=new THREE.Color(0x94b4e8);
  const mistWarm=new THREE.Color(0xe7a99e);
  const mistColor=mistNight.clone().lerp(mistDay,dayMix).lerp(mistWarm,twilight*.34*sunFade);
  fogUniforms.tint.value.copy(mistColor);
  fogUniforms.opacity.value=.055+twilight*.025*sunFade+nightMix*.012;

  // Dawn rays stay warm, but never wash the pulp layers to white on a phone.
  renderer.toneMappingExposure=state.tone?(.80+dayMix*.10+twilight*.025):1;
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
  moonDisc.visible=state.sky;
  sunGlow.visible=state.sky;
  moonGlow.visible=state.sky;
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
    playerTintTmp.copy(playerNightTint).lerp(playerDayTint,dayAmount);
    if(twilight>0)playerTintTmp.lerp(playerDuskTint,twilight*.28*sunFade);
    actor.playerMat.color.copy(playerTintTmp);
    actor.playerMat.emissiveIntensity=.012+(1-dayMix)*.018;
  }

  const bounceDay=.20+dayMix*.30+twilight*.08*sunFade;
  const bounceNight=nightMix*.16;
  groundBounce.intensity=state.bounce?(bounceDay+bounceNight):0;
  const bounceDayColor=new THREE.Color(0xc8d49b);
  const bounceNightColor=new THREE.Color(0x849dc8);
  const bounceWarmColor=new THREE.Color(0xd3946e);
  groundBounce.color.copy(bounceNightColor).lerp(bounceDayColor,dayMix).lerp(bounceWarmColor,twilight*.18*sunFade);

  if(contactShadow?.material){
    contactShadow.material.opacity=.24+dayMix*.32+nightMix*.08+twilight*.05;
  }

  updateVolumetricSettings(state.time);
  flags.volumeShadow=true;
  flags.render=true;
  flags.shadow=true;
}

return {updateLighting};
}
