/* Browser-only presentation of deterministic combat events.
 * All card artwork stays untouched. One crisp diagonal slash, brief sparks,
 * damage numerals and readable enemy intents. No global shake or blur pass.
 */
(function(root){'use strict';
function create({canvas,fxCanvas,intentsLayer,numbersLayer,project,cardFor}){
 const ctx=fxCanvas.getContext('2d',{alpha:true});
 const labels=new Map();let dirty=false,frameWidth=0,frameHeight=0;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 // Enemy actions and intent predictions are deliberately never displayed.
 // The enemy turn still resolves normally with its physical card attack FX.
 function sync(){
  if(labels.size){for(const node of labels.values())node.remove();labels.clear();}
  if(intentsLayer?.childElementCount)intentsLayer.replaceChildren();
 }
 function resize(){
  const rect=fxCanvas.getBoundingClientRect();
  const ratio=Math.min(2,window.devicePixelRatio||1);
  const dw=Math.max(1,Math.round(rect.width*ratio)),dh=Math.max(1,Math.round(rect.height*ratio));
  if(fxCanvas.width!==dw||fxCanvas.height!==dh){
   fxCanvas.width=dw;fxCanvas.height=dh;
   frameWidth=rect.width;frameHeight=rect.height;
   dirty=false;
  }
  ctx.setTransform(ratio,0,0,ratio,0,0);
  return {width:rect.width,height:rect.height};
 }
 function hit(targetId,damage,blocked=0){
  const card=cardFor(targetId);if(!card)return;
  const at=project(card.x,card.y+.1,card.z);
  const element=document.createElement('div');
  element.className='hit-number'+(!damage?' blocked':'');
  element.style.left=at.x+'px';element.style.top=at.y+'px';
  element.textContent=damage?'−'+damage:blocked?'格挡 '+blocked:'未命中';
  numbersLayer.append(element);
  element.addEventListener('animationend',()=>element.remove(),{once:true});
  setTimeout(()=>element.remove(),850);
 }
 function guard(targetId,amount){
  const card=cardFor(targetId);if(!card)return;
  const at=project(card.x,card.y+.1,card.z);
  const el=document.createElement('div');el.className='hit-number blocked';
  el.style.left=at.x+'px';el.style.top=at.y+'px';el.textContent='+'+amount+' 护盾';
  numbersLayer.append(el);el.addEventListener('animationend',()=>el.remove(),{once:true});
  setTimeout(()=>el.remove(),850);
 }
 function frame(time,visible){
  const rect=resize();
  if(!visible){if(dirty){ctx.clearRect(0,0,rect.width,rect.height);dirty=false;}return;}
  dirty=true;
  ctx.clearRect(0,0,rect.width,rect.height);
  const p=project(visible.to.x,visible.to.y+.3,visible.to.z);
  const width=clamp(rect.width*.055,34,115);
  const alpha=clamp(visible.alpha,0,1);
  if(alpha<=.002)return;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.78);
  // Short diagonal tear with two broken edge echoes and precise hard center.
  ctx.globalAlpha=alpha*.36;
  ctx.strokeStyle='#dfb66d';ctx.lineWidth=12;ctx.lineCap='butt';
  ctx.beginPath();ctx.moveTo(-width*.59,1);ctx.lineTo(width*.58,1);ctx.stroke();
  ctx.globalAlpha=alpha;ctx.strokeStyle='#fff9e9';ctx.lineWidth=3.2;
  ctx.beginPath();ctx.moveTo(-width*.56,0);ctx.lineTo(width*.61,0);ctx.stroke();
  ctx.globalAlpha=alpha*.85;ctx.strokeStyle='#9a7643';ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(-width*.48,-6);ctx.lineTo(-width*.13,-6);
  ctx.moveTo(width*.03,-6);ctx.lineTo(width*.39,-6);ctx.stroke();
  ctx.globalAlpha=alpha*.50;ctx.strokeStyle='#e7debf';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(-width*.36,7);ctx.lineTo(-width*.09,7);
  ctx.moveTo(width*.09,7);ctx.lineTo(width*.31,7);ctx.stroke();
  ctx.restore();
  // Brief scattering wood-dust specks; deterministic across frames.
  ctx.save();ctx.globalAlpha=alpha*.80;ctx.fillStyle='#ffe8b4';
  for(let i=0;i<8;i++){
   const angle=i*2.399,travel=visible.age*width*(.22+i%3*.075);
   const x=p.x+Math.cos(angle)*travel,y=p.y+Math.sin(angle)*travel*.62;
   const sz=1+(i%3)*.55;
   ctx.fillRect(x,y,sz,sz);
  }
  ctx.restore();
 }
 function reset(){
  for(const node of labels.values())node.remove();labels.clear();
  numbersLayer.replaceChildren();
  ctx.clearRect(0,0,fxCanvas.width,fxCanvas.height);dirty=false;
 }
 return Object.freeze({sync,hit,guard,frame,reset,
  get snapshot(){return{intentLabels:labels.size,fxActive:dirty,frameWidth,frameHeight};}});
}
root.PaperchalkCombatFeedback=Object.freeze({version:'1.1.0',create});
})(window);
