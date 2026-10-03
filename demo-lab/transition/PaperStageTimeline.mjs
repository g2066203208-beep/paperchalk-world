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
  const cityFold=paperSettle(phase(p,.02,.30),.018);
  const page=paperSettle(phase(p,.12,.50),.020);
  const bifold=paperSettle(phase(p,.24,.56),.032);
  const reveal=phase(p,.44,.68);
  const wall=paperSettle(phase(p,.46,.76),.028);
  const brace=paperSettle(phase(p,.54,.82),.042);
  const fixture=paperSettle(phase(p,.66,.90),.055);
  const light=phase(p,.84,.985);
  const life=phase(p,.965,1);
  let act='城市纸景收拢';
  if(p>=.105)act='街道主纸页翻开';
  if(p>=.44)act='街道断面打开，地下墙体立起';
  if(p>=.66)act='纸制设施展开';
  if(p>=.84)act='灯光逐盏唤醒';
  if(p>=.985)act='舞台完成';
  return {progress:p,cityFold,page,bifold,reveal,wall,brace,fixture,light,life,act};
}

export function lampWave(globalProgress,index,count){
  const n=Math.max(1,Number(count)||1);
  const centre=(n-1)/2;
  const distance=Math.abs(index-centre)/Math.max(1,centre);
  const delay=distance*.42;
  return phase(globalProgress,delay,Math.min(1,delay+.58));
}
