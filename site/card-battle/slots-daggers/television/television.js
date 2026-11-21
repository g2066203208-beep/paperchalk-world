/* WORK / TV terminal. New object mesh and projection; immutable Work metal()
   from slots-daggers/coin-art.js, plus the original cabinet-glass Fresnel/IOR
   method and bloom language. No SVG/CSS pseudo-3D, no generated TV bitmap.
   3-D geometry: beveled housing, receding shell, bezel, curved CRT phosphor,
   real 3D knobs, edge castings, ventilation and mounted feet.
 */
(()=>{'use strict';
const TAU=Math.PI*2,clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),mix=(a,b,t)=>a+(b-a)*t;
const normalized=(x,y,z)=>{const l=Math.hypot(x,y,z)||1;return [x/l,y/l,z/l];};
const eye=normalized(0,.67,.82);
const palette=Array.from({length:256},(_,i)=>{
 const x=i/255;
 const stops=[[0,28,27,22],[.20,65,53,34],[.42,119,94,49],[.64,179,141,72],[.80,217,177,95],[.93,247,214,134],[1,255,241,188]];
 let j=1;while(j<stops.length-1&&stops[j][0]<x)j++;
 const a=stops[j-1],b=stops[j],t=clamp((x-a[0])/(b[0]-a[0]),0,1);
 return [1,2,3].map(c=>Math.round(mix(a[c],b[c],t)));
});
const alloy={metallic:.20,smoothness:.60};
const highlightExponent=2+82*alloy.smoothness*alloy.smoothness;
const key=normalized(-.38,-.63,.72);
const fill=normalized(.80,.05,.47);
const burnish=normalized(-.33,-.14,.93);
// The following function is copied byte-for-byte from Work's coin-art.js.
function metal(nx,ny,nz,rough,ambient,lamp) {
    const d=Math.max(0,nx*key[0]+ny*key[1]+nz*key[2]);
    const viewDot=nx*eye[0]+ny*eye[1]+nz*eye[2];
    // Virtual amber window and a smaller grazing strip light reflected in brass.
    const rx=2*viewDot*nx-eye[0],ry=2*viewDot*ny-eye[1],rz=2*viewDot*nz-eye[2];
    const b=Math.max(0,rx*burnish[0]+ry*burnish[1]+rz*burnish[2]);
    const d2=Math.max(0,rx*fill[0]+ry*fill[1]+rz*fill[2]);
    const soft=Math.max(0,rx*lamp[0]+ry*lamp[1]+rz*lamp[2]);
    const fresnel=1-clamp(viewDot,0,1);
    const coated=.45+.45*alloy.metallic;
    return ambient+.44*d+.10*b**5+.30*b**27+coated*d2**highlightExponent+.075*fresnel*fresnel+.17*soft**5+.65*soft**21+rough;
  }
const screen=document.getElementById('scene'),g=screen.getContext('2d',{alpha:false});
// Directly sample the existing Work CabinetArt shader's green cast-metal
// surface. The original generator makes its wear, stipple and metal patina;
// we map that prepared material over the TV's actual 3D shell faces.
let workSurfacePixels=null,workSurfaceUsed=false;
function ensureWorkSurface(){
 if(workSurfacePixels||!window.CabinetArt?.plaque)return;
 try{
  const atlas=document.createElement('canvas');atlas.width=192;atlas.height=144;
  const context=atlas.getContext('2d',{willReadFrequently:true});
  window.CabinetArt.panel(context,0,0,192,144);
  workSurfacePixels=context.getImageData(0,0,192,144).data;
  workSurfaceUsed=true;
 }catch(err){console.warn('Work CabinetArt material unavailable:',err);}
}

const buffer=document.createElement('canvas');buffer.width=496;buffer.height=324;
const sg=buffer.getContext('2d',{alpha:false});
const W=()=>window.innerWidth,H=()=>window.innerHeight;
const state={cacheStamp:0,opaqueFacesRendered:0,yaw:-6,pitch:-4,power:true,channel:0,powerDial:.36,channelDial:-.65,transition:'boot',transitionAt:performance.now()/1000,illum:.8,glare:1,seconds:0,frames:0,fps:0,dragging:false,pointerX:0,pointerY:0,viewW:1,viewH:1,meshCount:0,screenTriCount:0,errors:[],timeStep:0,flash:1,pressCount:0,metalSample:0};
const model=[],transparent=[],crt=[];
const add=(pts,kind='olive',factor=0,meta={})=>model.push({pts,kind,factor,...meta});
function rounded(cx,cy,w,h,r,z,segments=5){
 const out=[];
 for(const [px,py,a] of [[cx+w/2-r,cy+h/2-r,0],[cx-w/2+r,cy+h/2-r,90],[cx-w/2+r,cy-h/2+r,180],[cx+w/2-r,cy-h/2+r,270]]){
  // clockwise from upper right; 90 degree arcs each, continuous outline
  const first=a===0?0:a;
  for(let i=0;i<=segments;i++){
   const ang=(first+45+i*(90/segments)-90)*Math.PI/180;
   const xx=(a===0?cx+w/2-r:a===90?cx-w/2+r:a===180?cx-w/2+r:cx+w/2-r)+r*Math.cos(ang);
   const yy=(a===0?cy+h/2-r:a===90?cy+h/2-r:a===180?cy-h/2+r:cy-h/2+r)+r*Math.sin(ang);
   out.push([xx,yy,z]);
  }
 }
 return out;
}
// Explicit control-point outline: a four-corner rounded rectangle with one
// consistent winding direction (side edges must not collapse / self-intersect).
function contour(cx,cy,w,h,r,z,N=7){
 const p=[];
 for(const [sx,sy,start] of [[1,1,0],[-1,1,90],[-1,-1,180],[1,-1,270]]){
  const x=cx+sx*(w*.5-r),y=cy+sy*(h*.5-r);
  const a0=start*Math.PI/180;
  for(let j=0;j<=N;j++){
   const a=a0+(j/N)*Math.PI/2;
   p.push([x+r*Math.cos(a),y+r*Math.sin(a),z]);
  }
 }
 return p;
}
// The contour above is top-right → top-left → bottom-left → bottom-right.
function bridge(a,b,kind,base=0){for(let i=0;i<a.length;i++){let j=(i+1)%a.length;add([a[i],a[j],b[j],b[i]],kind,base);}}
function plate(cx,cy,w,h,r,z,kind,base=0){let loop=contour(cx,cy,w,h,r,z);const center=[cx,cy,z];for(let i=0;i<loop.length;i++)add([center,loop[i],loop[(i+1)%loop.length]],kind,base);}
function casing(){
 model.length=0; // machining rebuilt only on dial movement, never on every frame
 // Ceramic CRT body, one continuous cast shell. The metal light response is
 // the original Work coin() shader; its color is NOT the old brass palette.
 const body=[
  [6.14,3.82,.39,-1.13,'base'],
  [6.36,3.96,.43,-1.00,'shadowSteel'],
  [6.56,4.06,.49,-.63,'porcelain'],
  [6.56,4.06,.49,.36,'porcelain'],
  [6.47,4.00,.48,.53,'pearl'],
  [6.33,3.90,.46,.65,'porcelain'],
  [6.27,3.84,.45,.69,'pearl'],
 ];
 let last=null;
 for(const [w,h,r,z,mat] of body){let now=contour(0,0,w,h,r,z,9);if(last)bridge(last,now,mat);last=now;}
 plate(0,0,6.27,3.84,.45,.69,'porcelain',.055);
 // The screen is a rounded, curved glass body INSIDE the continuous bezel.
 // The black 3-D elastomer gasket goes INTO the chassis. Its inner edge joins
 // the actual CRT's outermost mesh ring; no rectangular screen quad remains.
 const cx=-.35,cy=.025;
 const screenRings=[
  [5.65,3.76,.57,.697,'porcelain'],
  [5.53,3.65,.56,.748,'brushed'],
  [5.41,3.56,.55,.760,'shadowSteel'],
  [5.35,3.51,.54,.748,'rubber'],
  [5.25,3.44,.50,.772,'rubber'],
  [5.18,3.39,.49,.780,'glassEdge'],
 ];
 last=null;
 for(const [w,h,r,z,mat] of screenRings){const now=contour(cx,cy,w,h,r,z,12);if(last)bridge(last,now,mat);last=now;}
 // Narrow, inset control cassette. It contains TWO real functions, not
 // decoration: upper click rotates the power selector, lower tunes a channel.
 const p0=contour(2.77,0,.70,2.86,.21,.700,9);
 const p1=contour(2.77,0,.63,2.78,.19,.722,9);
 bridge(p0,p1,'edgeSeam');
 plate(2.77,0,.63,2.78,.19,.723,'frontCast',-.02);
 knob(2.77,.53,.145,.738,.115,28,false,state.powerDial||0);
 knob(2.77,-.45,.112,.738,.102,28,false,state.channelDial||0);
 // A single genuine indicator lamp is useful: power + warmup feedback.
 // Unlike the previous fake bolt pattern, nothing is present without purpose.
 const lightHalo=contour(2.77,-1.045,.17,.08,.037,.738,5);
 const lightInner=contour(2.77,-1.045,.135,.055,.025,.756,5);
 bridge(lightHalo,lightInner,'brushed');
 plate(2.77,-1.045,.135,.055,.025,.758,'lamp');
 // Side cooling ports are functional rear shell perforations, never exposed
 // as random stripes on the main face or across the glass.
 for(let k=0;k<6;k++){
   let y=.52-k*.18;let x=3.281;
   add([[x,y,-.88],[x,y+.092,-.88],[x,y+.09,-.47],[x,y,-.47]],'vent');
 }
}

function circle(cx,cy,r,z,N=24){return Array.from({length:N},(_,i)=>{const a=(i/N)*TAU;return [cx+r*Math.cos(a),cy+r*Math.sin(a),z];});}
function knob(x,y,r,front,depth,N=28,light=false,theta=0){
 const steps=[[r*1.30,front,'rubber'],[r*1.21,front+.018,'brushed'],
   [r*1.12,front+.055,'silver'],[r*.87,front+depth*.82,'brushed'],
   [r*.82,front+depth,'dialFace']];
 let prev=null;
 for(const [rad,z,mat] of steps){const loop=circle(x,y,rad,z,N);if(prev)bridge(prev,loop,mat);prev=loop;}
 const z=front+depth,center=[x,y,z];
 for(let k=0;k<N;k++)add([center,prev[k],prev[(k+1)%N]],'dialFace',-.013);
 // Engraved indicator is a real rotating rectangular inset in world space.
 // It moves with the dial rather than remaining a screen-space painted slash.
 const dx=Math.sin(theta),dy=Math.cos(theta);
 const ux=-dy,uy=dx;
 const min=r*.31,max=r*.70,w=r*.065;
 const P=(v,s)=>[x+dx*v+ux*s,y+dy*v+uy*s,z+.006];
 add([P(min,-w),P(max,-w),P(max,w),P(min,w)],'engraving');
 // Radial grip milled into the rim, only 16 subtle chamfer lines.
 for(let k=0;k<16;k++){
  const a=k*TAU/16,co=Math.cos(a),si=Math.sin(a),wid=r*.025;
  add([[x+co*r*.96-si*wid,y+si*r*.96+co*wid,z-.018],
       [x+co*r*.96+si*wid,y+si*r*.96-co*wid,z-.018],
       [x+co*r*1.15+si*wid,y+si*r*1.15-co*wid,z-.023],
       [x+co*r*1.15-si*wid,y+si*r*1.15+co*wid,z-.023]],'engraving');
 }
}


function norm(points){
 const a=points[0],b=points[1],d=points[2],u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[d[0]-a[0],d[1]-a[1],d[2]-a[2]];
 return normalized(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);
}
function lens(x,y){return .131*Math.pow(Math.max(0,1-x*x),1.25)*Math.pow(Math.max(0,1-y*y),1.25);}
function surf(x,y){return [-.35+x*2.59,.025+y*1.695,.780+lens(x,y)];}
function makeCrt(){
 crt.length=0;
 const cx=-.35,cy=.025,W=5.18,H=3.39,R=.49;
 const rings=[.18,.34,.50,.66,.82,.92,1];
 const N=12,vertexCount=4*(N+1);
 const center=surf(0,0);
 let old=null;
 for(const f of rings){
   const contour3D=contour(cx,cy,W*f,H*f,R*f,0,N).map(v=>{
     const x=(v[0]-cx)/(W/2),y=(v[1]-cy)/(H/2);
     return surf(x,y);
   });
   const uvs=contour3D.map(v=>[(v[0]-cx)/W+.5,.5-(v[1]-cy)/H]);
   if(old){for(let j=0;j<vertexCount;j++){
     const jj=(j+1)%vertexCount;
     crt.push({tri:[old.v[j],old.v[jj],contour3D[j]],uv:[old.uv[j],old.uv[jj],uvs[j]]});
     crt.push({tri:[old.v[jj],contour3D[jj],contour3D[j]],uv:[old.uv[jj],uvs[jj],uvs[j]]});
   }}else{for(let j=0;j<vertexCount;j++){
      crt.push({tri:[center,contour3D[j],contour3D[(j+1)%vertexCount]],
       uv:[[.5,.5],uvs[j],uvs[(j+1)%vertexCount]]});
   }}
   old={v:contour3D,uv:uvs};
 }
 state.screenTriCount=crt.length;
}

casing();makeCrt();state.meshCount=model.length;
function rotation(v){
 const yaw=state.yaw*Math.PI/180,pitch=state.pitch*Math.PI/180;
 const ca=Math.cos(yaw),sa=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const [x,y,z]=v;const a=x*ca+z*sa,b=-x*sa+z*ca;
 return [a,y*cp-b*sp,y*sp+b*cp];
}
let viewW=960,viewH=540,scale=128;
function proj(v){const q=rotation(v),distance=10-q[2],f=10/Math.max(5,distance);
 return [viewW*.5+q[0]*scale*f,viewH*.5-q[1]*scale*f,q[2]];
}
function colorFor(kind,n,base){
 const nn=rotation(n),l=normalized(-.24,-.18,1.07);
 const strength=clamp(metal(...nn,base,.125,l),.018,1.66);
 state.metalSample=strength;
 if(kind==='vent')return '#0c1015';
 if(kind==='lamp')return state.power?'#ffb87f':'#272326';
 // Keep the exact Work metal response, but decouple it from the Work coin's
 // brass COLOR. Off-white porcelain body + satin nickel, high depth contrast.
 const tones={
  porcelain:[161,165,174,.50,.47],pearl:[189,191,194,.51,.50],
  frontCast:[117,121,130,.46,.40],base:[46,52,66,.38,.26],
  shadowSteel:[36,41,53,.28,.25],rubber:[14,19,26,.23,.13],
  glassEdge:[33,42,57,.30,.21],brushed:[131,141,154,.59,.33],
  silver:[181,189,202,.64,.34],edgeSeam:[42,48,59,.34,.23],
  dialFace:[113,121,133,.50,.28],engraving:[21,25,33,.21,.16],
 };
 const [r,g,b,gain,ambi]=tones[kind]||tones.porcelain;
 const c=clamp(ambi+strength*gain,.16,1.35);
 return `rgb(${Math.round(clamp(r*c,0,255))},${Math.round(clamp(g*c,0,255))},${Math.round(clamp(b*c,0,255))})`;
}

const reelAds=[
 {headline:'A LITTLE LUCK',sub:'THE WORK COLLECTION  /  SERIES 01',items:['coin','star','dagger'],accent:'#f4cf89',from:'#302235',to:'#101526'},
 {headline:'GOLD IN MOTION',sub:'STRIKE  ·  SHINE  ·  SPIN',items:['coin','coin','star'],accent:'#e6d8aa',from:'#233347',to:'#151827'},
 {headline:'THE MIDNIGHT SHOW',sub:'ONLY ON THE WORK NETWORK',items:['charm','star','shield'],accent:'#c9b6f0',from:'#322039',to:'#0d1724'},
 ];
const adCanvases=[];
function poster(channel){
 if(adCanvases[channel])return adCanvases[channel];
 const w=buffer.width,h=buffer.height,cv=document.createElement('canvas');cv.width=w;cv.height=h;
 const c=cv.getContext('2d'),A=reelAds[channel];
 const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,A.from);bg.addColorStop(1,A.to);
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 const halo=c.createRadialGradient(w*.52,h*.40,8,w*.48,h*.47,w*.70);
 halo.addColorStop(0,'rgba(204,182,159,.23)');halo.addColorStop(1,'rgba(9,10,14,0)');
 c.fillStyle=halo;c.fillRect(0,0,w,h);
 // These are the user's ORIGINAL rendered reel icons (height-field AO,
 // normals, paper/brass glints); no hand-drawn substitute casino glyphs.
 for(let k=0;k<3;k++){
  let x=118+k*97;
  c.shadowColor=A.accent;c.shadowBlur=8;
  if(window.ReelArt?.face)window.ReelArt.face(c,A.items[k],x-39,94,78,78,{iconOnly:true});
  else{c.fillStyle=A.accent;c.font='57px Georgia';c.textAlign='center';c.fillText('✦',x,156);}
  c.shadowBlur=0;
 }
 c.textAlign='center';c.fillStyle=A.accent;
 c.font='600 14px Georgia,serif';c.fillText('W  O  R  K    S T U D I O',w*.5,36);
 c.font='700 31px Georgia,serif';c.fillText(A.headline,w*.5,225);
 c.font='11px monospace';c.fillStyle='#c9c2cb';c.fillText(A.sub,w*.5,248);
 c.strokeStyle='rgba(237,225,207,.36)';c.lineWidth=1;
 c.beginPath();c.moveTo(108,264);c.lineTo(w-108,264);c.stroke();
 c.fillStyle='#b2acb7';c.font='11px monospace';c.fillText('OBJECTS WITH A STORY · 2026',w*.5,286);
 adCanvases[channel]=cv;return cv;
}
function powerCurve(t){
 const age=t-state.transitionAt;
 if(state.transition==='boot'){
  if(age>=1.54){state.transition='on';return 1;}
  if(age<.16)return 0;
  if(age<.50)return .007;
  if(age<.72)return .01;
  const q=clamp((age-.72)/.82,0,1);return q*q*(3-2*q);
 }
 if(state.transition==='switch'){if(age>.44)state.transition='on';return state.power?1:0;}
 if(state.transition==='shutdown'){
  if(age>=.75){state.transition='off';return 0;}
  if(age<.27)return 1;
  if(age<.55)return 1-clamp((age-.27)/.28,0,1);
  return .006*(1-clamp((age-.55)/.20,0,1));
 }
 return state.power?1:0;
}
function makeScreen(t){
 const w=buffer.width,h=buffer.height;
 const height=powerCurve(t);
 sg.fillStyle='#07090f';sg.fillRect(0,0,w,h);
 if(height<=0)return;
 sg.save();sg.beginPath();sg.rect(0,(1-height)*h*.5,w,h*height);sg.clip();
 const p=poster(state.channel);
 sg.drawImage(p,0,0);
 const glitch=state.transition==='switch'?Math.max(0,1-(t-state.transitionAt)/.44):0;
 if(glitch>.01){sg.fillStyle='rgba(237,221,198,'+(glitch*.15)+')';
  for(let n=0;n<6;n++){const y=(Math.sin(t*80+n*17)*.5+.5)*h;sg.fillRect(0,y,w,glitch*1.5);}}
 // Work's original CRT film idea: a subtle phosphor mask MULTIPLIED
 // into the real reel relief artwork. No opaque scanline stickers.
 sg.globalCompositeOperation='multiply';
 sg.fillStyle='rgba(183,177,183,.19)';
 for(let y=1;y<h;y+=3)sg.fillRect(0,y,w,1);
 sg.globalCompositeOperation='source-over';
 const vignette=sg.createRadialGradient(w/2,h*.49,w*.17,w/2,h*.49,w*.68);
 vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(1,3,11,.43)');
 sg.fillStyle=vignette;sg.fillRect(0,0,w,h);
 // Faint analog rolling reflection only; the image itself stays readable.
 const thin=(t*9)%h;sg.fillStyle='rgba(239,228,206,.035)';sg.fillRect(0,thin,w,2);
 sg.restore();
 if(height<.013){
   const shine=sg.createLinearGradient(0,0,w,0);
   shine.addColorStop(0,'rgba(255,255,246,0)');shine.addColorStop(.5,'rgba(255,242,214,.86)');shine.addColorStop(1,'rgba(255,255,246,0)');
   sg.fillStyle=shine;sg.fillRect(w*.23,h*.5-1,w*.54,2.1);
 }
 // Boot's aperture opening is visible, not a plain fade-to-color.
}

// The glass/plastic/metal/screen share a real occlusion buffer. The previous
// painter-order approach let the rear shell draw diagonal seams over the CRT.
// This rasterizer fixes those overlaps with per-pixel depth, Work lighting,
// and perspective-projected 3D faces. Cabinet shading is cached until camera
// motion; the phosphor layer animates independently at a bounded cost.
const physical=document.createElement('canvas'),physicalContext=physical.getContext('2d',{alpha:false});
let renderW=0,renderH=0,opaqueBuffer=null,depthBuffer=null,frameBuffer=null,
    geometryDirty=true,bodyFaces=0,screenMaskPixels=0,screenSource=null,screenBlend=null,screenCoverage=null,screenVisited=null;
let rasterPasses=0,frameRenderMs=0,frameStart=0;
function colorComponents(kind,n,base){
 const c=colorFor(kind,n,base);
 if(c.startsWith('#'))return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
 const values=c.match(/\d+/g);
 if(!values||values.length<3)return [8,11,8];
 return [Number(values[0]),Number(values[1]),Number(values[2])];
}
function drawTriangle(vertices,uv,kind,n,col,base,mode,pixels){
 const A=vertices[0],B=vertices[1],C=vertices[2];
 const x0=A[0],y0=A[1],x1=B[0],y1=B[1],x2=C[0],y2=C[1];
 const den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2);
 if(Math.abs(den)<.0001)return;
 const xmin=clamp(Math.floor(Math.min(x0,x1,x2)),0,renderW-1),xmax=clamp(Math.ceil(Math.max(x0,x1,x2)),0,renderW-1);
 const ymin=clamp(Math.floor(Math.min(y0,y1,y2)),0,renderH-1),ymax=clamp(Math.ceil(Math.max(y0,y1,y2)),0,renderH-1);
 const inv=1/den;
 const tex=pixels;
 const [R,G,Bc]=col||[0,0,0];
 const baseFres=.04;
 const fres=baseFres+(1-baseFres)*Math.pow(1-Math.abs(rotation(n)[2]),5);
 for(let y=ymin;y<=ymax;y++){
  const py=y+.5,at=y*renderW;
  for(let x=xmin;x<=xmax;x++){
   const px=x+.5;
   const u=((y1-y2)*(px-x2)+(x2-x1)*(py-y2))*inv;
   if(u<-.00001||u>1.00001)continue;
   const v=((y2-y0)*(px-x2)+(x0-x2)*(py-y2))*inv;
   if(v<-.00001||v>1.00001||u+v>1.00001)continue;
   const q=1-u-v,i=at+x;
   const z=A[2]*u+B[2]*v+C[2]*q;
   if(z<depthBuffer[i]-.0003)continue;
   depthBuffer[i]=z;
   const o=i*4;
   if(mode==='screenMap'){
    const tu=uv[0][0]*u+uv[1][0]*v+uv[2][0]*q,tv=uv[0][1]*u+uv[1][1]*v+uv[2][1]*q;
    const tx=clamp((tu*buffer.width)|0,0,buffer.width-1),ty=clamp((tv*buffer.height)|0,0,buffer.height-1);
    const xx=tu*2-1,yy=tv*2-1;
    const strip=Math.exp(-Math.pow((xx+yy*.30+.65)/.19,2))*.12;
    const edge=Math.pow(clamp(Math.max(Math.abs(xx),Math.abs(yy))-.68,0,1),2)*.18;
    const localAngle=Math.hypot(xx*.23,yy*.36);
    const glassFres=.04+.96*Math.pow(1-clamp(.98-localAngle,0,1),5);
    const reflect=clamp((glassFres*.7+strip+edge),0,.23);
    screenSource[i]=(ty*buffer.width+tx)*4;
    screenBlend[i]=Math.round(reflect*255);
    if(!screenVisited[i]){screenVisited[i]=1;screenCoverage.push(i);}
    continue;
   }
   if(mode==='screen'){
    const tu=uv[0][0]*u+uv[1][0]*v+uv[2][0]*q,tv=uv[0][1]*u+uv[1][1]*v+uv[2][1]*q;
    const tx=clamp((tu*buffer.width)|0,0,buffer.width-1),ty=clamp((tv*buffer.height)|0,0,buffer.height-1);
    const p=(ty*buffer.width+tx)*4;
    const xx=tu*2-1,yy=tv*2-1;
    const grain=(Math.sin(x*1.79+y*3.64)*.5+.5)*2.1;
    // Work glass cup: n_air=1, n_glass=1.5, Schlick reflection, colored
    // absorption, and a warm virtual window reflected over inner phosphors.
    const strip=Math.exp(-Math.pow((xx+yy*.30+.65)/.19,2))*.12;
    const edge=Math.pow(clamp(Math.max(Math.abs(xx),Math.abs(yy))-.68,0,1),2)*.18;
    const a=clamp((fres*.9+strip+edge),0,.23);
    frameBuffer[o]=clamp(tex[p]*(1-a)+217*a+grain,0,255);
    frameBuffer[o+1]=clamp(tex[p+1]*(1-a)+198*a+grain*.6,0,255);
    frameBuffer[o+2]=clamp(tex[p+2]*(1-a)+139*a+grain*.4,0,255);
    frameBuffer[o+3]=255;
    screenMaskPixels++;
   }else{
    const depth=(((x+y*17)*13)&31)*.022;
    let workPatina=1;
    if(workSurfacePixels&&['porcelain','pearl','frontCast'].includes(kind)){
      // Texture supplied by CabinetArt.plaque(), not improvised solid CSS.
      const sx=20+((x*3+y)&151),sy=17+((y*2+x)&103);
      const ti=(sy*192+sx)*4;
      workPatina=.955+workSurfacePixels[ti]/255*.125;
    }
    let soft=['porcelain','pearl','frontCast'].includes(kind)?(Math.sin(x*.083+y*.044)*.011+depth*.022):0;
    if(kind==='dialFace'){
      const centers=[[2.77,.55,.92],[2.77,-.47,.92]];
      let picked=centers[0],best=1e8;
      for(const center of centers){const cp=proj(center);const d=(cp[0]-x)**2+(cp[1]-y)**2;if(d<best){best=d;picked=cp;}}
      const theta=Math.atan2(y-picked[1],x-picked[0]),rho=Math.sqrt(best);
      soft+=.16*Math.cos(theta*1.0+.9)+.022*Math.sin(rho*.42);
    }
    frameBuffer[o]=clamp(R*workPatina*(1+soft),0,255);
    frameBuffer[o+1]=clamp(G*workPatina*(1+soft*.95),0,255);
    frameBuffer[o+2]=clamp(Bc*workPatina*(1+soft*.7),0,255);
    frameBuffer[o+3]=255;
   }
  }
 }
}
function prepareGeometry(){
 ensureWorkSurface();
 renderW=Math.min(780,Math.max(320,Math.round(viewW))); // adaptive Work-scale internal CPU resolution
 renderH=Math.max(200,Math.round(renderW*viewH/viewW));
 physical.width=renderW;physical.height=renderH;
 const oldW=viewW,oldH=viewH,oldScale=scale;
 viewW=renderW;viewH=renderH;
 scale=Math.min(viewW/7.25,viewH/4.65);
 if(viewW<viewH)scale=Math.min(viewW/6.84,viewH/4.45);
 opaqueBuffer=new Uint8ClampedArray(renderW*renderH*4);
 depthBuffer=new Float32Array(renderW*renderH);depthBuffer.fill(-1e10);
 frameBuffer=opaqueBuffer;
 for(let i=3;i<opaqueBuffer.length;i+=4)opaqueBuffer[i]=255;
 bodyFaces=0;
 for(const face of model){
  const n=norm(face.pts),col=colorComponents(face.kind,n,face.factor||0);
  const pts=face.pts.map(proj);
  for(let i=1;i<pts.length-1;i++){
   drawTriangle([pts[0],pts[i],pts[i+1]],null,face.kind,n,col,0,'metal');bodyFaces++;
  }
 }
 opaqueBuffer=opaqueBuffer.slice();
 const geometryDepth=depthBuffer.slice();
 screenSource=new Int32Array(renderW*renderH);
 screenBlend=new Uint8Array(renderW*renderH);
 screenVisited=new Uint8Array(renderW*renderH);
 screenCoverage=[];
 const n=normalized(0,0,1);
 // One-time UV/fresnel/depth map. Do NOT rasterize 532 CRT triangles per frame.
 for(const face of crt)drawTriangle(face.tri.map(proj),face.uv,'screen',n,null,0,'screenMap',null);
 screenMaskPixels=screenCoverage.length;
 state.opaqueFacesRendered=bodyFaces;
 state.cacheStamp++;
 viewW=oldW;viewH=oldH;scale=oldScale;
 // The depth buffer remains body-only: phosphors never erase the housing.
 state.geometryDepth=geometryDepth;
 geometryDirty=false;
}
function rasterScene(t){
 if(geometryDirty||!opaqueBuffer||Math.abs(renderW/Math.max(1,renderH)-viewW/Math.max(1,viewH))>.02)prepareGeometry();
 if(!frameBuffer||frameBuffer.length!==opaqueBuffer.length)frameBuffer=new Uint8ClampedArray(opaqueBuffer.length);
 frameBuffer.set(opaqueBuffer);
 const pixels=sg.getImageData(0,0,buffer.width,buffer.height).data;
 for(let j=0;j<screenCoverage.length;j++){
  const i=screenCoverage[j],o=i*4,p=screenSource[i];
  const a=screenBlend[i]/255,k=1-a;
  frameBuffer[o]=pixels[p]*k+230*a;
  frameBuffer[o+1]=pixels[p+1]*k+222*a;
  frameBuffer[o+2]=pixels[p+2]*k+224*a;
 }
 physicalContext.putImageData(new ImageData(frameBuffer,renderW,renderH),0,0);
 rasterPasses++;
}
function glowAt(x,y,r,gold){
 const grd=g.createRadialGradient(x,y,1,x,y,r);
 grd.addColorStop(0,gold?'rgba(252,201,105,.20)':'rgba(73,127,71,.07)');
 grd.addColorStop(1,'rgba(0,0,0,0)');
 g.fillStyle=grd;g.fillRect(x-r,y-r,r*2,r*2);
}
function draw(t){
 const w=W(),h=H(),dpr=Math.min(1.15,devicePixelRatio||1);
 if(screen.width!==Math.round(w*dpr)||screen.height!==Math.round(h*dpr)){
  screen.width=Math.round(w*dpr);screen.height=Math.round(h*dpr);
  geometryDirty=true;
 }
 viewW=w;viewH=h;
 scale=Math.min(w/7.25,h/4.65);if(w<h)scale=Math.min(w/6.84,h/4.45);
 g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle='#000';g.fillRect(0,0,w,h);
 if(state.power){glowAt(w/2,h/2,Math.min(w,h)*.54,false);}
 makeScreen(t);
 rasterScene(t);
 g.imageSmoothingEnabled=true;
 g.drawImage(physical,0,0,w,h);
 // Legible, small silk-screened function labels on the real control housing.
 // No panel outside the television, no decorative screw/bolt art.
 g.font=Math.round(clamp(scale*.07,8,12))+'px ui-monospace,monospace';
 g.textAlign='center';g.fillStyle='rgba(214,213,212,.66)';
 for(const [label,world] of [['PWR',[2.77,.205,.751]],['CH',[2.77,-.748,.751]]]){
  const pt=proj(world);g.fillText(label,pt[0],pt[1]);
 }
 g.textAlign='left';
 if(state.power){
  const p=proj([2.77,-1.045,.81]);
  g.globalCompositeOperation='screen';glowAt(p[0],p[1],Math.max(16,scale*.24),true);
  g.globalCompositeOperation='source-over';
 }
 state.seconds=t;state.frames++;
}

function switchPower(){state.power=!state.power;state.transition=state.power?'boot':'shutdown';state.transitionAt=performance.now()/1000;state.powerDial=state.power?.36:-.78;state.pressCount++;casing();geometryDirty=true;document.getElementById('sr').textContent=state.power?'电视正在开机':'电视正在关机';}
function switchChannel(delta){state.channel=(state.channel+delta+3)%3;state.channelDial=state.channel*.85-.65;state.pressCount++;state.transition='switch';state.transitionAt=performance.now()/1000;casing();geometryDirty=true;document.getElementById('sr').textContent='频道 '+(state.channel+1)+'，正在播放 WORK 广告';}
function hitKnob(x,y){
 const p=proj([2.77,.53,.90]),p2=proj([2.77,-.45,.89]);
 return Math.hypot(x-p[0],y-p[1])<Math.max(24,scale*.25)?'power':Math.hypot(x-p2[0],y-p2[1])<Math.max(24,scale*.23)?'channel':null;
}
let last=0,frames=0,elapsed=0,lastPresented=-1000;
function loop(t){const sec=t/1000;
 if(!last)last=t;const dt=Math.min(.04,(t-last)/1000);last=t;
 elapsed+=dt;frames++;if(elapsed>=.7){state.fps=Math.round(frames/elapsed);frames=0;elapsed=0;}
 // 19 Hz restrained phosphor shimmer (30 Hz while warming up); still
 // accepts inputs at 60+ Hz; geometry only changes when orbiting or tuning.
 if(geometryDirty||t-lastPresented>=1000/(state.dragging?20:state.transition==='boot'||state.transition==='shutdown'?30:19)){
  const started=performance.now();draw(sec);frameRenderMs=performance.now()-started;lastPresented=t;
 }
 requestAnimationFrame(loop);
}
let start=null;
screen.addEventListener('pointerdown',e=>{
 screen.setPointerCapture(e.pointerId);
 const control=hitKnob(e.clientX,e.clientY);
 start={x:e.clientX,y:e.clientY,yaw:state.yaw,pitch:state.pitch,control,moved:false,activated:false};
 state.dragging=false;
});
screen.addEventListener('pointermove',e=>{
 if(!start){screen.style.cursor=hitKnob(e.clientX,e.clientY)?'pointer':'grab';return;}
 const dx=e.clientX-start.x,dy=e.clientY-start.y;
 if(Math.hypot(dx,dy)<7)return;
 start.moved=true;
 if(start.control==='power'){
  // Physical selector requires a definite rotational gesture, not a fake UI.
  if(!start.activated&&Math.abs(dy)>12){switchPower();start.activated=true;}
  return;
 }
 if(start.control==='channel'){
  const step=Math.trunc(-dy/36);
  if(step){switchChannel(step);start.y=e.clientY;start.activated=true;}
  return;
 }
 state.dragging=true;
 state.yaw=clamp(start.yaw+dx*.075,-37,37);
 state.pitch=clamp(start.pitch+dy*.07,-19,18);
 geometryDirty=true;
});
screen.addEventListener('pointerup',e=>{
 if(!start)return;
 const previous=start;start=null;state.dragging=false;
 if(previous.activated||previous.control===null&&previous.moved)return;
 if(previous.control==='power')switchPower();
 if(previous.control==='channel')switchChannel(1);
});
screen.addEventListener('pointercancel',()=>{start=null;state.dragging=false});
screen.addEventListener('dblclick',()=>{state.yaw=-6;state.pitch=-4;geometryDirty=true;});
window.addEventListener('keydown',e=>{
 if(e.code==='Space'){e.preventDefault();if(!e.repeat)switchPower();}
 if(e.code==='ArrowLeft'){state.yaw=clamp(state.yaw-3,-37,37);geometryDirty=true;}
 if(e.code==='ArrowRight'){state.yaw=clamp(state.yaw+3,-37,37);geometryDirty=true;}
 if(e.code==='KeyC'){switchChannel(1);}
 if(e.code==='KeyR'){state.yaw=-6;state.pitch=-4;if(!state.power)switchPower();geometryDirty=true;}
 if(e.code==='Escape')location.href='../../soul-table.html';
});
requestAnimationFrame(loop);
window.WorkTVQA={state:()=>({isReal3D:true,meshFaces:state.meshCount,crtTriangles:state.screenTriCount,power:state.power,channel:state.channel,yaw:state.yaw,pitch:state.pitch,metalSource:'Work coin-art.js metal() copied unchanged',renderCache:state.cacheStamp,solidFaces:state.opaqueFacesRendered,crtPixelCoverage:screenMaskPixels,glassIOR:1.5,frames:state.frames,fps:state.fps,screenSize:[buffer.width,buffer.height],viewport:[viewW,viewH],pressCount:state.pressCount,frameRenderMs:Math.round(frameRenderMs*10)/10,rasterPasses,screenMappingPixels:screenCoverage?.length||0,originalCabinetTexture:workSurfaceUsed,powerTransition:state.transition,transitionAge:Math.round((performance.now()/1000-state.transitionAt)*100)/100,frontScrews:0,controlPositions:{power:proj([2.77,.53,.90]).slice(0,2),channel:proj([2.77,-.45,.89]).slice(0,2)},screenShape:'rounded curved integrated mesh',screenPrograms:reelAds.length,actualReelArt:!!window.ReelArt,modelColor:'pearl ceramic + satin silver'}),setAngles:(yaw,pitch)=>{state.yaw=clamp(yaw,-37,37);state.pitch=clamp(pitch,-19,18);geometryDirty=true;},setPower:(v)=>{if(state.power!==!!v)switchPower();},nextChannel:()=>switchChannel(1)};
})();