/* Single-layer Terraria-style voxel terrain for Paperchalk World.
 * Gameplay coordinates are X/Y. Z thickness is visual-only and exactly one layer.
 */
(function(global){
'use strict';

const CONTENT=global.PaperchalkContent;
if(!CONTENT?.scene3d?.terrain)throw new Error('PAPERCHALK_TERRAIN_CONFIG_MISSING');

const MATERIALS=Object.freeze({
  AIR:0,
  GRASS:1,
  DIRT:2,
  STONE:3,
  ORE:4,
  CLAY:5
});
const MATERIAL_INFO=Object.freeze({
  0:{id:0,name:'air',solid:false,color:'#000000'},
  1:{id:1,name:'grass',solid:true,color:'#718652'},
  2:{id:2,name:'dirt',solid:true,color:'#88684f'},
  3:{id:3,name:'stone',solid:true,color:'#6d6e70'},
  4:{id:4,name:'ore',solid:true,color:'#8b7762'},
  5:{id:5,name:'clay',solid:true,color:'#9b735d'}
});

function floorDiv(n,d){return Math.floor(n/d)}
function mod(n,d){return ((n%d)+d)%d}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function hash32(x,y,seed){
  let h=(Math.imul(x|0,0x1f123bb5)^Math.imul(y|0,0x5f356495)^(seed|0))|0;
  h=Math.imul(h^(h>>>16),0x45d9f3b);
  h=Math.imul(h^(h>>>16),0x45d9f3b);
  return (h^(h>>>16))>>>0;
}
function rand01(x,y,seed){return hash32(x,y,seed)/4294967295}
function smooth(t){return t*t*(3-2*t)}
function valueNoise2(x,y,seed){
  const x0=Math.floor(x),y0=Math.floor(y),tx=smooth(x-x0),ty=smooth(y-y0);
  const a=rand01(x0,y0,seed),b=rand01(x0+1,y0,seed);
  const c=rand01(x0,y0+1,seed),d=rand01(x0+1,y0+1,seed);
  const ab=a+(b-a)*tx,cd=c+(d-c)*tx;
  return (ab+(cd-ab)*ty)*2-1;
}
function fbm(x,y,seed,octaves=4){
  let sum=0,amp=.5,freq=1,norm=0;
  for(let i=0;i<octaves;i++){
    sum+=valueNoise2(x*freq,y*freq,seed+i*1013)*amp;
    norm+=amp;amp*=.5;freq*=2;
  }
  return norm?sum/norm:0;
}

class TerrainWorld{
  constructor(config={}){
    this.tileSize=Number(config.tileSize)||.25;
    this.chunkSize=Math.max(16,Math.floor(Number(config.chunkSize)||64));
    this.depth=Number(config.depth)||.18;
    this.seed=(Number(config.seed)||1337)|0;
    this.activeRadiusX=Math.max(1,Math.floor(Number(config.activeRadiusX)||2));
    this.activeRadiusY=Math.max(1,Math.floor(Number(config.activeRadiusY)||2));
    this.deltas=new Map();
    this.chunkCache=new Map();
    this.listeners=new Set();
    this.revision=0;
  }

  key(tx,ty){return tx+','+ty}
  chunkKey(cx,cy){return cx+','+cy}
  tileToChunk(tx,ty){return {cx:floorDiv(tx,this.chunkSize),cy:floorDiv(ty,this.chunkSize)}}
  worldToTile(x,y){return {tx:Math.floor(x/this.tileSize),ty:Math.floor(y/this.tileSize)}}
  tileCenter(tx,ty){return {x:(tx+.5)*this.tileSize,y:(ty+.5)*this.tileSize}}
  tileBounds(tx,ty){
    const s=this.tileSize;
    return {minX:tx*s,minY:ty*s,maxX:(tx+1)*s,maxY:(ty+1)*s};
  }

  _surfaceTile(tx){
    const broad=fbm(tx*.018,0,this.seed+11,4)*5.0;
    const detail=fbm(tx*.052,8.3,this.seed+37,3)*2.0;
    return Math.floor(broad+detail);
  }

  _baseTile(tx,ty){
    const surface=this._surfaceTile(tx);
    if(ty>surface)return MATERIALS.AIR;
    const depth=surface-ty;

    // Keep a stable crust so the ground never turns into a floating cave roof.
    if(depth===0)return MATERIALS.GRASS;
    if(depth<=7)return MATERIALS.DIRT;

    // Underground cavities are 2D caves, matching the single-slice Terraria layout.
    if(depth>10){
      const caveA=fbm(tx*.055,ty*.055,this.seed+101,4);
      const caveB=Math.abs(fbm(tx*.10,ty*.08,this.seed+223,2));
      if(caveA>.38&&caveB<.42)return MATERIALS.AIR;
    }

    if(depth>16&&rand01(tx,ty,this.seed+509)>.965)return MATERIALS.ORE;
    if(depth>5&&depth<18&&fbm(tx*.12,ty*.09,this.seed+701,2)>.52)return MATERIALS.CLAY;
    return MATERIALS.STONE;
  }

  getTile(tx,ty){
    tx=Math.floor(tx);ty=Math.floor(ty);
    const key=this.key(tx,ty);
    return this.deltas.has(key)?this.deltas.get(key):this._baseTile(tx,ty);
  }

  isSolid(tx,ty){
    const info=MATERIAL_INFO[this.getTile(tx,ty)];
    return !!info?.solid;
  }

  getTileWorld(x,y){
    const {tx,ty}=this.worldToTile(x,y);
    return this.getTile(tx,ty);
  }

  isSolidWorld(x,y){
    const {tx,ty}=this.worldToTile(x,y);
    return this.isSolid(tx,ty);
  }

  setTile(tx,ty,material,{reason='edit'}={}){
    tx=Math.floor(tx);ty=Math.floor(ty);
    material=Math.max(0,Math.min(65535,Math.floor(Number(material)||0)));
    const key=this.key(tx,ty);
    const base=this._baseTile(tx,ty);
    if(material===base)this.deltas.delete(key);
    else this.deltas.set(key,material);

    const {cx,cy}=this.tileToChunk(tx,ty);
    this.chunkCache.delete(this.chunkKey(cx,cy));
    this.revision++;
    const change={tx,ty,material,cx,cy,reason,revision:this.revision};
    for(const fn of [...this.listeners])fn(change);
    global.dispatchEvent?.(new CustomEvent('paperchalk-terrain-changed',{detail:change}));
    return material;
  }

  breakTile(tx,ty){
    const previous=this.getTile(tx,ty);
    if(previous===MATERIALS.AIR)return false;
    this.setTile(tx,ty,MATERIALS.AIR,{reason:'break'});
    return previous;
  }

  placeTile(tx,ty,material=MATERIALS.DIRT){
    if(this.getTile(tx,ty)!==MATERIALS.AIR)return false;
    this.setTile(tx,ty,material,{reason:'place'});
    return true;
  }

  breakWorld(x,y){
    const {tx,ty}=this.worldToTile(x,y);
    return this.breakTile(tx,ty);
  }

  placeWorld(x,y,material=MATERIALS.DIRT){
    const {tx,ty}=this.worldToTile(x,y);
    return this.placeTile(tx,ty,material);
  }

  surfaceYAt(x){
    const tx=Math.floor(x/this.tileSize);
    return (this._surfaceTile(tx)+1)*this.tileSize;
  }

  aabbCollides(minX,minY,maxX,maxY){
    const eps=1e-6;
    const minTx=Math.floor((minX+eps)/this.tileSize);
    const maxTx=Math.floor((maxX-eps)/this.tileSize);
    const minTy=Math.floor((minY+eps)/this.tileSize);
    const maxTy=Math.floor((maxY-eps)/this.tileSize);
    for(let ty=minTy;ty<=maxTy;ty++){
      for(let tx=minTx;tx<=maxTx;tx++){
        if(this.isSolid(tx,ty))return true;
      }
    }
    return false;
  }

  firstSolidBelow(x,y,maxDistance=4){
    const tx=Math.floor(x/this.tileSize);
    const startTy=Math.floor((y-1e-6)/this.tileSize);
    const steps=Math.ceil(maxDistance/this.tileSize);
    for(let i=0;i<=steps;i++){
      const ty=startTy-i;
      if(this.isSolid(tx,ty))return (ty+1)*this.tileSize;
    }
    return null;
  }

  chunkData(cx,cy){
    cx=Math.floor(cx);cy=Math.floor(cy);
    const key=this.chunkKey(cx,cy);
    let data=this.chunkCache.get(key);
    if(data)return data;
    data=new Uint16Array(this.chunkSize*this.chunkSize);
    const startX=cx*this.chunkSize,startY=cy*this.chunkSize;
    for(let ly=0;ly<this.chunkSize;ly++){
      for(let lx=0;lx<this.chunkSize;lx++){
        data[ly*this.chunkSize+lx]=this.getTile(startX+lx,startY+ly);
      }
    }
    this.chunkCache.set(key,data);
    return data;
  }

  activeChunkKeys(x,y,rx=this.activeRadiusX,ry=this.activeRadiusY){
    const {tx,ty}=this.worldToTile(x,y);
    const {cx,cy}=this.tileToChunk(tx,ty);
    const out=[];
    for(let yy=cy-ry;yy<=cy+ry;yy++){
      for(let xx=cx-rx;xx<=cx+rx;xx++)out.push(this.chunkKey(xx,yy));
    }
    return out;
  }

  exportDeltas(){
    const out=[];
    for(const [key,material] of this.deltas){
      const comma=key.indexOf(',');
      out.push([Number(key.slice(0,comma)),Number(key.slice(comma+1)),material]);
    }
    return out;
  }

  importDeltas(rows,{replace=true,emit=true}={}){
    if(replace)this.deltas.clear();
    if(Array.isArray(rows)){
      for(const row of rows){
        if(!Array.isArray(row)||row.length<3)continue;
        const tx=Math.floor(Number(row[0])),ty=Math.floor(Number(row[1])),material=Math.floor(Number(row[2]));
        if(Number.isFinite(tx)&&Number.isFinite(ty)&&Number.isFinite(material))this.deltas.set(this.key(tx,ty),clamp(material,0,65535));
      }
    }
    this.chunkCache.clear();
    this.revision++;
    if(emit){
      const change={reason:'import',revision:this.revision,all:true};
      for(const fn of [...this.listeners])fn(change);
      global.dispatchEvent?.(new CustomEvent('paperchalk-terrain-changed',{detail:change}));
    }
    return this.deltas.size;
  }

  reset(){
    this.deltas.clear();
    this.chunkCache.clear();
    this.revision++;
    const change={reason:'reset',revision:this.revision,all:true};
    for(const fn of [...this.listeners])fn(change);
    global.dispatchEvent?.(new CustomEvent('paperchalk-terrain-changed',{detail:change}));
  }

  subscribe(listener){
    if(typeof listener!=='function')throw new TypeError('terrain listener must be a function');
    this.listeners.add(listener);
    return ()=>this.listeners.delete(listener);
  }

  stats(){
    return {
      tileSize:this.tileSize,
      chunkSize:this.chunkSize,
      layerDepth:this.depth,
      seed:this.seed,
      deltas:this.deltas.size,
      revision:this.revision
    };
  }
}

const terrain=new TerrainWorld(CONTENT.scene3d.terrain);
global.PaperchalkTerrainTypes=Object.freeze({MATERIALS,MATERIAL_INFO});
global.PaperchalkTerrain=terrain;
global.PaperchalkTerrainWorld=TerrainWorld;
})(window);
