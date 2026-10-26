import {createGame,joinGame,leaveGame,act,currentVisitor,publicVisitor,revealedClue,STATIONS,STATION_NAMES,CATALOG,shopView} from "./logic.js";
import {RoomNetwork} from "./network.js";

const $=id=>document.getElementById(id);
const SAVE="lampkeep-local-v1";
let game=null,mode="idle",id="solo",station="counter",invite="",outboundSeq=0;
let lastRemoteSeq=new Map(),noticeTimer=0;
const net=new RoomNetwork({
 status:text=>{$("networkStatus").textContent=text;},
 join:(peerId,name)=>{if(!game)return false;const result=joinGame(game,peerId,name);refresh();broadcast();return result;},
 leave:peerId=>{if(game){leaveGame(game,peerId);lastRemoteSeq.delete(peerId);refresh();broadcast();}},
 roster:()=>refresh(),
 state:snapshot=>{if(mode!=="guest"||snapshot?.version!==2)return;game=snapshot;refresh();},
 disconnected:()=>{setNotice("房主离线；当前记录不再变化，请返回菜单。");},
 rejected:reason=>{setNotice("网络操作未被处理："+reason);}
});
function setNotice(text){$("notice").textContent=text;}
function username(){return $("playerName").value.trim().slice(0,14)||"值班员";}
function readSave(){try{const v=JSON.parse(localStorage.getItem(SAVE)||"null");return v?.version===2?v:null;}catch{return null;}}
function save(){if(game&&(mode==="solo"||mode==="host")){try{localStorage.setItem(SAVE,JSON.stringify(game));}catch(e){console.warn("Save failed",e);}}}
function start(which,playerId,initial){
 mode=which;id=playerId;game=initial;station="counter";outboundSeq=0;
 $("lobby").hidden=true;
 $("roomToast").hidden=which!=="host"&&which!=="guest";
 refresh();if(game)save();
}
function freshSolo(){
 net.clean();const s=createGame(crypto.getRandomValues(new Uint32Array(1))[0]);joinGame(s,"solo",username());start("solo","solo",s);
 $("networkStatus").textContent="独自值班 · 存档保存在本机";
}
$("soloButton").onclick=freshSolo;
$("resumeButton").onclick=()=>{
 net.clean();const stored=readSave();if(!stored)return setNotice("没有可读取的本地存档");
 stored.players={};stored.votes={};if(stored.phase!=="running"){stored.phase="running";stored.queue=stored.queue||[];if(stored.index>=stored.queue.length)stored.index=0;}
 joinGame(stored,"solo",username());start("solo","solo",stored);
 $("networkStatus").textContent="本地存档 · 已恢复";
};
$("hostButton").onclick=async()=>{
 const btn=$("hostButton");btn.disabled=true;
 try{
  invite=await net.create();
  const s=createGame(crypto.getRandomValues(new Uint32Array(1))[0]);
  joinGame(s,"host",username());start("host","host",s);
  $("inviteCode").textContent=invite;
  $("networkStatus").textContent="多人值夜班 · 房主";
  broadcast();setNotice("房间已开启，把邀请码发送给朋友。");
 }catch(e){$("lobbyHelp").textContent="创建失败："+(e.message||String(e));}
 finally{btn.disabled=false;}
};
$("joinButton").onclick=async()=>{
 const btn=$("joinButton");btn.disabled=true;
 try{
  const welcome=await net.join($("joinCode").value,username());
  invite=welcome.room;start("guest",welcome.id,null);
  $("inviteCode").textContent=invite;
  $("networkStatus").textContent="多人值夜班 · 已连接";
  setNotice("正在从房主同步店铺状态……");
 }catch(e){$("lobbyHelp").textContent="联机失败："+(e.message||String(e));}
 finally{btn.disabled=false;}
};
$("menuButton").onclick=()=>{$("lobby").hidden=!$("lobby").hidden;const s=readSave();$("resumeButton").hidden=!s;};
$("copyCode").onclick=async()=>{try{await navigator.clipboard.writeText(invite);setNotice("房间码已经复制。");}catch{setNotice("无法自动复制，请手动抄下房间码。");}};
function broadcast(){if(mode==="host"&&game)net.broadcast(game);}
function send(action){
 if(!game||game.phase!=="running")return;
 if(mode==="guest"){net.sendInput({seq:++outboundSeq,action});}
 else if(act(game,id,action)){save();refresh();broadcast();}
}
document.querySelectorAll("[data-station]").forEach(el=>el.onclick=()=>{
 station=el.dataset.station;send({type:"station",station});refresh();
});
$("inspectButton").onclick=()=>send({type:"inspect",station});
$("pinButton").onclick=()=>send({type:"pin",station});
$("askButton").onclick=()=>send({type:"ask"});
$("shelfProps").addEventListener("click",e=>{const b=e.target.closest("button[data-sku]");if(b)send({type:"take",sku:b.dataset.sku});});
$("scanButton").onclick=()=>send({type:"scan"});
$("returnButton").onclick=()=>send({type:"return"});
$("welcomeButton").onclick=()=>send({type:"vote",choice:"welcome"});
$("refuseButton").onclick=()=>send({type:"vote",choice:"refuse"});
function node(tag,cls,text){
 const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;
}
function refresh(){
 const g=game,c=g?currentVisitor(g):null;
 const running=g?.phase==="running";
 const shop=g?shopView(g):null;
 const shelf=$("shelfProps");shelf.replaceChildren();
 if(shop)for(const sku of shop.shelf){
   const b=node("button","prop-item");b.type="button";b.dataset.sku=sku;b.disabled=!running||station!=="shelf"||Boolean(shop.counter);
   const icon=node("img");icon.src="./assets/item-"+sku+".svg";icon.alt="";
   b.append(icon,node("span",null,CATALOG[sku].name));shelf.append(b);
 }
 const counter=$("counterProps");counter.replaceChildren();
 if(shop?.counter){const icon=node("img");icon.src="./assets/item-"+shop.counter+".svg";icon.alt="";counter.append(icon,node("span",null,CATALOG[shop.counter].name));}
 else counter.append(node("span","counter-empty","等待货架送来商品"));
 $("scanButton").disabled=!running||station!=="counter"||!shop?.counter||shop.scanned;
 $("returnButton").disabled=!running||station!=="counter"||!shop?.counter||shop.success;
 $("shopFeedback").textContent=shop?.feedback||"货架和收银台会同步显示商品位置。";
 $("propStage").dataset.result=shop?.success?"correct":shop?.scanned?"wrong":"pending";
 $("visitorName").textContent=c?.name||"暂无来客";
 $("visitorOrder").textContent=c?.order||"今晚店门关着。";
 $("visitorVoice").textContent=c?.voice||"路过的人，总会留下些什么。";
 $("guestArt").src=c?"./assets/guest-"+c.look+".svg":"./assets/guest-01.svg";
 $("guestArt").style.opacity=c?"1":".4";
 $("nightLabel").textContent=g?"第"+Math.min(g.night,3)+"夜 · 第"+Math.min(g.index+1,9)+"位来客":"等待营业";
 $("trustValue").textContent=g?.trust??"—";
 $("dangerValue").textContent=g?.danger??"—";
 $("supplyValue").textContent=g?.supplies??"—";
 for(const el of document.querySelectorAll("[data-station]"))el.setAttribute("aria-selected",String(el.dataset.station===station));
 $("stationEyebrow").textContent=STATION_NAMES[station]+" · "+String(STATIONS.indexOf(station)+1).padStart(2,"0");
 const clue=g?revealedClue(g,station):null;
 const unlocked=Boolean(clue);
 $("inspectState").textContent=unlocked?"已经查看":"尚未查看";
 $("workMessage").textContent=running?(unlocked?clue:"需要亲自走近，才能看清这里留下了什么。"):"还没营业。";
 $("inspectButton").disabled=!running||unlocked;
 $("pinButton").disabled=!running||!unlocked||g.pins.includes(station);
 $("pinButton").textContent=g?.pins.includes(station)?"已贴到线索板":"贴到线索板";
 $("welcomeButton").disabled=!running;
 $("refuseButton").disabled=!running;
 $("askButton").disabled=!running||g.asks>=2;
 if(g){$("notice").textContent=g.notice;}
 const total=g?Object.keys(g.players).length:0;
 $("partyCount").textContent=total+" 人同店";
 const pinList=$("pinList");pinList.replaceChildren();
 if(!g?.pins.length)pinList.append(node("span","empty","队友发现的线索会留在这里。"));
 else for(const item of g.pins)pinList.append(node("span","pin",STATION_NAMES[item]+"｜"+revealedClue(g,item)));
 const tally=g?Object.values(g.votes):[];
 $("voteCount").textContent=tally.length+"/"+total+" 人发表意见";
 const voteList=$("voteList");voteList.replaceChildren();
 if(g)for(const [pid,vote] of Object.entries(g.votes)){
  const p=g.players[pid];if(p)voteList.append(node("span","vote",p.name+"： "+(vote==="welcome"?"请进店里":"婉拒交易")));
 }
 const roster=$("roster");roster.replaceChildren();
 if(!total)roster.append(node("p",null,"等待开店"));
 else for(const p of Object.values(g.players))roster.append(node("span","crew",p.name+(p.id===id?" · 我":"")+" · "+STATION_NAMES[p.station]));
 const history=$("history");history.replaceChildren();
 if(!g?.history.length)history.append(node("p",null,"第一位客人还未离开。"));
 else for(const h of g.history){
  const wrap=node("article","history-item");
  const title=node("b",null,h.name+"　"+(h.correct?"判断准确":"判断失误"));
  const note=node("div",null,h.explain);wrap.append(title,note);history.append(wrap);
 }
 if(g&&g.phase!=="running"){$("workMessage").textContent=g.notice;$("decisionTray").classList.add("finished");}
 else $("decisionTray").classList.remove("finished");
}
setInterval(()=>{
 if(mode!=="host"||!game)return;
 for(const {peerId,input:received} of net.takeInputs()){
  const seq=Number(received?.seq);
  if(!Number.isSafeInteger(seq)||seq<=0||seq<=(lastRemoteSeq.get(peerId)||0))continue;
  lastRemoteSeq.set(peerId,seq);
  if(act(game,peerId,received.action)){save();refresh();}
 }
 broadcast();
},150);
$("resumeButton").hidden=!readSave();
if(window.LAMPKEEP_E2E===true){
  window.lampkeepState=()=>game?structuredClone(game):null;
  window.lampkeepSendTestActions=(count)=>{
    for(let i=0;i<count;i++)send({type:"station",station:i%2===0?"counter":"window"});
  };
}
refresh();

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(e=>console.warn('Offline cache unavailable',e)));}
