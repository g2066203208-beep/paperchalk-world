import test from 'node:test';
import assert from 'node:assert/strict';
import {DISTRICTS,createGame,act,resolveEvent,eventInfo,actionInfo,ownedCount,weeklyFinance} from '../site/engine.js';

test('legal long-form playthrough: one helper and $320 to controlling all districts',()=>{
 let state=createGame(),actions=0;
 const trace=[];
 const run=(type,id=state.selected)=>{
   const r=act(state,type,id);
   if(!r.ok)return false;
   state=r.state;actions++;trace.push(type+'@'+id);
   return true;
 };
 const manageEvents=()=>{
  if(!state.event)return;
  const e=eventInfo(state);
  const choice=state.cash>=e.a.cost+420?'a':'b';
  const r=resolveEvent(state,choice);
  assert.equal(r.ok,true,r.message);
  state=r.state;actions++;
 };
 for(let cycles=0;cycles<180&&!state.won&&!state.bankrupt;cycles++){
   manageEvents();
   let target=DISTRICTS.find(d=>!state.zones[d.id].controlled);
   if(!target){
      // Owning the city is only the start: continue investing until all victory requirements are met.
      if(state.heat>57&&state.cash>120)run('quiet');
      run('next');continue;
   }
   // Changing the selected picture is a UI action; it spends no funds or turns.
   state={...state,selected:target.id};
   const z=state.zones[target.id];
   if(state.heat>48&&state.cash>=180)run('quiet');
   // Recruit only to expand capacity or open the first business.
   const requiredCrew=Math.max(z.level===0?2:1,2+ownedCount(state));
   if(state.crew<requiredCrew&&state.cash>=actionInfo(state,'recruit').cost+180)run('recruit');
   if(z.influence<65){
     if(state.cash>=actionInfo(state,'network').cost+120)run('network');
     if(state.zones[target.id].influence<65&&state.cash>=actionInfo(state,'negotiate').cost+140)run('negotiate');
   }
   if(state.zones[target.id].level===0&&state.cash>=target.cost+180)run('open');
   if(state.zones[target.id].influence>=65&&state.crew>=2+ownedCount(state)&&state.cash>=target.claimCost+150)run('claim');
   // The earliest economy grows through a handful of weekly contracts, later via fixed property revenue.
   if(state.cash<target.cost+target.claimCost+Math.max(140,weeklyFinance(state).wages)){
      if(state.heat<55)run('hustle');
      if(state.cash<target.cost&&state.heat<31)run('hustle','dock');
   }
   if(state.heat>=55&&state.cash>=180)run('quiet');
   run('next');
 }
 assert.equal(state.won,true,'Never reached empire win condition: '+JSON.stringify({
   week:state.week,cash:state.cash,crew:state.crew,respect:state.respect,heat:state.heat,
   income:weeklyFinance(state),controlled:ownedCount(state),zones:Object.fromEntries(DISTRICTS.map(d=>[d.id,{
     influence:state.zones[d.id].influence,level:state.zones[d.id].level,controlled:state.zones[d.id].controlled
   }])),actions,tail:trace.slice(-18)
 }));
 assert.equal(ownedCount(state),5);
 assert.ok(state.cash>=10000);
 assert.ok(state.respect>=70);
 console.log('LEGAL EMPIRE VICTORY '+JSON.stringify({week:state.week,cash:state.cash,crew:state.crew,respect:state.respect,actions}));
});
