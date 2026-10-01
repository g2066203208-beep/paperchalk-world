export class TerrainQuery{
  constructor(columns,cellSize=1){
    this.cellSize=cellSize;
    this.heights=new Map();
    let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(const c of columns){
      this.heights.set(this.key(c.x,c.z),c.h);
      minX=Math.min(minX,c.x);maxX=Math.max(maxX,c.x);
      minZ=Math.min(minZ,c.z);maxZ=Math.max(maxZ,c.z);
    }
    this.bounds={minX,maxX,minZ,maxZ};
  }
  key(x,z){return x+','+z}
  columnAt(x,z){
    const gx=Math.round(x/this.cellSize),gz=Math.round(z/this.cellSize);
    const h=this.heights.get(this.key(gx,gz));
    return Number.isFinite(h)?{x:gx,z:gz,h}:null;
  }
  surfaceY(x,z){
    const c=this.columnAt(x,z);
    return c?c.h*this.cellSize+this.cellSize*.5:null;
  }
  clamp(x,z,pad=.56){
    const b=this.bounds,s=this.cellSize;
    return{
      x:Math.max(b.minX*s+pad,Math.min(b.maxX*s-pad,x)),
      z:Math.max(b.minZ*s+pad,Math.min(b.maxZ*s-pad,z))
    };
  }
  stats(){return{columns:this.heights.size,bounds:{...this.bounds},cellSize:this.cellSize}}
}
