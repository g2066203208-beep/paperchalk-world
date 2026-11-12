/* node tests/daily-life.test.cjs */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Life=require('../site/game/daily-life-state.js');
function memory(){
  const map=new Map();
  return {getItem:key=>map.get(key)||null,
    setItem:(key,value)=>map.set(key,value),
    removeItem:key=>map.delete(key)};
}
test('starts Monday April 13 at 07:00; device clock never advances game time',()=>{
  const game=Life.create();
  const first=game.snapshot(),second=game.snapshot();
  assert.equal(first.calendar.time,'07:00');
  assert.equal(first.calendar.weekdayLabel,'周一');
  assert.equal(second.minute,first.minute);
  assert.equal(first.day,1);
  assert.equal(first.location,'bedroom');
  assert.equal(first.money,260);
});
test('validates travel, location opening time and coherent end arrival',()=>{
  const g=Life.create();
  assert.equal(g.travel('invalid').ok,false);
  assert.equal(g.travel('school').ok,false);
  assert.equal(g.act('rest').ok,true);
  assert.equal(g.travel('entrance').ok,true);
  assert.equal(g.travel('school').ok,true);
  assert.equal(g.snapshot().location,'school');
  assert.equal(g.act('study').ok,true);
  assert.equal(g.snapshot().knowledge,2);
});
test('rejected location modules are gone',()=>{
  const g=Life.create();
  for(const id of ['convenience','cafe','mall','park']){
    assert.equal(Life.LOCATIONS[id],undefined);
    assert.equal(g.travel(id).ok,false);
  }
  assert.equal(g.act('shift').ok,false);
  assert.equal(g.act('exercise').ok,false);
});
test('buying, eating and existing survival hunger HUD bridge',()=>{
  let events=[];const g=Life.create({onStatEvent:e=>events.push(e)});
  assert.equal(g.use('bread').ok,true);
  assert.ok(events.some(e=>e.type==='eat'&&e.amount===28));
  assert.equal(g.snapshot().inventory.bread,0);
  assert.equal(g.use('bread').ok,false);
  assert.equal(g.buy('bread').ok,false);
  assert.equal(g.snapshot().inventory.bread,0);
});
test('NPC has time, place, workday and once per day constraints',()=>{
  const g=Life.create();
  g.act('rest');g.travel('entrance');g.travel('school');
  assert.equal(g.talk('classmate').ok,false);
  g.act('study');
  assert.equal(g.talk('classmate').ok,true);
  assert.equal(g.talk('classmate').ok,false);
  assert.equal(g.snapshot().relationships.classmate,1);
});
test('sleep before 22:00 safely advances the calendar and world pressure',()=>{
  const g=Life.create();
  assert.equal(g.sleep().ok,true);
  assert.equal(g.snapshot().day,2);
  assert.equal(g.snapshot().minute,360);
  assert.equal(g.snapshot().nightStatus,'day');
  assert.equal(g.snapshot().worldPressure,4);
});
test('world society progresses by GAME days even if main story never advances',()=>{
  const g=Life.create();
  for(let i=0;i<6;i++)assert.equal(g.sleep().ok,true);
  assert.equal(g.snapshot().day,7);
  assert.equal(g.snapshot().stage,2);
  assert.equal(g.snapshot().stageInfo.title,'异常频发期');
  assert.equal(g.snapshot().worldPressure,14);
  for(let i=0;i<15;i++)g.sleep();
  assert.equal(g.snapshot().stage>=3,true);
});
test('staying awake to 22:00 triggers mandatory recall; cannot use late sleep to skip',()=>{
  const g=Life.create();
  for(let i=0;i<15;i++)g.act('rest');
  assert.equal(g.snapshot().minute,1320);
  assert.equal(g.snapshot().nightStatus,'recalled');
  assert.equal(g.sleep().ok,false);
  assert.equal(g.act('tidy').ok,false);
  assert.equal(g.recordNightReturn({completed:false}).ok,false);
  assert.equal(g.recordNightReturn({completed:true}).ok,true);
  assert.equal(g.snapshot().day,2);
  assert.equal(g.snapshot().minute,360);
});
test('game save is isolated and persists money, relationships, usage and date',()=>{
  const storage=memory(),g=Life.create({storage});
  g.act('rest');g.travel('entrance');g.travel('school');g.act('study');g.talk('classmate');
  const original=g.snapshot();
  const reloaded=Life.create({storage}).snapshot();
  assert.equal(reloaded.day,original.day);
  assert.equal(reloaded.minute,original.minute);
  assert.equal(reloaded.knowledge,2);
  assert.equal(reloaded.relationships.classmate,1);
  assert.equal(reloaded.dailyUses['talk-classmate'],1);
  assert.equal(reloaded.stage,original.stage);
});
test('corrupt persisted state cannot inject unknown locations, NaN or negative money',()=>{
  const storage=memory();
  storage.setItem(Life.KEY,JSON.stringify({
    version:1,day:2,minute:999999,location:'../../bad',
    money:-1,energy:400,knowledge:Infinity,
    inventory:{bread:-5,water:99999}
  }));
  const s=Life.create({storage}).snapshot();
  assert.equal(s.location,'bedroom');
  assert.equal(s.money,0);
  assert.equal(s.energy,100);
  assert.equal(s.inventory.bread,0);
  assert.equal(s.inventory.water,999);
  assert.equal(s.nightStatus,'recalled');
});
test('misconfigured storage and unknown actions fail safely',()=>{
  const g=Life.create({storage:{getItem:()=>'{bad json',setItem:()=>{throw Error('blocked')}}});
  assert.equal(g.snapshot().day,1);
  assert.equal(g.persist(),false);
  assert.equal(g.act('infinite-money').ok,false);
  assert.equal(g.buy('expensive-gun').ok,false);
  assert.equal(g.talk('unknown-person').ok,false);
});

test('morning phone contains six missed calls and three homework reminders',()=>{
  const store=memory(),g=Life.create({storage:store});
  const inbox=g.phoneInbox();
  assert.equal(inbox.contact,'女二');
  assert.equal(inbox.missedCalls.length,6);
  assert.equal(inbox.messages.length,3);
  assert.match(inbox.messages[2].text,/学校/);
  assert.equal(g.replyHomework('coming').ok,false);
  assert.equal(g.markPhoneRead('messages').ok,true);
  assert.equal(g.replyHomework('coming').ok,true);
  assert.equal(g.snapshot().phone.reply,'coming');
  assert.equal(Life.create({storage:store}).snapshot().phone.reply,'coming');
});
test('school gate and 09:00 assignment deadline are real game-time rules',()=>{
  const g=Life.create();
  assert.equal(g.travel('school').ok,false,'home needs exit first');
  assert.equal(g.inspectHomework().ok,true);
  assert.equal(g.snapshot().homework.inspected,true);
  assert.equal(g.travel('entrance').ok,true);
  assert.equal(g.travel('school').ok,true);
  assert.equal(g.snapshot().calendar.time,'07:50');
  assert.equal(g.finishHomework().ok,true);
  assert.equal(g.submitHomework().ok,true);
  assert.equal(g.snapshot().homework.handedIn,true);
  assert.equal(g.snapshot().relationships.female2,57);
  assert.equal(g.submitHomework().ok,false);
});
test('retained school travel requires the home entrance both ways',()=>{
 const g=Life.create();
 assert.equal(g.travel('school').ok,false,'cannot teleport out of bedroom');
 assert.equal(g.travel('entrance').ok,true);
 assert.equal(g.travel('school').ok,true);
 assert.equal(g.travel('bedroom').ok,false,'city cannot teleport directly home');
 assert.equal(g.travel('entrance').ok,true);
 assert.equal(g.snapshot().location,'entrance');
});
test('legacy saves in deleted locations return to entrance without erasing a game save',()=>{
 const storage=memory();
 for(const location of ['convenience','cafe','mall','park']){
   const old=Life.defaultState();
   old.location=location;
   storage.setItem(Life.KEY,JSON.stringify(old));
   const restored=Life.create({storage}).snapshot();
   assert.equal(restored.location,'entrance');
   assert.equal(restored.day,1);
 }
});
