/* PAPERWORLD / BLUEBELL — warm-color original café interior.
 * Spatial reference: background masonry wall + window + built-in shelving;
 * foreground: continuous countertop with readable TOP plane and front apron.
 * Original shapes/colors; NO copied game screenshots or imported assets.
 */
export const BAR_PALETTE=Object.freeze({
  mortar:'#241f2f',brick:'#4c3241',brickLight:'#624354',
  brickShadow:'#372836',warmBrick:'#704751',wood:'#603d40',
  woodDark:'#3b2a37',woodEdge:'#b57b67',woodGlow:'#d8ac87',
  amber:'#ffca8a',cream:'#ffe8bd',warmWhite:'#fff2d8',
  metal:'#778894',metalDark:'#354554',top:'#79878b',
  topEdge:'#a9b4ad',topShade:'#58636c',
  window:'#172c42',sky:'#28445d',skyLight:'#456784',
  city:'#253344',cityLit:'#d99e67',neon:'#8ecfc0',
  neonGlow:'#4f827f',bottleGreen:'#54847a',bottleAmber:'#bd8e60',
  plant:'#618c6d',leaf:'#86b38a',floor:'#352d3a',
  floorLight:'#56414b',counterInset:'#523947',highlight:'#edc3a4'
});
const n=v=>Math.round(v);
export function getBarInteriorGeometry(p){
 const {x,y,w,h}=p;
 const counterStart=x+n(w*.055);
 return {
  counterStart,topRear:y+n(h*.60),topNear:y+n(h*.73),
  bottom:y+h-1,wallBottom:y+n(h*.73)
 };
}
export function drawBarInterior({p,rect,poly,caption,clock,counts=[0,0,0]}){
 const {x,y,w,h}=p,c=BAR_PALETTE;
 const X=t=>x+n(w*t),Y=t=>y+n(h*t),WW=(a,b)=>Math.max(1,n(w*(b-a)));
 const brickH=Math.max(9,n(h*.064)),brickW=Math.max(26,n(w*.105));
 // 01 Architecture / back wall. Proper mortar and staggered brick bonds.
 rect(x,y,w,h,c.mortar);
 for(let row=0;row<Math.ceil(h*.78/brickH);row++){
  const yy=y+row*brickH,offset=row%2?Math.floor(brickW/2):0;
  for(let xx=x-brickW+offset;xx<x+w;xx+=brickW){
   const ww=Math.min(brickW-2,x+w-xx-1);
   if(ww>0&&xx+ww>x){
    rect(Math.max(xx,x),yy+1,Math.min(ww,xx+ww-Math.max(x,xx)),brickH-2,
      (row*3+Math.floor(xx/brickW))%5===0?c.brickLight:c.brick);
    if((row+Math.floor(xx/brickW))%6===0)rect(Math.max(xx+3,x),yy+2,Math.max(0,ww-9),1,c.warmBrick);
   }
  }
 }
 rect(x,Y(.04),w,Math.max(3,n(h*.025)),c.woodDark);
 rect(x,Y(.07),w,2,c.woodEdge);
 rect(x,Y(.722),w,Math.max(2,n(h*.015)),c.woodDark);

 // 02 Rainy view through a real deep window, left-of-center.
 const wx=X(.046),wy=Y(.158),ww=n(w*.34),wh=n(h*.45);
 rect(wx-7,wy-9,ww+14,wh+20,c.woodDark);
 rect(wx-4,wy-6,ww+8,wh+12,c.woodEdge);
 rect(wx,wy,ww,wh,c.window);
 rect(wx+2,wy+2,ww-4,Math.max(3,n(wh*.46)),c.sky);
 // skyline back layer
 for(let i=0;i<8;i++){
  const left=wx+n(i*ww/8),bw=n(ww/8)+1,hh=n(wh*(.17+(i*7%5)*.065));
  rect(left,wy+wh-hh,bw,hh,i%2?c.city:c.metalDark);
  if(hh>13){
    rect(left+2,wy+wh-hh+5,2,3,c.cityLit);
    if(i%3===0)rect(left+6,wy+wh-hh+11,2,2,c.cityLit);
  }
 }
 rect(wx+n(ww*.49)-2,wy,4,wh,c.woodDark);
 rect(wx,wy+n(wh*.66),ww,4,c.woodDark);
 rect(wx+n(ww*.49)-1,wy,1,wh,c.woodEdge);
 rect(wx,wy+n(wh*.66),ww,1,c.woodEdge);
 rect(wx-8,wy+wh+7,ww+16,5,c.woodEdge);
 rect(wx-6,wy+wh+12,ww+12,3,c.woodDark);
 // Rain and distant neon are spatially clipped to the window only.
 for(let i=0;i<13;i++){
  let rx=wx+3+n((i*23+7)%(Math.max(8,ww-7)));
  let ry=wy+4+n((i*17+clock*12)%(Math.max(9,wh-9)));
  if(rx>wx+n(ww*.47)-4&&rx<wx+n(ww*.54))continue;
  rect(rx,ry,1,Math.max(3,n(h*.017)),i%3?c.skyLight:c.neonGlow);
 }
 rect(wx+n(ww*.69),wy+n(wh*.55),n(ww*.22),3,c.neon);
 rect(wx+n(ww*.74),wy+n(wh*.56)+4,n(ww*.10),1,c.neonGlow);

 // 03 Built-in bar cabinetry and shelves on the right wall.
 const sx=X(.64),sw=n(w*.31),sy=Y(.18),sh=n(h*.42);
 rect(sx-7,sy-8,sw+14,sh+16,c.woodDark);
 rect(sx-4,sy-5,sw+8,sh+10,c.woodEdge);
 rect(sx,sy,sw,sh,c.brickShadow);
 for(let row=0;row<2;row++){
  const top=sy+n(sh*(row===0?.12:.56));
  const shelf=sy+n(sh*(row===0?.45:.88));
  for(let i=0;i<5;i++){
   const unit=sw/6,xx=sx+n((i+.48)*unit);
   const width=Math.max(5,n(unit*.46));
   const height=n((shelf-top)*(.48+(i%3)*.15));
   const yy=shelf-height;
   rect(xx+n(width*.30),yy-5,Math.max(2,n(width*.42)),5,c.metal);
   rect(xx,yy,width,height,i%3===0?c.bottleAmber:i%3===1?c.bottleGreen:c.top);
   rect(xx+1,yy+n(height*.36),Math.max(3,width-2),Math.max(2,n(height*.18)),
     i%2?c.cream:c.woodEdge);
   rect(xx+1,yy+n(height*.72),Math.max(3,width-2),1,c.metalDark);
  }
  rect(sx-5,shelf,sw+10,7,c.woodEdge);
  rect(sx-4,shelf+7,sw+8,4,c.woodDark);
 }
 rect(sx-2,sy+n(sh*.93),sw+4,2,c.warmBrick);

 // 04 Hanging practical lamps with warm and readable shading.
 for(const t of [w>310?.49:.53,.81]){
  const lx=X(t),ly=Y(.05),cord=Math.max(9,n(h*.135));
  rect(lx,ly,2,cord,c.metal);
  poly([[lx-7,ly+cord],[lx+9,ly+cord],[lx+17,ly+cord+11],[lx-15,ly+cord+11]],c.woodEdge);
  rect(lx-14,ly+cord+11,30,4,c.cream);
  rect(lx-7,ly+cord+15,17,2,c.amber);
 }
 // Plant beside the window gives an organic counterpoint to all the gridwork.
 if(w>160){
  const px=X(.43),py=Y(.54);
  rect(px-9,py,19,14,c.bottleAmber);
  rect(px-7,py+4,15,7,c.woodEdge);
  for(const [dx,dy] of [[-12,-13],[-8,-21],[-3,-16],[3,-25],[11,-18],[16,-11],[1,-12]]){
   poly([[px,py+2],[px+dx-3,py+dy],[px+dx+3,py+dy+2]],Math.abs(dx)%2?c.leaf:c.plant);
  }
 }
 // 05 The foreground counter now reads as ONE continuous solid café fixture.
 // Full-body art occupies the reserved left-side pocket. The counter remains
 // front and centre for the majority of the playable scene.
 const geo=getBarInteriorGeometry(p),left=geo.counterStart,
       rear=geo.topRear,front=geo.topNear,right=x+w;
 // Dark shadow under the back edge and wide, genuinely visible counter top.
 rect(left-4,rear+4,right-left+4,Math.max(4,front-rear+8),c.woodDark);
 poly([[left+8,rear],[right-6,rear-5],[right,front-3],[left-5,front]],c.topShade);
 poly([[left+11,rear+3],[right-9,rear-2],[right-3,front-9],[left-1,front-4]],c.top);
 poly([[left-5,front],[right,front-3],[right,front+4],[left-5,front+7]],c.topEdge);
 rect(left-5,front+7,right-left+5,Math.max(1,y+h-front-7),c.wood);
 rect(left-5,front+8,right-left+5,4,c.woodDark);
 // Inset wooden panels, perfectly aligned to the entire face.
 const faceY=front+Math.max(14,n((y+h-front)*.19));
 const faceH=Math.max(9,n((y+h-front)*.52));
 for(let j=0;j<3;j++){
  const pL=left+n((right-left)*(.04+j*.315)),pW=n((right-left)*.275);
  rect(pL,faceY,pW,faceH,c.woodDark);
  rect(pL+3,faceY+3,pW-6,faceH-6,c.counterInset);
  rect(pL+5,faceY+4,Math.max(0,pW-10),2,c.woodEdge);
 }
 rect(left-5,y+h-10,right-left+5,3,c.woodEdge);
 // Real items rest ON top, never hang in front of the character.
 const cx=left+n((right-left)*.70),cy=rear+n((front-rear)*.45);
 rect(cx-9,cy-7,18,4,c.cream);
 rect(cx-7,cy-3,14,15,c.warmWhite);
 rect(cx-5,cy+2,10,8,c.bottleAmber);
 rect(cx+9,cy-1,5,6,c.warmWhite);
 rect(cx-11,cy+12,22,2,c.woodDark);
 // A small order ticket rests flat on the top.
 const tx=left+n((right-left)*.17),ty=rear+n((front-rear)*.36);
 poly([[tx,ty],[tx+29,ty-2],[tx+33,ty+13],[tx+2,ty+15]],c.cream);
 rect(tx+7,ty+5,16,2,c.wood);
 rect(tx+7,ty+9,12,1,c.metal);
 // Materials only appear when added; no useless decoration clutter.
 for(let i=0;i<3;i++)for(let j=0;j<Math.min(3,counts[i]);j++){
  rect(left+14+i*12+j*3,front-12+i*3,3,3,[c.amber,c.neon,c.bottleAmber][i]);
 }
 return geo;
}
