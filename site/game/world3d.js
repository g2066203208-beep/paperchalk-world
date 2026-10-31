/* PAPERWORLD low-resolution native WebGL 3D town.
 * WORLD: X forward / Y left / Z vertical. Geometry is real depth-tested
 * triangles with 4 exact palette colors; no Three/CDN/API dependency.
 */
import {MotionPose,projectionMatrix,RAD,clamp} from './motion3d.js?v=20261030-gyrocontrol7';
import {LeanCamera} from './lean3d.js?v=20261030-gyrocomfort6';
import {BodyMotor} from './locomotion3d.js?v=20261030-gyrocomfort6';
import {ShopOpeningLoop} from './shoploop.js?v=20261030-shopgyro8';
import {createMaterialBatch} from './world-material-gl.js';
import {tryReadPack} from '../world-builder/materials-core.js';
const INK=[57/255,54/255,87/255],PINK=[242/255,165/255,194/255];
const BLUE=[169/255,186/255,233/255],PAPER=[1,245/255,230/255];
const PALETTE=[INK,PINK,BLUE,PAPER];
const $=id=>document.getElementById(id);
function makeTown(lod='full'){
 const verts=[],cols=[],lines=[],lineCols=[],solids=[];
 // Stable IDs into the same editable 32-material atlas used by Material Studio.
 const MAT={stone:0,brick:1,wood:2,plaster:3,roof:4,paving:5,grass:6,glass:7,
  wildgrass:8,clover:9,flowers:10,dirt:11,pebbles:12,sand:13,moss:14,gravel:15,
  cobble:16,path:17,asphalt:18,sidewalk:19,wetsoil:20,limestone:21,
  timber:22,wallblue:23,door:24,doorframe:25,window:26,windowlit:27,
  bark:28,leavesblue:29,leavespink:30,hedge:31};
 const hash=(x,y)=>{let t=Math.imul(x|0,374761393)+Math.imul(y|0,668265263);t=Math.imul(t^(t>>>13),1274126177);return (t^(t>>>16))>>>0};
 const materialPosition=[],materialUV=[],materialID=[];
 function vertex(p,c){verts.push(...p);cols.push(...PALETTE[c])}
 function line(a,b,c){lines.push(...a,...b);lineCols.push(...PALETTE[c],...PALETTE[c])}
 function quad(a,b,c,d,k,outline=false,material=-1){
  for(const p of [a,b,c,a,c,d])vertex(p,k);
  if(material>=0){
   // Real UV mapped triangles following the exact physical faces of this mesh.
   // One 16px material tile corresponds to about 2m of surface.
   const length=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);
   const u=Math.max(1/16,length(a,b)/2),v=Math.max(1/16,length(b,c)/2);
   const coords=[a,b,c,a,c,d],tex=[[0,0],[u,0],[u,v],[0,0],[u,v],[0,v]];
   coords.forEach((p,i)=>{materialPosition.push(...p);materialUV.push(...tex[i]);materialID.push(material)});
  }
  if(outline){line(a,b,0);line(b,c,0);line(c,d,0);line(d,a,0)}
 }
 function box(x,y,z,sx,sy,sz,pal=2,material=null,topMaterial=material??MAT.roof){
  const x0=x-sx/2,x1=x+sx/2,y0=y-sy/2,y1=y+sy/2,z0=z,z1=z+sz;
  // Every external face is UV mapped; components can override their top surface.
  const wall=material??(pal===1?MAT.brick:pal===2?MAT.wallblue:pal===3?MAT.plaster:MAT.stone);
  quad([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],pal);
  quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],pal===1?3:1,true,topMaterial);
  quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],pal,true,wall);
  quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],pal===2?3:2,true,wall);
  quad([x1,y1,z0],[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],pal,true,wall);
  quad([x0,y1,z0],[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],pal===2?1:pal,true,wall);
 }
 // Material-aware outdoor landscape: exact geometry, no image overlays.
 // The playable district expands to 384x384m; 3D collisions use the same extent.
 quad([-192,-192,-.10],[192,-192,-.10],[192,192,-.10],[-192,192,-.10],2,false,MAT.grass);
 // Spatially-coherent ground patches are larger than one tile so this is not
 // a checkerboard. Quad silhouettes overlap the base meadow without z fighting.
 // Lower LOD halves patch density but keeps roads and building collisions.
 const stride=lod==='mobile'?18:12;
 for(let ix=-Math.floor(180/stride);ix<Math.floor(180/stride);ix++){
  for(let iy=-Math.floor(180/stride);iy<Math.floor(180/stride);iy++){
   const cx=(ix+.5)*stride,cy=(iy+.5)*stride;
   if(Math.abs(cx)<12||Math.abs(cy)<11)continue;
   const seed=hash(Math.floor(ix/2),Math.floor(iy/2));
   const biome=Math.abs(cy)>100?MAT.wildgrass:Math.abs(cx)>115?MAT.limestone:
    seed%17<4?MAT.clover:seed%17<7?MAT.wildgrass:
    seed%17<9?MAT.flowers:seed%17<12?MAT.dirt:seed%17<14?MAT.moss:MAT.grass;
   if(biome===MAT.grass)continue;
   const sz=stride*(.49+(hash(ix,iy)%19)/100);
   quad([cx-sz,cy-sz*.62,-.085],[cx+sz*.58,cy-sz,-.085],
        [cx+sz,cy+sz*.54,-.085],[cx-sz*.62,cy+sz,-.085],2,false,biome);
   if(seed%7===0){
    const x=cx+sz*.3,y=cy-sz*.15,r=sz*.28;
    quad([x-r,y-r,-.082],[x+r,y-r,-.082],[x+r,y+r,-.082],[x-r,y+r,-.082],3,false,seed%2?MAT.pebbles:MAT.flowers);
   }
  }
 }
 // Street cross. Paving is NOT the road surface: dark carriageways,
 // pale stone sidewalks, edge curbs, cobbled intersections and dirt park paths.
 quad([-192,-3.45,.012],[192,-3.45,.012],[192,3.45,.012],[-192,3.45,.012],0,false,MAT.asphalt);
 quad([-5.5,-192,.016],[5.5,-192,.016],[5.5,192,.016],[-5.5,192,.016],0,false,MAT.asphalt);
 // Sidewalks follow both streets with correct elevation and intersections.
 for(const sign of [-1,1]){
  const ya=sign>0?3.55:-6.3,yb=sign>0?6.3:-3.55;
  quad([-192,ya,.020],[192,ya,.020],[192,yb,.020],[-192,yb,.020],3,false,MAT.sidewalk);
  const xa=sign>0?5.65:-8.25,xb=sign>0?8.25:-5.65;
  quad([xa,-192,.022],[xb,-192,.022],[xb,192,.022],[xa,192,.022],3,false,MAT.sidewalk);
 }
 // Older quarter along the western avenue uses a textured cobble lane.
 quad([-191,-3.43,.020],[-100,-3.43,.020],[-100,3.43,.020],[-191,3.43,.020],2,false,MAT.cobble);
 // Plaza and pedestrian crossing anchor the street visually.
 quad([-10,-9,.028],[10,-9,.028],[10,9,.028],[-10,9,.028],3,false,MAT.cobble);
 for(const sign of [-1,1]){
  const y=sign*8;
  quad([-32,y-1.2,.026],[-10,y-1.2,.026],[-10,y+1.2,.026],[-32,y+1.2,.026],3,false,MAT.path);
 }
 // World-scale paths lead into surrounding meadows.
 for(const y of [-95,100]){
  quad([-160,y-1.3,-.060],[160,y-1.3,-.060],[160,y+1.3,-.060],[-160,y+1.3,-.060],2,false,MAT.path);
 }
 for(let n=-174;n<=174;n+=9){
  // Short lane dashes, not an intrusive engineering grid across the grass.
  quad([n,-.12,.033],[n+3,-.12,.033],[n+3,.12,.033],[n,.12,.033],3);
  quad([-.12,n,.035],[.12,n,.035],[.12,n+3,.035],[-.12,n+3,.035],3);
 }
 // Crosswalks use deliberate pale stripes only at pedestrian junctions.
 for(const x of [-14,14]){
  for(let y=-2.6;y<3;y+=1.1)
   quad([x-1.25,y,.038],[x+1.25,y,.038],[x+1.25,y+.48,.038],[x-1.25,y+.48,.038],3);
 }
 // Shops stand in three-dimensional city blocks on both sides of the avenue.
 for(let i=-7;i<=7;i++){
  // Fewer far facade windows on phones: preserve actual 3D geometry and collisions.
  const bareMobileRow=lod==='mobile'&&Math.abs(i)%2===1;
  const x=i*10+4;
  for(const j of [-3,-2,-1,1,2,3]){
   const y=j*10.5+2;
   if(Math.abs(x)<9&&Math.abs(y)<12)continue;
   const seed=Math.abs(i*23+j*17);
   const h=3+(seed%5)*1.2,wall=(seed%3===0?1:seed%3===1?2:3);
   const w=4.6+(seed%3)*.7,depth=5.5;
   const wallMat=seed%5===0?MAT.brick:seed%5===1?MAT.wallblue:seed%5===2?MAT.plaster:seed%5===3?MAT.stone:MAT.wood;
   const roofMat=seed%4===0?MAT.brick:MAT.roof;
   box(x,y,.1,w,depth,h,wall,wallMat,wallMat);
   solids.push({x,y,w,d:depth});
   // Every house has a recognizable door and a step, including mobile LOD.
   const towardRoad=y>0?y-depth/2-.045:y+depth/2+.045;
   const out=y>0?-.11:.11;
   box(x,towardRoad,.08,1.57,.16,2.37,0,MAT.doorframe,MAT.doorframe);
   box(x,towardRoad+out,.11,1.15,.11,2.14,1,MAT.door,MAT.door);
   box(x+.39,towardRoad+out*1.65,1.07,.10,.09,.13,3,MAT.timber,MAT.timber);
   box(x,towardRoad+out,.055,2.05,.50,.13,0,MAT.stone,MAT.stone);
   if(bareMobileRow)continue;
   // Windows, reveals and sills are actual offset 3D volumes, not a painted rectangle.
   // Desktop architectural LOD adds corner posts and a readable window ledge,
   // while mobile preserves doors, frame material and collision at much lower cost.
   if(lod!=='mobile'){
    for(const dx of [-w/2+.23,w/2-.23]){
     box(x+dx,towardRoad,.16,.21,.21,h-.13,0,MAT.timber,MAT.timber);
     box(x+dx,y+(y>0?depth/2-.19:-depth/2+.19),.18,.20,.20,h-.16,0,MAT.timber,MAT.timber);
    }
   }
   for(let floor=0;floor<Math.floor(h/2);floor+=(lod==='mobile'?2:1)){ 
    for(const dx of [-1,1]){
     box(x+dx*1.13,towardRoad,.95+floor*1.75,.72,.09,.78,0);
     box(x+dx*1.13,towardRoad+(.07*(y<0?-1:1)),.98+floor*1.75,.49,.095,.5,2,(seed+floor)%3===0?MAT.windowlit:MAT.window,MAT.window);
     if(lod!=='mobile'){
      box(x+dx*1.13,towardRoad+out*1.1,.87+floor*1.75,1.01,.27,.12,3,MAT.limestone,MAT.limestone);
      box(x+dx*1.13,towardRoad+out*.45,1.73+floor*1.75,1.00,.20,.12,3,MAT.timber,MAT.timber);
     }
    }
   }
   box(x,y,.1,w+.35,depth+.35,.20,0,MAT.stone,MAT.stone);
   // Two restrained roof silhouettes: stepped slate and pale parapet.
   box(x,y,h+.1,w+.55,depth+.55,.26,1,roofMat,roofMat);
   if(seed%3!==0){
    box(x,y,h+.38,w*.77,depth+.68,.19,0,roofMat,roofMat);
    box(x,y,h+.59,w*.38,depth+.8,.15,1,roofMat,roofMat);
   }else{
    box(x,y,h+.43,w+.25,depth+.25,.17,3,MAT.timber,MAT.timber);
   }
   // Frame, shopfront awning and stone plinth tell a shop from a blank cube.
   box(x,towardRoad+out*.2,2.55,3.25,.35,.28,1,MAT.timber,MAT.timber);
   for(let k=0;k<5;k++){
    box(x-1.3+k*.65,towardRoad+out*2.2,2.38,.64,.43,.11,k%2?1:3,k%2?MAT.brick:MAT.plaster,k%2?MAT.brick:MAT.plaster);
   }
  }
 }
 // Two real 3D markers: supplies near spawn and doorstep of rental shop.
  box(0,0,.05,1.2,1.2,.12,3,MAT.stone,MAT.stone);box(0,0,.17,.8,.8,.26,1,MAT.brick,MAT.brick);
  box(24,0,.05,1.5,1.5,.12,3,MAT.stone,MAT.stone);box(24,0,.17,.9,.9,.25,2,MAT.wood,MAT.wood);
  // Landmark rental house ahead: stylized pink/cream shop front and tower.
 box(30,0,.08,8,9,8,3,MAT.plaster,MAT.plaster);
 solids.push({x:30,y:0,w:8,d:9});
 box(29.9,0,8.1,9.5,10,.7,1,MAT.roof,MAT.roof);
 box(29.9,0,9,4,4,3.3,2,MAT.wallblue,MAT.wallblue);
 box(29.9,0,12.3,5.6,5.6,.45,1,MAT.roof,MAT.roof);
 // The landlord building finally has a full door surface with threshold,
 // fluted wooden frame, handle and a recognizable overhead sign.
 box(25.90,0,.1,.2,2.7,3.40,0,MAT.doorframe,MAT.doorframe);
 box(25.75,0,.13,.2,2.14,3.04,1,MAT.door,MAT.door);
 box(25.60,.67,1.34,.1,.14,.15,3,MAT.timber,MAT.timber);
 box(25.78,0,.03,.9,3.1,.16,0,MAT.stone,MAT.stone);
 box(25.68,0,3.64,.18,4.4,.66,1,MAT.timber,MAT.timber);
 for(let side of [-3.1,3.1]){
  box(25.8,side,2.7,.13,1.5,1.5,0,MAT.doorframe,MAT.doorframe);
  box(25.7,side,2.9,.15,1,1.05,2,MAT.windowlit,MAT.windowlit);
 }
 // Two intentional silhouettes: flowering shade trees and tall blue trees.
 // Crown is made of staggered smaller cuboids, not one shapeless giant cube.
 function tree(x,y,variant){
  const blossom=variant%3===0,leaf=blossom?MAT.leavespink:MAT.leavesblue;
  const pal=blossom?1:2,height=blossom?2.65:3.5;
  solids.push({x,y,w:.72,d:.72});
  box(x,y,.05,.42,.48,height,0,MAT.bark,MAT.bark);
  if(lod==='mobile'){
   box(x,y,height-.55,1.95,1.95,1.05,pal,leaf,leaf);
   box(x+.18,y,height+.42,1.48,1.55,.76,pal,leaf,leaf);
  }else{
   box(x,y,height-.52,2.2,2.1,1.05,pal,leaf,leaf);
   box(x-.68,y+.3,height+.16,1.42,1.3,.85,pal,leaf,leaf);
   box(x+.72,y-.23,height+.15,1.4,1.5,.9,pal,leaf,leaf);
   box(x+.09,y,height+.59,1.76,1.74,.76,pal,leaf,leaf);
   box(x+.02,y-.09,height+1.15,1.04,1.12,.41,pal,leaf,leaf);
   // Branches are narrower than the leaf masses.
   box(x+.62,y-.18,height-.18,1.0,.18,.2,0,MAT.bark,MAT.bark);
  }
 }
 for(let x=-45;x<=60;x+=10){
  for(const y of [-6.5,6.5]){
   if(x>=24&&x<=37)continue;
   tree(x,y,hash(x,y)%7);
  }
 }
 // Sparse park trees and shrub rows beyond the commercial block, without
 // altering road/tree collision footprints in the existing movement tests.
 for(let x=-144;x<=144;x+=24){
  for(const y of [-26,26]){
   if(Math.abs(x)<80)continue;
   // Tree trunks are collidable even in the remote park; foliage is not.
   solids.push({x,y,w:.72,d:.72});
   const leaf=hash(x,y)%3===0?MAT.leavespink:MAT.leavesblue;
   box(x,y,.06,.42,.42,2.35,0,MAT.bark,MAT.bark);
   box(x,y,2.1,2,2,.92,leaf===MAT.leavespink?1:2,leaf,leaf);
   if(lod!=='mobile')box(x+.25,y,2.90,1.5,1.55,.64,leaf===MAT.leavespink?1:2,leaf,leaf);
  }
 }
 for(const side of [-1,1])for(let x=-77;x<=78;x+=18){
  if(Math.abs(x-30)<14)continue;
  const y=side*9.5;
  box(x,y,.03,1.2,1.18,.58,2,MAT.hedge,MAT.hedge);
  if(lod!=='mobile')box(x+.35,y+.15,.41,.85,.9,.47,2,MAT.hedge,MAT.hedge);
 }
 // A distant sky landmark visible on looking up.
 box(66,-22,14,4,4,17,1,MAT.brick,MAT.brick);
 box(66,-22,31,9,9,.65,3,MAT.limestone,MAT.limestone);
 return {tri:new Float32Array(verts),colors:new Float32Array(cols),line:new Float32Array(lines),lineColors:new Float32Array(lineCols),solids,
  materialPosition:new Float32Array(materialPosition),materialUV:new Float32Array(materialUV),materialID:new Float32Array(materialID)};
}
function program(gl,vs,fs){
 const compile=(type,source)=>{
  const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
  return shader;
 };
 const p=gl.createProgram();
 gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));
 gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
 return p;
}
function makeRenderer(canvas){
 const gl=canvas.getContext('webgl',{alpha:false,depth:true,antialias:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
 if(!gl)throw Error('手机或浏览器无法启用 WebGL');
 const shader=program(gl,
  'attribute vec3 aPosition;attribute vec3 aColor;uniform mat4 uView;varying vec3 vColor;void main(){gl_Position=uView*vec4(aPosition,1.0);vColor=aColor;}',
  'precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.0);}');
 const aPos=gl.getAttribLocation(shader,'aPosition'),aColor=gl.getAttribLocation(shader,'aColor'),view=gl.getUniformLocation(shader,'uView');
 const data=makeTown(Math.min(window.innerWidth,window.innerHeight)<640?'mobile':'full');
 function buffer(arr){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);return b}
 const tPos=buffer(data.tri),tCol=buffer(data.colors),lPos=buffer(data.line),lCol=buffer(data.lineColors);
 let materialPass=null;
 try{materialPass=createMaterialBatch(gl,{position:data.materialPosition,uv:data.materialUV,id:data.materialID},tryReadPack(window.localStorage))}
 catch(e){console.warn('Pixel materials unavailable, using native four-color faces',e)}
 const bind=(pos,col)=>{gl.bindBuffer(gl.ARRAY_BUFFER,pos);gl.enableVertexAttribArray(aPos);gl.vertexAttribPointer(aPos,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,col);gl.enableVertexAttribArray(aColor);gl.vertexAttribPointer(aColor,3,gl.FLOAT,false,0,0)};
 gl.disable(gl.DITHER);gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 function resize(){
  const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
  // Integer pixels, 2 CSS px wide; bounded work on large tablets.
  const scale=Math.max(2,Math.ceil(w/580),Math.ceil(h/790));
  const cw=Math.ceil(w/scale),ch=Math.ceil(h/scale);
  if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;gl.viewport(0,0,cw,ch)}
 }
 function render(pose,eye){
  resize();gl.useProgram(shader);
  gl.clearColor(...INK,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const projection=projectionMatrix(pose,canvas.width/canvas.height,eye);
  gl.uniformMatrix4fv(view,false,projection);
  gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);
  bind(tPos,tCol);gl.drawArrays(gl.TRIANGLES,0,data.tri.length/3);
  gl.disable(gl.POLYGON_OFFSET_FILL);
  // Palette-only nearest-neighbour materials on the actual road/roof/wall triangles.
  // Original flat meshes stay as a fallback, and black outlines remain last.
  materialPass?.render({matrix:projection});
  gl.useProgram(shader);gl.uniformMatrix4fv(view,false,projection);
  bind(lPos,lCol);gl.drawArrays(gl.LINES,0,data.line.length/3);
 }
 function destroy(){materialPass?.destroy();gl.deleteBuffer(tPos);gl.deleteBuffer(tCol);gl.deleteBuffer(lPos);gl.deleteBuffer(lCol);gl.deleteProgram(shader)}
 return {render,resize,destroy,solids:data.solids,get triangles(){return data.tri.length/9},get materialTriangles(){return materialPass?.count/3||0}};
}
export function createWorld3D({onBack}){
 const stage=$('pw-world'),canvas=$('pw-world-canvas'),status=$('pw-motion-status');
 if(!stage||!canvas)throw Error('Missing world3d stage');
 const motion=new MotionPose(),lean=new LeanCamera();
 let renderer=null,motor=new BodyMotor(),active=false,frame=0,prev=0,raf=0;
 let permission='idle',orientationListening=false,timeout=0,lastSensor=0,lastEye=null;
 let sensorEnabled=false,sensorRequest=0;
 let comfort=true;
 let shopStore=null;try{shopStore=window.localStorage}catch{}
  const shop=new ShopOpeningLoop(shopStore);
  const keys=new Set(),stick={forward:0,side:0,id:null};
 const heldForward={value:0},headHold={value:0};
 const pointerLook={id:null,x:0,y:0};
 const el=id=>$(id),note=s=>{if(status.textContent!==s)status.textContent=s};
 function setStance(value){
  motor.setStance(value);
  for(const name of ['stand','crouch','prone'])
   el('pw-stance-'+name).setAttribute('aria-pressed',String(name===motor.stance));
 }
 function readouts(){
  const a=motion.degrees,m=motor.snapshot();
  el('pw-yaw').textContent=(a.yaw>=0?'+':'')+a.yaw+'°';
  el('pw-roll').textContent=(a.roll>=0?'+':'')+a.roll+'°';
  el('pw-pitch').textContent=(a.pitch>=0?'+':'')+a.pitch+'°';
  el('pw-lean-distance').textContent=(lean.offset>=0?'左 ':'右 ')+Math.abs(lean.offset).toFixed(2)+'m';
  el('pw-player-position').textContent='X '+m.position.x.toFixed(1)+' · Y '+m.position.y.toFixed(1);
  el('pw-player-speed').textContent=m.speed.toFixed(1)+' m/s';
  el('pw-stance-status').textContent={stand:'站立',crouch:'蹲下',prone:'趴下'}[m.stance]+' · '+m.height.toFixed(2)+'m';
   refreshShopUI(m.position);
  el('pw-sensor-badge').textContent=!sensorEnabled?'体感已关闭':motion.sensorSeen?(motion.lastSource==='native'?'APK 原生陀螺仪':'网页姿态传感器'):'等待体感数据';
  el('pw-gyro-debug').textContent=!sensorEnabled?'方向传感器已停用 · 触屏/鼠标可转向':motion.sensorSeen?
   ('侧倾 '+a.roll+'° · '+(Math.abs(lean.offset)*100).toFixed(0)+'cm · '+motion.lastSource):
   '尚无传感器数据 · 点击「开启手机体感」';
 }
 function refreshShopUI(position){
   const t=shop.describe(position);
   el('pw-shop-name').textContent=shop.shopName+' · Lv.'+t.level;
   el('pw-shop-goal').textContent=(t.phase==='pickup'?'到广场领货':'到店铺交货')+
    ' · X '+t.target.x+' Y '+t.target.y+' · '+t.distance.toFixed(1)+'m';
   el('pw-shop-bank').textContent='营业金 '+t.cash+' · 声望 '+t.reputation+' · 已送 '+t.deliveries;
   const a=el('pw-shop-interact');a.textContent=t.action;a.disabled=!t.canInteract;
   const u=el('pw-shop-upgrade');u.textContent=t.upgradeCost===null?'最高等级':'升级 '+t.upgradeCost;
   u.disabled=!t.canUpgrade;
  }
  function shopAction(kind){
   if(!active)return;
   const p=motor.snapshot().position;
   const result=kind==='upgrade'?shop.upgrade(p):shop.interact(p);
   note(result.message);refreshShopUI(p);
  }
  function input(){
  const forward=heldForward.value||((keys.has('w')?1:0)-(keys.has('s')?1:0)+stick.forward);
  const side=(keys.has('a')?1:0)-(keys.has('d')?1:0)+stick.side;
  return {forward:clamp(forward,-1,1),side:clamp(side,-1,1),sprint:keys.has('shift')};
 }
 function draw(time){
  if(!active)return;
  // Time-based movement, independent of irregular requestAnimationFrame rate.
  // Limit huge background-tab jumps but do not discard ordinary frame duration.
  const dt=prev?clamp((time-prev)/1000,0,.09):1/60;prev=time;frame++;
  motion.step(dt);
  const p=motor.update(dt,input(),motion.pose.yaw);
  const manual=keys.has('q')?65*RAD:keys.has('e')?-65*RAD:
   headHold.value?headHold.value*65*RAD:null;
  const sideRoll=manual===null?motion.pose.roll:manual;
  const peek=lean.update(dt,sideRoll,motion.pose.yaw,p.eye,renderer?.solids||[]);
  lastEye=peek.eye;
  // Rotate modestly while genuinely translating the camera into cover.
  const view={yaw:motion.pose.yaw,pitch:motion.pose.pitch,roll:peek.bank};
  if(renderer)renderer.render(view,peek.eye);
  if(frame%7===0)readouts();
  raf=requestAnimationFrame(draw);
 }
 function onOrientation(e){
  if(!active||!sensorEnabled)return;
  const angle=Number(screen.orientation?.angle??window.orientation??0)||0;
  if(motion.ingest(e.alpha,e.beta,e.gamma,angle)){
   lastSensor=performance.now();
   if(timeout){clearTimeout(timeout);timeout=0}
   note('方向已连接 · 左右倾斜可连续探头 · 已关闭不可靠的体感踏步与蹲起');
  }
 }
 function onNativeQuaternion(w,x,y,z){
  if(!active||!sensorEnabled)return;
  if(motion.ingestQuaternion(w,x,y,z)){
   lastSensor=performance.now();
   if(timeout){clearTimeout(timeout);timeout=0}
   note('APK 原生体感已连接 · 左右倾斜直接探头 · 地平线稳定');
  }
 }
 function updateSensorButton(){
  const btn=el('pw-motion-start');
  btn.textContent=sensorEnabled?'关闭手机体感':'开启手机体感';
  btn.setAttribute('aria-pressed',String(sensorEnabled));
 }
 function stopMotion(){
  // Invalidate pending permission prompts and discard late native packets.
  sensorEnabled=false;sensorRequest++;
  if(timeout){clearTimeout(timeout);timeout=0}
  if(orientationListening){window.removeEventListener('deviceorientation',onOrientation);orientationListening=false}
  if(window.PaperworldSensor?.stop){try{window.PaperworldSensor.stop()}catch(e){}}
  window.__PAPERWORLD_NATIVE_ORIENTATION__=null;
  motion.disconnectSensor();lean.reset();
  permission='idle';updateSensorButton();readouts();
  if(active)note('体感已关闭 · 滑动屏幕或移动鼠标转向');
 }
 async function startMotion(){
  if(!active)return;
  if(sensorEnabled){stopMotion();return}
  sensorEnabled=true;
  const request=++sensorRequest;
  updateSensorButton();
  try{
   // Use the native Android rotation vector exclusively when available.
   if(window.PaperworldSensor?.start && window.PaperworldSensor?.available?.()!==false){
    window.__PAPERWORLD_NATIVE_ORIENTATION__=onNativeQuaternion;
    window.PaperworldSensor.start();
    permission='native';note('APK 原生体感已启动 · 再点一次关闭');return;
   }
  }catch(e){window.__PAPERWORLD_NATIVE_ORIENTATION__=null}
  if(typeof DeviceOrientationEvent==='undefined'){
   stopMotion();permission='unsupported';note('设备不支持方向传感器 · 请滑动触屏');return;
  }
  try{
   if(typeof DeviceOrientationEvent.requestPermission==='function'){
    const result=await DeviceOrientationEvent.requestPermission();
    if(!active||!sensorEnabled||request!==sensorRequest)return;
    if(result!=='granted'){stopMotion();permission='denied';note('体感未授权 · 请使用触屏转向');return}
   }
   if(!active||!sensorEnabled||request!==sensorRequest)return;
   if(!orientationListening){
    window.addEventListener('deviceorientation',onOrientation,{passive:true});
    orientationListening=true;
   }
   permission='granted';note('体感已开启 · 再点一次关闭');
   timeout=setTimeout(()=>{if(active&&sensorEnabled&&!motion.sensorSeen)note('未收到方向数据 · 可关闭体感使用触屏')},2200);
  }catch(e){
   if(request===sensorRequest){stopMotion();permission='denied';note('体感授权失败 · 请使用触屏转向')}
  }
 }
 function open(){
  if(active)return;
  stage.classList.remove('pw-off');active=true;frame=0;prev=0;
  motion.disconnectSensor();motion.pose={yaw:0,pitch:0,roll:0};motion.target={yaw:0,pitch:0,roll:0};lean.reset();
  sensorEnabled=false;updateSensorButton();
  motion.setComfort(comfort);lean.setComfort(comfort);
  try{
   renderer??=makeRenderer(canvas);motor=new BodyMotor(renderer.solids);
   window.__PAPERWORLD_WORLD_MATERIALS__={texturedTriangles:renderer.materialTriangles,atlas:[128,64],materialCount:32,worldMeters:384,source:'official-four-ink-material-pack'};
   note('384 米像素大世界 · 32 种原生材质已进入地面、道路、房屋和树木 · 触屏/按键移动');
  }catch(e){motor=new BodyMotor();note('WebGL 不可用：'+String(e.message||e))}
  setStance('stand');readouts();raf=requestAnimationFrame(draw);
 }
 function close(){
  if(!active)return;
  active=false;stage.classList.add('pw-off');cancelAnimationFrame(raf);prev=0;
  stopMotion();
  if(document.pointerLockElement===canvas)document.exitPointerLock?.();
  keys.clear();heldForward.value=0;headHold.value=0;stick.forward=stick.side=0;stick.id=null;
  pointerLook.id=null;lean.reset();
  el('pw-stick-knob').style.transform='translate(0,0)';
 }
 function bindHold(id,callback){
  const button=el(id),seen=new Set();
  button.addEventListener('pointerdown',e=>{
   if(!active)return;
   e.preventDefault();seen.add(e.pointerId);callback(true);
   button.setAttribute('aria-pressed','true');
   try{button.setPointerCapture(e.pointerId)}catch{}
  });
  const stop=e=>{
   if(!seen.delete(e.pointerId))return;
   if(!seen.size){callback(false);button.setAttribute('aria-pressed','false')}
  };
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,stop);
 }
 bindHold('pw-forward-hold',on=>{heldForward.value=on?1:0});
 bindHold('pw-back-hold',on=>{heldForward.value=on?-1:0});
 bindHold('pw-lean-left',on=>{headHold.value=on?1:0});
 bindHold('pw-lean-right',on=>{headHold.value=on?-1:0});
 for(const name of ['stand','crouch','prone'])
  el('pw-stance-'+name).addEventListener('click',()=>setStance(name));
 el('pw-motion-start').addEventListener('click',startMotion);
 const comfortBtn=el('pw-comfort-toggle');
 comfortBtn.addEventListener('click',()=>{
  comfort=!comfort;
  motion.setComfort(comfort);lean.setComfort(comfort);
  comfortBtn.textContent=comfort?'舒适模式：开':'舒适模式：关';
  comfortBtn.setAttribute('aria-pressed',String(comfort));
  note(comfort?'稳定地平线 · 缩小探头幅度 · 低敏感旋转':'标准模式 · 探头幅度增大，视角更灵敏');
 });
 el('pw-motion-center').addEventListener('click',()=>{
  if(motion.sensorSeen){motion.recenter();lean.reset();note('探头与朝向已重新校准')}
  else{motion.pose={yaw:0,pitch:0,roll:0};motion.target={yaw:0,pitch:0,roll:0};lean.reset();note('视角已回正')}
 });
 el('pw-motion-sensitivity').addEventListener('input',e=>{
  motion.setSensitivity(e.target.value);
  el('pw-motion-sensitivity-value').textContent=Number(e.target.value).toFixed(2)+'×';
 });
 el('pw-motion-response').addEventListener('input',e=>{
  motion.setResponse(e.target.value);
  el('pw-motion-response-value').textContent=Math.round(motion.smooth*1000)+' ms';
 });
 el('pw-shop-interact').addEventListener('click',()=>shopAction('interact'));
  el('pw-shop-upgrade').addEventListener('click',()=>shopAction('upgrade'));
  el('pw-motion-back').addEventListener('click',()=>{close();onBack?.()});
 const more=el('pw-world-more'),panel=el('pw-world-bottom');
 more.addEventListener('click',()=>{
  const old=panel.classList.contains('pw-world-compact');
  panel.classList.toggle('pw-world-compact',!old);
  more.setAttribute('aria-expanded',String(old));
  more.textContent=old?'收起设置 ▴':'体感设置 ▾';
 });
 const joystick=el('pw-move-stick'),knob=el('pw-stick-knob');
 function moveStick(e){
  const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height*.45;
  const radius=Math.max(28,Math.min(r.width,r.height)*.32);
  let x=clamp((e.clientX-cx)/radius,-1,1),y=clamp((e.clientY-cy)/radius,-1,1);
  const len=Math.max(1,Math.hypot(x,y));x/=len;y/=len;
  stick.forward=Math.abs(y)<.085?0:-y;
  stick.side=Math.abs(x)<.085?0:-x;
  knob.style.transform='translate('+Math.round(x*34)+'px,'+Math.round(y*34)+'px)';
 }
 joystick.addEventListener('pointerdown',e=>{
  if(!active||stick.id!==null)return;
  e.preventDefault();stick.id=e.pointerId;
  try{joystick.setPointerCapture(e.pointerId)}catch{}
  moveStick(e);
 });
 joystick.addEventListener('pointermove',e=>{
  if(e.pointerId===stick.id){e.preventDefault();moveStick(e)}
 });
 const stopStick=e=>{
  if(e.pointerId!==stick.id)return;
  stick.id=null;stick.forward=0;stick.side=0;
  knob.style.transform='translate(0,0)';
 };
 for(const event of ['pointerup','pointercancel','lostpointercapture'])
  joystick.addEventListener(event,stopStick);
 canvas.addEventListener('pointerdown',e=>{
  if(!active)return;
  if(e.pointerType==='mouse'&&canvas.requestPointerLock){
   try{const promise=canvas.requestPointerLock();promise?.catch?.(()=>{})}catch{}
  }
  pointerLook.id=e.pointerId;pointerLook.x=e.clientX;pointerLook.y=e.clientY;
  try{canvas.setPointerCapture(e.pointerId)}catch{}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!active||document.pointerLockElement===canvas||pointerLook.id!==e.pointerId)return;
  // X-forward, Y-left world: right swipe means negative yaw, turning camera right.
  motion.manual((pointerLook.x-e.clientX)*.0033,(pointerLook.y-e.clientY)*.0033,0);
  pointerLook.x=e.clientX;pointerLook.y=e.clientY;
 });
 for(const event of ['pointerup','pointercancel'])
  canvas.addEventListener(event,e=>{if(e.pointerId===pointerLook.id)pointerLook.id=null});
 document.addEventListener('mousemove',e=>{
  if(active&&document.pointerLockElement===canvas)
   motion.manual(-e.movementX*.0026,-e.movementY*.0026,0);
 });
 function keyDown(e){
  if(!active||/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName||''))return;
  const k=e.key.toLowerCase();
  if(['w','a','s','d','shift','q','e'].includes(k)){
   e.preventDefault();keys.add(k);return;
  }
  if(k.startsWith('arrow')){
   const dirs={arrowleft:[-.08,0,0],arrowright:[.08,0,0],arrowup:[0,.065,0],arrowdown:[0,-.065,0]};
   if(dirs[k]){e.preventDefault();motion.manual(...dirs[k])}return;
  }
  if(e.repeat)return;
  if(k==='f'){e.preventDefault();shopAction('interact');return}
   if(k==='control')setStance(motor.stance==='crouch'?'stand':'crouch');
  if(k==='z')setStance(motor.stance==='prone'?'stand':'prone');
  if(k==='x')setStance('stand');
  if(k===' '){motion.sensorSeen?motion.recenter():(motion.pose={yaw:0,pitch:0,roll:0},motion.target={yaw:0,pitch:0,roll:0});lean.reset()}
  if(k==='escape'){
   if(document.pointerLockElement===canvas)document.exitPointerLock?.();
   else{close();onBack?.()}
  }
 }
 window.addEventListener('keydown',keyDown);
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 window.addEventListener('blur',()=>{keys.clear();heldForward.value=0;stick.forward=stick.side=0;headHold.value=0});
 function onScreen(){if(sensorEnabled){motion.calibrated=false;if(active)note('屏幕朝向变更，待重新校准')}}
 window.addEventListener('orientationchange',onScreen);
 window.screen?.orientation?.addEventListener?.('change',onScreen);
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){keys.clear();stick.forward=stick.side=0;heldForward.value=0;headHold.value=0}
 });
 window.__PAPERWORLD_WORLD3D__={
  get active(){return active},
  get pose(){return {...motion.pose}},
  get target(){return {...motion.target}},
  get player(){return motor.snapshot()},
  get eye(){return [...(lastEye||[0,0,1.68])]},
  get lean(){return {offset:lean.offset,bank:lean.bank}},
  get walls(){return renderer?.solids.length||0},
  get triangles(){return renderer?.triangles||0},
   get shop(){return shop.snapshot()},
  get forwardHold(){return heldForward.value},
  get sensor(){return motion.sensorSeen},get sensorEnabled(){return sensorEnabled},get sensorSource(){return motion.lastSource},get comfort(){return comfort},get permission(){return permission},
  injectTestQuaternion:(w,x,y,z)=>motion.ingestQuaternion(w,x,y,z),
  injectTestOrientation:(a,b,g,angle=0)=>motion.ingest(a,b,g,angle),
  setTestStance:name=>motor.setStance(name)
 };
 return {open,close,get active(){return active},motion,get motor(){return motor}};
}
