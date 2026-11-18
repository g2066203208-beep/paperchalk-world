import assert from 'node:assert/strict';
import {sanitizeCardMatte,roundedPaperEdgeGeometry} from '../site/card-battle/motion/card-physical-edge.mjs';

// Mimic the USER-approved back WebP: transparent white scan canvas
// (RGBA=255,255,255,0), translucent white edge halo and opaque burgundy ink.
const w=46,h=66,original=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const i=(y*w+x)*4,near=x<4||x>=w-4||y<4||y>=h-4;
 if(near){
  original.set([247,238,243,64],i);
 }else original.set([78,32,47,255],i);
}
for(let y=18;y<42;y++)for(let x=19;x<24;x++)
 original.set([211,174,101,255],(y*w+x)*4);
original.set([74,36,49,165],(9*w+3)*4); // legitimate translucent burgundy edge
const backup=original.slice();
const cleaned=sanitizeCardMatte(original,w,h);
const px=(buf,x,y)=>[...buf.slice((y*w+x)*4,(y*w+x)*4+4)];
assert.deepEqual(original,backup,'approved original pixels MUST remain unmodified');
assert(cleaned.stats.removedWhite>400,'translucent white scan matte must be erased');
assert(cleaned.stats.padded>200,'clear alpha pixels must contain propagated ink RGB');
assert.equal(px(cleaned.pixels,0,0)[3],0,'white corner should be fully invisible');
assert(px(cleaned.pixels,0,0)[0]<135,'transparent corner should no longer contain white RGB');
assert.equal(px(cleaned.pixels,20,25)[3],255,'gold details remain fully opaque');
assert.deepEqual(px(cleaned.pixels,20,25),[211,174,101,255],
 'do not erase the card back hand-drawn gold');
assert.equal(px(cleaned.pixels,3,9)[3],165,
 'dark translucent burgundy silhouette must survive anti-fringe cleaning');
assert.equal(px(cleaned.pixels,10,10)[0],78,
 'interior wine-red paint is unchanged');
assert.throws(()=>sanitizeCardMatte([],w,h),/Invalid RGBA/);
const thickness=.042,width=1.68,height=2.53,radius=.078;
const g=roundedPaperEdgeGeometry({width,height,thickness,radius,segments:12});
assert(g.triangleCount>=90);
assert(g.vertexCount>g.triangleCount/2);
assert.equal(g.positions.length,g.vertexCount*3);
assert.equal(g.normals.length,g.vertexCount*3);
assert.equal(g.uvs.length,g.vertexCount*2);
assert.equal(g.indices.length,g.triangleCount*3);
const zTop=[],zBottom=[];
for(let i=0;i<g.positions.length;i+=6){
 zTop.push(g.positions[i+2]);zBottom.push(g.positions[i+5]);
}
assert(zTop.every(z=>Math.abs(z-thickness/2)<1e-6));
assert(zBottom.every(z=>Math.abs(z+thickness/2)<1e-6));
assert(g.positions.every(Number.isFinite)&&g.normals.every(Number.is));
assert(Math.abs(g.positions[0]-g.positions[g.positions.length-6])<1e-6,
 'closed rounded edge mesh repeats its first endpoint');
assert.equal(g.uvs[0],0);
assert(Math.abs(g.uvs[g.uvs.length-4]-1)<1e-6,
 'paper cut edge UVs should wrap once without a smeared seam');
// Check first triangle winding: material FrontSide must face OUT, not in.
const tri=[...g.indices.slice(0,3)].map(n=>[
 g.positions[n*3],g.positions[n*3+1],g.positions[n*3+2]]);
const [a,b,c]=tri;
const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
const v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
const normal=[u[1]*v[2]-u[2]*v[1],
 u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
const mid=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3];
assert(normal[0]*mid[0]+normal[1]*mid[1]>0,
 'paper-cut triangles MUST face outward to render with GPU FrontSide culling');
assert.throws(()=>roundedPaperEdgeGeometry({thickness:-1}),/Invalid/);
console.log('PASS actual neutral paper thickness and rounded winding; white halo removed, gold art kept, edge RGB padded');
