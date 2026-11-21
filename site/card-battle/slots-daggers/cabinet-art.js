/* Cast case, timber, tabletop props and their illumination. All meshes, engraving
   and material maps are generated from the primitives below, in cabinet pixels. */
(() => {
'use strict';
const TAU = 2 * Math.PI;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(n, hi));
const fract = n => n - Math.floor(n);
const cache = new Map();
const P = {
  steel:  { base:[51,59,49], exposed:[151,145,114], rim:['#0c1211','#282e26','#a19775','#666958','#292f27','#111915','#080e0e','#4e5344'] },
  green:  { base:[52,66,54], exposed:[138,137,103], rim:['#101715','#303a30','#a59c78','#68705d','#354335','#1b2621','#0b1513','#515b47'] },
  brown:  { base:[102,68,43], exposed:[185,143,95], rim:['#251c16','#4a3320','#c29a68','#93704b','#5a3e29','#38291e','#251b15','#79563a'] },
  brass:  { base:[106,93,63], exposed:[188,169,115], rim:['#26281e','#494734','#d3b688','#a29069','#74664a','#463e2d','#292c23','#8f825c'] },
  dark:   { base:[37,43,37], exposed:[101,104,82], rim:['#0a1110','#202a23','#7e8166','#535d4b','#2d382e','#15231d','#09100e','#485240'] },
  glass:  { base:[29,36,30], exposed:[90,98,76], rim:['#0b110f','#141b17','#626850','#394735','#1b221b','#101512','#070c09','#353d2d'] }
};
function canvas(w,h) {
  const tmp = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(Math.ceil(w), Math.ceil(h)) : document.createElement('canvas');
  tmp.width = Math.ceil(w); tmp.height = Math.ceil(h);
  return tmp;
}
function cached(key,w,h,draw){
  let im=cache.get(key);
  if(!im){im=canvas(w,h);draw(im.getContext('2d'));cache.set(key,im);}
  return im;
}
function rng(seed){
  let a=seed>>>0;
  return ()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296;};
}
const nrand=rng(571344), noise=new Float32Array(16384);
for(let i=0;i<noise.length;i++)noise[i]=nrand();
function lattice(x,y){return noise[((x|0)*73+(y|0)*917)&16383];}
function smooth(x,y){
  const i=Math.floor(x),j=Math.floor(y);
  let u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);
  return (lattice(i,j)*(1-u)+lattice(i+1,j)*u)*(1-v)+(lattice(i,j+1)*(1-u)+lattice(i+1,j+1)*u)*v;
}
function grad(c,x,y,u,v,stops){
  const g=c.createLinearGradient(x,y,u,v);
  for(let i=0;i<stops.length;i+=2)g.addColorStop(stops[i],stops[i+1]);
  return g;
}
function halo(c,x,y,r,color,strength,sx=1,sy=1){
  if(r<1||strength<=0)return;
  c.save();c.translate(x,y);c.scale(sx,sy);c.globalAlpha*=strength;
  const g=c.createRadialGradient(0,0,.4,0,0,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(5,7,5,0)');
  c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore();
}
function path(c,pts){
  c.beginPath();c.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);
  c.closePath();
}
function poly(c,pts,fill){path(c,pts);c.fillStyle=fill;c.fill();}
function line(c,pts,color,width=1){
  c.strokeStyle=color;c.lineWidth=width;c.lineJoin='bevel';c.lineCap='butt';c.beginPath();
  c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.stroke();
}
function ell(c,x,y,rx,ry,color,rot=0){
  if(rx<=0||ry<=0)return;c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);c.fillStyle=color;c.fill();
}
function bounds(x,y,w,h,cut){
  const q=Math.min(cut,w*.43,h*.43);
  return [[x+q,y],[x+w-q,y],[x+w,y+q],[x+w,y+h-q],[x+w-q,y+h],[x+q,y+h],[x,y+h-q],[x,y+q]];
}
function patinatedTint(value,power){
  if(!/^#[0-9a-f]{6}$/i.test(value))return value;
  const n=parseInt(value.slice(1),16);
  return 'rgb('+[n>>16,(n>>8)&255,n&255].map(a=>Math.min(255,Math.round(a*power))).join(',')+')';
}
function frame(c,x,y,w,h,cut,depth,colors){
  if(w<2||h<2)return;
  const a=bounds(x,y,w,h,cut),b=bounds(x+depth,y+depth,w-depth*2,h-depth*2,Math.max(.5,cut-depth*.45));
  for(let i=0;i<8;i++){
    const j=(i+1)&7;let face=colors[i];
    const span=Math.abs(a[j][0]-a[i][0])+Math.abs(a[j][1]-a[i][1]);
    if(span>53&&depth>1.3&&face[0]==='#'){
      const power=i===0||i===6?1.08:1.01;
      face=grad(c,a[i][0],a[i][1],a[j][0],a[j][1],[0,patinatedTint(face,.78),.18,patinatedTint(face,power),.51,patinatedTint(face,.88),.73,patinatedTint(face,.70),1,patinatedTint(face,.94)]);
    }
    poly(c,[a[i],a[j],b[j],b[i]],face);
  }
}
function uniform(color){return Array(8).fill(color)}
function shadow(c,pts,dx,dy,layers,alpha=.1){
  c.save();c.fillStyle='#070d0b';
  for(let i=layers;i>0;i--){const t=i/layers;c.save();c.translate(dx*t,dy*t);c.globalAlpha*=alpha*(1.13-.35*t);path(c,pts);c.fill();c.restore();}
  c.restore();
}
function texture(name) {
  const mat=P[name];
  return cached('alloy-'+name,192,144,c=>{
    const data=c.createImageData(192,144),b=data.data;
    const salt=Object.keys(P).indexOf(name)*41;
    for(let y=0;y<144;y++)for(let x=0;x<192;x++){
      const nn=lattice(x+salt,(y+salt)*3);
      const grain=smooth(x*.23+salt,y*.26)*5.5+smooth(x*.039,y*.041+salt)*7+smooth(x*.63,y*.46)*3;
      const band=smooth(x*.024+salt,y*.72)*3,patina=smooth(x*.075+salt,y*.071);
      const freckles=nn>.995?15:nn<.007?-16:0;
      const light=grain+band-8.3+(nn-.5)*7+freckles;
      const i=(y*192+x)*4;
      b[i]=mat.base[0]+light+(patina-.5)*2;b[i+1]=mat.base[1]+light*.88+(patina-.5)*5;
      b[i+2]=mat.base[2]+light*.75-(patina-.5)*2;b[i+3]=255;
    }
    c.putImageData(data,0,0);
    const r=rng(1823+salt);
    for(let i=0;i<45;i++){const x=r()*192,y=r()*144,l=r()**3*11+1;c.fillStyle='rgba(199,194,146,'+(.025+r()*.085)+')';c.fillRect(x|0,y|0,l,.7);}
  });
}
function drawMetal(c,x,y,w,h,cut,name,seed=1){
  const mat=P[name]||P.steel;
  c.save();const pts=bounds(x,y,w,h,cut);path(c,pts);c.clip();
  c.fillStyle=c.createPattern(texture(name),'repeat');c.fillRect(x,y,w,h);
  c.fillStyle=grad(c,x+2,y,x+w*.52,y+h,[0,'rgba(218,196,151,.095)',.27,'rgba(169,157,114,.018)',.66,'rgba(2,17,13,.044)',1,'rgba(4,17,14,.24)']);
  c.fillRect(x,y,w,h);
  const r=rng(seed|0),count=Math.min(320,Math.round((w+h)*.3));
  for(let i=0;i<count;i++){
    const side=(r()*4)|0,t=r(),dist=r()**2*3.8;
    const xx=side===0||side===2?x+w*t:side===1?x+w-1-dist:x+dist;
    const yy=side===1||side===3?y+h*t:side===0?y+dist:y+h-1-dist;
    const glint=r();
    c.fillStyle='rgba('+mat.exposed.join(',')+','+(.18+glint*.48)+')';
    if((side&1)===0)c.fillRect(xx|0,yy|0,glint>.79?2+r()*3:1,1);
    else c.fillRect(xx|0,yy|0,1,glint>.83?2+r()*1.7:1);
  }
  c.restore();
}
function plate(c,x,y,w,h,cut,name,bevel=3,seed=1) {
  if(w<3||h<3)return;
  const mat=P[name],o=mat.rim;
  poly(c,bounds(x,y,w,h,cut),'#0b1210');
  frame(c,x+.5,y+.5,w-1,h-1,cut,Math.min(bevel,Math.min(w,h)/5),
     [o[2],o[3],o[4],o[6],o[6],o[5],o[7],o[2]]);
  drawMetal(c,x+bevel,y+bevel,w-2*bevel,h-2*bevel,Math.max(1,cut-bevel*.5),name,seed);
  frame(c,x+bevel-1,y+bevel-1,w-2*bevel+2,h-2*bevel+2,Math.max(1,cut-bevel*.5),.7,
    [o[3],o[3],o[5],o[0],o[0],o[4],o[7],o[3]]);
}
function well(c,x,y,w,h,cut=5,depth=4,name='steel') {
  if(w<3||h<3)return;
  const rim=P[name].rim;
  poly(c,bounds(x,y,w,h,cut),'#080e0d');
  frame(c,x,y,w,h,cut,1.4,[rim[7],rim[5],rim[4],rim[2],rim[3],rim[7],rim[5],rim[7]]);
  frame(c,x+1.4,y+1.4,w-2.8,h-2.8,Math.max(1,cut-1),Math.min(depth,h*.17,w*.16),
   ['#080e0c','#080f0d','#1a241d','#6c7057','#6c7057','#414b3c','#1a221a','#101611']);
  const d=1.4+Math.min(depth,h*.17,w*.16);
  poly(c,bounds(x+d,y+d,w-d*2,h-d*2,Math.max(1,cut-d*.6)),grad(c,x,y,x+w*.29,y+h,
   [0,'#131c18',.19,'#273027',.6,'#252e26',1,'#101a16']));
}
function bolt(c,x,y,r=3) {
  if(r<=0)return;
  const sides=9,phase=.12;
  const contour=(dx,dy,rad)=>Array.from({length:sides},(_,i)=>[x+dx+rad*Math.cos(phase+i*TAU/sides),y+dy+rad*Math.sin(phase+i*TAU/sides)]);
  poly(c,contour(1,1.2,r+1.2),'#0d1512');
  poly(c,contour(0,.25,r+1),grad(c,x-r,y-r,x+r,y+r,[0,'#262d24',.47,'#343a2c',1,'#a09a73']));
  poly(c,contour(0,0,r-.1),grad(c,x-r*.5,y-r,x+r,y+r*.85,[0,'#c0ac7e',.33,'#999276',.57,'#75745c',1,'#3d4638']));
  const angle=((Math.round(x)*3+Math.round(y)*17)%31)*.089+.16,dx=Math.cos(angle)*r*.70,dy=Math.sin(angle)*r*.70;
  line(c,[[x-dx,y-dy+.76],[x+dx,y+dy+.76]],'#ac9d78',Math.max(.7,r*.29));
  line(c,[[x-dx,y-dy],[x+dx,y+dy]],'#273126',Math.max(1,r*.36));
}
function pins(c,x,y,w,h,r=2.8,inset=7){
  bolt(c,x+inset,y+inset,r);bolt(c,x+w-inset,y+inset,r);bolt(c,x+inset,y+h-inset,r);bolt(c,x+w-inset,y+h-inset,r);
}
function stripe(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(x|0,y|0,w,h)}
function grid(c,x,y,w,h,space=16,alpha=.06){
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  for(let i=-h;i<w+h;i+=space){
    line(c,[[x+i,y],[x+i+h,y+h]],'rgba(203,178,124,'+alpha+')',.9);
    line(c,[[x+i,y+h],[x+i+h,y]],'rgba(8,20,16,'+(alpha*1.55)+')',1);
  }c.restore();
}
function groove(c,x,y,w,h) {
  poly(c,bounds(x,y,w,h,Math.min(2,h*.4)),'#131c18');
  line(c,[[x+1,y+h-.4],[x+w-2,y+h-.4]],'#65705a',.7);
  line(c,[[x+1,y+.65],[x+w-2,y+.65]],'#0c1211',1);
}
function wood(c,w,h) {
  const px=c.createImageData(w,h),data=px.data;
  const seed=w===480?29:4;
  const seams=w===480?[.074,.228,.397,.552,.682,.847,.976]:[.033,.202,.376,.561,.743,.891];
  const rows=seams.map(a=>Math.round(a*h));
  const knotPoints=w===480?[[.25,.079,.055],[.79,.81,.072],[.14,.936,.050],[.44,.58,.079]]:
   [[.172,.090,.037],[.93,.852,.031],[.263,.895,.045],[.64,.943,.048],[.014,.643,.035]];
  const knots=knotPoints.map(([fx,fy,sz])=>[fx*w,fy*h,sz*w]);
  for(let y=0;y<h;y++){
    const board=rows.filter(yy=>yy<y).length;
    const row=(lattice(board,seed)*2-1)*3,dir=(board%2?1:-1);
    for(let x=0;x<w;x++){
      const pxid=(y*w+x)*4;
      const field=smooth((x+seed)*.008,y*.036+board*3);
      let warp=field*7+smooth(x*.021,y*.018)*2.2;
      let knotDepth=0;
      for(const [kx,ky,ks] of knots){
        const dx=(x-kx)/ks,dy=(y-ky)/(ks*.28);
        if(Math.abs(dx)>2.4||Math.abs(dy)>4)continue;
        const d2=dx*dx+dy*dy;
        const bend=Math.exp(-d2*.48);warp+=Math.sign(y-ky)*bend*8;
        knotDepth+=-13*Math.exp(-d2*10)-3.4*Math.exp(-d2*.67)*Math.cos(Math.sqrt(d2)*16);
      }
      const grain=smooth(x*.031+board*3.4,(y+warp)*.64);
      let run=smooth(x*.015+board*4,(y+warp*1.3)*.18);
      const narrow=Math.max(0,1-Math.abs(fract((y+warp*1.08)*.188+x*.0008*dir)-.5)*11);
      const spot=(lattice(x+19,y*5+board)-.5);
      const light=7.4*field+8.8*grain+6.2*run-11.5-4.8*narrow+spot*4+row+knotDepth;
      const lamp=9.5*(1-Math.min(1,Math.hypot((x-w*.475)/(w*.83),(y-h*.41)/(h*.94))));
      const base=[48,43,32],shift=[1,.83,.60];for(let k=0;k<3;k++)data[pxid+k]=base[k]+(light+lamp)*shift[k];data[pxid+3]=255;
    }
  }
  c.putImageData(px,0,0);
  const r=rng(seed+212);
  for(const row of rows){const pts=[];
    for(let x=-12;x<=w+15;x+=7)pts.push([x,row+Math.floor(1.4*Math.sin(x*.008+row)+smooth(x*.026,row)*2)]);
    line(c,pts.map(([x,y])=>[x,y+2]),'#645a40',1.2);line(c,pts,'#24271e',3.2);line(c,pts,'#161e19',1.0);
  }
  for(let i=0;i<Math.min(1250,h);i++){
    const x=r()*w,y=r()*h,len=2+(r()**3)*66;const off=r()*2.3-1.1;
    line(c,[[x|0,y|0],[x+len*.45,y+off],[x+len,y+off+(r()-.5)*1.7]],
      r()>.39?'rgba(165,141,95,'+(.025+r()*.10)+')':'rgba(13,23,18,'+(.04+r()*.11)+')',r()*.86+.45);
  }
}
function card(c,x,y,w,h,ang,emblem){
  c.save();c.translate(x,y);c.rotate(ang);const outline=bounds(0,0,w,h,3);
  shadow(c,outline,4,7,7,.105);poly(c,bounds(.6,1.5,w,h,3),'#37352a');
  const stock=grad(c,-5,0,w*.86,h,[0,'#aca18a',.38,'#938977',.82,'#827b68',1,'#696957']);
  poly(c,outline,stock);frame(c,1,1,w-2,h-2,2.5,.9,uniform('#b5aa8c'));
  frame(c,3.8,4.1,w-7.6,h-8.4,1.8,1.25,uniform('#555646'));
  frame(c,6,6.4,w-12,h-12.8,1,.65,uniform('#656652'));
  c.save();path(c,outline);c.clip();const r=rng(emblem*1897+w+41);
  for(let i=0;i<w*h*.027;i++){const u=r()*w,v=r()*h;c.fillStyle=r()>.2?'rgba(47,47,36,.12)':'rgba(204,190,151,.24)';c.fillRect(u|0,v|0,1+r()*1.5,.9);}
  c.restore();
  const ink=emblem%2?'#5c4d3d':'#4c5548';
  function rose(cx,cy,rad){const p=[];
    for(let i=0;i<16;i++){const a=i*Math.PI/8,r=i%2?rad*.23:i%4?rad*.6:rad;p.push([cx+r*Math.sin(a),cy-r*Math.cos(a)]);}
    poly(c,p,ink);ell(c,cx,cy,rad*.17,rad*.17,'#a69779');
  }
  const cx=w*.5,cy=h*.51;
  if(emblem%3===1){
    c.beginPath();c.ellipse(cx,cy,w*.21,w*.30,0,0,TAU);c.strokeStyle=ink;c.lineWidth=1.2;c.stroke();
    for(let j=0;j<16;j++){const a=TAU*j/16;line(c,[[cx+w*.205*Math.cos(a),cy+w*.29*Math.sin(a)],[cx+w*.25*Math.cos(a),cy+w*.34*Math.sin(a)]],ink,.85);}
    rose(cx,cy,w*.17);
  }else{
    poly(c,[[cx,cy-w*.27],[cx+w*.19,cy],[cx,cy+w*.27],[cx-w*.19,cy]],ink);
    poly(c,[[cx,cy-w*.19],[cx+w*.11,cy],[cx,cy+w*.19],[cx-w*.11,cy]],'#a2977b');
    rose(cx,cy,w*.13);line(c,[[cx,cy-w*.31],[cx,cy-w*.4]],ink,1);line(c,[[cx,cy+w*.31],[cx,cy+w*.4]],ink,1);
  }
  rose(12,14,3.4);rose(w-12,h-14,3.4);c.restore();
}
function dice(c,x,y,size,spin,ivory){
  c.save();c.translate(x,y);c.rotate(spin);c.scale(size/26,size/26);
  const upper=[[-14,-7],[-2,-16],[13,-9],[2,1]],left=[[-14,-7],[2,1],[2,16],[-13,8]],right=[[2,1],[13,-9],[13,6],[2,16]];
  const sides=ivory?['#a89d7d','#807b64','#5b604d']:['#737867','#555d4b','#394c41'];
  shadow(c,[...upper.slice(0,3),right[2],right[3],left[3]],6,6,7,.12);
  [upper,left,right].forEach((face,i)=>{poly(c,face,sides[i]);line(c,[...face,face[0]],i===0?'#b0a98a':'#465044',.8);});
  const pip=ivory?'#363b2f':'#202e27';
  const dot=(face,u,v)=>{const a=face[0],b=face[1],d=face[3];const px=a[0]+(b[0]-a[0])*u+(d[0]-a[0])*v,py=a[1]+(b[1]-a[1])*u+(d[1]-a[1])*v;ell(c,px,py+.6,1.7,1.35,ivory?'#baae90':'#89937b');ell(c,px,py,1.65,1.2,pip);};
  [[.24,.28],[.74,.28],[.50,.52],[.24,.76],[.74,.76]].forEach(p=>dot(upper,...p));
  [[.3,.27],[.64,.66]].forEach(p=>dot(left,...p));[[.5,.28],[.5,.68]].forEach(p=>dot(right,...p));c.restore();
}
/* A tapered sixteen-sided drinking glass, hollow base, amber liquid and two
   irregular pieces of ice. Rays refract at the four dielectric interfaces;
   optical path length controls attenuation through the coloured liquid. */
function glassSprite(){
  return cached('cast-glass-object',126,118,c=>{
    const W=126,H=118,raw=c.createImageData(W,H),out=raw.data;
    const rings=16,apothem=Math.cos(Math.PI/rings),halfSide=Math.sin(Math.PI/rings),advance=.0016;
    const normals=Array.from({length:rings},(_,i)=>[Math.cos((i+.5)*TAU/rings),Math.sin((i+.5)*TAU/rings)]);
    const ior=[1,1.5,1.355,1.311],sky=[[0,0,0],[90,97,70],[201,94,16],[204,165,104]];
    const outer=z=>.79+.21*z,inner=z=>.66+.249*z;
    const cubes=[
      {cx:-.25,cy:-.13,cz:.746,dx:.30,dy:.255,dz:.16,a:.40,tilt:.18,bevel:.105},
      {cx:.28,cy:.15,cz:.723,dx:.25,dy:.29,dz:.15,a:-.36,tilt:-.15,bevel:.075}
    ];
    const shapes=cubes.map(q=>{
      const ca=Math.cos(q.a),sa=Math.sin(q.a),p=[];
      const add=(u,v,w,d)=>{
        /* Turn the upper ice faces away from parallel, preserving flat chipped edges. */
        const n=[u*ca-v*sa-w*q.tilt,u*sa+v*ca+w*q.tilt*.52,w],len=Math.hypot(...n);
        p.push([n[0]/len,n[1]/len,n[2]/len,(d+n[0]*q.cx+n[1]*q.cy+n[2]*q.cz)/len]);
      };
      add(1,0,0,q.dx);add(-1,0,0,q.dx);add(0,1,0,q.dy);add(0,-1,0,q.dy);add(0,0,1,q.dz);add(0,0,-1,q.dz);
      for(const sx of [-1,1])for(const sy of [-1,1]){
        add(sx,sy,0,q.dx+q.dy-q.bevel);
        add(sx,sy,1,q.dx+q.dy+q.dz-q.bevel*1.75);
      }
      return p;
    });
    function inDisk(x,y,r){
      if(x*x+y*y>r*r+.0001)return false;
      for(const n of normals)if(x*n[0]+y*n[1]>r*apothem)return false;
      return true;
    }
    function medium(x,y,z){
      if(z<0||z>1.015||!inDisk(x,y,outer(z)))return 0;
      if(z<.135||!inDisk(x,y,inner(z)))return 1;
      for(const shape of shapes){
        let inside=true;for(const p of shape)if(x*p[0]+y*p[1]+z*p[2]>p[3]){inside=false;break}
        if(inside)return 3;
      }
      return z<.762?2:0;
    }
    function env(x,y,z,dx,dy,dz){
      if(dz<-.025){
        const t=Math.max(0,-z/dz),u=x+t*dx,v=y+t*dy;
        const q=.32+.43*smooth(u*.29+2,v*28+39)+.23*smooth(u*2.3+2,v*8+19);
        const illum=Math.max(0,1-Math.hypot(u*.20+.15,v*.27));
        return [54+q*56+illum*46,43+q*41+illum*27,29+q*28+illum*13];
      }
      const strip=(cx,cy,cz,wx,wy,power)=>{
        const nx=(dx-cx)/wx,ny=(dy-cy)/wy;
        return power*Math.exp(-.5*(nx*nx+ny*ny))*Math.max(0,1-Math.abs(dz-cz)*1.7);
      };
      const lamp=strip(-.54,-.14,.80,.23,.36,1)+strip(.66,.3,.66,.13,.45,.54);
      const glassGlow=strip(-.62,.69,.12,.24,.15,.40);
      const glint=strip(-.90,-.20,.31,.095,.26,1)+strip(.91,.20,.27,.075,.3,.64);
      return [40+426*lamp+125*glassGlow+561*glint,47+378*lamp+109*glassGlow+504*glint,39+277*lamp+65*glassGlow+365*glint];
    }
    function intersection(x,y,z,dx,dy,dz,current){
      const hits=[];
      const add=(t,nx,ny,nz)=>{if(t>advance*.62&&t<20)hits.push([t,nx,ny,nz]);};
      if(Math.abs(dz)>.00001){
        for(const zz of [0,.135,.762,1.015]){
          const t=(zz-z)/dz;
          if(t>0&&inDisk(x+t*dx,y+t*dy,outer(zz)+.0003))add(t,0,0,1);
        }
      }
      for(const [r0,k,low] of [[.79,.21,0],[.66,.249,.135]]){
        const rr=r0*apothem,sk=k*apothem;
        for(const n of normals){
          const den=n[0]*dx+n[1]*dy-sk*dz;if(Math.abs(den)<.00001)continue;
          const t=(rr+sk*z-x*n[0]-y*n[1])/den;if(t<=0||t>16)continue;
          const zz=z+t*dz;if(zz<low||zz>1.015)continue;
          const xx=x+dx*t,yy=y+dy*t;
          if(Math.abs(-xx*n[1]+yy*n[0])>(r0+k*zz)*halfSide+.00001)continue;
          const len=Math.hypot(1,sk);add(t,n[0]/len,n[1]/len,-sk/len);
        }
      }
      for(const shape of shapes){
        let first=-Infinity,last=Infinity,enter=null,leave=null;
        for(const p of shape){
          const den=p[0]*dx+p[1]*dy+p[2]*dz,dist=p[3]-p[0]*x-p[1]*y-p[2]*z;
          if(Math.abs(den)<.000001){if(dist<0){last=-Infinity;break}continue}
          const t=dist/den;
          if(den<0&&t>first){first=t;enter=p}
          if(den>0&&t<last){last=t;leave=p}
          if(first>last)break;
        }
        if(first<=last){if(enter)add(first,...enter.slice(0,3));if(leave)add(last,...leave.slice(0,3));}
      }
      hits.sort((a,b)=>a[0]-b[0]);
      for(const h of hits){const t=h[0]+advance;
        const after=medium(x+dx*t,y+dy*t,z+dz*t);if(after!==current)return [h,after];
      }
      return null;
    }
    function trace(ux,vy){
      const projectionV=(vy-78)/54;
      let dx=0,dy=-.625,dz=-.780625;
      let x=(ux-63)/54, y=.780625*projectionV-dy*4,z=-.625*projectionV-dz*4;
      let mat=0,any=false;const result=[0,0,0],through=[1,1,1];
      for(let step=0;step<9;step++){
        const found=intersection(x,y,z,dx,dy,dz,mat);
        if(!found){
          if(!any)return null;
          const bg=env(x,y,z,dx,dy,dz);for(let k=0;k<3;k++)result[k]+=through[k]*bg[k];break;
        }
        const [[t,sx,sy,sz],next]=found;any=true;
        if(mat!==0){
          const mu=mat===2?[.41,1.13,2.41]:mat===3?[.47,.56,.65]:[.12,.065,.13];
          const haze=mat===2?.65+.14*smooth((x+3)*13,(y+4)*14):mat===3?.72+.24*smooth(x*14+8,y*14+z*16):.32;
          for(let k=0;k<3;k++){
            const absorb=Math.exp(-mu[k]*t);result[k]+=through[k]*(1-absorb)*sky[mat][k]*haze;through[k]*=absorb;
          }
        }
        x+=t*dx;y+=t*dy;z+=t*dz;
        const dot=dx*sx+dy*sy+dz*sz,sign=dot>0?-1:1;
        const nx=sx*sign,ny=sy*sign,nz=sz*sign,ci=Math.abs(dot),ratio=ior[mat]/ior[next];
        const disc=1-ratio*ratio*(1-ci*ci),rx=dx+2*ci*nx,ry=dy+2*ci*ny,rz=dz+2*ci*nz;
        const rawFr=((ior[mat]-ior[next])/(ior[mat]+ior[next]))**2;
        const fres=rawFr+(1-rawFr)*(1-ci)**5;
        const reflector=env(x,y,z,rx,ry,rz);
        if(disc<=0){dx=rx;dy=ry;dz=rz;
          for(let k=0;k<3;k++){result[k]+=through[k]*reflector[k]*.10;through[k]*=.90;}
        }else{
          for(let k=0;k<3;k++){result[k]+=through[k]*reflector[k]*fres;through[k]*=1-fres;}
          const wave=ratio*ci-Math.sqrt(disc);dx=ratio*dx+wave*nx;dy=ratio*dy+wave*ny;dz=ratio*dz+wave*nz;mat=next;
        }
        x+=advance*dx;y+=advance*dy;z+=advance*dz;
        if(step===8)for(let k=0;k<3;k++)result[k]+=through[k]*[76,62,38][k];
      }
      return result;
    }
    for(let y=0;y<H;y++)for(let x=7;x<W-7;x++){
      const color=trace(x+.5,y+.5);if(!color)continue;
      const i=(y*W+x)*4;const grain=(lattice(x+47,y)-.5)*3.1;
      for(let k=0;k<3;k++)out[i+k]=color[k]+grain;
      out[i+3]=255;
    }
    c.putImageData(raw,0,0);
  });
}
function glass(c,x,y,s){
  c.save();c.translate(x,y);c.scale(s,s);
  halo(c,15,22,74,'#060d0b',.82,1,.68);halo(c,7,18,53,'#070b0a',.76,1,.6);
  c.save();c.globalCompositeOperation='screen';
  halo(c,18,32,31,'#a87535',.15,1,.55);c.restore();
  c.drawImage(glassSprite(),-63,-50);
  const edge=(cycle,r,cy)=>Array.from({length:cycle[1]-cycle[0]+1},(_,i)=>{
    const a=(i+cycle[0])*TAU/16;return [Math.cos(a)*r,cy+Math.sin(a)*r*.780625];
  });
  line(c,edge([8,11],54,-6),'rgba(215,198,154,.68)',1.45);
  line(c,edge([12,14],53.9,-6),'rgba(205,185,138,.52)',1);
  line(c,edge([1,4],53.9,-6),'rgba(235,190,122,.57)',1.35);
  line(c,edge([2,5],49.5,-5.8),'rgba(170,158,115,.4)',.8);
  c.restore();
}
function knife(c,x,y,s,angle) {
  c.save();c.translate(x,y);c.rotate(angle);c.scale(s,s);
  const blade=[[-8,-2],[10,-1],[10,59],[5,104],[-2,135],[-8,82]];
  const grip=[[-9,-9],[-10,-58],[-7,-73],[5,-74],[11,-58],[8,-8]];
  shadow(c,[...grip.slice(0,5),[13,7],[11,55],[-1,136],[-11,70],[-13,8]],8,10,9,.10);
  poly(c,blade,grad(c,-12,0,13,0,[0,'#5a6255',.28,'#939788',.46,'#b5b4a1',.54,'#68766b',.81,'#758178',1,'#b9b7a1']));
  poly(c,[[-6,9],[-1,4],[-3,96],[-2,133],[-7,79]],'#8b9384');
  line(c,[[9,7],[9,57],[5,101],[-2,134]],'#c5c3aa',1.3);
  line(c,[[-5,14],[-5,62],[-3,92]],'#5a675b',1.1);
  poly(c,grip,grad(c,-9,0,10,0,[0,'#171f1a',.28,'#574f38',.5,'#65583e',1,'#29342a']));
  for(let j=0;j<9;j++){const yy=-66+j*6.3;line(c,[[-8,yy-1],[7,yy+3]],'#292e22',2.7);line(c,[[-7,yy-2.1],[6,yy+1.6]],'#806c48',.95);}
  poly(c,[[-16,-8],[-12,-11],[11,-11],[17,-8],[18,-4],[12,-1],[-12,-2],[-16,-4]],'#a08a59');
  line(c,[[-14,-8],[-10,-10],[10,-10],[14,-8]],'#c7ae75',1.4);
  poly(c,[[-9,-73],[-7,-78],[4,-79],[10,-73],[8,-69],[-7,-69]],'#958257');
  c.restore();
}
function ashDish(c,x,y,s) {
  c.save();c.translate(x,y);c.scale(s,s);
  halo(c,8,8,61,'#090c0a',.75,1,.63);
  ell(c,0,5,49,30,'#34392b',-.1);ell(c,0,0,48,30,'#928468',-.1);
  ell(c,0,-1,43,26,'#555642',-.1);ell(c,-.5,-.4,38,22,'#444d3d',-.1);
  c.beginPath();c.ellipse(0,0,47,30,-.1,Math.PI*1.08,Math.PI*1.68);c.strokeStyle='#bfab7e';c.lineWidth=2.2;c.stroke();
  const rand=rng(6553);
  for(let i=0;i<72;i++){const a=rand()*TAU,r=Math.sqrt(rand());ell(c,Math.cos(a)*r*33,Math.sin(a)*r*18,rand()*1.4+.5,rand()*.7+.45,rand()>.53?'#676955':'#343f31');}
  c.rotate(-.33);c.fillStyle='#3f4030';c.fillRect(-24,0,51,4);c.fillStyle='#a49776';c.fillRect(-25,-2,50,4);c.fillStyle='#754f31';c.fillRect(15,-2,13,4);
  stripe(c,-25,-2,3,4,'#534940');stripe(c,-26,-1,2,2,'#a06940');c.restore();
}
function cable(c,start,cp1,cp2,end,width){
  for(const [dx,dy,color,w] of [[2,3,'rgba(7,13,10,.67)',width+1],[0,0,'#171d17',width],[0,-.65,'#424338',width*.55],[-.4,-1.3,'#605a43',width*.15]]){
    c.beginPath();c.moveTo(start[0]+dx,start[1]+dy);c.bezierCurveTo(cp1[0]+dx,cp1[1]+dy,cp2[0]+dx,cp2[1]+dy,end[0]+dx,end[1]+dy);
    c.strokeStyle=color;c.lineWidth=w;c.stroke();
  }
}
function felt(c,x,y,w,h) {
  const bits=cached('wool',112,80,ctx=>{
    const d=ctx.createImageData(112,80);
    for(let yy=0;yy<80;yy++)for(let xx=0;xx<112;xx++){
      const t=(lattice(xx*3,yy)-.5)*7+(smooth(xx*.25,yy*.17)-.5)*7;
      const nap=((xx+yy)&3)===1?2.7:0;const p=(yy*112+xx)*4;
      d.data[p]=52+t+nap;d.data[p+1]=54+t*.86+nap;d.data[p+2]=41+t*.7+nap*.72;d.data[p+3]=255;
    }
    ctx.putImageData(d,0,0);
  });
  const cut=Math.min(8,h*.1);c.save();path(c,bounds(x,y,w,h,cut));c.clip();
  c.fillStyle=c.createPattern(bits,'repeat');c.fillRect(x,y,w,h);
  const wash=grad(c,x,y,x+w,y+h,[0,'rgba(201,174,111,.13)',.35,'rgba(133,114,65,.04)',.76,'rgba(16,32,24,.05)',1,'rgba(8,18,13,.25)']);
  c.fillStyle=wash;c.fillRect(x,y,w,h);
  const pool=c.createRadialGradient(x+w*.74,y+h*.39,2,x+w*.59,y+h*.46,w*.82);
  pool.addColorStop(0,'rgba(230,188,104,.20)');pool.addColorStop(.36,'rgba(176,135,78,.08)');
  pool.addColorStop(.63,'rgba(24,26,18,.13)');pool.addColorStop(1,'rgba(10,18,16,.65)');
  c.fillStyle=pool;c.fillRect(x,y,w,h);grid(c,x,y,w,h,21,.064);
  c.setLineDash([3,3]);line(c,[...bounds(x+5,y+5,w-10,h-10,cut),[x+5+cut,y+5]],'#79755a',.8);c.setLineDash([]);
  for(const [cx,cy,flipX,flipY] of [[x+10,y+10,1,1],[x+w-10,y+10,-1,1],[x+10,y+h-10,1,-1],[x+w-10,y+h-10,-1,-1]]){
    line(c,[[cx,cy+9*flipY],[cx,cy],[cx+11*flipX,cy]],'#929072',1.3);
    line(c,[[cx+3*flipX,cy+9*flipY],[cx+3*flipX,cy+3*flipY],[cx+10*flipX,cy+3*flipY]],'#77775a',.8);
  }
  c.restore();
}
function tray(c){
  const upper=[[100,51],[275,51],[282,58],[286,311],[276,326],[49,326],[41,317],[88,67]];
  const inner=[[101,58],[273,58],[277,64],[280,308],[272,319],[52,319],[48,313],[95,68]];
  shadow(c,upper,6,9,7,.13);poly(c,upper,'#283227');
  const colors=['#8c8569','#7c7c60','#48543e','#4a523d','#6c7356','#9b9474','#7b7e61','#a29b76'];
  for(let i=0;i<upper.length;i++){const j=(i+1)%upper.length;poly(c,[upper[i],upper[j],inner[j],inner[i]],colors[i]);}
  c.save();path(c,inner);c.clip();felt(c,44,55,240,269);c.restore();
  line(c,[...inner,inner[0]],'#222d22',2.2);
  line(c,[[101,63],[272,63],[275,66]],'#50533b',1.1);
  line(c,[[96,68],[49,311],[53,316],[271,316]],'#808365',1.2);
  c.save();c.setLineDash([3,3]);line(c,[[99,69],[55,310],[58,313],[271,313]],'#76765b',.8);c.restore();
  for(const [x,y] of [[97,61],[46,316],[275,56],[276,319]])bolt(c,x,y,1.4);
}
function edges(c,w,h,portrait){
  const e=c.createRadialGradient(w*.51,h*.43,w*.13,w*.48,h*.45,portrait?Math.max(h*.68,w*.8):w*.68);
  e.addColorStop(0,'rgba(8,17,15,0)');e.addColorStop(.55,'rgba(5,15,13,.025)');e.addColorStop(1,'rgba(3,15,14,.43)');
  c.fillStyle=e;c.fillRect(0,0,w,h);
  for(const [x1,y1,x2,y2,stops] of [[0,0,0,h*.12,[0,'rgba(5,15,12,.19)',1,'rgba(6,16,13,0)']],[0,h,0,h*.76,[0,'rgba(3,19,16,.31)',1,'rgba(3,19,16,0)']]]){
    c.fillStyle=grad(c,x1,y1,x2,y2,stops);c.fillRect(0,0,w,h);
  }
}
function makeDesk(c,portrait,h) {
  const w=portrait?480:960;
  wood(c,w,h);
  if(portrait){
    const head=clamp(117+(h-685)*.35,117,274),s=clamp((head-21)/302,.32,.73);
    card(c,409,-6,72,119,-.26,7);card(c,449,-2,72,114,-.13,5);

    c.save();c.translate(-7,-4);c.scale(s,s);tray(c);ashDish(c,49,15,.93);knife(c,23,80,.72,.25);c.restore();
    cable(c,[334,-8],[251,66],[382,86],[365,head+23],3);
    card(c,-39,h-130,87,143,-.18,4);card(c,-15,h-94,78,121,.22,3);

    halo(c,25,h-10,120,'#0c1d17',.38,1,.80);
  }else{
    cable(c,[256,-9],[206,38],[264,55],[286,62],7);
    cable(c,[719,45],[710,2],[788,80],[787,-10],5);
    cable(c,[299,420],[215,494],[137,415],[-12,527],4);
    card(c,828,-22,89,153,-.37,7);card(c,876,-8,91,157,-.22,5);
    tray(c);
    card(c,-39,322,88,151,-.17,4);card(c,-12,367,81,127,.27,3);
    ashDish(c,117,-2,.91);knife(c,49,100,1,.20);


    card(c,750,503,62,102,-.79,1);
    /* A socket cable crosses behind the tray; it does not move with the machine. */
    cable(c,[773,4],[778,28],[768,34],[778,65],3);
  }
  edges(c,w,h,portrait);
}
function restingProps(c,portrait,h,motion){
  const head=clamp(117+(h-685)*.35,117,274),m=motion||{cup:0,die:0};
  function place(x,y,s,phi,piece){
    c.save();c.translate(x,y);c.rotate(phi);c.scale(s,s);c.drawImage(piece,-90,-74);c.restore();
  }
  const cup=cached('free-drinking-glass',183,155,g=>glass(g,90,74,1));
  const die=(ivory)=>cached('free-die-'+ivory,183,155,g=>dice(g,90,74,26,0,ivory));
  if(portrait){
    place(471+m.cup,Math.min(head*.82,122)-Math.abs(m.cup)*.25,.57,m.cup*.012,cup);
    place(414+m.die,h-53-Math.abs(m.die)*.74,1,-.14+m.die*.045,die(true));
    place(446-m.die*.5,h-86-Math.abs(m.die)*.44,20/26,.28-m.die*.026,die(false));
  }else{
    place(952+m.cup*.58,126-Math.abs(m.cup)*.13,.46,m.cup*.009,cup);
    place(930+m.cup,283-Math.abs(m.cup)*.27,1.11,m.cup*.013,cup);
    place(901+m.die,437-Math.abs(m.die)*.76,25/26,-.22+m.die*.049,die(true));
    place(958-m.die*.66,401-Math.abs(m.die)*.48,20/26,.12-m.die*.031,die(true));
  }
}
function desk(c,portrait=false,h=540,motion){
  const height=portrait?Math.max(1,Math.round(h)):540,w=portrait?480:960;
  const k='desk-'+(portrait?'p'+height:'d');
  /* Keep portrait rotation/resizing from retaining full camera-sized buffers. */
  if(portrait&&!cache.has(k)){
    for(const id of cache.keys())if(id.startsWith('desk-p'))cache.delete(id);
  }
  const im=cached(k,w,height,ctx=>makeDesk(ctx,portrait,height));
  c.drawImage(im,0,0,w,portrait?h:540);restingProps(c,portrait,h,motion);
}
function deckMask(c,x,y,w,h,d){
  const f=bounds(x,y,w,h,10);
  shadow(c,f,6,12,9,.11);
  poly(c,f.map(([px,py])=>[px+1.7,py+d]),'#17201c');
  for(let i=1;i<7;i++){
    const j=(i+1)%8;
    poly(c,[f[i],f[j],[f[j][0]+1.7,f[j][1]+d],[f[i][0]+1.7,f[i][1]+d]],
     i===2?'#28352b':i===5?'#263329':i===4?'#1c2822':'#212d26');
  }
  line(c,[[x+9,y+h+d],[x+w-8,y+h+d],[x+w+1,y+h+d-7]],'#0a1411',2);
  plate(c,x,y,w,h,10,'steel',3,431);
}
function vent(c,x,y,count,stride=7,reverse=false){
  for(let i=0;i<count;i++){
    const dx=reverse?0:i*stride,dy=reverse?i*stride:0;
    if(reverse)groove(c,x+dx,y+dy,9,2.5);else groove(c,x+dx,y+dy,3,8);
  }
}
function castTab(c,x,y,w,h,flip=false){
  const dir=flip?-1:1;c.save();c.translate(x,y);c.scale(dir,1);
  const shape=[[0,0],[w-3,0],[w,3],[w,h-2],[w-2,h],[0,h]];
  poly(c,shape,grad(c,0,0,0,h,[0,'#918a6c',.08,'#6e7058',.17,'#4e5847',.66,'#353f33',.91,'#303b30',1,'#77765a']));
  line(c,[[2,1],[w-4,1],[w-2,3]],'#a29b74',.8);
  line(c,[[1,h-1],[w-3,h-1]],'#19251d',1.4);
  bolt(c,w*.57,h*.49,1.75);c.restore();
}
function makeChassis(c) {
  /* Backplane and the deep central cast hood. Each vertical side is its own
     shaded face; the monitor, log, drawer and reel carrier are separate parts. */
  deckMask(c,278,13,421,259,10);
  deckMask(c,672,53,181,353,12);
  deckMask(c,190,269,599,147,12);
  for(let i=0;i<2;i++){groove(c,214+i*457,418,81,2.5);groove(c,245+i*414,424,41,2);}
  plate(c,283,18,409,248,8,'steel',3.4,1921);
  /* Side gussets of the hood catch the screen's warm grazing illumination. */
  poly(c,[[285,25],[299,18],[311,22],[310,246],[293,255],[284,248]],grad(c,284,0,314,0,[0,'#303a2f',.33,'#58604e',.6,'#444e40',1,'#26342c']));
  line(c,[[291,29],[296,24],[301,24]],'#a19a77',1.1);
  line(c,[[291,34],[291,229]],'#354438',1.7);line(c,[[299,30],[299,225]],'#68705a',.7);
  /* The hopper exits sideways under a stamped lip. Coins originate behind this flange. */
  poly(c,[[280,148],[287,146],[293,148],[293,166],[279,168]],'#786e4c');
  poly(c,[[279,151],[289,149],[289,164],[278,166]],'#0b1613');
  poly(c,[[277,152],[282,151],[282,163],[277,164]],'#111c17');
  line(c,[[278,150],[290,147],[293,149]],'#a4976b',1.35);
  line(c,[[278,166],[290,164]],'#5c644d',1.3);
  bolt(c,294.4,150,1.3);bolt(c,294.4,165,1.3);
  poly(c,[[662,25],[680,21],[686,28],[685,245],[666,251]],grad(c,662,0,688,0,[0,'#5c6250',.22,'#424b3d',.79,'#374337',1,'#1e2c24']));
  plate(c,304,29,369,223,8,'steel',4,7333);
  frame(c,313,44,352,195,7,2.4,['#74745d','#5d6552','#344234','#181e19','#17211b','#384739','#68705a','#88836b']);
  well(c,318,48,342,190,6,4,'brass');
  frame(c,324,53,332,182,3.8,1.7,['#151c15','#2c3021','#494b30','#8c7848','#8d784a','#5e593b','#363b29','#1a2319']);
  poly(c,bounds(326,54,328,179,2),'#302d20');
  for(let i=0;i<13;i++){
    const x=329+i*25.7;ell(c,x,39.5,2.6,2.55,'#262e22');ell(c,x,40,1.8,1.75,i%3===0?'#77765a':'#5b604b');
    stripe(c,x-.9,38.3,1.45,.75,'#98906b');
  }
  for(let row=0;row<6;row++){
    const y=65+row*29.7;bolt(c,311,y,2.15);bolt(c,666,y,2.05);
  }
  bolt(c,288,24,3.55);bolt(c,687,23,3.25);
  /* Cartridge drawer under the CRT, with its own lip and black gauge channel. */
  plate(c,311,232,359,39,6,'steel',2.6,751);
  well(c,319.5,246.3,333,21.1,3.1,1.7);
  poly(c,bounds(323,249,44.5,17.5,2),'#3c4030');
  groove(c,370,252,273,12);
  line(c,[[368.5,250],[368.5,265]],'#747356',1);
  plate(c,248,233,70,38,6,'steel',2.5,9021);
  well(c,253,238,58,27,3,1.5);
  /* Status lamps and readout share a machined side-channel, below the top label. */
  plate(c,671,56,180,49,6,'dark',2.9,243);
  plate(c,678,62,166,36,4.2,'green',2.1,6191);
  frame(c,682,66,157,27,2.2,.7,uniform('rgba(142,141,99,.33)'));
  plate(c,683,107,106,154,6.8,'steel',2.4,8851);
  well(c,688,112,95,141,4.8,2.9);
  frame(c,691,115,89,134,3,1.0,['#1a211a','#182019','#222d22','#525940','#525940','#3a4633','#202a20','#192218']);
  vent(c,698,256,8,8);
  plate(c,791,106,64,302,7.3,'steel',3,12848);
  well(c,798,114,50,230,4,2.7);
  groove(c,802,126,16,202);groove(c,821,126,16,202);
  stripe(c,819,124,1,207,'#4c5440');
  for(let i=0;i<34;i++){
    const yy=130+i*5.8;stripe(c,801,yy,i%5?1.5:3,.8,'#77775a');stripe(c,835,yy,i%5?1:2,.8,'#606a50');
  }
  plate(c,796,348,53,53,3.4,'dark',1.8,4435);
  stripe(c,804,372,36,1,'#3d4938');
  /* Cast wallet extension attaches with a plate behind the rail. */
  plate(c,119,278,64,39,5.5,'green',2.5,6351);
  well(c,125,283,51,12,2.8,1.8);
  deckMask(c,106,292,103,114,8);
  plate(c,111,297,92,105,4.4,'green',2.3,1972);grid(c,116,302,78,94,14,.028);
  groove(c,124,396,50,2);bolt(c,115,303,1.6);bolt(c,115,395,1.6);
  /* Lower rack. A separate dark strip under the front edge gives the carrier mass. */
  plate(c,193,271,593,143,8,'steel',3,7717);
  drawMetal(c,202,278,574,128,5,'dark',81881);
  frame(c,201,278,574,129,4,1.1,['#656c54','#4c5744','#29382b','#3e4c39','#3e4c39','#485640','#687058','#686c52']);
  stripe(c,208,278,554,1,'#282e25');stripe(c,211,279.5,553,.7,'#747458');
  const sockets=[272,379,487,598,708];
  for(const [idx,mid] of sockets.entries()){
    plate(c,mid-51.4,284.2,103,118,8,'steel',2.3,420+idx*141);
    well(c,mid-47.6,288.3,95.3,108.9,7.7,3.8,'brass');
    const wellX=mid-42.7;
    poly(c,bounds(wellX,295.0,85.4,98.8,4.7),grad(c,mid,295,mid,395,[0,'#101512',.12,'#22281f',.48,'#31352a',.9,'#1b231b',1,'#0c120f']));
    line(c,[[mid-41,297],[mid-39,294],[mid+36,294]],'#736d51',1.1);
    groove(c,mid-9,398,18,1.9);
  }
  for(const x of [202,777])for(const y of [279.5,405.6])bolt(c,x,y,3);
  castTab(c,195,325,11,27);castTab(c,783,325,10,27,true);
  /* Diffuse phosphor spill on the upper casting. The glass and live sections
     stay open so the renderer can supply independent light each frame. */
  c.save();c.beginPath();c.rect(284,20,398,249);c.rect(326,54,328,179);c.clip('evenodd');
  c.globalCompositeOperation='screen';halo(c,453,145,229,'#9e713f',.22,1,.73);
  c.restore();
  c.save();path(c,bounds(194,272,590,141,8));c.clip();
  c.fillStyle=grad(c,0,273,0,414,[0,'rgba(167,137,83,.045)',.33,'rgba(9,14,11,0)',1,'rgba(3,14,11,.075)']);
  c.fillRect(191,272,597,144);c.restore();
}
function chassis(c){c.drawImage(cached('case',960,540,makeChassis),0,0);}
function portraitChassis(c,head,railTop,footTop,h){
  const height=Math.max(1,Math.ceil(h));
  const key='pcase-'+[head,railTop,footTop,height].map(Math.round).join('-');
  if(!cache.has(key))for(const name of cache.keys())if(name.startsWith('pcase-'))cache.delete(name);
  const im=cached(key,480,height,ctx=>{
    const x=6,y=head-12,b=Math.min(height-1,footTop+94),w=468,hh=b-y;
    if(hh<=15)return;
    deckMask(ctx,x,y,w,hh,7);
    plate(ctx,x+4,y+5,w-8,hh-10,6,'green',3,5340);
    /* The vertical rail columns carry the two horizontal sections of the narrower casting. */
    for(const sx of [13,461]){
      const ey=Math.min(b-12,footTop+71);
      groove(ctx,sx,y+27,4,ey-y-26);
      for(let v=y+31;v<ey;v+=82)bolt(ctx,sx+2,v,2.1);
    }
    for(const yy of [railTop-6,footTop-5]){
      groove(ctx,x+16,yy,w-32,4.6);
      stripe(ctx,x+25,yy+4,w-50,1,'#65705a');
    }
    grid(ctx,28,footTop+2,424,Math.max(1,b-footTop-11),21,.027);
    pins(ctx,x+2,y+2,w-4,hh-7,2.7,6);
    vent(ctx,20,b-15,7,6.2);vent(ctx,418,b-15,7,6.2);
  });
  c.drawImage(im,0,0);
}
function cap(c,x,y,w,h){
  const sw=Math.max(8,Math.ceil(w)),sh=Math.max(8,Math.ceil(h));
  const k='cap-'+sw+'x'+sh;
  const im=cached(k,sw,sh,g=>{
    plate(g,.5,.5,sw-1,sh-1,Math.min(8,sw*.11),'green',3.0,1793);
    frame(g,4,4,sw-8,sh-8,4.8,1.0,['#303d30','#2e3a2e','#3b4838','#757a5e','#6f765b','#424d3e','#344337','#2e3b2f']);
    grid(g,6,6,sw-12,sh-12,14,.025);
    for(const [xx,yy] of [[sw*.14,sh*.14],[sw*.86,sh*.14],[sw*.14,sh*.86],[sw*.86,sh*.86]])bolt(g,xx,yy,1.3);
    /* Folded hold-down clips and the blank maker's cartouche. */
    for(const dx of [sw*.18,sw*.69]){
      stripe(g,dx,1,sw*.14,2,'#4b5343');stripe(g,dx,3,sw*.14,1,'#83846a');
      stripe(g,dx,sh-3,sw*.14,1.5,'#444f3f');
    }
    const cx=sw*.5,cy=sh*.49,col='rgba(110,120,91,.36)';
    line(g,[[cx-7,cy-3],[cx-2,cy-3],[cx,cy-6],[cx+2,cy-3],[cx+7,cy-3]],col,.8);
    line(g,[[cx-4,cy],[cx,cy+4],[cx+4,cy]],col,.9);
  });
  c.drawImage(im,x,y,w,h);
}
const glyphs={
  A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[15,16,16,16,16,16,15],
  D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],
  G:[15,16,16,19,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],
  J:[7,2,2,2,18,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],
  M:[17,27,21,21,17,17,17],N:[17,25,21,21,19,17,17],O:[14,17,17,17,17,17,14],
  P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],
  S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],
  V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,27,17],X:[17,17,10,4,10,17,17],
  Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],' ':[0,0,0,0,0,0,0]
};
function legend(c,text,x,y,pixel,color){
  const chars=[...String(text).toUpperCase()],w=chars.length*6-1;
  c.fillStyle=color;
  for(const [i,k] of chars.entries()){
    const f=glyphs[k]||glyphs[' '];
    for(let j=0;j<7;j++)for(let l=0;l<5;l++)if(f[j]&(16>>l))
      c.fillRect(Math.round(x+(i*6+l-w/2)*pixel),Math.round(y+(j-3.5)*pixel),Math.ceil(pixel),Math.ceil(pixel));
  }
}
function makeDrawer(g,w,h,press,word){
  const pr=clamp(press,0,1);
  const x=1,y=1;
  plate(g,x,y,w-2,h+4,8,'green',3.1,19353);
  grid(g,8,8,w-16,h-12,16,.045);
  line(g,[[8,17],[8,10],[15,4],[w-15,4]],'#73775a',1.1);
  for(const xx of [x+12,w-13])bolt(g,xx,9.6,3.4);
  const bx=w*.143,by=h*.26,bw=w*.714,bh=h*.59;
  well(g,bx-3,by+1,bw+6,bh+5,7,3,'brass');
  plate(g,bx,by+pr*3,bw,bh-pr*3,6.6,'brass',2.4,47262);
  plate(g,bx+3.5,by+3.2+pr*3,bw-7,bh-6.8-pr*3,4.8,'brown',3.1,540);
  g.save();path(g,bounds(bx+8,by+7+pr*3,bw-16,bh-15-pr*3,3));g.clip();
  g.fillStyle=grad(g,bx,by+5,bx,by+bh,[0,'rgba(200,141,80,.105)',.41,'rgba(94,60,37,.045)',1,'rgba(31,28,20,.38)']);g.fillRect(bx,by,bw,bh);
  const edge='#a48357',perim=9;
  g.globalAlpha=.54;
  for(let xx=bx+13;xx<bx+bw-11;xx+=6.6){stripe(g,xx,by+perim+pr*3,2.3,1.15,edge);stripe(g,xx,by+bh-perim,2.3,1.05,'#97764e');}
  for(let yy=by+13+pr*3;yy<by+bh-9;yy+=6.4){stripe(g,bx+perim,yy,1.1,2,edge);stripe(g,bx+bw-perim,yy,1,2,edge);}
  g.restore();
  if(word){const px=Math.min(Math.max(1.3,h*.0265),bw*.79/(String(word).length*6));const cy=by+bh*.55+pr*2;
    legend(g,word,bx+bw*.5+1,cy+1.6,px,'#68472e');legend(g,word,bx+bw*.5,cy,px,pr>.65?'#bda37a':'#e2c598');}
}
function drawer(c,x,y,w,h,press=0,word='STOP'){
  if(w<15||h<12)return;
  const amount=Math.round(clamp(Number(press)||0,0,1)*3)/3,sw=Math.ceil(w),sh=Math.ceil(h);
  const im=cached('drawer'+[sw,sh,amount,word].join(','),sw,sh,g=>makeDrawer(g,sw,sh,amount,word));
  c.drawImage(im,x,y,w,h);
}
function rectAsset(c,key,x,y,w,h,draw){
  if(w<2||h<2)return;const sw=Math.ceil(w),sh=Math.ceil(h);
  const im=cached(key+sw+'x'+sh,sw,sh,g=>draw(g,sw,sh));c.drawImage(im,x,y,w,h);
}
function panel(c,x,y,w,h){
  rectAsset(c,'panel',x,y,w,h,(g,a,b)=>plate(g,0,0,a,b,Math.min(6,a*.085,b*.16),'steel',Math.max(1.2,Math.min(3.2,b*.10)),74987));
}
function recess(c,x,y,w,h){rectAsset(c,'recess',x,y,w,h,(g,a,b)=>well(g,0,0,a,b,Math.min(6,a*.065,b*.125),Math.max(1.3,Math.min(3.1,b*.10))));}
function plaque(c,x,y,w,h){rectAsset(c,'plaque',x,y,w,h,(g,a,b)=>{
  plate(g,0,0,a,b,Math.min(5,a*.07,b*.13),'green',Math.max(1.3,Math.min(2.5,b*.07)),22366);
  if(a>43&&b>23)frame(g,4,4,a-8,b-8,2,1,uniform('rgba(144,143,102,.26)'));
});}
function canopyStamp(id){
  return cached('leaf-shadow-'+id,260,198,c=>{
    const temp=canvas(130,99),s=temp.getContext('2d'),rr=rng(id*99271+2991);
    s.scale(.5,.5);
    const tone='#051611';
    const leaf=(x,y,a,len,w)=>{
      const dx=Math.cos(a),dy=Math.sin(a),l=len;
      const q=[[x,y],[x+dx*l*.32-dy*w*.47,y+dy*l*.32+dx*w*.47],
        [x+dx*l*.71-dy*w*.38,y+dy*l*.71+dx*w*.38],[x+dx*l,y+dy*l],
        [x+dx*l*.66+dy*w*.39,y+dy*l*.66-dx*w*.39],[x+dx*l*.24+dy*w*.36,y+dy*l*.24-dx*w*.36]];
      poly(s,q,tone);
    };
    function limb(x,y,a,len,r,depth) {
      const bend=(rr()-.5)*.27,dx=Math.cos(a),dy=Math.sin(a),ex=x+len*dx,ey=y+len*dy;
      poly(s,[[x-dy*r,y+dx*r],[ex-dy*r*.27,ey+dx*r*.27],[ex+dy*r*.27,ey-dx*r*.27],[x+dy*r,y-dx*r]],tone);
      if(depth<=0){
        for(let i=0;i<6;i++){
          const k=.10+i*.13,side=i%2?1:-1;
          leaf(x+dx*len*k,y+dy*len*k,a+side*(.52+rr()*.65),9+rr()*13,5+rr()*8);
        }leaf(ex-2*dx,ey-2*dy,a,13+rr()*9,7+rr()*5);
        return;
      }
      limb(x+dx*len*.45,y+dy*len*.45,a-(.45+rr()*.47),len*(.40+rr()*.14),r*.51,depth-1);
      limb(x+dx*len*.67,y+dy*len*.67,a+.54+rr()*.39,len*(.36+rr()*.25),r*.47,depth-1);
      limb(ex,ey,a+bend,len*(.57+rr()*.10),r*.59,depth-1);
    }
    for(let i=0;i<4;i++)limb(-25+i*14,-17+i*2,-.02+(.29+i*.17),75+rr()*26,2+rr()*2.3,2);
    c.save();c.imageSmoothingEnabled=true;
    for(const [dx,dy,a] of [[-2,-1,.14],[2,3,.14],[-.5,1,.19],[1,-.5,.16],[0,1,.39]]){
      c.globalAlpha=a;c.drawImage(temp,dx,dy,260,198);
    }c.restore();
  });
}
/* Close ivy casts a cool shadow across the edge of the wider, warm desk.
   Each leaf is folded about a central vein. The nearest leaves hide the tray. */
function nearIvy(id) {
  return cached('near-ivy-'+id,186,207,c=>{
    const random=rng(9103+id*119);
    function leaf(x,y,a,length,width){
      const u=Math.cos(a)*length,v=Math.sin(a)*length;
      const wx=-Math.sin(a)*width,wy=Math.cos(a)*width;
      const tip=[x+u,y+v],root=[x,y],m=[x+.56*u,y+.56*v];
      const shine=random(),shade=shine>.77?'#27382b':shine>.31?'#172b23':'#10221c';
      poly(c,[root,[x+u*.12+wx*.69,y+v*.12+wy*.69],[x+u*.43+wx,y+v*.43+wy],tip,m],shade);
      poly(c,[root,m,tip,[x+u*.38-wx*.89,y+v*.38-wy*.89],[x+u*.12-wx*.55,y+v*.12-wy*.55]],'#081914');
      if(shine>.67)line(c,[[x+u*.13,y+v*.13],[x+u*.62,y+v*.62]],'#324237',.65);
    }
    function vine(x,y,a,len,depth){
      const dx=Math.cos(a),dy=Math.sin(a),bend=(random()-.48)*.3;
      const endX=x+dx*len,endY=y+dy*len;
      line(c,[[x,y],[x+dx*len*.48-dy*2,y+dy*len*.48+dx*2],[endX,endY]],depth>1?'#0c1b17':'#1a2a20',depth*1.4+.65);
      for(let k=1;k<=5;k++){
        const f=k/6,side=k%2?1:-1;
        leaf(x+dx*len*f,y+dy*len*f,a+side*(.51+random()*.69),11+random()*14,3.1+random()*5.8);
      }
      if(depth>0){
        vine(x+dx*len*.67,y+dy*len*.67,a+.51+random()*.34,len*(.46+random()*.19),depth-1);
        vine(endX,endY,a+bend-.1,len*(.54+random()*.15),depth-1);
      }
    }
    vine(4,-21,1.05,60,3);vine(-18,1,.47,73,3);vine(57,-19,.39,48,2);
    vine(-12,77,.73,36,2);vine(108,-17,.30,26,1);
  });
}
function cornerFalloff(c,w,h,portable){
  const v=cached('darkroom-'+(portable?'tall':'wide'),240,135,b=>{
    const pixels=b.createImageData(240,135),d=pixels.data;
    for(let y=0;y<135;y++)for(let x=0;x<240;x++){
      const xx=(x-119.5)/120,yy=(y-65)/69;
      const edge=xx*xx*(.42+.66*yy*yy)+yy*yy*(portable?.12:.24);
      const a=Math.max(0,Math.min(.81,(edge-.25)*.83));
      const i=(y*240+x)*4;d[i]=1;d[i+1]=17;d[i+2]=17;d[i+3]=Math.round(a*255);
    }
    b.putImageData(pixels,0,0);
  });
  c.save();c.imageSmoothingEnabled=true;c.drawImage(v,0,0,w,h);c.restore();
}
function leafShade(c,t=0,portrait=false,h=540) {
  const r=portrait?.68:1,w=portrait?480:960;
  const swing=Math.sin(t*.61)*.7+Math.sin(t*.19)*1.45;
  const one=(x,y,sx,sy,a,id,op)=>{
    c.save();c.translate(x+swing*sx,y+Math.sin(t*.53+id)*1.3*sy);c.scale(sx,sy);
    c.rotate(a+Math.sin(t*.33+id)*.012);c.globalAlpha*=op;c.drawImage(canopyStamp(id),0,0);c.restore();
  };
  one(-24,-21,.83*r,1.02*r,.05,2,.77);
  one(w+25,-19,-.72*r,.73*r,-.15,7,.75);
  one(w+12,h+26,-.88*r,-.71*r,.01,11,.65);
  cornerFalloff(c,w,h,portrait);
  function foreground(x,y,sx,sy,id,alpha){
    c.save();c.translate(x+swing*.6,y);c.scale(sx*r,sy*r);
    c.rotate(Math.sin(t*.43+id)*.009);c.globalAlpha=alpha;c.drawImage(nearIvy(id),0,0);c.restore();
  }
  foreground(-18,-11,1.13,1.09,3,.95);
  foreground(w+8,-22,-.92,.90,8,.83);
  foreground(w+15,h+22,-.81,-.65,12,.88);
}
const surfaces=[];
function materialEdges(x,y,w,h,cut,metal){
  const points=bounds(x,y,w,h,cut);
  for(let i=0;i<8;i++){
    const a=points[i],b=points[(i+1)&7],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);
    const n=Math.max(1,Math.ceil(d/14)),nx=dy/d*.79,ny=-dx/d*.79;
    for(let k=0;k<n;k++){
      const f=(k+.5)/n;surfaces.push([a[0]+dx*f,a[1]+dy*f,dx/n,dy/n,nx,ny,.61,metal]);
    }
  }
}
materialEdges(283,18,409,248,8,.58);materialEdges(304,29,369,223,8,.62);
materialEdges(319,49,340,188,5,1);materialEdges(312,233,357,37,6,.66);
materialEdges(671,56,180,49,6,.72);materialEdges(683,107,106,154,6,.54);
materialEdges(791,106,64,302,7,.63);materialEdges(193,271,593,143,8,.76);
materialEdges(107,293,102,113,5,.54);
for(const x of [272,379,487,598,708])materialEdges(x-47,289,94,108,7,.94);
function rgb(color){
  if(Array.isArray(color))return color.join(',');
  const value=String(color||'#ffcb76').replace('#','');
  if(/^[a-f0-9]{6}$/i.test(value))return [0,2,4].map(i=>parseInt(value.slice(i,i+2),16)).join(',');
  if(/^[a-f0-9]{3}$/i.test(value))return [...value].map(v=>parseInt(v+v,16)).join(',');
  return '255,201,125';
}
/* Metallic surfaces have stored bevel normals. Diffuse attenuation and a
   Blinn-Phong specular lobe are evaluated against the actual event light. */
function light(c,l,portrait=false,h=540){
  if(!l||!Number.isFinite(l.x)||!Number.isFinite(l.y))return;
  const p=clamp(l.strength??l.power??1,0,2),rad=l.radius||l.range||151,z=l.height||48;
  if(p<.01)return;
  const color=rgb(l.color),limit=rad*rad*2.4;
  c.save();c.globalCompositeOperation='screen';
  if(!portrait){
    for(const a of surfaces){
      const dx=l.x-a[0],dy=l.y-a[1],d2=dx*dx+dy*dy;
      if(d2>limit)continue;
      const inv=1/Math.sqrt(d2+z*z),lx=dx*inv,ly=dy*inv,lz=z*inv;
      const diffuse=Math.max(0,a[4]*lx+a[5]*ly+a[6]*lz);
      const hlen=Math.hypot(lx,ly-.12,lz+1);
      const spec=Math.pow(Math.max(0,(a[4]*lx+a[5]*(ly-.12)+a[6]*(lz+1))/hlen),18);
      const atten=Math.max(0,1-d2/limit)**2;
      const opacity=Math.min(1,(.12*diffuse+spec*.95)*p*atten*a[7]);
      if(opacity<.007)continue;
      line(c,[[a[0]-a[2]*.5,a[1]-a[3]*.5],[a[0]+a[2]*.5,a[1]+a[3]*.5]],'rgba('+color+','+opacity+')',spec>.4?2:1.25);
    }
    /* Indirect room bounce falls on the tabletop, never across the displayed pixels. */
    c.save();c.beginPath();c.rect(0,0,960,540);c.rect(280,18,406,251);c.rect(689,55,164,353);c.rect(192,271,595,147);c.rect(108,295,85,113);
    c.clip('evenodd');
    const g=c.createRadialGradient(l.x,l.y,0,l.x,l.y,rad*1.26);
    g.addColorStop(0,'rgba('+color+','+Math.min(.19,p*.12)+')');g.addColorStop(1,'rgba('+color+',0)');
    c.fillStyle=g;c.fillRect(l.x-rad*1.3,l.y-rad*1.3,rad*2.6,rad*2.6);c.restore();
    if(l.x>714){const d=Math.hypot(l.x-930,l.y-283),k=Math.max(0,1-d/(rad*1.2));
      if(k>0){const ang=Math.atan2(l.y-277,l.x-930);
        c.beginPath();c.ellipse(930,277,57.5,47.3,0,ang-.59,ang+.59);c.strokeStyle='rgba('+color+','+Math.min(1,k*k*p*.83)+')';c.lineWidth=1.8;c.stroke();}
    }
  }else{
    const g=c.createRadialGradient(l.x,l.y,0,l.x,l.y,rad);
    g.addColorStop(0,'rgba('+color+','+Math.min(.12,p*.09)+')');g.addColorStop(1,'rgba('+color+',0)');
    c.fillStyle=g;c.fillRect(0,0,480,h);
  }
  c.restore();
}
window.CabinetArt={desk,chassis,portraitChassis,drawer,cap,recess,bolt,panel,plaque,light,leafShade,wood,glass,nearIvy,texture};
})();
