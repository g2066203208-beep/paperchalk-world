export class FarTerrainRenderer{
  constructor(THREE,terrain,scene,{mobile=false}={}){
    this.THREE=THREE;this.terrain=terrain;this.scene=scene;this.mobile=mobile;
    this.radius=mobile?180:300;this.inner=44;this.step=mobile?14:12;this.anchorX=Infinity;this.anchorZ=Infinity;
    this.material=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true,fog:true,side:THREE.FrontSide});
    this.mesh=new THREE.Mesh(new THREE.BufferGeometry(),this.material);
    this.mesh.name='far-terrain-lod-ring';this.mesh.castShadow=false;this.mesh.receiveShadow=false;this.mesh.renderOrder=-2;
    this.scene.add(this.mesh);this.lastBuild={quads:0,triangles:0};
  }
  _color(profile){
    const T=this.THREE,c=new T.Color();
    const b=profile.biome,l=profile.landform;
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
  _sample(wx,wz){
    const s=this.terrain.tileSize,gx=Math.floor(wx/s),gz=Math.floor(wz/s+.5),p=this.terrain.terrainProfile(gx,gz);
    return {x:wx,y:(p.height+1)*s-.10,z:wz,p};
  }
  rebuild(player){
    if(!player)return;
    const snap=this.step*2,ax=Math.round(player.x/snap)*snap,az=Math.round(player.z/snap)*snap;
    if(Math.abs(ax-this.anchorX)<snap&&Math.abs(az-this.anchorZ)<snap)return;
    this.anchorX=ax;this.anchorZ=az;
    const P=[],C=[],I=[],step=this.step,r=this.radius,inner=this.inner,T=this.THREE;
    let quads=0;
    for(let z=-r;z<r;z+=step)for(let x=-r;x<r;x+=step){
      const cx=x+step*.5,cz=z+step*.5;
      if(Math.abs(cx)<inner&&Math.abs(cz)<inner)continue;
      const a=this._sample(ax+x,az+z),b=this._sample(ax+x+step,az+z),c=this._sample(ax+x+step,az+z+step),d=this._sample(ax+x,az+z+step);
      const base=P.length/3;
      for(const v of [a,b,c,d]){
        P.push(v.x,v.y,v.z);
        const col=this._color(v.p);C.push(col.r,col.g,col.b);
      }
      I.push(base,base+1,base+2,base,base+2,base+3);quads++;
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(P,3));
    g.setAttribute('color',new T.Float32BufferAttribute(C,3));
    g.setIndex(I);g.computeVertexNormals();g.computeBoundingSphere();
    const old=this.mesh.geometry;this.mesh.geometry=g;old.dispose();
    this.lastBuild={quads,triangles:quads*2,step,radius:r,innerRadius:inner};
  }
  update(player){this.rebuild(player)}
  stats(){return {...this.lastBuild,mode:'coarse-heightfield-ring',shadowless:true}}
  dispose(){this.scene.remove(this.mesh);this.mesh.geometry.dispose();this.material.dispose()}
}
