// Flat, independently interactive first shop. Coordinates are CSS pixels.
import {GOODS,visitor,slotRoom,shelfUpgradeCost,heatingUpgradeCost,dailyOverhead} from "./kiosk-core.js";
import {recyclingOffer,recyclingCarried,recyclingState,RECYCLING} from "./kiosk-business.js";
import {shopLayout,shopTask} from "./kiosk-shop-layout.js";
import {flatStreet,flatCustomer,flatProduct,flatShelfBase,flatCupboard,flatDrawer,flatWindow,flatMat,F} from "./kiosk-flat.js";
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
  if(Array.from(current).length>=width){result.push(current);current="";}
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
function bubble(g,b,name,message){
 box(g,b,F.paper,8);text(g,name,b.x+10,b.y+16,13,F.blue);
 const rows=wrapSpeech(message,Math.max(5,Math.floor((b.w-20)/14)),3);
 rows.forEach((s,i)=>text(g,s,b.x+10,b.y+38+i*18,14,F.ink));
}
const cast=[
 {file:'tone0-master.webp',size:[560,1100],face:[324,180],palm:[184,445]},
 {file:'tone1-master.webp',size:[560,1100],face:[280,184],palm:[200,452]},
 {file:'courier-master.webp',size:[948,1660],face:[483,273],palm:[341,672]},
 {file:'tone3-master.webp',size:[560,1100],face:[250,189],palm:[184,447]}
].map(v=>{if(typeof Image!=='undefined'){v.img=new Image();v.img.src='./assets/rig/customer/'+v.file;}return v;});
const elderFaces=Object.fromEntries(['smile','concern','talk'].map(name=>{
 const image=typeof Image!=='undefined'?new Image():null;if(image)image.src='./assets/rig/customer/elder-'+name+'.webp';return [name,image];
}));
export function customerExpression(motion,phase){
 if(motion?.refusing)return 'concern';
 if(motion?.receiving)return 'smile';
 if(motion?.talking&&Math.floor(phase/14)%2)return 'talk';
 return phase%240>232?'smile':null;
}
function customerPose(b,s,motion){
 const entry=cast[motion?.tone??visitor(s).tone],dh=b.h*1.65,scale=dh/entry.size[1];
 const x=b.x+b.w*(b.w>260?.32:.50)-entry.face[0]*scale+(motion?.offset||0)*b.w,y=b.y+b.h*.02;
 return {entry,x,y,w:entry.size[0]*scale,h:dh,palm:{x:Math.max(b.x+18,Math.min(b.x+b.w-18,x+entry.palm[0]*scale)),y:Math.min(b.y+b.h-45,y+entry.palm[1]*scale)}};
}
function customer(g,b,s,motion,phase){
 if(!s.windowOpen||motion?.visible===false)return;
 const pose=customerPose(b,s,motion),img=pose.entry.img;
 g.save();g.beginPath();g.rect(b.x,b.y,b.w,b.h);g.clip();
 if(img?.complete&&img.naturalWidth){
  // Complete full-body master; the real window/counter naturally occludes legs.
  g.drawImage(img,pose.x,pose.y,pose.w,pose.h);
  if(pose.entry===cast[0]){
   const patch=elderFaces[customerExpression(motion,phase)],scale=pose.h/1100;
   // Local eyes/brows/mouth only; never replace or blink away the head/body.
   if(patch?.complete&&patch.naturalWidth)g.drawImage(patch,pose.x+265*scale,pose.y+110*scale,130*scale,130*scale);
  }
 }else flatCustomer(g,{...b,x:b.x+(motion?.offset||0)*b.w,y:b.y+b.h*.20,h:b.h*.85,tone:motion?.tone??visitor(s).tone,phase,talking:motion?.talking,receiving:motion?.receiving,refusing:motion?.refusing});
 g.restore();
}
function inventory(g,hits,b,key,s,p){
 const v=s.slots[key],sku=v.sku||v.lastSku;
 flatShelfBase(g,b.x,b.y,b.w,b.h);
 const labelH=b.h<80?20:44,body={...b,h:b.h-labelH};
 const kind=sku?GOODS[sku].name:'空货架';
 if(v.qty){
  const n=Math.min(3,v.qty),pw=Math.min(35,(b.w-12)/n);
  for(let i=0;i<n;i++)flatProduct(g,sku,b.x+6+i*pw,b.y+2,pw,Math.max(24,body.h-4));
 }
 const stocking=Boolean(p.restock),chosen=stocking&&(!v.sku||v.sku===p.restock);
 if(chosen){g.strokeStyle=F.warm;g.lineWidth=3;g.strokeRect(b.x+2,b.y+2,b.w-4,b.h-4);}
 // The shelf itself is at least 44 CSS px. Purchase remains a hold on that fixture.
 target(hits,b,'slot',key);
 if(p.role==='manager'&&sku)target(hits,b,'restock',sku,'hold');
 box(g,{x:b.x+3,y:b.y+b.h-labelH-2,w:b.w-6,h:labelH},F.ink,2);
 text(g,kind+' '+v.qty+(sku?'/'+slotRoom(key,sku,s):''),b.x+b.w/2,b.y+b.h-(labelH>20?29:12),14,F.paper,'center',b.w-6);
 if(labelH>20)text(g,stocking?'点此放货':'点击拿货',b.x+b.w/2,b.y+b.h-12,12,chosen?F.warm:F.pale,'center',b.w-6);
}
function storage(g,hits,b,s,p,cabinet=false){
 const key=b.key,open=s.open[key],entry=s.slots[key];
 (cabinet?flatCupboard:flatDrawer)(g,b.x,b.y,b.w,b.h,open);
 const name=key==='drawerR'&&recyclingState(s).stored?'回收 '+recyclingState(s).stored+'/3':(cabinet?'储物柜':'抽屉');
 if(open){
  const door={x:b.x,y:b.y,w:44,h:b.h};
  const content={x:b.x+44,y:b.y,w:b.w-44,h:b.h};
  if(entry.qty)flatProduct(g,entry.sku,content.x+3,content.y+3,32,Math.max(28,b.h-24));
  text(g,'关',door.x+22,door.y+door.h/2,14,F.blue,'center');
  text(g,name,content.x+content.w/2,b.y+b.h-11,13,F.ink,'center',content.w-4);
  target(hits,content,'slot',key);target(hits,door,'toggle',key);
  const sku=entry.sku||entry.lastSku;
  if(p.role==='manager'&&sku)target(hits,content,'restock',sku,'hold');
  if(key==='drawerR'){
   if(recyclingCarried(s,p.id))target(hits,content,'recycleStore');
   if(recyclingState(s).stored===RECYCLING.capacity)target(hits,content,'recycleShip',undefined,'hold');
  }
 }else{
  text(g,name+(entry.qty?' · '+entry.qty:''),b.x+b.w/2,b.y+b.h*.30,13,F.ink,'center',b.w-8);
  target(hits,b,'toggle',key);
 }
}
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
export function render(g,s,view,phase=0,viewerId=null,motion=null,itemMotion=null,ui={}){
 const {W,H}=view,hits=[],l=shopLayout(W,H),p=s.players?.[viewerId]||Object.values(s.players||{})[0]||{};
 box(g,{x:0,y:0,w:W,h:H},F.ink,0);
 // Continuous flat wall, independent shelves, a real service aperture and worktop.
 box(g,{x:4,y:56,w:W-8,h:H-60},F.blue,0);
 text(g,'冬日杂货店',66,27,W<360?16:18,F.paper);
 text(g,'第'+s.day+'天 · '+s.served+'/5',W*.63,27,14,F.warm,'center');
 text(g,'¥'+s.cash,W-12,27,18,F.paper,'right');
 if(!l.wide){
  const note={x:8,y:64,w:W-16,h:70};box(g,note,F.paper,5);
  text(g,'今日营业单 · 接待五位邻居',20,82,15,F.ink);
  text(g,shopTask(s,p),20,106,14,F.blue,'left',W-40);
  text(g,s.notice,20,124,12,F.ink,'left',W-40);
 }else text(g,shopTask(s,p),W*.51,49,13,F.paper,'center',W-145);
 // Main window: street, full-body source, frame, anchored dialogue, sill latch.
 const win=l.win;
 flatStreet(g,win.x,win.y,win.w,win.h,phase);customer(g,win,s,motion,phase);
 flatWindow(g,win.x,win.y,win.w,win.h,s.windowOpen);
 if(s.windowOpen&&(!motion||motion.stage==='idle'))target(hits,{x:win.x,y:win.y,w:win.w,h:Math.max(44,win.h-100)},'talk');
 const latch={x:win.x+(win.w-Math.min(160,win.w))/2,y:win.y+win.h-38,w:Math.min(160,win.w),h:44};
 label(g,latch,s.windowOpen?'关窗整理':'开窗营业',!s.windowOpen,14);target(hits,latch,'window');
 if(s.windowOpen&&motion?.speechVisible!==false){
  const speech=customerSpeech(s,motion);
  if(speech){
   const bw=win.w>260?Math.min(230,win.w*.43):win.w-4;
   const fullSpeech=s.spoken&&win.h>=300;
   const bh=fullSpeech?96:56;
   const b={x:win.w>260?win.x+win.w-bw-6:win.x+2,y:win.w>260?win.y+6:win.y+Math.max(win.h*.46,win.h-bh-98),w:bw,h:bh};
   if(fullSpeech)bubble(g,b,speech.name,speech.text);
   else {box(g,b,F.paper,8);text(g,speech.name,b.x+8,b.y+13,13,F.blue);const favor=s.spoken&&!s.favorDone&&visitor(s).favor;
    text(g,favor?'帮带'+GOODS[favor.sku].name:'要'+GOODS[visitor(s).sku].name+' · ¥'+GOODS[visitor(s).sku].price,b.x+8,b.y+36,14,F.ink,'left',b.w-12);}
  }
 }
 for(const b of l.shelves)inventory(g,hits,b,b.key,s,p);
 for(const b of l.cabinets)storage(g,hits,b,s,p,true);
 // Worktop: each object is itself the interaction target.
 box(g,l.counter,F.paper,5);box(g,{...l.counter,y:l.counter.y+l.counter.h-8,h:8},F.ink,0);
 const {mat,till,book}=l;
 flatMat(g,mat.x,mat.y,mat.w,mat.h);
 if(s.counter&&!itemMotion?.hideCounter)flatProduct(g,s.counter,mat.x+mat.w/2-20,mat.y+2,40,mat.h-22);
 text(g,s.counter?'点击取回':'交接台 · 放货',mat.x+mat.w/2,mat.y+mat.h-12,14,F.paper,'center',mat.w-6);
 target(hits,mat,'counter');target(hits,mat,'counter',undefined,'hold');
 box(g,till,F.ink,5);box(g,{x:till.x+7,y:till.y+7,w:till.w-14,h:24},F.mint,3);
 text(g,s.counter?'¥'+GOODS[s.counter].price:'收银机',till.x+till.w/2,till.y+19,15,F.ink,'center');
 text(g,'点击收款',till.x+till.w/2,till.y+till.h-13,14,F.paper,'center');target(hits,till,'sell');
 label(g,book,p.role==='manager'?'进货簿':'店员手册',false,16);
 if(p.role==='manager')target(hits,book,'catalog');
 if(motion?.handoff){const t=motion.handoff.progress,palm=customerPose(win,s,motion).palm;
  g.save();g.beginPath();g.rect(win.x,win.y,win.w,mat.y+mat.h-win.y);g.clip();
  flatProduct(g,motion.handoff.sku,mat.x+mat.w/2-18+(palm.x-mat.x-mat.w/2)*t,mat.y+(palm.y-22-mat.y)*t,36,44);g.restore();
 }
 if(s.upgrades?.heating) {g.strokeStyle=F.mint;g.lineWidth=3;g.strokeRect(win.x-4,win.y-4,win.w+8,win.h+8);}
 if(s.upgrades?.shelves)for(const b of l.shelves){box(g,{x:b.x,y:b.y+b.h-4,w:b.w,h:4},F.warm,0);}
 if(recyclingCarried(s,p.id)){flatProduct(g,'battery',mat.x+mat.w-40,mat.y-24,34,44);text(g,'待回收',mat.x+mat.w-24,mat.y-32,12,F.warm,'center');}
 if(motion?.payment){const t=motion.payment.progress;box(g,{x:win.x+win.w/2+(till.x-win.x-win.w/2)*t,y:win.y+win.h*.65+(till.y-win.y-win.h*.65)*t,w:32,h:18},F.mint,2);text(g,'+¥'+motion.payment.amount,till.x+till.w/2,till.y-10,15,F.warm,'center');}
 for(const b of l.drawers)storage(g,hits,b,s,p);
 if(p.hand||itemMotion?.sku&&itemMotion.stage==='place'){const hand={x:mat.x+mat.w-42,y:mat.y-30,w:42,h:44};
  g.save();g.beginPath();g.moveTo(hand.x+48,mat.y+mat.h-2);g.lineTo(hand.x+7,hand.y+31);g.lineTo(hand.x+30,hand.y+19);g.lineTo(hand.x+72,mat.y+mat.h-2);g.closePath();g.fillStyle=F.ink;g.fill();
  box(g,{x:hand.x+6,y:hand.y+20,w:29,h:25},F.paper,10);g.restore();
  const progress=itemMotion?.progress||0;const placing=itemMotion?.stage==='place';const dy=placing?(mat.y-hand.y)*progress:itemMotion?.stage==='pickup'?24*(1-progress):0;flatProduct(g,p.hand||itemMotion.sku,hand.x,hand.y+dy,hand.w,hand.h);text(g,'手持',hand.x+21,hand.y-9,12,F.warm,'center');}
 // Commission slip and used battery appear next to the speaker, never a command bar.
 if(s.windowOpen&&s.spoken&&visitor(s).favor){
  const b={x:win.x+52,y:win.y+win.h-92,w:win.w-52,h:48};label(g,b,s.favorDone?'已办妥':'交委托',!s.favorDone,14);target(hits,b,'commission');
 }
 if(recyclingOffer(s)){
  const palm=customerPose(win,s,motion).palm,b={x:Math.max(win.x,Math.min(win.x+win.w-48,palm.x-24)),y:Math.min(win.y+win.h-94,palm.y-32),w:48,h:48};
  flatProduct(g,'battery',b.x+8,b.y,32,38);text(g,'旧电池',b.x+24,b.y+44,12,F.warm,'center');target(hits,b,'recycleReceive');
 }
 if(ui.catalog)catalog(g,hits,W,H,s,ui.page);
 if(s.phase==='summary'){
  hits.length=0;box(g,{x:0,y:0,w:W,h:H},'#1E294Df5',0);
  const w=Math.min(420,W-24),x=(W-w)/2,cy=H/2,dy=Math.min(42,H*.09);
  text(g,'今日打烊',W/2,cy-dy*3,28,F.warm,'center');
  const bill=dailyOverhead(s),rows=['接待 '+s.served+' 位邻居 · 评分 '+s.dayRating+'/5','销售 ¥'+s.earnings+' · 委托 ¥'+(s.favorTips||0),'进货 -¥'+(s.dayExpenses||0)+' · 租暖 -¥'+bill.total,'净额 ¥'+s.dayNet+' · 现金 ¥'+s.cash];
  rows.forEach((v,i)=>text(g,v,W/2,cy-dy*1.6+i*dy,16,F.paper,'center',w));
  const b={x,y:cy+dy*2.8,w,h:48};label(g,b,'开始下一天',true,18);if(p.role==='manager')target(hits,b,'nextday');
 }
 return hits;
}
