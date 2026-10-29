import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceTokens,recolor,validateCanvas,PALETTE_ORIGINAL,ROLES} from '../site/pixel-lab/palette-core.js';

const paletteA=['#17142E','#E84A8A','#58B9C9','#F6E39A'];
const paletteH=['#191F37','#D063C2','#5F91E1','#DCF0A5'];
const hexRGB=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));

test('original RGBA tokens are extracted losslessly from all four source colors',()=>{
 const rgb=new Uint8ClampedArray(384*512*4);
 for(let i=0;i<384*512;i++){
  let c=hexRGB(PALETTE_ORIGINAL[i%4]);rgb.set([...c,255],i*4);
 }
 const t=readSourceTokens(rgb);
 assert.equal(t.length,384*512);
 assert.deepEqual(Array.from(t.slice(0,8)),[0,1,2,3,0,1,2,3]);
 assert.equal(ROLES.length,4);
});

test('palette recoloring never modifies pixel geometry, alpha or color count',()=>{
 const t=new Uint8Array(384*512);for(let i=0;i<t.length;i++)t[i]=i%4;
 const A=new Uint8ClampedArray(t.length*4),H=new Uint8ClampedArray(t.length*4);
 recolor(t,paletteA,A);recolor(t,paletteH,H);
 assert.deepEqual(validateCanvas(A,paletteA),{colors:4,alpha:0,other:0});
 assert.deepEqual(validateCanvas(H,paletteH),{colors:4,alpha:0,other:0});
 for(let i=0;i<t.length;i++){
  const a=paletteA[t[i]],h=paletteH[t[i]];
  assert.deepEqual(Array.from(A.slice(i*4,i*4+3)),hexRGB(a));
  assert.deepEqual(Array.from(H.slice(i*4,i*4+3)),hexRGB(h));
 }
});

test('unapproved colors and semi-transparent pixels fail validation',()=>{
 const t=new Uint8Array(384*512);for(let i=0;i<t.length;i++)t[i]=i%4;
 const rgba=new Uint8ClampedArray(t.length*4);recolor(t,paletteA,rgba);
 rgba[0]=255;rgba[7]=88;
 const z=validateCanvas(rgba,paletteA);
 assert.ok(z.other>=1);assert.ok(z.alpha>=1);
});
