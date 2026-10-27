import {mountTitleMenu} from "./kiosk-menu.js";
import {GOODS,initialShop,visitor,join,leave,apply,nextDay,resumeSolo} from "./kiosk-core.js";
import {render} from "./kiosk-view.js";
import {flatAmbient} from "./kiosk-flat.js";
import {createCustomerMotion} from "./kiosk-motion.js";
import {createHeldItemMotion} from "./kiosk-item-motion.js";
import {createSpeechPresentation} from "./kiosk-dialogue.js";
import {RoomNetwork} from "./network.js";
const $=id=>document.getElementById(id);
let titleMenu=null;
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
let customerMotion=null,heldItemMotion=null;
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
 mode=who;state=model;id=userId;seq=0;speechPresentation.reset();
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
 let updated=a.cmd==="nextday"?nextDay(state,pid):apply(state,pid,a);
 if(updated){save();net.broadcast(state);}
 return updated;
}
function command(cmd,key){
 if(!state||state.phase==="summary"&&cmd!=="nextday")return;
 if(["talk","commission","recycleReceive","recycleStore"].includes(cmd))speechPresentation.prompt(performance.now());
 const a={cmd};
 if(cmd==="slot"||cmd==="toggle")a.key=key;
 if(cmd==="restock")a.sku=key;
 if(mode==="guest"){
   net.sendInput({seq:++seq,action:{type:"kiosk",operation:a.cmd,key:a.key,sku:a.sku}});
 }else localAction(id,a);
}
function resize(){
 const width=Math.max(1,window.innerWidth),height=Math.max(1,window.innerHeight);
 const land=width>=height*1.12;
 // Preserve the physical viewport aspect ratio on wide phones as well as desktop.
 // A 500-unit minimum landscape height keeps touch targets usable without squashing art.
 const H=land?Math.max(500,Math.round(960*height/width)):Math.max(640,Math.round(480*height/width));
 const W=land?Math.round(H*width/height):480;
 screen={W,H,land};
 canvas.width=W;canvas.height=H;
 ctx.imageSmoothingEnabled=true;
}
window.addEventListener("resize",resize);window.addEventListener("orientationchange",resize);
// Tap a visible fixture to operate it; hold a stocked shelf or open drawer
// to prepare a reorder. Input geometry is always derived from rendered objects.
let activePointer=null;
function pointOnCanvas(e){
 const rect=canvas.getBoundingClientRect();
 return {x:(e.clientX-rect.left)/rect.width*screen.W,
  y:(e.clientY-rect.top)/rect.height*screen.H};
}
function findHit(x,y,gesture){
 for(let i=hits.length-1;i>=0;i--){
  const h=hits[i];
  if((h.gesture||"tap")===gesture&&x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)return h;
 }
 return null;
}
canvas.addEventListener("contextmenu",e=>e.preventDefault());
canvas.addEventListener("pointerdown",e=>{
 if(!state||!$("lobby").hidden||activePointer)return;
 const p=pointOnCanvas(e);
 activePointer={id:e.pointerId,x:p.x,y:p.y,started:performance.now(),cancelled:false};
 try{canvas.setPointerCapture(e.pointerId);}catch{}
});
canvas.addEventListener("pointermove",e=>{
 if(!activePointer||activePointer.id!==e.pointerId)return;
 const p=pointOnCanvas(e);
 const delta=Math.hypot((p.x-activePointer.x)/screen.W*innerWidth,
  (p.y-activePointer.y)/screen.H*innerHeight);
 if(delta>15)activePointer.cancelled=true;
});
canvas.addEventListener("pointercancel",()=>{activePointer=null;});
canvas.addEventListener("pointerup",e=>{
 const press=activePointer;
 if(!press||press.id!==e.pointerId)return;
 activePointer=null;
 if(press.cancelled||!state||!$("lobby").hidden)return;
 const p=pointOnCanvas(e);
 const delta=Math.hypot((p.x-press.x)/screen.W*innerWidth,
  (p.y-press.y)/screen.H*innerHeight);
 if(delta>15)return;
 const gesture=performance.now()-press.started>=500?"hold":"tap";
 const target=findHit(p.x,p.y,gesture)|| (gesture==="hold"?null:findHit(p.x,p.y,"tap"));
 if(target)command(target.cmd,target.key);
});
function tick(){
 if(mode==="host"&&state){
  for(const {peerId,input} of net.takeInputs()){
   if(input?.action?.type!=="kiosk")continue;
   const a={cmd:input.action.operation,key:input.action.key,sku:input.action.sku};
   localAction(peerId,a);
  }
 }
}
setInterval(tick,100);
setInterval(()=>{if(mode==="host"&&state)net.broadcast(state);},400);
function frame(){
 phase++;
 ctx.imageSmoothingEnabled=false;
 if(state){
  const now=performance.now();
  customerMotion=sampleCustomerMotion(state,now);
  customerMotion.speechVisible=speechPresentation.sample(state,now);
  heldItemMotion=sampleHeldItemMotion(state,id,now);
  hits=render(ctx,state,screen,phase,id,customerMotion,heldItemMotion);
 }
 else{
  flatAmbient(ctx,screen.W,screen.H,phase);
  ctx.fillStyle="#fff3dd";ctx.textAlign="center";ctx.font="bold 19px monospace";
  ctx.fillText("冬夜杂货窗口 · 等待营业",screen.W/2,screen.H/2);
  hits=[];
 }
 requestAnimationFrame(frame);
}
titleMenu=mountTitleMenu({hasSave:()=>Boolean(readSave()),hasGame:()=>Boolean(state),onStart:()=>$("solo").onclick(),onResume:()=>$("resume").onclick(),onNew:()=>$("solo").onclick()});
resize();refreshResume();frame();
if("serviceWorker" in navigator){
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).catch(()=>{}));
}
window.__KIOSK_TEST__={getState:()=>state?structuredClone(state):null,getHits:()=>structuredClone(hits),
 command,screen:()=>screen,getSelfId:()=>id,getCustomerMotion:()=>customerMotion?structuredClone(customerMotion):null,
 getHeldItemMotion:()=>heldItemMotion?structuredClone(heldItemMotion):null,saveKey:SAVE};
