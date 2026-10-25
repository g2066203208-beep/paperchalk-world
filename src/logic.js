// Cryptbound: deterministic, host-authoritative dungeon rules. No DOM dependencies.
export const W = 960, H = 600;
const DIRECTIONS = [{x:0,y:-1,d:"n",reverse:"s"},{x:1,y:0,d:"e",reverse:"w"},{x:0,y:1,d:"s",reverse:"n"},{x:-1,y:0,d:"w",reverse:"e"}];
export const palette = ["#e8ac78","#8cc8c8","#b9a1eb","#d8c77b"];
export const key = (x,y) => x + "," + y;
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const norm = (x,y) => { const d=Math.hypot(x,y); return d>0.001 ? {x:x/d,y:y/d} : {x:0,y:0}; };
export function hash(a,b=0,c=0){ let n=(a|0)^Math.imul(b|0,0x45d9f3b)^Math.imul(c|0,0x27d4eb2d);n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0; }
export function rng(seed){ let n=seed>>>0;return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}; }
function shuffled(arr,random){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function makeFloor(seed,floor){
  const random=rng(hash(seed,floor,99)), rooms={}; let x=0,y=0;
  rooms[key(0,0)]={x:0,y:0,type:"start",visited:true,cleared:true,claimed:true,doors:[],blocks:[]};
  const wanted=6+floor*2;
  for(let tries=0;Object.keys(rooms).length<wanted&&tries<450;tries++){
    const existing=Object.values(rooms), base=existing[Math.floor(random()*existing.length)];
    const d=shuffled(DIRECTIONS,random)[0];x=base.x+d.x;y=base.y+d.y;
    if(Math.abs(x)>4||Math.abs(y)>4||rooms[key(x,y)])continue;
    rooms[key(x,y)]={x,y,type:"combat",visited:false,cleared:false,claimed:false,doors:[],blocks:[]};
  }
  const others=Object.values(rooms).filter(r=>r.type!=="start");
  // BFS distance ensures the boss occupies a genuinely remote room.
  const distance={ [key(0,0)]:0 },queue=[rooms[key(0,0)]];
  while(queue.length){const r=queue.shift();for(const d of DIRECTIONS){const k=key(r.x+d.x,r.y+d.y);if(rooms[k]&&distance[k]===undefined){distance[k]=distance[key(r.x,r.y)]+1;queue.push(rooms[k]);}}}
  others.sort((a,b)=>(distance[key(b.x,b.y)]||0)-(distance[key(a.x,a.y)]||0));
  if(others[0])others[0].type="boss";
  if(others[1]){others[1].type="treasure";others[1].cleared=true;}
  for(const r of Object.values(rooms)){
    r.doors=DIRECTIONS.filter(d=>rooms[key(r.x+d.x,r.y+d.y)]).map(d=>d.d);
    if(r.type==="combat"){
      const rr=rng(hash(seed+floor,r.x,r.y));
      const candidates=[{x:262,y:205,w:80,h:70},{x:617,y:310,w:80,h:70},{x:420,y:178,w:110,h:46},{x:420,y:376,w:110,h:46}];
      r.blocks=shuffled(candidates,rr).slice(0,Math.floor(rr()*3));
    }
  }
  return rooms;
}
export function createGame(seed=Date.now()){
  const game={version:1,seed:seed>>>0,floor:1,room:key(0,0),rooms:{},players:{},enemies:[],shots:[],drops:[],effects:[],tick:0,score:0,status:"playing",message:"地牢的门已开启",messageTime:3,nextId:1};
  game.rooms=makeFloor(game.seed,1);return game;
}
export function addPlayer(game,id,name="旅人"){
  if(!id||game.players[id])return false;
  if(Object.keys(game.players).length>=4)return false;
  const i=Object.keys(game.players).length;
  game.players[id]={id,name:String(name).trim().slice(0,14)||"旅人",color:palette[i],x:448+i*23,y:280+i*22,r:16,hp:6,maxHp:6,damage:1,speed:208,rate:0.28,bombs:2,coins:0,cd:0,inv:0,alive:true,kills:0};
  return true;
}
export function removePlayer(game,id){delete game.players[id];}
export function inputSanitize(i){
  if(!i||typeof i!=="object")return {mx:0,my:0,fx:0,fy:0,bomb:false};
  const f=v=>Number.isFinite(v)?clamp(v,-1,1):0;
  const m=norm(f(i.mx),f(i.my)),fire=norm(f(i.fx),f(i.fy));
  return {mx:m.x,my:m.y,fx:fire.x,fy:fire.y,bomb:i.bomb===true};
}
const touch=(x,y,r,tx,ty,tr)=>Math.hypot(x-tx,y-ty)<r+tr;
function circleRect(x,y,r,b){const nx=clamp(x,b.x,b.x+b.w),ny=clamp(y,b.y,b.y+b.h);return (x-nx)**2+(y-ny)**2<r*r;}
function validPos(room,x,y,r){if(x<86+r||x>874-r||y<98+r||y>502-r)return false;return !room.blocks.some(b=>circleRect(x,y,r,b));}
function moveEntity(game,e,vx,vy,dt){
  const r=game.rooms[game.room],x=e.x+vx*dt,y=e.y+vy*dt;
  if(validPos(r,x,e.y,e.r||15))e.x=x;
  if(validPos(r,e.x,y,e.r||15))e.y=y;
}
function spawnEnemies(game,r){
  const rd=rng(hash(game.seed+game.floor,r.x,r.y)), count=r.type==="boss"?1:Math.min(11,2+game.floor+Math.floor(rd()*3));
  for(let i=0;i<count;i++){
    const type=r.type==="boss"?"boss":rd()<0.34?"spitter":"crawler";
    let x=200+rd()*560,y=150+rd()*290;
    for(let j=0;j<30&&(!validPos(r,x,y,type==="boss"?31:18)||Math.hypot(x-480,y-300)<125);j++){x=180+rd()*600;y=135+rd()*330;}
    const hp=type==="boss"?42+game.floor*15:type==="spitter"?4+game.floor*2:3+game.floor*2;
    game.enemies.push({id:game.nextId++,type,x,y,r:type==="boss"?34:type==="spitter"?18:20,hp,maxHp:hp,speed:type==="boss"?65:type==="spitter"?72:108,cd:0.6+rd()*1.3,phase:rd()*6.28});
  }
}
function enterRoom(game,newKey,from){
  game.room=newKey;game.enemies=[];game.shots=[];game.drops=[];game.effects=[];
  const r=game.rooms[newKey];r.visited=true;
  for(const p of Object.values(game.players)){
    if(from==="e"){p.x=145;p.y=300;}
    else if(from==="w"){p.x=815;p.y=300;}
    else if(from==="s"){p.x=480;p.y=160;}
    else if(from==="n"){p.x=480;p.y=445;}
    p.x+=((hash(p.id.length,game.tick)%31)-15);
    p.inv=Math.max(p.inv,0.6);
  }
  if(!r.cleared)spawnEnemies(game,r);
  if(r.type==="treasure"&&!r.claimed){
    game.drops.push({id:game.nextId++,x:480,y:300,type:"relic"});
    game.message="发现遗物密室";game.messageTime=2.8;
  } else {game.message=r.type==="boss"?"深处传来低吼……":"新的房间";game.messageTime=2;}
}
function advanceFloor(game){
  if(game.floor>=3){game.status="victory";game.message="深渊已被净化！";game.messageTime=999;return;}
  game.floor++;game.rooms=makeFloor(game.seed,game.floor);game.room=key(0,0);
  game.enemies=[];game.shots=[];game.drops=[];game.effects=[];
  let i=0;for(const p of Object.values(game.players)){p.x=455+i*24;p.y=285+i*16;p.hp=Math.min(p.maxHp,p.hp+2);p.inv=1;i++;}
  game.message="第 "+game.floor+" 层 · 更深的噩梦";game.messageTime=3;
}
function deadEnemies(game){
  const alive=[];for(const e of game.enemies)if(e.hp>0)alive.push(e);else {
    game.score+=e.type==="boss"?500:20;
    const v=hash(e.id,game.seed,game.tick)%100;
    if(v<24)game.drops.push({id:game.nextId++,x:e.x,y:e.y,type:"coin"});
    if(v>=24&&v<34)game.drops.push({id:game.nextId++,x:e.x,y:e.y,type:"heart"});
  }
  game.enemies=alive;
  if(alive.length===0&&!game.rooms[game.room].cleared){
    const r=game.rooms[game.room];r.cleared=true;game.shots=game.shots.filter(s=>s.team==="player");
    if(r.type==="boss"){game.message="守门者被击败！走向金色传送阵";game.drops.push({id:game.nextId++,x:480,y:300,type:"stairs"});}
    else {game.message="房间已净化";game.messageTime=2;}
  }
}
export function step(game,allInputs={},dt=1/60){
  if(game.status!=="playing")return game;
  dt=clamp(Number.isFinite(dt)?dt:0,0,0.05);game.tick++;
  game.messageTime=Math.max(0,game.messageTime-dt);
  const room=game.rooms[game.room];let desiredExit=null;
  for(const p of Object.values(game.players)){
    if(!p.alive)continue;
    p.cd=Math.max(0,p.cd-dt);p.inv=Math.max(0,p.inv-dt);
    const input=inputSanitize(allInputs[p.id]);moveEntity(game,p,input.mx*p.speed,input.my*p.speed,dt);
    if(p.cd===0&&(input.fx!==0||input.fy!==0)){
      game.shots.push({id:game.nextId++,team:"player",owner:p.id,x:p.x+input.fx*20,y:p.y+input.fy*20,vx:input.fx*520,vy:input.fy*520,r:6,damage:p.damage,life:0.9});
      p.cd=p.rate;
    }
    if(input.bomb&&p.bombs>0&&!p.bombHeld){
      p.bombs--;game.effects.push({x:p.x,y:p.y,life:0.45,type:"boom"});
      for(const e of game.enemies)if(Math.hypot(e.x-p.x,e.y-p.y)<185)e.hp-=11;
      for(const q of Object.values(game.players))if(q.id!==p.id&&Math.hypot(q.x-p.x,q.y-p.y)<135)q.inv=Math.max(q.inv,0.2);
    }
    p.bombHeld=input.bomb;
    if(room.cleared){
      if(room.doors.includes("n")&&p.y<120&&Math.abs(p.x-480)<76)desiredExit="n";
      if(room.doors.includes("s")&&p.y>480&&Math.abs(p.x-480)<76)desiredExit="s";
      if(room.doors.includes("w")&&p.x<108&&Math.abs(p.y-300)<76)desiredExit="w";
      if(room.doors.includes("e")&&p.x>852&&Math.abs(p.y-300)<76)desiredExit="e";
    }
  }
  if(desiredExit){
    const d=DIRECTIONS.find(v=>v.d===desiredExit);
    enterRoom(game,key(room.x+d.x,room.y+d.y),desiredExit);return game;
  }
  const livePlayers=Object.values(game.players).filter(p=>p.alive);
  if(livePlayers.length===0&&Object.keys(game.players).length){game.status="defeat";game.message="所有旅人都倒下了";game.messageTime=999;return game;}
  for(const e of game.enemies){
    e.phase+=dt*2;e.cd-=dt;
    if(!livePlayers.length)break;
    const p=livePlayers.reduce((a,b)=>Math.hypot(e.x-a.x,e.y-a.y)<Math.hypot(e.x-b.x,e.y-b.y)?a:b);
    const dir=norm(p.x-e.x,p.y-e.y),dist=Math.hypot(p.x-e.x,p.y-e.y);
    const vel=e.type==="spitter"?(dist<175?-1:dist>265?1:0):1;
    moveEntity(game,e,dir.x*e.speed*vel,dir.y*e.speed*vel,dt);
    if(e.cd<=0&&(e.type!=="crawler")&&dist<680){
      const count=e.type==="boss"?8:1;
      for(let j=0;j<count;j++){
        const ang=e.type==="boss"?j*Math.PI*2/count+e.phase:Math.atan2(dir.y,dir.x);
        game.shots.push({id:game.nextId++,team:"enemy",x:e.x,y:e.y,vx:Math.cos(ang)*(e.type==="boss"?205:260),vy:Math.sin(ang)*(e.type==="boss"?205:260),r:e.type==="boss"?9:7,damage:1,life:3});
      }
      e.cd=e.type==="boss"?1.3:2.1;
    }
    for(const p2 of livePlayers)if(p2.inv===0&&touch(e.x,e.y,e.r,p2.x,p2.y,p2.r)){p2.hp--;p2.inv=1.2;if(p2.hp<=0){p2.hp=0;p2.alive=false;}}
  }
  for(const shot of game.shots){
    shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;
    if(!validPos(room,shot.x,shot.y,shot.r))shot.life=0;
    if(shot.team==="player"){
      for(const e of game.enemies)if(e.hp>0&&touch(shot.x,shot.y,shot.r,e.x,e.y,e.r)){e.hp-=shot.damage;shot.life=0;const shooter=game.players[shot.owner];if(e.hp<=0&&shooter)shooter.kills++;break;}
    }else for(const p of livePlayers)if(p.inv<=0&&touch(shot.x,shot.y,shot.r,p.x,p.y,p.r)){p.hp--;p.inv=1.1;shot.life=0;if(p.hp<=0){p.hp=0;p.alive=false;}break;}
  }
  game.shots=game.shots.filter(s=>s.life>0);
  deadEnemies(game);
  for(const drop of [...game.drops]){
    const p=livePlayers.find(p=>touch(p.x,p.y,p.r,drop.x,drop.y,18));
    if(!p)continue;
    if(drop.type==="stairs"){advanceFloor(game);return game;}
    if(drop.type==="coin"){p.coins++;game.score+=5;}
    if(drop.type==="heart")p.hp=Math.min(p.maxHp,p.hp+2);
    if(drop.type==="relic"){p.damage+=0.6;p.maxHp+=1;p.hp=Math.min(p.maxHp,p.hp+2);p.rate=Math.max(0.13,p.rate-0.035);room.claimed=true;game.message=p.name+" 获得了深渊之眼！";game.messageTime=3;}
    game.drops=game.drops.filter(d=>d.id!==drop.id);
  }
  game.effects=game.effects.filter(e=>(e.life-=dt)>0);
  return game;
}
