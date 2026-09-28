/*
 * High-performance mesher for Paperchalk's Terraria-style single-layer voxel terrain.
 *
 * Data is strictly 2D: TerrainWorld[x][y].
 * Rendering is genuinely 3D: every occupied cell has a front, back and exposed side faces.
 * There is exactly one block of Z thickness; no second gameplay layer is created.
 *
 * Design follows production voxel-engine practice:
 * - chunk-local Float32 coordinates (precision-safe for very large worlds)
 * - face culling against neighbouring cells
 * - greedy rectangle merging for coplanar faces
 * - one indexed BufferGeometry per chunk, never one Mesh per block
 * - repeating block-grid UVs so greedy quads still read as individual cubes
 */

export const DEFAULT_TERRAIN_PALETTE=Object.freeze({
  1:'#667f4e', // grass
  2:'#7a593b', // dirt
  3:'#676b70', // stone
  4:'#b9a56d', // sand
  5:'#8c6f65'  // clay
});

function greedyRectangles(source,width,height,emit){
  const mask=new Int16Array(source);
  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){
      const i=y*width+x;
      const value=mask[i];
      if(value===0)continue;

      let w=1;
      while(x+w<width&&mask[i+w]===value)w++;

      let h=1;
      outer:while(y+h<height){
        const row=(y+h)*width+x;
        for(let dx=0;dx<w;dx++)if(mask[row+dx]!==value)break outer;
        h++;
      }

      for(let dy=0;dy<h;dy++){
        const row=(y+dy)*width+x;
        for(let dx=0;dx<w;dx++)mask[row+dx]=0;
      }
      emit(x,y,w,h,value);
    }
  }
}

function colorFor(THREE,palette,tile,intensity=1){
  const value=palette[tile]||palette[3]||'#777777';
  const c=value?.isColor?value.clone():new THREE.Color(value);
  c.multiplyScalar(intensity);
  return c;
}

function pushQuad(buffer,{p0,p1,p2,p3,normal,uv,color,unitFaces=1}){
  const base=buffer.vertexCount;
  for(const p of [p0,p1,p2,p3]){
    buffer.positions.push(p[0],p[1],p[2]);
    buffer.normals.push(normal[0],normal[1],normal[2]);
    buffer.colors.push(color.r,color.g,color.b);
  }
  buffer.uvs.push(
    uv[0][0],uv[0][1],
    uv[1][0],uv[1][1],
    uv[2][0],uv[2][1],
    uv[3][0],uv[3][1]
  );
  buffer.indices.push(base,base+1,base+2,base,base+2,base+3);
  buffer.vertexCount+=4;
  buffer.quads++;
  buffer.unitFaces+=unitFaces;
}

function localTile(chunk,lx,ly){
  if(lx<0||ly<0||lx>=chunk.size||ly>=chunk.size)return 0;
  return chunk.get(lx,ly);
}

function worldTile(terrain,chunk,lx,ly){
  if(lx>=0&&ly>=0&&lx<chunk.size&&ly<chunk.size)return chunk.get(lx,ly);
  const gx=chunk.cx*chunk.size+lx;
  const gy=chunk.cy*chunk.size+ly;
  if(typeof terrain.peekTile==='function')return terrain.peekTile(gx,gy);
  return terrain.getTile(gx,gy);
}

export function buildSingleLayerCubeGeometry(
  THREE,
  terrain,
  chunk,
  {thickness=terrain.tileSize,palette=DEFAULT_TERRAIN_PALETTE}={}
){
  const n=chunk.size;
  const s=terrain.tileSize;
  const depth=Math.max(.001,Number(thickness)||s);
  const hz=depth*.5;

  const buffer={
    positions:[],normals:[],colors:[],uvs:[],indices:[],
    vertexCount:0,quads:0,unitFaces:0
  };

  const faceMask=new Int16Array(n*n);
  let solidTiles=0;
  for(let y=0;y<n;y++){
    for(let x=0;x<n;x++){
      const id=localTile(chunk,x,y);
      if(!terrain.isSolidTile(id))continue;
      faceMask[y*n+x]=id;
      solidTiles++;
    }
  }

  // Front (+Z) and back (-Z) are the two physical faces of the one-block-thick sheet.
  // Greedy merge only equal materials; repeating UVs retain visible block boundaries.
  greedyRectangles(faceMask,n,n,(x,y,w,h,tile)=>{
    const x0=x*s,x1=(x+w)*s,y0=y*s,y1=(y+h)*s;
    const front=colorFor(THREE,palette,tile,1.03);
    pushQuad(buffer,{
      p0:[x0,y0,hz],p1:[x1,y0,hz],p2:[x1,y1,hz],p3:[x0,y1,hz],
      normal:[0,0,1],
      uv:[[0,0],[w,0],[w,h],[0,h]],
      color:front,unitFaces:w*h
    });
  });
  greedyRectangles(faceMask,n,n,(x,y,w,h,tile)=>{
    const x0=x*s,x1=(x+w)*s,y0=y*s,y1=(y+h)*s;
    const back=colorFor(THREE,palette,tile,.72);
    pushQuad(buffer,{
      p0:[x1,y0,-hz],p1:[x0,y0,-hz],p2:[x0,y1,-hz],p3:[x1,y1,-hz],
      normal:[0,0,-1],
      uv:[[0,0],[w,0],[w,h],[0,h]],
      color:back,unitFaces:w*h
    });
  });

  // Left / right faces: merge vertical runs that share material and exposure.
  for(let x=0;x<n;x++){
    for(const side of [-1,1]){
      let y=0;
      while(y<n){
        const tile=localTile(chunk,x,y);
        const neighbour=worldTile(terrain,chunk,x+side,y);
        if(!terrain.isSolidTile(tile)||terrain.isSolidTile(neighbour)){y++;continue}

        let run=1;
        while(y+run<n){
          const t=localTile(chunk,x,y+run);
          const nb=worldTile(terrain,chunk,x+side,y+run);
          if(t!==tile||terrain.isSolidTile(nb))break;
          run++;
        }

        const xPlane=(x+(side>0?1:0))*s;
        const y0=y*s,y1=(y+run)*s;
        const color=colorFor(THREE,palette,tile,side>0?.9:.82);
        if(side<0){
          pushQuad(buffer,{
            p0:[xPlane,y0,-hz],p1:[xPlane,y0,hz],p2:[xPlane,y1,hz],p3:[xPlane,y1,-hz],
            normal:[-1,0,0],
            uv:[[0,0],[1,0],[1,run],[0,run]],
            color,unitFaces:run
          });
        }else{
          pushQuad(buffer,{
            p0:[xPlane,y0,hz],p1:[xPlane,y0,-hz],p2:[xPlane,y1,-hz],p3:[xPlane,y1,hz],
            normal:[1,0,0],
            uv:[[0,0],[1,0],[1,run],[0,run]],
            color,unitFaces:run
          });
        }
        y+=run;
      }
    }
  }

  // Bottom / top faces: merge horizontal runs that share material and exposure.
  for(let y=0;y<n;y++){
    for(const side of [-1,1]){
      let x=0;
      while(x<n){
        const tile=localTile(chunk,x,y);
        const neighbour=worldTile(terrain,chunk,x,y+side);
        if(!terrain.isSolidTile(tile)||terrain.isSolidTile(neighbour)){x++;continue}

        let run=1;
        while(x+run<n){
          const t=localTile(chunk,x+run,y);
          const nb=worldTile(terrain,chunk,x+run,y+side);
          if(t!==tile||terrain.isSolidTile(nb))break;
          run++;
        }

        const yPlane=(y+(side>0?1:0))*s;
        const x0=x*s,x1=(x+run)*s;
        const color=colorFor(THREE,palette,tile,side>0?1.1:.66);
        if(side<0){
          pushQuad(buffer,{
            p0:[x0,yPlane,-hz],p1:[x1,yPlane,-hz],p2:[x1,yPlane,hz],p3:[x0,yPlane,hz],
            normal:[0,-1,0],
            uv:[[0,0],[run,0],[run,1],[0,1]],
            color,unitFaces:run
          });
        }else{
          pushQuad(buffer,{
            p0:[x0,yPlane,hz],p1:[x1,yPlane,hz],p2:[x1,yPlane,-hz],p3:[x0,yPlane,-hz],
            normal:[0,1,0],
            uv:[[0,0],[run,0],[run,1],[0,1]],
            color,unitFaces:run
          });
        }
        x+=run;
      }
    }
  }

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(buffer.positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(buffer.normals,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(buffer.colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(buffer.uvs,2));
  geometry.setIndex(new THREE.Uint32BufferAttribute(buffer.indices,1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const theoreticalFaces=solidTiles*6;
  geometry.userData={
    solidTiles,
    quads:buffer.quads,
    unitFaces:buffer.unitFaces,
    culledFaces:Math.max(0,theoreticalFaces-buffer.unitFaces),
    triangles:buffer.indices.length/3,
    vertices:buffer.vertexCount,
    thickness:depth,
    oneLayer:true,
    greedyRatio:buffer.quads?buffer.unitFaces/buffer.quads:1
  };
  return geometry;
}

export function createVoxelGridTexture(THREE,{size=64}={}){
  const canvas=document.createElement('canvas');
  canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f4ead5';
  ctx.fillRect(0,0,size,size);

  // Paper grain.
  for(let i=0;i<size*3;i++){
    const x=(i*29)%size,y=(i*47)%size;
    const a=.025+((i*13)%17)/1000;
    ctx.fillStyle='rgba(72,57,43,'+a.toFixed(3)+')';
    ctx.fillRect(x,y,1+(i%2),1);
  }

  // Repeating bevel/border: every greedy-merged rectangle still visibly consists of cubes.
  const edge=Math.max(2,Math.round(size*.055));
  const grad=ctx.createLinearGradient(0,0,size,size);
  grad.addColorStop(0,'rgba(255,255,255,.35)');
  grad.addColorStop(.35,'rgba(255,255,255,.08)');
  grad.addColorStop(1,'rgba(56,43,32,.18)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,size,size);

  ctx.strokeStyle='rgba(55,43,33,.42)';
  ctx.lineWidth=edge;
  ctx.strokeRect(edge*.5,edge*.5,size-edge,size-edge);
  ctx.strokeStyle='rgba(255,255,255,.20)';
  ctx.lineWidth=Math.max(1,edge*.35);
  ctx.strokeRect(edge*1.25,edge*1.25,size-edge*2.5,size-edge*2.5);

  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=THREE.RepeatWrapping;
  texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.NearestFilter;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.generateMipmaps=true;
  texture.needsUpdate=true;
  return texture;
}
