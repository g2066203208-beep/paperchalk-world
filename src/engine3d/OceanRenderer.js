export class OceanRenderer{
  constructor(THREE,terrain,scene,{mobile=false}={}){
    this.THREE=THREE;this.terrain=terrain;this.scene=scene;this.time=0;this.weather='clear';
    const size=mobile?280:460,segments=mobile?32:56;
    this.geometry=new THREE.PlaneGeometry(size,size,segments,segments);
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
          float w2=cos(position.y*.072-uOceanTime*.82+position.x*.021);
          float w3=sin((position.x+position.y)*.034+uOceanTime*.48);
          transformed.z += (w1*.52+w2*.31+w3*.17)*uOceanAmplitude*(1.0+uOceanWind*.22);`);
      this.shader=shader;
    };
    this.mesh=new THREE.Mesh(this.geometry,this.material);
    this.mesh.name='analytic-ocean-surface';this.mesh.rotation.x=-Math.PI/2;
    this.mesh.position.y=this.terrain.seaSurfaceY?.()??0;
    this.mesh.receiveShadow=true;this.mesh.castShadow=false;this.mesh.renderOrder=24;
    this.scene.add(this.mesh);
  }
  setWeather(state='clear',wind=.28){
    this.weather=state;
    const storm=state==='storm'||state==='blizzard';
    const rain=state==='rain'||storm;
    this.uniforms.amplitude.value=storm?.22:rain?.15:.09;
    this.uniforms.wind.value=Math.max(.05,Number(wind)||.28);
    this.material.opacity=storm?.74:rain?.71:.68;
    this.material.color.setHex(storm?0x355f73:state==='fog'?0x6e929d:0x4b9fbd);
  }
  update(dt,player){
    this.time+=Math.max(0,Math.min(.05,Number(dt)||0));
    this.uniforms.time.value=this.time;
    if(player){
      const snap=24;
      this.mesh.position.x=Math.round(player.x/snap)*snap;
      this.mesh.position.z=Math.round(player.z/snap)*snap;
    }
  }
  stats(){return {mode:'analytic-ocean-plane',seaLevel:this.terrain.seaLevel??0,seaSurfaceY:this.terrain.seaSurfaceY?.()??0,weather:this.weather,voxelCells:0}}
  dispose(){this.scene.remove(this.mesh);this.geometry.dispose();this.material.dispose()}
}
