import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialGame,restore,setOrder,endDay,answerPhone,markGunSeen,availableCrew,DISTRICTS,CREW} from '../site/engine.js';
test('original anime office contains six playable in-world objects',()=>{
 const html=readFileSync('site/index.html','utf8');
 for(const name of ['phone','map','reports','ledger','gun','calendar']) assert.ok(html.includes('data-open="'+name+'"'),name);
 assert.ok(html.includes('class="office-svg"'));assert.ok(html.includes('class="character-figure"'));
 assert.equal(DISTRICTS.length,4);assert.ok(CREW.length>=9);
});
test('route assignment and real subordinate reports after day resolution',()=>{
 let s=initialGame();
 assert.equal(s.cash,190);assert.equal(s.day,1);assert.deepEqual(s.crew,['kai']);
 s.crew.push('mio'); // Compatibility test: simulate a properly signed adult employee.
 let r=setOrder(s,'kai','harbor','deliver');assert.equal(r.ok,true);s=r.state;
 assert.equal(setOrder(s,'kai','market','scout').ok,false);
 r=setOrder(s,'mio','market','network');assert.equal(r.ok,true);s=r.state;
 assert.equal(s.cash,165);assert.equal(availableCrew(s).length,0);
 r=endDay(s);assert.equal(r.ok,true);s=r.state;
 assert.equal(s.day,2);assert.equal(r.generated.length,2);
 assert.ok(s.cash>165);assert.ok(s.zones.market.influence>8);
 assert.ok(s.reports.length===3);assert.ok(s.ledger.length>=4);
 assert.deepEqual(restore(JSON.stringify(s)),s);
});
test('phone and story prop actions persist, invalid old saves reset',()=>{
 let s=initialGame();
 assert.equal(answerPhone(s,'yes').state.cash,275);
 s=answerPhone(s,'yes').state;
 assert.equal(answerPhone(s,'no').ok,false);
 assert.equal(endDay(s).ok,true);
 s=markGunSeen(s).state;assert.equal(s.flags.gunSeen,true);
 assert.deepEqual(restore(JSON.stringify(s)),s);
 assert.deepEqual(restore(JSON.stringify({version:3})),initialGame());
 const bad=initialGame();bad.zones.harbor.pressure=999;
 assert.deepEqual(restore(bad),initialGame());
});
test('legal five-day progression does not hand out members for free',()=>{
 let s=initialGame();
 for(let i=0;i<5;i++){
  if(!s.call.answered)s=answerPhone(s,'yes').state;
  for(const id of availableCrew(s)){
   const task=id==='kai'?'deliver':id==='mio'?'network':'scout';
   const r=setOrder(s,id,id==='kai'?'harbor':'market',task);
   if(r.ok)s=r.state;
  }
  const r=endDay(s);assert.equal(r.ok,true,r.message);s=r.state;
 }
 assert.equal(s.day,6);assert.deepEqual(s.crew,['kai']);assert.ok(s.reports.length>=6);
 assert.ok(s.cash>190);assert.ok(s.respect>=1);
});
