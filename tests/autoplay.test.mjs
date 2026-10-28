import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,perform,effectiveDistance,LOCATIONS,canMove} from '../site/rules.js';

function act(s,action){
 const result=perform(s,action);
 assert.equal(result.ok,true,JSON.stringify({action,message:result.message,turn:s.turn,hp:s.hp,ap:s.ap}));
 return result.state;
}
// The scenario uses only public gameplay actions. No state edits and no hidden enemy deletion.
test('all three five-lane fields can be cleared with legal controls',()=>{
 let s=createGame();
 const visited=new Set([s.current]);
 let operations=0;
 for(;operations<700&&s.status==='playing';operations++){
  if(s.ap===0){s=act(s,{type:'end'});continue;}
  const enemies=s.enemies[s.current];
  if(enemies.length===0){
   const destination=LOCATIONS.find(l=>s.enemies[l.id].length&&canMove(s.current,l.id))
     ||(s.current!=='church'&&s.enemies.alley.length?LOCATIONS.find(l=>l.id==='church'):null);
   if(!destination){break;}
   s=act(s,{type:'move',to:destination.id});visited.add(s.current);continue;
  }
  if(s.hp<=9&&s.medkits>0){s=act(s,{type:'heal'});continue;}
  if(s.mag===0){s=act(s,{type:'reload'});continue;}
  const attackable=enemies.filter(e=>!enemies.some(other=>other.id!==e.id&&other.lane===e.lane&&other.side===e.side&&effectiveDistance(s,other)<effectiveDistance(s,e)));
  attackable.sort((a,b)=>{
   const score=e=>effectiveDistance(s,e)*15+(e.lane!==s.lane?9:0)+(e.type==='brute'?-6:0)+(e.side==='rear'?-2:0);
   return score(a)-score(b);
  });
  const target=attackable[0];
  assert.ok(target);
  if(target.lane!==s.lane){s=act(s,{type:'lane',lane:target.lane});continue;}
  s=act(s,{type:'select',id:target.id});
  s=act(s,{type:'shoot'});
 }
 assert.equal(s.status,'won','Not won: '+JSON.stringify({ops:operations,turn:s.turn,hp:s.hp,status:s.status,visited:[...visited],enemies:Object.fromEntries(LOCATIONS.map(l=>[l.id,s.enemies[l.id].length]))}));
 assert.deepEqual([...visited].sort(),LOCATIONS.map(l=>l.id).sort());
 console.log('LEGAL VICTORY',JSON.stringify({operations,turn:s.turn,hp:s.hp,medkits:s.medkits}));
});
