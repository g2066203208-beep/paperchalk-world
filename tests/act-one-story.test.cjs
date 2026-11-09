const test=require('node:test');
const assert=require('node:assert/strict');
const Arc=require('../site/game/act-one-story.js');
function storage(){
  const values=new Map();
  return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v))};
}
const school=day=>({day,location:'school'});
const home=day=>({day,location:'classmate-home'});

test('day one confession is a single school scene, private company identity remains hidden',()=>{
  const arc=Arc.create({storage:storage()});
  const first=arc.enter(school(1));
  assert.equal(first.id,'confession');
  assert.ok(first.lines.some(x=>x.speaker==='女神'&&x.text.includes('喜欢你')));
  assert.ok(first.lines.some(x=>x.effect==='kiss'));
  assert.ok(!first.lines.some(x=>x.text.includes('天使金币')||x.text.includes('天使公司')));
  assert.equal(arc.enter(school(1)).id,'afterConfession');
  assert.equal(arc.enter(school(1)),null);
});

test('the falling body appears only during the day three classroom lesson',()=>{
  const arc=Arc.create({storage:storage()});
  arc.enter(school(1));arc.enter(school(1));
  arc.enter(school(2));
  assert.equal(arc.enter(school(3)),null);
  const beat=arc.study(school(3));
  assert.equal(beat.id,'beforeFall');
  assert.equal(beat.lines.filter(x=>x.effect==='fall').length,1);
  assert.ok(beat.lines.some(x=>x.text.includes('窗外')));
  assert.equal(arc.study(school(3)),null);
  assert.equal(arc.enter(school(4)).id,'aftermath');
});

test('missed days progress: no retroactive kiss or faked witnessed fall',()=>{
  const arc=Arc.create({storage:storage()});
  assert.equal(arc.enter(school(4)).id,'heardFall');
  assert.equal(arc.enter(school(4)).id,'aftermath');
  assert.equal(arc.enter(school(6)).id,'boyDeath');
  assert.equal(arc.enter(school(6)),null);
  assert.equal(arc.enter(school(8)).id,'emptySeats');
  assert.equal(arc.enter(school(8)),null);
});

test('the two deaths do not force optional investigation',()=>{
  const arc=Arc.create({storage:storage()});
  arc.enter(school(4));arc.enter(school(4));arc.enter(school(6));
  assert.equal(arc.snapshot().clues.length,0);
  assert.equal(arc.snapshot().boyDead,true);
  assert.equal(arc.snapshot().girlDead,true);
});

test('optional clues survive reload without revealing an unproven cause of death',()=>{
  const drive=storage(),arc=Arc.create({storage:drive});
  const note=arc.talk(school(4),'girl-desk');
  assert.equal(note.clue,'desk-note');
  const boy=arc.talk(school(4),'boy');
  assert.equal(boy.clue,'boy-told');
  const r=arc.home(home(6),'records');
  assert.equal(r.clue,'home-records');
  assert.ok(r.lines.some(x=>x.text.includes('赠送')));
  const later=Arc.create({storage:drive});
  assert.equal(later.knew('home-records'),true);
  assert.equal(later.knew('desk-note'),true);
  assert.equal(later.talk(school(8),'conclusion').id,'conclusion');
  later.reset();
  assert.equal(later.snapshot().seen.length,0);
  assert.equal(later.snapshot().clues.length,0);
});

test('the boy can be visited only at home and after his death date',()=>{
  const arc=Arc.create({storage:storage()});
  assert.equal(arc.home(school(6),'entry'),null);
  assert.equal(arc.home(home(5),'entry'),null);
  assert.equal(arc.home(home(6),'entry').id,'homeArrival');
  assert.equal(arc.home(home(6),'entry').id,'homeQuiet');
});
