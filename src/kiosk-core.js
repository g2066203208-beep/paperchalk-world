// Shared, deterministic shop rules. Actions validated exclusively at room host.
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
export const CUSTOMERS=[
 {name:"卫叔",sku:"tea",line:"冻得耳朵都快掉了！来一杯热茶。",after:"喝了一口，才发现自己戴了两顶帽子。",tone:0},
 {name:"小苏",sku:"bread",line:"一块面包。别问为什么我只穿一只手套。",after:"她笑着把另一只手套从口袋里掏出来。",tone:1},
 {name:"赵大爷",sku:"battery",line:"两节电池！我家遥控器一直在换台。",after:"他说电视关着时也会换台。",tone:2},
 {name:"阿默",sku:"cocoa",line:"可可有吗？我的雪人要喝。",after:"门外雪人竟然朝店里点了点头。",tone:3},
 {name:"燕子",sku:"tea",line:"热茶一杯，给你们店长带句好。",after:"她把一张写着笑话的便条留在窗边。",tone:1},
 {name:"老周",sku:"bread",line:"面包有吗？我老婆让我买点正经东西。",after:"他又问这里有没有卖勇气的。",tone:0},
 {name:"快递员",sku:"battery",line:"电池一份，配送车被冻得不听话。",after:"他用新电池装在手电筒里，终于找到车了。",tone:2},
 {name:"某位熟客",sku:"cocoa",line:"可可来一份；别跟邻居说我喜欢甜的。",after:"结果邻居早就在队伍后面偷笑。",tone:3}
];
export function initialShop(){
 const slots={};for(const key of Object.keys(FIXTURES))slots[key]={sku:null,qty:0};
 slots.shelfL1={sku:"tea",qty:2};
 slots.shelfL2={sku:"bread",qty:2};
 slots.shelfR1={sku:"battery",qty:2};
 slots.drawerL={sku:"cocoa",qty:2};
 return {version:3,day:1,cash:100,earnings:0,stars:0,served:0,totalServed:0,
  phase:"operating",windowOpen:false,open:{cabinetL:false,cabinetR:false,drawerL:false,drawerR:false},
  slots,hand:null,counter:null,orderIndex:0,spoken:false,queue:0,selectedRestock:null,
  players:{},returns:[],notice:"先点窗闩开窗营业，再从货架拿商品。",revision:0};
}
export function visitor(s){return CUSTOMERS[s.orderIndex % CUSTOMERS.length];}
function putBack(s,sku,origin){
 const keys=[origin,...Object.keys(FIXTURES)].filter((k,i,all)=>FIXTURES[k]&&all.indexOf(k)===i);
 for(const k of keys){const v=s.slots[k];if(v&&(!v.sku||v.sku===sku)&&v.qty<slotRoom(k,sku)){v.sku=sku;v.qty++;return;}}
 if(!s.counter)s.counter=sku;else(s.returns??=[]).push(sku);
}
export function join(s,id,name){
 if(s.players[id]||Object.keys(s.players).length>=4)return false;
 const first=Object.keys(s.players).length===0;
 const p={id,name:String(name||"店员").slice(0,14),role:first?"manager":"clerk",hand:null,origin:null,restock:null};
 if(first&&GOODS[s.hand]){p.hand=s.hand;s.hand=null;}
 if(first&&GOODS[s.selectedRestock]){p.restock=s.selectedRestock;s.selectedRestock=null;}
 s.players[id]=p;s.revision++;return true;
}
export function leave(s,id){
 const p=s.players[id];if(!p)return;
 if(p.hand)putBack(s,p.hand,p.origin);
 delete s.players[id];s.revision++;
}
export function resumeSolo(s,name){
 const held=[];
 if(GOODS[s.hand])held.push({sku:s.hand,origin:null});
 for(const p of Object.values(s.players||{}))if(GOODS[p.hand])held.push({sku:p.hand,origin:p.origin});
 const restock=GOODS[s.selectedRestock]?s.selectedRestock:null;
 s.players={};s.hand=null;s.selectedRestock=null;join(s,"solo",name);
 const first=held.shift();if(first){s.players.solo.hand=first.sku;s.players.solo.origin=first.origin;}
 for(const p of held)putBack(s,p.sku,p.origin);
 if(restock)s.players.solo.restock=restock;
 return s;
}
export function visible(s,key){const f=FIXTURES[key];return f&& (f.kind==="shelf" || Boolean(s.open[key]));}
export function slotRoom(key,sku){return Math.floor(FIXTURES[key].capacity/GOODS[sku].size);}
export function apply(s,by,a){
 if(!s||s.version!==3||!s.players[by]||s.phase!=="operating"||!a||typeof a!=="object")return false;
 const p=s.players[by];
 let {cmd,key,sku}=a;
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
      else if(slot.qty>=slotRoom(key,kind)){s.notice="这一格已经放满。";return false;}
      else{slot.sku=kind;slot.qty++;s.cash-=cost;s.notice="进货成功："+thing.name+" ×1 放入"+FIXTURES[key].label;p.restock=null;}
    }else if(p.hand){
      if(slot.sku&&slot.sku!==p.hand){s.notice="这格摆的是其他商品。";return false;}
      if(slot.qty>=slotRoom(key,p.hand)){s.notice="位置太小，放不下。";return false;}
      slot.sku=p.hand;slot.qty++;s.notice="把"+GOODS[p.hand].name+"放回了"+FIXTURES[key].label;p.hand=null;p.origin=null;
    }else if(slot.qty>0){
      p.hand=slot.sku;p.origin=key;slot.qty--;if(slot.qty===0)slot.sku=null;
      s.notice="拿起了"+GOODS[p.hand].name+"。现在点柜台放下。";
    }else{s.notice="这里还空着。可先选择进货，再点这个位置。";}
 }
 else if(cmd==="counter"){
    if(p.hand&&s.counter===null){s.counter=p.hand;p.hand=null;p.origin=null;s.notice="商品放到了交接台。";}
    else if(!p.hand&&s.counter){p.hand=s.counter;p.origin=null;s.counter=null;s.notice="把商品从交接台拿了起来。";}
    else if(!p.hand&&!s.counter&&s.returns?.length){p.hand=s.returns.shift();p.origin=null;s.notice="从待领回商品中取出了"+GOODS[p.hand].name;}
    else return false;
 }
 else if(cmd==="restock" && GOODS[sku]){
    if(p.role!=="manager"||p.hand)return false;
    p.restock=p.restock===sku?null:sku;
    s.notice=p.restock?"请选择一个有空位的货架、柜子或抽屉，放入"+GOODS[sku].name:"已取消进货";
 }
 else if(cmd==="talk"){
    if(!s.windowOpen){s.notice="先开窗，才能听到顾客。";return false;}
    s.spoken=true;s.notice=visitor(s).line;
 }
 else if(cmd==="sell"){
    if(!s.windowOpen){s.notice="窗没打开，客人听不见。";return false;}
    if(!s.counter){s.notice="交接台上还没有商品。";return false;}
    if(s.counter!==visitor(s).sku){s.notice=visitor(s).name+"摇了摇头：这不是我要的。请换货。";return false;}
    const price=GOODS[s.counter].price;s.cash+=price;s.earnings+=price;s.stars++;
    s.totalServed++;s.served++;s.notice=visitor(s).after+"  收款 ¥"+price;s.counter=null;s.spoken=false;s.orderIndex++;
    if(s.served>=5){s.phase="summary";s.notice="今日打烊！可以查看营业情况并开始第二天。";}
 }
 else if(cmd==="nextday" && s.phase==="summary"){} // resolved by explicit branch below
 else return false;
 s.revision++;return true;
}
export function nextDay(s,by){
 if(!s.players[by]||s.players[by].role!=="manager"||s.phase!=="summary")return false;
 s.day++;s.served=0;s.earnings=0;s.phase="operating";s.windowOpen=false;s.spoken=false;s.notice="新的一天开始啦，店里还有存货，记得开窗营业。";s.revision++;return true;
}
export function validate(s){
 if(s?.version!==3)return false;
 if(s.counter!==null&&!GOODS[s.counter])return false;
 if(!Array.isArray(s.returns||[])||(s.returns||[]).some(sku=>!GOODS[sku]))return false;
 for(const p of Object.values(s.players||{}))if((p.hand&&!GOODS[p.hand])||(p.restock&&!GOODS[p.restock]))return false;
 for(const [key,f] of Object.entries(FIXTURES)){
   const v=s.slots?.[key];if(!v||!Number.isInteger(v.qty)||v.qty<0)return false;
   if(v.qty>0&&(!GOODS[v.sku]||v.qty>slotRoom(key,v.sku)))return false;
   if(v.qty===0&&v.sku!==null)return false;
 }
 return true;
}
