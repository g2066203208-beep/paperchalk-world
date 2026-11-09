'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const camera=require('../site/game/phone-world-camera.js');
test('game phone camera crops the ACTUAL game scene within source bounds',()=>{
  const x=camera.cropFor(1440,810,360,540,1,0,0);
  assert.equal(x.height,810);
  assert.equal(x.width,540);
  assert.equal(x.x,450);
  assert.equal(x.y,0);
  const right=camera.cropFor(1440,810,360,540,1,1,0);
  assert.equal(right.x,900);
  const left=camera.cropFor(1440,810,360,540,1,-1,0);
  assert.equal(left.x,0);
  const zoom=camera.cropFor(1440,810,360,540,2,0,0);
  assert.equal(zoom.height,405);
  assert.equal(zoom.width,270);
  assert.ok(zoom.x>=0&&zoom.x+zoom.width<=1440);
  assert.ok(zoom.y>=0&&zoom.y+zoom.height<=810);
});
test('all player device webcam capture APIs have been removed from phone code',()=>{
  const phone=fs.readFileSync(path.join(__dirname,'../site/game/phone-ui.js'),'utf8');
  const capture=fs.readFileSync(path.join(__dirname,'../site/game/phone-world-camera.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
  for(const text of [phone,capture]){
    assert.ok(!text.includes('getUserMedia'),'device camera API must not be called');
    assert.ok(!text.includes('mediaDevices'),'phone must not request hardware');
    assert.ok(!text.includes('openRealCamera'),'old real camera must be removed');
  }
  assert.ok(html.includes('phone-world-camera.js'));
  assert.ok(phone.includes('openGameCamera(copy,live=false)'));
  assert.ok(phone.includes('camera.move('));
  assert.ok(phone.includes('camera.shot()'));
});
