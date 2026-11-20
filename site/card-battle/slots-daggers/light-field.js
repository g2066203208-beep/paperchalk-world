/* Shallow scene geometry in desk pixels. Positive Z is measured above the wood. */
(() => {
'use strict';
const {clamp,makeCanvas}=SlotStudy;
const W=160,H=90,STEP=6;
const bounds=[
 [44,54,291,315,4,.24],[104,287,859,430,19,.58],
 [280,15,681,275,27,.54],[320,49,661,239,34,.78],[326,54,654,233,25,.19],
 [668,52,854,105,29,.68],[682,107,787,256,28,.43],[790,105,856,411,31,.66],
 [195,273,785,417,34,.67],[108,293,195,410,26,.53],
 [248,235,317,271,28,.5],[321,241,665,271,29,.63]
];
for(const x of [272,379,487,598,708]){
 bounds.push([x-51,287,x+50,401,37,.84],[x-41,298,x+41,392,28,.34]);
}
const fields=new Float32Array(W*H),metal=new Float32Array(W*H);
function setFloor(){
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x,px=(x+.5)*STEP,py=(y+.5)*STEP;
  let z=.5,reflect=.15;
  for(const [x0,y0,x1,y1,top,spec] of bounds){
   if(px>=x0&&px<=x1&&py>=y0&&py<=y1){z=top;reflect=spec}
  }
  const cup=((px-938)/63)**2+((py-312)/76)**2;
  if(cup<1){z=23+25*Math.sqrt(1-cup);reflect=.82}
  fields[i]=z;metal[i]=reflect;
 }
}
setFloor();
const nx=new Float32Array(W*H),ny=new Float32Array(W*H),nz=new Float32Array(W*H);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=y*W+x,dx=(fields[y*W+Math.max(0,x-1)]-fields[y*W+Math.min(W-1,x+1)])/(2*STEP);
 const dy=(fields[Math.max(0,y-1)*W+x]-fields[Math.min(H-1,y+1)*W+x])/(2*STEP);
 const inv=1/Math.hypot(dx,dy,1);
 nx[i]=dx*inv;ny[i]=dy*inv;nz[i]=inv;
}
function visibility(x,y,z,sx,sy,sz){
 let occlusion=0;
 for(let hop=1;hop<=8;hop++){
  const t=hop/9,ix=Math.floor((x+(sx-x)*t)/STEP),iy=Math.floor((y+(sy-y)*t)/STEP);
  if(ix<0||ix>=W||iy<0||iy>=H)continue;
  const above=fields[iy*W+ix]-(z+(sz-z)*t);
  if(above>0)occlusion=Math.max(occlusion,Math.min(.84,above/(4+9*t)));
 }
 return 1-occlusion;
}
function point(x,y,z,radius,power,color){return {x,y,z,r:radius,power,color}}
class DeskLights{
 constructor(){
  this.map=makeCanvas(W,H);this.ctx=this.map.getContext('2d');this.pixels=this.ctx.createImageData(W,H);
  this.last=-100;this.lastKey='';this.data=this.pixels.data;
 }
 update(t,stage,lampX,highlight,impact,enemy,payout,shop){
  // Sample lighting separately from reel and collision simulation.
  const key=[stage,impact>.1,enemy>.1,payout>.1,shop].join('/');
  if(key===this.lastKey&&t-this.last<1/19&&t>=this.last)return;
  this.last=t;this.lastKey=key;
  const local=[];
  const hue=({skeleton:[112,190,193],maw:[152,203,64],toad:[130,196,84],guard:[244,157,84],reaper:[255,150,65]})[stage]||[255,195,94];
  if(!shop)local.push(point(491,144,52,210,.22+impact*.89+enemy*.22,hue));
  if(highlight>.03)local.push(point(lampX,343,52,119,highlight*.95,[255,196,93]));
  if(enemy>.025)local.push(point(813,344,77,172,enemy*1.4,[255,174,76]));
  if(payout>.015)local.push(point(282,160,45,127,payout*1.20,[255,223,125]));
  if(shop)local.push(point(486,111,50,156,.20,[154,172,102]));
  const keyX=355+Math.sin(t*.24)*57,keyY=-85+Math.cos(t*.18)*11;
  const out=this.data;
  for(let iy=0;iy<H;iy++)for(let ix=0;ix<W;ix++){
   const i=iy*W+ix,p=i*4,x=(ix+.5)*STEP,y=(iy+.5)*STEP,z=fields[i],spec=metal[i];
   let red=0,green=0,blue=0;
   const keyDx=(keyX-x)/690,keyDy=(keyY-y)/690;
   const edge=Math.max(0,keyDx*nx[i]+keyDy*ny[i]+.44*nz[i]);
   const keyPower=.072*spec*edge*(.91+.09*Math.sin(t*.7));
   red+=203*keyPower;green+=148*keyPower;blue+=69*keyPower;
   for(const l of local){
    const dx=l.x-x,dy=l.y-y,dist2=dx*dx+dy*dy;
    if(dist2>=l.r*l.r)continue;
    const dz=l.z-z,inv=1/Math.sqrt(dist2+dz*dz+1);
    const ndotl=Math.max(0,(dx*nx[i]+dy*ny[i]+dz*nz[i])*inv);
    const f=1-dist2/(l.r*l.r);
    let energy=l.power*f*f*visibility(x,y,z+2,l.x,l.y,l.z);
    // Broad diffuse colour bounces onto the wood. A thin specular lobe catches bevels.
    const halfX=dx*inv,halfY=dy*inv-.25,halfZ=dz*inv+.97;
    const hnorm=1/Math.sqrt(halfX*halfX+halfY*halfY+halfZ*halfZ);
    let specular=Math.max(0,(halfX*nx[i]+halfY*ny[i]+halfZ*nz[i])*hnorm);
    specular*=specular;specular*=specular;specular*=specular;
    energy*=.18*ndotl+spec*.35*specular;
    if(!shop&&x>326&&x<654&&y>54&&y<233)energy*=.24;
    red+=l.color[0]*energy;green+=l.color[1]*energy;blue+=l.color[2]*energy;
   }
   out[p]=red;out[p+1]=green;out[p+2]=blue;out[p+3]=255;
  }
  this.ctx.putImageData(this.pixels,0,0);
 }
 draw(c){
  c.save();c.globalCompositeOperation='screen';c.imageSmoothingEnabled=true;
  c.drawImage(this.map,0,0,960,540);c.restore();
 }
}
window.DeskLights=DeskLights;
})();
