export const LAB_DURATION=1.50;

export const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));

export function easeInOutCubic(value){
  const t=clamp01(value);
  return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
}

export function easeOutBack(value,overshoot=1.12){
  const t=clamp01(value);
  const c1=Math.max(.01,Number(overshoot)||1.12);
  const c3=c1+1;
  return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);
}

export function phase(progress,start,end,ease=easeInOutCubic){
  if(!(end>start))return progress>=end?1:0;
  return ease(clamp01((progress-start)/(end-start)));
}

export function sampleGreetingCard(progress){
  const p=clamp01(progress);

  // One clear primary action: the city cover opens like a top-fold greeting card.
  const cover=phase(p,.08,.60);

  // The inner page becomes readable only after the cover has moved enough.
  const innerReveal=phase(p,.24,.66);

  // Pop-up layers rise in a simple sequence after the reveal begins.
  const backWall=phase(p,.34,.72);
  const columns=phase(p,.44,.79,value=>easeOutBack(value,.75));
  const props=phase(p,.55,.87,value=>easeOutBack(value,1.05));
  const lights=phase(p,.78,.97);
  const settle=phase(p,.90,1);

  let act='城市贺卡封面';
  if(p>=.08)act='封面整页翻开';
  if(p>=.34)act='地铁内页显现';
  if(p>=.44)act='立体站台弹起';
  if(p>=.55)act='设施接力展开';
  if(p>=.78)act='暖灯逐盏亮起';
  if(p>=.97)act='贺卡完全打开';

  return {progress:p,cover,innerReveal,backWall,columns,props,lights,settle,act};
}
