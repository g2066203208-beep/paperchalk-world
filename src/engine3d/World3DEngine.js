import {PaperSpriteEntity} from '../entities/PaperSpriteEntity.js';
import {
  buildSingleLayerCubeGeometry,
  createVoxelGridTexture,
  DEFAULT_TERRAIN_PALETTE
} from '../terrain/voxel-block-mesh.js';

export class WorldSpaceHealthBar{
  constructor(THREE,{max=10}={}){
    this.THREE=THREE;this.max=max;this.value=max;
    this.group=new THREE.Group();
    this.group.name='player-health-paper-stage';
    this.group.position.set(0,1.35,.08);
    this.cells=[];this.animations=new Map();
    this._parentQuaternion=new THREE.Quaternion();
    const unit=.23,gap=.026,total=(max-1)*(unit+gap)+.34;
    for(let i=0;i<max;i++){
      const tail=i===max-1;
      const holder=new THREE.Group();
      holder.position.x=i*(unit+gap)-total*.5;
      const frame=new THREE.Mesh(
        tail?this._tailGeometry(.33,.16):new THREE.PlaneGeometry(unit,.16),
        new THREE.MeshBasicMaterial({color:0x2a211b,side:THREE.DoubleSide,depthTest:true,depthWrite:true})
      );
      const fill=new THREE.Mesh(
        tail?this._tailGeometry(.27,.10):new THREE.PlaneGeometry(unit-.055,.10),
        new THREE.MeshBasicMaterial({color:tail?0xe0a84c:0xc75545,transparent:true,opacity:1,side:THREE.DoubleSide,depthTest:true,depthWrite:true})
      );
      fill.position.z=.012;
      holder.add(frame,fill);holder.userData={fill,isTail:tail,index:i};
      this.group.add(holder);this.cells.push(holder);
    }
  }
  _tailGeometry(w,h){
    const THREE=this.THREE,shape=new THREE.Shape(),hw=w*.5,hh=h*.5;
    shape.moveTo(-hw,-hh);shape.lineTo(hw*.52,-hh);shape.lineTo(hw,0);shape.lineTo(hw*.52,hh);shape.lineTo(-hw,hh);shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }
  set(value,{animate=true}={}){
    const next=Math.max(0,Math.min(this.max,Math.round(Number(value)||0))),prev=this.value;
    if(next===prev)return next;
    this.value=next;
    if(animate){
      if(next<prev)for(let i=next;i<prev;i++)this.animations.set(i,{kind:'damage',elapsed:0,delay:(prev-1-i)*.025,duration:.28});
      else for(let i=prev;i<next;i++)this.animations.set(i,{kind:'heal',elapsed:0,delay:(i-prev)*.04,duration:.34});
    }
    this._sync(!animate);return next;
  }
  _sync(immediate=false){
    for(let i=0;i<this.cells.length;i++){
      const fill=this.cells[i].userData.fill;
      if(immediate||!this.animations.has(i)){fill.visible=i<this.value;fill.material.opacity=i<this.value?1:.1;fill.scale.setScalar(1)}
    }
  }
  update(camera,dt=0){
    if(camera){
      const parent=this.group.parent;
      if(parent){parent.getWorldQuaternion(this._parentQuaternion);this._parentQuaternion.invert();this.group.quaternion.copy(this._parentQuaternion).multiply(camera.quaternion)}
      else this.group.quaternion.copy(camera.quaternion);
    }
    const step=Math.max(0,Math.min(.1,Number(dt)||0));
    for(const [i,a] of [...this.animations]){
      a.elapsed+=step;const fill=this.cells[i]?.userData?.fill;if(!fill){this.animations.delete(i);continue}
      const t=(a.elapsed-a.delay)/a.duration;if(t<0)continue;
      if(t>=1){fill.visible=i<this.value;fill.material.opacity=i<this.value?1:.1;fill.scale.setScalar(1);this.animations.delete(i);continue}
      fill.visible=true;
      if(a.kind==='damage'){fill.scale.setScalar(Math.max(.15,1.25-t));fill.material.opacity=1-t*.9}
      else{fill.scale.setScalar(.2+Math.sin(Math.min(1,t)*Math.PI*.5)*.95);fill.material.opacity=Math.min(1,.2+t*1.4)}
    }
  }
  snapshot(){return {value:this.value,max:this.max,cells:this.cells.length,tail:this.cells.at(-1)?.userData?.isTail===true,animating:this.animations.size}}
}

class TerrainChunkRenderer{
  constructor(THREE,terrain,scene,settings={}){
    this.THREE=THREE;
    this.terrain=terrain;
    this.scene=scene;
    this.settings={radiusX:3,radiusY:2,thickness:terrain.tileSize,texturePixels:terrain.pixelsPerMeter||128,...settings};
    // One gameplay layer, one physical cube thickness. This is not a 3D voxel volume.
    this.thickness=Math.max(.001,Number(this.settings.thickness)||terrain.tileSize);
    this.root=new THREE.Group();
    this.root.name='single-layer-3d-cube-terrain';
    scene.add(this.root);
    this.meshes=new Map();
    this.visibleKeys=new Set();
    this.texture=createVoxelGridTexture(THREE,{size:Math.max(16,Math.round(Number(this.settings.texturePixels)||128))});
    this.material=new THREE.MeshLambertMaterial({
      map:this.texture,
      vertexColors:true,
      side:THREE.FrontSide,
      toneMapped:false
    });
    this.unsubscribe=terrain.subscribe(event=>this._onTerrainChanged(event));
  }

  _markDirty(cx,cy){
    const record=this.meshes.get(this.terrain.chunkKey(cx,cy));
    if(record)record.version=-1;
  }

  _onTerrainChanged(event){
    if(event.reload){
      for(const record of this.meshes.values())record.version=-1;
      return;
    }
    if(!Number.isFinite(event.cx)||!Number.isFinite(event.cy))return;
    this._markDirty(event.cx,event.cy);

    // A border edit changes the exposed side face of the adjacent chunk too.
    const n=this.terrain.chunkSize;
    const lx=((event.gx%n)+n)%n;
    const ly=((event.gy%n)+n)%n;
    if(lx===0)this._markDirty(event.cx-1,event.cy);
    if(lx===n-1)this._markDirty(event.cx+1,event.cy);
    if(ly===0)this._markDirty(event.cx,event.cy-1);
    if(ly===n-1)this._markDirty(event.cx,event.cy+1);
  }

  _build(chunk){
    const THREE=this.THREE;
    const geometry=buildSingleLayerCubeGeometry(THREE,this.terrain,chunk,{
      thickness:this.thickness,
      palette:DEFAULT_TERRAIN_PALETTE
    });
    const mesh=new THREE.Mesh(geometry,this.material);
    const span=chunk.size*this.terrain.tileSize;
    mesh.name='terrain-cube-chunk:'+chunk.cx+','+chunk.cy;
    mesh.position.set(chunk.cx*span,chunk.cy*span,0);
    mesh.castShadow=false;
    mesh.receiveShadow=true;
    mesh.userData={
      cx:chunk.cx,cy:chunk.cy,
      ...geometry.userData
    };
    return mesh;
  }

  _ensure(cx,cy){
    const key=this.terrain.chunkKey(cx,cy);
    const chunk=this.terrain.getChunk(cx,cy);
    let record=this.meshes.get(key);
    if(record&&record.version===chunk.version)return record;
    if(record){
      this.root.remove(record.mesh);
      record.mesh.geometry.dispose();
    }
    const mesh=this._build(chunk);
    record={mesh,version:chunk.version,cx,cy};
    this.meshes.set(key,record);
    this.root.add(mesh);
    return record;
  }

  update(player){
    if(!player)return;
    const span=this.terrain.chunkSize*this.terrain.tileSize;
    const ccx=Math.floor(player.x/span),ccy=Math.floor(player.y/span);
    const next=new Set();
    for(let y=-this.settings.radiusY;y<=this.settings.radiusY;y++){
      for(let x=-this.settings.radiusX;x<=this.settings.radiusX;x++){
        const cx=ccx+x,cy=ccy+y,key=this.terrain.chunkKey(cx,cy);
        next.add(key);
        const record=this._ensure(cx,cy);
        record.mesh.visible=true;
      }
    }
    for(const [key,record] of [...this.meshes]){
      if(next.has(key))continue;
      this.root.remove(record.mesh);
      record.mesh.geometry.dispose();
      this.meshes.delete(key);
      this.terrain.unloadChunk(record.cx,record.cy);
    }
    this.visibleKeys=next;
  }

  setDebug(enabled){
    this.material.wireframe=!!enabled;
    this.material.needsUpdate=true;
  }

  stats(){
    let visible=0,solid=0,quads=0,unitFaces=0,triangles=0,culledFaces=0;
    for(const key of this.visibleKeys){
      const r=this.meshes.get(key);
      if(!r?.mesh.visible)continue;
      visible++;
      const u=r.mesh.userData||{};
      solid+=u.solidTiles||0;
      quads+=u.quads||0;
      unitFaces+=u.unitFaces||0;
      triangles+=u.triangles||0;
      culledFaces+=u.culledFaces||0;
    }
    return {
      visibleChunks:visible,
      renderedSolidTiles:solid,
      renderedQuads:quads,
      representedUnitFaces:unitFaces,
      terrainTriangles:triangles,
      culledInternalFaces:culledFaces,
      oneLayer:true,
      blockGeometry:'3d-cube',
      thickness:this.thickness,
      texturePixels:this.texture?.image?.width||this.settings.texturePixels||128,
      greedyRatio:quads?unitFaces/quads:1,
      ...this.terrain.stats()
    };
  }

  dispose(){
    this.unsubscribe?.();
    for(const r of this.meshes.values())r.mesh.geometry.dispose();
    this.texture.dispose();
    this.material.dispose();
    this.scene.remove(this.root);
  }
}

class PaperWallRenderer{
  constructor(THREE,scene,terrain,definitions=[]){
    this.THREE=THREE;this.scene=scene;this.terrain=terrain;
    this.root=new THREE.Group();this.root.name='paper-wall-system';scene.add(this.root);
    this.walls=[];
    for(const def of definitions||[])this._build(def);
  }
  _build(def){
    const THREE=this.THREE;
    const tile=Math.max(.1,Number(def.tileSize)||1);
    const cols=Math.max(1,Math.floor(Number(def.columns)||1));
    const rows=Math.max(1,Math.floor(Number(def.rows)||1));
    const ground=def.grounded?this.terrain.highestGroundY(Number(def.x)||0):Number(def.y)||0;
    const group=new THREE.Group();
    group.name='paper-wall:'+String(def.id||'wall');
    group.position.set(Number(def.x)||0,ground,Number(def.z)||-1.5);
    const edgeMat=new THREE.MeshBasicMaterial({color:def.edge||'#6f5b49',side:THREE.DoubleSide,toneMapped:false});
    const faceMat=new THREE.MeshBasicMaterial({color:def.primary||'#cbb894',side:THREE.DoubleSide,toneMapped:false});
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const x=(c-(cols-1)/2)*tile,y=(r+.5)*tile;
        const edge=new THREE.Mesh(new THREE.PlaneGeometry(tile*.985,tile*.985),edgeMat);
        edge.position.set(x,y,0);
        const face=new THREE.Mesh(new THREE.PlaneGeometry(tile*.92,tile*.92),faceMat);
        face.position.set(x,y,.012);
        group.add(edge,face);
      }
    }
    group.userData={id:def.id,columns:cols,rows,tileSize:tile,kind:'paper-wall'};
    this.root.add(group);this.walls.push(group);
  }
  stats(){return {walls:this.walls.length,mode:'square-paper-panels',collision:false}}
  dispose(){
    this.root.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.()});
    this.scene.remove(this.root);
  }
}

export class World3DEngine{
  constructor({THREE,host,content,onCameraChanged=null}){
    if(!THREE)throw new Error('THREE_REQUIRED');
    if(!host)throw new Error('THREE_HOST_REQUIRED');
    if(!window.PaperchalkTerrain)throw new Error('PAPERCHALK_TERRAIN_REQUIRED');
    this.THREE=THREE;this.host=host;this.content=content||{};
    this.terrain=window.PaperchalkTerrain;
    this.onCameraChanged=typeof onCameraChanged==='function'?onCameraChanged:null;
    this.sceneData=this.content.scene3d||{};
    this.layers=this.sceneData.layers||{far:-8,rear:-3,terrain:0,actor:.45,front:2.5};
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color('#b9cbd4');
    this.camera=new THREE.PerspectiveCamera(42,1,.05,140);
    this.cameraRig={yaw:0,pitch:0,distance:18,minDistance:7,maxDistance:34,height:.35,fov:42};
    this.stageView={enabled:true,axis:'z',side:1};
    this.cameraTarget=new THREE.Vector3();
    this.cameraTargetSmooth=new THREE.Vector3();
    this.lastSnapshot=null;this.playerSprite=null;this.healthBar=null;this.paperEntities=[];
    this.debugColliders=false;this.pointerState=null;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    const coarse=matchMedia('(pointer:coarse)').matches;
    this.pixelRatio=Math.max(1,Math.min(Number(devicePixelRatio)||1,2));
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.NoToneMapping;
    this.renderer.shadowMap.enabled=false;
    this.renderer.domElement.className='three-world-canvas';
    this.renderer.domElement.setAttribute('aria-label','Paperchalk 3D paper stage');
    this.renderer.domElement.tabIndex=0;this.renderer.domElement.style.touchAction='none';
    host.replaceChildren(this.renderer.domElement);
    this._buildStage();
    this._installCameraInput();
    this.resize();
  }
  _buildStage(){
    const THREE=this.THREE;

    // Paper entities use MeshBasicMaterial; these lights affect only the cube terrain,
    // making its physical thickness readable when the debug camera moves off-axis.
    const hemi=new THREE.HemisphereLight(0xfff2d6,0x3d4245,1.35);
    hemi.name='terrain-hemi-light';
    this.scene.add(hemi);
    const sun=new THREE.DirectionalLight(0xffedcf,1.55);
    sun.name='terrain-key-light';
    sun.position.set(9,13,12);
    this.scene.add(sun);
    this.terrainLights={hemi,sun};

    const bgMat=new THREE.MeshBasicMaterial({color:'#d7d0bd',side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
    const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(220,90),bgMat);
    backdrop.position.set(0,12,this.layers.far-2);backdrop.name='paper-sky-backdrop';this.scene.add(backdrop);this.backdrop=backdrop;

    const blackMat=new THREE.MeshBasicMaterial({color:0x050505,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
    this.understage=new THREE.Mesh(new THREE.PlaneGeometry(240,80),blackMat);
    this.understage.name='black-understage';
    this.understage.position.set(0,-40,this.layers.far-1.2);
    this.scene.add(this.understage);

    const apronShape=new THREE.Shape();
    apronShape.moveTo(-42,0);apronShape.lineTo(42,0);apronShape.lineTo(72,-24);apronShape.lineTo(-72,-24);apronShape.closePath();
    const apronMat=new THREE.MeshBasicMaterial({color:'#6f7148',side:THREE.DoubleSide,toneMapped:false});
    this.stageApron=new THREE.Mesh(new THREE.ShapeGeometry(apronShape),apronMat);
    this.stageApron.name='paper-road-apron';
    this.stageApron.position.set(0,0,this.layers.rear+.35);
    this.scene.add(this.stageApron);

    const seamMat=new THREE.MeshBasicMaterial({color:'#555a37',side:THREE.DoubleSide,toneMapped:false,transparent:true,opacity:.72});
    this.stageApronSeams=[];
    for(const y of [-5,-10,-15,-20]){
      const seam=new THREE.Mesh(new THREE.PlaneGeometry(120,.08),seamMat);
      seam.name='paper-road-seam';seam.position.set(0,y,this.layers.rear+.37);this.scene.add(seam);this.stageApronSeams.push(seam);
    }

    this.paperWallRenderer=new PaperWallRenderer(THREE,this.scene,this.terrain,this.sceneData.paperWalls||[]);

    this.terrainRenderer=new TerrainChunkRenderer(THREE,this.terrain,this.scene,{
      radiusX:this.sceneData.terrain?.visibleChunkRadiusX??3,
      radiusY:this.sceneData.terrain?.visibleChunkRadiusY??2,
      thickness:this.sceneData.terrain?.thickness??this.terrain.tileSize,
      texturePixels:this.sceneData.terrain?.texturePixels??this.terrain.pixelsPerMeter??128
    });

    const cursorGeometry=new THREE.BoxGeometry(
      this.terrain.tileSize*1.035,
      this.terrain.tileSize*1.035,
      this.terrainRenderer.thickness*1.08
    );
    const cursorMaterial=new THREE.MeshBasicMaterial({
      color:0xf3d06b,
      wireframe:true,
      transparent:true,
      opacity:.95,
      depthTest:false,
      toneMapped:false
    });
    this.terrainCursor=new THREE.Mesh(cursorGeometry,cursorMaterial);
    this.terrainCursor.name='terrain-block-cursor';
    this.terrainCursor.visible=false;
    this.terrainCursor.renderOrder=1000;
    this.scene.add(this.terrainCursor);

    for(const def of this.sceneData.stageEntities||[]){
      const ground=def.grounded?this.terrain.highestGroundY(def.x):Number(def.y)||0;
      const entity=new PaperSpriteEntity(THREE,{
        ...def,y:ground,z:Number.isFinite(Number(def.z))?Number(def.z):this.layers.rear,seed:this._seedFromId(def.id)
      });
      this.paperEntities.push(entity);this.scene.add(entity.root);
    }
    const playerTexture=new THREE.TextureLoader().load('assets/player/protagonist.webp?v=player-hd-camera-r1');
    playerTexture.colorSpace=THREE.SRGBColorSpace;
    playerTexture.magFilter=THREE.LinearFilter;
    playerTexture.minFilter=THREE.LinearMipmapLinearFilter;
    playerTexture.generateMipmaps=true;
    this.playerSprite=new PaperSpriteEntity(THREE,{
      id:'player',kind:'player',label:'',x:0,y:0,z:this.layers.actor,
      width:1,height:2,anchorY:1,texture:playerTexture
    });
    this.healthBar=new WorldSpaceHealthBar(THREE,{max:10});
    this.playerSprite.root.add(this.healthBar.group);
    this.scene.add(this.playerSprite.root);
  }
  _seedFromId(id){
    let h=2166136261;for(const ch of String(id||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;
  }
  _installCameraInput(){
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',event=>{
      this.pointerState={id:event.pointerId,lastX:event.clientX,lastY:event.clientY,moved:false};
      try{canvas.setPointerCapture(event.pointerId)}catch{}
    });
    canvas.addEventListener('pointermove',event=>{
      if(!this.pointerState||event.pointerId!==this.pointerState.id)return;
      const dx=event.clientX-this.pointerState.lastX,dy=event.clientY-this.pointerState.lastY;
      this.pointerState.lastX=event.clientX;this.pointerState.lastY=event.clientY;
      if(Math.abs(dx)+Math.abs(dy)<.3)return;
      this.pointerState.moved=true;
      if(this.stageView.enabled)return;
      this.cameraRig.yaw-=dx*.006;
      this.cameraRig.pitch=Math.max(-1.15,Math.min(1.15,this.cameraRig.pitch+dy*.004));
      this._notifyCamera();
    });
    const release=event=>{if(this.pointerState&&event.pointerId===this.pointerState.id)this.pointerState=null};
    canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
    canvas.addEventListener('wheel',event=>{
      event.preventDefault();
      this.cameraRig.distance=Math.max(this.cameraRig.minDistance,Math.min(this.cameraRig.maxDistance,this.cameraRig.distance+Math.sign(event.deltaY)*1.2));
      this._notifyCamera();
    },{passive:false});
  }
  _stageYaw(){return this.stageView.enabled?(this.stageView.axis==='x'?Math.PI*.5:0):this.cameraRig.yaw}
  _notifyCamera(){
    this.onCameraChanged?.({
      yaw:this._stageYaw(),orbitYaw:this.cameraRig.yaw,pitch:this.cameraRig.pitch,
      distance:this.cameraRig.distance,height:this.cameraRig.height,fov:this.cameraRig.fov,stageView:{...this.stageView}
    });
  }
  setCameraConfig(config={}){
    if(Number.isFinite(config.orbitYaw))this.cameraRig.yaw=config.orbitYaw;
    else if(Number.isFinite(config.yaw)&&!config.stageView?.enabled)this.cameraRig.yaw=config.yaw;
    if(Number.isFinite(config.pitch))this.cameraRig.pitch=Math.max(-1.15,Math.min(1.15,config.pitch));
    if(Number.isFinite(config.distance))this.cameraRig.distance=Math.max(this.cameraRig.minDistance,Math.min(this.cameraRig.maxDistance,config.distance));
    if(Number.isFinite(config.height))this.cameraRig.height=Math.max(-4,Math.min(8,config.height));
    this.cameraRig.fov=42;this.camera.fov=42;this.camera.updateProjectionMatrix();
    if(config.stageView&&typeof config.stageView==='object'){
      this.stageView.enabled=config.stageView.enabled!==false;
      this.stageView.axis=config.stageView.axis==='x'?'x':'z';
      this.stageView.side=config.stageView.side===-1?-1:1;
    }
    this._notifyCamera();return this.cameraConfig();
  }
  setStageView(enabled,axis=this.stageView.axis){this.stageView.enabled=!!enabled;this.stageView.axis=axis==='x'?'x':'z';this.pointerState=null;this._notifyCamera();return {...this.stageView}}
  toggleStageView(){return this.setStageView(!this.stageView.enabled,this.stageView.axis)}
  setStageAxis(axis){this.stageView.axis=axis==='x'?'x':'z';this._notifyCamera();return {...this.stageView}}
  resetCamera(){
    Object.assign(this.cameraRig,{yaw:0,pitch:0,distance:18,height:.35,fov:42});
    Object.assign(this.stageView,{enabled:true,axis:'z',side:1});
    this.camera.fov=42;this.camera.updateProjectionMatrix();this._notifyCamera();return this.cameraConfig();
  }
  cameraConfig(){return {yaw:this._stageYaw(),orbitYaw:this.cameraRig.yaw,pitch:this.cameraRig.pitch,distance:this.cameraRig.distance,height:this.cameraRig.height,fov:this.cameraRig.fov,stageView:{...this.stageView}}}
  setDebugColliders(enabled){this.debugColliders=!!enabled;this.terrainRenderer.setDebug(this.debugColliders);return this.debugColliders}
  setSnapshot(snapshot){
    this.lastSnapshot=snapshot||null;
    const hp=snapshot?.health?.current;if(Number.isFinite(hp))this.healthBar?.set(hp,{animate:false});
  }
  onHealthChanged({current}={}){if(Number.isFinite(current))this.healthBar?.set(current,{animate:true})}
  resize(){
    const rect=this.host.getBoundingClientRect();
    const w=Math.max(1,Math.round(rect.width||innerWidth||1280)),h=Math.max(1,Math.round(rect.height||innerHeight||720));
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  }
  _updatePlayer(dt,snapshot){
    const p=snapshot?.player;if(!p||!this.playerSprite)return;
    const target=new this.THREE.Vector3(p.x,p.y,this.layers.actor);
    const k=1-Math.pow(.0003,Math.max(0,dt));this.playerSprite.root.position.lerp(target,k);
    if(Math.abs(p.vx)>.03)this.playerSprite.setFacing(p.vx<0?-1:1);
    this.playerSprite.update(dt);
    const mesh=this.playerSprite.mesh;
    if(p.action==='walk')mesh.position.y=Math.sin(performance.now()*.018)*.025;
    else mesh.position.y=0;
    const crouch=p.crouching?.72:1;mesh.scale.y+=(crouch-mesh.scale.y)*Math.min(1,dt*18);
  }
  _updateCamera(dt,snapshot){
    const p=snapshot?.player;if(!p)return;
    const desiredTarget=new this.THREE.Vector3(p.x,p.y+this.cameraRig.height,0);
    const k=1-Math.pow(.0005,Math.max(0,dt));
    if(!this.cameraTargetSmooth.lengthSq())this.cameraTargetSmooth.copy(desiredTarget);else this.cameraTargetSmooth.lerp(desiredTarget,k);
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
    this.camera.position.lerp(desired,k);this.camera.lookAt(this.cameraTarget);
    this.backdrop.position.x=this.cameraTarget.x*.18;
    this.backdrop.position.y=this.cameraTarget.y*.12+8;

    const stageTop=this.terrain.highestGroundY(p.x);
    this.stageApron.position.x=this.cameraTarget.x;
    this.stageApron.position.y=stageTop-.02;
    this.understage.position.x=this.cameraTarget.x;
    this.understage.position.y=stageTop-40;
    for(let i=0;i<this.stageApronSeams.length;i++){
      this.stageApronSeams[i].position.x=this.cameraTarget.x;
      this.stageApronSeams[i].position.y=stageTop+[-5,-10,-15,-20][i];
    }
  }
  _updateWorldTime(snapshot){
    const minutes=Number(snapshot?.world?.minutes);if(!Number.isFinite(minutes))return;
    const n=((minutes%1440)+1440)%1440/1440,sun=Math.max(0,Math.sin((n-.25)*Math.PI*2));
    this.scene.background.setRGB(.08+sun*.58,.10+sun*.66,.15+sun*.64);
  }
  update(dt,snapshot=this.lastSnapshot){
    if(snapshot)this.lastSnapshot=snapshot;
    const current=this.lastSnapshot;
    this._updatePlayer(dt,current);this._updateCamera(dt,current);this._updateWorldTime(current);
    this.terrainRenderer.update(current?.player);
    this.healthBar?.update(this.camera,dt);
  }
  render(){this.renderer.render(this.scene,this.camera)}
  screenToWorld(clientX,clientY){
    const rect=this.renderer.domElement.getBoundingClientRect();
    const ndc=new this.THREE.Vector2(
      ((clientX-rect.left)/Math.max(1,rect.width))*2-1,
      -((clientY-rect.top)/Math.max(1,rect.height))*2+1
    );
    const ray=new this.THREE.Raycaster();
    ray.setFromCamera(ndc,this.camera);

    // Normal play edits the front face of the sole cube layer.
    // No hidden Z cell can ever be selected because no such gameplay layer exists.
    const frontZ=this.terrainRenderer.thickness*.5;
    const plane=new this.THREE.Plane(new this.THREE.Vector3(0,0,1),-frontZ);
    const point=new this.THREE.Vector3();
    if(!ray.ray.intersectPlane(plane,point))return null;
    return {x:point.x,y:point.y,z:frontZ};
  }

  screenToTerrainCell(clientX,clientY,{showCursor=true}={}){
    const point=this.screenToWorld(clientX,clientY);
    if(!point){
      if(this.terrainCursor)this.terrainCursor.visible=false;
      return null;
    }
    const cell=this.terrain.worldToCell(point.x,point.y);
    const center=this.terrain.cellCenter(cell.gx,cell.gy);
    const tile=this.terrain.peekTile(cell.gx,cell.gy);
    const result={
      x:center.x,y:center.y,z:0,
      gx:cell.gx,gy:cell.gy,
      tile,solid:this.terrain.isSolidTile(tile),
      point
    };
    if(showCursor&&this.terrainCursor){
      this.terrainCursor.position.set(center.x,center.y,0);
      this.terrainCursor.visible=true;
    }
    return result;
  }

  hideTerrainCursor(){
    if(this.terrainCursor)this.terrainCursor.visible=false;
  }
  stats(){
    const info=this.renderer.info?.render||{};
    return {
      renderer:this.renderer.constructor?.name||'WebGLRenderer',
      worldMode:'paper-stage-2.5d',
      terrainMode:'single-layer-3d-cubes',
      entityMode:'2d-textured-planes',
      drawCalls:Number(info.calls)||0,triangles:Number(info.triangles)||0,
      sceneChildren:this.scene.children.length,pixelRatio:this.pixelRatio,
      health:this.healthBar?.snapshot()||null,camera:this.cameraConfig(),stageView:{...this.stageView},
      debugColliders:this.debugColliders,terrain:this.terrainRenderer.stats(),
      paperEntities:this.paperEntities.length+1,playerGeometry:'PlaneGeometry',
      stageVisual:{understage:'black',roadApron:'paper-trapezoid'},
      paperWalls:this.paperWallRenderer?.stats?.()||null,
      playerTextureSize:{width:this.playerSprite?.texture?.image?.naturalWidth||this.playerSprite?.texture?.image?.width||0,height:this.playerSprite?.texture?.image?.naturalHeight||this.playerSprite?.texture?.image?.height||0},
      terrainBlockGeometry:'Box/Cube faces via greedy BufferGeometry'
    };
  }
  dispose(){
    this.terrainRenderer?.dispose();
    this.paperWallRenderer?.dispose?.();
    this.stageApron?.geometry?.dispose?.();this.stageApron?.material?.dispose?.();
    this.understage?.geometry?.dispose?.();this.understage?.material?.dispose?.();
    for(const seam of this.stageApronSeams||[]){seam.geometry?.dispose?.();seam.material?.dispose?.()}
    if(this.terrainCursor){
      this.terrainCursor.geometry.dispose();
      this.terrainCursor.material.dispose();
    }
    this.playerSprite?.dispose();for(const entity of this.paperEntities)entity.dispose();
    this.renderer.dispose();this.host.replaceChildren();
  }
}
