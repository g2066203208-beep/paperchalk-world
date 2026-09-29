/* PaperMaterial v2
 * Deterministic procedural paper stock generated once on CPU:
 * pulp/albedo variation + directional cellulose height field -> micro normal
 * + correlated roughness. Terrain keeps its vertex color; these maps provide
 * physical paper response without exposing the gameplay tile grid.
 */
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function smooth(t){return t*t*(3-2*t)}
function mix(a,b,t){return a+(b-a)*t}

function makeRng(seed){
  let s=seed>>>0;
  return ()=>{
    s=(Math.imul(s,1664525)+1013904223)>>>0;
    return s/4294967296;
  };
}
function hash2(ix,iy,seed){
  let h=(Math.imul((ix|0)^seed,0x45d9f3b)+Math.imul((iy|0)^0x9e3779b9,0x27d4eb2d))|0;
  h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;
  return (h>>>0)/4294967295;
}
function periodicNoise01(x,y,period,seed){
  const px=x*period,py=y*period,x0=Math.floor(px),y0=Math.floor(py);
  const fx=smooth(px-x0),fy=smooth(py-y0);
  const mod=v=>((v%period)+period)%period;
  const a=hash2(mod(x0),mod(y0),seed),b=hash2(mod(x0+1),mod(y0),seed);
  const c=hash2(mod(x0),mod(y0+1),seed),d=hash2(mod(x0+1),mod(y0+1),seed);
  return mix(mix(a,b,fx),mix(c,d,fx),fy);
}
function fbm01(x,y,seed){
  return periodicNoise01(x,y,2,seed)*.42+
    periodicNoise01(x,y,4,seed+17)*.27+
    periodicNoise01(x,y,8,seed+37)*.19+
    periodicNoise01(x,y,16,seed+71)*.12;
}
function deposit(field,size,x,y,radius,amount){
  const minX=Math.floor(x-radius),maxX=Math.ceil(x+radius);
  const minY=Math.floor(y-radius),maxY=Math.ceil(y+radius),rr=radius*radius;
  for(let yy=minY;yy<=maxY;yy++)for(let xx=minX;xx<=maxX;xx++){
    const dx=xx+.5-x,dy=yy+.5-y,d2=dx*dx+dy*dy;if(d2>rr)continue;
    const wx=((xx%size)+size)%size,wy=((yy%size)+size)%size;
    const fall=1-d2/rr;
    field[wy*size+wx]+=amount*fall*fall;
  }
}
function addFibres(field,size,rng,{count,angle,jitter,minLength,maxLength,minRadius,maxRadius,strength}){
  for(let i=0;i<count;i++){
    const x=rng()*size,y=rng()*size;
    const a=angle+(rng()+rng()+rng()-1.5)*jitter;
    const len=minLength+rng()*(maxLength-minLength),radius=minRadius+rng()*(maxRadius-minRadius);
    const steps=Math.max(2,Math.ceil(len*1.2)),weight=strength*(.55+rng()*.9);
    for(let j=0;j<=steps;j++){
      const t=j/steps-.5;
      const wobble=(rng()-.5)*radius*.28;
      const px=x+Math.cos(a)*len*t-Math.sin(a)*wobble;
      const py=y+Math.sin(a)*len*t+Math.cos(a)*wobble;
      deposit(field,size,px,py,radius,weight);
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
function buildPaperField(size,{seed=1,side=false}={}){
  const rng=makeRng(seed),height=new Float32Array(size*size),macro=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size,m=fbm01(u,v,seed+101);
    macro[y*size+x]=m;
    height[y*size+x]=m*.32+
      periodicNoise01(u,v,32,seed+211)*.07+
      periodicNoise01(u,v,64,seed+307)*.035;
  }

  if(side){
    // Exposed cardboard core: many short compressed fibres, mostly along the
    // sheet direction. Avoid long ridges that read as wood grain/bark.
    addFibres(height,size,rng,{count:1450,angle:0,jitter:.42,minLength:2,maxLength:12,minRadius:.20,maxRadius:.52,strength:.072});
    addFibres(height,size,rng,{count:330,angle:Math.PI*.5,jitter:.95,minLength:1.2,maxLength:5.5,minRadius:.18,maxRadius:.42,strength:.032});
  }else{
    // Face stock: finer, denser cellulose with broader orientation spread.
    addFibres(height,size,rng,{count:1120,angle:.10,jitter:.82,minLength:1.5,maxLength:10,minRadius:.18,maxRadius:.50,strength:.078});
    addFibres(height,size,rng,{count:310,angle:Math.PI*.53,jitter:1.05,minLength:1,maxLength:5,minRadius:.16,maxRadius:.38,strength:.034});
  }

  // Pulp specks / compressed fibres: tiny local height changes.
  for(let i=0;i<(side?1100:760);i++){
    const x=rng()*size,y=rng()*size;
    deposit(height,size,x,y,.35+rng()*.7,(rng()-.35)*(side?.055:.038));
  }
  normalizeField(height);
  return {height,macro};
}

function createDataTexture(THREE,data,size,{srgb=false,name='paper-map'}={}){
  const tex=new THREE.DataTexture(data,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
  tex.name=name;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
  tex.generateMipmaps=true;
  if(srgb)tex.colorSpace=THREE.SRGBColorSpace;
  tex.needsUpdate=true;
  return tex;
}

function deriveTextureSet(THREE,{size=256,seed=1,side=false}={}){
  const {height,macro}=buildPaperField(size,{seed,side});
  const albedo=new Uint8Array(size*size*4);
  const normal=new Uint8Array(size*size*4);
  const roughness=new Uint8Array(size*size*4);
  const at=(x,y)=>height[(((y%size)+size)%size)*size+(((x%size)+size)%size)];

  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,o=i*4,h=height[i],m=macro[i];
    const dx=(at(x+1,y)-at(x-1,y))*.5,dy=(at(x,y+1)-at(x,y-1))*.5;
    const micro=side?2.85:2.65;
    let nx=-dx*micro,ny=-dy*micro,nz=1;
    const inv=1/Math.max(1e-6,Math.hypot(nx,ny,nz));nx*=inv;ny*=inv;nz*=inv;
    normal[o]=Math.round((nx*.5+.5)*255);normal[o+1]=Math.round((ny*.5+.5)*255);normal[o+2]=Math.round((nz*.5+.5)*255);normal[o+3]=255;

    // Near-white albedo variation multiplies terrain vertex colour rather than replacing it.
    const pulp=(m-.5)*(side?.075:.045),fiber=(h-.5)*(side?.055:.032);
    const warm=side?.035:.008;
    const base=clamp(.975+pulp+fiber,.84,1);
    albedo[o]=Math.round(clamp(base,0,1)*255);
    albedo[o+1]=Math.round(clamp(base-warm*.35,0,1)*255);
    albedo[o+2]=Math.round(clamp(base-warm,0,1)*255);albedo[o+3]=255;

    // Roughness is correlated with fibre height/gradient: raised, fuzzy fibres scatter more.
    const slope=clamp(Math.hypot(dx,dy)*4.5,0,1);
    const r=clamp((side?.955:.905)+(h-.5)*(side?.060:.045)+slope*(side?.030:.045)+(m-.5)*.025,.80,.995);
    const rv=Math.round(r*255);
    roughness[o]=rv;roughness[o+1]=rv;roughness[o+2]=rv;roughness[o+3]=255;
  }

  return {
    albedo:createDataTexture(THREE,albedo,size,{srgb:true,name:side?'paper-core-albedo-v2':'paper-face-albedo-v2'}),
    normal:createDataTexture(THREE,normal,size,{name:side?'paper-core-normal-v2':'paper-face-normal-v2'}),
    roughness:createDataTexture(THREE,roughness,size,{name:side?'paper-core-roughness-v2':'paper-face-roughness-v2'}),
    size,seed,side
  };
}

export function createPaperMaterialSet(THREE,settings){
  const resolution=256;
  const sets={
    top:deriveTextureSet(THREE,{size:resolution,seed:0x31f2a7,side:false}),
    side:deriveTextureSet(THREE,{size:resolution,seed:0xa9417d,side:true})
  };

  const make=({side=false,bevel=false}={})=>{
    const source=side?sets.side:sets.top;
    const uniforms={
      uPaperFiber:{value:Number(settings.fiberStrength)||0},
      uPaperPrint:{value:Number(settings.printNoiseStrength)||0},
      uPaperSide:{value:side?1:0},
      uPaperBevel:{value:bevel?1:0},
      uPaperBandHeight:{value:Math.max(.08,Number(settings.paperThickness)||.30)}
    };
    const mat=new THREE.MeshStandardMaterial({
      vertexColors:true,
      map:source.albedo,
      normalMap:source.normal,
      roughnessMap:source.roughness,
      normalScale:new THREE.Vector2(side?.56:.58,side?.56:.58),
      roughness:1,
      metalness:0,
      side:THREE.DoubleSide,
      flatShading:!!side,
      emissive:side?0x160d08:0x000000,
      emissiveIntensity:side?.08:0
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
          uniform float uPaperFiber;
          uniform float uPaperPrint;
          uniform float uPaperSide;
          uniform float uPaperBevel;
          uniform float uPaperBandHeight;
          float paperHash(vec2 p){
            p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);
            return fract(p.x*p.y);
          }
          float paperValueNoise(vec2 p){
            vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
            float a=paperHash(i),b=paperHash(i+vec2(1.0,0.0));
            float c=paperHash(i+vec2(0.0,1.0)),d=paperHash(i+vec2(1.0,1.0));
            return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
          }`)
        .replace('#include <color_fragment>',`#include <color_fragment>
          // Large-scale pulp/printing variation is world-space so the 256px
          // physical maps can repeat without producing an obvious tiled stamp.
          float pulp=paperValueNoise(vPaperWorldPos.xz*.55+vPaperWorldPos.xy*.11)-.5;
          float cloud=paperValueNoise(vPaperWorldPos.xz*.13+17.0)-.5;
          float paperVar=1.0+pulp*uPaperPrint*.34+cloud*uPaperPrint*.55;
          diffuseColor.rgb*=paperVar;
          if(uPaperSide>.5){
            float bandPhase=fract((vPaperWorldPos.y+1000.0)/max(.04,uPaperBandHeight));
            float bandEdge=min(bandPhase,1.0-bandPhase);
            float layerSeam=1.0-smoothstep(.012,.085,bandEdge);
            diffuseColor.rgb*=1.015-layerSeam*.075;
          }
          if(uPaperBevel>.5)diffuseColor.rgb*=1.045;`)
        .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          float macroRough=paperValueNoise(vPaperWorldPos.xz*.31+vPaperWorldPos.xy*.07+43.0)-.5;
          roughnessFactor=clamp(roughnessFactor+macroRough*uPaperFiber*.18,.78,1.0);`);
    };
    mat.customProgramCacheKey=()=>`paper-stock-v2-${side?1:0}-${bevel?1:0}`;
    return mat;
  };

  const materials=[make(),make({side:true}),make({bevel:true})];

  const sync=next=>{
    const fiber=clamp(Number(next.fiberStrength)||0,0,.14);
    const micro=clamp(Number(next.microNormalStrength)||
      (fiber>0?(.42+fiber*4.2):.58),.18,1.25);
    const rough=clamp(Number(next.roughnessVariation)||.055,0,.16);
    for(const mat of materials){
      const u=mat.userData.paperUniforms;if(!u)continue;
      u.uPaperFiber.value=fiber;
      u.uPaperPrint.value=Number(next.printNoiseStrength)||0;
      u.uPaperBandHeight.value=Math.max(.08,Number(next.paperThickness)||.30);
      const sideRole=mat.userData.paperRole==='side';
      mat.normalScale.setScalar(micro*(sideRole?.84:1));
      mat.roughness=clamp(1-rough*(sideRole?.22:.45),.92,1);
    }
  };
  sync(settings);

  const stats=()=>({
    mode:'procedural-paper-pbr-v2',
    generatedOnceOnCPU:true,
    textureResolution:resolution,
    maps:['albedo','normal','roughness'],
    topSeed:sets.top.seed,sideSeed:sets.side.seed,
    directionalCelluloseFibres:true,
    correlatedNormalRoughness:true,
    seamlessPeriodicField:true,
    worldSpaceMacroVariation:true,
    perFrameHeavyNoise:false
  });
  const dispose=()=>{
    for(const m of materials)m.dispose();
    for(const set of Object.values(sets)){
      set.albedo.dispose();set.normal.dispose();set.roughness.dispose();
    }
  };
  return {sets,materials,sync,stats,dispose};
}
