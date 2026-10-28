import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame} from '../site/engine.js';
import {createWorld,applyWorld} from '../site/core/game.js';
import {PROLOGUE_BEATS,currentBeat} from '../site/content/prologue-story.js';
const action=(w,step,choice)=>applyWorld(w,{module:'origin',type:'prologue',step,choice},initialGame());
test('actual authored story has names, forgotten wages, masked legend and two orphanage brothers',()=>{
 const script=PROLOGUE_BEATS.map(x=>x.line).join(' ');
 assert.ok(PROLOGUE_BEATS.length>=10);
 for(const term of ['孤儿院','蒙面人','工钱','一百九十','办公室'])assert.ok(script.includes(term),term);
 const w=createWorld(initialGame(),null);
 assert.equal(w.slices.origin.prologue.status,'active');
 assert.equal(w.slices.origin.officePurchased,true);
 assert.equal(w.slices.origin.identityExposure,0);
 assert.equal(w.slices.factions.cells.some(c=>c.owner==='player'),false);
 assert.equal(initialGame().crew.length,1);
});
test('choice changes brother response and community trust, but gives no free money or territory',()=>{
 let w=createWorld(initialGame(),null);
 for(let i=0;i<9;i++){const r=action(w,'next');assert.equal(r.ok,true,r.message);w=r.state;}
 assert.equal(currentBeat(w.slices.origin.prologue).id,'decision');
 assert.equal(action(w,'next').ok,false);
 const result=action(w,'choose','street-first');assert.equal(result.ok,true,result.message);w=result.state;
 assert.equal(w.slices.origin.prologue.decision,'street-first');
 assert.match(currentBeat(w.slices.origin.prologue).line,/先去听听他们怎么说/);
 assert.equal(w.slices.origin.streetTrust,9);
 assert.equal(w.slices.origin.identityExposure,0);
 let count=0;
 while(w.slices.origin.prologue.status==='active'&&count++<5){
  const r=action(w,'next');assert.equal(r.ok,true,r.message);w=r.state;
 }
 assert.equal(w.slices.origin.prologue.status,'complete');
 assert.equal(action(w,'next').ok,false);
 assert.equal(initialGame().cash,190);
});
test('alternatively choose long-term office work or skip scene without changes to location',()=>{
 let w=createWorld(initialGame(),null);
 for(let i=0;i<9;i++)w=action(w,'next').state;
 const r=action(w,'choose','build-first');
 assert.equal(r.ok,true);
 assert.match(currentBeat(r.state.slices.origin.prologue).line,/总靠拳头/);
 const skip=action(createWorld(initialGame()),'skip');
 assert.equal(skip.ok,true);assert.equal(skip.state.slices.origin.venue,'office');
 assert.equal(skip.state.slices.origin.prologue.status,'complete');
 assert.equal(skip.state.slices.origin.identityExposure,0);
});
test('prologue is not retriggered when old saved world lacks the new optional field',()=>{
 let w=createWorld(initialGame());
 delete w.slices.origin.prologue;
 const restored=createWorld(initialGame(),JSON.stringify(w));
 assert.ok(restored.slices.origin);
 assert.equal(restored.slices.origin.prologue,undefined);
});
