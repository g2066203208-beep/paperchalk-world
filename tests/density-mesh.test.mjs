import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createDensityTerrainGeometry} from '../studio/rendering/density-mesh.js';

function volume(sample,{size=25,step=.25}={}){
  const nx=size,ny=size,nz=size,min={x:-step*(size-1)/2,y:-step*(size-1)/2,z:-step*(size-1)/2};
  const values=new Float32Array(nx*ny*nz),index=(x,y,z)=>(z*ny+y)*nx+x;
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    values[index(x,y,z)]=sample(min.x+x*step,min.y+y*step,min.z+z*step);
  }
  return {nx,ny,nz,step,min,values,index};
}

function inspectTopology(geometry){
  const indices=geometry.index.array,edges=new Map(),vertices=new Set(),adjacent=new Map();
  for(let i=0;i<indices.length;i+=3)for(let e=0;e<3;e++){
    const a=indices[i+e],b=indices[i+(e+1)%3],key=a<b?`${a},${b}`:`${b},${a}`;
    const edge=edges.get(key)??{count:0,direction:0};
    edge.count++;edge.direction+=a<b?1:-1;edges.set(key,edge);vertices.add(a);
    if(!adjacent.has(a))adjacent.set(a,new Set());adjacent.get(a).add(b);
    if(!adjacent.has(b))adjacent.set(b,new Set());adjacent.get(b).add(a);
  }
  let components=0;const unseen=new Set(vertices);
  while(unseen.size){
    components++;const stack=[unseen.values().next().value];unseen.delete(stack[0]);
    while(stack.length){for(const next of adjacent.get(stack.pop())??[])if(unseen.delete(next))stack.push(next);}
  }
  return {edges,vertices,components,euler:vertices.size-edges.size+indices.length/3};
}

test('sphere extraction is one closed manifold with shared vertices and outward normals',t=>{
  const world=volume((x,y,z)=>Math.hypot(x,y,z)-1.91);
  const geometry=createDensityTerrainGeometry({THREE,world});t.after(()=>geometry.dispose());
  const topology=inspectTopology(geometry),p=geometry.attributes.position,n=geometry.attributes.normal;
  assert.equal(geometry.userData.closed,true);assert.equal(geometry.userData.openEdges,0);
  assert.equal(topology.components,1);assert.equal(topology.euler,2);
  for(const edge of topology.edges.values()){
    assert.equal(edge.count,2,'every surface edge has exactly two incident triangles');
    assert.equal(edge.direction,0,'opposing edge directions imply coherent outward winding');
  }
  assert.ok(p.count<geometry.index.count/2,'intersections must be shared by adjacent tetrahedra');
  for(let i=0;i<p.count;i++){
    const normal=[n.getX(i),n.getY(i),n.getZ(i)],point=[p.getX(i),p.getY(i),p.getZ(i)];
    assert.ok(Math.abs(Math.hypot(...normal)-1)<1e-5);
    assert.ok(normal.reduce((sum,v,k)=>sum+v*point[k],0)>1.7,'sphere normals point away from solid');
  }
  assert.ok(geometry.groups[0].count>0&&geometry.groups[1].count>0,'grass and earth both receive triangles');
});

test('subtracting a tunnel creates one continuous closed genus-one surface',t=>{
  const sample=(x,y,z)=>Math.max(Math.hypot(x,y,z)-2.15,.67-Math.hypot(y,z));
  const geometry=createDensityTerrainGeometry({THREE,world:volume(sample)});t.after(()=>geometry.dispose());
  const topology=inspectTopology(geometry);
  assert.equal(geometry.userData.closed,true);assert.equal(topology.components,1);
  assert.equal(topology.euler,0,'a through-tunnel changes the sphere topology into genus one');
  for(const edge of topology.edges.values()){assert.equal(edge.count,2);assert.equal(edge.direction,0);}
  const p=geometry.attributes.position,n=geometry.attributes.normal;
  let interior=0;
  for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))<.75&&Math.hypot(p.getY(i),p.getZ(i))<.8){
    interior++;
    assert.ok(n.getY(i)*p.getY(i)+n.getZ(i)*p.getZ(i)<0,'cut wall normal points into empty tunnel');
  }
  assert.ok(interior>20,'the cut creates actual inward-facing cave geometry');
});

test('exact zero samples weld without duplicate edges or cracks',t=>{
  const geometry=createDensityTerrainGeometry({THREE,world:volume((x,y,z)=>Math.max(Math.abs(x)-1,Math.abs(y)-1,Math.abs(z)-1))});
  t.after(()=>geometry.dispose());
  assert.equal(geometry.userData.closed,true);
  const topology=inspectTopology(geometry);assert.equal(topology.euler,2);assert.equal(topology.components,1);
  const p=geometry.attributes.position,unique=new Set();
  for(let i=0;i<p.count;i++)unique.add([p.getX(i),p.getY(i),p.getZ(i)].join(','));
  assert.equal(unique.size,p.count,'zero-valued sample endpoints share one index');
});

test('material assignment follows the actual surface normal',t=>{
  const geometry=createDensityTerrainGeometry({THREE,world:volume((x,y,z)=>Math.hypot(x,y,z)-1.91)});
  t.after(()=>geometry.dispose());
  const p=geometry.attributes.position,indices=geometry.index.array;
  for(const group of geometry.groups)for(let i=group.start;i<group.start+group.count;i+=3){
    const a=new THREE.Vector3().fromBufferAttribute(p,indices[i]);
    const b=new THREE.Vector3().fromBufferAttribute(p,indices[i+1]).sub(a);
    const c=new THREE.Vector3().fromBufferAttribute(p,indices[i+2]).sub(a);
    const normal=new THREE.Vector3().crossVectors(b,c).normalize();
    assert.equal(group.materialIndex,normal.y>.60001?1:normal.y<.59999?0:group.materialIndex);
  }
});
