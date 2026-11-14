/* Seven tangible 3D profession boxes + near-camera fanned physical hand.
 * Visual grammar studies Inscryption's spatial card handling, NOT its textures/art.
 * All cards reuse the SAME WebGL drawCard mesh/edge/front material as battlefield cards.
 * Physics/interaction is 3D; no flat CSS panels, no full-screen opaque UI slab.
 */
(function(root){
'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function create(o){
 const {canvas,gl,drawCard,renderGeom,box,cardW,cardH,T,S,RX,RY,RZ,mul,
  perspective,getVP,uniformVP,makeTexture}=o;
 const colorMap={engineer:'#778b6f',guardian:'#687e79',warrior:'#9c8059',
  ranger:'#819262',skirmisher:'#837991',medic:'#8b9b83',summoner:'#9b8062'};
 const backMap={engineer:'#51624f',guardian:'#536664',warrior:'#61533d',
  ranger:'#57674a',skirmisher:'#5c5264',medic:'#596e58',summoner:'#66543f'};
 const textMap={engineer:'⚙',guardian:'盾',warrior:'斧',ranger:'弓',
  skirmisher:'影',medic:'药',summoner:'兽'};
 const cache=new Map(),labelCache=new Map(),portraitCache=new Map(),entered=new Map();
 const coveredEdgeBatchCache=new Map();let edgeBatchesDrawn=0;
 const animated=new Set(),exitGhosts=new Map();
 const viewFov=39*Math.PI/180,cameraZ=14.5;
 let spanW=18,spanH=10,width=1920,height=1080,frame=0;
 let scene=[],clickable=[],hoverId=null,press=null,selectedDrag=null,cardDrawCalls=0,boxDrawCalls=0;
 let lastPointer=null;
 const neutral=[.42,.33,.25,1],trim=[.64,.53,.36,1],pulp=[.74,.70,.56,1];
 function setupSize(w,h){
  width=Math.max(1,w);height=Math.max(1,h);
  spanH=2*cameraZ*Math.tan(viewFov/2);spanW=spanH*width/height;
 }
 function makeTextTexture({title='',profession='warrior',family='common',back=false}){
  const k=profession+'|'+title+'|'+family+'|'+back;
  if(cache.has(k))return cache.get(k);
  const c=document.createElement('canvas');c.width=512;c.height=768;
  const cx=c.getContext('2d');
  const tint=back?(backMap[profession]||'#586a57'):'#f4f0e3';
  cx.fillStyle=tint;cx.fillRect(0,0,c.width,c.height);
  for(let y=0;y<768;y+=10){
   cx.fillStyle=back?'#ffffff08':'#9b887012';cx.fillRect(0,y,512,2);
  }
  cx.lineWidth=10;cx.strokeStyle=back?'#d2c39a':'#a49a7f';cx.strokeRect(25,25,462,718);
  cx.lineWidth=3;cx.strokeStyle=back?'#9ba78d':'#c1b79c';cx.strokeRect(46,46,420,676);
  cx.textAlign='center';
  if(back){
   cx.font='bold 103px serif';cx.fillStyle='#f0e8cc';cx.fillText(textMap[profession]||'✦',256,405);
   cx.font='bold 43px serif';cx.fillText(String(title).slice(0,14),256,522);
   cx.beginPath();cx.ellipse(256,355,156,180,0,0,TAU);cx.strokeStyle='#c5c9a6';cx.lineWidth=5;cx.stroke();
  }else{
   cx.fillStyle=colorMap[profession]||'#586e50';cx.fillRect(47,47,418,83);
   const titleMap=root.PaperchalkProfessionDecks?.CLASSES?.find(c=>c.id===profession)?.name||'行动牌';
   cx.font='bold 37px serif';cx.fillStyle='#fffaf0';cx.fillText(titleMap,256,102);
   cx.fillStyle='#615f4e';cx.font='bold 98px serif';cx.fillText(textMap[profession]||'✦',256,360);
   cx.beginPath();cx.moveTo(110,422);cx.lineTo(402,422);cx.lineWidth=3;cx.strokeStyle='#b7ab91';cx.stroke();
   cx.fillStyle='#353b2c';cx.font='bold 46px serif';cx.fillText(String(title).slice(0,12),256,514);
   cx.fillStyle='#857a65';cx.font='28px serif';cx.fillText(family==='faction'?'组织专属':'职业通用',256,621);
  }
  const tex=makeTexture(c);cache.set(k,tex);return tex;
 }
 function portrait(url,profession){
  if(!url)return makeTextTexture({title:'人物卡',profession,family:'faction'});
  if(portraitCache.has(url))return portraitCache.get(url)||
   makeTextTexture({title:'人物卡',profession,family:'faction'});
  portraitCache.set(url,null);
  const img=new Image();img.onload=()=>portraitCache.set(url,makeTexture(img));
  img.onerror=()=>portraitCache.set(url,null);img.src=url;
  return makeTextTexture({title:'人物卡',profession,family:'faction'});
 }
 function layout(state,staged){
  const mobile=canvas.getBoundingClientRect().width<720;
  const slots=[];
  const all=root.PaperchalkProfessionDecks.CLASSES;
  // Seven EQUAL physical piles along the lower edge, no trays and no UI slabs.
  // The narrower view actually adjusts the world-space pitch instead of
  // shrinking a desktop row and clipping the outermost piles.
  const fullWidth=spanW*(mobile?.96:.934);
  const pitch=fullWidth/7;
  const pileScale=Math.min(mobile?.39:1.09,(pitch/cardW)*.78);
  const bottomOffset=mobile?.42:.68;
  const deckY=-spanH*.5+bottomOffset;
  for(let i=0;i<7;i++){
   const cls=all[i];
   const c=state.classes.find(item=>item.id===cls.id);
   slots.push({
    kind:'deck',id:'deck:'+cls.id,profession:cls.id,c,
    x:(i-3)*pitch,y:deckY,z:0,scale:pileScale,angle:0
   });
  }
  const hand=state.hand;
  const visibleWidth=mobile?spanW*.78:Math.min(10.4,spanW*.72);
  const step=mobile?.46:1.12;
  const spread=Math.min((hand.length-1)*step,visibleWidth);
  const handScale=mobile?.56:.89;
  const handY=mobile?-2.13:-1.57;
  hand.forEach((card,i)=>{
   const axis=hand.length===1?0:(i/(hand.length-1))*2-1;
   slots.push({
    kind:'hand',id:'hand:'+card.instance,instance:card.instance,c:card,
    x:axis*spread*.5,y:handY+(1-axis*axis)*.17,z:1.14+(1-axis*axis)*.08,
    scale:handScale,angle:-axis*.14,tilt:-.12+Math.abs(axis)*.05
   });
  });
  // The staged hero is physically ON TOP of the warrior pile, never on the
  // battlefield until the player drags or taps the ally deployment cell.
  for(const u of staged){
   const origin=slots.find(p=>p.kind==='deck'&&p.profession===u.role);
   if(origin){
    const count=origin.c?.deckCount||0;
    const depth=.11+count*.041+.11;
    slots.push({
     ...origin,kind:'character',id:'character:'+u.id,
     unitId:u.id,portrait:u.portrait,
     y:origin.y+Math.sin(1.18)*depth,
     z:Math.cos(1.18)*depth+.07,
     scale:origin.scale*(mobile?1.12:1.14)
    });
   }
  }
  return slots;
 }

 function cardMatrix(p,opts={}){
  const focused=hoverId===p.id,selected=p.kind==='hand'&&o.selected?.()===p.instance;
  const charSelected=p.kind==='character'&&o.selectedCharacter?.()===p.unitId;
  const hover=focused?.58:0,raise=hover+(selected?.52:0)+(charSelected?.18:0);
  const easing=Math.sin(frame*1.5+p.x*.3)*.020;
  const scale=p.scale*(1+(focused?.15:0)+(selected?.11:0));
  const tilt=p.kind==='character'?-0.83:p.kind==='deck'?-1.18:(p.kind==='hand'?(p.tilt||-.12):-.17);
  let mat=T(opts.x??p.x,(opts.y??p.y)+raise+easing,(opts.z??p.z)+raise*.28);
  mat=mul(mat,RY(focused?-.045:0));
  mat=mul(mat,RX(tilt+(focused?.12:0)));
  mat=mul(mat,RZ(p.angle+(focused?.020:0)));
  return mul(mat,S(scale,scale,1));
 }
 function renderPhysicalCard(p,tex,extra={}){
  const motion=extra.fxId&&o.objectFX?o.objectFX.sample(extra.fxId,frame):null;
  if(motion?.scale<=.025&&motion?.phase!=='steady')return;
  let model=cardMatrix(p,extra);
  if(motion&&Math.abs(motion.scale-1)>.0001){
   model=mul(model,S(motion.scale,motion.scale,motion.scale));
  }
  drawCard({hudMatrix:model,texture:tex,side:'ally'},frame);
  cardDrawCalls++;
 }
 // An obscured card is still a separate physical 3D paper slab.
 // Only the uppermost face requires the full five-pass textured renderer;
 // covered cards need their actual 3D edge, which is all a player can see.
 function coveredEdgeMesh(count){
  if(coveredEdgeBatchCache.has(count))return coveredEdgeBatchCache.get(count);
  const verts=[],indices=[],radius=.105,steps=6;
  const corners=[[cardW/2-radius,cardH/2-radius,0],
   [-cardW/2+radius,cardH/2-radius,90],
   [-cardW/2+radius,-cardH/2+radius,180],
   [cardW/2-radius,-cardH/2+radius,270]];
  const ring=[];
  for(const [cx,cy,start] of corners)
   for(let i=0;i<=steps;i++){
    const t=(start+i*15)*Math.PI/180;
    ring.push([cx+radius*Math.cos(t),cy+radius*Math.sin(t)]);
   }
  for(let n=0;n<count;n++){
   const z=.10+n*.041;
   for(let j=0;j<ring.length;j++){
    const pt=ring[j],next=ring[(j+1)%ring.length],base=verts.length/8;
    for(const [xy,depth] of [[pt,-cardD/2],[next,-cardD/2],
      [next,cardD/2],[pt,cardD/2]]){
     const len=Math.hypot(xy[0]/cardW,xy[1]/cardH)||1;
     verts.push(xy[0],xy[1],z+depth,
      xy[0]/cardW/len,xy[1]/cardH/len,0,.5,.5);
    }
    indices.push(base,base+1,base+2,base,base+2,base+3);
   }
  }
  const mesh=o.makeGeom(verts,indices);
  coveredEdgeBatchCache.set(count,mesh);
  return mesh;
 }
 function drawCoveredBatch(pos,count){
  if(!count)return;
  const M=mul(mul(T(pos.x,pos.y,0),RX(-1.18)),S(pos.scale,pos.scale,1));
  renderGeom(coveredEdgeMesh(count),M,o.pileRim);
  cardDrawCalls+=count;edgeBatchesDrawn++;
 }
 function drawCoveredPileCard(p,fxId){
  const motion=o.objectFX?.sample(fxId,frame);
  if(motion&&motion.phase!=='steady'&&motion.scale<=.025)return;
  let model=cardMatrix(p);
  if(motion&&Math.abs(motion.scale-1)>.0001)
   model=mul(model,S(motion.scale,motion.scale,motion.scale));
  renderGeom(o.pileEdge,model,o.pileRim);
  cardDrawCalls++;
 }
 function startCardMotion(id,delay=0){
  if(animated.has(id))return;
  animated.add(id);
  o.objectFX?.enter(id,frame,{delay,duration:.46});
 }
 function boxLocal(p,local){
  let m=mul(T(p.x,p.y,p.z),RX(-1.03));
  return mul(m,local);
 }
 function labelTexture(c,remaining){
  const key=c.id+':'+remaining;
  if(labelCache.has(key))return labelCache.get(key);
  const cv=document.createElement('canvas');cv.width=512;cv.height=128;
  const ctx=cv.getContext('2d');
  const isEmpty=remaining===0;
  ctx.fillStyle=isEmpty?'#827b6a':'#e5d6b7';
  ctx.fillRect(0,0,512,128);
  ctx.strokeStyle=isEmpty?'#625e52':'#a28a65';ctx.lineWidth=7;
  ctx.strokeRect(5,5,502,118);
  ctx.fillStyle=isEmpty?'#f1ede2':'#3d4734';
  ctx.font='bold 65px serif';ctx.textAlign='left';ctx.fillText(c.name,25,87);
  ctx.font='bold 68px Georgia,serif';ctx.textAlign='right';
  ctx.fillText(String(remaining).padStart(2,'0'),490,89);
  const tex=makeTexture(cv);labelCache.set(key,tex);return tex;
 }
 function boxMaterial(kind){
  // Procedural material generated ONCE, then used as a real WebGL texture.
  // No webpage image panels, canvas overlays or flat CSS slot art.
  const key='physical-material:'+kind;
  if(cache.has(key))return cache.get(key);
  const cv=document.createElement('canvas');cv.width=256;cv.height=256;
  const ctx=cv.getContext('2d');let seed=kind==='felt'?425319:958231;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  if(kind==='wood'){
   const grad=ctx.createLinearGradient(0,0,256,256);
   grad.addColorStop(0,'#876644');grad.addColorStop(.35,'#6c4c30');
   grad.addColorStop(.7,'#755537');grad.addColorStop(1,'#533922');
   ctx.fillStyle=grad;ctx.fillRect(0,0,256,256);
   for(let i=0;i<280;i++){
    const x=random()*256,y=random()*256;
    const length=15+random()*125;
    ctx.beginPath();ctx.moveTo(x,y);
    ctx.bezierCurveTo(x+length*.25,y+(random()-.5)*6,
     x+length*.75,y+(random()-.5)*5,x+length,y+(random()-.5)*5);
    ctx.strokeStyle=random()<.57?'rgba(31,18,10,.12)':'rgba(251,218,166,.07)';
    ctx.lineWidth=.35+random()*1.20;ctx.stroke();
   }
   for(let n=0;n<30;n++){
    const y=random()*256;ctx.fillStyle='rgba(35,26,18,.035)';
    ctx.fillRect(0,y,256,.3+random()*.7);
   }
  }else{
   ctx.fillStyle='#294537';ctx.fillRect(0,0,256,256);
   for(let y=0;y<256;y+=4)for(let x=0;x<256;x+=4){
    const v=random();
    ctx.fillStyle=v<.50?'rgba(4,20,12,.13)':'rgba(174,193,155,.075)';
    ctx.fillRect(x+(v-.5),y+(v-.5),2.5,2.5);
   }
  }
  const tex=makeTexture(cv);cache.set(key,tex);return tex;
 }
 function drawPileShadow(deck){
  // Seven small grounding contact shadows, NOT seven wooden boxes/slots.
  const mat=mul(T(deck.x,deck.y,-.18),RX(-1.18));
  const w=cardW*deck.scale*1.12,h=cardH*deck.scale*1.06;
  renderGeom(box,mul(mat,S(w,h,.026)),[.16,.21,.16,1]);
 }

 function draw(now,w,h){
  frame=now;setupSize(w,h);
  const state=o.snapshot(),staged=o.staged?.()||[];
  const positions=layout(state,staged);
  // An action card leaving the hand does not disappear in a single frame:
  // keep a separate mesh until the shared shrink-out animation completes.
  const nextHand=new Set(positions.filter(p=>p.kind==='hand').map(p=>p.id));
  for(const old of scene){
   if(old.kind!=='hand'||nextHand.has(old.id)||exitGhosts.has(old.id))continue;
   const fxId='hud-hand:'+old.instance;
   o.objectFX?.exit(fxId,frame,{duration:.30});
   exitGhosts.set(old.id,{...old,fxId});
  }
  scene=positions;
  clickable=positions.map(p=>({...p,width:cardW*p.scale,height:cardH*p.scale}));
  const alive=new Set(positions.map(p=>p.id));
  for(const id of entered.keys())if(!alive.has(id))entered.delete(id);
  for(const p of positions)if(p.kind==='hand'&&!entered.has(p.id))entered.set(p.id,frame);
  cardDrawCalls=0;boxDrawCalls=0;
  const wasVP=getVP();
  gl.viewport(0,0,width,height);gl.clear(gl.DEPTH_BUFFER_BIT);
  uniformVP(mul(perspective(viewFov,width/height,.1,80),T(0,0,-cameraZ)));
  // Physical cards themselves are the piles. No static black/opaque slabs
  // underneath: they would remain visible when the entire scene shrinks out.
  const activeCardIds=new Set();
  edgeBatchesDrawn=0;
  for(const pos of positions.filter(p=>p.kind==='deck')){
   const actions=o.remainingCards?.(pos.profession)||[];
   // The invisible covered surfaces need only their distinct paper edges.
   // When idle, bake those edges into ONE shared mesh per physical stack.
   // During animation each card still scales independently.
   const covered=actions.slice(0,-1);
   const canBatch=covered.every(card=>{
    const id='hud-pile:'+card.instance;
    activeCardIds.add(id);startCardMotion(id,Math.min(.19,covered.indexOf(card)*.017));
    return o.objectFX?.sample(id,frame).phase==='steady';
   });
   if(canBatch&&covered.length&&o.makeGeom)drawCoveredBatch(pos,covered.length);
   else covered.forEach((card,n)=>{
    const fxId='hud-pile:'+card.instance;
    activeCardIds.add(fxId);
    startCardMotion(fxId,Math.min(.19,n*.017));
    const planeDepth=.10+n*.041;
    drawCoveredPileCard({...pos,
     x:pos.x+(n%3-1)*.0013,
     y:pos.y+Math.sin(1.18)*planeDepth,
     z:Math.cos(1.18)*planeDepth,
     angle:(n%3-1)*.0014},fxId);
   });
   if(actions.length){
    const n=actions.length-1,card=actions[n],fxId='hud-pile:'+card.instance;
    activeCardIds.add(fxId);startCardMotion(fxId,Math.min(.19,n*.017));
    const planeDepth=.10+n*.041;
    const tex=makeTextTexture({title:card.name,profession:'warrior',
     family:card.family,back:false});
    renderPhysicalCard({...pos,
      x:pos.x+(n%3-1)*.0013,
      y:pos.y+Math.sin(1.18)*planeDepth,
      z:Math.cos(1.18)*planeDepth,
      angle:(n%3-1)*.0014
    },tex,{fxId});
   }
  }
  for(const pos of positions.filter(p=>p.kind==='character')){
   const deck=positions.find(q=>q.kind==='deck'&&q.profession===pos.profession);
   const fxId='hud-character:'+pos.unitId;
   activeCardIds.add(fxId);
   startCardMotion(fxId,.20);
   renderPhysicalCard(pos,portrait(pos.portrait,pos.profession),{fxId});
  }
  for(const pos of positions.filter(p=>p.kind==='hand')){
   const tex=makeTextTexture({title:pos.c.name,profession:pos.c.profession,
    family:pos.c.family});
   const fxId='hud-hand:'+pos.instance;
   activeCardIds.add(fxId);
   startCardMotion(fxId,0);
   const start=entered.get(pos.id)??frame,age=clamp((frame-start)/.55,0,1);
   if(age<1){
    const deck=positions.find(q=>q.kind==='deck'&&q.profession===pos.c.profession);
    if(deck){
     // Lift FIRST along the pile's face normal; only then travel to the hand.
     // Maintain a clear depth corridor above the other 3D cards throughout.
     const lift=clamp(age/.28),travel=clamp((age-.20)/.70);
     const eased=travel*travel*(3-2*travel);
     const sourceY=deck.y+.60,sourceZ=.68;
     const flyY=sourceY+(pos.y-sourceY)*eased+
      Math.sin(Math.PI*travel)*.42;
     const flyZ=sourceZ+(pos.z-sourceZ)*eased+
      Math.sin(Math.PI*travel)*.77;
     const flying={...pos,x:deck.x+(pos.x-deck.x)*eased,
      y:flyY+(1-lift)*(-.13),z:flyZ};
     renderPhysicalCard(flying,tex,{fxId});
    }else renderPhysicalCard(pos,tex,{fxId});
   }else renderPhysicalCard(pos,tex,{fxId});
  }
  // Consumed/discarded action cards shrink away independently of deck meshes.
  for(const [id,ghost] of exitGhosts){
   if(o.objectFX?.finished(ghost.fxId,frame)){
    exitGhosts.delete(id);
    o.objectFX.clear(ghost.fxId);
    continue;
   }
   const tex=makeTextTexture({title:ghost.c.name,profession:ghost.c.profession,
    family:ghost.c.family});
   renderPhysicalCard(ghost,tex,{fxId:ghost.fxId});
  }
  for(const id of animated){
   if(activeCardIds.has(id)||[...exitGhosts.values()].some(g=>g.fxId===id))continue;
   animated.delete(id);o.objectFX?.clear(id);
  }
  gl.viewport(0,0,width,height);
  uniformVP(wasVP);
 }
 function worldPoint(e){
  const rect=canvas.getBoundingClientRect();
  if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)return null;
  return {x:((e.clientX-rect.left)/rect.width-.5)*spanW,
   y:(.5-(e.clientY-rect.top)/rect.height)*spanH};
 }
 function pick(e){
  const p=worldPoint(e);if(!p)return null;
  const ranked=[...clickable].sort((a,b)=>{
   const priority=x=>x.kind==='character'?4:x.kind==='hand'?3:1;
   return priority(b)-priority(a)||b.z-a.z;
  });
  const matches=ranked.filter(c=>{
   const shrunk=c.kind==='deck'?.67:c.kind==='character'?.84:c.kind==='hand'?.84:.9;
   const maxX=c.width*.5*shrunk+.09;
   const maxY=c.height*.5*(c.kind==='deck'||c.kind==='character'?.59:1)*shrunk+.085;
   const boost=hoverId===c.id?.34:0;
   return Math.abs(p.x-c.x)<=maxX+boost&&Math.abs(p.y-c.y)<=maxY+boost;
  });
  // A staged hero is the TOP tangible object in a profession compartment.
  const character=matches.find(c=>c.kind==='character');
  if(character)return character;
  // The middle strip of each open tray slot is a reliable physical draw target.
  // A fanned card can overlap the rim visually but must never make the deck
  // underneath impossible to click when its compartment centre is exposed.
  const centralDeck=matches.find(c=>c.kind==='deck'&&Math.abs(p.y-c.y)<.29);
  if(centralDeck)return centralDeck;
  return matches[0]||null;
 }
 function move(e){
  lastPointer=e;
  if(press?.id.startsWith('character:')){
   selectedDrag=press.id.slice('character:'.length);
   o.previewCharacter?.(selectedDrag,e.clientX,e.clientY);
   return true;
  }
  const p=pick(e);
  hoverId=p?.id||null;
  return !!p;
 }
 function down(e){
  const p=pick(e);if(!p)return false;
  e.preventDefault();
  press={id:p.id,startX:e.clientX,startY:e.clientY};
  hoverId=p.id;return true;
 }
 function up(e){
  if(!press)return false;
  const prev=press;press=null;
  const moved=Math.hypot(e.clientX-prev.startX,e.clientY-prev.startY)>24;
  if(prev.id.startsWith('character:')){
   const id=prev.id.slice('character:'.length);
   selectedDrag=null;o.previewCharacter?.(null);
   if(moved)o.placeCharacter?.(id,e.clientX,e.clientY);
   else if(pick(e)?.id===prev.id)o.selectCharacter?.(id);
   return true;
  }
  if(moved)return true;
  const picked=pick(e);
  if(picked?.id!==prev.id)return true;
  if(picked.kind==='deck')o.draw(picked.profession);
  else if(picked.kind==='hand')o.select(picked.instance);
  return true;
 }
 function pointFor(id){
  const p=scene.find(x=>x.id===id);if(!p)return null;
  const rect=canvas.getBoundingClientRect();
  return {x:rect.left+(.5+p.x/spanW)*rect.width,
   y:rect.top+(.5-p.y/spanH)*rect.height};
 }
 return Object.freeze({
  render:draw,hit:pick,move,down,up,pointFor,
  // Every visible 3D deck slab/hand card follows the SAME scene transition.
  // Their gameplay deck counts and selected card IDs remain untouched.
  animateScene(phase,at){
   if(phase!=='exit'&&phase!=='enter')return;
   let i=0;
   for(const id of animated){
    if(phase==='exit')o.objectFX?.exit(id,at+(i%9)*.015,{duration:.46});
    else o.objectFX?.enter(id,at+(i%11)*.015,{duration:.62});
    i++;
   }
  },
  resetAnimations(){
   animated.clear();exitGhosts.clear();entered.clear();scene=[];
  },
  get drawn(){return cardDrawCalls;},
  get snapshot(){
   const state=o.snapshot();
   return {
    visible:scene.map(p=>({kind:p.kind,id:p.id,x:p.x,y:p.y})),
    count:state.count,
    physicalBoxes:0,visibleDeckPiles:scene.filter(p=>p.kind==='deck').length,
    deckArrangement:'seven-identical-bottom-row',
    deckTiltRadians:-1.18,standaloneTurnCard:false,
    sameFacePrototype:true,screenEdgeAnchored:true,faceUpDeck:true,
    physicalDeckCards:state.classes.reduce((n,c)=>n+c.deckCount,0),
    stagedCharacterCards:scene.filter(p=>p.kind==='character').length,
    renderedCardMeshes:cardDrawCalls,
    viewportPx:height,hasDomCards:false,
    geometry:'shared-battlefield-card-mesh',
    perspective:true,
    handLayout:'near-camera-fan',
    backgroundPanel:false,
    animatedCardMeshes:animated.size,
    sharedSceneTransitions:true,
    coveredCardEdgeLOD:true,
    edgeBatchesDrawn,
    vanishingCards:exitGhosts.size
   };
  }
 });
}
root.PaperchalkSceneCardHUD=Object.freeze({version:'4.5.0-seven-piles',create});
})(window);
