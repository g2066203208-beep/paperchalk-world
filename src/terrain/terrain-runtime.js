/* Paperchalk single-layer Terraria-style terrain runtime.
 * Gameplay is 2D (X/Y). Z is reserved for paper-stage depth only.
 */
(function(global){
'use strict';

const TILE=Object.freeze({
  AIR:0,
  GRASS:1,
  DIRT:2,
  STONE:3,
  SAND:4,
  CLAY:5
});
const SOLID=new Set([TILE.GRASS,TILE.DIRT,TILE.STONE,TILE.SAND,TILE.CLAY]);

class TerrainChunk{
  constructor(world,cx,cy){
    this.world=world;
    this.cx=cx;
    this.cy=cy;
    this.size=world.chunkSize;
    this.tiles=new Uint8Array(this.size*this.size);
    this.version=1;
    this.dirty=true;
    this._generate();
  }
  index(lx,ly){return ly*this.size+lx}
  _generate(){
    const n=this.size;
    for(let ly=0;ly<n;ly++){
      for(let lx=0;lx<n;lx++){
        const gx=this.cx*n+lx;
        const gy=this.cy*n+ly;
        this.tiles[this.index(lx,ly)]=this.world.generateTile(gx,gy);
      }
    }
  }
  get(lx,ly){return this.tiles[this.index(lx,ly)]}
  set(lx,ly,value){
    const i=this.index(lx,ly);
    if(this.tiles[i]===value)return false;
    this.tiles[i]=value;
    this.version++;
    this.dirty=true;
    return true;
  }
}

class TerrainWorld{
  constructor({tileSize=.25,chunkSize=64,seed=24681357}={}){
    this.tileSize=tileSize;
    this.chunkSize=chunkSize;
    this.seed=seed|0;
    this.chunks=new Map();
    this.edits=new Map();
    this.listeners=new Set();
    this.changeVersion=0;
  }
  _hash(x,y=0){
    let h=(Math.imul((x|0)^this.seed,0x45d9f3b)+Math.imul((y|0)^0x9e3779b9,0x119de1f3))|0;
    h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;
    return (h>>>0)/4294967295;
  }
  surfaceCell(gx){
    const broad=Math.sin((gx+this.seed*.001)*.035)*5.2;
    const medium=Math.sin((gx-this.seed*.0007)*.11)*2.0;
    const detail=(this._hash(gx,17)-.5)*1.8;
    return Math.floor(broad+medium+detail);
  }
  generateTile(gx,gy){
    const surface=this.surfaceCell(gx);
    if(gy>surface)return TILE.AIR;
    const depth=surface-gy;
    if(depth>10){
      const a=Math.sin((gx+this.seed*.003)*.19)+Math.cos((gy-this.seed*.002)*.23);
      const b=Math.sin((gx+gy)*.071+this.seed*.0001);
      if(depth<150&&a+b*.72>1.63)return TILE.AIR;
    }
    if(depth===0)return TILE.GRASS;
    if(depth<8)return TILE.DIRT;
    if(depth<14&&this._hash(gx>>2,gy>>2)>.87)return TILE.CLAY;
    if(depth<18&&this._hash(gx>>3,gy>>3)>.91)return TILE.SAND;
    return TILE.STONE;
  }
  _floorDiv(n,d){return Math.floor(n/d)}
  _mod(n,d){return ((n%d)+d)%d}
  chunkKey(cx,cy){return cx+','+cy}
  getChunk(cx,cy){
    const key=this.chunkKey(cx,cy);
    let chunk=this.chunks.get(key);
    if(!chunk){
      chunk=new TerrainChunk(this,cx,cy);
      const patch=this.edits.get(key);
      if(patch){for(const [index,value] of patch)chunk.tiles[index]=value}
      this.chunks.set(key,chunk);
    }
    return chunk;
  }
  getTile(gx,gy){
    const n=this.chunkSize;
    const cx=this._floorDiv(gx,n),cy=this._floorDiv(gy,n);
    return this.getChunk(cx,cy).get(this._mod(gx,n),this._mod(gy,n));
  }
  setTile(gx,gy,value){
    value=Number(value)|0;
    if(value<0||value>255)return false;
    const n=this.chunkSize;
    const cx=this._floorDiv(gx,n),cy=this._floorDiv(gy,n);
    const lx=this._mod(gx,n),ly=this._mod(gy,n);
    const chunk=this.getChunk(cx,cy);
    if(!chunk.set(lx,ly,value))return false;
    const key=this.chunkKey(cx,cy);
    let patch=this.edits.get(key);
    if(!patch){patch=new Map();this.edits.set(key,patch)}
    const index=chunk.index(lx,ly);
    const generated=this.generateTile(gx,gy);
    if(value===generated)patch.delete(index);else patch.set(index,value);
    if(patch.size===0)this.edits.delete(key);
    this.changeVersion++;
    const event={gx,gy,value,cx,cy,version:this.changeVersion};
    for(const listener of this.listeners)listener(event);
    return true;
  }
  isSolidTile(tile){return SOLID.has(tile)}
  isSolid(gx,gy){return this.isSolidTile(this.getTile(gx,gy))}
  worldToCell(x,y){return {gx:Math.floor(x/this.tileSize),gy:Math.floor(y/this.tileSize)}}
  cellCenter(gx,gy){return {x:(gx+.5)*this.tileSize,y:(gy+.5)*this.tileSize}}
  digWorld(x,y){
    const {gx,gy}=this.worldToCell(x,y);
    const previous=this.getTile(gx,gy);
    if(previous===TILE.AIR)return {changed:false,gx,gy,previous};
    this.setTile(gx,gy,TILE.AIR);
    return {changed:true,gx,gy,previous,value:TILE.AIR};
  }
  placeWorld(x,y,tile=TILE.DIRT){
    const {gx,gy}=this.worldToCell(x,y);
    const previous=this.getTile(gx,gy);
    if(previous!==TILE.AIR)return {changed:false,gx,gy,previous};
    this.setTile(gx,gy,tile);
    return {changed:true,gx,gy,previous,value:tile};
  }
  collidesAABB(x,y,halfW,halfH){
    const s=this.tileSize;
    const minX=Math.floor((x-halfW+.001)/s);
    const maxX=Math.floor((x+halfW-.001)/s);
    const minY=Math.floor((y-halfH+.001)/s);
    const maxY=Math.floor((y+halfH-.001)/s);
    for(let gy=minY;gy<=maxY;gy++){
      for(let gx=minX;gx<=maxX;gx++){
        if(this.isSolid(gx,gy))return true;
      }
    }
    return false;
  }
  highestGroundY(worldX,{fromCell=64,toCell=-512}={}){
    const gx=Math.floor(worldX/this.tileSize);
    for(let gy=fromCell;gy>=toCell;gy--){
      if(this.isSolid(gx,gy))return (gy+1)*this.tileSize;
    }
    return toCell*this.tileSize;
  }
  subscribe(listener){
    if(typeof listener!=='function')return ()=>{};
    this.listeners.add(listener);
    return ()=>this.listeners.delete(listener);
  }
  exportEdits(){
    const out=[];
    for(const [key,patch] of this.edits){
      const [cx,cy]=key.split(',').map(Number);
      for(const [index,value] of patch)out.push([cx,cy,index,value]);
    }
    return out;
  }
  importEdits(rows){
    this.edits.clear();
    this.chunks.clear();
    for(const row of Array.isArray(rows)?rows:[]){
      if(!Array.isArray(row)||row.length<4)continue;
      const [cx,cy,index,value]=row.map(Number);
      if(![cx,cy,index,value].every(Number.isFinite))continue;
      const key=this.chunkKey(cx,cy);
      let patch=this.edits.get(key);
      if(!patch){patch=new Map();this.edits.set(key,patch)}
      patch.set(index|0,value|0);
    }
    this.changeVersion++;
    for(const listener of this.listeners)listener({reload:true,version:this.changeVersion});
  }
  stats(){
    let edits=0;for(const patch of this.edits.values())edits+=patch.size;
    return {tileSize:this.tileSize,chunkSize:this.chunkSize,loadedChunks:this.chunks.size,editedTiles:edits,version:this.changeVersion};
  }
}

global.PaperchalkTerrainRuntime=Object.freeze({TILE,TerrainWorld,TerrainChunk});
})(window);
