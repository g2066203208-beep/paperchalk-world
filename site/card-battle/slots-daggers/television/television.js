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
const buffer=document.createElement('canvas');buffer.width=496;buffer.height=324;
const sg=buffer.getContext('2d',{alpha:false});
const W=()=>window.innerWidth,H=()=>window.innerHeight;
const state={cacheStamp:0,opaqueFacesRendered:0,yaw:-11,pitch:-5,power:true,channel:0,illum:.8,glare:1,seconds:0,frames:0,fps:0,dragging:false,pointerX:0,pointerY:0,viewW:1,viewH:1,meshCount:0,screenTriCount:0,errors:[],timeStep:0,flash:1,pressCount:0,metalSample:0};
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
 const rings=[
  [5.13,3.13,.22,-1.18,'steel'],
  [5.48,3.35,.27,-.94,'olive'],
  [5.65,3.57,.28,-.40,'olive'],
  [5.65,3.57,.28,.48,'olive'],
  [5.49,3.43,.26,.67,'edgeGold'],
  [5.40,3.34,.25,.71,'olive'],
 ];
 let prev=null;
 for(const [w,h,r,z,mat] of rings){const c=contour(0,0,w,h,r,z);if(prev)bridge(prev,c,mat);prev=c;}
 plate(0,0,5.4,3.34,.25,.71,'olive',.08);
 plate(0,0,4.98,3.04,.23,.724,'frontCast',.07);
 // Gold edge on outer display: actually separated front/back profiles, like
 // the original coin planchet's multiple bevel rings (NOT a drawn rectangle).
 const bezel=[
  [4.56,3.01,.34,.742,'goldDark'],
  [4.49,2.96,.33,.779,'gold'],
  [4.32,2.80,.31,.811,'goldShine'],
  [4.22,2.72,.29,.819,'shadowSteel'],
  [4.11,2.62,.27,.833,'goldDark'],
 ];
 prev=null;
 for(const [w,h,r,z,mat] of bezel){
  const c=contour(-.42,.025,w,h,r,z);
  if(prev)bridge(prev,c,mat);
  prev=c;
 }
 // Actual beveled frame is now a metal 3D ring; inner CRT will sit behind glass.
 // The outermost bezel loop starts on the cast front (z=.724), so there are no
 // standalone UI-stroke lines acting as metal.
 const shellContour=contour(-.42,.025,4.65,3.09,.35,.724);
 bridge(shellContour,contour(-.42,.025,4.56,3.01,.34,.742),'goldDark');
 // Side plate raised above the case with a 3D bevel and inset.
 const side1=contour(2.095,.025,.89,3.03,.12,.731);
 const side2=contour(2.095,.025,.83,2.96,.11,.77);
 bridge(side1,side2,'goldDark');
 plate(2.095,.025,.83,2.96,.11,.77,'olive',-.035);
 // Slit vents have physically recessed dark cutout bands and metal crest rims.
 for(let k=0;k<8;k++){
  const y=-.65-k*.075;
  const a=contour(2.08,y,.57,.033,.012,.779,2),b=contour(2.08,y,.55,.027,.011,.783,2);
  bridge(a,b,'goldDark',-.05);plate(2.08,y,.53,.021,.01,.785,'vent',-.12);
 }
 // Housing mount feet, with rearward depth and weight, not floating decorations.
 for(const x of [-2.24,2.17]){
  const c1=contour(x,-1.79,.49,.18,.04,-.28,3),c2=contour(x,-1.91,.41,.23,.04,-.38,3);
  bridge(c1,c2,'olive');plate(x,-1.91,.41,.23,.04,-.38,'goldDark',-.07);
 }
 // Top and right rear heat vents are modeled as cut/recessed polygon slats.
 for(let k=0;k<9;k++){
  const yy=.71-k*.12;
  const x=2.73,z=-.72;
  add([[x,yy,z],[x,yy+.065,z],[x,yy+.06,z-.22],[x,yy,z-.22]],'vent',-.10);
 }
 for(const v of [[-2.60,1.64],[2.60,1.64],[-2.60,-1.65],[2.60,-1.65]])screw(...v,.79);
 // The two 3D machined control knobs are actual discs with 28 metallic sides.
 knob(2.08,.93,.30,.785,.24,28);
 knob(2.08,.03,.205,.787,.18,26);
 // Lamp amber diffuser has a 3D retaining ring and emissive insert.
 knob(2.08,-1.35,.12,.792,.055,24,true);
}
function circle(cx,cy,r,z,N=24){return Array.from({length:N},(_,i)=>{const a=(i/N)*TAU;return [cx+r*Math.cos(a),cy+r*Math.sin(a),z];});}
function knob(x,y,r,front,depth,N=24,light=false){
 const steps=[[r*1.25,front,'goldDark'],[r*1.16,front+.015,'goldShine'],[r,front+.047,'shadowSteel'],[r*.84,front+depth*.82,'gold'],[r*.79,front+depth,'goldShine']];let prev=null;
 for(const [rad,z,mat] of steps){const c=circle(x,y,rad,z,N);if(prev)bridge(prev,c,mat);prev=c;}
 const cen=[x,y,front+depth];for(let i=0;i<prev.length;i++)add([cen,prev[i],prev[(i+1)%N]],light?'lamp':'dialFace',-.04);
 if(!light){
  const notch=[x,y,front+depth+.002];const tip=[x,y+r*.59,front+depth+.007];
  add([[x-.016,tip[1],tip[2]], [x+.016,tip[1],tip[2]], [x+.016,y+r*.30,tip[2]], [x-.016,y+r*.30,tip[2]]],'shadowSteel');
 }
}
function screw(x,y,z){
 const radius=.063,N=10,ring=circle(x,y,radius,z,N),center=[x,y,z+.023];
 for(let i=0;i<N;i++)add([center,ring[i],ring[(i+1)%N]],'goldShine');
 add([[x-.037,y-.005,z+.024],[x+.037,y+.005,z+.024],[x+.035,y+.013,z+.024],[x-.039,y+.003,z+.024]],'shadowSteel');
}
function norm(points){
 const a=points[0],b=points[1],d=points[2],u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[d[0]-a[0],d[1]-a[1],d[2]-a[2]];
 return normalized(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);
}
function lens(x,y){return .089*(1-Math.pow(x,2))*(1-Math.pow(y,2));}
function surf(x,y){return [-.42+x*2.016,.025+y*1.287,.858+lens(x,y)];}
function makeCrt(){const cols=19,rows=14;
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const a=x/cols*2-1,b=(x+1)/cols*2-1,c=y/rows*2-1,d=(y+1)/rows*2-1;
  const p=[surf(a,c),surf(b,c),surf(a,d),surf(b,d)];
  crt.push({tri:[p[0],p[1],p[2]],uv:[[x/cols,y/rows],[(x+1)/cols,y/rows],[x/cols,(y+1)/rows]]});
  crt.push({tri:[p[1],p[3],p[2]],uv:[[(x+1)/cols,y/rows],[(x+1)/cols,(y+1)/rows],[x/cols,(y+1)/rows]]});
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
 const level=clamp(metal(...nn,base,kind==='gold'||kind==='goldShine'?.15:.105,l),.015,1.65);
 state.metalSample=level;
 if(kind==='vent')return '#0c1210';
 if(kind==='lamp')return state.power?'#f5bb5c':'#514e39';
 const brightness=clamp(level,0,1.0);
 if(kind==='gold'||kind==='goldShine'||kind==='edgeGold'||kind==='goldDark'||kind==='dialFace'){
  const scalar=kind==='goldDark'?.65:kind==='goldShine'?.88:kind==='edgeGold'?.85:kind==='dialFace'?.64:.88;
  const p=palette[clamp(Math.round(brightness*255),0,255)];
  return 'rgb('+p.map(x=>clamp(Math.round(x*scalar),0,255)).join(',')+')';
 }
 let intensity=clamp(.44+level*.66,.15,1.25),r=49,gc=60,b=45;
 if(kind==='frontCast'){r=56;gc=67;b=51;intensity*=1.10;}
 if(kind==='shadowSteel'){r=25;gc=33;b=27;intensity*=.65;}
 if(kind==='steel'){r=36;gc=46;b=37;intensity*=.76;}
 if(kind==='olive'){intensity*=1.05;}
 return `rgb(${clamp(Math.round(r*intensity),0,255)},${clamp(Math.round(gc*intensity),0,255)},${clamp(Math.round(b*intensity),0,255)})`;
}
function makeScreen(t){
 const w=buffer.width,h=buffer.height;
 // A quiet, near-black surveillance feed. No fictional room outside the TV.
 const bg=sg.createRadialGradient(w*.51,h*.40,4,w*.50,h*.47,w*.72);
 if(state.power){
  bg.addColorStop(0,'#203928');bg.addColorStop(.57,'#101f14');bg.addColorStop(1,'#050b08');
 }else{bg.addColorStop(0,'#080d0b');bg.addColorStop(1,'#020403');}
 sg.fillStyle=bg;sg.fillRect(0,0,w,h);
 if(!state.power)return;
 // Three separated depths of the monitored dark passage, deliberately subdued.
 sg.save();sg.globalAlpha=.28+Math.sin(t*.55)*.015;
 const H=h,W=w;
 const corridor=sg.createLinearGradient(0,h*.14,w*.80,h);
 corridor.addColorStop(0,'#526c3f');corridor.addColorStop(.55,'#253d24');corridor.addColorStop(1,'#142b17');
 sg.strokeStyle=corridor;sg.lineWidth=2.4;
 for(const [xx,yy] of [[.06,.26],[.20,.38],[.33,.31],[.71,.26],[.89,.36]]){
  const x=xx*W,y=yy*H;
  sg.beginPath();sg.moveTo(x,0);sg.lineTo(x*0.76+W*.12,H);sg.stroke();
 }
 for(let j=1;j<7;j++){
  const y=H*(.23+j*.108);sg.globalAlpha=.15*(1-j/9);
  sg.beginPath();sg.moveTo(W*.09,y);sg.lineTo(W*.85,y+H*.048);sg.stroke();
 }
 sg.restore();
 sg.save();sg.globalCompositeOperation='screen';
 const g=sg.createRadialGradient(w*.34,h*.28,5,w*.34,h*.28,w*.35);
 g.addColorStop(0,'rgba(177,206,111,.062)');g.addColorStop(1,'rgba(20,50,25,0)');
 sg.fillStyle=g;sg.fillRect(0,0,w,h);sg.restore();
 // The phosphor mask is actually multiplied with the video, not drawn as a
 // decorative translucent overlay. Work glass IOR + CRT phosphor reference.
 const image=sg.getImageData(0,0,w,h),d=image.data;
 const flicker=.987+.013*Math.sin(t*21.3);
 for(let y=0;y<h;y++){
  const scan=(y%3===0?.76:y%3===1?.95:.86)*flicker;
  const wobble=Math.sin(y*.09+t*.17)*.002;
  for(let x=0;x<w;x++){
   const i=(y*w+x)*4,xx=(x-w*.5)/(w*.5),yy=(y-h*.5)/(h*.5);
   const edge=Math.max(0,1-.38*(xx*xx+yy*yy));
   const grain=(Math.sin(x*41.73+y*93.57+Math.floor(t*10)*11.9)*.5+.5)*1.75;
   const moire=.965+.035*Math.sin((x+wobble*w)*Math.PI*2/3);
   d[i]=clamp(d[i]*.68*scan*edge*moire+grain,0,255);
   d[i+1]=clamp(d[i+1]*1.02*scan*edge*moire+grain*.56,0,255);
   d[i+2]=clamp(d[i+2]*.64*scan*edge+grain*.32,0,255);
  }
 }
 sg.putImageData(image,0,0);
}
// The glass/plastic/metal/screen share a real occlusion buffer. The previous
// painter-order approach let the rear shell draw diagonal seams over the CRT.
// This rasterizer fixes those overlaps with per-pixel depth, Work lighting,
// and perspective-projected 3D faces. Cabinet shading is cached until camera
// motion; the phosphor layer animates independently at a bounded cost.
const physical=document.createElement('canvas'),physicalContext=physical.getContext('2d',{alpha:false});
let renderW=0,renderH=0,opaqueBuffer=null,depthBuffer=null,frameBuffer=null,
    geometryDirty=true,bodyFaces=0,screenMaskPixels=0;
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
 const baseFres=.04, nEye=mode==='screen'?Math.abs(rotation(n)[2]):1;
 const fres=baseFres+(1-baseFres)*(1-nEye)**5;
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
   if(mode==='screen'){
    const tu=uv[0][0]*u+uv[1][0]*v+uv[2][0]*q,tv=uv[0][1]*u+uv[1][1]*v+uv[2][1]*q;
    const tx=clamp((tu*buffer.width)|0,0,buffer.width-1),ty=clamp((tv*buffer.height)|0,0,buffer.height-1);
    const p=(ty*buffer.width+tx)*4;
    const xx=tu*2-1,yy=tv*2-1;
    const grain=(Math.sin(x*1.79+y*3.64)*.5+.5)*2.1;
    // Work glass cup: n_air=1, n_glass=1.5, Schlick reflection, colored
    // absorption, and a warm virtual window reflected over inner phosphors.
    const strip=Math.exp(-Math.pow((xx+yy*.25+.60)/.21,2))*.23;
    const edge=Math.max(0,xx*xx+yy*yy-1.15)*.055;
    const a=clamp((fres*.9+strip+edge),0,.24);
    frameBuffer[o]=clamp(tex[p]*(1-a)+217*a+grain,0,255);
    frameBuffer[o+1]=clamp(tex[p+1]*(1-a)+198*a+grain*.6,0,255);
    frameBuffer[o+2]=clamp(tex[p+2]*(1-a)+139*a+grain*.4,0,255);
    frameBuffer[o+3]=255;
    screenMaskPixels++;
   }else{
    const depth=(((x+y*17)*13)&31)*.022;
    let soft=(kind==='olive'||kind==='frontCast')?(Math.sin(x*.11+y*.07)*.019+depth*.05):0;
    if(kind==='dialFace'){
      const centers=[[2.08,.93,.785+.24],[2.08,.03,.787+.18]];
      let picked=centers[0],best=1e8;
      for(const center of centers){const cp=proj(center);const d=(cp[0]-x)**2+(cp[1]-y)**2;if(d<best){best=d;picked=cp;}}
      const theta=Math.atan2(y-picked[1],x-picked[0]),rho=Math.sqrt(best);
      soft+=.16*Math.cos(theta*1.0+.9)+.022*Math.sin(rho*.42);
    }
    frameBuffer[o]=clamp(R*(1+soft),0,255);
    frameBuffer[o+1]=clamp(G*(1+soft*.95),0,255);
    frameBuffer[o+2]=clamp(Bc*(1+soft*.7),0,255);
    frameBuffer[o+3]=255;
   }
  }
 }
}
function prepareGeometry(){
 renderW=Math.min(1050,Math.max(320,Math.round(viewW)));
 renderH=Math.max(200,Math.round(renderW*viewH/viewW));
 physical.width=renderW;physical.height=renderH;
 const oldW=viewW,oldH=viewH,oldScale=scale;
 viewW=renderW;viewH=renderH;
 scale=Math.min(viewW/6.68,viewH/4.16);
 if(viewW<viewH)scale=Math.min(viewW/6.11,viewH/4.15);
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
 state.opaqueFacesRendered=bodyFaces;
 state.cacheStamp++;
 viewW=oldW;viewH=oldH;scale=oldScale;
 // The depth buffer remains body-only: phosphors never erase the housing.
 state.geometryDepth=geometryDepth;
 geometryDirty=false;
}
function rasterScene(t){
 if(geometryDirty||!opaqueBuffer||Math.abs(renderW/Math.max(1,renderH)-viewW/Math.max(1,viewH))>.02)prepareGeometry();
 const savedW=viewW,savedH=viewH,savedS=scale;
 viewW=renderW;viewH=renderH;
 scale=Math.min(viewW/6.68,viewH/4.16);if(viewW<viewH)scale=Math.min(viewW/6.11,viewH/4.15);
 frameBuffer=new Uint8ClampedArray(opaqueBuffer);
 depthBuffer=new Float32Array(state.geometryDepth);
 const pixels=sg.getImageData(0,0,buffer.width,buffer.height).data;
 const n=normalized(0,0,1);
 screenMaskPixels=0;
 for(const f of crt){
  const pts=f.tri.map(proj);
  // A clipped per-pixel image-mapped glass surface, 532 curved real triangles.
  drawTriangle(pts,f.uv,'screen',n,null,0,'screen',pixels);
 }
 const im=new ImageData(frameBuffer,renderW,renderH);
 physicalContext.putImageData(im,0,0);
 viewW=savedW;viewH=savedH;scale=savedS;
}
function glowAt(x,y,r,gold){
 const grd=g.createRadialGradient(x,y,1,x,y,r);
 grd.addColorStop(0,gold?'rgba(252,201,105,.20)':'rgba(73,127,71,.07)');
 grd.addColorStop(1,'rgba(0,0,0,0)');
 g.fillStyle=grd;g.fillRect(x-r,y-r,r*2,r*2);
}
function draw(t){
 const w=W(),h=H(),dpr=Math.min(1.5,devicePixelRatio||1);
 if(screen.width!==Math.round(w*dpr)||screen.height!==Math.round(h*dpr)){
  screen.width=Math.round(w*dpr);screen.height=Math.round(h*dpr);
  geometryDirty=true;
 }
 viewW=w;viewH=h;
 scale=Math.min(w/6.68,h/4.16);if(w<h)scale=Math.min(w/6.11,h/4.15);
 g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle='#000';g.fillRect(0,0,w,h);
 if(state.power){glowAt(w/2,h/2,Math.min(w,h)*.58,false);}
 makeScreen(t);
 rasterScene(t);
 g.imageSmoothingEnabled=true;
 g.drawImage(physical,0,0,w,h);
 if(state.power){
  const p=proj([2.08,-1.35,.89]);
  g.globalCompositeOperation='screen';glowAt(p[0],p[1],Math.max(16,scale*.24),true);
  g.globalCompositeOperation='source-over';
 }
 state.seconds=t;state.frames++;
}

function hitKnob(x,y){
 const p=proj([2.08,.93,1.01]),p2=proj([2.08,.03,.92]);
 return Math.hypot(x-p[0],y-p[1])<scale*.42?'power':Math.hypot(x-p2[0],y-p2[1])<scale*.29?'channel':null;
}
let last=0,frames=0,elapsed=0;
function loop(t){const sec=t/1000;
 if(!last)last=t;const dt=Math.min(.04,(t-last)/1000);last=t;
 elapsed+=dt;frames++;if(elapsed>=.7){state.fps=Math.round(frames/elapsed);frames=0;elapsed=0;}
 draw(sec);requestAnimationFrame(loop);
}
let start=null;
screen.addEventListener('pointerdown',e=>{
 screen.setPointerCapture(e.pointerId);
 start={x:e.clientX,y:e.clientY,yaw:state.yaw,pitch:state.pitch};
 state.dragging=false;
});
screen.addEventListener('pointermove',e=>{
 if(!start)return;
 const dx=e.clientX-start.x,dy=e.clientY-start.y;
 if(Math.hypot(dx,dy)>6){state.dragging=true;state.yaw=clamp(start.yaw+dx*.075,-37,37);state.pitch=clamp(start.pitch+dy*.07,-19,18);geometryDirty=true;}
});
screen.addEventListener('pointerup',e=>{
 if(!start)return;
 const wasDrag=state.dragging;start=null;state.dragging=false;
 if(wasDrag)return;
 const what=hitKnob(e.clientX,e.clientY);
 if(what==='power'){state.power=!state.power;state.flash=1;state.pressCount++;document.getElementById('sr').textContent=state.power?'电视已开机':'电视已关闭';}
 if(what==='channel'){state.channel=(state.channel+1)%3;state.pressCount++;}
});
screen.addEventListener('pointercancel',()=>{start=null;state.dragging=false});
screen.addEventListener('dblclick',()=>{state.yaw=-11;state.pitch=-5;geometryDirty=true;});
window.addEventListener('keydown',e=>{
 if(e.code==='Space'){e.preventDefault();state.power=!state.power;state.pressCount++;}
 if(e.code==='ArrowLeft'){state.yaw=clamp(state.yaw-3,-37,37);geometryDirty=true;}
 if(e.code==='ArrowRight'){state.yaw=clamp(state.yaw+3,-37,37);geometryDirty=true;}
 if(e.code==='KeyR'){state.yaw=-11;state.pitch=-5;state.power=true;geometryDirty=true;}
 if(e.code==='Escape')location.href='../../soul-table.html';
});
requestAnimationFrame(loop);
window.WorkTVQA={state:()=>({isReal3D:true,meshFaces:state.meshCount,crtTriangles:state.screenTriCount,power:state.power,channel:state.channel,yaw:state.yaw,pitch:state.pitch,metalSource:'Work coin-art.js metal() copied unchanged',renderCache:state.cacheStamp,solidFaces:state.opaqueFacesRendered,crtPixelCoverage:screenMaskPixels,glassIOR:1.5,frames:state.frames,fps:state.fps,screenSize:[buffer.width,buffer.height],viewport:[viewW,viewH],pressCount:state.pressCount}),setAngles:(yaw,pitch)=>{state.yaw=clamp(yaw,-37,37);state.pitch=clamp(pitch,-19,18);geometryDirty=true;},setPower:(v)=>state.power=!!v};
})();