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

class WaterWorld{
  constructor(terrain){
    this.terrain=terrain;
    this.cells=new Map();
    this.active=new Set();
    this.dirtyChunks=new Set();
    this.version=0;
    this.tick=0;
    this.levels=8;
    this.horizontalDirs=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]];
  }
  key(gx,gy,gz){return gx+','+gy+','+gz}
  parse(key){return key.split(',').map(Number)}
  getLevel(gx,gy,gz){return this.cells.get(this.key(gx,gy,gz))||0}
  surfaceUnits(gx,gy,gz){return gy*8+this.getLevel(gx,gy,gz)}
  _chunkKey(gx,gy,gz){
    const n=this.terrain.chunkSize;
    return Math.floor(gx/n)+','+Math.floor(gy/n)+','+Math.floor(gz/n);
  }
  _markDirty(gx,gy,gz){this.dirtyChunks.add(this._chunkKey(gx,gy,gz))}
  _wake(gx,gy,gz){this.active.add(this.key(gx,gy,gz))}
  wakeAround(gx,gy,gz){
    this._wake(gx,gy,gz);
    this._wake(gx,gy+1,gz);this._wake(gx,gy-1,gz);
    for(const [dx,,dz] of this.horizontalDirs)this._wake(gx+dx,gy,gz+dz);
  }
  consumeDirtyChunks(){
    const out=[...this.dirtyChunks];this.dirtyChunks.clear();return out;
  }
  _terrainBlocksWater(gx,gy,gz){
    // The scenery-only Z rows render only their top shell for performance.
    // For liquid physics they still behave as solid terrain columns below that shell,
    // otherwise water would fall through the intentionally unrendered underground.
    if(gz!==this.terrain.interactionRowZ&&gz!==this.terrain.blackBackRowZ){
      const surface=this.terrain.surfaceCell(gx,gz);
      if(gy<=surface)return true;
    }
    return this.terrain.isSolidPeek(gx,gy,gz);
  }
  _canOccupy(gx,gy,gz){return !this._terrainBlocksWater(gx,gy,gz)}
  setLevel(gx,gy,gz,level){
    level=Math.max(0,Math.min(8,Math.round(Number(level)||0)));
    const key=this.key(gx,gy,gz),prev=this.cells.get(key)||0;
    if(prev===level)return false;
    if(level<=0)this.cells.delete(key);else this.cells.set(key,level);
    this.version++;
    this._markDirty(gx,gy,gz);
    this._markDirty(gx,gy+1,gz);this._markDirty(gx,gy-1,gz);
    for(const [dx,,dz] of this.horizontalDirs)this._markDirty(gx+dx,gy,gz+dz);
    this.wakeAround(gx,gy,gz);
    return true;
  }
  addVolume(gx,gy,gz,units=8){
    if(!this._canOccupy(gx,gy,gz))return {changed:false,reason:'solid',gx,gy,gz};
    let remaining=Math.max(0,Math.round(Number(units)||0)),added=0,y=gy,guard=0;
    while(remaining>0&&guard++<96){
      if(!this._canOccupy(gx,y,gz)){y++;continue}
      const before=this.getLevel(gx,y,gz),capacity=8-before;
      if(capacity>0){
        const put=Math.min(capacity,remaining);
        this.setLevel(gx,y,gz,before+put);
        remaining-=put;added+=put;
      }
      y++;
    }
    this.wakeAround(gx,gy,gz);
    return {changed:added>0,gx,gy,gz,unitsAdded:added,unitsRejected:remaining,totalLayers:this.totalLayers()};
  }
  placeFull(gx,gy,gz){return this.addVolume(gx,gy,gz,8)}
  remove(gx,gy,gz){return this.setLevel(gx,gy,gz,0)}
  _transfer(a,b,amount){
    if(amount<=0)return 0;
    const al=this.getLevel(...a),bl=this.getLevel(...b);
    const move=Math.max(0,Math.min(Math.round(amount),al,8-bl));
    if(!move)return 0;
    this.setLevel(...a,al-move);this.setLevel(...b,bl+move);
    return move;
  }
  _hasDrop(gx,gy,gz){
    return this._canOccupy(gx,gy,gz)&&this._canOccupy(gx,gy-1,gz)&&this.getLevel(gx,gy-1,gz)<8;
  }
  _findDropDirection3D(gx,gy,gz,maxDistance=10){
    // Breadth-first search across the X/Z plane. It finds the nearest shelf edge
    // with free space below and returns only the first step, so thin films migrate
    // toward a lower outlet instead of sticking where the bucket was poured.
    const start=this.key(gx,gy,gz);
    const queue=[[gx,gz,0,0,0]];
    const seen=new Set([start]);
    for(let qi=0;qi<queue.length;qi++){
      const [x,z,dist,firstDx,firstDz]=queue[qi];
      if(dist>0&&this._hasDrop(x,gy,z))return [firstDx,0,firstDz];
      if(dist>=maxDistance)continue;
      const offset=(this.tick+dist+x+z)&3;
      for(let i=0;i<4;i++){
        const [dx,,dz]=this.horizontalDirs[(i+offset)&3];
        const nx=x+dx,nz=z+dz,key=this.key(nx,gy,nz);
        if(seen.has(key)||!this._canOccupy(nx,gy,nz))continue;
        // A completely full cell at the same height is not a useful path for
        // a thin surface film; non-full cells can accept/transport volume.
        if(dist>0&&this.getLevel(nx,gy,nz)>=8)continue;
        seen.add(key);
        queue.push([nx,nz,dist+1,dist===0?dx:firstDx,dist===0?dz:firstDz]);
      }
    }
    return null;
  }
  _gravityPass(work,maxTransfers){
    let transfers=0,changed=false;
    // Highest cells first so one simulation tick can cascade through several Y cells.
    work.sort((ka,kb)=>this.parse(kb)[1]-this.parse(ka)[1]);
    for(const key of work){
      if(transfers>=maxTransfers)break;
      const [gx,gy,gz]=this.parse(key),level=this.getLevel(gx,gy,gz);
      if(!level)continue;
      if(!this._canOccupy(gx,gy,gz)){this.remove(gx,gy,gz);changed=true;continue}
      const below=[gx,gy-1,gz];
      if(!this._canOccupy(...below))continue;
      const capacity=8-this.getLevel(...below);
      if(capacity<=0)continue;
      const moved=this._transfer([gx,gy,gz],below,Math.min(level,capacity));
      if(moved){transfers++;changed=true}
    }
    return {transfers,changed};
  }
  _horizontalRelaxPass(work,maxTransfers){
    let transfers=0,changed=false;
    const dirs=(this.tick&1)?this.horizontalDirs:[...this.horizontalDirs].reverse();
    for(const key of work){
      if(transfers>=maxTransfers)break;
      const [gx,gy,gz]=this.parse(key);
      let level=this.getLevel(gx,gy,gz);if(level<=0)continue;
      if(!this._canOccupy(gx,gy,gz))continue;

      // Prefer a route to a lower shelf in any X/Z direction.
      const downhill=this._findDropDirection3D(gx,gy,gz,10);
      if(downhill&&level>0){
        const nx=gx+downhill[0],nz=gz+downhill[2];
        if(this._canOccupy(nx,gy,nz)){
          const moved=this._transfer([gx,gy,gz],[nx,gy,nz],Math.max(1,Math.ceil(level*.5)));
          if(moved){transfers++;changed=true;level-=moved}
        }
      }

      // Hydrostatic equalisation on the full X/Z plane. Since both cells share
      // the same voxel-base Y, equal level means equal absolute free-surface height.
      for(const [dx,,dz] of dirs){
        if(transfers>=maxTransfers)break;
        level=this.getLevel(gx,gy,gz);if(level<=0)break;
        const nx=gx+dx,nz=gz+dz;
        if(!this._canOccupy(nx,gy,nz))continue;
        const nl=this.getLevel(nx,gy,nz);
        const diff=level-nl;
        if(diff<=1)continue;
        const moved=this._transfer([gx,gy,gz],[nx,gy,nz],Math.floor(diff/2));
        if(moved){transfers++;changed=true}
      }
    }
    return {transfers,changed};
  }
  step({maxTransfers=1800,maxActive=1200,relaxPasses=8}={}){
    if(!this.cells.size||!this.active.size)return {changed:false,transfers:0,cells:this.cells.size,active:this.active.size};
    let transfers=0,changed=false;
    let work=[...this.active];this.active.clear();
    if(work.length>maxActive){
      const rest=work.splice(maxActive);
      for(const key of rest)this.active.add(key);
    }

    // Several local finite-volume sweeps per game tick make one connected pool
    // settle to a common free-surface elevation instead of visibly staircase.
    for(let pass=0;pass<relaxPasses&&work.length&&transfers<maxTransfers;pass++){
      const g=this._gravityPass(work,maxTransfers-transfers);
      transfers+=g.transfers;changed=changed||g.changed;
      const h=this._horizontalRelaxPass(work,maxTransfers-transfers);
      transfers+=h.transfers;changed=changed||h.changed;

      // Pull the newly awakened neighborhood into the next relaxation sweep.
      if(this.active.size){
        const next=new Set(work);
        for(const key of this.active)next.add(key);
        this.active.clear();
        work=[...next];
        if(work.length>maxActive){
          const rest=work.splice(maxActive);
          for(const key of rest)this.active.add(key);
        }
      }
      if(!g.changed&&!h.changed)break;
    }

    this.tick++;
    return {
      changed,transfers,cells:this.cells.size,active:this.active.size,totalLayers:this.totalLayers(),
      relaxPasses,threeDimensional:true
    };
  }
  totalLayers(){let n=0;for(const level of this.cells.values())n+=level;return n}
  submersionAABB(x,y,z,halfW,halfH,halfD){
    const s=this.terrain.tileSize;
    const minX=x-halfW,maxX=x+halfW,minY=y-halfH,maxY=y+halfH,minZ=z-halfD,maxZ=z+halfD;
    const gx0=Math.floor(minX/s),gx1=Math.floor((maxX-.0001)/s);
    const gy0=Math.floor(minY/s),gy1=Math.floor((maxY-.0001)/s);
    const gz0=Math.floor(minZ/s+.5),gz1=Math.floor((maxZ-.0001)/s+.5);
    let overlap=0;
    for(let gz=gz0;gz<=gz1;gz++)for(let gy=gy0;gy<=gy1;gy++)for(let gx=gx0;gx<=gx1;gx++){
      const level=this.getLevel(gx,gy,gz);if(!level)continue;
      const wx0=gx*s,wx1=(gx+1)*s;
      const wy0=gy*s,wy1=gy*s+(level/8)*s;
      const wz0=gz*s-s*.5,wz1=gz*s+s*.5;
      const ox=Math.max(0,Math.min(maxX,wx1)-Math.max(minX,wx0));
      const oy=Math.max(0,Math.min(maxY,wy1)-Math.max(minY,wy0));
      const oz=Math.max(0,Math.min(maxZ,wz1)-Math.max(minZ,wz0));
      overlap+=ox*oy*oz;
    }
    const volume=Math.max(.0001,(maxX-minX)*(maxY-minY)*(maxZ-minZ));
    return Math.max(0,Math.min(1,overlap/volume));
  }
  exportState(){
    const rows=[];
    for(const [key,level] of this.cells){const [gx,gy,gz]=this.parse(key);rows.push([gx,gy,gz,level])}
    return rows;
  }
  importState(rows){
    this.cells.clear();this.active.clear();this.dirtyChunks.clear();
    for(const row of Array.isArray(rows)?rows:[]){
      if(!Array.isArray(row)||row.length<4)continue;
      const [gx,gy,gz,level]=row.map(Number);
      if(![gx,gy,gz,level].every(Number.isFinite))continue;
      if(level>0&&this._canOccupy(gx|0,gy|0,gz|0)){
        const l=Math.max(1,Math.min(8,Math.round(level)));
        this.cells.set(this.key(gx|0,gy|0,gz|0),l);
        this.wakeAround(gx|0,gy|0,gz|0);this._markDirty(gx|0,gy|0,gz|0);
      }
    }
    this.version++;
  }
  stats(){
    return {
      cells:this.cells.size,totalLayers:this.totalLayers(),levels:8,
      layerHeight:this.terrain.tileSize/8,activeCells:this.active.size,
      dirtyChunks:this.dirtyChunks.size,version:this.version,
      flowModel:'3d-finite-volume-gravity-plus-hydrostatic-relaxation',
      flowPlane:'x-z-with-y-gravity',threeDimensional:true
    };
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
    this.water=new WaterWorld(this);

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
    if(gy>surface)return TILE.AIR;
    // The entire exposed surface voxel is ordinary grass terrain.
    if(gy===surface)return TILE.GRASS;
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
    if(this.isSolidTile(value))this.water?.remove(gx,gy,gz);
    const key=this.chunkKey(cx,cy,cz);let patch=this.edits.get(key);
    if(!patch){patch=new Map();this.edits.set(key,patch)}
    const index=chunk.index(lx,ly,lz),generated=gz===this.blackBackRowZ?this.generateBlackBackdropVoxel(gx,gy,gz):this.generateVoxel(gx,gy,gz);
    if(value===generated)patch.delete(index);else patch.set(index,value);
    if(patch.size===0)this.edits.delete(key);
    this.changeVersion++;
    this.water?.wakeAround(gx,gy,gz);
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
    return {tileSize:this.tileSize,pixelsPerMeter:this.pixelsPerMeter,chunkSize:this.chunkSize,loadedChunks:this.chunks.size,editedVoxels:edits,editedTiles:edits,version:this.changeVersion,generatorVersion:this.generatorVersion,noiseBackend:this.noiseBackend,dimensions:3,infinite:true,interactionRowZ:this.interactionRowZ,interactionRowCenterZ:this.interactionRowZ*this.tileSize,blackBackRowZ:this.blackBackRowZ,blackBackRowCenterZ:this.blackBackRowZ*this.tileSize,zConvention:'integer-cell-centers',nonInteractionTerrain:'surface-shell-only-plus-black-back-row',rearTopSurface:'normal-grass',rearBlackStartsBelowSurface:true,surfaceChunkCulling:true,water:this.water?.stats?.()||null};
  }
}

global.PaperchalkTerrainRuntime=Object.freeze({TILE,TerrainWorld,TerrainChunk,WaterWorld});
})(window);
