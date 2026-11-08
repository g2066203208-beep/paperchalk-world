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

test('phone notes and edited contact remarks persist with existing save data',()=>{
 const storage=memory(),game=Core.create({storage});
 assert.equal(game.savePhoneNote(null,'楼梯口','放学后看到的告示').ok,true);
 const note=game.snapshot().phoneNotes[0];
 assert.equal(note.title,'楼梯口');
 assert.equal(game.savePhoneNote(note.id,'楼梯口','记录已补充').ok,true);
 assert.equal(game.setContactRemark('female2','早上催作业的人').ok,true);
 assert.equal(game.setContactRemark('neighbor','不应出现').ok,false);
 const restored=Core.create({storage}).snapshot();
 assert.equal(restored.phoneNotes[0].text,'记录已补充');
 assert.equal(restored.contactRemarks.female2,'早上催作业的人');
 assert.equal(game.deletePhoneNote(note.id).ok,true);
 assert.equal(Core.create({storage}).snapshot().phoneNotes.length,0);
});
test('conversations have independent persistent unread counters',()=>{
 const storage=memory(),game=Core.create({storage});
 game.sendPhoneMessage('female2','周末见');
 assert.equal(game.snapshot().phoneUnread.female2,1);
 assert.equal(game.markThreadRead('female2').ok,true);
 assert.equal(game.snapshot().phoneUnread.female2,0);
 assert.equal(game.markThreadRead('female2').unchanged,true);
 assert.equal(game.sendPhoneMessage('neighbor','你好').ok,false);
 assert.equal(Core.create({storage}).snapshot().phoneUnread.female2,0);
});
test('save sanitizer rejects oversized phone notes and caps unread values',()=>{
 const raw=Core.defaultState();
 raw.phoneNotes=[{id:'x',title:'合法记录',text:'还在这里',day:1,minute:420},
  {id:'y',title:'异常',text:'a'.repeat(2000),day:1,minute:420}];
 raw.phoneUnread.female2=10000;
 const safe=Core.sanitize(raw);
 assert.equal(safe.phoneNotes.length,1);
 assert.equal(safe.phoneUnread.female2,40);
 assert.equal(safe.phoneNotes[0].text,'还在这里');
});
