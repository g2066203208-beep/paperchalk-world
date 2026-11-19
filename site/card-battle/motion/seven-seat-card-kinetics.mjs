/**
 * Blackjack-table choreography for the 7-seat game.
 * DIFFERENT from the slot machine's 3.8-second prize reveal. A table deal
 * should be brisk, readable, have anticipation, a visible paper turn, a
 * weighted impact and very short settle. Independent of real frame rate.
 *
 * These are ORIGINAL authored timings approximating the visual hierarchy of
 * Black Jacket screenshot/trailer references. No frame-perfect match is
 * claimed without source frame capture.
 */
const clamp=x=>Math.max(0,Math.min(1,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const easeOutCubic=t=>1-Math.pow(1-clamp(t),3);
const smooth=t=>{const x=clamp(t);return x*x*(3-2*x)};
const span=(t,a,b)=>clamp((t-a)/(b-a));
export const TABLE_CARD_TIMING=Object.freeze({
 deploy:660,draw:475,action:465,enemy:420
});
export function sampleTableCard(timeMs,kind='deploy',direction=1){
 const duration=TABLE_CARD_TIMING[kind]||TABLE_CARD_TIMING.deploy;
 const t=clamp(Math.max(0,timeMs)/duration);
 // Lift clear of the card pile, then fast accelerating table slide;
 // slight overshoot enters seat just before a 2px recoil.
 const lift=smooth(span(t,0,.19))*(1-smooth(span(t,.55,.85)));
 const travel=smooth(span(t,.10,.83));
 const turnStart=kind==='deploy'?.26:kind==='draw'?.51:.0;
 const turnEnd=kind==='deploy'?.70:kind==='draw'?.83:.02;
 const turn=kind==='action'||kind==='enemy'?1:smooth(span(t,turnStart,turnEnd));
 const yaw=(kind==='action'||kind==='enemy')?0:Math.PI*(1-turn);
 const roll=direction*.13*(1-smooth(span(t,.18,.83)))+
  direction*.025*Math.sin(t*24)*Math.exp(-Math.max(0,t-.81)*24);
 const squash=t>.80?(-.046*Math.sin(Math.PI*span(t,.81,.94))):0;
 const pulse=Math.sin(Math.PI*smooth(span(t,.42,.94)))**2;
 const impact=t>=.83&&! (t>=1);
 return {
  kind,duration,t,
  lift,
  travel,
  yaw,
  roll,
  pitch:-.11*Math.sin(Math.PI*travel)*(kind==='deploy'?1:.55),
  scale:1+lift*.075+squash,
  elevation:lift*20,
  bounce: t>=.83?
   Math.sin(Math.PI*span(t,.83,1))*Math.exp(-(t-.83)*12)*3:0,
  intensity:.15+pulse*.78,
  impact,
  arrived:t>=.86,
  complete:t>=1
 };
}
export function springTo(current,velocity,target,dt,frequency=23,damping=.92){
 const step=Math.max(.001,Math.min(.018,dt));
 // Semi-implicit Euler: damped spring approaches animated trajectory,
 // without unlimited overshoot, and without frame-rate-dependent easing.
 const omega=frequency;
 const accel=(target-current)*omega*omega-2*damping*omega*velocity;
 const v=velocity+accel*step;
 return {position:current+v*step,velocity:v};
}
export function tableFlightPoint(from,to,beat){
 const p=beat.travel,dx=to.x-from.x,dy=to.y-from.y;
 const curve=Math.sin(p*Math.PI);
 const side=Math.sign(dx)||1;
 return {
  x:lerp(from.x,to.x,p)+side*curve*Math.min(12,Math.abs(dx)*.045),
  y:lerp(from.y,to.y,p)-beat.elevation,
  scale:beat.scale,
  rotationY:beat.yaw,
  rotationZ:beat.roll,
  rotationX:beat.pitch,
  // Stable landing impact: no screen-scale parabolic character jumps.
  hit:beat.arrived
 };
}
