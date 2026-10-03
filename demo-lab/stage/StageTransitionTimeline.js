export const PAPER_STAGE_TIMING=Object.freeze({
  // Deliberately long enough for the eye to read the mechanism, but short
  // enough to feel like one theatrical gesture rather than a loading screen.
  duration:2.12,
  city:{
    actors:[.00,.18],
    vertical:[.035,.33],
    page:[.12,.55],
    backdropHide:.53,
    floorHide:.50,
    lights:[.02,.30],
  },
  subway:{
    reveal:.27,
    walls:[.40,.67],
    fixtures:[.52,.79],
    ceiling:[.68,.86],
    lights:[.84,.985],
    train:.94,
  },
});

export const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
export function smoothstep(value){const t=clamp01(value);return t*t*(3-2*t);}
export function smootherstep(value){const t=clamp01(value);return t*t*t*(t*(t*6-15)+10);}
export function phase(t,start,end,ease=smootherstep){
  if(!(end>start))return t>=end?1:0;
  return ease(clamp01((t-start)/(end-start)));
}

/**
 * Paper does not arrive like a UI tween. A broad sheet barely overshoots,
 * while a narrow/light piece can flex farther before settling on its crease.
 * The bump is deterministic and returns exactly to 1 at the end.
 */
export function paperSettle(value,{overshoot=.025}={}){
  const t=clamp01(value),base=smootherstep(t);
  const bump=Math.max(0,Number(overshoot)||0)*Math.sin(Math.PI*t)*t*t*t;
  return base+bump;
}

export function rippleDelay(x,anchor,{range=92,spread=.12}={}){
  const px=Number.isFinite(x)?x:anchor;
  return Math.min(1,Math.abs(px-anchor)/Math.max(1,range))*spread;
}
export function ripplePhase(t,x,anchor,start,end,options){
  const delay=rippleDelay(x,anchor,options);
  return phase(t,start+delay,end+delay);
}
