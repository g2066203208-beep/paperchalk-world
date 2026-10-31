/* PAPERWORLD night bar interior — original spatial pixel architecture.
 * Uses four official inks only. Deliberate pixel clusters, no random texture.
 * Units match bar-scene's logical composition grid; the final render is 2x
 * on a full-resolution backing surface.
 */
export function drawBarInterior({p,COL,rect,poly,caption,clock}){
 const {x,y,w,h}=p;
 const u=n=>Math.round(n),bx=f=>x+u(w*f),by=f=>y+u(h*f);
 // Structural planes: ceiling, wall, wall rails, tiled floor.
 rect(x,y,w,h,COL.ink);
 rect(x,by(.04),w,Math.max(2,u(h*.03)),COL.blue);
 rect(x,by(.075),w,2,COL.pink);
 rect(x,by(.695),w,Math.max(3,u(h*.025)),COL.blue);
 rect(x,by(.717),w,2,COL.paper);
 poly([[x,by(.73)],[x+w,by(.73)],[x+w,by(1)],[x,by(1)]],COL.blue);
 // Gridded perspective floor: only a few joints at meaningful scale.
 const vanX=bx(.51),horizon=by(.735);
 for(const fraction of [.08,.37,.63,.92]){
  const foot=bx(fraction);
  poly([[vanX+u((foot-vanX)*.10),horizon],[vanX+u((foot-vanX)*.10)+1,horizon],
   [foot+1,by(.99)],[foot,by(.99)]],COL.ink);
 }
 for(const level of [.86]){
  rect(x,by(level),w,1,COL.ink);
 }
 // Dark panelled wood on the back wall, wide vertical divisions rather than
 // pixel speckle. These provide a strong spatial rhythm behind foreground art.
 for(const f of [.018,.365,.635,.975]){
  const px=bx(f);
  rect(px-2,by(.09),4,u(h*.60),COL.blue);
  rect(px,by(.09),1,u(h*.60),COL.paper);
 }
 // Rainy city window: four depth-separated frames, sill, mullions, skyline.
 const wx=bx(.046),wy=by(.135),ww=u(w*.302),wh=u(h*.382);
 rect(wx-5,wy-5,ww+10,wh+11,COL.paper);
 rect(wx-3,wy-3,ww+6,wh+7,COL.ink);
 rect(wx,wy,ww,wh,COL.blue);
 // Distant city silhouettes with restrained cream windows.
 const roofs=[.17,.29,.12,.41,.23,.34,.17];
 for(let i=0;i<roofs.length;i++){
  const left=wx+u(i*ww/roofs.length);
  const wide=u(ww/roofs.length)+1;
  const height=u(wh*roofs[i]);
  rect(left,wy+wh-height,wide,height,COL.ink);
  if(height>8){
   rect(left+2,wy+wh-height+4,2,2,COL.pink);
   if(i%2===0&&height>13)rect(left+2,wy+wh-height+11,2,2,COL.paper);
  }
 }
 // A distant transit line above rooftops.
 rect(wx+2,wy+u(wh*.46),ww-4,1,COL.paper);
 rect(wx+u(ww*.50)-1,wy,3,wh,COL.paper);
 rect(wx,wy+u(wh*.56),ww,2,COL.paper);
 // Rain persists in the window, not on the entire interface.
 const rainShift=u(clock*9)%Math.max(4,wh-8);
 for(let i=0;i<6;i++){
  const rx=wx+3+u((i+.3)*(ww-6)/6),ry=wy+((i*17+rainShift)%(Math.max(5,wh-7)));
  rect(rx,ry,1,5,i%2?COL.paper:COL.pink);
 }
 rect(wx-6,wy+wh+6,ww+12,3,COL.pink);
 // Twin pendant lights. Shadows are silhouette clusters, not gradients.
 for(const f of [.47,.79]){
  const lx=bx(f),top=by(.07),drop=u(h*.13);
  rect(lx,top,2,drop,COL.paper);
  poly([[lx-9,top+drop],[lx+10,top+drop],[lx+16,top+drop+8],
        [lx-15,top+drop+8]],COL.pink);
  rect(lx-14,top+drop+9,29,2,COL.paper);
  // Reflected trim on the wall suggests practical lighting.
  rect(lx-13,by(.53),27,2,COL.pink);
 }
 // Left foreground wall plates: physically mounted, sparse and aligned.
 rect(bx(.053),by(.545),u(w*.23),3,COL.ink);
 // Recessed shelves behind the mixing counter. Shelves have readable back
 // planes, side frames and differentiated bottle silhouettes.
 const sx=bx(.671),sy=by(.188),sw=u(w*.283),sh=u(h*.345);
 rect(sx-5,sy-5,sw+10,sh+9,COL.blue);
 rect(sx-3,sy-3,sw+6,sh+5,COL.ink);
 rect(sx,sy,sw,sh,COL.ink);
 // Two shelf surfaces, not floating loose decoration.
 for(const row of [0,1]){
  const shelfY=sy+u(sh*(row?.89:.46));
  rect(sx-2,shelfY,sw+4,4,COL.paper);
  rect(sx-1,shelfY+4,sw+2,2,COL.pink);
  const gap=sw/5;
  for(let i=0;i<4;i++){
   const bottleX=sx+u((i+.45)*gap);
   const bh=u(sh*(row?.19:.23))+(i%2?1:0);
   const bw=Math.max(4,u(gap*.34));
   const bottleY=shelfY-bh;
   rect(bottleX+u(bw*.27),bottleY-4,Math.max(2,u(bw*.46)),4,COL.blue);
   rect(bottleX,bottleY,bw,bh,i===2?COL.pink:i%2?COL.blue:COL.paper);
   rect(bottleX+1,bottleY+u(bh*.4),Math.max(2,bw-2),3,COL.ink);
   rect(bottleX+1,bottleY+u(bh*.56),Math.max(2,bw-2),2,i===2?COL.paper:COL.pink);
  }
 }
 // A slim wall menu in its own inset frame; it reads as signage and remains
 // behind the character, never becoming unrelated floating UI.
 const mx=bx(.41),my=by(.30),mw=u(w*.18),mh=u(h*.21);
 rect(mx-3,my-3,mw+6,mh+6,COL.paper);
 rect(mx,my,mw,mh,COL.ink);
 if(mw>45){
  caption('NIGHT',mx+mw/2,my+4,Math.max(8,u(w*.017)),COL.pink,'center');
  rect(mx+5,my+u(mh*.36),mw-10,2,COL.blue);
  rect(mx+5,my+u(mh*.53),mw-10,1,COL.paper);
  rect(mx+5,my+u(mh*.69),u(mw*.62),1,COL.paper);
 }
 // Floor trim along the back-wall base visually unifies all cabinets.
 rect(x,by(.715),w,2,COL.paper);
}
