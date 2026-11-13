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
  // Forest tutorial: exactly ONE available profession pile. No seven vacant
  // trays, empty boxes, shared housing, or half-screen inventory furniture.
  const active=state.classes.filter(c=>c.unlocked&&c.deckCount>=0);
  const deckY=-spanH*.5+(mobile?1.03:1.22);
  const deckScale=mobile?.75:1.02;
  for(const c of active){
   slots.push({kind:'deck',id:'deck:'+c.id,profession:c.id,c,
    x:0,y:deckY,z:0,scale:deckScale,angle:0});
  }
  const hand=state.hand;
  const visibleWidth=mobile?spanW*.76:Math.min(10.6,spanW*.72);
  const step=mobile?.46:1.12;
  const spread=Math.min((hand.length-1)*step,visibleWidth);
  const handScale=mobile?.56:.89;
  const handY=mobile?-2.13:-1.57;
  hand.forEach((card,i)=>{
   const axis=hand.length===1?0:(i/(hand.length-1))*2-1;
   slots.push({kind:'hand',id:'hand:'+card.instance,instance:card.instance,c:card,
    x:axis*spread*.5,y:handY+(1-axis*axis)*.17,z:1.14+(1-axis*axis)*.08,
    scale:handScale,angle:-axis*.14,tilt:-.12+Math.abs(axis)*.05});
  });
  for(const u of staged){
   const origin=slots.find(p=>p.kind==='deck'&&p.profession===u.role);
   if(origin)slots.push({...origin,kind:'character',id:'character:'+u.id,
    unitId:u.id,portrait:u.portrait,
    // Character sits ABOVE the full face-up physical action-card stack.
    y:origin.y+Math.sin(1.03)*(.11+origin.c.deckCount*.044+.16),
    z:Math.cos(1.03)*(.11+origin.c.deckCount*.044+.16),
    scale:deckScale*1.12});
  }
  // A tiny physical end-turn card is a control, NOT another card pile.
  slots.push({kind:'turn',id:'turn:end',x:Math.min(spanW*.5-.42,mobile?1.8:3.1),
   y:deckY+.10,z:.55,scale:mobile?.22:.27,angle:.08});
  return slots;
 }

 function cardMatrix(p,opts={}){
  const focused=hoverId===p.id,selected=p.kind==='hand'&&o.selected?.()===p.instance;
  const charSelected=p.kind==='character'&&o.selectedCharacter?.()===p.unitId;
  const hover=focused?.58:0,raise=hover+(selected?.52:0)+(charSelected?.18:0);
  const easing=Math.sin(frame*1.5+p.x*.3)*.020;
  const scale=p.scale*(1+(focused?.15:0)+(selected?.11:0));
  const tilt=p.kind==='character'?-0.87:p.kind==='deck'?-1.03:(p.kind==='hand'?(p.tilt||-.12):-.17);
  let mat=T(opts.x??p.x,(opts.y??p.y)+raise+easing,(opts.z??p.z)+raise*.28);
  mat=mul(mat,RY(focused?-.045:0));
  mat=mul(mat,RX(tilt+(focused?.12:0)));
  mat=mul(mat,RZ(p.angle+(focused?.020:0)));
  return mul(mat,S(scale,scale,1));
 }
 function renderPhysicalCard(p,tex,extra={}){
  drawCard({hudMatrix:cardMatrix(p,extra),texture:tex,side:'ally'},frame);
  cardDrawCalls++;
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
 function drawSinglePileBase(deck){
  if(!deck)return;
  // Low physical paper-rest and tiny slip-proof rim only. The card faces and
  // independently rendered paper edges remain completely visible.
  const scale=deck.scale;
  const w=cardW*scale*1.13,h=cardH*scale*1.12;
  const basis=mul(T(deck.x,deck.y,0),RX(-1.03));
  const piece=(x,y,z,sx,sy,sz)=>mul(basis,mul(T(x,y,z),S(sx,sy,sz)));
  const wood=boxMaterial('wood'),felt=boxMaterial('felt');
  renderGeom(box,piece(0,0,-.15,w,h,.15),[.94,.92,.89,1],wood);
  renderGeom(box,piece(0,0,-.061,w-.12,h-.12,.013),[1,1,1,1],felt);
  renderGeom(box,piece(0,-h*.5+.019,-.026,w,.040,.04),[.94,.92,.89,1],wood);
  boxDrawCalls=1;
 }

 function draw(now,w,h){
  frame=now;setupSize(w,h);
  const state=o.snapshot(),staged=o.staged?.()||[];
  const positions=layout(state,staged);scene=positions;
  clickable=positions.map(p=>({...p,width:cardW*p.scale,height:cardH*p.scale}));
  const alive=new Set(positions.map(p=>p.id));
  for(const id of entered.keys())if(!alive.has(id))entered.delete(id);
  for(const p of positions)if(p.kind==='hand'&&!entered.has(p.id))entered.set(p.id,frame);
  cardDrawCalls=0;boxDrawCalls=0;
  const wasVP=getVP();
  gl.viewport(0,0,width,height);gl.clear(gl.DEPTH_BUFFER_BIT);
  uniformVP(mul(perspective(viewFov,width/height,.1,80),T(0,0,-cameraZ)));
  drawSinglePileBase(positions.find(p=>p.kind==='deck'));
  const remaining=o.remainingCards?.('warrior')||[];
  for(const pos of positions.filter(p=>p.kind==='deck')){
   const actions=pos.profession==='warrior'?remaining:(o.remainingCards?.(pos.profession)||[]);
   actions.forEach((card,n)=>{
    // Cards are individually drawn face-UP and ordered exactly as the
    // underlying gameplay deck: the rightmost array element is its top card.
    const layer={...pos,id:pos.id,
      x:pos.x+(n%3-1)*.0016,
      y:pos.y+Math.sin(1.03)*(.11+n*.044),
      z:Math.cos(1.03)*(.11+n*.044),
      angle:(n%3-1)*.0018};
    const tex=makeTextTexture({title:card.name,profession:card.profession,
      family:card.family,back:false});
    renderPhysicalCard(layer,tex);
   });
  }
  for(const pos of positions.filter(p=>p.kind==='character')){
   const deck=positions.find(q=>q.kind==='deck'&&q.profession===pos.profession);
   renderPhysicalCard(pos,
     portrait(pos.portrait,pos.profession));
  }
  for(const pos of positions.filter(p=>p.kind==='hand')){
   const tex=makeTextTexture({title:pos.c.name,profession:pos.c.profession,
    family:pos.c.family});
   const start=entered.get(pos.id)||frame,age=clamp((frame-start)/.35,0,1);
   if(age<1){
    const deck=positions.find(q=>q.kind==='deck'&&q.profession===pos.c.profession);
    if(deck){
     const u=Math.pow(1-age,3);
     renderPhysicalCard({...pos,
      x:pos.x+(deck.x-pos.x)*u,
      y:pos.y+(deck.y-pos.y)*u+Math.sin(age*Math.PI)*.50,
      z:pos.z+u*.1},tex);
    }else renderPhysicalCard(pos,tex);
   }else renderPhysicalCard(pos,tex);
  }
  const end=positions.find(p=>p.kind==='turn');
  renderPhysicalCard(end,makeTextTexture({title:'结束',profession:'guardian'}));
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
   const priority=x=>x.kind==='character'?4:x.kind==='hand'?3:x.kind==='turn'?2:1;
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
  else if(picked.kind==='turn')o.nextTurn();
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
  get drawn(){return cardDrawCalls;},
  get snapshot(){
   const state=o.snapshot();
   return {
    visible:scene.map(p=>({kind:p.kind,id:p.id,x:p.x,y:p.y})),
    count:state.count,
    physicalBoxes:boxDrawCalls,visibleDeckPiles:scene.filter(p=>p.kind==='deck').length,
    frontOpening:'open-face',screenEdgeAnchored:true,faceUpDeck:true,
    physicalDeckCards:state.classes.reduce((n,c)=>n+c.deckCount,0),
    stagedCharacterCards:scene.filter(p=>p.kind==='character').length,
    renderedCardMeshes:cardDrawCalls,
    viewportPx:height,hasDomCards:false,
    geometry:'shared-battlefield-card-mesh',
    perspective:true,
    handLayout:'near-camera-fan',
    backgroundPanel:false
   };
  }
 });
}
root.PaperchalkSceneCardHUD=Object.freeze({version:'3.1.0-single-pile',create});
})(window);
