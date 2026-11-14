/* STATIC SEVEN-BAY BOX WHITEBOX — No lid, no hinges, no card/lid flipping.
 * First settle the physical box dimensions and collision-free silhouette.
 * The tray is screen-space 3D, NOT a slab lying in the battlefield.
 * Anima will paint surfaces later; all meshes use neutral prototype colors.
 */
(function(root){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function create(o){
 const {canvas,gl,drawCard,renderGeom,box,cardW,cardH,cardD,T,S,RX,RZ,mul,
  perspective,getVP,uniformVP,makeTexture}=o;
 const jobs=root.PaperchalkProfessionDecks?.CLASSES||[];
 const paint={
  back:[.82,.82,.81,1],floor:[.71,.72,.72,1],
  wells:[.59,.61,.61,1],walls:[.93,.93,.91,1],
  front:[.83,.85,.85,1],paper:[.92,.90,.85,1],stripe:[.77,.78,.77,1]
 };
 const textIcons={engineer:'⚙',guardian:'盾',warrior:'斧',ranger:'弓',
  skirmisher:'影',medic:'药',summoner:'兽'};
 const cardTextures=new Map(),portraits=new Map();
 const fov=39*Math.PI/180,cameraZ=14.5;
 let width=1920,height=1080,spanW=18,spanH=10,now=0,scene=[],hot=[],hover=null,press=null;
 let sceneMotion={mode:'steady',start:0},drawCalls=0,deckMeshes=0;
 function size(w,h){
  width=Math.max(1,w);height=Math.max(1,h);
  spanH=2*cameraZ*Math.tan(fov/2);spanW=spanH*width/height;
 }
 function dims(){
  const mobile=canvas.getBoundingClientRect().width<720;
  const w=spanW*(mobile?.944:.90);
  const h=mobile?1.16:1.96;
  const wall=mobile?.070:.088;
  const divider=mobile?.055:.078;
  const bay=(w-2*wall)/7;
  const usableX=bay-divider-.15;
  const usableY=h-2*wall-.22;
  // Cards stay STRICTLY inside a well, with guaranteed margin at all sides.
  const scale=Math.min(usableX/cardW,usableY/cardH)*.91;
  const y=-spanH/2+h/2+(mobile?.17:.21);
  return {mobile,w,h,y,wall,divider,bay,scale,
   innerH:h-2*wall,innerW:bay-divider,
   cardW:cardW*scale,cardH:cardH*scale,
   x0:-w/2+wall+bay/2};
 }
 function boxMesh(x,y,z,w,h,d,color,g){
  renderGeom(box,mul(mul(sceneScale(g),T(x,y,z)),S(w,h,d)),color);drawCalls++;
 }
 function stageK(){
  if(sceneMotion.mode==='exit')return 1-smooth((now-sceneMotion.start)/.52);
  if(sceneMotion.mode==='enter')return smooth((now-sceneMotion.start)/.68);
  return 1;
 }
 function sceneScale(g){
  const k=stageK();return mul(mul(T(0,g.y,0),S(k,k,k)),T(0,-g.y,0));
 }
 function renderCard(matrix,texture,g){
  if(stageK()<.012)return;
  drawCard({hudMatrix:mul(sceneScale(g),matrix),texture,side:'ally'},now);drawCalls++;
 }
 function textureFor(card,url){
  if(url){
   if(portraits.has(url)&&portraits.get(url))return portraits.get(url);
   if(!portraits.has(url)){
    portraits.set(url,null);
    const img=new Image();
    img.onload=()=>portraits.set(url,makeTexture(img));
    img.onerror=()=>portraits.set(url,null);img.src=url;
   }
  }
  const role=card?.profession||'warrior',name=url?'人物卡':card?.name||'行动牌';
  const key=role+':'+name;
  if(cardTextures.has(key))return cardTextures.get(key);
  const cv=document.createElement('canvas');cv.width=384;cv.height=576;
  const c=cv.getContext('2d');
  c.fillStyle='#faf9f4';c.fillRect(0,0,384,576);
  c.lineWidth=7;c.strokeStyle='#bdbbb3';c.strokeRect(15,15,354,546);
  c.lineWidth=2;c.strokeStyle='#dedbd4';c.strokeRect(31,31,322,514);
  c.textAlign='center';c.fillStyle='#4d5151';c.font='bold 33px serif';
  c.fillText(jobs.find(c=>c.id===role)?.name||'职业',192,85);
  c.font='bold 115px serif';c.fillText(textIcons[role]||'✦',192,294);
  c.font='bold 36px serif';c.fillText(name,192,423);
  const tex=makeTexture(cv);cardTextures.set(key,tex);return tex;
 }
 function layout(snapshot,staged,g){
  const slots=[];
  jobs.forEach((job,i)=>{
   const count=snapshot.classes.find(c=>c.id===job.id)?.deckCount||0;
   const x=g.x0+i*g.bay;
   slots.push({kind:'deck',id:'deck:'+job.id,profession:job.id,
    x,y:g.y,z:.18,scale:g.scale,deckCount:count});
  });
  for(const unit of staged){
   const p=slots.find(p=>p.profession===unit.role);
   if(p)slots.push({...p,kind:'character',id:'character:'+unit.id,
    unitId:unit.id,portrait:unit.portrait});
  }
  // Temporary STATIC hand presentation above the box. No lid material,
  // no lid transform, no card flip. Gameplay remains testable meanwhile.
  const hand=snapshot.hand||[];
  const maxW=g.w*.75;
  const spacing=Math.min(g.mobile?.30:.70,maxW/Math.max(1,hand.length));
  const fan=(hand.length-1)*spacing;
  const sc=Math.min(g.mobile?.235:.51,g.w/(Math.max(1,hand.length)*cardW)*.68);
  hand.forEach((card,i)=>{
   const axis=hand.length===1?0:(i-(hand.length-1)/2);
   slots.push({kind:'hand',id:'hand:'+card.instance,instance:card.instance,
    c:card,x:axis*spacing,y:g.y+g.h/2+(g.mobile?.49:.75),z:.7,
    scale:sc,angle:0});
  });
  return slots;
 }
 function geometry(g){
  const W=g.w,H=g.h,w=g.wall,v=g.divider;
  // Solid BACKPLATE and cavity floor lie behind everything.
  boxMesh(0,g.y,-.40,W,H,.18,paint.back,g);
  boxMesh(0,g.y,-.28,W-2*w,H-2*w,.055,paint.floor,g);
  // Darker well floors highlight real seven-fold subdivision.
  for(let i=0;i<7;i++){
   const x=g.x0+i*g.bay;
   boxMesh(x,g.y,-.235,g.bay-v-.015,H-2*w-.025,.025,paint.wells,g);
  }
  // Four continuous perimeter walls. Corners join flush, not overlapping
  // each other or any card faces. Equal 3D depth for all seven compartments.
  const z=-.17,depth=.27;
  boxMesh(0,g.y+H/2-w/2,z,W,w,depth,paint.walls,g);
  boxMesh(0,g.y-H/2+w/2,z,W,w,depth,paint.walls,g);
  boxMesh(-W/2+w/2,g.y,z,w,H-2*w,depth,paint.walls,g);
  boxMesh(W/2-w/2,g.y,z,w,H-2*w,depth,paint.walls,g);
  for(let i=1;i<=6;i++){
   const x=-W/2+w+i*g.bay;
   boxMesh(x,g.y,z,v,H-2*w,depth,paint.walls,g);
  }
  // One continuous shallow front edge, only BELOW the wells.
  boxMesh(0,g.y-H/2+w*.68,.005,W-w*1.5,w*.54,.078,paint.front,g);
 }
 function pileMatrix(p,g,z){
  return mul(T(p.x,p.y,z),S(g.scale,g.scale,1));
 }
 function decks(g,positions,staged){
  for(const p of positions.filter(p=>p.kind==='deck')){
   const cards=o.remainingCards?.(p.profession)||[],count=cards.length;
   if(!count)continue;
   // Back-to-front bounds: well floor -.235; paper stack -.14 to +.08;
   // textured face +.105. Frame stops at -.035, cannot cover any card.
   const thickness=Math.min(.18,count*.018);
   boxMesh(p.x,p.y,-.035+thickness*.49,
    g.cardW,g.cardH,thickness,paint.paper,g);
   for(let i=1;i<count;i+=3){
    boxMesh(p.x,p.y,-.035+i*.018,g.cardW,g.cardH,.003,paint.stripe,g);
   }
   const topZ=-.035+thickness*.99+cardD/2;
   renderCard(pileMatrix(p,g,topZ),
    textureFor(cards[count-1]),g);deckMeshes++;
   const unit=staged.find(u=>u.role===p.profession);
   if(unit)renderCard(mul(T(p.x,p.y,topZ+cardD+.012),S(g.scale,g.scale,1)),
    textureFor({profession:p.profession},unit.portrait),g);
  }
 }
 function draw(t,w,h){
  now=t;size(w,h);
  const g=dims(),snapshot=o.snapshot(),staged=o.staged?.()||[];
  const positions=layout(snapshot,staged,g);scene=positions;
  hot=positions;drawCalls=0;deckMeshes=0;
  const oldVP=getVP();
  gl.viewport(0,0,width,height);gl.clear(gl.DEPTH_BUFFER_BIT);
  uniformVP(mul(perspective(fov,width/height,.1,80),T(0,0,-cameraZ)));
  geometry(g);
  decks(g,positions,staged);
  for(const p of positions.filter(x=>x.kind==='hand')){
   const chosen=o.selected?.()===p.instance;
   const focus=hover===p.id;
   const m=mul(T(p.x,p.y+(chosen?.18:0)+(focus?.09:0),p.z),
    mul(RZ(0),S(p.scale*(focus?1.06:1),p.scale*(focus?1.06:1),1)));
   renderCard(m,textureFor(p.c),g);
  }
  uniformVP(oldVP);gl.viewport(0,0,width,height);
 }
 function worldPoint(e){
  const rect=canvas.getBoundingClientRect();
  if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)return null;
  return {x:((e.clientX-rect.left)/rect.width-.5)*spanW,
   y:(.5-(e.clientY-rect.top)/rect.height)*spanH};
 }
 function hit(e){
  const q=worldPoint(e);if(!q)return null;
  const ranked=[...hot].sort((a,b)=>({character:3,hand:2,deck:1}[b.kind]||0)-
   ({character:3,hand:2,deck:1}[a.kind]||0));
  for(const p of ranked){
   const sc=p.scale;
   const bw=cardW*sc*(p.kind==='hand'?.6:.52);
   const bh=cardH*sc*(p.kind==='hand'?.6:.49);
   if(Math.abs(q.x-p.x)<bw&&Math.abs(q.y-p.y)<bh)return p;
  }
  return null;
 }
 function move(e){const p=hit(e);hover=p?.id||null;
  if(press?.id.startsWith('character:'))o.previewCharacter?.(press.id.slice(10),e.clientX,e.clientY);
  return !!p;}
 function down(e){const p=hit(e);if(!p)return false;
  e.preventDefault();press={id:p.id,x:e.clientX,y:e.clientY};hover=p.id;return true;}
 function up(e){
  if(!press)return false;
  const old=press;press=null;
  const p=hit(e),moved=Math.hypot(e.clientX-old.x,e.clientY-old.y)>22;
  if(old.id.startsWith('character:')){
   const id=old.id.slice(10);o.previewCharacter?.(null);
   if(moved)o.placeCharacter?.(id,e.clientX,e.clientY);
   else if(p?.id===old.id)o.selectCharacter?.(id);
   return true;
  }
  if(!moved&&p?.id===old.id){
   if(p.kind==='deck')o.draw?.(p.profession);
   if(p.kind==='hand')o.select?.(p.instance);
  }
  return true;
 }
 function pointFor(id){
  const p=scene.find(x=>x.id===id);if(!p)return null;
  const r=canvas.getBoundingClientRect();
  return {x:r.left+(.5+p.x/spanW)*r.width,
   y:r.top+(.5-p.y/spanH)*r.height};
 }
 function animateScene(mode,at){sceneMotion={mode,start:at};}
 function resetAnimations(){scene=[];hover=null;sceneMotion={mode:'steady',start:0};}
 return Object.freeze({
  render:draw,hit,move,down,up,pointFor,animateScene,resetAnimations,
  get drawn(){return drawCalls;},
  get snapshot(){
   const g=dims(),count=o.snapshot();
   const horizontalClearance=(g.innerW-g.cardW)/2;
   const verticalClearance=(g.innerH-g.cardH)/2;
   return {geometry:'single-static-seven-bay-whitebox',
    visible:scene.map(p=>({id:p.id,kind:p.kind,x:p.x,y:p.y})),
    visibleDeckPiles:7,stagedCharacterCards:scene.filter(p=>p.kind==='character').length,
    compartments:7,physicalBoxes:1,hasLid:false,hasHinge:false,
    reversibleLid:false,flipAnimationEnabled:false,screenEdgeAnchored:true,
    drawCalls,renderedCardMeshes:deckMeshes,count:count.count,
    physicalDeckCards:count.classes.reduce((n,c)=>n+c.deckCount,0),
    bounds:{x:-g.w/2,y:g.y-g.h/2,w:g.w,h:g.h,
     horizontalClearance,verticalClearance,cardWidth:g.cardW,
     cardHeight:g.cardH,pitch:g.bay,divider:g.divider,
     safeHorizontalMargin:spanW/2-g.w/2,
     safeBottomMargin:spanH/2+(g.y-g.h/2)}
   };
  }
 });
}
root.PaperchalkSceneCardHUD=Object.freeze({version:'6.0.0-static-seven-bay-whitebox',create});
})(window);
