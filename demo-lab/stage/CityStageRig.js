
import {createStageLifecycle,StageLifecycle,collectLocalHinges,hingeAudit} from './StageRig.js';
import {PAPER_STAGE_TIMING,phase,ripplePhase} from './StageTransitionTimeline.js';

export function createCityStageRig({THREE,scene,terrain,traffic,transit,scenery,districts,population,backdrop,lights,state,flags}={}){
  const lifecycle=createStageLifecycle('city',StageLifecycle.ready);
  const root=new THREE.Group();root.name='CityStage';scene.add(root);
  const floorCarrier=new THREE.Group();floorCarrier.name='CityFloorCarrier';root.add(floorCarrier);
  const verticalRoot=new THREE.Group();verticalRoot.name='CityVerticalSets';root.add(verticalRoot);
  const npcRoot=new THREE.Group();npcRoot.name='CityNpcRoot';root.add(npcRoot);
  const backdropCarrier=new THREE.Group();backdropCarrier.name='CityBackdropCarrier';root.add(backdropCarrier);

  scene.updateMatrixWorld(true);
  for(const object of [terrain?.terrainBlocks,traffic?.group,transit?.group].filter(Boolean))floorCarrier.attach(object);
  if(scenery?.group)verticalRoot.attach(scenery.group);
  if(districts?.group)verticalRoot.attach(districts.group);
  if(population?.group)npcRoot.attach(population.group);
  if(backdrop?.group)backdropCarrier.attach(backdrop.group);

  const pieces=collectLocalHinges([scenery?.group,districts?.group]).map(piece=>({
    ...piece,kind:piece.group.userData?.cityPaperBatch?'scenery':'district',transitionVisible:true,
  }));
  const base={floorY:floorCarrier.position.y,backdropY:backdropCarrier.position.y};
  let anchorX=0,trafficShadowClock=0;

  function setLights(factor){
    factor=Math.max(0,Math.min(1,factor));
    for(const light of lights?.locals??[]){
      const baseIntensity=light.userData.stageLitIntensity??light.userData.cityBaseIntensity??light.intensity;
      light.intensity=baseIntensity*factor;light.visible=factor>.015;
    }
  }
  function setPiece(piece,fold,visible=true){
    piece.group.rotation.x=piece.baseRotationX-fold*Math.PI*.5;
    piece.group.visible=!!visible&&fold<.9995;
  }
  function capture(nextAnchor){
    anchorX=Number.isFinite(nextAnchor)?nextAnchor:anchorX;
    root.visible=true;verticalRoot.visible=true;npcRoot.visible=true;
    districts?.update?.(anchorX);
    if(scenery?.group)scenery.group.visible=anchorX<75;
    for(const piece of pieces)piece.transitionVisible=piece.group.visible&&(piece.kind!=='scenery'||scenery.group.visible);
  }
  function setLifecycle(next){
    lifecycle.set(next);
    population?.setLifecycle?.(next);
  }
  function stableActive(playerX=anchorX){
    anchorX=Number.isFinite(playerX)?playerX:anchorX;root.visible=true;floorCarrier.position.y=base.floorY;backdropCarrier.position.y=base.backdropY;
    terrain.terrainBlocks.visible=state.layers;
    if(scenery?.group)scenery.group.visible=anchorX<75;if(districts?.group)districts.group.visible=true;
    for(const piece of pieces)setPiece(piece,0,piece.kind!=='scenery'||scenery.group.visible);
    population?.setStageWave?.({progress:1,anchorX,revealing:true});
    npcRoot.visible=true;if(backdrop?.group){backdrop.group.visible=state.layers;backdrop.group.position.x=anchorX*.985;}
    setLights(1);setLifecycle(StageLifecycle.active);
  }
  function stableDormant(){
    setLifecycle(StageLifecycle.dormant);setLights(0);root.visible=false;
  }
  function poseExit(t,nextAnchor=anchorX){
    anchorX=nextAnchor;root.visible=true;setLifecycle(StageLifecycle.exiting);
    const timing=PAPER_STAGE_TIMING.city;
    verticalRoot.visible=true;npcRoot.visible=true;
    for(const piece of pieces){
      const fold=ripplePhase(t,piece.x,anchorX,timing.vertical[0],timing.vertical[1],{range:92,spread:.12});
      setPiece(piece,fold,piece.transitionVisible);
    }
    population?.setStageWave?.({progress:phase(t,timing.actors[0],timing.actors[1]),anchorX,revealing:false});
    backdropCarrier.position.y=base.backdropY-1.35*phase(t,timing.backdrop[0],timing.backdrop[1]);
    floorCarrier.position.y=base.floorY-3.25*phase(t,timing.floor[0],timing.floor[1]);
    setLights(1-phase(t,timing.lights[0],timing.lights[1]));
  }
  function poseEnter(t,nextAnchor=anchorX){
    anchorX=nextAnchor;root.visible=true;setLifecycle(StageLifecycle.entering);
    const floor=phase(t,.43,.66);floorCarrier.position.y=base.floorY-3.25*(1-floor);
    const backdropRise=phase(t,.49,.72);backdropCarrier.position.y=base.backdropY-1.35*(1-backdropRise);
    terrain.terrainBlocks.visible=state.layers;if(backdrop?.group)backdrop.group.visible=state.layers&&t>.45;
    if(scenery?.group)scenery.group.visible=t>.56&&anchorX<75;if(districts?.group)districts.group.visible=t>.56;
    for(const piece of pieces){
      const open=ripplePhase(t,piece.x,anchorX,.61,.85,{range:92,spread:.12});
      setPiece(piece,1-open,piece.transitionVisible&&open>.002);
    }
    population?.setStageWave?.({progress:phase(t,.64,.94),anchorX,revealing:true});
    npcRoot.visible=t>.60;setLights(phase(t,.78,.98));
  }
  function updateDynamics(dt,playerX){
    if(lifecycle.state!==StageLifecycle.active)return false;
    let changed=false;anchorX=Number.isFinite(playerX)?playerX:anchorX;
    if(backdrop?.group)backdrop.group.position.x=anchorX*.985;
    if(scenery?.group)scenery.group.visible=anchorX<75;
    districts?.update?.(anchorX);
    if(population?.update?.(dt,anchorX))changed=true;
    if(transit?.update?.(dt,anchorX))changed=true;
    if(traffic?.update?.(dt)){
      changed=true;trafficShadowClock+=dt;
      if(trafficShadowClock>=1/30){flags.shadow=true;trafficShadowClock%=1/30;}
    }
    if(changed)flags.render=flags.depth=flags.ao=true;
    return changed;
  }
  function nearbyPerson(x){return lifecycle.state===StageLifecycle.active?population?.nearby?.(x)??null:null;}
  function stats(){
    const p=population?.stats?.()??{},trafficStats=traffic?.stats?.()??{},transitStats=transit?.stats?.()??{};
    const activeVehicles=lifecycle.state===StageLifecycle.active?((trafficStats.cars??0)+(transitStats.buses?.length??0)):0;
    return {lifecycle:lifecycle.state,hinges:pieces.length,activeNpc:lifecycle.state===StageLifecycle.active?(p.visible??0):0,
      dormantNpc:lifecycle.state===StageLifecycle.dormant?(p.residents??0):0,activeVehicles,
      floorBoundVehicleGroups:[traffic?.group,transit?.group].filter(Boolean).length,rootVisible:root.visible,
      pivotAudit:hingeAudit([scenery?.group,districts?.group])};
  }
  return {root,floorCarrier,verticalRoot,npcRoot,backdropCarrier,pieces,lifecycle,capture,setLifecycle,stableActive,stableDormant,poseExit,poseEnter,updateDynamics,nearbyPerson,stats};
}
