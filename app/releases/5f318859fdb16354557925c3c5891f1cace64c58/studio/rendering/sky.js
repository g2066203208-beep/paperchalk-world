// Paperchalk Demo v12.32 visual baseline. Extracted without changing shader or art parameters.
import {rng} from './math.js';

export function createSky({THREE,scene,renderer,camera,sceneId='forest'}){
const skyUniforms={
  time01:{value:.27},
  drama:{value:1.0},
  cityScene:{value:sceneId==='city-prologue'?1:0}
};
const skyMat=new THREE.ShaderMaterial({
  uniforms:skyUniforms,
  side:THREE.BackSide,
  depthWrite:false,
  fog:false,
  toneMapped:false,
  vertexShader:`
    varying vec3 vSkyPos;
    void main(){
      vSkyPos=position;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    }
  `,
  fragmentShader:`
    varying vec3 vSkyPos;
    uniform float time01;
    uniform float drama;
    uniform float cityScene;

    float ease01(float x){
      x=clamp(x,0.0,1.0);
      return x*x*x*(x*(x*6.0-15.0)+10.0);
    }
    float ramp(float a,float b,float x){
      return ease01((x-a)/(b-a));
    }
    vec3 vertical3(vec3 top,vec3 mid,vec3 bottom,float y){
      return y<0.52
        ? mix(bottom,mid,ease01(y/0.52))
        : mix(mid,top,ease01((y-0.52)/0.48));
    }

    void main(){
      float t=fract(time01);
      float y=clamp(normalize(vSkyPos).y*.5+.5,0.0,1.0);

      float wn=0.0,wd=0.0,wday=0.0,ws=0.0;
      if(t<.15||t>=.92){
        wn=1.0;
      }else if(t<.27){
        float q=ramp(.15,.27,t);wn=1.0-q;wd=q;
      }else if(t<.42){
        float q=ramp(.27,.42,t);wd=1.0-q;wday=q;
      }else if(t<.60){
        wday=1.0;
      }else if(t<.76){
        float q=ramp(.60,.76,t);wday=1.0-q;ws=q;
      }else{
        float q=ramp(.76,.92,t);ws=1.0-q;wn=q;
      }

      vec3 night=vertical3(
        vec3(.055,.085,.17),
        vec3(.13,.21,.38),
        vec3(.29,.37,.54),y
      );
      vec3 dawn=vertical3(
        vec3(.34,.24,.48),
        vec3(.78,.37,.59),
        vec3(.99,.61,.30),y
      );
      vec3 day=vertical3(
        vec3(.34,.61,.82),
        vec3(.55,.77,.89),
        vec3(.87,.93,.91),y
      );
      vec3 sunset=vertical3(
        vec3(.20,.105,.29),
        vec3(.67,.20,.39),
        vec3(.97,.54,.31),y
      );

      vec3 col=night*wn+dawn*wd+day*wday+sunset*ws;

      // A handmade diorama has a warm sun-side horizon and a pink-violet
      // paper sky on the opposite side; a purely vertical ramp reads flat.
      float side=clamp(vSkyPos.x/22.0*.5+.5,0.0,1.0);
      float horizonBand=smoothstep(.10,.72,1.0-abs(y-.50)*2.0);
      vec3 warmSide=vec3(1.0,.76,.32);
      vec3 roseSide=vec3(.70,.28,.56);
      col=mix(col,mix(warmSide,roseSide,side),horizonBand*(wd*.88+ws*.30));

      // Original-colour horizon glow only; no texture blur.
      float horizon=pow(max(0.0,1.0-abs(y-.48)*2.0),3.0);
      col+=horizon*vec3(.12,.025,.055)*ws*.55*drama;
      col+=horizon*vec3(.07,.025,.018)*wd*.20*drama;

      // Far paper banks break up the empty strip under the tree canopy. They
      // remain fixed in world direction, behind every real tree and surface.
      // Three overlapping silhouettes are deliberately broad, not noisy clouds.
      vec3 skyDir=normalize(vSkyPos);
      float azimuth=atan(skyDir.x,-skyDir.z);
      float bank0=.025+.025*sin(azimuth*8.0+.5)+.012*sin(azimuth*21.0+1.0);
      float bank1=-.004+.022*sin(azimuth*10.0+2.2)+.009*sin(azimuth*25.0);
      float bank2=-.036+.018*sin(azimuth*12.0-.9)+.011*sin(azimuth*19.0+.8);
      float twilightBanks=(wd+ws*.65)*(1.0-cityScene);
      vec3 farPaper=mix(vec3(.91,.61,.39),vec3(.64,.34,.47),side);
      vec3 midPaper=mix(vec3(.86,.53,.30),vec3(.61,.32,.43),side);
      vec3 nearPaper=mix(vec3(.79,.51,.30),vec3(.53,.31,.39),side);
      col=mix(col,farPaper,(1.0-smoothstep(bank0-.008,bank0+.008,skyDir.y))*.28*twilightBanks);
      col=mix(col,midPaper,(1.0-smoothstep(bank1-.006,bank1+.006,skyDir.y))*.27*twilightBanks);
      col=mix(col,nearPaper,(1.0-smoothstep(bank2-.005,bank2+.005,skyDir.y))*.24*twilightBanks);

      // A low, dark urban sky leaves room for bright cold street shafts.
      col=mix(col,col*vec3(.55,.62,.75),cityScene*wn);
      gl_FragColor=vec4(col,1.0);
      #include <colorspace_fragment>
    }
  `
});
const sky=new THREE.Mesh(new THREE.SphereGeometry(48,32,18),skyMat);
sky.scale.y=.72;
scene.add(sky);

// ---------------------------------------------------------------------------
// Procedural star field: NO star texture.
// 900 point stars with independent size, brightness, tint and twinkle.
// ---------------------------------------------------------------------------
const STAR_COUNT=650;
const starPositions=new Float32Array(STAR_COUNT*3);
const starSizes=new Float32Array(STAR_COUNT);
const starBrightness=new Float32Array(STAR_COUNT);
const starPhases=new Float32Array(STAR_COUNT);
const starSpeeds=new Float32Array(STAR_COUNT);
const starTints=new Float32Array(STAR_COUNT*3);
const starRand=rng(20260930);

for(let i=0;i<STAR_COUNT;i++){
  const theta=starRand()*Math.PI*2;
  const y=.10+starRand()*.88;
  const radial=Math.sqrt(Math.max(0,1-y*y));
  const x=Math.cos(theta)*radial;
  const z=Math.sin(theta)*radial;
  const radius=45.5;

  starPositions[i*3]=x*radius;
  starPositions[i*3+1]=y*radius;
  starPositions[i*3+2]=z*radius;

  const big=starRand()<.055;
  starSizes[i]=big?3.2+starRand()*2.0:1.05+starRand()*1.55;
  starBrightness[i]=big?.72+starRand()*.28:.28+starRand()*.48;
  starPhases[i]=starRand()*Math.PI*2;
  starSpeeds[i]=.45+starRand()*.95;

  const pick=starRand();
  const tint=pick<.72
    ?new THREE.Color(0xf7f9ff)
    :pick<.93
      ?new THREE.Color(0xd8e8ff)
      :new THREE.Color(0xffead3);
  starTints[i*3]=tint.r;
  starTints[i*3+1]=tint.g;
  starTints[i*3+2]=tint.b;
}

const starGeometry=new THREE.BufferGeometry();
starGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));
starGeometry.setAttribute('aSize',new THREE.BufferAttribute(starSizes,1));
starGeometry.setAttribute('aBrightness',new THREE.BufferAttribute(starBrightness,1));
starGeometry.setAttribute('aPhase',new THREE.BufferAttribute(starPhases,1));
starGeometry.setAttribute('aSpeed',new THREE.BufferAttribute(starSpeeds,1));
starGeometry.setAttribute('aTint',new THREE.BufferAttribute(starTints,3));

const starUniforms={
  time:{value:0},
  strength:{value:0},
  twinkle:{value:.18},
  moonDir:{value:new THREE.Vector3(0,1,0)},
  pixelRatio:{value:renderer.getPixelRatio()}
};

const starMaterial=new THREE.ShaderMaterial({
  uniforms:starUniforms,
  transparent:true,
  depthWrite:false,
  depthTest:true,
  blending:THREE.AdditiveBlending,
  toneMapped:false,
  vertexShader:`
    attribute float aSize;
    attribute float aBrightness;
    attribute float aPhase;
    attribute float aSpeed;
    attribute vec3 aTint;
    varying float vBrightness;
    varying float vPhase;
    varying float vSpeed;
    varying vec3 vTint;
    varying vec3 vDir;
    uniform float time;
    uniform float pixelRatio;
    void main(){
      vBrightness=aBrightness;
      vPhase=aPhase;
      vSpeed=aSpeed;
      vTint=aTint;
      vDir=normalize(position);

      vec4 mv=modelViewMatrix*vec4(position,1.0);
      gl_Position=projectionMatrix*mv;

      float breath=1.0+sin(time*(.42+aSpeed)+aPhase)*.09;
      float perspective=clamp(38.0/max(18.0,-mv.z),.55,1.35);
      gl_PointSize=aSize*pixelRatio*breath*perspective;
    }
  `,
  fragmentShader:`
    varying float vBrightness;
    varying float vPhase;
    varying float vSpeed;
    varying vec3 vTint;
    varying vec3 vDir;
    uniform float time;
    uniform float strength;
    uniform float twinkle;
    uniform vec3 moonDir;

    void main(){
      vec2 p=gl_PointCoord-.5;
      float d=length(p);
      if(d>.5)discard;

      float core=smoothstep(.28,0.0,d);
      float halo=smoothstep(.50,.10,d)*.32;
      float flicker=1.0+sin(time*(.55+vSpeed)+vPhase)*twinkle;

      // Bright moon washes out nearby stars.
      float moonDot=dot(normalize(vDir),normalize(moonDir));
      float moonMask=1.0-smoothstep(.955,.997,moonDot);

      // Tiny irregularity keeps the dots from feeling perfectly digital.
      float grain=fract(sin(dot(gl_PointCoord,vec2(12.9898,78.233)))*43758.5453);
      float alpha=(core+halo)*vBrightness*flicker*strength*moonMask*(.94+grain*.06);

      gl_FragColor=vec4(vTint*(.92+core*.42),alpha);
    }
  `
});
const starField=new THREE.Points(starGeometry,starMaterial);
starField.frustumCulled=false;
starField.renderOrder=10;
scene.add(starField);

// Visible sun/moon discs so the lighting direction reads immediately.
const sunDisc=new THREE.Mesh(new THREE.CircleGeometry(.72,40),new THREE.MeshBasicMaterial({color:0xffe5a8,toneMapped:false,transparent:true,opacity:.96}));
const moonDisc=new THREE.Mesh(new THREE.CircleGeometry(.54,40),new THREE.MeshBasicMaterial({color:0xe4ecff,toneMapped:false,transparent:true,opacity:.9}));

function glowTexture(){
  const size=256,c=document.createElement('canvas');c.width=c.height=size;
  const g=c.getContext('2d');
  const r=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  r.addColorStop(0,'rgba(255,255,255,.92)');
  r.addColorStop(.16,'rgba(255,255,255,.48)');
  r.addColorStop(.46,'rgba(255,255,255,.13)');
  r.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=r;g.fillRect(0,0,size,size);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const celestialGlowTex=glowTexture();
const sunGlow=new THREE.Sprite(new THREE.SpriteMaterial({
  map:celestialGlowTex,color:0xffa75c,transparent:true,opacity:.28,
  blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,toneMapped:false
}));
const moonGlow=new THREE.Sprite(new THREE.SpriteMaterial({
  map:celestialGlowTex,color:0x85adff,transparent:true,opacity:.22,
  blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,toneMapped:false
}));
sunGlow.scale.set(6.2,6.2,1);moonGlow.scale.set(4.5,4.5,1);
scene.add(sunGlow,moonGlow,sunDisc,moonDisc);


return {skyUniforms,sky,starField,starUniforms,sunDisc,moonDisc,sunGlow,moonGlow};
}
