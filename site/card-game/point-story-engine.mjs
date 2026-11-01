/* 失序之夜 / Chapter 01. Original point-and-click rule-horror narrative engine.
 * Narrative logic contains no WebGL, no 3D and no random deaths.
 * A rule's trigger and its consequence are deterministic and discoverable.
 */
export const VERSION=1;
export const SCENES={
 foyer:{name:'302室 · 玄关',subtitle:'门外传来了第三次敲门',desc:'狭窄的门厅里只有老式白炽灯。深棕色防盗门紧闭，鞋柜上的收音机早已停播。',
  spots:[
   {id:'peephole',label:'猫眼',x:50,y:39,icon:'◉'},
   {id:'door',label:'入户门',x:50,y:68,icon:'▣'},
   {id:'notice',label:'物业告示',x:24,y:45,icon:'▤'},
   {id:'cabinet',label:'鞋柜',x:75,y:72,icon:'⌕'},
   {id:'living',label:'返回客厅',x:8,y:67,icon:'←'}]},
 living:{name:'302室 · 客厅',subtitle:'电话指示灯闪烁着',desc:'窗帘没有拉严。旧电视的玻璃映出房间，但没有映出敲门的人。',
  spots:[
   {id:'radio',label:'收音机',x:65,y:66,icon:'◈'},
   {id:'phone',label:'答录机',x:29,y:68,icon:'☎'},
   {id:'window',label:'窗户',x:51,y:37,icon:'⌕'},
   {id:'foyer',label:'前往玄关',x:89,y:69,icon:'→'}]},
 peephole:{name:'302室 · 猫眼',subtitle:'圆形视野将走廊压缩成一条长线',desc:'视野里没有人。走廊尽头的安全出口灯仍然亮着。',
  spots:[
   {id:'emptyHall',label:'走廊尽头',x:50,y:48,icon:'⌕'},
   {id:'back',label:'离开猫眼',x:85,y:78,icon:'↩'}]},
 hallway:{name:'三楼公共走廊',subtitle:'这里的空气比室内更冷',desc:'302号门在你的身后。东侧是电梯，西侧是楼梯间。安全出口标识忽明忽暗。',
  spots:[
   {id:'stairs',label:'西侧楼梯间',x:24,y:52,icon:'←'},
   {id:'elevator',label:'东侧电梯',x:79,y:50,icon:'▣'},
   {id:'door301',label:'301室',x:39,y:55,icon:'⌕'},
   {id:'back302',label:'返回302室',x:50,y:80,icon:'↩'}]},
 stairs:{name:'三楼 · 安全楼梯',subtitle:'绿色的出口标牌指向一楼',desc:'往下的楼梯被一盏微弱的应急灯照亮。门外敲击声已完全停止。',
  spots:[
   {id:'exit',label:'沿楼梯下楼',x:50,y:70,icon:'↓'},
   {id:'backHall',label:'返回三楼',x:15,y:75,icon:'↩'}]}
};
export const RULES=[
 {id:'notice',title:'物业告示 / 第三条',body:'如果门外连续传来三声敲门，不要透过猫眼观察。邻居只会敲两次。',source:'玄关墙面',status:'待验证'},
 {id:'radio',title:'广播片段 / 避难通知',body:'敲门声停止后，确认楼道脚步声远去；不要乘坐电梯前往一楼。',source:'客厅收音机',status:'待验证'},
 {id:'phone',title:'电话答录机 / 未知留言',body:'“我就在门外，快开门。”留言显示时间是明天的18:47。',source:'客厅电话',status:'疑似伪造'},
 {id:'listened',title:'门内听诊 / 声音对比',body:'门外三声敲击之间没有正常人的换气停顿，最后一下似乎从门框内部传来。',source:'302室入户门',status:'观察记录'},
 {id:'hall',title:'走廊出口图 / 指示',body:'西侧防火楼梯连通一楼；东侧电梯近期出现异常停靠记录。',source:'三楼走廊',status:'现场记录'}
];
export function createGame(){
 return {version:VERSION,scene:'foyer',minute:18*60+47,sanity:100,attention:0,flags:{
  notice:false,radio:false,phone:false,listened:false,keys:false,peeked:false,waited:false,locked:true,hall:false
 },rules:[],inventory:[],sceneVisits:{foyer:1},choices:[],dialogue:{
  speaker:'旁白',text:'咚。咚。咚。\n第三次敲门过后，整个公寓忽然安静下来。',
  options:[{id:'continue',text:'查看玄关'}]},ending:null,history:[]};
}
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const clock=s=>String(Math.floor(s.minute/60)%24).padStart(2,'0')+':'+String(s.minute%60).padStart(2,'0');
function log(s,title){s.history.unshift(title);s.history=s.history.slice(0,10)}
function talk(s,speaker,text,options=[]){s.dialogue={speaker,text,options};log(s,speaker+'：'+text.replace(/\n/g,' '));}
function discover(s,id){
 if(!s.rules.includes(id))s.rules.push(id);
 if(Object.hasOwn(s.flags,id))s.flags[id]=true;
}
function scene(s,id,text){
 s.scene=id;s.sceneVisits[id]=(s.sceneVisits[id]||0)+1;
 talk(s,'旁白',text||SCENES[id].desc);
}
function time(s,n){s.minute+=n}
function risk(s,delta){s.attention=clamp(s.attention+delta,0,100);s.sanity=clamp(s.sanity-Math.round(delta*.6),0,100)}
function failed(s,title,description){s.ending={type:'lost',title,description};talk(s,'异常记录',description)}
function succeed(s){
 s.ending={type:'survived',title:'第一夜 · 生还',description:'你没有回应门外的第三个人。顺着西侧的安全楼梯离开了三楼。\n但电梯的楼层显示，仍停留在「302」。'};
 talk(s,'无线电记录',s.ending.description);
}
export function isEscapeReady(s){return s.flags.notice&&s.flags.radio&&s.flags.listened&&s.flags.waited}
export function inspect(s,id){
 if(s.ending)return false;
 if(s.dialogue.options?.length&&s.dialogue.options[0].id!=='continue')s.dialogue.options=[];
 const f=s.flags;
 switch(s.scene+':'+id){
  case 'foyer:notice':
   discover(s,'notice');talk(s,'物业告示','【第三条】若门外连续传来三声敲门，不要使用猫眼。\n邻居只会敲两次。');return true;
  case 'foyer:cabinet':
   f.keys=true;if(!s.inventory.includes('302室钥匙'))s.inventory.push('302室钥匙');
   talk(s,'调查 · 鞋柜','一串钥匙放在收音机旁。钥匙圈上清楚地写着「302」。\n你记得自己今晚明明反锁过大门。');return true;
  case 'foyer:door':
   talk(s,'302室入户门','门板没有晃动。门外一片死寂，但你仍能感觉有人在等待。',[
    {id:'listen',text:'贴近门板仔细听'},
    {id:'wait',text:'保持安静，等待脚步离开'},
    {id:'unlock',text:'打开门（有风险）'},
    {id:'cancel',text:'先不打开'}]);return true;
  case 'foyer:peephole':
   risk(s,13);f.peeked=true;
   scene(s,'peephole','你靠近猫眼。走廊居然空空荡荡。\n然而你的耳边，响起了门外传来的呼吸声。');return true;
  case 'foyer:living':
   scene(s,'living','你回到客厅。答录机上的红灯还在闪，收音机突然发出细微电流声。');return true;
  case 'living:radio':
   discover(s,'radio');time(s,1);
   talk(s,'紧急广播','“三次敲门后，不要回答。等待脚步离开再打开门。\n如果要离开公寓，请走西侧楼梯，切勿使用电梯。”');return true;
  case 'living:phone':
   discover(s,'phone');risk(s,4);
   talk(s,'电话答录机','“我就在门外，快开门。”\n你查看留言时间：2003年8月18日，18:47。\n可现在分明是8月17日。');return true;
  case 'living:window':
   talk(s,'调查 · 窗户','楼下便利店还开着灯。远处的居民楼里，有一排窗户同时熄灭。\n你看不清是否有人站在楼下。');return true;
  case 'living:foyer':
   scene(s,'foyer','你重新走到玄关。那三声敲门似乎已经重复过很多次。');return true;
  case 'peephole:emptyHall':
   risk(s,8);
   talk(s,'猫眼 · 走廊尽头','绿色安全出口灯忽然熄灭了一瞬。\n在它重新亮起时，你发现墙上的301号门牌似乎变成了310。');return true;
  case 'peephole:back':
   scene(s,'foyer','你离开猫眼，后退了几步。千万别再盯着那个小孔看。');return true;
  case 'hallway:stairs':
   scene(s,'stairs','你来到西侧防火楼梯。可以听到楼下传来很远的电流声。');return true;
  case 'hallway:elevator':
   talk(s,'电梯 · 运行指示','按钮上方的屏幕显示着「302」。\n可这栋楼只有五层。',[
    {id:'takeLift',text:'还是乘电梯离开'},
    {id:'cancel',text:'不要碰电梯'}]);return true;
  case 'hallway:door301':
   talk(s,'301号房门','301门上贴着一张搬家通知，日期是上个月。\n门里没有任何声音。');return true;
  case 'hallway:back302':
   scene(s,'foyer','你返回302室。门内的灯还亮着。');return true;
  case 'stairs:exit':
   succeed(s);return true;
  case 'stairs:backHall':
   scene(s,'hallway','你推开防火门，回到三楼走廊。');return true;
  default:return false;
 }
}
export function choose(s,id){
 if(s.ending)return false;
 const choices=['continue','listen','wait','unlock','cancel','takeLift'];
 if(!choices.includes(id))return false;
 switch(id){
  case 'continue':s.dialogue.options=[];return true;
  case 'listen':
   if(s.scene!=='foyer')return false;
   discover(s,'listened');time(s,1);
   talk(s,'门板另一侧','第一声。第二声。第三声。\n节奏完全相同，像反复播放同一段录音。\n最后一次震动不是从门外传来的。');return true;
  case 'wait':
   if(s.scene!=='foyer')return false;
   time(s,8);
   if(s.flags.listened&&s.flags.radio){
    s.flags.waited=true;
    talk(s,'走廊','八分钟后，你听到拖沓的脚步沿走廊向东走远。\n门外终于只剩下通风管道的响声。');
   }else{
    risk(s,7);
    talk(s,'走廊','你等了很久。敲门声停了，又开始。\n你还不知道什么时候才算真正安全。');
   }
   return true;
  case 'unlock':
   if(s.scene!=='foyer')return false;
   time(s,1);
   if(!isEscapeReady(s)){
    risk(s,35);
    failed(s,'第四次敲门','你打开了门。\n门外什么也没有。但身后的客厅传来了第四声敲门。\n这次声音来自你的卧室。');
   }else{
    s.flags.locked=false;s.flags.hall=true;discover(s,'hall');
    scene(s,'hallway','锁舌缓缓退回。门外没人。\n你站在走廊里，远处电梯正在上升，但指示灯显示「302」。');
   }
   return true;
  case 'takeLift':
   if(s.scene!=='hallway')return false;
   failed(s,'不存在的楼层','电梯门合上的瞬间，楼层数字从3跳到了302。\n广播里传出你自己的声音：“我就在门外。”');
   return true;
  case 'cancel':
   talk(s,'旁白','你暂时没有行动。门外安静得令人不安。');return true;
 }
}
export function useAction(s,id){
 if(s.ending)return false;
 if(s.dialogue.options?.length&&s.dialogue.options[0].id!=='continue')s.dialogue.options=[];
 if(id==='listen'&&s.scene==='foyer')return choose(s,'listen');
 if(id==='breathe'){
  time(s,1);s.attention=clamp(s.attention-8,0,100);
  talk(s,'行动 · 屏息','你放缓呼吸，慢慢压下恐慌。\n房间里只有收音机的电流声。');return true;
 }
 if(id==='observe'){
  time(s,1);
  const names={foyer:'门锁、猫眼、告示与鞋柜的位置没有改变。',living:'电话、收音机与窗户都可以调查。',peephole:'中央消失点附近有一个不自然的阴影，但现在没有人。',hallway:'西侧楼梯和东侧电梯的位置已经确认。',stairs:'应急灯照着向下的楼梯。'};
  talk(s,'行动 · 观察',names[s.scene]||'没有发现新的线索。');return true;
 }
 if(id==='wait'&&s.scene==='foyer')return choose(s,'wait');
 if(id==='return'&&s.scene==='peephole')return inspect(s,'back');
 return false;
}
export function loadGame(raw){
 const s=typeof raw==='string'?JSON.parse(raw):raw;
 if(!s||s.version!==VERSION||!SCENES[s.scene]||!Number.isFinite(s.minute)||!Number.isFinite(s.sanity)||!Number.isFinite(s.attention)||!s.flags||!Array.isArray(s.rules)||!Array.isArray(s.inventory)||!Array.isArray(s.history)||!s.dialogue||!Array.isArray(s.dialogue.options))throw Error('存档不兼容');
 if(s.minute<0||s.minute>1500||s.sanity<0||s.sanity>100||s.attention<0||s.attention>100||s.rules.some(id=>!RULES.some(r=>r.id===id)))throw Error('存档损坏');
 return s;
}
