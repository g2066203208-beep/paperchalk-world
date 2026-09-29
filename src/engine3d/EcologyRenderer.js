export class EcologyRenderer{
  constructor(THREE,terrain,scene,{mobile=false}={}){
    this.THREE=THREE;this.terrain=terrain;this.scene=scene;this.mobile=mobile;
    this.radius=mobile?30:42;this.step=4;this.anchorX=Infinity;this.anchorZ=Infinity;
    this.root=new THREE.Group();this.root.name='procedural-paper-ecology';scene.add(this.root);
    this.capacity=mobile?90:180;this.dummy=new THREE.Object3D();
    this.cardGeometry=this._crossCardGeometry();
    this.rockGeometry=new THREE.IcosahedronGeometry(.58,0);
    this.textures={
      deciduous:this._paperTexture('deciduous'),
      pine:this._paperTexture('pine'),
      shrub:this._paperTexture('shrub')
    };
    this.meshes={
      deciduous:this._cardMesh('deciduous',0xffffff),
      pine:this._cardMesh('pine',0xffffff),
      shrub:this._cardMesh('shrub',0xffffff),
      rock:this._rockMesh()
    };
    for(const m of Object.values(this.meshes))this.root.add(m);
    this.statsState={active:0,drawCalls:0};
  }
  _crossCardGeometry(){
    const T=this.THREE;
    const p=[-.5,0,0,.5,0,0,.5,1,0,-.5,1,0, 0,0,-.5,0,0,.5,0,1,.5,0,1,-.5];
    const uv=[0,0,1,0,1,1,0,1, 0,0,1,0,1,1,0,1];
    const idx=[0,1,2,0,2,3,4,5,6,4,6,7];
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(p,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.setIndex(idx);g.computeVertexNormals();return g;
  }
  _paperTexture(kind){
    const T=this.THREE,canvas=document.createElement('canvas');canvas.width=128;canvas.height=192;
    const c=canvas.getContext('2d');c.clearRect(0,0,128,192);
    const chalk=(x,y,r,color,seed)=>{
      for(let i=0;i<9;i++){
        const a=(i*2.399+seed)*1.7,rr=r*(.72+((i*37+seed*13)%29)/100);
        c.globalAlpha=.16+(i%4)*.055;c.fillStyle=color;c.beginPath();
        c.arc(x+Math.cos(a)*r*.18,y+Math.sin(a)*r*.13,rr,0,Math.PI*2);c.fill();
      }
      c.globalAlpha=1;
    };
    if(kind==='deciduous'){
      c.fillStyle='#60452f';c.fillRect(57,104,14,77);
      chalk(64,84,39,'#557c4e',1);chalk(42,90,27,'#668957',2);chalk(85,93,28,'#486f48',3);chalk(65,57,30,'#718f5a',4);
    }else if(kind==='pine'){
      c.fillStyle='#59432f';c.fillRect(59,116,11,66);
      const tri=(y,w,h,col)=>{c.fillStyle=col;c.beginPath();c.moveTo(64,y);c.lineTo(64-w*.5,y+h);c.lineTo(64+w*.5,y+h);c.closePath();c.fill()};
      tri(20,60,72,'#3f674f');tri(51,83,80,'#496f53');tri(82,98,78,'#365d49');
      c.globalAlpha=.16;for(let i=0;i<70;i++){c.fillStyle='#dfe5c5';c.fillRect(18+(i*37)%94,50+(i*53)%85,1.4,1.4)}c.globalAlpha=1;
    }else{
      chalk(64,131,42,'#71875c',7);chalk(39,139,27,'#607a54',8);chalk(91,140,25,'#81946a',9);
      c.fillStyle='#5d4937';c.fillRect(61,150,6,31);
    }
    // Chalk-cut paper edge.
    c.globalCompositeOperation='source-atop';c.globalAlpha=.12;c.fillStyle='#fff8df';
    for(let i=0;i<220;i++)c.fillRect((i*47)%128,(i*83)%188,1+(i%3===0),1);
    c.globalAlpha=1;c.globalCompositeOperation='source-over';
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
    tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;return tex;
  }
  _cardMesh(kind,color){
    const T=this.THREE,mat=new T.MeshStandardMaterial({
      map:this.textures[kind],color,transparent:true,alphaTest:.18,depthWrite:true,
      roughness:.98,metalness:0,side:T.DoubleSide,flatShading:true
    });
    const mesh=new T.InstancedMesh(this.cardGeometry,mat,this.capacity);mesh.count=0;
    mesh.castShadow=!this.mobile;mesh.receiveShadow=true;return mesh;
  }
  _rockMesh(){
    const T=this.THREE,mat=new T.MeshStandardMaterial({color:0x77746d,roughness:1,metalness:0,flatShading:true});
    const mesh=new T.InstancedMesh(this.rockGeometry,mat,this.capacity);mesh.count=0;mesh.castShadow=!this.mobile;mesh.receiveShadow=true;return mesh;
  }
  _hash(x,z,salt=0){
    let h=(Math.imul((x|0)^salt,0x45d9f3b)+Math.imul((z|0)^0x9e3779b9,0x27d4eb2d))|0;
    h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;return (h>>>0)/4294967295;
  }
  _place(kind,i,x,y,z,scale,rot){
    const m=this.meshes[kind];if(!m||i>=this.capacity)return false;
    this.dummy.position.set(x,y,z);this.dummy.rotation.set(0,rot,0);this.dummy.scale.set(scale.x,scale.y,scale.z);
    this.dummy.updateMatrix();m.setMatrixAt(i,this.dummy.matrix);return true;
  }
  rebuild(player){
    const snap=8,ax=Math.round(player.x/snap)*snap;
    if(Math.abs(ax-this.anchorX)<snap)return;
    this.anchorX=ax;this.anchorZ=this.terrain.interactionRowZ;
    const counts={deciduous:0,pine:0,shrub:0,rock:0},s=this.terrain.tileSize;
    const stageZ=this.terrain.interactionRowZ*s-.16;
    for(let dx=-this.radius;dx<=this.radius;dx+=this.step){
      const wx=ax+dx,gx=Math.floor(wx/s),gz=this.terrain.interactionRowZ,p=this.terrain.terrainProfile(gx,gz);
      if(p.height<this.terrain.seaLevel||Math.abs(dx)<3)continue;
      const h=this._hash(gx,gz,113),r=this._hash(gx,gz,229),y=(p.height+1)*s;
      let kind=null,prob=0;
      if(p.biome==='forest'){kind='deciduous';prob=.58}
      else if(p.biome==='pine-forest'){kind='pine';prob=.64}
      else if(p.biome==='meadow'){kind='shrub';prob=.16}
      else if(p.biome==='marsh'){kind='shrub';prob=.24}
      else if(p.biome==='alpine'||p.biome==='snowfield'||p.landform==='cliff'){kind='rock';prob=.30}
      if(!kind||h>prob||counts[kind]>=this.capacity)continue;
      const tall=kind==='deciduous'||kind==='pine',sc=.82+r*.45;
      const scale=tall?{x:2.0*sc,y:3.9*sc,z:2.0*sc}:kind==='rock'?{x:1.18*sc,y:.88*sc,z:.9*sc}:{x:1.22*sc,y:1.35*sc,z:1.22*sc};
      this._place(kind,counts[kind]++,wx+(r-.5)*1.25,y,stageZ,scale,0);
    }
    let active=0,drawCalls=0;
    for(const [kind,m] of Object.entries(this.meshes)){
      m.count=counts[kind];m.instanceMatrix.needsUpdate=true;active+=m.count;if(m.count)drawCalls++;
    }
    this.statsState={active,drawCalls,counts,mode:'instanced-paper-ecology',paperTextures:true,stageLocked:true,rebuildDistance:snap,radius:this.radius};
  }
  update(player){if(player)this.rebuild(player)}
  stats(){return this.statsState}
  dispose(){
    for(const m of Object.values(this.meshes)){this.root.remove(m);m.material.dispose()}
    for(const t of Object.values(this.textures))t.dispose();
    this.cardGeometry.dispose();this.rockGeometry.dispose();this.scene.remove(this.root);
  }
}
