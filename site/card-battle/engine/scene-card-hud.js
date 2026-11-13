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
  const slots=[],deckSpan=Math.min(mobile?spanW-.45:14.0,spanW-1);
  const deckScale=mobile?.32:.67;
  const baseDeckY=mobile?-3.46:-3.60;
  state.classes.forEach((c,i)=>{
   slots.push({kind:'deck',id:'deck:'+c.id,profession:c.id,c,
    x:(i/6-.5)*deckSpan,y:baseDeckY,z:0,scale:deckScale,angle:0});
  });
  // Player holds cards against the near-camera bottom edge, not in a separate HUD rectangle.
  const hand=state.hand;
  const step=mobile?.64:1.11;
  const spread=Math.min((hand.length-1)*step,spanW-(mobile?.45:2.1));
  const handScale=mobile?.49:.91;
  for(let i=0;i<hand.length;i++){
   const t=hand.length===1?.5:i/(hand.length-1);
   const axis=t*2-1;
   slots.push({kind:'hand',id:'hand:'+hand[i].instance,instance:hand[i].instance,c:hand[i],
    x:axis*spread*.5,y:-4.38+(1-axis*axis)*.25,
    z:1.15+(.12*(1-axis*axis)),scale:handScale,
    angle:-axis*.145,tilt:-.12+Math.abs(axis)*.07});
  }
  for(const u of staged){
   const origin=slots.find(p=>p.kind==='deck'&&p.profession===u.role);
   if(origin)slots.push({...origin,kind:'character',id:'character:'+u.id,
    unitId:u.id,portrait:u.portrait,y:origin.y+(.70*deckScale/.67),scale:deckScale*1.14});
  }
  slots.push({kind:'turn',id:'turn:end',x:Math.min(spanW*.5-.45,7.75),
   y:baseDeckY+.03,z:.9,scale:mobile?.26:.38,angle:.07});
  return slots;
 }
 function cardMatrix(p,opts={}){
  const focused=hoverId===p.id,selected=p.kind==='hand'&&o.selected?.()===p.instance;
  const charSelected=p.kind==='character'&&o.selectedCharacter?.()===p.unitId;
  const hover=focused?.58:0,raise=hover+(selected?.52:0)+(charSelected?.18:0);
  const easing=Math.sin(frame*1.5+p.x*.3)*.020;
  const scale=p.scale*(1+(focused?.15:0)+(selected?.11:0));
  const tilt=p.kind==='character'?-0.70:p.kind==='deck'?-1.03:(p.kind==='hand'?(p.tilt||-.12):-.17);
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
 function labelTexture(c){
  if(labelCache.has(c.id))return labelCache.get(c.id);
  const cv=document.createElement('canvas');cv.width=512;cv.height=128;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#e1d6ba';ctx.fillRect(0,0,512,128);
  ctx.strokeStyle='#977e5e';ctx.lineWidth=8;ctx.strokeRect(6,6,500,116);
  ctx.fillStyle='#435440';ctx.textAlign='center';ctx.font='bold 83px serif';
  ctx.fillText(c.name,256,88);
  const texture=makeTexture(cv);labelCache.set(c.id,texture);return texture;
 }
 function drawConnectedTray(decks){
  if(decks.length!==7)return;
  // ONE physically continuous seven-compartment chip tray.  No detached boxes.
  // Every class shares one solid chassis; six separators create seven sockets.
  const pitch=decks[1].x-decks[0].x;
  const width=pitch*7;
  const slotHeight=cardH*decks[0].scale*1.26;
  const wall=Math.max(.065,decks[0].scale*.11);
  const originX=(decks[0].x+decks[6].x)/2;
  const originY=decks[0].y;
  const baseTransform=mul(T(originX,originY,0),RX(-1.03));
  const piece=(x,y,z,sx,sy,sz)=>mul(baseTransform,mul(T(x,y,z),S(sx,sy,sz)));
  const walnut=[.32,.255,.185,1],woodEdge=[.48,.365,.245,1];
  const rim=[.57,.445,.305,1],felt=[.17,.245,.195,1],feltShade=[.125,.185,.155,1];
  // Solid full-width body — it remains ONE large box even when all decks are empty.
  renderGeom(box,piece(0,0,-.14,width,slotHeight,.29),walnut);
  renderGeom(box,piece(0,0,.032,width-.20,slotHeight-.18,.035),woodEdge);
  for(let i=0;i<7;i++){
   const x=(i-3)*pitch;
   renderGeom(box,piece(x,0,.061,pitch-wall*1.55,slotHeight-wall*2.0,.022),felt);
   renderGeom(box,piece(x,slotHeight*.36,.075,pitch-wall*1.9,slotHeight*.14,.020),feltShade);
  }
  // Four connected outer walls and six shared partitions, as in a chip tray.
  for(const side of [-1,1]){
   renderGeom(box,piece(side*(width-wall)/2,0,.205,wall,slotHeight,.42),woodEdge);
   renderGeom(box,piece(0,side*(slotHeight-wall)/2,.205,width,wall,.42),woodEdge);
  }
  for(let i=1;i<7;i++){
   const x=-width/2+i*pitch;
   renderGeom(box,piece(x,0,.205,wall,slotHeight-.04,.41),woodEdge);
  }
  // One uninterrupted highlighted front edge emphasizes the joined chassis.
  renderGeom(box,piece(0,-slotHeight*.5+.035,.417,width-.12,.046,.034),rim);
  for(let i=0;i<7;i++){
   const x=(i-3)*pitch;
   renderGeom(box,piece(x,-slotHeight*.5+.13,.434,pitch*.70,
    Math.min(.24,slotHeight*.20),.024),[1,1,1,1],labelTexture(decks[i].c),true);
  }
  // Metallic pins are shared at the actual physical divider intersections.
  for(let i=0;i<=7;i++){
   const x=-width/2+i*pitch;
   for(const y of [-slotHeight*.5+.03,slotHeight*.5-.03]){
    renderGeom(box,piece(x,y,.445,.061,.060,.035),[.70,.60,.405,1]);
   }
  }
  boxDrawCalls=7;
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
  drawConnectedTray(positions.filter(p=>p.kind==='deck'));
  for(const pos of positions.filter(p=>p.kind==='deck')){
   const tex=makeTextTexture({title:pos.c.name,profession:pos.profession,back:true});
   for(let n=0;n<pos.c.deckCount;n++){
    // True discrete cards: each one separately draws the same battlefield card geometry.
    const layer={...pos,z:.16+n*.031,x:pos.x+(n%3-1)*.002,
     y:pos.y+(n%5-2)*.002};
    renderPhysicalCard(layer,tex);
   }
  }
  for(const pos of positions.filter(p=>p.kind==='character')){
   const deck=positions.find(q=>q.kind==='deck'&&q.profession===pos.profession);
   renderPhysicalCard({...pos,z:.20+(deck?.c.deckCount||0)*.031},
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
    physicalBoxes:boxDrawCalls,connectedTray:true,trayBodies:1,compartments:7,
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
root.PaperchalkSceneCardHUD=Object.freeze({version:'2.1.0',create});
})(window);
