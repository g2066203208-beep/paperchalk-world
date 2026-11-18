import assert from 'node:assert/strict';
import {mattePortraitBackground} from '../site/card-battle/motion/card-portrait-matte.mjs';

const w=128,h=184,original=new Uint8ClampedArray(w*h*4);
const pixel=(out,x,y)=>[...out.slice((y*w+x)*4,(y*w+x)*4+4)];
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const k=(y*w+x)*4;
 const body=x>31&&x<102&&y>20&&y<174;
 const glove=x<44&&y>55&&y<74;
 const face=x>55&&x<74&&y>29&&y<48;
 const whiteShirt=x>55&&x<78&&y>80&&y<98;
 const stroke=x===31&&y>20&&y<174;
 let rgba=body?[119,28,37,255]:[250,249,248,255];
 if(whiteShirt)rgba=[246,242,237,255];
 if(face)rgba=[241,194,166,255];
 if(glove)rgba=[186,209,196,255];
 if(stroke)rgba=[221,190,192,255];
 original.set(rgba,k);
}
const backup=original.slice(),start=performance.now();
const result=mattePortraitBackground(original,w,h);
const ms=performance.now()-start;
assert.deepEqual(original,backup,'never rewrite the source character portrait');
assert.equal(result.stats.detected,true,'recognize nearly-white studio backdrop');
assert(result.stats.removed>w*h*.30,'remove the connected external white backdrop');
assert(result.stats.padded>w*h*.2,'dilate RGB into transparent pixels to avoid mipmap white halos');
assert(result.stats.feathered>30,'edge anti-alias should be preserved as fractional alpha');
assert.equal(pixel(result.pixels,10,10)[3],0,'outer white studio is now transparent');
assert(pixel(result.pixels,10,10)[0]<220,'fully transparent RGB cannot retain white background');
assert.deepEqual(pixel(result.pixels,67,86),[246,242,237,255],
 'white clothes INSIDE character remain opaque and unmodified');
assert.deepEqual(pixel(result.pixels,15,60),[186,209,196,255],
 'pale mint glove touching border remains untouched');
assert.deepEqual(pixel(result.pixels,60,34),[241,194,166,255],
 'face and skin highlights remain original');
assert.equal(pixel(result.pixels,50,60)[3],255,'dark red coat stays fully opaque');
assert(pixel(result.pixels,31,100)[3]>0 && pixel(result.pixels,31,100)[3]<255,
 'soft anti-aliased subject contour gets proper partial alpha');
const notWhite=new Uint8ClampedArray(original);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 if(x===0||x===w-1||y===0||y===h-1){
  const i=(y*w+x)*4;
  notWhite[i]=77;notWhite[i+1]=32;notWhite[i+2]=42;
 }
}
const colored=mattePortraitBackground(notWhite,w,h);
assert.equal(colored.stats.detected,false,
 'do not erase a deliberate non-white art backdrop if no white border exists');
assert.deepEqual(colored.pixels,notWhite);
assert.throws(()=>mattePortraitBackground([],w,h),/Invalid/);
console.log('PASS connected white photo backdrop extracted, white costume/face preserved, paper fringe padded:',{
 removed:result.stats.removed,feathered:result.stats.feathered,padded:result.stats.padded,
 elapsedMs:+ms.toFixed(1)
});
