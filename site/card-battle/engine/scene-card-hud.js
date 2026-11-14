/* Seven-slot whitebox reversible card case. Decks are INSIDE; cards are drawn
 * onto the lid's inner face. The SAME lid physically folds and reverses its
 * face 180 degrees, leaving the SAME hand on top for play.
 * Real WebGL cube/rounded-card meshes only; Anima skins can replace materials.
 */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const PI=Math.PI;
function create(o){
 const {canvas,gl,drawCard,renderGeom,box,cardW,cardH,T,S,RX,RY,RZ,mul,
  perspective,getVP,uniformVP,makeTexture}=o;
 const titles={engineer:'工程师',guardian:'守卫',warrior:'战士',ranger:'射手',
  skirmisher:'游击者',medic:'医师',summoner:'召唤师'};
 const symbols={engineer:'⚙',guardian:'盾',warrior:'斧',ranger:'弓',
  skirmisher:'影',medic:'药',summoner:'兽'};
 const paint={shell:[.78,.80,.80,1],shadow:[.33,.37,.37,1],
  tray:[.61,.65,.66,1],slot:[.48,.52,.53,1],rim:[.94,.94,.91,1],
  lid:[.86,.87,.84,1],inner:[.68,.71,.70,1],hinge:[.40,.43,.43,1],
  cardSide:[.91,.89,.83,1],hingePin:[.95,.94,.88,1]};
 const textures=new Map(),portraits=new Map(),entered=new Map(),ghosts=new Map();
 const fov=39*PI/180,cameraZ=14.5;
 let width=1920,height=1080,spanW=18,spanH=10.2,now=0,scene=[],clickable=[];
 let hoverId=null,press=null,drawCalls=0,pilesRendered=0,handRendered=0;
 let sceneMotion={mode:'steady',start:0},lastSnapshot=null;
 function size(w,h){
  width=Math.max(1,w);height=Math.max(1,h);
  spanH=2*cameraZ*Math.tan(fov/2);spanW=spanH*width/height;
 }
 function dimensions(){
  const mobile=canvas.getBoundingClientRect().width<720;
  // The whole case stays flush with the screen's bottom plane. In particular
  // reducing the DEPTH of the housing stops the open lid masking the battle.
  const w=spanW*(mobile?.954:.902),h=mobile?1.48:1.68;
  const y=-spanH/2+h/2+(mobile?.15:.20);
  const pitch=(w-.29)/7;
  return{mobile,w,h,y,pitch,
   deckScale:Math.min((pitch/cardW)*.79,(h-.23)/cardH*.83),
   handScale:Math.min((h-.33)/cardH*.87,w/(10*cardW)*.82)};
 }
 function state(){return o.caseSnapshot?.(now)||{phase:'closed',angle:0,faceSpin:0,canDraw:false,canPlay:false};}
 function hingeMatrix(d,s){
  // Main hinge: fixed along the back-upper LONG edge of the shell (X axis).
  // The front-facing opening arc keeps the panel outside the seven-slot shell.
  return mul(mul(T(0,d.y+d.h/2,.29),RX(-s.angle)),T(0,-d.h/2,0));
 }
 function panelMatrix(d,s){
  // Second X-parallel axle runs THROUGH the middle of the movable panel.
  // A genuine reversible face: deck-side cards remain welded to this matrix.
  return mul(hingeMatrix(d,s),RX(-s.faceSpin));
 }
 function worldFromLocal(M,x,y,z){
  return{x:M[0]*x+M[4]*y+M[8]*z+M[12],
   y:M[1]*x+M[5]*y+M[9]*z+M[13],
   z:M[2]*x+M[6]*y+M[10]*z+M[14]};
 }
 function frontHandMatrix(p,d,s){
  // One rigid transform from drawing through closing to gameplay. No 2nd
  // hand HUD is spawned and no RY rotation distorts cards edge-on.
  let m=panelMatrix(d,s);
  m=mul(m,T(p.localX,p.localY,-.205));
  m=mul(m,RX(PI));
  const focused=hoverId===p.id&&s.canPlay;
  const selected=selectedId()===p.instance&&s.canPlay;
  m=mul(m,T(0,(focused?.13:0)+(selected?.20:0),-.035));
  m=mul(m,RZ(p.fanAngle));
  m=mul(m,S(p.scale*(focused?1.09:1),p.scale*(focused?1.09:1),1));
  return m;
 }
 function selectedId(){return o.selected?.()||null;}
 function stageScale(){
  if(sceneMotion.mode==='exit')return 1-ease((now-sceneMotion.start)/.48);
  if(sceneMotion.mode==='enter')return ease((now-sceneMotion.start)/.70);
  return 1;
 }
 function sceneMatrix(d){
  const k=stageScale();
  return mul(mul(T(0,d.y,0),S(k,k,k)),T(0,-d.y,0));
 }
 function render(geom,m,color,d){if(stageScale()<=.015)return;renderGeom(geom,mul(sceneMatrix(d),m),color);drawCalls++;}
 function physicalCard(m,texture,d){
  if(stageScale()<=.015)return;
  drawCard({hudMatrix:mul(sceneMatrix(d),m),texture,side:'ally'},now);drawCalls++;
 }
 function textureFor(card,portraitUrl=null){
  if(portraitUrl){
   if(portraits.has(portraitUrl)&&portraits.get(portraitUrl))return portraits.get(portraitUrl);
   if(!portraits.has(portraitUrl)){
    portraits.set(portraitUrl,null);
    const img=new Image();
    img.onload=()=>portraits.set(portraitUrl,makeTexture(img));
    img.onerror=()=>portraits.set(portraitUrl,null);
    img.src=portraitUrl;
   }
  }
  const name=portraitUrl?'伐木少女':card?.name||'行动牌';
  const role=card?.profession||'warrior';
  const key=role+'|'+name;
  if(textures.has(key))return textures.get(key);
  const c=document.createElement('canvas');c.width=384;c.height=576;
  const x=c.getContext('2d');
  x.fillStyle='#f3f2ec';x.fillRect(0,0,384,576);
  x.strokeStyle='#b9b9b4';x.lineWidth=9;x.strokeRect(16,16,352,544);
  x.strokeStyle='#d1d1c9';x.lineWidth=2;x.strokeRect(31,31,322,514);
  x.textAlign='center';x.fillStyle='#555c5c';
  x.font='bold 32px serif';x.fillText(titles[role]||'职业',192,90);
  x.font='bold 118px serif';x.fillText(symbols[role]||'✦',192,302);
  x.font='bold 42px serif';x.fillText(name,192,413);
  const tex=makeTexture(c);textures.set(key,tex);return tex;
 }
 function layout(snapshot,staged,d,s){
  const all=root.PaperchalkProfessionDecks?.CLASSES||[];
  const slots=[];
  const displayDeck=s.phase==='drawing'||s.phase==='opening'&&s.angle>.30||
   s.phase==='closing'&&s.angle>.35;
  if(displayDeck){
   all.forEach((cls,i)=>{
    const c=snapshot.classes.find(a=>a.id===cls.id);
    slots.push({kind:'deck',id:'deck:'+cls.id,profession:cls.id,c,
     x:(i-3)*d.pitch,y:d.y-.015,z:.20,scale:d.deckScale,angle:0});
   });
   for(const u of staged){
    const deck=slots.find(x=>x.profession===u.role);
    if(deck)slots.push({...deck,kind:'character',id:'character:'+u.id,
     unitId:u.id,portrait:u.portrait,c:{name:'伐木少女',profession:u.role},
     scale:d.deckScale*1.015});
   }
  }
  // The same cards follow the SAME moving cover surface throughout closing.
  const hand=snapshot.hand||[],wide=d.w*.83;
  for(let i=0;i<hand.length;i++){
   const axis=hand.length===1?0:i/(hand.length-1)*2-1;
   const p={kind:'hand',id:'hand:'+hand[i].instance,instance:hand[i].instance,
    profession:hand[i].profession,c:hand[i],
    localX:axis*wide/2,localY:(1-axis*axis)*.05,
    fanAngle:axis*.026,scale:d.handScale};
   const pose=worldFromLocal(panelMatrix(d,s),p.localX,p.localY,-.205);
   slots.push({...p,x:pose.x,y:pose.y,z:pose.z});
  }
  if(s.phase==='closed')slots.push({kind:'case',id:'case:lid',x:0,y:d.y,z:.65,
   width:d.w,height:d.h});
  return slots;
 }
 function deckPose(p,count,d){
  // Mostly front-on screen-space card slabs, but with visible physical
  // thickness along depth. The front lip cannot cover their faces.
  const base=mul(T(p.x,p.y,.09),RX(-.17));
  const z=.20+Math.max(0,count-1)*.032;
  return{base,top:mul(mul(base,T(0,0,z)),S(p.scale,p.scale,1)),
   center:worldFromLocal(base,0,0,z)};
 }
 function drawShell(d,s){
  const b=d.y,W=d.w,H=d.h;
  const slab=(x,y,z,sx,sy,sz,col)=>render(box,mul(T(x,y,z),S(sx,sy,sz)),col,d);
  // One contiguous seven-bay whitebox: no separate floating small boxes.
  slab(0,b,-.31,W,H,.35,paint.shell);
  slab(0,b,-.096,W-.18,H-.18,.058,paint.tray);
  const left=-W/2+.145;
  for(let i=0;i<7;i++){
   const center=left+(i+.5)*d.pitch;
   slab(center,b,-.044,d.pitch-.092,H-.19,.022,paint.slot);
  }
  // The barriers rest behind the top exposed card. The front lip is thin.
  slab(0,b-H*.49,.07,W,.068,.12,paint.rim);
  slab(0,b+H*.49,-.03,W,.076,.25,paint.rim);
  slab(-W*.5,b,-.03,.084,H,.22,paint.rim);
  slab(W*.5,b,-.03,.084,H,.22,paint.rim);
  for(let i=1;i<7;i++){
   const x=left+i*d.pitch;
   slab(x,b,-.034,.067,H-.16,.16,paint.rim);
  }
  // Both hinges share the EXACT lid pivot. Hardware never teleports.
  for(const x of [-W*.39,W*.39]){
   slab(x,b+H/2,.29,.49,.14,.20,paint.hinge);
   slab(x,b+H/2,.415,.24,.076,.13,paint.hingePin);
  }
 }
 function drawLid(d,s){
  const frame=hingeMatrix(d,s),panel=panelMatrix(d,s);
  const panelPiece=(x,y,z,sx,sy,sz,color)=>
   render(box,mul(panel,mul(T(x,y,z),S(sx,sy,sz))),color,d);
  const framePiece=(x,y,z,sx,sy,sz,color)=>
   render(box,mul(frame,mul(T(x,y,z),S(sx,sy,sz))),color,d);
  // Narrow hinge-following perimeter; it never becomes a giant solid wall.
  framePiece(0,d.h*.49,0,d.w,.055,.13,paint.rim);
  framePiece(0,-d.h*.49,0,d.w,.055,.13,paint.rim);
  framePiece(-d.w*.49,0,0,.058,d.h,.13,paint.rim);
  framePiece(d.w*.49,0,0,.058,d.h,.13,paint.rim);
  // Double-sided removable face panel, with dedicated Anima skin sockets.
  panelPiece(0,0,0,d.w-.19,d.h-.19,.115,paint.lid);
  panelPiece(0,0,.067,d.w-.23,d.h-.23,.017,paint.shell);
  panelPiece(0,0,-.067,d.w-.23,d.h-.23,.017,paint.inner);
  // Inset holding rim on the hand-bearing (inner) face.
  for(const y of [-d.h*.44,d.h*.44])
   panelPiece(0,y,-.101,d.w*.91,.027,.045,paint.hinge);
  for(const x of [-d.w*.45,d.w*.45])
   panelPiece(x,0,-.101,.032,d.h*.82,.045,paint.hinge);
  // Genuine center-axle end caps make the second X-axis legible.
  for(const x of [-d.w*.45,d.w*.45])
   framePiece(x,0,0,.12,.15,.16,paint.hingePin);
 }
 function drawDeck(p,d,s,staged){
  const cards=o.remainingCards?.(p.profession)||[];
  const count=cards.length;
  if(!count)return;
  const pose=deckPose(p,count,d);
  if(count>1){
   const slab=mul(pose.base,mul(T(0,0,.20+(count-1)*.016),
    S(cardW*p.scale,cardH*p.scale,(count-1)*.032)));
   render(box,slab,paint.cardSide,d);
   // A few distinct visible edges; do not redraw 70 hidden card textures.
   for(let n=1;n<count;n+=3){
    const seam=mul(pose.base,mul(T(0,0,.20+n*.032),
      S(cardW*p.scale,cardH*p.scale,.006)));
    render(box,seam,paint.shadow,d);
   }
  }
  physicalCard(pose.top,textureFor(cards[count-1]),d);
  pilesRendered++;
  const hero=staged.find(u=>u.role===p.profession);
  if(hero){
   const m=mul(pose.base,mul(T(0,0,.20+count*.032+.085),
      S(p.scale*1.03,p.scale*1.03,1)));
   physicalCard(m,textureFor({profession:p.profession},hero.portrait),d);
  }
 }
 function drawHand(p,d,s,byProfession){
  const tex=textureFor(p.c);
  const flyStarted=entered.get(p.id);
  const flight=s.phase==='drawing'&&flyStarted!==undefined?
   clamp((now-flyStarted)/.67,0,1):1;
  if(flight<1){
   const deck=byProfession.get(p.profession);
   if(deck){
    const source=deckPose(deck,Math.max(1,deck.c?.deckCount||1),d).center;
    const destination=worldFromLocal(panelMatrix(d,s),p.localX,p.localY,-.205);
    const t=ease(flight);
    const x=source.x+(destination.x-source.x)*t;
    const y=source.y+(destination.y-source.y)*t+Math.sin(t*PI)*.42;
    const z=source.z+(destination.z-source.z)*t+Math.sin(t*PI)*.42+.10;
    const m=mul(mul(T(x,y,z),RX(-.12)),S(p.scale,p.scale,1));
    physicalCard(m,tex,d);handRendered++;return;
   }
  }
  physicalCard(frontHandMatrix(p,d,s),tex,d);handRendered++;
 }
 function draw(time,w,h){
  now=time;size(w,h);
  const d=dimensions(),s=state(),snapshot=o.snapshot(),staged=o.staged?.()||[];
  lastSnapshot=s;
  const positions=layout(snapshot,staged,d,s);
  const fresh=new Set(positions.filter(p=>p.kind==='hand').map(p=>p.id));
  for(const p of scene){
   if(p.kind==='hand'&&!fresh.has(p.id))ghosts.set(p.id,{p,start:now});
  }
  scene=positions;
  clickable=positions.filter(p=>{
   if(p.kind==='case')return s.phase==='closed';
   if(p.kind==='hand')return s.phase==='playing';
   return s.phase==='drawing';
  });
  for(const p of positions)if(p.kind==='hand'&&!entered.has(p.id))entered.set(p.id,now);
  for(const id of [...entered.keys()])if(!fresh.has(id))entered.delete(id);
  drawCalls=0;pilesRendered=0;handRendered=0;
  const oldVP=getVP();
  gl.viewport(0,0,width,height);gl.clear(gl.DEPTH_BUFFER_BIT);
  uniformVP(mul(perspective(fov,width/height,.1,80),T(0,0,-cameraZ)));
  drawShell(d,s);
  if(s.angle>.30||s.phase==='drawing'){
   for(const p of positions.filter(p=>p.kind==='deck'))drawDeck(p,d,s,staged);
  }
  drawLid(d,s);
  const byProfession=new Map(positions.filter(p=>p.kind==='deck').map(p=>[p.profession,p]));
  for(const p of positions.filter(p=>p.kind==='hand'))drawHand(p,d,s,byProfession);
  for(const [id,ghost] of ghosts){
   const k=1-ease((now-ghost.start)/.30);
   if(k<=.015){ghosts.delete(id);continue;}
   const m=mul(frontHandMatrix(ghost.p,d,s),S(k,k,k));
   physicalCard(m,textureFor(ghost.p.c),d);
  }
  gl.viewport(0,0,width,height);uniformVP(oldVP);
 }
 function worldPoint(e){
  const r=canvas.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return null;
  return{x:((e.clientX-r.left)/r.width-.5)*spanW,
   y:(.5-(e.clientY-r.top)/r.height)*spanH};
 }
 function hit(e){
  const q=worldPoint(e);if(!q)return null;
  const d=dimensions();
  const ranked=[...clickable].sort((a,b)=>
   (a.kind==='character'?4:a.kind==='hand'?3:a.kind==='deck'?2:1)-
   (b.kind==='character'?4:b.kind==='hand'?3:b.kind==='deck'?2:1)).reverse();
  for(const p of ranked){
   if(p.kind==='case'){
    if(Math.abs(q.x)<d.w*.5&&Math.abs(q.y-d.y)<d.h*.5)return p;
    continue;
   }
   // Hand hit targets follow the reversible lid's transformed local center.
   const scale=p.scale||1;
   const maxX=cardW*scale*(p.kind==='hand'?.70:.57)+.05;
   const maxY=cardH*scale*(p.kind==='hand'?.62:.48)+.065;
   if(Math.abs(q.x-p.x)<maxX&&Math.abs(q.y-p.y)<maxY)return p;
  }
  return null;
 }
 function move(e){
  const p=hit(e);
  hoverId=p?.id||null;
  if(press?.id.startsWith('character:'))o.previewCharacter?.(press.id.slice(10),e.clientX,e.clientY);
  return !!p;
 }
 function down(e){
  const p=hit(e);if(!p)return false;
  e.preventDefault();press={id:p.id,x:e.clientX,y:e.clientY};
  hoverId=p.id;return true;
 }
 function up(e){
  if(!press)return false;
  const prev=press;press=null;
  const p=hit(e),moved=Math.hypot(e.clientX-prev.x,e.clientY-prev.y)>22;
  if(prev.id.startsWith('character:')){
   const id=prev.id.slice(10);o.previewCharacter?.(null);
   if(moved)o.placeCharacter?.(id,e.clientX,e.clientY);
   else if(p?.id===prev.id)o.selectCharacter?.(id);
   return true;
  }
  if(moved||!p||p.id!==prev.id)return true;
  if(p.kind==='case')o.openCase?.();
  else if(p.kind==='deck')o.draw?.(p.profession);
  else if(p.kind==='hand')o.select?.(p.instance);
  return true;
 }
 function pointFor(id){
  const d=dimensions(),p=scene.find(x=>x.id===id);
  if(!p)return null;
  const r=canvas.getBoundingClientRect();
  return{x:r.left+(.5+p.x/spanW)*r.width,y:r.top+(.5-p.y/spanH)*r.height};
 }
 function animateScene(phase,at){sceneMotion={mode:phase,start:at};}
 function resetAnimations(){entered.clear();ghosts.clear();scene=[];sceneMotion={mode:'steady',start:0};}
 return Object.freeze({render:draw,hit,move,down,up,pointFor,animateScene,resetAnimations,
  get drawn(){return drawCalls;},
  get snapshot(){
   const s=lastSnapshot||state(),hand=o.snapshot(),d=dimensions();
   const m=panelMatrix(d,s),center=worldFromLocal(m,0,0,0);
   const held=scene.filter(p=>p.kind==='hand');
   const anchorError=held.reduce((max,p)=>{
    const projected=worldFromLocal(m,p.localX,p.localY,-.205);
    return Math.max(max,Math.hypot(projected.x-p.x,projected.y-p.y,projected.z-p.z));
   },0);
   return{lidGeometry:{openAngle:s.openAngle,hingeX:0,hingeY:d.y+d.h/2,hingeZ:.29,
      centerX:center.x,centerY:center.y,centerZ:center.z,
      panelInnerNormalZ:-m[10],attachmentError:anchorError},
    visible:scene.map(p=>({id:p.id,kind:p.kind,x:p.x,y:p.y})),
    casePhase:s.phase,lidAngle:s.angle,lidFaceSpin:s.faceSpin,
    visibleDeckPiles:scene.filter(p=>p.kind==='deck').length,
    stagedCharacterCards:scene.filter(p=>p.kind==='character').length,
    handCardsOnReversibleFace:scene.filter(p=>p.kind==='hand').length,
    physicalBoxes:1,compartments:7,hinges:2,reversibleLid:true,
    deckArrangement:'seven-slots-single-case',deckTiltRadians:-.17,
    faceUpDeck:true,standaloneTurnCard:false,screenEdgeAnchored:true,
    physicalDeckCards:hand.classes.reduce((n,c)=>n+c.deckCount,0),
    count:hand.count,renderedCardMeshes:drawCalls,hasDomCards:false,
    backgroundPanel:false,geometry:'shared-battlefield-card-mesh',
    handLayout:'reversible-inner-face-to-top',coveredCardEdgeLOD:true,
    viewportPx:height,vanishingCards:ghosts.size};
  }});
}
root.PaperchalkSceneCardHUD=Object.freeze({version:'5.0.0-reversible-whitebox',create});
})(window);
