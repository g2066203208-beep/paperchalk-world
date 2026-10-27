// Pure presentation timeline for narrative event cues. No game-state writes,
// no dependence on rendering FPS and safe to skip under reduced-motion settings.
export const CUE_CLIPS=Object.freeze({
 paper_rattle:{ms:850,track:'paper',keys:[[0,0,0],[.22,5,-2],[.46,-4,1],[.72,2,0],[1,0,0]]},
 quiet_pause:{ms:1200,track:'stillness',keys:[[0,0,0],[1,0,0]]},
 customer_stop:{ms:680,track:'visitor',keys:[[0,-12,0],[.7,-2,0],[1,0,0]]},
 cup_touch:{ms:720,track:'cup',keys:[[0,16,-4],[.75,1,0],[1,0,0]]},
 door_bell:{ms:660,track:'bell',keys:[[0,-2,0],[.4,1,3],[.7,-1,-1],[1,0,0]]},
 exit_soft:{ms:790,track:'visitor',keys:[[0,0,0],[1,18,0]]},
 morning_wind:{ms:1350,track:'paper',keys:[[0,0,0],[.45,7,-2],[1,0,0]]},
 snow_pause:{ms:950,track:'stillness',keys:[[0,0,0],[1,0,0]]},
 snow_footsteps:{ms:520,track:'footstep',keys:[[0,0,0],[.5,6,0],[1,0,0]]}
});
function lerp(a,b,k){return a+(b-a)*k;}
export function evaluateCue(name,elapsed,reducedMotion=false){
 const clip=CUE_CLIPS[name];
 if(!clip)return null;
 const p=reducedMotion?1:Math.min(1,Math.max(0,elapsed/clip.ms));
 const k=clip.keys;
 let segment=k.length-2;
 for(let i=0;i<k.length-1;i++)if(p>=k[i][0]&&p<=k[i+1][0]){segment=i;break;}
 const l=k[segment],r=k[segment+1],f=r[0]===l[0]?0:(p-l[0])/(r[0]-l[0]);
 return {name,track:clip.track,progress:p,done:p>=1,offsetX:lerp(l[1],r[1],f),offsetY:lerp(l[2],r[2],f)};
}
export function createCuePlayer(){
 let token=null,started=0;
 return {sample(story,now,reducedMotion=false){
  const next=story?.lastCue||null;
  const key=[next,story?.active,story?.history?.length,story?.location,story?.salesSeen].join('|');
  if(key!==token){token=key;started=now;}
  return next?evaluateCue(next,Math.max(0,now-started),reducedMotion):null;
 },reset(){token=null;started=0;}};
}
