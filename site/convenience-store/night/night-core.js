/* Paperchalk night shift: deterministic rule-horror / real checkout / save.
 * Independent of the ring-world runtime; no combat or forced night entry. */
(function(root,factory){'use strict';const api=factory();if(root)root.PaperWorldNightStore=api;if(typeof module==='object'&&module.exports)module.exports=api})(typeof window==='object'?window:null,function(){
'use strict';
const VERSION=1,KEY='paperchalk-night-store-1';
const PRODUCTS=Object.freeze([
 ['cola','可乐',5,'🥤'],['onigiri','饭团',8,'🍙'],['bread','面包',7,'🥖'],
 ['tea','茶饮',6,'🍵'],['milk','牛奶',9,'🥛'],['bento','便当',18,'🍱'],
 ['salt','盐',4,'🧂'],['blackmilk','黑袋牛奶',11,'🥛'],['candle','白蜡烛',6,'🕯️']
].map(([id,name,price,icon])=>Object.freeze({id,name,price,icon})));
const byId=Object.fromEntries(PRODUCTS.map(p=>[p.id,p]));
const ORDERS=Object.freeze([
 {who:'夜班护士',at:0,items:['tea','bread']},
 {who:'放学的学生',at:48,items:['cola','onigiri']},
 {who:'出租车司机',at:104,items:['bento','tea']},
 {who:'和第一次一模一样的顾客',at:220,items:['tea','bread'],repeat:true},
 {who:'不愿抬头的客人',at:268,items:['salt','blackmilk','candle'],special:true},
 {who:'凌晨的通勤者',at:355,items:['milk','bread']}
].map(x=>Object.freeze(x)));
const RULES=Object.freeze([
 {id:'01',source:'正式交接单',text:'每件商品均须扫码后收款；完成收款才能交付。',kind:'normal'},
 {id:'02',source:'正式交接单',text:'缺货时前往货架补货，清洁工作请在无客人等待时进行。',kind:'normal'},
 {id:'03',source:'正式交接单',text:'员工休息室和仓库只允许值班人员进入。',kind:'normal'},
 {id:'04',source:'正式交接单',text:'监控录像为核查异常的依据，不以未经证实的传言代替。',kind:'normal'},
 {id:'05',source:'正式交接单',text:'06:00 交接之前不得擅自结束班次。',kind:'normal'},
 {id:'06',source:'店长短信·已核实',text:'01:17 之后戴帽子的顾客进店，不要主动与他搭话。',kind:'verified'},
 {id:'07',source:'店长短信·已核实',text:'若监控4号出现另一个自己，关闭电闸，等满十秒再恢复。',kind:'verified'},
 {id:'08',source:'店长短信·已核实',text:'若冷柜监控出现第六个人，而店内只有五人，不要去冷柜核实。',kind:'verified'},
 {id:'09',source:'店长短信·已核实',text:'盐、黑袋牛奶、白蜡烛同时出现时正常收款，但绝对不要装袋。',kind:'verified'},
 {id:'10',source:'店长短信·已核实',text:'自动门连续开启三次却无人进店，先锁门并检查监控。',kind:'verified'},
 {id:'11',source:'无署名纸条·存疑',text:'听见仓库里有人敲门，立即打开仓库门核实。',kind:'false'},
 {id:'12',source:'不明来电·存疑',text:'电话连续响三次时，无论是谁都必须接通。',kind:'false'}
]);
const EVENTS=Object.freeze([
 {id:'door1',at:52,title:'空门',text:'自动门响了一声。玻璃门外没人。',level:1},
 {id:'door3',at:96,title:'自动门',text:'叮咚、叮咚、叮咚。门连续开了三次，门外依然空无一人。',level:2},
 {id:'rules',at:125,title:'来自店长的短信',text:'短信写着新增的夜班规则，附有一张值班手册的照片。',level:1},
 {id:'hood',at:137,title:'01:17 · 帽檐下',text:'门口出现一个始终低头的顾客。他站着，没有拿商品。',level:2},
 {id:'self',at:173,title:'监控四号',text:'监控屏突然弹出一格录像：画面中你正在收银……但你此刻站在监控前。',level:3},
 {id:'sixth',at:232,title:'人数不对',text:'冷柜区摄像头中出现了第六个轮廓。现实里根本没有那么多人。',level:3},
 {id:'fake',at:290,title:'无署名纸条',text:'仓库门下塞进了一张便条：听见敲门声就打开仓库门。没有署名。',level:3},
 {id:'knock',at:303,title:'仓库传来敲门声',text:'后方连续响起三下敲门声。便条像在催你过去。',level:3},
 {id:'call',at:337,title:'电话响了三次',text:'值班电话连续响了三次，屏幕上没有号码。',level:3},
 {id:'record',at:373,title:'上一任员工的记录',text:'你发现一条被隐藏的监控记录：上一任员工也是在接通那个电话后消失的。',level:4},
 {id:'dawn',at:407,title:'清晨的第一辆公交车',text:'玻璃门外终于有车驶过，天色有了真实的灰白。',level:1}
]);
const clone=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const defaultState=()=>({version:VERSION,started:false,finished:false,ending:'',elapsed:0,scene:'counter',
 money:0,wage:0,energy:100,stress:0,violations:0,trust:0,insight:0,customers:0,
 inventory:Object.fromEntries(PRODUCTS.map(p=>[p.id,7])),order:null,orderIndex:0,selected:null,
 scanned:[],paid:false,flags:{},incidents:[],log:[],manualRead:false,phoneRead:false,
 power:'on',powerUntil:0,door:'open',notes:[],mistakes:0});
function valid(s){return s&&s.version===VERSION&&Number.isFinite(s.elapsed)&&s.elapsed>=0&&s.elapsed<=420&&Number.isInteger(s.orderIndex)&&s.orderIndex>=0&&s.orderIndex<=ORDERS.length&&Array.isArray(s.incidents)&&Array.isArray(s.log)&&s.flags&&typeof s.flags==='object'&&s.inventory&&PRODUCTS.every(p=>Number.isInteger(s.inventory[p.id])&&s.inventory[p.id]>=0)}
function create({storage=null}={}){
 let s=defaultState(),subs=new Set();
 try{const saved=JSON.parse(storage?.getItem(KEY)||'null');if(valid(saved))s=saved}catch(_){}
 const snapshot=()=>clone(s),persist=()=>{try{storage?.setItem(KEY,JSON.stringify(s));return true}catch(_){return false}};
 function log(msg){s.log.unshift({minute:s.elapsed,text:msg});s.log=s.log.slice(0,65)}
 function emit(type='change'){persist();for(const fn of subs)try{fn(snapshot(),type)}catch(_){}}
 function success(note='',type='change'){if(note)log(note);emit(type);return {ok:true,note}}
 function fail(note){emit('refused');return {ok:false,note}}
 function effect(tag,note,{bad=false,insight=0}={}){
  if(s.flags['resolved:'+tag])return false;
  s.flags['resolved:'+tag]=true;
  if(bad){s.violations++;s.stress=clamp(s.stress+19,0,100);log('规则失守：'+note)}
  else{if(insight)s.insight+=insight;log(note)}
  return true;
 }
 function resolveEnding(){if(s.finished)return;
  s.finished=true;s.order=null;s.incidents=[];
  if(s.violations>=3||s.flags['openedKnock']||s.flags['answeredUnknown'])s.ending='replaced';
  else if(s.insight>=4&&s.violations===0&&s.flags['archive'])s.ending='truth';
  else s.ending='survive';
  s.wage=480+s.customers*45-Math.min(150,s.mistakes*10);s.money+=s.wage;
  log(s.ending==='replaced'?'天亮了。门口的监控里，有人代替你走了出去。':
  s.ending==='truth'?'06:00。你带着录像离开了便利店；这一次交接单上的名字不是你。':'06:00。你平安下班，店长只问了一句：昨天有人来过吗？');
  emit('ending');
 }
 function trigger(){
  if(!s.started||s.finished)return;
  if(s.power==='off'&&s.elapsed>=s.powerUntil){s.power='on';effect('self','已按要求断电十秒；监控4号的影像消失。',{insight:1})}
  for(const ev of EVENTS)if(s.elapsed>=ev.at&&!s.flags['event:'+ev.id]){
   s.flags['event:'+ev.id]=true;
   s.incidents.push(ev.id);log(ev.text);
   if(ev.id==='rules')s.phoneRead=false;
   if(ev.id==='door3')s.flags['doorDeadline']=s.elapsed+26;
   if(ev.id==='record')s.flags['archiveAvailable']=true;
  }
  if(s.flags['doorDeadline']&&!s.flags['resolved:door3']&&s.elapsed>s.flags['doorDeadline']){
   effect('door3','无人进入时忘了锁门。',{bad:true});s.flags['doorDeadline']=0;
  }
  if(s.flags['event:hood']&&!s.flags['resolved:hood']&&s.elapsed>=165)effect('hood','你没有主动搭话，低头的顾客自行离开。',{insight:1});
  if(s.flags['event:sixth']&&!s.flags['resolved:sixth']&&s.elapsed>=265)effect('sixth','你没有前往冷柜；监控里多出的人影消失了。',{insight:1});
  if(s.flags['event:knock']&&!s.flags['resolved:knock']&&s.elapsed>=334)effect('knock','你没有打开仓库门；敲门声自己停了。',{insight:1});
  if(s.flags['event:call']&&!s.flags['resolved:call']&&s.elapsed>=370)effect('call','你没有接听不明来电；电话终于安静。',{insight:1});
  if(!s.order&&s.orderIndex<ORDERS.length){const next=ORDERS[s.orderIndex];if(s.elapsed>=next.at){s.order=clone(next);s.selected=null;s.scanned=[];s.paid=false;log('顾客走到柜台：'+next.who)}}
  if(s.elapsed>=420)resolveEnding();
 }
 function advance(minutes=1){if(!s.started||s.finished)return fail('夜班未开始或已经结束');if(!Number.isFinite(minutes)||minutes<0||minutes>240)return fail('无效时间');s.elapsed=clamp(s.elapsed+Math.round(minutes),0,420);s.energy=clamp(s.energy-minutes*.055,0,100);trigger();emit('time');return {ok:true,note:'时间流逝'};}
 function start(){if(s.started)return fail('已在值班中');s.started=true;s.elapsed=0;log('23:00。第一晚开始。值班手册压在收银台下面。');trigger();return success('欢迎上夜班。完成收银工作，也别忘记看交接单。','start')}
 function move(scene){if(!s.started||s.finished)return fail('现在无法移动');if(!['counter','aisle','cooler','stockroom','office','entrance'].includes(scene))return fail('无效区域');
  if(scene==='cooler'&&s.flags['event:sixth']&&!s.flags['resolved:sixth'])effect('sixth','你走进冷柜区，亲眼看见了第六个人。',{bad:true});
  if(scene==='stockroom'&&s.flags['event:knock']&&!s.flags['resolved:knock']){effect('knock','你听信纸条，打开仓库门。',{bad:true});s.flags.openedKnock=true;}
  s.scene=scene;advance(4);return success('进入'+({counter:'收银台',aisle:'货架区',cooler:'冷柜区',stockroom:'仓库',office:'员工室',entrance:'门口'}[scene]));
 }
 function select(id){if(s.finished||!s.order||!byId[id])return fail('当前没有可选商品');s.selected=id;return success('拿起'+byId[id].name)}
 function scan(id=s.selected){if(!s.order||s.finished)return fail('没有待结账的顾客');if(s.paid)return fail('已完成收款');const need=s.order.items.filter(x=>x===id).length;const have=s.scanned.filter(x=>x===id).length;
  if(!byId[id]||!need||have>=need){s.mistakes++;s.stress=clamp(s.stress+2,0,100);return fail('商品不在本次订单里，或已经扫过')}
  if(s.inventory[id]<=0)return fail('该商品缺货，先去补货');s.inventory[id]--;s.scanned.push(id);s.selected=null;advance(4);return success('扫码 '+byId[id].name+' ✓')}
 function charge(){if(!s.order||s.paid)return fail('暂无待收款订单');if(s.order.items.length!==s.scanned.length||s.order.items.some(id=>s.order.items.filter(x=>x===id).length!==s.scanned.filter(x=>x===id).length))return fail('商品还没扫完');s.paid=true;advance(3);return success('收款成功，等候交货')}
 function handoff(withBag){if(!s.order||!s.paid)return fail('需先完成扫码和收款');if(s.order.special&&withBag){effect('special','你把那三样商品装进了购物袋。',{bad:true});s.flags.badSpecial=true}
  if(s.order.special&&!withBag)effect('special','你把盐、黑袋牛奶和白蜡烛直接推过去，没有装袋。',{insight:1});
  s.customers++;s.money+=Math.max(0,s.order.items.reduce((t,id)=>t+byId[id].price,0));s.orderIndex++;s.order=null;s.scanned=[];s.paid=false;s.selected=null;advance(7);return success('顾客离开，交易完成')}
 function restock(){if(!s.started||s.finished)return fail('未在工作');if(!['stockroom','aisle','counter'].includes(s.scene))return fail('需要去仓库或货架');const item=PRODUCTS.reduce((a,b)=>s.inventory[b.id]<s.inventory[a.id]?b:a,PRODUCTS[0]);s.inventory[item.id]+=4;advance(12);return success('从纸箱取出 '+item.name+' ×4，补货完成')}
 function clean(){if(!s.started||s.finished)return fail('未在工作');if(s.order)return fail('请先完成正在等待的顾客订单');advance(10);s.stress=clamp(s.stress-4,0,100);return success('清理地面，拖把划过空荡的走道')}
 function camera(id){if(!s.started||s.finished)return fail('未在工作');if(!Number.isInteger(id)||id<1||id>6)return fail('没有该路监控');s.flags['cam:'+id]=true;
  if(id===4&&s.flags['event:self']&&!s.flags['resolved:self'])s.flags['sawSelf']=true;
  if(id===3&&s.flags['event:sixth']&&!s.flags['resolved:sixth'])s.flags['sawSixth']=true;
  advance(2);return success('监控 '+id+' 号：'+(id===4&&s.flags.sawSelf?'画面中的人和你穿着一样。':id===3&&s.flags.sawSixth?'冷柜区比现实多出一个人。':'低分辨率画面暂时正常'));
 }
 function power(){if(!s.started||s.finished)return fail('未在工作');if(s.power==='off')return fail('正在断电倒计时');if(!s.flags.sawSelf)return fail('暂时没有理由切断监控电源');s.power='off';s.powerUntil=s.elapsed+2;advance(2);return success('断电十秒。重新亮起的监控四号已经空了。')}
 function choose(action){if(!s.started||s.finished)return fail('未在工作');const map={
  lock:()=>{s.door='locked';if(s.flags['event:door3'])effect('door3','已锁门，监控显示店外无人。',{insight:1});return '门锁已扣上'},
  unlock:()=>{s.door='open';return '已解锁玻璃门'},
  greet:()=>{if(!s.flags['event:hood'])return '现在没有人站在门口';effect('hood','你主动向戴帽者问好，他抬起了脸。',{bad:true});return '对方缓缓抬头'},
  silent:()=>{if(!s.flags['event:hood'])return '暂时没有这样的顾客';effect('hood','你没有主动开口，戴帽的人离开了。',{insight:1});return '保持安静'},
  avoid:()=>{effect('sixth','没有前往冷柜，监控画面逐渐恢复正常。',{insight:1});return '没有靠近冷柜'},
  inspectSixth:()=>{effect('sixth','你去冷柜核实，那个轮廓贴在你身后。',{bad:true});s.scene='cooler';return '冰柜玻璃起了雾'},
  refuseKnock:()=>{effect('knock','你对无署名纸条保持怀疑，没有打开仓库门。',{insight:1});return '敲门声停了'},
  openKnock:()=>{effect('knock','你打开了仓库门。',{bad:true});s.flags.openedKnock=true;return '门后有人在呼吸'},
  ignoreCall:()=>{effect('call','你没有接听未知号码。',{insight:1});return '电话停止了'},
  answerCall:()=>{effect('call','你接通了没有号码的电话。',{bad:true});s.flags.answeredUnknown=true;return '你听见了自己的声音'},
  archive:()=>{if(!s.flags.archiveAvailable)return '记录仍被锁定';if(!s.flags.archive){s.flags.archive=true;s.insight+=1}return '找到了前夜失踪员工的监控记录'}
 };if(!map[action])return fail('无效操作');const note=map[action]();advance(5);return success(note)}
 function manual(){s.manualRead=true;persist();return RULES.filter(r=>r.kind!=='false'&&(r.kind==='normal'||s.flags['event:rules']))}
 function note(){s.phoneRead=true;persist();return RULES.filter(r=>r.kind==='false'&&(s.flags['event:fake']||r.id==='12'&&s.flags['event:call']))}
 function reset(){s=defaultState();emit('reset')}
 return Object.freeze({snapshot,persist,subscribe(fn){subs.add(fn);return()=>subs.delete(fn)},start,advance,move,select,scan,charge,handoff,restock,clean,camera,power,choose,manual,note,reset,products:PRODUCTS,rules:RULES,events:EVENTS,orders:ORDERS});
}
return Object.freeze({VERSION,KEY,PRODUCTS,RULES,EVENTS,ORDERS,create});
});
