/* Paperchalk sparse dynamic water runtime.
 * Disconnected bodies settle independently; ocean water stays analytic in TerrainWorld.
 */
(function(global){
'use strict';

class WaterWorld{
  constructor(terrain){
    this.terrain=terrain;
    this.cells=new Map();
    this.dirtyChunks=new Set();
    this.surfaceCache=new Map();
    this.boundsCache=new Map();
    this.columnIndex=new Map();
    this.version=0;
this.tick=0;
this.levels=8;
    this.needsSettle=false;
    this.lastSettle={bodies:0,columns:0,layers:0,heapPops:0};
    this.horizontalDirs=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]];
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
  _indexAdd(gx,gz,key){
    const ck=this.columnKey(gx,gz);let set=this.columnIndex.get(ck);
    if(!set){set=new Set();this.columnIndex.set(ck,set)}
    set.add(key);
  }
  _indexDelete(gx,gz,key){
    const ck=this.columnKey(gx,gz),set=this.columnIndex.get(ck);
    if(!set)return;
    set.delete(key);if(!set.size)this.columnIndex.delete(ck);
  }
  _rebuildColumnIndex(){
    this.columnIndex.clear();
    for(const key of this.cells.keys()){const [gx,,gz]=this.parse(key);this._indexAdd(gx,gz,key)}
  }
  consumeDirtyChunks(){const out=[...this.dirtyChunks];this.dirtyChunks.clear();return out}
  _terrainBlocksWater(gx,gy,gz){
    return this.terrain.isSolidPeek(gx,gy,gz);
  }
  _canOccupy(gx,gy,gz){return !this._terrainBlocksWater(gx,gy,gz)}
  _writeLevel(gx,gy,gz,level){
    level=Math.max(0,Math.min(8,Math.round(Number(level)||0)));
    const key=this.key(gx,gy,gz),prev=this.cells.get(key)||0;
    if(prev===level)return false;
    if(level<=0){
      this.cells.delete(key);
      if(prev>0)this._indexDelete(gx,gz,key);
    }else{
      this.cells.set(key,level);
      if(prev<=0)this._indexAdd(gx,gz,key);
    }
    this.surfaceCache.delete(this.columnKey(gx,gz));
    this.boundsCache.delete(this.columnKey(gx,gz));
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
    if(added&&settle){this.requestSettleAround(gx,gy,gz)}
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
  _packRemainderToBoundary(states){
    const wet=[...states.values()].filter(st=>st.filled>0);
    if(wet.length<2)return {moved:0,minTop:wet[0]?wet[0].floor+wet[0].filled:0,maxTop:wet[0]?wet[0].floor+wet[0].filled:0};
    const top=st=>st.floor+st.filled;
    let minTop=Math.min(...wet.map(top)),maxTop=Math.max(...wet.map(top));
    if(maxTop-minTop!==1)return {moved:0,minTop,maxTop};
    const boundary=st=>{
      for(const [dx,,dz] of this.horizontalDirs){
        const n=states.get(this.columnKey(st.gx+dx,st.gz+dz));
        if(!n||n.filled<=0)return true;
      }
      return false;
    };
    const donors=wet.filter(st=>top(st)===maxTop&&!boundary(st));
    const receivers=wet.filter(st=>top(st)===minTop&&boundary(st));
    let moved=0,ri=0;
    for(const donor of donors){
      while(donor.filled>0&&top(donor)===maxTop&&ri<receivers.length){
        const rec=receivers[ri];
        if(top(rec)!==minTop){ri++;continue}
        const abs=rec.floor+rec.filled,gy=Math.floor(abs/8);
        if(!this._canOccupy(rec.gx,gy,rec.gz)){ri++;continue}
        donor.filled--;rec.filled++;moved++;
        ri++;
      }
      if(ri>=receivers.length)break;
    }
    minTop=Math.min(...wet.filter(st=>st.filled>0).map(top));
    maxTop=Math.max(...wet.filter(st=>st.filled>0).map(top));
    return {moved,minTop,maxTop};
  }
  _surfaceAuditFromStates(states){
    const wet=[...states.values()].filter(st=>st.filled>0);
    if(!wet.length)return {wetColumns:0,minTop:0,maxTop:0,spreadLayers:0,interiorSpreadLayers:0,boundaryColumns:0};
    const top=st=>st.floor+st.filled;
    const isBoundary=st=>this.horizontalDirs.some(([dx,,dz])=>{
      const n=states.get(this.columnKey(st.gx+dx,st.gz+dz));return !n||n.filled<=0;
    });
    const boundary=wet.filter(isBoundary),interior=wet.filter(st=>!isBoundary(st));
    const minTop=Math.min(...wet.map(top)),maxTop=Math.max(...wet.map(top));
    let interiorSpreadLayers=0;
    if(interior.length>1){
      const a=interior.map(top);interiorSpreadLayers=Math.max(...a)-Math.min(...a);
    }
    return {wetColumns:wet.length,minTop,maxTop,spreadLayers:maxTop-minTop,interiorSpreadLayers,boundaryColumns:boundary.length};
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
    };    for(const [ck,near] of seeds){      const [gx,gz]=this.parseColumn(ck);activate(gx,gz,near,true);
    }

    let placed=0,safety=Math.max(4096,total*40);
    while(placed<total&&heap.length&&safety-->0){
      const popped=this._heapPop(heap);heapPops++;
      if(!popped)break;
      const [height,ck]=popped,state=states.get(ck);
      if(!state||height!==state.next)continue;
      const gy=Math.floor(height/8);
      if(!this._canOccupy(state.gx,gy,state.gz)){
        state.next=Infinity;continue;
      }

      state.filled++;placed++;
      const topHeight=height+1;
      state.next=state.floor+state.filled;
      this._heapPush(heap,[state.next,ck]);
      for(const [dx,,dz] of this.horizontalDirs){
        const nx=state.gx+dx,nz=state.gz+dz,nck=this.columnKey(nx,nz);
        if(states.has(nck)||(!seeds.has(nck)&&blockedColumns?.has(nck)))continue;
        const floor=this._columnFloorUnits(nx,nz,height);
        if(floor<=topHeight)activate(nx,nz,height,seeds.has(nck));
      }
    }
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
    const edgePack=this._packRemainderToBoundary(states);
    const surfaceAudit=this._surfaceAuditFromStates(states);

    const out=new Map();
    for(const state of states.values()){
      for(let i=0;i<state.filled;i++){
        const abs=state.floor+i,gy=Math.floor(abs/8),layer=(abs-gy*8)+1;
        const key=this.key(state.gx,gy,state.gz);
        if(layer>(out.get(key)||0))out.set(key,layer);
      }
    }
    return {cells:out,columns:states.size,layers:placed,heapPops,edgePackedLayers:edgePack.moved,surfaceAudit};
  }
  _connectedBodies(source){
    const bodies=[],unvisited=new Set(source.keys());
    const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    while(unvisited.size){
      const first=unvisited.values().next().value,queue=[first],entries=[];
      unvisited.delete(first);
      for(let qi=0;qi<queue.length;qi++){
        const key=queue[qi],level=source.get(key)||0;if(!level)continue;
        entries.push([key,level]);
        const [gx,gy,gz]=this.parse(key);
        for(const [dx,dy,dz] of dirs){
          const nk=this.key(gx+dx,gy+dy,gz+dz);
          if(unvisited.has(nk)){unvisited.delete(nk);queue.push(nk)}
        }
      }
      if(entries.length)bodies.push(entries);
    }
    return bodies;
  }
  settleAll(){
    if(!this.needsSettle)return {changed:false,...this.lastSettle};
    this.needsSettle=false;
    if(!this.cells.size){
      this.lastSettle={bodies:0,columns:0,layers:0,heapPops:0,beforeLayers:0,afterLayers:0,conserved:true};
      return {changed:false,...this.lastSettle,exactHydrostatic:true};
    }

    const before=new Map(this.cells);
    const beforeLayers=[...before.values()].reduce((sum,v)=>sum+v,0);
    const bodies=this._connectedBodies(before),next=new Map();
    const bodyColumns=bodies.map(body=>{
      const set=new Set();
      for(const [key] of body){const [gx,,gz]=this.parse(key);set.add(this.columnKey(gx,gz))}
      return set;
    });
    let columns=0,layers=0,heapPops=0,edgePackedLayers=0;
    const audits=[];

    for(let i=0;i<bodies.length;i++){
      const blocked=new Set();
      for(let j=0;j<bodyColumns.length;j++)if(j!==i)for(const ck of bodyColumns[j])blocked.add(ck);
      const settled=this._settleBody(bodies[i],blocked);
      columns+=settled.columns;layers+=settled.layers;heapPops+=settled.heapPops;
      edgePackedLayers+=settled.edgePackedLayers||0;
      if(settled.surfaceAudit)audits.push(settled.surfaceAudit);
      for(const [key,level] of settled.cells){
        if(!next.has(key))next.set(key,level);
        else next.set(key,Math.max(next.get(key),level));
      }
    }

    const afterLayers=[...next.values()].reduce((sum,v)=>sum+v,0);
    if(afterLayers!==beforeLayers){
      this.cells=before;this._rebuildColumnIndex();this.needsSettle=true;
      this.lastSettle={bodies:bodies.length,columns,layers,heapPops,edgePackedLayers,surfaceAudit:audits,beforeLayers,afterLayers:beforeLayers,conserved:false,rollback:true};
      return {changed:false,...this.lastSettle,totalLayers:beforeLayers,exactHydrostatic:false};
    }

    let changed=before.size!==next.size;
    const keys=new Set([...before.keys(),...next.keys()]);
    this.cells=next;this._rebuildColumnIndex();this.surfaceCache.clear();this.boundsCache.clear();
    for(const key of keys){
      const old=before.get(key)||0,now=next.get(key)||0;
      if(old!==now){
        changed=true;
        const [gx,gy,gz]=this.parse(key);this._markNeighborhoodDirty(gx,gy,gz);
      }
    }
    if(changed)this.version++;
    this.tick++;
    this.lastSettle={bodies:bodies.length,columns,layers,heapPops,edgePackedLayers,surfaceAudit:audits,beforeLayers,afterLayers,conserved:true,rollback:false};
    return {changed,...this.lastSettle,totalLayers:afterLayers,exactHydrostatic:true};
  }
  step(){
    return this.settleAll();
  }
  totalLayers(){let n=0;for(const level of this.cells.values())n+=level;return n}
  highestSurfaceY(gx,gz){
    const ck=this.columnKey(gx,gz),cached=this.surfaceCache.get(ck);
    if(cached!==undefined)return cached;
    let top=-Infinity;
    const keys=this.columnIndex.get(ck);
    if(keys)for(const key of keys){
      const level=this.cells.get(key)||0;if(!level)continue;
      const [,gy]=this.parse(key);
      top=Math.max(top,gy*this.terrain.tileSize+(level/8)*this.terrain.tileSize);
    }
    this.surfaceCache.set(ck,top);
    return top;
  }
  surfaceAtWorld(x,z){
    const s=this.terrain.tileSize;
    const gx=Math.floor(x/s),gz=Math.floor(z/s+.5);
    const y=this.highestSurfaceY(gx,gz);
    if(Number.isFinite(y))return {gx,gz,y,levelColumn:true,analyticOcean:false};
    const ocean=this.terrain.oceanBoundsForColumn?.(gx,gz);
    return ocean?{gx,gz,y:ocean.top,levelColumn:false,analyticOcean:true}:null;
  }
  columnBounds(gx,gz){
    const ck=this.columnKey(gx,gz),cached=this.boundsCache.get(ck);
    if(cached!==undefined)return cached;
    let bottom=Infinity,top=-Infinity,cells=0,layers=0;
    const s=this.terrain.tileSize,keys=this.columnIndex.get(ck);
    if(keys)for(const key of keys){
      const level=this.cells.get(key)||0;if(!level)continue;
      const [,gy]=this.parse(key);
      cells++;layers+=level;
      bottom=Math.min(bottom,gy*s);
      top=Math.max(top,gy*s+(level/8)*s);
    }
    const dynamic=Number.isFinite(top)?{gx,gz,bottom,top,depth:Math.max(0,top-bottom),cells,layers,analyticOcean:false}:null;
    const ocean=this.terrain.oceanBoundsForColumn?.(gx,gz)||null;
    let out=dynamic;
    if(ocean&&dynamic){
      out={gx,gz,bottom:Math.min(ocean.bottom,dynamic.bottom),top:Math.max(ocean.top,dynamic.top),
        depth:Math.max(ocean.top,dynamic.top)-Math.min(ocean.bottom,dynamic.bottom),
        cells:dynamic.cells,layers:dynamic.layers,analyticOcean:true};
    }else if(ocean)out=ocean;
    this.boundsCache.set(ck,out);
    return out;
  }
  boundsAtWorld(x,z){
    const s=this.terrain.tileSize,gx=Math.floor(x/s),gz=Math.floor(z/s+.5);
    return this.columnBounds(gx,gz);
  }
  containsPoint(x,y,z,margin=.04){
    const b=this.boundsAtWorld(x,z);
    return !!b&&y>=b.bottom+margin&&y<=b.top-margin;
  }
  submersionAABB(x,y,z,halfW,halfH,halfD){
    const s=this.terrain.tileSize;
    const minX=x-halfW,maxX=x+halfW,minY=y-halfH,maxY=y+halfH,minZ=z-halfD,maxZ=z+halfD;
    const gx0=Math.floor(minX/s),gx1=Math.floor((maxX-.0001)/s);
    const gy0=Math.floor(minY/s),gy1=Math.floor((maxY-.0001)/s);
    const gz0=Math.floor(minZ/s+.5),gz1=Math.floor((maxZ-.0001)/s+.5);
    let overlap=0;
    for(let gz=gz0;gz<=gz1;gz++)for(let gx=gx0;gx<=gx1;gx++){
      const wx0=gx*s,wx1=(gx+1)*s,wz0=gz*s-s*.5,wz1=gz*s+s*.5;
      const ox=Math.max(0,Math.min(maxX,wx1)-Math.max(minX,wx0));
      const oz=Math.max(0,Math.min(maxZ,wz1)-Math.max(minZ,wz0));
      if(ox<=0||oz<=0)continue;

      // Dynamic cells stay sparse. Ocean water is analytic and contributes no cells.
      for(let gy=gy0;gy<=gy1;gy++){
        const level=this.getLevel(gx,gy,gz);if(!level)continue;
        const wy0=gy*s,wy1=gy*s+(level/8)*s;
        const oy=Math.max(0,Math.min(maxY,wy1)-Math.max(minY,wy0));
        overlap+=ox*oy*oz;
      }
      const ocean=this.terrain.oceanBoundsForColumn?.(gx,gz);
      if(ocean){
        const oy=Math.max(0,Math.min(maxY,ocean.top)-Math.max(minY,ocean.bottom));
        if(oy>0)overlap+=ox*oy*oz;
      }
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
    this.cells.clear();this.columnIndex.clear();this.dirtyChunks.clear();this.surfaceCache.clear();this.boundsCache.clear();
    for(const row of Array.isArray(rows)?rows:[]){
      if(!Array.isArray(row)||row.length<4)continue;
      const [gx,gy,gz,level]=row.map(Number);
      if(![gx,gy,gz,level].every(Number.isFinite))continue;
      if(level>0&&this._canOccupy(gx|0,gy|0,gz|0)){
        const key=this.key(gx|0,gy|0,gz|0);
        this.cells.set(key,Math.max(1,Math.min(8,Math.round(level))));
        this._indexAdd(gx|0,gz|0,key);
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
      flowModel:'connected-body-priority-flood-v5',
      flowPlane:'full-x-z-with-y-gravity',threeDimensional:true,
      exactHydrostatic:true,lastSettle:this.lastSettle
    };
  }
}

global.PaperchalkWaterRuntime=Object.freeze({WaterWorld});
})(window);
