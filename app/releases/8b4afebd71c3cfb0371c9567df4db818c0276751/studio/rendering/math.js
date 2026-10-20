// Paperchalk Demo v12.32 visual baseline. Extracted without changing shader or art parameters.
export function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
export function hash3(x,y,z){
  let h=(Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(z|0,2246822519))>>>0;
  h=Math.imul(h^(h>>>13),1274126177)>>>0;
  return ((h^(h>>>16))>>>0)/4294967295;
}
export function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
export function smoothstep(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}
