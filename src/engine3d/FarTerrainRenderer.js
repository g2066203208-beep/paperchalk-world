export class FarTerrainRenderer{
  constructor(THREE,terrain,scene,{mobile=false}={}){
    this.THREE=THREE;this.terrain=terrain;this.scene=scene;this.mobile=mobile;
    this.radius=mobile?160:240;this.inner=38;this.step=mobile?20:16;
    this.anchorX=Infinity;this.anchorZ=Infinity;
    this.material=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true,fog:true,side:THREE.FrontSide});
    this.mesh=new THREE.Mesh(new THREE.BufferGeometry(),this.material);
    this.mesh.name='far-terrain-lod-ring';this.mesh.castShadow=false;this.mesh.receiveShadow=false;this.mesh.renderOrder=-2;
    this.scene.add(this.mesh);this.lastBuild={quads:0,triangles:0,samples:0};
  }
  _color(profile){
    const c=new this.THREE.Color(),b=profile.biome,l=profile.landform;
    if(b==='ocean')return c.setHex(0x756e61);
    if(b==='beach')return c.setHex(0xcab986);
    if(b==='snowfield')return c.setHex(0xd8ded9);
    if(b==='alpine'||l==='cliff')return c.setHex(0x77736c);
    if(b==='pine-forest')return c.setHex(0x536d57);
    if(b==='forest')return c.setHex(0x66805a);
    if(b==='dry-steppe')return c.setHex(0xa88f63);
    if(b==='claylands')return c.setHex(0x9a6c55);
    if(b==='marsh')return c.setHex(0x65785a);
    return c.setHex(0x789364);
  }
  rebuild(player){
    if(!player)return;
    const snap=this.step*2,ax=Math.round(player.x/snap)*snap,az=Math.round(player.z/snap)*snap;
    if(Math.abs(ax-this.anchorX)<snap&&Math.abs(az-this.anchorZ)<snap)return;
    this.anchorX=ax;this.anchorZ=az;

    // Shared grid vertices: each terrain profile is sampled once, rather than
    // four times per quad. This removes the largest first-frame CPU spike.
    const T=this.THREE,s=this.terrain.tileSize,step=this.step,r=this.radius;
    const cells=Math.ceil((r*2)/step),vertsPerSide=cells+1;
    const P=new Float32Array(vertsPerSide*vertsPerSide*3);
    const C=new Float32Array(vertsPerSide*vertsPerSide*3);
    let samples=0;
    for(let j=0;j<vertsPerSide;j++)for(let i=0;i<vertsPerSide;i++){
      const wx=ax-r+i*step,wz=az-r+j*step;
      const gx=Math.floor(wx/s),gz=Math.floor(wz/s+.5),profile=this.terrain.terrainProfile(gx,gz);
      const k=(j*vertsPerSide+i)*3,col=this._color(profile);
      P[k]=wx;P[k+1]=(profile.height+1)*s-.10;P[k+2]=wz;
      C[k]=col.r;C[k+1]=col.g;C[k+2]=col.b;samples++;
    }

    const indices=[];let quads=0;
    for(let j=0;j<cells;j++)for(let i=0;i<cells;i++){
      const cx=-r+(i+.5)*step,cz=-r+(j+.5)*step;
      if(Math.abs(cx)<this.inner&&Math.abs(cz)<this.inner)continue;
      const a=j*vertsPerSide+i,b=a+1,d=(j+1)*vertsPerSide+i,c=d+1;
      indices.push(a,b,c,a,c,d);quads++;
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(P,3));
    g.setAttribute('color',new T.BufferAttribute(C,3));
    g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
    const old=this.mesh.geometry;this.mesh.geometry=g;old.dispose();
    this.lastBuild={quads,triangles:quads*2,samples,step,radius:r,innerRadius:this.inner};
  }
  update(player){this.rebuild(player)}
  stats(){return {...this.lastBuild,mode:'coarse-heightfield-ring',sharedVertexSampling:true,shadowless:true}}
  dispose(){this.scene.remove(this.mesh);this.mesh.geometry.dispose();this.material.dispose()}
}
