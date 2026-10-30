/* PAPERWORLD · original four-ink procedural pixel menu.
 * Every visible logo, plane, cloud, glyph, button, outline and particle is
 * drawn at an integer logical pixel. No generated image is used at runtime.
 */
const COL={ink:'#393657',pink:'#F2A5C2',blue:'#A9BAE9',paper:'#FFF5E6'};
const ORDER=['开始游戏','继续游戏','设置','退出游戏'];
const KEY='paperworld-menu-v1',SAVE='paperworld-journey-v1';
const el=document.getElementById('menu'), bg=document.getElementById('background');
const ctx=el.getContext('2d',{alpha:true,willReadFrequently:false});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let prefs={motion:!reduced,particles:false,haptic:true};
try{prefs={...prefs,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{}
if(reduced)prefs.motion=false;
let W=0,H=0,scale=2,land=false,btns=[],state='menu',selected=0,hover=-1,held=-1;
let frameN=0,clock=0,last=0,particles=[],ripples=[],saveExists=false;
let note='',noteTo=0,curtain=null;
try{saveExists=localStorage.getItem(SAVE)==='created'}catch{}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rand=(seed)=>{let x=seed|0;return()=>{x=Math.imul(x^x>>>15,1|x);x^=x+Math.imul(x^x>>>7,61|x);return ((x^x>>>14)>>>0)/4294967296}};
const rng=rand(36024);
const stars=Array.from({length:39},(_,i)=>({x:rng(),y:rng(),phase:rng()*6.283,kind:i%4,speed:.25+rng()*.5}));
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
function sparkle(x,y,s,c=COL.ink){s=Math.max(2,Math.round(s));R(x-1,y-s,2,s*2+1,c);R(x-s,y-1,s*2+1,2,c);R(x-1,y-1,2,2,COL.paper)}
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
 const font='900 '+height+'px "Noto Sans CJK SC","Microsoft YaHei","PingFang SC",sans-serif';
 g.font=font;const bounds=g.measureText(s);
 const ww=Math.ceil(bounds.width+height*.6+4),hh=Math.ceil(height*1.55+4);
 c.width=ww;c.height=hh;g.font=font;g.fillStyle='#000';g.textBaseline='top';g.fillText(s,2,0);
 const data=g.getImageData(0,0,ww,hh).data;
 let minX=ww,minY=hh,maxX=-1,maxY=-1;const coords=[];
 for(let y=0;y<hh;y++)for(let x=0;x<ww;x++){
   if(data[(y*ww+x)*4+3]>=170){coords.push([x,y]);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
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
 btns=[];const names=state==='menu'?ORDER:state==='settings'?['背景动画','触感反馈','返回菜单']:state==='play'?['返回菜单']:['返回菜单'];
 let bw,bh,gap,cx,top;
 if(land){bw=Math.round(clamp(W*.42,130,195));bh=Math.round(clamp(H*.16,24,31));gap=8;cx=Math.round(W*.75);top=Math.round((H-(names.length*bh+(names.length-1)*gap))/2)}
 else{bw=Math.round(clamp(W*.81,132,230));bh=Math.round(clamp(H*.078,28,37));gap=Math.round(clamp(H*.023,7,12));cx=Math.round(W*.5);top=Math.round(clamp(H*.48,155,H-(names.length*(bh+gap)+33)))}
 for(let i=0;i<names.length;i++)btns.push({label:names[i],x:cx-bw/2,y:top+i*(bh+gap),w:bw,h:bh,index:i});
}
function atmosphere(){
 for(let i=0;i<stars.length;i++){
  const a=stars[i],x=Math.round(a.x*W),y=Math.round(a.y*H);
  const mid=land?W*.56:W*.5;
  if(!land&&Math.abs(x-mid)<W*.3&&y>H*.44&&y<H*.87)continue;
  const tw=prefs.motion?Math.sin(clock*a.speed+a.phase):0;
  const color=a.kind===0?COL.pink:a.kind===1?COL.ink:COL.paper;
  if(a.kind===0)sparkle(x,y,Math.round(2+Math.max(0,tw)*2),color);
  else if(a.kind===1){R(x,y,2,2,COL.ink);R(x+1,y+4,1,2,COL.ink)}
  else if(a.kind===2)R(x,y,2,2,COL.blue);
  else sparkle(x,y,2,COL.paper);
 }
 for(let i=0;i<particles.length;i++){
  const p=particles[i],u=clamp(p.life/p.max,0,1);
  if(u>0)R(p.x,p.y,Math.max(1,Math.round(2*u)),Math.max(1,Math.round(2*u)),p.c);
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
 latin('PAPERWORLD',cx+2,wordY+2,zoom,COL.pink);
 latin('PAPERWORLD',cx,wordY,zoom,COL.paper);
 if(!land){R(cx-wordW*.42,wordY+7*zoom+9,Math.round(wordW*.84),2,COL.blue);
  latin('FOUR COLORS',cx,wordY+7*zoom+13,1,COL.ink)}
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
 let label=b.label;
 if(state==='settings'&&i<2)label+=' '+(i===0?(prefs.motion?'开':'关'):(prefs.haptic?'开':'关'));
 let hFont=Math.round(clamp(h*.53,14,19));
 let sprite=glyphBitmap(label,hFont);
 while(sprite.w>w*.72&&hFont>13){hFont--;sprite=glyphBitmap(label,hFont)}
 const labelCenter=x+w*.58;const labelX=Math.round(labelCenter),labelY=Math.round(y+(h-sprite.h)/2);
 text(label,labelX,labelY,hFont,COL.ink);
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
function switchScene(next){
 if(curtain)return;
 if(reduced){state=next;selected=0;hover=-1;held=-1;buttons();return}
 curtain={next,phase:'close',elapsed:0};hover=-1;held=-1;
}
function updateCurtain(dt){
 if(!curtain)return;
 curtain.elapsed+=dt;
 if(curtain.phase==='close'&&curtain.elapsed>=.27){
  state=curtain.next;selected=0;hover=-1;held=-1;buttons();curtain.phase='open';curtain.elapsed=0;
 }else if(curtain.phase==='open'&&curtain.elapsed>=.30)curtain=null;
}
function paintCurtain(){
 if(!curtain)return;
 const t=curtain.phase==='close'?ease(Math.min(1,curtain.elapsed/.27)):1-ease(Math.min(1,curtain.elapsed/.30));
 const span=Math.ceil(W*.5*t);
 R(0,0,span,H,COL.ink);
 R(W-span,0,span+1,H,COL.ink);
}
function draw(){
 if(!W||!H)return;
 ctx.clearRect(0,0,W,H);
 // Transparent overlay on GPU animated striped background in menu.
 if(state==='menu'){titleArtwork()}
 else{overlay()}
 for(let i=0;i<btns.length;i++)drawButton(btns[i],i);
 if(!land){latin('V0.1.0',W*.17,H-18,1,state==='menu'?COL.ink:COL.paper);
  }
 if(note&&clock<noteTo){panel(W/2-76,H*.09,152,22,COL.paper,3);text(note,W/2,H*.09+5,11,COL.ink)}
 paintCurtain();
 window.__PAPERWORLD_MENU__={state,selected,hover,held,particleCount:0,buttons:btns.map(b=>({...b})),saveExists,prefs:{...prefs,particles:false},logical:[W,H],frame:frameN,transition:curtain?{phase:curtain.phase,progress:curtain.elapsed}:null};
}
function burst(x,y,n=16){
 if(!prefs.particles)return;
 for(let i=0;i<n;i++){const a=Math.PI*2*i/n+rng()*.7,v=15+rng()*40;
 particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-5,life:.5+rng()*.4,max:.8,c:[COL.paper,COL.pink,COL.blue,COL.ink][i%4]})}
 if(particles.length>90)particles.splice(0,particles.length-90)
}
function flash(msg){note=msg;noteTo=clock+1.3}
function savePrefs(){try{localStorage.setItem(KEY,JSON.stringify(prefs))}catch{}bg.style.animationPlayState=prefs.motion?'running':'paused'}
function act(i,x,y){
 if(curtain||i<0||i>=btns.length)return;
 if(prefs.haptic&&navigator.vibrate)try{navigator.vibrate(7)}catch{}
 selected=i;hover=i;
 if(state==='menu'){
  if(i===0){try{localStorage.setItem(SAVE,'created')}catch{}saveExists=true;switchScene('play')}
  else if(i===1){if(saveExists)switchScene('play');else flash('暂无存档')}
  else if(i===2)switchScene('settings');
  else if(i===3)switchScene('exit');
 }else if(state==='settings'){
  if(i===0)prefs.motion=!prefs.motion;
  if(i===1)prefs.haptic=!prefs.haptic;
  if(i===2)switchScene('menu');
  savePrefs();
 }else switchScene('menu');
 if(!curtain){selected=0;hover=-1;held=-1;buttons()}
}
function hit(x,y){for(let i=btns.length-1;i>=0;i--){const b=btns[i];if(x>=b.x-5&&x<=b.x+b.w+5&&y>=b.y-5&&y<=b.y+b.h+5)return i}return -1}
function xy(ev){const rect=el.getBoundingClientRect();return {x:(ev.clientX-rect.left)*W/rect.width,y:(ev.clientY-rect.top)*H/rect.height}}
el.addEventListener('pointermove',e=>{const p=xy(e);hover=hit(p.x,p.y);el.style.cursor=hover>=0?'pointer':'default'});
el.addEventListener('pointerdown',e=>{const p=xy(e);held=hit(p.x,p.y);if(held>=0)el.setPointerCapture(e.pointerId)});
el.addEventListener('pointerup',e=>{const p=xy(e),i=hit(p.x,p.y);if(i>=0&&i===held)act(i,p.x,p.y);held=-1});
el.addEventListener('pointercancel',()=>held=-1);
el.addEventListener('pointerleave',()=>{hover=-1;held=-1});
addEventListener('keydown',e=>{
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();selected=(selected+(e.key==='ArrowDown'?1:-1)+btns.length)%btns.length;hover=selected}
 else if(e.key==='Enter'||e.key===' '){e.preventDefault();const b=btns[selected];if(b)act(selected,b.x+b.w/2,b.y+b.h/2)}
 else if(e.key==='Escape'||e.key==='Backspace'){if(state!=='menu')switchScene('menu')}
});
addEventListener('resize',layout,{passive:true});
let vis=true;document.addEventListener('visibilitychange',()=>{last=0;vis=!document.hidden});
function tick(now){
 if(!last)last=now;let dt=clamp((now-last)/1000,0,.05);last=now;
 if(!vis)dt=0;
 if(prefs.motion)clock+=dt;
 updateCurtain(dt);
 frameN++;draw();requestAnimationFrame(tick)
}
layout();savePrefs();requestAnimationFrame(tick);
