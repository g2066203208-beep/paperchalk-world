import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {DISTRICTS,CONFIG,createGame,act,actionInfo,resolveEvent,eventInfo,restore,ownedCount,weeklyFinance} from '../site/engine.js';
const go=(s,action,id)=>{const r=act(s,action,id);assert.equal(r.ok,true,r.message);return r.state;};
test('repo now hosts standalone gang-management game, not old deck combat',()=>{
 const html=readFileSync('site/index.html','utf8'),app=readFileSync('site/app.js','utf8');
 assert.match(html,/夜港/);assert.match(html,/id="district-list"/);assert.match(html,/id="action-list"/);
 assert.match(html,/id="next-week"/);assert.match(app,/localStorage/);
 assert.equal(existsSync('site/rules.js'),false);
 assert.equal(existsSync('site/board.js'),false);
 assert.equal(existsSync('site/case-data.js'),false);
 assert.ok(existsSync('.github/workflows/apk.yml'));
 assert.match(readFileSync('android/app/src/main/java/com/paperchalk/lampkeep/MainActivity.java','utf8'),/github\.io\/paperchalk-world/);
});
test('real zero-to-empire starting conditions',()=>{
 const s=createGame();assert.equal(s.cash,320);assert.equal(s.crew,1);assert.equal(ownedCount(s),0);
 assert.equal(DISTRICTS.length,5);assert.equal(DISTRICTS.reduce((a,d)=>a+s.zones[d.id].level,0),0);
 assert.equal(s.week,1);assert.equal(s.selected,'dock');
});
test('contacts, weekly street earning, hire, business and payroll are functional',()=>{
 let s=createGame();
 s=go(s,'hustle','dock');assert.ok(s.cash>320);assert.ok(s.heat>7);
 assert.equal(act(s,'hustle','dock').ok,false);
 s=go(s,'network','dock');assert.ok(s.zones.dock.influence>=38);
 s=go(s,'recruit','dock');assert.equal(s.crew,2);
 assert.equal(actionInfo(s,'open','dock').ok,false);
 s=go(s,'next');
 assert.equal(s.week,2);
 for(let i=0;i<12&&s.cash<DISTRICTS[0].cost;i++){
   if(s.zones.dock.worked!==s.week)s=go(s,'hustle','dock');
   else{
     s=go(s,'next');
     if(s.event){const decision=resolveEvent(s,'b');assert.equal(decision.ok,true);s=decision.state;}
   }
 }
 assert.ok(s.cash>=DISTRICTS[0].cost);
 s=go(s,'open','dock');
 assert.equal(s.zones.dock.level,1);
 assert.ok(weeklyFinance(s).income>0);
});
test('control requires money, influence, crew and reputation',()=>{
 let s=createGame();
 assert.equal(actionInfo(s,'claim','dock').ok,false);
 for(let t=0;t<10;t++){
  if(s.zones.dock.influence>=65)break;
  if(s.cash<200) s=go(s,'hustle','dock');
  const info=actionInfo(s,'network','dock');
  if(info.ok)s=go(s,'network','dock');
  else{s=go(s,'next');if(s.event)s=resolveEvent(s,'b').state;}
 }
 assert.ok(s.zones.dock.influence>=65);
 assert.equal(actionInfo(s,'claim','dock').ok,false);
});
test('cashflow, deterministic city events and options change state',()=>{
 let s=createGame();
 const starting=s.cash;
 s=go(s,'next');assert.equal(s.week,2);assert.equal(s.cash,starting-weeklyFinance(createGame()).wages);
 s=go(s,'next');assert.equal(s.week,3);
 assert.ok(s.event,'week 3 must produce a decision event');
 assert.equal(act(s,'next').ok,false);
 const e=eventInfo(s);assert.ok(e);
 const a=resolveEvent(s,'b');assert.equal(a.ok,true);assert.equal(a.state.event,null);
 assert.ok(a.state.log.some(x=>x.title===e.title));
});
test('save validation rejects corrupt and stale old-game data',()=>{
 const s=createGame();
 assert.deepEqual(restore(JSON.stringify(s)),s);
 const bad=structuredClone(s);bad.zones.dock.level=9;
 assert.deepEqual(restore(bad),createGame());
 assert.deepEqual(restore('invalid JSON'),createGame());
 assert.deepEqual(restore(JSON.stringify({version:2})),createGame());
});
test('milestone is not awarded at start and game can continue after winning',()=>{
 const s=createGame();assert.equal(s.won,false);assert.equal(CONFIG.goalDistricts,5);
});
