function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
function crownGeometry(THREE,seed){
 const r=rng(9100+seed*97),s=new THREE.Shape(),pts=[],n=16;
 for(let i=0;i<n;i++){const a=Math.PI*2*i/n,rr=.80+r()*.30;pts.push([Math.cos(a)*rr,Math.sin(a)*(.60+r()*.19)])}
 s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<n;i++)s.lineTo(pts[i][0],pts[i][1]);s.closePath();
 return new THREE.ShapeGeometry(s,2);
}
function mistTexture(THREE,seed){
 const c=document.createElement('canvas');c.width=512;c.height=192;
 const g=c.getContext('2d'),r=rng(7400+seed*131);
 g.clearRect(0,0,c.width,c.height);
 for(let layer=0;layer<2;layer++){
  const top=30+layer*30+r()*8,bottom=top+70+r()*36;
  g.beginPath();g.moveTo(-20,top);
  for(let x=-20;x<=532;x+=18)g.lineTo(x,top+(r()-.5)*18+Math.sin((x+seed*31)*.034)*5);
  for(let x=532;x>=-20;x-=18)g.lineTo(x,bottom+(r()-.5)*20+Math.sin((x+seed*17)*.029)*6);
  g.closePath();
  const grad=g.createLinearGradient(0,top,0,bottom),a=layer?0.48:0.72;
  grad.addColorStop(0,'rgba(255,255,248,'+(a*.45)+')');grad.addColorStop(.25,'rgba(245,249,242,'+a+')');grad.addColorStop(1,'rgba(205,221,214,'+(a*.35)+')');
  g.fillStyle=grad;g.fill();
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;
 return t;
}
export class PrologueDioramaSet{
 constructor(THREE,engine,sceneData){
  this.THREE=THREE;this.engine=engine;this.sceneData=sceneData;this.time=0;
  this.root=new THREE.Group();this.root.name='prologue-demo-composition';engine.scene.add(this.root);
  this.forest=new THREE.Group();this.forest.name='demo-forest-layers';this.root.add(this.forest);
  this.mist=new THREE.Group();this.mist.name='demo-paper-mist';this.root.add(this.mist);
  this.state={enabled:false,style:'none',trees:0,forestLayers:0,mistBanks:0,groundMist:0,drawGroups:0};
  if(sceneData?.id!=='prologue-paper-diorama')return;
  const comp=sceneData.composition,r=rng(12032),dummy=new THREE.Object3D();
  const trunkMats=[
   new THREE.MeshLambertMaterial({color:0x594536,side:THREE.DoubleSide}),
   new THREE.MeshLambertMaterial({color:0x665247,side:THREE.DoubleSide}),
   new THREE.MeshLambertMaterial({color:0x716158,side:THREE.DoubleSide})
  ];
  const leafMats=[
   new THREE.MeshLambertMaterial({color:0x314b36,side:THREE.DoubleSide}),
   new THREE.MeshLambertMaterial({color:0x425d47,side:THREE.DoubleSide}),
   new THREE.MeshLambertMaterial({color:0x5a7065,side:THREE.DoubleSide})
  ];
  const crowns=[1,2,3,4].map(i=>crownGeometry(THREE,i)),treeLayers=[...comp.forestLayers],treesByLayer=[[],[],[]];
  treeLayers.forEach((L,layer)=>{
   for(let i=0;i<L.count;i++){
    const t=i/Math.max(1,L.count-1),x=(t-.5)*L.span+(r()-.5)*L.jitter,z=L.z+(r()-.5)*.72,s=L.scale+(r()-.5)*.14;
    treesByLayer[layer].push({x,z,s,seed:layer*100+i*13+7});
   }
  });
  for(const q of comp.foregroundTrees)treesByLayer[0].push({x:q.x,z:q.z,s:q.scale,seed:700+treesByLayer[0].length*29});
  let drawGroups=0,treeCount=0;
  for(let layer=0;layer<3;layer++){
   const trees=treesByLayer[layer],trunkGeo=new THREE.PlaneGeometry(1,1),trunks=new THREE.InstancedMesh(trunkGeo,trunkMats[layer],trees.length);
   trunks.instanceMatrix.setUsage(THREE.StaticDrawUsage);trunks.castShadow=true;trunks.receiveShadow=true;trunks.frustumCulled=false;
   trees.forEach((t,i)=>{
    const rr=rng(12000+t.seed*41),w=(.38+rr()*.20)*t.s,h=(3.8+rr()*1.8)*t.s,y=h*.5;
    dummy.position.set(t.x+(rr()-.5)*.12*t.s,y,t.z);dummy.rotation.set(0,0,(rr()-.5)*.045);dummy.scale.set(w,h,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
   });
   trunks.instanceMatrix.needsUpdate=true;this.forest.add(trunks);drawGroups++;
   for(let gi=0;gi<crowns.length;gi++){
    const entries=[];
    trees.forEach(t=>{const rr=rng(14000+t.seed*53);for(let k=0;k<3;k++)if((t.seed+k)%crowns.length===gi)entries.push({t,k,rx:rr(),ry:rr(),rs:rr(),rot:rr()})});
    if(!entries.length)continue;
    const mesh=new THREE.InstancedMesh(crowns[gi],leafMats[layer],entries.length);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
    entries.forEach((e,i)=>{
     const {t,k}=e,x=t.x+(e.rx-.5)*.52*t.s,y=(3.65+k*.55+(e.ry-.5)*.16)*t.s,z=t.z+(k-1)*.035*t.s,sx=(1.30+e.rs*.55)*t.s,sy=(1.02+e.ry*.42)*t.s;
     dummy.position.set(x,y,z);dummy.rotation.set(0,0,(e.rot-.5)*.30);dummy.scale.set(sx,sy,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;this.forest.add(mesh);drawGroups++;
   }
   treeCount+=trees.length;
  }
  this.mistTex=mistTexture(THREE,11);
  const fogMat=new THREE.MeshBasicMaterial({map:this.mistTex,color:0xe4ece3,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide,toneMapped:true});
  const banks=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),fogMat,comp.mist.banks);
  banks.instanceMatrix.setUsage(THREE.StaticDrawUsage);banks.frustumCulled=false;banks.renderOrder=4;
  for(let i=0;i<comp.mist.banks;i++){
   const lane=i%3,z=-5-lane*5.4+(r()-.5)*1.6,x=(r()-.5)*(18+lane*9),w=5+r()*8,h=1.4+r()*1.6,y=.7+r()*1.6;
   dummy.position.set(x,y,z);dummy.rotation.set(0,(r()-.5)*.18,0);dummy.scale.set(w,h,1);dummy.updateMatrix();banks.setMatrixAt(i,dummy.matrix);
  }
  banks.instanceMatrix.needsUpdate=true;this.mist.add(banks);
  const ground=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),fogMat,comp.mist.groundSheets);
  ground.instanceMatrix.setUsage(THREE.StaticDrawUsage);ground.frustumCulled=false;ground.renderOrder=5;
  for(let i=0;i<comp.mist.groundSheets;i++){
   dummy.position.set((r()-.5)*34,.06,-4-r()*15);dummy.rotation.set(-Math.PI/2,0,(r()-.5)*.5);dummy.scale.set(5+r()*10,2+r()*4,1);dummy.updateMatrix();ground.setMatrixAt(i,dummy.matrix);
  }
  ground.instanceMatrix.needsUpdate=true;this.mist.add(ground);drawGroups+=2;
  this.groundBounce=new THREE.DirectionalLight(0xc6cf9a,.30);this.groundBounce.position.set(0,-3,6);this.groundBounce.castShadow=false;
  this.viewFill=new THREE.DirectionalLight(0xf5efe5,.20);this.viewFill.castShadow=false;
  this.root.add(this.groundBounce,this.groundBounce.target,this.viewFill,this.viewFill.target);
  if(sceneData.render?.toneExposure)engine.renderer.toneMappingExposure=sceneData.render.toneExposure;
  this.state={enabled:true,style:comp.style,trees:treeCount,forestLayers:comp.forestLayers.length,mistBanks:comp.mist.banks,groundMist:comp.mist.groundSheets,drawGroups,assetIndependent:true,compositionDriven:true};
 }
 update(dt,snapshot,camera){
  if(!this.state.enabled)return;
  this.time+=dt;if(this.mistTex)this.mistTex.offset.x=(this.time*.006)%1;
  const p=snapshot?.player||{x:0,y:1,z:0};
  if(camera){this.viewFill.position.copy(camera.position);this.viewFill.target.position.set(p.x,p.y,p.z);this.viewFill.target.updateMatrixWorld()}
  this.groundBounce.target.position.set(p.x,p.y-.5,p.z);this.groundBounce.target.updateMatrixWorld();
 }
 stats(){return {...this.state}}
}
