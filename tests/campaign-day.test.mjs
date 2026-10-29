import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame} from '../site/engine.js';
import {runtime,createWorld,applyWorld} from '../site/core/game.js';
import {FIRST_WEEK,SEASON_ARCS,todayStory,activeStoryBeat} from '../site/systems/campaign.js';
import {SECOND_WEEK} from '../site/content/second-week-story.js';
import {clockLabel} from '../site/systems/clock.js';
const begin=()=>{
 const legacy=initialGame();
 const world=createWorld(legacy,null);
 const skipped=applyWorld(world,{module:'origin',type:'prologue',step:'skip'},legacy);
 assert.equal(skipped.ok,true);
 return {legacy,world:skipped.state};
};
test('original date-based chapter starts in purchased bare office with two anonymous friends',()=>{
 const {legacy,world}=begin();
 assert.equal(legacy.day,1);assert.deepEqual(legacy.crew,['kai']);
 assert.equal(world.slices.origin.venue,'office');assert.equal(world.slices.origin.identityExposure,0);
 assert.equal(world.slices.campaign.actionsToday,0);assert.equal(world.slices.campaign.firstWeekOutcome,null);
 assert.match(clockLabel(1),/1998-09-07.*周一/);
 assert.equal(SEASON_ARCS.length,9);
 assert.equal(Object.keys(FIRST_WEEK).length,7);
 assert.equal(FIRST_WEEK[1].beats.length,2);
});
test('two daily scene activities use distinct location, evidence and clock phase, no free duplication',()=>{
 let {legacy,world}=begin();
 assert.equal(activeStoryBeat(world).venue,'alley');
 assert.equal(applyWorld(world,{module:'campaign',type:'scene-choice',choice:'hear'},legacy).ok,false,'cannot act from office');
 world=applyWorld(world,{module:'origin',type:'travel',to:'alley',via:'route-map'},legacy).state;
 let r=applyWorld(world,{module:'campaign',type:'scene-choice',choice:'hear'},legacy);
 assert.equal(r.ok,true,r.message);world=r.state;
 assert.equal(world.slices.campaign.actionsToday,1);
 assert.equal(world.slices.campaign.evidence,1);
 assert.deepEqual(r.effects.find(x=>x.kind==='time-phase'),{kind:'time-phase',to:2});
 assert.equal(applyWorld(world,{module:'campaign',type:'scene-choice',choice:'hear'},legacy).ok,false,'cannot replay same first beat');
 world=applyWorld(world,{module:'origin',type:'travel',to:'market',via:'route-map'},legacy).state;
 r=applyWorld(world,{module:'campaign',type:'scene-choice',choice:'witness'},legacy);
 assert.equal(r.ok,true,r.message);world=r.state;
 assert.equal(world.slices.campaign.actionsToday,2);
 assert.equal(world.slices.campaign.evidence,3);
 assert.equal(activeStoryBeat(world),null);
 assert.deepEqual(r.effects.find(x=>x.kind==='time-phase'),{kind:'time-phase',to:3});
 assert.equal(world.slices.origin.identityExposure,0);
});
test('full seven-day story produces persistent community end state, two choices per day',()=>{
 let {legacy,world}=begin();
 for(let day=1;day<=7;day++){
  assert.equal(world.day,day);
  const story=todayStory(world);assert.equal(story.beats.length,2);
  for(const target of story.beats){
   const go=applyWorld(world,{module:'origin',type:'travel',to:target.venue,via:'route-map'},legacy);
   assert.equal(go.ok,true,go.message);world=go.state;
   const pick=target.choices.find(x=>(x.benefits?.cash||0)>=0)||target.choices[0];
   const r=applyWorld(world,{module:'campaign',type:'scene-choice',choice:pick.id},legacy);
   assert.equal(r.ok,true,r.message);world=r.state;
  }
  assert.equal(world.slices.campaign.actionsToday,2);
  world=runtime.advance(world,{cash:200,heat:0,crew:legacy.crew,orders:[]}).state;
 }
 assert.equal(world.day,8);
 assert.equal(world.slices.campaign.history.length,14);
 assert.equal(world.slices.campaign.daySummaries.length,7);
 assert.equal(world.slices.campaign.firstWeekOutcome,'community-office');
 assert.ok(world.events.some(x=>x.type==='campaign.chapter'));
 assert.equal(world.slices.origin.identityExposure,0);
 assert.deepEqual(createWorld({...legacy,day:8},JSON.stringify(world)),world);
});
test('missing deadline gives a distinct, recoverable outcome, not a softlock',()=>{
 let {legacy,world}=begin();
 for(let i=0;i<7;i++)world=runtime.advance(world,{cash:190,heat:0,crew:legacy.crew,orders:[]}).state;
 assert.equal(world.day,8);
 assert.equal(world.slices.campaign.firstWeekOutcome,'fragile-start');
 assert.ok(world.events.some(x=>x.type==='campaign.chapter'));
 assert.ok(todayStory(world));
});
test('expired shift blocks story, monthly story structure remains calendar-consistent',()=>{
 let {legacy,world}=begin();
 world=applyWorld(world,{module:'origin',type:'travel',to:'alley',via:'route-map'},legacy).state;
 for(let i=0;i<2;i++)world=applyWorld(world,{module:'clock',type:'advance-shift'},legacy).state;
 assert.equal(world.slices.clock.shift,2);
 assert.equal(applyWorld(world,{module:'campaign',type:'scene-choice',choice:'hear'},legacy).ok,false);
 for(let day=2;day<=15;day++){const r=runtime.advance(world,{cash:190,heat:0,crew:legacy.crew,orders:[]});world=r.state;}
 assert.equal(world.day,15);assert.equal(todayStory(world).beats.length,2);
 assert.ok(SEASON_ARCS.find(c=>c.end===39));
});
test('campaign module migrates into already-existing world saves and never wipes earlier slices',()=>{
 const initial=initialGame(),world=createWorld(initial);
 const old=structuredClone(world);delete old.slices.campaign;
 const restored=createWorld(initial,JSON.stringify(old));
 assert.ok(restored.slices.campaign);
 assert.deepEqual(restored.slices.factions,world.slices.factions);
 assert.deepEqual(restored.slices.origin,world.slices.origin);
});

test('each of the first 15 dated days has two unique fully authored scene events',()=>{
 const episodes={...FIRST_WEEK,...SECOND_WEEK};
 assert.equal(Object.keys(episodes).length,15);
 const ids=[];
 for(let day=1;day<=15;day++){
   const entry=episodes[day];
   assert.equal(entry.beats.length,2,'DAY '+day);
   assert.ok(entry.title.length>3&&entry.deadline.length>5);
   for(const b of entry.beats){ids.push(b.id);assert.equal(b.choices.length,2);assert.ok(b.line.length>13);}
 }
 assert.equal(new Set(ids).size,30,'each scene uses a unique authored beat ID');
});
test('fifteen-day community narrative reaches an accountable chapter-one ending',()=>{
 let {legacy,world}=begin();
 for(let day=1;day<=15;day++){
   const episode=todayStory(world);
   assert.equal(episode.beats.length,2);
   for(const b of episode.beats){
     const traveled=applyWorld(world,{module:'origin',type:'travel',via:'route-map',to:b.venue},legacy);
     assert.equal(traveled.ok,true);world=traveled.state;
     const pick=b.choices.find(c=>(c.benefits.cash||0)>=0)||b.choices[0];
     const r=applyWorld(world,{module:'campaign',type:'scene-choice',choice:pick.id},legacy);
     assert.equal(r.ok,true,r.message);world=r.state;
   }
   world=runtime.advance(world,{cash:700,heat:0,crew:legacy.crew,orders:[]}).state;
 }
 assert.equal(world.day,16);
 assert.equal(world.slices.campaign.history.length,30);
 assert.equal(world.slices.campaign.daySummaries.length,15);
 assert.ok(['charter-founded','community-in-progress'].includes(world.slices.campaign.firstChapterOutcome));
 assert.ok(world.events.some(e=>e.type==='campaign.chapter'));
 assert.ok(todayStory(world)?.beats?.length===2,'Chapter II is now authored and immediately playable');
});
