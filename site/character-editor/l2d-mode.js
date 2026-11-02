/* Embed L2D rig and controls in the EXISTING per-character PSD painter. */
(()=>{
'use strict';
const ed=window.characterEditor;if(!ed)return;
const S=ed.S,$=id=>document.getElementById(id);
const defaults=()=>({amplitude:1.4,period:3.6,softness:1.25});
let currentId='default',rig=null,timer=0,paused=false,bones=false;
const key=()=> 'paperchalk-l2d:'+currentId;
function loadMotion(){
 try{const v=JSON.parse(localStorage.getItem(key())||'null');
 if(v?.front&&v?.back)return v;}catch(e){}
 return {front:defaults(),back:defaults()};
}
let motion=loadMotion();
function saveMotion(){try{localStorage.setItem(key(),JSON.stringify(motion));}catch(e){}}
const section=document.createElement('section');section.id='dev-l2d-preview-controls';
section.innerHTML=[
 '<h3>角色动态参数 · 女主角直接使用游戏原版 V4</h3>',
 '<canvas id="l2d-live-canvas" width="1024" height="1024" aria-label="人物动态预览" style="width:100%;aspect-ratio:1;max-height:270px;border:1px solid #3e5065;border-radius:8px;background:#1b2533"></canvas>',
 '<div class="row tight" style="margin-top:7px"><button id="l2d-play" type="button">暂停</button><button id="l2d-bones" type="button">显示骨骼</button></div>',
 '<label class="mlabel">呼吸幅度 <output id="l2d-strength-value"></output></label><input id="l2d-strength" type="range" min="0" max="400" step="5">',
 '<label class="mlabel">呼吸周期 <output id="l2d-period-value"></output></label><input id="l2d-period" type="range" min="2" max="12" step=".1">',
 '<label class="mlabel">软硬变形 <output id="l2d-softness-value"></output></label><input id="l2d-softness" type="range" min="0" max="240" step="5">',
 '<p class="tip">女主角预览唯一以游戏实际 V4 动画为准；不再渲染另一套假骨骼网格。呼吸参数直接保存在游戏人物档案中。</p>'
].join('');
document.querySelector('aside.right')?.prepend(section);
function sync(){
 const q=motion[S.side]||defaults();
 $('l2d-strength').value=Math.round(q.amplitude*100);
 $('l2d-period').value=q.period;$('l2d-softness').value=Math.round(q.softness*100);
 $('l2d-strength-value').textContent=Math.round(q.amplitude*100)+'%';
 $('l2d-period-value').textContent=q.period.toFixed(1)+' 秒';
 $('l2d-softness-value').textContent=Math.round(q.softness*100)+'%';
}
function schedule(){
 const actualV4=!!window.PaperchalkStudio?.isV4;
 // Never show the unrelated procedural rig as the heroine game model.
 // The central editor canvas now plays the real hosted WebP animation.
 $('l2d-live-canvas').hidden=actualV4;
 $('l2d-bones').hidden=actualV4;
 if(actualV4){rig?.stop();return;}
 if(!S.ready||S.busy||!window.PaperchalkL2DRig)return;
 clearTimeout(timer);timer=setTimeout(async()=>{
  if(!S.ready||S.busy)return;
  try{
   const q=motion[S.side]||defaults();
   if(!rig){
    rig=new PaperchalkL2DRig(ed.composite(S.side),$('l2d-live-canvas'),{...q,cleanup:false,featurePreset:currentId==='protagonist'&&S.side==='front'?'heroine-front':'generic'});
    await rig.ready;rig.start();
   }
   const arr=S.layers[S.side];
   const genuine=arr.filter(p=>p.sourcePart);
   const sources=genuine.length
    ?arr.filter(p=>p.sourcePart||(!/^V4 ·/.test(p.name)&&!/^原始角色合成参考|^原始素材|^原网站合成参考/.test(p.name)))
    :arr.filter(p=>!/^V4 ·/.test(p.name));
   await rig.setLayers(sources.map(p=>({
    canvas:p.canvas,name:p.name,x:p.x,y:p.y,visible:p.visible,opacity:p.opacity
   })),[1024,1024]);
   rig.setAmplitude(q.amplitude);rig.setPeriod(q.period);
   rig.featurePreset=currentId==='protagonist'&&S.side==='front'?'heroine-front':'generic';
   rig.blinkEnabled=rig.featurePreset==='heroine-front';
   rig.setSoftness(q.softness);rig.setBones(bones);rig.setPaused(paused);
   if(paused){rig.stop();rig.render(performance.now(),true)}else rig.start();
  }catch(e){$('status').textContent='L2D 动态预览错误：'+e.message;}
 },125);
}
for(const [id,field,scale] of [
 ['l2d-strength','amplitude',100],['l2d-period','period',1],['l2d-softness','softness',100]
]){
 $(id).addEventListener('input',e=>{
  motion[S.side][field]=Number(e.target.value)/scale;
  sync();saveMotion();
  if(rig){const q=motion[S.side];rig.setAmplitude(q.amplitude);rig.setPeriod(q.period);rig.setSoftness(q.softness);}
  schedule();
 });
}
function setMotionPaused(value){
 paused=!!value;
 $('l2d-play').textContent=paused?'播放':'暂停';
 rig?.setPaused(paused);
 if(rig){
  if(paused){rig.stop();rig.render(performance.now(),true)}
  else rig.start();
 }
 window.dispatchEvent(new CustomEvent('paperchalk:rig-play-changed',{detail:{paused}}));
}
$('l2d-play').onclick=()=>setMotionPaused(!paused);
ed.setMotionPaused=setMotionPaused;
$('l2d-bones').onclick=()=>{bones=!bones;$('l2d-bones').textContent=bones?'隐藏骨骼':'显示骨骼';rig?.setBones(bones)};
function hook(name,after){
 const orig=window[name];if(typeof orig!=='function')return;
 window[name]=function(...args){
  const result=orig.apply(this,args);after(args,result);return result;
 };
}
hook('render',()=>schedule());
hook('setSide',()=>{sync();schedule()});
hook('autosave',()=>saveMotion());
hook('save',()=>saveMotion());
hook('sendParent',args=>{
 const m=args?.[0];
 if(m?.type==='PAPERCHALK_EDITOR_APPLY'||m?.type==='PAPERCHALK_EDITOR_PREVIEW'){
  window.parent?.postMessage({
   type:'PAPERCHALK_EDITOR_L2D_PROFILE',id:m.id,
   side:m.side||S.side,profile:structuredClone(motion[m.side||S.side]||defaults()),
   profiles:structuredClone(motion)
  },location.origin);
 }
});
const oldSwitch=window.switchCharacter;
if(typeof oldSwitch==='function'){
 window.switchCharacter=async function(target,face){
  currentId=target?.id||'default';motion=loadMotion();
  const r=await oldSwitch.call(this,target,face);sync();schedule();return r;
 };
}
window.addEventListener('paperchalk:studio-mode-changed',schedule);
window.addEventListener('paperchalk:studio-ready-to-edit',schedule);
window.addEventListener('paperchalk:studio-source-parts-loaded',schedule);
window.addEventListener('paperchalk:studio-play-changed',schedule);
window.addEventListener('paperchalk:art-dirty',schedule);
window.addEventListener('paperchalk:studio-character-loaded',event=>{
 currentId=event.detail?.id||'default';
 motion=loadMotion();
 sync();schedule();
});
sync();schedule();
window.characterEditor.motion=()=>structuredClone(motion);
window.characterEditor.l2dRig=()=>rig;
})();