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

function pushQuad(buffer,p,du,dv,normal,color,uvScale,flip=false,darknessFn=null,aoValues=[3,3,3,3]){
  const p0=[p[0],p[1],p[2]];
  const p1=[p[0]+du[0],p[1]+du[1],p[2]+du[2]];
  const p2=[p1[0]+dv[0],p1[1]+dv[1],p1[2]+dv[2]];
  const p3=[p[0]+dv[0],p[1]+dv[1],p[2]+dv[2]];
  const verts=flip?[p0,p3,p2,p1]:[p0,p1,p2,p3];
  const aos=flip?[aoValues[0],aoValues[3],aoValues[2],aoValues[1]]:aoValues;
  const base=buffer.vertexCount;
  for(let vi=0;vi<verts.length;vi++){
    const v=verts[vi];
    buffer.positions.push(v[0],v[1],v[2]);
    buffer.normals.push(normal[0],normal[1],normal[2]);
    buffer.colors.push(color.r,color.g,color.b);
    buffer.darkness.push(darknessFn?darknessFn(v,normal):0);
    buffer.ambientOcclusion.push(Math.max(0,Math.min(1,(Number(aos[vi])||0)/3)));
  }
  const [uw,vh]=uvScale;
  buffer.uvs.push(0,0,uw,0,uw,vh,0,vh);
  if(aos[0]+aos[2]>aos[1]+aos[3]){
    buffer.indices.push(base,base+1,base+3,base+1,base+2,base+3);
  }else{
    buffer.indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  buffer.vertexCount+=4;buffer.quads++;buffer.unitFaces+=uw*vh;
}

function getLocalOrWorld(terrain,chunk,x,y,z){
  const n=chunk.size;
  if(x>=0&&y>=0&&z>=0&&x<n&&y<n&&z<n)return chunk.get(x,y,z);
  const gx=chunk.cx*n+x,gy=chunk.cy*n+y,gz=chunk.cz*n+z;
  return terrain.peekVoxel(gx,gy,gz);
}

function vertexAO(side1,side2,corner){
  if(side1&&side2)return 0;
  return 3-(Number(!!side1)+Number(!!side2)+Number(!!corner));
}
function faceAOSignature(terrain,chunk,solid,d,positive){
  const u=(d+1)%3,v=(d+2)%3;
  const normal=[0,0,0];normal[d]=positive?1:-1;
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
  let signature=0;
  for(let ci=0;ci<4;ci++){
    const [su,sv]=corners[ci];
    const side1=[solid[0]+normal[0],solid[1]+normal[1],solid[2]+normal[2]];
    const side2=[...side1],corner=[...side1];
    side1[u]+=su;
    side2[v]+=sv;
    corner[u]+=su;corner[v]+=sv;
    const s1=terrain.isSolidTile(getLocalOrWorld(terrain,chunk,side1[0],side1[1],side1[2]));
    const s2=terrain.isSolidTile(getLocalOrWorld(terrain,chunk,side2[0],side2[1],side2[2]));
    const sc=terrain.isSolidTile(getLocalOrWorld(terrain,chunk,corner[0],corner[1],corner[2]));
    signature|=(vertexAO(s1,s2,sc)&3)<<(ci*2);
  }
  return signature;
}

export function buildVoxelChunkGeometry(THREE,terrain,chunk,{palette=DEFAULT_TERRAIN_PALETTE}={}){
  const n=chunk.size,s=terrain.tileSize;
  const dims=[n,n,n];
  const buffer={positions:[],normals:[],colors:[],darkness:[],ambientOcclusion:[],uvs:[],indices:[],vertexCount:0,quads:0,unitFaces:0};
  const mask=new Int16Array(n*n);
  let solidVoxels=0;
  for(let y=0;y<n;y++)for(let z=0;z<n;z++)for(let x=0;x<n;x++)if(terrain.isSolidTile(chunk.get(x,y,z)))solidVoxels++;

  const sample=(x,y,z)=>getLocalOrWorld(terrain,chunk,x,y,z);
  const darknessAt=(v,normal)=>{
    if(Math.abs(normal?.[2]||0)<.5)return 0;
    const gx=chunk.cx*n+Math.max(0,Math.min(n-1,Math.floor(v[0]/s-.0001)));
    const gyWorld=chunk.cy*n*s+v[1];
    const gz=chunk.cz*n+Math.max(0,Math.min(n-1,Math.floor(v[2]/s-.0001)));
    if(gz!==terrain.interactionRowZ)return 0;
    const surfaceTop=(terrain.surfaceCell(gx,gz)+1)*s;
    const depth=surfaceTop-gyWorld;
    return Math.max(0,Math.min(1,(depth-.08)/.75));
  };

  for(let d=0;d<3;d++){
    const u=(d+1)%3,v=(d+2)%3;
    const x=[0,0,0],q=[0,0,0];q[d]=1;

    for(x[d]=-1;x[d]<dims[d];){
      let mi=0;
      for(x[v]=0;x[v]<dims[v];x[v]++){
        for(x[u]=0;x[u]<dims[u];x[u]++){
          const a=sample(x[0],x[1],x[2]);
          const b=sample(x[0]+q[0],x[1]+q[1],x[2]+q[2]);
          const sa=terrain.isSolidTile(a),sb=terrain.isSolidTile(b);
          let face=0;
          if(d===2&&sa&&sb){
            const aGz=chunk.cz*n+x[2],bGz=chunk.cz*n+x[2]+1;
            // Force the +Z face of the real rear black voxel row to render even
            // when the interaction-row voxel directly in front is solid.
            // Only the chunk that owns the rear cell emits it, avoiding duplicates.
            if(aGz===terrain.blackBackRowZ&&bGz===terrain.interactionRowZ&&x[2]>=0&&x[2]<n){
              const gx=chunk.cx*n+x[0],gy=chunk.cy*n+x[1];
              const surface=terrain.surfaceCell(gx,terrain.interactionRowZ);
              const buriedRearVoxel=gy<=surface-1;
              const renderCode=buriedRearVoxel?a+32:a;
              const aoSig=faceAOSignature(terrain,chunk,[x[0],x[1],x[2]],d,true);
              face=renderCode+(aoSig<<6);
            }
          }
          if(!face&&sa!==sb){
            const tile=sa?a:b;
            const solidLocalZ=sa?x[2]:x[2]+q[2];
            const solidGz=chunk.cz*n+solidLocalZ;
            const solidGx=chunk.cx*n+x[0];
            const solidGy=chunk.cy*n+x[1];
            const surface=terrain.surfaceCell(solidGx,terrain.interactionRowZ);
            const buriedBlack=solidGz===terrain.blackBackRowZ&&solidGy<=surface-1;
            const renderCode=buriedBlack?tile+32:tile;
            const solid=[x[0],x[1],x[2]];
            if(!sa){solid[0]+=q[0];solid[1]+=q[1];solid[2]+=q[2]}
            const positive=!!sa;
            const aoSig=faceAOSignature(terrain,chunk,solid,d,positive);
            const encoded=renderCode+(aoSig<<6);
            face=positive?encoded:-encoded;
          }
          if(face&&d===2){
            const solidLocalZ=sa?x[2]:x[2]+1;
            const gx=chunk.cx*n+x[0];
            const gy=chunk.cy*n+x[1];
            const gz=chunk.cz*n+solidLocalZ;
            if(gz===terrain.interactionRowZ&&gy<terrain.surfaceCell(gx,gz))face=0;
          }
          mask[mi++]=face;
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
          const packed=Math.abs(m);
          const renderCode=packed&63;
          const aoSig=packed>>6;
          const aoValues=[aoSig&3,(aoSig>>2)&3,(aoSig>>4)&3,(aoSig>>6)&3];
          const isBlackBack=renderCode>=32;
          const tile=isBlackBack?renderCode-32:renderCode;
          const color=isBlackBack?new THREE.Color(0x000000):colorFor(THREE,palette,tile,intensity);
          pushQuad(buffer,p,du,dv,normal,color,[w,h],!positive,darknessAt,aoValues);

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
  geometry.setAttribute('darkness',new THREE.Float32BufferAttribute(buffer.darkness,1));
  geometry.setAttribute('voxelAO',new THREE.Float32BufferAttribute(buffer.ambientOcclusion,1));
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
    darknessVertices:buffer.darkness.filter(v=>v>.01).length,
    ambientOcclusionVertices:buffer.ambientOcclusion.filter(v=>v<.999).length,
    ambientOcclusionMode:'0fps-style-vertex-ao',
    greedyRatio:buffer.quads?buffer.unitFaces/buffer.quads:1,
    absoluteBlackBackRowZ:terrain.blackBackRowZ,
    rearTopSurfaceNormal:true
  };
  return geometry;
}

export function createVoxelPaperSurfaceTexture(THREE,{size=128}={}){
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.fillStyle='rgb(218,218,218)';ctx.fillRect(0,0,size,size);
  for(let i=0;i<size*5;i++){
    const x=(i*37+i*i*3)%size,y=(i*67+i*11)%size;
    const g=176+((i*29)%63);
    ctx.fillStyle='rgb('+g+','+g+','+g+')';
    ctx.fillRect(x,y,1+(i%3===0?1:0),1);
  }
  ctx.lineCap='round';
  for(let i=0;i<Math.max(18,Math.floor(size*.22));i++){
    const y=(i*23+7)%size,x=(i*41+13)%size;
    const len=3+(i*17)%Math.max(4,Math.floor(size*.12));
    const g=170+(i*19)%70;
    ctx.strokeStyle='rgba('+g+','+g+','+g+',.46)';
    ctx.lineWidth=.45+(i%3)*.22;
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x+len,y+Math.sin(i*1.7)*1.7);
    ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.colorSpace=THREE.NoColorSpace;texture.generateMipmaps=true;
  return texture;
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
