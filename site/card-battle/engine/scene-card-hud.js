/* One reusable seven-bay physical card case: walnut, forest felt, aged brass.
 * No lid, hinges or unrelated UI surfaces. Real 3D curved shell + card piles;
 * independent player-click class decks and all layout hitboxes stay intact.
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
  back:[.36,.255,.19,1],floor:[.12,.20,.16,1],
  wells:[.46,.34,.22,1],walls:[.51,.35,.23,1],
  bevel:[.77,.64,.39,1],front:[.92,.87,.72,1],
  paper:[.84,.80,.72,1],cap:[.985,.965,.91,1],
  stripe:[.66,.59,.48,1],
  felt:[.18,.28,.225,1],feltShadow:[.12,.18,.145,1],
  brass:[.72,.59,.36,1],engraving:[.47,.39,.27,1]
 };
 // Reusable material textures are generated ONCE, not per animation frame.
 const woodCanvas=document.createElement('canvas');woodCanvas.width=512;woodCanvas.height=256;
 const woodCtx=woodCanvas.getContext('2d');
 const woodGradient=woodCtx.createLinearGradient(0,0,512,256);
 woodGradient.addColorStop(0,'#71513a');woodGradient.addColorStop(.5,'#493122');
 woodGradient.addColorStop(1,'#63442e');
 woodCtx.fillStyle=woodGradient;woodCtx.fillRect(0,0,512,256);
 let grainSeed=22819;
 const noise=()=>{grainSeed=(Math.imul(grainSeed,1664525)+1013904223)>>>0;return grainSeed/4294967296;};
 for(let k=0;k<360;k++){
  const y=noise()*256,thickness=.3+noise()*1.4,x=noise()*512;
  woodCtx.strokeStyle=noise()>.5?'#ba8b5c36':'#19140f43';
  woodCtx.lineWidth=thickness;woodCtx.beginPath();
  woodCtx.moveTo(x-190,y);
  woodCtx.bezierCurveTo(x-40,y+(noise()-.5)*7,
   x+100,y+(noise()-.5)*7,x+235,y);woodCtx.stroke();
 }
 const walnut=makeTexture(woodCanvas);
 const cardTextures=new Map(),portraits=new Map(),cardArtImages=new Map();
 const fov=39*Math.PI/180,cameraZ=14.5;
 let width=1920,height=1080,spanW=18,spanH=10,now=0,scene=[],hot=[],hover=null,press=null;
 let sceneMotion={mode:'steady',start:0},drawCalls=0,deckMeshes=0,lastDeal=null;
 // UI-only tactile state. Never changes the underlying pile or world scene.
 const deckLift=new Map();
 const motion=root.PaperchalkCardHandMotion?.create();
 const caseMotion=root.PaperchalkCardCaseMotion?.create();
 if(!motion||!caseMotion)
  throw Error('Load card-hand-motion and card-case-motion before scene-card-hud');
 let lastFrame=0,drag=null,heroDrag=null;
 const dragThreshold=10;
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
   top:roundedPrism(g.cardW*.985,g.cardH*.985,g.cardRadius*.96),
   well:roundedPrism(g.cardW*1.055,g.cardH*1.045,g.cardRadius*1.1)
  };
  shapeCache.set(key,made);
  if(shapeCache.size>8){
   const first=shapeCache.keys().next().value,old=shapeCache.get(first);
   for(const geo of Object.values(old)){gl.deleteBuffer(geo.b);gl.deleteBuffer(geo.i);}
   shapeCache.delete(first);
  }
  return made;
 }
 function curved(geom,x,y,z,depth,color,g,rotation=0,texture=null,metal=0){
  if(stageK()<.012)return;
  const local=mul(mul(T(x,y,z),RX(rotation)),S(1,1,depth));
  renderGeom(geom,mul(sceneScale(g),local),color,texture,false,null,metal);
  drawCalls++;
 }
 function boxMesh(x,y,z,w,h,d,color,g){
  renderGeom(box,mul(mul(sceneScale(g),T(x,y,z)),S(w,h,d)),color);drawCalls++;
 }
 // A card case is anchored to the SCREEN bottom, not to the forest biome.
 // Each curved case mesh / paper pile shares exactly this ONE translation.
 function stageK(g){return caseMotion.transform(now,(g||dims()).h).visible;}
 function sceneScale(g){return T(0,caseMotion.transform(now,g.h).y,0);}
 function renderCard(matrix,texture,g,layer='hand'){
  if(layer==='case'&&stageK(g)<.008)return;
  const model=layer==='case'?mul(sceneScale(g),matrix):matrix;
  drawCard({hudMatrix:model,texture,side:'ally'},now);drawCalls++;
 }
 function textureFor(card,url){
  if(url&&!card?.type){
   if(portraits.has(url)&&portraits.get(url))return portraits.get(url);
   if(!portraits.has(url)){
    portraits.set(url,null);
    const img=new Image();
    img.onload=()=>portraits.set(url,makeTexture(img));
    img.onerror=()=>portraits.set(url,null);img.src=url;
   }
  }
  const role=card?.profession||'warrior';
  const name=card?.type?card.name:(url?'人物卡':card?.name||'行动牌');
  const key=role+':'+(card?.id||name)+':'+(card?.type||'portrait');
  const artUrl=card?.type?(url||root.PaperchalkFacilityArt?.get(card.id)?.cardArt):null;
  // The same transparent painted prop is automatically composited on the
  // paper face in the fan AND on the visible top of the owner deck.
  if(artUrl){
   let record=cardArtImages.get(artUrl);
   if(!record){
    record={image:null,keys:new Set()};cardArtImages.set(artUrl,record);
    const image=new Image();
    image.onload=()=>{
     record.image=image;
     for(const affected of record.keys){
      const old=cardTextures.get(affected);
      if(old){gl.deleteTexture?.(old);cardTextures.delete(affected);}
     }
    };
    image.onerror=()=>{record.failed=true;};
    image.src=artUrl;
   }
   record.keys.add(key);
  }
  if(cardTextures.has(key))return cardTextures.get(key);
  const cv=document.createElement('canvas');cv.width=384;cv.height=576;
  const c=cv.getContext('2d');
  const paper=c.createLinearGradient(0,0,384,576);
  paper.addColorStop(0,'#fffcf1');paper.addColorStop(1,'#e7ddc9');
  c.fillStyle=paper;c.fillRect(0,0,384,576);
  c.lineWidth=8;c.strokeStyle='#b59865';c.strokeRect(15,15,354,546);
  c.lineWidth=2;c.strokeStyle='#d4c09d';c.strokeRect(29,29,326,518);
  // Plain ivory card back: no titles, role symbols or decorative words.
  c.fillStyle='#e9e3d4';c.fillRect(37,39,310,498);
  c.strokeStyle='#c3bba9';c.lineWidth=3;c.strokeRect(45,47,294,482);
  if(card?.type){
   // Physical hand cards must show which skill was actually drawn.
   // These are readable temporary programmatic fronts; deck BOX stays blank.
   const isFarm=card.type==='facility',accent=isFarm?'#69866a':'#a27b4e';
   c.fillStyle=accent;c.fillRect(46,48,292,12);
   c.fillStyle='#484337';c.font='bold 31px serif';c.textAlign='center';
   c.fillText(isFarm?'农民 · 设施':card.family==='character'?'角色专属':'战士 · 行动',192,105);
   c.fillStyle='#28271e';c.font='bold 53px serif';
   c.fillText(card.name||'卡牌',192,180,320);
   c.fillStyle=isFarm?'#d5e1cb':'#e2d6bf';
   c.beginPath();c.arc(192,315,92,0,Math.PI*2);c.fill();
   c.font='bold 98px serif';c.fillStyle='#526753';
   const marks={'farm-field':'田','plant-tree':'树','water-well':'井',
    'scarecrow':'草','windmill':'磨','lumber':'斧',
    'strike':'斧','heavy-strike':'劈','cleave':'扫','guard':'守'};
   const painted=artUrl&&cardArtImages.get(artUrl)?.image;
   if(painted&&typeof c.drawImage==='function'){
    const maxW=292,maxH=244;
    const ratio=Math.min(maxW/painted.width,maxH/painted.height);
    const w=painted.width*ratio,h=painted.height*ratio;
    c.drawImage(painted,192-w/2,322-h/2,w,h);
   }else c.fillText(marks[card.id]||'◆',192,350);
   c.fillStyle='#5e5546';c.font='29px serif';
   const message=card.description||'';
   let line='',y=475;
   for(const ch of message){
    if(c.measureText(line+ch).width>287){
     c.fillText(line,192,y);line=ch;y+=36;
    }else line+=ch;
   }
   if(line)c.fillText(line,192,y);
  }
  const tex=makeTexture(cv);cardTextures.set(key,tex);return tex;
 }
 function layout(snapshot,staged,g){
  const slots=[],roster=snapshot.roster||[];
  if(!collapsed||caseMotion.transform(now,g.h).visible>.005){
   for(let i=0;i<7;i++){
    const x=g.x0+i*g.bay,owner=roster[i];
    if(!owner){slots.push({kind:'empty',id:'empty:'+i,slot:i,x,y:g.y});continue;}
    const card={kind:'deck',id:'deck:'+owner.id,ownerId:owner.id,
     profession:owner.profession,slot:i,x,y:g.y,z:.18,scale:g.scale,
     deckCount:owner.deckCount};
    slots.push(card);
    const pending=staged.find(u=>u.id===owner.id);
    if(pending)slots.push({...card,kind:'character',id:'character:'+pending.id,
     unitId:pending.id,portrait:pending.portrait,
     // One-to-one overlay of the OWNER'S stack. No floating second row.
     x,y:g.y,scale:g.scale});
   }
  }
  // Closing the physical case ONLY hides case/decks; cards stay in a larger,
  // independently anchored hand along the lower screen edge.
  const hand=snapshot.hand||[],count=hand.length;
  const sc=g.mobile?.78:1.06;
  const available=spanW*(g.mobile?.93:.76);
  const spacing=count<2?0:Math.min(g.mobile?.52:.92,
   Math.max(.18,(available-cardW*sc)/(count-1)));
  const centerY=collapsed?
   (-spanH/2+(g.mobile?.64:.72)+cardH*sc*.52):
   (g.y+g.h/2+(g.mobile?.82:1.18));
  hand.forEach((card,i)=>{
   const axis=i-(count-1)/2,t=count<2?0:axis/((count-1)/2);
   const arc=(1-t*t)*(g.mobile?.10:.18);
   slots.push({kind:'hand',id:'hand:'+card.instance,instance:card.instance,
    c:card,x:axis*spacing,y:centerY+arc,z:.80,
    scale:sc,angle:-t*(g.mobile?.13:.17),fanIndex:i});
  });
  return slots;
 }
 function geometry(g){
  const model=shapes(g);
  // Handcrafted walnut rounded timber shell; deepest recess is dark felt.
  curved(model.floor,0,g.y,-.325,.22,[1,1,1,1],g,0,walnut);
  curved(model.cavity,0,g.y,-.232,.040,paint.feltShadow,g);
  // Seven individualized recesses separate stacks without heavy black gutters.
  for(let i=0;i<7;i++){
   const x=g.x0+i*g.bay;
   curved(model.well,x,g.y,-.174,.028,paint.felt,g);
  }
  curved(model.rail,0,g.y,-.105,.23,[.87,.82,.74,1],g,0,walnut);
  // Two continuous brushed brass edge inlays on the solid curved rim.
  curved(model.bevel,0,g.y,.014,.010,paint.brass,g,0,null,1);
  for(let i=1;i<7;i++){
   const x=-g.w/2+g.wall+i*g.bay;
   boxMesh(x,g.y,-.134,g.divider*.84,g.innerH-.040,.095,paint.wells,g);
   boxMesh(x,g.y,-.078,g.divider*.32,g.innerH-.095,.009,paint.brass,g);
  }

 }
 function pileMatrix(p,g,z){
  return mul(T(p.x,p.y,z),S(g.scale,g.scale,1));
 }
 function topCardPose(p,g,count){
  const focus=deckLift.get(p.id)||0;
  const tactile=motion.deckPose(p.ownerId,now,focus);
  const previewTarget=g.mobile?.92:1.19;
  const extra=1+focus*(Math.max(1,previewTarget/g.scale)-1);
  const lift=tactile.lift+focus*(g.mobile?.40:.57);
  const remaining=count??o.remainingCards?.(p.ownerId)?.length??0;
  const thickness=.040+Math.min(10,remaining)*.016;
  const z=.014+thickness+cardD+.022+lift*.32;
  return {x:p.x,y:p.y+lift,z,
   scale:g.scale*tactile.scale*extra,tilt:tactile.tilt,
   shimmer:tactile.shimmer};
 }
 function decks(g,positions,staged){
  const model=shapes(g);
  for(const p of positions.filter(p=>p.kind==='deck')){
   const cards=o.remainingCards?.(p.ownerId)||[],count=cards.length;
   if(!count)continue;
   // Model draws with pop(), so last entry IS the visible next draw.
   const next=cards[count-1],tilt=-.105;
   const thickness=.040+Math.min(10,count)*.016,center=.014+thickness*.5;
   curved(model.deck,p.x,p.y,center,thickness,paint.paper,g,tilt);
   curved(model.top,p.x,p.y,center+thickness*.50+.002,.009,paint.cap,g,tilt);
   for(let i=1;i<Math.min(count,10);i+=2){
    curved(model.deck,p.x,p.y,.014+i*.016,.0022,paint.stripe,g,tilt);
   }
   deckMeshes++;
   const pose=topCardPose(p,g,count);
   if(pose.shimmer>.03)
    curved(model.well,p.x,p.y,center+thickness*.5+.018,
     .008,paint.brass,g,0,null,1);
   // Every pile displays its ACTUAL next card; inspect and draw share
   // precisely the same source pose to avoid a visible animation jump.
   const m=mul(T(pose.x,pose.y,pose.z),
     mul(RX(pose.tilt),S(pose.scale,pose.scale,1)));
   renderCard(m,textureFor(next,next.art||next.image||null),g,'case');
  }
 }
 function draw(t,w,h){
  const delta=lastFrame?Math.max(0,Math.min(.10,t-lastFrame)):1/60;
  lastFrame=t;now=t;size(w,h);
  const g=dims(),snapshot=o.snapshot(),staged=o.staged?.()||[];
  const positions=layout(snapshot,staged,g);scene=positions;
  const drawer=caseMotion.transform(now,g.h);
  hot=positions.filter(p=>p.kind==='hand'||(!collapsed&&drawer.interactive&&
   p.kind!=='empty'));
  drawCalls=0;deckMeshes=0;
  // No visible tray AND no hand needs no rendering pass.
  if(drawer.visible<.008&&!snapshot.hand?.length){
   hover=null;motion.tick(now,[]);return;
  }
  const ease=1-Math.exp(-delta*19);
  for(const p of positions.filter(x=>x.kind==='deck')){
   const focus=(hover===p.id||hover==='character:'+p.ownerId||
    press?.id===p.id||press?.id==='character:'+p.ownerId)&&!drag;
   const lift=deckLift.get(p.id)||0;
   deckLift.set(p.id,lift+((focus?1:0)-lift)*ease);
  }
  const oldVP=getVP();
  o.beginScreenPass?.(); // Same world lighting, only cloud coverage is masked.
  gl.viewport(0,0,width,height);gl.clear(gl.DEPTH_BUFFER_BIT);
  uniformVP(mul(perspective(fov,width/height,.1,80),T(0,0,-cameraZ)));
  if(drawer.visible>.008){
   geometry(g);decks(g,positions,staged);
   // The unplaced character portrait is literally the TOP paper sheet of
   // its owner's physical pile. It uses the same card scale and position;
   // only one paper thickness separates it from the face-up action card.
   for(const p of positions.filter(x=>x.kind==='character')){
    if(heroDrag?.id===p.unitId)continue;
    const deck=positions.find(q=>q.kind==='deck'&&q.ownerId===p.ownerId);
    if(!deck)continue;
    const pose=topCardPose(deck,g);
    const chosen=o.selectedCharacter?.()===p.unitId;
    const pulse=motion.selectPose('hero:'+p.unitId,now);
    const base={x:pose.x,y:pose.y+(chosen?.12:0),
     z:pose.z+cardD+.007+(chosen?.10:0),
     scale:pose.scale*(1.012+(chosen?.055:0)),angle:pose.tilt};
    const back=motion.returnPose('hero:'+p.unitId,base,now);
    const visual=back||base;
    const m=mul(T(visual.x,visual.y+(pulse.lift||0),visual.z),
     mul(RX(visual.angle||0),S(visual.scale*(1+(pulse.punch||0)),
      visual.scale*(1+(pulse.punch||0)),1)));
    renderCard(m,textureFor({profession:p.profession,name:'人物卡'},p.portrait),g,'case');
   }
  }
  const cards=positions.filter(p=>p.kind==='hand');
  const ordered=cards.map(p=>{
   const selected=o.selected?.()===p.instance,focus=hover===p.id;
   const pose=motion.settle(p.instance,
    {x:p.x,y:p.y,angle:p.angle,scale:p.scale},now,{hover:focus,selected});
   const flight=['peel','flight','settle'].includes(pose.phase);
   return {p,pose,priority:flight?2:selected||focus?1:0};
  }).sort((a,b)=>a.priority-b.priority||a.p.fanIndex-b.p.fanIndex);
  for(const {p,pose} of ordered){
   if(drag?.instance===p.instance)continue;
   if(pose.phase==='flight'&&o.pileEdge&&gl.enable&&gl.depthMask){
    // Thin paper-edge trails clarify the arc without washing out the art.
    // Drawn only while a card flies; never a permanent glow/idle emitter.
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    for(const [lag,alpha] of [[.075,.11],[.035,.23]]){
     const tail=motion.drawPose(p.instance,
      {x:p.x,y:p.y,scale:p.scale,angle:p.angle},now-lag);
     if(!tail||tail.phase!=='flight')continue;
     const tm=mul(T(tail.x,tail.y,Math.max(.62,tail.z-.07)),
      mul(RZ(tail.angle||0),S(tail.scale*.98,tail.scale*.98,1)));
     renderGeom(o.pileEdge,tm,[.97,.88,.69,alpha],null,true);
    }
    gl.depthMask(true);gl.disable(gl.BLEND);
   }
   const m=mul(T(pose.x,pose.y,pose.z||.8),
    mul(RZ(pose.angle||0),S(pose.scale,pose.scale,1)));
   renderCard(m,textureFor(p.c,p.c.art||p.c.image||null),g);
  }
  // Physical deployment also lifts the real hero card out of its own pile.
  // The slot beneath remains visible; invalid drops animate back to that slot.
  if(heroDrag){
   const pos=worldPoint({clientX:heroDrag.x,clientY:heroDrag.y});
   if(pos){
    const sc=g.mobile?.84:1.18;
    const m=mul(T(pos.x,pos.y+.12,2.25),
     mul(RZ(-.065+Math.max(-.13,Math.min(.13,heroDrag.vx*.004))),
      S(sc,sc,1)));
    renderCard(m,textureFor({profession:heroDrag.profession,name:'人物卡'},
     heroDrag.portrait),g);
   }
  }
  if(drag){
   const pos=worldPoint({clientX:drag.x,clientY:drag.y});
   if(pos){
    const sc=g.mobile?.90:1.19;
    const lean=Math.max(-.22,Math.min(.22,(drag.vx||0)*.0035));
    const m=mul(T(pos.x,pos.y+.16,2.2),
     mul(RZ(-.07+lean),S(sc,sc,1)));
    renderCard(m,textureFor(drag.card,drag.card.art||drag.card.image||null),g);
   }
  }
  motion.tick(now,[...cards.map(p=>p.instance),
   ...positions.filter(p=>p.kind==='character').map(p=>'hero:'+p.unitId)]);
  uniformVP(oldVP);gl.viewport(0,0,width,height);
  o.endScreenPass?.();
 }
 function worldPoint(e){
  const rect=canvas.getBoundingClientRect();
  if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)return null;
  return {x:((e.clientX-rect.left)/rect.width-.5)*spanW,
   y:(.5-(e.clientY-rect.top)/rect.height)*spanH};
 }
 function hit(e){
  const q=worldPoint(e);if(!q)return null;
  const priority={character:3,hand:2,deck:1};
  const ranked=[...hot].sort((a,b)=>(priority[b.kind]||0)-(priority[a.kind]||0)||
   ((a.x-q.x)**2+(a.y-q.y)**2)-((b.x-q.x)**2+(b.y-q.y)**2));
  const drawer=caseMotion.transform(now,dims().h);
  for(const p of ranked){
   if(p.kind!=='hand'&&(!drawer.interactive||collapsed))continue;
   const sc=p.scale;
   const by=p.y+(p.kind==='hand'?0:drawer.y);
   const bw=cardW*sc*(p.kind==='hand'?.62:.52);
   const bh=cardH*sc*(p.kind==='hand'?.61:.49);
   if(Math.abs(q.x-p.x)<bw&&Math.abs(q.y-by)<bh)return p;
   // The enlarged face-up top is still the SAME physically clickable sheet.
   // Keep hit-testing on the lifted region so hover does not flicker or drop
   // when the pointer follows the rising card away from the pile.
   if(p.kind==='deck'){
    const focus=deckLift.get(p.id)||0;
    if(focus>.1){
     const g=dims(),tactile=motion.deckPose(p.ownerId,now,focus);
     const target=g.mobile?.92:1.19;
     const expanded=g.scale*tactile.scale*
      (1+focus*(Math.max(1,target/g.scale)-1));
     const liftedY=p.y+drawer.y+tactile.lift+focus*(g.mobile?.40:.57);
     if(Math.abs(q.x-p.x)<cardW*expanded*.53&&
      Math.abs(q.y-liftedY)<cardH*expanded*.52)return p;
    }
   }
  }
  return null;
 }
 function cancelPress(){
  press=null;drag=null;heroDrag=null;hover=null;o.previewCharacter?.(null);
 }
 function prepareSelected(instance){
  if(o.selected?.()!==instance){
   o.ensureSelected?.(instance);
   motion.selectCard(instance,now);
  }
 }
 function takeFromPile(p){
  // Capture world-space top sheet BEFORE the authoritative pile.pop().
  const from=topCardPose(p,dims());
  const result=o.draw?.(p.ownerId);
  if(!result?.ok)return null;
  lastDeal={profession:p.profession,ownerId:p.ownerId,
   instance:result.card.instance,x:from.x,y:from.y,scale:from.scale,at:now};
  motion.drawCard({instance:result.card.instance,ownerId:p.ownerId,
   from:{x:from.x,y:from.y,z:from.z,scale:from.scale},at:now});
  prepareSelected(result.card.instance);
  return result.card;
 }
 function move(e){
  const p=hit(e);
  hover=p?.id||null;
  if(press){
   const distance=Math.hypot(e.clientX-press.x,e.clientY-press.y);
   if(press.kind==='character'&&distance>dragThreshold){
    if(!heroDrag)heroDrag={id:press.id.slice(10),
     profession:press.item.profession,portrait:press.item.portrait,
     x:e.clientX,y:e.clientY,vx:0};
    heroDrag.vx=e.clientX-heroDrag.x;
    heroDrag.x=e.clientX;heroDrag.y=e.clientY;
    o.previewCharacter?.(heroDrag.id,e.clientX,e.clientY);
    return true;
   }
   if(!drag&&distance>dragThreshold&&
      (press.kind==='deck'||press.kind==='hand')){
    let card=null;
    if(press.kind==='deck')card=takeFromPile(press.item);
    else{
     card=o.snapshot().hand.find(c=>c.instance===press.item.instance);
     if(card)prepareSelected(card.instance);
    }
    if(card)drag={instance:card.instance,card,x:e.clientX,y:e.clientY,
      source:press.kind,ownerId:card.ownerId};
   }
   if(drag){
    drag.vx=(drag.vx||0)*.35+(e.clientX-drag.x)*.65;
    drag.x=e.clientX;drag.y=e.clientY;
    o.dragMove?.(drag.instance,e.clientX,e.clientY);
    return true;
   }
   if(press.kind==='character')
    o.previewCharacter?.(press.id.slice(10),e.clientX,e.clientY);
   return true;
  }
  return !!p;
 }
 function down(e){
  const p=hit(e);if(!p)return false;
  e.preventDefault();
  press={id:p.id,kind:p.kind,item:p,x:e.clientX,y:e.clientY};
  hover=p.id;return true;
 }
 function up(e){
  if(!press)return false;
  const old=press;press=null;
  const p=hit(e),moved=Math.hypot(e.clientX-old.x,e.clientY-old.y)>dragThreshold;
  if(drag){
   const held=drag;drag=null;
   const played=o.dropCard?.(held.instance,e.clientX,e.clientY)===true;
   if(!played){
    const pos=worldPoint(e);
    if(pos)motion.returnCard(held.instance,
     {x:pos.x,y:pos.y+.16,scale:dims().mobile?.90:1.19},now);
   }
   return true;
  }
  if(old.kind==='character'){
   const id=old.id.slice(10),held=heroDrag;heroDrag=null;
   o.previewCharacter?.(null);
   if(moved){
    const ok=o.placeCharacter?.(id,e.clientX,e.clientY)===true;
    if(!ok){
     const pos=worldPoint(e);
     if(pos)motion.returnCard('hero:'+id,
      {x:pos.x,y:pos.y+.12,scale:dims().mobile?.84:1.18},now);
    }
   }else if(p?.id===old.id){
    o.selectCharacter?.(id);
    motion.selectCard('hero:'+id,now);
   }
   return true;
  }
  if(!moved&&p?.id===old.id){
   if(p.kind==='deck')takeFromPile(p);
   if(p.kind==='hand')prepareSelected(p.instance);
  }
  return true;
 }
 function pointFor(id){
  const p=scene.find(x=>x.id===id);if(!p)return null;
  const drawer=caseMotion.transform(now,dims().h);
  if(p.kind!=='hand'&&(!drawer.interactive||collapsed))return null;
  const r=canvas.getBoundingClientRect(),y=p.y+(p.kind==='hand'?0:drawer.y);
  return {x:r.left+(.5+p.x/spanW)*r.width,
   y:r.top+(.5-y/spanH)*r.height};
 }
 function setCollapsed(next){
  collapsed=!!next;caseMotion.setOpen(!collapsed,now);
  cancelPress();deckLift.clear();
  // Closing is a real, interruptible slide. The old scene geometry stays
  // alive until it has physically passed below the screen boundary.
  hot=hot.filter(p=>p.kind==='hand');
  return collapsed;
 }
 function animateScene(mode,at){sceneMotion={mode,start:at};}
 function resetAnimations(){
  scene=[];lastDeal=null;lastFrame=0;deckLift.clear();motion.reset();
  caseMotion.reset(!collapsed);cancelPress();
  sceneMotion={mode:'steady',start:0};
 }
 return Object.freeze({
  render:draw,hit,move,down,up,cancelPress,pointFor,animateScene,resetAnimations,setCollapsed,
  get collapsed(){return collapsed;},
  get dragging(){return !!drag||!!heroDrag;},
  get drawer(){return caseMotion.transform(now,dims().h);},
  get drawn(){return drawCalls;},
  get snapshot(){
   const g=dims(),count=o.snapshot();
   const horizontalClearance=(g.innerW-g.cardW)/2;
   const verticalClearance=(g.innerH-g.cardH)/2;
   return {geometry:'seven-bay-walnut-felt-case',roundedCase:true,beveledRim:true,
    walnutShell:true,forestFelt:true,brassInlay:true,engravedRoleTabs:0,
    printedDeckFaces:(count.roster||[]).length,
    faceUpDecks:true,handPersistsWhenCollapsed:true,
    handCardScale:g.mobile?.78:1.06,
    motionLayers:['top-recoil','top-peel','flight-arc','paper-edge-trail',
     'rotation','elastic-settle','neighbour-reflow','selection-punch','return'],
    topCards:collapsed?[]:(count.roster||[]).map(owner=>{
     const pile=o.remainingCards?.(owner.id)||[],card=pile[pile.length-1];
     return {ownerId:owner.id,id:card?.id||null,name:card?.name||null,
      faceUp:!!card};
    }),
    cardMotion:motion.stats(now),
    fittedCardStacks:true,cardStackTiltRadians:-.105,
    visible:scene.map(p=>({id:p.id,kind:p.kind,x:p.x,y:p.y})),
    visibleDeckPiles:scene.filter(p=>p.kind==='deck'&&p.deckCount>0).length,
    emptySlots:7-(count.roster?.length||0),
    ownedCharacters:(count.roster||[]).map(c=>({id:c.id,profession:c.profession,slot:c.slot})),
    stagedCharacterCards:scene.filter(p=>p.kind==='character').length,
    collapsed,canExpand:true,
    drawer:caseMotion.transform(now,g.h),caseSlideAxis:'screen-vertical',
    characterRestingOnOwnerPile:true,
    renderSpace:'screen-fixed-post-world',receivesWorldClouds:false,
    receivesWorldShadows:true,sceneLighting:true,
    hoverTopCard:!!hover&&(['deck','character'].includes(scene.find(p=>p.id===hover)?.kind)),
    liftedDecks:[...deckLift].filter(([id,lift])=>lift>.02).map(([id,lift])=>({id,lift})),
    interaction:heroDrag?{mode:'drag-hero',id:heroDrag.id,
     x:heroDrag.x,y:heroDrag.y}:
     drag?{mode:'drag',instance:drag.instance,source:drag.source,
     x:drag.x,y:drag.y}:press?{mode:'press',kind:press.kind,id:press.id}:null,
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
root.PaperchalkSceneCardHUD=Object.freeze({version:'13.0.0-physical-hero-drag',create});
})(window);
