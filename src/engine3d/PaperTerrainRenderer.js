/* Phase 1 visual-only paper terrain.
 * TerrainWorld remains the gameplay/collision authority. The render grid is
 * hidden by merged paper tops plus batched layered-cardboard edge geometry.
 */
const TOP_COLORS=Object.freeze({
  1:0x78945d, // grass paper
  2:0xa17b5d, // earth paper
  3:0x95918a, // stone paper
  4:0xd9bb7e, // sand paper
  5:0xae7f69  // clay paper
});
const SIDE_COLORS=Object.freeze({
  1:0xa1744c,
  2:0x8f6245,
  3:0x77716b,
  4:0xa87349,
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
      paperLayerHeight:settings.paperLayerHeight??.50,
      paperThickness:settings.paperThickness??.30,
      bevelWidth:settings.bevelWidth??.045,
      bevelHeight:settings.bevelHeight??.055,
      fiberStrength:settings.fiberStrength??.050,
      printNoiseStrength:settings.printNoiseStrength??.040,
      sideDarkness:settings.sideDarkness??.92,
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
    const uniforms={
      uPaperFiber:{value:Number(this.settings.fiberStrength)||0},
      uPaperPrint:{value:Number(this.settings.printNoiseStrength)||0},
      uPaperSide:{value:side?1:0},
      uPaperBevel:{value:bevel?1:0},
      uPaperBandHeight:{value:Math.max(.08,Number(this.settings.paperThickness)||.30)}
    };
    const mat=new THREE.MeshStandardMaterial({
      vertexColors:true,
      roughness:side?.97:.93,
      metalness:0,
      side:THREE.DoubleSide,
      flatShading:!!side,
      emissive:side?0x24170f:0x000000,
      emissiveIntensity:side?.20:0
    });
    mat.userData.paperUniforms=uniforms;
    mat.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
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
          uniform float uPaperBandHeight;
          float paperHash(vec2 p){
            p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);
            return fract(p.x*p.y);
          }`)
        .replace('#include <color_fragment>',`#include <color_fragment>
          float broad=paperHash(floor(vPaperWorldPos.xz*1.35)+floor(vPaperWorldPos.xy*.31))-.5;
          float grain=paperHash(floor(vPaperWorldPos.xz*31.0)+floor(vPaperWorldPos.xy*11.0))-.5;
          float fine=paperHash(floor(vPaperWorldPos.xy*89.0)+floor(vPaperWorldPos.zy*47.0))-.5;
          float fiberLine=sin(vPaperWorldPos.x*76.0+vPaperWorldPos.z*29.0+fine*7.0);
          float paperVar=1.0+broad*uPaperPrint*.72+grain*uPaperFiber*.60+fine*uPaperFiber*.22+fiberLine*uPaperFiber*.12;
          diffuseColor.rgb*=paperVar;
          if(uPaperSide>.5){
            float bandPhase=fract((vPaperWorldPos.y+1000.0)/max(.04,uPaperBandHeight));
            float bandEdge=min(bandPhase,1.0-bandPhase);
            float layerSeam=1.0-smoothstep(.015,.10,bandEdge);
            diffuseColor.rgb*=.99-layerSeam*.11;
          }
          if(uPaperBevel>.5)diffuseColor.rgb*=1.065;`)
        .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          float paperRough=paperHash(floor(vPaperWorldPos.xz*53.0)+floor(vPaperWorldPos.xy*19.0))-.5;
          roughnessFactor=clamp(roughnessFactor+paperRough*uPaperFiber*.42,.82,1.0);`);
    };
    mat.customProgramCacheKey=()=>`paper-terrain-v2-${side?1:0}-${bevel?1:0}`;
    return mat;
  }
  _createMaterials(){
    return [
      this._makePaperMaterial({side:false}),
      this._makePaperMaterial({side:true}),
      this._makePaperMaterial({bevel:true})
    ];
  }
  _syncMaterialSettings(){
    for(const mat of this.materials){
      const u=mat.userData.paperUniforms;
      if(!u)continue;
      u.uPaperFiber.value=Number(this.settings.fiberStrength)||0;
      u.uPaperPrint.value=Number(this.settings.printNoiseStrength)||0;
      u.uPaperBandHeight.value=Math.max(.08,Number(this.settings.paperThickness)||.30);
    }
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
    // One-cell halo is sampled once. All contour/side tests below are pure
    // array lookups instead of repeatedly re-running terrain height queries.
    const h=n+2,halo=new Array(h*h);
    for(let z=-1;z<=n;z++)for(let x=-1;x<=n;x++)halo[(z+1)*h+(x+1)]=this._columnTop(cx*n+x,cz*n+z);
    const getHalo=(x,z)=>halo[(z+1)*h+(x+1)];
    const getLocal=(x,z)=>getHalo(x,z);

    const data={
      positions:[],normals:[],colors:[],indices:[[],[],[]],
      topRects:0,sideQuads:0,bevelQuads:0,edgeRuns:0,layerBands:0,layerLips:0
    };
    const used=new Uint8Array(n*n);

    // Greedy merged top surfaces: merge all equal-height/material cells into
    // large top cards. No per-tile UV border is emitted, so the gameplay grid
    // is not visible in the framebuffer.
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

    const bevelWidth=clamp(Number(this.settings.bevelWidth)||.045,.006,.14)*s;
    const bevelHeight=clamp(Number(this.settings.bevelHeight)||.055,.008,.16)*s;
    // paperThickness controls the visible stacked-card edge band spacing.
    const bandHeight=clamp(Number(this.settings.paperThickness)||.30,.08,.55)*s;
    const worldCell=(lx,lz)=>lx>=-1&&lx<=n&&lz>=-1&&lz<=n?getHalo(lx,lz):this._columnTop(cx*n+lx,cz*n+lz);
    const sameEdge=(a,b)=>!!a&&!!b&&a.tile===b.tile&&near(a.top,b.top)&&near(a.bottom,b.bottom);

    const edgeDesc=(x,z,dx,dz)=>{
      const cell=getLocal(x,z);if(!cell)return null;
      const other=worldCell(x+dx,z+dz);
      if(other&&other.y>=cell.y-.0001)return null;
      return {tile:cell.tile,top:cell.y,bottom:Math.min(cell.y-bandHeight,other?.y??cell.y-bandHeight)};
    };

    const emitRun=(dir,fixed,start,length,desc)=>{
      const [dx,dz]=dir,top=desc.top,bottom=desc.bottom;
      if(!(top>bottom+.001))return;
      data.edgeRuns++;
      const runSeedA=cx*n+(dx?fixed:start),runSeedB=cz*n+(dz?fixed:start);
      let y=top,band=0,previousOffset=0;

      const points=(yTop,yBottom,offset)=>{
        if(dx===1){
          const xx=fixed*s+offset,z0=start*s,z1=(start+length)*s;
          return [[xx,yTop,z0],[xx,yTop,z1],[xx,yBottom,z1],[xx,yBottom,z0]];
        }
        if(dx===-1){
          const xx=fixed*s-offset,z0=start*s,z1=(start+length)*s;
          return [[xx,yTop,z1],[xx,yTop,z0],[xx,yBottom,z0],[xx,yBottom,z1]];
        }
        if(dz===1){
          const zz=fixed*s+offset,x0=start*s,x1=(start+length)*s;
          return [[x1,yTop,zz],[x0,yTop,zz],[x0,yBottom,zz],[x1,yBottom,zz]];
        }
        const zz=fixed*s-offset,x0=start*s,x1=(start+length)*s;
        return [[x0,yTop,zz],[x1,yTop,zz],[x1,yBottom,zz],[x0,yBottom,zz]];
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

    // Merge contiguous exposed edges before extrusion. This removes the blue
    // one-pixel cracks that appear when every gameplay cell owns a side quad.
    for(let x=0;x<n;x++){
      for(const dx of [-1,1]){
        let z=0;
        while(z<n){
          const d=edgeDesc(x,z,dx,0);if(!d){z++;continue}
          let len=1;while(z+len<n&&sameEdge(d,edgeDesc(x,z+len,dx,0)))len++;
          emitRun([dx,0],dx===1?x+1:x,z,len,d);z+=len;
        }
      }
    }
    for(let z=0;z<n;z++){
      for(const dz of [-1,1]){
        let x=0;
        while(x<n){
          const d=edgeDesc(x,z,0,dz);if(!d){x++;continue}
          let len=1;while(x+len<n&&sameEdge(d,edgeDesc(x+len,z,0,dz)))len++;
          emitRun([0,dz],dz===1?z+1:z,x,len,d);x+=len;
        }
      }
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
      mode:'paper-diorama-slab-v2-layered-edges',
      topRects:data.topRects,sideQuads:data.sideQuads,bevelQuads:data.bevelQuads,
      edgeRuns:data.edgeRuns,layerBands:data.layerBands,layerLips:data.layerLips,
      vertices:data.positions.length/3,triangles:all.length/3,drawGroups:groups.length,
      gameplayGridHidden:true,realThickness:true,topSideMaterialSplit:true,
      continuousMergedEdges:true,stackedCardboardBands:true,
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
    Object.assign(this.settings,patch||{});this._syncMaterialSettings();
    for(const key of this.visibleKeys)this.dirty.add(key);
    return this.snapshot();
  }
  snapshot(){
    let vertices=0,triangles=0,topRects=0,sideQuads=0,bevelQuads=0,edgeRuns=0,layerBands=0,visible=0,drawCalls=0;
    for(const key of this.visibleKeys){
      const m=this.meshes.get(key);if(!m?.visible)continue;visible++;
      const u=m.geometry.userData||{};vertices+=u.vertices||0;triangles+=u.triangles||0;
      topRects+=u.topRects||0;sideQuads+=u.sideQuads||0;bevelQuads+=u.bevelQuads||0;
      edgeRuns+=u.edgeRuns||0;layerBands+=u.layerBands||0;drawCalls+=u.drawGroups||1;
    }
    return {
      enabled:this.settings.enabled,mode:'visual-only-paper-diorama-v2',
      authority:'TerrainWorld-gameplay-grid-unchanged',
      visiblePaperChunks:visible,paperVertices:vertices,paperTriangles:triangles,
      topRects,sideQuads,bevelQuads,edgeRuns,layerBands,drawCalls,
      paperRebuildMs:this.lastBuildMs,totalRebuilds:this.totalRebuilds,
      paperLayerHeight:this.settings.paperLayerHeight,paperThickness:this.settings.paperThickness,
      bevelWidth:this.settings.bevelWidth,fiberStrength:this.settings.fiberStrength,
      sideDarkness:this.settings.sideDarkness,
      renderGridExposed:false,continuousMergedEdges:true,stackedCardboardBands:true,haloCached:true,seamFreeSidePlanes:true
    };
  }
  dispose(){
    this.unsubscribe?.();
    for(const mesh of this.meshes.values()){this.root.remove(mesh);mesh.geometry.dispose()}
    this.meshes.clear();for(const m of this.materials)m.dispose();this.scene.remove(this.root);
  }
}
