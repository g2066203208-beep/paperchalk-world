/* Authored flat paper actors for the Three.js stage.
 * Procedural tree/building/rock placeholder art has been removed.
 */
export function makePaperTexture(THREE,{kind='prop',primary='#7b6a56',secondary='#d8c7a3'}={}){
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,64,64);
  // Safety fallback only. World props must use authored assets or real geometry;
  // the old generated tree/building/rock silhouettes were intentionally removed.
  ctx.fillStyle=kind==='player'?secondary:primary;
  ctx.beginPath();ctx.roundRect(10,8,44,48,8);ctx.fill();
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.needsUpdate=true;
  return texture;
}

export class PaperSpriteEntity{
  constructor(THREE,{id,kind='prop',label='',x=0,y=0,z=0,width=2,height=2,primary,secondary,seed=1,texture=null,anchorY=0}={}){
    this.THREE=THREE;
    this.id=id||kind;
    this.kind=kind;
    this.width=width;
    this.height=height;
    this.root=new THREE.Group();
    this.root.name='paper:'+this.id;
    const map=texture||makePaperTexture(THREE,{kind,label,primary,secondary,seed});
    this.texture=map;
    this.material=new THREE.MeshBasicMaterial({
      map,
      transparent:true,
      alphaTest:.035,
      side:THREE.DoubleSide,
      depthWrite:true,
      toneMapped:false
    });
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),this.material);
    this.mesh.position.y=height*.5-anchorY;
    this.mesh.castShadow=false;
    this.mesh.receiveShadow=false;
    this.root.add(this.mesh);
    this.root.position.set(x,y,z);
    this.targetFlip=0;
    this.flipVelocity=0;
  }
  setFacing(direction){
    this.targetFlip=direction<0?Math.PI:0;
  }
  update(dt){
    let delta=this.targetFlip-this.root.rotation.y;
    delta=Math.atan2(Math.sin(delta),Math.cos(delta));
    const k=1-Math.pow(.00001,Math.max(0,dt));
    this.root.rotation.y+=delta*k;
  }
  dispose(){
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.texture?.dispose?.();
  }
}
