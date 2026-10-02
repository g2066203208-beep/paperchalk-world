import {smoothstep} from './math.js';

/** City art direction uses the same continuous clock as the forest. */
export function cityLightProfile(time=.875){
  const clock=((time%1)+1)%1,rawSun=-Math.cos(clock*Math.PI*2);
  const sunUp=Math.max(rawSun,0),moonUp=Math.max(-rawSun,0);
  const day=smoothstep(-.16,.18,rawSun),night=smoothstep(-.16,.18,-rawSun);
  const twilight=1-smoothstep(.025,.34,Math.abs(rawSun));
  return {day,night,twilight,sunUp,moonUp,
    sunIntensity:day*(.45+sunUp*3.6+twilight*4.6),
    moonIntensity:night*(1.10+moonUp*.48),
    hemiIntensity:.78+day*.22,ambientIntensity:.26+day*.03,
    viewIntensity:1.14+day*.06,bounceIntensity:.28+day*.12,
    localLightFactor:1-day*.94,
    sunScattering:day*(.45+sunUp*.32+twilight*1.18),
    moonScattering:night*(.14+moonUp*.12),
    sunDensity:.020+twilight*.012,moonDensity:.009,
    sunWarm:clock<.5?0xff8bc5:0xff668f,
    moonColor:0xd7defa,moonScatterColor:0xb4bce0,
    exposure:1.05+day*.01,
  };
}
