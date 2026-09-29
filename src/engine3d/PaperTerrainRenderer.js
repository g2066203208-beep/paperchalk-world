import {createPaperMaterialSet} from './PaperMaterial.js?v=paper-r5';
/* Phase 1 visual-only paper terrain.
 * TerrainWorld remains the gameplay/collision authority. The render grid is
 * hidden by merged paper tops plus batched layered-cardboard edge geometry.
 */
const TOP_COLORS=Object.freeze({
  1:0x6f895c, // grass paper
  2:0xa17b5d, // earth paper
  3:0x95918a, // stone paper
  4:0xd4b275, // sand paper
  5:0xae7f69  // clay paper
});
const SIDE_COLORS=Object.freeze({
  1:0x8d5e40,
  2:0x8f6245,
  3:0x77716b,
  4:0x95613f,
  5:0x855947
});

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function near(a,b,e=.0001){return Math.abs(a-b)<=e}
function hash01(a,b,c=0){
  const v=Math.sin(a*12.9898+b*78.233+c*37.719)*43758.5453;
  return v-Math.floor(v);
}
function normalized(x,y,z){
  const m=Math.hypot(x,y,z)||1;return [x/m,y/m,z/m];
}
function pushVertex(data,p,normal,color){
  const off=data.worldOffset||[0,0,0],ax=Math.abs(normal[0]),ay=Math.abs(normal[1]),az=Math.abs(normal[2]);
  data.positions.push(p[0],p[1],p[2]);data.normals.push(normal[0],normal[1],normal[2]);data.colors.push(color.r,color.g,color.b);
  const wx=p[0]+off[0],wy=p[1]+off[1],wz=p[2]+off[2];
  if(ay>=ax&&ay>=az)data.uvs.push(wx*.72,wz*.72);
  else if(ax>=az)data.uvs.push(wz*.62,wy*.62);
  else data.uvs.push(wx*.62,wy*.62);
}
function addQuad(data,a,b,c,d,normal,color,group){
  const base=data.positions.length/3;
  for(const p of [a,b,c,d])pushVertex(data,p,normal,color);
  data.indices[group].push(base,base+1,base+2,base,base+2,base+3);
}
function triNormal(a,b,c){
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  return normalized(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx);
}
function addTri(data,a,b,c,color,group){
  const n=triNormal(a,b,c),base=data.positions.length/3;
  pushVertex(data,a,n,color);pushVertex(data,b,n,color);pushVertex(data,c,n,color);
  data.indices[group].push(base,base+1,base+2);
}

export class PaperTerrainRenderer{
  constructor(THREE,terrain,scene,settings={}){
    this.THREE=THREE;this.terrain=terrain;this.scene=scene;
    this.settings={
      enabled:true,
      chunkCells:terrain.chunkSize||16,
      radiusXZ:settings.radiusXZ??3,
      maxBuildsPerFrame:settings.maxBuildsPerFrame??2,
      paperLayerHeight:settings.paperLayerHeight??.50,
      paperThickness:settings.paperThickness??.30,
      bevelWidth:settings.bevelWidth??.045,
      bevelHeight:settings.bevelHeight??.055,
      fiberStrength:settings.fiberStrength??.050,
      printNoiseStrength:settings.printNoiseStrength??.065,
      microNormalStrength:settings.microNormalStrength??.34,
      roughnessVariation:settings.roughnessVariation??.035,
      sideDarkness:settings.sideDarkness??.92,
      edgeJitter:settings.edgeJitter??.038,
      edgeHeightJitter:settings.edgeHeightJitter??.010,
      edgeFacetCenterJitter:settings.edgeFacetCenterJitter??.006,
      ...settings
    };
    this.root=new THREE.Group();
    this.root.name='paper-terrain-visual-root';
    scene.add(this.root);
    this.meshes=new Map();this.visibleKeys=new Set();this.dirty=new Set();
    this.lastBuildMs=0;this.totalRebuilds=0;
    this.paperMaterialSet=createPaperMaterialSet(THREE,this.settings);
    this.materials=this.paperMaterialSet.materials;
    this.unsubscribe=terrain.subscribe(event=>this._onTerrainChanged(event));
  }

  _key(cx,cz){return cx+','+cz}
  _mark(cx,cz){this.dirty.add(this._key(cx,cz))}
  _onTerrainChanged(event){
    if(event?.reload){for(const key of this.visibleKeys)this.dirty.add(key);return}
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
    for(let gy=generated+8;gy>=generated-28;gy--){
      const tile=terrain.peekVoxel(gx,gy,gz);
      if(!terrain.isSolidTile(tile))continue;
      const raw=(gy+1)*s;
      const q=Math.max(.05,Number(this.settings.paperLayerHeight)||.5);
      return {y:Math.round(raw/q)*q,gy,tile};
    }
    return {y:(generated+1)*s,gy:generated,tile:terrain.surfaceTile(gx,gz)};
  }
  _topColor(tile){
    return new this.THREE.Color(TOP_COLORS[tile]??TOP_COLORS[3]);
  }
  _sideColor(tile,band=0,seedA=0,seedB=0){
    const c=new this.THREE.Color(SIDE_COLORS[tile]??SIDE_COLORS[3]);
    const base=clamp(Number(this.settings.sideDarkness)||.92,.45,1.15);
    const variation=.96+hash01(seedA,seedB,band)*.08;
    c.multiplyScalar(base*variation);
    return c;
  }

  _buildChunk(cx,cz){
    const t0=performance.now(),THREE=this.THREE,n=this.settings.chunkCells,s=this.terrain.tileSize;
    const h=n+2,halo=new Array(h*h);
    for(let z=-1;z<=n;z++)for(let x=-1;x<=n;x++)halo[(z+1)*h+(x+1)]=this._columnTop(cx*n+x,cz*n+z);
    const getHalo=(x,z)=>halo[(z+1)*h+(x+1)];
    const getLocal=(x,z)=>getHalo(x,z);

    const data={
      positions:[],normals:[],colors:[],uvs:[],worldOffset:[cx*n*s,0,cz*n*s-s*.5],indices:[[],[],[]],
      topRects:0,edgeTopCells:0,edgeFacets:0,sideQuads:0,bevelQuads:0,edgeRuns:0,layerBands:0,layerLips:0,
      boundaryCells:0,deformedBoundaryCorners:0
    };
    const used=new Uint8Array(n*n);
    const lowerThan=(a,b)=>!b||b.y<a.y-.0001;
    const isBoundaryCell=(x,z)=>{
      const cell=getLocal(x,z);if(!cell)return false;
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dz)continue;
        if(lowerThan(cell,getHalo(x+dx,z+dz)))return true;
      }
      return false;
    };
    const boundary=new Uint8Array(n*n);
    for(let z=0;z<n;z++)for(let x=0;x<n;x++){
      if(isBoundaryCell(x,z)){boundary[z*n+x]=1;data.boundaryCells++}
    }
    const cornerExposed=(cell,vx,vz)=>{
      for(const oz of [-1,0])for(const ox of [-1,0]){
        const c=getHalo(vx+ox,vz+oz);
        if(lowerThan(cell,c))return true;
      }
      return false;
    };
    const jitteredCorner=(cell,vx,vz)=>{
      const exposed=cornerExposed(cell,vx,vz);
      const px=vx*s,pz=vz*s;
      if(!exposed)return [px,cell.y,pz];
      const wx=cx*n+vx,wz=cz*n+vz;
      const amp=clamp(Number(this.settings.edgeJitter)||.038,.0,.09)*s;
      const yAmp=clamp(Number(this.settings.edgeHeightJitter)||.010,0,.025)*s;
      const jx=(hash01(wx,wz,911)-.5)*2*amp;
      const jz=(hash01(wx,wz,1481)-.5)*2*amp;
      const jy=(hash01(wx,wz,2039)-.5)*2*yAmp;
      data.deformedBoundaryCorners++;
      return [px+jx,cell.y+jy,pz+jz];
    };

    for(let z=0;z<n;z++)for(let x=0;x<n;x++){
      const idx=z*n+x;if(used[idx]||boundary[idx])continue;
      const cell=getLocal(x,z);if(!cell)continue;
      let w=1;
      while(x+w<n){
        const ii=z*n+x+w,c=getLocal(x+w,z);
        if(used[ii]||boundary[ii]||!c||c.tile!==cell.tile||!near(c.y,cell.y))break;
        w++;
      }
      let hh=1;
      outer:while(z+hh<n){
        for(let xx=0;xx<w;xx++){
          const ii=(z+hh)*n+x+xx,c=getLocal(x+xx,z+hh);
          if(used[ii]||boundary[ii]||!c||c.tile!==cell.tile||!near(c.y,cell.y))break outer;
        }
        hh++;
      }
      for(let zz=0;zz<hh;zz++)for(let xx=0;xx<w;xx++)used[(z+zz)*n+x+xx]=1;
      const x0=x*s,x1=(x+w)*s,z0=z*s,z1=(z+hh)*s,y=cell.y;
      addQuad(data,[x0,y,z0],[x0,y,z1],[x1,y,z1],[x1,y,z0],[0,1,0],this._topColor(cell.tile),0);
      data.topRects++;
    }

    for(let z=0;z<n;z++)for(let x=0;x<n;x++){
      if(!boundary[z*n+x])continue;
      const cell=getLocal(x,z),col=this._topColor(cell.tile);
      const p00=jitteredCorner(cell,x,z),p01=jitteredCorner(cell,x,z+1);
      const p11=jitteredCorner(cell,x+1,z+1),p10=jitteredCorner(cell,x+1,z);
      const cy=cell.y+(hash01(cx*n+x,cz*n+z,3001)-.5)*2*clamp(Number(this.settings.edgeFacetCenterJitter)||.006,0,.018)*s;
      const pc=[(p00[0]+p01[0]+p11[0]+p10[0])*.25,cy,(p00[2]+p01[2]+p11[2]+p10[2])*.25];
      addTri(data,p00,p01,pc,col,0);addTri(data,p01,p11,pc,col,0);
      addTri(data,p11,p10,pc,col,0);addTri(data,p10,p00,pc,col,0);
      data.edgeTopCells++;data.edgeFacets+=4;
    }

    const bevelWidth=clamp(Number(this.settings.bevelWidth)||.045,.006,.14)*s;
    const bevelHeight=clamp(Number(this.settings.bevelHeight)||.055,.008,.16)*s;
    const bandHeight=clamp(Number(this.settings.paperThickness)||.30,.08,.55)*s;
    const worldCell=(lx,lz)=>lx>=-1&&lx<=n&&lz>=-1&&lz<=n?getHalo(lx,lz):this._columnTop(cx*n+lx,cz*n+lz);

    const edgeDesc=(x,z,dx,dz)=>{
      const cell=getLocal(x,z);if(!cell)return null;
      const other=worldCell(x+dx,z+dz);
      if(other&&other.y>=cell.y-.0001)return null;
      return {tile:cell.tile,top:cell.y,bottom:Math.min(cell.y-bandHeight,other?.y??cell.y-bandHeight),x,z,dx,dz};
    };

    const emitRun=(dir,fixed,start,length,desc)=>{
      const [dx,dz]=dir,top=desc.top,bottom=desc.bottom;
      if(!(top>bottom+.001))return;
      data.edgeRuns++;
      const runSeedA=cx*n+(dx?fixed:start),runSeedB=cz*n+(dz?fixed:start);
      let y=top,band=0,previousOffset=0;

      const topCorner=(vx,vz)=>{
        const cell=getLocal(desc.x,desc.z);
        return jitteredCorner(cell,vx,vz);
      };
      const points=(yTop,yBottom,offset)=>{
        const topBand=near(yTop,top,.0001);
        const make=(vx,vz,yy)=>{
          if(topBand){
            const p=topCorner(vx,vz);
              return [p[0]+dx*offset,p[1]-(top-yy),p[2]+dz*offset];
          }
          const wx=vx*s+dx*offset,wz=vz*s+dz*offset;
          return [wx,yy,wz];
        };
        if(dx===1)return [make(fixed,start,yTop),make(fixed,start+length,yTop),make(fixed,start+length,yBottom),make(fixed,start,yBottom)];
        if(dx===-1)return [make(fixed,start+length,yTop),make(fixed,start,yTop),make(fixed,start,yBottom),make(fixed,start+length,yBottom)];
        if(dz===1)return [make(start+length,fixed,yTop),make(start,fixed,yTop),make(start,fixed,yBottom),make(start+length,fixed,yBottom)];
        return [make(start,fixed,yTop),make(start+length,fixed,yTop),make(start+length,fixed,yBottom),make(start,fixed,yBottom)];
      };
      const lipPoints=(yy,fromOffset,toOffset)=>{
        if(near(fromOffset,toOffset,.00001))return null;
        if(dx===1){
          const z0=start*s,z1=(start+length)*s,x0=fixed*s+fromOffset,x1=fixed*s+toOffset;
          return [[x0,yy,z0],[x0,yy,z1],[x1,yy,z1],[x1,yy,z0]];
        }
        if(dx===-1){
          const z0=start*s,z1=(start+length)*s,x0=fixed*s-fromOffset,x1=fixed*s-toOffset;
          return [[x0,yy,z1],[x0,yy,z0],[x1,yy,z0],[x1,yy,z1]];
        }
        if(dz===1){
          const x0=start*s,x1=(start+length)*s,z0=fixed*s+fromOffset,z1=fixed*s+toOffset;
          return [[x1,yy,z0],[x0,yy,z0],[x0,yy,z1],[x1,yy,z1]];
        }
        const x0=start*s,x1=(start+length)*s,z0=fixed*s-fromOffset,z1=fixed*s-toOffset;
        return [[x0,yy,z0],[x1,yy,z0],[x1,yy,z1],[x0,yy,z1]];
      };

      while(y>bottom+.001&&band<96){
        const bandBottom=Math.max(bottom,y-bandHeight);
        // Tiny deterministic mis-registration makes stacked sheets read as
        // physical cut cards without exposing cell seams.
        // Keep every side plane on the exact authoritative contour. Earlier
        // outward per-run offsets created sky-colored cracks at run/corner joins.
        // Layer separation now comes from real vertical bands + material seams.
        const offset=0;
        const sideColor=this._sideColor(desc.tile,band,runSeedA,runSeedB);

        if(band===0){
          const bevelBottom=Math.max(bandBottom,y-bevelHeight);
          const outer=points(y,bevelBottom,offset);
          const inner=points(y,y,0);
          // Connect the exact top contour to the slightly proud cardboard edge.
          const a=inner[0],b=inner[1],c=outer[2],d=outer[3];
          const bevelNormalStrength=clamp(bevelWidth/Math.max(.001,bevelHeight),.35,1.25);
          const bn=normalized(dx*bevelNormalStrength,1,dz*bevelNormalStrength);
          addQuad(data,a,b,c,d,bn,this._topColor(desc.tile),2);data.bevelQuads++;
          if(bevelBottom>bandBottom+.001){
            const q=points(bevelBottom,bandBottom,offset);
            addQuad(data,q[0],q[1],q[2],q[3],[dx,0,dz],sideColor,1);data.sideQuads++;
          }
        }else{
          const lip=lipPoints(y,previousOffset,offset);
          if(lip){
            addQuad(data,lip[0],lip[1],lip[2],lip[3],[0,1,0],this._topColor(desc.tile),2);
            data.layerLips++;data.bevelQuads++;
          }
          const q=points(y,bandBottom,offset);
          addQuad(data,q[0],q[1],q[2],q[3],[dx,0,dz],sideColor,1);data.sideQuads++;
        }
        data.layerBands++;previousOffset=offset;y=bandBottom;band++;
      }
    };

    for(let x=0;x<n;x++){
      for(const dx of [-1,1]){
        let z=0;
        while(z<n){
          const d=edgeDesc(x,z,dx,0);if(!d){z++;continue}
          const len=1;
          emitRun([dx,0],dx===1?x+1:x,z,len,d);z+=len;
        }
      }
    }
    for(let z=0;z<n;z++){
      for(const dz of [-1,1]){
        let x=0;
        while(x<n){
          const d=edgeDesc(x,z,0,dz);if(!d){x++;continue}
          const len=1;
          emitRun([0,dz],dz===1?z+1:z,x,len,d);x+=len;
        }
      }
    }

    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uvs,2));
    const all=[],groups=[];
    for(let g=0;g<3;g++){
      const start=all.length;all.push(...data.indices[g]);
      if(data.indices[g].length)groups.push({start,count:data.indices[g].length,materialIndex:g});
    }
    geometry.setIndex(new THREE.Uint32BufferAttribute(all,1));
    geometry.clearGroups();for(const g of groups)geometry.addGroup(g.start,g.count,g.materialIndex);
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    geometry.userData={
      mode:'paper-diorama-slab-v3-lowpoly-edge-ring',
      topRects:data.topRects,edgeTopCells:data.edgeTopCells,edgeFacets:data.edgeFacets,
      boundaryCells:data.boundaryCells,deformedBoundaryCorners:data.deformedBoundaryCorners,
      sideQuads:data.sideQuads,bevelQuads:data.bevelQuads,
      edgeRuns:data.edgeRuns,layerBands:data.layerBands,layerLips:data.layerLips,
      vertices:data.positions.length/3,triangles:all.length/3,drawGroups:groups.length,
      gameplayGridHidden:true,realThickness:true,topSideMaterialSplit:true,
      continuousMergedEdges:false,lowPolyBoundaryRing:true,neighbourhood:'3x3',deterministicEdgeJitter:true,stackedCardboardBands:true,
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
    const key=this._key(cx,cz),old=this.meshes.get(key);
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
    Object.assign(this.settings,patch||{});this.paperMaterialSet.sync(this.settings);
    for(const key of this.visibleKeys)this.dirty.add(key);
    return this.snapshot();
  }
  snapshot(){
    let vertices=0,triangles=0,topRects=0,edgeTopCells=0,edgeFacets=0,boundaryCells=0,deformedBoundaryCorners=0,sideQuads=0,bevelQuads=0,edgeRuns=0,layerBands=0,visible=0,drawCalls=0;
    for(const key of this.visibleKeys){
      const m=this.meshes.get(key);if(!m?.visible)continue;visible++;
      const u=m.geometry.userData||{};vertices+=u.vertices||0;triangles+=u.triangles||0;
      topRects+=u.topRects||0;edgeTopCells+=u.edgeTopCells||0;edgeFacets+=u.edgeFacets||0;
      boundaryCells+=u.boundaryCells||0;deformedBoundaryCorners+=u.deformedBoundaryCorners||0;
      sideQuads+=u.sideQuads||0;bevelQuads+=u.bevelQuads||0;
      edgeRuns+=u.edgeRuns||0;layerBands+=u.layerBands||0;drawCalls+=u.drawGroups||1;
    }
    return {
      enabled:this.settings.enabled,mode:'visual-only-paper-diorama-v2',
      authority:'TerrainWorld-gameplay-grid-unchanged',
      visiblePaperChunks:visible,paperVertices:vertices,paperTriangles:triangles,
      topRects,edgeTopCells,edgeFacets,boundaryCells,deformedBoundaryCorners,sideQuads,bevelQuads,edgeRuns,layerBands,drawCalls,
      paperRebuildMs:this.lastBuildMs,totalRebuilds:this.totalRebuilds,
      paperLayerHeight:this.settings.paperLayerHeight,paperThickness:this.settings.paperThickness,
      bevelWidth:this.settings.bevelWidth,fiberStrength:this.settings.fiberStrength,
      microNormalStrength:this.settings.microNormalStrength,roughnessVariation:this.settings.roughnessVariation,
      sideDarkness:this.settings.sideDarkness,paperMaterial:this.paperMaterialSet.stats?.()||null,
      renderGridExposed:false,lowPolyBoundaryRing:true,neighbourhood:'3x3',deterministicEdgeJitter:true,
      stackedCardboardBands:true,haloCached:true,seamFreeSidePlanes:true,paperFiberTexture:true,paperPbrV3:true,referenceStyle:'pressed-cardstock-diorama'
    };
  }
  dispose(){
    this.unsubscribe?.();
    for(const mesh of this.meshes.values()){this.root.remove(mesh);mesh.geometry.dispose()}
    this.meshes.clear();this.paperMaterialSet.dispose();this.scene.remove(this.root);
  }
}
