import {PaperSpriteEntity} from '../entities/PaperSpriteEntity.js';
import {
  buildVoxelChunkGeometry,
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
    this.THREE=THREE;this.terrain=terrain;this.scene=scene;
    this.settings={radiusXZ:3,radiusY:2,texturePixels:terrain.pixelsPerMeter||128,maxBuildsPerFrame:5,...settings};
    this.root=new THREE.Group();this.root.name='infinite-3d-voxel-terrain';scene.add(this.root);
    this.meshes=new Map();this.visibleKeys=new Set();this.pending=[];
    this.texture=createVoxelGridTexture(THREE,{size:Math.max(16,Math.round(Number(this.settings.texturePixels)||128))});
    this.material=new THREE.MeshLambertMaterial({map:this.texture,vertexColors:true,side:THREE.FrontSide,toneMapped:false});
    this.darknessMaterial=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,depthTest:true,side:THREE.FrontSide,
      polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:false,
      uniforms:{
        uPlayer:{value:new THREE.Vector3()},
        uTorchOn:{value:0},
        uTime:{value:0}
      },
      vertexShader:`
        attribute float darkness;
        varying float vDarkness;
        varying vec3 vWorldPos;
        void main(){
          vDarkness=darkness;
          vec4 wp=modelMatrix*vec4(position,1.0);
          vWorldPos=wp.xyz;
          gl_Position=projectionMatrix*viewMatrix*wp;
        }
      `,
      fragmentShader:`
        precision mediump float;
        varying float vDarkness;
        varying vec3 vWorldPos;
        uniform vec3 uPlayer;
        uniform float uTorchOn;
        uniform float uTime;
        void main(){
          if(vDarkness<0.01)discard;
          float d=distance(vWorldPos,uPlayer);
          float bodyReveal=1.0-smoothstep(0.55,1.45,d);
          float torchRadius=9.5+0.35*sin(uTime*7.0);
          float torchReveal=uTorchOn*(1.0-smoothstep(2.0,torchRadius,d));
          float reveal=max(bodyReveal,torchReveal);
          float alpha=vDarkness*(1.0-reveal)*0.985;
          if(alpha<0.01)discard;
          gl_FragColor=vec4(0.0,0.0,0.0,alpha);
        }
      `
    });
    this.unsubscribe=terrain.subscribe(event=>this._onTerrainChanged(event));
  }
  _markDirty(cx,cy,cz){
    const record=this.meshes.get(this.terrain.chunkKey(cx,cy,cz));
    if(record)record.version=-1;
  }
  _onTerrainChanged(event){
    if(event.reload){for(const r of this.meshes.values())r.version=-1;return}
    if(![event.cx,event.cy,event.cz].every(Number.isFinite))return;
    this._markDirty(event.cx,event.cy,event.cz);
    const n=this.terrain.chunkSize;
    const lx=((event.gx%n)+n)%n,ly=((event.gy%n)+n)%n,lz=((event.gz%n)+n)%n;
    if(lx===0)this._markDirty(event.cx-1,event.cy,event.cz);
    if(lx===n-1)this._markDirty(event.cx+1,event.cy,event.cz);
    if(ly===0)this._markDirty(event.cx,event.cy-1,event.cz);
    if(ly===n-1)this._markDirty(event.cx,event.cy+1,event.cz);
    if(lz===0)this._markDirty(event.cx,event.cy,event.cz-1);
    if(lz===n-1)this._markDirty(event.cx,event.cy,event.cz+1);
  }
  _build(cx,cy,cz){
    const chunk=this.terrain.getChunk(cx,cy,cz);
    const geometry=buildVoxelChunkGeometry(this.THREE,this.terrain,chunk,{palette:DEFAULT_TERRAIN_PALETTE});
    const mesh=new this.THREE.Mesh(geometry,this.material);
    const span=chunk.size*this.terrain.tileSize;
    mesh.name='voxel-chunk:'+cx+','+cy+','+cz;
    mesh.position.set(cx*span,cy*span,cz*span);
    mesh.receiveShadow=true;mesh.castShadow=true;
    mesh.userData={cx,cy,cz,...geometry.userData};

    let darknessMesh=null;
    if((geometry.userData?.darknessVertices||0)>0){
      darknessMesh=new this.THREE.Mesh(geometry,this.darknessMaterial);
      darknessMesh.name='underground-darkness:'+cx+','+cy+','+cz;
      darknessMesh.position.copy(mesh.position);
      darknessMesh.renderOrder=20;
      darknessMesh.frustumCulled=true;
      this.root.add(darknessMesh);
    }
    return {mesh,darknessMesh,version:chunk.version,cx,cy,cz};
  }
  _ensure(cx,cy,cz){
    const key=this.terrain.chunkKey(cx,cy,cz),chunk=this.terrain.getChunk(cx,cy,cz);
    let record=this.meshes.get(key);
    if(record&&record.version===chunk.version)return record;
    if(record){this.root.remove(record.mesh);if(record.darknessMesh)this.root.remove(record.darknessMesh);record.mesh.geometry.dispose()}
    record=this._build(cx,cy,cz);this.meshes.set(key,record);this.root.add(record.mesh);return record;
  }
  update(player,{torchOn=false,time=0}={}){
    if(!player)return;
    this.darknessMaterial.uniforms.uPlayer.value.set(player.x,player.y,player.z);
    this.darknessMaterial.uniforms.uTorchOn.value=torchOn?1:0;
    this.darknessMaterial.uniforms.uTime.value=Number(time)||0;
    const span=this.terrain.chunkSize*this.terrain.tileSize;
    const ccx=Math.floor(player.x/span),ccy=Math.floor(player.y/span),ccz=Math.floor(player.z/span);
    const next=new Set(),queue=[];
    const rx=Math.max(1,this.settings.radiusXZ|0),ry=Math.max(1,this.settings.radiusY|0);
    for(let dy=-ry;dy<=ry;dy++)for(let dz=-rx;dz<=rx;dz++)for(let dx=-rx;dx<=rx;dx++){
      const cx=ccx+dx,cy=ccy+dy,cz=ccz+dz;
      if(this.terrain.chunkMayContainTerrain&&!this.terrain.chunkMayContainTerrain(cx,cy,cz))continue;
      const key=this.terrain.chunkKey(cx,cy,cz);
      next.add(key);
      const record=this.meshes.get(key);
      if(!record||record.version<0)queue.push({cx,cy,cz,d:dx*dx+dy*dy+dz*dz});
      else {record.mesh.visible=true;if(record.darknessMesh)record.darknessMesh.visible=true;}
    }
    queue.sort((a,b)=>a.d-b.d);
    const budget=Math.max(1,this.settings.maxBuildsPerFrame|0);
    for(let i=0;i<Math.min(budget,queue.length);i++){
      const q=queue[i],r=this._ensure(q.cx,q.cy,q.cz);r.mesh.visible=true;if(r.darknessMesh)r.darknessMesh.visible=true;
    }
    for(const [key,record] of [...this.meshes]){
      if(next.has(key))continue;
      this.root.remove(record.mesh);if(record.darknessMesh)this.root.remove(record.darknessMesh);record.mesh.geometry.dispose();this.meshes.delete(key);
      this.terrain.unloadChunk(record.cx,record.cy,record.cz);
    }
    this.visibleKeys=next;
  }
  setDebug(enabled){this.material.wireframe=!!enabled;this.material.needsUpdate=true}
  stats(){
    let visible=0,solid=0,quads=0,unitFaces=0,triangles=0;
    for(const key of this.visibleKeys){
      const r=this.meshes.get(key);if(!r?.mesh.visible)continue;visible++;
      const u=r.mesh.userData||{};solid+=u.solidVoxels||0;quads+=u.quads||0;unitFaces+=u.unitFaces||0;triangles+=u.triangles||0;
    }
    return {visibleChunks:visible,renderedSolidVoxels:solid,renderedSolidTiles:solid,renderedQuads:quads,representedUnitFaces:unitFaces,terrainTriangles:triangles,dimensions:3,infinite:true,blockGeometry:'3d-cube',texturePixels:this.texture?.image?.width||this.settings.texturePixels||128,greedyRatio:quads?unitFaces/quads:1,...this.terrain.stats()};
  }
  dispose(){
    this.unsubscribe?.();for(const r of this.meshes.values())r.mesh.geometry.dispose();
    this.texture.dispose();this.material.dispose();this.darknessMaterial.dispose();this.scene.remove(this.root);
  }
}
export class World3DEngine{
  constructor({THREE,host,content,onCameraChanged=null}){
    if(!THREE)throw new Error('THREE_REQUIRED');
    if(!host)throw new Error('THREE_HOST_REQUIRED');
    if(!window.PaperchalkTerrain)throw new Error('PAPERCHALK_TERRAIN_REQUIRED');
    this.THREE=THREE;this.host=host;this.content=content||{};
    this.terrain=window.PaperchalkTerrain;
    this.interactionRowZ=Number(this.content?.scene3d?.terrain?.interactionRowZ??0);
    this.onCameraChanged=typeof onCameraChanged==='function'?onCameraChanged:null;
    this.sceneData=this.content.scene3d||{};
    this.layers=this.sceneData.layers||{far:-8,rear:-3,terrain:0,actor:.45,front:2.5};
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x000000);
    this.camera=new THREE.PerspectiveCamera(42,1,.05,140);
    this.cameraRig={yaw:.72,pitch:.38,distance:12,minDistance:4,maxDistance:28,height:.65,fov:42};
    this.stageView={enabled:false,axis:'z',side:1};
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
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.className='three-world-canvas';
    this.renderer.domElement.setAttribute('aria-label','Paperchalk infinite 3D voxel world');
    this.renderer.domElement.tabIndex=0;this.renderer.domElement.style.touchAction='none';
    host.replaceChildren(this.renderer.domElement);
    this._buildStage();
    this._installCameraInput();
    this.resize();
  }
  _buildStage(){
    const THREE=this.THREE;

    // Outdoor lighting model:
    // direct sun + soft skylight/environment bounce + moonlight.
    // Covered caves keep only a small residual bounce so they remain dark without becoming unreadable.
    const sun=new THREE.DirectionalLight(0xfff0d2,3.4);
    sun.name='world-sun';
    sun.castShadow=true;
    sun.position.set(18,32,14);
    sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.near=.5;
    sun.shadow.camera.far=120;
    sun.shadow.camera.left=-32;sun.shadow.camera.right=32;
    sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;
    sun.shadow.bias=-0.0002;
    sun.shadow.normalBias=.025;
    this.scene.add(sun);
    this.scene.add(sun.target);

    const skyFill=new THREE.HemisphereLight(0xcfe6ff,0x5a4738,1.0);
    skyFill.name='sky-environment-bounce';
    this.scene.add(skyFill);

    const ambient=new THREE.AmbientLight(0x8090a6,.12);
    ambient.name='soft-global-bounce';
    this.scene.add(ambient);

    const moon=new THREE.DirectionalLight(0x8eb6ff,.0);
    moon.name='world-moon';
    moon.castShadow=true;
    moon.shadow.mapSize.set(1024,1024);
    moon.shadow.camera.near=.5;
    moon.shadow.camera.far=110;
    moon.shadow.camera.left=-28;moon.shadow.camera.right=28;
    moon.shadow.camera.top=28;moon.shadow.camera.bottom=-28;
    moon.shadow.bias=-0.00025;
    moon.shadow.normalBias=.02;
    this.scene.add(moon);
    this.scene.add(moon.target);

    const sunDisc=new THREE.Mesh(
      new THREE.SphereGeometry(2.6,24,16),
      new THREE.MeshBasicMaterial({color:0xffe49a,toneMapped:false,depthWrite:false})
    );
    sunDisc.name='visible-sun';
    sunDisc.renderOrder=-50;
    this.scene.add(sunDisc);

    const moonDisc=new THREE.Mesh(
      new THREE.SphereGeometry(1.8,20,14),
      new THREE.MeshBasicMaterial({color:0xdce7ff,toneMapped:false,depthWrite:false})
    );
    moonDisc.name='visible-moon';
    moonDisc.renderOrder=-50;
    this.scene.add(moonDisc);

    this.terrainLights={sun,skyFill,ambient,moon,sunDisc,moonDisc};

    this.backdrop=null;
    this.terrainRenderer=new TerrainChunkRenderer(THREE,this.terrain,this.scene,{
      radiusXZ:this.sceneData.terrain?.visibleChunkRadiusXZ??3,
      radiusY:this.sceneData.terrain?.visibleChunkRadiusY??2,
      maxBuildsPerFrame:this.sceneData.terrain?.maxBuildsPerFrame??5,
      texturePixels:this.sceneData.terrain?.texturePixels??this.terrain.pixelsPerMeter??128
    });

    const cursorGeometry=new THREE.BoxGeometry(
      this.terrain.tileSize*1.035,
      this.terrain.tileSize*1.035,
      this.terrain.tileSize*1.035
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
      const ground=def.grounded?this.terrain.highestGroundY(def.x,Number(def.z)||0):Number(def.y)||0;
      const entity=new PaperSpriteEntity(THREE,{
        ...def,y:ground,z:Number.isFinite(Number(def.z))?Number(def.z):0,seed:this._seedFromId(def.id)
      });
      this.paperEntities.push(entity);this.scene.add(entity.root);
    }
    const playerTexture=new THREE.TextureLoader().load('assets/player/protagonist.webp?v=voxel3d-r1');
    playerTexture.colorSpace=THREE.SRGBColorSpace;
    playerTexture.magFilter=THREE.LinearFilter;
    playerTexture.minFilter=THREE.LinearMipmapLinearFilter;
    playerTexture.generateMipmaps=true;
    this.playerSprite=new PaperSpriteEntity(THREE,{
      id:'player',kind:'player',label:'',x:0,y:0,z:0,
      width:1,height:2,anchorY:1,texture:playerTexture
    });
    this.healthBar=new WorldSpaceHealthBar(THREE,{max:10});
    this.playerSprite.root.add(this.healthBar.group);

    const torchRoot=new THREE.Group();
    torchRoot.name='player-hand-torch';
    torchRoot.position.set(.42,.15,.12);
    const torchStick=new THREE.Mesh(
      new THREE.BoxGeometry(.07,.55,.07),
      new THREE.MeshBasicMaterial({color:0x6b4429,toneMapped:false})
    );
    torchStick.position.y=-.14;
    const torchFlame=new THREE.Mesh(
      new THREE.SphereGeometry(.11,10,8),
      new THREE.MeshBasicMaterial({color:0xffb04d,toneMapped:false})
    );
    torchFlame.scale.set(.72,1.35,.72);
    torchFlame.position.y=.19;
    const torchLight=new THREE.PointLight(0xffa24f,0,10,1.7);
    torchLight.name='moving-torch-light';
    torchLight.position.set(0,.23,.05);
    torchLight.castShadow=false;
    torchRoot.add(torchStick,torchFlame,torchLight);
    torchRoot.visible=false;
    this.playerSprite.root.add(torchRoot);
    this.torch={root:torchRoot,flame:torchFlame,light:torchLight};

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
    const target=new this.THREE.Vector3(p.x,p.y,p.z);
    const k=1-Math.pow(.0003,Math.max(0,dt));this.playerSprite.root.position.lerp(target,k);
    this.playerSprite.root.rotation.y=this._stageYaw();
    if(Math.hypot(p.vx||0,p.vz||0)>.03)this.playerSprite.setFacing(1);
    this.playerSprite.update(dt);
    const mesh=this.playerSprite.mesh;
    if(p.action==='walk')mesh.position.y=Math.sin(performance.now()*.018)*.025;
    else mesh.position.y=0;
    const crouch=p.crouching?.72:1;mesh.scale.y+=(crouch-mesh.scale.y)*Math.min(1,dt*18);
    if(this.torch){
      const on=!!p.torchOn;
      this.torch.root.visible=on;
      if(on){
        const flicker=.92+Math.sin(performance.now()*.017)*.06+Math.sin(performance.now()*.041)*.03;
        this.torch.light.intensity=4.2*flicker;
        this.torch.light.distance=12;
        this.torch.flame.scale.set(.72,1.25+.18*Math.sin(performance.now()*.029),.72);
      }else this.torch.light.intensity=0;
    }
  }
  _updateCamera(dt,snapshot){
    const p=snapshot?.player;if(!p)return;
    const desiredTarget=new this.THREE.Vector3(p.x,p.y+this.cameraRig.height,p.z);
    const k=1-Math.pow(.0005,Math.max(0,dt));
    if(!this.cameraTargetSmooth.lengthSq())this.cameraTargetSmooth.copy(desiredTarget);else this.cameraTargetSmooth.lerp(desiredTarget,k);
    this.cameraTarget.copy(this.cameraTargetSmooth);
    let desired;
    if(this.stageView.enabled){
      desired=this.stageView.axis==='x'
        ?new this.THREE.Vector3(this.cameraTarget.x+this.stageView.side*this.cameraRig.distance,this.cameraTarget.y,this.cameraTarget.z)
        :new this.THREE.Vector3(this.cameraTarget.x,this.cameraTarget.y,this.cameraTarget.z+this.stageView.side*this.cameraRig.distance);
    }else{
      const cp=Math.cos(this.cameraRig.pitch);
      desired=new this.THREE.Vector3(
        this.cameraTarget.x+Math.sin(this.cameraRig.yaw)*cp*this.cameraRig.distance,
        this.cameraTarget.y+Math.sin(this.cameraRig.pitch)*this.cameraRig.distance,
        this.cameraTarget.z+Math.cos(this.cameraRig.yaw)*cp*this.cameraRig.distance
      );
    }
    this.camera.position.lerp(desired,k);this.camera.lookAt(this.cameraTarget);

  }
  _skyExposureAt(player){
    if(!player)return 1;
    const c=this.terrain.worldToCell(player.x,player.y,player.z);
    let roofDistance=Infinity;
    for(let dy=1;dy<=28;dy++){
      if(this.terrain.isSolidPeek(c.gx,c.gy+dy,c.gz)){roofDistance=dy;break}
    }
    if(!Number.isFinite(roofDistance))return 1;
    if(roofDistance<=2)return .12;
    if(roofDistance<=5)return .22;
    if(roofDistance<=10)return .38;
    return .58;
  }
  _updateWorldTime(snapshot){
    const minutes=Number(snapshot?.world?.minutes);if(!Number.isFinite(minutes))return;
    const n=((minutes%1440)+1440)%1440/1440;
    const angle=(n-.25)*Math.PI*2;
    const daylight=Math.max(0,Math.sin(angle));
    const night=Math.max(0,-Math.sin(angle));
    const twilight=Math.max(0,1-Math.abs(Math.sin(angle))*2.6);
    const p=snapshot?.player||this.lastSnapshot?.player||{x:0,y:0,z:0};
    const exposure=this._skyExposureAt(p);
    const localSurfaceY=(this.terrain.surfaceCell(Math.floor(p.x/this.terrain.tileSize),Math.floor(p.z/this.terrain.tileSize))+1)*this.terrain.tileSize;
    const undergroundDepth=Math.max(0,localSurfaceY-p.y);
    const undergroundFactor=Math.max(0,Math.min(1,(undergroundDepth-.35)/2.4));

    const daySky=new this.THREE.Color(0x9bd4f2);
    const duskSky=new this.THREE.Color(0x7c5876);
    const nightSky=new this.THREE.Color(0x0c1b31);
    const undergroundVoid=new this.THREE.Color(0x010203);
    let sky;
    if(daylight>.08)sky=nightSky.clone().lerp(daySky,Math.min(1,.22+daylight*.95));
    else if(twilight>.08)sky=nightSky.clone().lerp(duskSky,Math.min(1,twilight*.72));
    else sky=nightSky.clone();
    // Non-interaction rows intentionally have no underground volume. When the
    // player descends below the local surface, fade the world background to an
    // almost-black void so missing scenery shells never look like blue sky.
    sky.lerp(undergroundVoid,undergroundFactor);
    this.scene.background.copy(sky);

    const sun=this.terrainLights?.sun,skyFill=this.terrainLights?.skyFill,ambient=this.terrainLights?.ambient,moon=this.terrainLights?.moon;
    const sunDisc=this.terrainLights?.sunDisc,moonDisc=this.terrainLights?.moonDisc;
    const radius=42;
    const sx=Math.cos(angle)*radius;
    const sy=Math.max(6,Math.abs(Math.sin(angle))*radius);
    const sz=22;

    if(sun){
      sun.intensity=daylight*3.4*(1-undergroundFactor*.92);
      sun.position.set(p.x+sx,p.y+sy,p.z+sz);
      sun.target.position.set(p.x,p.y-2,p.z);
      sun.target.updateMatrixWorld();
    }
    if(skyFill){
      const outdoor=.62+daylight*1.05+twilight*.28+night*.18;
      const underground=.12+night*.06;
      const exposed=underground+(outdoor-underground)*exposure;
      skyFill.intensity=exposed*(1-undergroundFactor*.62);
    }
    if(ambient){
      ambient.intensity=(.10+daylight*.11+night*.07)*(1-undergroundFactor*.45);
    }
    if(moon){
      moon.intensity=night*.72*Math.max(.35,exposure)*(1-undergroundFactor*.88);
      moon.position.set(p.x-sx,p.y+Math.max(10,sy*.8),p.z-sz*.7);
      moon.target.position.set(p.x,p.y-1,p.z);
      moon.target.updateMatrixWorld();
    }
    if(sunDisc){
      sunDisc.visible=daylight>.02&&undergroundFactor<.15;
      sunDisc.position.set(p.x+sx*1.55,p.y+sy*1.55,p.z+sz*1.55);
      sunDisc.scale.setScalar(.8+daylight*.35);
    }
    if(moonDisc){
      moonDisc.visible=night>.03&&undergroundFactor<.15;
      moonDisc.position.set(p.x-sx*1.45,p.y+Math.max(14,sy*1.2),p.z-sz*1.1);
    }
    this.skyExposure=exposure;
    this.undergroundDepth=undergroundDepth;
    this.undergroundFactor=undergroundFactor;
  }
  update(dt,snapshot=this.lastSnapshot){
    if(snapshot)this.lastSnapshot=snapshot;
    const current=this.lastSnapshot;
    this._updatePlayer(dt,current);this._updateCamera(dt,current);this._updateWorldTime(current);
    const p=current?.player;
    this.terrainRenderer.update(p,{torchOn:!!p?.torchOn,time:performance.now()/1000});
    this.healthBar?.update(this.camera,dt);
  }
  render(){this.renderer.render(this.scene,this.camera)}
  _screenRay(clientX,clientY){
    const rect=this.renderer.domElement.getBoundingClientRect();
    const ndc=new this.THREE.Vector2(((clientX-rect.left)/Math.max(1,rect.width))*2-1,-((clientY-rect.top)/Math.max(1,rect.height))*2+1);
    const ray=new this.THREE.Raycaster();ray.setFromCamera(ndc,this.camera);return ray.ray;
  }
  _raycastVoxel(ray,maxDistance=8,{interactionOnly=false}={}){
    const s=this.terrain.tileSize,origin=ray.origin.clone().multiplyScalar(1/s),dir=ray.direction.clone();
    let x=Math.floor(origin.x),y=Math.floor(origin.y),z=Math.floor(origin.z);
    const sx=dir.x>0?1:dir.x<0?-1:0,sy=dir.y>0?1:dir.y<0?-1:0,sz=dir.z>0?1:dir.z<0?-1:0;
    const inf=Infinity;
    const dx=sx?Math.abs(1/dir.x):inf,dy=sy?Math.abs(1/dir.y):inf,dz=sz?Math.abs(1/dir.z):inf;
    let tx=sx>0?(x+1-origin.x)*dx:sx<0?(origin.x-x)*dx:inf;
    let ty=sy>0?(y+1-origin.y)*dy:sy<0?(origin.y-y)*dy:inf;
    let tz=sz>0?(z+1-origin.z)*dz:sz<0?(origin.z-z)*dz:inf;
    let px=x,py=y,pz=z,dist=0;
    for(let i=0;i<512&&dist*s<=maxDistance;i++){
      const tile=this.terrain.peekVoxel(x,y,z);
      const solid=this.terrain.isSolidTile(tile);
      const interactable=!interactionOnly||z===this.interactionRowZ;
      if(solid&&interactable)return {gx:x,gy:y,gz:z,tile,previous:{gx:px,gy:py,gz:pz},distance:dist*s};
      px=x;py=y;pz=z;
      if(tx<ty&&tx<tz){x+=sx;dist=tx;tx+=dx}
      else if(ty<tz){y+=sy;dist=ty;ty+=dy}
      else{z+=sz;dist=tz;tz+=dz}
    }
    return null;
  }
  screenToWorld(clientX,clientY){
    const hit=this._raycastVoxel(this._screenRay(clientX,clientY),10,{interactionOnly:true});
    if(!hit)return null;
    return this.terrain.cellCenter(hit.gx,hit.gy,hit.gz);
  }
  screenToTerrainCell(clientX,clientY,{showCursor=true}={}){
    const hit=this._raycastVoxel(this._screenRay(clientX,clientY),10,{interactionOnly:true});
    if(!hit){if(this.terrainCursor)this.terrainCursor.visible=false;return null}
    const center=this.terrain.cellCenter(hit.gx,hit.gy,hit.gz);
    const previousOnRow=hit.previous.gz===this.interactionRowZ;
    const placeCell=previousOnRow?hit.previous:{gx:hit.gx,gy:hit.gy+1,gz:this.interactionRowZ};
    const place=this.terrain.cellCenter(placeCell.gx,placeCell.gy,placeCell.gz);
    const result={...center,gx:hit.gx,gy:hit.gy,gz:hit.gz,tile:hit.tile,solid:true,interactionRowZ:this.interactionRowZ,placeGx:placeCell.gx,placeGy:placeCell.gy,placeGz:placeCell.gz,placeX:place.x,placeY:place.y,placeZ:place.z,distance:hit.distance};
    if(showCursor&&this.terrainCursor){this.terrainCursor.position.set(center.x,center.y,center.z);this.terrainCursor.visible=true}
    return result;
  }

  hideTerrainCursor(){
    if(this.terrainCursor)this.terrainCursor.visible=false;
  }
  stats(){
    const info=this.renderer.info?.render||{};
    return {
      renderer:this.renderer.constructor?.name||'WebGLRenderer',
      worldMode:'infinite-voxel-3d',
      terrainMode:'streamed-3d-voxel-chunks',
      entityMode:'paper-sprites-in-3d',
      drawCalls:Number(info.calls)||0,triangles:Number(info.triangles)||0,
      sceneChildren:this.scene.children.length,pixelRatio:this.pixelRatio,
      health:this.healthBar?.snapshot()||null,camera:this.cameraConfig(),stageView:{...this.stageView},
      debugColliders:this.debugColliders,terrain:this.terrainRenderer.stats(),
      lighting:{mode:'sun-sky-moon-torch',skyExposure:this.skyExposure??1,undergroundDepth:this.undergroundDepth??0,undergroundFactor:this.undergroundFactor??0,undergroundBackground:'near-black',visibleSun:!!this.terrainLights?.sunDisc?.visible,visibleMoon:!!this.terrainLights?.moonDisc?.visible,sunIntensity:this.terrainLights?.sun?.intensity??0,skyFillIntensity:this.terrainLights?.skyFill?.intensity??0,ambientIntensity:this.terrainLights?.ambient?.intensity??0,moonIntensity:this.terrainLights?.moon?.intensity??0,torchOn:!!this.torch?.root?.visible,torchIntensity:this.torch?.light?.intensity??0,shadows:this.renderer.shadowMap.enabled},
      interaction:{rowZ:this.interactionRowZ,raycastIgnoresOtherRows:true},
      undergroundOcclusion:{mode:'terraria-style-black-mask',torchRevealRadius:9.5,playerRevealRadius:1.45},
      paperEntities:this.paperEntities.length+1,playerGeometry:'PlaneGeometry',
      playerTextureSize:{width:this.playerSprite?.texture?.image?.naturalWidth||this.playerSprite?.texture?.image?.width||0,height:this.playerSprite?.texture?.image?.naturalHeight||this.playerSprite?.texture?.image?.height||0},
      terrainBlockGeometry:'3-axis greedy voxel BufferGeometry'
    };
  }
  dispose(){
    this.terrainRenderer?.dispose();
    if(this.terrainCursor){
      this.terrainCursor.geometry.dispose();
      this.terrainCursor.material.dispose();
    }
    if(this.torch){
      this.torch.root.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.()});
    }
    this.playerSprite?.dispose();for(const entity of this.paperEntities)entity.dispose();
    this.renderer.dispose();this.host.replaceChildren();
  }
}
