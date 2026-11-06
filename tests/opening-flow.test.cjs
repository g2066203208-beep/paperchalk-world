'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Opening=require('../site/game/opening-flow.js');
const story=require('../site/game/story-content.js');
function store(){const a=new Map();return {getItem:k=>a.get(k)||null,setItem:(k,v)=>a.set(k,v)}}
test('new-game starts bedroom wake-up prologue; classroom is not the active first scene',()=>{
  assert.ok(story.wakeup.length>=5);
  assert.match(story.wakeup[1].text,/睁开眼睛/);
  const state=Opening.create({lineCount:story.wakeup.length});
  assert.equal(state.snapshot().hasSave,false);
  const began=state.newGame();
  assert.equal(began.phase,'waking');
  assert.equal(began.line,0);
});
test('waking dialogue position is retained on Continue',()=>{
  const storage=store();
  const a=Opening.create({storage,lineCount:story.wakeup.length});
  a.newGame();assert.equal(a.progress(3),true);
  const b=Opening.create({storage,lineCount:story.wakeup.length});
  assert.equal(b.snapshot().phase,'waking');
  assert.equal(b.snapshot().line,3);
  assert.equal(b.finish(),true);
  const c=Opening.create({storage,lineCount:story.wakeup.length});
  assert.equal(c.snapshot().phase,'day');
  assert.equal(c.snapshot().hasSave,true);
});
test('screenshot stage and post-death prologue remain separate from roguelike battle simulation',()=>{
  const g=Opening.create({lineCount:story.wakeup.length});
  assert.equal(g.finish(),false);
  assert.equal(g.progress(2),false);
  assert.equal(g.newGame().phase,'waking');
  assert.equal(g.progress(-1),false);
  assert.equal(g.progress(10000),false);
  assert.equal(g.finish(),true);
});
