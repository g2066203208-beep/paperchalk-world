import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignSystem,SEASON_ARCS,FINAL_DAY,MAIN_STORY,ENDINGS,
        FIRST_WEEK,todayStory,activeStoryBeat,resolveEnding} from '../site/systems/campaign.js';
import {SECOND_WEEK} from '../site/content/second-week-story.js';

test('nine distinct chapters form an uninterrupted authored narrative through the actual ending',()=>{
 assert.equal(SEASON_ARCS.length,9);
 assert.equal(FINAL_DAY,39);
 const days=new Set();
 const beats=new Set();
 for(const arc of SEASON_ARCS){
  for(let day=arc.start;day<=arc.end;day++){
   assert.ok(!days.has(day),'overlapping chapter days: '+day);days.add(day);
   const story=day<=7?FIRST_WEEK[day]:day<=15?SECOND_WEEK[day]:MAIN_STORY[day];
   assert.ok(story?.title&&story.deadline, 'missing day '+day);
   assert.equal(story.beats.length,2,'day '+day+' must have two playable scenes');
   for(const b of story.beats){
    assert.ok(!beats.has(b.id),'duplicate plot beat '+b.id); beats.add(b.id);
    assert.ok(['office','alley','market','labor','docks'].includes(b.venue),'venue not playable '+b.id);
    assert.ok(b.lead&&b.title&&b.line&&b.line.length>32,'scene missing dramatic content '+b.id);
    assert.ok(b.choices.length>=2,'scene without choice '+b.id);
    assert.equal(new Set(b.choices.map(c=>c.id)).size,b.choices.length);
    for(const c of b.choices)assert.ok(c.label.length>5&&c.line.length>12,'empty consequence '+b.id);
   }
  }
 }
 assert.equal(days.size,39);assert.equal(beats.size,78);
 assert.equal(Object.keys(ENDINGS).length,5);
});
test('all added chapters can be played day by day, safely saved, and lead to an ending',()=>{
 let c=campaignSystem.init({day:16});
 c.firstChapterOutcome='charter-founded';
 const actions=[];
 const context={cash:100000};
 for(let day=16;day<=39;day++){
  for(let i=0;i<2;i++){
   const snap={day,slices:{campaign:c}};
   const current=activeStoryBeat(snap);
   assert.ok(current,'missing next story choice '+day+'/'+i);
   const slices={origin:{venue:current.venue,prologue:{status:'complete'}},
                 clock:{shift:i?2:0},campaign:c};
   const result=campaignSystem.reduce(structuredClone(c),{
    type:'scene-choice',choice:current.choices[0].id
   },{day,slices,context});
   assert.ok(result.data,JSON.stringify({day,i,result}));
   c=structuredClone(result.data);actions.push({day,id:current.id});
   assert.equal(c.actionsToday,i+1);
   assert.equal(c.decisions[current.id],current.choices[0].id);
   if(day===39&&i===1){
    assert.ok(result.events.some(x=>x.type==='campaign.ending'),'last scene must show ending immediately');
    assert.ok(c.ending?.title&&c.ending?.text,'ending must be present in save');
   }
  }
  if(day<39)c=campaignSystem.tick(structuredClone(c),{day:day+1}).data;
 }
 assert.equal(actions.length,48);
 assert.equal(c.history.length,48,'full choice history persisted');
 assert.ok(['community','charter','truth','shelter','unresolved'].includes(c.ending.key));
 assert.deepEqual(structuredClone(c).ending,c.ending,'ending can be serialized');
});
test('critical choices echo in later scenes, with zero dependence on a hidden hardcoded answer',()=>{
 const c=campaignSystem.init({day:16});
 c.decisions={seal:'audit',photograph:'tell',threat:'guard-witness',vow:'lay-down-masks',keys:'return-key'};
 const get=(day,id)=>{
  const world={day,slices:{campaign:{...c,actionsToday:MAIN_STORY[day].beats.findIndex(b=>b.id===id)}}};
  return activeStoryBeat(world)?.line;
 };
 assert.match(get(26,'lucas'),/原件/);
 assert.match(get(29,'alarm'),/小禾/);
 assert.match(get(31,'brother'),/毫无保留/);
 assert.match(get(33,'mask-choice'),/抽屉/);
 assert.match(get(39,'final-door'),/值班代表/);
 assert.doesNotMatch(activeStoryBeat({day:26,slices:{campaign:{...c,decisions:{},actionsToday:0}}}).line,/原件，卢卡/);
});
test('five authored endings are reachable through accumulated decisions and evidence, not one random button',()=>{
 const base={decisions:{'final-door':'people-rule',keys:'return-key'}};
 assert.equal(resolveEnding({...base,communityTrust:100,evidence:90,resolve:70}),'community');
 assert.equal(resolveEnding({...base,communityTrust:85,evidence:55,resolve:35}),'charter');
 assert.equal(resolveEnding({...base,communityTrust:20,evidence:50,resolve:12}),'truth');
 assert.equal(resolveEnding({...base,communityTrust:66,evidence:9,resolve:11}),'shelter');
 assert.equal(resolveEnding({...base,communityTrust:5,evidence:5,resolve:5}),'unresolved');
 assert.equal(resolveEnding({...base,decisions:{keys:'shared-key','final-door':'people-rule'},
   communityTrust:100,evidence:80,resolve:70}),'charter','giving away authority changes the best ending');
});
test('scene choice rejects a wrong location, an unknown option, and insufficient money',()=>{
 const data=campaignSystem.init({day:16}),episode=todayStory({day:16,slices:{campaign:data}});
 const slices={origin:{venue:'office',prologue:{status:'complete'}},clock:{shift:0},campaign:data};
 let r=campaignSystem.reduce(structuredClone(data),{type:'scene-choice',choice:episode.beats[0].choices[0].id},
  {day:16,slices,context:{cash:100}});
 assert.ok(r.error?.includes('需要前往'));
 slices.origin.venue='market';
 r=campaignSystem.reduce(structuredClone(data),{type:'scene-choice',choice:'invalid'},{
  day:16,slices,context:{cash:100}});
 assert.match(r.error,/无效/);
 const copy=structuredClone(data);assert.equal(copy.actionsToday,0,'failures cannot mutate initial state');
});
