import test from 'node:test';
import assert from 'node:assert/strict';
import {initialShop,join,apply,validate,resumeSolo} from './kiosk-core.js';
import {STORY_GRAPH,WORLD_LOCATIONS,validateStoryGraph,validateStoryState,
 createStory,ensureStory,storyNode,chooseStory,chooseAvatar,canTravel,travelTo,
 applyStoryAction,seeShopProgress} from './story-framework.js';
const start=()=>{const shop=initialShop();join(shop,'host','店长');ensureStory(shop);return shop;};
const choice=(shop,id)=>chooseStory(shop,id,shop.story.active);

test('black-comedy branching graph is well-formed and every branch has a terminal',()=>{
 assert.deepEqual(validateStoryGraph(),[]);
 assert.ok(Object.keys(STORY_GRAPH).length>=8);
 for(const node of Object.values(STORY_GRAPH))assert.ok(node.choices.length>0&&node.choices.every(c=>c.text&&c.effects));
 assert.ok(Object.keys(WORLD_LOCATIONS).length>=4);
});
test('story choices are host-authoritative, record memory and never apply twice',()=>{
 const s=start();assert.equal(storyNode(s.story).id,'notice');
 assert.equal(applyStoryAction(s,'visitor',{cmd:'storyChoice',key:'read',nodeId:'notice'}),false);
 assert.equal(applyStoryAction(s,'host',{cmd:'storyChoice',key:'read',nodeId:'notice'}),true);
 assert.equal(s.story.flags.read_notice,true);
 assert.equal(applyStoryAction(s,'host',{cmd:'storyChoice',key:'read',nodeId:'notice'}),false);
 assert.equal(choice(s,'tea'),true);assert.equal(s.story.flags.left_tea,true);
 assert.equal(choice(s,'laugh'),true);
 assert.deepEqual(s.story.memories.driver,['shared_joke']);
 assert.equal(choice(s,'promise'),true);
 assert.equal(s.story.active,null);assert.equal(s.story.history.length,4);
 assert.equal(choice(s,'promise'),false);
 assert.equal(validateStoryState(s.story),true);
 assert.equal(validate(s),true);
});
test('black comedy is not a morality score: alternate choices preserve distinct narrative memories',()=>{
 const a=start(),b=start();
 for(const [s,t] of [[a,'read'],[b,'ignore']]){
  choice(s,t);choice(s,'silence');
 }
 choice(a,'ask');choice(b,'quiet');
 assert.deepEqual(a.story.memories.driver,['asked_about_riders']);
 assert.deepEqual(b.story.memories.driver,['quiet_cup']);
 assert.equal(Boolean(a.story.flags.read_notice),true);
 assert.equal(Boolean(b.story.flags.avoided_notice),true);
 assert.equal(Boolean(a.story.flags.chose_silence),true);
});
test('world travel is bounded by adjacent streets and a visited bus stop fires unique event',()=>{
 const s=start();
 assert.equal(travelTo(s,'flats'),false);
 assert.equal(canTravel(s.story,'stop'),true);
 choice(s,'read');choice(s,'tea');choice(s,'quiet');choice(s,'promise');
 assert.equal(travelTo(s,'stop'),true);
 assert.equal(s.story.location,'stop');assert.equal(s.story.active,'stop_event');
 assert.equal(travelTo(s,'flats'),true);
 assert.equal(choice(s,'leave_note'),false,'cannot finish a bus stop dialogue from an apartment');
 assert.equal(travelTo(s,'stop'),true);
 assert.equal(choice(s,'leave_note'),true);
 assert.equal(s.story.flags.posted_last_bus,true);
 assert.deepEqual(s.story.memories.driver,['quiet_cup','helped_riders']);
 assert.ok(s.story.visited.includes('flats'));
 assert.equal(travelTo(s,'does_not_exist'),false);
});
test('purchase after dialogue triggers a followup, next day triggers the next chapter, both once',()=>{
 const s=start();s.windowOpen=true;
 choice(s,'ignore');choice(s,'tea');choice(s,'laugh');choice(s,'promise');
 const before={day:1,totalServed:0};
 assert.equal(apply(s,'host',{cmd:'slot',key:'shelfL1'}),true);
 assert.equal(apply(s,'host',{cmd:'counter'}),true);
 assert.equal(apply(s,'host',{cmd:'sell'}),true);
 assert.equal(seeShopProgress(s,before),true);
 assert.equal(s.story.active,'after_sale');
 assert.equal(seeShopProgress(s,before),false);
 choice(s,'listen');choice(s,'later');
 assert.deepEqual(s.story.memories.neighbor,['listened']);
 s.day=2;
 assert.equal(seeShopProgress(s,{day:1,totalServed:s.totalServed}),true);
 assert.equal(s.story.active,'day_two');
 choice(s,'stay');
 assert.equal(seeShopProgress(s,{day:1,totalServed:s.totalServed}),false);
});
test('avatar options persist across solo resume, repeated choice is not charged twice',()=>{
 const s=start();
 assert.equal(chooseAvatar(s,'female'),true);
 assert.equal(chooseAvatar(s,'female'),false);
 assert.equal(chooseAvatar(s,'unknown'),false);
 const copy=JSON.parse(JSON.stringify(s));
 resumeSolo(copy,'老板');
 assert.equal(copy.story.avatar,'female');
 assert.equal(validateStoryState(copy.story),true);
 assert.equal(applyStoryAction(copy,'solo',{cmd:'storyAvatar',key:'male'}),true);
 assert.equal(copy.story.avatar,'male');
});
test('forbidden effects and malformed graph pointers fail validation without executing code',()=>{
 const malicious={x:{id:'x',scene:'shop',speaker:'clerk',text:'bad',choices:[{id:'hack',text:'execute',next:'missing',effects:[{type:'eval',code:'danger'}]}]}};
 const errors=validateStoryGraph(malicious);
 assert.ok(errors.some(e=>e.includes('Forbidden')));
 assert.ok(errors.some(e=>e.includes('Dangling')));
});
