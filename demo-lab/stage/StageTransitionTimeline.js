
export const PAPER_STAGE_TIMING=Object.freeze({
  duration:1.62,
  city:{
    actors:[.00,.24],
    vertical:[.035,.285],
    backdrop:[.18,.39],
    floor:[.245,.46],
    lights:[.02,.30],
  },
  subway:{
    floor:[.34,.57],
    backdrop:[.39,.61],
    walls:[.49,.72],
    fixtures:[.56,.80],
    ceiling:[.69,.88],
    lights:[.79,.99],
  },
});

export const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
export function smoothstep(value){const t=clamp01(value);return t*t*(3-2*t);}
export function smootherstep(value){const t=clamp01(value);return t*t*t*(t*(t*6-15)+10);}
export function phase(t,start,end,ease=smootherstep){
  if(!(end>start))return t>=end?1:0;
  return ease(clamp01((t-start)/(end-start)));
}
export function rippleDelay(x,anchor,{range=92,spread=.12}={}){
  const px=Number.isFinite(x)?x:anchor;
  return Math.min(1,Math.abs(px-anchor)/Math.max(1,range))*spread;
}
export function ripplePhase(t,x,anchor,start,end,options){
  const delay=rippleDelay(x,anchor,options);
  return phase(t,start+delay,end+delay);
}
