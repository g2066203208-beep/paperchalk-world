import {PaperSpriteEntity} from '../entities/PaperSpriteEntity.js';
import {PaperTerrainRenderer} from './PaperTerrainRenderer.js?v=paper-r7';
import {AtmospherePass} from './AtmospherePass.js?v=atmos-r3';
import {
buildVoxelChunkGeometry,
createVoxelGridTexture,
DEFAULT_TERRAIN_PALETTE
} from '../terrain/voxel-block-mesh.js';
export class WorldSpaceHealthBar{
constructor(THREE,{max=10}={}){
this.THREE=THREE;this.max=max;this.value=max;
this.group=new THREE.Group();
this.group.name='player-health-paper-stage';
this.group.position.set(0,1.35,.08);
this.cells=[];this.animations=new Map();
this._parentQuaternion=new THREE.Quaternion();
const unit=.23,gap=.026,total=(max-1)*(unit+gap)+.34;
for(let i=0;i<max;i++){
const tail=i===max-1;
const holder=new THREE.Group();
holder.position.x=i*(unit+gap)-total*.5;
const frame=new THREE.Mesh(
tail?this._tailGeometry(.33,.16):new THREE.PlaneGeometry(unit,.16),
new THREE.MeshBasicMaterial({color:0x2a211b,side:THREE.DoubleSide,depthTest:true,depthWrite:true})
);
const fill=new THREE.Mesh(
tail?this._tailGeometry(.27,.10):new THREE.PlaneGeometry(unit-.055,.10),
new THREE.MeshBasicMaterial({color:tail?0xe0a84c:0xc75545,transparent:true,opacity:1,side:THREE.DoubleSide,depthTest:true,depthWrite:true})
);
fill.position.z=.012;
holder.add(frame,fill);holder.userData={fill,isTail:tail,index:i};
this.group.add(holder);this.cells.push(holder);
}
}
_tailGeometry(w,h){
const THREE=this.THREE,shape=new THREE.Shape(),hw=w*.5,hh=h*.5;
shape.moveTo(-hw,-hh);shape.lineTo(hw*.52,-hh);shape.lineTo(hw,0);shape.lineTo(hw*.52,hh);shape.lineTo(-hw,hh);shape.closePath();
return new THREE.ShapeGeometry(shape);
}
set(value,{animate=true}={}){
const next=Math.max(0,Math.min(this.max,Math.round(Number(value)||0))),prev=this.value;
if(next===prev)return next;
this.value=next;
if(animate){
if(next<prev)for(let i=next;i<prev;i++)this.animations.set(i,{kind:'damage',elapsed:0,delay:(prev-1-i)*.025,duration:.28});
else for(let i=prev;i<next;i++)this.animations.set(i,{kind:'heal',elapsed:0,delay:(i-prev)*.04,duration:.34});
}
this._sync(!animate);return next;
}
_sync(immediate=false){
for(let i=0;i<this.cells.length;i++){
const fill=this.cells[i].userData.fill;
if(immediate||!this.animations.has(i)){fill.visible=i<this.value;fill.material.opacity=i<this.value?1:.1;fill.scale.setScalar(1)}
}
}
update(camera,dt=0){
if(camera){
const parent=this.group.parent;
if(parent){parent.getWorldQuaternion(this._parentQuaternion);this._parentQuaternion.invert();this.group.quaternion.copy(this._parentQuaternion).multiply(camera.quaternion)}
else this.group.quaternion.copy(camera.quaternion);
}
const step=Math.max(0,Math.min(.1,Number(dt)||0));
for(const [i,a] of [...this.animations]){
a.elapsed+=step;const fill=this.cells[i]?.userData?.fill;if(!fill){this.animations.delete(i);continue}
const t=(a.elapsed-a.delay)/a.duration;if(t<0)continue;
if(t>=1){fill.visible=i<this.value;fill.material.opacity=i<this.value?1:.1;fill.scale.setScalar(1);this.animations.delete(i);continue}
fill.visible=true;
if(a.kind==='damage'){fill.scale.setScalar(Math.max(.15,1.25-t));fill.material.opacity=1-t*.9}
else{fill.scale.setScalar(.2+Math.sin(Math.min(1,t)*Math.PI*.5)*.95);fill.material.opacity=Math.min(1,.2+t*1.4)}
}
}
snapshot(){return {value:this.value,max:this.max,cells:this.cells.length,tail:this.cells.at(-1)?.userData?.isTail===true,animating:this.animations.size}}
}
class WaterRenderer{
constructor(THREE,terrain,scene){
this.THREE=THREE;this.terrain=terrain;this.scene=scene;
this.meshes=new Map();this.initialized=false;this.displayLevels=new Map();this.targetLevels=new Map();
this.transitionId=-1;this.transitionT=1;this.transitionDuration=.72;this.displayDirty=new Set();
this.material=new THREE.MeshPhongMaterial({
color:0x49a9df,transparent:true,opacity:.62,depthWrite:false,
shininess:78,specular:0xc8eeff,side:THREE.DoubleSide,flatShading:true
});
this.root=new THREE.Group();this.root.name='eight-layer-water-surface-meshes';scene.add(this.root);
}
_key(gx,gy,gz){return gx+','+gy+','+gz}
_level(gx,gy,gz){return this.displayLevels.get(this._key(gx,gy,gz))||0}
_chunkKeyFromCell(gx,gy,gz){
const n=this.terrain.chunkSize;
return Math.floor(gx/n)+','+Math.floor(gy/n)+','+Math.floor(gz/n);
}
_markDisplayDirtyForKey(key){
const [gx,gy,gz]=key.split(',').map(Number);
this.displayDirty.add(this._chunkKeyFromCell(gx,gy,gz));
this.displayDirty.add(this._chunkKeyFromCell(gx-1,gy,gz));this.displayDirty.add(this._chunkKeyFromCell(gx+1,gy,gz));
this.displayDirty.add(this._chunkKeyFromCell(gx,gy-1,gz));this.displayDirty.add(this._chunkKeyFromCell(gx,gy+1,gz));
this.displayDirty.add(this._chunkKeyFromCell(gx,gy,gz-1));this.displayDirty.add(this._chunkKeyFromCell(gx,gy,gz+1));
}
_pushQuad(data,a,b,c,d){
const base=data.positions.length/3;
for(const p of [a,b,c,d])data.positions.push(p[0],p[1],p[2]);
data.indices.push(base,base+1,base+2,base,base+2,base+3);
data.faces++;
}
_buildChunk(chunkKey){
const THREE=this.THREE;
const old=this.meshes.get(chunkKey);
if(old){this.root.remove(old);old.geometry.dispose();this.meshes.delete(chunkKey)}
const [cx,cy,cz]=chunkKey.split(',').map(Number),n=this.terrain.chunkSize,s=this.terrain.tileSize;
const data={positions:[],indices:[],faces:0,cells:0};
const xStart=cx*n,xEnd=xStart+n,yStart=cy*n,yEnd=yStart+n,zStart=cz*n,zEnd=zStart+n;
for(let gz=zStart;gz<zEnd;gz++)for(let gy=yStart;gy<yEnd;gy++)for(let gx=xStart;gx<xEnd;gx++){
const level=this._level(gx,gy,gz);if(!level)continue;
data.cells++;
const h=(level/8)*s;
const x0=gx*s+.008*s,x1=(gx+1)*s-.008*s;
const y0=gy*s,y1=y0+h;
const z0=gz*s-s*.492,z1=gz*s+s*.492;
if(this._level(gx,gy+1,gz)<=0)
this._pushQuad(data,[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]);
const belowLevel=this._level(gx,gy-1,gz);
if(belowLevel<8&&!this.terrain.isSolidPeek(gx,gy-1,gz))
this._pushQuad(data,[x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0]);
const leftH=(this._level(gx-1,gy,gz)/8)*s;
if(h>leftH+.0001){const ys=y0+leftH;this._pushQuad(data,[x0,ys,z0],[x0,ys,z1],[x0,y1,z1],[x0,y1,z0])}
const rightH=(this._level(gx+1,gy,gz)/8)*s;
if(h>rightH+.0001){const ys=y0+rightH;this._pushQuad(data,[x1,ys,z1],[x1,ys,z0],[x1,y1,z0],[x1,y1,z1])}
const frontH=(this._level(gx,gy,gz+1)/8)*s;
if(h>frontH+.0001){const ys=y0+frontH;this._pushQuad(data,[x0,ys,z1],[x1,ys,z1],[x1,y1,z1],[x0,y1,z1])}
const backH=(this._level(gx,gy,gz-1)/8)*s;
if(h>backH+.0001){const ys=y0+backH;this._pushQuad(data,[x1,ys,z0],[x0,ys,z0],[x0,y1,z0],[x1,y1,z0])}
}
if(!data.faces)return;
const geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
geometry.setIndex(data.indices);
geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
geometry.userData={faces:data.faces,cells:data.cells,internalFacesCulled:true,quantizedLevels:8};
const mesh=new THREE.Mesh(geometry,this.material);
mesh.name='water-surface-chunk:'+chunkKey;mesh.renderOrder=30;mesh.castShadow=false;mesh.receiveShadow=true;
this.root.add(mesh);this.meshes.set(chunkKey,mesh);
}
_markAllChunks(map){
const n=this.terrain.chunkSize;
for(const key of map.keys()){
const [gx,gy,gz]=key.split(',').map(Number);
this.displayDirty.add(Math.floor(gx/n)+','+Math.floor(gy/n)+','+Math.floor(gz/n));
}
}
_beginTransition(water){
const tr=water.visualTransition;
if(!tr||tr.id===this.transitionId)return false;
this.transitionId=tr.id;this.transitionT=0;this.transitionDuration=Math.max(.2,Number(tr.duration)||.72);
this.displayLevels=new Map(tr.from);
this.targetLevels=new Map(tr.to);
for(const key of new Set([...this.displayLevels.keys(),...this.targetLevels.keys()]))this._markDisplayDirtyForKey(key);
return true;
}
update(dt=.016){
const water=this.terrain.water;if(!water)return;
if(!this.initialized){
this.initialized=true;
if(water.visualTransition){
this.transitionId=-1;
this._beginTransition(water);
}else{
this.displayLevels=new Map(water.cells);this.targetLevels=new Map(water.cells);
this._markAllChunks(this.displayLevels);this.transitionId=-1;
}
}else this._beginTransition(water);
for(const key of water.consumeDirtyChunks())this.displayDirty.add(key);
if(this.transitionT<1){
const prevT=this.transitionT;
this.transitionT=Math.min(1,this.transitionT+Math.max(0,dt)/this.transitionDuration);
const eased=1-Math.pow(1-this.transitionT,3);
const tr=this.terrain.water.visualTransition;
const sources=Array.isArray(tr?.sources)?tr.sources:[];
const keys=new Set([...this.displayLevels.keys(),...this.targetLevels.keys()]);
for(const key of keys){
const a=this.displayLevels.get(key)||0,b=this.targetLevels.get(key)||0;
const from=tr?.from?.get(key)??a;
let localT=eased;
if(sources.length){
const [gx,gy,gz]=key.split(',').map(Number);
let dist=Infinity;
for(const src of sources)dist=Math.min(dist,Math.abs(gx-src[0])+Math.abs(gy-src[1])+Math.abs(gz-src[2]));
if(b>from){
const delay=Math.min(.72,dist*.075);
localT=Math.max(0,Math.min(1,(eased-delay)/Math.max(.12,1-delay)));
}else if(b<from){
localT=Math.max(0,Math.min(1,(eased-.12)/.88));
}
}
const next=Math.max(0,Math.min(8,Math.round(from+(b-from)*localT)));
const old=this.displayLevels.get(key)||0;
if(next!==old){
if(next<=0)this.displayLevels.delete(key);else this.displayLevels.set(key,next);
this._markDisplayDirtyForKey(key);
}
}
if(this.transitionT>=1){
this.displayLevels=new Map(this.targetLevels);
this._markAllChunks(this.displayLevels);
}
}else if(this.transitionId!==water.visualTransition?.id&&water.visualTransition){
this._beginTransition(water);
}else if(!water.visualTransition&&water.version!==this._waterVersion){
this.displayLevels=new Map(water.cells);this.targetLevels=new Map(water.cells);this._markAllChunks(this.displayLevels);
}
this._waterVersion=water.version;
const dirty=[...this.displayDirty];this.displayDirty.clear();
for(const key of dirty)this._buildChunk(key);
}
stats(){
const w=this.terrain.water?.stats?.()||{cells:0,totalLayers:0,levels:8,layerHeight:this.terrain.tileSize/8};
let faces=0,renderedCells=0;
for(const mesh of this.meshes.values()){faces+=mesh.geometry.userData.faces||0;renderedCells+=mesh.geometry.userData.cells||0}
return {...w,renderMode:'chunked-visible-surface-water-v5-wavefront',renderedChunks:this.meshes.size,renderedCells,visibleFaces:faces,internalFacesCulled:true,threeDimensional:true,drawCalls:this.meshes.size,visualFlow:this.transitionT<1,visualTransitionT:this.transitionT};
}
dispose(){
for(const mesh of this.meshes.values()){this.root.remove(mesh);mesh.geometry.dispose()}
this.meshes.clear();this.material.dispose();this.scene.remove(this.root);
}
}
class TerrainChunkRenderer{
constructor(THREE,terrain,scene,settings={}){
this.THREE=THREE;this.terrain=terrain;this.scene=scene;
this.settings={radiusXZ:3,radiusY:2,texturePixels:terrain.pixelsPerMeter||128,maxBuildsPerFrame:5,...settings};
this.root=new THREE.Group();this.root.name='infinite-3d-voxel-terrain';scene.add(this.root);
this.meshes=new Map();this.visibleKeys=new Set();this.pending=[];
this.texture=createVoxelGridTexture(THREE,{size:Math.max(16,Math.round(Number(this.settings.texturePixels)||128))});
this.material=new THREE.MeshLambertMaterial({map:this.texture,vertexColors:true,side:THREE.FrontSide,toneMapped:false,transparent:true,opacity:1,depthWrite:true,flatShading:true});
this.lightGridSize=25;
this.lightGridRadius=(this.lightGridSize-1)>>1;
this.lightGridData=new Uint8Array(this.lightGridSize*this.lightGridSize);
this.lightGridTexture=new THREE.DataTexture(
this.lightGridData,this.lightGridSize,this.lightGridSize,
THREE.RedFormat,THREE.UnsignedByteType
);
this.lightGridTexture.minFilter=THREE.NearestFilter;
this.lightGridTexture.magFilter=THREE.NearestFilter;
this.lightGridTexture.wrapS=THREE.ClampToEdgeWrapping;
this.lightGridTexture.wrapT=THREE.ClampToEdgeWrapping;
this.lightGridTexture.generateMipmaps=false;
this.lightGridTexture.needsUpdate=true;
this.lightGridKey='';
this.lightGridOrigin=new THREE.Vector2();
this.darknessUniforms={
uDarkPlayer:{value:new THREE.Vector3()},
uDarkTorchOn:{value:0},
uDarkTime:{value:0},
uVoxelLightMap:{value:this.lightGridTexture},
uVoxelLightOrigin:{value:this.lightGridOrigin},
uVoxelLightSpan:{value:this.lightGridSize*this.terrain.tileSize},
uOcclusionCamera:{value:new THREE.Vector3()},
uOcclusionPlayer:{value:new THREE.Vector3()},
uOcclusionEnabled:{value:1},
uInteractionRowCenterZ:{value:this.terrain.interactionRowZ*this.terrain.tileSize},
uBlackBackRowCenterZ:{value:this.terrain.blackBackRowZ*this.terrain.tileSize},
uVoxelSize:{value:this.terrain.tileSize}
};
this.material.onBeforeCompile=shader=>{
shader.uniforms.uDarkPlayer=this.darknessUniforms.uDarkPlayer;
shader.uniforms.uDarkTorchOn=this.darknessUniforms.uDarkTorchOn;
shader.uniforms.uDarkTime=this.darknessUniforms.uDarkTime;
shader.uniforms.uVoxelLightMap=this.darknessUniforms.uVoxelLightMap;
shader.uniforms.uVoxelLightOrigin=this.darknessUniforms.uVoxelLightOrigin;
shader.uniforms.uVoxelLightSpan=this.darknessUniforms.uVoxelLightSpan;
shader.uniforms.uOcclusionCamera=this.darknessUniforms.uOcclusionCamera;
shader.uniforms.uOcclusionPlayer=this.darknessUniforms.uOcclusionPlayer;
shader.uniforms.uOcclusionEnabled=this.darknessUniforms.uOcclusionEnabled;
shader.uniforms.uInteractionRowCenterZ=this.darknessUniforms.uInteractionRowCenterZ;
shader.uniforms.uBlackBackRowCenterZ=this.darknessUniforms.uBlackBackRowCenterZ;
shader.uniforms.uVoxelSize=this.darknessUniforms.uVoxelSize;
shader.vertexShader=shader.vertexShader
.replace('#include <common>','#include <common>\nattribute float darkness;\nvarying float vVoxelDarkness;\nvarying vec3 vVoxelWorldPos;\nvarying vec3 vVoxelWorldNormal;')
.replace('#include <begin_vertex>','#include <begin_vertex>\nvVoxelDarkness=darkness;\nvVoxelWorldPos=(modelMatrix*vec4(position,1.0)).xyz;\nvVoxelWorldNormal=normalize(mat3(modelMatrix)*normal);');
shader.fragmentShader=shader.fragmentShader
.replace('#include <common>','#include <common>\nvarying float vVoxelDarkness;\nvarying vec3 vVoxelWorldPos;\nvarying vec3 vVoxelWorldNormal;\nuniform vec3 uDarkPlayer;\nuniform float uDarkTorchOn;\nuniform float uDarkTime;\nuniform sampler2D uVoxelLightMap;\nuniform vec2 uVoxelLightOrigin;\nuniform float uVoxelLightSpan;\nuniform vec3 uOcclusionCamera;\nuniform vec3 uOcclusionPlayer;\nuniform float uOcclusionEnabled;\nuniform float uInteractionRowCenterZ;\nuniform float uBlackBackRowCenterZ;\nuniform float uVoxelSize;')
.replace('#include <opaque_fragment>',`
vec2 lightUv=(vVoxelWorldPos.xy-uVoxelLightOrigin)/uVoxelLightSpan;
float inside=step(0.0,lightUv.x)*step(lightUv.x,1.0)*step(0.0,lightUv.y)*step(lightUv.y,1.0);
float gridReveal=texture2D(uVoxelLightMap,clamp(lightUv,0.001,0.999)).r*inside;
float reveal=gridReveal;
float effectiveDarkness=clamp(vVoxelDarkness,0.0,1.0);
float darknessVisibility=mix(1.0,0.01+0.99*reveal,effectiveDarkness);
outgoingLight*=darknessVisibility;
vec3 voxelCell=floor((vVoxelWorldPos-vVoxelWorldNormal*(uVoxelSize*0.01))/uVoxelSize);
float colorHash=fract(sin(dot(voxelCell,vec3(12.9898,78.233,37.719)))*43758.5453);
float colorHash2=fract(sin(dot(voxelCell+17.0,vec3(39.3468,11.135,83.155)))*24634.6345);
float valueShift=mix(0.82,1.18,colorHash);
float warmShift=(colorHash2-.5)*0.080;
outgoingLight*=vec3(
valueShift*(1.0+warmShift),
valueShift,
valueShift*(1.0-warmShift)
);
vec3 seg=uOcclusionPlayer-uOcclusionCamera;
float segLen2=max(dot(seg,seg),0.0001);
float t=clamp(dot(vVoxelWorldPos-uOcclusionCamera,seg)/segLen2,0.0,1.0);
vec3 nearest=uOcclusionCamera+seg*t;
float distToSight=length(vVoxelWorldPos-nearest);
float rowHalf=uVoxelSize*0.52;
bool protectedInteraction=abs(vVoxelWorldPos.z-uInteractionRowCenterZ)<=rowHalf;
bool protectedBlack=abs(vVoxelWorldPos.z-uBlackBackRowCenterZ)<=rowHalf;
float inFront=step(0.03,t)*step(t,0.97);
float radius=1.15;
float fade=1.0-smoothstep(radius*.55,radius,distToSight);
float occlusionAlpha=mix(1.0,0.18,fade*inFront*uOcclusionEnabled);
if(protectedInteraction||protectedBlack)occlusionAlpha=1.0;
#include <opaque_fragment>
gl_FragColor.a*=occlusionAlpha;
`);
this.terrainShader=shader;
};
this.material.customProgramCacheKey=()=> 'paperchalk-whole-voxel-color-v15';
this.unsubscribe=terrain.subscribe(event=>this._onTerrainChanged(event));
}
_markDirty(cx,cy,cz){
const record=this.meshes.get(this.terrain.chunkKey(cx,cy,cz));
if(record)record.version=-1;
}
_onTerrainChanged(event){
if(event.reload){for(const r of this.meshes.values())r.version=-1;return}
if(![event.cx,event.cy,event.cz].every(Number.isFinite))return;
this._markDirty(event.cx,event.cy,event.cz);
const n=this.terrain.chunkSize;
const lx=((event.gx%n)+n)%n,ly=((event.gy%n)+n)%n,lz=((event.gz%n)+n)%n;
if(lx===0)this._markDirty(event.cx-1,event.cy,event.cz);
if(lx===n-1)this._markDirty(event.cx+1,event.cy,event.cz);
if(ly===0)this._markDirty(event.cx,event.cy-1,event.cz);
if(ly===n-1)this._markDirty(event.cx,event.cy+1,event.cz);
if(lz===0)this._markDirty(event.cx,event.cy,event.cz-1);
if(lz===n-1)this._markDirty(event.cx,event.cy,event.cz+1);
}
_build(cx,cy,cz){
const chunk=this.terrain.getChunk(cx,cy,cz);
const geometry=buildVoxelChunkGeometry(this.THREE,this.terrain,chunk,{palette:DEFAULT_TERRAIN_PALETTE});
const mesh=new this.THREE.Mesh(geometry,this.material);
const span=chunk.size*this.terrain.tileSize;
mesh.name='voxel-chunk:'+cx+','+cy+','+cz;
mesh.position.set(cx*span,cy*span,cz*span-this.terrain.tileSize*.5);
mesh.receiveShadow=true;mesh.castShadow=true;
mesh.userData={cx,cy,cz,...geometry.userData};
return {mesh,version:chunk.version,cx,cy,cz};
}
_ensure(cx,cy,cz){
const key=this.terrain.chunkKey(cx,cy,cz),chunk=this.terrain.getChunk(cx,cy,cz);
let record=this.meshes.get(key);
if(record&&record.version===chunk.version)return record;
if(record){this.root.remove(record.mesh);record.mesh.geometry.dispose()}
record=this._build(cx,cy,cz);this.meshes.set(key,record);this.root.add(record.mesh);return record;
}
_torchLineClear(x0,y0,x1,y1,gz){
let x=x0,y=y0;
const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0);
const sx=x0<x1?1:-1,sy=y0<y1?1:-1;
let err=dx-dy;
while(!(x===x1&&y===y1)){
const e2=err*2;
if(e2>-dy){err-=dy;x+=sx}
if(e2<dx){err+=dx;y+=sy}
if(x===x1&&y===y1)break;
if(this.terrain.isSolidPeek(x,y,gz))return false;
}
return true;
}
_updateVoxelLightMap(player,torchOn){
const cell=this.terrain.worldToCell(player.x,player.y,player.z);
const key=cell.gx+','+cell.gy+','+cell.gz+','+(torchOn?1:0)+','+this.terrain.changeVersion;
if(key===this.lightGridKey)return;
this.lightGridKey=key;
const r=this.lightGridRadius,n=this.lightGridSize,s=this.terrain.tileSize;
const minX=cell.gx-r,minY=cell.gy-r;
this.lightGridOrigin.set(minX*s,minY*s);
const torchRadius=10.5;
for(let j=0;j<n;j++)for(let i=0;i<n;i++){
const gx=minX+i,gy=minY+j;
const dx=gx-cell.gx,dy=gy-cell.gy;
const dist=Math.hypot(dx,dy);
let reveal=0;
if(dist<=1.25)reveal=1;
else if(torchOn&&dist<=torchRadius&&this._torchLineClear(cell.gx,cell.gy,gx,gy,cell.gz)){
const falloff=1-Math.max(0,(dist-1.2)/(torchRadius-1.2));
reveal=Math.max(.08,Math.pow(falloff,.72));
}
this.lightGridData[j*n+i]=Math.max(0,Math.min(255,Math.round(reveal*255)));
}
this.lightGridTexture.needsUpdate=true;
}
setCameraOcclusion(cameraPosition,playerPosition,enabled=true){
if(cameraPosition)this.darknessUniforms.uOcclusionCamera.value.copy(cameraPosition);
if(playerPosition)this.darknessUniforms.uOcclusionPlayer.value.copy(playerPosition);
this.darknessUniforms.uOcclusionEnabled.value=enabled?1:0;
}
update(player,{torchOn=false,time=0}={}){
if(!player)return;
this._updateVoxelLightMap(player,torchOn);
this.darknessUniforms.uDarkPlayer.value.set(player.x,player.y,player.z);
this.darknessUniforms.uDarkTorchOn.value=torchOn?1:0;
this.darknessUniforms.uDarkTime.value=Number(time)||0;
const span=this.terrain.chunkSize*this.terrain.tileSize;
const ccx=Math.floor(player.x/span),ccy=Math.floor(player.y/span),ccz=Math.floor(player.z/span);
const next=new Set(),queue=[];
const rx=Math.max(1,this.settings.radiusXZ|0),ry=Math.max(1,this.settings.radiusY|0);
for(let dy=-ry;dy<=ry;dy++)for(let dz=-rx;dz<=rx;dz++)for(let dx=-rx;dx<=rx;dx++){
const cx=ccx+dx,cy=ccy+dy,cz=ccz+dz;
if(this.terrain.chunkMayContainTerrain&&!this.terrain.chunkMayContainTerrain(cx,cy,cz))continue;
const key=this.terrain.chunkKey(cx,cy,cz);
next.add(key);
const record=this.meshes.get(key);
if(!record||record.version<0)queue.push({cx,cy,cz,d:dx*dx+dy*dy+dz*dz});
else record.mesh.visible=true;
}
queue.sort((a,b)=>a.d-b.d);
const budget=Math.max(1,this.settings.maxBuildsPerFrame|0);
for(let i=0;i<Math.min(budget,queue.length);i++){
const q=queue[i],r=this._ensure(q.cx,q.cy,q.cz);r.mesh.visible=true;
}
for(const [key,record] of [...this.meshes]){
if(next.has(key))continue;
this.root.remove(record.mesh);record.mesh.geometry.dispose();this.meshes.delete(key);
this.terrain.unloadChunk(record.cx,record.cy,record.cz);
}
this.visibleKeys=next;
}
setDebug(enabled){this.material.wireframe=!!enabled;this.material.needsUpdate=true}
stats(){
let visible=0,solid=0,quads=0,unitFaces=0,triangles=0;
for(const key of this.visibleKeys){
const r=this.meshes.get(key);if(!r?.mesh.visible)continue;visible++;
const u=r.mesh.userData||{};solid+=u.solidVoxels||0;quads+=u.quads||0;unitFaces+=u.unitFaces||0;triangles+=u.triangles||0;
}
return {visibleChunks:visible,renderedSolidVoxels:solid,renderedSolidTiles:solid,renderedQuads:quads,representedUnitFaces:unitFaces,terrainTriangles:triangles,dimensions:3,infinite:true,blockGeometry:'3d-cube',texturePixels:this.texture?.image?.width||this.settings.texturePixels||128,greedyRatio:quads?unitFaces/quads:1,...this.terrain.stats()};
}
dispose(){
this.unsubscribe?.();for(const r of this.meshes.values())r.mesh.geometry.dispose()
this.texture.dispose();this.lightGridTexture.dispose();this.material.dispose();this.scene.remove(this.root);
}
}
class FishSchoolRenderer{
constructor(THREE,scene,{capacity=32}={}){
this.THREE=THREE;this.scene=scene;this.capacity=capacity;this.root=new THREE.Group();this.root.name='fish-ecology-instanced';scene.add(this.root);
const shape=new THREE.Shape();
shape.moveTo(-.34,0);shape.quadraticCurveTo(-.08,.20,.24,.12);shape.lineTo(.39,.25);shape.lineTo(.34,0);shape.lineTo(.39,-.25);shape.lineTo(.24,-.12);shape.quadraticCurveTo(-.08,-.20,-.34,0);shape.closePath();
this.geometry=new THREE.ShapeGeometry(shape);
this.materials={
'paper-carp':new THREE.MeshLambertMaterial({color:0xb77b55,side:THREE.DoubleSide,flatShading:true}),
'bluefin-minnow':new THREE.MeshLambertMaterial({color:0x5b89a5,side:THREE.DoubleSide,flatShading:true}),
'golden-paperfish':new THREE.MeshLambertMaterial({color:0xd9b64b,side:THREE.DoubleSide,flatShading:true})
};
this.meshes={};
for(const [species,material] of Object.entries(this.materials)){
const mesh=new THREE.InstancedMesh(this.geometry,material,capacity);
mesh.name='fish-school:'+species;mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
this.root.add(mesh);this.meshes[species]=mesh;
}
this.dummy=new THREE.Object3D();this.statsState={active:0,drawCalls:0,species:{}};
}
update(snapshot,camera,time=0){
const fish=Array.isArray(snapshot?.fish)?snapshot.fish:[];
const buckets={'paper-carp':[],'bluefin-minnow':[],'golden-paperfish':[]};
for(const f of fish){
if(!buckets[f.species]||f.state==='hooked')continue;
buckets[f.species].push(f);
}
let active=0,drawCalls=0;const speciesStats={};
for(const [species,mesh] of Object.entries(this.meshes)){
const list=buckets[species],count=Math.min(this.capacity,list.length);mesh.count=count;
if(count)drawCalls++;
for(let i=0;i<count;i++){
const f=list[i],speed=Math.hypot(f.vx||0,f.vz||0),face=(f.vx||0)>=0?1:-1;
this.dummy.position.set(f.x,f.y,f.z);
this.dummy.quaternion.copy(camera.quaternion);
const bob=1+Math.sin(time*5+f.id*.73)*.035;
const size=(Number(f.size)||.6)*bob;
this.dummy.scale.set(face*size,size*.66,size);
this.dummy.updateMatrix();mesh.setMatrixAt(i,this.dummy.matrix);
}
mesh.instanceMatrix.needsUpdate=true;
active+=count;speciesStats[species]=count;
}
this.statsState={active,drawCalls,species:speciesStats,renderMode:'pooled-instanced-paper-fish'};
}
stats(){return this.statsState}
dispose(){
for(const mesh of Object.values(this.meshes))this.root.remove(mesh);
this.geometry.dispose();for(const material of Object.values(this.materials))material.dispose();
this.scene.remove(this.root);
}
}
class FishingRenderer{
constructor(THREE,scene){
this.THREE=THREE;this.scene=scene;this.root=new THREE.Group();this.root.name='fishing-system';scene.add(this.root);
this.lineGeometry=new THREE.BufferGeometry();
this.lineMaterial=new THREE.LineBasicMaterial({color:0xe6ddc9,transparent:true,opacity:.9,depthTest:true});
this.line=new THREE.Line(this.lineGeometry,this.lineMaterial);this.line.visible=false;this.root.add(this.line);
this.rodGeometry=new THREE.BufferGeometry();
this.rodMaterial=new THREE.LineBasicMaterial({color:0x5b3824,depthTest:true});
this.rod=new THREE.Line(this.rodGeometry,this.rodMaterial);this.rod.visible=false;this.root.add(this.rod);
const bobber=new THREE.Group();
const body=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),new THREE.MeshLambertMaterial({color:0xf0eee5,flatShading:true}));
body.scale.y=1.25;
const cap=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),new THREE.MeshLambertMaterial({color:0xd64f42,flatShading:true}));
cap.position.y=.08;bobber.add(body,cap);bobber.visible=false;this.root.add(bobber);this.bobber=bobber;
const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
const ctx=canvas.getContext('2d');ctx.clearRect(0,0,256,128);
ctx.fillStyle='rgba(40,34,28,.9)';ctx.strokeStyle='#f3d36b';ctx.lineWidth=8;
if(ctx.roundRect){ctx.beginPath();ctx.roundRect(8,8,240,112,24);ctx.fill();ctx.stroke()}else{ctx.fillRect(8,8,240,112);ctx.strokeRect(8,8,240,112)}
ctx.fillStyle='#fff4dd';ctx.font='900 58px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('！收杆',128,67);
const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
this.prompt=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
this.prompt.scale.set(1.35,.68,1);this.prompt.visible=false;this.prompt.renderOrder=2000;this.root.add(this.prompt);this.promptTexture=tex;
const fishCanvas=document.createElement('canvas');fishCanvas.width=128;fishCanvas.height=128;
const fctx=fishCanvas.getContext('2d');fctx.font='86px sans-serif';fctx.textAlign='center';fctx.textBaseline='middle';fctx.fillText('🐟',64,70);
const ftex=new THREE.CanvasTexture(fishCanvas);ftex.colorSpace=THREE.SRGBColorSpace;
this.fishSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:ftex,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
this.fishSprite.scale.set(.62,.62,1);this.fishSprite.visible=false;this.fishSprite.renderOrder=1999;this.root.add(this.fishSprite);this.fishTexture=ftex;
this.statsState={visible:false,state:'idle',prompt:false,targetFishEntityId:null};
}
update(snapshot,camera,time=0){
const f=snapshot?.fishing,p=snapshot?.player;
if(!f||f.state==='idle'||!p){
this.line.visible=false;this.rod.visible=false;this.bobber.visible=false;this.prompt.visible=false;this.fishSprite.visible=false;
this.statsState={visible:false,state:'idle',prompt:false,targetFishEntityId:null};return;
}
const THREE=this.THREE,dir=p.facingX||1;
const hand=new THREE.Vector3(p.x+dir*.18,p.y+.32,p.z+.06),tip=new THREE.Vector3(p.x+dir*.78,p.y+.92,p.z+.06),end=new THREE.Vector3(f.x,f.y,f.z);
this.rodGeometry.setFromPoints([hand,tip]);this.rod.visible=true;
this.lineGeometry.setFromPoints([tip,end]);this.line.visible=true;
this.bobber.visible=true;this.bobber.position.copy(end);
const bite=f.state==='bite',floatScale=bite?1+Math.sin(time*15)*.16:1+Math.sin(time*4)*.03;
this.bobber.scale.set(floatScale,floatScale,floatScale);
this.prompt.visible=bite;
if(bite){
this.prompt.position.set(f.x,f.y+.72,f.z);
const pulse=1+Math.sin(time*12)*.08;this.prompt.scale.set(1.35*pulse,.68*pulse,1);this.prompt.quaternion.copy(camera.quaternion);
}
this.fishSprite.visible=f.state==='reeling';
if(this.fishSprite.visible){this.fishSprite.position.set(f.x,f.y-.28,f.z+.02);this.fishSprite.quaternion.copy(camera.quaternion)}
this.statsState={visible:true,state:f.state,prompt:bite,targetFishEntityId:f.targetFishEntityId??null};
}
stats(){return {...this.statsState,renderMode:'line+bobber+worldspace-bite-ui-v2'}}
dispose(){
this.lineGeometry.dispose();this.lineMaterial.dispose();this.rodGeometry.dispose();this.rodMaterial.dispose();
this.bobber.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.()});
this.prompt.material.dispose();this.promptTexture.dispose();this.fishSprite.material.dispose();this.fishTexture.dispose();
this.scene.remove(this.root);
}
}
export class World3DEngine{
constructor({THREE,host,content,onCameraChanged=null}){
if(!THREE)throw new Error('THREE_REQUIRED');
if(!host)throw new Error('THREE_HOST_REQUIRED');
if(!window.PaperchalkTerrain)throw new Error('PAPERCHALK_TERRAIN_REQUIRED');
this.THREE=THREE;this.host=host;this.content=content||{};
this.terrain=window.PaperchalkTerrain;
this.interactionRowZ=Number(this.content?.scene3d?.terrain?.interactionRowZ??0);
this.onCameraChanged=typeof onCameraChanged==='function'?onCameraChanged:null;
this.sceneData=this.content.scene3d||{};
this.layers=this.sceneData.layers||{far:-8,rear:-3,terrain:0,actor:.45,front:2.5};
this.scene=new THREE.Scene();
this.fixedBackgroundColor=new THREE.Color(0x6f7fa8);
this.scene.background=this.fixedBackgroundColor.clone();
this.camera=new THREE.PerspectiveCamera(42,1,.05,140);
this.cameraRig={yaw:.72,pitch:.38,distance:12,minDistance:4,maxDistance:28,height:.65,fov:42};
this.stageView={enabled:false,axis:'z',side:1};
this.cameraTarget=new THREE.Vector3();
this.cameraTargetSmooth=new THREE.Vector3();
this.lastSnapshot=null;this.playerSprite=null;this.healthBar=null;this.fishingRenderer=null;this.fishSchoolRenderer=null;
this.cameraOcclusion={enabled:true,radius:1.15,minOpacity:.18,entityStates:new Map(),terrainShader:true};
this.paperStyle={enabled:true};
this.debugColliders=false;this.pointerState=null;
this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
const coarse=matchMedia('(pointer:coarse)').matches;
this.mobileLike=coarse;
this.pixelRatio=Math.max(1,Math.min(Number(devicePixelRatio)||1,coarse?1.5:2));
this.renderer.setPixelRatio(this.pixelRatio);
this.renderer.outputColorSpace=THREE.SRGBColorSpace;
this.renderer.setClearColor(this.fixedBackgroundColor,1);
this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
this.renderer.toneMappingExposure=1.08;
this.renderer.shadowMap.enabled=true;
this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
this.renderer.domElement.className='three-world-canvas';
this.renderer.domElement.setAttribute('aria-label','Paperchalk infinite 3D voxel world');
this.renderer.domElement.tabIndex=0;this.renderer.domElement.style.touchAction='none';
host.replaceChildren(this.renderer.domElement);
this._buildStage();
this._installCameraInput();
this.resize();
}
_buildStage(){
const THREE=this.THREE;
const sun=new THREE.DirectionalLight(0xffe7c2,2.65);
sun.name='world-sun';
sun.castShadow=true;
sun.position.set(18,32,14);
sun.shadow.mapSize.set(this.mobileLike?1024:2048,this.mobileLike?1024:2048);
sun.shadow.camera.near=.5;
sun.shadow.camera.far=120;
sun.shadow.camera.left=-32;sun.shadow.camera.right=32;
sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;
sun.shadow.bias=-0.0002;
sun.shadow.normalBias=.025;
this.scene.add(sun);
this.scene.add(sun.target);
const skyFill=new THREE.HemisphereLight(0xdce9f4,0x7a6049,1.0);
skyFill.name='sky-environment-bounce';
this.scene.add(skyFill);
const ambient=new THREE.AmbientLight(0x9b968d,.14);
ambient.name='soft-global-bounce';
this.scene.add(ambient);
const moon=new THREE.DirectionalLight(0x8eb6ff,.0);
moon.name='world-moon';
moon.castShadow=true;
moon.shadow.mapSize.set(this.mobileLike?512:1024,this.mobileLike?512:1024);
moon.shadow.camera.near=.5;
moon.shadow.camera.far=110;
moon.shadow.camera.left=-28;moon.shadow.camera.right=28;
moon.shadow.camera.top=28;moon.shadow.camera.bottom=-28;
moon.shadow.bias=-0.00025;
moon.shadow.normalBias=.02;
this.scene.add(moon);
this.scene.add(moon.target);
const sunDisc=new THREE.Mesh(
new THREE.SphereGeometry(2.6,24,16),
new THREE.MeshBasicMaterial({color:0xffe49a,toneMapped:false,depthWrite:false})
);
sunDisc.name='visible-sun';
sunDisc.renderOrder=-50;
this.scene.add(sunDisc);
const moonDisc=new THREE.Mesh(
new THREE.SphereGeometry(1.8,20,14),
new THREE.MeshBasicMaterial({color:0xdce7ff,toneMapped:false,depthWrite:false})
);
moonDisc.name='visible-moon';
moonDisc.renderOrder=-50;
this.scene.add(moonDisc);
this.terrainLights={sun,skyFill,ambient,moon,sunDisc,moonDisc};
this.backdrop=null;
this.terrainRenderer=new TerrainChunkRenderer(THREE,this.terrain,this.scene,{
radiusXZ:this.sceneData.terrain?.visibleChunkRadiusXZ??3,
radiusY:this.sceneData.terrain?.visibleChunkRadiusY??2,
maxBuildsPerFrame:Math.min(this.sceneData.terrain?.maxBuildsPerFrame??5,this.mobileLike?3:5),
texturePixels:this.sceneData.terrain?.texturePixels??this.terrain.pixelsPerMeter??128
});
this.paperTerrainRenderer=new PaperTerrainRenderer(THREE,this.terrain,this.scene,{
radiusXZ:this.sceneData.terrain?.visibleChunkRadiusXZ??3,
maxBuildsPerFrame:1,
paperLayerHeight:.5,
paperThickness:.30,
bevelWidth:.045,
bevelHeight:.055,
fiberStrength:.050,
printNoiseStrength:.065,
microNormalStrength:.34,
roughnessVariation:.035,
sideDarkness:.92
});
this.terrainRenderer.root.visible=false;
this.waterRenderer=new WaterRenderer(THREE,this.terrain,this.scene);
this.fishingRenderer=new FishingRenderer(THREE,this.scene);
this.fishSchoolRenderer=new FishSchoolRenderer(THREE,this.scene,{capacity:this.mobileLike?24:32});
const cursorGeometry=new THREE.BoxGeometry(
this.terrain.tileSize*1.035,
this.terrain.tileSize*1.035,
this.terrain.tileSize*1.035
);
const cursorMaterial=new THREE.MeshBasicMaterial({
color:0xf3d06b,
wireframe:true,
transparent:true,
opacity:.95,
depthTest:false,
toneMapped:false
});
this.terrainCursor=new THREE.Mesh(cursorGeometry,cursorMaterial);
this.terrainCursor.name='terrain-block-cursor';
this.terrainCursor.visible=false;
this.terrainCursor.renderOrder=1000;
this.scene.add(this.terrainCursor);
const playerTexture=new THREE.TextureLoader().load('assets/player/protagonist.webp?v=voxel3d-r1');
playerTexture.colorSpace=THREE.SRGBColorSpace;
playerTexture.magFilter=THREE.LinearFilter;
playerTexture.minFilter=THREE.LinearMipmapLinearFilter;
playerTexture.generateMipmaps=true;
this.playerSprite=new PaperSpriteEntity(THREE,{
id:'player',kind:'player',label:'',x:0,y:0,z:0,
width:1,height:2,anchorY:1,texture:playerTexture
});
this.healthBar=new WorldSpaceHealthBar(THREE,{max:10});
this.playerSprite.root.add(this.healthBar.group);
const torchRoot=new THREE.Group();
torchRoot.name='player-hand-torch';
torchRoot.position.set(.42,.15,.12);
const torchStick=new THREE.Mesh(
new THREE.BoxGeometry(.07,.55,.07),
new THREE.MeshBasicMaterial({color:0x6b4429,toneMapped:false})
);
torchStick.position.y=-.14;
const torchFlame=new THREE.Mesh(
new THREE.SphereGeometry(.11,10,8),
new THREE.MeshBasicMaterial({color:0xffb04d,toneMapped:false})
);
torchFlame.scale.set(.72,1.35,.72);
torchFlame.position.y=.19;
const torchLight=new THREE.PointLight(0xffa24f,0,10,1.7);
torchLight.name='moving-torch-light';
torchLight.position.set(0,.23,.05);
torchLight.castShadow=true;
torchLight.shadow.mapSize.set(256,256);
torchLight.shadow.camera.near=.05;
torchLight.shadow.camera.far=12.5;
torchLight.shadow.bias=-.001;
torchLight.shadow.normalBias=.02;
torchRoot.add(torchStick,torchFlame,torchLight);
torchRoot.visible=false;
this.playerSprite.root.add(torchRoot);
this.torch={root:torchRoot,flame:torchFlame,light:torchLight};
this.scene.add(this.playerSprite.root);

const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=64;
const shadowCtx=shadowCanvas.getContext('2d');
shadowCtx.save();shadowCtx.translate(64,32);shadowCtx.scale(1,.42);
const shadowGradient=shadowCtx.createRadialGradient(0,0,2,0,0,52);
shadowGradient.addColorStop(0,'rgba(54,49,58,.38)');
shadowGradient.addColorStop(.55,'rgba(54,49,58,.20)');
shadowGradient.addColorStop(1,'rgba(54,49,58,0)');
shadowCtx.fillStyle=shadowGradient;shadowCtx.beginPath();shadowCtx.arc(0,0,52,0,Math.PI*2);shadowCtx.fill();shadowCtx.restore();
const shadowTexture=new THREE.CanvasTexture(shadowCanvas);shadowTexture.colorSpace=THREE.SRGBColorSpace;
const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,opacity:.72});
const shadowMesh=new THREE.Mesh(new THREE.PlaneGeometry(1.08,.62),shadowMaterial);
shadowMesh.name='player-soft-paper-contact-shadow';shadowMesh.rotation.x=-Math.PI/2;shadowMesh.renderOrder=22;
shadowMesh.castShadow=false;shadowMesh.receiveShadow=false;this.scene.add(shadowMesh);
this.playerGroundShadow={mesh:shadowMesh,texture:shadowTexture,material:shadowMaterial};

this.atmosphere=new AtmospherePass(THREE,this.scene,{mobileLike:this.mobileLike,sun});
this.atmosphere.setExclusions([
  sunDisc,moonDisc,this.playerSprite.root,this.waterRenderer.root,
  this.fishingRenderer.root,this.fishSchoolRenderer.root,this.terrainCursor,
  this.playerGroundShadow.mesh
]);
}
_installCameraInput(){
const canvas=this.renderer.domElement;
canvas.addEventListener('pointerdown',event=>{
this.pointerState={id:event.pointerId,lastX:event.clientX,lastY:event.clientY,moved:false};
try{canvas.setPointerCapture(event.pointerId)}catch{}
});
canvas.addEventListener('pointermove',event=>{
if(!this.pointerState||event.pointerId!==this.pointerState.id)return;
const dx=event.clientX-this.pointerState.lastX,dy=event.clientY-this.pointerState.lastY;
this.pointerState.lastX=event.clientX;this.pointerState.lastY=event.clientY;
if(Math.abs(dx)+Math.abs(dy)<.3)return;
this.pointerState.moved=true;
if(this.stageView.enabled)return;
this.cameraRig.yaw-=dx*.006;
this.cameraRig.pitch=Math.max(-1.15,Math.min(1.15,this.cameraRig.pitch+dy*.004));
this._notifyCamera();
});
const release=event=>{if(this.pointerState&&event.pointerId===this.pointerState.id)this.pointerState=null};
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
canvas.addEventListener('wheel',event=>{
event.preventDefault();
this.cameraRig.distance=Math.max(this.cameraRig.minDistance,Math.min(this.cameraRig.maxDistance,this.cameraRig.distance+Math.sign(event.deltaY)*1.2));
this._notifyCamera();
},{passive:false});
}
_stageYaw(){return this.stageView.enabled?(this.stageView.axis==='x'?Math.PI*.5:0):this.cameraRig.yaw}
_notifyCamera(){
this.onCameraChanged?.({
yaw:this._stageYaw(),orbitYaw:this.cameraRig.yaw,pitch:this.cameraRig.pitch,
distance:this.cameraRig.distance,height:this.cameraRig.height,fov:this.cameraRig.fov,stageView:{...this.stageView}
});
}
setCameraConfig(config={}){
if(Number.isFinite(config.orbitYaw))this.cameraRig.yaw=config.orbitYaw;
else if(Number.isFinite(config.yaw)&&!config.stageView?.enabled)this.cameraRig.yaw=config.yaw;
if(Number.isFinite(config.pitch))this.cameraRig.pitch=Math.max(-1.15,Math.min(1.15,config.pitch));
if(Number.isFinite(config.distance))this.cameraRig.distance=Math.max(this.cameraRig.minDistance,Math.min(this.cameraRig.maxDistance,config.distance));
if(Number.isFinite(config.height))this.cameraRig.height=Math.max(-4,Math.min(8,config.height));
this.cameraRig.fov=42;this.camera.fov=42;this.camera.updateProjectionMatrix();
if(config.stageView&&typeof config.stageView==='object'){
this.stageView.enabled=config.stageView.enabled!==false;
this.stageView.axis=config.stageView.axis==='x'?'x':'z';
this.stageView.side=config.stageView.side===-1?-1:1;
}
this._notifyCamera();return this.cameraConfig();
}
setStageView(enabled,axis=this.stageView.axis){this.stageView.enabled=!!enabled;this.stageView.axis=axis==='x'?'x':'z';this.pointerState=null;this._notifyCamera();return {...this.stageView}}
toggleStageView(){return this.setStageView(!this.stageView.enabled,this.stageView.axis)}
setStageAxis(axis){this.stageView.axis=axis==='x'?'x':'z';this._notifyCamera();return {...this.stageView}}
resetCamera(){
Object.assign(this.cameraRig,{yaw:0,pitch:0,distance:18,height:.35,fov:42});
Object.assign(this.stageView,{enabled:true,axis:'z',side:1});
this.camera.fov=42;this.camera.updateProjectionMatrix();this._notifyCamera();return this.cameraConfig();
}
cameraConfig(){return {yaw:this._stageYaw(),orbitYaw:this.cameraRig.yaw,pitch:this.cameraRig.pitch,distance:this.cameraRig.distance,height:this.cameraRig.height,fov:this.cameraRig.fov,stageView:{...this.stageView}}}
setDebugColliders(enabled){this.debugColliders=!!enabled;this.terrainRenderer.setDebug(this.debugColliders);return this.debugColliders}
setSnapshot(snapshot){
this.lastSnapshot=snapshot||null;
const hp=snapshot?.health?.current;if(Number.isFinite(hp))this.healthBar?.set(hp,{animate:false});
}
onHealthChanged({current}={}){if(Number.isFinite(current))this.healthBar?.set(current,{animate:true})}
resize(){
const rect=this.host.getBoundingClientRect();
const w=Math.max(1,Math.round(rect.width||innerWidth||1280)),h=Math.max(1,Math.round(rect.height||innerHeight||720));
this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
this.atmosphere?.resize(w,h,this.renderer.getPixelRatio());
}
_groundYBelowPlayer(p){
const s=this.terrain.tileSize,gx=Math.floor(p.x/s),gz=Math.floor(p.z/s+.5);
const start=Math.floor((p.y+.15)/s);
for(let gy=start;gy>=start-14;gy--)if(this.terrain.isSolidPeek(gx,gy,gz))return (gy+1)*s;
return p.y-.95;
}
_updatePlayer(dt,snapshot){
const p=snapshot?.player;if(!p||!this.playerSprite)return;
const target=new this.THREE.Vector3(p.x,p.y,p.z);
const k=1-Math.pow(.0003,Math.max(0,dt));this.playerSprite.root.position.lerp(target,k);
this.playerSprite.root.rotation.y=this._stageYaw();
if(Math.hypot(p.vx||0,p.vz||0)>.03)this.playerSprite.setFacing(1);
this.playerSprite.update(dt);
const mesh=this.playerSprite.mesh;
if(p.action==='walk')mesh.position.y=Math.sin(performance.now()*.018)*.025;
else mesh.position.y=0;
const crouch=p.crouching?.72:1;mesh.scale.y+=(crouch-mesh.scale.y)*Math.min(1,dt*18);
if(this.torch){
const on=!!p.torchOn;
this.torch.root.visible=on;
if(on){
const flicker=.92+Math.sin(performance.now()*.017)*.06+Math.sin(performance.now()*.041)*.03;
this.torch.light.intensity=4.2*flicker;
this.torch.light.distance=12;
this.torch.flame.scale.set(.72,1.25+.18*Math.sin(performance.now()*.029),.72);
}else this.torch.light.intensity=0;
}
if(this.playerGroundShadow){
const groundY=this._groundYBelowPlayer(p),footY=p.y-.95,gap=Math.max(0,footY-groundY);
const shadow=this.playerGroundShadow;
shadow.mesh.visible=gap<5;
shadow.mesh.position.set(p.x,groundY+.012,p.z);
const spread=1+Math.min(1.2,gap*.16);shadow.mesh.scale.set(spread,spread,1);
shadow.material.opacity=.72*Math.exp(-gap*.55);
}
}
_updateCamera(dt,snapshot){
const p=snapshot?.player;if(!p)return;
const desiredTarget=new this.THREE.Vector3(p.x,p.y+this.cameraRig.height,p.z);
const k=1-Math.pow(.0005,Math.max(0,dt));
if(!this.cameraTargetSmooth.lengthSq())this.cameraTargetSmooth.copy(desiredTarget);else this.cameraTargetSmooth.lerp(desiredTarget,k);
this.cameraTarget.copy(this.cameraTargetSmooth);
let desired;
if(this.stageView.enabled){
desired=this.stageView.axis==='x'
?new this.THREE.Vector3(this.cameraTarget.x+this.stageView.side*this.cameraRig.distance,this.cameraTarget.y,this.cameraTarget.z)
:new this.THREE.Vector3(this.cameraTarget.x,this.cameraTarget.y,this.cameraTarget.z+this.stageView.side*this.cameraRig.distance);
}else{
const cp=Math.cos(this.cameraRig.pitch);
desired=new this.THREE.Vector3(
this.cameraTarget.x+Math.sin(this.cameraRig.yaw)*cp*this.cameraRig.distance,
this.cameraTarget.y+Math.sin(this.cameraRig.pitch)*this.cameraRig.distance,
this.cameraTarget.z+Math.cos(this.cameraRig.yaw)*cp*this.cameraRig.distance
);
}
this.camera.position.lerp(desired,k);this.camera.lookAt(this.cameraTarget);
}
_updateCameraOcclusion(dt,snapshot){
const p=snapshot?.player;if(!p||!this.cameraOcclusion?.enabled)return;
const playerPos=new this.THREE.Vector3(p.x,p.y,p.z);
this.terrainRenderer?.setCameraOcclusion(this.camera.position,playerPos,true);
const a=this.camera.position,b=playerPos,ab=b.clone().sub(a),len2=Math.max(.0001,ab.lengthSq());
const k=1-Math.pow(.00003,Math.max(0,dt));
this.cameraOcclusion.fadedEntities=0;

}
_skyExposureAt(player){
if(!player)return 1;
const c=this.terrain.worldToCell(player.x,player.y,player.z);
let roofDistance=Infinity;
for(let dy=1;dy<=28;dy++){
if(this.terrain.isSolidPeek(c.gx,c.gy+dy,c.gz)){roofDistance=dy;break}
}
if(!Number.isFinite(roofDistance))return 1;
if(roofDistance<=2)return .12;
if(roofDistance<=5)return .22;
if(roofDistance<=10)return .38;
return .58;
}
_updateWorldTime(snapshot){
const minutes=Number(snapshot?.world?.minutes);if(!Number.isFinite(minutes))return;
const n=((minutes%1440)+1440)%1440/1440;
const angle=(n-.25)*Math.PI*2;
const daylight=Math.max(0,Math.sin(angle));
const night=Math.max(0,-Math.sin(angle));
const twilight=Math.max(0,1-Math.abs(Math.sin(angle))*2.6);
const p=snapshot?.player||this.lastSnapshot?.player||{x:0,y:0,z:0};
const exposure=this._skyExposureAt(p);
const localSurfaceY=(this.terrain.surfaceCell(Math.floor(p.x/this.terrain.tileSize),Math.floor(p.z/this.terrain.tileSize))+1)*this.terrain.tileSize;
const undergroundDepth=Math.max(0,localSurfaceY-p.y);
const undergroundFactor=Math.max(0,Math.min(1,(undergroundDepth-.35)/2.4));
this.scene.background.copy(this.fixedBackgroundColor);
this.renderer.setClearColor(this.fixedBackgroundColor,1);
const sun=this.terrainLights?.sun,skyFill=this.terrainLights?.skyFill,ambient=this.terrainLights?.ambient,moon=this.terrainLights?.moon;
const sunDisc=this.terrainLights?.sunDisc,moonDisc=this.terrainLights?.moonDisc;
const radius=42;
const sx=Math.cos(angle)*radius;
const sy=Math.max(6,Math.abs(Math.sin(angle))*radius);
const sz=22;
if(sun){
const paperLight=this.paperStyle?.enabled!==false;
sun.intensity=daylight*(paperLight?2.65:3.4);
sun.position.set(p.x+sx,p.y+sy,p.z+sz);
sun.target.position.set(p.x,p.y-2,p.z);
sun.target.updateMatrixWorld();
}
if(skyFill){
const outdoor=this.paperStyle?.enabled!==false
?(.96+daylight*.62+twilight*.42+night*.55)
:(.76+daylight*.92+twilight*.34+night*.42);
skyFill.intensity=outdoor;
}
if(ambient){
ambient.color.set(daylight>.08?0xa9a59d:0xa9bad8);
ambient.intensity=(this.paperStyle?.enabled!==false ? .19 : .15)+daylight*.06+twilight*.08+night*.11;
}
this.renderer.toneMappingExposure=1.08+twilight*.07+night*.10;
if(moon){
moon.color.set(0xa9c6ff);
moon.intensity=night*.98+twilight*.18;
moon.position.set(p.x-sx,p.y+Math.max(10,sy*.8),p.z-sz*.7);
moon.target.position.set(p.x,p.y-1,p.z);
moon.target.updateMatrixWorld();
}
if(sunDisc){
sunDisc.visible=daylight>.02;
sunDisc.position.set(p.x+sx*1.55,p.y+sy*1.55,p.z+sz*1.55);
sunDisc.scale.setScalar(.8+daylight*.35);
}
if(moonDisc){
moonDisc.visible=night>.03;
moonDisc.position.set(p.x-sx*1.45,p.y+Math.max(14,sy*1.2),p.z-sz*1.1);
}
this.skyExposure=exposure;
this.undergroundDepth=undergroundDepth;
this.undergroundFactor=undergroundFactor;
this.atmosphere?.update({
  sunPosition:sunDisc?.position,daylight,twilight,skyExposure:exposure,underground:undergroundFactor,time:n*1440,
  fogBaseHeight:p.y-1.8,sunLight:sun,skyLight:skyFill,sunDisc
});
}
update(dt,snapshot=this.lastSnapshot){
if(snapshot)this.lastSnapshot=snapshot;
const current=this.lastSnapshot;
this._updatePlayer(dt,current);this._updateCamera(dt,current);this._updateCameraOcclusion(dt,current);this._updateWorldTime(current);
const p=current?.player;
if(this.paperStyle.enabled){
this.terrainRenderer.root.visible=false;
this.paperTerrainRenderer?.setEnabled(true);
this.paperTerrainRenderer?.update(p);
}else{
this.paperTerrainRenderer?.setEnabled(false);
this.terrainRenderer.root.visible=true;
this.terrainRenderer.update(p,{torchOn:!!p?.torchOn,time:performance.now()/1000});
}
this.waterRenderer?.update(dt);
const renderTime=performance.now()/1000;
this.fishSchoolRenderer?.update(current,this.camera,renderTime);
this.fishingRenderer?.update(current,this.camera,renderTime);
this.healthBar?.update(this.camera,dt);
}
render(){
const bg=this.atmosphere?.skyColor||this.fixedBackgroundColor;
this.scene.background.copy(bg);this.renderer.setClearColor(bg,1);
this.renderer.render(this.scene,this.camera);
this.atmosphere?.render(this.renderer,this.scene,this.camera);
}
_screenRay(clientX,clientY){
const rect=this.renderer.domElement.getBoundingClientRect();
const ndc=new this.THREE.Vector2(((clientX-rect.left)/Math.max(1,rect.width))*2-1,-((clientY-rect.top)/Math.max(1,rect.height))*2+1);
const ray=new this.THREE.Raycaster();ray.setFromCamera(ndc,this.camera);return ray.ray;
}
_raycastVoxel(ray,maxDistance=8,{interactionOnly=false}={}){
const s=this.terrain.tileSize,origin=ray.origin.clone().multiplyScalar(1/s),dir=ray.direction.clone();
origin.z+=.5;
let x=Math.floor(origin.x),y=Math.floor(origin.y),z=Math.floor(origin.z);
const sx=dir.x>0?1:dir.x<0?-1:0,sy=dir.y>0?1:dir.y<0?-1:0,sz=dir.z>0?1:dir.z<0?-1:0;
const inf=Infinity;
const dx=sx?Math.abs(1/dir.x):inf,dy=sy?Math.abs(1/dir.y):inf,dz=sz?Math.abs(1/dir.z):inf;
let tx=sx>0?(x+1-origin.x)*dx:sx<0?(origin.x-x)*dx:inf;
let ty=sy>0?(y+1-origin.y)*dy:sy<0?(origin.y-y)*dy:inf;
let tz=sz>0?(z+1-origin.z)*dz:sz<0?(origin.z-z)*dz:inf;
let px=x,py=y,pz=z,dist=0;
for(let i=0;i<512&&dist*s<=maxDistance;i++){
const tile=this.terrain.peekVoxel(x,y,z);
const solid=this.terrain.isSolidTile(tile);
const interactable=!interactionOnly||z===this.interactionRowZ;
if(solid&&interactable)return {gx:x,gy:y,gz:z,tile,previous:{gx:px,gy:py,gz:pz},distance:dist*s};
px=x;py=y;pz=z;
if(tx<ty&&tx<tz){x+=sx;dist=tx;tx+=dx}
else if(ty<tz){y+=sy;dist=ty;ty+=dy}
else{z+=sz;dist=tz;tz+=dz}
}
return null;
}
screenToWorld(clientX,clientY){
const hit=this._raycastVoxel(this._screenRay(clientX,clientY),10,{interactionOnly:true});
if(!hit)return null;
return this.terrain.cellCenter(hit.gx,hit.gy,hit.gz);
}
screenToWaterSurface(clientX,clientY,{maxDistance=32}={}){
const ray=this._screenRay(clientX,clientY);
const p=new this.THREE.Vector3();
const step=Math.max(.04,this.terrain.tileSize*.06);
for(let d=0;d<=maxDistance;d+=step){
ray.at(d,p);
const surface=this.terrain.water?.surfaceAtWorld?.(p.x,p.z);
if(!surface)continue;
if(p.y<=surface.y+.10&&p.y>=surface.y-.22){
return {x:p.x,y:surface.y,z:p.z,gx:surface.gx,gz:surface.gz,distance:d};
}
}
return null;
}
screenToTerrainCell(clientX,clientY,{showCursor=true}={}){
const hit=this._raycastVoxel(this._screenRay(clientX,clientY),10,{interactionOnly:true});
if(!hit){if(this.terrainCursor)this.terrainCursor.visible=false;return null}
const center=this.terrain.cellCenter(hit.gx,hit.gy,hit.gz);
const previousOnRow=hit.previous.gz===this.interactionRowZ;
const placeCell=previousOnRow?hit.previous:{gx:hit.gx,gy:hit.gy+1,gz:this.interactionRowZ};
const place=this.terrain.cellCenter(placeCell.gx,placeCell.gy,placeCell.gz);
const result={...center,gx:hit.gx,gy:hit.gy,gz:hit.gz,tile:hit.tile,solid:true,interactionRowZ:this.interactionRowZ,placeGx:placeCell.gx,placeGy:placeCell.gy,placeGz:placeCell.gz,placeX:place.x,placeY:place.y,placeZ:place.z,distance:hit.distance};
if(showCursor&&this.terrainCursor){this.terrainCursor.position.set(center.x,center.y,center.z);this.terrainCursor.visible=true}
return result;
}
hideTerrainCursor(){
if(this.terrainCursor)this.terrainCursor.visible=false;
}
stats(){
const info=this.renderer.info?.render||{};
return {
renderer:this.renderer.constructor?.name||'WebGLRenderer',
worldMode:'infinite-voxel-3d',
terrainMode:'streamed-3d-voxel-chunks',
entityMode:'paper-sprites-in-3d',
drawCalls:Number(info.calls)||0,triangles:Number(info.triangles)||0,
sceneChildren:this.scene.children.length,pixelRatio:this.pixelRatio,mobileQualityProfile:this.mobileLike?'balanced-mobile':'desktop',
health:this.healthBar?.snapshot()||null,camera:this.cameraConfig(),stageView:{...this.stageView},
debugColliders:this.debugColliders,
terrain:this.terrainRenderer.stats(),
paperTerrain:this.paperTerrainRenderer?.snapshot?.()||null,
voxelTerrain:this.terrainRenderer.stats(),
water:this.waterRenderer?.stats?.()||null,fishing:this.fishingRenderer?.stats?.()||null,fishEcology:this.fishSchoolRenderer?.stats?.()||null,
atmosphere:this.atmosphere?.stats?.()||null,
lighting:{mode:'soft-cardstock+night-readable+shadowmap-volumetrics',contactShadow:'soft-worldspace-player-shadow',backgroundMode:'fixed-uniform-blue',backgroundColor:'#6f7fa8',skyExposure:this.skyExposure??1,undergroundDepth:this.undergroundDepth??0,undergroundFactor:this.undergroundFactor??0,visibleSun:!!this.terrainLights?.sunDisc?.visible,visibleMoon:!!this.terrainLights?.moonDisc?.visible,sunIntensity:this.terrainLights?.sun?.intensity??0,skyFillIntensity:this.terrainLights?.skyFill?.intensity??0,ambientIntensity:this.terrainLights?.ambient?.intensity??0,moonIntensity:this.terrainLights?.moon?.intensity??0,torchOn:!!this.torch?.root?.visible,torchIntensity:this.torch?.light?.intensity??0,shadows:this.renderer.shadowMap.enabled},
interaction:{rowZ:this.interactionRowZ,rowCenterZ:this.interactionRowZ*this.terrain.tileSize,zMovementLocked:true,raycastIgnoresOtherRows:true},
undergroundLayers:{count:2,interactionRowZ:this.interactionRowZ,blackBackRowZ:this.terrain.blackBackRowZ,rearAbsoluteBlack:true,rearSolidBelowSurface:true},
cameraOcclusion:{mode:'camera-player-capsule-fade-v2',enabled:this.cameraOcclusion?.enabled!==false,radius:this.cameraOcclusion?.radius??1.15,minOpacity:this.cameraOcclusion?.minOpacity??.18,fadedEntities:this.cameraOcclusion?.fadedEntities??0,protectInteractionRow:true,protectBlackBackRow:true,terrainShader:true},
undergroundOcclusion:{mode:'two-layer-black-back-v10',backgroundProvidesBlack:false,noBuriedDepthFaces:true,blackProvidedByRearVoxelRow:true},
paperEntities:1,legacyStagePlaceholders:0,playerGeometry:'PlaneGeometry',
playerTextureSize:{width:this.playerSprite?.texture?.image?.naturalWidth||this.playerSprite?.texture?.image?.width||0,height:this.playerSprite?.texture?.image?.naturalHeight||this.playerSprite?.texture?.image?.height||0},
terrainBlockGeometry:this.paperStyle.enabled?'merged extruded cardboard slabs':'3-axis greedy voxel BufferGeometry',
paperStyle:{enabled:this.paperStyle.enabled,visualOnly:true,gameplayGridUnchanged:true},
flatShading:true
};
}
setPaperStyle(enabled=true){
this.paperStyle.enabled=!!enabled;
this.paperTerrainRenderer?.setEnabled(this.paperStyle.enabled);
if(this.terrainRenderer?.root)this.terrainRenderer.root.visible=!this.paperStyle.enabled;
return this.paperStyle.enabled;
}
configurePaperTerrain(patch={}){
return this.paperTerrainRenderer?.configure?.(patch)||null;
}
configureAtmosphere(patch={}){
return this.atmosphere?.configure?.(patch)||null;
}
dispose(){
this.atmosphere?.dispose();
this.paperTerrainRenderer?.dispose();
this.terrainRenderer?.dispose();
this.waterRenderer?.dispose();
this.fishingRenderer?.dispose();
this.fishSchoolRenderer?.dispose();
if(this.terrainCursor){
this.terrainCursor.geometry.dispose();
this.terrainCursor.material.dispose();
}
if(this.torch){
this.torch.root.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.()});
}
if(this.playerGroundShadow){
this.scene.remove(this.playerGroundShadow.mesh);
this.playerGroundShadow.mesh.geometry.dispose();
this.playerGroundShadow.material.dispose();
this.playerGroundShadow.texture.dispose();
}
this.playerSprite?.dispose();
this.renderer.dispose();this.host.replaceChildren();
}
}