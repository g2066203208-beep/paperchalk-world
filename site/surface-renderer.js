import {pathsToSVG} from './surface.js';

export function paintSurface(ctx,envelope,camera,{opacity=1}={}){
 const closed=envelope.contours.filter(c=>c.closed&&c.points.length>3);
 if(!closed.length)return 0;
 const sx=x=>camera.tx+x*camera.scale,sy=y=>camera.ty+y*camera.scale;
 const region=envelope.extent;
 const left=sx(region.minX),top=sy(region.minY),right=sx(region.maxX),bottom=sy(region.maxY);
 ctx.save();
 ctx.globalAlpha=opacity;
 ctx.beginPath();
 for(const contour of closed){
  const [first,...rest]=contour.points;
  ctx.moveTo(sx(first.x),sy(first.y));
  for(const pt of rest)ctx.lineTo(sx(pt.x),sy(pt.y));
  ctx.closePath();
 }
 const skin=ctx.createLinearGradient(left,top,right,bottom);
 skin.addColorStop(0,'#d4e8d8');
 skin.addColorStop(.28,'#9ccab5');
 skin.addColorStop(.58,'#6d9c91');
 skin.addColorStop(1,'#395e62');
 ctx.fillStyle=skin;
 ctx.fill('evenodd');
 ctx.clip('evenodd');
 const glow=ctx.createRadialGradient(left+(right-left)*.28,top+(bottom-top)*.24,5,
  left+(right-left)*.38,top+(bottom-top)*.4,Math.max(120,(right-left)*.8));
 glow.addColorStop(0,'#e8f4dd49');
 glow.addColorStop(.72,'#5d878520');
 glow.addColorStop(1,'#203b4008');
 ctx.fillStyle=glow;ctx.fillRect(left,top,right-left,bottom-top);
 ctx.restore();
 ctx.save();
 ctx.lineCap='round';ctx.lineJoin='round';
 ctx.strokeStyle='#d3eed7';ctx.lineWidth=2;
 for(const contour of closed){
  ctx.beginPath();contour.points.forEach((p,i)=>{
   if(i===0)ctx.moveTo(sx(p.x),sy(p.y));
   else ctx.lineTo(sx(p.x),sy(p.y));
  });
  ctx.closePath();ctx.stroke();
 }
 ctx.restore();
 return closed.length;
}
export {pathsToSVG};
