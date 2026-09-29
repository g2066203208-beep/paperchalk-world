/* Paperchalk Biome / Landform Generator v2.
 * Deterministic multi-noise macro terrain: continents, shelves, coasts, cliffs,
 * river valleys, ridged mountains and altitude-aware climate biomes.
 */
(function(global){
'use strict';

const BIOME=Object.freeze({
  OCEAN:'ocean', BEACH:'beach', MEADOW:'meadow', FOREST:'forest',
  PINE:'pine-forest', DESERT:'dry-steppe', MARSH:'marsh',
  ALPINE:'alpine', SNOWFIELD:'snowfield', CLAYLANDS:'claylands'
});
const LANDFORM=Object.freeze({
  DEEP_OCEAN:'deep-ocean', SHALLOW_SEA:'shallow-sea', BEACH:'beach',
  COAST:'coast', CLIFF:'cliff', PLAIN:'plain', ROLLING_HILLS:'rolling-hills',
  HIGHLAND:'highland', PLATEAU:'plateau', MOUNTAIN:'mountain',
  VALLEY:'river-valley', BASIN:'basin'
});

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function smoothstep(a,b,x){
  if(a===b)return x<a?0:1;
  const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);
}
function remap01(n){return clamp(n*.5+.5,0,1)}

class BiomeLandformGenerator{
  constructor({seed=24681357,spawnX=0,spawnZ=0,spawnSafeRadius=22,seaLevel=0}={}){
    this.seed=seed|0;this.spawnX=Number(spawnX)||0;this.spawnZ=Number(spawnZ)||0;
    this.spawnSafeRadius=Math.max(8,Number(spawnSafeRadius)||22);
    this.seaLevel=Number.isFinite(Number(seaLevel))?Number(seaLevel):0;
    this.backend='deterministic-fallback';this.cache=new Map();this.cacheLimit=32768;this._initNoise();
  }
  _makeNoise(offset,frequency,octaves=3){
    const F=global.FastNoiseLite;if(!F)return null;
    const Noise=global.FastNoiseLiteNoiseType||{},Fractal=global.FastNoiseLiteFractalType||{};
    const n=new F(this.seed+offset);n.SetNoiseType(Noise.OpenSimplex2S||2);n.SetFrequency(frequency);
    if(octaves>1){
      n.SetFractalType(Fractal.FBm||1);n.SetFractalOctaves(octaves);
      n.SetFractalGain?.(.5);n.SetFractalLacunarity?.(2.0);
    }
    return n;
  }
  _initNoise(){
    this.continental=this._makeNoise(1001,.00155,5);
    this.erosion=this._makeNoise(2003,.0042,4);
    this.ridge=this._makeNoise(3001,.0062,5);
    this.detail=this._makeNoise(4001,.028,3);
    this.river=this._makeNoise(5003,.0034,4);
    this.temperature=this._makeNoise(6007,.00135,3);
    this.moisture=this._makeNoise(7001,.0017,4);
    this.warpX=this._makeNoise(8009,.0045,3);this.warpZ=this._makeNoise(9001,.0045,3);
    this.plateau=this._makeNoise(10009,.0027,3);
    if(this.continental)this.backend='FastNoiseLite-macro-v2';
  }
  _hash(x,z,salt=0){
    let h=(Math.imul((x|0)^(this.seed+salt),0x45d9f3b)+Math.imul((z|0)^0x9e3779b9,0x27d4eb2d))|0;
    h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;return (h>>>0)/4294967295;
  }
  _fallback(x,z,frequency,salt=0){
    const sx=(x+(this.seed+salt)*.001)*frequency,sz=(z-(this.seed-salt)*.001)*frequency;
    return clamp(Math.sin(sx*6.2831)*.42+Math.cos(sz*5.731)*.34+Math.sin((sx+sz)*3.117)*.18+
      (this._hash(Math.floor(x*.25),Math.floor(z*.25),salt)-.5)*.12,-1,1);
  }
  _noise(source,x,z,frequency,salt){return source?source.GetNoise(x,z):this._fallback(x,z,frequency,salt)}
  _rawFields(gx,gz){
    const wx=this._noise(this.warpX,gx,gz,.0045,81)*34,wz=this._noise(this.warpZ,gx+91,gz-47,.0045,93)*34;
    const x=gx+wx,z=gz+wz;
    return {
      continental:this._noise(this.continental,x,z,.00155,11),
      erosion:this._noise(this.erosion,x-131,z+73,.0042,23),
      ridge:this._noise(this.ridge,x+37,z-149,.0062,31),
      detail:this._noise(this.detail,x,z,.028,43),
      river:this._noise(this.river,x-83,z+211,.0034,53),
      temperature:this._noise(this.temperature,gx+401,gz-607,.00135,61),
      moisture:this._noise(this.moisture,gx-509,gz+307,.0017,71),
      plateau:this._noise(this.plateau,gx+227,gz-193,.0027,101)
    };
  }
  _selectLandform(v){
    const {height,riverMask,mountainMask,coastMask,cliffMask,plateauMask}=v;
    if(height<=this.seaLevel-9)return LANDFORM.DEEP_OCEAN;
    if(height<this.seaLevel-1)return LANDFORM.SHALLOW_SEA;
    if(height<=this.seaLevel+1&&cliffMask<.42)return LANDFORM.BEACH;
    if(coastMask>.52&&cliffMask>.58)return LANDFORM.CLIFF;
    if(coastMask>.48)return LANDFORM.COAST;
    if(riverMask>.70)return LANDFORM.VALLEY;
    if(mountainMask>.58||height>26)return LANDFORM.MOUNTAIN;
    if(plateauMask>.62&&height>10)return LANDFORM.PLATEAU;
    if(mountainMask>.28||height>14)return LANDFORM.HIGHLAND;
    if(cliffMask>.64)return LANDFORM.CLIFF;
    if(Math.abs(v.ridge)>.31||v.erosion<-.15)return LANDFORM.ROLLING_HILLS;
    if(v.continental<-.34)return LANDFORM.BASIN;
    return LANDFORM.PLAIN;
  }
  _selectBiome(v){
    const t=remap01(v.temperatureAdjusted),m=remap01(v.moisture),h=v.height;
    if(h<this.seaLevel-1)return BIOME.OCEAN;
    if(h<=this.seaLevel+1&&v.coastMask>.25)return BIOME.BEACH;
    if(h>=34||(h>=27&&t<.43))return BIOME.SNOWFIELD;
    if(h>=22||v.landform===LANDFORM.MOUNTAIN&&t<.50)return BIOME.ALPINE;
    if(v.riverMask>.60&&m>.38&&h<this.seaLevel+7)return BIOME.MARSH;
    if(t>.66&&m<.34)return BIOME.DESERT;
    if(m<.28&&v.continental>.02)return BIOME.CLAYLANDS;
    if(t<.37&&m>.40)return BIOME.PINE;
    if(m>.59)return BIOME.FOREST;
    return BIOME.MEADOW;
  }
  sample(gx,gz=0){
    gx=Math.floor(Number(gx)||0);gz=Math.floor(Number(gz)||0);
    const key=gx+','+gz,cached=this.cache.get(key);if(cached)return cached;
    const f=this._rawFields(gx,gz),continent01=remap01(f.continental),erosion01=remap01(f.erosion);
    const ridgeAbs=Math.abs(f.ridge);
    const mountainMask=smoothstep(.34,.82,ridgeAbs)*smoothstep(.43,.76,continent01)*(1-smoothstep(.60,.94,erosion01));
    const plateauMask=smoothstep(.42,.78,f.plateau)*smoothstep(.48,.78,continent01);
    const coastMask=(1-smoothstep(.05,.30,Math.abs(f.continental+.08)))*smoothstep(.24,.78,continent01+.25);
    const cliffMask=clamp(smoothstep(.46,.78,ridgeAbs)*.72+coastMask*smoothstep(.32,.70,ridgeAbs)*.65,0,1);
    const riverMask=1-smoothstep(.022,.095,Math.abs(f.river));

    const continentBase=-8+continent01*24;
    const rolling=(f.ridge*.58+f.detail*.42)*5.2;
    const mountainLift=Math.pow(mountainMask,1.42)*39;
    const plateauLift=plateauMask*7.5;
    const coastLift=coastMask*cliffMask*8.5;
    const shelfDrop=(1-smoothstep(.22,.46,continent01))*7.0;
    const riverCarve=riverMask*(2.8+smoothstep(.18,.72,continent01)*5.2)*(1-mountainMask*.72);
    let height=continentBase+rolling+mountainLift+plateauLift+coastLift-shelfDrop-riverCarve;

    const spawnDistance=Math.hypot(gx-this.spawnX,gz-this.spawnZ);
    const safeBlend=1-smoothstep(this.spawnSafeRadius*.45,this.spawnSafeRadius,spawnDistance);
    const spawnTarget=3+f.detail*1.15;
    height=height*(1-safeBlend)+spawnTarget*safeBlend;
    height=clamp(height,-24,56);

    const temperatureAdjusted=f.temperature-clamp((height-8)/52,0,.55);
    let landform=this._selectLandform({...f,height,riverMask,mountainMask,coastMask,cliffMask,plateauMask});
    let biome=this._selectBiome({...f,height,riverMask,mountainMask,coastMask,cliffMask,plateauMask,temperatureAdjusted,landform});
    if(safeBlend>.62){biome=BIOME.MEADOW;landform=LANDFORM.PLAIN}

    const surfaceKind=
      biome===BIOME.OCEAN||biome===BIOME.BEACH||biome===BIOME.DESERT?'sand':
      biome===BIOME.ALPINE||biome===BIOME.SNOWFIELD||landform===LANDFORM.CLIFF?'stone':
      biome===BIOME.CLAYLANDS?'clay':
      biome===BIOME.MARSH&&riverMask>.72?'clay':'grass';
    const subsurfaceKind=
      biome===BIOME.OCEAN||biome===BIOME.BEACH||biome===BIOME.DESERT?'sand':
      biome===BIOME.CLAYLANDS?'clay':
      biome===BIOME.ALPINE||biome===BIOME.SNOWFIELD?'stone':'dirt';

    const result=Object.freeze({
      gx,gz,height:Math.floor(height),heightFloat:height,seaLevel:this.seaLevel,
      biome,landform,surfaceKind,subsurfaceKind,
      continental:f.continental,erosion:f.erosion,ridge:f.ridge,
      temperature:f.temperature,temperatureAdjusted,moisture:f.moisture,
      riverMask,mountainMask,coastMask,cliffMask,plateauMask,safeBlend
    });
    if(this.cache.size>=this.cacheLimit)this.cache.clear();
    this.cache.set(key,result);return result;
  }
  heightAt(gx,gz=0){return this.sample(gx,gz).height}
  biomeAt(gx,gz=0){return this.sample(gx,gz).biome}
  landformAt(gx,gz=0){return this.sample(gx,gz).landform}
  stats(){return {
    version:2,backend:this.backend,cacheEntries:this.cache.size,cacheLimit:this.cacheLimit,
    seaLevel:this.seaLevel,biomes:Object.values(BIOME),landforms:Object.values(LANDFORM),
    fields:['continentalness','erosion','ridge','plateau','temperature','moisture','river','detail','domain-warp'],
    spawnSafeRadius:this.spawnSafeRadius
  }}
}

global.PaperchalkBiomeRuntime=Object.freeze({BIOME,LANDFORM,BiomeLandformGenerator});
})(window);
