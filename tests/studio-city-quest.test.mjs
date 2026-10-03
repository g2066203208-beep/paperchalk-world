import test from 'node:test';
import assert from 'node:assert/strict';
import {CityPrologueQuest,CITY_QUEST_STEPS} from '../studio/ui/CityQuest.mjs';

function memoryStorage(){
  const data=new Map();
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
}

test('the school-to-home prologue advances through four ordered city goals',()=>{
  const quest=new CityPrologueQuest({storage:memoryStorage(),now:()=>10});
  assert.equal(quest.snapshot().step.id,'store');
  assert.equal(quest.update(9).advanced,false);
  assert.equal(quest.update(9.5).toIndex,1);
  assert.equal(quest.snapshot().step.id,'central');
  assert.equal(quest.update(810).toIndex,3);
  assert.equal(quest.snapshot().step.id,'home');
  assert.equal(quest.update(1290).completedNow,true);
  assert.equal(quest.snapshot().completed,true);
});

test('restored far-city positions catch quest progress up and persist independently',()=>{
  const storage=memoryStorage(),quest=new CityPrologueQuest({storage,now:()=>99});
  quest.update(500);
  assert.equal(quest.snapshot().index,2);
  const restored=new CityPrologueQuest({storage});
  assert.equal(restored.load().snapshot.index,2);
  assert.equal(restored.snapshot().step.id,'river');
});

test('corrupt quest saves and invalid positions fail safely without touching player saves',()=>{
  const storage=memoryStorage();
  storage.setItem('paperworld.city-prologue.quest.v1','{"version":1,"index":99}');
  const quest=new CityPrologueQuest({storage});
  assert.equal(quest.load().status,'corrupt');
  assert.equal(quest.snapshot().index,0);
  quest.update(Infinity);
  assert.equal(quest.snapshot().index,0);
  quest.update(CITY_QUEST_STEPS.at(-1).triggerX);
  assert.equal(quest.snapshot().completed,true);
  quest.reset();
  assert.equal(quest.snapshot().index,0);
});
