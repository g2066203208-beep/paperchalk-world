/* Paperchalk Biome / Landform Generator v1.
 * Deterministic multi-noise climate + continentalness + erosion + ridge + river fields.
 * Uses vendored FastNoiseLite when available and a deterministic trigonometric fallback.
 */
(function(global){
'use strict';

const BIOME=Object.freeze({
  MEADOW:'meadow',
  FOREST:'forest',
  PINE:'pine-forest',
  DESERT:'dry-steppe',
  MARSH:'marsh',
  ALPINE:'alpine',
  CLAYLANDS:'claylands'
});
const LANDFORM=Object.freeze({
  PLAIN:'plain',
  ROLLING_HILLS:'rolling-hills',
  HIGHLAND:'highland',
  MOUNTAIN:'mountain',
  VALLEY:'river-valley',
  BASIN:'basin'
});

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function smoothstep(a,b,x){
  if(a===b)return x<a?0:1;
  const t=clamp((x-a)/(b-a),0,1);
  return t*t*(3-2*t);
}
function remap01(n){return clamp(n*.5+.5,0,1)}

class BiomeLandformGenerator{
  constructor({seed=24681357,spawnX=0,spawnZ=0,spawnSafeRadius=22}={}){
    this.seed=seed|0;
    this.spawnX=Number(spawnX)||0;
    this.spawnZ=Number(spawnZ)||0;
    this.spawnSafeRadius=Math.max(8,Number(spawnSafeRadius)||22);
    this.backend='deterministic-fallback';
    this.cache=new Map();
    this.cacheLimit=32768;
    this._initNoise();
  }
  _makeNoise(offset,frequency,octaves=3){
    const F=global.FastNoiseLite;if(!F)return null;
    const Noise=global.FastNoiseLiteNoiseType||{},Fractal=global.FastNoiseLiteFractalType||{};
    const n=new F(this.seed+offset);
    n.SetNoiseType(Noise.OpenSimplex2S||2);
    n.SetFrequency(frequency);
    if(octaves>1){
      n.SetFractalType(Fractal.FBm||1);
      n.SetFractalOctaves(octaves);
      if(n.SetFractalGain)n.SetFractalGain(.5);
      if(n.SetFractalLacunarity)n.SetFractalLacunarity(2.0);
    }
    return n;
  }
  _initNoise(){
    this.continental=this._makeNoise(1001,.0028,4);
    this.erosion=this._makeNoise(2003,.0055,3);
    this.ridge=this._makeNoise(3001,.0085,4);
    this.detail=this._makeNoise(4001,.035,2);
    this.river=this._makeNoise(5003,.0042,3);
    this.temperature=this._makeNoise(6007,.0018,3);
    this.moisture=this._makeNoise(7001,.0022,3);
    this.warpX=this._makeNoise(8009,.0065,2);
    this.warpZ=this._makeNoise(9001,.0065,2);
    if(this.continental)this.backend='FastNoiseLite-multi-noise-v1';
  }
  _hash(x,z,salt=0){
    let h=(Math.imul((x|0)^(this.seed+salt),0x45d9f3b)+Math.imul((z|0)^0x9e3779b9,0x27d4eb2d))|0;
    h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;
    return (h>>>0)/4294967295;
  }
  _fallback(x,z,frequency,salt=0){
    const sx=(x+(this.seed+salt)*.001)*frequency;
    const sz=(z-(this.seed-salt)*.001)*frequency;
    return clamp(
      Math.sin(sx*6.2831)*.42+
      Math.cos(sz*5.731)*.34+
      Math.sin((sx+sz)*3.117)*.18+
      (this._hash(Math.floor(x*.25),Math.floor(z*.25),salt)-.5)*.12,
      -1,1
    );
  }
  _noise(source,x,z,frequency,salt){
    return source?source.GetNoise(x,z):this._fallback(x,z,frequency,salt);
  }
  _rawFields(gx,gz){
    const wx=this._noise(this.warpX,gx,gz,.0065,81)*18;
    const wz=this._noise(this.warpZ,gx+91,gz-47,.0065,93)*18;
    const x=gx+wx,z=gz+wz;
    return {
      continental:this._noise(this.continental,x,z,.0028,11),
      erosion:this._noise(this.erosion,x-131,z+73,.0055,23),
      ridge:this._noise(this.ridge,x+37,z-149,.0085,31),
      detail:this._noise(this.detail,x,z,.035,43),
      river:this._noise(this.river,x-83,z+211,.0042,53),
      temperature:this._noise(this.temperature,gx+401,gz-607,.0018,61),
      moisture:this._noise(this.moisture,gx-509,gz+307,.0022,71)
    };
  }
  _selectLandform({continental,erosion,ridge,riverMask,mountainMask,height}){
    if(riverMask>.68)return LANDFORM.VALLEY;
    if(continental<-.52)return LANDFORM.BASIN;
    if(mountainMask>.62||height>19)return LANDFORM.MOUNTAIN;
    if(mountainMask>.30||continental>.35)return LANDFORM.HIGHLAND;
    if(Math.abs(ridge)>.34||erosion<-.18)return LANDFORM.ROLLING_HILLS;
    return LANDFORM.PLAIN;
  }
  _selectBiome({temperature,moisture,riverMask,height,landform,continental}){
    const t=remap01(temperature),m=remap01(moisture);
    if(height>=18||landform===LANDFORM.MOUNTAIN&&t<.48)return BIOME.ALPINE;
    if(riverMask>.58&&m>.38)return BIOME.MARSH;
    if(t>.63&&m<.35)return BIOME.DESERT;
    if(m<.29&&continental>.05)return BIOME.CLAYLANDS;
    if(t<.34&&m>.44)return BIOME.PINE;
    if(m>.60)return BIOME.FOREST;
    return BIOME.MEADOW;
  }
  sample(gx,gz=0){
    gx=Math.floor(Number(gx)||0);gz=Math.floor(Number(gz)||0);
    const key=gx+','+gz;
    const cached=this.cache.get(key);if(cached)return cached;

    const f=this._rawFields(gx,gz);
    const continent01=remap01(f.continental);
    const erosion01=remap01(f.erosion);
    const ridgeAbs=Math.abs(f.ridge);

    const ridgeShape=Math.pow(clamp(1-Math.abs(ridgeAbs-.52)/.52,0,1),1.35);
    const mountainMask=
      smoothstep(.36,.82,ridgeAbs)*
      smoothstep(.34,.78,continent01)*
      (1-smoothstep(.58,.92,erosion01));

    const hills=(f.ridge*.5+f.detail*.5)*4.2;
    const continentalLift=f.continental*7.0;
    const mountainLift=Math.pow(mountainMask,1.5)*20;
    const highlandLift=smoothstep(.58,.82,continent01)*5.5;
    const basinDrop=smoothstep(.58,.88,-f.continental)*4.5;

    const riverDistance=Math.abs(f.river);
    const riverMask=1-smoothstep(.025,.105,riverDistance);
    const riverCarve=riverMask*(3.0+smoothstep(.1,.7,continent01)*3.5)*(1-mountainMask*.72);

    let height=3+continentalLift+hills+mountainLift+highlandLift-basinDrop-riverCarve;

    // Target-ground staging around spawn: broad handcrafted terraces instead
    // of cell-to-cell noise. Low-frequency fields define large shelves while
    // the rest of the infinite world still uses the full landform generator.
    const spawnDistance=Math.hypot(gx-this.spawnX,gz-this.spawnZ);
    const safeBlend=1-smoothstep(this.spawnSafeRadius*.55,this.spawnSafeRadius*1.22,spawnDistance);
    const terraceField=f.continental*.58+f.ridge*.28-f.erosion*.14;
    const terraceStep=Math.round(terraceField*2.15);
    const shelfWave=Math.round((Math.sin((gx-this.spawnX)*.115)+Math.cos((gz-this.spawnZ)*.102))*.34);
    const spawnTarget=3+terraceStep+shelfWave;
    height=height*(1-safeBlend)+spawnTarget*safeBlend;

    height=Math.max(-18,Math.min(34,height));
    let landform=this._selectLandform({...f,riverMask,mountainMask,height});
    let biome=this._selectBiome({...f,riverMask,height,landform});

    // Recreate the target composition: grassy paper shelves enter from the
    // left/front while a warm kraft-paper dryland dominates center/right.
    // The wavy transition avoids a perfectly straight biome cut.
    const transition=(gx-this.spawnX)+7.5+Math.sin((gz-this.spawnZ)*.20)*2.35+f.ridge*.85;
    const stagedGround=safeBlend>.16;
    const stagedDry=stagedGround&&transition>0;
    if(safeBlend>.30){
      biome=stagedDry?BIOME.DESERT:BIOME.MEADOW;
      landform=Math.abs(terraceStep)>=2?LANDFORM.ROLLING_HILLS:LANDFORM.PLAIN;
    }

    const surfaceKind=stagedGround
      ?(stagedDry?'sand':'grass')
      :biome===BIOME.DESERT?'sand':
       biome===BIOME.ALPINE?'stone':
       biome===BIOME.CLAYLANDS?'clay':
       biome===BIOME.MARSH&&riverMask>.72?'clay':'grass';
    const subsurfaceKind=stagedGround
      ?'dirt'
      :biome===BIOME.DESERT?'sand':
       biome===BIOME.CLAYLANDS?'clay':
       biome===BIOME.ALPINE?'stone':'dirt';

    const result=Object.freeze({
      gx,gz,height:Math.floor(height),heightFloat:height,
      biome,landform,surfaceKind,subsurfaceKind,
      continental:f.continental,erosion:f.erosion,ridge:f.ridge,
      temperature:f.temperature,moisture:f.moisture,
      riverMask,mountainMask,safeBlend,
      targetGroundStage:stagedGround,targetGroundDry:stagedDry,terraceStep
    });
    if(this.cache.size>=this.cacheLimit)this.cache.clear();
    this.cache.set(key,result);
    return result;
  }
  heightAt(gx,gz=0){return this.sample(gx,gz).height}
  biomeAt(gx,gz=0){return this.sample(gx,gz).biome}
  landformAt(gx,gz=0){return this.sample(gx,gz).landform}
  stats(){
    return {
      version:1,backend:this.backend,cacheEntries:this.cache.size,cacheLimit:this.cacheLimit,
      biomes:Object.values(BIOME),landforms:Object.values(LANDFORM),
      fields:['continentalness','erosion','ridge','temperature','moisture','river','detail'],
      spawnSafeRadius:this.spawnSafeRadius,targetGroundStyle:'broad-paper-terraces-r1',spawnSurfaceTransition:true
    };
  }
}

global.PaperchalkBiomeRuntime=Object.freeze({BIOME,LANDFORM,BiomeLandformGenerator});
})(window);
