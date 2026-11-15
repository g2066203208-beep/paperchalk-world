'use strict';
// Pure animation: never reads deck rules or creates/discards a card.
const assert=require('node:assert/strict'),vm=require('node:vm'),
 fs=require('node:fs'),path=require('node:path');
const ctx=vm.createContext({window:{},Math,Map,Set,Number,Error});
vm.runInContext(fs.readFileSync(path.join(__dirname,
 '../site/card-battle/engine/card-hand-motion.js'),'utf8'),ctx);
const motion=ctx.window.PaperchalkCardHandMotion.create();
const from={x:-3,y:-4,scale:.47},target={x:2,y:-2,scale:1.06,angle:.08};
motion.drawCard({ownerId:'woodcutter',instance:'woodcutter-strike',from,at:1});
const at=(time)=>motion.drawPose('woodcutter-strike',target,time);
const peel=at(1.04);
assert.equal(peel.phase,'peel');
assert.equal(peel.x,-3);
assert.ok(peel.y>from.y,'card must first lift from its own pile');
const flying=at(1.30);
assert.equal(flying.phase,'flight');
assert.ok(flying.x>from.x&&flying.x<target.x);
assert.ok(flying.y>Math.min(from.y,target.y),
 'card rises into a lifted non-linear arc');
assert.ok(flying.scale>from.scale,'card grows to readable hand size');
const settling=at(1.53);
assert.equal(settling.phase,'settle');
assert.ok(Math.abs(settling.x-target.x)<.20,'settle around destination');
assert.equal(at(1.70),null,'finished timelines are removed');
assert.equal(motion.stats(1.70).activeFlights.length,0);
const hit=motion.deckPose('woodcutter',1.10,.9);
assert.ok(hit.scale>1,'pile has hover size plus button-click recoil');
assert.ok(hit.lift>.1,'pile top physically lifts');
motion.selectCard('woodcutter-strike',2);
const select=motion.selectPose('woodcutter-strike',2.04);
assert.ok(select.punch>0,'selection has its own independent spring pulse');
let pose=motion.settle('woodcutter-strike',{x:0,y:-2,scale:1,angle:0},3);
assert.equal(pose.x,0);
motion.tick(3,['woodcutter-strike']);
pose=motion.settle('woodcutter-strike',{x:4,y:-2,scale:1,angle:.2},3.016);
assert.ok(pose.x>0&&pose.x<4,'neighbour reflow interpolates without teleporting');
motion.tick(3.016,['woodcutter-strike']);
motion.returnCard('woodcutter-strike',{x:5,y:1,scale:1.19},4);
const returning=motion.returnPose('woodcutter-strike',
 {x:0,y:-2,scale:1.06,angle:0},4.17);
assert.equal(returning.phase,'return');
assert.ok(returning.x>0&&returning.x<5,
 'invalid drop travels back, it never teleports to the hand');
assert.ok(returning.y>-2);
assert.equal(motion.stats(4.17).activeReturns.length,1);
assert.equal(motion.returnPose('woodcutter-strike',
 {x:0,y:-2,scale:1.06,angle:0},4.5),null);
motion.reset();
assert.equal(motion.stats(4).handPoseCount,0);
console.log('CARD_HAND_MOTION_PASS peel arc spring recoil selected_punch reflow elastic_return');
