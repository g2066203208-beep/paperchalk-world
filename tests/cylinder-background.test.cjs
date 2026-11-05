'use strict';
const assert=require('node:assert/strict');
const cylinder=require('../site/game/cylinder-background.js');
const near=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,a+' != '+b);
const mesh=cylinder.buildCylinderMesh(1,160);
assert.equal(mesh.length,160*18,'each 3D curved segment is two triangles');
for(let i=0;i<mesh.length;i+=3){
  near(Math.hypot(mesh[i],mesh[i+2]),1,1e-5);
  near(Math.abs(mesh[i+1]),1);
}
const tanX=Math.tan(cylinder.FOV/2),tanY=tanX/(16/9);
near(cylinder.projectUV({x:0,y:0,z:-1},tanX,tanY).u,.5);
near(cylinder.projectUV({x:0,y:0,z:-1},tanX,tanY).v,.5);
// The neutral camera reconstructs the exact original image coordinates.
for(const u of [.15,.3,.5,.75,.85]){
  const a=Math.atan((2*u-1)*tanX);
  const point={x:Math.sin(a),y:0,z:-Math.cos(a)};
  near(cylinder.projectUV(point,tanX,tanY).u,u);
}
const glConsts=new Proxy({}, {get:(_t,k)=>typeof k==='string'?k:'unknown'});
let draws=0,texUploads=0,angles=[],meshUpload=null,fail=false;
const gl=new Proxy({}, {get(_t,k){
  if(k==='getShaderParameter'||k==='getProgramParameter')return ()=>true;
  if(k==='getAttribLocation')return ()=>0;
  if(k==='getUniformLocation')return (_p,name)=>name;
  if(k==='createShader'||k==='createProgram'||k==='createBuffer'||
     k==='createTexture')return ()=>({});
  if(k==='getParameter')return ()=>4096;
  if(k==='getError')return ()=>0;
  if(k==='getShaderInfoLog'||k==='getProgramInfoLog')return ()=>'';
  if(k==='bufferData')return (_target,data)=>{meshUpload=data};
  if(k==='texImage2D')return ()=>{if(fail)throw Error('texture failure');texUploads++};
  if(k==='drawArrays')return ()=>{if(fail)throw Error('draw failure');draws++};
  if(k==='uniform2f')return (key,a,b)=>{if(key==='u_camera')angles.push([a,b])};
  if(typeof k==='string'&&k===k.toUpperCase())return glConsts[k];
  return ()=>{};
}});
const callbacks={},sourceCallbacks={},classes=new Set();
let canvas;
global.window={devicePixelRatio:1,addEventListener(){}};
global.document={createElement(){
  return {width:0,height:0,hidden:true,setAttribute(){},
    getContext(type){assert.equal(type,'webgl');return gl},
    addEventListener:(name,fn)=>{callbacks[name]=fn}};
}};
global.ResizeObserver=class{observe(){}};
const source={
  complete:true,naturalWidth:1024,naturalHeight:576,
  src:'/classroom.webp',currentSrc:'/classroom.webp',
  classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)},
  insertAdjacentElement(_where,node){canvas=node},
  addEventListener:(name,fn)=>{sourceCallbacks[name]=fn}
};
const stage={clientWidth:1024,clientHeight:576,dataset:{}};
const bg=cylinder.create({stage,source});
assert.ok(canvas);
assert.equal(bg.inspect().ready,false);
bg.setScene('classroom');
assert.equal(stage.dataset.backgroundSurface,'cylinder-webgl');
assert.equal(bg.inspect().renderer,'webgl-3d-cylinder');
assert.ok(meshUpload instanceof Float32Array);
assert.equal(draws,1);
assert.equal(texUploads,1);
assert.ok(classes.has('scene-cylinder-source-hidden'));
const before=draws;
bg.setView(0,0);
assert.equal(draws,before,'static camera does not redraw');
bg.setView(.5,.5);
assert.equal(draws,before+1,'camera rotation redraws actual geometry');
assert.ok(angles.at(-1)[0]>0&&angles.at(-1)[1]>0);
assert.equal(texUploads,1,'mouse pitch MUST NOT crop or reupload the art');
source.src='/bedroom.webp';
source.currentSrc='/bedroom.webp';
source.complete=false;
bg.setScene('bedroom');
assert.equal(canvas.hidden,true,'show original while loading new scene');
source.complete=true;
sourceCallbacks.load();
assert.equal(canvas.hidden,false);
assert.equal(texUploads,2);
fail=true;
assert.equal(bg.refresh(),false);
assert.equal(bg.inspect().renderer,'flat-fallback');
assert.equal(canvas.hidden,true);
fail=false;
assert.equal(bg.refresh(),true);
assert.equal(canvas.hidden,false);
bg.setScene('menu');
assert.equal(canvas.hidden,true);
assert.ok(!classes.has('scene-cylinder-source-hidden'));
assert.equal(bg.inspect().enabled,false);
console.log('PASS genuine 3D cylinder: mesh, neutral projection, yaw/pitch, image switch, fallback');
