/* Paperchalk World renderer.
 * The stage is Three.js, but gameplay is deliberately 2D:
 * - terrain: a single X/Y voxel slice with one visual Z thickness
 * - player/props/buildings/trees: textured PlaneGeometry paper entities
 * - camera: fixed along Z by default, free orbit only for debugging
 */

import {PaperSpriteEntity} from '../entities/PaperSpriteEntity.js';

export class WorldSpaceHealthBar{
  constructor(THREE,{max=10}={}){
    this.THREE=THREE;
    this.max=max;
    this.value=max;
    this.group=new THREE.Group();
    this.group.name='player-health-paper';
    this.group.position.set(0,2.42,.03);
    this.cells=[];
    this.animations=new Map();

    const unit=.25,gap=.028,total=(max-1)*(unit+gap)+.38;
    for(let i=0;i<max;i++){
      const tail=i===max-1;
      const holder=new THREE.Group();
      holder.position.x=i*(unit+gap)-total*.5;
      const shape=new THREE.Shape();
      const w=tail?.36:unit,h=.18,hw=w*.5,hh=h*.5;
      if(tail){
        shape.moveTo(-hw,-hh);shape.lineTo(hw*.55,-hh);shape.lineTo(hw,0);
        shape.lineTo(hw*.55,hh);shape.lineTo(-hw,hh);shape.closePath();
      }else{
        shape.moveTo(-hw,-hh);shape.lineTo(hw,-hh);shape.lineTo(hw,hh);shape.lineTo(-hw,hh);shape.closePath();
      }
      const frame=new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({color:0x342920,side:THREE.DoubleSide,depthTest:true})
      );
      const fillShape=shape.clone();
      const fill=new THREE.Mesh(
        new THREE.ShapeGeometry(fillShape),
        new THREE.MeshBasicMaterial({color:tail?0xe0a84c:0xc75545,transparent:true,opacity:1,side:THREE.DoubleSide,depthTest:true})
      );
      fill.scale.set(.72,.58,1);fill.position.z=.003;
      holder.add(frame,fill);
      holder.userData={fill,index:i,isTail:tail};
      this.group.add(holder);this.cells.push(holder);
    }
  }

  set(value,{animate=true}={}){
    const next=Math.max(0,Math.min(this.max,Math.round(Number(value)||0)));
    const previous=this.value;
    if(next===previous)return next;
    this.value=next;
    if(animate){
      if(next<previous){
        for(let i=next;i<previous;i++)this.animations.set(i,{kind:'damage',elapsed:0,duration:.28});
      }else{
        for(let i=previous;i<next;i++)this.animations.set(i,{kind:'heal',elapsed:0,duration:.36});
      }
    }
    this._sync(!animate);
    return next;
  }

  _sync(immediate=false){
    for(let i=0;i<this.cells.length;i++){
      const fill=this.cells[i].userData.fill;
      if(immediate||!this.animations.has(i)){
        fill.visible=i<this.value;
        fill.material.opacity=i<this.value?1:.1;
        fill.scale.set(.72,.58,1);
      }
    }
  }

  update(camera,dt=0){
    if(camera)this.group.quaternion.copy(camera.quaternion);
    const step=Math.max(0,Math.min(.08,Number(dt)||0));
    for(const [i,a] of [...this.animations]){
      a.elapsed+=step;
      const fill=this.cells[i]?.userData?.fill;
      if(!fill){this.animations.delete(i);continue}
      const t=Math.min(1,a.elapsed/a.duration);
      fill.visible=true;
      if(a.kind==='damage'){
        const pulse=t<.35?1+t*.8:1.28-(t-.35)*1.2;
        fill.scale.set(.72*pulse,.58*pulse,1);
        fill.material.opacity=1-t*.9;
      }else{
        const pulse=.3+Math.min(1,t*1.45);
        fill.scale.set(.72*pulse,.58*pulse,1);
        fill.material.opacity=Math.min(1,.2+t*1.2);
      }
      if(t>=1){
        fill.visible=i<this.value;
        fill.material.opacity=i<this.value?1:.1;
        fill.scale.set(.72,.58,1);
        this.animations.delete(i);
      }
    }
  }

  snapshot(){
    return {
      value:this.value,max:this.max,cells:this.cells.length,
      tail:this.cells.at(-1)?.userData?.isTail===true,
      animating:this.animations.size
    };
  }
}

export class World3DEngine{
  constructor({THREE,host,content,terrain=null,onCameraChanged=null}){
    if(!THREE)throw new Error('THREE_REQUIRED');
    if(!host)throw new Error('THREE_HOST_REQUIRED');
    this.THREE=THREE;
    this.host=host;
    this.content=content||{};
    this.terrain=terrain||window.PaperchalkTerrain;
    if(!this.terrain)throw new Error('PAPERCHALK_TERRAIN_REQUIRED');
    this.onCameraChanged=typeof onCameraChanged==='function'?onCameraChanged:null;

    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0xbacbd0);
    this.camera=new THREE.PerspectiveCamera(42,1,.05,240);
    this.cameraRig={yaw:.0,pitch:0,distance:18,minDistance:7,maxDistance:36,fov:42};
    this.stageView={enabled:true,axis:'z',side:1};
    this.cameraTarget=new THREE.Vector3();
    this.cameraTargetSmooth=new THREE.Vector3();

    this.lastSnapshot=null;
    this.playerRoot=null;
    this.playerPaper=null;
    this.healthBar=null;
    this.paperEntities=[];
    this.paperEntityHelpers=[];
    this.terrainGroup=new THREE.Group();
    this.terrainGroup.name='terrain-single-layer';
    this.terrainMeshes=new Map();
    this.debugColliders=false;
    this.pointerState=null;
    this.raycaster=new THREE.Raycaster();
    this.pointerNdc=new THREE.Vector2();

    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    const coarse=matchMedia('(pointer:coarse)').matches;
    this.pixelRatio=Math.max(1,Math.min(Number(devicePixelRatio)||1,coarse?1.25:1.7));
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1;
    this.renderer.shadowMap.enabled=false;
    this.renderer.domElement.className='three-world-canvas';
    this.renderer.domElement.setAttribute('aria-label','Paperchalk side-view voxel stage');
    this.renderer.domElement.tabIndex=0;
    this.renderer.domElement.style.touchAction='none';
    this.host.replaceChildren(this.renderer.domElement);

    this.scene.add(this.terrainGroup);
    this._buildBackdrop();
    this._buildPaperEntities();
    this._buildPlayer();
    this._installInput();
    this.terrainUnsubscribe=this.terrain.subscribe(change=>this._onTerrainChanged(change));
    this.resize();
  }

  _buildBackdrop(){
    const THREE=this.THREE;
    const make=(z,y,w,h,color,opacity=1)=>{
      const mesh=new THREE.Mesh(
        new THREE.PlaneGeometry(w,h),
        new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:true,side:THREE.DoubleSide,toneMapped:false})
      );
      mesh.position.set(0,y,z);
      mesh.renderOrder=-10+Math.round(z);
      this.scene.add(mesh);
      return mesh;
    };
    make(-10,8,180,80,0xc9d7d7);
    const far=make(-7,-1,180,18,0x82958a);
    far.geometry.translate(0,4,0);
    const near=make(-5,-3,180,12,0x667b66);
    near.geometry.translate(0,3,0);
    this.backdrop={far,near};
  }

  _materialColor(material,tx,ty){
    const info=window.PaperchalkTerrainTypes?.MATERIAL_INFO?.[material];
    const c=new this.THREE.Color(info?.color||'#777777');
    const jitter=((Math.imul(tx,17)+Math.imul(ty,31))&7)-3;
    const f=1+jitter*.012;
    c.multiplyScalar(f);
    return c;
  }

  _pushQuad(positions,colors,indices,verts,a,b,c,d,color){
    const base=verts.count;
    for(const p of [a,b,c,d])positions.push(p[0],p[1],p[2]);
    for(let i=0;i<4;i++)colors.push(color.r,color.g,color.b);
    indices.push(base,base+1,base+2,base,base+2,base+3);
    verts.count+=4;
  }

  _buildTerrainChunk(cx,cy){
    const THREE=this.THREE;
    const terrain=this.terrain;
    const size=terrain.chunkSize,s=terrain.tileSize,depth=terrain.depth;
    const data=terrain.chunkData(cx,cy);
    const positions=[],colors=[],indices=[],verts={count:0};
    const ox=cx*size*s,oy=cy*size*s;

    for(let ly=0;ly<size;ly++){
      for(let lx=0;lx<size;lx++){
        const material=data[ly*size+lx];
        if(!material)continue;
        const tx=cx*size+lx,ty=cy*size+ly;
        const x0=lx*s,y0=ly*s,x1=x0+s,y1=y0+s;
        const zFront=0,zBack=-depth;
        const color=this._materialColor(material,tx,ty);

        // Every visible block gets one front face: this is the actual Terraria slice.
        this._pushQuad(positions,colors,indices,verts,
          [x0,y0,zFront],[x1,y0,zFront],[x1,y1,zFront],[x0,y1,zFront],color);

        const edgeColor=color.clone().multiplyScalar(.72);
        if(!terrain.isSolid(tx-1,ty))this._pushQuad(positions,colors,indices,verts,
          [x0,y0,zBack],[x0,y0,zFront],[x0,y1,zFront],[x0,y1,zBack],edgeColor);
        if(!terrain.isSolid(tx+1,ty))this._pushQuad(positions,colors,indices,verts,
          [x1,y0,zFront],[x1,y0,zBack],[x1,y1,zBack],[x1,y1,zFront],edgeColor);
        if(!terrain.isSolid(tx,ty-1))this._pushQuad(positions,colors,indices,verts,
          [x0,y0,zBack],[x1,y0,zBack],[x1,y0,zFront],[x0,y0,zFront],edgeColor);
        if(!terrain.isSolid(tx,ty+1))this._pushQuad(positions,colors,indices,verts,
          [x0,y1,zFront],[x1,y1,zFront],[x1,y1,zBack],[x0,y1,zBack],edgeColor);
      }
    }

    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    const material=new THREE.MeshBasicMaterial({
      vertexColors:true,
      side:THREE.DoubleSide,
      wireframe:this.debugColliders,
      toneMapped:false
    });
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name='terrain-chunk:'+cx+','+cy;
    mesh.position.set(ox,oy,0);
    mesh.userData={cx,cy,tiles:size*size,singleLayer:true,depth};
    mesh.renderOrder=1;
    return mesh;
  }

  _replaceChunk(cx,cy){
    const key=cx+','+cy;
    const old=this.terrainMeshes.get(key);
    if(old){
      old.geometry.dispose();old.material.dispose();old.removeFromParent();
      this.terrainMeshes.delete(key);
    }
    const mesh=this._buildTerrainChunk(cx,cy);
    this.terrainGroup.add(mesh);
    this.terrainMeshes.set(key,mesh);
    return mesh;
  }

  _syncTerrainChunks(player){
    const keys=new Set(this.terrain.activeChunkKeys(player?.x||0,player?.y||0));
    for(const key of keys){
      if(this.terrainMeshes.has(key))continue;
      const [cx,cy]=key.split(',').map(Number);
      this._replaceChunk(cx,cy);
    }
    for(const [key,mesh] of [...this.terrainMeshes]){
      if(keys.has(key))continue;
      mesh.geometry.dispose();mesh.material.dispose();mesh.removeFromParent();
      this.terrainMeshes.delete(key);
    }
  }

  _onTerrainChanged(change){
    if(change?.all){
      for(const key of [...this.terrainMeshes.keys()]){
        const [cx,cy]=key.split(',').map(Number);
        this._replaceChunk(cx,cy);
      }
      return;
    }
    if(!Number.isFinite(change?.cx)||!Number.isFinite(change?.cy))return;
    const targets=[[change.cx,change.cy]];
    const localX=((change.tx%this.terrain.chunkSize)+this.terrain.chunkSize)%this.terrain.chunkSize;
    const localY=((change.ty%this.terrain.chunkSize)+this.terrain.chunkSize)%this.terrain.chunkSize;
    if(localX===0)targets.push([change.cx-1,change.cy]);
    if(localX===this.terrain.chunkSize-1)targets.push([change.cx+1,change.cy]);
    if(localY===0)targets.push([change.cx,change.cy-1]);
    if(localY===this.terrain.chunkSize-1)targets.push([change.cx,change.cy+1]);
    for(const [cx,cy] of targets)if(this.terrainMeshes.has(cx+','+cy))this._replaceChunk(cx,cy);
  }

  _buildPaperEntities(){
    const THREE=this.THREE;
    for(const descriptor of this.content.scene3d?.paperEntities||[]){
      const entity=new PaperSpriteEntity(THREE,descriptor);
      const y=this.terrain.surfaceYAt(descriptor.x);
      entity.setPosition(descriptor.x,y,Number(descriptor.zLayer)||-.2);
      this.scene.add(entity.group);
      this.paperEntities.push(entity);

      const box=new THREE.Box3Helper(
        new THREE.Box3(
          new THREE.Vector3(descriptor.x-descriptor.width*.5,y,Number(descriptor.zLayer||0)-.02),
          new THREE.Vector3(descriptor.x+descriptor.width*.5,y+descriptor.height,Number(descriptor.zLayer||0)+.02)
        ),
        0xff9d45
      );
      box.visible=false;box.name='paper-collider:'+descriptor.id;
      this.scene.add(box);this.paperEntityHelpers.push(box);
    }
  }

  _buildPlayer(){
    const descriptor={id:'player',kind:'player',width:1,height:2,tint:'#526f86',renderOrder:20};
    this.playerPaper=new PaperSpriteEntity(this.THREE,descriptor);
    this.playerRoot=this.playerPaper.group;
    this.playerRoot.name='player-paper-entity';
    this.healthBar=new WorldSpaceHealthBar(this.THREE,{max:10});
    this.scene.add(this.playerRoot);
    this.scene.add(this.healthBar.group);
  }

  _installInput(){
    const canvas=this.renderer.domElement;
    canvas.addEventListener('contextmenu',event=>event.preventDefault());
    canvas.addEventListener('pointerdown',event=>{
      this.pointerState={
        id:event.pointerId,button:event.button,
        startX:event.clientX,startY:event.clientY,
        lastX:event.clientX,lastY:event.clientY,moved:false
      };
      try{canvas.setPointerCapture(event.pointerId)}catch{}
    });
    canvas.addEventListener('pointermove',event=>{
      if(!this.pointerState||event.pointerId!==this.pointerState.id)return;
      const dx=event.clientX-this.pointerState.lastX,dy=event.clientY-this.pointerState.lastY;
      this.pointerState.lastX=event.clientX;this.pointerState.lastY=event.clientY;
      if(Math.hypot(event.clientX-this.pointerState.startX,event.clientY-this.pointerState.startY)>5)this.pointerState.moved=true;
      if(this.stageView.enabled||Math.abs(dx)+Math.abs(dy)<.2)return;
      this.cameraRig.yaw-=dx*.006;
      this.cameraRig.pitch=Math.max(-.85,Math.min(.85,this.cameraRig.pitch+dy*.004));
      this._notifyCamera();
    });
    const release=event=>{
      if(!this.pointerState||event.pointerId!==this.pointerState.id)return;
      const state=this.pointerState;this.pointerState=null;
      if(!state.moved&&this.stageView.enabled)this._editTerrainAt(event.clientX,event.clientY,state.button===2);
    };
    canvas.addEventListener('pointerup',release);
    canvas.addEventListener('pointercancel',()=>{this.pointerState=null});
    canvas.addEventListener('lostpointercapture',()=>{this.pointerState=null});
    canvas.addEventListener('wheel',event=>{
      event.preventDefault();
      this.cameraRig.distance=Math.max(this.cameraRig.minDistance,Math.min(this.cameraRig.maxDistance,this.cameraRig.distance+Math.sign(event.deltaY)*1.0));
      this._notifyCamera();
    },{passive:false});
  }

  _editTerrainAt(clientX,clientY,place){
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.set(
      ((clientX-rect.left)/Math.max(1,rect.width))*2-1,
      -((clientY-rect.top)/Math.max(1,rect.height))*2+1
    );
    this.raycaster.setFromCamera(this.pointerNdc,this.camera);
    const ray=this.raycaster.ray;
    if(Math.abs(ray.direction.z)<1e-6)return false;
    const t=(0-ray.origin.z)/ray.direction.z;
    if(t<=0)return false;
    const point=ray.at(t,new this.THREE.Vector3());
    const p=this.lastSnapshot?.player;
    if(p&&Math.hypot(point.x-p.x,point.y-(p.y+1))>6)return false;
    const {tx,ty}=this.terrain.worldToTile(point.x,point.y);
    if(place){
      // Do not place a block through the player's paper body.
      const b=this.terrain.tileBounds(tx,ty);
      if(p&&b.maxX>p.x-.34&&b.minX<p.x+.34&&b.maxY>p.y&&b.minY<p.y+2)return false;
      return this.terrain.placeTile(tx,ty,window.PaperchalkTerrainTypes.MATERIALS.DIRT);
    }
    return !!this.terrain.breakTile(tx,ty);
  }

  _stageYaw(){
    if(!this.stageView.enabled)return this.cameraRig.yaw;
    return this.stageView.axis==='x'?Math.PI*.5:0;
  }

  _notifyCamera(){
    if(this.onCameraChanged)this.onCameraChanged({
      yaw:this._stageYaw(),
      orbitYaw:this.cameraRig.yaw,
      pitch:this.cameraRig.pitch,
      distance:this.cameraRig.distance,
      fov:this.cameraRig.fov,
      stageView:{...this.stageView}
    });
  }

  setCameraConfig(config={}){
    if(Number.isFinite(config.orbitYaw))this.cameraRig.yaw=config.orbitYaw;
    else if(Number.isFinite(config.yaw)&&!this.stageView.enabled)this.cameraRig.yaw=config.yaw;
    if(Number.isFinite(config.pitch))this.cameraRig.pitch=Math.max(-.85,Math.min(.85,config.pitch));
    if(Number.isFinite(config.distance))this.cameraRig.distance=Math.max(this.cameraRig.minDistance,Math.min(this.cameraRig.maxDistance,config.distance));
    if(Number.isFinite(config.fov)){
      this.cameraRig.fov=Math.max(30,Math.min(70,config.fov));
      this.camera.fov=this.cameraRig.fov;this.camera.updateProjectionMatrix();
    }
    if(config.stageView&&typeof config.stageView==='object'){
      this.stageView.enabled=config.stageView.enabled!==false;
      this.stageView.axis=config.stageView.axis==='x'?'x':'z';
      this.stageView.side=config.stageView.side===-1?-1:1;
    }
    this._notifyCamera();
    return this.cameraConfig();
  }

  setStageView(enabled,axis=this.stageView.axis){
    this.stageView.enabled=!!enabled;
    this.stageView.axis=axis==='x'?'x':'z';
    this.pointerState=null;this._notifyCamera();
    return {...this.stageView};
  }
  toggleStageView(){return this.setStageView(!this.stageView.enabled,this.stageView.axis)}
  setStageAxis(axis){this.stageView.axis=axis==='x'?'x':'z';this._notifyCamera();return {...this.stageView}}

  resetCamera(){
    this.cameraRig.yaw=0;this.cameraRig.pitch=0;this.cameraRig.distance=18;this.cameraRig.fov=42;
    this.stageView.enabled=true;this.stageView.axis='z';this.stageView.side=1;
    this.camera.fov=42;this.camera.updateProjectionMatrix();this._notifyCamera();
    return this.cameraConfig();
  }

  cameraConfig(){
    return {
      yaw:this._stageYaw(),orbitYaw:this.cameraRig.yaw,pitch:this.cameraRig.pitch,
      distance:this.cameraRig.distance,fov:this.cameraRig.fov,stageView:{...this.stageView}
    };
  }

  setDebugColliders(enabled){
    this.debugColliders=!!enabled;
    for(const mesh of this.terrainMeshes.values())mesh.material.wireframe=this.debugColliders;
    for(const helper of this.paperEntityHelpers)helper.visible=this.debugColliders;
    return this.debugColliders;
  }

  setSnapshot(snapshot){
    this.lastSnapshot=snapshot||null;
    const hp=snapshot?.health?.current;
    if(Number.isFinite(hp)&&this.healthBar)this.healthBar.set(hp,{animate:false});
    if(snapshot?.player)this._syncTerrainChunks(snapshot.player);
  }

  onHealthChanged({current}={}){
    if(Number.isFinite(current)&&this.healthBar)this.healthBar.set(current,{animate:true});
  }

  resize(){
    const rect=this.host.getBoundingClientRect();
    const w=Math.max(1,Math.round(rect.width||innerWidth||1280));
    const h=Math.max(1,Math.round(rect.height||innerHeight||720));
    this.renderer.setSize(w,h,false);
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  }

  _updatePlayer(dt,snapshot){
    if(!snapshot?.player||!this.playerRoot)return;
    const p=snapshot.player;
    const target=new this.THREE.Vector3(p.x,p.y,Number.isFinite(p.z)?p.z:.36);
    const factor=1-Math.pow(.001,Math.max(0,dt));
    this.playerRoot.position.lerp(target,factor);
    const facing=Number.isFinite(p.facing)?p.facing:(p.vx<-.02?-1:p.vx>.02?1:this.playerPaper.facing);
    this.playerPaper.setFacing(facing);
    this.playerPaper.update(dt,{action:p.action,time:performance.now()/1000});
    this.healthBar.group.position.set(p.x,p.y+2.42,(Number.isFinite(p.z)?p.z:.36)+.05);
    const crouch=p.crouching?.82:1;
    this.playerRoot.scale.y+=(crouch-this.playerRoot.scale.y)*Math.min(1,dt*14);
  }

  _updateCamera(dt,snapshot){
    if(!snapshot?.player)return;
    const p=snapshot.player;
    const desiredTarget=new this.THREE.Vector3(p.x,p.y+1.25,0);
    const targetFactor=1-Math.pow(.0008,Math.max(0,dt));
    if(!this.cameraTargetSmooth.lengthSq())this.cameraTargetSmooth.copy(desiredTarget);
    else this.cameraTargetSmooth.lerp(desiredTarget,targetFactor);
    this.cameraTarget.copy(this.cameraTargetSmooth);

    let desired;
    if(this.stageView.enabled){
      desired=this.stageView.axis==='x'
        ?new this.THREE.Vector3(this.cameraTarget.x+this.stageView.side*this.cameraRig.distance,this.cameraTarget.y,0)
        :new this.THREE.Vector3(this.cameraTarget.x,this.cameraTarget.y,this.stageView.side*this.cameraRig.distance);
    }else{
      const cp=Math.cos(this.cameraRig.pitch);
      desired=new this.THREE.Vector3(
        this.cameraTarget.x+Math.sin(this.cameraRig.yaw)*cp*this.cameraRig.distance,
        this.cameraTarget.y+Math.sin(this.cameraRig.pitch)*this.cameraRig.distance,
        Math.cos(this.cameraRig.yaw)*cp*this.cameraRig.distance
      );
    }
    const cameraFactor=1-Math.pow(.002,Math.max(0,dt));
    this.camera.position.lerp(desired,cameraFactor);
    this.camera.lookAt(this.cameraTarget);
  }

  _updateBackdrop(snapshot){
    const x=snapshot?.player?.x||0,y=snapshot?.player?.y||0;
    if(this.backdrop?.far)this.backdrop.far.position.x=x*.16;
    if(this.backdrop?.near)this.backdrop.near.position.x=x*.32;
    // Keep the paper horizon from vanishing when travelling deep underground.
    if(this.backdrop?.far)this.backdrop.far.position.y=Math.max(-18,y*.08);
    if(this.backdrop?.near)this.backdrop.near.position.y=Math.max(-20,y*.12-2);
  }

  update(dt,snapshot=this.lastSnapshot){
    if(snapshot)this.lastSnapshot=snapshot;
    const current=this.lastSnapshot;
    this._syncTerrainChunks(current?.player||{x:0,y:0});
    this._updatePlayer(dt,current);
    this._updateCamera(dt,current);
    this._updateBackdrop(current);
    this.healthBar?.update(this.camera,dt);
  }

  render(){this.renderer.render(this.scene,this.camera)}

  stats(){
    const info=this.renderer.info?.render||{};
    let triangles=Number(info.triangles)||0;
    return {
      renderer:this.renderer.constructor?.name||'WebGLRenderer',
      mode:'paper-stage-x-y-voxel',
      drawCalls:Number(info.calls)||0,
      triangles,
      sceneChildren:this.scene.children.length,
      pixelRatio:this.pixelRatio,
      health:this.healthBar?.snapshot()||null,
      camera:this.cameraConfig(),
      stageView:{...this.stageView},
      debugColliders:this.debugColliders,
      terrain:{
        ...this.terrain.stats(),
        activeChunks:this.terrainMeshes.size,
        singleLayer:true
      },
      paperEntities:this.paperEntities.length+1,
      playerRepresentation:'PlaneGeometry',
      playerFacing:this.playerPaper?.facing||1,
      playerTurnRotationY:this.playerRoot?.rotation?.y||0
    };
  }

  dispose(){
    this.terrainUnsubscribe?.();
    for(const mesh of this.terrainMeshes.values()){mesh.geometry.dispose();mesh.material.dispose()}
    for(const entity of this.paperEntities)entity.dispose();
    this.playerPaper?.dispose();
    this.renderer.dispose();
    this.host.replaceChildren();
  }
}
