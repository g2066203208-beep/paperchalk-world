/* Side-view paper-stage backdrop.
 * Distant terrain is rendered as fixed-depth silhouette layers behind the
 * one-voxel gameplay row. It must never form an X/Z heightfield that can
 * intersect the camera or gameplay terrain.
 */
export class FarTerrainRenderer{
  constructor(THREE,terrain,scene,{mobile=false}={}){
    this.THREE=THREE;this.terrain=terrain;this.scene=scene;this.mobile=mobile;
    this.radius=mobile?110:155;this.step=mobile?5:4;this.anchorX=Infinity;
    this.root=new THREE.Group();this.root.name='paper-stage-distant-landscape';scene.add(this.root);
    this.layers=[
      this._makeLayer({z:-18,color:0x647781,opacity:.62,sampleOffset:36,heightScale:.78}),
      this._makeLayer({z:-30,color:0x7b8d95,opacity:.48,sampleOffset:88,heightScale:.63}),
      this._makeLayer({z:-46,color:0x92a1a7,opacity:.34,sampleOffset:157,heightScale:.50})
    ];
    this.lastBuild={mode:'layered-paper-backdrop',layers:this.layers.length,segments:0,samples:0};
  }
  _makeLayer({z,color,opacity,sampleOffset,heightScale}){
    const mat=new this.THREE.MeshBasicMaterial({
      color,transparent:true,opacity,depthWrite:false,depthTest:true,
      fog:true,side:this.THREE.DoubleSide,toneMapped:false
    });
    const mesh=new this.THREE.Mesh(new this.THREE.BufferGeometry(),mat);
    mesh.position.z=z;mesh.renderOrder=-30;mesh.frustumCulled=false;
    this.root.add(mesh);
    return {mesh,z,sampleOffset,heightScale};
  }
  _profile(wx,offset){
    const s=this.terrain.tileSize;
    const gx=Math.floor(wx/s),gz=this.terrain.interactionRowZ+offset;
    return this.terrain.terrainProfile(gx,gz);
  }
  rebuild(player){
    if(!player)return;
    const snap=12,ax=Math.round(player.x/snap)*snap;
    if(Math.abs(ax-this.anchorX)<snap)return;
    this.anchorX=ax;
    let totalSegments=0,totalSamples=0;
    const baseY=Math.min(-18,player.y-28),r=this.radius,step=this.step,s=this.terrain.tileSize;
    for(const layer of this.layers){
      const P=[],I=[];let seg=0,samples=0;
      let prev=null;
      for(let x=-r;x<=r;x+=step){
        const wx=ax+x,p=this._profile(wx,layer.sampleOffset),raw=(p.height+1)*s;
        // Compress distant relief so it reads like painted mountains instead of
        // another playable voxel surface.
        const y=baseY+(raw-baseY)*layer.heightScale;
        const point={x:wx,y};samples++;
        if(prev){
          const base=P.length/3;
          P.push(prev.x,prev.y,0, point.x,point.y,0, point.x,baseY,0, prev.x,baseY,0);
          I.push(base,base+1,base+2,base,base+2,base+3);seg++;
        }
        prev=point;
      }
      const g=new this.THREE.BufferGeometry();
      g.setAttribute('position',new this.THREE.Float32BufferAttribute(P,3));g.setIndex(I);
      if(P.length)g.computeBoundingSphere();
      const old=layer.mesh.geometry;layer.mesh.geometry=g;old.dispose();
      totalSegments+=seg;totalSamples+=samples;
    }
    this.lastBuild={mode:'layered-paper-backdrop',layers:this.layers.length,segments:totalSegments,samples:totalSamples,radius:r,step,fixedDepth:true,gameplayIntersection:false};
  }
  update(player){this.rebuild(player)}
  stats(){return {...this.lastBuild}}
  dispose(){
    for(const layer of this.layers){this.root.remove(layer.mesh);layer.mesh.geometry.dispose();layer.mesh.material.dispose()}
    this.scene.remove(this.root);
  }
}
