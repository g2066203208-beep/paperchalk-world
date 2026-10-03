export const LAB_DURATION=1.45;

export const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
export const easeOut=value=>{
  const t=clamp01(value),u=1-t;
  return 1-u*u*u;
};
export const easeInOut=value=>{
  const t=clamp01(value);
  return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
};
export function phase(p,a,b,ease=easeInOut){
  if(!(b>a))return p>=b?1:0;
  return ease(clamp01((p-a)/(b-a)));
}
export function overshoot(value,amount=.07){
  const t=clamp01(value);
  const base=easeOut(t);
  return base+Math.sin(Math.PI*t)*amount*(1-t*.35);
}
export function stagger(index,count,amount=.16){
  if(count<=1)return 0;
  return index/(count-1)*amount;
}

export function samplePaperWorld(progress){
  const p=clamp01(progress);
  const cityRelease=phase(p,.06,.38);
  const streetSweep=phase(p,.15,.52);
  const shadowPass=phase(p,.24,.56);
  const destinationRise=phase(p,.34,.72);
  const details=phase(p,.54,.84);
  const lights=phase(p,.76,.97,easeOut);
  const settle=phase(p,.88,1);
  let act='原场景保持';
  if(p>=.06)act='城市纸景散开';
  if(p>=.24)act='纸影掠过舞台';
  if(p>=.34)act='新场景从景深站起';
  if(p>=.54)act='细节接力出现';
  if(p>=.76)act='灯光唤醒';
  if(p>=.97)act='转场完成';
  return {progress:p,cityRelease,streetSweep,shadowPass,destinationRise,details,lights,settle,act};
}
