'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../site/card-battle/engine/scene-transitions.js'),'utf8'),ctx);
const events=[];
const stage=ctx.window.PaperchalkSceneTransitions.create({
 scenes:['forest','clearing'],initial:'forest',exitDuration:.6,enterDuration:.9,
 onExit:(before,after)=>events.push('exit:'+before+':'+after),
 onSwap:(before,after)=>events.push('swap:'+before+':'+after),
 onEnter:(before,after)=>events.push('enter:'+before+':'+after),
 onComplete:id=>events.push('done:'+id)
});
assert.equal(stage.scene,'forest');assert.equal(stage.toggle(0),true);
assert.equal(stage.busy,true);assert.equal(stage.toggle(.2),false,'no interrupted transitions');
assert.equal(stage.scene,'forest');
stage.update(.59);assert.equal(stage.phase,'exiting');
stage.update(.60);assert.equal(stage.scene,'clearing');assert.equal(stage.phase,'entering');
stage.update(1.49);assert.equal(stage.busy,true);
stage.update(1.51);assert.equal(stage.busy,false);
assert.equal(stage.snapshot(1.51).completed,1);
assert.deepEqual(events,['exit:forest:clearing','swap:forest:clearing','enter:forest:clearing','done:clearing']);
assert.equal(stage.begin('forest',2),true);
stage.update(2.6);stage.update(3.55);
assert.equal(stage.scene,'forest');assert.equal(stage.busy,false);
stage.reset('clearing');
assert.equal(stage.scene,'clearing');assert.equal(stage.busy,false);
console.log('SCENE_TRANSITIONS_OK exit_swap_enter_reverse no_interruption');
