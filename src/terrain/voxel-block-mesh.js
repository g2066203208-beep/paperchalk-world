/*
 * Greedy mesher for Paperchalk's infinite 3D voxel world.
 * Each chunk stores dense Uint8 voxels; only exposed surfaces are emitted.
 * The algorithm sweeps all 3 axes and merges coplanar faces with equal material.
 */

export const DEFAULT_TERRAIN_PALETTE=Object.freeze({
  1:'#667f4e',
  2:'#7a593b',
  3:'#676b70',
  4:'#b9a56d',
  5:'#8c6f65'
});

function colorFor(THREE,palette,tile,intensity=1){
  const value=palette[tile]||palette[3]||'#777777';
  const c=value?.isColor?value.clone():new THREE.Color(value);
  c.multiplyScalar(intensity);return c;
}

function pushQuad(buffer,p,du,dv,normal,color,uvScale,flip=false){
  const p0=[p[0],p[1],p[2]];
  const p1=[p[0]+du[0],p[1]+du[1],p[2]+du[2]];
  const p2=[p1[0]+dv[0],p1[1]+dv[1],p1[2]+dv[2]];
  const p3=[p[0]+dv[0],p[1]+dv[1],p[2]+dv[2]];
  const verts=flip?[p0,p3,p2,p1]:[p0,p1,p2,p3];
  const base=buffer.vertexCount;
  for(const v of verts){
    buffer.positions.push(v[0],v[1],v[2]);
    buffer.normals.push(normal[0],normal[1],normal[2]);
    buffer.colors.push(color.r,color.g,color.b);
  }
  const [uw,vh]=uvScale;
  buffer.uvs.push(0,0,uw,0,uw,vh,0,vh);
  buffer.indices.push(base,base+1,base+2,base,base+2,base+3);
  buffer.vertexCount+=4;buffer.quads++;buffer.unitFaces+=uw*vh;
}

function getLocalOrWorld(terrain,chunk,x,y,z){
  const n=chunk.size;
  if(x>=0&&y>=0&&z>=0&&x<n&&y<n&&z<n)return chunk.get(x,y,z);
  const gx=chunk.cx*n+x,gy=chunk.cy*n+y,gz=chunk.cz*n+z;
  return terrain.peekVoxel(gx,gy,gz);
}

export function buildVoxelChunkGeometry(THREE,terrain,chunk,{palette=DEFAULT_TERRAIN_PALETTE}={}){
  const n=chunk.size,s=terrain.tileSize;
  const dims=[n,n,n];
  const buffer={positions:[],normals:[],colors:[],uvs:[],indices:[],vertexCount:0,quads:0,unitFaces:0};
  const mask=new Int16Array(n*n);
  let solidVoxels=0;
  for(let y=0;y<n;y++)for(let z=0;z<n;z++)for(let x=0;x<n;x++)if(terrain.isSolidTile(chunk.get(x,y,z)))solidVoxels++;

  const sample=(x,y,z)=>getLocalOrWorld(terrain,chunk,x,y,z);

  for(let d=0;d<3;d++){
    const u=(d+1)%3,v=(d+2)%3;
    const x=[0,0,0],q=[0,0,0];q[d]=1;

    for(x[d]=-1;x[d]<dims[d];){
      let mi=0;
      for(x[v]=0;x[v]<dims[v];x[v]++){
        for(x[u]=0;x[u]<dims[u];x[u]++){
          const a=x[d]>=0?sample(x[0],x[1],x[2]):sample(x[0]-q[0],x[1]-q[1],x[2]-q[2]);
          const b=x[d]<dims[d]-1?sample(x[0]+q[0],x[1]+q[1],x[2]+q[2]):sample(x[0]+q[0],x[1]+q[1],x[2]+q[2]);
          const sa=terrain.isSolidTile(a),sb=terrain.isSolidTile(b);
          mask[mi++]=sa===sb?0:(sa?a:-b);
        }
      }
      x[d]++;

      mi=0;
      for(let j=0;j<dims[v];j++){
        for(let i=0;i<dims[u];){
          const m=mask[mi];
          if(!m){i++;mi++;continue}

          let w=1;
          while(i+w<dims[u]&&mask[mi+w]===m)w++;

          let h=1;
          outer:for(;j+h<dims[v];h++){
            for(let k=0;k<w;k++)if(mask[mi+k+h*dims[u]]!==m)break outer;
          }

          x[u]=i;x[v]=j;
          const du=[0,0,0],dv=[0,0,0];du[u]=w*s;dv[v]=h*s;
          const p=[x[0]*s,x[1]*s,x[2]*s];
          const positive=m>0;
          const normal=[0,0,0];normal[d]=positive?1:-1;
          const intensity=d===1?(positive?1.08:.62):d===0?(positive?.92:.82):(positive?.98:.74);
          const color=colorFor(THREE,palette,Math.abs(m),intensity);
          pushQuad(buffer,p,du,dv,normal,color,[w,h],!positive);

          for(let l=0;l<h;l++)for(let k=0;k<w;k++)mask[mi+k+l*dims[u]]=0;
          i+=w;mi+=w;
        }
      }
    }
  }

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(buffer.positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(buffer.normals,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(buffer.colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(buffer.uvs,2));
  geometry.setIndex(new THREE.Uint32BufferAttribute(buffer.indices,1));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={
    solidVoxels,
    quads:buffer.quads,
    unitFaces:buffer.unitFaces,
    triangles:buffer.indices.length/3,
    vertices:buffer.vertexCount,
    dimensions:3,
    greedyRatio:buffer.quads?buffer.unitFaces/buffer.quads:1
  };
  return geometry;
}

// Compatibility alias for older imports during migration.
export const buildSingleLayerCubeGeometry=buildVoxelChunkGeometry;

export function createVoxelGridTexture(THREE,{size=128}={}){
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#f4ead5';ctx.fillRect(0,0,size,size);
  for(let i=0;i<size*3;i++){
    const x=(i*29)%size,y=(i*47)%size,a=.025+((i*13)%17)/1000;
    ctx.fillStyle='rgba(72,57,43,'+a.toFixed(3)+')';ctx.fillRect(x,y,1+(i%2),1);
  }
  const edge=Math.max(2,Math.round(size*.055));
  const grad=ctx.createLinearGradient(0,0,size,size);
  grad.addColorStop(0,'rgba(255,255,255,.35)');grad.addColorStop(.35,'rgba(255,255,255,.08)');grad.addColorStop(1,'rgba(56,43,32,.18)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,size,size);
  ctx.strokeStyle='rgba(55,43,33,.42)';ctx.lineWidth=edge;ctx.strokeRect(edge*.5,edge*.5,size-edge,size-edge);
  ctx.strokeStyle='rgba(255,255,255,.20)';ctx.lineWidth=Math.max(1,edge*.35);ctx.strokeRect(edge*1.25,edge*1.25,size-edge*2.5,size-edge*2.5);
  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=true;
  return texture;
}
