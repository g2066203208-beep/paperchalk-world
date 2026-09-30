export class PrologueSchoolFence{
constructor(THREE,scene,sceneData){
this.THREE=THREE;this.scene=scene;this.sceneData=sceneData;this.root=null;this.state={enabled:false};
if(sceneData?.id!=='prologue-school-street'||!sceneData.schoolFence)return;
const metrics=window.PaperchalkSceneRuntime?.schoolFenceMetrics?.(sceneData);
if(!metrics)return;
const f=sceneData.schoolFence,s=sceneData.terrain.tileSize||1;
this.root=new THREE.Group();this.root.name='school-fence-voxel-grid';scene.add(this.root);
const loader=new THREE.TextureLoader();
const panelTex=loader.load('assets/prologue/school-fence-panel.svg',t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4});
const gateTex=loader.load('assets/prologue/school-gate-leaf.svg',t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4});
const edge=new THREE.MeshStandardMaterial({color:0x4a514b,roughness:.84,metalness:.08});
const concrete=new THREE.MeshStandardMaterial({color:0xcac2aa,roughness:.96,metalness:0});
const pillarMat=new THREE.MeshStandardMaterial({color:0xbeb59d,roughness:.94,metalness:0});
const face=t=>new THREE.MeshStandardMaterial({map:t,transparent:true,alphaTest:.34,side:THREE.DoubleSide,roughness:.72,metalness:.16});
const panelFace=face(panelTex),gateFace=face(gateTex);
const mats=t=>[edge,edge,edge,edge,t,t];
const addInstances=(name,geometry,material,rows)=>{
 const mesh=new THREE.InstancedMesh(geometry,material,rows.length);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
 const m=new THREE.Matrix4();
 rows.forEach((p,i)=>{m.makeTranslation(p[0],p[1],p[2]);mesh.setMatrixAt(i,m)});
 mesh.instanceMatrix.needsUpdate=true;this.root.add(mesh);return mesh;
};
const panelW=f.grid.panelCells*s,z=metrics.z,ground=metrics.groundTop;
const panelCenters=metrics.panels.map(([a,b])=>[(a+b)*.5*s,ground+f.panel.baseHeight+f.panel.metalHeight*.5,z]);
const baseCenters=metrics.panels.map(([a,b])=>[(a+b)*.5*s,ground+f.panel.baseHeight*.5,z]);
addInstances('school-fence-panels',new THREE.BoxGeometry(panelW,f.panel.metalHeight,f.panel.thickness),mats(panelFace),panelCenters);
addInstances('school-fence-bases',new THREE.BoxGeometry(panelW,f.panel.baseHeight,f.panel.thickness*1.5),concrete,baseCenters);
const postY=ground+f.post.height*.5;
addInstances('school-fence-posts',new THREE.BoxGeometry(f.post.width,f.post.height,f.post.width),pillarMat,metrics.posts.map(x=>[x*s,postY,z]));
const gp=f.gate,gateY=ground+gp.pillarHeight*.5;
addInstances('school-gate-pillars',new THREE.BoxGeometry(gp.pillarWidth,gp.pillarHeight,gp.pillarWidth),pillarMat,metrics.gate.map(x=>[x*s,gateY,z]));
const leafW=(metrics.gate[1]-metrics.gate[0])*s*.5,leafY=ground+gp.leafHeight*.5;
addInstances('school-gate-leaves',new THREE.BoxGeometry(leafW,gp.leafHeight,f.panel.thickness),mats(gateFace),[
 [(metrics.gate[0]+(metrics.gate[1]-metrics.gate[0])*.25)*s,leafY,z],
 [(metrics.gate[0]+(metrics.gate[1]-metrics.gate[0])*.75)*s,leafY,z]
]);
this.state={enabled:true,installation:'voxel-grid-edge',gridAligned:true,lineZ:z,groundTop:ground,
 frontageMeters:metrics.frontageCells*s,gateMeters:metrics.gateCells*s,panelMeters:panelW,
 panelCount:metrics.panels.length,postCount:metrics.posts.length,gatePillars:2,gateLeaves:2,
 panelThickness:f.panel.thickness,frontBackTexture:true,realThickness:true,
 rearCellZ:f.grid.rearCellZ,sidewalkCellZ:f.grid.sidewalkCellZ,
 xEdges:{start:f.grid.startXEdge,gateStart:f.grid.gateStartXEdge,gateEnd:f.grid.gateEndXEdge,end:f.grid.endXEdge},
 assets:['assets/prologue/school-fence-panel.svg','assets/prologue/school-gate-leaf.svg']};
}
stats(){return {...this.state}}
}
