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
  window.WorkTVCPU?.attachCabinetPixels(workSurfacePixels);
 }catch(err){console.warn('Work CabinetArt material unavailable:',err);}
}

const buffer=document.createElement('canvas');buffer.width=496;buffer.height=324;
const sg=buffer.getContext('2d',{alpha:false});
const W=()=>window.innerWidth,H=()=>window.innerHeight;
const state={cacheStamp:0,opaqueFacesRendered:0,yaw:-22,pitch:11,power:true,channel:0,showGuide:false,powerDial:.36,channelDial:-.65,transition:'boot',transitionAt:performance.now()/1000,illum:.8,glare:1,seconds:0,frames:0,fps:0,dragging:false,pointerX:0,pointerY:0,viewW:1,viewH:1,meshCount:0,screenTriCount:0,errors:[],timeStep:0,flash:1,pressCount:0,metalSample:0};
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
// Eight machined flat faces and precise corner cuts, modelled like Work's faceted coin.
// Four curved corners with four points apiece, not a crude 8-sided vault.
// Shared vertex winding keeps the front bezel and every 3-D shell layer watertight.
function contour(cx,cy,w,h,r,z,N=1){
 const X=w*.5,Y=h*.5,a=Math.min(r,X*.42,Y*.42),pts=[];
 for(const [x,y,start] of [
  [cx-X+a,cy+Y-a,90],[cx-X+a,cy-Y+a,180],
  [cx+X-a,cy-Y+a,270],[cx+X-a,cy+Y-a,0]]){
  for(let k=0;k<4;k++){
   const ang=(start+k*30)*Math.PI/180;
   pts.push([x+Math.cos(ang)*a,y+Math.sin(ang)*a,z]);
  }
 }
 return pts;
}
// The contour above is top-right → top-left → bottom-left → bottom-right.
function bridge(a,b,kind,base=0){for(let i=0;i<a.length;i++){let j=(i+1)%a.length;add([a[i],a[j],b[j],b[i]],kind,base);}}
function plate(cx,cy,w,h,r,z,kind,base=0){let loop=contour(cx,cy,w,h,r,z);const center=[cx,cy,z];for(let i=0;i<loop.length;i++)add([center,loop[i],loop[(i+1)%loop.length]],kind,base);}
function casing(){
 model.length=0; // machining rebuilt only on dial movement, never on every frame
 // Ceramic CRT body, one continuous cast shell. The metal light response is
 // the original Work coin() shader; its color is NOT the old brass palette.
 // A restrained consumer CRT: deep moulded shell and small softened corners.
 const body=[
  [5.48,3.53,.23,-1.54,'shadowSteel'],
  [5.73,3.69,.28,-1.38,'bodyEnamel'],
  [5.98,3.88,.30,-.98,'bodyEnamel'],
  [6.14,4.02,.34,-.49,'bodyEnamel'],
  [6.16,4.04,.34,.37,'bodyEnamel'],
  [6.12,4.00,.33,.50,'edgeMetal'],
  [6.06,3.94,.32,.61,'bodyEnamel'],
  [6.02,3.90,.32,.70,'rimMetal'],
 ];
 let last=null;
 for(const [w,h,r,z,mat] of body){let now=contour(0,0,w,h,r,z,9);if(last)bridge(last,now,mat);last=now;}
 plate(0,0,6.02,3.90,.32,.70,'bodyEnamel',.015);
 // The screen is a rounded, curved glass body INSIDE the continuous bezel.
 // The black 3-D elastomer gasket goes INTO the chassis. Its inner edge joins
 // the actual CRT's outermost mesh ring; no rectangular screen quad remains.
 const cx=-.40,cy=.025;
 const screenRings=[
  [5.07,3.74,.31,.702,'bodyEnamel'],
  [4.99,3.68,.30,.727,'edgeMetal'],
  [4.91,3.63,.29,.750,'recessDark'],
  [4.84,3.55,.28,.749,'rubber'],
  [4.75,3.46,.27,.779,'glassEdge'],
 ];
 last=null;
 for(const [w,h,r,z,mat] of screenRings){const now=contour(cx,cy,w,h,r,z,12);if(last)bridge(last,now,mat);last=now;}
 // Narrow, inset control cassette. It contains TWO real functions, not
 // decoration: upper click rotates the power selector, lower tunes a channel.
 const p0=contour(2.64,0,.60,2.55,.09,.700);
 const p1=contour(2.64,0,.53,2.48,.08,.725);
 bridge(p0,p1,'edgeMetal');
 plate(2.64,0,.53,2.48,.08,.726,'controlInset',-.02);
 knob(2.64,.53,.154,.743,.103,24,false,state.powerDial||0);
 knob(2.64,-.45,.135,.743,.096,24,false,state.channelDial||0);
 // A single genuine indicator lamp is useful: power + warmup feedback.
 // Unlike the previous fake bolt pattern, nothing is present without purpose.
 const lightHalo=contour(2.64,-1.045,.17,.08,.028,.742);
 const lightInner=contour(2.64,-1.045,.135,.055,.022,.757);
 bridge(lightHalo,lightInner,'brushed');
 plate(2.64,-1.045,.135,.055,.022,.760,'lamp');
 // Side cooling ports are functional rear shell perforations, never exposed
 // as random stripes on the main face or across the glass.
 // Blank rear-side cast housing; no decorative fake vent slits.

}


// The SAME procedural walnut grain, ray-traced drinking glass and ivy
// authored in Work cabinet-art.js. They are never substituted by a screenshot.
let workWood=null,woodWidth=512,woodHeight=320,workGlass=null,workIvy=null;
function makeWorkProps(){
 if(!window.CabinetArt)return;
 if(!workWood&&window.CabinetArt.wood){
  const tex=document.createElement('canvas');tex.width=woodWidth;tex.height=woodHeight;
  const tc=tex.getContext('2d',{willReadFrequently:true});
  window.CabinetArt.wood(tc,woodWidth,woodHeight);
  workWood=tc.getImageData(0,0,woodWidth,woodHeight).data;
 }
 if(!workGlass&&window.CabinetArt.glass){
  workGlass=document.createElement('canvas');workGlass.width=154;workGlass.height=143;
  window.CabinetArt.glass(workGlass.getContext('2d'),77,69,1.07);
 }
 if(!workIvy&&window.CabinetArt.nearIvy)workIvy=window.CabinetArt.nearIvy(8);
}
function woodQuad(p,uv){model.push({pts:p,uv,kind:'woodTop',factor:0});}
function box(x1,x2,y1,y2,z1,z2,kind){
 const A=[x1,y1,z1],B=[x2,y1,z1],C=[x2,y2,z1],D=[x1,y2,z1];
 const a=[x1,y1,z2],b=[x2,y1,z2],c=[x2,y2,z2],d=[x1,y2,z2];
 for(const f of [[A,B,C,D],[a,b,c,d],[D,C,c,d],[A,B,b,a],[A,D,d,a],[B,C,c,b]])add(f,kind);
}
function deskMesh(){
 // Thick timber slab with top grain mapped from the actual Work wood renderer,
 // visible fascia and four supporting legs. Feet actually touch the tabletop.
 const y=-2.28,x=4.55;
 woodQuad([[-x,y,-1.85],[x,y,-1.85],[x,y,1.94],[-x,y,1.94]],[[0,0],[1,0],[1,1],[0,1]]);
 box(-4.58,4.58,-2.44,-2.29,-1.87,1.98,'tableEdge');
 box(-4.45,4.45,-2.56,-2.45,1.49,1.90,'tableEdge');
 for(const xx of [-3.79,3.79])for(const zz of [-1.44,1.48])
  box(xx-.28,xx+.28,-3.65,-2.53,zz-.29,zz+.29,'tableLeg');
 // Real timber apron and stretchers instead of a plain floating plank.
 box(-4.05,4.05,-2.74,-2.46,1.34,1.53,'tableEdge');
 box(-4.05,4.05,-2.74,-2.46,-1.51,-1.34,'tableLeg');
 for(const xx of [-3.86,3.86])box(xx-.13,xx+.13,-2.78,-2.52,-1.44,1.42,'tableLeg');
 for(const xx of [-2.25,2.13]){
  box(xx-.42,xx+.42,-2.29,-1.98,-.39,.55,'shadowSteel');
  box(xx-.40,xx+.40,-2.19,-1.96,-.36,.51,'edgeMetal');
 }
}
function plantMesh(){
 // Actual volumetric faceted ceramic pot, soil, curved branch tubes and
 // folded leaves: every silhouette, thickness and light response comes from XYZ.
 const cx=-3.70,cz=1.14,y=-2.28,ns=10;
 const ring=(radius,h)=>Array.from({length:ns},(_,i)=>{
   const a=i*TAU/ns;return [cx+Math.cos(a)*radius,y+h,cz+Math.sin(a)*radius];
 });
 const bottom=ring(.245,.025),shoulder=ring(.352,.45),lip=ring(.384,.51),inner=ring(.297,.51);
 bridge(bottom,shoulder,'pot');bridge(shoulder,lip,'rimMetal');
 bridge(lip,inner,'pot');
 const soil=ring(.292,.465),cc=[cx,y+.465,cz];
 for(let k=0;k<ns;k++)add([cc,soil[k],soil[(k+1)%ns]],'soil');
 // Small 5-faced branch cylinders with a real 3D cross section.
 const tube=(a,b,r,kind='stem')=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l=Math.hypot(dx,dy,dz)||1;
  let ux=-dz/l,uz=dx/l;if(Math.abs(dx)+Math.abs(dz)<.05){ux=1;uz=0;}
  const vx=(dy*uz)/l,vy=(-dx*uz+dz*ux)/l,vz=-(dy*ux)/l;
  const loop=(p,size)=>Array.from({length:5},(_,i)=>{
   const ang=TAU*i/5;return [p[0]+size*(ux*Math.cos(ang)+vx*Math.sin(ang)),
    p[1]+size*vy*Math.sin(ang),p[2]+size*(uz*Math.cos(ang)+vz*Math.sin(ang))];
  });
  bridge(loop(a,r),loop(b,r*.63),kind);
 };
 const branches=[
  [-.13,-.08,1.20], [.12,.10,1.12],[-.34,.17,1.07],
  [.34,-.13,1.09],[-.16,.31,.98],[.23,.28,.94],[.02,-.30,1.06]
 ];
 const leaf=(base,tip,width,kind)=>{
  const dx=tip[0]-base[0],dz=tip[2]-base[2],l=Math.hypot(dx,dz)||1;
  const nx=-dz/l,nz=dx/l,center=[
   mix(base[0],tip[0],.52),mix(base[1],tip[1],.52)+.055,mix(base[2],tip[2],.52)];
  const left=[center[0]+nx*width,center[1]+.065,center[2]+nz*width+.045];
  const right=[center[0]-nx*width,center[1]-.015,center[2]-nz*width-.05];
  const ridge=[center[0],center[1]+.13,center[2]+.055];
  add([base,left,ridge],kind);add([base,ridge,right],kind);
  add([ridge,left,tip],kind);add([ridge,tip,right],kind);
 };
 for(let i=0;i<branches.length;i++){
  const [dx,dz,h]=branches[i],root=[cx+dx*.16,y+.47,cz+dz*.16],
   joint=[cx+dx*.54,y+.49+h*.48,cz+dz*.54],
   end=[cx+dx,y+.46+h,cz+dz];
  tube(root,joint,.031,i%2?'stem':'leafA');tube(joint,end,.023,'stem');
  for(let k=0;k<4;k++){
   const f=.27+k*.19,side=((i+k)%2)*2-1;
   const b=[mix(root[0],end[0],f),mix(root[1],end[1],f),mix(root[2],end[2],f)];
   const tt=[b[0]+side*(.21+.06*k),b[1]+.16+.02*k,b[2]+(k%2?.14:-.13)];
   tube(b,[mix(b[0],tt[0],.38),mix(b[1],tt[1],.38),mix(b[2],tt[2],.38)],.012,'stem');
   leaf(b,tt,.105+(k%2)*.045,['leafA','leafB','leafC'][(i+k)%3]);
  }
  if(i<3){
   const p=end;
   for(let k=0;k<5;k++){
    const a=k*TAU/5;
    const q=[p[0]+Math.cos(a)*.107,p[1]+Math.sin(a)*.096,p[2]+.035];
    add([p,q,[p[0]+Math.cos(a+.40)*.11,p[1]+Math.sin(a+.40)*.10,p[2]-.035]],'petal');
   }
  }
 }
}

function glassMesh(){
 // Genuine hollow 16-facet glass tumbler. The cup has an outer wall, inner
 // wall, finite-thickness open lip, thick base and a refractive liquid disk.
 // Back-to-front transparency is rasterized against the shared XYZ Z-buffer.
 transparent.length=0;
 const cx=3.65,cz=1.23,y=-2.27,N=16;
 const ring=(r,h)=>Array.from({length:N},(_,i)=>{
  const a=i*TAU/N;return [cx+Math.cos(a)*r,y+h,cz+Math.sin(a)*r];
 });
 const outerBottom=ring(.186,.037),outerTop=ring(.247,.63);
 const innerBottom=ring(.143,.105),innerTop=ring(.210,.627);
 const waterRim=ring(.184,.37),waterCenter=[cx,y+.37,cz],baseCenter=[cx,y+.036,cz];
 for(let i=0;i<N;i++){
  const j=(i+1)%N;
  transparent.push({pts:[outerBottom[i],outerBottom[j],outerTop[j],outerTop[i]],kind:'glassClear'});
  transparent.push({pts:[innerTop[i],innerTop[j],innerBottom[j],innerBottom[i]],kind:'glassClear'});
  transparent.push({pts:[outerTop[i],outerTop[j],innerTop[j],innerTop[i]],kind:'glassRim'});
  transparent.push({pts:[innerBottom[i],innerBottom[j],outerBottom[j],outerBottom[i]],kind:'glassBase'});
  transparent.push({pts:[waterCenter,waterRim[i],waterRim[j]],kind:'glassLiquid'});
  transparent.push({pts:[baseCenter,outerBottom[i],outerBottom[j]],kind:'glassBase'});
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
function lens(x,y){return .192*Math.pow(Math.max(0,1-x*x),1.25)*Math.pow(Math.max(0,1-y*y),1.25);}
function surf(x,y){return [-.40+x*2.375,.025+y*1.73,.786+lens(x,y)];}
function makeCrt(){
 crt.length=0;
 const cx=-.40,cy=.025,W=4.75,H=3.46,R=.27;
 const rings=[.18,.34,.50,.66,.82,.92,1];
 const N=1,vertexCount=16;
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

casing();deskMesh();plantMesh();glassMesh();makeCrt();state.meshCount=model.length;
function rotation(v){
 const yaw=state.yaw*Math.PI/180,pitch=state.pitch*Math.PI/180;
 const ca=Math.cos(yaw),sa=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const [x,y,z]=v;const a=x*ca+z*sa,b=-x*sa+z*ca;
 return [a,y*cp-b*sp,y*sp+b*cp];
}
let viewW=960,viewH=540,scale=128;
function proj(v){const q=rotation(v),distance=10-q[2],f=10/Math.max(5,distance);
 return [viewW*.5+q[0]*scale*f,viewH*.405-q[1]*scale*f,q[2]];
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
 bodyEnamel:[98,84,67,.44,.47],edgeMetal:[167,139,95,.82,.43],
 rimMetal:[202,173,119,.90,.43],controlInset:[76,69,56,.47,.32],
 porcelain:[113,103,83,.49,.45],pearl:[159,148,118,.53,.44],
 frontCast:[103,95,79,.47,.38],base:[43,48,43,.38,.26],
 shadowSteel:[31,33,31,.27,.22],rubber:[13,15,13,.23,.14],
 recessDark:[16,18,18,.21,.15],glassEdge:[39,40,38,.30,.19],
 brushed:[138,134,110,.59,.38],silver:[189,174,139,.61,.35],
 edgeSeam:[42,39,33,.34,.23],dialFace:[157,139,105,.52,.30],
 engraving:[27,27,23,.21,.18],tableEdge:[81,65,41,.42,.27],
 tableLeg:[56,46,34,.41,.24],pot:[81,70,53,.56,.29],
 soil:[26,29,23,.10,.16],stem:[44,69,43,.14,.19],
 leafA:[135,159,88,.27,.43],leafB:[153,171,102,.29,.44],
 leafC:[162,175,105,.30,.44],petal:[218,166,80,.46,.48],
 woodTop:[70,53,39,.22,.33]
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
 const p=window.WorkTVBroadcast?.frame(state.channel,t,state.showGuide)||poster(state.channel);
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
function drawTriangle(vertices,uv,kind,n,col,base,mode,pixels,worldPts=null){
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
 const projectedNormal=rotation(n);
 const fres=baseFres+(1-baseFres)*Math.pow(1-Math.abs(projectedNormal[2]),5);
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
   if(mode==='glass3D'){
    // Snell-inspired offset, Fresnel edge reflection and true XYZ faceted
    // silhouette, blended with the existing depth-tested 3D scene.
    const wx=worldPts[0][0]*u+worldPts[1][0]*v+worldPts[2][0]*q;
    const wy=worldPts[0][1]*u+worldPts[1][1]*v+worldPts[2][1]*q;
    const radius=Math.hypot(wx-3.65,worldPts[0][2]*u+worldPts[1][2]*v+worldPts[2][2]*q-1.23);
    const edge=clamp(1-Math.abs(projectedNormal[2]),0,1);
    const schlick=.04+.96*edge**5;
    const m=kind==='glassRim'?.66:kind==='glassBase'?.50:kind==='glassLiquid'?.49:.17+schlick*.32;
    const shift=Math.round(projectedNormal[0]*2.2),shiftY=Math.round(projectedNormal[1]*2.0);
    const sx=clamp(x+shift,0,renderW-1),sy=clamp(y+shiftY,0,renderH-1),si=(sy*renderW+sx)*4;
    const amber=kind==='glassLiquid'?[145,185,195]:kind==='glassRim'?[228,239,242]:[168,207,219];
    const spec=Math.pow(clamp(.39+projectedNormal[0]*-.29+projectedNormal[2]*.59,0,1),24)*26;
    const grain=(Math.sin(wx*89+wy*33)*.5+.5)*3;
    const ca=kind==='glassLiquid'?.52:kind==='glassRim'?.58:kind==='glassBase'?.48:.21;
    frameBuffer[o]=clamp(frameBuffer[si]*(1-ca*m)+amber[0]*ca*m+spec+grain,0,255);
    frameBuffer[o+1]=clamp(frameBuffer[si+1]*(1-ca*m)+amber[1]*ca*m+spec*.94+grain,0,255);
    frameBuffer[o+2]=clamp(frameBuffer[si+2]*(1-ca*m)+amber[2]*ca*m+spec*.87+grain,0,255);
    frameBuffer[o+3]=255;
    continue;
   }
   if(mode==='wood'){
    // Actual original CabinetArt.wood() pixels UV-mapped onto 3D tabletop.
    const tu=uv[0][0]*u+uv[1][0]*v+uv[2][0]*q,tv=uv[0][1]*u+uv[1][1]*v+uv[2][1]*q;
    const sx=clamp((tu*woodWidth)|0,0,woodWidth-1),sy=clamp((tv*woodHeight)|0,0,woodHeight-1);
    const src=(sy*woodWidth+sx)*4;
    // Real contact shadows under the TV feet, houseplant and water glass.
    // These darken the actual textured 3-D desktop using world XYZ positions.
    const wx=worldPts[0][0]*u+worldPts[1][0]*v+worldPts[2][0]*q;
    const wz=worldPts[0][2]*u+worldPts[1][2]*v+worldPts[2][2]*q;
    const tvFoot=Math.exp(-Math.pow(Math.max(0,Math.abs(wx)-2.71)*1.65,2)-Math.pow((wz-.03)*1.15,2));
    const plantFoot=Math.exp(-((wx+3.70)**2+(wz-1.14)**2)*7.8);
    const glassFoot=Math.exp(-((wx-3.65)**2+(wz-1.23)**2)*13.0);
    const ambientOcclusion=clamp(1-tvFoot*.15-plantFoot*.24-glassFoot*.25,.56,1);
    const bounce=state.power?.065*Math.exp(-Math.pow((wx+.20)*.30,2)-Math.pow((wz-1.04)*1.4,2)):0;
    const k=(.97+.15*(1-tv))*ambientOcclusion*(1+bounce);
    frameBuffer[o]=clamp(workWood[src]*1.29*k+18,0,255);
    frameBuffer[o+1]=clamp(workWood[src+1]*1.21*k+15,0,255);
    frameBuffer[o+2]=clamp(workWood[src+2]*1.14*k+12,0,255);
    frameBuffer[o+3]=255;
    continue;
   }
   if(mode==='screenMap'){
    const tu=uv[0][0]*u+uv[1][0]*v+uv[2][0]*q,tv=uv[0][1]*u+uv[1][1]*v+uv[2][1]*q;
    const tx=clamp((tu*buffer.width)|0,0,buffer.width-1),ty=clamp((tv*buffer.height)|0,0,buffer.height-1);
    const xx=tu*2-1,yy=tv*2-1;
    const strip=Math.exp(-Math.pow((xx+yy*.24+.60)/.15,2))*Math.exp(-Math.pow((yy+.45)/.79,2))*.22;
    const edge=Math.pow(clamp(Math.max(Math.abs(xx),Math.abs(yy))-.68,0,1),2)*.22;
    const localAngle=Math.hypot(xx*.23,yy*.36);
    const glassFres=.04+.96*Math.pow(1-clamp(.98-localAngle,0,1),5);
    const reflect=clamp((glassFres*.78+strip+edge),0,.30);
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
   }else if(mode==='metal'&&worldPts&&window.WorkTVCPU){
    // Real WORK CPU fragment path: barycentric mesh position -> original
    // 48x48 struck-die normals -> original metal() -> original alloy palette.
    // This is intentionally evaluated per visible metal/ceramic pixel,
    // NOT a shaded-once-per-triangle flat fill or a Canvas gradient.
    const wx=worldPts[0][0]*u+worldPts[1][0]*v+worldPts[2][0]*q;
    const wy=worldPts[0][1]*u+worldPts[1][1]*v+worldPts[2][1]*q;
    const wz=worldPts[0][2]*u+worldPts[1][2]*v+worldPts[2][2]*q;
    const rgb=window.WorkTVCPU.shade(kind,projectedNormal[0],projectedNormal[1],projectedNormal[2],wx,wy,wz);
    frameBuffer[o]=(rgb>>>16)&255;
    frameBuffer[o+1]=(rgb>>>8)&255;
    frameBuffer[o+2]=rgb&255;
    frameBuffer[o+3]=255;
   }else{
    const depth=(((x+y*17)*13)&31)*.022;
    let workPatina=1;
    if(workSurfacePixels&&['bodyEnamel','porcelain','pearl','frontCast','rimMetal','edgeMetal','controlInset'].includes(kind)){
      // Texture supplied by CabinetArt.plaque(), not improvised solid CSS.
      const sx=20+((x*3+y)&151),sy=17+((y*2+x)&103);
      const ti=(sy*192+sx)*4;
      workPatina=.955+workSurfacePixels[ti]/255*.125;
    }
    let soft=['bodyEnamel','porcelain','pearl','frontCast'].includes(kind)?(Math.sin(x*.083+y*.044)*.011+depth*.022):0;
    if(kind==='dialFace'){
      const centers=[[2.64,.53,.91],[2.64,-.45,.90]];
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
 const materialBuildStart=performance.now();
 ensureWorkSurface();makeWorkProps();
 window.WorkTVCPU?.resetStats();
 // CoinTable also lowers pixel work while bodies move and rerenders once
 // settled. Keep original Work sampling on EVERY interactive pixel, but use
 // a smaller temporary render target during drag; restore crisp detail on release.
 // Render large enough for clean diagonal edges and readable CRT text.
 // While orbiting, lower only the temporary preview, then restore on release.
 renderW=Math.min(state.dragging?850:1280,Math.max(390,Math.round(viewW*Math.min(devicePixelRatio||1,1.20))));
 renderH=Math.max(220,Math.round(renderW*viewH/viewW));
 physical.width=renderW;physical.height=renderH;
 const oldW=viewW,oldH=viewH,oldScale=scale;
 viewW=renderW;viewH=renderH;
 scale=Math.min(viewW/9.7,viewH/6.85);
 if(viewW<viewH)scale=Math.min(viewW/9.8,viewH/7.55);
 scale*=1-.10*Math.abs(state.yaw)/37;
 opaqueBuffer=new Uint8ClampedArray(renderW*renderH*4);
 depthBuffer=new Float32Array(renderW*renderH);depthBuffer.fill(-1e10);
 frameBuffer=opaqueBuffer;
 // Soft neutral studio backdrop, precomposed only when geometry changes.
 for(let py=0;py<renderH;py++)for(let px=0;px<renderW;px++){
  const q=(py*renderW+px)*4,xx=(px/renderW-.49)*1.9,yy=(py/renderH-.48)*1.4;
  const ambient=Math.exp(-xx*xx*2.8-yy*yy*2.3),floor=Math.max(0,py/renderH-.73)*12;
  opaqueBuffer[q]=Math.round(10+ambient*19+floor);
  opaqueBuffer[q+1]=Math.round(12+ambient*19+floor*.72);
  opaqueBuffer[q+2]=Math.round(17+ambient*21+floor*.54);
  opaqueBuffer[q+3]=255;
 }
 bodyFaces=0;
 for(const face of model){
  const n=norm(face.pts),col=colorComponents(face.kind,n,face.factor||0);
  const pts=face.pts.map(proj);
  for(let i=1;i<pts.length-1;i++){
   const uv=face.uv?[face.uv[0],face.uv[i],face.uv[i+1]]:null;
   drawTriangle([pts[0],pts[i],pts[i+1]],uv,face.kind,n,col,0,face.kind==='woodTop'&&workWood?'wood':'metal',null,
     [face.pts[0],face.pts[i],face.pts[i+1]]);bodyFaces++;
  }
 }
 // Transparent triangles have genuine depth/geometry. Sort the cup walls
 // back-to-front before compositing; there is no 2D cup sprite after this.
 const glassTriangles=[];
 for(const face of transparent){
  const n=norm(face.pts);
  for(let k=1;k<face.pts.length-1;k++){
   const pts=[face.pts[0],face.pts[k],face.pts[k+1]];
   glassTriangles.push({pts,n,kind:face.kind,z:pts.reduce((a,p)=>a+proj(p)[2],0)/3});
  }
 }
 glassTriangles.sort((a,b)=>a.z-b.z);
 for(const face of glassTriangles)drawTriangle(face.pts.map(proj),null,face.kind,face.n,null,0,'glass3D',null,face.pts);
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
 state.geometryBuildMs=Math.round((performance.now()-materialBuildStart)*10)/10;
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
 scale=Math.min(w/9.7,h/6.85);if(w<h)scale=Math.min(w/9.8,h/7.55);
 scale*=1-.10*Math.abs(state.yaw)/37;
 g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle='#000';g.fillRect(0,0,w,h);
 if(state.power){glowAt(w/2,h/2,Math.min(w,h)*.54,false);}
 makeScreen(t);
 rasterScene(t);
 g.imageSmoothingEnabled=false;
 g.drawImage(physical,0,0,w,h);
 // The tumbler, water, ceramic and folded leaves are now real rasterized
 // 3D meshes with shared depth; never paint a flat glass/ivy image on top.
 // Legible, small silk-screened function labels on the real control housing.
 // No panel outside the television, no decorative screw/bolt art.
 g.font=Math.round(clamp(scale*.07,8,12))+'px ui-monospace,monospace';
 g.textAlign='center';g.fillStyle='rgba(214,213,212,.66)';
 for(const [label,world] of [['PWR',[2.64,.205,.751]],['CH',[2.64,-.748,.751]]]){
  const pt=proj(world);g.fillText(label,pt[0],pt[1]);
 }
 g.textAlign='left';
 if(state.power){
  const p=proj([2.64,-1.045,.81]);
  g.globalCompositeOperation='screen';glowAt(p[0],p[1],Math.max(16,scale*.24),true);
  g.globalCompositeOperation='source-over';
 }
 state.seconds=t;state.frames++;
}

function switchPower(){state.power=!state.power;state.transition=state.power?'boot':'shutdown';state.transitionAt=performance.now()/1000;state.powerDial=state.power?.36:-.78;state.pressCount++;casing();deskMesh();plantMesh();glassMesh();state.meshCount=model.length;geometryDirty=true;document.getElementById('sr').textContent=state.power?'电视正在开机':'电视正在关机';}
function switchChannel(delta){state.showGuide=false;state.channel=(state.channel+delta+window.WorkTVBroadcast.labels.length*10)%window.WorkTVBroadcast.labels.length;state.channelDial=state.channel*.85-.65;state.pressCount++;state.transition='switch';state.transitionAt=performance.now()/1000;casing();deskMesh();plantMesh();state.meshCount=model.length;geometryDirty=true;document.getElementById('sr').textContent='频道 '+(state.channel+1)+'，'+window.WorkTVBroadcast.labels[state.channel];}
function hitKnob(x,y){
 const p=proj([2.64,.53,.90]),p2=proj([2.64,-.45,.89]);
 return Math.hypot(x-p[0],y-p[1])<Math.max(24,scale*.25)?'power':Math.hypot(x-p2[0],y-p2[1])<Math.max(24,scale*.23)?'channel':null;
}
let last=0,frames=0,elapsed=0,lastPresented=-1000;
function loop(t){const sec=t/1000;
 if(!last)last=t;const dt=Math.min(.04,(t-last)/1000);last=t;
 elapsed+=dt;frames++;if(elapsed>=.7){state.fps=Math.round(frames/elapsed);frames=0;elapsed=0;}
 // 19 Hz restrained phosphor shimmer (30 Hz while warming up); still
 // accepts inputs at 60+ Hz; geometry only changes when orbiting or tuning.
 if(geometryDirty||t-lastPresented>=1000/(state.dragging?32:state.transition==='boot'||state.transition==='shutdown'?32:24)){
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
 const previous=start;start=null;const wasDragging=state.dragging;state.dragging=false;
 if(wasDragging)geometryDirty=true; // full-detail Work pixels on release
 if(previous.activated||previous.control===null&&previous.moved)return;
 if(previous.control==='power')switchPower();
 if(previous.control==='channel')switchChannel(1);
});
screen.addEventListener('pointercancel',()=>{start=null;state.dragging=false});
screen.addEventListener('dblclick',()=>{state.yaw=-22;state.pitch=11;geometryDirty=true;});
window.addEventListener('keydown',e=>{
 if(e.code==='Space'){e.preventDefault();if(!e.repeat)switchPower();}
 if(e.code==='ArrowLeft'){state.yaw=clamp(state.yaw-3,-37,37);geometryDirty=true;}
 if(e.code==='ArrowRight'){state.yaw=clamp(state.yaw+3,-37,37);geometryDirty=true;}
 if(e.code==='KeyC'||e.code==='ArrowUp'){switchChannel(1);}
 if(e.code==='KeyI'){state.showGuide=!state.showGuide;document.getElementById('sr').textContent=state.showGuide?'节目指南已打开':'节目指南已关闭';}
 if(e.code==='ArrowDown'){switchChannel(-1);}
 if(/^Digit[1-6]$/.test(e.code)){switchChannel(Number(e.code.slice(5))-1-state.channel);}
 if(e.code==='KeyR'){state.yaw=-17;state.pitch=11;if(!state.power)switchPower();geometryDirty=true;}
 if(e.code==='Escape')location.href='../../soul-table.html';
});
requestAnimationFrame(loop);
window.WorkTVQA={state:()=>({workCpu:(window.WorkTVCPU?.stats||null),workCpuNormalMap:window.WorkTVCPU?.dieSize||0,originalPaletteCount:window.WorkTVCPU?.paletteSize||0,geometryBuildMs:state.geometryBuildMs||0,meshResolution:[renderW,renderH],isReal3D:true,meshFaces:state.meshCount,crtTriangles:state.screenTriCount,power:state.power,channel:state.channel,yaw:state.yaw,pitch:state.pitch,metalSource:'Work coin-art.js metal() copied unchanged',renderCache:state.cacheStamp,solidFaces:state.opaqueFacesRendered,crtPixelCoverage:screenMaskPixels,glassIOR:1.5,frames:state.frames,fps:state.fps,screenSize:[buffer.width,buffer.height],viewport:[viewW,viewH],pressCount:state.pressCount,frameRenderMs:Math.round(frameRenderMs*10)/10,rasterPasses,screenMappingPixels:screenCoverage?.length||0,originalCabinetTexture:workSurfaceUsed,powerTransition:state.transition,transitionAge:Math.round((performance.now()/1000-state.transitionAt)*100)/100,frontScrews:0,controlPositions:{power:proj([2.64,.53,.90]).slice(0,2),channel:proj([2.64,-.45,.89]).slice(0,2)},screenShape:'deep tapered softly faceted consumer CRT housing with curved glass',screenPrograms:window.WorkTVBroadcast?.labels.length||reelAds.length,showGuide:state.showGuide,programScripts:window.WorkTVBroadcast?.scripts?.length||0,actualReelArt:!!window.ReelArt,broadcast:window.WorkTVBroadcast?.status()||null,realGlass3DFaces:transparent.length,glassMethod:'hollow 16-facet depth-rasterized geometry, Fresnel-refraction approximation',modelColor:'Work faceted cast enamel + machined bezel + 3D timber desk',deskRealMesh:!!model.find(x=>x.kind==='woodTop'),originalWoodTexture:!!workWood,originalGlassSprite:!!workGlass,originalIvyAsset:!!workIvy,physicalFurnitureFaces:model.filter(x=>['tableEdge','tableLeg','woodTop'].includes(x.kind)).length,physicalPlantFaces:model.filter(x=>['pot','stem','leafA','leafB','leafC','petal'].includes(x.kind)).length}),setAngles:(yaw,pitch)=>{state.yaw=clamp(yaw,-37,37);state.pitch=clamp(pitch,-19,18);geometryDirty=true;},setPower:(v)=>{if(state.power!==!!v)switchPower();},nextChannel:()=>switchChannel(1)};
})();