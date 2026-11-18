import assert from 'node:assert/strict';
import {traceAlphaContours,analyzeAlphaMask} from '../site/card-battle/motion/sprite-extrusion.mjs';
function alpha(w,h,fn){const a=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)a[y*w+x]=fn(x,y)?255:0;return a;}
const square=alpha(80,80,(x,y)=>x>=18&&x<=59&&y>=12&&y<=53);
const sq=analyzeAlphaMask(square,80,80,{size:2.6});
assert.equal(sq.shapes.length,1,'one connected filled square');
assert.equal(sq.shapes[0].holes.length,0);
assert.equal(sq.bbox.minX,18);assert.equal(sq.bbox.maxX,60);
assert(Math.abs(sq.shapes[0].outer[0][0])<=1.31,'centers shape');
const ring=alpha(128,128,(x,y)=>{const d=(x-64)**2+(y-64)**2;return d<=49**2&&d>=18**2;});
const coin=analyzeAlphaMask(ring,128,128,{size:2.6});
assert.equal(coin.shapes.length,1,'ring outer contour');
assert.equal(coin.shapes[0].holes.length,1,'inner hole must extrude as a hole');
assert(coin.shapes[0].outer.length>18,'round coins should have curved contour segments');
assert(coin.shapes[0].outer.length<230,'outline must be simplified');
assert(coin.scale>0&&coin.plane.width>coin.size,'alpha padding preserved in texture mapping');
const disjoint=alpha(64,64,(x,y)=>(x>6&&x<20&&y>5&&y<20)||(x>31&&x<54&&y>30&&y<58));
const duo=analyzeAlphaMask(disjoint,64,64);
assert.equal(duo.shapes.length,2,'two disconnected painted islands -> two separate solids');
const diagonal=alpha(8,8,(x,y)=>(x===1&&y===1)||(x===2&&y===2));
assert.equal(traceAlphaContours(diagonal,8,8,128,{simplify:0,minArea:.1}).solids.length,2,
 'corner-touching pixels should not collapse into self intersecting figure-eight');
const blank=alpha(20,20,()=>false);
assert.throws(()=>analyzeAlphaMask(blank,20,20),/没有可挤出的主体轮廓/);
const star=alpha(72,72,(x,y)=>{
 const dx=x-36,dy=y-36,d=Math.sqrt(dx*dx+dy*dy),theta=Math.atan2(dy,dx);
 return d<24+8*Math.cos(5*theta);
});
assert.equal(analyzeAlphaMask(star,72,72).shapes.length,1,'complex concave gold image extrudes as itself, not a circular cylinder');
console.log('PASS: alpha silhouette, center, ring hole, disjoint shapes, diagonal intersections, concave shape, empty guard');