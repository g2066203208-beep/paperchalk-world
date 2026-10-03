/**
 * Quiet, diegetic house interiors for the paper city.
 *
 * Every facade emitted by city-districts owns one doorway record.  This
 * renderer turns those records into small printed rooms which can be revealed
 * in place without a menu or an inspection card.  Only one room is visible at
 * a time, so the complete city can keep its mobile geometry budget.
 */
export function createCityInteriors({THREE,scene,flags={},buildings=[]}={}){
  if(!THREE||!scene)throw new TypeError('City interiors require THREE and a scene.');
  const group=new THREE.Group();
  group.name='Diegetic paper house interiors';
  group.visible=false;
  scene.add(group);

  // A single folded-card geometry and a handful of inks cover every room.
  // Scaling the shared box keeps draw/resource counts bounded even though the
  // city has more than a hundred doors.
  const cardGeometry=new THREE.BoxGeometry(1,1,.08);
  const floorGeometry=new THREE.BoxGeometry(1,.055,1);
  const inks=[0xf1dfbd,0xe4c9a7,0xc7d5c7,0x9dbbc0,0xd39b8c,0xb8a8c1,0x7e8f9d]
    .map((hex,index)=>{const material=new THREE.MeshLambertMaterial({color:hex,side:THREE.DoubleSide});material.name=`Interior paper ink ${index}`;return material;});
  const rooms=[];
  let active=null;
  const changed=()=>{flags.render=flags.shadow=flags.depth=flags.volumeShadow=true;};
  const hash=value=>{let h=0;for(const char of String(value??''))h=(h*31+char.charCodeAt(0))>>>0;return h;};
  const materialFor=(index=0)=>inks[Math.abs(index)%inks.length];
  const strip=(room,name,x,y,z,w,h,materialIndex=0,depth=.08)=>{
    const mesh=new THREE.Mesh(cardGeometry,materialFor(materialIndex));
    mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(w,h,depth/.08);mesh.castShadow=true;mesh.receiveShadow=true;
    room.add(mesh);return mesh;
  };
  const floor=(room,name,x,z,w,d,materialIndex=0)=>{
    const mesh=new THREE.Mesh(floorGeometry,materialFor(materialIndex));
    mesh.name=name;mesh.position.set(x,.525,z);mesh.scale.set(w,1,d);mesh.castShadow=true;mesh.receiveShadow=true;
    room.add(mesh);return mesh;
  };
  function makeFurniture(room,building,seed){
    const w=Math.max(5.7,Math.min(11,building.width*.88));
    const theme=building.districtId;
    // All furniture sits behind the actor's street-facing threshold.
    if(theme==='residential'||theme==='medical'){
      strip(room,'Interior bed headboard',-w*.23,1.54,-2.42,w*.34,1.28,5,.11);
      strip(room,'Interior bed blanket',-w*.23,1.12,-2.28,w*.52,.42,seed%2?3:4,.12);
      strip(room,'Interior bedside table',w*.19,.96,-1.92,.58,.82,6,.14);
      strip(room,'Interior bedside lamp',w*.19,1.64,-1.9,.12,.4,2,.1);
      return;
    }
    if(theme==='market'||theme==='shopping'||theme==='arts'){
      for(let i=-1;i<=1;i++){
        strip(room,'Interior display shelf',i*w*.24,1.55,-2.42,.14,2.12,6,.11);
        strip(room,'Interior display shelf board',i*w*.24,1.05,-2.28,w*.2,.09,seed%2?3:4,.12);
        strip(room,'Interior display shelf board',i*w*.24,1.68,-2.28,w*.2,.09,seed%2?3:4,.12);
      }
      strip(room,'Interior service counter',0,.83,-1.72,w*.54,.46,4,.15);
      return;
    }
    if(theme==='business'||theme==='civic'||theme==='school'){
      strip(room,'Interior long work table',0,1.12,-1.72,w*.6,.18,6,.2);
      for(const x of [-w*.2,0,w*.2])strip(room,'Interior desk lamp',x,1.42,-1.62,.07,.32,2,.09);
      for(const x of [-w*.34,w*.34])strip(room,'Interior bookcase',x,1.5,-2.42,.55,2.1,6,.1);
      return;
    }
    // Old town, port and park buildings get an unfussy studio interior.
    strip(room,'Interior round table',0,.86,-1.72,w*.34,.19,4,.22);
    strip(room,'Interior back shelf',0,1.52,-2.42,w*.64,1.45,6,.1);
    strip(room,'Interior hanging pennant',0,2.55,-2.38,w*.4,.12,seed%2?3:4,.04);
  }
  function makeRoom(building,index){
    const room=new THREE.Group();
    room.name=`${building.name} · 室内纸片场景`;
    room.position.x=building.entranceX??building.x;
    room.visible=false;
    const w=Math.max(5.7,Math.min(11,building.width*.92)),h=4.45;
    const seed=hash(building.id??index);
    const districtIndex=Math.max(0,building.districtId?hash(building.districtId)%6:0);
    // The room is a little theatre behind the threshold: back paper, two
    // folded side returns and a floor sheet.  The street disappears while the
    // room is active, leaving the actor in an uninterrupted diorama.
    floor(room,'Interior cream floor',0,-2.32,w,3.15,0);
    strip(room,'Interior back wall',0,2.65,-4.02,w,h,districtIndex%6,.1);
    strip(room,'Interior left folded return',-w*.5,2.55,-2.45,.16,h,1,.18);
    strip(room,'Interior right folded return',w*.5,2.55,-2.45,.16,h,2,.18);
    strip(room,'Interior upper paper cornice',0,4.64,-3.96,w+.22,.16,seed%4+1,.14);
    floor(room,'Interior woven paper rug',0,-1.38,w*.58,.72,seed%2?3:4);
    strip(room,'Interior window glow',0,3.02,-1.93,w*.36,.92,3,.045);
    // Door frame remains visible during entry and gives every house a clear
    // visual return point without an on-screen control label.
    strip(room,'Interior doorway left',-1.04,1.46,-1.98,.12,1.95,2,.12);
    strip(room,'Interior doorway right',1.04,1.46,-1.98,.12,1.95,2,.12);
    strip(room,'Interior doorway lintel',0,2.43,-1.98,2.2,.12,2,.14);
    makeFurniture(room,building,seed);
    // A small printed nameplate is part of the paper art, not HUD chrome.
    strip(room,`${building.name} interior plaque`,0,3.94,-3.9,Math.min(5.8,w*.7),.34,seed%5+1,.035);
    room.userData.cityInterior={id:building.id,index,building:{...building},entryX:building.entranceX??building.x,
      returnHint:'走回门口或按 Esc 返回街道'};
    group.add(room);rooms.push({id:building.id,index,building,room});
  }
  buildings.forEach(makeRoom);

  function find(id){return rooms.find(room=>room.id===id)?.building??null;}
  function nearby(x,radius=2.4){
    if(!Number.isFinite(x))return null;
    let best=null,bestDistance=Infinity;
    for(const item of rooms){const distance=Math.abs((item.building.entranceX??item.building.x)-x);
      const trigger=Math.max(radius,Math.min(3.8,(item.building.width??6)*.2));
      if(distance<=trigger&&distance<bestDistance){bestDistance=distance;best=item;}}
    return best?{...best.building,type:'interior',label:'进入室内',title:best.building.name,text:'门内是一间可漫游的纸片房间。走回门口即可回到街道。',distance:bestDistance}:null;
  }
  function setActive(value){
    const id=typeof value==='string'?value:value?.id??null;
    if(id===active)return !!active;
    for(const item of rooms)item.room.visible=!!id&&item.id===id;
    active=id&&rooms.some(item=>item.id===id)?id:null;
    group.visible=!!active;
    if(active){const item=rooms.find(room=>room.id===active);item.room.scale.set(1,1,1);item.room.position.y=0;}
    changed();return !!active;
  }
  function leave(){if(!active)return false;for(const item of rooms)item.room.visible=false;active=null;group.visible=false;changed();return true;}
  function update(){return false;}
  function stats(){return {rooms:rooms.length,active,visible:group.visible,triangles:rooms.length*0,interiorArt:'paper-room-v1'};}
  return {group,rooms,nearby,find,setActive,enter:setActive,leave,update,active:()=>active,stats,dispose(){for(const material of inks)material.dispose();cardGeometry.dispose();floorGeometry.dispose();}};
}
