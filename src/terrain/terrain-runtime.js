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
    const n=this.size;
    const baseY=this.cy*n;
    for(let lz=0;lz<n;lz++){
      const gz=this.cz*n+lz;
      const fullDepth=gz===this.world.interactionRowZ||gz===this.world.blackBackRowZ;
      for(let lx=0;lx<n;lx++){
        const gx=this.cx*n+lx;
        if(fullDepth){
          for(let ly=0;ly<n;ly++){
            const gy=baseY+ly;
            this.voxels[this.index(lx,ly,lz)]=gz===this.world.blackBackRowZ
              ?this.world.generateBlackBackdropVoxel(gx,gy,gz)
              :this.world.generateVoxel(gx,gy,gz);
          }
          continue;
        }
        const surface=this.world.surfaceCell(gx,gz);
        const ly=surface-baseY;
        if(ly>=0&&ly<n)this.voxels[this.index(lx,ly,lz)]=TILE.GRASS;
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

class TerrainWorld{
  constructor({tileSize=1,pixelsPerMeter=128,chunkSize=16,seed=24681357,interactionRowZ=0,blackBackRowZ=null}={}){
    this.tileSize=Number(tileSize)||1;
    this.pixelsPerMeter=Math.max(1,Math.round(Number(pixelsPerMeter)||128));
    this.chunkSize=Math.max(8,Math.min(32,Math.round(Number(chunkSize)||16)));
    this.seed=seed|0;
    this.interactionRowZ=Number.isFinite(Number(interactionRowZ))?Math.floor(Number(interactionRowZ)):0;
    this.blackBackRowZ=Number.isFinite(Number(blackBackRowZ))?Math.floor(Number(blackBackRowZ)):this.interactionRowZ-1;
    this.chunks=new Map();this.edits=new Map();this.listeners=new Set();this.surfaceRangeCache=new Map();
    this.changeVersion=0;this.generatorVersion=4;this.noiseBackend='deterministic-fallback';

    const F=global.FastNoiseLite;
    if(F){
      const Noise=global.FastNoiseLiteNoiseType||{},Fractal=global.FastNoiseLiteFractalType||{};
      this.surfaceNoise=new F(this.seed+11);
      this.surfaceNoise.SetNoiseType(Noise.OpenSimplex2S||2);
      this.surfaceNoise.SetFrequency(.012);
      this.surfaceNoise.SetFractalType(Fractal.FBm||1);
      this.surfaceNoise.SetFractalOctaves(5);

      this.detailNoise=new F(this.seed+37);
      this.detailNoise.SetNoiseType(Noise.Perlin||4);
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
  }
  _hash(x,y=0,z=0){
    let h=(Math.imul((x|0)^this.seed,0x45d9f3b)+Math.imul((y|0)^0x9e3779b9,0x119de1f3)+Math.imul((z|0)^0x85ebca6b,0x27d4eb2d))|0;
    h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;return (h>>>0)/4294967295;
  }
  surfaceCell(gx,gz=0){
    if(this.surfaceNoise){
      const broad=this.surfaceNoise.GetNoise(gx,gz);
      const detail=this.detailNoise.GetNoise(gx+71,gz-113);
      return Math.floor(3+broad*9+detail*2.4);
    }
    return Math.floor(3+Math.sin((gx+this.seed*.001)*.027)*6+Math.cos((gz-this.seed*.001)*.031)*5+(this._hash(gx,0,gz)-.5)*3);
  }
  generateVoxel(gx,gy,gz){
    const surface=this.surfaceCell(gx,gz);
    if(gy>surface)return TILE.AIR;
    const depth=surface-gy;

    // Only the configured interaction row keeps a complete underground column.
    // Every other Z row is a one-voxel surface shell for 3D scenery only.
    if(gz!==this.interactionRowZ)return depth===0?TILE.GRASS:TILE.AIR;

    if(depth>4&&gy>-96&&gy<surface-2){
      if(this.caveNoise){
        const cave=this.caveNoise.GetNoise(gx,gy,gz);
        const warp=Math.abs(this.caveWarp.GetNoise(gx*1.43,gy*.91,gz*1.37));
        if(cave>.48&&warp<.66)return TILE.AIR;
      }else{
        const n=Math.sin(gx*.13+gy*.17)+Math.cos(gz*.15-gy*.11)+Math.sin((gx+gz)*.071);
        if(n>2.15)return TILE.AIR;
      }
    }

    if(depth===0)return TILE.GRASS;
    if(depth<6)return TILE.DIRT;
    if(this.strataNoise){
      const strata=this.strataNoise.GetNoise(gx,gy,gz);
      if(depth<18&&strata>.52)return TILE.CLAY;
      if(depth<16&&strata<-.55)return TILE.SAND;
    }
    return TILE.STONE;
  }
  generateBlackBackdropVoxel(gx,gy,gz=this.blackBackRowZ){
    const surface=this.surfaceCell(gx,this.interactionRowZ);
    // Rear row is a solid underground backing sheet: no caves, no light holes.
    // Keep the surface itself out so the black layer only exists underground.
    if(gy>=surface)return TILE.AIR;
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
  chunkContainsInteractionRow(cz){
    const n=this.chunkSize;
    return this.interactionRowZ>=cz*n&&this.interactionRowZ<(cz+1)*n;
  }
  chunkContainsBlackBackRow(cz){
    const n=this.chunkSize;
    return this.blackBackRowZ>=cz*n&&this.blackBackRowZ<(cz+1)*n;
  }
  chunkMayContainTerrain(cx,cy,cz){
    if(this.chunkContainsInteractionRow(cz)||this.chunkContainsBlackBackRow(cz))return true;
    const range=this.surfaceRangeForChunk(cx,cz),n=this.chunkSize;
    const minY=cy*n,maxY=minY+n-1;
    return range.max>=minY&&range.min<=maxY;
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
    const key=this.chunkKey(cx,cy,cz);let patch=this.edits.get(key);
    if(!patch){patch=new Map();this.edits.set(key,patch)}
    const index=chunk.index(lx,ly,lz),generated=this.generateVoxel(gx,gy,gz);
    if(value===generated)patch.delete(index);else patch.set(index,value);
    if(patch.size===0)this.edits.delete(key);
    this.changeVersion++;
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
    for(let gy=minY;gy<=maxY;gy++)for(let gz=minZ;gz<=maxZ;gz++)for(let gx=minX;gx<=maxX;gx++)if(this.isSolid(gx,gy,gz))return true;
    return false;
  }
  highestGroundY(worldX,worldZ=0,{fromCell=96,toCell=-256}={}){
    const s=this.tileSize,gx=Math.floor(worldX/s),gz=Math.floor(worldZ/s+.5);
    for(let gy=fromCell;gy>=toCell;gy--)if(this.isSolid(gx,gy,gz))return (gy+1)*s;
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
      if(!patch){patch=new Map();this.edits.set(key,patch)}
      patch.set(index|0,value|0);
    }
    this.changeVersion++;for(const listener of this.listeners)listener({reload:true,version:this.changeVersion});
  }
  stats(){
    let edits=0;for(const patch of this.edits.values())edits+=patch.size;
    return {tileSize:this.tileSize,pixelsPerMeter:this.pixelsPerMeter,chunkSize:this.chunkSize,loadedChunks:this.chunks.size,editedVoxels:edits,editedTiles:edits,version:this.changeVersion,generatorVersion:this.generatorVersion,noiseBackend:this.noiseBackend,dimensions:3,infinite:true,interactionRowZ:this.interactionRowZ,interactionRowCenterZ:this.interactionRowZ*this.tileSize,blackBackRowZ:this.blackBackRowZ,blackBackRowCenterZ:this.blackBackRowZ*this.tileSize,zConvention:'integer-cell-centers',nonInteractionTerrain:'surface-shell-only-plus-black-back-row',surfaceChunkCulling:true};
  }
}

global.PaperchalkTerrainRuntime=Object.freeze({TILE,TerrainWorld,TerrainChunk});
})(window);
