import {createHostessIntro} from './intro.js';
import {createLeaseUI} from './lease.js';
import {createWorld3D} from './world3d.js';

/* PAPERWORLD · original four-ink procedural pixel menu.
 * Every visible logo, plane, cloud, glyph, button and outline is
 * drawn at an integer logical pixel. No generated image is used at runtime.
 */
const COL={ink:'#393657',pink:'#F2A5C2',blue:'#A9BAE9',paper:'#FFF5E6'};
const ORDER=['开始游戏','继续游戏','3D体感世界','设置','退出游戏'];
const KEY='paperworld-menu-v3',SAVE='paperworld-journey-v1';
const el=document.getElementById('menu'), bg=document.getElementById('background');
const nativeLabels=document.getElementById('pw-menu-labels');
// Native form controls sit above the game canvas. Preserve the same clean
// touch feedback there, without stealing focus from Chinese text inputs.
const uiTouchFx=document.getElementById('pw-ui-touch-fx');
addEventListener('pointerdown',e=>{
 if(!uiTouchFx||!prefs.particles||reduced||!e.target.closest?.('#pw-lease,#pw-dialogue'))return;
 for(let i=0;i<7;i++){
  const spark=document.createElement('span');spark.className='pw-touch-spark';
  const size=i%3===0?6:4,theta=Math.random()*Math.PI*2,dist=10+Math.random()*15;
  spark.style.width=size+'px';spark.style.height=size+'px';
  spark.style.left=Math.round(e.clientX-size/2)+'px';
  spark.style.top=Math.round(e.clientY-size/2)+'px';
  spark.style.background=i%2?'#393657':'#F2A5C2';
  uiTouchFx.appendChild(spark);
  requestAnimationFrame(()=>{spark.style.transform='translate3d('+Math.round(Math.cos(theta)*dist)+'px,'+Math.round(Math.sin(theta)*dist)+'px,0)'});
  setTimeout(()=>spark.remove(),320);
 }
});

const ctx=el.getContext('2d',{alpha:true,willReadFrequently:false});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let prefs={motion:!reduced,particles:!reduced,haptic:true};
try{prefs={...prefs,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{}
if(reduced)prefs.motion=false;
let W=0,H=0,scale=2,land=false,btns=[],state='menu',selected=0,hover=-1,held=-1;
let frameN=0,clock=0,last=0,saveExists=false,touchBursts=[],touchSerial=0,lastTouch=null;
let note='',noteTo=0,curtain=null;
try{saveExists=localStorage.getItem(SAVE)==='created'}catch{}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const F={A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],0:['01110','10011','10101','10101','11001','10001','01110'],1:['00100','01100','00100','00100','00100','00100','01110'],2:['01110','10001','00001','00110','01000','10000','11111'],3:['11110','00001','00001','01110','00001','00001','11110'],'.':['00000','00000','00000','00000','00000','01100','01100'],':':['00000','01100','01100','00000','01100','01100','00000'],'-':['00000','00000','00000','11111','00000','00000','00000']};
const R=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.max(0,Math.round(w)),Math.max(0,Math.round(h)))};
function panel(x,y,w,h,c,cut=5){x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);cut=Math.min(cut,Math.floor(h/4));R(x+cut,y,w-2*cut,h,c);R(x,y+cut,w,h-2*cut,c);R(x+1,y+cut-2,w-2,h-2*cut+4,c)}
function frame(x,y,w,h,outer,inner,cut=5,b=2){panel(x,y,w,h,outer,cut);panel(x+b,y+b,w-2*b,h-2*b,inner,Math.max(1,cut-b))}
function point(x,y,s=2,c=COL.ink){R(x-s/2,y-s/2,s,s,c)}
function line(x1,y1,x2,y2,c,w=1){
 x1=Math.round(x1);y1=Math.round(y1);x2=Math.round(x2);y2=Math.round(y2);
 const dx=Math.abs(x2-x1),sx=x1<x2?1:-1,dy=-Math.abs(y2-y1),sy=y1<y2?1:-1;let e=dx+dy;
 for(let n=0;n<3000;n++){R(x1-Math.floor(w/2),y1-Math.floor(w/2),w,w,c);if(x1===x2&&y1===y2)break;const q=2*e;if(q>=dy){e+=dy;x1+=sx}if(q<=dx){e+=dx;y1+=sy}}
}
function poly(verts,c){ // Scanline pixel polygon: no browser vector antialiasing.
 const yy=verts.map(p=>p[1]),yMin=Math.floor(Math.min(...yy)),yMax=Math.ceil(Math.max(...yy));
 for(let y=yMin;y<yMax;y++){
  const xx=[];const scan=y+.5;
  for(let i=0;i<verts.length;i++){const a=verts[i],b=verts[(i+1)%verts.length];if((a[1]<=scan&&b[1]>scan)||(b[1]<=scan&&a[1]>scan))xx.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]))}
  xx.sort((a,b)=>a-b);for(let i=0;i+1<xx.length;i+=2)R(Math.ceil(xx[i]),y,Math.floor(xx[i+1])-Math.ceil(xx[i])+1,1,c)
 }
}
function cloud(x,y,w,h,seed=0){ // Pixel-edged layered cloud silhouette
 const p=[[x-w*.5,y+h*.10],[x-w*.46,y-h*.18],[x-w*.34,y-h*.26],[x-w*.27,y-h*.45],[x-w*.13,y-h*.47],[x-w*.05,y-h*.32],[x+w*.10,y-h*.54],[x+w*.29,y-h*.49],[x+w*.35,y-h*.27],[x+w*.48,y-h*.16],[x+w*.51,y+h*.20],[x+w*.40,y+h*.40],[x-w*.40,y+h*.40]];
 poly(p,COL.ink);poly(p.map(v=>[x+(v[0]-x)*.95,y+(v[1]-y)*.86-1]),COL.paper);
 for(let i=0;i<5;i++){const dx=(-.31+i*.16)*w,top=(i%2===0?-.18:-.07)*h;R(x+dx,y+top,Math.max(2,w*.09),2,i%2?COL.blue:COL.pink)}
}
function plane(x,y,size,bob=0){const s=size/100;const tx=v=>Math.round(x+v*s),ty=v=>Math.round(y+(v+bob)*s);
 const a=[[tx(-47),ty(12)],[tx(44),ty(-31)],[tx(17),ty(38)],[tx(0),ty(12)],[tx(-14),ty(33)]];
 poly(a,COL.ink);
 const b=[[tx(-39),ty(11)],[tx(37),ty(-24)],[tx(9),ty(7)],[tx(0),ty(23)],[tx(-11),ty(14)]];
 poly(b,COL.paper);
 poly([[tx(-10),ty(14)],[tx(37),ty(-24)],[tx(1),ty(11)],[tx(8),ty(31)]],COL.pink);
 line(tx(-38),ty(10),tx(37),ty(-24),COL.ink,1);
 line(tx(1),ty(11),tx(8),ty(31),COL.ink,1);
 line(tx(-10),ty(14),tx(8),ty(31),COL.ink,1);
}
function latin(text,x,y,zoom=2,fill=COL.paper){
 const chars=[...text.toUpperCase()],cw=6*zoom,w=chars.length*cw-zoom;x=Math.round(x-w/2);
 for(let ci=0;ci<chars.length;ci++){const glyph=F[chars[ci]];if(!glyph)continue;
  for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(glyph[row][col]==='1')R(x+ci*cw+col*zoom,y+row*zoom,zoom,zoom,fill)}
 return w;
}
const textCache=new Map();
function glyphBitmap(s,height=17){
 const key=s+'|'+height;
 if(textCache.has(key))return textCache.get(key);
 const c=document.createElement('canvas'),g=c.getContext('2d',{willReadFrequently:true});
 // Render glyphs at the FINAL logical size, without any downsampling.
 // Threshold alpha to produce exact one-bit pixels instead of blurry edges.
 const font='700 '+height+'px "Noto Sans CJK SC","Microsoft YaHei","PingFang SC",sans-serif';
 g.font=font;const bounds=g.measureText(s);
 const ww=Math.ceil(bounds.width+height*.6+4),hh=Math.ceil(height*1.55+4);
 c.width=ww;c.height=hh;g.font=font;g.fillStyle='#000';g.textBaseline='top';g.fillText(s,2,0);
 const data=g.getImageData(0,0,ww,hh).data;
 let minX=ww,minY=hh,maxX=-1,maxY=-1;const coords=[];
 for(let y=0;y<hh;y++)for(let x=0;x<ww;x++){
   if(data[(y*ww+x)*4+3]>=120){coords.push([x,y]);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
 }
 const sprite={w:Math.max(0,maxX-minX+1),h:Math.max(0,maxY-minY+1),cols:coords.map(q=>[q[0]-minX,q[1]-minY])};
 textCache.set(key,sprite);return sprite;
}
function text(s,x,y,h=13,c=COL.ink,align='center'){
 const b=glyphBitmap(s,h);let px=Math.round(x);if(align==='center')px-=Math.floor(b.w/2);else if(align==='right')px-=b.w;
 for(const q of b.cols)R(px+q[0],Math.round(y)+q[1],1,1,c);
}
function buttonIcon(kind,x,y,sz=13,c=COL.ink){
 x=Math.round(x);y=Math.round(y);let q=Math.max(1,Math.floor(sz/10));
 if(kind==='play'){poly([[x-4*q,y-5*q],[x+5*q,y],[x-4*q,y+5*q]],c)}
 if(kind==='continue'){frame(x-6*q,y-3*q,12*q,9*q,c,COL.paper,2*q,1*q);R(x-5*q,y-5*q,5*q,2*q,c)}
 if(kind==='gear'){R(x-3*q,y-3*q,6*q,6*q,c);R(x-1*q,y-5*q,2*q,10*q,c);R(x-5*q,y-1*q,10*q,2*q,c);R(x-q,y-q,2*q,2*q,COL.paper)}
 if(kind==='exit'){frame(x-6*q,y-5*q,7*q,10*q,c,COL.paper,2*q,q);poly([[x-1*q,y-2*q],[x+7*q,y],[x-1*q,y+3*q]],c)}
 if(kind==='world'){frame(x-5*q,y-4*q,10*q,9*q,c,COL.paper,2*q,q);R(x-2*q,y-2*q,4*q,4*q,c)}
 if(kind==='back'){poly([[x-6*q,y],[x+2*q,y-5*q],[x+2*q,y+5*q]],c)}
}
function layout(){
 const sw=innerWidth,sh=innerHeight;
 scale=2;
 W=Math.max(1,Math.ceil(sw/scale));H=Math.max(1,Math.ceil(sh/scale));land=W/H>1.25;
 el.width=W;el.height=H;el.style.width=(W*scale)+'px';el.style.height=(H*scale)+'px';ctx.imageSmoothingEnabled=false;
 buttons();
}
function buttons(){
 if(state==='intro'||state==='lease'||state==='world'){btns=[];updateNativeLabels();return}
 btns=[];const names=state==='menu'?ORDER:state==='settings'?['背景动画','点击粒子','触感反馈','返回菜单']:state==='play'?['返回菜单']:['返回菜单'];
 let bw,bh,gap,cx,top;
 if(land){bw=Math.round(clamp(W*.42,130,195));bh=Math.round(clamp(H*.16,24,31));gap=8;cx=Math.round(W*.75);top=Math.round((H-(names.length*bh+(names.length-1)*gap))/2)}
 else{bw=Math.round(clamp(W*.81,132,230));bh=Math.round(clamp(H*.078,28,37));gap=Math.round(clamp(H*.023,7,12));cx=Math.round(W*.5);top=Math.round(clamp(H*.48,155,H-(names.length*(bh+gap)+33)))}
 for(let i=0;i<names.length;i++)btns.push({label:names[i],x:cx-bw/2,y:top+i*(bh+gap),w:bw,h:bh,index:i});
 updateNativeLabels();
}
function updateNativeLabels(){
 if(!nativeLabels)return;
 nativeLabels.replaceChildren();
 if(state==='intro'||state==='lease'||state==='world')return;
 for(let i=0;i<btns.length;i++){
  const b=btns[i],label=document.createElement('span');
  label.className='pw-menu-label';
  let words=b.label;
  if(state==='settings'&&i<3)words+=' · '+(i===0?(prefs.motion?'开':'关'):i===1?(prefs.particles?'开':'关'):(prefs.haptic?'开':'关'));
  label.textContent=words;
  label.style.left=Math.round((b.x+b.w*.58)*2)+'px';
  label.style.top=Math.round((b.y+b.h*.51)*2)+'px';
  nativeLabels.appendChild(label);
 }
}
function titleArtwork(){
 const cx=Math.round(land?W*.28:W*.5),by=Math.round(land?H*.49:H*.265);
 const size=land?Math.min(W*.38,H*.75):Math.min(W*.89,H*.31);
 cloud(cx,by+10,size*.98,size*.25);
 if(!reduced&&prefs.motion){const bob=Math.sin(clock*1.3)*2;
  plane(cx+size*.035,by-size*.55,size*.6,bob);
 }else plane(cx+size*.035,by-size*.55,size*.6);
 const zoom=Math.max(2,Math.floor((land?size:W-14)/(10*6)));
 const wordW=10*6*zoom-zoom,wordY=Math.round(by-size*.08);
 panel(cx-wordW/2-7,wordY-6,wordW+14,7*zoom+13,COL.ink,4);
 latin('PAPERWORLD',cx,wordY,zoom,COL.paper);

}
function drawButton(b,i){
 const active=i===hover||i===selected,pressed=i===held,disabled=state==='menu'&&i===1&&!saveExists;
 const dy=pressed?2:0,x=b.x,y=b.y+dy,w=b.w,h=b.h;
 const highlight=state==='menu'?i===0:active;
 const fill=highlight?COL.pink:COL.paper;
 const offset=active?3:2;
 panel(x+2,y+offset,w,h,COL.blue,5);
 frame(x,y,w,h,COL.ink,fill,5,2);
 if(active&&!disabled){R(x+3,y+8,2,h-16,COL.paper);R(x+w-5,y+8,2,h-16,COL.paper)}
 if(!nativeLabels){
  let label=b.label;
  if(state==='settings'&&i<3)label+=' '+(i===0?(prefs.motion?'开':'关'):i===1?(prefs.particles?'开':'关'):(prefs.haptic?'开':'关'));
  let hFont=Math.round(clamp(h*.61,16,21));
  let sprite=glyphBitmap(label,hFont);
  while(sprite.w>w*.72&&hFont>13){hFont--;sprite=glyphBitmap(label,hFont)}
  text(label,x+w*.58,y+(h-sprite.h)/2,hFont,COL.ink);
 }
 buttonIcon(state==='menu'?['play','continue','gear','exit'][i]:'back',x+w*.17,y+h*.5,Math.round(h*.36),COL.ink);
 if(disabled){ // Do not pretend "Continue" works without an actual stored start.
  R(x+w-20,y+h-8,2,2,COL.blue)
 }
}
function overlay(){
 if(state==='menu')return;
 R(0,0,W,H,COL.ink);
 const centerX=W/2,top=land?H*.13:H*.18;
 cloud(centerX,top+21,Math.min(W*.78,180),35);
 if(state==='play'){
  plane(centerX,top-13,Math.min(W*.36,84),prefs.motion?Math.sin(clock*1.8)*3:0);
  latin('CHAPTER 01',centerX,top+35,2,COL.paper);
  text('新的旅程',centerX,top+62,17,COL.pink);
  text('序章内容即将加入',centerX,top+86,12,COL.paper);
 }else if(state==='settings'){
  latin('SETTINGS',centerX,top+37,2,COL.paper);
  text('菜单显示设置',centerX,top+56,12,COL.pink)
 }else{
  latin('PAPERWORLD',centerX,top+37,2,COL.paper);
  text('感谢游玩',centerX,top+66,16,COL.pink);
 }
}
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const CLOSE_TIME=.56,OPEN_TIME=.62;
const stageRoot=document.getElementById('stage-ui');
const lease=createLeaseUI({
 root:stageRoot,
 onBack:()=>switchScene('menu'),
 onDone:()=>{saveExists=true},
 onWorld:()=>switchScene('world')
});
const world=createWorld3D({onBack:()=>switchScene('menu')});
const intro=createHostessIntro({
 COL,R,poly,text,root:stageRoot,
 onComplete:()=>switchScene('lease'),
 onBack:()=>switchScene('menu')
});
function enterScene(next){
 state=next;selected=0;hover=-1;held=-1;
 if(next==='intro')intro.enter();
 else intro.leave();
 if(next!=='lease')lease.hide();
 buttons();
}
function switchScene(next){
 if(curtain)return;
 if(state==='intro')intro.leave();
 if(state==='lease')lease.hide();
 if(state==='world')world.close();
 if(reduced){enterScene(next);if(next==='lease')lease.show({receipt:!!lease.snapshot().hasContract});if(next==='world')world.open();return}
 if(nativeLabels)nativeLabels.style.visibility='hidden';
 curtain={next,phase:'close',elapsed:0};hover=-1;held=-1;
}
function updateCurtain(dt){
 if(!curtain)return;
 curtain.elapsed+=dt;
 if(curtain.phase==='close'&&curtain.elapsed>=CLOSE_TIME){
  enterScene(curtain.next);curtain.phase='open';curtain.elapsed=0;
 }else if(curtain.phase==='open'&&curtain.elapsed>=OPEN_TIME){
  curtain=null;
  if(nativeLabels)nativeLabels.style.visibility='visible';
  if(state==='lease')lease.show({receipt:lease.snapshot().hasContract});
  if(state==='world')world.open();
}
}
function paintFoldWipe(){
 if(!curtain)return;
 // A single diagonal paper-sheet wipe, not two doors or a circular blackout.
 // The x+y front is perpendicular to the 45-degree stripe direction.
 // Close: ink grows from upper-left to lower-right.
 // Open: the NEW page appears in that same direction.
 const close=curtain.phase==='close';
 const duration=close?CLOSE_TIME:OPEN_TIME;
 const p=ease(Math.min(1,curtain.elapsed/duration));
 const edge=(W+H)*p;
 for(let y=0;y<H;y++){
  const x=Math.round(edge-y);
  if(close){
   const cover=clamp(x,0,W);
   if(cover>0)R(0,y,cover,1,COL.ink);
   // The fold has a crisp 3-pixel cream lip and 2-pixel mist-blue seam.
   if(x>=0&&x<=W+6){R(x-5,y,3,1,COL.paper);R(x-2,y,2,1,COL.blue)}
  }else{
   const from=clamp(x,0,W);
   if(from<W)R(from,y,W-from,1,COL.ink);
   if(x>=-6&&x<=W){R(x+1,y,3,1,COL.paper);R(x+4,y,2,1,COL.pink)}
  }
 }
}
// Tiny pixel pop on ANY touch, including empty space. Nothing moves while idle.
// Exactly six 1–2 logical-pixel squares, under 12 logical pixels of travel.
// No flash, star, trails, ring, gravity, glow, transparent blending or gradient.
const PIXEL_POP_COUNT=7;
const PIXEL_POP_SECONDS=.30;
function emitTouchEffect(x,y){
 if(reduced||!prefs.particles)return;
 const px=Math.round(clamp(x,0,W-1)),py=Math.round(clamp(y,0,H-1));
 const sparks=[];
 for(let i=0;i<PIXEL_POP_COUNT;i++){
  const angle=Math.random()*Math.PI*2;
  const distance=5+Math.random()*8; // 10–26 CSS pixels, still restrained.
  sparks.push({
   dx:Math.cos(angle)*distance,dy:Math.sin(angle)*distance,
   size:i%3===0?3:2,color:state==='menu'?(i%3===0?COL.pink:COL.ink):[COL.paper,COL.pink,COL.blue][i%3]
  });
 }
 touchSerial++;lastTouch={x:px,y:py};
 touchBursts.push({x:px,y:py,age:0,sparks});
 if(touchBursts.length>3)touchBursts.shift();
}
function updateTouchEffects(dt){
 for(let i=touchBursts.length-1;i>=0;i--){
  touchBursts[i].age+=dt;
  if(touchBursts[i].age>=PIXEL_POP_SECONDS)touchBursts.splice(i,1);
 }
}
function paintTouchEffects(){
 for(const burst of touchBursts){
  const t=clamp(burst.age/PIXEL_POP_SECONDS,0,1);
  const travel=1-(1-t)*(1-t);
  for(const p of burst.sparks){
   R(burst.x+p.dx*travel,burst.y+p.dy*travel,p.size,p.size,p.color);
  }
 }
}

function draw(){
 if(!W||!H)return;
 ctx.clearRect(0,0,W,H);
 // Transparent overlay on GPU animated striped background in menu.
 if(state==='menu')titleArtwork();
 else if(state==='world'){R(0,0,W,H,COL.ink)}
 else if(state==='intro'||state==='lease'){intro.draw(ctx,W,H);if(state==='intro'&&!curtain){frame(5,6,52,21,COL.ink,COL.paper,4,2);text('返回',31,11,15,COL.ink)}}
 else overlay();
 for(let i=0;i<btns.length;i++)drawButton(btns[i],i);
 if(!land&&state==='menu'){latin('V0.2.0',W*.17,H-18,1,COL.ink);
  }
 if(note&&clock<noteTo){panel(W/2-76,H*.09,152,22,COL.paper,3);text(note,W/2,H*.09+5,11,COL.ink)}
 paintFoldWipe();
 paintTouchEffects();
 window.__PAPERWORLD_MENU__={state,selected,hover,held,particleCount:touchBursts.reduce((n,b)=>n+b.sparks.length,0),touchCount:touchSerial,lastTouch,activeRipples:touchBursts.length,lastFireworkPattern:touchBursts.at(-1)?.sparks.map(p=>p.dx.toFixed(2)+','+p.dy.toFixed(2)).join('|')||'',buttons:btns.map(b=>({...b})),saveExists,prefs:{...prefs},logical:[W,H],frame:frameN,intro:(state==='intro'||state==='lease')?intro.snapshot():null,lease:state==='lease'?lease.snapshot():null,world:state==='world'?{active:world.active}:null,transition:curtain?{type:'diagonal-paper-wipe',phase:curtain.phase,progress:curtain.elapsed}:null};
}
function flash(msg){note=msg;noteTo=clock+1.3}
function savePrefs(){try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch{}bg.style.animationPlayState=prefs.motion?'running':'paused'}
function act(i,x,y){
 if(curtain||i<0||i>=btns.length)return;
 if(prefs.haptic&&navigator.vibrate)try{navigator.vibrate(7)}catch{}
 selected=i;hover=i;
 if(state==='menu'){
  if(i===0){try{localStorage.setItem(SAVE,'created')}catch{}saveExists=true;switchScene('intro')}
  else if(i===1){if(saveExists){const existing=localStorage.getItem('paperworld-lease-v1');switchScene(existing?'lease':'intro')}else flash('暂无存档')}
  else if(i===2)switchScene('world');
  else if(i===3)switchScene('settings');
  else if(i===4)switchScene('exit');
 }else if(state==='settings'){
  if(i===0)prefs.motion=!prefs.motion;
  if(i===1)prefs.particles=!prefs.particles;
  if(i===2)prefs.haptic=!prefs.haptic;
  if(i===3)switchScene('menu');
  savePrefs();
 }else switchScene('menu');
 if(!curtain){selected=0;hover=-1;held=-1;buttons()}
}
function hit(x,y){for(let i=btns.length-1;i>=0;i--){const b=btns[i];if(x>=b.x-5&&x<=b.x+b.w+5&&y>=b.y-5&&y<=b.y+b.h+5)return i}return -1}
function xy(ev){const rect=el.getBoundingClientRect();return {x:(ev.clientX-rect.left)*W/rect.width,y:(ev.clientY-rect.top)*H/rect.height}}
el.addEventListener('pointermove',e=>{const p=xy(e);hover=hit(p.x,p.y);el.style.cursor=hover>=0?'pointer':'default'});
el.addEventListener('pointerdown',e=>{const p=xy(e);emitTouchEffect(p.x,p.y);if(curtain){held=-1;return}held=hit(p.x,p.y);if(held>=0)el.setPointerCapture(e.pointerId)});
el.addEventListener('pointerup',e=>{const p=xy(e);
 if(state==='intro'&&!curtain){
  if(p.x>=5&&p.x<=57&&p.y>=6&&p.y<=28)switchScene('menu');
  else intro.onTap();
  held=-1;return;
 }
 const i=hit(p.x,p.y);if(i>=0&&i===held)act(i,p.x,p.y);held=-1
});
el.addEventListener('pointercancel',()=>held=-1);
el.addEventListener('pointerleave',()=>{hover=-1;held=-1});
addEventListener('keydown',e=>{
 if((e.key==='ArrowDown'||e.key==='ArrowUp')&&btns.length){e.preventDefault();selected=(selected+(e.key==='ArrowDown'?1:-1)+btns.length)%btns.length;hover=selected}
 else if(e.key==='Enter'||e.key===' '){e.preventDefault();
 if(state==='intro'&&!curtain){intro.onTap()}
 else {const b=btns[selected];if(b){emitTouchEffect(b.x+b.w/2,b.y+b.h/2);act(selected,b.x+b.w/2,b.y+b.h/2)}}
 }
 else if(e.key==='Escape'||e.key==='Backspace'){if(state!=='menu')switchScene('menu')}
});
addEventListener('resize',layout,{passive:true});
let vis=true;document.addEventListener('visibilitychange',()=>{last=0;vis=!document.hidden});
function tick(now){
 if(!last)last=now;let dt=clamp((now-last)/1000,0,.05);last=now;
 if(!vis)dt=0;
 clock+=dt; // UI time never freezes when background movement is disabled.
 updateTouchEffects(dt);
 updateCurtain(dt);
 if(state==='intro'&&!curtain)intro.update(dt);
 frameN++;draw();requestAnimationFrame(tick)
}
layout();savePrefs();requestAnimationFrame(tick);
