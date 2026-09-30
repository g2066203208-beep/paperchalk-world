import {PaperSpriteEntity} from './PaperSpriteEntity.js?v=paper-r13';

export class NPCActorRenderer{
  constructor(THREE,scene,{actorTexture=null}={}){
    this.THREE=THREE;this.scene=scene;this.actorTexture=actorTexture;
    this.root=new THREE.Group();this.root.name='npc-paper-actors';scene.add(this.root);
    this.actors=new Map();this.version=0;
  }
  _create(npc){
    const actor=new PaperSpriteEntity(this.THREE,{
      id:npc.id,kind:'npc',label:npc.name||'',x:npc.x||0,y:npc.y||0,z:npc.z||0,
      width:Number(npc.width)||1,height:Number(npc.height)||2,anchorY:(Number(npc.height)||2)*.5,
      texture:this.actorTexture,disposeTexture:false
    });
    actor.root.userData={entityKind:'npc',npcId:npc.id,ecsEntity:npc.entity||null};
    this.root.add(actor.root);this.actors.set(npc.id,actor);this.version++;return actor;
  }
  update(npcs=[],dt=0,stageYaw=0){
    const alive=new Set();
    for(const npc of Array.isArray(npcs)?npcs:[]){
      if(!npc?.id)continue;alive.add(npc.id);
      const actor=this.actors.get(npc.id)||this._create(npc);
      const target=new this.THREE.Vector3(Number(npc.x)||0,Number(npc.y)||0,Number(npc.z)||0);
      const k=1-Math.pow(.0003,Math.max(0,Number(dt)||0));
      actor.root.position.lerp(target,k);
      actor.root.rotation.y=stageYaw;
      actor.setFacing((Number(npc.facingX)||1)<0?-1:1);
      actor.update(dt);
      actor.mesh.position.y=npc.action==='walk'?Math.sin(performance.now()*.018+(npc.entity||0))*.025:0;
    }
    for(const [id,actor] of [...this.actors]){
      if(alive.has(id))continue;
      this.root.remove(actor.root);actor.dispose();this.actors.delete(id);this.version++;
    }
  }
  stats(){return {count:this.actors.size,ids:[...this.actors.keys()],renderMode:'PaperSpriteEntity-actor-layer',sharedEntityClassWithPlayer:true,sharedPlayerTexture:true,actorAsset:'assets/player/protagonist.webp',root:'npc-paper-actors'}}
  dispose(){
    for(const actor of this.actors.values())actor.dispose();
    this.actors.clear();this.scene.remove(this.root);
  }
}
