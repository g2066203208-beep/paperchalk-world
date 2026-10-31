/* PAPERWORLD — four-ink bar interface v2.
 * A real pixel-rendered playable scene. Character and furniture are separate layers.
 * Layout is computed in logical Canvas pixels for portrait, landscape and desktop.
 * No external copyrighted sprites, no fifth colors, no blurred Canvas scaling.
 */
import {portraitLayers} from './intro.js';
import {HOSTESS_PNG} from './hostess-pixel.js';

export const BAR_ORDERS=Object.freeze([
 {name:'蓝铃汽泡',goal:[2,1,0],reward:18,order:'两份甜露，一份清泉。不要加苦草。',good:'旅人：正是这个味道。这里比街上安静多了。'},
 {name:'夜航茶',goal:[1,0,2],reward:26,order:'一份甜露，两份苦草。清泉不要。',good:'夜班客：不错。今夜总算有件顺心的事。'}
]);
const MATERIALS=['甜露','清泉','苦草'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function validMixture(counts,goal){
 return counts.length===goal.length&&counts.every((n,i)=>Number.isInteger(n)&&n===goal[i]);
}

// Exact panel rectangles in the SAME 2x logical coordinate system as menu.js.
// No panel intersects another. Header never overlays the painted character.
export function computeBarLayout(W,H){
 W=Math.max(1,Math.floor(W));H=Math.max(1,Math.floor(H));
 const narrow=W/H<.88;
 const headerH=Math.min(31,Math.max(23,Math.floor(H*.066)));
 const header={x:0,y:0,w:W,h:headerH};
 if(narrow){
  const sceneBottom=Math.max(headerH+65,Math.floor(H*.485));
  const dialogueH=Math.max(62,Math.floor(H*.205));
  const room={x:0,y:headerH,w:W,h:sceneBottom-headerH};
  const dialogue={x:0,y:sceneBottom,w:W,h:dialogueH};
  const mixer={x:0,y:sceneBottom+dialogueH,w:W,h:H-sceneBottom-dialogueH};
  return {mode:'portrait',header,room,dialogue,mixer};
 }
 const side=Math.min(Math.floor(W*.335),Math.max(133,Math.floor(W*.31)));
 const mainW=W-side;
 const available=H-headerH;
 const roomH=Math.floor(available*(H<270?.63:.695));
 return {mode:H<270?'landscape':'desktop',header,
  room:{x:0,y:headerH,w:mainW,h:roomH},
  dialogue:{x:0,y:headerH+roomH,w:mainW,h:available-roomH},
  mixer:{x:mainW,y:headerH,w:side,h:available}};
}

export function createBarScene({COL,R,poly,text,onBack,onIntro}){
 let active=false,clock=0,counts=[0,0,0],order=0,stage='greeting',line=0,cash=0,served=0;
 let art=null,failed=false,buttons=[],message='',lastLayout=null;
 const starter=['旅人：街上又下雨了。这里还营业吗？','老板娘：当然。先坐下，我给你调杯热乎的。'];
 const portrait=new Image();portrait.decoding='async';
 let fallback=false;
 portrait.onload=()=>{try{art=portraitLayers(portrait).clean}catch{failed=true}};
 portrait.onerror=()=>{if(!fallback){fallback=true;portrait.src=HOSTESS_PNG}else failed=true};
 portrait.src='./game/art/hostess-original-4ink.png?v=20261031-separated2';
 try{const save=JSON.parse(localStorage.getItem('paperworld-bar-v1')||'null');if(save){cash=save.cash|0;served=save.served|0}}catch{}
 const writeSave=()=>{try{localStorage.setItem('paperworld-bar-v1',JSON.stringify({cash,served}))}catch{}};
 function resetForNext(){
  counts=[0,0,0];order=served%BAR_ORDERS.length;stage='order';
  message='客人：'+BAR_ORDERS[order].order;
 }
 function enter(){active=true;clock=0;counts=[0,0,0];order=served%BAR_ORDERS.length;stage='greeting';line=0;message=starter[0]}
 function leave(){active=false}
 function update(dt){if(active)clock+=dt}
 const rect=(x,y,w,h,c)=>R(Math.round(x),Math.round(y),Math.max(0,Math.round(w)),Math.max(0,Math.round(h)),c);
 const caption=(v,x,y,size=12,c=COL.paper,align='left')=>text(String(v),Math.round(x),Math.round(y),Math.round(size),c,align);

 function drawButton(id,x,y,w,h,title,kind='normal',size=12){
  x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
  if(w<13||h<13)return;
  buttons.push({id,x,y,w,h});
  const fill=kind==='selected'?COL.pink:kind==='primary'?COL.blue:kind==='quiet'?COL.ink:COL.paper;
  const fg=kind==='quiet'?COL.paper:COL.ink;
  // One-pixel edges and a 2px lower shadow, not the old thick double frames.
  rect(x,y+2,w,h-2,COL.ink);
  rect(x,y,w,h-2,fill);
  if(kind!=='quiet'){
   rect(x,y,w,1,COL.ink);rect(x,y,1,h-2,COL.ink);
   rect(x+w-1,y,1,h-2,COL.ink);
  }
  caption(title,x+w/2,y+Math.max(2,Math.floor((h-size)/2)-1),size,fg,'center');
 }

 function header(p){
  const {w,h}=p;
  rect(0,0,w,h,COL.ink);
  rect(0,h-2,w,2,COL.blue);
  const bw=w<240?41:52,aux=w<240?43:56,hh=h-5;
  drawButton('back',5,2,bw,hh,'返回','quiet',w<240?10:12);
  drawButton('intro',w-aux-5,2,aux,hh,'序章','quiet',w<240?10:12);
  caption('蓝铃酒馆',w/2,Math.max(3,Math.floor((h-15)/2)),w<240?13:16,COL.paper,'center');
 }

 function scene(p,ctx){
  const {x,y,w,h}=p;
  rect(x,y,w,h,COL.ink);
  // Large calm wall and an intentional single window.
  const wx=x+Math.floor(w*.055),wy=y+Math.floor(h*.09);
  const ww=Math.floor(w*.275),wh=Math.floor(h*.37);
  rect(wx-2,wy-2,ww+4,wh+4,COL.blue);
  rect(wx,wy,ww,wh,COL.ink);
  rect(wx+Math.floor(ww*.49),wy,2,wh,COL.blue);
  rect(wx,wy+Math.floor(wh*.57),ww,2,COL.blue);
  // Distant apartment silhouettes: block groups, not noisy random pixels.
  for(let i=0;i<4;i++){
   const xx=wx+3+i*Math.floor((ww-7)/4);
   const v=wh*(.12+((i*7)%4)*.1);
   rect(xx,wy+wh-Math.floor(v),Math.max(2,Math.floor(ww*.115)),Math.floor(v),COL.pink);
  }
  // One restrained shelf and a three-bottle silhouette to the right.
  const shx=x+Math.floor(w*.74),shy=y+Math.floor(h*.39),sww=Math.floor(w*.205);
  rect(shx,shy,sww,3,COL.blue);
  for(let i=0;i<3;i++){
   const bw=Math.max(5,Math.floor(w*.027));
   const bx=shx+Math.floor(sww*(.13+i*.30));
   const body=Math.max(10,Math.floor(h*.115));
   rect(bx+Math.floor(bw*.3),shy-body-5,Math.max(2,Math.floor(bw*.45)),5,COL.blue);
   rect(bx,shy-body,bw,body,i===1?COL.pink:COL.paper);
  }
  // A small sign is kept INSIDE the architectural negative space, below the shelf.
  if(w>300)caption('BLUEBELL',shx+sww/2,y+Math.floor(h*.48),11,COL.pink,'center');

  // EXISTING original portrait — no replacement of approved face or clothing.
  const anchorX=x+Math.floor(w*.49),edgeY=y+Math.floor(h*.70);
  if(art){
   const pw=Math.floor(Math.min(w*.54,h*.78*192/140));
   const ph=Math.floor(pw*140/192);
   const bob=Math.round(Math.sin(clock*2.1));
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(art,0,0,192,140,anchorX-Math.floor(pw/2),edgeY-ph+bob,pw,ph);
  }else if(failed)caption('角色素材载入失败',anchorX,y+Math.floor(h*.39),11,COL.pink,'center');

  // Depth: rear edge of the counter, visible trapezoidal TOP, front apron.
  const rear=y+Math.floor(h*.68),front=y+Math.floor(h*.79);
  poly([[x+Math.floor(w*.09),rear],[x+Math.floor(w*.91),rear],
   [x+w-1,front],[x,front]],COL.blue);
  rect(x,front-1,w,3,COL.paper);
  rect(x,front+2,w,Math.max(0,y+h-front-2),COL.ink);
  rect(x+Math.floor(w*.05),front+Math.floor((y+h-front)*.51),Math.floor(w*.90),2,COL.pink);
  // Only useful foreground props. The clear cup reflects currently selected ingredients.
  const cupx=x+Math.floor(w*.72),cupy=rear-Math.floor(h*.08);
  rect(cupx+2,cupy-4,16,3,COL.paper);
  rect(cupx+4,cupy-1,12,Math.max(10,Math.floor(h*.115)),COL.paper);
  rect(cupx+6,cupy+4,8,Math.max(4,Math.floor(h*.05)),COL.pink);
  const sx=x+Math.floor(w*.16),sy=rear-Math.floor(h*.055);
  rect(sx,sy,Math.max(15,Math.floor(w*.10)),Math.max(10,Math.floor(h*.06)),COL.paper);
  rect(sx+2,sy+2,Math.max(11,Math.floor(w*.10)-4),3,COL.ink);
  // Ingredient chips appear on the tabletop only after actual input.
  for(let i=0;i<3;i++)for(let j=0;j<Math.min(counts[i],3);j++){
   rect(x+Math.floor(w*.54)+i*11+j*3,rear+4+i*3,2,2,i===0?COL.pink:i===1?COL.paper:COL.ink);
  }
 }

 function speech(p){
  const {x,y,w,h}=p;
  rect(x,y,w,h,COL.paper);
  rect(x,y,w,3,COL.blue);
  // One small speaker tab; all dialogue on a light field for legibility.
  const who=message.split('：')[0]||'客人';
  const chipW=clamp(w*.21,48,82);
  rect(x+8,y+8,chipW,19,COL.pink);
  caption(who,x+13,y+10,11,COL.ink);
  const actionable=stage==='greeting'||stage==='served';
  if(actionable){
   const nw=w<230?57:75;
   drawButton('next',x+w-nw-9,y+6,nw,27,stage==='served'?'下一位':'继续','primary',w<230?11:12);
  }else{
   caption(stage==='retry'?'配方未完成':'订单已记录',x+w-9,y+12,10,COL.ink,'right');
  }
  // Wrap by approximate logical glyph width; dialogue never intersects buttons.
  const compact=h<85;
  const font=w<230?11:compact?11:14;
  const maxChars=Math.max(10,Math.floor((w-25)/(font*.99)));
  const chars=[...message],lines=[];
  for(let i=0;i<chars.length;i+=maxChars)lines.push(chars.slice(i,i+maxChars).join(''));
  const top=y+(compact?28:41),lineH=font+(compact?3:5);
  const maxLines=Math.max(1,Math.floor((h-(top-y)-4)/lineH));
  lines.slice(0,Math.min(3,maxLines)).forEach((v,i)=>caption(v,x+11,top+i*lineH,font,COL.ink));
 }

 function mixing(p,portraitMode){
  const {x,y,w,h}=p;
  rect(x,y,w,h,COL.ink);
  if(!portraitMode)rect(x,y,3,h,COL.blue);
  else rect(x,y,w,2,COL.blue);
  const compact=!portraitMode&&h<250;
  const hd=portraitMode?11:compact?12:17;
  caption('调制台',x+10,y+8,hd,COL.paper);
  caption('◈ '+cash,x+w-12,y+8,portraitMode?11:compact?11:14,COL.pink,'right');
  const recipe=BAR_ORDERS[order];
  if(portraitMode){
   caption('当前订单 · '+recipe.name,x+10,y+27,11,COL.pink);
   const by=y+clamp(Math.floor(h*.35),34,48);
   const pad=8,gap=5,bw=Math.floor((w-2*pad-2*gap)/3);
   const bh=clamp(Math.floor(h*.245),23,34);
   MATERIALS.forEach((name,i)=>drawButton('m'+i,x+pad+i*(bw+gap),by,bw,bh,name+' '+counts[i],
    counts[i]>0?'selected':'normal',10));
   const actionY=y+h-36,aw=Math.floor((w-3*pad)/2);
   drawButton('reset',x+pad,actionY,aw,30,'清空','quiet',12);
   drawButton('mix',x+2*pad+aw,actionY,aw,30,'调制饮品','primary',12);
   return;
  }
  caption('订单 / '+recipe.name,x+10,y+(compact?26:44),compact?11:14,COL.pink);
  if(!compact){
   caption('材料配比',x+10,y+70,11,COL.blue);
   const needed=recipe.goal.map((n,i)=>MATERIALS[i]+n).filter(s=>!s.endsWith('0'));
   needed.forEach((v,i)=>caption(v,x+10+i*Math.floor((w-20)/needed.length),y+91,11,COL.paper));
  }
  const start=y+(compact?43:clamp(Math.floor(h*.30),108,150));
  const step=compact?Math.max(26,Math.floor((h-84)/3)):clamp(Math.floor(h*.16),50,66);
  const gap=compact?4:9,bh=Math.min(compact?27:53,step-gap);
  MATERIALS.forEach((name,i)=>drawButton('m'+i,x+10,start+i*step,w-20,bh,
    name+'   × '+counts[i],counts[i]>0?'selected':'normal',compact?11:14));
  if(!compact&&h>=310){
   const fy=y+h-100;
   rect(x+10,fy,w-20,40,COL.blue);
   caption('杯中材料  '+counts.reduce((a,b)=>a+b,0)+' / 5',x+18,fy+12,12,COL.ink);
  }
  const ay=y+h-(compact?36:46),gapActions=8,aw=Math.floor((w-28-gapActions)/2);
  drawButton('reset',x+10,ay,aw,compact?29:37,'清空','quiet',compact?11:13);
  drawButton('mix',x+18+aw,ay,aw,compact?29:37,'调制','primary',compact?11:13);
 }

 function draw(ctx,W,H){
  if(!active)return;
  buttons=[];
  lastLayout=computeBarLayout(W,H);
  R(0,0,W,H,COL.ink);
  // Paint order is intentional: scene, speech, mixing, shared top bar.
  scene(lastLayout.room,ctx);
  speech(lastLayout.dialogue);
  mixing(lastLayout.mixer,lastLayout.mode==='portrait');
  header(lastLayout.header);
 }
 function tap(x,y){
  if(!active)return false;
  const b=[...buttons].reverse().find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
  if(!b)return false;
  if(b.id==='back'){onBack?.();return true}
  if(b.id==='intro'){onIntro?.();return true}
  if(b.id==='next'){
   if(stage==='greeting'){line++;if(line<starter.length)message=starter[line];else resetForNext()}
   else if(stage==='served')resetForNext();
   return true;
  }
  if(/^m[0-2]$/.test(b.id)){
   if(stage==='served')return true;
   if(stage==='greeting')resetForNext();
   counts[Number(b.id[1])]=clamp(counts[Number(b.id[1])]+1,0,5);
   stage='order';return true;
  }
  if(b.id==='reset'){if(stage==='served')return true;counts=[0,0,0];if(stage==='retry')stage='order';return true}
  if(b.id==='mix'){
   if(stage==='served')return true;
   const recipe=BAR_ORDERS[order];
   if(validMixture(counts,recipe.goal)){
    stage='served';served++;cash+=recipe.reward;message=recipe.good;writeSave();
   }else{stage='retry';message='客人：这杯不太对。检查一下材料比例吧。'}
   return true;
  }
  return false;
 }
 function snapshot(){
  return {active,stage,line,order,counts:[...counts],target:[...BAR_ORDERS[order].goal],
   cash,served,portraitReady:!!art,layout:lastLayout,
   buttons:buttons.map(b=>({...b}))};
 }
 return {enter,leave,update,draw,tap,snapshot};
}
