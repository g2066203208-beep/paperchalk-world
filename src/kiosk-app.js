import {SHOP} from './kiosk-shop-layout.js';

import {mountTitleMenu} from "./kiosk-menu.js";
import {GOODS,FIXTURES,initialShop,visitor,join,leave,apply,nextDay,resumeSolo} from "./kiosk-core.js";
import {renderSilhouette} from './kiosk-silhouette.js';
import {renderStoryWorld} from './story-world-render.js';
import {createCuePlayer} from './story-animation.js';

import {createCustomerMotion} from "./kiosk-motion.js";
import {createHeldItemMotion} from "./kiosk-item-motion.js";
import {createSpeechPresentation} from "./kiosk-dialogue.js";
import {RoomNetwork} from "./network.js";
import {mountStoryUI} from './story-ui.js';
import {ensureStory,applyStoryAction,seeShopProgress} from './story-framework.js';
const $=id=>document.getElementById(id);
let titleMenu=null,storyUI=null;
// Keep room status accessible inside the menu without covering physical shelves.
function setStatus(message,alert=false){
 const el=$("status");el.textContent=message;el.dataset.alert=alert?"true":"false";
 refreshRoomDetails();
}
function refreshRoomDetails(){
 const details=$("roomDetails");if(!details)return;
 details.dataset.alert=$("status").dataset.alert;
 details.textContent=(room?"房间码："+room+" · 可分享给店员":"单人/本地小店")+" · "+$("status").textContent;
}
const SAVE="untitled-kiosk-save-v1";
const canvas=$("game"),ctx=canvas.getContext("2d",{alpha:false});
let screen={W:480,H:900,land:false},hits=[],phase=0;
let state=null,mode="idle",id="solo",seq=0,room="";
const sampleCustomerMotion=createCustomerMotion();
const sampleHeldItemMotion=createHeldItemMotion();
const speechPresentation=createSpeechPresentation();
const storyCuePlayer=createCuePlayer();
let customerMotion=null,heldItemMotion=null;
const shopUi={catalog:false,page:'goods',feedback:null};
// Full-scene fixed composition. No camera, manual panning, selection shot or zoom.
const net=new RoomNetwork({
 status:t=>setStatus(t),
 join:(pid,name)=>{
  if(!state)return false;
  const yes=join(state,pid,name);if(yes)net.broadcast(state);return yes;
 },
 leave:pid=>{if(state){leave(state,pid);net.broadcast(state);}},
 state:s=>{if(mode==="guest"&&s?.version===3){const first=state===null;state=s;if(first){$("host").disabled=$("join").disabled=false;titleMenu?.hide();}}},
 disconnected:()=>setStatus("房主已断开；本局停止同步。",true),
 rejected:reason=>setStatus("操作被拒绝："+reason,true)
});
function readSave(){try{let value=JSON.parse(localStorage.getItem(SAVE)||"null");return value?.version===3?value:null;}catch{return null;}}
function save(){if(state&&(mode==="solo"||mode==="host")){try{localStorage.setItem(SAVE,JSON.stringify(state));}catch{setStatus("浏览器未允许保存，本次进度暂不能自动存档。",true);}}}
function playerName(){return $("nickname").value.trim().slice(0,14)||"店员";}
function refreshResume(){$("resume").hidden=!readSave();}
function start(who,model,userId="solo"){
 mode=who;state=model;id=userId;seq=0;shopUi.catalog=false;shopUi.feedback=null;ensureStory(state);storyUI?.hide();
 // Legacy save compatibility: old hidden cabinets and drawers are now always open racks.
 state.open??={};
 for(const [key,fixture] of Object.entries(FIXTURES))if(fixture.kind!=='shelf')state.open[key]=true;
 state.windowOpen=true;
 if(!model.totalServed&&!model.spoken)state.notice='直接点货架拿货，点交接台摆货，然后确认收款。';
 speechPresentation.reset();storyCuePlayer.reset();
 $("hud").classList.add("playing");
 titleMenu?.hide();
 $("roomCode").textContent=room?("房间码："+room):"";
 refreshRoomDetails();
 save();
}
$("solo").onclick=()=>{
 net.clean();room="";
 const s=initialShop();join(s,"solo",playerName());
 start("solo",s);
 setStatus("单人营业 · 本机自动存档");
};
$("resume").onclick=()=>{
 net.clean();room="";
 const s=readSave();if(!s)return;
 resumeSolo(s,playerName());
 start("solo",s);
 setStatus("本机存档已恢复");
};
$("host").onclick=async()=>{
 if($("host").disabled)return;
 $("host").disabled=$("join").disabled=true;
 try{
  setStatus("正在创建房间…");
  room=await net.create();
  const s=initialShop();join(s,"host",playerName());
  start("host",s,"host");
  net.broadcast(state);
  $("roomCode").textContent="房间码："+room;
  refreshRoomDetails();
 }catch(e){setStatus("联机创建失败："+(e?.message||e),true);}
 finally{$("host").disabled=$("join").disabled=false;}
};
$("join").onclick=async()=>{
 if($("join").disabled)return;
 const requestedCode=$("joinCode").value.trim().toUpperCase();
 if(!/^[A-Z0-9]{8}$/.test(requestedCode)){setStatus("请填写好友的 8 位房间码。",true);$("joinCode").focus();return;}
 $("host").disabled=$("join").disabled=true;
 try{
  const code=$("joinCode").value.trim().toUpperCase();
  setStatus("正在加入…");
  // PeerJS may close an early data channel even after the host accepts it.
  // A fresh peer ID on retry prevents a ghost half-join from blocking play.
  let joined,lastError;
  for(let attempt=0;attempt<3&&!joined;attempt++){
    try{joined=await net.join(code,playerName());}
    catch(e){
      lastError=e;
      if(attempt<2){
        setStatus("连接暂断，正在重试（"+(attempt+2)+"/3）…");
        await new Promise(resolve=>setTimeout(resolve,350));
      }
    }
  }
  if(!joined)throw lastError||Error("无法连接房间");
  room=joined.room;id=joined.id;mode="guest";state=null;seq=0;
  $("hud").classList.add("playing");
  setStatus("已连接，正在同步当前店面…");
  $("roomCode").textContent="房间码："+room;
  refreshRoomDetails();
 }catch(e){setStatus("无法加入："+(e?.message||e),true);}
 finally{$("host").disabled=$("join").disabled=(mode==="guest"&&state===null);}
};
$("menu").onclick=()=>{refreshResume();refreshRoomDetails();if($("lobby").hidden)titleMenu.show();else if(state)titleMenu.hide();};
$("closeLobby").onclick=()=>{if(state)titleMenu.hide();};
function localAction(pid,a){
 if(!state)return false;
 const before={totalServed:state.totalServed,day:state.day};
 const isStory=['storyChoice','storyTravel','storyAvatar'].includes(a.cmd);
 let updated=isStory?applyStoryAction(state,pid,a):a.cmd==="nextday"?nextDay(state,pid):apply(state,pid,a);
 if(updated){
  seeShopProgress(state,before);
  if(a.cmd==='nextday'){
   // The new presentation has no window handle: every shift starts open.
   state.windowOpen=true;state.notice='新的一天。直接点货架拿货，点交接台交付。';
  }
  save();net.broadcast(state);
 }
 if(pid===id&&!updated)shopUi.feedback={text:!updated&&a.itemId?'这件货已被拿走，请重新选择。':state.notice,until:performance.now()+2300,anchor:shopUi.actionAnchor};
 return updated;
}
function command(cmd,key,itemId,nodeId){
 if(cmd==='storyOpen'){storyUI?.show('story');return;}
 if(cmd==='storyMapOpen'){storyUI?.show('map');return;}
 if(['storyChoice','storyTravel','storyAvatar'].includes(cmd)){
  if(!state)return;
  const a={cmd,key,nodeId};
  if(mode==='guest')net.sendInput({seq:++seq,action:{type:'kiosk',operation:cmd,key,nodeId}});
  else localAction(id,a);
  storyUI?.refresh(true);return;
 }
 if(cmd==="focus"||cmd==="look"||cmd==="toggle"||cmd==="window")return;
 if(cmd==="catalog"){shopUi.catalog=true;shopUi.page="goods";return;}
 if(cmd==="catalogPage"){shopUi.page=key;return;}
 if(cmd==="closeCatalog"){shopUi.catalog=false;return;}
 if(["restock","upgrade","heat"].includes(cmd))shopUi.catalog=false;
 if(!state||state.phase==="summary"&&cmd!=="nextday")return;
 if(["talk","commission","recycleReceive","recycleStore"].includes(cmd))speechPresentation.prompt(performance.now());

 const a={cmd};if(itemId)a.itemId=itemId;
 if(cmd==="slot"||cmd==="toggle")a.key=key;
 if(cmd==="restock")a.sku=key;
 if(mode==="guest"){
   net.sendInput({seq:++seq,action:{type:"kiosk",operation:a.cmd,key:a.key,sku:a.sku,itemId:a.itemId}});
 }else localAction(id,a);
}
function resize(){
 const rect=canvas.getBoundingClientRect();
 const W=Math.max(1,Math.round(rect.width)),H=Math.max(1,Math.round(rect.height));
 const dpr=Math.min(3,window.devicePixelRatio||1);
 screen={W,H,land:W>=H*1.12,dpr};
 canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.imageSmoothingEnabled=false;
}
window.addEventListener("resize",resize);window.addEventListener("orientationchange",resize);
window.visualViewport?.addEventListener("resize",resize);
// Direct pointer interaction: tap once, act once. Never zoom, drag-pan, or hold.
let activePointer=null;
function pointOnCanvas(e){
 const r=canvas.getBoundingClientRect();
 return {x:(e.clientX-r.left)/r.width*screen.W,y:(e.clientY-r.top)/r.height*screen.H};
}
function findHit(x,y){
 for(let i=hits.length-1;i>=0;i--){
  const h=hits[i];
  if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)return h;
 }
 return null;
}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
 if(!state||!$('lobby').hidden||activePointer)return;
 const p=pointOnCanvas(e);
 activePointer={id:e.pointerId,x:p.x,y:p.y,target:findHit(p.x,p.y)};
 try{canvas.setPointerCapture(e.pointerId);}catch{}
});
canvas.addEventListener('pointercancel',()=>{activePointer=null;});
canvas.addEventListener('pointerup',e=>{
 const press=activePointer;
 if(!press||press.id!==e.pointerId)return;
 activePointer=null;
 if(!state||!$('lobby').hidden)return;
 const p=pointOnCanvas(e);
 if(Math.hypot(p.x-press.x,p.y-press.y)>18)return;
 const target=press.target;
 if(target&&findHit(p.x,p.y)?.cmd===target.cmd){
  shopUi.actionAnchor=target.world||null;
  command(target.cmd,target.key,target.itemId);
 }
});
function tick(){
 if(mode==="host"&&state){
  for(const {peerId,input} of net.takeInputs()){
   if(input?.action?.type!=="kiosk")continue;
   const a={cmd:input.action.operation,key:input.action.key,sku:input.action.sku,itemId:input.action.itemId,nodeId:input.action.nodeId};
   localAction(peerId,a);
  }
 }
}
setInterval(tick,100);
setInterval(()=>{if(mode==="host"&&state)net.broadcast(state);},400);
function frame(){
 phase++;
 ctx.setTransform(screen.dpr||1,0,0,screen.dpr||1,0,0);
 ctx.imageSmoothingEnabled=true;
 if(state){
  const now=performance.now();
  customerMotion=sampleCustomerMotion(state,now);
  customerMotion.speechVisible=speechPresentation.sample(state,now);
  heldItemMotion=sampleHeldItemMotion(state,id,now);
  shopUi.motion=$("motionToggle").checked;
  shopUi.storyCue=storyCuePlayer.sample(state.story,now,!shopUi.motion);
  hits=state.story?.location&&state.story.location!=='shop'
    ?renderStoryWorld(ctx,state,screen,phase,shopUi)
    :renderSilhouette(ctx,state,screen,phase,id,customerMotion,heldItemMotion,shopUi);
  storyUI?.refresh();
 }
 else{
  ctx.fillStyle='#fff';ctx.fillRect(0,0,screen.W,screen.H);
  ctx.fillStyle='#000';ctx.textAlign='center';ctx.font='bold 18px system-ui';
  ctx.fillText('还未营业',screen.W/2,screen.H/2);
  hits=[];
 }
 requestAnimationFrame(frame);
}
storyUI=mountStoryUI({dispatch:command,getState:()=>state});
titleMenu=mountTitleMenu({hasSave:()=>Boolean(readSave()),hasGame:()=>Boolean(state),onStart:()=>$("solo").onclick(),onResume:()=>$("resume").onclick(),onNew:()=>$("solo").onclick()});
resize();refreshResume();frame();
if("serviceWorker" in navigator){
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{}));
}
window.__KIOSK_TEST__={getState:()=>state?structuredClone(state):null,getHits:()=>structuredClone(hits),
 command,screen:()=>screen,getCamera:()=>null,getWorld:()=>structuredClone(SHOP),getArtStatus:()=>({total:0,ready:0,failed:[]}),getSelfId:()=>id,getCustomerMotion:()=>customerMotion?structuredClone(customerMotion):null,
 getHeldItemMotion:()=>heldItemMotion?structuredClone(heldItemMotion):null,getStory:()=>state?.story?structuredClone(state.story):null,openStory:(type)=>storyUI.show(type),saveKey:SAVE};
