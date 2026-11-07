'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../site/game/daily-life-state.js');
const memory=()=>{
 const bag=new Map();
 return {getItem:k=>bag.get(k)||null,setItem:(k,v)=>bag.set(k,v)};
};
test('in-game messages persist with both sender and NPC reply',()=>{
 const storage=memory(),game=Core.create({storage});
 assert.equal(game.sendPhoneMessage('female2','今天我会去学校。').ok,true);
 assert.equal(game.sendPhoneMessage('unknown','test').ok,false);
 const thread=game.snapshot().phoneThreads.female2;
 assert.equal(thread.length,2);
 assert.equal(thread[0].from,'me');assert.equal(thread[1].from,'female2');
 assert.equal(Core.create({storage}).snapshot().phoneThreads.female2.length,2);
});
test('calls consume game minutes and are recorded',()=>{
 const game=Core.create();
 const before=game.snapshot().minute;
 const res=game.phoneCall('female2',true);
 assert.equal(res.ok,true);assert.equal(res.answered,true);
 assert.equal(game.snapshot().minute,before+4);
 assert.equal(game.snapshot().phoneCalls[0].video,true);
});
test('photography, forum publishing, and transit gossip remain in saved world',()=>{
 const storage=memory(),game=Core.create({storage});
 const photo=game.addPhonePhoto('data:image/jpeg;base64,SGVsbG8=');
 assert.equal(photo.ok,true);
 assert.equal(game.publishSocial('公园附近的路口有点奇怪。',photo.photoId).ok,true);
 assert.equal(game.recordTransitRumor('train-a','听见有人讨论道路施工。').discovered,true);
 assert.equal(game.recordTransitRumor('train-a','听见有人讨论道路施工。').alreadyKnown,true);
 const saved=Core.create({storage}).snapshot();
 assert.equal(saved.mediaPhotos.length,1);
 assert.equal(saved.socialPosts.length,1);
 assert.equal(saved.transitRumors.length,1);
});
test('invalid media input and empty posts are rejected',()=>{
 const game=Core.create();
 assert.equal(game.addPhonePhoto('<script>no</script>').ok,false);
 assert.equal(game.publishSocial('', '').ok,false);
});
