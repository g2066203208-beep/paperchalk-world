import {smoothstep} from './math.js';

/** City art direction uses the same continuous clock as the forest. */
export function cityLightProfile(time=.875){
  const clock=((time%1)+1)%1,rawSun=-Math.cos(clock*Math.PI*2);
  const sunUp=Math.max(rawSun,0),moonUp=Math.max(-rawSun,0);
  const day=smoothstep(-.16,.18,rawSun),night=smoothstep(-.16,.18,-rawSun);
  const twilight=1-smoothstep(.025,.34,Math.abs(rawSun));
  return {day,night,twilight,sunUp,moonUp,
    sunIntensity:day*(.45+sunUp*3.6+twilight*4.6),
    moonIntensity:night*(.60+moonUp*1.15),
    hemiIntensity:.38+day*.62,ambientIntensity:.14+day*.15,
    viewIntensity:1.02+day*.12,bounceIntensity:.18+day*.22,
    localLightFactor:1-day*.94,
    sunScattering:day*(.45+sunUp*.32+twilight*1.18),
    moonScattering:night*(1.15+moonUp*.70),
    sunDensity:.027+twilight*.022,moonDensity:.033,
    sunWarm:clock<.5?0xff8bc5:0xff668f,
    moonColor:0x8bb4ff,moonScatterColor:0x709cf5,
    exposure:.98+day*.08,
  };
}
