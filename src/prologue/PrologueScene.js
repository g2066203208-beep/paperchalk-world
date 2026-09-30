import {PaperSpriteEntity} from '../entities/PaperSpriteEntity.js?v=paper-r15';

const MAT_COLORS={
  school:0xd9ddd9,gym:0xc8cbc6,shop:0xe7d0a9,office:0xb9c5cc,apartment:0xcbbfb4,
  house:0xe1d0ba,station:0xbfc8cc
};

export class PrologueScene{
  constructor(THREE,host,content){
    this.THREE=THREE;this.host=host;this.content=content;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.className='prologue-canvas';host.appendChild(this.renderer.domElement);
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xbfcbd1);this.scene.fog=new THREE.Fog(0xbfcbd1,65,145);
    this.camera=new THREE.PerspectiveCamera(43,1,.1,260);
    this.clockTime=0;
    this.materials=this._materials();
    this.groups={school:new THREE.Group(),city:new THREE.Group(),home:new THREE.Group()};
    for(const [id,g] of Object.entries(this.groups)){g.name='prologue-zone:'+id;this.scene.add(g)}
    this.actorGroup=new THREE.Group();this.actorGroup.name='prologue-actors';this.scene.add(this.actorGroup);
    this.carGroup=new THREE.Group();this.carGroup.name='prologue-cars';this.scene.add(this.carGroup);
    this._lights();this._buildSchool();this._buildCity();this._buildHome();
    this._buildSignals();this._buildObjectiveMarker();
    this.actorTexture=new THREE.TextureLoader().load('assets/player/protagonist.webp?v=prologue-r1',tex=>{
      tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;
    });
    this.actorTexture.colorSpace=THREE.SRGBColorSpace;
    this.player=new PaperSpriteEntity(THREE,{id:'prologue-player',kind:'player',width:1,height:2,anchorY:1,texture:this.actorTexture,disposeTexture:false});
    this.actorGroup.add(this.player.root);
    this.people=new Map();this.cars=new Map();this.lastZone='';
    this.camera.position.set(8,8,12);this.cameraTarget=new THREE.Vector3();
    this.resize();
  }
  _materials(){
    const T=this.THREE;
    const lam=(color,rough=.92)=>new T.MeshStandardMaterial({color,roughness:rough,metalness:0});
    return {
      ground:lam(0x88958b),asphalt:lam(0x3e4549),sidewalk:lam(0xc7c2b7),curb:lam(0xddd8cd),
      white:lam(0xf0eee6),yellow:lam(0xe5c759),glass:new T.MeshStandardMaterial({color:0x8fb1c5,roughness:.2,metalness:.05,transparent:true,opacity:.76}),
      windowLit:new T.MeshStandardMaterial({color:0xffd99a,roughness:.5,emissive:0xd89743,emissiveIntensity:.22}),
      tree:lam(0x4d7350),trunk:lam(0x745844),grass:lam(0x73836b),metal:lam(0x4b5357,.55),
      wall:lam(0xe7e1d6),floor:lam(0xc8b79e),wood:lam(0xa77f5e),dark:lam(0x49433d),
      signalRed:new T.MeshStandardMaterial({color:0x57221f,emissive:0xe8392e,emissiveIntensity:.25}),
      signalGreen:new T.MeshStandardMaterial({color:0x1e5738,emissive:0x36d47d,emissiveIntensity:.25})
    };
  }
  _lights(){
    const T=this.THREE;
    this.hemi=new T.HemisphereLight(0xe6f0f5,0x77736d,2.1);this.scene.add(this.hemi);
    this.sun=new T.DirectionalLight(0xffe2ba,3.1);this.sun.position.set(-34,48,26);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(1536,1536);this.sun.shadow.camera.left=-70;this.sun.shadow.camera.right=70;this.sun.shadow.camera.top=60;this.sun.shadow.camera.bottom=-60;
    this.sun.shadow.camera.near=.5;this.sun.shadow.camera.far=130;this.sun.shadow.bias=-.00005;this.sun.shadow.normalBias=.045;this.scene.add(this.sun);
  }
  _box(group,x,z,w,d,h,mat,y=h/2){
    const T=this.THREE,mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x+w/2,y,z+d/2);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  _centerBox(group,x,z,w,d,h,mat,y=h/2){
    const T=this.THREE,mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  _plane(group,x,z,w,d,mat,y=.005){
    const T=this.THREE,m=new T.Mesh(new T.PlaneGeometry(w,d),mat);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;group.add(m);return m;
  }
  _textSign(group,text,x,y,z,w=5,h=1.1,rotationY=0){
    const T=this.THREE,c=document.createElement('canvas');c.width=512;c.height=128;
    const ctx=c.getContext('2d');ctx.fillStyle='#f2eee4';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#403d39';ctx.lineWidth=8;ctx.strokeRect(4,4,504,120);
    ctx.fillStyle='#302f2d';ctx.font='bold 46px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,67);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
    const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false}));
    m.position.set(x,y,z);m.rotation.y=rotationY;group.add(m);return m;
  }
  _buildSchool(){
    const T=this.THREE,g=this.groups.school,M=this.materials,C=this.content.schoolInterior;
    this._plane(g,0,0,28,20,M.floor,0);
    for(const w of C.walls)this._box(g,w.x,w.z,w.w,w.d,3.2,M.wall);
    for(const [x,z] of C.desks){
      this._centerBox(g,x,z,1.5,.9,.72,M.wood,.36);
      this._centerBox(g,x,z+.52,1.2,.35,.45,M.dark,.23);
    }
    this._centerBox(g,0,8.78,9,.18,2.3,M.dark,1.55);
    this._centerBox(g,0,8.66,8.5,.08,1.8,new T.MeshStandardMaterial({color:0x32534a,roughness:.85}),1.62);
    this._textSign(g,'3年2班',-10.5,2.45,-9.72,3.2,.8,0);
    for(let x=-11;x<=11;x+=4.4){
      const window=new T.Mesh(new T.PlaneGeometry(2.8,1.45),M.glass);window.position.set(x,2.0,9.43);window.rotation.y=Math.PI;g.add(window);
    }
    const doorMat=new T.MeshStandardMaterial({color:0xa98968,roughness:.88});
    this._centerBox(g,-1.2,-9.72,1.0,.12,2.3,doorMat,1.15);this._centerBox(g,1.2,-9.72,1.0,.12,2.3,doorMat,1.15);
  }
  _building(group,b){
    const T=this.THREE,M=this.materials,color=MAT_COLORS[b.kind]||0xcac5bd;
    const mat=new T.MeshStandardMaterial({color,roughness:.9});
    const base=this._box(group,b.x,b.z,b.w,b.d,b.h,mat);
    const floors=Math.max(1,Math.floor(b.h/3.2)),cols=Math.max(2,Math.floor(b.w/4.3));
    const frontZ=b.z-.012;
    for(let f=0;f<floors;f++)for(let c=0;c<cols;c++){
      if(b.kind==='house'&&f>1)continue;
      const wx=b.x+(c+.5)*b.w/cols,wy=1.6+f*3.0;
      const win=new T.Mesh(new T.PlaneGeometry(Math.min(2.0,b.w/cols*.55),1.15),(f===0&&b.kind==='shop')?M.windowLit:M.glass);
      win.position.set(wx,wy,frontZ);win.rotation.y=Math.PI;group.add(win);
    }
    if(b.kind==='school')this._textSign(group,'市立青叶中学',b.x+b.w*.5,3.0,b.z-.08,8,1.25,Math.PI);
    if(b.kind==='shop')this._textSign(group,b.name,b.x+b.w*.5,2.6,b.z-.10,Math.min(6,b.w*.72),.85,Math.PI);
    if(b.kind==='station')this._textSign(group,'青叶西站',b.x-.08,3.0,b.z+b.d*.5,5.8,1.0,-Math.PI/2);
    if(b.kind==='house'&&b.id==='home')this._textSign(group,'HOME',b.x+b.w*.5,2.4,b.z-.08,2.4,.65,Math.PI);
    return base;
  }
  _tree(group,x,z){
    const T=this.THREE,M=this.materials;
    this._centerBox(group,x,z,.32,.32,2.2,M.trunk,1.1);
    const crown=new T.Mesh(new T.SphereGeometry(1.15,10,8),M.tree);crown.scale.y=1.15;crown.position.set(x,2.65,z);crown.castShadow=true;group.add(crown);
  }
  _lamp(group,x,z){
    const T=this.THREE,M=this.materials;
    const pole=new T.Mesh(new T.CylinderGeometry(.07,.09,3.7,8),M.metal);pole.position.set(x,1.85,z);group.add(pole);
    const head=new T.Mesh(new T.BoxGeometry(.55,.16,.28),M.windowLit);head.position.set(x,3.72,z);group.add(head);
  }
  _busStop(group,b){
    const T=this.THREE,M=this.materials;
    const roof=new T.Mesh(new T.BoxGeometry(3.5,.12,1.45),M.metal);roof.position.set(b.x,2.35,b.z);group.add(roof);
    for(const dx of [-1.55,1.55]){const p=new T.Mesh(new T.CylinderGeometry(.05,.05,2.3,6),M.metal);p.position.set(b.x+dx,1.15,b.z);group.add(p)}
    this._textSign(group,b.name,b.x,1.8,b.z-.76,3.0,.55,0);
  }
  _buildCity(){
    const T=this.THREE,g=this.groups.city,M=this.materials,C=this.content.city;
    this._plane(g,0,0,140,104,M.ground,0);
    this._plane(g,0,-.0,136,10,M.asphalt,.012);
    this._plane(g,7.5,0,9,100,M.asphalt,.013);
    for(const s of C.sidewalks)this._plane(g,s.x+s.w/2,s.z+s.d/2,s.w,s.d,M.sidewalk,.03);
    // lane markings
    for(let x=-64;x<=64;x+=7)this._centerBox(g,x,0,3.2,.12,.035,M.yellow,.055);
    for(let z=-46;z<=46;z+=7)this._centerBox(g,7.5,z,.12,3.0,.035,M.yellow,.058);
    // crosswalks
    for(let z=-4.2;z<=4.2;z+=1.4)this._centerBox(g,5.0,z,5.0,.55,.025,M.white,.061);
    for(let x=3.5;x<=11.5;x+=1.35)this._centerBox(g,x,-2.5,.55,5.0,.025,M.white,.062);
    for(const b of C.buildings)this._building(g,b);
    this._plane(g,C.park.x+C.park.w/2,C.park.z+C.park.d/2,C.park.w,C.park.d,M.grass,.035);
    for(const [x,z] of C.trees)this._tree(g,x,z);
    for(const [x,z] of C.lamps)this._lamp(g,x,z);
    for(const b of C.busStops)this._busStop(g,b);
    // school fence and gate
    for(let x=-57;x<-42;x+=3){this._centerBox(g,x,18.2,.06,.06,1.25,M.metal,.63)}
    for(let x=-36;x<-28;x+=3){this._centerBox(g,x,18.2,.06,.06,1.25,M.metal,.63)}
    this._textSign(g,'青叶中学 正门',-39.5,1.5,18.15,5,.7,Math.PI);
  }
  _buildHome(){
    const T=this.THREE,g=this.groups.home,M=this.materials,C=this.content.homeInterior;
    this._plane(g,0,0,18,14,M.floor,0);
    for(const w of C.walls)this._box(g,w.x,w.z,w.w,w.d,2.8,M.wall);
    for(const f of C.furniture){
      const mat=f.kind==='bed'?new T.MeshStandardMaterial({color:0xc7d3dc,roughness:.95}):f.kind==='sofa'?new T.MeshStandardMaterial({color:0x9aa6a1,roughness:.95}):M.wood;
      this._centerBox(g,f.x,f.z,f.w,f.d,f.h,mat,f.h/2);
    }
    this._textSign(g,'ただいま / HOME',0,2.25,6.45,5.5,.8,Math.PI);
    const rug=new T.Mesh(new T.PlaneGeometry(4.2,2.4),new T.MeshStandardMaterial({color:0x90766a,roughness:1}));rug.rotation.x=-Math.PI/2;rug.position.set(-3.7,.018,-1.0);g.add(rug);
  }
  _buildSignals(){
    const T=this.THREE,M=this.materials,g=this.groups.city;
    this.signalMeshes=[];
    const defs=[
      {x:1.7,z:-6.8,kind:'walkNS'},{x:13.3,z:6.8,kind:'walkNS'},
      {x:1.4,z:5.8,kind:'walkEW'},{x:13.6,z:-5.8,kind:'walkEW'}
    ];
    for(const d of defs){
      const pole=new T.Mesh(new T.CylinderGeometry(.06,.07,2.6,8),M.metal);pole.position.set(d.x,1.3,d.z);g.add(pole);
      const box=new T.Mesh(new T.BoxGeometry(.42,.65,.28),M.dark);box.position.set(d.x,2.45,d.z);g.add(box);
      const lamp=new T.Mesh(new T.SphereGeometry(.12,8,6),M.signalRed);lamp.position.set(d.x,2.48,d.z-.16);g.add(lamp);
      this.signalMeshes.push({kind:d.kind,lamp});
    }
  }
  _buildObjectiveMarker(){
    const T=this.THREE;
    const mat=new T.MeshBasicMaterial({color:0xffe068,transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false,toneMapped:false});
    this.marker=new T.Mesh(new T.RingGeometry(.55,.78,36),mat);this.marker.rotation.x=-Math.PI/2;this.marker.renderOrder=30;this.scene.add(this.marker);
    this.markerBeam=new T.Mesh(new T.CylinderGeometry(.018,.018,1.4,8),new T.MeshBasicMaterial({color:0xffe068,transparent:true,opacity:.38,toneMapped:false}));
    this.markerBeam.position.y=.75;this.marker.add(this.markerBeam);
  }
  _person(id,name){
    let actor=this.people.get(id);if(actor)return actor;
    actor=new PaperSpriteEntity(this.THREE,{id:'prologue-'+id,kind:'npc',label:name,width:1,height:2,anchorY:1,texture:this.actorTexture,disposeTexture:false});
    actor.root.userData.prologuePerson=id;this.actorGroup.add(actor.root);this.people.set(id,actor);return actor;
  }
  _car(id){
    let car=this.cars.get(id);if(car)return car;
    const T=this.THREE,M=this.materials,g=new T.Group();g.name='prologue-car:'+id;
    const palette=[0x8f3f3f,0x3f658f,0xd0c7b6,0x4d6b55,0x8f7442,0x55575c],idx=this.cars.size%palette.length;
    const body=new T.Mesh(new T.BoxGeometry(2.5,.65,1.2),new T.MeshStandardMaterial({color:palette[idx],roughness:.72}));body.position.y=.55;body.castShadow=true;g.add(body);
    const cabin=new T.Mesh(new T.BoxGeometry(1.3,.55,1.0),M.glass);cabin.position.set(-.1,1.02,0);g.add(cabin);
    for(const x of [-.75,.75])for(const z of [-.56,.56]){const w=new T.Mesh(new T.CylinderGeometry(.22,.22,.14,10),M.dark);w.rotation.x=Math.PI/2;w.position.set(x,.28,z);g.add(w)}
    this.carGroup.add(g);this.cars.set(id,g);return g;
  }
  _updateSignals(signals){
    for(const s of this.signalMeshes){
      const green=s.kind==='walkNS'?signals.walkNS:signals.walkEW;
      s.lamp.material=green?this.materials.signalGreen:this.materials.signalRed;
    }
  }
  update(snapshot,dt){
    if(!snapshot)return;
    this.clockTime+=dt;
    for(const [id,g] of Object.entries(this.groups))g.visible=id===snapshot.zone;
    if(this.lastZone!==snapshot.zone){
      this.lastZone=snapshot.zone;
      for(const actor of this.people.values())actor.root.visible=false;
      for(const car of this.cars.values())car.visible=snapshot.zone==='city';
    }
    const py=1.0;
    this.player.root.position.set(snapshot.player.x,py,snapshot.player.z);
    const zoneScale=snapshot.zone==='city'?1:1.06;this.player.root.scale.setScalar(zoneScale);
    for(const p of snapshot.people){
      const a=this._person(p.id,p.name);a.root.visible=true;a.root.position.set(p.x,1,p.z);a.mesh.scale.x=p.facingX<0?-1:1;
      a.mesh.position.y=p.moving?Math.sin(this.clockTime*9+(p.id.length%7))*.025:0;
    }
    for(const [id,a] of this.people)if(!snapshot.people.some(p=>p.id===id))a.root.visible=false;
    for(const c of snapshot.cars){const g=this._car(c.id);g.visible=true;g.position.set(c.x,0,c.z);g.rotation.y=c.yaw;g.scale.y=c.moving?1:0.995}
    for(const [id,g] of this.cars)if(!snapshot.cars.some(c=>c.id===id))g.visible=false;
    this._updateSignals(snapshot.signals);
    const o=snapshot.objective;
    if(o?.target&&o.id!=='complete'){
      this.marker.visible=true;this.marker.position.set(o.target.x,.08,o.target.z);this.marker.rotation.z=this.clockTime*.45;
      const pulse=1+Math.sin(this.clockTime*4)*.08;this.marker.scale.set(pulse,pulse,pulse);
    }else this.marker.visible=false;

    const offset=snapshot.zone==='city'?new this.THREE.Vector3(9.5,8.0,12.5):new this.THREE.Vector3(7.0,6.0,8.0);
    const desired=new this.THREE.Vector3(snapshot.player.x+offset.x,offset.y,snapshot.player.z+offset.z);
    const k=1-Math.pow(.001,Math.max(0,dt));this.camera.position.lerp(desired,k);
    this.cameraTarget.lerp(new this.THREE.Vector3(snapshot.player.x,.8,snapshot.player.z),k);
    this.camera.lookAt(this.cameraTarget);
    const yaw=Math.atan2(this.camera.position.x-snapshot.player.x,this.camera.position.z-snapshot.player.z);
    this.player.root.rotation.y=yaw;
    for(const a of this.people.values())if(a.root.visible)a.root.rotation.y=yaw;
  }
  render(){this.renderer.render(this.scene,this.camera)}
  resize(){
    const w=Math.max(1,this.host.clientWidth||innerWidth),h=Math.max(1,this.host.clientHeight||innerHeight);
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  }
  stats(){
    return {
      renderer:'three-prologue-city',zones:3,activeZone:this.lastZone,people:this.people.size,cars:this.cars.size,
      sharedPlayerTexture:true,actorAsset:'assets/player/protagonist.webp',schoolInterior:true,homeInterior:true,
      cityRoads:true,trafficSignals:true,proceduralBuildings:true
    };
  }
  dispose(){
    this.player.dispose();for(const a of this.people.values())a.dispose();this.people.clear();
    this.actorTexture.dispose();this.renderer.dispose();this.host.replaceChildren();
  }
}
