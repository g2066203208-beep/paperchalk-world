
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TRAIN_STATES=Object.freeze(['approaching','arriving','doorsOpening','boarding','doorsClosing','departing','travelling']);

export function createTrainVehicle({THREE,parent,box,sign,mats,onInvalidate=()=>{}}={}){
  if(!THREE||!parent||!box)throw new TypeError('TrainVehicle requires Three.js, a parent and paper box builder.');
  const root=new THREE.Group();root.name='TrainVehicle · playable single carriage';parent.add(root);
  const carriageRoot=new THREE.Group();carriageRoot.name='CarriageRoot';root.add(carriageRoot);
  const exterior=new THREE.Group();exterior.name='Exterior';carriageRoot.add(exterior);
  const interior=new THREE.Group();interior.name='Interior';carriageRoot.add(interior);
  const doorLeft=new THREE.Group();doorLeft.name='DoorLeft';carriageRoot.add(doorLeft);
  const doorRight=new THREE.Group();doorRight.name='DoorRight';carriageRoot.add(doorRight);
  const passengerRoot=new THREE.Group();passengerRoot.name='VehiclePassengerRoot';carriageRoot.add(passengerRoot);

  const width=15.8,bodyZ=-5.12,doorHalf=.72,doorY=1.43;
  box(exterior,'Carriage lower body',width,.56,.20,0,.49,bodyZ,mats.tealDark);
  box(exterior,'Carriage roof strip',width,.42,.20,0,2.64,bodyZ,mats.ivory);
  box(exterior,'Carriage left shell',6.25,2.18,.18,-4.77,1.56,bodyZ,mats.ivory);
  box(exterior,'Carriage right shell',6.25,2.18,.18,4.77,1.56,bodyZ,mats.ivory);
  box(exterior,'Carriage route stripe',width,.16,.205,0,2.54,bodyZ+.10,mats.red);
  for(const x of [-5.3,-3.25,3.25,5.3]){
    box(exterior,'Carriage window',1.45,.93,.035,x,1.76,bodyZ+.14,mats.ink,{cast:false});
  }
  box(interior,'Visible carriage inner wall',4.0,2.0,.08,0,1.52,bodyZ-.16,mats.cream,{cast:false});
  box(interior,'Visible carriage floor',4.2,.10,1.15,0,.50,bodyZ+.52,mats.cream);
  for(const x of [-1.35,1.35])box(interior,'Interior paper seat',1.05,.45,.62,x,.78,bodyZ+.45,mats.seat);
  if(sign)sign(exterior,'Train destination','月河线','MOON RIVER LINE · 星灯方向',-4.9,2.48,bodyZ+.14,4.6,.55,'#557f7e');

  box(doorLeft,'Sliding paper door left',doorHalf*2,2.12,.05,-doorHalf,doorY,bodyZ+.15,mats.teal);
  box(doorRight,'Sliding paper door right',doorHalf*2,2.12,.05,doorHalf,doorY,bodyZ+.15,mats.teal);

  const standingAnchors=[-1.4,0,1.4].map((x,i)=>{
    const node=new THREE.Object3D();node.name='StandingAnchor '+(i+1);node.position.set(x,.5,bodyZ+.54);passengerRoot.add(node);return node;
  });
  const seatAnchors=[-1.35,1.35].map((x,i)=>{
    const node=new THREE.Object3D();node.name='SeatAnchor '+(i+1);node.position.set(x,.82,bodyZ+.54);passengerRoot.add(node);return node;
  });
  const boardingZones=[{x:0,radius:2.1,z:0}];
  const vehicleCollision={minX:-width*.5+.35,maxX:width*.5-.35,doorsBlockWhenClosed:true};

  const durations={approaching:2.4,arriving:.65,doorsOpening:.55,boarding:6.5,doorsClosing:.55,departing:2.2,travelling:4.2};
  let state='boarding',stateTime=0,enabled=false,doorOpen=1,routeOffset=0;
  const passenger={boarded:false,localX:0,seated:false};
  const doorClosedX={left:-doorHalf,right:doorHalf},doorTravel=.72;

  function nextState(){
    const index=TRAIN_STATES.indexOf(state);state=TRAIN_STATES[(index+1)%TRAIN_STATES.length];stateTime=0;
    if(state==='boarding')doorOpen=1;onInvalidate();
  }
  function setDoorOpen(value){
    doorOpen=clamp(value,0,1);
    doorLeft.position.x=-doorTravel*doorOpen;
    doorRight.position.x=doorTravel*doorOpen;
  }
  function motionForState(){
    const u=clamp(stateTime/Math.max(.001,durations[state]??1),0,1);
    if(state==='departing')routeOffset=18*u;
    else if(state==='travelling')routeOffset=18+16*u;
    else if(state==='approaching')routeOffset=34*(1-u);
    else if(state==='arriving')routeOffset=0;
    else if(['boarding','doorsOpening','doorsClosing'].includes(state))routeOffset=0;
    root.position.x=routeOffset;
  }
  function update(dt){
    if(!enabled||!Number.isFinite(dt)||dt<=0)return false;
    dt=Math.min(.1,dt);stateTime+=dt;motionForState();
    if(state==='doorsOpening')setDoorOpen(stateTime/durations.doorsOpening);
    else if(state==='doorsClosing')setDoorOpen(1-stateTime/durations.doorsClosing);
    else if(state==='boarding')setDoorOpen(1);
    else if(!['doorsOpening','doorsClosing'].includes(state))setDoorOpen(0);
    if(stateTime>=durations[state]){
      if(state==='travelling'){state='approaching';stateTime=0;}
      else nextState();
    }
    onInvalidate();return true;
  }
  function doorWorld(){
    root.updateWorldMatrix(true,false);
    return root.localToWorld(new THREE.Vector3(0,.5,0));
  }
  function doorsUsable(){return state==='boarding'||(state==='doorsOpening'&&doorOpen>.75);}
  function interaction(player){
    if(!player)return null;
    if(passenger.boarded){
      return {type:'train',action:doorsUsable()?'exit':'ride',label:doorsUsable()?'下车 · 月灯中央站':'列车行驶中',state};
    }
    const door=doorWorld(),distance=Math.abs((player.x??0)-door.x);
    if(distance>boardingZones[0].radius)return null;
    return {type:'train',action:doorsUsable()?'board':'wait',label:doorsUsable()?'上车 · 月河线':'等待列车开门',state,distance};
  }
  function passengerPose(){
    root.updateWorldMatrix(true,false);
    const local=new THREE.Vector3(passenger.localX,.5,bodyZ+.54);
    const world=root.localToWorld(local);
    return {x:world.x,y:world.y,z:world.z,vx:0,vy:0,grounded:true,facing:1,distance:0,groundY:world.y,supportY:world.y,onVehicle:true};
  }
  function board(){
    if(passenger.boarded||!doorsUsable())return null;
    passenger.boarded=true;passenger.localX=0;passenger.seated=false;onInvalidate();return passengerPose();
  }
  function disembark(){
    if(!passenger.boarded||!doorsUsable())return null;
    passenger.boarded=false;passenger.seated=false;
    const door=doorWorld();onInvalidate();
    return {x:door.x,y:.5,z:0,vx:0,vy:0,grounded:true,facing:1,distance:0,groundY:.5,supportY:.5,onVehicle:false};
  }
  function updatePassenger(dt,input={}){
    if(!passenger.boarded)return null;
    const axis=Number.isFinite(input.horizontal)?clamp(input.horizontal,-1,1):0;
    passenger.localX=clamp(passenger.localX+axis*2.25*Math.min(.1,Math.max(0,dt||0)),vehicleCollision.minX+1,vehicleCollision.maxX-1);
    return passengerPose();
  }
  function setEnabled(value){enabled=!!value;if(!enabled)onInvalidate();}
  setDoorOpen(1);
  root.userData.vehicleType='train';
  return {
    root,carriageRoot,exterior,interior,doorLeft,doorRight,passengerRoot,boardingZones,standingAnchors,seatAnchors,vehicleCollision,
    update,setEnabled,interaction,board,disembark,updatePassenger,passengerPose,doorsUsable,
    get boarded(){return passenger.boarded;},
    get state(){return state;},
    stats:()=>({state,stateTime,enabled,doorsOpen:doorOpen,boarded:passenger.boarded,localPassengerX:passenger.localX,
      routeOffset,carriages:1,standingAnchors:standingAnchors.length,seatAnchors:seatAnchors.length,boardingZones:boardingZones.length}),
  };
}
