// Monochrome silhouette workbench: one permanent view, no camera/zoom or cabinet doors.
// Pure #000/#fff vector geometry; gameplay state remains authoritative in kiosk-core.
import {GOODS,FIXTURES,visitor,dailyOverhead,shelfUpgradeCost,heatingUpgradeCost} from './kiosk-core.js';
// Old battery-recycling minigame removed from the visible gameplay UI.

export const SILHOUETTE=Object.freeze({black:'#000000',white:'#ffffff'});
const B=SILHOUETTE.black,W=SILHOUETTE.white;
function rect(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
function line(g,x1,y1,x2,y2,width=2){g.strokeStyle=B;g.lineWidth=width;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();}
function txt(g,s,x,y,size=13,c=B,align='left',max){g.fillStyle=c;g.textAlign=align;g.textBaseline='middle';g.font='600 '+size+'px system-ui,"Noto Sans CJK SC",sans-serif';g.fillText(String(s),x,y,max);}
function panel(g,r,filled=false){rect(g,r.x,r.y,r.w,r.h,filled?B:W);if(!filled){g.strokeStyle=B;g.lineWidth=2;g.strokeRect(Math.round(r.x)+1,Math.round(r.y)+1,Math.max(0,Math.round(r.w)-2),Math.max(0,Math.round(r.h)-2));}}
function hit(hits,r,cmd,key,itemId){hits.push({...r,cmd,key,itemId,gesture:'tap'});}
function button(g,hits,r,title,cmd,key,disabled=false){
 panel(g,r,!disabled);
 txt(g,title,r.x+r.w/2,r.y+r.h/2,Math.min(15,Math.max(11,Math.floor(r.w/6))),disabled?B:W,'center',r.w-8);
 if(!disabled)hit(hits,r,cmd,key);
}
function person(g,x,y,w,h,motion){
 // All-black human silhouette. No facial features, outline shading or imported sprites.
 const dx=(motion?.offset||0)*w*.6;
 g.save();g.translate(Math.round(dx),0);rect(g,x+w*.39,y,w*.22,h*.12,B);
 // hat brim + head
 rect(g,x+w*.30,y+h*.07,w*.40,h*.035,B);
 rect(g,x+w*.35,y+h*.10,w*.30,h*.17,B);
 // neck and padded winter coat
 rect(g,x+w*.42,y+h*.25,w*.16,h*.10,B);
 g.fillStyle=B;g.beginPath();g.moveTo(x+w*.31,y+h*.30);g.lineTo(x+w*.69,y+h*.30);
 g.lineTo(x+w*.81,y+h*.91);g.lineTo(x+w*.19,y+h*.91);g.closePath();g.fill();
 rect(g,x+w*.10,y+h*.38,w*.15,h*.43,B);rect(g,x+w*.75,y+h*.38,w*.15,h*.43,B);
 rect(g,x+w*.24,y+h*.88,w*.20,h*.12,B);rect(g,x+w*.56,y+h*.88,w*.20,h*.12,B);
 g.restore();
}
function skyline(g,r,phase,motionEnabled){
 // Negative-space snow: white sky, distant solid-black apartment blocks.
 rect(g,r.x,r.y,r.w,r.h,W);
 const bottom=r.y+r.h,base=bottom-r.h*.24;
 for(let i=0;i<7;i++){
  const x=r.x+(i*173%103)/103*r.w,w=r.w*(.09+(i%3)*.035),h=r.h*(.12+(i%4)*.045);
  rect(g,x,base-h,w,h,B);
  for(let col=0;col<3;col++)for(let row=0;row<3;row++){
   const wx=x+5+col*9,wy=base-h+6+row*11;
   if(wx+3<x+w-2&&wy+5<base)rect(g,wx,wy,3,5,W);
  }
 }
 // Pixel-sharp bare trees, street poles and snowdrifts.
 for(const k of [.12,.78,.90]){
  const x=r.x+r.w*k,y=bottom-r.h*.21;
  rect(g,x,y-r.h*.23,2,r.h*.23,B);
  line(g,x,y-r.h*.17,x-r.w*.06,y-r.h*.26,2);
  line(g,x,y-r.h*.14,x+r.w*.05,y-r.h*.22,2);
  line(g,x,y-r.h*.09,x-r.w*.04,y-r.h*.15,2);
 }
 rect(g,r.x,base,r.w,bottom-base,B);
 for(let i=0;i<9;i++){
  const x=r.x+(i*67%101)/101*r.w,y=base+5+(i%3)*6;
  rect(g,x,y,6+i%3*3,2,W);
 }
 if(motionEnabled)for(let i=0;i<11;i++){
  const sx=r.x+((i*67+13)%97)/97*r.w,sy=r.y+((i*31+Math.floor(phase*(.3+i%3*.07)))%Math.max(1,Math.floor(r.h*.62)));
  rect(g,sx,sy,2,2,B);
 }
}
function product(g,sku,x,y,w,h){
 // Hard silhouettes for recognisable merchandise, never coloured/original GPT assets.
 const bw=Math.min(w*.64,h*.55),cx=x+w/2,cy=y+h/2;
 if(sku==='tea'){rect(g,cx-bw*.45,cy-h*.22,bw*.9,h*.44,B);
  g.strokeStyle=B;g.lineWidth=3;g.strokeRect(cx+bw*.4,cy-h*.14,bw*.25,h*.25);
  rect(g,cx-bw*.52,cy+h*.22,bw*1.04,3,B);
 }else if(sku==='bread'){
  rect(g,cx-bw*.58,cy-h*.04,bw*1.16,h*.31,B);
  g.fillStyle=B;g.beginPath();g.arc(cx,cy-h*.04,bw*.56,Math.PI,0);g.fill();
 }else if(sku==='battery'){
  rect(g,cx-bw*.23,cy-h*.27,bw*.46,h*.54,B);rect(g,cx-bw*.13,cy-h*.32,bw*.26,h*.06,B);
  rect(g,cx-bw*.17,cy-h*.06,bw*.34,3,W);
 }else{
  rect(g,cx-bw*.43,cy-h*.30,bw*.86,h*.6,B);rect(g,cx-bw*.29,cy-h*.36,bw*.58,h*.07,B);
  rect(g,cx-bw*.30,cy+h*.02,bw*.60,3,W);
 }
}
const LEFT=['cabinetL','shelfL1','shelfL2','shelfL3','drawerL'];
const RIGHT=['cabinetR','shelfR1','shelfR2','shelfR3','drawerR'];
export function silhouetteLayout(width,height){
 const Wd=Math.max(260,width),Hd=Math.max(300,height);
 const top=58,footer=Hd<460?99:Hd<670?116:140,side=Math.min(119,Math.max(75,Math.round(Wd*(Wd/Hd>1.1?.16:.255))));
 const gutter=Wd<360?6:12;
 const left={x:8,w:side},right={x:Wd-side-8,w:side};
 const center={x:left.x+side+gutter,w:Wd-2*(side+8+gutter)};
 const end=Hd-footer-6,row=(end-top-5)/5;
 return {width:Wd,height:Hd,top,footer,left,right,center,end,row,
  window:{x:center.x,y:top+4,w:center.w,h:Math.max(84,(end-top)*.59)},
  tray:{x:center.x,y:top+8+Math.max(84,(end-top)*.59),w:center.w,h:Math.max(44,end-(top+8+Math.max(84,(end-top)*.59)))},
  slot:(key)=>{const sideList=LEFT.includes(key)?LEFT:RIGHT,i=sideList.indexOf(key),s=LEFT.includes(key)?left:right;
   return {x:s.x,y:top+i*row+2,w:s.w,h:Math.max(44,row-3)};}
 };
}
function inventory(g,hits,s,p,L,sideKeys,phase){
 for(const key of sideKeys){
  const r=L.slot(key),slot=s.slots[key],held=Boolean(p.hand),stocking=Boolean(p.restock);
  const valid=stocking?(!slot.sku||slot.sku===p.restock):held?(!slot.sku||slot.sku===p.hand):slot.qty>0;
  panel(g,r,false);
  // Both closed cabinets and drawers become permanent open storage positions.
  if(slot.sku)product(g,slot.sku,r.x,r.y+3,r.w,r.h*.66);
  txt(g,FIXTURES[key].label.replace('货架·','·').replace('吊柜','储物格').replace('抽屉','储物格'),
   r.x+5,r.y+r.h-14,Math.max(9,Math.min(11,r.w*.095)),B,'left',r.w-32);
  txt(g,String(slot.qty),r.x+r.w-7,r.y+r.h-14,12,B,'right');
  hit(hits,r,'slot',key);
  if((stocking||held)&&valid){g.strokeStyle=B;g.lineWidth=3;g.strokeRect(r.x+3,r.y+3,r.w-6,r.h-6);}
 }
}
function footer(g,hits,L,s,p,by){
 const Wd=L.width,Hd=L.height,y=Hd-L.footer+5,gap=6;
 const cmds=[{cmd:'counter',t:p.hand?'放到交接台':s.counter?'取回商品':'交接台',enabled:Boolean(p.hand||s.counter)},
             {cmd:'sell',t:'确认收款',enabled:Boolean(s.counter)},
             {cmd:'catalog',t:'进货',enabled:p.role==='manager'},
             {cmd:'storyOpen',t:'街坊故事',enabled:true}];
 const landscape=Wd/Hd>=1.15,cols=landscape?4:2,bw=(Wd-16-(cols-1)*gap)/cols,bh=landscape?52:Math.max(44,Math.min(50,(L.footer-28-gap)/2));
 cmds.forEach((a,i)=>{const col=i%cols,row=Math.floor(i/cols),b={x:8+col*(bw+gap),y:y+row*(bh+gap),w:bw,h:bh};button(g,hits,b,a.t,a.cmd,null,!a.enabled);});
 txt(g,p.hand?'手持：'+GOODS[p.hand].name:p.restock?'正在补货：'+GOODS[p.restock].name:s.counter?'交接台：'+GOODS[s.counter].name:'直接点货位拿取 · 点台面交付',
     Wd/2,Hd-8,12,B,'center',Wd-14);
}
function overlay(g,hits,L,s,page){
 const Wd=L.width,Hd=L.height;
 rect(g,0,0,Wd,Hd,W);rect(g,0,0,Wd,4,B);rect(g,0,Hd-4,Wd,4,B);
 const w=Math.min(430,Wd-18),x=(Wd-w)/2,top=Math.max(12,Hd*.06),heading=36;
 txt(g,'进货与改造',x+8,top+15,21,B);
 button(g,hits,{x:x+w-72,y:top,w:72,h:44},'关闭','closeCatalog');
 const taby=top+52;
 button(g,hits,{x,y:taby,w:(w-8)/2,h:44},'进货','catalogPage','goods');
 button(g,hits,{x:x+(w+8)/2,y:taby,w:(w-8)/2,h:44},'改造','catalogPage','improve');
 const lines=page==='improve'?
 [{label:'扩充货架',meta:shelfUpgradeCost(s)===null?'已满级':'¥'+shelfUpgradeCost(s),cmd:'upgrade'},
  {label:'保温改造',meta:heatingUpgradeCost(s)===null?'已完成':'¥'+heatingUpgradeCost(s),cmd:'heat'}]:
 Object.entries(GOODS).map(([sku,a])=>({label:a.name,meta:'进 ¥'+a.buy,cmd:'restock',sku}));
 lines.forEach((a,i)=>{const y=taby+52+i*58;if(y+48>Hd-15)return;
  const b={x,y,w,h:50};panel(g,b);txt(g,a.label,x+12,y+25,17,B);
  txt(g,a.meta,x+w-83,y+25,13,B,'right',80);
  const action={x:x+w-77,y:y+3,w:74,h:44};
  button(g,hits,action,'选择',a.cmd,a.sku);
 });
 txt(g,'选商品后，直接点击任意开放货位',Wd/2,Math.min(Hd-20,taby+55+lines.length*58),12,B,'center',Wd-12);
}
export function renderSilhouette(g,s,view,phase=0,viewerId=null,motion=null,itemMotion=null,ui={}){
 const {W:rawW,H:rawH}=view,L=silhouetteLayout(rawW,rawH),Wv=L.width,Hv=L.height;
 const hits=[],p=s.players?.[viewerId]||Object.values(s.players||{})[0]||{},name=s.windowOpen?visitor(s):null;
 rect(g,0,0,Wv,Hv,W);
 // Bare black/white architecture; every working object remains in the same fixed frame.
 rect(g,0,48,Wv,3,B);rect(g,0,Hv-L.footer-2,Wv,2,B);
 txt(g,'无名小店',63,24,17,B);txt(g,'第 '+s.day+' 天   '+s.served+'/5',Wv*.64,24,13,B,'center');txt(g,'¥'+s.cash,Wv-10,24,17,B,'right');
 const win=L.window;
 panel(g,{x:win.x-3,y:win.y-3,w:win.w+6,h:win.h+6});
 g.save();g.beginPath();g.rect(win.x,win.y,win.w,win.h);g.clip();
 skyline(g,win,phase,ui.motion!==false);
 if(name&&motion?.visible!==false)person(g,win.x+win.w*.16,win.y+win.h*.16,win.w*.68,win.h*.95,motion);
 g.restore();
 // Narrative animation cue is visual only and never mutates the authoritative state.
 const cue=ui.storyCue;
 if(cue&&!cue.done){
  if(cue.track==='paper'){
   const px=win.x+win.w-26+cue.offsetX,py=win.y+8+cue.offsetY;
   rect(g,px,py,18,25,W);rect(g,px+3,py+5,12,2,B);rect(g,px+3,py+11,9,2,B);
  }else if(cue.track==='cup'){
   const cx=win.x+win.w*.58+cue.offsetX,cy=win.y+win.h*.82+cue.offsetY;
   rect(g,cx,cy,17,13,B);rect(g,cx+3,cy-3,11,3,B);
  }
 }
 // Open aperture stays open. Touch it to talk; never navigates or zooms.
 const talk={x:win.x,y:win.y,w:win.w,h:win.h};
 hit(hits,talk,'talk');
 const labelH=Math.max(25,Math.min(34,win.h*.17)),caption={x:win.x,y:win.y+win.h-labelH,w:win.w,h:labelH};
 panel(g,caption,true);
 txt(g,name?'交谈 · '+name.name:'等待顾客',caption.x+caption.w/2,caption.y+caption.h/2,
   Math.min(13,Math.max(10,win.w/11)),W,'center',caption.w-6);
 const tr=L.tray;panel(g,tr);line(g,tr.x+8,tr.y+8,tr.x+tr.w-8,tr.y+8,2);
 if(s.counter)product(g,s.counter,tr.x,tr.y+8,tr.w,tr.h*.72);
 else if(p.hand)product(g,p.hand,tr.x,tr.y+8,tr.w,tr.h*.72);
 txt(g,'交 接 台',tr.x+tr.w/2,tr.y+tr.h-15,Math.min(15,Math.max(11,tr.w/8)),B,'center',tr.w-6);
 hit(hits,tr,'counter');
 inventory(g,hits,s,p,L,LEFT,phase);inventory(g,hits,s,p,L,RIGHT,phase);
 // Explicit dialog/action is direct, not a tap-to-focus then tap-to-act ritual.
 const lineY=Math.min(tr.y-9,win.y+win.h-3);
 if(name)txt(g,'需 '+GOODS[name.sku].name,win.x+win.w/2,lineY,Math.max(10,Math.min(13,win.w/10)),B,'center',win.w-8);
 if(name?.favor&&s.spoken&&!s.favorDone){const b={x:win.x,y:tr.y-52,w:win.w,h:44};button(g,hits,b,'完成邻里委托','commission');}
 footer(g,hits,L,s,p,viewerId);
 if(s.notice||ui.feedback?.text){const t=ui.feedback?.until>performance.now()?ui.feedback.text:s.notice;
  const msg={x:10,y:Math.max(51,Hv-L.footer-37),w:Wv-20,h:30};panel(g,msg,true);
  txt(g,t,msg.x+6,msg.y+15,12,W,'left',msg.w-12);}
 if(ui.catalog){hits.length=0;overlay(g,hits,L,s,ui.page);}
 if(s.phase==='summary'){
  hits.length=0;rect(g,0,0,Wv,Hv,W);txt(g,'今日打烊',Wv/2,Hv*.28,30,B,'center');
  const bill=dailyOverhead(s);
  ['接待 '+s.served+' 位顾客','销售 ¥'+s.earnings,'房租与取暖 ¥'+bill.total,'余额 ¥'+s.cash].forEach((t,i)=>txt(g,t,Wv/2,Hv*.38+i*38,16,B,'center'));
  if(p.role==='manager')button(g,hits,{x:Wv*.15,y:Hv*.70,w:Wv*.70,h:52},'开始下一天','nextday');
 }
 return hits;
}
