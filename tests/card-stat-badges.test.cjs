'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const labels=[],created=[],deleted=[],draws=[];
const fakeCtx={
 beginPath(){},roundRect(){},fill(){},stroke(){},
 createLinearGradient(){return {addColorStop(){}};},
 fillText(t){labels.push(String(t));},
 set shadowColor(v){},set shadowBlur(v){},set shadowOffsetY(v){},
 set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},
 set textAlign(v){},set textBaseline(v){},set font(v){}
};
const fakeGl={
 TEXTURE0:0,TEXTURE_2D:1,RGBA:2,UNSIGNED_BYTE:3,UNPACK_FLIP_Y_WEBGL:4,
 TEXTURE_MIN_FILTER:5,TEXTURE_MAG_FILTER:6,TEXTURE_WRAP_S:7,TEXTURE_WRAP_T:8,
 LINEAR_MIPMAP_LINEAR:9,LINEAR:10,CLAMP_TO_EDGE:11,
 createTexture(){const texture={id:created.length};created.push(texture);return texture;},
 deleteTexture(t){deleted.push(t);},activeTexture(){},bindTexture(){},pixelStorei(){},
 texImage2D(){},texParameteri(){},generateMipmap(){}
};
const context={window:{},document:{createElement(name){
 assert.equal(name,'canvas');return{width:0,height:0,getContext:()=>fakeCtx};
}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,
 '../site/card-battle/engine/card-stat-badges.js'),'utf8'),context);
let faceShape=null;
const badge=context.window.PaperchalkCardStatBadges.create({
 gl:fakeGl,cardW:1.60,cardH:2.40,cardD:.095,
 makeFace(w,h,r,z){faceShape={w,h,r,z};return faceShape;},
 T:(x,y,z)=>({x,y,z}),
 mul:(base,offset)=>({base,offset}),
 renderGeom:(face,m,color,texture,unlit)=>draws.push({face,m,color,texture,unlit})
});
const initial=badge.snapshot;
assert.equal(initial.attachedTo,'card-model-matrix');
assert.equal(initial.layout,'lower-left-attack_lower-right-health');
assert.ok(initial.anchor.attack.x<0&&initial.anchor.health.x>0);
assert.ok(initial.anchor.attack.y<0&&initial.anchor.health.y<0);
assert.ok(initial.anchor.attack.z>.095/2);
assert.deepEqual([faceShape.w,faceShape.h],[.47,.51]);
const model={matrix:'physical-card-transform'};
const unit={deployed:true,side:'ally',attack:3,hp:12,currentHp:12};
assert.equal(badge.draw(model,unit),2);
assert.equal(draws.length,2,'exactly two printed number badges');
assert.strictEqual(draws[0].m.base,model,'badge inherits exact parent matrix');
assert.strictEqual(draws[1].m.base,model);
assert.deepEqual(draws.map(d=>d.unlit),[true,true]);
assert.ok(draws[0].m.offset.x<0&&draws[1].m.offset.x>0);
assert.ok(labels.includes('3')&&labels.includes('12'),'both statistics rendered as digits');
assert.ok(labels.includes('⚔')&&labels.includes('♥'));
assert.equal(created.length,2,'first unit generates only two cached badge textures');
badge.draw(model,unit);
assert.equal(created.length,2,'idle frame reuses existing textures');
unit.currentHp=7;
badge.draw(model,unit);
assert.equal(created.length,3,'damage updates only the health texture');
assert.ok(labels.includes('7'),'health badge displays new current HP');
assert.equal(badge.draw(model,null),0,'non-unit facilities show no attack/HP badges');
assert.equal(badge.draw(model,{...unit,deployed:false}),0);
badge.dispose();
assert.equal(deleted.length,3,'cached GPU textures are safely released');
console.log('CARD_STAT_BADGES_PASS physical_3D_corner_anchors live_HP attack art_untouched texture_cache');
