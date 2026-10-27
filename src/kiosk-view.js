import {INTERIOR_PARTS,interiorRect} from './kiosk-interior-v4.js';
// Illustrated object scene rendered through a local camera. No screen-based fixture reflow.
import {GOODS,FIXTURES,visitor,shelfUpgradeCost,heatingUpgradeCost,dailyOverhead} from './kiosk-core.js';
import {recyclingOffer,recyclingCarried,recyclingState,RECYCLING} from './kiosk-business.js';
import {SHOP,SHOP_WORLD,cameraTarget,projectedRect,shopTask} from './kiosk-shop-layout.js';
import {objectsAt} from './kiosk-objects.js';
import {SHELF_PARTS,CHARACTERS,FACE_RECTS,ITEM_SIZES,ART_PATHS,drawArt,artImage,artStatus} from './kiosk-art-assets.js';
const F={ink:'#283451',paper:'#FFF1DA',blue:'#526FA9',pale:'#E8DFC9',warm:'#F3AA43',mint:'#8CB3B1'};
export function customerSpeech(s,motion=null){
 if(!s?.windowOpen||s.phase==="summary"||
   ["hidden","enter","handoff","exit"].includes(motion?.stage))return null;
 const person=visitor(s);
 if(s.wrongAttempted)return {name:person.name,text:"这不是我要的，请给我"+GOODS[person.sku].name+"。"};
 if(s.favorDone&&person.favor)return {name:person.name,text:"太感谢了，委托办成啦！"};
 if(recyclingOffer(s))return {name:person.name,text:"我带了节旧电池，可以帮忙回收吗？"};
 if(recyclingState(s).lastOrder===s.orderIndex&&s.spoken)return {name:person.name,text:"谢谢！放进右边回收抽屉就好。"};
 if(s.spoken&&person.favor)return {name:person.name,text:person.favor.line};
 return {name:person.name,text:person.line};
}
export function wrapSpeech(text,maxChars=14,maxLines=3){
 const result=[],width=Math.max(2,Math.floor(maxChars)),limit=Math.max(1,Math.floor(maxLines));
 let current="";
 for(const ch of String(text??"")){
  if(ch==="\n"){if(current)result.push(current);current="";continue;}
  if(Array.from(current).length>=width&&!/[，。！？、；：,.!?]/.test(ch)){result.push(current);current="";}
  current+=ch;
 }
 if(current)result.push(current);
 if(result.length>limit){
  const cropped=result.slice(0,limit);
  cropped[limit-1]=Array.from(cropped[limit-1]).slice(0,width-1).join("")+"…";
  return cropped;
 }
 return result;
}

export function windowFrostPattern(width,height){
 const w=Math.floor(width),h=Math.floor(height);
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<24||h<24)return [];
 const pieces=[];
 const add=(x,y,ww,hh,color)=>{
  const l=Math.max(0,x),r=Math.min(w,x+ww);
  if(r>l)pieces.push({x:l,y,w:r-l,h:hh,color});
 };
 for(let i=0;i<w;i+=18){
  const length=Math.min(w-i,13+(i/18%3)*2);
  add(i,-7,length,2,"#F9F7F4");
  add(i+2,-5,Math.max(1,length-4),2,"#DDE6F5");
  if((i/18)%3===1)add(i+5,-3,2,3,"#7F99C2");
 }
 for(let i=0;i<w;i+=25){
  const length=Math.min(w-i,12+(i/25%3)*3);
  add(i,h+2,length,2,"#F9F7F4");
  add(i+2,h+4,Math.max(1,length-4),2,"#DDE6F5");
 }
 return pieces;
}

const text=(g,s,x,y,size=14,c=F.paper,align='left',max)=>{g.font=`700 ${size}px system-ui,"Noto Sans CJK SC",sans-serif`;g.textAlign=align;g.textBaseline='middle';g.fillStyle=c;g.fillText(String(s),x,y,max);};
const box=(g,b,c,r=5)=>{g.fillStyle=c;g.beginPath();g.roundRect(b.x,b.y,b.w,b.h,r);g.fill();};
const target=(hits,b,cmd,key,gesture='tap')=>hits.push({...b,cmd,key,gesture});
const label=(g,b,s,active=false,size=14)=>{box(g,b,active?F.warm:F.paper);text(g,s,b.x+b.w/2,b.y+b.h/2,size,F.ink,'center',b.w-8);};
function flatProduct(g,sku,x,y,w,h){drawArt(g,'items/'+sku+'.webp',{x,y,w,h},true);}
function catalog(g,hits,W,H,s,page='goods'){
 hits.length=0;box(g,{x:0,y:0,w:W,h:H},'#1E294Dee',0);
 const w=Math.min(400,W-24),h=Math.min(400,H-20),x=(W-w)/2,y=(H-h)/2;
 box(g,{x,y,w,h},F.paper,10);text(g,'进 货 簿',x+18,y+28,22,F.ink);
 const close={x:x+w-60,y:y+6,w:52,h:44};label(g,close,'关闭');target(hits,close,'closeCatalog');
 const tabs=[{x:x+12,y:y+52,w:(w-28)/2,h:44,key:'goods',title:'商品进货'},{x:x+w/2+2,y:y+52,w:(w-28)/2,h:44,key:'improve',title:'店铺改造'}];
 for(const tab of tabs){label(g,tab,tab.title,page===tab.key);target(hits,tab,'catalogPage',tab.key);}
 if(page==='improve'){
  const cost=shelfUpgradeCost(s),heat=heatingUpgradeCost(s);
  const rows=[{cmd:'upgrade',title:'扩充货架',desc:'每层容量 +2',cost},{cmd:'heat',title:'门窗保温',desc:'每天暖气费 -¥6',cost:heat}];
  rows.forEach((v,i)=>{const b={x:x+12,y:y+112+i*92,w:w-24,h:80};box(g,b,F.pale);text(g,v.title,b.x+12,b.y+22,18,F.ink);text(g,v.desc,b.x+12,b.y+55,14,F.blue);text(g,v.cost===null?'已完成':'¥'+v.cost,b.x+b.w-12,b.y+25,18,F.ink,'right');if(v.cost!==null)target(hits,b,v.cmd);});
  return;
 }
 if(H>=360)text(g,'选商品 → 点同类货架或空位',x+18,y+113,14,F.blue,'left',w-30);
 const rowStart=H<360?96:132;
 const rh=Math.min(62,(h-rowStart-8)/4);
 Object.entries(GOODS).forEach(([sku,v],i)=>{
  const b={x:x+12,y:y+rowStart+i*rh,w:w-24,h:rh-4};box(g,b,i%2?F.pale:'#EAEFF5');
  flatProduct(g,sku,b.x+3,b.y+3,36,b.h-6);
  text(g,v.name+'  进 ¥'+v.buy+' / 售 ¥'+v.price,b.x+45,b.y+b.h/2,14,F.ink,'left',b.w-100);
  text(g,s.cash>=v.buy?'选购':'不足',b.x+b.w-28,b.y+b.h/2,14,F.blue,'center');target(hits,b,'restock',sku);
 });
}
export function customerExpression(motion,phase){
 if(motion?.refusing)return 'concern';if(motion?.receiving)return 'smile';
 if(motion?.talking&&Math.floor(phase/14)%2)return 'talk';return phase%240>232?'smile':null;
}
const names=['elder','earmuffs','courier','silver'];
const opening=new Map();
export function resetShopPresentation(){opening.clear();}
function openAmount(key,value,now){
 let v=opening.get(key);if(!v){v={value:value?1:0,last:value,at:now,from:value?1:0};opening.set(key,v);}
 if(v.last!==value){v.from=v.value;v.last=value;v.at=now;}
 const t=Math.min(1,Math.max(0,(now-v.at)/220));v.value=v.from+((value?1:0)-v.from)*(t*t*(3-2*t));return v.value;
}
export function sceneObjectRects(s){
 const result=[];
 for(const b of SHOP.shelves){
  const units=objectsAt(s,'slot:'+b.key);
  for(const o of units){
   const columns=Math.min(2,Math.floor(FIXTURES[b.key].capacity/GOODS[o.sku].size)),socket=o.socket??o.index,row=Math.floor(socket/columns),column=socket%columns;
   const cellW=b.w/columns,[iw,ih]=ITEM_SIZES[o.sku],h=Math.min(b.h-3,(cellW-6)*ih/iw),w=h*iw/ih;
   result.push({...o,key:b.key,x:b.x+column*cellW+(cellW-w)/2+row*3,y:b.y+b.h-h-row*18,w,h,depth:row});
  }
 }
 return result;
}
export function render(g,s,view,phase=0,viewerId=null,motion=null,itemMotion=null,ui={}){
 const {W,H}=view,hits=[],p=s.players?.[viewerId]||Object.values(s.players||{})[0]||{};
 const camera=ui.camera||cameraTarget(W,H,ui.focus||'front'),now=typeof performance!=='undefined'?performance.now():phase*16;
 const active=typeof Image==='undefined'||ART_PATHS.every(path=>{const i=artImage(path);return i?.complete&&i.naturalWidth;});
 function hitWorld(b,cmd,key,extra={}){
  if(!active)return;
  const v=projectedRect(b,camera,W,H),x=Math.max(0,v.x),y=Math.max(56,v.y),r=Math.min(W,v.x+v.w),bottom=Math.min(H,v.y+v.h);
  if(r-x<12||bottom-y<12)return;
  const w=Math.max(44,r-x),h=Math.max(44,bottom-y);
  hits.push({x:Math.max(0,Math.min(W-w,x-(w-r+x)/2)),y:Math.max(56,Math.min(H-h,y-(h-bottom+y)/2)),w,h,cmd,key,gesture:'tap',world:{...b},...extra});
 }
 box(g,{x:0,y:0,w:W,h:H},F.ink,0);
 g.save();g.beginPath();g.rect(0,56,W,H-56);g.clip();
 g.translate(W/2,56+(H-56)/2);g.scale(camera.z,camera.z);g.translate(-camera.x,-camera.y);
 // V4: every furnishing shares one authored perspective, extracted into independent layers.
 const part=name=>INTERIOR_PARTS.find(p=>p.id===name);
 function layer(name,override){const p=part(name);drawArt(g,'v4/'+p.path,override||interiorRect(p));}
 // Complete backing planes continue behind doors and beyond the permitted camera crop.
 box(g,SHOP_WORLD,'#283451',0);
 drawArt(g,'v4/extension-left.webp',{x:0,y:0,w:590,h:1536});
 drawArt(g,'v4/extension-right.webp',{x:1614,y:0,w:590,h:1536});
 layer('room-shell');
 const win=SHOP.win;
 drawArt(g,'v4/street.webp',win,'cover');
 // Small procedural snow is an effect, never a replacement for authored shop art.
 if(ui.motion!==false){g.save();g.beginPath();g.rect(win.x,win.y,win.w,win.h);g.clip();
  for(let i=0;i<18;i++){const x=win.x+((i*89+Math.sin(phase/100+i)*12)%win.w+win.w)%win.w,y=win.y+(i*67+phase*(.25+(i%3)*.08))%win.h;g.globalAlpha=.35+(i%3)*.12;box(g,{x,y,w:2+i%2,h:2+i%2},F.paper,1);}
  g.restore();}

 if(s.windowOpen&&motion?.visible!==false){
  const tone=motion?.tone??visitor(s).tone,v=CHARACTERS[tone],a=v.anchors,size=v.size||v.sourceSize;
  const face=a.face,palm=a.palmLeft||a.leftPalm||a.receivingPalm;
  const z=200/(palm[1]-face[1]),dh=size[1]*z,x=1102-face[0]*z+(motion?.offset||0)*win.w,y=565-face[1]*z;
  g.save();g.beginPath();g.rect(win.x,win.y,win.w,win.h);g.clip();
  drawArt(g,'characters/'+names[tone]+'.webp',{x,y,w:size[0]*z,h:dh});
  const e=customerExpression(motion,phase);if(e){const [fx,fy,fw,fh]=FACE_RECTS[tone];drawArt(g,'characters/'+names[tone]+'-'+e+'.webp',{x:x+fx*z,y:y+fy*z,w:fw*z,h:fh*z});}

  g.restore();
 }
 const shutter=1-openAmount('window',s.windowOpen,now);
 if(shutter>.001){g.save();g.beginPath();g.rect(win.x,win.y,win.w,win.h);g.clip();drawArt(g,'items/shutter.webp',{...win,y:win.y-win.h*(1-shutter)});g.restore();}
 // A scalloped curtain masks the top of the visitor, never their face.
 // Repaint shell after the aperture so cloth, timber, and window edges occlude naturally.
 layer('room-shell');
 if(!s.windowOpen)text(g,'开窗营业',1102,670,25,F.paper,'center');
 hitWorld({x:990,y:625,w:230,h:125},'window','front');
 if(s.windowOpen&&(!motion||motion.stage==='idle'))hitWorld({x:940,y:430,w:325,h:270},'talk','front');
 for(const side of ['left','right']){layer('shelf-'+side+'-back');layer('shelf-'+side+'-structure');}
 const units=sceneObjectRects(s);
 for(const b of SHOP.shelves){
  const slot=s.slots[b.key];
  if(p.hand||p.restock||slot.qty===0)hitWorld(b,'slot',b.key);

  if(p.restock&&(!slot.sku||slot.sku===p.restock)){g.strokeStyle=F.warm;g.lineWidth=3/camera.z;g.strokeRect(b.x,b.y,b.w,b.h);}
  const sku=slot.sku||slot.lastSku;
  if(p.role==='manager'&&sku)hitWorld(b,'restock',sku,{gesture:'hold',focusKey:b.key});
 }
 for(const o of [...units].sort((a,b)=>b.depth-a.depth)){flatProduct(g,o.sku,o.x,o.y,o.w,o.h);if(!p.hand&&!p.restock)hitWorld(o,'slot',o.key,{itemId:o.id});}
 // Merchandise remains live beneath the independently authored shelf lips.
 for(const side of ['left','right'])for(let i=0;i<3;i++)layer('shelf-'+side+'-rail-'+i);
 for(const b of SHOP.shelves){const v=s.slots[b.key],sku=v.sku||v.lastSku;if(!sku)continue;
  const card={x:b.x+b.w/2-64,y:b.y+b.h+8,w:128,h:28};box(g,card,F.paper,0);text(g,(sku?GOODS[sku].name:'空位')+' '+v.qty,card.x+64,card.y+14,10/camera.z,F.ink,'center');}
 function storage(b,drawer){
  const amount=openAmount(b.key,Boolean(s.open[b.key]),now),slot=s.slots[b.key];
  if(!drawer){
   const side=b.key==='cabinetL'?'left':'right',q=part('cabinet-'+side+'-door'),inside=interiorRect(q);
   drawArt(g,'v4/shelf-'+side+'-back.webp',inside);
   if(amount>.98){const contents={x:b.x+15,y:b.y+30,w:b.w-30,h:b.h-40};
    for(const o of objectsAt(s,'slot:'+b.key)){const rr={x:contents.x+(o.socket??o.index)*55,y:contents.y,w:60,h:contents.h};flatProduct(g,o.sku,rr.x,rr.y,rr.w,rr.h);if(!p.hand&&!p.restock)hitWorld(rr,'slot',b.key,{itemId:o.id});}
    if(p.hand||p.restock||slot.qty===0)hitWorld(contents,'slot',b.key);
   }
   layer('cabinet-'+side+'-door',{...inside,w:inside.w*(1-amount*.87)});
   hitWorld(amount>.6?{x:b.x,y:b.y,w:50,h:b.h}:b,'toggle',b.key);
  }else{
   const face={...b,y:b.y+amount*85,h:b.h*(1-amount*.25)};
   drawArt(g,'v4/shelf-left-back.webp',b);
   if(amount>.98){
    const contents={x:b.x+20,y:b.y+5,w:b.w-40,h:95};
    for(const o of objectsAt(s,'slot:'+b.key)){const rr={x:contents.x+(o.socket??o.index)*65,y:contents.y,w:65,h:95};flatProduct(g,o.sku,rr.x,rr.y,rr.w,rr.h);if(!p.hand&&!p.restock)hitWorld(rr,'slot',b.key,{itemId:o.id});}
    if(p.hand||p.restock||slot.qty===0)hitWorld(contents,'slot',b.key);
    if(b.key==='drawerR'){
     const recycle=recyclingState(s);for(let i=0;i<recycle.stored;i++)flatProduct(g,'battery',contents.x+i*65,contents.y,55,95);
     if(recyclingCarried(s,viewerId))hitWorld(contents,'recycleStore',b.key);
     if(recycle.stored===RECYCLING.capacity)hitWorld(contents,'recycleShip',b.key,{gesture:'hold'});
    }
   }
   layer('drawer-'+(b.key==='drawerL'?'left':'right')+'-face',face);
   hitWorld(face,'toggle',b.key);
  }
  const sku=slot.sku||slot.lastSku;if(p.role==='manager'&&sku&&amount>.6)hitWorld(b,'restock',sku,{gesture:'hold',focusKey:b.key});
 }
 for(const b of SHOP.cabinets)storage(b,false);
 // The entire counter surface is a single continuous authored plane.
 layer('countertop');
 drawArt(g,'items/tray.webp',SHOP.mat);
 drawArt(g,'items/register.webp',SHOP.till,true);drawArt(g,'items/book.webp',SHOP.book,true);drawArt(g,'items/bell.webp',SHOP.bell,true);
 hitWorld(SHOP.mat,'counter','counter');hitWorld(SHOP.mat,'counter','counter',{gesture:'hold'});
 hitWorld(SHOP.till,'sell','front');hitWorld(SHOP.bell,'sell','front');if(p.role==='manager')hitWorld(SHOP.book,'catalog','counter');
 if(s.counter&&!itemMotion?.hideCounter)flatProduct(g,s.counter,SHOP.mat.x+85,SHOP.mat.y-15,110,145);
 if(motion?.handoff){
  const v=CHARACTERS[motion.tone],size=v.size||v.sourceSize,a=v.anchors,face=a.face,palm=a.palmLeft||a.leftPalm||a.receivingPalm,z=200/(palm[1]-face[1]);
  const dx=1102+(palm[0]-face[0])*z+(motion.offset||0)*win.w,dy=565+(palm[1]-face[1])*z,t=motion.handoff.progress;
  g.save();g.beginPath();g.rect(win.x,win.y,win.w,SHOP.mat.y+SHOP.mat.h-win.y);g.clip();
  flatProduct(g,motion.handoff.sku,SHOP.mat.x+85+(dx-55-SHOP.mat.x-115)*t,SHOP.mat.y-15+(dy-85-SHOP.mat.y+25)*t,110,145);g.restore();
 }
 if(motion?.payment){const t=motion.payment.progress;text(g,'+¥'+motion.payment.amount,1280+80*t,1010-60*t,22,F.warm,'center');}
 for(const b of SHOP.drawers)storage(b,true);
 if(s.windowOpen&&s.spoken&&visitor(s).favor){const b={x:SHOP.win.x+285,y:650,w:140,h:100};drawArt(g,'items/book.webp',b);text(g,GOODS[visitor(s).favor.sku].name+'委托',b.x+b.w/2,b.y+50,22,F.ink,'center');hitWorld(b,'commission','front');}
 if(recyclingOffer(s)&&(!motion||motion.stage==='idle')){const b={x:940,y:650,w:90,h:110};flatProduct(g,'battery',b.x,b.y,b.w,b.h);hitWorld(b,'recycleReceive','front');}
 g.restore();
 // One compact speech card above the customer: no stacked status panels across the face.
 const feedbackVisible=ui.feedback?.anchor&&ui.feedback.until>now&&!ui.catalog;
 if(s.windowOpen&&motion?.speechVisible!==false&&!feedbackVisible&&['front','customer','free'].includes(ui.focus||'front')){
  const speech=customerSpeech(s,motion);if(speech){
   const center=projectedRect({x:1102,y:565,w:0,h:0},camera,W,H);
   if(center.x>40&&center.x<W-40&&center.y>96&&center.y<H-50){
    const side=W/H>=1.2,bw=Math.min(side?210:205,W-24);
    const b={x:side?Math.max(12,Math.min(W-bw-12,center.x+125*camera.z)):(W-bw)/2,y:Math.max(65,side?center.y-55:center.y-145),w:bw,h:64};
    // A small irregular paper edge, matching the approved menu's graphic grammar.
    g.fillStyle=F.ink;g.fillRect(b.x+3,b.y+4,b.w,b.h);
    box(g,b,F.paper,2);g.fillStyle=F.warm;g.fillRect(b.x,b.y,4,b.h);
    text(g,speech.name+' · '+GOODS[visitor(s).sku].name,b.x+12,b.y+14,12,F.blue);
    wrapSpeech(speech.text,Math.floor((bw-24)/13),2).forEach((line,i)=>text(g,line,b.x+12,b.y+33+i*17,13,F.ink));
   }
  }
 }
 if(ui.feedback?.anchor&&ui.feedback.until>now&&!ui.catalog){
  const a=projectedRect(ui.feedback.anchor,camera,W,H);
  if(a.x+a.w>0&&a.x<W&&a.y+a.h>56&&a.y<H){const w=Math.min(260,W-24),b={x:Math.max(12,Math.min(W-w-12,a.x+a.w/2-w/2)),y:Math.max(112,Math.min(H-66,a.y-65)),w,h:56};
   box(g,b,F.paper,6);wrapSpeech(ui.feedback.text,Math.floor((w-20)/14),2).forEach((line,i)=>text(g,line,b.x+10,b.y+17+i*20,14,F.ink));
  }
 }
 if(p.hand||recyclingCarried(s,viewerId)||itemMotion?.stage==='place'){
  const sku=p.hand||(recyclingCarried(s,viewerId)?'battery':itemMotion.sku),t=itemMotion?.progress??1;
  const held={x:W-118,y:H-175,w:72,h:100},tray=projectedRect({x:SHOP.mat.x+85,y:SHOP.mat.y-15,w:110,h:145},camera,W,H);
  let from=held,to=held,progress=1;
  if(itemMotion?.stage==='place'){from=held;to=tray;progress=t;}
  else if(itemMotion?.stage==='take'){from=tray;to=held;progress=t;}
  else if(itemMotion?.stage==='pickup'&&ui.actionAnchor){from=projectedRect(ui.actionAnchor,camera,W,H);to=held;progress=t;}
  const r={};for(const key of ['x','y','w','h'])r[key]=from[key]+(to[key]-from[key])*progress;
  const palm={x:r.x+r.w/2,y:r.y+r.h*.85},exit={x:W+8,y:H+12},vx=palm.x-exit.x,vy=palm.y-exit.y;
  const scale=Math.hypot(vx,vy)/Math.hypot(272,229),angle=Math.atan2(vy,vx)-Math.atan2(-229,-272);
  const hand=artImage('items/player-hand.webp');
  if(hand?.complete&&hand.naturalWidth){g.save();g.translate(exit.x,exit.y);g.rotate(angle);g.scale(scale,scale);g.globalAlpha=itemMotion?.stage==='place'?1-Math.max(0,t-.8)*4:1;g.drawImage(hand,-512,-512,512,512);g.restore();}
  flatProduct(g,sku,r.x,r.y,r.w,r.h);
 }
 box(g,{x:0,y:0,w:W,h:56},F.ink,0);text(g,'冬日杂货店',62,25,W<360?15:17);text(g,'第'+s.day+'天 · '+s.served+'/5',W*.61,25,13,F.warm,'center');text(g,'¥'+s.cash,W-12,25,17,F.paper,'right');
 if(!active){box(g,{x:0,y:56,w:W,h:H-56},'#263459d9');const st=artStatus();text(g,st.failed.length?'美术资源加载失败，请联网刷新':'正在布置小店 '+st.ready+'/'+st.total,W/2,H/2,16,F.paper,'center');}
 if(ui.catalog)catalog(g,hits,W,H,s,ui.page);
 if(s.phase==='summary'){
  hits.length=0;box(g,{x:0,y:0,w:W,h:H},'#1E294Df5',0);const dy=Math.min(40,H*.09),cy=H/2;
  text(g,'今日打烊',W/2,cy-dy*3,28,F.warm,'center');const bill=dailyOverhead(s),rows=['接待 '+s.served+' 位邻居 · 评分 '+s.dayRating+'/5','销售 ¥'+s.earnings+' · 委托 ¥'+(s.favorTips||0),'进货 -¥'+(s.dayExpenses||0)+' · 租暖 -¥'+bill.total,'净额 ¥'+s.dayNet+' · 现金 ¥'+s.cash];
  rows.forEach((v,i)=>text(g,v,W/2,cy-dy*1.6+i*dy,16,F.paper,'center',W-24));const b={x:W*.1,y:cy+dy*2.7,w:W*.8,h:48};label(g,b,'开始下一天',true,18);if(p.role==='manager')target(hits,b,'nextday');
 }
 return hits;
}
