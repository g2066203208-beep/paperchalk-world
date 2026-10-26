// Untitled game: pure multiplayer rules (authoritative host only).
const STORIES=[
 {id:"umbrella",name:"顾盈",age:"24",look:"01",order:"要一把旧式折叠伞。她说昨天把自己的落在这里。",voice:"我没有带伞，真的。能找一把和以前一样的吗？",trueHuman:true,
 clues:{counter:"顾客认得柜台上的猫铃，提到上周坏过一次。",shelf:"雨伞货架只剩一把蓝边伞，价签是上周换的新价。",ledger:"旧账：七天前确实卖过两把蓝边伞，收据都有签名。",window:"窗边玻璃有一把靠在门外的同款伞，雨水未干。"},explain:"她确实回来找落下的伞。旧账和门外遗失物能相互印证。"},
 {id:"bell",name:"孟岸",age:"32",look:"02",order:"他只想借打火机，却从未抬头看过收银台。",voice:"你们店铃今天没有响啊。",trueHuman:false,
 clues:{counter:"他明明从大门进入，却知道猫铃今天没响过。",shelf:"挂钩上的打火机包装完好；货架温度计却瞬间降了两度。",ledger:"登记本只有孟岸十年前搬走的地址；本周没有任何消费记录。",window:"他在玻璃里的倒影比本人早半秒转头，猫铃却没动。"},explain:"窗户倒影领先身体，旧地址和反常对话共同指向借脸者。"},
 {id:"milk",name:"罗原",age:"46",look:"03",order:"神情紧张地退回一瓶未开封的牛奶。",voice:"瓶子上的日期还没到。我有点事，所以想退货。",trueHuman:true,
 clues:{counter:"他的袖口沾着颜料，手里攥着医院缴费单。",shelf:"冰柜当天停电十分钟；牛奶变温与他无关。",ledger:"收据的日期确实是昨天，付款尾号对得上。",window:"橱窗里他的倒影与动作同步；他似乎在找路边的出租车。"},explain:"牛奶温度异常来自店铺停电；他只是着急赶去医院。"},
 {id:"salt",name:"余舟",age:"21",look:"04",order:"他反复要同一包盐，每次说的价格都不同。",voice:"别找零了。我知道你们这包盐多少钱。",trueHuman:false,
 clues:{counter:"他第一次说四元，第二次说六元，却坚持从没改口。",shelf:"价签固定为三元；货架上有一包封口方向颠倒的盐。",ledger:"近七天没有此人交易，但监控打印机吐出一张明日的收据。",window:"雨夜路灯照出双重阴影，其中一个没有随着他挪步。"},explain:"他带来了时间错位的收据与不符合光源的影子。"},
 {id:"scarf",name:"白禾",age:"27",look:"05",order:"一个小女孩替妈妈来买止咳糖浆，却拿错了药名。",voice:"对不起……妈妈总把这个名字读错。",trueHuman:true,
 clues:{counter:"她记得妈妈常买的葡萄糖；不愿解释脏掉的围巾。",shelf:"药柜没有她说的品牌，只有成分相同的旧款。",ledger:"熟客备注写着：白禾听力不好，妈妈一直陪她来店。",window:"窗外有人焦急等待，听到她名字立即挥手。"},explain:"她因听力问题记错名称，是正常顾客。"},
 {id:"ticket",name:"张离",age:"38",look:"06",order:"戴着干燥的帽子，说想买昨天已经停产的车票。",voice:"昨天的末班车，一定还可以坐吧？",trueHuman:false,
 clues:{counter:"他从口袋掏出的硬币印着从未发行的年份。",shelf:"交通卡展示牌早已撤掉，不存在售票功能。",ledger:"旧账最后一笔车票交易是二十年前，那时这间店还没开。",window:"大雨中他的肩膀完全干燥，鞋底也没有水。"},explain:"他试图使用不存在的发行年份与交易记录，雨夜却没有沾水。"},
 {id:"lamp",name:"贺春",age:"63",look:"07",order:"老人要给店里修一盏坏掉的灯，执意不收钱。",voice:"你爹年轻时替我修过车。人情债要还的。",trueHuman:true,
 clues:{counter:"他说话停顿多，却知道柜台下那道旧划痕的来历。",shelf:"灯具包装写着已经绝版的厂家，老人确实带了维修零件。",ledger:"十年前的旧账有一条备注：贺师傅欠一顿饭。",window:"雨水顺着他的伞滴落，在地上留下真实的湿脚印。"},explain:"老人记忆模糊，但与店铺十年前的真实记录相吻合。"},
 {id:"mirror",name:"闻燕",age:"29",look:"08",order:"她想寄存一面小镜子，说有人一直跟着她。",voice:"我看见的不是自己。你们店里有遮光布吗？",trueHuman:true,
 clues:{counter:"她一直避免直接看镜子，有明显的惊恐反应。",shelf:"镜面上是普通水渍；拭净后反射正常。",ledger:"昨天有人报案尾随她，这件事早有记录。",window:"有人在街对面徘徊，那人的影子却几乎看不到。"},explain:"她可能正在被借脸者跟踪；不能把受害者误判为伪人。"},
 {id:"knock",name:"顾盈",age:"24",look:"01",order:"一模一样的顾盈再次回来，想取走店里的旧伞。",voice:"我上次已经付过钱了，你怎么不记得？",trueHuman:false,
 clues:{counter:"她不认得坏掉的猫铃，却记得第一位顾盈的名字。",shelf:"蓝边伞有泥痕，她伸手时泥痕短暂消失。",ledger:"两个顾盈的签名字形完全一样，笔压却方向相反。",window:"她站在灯下，玻璃只映出挂在门口的蓝边伞。"},explain:"这个“顾盈”复制了真实顾客的外表，却没有她的共同记忆。"}
];
// Shelf-to-counter physical handoff. The host owns all item positions and verdict effects.
export const CATALOG=Object.freeze({
 umbrella:{name:"蓝边折叠伞"},
 lighter:{name:"铜壳打火机"},
 milk:{name:"玻璃牛奶瓶"},
 salt:{name:"粗盐纸袋"},
 syrup:{name:"旧款止咳糖浆"},
 ticket:{name:"旧车票样本"},
 bulb:{name:"旧式灯泡"},
 mirror:{name:"小圆镜"}
});
const REQUESTED={umbrella:"umbrella",bell:"lighter",milk:"milk",salt:"salt",scarf:"syrup",ticket:"ticket",lamp:"bulb",mirror:"mirror",knock:"umbrella"};
function newShop(g){
 const visitor=currentVisitor(g),wanted=visitor&&REQUESTED[visitor.id],keys=Object.keys(CATALOG);
 if(!wanted)return {shelf:[],counter:null,scanned:false,success:false,mistakes:0,feedback:""};
 const i=keys.indexOf(wanted);
 return {shelf:[wanted,keys[(i+1)%keys.length],keys[(i+3)%keys.length]],counter:null,scanned:false,success:false,mistakes:0,feedback:"请在货架挑选商品，送到柜台核对。"};
}
export function shopView(g){return g.shop||newShop(g);}
export const STATIONS=["counter","window","shelf","ledger"];
export const STATION_NAMES={counter:"柜台",window:"临街窗",shelf:"货架",ledger:"旧账"};
export const MAX_PLAYERS=4;
const MAX_VISITORS=9;
function rand(seed){let a=(seed>>>0)||1;return ()=>{a|=0;a=a+0x6d2b79f5|0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
export function makeQueue(seed){
 const r=rand(seed),a=[...STORIES];
 for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
 // Keep duplicate-faced plot twist for the end if present.
 const first=a.findIndex(c=>c.id==="umbrella"),last=a.findIndex(c=>c.id==="knock");
 if(last<first&&last!==-1){const copy=a.splice(last,1)[0];a.push(copy);}
 return a.map(c=>c.id);
}
export function currentVisitor(game){return STORIES.find(c=>c.id===game.queue[game.index])||null;}
export function createGame(seed=Date.now()){
 const g={version:2,seed:seed>>>0,queue:makeQueue(seed),index:0,night:1,players:{},pins:[],votes:{},opened:{},asks:0,waiting:false,trust:5,supplies:8,danger:0,points:0,history:[],phase:"running",revision:0,notice:"今晚的第一位客人正在敲门。"};
 g.shop=newShop(g);return g;
}
export function joinGame(g,id,name){
 if(g.players[id]||Object.keys(g.players).length>=MAX_PLAYERS||g.phase!=="running")return false;
 g.players[id]={id,name:String(name||"值班员").trim().slice(0,14)||"值班员",station:"counter",votes:0};g.revision++;return true;
}
export function leaveGame(g,id){if(!g.players[id])return;delete g.players[id];delete g.votes[id];g.revision++;}
export function publicVisitor(g){
 const c=currentVisitor(g);return c?{id:c.id,name:c.name,age:c.age,look:c.look,order:c.order,voice:c.voice}:null;
}
export function revealedClue(g,station){const c=currentVisitor(g);return c&&g.opened[station]?c.clues[station]:null;}
function complete(g,choice){
 const c=currentVisitor(g),correct=(choice==="welcome")===c.trueHuman;
 const entry={name:c.name,choice,correct,explain:c.explain,night:g.night,id:c.id};
 g.history.unshift(entry);g.history=g.history.slice(0,15);
 g.points+=correct?60:0;g.trust=Math.max(0,Math.min(8,g.trust+(correct?1:-2)));
 g.danger=Math.max(0,Math.min(8,g.danger+(!correct&&!c.trueHuman?2:0)-(correct?1:0)));
 g.supplies=Math.max(0,g.supplies-(choice==="welcome"?1:0));
 g.notice=correct?"这一回，你们看清了真相。":c.trueHuman?"你们错过了一位真正的客人。":"有人借着熟悉的脸走进了店里。";
 g.index++;g.night=Math.floor(g.index/3)+1;
 g.opened={};g.pins=[];g.votes={};g.asks=0;g.waiting=false;g.shop=newShop(g);
 if(g.index>=MAX_VISITORS||g.trust<=0||g.danger>=6){
   g.phase=g.trust<=0?"closed":g.danger>=6?"overrun":"complete";
   g.notice=g.phase==="complete"?"天亮了。小店还在。":g.phase==="closed"?"小店失去了街坊的信任。":"店里出现了不属于任何人的影子。";
 }
}
export function act(g,id,payload){
 if(g.phase!=="running"||!g.players[id]||!payload||typeof payload!=="object")return false;
 const type=payload.type,station=String(payload.station||"");
 if(!g.shop)g.shop=newShop(g); // Migrate existing version-2 browser saves without changing their storage key.
 const shop=g.shop,role=g.players[id].station;
 if(type==="station"&&STATIONS.includes(station)){g.players[id].station=station;g.revision++;return true;}
 if(type==="inspect"&&STATIONS.includes(station)){
   // Clues are public after any player investigates; shared board still needs deliberate pinning.
   if(!g.opened[station]){g.opened[station]=true;g.revision++;}
   return true;
 }
 if(type==="pin"&&STATIONS.includes(station)&&g.opened[station]){
   if(!g.pins.includes(station)){g.pins.push(station);g.revision++;}
   return true;
 }
 if(type==="take"&&role==="shelf"&&!shop.counter&&typeof payload.sku==="string"&&shop.shelf.includes(payload.sku)){
   shop.shelf.splice(shop.shelf.indexOf(payload.sku),1);shop.counter=payload.sku;shop.scanned=false;
   shop.feedback=CATALOG[payload.sku].name+"已送到柜台，等待柜员核对。";g.notice=shop.feedback;g.revision++;return true;
 }
 if(type==="return"&&role==="counter"&&shop.counter&&!shop.success){
   shop.shelf.unshift(shop.counter);shop.counter=null;shop.scanned=false;
   shop.feedback="商品已退回货架，可重新挑选。";g.notice=shop.feedback;g.revision++;return true;
 }
 if(type==="scan"&&role==="counter"&&shop.counter&&!shop.scanned){
   shop.scanned=true;
   if(shop.counter===REQUESTED[currentVisitor(g).id]){
     shop.success=true;g.points+=10;shop.feedback="核对正确：商品与客人要求一致。";
   }else{
     shop.mistakes++;g.trust=Math.max(0,g.trust-1);
     shop.feedback="商品拿错了！顾客失去耐心，街坊信任 -1。请退回重选。";
   }
   g.notice=shop.feedback;g.revision++;return true;
 }
 if(type==="ask"&&g.asks<2){g.asks++;g.notice=g.asks===1?"顾客停下来，等待你们调查。":"顾客催促着要离开，店门外的雨更大了。";g.revision++;return true;}
 if(type==="vote"&&(payload.choice==="welcome"||payload.choice==="refuse")){
   g.votes[id]=payload.choice;
   const tally=Object.values(g.votes).filter(v=>v===payload.choice).length;
   const quorum=Math.floor(Object.keys(g.players).length/2)+1;
   if(tally>=quorum){complete(g,payload.choice);}
   else{g.notice="已记录一票。需要同伴达成多数意见。";}
   g.revision++;return true;
 }
 return false;
}
export function testPatterns(){return STORIES.map(v=>({id:v.id,human:v.trueHuman}));}
