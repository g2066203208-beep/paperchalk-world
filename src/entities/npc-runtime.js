/* Full NPC actor runtime: ECS body + deterministic AI brain + voxel navigation. */
(function(global){
'use strict';

const Nav=global.PaperchalkNPCNavigation,AI=global.PaperchalkNPCAI,Dialogue=global.PaperchalkNPCDialogue;
if(!Nav||!AI||!Dialogue)throw new Error('NPC_AI_STACK_MISSING');
function num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function posKey(p){return p?Math.round(num(p.x)*4)+','+Math.round(num(p.z)*4):''}

function createNPCWorld({definitions=[],quests=[],terrain,ecs,gravity=22}={}){
  if(!terrain)throw new Error('NPC_TERRAIN_REQUIRED');
  if(!ecs)throw new Error('NPC_ECS_REQUIRED');
  const actors=[],byId=new Map(),byEntity=new Map(),stimuli=[];
  const navigator=Nav.createNavigator({terrain});
  const dialogue=Dialogue.createDialogueSystem({quests,npcDefinitions:definitions});
  let tickCount=0,repaths=0,coarseTicks=0;

  function groundCenterY(x,z,halfH,fromY=null){
    const fromCell=Number.isFinite(Number(fromY))?Math.floor((Number(fromY)+halfH+.35)/terrain.tileSize)+2:96;
    return terrain.highestGroundY(x,z,{fromCell,toCell:-256})+halfH;
  }
  function make(def,index){
    const id=String(def?.id||('npc-'+index)),spawn=def?.spawn||{};
    const collider={halfW:Math.max(.12,num(def?.collider?.halfW,.34)),halfH:Math.max(.25,num(def?.collider?.halfH,.95)),halfD:Math.max(.12,num(def?.collider?.halfD,.28))};
    const x=num(spawn.x,index*1.4+3),z=num(spawn.z,1.5),y=Number.isFinite(Number(spawn.y))?Number(spawn.y):groundCenterY(x,z,collider.halfH);
    const transform={x,y,z,yaw:num(spawn.yaw,0)},velocity={x:0,y:0,z:0},health={current:Math.max(1,num(def?.maxHp,10)),max:Math.max(1,num(def?.maxHp,10))};
    const actor={kind:'npc',action:'idle',moving:false,grounded:true,facingX:num(def?.facingX,-1)<0?-1:1,width:Math.max(.4,num(def?.width,1)),height:Math.max(.7,num(def?.height,2))};
    const npc={id,name:String(def?.name||'NPC'),role:String(def?.role||'villager'),invulnerable:def?.invulnerable!==false,interactable:def?.interactable!==false,appearance:{...(def?.appearance||{})}};
    const brain=AI.createBrain(def),brainComponent={runtime:brain};
    const entity=ecs.create({Transform:transform,Velocity:velocity,Health:health,Actor:actor,NPC:npc,Brain:brainComponent});
    const record={entity,id,transform,velocity,health,actor,npc,brain,collider,definition:def,path:[],pathIndex:0,pathKey:'',repath:0,brainSense:0,lodAccumulator:0,lastTerrainVersion:terrain.changeVersion||0};
    actors.push(record);byId.set(id,record);byEntity.set(entity,record);return record;
  }
  for(let i=0;i<definitions.length;i++)make(definitions[i],i);

  function collidesAABB(x,y,z,halfW,halfH,halfD,{ignoreId=null}={}){
    for(const a of actors){
      if(ignoreId&&a.id===ignoreId)continue;
      if(Math.abs(x-a.transform.x)>=halfW+a.collider.halfW)continue;
      if(Math.abs(y-a.transform.y)>=halfH+a.collider.halfH)continue;
      if(Math.abs(z-a.transform.z)>=halfD+a.collider.halfD)continue;
      return a;
    }
    return null;
  }
  function actorCanStand(a,x,z,y){
    if(terrain.collidesAABB(x,y,z,a.collider.halfW,a.collider.halfH-.02,a.collider.halfD))return false;
    return !collidesAABB(x,y,z,a.collider.halfW,a.collider.halfH,a.collider.halfD,{ignoreId:a.id});
  }
  function moveGround(a,vx,vz,dt){
    const dx=vx*dt,dz=vz*dt;if(Math.abs(dx)+Math.abs(dz)<1e-5)return false;
    let nx=a.transform.x+dx,nz=a.transform.z+dz;
    const ny=groundCenterY(nx,nz,a.collider.halfH,a.transform.y);
    if(Math.abs(ny-a.transform.y)<=1.10&&actorCanStand(a,nx,nz,ny)){
      a.transform.x=nx;a.transform.z=nz;a.transform.y=ny;return true;
    }
    nx=a.transform.x+dx;nz=a.transform.z;
    const yx=groundCenterY(nx,nz,a.collider.halfH,a.transform.y);
    if(Math.abs(yx-a.transform.y)<=1.10&&actorCanStand(a,nx,nz,yx)){a.transform.x=nx;a.transform.y=yx;return true}
    nx=a.transform.x;nz=a.transform.z+dz;
    const yz=groundCenterY(nx,nz,a.collider.halfH,a.transform.y);
    if(Math.abs(yz-a.transform.y)<=1.10&&actorCanStand(a,nx,nz,yz)){a.transform.z=nz;a.transform.y=yz;return true}
    return false;
  }

  function followCommand(a,cmd,dt){
    const target=cmd.target;
    if(!target){a.velocity.x=a.velocity.z=0;a.actor.moving=false;return}
    const terrainVersion=terrain.changeVersion||0,key=posKey(target);
    a.repath-=dt;
    if(key!==a.pathKey||a.repath<=0||a.lastTerrainVersion!==terrainVersion||a.pathIndex>=a.path.length){
      a.path=navigator.findPath(a.transform,target,{range:cmd.offscreen?40:28});
      a.pathIndex=a.path.length>1?1:0;a.pathKey=key;a.repath=cmd.offscreen?2.5:.75;a.lastTerrainVersion=terrainVersion;repaths++;
    }
    let node=a.path[a.pathIndex]||target;
    if(Math.hypot(num(node.x)-a.transform.x,num(node.z)-a.transform.z)<.38&&a.pathIndex<a.path.length-1)node=a.path[++a.pathIndex];
    const baseSpeed=num(a.definition?.ai?.walkSpeed,1.55),speed=cmd.goal==='flee'?baseSpeed*1.55:baseSpeed;
    const steer=navigator.steerToward(a,node,speed,actors);
    a.velocity.x=steer.x;a.velocity.z=steer.z;
    const moved=moveGround(a,a.velocity.x,a.velocity.z,dt);
    a.actor.moving=moved;
    a.actor.action=moved?'walk':cmd.state==='observe'?'attentive':cmd.state;
    if(Math.abs(a.velocity.x)>.03)a.actor.facingX=a.velocity.x<0?-1:1;
    if(!moved){a.velocity.x=a.velocity.z=0;a.repath=0}
  }

  function updateOne(a,dt,context){
    const step=Math.max(0,Math.min(.12,num(dt,0))),player=context?.player||null;
    const pd=player?Math.hypot(player.x-a.transform.x,player.z-a.transform.z):Infinity;
    const far=pd>num(a.definition?.ai?.fullSimRange,26);
    if(far){
      a.lodAccumulator+=step;if(a.lodAccumulator<.25)return;
      dt=a.lodAccumulator;a.lodAccumulator=0;coarseTicks++;
    }
    const ground=groundCenterY(a.transform.x,a.transform.z,a.collider.halfH,a.transform.y);
    if(a.transform.y>ground+.03){
      a.velocity.y=Math.max(-18,a.velocity.y-gravity*dt);
      a.transform.y=Math.max(ground,a.transform.y+a.velocity.y*dt);a.actor.grounded=a.transform.y<=ground+.03;
    }else{a.transform.y=ground;a.velocity.y=0;a.actor.grounded=true}
    const cmd=a.brain.tick({dt,actor:a,player,nav:navigator,actors,stimuli,worldMinutes:context?.worldMinutes??360});
    followCommand(a,cmd,dt);
    tickCount++;
  }

  ecs.registerSystem('npc-ai-actor',{
    require:['Transform','Velocity','Actor','NPC','Brain'],phase:'fixed',priority:40,
    update(entity,world,dt,context){const a=byEntity.get(entity);if(a)updateOne(a,dt,context)}
  });

  function emitStimulus(type,position,{radius=6,threat=false,ttl=8}={}){
    stimuli.push({type:String(type||'sound'),x:num(position?.x),y:num(position?.y),z:num(position?.z),radius:num(radius,6),threat:!!threat,ttl:num(ttl,8),born:performance.now()/1000});
    while(stimuli.length>24)stimuli.shift();
  }
  function pruneStimuli(){const now=performance.now()/1000;for(let i=stimuli.length-1;i>=0;i--)if(now-stimuli[i].born>stimuli[i].ttl)stimuli.splice(i,1)}
  setInterval(pruneStimuli,1000);

  function nearestInteractable(player,range=2.5){
    let best=null,bestD=range;
    for(const a of actors){
      if(!a.npc.interactable)continue;
      const d=Math.hypot(num(player?.x)-a.transform.x,num(player?.z)-a.transform.z);
      if(d<bestD){best=a;bestD=d}
    }
    return best?{actor:best,distance:bestD}:null;
  }
  function interact(id,{player,worldMinutes=0}={}){
    const a=byId.get(String(id));if(!a||!a.npc.interactable)return null;
    a.brain.onInteract(player);a.actor.action='attentive';a.actor.moving=false;a.velocity.x=a.velocity.z=0;
    emitStimulus('conversation',a.transform,{radius:3,threat:false,ttl:2});
    return dialogue.interact(a,{minutes:worldMinutes});
  }
  function interactNearest(player,worldMinutes,range=2.5){
    const hit=nearestInteractable(player,range);return hit?interact(hit.actor.id,{player,worldMinutes}):null;
  }

  function snapshot(){
    return actors.map(a=>({
      id:a.id,name:a.npc.name,role:a.npc.role,entity:a.entity,x:a.transform.x,y:a.transform.y,z:a.transform.z,yaw:a.transform.yaw,
      vx:a.velocity.x,vy:a.velocity.y,vz:a.velocity.z,hp:a.health.current,maxHp:a.health.max,action:a.actor.action,moving:a.actor.moving,grounded:a.actor.grounded,facingX:a.actor.facingX,
      width:a.actor.width,height:a.actor.height,collider:{...a.collider},appearance:{...a.npc.appearance},invulnerable:a.npc.invulnerable,interactable:a.npc.interactable,
      brain:a.brain.snapshot(),navigation:{pathLength:a.path.length,pathIndex:a.pathIndex,repath:a.repath}
    }));
  }
  function exportState(){
    return {actors:actors.map(a=>({id:a.id,x:a.transform.x,y:a.transform.y,z:a.transform.z,brain:a.brain.exportState()})),dialogue:dialogue.exportState()};
  }
  function importState(data){
    if(!data||typeof data!=='object')return false;
    for(const row of data.actors||[]){const a=byId.get(String(row.id));if(!a)continue;a.transform.x=num(row.x,a.transform.x);a.transform.y=num(row.y,a.transform.y);a.transform.z=num(row.z,a.transform.z);a.brain.importState(row.brain);a.path.length=0;a.repath=0}
    dialogue.importState(data.dialogue);return true;
  }
  function get(id){return byId.get(String(id))||null}
  function stats(){
    const offscreen=actors.filter(a=>a.brain.snapshot().offscreen).length;
    return {count:actors.length,ids:actors.map(a=>a.id),ecsActors:true,ecsSystem:'npc-ai-actor',sameActorComponentsAsPlayer:true,physicalColliders:true,
      aiStack:{perception:true,memory:true,voxelAStar:true,steeringAvoidance:true,fsm:true,utility:true,needs:true,schedule:true,social:true,dialogue:true,quests:true,offscreenLOD:true},
      offscreen,tickCount,repaths,coarseTicks,navigation:navigator.stats(),dialogue:dialogue.stats()};
  }
  return Object.freeze({actors,collidesAABB,snapshot,get,stats,emitStimulus,nearestInteractable,interact,interactNearest,exportState,importState,dialogueSnapshot:dialogue.snapshot});
}

global.PaperchalkNPCRuntime=Object.freeze({version:2,createNPCWorld});
})(window);
