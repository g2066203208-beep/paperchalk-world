/* V27 opt-in real 30fps game frame inspector + local original-video comparison.
   Requires directorQA=1&frameInspector=1; no video is shipped with this game. */
(function(){
 'use strict';
 const params=new URLSearchParams(location.search);
 if(params.get('directorQA')!=='1'||params.get('frameInspector')!=='1')return;
 function mount(){
  const director=window.PaperchalkBattleDirector;
  const app=window.PaperWorldGameRingArena;
  if(!director||!app?.qaFrame){requestAnimationFrame(mount);return}
  const style=document.createElement('style');
  style.textContent=[
   '#ring-frame-inspector{position:fixed;z-index:99999;top:12px;right:12px;',
   'width:min(342px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;',
   'padding:12px;background:#111b26f5;color:#f4f0e5;border:1px solid #798ba1;',
   'border-radius:10px;box-shadow:0 10px 25px #000c;',
   'font:12px/1.45 system-ui,sans-serif;box-sizing:border-box}',
   '#ring-frame-inspector *{box-sizing:border-box}',
   '#ring-frame-inspector button{padding:5px 7px;flex:1;background:#354a58;',
   'color:white;border:1px solid #71899b;border-radius:5px;cursor:pointer}',
   '#ring-frame-inspector .row{display:flex;gap:5px;align-items:center;margin:7px 0}',
   '#ring-frame-inspector input[type=range]{width:100%;accent-color:#e1b86f}',
   '#ring-frame-inspector input[type=file]{width:100%;font-size:10px}',
   '#ring-frame-inspector video{width:100%;height:155px;object-fit:contain;background:black}',
   '#ring-frame-inspector p{margin:6px 0;color:#ddd0b1}',
   '#ring-frame-inspector .numbers{font-variant-numeric:tabular-nums;font-family:monospace}',
   '@media(max-width:550px){#ring-frame-inspector{top:auto;bottom:5px;right:5px;',
   'max-height:36dvh;width:calc(100vw - 10px)}}'
  ].join('');
  document.head.appendChild(style);
  const box=document.createElement('aside');
  box.id='ring-frame-inspector';box.setAttribute('aria-label','30fps战斗逐帧对照');
  box.innerHTML=
   '<b>战斗导演｜30 FPS 逐帧工作台</b>'+
   '<p>左侧是真实游戏。原作视频未保存，可在下方选取本地MP4对照。</p>'+
   '<div class="row">目标 <select id="fi-target">'+
   '<option value="enemy-2">敌人2</option><option value="enemy-1">敌人1</option>'+
   '<option value="enemy-3">敌人3</option><option value="enemy-4">敌人4</option></select></div>'+
   '<div class="numbers" id="fi-time"></div>'+
   '<input id="fi-seek" type="range" min="0" max="'+director.FRAME_COUNT+'" step="1" value="0">'+
   '<div class="row"><button id="fi-prev">上一帧</button><button id="fi-play">播放</button>'+
   '<button id="fi-next">下一帧</button></div>'+
   '<p class="numbers" id="fi-event"></p><hr>'+
   '<b>原视频｜699帧参考（需载入原片）</b>'+
   '<p>23.3秒 / 30fps。不会上传文件。</p>'+
   '<input id="fi-file" type="file" accept="video/*">'+
   '<video id="fi-video" playsinline muted preload="metadata"></video>'+
   '<div class="row"><button id="fi-rprev">原片前一帧</button>'+
   '<span id="fi-rtime" class="numbers"></span><button id="fi-rnext">原片后一帧</button></div>'+
   '<input id="fi-rseek" type="range" min="0" max="698" step="1" value="0">'+
   '<p id="fi-revent"></p>'+
   '<p>←/→ 游戏逐帧 · Shift+←/→ 原片逐帧 · 空格播放</p>';
  document.body.appendChild(box);
  const $=id=>box.querySelector('#'+id);
  let g=0,ref=0,url=null,playing=false,raf=0,last=0,acc=0;
  function gameFrame(i){
   g=Math.max(0,Math.min(director.FRAME_COUNT,i));$('fi-seek').value=g;
   const time=g*director.FRAME_MS;
   const state=director.sampleFrame(director.createAttack($('fi-target').value,0),g);
   app.qaFrame($('fi-target').value,time);
   $('fi-time').textContent='游戏帧 '+g+'/'+director.FRAME_COUNT+' · '+time.toFixed(1)+'ms';
   $('fi-event').textContent=state.stage+' · 进攻者 '+Math.round(100*state.heroProgress)+
    '% · 受击者 '+Math.round(100*state.victimProgress)+
    '% · 镜头 '+Math.round(100*state.zoom)+'%'+(state.hit?' · 已命中':'');
  }
  const markers=[{a:79,b:128,id:'A'},{a:178,b:228,id:'B'},
                 {a:315,b:368,id:'C'},{a:416,b:470,id:'D'}];
  function referenceFrame(i){
   ref=Math.max(0,Math.min(698,i));$('fi-rseek').value=ref;
   $('fi-rtime').textContent=String(ref)+'/698';
   const marker=markers.find(m=>ref>=m.a&&ref<=m.b);
   $('fi-revent').textContent=(marker?'片段'+marker.id+'：旧记录参考区间':'暂无已记录动作标注')+
    (url?' · 当前可查看原片':' · 原视频尚未载入，不能冒充逐帧观察');
   const video=$('fi-video');
   if(url&&video.readyState>=1){
    video.currentTime=Math.min(ref/30,Math.max(0,video.duration-.002));
   }
  }
  function stop(){playing=false;cancelAnimationFrame(raf);raf=0;$('fi-play').textContent='播放'}
  function tick(t){
   if(!playing)return;
   acc+=Math.min(100,t-last);last=t;
   while(acc>=director.FRAME_MS&&g<director.FRAME_COUNT){
    acc-=director.FRAME_MS;gameFrame(g+1)
   }
   if(g===director.FRAME_COUNT){stop();return}
   raf=requestAnimationFrame(tick);
  }
  function toggle(){
   if(playing){stop();return}
   if(g===director.FRAME_COUNT)gameFrame(0);
   playing=true;acc=0;last=performance.now();
   $('fi-play').textContent='暂停';raf=requestAnimationFrame(tick);
  }
  $('fi-prev').addEventListener('click',()=>{stop();gameFrame(g-1)});
  $('fi-next').addEventListener('click',()=>{stop();gameFrame(g+1)});
  $('fi-play').addEventListener('click',toggle);
  $('fi-seek').addEventListener('input',()=>{stop();gameFrame(Number($('fi-seek').value))});
  $('fi-target').addEventListener('change',()=>{stop();gameFrame(g)});
  $('fi-rprev').addEventListener('click',()=>referenceFrame(ref-1));
  $('fi-rnext').addEventListener('click',()=>referenceFrame(ref+1));
  $('fi-rseek').addEventListener('input',()=>referenceFrame(Number($('fi-rseek').value)));
  $('fi-video').addEventListener('loadedmetadata',()=>referenceFrame(ref));
  $('fi-file').addEventListener('change',e=>{
   const file=e.target.files?.[0];if(!file)return;
   if(url)URL.revokeObjectURL(url);
   url=URL.createObjectURL(file);$('fi-video').src=url;$('fi-video').load();
  });
  document.addEventListener('keydown',e=>{
   if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;
   if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
    e.preventDefault();const delta=e.key==='ArrowRight'?1:-1;
    if(e.shiftKey)referenceFrame(ref+delta);
    else{stop();gameFrame(g+delta)}
   }else if(e.key===' '){e.preventDefault();toggle()}
  },true);
  window.addEventListener('pagehide',()=>{stop();if(url)URL.revokeObjectURL(url)});
  gameFrame(0);referenceFrame(0);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})();
