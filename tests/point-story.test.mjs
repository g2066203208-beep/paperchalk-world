import test from 'node:test';
import assert from 'node:assert/strict';
import {VERSION,createGame,loadGame,clock,inspect,choose,useAction,isEscapeReady,enterClassroom} from '../site/card-game/point-story-engine.mjs';

function prepare(){
 const s=createGame();
 choose(s,'continue');
 inspect(s,'notice');
 inspect(s,'living');
 inspect(s,'radio');
 inspect(s,'phone');
 inspect(s,'foyer');
 inspect(s,'door');
 choose(s,'listen');
 inspect(s,'door');
 choose(s,'wait');
 return s;
}
test('original chapter begins in 302 without 3D or combat, first-person 2D scenes',()=>{
 const s=createGame();assert.equal(VERSION,1);assert.equal(s.scene,'foyer');
 assert.equal(clock(s),'18:47');assert.equal(s.rules.length,0);
 assert.equal(loadGame(JSON.stringify(s)).scene,'foyer');
});
test('evidence and timing are required for safe exit, not random guessing',()=>{
 const s=prepare();
 assert.equal(isEscapeReady(s),true);
 assert.ok(s.rules.includes('notice')&&s.rules.includes('radio')&&s.rules.includes('listened'));
 inspect(s,'door');assert.equal(choose(s,'unlock'),true);
 assert.equal(s.scene,'hallway');assert.equal(s.ending,null);
 inspect(s,'stairs');assert.equal(s.scene,'stairs');
 inspect(s,'exit');assert.equal(s.ending.type,'survived');
 assert.equal(loadGame(JSON.stringify(s)).ending.type,'survived');
});
test('opening before understanding three knocks has a deterministic bad ending',()=>{
 const s=createGame();
 inspect(s,'door');choose(s,'unlock');
 assert.equal(s.ending.type,'lost');
 assert.equal(s.scene,'foyer');
 assert.equal(inspect(s,'living'),false);
});
test('peephole violates notice without spawning characters or random damage',()=>{
 const s=createGame();
 inspect(s,'notice');
 const old=s.attention;
 assert.equal(inspect(s,'peephole'),true);
 assert.equal(s.scene,'peephole');assert.ok(s.attention>old);
 assert.equal(inspect(s,'back'),true);assert.equal(s.scene,'foyer');
});
test('elevator is an intentional alternate bad ending; stairs can succeed',()=>{
 const s=prepare();inspect(s,'door');choose(s,'unlock');
 inspect(s,'elevator');choose(s,'takeLift');assert.equal(s.ending.type,'lost');
});
test('waiting before verifying the recorded warning does not grant safe departure',()=>{
 const s=createGame();
 inspect(s,'door');choose(s,'wait');
 assert.equal(s.flags.waited,false);assert.ok(s.attention>0);
});
test('actions, key loot and save validation',()=>{
 const s=createGame();
 inspect(s,'cabinet');assert.ok(s.inventory.includes('302室钥匙'));
 inspect(s,'notice');assert.ok(s.rules.includes('notice'));
 useAction(s,'breathe');assert.equal(s.attention,0);
 assert.ok(clock(s).startsWith('18:'));
 assert.throws(()=>loadGame('{}'));
 assert.throws(()=>loadGame({...s,scene:'unknown'}));
 assert.throws(()=>loadGame({...s,rules:['fake']}));
});

test('classroom is an explorable separate 2D scene without altering original rule-horror route',()=>{
 const s=createGame();choose(s,'continue');inspect(s,'living');
 assert.equal(enterClassroom(s),true);assert.equal(s.scene,'classroom');
 for(const id of ['girl','board','desks','windows'])assert.equal(inspect(s,id),true);
 assert.equal(inspect(s,'back'),true);assert.equal(s.scene,'living');
 assert.equal(s.ending,null);assert.equal(loadGame(JSON.stringify(s)).scene,'living');
});
