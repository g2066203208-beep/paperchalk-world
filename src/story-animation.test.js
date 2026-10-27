import test from 'node:test';
import assert from 'node:assert/strict';
import {CUE_CLIPS,evaluateCue,createCuePlayer} from './story-animation.js';
import {createStory,WORLD_LOCATIONS} from './story-framework.js';
import {renderStoryWorld} from './story-world-render.js';

test('all narrative cues are bounded deterministic finite keyframe tracks',()=>{
 for(const [id,c] of Object.entries(CUE_CLIPS)){
  assert.ok(c.ms>0);
  assert.equal(evaluateCue(id,0).progress,0);
  const end=evaluateCue(id,c.ms);
  assert.equal(end.progress,1);assert.equal(end.done,true);
  for(const time of [0,c.ms*.1,c.ms*.45,c.ms*.82,c.ms,c.ms*2]){
   const a=evaluateCue(id,time),b=evaluateCue(id,time);
   assert.deepEqual(a,b);
   assert.ok(Number.isFinite(a.offsetX)&&Number.isFinite(a.offsetY));
  }
  assert.equal(evaluateCue(id,0,true).progress,1,'reduced motion skips extra animation');
 }
 assert.equal(evaluateCue('danger',12),null);
});
test('cue player restarts only when narrative events change and never mutates story state',()=>{
 const player=createCuePlayer(),story=createStory();
 story.lastCue='paper_rattle';
 const old=JSON.stringify(story);
 assert.equal(player.sample(story,100).progress,0);
 assert.ok(player.sample(story,350).progress>0);
 story.active='clerk_remark';story.history.push({node:'notice',choice:'read'});
 assert.equal(player.sample(story,360).progress,0);
 assert.equal(player.sample(story,360,true).progress,1);
 assert.notEqual(JSON.stringify(story),old);
 player.reset();assert.equal(player.sample(story,1000).progress,0);
});
test('map scenes have independent geometry and click targets on vertical and landscape views',()=>{
 const g=new Proxy({},{get:(target,key)=>target[key]??(()=>{}),set:(target,key,val)=>(target[key]=val,true)});
 for(const [W,H] of [[320,568],[390,844],[844,390],[1280,720]]){
  for(const location of Object.keys(WORLD_LOCATIONS)){
   const s={story:{location}};
   const hits=renderStoryWorld(g,s,{W,H},17,{motion:true,storyCue:evaluateCue('paper_rattle',200)});
   assert.equal(hits.length,2);
   for(const h of hits){
    assert.ok(h.w>=44&&h.h>=44);
    assert.ok(h.x>=0&&h.y>=0&&h.x+h.w<=W+1&&h.y+h.h<=H+1);
   }
  }
 }
});
