/* Paperchalk infinite 3D voxel-world runtime.
 * Deterministic chunk streaming: X/Y/Z are all gameplay voxel axes.
 * Chunks are generated on demand and can be unloaded without losing edits.
 */
(function(global){
'use strict';

const TILE=Object.freeze({AIR:0,GRASS:1,DIRT:2,STONE:3,SAND:4,CLAY:5});
const SOLID=new Set([TILE.GRASS,TILE.DIRT,TILE.STONE,TILE.SAND,TILE.CLAY]);

class TerrainChunk{
  constructor(world,cx,cy,cz){
    this.world=world;this.cx=cx;this.cy=cy;this.cz=cz;this.size=world.chunkSize;
    this.voxels=new Uint8Array(this.size*this.size*this.size);
    this.tiles=this.voxels;
    this.version=1;this.dirty=true;this._generate();
  }
  index(lx,ly,lz){return (ly*this.size+lz)*this.size+lx}
  _generate(){
    const n=this.size,baseY=this.cy*n;
    for(let lz=0;lz<n;lz++){
      const gz=this.cz*n+lz;
      for(let lx=0;lx<n;lx++){
        const gx=this.cx*n+lx;
        for(let ly=0;ly<n;ly++){
          const gy=baseY+ly;
          this.voxels[this.index(lx,ly,lz)]=gz===this.world.blackBackRowZ
            ?this.world.generateBlackBackdropVoxel(gx,gy,gz)
            :this.world.generateVoxel(gx,gy,gz);
        }
      }
    }
  }
  get(lx,ly,lz){return this.voxels[this.index(lx,ly,lz)]}
  set(lx,ly,lz,value){
    const i=this.index(lx,ly,lz);
    if(this.voxels[i]===value)return false;
    this.voxels[i]=value;this.version++;this.dirty=true;return true;
  }
}

const WaterWorld=global.PaperchalkWaterRuntime?.WaterWorld;
if(!WaterWorld)throw new Error('PaperchalkWaterRuntime missing');

class TerrainWorld{
  constructor({tileSize=1,pixelsPerMeter=128,chunkSize=16,seed=24681357,interactionRowZ=0,blackBackRowZ=null,biomeConfig=null}={}){
    this.tileSize=Number(tileSize)||1;
    this.pixelsPerMeter=Math.max(1,Math.round(Number(pixelsPerMeter)||128));
    this.chunkSize=Math.max(8,Math.min(32,Math.round(Number(chunkSize)||16)));
    this.seed=seed|0;
    this.interactionRowZ=Number.isFinite(Number(interactionRowZ))?Math.floor(Number(interactionRowZ)):0;
    this.blackBackRowZ=Number.isFinite(Number(blackBackRowZ))?Math.floor(Number(blackBackRowZ)):this.interactionRowZ-1;
    this.chunks=new Map();this.edits=new Map();this.listeners=new Set();this.surfaceRangeCache=new Map();this.biomeChunkCache=new Map();
    this.changeVersion=0;this.generatorVersion=5;this.noiseBackend='deterministic-fallback';this.biomeConfig=biomeConfig&&typeof biomeConfig==='object'?{...biomeConfig}:{};
    this.seaLevel=Number.isFinite(Number(this.biomeConfig.seaLevel))?Number(this.biomeConfig.seaLevel):0;
    this.water=new WaterWorld(this);

    const F=global.FastNoiseLite;
    if(F){
      const Noise=global.FastNoiseLiteNoiseType||{},Fractal=global.FastNoiseLiteFractalType||{};
      this.surfaceNoise=new F(this.seed+11);
      this.surfaceNoise.SetNoiseType(Noise.OpenSimplex2S||2);
      this.surfaceNoise.SetFrequency(.012);
      this.surfaceNoise.SetFractalType(Fractal.FBm||1);
      this.surfaceNoise.SetFractalOctaves(5);

      this.detailNoise=new F(this.seed+37);      this.detailNoise.SetNoiseType(Noise.Perlin||4);
      this.detailNoise.SetFrequency(.038);
      this.detailNoise.SetFractalType(Fractal.FBm||1);
      this.detailNoise.SetFractalOctaves(3);

      this.caveNoise=new F(this.seed+101);
      this.caveNoise.SetNoiseType(Noise.OpenSimplex2S||2);
      this.caveNoise.SetFrequency(.048);
      this.caveNoise.SetFractalType(Fractal.FBm||1);
      this.caveNoise.SetFractalOctaves(3);
      this.caveWarp=new F(this.seed+211);
      this.caveWarp.SetNoiseType(Noise.Perlin||4);
      this.caveWarp.SetFrequency(.085);

      this.strataNoise=new F(this.seed+509);
      this.strataNoise.SetNoiseType(Noise.Cellular||3);
      this.strataNoise.SetFrequency(.055);
      this.noiseBackend='FastNoiseLite-1.1.1';
    }
    const BiomeGenerator=global.PaperchalkBiomeRuntime?.BiomeLandformGenerator;
    this.biomeGenerator=BiomeGenerator?new BiomeGenerator({
      seed:this.seed,spawnX:0,spawnZ:this.interactionRowZ,
      spawnSafeRadius:Number(this.biomeConfig.spawnSafeRadius)||22,
      seaLevel:this.seaLevel
    }):null;
    this.biomeBackend=this.biomeGenerator?.backend||'none';
  }
  _hash(x,y=0,z=0){
    let h=(Math.imul((x|0)^this.seed,0x45d9f3b)+Math.imul((y|0)^0x9e3779b9,0x119de1f3)+Math.imul((z|0)^0x85ebca6b,0x27d4eb2d))|0;
    h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;return (h>>>0)/4294967295;
  }
  terrainProfile(gx,gz=0){
    if(this.biomeGenerator)return this.biomeGenerator.sample(gx,gz);
    const height=this.surfaceNoise
      ?Math.floor(3+this.surfaceNoise.GetNoise(gx,gz)*9+this.detailNoise.GetNoise(gx+71,gz-113)*2.4)
      :Math.floor(3+Math.sin((gx+this.seed*.001)*.027)*6+Math.cos((gz-this.seed*.001)*.031)*5+(this._hash(gx,0,gz)-.5)*3);
    return {gx,gz,height,heightFloat:height,biome:'meadow',landform:'rolling-hills',surfaceKind:'grass',subsurfaceKind:'dirt',riverMask:0,mountainMask:0};
  }
  surfaceCell(gx,gz=0){return this.terrainProfile(gx,gz).height}
  _kindToTile(kind){
    if(kind==='sand')return TILE.SAND;
    if(kind==='stone')return TILE.STONE;
    if(kind==='clay')return TILE.CLAY;
    if(kind==='dirt')return TILE.DIRT;
    return TILE.GRASS;
  }
  surfaceTile(gx,gz=0){return this._kindToTile(this.terrainProfile(gx,gz).surfaceKind)}
  biomeAt(gx,gz=0){return this.terrainProfile(gx,gz).biome}
  landformAt(gx,gz=0){return this.terrainProfile(gx,gz).landform}
  sampleAtWorld(x,z=0){
    const s=this.tileSize,gx=Math.floor(Number(x)/s),gz=Math.floor(Number(z)/s+.5);
    return this.terrainProfile(gx,gz);
  }
  seaSurfaceY(){return this.seaLevel*this.tileSize}
  oceanBoundsForColumn(gx,gz=0){
    const profile=this.terrainProfile(gx,gz),s=this.tileSize;
    const bottom=(profile.height+1)*s,top=this.seaSurfaceY();
    if(bottom>=top-.0001)return null;
    return {gx,gz,bottom,top,depth:top-bottom,cells:0,layers:0,analyticOcean:true};
  }
  isOceanColumn(gx,gz=0){return !!this.oceanBoundsForColumn(gx,gz)}
  generateVoxel(gx,gy,gz){
    if(gz!==this.interactionRowZ)return TILE.AIR;
    const profile=this.terrainProfile(gx,this.interactionRowZ);
    const surface=profile.height;
    if(gy>surface)return TILE.AIR;
    const depth=surface-gy;

    // Every visible Z slice is a closed solid terrain volume.
    // Caves remain a gameplay-row feature so scenery depth cannot expose hollow shell gaps.
    if(gz===this.interactionRowZ&&depth>4&&gy>-96&&gy<surface-2){
      if(this.caveNoise){
        const cave=this.caveNoise.GetNoise(gx,gy,gz);
        const warp=Math.abs(this.caveWarp.GetNoise(gx*1.43,gy*.91,gz*1.37));
        if(cave>.48&&warp<.66)return TILE.AIR;
      }else{
        const n=Math.sin(gx*.13+gy*.17)+Math.cos(gz*.15-gy*.11)+Math.sin((gx+gz)*.071);
        if(n>2.15)return TILE.AIR;
      }
    }

    if(depth===0)return this._kindToTile(profile.surfaceKind);
    const subsurface=this._kindToTile(profile.subsurfaceKind);
    const soilDepth=profile.biome==='alpine'?2:profile.biome==='dry-steppe'?5:profile.biome==='marsh'?7:6;
    if(depth<soilDepth)return subsurface;
    if(this.strataNoise){
      const strata=this.strataNoise.GetNoise(gx,gy,gz);
      if(profile.biome==='claylands'&&depth<20)return TILE.CLAY;
      if(profile.biome==='dry-steppe'&&depth<18&&strata<.58)return TILE.SAND;
      if(depth<18&&strata>.58)return TILE.CLAY;
      if(depth<16&&strata<-.62)return TILE.SAND;
    }
    return TILE.STONE;
  }
  generateBlackBackdropVoxel(gx,gy,gz=this.blackBackRowZ){
    const surface=this.surfaceCell(gx,this.interactionRowZ);
    if(gy>surface)return TILE.AIR;
    // The entire exposed surface voxel is ordinary grass terrain.
    if(gy===surface)return this.surfaceTile(gx,this.interactionRowZ);
    // Only buried rear voxels are the absolute-black backing layer.
    return TILE.STONE;
  }
  generateTile(gx,gy,gz=0){return gz===this.blackBackRowZ?this.generateBlackBackdropVoxel(gx,gy,gz):this.generateVoxel(gx,gy,gz)}
  surfaceRangeForChunk(cx,cz){
    const key=cx+','+cz;
    const cached=this.surfaceRangeCache.get(key);if(cached)return cached;
    const n=this.chunkSize;
    let min=Infinity,max=-Infinity;
    for(let lz=0;lz<n;lz++)for(let lx=0;lx<n;lx++){
      const h=this.surfaceCell(cx*n+lx,cz*n+lz);
      if(h<min)min=h;if(h>max)max=h;
    }
    const range={min,max};this.surfaceRangeCache.set(key,range);return range;
  }
  biomeSummaryForChunk(cx,cz){
    const key=cx+','+cz,cached=this.biomeChunkCache.get(key);if(cached)return cached;
    const n=this.chunkSize,counts=new Map(),landforms=new Map();
    let min=Infinity,max=-Infinity;
    for(let lz=0;lz<n;lz+=4)for(let lx=0;lx<n;lx+=4){
      const p=this.terrainProfile(cx*n+lx,cz*n+lz);
      counts.set(p.biome,(counts.get(p.biome)||0)+1);
      landforms.set(p.landform,(landforms.get(p.landform)||0)+1);
      min=Math.min(min,p.height);max=Math.max(max,p.height);
    }
    const dominant=map=>[...map.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'unknown';
    const summary={biome:dominant(counts),landform:dominant(landforms),minHeight:min,maxHeight:max};
    this.biomeChunkCache.set(key,summary);return summary;
  }
    chunkContainsInteractionRow(cz){
    const n=this.chunkSize;
    return this.interactionRowZ>=cz*n&&this.interactionRowZ<(cz+1)*n;
  }
  chunkContainsBlackBackRow(cz){
    const n=this.chunkSize;
    return this.blackBackRowZ>=cz*n&&this.blackBackRowZ<(cz+1)*n;
  }
  chunkMayContainTerrain(cx,cy,cz){
    // Gameplay terrain is deliberately one voxel thick in Z. The only second
    // voxel row is the rear black backing used to hide underground depth.
    if(!this.chunkContainsInteractionRow(cz)&&!this.chunkContainsBlackBackRow(cz))return false;
    const range=this.surfaceRangeForChunk(cx,cz),n=this.chunkSize,minY=cy*n;
    return minY<=range.max;
  }
  _floorDiv(n,d){return Math.floor(n/d)}
  _mod(n,d){return ((n%d)+d)%d}
  chunkKey(cx,cy,cz){return cx+','+cy+','+cz}
  getChunk(cx,cy,cz){
    const key=this.chunkKey(cx,cy,cz);let chunk=this.chunks.get(key);
    if(!chunk){
      chunk=new TerrainChunk(this,cx,cy,cz);
      const patch=this.edits.get(key);
      if(patch)for(const [index,value] of patch)chunk.voxels[index]=value;
      this.chunks.set(key,chunk);
    }
    return chunk;
  }
  getVoxel(gx,gy,gz){
    const n=this.chunkSize,cx=this._floorDiv(gx,n),cy=this._floorDiv(gy,n),cz=this._floorDiv(gz,n);
    return this.getChunk(cx,cy,cz).get(this._mod(gx,n),this._mod(gy,n),this._mod(gz,n));
  }
  getTile(gx,gy,gz=0){return this.getVoxel(gx,gy,gz)}
  peekVoxel(gx,gy,gz){
    const n=this.chunkSize,cx=this._floorDiv(gx,n),cy=this._floorDiv(gy,n),cz=this._floorDiv(gz,n);
    const lx=this._mod(gx,n),ly=this._mod(gy,n),lz=this._mod(gz,n),key=this.chunkKey(cx,cy,cz);
    const loaded=this.chunks.get(key);if(loaded)return loaded.get(lx,ly,lz);
    const patch=this.edits.get(key),index=(ly*n+lz)*n+lx;
    if(patch?.has(index))return patch.get(index);
    return gz===this.blackBackRowZ?this.generateBlackBackdropVoxel(gx,gy,gz):this.generateVoxel(gx,gy,gz);
  }
  peekTile(gx,gy,gz=0){return this.peekVoxel(gx,gy,gz)}
  unloadChunk(cx,cy,cz){return this.chunks.delete(this.chunkKey(cx,cy,cz))}
  setVoxel(gx,gy,gz,value){
    value=Number(value)|0;if(value<0||value>255)return false;
    const n=this.chunkSize,cx=this._floorDiv(gx,n),cy=this._floorDiv(gy,n),cz=this._floorDiv(gz,n);
    const lx=this._mod(gx,n),ly=this._mod(gy,n),lz=this._mod(gz,n),chunk=this.getChunk(cx,cy,cz);
    if(!chunk.set(lx,ly,lz,value))return false;
    if(this.isSolidTile(value))this.water?.remove(gx,gy,gz);
    const key=this.chunkKey(cx,cy,cz);let patch=this.edits.get(key);
    if(!patch){patch=new Map();this.edits.set(key,patch)}
    const index=chunk.index(lx,ly,lz),generated=gz===this.blackBackRowZ?this.generateBlackBackdropVoxel(gx,gy,gz):this.generateVoxel(gx,gy,gz);
    if(value===generated)patch.delete(index);else patch.set(index,value);
    if(patch.size===0)this.edits.delete(key);
    this.changeVersion++;
    this.water?.requestSettleAround(gx,gy,gz);
    const event={gx,gy,gz,value,cx,cy,cz,version:this.changeVersion};
    for(const listener of this.listeners)listener(event);
    return true;
  }
  setTile(gx,gy,value,gz=0){return this.setVoxel(gx,gy,gz,value)}
  isSolidTile(tile){return SOLID.has(tile)}
  isSolid(gx,gy,gz=0){return this.isSolidTile(this.getVoxel(gx,gy,gz))}
  isSolidPeek(gx,gy,gz=0){return this.isSolidTile(this.peekVoxel(gx,gy,gz))}
  metersToPixels(m){return Number(m)*this.pixelsPerMeter}
  pixelsToMeters(px){return Number(px)/this.pixelsPerMeter}
  worldToCell(x,y,z=0){const s=this.tileSize;return {gx:Math.floor(x/s),gy:Math.floor(y/s),gz:Math.floor(z/s+.5)}}
  cellCenter(gx,gy,gz=0){const s=this.tileSize;return {x:(gx+.5)*s,y:(gy+.5)*s,z:gz*s}}
  digCell(gx,gy,gz){
    const previous=this.getVoxel(gx,gy,gz);if(previous===TILE.AIR)return {changed:false,gx,gy,gz,previous};
    this.setVoxel(gx,gy,gz,TILE.AIR);return {changed:true,gx,gy,gz,previous,value:TILE.AIR};
  }
  placeCell(gx,gy,gz,tile=TILE.DIRT){
    const previous=this.getVoxel(gx,gy,gz);if(previous!==TILE.AIR)return {changed:false,gx,gy,gz,previous};
    this.setVoxel(gx,gy,gz,tile);return {changed:true,gx,gy,gz,previous,value:tile};
  }
  digWorld(x,y,z=0){const c=this.worldToCell(x,y,z);return this.digCell(c.gx,c.gy,c.gz)}
  placeWorld(x,y,z=0,tile=TILE.DIRT){const c=this.worldToCell(x,y,z);return this.placeCell(c.gx,c.gy,c.gz,tile)}
  collidesAABB(x,y,z,halfW,halfH,halfD){
    const s=this.tileSize;
    const minX=Math.floor((x-halfW+.001)/s),maxX=Math.floor((x+halfW-.001)/s);
    const minY=Math.floor((y-halfH+.001)/s),maxY=Math.floor((y+halfH-.001)/s);
    const minZ=Math.floor((z-halfD+.001)/s+.5),maxZ=Math.floor((z+halfD-.001)/s+.5);
    for(let gy=minY;gy<=maxY;gy++)for(let gz=minZ;gz<=maxZ;gz++)for(let gx=minX;gx<=maxX;gx++)if(this.isSolidPeek(gx,gy,gz))return true;
    return false;
  }
  highestGroundY(worldX,worldZ=0,{fromCell=96,toCell=-256}={}){
    const s=this.tileSize,gx=Math.floor(worldX/s),gz=Math.floor(worldZ/s+.5);
    const surface=this.surfaceCell(gx,gz),n=this.chunkSize;
    // Above the generated surface only explicit placed edits can be solid.
    // Check those cheaply without generating or retaining any chunks.
    for(let gy=fromCell;gy>surface;gy--){
      const cx=this._floorDiv(gx,n),cy=this._floorDiv(gy,n),cz=this._floorDiv(gz,n);
      const patch=this.edits.get(this.chunkKey(cx,cy,cz));if(!patch)continue;
      const lx=this._mod(gx,n),ly=this._mod(gy,n),lz=this._mod(gz,n);
      const value=patch.get((ly*n+lz)*n+lx);
      if(value!=null&&this.isSolidTile(value))return (gy+1)*s;
    }
    // Normally the first test is the surface voxel. Peek preserves edits/caves
    // without polluting the streamed chunk cache.
    for(let gy=Math.min(fromCell,surface);gy>=toCell;gy--)if(this.isSolidPeek(gx,gy,gz))return (gy+1)*s;
    return toCell*s;
  }
  subscribe(listener){if(typeof listener!=='function')return ()=>{};this.listeners.add(listener);return ()=>this.listeners.delete(listener)}
  exportEdits(){
    const out=[];
    for(const [key,patch] of this.edits){
      const [cx,cy,cz]=key.split(',').map(Number);
      for(const [index,value] of patch)out.push([cx,cy,cz,index,value]);
    }
    return out;
  }
  importEdits(rows){
    this.edits.clear();this.chunks.clear();
    for(const row of Array.isArray(rows)?rows:[]){
      if(!Array.isArray(row))continue;
      let cx,cy,cz,index,value;
      if(row.length>=5)[cx,cy,cz,index,value]=row.map(Number);
      else if(row.length>=4){[cx,cy,index,value]=row.map(Number);cz=0}
      else continue;
      if(![cx,cy,cz,index,value].every(Number.isFinite))continue;
      const key=this.chunkKey(cx,cy,cz);let patch=this.edits.get(key);
      if(!patch){patch=new Map();this.edits.set(key,patch)}      patch.set(index|0,value|0);
    }
    this.changeVersion++;for(const listener of this.listeners)listener({reload:true,version:this.changeVersion});
  }
  stats(){
    let edits=0;for(const patch of this.edits.values())edits+=patch.size;
    return {tileSize:this.tileSize,pixelsPerMeter:this.pixelsPerMeter,chunkSize:this.chunkSize,loadedChunks:this.chunks.size,editedVoxels:edits,editedTiles:edits,version:this.changeVersion,generatorVersion:this.generatorVersion,noiseBackend:this.noiseBackend,biomeBackend:this.biomeBackend,dimensions:3,infinite:true,seaLevel:this.seaLevel,seaSurfaceY:this.seaSurfaceY(),analyticOcean:true,interactionRowZ:this.interactionRowZ,interactionRowCenterZ:this.interactionRowZ*this.tileSize,blackBackRowZ:this.blackBackRowZ,blackBackRowCenterZ:this.blackBackRowZ*this.tileSize,zConvention:'integer-cell-centers',nonInteractionTerrain:'air-except-black-back-row',rearTopSurface:'biome-surface',rearBlackStartsBelowSurface:true,surfaceChunkCulling:true,biomeGenerator:this.biomeGenerator?.stats?.()||null,water:this.water?.stats?.()||null};
  }
}

global.PaperchalkTerrainRuntime=Object.freeze({TILE,TerrainWorld,TerrainChunk,WaterWorld});})(window);