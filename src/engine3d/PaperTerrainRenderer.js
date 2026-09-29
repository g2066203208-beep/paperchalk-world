/* Phase 1 visual-only paper terrain.
 * Gameplay voxels remain authoritative; this renderer hides the render grid by
 * merging coplanar surface cells into large slabs and emitting only real paper
 * boundaries (top / bevel / cardboard side).
 */
const TOP_COLORS=Object.freeze({
  1:0x6f8d58, // grass paper
  2:0x9b7656, // earth paper
  3:0x8b8984, // stone paper
  4:0xd4b77a, // sand paper
  5:0xa87b68  // clay paper
});
const SIDE_COLORS=Object.freeze({
  1:0x765435,
  2:0x684730,
  3:0x66605a,
  4:0x8d603b,
  5:0x744b3c
});

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function near(a,b,e=.0001){return Math.abs(a-b)<=e}

function addQuad(data,a,b,c,d,normal,color,group){
  const base=data.positions.length/3;
  for(const p of [a,b,c,d]){
    data.positions.push(p[0],p[1],p[2]);
    data.normals.push(normal[0],normal[1],normal[2]);
    data.colors.push(color.r,color.g,color.b);
  }
  data.indices[group].push(base,base+1,base+2,base,base+2,base+3);
}

export class PaperTerrainRenderer{
  constructor(THREE,terrain,scene,settings={}){
    this.THREE=THREE;this.terrain=terrain;this.scene=scene;
    this.settings={
      enabled:true,
      chunkCells:terrain.chunkSize||16,
      radiusXZ:settings.radiusXZ??3,
      maxBuildsPerFrame:settings.maxBuildsPerFrame??2,
      paperLayerHeight:settings.paperLayerHeight??.5,
      paperThickness:settings.paperThickness??.30,
      bevelWidth:settings.bevelWidth??.045,
      bevelHeight:settings.bevelHeight??.055,
      fiberStrength:settings.fiberStrength??.035,
      printNoiseStrength:settings.printNoiseStrength??.025,
      sideDarkness:settings.sideDarkness??.72,
      ...settings
    };
    this.root=new THREE.Group();
    this.root.name='paper-terrain-visual-root';
    scene.add(this.root);
    this.meshes=new Map();this.visibleKeys=new Set();this.dirty=new Set();
    this.lastBuildMs=0;this.totalRebuilds=0;
    this.materials=this._createMaterials();
    this.unsubscribe=terrain.subscribe(event=>this._onTerrainChanged(event));
  }

  _makePaperMaterial({side=false,bevel=false}={}){
    const THREE=this.THREE;
    const mat=new THREE.MeshStandardMaterial({
      vertexColors:true,
      roughness:side?.98:.94,
      metalness:0,
      side:THREE.DoubleSide,
      flatShading:!!side
    });
    const fiber=Number(this.settings.fiberStrength)||0;
    const print=Number(this.settings.printNoiseStrength)||0;
    mat.onBeforeCompile=shader=>{
      shader.uniforms.uPaperFiber={value:fiber};
      shader.uniforms.uPaperPrint={value:print};
      shader.uniforms.uPaperSide={value:side?1:0};
      shader.uniforms.uPaperBevel={value:bevel?1:0};
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nvarying vec3 vPaperWorldPos;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvPaperWorldPos=(modelMatrix*vec4(position,1.0)).xyz;');
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>',`#include <common>
          varying vec3 vPaperWorldPos;
          uniform float uPaperFiber;
          uniform float uPaperPrint;
          uniform float uPaperSide;
          uniform float uPaperBevel;
          float paperHash(vec2 p){
            p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);
            return fract(p.x*p.y);
          }`)
        .replace('#include <color_fragment>',`#include <color_fragment>
          float broad=paperHash(floor(vPaperWorldPos.xz*2.0))-.5;
          float grain=paperHash(floor(vPaperWorldPos.xz*42.0)+floor(vPaperWorldPos.xy*7.0))-.5;
          float fiberLine=sin((vPaperWorldPos.x*73.0+vPaperWorldPos.z*31.0)+grain*5.0);
          float paperVar=1.0+broad*uPaperPrint+grain*uPaperFiber*.55+fiberLine*uPaperFiber*.18;
          diffuseColor.rgb*=paperVar;
          if(uPaperSide>.5)diffuseColor.rgb*=.96;
          if(uPaperBevel>.5)diffuseColor.rgb*=1.035;`);
    };
    mat.customProgramCacheKey=()=>`paper-terrain-v1-${side?1:0}-${bevel?1:0}`;
    return mat;
  }
  _createMaterials(){
    return [
      this._makePaperMaterial({side:false,bevel:false}),
      this._makePaperMaterial({side:true,bevel:false}),
      this._makePaperMaterial({side:false,bevel:true})
    ];
  }

  _key(cx,cz){return cx+','+cz}
  _parseKey(key){return key.split(',').map(Number)}
  _mark(cx,cz){this.dirty.add(this._key(cx,cz))}
  _onTerrainChanged(event){
    if(event?.reload){
      for(const key of this.visibleKeys)this.dirty.add(key);
      return;
    }
    if(!Number.isFinite(event?.gx)||!Number.isFinite(event?.gz))return;
    const n=this.settings.chunkCells,cx=Math.floor(event.gx/n),cz=Math.floor(event.gz/n);
    this._mark(cx,cz);
    if(((event.gx%n)+n)%n===0)this._mark(cx-1,cz);
    if(((event.gx%n)+n)%n===n-1)this._mark(cx+1,cz);
    if(((event.gz%n)+n)%n===0)this._mark(cx,cz-1);
    if(((event.gz%n)+n)%n===n-1)this._mark(cx,cz+1);
  }

  _columnTop(gx,gz){
    const terrain=this.terrain,s=terrain.tileSize;
    const generated=terrain.surfaceCell(gx,gz);
    const from=generated+8,to=generated-28;
    for(let gy=from;gy>=to;gy--){
      const tile=terrain.peekVoxel(gx,gy,gz);
      if(terrain.isSolidTile(tile)){
        const raw=(gy+1)*s;
        const q=Math.max(.05,Number(this.settings.paperLayerHeight)||.5);
        const y=Math.round(raw/q)*q;
        return {y,gy,tile};
      }
    }
    return {y:(generated+1)*s,gy:generated,tile:terrain.surfaceTile(gx,gz)};
  }

  _topColor(tile){
    return new this.THREE.Color(TOP_COLORS[tile]??TOP_COLORS[3]);
  }
  _sideColor(tile){
    const c=new this.THREE.Color(SIDE_COLORS[tile]??SIDE_COLORS[3]);
    c.multiplyScalar(clamp(Number(this.settings.sideDarkness)||.72,.25,1));
    return c;
  }

  _buildChunk(cx,cz){
    const t0=performance.now();
    const THREE=this.THREE,n=this.settings.chunkCells,s=this.terrain.tileSize;
    const cells=new Array(n*n);
    const getLocal=(x,z)=>cells[z*n+x];
    for(let z=0;z<n;z++)for(let x=0;x<n;x++){
      cells[z*n+x]=this._columnTop(cx*n+x,cz*n+z);
    }

    const data={positions:[],normals:[],colors:[],indices:[[],[],[]],topRects:0,sideQuads:0,bevelQuads:0};
    const used=new Uint8Array(n*n);

    // Greedy merged top surfaces: render-grid cell borders disappear.
    for(let z=0;z<n;z++)for(let x=0;x<n;x++){
      const idx=z*n+x;if(used[idx])continue;
      const cell=getLocal(x,z);if(!cell)continue;
      let w=1;
      while(x+w<n){
        const c=getLocal(x+w,z);
        if(used[z*n+x+w]||!c||c.tile!==cell.tile||!near(c.y,cell.y))break;
        w++;
      }
      let h=1;
      outer:while(z+h<n){
        for(let xx=0;xx<w;xx++){
          const c=getLocal(x+xx,z+h);
          if(used[(z+h)*n+x+xx]||!c||c.tile!==cell.tile||!near(c.y,cell.y))break outer;
        }
        h++;
      }
      for(let zz=0;zz<h;zz++)for(let xx=0;xx<w;xx++)used[(z+zz)*n+x+xx]=1;
      const x0=x*s,x1=(x+w)*s,z0=z*s,z1=(z+h)*s,y=cell.y;
      addQuad(data,[x0,y,z0],[x0,y,z1],[x1,y,z1],[x1,y,z0],[0,1,0],this._topColor(cell.tile),0);
      data.topRects++;
    }

    const bw=clamp(Number(this.settings.bevelWidth)||.045,.005,.15)*s;
    const bh=clamp(Number(this.settings.bevelHeight)||.055,.005,.18)*s;
    const minDrop=Math.max(.02,Number(this.settings.paperThickness)||.3)*s;

    const neighbor=(gx,gz)=>this._columnTop(gx,gz);
    const emitEdge=(cell,x,z,dir)=>{
      const gx=cx*n+x,gz=cz*n+z;
      const nx=gx+dir[0],nz=gz+dir[1],other=neighbor(nx,nz);
      if(other&&other.y>=cell.y-.0001)return;
      const yTop=cell.y;
      const yBottom=Math.min(yTop-minDrop,other?.y??(yTop-minDrop));
      const yBevel=Math.max(yBottom,yTop-bh);
      const topColor=this._topColor(cell.tile),sideColor=this._sideColor(cell.tile);
      let a,b,c,d,ba,bb,bc,bd,nrm;
      if(dir[0]===1){
        const xx=(x+1)*s,z0=z*s,z1=(z+1)*s;nrm=[1,0,0];
        a=[xx,yTop,z0];b=[xx,yTop,z1];c=[xx-bw,yBevel,z1];d=[xx-bw,yBevel,z0];
        ba=[xx-bw,yBevel,z0];bb=[xx-bw,yBevel,z1];bc=[xx-bw,yBottom,z1];bd=[xx-bw,yBottom,z0];
      }else if(dir[0]===-1){
        const xx=x*s,z0=z*s,z1=(z+1)*s;nrm=[-1,0,0];
        a=[xx,yTop,z1];b=[xx,yTop,z0];c=[xx+bw,yBevel,z0];d=[xx+bw,yBevel,z1];
        ba=[xx+bw,yBevel,z1];bb=[xx+bw,yBevel,z0];bc=[xx+bw,yBottom,z0];bd=[xx+bw,yBottom,z1];
      }else if(dir[1]===1){
        const zz=(z+1)*s,x0=x*s,x1=(x+1)*s;nrm=[0,0,1];
        a=[x1,yTop,zz];b=[x0,yTop,zz];c=[x0,yBevel,zz-bw];d=[x1,yBevel,zz-bw];
        ba=[x1,yBevel,zz-bw];bb=[x0,yBevel,zz-bw];bc=[x0,yBottom,zz-bw];bd=[x1,yBottom,zz-bw];
      }else{
        const zz=z*s,x0=x*s,x1=(x+1)*s;nrm=[0,0,-1];
        a=[x0,yTop,zz];b=[x1,yTop,zz];c=[x1,yBevel,zz+bw];d=[x0,yBevel,zz+bw];
        ba=[x0,yBevel,zz+bw];bb=[x1,yBevel,zz+bw];bc=[x1,yBottom,zz+bw];bd=[x0,yBottom,zz+bw];
      }
      addQuad(data,a,b,c,d,nrm,topColor,2);data.bevelQuads++;
      if(yBevel>yBottom+.001){
        addQuad(data,ba,bb,bc,bd,nrm,sideColor,1);data.sideQuads++;
      }
    };

    for(let z=0;z<n;z++)for(let x=0;x<n;x++){
      const cell=getLocal(x,z);if(!cell)continue;
      emitEdge(cell,x,z,[1,0]);emitEdge(cell,x,z,[-1,0]);emitEdge(cell,x,z,[0,1]);emitEdge(cell,x,z,[0,-1]);
    }

    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
    const all=[],groups=[];
    for(let g=0;g<3;g++){
      const start=all.length;all.push(...data.indices[g]);
      if(data.indices[g].length)groups.push({start,count:data.indices[g].length,materialIndex:g});
    }
    geometry.setIndex(new THREE.Uint32BufferAttribute(all,1));
    geometry.clearGroups();for(const g of groups)geometry.addGroup(g.start,g.count,g.materialIndex);
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    geometry.userData={
      mode:'paper-diorama-slab-v1',
      topRects:data.topRects,sideQuads:data.sideQuads,bevelQuads:data.bevelQuads,
      vertices:data.positions.length/3,triangles:all.length/3,
      gameplayGridHidden:true,realThickness:true,topSideMaterialSplit:true,
      paperLayerHeight:this.settings.paperLayerHeight,paperThickness:this.settings.paperThickness,
      bevelWidth:this.settings.bevelWidth
    };
    const mesh=new THREE.Mesh(geometry,this.materials);
    mesh.name='paper-terrain-chunk:'+cx+','+cz;
    mesh.position.set(cx*n*s,0,cz*n*s-s*.5);
    mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData={cx,cz,...geometry.userData};
    this.lastBuildMs=performance.now()-t0;this.totalRebuilds++;
    return mesh;
  }

  _ensure(cx,cz){
    const key=this._key(cx,cz);
    const old=this.meshes.get(key);
    if(old&&!this.dirty.has(key))return old;
    if(old){this.root.remove(old);old.geometry.dispose()}
    const mesh=this._buildChunk(cx,cz);
    this.meshes.set(key,mesh);this.root.add(mesh);this.dirty.delete(key);
    return mesh;
  }

  update(player){
    if(!this.settings.enabled||!player){this.root.visible=false;return}
    this.root.visible=true;
    const n=this.settings.chunkCells,s=this.terrain.tileSize,span=n*s;
    const ccx=Math.floor(player.x/span),ccz=Math.floor((player.z+s*.5)/span);
    const r=Math.max(1,this.settings.radiusXZ|0),next=new Set(),queue=[];
    for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
      const cx=ccx+dx,cz=ccz+dz,key=this._key(cx,cz);
      next.add(key);
      const mesh=this.meshes.get(key);
      if(!mesh||this.dirty.has(key))queue.push({cx,cz,d:dx*dx+dz*dz});
      else mesh.visible=true;
    }
    queue.sort((a,b)=>a.d-b.d);
    const budget=Math.max(1,this.settings.maxBuildsPerFrame|0);
    for(let i=0;i<Math.min(budget,queue.length);i++)this._ensure(queue[i].cx,queue[i].cz).visible=true;
    for(const [key,mesh] of [...this.meshes]){
      if(next.has(key))continue;
      this.root.remove(mesh);mesh.geometry.dispose();this.meshes.delete(key);this.dirty.delete(key);
    }
    this.visibleKeys=next;
  }

  setEnabled(enabled){this.settings.enabled=!!enabled;this.root.visible=this.settings.enabled;return this.settings.enabled}
  configure(patch={}){
    const rebuildKeys=[...this.visibleKeys];
    Object.assign(this.settings,patch||{});
    for(const key of rebuildKeys)this.dirty.add(key);
    return this.snapshot();
  }
  snapshot(){
    let vertices=0,triangles=0,topRects=0,sideQuads=0,bevelQuads=0,visible=0;
    for(const key of this.visibleKeys){
      const m=this.meshes.get(key);if(!m?.visible)continue;visible++;
      const u=m.geometry.userData||{};vertices+=u.vertices||0;triangles+=u.triangles||0;
      topRects+=u.topRects||0;sideQuads+=u.sideQuads||0;bevelQuads+=u.bevelQuads||0;
    }
    return {
      enabled:this.settings.enabled,mode:'visual-only-paper-diorama-v1',
      authority:'TerrainWorld-gameplay-grid-unchanged',
      visiblePaperChunks:visible,paperVertices:vertices,paperTriangles:triangles,
      topRects,sideQuads,bevelQuads,drawCalls:visible,
      paperRebuildMs:this.lastBuildMs,totalRebuilds:this.totalRebuilds,
      paperLayerHeight:this.settings.paperLayerHeight,paperThickness:this.settings.paperThickness,
      bevelWidth:this.settings.bevelWidth,fiberStrength:this.settings.fiberStrength,
      renderGridExposed:false
    };
  }
  dispose(){
    this.unsubscribe?.();
    for(const mesh of this.meshes.values()){this.root.remove(mesh);mesh.geometry.dispose()}
    this.meshes.clear();
    for(const m of this.materials)m.dispose();
    this.scene.remove(this.root);
  }
}
