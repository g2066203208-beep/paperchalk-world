import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,deserialize,serialize,travel,act,advanceTime,hasClue,gainClue,isOpen,goal,dateLabel,PLACES,CLUES} from '../engine.mjs';

test('fresh start and locale date are stable',()=>{
  const s=createGame();
  assert.equal(s.day,1);assert.equal(s.period,1);
  assert.equal(dateLabel(s).short,'04/06');assert.equal(dateLabel(s).day,'星期一');
  assert.equal(s.location,'campus');assert.equal(s.mission,'offered');
});
test('versioned save round-trips and rejects bad input',()=>{
  const s=createGame();
  assert.deepEqual(deserialize(serialize(s)),s);
  assert.equal(deserialize('not json'),null);
  assert.equal(deserialize(JSON.stringify({...s,schema:2})),null);
  assert.equal(deserialize(JSON.stringify({...s,location:'unknown'})),null);
  assert.equal(deserialize(JSON.stringify({...s,period:99})),null);
  assert.equal(deserialize(JSON.stringify({...s,clues:['__unknown']})),null);
});
test('all map nodes have finite percentages and no fabricated destinations',()=>{
  for(const place of Object.values(PLACES)){
    assert.ok(place.name.length>1);assert.ok(place.x>0&&place.x<90);
    assert.ok(place.y>0&&place.y<80);
  }
  const s=createGame();
  assert.match(travel(s,'wrong').error,/未知/);
  assert.match(travel(s,'gallery').error,/展馆/);
  act(s,'accept');assert.equal(isOpen(s,'gallery'),true);
  assert.equal(travel(s,'gallery').title,'抵达 · 雾港展馆');
});
test('clues are unique and reference stable locations',()=>{
  const s=createGame();
  for(const [id,c] of Object.entries(CLUES)){assert.ok(PLACES[c.place]);assert.equal(gainClue(s,id),true);assert.equal(gainClue(s,id),false);assert.equal(hasClue(s,id),true);}
  assert.equal(s.clues.length,4);
  assert.equal(gainClue(s,'nonsense'),false);
});
test('class, work, rest and day-wrap change meaningful state',()=>{
  const s=createGame();s.period=0;
  act(s,'class');assert.equal(s.study,62);assert.equal(s.period,1);
  const oldCash=s.cash;act(s,'work');assert.equal(s.cash,oldCash+65);
  const oldEnergy=s.energy;act(s,'rest');assert.ok(s.energy>=oldEnergy);
  assert.equal(s.period,3);
  advanceTime(s);assert.equal(s.period,0);assert.equal(s.day,2);
  assert.equal(s.flags.rumor,true);
});
test('friendship choice changes trust and can be refused',()=>{
  const good=createGame(),distant=createGame();
  act(good,'natsu-friendly');act(distant,'natsu-distance');
  assert.ok(good.trust.natsu>distant.trust.natsu);
  assert.notEqual(good.period,distant.period);
});
test('all accepted mission conclusions are distinct',()=>{
  const outcomes=[
    {action:'outcome-protect',expected:'protect'},
    {action:'outcome-obey',expected:'obey'},
    {action:'outcome-expose',expected:'truth'}
  ];
  for(const {action,expected} of outcomes){
    const s=createGame();
    act(s,'accept');
    ['photo','receipt','timetable'].forEach(id=>gainClue(s,id));
    act(s,'theory-fake');act(s,action);
    assert.equal(s.outcome,expected);assert.equal(s.mission,'resolved');
    assert.match(goal(s),/已经结束/);
  }
});
test('exposing unsupported theory results in an uncertain ending',()=>{
  const s=createGame();act(s,'accept');act(s,'outcome-expose');
  assert.equal(s.outcome,'uncertain');
});
test('declining a mission does not freeze day progression',()=>{
  const s=createGame();act(s,'refuse');
  assert.equal(s.mission,'refused');assert.equal(s.flags.refusedMission,true);
  act(s,'study');assert.equal(s.period,2);
  assert.match(goal(s),/拒绝/);
});
test('mission deadline cannot create permanent blocked progress',()=>{
  const s=createGame();act(s,'accept');
  for(let i=0;i<22;i++)advanceTime(s);
  assert.equal(s.mission,'resolved');assert.equal(s.outcome,'expired');
  const date=s.day;act(s,'next');assert.ok(s.day>=date);
});
