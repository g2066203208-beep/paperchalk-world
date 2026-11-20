(() => {
'use strict';
const {clamp,lerp,mod,randomStream,foes,items}=SlotStudy;
const TAU=Math.PI*2;
const glyphs={
 A:'0e11111f111111',B:'1e11111e11111e',C:'0f10101010100f',D:'1e11111111111e',E:'1f10101e10101f',
 F:'1f10101e101010',G:'0f10101711110e',H:'1111111f111111',I:'0e04040404040e',J:'0702020212120c',
 K:'11121418141211',L:'1010101010101f',M:'111b1515111111',N:'11191915131311',O:'0e11111111110e',
 P:'1e11111e101010',Q:'0e11111115120d',R:'1e11111e141211',S:'0f10100e01011e',T:'1f040404040404',
 U:'1111111111110e',V:'11111111110a04',W:'1111111515150a',X:'11110a040a1111',Y:'11110a04040404',Z:'1f01020408101f',
 0:'0e11131519110e',1:'040c040404040e',2:'0e11010204081f',3:'1e01010e01011e',4:'02060a121f0202',
 5:'1f10101e01011e',6:'0e10101e11110e',7:'1f010204080808',8:'0e11110e11110e',9:'0e11110f01010e',
 a:'00000e011f110f',b:'10101e1111111e',c:'00000f1010100f',d:'01010f1111110f',e:'00000e111f100f',
 f:'0609081e080808',g:'00000f110f010e',h:'10101e11111111',i:'04000c0404040e',k:'10101214181412',
 l:'0c04040404040e',m:'00001a15151515',n:'00001e11111111',o:'00000e1111110e',p:'00001e111e1010',
 r:'00001619101010',s:'00000f100e011e',t:'08081e08080906',u:'0000111111110f',v:'00001111110a04',
 y:'000011110f010e','+':'0004041f040400','-':'0000001f000000','/':'01010204081010',
 '!':'04040404040004',"'":'04040800000000','.':'00000000000c0c','?':'0e110102040004',':':'000c0c000c0c00',
 '$':'040f140e051e04','>':'10080402040810','<':'01020408040201',' ':'00000000000000'
};
const textCache=new Map();
function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function label(c,str,x,y,size,color,align='left',maxWidth=Infinity){
 str=String(str);const key=str+'|'+color;
 let im=textCache.get(key);
 if(!im){
  im=makeCanvas(Math.max(1,str.length*6-1),7);const t=im.getContext('2d');t.fillStyle=color;
  [...str].forEach((ch,n)=>{const bits=glyphs[ch]||glyphs[ch.toUpperCase()]||glyphs['?'];
   for(let row=0;row<7;row++){const line=parseInt(bits.slice(row*2,row*2+2),16);
    for(let col=0;col<5;col++)if(line&(16>>col))t.fillRect(n*6+col,row,1,1);}
  });if(textCache.size>550)textCache.clear();textCache.set(key,im);
 }
 const w=Math.min(im.width*size,maxWidth);x-=align==='center'?w/2:align==='right'?w:0;
 c.save();c.imageSmoothingEnabled=false;c.drawImage(im,x,y,w,7*size);c.restore();
}
function glow(c,x,y,r,color,power){
 if(power<.006||r<1)return;
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=clamp(power,0,1);
 const grad=c.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,color);grad.addColorStop(1,'transparent');
 c.fillStyle=grad;c.fillRect(x-r,y-r,2*r,2*r);c.restore();
}
class Graphics{
 constructor(shell,atlas,meta,poses){
  this.shell=shell;this.atlas=atlas;this.meta=meta;this.poses=poses;this.rng=randomStream(76992);
  const nativeScale=Math.min(innerWidth/960,innerHeight/540)*Math.min(devicePixelRatio||1,2);
  const density=nativeScale>1.28?2:1;
  this.world=makeCanvas(960*density,540*density);this.c=this.world.getContext('2d',{alpha:false});
  this.c.setTransform(density,0,0,density,0,0);this.scale=density;
  this.tintCache=new Map();this.strips=new Map();this.ambient=Array.from({length:32},()=>[this.rng(),this.rng(),this.rng()]);
  this.reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  this.lastShot=-10;this.lastEnemy=-10;this.lastPress=-10;this.lastDeny=-10;this.lastWin=-10;this.lastBuy=-10;
  this.sparks=[];this.bolts=[];this.coinBank=[];this.drawer=1;this.shownCash=11;this.hp=125;this.enemyHp=160;
  this.holdFeedback=false;this.stage=-1;this.hover='';this.age=0;this.panelType='combat';
  this.setCoins();
 }
 sprite(c,key,x,y,w,h){
  const uv=this.meta.uv[key];if(!uv)return;
  c.drawImage(this.atlas,...uv,x,y,w??uv[2]/2,h??uv[3]/2);
 }
 inBox(c,key,box){this.sprite(c,key,box[0],box[1],box[2]-box[0],box[3]-box[1])}
 part(c,key,portion,x,y,w,h){
  const [u,v,sw,sh]=this.meta.uv[key], [l,t,r,b]=portion;
  if(r<=l||b<=t)return;
  c.drawImage(this.atlas,u+sw*l,v+sh*t,sw*(r-l),sh*(b-t),x,y,w,h);
 }
 originalTexture(key){
  const [u,v,w,h]=this.meta.uv[key],tex=makeCanvas(w,h);
  tex.getContext('2d').drawImage(this.atlas,u,v,w,h,0,0,w,h);return tex;
 }
 setCoins(){
  this.coinBank=this.meta.coins.map(([x,y,rx,ry],i)=>({x,y,z:0,vx:0,vy:0,vz:0,rx:rx+3,ry:ry+3,face:i,spin:0,roll:0,rest:true,base:true}));
 }
 stateReset(g){
  this.strips.clear();this.setCoins();this.age=g.time;this.shownCash=g.cash;this.stage=g.stage;
  this.hp=g.hp;this.enemyHp=g.enemyHp;this.guard=g.armor;this.sparks=[];this.bolts=[];
  this.lastShot=this.lastWin=this.lastEnemy=-10;
 }
 addCoins(n){
  for(let i=0;i<Math.min(n,30);i++){
   const r=this.rng;this.coinBank.push({x:252+r()*10,y:207+r()*9,z:4,delay:i*.055,
    vx:-42-r()*105,vy:-42+r()*79,vz:145+r()*95,rx:15,ry:15,face:Math.floor(r()*8),
    spin:r()*TAU,roll:r()*TAU,vs:(3+r()*9)*(r()>.5?1:-1),rest:false,base:false});
  }
  if(this.coinBank.length>90)this.coinBank.splice(0,this.coinBank.length-90);
 }
 spray(x,y,n,energy,color){
  for(let i=0;i<n;i++){
   const a=this.rng()*TAU,s=(.22+this.rng()*.78)*energy;
   this.sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-21,life:.19+this.rng()*.51,age:0,color,size:this.rng()>.83?2.6:1.4});
  }
 }
 event(name,e,g){
  const t=g.time;
  if(name==='press')this.lastPress=t;
  if(name==='payout'){this.lastWin=t;this.addCoins(e.count);this.spray(266,208,22,91,'#ffd881');}
  if(name==='deny')this.lastDeny=t;
  if(name==='purchase'){this.lastBuy=t;this.coinBank.splice(Math.max(0,this.coinBank.length-Math.min(10,e.cost)),Math.min(10,e.cost));}
  if(name==='cast')this.lastCast=t;
  if(name==='enemyHit'){
   this.lastEnemy=t;this.spray(810,338,29,126,'#ffc982');
   this.bolts.push({time:t,from:[500,148],to:[810,342],seed:this.rng()*3000,color:'#ffdda6',life:.41});
  }
  if(name==='impact'){
   this.lastShot=t;this.shot=e;const p=this.target(g);
   if(e.money)this.addCoins(e.money);
   if(e.damage){
    this.spray(p[0],p[1],e.crit?40:15,e.crit?170:108,e.crit?'#ffe9a0':'#f5cb85');
    if(e.item==='bolt'||e.item==='star')this.bolts.push({time:t,from:[271+109*e.i,332],to:p,seed:this.rng()*9000,color:'#fff0b5',life:.32});
   }
   if(e.armor)this.spray(821,313,8,53,'#d4e3ab');
  }
 }
 target(g){const a=this.meta.scenes[g.foe.id].pos;return [326+(a[0]+a[2]*.56)*328,54+(a[1]+a[3]*.48)*179]}
 update(dt,g){
  if(this.stage!==g.stage){this.strips.clear();this.stage=g.stage;this.enemyHp=g.enemyHp;}
  this.age=g.time;
  const approach=(a,b,s)=>Math.abs(a-b)<.07?b:lerp(a,b,1-Math.exp(-dt*s));
  this.drawer=approach(this.drawer,g.phase==='spin'||g.phase==='defeat'||g.phase==='complete'?1:0,14);
  this.shownCash=approach(this.shownCash,g.cash,8);this.hp=approach(this.hp,g.hp,8);
  this.guard=approach(this.guard||0,g.armor,10);this.enemyHp=approach(this.enemyHp,g.enemyHp,10);
  for(const a of this.sparks){a.age+=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;a.vx*=Math.exp(-dt*2.2);a.vy+=124*dt}
  this.sparks=this.sparks.filter(a=>a.age<a.life);this.bolts=this.bolts.filter(b=>g.time-b.time<b.life);
  for(const p of this.coinBank){
   if(p.delay>0){p.delay-=dt;continue}if(p.rest)continue;
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=565*dt;p.spin+=p.vs*dt;p.roll+=p.vs*.34*dt;
   if(p.x<60||p.x>269){p.x=clamp(p.x,60,269);p.vx*=-.44}
   if(p.y<83||p.y>273){p.y=clamp(p.y,83,273);p.vy*=-.4}
   if(p.z<=0&&p.vz<0){
    const impact=-p.vz;p.z=0;p.vz=impact*.38;p.vx*=.72;p.vy*=.72;p.vs*=.78;
    if(impact>37)g.emit('clink',{power:Math.min(1,impact/200),x:p.x});
    if(impact<24){p.rest=true;p.spin=0}
   }
  }
 }
 drawCoins(c,t){
  for(const p of this.coinBank){if(p.delay>0)continue;
   const z=p.z,rot=p.base?0:p.roll,cos=p.rest?1:Math.abs(Math.cos(p.spin))*.88+.12;
   if(!p.base){c.save();c.fillStyle='rgba(13,10,8,'+(p.rest?.34:.21)+')';c.beginPath();c.ellipse(p.x+1+z*.10,p.y+2+z*.1,p.rx*.92,p.ry*.68,0,0,TAU);c.fill();c.restore()}
   c.save();c.translate(p.x,p.y-z*.86);c.rotate(rot);c.scale(cos,1);
   this.sprite(c,'coin'+p.face,-p.rx,-p.ry,2*p.rx,2*p.ry);
   if(!p.rest&&Math.cos(p.spin+1)>.82){c.fillStyle='#f8d992';c.fillRect(-p.rx*.7,-p.ry*.47,1.5,4.5)}
   c.restore();
  }
 }
 envelope(t,d){return clamp(1-t/d,0,1)}
 enemy(c,g){
  const scene=g.foe.id,box=this.meta.scenes[scene].pos;
  const death=g.phase==='reward'?g.age:g.phase==='shop'?3:0;
  if(death>.47)return;
  const t=g.time,hit=this.envelope(t-this.lastShot,.27)*(this.shot?.damage?1:0);
  const attack=g.phase==='enemyWind'?Math.sin(Math.PI*g.age/.64):this.envelope(t-this.lastEnemy,.27);
  const w=box[2]*328,h=box[3]*179,x=326+box[0]*328,y=54+box[1]*179;
  c.save();c.translate(x+w*.5+Math.sin((t-this.lastShot)*48)*hit*4,y+h);
  c.scale(1+attack*.05,1+attack*.055);
  if(death){c.globalAlpha=1-death/.47;c.translate(0,death*12);c.scale(1+death*.15,1-death*.22)}
  const pose=window.MACHINE_MOTION[scene],n=pose.frames.length;
  // Frame poses follow displacements measured after registering the footage to the glass bezel.
  const tick=this.reduced?0:Math.floor(t*10)%(2*n-2);
  const [u,v]=pose.frames[tick<n?tick:2*n-2-tick],[px,py,pw,ph]=pose.rect;
  c.drawImage(this.poses,u,v,pw,ph,326+px-x-w/2,54+py-y-h,pw,ph);
  if(hit>.33){
   const id='enemy_'+scene;
   if(!this.tintCache.has(id)){const im=this.originalTexture(id),ic=im.getContext('2d');ic.globalCompositeOperation='source-in';ic.fillStyle='#fff0b4';ic.fillRect(0,0,im.width,im.height);this.tintCache.set(id,im)}
   c.globalAlpha*=hit*.86;c.drawImage(this.tintCache.get(id),-w/2,-h,w,h);
  }
  c.restore();
 }
 lcd(c,g){
  const t=g.time,x=326,y=54,w=328,h=179,p=this.target(g);c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  this.sprite(c,'scene_'+g.foe.id,x,y,w,h);
  const gate=g.phase==='arrival'?clamp(g.age/.45,0,1):1;
  c.save();c.globalAlpha=gate;this.enemy(c,g);c.restore();
  c.fillStyle='#fff3b1';
  for(let i=0;i<18;i++){const a=this.ambient[i];c.globalAlpha=.12+a[2]*.28;
   c.fillRect(Math.floor(x+mod(a[0]*w+t*(1+a[2]*3),w)),Math.floor(y+mod(a[1]*h-t*(1.1+a[2]*2.7),h)),a[2]>.8?1.8:.9,1);}
  c.globalAlpha=1;
  const flash=this.envelope(t-this.lastShot,this.shot?.crit?.42:.29);
  if(this.shot?.damage&&flash>0){
   const f=1-flash,crit=this.shot.crit;
   glow(c,p[0],p[1],(crit?145:72)*(1+f*.3),'#ffce75',flash*(crit?.94:.59));
   const angle=this.shot.item==='bow'?.17:-.64;
   c.save();c.translate(...p);c.rotate(angle);c.globalAlpha=flash;
   c.fillStyle='#ffe7a5';c.beginPath();c.moveTo(-48*f-4,0);c.lineTo(-2,-2.3*flash);c.lineTo(43+27*f,0);c.lineTo(3,2*flash);c.fill();
   c.fillStyle='#ffffe8';c.fillRect(-14,-.65,54,1.3);c.restore();
  }
  if(g.phase==='arrival'){
   c.fillStyle='rgba(37,31,21,'+clamp(.96-g.age*.75,0,.96)+')';c.fillRect(x,y,w,h);
   c.globalAlpha=clamp((1.34-g.age)*2.5,0,1);label(c,'ENTERING',490,122,1.6,'#d8ac69','center');
   label(c,g.foe.place,490,148,2.5,'#ffe2a2','center',299);c.globalAlpha=1;
  }else if(g.phase==='defeat'||g.phase==='complete'){
   c.fillStyle='#201a16bc';c.fillRect(x,y,w,h);
   label(c,g.phase==='defeat'?'GAME OVER':'VICTORY',490,121,4,'#e2ae77','center');
   label(c,'PRESS TO RESTART',490,165,1.5,'#dbbb88','center');
  }else if(g.phase==='reward'){
   const a=clamp((g.age-.24)*3,0,1);c.globalAlpha=a;
   label(c,'VICTORY',490,111,3.5,'#6b411e','center');label(c,'VICTORY',490,109,3.5,'#ffe6a0','center');
   label(c,'+'+g.gain+' COINS',490,154,1.8,'#ffe5a2','center');c.globalAlpha=1;
  }else if(g.feedback&&t-g.feedback.time<.81){
   const age=t-g.feedback.time,txt=g.feedback.text;c.globalAlpha=clamp((.83-age)*6,0,1);
   const yy=196-Math.min(12,age*23);const sz=txt.length>5?2.1:2.9;
   label(c,txt,490+1.2,yy+1.8,sz,'#674525','center');label(c,txt,490,yy,sz,'#ffdf9a','center');
  }
  c.restore();
 }
 reelStrip(w){
  const id=w.strip.join('|');if(this.strips.has(id))return this.strips.get(id);
  const tex=makeCanvas(82,w.strip.length*80);const c=tex.getContext('2d');
  w.strip.forEach((item,i)=>{
   const y=i*80;this.sprite(c,'tile_'+item,0,y,82,79);
   c.fillStyle='#2a2921';c.fillRect(0,y+77,82,2);
   c.fillStyle='#121710';c.fillRect(0,y+79,82,1);
   c.fillStyle='#716958';c.fillRect(2,y+1,78,1);
  });
  // Integrate five exposures over a reel moving roughly six source pixels per display frame.
  const moving=makeCanvas(tex.width,tex.height),mc=moving.getContext('2d');
  mc.drawImage(tex,0,0);
  for(let i=1;i<=4;i++){
   mc.globalAlpha=1/(i+1);const shift=i*1.4;
   mc.drawImage(tex,0,shift);mc.drawImage(tex,0,shift-tex.height);
  }
  const strips={sharp:tex,moving};this.strips.set(id,strips);return strips;
 }
 wheel(c,g,i){
  const w=g.wheels[i],cx=[272,379,487,598,708][i],x=cx-41,y=299,ww=82,hh=92;
  if(!g.active.includes(i))return;
  if(i===0||i===4)this.sprite(c,'slotFrame',cx-51.5,285,103,116);
  const textures=this.reelStrip(w);
  const moving=g.phase==='spin'&&(w.status==='moving'||(w.status==='braking'&&w.brake<w.travel*.57));
  const strip=moving?textures.moving:textures.sharp,len=strip.height;
  c.save();c.beginPath();c.roundRect(x,y,ww,hh,4);c.clip();
  c.fillStyle='#25261e';c.fillRect(x,y,ww,hh);
  const slip=(w.status==='moving'||w.status==='braking')&&g.phase==='spin';
  const bounce=this.envelope(g.time-w.lastLatch,.175)*Math.sin((g.time-w.lastLatch)*37)*.055;
  const center=(w.p+bounce)*80+39.5;
  // Project an unwrapped cylinder through the slot opening, compressing the strip near both lips.
  const band=2,arc=1.03;
  for(let v=0;v<hh;v+=band){
   const a=Math.asin(clamp((v/hh*2-1)*Math.sin(arc),-1,1));
   const b=Math.asin(clamp(((v+band)/hh*2-1)*Math.sin(arc),-1,1));
   const sy=mod(center+a*47,len),n=Math.max(1,(b-a)*47);
   c.drawImage(strip,0,sy,82,Math.min(n,len-sy),x,y+v,ww,band+.15);
  }
  const shade=c.createLinearGradient(0,y,0,y+hh);
  shade.addColorStop(0,'rgba(7,10,6,.91)');shade.addColorStop(.13,'rgba(12,13,7,.36)');
  shade.addColorStop(.37,'rgba(58,47,27,.02)');shade.addColorStop(.67,'rgba(13,14,8,.04)');
  shade.addColorStop(.86,'rgba(9,13,8,.31)');shade.addColorStop(1,'rgba(9,12,7,.89)');
  c.fillStyle=shade;c.fillRect(x,y,ww,hh);
  if(slip){c.fillStyle='#bca77a08';c.fillRect(x+4,y+13,ww-8,62)}
  c.restore();
  const fresh=this.envelope(g.time-w.lastLatch,.20);
  const active=g.current===i&&['skill','resolve'].includes(g.phase);
  if(active||fresh>.02){
   const strength=active?1:fresh*.57;c.save();c.globalAlpha=strength;
   c.strokeStyle='#dca552';c.lineWidth=3.3;c.strokeRect(x-4,y-4,ww+8,hh+8);
   c.strokeStyle='#ffe59c';c.lineWidth=1.5;c.strokeRect(x-5,y-5,ww+10,hh+10);
   c.fillStyle='rgba(249,192,92,.10)';c.fillRect(x,y,ww,hh);c.restore();
   glow(c,cx,y+hh/2,76,'#b07d34',strength*.14);
  }
 }
 bar(c,key,portion,direction='right'){
  const b=this.meta.hud[key],[x,y,r,d]=b,v=clamp(portion,0,1);
  c.fillStyle='#27271f';c.fillRect(x,y,r-x,d-y);
  if(v<=0)return;
  if(direction==='up')this.part(c,key,[0,1-v,1,1],x,d-(d-y)*v,r-x,(d-y)*v);
  else this.part(c,key,[0,0,v,1],x,y,(r-x)*v,d-y);
 }
 hud(c,g){
  const box=this.meta.hud;
  const copy=key=>this.inBox(c,key,box[key]);
  const cash=Math.round(this.shownCash);
  if(cash===11)copy('coinCount');else label(c,cash,157,316,3.2,'#806b43','center',61);
  if(g.phase==='shop')this.sprite(c,'shopTitle',670,55,180,50);
  else if(g.phase==='enemyWind'||g.phase==='enemyHit')label(c,"ENEMY'S TURN",763,73,1.72,'#bb905d','center',155);
  else copy('label');
  if(g.log==='SPINNING!'&&g.phase==='spin')copy('log');
  else{
   const lines=[];let line='';
   for(const word of g.log.split(/\s+/)){if((line+' '+word).trim().length>11&&line){lines.push(line);line=word}else line=(line+' '+word).trim()}
   if(line)lines.push(line);
   lines.forEach((v,i)=>label(c,v,695,132+i*12,1.15,g.time-this.lastDeny<.5?'#df9e72':'#a48b60','left',84));
  }
  if(g.phase!=='shop')this.bar(c,'healthLine',this.enemyHp/g.foe.hp);
  this.bar(c,'hpLine',this.hp/g.maxHp,'up');
  if(this.guard>.2){
   const p=clamp(this.guard/125,0,1);c.fillStyle='#79977f';c.fillRect(823,325-196*p,6,196*p);
   c.fillStyle='#a9b89d';for(let y=323;y>325-196*p;y-=6)c.fillRect(823,y,6,1.4);
  }
  if(g.hp===125&&g.maxHp===125)copy('hpValue');
  else{label(c,g.hp,821,360,2.05,'#af9365','center');label(c,'/'+g.maxHp,821,381,1.38,'#96815c','center')}
  if(g.phase==='shop')return;
  if(g.enemyHp===160)copy('enemyValue');else label(c,g.enemyHp,350,257,1.34,'#242318','right');
  if(g.stage===0&&g.turn===1)copy('intentValue');else{
   label(c,'+  '+(g.foe.power+(g.turn%3===0?5:0)),305,245,1.28,'#aa8e60','right');
   label(c,'>  '+g.turn,305,257,1.2,'#91794f','right');
  }
 }
 shop(c,g){
  this.sprite(c,'shopUpper',285,15,396,260);
  this.sprite(c,'shopGlass',333,61,325,186);
  const cols=6;
  g.pool.forEach((v,i)=>{const x=348+(i%cols)*49,y=120+Math.floor(i/cols)*48;this.sprite(c,'smallWell',x-2,y-2,46,46);this.sprite(c,'tile_'+v,x+2,y+2,38,38);});
  this.sprite(c,'shopShelf',198,274,594,149);
  for(let i=0;i<3;i++){
   const x=338+i*109,y=304,sold=g.purchases.has(i);const k=g.offers[i];
   this.sprite(c,'smallWell',x,y,85,88);
   if(k==='reel'){this.sprite(c,'sealedFace',x+9,y+10,66,65);label(c,'REEL+',x+43,y+38,1.8,'#e7c785','center')}
   else this.sprite(c,'tile_'+k,x+7,y+8,70,70);
   if(sold){c.fillStyle='#192117ca';c.fillRect(x+4,y+5,77,76);label(c,'SOLD',x+43,y+37,2,'#c3b282','center')}
   else{this.sprite(c,'price',x+65,y-9,31,31);c.fillStyle='#c6bda6';c.fillRect(x+71,y-1,17,12);label(c,g.prices[i],x+80,y,1.48,'#2b291d','center',18);}
   if(!sold&&(g.focusOffer===i||this.hover==='buy'+i)){c.strokeStyle='#f0c16d';c.lineWidth=3;c.strokeRect(x-2,y-3,89,93);}
  }
  this.sprite(c,'utility',115,413,743,123);
  [5,7,10].forEach((price,i)=>{c.fillStyle='#554e3c';c.fillRect(192+i*94,492,18,15);label(c,price,201+i*94,495,1.45,'#ddd1a6','center')});
  this.hud(c,g);
 }
 drawerControls(c,g){
  if(this.drawer>.006){
   const dy=(1-this.drawer)*114;
   this.sprite(c,g.phase==='defeat'||g.phase==='complete'?'blankDrawer':'drawer',296,430+dy,394,110);
   if(g.phase==='defeat'||g.phase==='complete')label(c,'RESTART',490,485+dy,2.5,'#ebc69d','center');
   if(this.hover==='action'||this.age-this.lastPress<.14){
    c.fillStyle=this.age-this.lastPress<.14?'#1d140d32':'#ffca7710';c.fillRect(360,469+dy,258,50);
   }
  }
  if(g.phase==='skill'){
   const cx=[272,379,487,598,708][g.current];
   this.sprite(c,'smallWell',cx-34,417,68,64);label(c,'GO',cx,433,3,'#ffe7ae','center');
   c.fillStyle='#28251c';c.fillRect(cx-28,465,56,5);c.fillStyle='#d2a553';c.fillRect(cx+7,465,12,5);
   c.fillStyle='#fff0bd';c.fillRect(cx-28+54*g.needle(),460,2,12);
   glow(c,cx,449,38,'#cb9d58',.15);
  }
 }
 bolt(c,b,now){
  const age=now-b.time,k=clamp(1-age/b.life,0,1),rng=randomStream(Math.floor(b.seed+age*22));
  const [x,y]=b.from,[ex,ey]=b.to,dx=ex-x,dy=ey-y;const dist=Math.hypot(dx,dy),points=[];
  for(let j=0;j<=15;j++){const q=j/15,off=(rng()-.5)*18*Math.sin(Math.PI*q);
   points.push([Math.round(x+dx*q-dy/dist*off),Math.round(y+dy*q+dx/dist*off)])}
  c.save();c.globalCompositeOperation='screen';c.lineJoin='bevel';
  for(const [width,color,opacity] of [[13,'#d58939',.27],[5,'#ffc977',.68],[1.8,'#fff6d8',1]]){
   c.strokeStyle=color;c.globalAlpha=opacity*k;c.lineWidth=width;c.beginPath();
   points.forEach(([a,d],i)=>i?c.lineTo(a,d):c.moveTo(a,d));c.stroke();
  }
  c.globalAlpha=k*.8;c.lineWidth=1.25;
  for(const j of [4,8,11]){const [a,d]=points[j];c.beginPath();c.moveTo(a,d);c.lineTo(a+8,d-4);c.lineTo(a+12+rng()*14,d-11);c.stroke()}
  c.restore();glow(c,ex,ey,37*k,'#ffcc79',k*.82);
 }
 atmospheric(c,g){
  const t=g.time,hit=this.envelope(t-this.lastShot,.37),inbound=this.envelope(t-this.lastEnemy,.49),reward=this.envelope(t-this.lastWin,.8);
  const intensity=Math.max(inbound,hit*(this.shot?.crit?1:.24),reward);
  if(intensity>.03){
   glow(c,493,147,205,'#b78549',intensity*.24);
   c.save();c.fillStyle='#ffe8ab';c.globalAlpha=intensity*.95;
   for(let i=0;i<18;i++){const x=332+i*18.5;c.fillRect(x,48,3.5,3);if(i<9){c.fillRect(318,63+i*19.6,3,3.5);c.fillRect(659,63+i*19.6,3,3.5)}}
   c.restore();
  }
  this.bolts.forEach(b=>this.bolt(c,b,t));
  c.save();for(const p of this.sparks){
   c.globalAlpha=Math.min(1,(p.life-p.age)*4.8);c.fillStyle=p.color;
   c.fillRect(Math.round(p.x),Math.round(p.y),p.size,Math.max(p.size,Math.abs(p.vy)*.015));
  }c.restore();
  // Local reflections stay attached to the brass edge and the glass on the right.
  glow(c,932,267,84,'#bf8148',.06+.025*Math.sin(t*2.6)+.017*Math.sin(t*7.4));
 }
 paint(g){
  const c=this.c;c.drawImage(this.shell,0,0,960,540);this.drawCoins(c,g.time);
  if(g.phase==='shop')this.shop(c,g);
  else{
   this.lcd(c,g);this.hud(c,g);
   for(const i of g.active)this.wheel(c,g,i);
   this.drawerControls(c,g);
  }
  this.atmospheric(c,g);return this.world;
 }
}
Object.assign(SlotStudy,{Graphics,label,makeCanvas,glow});
})();
