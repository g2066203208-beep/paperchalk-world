/* NPC actor runtime. NPCs use the same ECS actor components/collider scale as the player. */
(function(global){
'use strict';

function num(v,fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

function createNPCWorld({definitions=[],terrain,ecs,gravity=22}={}){
  if(!terrain)throw new Error('NPC_TERRAIN_REQUIRED');
  if(!ecs)throw new Error('NPC_ECS_REQUIRED');
  const actors=[];
  const byId=new Map(),byEntity=new Map();

  function groundCenterY(x,z,halfH,fromY=null){
    const fromCell=Number.isFinite(Number(fromY))
      ?Math.floor((Number(fromY)+halfH+.35)/terrain.tileSize)
      :96;
    return terrain.highestGroundY(x,z,{fromCell,toCell:-256})+halfH;
  }
  function make(def,index){
    const id=String(def?.id||('npc-'+index));
    const spawn=def?.spawn||{};
    const collider={
      halfW:Math.max(.12,num(def?.collider?.halfW,.34)),
      halfH:Math.max(.25,num(def?.collider?.halfH,.95)),
      halfD:Math.max(.12,num(def?.collider?.halfD,.28))
    };
    const x=num(spawn.x,index*1.4+3),z=num(spawn.z,1.5);
    const y=Number.isFinite(Number(spawn.y))?Number(spawn.y):groundCenterY(x,z,collider.halfH);
    const transform={x,y,z,yaw:num(spawn.yaw,0)};
    const velocity={x:0,y:0,z:0};
    const health={current:Math.max(1,num(def?.maxHp,10)),max:Math.max(1,num(def?.maxHp,10))};
    const actor={
      kind:'npc',action:'idle',moving:false,grounded:true,
      facingX:num(def?.facingX,-1)<0?-1:1,
      width:Math.max(.4,num(def?.width,1)),
      height:Math.max(.7,num(def?.height,2))
    };
    const npc={
      id,name:String(def?.name||'NPC'),role:String(def?.role||'villager'),
      invulnerable:def?.invulnerable!==false,
      interactable:def?.interactable!==false,
      appearance:{...(def?.appearance||{})}
    };
    const entity=ecs.create({Transform:transform,Velocity:velocity,Health:health,Actor:actor,NPC:npc});
    const record={entity,id,transform,velocity,health,actor,npc,collider,definition:def};
    actors.push(record);byId.set(id,record);byEntity.set(entity,record);return record;
  }
  for(let i=0;i<definitions.length;i++)make(definitions[i],i);

  function updateOne(a,dt,player){
    const step=Math.max(0,Math.min(.08,num(dt,0)));
    const ground=groundCenterY(a.transform.x,a.transform.z,a.collider.halfH,a.transform.y);
    if(a.transform.y>ground+.015){
      a.velocity.y=Math.max(-18,a.velocity.y-gravity*step);
      a.transform.y=Math.max(ground,a.transform.y+a.velocity.y*step);
      a.actor.grounded=a.transform.y<=ground+.015;
    }else{
      a.transform.y=ground;a.velocity.y=0;a.actor.grounded=true;
    }
    if(player){
      const dx=player.x-a.transform.x,dz=player.z-a.transform.z;
      const distance=Math.hypot(dx,dz);
      if(distance<5.5&&Math.abs(dx)>.08)a.actor.facingX=dx<0?-1:1;
      a.actor.action=distance<2.4?'attentive':'idle';
    }else a.actor.action='idle';
  }
  function update(dt,player){for(const a of actors)updateOne(a,dt,player)}
  ecs.registerSystem('npc-actor',{
    require:['Transform','Velocity','Actor','NPC'],phase:'fixed',priority:40,
    update(entity,world,dt,context){
      const record=byEntity.get(entity);if(record)updateOne(record,dt,context?.player||null);
    }
  });

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

  function snapshot(){
    return actors.map(a=>({
      id:a.id,name:a.npc.name,role:a.npc.role,entity:a.entity,
      x:a.transform.x,y:a.transform.y,z:a.transform.z,yaw:a.transform.yaw,
      vx:a.velocity.x,vy:a.velocity.y,vz:a.velocity.z,
      hp:a.health.current,maxHp:a.health.max,
      action:a.actor.action,moving:a.actor.moving,grounded:a.actor.grounded,facingX:a.actor.facingX,
      width:a.actor.width,height:a.actor.height,
      collider:{...a.collider},appearance:{...a.npc.appearance},
      invulnerable:a.npc.invulnerable,interactable:a.npc.interactable
    }));
  }
  function get(id){return byId.get(String(id))||null}
  function stats(){return {count:actors.length,ids:actors.map(a=>a.id),ecsActors:true,ecsSystem:'npc-actor',sameActorComponentsAsPlayer:true,physicalColliders:true}}
  return Object.freeze({actors,update,collidesAABB,snapshot,get,stats});
}

global.PaperchalkNPCRuntime=Object.freeze({version:1,createNPCWorld});
})(window);
