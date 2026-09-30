/* Standalone deterministic prologue simulation: school -> living city -> home. */
(function(global){
'use strict';

const C=global.PaperchalkPrologueContent;
if(!C)throw new Error('PROLOGUE_CONTENT_MISSING');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const dist=(a,b)=>Math.hypot(num(a?.x)-num(b?.x),num(a?.z)-num(b?.z));
const STORAGE_PREFIX='paperchalk.prologue.v1.';

function key(account){return STORAGE_PREFIX+encodeURIComponent(String(account||'guest'))}
function load(account){
  try{return JSON.parse(localStorage.getItem(key(account))||'null')}catch{return null}
}
function write(account,state){
  if(!account)return false;
  try{localStorage.setItem(key(account),JSON.stringify(state));return true}catch{return false}
}
function clockText(minutes){
  const m=((Math.floor(minutes)%1440)+1440)%1440;
  return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
}
function signalState(t){
  const p=((t%40)+40)%40;
  const ew=p<16,ns=p>=20&&p<36;
  return {phase:p,eastWestCars:ew,northSouthCars:ns,walkNS:ns,walkEW:ew};
}
function colliderRect(x,z,c,r=.33){
  const minX=num(c.x),minZ=num(c.z),maxX=minX+num(c.w),maxZ=minZ+num(c.d);
  return x+r>minX&&x-r<maxX&&z+r>minZ&&z-r<maxZ;
}

function createDefault(){
  const people={};
  for(const p of C.people){
    const route=C.routes[p.route]||[{x:0,z:0}];
    const n=Math.max(1,route.length);
    const idx=Math.floor(clamp(num(p.phase),0,.9999)*n);
    const node=route[idx]||route[0];
    people[p.id]={x:num(node.x),z:num(node.z),routeIndex:idx,wait:num(node.wait,0)*num(p.phase,.2),facingX:1,moving:false};
  }
  const cars={};
  for(const car of C.cars)cars[car.id]={progress:clamp(num(car.progress),0,.999999),speed:num(car.speed,7),moving:true};
  return {
    version:1,completed:false,segmentComplete:false,zone:'school',
    player:{...C.zones.school.spawn},objectiveIndex:0,minutes:C.startMinutes,elapsed:0,
    people,cars,interactions:0,steps:0,nearMisses:0
  };
}

let active=false,account=null,state=createDefault(),move={x:0,z:0},listeners=new Set();
let message='',messageUntil=0,autosave=0,lastSnapshot=null;

function zone(){return C.zones[state.zone]}
function objective(){return C.objectives[Math.min(state.objectiveIndex,C.objectives.length-1)]}
function emit(){lastSnapshot=snapshot();for(const fn of listeners)try{fn(lastSnapshot)}catch(e){console.error(e)}}
function save(){if(account)return write(account,state);return false}

function shouldRun(accountId){
  const q=new URLSearchParams(location.search);
  if(q.get('skipPrologue')==='1')return false;
  if(q.get('forcePrologue')==='1')return true;
  const s=load(accountId);
  return !s?.completed;
}
function enter(accountId){
  account=String(accountId||'guest');
  const prior=load(account);
  state=prior&&prior.version===1?prior:createDefault();
  if(state.completed&&new URLSearchParams(location.search).get('forcePrologue')==='1')state=createDefault();
  active=true;move={x:0,z:0};message='';messageUntil=0;autosave=0;emit();return true;
}
function leave(){if(!active)return false;save();active=false;move={x:0,z:0};emit();return true}
function reset(){
  state=createDefault();if(account)write(account,state);message='';messageUntil=0;emit();return snapshot();
}
function finish(){
  state.completed=true;state.segmentComplete=true;save();emit();return true;
}
function setMove(x,z){move.x=clamp(num(x),-1,1);move.z=clamp(num(z),-1,1)}
function say(text,seconds=2.4){message=String(text||'');messageUntil=state.elapsed+seconds}

function zoneColliders(zoneId){
  if(zoneId==='city')return C.city.buildings;
  if(zoneId==='school'){
    return [
      ...C.schoolInterior.walls,
      ...C.schoolInterior.desks.map(([x,z])=>({x:x-.8,z:z-.55,w:1.6,d:1.1}))
    ];
  }
  if(zoneId==='home'){
    return [
      ...C.homeInterior.walls,
      ...C.homeInterior.furniture.map(f=>({x:f.x-f.w/2,z:f.z-f.d/2,w:f.w,d:f.d}))
    ];
  }
  return[];
}
function personBlocks(x,z){
  for(const p of C.people){
    if(p.zone!==state.zone)continue;
    const s=state.people[p.id];if(!s)continue;
    if(Math.hypot(x-s.x,z-s.z)<.58)return true;
  }
  return false;
}
function canMove(x,z){
  const b=zone().bounds,r=C.player.radius;
  if(x-r<b.minX||x+r>b.maxX||z-r<b.minZ||z+r>b.maxZ)return false;
  for(const c of zoneColliders(state.zone))if(colliderRect(x,z,c,r))return false;
  if(personBlocks(x,z))return false;
  return true;
}

function updatePlayer(dt){
  let dx=move.x,dz=move.z;const m=Math.hypot(dx,dz);
  if(m>1){dx/=m;dz/=m}
  const speed=C.player.speed,step=speed*dt;
  if(Math.abs(dx)+Math.abs(dz)>.001){
    const nx=state.player.x+dx*step,nz=state.player.z+dz*step;
    if(canMove(nx,nz)){state.player.x=nx;state.player.z=nz}
    else{
      if(canMove(nx,state.player.z))state.player.x=nx;
      if(canMove(state.player.x,nz))state.player.z=nz;
    }
    if(Math.abs(dx)>.05)state.player.yaw=dx<0?Math.PI:0;
    state.steps++;
  }
}
function activePeople(){return C.people.filter(p=>p.zone===state.zone)}
function walkAllowed(flag,signals){
  if(flag==='ns')return signals.walkNS;
  if(flag==='ew')return signals.walkEW;
  return true;
}
function updatePeople(dt,signals){
  for(const p of activePeople()){
    const s=state.people[p.id],route=C.routes[p.route]||[];if(!s||!route.length)continue;
    if(s.wait>0){s.wait=Math.max(0,s.wait-dt);s.moving=false;continue}
    const next=route[(s.routeIndex+1)%route.length];
    if(next.cross&&!walkAllowed(next.cross,signals)){s.moving=false;continue}
    const dx=num(next.x)-s.x,dz=num(next.z)-s.z,d=Math.hypot(dx,dz);
    if(d<.16){
      s.x=num(next.x);s.z=num(next.z);s.routeIndex=(s.routeIndex+1)%route.length;s.wait=num(next.wait,0);s.moving=false;continue;
    }
    const base=p.role==='student'?1.55:p.role==='worker'?1.45:p.role==='resident'?1.2:1.1;
    let vx=dx/d*base,vz=dz/d*base;
    for(const o of activePeople()){
      if(o.id===p.id)continue;const q=state.people[o.id];if(!q)continue;
      const ox=s.x-q.x,oz=s.z-q.z,od=Math.hypot(ox,oz);
      if(od>.02&&od<.8){vx+=ox/od*(.8-od)*1.4;vz+=oz/od*(.8-od)*1.4}
    }
    const vm=Math.hypot(vx,vz)||1;vx=vx/vm*base;vz=vz/vm*base;
    s.x+=vx*dt;s.z+=vz*dt;s.moving=true;if(Math.abs(vx)>.05)s.facingX=vx<0?-1:1;
  }
}

function carPose(carDef,s){
  const p=((s.progress%1)+1)%1;
  if(carDef.lane==='east')return{x:-70+p*140,z:-2.4,yaw:0};
  if(carDef.lane==='west')return{x:70-p*140,z:2.4,yaw:Math.PI};
  if(carDef.lane==='north')return{x:9.8,z:-52+p*104,yaw:-Math.PI/2};
  return{x:5.2,z:52-p*104,yaw:Math.PI/2};
}
function carRed(def,pose,signals){
  if(def.lane==='east')return !signals.eastWestCars&&pose.x>-2&&pose.x<7;
  if(def.lane==='west')return !signals.eastWestCars&&pose.x<17&&pose.x>8;
  if(def.lane==='north')return !signals.northSouthCars&&pose.z>-13&&pose.z<-4;
  return !signals.northSouthCars&&pose.z<12&&pose.z>3;
}
function playerAhead(def,pose){
  if(state.zone!=='city')return false;
  const d=Math.hypot(state.player.x-pose.x,state.player.z-pose.z);
  if(d>2.4)return false;
  if(def.lane==='east')return state.player.x>pose.x;
  if(def.lane==='west')return state.player.x<pose.x;
  if(def.lane==='north')return state.player.z>pose.z;
  return state.player.z<pose.z;
}
function updateCars(dt,signals){
  if(state.zone!=='city')return;
  for(const def of C.cars){
    const s=state.cars[def.id],pose=carPose(def,s);
    const stop=carRed(def,pose,signals)||playerAhead(def,pose);
    s.moving=!stop;
    if(!stop){
      const length=(def.lane==='east'||def.lane==='west')?140:104;
      s.progress=(s.progress+s.speed/length*dt)%1;
    }
    const now=carPose(def,s),d=Math.hypot(state.player.x-now.x,state.player.z-now.z);
    if(d<1.05){state.nearMisses++;say('车从身边刹住了。',1.1)}
  }
}

function advanceObjective(){
  const o=objective();if(!o||o.id==='complete')return;
  const target=o.target;if(o.zone!==state.zone||dist(state.player,target)>num(o.radius,1.3))return;
  if(o.id==='leave-school'){
    state.objectiveIndex=1;state.zone='city';state.player={...C.zones.city.spawn};say('校门外正是放学高峰。',2.2);
  }else if(o.id==='to-crossing'){
    state.objectiveIndex=2;say('等行人灯。车流还没有停。',2.0);
  }else if(o.id==='cross-road'){
    state.objectiveIndex=3;say('穿过大路，再走一段就是家。',2.0);
  }else if(o.id==='to-home'){
    state.objectiveIndex=4;state.zone='home';state.player={...C.zones.home.spawn};say('我回来了。',2.2);
  }else if(o.id==='to-bedroom'){
    state.objectiveIndex=5;state.segmentComplete=true;say('到家了。今天也只是普通的一天。',4.0);save();
  }
}

function nearestPerson(range=2.1){
  let best=null,bestD=range;
  for(const p of activePeople()){
    const s=state.people[p.id],d=Math.hypot(state.player.x-s.x,state.player.z-s.z);
    if(d<bestD){best={definition:p,state:s,distance:d};bestD=d}
  }
  return best;
}
function interact(){
  const hit=nearestPerson();
  if(hit){
    state.interactions++;say(hit.definition.name+'：'+hit.definition.line,3.2);return {type:'person',id:hit.definition.id,name:hit.definition.name,line:hit.definition.line};
  }
  if(state.zone==='home'&&dist(state.player,C.zones.home.bedroom)<1.8){say('书包放在桌边。窗外还是熟悉的街声。',3.0);return{type:'room'}}
  say('这里没什么需要操作的。',1.2);return null;
}
function update(dt){
  if(!active)return snapshot();
  dt=clamp(num(dt),0,.05);state.elapsed+=dt;state.minutes+=dt*C.timeScale;
  const signals=signalState(state.elapsed);updatePlayer(dt);updatePeople(dt,signals);updateCars(dt,signals);advanceObjective();
  autosave+=dt;if(autosave>=2){autosave=0;save()}
  emit();return lastSnapshot;
}
function snapshot(){
  const signals=signalState(state.elapsed),obj=objective();
  const people=activePeople().map(p=>{const s=state.people[p.id];return{id:p.id,name:p.name,role:p.role,x:s.x,z:s.z,facingX:s.facingX,moving:s.moving}});
  const cars=state.zone==='city'?C.cars.map(c=>{const s=state.cars[c.id],p=carPose(c,s);return{id:c.id,lane:c.lane,x:p.x,z:p.z,yaw:p.yaw,moving:s.moving}}):[];
  return {
    active,account,zone:state.zone,zoneName:zone().name,player:{...state.player},
    objectiveIndex:state.objectiveIndex,objective:obj?{...obj,target:{...obj.target}}:null,
    minutes:state.minutes,clock:clockText(state.minutes),elapsed:state.elapsed,
    people,cars,signals,message:state.elapsed<messageUntil?message:'',
    segmentComplete:!!state.segmentComplete,completed:!!state.completed,
    stats:{people:people.length,cars:cars.length,interactions:state.interactions,steps:state.steps,nearMisses:state.nearMisses,citySimulation:true,trafficSignals:true,pedestrianSchedules:true,independentScene:true,sharedCharacterSkin:'assets/player/protagonist.webp'}
  };
}
function subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn)}

global.PaperchalkPrologue=Object.freeze({
  version:1,shouldRun,enter,leave,reset,finish,setMove,interact,update,snapshot,subscribe,save,
  get active(){return active},get completed(){return !!state.completed}
});
})(window);
