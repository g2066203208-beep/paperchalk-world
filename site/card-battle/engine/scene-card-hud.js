/* True WebGL card interface — same meshes, materials and drawCard() as deployed unit cards.
 * No HTML card fronts, CSS card stacks, SVG buttons or DOM hand widgets.
 * Seven animated PHYSICAL deck piles and one individually selectable ten-card hand.
 * Adapter only: the profession-decks model remains authoritative for rules.
 */
(function(root){
'use strict';
function create(opts){
 const {canvas,gl,drawCard,renderGeom,box,cardW,cardH,cardD,T,S,RX,RY,RZ,mul,ortho,uniformVP,makeTexture}=opts;
 const CLASS_COLOR={warrior:'#8d7858',engineer:'#768b62',guardian:'#697f82',
  ranger:'#77835b',skirmisher:'#77718c',medic:'#90a58a',summoner:'#987961'};
 const BACK_TINT={warrior:'#405d41',engineer:'#52684c',guardian:'#4e646b',
  ranger:'#4d624a',skirmisher:'#5d5769',medic:'#536958',summoner:'#655e49'};
 let width=1,height=1,pxBand=1,halfWidth=8.7,top=2.0;
 let clickable=[],hoverId=null,pressId=null,pressPoint=null,visual=[],drawn=0,now=0;
 const faceCache=new Map(),backCache=new Map(),portraitCache=new Map(),anim=new Map();
 let draggingCharacter=null;
 const colors={wood:[.17,.21,.17,1],wood2:[.19,.235,.19,1],woodTrim:[.31,.345,.278,1],
    dark:[.16,.18,.16,1],back:[.55,.58,.50,1],border:[.96,.96,.92,1]};
 function safeLabel(str){return String(str).slice(0,34);}
 function texture({title,profession,family='common',back=false}){
  const key=[title,profession,family,back].join('|');
  const cache=back?backCache:faceCache;
  if(cache.has(key))return cache.get(key);
  const c=document.createElement('canvas');c.width=512;c.height=768;
  const ctx=c.getContext('2d');
  ctx.fillStyle=back?(BACK_TINT[profession]||'#526753'):'#f6f1e4';
  ctx.fillRect(0,0,512,768);
  // Material/paper texture and aged border, all become texture on the SAME 3D mesh.
  for(let y=0;y<768;y+=8){
   ctx.fillStyle=back?'rgba(228,226,190,.018)':'rgba(125,107,75,.018)';
   ctx.fillRect(0,y,512,2);
  }
  ctx.lineWidth=11;ctx.strokeStyle=back?'#c4c7a5':'#9b957f';
  ctx.strokeRect(28,28,456,712);
  ctx.lineWidth=2;ctx.strokeStyle=back?'#879a7c':'#b4ac98';
  ctx.strokeRect(46,46,420,676);
  if(back){
   const icon=({engineer:'⚙',guardian:'盾',warrior:'斧',ranger:'弓',skirmisher:'影',medic:'药',summoner:'兽'})[profession]||'◇';
   ctx.fillStyle='#dbdfc4';ctx.textAlign='center';
   ctx.font='100px serif';ctx.fillText(icon,256,395);
   ctx.font='bold 47px serif';ctx.fillText(safeLabel(title),256,510);
   ctx.font='23px serif';ctx.fillText('PAPERCHALK',256,682);
   ctx.beginPath();ctx.ellipse(256,364,153,192,0,0,Math.PI*2);
   ctx.strokeStyle='#b6c5a2';ctx.lineWidth=6;ctx.stroke();
  }else{
   const name=(root.PaperchalkProfessionDecks?.CLASSES||[]).find(x=>x.id===profession)?.name||'行动';
   ctx.fillStyle=CLASS_COLOR[profession]||'#677259';ctx.fillRect(48,46,416,78);
   ctx.fillStyle='#faf8ec';ctx.textAlign='center';ctx.font='bold 33px serif';ctx.fillText(name,256,100);
   ctx.fillStyle='#5b6151';ctx.font='bold 45px serif';
   const marker=({engineer:'⚙',guardian:'盾',warrior:'斧',ranger:'弓',skirmisher:'影',medic:'药',summoner:'兽'})[profession]||'◇';
   ctx.fillText(marker,256,337);
   ctx.strokeStyle='#bcb39b';ctx.lineWidth=3;
   ctx.beginPath();ctx.moveTo(115,401);ctx.lineTo(397,401);ctx.stroke();
   ctx.fillStyle='#34392e';ctx.font='bold 43px serif';ctx.fillText(safeLabel(title),256,505);
   ctx.font='26px serif';ctx.fillStyle='#807d6f';
   ctx.fillText(family==='faction'?'组织专属':'职业通用',256,605);
   ctx.font='20px serif';ctx.fillText('✦',256,700);
  }
  const tex=makeTexture(c);
  cache.set(key,tex);return tex;
 }
 function sizeBand(w,h){
  width=Math.max(1,w);height=Math.max(1,h);
  const cssW=canvas.getBoundingClientRect().width||w;
  const mobile=cssW<720;
  halfWidth=mobile?4.55:(cssW<1000?6.5:8.7);
  pxBand=Math.round(Math.min(height*.47,(mobile?335:415)*(height/(canvas.getBoundingClientRect().height||height))));
  pxBand=Math.max(140,pxBand);
  top=halfWidth*pxBand/width;
  return pxBand;
 }
 function worldPoint(event){
  const rect=canvas.getBoundingClientRect();
  const visibleBand=pxBand/(height/(rect.height||1));
  const start=rect.bottom-visibleBand;
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<start||event.clientY>rect.bottom)return null;
  const x=((event.clientX-rect.left)/rect.width*2-1)*halfWidth;
  const y=(1-2*(event.clientY-start)/visibleBand)*top;
  return{x,y};
 }
 function layout(hand,classes,staged){
  const mobile=canvas.getBoundingClientRect().width<720;
  const handSpan=mobile?7.30:Math.min(15.0,Math.max(0,(hand.length-1)*1.52));
  const deckSpan=mobile?7.55:13.8;
  const hy=mobile?top*.44:top*.49,dy=mobile?-top*.51:-top*.51;
  const handScale=mobile?.56:.61,deckScale=mobile?.51:.58;
  const slots=[];
  hand.forEach((c,i)=>{
   const x=hand.length===1?0:(i/(hand.length-1)-.5)*handSpan;
   slots.push({kind:'hand',id:'hand:'+c.instance,instance:c.instance,c,
    x,y:hy+Math.sin(i*.58)*.07,z:.5,scale:handScale,angle:(i-(hand.length-1)/2)*-.015});
  });
  classes.forEach((c,i)=>{
   const x=(i/6-.5)*deckSpan;
   slots.push({kind:'deck',id:'deck:'+c.id,profession:c.id,c,
    x,y:dy,z:.3,scale:deckScale,angle:Math.sin(i*2.6)*.023});
  });
  staged.forEach(u=>{
   const deck=slots.find(p=>p.kind==='deck'&&p.profession===u.role);
   if(deck)slots.push({...deck,kind:'character',id:'character:'+u.id,unitId:u.id,portrait:u.portrait,
    z:deck.z+.52,scale:deck.scale*1.02});
  });
  slots.push({kind:'turn',id:'turn:end',x:halfWidth-(mobile?.34:.42),y:0,z:.9,
   scale:mobile?.20:.23,angle:-.06});
  return slots;
 }
 function cardGeom(pos,tex,elapsed=0,scaleMult=1){
  const hover=(hoverId===pos.id?1:0),selected=pos.kind==='hand'&&opts.selected?.()===pos.instance?1:0;
  const stagedSelected=pos.kind==='character'&&opts.selectedCharacter?.()===pos.unitId;
  const raised=hover*.18+selected*.25+(stagedSelected?.24:0);
  const hoverScale=1+hover*.09+selected*.10+(stagedSelected?.09:0);
  const sway=Math.sin(now*1.55+pos.x*.24)*.010;
  const scale=pos.scale*scaleMult*hoverScale;
  const y=pos.y+raised+sway;
  const model=mul(mul(mul(mul(T(pos.x,y,pos.z+raised*.42),RY(-hover*.055)),RX(-.085-hover*.06)),RZ(pos.angle+hover*.032)),S(scale,scale,1));
  const c={hudMatrix:model,texture:tex,side:'ally'};
  drawCard(c,now);
 }
 function portraitTexture(url){
  if(!url)return null;
  if(portraitCache.has(url))return portraitCache.get(url);
  portraitCache.set(url,null);
  const img=new Image();
  img.onload=()=>portraitCache.set(url,makeTexture(img));
  img.onerror=()=>portraitCache.set(url,null);
  img.src=url;
  return null;
 }
 function renderDeckBox(p,cardCount){
  // A real open-topped 3D wooden/cardboard box, built from the same WebGL box mesh.
  // Its four side-walls have thickness, depth, seams and separate corner details.
  const cw=cardW*p.scale*1.19,ch=cardH*p.scale*1.15;
  const bx=p.x,by=p.y,z=.115,border=Math.max(.035,p.scale*.095);
  renderGeom(box,mul(T(bx,by,z),S(cw,ch,.22)),[.33,.29,.22,1]);
  renderGeom(box,mul(T(bx,by,z+.14),S(cw-border*2,ch-border*2,.021)),[.13,.19,.15,1]);
  for(const side of [-1,1]){
   renderGeom(box,mul(T(bx+side*(cw-border)/2,by,z+.21),S(border,ch,.28)),[.46,.38,.27,1]);
   renderGeom(box,mul(T(bx,by+side*(ch-border)/2,z+.21),S(cw,border,.28)),[.43,.37,.27,1]);
  }
  for(const xx of [-1,1])for(const yy of [-1,1]){
   renderGeom(box,mul(T(bx+xx*cw*.45,by+yy*ch*.445,z+.37),S(.065,.065,.036)),[.65,.59,.43,1]);
  }
  if(cardCount===0){
   renderGeom(box,mul(T(bx,by,z+.153),S(cw*.66,ch*.70,.018)),[.15,.22,.18,1]);
  }
 }
 function updateDrawTransitions(slots){
  // New physical cards fly from their profession's deck to their ordered hand slot.
  const live=new Set(slots.map(p=>p.id));
  for(const id of anim.keys())if(!live.has(id))anim.delete(id);
  for(const p of slots){if(p.kind!=='hand'||anim.has(p.id))continue;anim.set(p.id,now);}
 }
 function render(nowTime,w,h){
  now=nowTime;sizeBand(w,h);
  const state=opts.snapshot();
  const staged=opts.staged?.()||[];
  const slots=layout(state.hand,state.classes,staged);
  updateDrawTransitions(slots);
  visual=slots;clickable=slots.map(p=>({...p,width:cardW*p.scale,height:cardH*p.scale}));
  const wasVP=opts.getVP();
  gl.enable(gl.SCISSOR_TEST);gl.scissor(0,0,width,pxBand);
  gl.viewport(0,0,width,pxBand);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  uniformVP(ortho(-halfWidth,halfWidth,-top,top,-20,20));
  // Physical dark wood foreground; no HTML card dock.
  renderGeom(box,mul(T(0,0,-2.2),S(halfWidth*2+2,top*2+.5,.16)),colors.wood);
  for(let i=0;i<9;i++){
   renderGeom(box,mul(T(0,-top+.2+i*(top*2-.4)/8,-1.91),S(halfWidth*2+.2,.018,.02)),colors.wood2);
  }
  renderGeom(box,mul(T(0,-top+.10,-1.84),S(halfWidth*2,.055,.05)),colors.woodTrim);
  renderGeom(box,mul(T(0,top-.10,-1.84),S(halfWidth*2,.055,.05)),colors.woodTrim);
  drawn=0;
  for(const pos of slots.filter(p=>p.kind==='deck')){
   const count=pos.c.deckCount;
   renderDeckBox(pos,count);
   if(count===0)continue;
   const back=texture({title:pos.c.name,profession:pos.profession,back:true});
   // Each card is an independent slab with its own 3D mesh and depth.
   // Never collapse the stack into a texture or a CSS layered element.
   for(let n=0;n<count;n++){
    const layer={...pos,id:'physical-card:'+pos.profession+':'+n,
      x:pos.x+n*.0025,y:pos.y-n*.0015,z:.37+n*.027,
      angle:pos.angle+(n%3-1)*.004};
    cardGeom(layer,back);drawn++;
   }
  }
  for(const pos of slots.filter(p=>p.kind==='character')){
   const parent=slots.find(p=>p.kind==='deck'&&p.profession===pos.profession);
   const count=parent?.c?.deckCount||0;
   const tex=portraitTexture(pos.portrait)||texture({
    title:'伐木少女',profession:pos.profession,family:'faction'});
   cardGeom({...pos,z:.40+count*.027+.06},tex);drawn++;
  }
  for(const pos of slots.filter(p=>p.kind==='hand')){
   const tex=texture({title:pos.c.name,profession:pos.c.profession,family:pos.c.family});
   const started=anim.get(pos.id)||now;
   const duration=Math.min(1,(now-started)/.36);
   if(duration<1){
    const origin=slots.find(p=>p.kind==='deck'&&p.profession===pos.c.profession);
    const travel=Math.pow(1-duration,2);
    const flying={...pos,x:pos.x+(origin.x-pos.x)*travel,
     y:pos.y+(origin.y-pos.y)*travel+Math.sin(duration*Math.PI)*.35,
     z:pos.z+travel*.22,angle:pos.angle+travel*.2};
    cardGeom(flying,tex);
   }else cardGeom(pos,tex);
   drawn++;
  }
  const turn=slots.find(p=>p.kind==='turn');
  cardGeom(turn,texture({title:'结束回合',profession:'guardian'}),now);drawn++;
  gl.disable(gl.SCISSOR_TEST);gl.viewport(0,0,width,height);
  uniformVP(wasVP);
 }
 function hit(e){
  const point=worldPoint(e);if(!point)return null;
  const picked=[...clickable].filter(p=>p.kind!=='deck'||!opts.staged?.()?.some(u=>u.role===p.profession)).reverse();
  // Front-most hand is picked first where fan cards overlap.
  picked.sort((a,b)=>a.kind==='character'&&b.kind!=='character'?-1:b.kind==='character'&&a.kind!=='character'?1:0);
  for(const p of picked){
   const margin=p.kind==='turn'?.13:.035;
   if(Math.abs(point.x-p.x)<=p.width*.5+margin&&Math.abs(point.y-p.y)<=p.height*.5+margin){
    return p;
   }
  }
  return {kind:'hud-surface',id:'hud-surface'};
 }
 function move(e){
  if(pressId?.startsWith('character:')){
   draggingCharacter=pressId.slice(10);
   opts.previewCharacter?.(draggingCharacter,e.clientX,e.clientY);
   hoverId=pressId;return true;
  }
  const p=hit(e),id=p?.id||null;
  hoverId=id==='hud-surface'?null:id;
  return !!p;
 }
 function down(e){
  const p=hit(e);if(!p)return false;
  pressId=p.id;pressPoint={x:e.clientX,y:e.clientY};
  hoverId=p.id==='hud-surface'?null:p.id;
  e.preventDefault();return true;
 }
 function up(e){
  if(!pressId)return false;
  const id=pressId,point=pressPoint;pressId=null;pressPoint=null;
  if(id.startsWith('character:')){
   const unitId=id.slice(10);
   draggingCharacter=null;opts.previewCharacter?.(null);
   const moved=Math.hypot(e.clientX-point.x,e.clientY-point.y)>28;
   if(moved){
    opts.placeCharacter?.(unitId,e.clientX,e.clientY);
    return true;
   }
   if(hit(e)?.id===id)opts.selectCharacter?.(unitId);
   return true;
  }
  if(Math.hypot(e.clientX-point.x,e.clientY-point.y)>28)return true;
  const p=hit(e);if(!p||p.id!==id)return true;
  if(p.kind==='deck')opts.draw(p.profession);
  else if(p.kind==='hand')opts.select(p.instance);
  else if(p.kind==='turn')opts.nextTurn();
  return true;
 }
 function pointFor(id){
  sizeBand(canvas.width,canvas.height);
  const p=visual.find(s=>s.id===id);
  if(!p)return null;
  const rect=canvas.getBoundingClientRect();
  const bh=pxBand/(height/(rect.height||1));
  return{x:rect.left+(p.x/halfWidth*.5+.5)*rect.width,
   y:rect.bottom-bh+(.5-p.y/(top*2))*bh};
 }
 return Object.freeze({render,hit,move,down,up,pointFor,get drawn(){return drawn},
  get snapshot(){return{visible:visual.map(p=>({kind:p.kind,id:p.id,x:p.x,y:p.y})),
  count:opts.snapshot().count,stagedCharacterCards:visual.filter(p=>p.kind==='character').length,
  physicalBoxes:visual.filter(p=>p.kind==='deck').length,
  physicalDeckCards:opts.snapshot().classes.reduce((a,c)=>a+c.deckCount,0),
  geometry:'shared-battlefield-card-mesh',viewportPx:pxBand,
  hasDomCards:false}}});
}
root.PaperchalkSceneCardHUD=Object.freeze({version:'1.0.0',create});
})(window);
