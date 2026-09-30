(function(){
'use strict';
const panel=document.getElementById('debugPanel');if(!panel)return;
const time=panel.querySelector('[data-world-time]');
const scale=panel.querySelector('[data-world-timescale]');
const sync=()=>{
  const s=window.PaperchalkTimeDebug?.get?.();if(!s)return;
  if(time&&document.activeElement!==time)time.value=String(Math.round(s.minutes||0));
  if(scale&&document.activeElement!==scale)scale.value=String(Number(s.scale)||0);
};
time?.addEventListener('input',()=>{window.PaperchalkTimeDebug?.set?.(Number(time.value));sync()});
scale?.addEventListener('input',()=>{window.PaperchalkTimeDebug?.scale?.(Number(scale.value));sync()});
panel.querySelectorAll('[data-time-preset]').forEach(b=>b.addEventListener('click',()=>{window.PaperchalkTimeDebug?.set?.(Number(b.dataset.timePreset));sync()}));
setInterval(()=>{if(panel.classList.contains('is-open'))sync()},500);
window.PaperchalkWorldDebug=Object.freeze({sync});
sync();
})();