// Paperchalk Demo v12.32 visual baseline. Extracted without changing shader or art parameters.
import {rng,hash3} from './math.js';

export function createForest({THREE,scene,paperGrassSet,paperDirtSet,standardPaperMaterial}){
const canopyGroup=new THREE.Group();
scene.add(canopyGroup);

const forestLeafMats=[
  standardPaperMaterial(paperGrassSet,{normalScale:.28,roughness:.96,color:0x314b36,side:THREE.DoubleSide}),
  standardPaperMaterial(paperGrassSet,{normalScale:.28,roughness:.96,color:0x425d47,side:THREE.DoubleSide}),
  standardPaperMaterial(paperGrassSet,{normalScale:.28,roughness:.96,color:0x5a7065,side:THREE.DoubleSide})
];
const forestTrunkMats=[
  standardPaperMaterial(paperDirtSet,{normalScale:.46,roughness:.98,color:0x5a4233,side:THREE.DoubleSide}),
  standardPaperMaterial(paperDirtSet,{normalScale:.46,roughness:.98,color:0x635044,side:THREE.DoubleSide}),
  standardPaperMaterial(paperDirtSet,{normalScale:.46,roughness:.98,color:0x6d5b50,side:THREE.DoubleSide})
];

function forestCrownGeometry(seed=1){
  const r=rng(9100+seed*97),s=new THREE.Shape(),pts=[],n=16;
  for(let i=0;i<n;i++){
    const a=Math.PI*2*i/n;
    const rr=.80+r()*.30;
    pts.push([Math.cos(a)*rr,Math.sin(a)*(.60+r()*.19)]);
  }
  s.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],pts[i][1]);
  s.closePath();
  return new THREE.ShapeGeometry(s,2);
}
const forestCrownGeos=[
  forestCrownGeometry(1),forestCrownGeometry(2),
  forestCrownGeometry(3),forestCrownGeometry(4)
];

const forestTreeData=[];
function queueForestTree(x,z,layer,seed,scale=1){
  const r=rng(12000+seed*41);
  const trunk={
    x:x+(r()-.5)*.12*scale,
    y:1.95*scale,
    z,
    w:(.38+r()*.20)*scale,
    h:(3.8+r()*1.8)*scale,
    rot:(r()-.5)*.045,
    layer
  };
  const crowns=[];
  for(let i=0;i<3;i++){
    crowns.push({
      geo:(seed+i)%forestCrownGeos.length,
      x:x+(r()-.5)*.52*scale,
      y:(3.65+i*.55+(r()-.5)*.16)*scale,
      z:z+(i-1)*.035*scale,
      sx:(1.30+r()*.55)*scale,
      sy:(1.02+r()*.42)*scale,
      rot:(r()-.5)*.30,
      layer
    });
  }
  forestTreeData.push({trunk,crowns});
}

const forestLayers=[
  {z:-5.0,count:10,span:20,jitter:.95,scale:1.16},
  {z:-8.4,count:13,span:24,jitter:1.35,scale:1.06},
  {z:-12.6,count:16,span:28,jitter:1.75,scale:.96}
];
forestLayers.forEach((L,layer)=>{
  for(let i=0;i<L.count;i++){
    const t=i/(L.count-1);
    const x=(t-.5)*L.span+(hash3(layer*97+i*17,31,11)-.5)*L.jitter;
    const z=L.z+(hash3(i*23,layer*61,19)-.5)*.72;
    const s=L.scale+(hash3(i,layer,88)-.5)*.14;
    queueForestTree(x,z,layer,layer*100+i*13+7,s);
  }
});
[
  [-9.2,-2.2,0,1.45],[-8.6,.8,0,1.35],
  [ 9.0,-2.0,0,1.45],[ 8.5,1.2,0,1.35]
].forEach((d,i)=>queueForestTree(d[0],d[1],d[2],700+i*29,d[3]));

const forestDummy=new THREE.Object3D();
const unitTrunkGeo=new THREE.PlaneGeometry(1,1);
for(let layer=0;layer<3;layer++){
  const trunks=forestTreeData.map(d=>d.trunk).filter(t=>t.layer===layer);
  const im=new THREE.InstancedMesh(unitTrunkGeo,forestTrunkMats[layer],trunks.length);
  im.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  im.castShadow=true;im.receiveShadow=true;im.frustumCulled=false;
  trunks.forEach((t,i)=>{
    forestDummy.position.set(t.x,t.y,t.z);
    forestDummy.rotation.set(0,0,t.rot);
    forestDummy.scale.set(t.w,t.h,1);
    forestDummy.updateMatrix();im.setMatrixAt(i,forestDummy.matrix);
  });
  im.instanceMatrix.needsUpdate=true;canopyGroup.add(im);

  for(let gi=0;gi<forestCrownGeos.length;gi++){
    const crowns=forestTreeData.flatMap(d=>d.crowns).filter(q=>q.layer===layer&&q.geo===gi);
    if(!crowns.length)continue;
    const cm=new THREE.InstancedMesh(forestCrownGeos[gi],forestLeafMats[layer],crowns.length);
    cm.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    cm.castShadow=true;cm.receiveShadow=true;cm.frustumCulled=false;
    crowns.forEach((q,i)=>{
      forestDummy.position.set(q.x,q.y,q.z);
      forestDummy.rotation.set(0,0,q.rot);
      forestDummy.scale.set(q.sx,q.sy,1);
      forestDummy.updateMatrix();cm.setMatrixAt(i,forestDummy.matrix);
    });
    cm.instanceMatrix.needsUpdate=true;canopyGroup.add(cm);
  }
}

// GPU-friendly instanced paper fog cards.
// We use two InstancedMeshes (upright banks + ground sheets), update instance
// matrices at low frequency, and sample a cached scene depth texture to soften
// intersections with terrain ("soft particles" technique).


return {canopyGroup};
}
