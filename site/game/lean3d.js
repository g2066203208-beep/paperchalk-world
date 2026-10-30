/* PAPERWORLD true 3D peek / camera lean.
 * Game coordinates: X forward, Y left, Z up. A sideways phone tilt
 * displaces the first-person EYE left/right, it does NOT just roll the image.
 * Max displacement 0.72 m at 65 degrees; bank capped at 17 degrees.
 * Camera's eye is collision clamped against the same city buildings/trees.
 */
import {clamp,RAD} from './motion3d.js';
import {blocked} from './locomotion3d.js';

export const LEAN_MAX=.64;
export const LEAN_FULL_ANGLE=65*RAD;
export const BANK_MAX=4*RAD;
export const EYE_RADIUS=.14;
export const LEAN_RESPONSE=.13;

// Even at 90deg phone tilt this remains a *peek*, not a sideways fall.
export function leanIntent(roll,comfort=true){
 const a=Math.abs(roll),dead=1.4*RAD;
 const v=Math.sign(roll)*clamp((a-dead)/(LEAN_FULL_ANGLE-dead),0,1);
 const max=comfort?.34:LEAN_MAX;
 // Linear gives immediate, proportional, predictable positional feedback.
 return {offset:v*max,bank:comfort?0:v*BANK_MAX};
}

// Return the furthest collision-safe position along the short camera ray.
// Fixed substeps avoid jumping through a thin wall at large frame intervals.
export function protectedLean(base,side,solids=[],radius=EYE_RADIUS){
 const distance=Math.abs(side);
 if(distance<.00001)return 0;
 const sign=Math.sign(side),steps=Math.max(2,Math.ceil(distance/.035));
 let safe=0;
 for(let i=1;i<=steps;i++){
  const offset=sign*distance*i/steps;
  if(blocked(base.x+base.leftX*offset,base.y+base.leftY*offset,radius,solids))break;
  safe=offset;
 }
 return safe;
}
export class LeanCamera{
 constructor(){this.offset=0;this.bank=0;this.rawRoll=0;this.comfort=true}
 setComfort(enabled){this.comfort=!!enabled}
 reset(){this.offset=0;this.bank=0;this.rawRoll=0}
 update(dt,roll,yaw,eye,solids=[]){
  this.rawRoll=roll;
  const leftX=-Math.sin(yaw),leftY=Math.cos(yaw);
  const intent=leanIntent(roll,this.comfort);
  const base={x:eye[0],y:eye[1],leftX,leftY};
  const allowed=protectedLean(base,intent.offset,solids);
  // Smooth real-camera displacement continuously, independent from sensor Hz.
  const response=1-Math.exp(-clamp(dt,0,.08)/LEAN_RESPONSE);
  this.offset+=(allowed-this.offset)*response;
  // Do NOT snap to zero as the device returns upright. Only wall geometry
  // may truncate the smoothed offset. Otherwise the head must glide home.
  const safe=protectedLean(base,this.offset,solids);
  this.offset=safe;
  this.bank+=(intent.bank-this.bank)*response;
  // Real sideways translation + a small vertical arc as the upper body leans.
  const drop=this.comfort?0:.035*(Math.abs(safe)/LEAN_MAX)**2;
  return {
   eye:[eye[0]+leftX*safe,eye[1]+leftY*safe,Math.max(.24,eye[2]-drop)],
   bank:this.bank,offset:safe,
   leftX,leftY,blocked:Math.abs(allowed-intent.offset)>.018
  };
 }
}
