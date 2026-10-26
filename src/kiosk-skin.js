// Untitled kiosk: procedural, layered 2D art system. No flattened scene.
// Every effect is computed from time; geometry has no gameplay authority.
const P={navy:"#142448",deep:"#101b36",blue:"#315998",sky:"#75b4e8",cream:"#fff3dd",snow:"#f8faff",amber:"#ffb84e",orange:"#ed8537",wood:"#c89063",edge:"#2d3d69"};
const rr=(g,x,y,w,h,r,fill,stroke=null,sw=1)=>{
 if(w<=0||h<=0)return;
 g.beginPath();g.roundRect(x,y,w,h,Math.min(r,w/2,h/2));
 if(fill){g.fillStyle=fill;g.fill();}
 if(stroke){g.strokeStyle=stroke;g.lineWidth=sw;g.stroke();}
};
const lin=(g,x1,y1,x2,y2,stops)=>{
 const z=g.createLinearGradient(x1,y1,x2,y2);for(const [p,c] of stops)z.addColorStop(p,c);return z;
};
function poly(g,pts,fill){g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);g.closePath();g.fillStyle=fill;g.fill();}
function dot(g,x,y,rad,col){g.beginPath();g.arc(x,y,Math.max(0.1,rad),0,Math.PI*2);g.fillStyle=col;g.fill();}
export function drawAmbient(g,W,H,phase){
 const b=Math.sin(phase*.009),sw=18*b;
 g.fillStyle=lin(g,0,0,W,H,[[0,"#18264b"],[.48,"#294d89"],[1,"#13284f"]]);g.fillRect(0,0,W,H);
 // Two interleaved diagonal bands move in a long, seamless sine loop.
 for(let i=-2;i<8;i++){
  const u=i*W/4+sw;
  poly(g,[[u,-32],[u+W*.125,-32],[u+W*.71,H+32],[u+W*.59,H+32]],i%2?"#ffffff07":"#7cb5ff10");
 }
 const breath=1+.025*b;
 for(const q of [[.04,.13,.17],[.83,.11,.12],[.71,.77,.23],[.08,.8,.11]]){
  const x=W*q[0],y=H*q[1],s=W*q[2]*breath;
  rr(g,x,y,s,s*.73,s*.11,"#ffffff07","#ffffff0c",1);
  rr(g,x+s*.31,y+s*.13,s*.46,s*.46,s*.09,"#ffba4b13");
 }
 for(let i=0;i<14;i++){
  let x=(i*79%W),y=(i*137%H);
  rr(g,x+Math.sin(phase*.007+i)*3,y,3+(i%4)*2,3+(i%3)*2,1,i%3?"#9bcdfb30":"#ffcf7940");
 }
}
export function drawRoomWall(g,x,y,w,h,phase){
 g.fillStyle=lin(g,x,y,x+w,y+h,[[0,"#24375d"],[.48,"#4b5270"],[1,"#232d4b"]]);g.fillRect(x,y,w,h);
 const b=Math.sin(phase*.014);
 // Flat stepped decorative blocks, replacing brown wallpaper texture.
 for(let i=0;i<7;i++){
  const xx=x+(i*131%Math.max(30,w-22)), yy=y+((i*99)%Math.max(30,h*.55));
  rr(g,xx,yy,Math.max(9,w*.055),Math.max(9,h*.048),2,i%2?"#a3c8e013":"#f9dfad0d");
 }
 poly(g,[[x,y+h*.65],[x+w,y+h*.55],[x+w,y+h],[x,y+h]],"#1b2d4b65");
 g.fillStyle="#f4bd7822";g.fillRect(x+w*.25,y,w*.5,Math.max(2,h*.007));
 for(const side of [0,1]){
  const xx=side?x+w-13:x+4;rr(g,xx,y,9,h,2,"#192743","#8097ba");
  rr(g,xx+2,y+3,2,h-6,1,"#ffe2ad44");
 }
 rr(g,x+w*.34,y+h*.008,w*.32,3,1,"#ecb66e");
 // Very restrained warm/cold light pulsation: not a flashing filter.
 g.fillStyle="rgba(255,186,99,"+(.035+.014*b).toFixed(3)+")";
 g.fillRect(x,y,w,h);
}
export function drawNightStreet(g,x,y,w,h,phase){
 g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
 g.fillStyle=lin(g,x,y,x,y+h,[[0,"#253c74"],[.56,"#6189bc"],[1,"#becfe1"]]);g.fillRect(x,y,w,h);
 const move=Math.sin(phase*.009)*2;
 for(let i=0;i<7;i++){
  const bw=w*(.13+(i%3)*.024),bh=h*(.35+(i*17%30)/100);
  const xx=x+i*w*.17-w*.12, yy=y+h*.79-bh;
  g.fillStyle=i%2?"#304774":"#3b5987";g.fillRect(xx,yy,bw,bh);
  poly(g,[[xx-3,yy+3],[xx+bw*.5,yy-11],[xx+bw+3,yy+3]],"#e4eaf0");
  for(let row=0;row<3;row++)for(let col=0;col<2;col++){
   rr(g,xx+8+col*bw*.35,yy+14+row*19,Math.max(3,bw*.15),8,1,(col+row+i)%3===0?"#ffe0a0":"#7b97bb");
  }
 }
 g.fillStyle="#d9e4f1";g.fillRect(x,y+h*.79,w,h*.21);
 for(let i=0;i<29;i++){
  const sx=x+((i*59+17)%Math.max(2,w)),sy=y+((i*37+phase*(i%3+1)*.34)%Math.max(2,h*.88));
  dot(g,sx+move,sy,((i%3)+1)*.65,i%5===0?"#fff6d9":"#ffffffb3");
 }
 rr(g,x+w*.77,y+h*.33,3,h*.48,1,"#182b4f");
 dot(g,x+w*.785,y+h*.34,5,"#ffd798");
 g.restore();
}
export function drawStylizedCustomer(g,{x,y,w,h,tone=0,phase=0,talking=false,receiving=false}){
 g.save();g.translate(x+w/2,y+h*.54);
 const size=Math.min(w/150,h/205);
 g.scale(size,size);
 const bob=Math.sin(phase*.065)*1.25,eyeBlink=phase%186>183;
 g.translate(0,bob);
 const coats=["#1f366c","#784b7c","#6d8b94","#a86d5e"];
 const hair=["#d8e4fb","#a77e62","#484167","#c29d7e"];
 const coat=coats[Math.abs(Math.round(tone))%4],hairColor=hair[Math.abs(Math.round(tone))%4];
 // Ear-covering fur hood, coat, scarf and sleeves remain independent shapes.
 g.fillStyle="#0e2348";g.beginPath();g.ellipse(0,48,65,81,0,0,Math.PI*2);g.fill();
 rr(g,-63,39,126,88,32,coat,P.edge,4);
 poly(g,[[-62,103],[-75,123],[74,123],[63,103]],"#253763");
 rr(g,-61,36,18,63,9,"#f7f1e7");
 rr(g,43,36,18,63,9,"#f7f1e7");
 // Hair mass, side locks, and snow hood.
 g.fillStyle=hairColor;g.beginPath();g.ellipse(0,-13,62,73,0,0,Math.PI*2);g.fill();
 for(const s of [-1,1]){g.fillStyle=hairColor;g.beginPath();g.ellipse(s*49,37,18,48,-s*.1,0,Math.PI*2);g.fill();}
 rr(g,-55,-74,110,34,15,"#1c315f","#e5ecfc",4);
 g.fillStyle="#eff5ff";g.beginPath();g.ellipse(-32,-61,27,13,-.25,0,Math.PI*2);g.fill();
 dot(g,34,-82,12,"#fff8ec");
 // Face.
 g.fillStyle="#f9dfce";g.beginPath();g.ellipse(0,0,45,53,0,0,Math.PI*2);g.fill();
 // Multilayered swept fringe.
 for(const [xx,yy,rot] of [[-27,-35,-.35],[-3,-39,.14],[24,-36,.45]]){
  g.fillStyle=hairColor;g.beginPath();g.ellipse(xx,yy,20,31,rot,0,Math.PI*2);g.fill();
 }
 // Eyes and cheek highlights (blink animated).
 for(const s of [-1,1]){
  if(eyeBlink){rr(g,s*21-11,5,21,3,1,"#29365e");}
  else{
   g.fillStyle="#202d62";g.beginPath();g.ellipse(s*21,5,13,16,0,0,Math.PI*2);g.fill();
   g.fillStyle="#4da8e8";g.beginPath();g.ellipse(s*21,7,9,12,0,0,Math.PI*2);g.fill();
   dot(g,s*21-3,0,4.2,"#ffffff");dot(g,s*21+5,12,2,"#ecfaff");
  }
  g.fillStyle="#ed9ca7a6";g.beginPath();g.ellipse(s*35,24,10,5,0,0,Math.PI*2);g.fill();
 }
 g.fillStyle=talking?"#ac536c":"#c66a76";
 g.beginPath();g.ellipse(0,31,7,talking?8:4,0,0,Math.PI*2);g.fill();
 // Scarf + snowflake pin.
 rr(g,-42,47,84,26,11,"#fcf3e7","#b1bad4",2);
 rr(g,8,65,24,46,8,"#ecf0fa");
 rr(g,-17,55,24,10,5,"#3c63a2");
 for(let q=0;q<6;q++){g.save();g.translate(35,58);g.rotate(q*Math.PI/3);rr(g,-1,-8,2,16,1,"#84b6e9");g.restore();}
 if(receiving){
  // Reaching arm, changes shape without taking over item logic.
  rr(g,28,76,36,19,9,coat,"#18274a",3);
  rr(g,58,74,19,20,9,"#f6eee5","#344e77",3);
 }else{
  for(const s of [-1,1])rr(g,s*43-13,87,28,25,12,"#f5e8df",coat,4);
 }
 // Foreground contrast rim.
 g.strokeStyle="#c4dcf8";g.lineWidth=2;g.beginPath();g.moveTo(-54,83);g.lineTo(-49,106);g.stroke();
 g.restore();
}
export function drawMerchandise(g,sku,x,y,w,h){
 g.save();g.translate(x+w/2,y+h/2);const z=Math.min(w/45,h/52);g.scale(z,z);
 const panel=(a,b,c,d,r,col,edge="#27385e")=>rr(g,a,b,c,d,r,col,edge,2);
 if(sku==="bread"){
  panel(-19,-14,38,34,8,"#c9803e");panel(-14,-23,28,36,10,"#ffe3a3");rr(g,-10,-19,20,29,7,"#ffd48e");
  rr(g,-19,11,38,8,3,"#233d79");rr(g,-16,13,32,4,2,"#9dbfeb");
 }else if(sku==="tea"){
  panel(-18,-18,33,37,5,"#fff4e9");rr(g,-18,0,33,18,3,"#315b99");
  rr(g,-20,-21,36,6,3,"#f9c77b");rr(g,-5,-31,3,7,1,"#fffdf0");rr(g,7,-34,3,9,1,"#fffdf0");
  rr(g,-2,8,9,2,1,"#ffe9ad");
 }else if(sku==="battery"){
  panel(-15,-21,30,44,4,"#477ac0");rr(g,-11,-26,22,6,2,"#bfe1ec");rr(g,-9,-10,18,17,3,"#f5ebd9");
  rr(g,-2,-8,4,13,1,"#f4bc52");rr(g,-6,-3,12,4,1,"#f4bc52");
 }else{
  panel(-16,-21,32,45,8,"#8a6fa4");rr(g,-16,-21,32,9,4,"#fff2e5");
  rr(g,-13,-5,26,19,3,"#f6d1a4");dot(g,-3,4,5,"#815184");dot(g,6,4,4,"#815184");
 }
 g.restore();
}
export function drawGameFrame(g,W,H,land,headH,phase){
 const breath=Math.sin(phase*.009)*.5+.5;
 g.fillStyle=lin(g,0,0,W,headH,[[0,"#15274c"],[1,"#335d9b"]]);
 g.fillRect(0,0,W,headH);
 g.fillStyle="#ffffff13";
 for(let k=0;k<4;k++){poly(g,[[W*.3+k*64,0],[W*.33+k*64,0],[W*.40+k*64,headH],[W*.37+k*64,headH]],"#ffffff13");}
 rr(g,8,headH-5,W-16,3,1,"#ffb849");
 dot(g,W*.94,headH*.14,2.5+breath,"#ffecc2");
}
export function drawSkinButton(g,x,y,w,h,active=false){
 rr(g,x+1,y+3,w,h,Math.min(12,h*.19),"#0c1a39");
 rr(g,x,y,w,h,Math.min(12,h*.19),active?lin(g,x,y,x,y+h,[[0,"#ffe0a5"],[1,"#e99c50"]]):lin(g,x,y,x,y+h,[[0,"#f7f9ff"],[1,"#d6e6fa"]]),active?"#ffefce":"#89b8ee",2);
 rr(g,x+4,y+5,w-8,Math.max(2,h*.12),3,active?"#fff3d8":"#ffffffbb");
 rr(g,x+8,y+h-5,w-16,2,1,active?"#c77739":"#80a8d8");
}
