import test from 'node:test';
import assert from 'node:assert/strict';
import {MATERIALS,SIZES,generateMaterial,healSeams,auditSeams,quantizeImage,exportRGBA,inspect} from '../site/pixel-lab/material-forge-core.mjs';

test('12 structured texture families each support four discrete native sizes with exact paired edges',()=>{
  assert.equal(Object.keys(MATERIALS).length,12);
  for(const type of Object.keys(MATERIALS))for(const size of SIZES){
    const tile=generateMaterial(type,size,42);
    assert.equal(tile.indices.length,size*size);
    assert.equal(tile.size,size);
    assert.equal(tile.palette.length,6);
    assert.equal(tile.source,'procedural-original');
    const qa=auditSeams(tile);
    assert.equal(qa.exactEdgeMatch,true,type+'@'+size);
    assert.ok(qa.colorsUsed>1,type+'@'+size);
    const rgba=exportRGBA(tile);
    assert.equal(rgba.length,size*size*4);
    for(let i=3;i<rgba.length;i+=4)assert.equal(rgba[i],255);
  }
});

test('procedural textures reproducible, seed sensitive, no upload dependency',()=>{
  for(const type of ['wood','stone','brick','grass','bark','water']){
    const first=generateMaterial(type,64,27),again=generateMaterial(type,64,27),other=generateMaterial(type,64,31);
    assert.deepEqual(first.indices,again.indices,type);
    assert.notDeepEqual(first.indices,other.indices,type);
  }
});

test('seam healer strictly equalizes all four boundaries and does not mutate input',()=>{
  const n=32,pal=MATERIALS.brick.palette,a=generateMaterial('brick',n,5).indices;
  const bad=Uint8Array.from(a);bad[0]=1;bad[n-1]=4;bad[n*11]=0;bad[n*11+n-1]=5;bad[9]=2;bad[(n-1)*n+9]=3;
  const sourceCopy=Uint8Array.from(bad);
  assert.equal(auditSeams({size:n,indices:bad}).exactEdgeMatch,false);
  const fixed=healSeams(bad,n,pal,4);
  assert.deepEqual(bad,sourceCopy);
  assert.equal(auditSeams({size:n,indices:fixed}).exactEdgeMatch,true);
});

test('logical image quantization emits exact indexed pixels and real finite palette',()=>{
  const n=32,rgba=new Uint8ClampedArray(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=(y*n+x)*4;rgba[i]=(x*13)%256;rgba[i+1]=(y*17)%256;rgba[i+2]=((x+y)*7)%256;rgba[i+3]=255;
  }
  for(const count of [6,8,12,16,24,32]){
    const q=quantizeImage(rgba,n,count);
    assert.equal(q.indices.length,n*n);
    assert.equal(q.palette.length,count);
    assert.ok(q.indices.every(c=>c<count));
    assert.ok(q.palette.every(c=>/^#[0-9a-f]{6}$/.test(c)));
    const restored={...q,indices:healSeams(q.indices,n,q.palette,4)};
    assert.equal(inspect(restored).exactEdgeMatch,true);
    assert.equal(inspect(restored).visuallyApproved,false);
    assert.equal(exportRGBA(restored).length,n*n*4);
  }
});

test('core rejects illegal sizes, colors and pixel data',()=>{
  assert.throws(()=>generateMaterial('wood',45,1));
  assert.throws(()=>generateMaterial('imaginary',32,1));
  assert.throws(()=>quantizeImage(new Uint8ClampedArray(55),32,8));
  assert.throws(()=>quantizeImage(new Uint8ClampedArray(32*32*4),32,17));
  assert.throws(()=>healSeams(new Uint8Array(12),64,MATERIALS.wood.palette));
  assert.throws(()=>exportRGBA({size:32,indices:new Uint8Array(32*32).fill(6),palette:['#000000']}));
});
