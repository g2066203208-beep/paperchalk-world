/* A reusable, interruptible physical tray lifecycle. Distinct from both
 * scene transitions and the player's held hand. The ONLY valid motion for the
 * case is an anchored vertical slide from/into the bottom screen edge.
 * No disappearing frames, no unscaled group jumping to world origin.
 */
(function(root){'use strict';
const clamp=t=>Math.max(0,Math.min(1,t));
const outCubic=t=>1-Math.pow(1-clamp(t),3);
const inCubic=t=>Math.pow(clamp(t),3);
const outBack=t=>{
 const k=1.18,x=clamp(t)-1;
 return 1+(k+1)*x*x*x+k*x*x;
};
function create({openDuration=.47,closeDuration=.34,initiallyOpen=false,
 reducedMotion=false}={}){
 if(reducedMotion){openDuration=.15;closeDuration=.12;}
 if(!(openDuration>0&&closeDuration>0))throw Error('Invalid card case transition duration');
 let from=initiallyOpen?1:0,to=from,start=0,duration=0,active=false;
 function sample(at=0){
  if(!active)return{value:to,progress:1,phase:to?'open':'closed',busy:false};
  const t=clamp((at-start)/duration);
  const direction=to>from?'opening':'closing';
  const ease=direction==='opening'?outBack(t):inCubic(t);
  const value=from+(to-from)*ease;
  return {value,progress:t,phase:t>=1?(to?'open':'closed'):direction,
   busy:t<1};
 }
 function setOpen(next,at=0){
  next=!!next;
  const prev=sample(at),value=prev.value;
  if((to===Number(next)&&prev.busy)||(!prev.busy&&to===Number(next)))
   return prev;
  from=value;to=Number(next);start=at;
  duration=Math.max(.07,Math.abs(to-from)*(next?openDuration:closeDuration));
  active=Math.abs(to-from)>1e-5;
  return sample(at);
 }
 function transform(at,height){
  const state=sample(at);
  const travel=height+Math.max(.45,height*.13);
  // value may briefly pass 1 on opening, giving a small restrained bounce.
  return {...state,y:(state.value-1)*travel,
   visible:clamp(state.value),scale:1,
   interactive:state.value>=.83&&to===1};
 }
 function reset(open=false){
  from=open?1:0;to=from;start=0;duration=0;active=false;
 }
 return Object.freeze({setOpen,sample,transform,reset,
  get desiredOpen(){return to===1;},version:'1.1.0-reduced-motion'});
}
root.PaperchalkCardCaseMotion=Object.freeze({version:'1.0.0',create});
})(window);
