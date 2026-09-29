/* Paperchalk voxel meshing worker.
 * Pure-data three-axis greedy meshing with one-cell halo, vertex AO and
 * stale-result-safe version metadata. No DOM/Three.js work happens here.
 */
const SOLID=t=>t>0&&t<=5;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function vertexAO(a,b,c){if(a&&b)return 0;return 3-(Number(!!a)+Number(!!b)+Number(!!c))}

function mesh(msg){
  const {id,key,version,n,s,cx,cy,cz,interactionRowZ,blackBackRowZ}=msg;
  const halo=new Uint8Array(msg.voxels),H=n+2,surfaces=new Int16Array(msg.surfaces);
  const palette=new Float32Array(msg.palette);
  const sample=(x,y,z)=>{
    const xx=x+1,yy=y+1,zz=z+1;
    if(xx<0||yy<0||zz<0||xx>=H||yy>=H||zz>=H)return 0;
    return halo[(yy*H+zz)*H+xx];
  };
  const surfaceAt=x=>surfaces[clamp(x|0,0,n-1)]|0;
  const faceAO=(solid,d,positive)=>{
    const u=(d+1)%3,v=(d+2)%3,normal=[0,0,0];normal[d]=positive?1:-1;
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
    let sig=0;
    for(let i=0;i<4;i++){
      const [su,sv]=corners[i];
      const a=[solid[0]+normal[0],solid[1]+normal[1],solid[2]+normal[2]];
      const b=[...a],c=[...a];a[u]+=su;b[v]+=sv;c[u]+=su;c[v]+=sv;
      sig|=(vertexAO(SOLID(sample(...a)),SOLID(sample(...b)),SOLID(sample(...c)))&3)<<(i*2);
    }
    return sig;
  };

  const positions=[],normals=[],colors=[],darkness=[],ao=[],uvs=[],indices=[];
  let vertexCount=0,quads=0,unitFaces=0,solidVoxels=0,darknessVertices=0,aoVertices=0;
  for(let y=0;y<n;y++)for(let z=0;z<n;z++)for(let x=0;x<n;x++)if(SOLID(sample(x,y,z)))solidVoxels++;

  const pushQuad=(p,du,dv,normal,tile,intensity,uvScale,flip,aoValues,isBlack)=>{
    const p0=[...p],p1=[p[0]+du[0],p[1]+du[1],p[2]+du[2]],p2=[p[0]+du[0]+dv[0],p[1]+du[1]+dv[1],p[2]+du[2]+dv[2]],p3=[p[0]+dv[0],p[1]+dv[1],p[2]+dv[2]];
    const verts=flip?[p0,p3,p2,p1]:[p0,p1,p2,p3],aos=flip?[aoValues[0],aoValues[3],aoValues[2],aoValues[1]]:aoValues;
    const base=vertexCount,pi=tile*3;
    const cr=isBlack?0:(palette[pi]??.45)*intensity,cg=isBlack?0:(palette[pi+1]??.45)*intensity,cb=isBlack?0:(palette[pi+2]??.45)*intensity;
    for(let vi=0;vi<4;vi++){
      const v=verts[vi];positions.push(v[0],v[1],v[2]);normals.push(...normal);colors.push(cr,cg,cb);
      let dark=0;
      if(Math.abs(normal[2])>.5){
        const lx=clamp(Math.floor(v[0]/s-.0001),0,n-1),lz=clamp(Math.floor(v[2]/s-.0001),0,n-1);
        const gz=cz*n+lz;
        if(gz===interactionRowZ){
          const gyWorld=cy*n*s+v[1],surfaceTop=(surfaceAt(lx)+1)*s;
          dark=clamp((surfaceTop-gyWorld-.08)/.75,0,1);
        }
      }
      darkness.push(dark);if(dark>.01)darknessVertices++;
      const av=clamp((Number(aos[vi])||0)/3,0,1);ao.push(av);if(av<.999)aoVertices++;
    }
    const [uw,vh]=uvScale;uvs.push(0,0,uw,0,uw,vh,0,vh);
    if(aos[0]+aos[2]>aos[1]+aos[3])indices.push(base,base+1,base+3,base+1,base+2,base+3);
    else indices.push(base,base+1,base+2,base,base+2,base+3);
    vertexCount+=4;quads++;unitFaces+=uw*vh;
  };

  const mask=new Int32Array(n*n),dims=[n,n,n];
  for(let d=0;d<3;d++){
    const u=(d+1)%3,v=(d+2)%3,x=[0,0,0],q=[0,0,0];q[d]=1;
    for(x[d]=-1;x[d]<dims[d];){
      let mi=0;
      for(x[v]=0;x[v]<dims[v];x[v]++)for(x[u]=0;x[u]<dims[u];x[u]++){
        const A=sample(x[0],x[1],x[2]),B=sample(x[0]+q[0],x[1]+q[1],x[2]+q[2]),sa=SOLID(A),sb=SOLID(B);
        let face=0;
        if(d===2&&sa&&sb){
          const aGz=cz*n+x[2],bGz=aGz+1;
          if(aGz===blackBackRowZ&&bGz===interactionRowZ&&x[2]>=0&&x[2]<n){
            const gy=cy*n+x[1],buried=gy<=surfaceAt(x[0])-1,code=buried?A+32:A;
            face=code+(faceAO([x[0],x[1],x[2]],d,true)<<6);
          }
        }
        if(!face&&sa!==sb){
          const tile=sa?A:B,solid=[x[0],x[1],x[2]];if(!sa){solid[0]+=q[0];solid[1]+=q[1];solid[2]+=q[2]}
          const solidGz=cz*n+solid[2],solidGy=cy*n+solid[1],buried=solidGz===blackBackRowZ&&solidGy<=surfaceAt(solid[0])-1;
          const code=(buried?tile+32:tile)+(faceAO(solid,d,!!sa)<<6);face=sa?code:-code;
        }
        mask[mi++]=face;
      }
      x[d]++;
      mi=0;
      for(let j=0;j<dims[v];j++)for(let i=0;i<dims[u];){
        const m=mask[mi];if(!m){i++;mi++;continue}
        let w=1;while(i+w<dims[u]&&mask[mi+w]===m)w++;
        let h=1;outer:for(;j+h<dims[v];h++)for(let k=0;k<w;k++)if(mask[mi+k+h*dims[u]]!==m)break outer;
        x[u]=i;x[v]=j;
        const du=[0,0,0],dv=[0,0,0];du[u]=w*s;dv[v]=h*s;
        const p=[x[0]*s,x[1]*s,x[2]*s],positive=m>0,normal=[0,0,0];normal[d]=positive?1:-1;
        const intensity=d===1?(positive?1.08:.62):d===0?(positive?.92:.82):(positive?.98:.74);
        const packed=Math.abs(m),renderCode=packed&63,aoSig=packed>>6;
        const aoValues=[aoSig&3,(aoSig>>2)&3,(aoSig>>4)&3,(aoSig>>6)&3],isBlack=renderCode>=32,tile=isBlack?renderCode-32:renderCode;
        pushQuad(p,du,dv,normal,tile,intensity,[w,h],!positive,aoValues,isBlack);
        for(let l=0;l<h;l++)for(let k=0;k<w;k++)mask[mi+k+l*dims[u]]=0;
        i+=w;mi+=w;
      }
    }
  }

  const out={
    type:'mesh-result',id,key,version,cx,cy,cz,
    positions:new Float32Array(positions),normals:new Float32Array(normals),colors:new Float32Array(colors),
    darkness:new Float32Array(darkness),ao:new Float32Array(ao),uvs:new Float32Array(uvs),indices:new Uint32Array(indices),
    userData:{solidVoxels,quads,unitFaces,triangles:indices.length/3,vertices:vertexCount,dimensions:3,darknessVertices,
      ambientOcclusionVertices:aoVertices,ambientOcclusionMode:'0fps-style-vertex-ao',greedyRatio:quads?unitFaces/quads:1,
      absoluteBlackBackRowZ:blackBackRowZ,rearTopSurfaceNormal:true,workerMeshed:true}
  };
  return out;
}

self.onmessage=e=>{
  const msg=e.data;if(!msg||msg.type!=='mesh')return;
  try{
    const out=mesh(msg);
    self.postMessage(out,[out.positions.buffer,out.normals.buffer,out.colors.buffer,out.darkness.buffer,out.ao.buffer,out.uvs.buffer,out.indices.buffer]);
  }catch(error){
    self.postMessage({type:'mesh-error',id:msg.id,key:msg.key,version:msg.version,message:String(error?.stack||error)});
  }
};
