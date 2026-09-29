export class FishingRenderer{
  constructor(THREE,scene){
    this.THREE=THREE;this.scene=scene;this.root=new THREE.Group();this.root.name='fishing-system';scene.add(this.root);
    this.lineGeometry=new THREE.BufferGeometry();
    this.linePositions=new Float32Array(6);
    this.lineGeometry.setAttribute('position',new THREE.BufferAttribute(this.linePositions,3));
    this.lineMaterial=new THREE.LineBasicMaterial({color:0xe7dcc5,transparent:true,opacity:.92,depthTest:true,depthWrite:false});
    this.line=new THREE.Line(this.lineGeometry,this.lineMaterial);this.line.visible=false;this.root.add(this.line);
    this.bobberTexture=this._bobberTexture();
    this.bobber=new THREE.Sprite(new THREE.SpriteMaterial({map:this.bobberTexture,transparent:true,depthWrite:false,depthTest:true,toneMapped:false}));
    this.bobber.scale.set(.42,.42,1);this.bobber.visible=false;this.root.add(this.bobber);
    this.biteTexture=this._biteTexture();
    this.bite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.biteTexture,transparent:true,depthWrite:false,depthTest:false,toneMapped:false}));
    this.bite.scale.set(.52,.52,1);this.bite.visible=false;this.bite.renderOrder=120;this.root.add(this.bite);
    this.time=0;this.lastState='idle';
  }
  _bobberTexture(){
    const T=this.THREE,c=document.createElement('canvas');c.width=96;c.height=96;const x=c.getContext('2d');
    x.clearRect(0,0,96,96);x.strokeStyle='#2f2822';x.lineWidth=5;x.beginPath();x.arc(48,48,27,0,Math.PI*2);x.stroke();
    x.fillStyle='#f4ead2';x.beginPath();x.arc(48,48,23,0,Math.PI*2);x.fill();
    x.fillStyle='#c45443';x.beginPath();x.arc(48,40,23,Math.PI,0);x.lineTo(71,48);x.arc(48,48,23,0,Math.PI,true);x.closePath();x.fill();
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  _biteTexture(){
    const T=this.THREE,c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d');
    x.font='900 92px sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=9;x.strokeStyle='#30241d';x.strokeText('!',64,64);
    x.fillStyle='#ffd65b';x.fillText('!',64,64);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  update(snapshot,camera,dt=0){
    this.time+=Math.max(0,Math.min(.05,Number(dt)||0));
    const f=snapshot?.fishing,p=snapshot?.player;
    if(!f||!p||f.state==='idle'){
      this.line.visible=false;this.bobber.visible=false;this.bite.visible=false;this.lastState='idle';return;
    }
    this.lastState=f.state;
    const startX=p.x+(p.facingX>=0?.46:-.46),startY=p.y+.45,startZ=p.z+.10;
    const endX=f.x,endY=f.y,endZ=f.z+.10;
    this.linePositions.set([startX,startY,startZ,endX,endY,endZ]);
    this.lineGeometry.attributes.position.needsUpdate=true;
    this.lineGeometry.computeBoundingSphere();
    this.line.visible=true;
    this.bobber.position.set(endX,endY,endZ);this.bobber.visible=true;
    const bite=f.state==='bite';this.bite.visible=bite;
    if(bite){
      this.bite.position.set(endX,endY+.72,endZ+.04);
      const pulse=1+Math.sin(this.time*18)*.16;this.bite.scale.set(.52*pulse,.52*pulse,1);
    }
  }
  stats(){return {renderMode:'paper-line-bobber-bite-ui',state:this.lastState,drawCalls:this.line.visible?2+(this.bite.visible?1:0):0}}
  dispose(){
    this.scene.remove(this.root);
    this.lineGeometry.dispose();this.lineMaterial.dispose();
    this.bobber.material.dispose();this.bite.material.dispose();this.bobberTexture.dispose();this.biteTexture.dispose();
  }
}
