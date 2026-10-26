// Flat-color 2D game art system. Every object drawn separately at gameplay coordinates.
// Design rules: five core inks, hard color cuts, no gradients, bloom, fake depth,
// pixel-filtering or premade background screenshots. Origin: user-approved flat-color direction.
export const F=Object.freeze({
 night:"#1E294D",ink:"#263459",panel:"#344C7A",blue:"#526FA9",
 steel:"#7F99C2",pale:"#DDE6F5",paper:"#F9F7F4",
 peach:"#FFDCCC",warm:"#F3A33E",orange:"#EF8E38",coral:"#DF7770",
 slate:"#53617E",snow:"#F0F4F8",glass:"#779BC6",mint:"#8CB3B1"
});
const R=(g,x,y,w,h,fill,r=0)=>{if(w<=0||h<=0)return;g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,Math.min(r,w/2,h/2));g.fill();};
const path=(g,pts,c)=>{g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);g.closePath();g.fillStyle=c;g.fill();};
const ball=(g,x,y,rx,ry,c)=>{g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=c;g.fill()};
const text=(g,t,x,y,size=12,color=F.ink,align="center")=>{g.fillStyle=color;g.font='700 '+size+'px system-ui,"Noto Sans CJK SC",sans-serif';g.textAlign=align;g.textBaseline="middle";g.fillText(t,x,y)};
const st=(g,x1,y1,x2,y2,c,width=2)=>{g.strokeStyle=c;g.lineWidth=width;g.lineCap="round";g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()};
const tile=(g,x,y,w,h,c,edge=F.ink,r=5,line=3)=>{R(g,x,y,w,h,edge,r+2);R(g,x+line,y+line,w-2*line,h-2*line,c,Math.max(0,r-1));};
export function flatAmbient(g,W,H,phase){
 R(g,0,0,W,H,F.night);
 const offset=Math.sin(phase*.013)*13;
 for(let i=-2;i<9;i++){const x=i*W*.26+offset;
  path(g,[[x,-30],[x+W*.12,-30],[x+W*.54,H+30],[x+W*.42,H+30]],i%2? "#2C3B66":"#25345C");
 }
 for(let i=0;i<8;i++){
  const ww=W*(.06+i%3*.022),xx=((i*97)%W+Math.sin(phase*.008+i)*7);
  R(g,xx,((i*121)%H),ww,ww*(.50+i%2*.24),i%3===0?"#E58E4330":"#BBD5EB19",5);
 }
}
export function flatWall(g,x,y,w,h,phase){
 R(g,x,y,w,h,F.panel);
 R(g,x,y,w,h*.13,F.night);
 R(g,x+8,y+h*.13,w-16,h*.86,"#425D91");
 // Graphically consistent angular panels, with hard color-cut lighting.
 path(g,[[x,y+h*.64],[x+w,y+h*.49],[x+w,y+h],[x,y+h]],"#384F7E");
 for(const side of [0,1]){const xx=side?x+w-10:x;R(g,xx,y,10,h,F.night);R(g,xx+3,y,3,h,F.steel);}
 R(g,x+12,y+h*.17,w-24,3,"#6983B0");
 for(let i=0;i<4;i++){const xx=x+(i+.4)*w/4;R(g,xx,y+h*.12,3,h*.06,"#233358");}
}
export function flatStreet(g,x,y,w,h,phase){
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 R(g,x,y,w,h,"#5B7EB9");
 R(g,x,y,w,h*.51,"#405F9D");
 ball(g,x+w*.75,y+h*.18,w*.105,h*.095,"#F6E5BF");
 for(let i=0;i<7;i++){
  const xx=x+w*(i*.17-.08),hh=h*(.42+(i*13%5)*.06),yy=y+h*.79-hh;
  R(g,xx,yy,w*.18,hh,i%2?"#324A7F":"#3B588C");
  path(g,[[xx-4,yy+3],[xx+w*.09,yy-h*.11],[xx+w*.18+4,yy+3]],F.snow);
  for(let j=0;j<3;j++)R(g,xx+7+j*18,yy+12+(j%2)*15,7,10,(i+j)%3===0?"#F7BF66":"#8DA8CD",1);
 }
 R(g,x,y+h*.76,w,h*.24,F.snow);
 path(g,[[x,y+h*.82],[x+w*.24,y+h*.73],[x+w*.45,y+h*.80],[x+w*.69,y+h*.74],[x+w,y+h*.82],[x+w,y+h],[x,y+h]],"#D9E5F2");
 for(let i=0;i<21;i++){
  const sx=x+((i*79)%Math.max(5,w)),sy=y+((i*53+phase*.25*(i%3+1))%Math.max(5,h));
  ball(g,sx,sy,1+(i%3)*.55,1+(i%3)*.55,F.paper);
 }
 g.restore();
}
export function flatCustomer(g,{x,y,w,h,tone=0,phase=0,talking=false,receiving=false,refusing=false}){
 const n=Math.abs(Math.floor(tone))%4;
 const coats=["#435E9A","#946B87","#547D85","#A57064"],hairs=["#506DA5","#7D5375","#425979","#C48A5E"];
 const coat=coats[n],hair=hairs[n],b=Math.sin(phase*.04)*2;
 g.save();g.translate(x+w/2,y+h*.99+b);
 const u=Math.min(w/190,h/220);g.scale(u,u);
 // Entire silhouette uses flat graphic contours; no raster shading.
 path(g,[[-96,0],[-85,-64],[-58,-102],[58,-102],[88,-64],[96,0]],F.ink);
 path(g,[[-86,0],[-74,-61],[-50,-91],[52,-91],[74,-60],[86,0]],coat);
 path(g,[[-46,-42],[0,-60],[48,-42],[39,0],[-35,0]],"#E6ECF5");
 // Arm positions follow a real checkout state, not a static customer illustration.
 const armY=receiving?-83:-40;
 R(g,receiving?34:59,armY,receiving?45:25,29,F.ink,11);
 R(g,receiving?36:61,armY+3,receiving?39:19,23,coat,9);
 ball(g,receiving?80:72,armY+14,12,11,F.peach);
 // Hair canopy behind face and hood.
 ball(g,0,-136,70,77,F.ink);ball(g,0,-136,65,71,hair);
 for(const s of [-1,1])R(g,s*54-16,-139,31,77,hair,16);
 // Flat scarf and two-tone face.
 ball(g,0,-133,52,56,F.ink);ball(g,0,-131,47,52,F.peach);
 path(g,[[-48,-150],[-42,-188],[-7,-193],[40,-179],[53,-153],[24,-166],[11,-154],[-7,-176],[-22,-153]],hair);
 path(g,[[-42,-182],[1,-196],[42,-176],[25,-177],[12,-185],[-17,-170]],"#8195C2");
 // Warm beanie / muffs, not the reference character's cat ears.
 if(n===0||n===2){
  R(g,-54,-203,108,29,13,F.ink);R(g,-49,-204,98,25,11,n===2?"#D7E4E9":"#DCE3F5");
  R(g,-39,-209,78,9,F.paper,5);ball(g,0,-208,9,9,F.warm);
 }else{
  R(g,-59,-187,118,20,9,F.ink);R(g,-54,-187,108,17,7,coat);
  ball(g,-58,-153,15,24,F.paper);ball(g,58,-153,15,24,F.paper);
 }
 // Eyes / mouth: small, expressive color cuts.
 for(const ex of [-22,22]){
  if(phase%201>197)R(g,ex-10,-132,20,3,F.ink,2);
  else {ball(g,ex,-133,10,12,F.ink);ball(g,ex+2,-134,5,7,"#739DD3");ball(g,ex-3,-138,3,3,F.paper);}
  ball(g,ex+(ex<0?-11:11),-112,6,3,"#EA9B94");
 }
 if(talking)ball(g,0,-108,6,7,"#B95A71");
 else st(g,-6,-106,6,-106,"#A55D74",3);
 if(refusing){R(g,-32,-100,64,9,F.paper,3);text(g,"?",0,-97,10,F.coral);}
 // Scarf drawn on top of collar so cutout reads clearly.
 R(g,-50,-96,100,20,F.paper,9);
 R(g,15,-80,22,42,F.paper,6);
 R(g,-45,-83,35,7,n===1?"#F0B7AE":"#E5A346",2);
 for(const xx of [-52,48])R(g,xx,-51,8,27,F.ink,4);
 g.restore();
}
export function flatProduct(g,sku,x,y,w,h){
 g.save();g.translate(x+w/2,y+h/2);const z=Math.min(w/44,h/56);g.scale(z,z);
 const e=F.ink;
 if(sku==="tea"){tile(g,-17,-19,34,42,F.paper,e,5,3);R(g,-14,0,28,18,F.blue,2);R(g,-11,-21,22,4,F.warm,2);ball(g,0,8,6,4,F.paper);}
 else if(sku==="bread"){path(g,[[-19,20],[-19,-5],[-14,-17],[12,-17],[19,-7],[19,20]],e);
 path(g,[[-15,16],[-15,-4],[-11,-13],[9,-13],[15,-4],[15,16]],F.warm);
 R(g,-15,9,30,9,"#F8D295",2);st(g,-7,-9,-3,-2,"#F8D295",3);}
 else if(sku==="battery"){tile(g,-12,-22,24,45,F.blue,e,4,3);R(g,-7,-26,14,6,F.pale,2);R(g,-6,-9,12,17,F.paper,2);R(g,-2,-5,4,10,F.warm,1);}
 else {tile(g,-15,-21,30,43,"#B38AA7",e,6,3);R(g,-11,-22,22,7,F.paper,3);R(g,-10,-3,20,18,"#EAD3C3",2);ball(g,0,6,6,6,F.warm);}
 g.restore();
}
export function flatShelfBase(g,x,y,w,h){
 R(g,x,y,w,h,F.night,3);
 R(g,x+4,y+4,w-8,h-13,"#314976",2);
 R(g,x,y+h-13,w,12,F.paper,2);
 R(g,x+2,y+h-13,w-4,4,F.steel,1);
}
export function flatCupboard(g,x,y,w,h,opened,side=0){
 tile(g,x,y,w,h,"#637DA8",F.night,4,5);
 if(opened){
  R(g,x+6,y+6,w-12,h-12,"#293F6A",3);
  R(g,x+9,y+h*.46,w-18,4,F.steel,1);
  R(g,x+2,y+2,w*.17,h-4,F.paper,3);
  R(g,x+w*.82,y+2,w*.16,h-4,F.paper,3);
 }else{
  R(g,x+5,y+5,w-10,h-10,F.pale,2);
  R(g,x+w*.50-2,y+4,4,h-8,F.steel,0);
  R(g,x+w*.35,y+h*.51,4,13,F.warm,2);
  R(g,x+w*.63,y+h*.51,4,13,F.warm,2);
  R(g,x+9,y+8,w*.24,3,F.paper,1);
 }
}
export function flatDrawer(g,x,y,w,h,opened){
 tile(g,x,y,w,h,opened?"#3A5281":"#D7E2F0",F.night,5,4);
 if(opened){
  R(g,x+6,y+7,w-12,h*.51,"#263A62",4);
  R(g,x+3,y+h*.70,w-6,h*.24,F.paper,2);
  R(g,x+w*.40,y+h*.83,w*.20,4,F.warm,2);
 }else{
  R(g,x+10,y+9,w-20,3,F.paper,1);
  R(g,x+w*.40,y+h*.48,w*.2,6,F.blue,3);
 }
}
export function flatWindow(g,x,y,w,h,opened){
 // Truly transparent opening: never paint the customer or the snow behind it.
 if(!opened){
  tile(g,x-11,y-11,w+22,h+22,F.pale,F.night,5,7);
  R(g,x+7,y+7,w-14,h-14,F.pale,2);
  R(g,x+w*.45,y+h*.47,w*.1,9,F.blue,4);
 }else{
  R(g,x-11,y-11,w+22,10,F.night,2);
  R(g,x-11,y-11,11,h+28,F.night,2);
  R(g,x+w,y-11,11,h+28,F.night,2);
  R(g,x-11,y+h,w+22,17,F.night,2);
  R(g,x-7,y-7,w+14,5,F.warm,1);
  R(g,x-7,y-7,5,h+15,F.paper,1);
  R(g,x+w+2,y-7,5,h+15,F.paper,1);
  R(g,x-7,y+h,w+14,9,F.warm,2);
 }
 // A functional, always-visible latch remains centered on the service sill.
 R(g,x+w*.38,y+h+5,w*.24,8,F.paper,4);
 R(g,x+w*.45,y+h+6,w*.1,4,F.blue,2);
}
export function flatCounter(g,x,y,w,h){
 R(g,x+3,y+4,w-6,h,F.night,8);
 R(g,x,y,w,h*.27,F.paper,6);
 R(g,x,y+h*.25,w,h*.75,"#627DAA",3);
 R(g,x+6,y+h*.30,w-12,4,"#2C416E",1);
 // Register / money tray visually distinct from the functional handoff mat.
 tile(g,x+w*.07,y+h*.18,w*.16,h*.60,F.ink,F.night,5,3);
 R(g,x+w*.095,y+h*.28,w*.11,h*.19,F.pale,2);
 for(let i=0;i<3;i++)R(g,x+w*.095,y+h*(.50+i*.07),w*.11,2,F.steel,1);
 R(g,x+w*.70,y+h*.33,w*.23,h*.22,"#334975",4);
 R(g,x+w*.72,y+h*.36,w*.12,h*.05,F.warm,2);
}
export function flatMat(g,x,y,w,h){
 R(g,x,y,w,h,F.night,7);
 R(g,x+4,y+4,w-8,h-8,"#4F729F",5);
 R(g,x+w*.16,y+h*.17,w*.68,3,F.steel,1);
}
export function flatPlaque(g,x,y,w,h,kind,label,small){
 tile(g,x,y,w,h,kind==="heating"?"#7D9AAE":"#415A85",F.night,4,3);
 R(g,x+6,y+5,w-12,4,F.warm,1);
 text(g,label,x+w/2,y+h*.40,Math.min(12,w*.17),F.paper);
 text(g,small,x+w/2,y+h*.73,Math.min(10,w*.12),F.paper);
}
export function flatTop(g,W,h){
 R(g,0,0,W,h,F.night);
 R(g,0,h-5,W,5,F.warm);
 for(let i=0;i<5;i++){R(g,W*(.37+i*.10),6,7,7,i%2?F.blue:F.panel,1);}
}
export function flatButton(g,x,y,w,h,active=false){
 R(g,x+2,y+3,w-4,h-4,F.ink,9);
 R(g,x+2,y+1,w-4,h-6,active?F.warm:F.paper,8);
 R(g,x+8,y+7,w-16,4,active?F.paper:F.pale,2);
}
