/* PaperMaterial v3 — reference-match cardstock
 * The target look is compressed coloured paper, not embossed bark.
 * Most visible detail lives in albedo/roughness; normals stay deliberately weak.
 * Texture sets are generated once on CPU and reused by the terrain meshes.
 */
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function smooth(t){return t*t*(3-2*t)}
function mix(a,b,t){return a+(b-a)*t}

function makeRng(seed){
  let s=seed>>>0;
  return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
}
function hash2(ix,iy,seed){
  let h=(Math.imul((ix|0)^seed,0x45d9f3b)+Math.imul((iy|0)^0x9e3779b9,0x27d4eb2d))|0;
  h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;return (h>>>0)/4294967295;
}
function periodicNoise01(x,y,period,seed){
  const px=x*period,py=y*period,x0=Math.floor(px),y0=Math.floor(py);
  const fx=smooth(px-x0),fy=smooth(py-y0),mod=v=>((v%period)+period)%period;
  const a=hash2(mod(x0),mod(y0),seed),b=hash2(mod(x0+1),mod(y0),seed);
  const c=hash2(mod(x0),mod(y0+1),seed),d=hash2(mod(x0+1),mod(y0+1),seed);
  return mix(mix(a,b,fx),mix(c,d,fx),fy);
}
function fbm01(x,y,seed){
  return periodicNoise01(x,y,2,seed)*.44+
    periodicNoise01(x,y,4,seed+19)*.27+
    periodicNoise01(x,y,8,seed+43)*.18+
    periodicNoise01(x,y,16,seed+79)*.11;
}
function deposit(field,size,x,y,radius,amount){
  const minX=Math.floor(x-radius),maxX=Math.ceil(x+radius),minY=Math.floor(y-radius),maxY=Math.ceil(y+radius),rr=radius*radius;
  for(let yy=minY;yy<=maxY;yy++)for(let xx=minX;xx<=maxX;xx++){
    const dx=xx+.5-x,dy=yy+.5-y,d2=dx*dx+dy*dy;if(d2>rr)continue;
    const wx=((xx%size)+size)%size,wy=((yy%size)+size)%size,fall=1-d2/rr;
    field[wy*size+wx]+=amount*fall*fall;
  }
}
function stroke(field,size,rng,{count,minLength,maxLength,minRadius,maxRadius,angle=0,jitter=Math.PI,strength=.04}){
  for(let i=0;i<count;i++){
    const x=rng()*size,y=rng()*size,a=angle+(rng()+rng()+rng()-1.5)*jitter;
    const len=minLength+rng()*(maxLength-minLength),rad=minRadius+rng()*(maxRadius-minRadius);
    const steps=Math.max(2,Math.ceil(len*1.35)),w=strength*(.55+rng()*.8);
    for(let j=0;j<=steps;j++){
      const t=j/steps-.5,wob=(rng()-.5)*rad*.24;
      deposit(field,size,x+Math.cos(a)*len*t-Math.sin(a)*wob,y+Math.sin(a)*len*t+Math.cos(a)*wob,rad,w);
    }
  }
}
function normalizeField(field){
  let min=Infinity,max=-Infinity;
  for(const v of field){if(v<min)min=v;if(v>max)max=v}
  const span=Math.max(1e-6,max-min);
  for(let i=0;i<field.length;i++)field[i]=(field[i]-min)/span;
  return field;
}

function buildStock(size,{seed=1,side=false}={}){
  const rng=makeRng(seed);
  const height=new Float32Array(size*size),macro=new Float32Array(size*size),pulp=new Float32Array(size*size),flecks=new Float32Array(size*size);

  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,u=x/size,v=y/size;
    const m=fbm01(u,v,seed+101),p=periodicNoise01(u,v,32,seed+211)*.58+periodicNoise01(u,v,64,seed+307)*.42;
    macro[i]=m;pulp[i]=p;
    height[i]=m*.15+p*.045;
  }

  if(side){
    // Cardboard core in the reference is dense pulp: short broken fibres and
    // particles, not long horizontal grooves.
    stroke(height,size,rng,{count:2100,minLength:1.2,maxLength:7,minRadius:.16,maxRadius:.42,angle:0,jitter:1.05,strength:.038});
    stroke(height,size,rng,{count:650,minLength:.8,maxLength:4,minRadius:.14,maxRadius:.34,angle:Math.PI*.5,jitter:1.45,strength:.020});
  }else{
    // Pressed face stock: fine fibres are visible only in close-up.
    stroke(height,size,rng,{count:1700,minLength:1,maxLength:6,minRadius:.13,maxRadius:.34,angle:.12,jitter:1.45,strength:.030});
    stroke(height,size,rng,{count:700,minLength:.7,maxLength:3.8,minRadius:.12,maxRadius:.28,angle:Math.PI*.52,jitter:1.65,strength:.016});
  }

  const specks=side?2200:1350;
  for(let i=0;i<specks;i++){
    const x=rng()*size,y=rng()*size,r=.18+rng()*(side?.74:.52);
    const sign=rng()<.68?-1:1,amt=sign*(side?.075:.048)*(.35+rng());
    deposit(flecks,size,x,y,r,amt);
    deposit(height,size,x,y,r*.72,amt*(side?.17:.10));
  }

  normalizeField(height);
  // flecks deliberately remain signed; clamp at sampling time.
  return {height,macro,pulp,flecks};
}

function texture(THREE,data,size,{srgb=false,name='paper-map'}={}){
  const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
  t.name=name;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;
  if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;
}

function deriveSet(THREE,{size=512,seed=1,side=false}={}){
  const {height,macro,pulp,flecks}=buildStock(size,{seed,side});
  const albedo=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
  const at=(x,y)=>height[(((y%size)+size)%size)*size+(((x%size)+size)%size)];

  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,o=i*4,h=height[i],m=macro[i],p=pulp[i],f=clamp(flecks[i],-.12,.12);
    const dx=(at(x+1,y)-at(x-1,y))*.5,dy=(at(x,y+1)-at(x,y-1))*.5;

    // Reference: almost-flat paper. Normal detail should be sensed in grazing
    // light, never read as engraved/bumpy terrain.
    const micro=side?.72:.58;
    let nx=-dx*micro,ny=-dy*micro,nz=1,inv=1/Math.max(1e-6,Math.hypot(nx,ny,nz));
    nx*=inv;ny*=inv;nz*=inv;
    normal[o]=Math.round((nx*.5+.5)*255);normal[o+1]=Math.round((ny*.5+.5)*255);normal[o+2]=Math.round((nz*.5+.5)*255);normal[o+3]=255;

    // Paper identity is primarily diffuse pulp variation. The side stock is
    // warmer/darker and more particulate; the top is soft and low contrast.
    const broad=(m-.5)*(side?.090:.060),mid=(p-.5)*(side?.065:.040),fine=(h-.5)*(side?.035:.018);
    const warm=side?.045:.007;
    const base=clamp((side?.955:.985)+broad+mid+fine+f,.76,1.0);
    albedo[o]=Math.round(clamp(base,0,1)*255);
    albedo[o+1]=Math.round(clamp(base-warm*.34,0,1)*255);
    albedo[o+2]=Math.round(clamp(base-warm,0,1)*255);albedo[o+3]=255;

    const slope=clamp(Math.hypot(dx,dy)*3.2,0,1);
    const rr=clamp((side?.965:.945)+(h-.5)*(side?.030:.022)+slope*.018+(m-.5)*.018-f*.12,.86,.998);
    const rv=Math.round(rr*255);roughness[o]=rv;roughness[o+1]=rv;roughness[o+2]=rv;roughness[o+3]=255;
  }

  return {
    albedo:texture(THREE,albedo,size,{srgb:true,name:side?'paper-core-albedo-v3':'paper-face-albedo-v3'}),
    normal:texture(THREE,normal,size,{name:side?'paper-core-normal-v3':'paper-face-normal-v3'}),
    roughness:texture(THREE,roughness,size,{name:side?'paper-core-roughness-v3':'paper-face-roughness-v3'}),
    size,seed,side
  };
}

export function createPaperMaterialSet(THREE,settings){
  const resolution=512;
  const sets={
    top:deriveSet(THREE,{size:resolution,seed:0x31f2a7,side:false}),
    side:deriveSet(THREE,{size:resolution,seed:0xa9417d,side:true})
  };
  const grassFallback=new THREE.DataTexture(new Uint8Array([198,214,126,255]),1,1,THREE.RGBAFormat,THREE.UnsignedByteType);
  grassFallback.name='grass-reference-fallback';grassFallback.colorSpace=THREE.SRGBColorSpace;grassFallback.needsUpdate=true;
  const dirtFallback=new THREE.DataTexture(new Uint8Array([167,105,65,255]),1,1,THREE.RGBAFormat,THREE.UnsignedByteType);
  dirtFallback.name='dirt-reference-fallback';dirtFallback.colorSpace=THREE.SRGBColorSpace;dirtFallback.needsUpdate=true;
  let grassReference=grassFallback,grassLoaded=false,grassReferenceSize=[1,1],grassMaterial=null;
  let dirtReference=dirtFallback,dirtLoaded=false,dirtReferenceSize=[1,1],dirtMaterial=null;
  new THREE.TextureLoader().load('assets/materials/grass-reference.webp?v=grass-native-r1',tex=>{
    tex.name='user-supplied-grass-paper-512';tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
    tex.generateMipmaps=true;tex.anisotropy=8;tex.repeat.set(1,1);tex.offset.set(0,0);tex.needsUpdate=true;
    grassReference=tex;grassLoaded=true;grassReferenceSize=[tex.image?.width||512,tex.image?.height||512];
    if(grassMaterial){grassMaterial.map=tex;grassMaterial.needsUpdate=true}
  });
  new THREE.TextureLoader().load('assets/materials/dirt-reference.webp?v=dirt-native-r1',tex=>{
    tex.name='user-supplied-dirt-paper-256';tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
    tex.generateMipmaps=true;tex.anisotropy=8;tex.repeat.set(1,1);tex.offset.set(0,0);tex.needsUpdate=true;
    dirtReference=tex;dirtLoaded=true;dirtReferenceSize=[tex.image?.width||256,tex.image?.height||256];
    if(dirtMaterial){dirtMaterial.map=tex;dirtMaterial.needsUpdate=true}
  });

  const make=({side=false,bevel=false}={})=>{
    const source=side?sets.side:sets.top;
    const uniforms={
      uPaperPrint:{value:Number(settings.printNoiseStrength)||0},
      uPaperSide:{value:side?1:0},uPaperBevel:{value:bevel?1:0},
      uPaperBandHeight:{value:Math.max(.08,Number(settings.paperThickness)||.30)}
    };
    const mat=new THREE.MeshPhysicalMaterial({
      vertexColors:true,map:source.albedo,normalMap:source.normal,roughnessMap:source.roughness,
      normalScale:new THREE.Vector2(side?.24:.30,side?.24:.30),
      roughness:.98,metalness:0,side:THREE.DoubleSide,flatShading:!!side,
      emissive:new THREE.Color(side?0x7b472b:0x9b754d),emissiveIntensity:side?.25:.14,
      specularIntensity:side?.08:.11,ior:1.34,
      sheen:side?.035:.085,sheenRoughness:.96,
      sheenColor:new THREE.Color(side?0xc9a980:0xfff0cf)
    });
    mat.userData.paperRole=side?'side':bevel?'bevel':'top';
    mat.userData.paperUniforms=uniforms;
    mat.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nvarying vec3 vPaperWorldPos;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvPaperWorldPos=(modelMatrix*vec4(position,1.0)).xyz;');
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>',`#include <common>
          varying vec3 vPaperWorldPos;
          uniform float uPaperPrint;
          uniform float uPaperSide;
          uniform float uPaperBevel;
          uniform float uPaperBandHeight;
          float paperHash(vec2 p){
            p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);
          }
          float paperValueNoise(vec2 p){
            vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
            float a=paperHash(i),b=paperHash(i+vec2(1.0,0.0));
            float c=paperHash(i+vec2(0.0,1.0)),d=paperHash(i+vec2(1.0,1.0));
            return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
          }`)
        .replace('#include <color_fragment>',`#include <color_fragment>
          // Broad, cloud-like pulp variation breaks repetition without drawing
          // obvious noise. This is the dominant reference trait.
          float cloud=paperValueNoise(vPaperWorldPos.xz*.16+vPaperWorldPos.xy*.035+13.0)-.5;
          float mid=paperValueNoise(vPaperWorldPos.xz*.62+vPaperWorldPos.xy*.09+37.0)-.5;
          diffuseColor.rgb*=1.0+cloud*uPaperPrint*.44+mid*uPaperPrint*.16;
          if(uPaperSide>.5){
            // Very weak sheet seam only. The fibre map, not a dark stripe,
            // must define the cardboard core.
            float phase=fract((vPaperWorldPos.y+1000.0)/max(.04,uPaperBandHeight));
            float edge=min(phase,1.0-phase);
            float seam=1.0-smoothstep(.006,.034,edge);
            diffuseColor.rgb*=1.008-seam*.018;
            diffuseColor.rgb*=mix(.965,1.018,smoothstep(0.0,1.0,phase));
          }
          if(uPaperBevel>.5){
            float cut=paperValueNoise(vPaperWorldPos.xz*12.0+vPaperWorldPos.xy*8.0+71.0)-.5;
            diffuseColor.rgb*=1.035+cut*.035;
          }`);
    };
    mat.customProgramCacheKey=()=>`paper-stock-v3-reference-${side?1:0}-${bevel?1:0}`;
    return mat;
  };

  const materials=[make(),make({side:true}),make({bevel:true})];
  grassMaterial=new THREE.MeshPhysicalMaterial({
    color:0xffffff,map:grassReference,vertexColors:false,
    normalMap:sets.top.normal,roughnessMap:sets.top.roughness,
    normalScale:new THREE.Vector2(.20,.20),roughness:.99,metalness:0,side:THREE.DoubleSide,
    specularIntensity:.05,ior:1.33,sheen:.04,sheenRoughness:.99,
    sheenColor:new THREE.Color(0xf4f0cf)
  });
  grassMaterial.name='user-grass-native-resolution';grassMaterial.userData.paperRole='grass-top';
  dirtMaterial=new THREE.MeshPhysicalMaterial({
    color:0xffffff,map:dirtReference,vertexColors:false,
    normalMap:sets.top.normal,roughnessMap:sets.top.roughness,
    emissive:new THREE.Color(0x6c412b),emissiveMap:dirtReference,emissiveIntensity:.28,
    normalScale:new THREE.Vector2(.18,.18),roughness:.992,metalness:0,side:THREE.DoubleSide,
    specularIntensity:.045,ior:1.33,sheen:.035,sheenRoughness:.99,
    sheenColor:new THREE.Color(0xe0b38a)
  });
  dirtMaterial.name='user-dirt-native-resolution';dirtMaterial.userData.paperRole='dirt';
  materials.push(grassMaterial,dirtMaterial);
  const sync=next=>{
    const micro=clamp(Number(next.microNormalStrength)||.34,.08,.85);
    const rough=clamp(Number(next.roughnessVariation)||.035,0,.10);
    for(const mat of materials){
      const u=mat.userData.paperUniforms;if(!u)continue;
      u.uPaperPrint.value=Number(next.printNoiseStrength)||0;
      u.uPaperBandHeight.value=Math.max(.08,Number(next.paperThickness)||.30);
      const sideRole=mat.userData.paperRole==='side';
      mat.normalScale.setScalar(micro*(sideRole?.72:1));
      mat.roughness=clamp(.985-rough*(sideRole?.10:.18),.95,.995);
      mat.sheen=sideRole?.035:.085;
      mat.sheenRoughness=.96;
      mat.specularIntensity=sideRole?.08:.11;
    }
    grassMaterial.normalScale.setScalar(micro*.58);
    grassMaterial.roughness=clamp(.994-rough*.06,.978,.996);
    dirtMaterial.normalScale.setScalar(micro*.52);
    dirtMaterial.roughness=clamp(.995-rough*.05,.982,.997);
    dirtMaterial.emissiveIntensity=.28;
  };
  sync(settings);

  const stats=()=>({
    mode:'procedural-paper-pbr-v3-reference',
    generatedOnceOnCPU:true,textureResolution:resolution,
    maps:['albedo','normal','roughness'],
    visualPriority:['pulp-albedo','contact-shadow','cut-edge-fibre','micro-normal'],
    diffusePulpDominant:true,weakMicroNormal:true,denseCardboardPulp:true,
    physicalFibreSheen:true,lowSpecular:true,correlatedNormalRoughness:true,
    userGrassReference:true,grassReferenceAsset:'assets/materials/grass-reference.webp',
    grassReferenceLoaded:grassLoaded,grassReferenceSize,grassMaterialGroup:true,
    grassColorSource:'user-texture-only',grassTextureTransform:'native-world-uv-repeat-1x',
    userDirtReference:true,dirtReferenceAsset:'assets/materials/dirt-reference.webp',
    dirtReferenceLoaded:dirtLoaded,dirtReferenceSize,dirtMaterialGroup:true,
    dirtColorSource:'user-texture-only',dirtTextureTransform:'native-world-uv-repeat-1x',
    liftedCardboardShadow:true,sideShadowLift:.25,dirtShadowLift:.28,
    seamlessPeriodicField:true,worldSpaceMacroVariation:true,perFrameHeavyNoise:false
  });
  const dispose=()=>{
    for(const m of materials)m.dispose();
    if(grassReference!==grassFallback)grassReference.dispose();
    if(dirtReference!==dirtFallback)dirtReference.dispose();
    grassFallback.dispose();dirtFallback.dispose();
    for(const set of Object.values(sets)){set.albedo.dispose();set.normal.dispose();set.roughness.dispose()}
  };
  return {sets,materials,sync,stats,dispose};
}
