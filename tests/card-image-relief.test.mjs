import assert from 'node:assert/strict';
import {goldInkWeight,deriveCardRelief} from '../site/card-battle/motion/card-image-relief.mjs';

const w=96,h=112,rgba=new Uint8Array(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const k=(y*w+x)*4;
 const gold=x>=40&&x<=47&&y>=8&&y<=102;
 rgba[k]=gold?211:83;rgba[k+1]=gold?170:33;rgba[k+2]=gold?95:43;rgba[k+3]=255;
}
assert(goldInkWeight(211,170,95)>.95);
assert(goldInkWeight(83,33,43)===0,'dark burgundy must stay nonmetallic');
assert(goldInkWeight(255,255,255)===0,'white paper is not gold');
assert(goldInkWeight(211,170,95,0)===0,'transparent edge must not receive foil');
const relief=deriveCardRelief(rgba,w,h,'back');
assert(relief.stats.goldPixels>400,'actual gold line pixels classified');
assert(relief.stats.normalPixels>500,'edges create genuine non-flat tangent normals');
const pix=(x,y,arr)=>[...arr.slice((y*w+x)*4,(y*w+x)*4+4)];
assert(pix(22,55,relief.surface)[2]===0,'burgundy metalness must be zero');
assert(pix(43,55,relief.surface)[2]>245,'gold uses PBR blue-channel metalness');
assert(pix(43,55,relief.surface)[1]<pix(22,55,relief.surface)[1],
 'gold should be smoother than burgundy paper');
assert(pix(43,55,relief.normals)[2]>252,'flat center of gold should point outward');
assert(pix(40,55,relief.normals)[0]!==128,'ridge must tilt the geometric surface normal');
assert(relief.normals.length===w*h*4);
assert(relief.surface.length===w*h*4);
const portrait=deriveCardRelief(rgba,w,h,'portrait');
assert.equal(portrait.stats.goldPixels,0,'gold tagging must be back-only');
assert(portrait.stats.normalPixels>100,'portrait image gradients produce subtle fold normals');
assert(pix(43,55,portrait.surface)[2]===0,'do not turn blonde hair into gold foil');
const transparent=rgba.slice();transparent[(55*w+43)*4+3]=0;
const clear=deriveCardRelief(transparent,w,h,'back');
assert.equal(pix(43,55,clear.surface)[2],0,'transparent pixel has no PBR foil');
assert.throws(()=>deriveCardRelief([],w,h),/Invalid image pixels/);
assert.throws(()=>deriveCardRelief(rgba,w,h,'unsupported'),/Unknown/);
console.log('PASS image-based normal map / gold foil recognition / red paper PBR / alpha edges');
