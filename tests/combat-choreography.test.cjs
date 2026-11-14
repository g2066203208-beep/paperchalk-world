'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({window:{},Math});
vm.runInContext(fs.readFileSync(path.join(__dirname,
 '../site/card-battle/engine/combat-choreography.js'),'utf8'),ctx);
const combat=ctx.window.PaperchalkCombatChoreography.create();
let hits=0,finishes=0;
const args={
 attackerId:'woodcutter',targetId:'forest-foe-a',kind:'attack',at:10,
 from:{x:0,y:0,z:5},to:{x:-5,y:0,z:0},damage:3,
 onImpact:()=>hits++,onFinish:()=>finishes++
};
assert.equal(combat.start(args),true);
assert.equal(combat.start(args),false,'no double animation or overlapping damage');
const idle=combat.pose('forest-foe-a',10.1);
assert.equal(idle.dx,0,'victim does not move before contact');
assert.ok(Math.hypot(combat.pose('woodcutter',10.18).dx,
 combat.pose('woodcutter',10.18).dz)>.1,'attacker must burst toward victim');
combat.update(10.20);
assert.equal(hits,0,'no premature damage before impact');
combat.update(10.23);
assert.equal(hits,1,'damage occurs exactly once at impact');
combat.update(10.25);
assert.equal(hits,1,'hitstop cannot cause repeated damage');
const stopped1=combat.pose('woodcutter',10.220);
const stopped2=combat.pose('woodcutter',10.252);
assert.ok(Math.abs(stopped1.dx-stopped2.dx)<1e-9,'48 ms visual hitstop');
assert.ok(combat.visible(10.25)?.alpha>.0,'a short slash overlays the impact');
assert.ok(combat.pose('forest-foe-a',10.27).hit>0,'victim recoils at impact');
combat.update(10.67);
assert.equal(finishes,1);
assert.equal(combat.busy,false);
assert.equal(combat.pose('woodcutter',10.8).dx,0,'no idle wobble after action');
assert.equal(combat.snapshot.last.hitFired,true);
assert.ok(combat.snapshot.last.completedAt>10.6);
// An enemy guard is a short active brace, not a perpetual idle movement.
let guarded=0;
assert.equal(combat.start({
 attackerId:'forest-foe-b',targetId:'forest-foe-b',
 kind:'guard',at:11,from:{x:3,y:0,z:0},to:{x:3,y:0,z:0},
 onImpact:()=>guarded++
}),true);
assert.ok(combat.pose('forest-foe-b',11.19).scale>1.03);
combat.update(11.30);
assert.equal(guarded,1);
combat.update(11.8);
assert.equal(combat.busy,false);
assert.equal(combat.pose('forest-foe-b',12).scale,1);
console.log('COMBAT_CHOREOGRAPHY_OK player_attack hitstop recoil event_once guard_brace idle_static');
