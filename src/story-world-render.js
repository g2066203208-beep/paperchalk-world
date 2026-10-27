// Placeholder environment scene renderer for narrative travel, not finished pixel art.
// One authored layer composition per location; shared world data controls access.
import {WORLD_LOCATIONS} from './story-framework.js';
const COLORS={sky:'#cbd0d1',far:'#a1a9ad',near:'#838c92',road:'#8a9398',
 snow:'#e3e6e4',snowShadow:'#c3cbca',ink:'#30383d',lamp:'#e8dbbd',white:'#f3f0ea'};
function r(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(0,Math.round(w)),Math.max(0,Math.round(h)));}
function line(g,x1,y1,x2,y2,w,c){g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();}
function label(g,t,x,y,size=15,c=COLORS.ink,align='left',max=900){g.textAlign=align;g.textBaseline='middle';g.font='600 '+size+'px system-ui,"Noto Sans CJK SC",sans-serif';g.fillStyle=c;g.fillText(t,x,y,max);}
function apartment(g,x,base,w,h){
 r(g,x,base-h,w,h,COLORS.far);
 r(g,x+3,base-h-3,w-6,3,COLORS.near);
 for(let col=0;col<Math.floor((w-12)/13);col++)for(let row=0;row<Math.floor((h-14)/17);row++){
  const wx=x+7+col*13,wy=base-h+11+row*17;
  r(g,wx,wy,6,8,(col+row)%7===0?COLORS.lamp:COLORS.snowShadow);
 }
}
function tree(g,x,y,h,scale=1){
 const z=Math.max(2,Math.round(scale*3));
 line(g,x,y,x,y-h,z,COLORS.near);
 line(g,x,y-h*.39,x-h*.23,y-h*.74,z-1,COLORS.near);
 line(g,x,y-h*.55,x+h*.24,y-h*.95,z-1,COLORS.near);
 line(g,x,y-h*.25,x+h*.16,y-h*.5,z-1,COLORS.near);
}
function skyAndSnow(g,w,h,phase,motion){
 r(g,0,0,w,h,COLORS.sky);
 const horizon=Math.round(h*.60),base=horizon+Math.round(h*.08);
 r(g,0,horizon,w,h-horizon,COLORS.snowShadow);
 r(g,0,base,w,h-base,COLORS.snow);
 for(let i=0;i<7;i++){
  const x=(i*157%101)/101*w;
  const bw=w*(.09+.02*(i%4)),bh=h*(.09+.035*(i%3));
  apartment(g,x,horizon+3,bw,bh);
 }
 tree(g,w*.12,horizon,h*.21);
 tree(g,w*.84,horizon,h*.19,.8);
 if(motion){
  for(let i=0;i<19;i++){
   const x=(i*131+31)%Math.max(1,w);
   const y=(i*73+Math.floor(phase*(.2+i%3*.05)))%Math.max(1,Math.floor(h*.85));
   r(g,x,y,2,2,i%4?COLORS.snow:COLORS.near);
  }
 }
 return {horizon,base};
}
function busStop(g,w,h,ground){
 const x=w*.58,y=ground-4,s=Math.min(w*.33,h*.35);
 r(g,x-s*.52,y-s*.60,s*.84,s*.045,COLORS.ink);
 r(g,x-s*.51,y-s*.55,4,s*.52,COLORS.near);r(g,x+s*.29,y-s*.55,4,s*.52,COLORS.near);
 r(g,x-s*.38,y-s*.50,s*.58,s*.38,COLORS.snowShadow);
 r(g,x-s*.32,y-s*.20,s*.48,3,COLORS.ink);
 r(g,x-s*.42,y-s*.12,s*.64,s*.06,COLORS.near);
 r(g,x+s*.42,y-s*.85,3,s*.86,COLORS.ink);
 r(g,x+s*.34,y-s*.89,s*.20,s*.18,COLORS.ink);
 r(g,x+s*.37,y-s*.86,s*.14,s*.10,COLORS.white);
}
function kiosk(g,w,h,ground){
 const width=Math.min(w*.18,h*.20),x=w*.49-width/2,y=ground-width*1.10;
 r(g,x,y,width,width*1.15,COLORS.near);
 r(g,x-7,y-7,width+14,7,COLORS.ink);r(g,x-5,y-10,width+10,3,COLORS.snow);
 r(g,x+width*.22,y+width*.26,width*.54,width*.38,COLORS.lamp);
 r(g,x+width*.47,y+width*.26,3,width*.38,COLORS.ink);
 r(g,x+width*.12,y+width*.86,width*.76,4,COLORS.ink);
}
function roadway(g,w,h,ground){
 r(g,0,ground,w,h-ground,COLORS.road);
 line(g,0,ground,w,ground-4,3,COLORS.ink);
 for(let i=0;i<9;i++)r(g,i*w/9+6,ground+h*.11,Math.max(10,w/18),2,COLORS.snowShadow);
 r(g,0,h*.89,w,h*.11,COLORS.snow);
}
export function renderStoryWorld(g,shop,view,phase=0,options={}){
 const W=Math.max(1,view.W),H=Math.max(1,view.H),location=WORLD_LOCATIONS[shop?.story?.location]||WORLD_LOCATIONS.shop;
 const {horizon}=skyAndSnow(g,W,H,phase,options.motion!==false);
 const ground=H*.73;
 if(location.id==='street'){roadway(g,W,H,ground);kiosk(g,W,H,ground);
  line(g,W*.21,horizon-4,W*.21,horizon-H*.1,3,COLORS.ink);}
 else if(location.id==='stop'){roadway(g,W,H,ground);busStop(g,W,H,ground);}
 else if(location.id==='flats'){
  apartment(g,W*.26,ground,W*.48,H*.55);
  r(g,W*.45,ground-H*.18,W*.10,H*.18,COLORS.ink);
  r(g,W*.45,ground-H*.21,W*.10,3,COLORS.snow);
  tree(g,W*.12,ground,H*.31);
 }else if(location.id==='city'){
  roadway(g,W,H,ground);
  const millX=W*.15,millY=ground-H*.40,millW=W*.42;
  r(g,millX,millY,millW,H*.40,COLORS.near);
  r(g,millX+8,millY+8,millW-16,3,COLORS.snow);
  for(let i=0;i<3;i++){
   r(g,millX+16+i*(millW-34)/3,millY+H*.07,Math.max(9,millW*.15),H*.105,COLORS.lamp);
  }
  r(g,millX+millW*.34,ground-H*.23,millW*.28,H*.23,COLORS.ink);
  label(g,'市政见习单位',millX+millW*.5,millY+H*.025,12,COLORS.white,'center',millW-10);
  const partner=shop?.story?.assignment?.cityWorker;
  const hero=options.heroSprites?.[partner];
  if(hero?.complete&&hero.naturalWidth>0){
   const ph=Math.min(H*.48,290),pw=ph*2/3;
   g.drawImage(hero,W*.73-pw/2,ground-ph,pw,ph);
  }
 }else{kiosk(g,W,H,ground);}
 const cue=options.storyCue;
 if(cue&&!cue.done&&(cue.track==='paper'||cue.track==='footstep')){
  const x=W*.30+cue.offsetX,y=ground-36+cue.offsetY;
  if(cue.track==='paper'){r(g,x,y,18,25,COLORS.white);r(g,x+3,y+5,12,2,COLORS.ink);r(g,x+3,y+10,9,2,COLORS.ink);}
  else {r(g,x,ground-3,10,3,COLORS.ink);r(g,x+16,ground-9,10,3,COLORS.ink);}
 }
 // Each location owns a coherent environment, not a static map-only label.
 r(g,0,0,W,51,COLORS.white);
 label(g,location.name,12,25,19,COLORS.ink);
 const panelY=H-109;
 r(g,0,panelY,W,109,COLORS.white);
 r(g,0,panelY,W,2,COLORS.ink);
 label(g,location.blurb,12,panelY+19,Math.min(14,Math.max(11,W/28)),COLORS.ink,'left',W-24);
 const b1={x:8,y:H-66,w:Math.max(100,W*.48-12),h:52};
 const b2={x:W/2+3,y:H-66,w:Math.max(100,W*.5-12),h:52};
 for(const [b,t] of [[b1,'查看地图'],[b2,'接着说']]){
  r(g,b.x,b.y,b.w,b.h,COLORS.ink);label(g,t,b.x+b.w/2,b.y+b.h/2,15,COLORS.white,'center',b.w-6);
 }
 return [{...b1,cmd:'storyMapOpen',gesture:'tap'},{...b2,cmd:'storyOpen',gesture:'tap'}];
}
