import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createStorybookPaperMaps,STORYBOOK_PAPER_PALETTE,STORYBOOK_PAPER_DEFAULTS} from '../studio/rendering/storybook-paper-maps.js';

const entries=[['paperGrassSet','grass','Grass'],['paperDirtSet','dirt','Dirt'],['paperLeafSet','leaf','Leaf'],['paperTrunkSet','trunk','Trunk']];
function fixture(t,maximumAnisotropy=16){
  const maps=createStorybookPaperMaps({THREE,renderer:{capabilities:{getMaxAnisotropy:()=>maximumAnisotropy}}});
  t.after(()=>maps.textures.forEach(texture=>texture.dispose()));
  return maps;
}

test('storybook stock has only bounded, correctly filtered sRGB pigment textures',t=>{
  const maps=fixture(t);
  assert.equal(new Set(maps.textures).size,4);
  for(const [key,,label] of entries){
    const set=maps[key],texture=set.color;
    assert.equal(texture.name,'StorybookPaper/'+label);
    assert.equal(texture.isDataTexture,true);
    assert.equal(texture.image.width,256);assert.equal(texture.image.height,256);
    assert.equal(texture.image.data.length,256*256*4);
    assert.equal(texture.colorSpace,THREE.SRGBColorSpace);
    assert.equal(texture.format,THREE.RGBAFormat);assert.equal(texture.type,THREE.UnsignedByteType);
    assert.equal(texture.wrapS,THREE.RepeatWrapping);assert.equal(texture.wrapT,THREE.RepeatWrapping);
    assert.equal(texture.minFilter,THREE.LinearMipmapLinearFilter);
    assert.equal(texture.magFilter,THREE.LinearFilter);assert.equal(texture.generateMipmaps,true);
    assert.equal(texture.anisotropy,4);assert.ok(texture.version>0);
    assert.equal(set.normal,null);assert.equal(set.roughness,null);assert.equal(set.ao,null);
  }
});

test('paper pigment keeps the palette mean and broad low contrast without dark pores',t=>{
  const maps=fixture(t);
  for(const [key,paletteKey] of entries){
    const hex=STORYBOOK_PAPER_PALETTE[paletteKey],base=[(hex>>>16)&255,(hex>>>8)&255,hex&255];
    const data=maps[key].color.image.data,sums=[0,0,0],min=[255,255,255],max=[0,0,0];
    for(let i=0;i<data.length;i+=4){
      assert.equal(data[i+3],255);
      for(let c=0;c<3;c++){sums[c]+=data[i+c];min[c]=Math.min(min[c],data[i+c]);max[c]=Math.max(max[c],data[i+c]);}
    }
    for(let c=0;c<3;c++){
      assert.ok(Math.abs(sums[c]/65536-base[c])<.15,`${key} preserves its pigment mean`);
      assert.ok(max[c]-min[c]>=2,`${key} retains gentle pigment variation`);
      assert.ok(max[c]-min[c]<=base[c]*.05+1,`${key} variation stays under five percent`);
      assert.ok(min[c]>=base[c]*.96,`${key} contains no dark pores`);
    }
  }
});

test('each horizontal and vertical wrap is as smooth as the interior',t=>{
  const maps=fixture(t);
  for(const texture of maps.textures){
    const {data,width,height}=texture.image;
    let wrapMax=0,interiorMax=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let c=0;c<3;c++){
      const center=data[(y*width+x)*4+c];
      const right=Math.abs(center-data[(y*width+(x+1)%width)*4+c]);
      const down=Math.abs(center-data[(((y+1)%height)*width+x)*4+c]);
      if(x===width-1)wrapMax=Math.max(wrapMax,right);else interiorMax=Math.max(interiorMax,right);
      if(y===height-1)wrapMax=Math.max(wrapMax,down);else interiorMax=Math.max(interiorMax,down);
    }
    assert.ok(interiorMax<=1,texture.name+' never jumps more than one byte per texel');
    assert.ok(wrapMax<=1,texture.name+' has no tile seam');
  }
});

test('CPU pigment generation is deterministic without shared mutable pixels',t=>{
  const first=fixture(t),second=fixture(t);
  for(const [key] of entries){
    const a=first[key].color.image.data,b=second[key].color.image.data;
    assert.notEqual(a,b);assert.deepEqual(a,b);
  }
});

test('texture scale rejects non-finite and nonpositive inputs and updates every surface',t=>{
  const maps=fixture(t);
  assert.deepEqual(STORYBOOK_PAPER_DEFAULTS,{scale:1.8,normal:0,height:0,blend:0});
  assert.ok(Object.isFrozen(STORYBOOK_PAPER_DEFAULTS));assert.ok(Object.isFrozen(STORYBOOK_PAPER_PALETTE));
  for(const input of [undefined,NaN,Infinity,-Infinity,0,-2,Number.MIN_VALUE,'2',null]){
    assert.equal(maps.setScale(input),1.8);
    for(const texture of maps.textures){assert.equal(texture.repeat.x,1/1.8);assert.equal(texture.repeat.y,1/1.8);}
  }
  assert.equal(maps.setScale(2.5),2.5);
  for(const texture of maps.textures){assert.equal(texture.repeat.x,.4);assert.equal(texture.repeat.y,.4);}
});

test('anisotropy respects low-capability renderers and texture disposal remains native',t=>{
  for(const [reported,expected] of [[1,1],[2,2],[Infinity,1],[NaN,1]]){
    const maps=fixture(t,reported);
    for(const texture of maps.textures)assert.equal(texture.anisotropy,expected);
  }
  const maps=fixture(t),disposed=[];
  for(const texture of maps.textures)texture.addEventListener('dispose',()=>disposed.push(texture.name));
  for(const texture of maps.textures)texture.dispose();
  assert.equal(new Set(disposed).size,4);
});
