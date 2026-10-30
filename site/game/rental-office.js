/* PAPERWORLD rental-office environment. A native, strict four-ink pixel set.
 * Drawn on the same logical canvas as the original hostess, never baked into
 * the character: front counter occludes her lower body in real scene order.
 * Four physical elements only: room walls, doorway, working key board, counter.
 */
const int=n=>Math.round(n);
export function officeLayout(W,H){
 const wide=W/H>1.25,front=int(H*(wide?.76:.73)),floor=int(H*.93);
 const keys={x:int(W*(wide?.71:.74)),y:int(H*(wide?.13:.13)),
  w:Math.max(25,int(W*(wide?.24:.23))),h:Math.max(40,int(H*(wide?.44:.32)))};
 const doorway={x:int(W*(wide?.37:.28)),y:int(H*.055),
  w:int(W*(wide?.26:.44)),h:int(H*(wide?.65:.58))};
 return {wide,front,floor,keys,doorway,
  anchorX:int(W*(wide?.27:.5)),anchorY:int(H*(wide?.96:.735))};
}
export function drawOfficeBack({R,COL,text},W,H){
 const g=officeLayout(W,H),{ink,blue,pink,paper}=COL;
 R(0,0,W,H,ink);
 // Four-color architectural framing. Integer rectangles only.
 R(0,int(H*.045),W,3,blue);
 R(0,int(H*.06),W,2,pink);
 R(0,int(H*.16),Math.max(4,int(W*.06)),int(H*.53),blue);
 R(W-Math.max(4,int(W*.06)),int(H*.16),Math.max(4,int(W*.06)),int(H*.53),blue);
 R(0,int(H*.16),Math.max(2,int(W*.025)),int(H*.53),pink);
 R(W-Math.max(2,int(W*.025)),int(H*.16),Math.max(2,int(W*.025)),int(H*.53),pink);
 // A single legible RENTAL sign (game typography, not text baked in a picture).
 // The sign and keys convey the purpose of the room, not decorative clutter.
 const sx=Math.max(4,int(W*.055)),sy=Math.max(12,int(H*.105));
 const sw=Math.max(32,int(W*(g.wide?.16:.24))),sh=Math.max(18,int(H*.055));
 R(sx,sy,sw,sh,blue);
 R(sx+2,sy+2,sw-4,sh-4,paper);
 if(typeof text==='function')text('租房',sx+int(sw/2),sy+int(sh*.53),Math.min(14,sh-7),ink);
 // Behind hostess: a simple glazed inner doorway for spatial context.
 const d=g.doorway;
 R(d.x-3,d.y,d.w+6,d.h+4,pink);
 R(d.x,d.y+3,d.w,d.h,blue);
 R(d.x+4,d.y+7,Math.max(1,d.w-8),d.h-11,ink);
 R(d.x+int(d.w*.5)-1,d.y+7,2,d.h-11,blue);
 R(d.x+3,d.y+int(d.h*.57),d.w-6,2,blue);
 // Rear wall timber rail and counter shadow in the very last scene plane.
 const railY=int(H*.69);
 R(0,railY,W,4,pink);
 R(0,railY+4,W,6,blue);
 // Rental keys on a physical board. Two rows, three hooks each.
 const k=g.keys;
 R(k.x-3,k.y-4,k.w+6,k.h+8,blue);
 R(k.x,k.y,k.w,k.h,ink);
 R(k.x+2,k.y+2,k.w-4,3,pink);
 R(k.x+2,k.y+k.h-5,k.w-4,3,pink);
 for(let row=0;row<2;row++){
  const yy=k.y+int(k.h*(row?.54:.20));
  R(k.x+4,yy,k.w-8,2,blue);
  for(let col=0;col<3;col++){
   const cx=int(k.x+k.w*(col+1)/4);
   R(cx-1,yy-3,3,3,pink); // peg
   R(cx,yy+3,1,5,paper); // ring stem
   R(cx-3,yy+8,7,7,paper); // room number tag
   R(cx-2,yy+10,4,2,pink);
   R(cx-1,yy+15,2,3,pink);
  }
 }
 // The lower part is covered by the foreground counter, no fake perspective floor.
 return g;
}
export function drawOfficeCounter({R,COL},W,H){
 const g=officeLayout(W,H),{ink,blue,pink,paper}=COL;
 const y=g.front,frontH=Math.max(1,g.floor-y);
 // Frontmost countertop is visibly in FRONT of the receptionist.
 R(0,y-8,W,10,ink);
 R(0,y-7,W,4,pink);
 R(0,y-3,W,2,paper);
 R(0,y+2,W,frontH-2,ink);
 R(3,y+5,W-6,frontH-9,blue);
 // Three large clean pieces of joinery, no random decor.
 const edge=Math.max(6,int(W*.1)),mid=Math.max(24,int(W*.42));
 R(edge,y+10,3,frontH-17,ink);
 R(W-edge-3,y+10,3,frontH-17,ink);
 R(edge+6,y+13,Math.max(1,W-2*edge-12),3,pink);
 R(edge+6,g.floor-13,Math.max(1,W-2*edge-12),3,pink);
 R(int(W/2)-int(mid/2),y+16,mid,Math.max(6,frontH-32),ink);
 R(int(W/2)-int(mid/2)+3,y+20,mid-6,Math.max(1,frontH-40),blue);
 // The clipboard physically rests on the counter, not behind a UI modal.
 const boardW=int(W*(g.wide?.16:.38)),boardH=Math.max(16,int(H*.07));
 const bx=int(W*.5-boardW/2),by=y-int(boardH*.20);
 R(bx-3,by-3,boardW+6,boardH+6,ink);
 R(bx,by,boardW,boardH,paper);
 R(bx+int(boardW*.37),by-3,int(boardW*.26),4,pink);
 for(let i=0;i<3;i++)R(bx+5,by+int(boardH*(i+2)/6),boardW-10,1,blue);
 // Carved house crest: the counter belongs to an actual rental business.
 // Construct every pixel cluster at integer coordinates, no blurry icon/image.
 const cx=int(W/2),cy=y+int(frontH*.54);
 const roofW=Math.max(15,int(mid*.32)),roofH=Math.max(5,int(roofW*.34));
 for(let row=0;row<roofH;row++){
  const inset=int((roofH-row-1)*1.8);
  R(cx-int(roofW/2)+inset,cy-roofH+row,
   Math.max(2,roofW-2*inset),1,pink);
 }
 const hw=Math.max(12,roofW-6),hh=Math.max(9,int(frontH*.19));
 R(cx-int(hw/2),cy,hw,hh,paper);
 R(cx-2,cy+int(hh*.43),4,hh-int(hh*.43),ink);
 R(cx-int(hw*.37),cy+2,3,3,blue);
 R(cx+int(hw*.27),cy+2,3,3,blue);
 // Keep visible bottom margin as a clean floor strip.
 R(0,g.floor,W,H-g.floor,ink);
 R(0,g.floor,W,3,pink);
 return g;
}
