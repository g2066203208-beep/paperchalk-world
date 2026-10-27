import {reconcileObjects,canGrabObject,validateObjects} from "./kiosk-objects.js";
// Shared, deterministic shop rules. Actions validated exclusively at room host.
import {applyBusinessAction,businessCommand,recyclingCarried,recyclingState,recyclingValid,reclaimRecyclingOnLeave} from "./kiosk-business.js";
export const GOODS=Object.freeze({
 tea:{name:"热茶",buy:4,price:9,size:1,color:"#bd8b58"},
 bread:{name:"面包",buy:5,price:12,size:2,color:"#d4a165"},
 battery:{name:"电池",buy:7,price:16,size:1,color:"#7ba9a3"},
 cocoa:{name:"可可",buy:6,price:14,size:1,color:"#b889a9"}
});
export const FIXTURES=Object.freeze({
 shelfL1:{label:"左货架·上",capacity:3,kind:"shelf"},
 shelfL2:{label:"左货架·中",capacity:4,kind:"shelf"},
 shelfL3:{label:"左货架·下",capacity:4,kind:"shelf"},
 shelfR1:{label:"右货架·上",capacity:3,kind:"shelf"},
 shelfR2:{label:"右货架·中",capacity:4,kind:"shelf"},
 shelfR3:{label:"右货架·下",capacity:4,kind:"shelf"},
 cabinetL:{label:"左吊柜",capacity:4,kind:"cabinet"},
 cabinetR:{label:"右吊柜",capacity:4,kind:"cabinet"},
 drawerL:{label:"左抽屉",capacity:4,kind:"drawer"},
 drawerR:{label:"右抽屉",capacity:4,kind:"drawer"}
});
// A manager can permanently increase each shelf's physical volume by two units per level.
// The first purchase is affordable on day one; level two requires earned revenue.
export const SHELF_UPGRADE_COSTS=Object.freeze([35,70]);
export function shelfUpgradeCost(s){return SHELF_UPGRADE_COSTS[s.upgrades?.shelves??0]??null;}
export const HEATING_UPGRADE_COST=36;
export function heatingUpgradeCost(s){return (s.upgrades?.heating??0)===0?HEATING_UPGRADE_COST:null;}
export function dailyOverhead(s){const rent=6,heating=(s.upgrades?.heating??0)===1?2:8;return {rent,heating,total:rent+heating};}
// Legacy v3 saves without reputation fields start at zero. The room host is
// the sole authority for mistakes, settlement and thank-you tips.
export function reputationLevel(s){return 1+Math.min(4,Math.floor(Math.max(0,s.reputation||0)/20));}
export function loyaltyTip(s){return Math.min(4,Math.floor(Math.max(0,s.reputation||0)/20));}
export function dailyReputation(s){
 const mistakes=s.mistakes||0,favors=s.favorCount||0;
 return {delta:Math.max(-8,Math.min(12,4+favors*3-mistakes*4)),
  rating:Math.max(1,Math.min(5,4+Math.min(1,favors)-Math.min(3,mistakes)))};
}
export const CUSTOMERS=[
 {name:"卫叔",sku:"tea",line:"冻得耳朵都快掉了！来一杯热茶。",after:"喝了一口，才发现自己戴了两顶帽子。",tone:0},
 {name:"小苏",sku:"bread",line:"一块面包。别问为什么我只穿一只手套。",after:"她笑着把另一只手套从口袋里掏出来。",tone:1,favor:{sku:"tea",tip:8,line:"顺便替门外那位冻僵的雪人捎杯热茶。"}},
 {name:"赵大爷",sku:"battery",line:"两节电池！我家遥控器一直在换台。",after:"他说电视关着时也会换台。",tone:2},
 {name:"阿默",sku:"cocoa",line:"可可有吗？我的雪人要喝。",after:"门外雪人竟然朝店里点了点头。",tone:3,favor:{sku:"battery",tip:13,line:"能给雪人的发光鼻子换节电池吗？"}},
 {name:"燕子",sku:"tea",line:"热茶一杯，给你们店长带句好。",after:"她把一张写着笑话的便条留在窗边。",tone:1},
 {name:"老周",sku:"bread",line:"面包有吗？我老婆让我买点正经东西。",after:"他又问这里有没有卖勇气的。",tone:0,favor:{sku:"cocoa",tip:11,line:"再替我买杯可可，千万别告诉我老婆。"}},
 {name:"快递员",sku:"battery",line:"电池一份，配送车被冻得不听话。",after:"他用新电池装在手电筒里，终于找到车了。",tone:2},
 {name:"某位熟客",sku:"cocoa",line:"可可来一份；别跟邻居说我喜欢甜的。",after:"结果邻居早就在队伍后面偷笑。",tone:3,favor:{sku:"bread",tip:11,line:"替隔壁的鸽子带块面包，别问是谁托的。"}}
];
export function initialShop(){
 const slots={};for(const key of Object.keys(FIXTURES))slots[key]={sku:null,qty:0};
 slots.shelfL1={sku:"tea",qty:2,lastSku:"tea"};
 slots.shelfL2={sku:"bread",qty:2,lastSku:"bread"};
 slots.shelfR1={sku:"battery",qty:2,lastSku:"battery"};
 slots.drawerL={sku:"cocoa",qty:2,lastSku:"cocoa"};
 return {version:3,day:1,cash:100,earnings:0,stars:0,served:0,totalServed:0,
  phase:"operating",windowOpen:false,open:{cabinetL:false,cabinetR:false,drawerL:false,drawerR:false},
  slots,hand:null,counter:null,orderIndex:0,spoken:false,queue:0,selectedRestock:null,
  players:{},upgrades:{shelves:0,heating:0},dayExpenses:0,dayOverhead:0,dayNet:0,totalOverhead:0,
  reputation:0,dayRating:0,dayReputationDelta:0,mistakes:0,totalMistakes:0,
  wrongAttempted:false,loyaltyTips:0,totalLoyaltyTips:0,favorDone:false,favorCount:0,favorTips:0,totalFavors:0,returns:[],notice:"先点窗闩开窗营业，再从货架拿商品。",revision:0};
}
export function visitor(s){return CUSTOMERS[s.orderIndex % CUSTOMERS.length];}
function putBack(s,sku,origin){
 const keys=[origin,...Object.keys(FIXTURES)].filter((k,i,all)=>FIXTURES[k]&&all.indexOf(k)===i);
 for(const k of keys){const v=s.slots[k];if(v&&(!v.sku||v.sku===sku)&&v.qty<slotRoom(k,sku,s)){v.sku=sku;v.lastSku=sku;v.qty++;return;}}
 if(!s.counter)s.counter=sku;else(s.returns??=[]).push(sku);
}
export function join(s,id,name){
 if(s.players[id]||Object.keys(s.players).length>=4)return false;
 const first=Object.keys(s.players).length===0;
 const p={id,name:String(name||"店员").slice(0,14),role:first?"manager":"clerk",hand:null,origin:null,restock:null};
 if(first&&GOODS[s.hand]){p.hand=s.hand;s.hand=null;}
 if(first&&GOODS[s.selectedRestock]){p.restock=s.selectedRestock;s.selectedRestock=null;}
 s.players[id]=p;reconcileObjects(s);s.revision++;return true;
}
export function leave(s,id){
 const p=s.players[id];if(!p)return;
 if(p.hand)putBack(s,p.hand,p.origin);
 reclaimRecyclingOnLeave(s,id);
 delete s.players[id];reconcileObjects(s);s.revision++;
}
export function resumeSolo(s,name){
 const physicalBefore=s.physicalItems;
 // Old multiplayer players cannot keep a service parcel in an orphaned hand.
 for(const oldId of Object.keys(s.players||{}))reclaimRecyclingOnLeave(s,oldId);
 const held=[];
 if(GOODS[s.hand])held.push({sku:s.hand,origin:null});
 for(const p of Object.values(s.players||{}))if(GOODS[p.hand])held.push({sku:p.hand,origin:p.origin});
 const restock=GOODS[s.selectedRestock]?s.selectedRestock:null;
 s.players={};s.hand=null;s.selectedRestock=null;join(s,"solo",name);
 if(physicalBefore)s.physicalItems=physicalBefore;
 const first=held.shift();if(first){s.players.solo.hand=first.sku;s.players.solo.origin=first.origin;}
 for(const p of held)putBack(s,p.sku,p.origin);
 if(restock)s.players.solo.restock=restock;
 reconcileObjects(s);return s;
}
export function visible(s,key){const f=FIXTURES[key];return f&& (f.kind==="shelf" || Boolean(s.open[key]));}
export function slotRoom(key,sku,s=null){
 const bonus=FIXTURES[key].kind==="shelf"?2*(s?.upgrades?.shelves??0):0;
 return Math.floor((FIXTURES[key].capacity+bonus)/GOODS[sku].size);
}
export function apply(s,by,a){
 if(!s||s.version!==3||!s.players[by]||s.phase!=="operating"||!a||typeof a!=="object")return false;
 const p=s.players[by];
 reconcileObjects(s);
 if(a.itemId&&(a.cmd!=="slot"||p.hand||p.restock||!canGrabObject(s,a.itemId,a.key)))return false;
 let {cmd,key,sku}=a;
 if(businessCommand(cmd))return applyBusinessAction(s,by,a);
 if(recyclingCarried(s,by)&&["slot","counter","restock"].includes(cmd))return false;
 if(cmd==="slot"&&key==="drawerR"){
  const recycling=recyclingState(s);
  if(recycling.stored>0||recycling.carriedBy)return false;
 }
 if(cmd==="window"){s.windowOpen=!s.windowOpen;s.notice=s.windowOpen?"窗打开了。外头已经有人排队。":"窗关好了，寒风被挡在外面。";}
 else if(cmd==="toggle" && FIXTURES[key] && FIXTURES[key].kind!=="shelf"){
    s.open[key]=!s.open[key];s.notice=FIXTURES[key].label+(s.open[key]?"已打开。":"已关好。");
 }
 else if(cmd==="slot" && FIXTURES[key] && visible(s,key)){
    const slot=s.slots[key];
    if(p.restock){
      if(p.role!=="manager")return false;
      const kind=p.restock,thing=GOODS[kind],cost=thing.buy;
      if(s.cash<cost){s.notice="进货资金不够。";p.restock=null;}
      else if(slot.sku&&slot.sku!==kind){s.notice="这一格已有其他商品，先取走。";return false;}
      else if(slot.qty>=slotRoom(key,kind,s)){s.notice="这一格已经放满。";return false;}
      else{slot.sku=kind;slot.lastSku=kind;slot.qty++;s.cash-=cost;s.dayExpenses=(s.dayExpenses||0)+cost;s.notice="进货成功："+thing.name+" ×1 放入"+FIXTURES[key].label;p.restock=null;}
    }else if(p.hand){
      if(slot.sku&&slot.sku!==p.hand){s.notice="这格摆的是其他商品。";return false;}
      if(slot.qty>=slotRoom(key,p.hand,s)){s.notice="位置太小，放不下。";return false;}
      slot.sku=p.hand;slot.lastSku=p.hand;slot.qty++;s.notice="把"+GOODS[p.hand].name+"放回了"+FIXTURES[key].label;p.hand=null;p.origin=null;
    }else if(slot.qty>0){
      p.hand=slot.sku;p.origin=key;slot.lastSku=slot.sku;slot.qty--;if(slot.qty===0)slot.sku=null;
      s.notice="拿起了"+GOODS[p.hand].name+"。现在点柜台放下。";
    }else{s.notice="这里还空着。可先选择进货，再点这个位置。";}
 }
 else if(cmd==="counter"){
    if(p.hand&&s.counter===null){s.counter=p.hand;p.hand=null;p.origin=null;s.notice="商品放到了交接台。";}
    else if(!p.hand&&s.counter){p.hand=s.counter;p.origin=null;s.counter=null;s.notice="把商品从交接台拿了起来。";}
    else if(!p.hand&&!s.counter&&s.returns?.length){p.hand=s.returns.shift();p.origin=null;s.notice="从待领回商品中取出了"+GOODS[p.hand].name;}
    else return false;
 }
 else if(cmd==="upgrade"){
    if(p.role!=="manager")return false;
    // Switching from stocking to the work-order plaque cancels stale selection.
    p.restock=null;
    const cost=shelfUpgradeCost(s);
    if(cost===null)s.notice="货架扩容已满级，继续经营攒钱开分店吧。";
    else if(s.cash<cost)s.notice="扩容需要 ¥"+cost+"，目前资金不足。";
    else{
      s.cash-=cost;
      const level=(s.upgrades?.shelves??0)+1;
      s.upgrades={...(s.upgrades||{}),shelves:level};
      s.notice="货架扩容升级到 "+level+"/2 级！每层货架容量增加 "+(level*2)+" 单位。";
    }
 }
 else if(cmd==="heat"){
    if(p.role!=="manager")return false;
    p.restock=null;
    const cost=heatingUpgradeCost(s);
    if(cost===null)s.notice="保温改造已经完成，暖气费每天节省 ¥6。";
    else if(s.cash<cost)s.notice="保温改造需要 ¥"+cost+"，目前资金不足。";
    else{s.cash-=cost;s.upgrades={...(s.upgrades||{}),heating:1};s.notice="门窗保温改造完成！每天暖气费从 ¥8 降为 ¥2。";}
 }
 else if(cmd==="restock" && GOODS[sku]){
    if(p.role!=="manager"||p.hand)return false;
    p.restock=p.restock===sku?null:sku;
    s.notice=p.restock?"请选择一个有空位的货架、柜子或抽屉，放入"+GOODS[sku].name:"已取消进货";
 }
 else if(cmd==="talk"){
    if(!s.windowOpen){s.notice="先开窗，才能听到顾客。";return false;}
    s.spoken=true;s.notice=visitor(s).line+(visitor(s).favor?" "+visitor(s).favor.line:"");
 }
 else if(cmd==="commission"){
    const favor=visitor(s).favor;
    if(!s.windowOpen)s.notice="先开窗，才能办理邻里委托。";
    else if(!favor)s.notice="这位顾客没有额外委托。";
    else if(!s.spoken)s.notice="先和顾客交谈，了解他的额外需求。";
    else if(s.favorDone)s.notice="这位顾客的委托已经完成，不能重复领取报酬。";
    else if(!s.counter)s.notice="请把委托需要的商品放在交接台。";
    else if(s.counter!==favor.sku)s.notice="委托需要"+GOODS[favor.sku].name+"，交接台上的商品不对。";
    else{
      // One physical item is consumed exactly once by the host-authoritative action.
      s.counter=null;s.cash+=favor.tip;s.favorDone=true;
      s.favorCount=(s.favorCount||0)+1;
      s.favorTips=(s.favorTips||0)+favor.tip;
      s.totalFavors=(s.totalFavors||0)+1;
      s.notice=visitor(s).name+"的邻里委托完成！报酬 ¥"+favor.tip+" 已入账。";
    }
 }
 else if(cmd==="sell"){
    if(!s.windowOpen){s.notice="窗没打开，客人听不见。";return false;}
    if(!s.counter){s.notice="交接台上还没有商品。";return false;}
    if(s.counter!==visitor(s).sku){
      // The mistaken item stays on the counter. Record at most one service
      // mistake per customer; a real state revision synchronizes the warning.
      s.notice=visitor(s).name+"摇了摇头：这不是我要的。请换货。";
      if(!s.wrongAttempted){
        s.mistakes=(s.mistakes||0)+1;
        s.totalMistakes=(s.totalMistakes||0)+1;
        s.wrongAttempted=true;
      }
    }else{
      const price=GOODS[s.counter].price,tip=loyaltyTip(s);
      s.cash+=price+tip;s.earnings+=price;
      s.loyaltyTips=(s.loyaltyTips||0)+tip;
      s.totalLoyaltyTips=(s.totalLoyaltyTips||0)+tip;
      s.stars++;s.totalServed++;s.served++;
      s.notice=visitor(s).after+"  收款 ¥"+price+(tip?"，熟客感谢小费 ¥"+tip:"");
      s.counter=null;s.spoken=false;s.favorDone=false;s.wrongAttempted=false;s.orderIndex++;
      if(s.served>=5){
        const bill=dailyOverhead(s);
        s.cash-=bill.total;s.dayOverhead=bill.total;
        s.totalOverhead=(s.totalOverhead||0)+bill.total;
        s.dayNet=s.earnings+(s.favorTips||0)+(s.loyaltyTips||0)-(s.dayExpenses||0)-bill.total;
        const result=dailyReputation(s);
        s.dayRating=result.rating;s.dayReputationDelta=result.delta;
        s.reputation=Math.max(0,Math.min(100,(s.reputation||0)+result.delta));
        s.phase="summary";
        s.notice="今日打烊！房租 ¥"+bill.rent+"、暖气 ¥"+bill.heating+" 已结算。";
      }
    }
 }
 else if(cmd==="nextday" && s.phase==="summary"){} // resolved by explicit branch below
 else return false;
 reconcileObjects(s,a.itemId);s.revision++;return true;
}
export function nextDay(s,by){
 if(!s.players[by]||s.players[by].role!=="manager"||s.phase!=="summary")return false;
 s.day++;s.served=0;s.earnings=0;s.favorCount=0;s.favorTips=0;s.dayExpenses=0;s.dayOverhead=0;s.dayNet=0;s.dayRating=0;s.dayReputationDelta=0;s.mistakes=0;s.wrongAttempted=false;s.loyaltyTips=0;s.phase="operating";s.windowOpen=false;s.spoken=false;s.notice="新的一天开始啦，店里还有存货，记得开窗营业。";s.revision++;return true;
}
export function validate(s){
 if(s?.version!==3)return false;
 if(!recyclingValid(s)||!validateObjects(s))return false;
 if(s.counter!==null&&!GOODS[s.counter])return false;
 // Legacy v3 saves have no upgrades field; they are treated as level zero.
 if(s.upgrades!==undefined&&(!s.upgrades||typeof s.upgrades!=="object"||Array.isArray(s.upgrades)||
   !Number.isInteger(s.upgrades.shelves)||s.upgrades.shelves<0||s.upgrades.shelves>SHELF_UPGRADE_COSTS.length||
   (s.upgrades.heating!==undefined&&s.upgrades.heating!==0&&s.upgrades.heating!==1)))return false;
 for(const field of ["dayExpenses","dayOverhead","totalOverhead"])
   if(s[field]!==undefined&&(!Number.isSafeInteger(s[field])||s[field]<0))return false;
 if(s.dayNet!==undefined&&!Number.isSafeInteger(s.dayNet))return false;
 if(s.reputation!==undefined&&(!Number.isInteger(s.reputation)||s.reputation<0||s.reputation>100))return false;
 if(s.dayRating!==undefined&&(!Number.isInteger(s.dayRating)||s.dayRating<0||s.dayRating>5))return false;
 if(s.dayReputationDelta!==undefined&&(!Number.isInteger(s.dayReputationDelta)||s.dayReputationDelta< -8||s.dayReputationDelta>12))return false;
 if(s.wrongAttempted!==undefined&&typeof s.wrongAttempted!=="boolean")return false;
 for(const field of ["mistakes","totalMistakes","loyaltyTips","totalLoyaltyTips"])
   if(s[field]!==undefined&&(!Number.isSafeInteger(s[field])||s[field]<0))return false;
 if(s.favorDone!==undefined&&typeof s.favorDone!=="boolean")return false;
 for(const field of ["favorCount","favorTips","totalFavors"])
   if(s[field]!==undefined&&(!Number.isSafeInteger(s[field])||s[field]<0))return false;
 if(!Array.isArray(s.returns||[])||(s.returns||[]).some(sku=>!GOODS[sku]))return false;
 for(const p of Object.values(s.players||{}))if((p.hand&&!GOODS[p.hand])||(p.restock&&!GOODS[p.restock]))return false;
 for(const [key,f] of Object.entries(FIXTURES)){
   const v=s.slots?.[key];if(!v||!Number.isInteger(v.qty)||v.qty<0)return false;
   if(v.lastSku!==undefined&&v.lastSku!==null&&!GOODS[v.lastSku])return false;
   if(v.qty>0&&(!GOODS[v.sku]||v.qty>slotRoom(key,v.sku,s)))return false;
   if(v.qty===0&&v.sku!==null)return false;
 }
 return true;
}
