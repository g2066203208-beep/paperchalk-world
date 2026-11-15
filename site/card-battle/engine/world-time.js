/* Universal world clock, shared by every 3D combat environment.
 * Clock state is independent from scene transitions and combat resets.
 * All scenes sample the SAME solar direction, night factor and sky response.
 * Pure deterministic functions for testing; no DOM, GPU or storage.
 */
(function(root){'use strict';
const DAY=1440,TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function parse(value,fallback=720){
 if(typeof value==='number'&&Number.isFinite(value))return ((value%DAY)+DAY)%DAY;
 if(typeof value==='string'&&/^\d{1,2}:\d{2}$/.test(value)){
  const [h,m]=value.split(':').map(Number);
  if(h<24&&m<60)return h*60+m;
 }
 return fallback;
}
function sample(minutes){
 const m=parse(minutes),hours=m/60;
 // 06:00 is the eastern horizon, 12:00 the zenith and 18:00 sunset.
 const theta=TAU*(hours-6)/24;
 const elevation=Math.sin(theta);
 const daylight=smooth(-.14,.23,elevation);
 const night=1-daylight;
 const twilight=(1-smooth(.1,.57,Math.abs(elevation)))*daylight;
 const east=Math.cos(theta);
 const moonTheta=theta+Math.PI;
 const sun=[east*.86,Math.max(.13,elevation),.27];
 const moon=[Math.cos(moonTheta)*.62,Math.max(.28,-elevation),-.36];
 const direction=sun.map((v,i)=>v*daylight+moon[i]*night);
 const length=Math.hypot(...direction)||1;
 const lightDirection=direction.map(x=>x/length);
 const hour=Math.floor(m/60),minute=Math.floor(m%60);
 const timeText=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
 const phase=daylight>.82?'day':daylight<.16?'night':east>0?'dawn':'dusk';
 const label={day:'白昼',night:'夜晚',dawn:'黎明',dusk:'黄昏'}[phase];
 return Object.freeze({minutes:m,timeText,hours,phase,label,daylight,night,twilight,
  solarElevation:elevation,lightDirection:Object.freeze(lightDirection),
  nightFactor:smooth(.18,.87,night),
  cloudFactor:Math.max(.05,daylight*.92+.08),
  skyLevel:.18+.82*daylight});
}
function create(options={}){
 let minutes=parse(options.startMinutes??720);
 let minutesPerSecond=Math.max(0,Math.min(240,Number(options.minutesPerSecond??1)||0));
 let paused=!!options.paused;
 let elapsedSeconds=0;
 function tick(dt){
  if(!paused&&Number.isFinite(dt)&&dt>0){
   const elapsed=clamp(dt,0,2);
   minutes=(minutes+elapsed*minutesPerSecond)%DAY;
   elapsedSeconds+=elapsed;
  }
  return snapshot();
 }
 function setTime(time){minutes=parse(time,minutes);return snapshot();}
 function setRate(value){
  if(!Number.isFinite(Number(value)))throw Error('Invalid time rate');
  minutesPerSecond=clamp(Number(value),0,240);return snapshot();
 }
 function setPaused(value){paused=!!value;return snapshot();}
 function snapshot(){
  return Object.freeze({...sample(minutes),minutesPerSecond,paused,elapsedSeconds});
 }
 return Object.freeze({tick,setTime,setRate,setPaused,snapshot,
  get minutes(){return minutes;},get paused(){return paused;}});
}
root.PaperchalkWorldTime=Object.freeze({version:'1.0.0',DAY,parse,sample,create});
})(window);
