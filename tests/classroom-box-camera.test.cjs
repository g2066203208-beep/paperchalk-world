'use strict';
const assert=require('node:assert/strict');
const api=require('../site/game/classroom-box-runtime.js');
const close=(a,b,epsilon=1e-9)=>
  assert.ok(Math.abs(a-b)<=epsilon, a+' != '+b);
const base=api.camera(0,0);
const fixed={x:api.BASE_CAMERA.x,y:api.BASE_CAMERA.y,z:api.BASE_CAMERA.z};
assert.deepEqual({x:base.x,y:base.y,z:base.z},fixed);
close(base.yaw,0);close(base.pitch,0);
close(api.pointerAxis(.03),0);
close(api.pointerAxis(-.06),0);
close(api.pointerAxis(1),1);
close(api.pointerAxis(-1),-1);
const right=api.camera(1,0),left=api.camera(-1,0);
const up=api.camera(0,-1),down=api.camera(0,1);
assert.ok(right.yaw>0 && left.yaw<0,'right mouse must LOOK right');
assert.ok(up.pitch>0 && down.pitch<0,'up mouse must LOOK up');
close(right.yaw,7*Math.PI/180);
close(up.pitch,3.8*Math.PI/180);
close(api.camera(1,0,0).yaw,0);
close(api.camera(1,0,1.5).yaw,10.5*Math.PI/180);
close(api.camera(9,-99).yaw,right.yaw);
close(api.camera(-9,99).yaw,left.yaw);
for(const x of [-1,-.5,0,.5,1]){
  for(const y of [-1,-.4,0,.4,1]){
    for(const strength of [0,.5,1,1.5]){
      const c=api.camera(x,y,strength);
      assert.deepEqual({x:c.x,y:c.y,z:c.z},fixed,
        'mouse may only turn the camera from a fixed standing point');
      assert.ok(Math.abs(c.yaw)<=7*Math.PI/180*strength+1e-9);
      assert.ok(Math.abs(c.pitch)<=3.8*Math.PI/180*strength+1e-9);
      close(c.hFov,base.hFov);
    }
  }
}
// Pure rotation alters the viewing direction, not world point distances or
// the camera pivot. Do NOT require fake distance-dependent dolly parallax.
const w=1280,h=720,point=[0,1.22,8];
const p0=api.project(point,base,w,h);
const pr=api.project(point,right,w,h);
const pu=api.project(point,up,w,h);
assert.ok(pr.x<p0.x,'looking right moves central world point left on screen');
assert.ok(pu.y>p0.y,'looking up moves central world point down on screen');
const distance=c=>Math.hypot(point[0]-c.x,point[1]-c.y,point[2]-c.z);
close(distance(base),distance(right));
close(distance(base),distance(up));
// The recently painted wall/floor PNGs were rejected. The real WebGL
// five-plane geometry remains, with the earlier neutral materials restored.
const fs=require('node:fs');
const path=require('node:path');
for(const face of ['back','floor']){
 assert.equal(api.MATERIALS[face],'./assets/room-box/'+face+'.svg');
 assert.ok(fs.existsSync(path.join(__dirname,'../site/assets/room-box/'+face+'.svg')));
 assert.ok(!fs.existsSync(path.join(__dirname,'../site/assets/room-box/'+face+'.png')),
  'rejected new material must be absent');
}
// Four different world-space actors; player cropped foreground and a
// three-enemy evenly spaced straight row, projected by this same camera.
const ids=Object.keys(api.CHARACTERS);
assert.deepEqual(ids,['player','enemy','enemy2','enemy3']);
const shot=Object.fromEntries(ids.map(id=>[id,api.actorGeometry(id,base,1280,720)]));
assert.ok(shot.player.head.y/720>.15&&shot.player.head.y/720<.25);
assert.ok(shot.player.shoe.y>720*1.20,'foreground shoes are below camera frame');
// Full-bleed ultrawide 844x390 must EXPAND the horizontal field of view,
// not push enemy shoes under the screen or resize the cast relative to height.
const wideW=844,wideH=390;
const ultrawide=Object.fromEntries(ids.map(id=>[id,api.actorGeometry(id,base,wideW,wideH)]));
close(api.focalLength(base,wideW,wideH)/wideH,
      api.focalLength(base,1280,720)/720,1e-8);
for(const id of ids){
 close(ultrawide[id].drawnHeight/wideH,shot[id].drawnHeight/720,1e-8);
}
assert.ok(ultrawide.player.head.y/wideH>.15&&ultrawide.player.head.y/wideH<.25);
for(const id of ['enemy','enemy2','enemy3']){
 const shoe=ultrawide[id].shoe;
 assert.ok(shoe.x>0&&shoe.x<wideW&&shoe.y>0&&shoe.y<wideH,
   id+' must keep both shoes visible in full-bleed mobile landscape: '+JSON.stringify(shoe));
}
for(const id of ['enemy','enemy2','enemy3']){
 assert.ok(shot[id].shoe.y<720&&shot[id].shoe.y>720*.73,
  id+' foot must stay visible in midground');
 assert.ok(shot[id].head.y>720*.30&&shot[id].head.y<720*.48,
  id+' head must be fully in frame');
}
// Strict 3D line-up: equal world Y and Z, equal screen foot baseline,
// nearly identical visual size (only individual physical heights differ).
for(const id of ['enemy2','enemy3']){
 close(api.CHARACTERS[id].y,api.CHARACTERS.enemy.y);
 close(api.CHARACTERS[id].z,api.CHARACTERS.enemy.z);
 close(shot[id].shoe.y,shot.enemy.shoe.y);
 close(ultrawide[id].shoe.y,ultrawide.enemy.shoe.y);
 assert.ok(Math.abs(shot[id].drawnHeight/shot.enemy.drawnHeight-1)<.025);
}
const leftGap=shot.enemy2.shoe.x-shot.enemy.shoe.x;
const rightGap=shot.enemy3.shoe.x-shot.enemy2.shoe.x;
assert.ok(Math.abs(leftGap-rightGap)<2,'three enemies must have equal horizontal gaps');
assert.ok(shot.enemy.shoe.x<shot.enemy2.shoe.x);
assert.ok(shot.enemy2.shoe.x<shot.enemy3.shoe.x);
// Cast must occupy distinct thirds with clear horizontal gaps, and the
// heroine must be a cropped close-up on the left, not a full-body doll.
const projected=Object.fromEntries(ids.map(id=>[id,api.actorGeometry(id,base,1280,720)]));
assert.ok(projected.player.head.x<300);
assert.ok(projected.enemy.shoe.x>520&&projected.enemy.shoe.x<700);
assert.ok(projected.enemy2.shoe.x>790&&projected.enemy2.shoe.x<980);
assert.ok(projected.enemy3.shoe.x>1000&&projected.enemy3.shoe.x<1230);
assert.ok(projected.enemy2.shoe.x-projected.enemy.shoe.x>200);
assert.ok(projected.enemy3.shoe.x-projected.enemy2.shoe.x>190);
assert.equal(api.BASE_CAMERA.hFov,60);
assert.ok(api.buildMesh().shadows.length>4*32*3,'each actor needs a 3D floor contact patch');
assert.deepEqual(api.FACES.find(face=>face.id==='floor').vertices,
  [[-4.8,0,0],[-4.8,0,8],[4.8,0,8],[4.8,0,0]],
  'original 9.6x8m physical floor geometry must remain unchanged');
assert.equal(api.FACES.length,5);
assert.equal(api.buildMesh().faceCount,5);
console.log('PASS 3D first-person head look: fixed camera XYZ, matched pointer axes, ±7° yaw / ±3.8° pitch, deadzone and no dolly');
