// Title-screen presentation only; shop state and WebRTC remain in kiosk-app.
export const MENU_SETTINGS_KEY="untitled-kiosk-menu-v1";
export function loadMenuSettings(storage, reducedMotion=false){
 let saved={};try{saved=JSON.parse(storage.getItem(MENU_SETTINGS_KEY)||"{}");}catch{}
 return {motion:typeof saved?.motion==="boolean"?saved.motion:!reducedMotion,
  sound:saved?.sound===true,largeText:saved?.largeText===true};
}
export function mountTitleMenu({hasSave,onStart,onResume,onNew,hasGame}){
 const $=id=>document.getElementById(id),root=$("lobby");
 const views={home:$("menuHome"),multi:$("menuMulti"),settings:$("menuSettings")};
 const prefs=loadMenuSettings(localStorage,matchMedia("(prefers-reduced-motion: reduce)").matches);
 let exitTimer=null,revealTimer=null,transitioning=false,audio=null,currentView="home";
 const curtain=$("sceneTransition"),gameCanvas=$("game");
 root.dataset.transition="idle";
 function persist(){try{localStorage.setItem(MENU_SETTINGS_KEY,JSON.stringify(prefs));}catch{}}
 function applyPrefs(){
  root.dataset.motion=String(prefs.motion);root.dataset.largeText=String(prefs.largeText);
  $("motionToggle").checked=prefs.motion;$("soundToggle").checked=prefs.sound;$("largeTextToggle").checked=prefs.largeText;
 }
 function tone(){
  if(!prefs.sound)return;
  try{
   audio||=new (window.AudioContext||window.webkitAudioContext)();audio.resume();
   const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
   o.type="sine";o.frequency.setValueAtTime(560,t);o.frequency.exponentialRampToValueAtTime(370,t+.07);
   g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.09);
   o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.1);
  }catch{}
 }
 function showView(name,focus=true){
  currentView=name;for(const [key,el] of Object.entries(views))el.hidden=key!==name;
  root.querySelector(".menu-paper").dataset.view=name;$("newConfirm").hidden=true;$("newGame").hidden=!hasSave();
  if(focus)(name==="home"?$("primaryStart"):views[name].querySelector("button")).focus({preventScroll:true});
 }
 function refresh(){
  const saved=hasSave()||hasGame();$("menuHeading").replaceChildren(document.createTextNode(saved?"欢迎回店":"欢迎开店"));
  const dot=document.createElement("span");dot.className="heading-dot";dot.textContent="。";$("menuHeading").append(dot);
  $("primaryStart").querySelector("span").textContent=saved?"继续经营":"开始经营";
  $("homeSave").textContent=saved?"上次的忙碌，已经替你记下。":"推开窗，迎接第一位客人。";
  $("closeLobby").hidden=!hasGame();$("newGame").hidden=!saved;
 }
 function finishEntry(){
  clearTimeout(exitTimer);clearTimeout(revealTimer);transitioning=false;
  root.hidden=true;root.inert=false;root.classList.remove("leaving");root.dataset.transition="idle";
  curtain.hidden=true;gameCanvas.inert=false;
  $("menu").focus({preventScroll:true});
 }
 function hide(animate=true){
  if(transitioning)return;
  if(root.hidden){gameCanvas.inert=false;return;}
  clearTimeout(exitTimer);clearTimeout(revealTimer);
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(!animate||!prefs.motion||reduced){finishEntry();return;}
  transitioning=true;root.dataset.transition="entering";root.inert=true;gameCanvas.inert=true;
  root.classList.add("leaving");curtain.hidden=false;
  // Reveal the prepared world only at the fully opaque shutter midpoint.
  revealTimer=setTimeout(()=>{root.hidden=true;root.inert=false;root.classList.remove("leaving");},420);
  exitTimer=setTimeout(finishEntry,860);
 }
 function show(){
  clearTimeout(exitTimer);clearTimeout(revealTimer);transitioning=false;curtain.hidden=true;
  root.classList.remove("leaving");root.dataset.transition="idle";root.inert=false;root.hidden=false;
  gameCanvas.inert=true;refresh();showView("home");
 }
 $("primaryStart").onclick=()=>{if(transitioning)return;tone();if(hasGame())hide();else (hasSave()?onResume:onStart)();};
 $("multiplayer").onclick=()=>{tone();showView("multi");};
 $("settings").onclick=()=>{tone();showView("settings");};
 root.querySelectorAll("[data-menu-back]").forEach(b=>b.onclick=()=>{tone();refresh();showView("home");});
 for(const [element,key] of [["motionToggle","motion"],["soundToggle","sound"],["largeTextToggle","largeText"]]){
  $(element).onchange=()=>{prefs[key]=$(element).checked;applyPrefs();persist();tone();};
 }
 $("newGame").onclick=()=>{$("newConfirm").hidden=false;$("newGame").hidden=true;$("cancelNew").focus();};
 $("cancelNew").onclick=()=>{$("newConfirm").hidden=true;$("newGame").hidden=false;$("newGame").focus();};
 $("confirmNew").onclick=()=>{tone();onNew();};
 $("joinCode").addEventListener("input",()=>{$("joinCode").value=$("joinCode").value.replace(/[^a-z0-9]/gi,"").toUpperCase();});
 $("joinCode").addEventListener("keydown",e=>{if(e.key==="Enter"&&!$("join").disabled){e.preventDefault();$("join").click();}});
 root.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
   e.preventDefault();if(currentView!=="home"){refresh();showView("home");}else if(hasGame())hide();
  }
  if(e.key==="Tab"){
   const buttons=[...root.querySelectorAll("button:not([hidden]):not([disabled]),input:not([disabled])")].filter(el=>el.getClientRects().length);
   const first=buttons[0],last=buttons.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
 });
 const field=root.querySelector(".snowfall");
 for(let i=0;i<20;i++){
  const n=document.createElement("i");n.className="snowflake";
  n.style.cssText=`left:${(i*47.31)%100}%;--size:${5+i%4*3}px;--duration:${12+i%7*2}s;--delay:-${i*2.13}s;--opacity:${.35+i%4*.12}`;
  field.append(n);
 }
 document.addEventListener("visibilitychange",()=>{root.querySelectorAll(".menu-scene *").forEach(n=>n.style.animationPlayState=document.hidden?"paused":"");if(document.hidden&&transitioning)finishEntry();});
 function sceneSize(){
  const w=root.clientWidth||innerWidth,h=root.clientHeight||innerHeight;
  const portrait=w/h<.8;
  const sw=portrait?w:Math.max(w,h*16/9),sh=portrait?h*.56:sw*9/16;
  root.style.setProperty('--scene-w',sw+'px');root.style.setProperty('--scene-h',sh+'px');
  root.style.setProperty('--scene-x',((w-sw)/2)+'px');root.style.setProperty('--scene-y',(portrait?0:(h-sh)/2)+'px');
 }
 new ResizeObserver(sceneSize).observe(root);window.addEventListener('orientationchange',sceneSize);sceneSize();
 applyPrefs();refresh();showView("home",false);$("game").inert=true;
 return {show,hide,refresh};
}
