/* Shared floor -> ALL actually displayed L2D actors.
 * Game/DEV glue deliberately lives OUTSIDE the large scene HTML: replacing
 * UI scenes must not silently disconnect the floor from ArtMesh and V4 rigs.
 * The original invisible <img> is only a position source; parent L2D roots
 * own everything that renders (live canvas, PSD parts, WebP/V4 and overlays).
 */
(()=>{
'use strict';
const view=document.getElementById('view');
const rig=document.getElementById('dev-rig');
const ground=document.getElementById('dev-ground');
if(!view||!rig||!ground)return;
const actorRoots=()=>[...document.querySelectorAll('[data-l2d-actor]')];
const origin={y:77,z:-215};
const number=(name,defaultValue)=>{
  const raw=rig.style.getPropertyValue(name).trim();
  const n=parseFloat(raw);
  return Number.isFinite(n)?n:defaultValue;
};
let last={y:null,z:null,height:null,dev:null,count:null};
function sync(){
  const y=number('--dev-floor-y',origin.y);
  const z=number('--dev-depth-ground',origin.z);
  const height=Math.max(1,view.clientHeight);
  const inDev=view.classList.contains('dev-mode');
  const dy=(y-origin.y)*height/100;
  const dz=inDev?z-origin.z:0;
  const roots=actorRoots();
  const translation='0px '+dy.toFixed(3)+'px '+dz.toFixed(3)+'px';
  for(const root of roots){
    if(root.style.translate!==translation)root.style.translate=translation;
    root.dataset.groundAttached='true';
  }
  // Deterministic public diagnostics for automated visual tests / other
  // character studios. Never reads/writes or resets saved character poses.
  last={y,z,height,dev:inDev,count:roots.length,dy,dz,translation};
  rig.dataset.l2dGroundY=String(y);
  rig.dataset.l2dGroundZ=String(z);
  rig.dataset.l2dGroundActors=String(roots.length);
  return last;
}
// The original DEV implementation writes floor position to CSS custom
// properties. Observe those authoritative writes instead of keeping a
// second, out-of-sync copy of editorConfig or overriding its save logic.
new MutationObserver(sync).observe(rig,{attributes:true,attributeFilter:['style']});
new MutationObserver(sync).observe(view,{attributes:true,attributeFilter:['class']});
new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});
window.addEventListener('resize',sync,{passive:true});
for(const id of ['dev-ground-y','dev-z','dev-reset','dev-save','dev-layer']){
  const el=document.getElementById(id);
  if(el){
    el.addEventListener('input',sync);
    el.addEventListener('change',sync);
    if(id==='dev-reset')el.addEventListener('click',()=>queueMicrotask(sync));
  }
}
window.PaperWorldL2DGround=Object.freeze({sync,state:()=>({...last})});
sync();
})();
