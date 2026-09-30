(function(){
'use strict';
const panel=document.getElementById('debugPanel');if(!panel)return;
const one=s=>panel.querySelector(s),all=s=>[...panel.querySelectorAll(s)];
let resumeScale=1;
const labels={gtao:'GTAO',bloom:'Bloom',clouds:'云层',taa:'TAA/TAAU',water:'水面SSR',coloredLighting:'彩色光'};
function time(){return window.PaperchalkTimeDebug?.get?.()||{minutes:0,scale:0,clock:'--:--',phase:'?'}}
function photon(){return window.Paperchalk3D?.stats?.photon||{}}
function enabled(key,p=photon()){
  if(key==='clouds')return p.volumetricClouds!==false;
  if(key==='water')return p.waterEnabled!==false&&p.water?.enabled!==false;
  if(key==='coloredLighting')return p.coloredLightingEnabled!==false;
  return p[key]!==false;
}
function sync(){
  const t=time(),p=photon();
  const ti=one('[data-world-time]'),si=one('[data-world-timescale]');
  if(ti&&document.activeElement!==ti)ti.value=String(Math.round(t.minutes||0));
  if(si&&document.activeElement!==si)si.value=String(Number(t.scale)||0);
  if(t.scale>0)resumeScale=t.scale;
  const pause=one('[data-debug-action="timepause"]');
  if(pause)pause.textContent=t.scale>0?'时间：×'+Number(t.scale).toFixed(t.scale%1?2:0):'时间：暂停';
  const pbtn=one('[data-debug-action="photon"]');
  if(pbtn)pbtn.textContent='Photon总开关：'+(p.enabled===false?'关':'开');
  const profile=one('[data-debug-action="photonprofile"]');
  if(profile)profile.textContent='Photon：'+String(p.profile||'balanced').replace(/^./,m=>m.toUpperCase());
  const aw=one('[data-debug-action="autoweather"]');
  if(aw)aw.textContent='天气：'+(p.weather?.autoWeather===false?'手动':'自动');
  for(const b of all('[data-photon-toggle]')){
    const key=b.dataset.photonToggle;b.textContent=(labels[key]||key)+'：'+(enabled(key,p)?'开':'关');
  }
  const status=document.getElementById('debugStatus');
  if(status)status.title='世界时间 '+t.clock+' / '+t.phase+' / ×'+t.scale+' · Photon '+(p.profile||'balanced')+' · Weather '+Number(p.weather?.weather||0).toFixed(2);
}
function setTime(v){const r=window.PaperchalkTimeDebug?.set?.(Number(v));sync();return r}
function setScale(v){const r=window.PaperchalkTimeDebug?.scale?.(Number(v));sync();return r}
one('[data-world-time]')?.addEventListener('input',e=>setTime(e.currentTarget.value));
one('[data-world-timescale]')?.addEventListener('input',e=>setScale(e.currentTarget.value));
for(const b of all('[data-time-preset]'))b.addEventListener('click',()=>setTime(b.dataset.timePreset));
one('[data-debug-action="timepause"]')?.addEventListener('click',()=>{
  const t=time();if(t.scale>0){resumeScale=t.scale;setScale(0)}else setScale(resumeScale||1);
});
one('[data-debug-action="autoweather"]')?.addEventListener('click',()=>{
  const p=photon(),next=p.weather?.autoWeather===false;
  window.Paperchalk3D?.configurePhoton?.({weatherOptions:{autoWeather:next}});sync();
});
for(const b of all('[data-photon-toggle]'))b.addEventListener('click',()=>{
  const key=b.dataset.photonToggle,next=!enabled(key);
  const patch=key==='taa'?{taa:next,taau:next}:{[key]:next};
  window.Paperchalk3D?.configurePhoton?.(patch);sync();
});
panel.addEventListener('input',()=>queueMicrotask(sync));
panel.addEventListener('click',()=>setTimeout(sync,0));
setInterval(()=>{if(panel.classList.contains('is-open'))sync()},400);
window.PaperchalkRenderDebug=Object.freeze({sync,setTime,setScale,time,photon});
sync();
})();