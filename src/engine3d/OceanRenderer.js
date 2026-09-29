export class OceanRenderer{
  constructor(THREE,terrain,scene,{mobile=false}={}){
    this.THREE=THREE;this.terrain=terrain;this.scene=scene;this.time=0;this.weather='clear';this.mobile=mobile;
    this.radius=mobile?110:180;this.step=mobile?2:1;this.anchorX=Infinity;
    this.geometry=new THREE.BufferGeometry();
    this.material=new THREE.MeshStandardMaterial({
      color:0x4b9fbd,transparent:true,opacity:.66,depthWrite:false,
      metalness:0,roughness:.24,side:THREE.DoubleSide,fog:true
    });
    this.uniforms={time:{value:0},amplitude:{value:.065},wind:{value:.28}};
    this.material.onBeforeCompile=shader=>{
      shader.uniforms.uOceanTime=this.uniforms.time;
      shader.uniforms.uOceanAmplitude=this.uniforms.amplitude;
      shader.uniforms.uOceanWind=this.uniforms.wind;
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nuniform float uOceanTime; uniform float uOceanAmplitude; uniform float uOceanWind;')
        .replace('#include <begin_vertex>',`#include <begin_vertex>
          float topMask=smoothstep(.55,.95,normal.y);
          float w1=sin(position.x*.72+uOceanTime*1.35);
          float w2=sin(position.x*.29-uOceanTime*.78);
          transformed.y += (w1*.65+w2*.35)*uOceanAmplitude*(1.0+uOceanWind*.18)*topMask;`);
      this.shader=shader;
    };
    this.mesh=new THREE.Mesh(this.geometry,this.material);
    this.mesh.name='analytic-ocean-stage-strip';this.mesh.receiveShadow=true;this.mesh.castShadow=false;this.mesh.renderOrder=24;
    this.scene.add(this.mesh);this.statsState={quads:0,samples:0};
  }
  _profile(wx){
    const s=this.terrain.tileSize,gx=Math.floor(wx/s),gz=this.terrain.interactionRowZ;
    return this.terrain.terrainProfile(gx,gz);
  }
  _isOceanProfile(p){
    return p.biome==='ocean'||p.landform==='deep-ocean'||p.landform==='shallow-sea';
  }
  rebuild(player){
    if(!player)return;
    const snap=8,ax=Math.round(player.x/snap)*snap;
    if(Math.abs(ax-this.anchorX)<snap)return;
    this.anchorX=ax;
    const P=[],I=[],r=this.radius,st=this.step,s=this.terrain.tileSize,top=this.terrain.seaSurfaceY?.()??0;
    const z0=this.terrain.interactionRowZ*s-s*.5,z1=z0+s,front=z1+.006;
    let q=0,samples=0,columns=0;
    const push=(a,b,c,d)=>{
      const base=P.length/3;for(const v of [a,b,c,d])P.push(v[0],v[1],v[2]);
      I.push(base,base+1,base+2,base,base+2,base+3);q++;
    };
    for(let x=-r;x<r;x+=st){
      const x0=ax+x,x1=x0+st,p=this._profile(x0+st*.5);samples++;
      if(!this._isOceanProfile(p))continue;
      const bottom=(p.height+1)*s;
      if(bottom>=top-.01)continue;
      columns++;
      // Front face is what the side-view camera reads as the ocean body.
      push([x0,bottom,front],[x1,bottom,front],[x1,top,front],[x0,top,front]);
      // One-voxel-deep top surface preserves the real 3D slab thickness.
      push([x0,top,z0],[x1,top,z0],[x1,top,z1],[x0,top,z1]);
    }
    const g=new this.THREE.BufferGeometry();
    g.setAttribute('position',new this.THREE.Float32BufferAttribute(P,3));g.setIndex(I);
    if(P.length){g.computeVertexNormals();g.computeBoundingSphere()}
    const old=this.mesh.geometry;this.mesh.geometry=g;old.dispose();
    this.statsState={quads:q,triangles:q*2,samples,columns,radius:r,step:st,stageDepth:s};
  }
  setWeather(state='clear',wind=.28){
    this.weather=state;const storm=state==='storm'||state==='blizzard',rain=state==='rain'||storm;
    this.uniforms.amplitude.value=storm?.13:rain?.095:.065;this.uniforms.wind.value=Math.max(.05,Number(wind)||.28);
    this.material.opacity=storm?.73:rain?.69:.66;
    this.material.color.setHex(storm?0x355f73:state==='fog'?0x6e929d:0x4b9fbd);
  }
  update(dt,player){
    this.time+=Math.max(0,Math.min(.05,Number(dt)||0));this.uniforms.time.value=this.time;this.rebuild(player);
  }
  stats(){return {...this.statsState,mode:'analytic-ocean-stage-strip',singleVoxelDepth:true,seaLevel:this.terrain.seaLevel??0,seaSurfaceY:this.terrain.seaSurfaceY?.()??0,weather:this.weather,voxelCells:0}}
  dispose(){this.scene.remove(this.mesh);this.mesh.geometry.dispose();this.material.dispose()}
}
