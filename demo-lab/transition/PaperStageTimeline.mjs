export const LAB_DURATION=1.65;

export const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
export const smoother=value=>{
  const t=clamp01(value);
  return t*t*t*(t*(t*6-15)+10);
};

export function phase(progress,start,end,ease=smoother){
  if(!(end>start))return progress>=end?1:0;
  return ease(clamp01((progress-start)/(end-start)));
}

export function paperSettle(value,amount=.045){
  const t=clamp01(value);
  const base=smoother(t);
  // A single restrained overshoot near the end: broad stock moves less,
  // small fixtures may use a slightly larger amount.
  return base+Math.max(0,amount)*Math.sin(Math.PI*t)*t*t*t;
}

export function samplePaperStage(progress){
  const p=clamp01(progress);
  const cityFold=paperSettle(phase(p,.015,.20),.018);
  const page=paperSettle(phase(p,.105,.505),.020);
  const bifold=paperSettle(phase(p,.235,.595),.032);
  const reveal=phase(p,.18,.42);
  const wall=paperSettle(phase(p,.33,.665),.028);
  const brace=paperSettle(phase(p,.41,.71),.042);
  const fixture=paperSettle(phase(p,.535,.805),.055);
  const light=phase(p,.805,.965);
  const life=phase(p,.952,1);
  let act='城市纸景收拢';
  if(p>=.105)act='街道主纸页翻开';
  if(p>=.33)act='地下墙体被折痕拉起';
  if(p>=.535)act='纸制设施展开';
  if(p>=.805)act='灯光逐盏唤醒';
  if(p>=.965)act='舞台完成';
  return {progress:p,cityFold,page,bifold,reveal,wall,brace,fixture,light,life,act};
}

export function lampWave(globalProgress,index,count){
  const n=Math.max(1,Number(count)||1);
  const centre=(n-1)/2;
  const distance=Math.abs(index-centre)/Math.max(1,centre);
  const delay=distance*.42;
  return phase(globalProgress,delay,Math.min(1,delay+.58));
}
