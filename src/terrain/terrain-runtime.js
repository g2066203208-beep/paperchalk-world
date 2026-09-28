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
    this.dirtyChunks=new Set();
    this.version=0;
    this.tick=0;
    this.levels=8;
    this.needsSettle=false;
    this.lastSettle={bodies:0,columns:0,layers:0,heapPops:0};
    this.horizontalDirs=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]];
    this.neighborDirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  }
  key(gx,gy,gz){return gx+','+gy+','+gz}
  columnKey(gx,gz){return gx+','+gz}
  parse(key){return key.split(',').map(Number)}
  parseColumn(key){return key.split(',').map(Number)}
  getLevel(gx,gy,gz){return this.cells.get(this.key(gx,gy,gz))||0}
  surfaceUnits(gx,gy,gz){return gy*8+this.getLevel(gx,gy,gz)}
  _chunkKey(gx,gy,gz){
    const n=this.terrain.chunkSize;
    return Math.floor(gx/n)+','+Math.floor(gy/n)+','+Math.floor(gz/n);
  }
  _markDirty(gx,gy,gz){this.dirtyChunks.add(this._chunkKey(gx,gy,gz))}
  _markNeighborhoodDirty(gx,gy,gz){
    this._markDirty(gx,gy,gz);
    this._markDirty(gx,gy+1,gz);this._markDirty(gx,gy-1,gz);
    for(const [dx,,dz] of this.horizontalDirs)this._markDirty(gx+dx,gy,gz+dz);
  }
  consumeDirtyChunks(){const out=[...this.dirtyChunks];this.dirtyChunks.clear();return out}
  _terrainBlocksWater(gx,gy,gz){
    // Scenery Z rows keep only their visible surface shell. For liquid physics
    // the hidden material below that shell is treated as solid so water cannot
    // fall through intentionally ungenerated terrain.
    if(gz!==this.terrain.interactionRowZ&&gz!==this.terrain.blackBackRowZ){
      if(gy<=this.terrain.surfaceCell(gx,gz))return true;
    }
    return this.terrain.isSolidPeek(gx,gy,gz);
  }
  _canOccupy(gx,gy,gz){return !this._terrainBlocksWater(gx,gy,gz)}
  _writeLevel(gx,gy,gz,level){
    level=Math.max(0,Math.min(8,Math.round(Number(level)||0)));
    const key=this.key(gx,gy,gz),prev=this.cells.get(key)||0;
    if(prev===level)return false;
    if(level<=0)this.cells.delete(key);else this.cells.set(key,level);
    this.version++;this._markNeighborhoodDirty(gx,gy,gz);
    return true;
  }
  requestSettle(){this.needsSettle=true}
  requestSettleAround(gx,gy,gz){
    this.needsSettle=true;
    this._markNeighborhoodDirty(gx,gy,gz);
  }
  setLevel(gx,gy,gz,level,{settle=true}={}){
    if(!this._canOccupy(gx,gy,gz)&&level>0)return false;
    const changed=this._writeLevel(gx,gy,gz,level);
    if(changed&&settle)this.requestSettleAround(gx,gy,gz);
    return changed;
  }
  addVolume(gx,gy,gz,units=8,{settle=true}={}){
    if(!this._canOccupy(gx,gy,gz))return {changed:false,reason:'solid',gx,gy,gz};
    let remaining=Math.max(0,Math.round(Number(units)||0)),added=0,y=gy,guard=0;
    while(remaining>0&&guard++<96){
      if(!this._canOccupy(gx,y,gz)){y++;continue}
      const before=this.getLevel(gx,y,gz),capacity=8-before;
      if(capacity>0){
        const put=Math.min(capacity,remaining);
        this._writeLevel(gx,y,gz,before+put);
        remaining-=put;added+=put;
      }
      y++;
    }
    if(added&&settle){this.requestSettleAround(gx,gy,gz);this.settleAll()}
    return {changed:added>0,gx,gy,gz,unitsAdded:added,unitsRejected:remaining,totalLayers:this.totalLayers()};
  }
  placeFull(gx,gy,gz){return this.addVolume(gx,gy,gz,8)}
  remove(gx,gy,gz,{settle=true}={}){
    const changed=this._writeLevel(gx,gy,gz,0);
    if(changed&&settle)this.requestSettleAround(gx,gy,gz);
    return changed;
  }
  _columnFloorUnits(gx,gz,nearUnits){
    let gy=Math.floor(nearUnits/8);
    let guard=0;
    while(guard++<192&&this._terrainBlocksWater(gx,gy,gz))gy++;
    guard=0;
    while(guard++<192&&this._canOccupy(gx,gy-1,gz))gy--;
    return gy*8;
  }
  _collectBodies(){
    const remaining=new Set(this.cells.keys()),bodies=[];
    while(remaining.size){
      const first=remaining.values().next().value;
      const queue=[first],cells=[];
      remaining.delete(first);
      for(let qi=0;qi<queue.length;qi++){
        const key=queue[qi],level=this.cells.get(key)||0;
        if(!level)continue;
        cells.push([key,level]);
        const [gx,gy,gz]=this.parse(key);
        for(const [dx,dy,dz] of this.neighborDirs){
          const nk=this.key(gx+dx,gy+dy,gz+dz);
          if(remaining.has(nk)){remaining.delete(nk);queue.push(nk)}
        }
      }
      if(cells.length)bodies.push(cells);
    }
    return bodies;
  }
  _heapPush(heap,node){
    let i=heap.length;heap.push(node);
    while(i>0){
      const p=(i-1)>>1;if(heap[p][0]<=node[0])break;
      heap[i]=heap[p];i=p;
    }
    heap[i]=node;
  }
  _heapPop(heap){
    if(!heap.length)return null;
    const root=heap[0],last=heap.pop();
    if(heap.length&&last){
      let i=0;
      while(true){
        let l=i*2+1,r=l+1;if(l>=heap.length)break;
        let c=r<heap.length&&heap[r][0]<heap[l][0]?r:l;
        if(heap[c][0]>=last[0])break;
        heap[i]=heap[c];i=c;
      }
      heap[i]=last;
    }
    return root;
  }
  _settleBody(body,blockedColumns){
    let total=0,heapPops=0;
    const seeds=new Map();
    for(const [key,level] of body){
      total+=level;
      const [gx,gy,gz]=this.parse(key),ck=this.columnKey(gx,gz);
      const near=gy*8;
      const prev=seeds.get(ck);
      if(prev==null||near<prev)seeds.set(ck,near);
    }
    if(total<=0)return {cells:new Map(),columns:0,layers:0,heapPops:0};

    const states=new Map(),heap=[];
    const activate=(gx,gz,nearUnits,force=false)=>{
      const ck=this.columnKey(gx,gz);
      if(states.has(ck))return states.get(ck);
      if(!force&&blockedColumns?.has(ck))return null;
      const floor=this._columnFloorUnits(gx,gz,nearUnits);
      const state={gx,gz,floor,filled:0,next:floor};
      states.set(ck,state);this._heapPush(heap,[state.next,ck]);
      return state;
    };
    for(const [ck,near] of seeds){
      const [gx,gz]=this.parseColumn(ck);activate(gx,gz,near,true);
    }

    let placed=0,safety=Math.max(4096,total*40);
    while(placed<total&&heap.length&&safety-->0){
      const popped=this._heapPop(heap);heapPops++;
      if(!popped)break;
      const [height,ck]=popped,state=states.get(ck);
      if(!state||height!==state.next)continue;
      const gy=Math.floor(height/8);
      if(!this._canOccupy(state.gx,gy,state.gz)){
        // A ceiling/solid interrupted this column. Do not teleport through it.
        state.next=Infinity;continue;
      }

      state.filled++;placed++;
      const topHeight=height+1;
      state.next=state.floor+state.filled;
      this._heapPush(heap,[state.next,ck]);

      // A filled layer can spill sideways at its top elevation. Newly reached
      // columns are inserted by floor elevation, so the heap automatically
      // sends the next units to the lowest reachable places first.
      for(const [dx,,dz] of this.horizontalDirs){
        const nx=state.gx+dx,nz=state.gz+dz,nck=this.columnKey(nx,nz);
        if(states.has(nck)||(!seeds.has(nck)&&blockedColumns?.has(nck)))continue;
        const floor=this._columnFloorUnits(nx,nz,height);
        if(floor<=topHeight)activate(nx,nz,height,seeds.has(nck));
      }
    }

    // If exotic enclosed geometry exhausted the frontier, keep the remaining
    // conserved volume in the original seed columns rather than deleting it.
    if(placed<total){
      const seedStates=[...seeds.keys()].map(k=>states.get(k)).filter(Boolean);
      let si=0;
      while(placed<total&&seedStates.length){
        const state=seedStates[si++%seedStates.length];
        const h=state.floor+state.filled,gy=Math.floor(h/8);
        if(this._canOccupy(state.gx,gy,state.gz)){state.filled++;placed++}
        else break;
      }
    }

    const out=new Map();
    for(const state of states.values()){
      for(let i=0;i<state.filled;i++){
        const abs=state.floor+i,gy=Math.floor(abs/8),layer=(abs-gy*8)+1;
        const key=this.key(state.gx,gy,state.gz);
        if(layer>(out.get(key)||0))out.set(key,layer);
      }
    }
    return {cells:out,columns:states.size,layers:placed,heapPops};
  }
  settleAll(){
    if(!this.needsSettle)return {changed:false,...this.lastSettle};
    this.needsSettle=false;
    if(!this.cells.size){
      this.lastSettle={bodies:0,columns:0,layers:0,heapPops:0};
      return {changed:false,...this.lastSettle};
    }

    const before=new Map(this.cells),bodies=this._collectBodies();
    const bodyColumns=bodies.map(body=>{
      const set=new Set();
      for(const [key] of body){const [gx,,gz]=this.parse(key);set.add(this.columnKey(gx,gz))}
      return set;
    });
    const next=new Map(),claimedColumns=new Set();
    let columns=0,layers=0,heapPops=0;
    for(let bi=0;bi<bodies.length;bi++){
      const blocked=new Set(claimedColumns);
      for(let oi=0;oi<bodyColumns.length;oi++)if(oi!==bi)for(const ck of bodyColumns[oi])blocked.add(ck);
      const settled=this._settleBody(bodies[bi],blocked);
      columns+=settled.columns;layers+=settled.layers;heapPops+=settled.heapPops;
      for(const [key,level] of settled.cells){
        next.set(key,level);
        const [gx,,gz]=this.parse(key);claimedColumns.add(this.columnKey(gx,gz));
      }
    }

    let changed=before.size!==next.size;
    const keys=new Set([...before.keys(),...next.keys()]);
    this.cells=next;
    for(const key of keys){
      const old=before.get(key)||0,now=next.get(key)||0;
      if(old!==now){
        changed=true;
        const [gx,gy,gz]=this.parse(key);this._markNeighborhoodDirty(gx,gy,gz);
      }
    }
    if(changed)this.version++;
    this.tick++;
    const beforeLayers=[...before.values()].reduce((sum,v)=>sum+v,0);
    const afterLayers=this.totalLayers();
    this.lastSettle={bodies:bodies.length,columns,layers,heapPops,beforeLayers,afterLayers,conserved:beforeLayers===afterLayers};
    return {changed,...this.lastSettle,totalLayers:afterLayers,exactHydrostatic:true};
  }
  step(){
    return this.settleAll();
  }
  totalLayers(){let n=0;for(const level of this.cells.values())n+=level;return n}
  highestSurfaceY(gx,gz){
    let top=-Infinity;
    for(const [key,level] of this.cells){
      if(!level)continue;
      const [x,gy,z]=this.parse(key);
      if(x!==gx||z!==gz)continue;
      top=Math.max(top,gy*this.terrain.tileSize+(level/8)*this.terrain.tileSize);
    }
    return top;
  }
  surfaceAtWorld(x,z){
    const s=this.terrain.tileSize;
    const gx=Math.floor(x/s),gz=Math.floor(z/s+.5);
    const y=this.highestSurfaceY(gx,gz);
    return Number.isFinite(y)?{gx,gz,y,levelColumn:true}:null;
  }
  submersionAABB(x,y,z,halfW,halfH,halfD){
    const s=this.terrain.tileSize;
    const minX=x-halfW,maxX=x+halfW,minY=y-halfH,maxY=y+halfH,minZ=z-halfD,maxZ=z+halfD;
    const gx0=Math.floor(minX/s),gx1=Math.floor((maxX-.0001)/s);
    const gy0=Math.floor(minY/s),gy1=Math.floor((maxY-.0001)/s);
    const gz0=Math.floor(minZ/s+.5),gz1=Math.floor((maxZ-.0001)/s+.5);
    let overlap=0;
    for(let gz=gz0;gz<=gz1;gz++)for(let gy=gy0;gy<=gy1;gy++)for(let gx=gx0;gx<=gx1;gx++){
      const level=this.getLevel(gx,gy,gz);if(!level)continue;
      const wx0=gx*s,wx1=(gx+1)*s,wy0=gy*s,wy1=gy*s+(level/8)*s;
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
    this.cells.clear();this.dirtyChunks.clear();
    for(const row of Array.isArray(rows)?rows:[]){
      if(!Array.isArray(row)||row.length<4)continue;
      const [gx,gy,gz,level]=row.map(Number);
      if(![gx,gy,gz,level].every(Number.isFinite))continue;
      if(level>0&&this._canOccupy(gx|0,gy|0,gz|0)){
        this.cells.set(this.key(gx|0,gy|0,gz|0),Math.max(1,Math.min(8,Math.round(level))));
        this._markNeighborhoodDirty(gx|0,gy|0,gz|0);
      }
    }
    this.version++;this.needsSettle=true;this.settleAll();
  }
  stats(){
    return {
      cells:this.cells.size,totalLayers:this.totalLayers(),levels:8,
      layerHeight:this.terrain.tileSize/8,dirtyChunks:this.dirtyChunks.size,
      version:this.version,needsSettle:this.needsSettle,
      flowModel:'priority-flood-global-hydrostatic-settle-v1',
      flowPlane:'full-x-z-with-y-gravity',threeDimensional:true,
      exactHydrostatic:true,lastSettle:this.lastSettle
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
