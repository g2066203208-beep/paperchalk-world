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
const snapshot=rgba.slice();
const relief=deriveCardRelief(rgba,w,h,'back');
assert.deepEqual(rgba,snapshot,'source artwork bytes must remain unchanged');
assert(relief.pigment.length===w*h*4,'full card must have pixel-aware ink grain');
assert(relief.stats.paperNormalPixels>w*h*.55,'paper microfibers must cover flat burgundy, not just gold contours');
assert(relief.stats.roughnessMaximum-relief.stats.roughnessMinimum>.4,
 'paper and stamped foil require distinguishable roughness');
assert(relief.stats.goldPixels>400,'actual gold line pixels classified');
assert(relief.stats.normalPixels>500,'edges create genuine non-flat tangent normals');
const pix=(x,y,arr)=>[...arr.slice((y*w+x)*4,(y*w+x)*4+4)];
assert(pix(22,55,relief.surface)[2]===0,'burgundy metalness must be zero');
assert(pix(43,55,relief.surface)[2]>245,'gold uses PBR blue-channel metalness');
assert(pix(43,55,relief.surface)[1]<pix(22,55,relief.surface)[1],
 'gold should be smoother than burgundy paper');
assert(pix(43,55,relief.normals)[2]>246,'gold center should mostly point outward; with real microtexture it cannot be perfectly flat');
const paperNormals=[];
const paperRoughness=new Set();
let paperStipplePixels=0;
for(let y=8;y<h-8;y++)for(let x=8;x<30;x++){
 const k=(y*w+x)*4;
 const n=relief.normals[k],g=relief.normals[k+1];
 paperNormals.push(Math.abs(n-128)+Math.abs(g-128));
 paperRoughness.add(relief.surface[k+1]);
 if(relief.pigment[k]!==rgba[k]||relief.pigment[k+1]!==rgba[k+1])paperStipplePixels++;
}
assert(paperNormals.filter(n=>n>3).length>paperNormals.length*.5,
 'uniform burgundy cardstock must show paper fiber NORMAL variation');
assert(paperRoughness.size>16,'non-metallic cardstock must have microscopically varied roughness');
assert(paperStipplePixels>paperNormals.length*.15,'ink grain must be visible even on a visually flat burgundy area');
assert(pix(40,55,relief.normals)[0]!==128,'ridge must tilt the geometric surface normal');
assert(relief.normals.length===w*h*4);
assert(relief.surface.length===w*h*4);
const portrait=deriveCardRelief(rgba,w,h,'portrait');
assert.equal(portrait.stats.goldPixels,0,'gold tagging must be back-only');
assert(portrait.stats.normalPixels>100,'portrait image gradients produce subtle fold normals');
assert(portrait.stats.paperNormalPixels>100,'front artwork must also have paper microfibers');
assert(portrait.stats.roughnessMaximum-portrait.stats.roughnessMinimum>.03,
 'front print must not have a single uniform glossy roughness');
assert(portrait.pigment.length===w*h*4);
assert(pix(43,55,portrait.surface)[2]===0,'do not turn blonde hair into gold foil');
const transparent=rgba.slice();transparent[(55*w+43)*4+3]=0;
const clear=deriveCardRelief(transparent,w,h,'back');
assert.equal(pix(43,55,clear.surface)[2],0,'transparent pixel has no PBR foil');
assert.throws(()=>deriveCardRelief([],w,h),/Invalid image pixels/);
assert.throws(()=>deriveCardRelief(rgba,w,h,'unsupported'),/Unknown/);
// On-the-fly material generation must not freeze the draw sequence. The
// actual game limits output normal maps to 448 px (phone) or 640 px (desktop).
const bw=320,bh=448,benchmarkPixels=new Uint8Array(bw*bh*4);
for(let i=0;i<benchmarkPixels.length;i+=4){
 benchmarkPixels[i]=112;benchmarkPixels[i+1]=56;
 benchmarkPixels[i+2]=65;benchmarkPixels[i+3]=255;
}
const t0=performance.now();
const benchmark=deriveCardRelief(benchmarkPixels,bw,bh,'portrait');
const elapsed=performance.now()-t0;
assert.equal(benchmark.stats.totalPixels,bw*bh);
assert(elapsed<6000,'procedural material generation is too slow and blocks the UI: '+elapsed.toFixed(0)+'ms');
console.log('Paper relief generation '+bw+'×'+bh+' '+elapsed.toFixed(1)+'ms');
console.log('PASS fully inked paper card: whole-surface microfiber normals, physical roughness, pigment stipple, original images immutable');
