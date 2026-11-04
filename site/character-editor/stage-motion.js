/* Main authoring viewport: live animation at full edit resolution.
 * The small inspector uses the same rig; nothing is rendered from a separate mock model.
 * Painting temporarily reveals the unwarped original-coordinate layers to avoid offsets. */
(()=>{
'use strict';
const ed=window.characterEditor;
if(!ed)return;
const $=id=>document.getElementById(id);
const stage=$('stage'),S=ed.S;
const state={enabled:true,playing:true,editing:false,expanded:false};
const play=$('main-play'),preview=$('main-preview'),expand=$('main-expand'),badge=$('main-motion-status');
const activeV4=()=>!!window.PaperchalkStudio?.useV4?.();
const clip=()=>window.PaperchalkStudio;
const nativePSD=()=>!!clip()?.hasNativePSD?.();
const bakedV4=()=>activeV4()&&!nativePSD();
function animationCanvas(){
 const rig=ed.l2dRig?.();
 return rig?.source&&rig.canvas.width&&rig.canvas.height?rig.canvas:null;
}
function frame(){
 // Only undivided legacy clips need a baked fallback; layered L2D uses the live rig.
 if(!state.enabled||state.editing||S.only||bakedV4())return null;
 return animationCanvas();
}
function paintStageStatus(){
 if(!badge)return;
 const independent=!!window.PaperchalkPartRigStudio?.state?.active;
 const mode=independent?'新版独立骨骼':
  nativePSD()?'独立图层动画':bakedV4()?'素材动画预览':
  animationCanvas()?'分层动画':'等待动画加载';
 badge.textContent=state.editing?'精修中 · 原始素材':!state.enabled?'精修中 · 当前动态姿势':(state.playing?'● 实时 · ':'❚❚ 暂停 · ')+mode;
 badge.setAttribute('aria-live','off');
}
function sync(){
 play.textContent=state.playing?'❚❚ 暂停':'▶ 播放';
 play.setAttribute('aria-pressed',String(!state.playing));
 preview.textContent=state.enabled?'✎ 当前姿势精修':'▶ 返回动态预览';
 preview.setAttribute('aria-pressed',String(state.enabled));
 expand.textContent=state.expanded?'⤓ 退出大画布':'⛶ 放大画布';
 expand.setAttribute('aria-pressed',String(state.expanded));
 paintStageStatus();
}
async function setPlaying(value){
 state.playing=!!value;
 ed.setMotionPaused?.(!state.playing);
 // The studio owns V4 frame decoding; a single control drives both renderers.
 if(activeV4())await clip().setPlaying?.(state.playing);
 if(window.PaperchalkPartRigStudio?.state?.active)
  window.PaperchalkPartRigStudio.setPlaying?.(state.playing);
 sync();ed.render();
}
async function setPreview(enabled){
 const next=!!enabled;
 if(next===state.enabled)return;
 state.enabled=next;
 if(!next){
  state.resumeOnPreview=state.playing;
  await setPlaying(false);
 }else if(state.resumeOnPreview){
  state.resumeOnPreview=false;
  await setPlaying(true);
 }
 sync();ed.render();
}
function setExpanded(expanded){
 state.expanded=!!expanded;
 document.body.classList.toggle('stage-expanded',state.expanded);
 sync();
 // The fixed-position viewport temporarily leaves grid/flex flow.
 // Defer fitting until layout has returned a real, nonzero width.
 const settle=(attempt=0)=>{
  const rect=stage.getBoundingClientRect();
  if((rect.width<160||rect.height<120)&&attempt<12){
   requestAnimationFrame(()=>settle(attempt+1));return;
  }
  const d=Math.min(devicePixelRatio||1,2),canvas=$('view');
  canvas.width=Math.max(1,Math.round(rect.width*d));
  canvas.height=Math.max(1,Math.round(rect.height*d));
  $('fit')?.click();
 };
 requestAnimationFrame(()=>requestAnimationFrame(()=>settle()));
}
play?.addEventListener('click',()=>{
 if(!state.enabled){state.enabled=true;state.resumeOnPreview=false;}
 setPlaying(!state.playing).catch(e=>console.error('Main L2D playback',e));
});
preview?.addEventListener('click',()=>setPreview(!state.enabled).catch(e=>console.error('Main L2D preview',e)));
expand?.addEventListener('click',()=>setExpanded(!state.expanded));
stage.addEventListener('pointerdown',e=>{
 if(e.target!==$('view')||e.button===1||S.space||e.altKey||S.tool==='pan')return;
 if(!['brush','eraser','restore','picker','fill','move','rect','lasso'].includes(S.tool))return;
 const liveRig=!!window.PaperchalkPartRigStudio?.state?.active;
 // Never swap the live actor for a flat texture when the first pixel is
 // touched. Freeze the exact visible pose; editor maps brush through mesh UV.
 state.editing=!liveRig;
 state.resumeAfterEdit=!!(state.enabled&&state.playing);
 if(state.resumeAfterEdit)setPlaying(false).catch(console.error);
 paintStageStatus();ed.render();
},true);
function release(){
 if(!state.editing&&!state.resumeAfterEdit)return;
 requestAnimationFrame(()=>{
  state.editing=false;
  const resume=state.resumeAfterEdit;
  state.resumeAfterEdit=false;
  paintStageStatus();ed.render();
  if(resume&&state.enabled)setPlaying(true).catch(e=>console.error('resume L2D',e));
 });
}
stage.addEventListener('pointerup',release);
stage.addEventListener('pointercancel',release);
window.addEventListener('blur',release);
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&state.expanded){setExpanded(false);return;}
 if(e.ctrlKey||e.metaKey||e.altKey||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
 if(e.key.toLowerCase()==='p'){e.preventDefault();setPlaying(!state.playing).catch(console.error);}
});
window.addEventListener('paperchalk:studio-character-loaded',()=>{
 state.editing=false;paintStageStatus();
});
window.addEventListener('paperchalk:studio-play-changed',e=>{
 // Keep the headline play control in sync with the V4 frame controller.
 if(activeV4()&&state.enabled){state.playing=!!e.detail?.playing;sync();}
});
window.addEventListener('paperchalk:rig-play-changed',e=>{
 if(!activeV4()&&state.enabled){state.playing=!e.detail?.paused;sync();}
});
let last=0;
function tick(now){
 // V4 refreshes via its own decoded frame loop; only mesh preview needs this copy.
 if(now-last>=40&&state.enabled&&!state.editing&&state.playing&&!document.hidden&&S.ready&&!S.only&&!bakedV4()&&animationCanvas()){
  last=now;ed.render();
 }
 if(now-last>=400){paintStageStatus();}
 requestAnimationFrame(tick);
}
window.PaperchalkStageMotion={state,frame,setPlaying,setPreview,setExpanded};
sync();requestAnimationFrame(tick);
})();
