/* Lantern tableaux. Every silhouette, joint, material ramp and occlusion field is
   generated here. The only raster caches contain pixels painted by these routines. */
(() => {
  'use strict';
  const W = 328, H = 179, TAU = Math.PI * 2;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const mix = (a, b, t) => a + (b - a) * t;
  function rgb(s) { return [1, 3, 5].map(k => parseInt(s.slice(k, k + 2), 16)); }
  function blend(a, b, t) {
    const u = rgb(a), v = rgb(b);
    return '#' + u.map((n, i) => Math.round(mix(n, v[i], t)).toString(16).padStart(2, '0')).join('');
  }
  function rand(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(x, y, seed) {
    let n = Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x5f356495) ^ seed;
    n = Math.imul(n ^ n >>> 15, 0x85ebca6b);
    return ((n ^ n >>> 13) >>> 0) / 4294967296;
  }
  function noise(x, y, seed) {
    const i = Math.floor(x), j = Math.floor(y);
    let ax = x - i, ay = y - j;
    ax *= ax * (3 - 2 * ax); ay *= ay * (3 - 2 * ay);
    return mix(mix(hash(i, j, seed), hash(i + 1, j, seed), ax),
               mix(hash(i, j + 1, seed), hash(i + 1, j + 1, seed), ax), ay);
  }
  function surface(w, h) {
    const a = document.createElement('canvas'); a.width = w; a.height = h;
    return a;
  }
  function poly(c, color, ...p) {
    if (!color || p.length < 6) return;
    c.fillStyle = color; c.beginPath(); c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.closePath(); c.fill();
  }
  function line(c, color, width, ...p) {
    c.strokeStyle = color; c.lineWidth = width; c.lineJoin = 'bevel'; c.lineCap = 'butt';
    c.beginPath(); c.moveTo(p[0], p[1]);
    for (let i=2; i<p.length; i+=2) c.lineTo(p[i], p[i+1]);
    c.stroke();
  }
  function oval(c, color, x, y, w, h, rot = 0) {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y, w, h, rot, 0, TAU); c.fill();
  }
  function rect(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  function joint(c, x, y, angle, draw) {
    c.save(); c.translate(x, y); c.rotate(angle); draw(c); c.restore();
  }
  function beam(c, a, b, rw, ew, dark, edge) {
    const dx = b[0]-a[0], dy=b[1]-a[1], len=Math.hypot(dx,dy)||1, nx=-dy/len, ny=dx/len;
    poly(c, dark, a[0]+nx*rw,a[1]+ny*rw,b[0]+nx*ew,b[1]+ny*ew,
      b[0]-nx*ew,b[1]-ny*ew,a[0]-nx*rw,a[1]-ny*rw);
    if(edge) line(c,edge,.95,a[0]+nx*rw*.62,a[1]+ny*rw*.62,b[0]+nx*ew*.55,b[1]+ny*ew*.55);
  }
  // Two-link planar inverse kinematics. The hand / planted foot stays attached as the trunk shifts.
  function elbow(a,b,u,v,side) {
    const dx=b[0]-a[0],dy=b[1]-a[1],dist=Math.max(.001,Math.hypot(dx,dy));
    const d=clamp(dist,Math.abs(u-v)+.03,u+v-.03),l=(u*u-v*v+d*d)/(2*d);
    const h=Math.sqrt(Math.max(0,u*u-l*l));
    return [a[0]+dx*l/dist-dy*h*side/dist,a[1]+dy*l/dist+dx*h*side/dist];
  }
  function limb(c,a,b,u,v,side,w,p) {
    const k=elbow(a,b,u,v,side);beam(c,a,k,w,w*.85,p[0],p[1]);
    beam(c,k,b,w*.8,Math.max(.75,w*.43),p[0],p[1]);
    oval(c,p[0],k[0],k[1],w*.91,w*.85);rect(c,p[1],k[0]-w*.52,k[1]-.7,Math.max(1,w*.8),.85);
    return k;
  }
  const bayer = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
  // Sky, direct backlight, horizon mist, far stone, middle stone, vegetation, actor ink, actor half-tone, rim.
  const palettes = {
    warden:   ['#836344','#fff1aa','#ffcb75','#bc8f50','#9b733f','#76502e','#49321f','#805a34','#d99d4d'],
    egg:      ['#827453','#ffe6a5','#ecd08a','#bda571','#92845b','#6e6345','#4a3f2d','#7c6a47','#c6ac70'],
    skeleton: ['#3f6370','#afe0d4','#81b9bd','#649496','#4c797f','#355c64','#223b43','#436970','#7d9c98'],
    maw:      ['#66703a','#f2de91','#b9bd69','#919d55','#647943','#465932','#323e28','#5f6c3b','#a2a15a'],
    guard:    ['#6d4a45','#ffd38c','#efab69','#bd855c','#916047','#704c3b','#49332b','#784936','#c38a57'],
    toad:     ['#4d6541','#e8d889','#b5bd70','#8f9f63','#687f54','#4f6645','#344731','#536342','#a8a164'],
    reaper:   ['#915c43','#ffd28c','#e9a662','#b77d52','#915d42','#714a36','#482f26','#795037','#c08451']
  };
  const ids=Object.keys(palettes);
  function sky(img,key,seed) {
    const ctx=img.getContext('2d'),p=palettes[key];
    const sc=rgb(p[0]),sun=rgb(p[1]),haze=rgb(p[2]);
    const pix=ctx.createImageData(W,H),d=pix.data;
    const sx={warden:190,egg:105,skeleton:182,maw:151,guard:116,toad:205,reaper:115}[key];
    const sy={warden:90,egg:106,skeleton:80,maw:104,guard:97,toad:90,reaper:82}[key];
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const ax=(x-sx)/157,ay=(y-sy)/94;
      const stack=noise(x*.019,y*.044,seed)*.56+noise(x*.047+11,y*.077,seed+31)*.30+
        noise(x*.126-5,y*.25,seed+57)*.14;
      const height=clamp((y+5)/172), g=Math.exp(-(ax*ax+ay*ay)*1.81);
      const k=clamp(height*.60+g*.44+(stack-.5)*.4);
      const bright=clamp(.18*height+.58*g+(stack-.5)*.19);
      const fa=clamp((1-height)*.95),grain=((hash(x,y,seed+71)-.5)*1.4+(bayer[y&3][x&3]/16-.5)*2.3);
      const i=(y*W+x)*4;
      for(let n=0;n<3;n++)d[i+n]=clamp(Math.round((mix(mix(sc[n],haze[n],k),sun[n],bright)+grain+fa*(stack-.45)*7)/2)*2,0,255);
      d[i+3]=255;
    }
    ctx.putImageData(pix,0,0);
    return [sx,sy];
  }
  function ridge(c, color, seed, y, near, jag) {
    let list=[-5,H,-5,y];const step=near?4:5;
    for(let x=-5;x<W+5;x+=step){
      const elev=noise(x/(near?39:62),0,seed)*.62+noise(x/(near?12:20),3,seed)*.38;
      list.push(x+.4,y-(elev-.35)*jag);
    }
    list.push(W+5,H);poly(c,color,...list);
  }
  function masonry(c,x,y,w,h,color,shade,seed,detail=true) {
    const run=rand(seed),s=clamp(w*.065,1.2,5);
    poly(c,color,x,y+s,x+2*s,y,x+w,y+1,x+w-1,y+h,x+s,y+h+1);
    poly(c,shade,x+w-s*1.5,y+1,x+w,y+.8,x+w-.9,y+h,x+w-s*1.9,y+h);
    if(!detail)return;
    let by=y+6;
    while(by<y+h-1){
      for(let bx=x+2+run()*4;bx<x+w-2;bx+=4+run()*8){
        if(run()>.54)rect(c,shade,bx,by,Math.min(2+run()*5,x+w-bx-1),.7);
        if(run()>.82)rect(c,shade,bx,by-.7,.8,1.5);
      }
      by+=4+run()*3;
    }
  }
  function fir(c,x,y,h,col,r) {
    const w=h*(.16+r()*.06),tilt=(r()-.5)*3;
    poly(c,col,x-w*.09,y,x+tilt,y-h,x+w*.1,y);
    for(let j=1;j<6;j++){
      const k=j/6,cy=y-h+2+h*k*.78,rad=w*(.18+k*.82);
      poly(c,col,x+tilt*(1-k),cy-h*(.12+k*.035),x-rad,cy+h*.13,x-rad*.28,cy+h*.085,
        x+w*.1,cy+h*.13,x+rad*.80,cy+h*.10,x+rad*.42,cy+h*.025);
    }
  }
  function farCity(c,p,seed) {
    const r=rand(seed),base=146;
    for(let j=0;j<38;j++){
      const x=-5+j*9+4*r(),w=3+r()*9,h=5+24*r();
      masonry(c,x,base-h,w,h,p[3],p[3],seed+j,false);
      if(r()>.49){
        poly(c,p[3],x-.7,base-h,x+w*.48,base-h-2-r()*9,x+w+1,base-h);
        if(h>18&&r()>.3)rect(c,p[2],x+w*.48,base-h+4,1.15,4);
      }else if(r()>.5){rect(c,p[3],x-.4,base-h-1.5,w+1,2);}
    }
  }
  function portal(c,p,x,y,s,mirror,seed) {
    const r=rand(seed);c.save();c.translate(x,y);c.scale(mirror?s*-1:s,s);
    // Voussoirs over a partly collapsed arch; no cut-out painted with a fictitious sky colour.
    masonry(c,-11,-77,18,80,p[4],p[5],seed);
    poly(c,p[5],-12,-64,-7,-63,-6,-1,-14,0);
    poly(c,p[4],-19,-46,-16,-49,-12,-50,-11,-1,-21,0);
    for(let q=0;q<13;q++){
      const xx=-10+r()*17,yy=-72+r()*59;
      rect(c,p[3],xx,yy,1.4+(q%4),.6);
    }
    masonry(c,33,-40,9,41,p[4],p[5],seed+1);
    const cx=15,cy=-40;
    for(let i=0;i<12;i++){
      const a=Math.PI+i*Math.PI/12,b=a+Math.PI/12-.018;
      const inner=19,outer=27+(i===7?3:0);
      poly(c,i%4===1?p[5]:p[4],cx+Math.cos(a)*inner,cy+Math.sin(a)*inner,cx+Math.cos(a)*outer,cy+Math.sin(a)*outer,
        cx+Math.cos(b)*outer,cy+Math.sin(b)*outer,cx+Math.cos(b)*inner,cy+Math.sin(b)*inner);
    }
    // The inner return wall gives the arcade its depth: the sprung stones remain on their piers.
    poly(c,p[5],31,-37,34,-40,39,-41,39,-2,32,0);
    for(let j=0;j<11;j++){
      const xx=-8+r()*11,yy=-68+r()*63;
      line(c,p[5],.72,xx,yy,xx+3,yy+1.1,xx+5,yy+.45);
    }
    for(const [xx,yy,ww,hh] of [[-14,-79,23,10],[-10,-87,15,7],[-6,-92,8,5],[-13,-55,20,5],[-11,-11,18,5],[32,-38,14,5]]){
      masonry(c,xx,yy,ww,hh,p[4],p[5],seed+yy);
    }
    for(let i=0;i<8;i++){
      const xx=-10+r()*19,yy=-79+r()*6;
      line(c,p[5],.95,xx,yy,xx+1,yy+4+r()*8);
    }
    c.restore();
  }
  function windmill(c,x,y,s,p,rot) {
    c.save();c.translate(x,y);c.scale(s,s);
    poly(c,p[4],-8,1,-4,-28,3,-30,9,1);poly(c,p[5],3,-29,9,1,5,0);
    poly(c,p[4],-8,-27,-3,-33,3,-34,7,-28);rect(c,p[2],-1,-12,2,5);
    c.translate(0,-24);c.rotate(rot);
    for(let j=0;j<4;j++){
      line(c,p[4],1,0,0,1,-25);poly(c,p[4],.5,-23,4.5,-23,3,-11,.8,-7);
      c.rotate(Math.PI/2);
    }c.restore();
  }
  function crypts(c,p,seed) {
    const r=rand(seed);
    for(let i=0;i<21;i++){
      const x=i*19+r()*7-14,y=143+r()*9,s=.4+r()*.6;
      c.save();c.translate(x,y);c.rotate((r()-.5)*.21);c.scale(s,s);
      if(i%4===0){
        line(c,p[4],3,0,0,0,-24);line(c,p[4],3,-7,-16,7,-16);
        poly(c,p[4],-7,0,-5,-3,5,-3,7,0);
      }else{
        poly(c,p[4],-5,0,-5,-10,-3,-15,1,-17,5,-13,6,0);
        if(i%2)line(c,p[3],.9,-2,-11,2,-12);
      }c.restore();
    }
  }
  function tree(c,x,y,h,spread,col,seed,willow=false) {
    const r=rand(seed),scale=h/70;
    c.save();c.translate(x,y);c.scale(scale,scale);
    const w=spread/scale,tx=(r()-.5)*8;
    poly(c,col,-4,0,-1,-16,-1.8,-35,tx-2,-55,tx,-64,tx+2,-44,3,-32,2,-16,5,0);
    for(let j=0;j<13;j++){
      const side=j%2?-1:1,a=(j/13)*.7+.1;
      const y0=-18-a*40,ex=side*(w*.28+r()*.55)*(1.14-a*.4),ey=y0-12-r()*18;
      const mx=ex*.48,my=y0-3-r()*8;
      beam(c,[tx*.55,y0],[mx,my],2*(1-a*.5),1.3,col);
      line(c,col,1.6,mx,my,ex*.75,ey+4,ex,ey);
      line(c,col,.9,ex*.65,ey+7.6,ex*.65-side*1.5,ey-2.1);
      if(willow){
        for(let k=0;k<8;k++){
          const bx=ex+(r()-.5)*w*.41,by=ey+(r()-.5)*6,dr=8+r()*17;
          poly(c,col,bx-4,by,bx-2,by-3,bx+3,by-2,bx+5,by+1,bx+2,by+3,bx-4,by+2);
          line(c,col,.85,bx+2,by+1,bx+2.9,by+dr*.47,bx+.8,by+dr);
        }
      }else if(j%3===0){line(c,col,.75,ex*.83,ey+3,ex+side*3,ey-4,ex+side*4,ey-8);}
    }c.restore();
  }
  function cave(c,p,seed) {
    const r=rand(seed);
    for(let i=0;i<22;i++){
      const x=i*16-3+r()*6,edge=Math.abs(x-164)/164,k=1+edge*edge;
      const w=6+r()*12,h=(8+r()*17)*k;
      poly(c,p[3],x-w,-2,x+w,-2,x+w*.28,h*.6,x-w*.1,h,x-w*.39,h*.42);
    }
    for(let i=0;i<16;i++){const x=i*22+r()*7,h=7+r()*20;
      poly(c,p[4],x-8,151,x-3,147,x-1,148-h,x+4,139,x+8,152);}
  }
  function furnace(c,p,seed) {
    const r=rand(seed);
    for(let i=0;i<14;i++){
      const x=i*27-20+r()*4,y=116+r()*10,h=17+r()*38,w=5+r()*7;
      poly(c,p[3],x-1,y,x+1,y-h,x+w-1,y-h,x+w+2,y);
      rect(c,p[3],x-1.5,y-h-1,w+3,2.5);
      const roofY=y+1-(i%3)*2,side=Math.min(21,9+w*.5);
      poly(c,p[3],x-side,153,x-side,roofY+5,x-3,roofY-1,x+w+1,roofY-1,x+w+side,roofY+4,x+w+side,153);
      if(i%3===1){rect(c,blend(p[3],p[2],.55),x+w+2,roofY+8,2.1,3.4);}
      if(i===2||i===7||i===11){const col=blend(p[0],p[2],.50);
        line(c,col,.8,x+w*.5,y-h-4,x+w*.5+3,y-h-7,x+w*.5+5,y-h-7.6);}
      
      if(i%2===0){line(c,p[3],1.2,x+w+1,y-4,x+w+11,y-17,x+w+23,y-17);}
    }
    for(const x of [-9,284]){
      masonry(c,x,113,52,39,p[4],p[5],seed+x);
      poly(c,p[4],x-4,113,x+12,98,x+29,97,x+37,104,x+56,113);
      for(let n=0;n<4;n++){rect(c,p[2],x+8+n*8,124,3,7);}
    }
  }
  function sails(c,p,seed) {
    const r=rand(seed);
    for(const x of [-3,54,270,318]){
      const h=20+r()*24,y=146,side=x<160?1:-1;
      poly(c,p[4],x-5,y,x-1,y-h,x+2,y-h-8,x+4,y-h-9,x+9,y);
      poly(c,p[5],x+2,y-h-4,x+4,y-h-9,x+9,y,x+6,y);
      for(let i=0;i<3;i++)line(c,p[3],.9,x-1,y-h+7+i*5,x+side*3,y-h+5+i*5);
    }
  }
  function landscape(c,key,seed) {
    const p=palettes[key],r=rand(seed);ridge(c,blend(p[2],p[3],.52),seed+11,135,false,24);
    switch(key){
      case 'warden':
        farCity(c,p,seed);ridge(c,blend(p[3],p[2],.24),seed+26,148,true,9);
        portal(c,p,7,163,1.35,false,seed);portal(c,p,319,158,1.13,true,seed+18);
        for(const [xx,yy] of [[-8,94],[26,80],[277,108],[318,78]]){
          poly(c,p[4],xx,yy,xx+7,yy-.6,xx+5,yy+4,xx+6,yy+9,xx+4,yy+6,xx+2,yy+13,xx+1,yy+7);
        }break;
      case 'egg':
        ridge(c,p[3],seed+5,133,false,21);windmill(c,54,132,.88,p,.53);windmill(c,286,142,.53,p,-.24);
        for(let j=0;j<13;j++){const x=j*26+7;fir(c,x,142,9+r()*13,p[3],r);}
        ridge(c,blend(p[4],p[2],.46),seed+25,149,true,12);break;
      case 'skeleton':
        for(let j=0;j<13;j++){
          const xx=j*29-9+r()*10,hh=18+r()*30;
          if(j%4===0)tree(c,xx,140,hh,12+r()*7,p[3],seed+j*29);
          else if(j%4===2){
            const sy=139-hh*.75;
            poly(c,p[3],xx-4,139,xx-3,sy,xx,sy-10,xx+3,sy,xx+5,139);
            line(c,p[3],.8,xx,sy-10,xx,sy-16);line(c,p[3],.8,xx-1.6,sy-13,xx+2,sy-13);
          }else fir(c,xx,139,hh,p[3],r);
        }
        ridge(c,p[3],seed+21,146,false,14);crypts(c,p,seed+7);
        tree(c,298,141,66,28,p[4],seed+17);tree(c,19,152,49,19,p[4],seed+50);break;
      case 'maw':cave(c,p,seed);ridge(c,p[3],seed+6,143,false,12);break;
      case 'guard':furnace(c,p,seed);ridge(c,p[3],seed+21,149,false,9);break;
      case 'toad':
        ridge(c,p[3],seed+33,135,false,11);
        for(const [x,y,h,w] of [[8,140,48,28],[66,140,38,21],[247,140,28,17],[304,142,59,25]])
          tree(c,x,y,h,w,p[4],seed+x,true);
        break;
      case 'reaper':
        ridge(c,p[3],seed+14,132,false,37);sails(c,p,seed);
        tree(c,25,147,59,21,p[4],seed+28);tree(c,295,148,83,27,p[4],seed+23);break;
    }
    ridge(c,blend(p[3],p[4],.26),seed+74,158,false,10);
    // Thin details keep the distant silhouette from looking like a row of repeated polygons.
    for(let j=0;j<45;j++){
      const xx=r()*W,yy=149+r()*7,e=Math.abs(xx-164)/164;
      if(r()>.22+e*.61)continue;
      if(key==='guard'||key==='warden'||key==='reaper'){
        const ww=1+r()*3,hh=1.5+r()*4;
        poly(c,p[3],xx,yy,xx+.3,yy-hh,xx+ww*.6,yy-hh-1,xx+ww,yy-1);
        if(j%5===0)line(c,p[4],.6,xx+ww*.6,yy-hh,xx+ww*.6,yy-hh-3);
      }else if(j%2===0){grass(c,xx,yy,4+r()*5,p[3],seed+j*7,true);}
    }
    // A lit ledge or shallows sets the feet into a tangible plane.
    const water=key==='toad'||key==='maw';const y0=water?149:156;
    const gr=c.createLinearGradient(0,y0,0,H);
    gr.addColorStop(0,blend(p[2],p[3],.15));gr.addColorStop(.44,blend(p[2],p[3],.53));gr.addColorStop(1,blend(p[3],p[5],.62));
    rect(c,gr,0,y0,W,H-y0);
    for(let i=0;i<340;i++){
      const x=r()*W,y=y0+r()*(H-y0),f=(y-y0)/(H-y0);c.globalAlpha=.17+r()*.28;
      const len=(.5+r()*(water?12:3))*(.4+f);
      rect(c,i%3===0?p[1]:p[4],x,y,len,.4+r()*.75);
    }
    c.globalAlpha=1;
    if(!water){
      // Shallow furrows pivot towards a single vanishing point.
      for(let j=0;j<28;j++){
        const end=r()*(W+80)-40,begin=mix(160,end,.47+r()*.36),stop=mix(160,end,.9);
        const yy=161+r()*8;c.globalAlpha=.10+r()*.13;
        line(c,j%3?p[3]:p[1],.65,begin,yy,stop,yy+5.4,end,yy+9+r()*3);
      }c.globalAlpha=1;
    }
  }
  function grass(c,x,y,h,color,seed,reeds=false) {
    const r=rand(seed);
    for(let j=0;j<4;j++){
      const a=(r()-.5)*1.3,hh=h*(.4+.6*r()),dx=Math.sin(a)*hh*.6;
      poly(c,color,x+r()*3,y,x+dx*.6,y-hh*.63,x+dx,y-hh,x+dx*.64+1.3,y-hh*.37,x+2,y);
      if(reeds&&j===0)line(c,color,1.8,x+dx*.94,y-hh+2,x+dx,y-hh-1);
    }
  }
  function frontier(c,key,seed) {
    const p=palettes[key],r=rand(seed+105);
    for(const flip of [false,true]){
      c.save();if(flip){c.translate(W,0);c.scale(-1,1);}
      switch(key){
        case 'warden':
          // Fallen teeth from two different battlements leave an open centre silhouette.
          for(let j=0;j<3;j++){
            const x=-10+j*11+(flip?1:0),y=130+r()*8;
            masonry(c,x,y,9+r()*7,44,p[5],blend(p[5],p[6],.45),seed+j+6);
            rect(c,p[5],x-1,y-2,6+r()*6,3);
          }
          line(c,p[5],1.3,2,82,12,71,17,62,19,56);
          line(c,p[5],1,11,72,15,73,22,67);
          break;
        case 'egg':{
          const a=flip?122:112;
          line(c,p[5],2.4,-1,a+18,61,150);line(c,p[5],1.8,-4,a+26,60,157);
          for(const [x,y] of [[9,a+14],[35,a+24],[56,145]])poly(c,p[5],x,y+16,x-1,y-7,x+1,y-11,x+3,y+17);
          break;}
        case 'skeleton':
          masonry(c,-5,50,13,103,p[5],p[6],seed);
          masonry(c,-7,43,22,8,p[5],p[6],seed+1);
          tree(c,-5,156,95,32,p[5],seed+Math.round(r()*19));
          for(let j=0;j<3;j++){const x=13+j*12,y=164-j*2;
            poly(c,p[5],x-6,y,x-6,y-16,x-2,y-21,x+2,y-20,x+6,y-15,x+6,y);}
          break;
        case 'maw':
          poly(c,p[5],-2,-1,63,-2,55,5,38,9,35,20,31,34,28,30,26,15,20,20,13,21,10,45,6,54,4,33,-2,38);
          poly(c,p[4],2,0,42,0,27,12,17,12,10,25);break;
        case 'guard':
          masonry(c,-5,59,17,105,p[5],p[6],seed+19);
          line(c,p[5],3,-6,55,28,83,38,83);line(c,p[5],2.1,13,77,18,65,47,65);
          for(let j=0;j<6;j++)line(c,p[5],.9,40+j*5,65,40+j*5,74+j);
          break;
        case 'toad':
          tree(c,flip?2:-8,164,116,38,p[5],seed+Math.round(r()*99),true);break;
        case 'reaper':
          tree(c,-5,172,97,46,p[5],seed+Math.round(r()*52));
          line(c,p[5],1.4,-1,116,13,111,34,112,42,107);
          for(const x of [3,19,31])poly(c,p[5],x,112,x+2,112,x+4,120+r()*14,x,121);
          break;
      }
      c.restore();
    }
    for(let i=0;i<160;i++){
      const x=r()*W,e=Math.abs((x-W*.5)/(W*.5)),y=171+6*r()-4*e;
      if(r()>e*.84+.08)continue;
      if(key==='guard'||key==='reaper'){
        const l=r()*(1.7+4*e);poly(c,p[5],x-l,y,x-l*.25,y-l*.65,x+l*.55,y-l*.48,x+l,y);
      }else grass(c,x,y,(2+6*e)*(.5+r()),p[5],seed+i*17,key==='toad');
    }
  }
  function finishScenery(layer,p,seed,foreground=false) {
    const c=layer.getContext('2d'),im=c.getImageData(0,0,W,H),src=new Uint8ClampedArray(im.data),out=im.data;
    const sky=rgb(p[2]),ink=rgb(p[6]);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=(y*W+x)*4;if(!src[i+3])continue;
      const v=(src[i]+src[i+1]*1.5+src[i+2]*.5)/3;
      const nx=Math.min(W-1,x+1),ny=Math.max(0,y-1),j=(ny*W+nx)*4;
      const neighbor=(src[j]+src[j+1]*1.5+src[j+2]*.5)/3;
      const up=src[j+3]?Math.max(0,neighbor-v):0;
      const dim=clamp(((sky[0]+sky[1])*.5-v)/112);
      const grain=hash(x,y,seed+42),earth=noise(x*.17,y*.30,seed+22),slit=noise(x*.066+.8,y*.62,seed+7);
      const stipple=(grain-.5)*(2.5+dim*4.5)+(earth-.5)*dim*8+(slit-.5)*dim*5;
      const edge=Math.min(11,up*.20)*(.38+.62*grain);
      for(let ch=0;ch<3;ch++){
        const delta=stipple*(ch===2?.71:1)+edge*(ch===0?1:ch===1?.82:.60);
        const mark=(grain>.955&&dim>.42)?mix(1.2,5.5,dim):0;
        out[i+ch]=Math.max(ink[ch]*.76,Math.round((src[i+ch]+delta+mark)*.5)*2);
      }
      if(foreground&&src[i+3]<252)out[i+3]=src[i+3]<48+bayer[y&3][x&3]*5?0:Math.min(255,src[i+3]*1.35);
    }
    c.putImageData(im,0,0);
  }
  const caches=new Map();
  function makeScene(key) {
    const seed=1748+ids.indexOf(key)*517,p=palettes[key],back=surface(W,H),front=surface(W,H),mob=surface(W,H);
    const center=sky(back,key,seed);landscape(back.getContext('2d'),key,seed);frontier(front.getContext('2d'),key,seed);
    finishScenery(back,p,seed);finishScenery(front,p,seed+31,true);
    // A fixed, local hammered-ink grain follows the puppet when it leans or recoils.
    const grain=new Uint8Array(W*H);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)grain[y*W+x]=Math.round(255*(.51*hash(x,y,seed+181)+.33*noise(x*.28,y*.16,seed+51)+.16*noise(x*.084,y*.34,seed+65)));
    // A shadow transmittance lookup is cast through actual foreground alpha.
    const lw=82,lh=45,maskCanvas=surface(lw,lh),mc=maskCanvas.getContext('2d',{willReadFrequently:true});
    mc.drawImage(front,0,0,lw,lh);
    const raw=mc.getImageData(0,0,lw,lh).data,cover=new Uint8Array(lw*lh);
    for(let i=0;i<cover.length;i++)cover[i]=raw[i*4+3];
    // Two gobo silhouettes above the scene also interrupt a portion of the incoming rays.
    const roots= key==='guard'?[-11,18,36,57,90]:key==='maw'?[-8,7,21,35,63,78,89]:[-8,3,18,32,62,77,90];
    for(const [j,n] of roots.entries())for(let y=0;y<(key==='maw'?6:3+(j%2));y++)
      for(let x=Math.max(0,n);x<Math.min(lw,n+3+(j%3)*2);x++)cover[y*lw+x]=210;
    const ray=surface(lw,lh),rc=ray.getContext('2d'),rayData=rc.createImageData(lw,lh);
    const mists=surface(152,23),mx=mists.getContext('2d'),mi=mx.createImageData(152,23),cloud=rgb(p[1]);
    for(let y=0;y<23;y++)for(let x=0;x<152;x++){
      const t=Math.sin(x/151*Math.PI)**.63*Math.sin(y/22*Math.PI);
      const n=noise(x*.036,y*.078,seed+44)*.62+noise(x*.11,y*.17,seed+84)*.38;
      const i=(y*152+x)*4;mi.data[i]=cloud[0];mi.data[i+1]=cloud[1];mi.data[i+2]=cloud[2];
      mi.data[i+3]=Math.round(t*t*clamp((n-.23)*1.3)*82);
    }
    mx.putImageData(mi,0,0);
    const stars=Array.from({length:76},(_,i)=>{const r=rand(seed+751*i);return [r()*W,22+r()*151,r(),r()*TAU]});
    return {p,seed,key,back,front,mob,grain,center,cover,ray,rc,rayData,last:-999,rgb:rgb(p[1]),mists,stars};
  }
  function shafts(s,t) {
    const tick=Math.floor(t*8);
    if(tick===s.last)return;s.last=tick;
    const {cover,rayData,rgb:col}=s,lw=82,lh=45;
    const dx=-.64+Math.sin(tick*.016+s.seed*.01)*.32,dy=-1;
    const px=s.center[0]/4+Math.sin(tick*.015)*9;
    for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){
      let sun=1;
      for(let j=1;j<20;j++){
        const yy=Math.floor(y+dy*j*1.8),xx=Math.floor(x+dx*j*1.8);if(yy<0||xx<0||xx>=lw)break;
        const k=cover[yy*lw+xx];if(k>0){sun*=1-(k/255)*.78;if(sun<.1)break;}
      }
      const spread=Math.max(0,1-Math.abs(x-px+y*dx*.55)/55),vertical=Math.sin((y+5)/(lh+12)*Math.PI);
      const a=clamp(sun*(.22+spread*.78)*vertical*(.72+.28*Math.sin((x-y*dx)*.23+tick*.016)))*21;
      const pos=(y*lw+x)*4;rayData.data[pos]=col[0];rayData.data[pos+1]=col[1];rayData.data[pos+2]=col[2];
      rayData.data[pos+3]=Math.round(a);
    }
    s.rc.putImageData(rayData,0,0);
  }
  function ambience(c,s,t,front=false) {
    const {stars,key,p,mists}=s;
    if(!front){
      const drift=(t*.7)%37;
      c.save();c.globalAlpha=.72;c.drawImage(mists,16+drift,135,173,19);
      c.globalAlpha=.56;c.drawImage(mists,189-drift*.5,130,152,19);
      c.restore();return;
    }
    c.save();
    for(let i=0;i<stars.length;i++){
      const [x,y,h,phi]=stars[i];
      if(i%3===0&&key==='toad'){
        const xx=(x+t*(.35+h))%W,yy=145+17*h;
        const a=(Math.sin(t*1.7+phi)*.5+.5)**3;c.globalAlpha=.09+a*.42;
        rect(c,p[1],xx,yy,1,1);rect(c,p[1],xx-1,yy,3,.4);continue;
      }
      if(i>34)continue;
      const warm=key==='guard'||key==='reaper';
      const xx=(x+t*(.6+h*(warm?2.7:1.3))+Math.sin(phi+t*.37)*1.9)%W;
      const yy=24+((y-24 - t*(warm?1.8+h*2.7:.26+h*.47))%143+143)%143;
      c.globalAlpha=(.12+.16*(Math.sin(phi+t*.67)*.5+.5))*(warm?1.36:1);
      rect(c,i%5===0?p[4]:p[1],Math.round(xx),Math.round(yy),h>.82?1.65:.95,warm&&i%4===0?1.9:.9);
    }
    if(key==='toad'||key==='maw'){
      for(let i=0;i<14;i++){
        const [x,,h,phi]=stars[45+i],k=(t*.28+h)%1;
        c.globalAlpha=Math.sin(k*Math.PI)*.22;c.strokeStyle=p[1];c.lineWidth=.7;
        c.beginPath();c.ellipse(x,151+h*20,1+k*(3+h*6),.4+k*1.1,0,phi+.2,phi+4.6);c.stroke();
      }
    }
    c.restore();
  }
  function foot(c,x,p,flip=false){
    const s=flip?-1:1;
    poly(c,p[6],x-2*s,-5,x+2*s,-5,x+2*s,-2,x+7*s,-1,x+6*s,1,x-3*s,1);
    line(c,p[7],.8,x+1*s,-2,x+5*s,-1);
  }
  function buckler(c,x,y,s,p,style,angle=0) {
    joint(c,x,y,angle,k=>{
      k.scale(s,s);
      if(style==='leaf'){
        poly(k,p[6],-3,-17,6,-15,12,-8,11,4,7,14,0,21,-6,19,-12,5,-13,-7);
        poly(k,p[7],-3,-14,4,-13,8,-7,8,4,3,13,0,17,-4,16,-8,8,-10,-5);
        poly(k,p[6],-.5,-12,5,-9,6,-1,3,9,.3,14,-2,7);
        line(k,p[8],1,-8,-8,-3,-13,3,-12,7,-8);
        line(k,p[8],.8,-3,1,0,-4,3,1,0,5,-3,1);
      }else{
        poly(k,p[6],-11,-8,-6,-14,3,-15,10,-10,13,-2,11,8,4,14,-5,13,-11,7,-13,0);
        poly(k,p[7],-9,-8,-5,-11,3,-12,8,-8,10,-2,8,7,3,11,-4,10,-8,6,-10,0);
        line(k,p[8],1.2,-9,2,-9,-5,-4,-10,2,-11);
        poly(k,p[6],-3,-3,1,-5,4,-2,3,3,-1,5,-4,2);
        for(const [a,b] of [[-6,-7],[7,-4],[4,8],[-7,5]])rect(k,p[8],a,b,1.25,1.25);
      }
    });
  }
  function metal(c,x,y,points,p) {
    const coords=[];for(let i=0;i<points.length;i+=2)coords.push(x+points[i],y+points[i+1]);
    poly(c,p[6],...coords);
  }
  function knife(c,x,y,angle,size,p,type='knife') {
    joint(c,x,y,angle,k=>{
      k.scale(size,size);
      if(type==='spear'){
        line(k,p[6],2,0,17,0,-83);line(k,p[7],.78,-.45,16,-.45,-81);
        poly(k,p[6],-3,-81,-2,-87,1,-102,4,-87,2,-78,0,-74);
        poly(k,p[8],0,-82,1,-98,2,-86,1,-81);
        for(let j=0;j<4;j++)line(k,p[8],.75,-1.7,-76+j*1.8,1.8,-76.6+j*1.8);
      }else{
        poly(k,p[6],-1,5,-1,-6,-4,-8,-4,-10,-1.8,-10,-2.4,-18,-.4,-29,2,-34,4,-17,2,-9,5,-8,4.3,-6,1,-7,1.2,5);
        poly(k,p[8],-.7,-10,-.8,-19,1.6,-29,1,-17);rect(k,p[7],-1.4,-2,2.5,1);
      }
    });
  }
  function warden(c,t,s,p) {
    const breath=Math.sin(t*1.9),lean=s.wind,rx=-lean*7+s.hit*4,ry=breath*.8+lean*2.7;
    // Rear greaves behind the split surcoat.
    const a1=[rx-7,-30+ry],a2=[rx+8,-29+ry];
    limb(c,a1,[-12,-3],14,16,1,2.7,[p[6],p[7]]);limb(c,a2,[12,-3],16,15,-1,3.1,[p[6],p[7]]);
    foot(c,-12,p,true);foot(c,12,p);
    c.save();c.translate(rx,ry);
    const hand=[-23-lean*11,-38-lean*9],shield=[21+lean*5,-35-lean*9];
    knife(c,hand[0],hand[1],-.43-lean*.64+breath*.014,1,p,'spear');
    // A weathered pennon tied below the ferrule: its point lags behind a thrust.
    joint(c,hand[0],hand[1],-.43-lean*.64+breath*.014,k=>{
      const wave=Math.sin(t*2.24)*2;
      poly(k,p[7],.5,-72,5,-72+wave*.28,11,-69+wave,15,-71+wave,12,-67+wave,
        15,-65+wave,8,-66+wave,4,-69,.5,-68);
      line(k,p[8],.65,1,-71,5,-70.7+wave*.24,8,-69.1+wave*.6);
    });
    limb(c,[-11,-62],hand,17,16,1,3.05,[p[6],p[7]]);
    limb(c,[13,-62],shield,15,15,-1,3.65,[p[6],p[7]]);
    const flare=Math.sin(t*2.45)*1.8;
    poly(c,p[6],-7,-69,-14,-62,-16,-48,-21,-36,-22+flare,-18,-16,-22,-19+flare,-10,-10,-20,-8,-14,2,-18,8,-12,11,-19,18,-12,16,-29,23,-20,20,-43,16,-55,11,-65);
    poly(c,p[7],-6,-63,-12,-56,-13,-45,-19,-29,-15,-31,-15+flare,-19,-8,-33,-5,-48);
    poly(c,blend(p[6],p[7],.52),3,-51,10,-55,16,-44,18,-27,11,-36,10,-21,6,-32,-1,-25);
    // Tattered strips hang from the shoulders around the air gaps of the split mantle.
    for(let i=0;i<5;i++){
      const side=i%2?1:-1,j=Math.floor(i/2),xx=side*(11+j*3.15),end= -20+j*3+Math.sin(t*2.2+i)*2.4;
      poly(c,i%3===1?p[7]:p[6],side*10,-57,xx+side*1.3,-47,xx+side*(3.6+j),-33,
        xx+side*(6.8+j)+flare,end,xx+side*2.8+flare,end-3,xx,-33);
      if(i%2===0)line(c,p[7],.8,xx+side,-42,xx+side*2.4,-35,xx+side*3.7,-30);
    }
    poly(c,p[6],-8,-63,-4,-70,5,-71,11,-63,8,-48,1,-42,-6,-47);
    poly(c,p[7],-7,-61,-2,-66,6,-64,8,-59,1,-51,-5,-53);
    line(c,p[8],1.05,-6,-60,-2,-63,3,-63);line(c,p[6],1.5,-3,-56,3,-60,7,-59);
    for(const f of [-1,1]){
      poly(c,p[6],f*6,-66,f*10,-69,f*15,-65,f*16,-62,f*13,-58,f*8,-60);
      line(c,p[7],1.1,f*8,-65,f*11,-67,f*14,-64);
    }
    for(let j=0;j<6;j++){
      const z=-51+j*2.15,xx=-6+j*.5;
      line(c,p[7],1,xx,z,xx+4.6,z+.6,xx+8.9,z-2);
      if(j%2===0)rect(c,p[8],xx+1,z+.1,.9,.75);
    }
    line(c,p[8],1,-9,-42,5,-45,8,-48);rect(c,p[8],-1,-45,3,2);
    for(let j=0;j<4;j++)line(c,p[7],.8,-8+j*4,-34,-11+j*5,-24-j%2*2);
    const tassel=Math.sin(t*2+.7);
    line(c,p[7],.75,-10,-39,-7,-34,-9,-28,-13,-26);
    line(c,p[8],.75,-11,-38,-8,-34,-9,-31);
    line(c,p[6],.8,7,-39,12,-34,14,-28+tassel);rect(c,p[7],13,-27+tassel,1.5,1.5);
    buckler(c,shield[0],shield[1],.83,p,'leaf',-.20+lean*.41);
    oval(c,p[6],hand[0],hand[1],3.4,3);rect(c,p[7],hand[0]-2,hand[1]-2,2,1);
    joint(c,1,-70,breath*.022-lean*.16,k=>{
      // Hollow helm with a visor grille and two asymmetrical forked antlers.
      beam(k,[-4,-7],[-8,-22],1.6,.75,p[6],p[7]);
      line(k,p[6],1.5,-8,-20,-14,-28,-13,-38);line(k,p[6],1.05,-9,-20,-8,-27,-9,-34);
      line(k,p[6],1.1,-13,-30,-17,-32,-18,-36);
      beam(k,[4,-9],[10,-23],1.6,.7,p[6],p[7]);
      line(k,p[6],1.35,9,-22,15,-30,17,-39);line(k,p[6],1.0,12,-26,12,-33,13,-35);
      poly(k,p[6],-9,-5,-8,-12,-4,-16,3,-17,8,-13,10,-7,7,1,2,7,-4,5,-7,1);
      poly(k,p[7],-7,-8,-5,-13,0,-15,4,-13,4,-11,-2,-7);
      line(k,p[8],1.1,-7,-5,-3,-6,1,-5);line(k,p[8],.85,3,-6,6,-7);
      line(k,p[7],1,0,-1,0,3);line(k,p[7],.8,3,-2,2,2);
    });
    c.restore();
  }
  function egg(c,t,s,p) {
    const q=Math.sin(t*2.2),wind=s.wind,xx=-wind*7+s.hit*4,yy=q*1.2+wind*4;
    limb(c,[xx-7,-18+yy],[-10,-3],10,10,1,1.8,[p[6],p[7]]);
    limb(c,[xx+8,-18+yy],[12,-3],10,12,-1,1.95,[p[6],p[7]]);
    foot(c,-10,p,true);foot(c,12,p);
    c.save();c.translate(xx,yy);c.rotate(-wind*.1+q*.014);
    const fist=[-25-9*wind,-22-12*wind],buck=[23+wind*3,-24+wind*2];
    knife(c,fist[0],fist[1],-.28-wind*1.25,.71,p);limb(c,[-10,-34],fist,10,10,1,1.8,[p[6],p[7]]);
    limb(c,[12,-33],buck,9,9,-1,1.8,[p[6],p[7]]);
    const shell=blend(p[2],p[8],.34),shellShade=blend(p[8],p[7],.22);
    poly(c,p[6],-14,-15,-18,-23,-19,-33,-18,-42,-14,-51,-8,-58,-2,-62,3,-63,9,-59,15,-50,20,-37,21,-27,18,-18,13,-13,3,-11,-7,-11);
    poly(c,shellShade,-13,-17,-16,-24,-16,-34,-15,-42,-11,-50,-5,-57,0,-60,5,-59,12,-51,17,-38,18,-25,15,-18,11,-15,2,-13,-7,-14);
    poly(c,shell,-13,-25,-15,-34,-11,-48,-4,-56,3,-60,8,-54,12,-46,11,-36,8,-31,6,-24,0,-20,-8,-20);
    line(c,blend(shell,p[1],.67),1.8,-12,-40,-10,-47,-6,-52,-2,-55);
    poly(c,p[6],-16,-34,-10,-35,-7,-40,-3,-35,0,-38,5,-36,9,-41,13,-36,18,-39,14,-31,8,-30,5,-27,0,-31,-5,-29,-10,-32,-14,-29);
    poly(c,p[8],-6,-33,-3,-35,1,-33,5,-33,3,-31,-1,-32);
    rect(c,p[1],-1.8,-33.2,2.5,1.4);
    line(c,shellShade,.9,-4,-36,-6,-43,-3,-46,-5,-50);line(c,p[7],.8,9,-30,8,-25,12,-22,11,-17);
    for(const [a,b] of [[-9,-25],[-8,-45],[5,-47],[-3,-54],[4,-22],[13,-41]])rect(c,shellShade,a,b,1.3,.9);
    buckler(c,buck[0],buck[1],.66,p,'round',wind*.22);
    oval(c,p[6],fist[0],fist[1],2.4,2.1);c.restore();
  }
  function skeleton(c,t,s,p) {
    const q=Math.sin(t*1.95),a=s.wind,x=-5*a+s.hit*5,y=q*.8+3*a;
    limb(c,[x-5,-42+y],[-11,-4],21,22,1,1.75,[p[6],p[8]]);limb(c,[x+6,-42+y],[11,-4],21,24,-1,1.85,[p[6],p[8]]);
    for(const [xx,f] of [[-11,-1],[11,1]]){
      poly(c,p[6],xx-1,-6,xx+1,-6,xx+2,-1,xx+8*f,-1,xx+7*f,1,xx-2,1);
      rect(c,p[8],xx-1,-3,1,2);
    }
    c.save();c.translate(x,y);
    const sword=[-23-a*17,-37-a*13],free=[22+Math.sin(t*.9)*2,-41-a*4];
    joint(c,sword[0],sword[1],-.68-a*.73,k=>{
      poly(k,p[6],-2,6,-2,-5,-7,-6,-6,-8,-1,-8,-2,-26,0,-45,4,-51,5,-34,3,-8,7,-9,8,-6,2,-5,1,5);
      poly(k,p[8],-.7,-10,1,-30,3.5,-45,2.4,-20,1,-9);
      for(let n=0;n<3;n++)rect(k,p[7],-1.6, -4+n*2,2,.8);
    });
    limb(c,[-10,-74],sword,21,20,1,1.8,[p[6],p[8]]);limb(c,[12,-72],free,18,18,-1,1.85,[p[6],p[8]]);
    for(let i=0;i<3;i++)line(c,p[6],1,free[0]-1+i*1.1,free[1],free[0]+i*1.1,free[1]+4+i*.6);
    // Each pair of ribs is separate, with real openings to the backdrop.
    line(c,p[6],3,0,-76,2,-57,0,-45);
    for(let j=0;j<7;j++){const z=-76+j*3.5,w=12-Math.abs(j-1)*1.2;
      line(c,p[6],2.0,-1,z,-w,z-1,-w-1.7,z+1,-w*.57,z+3,-3,z+2.7);
      line(c,p[6],2.0,1,z,w*.72,z-1,w+1,z+1,w-.8,z+2.6,4,z+3.3);
      if(j<5){line(c,p[8],.72,-w,z-1,-w+3,z-.75);rect(c,p[8],1,z,1.3,1.0);}
    }
    poly(c,p[6],-9,-51,-3,-48,3,-49,10,-53,9,-44,6,-40,2,-40,0,-44,-2,-40,-7,-41);
    line(c,p[8],1,-7,-48,-4,-45,-2,-45);line(c,p[7],1,4,-46,8,-49);
    line(c,p[6],2.2,-13,-73,-6,-78,1,-76,12,-77,15,-72);
    poly(c,p[7],3,-76,8,-77,12,-74,13,-70,9,-72,7,-70,6,-74);
    poly(c,p[6],8,-74,13,-71,15,-62,12,-63,12,-53,9,-61,8,-55);
    joint(c,0,-81,-.10+q*.035-a*.1,k=>{
      rect(k,p[6],-1.4,-4,3,10);
      poly(k,p[6],-8,-6,-9,-12,-7,-19,-2,-23,4,-22,8,-18,8,-11,6,-8,5,-3,0,0,-4,-2,-4,-6);
      poly(k,p[7],-7,-13,-7,-17,-3,-20,2,-21,6,-18,6,-14,3,-13,1,-14,-2,-12);
      poly(k,p[6],-6,-11,-4,-13,-1,-11,-2,-8,-5,-8);poly(k,p[6],2,-12,6,-13,6,-10,3,-8);
      line(k,p[8],1,-6,-15,-2,-17,2,-17);rect(k,p[8],-4,-9,1,.9);rect(k,p[8],4,-10,1.25,.85);
      line(k,p[7],1,-3,-5,0,-4,3,-5);for(let i=0;i<3;i++)rect(k,p[8],-3+i*2,-4,1,1.3);
      poly(k,p[6],-6,-19,-5,-24,-3,-22,-1,-28,1,-24,5,-26,5,-20);
    });c.restore();
  }
  function horns(c,x,y,s,flip,p) {
    c.save();c.translate(x,y);c.scale(flip?-s:s,s);
    poly(c,p[6],-3,1,-4,-5,-13,-13,-16,-23,-8,-17,-4,-12,1,-9,4,-4,3,0);
    line(c,p[8],.8,-11,-16,-6,-10,-2,-7);c.restore();
  }
  function maw(c,t,s,p) {
    const pulse=Math.sin(t*2.45),a=s.wind,dx=-a*7+s.hit*4,dy=pulse*1.4+a*2.5;
    const body=blend(p[6],p[7],.50);
    // Twelve hooked tendons grip the shore rather than translating with the head.
    for(let i=0;i<7;i++){
      const side=i%2?1:-1,n=Math.floor(i/2),root=[dx+side*(11+n*3),-29+dy-n*.7];
      const end=[side*(25+n*7)+Math.sin(t*1.1+i)*1.2,-1-n%2];
      const k=limb(c,root,end,15+n*2,18+n*1.7,side,3.3-n*.33,[p[6],p[7]]);
      line(c,p[6],1.1,k[0],k[1],k[0]+side*3,k[1]-5);
      line(c,p[7],.7,end[0],end[1],end[0]+side*3,end[1]+.4);
    }
    c.save();c.translate(dx,dy);c.rotate(.055+a*.10);
    // Hooked whiskers and an articulated lateral feeding root break the round frontal outline.
    const whip=Math.sin(t*1.73+.4);
    const root=[[16,-34],[25,-42],[36,-42+whip],[46,-34+whip*2],[52,-22+whip*2],[56,-18+whip],[59,-21+whip]];
    for(let j=1;j<root.length;j++)beam(c,root[j-1],root[j],Math.max(.6,4.8-j*.68),Math.max(.38,4.1-j*.62),p[6],p[7]);
    for(let j=2;j<5;j++)poly(c,p[6],root[j][0]-2,root[j][1]+.5,root[j][0]-2.8,root[j][1]-5+j*.4,root[j][0]+1,root[j][1]);
    line(c,p[6],1.3,-17,-30,-29,-27,-35,-30-whip*2,-36,-36-whip*2);
    line(c,p[7],.85,-20,-26,-29,-23,-36,-25-whip*1.2);
    poly(c,p[6],-25,-20,-31,-29,-30,-41,-22,-52,-13,-59,4,-65,19,-63,30,-55,35,-40,30,-27,21,-17,9,-10,-6,-10,-18,-14);
    poly(c,body,-26,-28,-25,-41,-16,-52,-1,-59,16,-59,27,-51,30,-41,26,-34,12,-22,0,-18,-14,-19);
    for(let j=0;j<8;j++){
      const zk=-56+(j%3)*2,xx=-14+j*5.8;
      poly(c,p[7],xx-4,zk+2,xx-2.4,zk-6,xx,zk-8-j%2*2,xx+3,zk+3);
      if(j%2)rect(c,p[8],xx-.5,zk-4,.7,2.4);
    }
    const z=-36-pulse*1.2,open=5+a*8;
    poly(c,p[6],-28,z-1,-26,z-8,-18,z-15,-8,z-18,6,z-17,18,z-12,24,z-4,23,z+4,17,z+open,5,z+open+6,-11,z+open+4,-24,z+open);
    poly(c,blend(p[6],'#17180e',.30),-25,z,-18,z-9,-8,z-12,4,z-12,14,z-8,21,z,-3,z+open+1,-17,z+open+1);
    for(let j=0;j<8;j++){
      const xx=-23+j*5.5+(j%3-1)*.65,up=z-3.5-9*Math.sin((j+.3)/8*Math.PI)+(j%2)*.9;
      poly(c,p[8],xx,up,xx+4.3,up-1.1,xx+2.65,up+4+(j%3));
    }
    for(let j=0;j<6;j++){
      const xx=-18+j*6.4,bt=z+open+Math.sin(j/6*Math.PI)*3;
      poly(c,p[7],xx,bt,xx+2.4,bt-5-(j%2)*2,xx+4.4,bt);
    }
    line(c,p[8],1.3,-26,z-4,-18,z-12,-9,z-16,0,z-16);
    for(const [xx,yy] of [[-14,-53],[-8,-56],[6,-56],[13,-54],[20,-51]]){
      oval(c,p[6],xx,yy,2.5,1.85);rect(c,p[8],xx-.9,yy-.65,1.8,1.2);
    }
    for(let i=0;i<6;i++){const xx=-15+i*5.8;line(c,p[7],1,xx,-18-i%2,xx+2,-15-i%3);}
    c.restore();
  }
  function guard(c,t,s,p) {
    const v=Math.sin(t*1.65),a=s.wind,x=-a*7+s.hit*4,y=v*.8+a*3.5;
    for(const [side,dx] of [[-1,-14],[1,17]]){
      const k=limb(c,[x+side*10,-30+y],[dx,-4],15,16,side*-1,4,[p[6],p[7]]);
      metal(c,k[0],k[1],[-4,-2,3,-3,4,0,2,5,-2,6,-5,3],p);
      foot(c,dx,p,side<0);
    }
    c.save();c.translate(x,y);
    const grip=[-28-a*9,-42-a*18];
    joint(c,...grip,-.6-a*.77+v*.01,k=>{
      line(k,p[6],3,0,10,0,-29);line(k,p[8],.8,-.6,0,-.6,-25);
      poly(k,p[6],-13,-29,-11,-36,-2,-36,1,-34,7,-35,13,-32,11,-24,7,-22,1,-24,-4,-24,-6,-22,-12,-23);
      poly(k,p[7],-10,-33,-3,-34,2,-31,10,-32,9,-29,-11,-29);
      line(k,p[8],1,-10,-33,-4,-34,0,-32);
    });
    limb(c,[-17,-63],grip,18,17,1,4.2,[p[6],p[7]]);
    poly(c,p[6],-17,-65,-13,-71,-1,-73,11,-71,21,-63,23,-50,20,-33,22,-23,16,-16,10,-20,4,-15,-5,-17,-12,-15,-16,-22,-21,-24,-18,-41);
    poly(c,p[7],-14,-61,-9,-66,2,-69,13,-64,15,-55,10,-48,0,-44,-10,-47,-16,-54);
    poly(c,blend(p[6],p[7],.50),-12,-60,-6,-64,5,-64,12,-59,6,-56,-4,-53,-13,-55);
    for(let j=0;j<4;j++){
      const z=-49+4*j;line(c,p[7],1.4,-14,z,1,z+3,14,z-1);
    }
    rect(c,p[7],-15,-31,32,2);rect(c,p[8],-2,-32,5,3);
    for(let i=0;i<4;i++){
      const xx=-10+i*7;
      poly(c,i%2?p[7]:p[6],xx,-27,xx+4,-27,xx+3,-19,xx+1,-17,xx-1,-19);
    }
    for(const f of [-1,1]){
      poly(c,p[6],f*8,-67,f*13,-74,f*20,-72,f*25,-66,f*25,-61,f*18,-58,f*11,-62);
      line(c,p[8],.9,f*12,-69,f*16,-71,f*21,-69);
    }
    joint(c,0,-72,-.06-a*.11,k=>{
      poly(k,p[6],-12,0,-9,-4,-9,-13,-5,-20,1,-23,6,-20,10,-13,11,-4,14,0,11,2,-8,3);
      poly(k,p[7],-6,-13,-3,-18,1,-20,5,-17,7,-11,0,-11);
      poly(k,p[6],-10,-9,8,-12,10,-8,7,-6,-8,-5);
      line(k,p[8],1.2,-8,-8,-2,-8,2,-9);line(k,p[8],.65,4,-9,7,-9);
      for(let j=0;j<4;j++)rect(k,p[7],-4+j*3,-4,.9,3.5);
      poly(k,p[6],-2,-20,-4,-27,-2,-31,2,-30,4,-26,10,-22,14,-20,7,-20,10,-17,3,-20);
    });
    joint(c,22,-41,-.17+a*.28,k=>{
      poly(k,p[6],-10,-19,-3,-26,7,-23,15,-16,16,8,12,18,3,25,-7,21,-13,14,-14,-10);
      poly(k,p[7],-8,-18,-2,-22,5,-20,12,-13,12,7,9,16,3,21,-4,18,-10,12,-10,-10);
      poly(k,p[6],-5,-16,1,-18,9,-12,8,8,4,15,-1,14,-6,8);
      line(k,p[8],1.1,-10,-7,-8,-17,-2,-21,4,-19);
      line(k,p[7],1.7,1,-11,1,10);line(k,p[8],.95,-4,-3,1,-6,6,-3);
      for(const [xx,yy] of [[-8,-12],[8,-13],[9,9],[-7,12]])rect(k,p[8],xx,yy,1.6,1.4);
    });
    oval(c,p[6],grip[0],grip[1],3.2,3);c.restore();
  }
  function toad(c,t,s,p) {
    const q=Math.sin(t*2.15),a=s.wind,dx=-a*5+s.hit*5,dy=q*1.1+a*5;
    const mid=blend(p[6],p[7],.54),lit=blend(p[7],p[8],.41);
    for(const side of [-1,1]){
      const hip=[dx+side*18,-18+dy],end=[side*37,-1],k=elbow(hip,end,17,17,-side);
      beam(c,hip,k,7.8,5.3,p[6]);beam(c,k,end,4.5,1.7,p[6],p[7]);
      for(let i=0;i<3;i++){
        const z=end[0]+side*(4+i*2);
        poly(c,p[6],end[0]-2,end[1]-2,z,-4+i*2,z+side*3,-3+i*2,
          z,-2.2+i*1.5,end[0]+side*1.5,1);
      }
      line(c,p[7],1.2,hip[0],hip[1]-2,k[0],k[1]-1);
    }
    c.save();c.translate(dx,dy);c.scale(1+a*.08,1-a*.075);
    poly(c,p[6],-30,-17,-34,-25,-31,-32,-24,-37,-24,-45,-20,-51,-15,-51,-9,-44,2,-44,11,-46,14,-51,19,-52,24,-47,25,-40,33,-34,36,-24,31,-16,25,-12,13,-9,-3,-9,-18,-10);
    poly(c,mid,-28,-27,-23,-34,-21,-40,-17,-43,-12,-40,-5,-39,6,-39,12,-42,17,-45,21,-42,22,-38,28,-33,31,-28,24,-23,13,-20,-3,-20,-16,-20);
    const throat=2+Math.max(0,q)*2.1+a*4;
    poly(c,p[7],-23,-21,-17,-23,-3,-23,12,-24,26,-25,23,-19,16,-15+throat,4,-13+throat,-8,-13+throat,-18,-16);
    line(c,lit,1,-17,-19,-9,-17,2,-16,12,-18);
    line(c,p[6],2,-29,-25,-21,-24,-9,-26,3,-24,20,-27,29,-29);
    line(c,p[8],.9,-24,-26,-18,-26,-13,-27);
    for(const [xx,yy]of[[-18,-44],[17,-46]]){
      oval(c,p[6],xx,yy,4.8,3.4);oval(c,p[8],xx,yy,3,1.75);rect(c,p[6],xx-.15,yy-2,.85,3.2);
    }
    for(const [xx,yy,sz]of[[-26,-32,1.6],[-20,-34,1],[-13,-37,1.4],[-7,-33,2],[2,-37,1],[9,-34,1.45],[16,-38,1.25],[24,-32,1.8]]){
      oval(c,p[7],xx,yy,sz,sz*.65);rect(c,lit,xx-.6,yy-.6,1,.7);
    }
    for(const side of [-1,1]){
      const kn=[side*22,-15],arm=[side*12,-27];beam(c,arm,kn,3.7,2.3,p[6],p[7]);
      beam(c,kn,[side*18,-4],2.6,1.8,p[6],p[7]);line(c,p[6],1,side*18,-4,side*22,-2);
    }
    c.restore();
  }
  function reaper(c,t,s,p) {
    const q=Math.sin(t*1.65),r=Math.sin(t*2.08+1),a=s.wind,x=-a*8+s.hit*5,y=q*1.3+a*2.8;
    limb(c,[x-5,-30+y],[-9,-3],16,17,1,1.8,[p[6],p[7]]);
    limb(c,[x+5,-30+y],[11,-3],16,16,-1,1.8,[p[6],p[7]]);
    foot(c,-9,p,true);foot(c,11,p);
    c.save();c.translate(x,y);
    const hand=[-19-a*12,-42-a*6];
    joint(c,hand[0],hand[1],-.24-a*.75,k=>{
      line(k,p[6],2.2,-4,28,.4,-27,-2,-53,2,-70);
      line(k,p[7],.9,-3.8,21,.1,-26,-2,-52);
      poly(k,p[6],-2,-63,0,-73,7,-79,19,-80,33,-78,40,-73,
        51,-65,59,-54,62,-43,56,-51,49,-58,36,-64,23,-69,11,-71,5,-68,2,-63);
      poly(k,p[7],5,-73,15,-77,27,-76,37,-72,46,-66,52,-59,37,-67,23,-72,13,-73);
      line(k,p[8],1,20,-78,31,-76,40,-71,47,-66);
      for(let i=0;i<3;i++)line(k,p[8],.7,-2.8,-59+i*2,1,-60+i*2);
    });
    const backHand=[15+a*5,-40+a];
    limb(c,[-10,-67],hand,18,17,1,2.3,[p[6],p[7]]);
    limb(c,[10,-67],backHand,17,16,-1,2.2,[p[6],p[7]]);
    for(let j=0;j<6;j++){
      const xx=-16+j*6.5,tail=Math.sin(t*2+j*.7)*2.4,aft=3*(j%3);
      poly(c,j%3===1?p[7]:p[6],xx*.43,-58,xx*.75,-42,xx+tail*1.6,-30,xx+tail*2-4,-14+aft,
        xx+6+tail,-22+aft,xx+5+tail,-12+aft,xx+9,-25,xx+7,-47);
    }
    poly(c,p[6],-12,-65,-7,-73,2,-75,12,-67,15,-53,9,-42,2,-39,-4,-42,-11,-48);
    poly(c,p[7],-9,-65,-4,-69,5,-67,8,-63,3,-56,-3,-56);
    for(let j=0;j<3;j++){line(c,p[6],1.25,-5,-63+j*2.3,1,-64+j*2.3,5,-62+j*2.3);}
    line(c,p[8],.9,-7,-43,3,-45,8,-46);
    // Woven, uneven broadbrim; a loose fibre lifts and falls independent of the torso.
    joint(c,0,-72,-.06+q*.02-a*.16,k=>{
      poly(k,p[6],-9,-10,-8,-17,1,-20,7,-15,9,-5,5,1,0,4,-5,1,-6,-4);
      poly(k,p[7],-5,-5,-2,-8,1,-7,4,-8,6,-5,4,-3,2,-1,-3,-2);
      rect(k,p[8],-3.6,-5.7,1.5,1);rect(k,p[8],2.4,-6.5,1.4,.9);
      poly(k,p[6],-25,-10,-20,-14,-11,-16,-4,-29,-1,-33,3,-29,8,-21,11,-18,17,-16,25,-15,27,-13,18,-11,8,-11,0,-10,-7,-9,-17,-8);
      poly(k,p[7],-10,-16,-4,-25,-1,-29,1,-27,4,-21,8,-18,3,-19,-2,-17);
      line(k,p[8],.8,-17,-13,-10,-15,-3,-15,5,-17);
      line(k,p[7],.85,10,-12,16,-11,21,-8+r*.6);line(k,p[6],.8,-16,-10,-13,-4,-13,-1);
    });
    oval(c,p[6],hand[0],hand[1],2.8,2.3);c.restore();
  }
  const puppets={warden,egg,skeleton,maw,guard,toad,reaper};
  const mounts={
    warden:[164,161,1.02,27],egg:[164,160,.99,20],skeleton:[167,161,1.04,19],maw:[169,158,1.05,38],
    guard:[166,161,1.02,32],toad:[164,158,1.14,40],reaper:[167,160,.97,26]
  };
  function inkSkin(s,c,shiftX) {
    // Surface tangent toward the backlight is estimated from neighbouring alpha coverage.
    // Sub-pixel chains and spear tips use ordered coverage rather than a fuzzy outline.
    const bx=53,by=9,w=219,h=158,im=c.getImageData(bx,by,w,h),v=im.data;
    const al=new Uint8Array(w*h);
    for(let n=0;n<al.length;n++)al[n]=v[n*4+3];
    const light=rgb(s.p[1]),crease=rgb(s.p[6]),cast=Math.round(shiftX);
    for(let y=1;y<h-2;y++)for(let x=1;x<w-4;x++){
      const n=y*w+x,i=n*4,alpha=al[n];if(!alpha)continue;
      if(alpha<40+bayer[(y+by)&3][(x+bx)&3]*4.2){v[i+3]=0;continue;}
      if(alpha>150)v[i+3]=255;else v[i+3]=Math.min(255,alpha*1.44);
      const gx=(W+bx+x-cast)%W,noise=s.grain[(y+by)*W+gx]/255;
      const rim=(Math.max(0,(alpha-al[n-w+1])/255)*.24+Math.max(0,(alpha-al[n-w+3])/255)*.08)*(.47+.53*noise);
      const deep=Math.min(1,(al[n+w-1]+al[n+w]+al[n-1])/(3*255));
      const dither=(bayer[y&3][x&3]/16-.47)*3.1;
      const pores=(noise-.5)*33+dither-(deep>.8&&noise<.22?4.5:0);
      for(let ch=0;ch<3;ch++){
        const col=v[i+ch];v[i+ch]=clamp(Math.round((mix(col,light[ch],rim)+pores*(ch===2?.55:ch===1?.78:1))/2)*2,crease[ch]*.66,255);
      }
    }
    c.putImageData(im,bx,by);
  }
  function stampActor(c,s,t,st) {
    const [cx,base,scale,shadow]=mounts[s.key],p=s.p;
    const xx=cx+(st.wind?-st.wind*1.7:0),yy=base;
    c.save();
    c.globalAlpha=(1-st.death)*.16;oval(c,p[6],xx+2,yy+.5,shadow*1.6,3,0);
    c.globalAlpha=(1-st.death)*.30;oval(c,p[6],xx,yy+.1,shadow,1.6,0);c.restore();
    if(st.death>=.999)return;
    const poseKey=[Math.floor((st.reduce?0:t)*22),Math.round(st.wind*52),Math.round(st.hit*48),Math.round(st.death*60)].join('/');
    if(s.lastPose!==poseKey){
      s.lastPose=poseKey;
      const m=s.mob.getContext('2d',{willReadFrequently:true});m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,W,H);
      m.save();m.translate(xx,yy);
      const knock=st.hit*Math.sin(st.hit*3.0+.3);
      m.translate(knock*3.7, -knock*1.8+st.death*5);m.rotate(knock*.042+st.death*.055);
      m.scale(scale*(1+st.death*.04),scale*(1-st.death*.17));
      puppets[s.key](m,st.reduce?0:t,st,p);m.restore();
      inkSkin(s,m,xx-cx);
      if(st.hit>.015){
        m.save();m.globalCompositeOperation='source-atop';m.globalAlpha=Math.min(.86,st.hit*.95);
        rect(m,p[1],78,5,175,166);m.restore();
      }
      if(st.death>.035){
        const step=Math.floor(st.death*15.75);
        m.save();m.globalCompositeOperation='destination-out';
        // Four repeating dispersal patterns preserve fine contour fragments while the silhouette opens.
        const mask=deathMasks[step]||(deathMasks[step]=makeDeathMask(step));
        m.fillStyle=m.createPattern(mask,'repeat');m.fillRect(0,0,W,H);m.restore();
      }
    }
    c.drawImage(s.mob,0,0);
    if(st.death>0&&st.death<1){
      c.save();c.globalAlpha=Math.sin(st.death*Math.PI)*.59;
      for(let j=0;j<29;j++){
        const v=s.stars[j],dx=(v[0]/W-.5)*(39+46*st.death),fy=(v[1]/179);
        rect(c,j%4===0?p[8]:p[6],cx+dx,base-11-fy*80-st.death*(5+14*fy),j%4===0?1.6:1,1);
      }c.restore();
    }
  }
  const deathMasks=[];
  function makeDeathMask(step) {
    const mask=surface(4,4),c=mask.getContext('2d');
    for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(bayer[y][x]<=step)rect(c,'#000',x,y,1,1);
    return mask;
  }
  const frame=()=>surface(W,H);
  let composite;
  function draw(c,key,time,state={}) {
    if(!palettes[key])key='warden';
    let s=caches.get(key);
    if(!s){s=makeScene(key);caches.set(key,s);}
    const st={wind:clamp(Number(state.wind)||0),hit:clamp(Number(state.hit)||0),death:clamp(Number(state.death)||0),reduce:!!state.reduce};
    const t=Number.isFinite(time)?time:0;
    if(!composite)composite=frame();
    const a=composite.getContext('2d');a.setTransform(1,0,0,1,0,0);
    a.drawImage(s.back,0,0);ambience(a,s,st.reduce?0:t);
    shafts(s,st.reduce?0:t);a.save();a.globalCompositeOperation='screen';a.imageSmoothingEnabled=true;
    a.drawImage(s.ray,0,0,W,H);a.restore();
    stampActor(a,s,t,st);a.drawImage(s.front,0,0);ambience(a,s,st.reduce?0:t,true);
    c.save();c.imageSmoothingEnabled=false;c.drawImage(composite,0,0,W,H);c.restore();
  }
  window.WorldArt=Object.freeze({draw});
})();
