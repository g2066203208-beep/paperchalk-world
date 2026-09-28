/* Production Three.js engine for Paperchalk World. No DOM/Pixi world rendering. */

export class WorldSpaceHealthBar {
  constructor(THREE,{max=10}={}){
    this.THREE=THREE;
    this.max=max;
    this.value=max;
    this.group=new THREE.Group();
    this.group.name='player-health-3d';
    this.group.position.set(0,2.72,0);
    this.cells=[];
    this.animations=new Map();

    const unit=.28;
    const gap=.035;
    const total=(max-1)*(unit+gap)+.44;
    this.group.position.x=-total*.5;

    for(let i=0;i<max;i++){
      const isTail=i===max-1;
      const holder=new THREE.Group();
      holder.position.x=i*(unit+gap);
      const frameGeometry=isTail
        ?this._tailGeometry(.42,.20)
        :new THREE.BoxGeometry(unit,.20,.045);
      const fillGeometry=isTail
        ?this._tailGeometry(.34,.12)
        :new THREE.BoxGeometry(unit-.07,.12,.052);
      const frame=new THREE.Mesh(
        frameGeometry,
        new THREE.MeshBasicMaterial({color:0x2a211b,depthTest:true,depthWrite:true})
      );
      const fill=new THREE.Mesh(
        fillGeometry,
        new THREE.MeshBasicMaterial({color:isTail?0xe0a84c:0xc75545,transparent:true,opacity:1,depthTest:true,depthWrite:true})
      );
      fill.position.z=.027;
      frame.renderOrder=2;
      fill.renderOrder=3;
      holder.add(frame,fill);
      holder.userData.fill=fill;
      holder.userData.index=i;
      holder.userData.isTail=isTail;
      this.group.add(holder);
      this.cells.push(holder);
    }
  }

  _tailGeometry(width,height){
    const THREE=this.THREE;
    const shape=new THREE.Shape();
    const hw=width*.5,hh=height*.5;
    shape.moveTo(-hw,-hh);
    shape.lineTo(hw*.55,-hh);
    shape.lineTo(hw,0);
    shape.lineTo(hw*.55,hh);
    shape.lineTo(-hw,hh);
    shape.lineTo(-hw,-hh);
    const geometry=new THREE.ShapeGeometry(shape);
    geometry.rotateZ(0);
    return geometry;
  }

  set(value,{animate=true}={}){
    const next=Math.max(0,Math.min(this.max,Math.round(Number(value)||0)));
    const previous=this.value;
    if(next===previous)return next;
    this.value=next;
    if(animate){
      if(next<previous){
        for(let i=next;i<previous;i++)this.animations.set(i,{kind:'damage',elapsed:0,delay:(previous-1-i)*.025,duration:.28});
      }else{
        for(let i=previous;i<next;i++)this.animations.set(i,{kind:'heal',elapsed:0,delay:(i-previous)*.045,duration:.38});
      }
    }
    this._syncVisibility(!animate);
    return next;
  }

  _syncVisibility(immediate=false){
    for(let i=0;i<this.cells.length;i++){
      const fill=this.cells[i].userData.fill;
      if(immediate||!this.animations.has(i)){
        fill.visible=i<this.value;
        fill.material.opacity=i<this.value?1:.12;
        fill.scale.setScalar(1);
      }
    }
  }

  update(camera,dt=0){
    if(camera)this.group.quaternion.copy(camera.quaternion);
    const step=Math.max(0,Math.min(.1,Number(dt)||0));
    for(const [i,anim] of [...this.animations]){
      anim.elapsed+=step;
      const holder=this.cells[i];
      const fill=holder?.userData?.fill;
      if(!fill){this.animations.delete(i);continue}
      const t=(anim.elapsed-anim.delay)/anim.duration;
      if(t<0)continue;
      if(t>=1){
        fill.visible=i<this.value;
        fill.material.opacity=i<this.value?1:.12;
        fill.scale.setScalar(1);
        this.animations.delete(i);
        continue;
      }
      fill.visible=true;
      if(anim.kind==='damage'){
        const pulse=t<.35?1+t/.35*.35:1.35-(t-.35)/.65*1.15;
        fill.scale.setScalar(Math.max(.18,pulse));
        fill.material.opacity=1-t*.88;
      }else{
        const overshoot=t<.72?.18+(t/.72)*1.12:1.30-((t-.72)/.28)*.30;
        fill.scale.setScalar(Math.max(.18,overshoot));
        fill.material.opacity=Math.min(1,.25+t*1.2);
      }
    }
  }

  snapshot(){
    return {
      value:this.value,
      max:this.max,
      cells:this.cells.length,
      tail:this.cells[this.cells.length-1]?.userData?.isTail===true,
      animating:this.animations.size
    };
  }
}

export class World3DEngine {
  constructor({THREE,host,content,onCameraChanged=null}){
    if(!THREE)throw new Error('THREE_REQUIRED');
    if(!host)throw new Error('THREE_HOST_REQUIRED');
    this.THREE=THREE;
    this.host=host;
    this.content=content||{};
    this.onCameraChanged=typeof onCameraChanged==='function'?onCameraChanged:null;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0xb9cbd4);
    this.scene.fog=new THREE.Fog(0xb9cbd4,42,105);
    this.camera=new THREE.PerspectiveCamera(55,1,.08,220);
    this.cameraRig={yaw:.72,pitch:.42,distance:14,minDistance:4.5,maxDistance:30,fov:55};
    this.cameraTarget=new THREE.Vector3();
    this.cameraTargetSmooth=new THREE.Vector3();
    this.lastSnapshot=null;
    this.playerRoot=null;
    this.healthBar=null;
    this.debugColliders=false;
    this.debugHelpers=[];
    this.pointerState=null;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    const coarse=matchMedia('(pointer:coarse)').matches;
    this.pixelRatio=Math.max(1,Math.min(Number(devicePixelRatio)||1,coarse?1.35:1.8));
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.03;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.className='three-world-canvas';
    this.renderer.domElement.setAttribute('aria-label','Paperchalk World 3D WebGL scene');
    this.renderer.domElement.tabIndex=0;
    this.renderer.domElement.style.touchAction='none';
    this.host.replaceChildren(this.renderer.domElement);
    this._buildScene();
    this._installCameraInput();
    this.resize();
  }

  _material(color,{roughness=.88,metalness=0}={}){
    return new this.THREE.MeshStandardMaterial({color,roughness,metalness});
  }

  _shadow(mesh,{cast=true,receive=true}={}){
    mesh.castShadow=cast;
    mesh.receiveShadow=receive;
    return mesh;
  }

  _addBox({x=0,y=.5,z=0,w=1,h=1,d=1,color=0x999999,material=null,parent=this.scene}={}){
    const mesh=this._shadow(new this.THREE.Mesh(
      new this.THREE.BoxGeometry(w,h,d),
      material||this._material(color)
    ));
    mesh.position.set(x,y,z);
    parent.add(mesh);
    return mesh;
  }

  _buildScene(){
    const THREE=this.THREE;
    const hemi=new THREE.HemisphereLight(0xddeaf2,0x4d5146,1.75);
    this.scene.add(hemi);

    const sun=new THREE.DirectionalLight(0xffefd7,3.4);
    sun.position.set(-14,23,11);
    sun.castShadow=true;
    sun.shadow.mapSize.set(1536,1536);
    sun.shadow.camera.left=-50;
    sun.shadow.camera.right=50;
    sun.shadow.camera.top=38;
    sun.shadow.camera.bottom=-38;
    sun.shadow.camera.near=.5;
    sun.shadow.camera.far=95;
    this.scene.add(sun);
    this.sun=sun;

    const sceneData=this.content.scene3d||{};
    const bounds=sceneData.bounds||{minX:-46,maxX:46,minZ:-26,maxZ:31};
    const groundW=bounds.maxX-bounds.minX+18;
    const groundD=bounds.maxZ-bounds.minZ+18;
    const ground=this._shadow(new THREE.Mesh(
      new THREE.PlaneGeometry(groundW,groundD),
      this._material(0x748865,{roughness:1})
    ),{cast:false,receive:true});
    ground.rotation.x=-Math.PI/2;
    ground.position.y=0;
    this.scene.add(ground);

    const road=sceneData.road||{x:0,z:-6,width:92,depth:7.5};
    this._addBox({x:road.x,y:.035,z:road.z,w:road.width,h:.07,d:road.depth,color:0x4f5b61});
    this._addBox({x:road.x,y:.085,z:road.z-road.depth*.5-.62,w:road.width,h:.17,d:1.15,color:0xa8a18f});
    this._addBox({x:road.x,y:.085,z:road.z+road.depth*.5+.62,w:road.width,h:.17,d:1.15,color:0xa8a18f});
    const stripeMat=new THREE.MeshBasicMaterial({color:0xe7dcc2});
    for(let x=-42;x<=42;x+=5.2)this._addBox({x,y:.085,z:road.z,w:2.8,h:.025,d:.12,material:stripeMat});

    for(const b of sceneData.buildings||[])this._buildBuilding(b);
    for(const t of sceneData.trees||[])this._buildTree(t);
    for(const r of sceneData.rocks||[])this._buildRock(r);

    this._buildPlayer();

    const grid=new THREE.GridHelper(96,96,0x3f4f47,0x778778);
    grid.position.y=.012;
    grid.material.transparent=true;
    grid.material.opacity=.13;
    this.scene.add(grid);
    this.grid=grid;
  }

  _buildBuilding(b){
    const THREE=this.THREE;
    const root=new THREE.Group();
    root.name=b.id;
    const body=this._addBox({x:0,y:b.height*.5,z:0,w:b.width,h:b.height,d:b.depth,color:b.color||0x8f7b69,parent:root});
    const roof=this._shadow(new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(b.width,b.depth)*.63,1.55,4),
      this._material(0x5f4b43,{roughness:.96})
    ));
    roof.position.y=b.height+.72;
    roof.rotation.y=Math.PI*.25;
    root.add(roof);

    const frontZ=b.depth*.5+.012;
    const windowMat=new THREE.MeshBasicMaterial({color:0xb7d0d8});
    for(let row=0;row<2;row++){
      const y=1.4+row*1.65;
      if(y>b.height-.35)continue;
      for(const col of [-1,0,1]){
        const wx=col*b.width*.23;
        const windowMesh=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(1.05,b.width*.16),.72),windowMat);
        windowMesh.position.set(wx,y,frontZ);
        root.add(windowMesh);
      }
    }
    const door=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.8),new THREE.MeshBasicMaterial({color:0x4f3d34}));
    door.position.set(0,.9,frontZ+.002);
    root.add(door);

    root.position.set(b.x,0,b.z);
    this.scene.add(root);

    const helper=new THREE.Box3Helper(
      new THREE.Box3(
        new THREE.Vector3(b.x-b.width*.5,0,b.z-b.depth*.5),
        new THREE.Vector3(b.x+b.width*.5,b.height,b.z+b.depth*.5)
      ),
      0xff9d45
    );
    helper.visible=false;
    helper.name='collider:'+b.id;
    this.scene.add(helper);
    this.debugHelpers.push(helper);
  }

  _buildTree(t){
    const THREE=this.THREE;
    const s=Number(t.scale)||1;
    const trunk=this._shadow(new THREE.Mesh(
      new THREE.CylinderGeometry(.18*s,.26*s,1.9*s,10),
      this._material(0x6e5037,{roughness:1})
    ));
    trunk.position.set(t.x,.95*s,t.z);
    this.scene.add(trunk);
    const crown=this._shadow(new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.15*s,1),
      this._material(0x486c4b,{roughness:1})
    ));
    crown.position.set(t.x,2.25*s,t.z);
    crown.scale.set(1,1.18,.86);
    this.scene.add(crown);
  }

  _buildRock(r){
    const s=Number(r.r)||1;
    const mesh=this._shadow(new this.THREE.Mesh(
      new this.THREE.DodecahedronGeometry(s,0),
      this._material(0x7d7b71,{roughness:1})
    ));
    mesh.position.set(r.x,s*.55,r.z);
    mesh.scale.set(1.15,.72,.9);
    this.scene.add(mesh);
  }

  _buildPlayer(){
    const THREE=this.THREE;
    const root=new THREE.Group();
    root.name='player-3d';

    const paperBlue=this._material(0x526f86,{roughness:.9});
    const paperDark=this._material(0x2e3841,{roughness:.92});
    const skin=this._material(0xe4c4a6,{roughness:.93});
    const accent=this._material(0xd7b55e,{roughness:.9});

    const torso=this._shadow(new THREE.Mesh(new THREE.BoxGeometry(.72,1.05,.34),paperBlue));
    torso.position.y=1.12;
    torso.name='torso';

    const head=this._shadow(new THREE.Mesh(new THREE.SphereGeometry(.38,20,14),skin));
    head.position.y=1.92;
    head.scale.z=.78;
    head.name='head';

    const legGeometry=new THREE.BoxGeometry(.22,.78,.24);
    const legL=this._shadow(new THREE.Mesh(legGeometry,paperDark));
    const legR=this._shadow(new THREE.Mesh(legGeometry,paperDark));
    legL.position.set(-.18,.42,0);
    legR.position.set(.18,.42,0);
    legL.name='legL';
    legR.name='legR';

    const armGeometry=new THREE.BoxGeometry(.18,.82,.20);
    const armL=this._shadow(new THREE.Mesh(armGeometry,paperBlue));
    const armR=this._shadow(new THREE.Mesh(armGeometry,paperBlue));
    armL.position.set(-.48,1.18,0);
    armR.position.set(.48,1.18,0);
    armL.name='armL';
    armR.name='armR';

    const scarf=this._shadow(new THREE.Mesh(new THREE.BoxGeometry(.84,.12,.38),accent));
    scarf.position.set(0,1.56,.015);

    root.add(torso,head,legL,legR,armL,armR,scarf);
    root.userData.parts={torso,head,legL,legR,armL,armR,scarf};
    this.healthBar=new WorldSpaceHealthBar(THREE,{max:10});
    root.add(this.healthBar.group);
    this.scene.add(root);
    this.playerRoot=root;
  }

  _installCameraInput(){
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',event=>{
      this.pointerState={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY};
      try{canvas.setPointerCapture(event.pointerId)}catch{}
    });
    canvas.addEventListener('pointermove',event=>{
      if(!this.pointerState||event.pointerId!==this.pointerState.id)return;
      const dx=event.clientX-this.pointerState.lastX;
      const dy=event.clientY-this.pointerState.lastY;
      this.pointerState.lastX=event.clientX;
      this.pointerState.lastY=event.clientY;
      if(Math.abs(dx)+Math.abs(dy)<.2)return;
      this.cameraRig.yaw-=dx*.006;
      this.cameraRig.pitch=Math.max(.12,Math.min(1.18,this.cameraRig.pitch+dy*.004));
      this._notifyCamera();
    });
    const release=event=>{
      if(this.pointerState&&event.pointerId===this.pointerState.id)this.pointerState=null;
    };
    canvas.addEventListener('pointerup',release);
    canvas.addEventListener('pointercancel',release);
    canvas.addEventListener('lostpointercapture',()=>{this.pointerState=null});
    canvas.addEventListener('wheel',event=>{
      event.preventDefault();
      this.cameraRig.distance=Math.max(this.cameraRig.minDistance,Math.min(this.cameraRig.maxDistance,this.cameraRig.distance+Math.sign(event.deltaY)*1.05));
      this._notifyCamera();
    },{passive:false});
  }

  _notifyCamera(){
    if(this.onCameraChanged)this.onCameraChanged({
      yaw:this.cameraRig.yaw,
      pitch:this.cameraRig.pitch,
      distance:this.cameraRig.distance,
      fov:this.cameraRig.fov
    });
  }

  setCameraConfig(config={}){
    if(Number.isFinite(config.yaw))this.cameraRig.yaw=config.yaw;
    if(Number.isFinite(config.pitch))this.cameraRig.pitch=Math.max(.12,Math.min(1.18,config.pitch));
    if(Number.isFinite(config.distance))this.cameraRig.distance=Math.max(this.cameraRig.minDistance,Math.min(this.cameraRig.maxDistance,config.distance));
    if(Number.isFinite(config.fov)){
      this.cameraRig.fov=Math.max(35,Math.min(80,config.fov));
      this.camera.fov=this.cameraRig.fov;
      this.camera.updateProjectionMatrix();
    }
    return this.cameraConfig();
  }

  resetCamera(){
    this.cameraRig.yaw=.72;
    this.cameraRig.pitch=.42;
    this.cameraRig.distance=14;
    this.cameraRig.fov=55;
    this.camera.fov=55;
    this.camera.updateProjectionMatrix();
    this._notifyCamera();
    return this.cameraConfig();
  }

  cameraConfig(){
    return {
      yaw:this.cameraRig.yaw,
      pitch:this.cameraRig.pitch,
      distance:this.cameraRig.distance,
      fov:this.cameraRig.fov
    };
  }

  setDebugColliders(enabled){
    this.debugColliders=!!enabled;
    for(const helper of this.debugHelpers)helper.visible=this.debugColliders;
    return this.debugColliders;
  }

  setSnapshot(snapshot){
    this.lastSnapshot=snapshot||null;
    const hp=snapshot?.health?.current;
    if(Number.isFinite(hp)&&this.healthBar)this.healthBar.set(hp,{animate:false});
  }

  onHealthChanged({current}={}){
    if(Number.isFinite(current)&&this.healthBar)this.healthBar.set(current,{animate:true});
  }

  resize(){
    const rect=this.host.getBoundingClientRect();
    const w=Math.max(1,Math.round(rect.width||innerWidth||1280));
    const h=Math.max(1,Math.round(rect.height||innerHeight||720));
    this.renderer.setSize(w,h,false);
    this.camera.aspect=w/h;
    this.camera.updateProjectionMatrix();
  }

  _updatePlayer(dt,snapshot){
    if(!snapshot?.player||!this.playerRoot)return;
    const p=snapshot.player;
    const target=new this.THREE.Vector3(p.x,p.y,p.z);
    const factor=1-Math.pow(.001,Math.max(0,dt));
    this.playerRoot.position.lerp(target,factor);
    const yaw=Number.isFinite(p.yaw)?p.yaw:0;
    let delta=yaw-this.playerRoot.rotation.y;
    delta=Math.atan2(Math.sin(delta),Math.cos(delta));
    this.playerRoot.rotation.y+=delta*Math.min(1,dt*14);

    const parts=this.playerRoot.userData.parts||{};
    const time=performance.now()/1000;
    const moving=p.action==='walk'||p.action==='run';
    const stride=moving?Math.sin(time*9)*.55:0;
    if(parts.legL)parts.legL.rotation.x=stride;
    if(parts.legR)parts.legR.rotation.x=-stride;
    if(parts.armL)parts.armL.rotation.x=-stride*.7;
    if(parts.armR)parts.armR.rotation.x=p.action==='attack'?-1.15:stride*.7;
    if(parts.torso)parts.torso.rotation.z=moving?Math.sin(time*9)*.018:0;
    const crouch=p.crouching?.82:1;
    this.playerRoot.scale.y+=(crouch-this.playerRoot.scale.y)*Math.min(1,dt*14);
  }

  _updateCamera(dt,snapshot){
    if(!snapshot?.player)return;
    const p=snapshot.player;
    const desiredTarget=new this.THREE.Vector3(p.x,p.y+1.25,p.z);
    const targetFactor=1-Math.pow(.0008,Math.max(0,dt));
    if(!this.cameraTargetSmooth.lengthSq())this.cameraTargetSmooth.copy(desiredTarget);
    else this.cameraTargetSmooth.lerp(desiredTarget,targetFactor);
    this.cameraTarget.copy(this.cameraTargetSmooth);

    const cp=Math.cos(this.cameraRig.pitch);
    const desired=new this.THREE.Vector3(
      this.cameraTarget.x+Math.sin(this.cameraRig.yaw)*cp*this.cameraRig.distance,
      this.cameraTarget.y+Math.sin(this.cameraRig.pitch)*this.cameraRig.distance,
      this.cameraTarget.z+Math.cos(this.cameraRig.yaw)*cp*this.cameraRig.distance
    );
    const cameraFactor=1-Math.pow(.002,Math.max(0,dt));
    this.camera.position.lerp(desired,cameraFactor);
    this.camera.lookAt(this.cameraTarget);
  }

  _updateWorldTime(snapshot){
    const minutes=Number(snapshot?.world?.minutes);
    if(!Number.isFinite(minutes))return;
    const normalized=((minutes%1440)+1440)%1440/1440;
    const sunWave=Math.sin((normalized-.25)*Math.PI*2);
    const daylight=Math.max(0,Math.min(1,sunWave*.65+.48));
    const dusk=Math.max(0,1-Math.abs(normalized-.78)*8);
    const r=.055+daylight*.55+dusk*.16;
    const g=.075+daylight*.66+dusk*.08;
    const b=.12+daylight*.70+dusk*.02;
    this.scene.background.setRGB(r,g,b);
    this.scene.fog.color.copy(this.scene.background);
    if(this.sun)this.sun.intensity=.45+daylight*3.1;
  }

  update(dt,snapshot=this.lastSnapshot){
    if(snapshot)this.lastSnapshot=snapshot;
    const current=this.lastSnapshot;
    this._updatePlayer(dt,current);
    this._updateCamera(dt,current);
    this._updateWorldTime(current);
    this.healthBar?.update(this.camera,dt);
  }

  render(){
    this.renderer.render(this.scene,this.camera);
  }

  stats(){
    const info=this.renderer.info?.render||{};
    return {
      renderer:this.renderer.constructor?.name||'WebGLRenderer',
      drawCalls:Number(info.calls)||0,
      triangles:Number(info.triangles)||0,
      sceneChildren:this.scene.children.length,
      pixelRatio:this.pixelRatio,
      health:this.healthBar?.snapshot()||null,
      camera:this.cameraConfig(),
      debugColliders:this.debugColliders
    };
  }

  dispose(){
    this.renderer.dispose();
    this.host.replaceChildren();
  }
}
