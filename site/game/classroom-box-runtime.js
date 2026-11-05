/* Paperchalk World: integrated five-face classroom blockout.
 * One actual in-game scene (not a detached DEV page); 3D vertices project
 * through a pinhole camera and the real game L2D actors use those SAME
 * camera coordinates and shoe contacts.
 *
 * No drawn-in floor perspective, texture images, fake NPC silhouettes,
 * second animation loop, or edits to the user's saved L2D settings.
 */
(function(root,factory){
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.PaperWorldClassroomBox=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const ROOM=Object.freeze({width:9.6,depth:8,height:3.2});
const BASE_CAMERA=Object.freeze({x:0,y:1.2,z:-1.25,hFov:68});
const CHARACTERS=Object.freeze({
  player:Object.freeze({x:-.9,y:0,z:1.0,height:1.62,soleX:.51,soleY:.978,visible:.945}),
  enemy:Object.freeze({x:1.3,y:0,z:2.4,height:1.55,soleX:.6,soleY:.987,visible:.95})
});
const COLORS=Object.freeze({
  ceiling:'#a8b1be',floor:'#bca17f',back:'#70899b',
  left:'#86a69e',right:'#b78e82'
});
const FACES=Object.freeze([
  {id:'back',label:'后墙',vertices:[[-4.8,0,8],[4.8,0,8],[4.8,3.2,8],[-4.8,3.2,8]],center:[0,2.2,8]},
  {id:'floor',label:'地板',vertices:[[-4.8,0,0],[-4.8,0,8],[4.8,0,8],[4.8,0,0]],center:[0,0,4]},
  {id:'ceiling',label:'天花板',vertices:[[-4.8,3.2,0],[4.8,3.2,0],[4.8,3.2,8],[-4.8,3.2,8]],center:[0,3.2,7.3]},
  {id:'left',label:'左墙',vertices:[[-4.8,0,0],[-4.8,3.2,0],[-4.8,3.2,8],[-4.8,0,8]],center:[-4.8,1.45,6.5]},
  {id:'right',label:'右墙',vertices:[[4.8,0,0],[4.8,0,8],[4.8,3.2,8],[4.8,3.2,0]],center:[4.8,1.45,6.5]}
]);
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
function camera(inputX=0,inputY=0){
  const x=clamp(Number(inputX)||0,-1,1);
  const y=clamp(Number(inputY)||0,-1,1);
  return {x:BASE_CAMERA.x+x*.075,y:BASE_CAMERA.y+y*.025,z:BASE_CAMERA.z,
    yaw:x*.018,pitch:-y*.012,hFov:BASE_CAMERA.hFov};
}
function project(point,cam,width,height){
  const [px,py,pz]=point;
  const dx=px-cam.x,dy=py-cam.y,dz=pz-cam.z;
  const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw);
  const cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
  const xx=cy*dx-sy*dz;
  const z0=sy*dx+cy*dz;
  const yy=cp*dy-sp*z0;
  const depth=sp*dy+cp*z0;
  if(depth<=.03)return null;
  const focal=width/(2*Math.tan(cam.hFov*Math.PI/360));
  return {x:width/2+focal*xx/depth,
    y:height/2-focal*yy/depth,depth,focal};
}
function actorGeometry(id,cam,width,height,metrics){
  const a=CHARACTERS[id];if(!a)return null;
  const shoe=project([a.x,0,a.z],cam,width,height);
  const head=project([a.x,a.height,a.z],cam,width,height);
  if(!shoe||!head)return null;
  const src=metrics||{};
  const sY=clamp(Number.isFinite(src.soleY)?src.soleY:a.soleY,.6,1);
  const sX=clamp(Number.isFinite(src.soleX)?src.soleX:a.soleX,0,1);
  const vis=clamp(Number.isFinite(src.visibleFraction)?src.visibleFraction:a.visible,.5,1);
  const drawnHeight=Math.max(1,shoe.y-head.y);
  const canvasSize=drawnHeight/vis;
  return {id,shoe,head,drawnHeight,canvasSize,soleX:sX,soleY:sY,
    localLeft:shoe.x-canvasSize*sX,
    localTop:shoe.y-canvasSize*sY,depth:shoe.depth};
}
function create({stage,view,playerRoot,enemyRoot}={}){
  if(!stage||!view||!playerRoot||!enemyRoot)
    throw Error('Classroom box must be mounted inside the actual game');
  const original=stage.querySelector('#source');
  if(!original)throw Error('Classroom box requires the existing scene source');
  const surface=document.createElement('canvas');
  surface.id='classroom-box-surface';
  surface.setAttribute('aria-label','五面三维纯色教室，真实 L2D 主角与敌人');
  surface.setAttribute('aria-hidden','true');
  surface.hidden=true;
  original.insertAdjacentElement('afterend',surface);
  const ctx=surface.getContext('2d',{alpha:false});
  let enabled=false,lastKey='',lastState=null;
  function setVar(id,key,value){
    const prop='--room-'+id+'-'+key;
    if(view.style.getPropertyValue(prop)!==value)
      view.style.setProperty(prop,value);
  }
  function metrics(){
    const prior=window.PaperWorldL2DGround?.state?.();
    return Object.fromEntries(['player','enemy'].map(id=>
      [id,prior?.actors?.find(a=>a.id===id)||null]));
  }
  function plane(vertices,cam,width,height,color){
    const screen=vertices.map(v=>project(v,cam,width,height));
    if(screen.some(x=>!x))return;
    ctx.beginPath();ctx.moveTo(screen[0].x,screen[0].y);
    for(let i=1;i<screen.length;i++)ctx.lineTo(screen[i].x,screen[i].y);
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
    ctx.lineWidth=Math.max(.8,width/1280);
    ctx.strokeStyle='#344251';ctx.stroke();
  }
  function contactShadow(actor,cam,width,height){
    const ring=[];
    for(let i=0;i<24;i++){
      const t=i*Math.PI*2/24;
      ring.push([actor.x+.23*Math.cos(t),.007,
        actor.z+.14*Math.sin(t)]);
    }
    plane(ring,cam,width,height,'#17253185');
  }
  function faceText(text,anchor,cam,width,height){
    const p=project(anchor,cam,width,height);
    if(!p||p.x<22||p.x>width-22||p.y<18||p.y>height-18)return;
    const size=Math.max(10,Math.min(15,width/85));
    ctx.font='600 '+size+'px system-ui,"Microsoft YaHei",sans-serif';
    const tw=ctx.measureText(text).width+20;
    const hh=size+11;
    ctx.fillStyle='#182a3db0';
    ctx.fillRect(p.x-tw/2,p.y-hh/2,tw,hh);
    ctx.fillStyle='#e9f3f7';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(text,p.x,p.y+.3);
  }
  function draw(cam,w,h){
    if(!ctx)return;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#172430';ctx.fillRect(0,0,w,h);
    // Exact five surfaces, no overlaid perspective floor painting.
    for(const face of FACES)plane(face.vertices,cam,w,h,COLORS[face.id]);
    contactShadow(CHARACTERS.enemy,cam,w,h);
    contactShadow(CHARACTERS.player,cam,w,h);
    for(const face of FACES)faceText(face.label,face.center,cam,w,h);
  }
  function applyActor(id,geometry,originX,originY){
    if(!geometry)return;
    const fix=v=>v.toFixed(3)+'px';
    setVar(id,'size',fix(geometry.canvasSize));
    setVar(id,'left',fix(originX+geometry.localLeft));
    setVar(id,'top',fix(originY+geometry.localTop));
  }
  function render(inputX=0,inputY=0){
    if(!enabled)return false;
    const w=stage.clientWidth,h=stage.clientHeight;
    if(w<1||h<1)return false;
    const cam=camera(inputX,inputY);
    const info=metrics();
    const player=actorGeometry('player',cam,w,h,info.player);
    const enemy=actorGeometry('enemy',cam,w,h,info.enemy);
    const left=(view.clientWidth-w)/2,top=(view.clientHeight-h)/2;
    applyActor('player',player,left,top);
    applyActor('enemy',enemy,left,top);
    const pixelRatio=Math.min(1.5,window.devicePixelRatio||1,
      Math.sqrt(2000000/(w*h)));
    const bw=Math.max(1,Math.round(w*pixelRatio));
    const bh=Math.max(1,Math.round(h*pixelRatio));
    const key=[w,h,cam.x,cam.y,cam.yaw,cam.pitch,bw,bh].map(x=>x.toFixed(4)).join(',');
    if(key!==lastKey){
      if(surface.width!==bw)surface.width=bw;
      if(surface.height!==bh)surface.height=bh;
      ctx.setTransform(bw/w,0,0,bh/h,0,0);
      draw(cam,w,h);lastKey=key;
    }
    lastState={active:true,faceCount:FACES.length,room:ROOM,
      camera:cam,player,enemy,floorY:0,
      actorRendering:'real-game-l2d',canvasSize:{w:bw,h:bh}};
    return true;
  }
  function setActive(state){
    enabled=!!state;surface.hidden=!enabled;
    view.classList.toggle('room-blockout-active',enabled);
    if(!enabled){
      lastKey='';lastState=null;
      for(const id of ['player','enemy'])for(const key of ['size','left','top'])
        view.style.removeProperty('--room-'+id+'-'+key);
    }else render(0,0);
  }
  return Object.freeze({setActive,render,
    inspect:()=>lastState||{active:false,faceCount:5,room:ROOM},
    get canvas(){return surface}
  });
}
return Object.freeze({ROOM,BASE_CAMERA,CHARACTERS,COLORS,FACES,camera,project,
  actorGeometry,create});
});