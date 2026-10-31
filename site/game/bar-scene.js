/* PAPERWORLD | original four-ink counter scene, inspired by dialogue-driven bar games.
 * No third-party game art, sprites, palettes, or recipes are included.
 * Each visible shape is an integer-pixel cluster in the game's exact four inks.
 */
import {portraitLayers} from './intro.js';
import {HOSTESS_PNG} from './hostess-pixel.js';
export const BAR_ORDERS=Object.freeze([
 {name:'蓝铃汽泡',goal:[2,1,0],reward:18,order:'两份甜露，一份清泉。不要加苦草。',good:'旅人：正是这个味道。这里比街上安静多了。'},
 {name:'夜航茶',goal:[1,0,2],reward:26,order:'一份甜露，两份苦草。清泉不要。',good:'夜班客：不错。今夜总算有件顺心的事。'}
]);
const MATERIALS=['甜露','清泉','苦草'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function validMixture(counts,goal){return counts.length===goal.length&&counts.every((n,i)=>Number.isInteger(n)&&n===goal[i]);}
export function createBarScene({COL,R,poly,text,onBack,onIntro}){
 let active=false,clock=0,counts=[0,0,0],order=0,stage='greeting',line=0,cash=0,served=0;
 let art=null,failed=false,buttons=[],message='';
 const starter=['旅人：街上又下雨了。这里还营业吗？','老板娘：当然。先坐下，我给你调杯热乎的。'];
 const portrait=new Image();portrait.decoding='async';
 let fallback=false;
 portrait.onload=()=>{try{art=portraitLayers(portrait).clean}catch{failed=true}};
 portrait.onerror=()=>{if(!fallback){fallback=true;portrait.src=HOSTESS_PNG}else failed=true};
 portrait.src='./game/art/hostess-original-4ink.png?v=20261031-separated2';
 try{const save=JSON.parse(localStorage.getItem('paperworld-bar-v1')||'null');if(save){cash=save.cash|0;served=save.served|0}}catch{}
 const writeSave=()=>{try{localStorage.setItem('paperworld-bar-v1',JSON.stringify({cash,served}))}catch{}};
 function resetForNext(){counts=[0,0,0];order=served%BAR_ORDERS.length;stage='order';message='客人：'+BAR_ORDERS[order].order}
 function enter(){active=true;clock=0;counts=[0,0,0];order=served%BAR_ORDERS.length;stage='greeting';line=0;message=starter[0]}
 function leave(){active=false}
 function update(dt){if(active)clock+=dt}
 function addButton(id,x,y,w,h,title,kind='normal'){
  if(w<8||h<8)return;
  buttons.push({id,x,y,w,h});
  R(x,y,w,h,COL.paper);
  R(x+2,y+2,w-4,h-4,kind==='selected'?COL.pink:kind==='primary'?COL.blue:COL.ink);
  text(title,x+w/2,y+Math.max(3,Math.floor((h-12)/2)),Math.min(12,Math.max(9,Math.floor(h*.34))),kind==='selected'?COL.ink:COL.paper);
 }
 function caption(t,x,y,size=12,c=COL.paper,align='left'){text(t,Math.round(x),Math.round(y),size,c,align)}
 function rect(x,y,w,h,c){R(Math.round(x),Math.round(y),Math.round(w),Math.round(h),c)}
 function room(x,y,w,h){
  // Framed scene, rainy window, shelves and major silhouettes — no micro-noise.
  rect(x,y,w,h,COL.ink);rect(x+2,y+2,w-4,h-4,COL.ink);
  const windowX=x+Math.floor(w*.055),windowY=y+Math.floor(h*.115),
        winW=Math.floor(w*.33),winH=Math.floor(h*.34);
  rect(windowX-3,windowY-3,winW+6,winH+6,COL.blue);
  rect(windowX,windowY,winW,winH,COL.ink);
  rect(windowX+Math.floor(winW*.51),windowY,3,winH,COL.blue);
  rect(windowX,windowY+Math.floor(winH*.57),winW,3,COL.blue);
  for(let i=0;i<8;i++){
   const rx=windowX+5+(i*17)%Math.max(6,winW-12);
   const rh=4+(i*7)%Math.max(5,Math.floor(winH*.35));
   rect(rx,windowY+winH-rh-3,Math.max(3,Math.floor(winW*.07)),rh,COL.pink);
  }
  // Pixel neon wall signage and one shelf; sparse objects support the scene.
  rect(x+Math.floor(w*.65),y+Math.floor(h*.13),Math.floor(w*.25),3,COL.pink);
  caption('BLUEBELL',x+Math.floor(w*.775),y+Math.floor(h*.18),Math.max(8,Math.min(13,w*.025)),COL.paper,'center');
  rect(x+Math.floor(w*.67),y+Math.floor(h*.38),Math.floor(w*.22),4,COL.blue);
  for(let i=0;i<3;i++){
   const bx=x+Math.floor(w*(.695+i*.066));
   const by=y+Math.floor(h*.26);
   rect(bx+3,by-5,7,7,COL.blue);rect(bx,by+1,13,Math.floor(h*.105),i===1?COL.pink:COL.paper);
   rect(bx+3,by+5,7,4,COL.ink);
  }
  // Existing portrait sprite is individually composited, cropped by the counter.
  if(art){
   const pw=Math.min(Math.floor(w*.45),Math.floor(h*.63*192/140));
   const ph=Math.floor(pw*140/192);
   const bob=Math.round(Math.sin(clock*2.1));
   const px=x+Math.floor(w*.48)-Math.floor(pw/2),py=y+Math.floor(h*.60)-ph+bob;
   const cv=document.getElementById('menu').getContext('2d');cv.imageSmoothingEnabled=false;
   cv.drawImage(art,0,0,192,140,px,py,pw,ph);
  }else if(failed)caption('立绘载入失败',x+w*.5,y+h*.35,12,COL.pink,'center');
  // Real, readable TOP PLANE: narrow back edge, wider near edge.
  poly([[x+Math.floor(w*.08),y+Math.floor(h*.58)],[x+Math.floor(w*.92),y+Math.floor(h*.58)],
   [x+w-1,y+Math.floor(h*.70)],[x,y+Math.floor(h*.70)]],COL.blue);
  poly([[x+2,y+Math.floor(h*.70)],[x+w-3,y+Math.floor(h*.70)],
   [x+Math.floor(w*.95),y+h-3],[x+Math.floor(w*.05),y+h-3]],COL.ink);
  rect(x+1,y+Math.floor(h*.70),w-2,3,COL.paper);
  rect(x+Math.floor(w*.06),y+Math.floor(h*.85),Math.floor(w*.88),3,COL.pink);
  // Only two deliberate counter props: a glass and a small order terminal.
  const cx=x+Math.floor(w*.72),cy=y+Math.floor(h*.595);
  rect(cx+2,cy-16,18,4,COL.paper);rect(cx+4,cy-12,14,13,COL.paper);
  rect(cx+6,cy-10,10,8,COL.pink);
  rect(x+Math.floor(w*.14),cy-9,Math.floor(w*.12),15,COL.ink);
  rect(x+Math.floor(w*.14)+2,cy-7,Math.max(7,Math.floor(w*.12)-4),10,COL.paper);
  caption('蓝铃酒馆',x+Math.floor(w*.5),y+Math.floor(h*.80),Math.max(9,Math.min(13,h*.045)),COL.pink,'center');
 }
 function mixer(x,y,w,h,vertical){
  rect(x,y,w,h,COL.ink);
  rect(x+2,y+2,w-4,3,COL.blue);
  const small=vertical?10:12;
  caption('饮品调制',x+9,y+9,vertical?11:15,COL.paper);
  caption('◈ '+cash,x+w-12,y+9,vertical?10:12,COL.pink,'right');
  const current=BAR_ORDERS[order];
  caption('订单 / '+current.name,x+9,y+(vertical?26:39),small,COL.pink);
  caption('配方 '+current.goal.map((n,i)=>MATERIALS[i]+n).join('  '),x+9,y+(vertical?40:56),vertical?9:10,COL.paper);
  if(vertical){
   const gap=5,bw=Math.floor((w-24-gap*2)/3),by=y+57,bh=Math.max(23,Math.min(34,h*.27));
   MATERIALS.forEach((n,i)=>addButton('m'+i,x+9+i*(bw+gap),by,bw,bh,n+' '+counts[i],counts[i]?'selected':'normal'));
   const ay=y+h-31,aw=Math.floor((w-24)/2);
   addButton('reset',x+9,ay,aw,25,'清空');
   addButton('mix',x+15+aw,ay,aw,25,'调制','primary');
  }else{
   let by=y+Math.floor(h*.26),bh=Math.max(27,Math.floor(h*.105));
   MATERIALS.forEach((n,i)=>addButton('m'+i,x+10,by+i*(bh+7),w-20,bh,n+' × '+counts[i],counts[i]?'selected':'normal'));
   const ay=y+h-44,aw=Math.floor((w-30)/2);
   addButton('reset',x+10,ay,aw,32,'清空');
   addButton('mix',x+20+aw,ay,aw,32,'调制','primary');
  }
 }
 function dialogue(x,y,w,h,vertical){
  rect(x,y,w,h,COL.ink);rect(x+2,y+2,w-4,3,COL.blue);
  const speaker=stage==='greeting'?'营业日志':stage==='served'?'好评':stage==='retry'?'配方有误':'顾客订单';
  rect(x+8,y+9,Math.min(w*.26,80),21,COL.pink);
  caption(speaker,x+13,y+12,11,COL.ink);
  const compact=!vertical&&h<90,actionWidth=(stage==='greeting'||stage==='served')?(vertical?58:91):0;
  const glyphWidth=vertical?12.2:compact?10.8:13.3;
  const lines=[],maxChars=Math.max(8,Math.floor((w-22-actionWidth)/glyphWidth));
  for(let i=0;i<[...message].length;i+=maxChars)lines.push([...message].slice(i,i+maxChars).join(''));
  for(let i=0;i<Math.min(lines.length,vertical?2:3);i++)
   caption(lines[i],x+10,y+(vertical?37:39)+i*(compact?14:17),vertical?11:compact?10:13,COL.paper);
  if(stage==='greeting'||stage==='served'){
   const bw=vertical?58:91,bh=25;
   addButton('next',x+w-bw-9,y+h-bh-8,bw,bh,stage==='served'?'下一位':'继续','primary');
  }else{
   caption(stage==='retry'?'清空材料再试一次':'点击右侧材料，然后调制',x+10,y+h-19,vertical?9:11,COL.blue);
  }
 }
 function draw(ctx,W,H){
  if(!active)return;
  buttons=[];
  R(0,0,W,H,COL.ink);
  const portrait=W/H<1.2;
  if(portrait){
   const sh=Math.floor(H*.45),dh=Math.max(96,Math.floor(H*.20)),mh=H-sh-dh;
   room(0,0,W,sh);mixer(0,sh,W,mh,true);dialogue(0,H-dh,W,dh,true);
  }else{
   const rw=Math.floor(W*.635),dh=Math.max(72,Math.floor(H*.255));
   room(0,0,rw,H-dh);dialogue(0,H-dh,rw,dh,false);mixer(rw,0,W-rw,H,false);
  }
  addButton('back',6,6,Math.min(64,Math.floor(W*.16)),22,'返回');
  addButton('intro',Math.floor(W*(portrait?.77:.51)),6,Math.min(78,Math.floor(W*.21)),22,'旧序章');
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
   if(stage==='greeting'){resetForNext()}
   if(stage==='served'){resetForNext()}
   counts[Number(b.id[1])]=clamp(counts[Number(b.id[1])]+1,0,5);
   stage='order';return true;
  }
  if(b.id==='reset'){counts=[0,0,0];if(stage==='retry')stage='order';return true}
  if(b.id==='mix'){
   if(stage==='served')return true;
   const recipe=BAR_ORDERS[order];
   if(validMixture(counts,recipe.goal)){
    stage='served';served++;cash+=recipe.reward;message=recipe.good;writeSave()
   }else{stage='retry';message='客人：这杯不太对。检查一下材料比例吧。'}
   return true;
  }
  return false;
 }
 function snapshot(){return {active,stage,line,order,counts:[...counts],target:[...BAR_ORDERS[order].goal],cash,served,portraitReady:!!art,buttons:buttons.map(b=>({id:b.id,x:b.x,y:b.y,w:b.w,h:b.h}))}}
 return {enter,leave,update,draw,tap,snapshot};
}
