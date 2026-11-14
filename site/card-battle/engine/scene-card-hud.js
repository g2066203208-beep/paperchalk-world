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
 const {canvas,gl,drawCard,renderGeom,makeGeom,box,cardW,cardH,cardD,T,S,RX,RZ,mul,
  perspective,getVP,uniformVP,makeTexture}=o;
 const jobs=root.PaperchalkProfessionDecks?.CLASSES||[];
 const paint={
  back:[.85,.85,.84,1],floor:[.77,.78,.78,1],
  wells:[.70,.72,.72,1],walls:[.94,.94,.92,1],
  bevel:[.87,.89,.89,1],front:[.92,.93,.92,1],
  paper:[.95,.95,.94,1],cap:[.985,.985,.975,1],
  stripe:[.76,.78,.78,1]
 };
 const textIcons={engineer:'⚙',guardian:'盾',warrior:'斧',ranger:'弓',
  skirmisher:'影',medic:'药',summoner:'兽'};
 const cardTextures=new Map(),portraits=new Map();
 const fov=39*Math.PI/180,cameraZ=14.5;
 let width=1920,height=1080,spanW=18,spanH=10,now=0,scene=[],hot=[],hover=null,press=null;
 let sceneMotion={mode:'steady',start:0},drawCalls=0,deckMeshes=0;
 let collapsed=true; // Default view is an unobstructed 16x6 board; deck stays in game state.
 function size(w,h){
  width=Math.max(1,w);height=Math.max(1,h);
  spanH=2*cameraZ*Math.tan(fov/2);spanW=spanH*width/height;
 }
 function dims(){
  const mobile=canvas.getBoundingClientRect().width<720;
  // Reference: ONE low, wide 7-slot tray, ratio approx 4.3:1.
  // Former model was almost twice too wide for standard 2:3 cards.
  const w=spanW*(mobile?.945:.630),h=w/4.30;
  const wall=h*.052,divider=h*.015,cardGap=h*.012;
  const bay=(w-2*wall)/7,usableW=bay-divider-2*cardGap;
  const usableH=h-2*wall-h*.066;
  const scale=Math.min(usableW/cardW,usableH/cardH);
  const y=-spanH/2+h/2+(mobile?.14:.19);
  const cardWidth=cardW*scale,cardHeight=cardH*scale;
  return {mobile,w,h,y,wall,divider,bay,scale,cardGap,
   innerH:h-2*wall,innerW:bay-divider,
   cardW:cardWidth,cardH:cardHeight,
   cornerRadius:h*.155,cardRadius:Math.min(cardWidth,cardHeight)*.080,
   x0:-w/2+wall+bay/2};
 }
 // Proper extruded rounded rectangles, not stacked square cuboids pretending
 // to be rounded. All 3D geometry uses the battle renderer's shared format:
 // position(3), normal(3), uv(2) with real front/back/shell surfaces.
 const shapeCache=new Map();
 function outline(w,h,r,steps=8){
  const pts=[],rad=Math.min(r,w/2-.0001,h/2-.0001);
  for(const [cx,cy,start] of [[w/2-rad,h/2-rad,0],
   [-w/2+rad,h/2-rad,90],[-w/2+rad,-h/2+rad,180],
   [w/2-rad,-h/2+rad,270]]){
   for(let i=0;i<=steps;i++){
    const a=(start+90*i/steps)*Math.PI/180;
    pts.push([cx+Math.cos(a)*rad,cy+Math.sin(a)*rad]);
   }
  }
  return pts;
 }
 function roundedPrism(w,h,r){
  const pts=outline(w,h,r),vs=[],ids=[];
  function vert(x,y,z,nx,ny,nz){
   const j=vs.length/8;vs.push(x,y,z,nx,ny,nz,x/w+.5,y/h+.5);return j;
  }
  for(const sign of [1,-1]){
   const z=sign*.5,center=vert(0,0,z,0,0,sign),face=[];
   for(const p of pts)face.push(vert(p[0],p[1],z,0,0,sign));
   for(let i=0;i<pts.length;i++){
    const j=(i+1)%pts.length;
    if(sign>0)ids.push(center,face[i],face[j]);
    else ids.push(center,face[j],face[i]);
   }
  }
  for(let i=0;i<pts.length;i++){
   const p=pts[i],q=pts[(i+1)%pts.length],dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy)||1;
   const nx=dy/l,ny=-dx/l;
   const a=vert(p[0],p[1],.5,nx,ny,0),b=vert(q[0],q[1],.5,nx,ny,0);
   const c=vert(q[0],q[1],-.5,nx,ny,0),d=vert(p[0],p[1],-.5,nx,ny,0);
   ids.push(a,d,c,a,c,b);
  }
  return makeGeom(vs,ids);
 }
 function roundedRim(w,h,r,border){
  const outer=outline(w,h,r),inner=outline(w-2*border,h-2*border,Math.max(.001,r-border));
  const vs=[],ids=[];
  function vert(x,y,z,nx,ny,nz){
   const k=vs.length/8;vs.push(x,y,z,nx,ny,nz,x/w+.5,y/h+.5);return k;
  }
  for(let i=0;i<outer.length;i++){
   const j=(i+1)%outer.length,p=outer[i],q=outer[j],a=inner[i],b=inner[j];
   const x0=vert(p[0],p[1],.5,0,0,1),x1=vert(q[0],q[1],.5,0,0,1);
   const x2=vert(b[0],b[1],.5,0,0,1),x3=vert(a[0],a[1],.5,0,0,1);
   ids.push(x0,x1,x2,x0,x2,x3);
   const dx=q[0]-p[0],dy=q[1]-p[1],dl=Math.hypot(dx,dy)||1;
   const nx=dy/dl,ny=-dx/dl;
   const u0=vert(p[0],p[1],.5,nx,ny,0),u1=vert(q[0],q[1],.5,nx,ny,0),
     u2=vert(q[0],q[1],-.5,nx,ny,0),u3=vert(p[0],p[1],-.5,nx,ny,0);
   ids.push(u0,u3,u2,u0,u2,u1);
   const i0=vert(a[0],a[1],.5,-nx,-ny,0),i1=vert(b[0],b[1],.5,-nx,-ny,0),
     i2=vert(b[0],b[1],-.5,-nx,-ny,0),i3=vert(a[0],a[1],-.5,-nx,-ny,0);
   ids.push(i0,i1,i2,i0,i2,i3);
  }
  return makeGeom(vs,ids);
 }
 function shapes(g){
  const key=[g.w,g.h,g.wall,g.cardW,g.cardH].map(x=>x.toFixed(3)).join('|');
  if(shapeCache.has(key))return shapeCache.get(key);
  // Cache one true curved shell, one hollow rail, and one rounded card-pile
  // primitive. No allocations or morphing in the render loop.
  const made={
   floor:roundedPrism(g.w,g.h,g.cornerRadius),
   cavity:roundedPrism(g.w-2*g.wall,g.h-2*g.wall,Math.max(.03,g.cornerRadius-g.wall)),
   rail:roundedRim(g.w,g.h,g.cornerRadius,g.wall),
   bevel:roundedRim(g.w-.025,g.h-.025,Math.max(.03,g.cornerRadius-.012),g.wall*.55),
   deck:roundedPrism(g.cardW,g.cardH,g.cardRadius),
   top:roundedPrism(g.cardW*.985,g.cardH*.985,g.cardRadius*.96)
  };
  shapeCache.set(key,made);
  if(shapeCache.size>8){
   const first=shapeCache.keys().next().value,old=shapeCache.get(first);
   for(const geo of Object.values(old)){gl.deleteBuffer(geo.b);gl.deleteBuffer(geo.i);}
   shapeCache.delete(first);
  }
  return made;
 }
 function curved(geom,x,y,z,depth,color,g,rotation=0){
  if(stageK()<.012)return;
  const local=mul(mul(T(x,y,z),RX(rotation)),S(1,1,depth));
  renderGeom(geom,mul(sceneScale(g),local),color);drawCalls++;
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
  const model=shapes(g);
  // Continuous solid rounded outer pan, with NO square joints at corners.
  curved(model.floor,0,g.y,-.325,.16,paint.back,g);
  curved(model.cavity,0,g.y,-.234,.038,paint.floor,g);
  // Open cavity: outer/inner sides and upper lip share EXACT rounded contour.
  curved(model.rail,0,g.y,-.115,.23,paint.walls,g);
  curved(model.bevel,0,g.y,-.0005,.013,paint.bevel,g);
  // Thin well separators live BEHIND the exposed decks; none overlap top cards.
  for(let i=1;i<7;i++){
   const x=-g.w/2+g.wall+i*g.bay;
   boxMesh(x,g.y,-.134,g.divider,g.innerH-.023,.11,paint.wells,g);
  }
 }
 function pileMatrix(p,g,z){
  return mul(T(p.x,p.y,z),S(g.scale,g.scale,1));
 }
 function decks(g,positions,staged){
  const model=shapes(g);
  for(const p of positions.filter(p=>p.kind==='deck')){
   const cards=o.remainingCards?.(p.profession)||[],count=cards.length;
   if(!count)continue;
   // Tight white prototype stack. Top edge reclines slightly behind bottom.
   // Physical thickness changes with the actual number of cards remaining.
   const tilt=-.105,thickness=.040+Math.min(10,count)*.016;
   const center=.014+thickness*.5;
   curved(model.deck,p.x,p.y,center,thickness,paint.paper,g,tilt);
   // Floating white face exactly atop the same tilted rounded solid.
   curved(model.top,p.x,p.y,center+thickness*.50+.002,.009,paint.cap,g,tilt);
   // Actual faint paper-layer separation on the depth walls: kept to 5
   // lines maximum (draw-call budget) rather than all 70 covered faces.
   for(let i=1;i<Math.min(count,10);i+=2){
    const z=.014+i*.016;
    curved(model.deck,p.x,p.y,z,.0022,paint.stripe,g,tilt);
   }
   deckMeshes++;
   const unit=staged.find(u=>u.role===p.profession);
   if(unit){
    // Deployment portrait remains on top; the underlying neutral stack is
    // still a complete rounded solid like all six neighboring stacks.
    const m=mul(T(p.x,p.y,center+thickness*.5+cardD+.022),
      mul(RX(tilt),S(g.scale,g.scale,1)));
    renderCard(m,textureFor({profession:p.profession},unit.portrait),g);
   }
  }
 }
 function draw(t,w,h){
  now=t;size(w,h);
  // Folded drawer is not rendered or interactive. Deck/hand state persists.
  if(collapsed){scene=[];hot=[];hover=null;press=null;drawCalls=0;deckMeshes=0;return;}
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
  if(collapsed)return null;
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
  if(collapsed)return null;
  const p=scene.find(x=>x.id===id);if(!p)return null;
  const r=canvas.getBoundingClientRect();
  return {x:r.left+(.5+p.x/spanW)*r.width,
   y:r.top+(.5-p.y/spanH)*r.height};
 }
 function setCollapsed(next){
  collapsed=!!next;
  hover=null;press=null;
  if(collapsed){scene=[];hot=[];}
  return collapsed;
 }
 function animateScene(mode,at){sceneMotion={mode,start:at};}
 function resetAnimations(){scene=[];hover=null;sceneMotion={mode:'steady',start:0};}
 return Object.freeze({
  render:draw,hit,move,down,up,pointFor,animateScene,resetAnimations,setCollapsed,
  get collapsed(){return collapsed;},
  get drawn(){return drawCalls;},
  get snapshot(){
   const g=dims(),count=o.snapshot();
   const horizontalClearance=(g.innerW-g.cardW)/2;
   const verticalClearance=(g.innerH-g.cardH)/2;
   return {geometry:'single-static-seven-bay-whitebox',roundedCase:true,beveledRim:true,
    fittedCardStacks:true,cardStackTiltRadians:-.105,
    visible:scene.map(p=>({id:p.id,kind:p.kind,x:p.x,y:p.y})),
    visibleDeckPiles:collapsed?0:7,stagedCharacterCards:scene.filter(p=>p.kind==='character').length,
    collapsed,canExpand:true,
    compartments:7,physicalBoxes:1,hasLid:false,hasHinge:false,
    reversibleLid:false,flipAnimationEnabled:false,screenEdgeAnchored:true,
    drawCalls,renderedCardMeshes:deckMeshes,count:count.count,
    physicalDeckCards:count.classes.reduce((n,c)=>n+c.deckCount,0),
    bounds:{x:-g.w/2,y:g.y-g.h/2,w:g.w,h:g.h,
     horizontalClearance,verticalClearance,cardWidth:g.cardW,
     cardHeight:g.cardH,pitch:g.bay,divider:g.divider,
     roundedCornerRadius:g.cornerRadius,slotGap:g.bay-g.cardW,
     safeHorizontalMargin:spanW/2-g.w/2,
     safeBottomMargin:spanH/2+(g.y-g.h/2)}
   };
  }
 });
}
root.PaperchalkSceneCardHUD=Object.freeze({version:'7.0.0-rounded-closefit-whitebox',create});
})(window);
