export class EcologyRenderer{
  constructor(THREE,terrain,scene,{mobile=false}={}){
    this.THREE=THREE;this.terrain=terrain;this.scene=scene;this.mobile=mobile;
    this.radius=mobile?30:42;this.step=4;this.anchorX=Infinity;this.anchorZ=Infinity;
    this.root=new THREE.Group();this.root.name='procedural-paper-ecology';scene.add(this.root);
    this.capacity=mobile?90:180;this.dummy=new THREE.Object3D();
    this.geometry=this._crossCardGeometry();
    this.meshes={
      deciduous:this._mesh(0x4f744d),
      pine:this._mesh(0x3f6350),
      shrub:this._mesh(0x71845b),
      rock:this._mesh(0x77746d)
    };
    for(const m of Object.values(this.meshes))this.root.add(m);
    this.statsState={active:0,drawCalls:0};
  }
  _crossCardGeometry(){
    const T=this.THREE;
    const p=[
      -.5,0,0, .5,0,0, .5,1,0, -.5,1,0,
      0,0,-.5, 0,0,.5, 0,1,.5, 0,1,-.5
    ];
    const idx=[0,1,2,0,2,3,4,5,6,4,6,7];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
  }
  _mesh(color){
    const T=this.THREE,mat=new T.MeshStandardMaterial({color,roughness:.96,metalness:0,side:T.DoubleSide,flatShading:true});
    const mesh=new T.InstancedMesh(this.geometry,mat,this.capacity);mesh.count=0;mesh.castShadow=!this.mobile;mesh.receiveShadow=true;return mesh;
  }
  _hash(x,z,salt=0){
    let h=(Math.imul((x|0)^salt,0x45d9f3b)+Math.imul((z|0)^0x9e3779b9,0x27d4eb2d))|0;
    h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;return (h>>>0)/4294967295;
  }
  _place(kind,i,x,y,z,scale,rot){
    const m=this.meshes[kind];if(!m||i>=this.capacity)return false;
    this.dummy.position.set(x,y,z);this.dummy.rotation.set(0,rot,0);this.dummy.scale.set(scale.x,scale.y,scale.z);this.dummy.updateMatrix();m.setMatrixAt(i,this.dummy.matrix);return true;
  }
  rebuild(player){
    const snap=8,ax=Math.round(player.x/snap)*snap,az=Math.round(player.z/snap)*snap;
    if(Math.abs(ax-this.anchorX)<snap&&Math.abs(az-this.anchorZ)<snap)return;
    this.anchorX=ax;this.anchorZ=az;
    const counts={deciduous:0,pine:0,shrub:0,rock:0},s=this.terrain.tileSize;
    for(let dz=-this.radius;dz<=this.radius;dz+=this.step)for(let dx=-this.radius;dx<=this.radius;dx+=this.step){
      const wx=ax+dx,wz=az+dz,gx=Math.floor(wx/s),gz=Math.floor(wz/s+.5),p=this.terrain.terrainProfile(gx,gz);
      if(p.height<this.terrain.seaLevel||Math.abs(dx)<3&&Math.abs(dz)<3)continue;
      const h=this._hash(gx,gz,113),r=this._hash(gx,gz,229),y=(p.height+1)*s;
      let kind=null,prob=0;
      if(p.biome==='forest'){kind='deciduous';prob=.55}
      else if(p.biome==='pine-forest'){kind='pine';prob=.62}
      else if(p.biome==='meadow'){kind='shrub';prob=.18}
      else if(p.biome==='marsh'){kind='shrub';prob=.26}
      else if(p.biome==='alpine'||p.biome==='snowfield'||p.landform==='cliff'){kind='rock';prob=.28}
      if(!kind||h>prob||counts[kind]>=this.capacity)continue;
      const tall=kind==='deciduous'||kind==='pine',sc=.75+r*.55;
      const scale=tall?{x:2.2*sc,y:4.2*sc,z:2.2*sc}:kind==='rock'?{x:1.4*sc,y:1.15*sc,z:1.4*sc}:{x:1.25*sc,y:1.35*sc,z:1.25*sc};
      this._place(kind,counts[kind]++,wx+(r-.5)*1.8,y,wz+(h-.5)*1.8,scale,r*Math.PI);
    }
    let active=0,drawCalls=0;
    for(const [kind,m] of Object.entries(this.meshes)){m.count=counts[kind];m.instanceMatrix.needsUpdate=true;active+=m.count;if(m.count)drawCalls++}
    this.statsState={active,drawCalls,counts,mode:'instanced-paper-ecology',rebuildDistance:snap,radius:this.radius};
  }
  update(player){if(player)this.rebuild(player)}
  stats(){return this.statsState}
  dispose(){for(const m of Object.values(this.meshes)){this.root.remove(m);m.material.dispose()}this.geometry.dispose();this.scene.remove(this.root)}
}
