/* Flat paper entities for the Three.js stage. Every visible world object except terrain
 * is rendered on a textured PlaneGeometry.
 */
export function makePaperTexture(THREE,{kind='prop',label='',primary='#7b6a56',secondary='#d8c7a3',seed=1}={}){
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,256,256);
  ctx.lineJoin='round';ctx.lineCap='round';
  const rnd=n=>{
    const x=Math.sin((seed+1)*12.9898+n*78.233)*43758.5453;
    return x-Math.floor(x);
  };
  ctx.save();
  ctx.translate(128,220);
  ctx.strokeStyle='#3d342c';
  ctx.lineWidth=7;
  ctx.fillStyle=primary;

  if(kind==='tree'){
    ctx.fillStyle='#6f5034';
    ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(-13,-112);ctx.lineTo(14,-112);ctx.lineTo(19,0);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=primary;
    for(let i=0;i<7;i++){
      const x=(rnd(i)-.5)*100,y=-120-rnd(i+9)*70,r=42+rnd(i+17)*22;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
  }else if(kind==='building'){
    ctx.fillStyle=primary;
    ctx.beginPath();ctx.rect(-100,-122,200,122);ctx.fill();ctx.stroke();
    ctx.fillStyle=secondary;
    ctx.beginPath();ctx.moveTo(-115,-122);ctx.lineTo(0,-205);ctx.lineTo(115,-122);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#9bb4bc';
    for(const x of [-58,0,58]){ctx.fillRect(x-18,-92,36,32);ctx.strokeRect(x-18,-92,36,32)}
    ctx.fillStyle='#4d4035';ctx.fillRect(-18,-62,36,62);ctx.strokeRect(-18,-62,36,62);
  }else if(kind==='rock'){
    ctx.fillStyle=primary;
    ctx.beginPath();ctx.moveTo(-78,0);ctx.lineTo(-96,-48);ctx.lineTo(-55,-98);ctx.lineTo(20,-112);ctx.lineTo(86,-62);ctx.lineTo(72,0);ctx.closePath();ctx.fill();ctx.stroke();
  }else if(kind==='player'){
    ctx.fillStyle=secondary;
    ctx.beginPath();ctx.arc(0,-150,34,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=primary;
    ctx.beginPath();ctx.moveTo(-34,-119);ctx.lineTo(34,-119);ctx.lineTo(43,-35);ctx.lineTo(-43,-35);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#342e2a';ctx.lineWidth=12;
    ctx.beginPath();ctx.moveTo(-22,-36);ctx.lineTo(-27,0);ctx.moveTo(22,-36);ctx.lineTo(27,0);ctx.stroke();
    ctx.lineWidth=9;
    ctx.beginPath();ctx.moveTo(-37,-104);ctx.lineTo(-63,-58);ctx.moveTo(37,-104);ctx.lineTo(63,-58);ctx.stroke();
  }else{
    ctx.fillStyle=primary;
    ctx.beginPath();ctx.roundRect(-74,-110,148,110,20);ctx.fill();ctx.stroke();
  }
  ctx.restore();

  for(let i=0;i<140;i++){
    ctx.fillStyle='rgba(70,55,42,'+(0.012+rnd(i+100)*.025)+')';
    ctx.fillRect(rnd(i+200)*256,rnd(i+300)*256,1+rnd(i+400)*2,1+rnd(i+500)*2);
  }
  if(label){
    ctx.fillStyle='rgba(50,43,36,.76)';
    ctx.font='700 15px system-ui,sans-serif';
    ctx.textAlign='center';
    ctx.fillText(label,128,246);
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=THREE.LinearFilter;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.needsUpdate=true;
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
