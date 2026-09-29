export class OceanRenderer{
  constructor(THREE,terrain,scene,{mobile=false}={}){
    this.THREE=THREE;this.terrain=terrain;this.scene=scene;this.time=0;this.weather='clear';this.mobile=mobile;
    this.radius=mobile?150:230;this.step=mobile?16:12;this.anchorX=Infinity;this.anchorZ=Infinity;
    this.geometry=new THREE.BufferGeometry();
    this.material=new THREE.MeshStandardMaterial({
      color:0x4b9fbd,transparent:true,opacity:.68,depthWrite:false,
      metalness:0,roughness:.28,side:THREE.DoubleSide,fog:true
    });
    this.uniforms={time:{value:0},amplitude:{value:.09},wind:{value:.28}};
    this.material.onBeforeCompile=shader=>{
      shader.uniforms.uOceanTime=this.uniforms.time;
      shader.uniforms.uOceanAmplitude=this.uniforms.amplitude;
      shader.uniforms.uOceanWind=this.uniforms.wind;
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nuniform float uOceanTime; uniform float uOceanAmplitude; uniform float uOceanWind;')
        .replace('#include <begin_vertex>',`#include <begin_vertex>
          float w1=sin(position.x*.085+uOceanTime*1.15);
          float w2=cos(position.z*.072-uOceanTime*.82+position.x*.021);
          float w3=sin((position.x+position.z)*.034+uOceanTime*.48);
          transformed.y += (w1*.52+w2*.31+w3*.17)*uOceanAmplitude*(1.0+uOceanWind*.22);`);
      this.shader=shader;
    };
    this.mesh=new THREE.Mesh(this.geometry,this.material);
    this.mesh.name='analytic-ocean-surface';this.mesh.receiveShadow=true;this.mesh.castShadow=false;this.mesh.renderOrder=24;
    this.scene.add(this.mesh);this.statsState={quads:0,samples:0};
  }
  _isOcean(wx,wz){
    const s=this.terrain.tileSize,gx=Math.floor(wx/s),gz=Math.floor(wz/s+.5);
    const p=this.terrain.terrainProfile(gx,gz);
    return p.biome==='ocean'||p.landform==='deep-ocean'||p.landform==='shallow-sea';
  }
  rebuild(player){
    if(!player)return;
    const snap=this.step*2,ax=Math.round(player.x/snap)*snap,az=Math.round(player.z/snap)*snap;
    if(Math.abs(ax-this.anchorX)<snap&&Math.abs(az-this.anchorZ)<snap)return;
    this.anchorX=ax;this.anchorZ=az;
    const P=[],I=[],r=this.radius,st=this.step,y=this.terrain.seaSurfaceY?.()??0;
    let q=0,samples=0;
    for(let z=-r;z<r;z+=st)for(let x=-r;x<r;x+=st){
      const cx=ax+x+st*.5,cz=az+z+st*.5;samples++;
      if(!this._isOcean(cx,cz))continue;
      const base=P.length/3,x0=ax+x,x1=x0+st,z0=az+z,z1=z0+st;
      P.push(x0,y,z0,x1,y,z0,x1,y,z1,x0,y,z1);
      I.push(base,base+1,base+2,base,base+2,base+3);q++;
    }
    const g=new this.THREE.BufferGeometry();
    g.setAttribute('position',new this.THREE.Float32BufferAttribute(P,3));g.setIndex(I);
    if(P.length){g.computeVertexNormals();g.computeBoundingSphere()}
    const old=this.mesh.geometry;this.mesh.geometry=g;old.dispose();
    this.statsState={quads:q,triangles:q*2,samples,radius:r,step:st};
  }
  setWeather(state='clear',wind=.28){
    this.weather=state;const storm=state==='storm'||state==='blizzard',rain=state==='rain'||storm;
    this.uniforms.amplitude.value=storm?.22:rain?.15:.09;this.uniforms.wind.value=Math.max(.05,Number(wind)||.28);
    this.material.opacity=storm?.74:rain?.71:.68;
    this.material.color.setHex(storm?0x355f73:state==='fog'?0x6e929d:0x4b9fbd);
  }
  update(dt,player){
    this.time+=Math.max(0,Math.min(.05,Number(dt)||0));this.uniforms.time.value=this.time;this.rebuild(player);
  }
  stats(){return {...this.statsState,mode:'analytic-ocean-plane',maskedByOceanBiome:true,seaLevel:this.terrain.seaLevel??0,seaSurfaceY:this.terrain.seaSurfaceY?.()??0,weather:this.weather,voxelCells:0}}
  dispose(){this.scene.remove(this.mesh);this.mesh.geometry.dispose();this.material.dispose()}
}
