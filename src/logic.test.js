import test from "node:test";
import assert from "node:assert/strict";
import {createGame,makeFloor,addPlayer,removePlayer,step,inputSanitize,hash} from "./logic.js";

test("procedural floors are deterministic, connected, and contain exactly one boss",()=>{
 for(let seed=0;seed<50;seed++){
  const a=makeFloor(seed,1),b=makeFloor(seed,1);
  assert.deepEqual(a,b);
  assert.equal(Object.values(a).filter(r=>r.type==="boss").length,1);
  assert.equal(Object.values(a).filter(r=>r.type==="treasure").length,1);
  const visited=new Set(["0,0"]),queue=[a["0,0"]];
  while(queue.length){const r=queue.pop();for(const [d,x,y] of [["n",0,-1],["s",0,1],["e",1,0],["w",-1,0]]){
    if(!r.doors.includes(d))continue;const k=(r.x+x)+","+(r.y+y);assert.ok(a[k]);if(!visited.has(k)){visited.add(k);queue.push(a[k]);}
  }}
  assert.equal(visited.size,Object.keys(a).length);
 }
});
test("unique player IDs and max four player party enforced",()=>{
 const g=createGame(41);
 for(let i=0;i<4;i++)assert.equal(addPlayer(g,"p"+i,"成员"+i),true);
 assert.equal(addPlayer(g,"p5","额外玩家"),false);
 assert.equal(addPlayer(g,"p0","重复"),false);
 removePlayer(g,"p2");assert.equal(addPlayer(g,"p5","新队友"),true);
});
test("untrusted network inputs are clamped and nonfinite numbers ignored",()=>{
 const i=inputSanitize({mx:999,my:-999,fx:Infinity,fy:0,bomb:"true"});
 assert.ok(Math.hypot(i.mx,i.my)<=1.000001);
 assert.equal(i.fx,0);assert.equal(i.fy,0);assert.equal(i.bomb,false);
 assert.deepEqual(inputSanitize(null),{mx:0,my:0,fx:0,fy:0,bomb:false});
});
test("game starts in cleared sanctuary with no enemies and a valid room",()=>{
 const g=createGame(777);addPlayer(g,"host","房主");
 assert.equal(g.floor,1);assert.equal(g.room,"0,0");assert.equal(g.rooms[g.room].cleared,true);
 step(g,{host:{mx:0,my:0,fx:0,fy:0}},1/60);
 assert.equal(g.enemies.length,0);assert.equal(g.players.host.hp,6);
});
test("clear room doors transfer the entire party into the same encounter",()=>{
 const g=createGame(1234);addPlayer(g,"host");addPlayer(g,"peer");
 const r=g.rooms[g.room],d=r.doors[0];assert.ok(d);
 const p=g.players.host;
 if(d==="n"){p.x=480;p.y=116;}
 if(d==="s"){p.x=480;p.y=485;}
 if(d==="w"){p.x=105;p.y=300;}
 if(d==="e"){p.x=855;p.y=300;}
 step(g,{host:{}},1/60);
 assert.notEqual(g.room,"0,0");
 assert.equal(g.rooms[g.room].visited,true);
 assert.ok(Object.values(g.players).every(p=>p.x>90&&p.x<870&&p.y>110&&p.y<490));
 if(g.rooms[g.room].type!=="treasure")assert.ok(g.enemies.length>0);
});
test("shooting spawns host-controlled projectiles with finite velocity",()=>{
 const g=createGame(512);addPlayer(g,"a");
 step(g,{a:{fx:1,fy:0}},1/60);
 assert.equal(g.shots.length,1);assert.equal(g.shots[0].team,"player");
 assert.equal(g.shots[0].vx,520);
});
test("bomb consumes stock once when held down, and damage is host resolved",()=>{
 const g=createGame(512);addPlayer(g,"a");
 const p=g.players.a;
 g.enemies.push({id:100,type:"crawler",x:p.x+30,y:p.y+30,r:18,hp:15,maxHp:15,speed:0,cd:10,phase:0});
 step(g,{a:{bomb:true}},1/60);assert.equal(p.bombs,1);assert.equal(g.enemies[0].hp,4);
 step(g,{a:{bomb:true}},1/60);assert.equal(p.bombs,1);
});
test("all fallen players cause defeat, not a silent frozen session",()=>{
 const g=createGame(13);addPlayer(g,"a");g.players.a.alive=false;g.players.a.hp=0;
 step(g,{},1/60);assert.equal(g.status,"defeat");
});
test("seed hash is stable",()=>{assert.equal(hash(12,-2,4),hash(12,-2,4));assert.notEqual(hash(12,-2,4),hash(13,-2,4));});
