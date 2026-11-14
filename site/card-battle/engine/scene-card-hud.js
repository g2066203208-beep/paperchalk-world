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
  const w=spanW*(mobile?.93:.88),h=mobile?1.68:2.10;
  const y=-spanH/2+h/2+(mobile?.24:.28);
  return{mobile,w,h,y,pitch:(w-.35)/7,deckScale:Math.min(mobile?.32:.80,(w-.35)/7/cardW*.78),
   handScale:Math.min(mobile?.265:.63,w/(10*cardW)*.92)};
 }
 function state(){return o.caseSnapshot?.(now)||{phase:'closed',angle:0,faceSpin:0,canDraw:false,canPlay:false};}
 function tiltLid(d,s){
  // Outer lid starts flush over the compartment body. The hinge opens the
  // lid 180 degrees, and a secondary REVERSIBLE PANEL pivots 180 degrees.
  // Inner face is camera-facing both when open and after it is folded shut.
  return mul(mul(mul(T(0,d.y+d.h/2,.33),RX(s.angle)),
    T(0,-d.h/2,0)),RY(s.faceSpin));
 }
 function worldFromLocal(M,x,y,z){
  return{x:M[0]*x+M[4]*y+M[8]*z+M[12],
   y:M[1]*x+M[5]*y+M[9]*z+M[13],
   z:M[2]*x+M[6]*y+M[10]*z+M[14]};
 }
 function frontHandMatrix(p,d,s){
  let m=tiltLid(d,s);
  // This is the inside of the lid. At full opening, hinge=PI cancels
  // the card's RX(PI); at full closing, reversible face=PI puts it on TOP.
  m=mul(m,T(p.localX,p.localY,-.155));
  m=mul(m,RX(PI));
  m=mul(m,RZ(s.faceSpin)); // keep titles upright after the face reverses
  const focused=hoverId===p.id&&s.canPlay;
  const selected=selectedId()===p.instance&&s.canPlay;
  m=mul(m,T(0,(focused?.16:0)+(selected?.24:0),-.02));
  m=mul(m,RZ(p.fanAngle));
  m=mul(m,S(p.scale*(focused?1.08:1),p.scale*(focused?1.08:1),1));
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
  const openEnough=s.angle>.18||s.phase==='drawing';
  if(openEnough){
   all.forEach((cls,i)=>{
    const c=snapshot.classes.find(a=>a.id===cls.id);
    slots.push({kind:'deck',id:'deck:'+cls.id,profession:cls.id,c,
     x:(i-3)*d.pitch,y:d.y-.02,z:-.24,scale:d.deckScale,angle:0});
   });
   for(const u of staged){
    const deck=slots.find(x=>x.profession===u.role);
    if(deck)slots.push({...deck,kind:'character',id:'character:'+u.id,
     unitId:u.id,portrait:u.portrait,c:{name:'伐木少女',profession:u.role},
     scale:d.deckScale*1.015});
   }
  }
  // Hand remains on the SAME physical reversible inner lid while it rotates.
  // It is NOT moved to a second top-layer hand after confirming the draw.
  const hand=snapshot.hand||[],wide=d.w*.84;
  for(let i=0;i<hand.length;i++){
   const axis=hand.length===1?0:i/(hand.length-1)*2-1;
   const p={kind:'hand',id:'hand:'+hand[i].instance,instance:hand[i].instance,
    profession:hand[i].profession,c:hand[i],
    localX:axis*wide/2,localY:(1-axis*axis)*.08,
    fanAngle:axis*.055,scale:d.handScale};
   const pose=worldFromLocal(tiltLid(d,s),p.localX,p.localY,-.155);
   slots.push({...p,x:pose.x,y:pose.y,z:pose.z});
  }
  if(s.phase==='closed')slots.push({kind:'case',id:'case:lid',x:0,y:d.y,z:.7,
   width:d.w,height:d.h});
  return slots;
 }
 function deckPose(p,count,d){
  // Inclined card deck INSIDE the physical compartment. Thin stacked edge
  // thickness varies with the exact remaining count, not a fake 2D sprite.
  const base=mul(T(p.x,p.y,-.14),RX(-.84));
  const z=.10+count*.035;
  return{base,top:mul(mul(base,T(0,0,z)),S(p.scale,p.scale,1)),
   center:worldFromLocal(base,0,0,z)};
 }
 function drawShell(d,s){
  const b=d.y,W=d.w,H=d.h;
  const slab=(x,y,z,sx,sy,sz,col)=>render(box,mul(T(x,y,z),S(sx,sy,sz)),col,d);
  // Single continuous seven-bay whitebox tray, bottom pad and four walls.
  slab(0,b,-.32,W,H,.36,paint.shell);
  slab(0,b,-.105,W-.21,H-.19,.08,paint.tray);
  slab(0,b-H*.49,-.02,W,.085,.26,paint.rim);
  slab(0,b+H*.49,-.07,W,.085,.31,paint.rim);
  slab(-W*.5,b,-.02,.10,H,.29,paint.rim);
  slab(W*.5,b,-.02,.10,H,.29,paint.rim);
  const left=-W/2+.175;
  for(let i=0;i<7;i++){
   const center=left+(i+.5)*d.pitch;
   slab(center,b,-.03,d.pitch-.115,H-.27,.025,paint.slot);
  }
  for(let i=1;i<7;i++){
   const x=left+i*d.pitch;
   slab(x,b,-.035,.075,H-.15,.29,paint.rim);
  }
  // Two solid hinge barrels and two visible hinge pins.
  for(const x of [-W*.39,W*.39]){
   slab(x,b+H/2,.30,.49,.20,.22,paint.hinge);
   slab(x,b+H/2,.46,.25,.095,.15,paint.hingePin);
  }
 }
 function drawLid(d,s){
  const lid=tiltLid(d,s);
  const piece=(x,y,z,sx,sy,sz,color)=>{
   render(box,mul(lid,mul(T(x,y,z),S(sx,sy,sz))),color,d);
  };
  // Whitebox artwork placeholders: outer face and the INNER card holding
  // surface are the same reversible physical panel, NOT two swapped cards.
  piece(0,0,0,d.w,d.h,.22,paint.lid);
  piece(0,0,-.113,d.w-.17,d.h-.18,.035,paint.inner);
  piece(0,0,.118,d.w-.20,d.h-.20,.028,paint.shell);
  piece(0,d.h/2-.045,0,d.w,.075,.28,paint.rim);
  piece(0,-d.h/2+.045,0,d.w,.075,.28,paint.rim);
  piece(-d.w/2+.045,0,0,.085,d.h,.28,paint.rim);
  piece(d.w/2-.045,0,0,.085,d.h,.28,paint.rim);
  // Inner recessed lip, currently blank and ready for Anima painted skin.
  piece(0,-d.h*.42,-.15,d.w*.92,.035,.08,paint.hinge);
 }
 function drawDeck(p,d,s,staged){
  const cards=o.remainingCards?.(p.profession)||[];
  const count=cards.length;
  if(!count)return;
  const pose=deckPose(p,count,d);
  if(count>1){
   const slab=mul(pose.base,mul(T(0,0,.10+(count-1)*.035*.5),
    S(cardW*p.scale,cardH*p.scale,(count-1)*.035)));
   render(box,slab,paint.cardSide,d);
   // Side creases show separated paper layers at a low draw-call budget.
   for(let n=1;n<count;n+=3){
    const seam=mul(pose.base,mul(T(0,0,.10+n*.035),
      S(cardW*p.scale,cardH*p.scale,.008)));
    render(box,seam,paint.shadow,d);
   }
  }
  physicalCard(pose.top,textureFor(cards[count-1]),d);
  pilesRendered++;
  const hero=staged.find(u=>u.role===p.profession);
  if(hero){
   const m=mul(pose.base,mul(T(0,0,.10+count*.035+.105),S(p.scale*1.04,p.scale*1.04,1)));
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
    const destination=worldFromLocal(tiltLid(d,s),p.localX,p.localY,-.155);
    const t=ease(flight);
    const x=source.x+(destination.x-source.x)*t;
    const y=source.y+(destination.y-source.y)*t+Math.sin(t*PI)*.42;
    const z=source.z+(destination.z-source.z)*t+Math.sin(t*PI)*.65+.26;
    const m=mul(mul(T(x,y,z),RX(-.05)),S(p.scale,p.scale,1));
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
  if(s.angle>.18||s.phase==='drawing'){
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
