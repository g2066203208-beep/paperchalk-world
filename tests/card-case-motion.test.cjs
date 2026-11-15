'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx=vm.createContext({window:{},Math,Map,Set,Array,Object,Number,Error});
vm.runInContext(fs.readFileSync(path.join(__dirname,
 '../site/card-battle/engine/card-case-motion.js'),'utf8'),ctx);
const caseFX=ctx.window.PaperchalkCardCaseMotion.create({
 openDuration:.48,closeDuration:.34});
assert.equal(caseFX.transform(0,2.8).phase,'closed');
assert.ok(caseFX.transform(0,2.8).y< -2.8,'tray truly hides below bottom edge');
caseFX.setOpen(true,1);
assert.equal(caseFX.transform(1,2.8).phase,'opening');
assert.ok(caseFX.transform(1.15,2.8).y<0);
assert.ok(caseFX.transform(1.15,2.8).y>caseFX.transform(1,2.8).y);
assert.equal(caseFX.transform(1.25,2.8).interactive,true,
 'interaction becomes available during late entrance, never while hidden');
assert.equal(caseFX.transform(1.5,2.8).phase,'open');
assert.ok(Math.abs(caseFX.transform(1.5,2.8).y)<.00001);
caseFX.setOpen(false,2);
assert.equal(caseFX.transform(2.02,2.8).phase,'closing');
assert.ok(caseFX.transform(2.2,2.8).y<0);
assert.equal(caseFX.transform(2.2,2.8).interactive,false,
 'closing drawer cannot steal clicks from the board');
const mid=caseFX.transform(2.2,2.8).y;
caseFX.setOpen(true,2.2);
const reversed=caseFX.transform(2.2,2.8).y;
assert.ok(Math.abs(mid-reversed)<.000001,
 'reverse during slide must preserve instantaneous position, no snap');
assert.equal(caseFX.transform(2.7,2.8).phase,'open');
assert.equal(caseFX.transform(2.7,2.8).interactive,true);
caseFX.reset(false);
assert.equal(caseFX.transform(3,2.8).phase,'closed');
console.log('CARD_CASE_SLIDE_PASS real_bottom_slide interruptible_reversal hitbox_lifecycle');
