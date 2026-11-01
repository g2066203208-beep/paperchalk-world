import * as THREE from 'three';
export const LEVEL_H=3.1;
export const ROOMS=[
 {id:'genkan',name:'玄关',x:6,z:-2.35,desc:'入户门、猫眼、门锁、防盗链、鞋柜。朝南进入公共走廊。'},
 {id:'living',name:'客厅',x:8.2,z:-6.0,desc:'窗、旧电视、沙发、矮桌和收音机。玄关向北通往这里。'},
 {id:'kitchen',name:'厨房',x:10.1,z:-2.35,desc:'料理台、洗碗池、储藏柜。与玄关同侧、连接客厅。'},
 {id:'bedroom',name:'卧室',x:1.85,z:-6.85,desc:'床铺、床头灯、衣柜。从客厅的西侧门进入。'},
 {id:'bathroom',name:'卫生间',x:1.85,z:-3.0,desc:'浴室和洗手台，靠近玄关，通过独立门进入。'},
 {id:'corridor',name:'三楼公共走廊',x:6,z:0,desc:'宽 2.8 m。301与302朝北侧开门，303与304朝南侧开门；东西两端分别连接楼梯与电梯。'}
];
export const PALETTE={wall:0x9f9989,side:0x827e74,concrete:0x707a80,corridor:0x67737a,wood:0x765445,glass:0x9ab7bd,door:0x583d32,trim:0x4e4d49,cream:0xc7b8a0,accent:0xe4b87f,room:0x8b8178,stair:0x9a9a91,green:0x606d5c};
const materials={
 concrete:new THREE.MeshStandardMaterial({color:PALETTE.concrete,roughness:.94}),
 floor:new THREE.MeshStandardMaterial({color:0x85817a,roughness:.95}),
 hall:new THREE.MeshStandardMaterial({color:PALETTE.corridor,roughness:.92}),
 wall:new THREE.MeshStandardMaterial({color:PALETTE.wall,roughness:.96,side:THREE.DoubleSide}),
 inner:new THREE.MeshStandardMaterial({color:0xb5ac9c,roughness:.95,side:THREE.DoubleSide}),
 brown:new THREE.MeshStandardMaterial({color:PALETTE.wood,roughness:.9}),
 door:new THREE.MeshStandardMaterial({color:PALETTE.door,roughness:.8}),
 steel:new THREE.MeshStandardMaterial({color:0x8a8d8b,metalness:.5,roughness:.42}),
 dark:new THREE.MeshStandardMaterial({color:0x34393b,roughness:.88}),
 tiles:new THREE.MeshStandardMaterial({color:0x8b8880,roughness:.95}),
 bed:new THREE.MeshStandardMaterial({color:0xadb2a9,roughness:1}),
 cover:new THREE.MeshStandardMaterial({color:0x888d80,roughness:1}),
 sofa:new THREE.MeshStandardMaterial({color:0x6a7467,roughness:1}),
 kitchen:new THREE.MeshStandardMaterial({color:0x9b9284,roughness:.85}),
 white:new THREE.MeshStandardMaterial({color:0xd0d1c8,roughness:.95}),
 glass:new THREE.MeshStandardMaterial({color:PALETTE.glass,transparent:true,opacity:.42,metalness:.1,roughness:.2,depthWrite:false,side:THREE.DoubleSide}),
 glow:new THREE.MeshStandardMaterial({color:0xffd79d,emissive:0xffc67d,emissiveIntensity:.6}),
 tape:new THREE.MeshStandardMaterial({color:0xb7a380,roughness:.9}),
 plant:new THREE.MeshStandardMaterial({color:0x606b53,roughness:1})
};
function tag(group,key){group.traverse?.(o=>{if(o.isMesh&&key)o.userData.room=key});return group}
function shape(parent,mat,x,y,z,w,h,d,room=''){
 const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 o.position.set(x,y,z);o.castShadow=h>.2;o.receiveShadow=true;if(room)o.userData.room=room;parent.add(o);return o;
}
function wallX(parent,x1,x2,z,y,h=2.68,material=materials.wall,room=''){if(x2<=x1)return null;return shape(parent,material,(x1+x2)/2,y+h/2,z,x2-x1,h,.16,room)}
function wallZ(parent,z1,z2,x,y,h=2.68,material=materials.wall,room=''){if(z2<=z1)return null;return shape(parent,material,x,y+h/2,(z1+z2)/2,.16,h,z2-z1,room)}
function beamX(p,x1,x2,z,y,above=2.22,height=.45){return wallX(p,x1,x2,z,y+above,height)}
function panelDoor(p,x,z,y,north=true,room='corridor'){
 const g=new THREE.Group();g.position.set(x,y,z);p.add(g);
 shape(g,materials.door,0,1.07,0,.98,2.14,.067,room);
 shape(g,materials.steel,north?.38:-.38,1.02,-.064,.07,.13,.07,room);
 shape(g,materials.steel,0,1.61,-.047,.045,.045,.024,room); // peephole
 shape(g,materials.steel,0,2.15,0,1.07,.04,.07,room);
 return g;
}
function makeLabel(p,text,x,y,z,size=1.25,color='#f7ecd5'){
 const c=document.createElement('canvas');c.width=512;c.height=128;
 const a=c.getContext('2d');a.clearRect(0,0,512,128);
 a.fillStyle='#101719cc';a.fillRect(2,19,508,88);
 a.strokeStyle='#bacac8';a.lineWidth=2;a.strokeRect(2,19,508,88);
 a.fillStyle=color;a.font='bold 55px system-ui, sans-serif';a.textAlign='center';a.textBaseline='middle';a.fillText(text,256,63,485);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,depthWrite:false}));
 sprite.position.set(x,y,z);sprite.scale.set(size*2.5,size*.64,1);sprite.renderOrder=500;p.add(sprite);return sprite;
}
function makeRoomFloor(parent,x1,x2,z1,z2,y,color,room){
 const mat=new THREE.MeshStandardMaterial({color,roughness:.98});
 return shape(parent,mat,(x1+x2)/2,y+.065,(z1+z2)/2,x2-x1,.045,z2-z1,room);
}
function stair(p,x,z,y,flip){
 const stair=new THREE.Group();p.add(stair);
 shape(stair,materials.concrete,x,y+.12,z,3.1,.24,9.3);
 for(let i=0;i<11;i++){
  const zi=flip?(z+3.5-i*.65):(z-3.5+i*.65);
  shape(stair,materials.stair,x,y+.19+(i+1)*.24,zi,2.18,.20,.67,'stairs');
 }
 // edge handrail, using simple diagonal cylinders
 for(const side of [-1,1]){
  const cyl=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,9.3,8),materials.steel);
  cyl.position.set(x+side*1.12,y+1.78,z);cyl.rotation.x=flip?-.36:.36;p.add(cyl);
 }
}
function buildCorridor(p,walls,doors,y){
 shape(p,materials.hall,0,y+.04,0,24,.09,2.8,'corridor');
 // visual stripe down corridor
 shape(p,materials.tape,0,y+.094,0,23.6,.008,.055,'corridor');
 for(const x of [-6,6]){
  for(const z of [-1.4,1.4]){
   wallX(walls,x-6,x-.61,z,y);
   wallX(walls,x+.61,x+6,z,y);
   beamX(walls,x-.62,x+.62,z,y);
   panelDoor(doors,x,z,y,z<0,'corridor');
  }
 }
 // the corridor ends at the staircase and elevator, but do not close the east/west access.
}
function buildGenericUnit(p,walls,x1,x2,z1,z2,y,north,label){
 const unit=new THREE.Group();p.add(unit);
 const rear=north?z1:z2;
 wallX(walls,x1,x2,rear,y);
 wallZ(walls,z1,z2,x1,y);
 wallZ(walls,z1,z2,x2,y);
 const quarter=x1+(x2-x1)*.35,divider=north?z1+(z2-z1)*.57:z2-(z2-z1)*.57;
 wallZ(walls,z1,z2,quarter,y);
 wallX(walls,x1,x2,divider,y);
 makeRoomFloor(unit,x1+.1,x2-.1,z1+.1,z2-.1,y,north?0x66645e:0x606969,'unit-'+label);
 return unit;
}
function build302(p,y,refs){
 const g=new THREE.Group();g.name='302';p.add(g);
 const walls=new THREE.Group();walls.name='302 partitions';g.add(walls);
 const props=new THREE.Group();props.name='302 props';g.add(props);
 const labels=new THREE.Group();labels.name='302 labels';g.add(labels);
 const roof=new THREE.Group();roof.name='302 ceilings';g.add(roof);
 refs.detail=g;refs.interiorWalls=walls;refs.furniture=props;refs.labels=labels;refs.roof=roof;
 // Floor tiles correspond to real functional subrooms.
 makeRoomFloor(g,3.9,8.2,-3.25,-1.4,y,0x978d7f,'genkan');
 makeRoomFloor(g,8.2,11.95,-3.25,-1.4,y,0xaaa18a,'kitchen');
 makeRoomFloor(g,3.9,11.95,-8.95,-3.25,y,0x86776b,'living');
 makeRoomFloor(g,.1,3.9,-8.95,-4.65,y,0x77736c,'bedroom');
 makeRoomFloor(g,.1,3.9,-4.65,-1.4,y,0x8c9994,'bathroom');
 // North/outer walls, partition and entry corridor wall.
 wallX(walls,0,12,-9,y);
 wallZ(walls,-9,-1.4,12,y);
 wallZ(walls,-9,-1.4,0,y);
 // 302 main entrance, deliberately aligned with public corridor door x=6, z=-1.4.
 // Corridor door is made by buildCorridor; this is inner top frame.
 wallX(walls,0,5.42,-1.4,y);wallX(walls,6.58,12,-1.4,y);beamX(walls,5.42,6.58,-1.4,y);
 // Bedroom and bathroom, accessible from living and foyer via separate openings.
 wallX(walls,0,3.9,-4.65,y);
 wallZ(walls,-8.95,-6.7,3.9,y);wallZ(walls,-5.65,-4.65,3.9,y);beamX(walls,3.9,3.9,-6.65,y); // harmless zero-width trim
 wallZ(walls,-4.65,-2.92,3.9,y);wallZ(walls,-1.93,-1.4,3.9,y);
 // living from foyer, 1.35m entrance centered at x6
 wallX(walls,0,5.3,-3.25,y);wallX(walls,6.7,8.2,-3.25,y);
 // kitchen is open-plan; subtle countertop divider instead of full-height wall
 shape(props,materials.kitchen,8.5,y+.52,-3.35,1.15,1.04,.45,'kitchen');
 // entrance floor step and skirting
 shape(props,materials.tiles,6,y+.055,-1.98,1.64,.08,1.6,'genkan');
 // genkan shoe rack, small table, old radio box and mirror on wall
 shape(props,materials.brown,8.75,y+.52,-2.05,2.3,1.04,.47,'genkan');
 shape(props,materials.brown,8.75,y+1.07,-2.05,2.34,.08,.53,'genkan');
 const radio=shape(props,materials.dark,8.4,y+1.22,-2.05,.64,.27,.25,'genkan');
 shape(props,materials.steel,8.4,y+1.24,-1.905,.3,.12,.01,'genkan');
 shape(props,materials.white,9.45,y+1.12,-2.04,.26,.025,.24,'genkan');
 shape(props,materials.glass,3.98,y+1.48,-2.22,.035,.84,.54,'genkan');
 // rule notices / intercom near the entrance
 shape(props,materials.white,7.5,y+1.62,-1.46,.43,.6,.025,'genkan');
 shape(props,materials.dark,7.5,y+1.55,-1.435,.23,.1,.01,'genkan');
 // kitchen north wall is z=-3.25; wall units and sink
 shape(props,materials.kitchen,10.15,y+.47,-2.92,3.15,.95,.58,'kitchen');
 shape(props,materials.steel,9.46,y+.96,-2.86,.7,.035,.42,'kitchen');
 shape(props,materials.dark,11.0,y+.96,-2.86,.38,.035,.42,'kitchen');
 shape(props,materials.brown,10.15,y+2.02,-3.04,2.4,.75,.32,'kitchen');
 const sink=new THREE.Mesh(new THREE.TorusGeometry(.23,.04,6,16,Math.PI),materials.steel);
 sink.position.set(9.46,y+1.04,-2.84);sink.rotation.x=-Math.PI/2;props.add(sink);
 // living room window / frame at north facade
 shape(props,materials.glass,8.8,y+1.66,-8.92,2.4,1.1,.05,'living');
 shape(props,materials.steel,8.8,y+1.66,-8.86,.05,1.17,.07,'living');
 shape(props,materials.steel,8.8,y+2.21,-8.86,2.5,.05,.07,'living');
 shape(props,materials.steel,8.8,y+1.10,-8.86,2.5,.05,.07,'living');
 // sofa set and a coffee table; front TV.
 shape(props,materials.sofa,7.2,y+.37,-6.65,3,.65,.95,'living');
 shape(props,materials.sofa,7.2,y+.78,-7.03,3,.75,.22,'living');
 shape(props,materials.sofa,5.7,y+.6,-6.65,.28,.52,1,'living');
 shape(props,materials.sofa,8.7,y+.6,-6.65,.28,.52,1,'living');
 shape(props,materials.brown,7.2,y+.36,-5.06,1.7,.19,.82,'living');
 shape(props,materials.dark,10.75,y+.82,-6.7,1.27,1.24,.17,'living');
 shape(props,materials.brown,10.75,y+.25,-6.7,1.52,.45,.55,'living');
 // bedroom bed/nightstand/wardrobe
 shape(props,materials.brown,1.84,y+.26,-7.24,2.05,.5,2.83,'bedroom');
 shape(props,materials.bed,1.84,y+.55,-7.2,1.91,.18,2.6,'bedroom');
 shape(props,materials.white,1.84,y+.68,-8.18,1.65,.17,.5,'bedroom');
 shape(props,materials.cover,1.84,y+.67,-6.65,1.90,.13,1.25,'bedroom');
 shape(props,materials.brown,.5,y+.54,-5.35,.62,1.08,.72,'bedroom');
 shape(props,materials.brown,3.15,y+.43,-7.95,.55,.85,.62,'bedroom');
 shape(props,materials.glow,3.15,y+.91,-7.95,.22,.18,.22,'bedroom');
 // bathroom tub and basin
 shape(props,materials.white,1.3,y+.42,-4.03,2.1,.73,.96,'bathroom');
 shape(props,materials.glass,1.3,y+.55,-4.04,1.7,.04,.65,'bathroom');
 shape(props,materials.white,2.75,y+.69,-2.15,.6,.32,.45,'bathroom');
 shape(props,materials.white,1.08,y+.35,-2.03,.53,.7,.63,'bathroom');
 shape(props,materials.glass,2.75,y+1.52,-1.53,.67,.62,.03,'bathroom');
 // roof visible only when specifically requested (for layout overview keep hidden)
 shape(roof,materials.concrete,6,y+2.84,-5.2,12,.12,7.6);
 // labels raised above the partition tops for overhead views
 for(const r of ROOMS.slice(0,5))makeLabel(labels,r.name,r.x,y+2.96,r.z,r.id==='living'?1.1:.78,r.id==='genkan'?'#ffe7b5':'#eee9da');
 const light=new THREE.PointLight(0xffca84,18,9,2);light.position.set(6.35,y+2.42,-2.7);props.add(light);refs.entranceLamp=light;
 return g;
}
export function buildBuilding(){
 const root=new THREE.Group();root.name='Aokitō Apartment / 5 floors';
 const floors=[],refs={};
 const base=new THREE.Group();root.add(base);
 shape(base,materials.concrete,0,-.33,0,31,.62,18.8);
 for(let f=1;f<=5;f++){
  const y=(f-1)*LEVEL_H,fg=new THREE.Group();fg.name='Floor '+f;root.add(fg);
  const walls=new THREE.Group(),doors=new THREE.Group(),generic=new THREE.Group(),roof=new THREE.Group(),cores=new THREE.Group(),labels=new THREE.Group(),parts=new THREE.Group();
  fg.add(walls,doors,generic,roof,cores,labels,parts);
  // Main slabs for all four residential units + hallway, matching cutaway footprint.
  shape(fg,materials.floor,0,y-.04,0,24,.12,18,'floor');
  buildCorridor(fg,walls,doors,y);
  for(const [n,x1,x2,z1,z2,isNorth] of [
   [f+'01',-12,0,-9,-1.4,true],[f+'02',0,12,-9,-1.4,true],
   [f+'03',-12,0,1.4,9,false],[f+'04',0,12,1.4,9,false]
  ]){
   if(f===3&&n==='302')continue;
   buildGenericUnit(generic,walls,x1,x2,z1,z2,y,isNorth,n);
  }
  // West stair tower and east elevator/core align at all levels.
  shape(cores,materials.concrete,-13.67,y-.04,0,3.35,.13,9.3,'stairs');
  shape(cores,materials.concrete,13.65,y-.04,0,3.35,.13,5.2,'elevator');
  wallZ(cores,-4.65,4.65,-15.30,y,2.8);wallZ(cores,-4.65,-1.4,-12.15,y,2.8);wallZ(cores,1.4,4.65,-12.15,y,2.8);
  wallX(cores,-15.3,-12.15,-4.65,y);wallX(cores,-15.3,-12.15,4.65,y);
  stair(cores,-13.69,0,y,f%2===0);
  wallZ(cores,-2.6,2.6,15.25,y);wallX(cores,12.1,15.25,-2.6,y);wallX(cores,12.1,15.25,2.6,y);
  wallZ(cores,-2.6,-.73,12.12,y);wallZ(cores,.73,2.6,12.12,y);panelDoor(cores,12.1,0,y,true,'elevator');
  if(f===1){
   // main entrance at southwest side of corridor, visible in level-one blockout
   shape(cores,materials.glass,-11.96,y+1.16,.0,.07,2.23,1.6,'lobby');
  }
  if(f===3)build302(fg,y,refs);
  for(const [tx,tz,label] of [[-6,-5.5,f+'01'],[6,-5.5,f+'02'],[-6,5.3,f+'03'],[6,5.3,f+'04']]){
   if(f===3&&label==='302')continue;
   makeLabel(labels,label,tx,y+2.83,tz,.62);
  }
  makeLabel(labels,f+'F',-13.6,y+3.02,0,.55,'#c0dad3');
  if(f===3)makeLabel(labels,'3F 走廊',-3,y+2.82,0,.83,'#dfebe6');
  // roof slabs as independent visibility toggle.
  shape(roof,materials.concrete,0,y+2.91,0,24,.12,18);
  floors.push({f,y,group:fg,walls,doors,generic,roof,cores,labels,parts});
 }
 // 302 entrance door is part of corridor doors; capture for visual peephole toggle.
 refs.entryDoor=floors[2].doors.children.find(o=>o.type==='Group'&&Math.abs(o.position.x-6)<.01&&Math.abs(o.position.z+1.4)<.01);
 refs.base=base;refs.floors=floors;
 root.userData.refs=refs;
 return {root,refs,materials};
}
export function updateBuildingDisplay(refs,{mode='building',floor=3,walls=true,furniture=true,roof=false,labels=true}={}){
 const isOverview=mode==='building',detailModes=['apartment','foyer','hallway','peephole'].includes(mode);
 refs.base.visible=isOverview;
 for(const fl of refs.floors){
  fl.group.visible=isOverview||fl.f===floor;
  fl.walls.visible=walls;fl.generic.visible=!detailModes||fl.f!==3;
  fl.doors.visible=!detailModes||fl.f===3;
  fl.cores.visible=true;
  fl.roof.visible=roof&&!['foyer','hallway','peephole'].includes(mode);
  fl.labels.visible=labels&&!['foyer','hallway','peephole'].includes(mode);
 }
 refs.interiorWalls.visible=walls;
 refs.furniture.visible=furniture;
 refs.labels.visible=labels&&!['foyer','hallway','peephole'].includes(mode);
 refs.roof.visible=roof&&!['foyer','hallway','peephole'].includes(mode);
 if(refs.entryDoor)refs.entryDoor.visible=mode!=='peephole';
}
export function roomCenter(id){const r=ROOMS.find(v=>v.id===id);return r?new THREE.Vector3(r.x,6.2+1.05,r.z):new THREE.Vector3(6,7.4,-3)}
