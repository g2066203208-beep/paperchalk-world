/** Pure, deterministic animation beats for a REAL 3D character-card dispenser.
 * Times are milliseconds from the start of a draw, independent of display FPS.
 * The first reveal is strictly face-down until the card leaves the physical slot.
 */
export const CARD_DRAW_MS=3800;
const clamp=v=>Math.max(0,Math.min(1,v));
export const smooth=t=>{const x=clamp(t);return x*x*(3-2*x)};
export const out=t=>1-(1-clamp(t))**3;
export const segment=(ms,start,end)=>clamp((ms-start)/(end-start));
const mix=(a,b,t)=>a+(b-a)*t;
export function evaluateCardSequence(timeMs){
 const ms=Math.max(0,Number.isFinite(timeMs)?timeMs:0);
 const reels=[1160,1380,1600].map((stop,i)=>{
  const u=out(segment(ms,0,stop));
  return -2*Math.PI*(4+i)*u;
 });
 const door=smooth(segment(ms,1580,1890))*(1-.10*smooth(segment(ms,2420,2820)));
 const shoot=out(segment(ms,1760,2430));
 const rise=smooth(segment(ms,1850,2760));
 const turn=smooth(segment(ms,2350,2990));
 const show=smooth(segment(ms,2850,3240));
 const pulse=Math.sin(Math.PI*segment(ms,2850,3330))**2;
 const showCard=ms>=1760;
 const hold=ms>=CARD_DRAW_MS;
 const settle=Math.sin((ms-2700)/210)*Math.exp(-Math.max(0,ms-2700)/480)*.06;
 return {
  ms:Math.min(ms,CARD_DRAW_MS),phase:ms<1160?'spin':ms<1600?'stopping':ms<1760?'chute':
   ms<2350?'eject':ms<2990?'flip':ms<3240?'reveal':'hold',
  reels,
  door,
  card:{
   visible:showCard,
   x:mix(0,1.04,rise),
   y:mix(1.16,2.70,rise)+settle,
   z:mix(1.62,3.64,shoot),
   scale:mix(.74,1.38,rise)*(1+show*.035),
   rotationY:Math.PI*(1-turn),
   // A real stiff card leaves the narrow slot nearly horizontal, then rises
   // upright before the final front/back turnover; no floating vertical pop-in.
   rotationX:-Math.PI*.47*(1-smooth(segment(ms,1950,2770))),
   roll:-.17*(1-shoot)+.06*Math.sin(Math.PI*shoot)*Math.exp(-shoot*2),
   facing:turn>.50,
   reveal:show
  },
  hit:Math.max(0,1-Math.abs(ms-1690)/160),
  flash:pulse,
  halo:show*.55+pulse*.45,
  subtitle:show,
  complete:hold
 };
}
