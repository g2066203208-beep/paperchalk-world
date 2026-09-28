/* 2D paper-card entity rendered inside the Three.js stage.
 * Every world prop/player is a textured PlaneGeometry, never a 3D model.
 */

const textureCache=new Map();

function tint(hex,amount){
  const raw=String(hex||'#777777').replace('#','');
  const n=parseInt(raw.length===3?raw.split('').map(c=>c+c).join(''):raw,16)||0x777777;
  const r=Math.max(0,Math.min(255,(n>>16)+amount));
  const g=Math.max(0,Math.min(255,((n>>8)&255)+amount));
  const b=Math.max(0,Math.min(255,(n&255)+amount));
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

function makePaperTexture(THREE,{kind='prop',tint:base='#777777',label='' }={}){
  const key=kind+'|'+base+'|'+label;
  if(textureCache.has(key))return textureCache.get(key);

  const canvas=document.createElement('canvas');
  canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,512,512);
  ctx.lineJoin='round';ctx.lineCap='round';

  // Soft cut-paper shadow painted into the transparent texture.
  ctx.shadowColor='rgba(38,29,22,.28)';
  ctx.shadowBlur=14;ctx.shadowOffsetX=7;ctx.shadowOffsetY=10;
  ctx.strokeStyle='#3f3429';ctx.lineWidth=12;
  ctx.fillStyle=base;

  if(kind==='building'){
    ctx.beginPath();
    ctx.moveTo(72,430);ctx.lineTo(72,180);ctx.lineTo(256,72);ctx.lineTo(440,180);ctx.lineTo(440,430);ctx.closePath();
    ctx.fill();ctx.stroke();
    ctx.shadowColor='transparent';
    ctx.fillStyle=tint(base,28);
    for(const x of [130,250,370])for(const y of [235,320]){
      ctx.fillRect(x-34,y-28,68,56);
      ctx.strokeRect(x-34,y-28,68,56);
    }
    ctx.fillStyle=tint(base,-42);
    ctx.fillRect(228,342,66,88);ctx.strokeRect(228,342,66,88);
  }else if(kind==='tree'){
    ctx.beginPath();
    ctx.moveTo(230,438);ctx.lineTo(210,262);ctx.lineTo(302,262);ctx.lineTo(282,438);ctx.closePath();
    ctx.fillStyle=tint(base,-48);ctx.fill();ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(256,70);ctx.bezierCurveTo(80,90,70,270,178,292);
    ctx.bezierCurveTo(84,368,222,390,260,322);
    ctx.bezierCurveTo(326,394,474,340,372,282);
    ctx.bezierCurveTo(480,224,416,84,256,70);ctx.closePath();
    ctx.fillStyle=base;ctx.fill();ctx.stroke();
  }else if(kind==='rock'){
    ctx.beginPath();
    ctx.moveTo(74,410);ctx.lineTo(105,252);ctx.lineTo(220,148);ctx.lineTo(390,182);ctx.lineTo(446,316);ctx.lineTo(396,418);ctx.closePath();
    ctx.fill();ctx.stroke();
    ctx.shadowColor='transparent';ctx.strokeStyle=tint(base,36);ctx.lineWidth=8;
    ctx.beginPath();ctx.moveTo(162,244);ctx.lineTo(244,205);ctx.lineTo(338,242);ctx.stroke();
  }else if(kind==='player'){
    // Intentionally flat silhouette: this is a paper actor, not a pseudo-3D mannequin.
    ctx.beginPath();ctx.arc(256,115,68,0,Math.PI*2);ctx.fillStyle='#e6c7a8';ctx.fill();ctx.stroke();
    ctx.fillStyle=base;
    ctx.beginPath();ctx.moveTo(174,196);ctx.lineTo(338,196);ctx.lineTo(354,382);ctx.lineTo(158,382);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=tint(base,-55);ctx.lineWidth=26;
    ctx.beginPath();ctx.moveTo(214,380);ctx.lineTo(202,470);ctx.moveTo(298,380);ctx.lineTo(310,470);ctx.stroke();
    ctx.strokeStyle=base;ctx.lineWidth=22;
    ctx.beginPath();ctx.moveTo(170,226);ctx.lineTo(112,352);ctx.moveTo(342,226);ctx.lineTo(400,352);ctx.stroke();
    ctx.fillStyle='#d9b85c';ctx.fillRect(166,190,180,26);
  }else{
    ctx.beginPath();ctx.moveTo(180,430);ctx.lineTo(196,166);ctx.lineTo(316,166);ctx.lineTo(334,430);ctx.closePath();
    ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(256,176);ctx.lineTo(398,230);ctx.lineTo(256,282);ctx.closePath();
    ctx.fillStyle=tint(base,26);ctx.fill();ctx.stroke();
  }

  ctx.shadowColor='transparent';
  // Paper grain is drawn into the texture itself so the object remains a single plane.
  for(let i=0;i<900;i++){
    const x=(i*149)%512,y=(i*83)%512;
    const a=.018+((i*17)%11)/1000;
    ctx.fillStyle='rgba(255,255,255,'+a.toFixed(3)+')';
    ctx.fillRect(x,y,1+(i%3),1);
  }

  if(label){
    ctx.font='700 24px system-ui,sans-serif';
    ctx.textAlign='center';
    ctx.fillStyle='rgba(52,42,32,.76)';
    ctx.fillText(String(label).slice(0,10),256,488);
  }

  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=THREE.LinearFilter;
  texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=true;
  texture.needsUpdate=true;
  textureCache.set(key,texture);
  return texture;
}

export class PaperSpriteEntity{
  constructor(THREE,descriptor={}){
    this.THREE=THREE;
    this.descriptor=descriptor;
    this.group=new THREE.Group();
    this.group.name='paper-entity:'+String(descriptor.id||descriptor.kind||'entity');

    const width=Math.max(.05,Number(descriptor.width)||1);
    const height=Math.max(.05,Number(descriptor.height)||1);
    const geometry=new THREE.PlaneGeometry(width,height);
    const texture=makePaperTexture(THREE,{
      kind:descriptor.kind||'prop',
      tint:descriptor.tint||'#777777',
      label:descriptor.label||''
    });
    const material=new THREE.MeshBasicMaterial({
      map:texture,
      transparent:true,
      alphaTest:.035,
      side:THREE.DoubleSide,
      depthWrite:true,
      toneMapped:false
    });
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.y=height*.5;
    mesh.castShadow=false;
    mesh.receiveShadow=false;
    mesh.renderOrder=Number(descriptor.renderOrder)||3;
    this.group.add(mesh);
    this.mesh=mesh;
    this.width=width;
    this.height=height;
    this.facing=1;
    this.targetRotationY=0;
    this.turning=false;
  }

  setPosition(x,y,z=0){
    this.group.position.set(Number(x)||0,Number(y)||0,Number(z)||0);
    return this;
  }

  setFacing(facing,{immediate=false}={}){
    const next=facing<0?-1:1;
    if(next===this.facing&&!this.turning)return this;
    this.facing=next;
    this.targetRotationY=next<0?Math.PI:0;
    if(immediate){
      this.group.rotation.y=this.targetRotationY;
      this.turning=false;
    }else this.turning=true;
    return this;
  }

  update(dt,{action='idle',time=0}={}){
    const step=Math.max(0,Math.min(.08,Number(dt)||0));
    if(this.turning){
      let delta=this.targetRotationY-this.group.rotation.y;
      delta=Math.atan2(Math.sin(delta),Math.cos(delta));
      const amount=Math.sign(delta)*Math.min(Math.abs(delta),step*Math.PI/0.16);
      this.group.rotation.y+=amount;
      if(Math.abs(delta)<.025){
        this.group.rotation.y=this.targetRotationY;
        this.turning=false;
      }
    }
    const moving=action==='walk'||action==='run';
    const breathe=action==='idle'?Math.sin(time*2.6)*.008:0;
    const walk=moving?Math.sin(time*9)*.018:0;
    this.mesh.position.y=this.height*.5+breathe+Math.abs(walk);
    this.mesh.rotation.z=moving?walk*.55:0;
  }

  dispose(){
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.group.removeFromParent();
  }
}

export function clearPaperTextureCache(){
  for(const texture of textureCache.values())texture.dispose();
  textureCache.clear();
}
