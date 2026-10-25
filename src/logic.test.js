import test from "node:test";
import assert from "node:assert/strict";
import {createGame,makeQueue,joinGame,leaveGame,act,currentVisitor,revealedClue,testPatterns,STATIONS} from "./logic.js";

test("nights are seeded reproducibly, with nine distinct visitor events",()=>{
 for(let i=1;i<=120;i++){const q=makeQueue(i);assert.deepEqual(q,makeQueue(i));assert.equal(q.length,9);assert.equal(new Set(q).size,9);
  assert.ok(q.indexOf("umbrella")<q.indexOf("knock"),"copy appears after original");
 }
});
test("all visitors have an answer and each distinct station reveals contextual evidence",()=>{
 const ids=testPatterns();assert.equal(ids.length,9);
 assert.ok(ids.some(x=>x.human));assert.ok(ids.some(x=>!x.human));
 for(let s of [1,2,3]){const g=createGame(s);joinGame(g,"solo","测试");for(const station of STATIONS){
   assert.equal(revealedClue(g,station),null);
   assert.equal(act(g,"solo",{type:"inspect",station}),true);
   assert.ok(revealedClue(g,station)?.length>10);
 }}
});
test("shared investigation and clue pinning work, with per-player role selection",()=>{
 const g=createGame(345);joinGame(g,"a","柜员");joinGame(g,"b","窗边");
 assert.equal(act(g,"a",{type:"station",station:"ledger"}),true);
 assert.equal(act(g,"b",{type:"station",station:"window"}),true);
 assert.equal(g.players.a.station,"ledger");assert.equal(g.players.b.station,"window");
 assert.equal(act(g,"a",{type:"pin",station:"ledger"}),false);
 assert.equal(act(g,"a",{type:"inspect",station:"ledger"}),true);
 assert.equal(act(g,"b",{type:"pin",station:"ledger"}),true);
 assert.deepEqual(g.pins,["ledger"]);
 assert.equal(act(g,"a",{type:"inspect",station:"invalid"}),false);
});
test("2-player judgments need agreement and advance the same shared visitor",()=>{
 const g=createGame(123);joinGame(g,"a","甲");joinGame(g,"b","乙");
 assert.equal(act(g,"a",{type:"vote",choice:"welcome"}),true);
 assert.equal(g.index,0);
 assert.equal(act(g,"b",{type:"vote",choice:"refuse"}),true);
 assert.equal(g.index,0,"disagreement remains unresolved");
 assert.equal(act(g,"b",{type:"vote",choice:"welcome"}),true);
 assert.equal(g.index,1);assert.equal(g.history.length,1);
 assert.deepEqual(g.votes,{});assert.deepEqual(g.pins,{} instanceof Array?[]:[]);
});
test("visitors can't forge actions from strangers or inject invalid choices",()=>{
 const g=createGame(93);joinGame(g,"host","值班员");
 assert.equal(act(g,"intruder",{type:"vote",choice:"welcome"}),false);
 assert.equal(act(g,"host",{type:"vote",choice:"overwrite"}),false);
 assert.equal(act(g,"host",{type:"inspect",station:"../test"}),false);
 assert.equal(act(g,"host",null),false);
 assert.equal(g.index,0);
});
test("four is the party maximum and a leave changes majority quorum",()=>{
 const g=createGame(455);
 for(let i=0;i<4;i++)assert.equal(joinGame(g,"p"+i,"玩家"+i),true);
 assert.equal(joinGame(g,"fifth","后来者"),false);
 assert.equal(joinGame(g,"p1","重复"),false);
 act(g,"p0",{type:"vote",choice:"refuse"});act(g,"p1",{type:"vote",choice:"refuse"});
 assert.equal(g.index,0,"two of four is not enough");
 leaveGame(g,"p3");assert.equal(g.index,0);
 act(g,"p2",{type:"vote",choice:"refuse"});assert.equal(g.index,1);
});
test("after nine visits the night ends, saves a journal, and keeps scores in bounds",()=>{
 const g=createGame(17);joinGame(g,"a","唯一店员");
 for(let i=0;i<9&&g.phase==="running";i++){
  const c=currentVisitor(g);assert.ok(c);act(g,"a",{type:"vote",choice:testPatterns().find(x=>x.id===c.id).human?"welcome":"refuse"});
 }
 assert.equal(g.phase,"complete");assert.equal(g.index,9);assert.equal(g.history.length,9);
 assert.ok(g.points>=9*60);
 assert.ok(g.trust>=0&&g.trust<=8);
 assert.equal(act(g,"a",{type:"inspect",station:"counter"}),false);
});
