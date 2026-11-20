/* Independently modelled metal reels. Every texel, embossing and gilded edge originates below. */
(() => {
  'use strict';

  const TILE = 72;
  const WIDTH = 82;
  const HEIGHT = 92;
  const CENTERS = [272, 379, 487, 598, 708];
  const TAU = 2 * Math.PI;
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const wrap = (n, size) => (n % size + size) % size;
  const smooth = n => (n = clamp(n, 0, 1), n * n * (3 - 2 * n));

  function surface(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // Material values independently define smoked nickel, scraped silver, brass and oiled woods.
  const material = [
    [77, 68, 52, .16],    // Tarnished reel band
    [47, 47, 37, .24],    // Oxidised iron
    [111, 109, 88, .50],  // Dark nickel
    [142, 139, 111, .56], // Brushed silver
    [174, 166, 132, .59], // Polished cutting edge
    [111, 83, 45, .41],   // Patinated bronze
    [160, 127, 76, .53],  // Brushed brass
    [194, 158, 95, .62],  // Gold leaf
    [60, 45, 31, .10],    // Leather
    [94, 66, 38, .17],    // Bow wood
    [63, 61, 45, .15],    // Smoked shield wood
    [109, 54, 40, .57],   // Garnet
    [75, 103, 83, .45],   // Verdigris enamel
    [44, 54, 52, .38]     // Bluish gunmetal
  ];
  const I = {iron:1, nickel:2, silver:3, edge:4, bronze:5, brass:6, gold:7,
             leather:8, wood:9, oak:10, red:11, green:12, gun:13};

  function grain(x,y,seed) {
    let a = Math.imul(x+19,0x1b873593) ^ Math.imul(y+47,0x7feb352d) ^ seed;
    a = Math.imul(a^(a>>>16),0x85ebca6b);
    a = Math.imul(a^(a>>>13),0xc2b2ae35);
    return ((a^(a>>>16))>>>0)/4294967296;
  }
  function polygonDistance(x,y,pts) {
    let inside = false, distance = Infinity;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++) {
      const a=pts[j], b=pts[i], dx=b[0]-a[0], dy=b[1]-a[1];
      if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
      const along=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);
      distance=Math.min(distance,(x-a[0]-along*dx)**2+(y-a[1]-along*dy)**2);
    }
    return inside?Math.sqrt(distance):-Math.sqrt(distance);
  }

  // A small height-field modeller. Faces stand proud of the plate, with their own bevel and material.
  class Die {
    constructor(angle=0) {
      this.height=new Float32Array(TILE*TILE);
      this.mat=new Uint8Array(TILE*TILE);
      this.cs=Math.cos(angle);this.sn=Math.sin(angle);
    }
    point([x,y]) {
      return [36+(x-36)*this.cs-(y-36)*this.sn,36+(x-36)*this.sn+(y-36)*this.cs];
    }
    plate(points, top, ink, bevel=1.05, tilt=0) {
      const pts=points.map(p=>this.point(p));
      const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
      const left=Math.max(0,Math.floor(Math.min(...xs))),right=Math.min(TILE-1,Math.ceil(Math.max(...xs)));
      const upper=Math.max(0,Math.floor(Math.min(...ys))),lower=Math.min(TILE-1,Math.ceil(Math.max(...ys)));
      const mid=(left+right)*.5;
      for(let y=upper;y<=lower;y++)for(let x=left;x<=right;x++){
        const d=polygonDistance(x+.5,y+.5,pts);
        if(d<0)continue;
        const z=top-Math.min(2.25,bevel*1.25)*(1-smooth(d/Math.max(.1,bevel)))+(x-mid)*tilt;
        const index=y*TILE+x;
        if(z>=this.height[index]){this.height[index]=z;this.mat[index]=ink;}
      }
    }
    bar(x1,y1,x2,y2,width,z,ink,bevel=.55) {
      const mag=Math.hypot(x2-x1,y2-y1)||1,nx=-(y2-y1)*width/(2*mag),ny=(x2-x1)*width/(2*mag);
      this.plate([[x1+nx,y1+ny],[x2+nx,y2+ny],[x2-nx,y2-ny],[x1-nx,y1-ny]],z,ink,bevel);
    }
    disc(cx,cy,rx,ry,z,ink,count=10,angle=-Math.PI/2,bevel=.85) {
      this.plate(Array.from({length:count},(_,i)=>[cx+Math.cos(angle+i*TAU/count)*rx,cy+Math.sin(angle+i*TAU/count)*ry]),z,ink,bevel);
    }
    trail(points,width,z,ink,bevel=.6) {
      for(let i=1;i<points.length;i++)this.bar(...points[i-1],...points[i],width,z,ink,bevel);
    }
  }

  function sword() {
    const d=new Die(.668);
    d.plate([[36,2],[42,17],[41,36],[40,43],[42,45],[39,48],[33,48],[30,44],[32,41],[31,18]],3.1,I.iron,1.2);
    d.plate([[36,4],[37,19],[36,41],[32,44],[33,19]],5.5,I.edge,.95,.024);
    d.plate([[36,4],[41,18],[39,42],[36,44],[37,19]],5.0,I.nickel,.7,-.06);
    d.bar(36.4,18,35.1,39,1.35,5.85,I.nickel,.15);
    d.plate([[22,40],[28,42],[33,44],[39,44],[46,40],[50,38],[50,43],[43,48],[39,49],[38,62],[34,64],[32,61],[32,49],[27,48],[22,45]],4.2,I.iron);
    d.plate([[22,40],[28,43],[35,45],[40,44],[49,39],[48,43],[40,48],[33,48],[25,45]],5.9,I.brass,.95);
    d.plate([[33,49],[39,48],[37.5,62],[33,63],[31.8,59]],4.9,I.leather,.8);
    for(let j=0;j<3;j++)d.bar(33.2,51.5+j*3.2,38.4,50+j*3.2,1.6,6,I.bronze,.4);
    d.plate([[32,61],[37,60],[40,63],[36,68],[30,65]],5.8,I.silver,1.2);
    return d;
  }
  function dagger() {
    const d=new Die(.44);
    d.plate([[43,4],[45,16],[42,27],[38,37],[40,40],[38,45],[31,47],[28,40],[30,32],[35,23],[41,14]],4,I.iron,1.1);
    d.plate([[42,6],[43,19],[39,29],[34,40],[30,42],[32,32],[36,24]],5.6,I.edge,.8);
    d.plate([[43,9],[44,18],[40,29],[37,38],[37.5,43],[33,45],[35,37],[40,24]],5.7,I.nickel,.7);
    d.plate([[23,37],[27,40],[31,43],[38,43],[43,39],[48,39],[46,44],[40,46],[38,50],[29,51],[25,46],[23,45]],6,I.bronze,1.0);
    d.bar(24,40,30,45,2,6.7,I.brass);
    d.plate([[30,49],[38,47],[36,55],[32,61],[27,62],[27,59]],4.8,I.leather);
    for(let i=0;i<3;i++)d.bar(28.5-i*.5,52+i*2.7,36-i*1.4,52+i*2.5,1.5,5.65,I.nickel,.25);
    d.disc(29.5,63,4.4,3.1,6,I.brass,8);
    d.disc(34,46,2.8,2.35,7.3,I.red,8);
    return d;
  }
  function shield(){
    const d=new Die(-.045);
    d.plate([[15,15],[19,12],[28,14],[36,15],[46,13],[53,12],[56,16],[55,38],[52,46],[45,52],[35,59],[23,51],[18,45],[16,37]],3.5,I.iron,1.3);
    d.plate([[18,15],[27,17],[36,18],[47,15],[53,15],[52,37],[50,44],[44,50],[35,55],[24,48],[20,42]],4.8,I.silver,1.2,-.025);
    d.plate([[21,18],[34,21],[50,18],[49,37],[47,42],[42,47],[35,52],[26,46],[23,41]],5.0,I.oak,1);
    d.plate([[25,20],[33.5,21],[33.3,49],[28,45],[24.5,40]],5.24,I.iron,.45);
    d.plate([[35.5,21],[48,18.8],[47,36],[44.7,42],[36.2,48.9]],5.25,I.gun,.65);
    d.trail([[24,26],[35.1,33.5],[47,24]],2.1,6.2,I.brass,.4);
    d.plate([[32.8,22],[36.2,21],[37.4,49],[34.8,52],[32.7,49]],6.35,I.nickel,.65);
    for(const [x,y] of [[20,17],[51,17],[22.1,40],[49,39]])d.disc(x,y,1.55,1.5,6.1,I.brass,6);
    return d;
  }
  function coin(){
    const d=new Die(.40);
    d.disc(36.5,37.7,16.4,20.0,3.5,I.bronze,10,-1.43,1.45);
    d.disc(34.4,35.4,15.8,19.0,5,I.gold,10,-1.43,1.25);
    d.disc(34.25,35.4,12.6,15.65,5.6,I.brass,10,-1.43,1.05);
    d.plate([[28,39],[32.7,33.8],[34.2,26.1],[39.2,30.6],[36.7,35.1],[35.3,42.8],[32.3,45.0]],6.55,I.bronze,.65);
    d.plate([[31.3,35.2],[34,29],[37.0,27.5],[36.5,32],[34.3,37.6]],8.05,I.gold,.7,.035);
    for(const [x,y] of [[27,30],[40,39],[34,22.7]])d.disc(x,y,1.25,1.2,6.5,I.edge,6);
    d.trail([[46.5,43],[44.3,47.6],[41.6,50.5]],1.35,6.0,I.gold,.3);
    return d;
  }
  function bow(){
    const d=new Die(.03);
    const stave=[[16,57],[15,50],[17,48],[20,48],[25,46],[31,40],[37,33],[40,25],[44,17],[50,15],[56,16],[58,12]];
    d.trail(stave,5.2,3.4,I.iron,1.1);
    d.trail(stave,3.45,4.8,I.wood,.75);
    d.trail([[17,48],[23,47],[27,44],[31,40]],1.4,5.75,I.brass,.3);
    d.trail([[41,25],[45,18],[50,16]],1.4,5.8,I.brass,.3);
    d.trail([[15,57],[30,42],[58,12]],1.45,3.4,I.silver,.2);
    d.bar(29,43,37,33,5.3,5.5,I.leather,.7);
    for(let i=0;i<3;i++)d.bar(30+i*2,40-i*2.4,34+i*1.5,43-i*2.3,1.4,6.05,I.brass,.32);
    d.bar(17,25,50,49,2.35,6,I.nickel,.55);
    d.plate([[47,44],[55,50],[47,50]],6.55,I.edge,.6);
    d.plate([[16,22],[21,23],[23,28],[19,28]],6.5,I.brass,.5);
    return d;
  }
  function bolt(){
    const d=new Die(.54);
    d.plate([[32,25],[39,23],[36.5,59],[33,66],[29.5,62]],4.1,I.wood,1);
    d.bar(31,58.5,35.6,57,3,4.85,I.brass,.5);
    d.bar(31,54.6,36,53.3,1.3,5,I.bronze,.35);
    d.plate([[23,9],[27,10],[30,21],[35,24],[39,20],[43,8],[47,7],[46,19],[42,28],[39,32],[32,33],[27,28],[24,22]],5.0,I.bronze,1.15);
    d.plate([[22.5,10],[26.6,12],[29.4,23],[34,27],[31,28],[26.1,23.3]],6.25,I.edge,.7);
    d.plate([[44,9],[46,8],[45,19],[40,28],[37,29]],6.35,I.brass,.75);
    d.plate([[36.7,5],[39.4,5],[36.1,14],[40.2,13],[32.2,23],[34,16],[30.2,16]],7.45,I.gold,.55);
    d.disc(35.5,30,4.15,3.7,6.5,I.green,8);
    return d;
  }
  function gouge(){
    const d=new Die(.115);
    d.plate([[37,8],[40,19],[47,27],[51,35],[52,43],[49,50],[43,55],[36,57],[27,56],[21,51],[18,44],[19,37],[23,29],[30,21]],4.5,I.bronze,1.8);
    d.plate([[37,11],[39,21],[45,29],[49,37],[49,44],[46,50],[40,54],[32,54],[25,51],[22,46],[22,38],[26,30],[32,22]],6.0,I.red,2.65,.053);
    d.plate([[35.8,22],[32,29],[29,34],[28,42],[25,41],[25.8,35],[30,27]],7.2,I.brass,.8);
    d.plate([[30,46],[32,49],[38,50],[36,52],[30,50]],7.0,I.bronze,.65);
    d.disc(31,32,1.3,2.5,8,I.edge,6);
    return d;
  }
  function charm(){
    const d=new Die(-.16);
    d.trail([[29,19],[31,11],[35,8],[40,11],[42,18]],3.6,3.5,I.bronze,.7);
    d.trail([[31,15],[33.1,11],[36,10]],1.5,4.75,I.brass,.3);
    d.plate([[36,16],[44,23],[53,27],[51,36],[47,46],[36,58],[26,49],[22,41],[18,28],[28,24]],4.5,I.iron,1.4);
    d.plate([[36,18],[43,25],[51,28],[48.5,39],[43,46],[36,54],[28,47],[23.5,38],[21,29],[29,25]],5.4,I.brass,1.3);
    d.plate([[36,22],[43,28],[47,30],[45,39],[41,45],[36,50],[30,45],[26.5,38],[24.6,31],[31,28]],6,I.green,1.25);
    d.plate([[25.6,35.9],[33,30],[39,29],[46,32.9],[40,38.4],[33,40.3]],6.8,I.bronze,.6);
    d.plate([[28,35],[34.6,32],[38.8,31.6],[43.5,33.4],[37.8,36.6],[33,37.8]],7.35,I.edge,.65);
    d.disc(36,34.8,2.35,3.2,8,I.iron,7);
    return d;
  }
  function star(){
    const d=new Die(.08);
    d.disc(36,35.7,13.5,13.5,3,I.bronze,12);
    const pts=[];
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8-Math.PI/2,r=i%2?5.7:i%4?14:24;
      pts.push([36+Math.cos(a)*r,36+Math.sin(a)*r]);
    }
    d.plate(pts,5.5,I.brass,1.1);
    for(let i=0;i<16;i+=2)d.plate([[36,36],pts[i],pts[(i+1)%16]],6.05+(i%4?.0:.4),i%4?I.silver:I.gold,.5);
    d.disc(36,36,4,4,7.8,I.edge,8);
    d.disc(53,19,1.6,1.6,3.7,I.gold,4);
    d.disc(18.5,49,1.4,1.4,4,I.silver,4);
    return d;
  }
  function reel(){
    const d=new Die(-.38);
    d.bar(16,38,56,38,5,3.1,I.iron,.7);
    d.plate([[23,24],[44,24],[49,29],[49,45],[44,49],[24,49],[20,44],[20,29]],4.1,I.nickel,1.25);
    d.disc(23,36.4,5.6,15.5,5,I.brass,12,-1.56,1.15);
    d.disc(48,36.4,5.6,15.5,6,I.bronze,12,-1.56,1.15);
    d.disc(50,36.4,2.45,10.9,7,I.nickel,10,-1.56,1);
    d.plate([[27,25],[43,25],[47,29],[47,42],[43,47],[26,47],[28.8,42],[29.5,30]],5.9,I.silver,1.1);
    d.trail([[30,29],[36,27.7],[43,29]],1.05,6.8,I.edge,.3);
    d.plate([[31,34],[34,32],[38,35],[42,31],[43,35],[38,40],[35,39],[32,41]],7,I.iron,.6);
    return d;
  }

  const models={sword,shield,coin,dagger,bow,bolt,gouge,charm,star,reel};
  const tiles=new Map();
  // A pressed individual band link has a folded hinge seam and a faint machined registration groove.
  function backing(x,y,keySeed) {
    const corner=3.0, nearX=Math.min(x-5.5,TILE-6.5-x), nearY=Math.min(y-4.0,TILE-5-y);
    const contour=Math.min(nearX,nearY,(nearX+nearY-corner)*.7071);
    let gain=1-.065*y/TILE+.055*Math.cos((x+keySeed%23)*.081);
    const flange=Math.min(x,TILE-1-x);
    gain*=.76+.24*smooth(flange/5);
    if(contour<-.4)gain*=.83;
    if(contour>=-.4&&contour<.7)gain*=((x<TILE/2&&nearX<nearY)||nearY<nearX&&y<TILE/2)?.78:1.19;
    if(contour>=1.6&&contour<2.5)gain*=.91;
    if(y===0||y===TILE-1)gain*=.47;
    if(y===1)gain+=.10;
    if(y===TILE-2)gain*=.83;
    const grit=(grain(x,y,keySeed)-.5)*6.5+(grain(x>>1,y>>1,keySeed+553)-.5)*4;
    const brush=(grain(x>>3,y,keySeed+441)-.5)*3;
    const scratch=grain(x>>3,y,keySeed+29)>.972&&grain(x,y,keySeed)>.37?6.5:0;
    const noise=grit+brush+scratch;
    return [77*gain*.92+noise,68*gain*.92+noise,52*gain*.92+noise];
  }

  function buildTile(key) {
    const name=models[key]?key:'reel';
    if(tiles.has(name))return tiles.get(name);
    const die=models[name](),N=TILE;
    const full=surface(N,N),icon=surface(N,N);
    const f=full.getContext('2d'),ic=icon.getContext('2d');
    const plate=f.createImageData(N,N),isolated=ic.createImageData(N,N);
    let seed=1421;for(const letter of name)seed=Math.imul(seed,31)+letter.charCodeAt(0)|0;
    const relief=die.height,mat=die.mat,reflectance=new Uint8Array(N*N);
    const specTint=[1,.92,.73];
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const p=y*N+x,ix=p*4,mid=relief[p],id=mat[p],m=material[id];
      const l=relief[y*N+Math.max(0,x-1)],r=relief[y*N+Math.min(N-1,x+1)];
      const a=relief[Math.max(y-1,0)*N+x],b=relief[Math.min(N-1,y+1)*N+x];
      const nx=(l-r)*.53,ny=(a-b)*.53,inv=1/Math.hypot(nx,ny,1);
      const diffuse=Math.max(0,(-.54*nx-.55*ny+.63)*inv);
      const highlight=Math.pow(Math.max(0,(-.39*nx-.34*ny+.85)*inv),12);
      let occlusion=0;
      for(let step=1;step<=7;step++){
        const tx=Math.max(0,x-Math.round(step*.65)),ty=Math.max(0,y-step);
        occlusion=Math.max(occlusion,relief[ty*N+tx]-mid-step*.61);
      }
      const AO=1-.60*clamp(occlusion/2.6,0,1);
      // A second response term reserves the reflection of a changing source near the CRT.
      const lightDot=Math.max(0,(-.17*nx-.71*ny+.68)*inv);
      const glint=Math.pow(Math.max(0,(-.10*nx-.39*ny+.916)*inv),11);
      reflectance[p]=id?Math.round(255*clamp((lightDot*.36+glint*m[3])*AO,0,1)):34;
      if(id){
        const grit=(grain(x,y,seed)-.5)*9+(grain(x>>1,y>>1,seed+553)-.5)*4;
        const brushed=(grain(x>>3,y,seed+441)-.5)*3.5;
        const diffuseGain=(.48+diffuse*.68)*AO;
        const specular=(highlight*.51+Math.max(0,diffuse-.94)*.86)*m[3]*AO*180;
        for(let k=0;k<3;k++){
          isolated.data[ix+k]=clamp(Math.round(m[k]*diffuseGain+specular*specTint[k]+grit+brushed),0,255);
        }
      }
      plate.data[ix+3]=255;
      isolated.data[ix+3]=id?255:Math.round(112*clamp(occlusion/2.6,0,1));
    }
    // The die used for a curved band is pre-compensated for the shorter vertical drum pitch.
    // The shop keeps the uncompressed square master. Both use the exact same original relief.
    const rolled=new Uint8ClampedArray(plate.data.length);
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const rawX=Math.round(35.5+(x-35.5)/.79),rawY=Math.round(35.5+(y-35.5)/1.23);
      const inRange=rawX>=0&&rawX<N&&rawY>=0&&rawY<N;
      const dest=(y*N+x)*4,src=(rawY*N+rawX)*4;
      const originalAlpha=isolated.data[dest+3]/255;
      const alpha=inRange?isolated.data[src+3]/255:0;
      const under=backing(x,y,seed);
      for(let ch=0;ch<3;ch++){
        plate.data[dest+ch]=under[ch]*(1-originalAlpha)+isolated.data[dest+ch]*originalAlpha;
        const ink=inRange?isolated.data[src+ch]:0;
        rolled[dest+ch]=under[ch]*(1-alpha)+ink*alpha;
      }
      // Strip storage is private. Its spare fourth channel carries the material response.
      rolled[dest+3]=inRange?reflectance[rawY*N+rawX]:34;
    }
    f.putImageData(plate,0,0);ic.putImageData(isolated,0,0);
    const tile={full,icon,pixels:rolled};
    tiles.set(name,tile);return tile;
  }

  function face(c,item,x,y,w,h,opts={}) {
    const tile=buildTile(item);
    c.save();c.imageSmoothingEnabled=false;
    c.drawImage(opts.iconOnly?tile.icon:tile.full,x,y,w,h);
    c.restore();
  }

  // Finite-camera projection of a circular cross section. Its tangent advances about 54 logical pixels per pitch.
  const rows=[];
  const camera=4.7,aperture=1.19;
  const focal=HEIGHT/2*(camera-Math.cos(aperture))/Math.sin(aperture);
  const pitch=54.4*(camera-1)/focal;
  for(let y=0;y<HEIGHT;y++){
    const ratio=(y+.5-HEIGHT/2)/focal;
    const theta=Math.asin(camera*ratio/Math.sqrt(1+ratio*ratio))-Math.atan(ratio);
    const compress=(camera-1)/(camera-Math.cos(theta));
    const xMap=new Uint8Array(WIDTH),shades=new Uint16Array(WIDTH);
    const top=smooth((y+.2)/14),base=smooth((HEIGHT-y-.55)/15);
    const occluded=.17+.83*Math.min(top,base);
    const cylindrical=(.83+.15*Math.cos(theta-.12)+.047*Math.exp(-((theta+.14)**2)/.12));
    for(let x=0;x<WIDTH;x++){
      xMap[x]=clamp(Math.floor((((x+.5)/WIDTH-.5)/compress+.5)*TILE),0,TILE-1);
      const flange=smooth(Math.min(x+.2,WIDTH-x-.2)/5);
      const side=.68+.32*flange;
      shades[x]=Math.round(256*occluded*cylindrical*side);
    }
    const reflectionLobe=(.24+.76*Math.exp(-((theta+.39)**2)/.34))*occluded;
    rows.push({u:theta/pitch,xMap,shades,reflectionLobe});
  }

  const strips=new WeakMap();
  function stripTexture(order) {
    if(strips.has(order))return strips.get(order);
    const len=order.length*TILE,stride=TILE*4;
    const sharp=new Uint8ClampedArray(len*stride);
    order.forEach((key,i)=>sharp.set(buildTile(key).pixels,i*TILE*stride));
    // Finite trailing shutter, including the seam between the last and the first repeat.
    // Three shutter widths keep braking continuous without a costly convolution per animation frame.
    const layers=[sharp];
    for(const width of [3,6,9]){
      const result=new Uint8ClampedArray(sharp.length);
      for(let x=0;x<stride;x++){
        let sum=0;
        for(let k=0;k<width;k++)sum+=sharp[wrap(-k,len)*stride+x];
        for(let y=0;y<len;y++){
          result[y*stride+x]=Math.round(sum/width);
          sum+=sharp[wrap(y+1,len)*stride+x]-sharp[wrap(y-width+1,len)*stride+x];
        }
      }
      layers.push(result);
    }
    const strip={len,layers};strips.set(order,strip);return strip;
  }

  const wheels=new WeakMap();
  function wheelState(w) {
    if(wheels.has(w))return wheels.get(w);
    const panel=surface(WIDTH,HEIGHT),ctx=panel.getContext('2d');
    const result={panel,ctx,tex:ctx.createImageData(WIDTH,HEIGHT),position:null,exposure:null,
                  wasSelected:false,litAt:-1000,dimAt:-1000};
    wheels.set(w,result);return result;
  }
  function projectedDrum(w,state,position,velocity,incidentLight) {
    // A moving strip crosses more texels per exposure than a decelerating one.
    const span=clamp(Math.abs(velocity)*TILE*.0082,0,9);
    const exposure=Math.round(span*4)/4;
    // A locked drum really is at rest. Only its separate rim lights need redrawing.
    const incident=Math.round(clamp(incidentLight,0,1.5)*32);
    if(state.position===position&&state.exposure===exposure&&state.incident===incident)return state.panel;
    state.position=position;state.exposure=exposure;state.incident=incident;
    const {len,layers}=stripTexture(w.strip),band=exposure/3,lo=Math.min(3,Math.floor(band)),hi=Math.min(3,lo+1);
    const t=Math.round(128*(band-lo)),s=128-t,one=layers[lo],two=layers[hi];
    const out=state.tex.data,middle=(position+.5)*TILE;
    for(let y=0;y<HEIGHT;y++){
      const row=rows[y],lightBand=Math.round(incident*row.reflectionLobe*2.55);
      const y0=wrap(Math.floor(middle+row.u*TILE),len)*TILE;
      for(let x=0;x<WIDTH;x++){
        const j=((y0+row.xMap[x])<<2),k=(y*WIDTH+x)<<2,sh=row.shades[x];
        const reflected=((one[j+3]*s+two[j+3]*t)*lightBand)>>15;
        out[k]=(((one[j]*s+two[j]*t)*sh)>>15)+reflected;
        out[k+1]=(((one[j+1]*s+two[j+1]*t)*sh)>>15)+((reflected*3)>>2);
        out[k+2]=(((one[j+2]*s+two[j+2]*t)*sh)>>15)+(reflected>>2);
        out[k+3]=255;
      }
    }
    state.ctx.putImageData(state.tex,0,0);return state.panel;
  }

  function clippedFrame(c,x,y,w,h,cut) {
    c.beginPath();c.moveTo(x+cut,y);c.lineTo(x+w-cut,y);c.lineTo(x+w,y+cut);c.lineTo(x+w,y+h-cut);
    c.lineTo(x+w-cut,y+h);c.lineTo(x+cut,y+h);c.lineTo(x,y+h-cut);c.lineTo(x,y+cut);c.closePath();
  }
  let lampArt;
  function lamp(){
    if(lampArt)return lampArt;
    const w=112,h=122,b=surface(w,h),ctx=b.getContext('2d'),im=ctx.createImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const xx=Math.abs(x+.5-w/2),yy=Math.abs(y+.5-h/2);
      // Inside and outside distances to an aperture with small clipped corners.
      const distance=Math.max(xx-45.4,yy-50.4,(xx+yy-92.6)*.7071);
      const d=Math.abs(distance);
      let alpha=Math.exp(-d*d/33)*.20+Math.exp(-d*d/7.7)*.44;
      let rgb=[239,166,62];
      if(distance<2.0&&distance>-2.25){
        const lit=1-.24*(x/w)-.27*(y/h),n=(grain(x,y,8191)-.5)*11;
        const edge=distance<-.85||distance>1.25;
        rgb=edge?[210*lit+n,127*lit+n,42*lit+n]:[255,177+55*lit+n,70+67*lit+n];
        alpha=.98;
      }
      const k=(y*w+x)*4;
      im.data[k]=rgb[0];im.data[k+1]=rgb[1];im.data[k+2]=rgb[2];im.data[k+3]=255*Math.min(1,alpha);
    }
    ctx.putImageData(im,0,0);lampArt=b;return b;
  }

  function draw(c,game,i,opts={}) {
    const w=game.wheels[i];if(!w||!game.active.includes(i))return;
    const state=wheelState(w),time=game.time,latched=time-w.lastLatch;
    const reduced=Boolean(opts.reduce||opts.reduced);
    let position=w.p,velocity=0;
    if(w.status==='moving'&&game.phase==='spin')velocity=w.speed;
    if(w.status==='braking'&&game.phase==='spin'){
      const travel=Math.max(.001,w.travel||.22),startSpeed=2*(w.end-w.start)/travel;
      velocity=w.coast>1e-8?w.speed:startSpeed*clamp(1-w.brake/travel,0,1);
    }
    if(!reduced&&w.status==='set'&&latched>=0&&latched<.24){
      position+=.014*Math.exp(-latched*18)*Math.sin(latched*67);
    }
    const fromCast=game.hit&&game.hit.damage&&game.feedback?
      Math.exp(-Math.max(0,time-game.feedback.time)*11)*(game.hit.crit?1:.42):0;
    const incident=Number.isFinite(opts.flash)?opts.flash:fromCast;
    const lightFalloff=1-.12*Math.abs(i-2);
    const body=projectedDrum(w,state,position,velocity,incident*lightFalloff*(reduced?.36:1));
    const cx=CENTERS[i],x=cx-WIDTH/2,y=299;
    c.save();c.imageSmoothingEnabled=false;
    clippedFrame(c,x-1,y-1,WIDTH+2,HEIGHT+2,4);
    c.fillStyle='#171a15';c.fill();
    c.save();clippedFrame(c,x,y,WIDTH,HEIGHT,4);c.clip();c.drawImage(body,x,y);
    c.fillStyle='#151811';c.globalAlpha=.73;
    c.fillRect(x+3,y,WIDTH-6,1);c.fillRect(x+3,y+HEIGHT-2,WIDTH-6,2);
    c.restore();

    const selected=game.current===i&&(game.phase==='resolve'||game.phase==='skill');
    if(selected&&!state.wasSelected)state.litAt=time;
    if(!selected&&state.wasSelected)state.dimAt=time;
    state.wasSelected=selected;
    const sinceLight=time-state.litAt,sinceDark=time-state.dimAt;
    const ordinary=selected&&game.phase==='resolve'&&!(game.hit&&game.hit.crit);
    const lit=ordinary?clamp((.405-game.age)/.026,0,1):1;
    if(selected)state.exitStrength=lit;
    const active=selected?(reduced?1:Math.min(1,.55+sinceLight*22))*lit :
                 (!reduced&&sinceDark>=0&&sinceDark<.095?.60*(state.exitStrength||0)*Math.pow(1-sinceDark/.095,2):0);
    const latchGlow=!reduced&&latched>=0&&latched<.15?(1-latched/.15)*.13:0;
    const intensity=Math.max(active,latchGlow);
    if(intensity>.005){
      c.globalAlpha=intensity;
      c.drawImage(lamp(),cx-56,y+HEIGHT/2-61);
      c.globalAlpha=intensity*(game.phase==='skill'?.17:.11);
      clippedFrame(c,x+1,y+1,WIDTH-2,HEIGHT-2,3);c.fillStyle='#f6bc62';c.fill();
      if(selected&&!reduced&&sinceLight<.105){
        c.globalAlpha=(1-sinceLight/.105)*.82;c.fillStyle='#ffebac';
        c.fillRect(x-4,y-5,10,1);c.fillRect(x-6,y-3,1,8);
      }
    }
    c.restore();
  }

  window.ReelArt=Object.freeze({face,draw});
})();
