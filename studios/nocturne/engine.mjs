// NOCTURNE FILES — pure game state and authored content.
// No DOM, rendering engine or server dependency. Versioned save schema.
export const VERSION = 1;
export const STORAGE_PREFIX = 'paperworld.nocturne.v1.';
export const PERIODS = ['上午','放学后','傍晚','深夜'];
export const PLACES = {
  campus:{name:'白榆大学',district:'学园街',icon:'▣',description:'教学楼的玻璃外墙反射着天空。有人在操场边等最后一班校车。',x:22,y:19},
  cafe:{name:'雨滴咖啡',district:'旧城区',icon:'☕',description:'咖啡机在角落里低鸣，玻璃上的雨痕把街灯切成模糊的光。',x:14,y:69},
  room:{name:'主角的公寓',district:'栖木住宅区',icon:'⌂',description:'书桌、未完成的作业，还有屏幕不断亮起的手机。',x:72,y:64},
  plaza:{name:'站前广场',district:'中央站',icon:'◇',description:'电车的到站声穿过霓虹。似乎每个人都在赶往别处。',x:69,y:24},
  gallery:{name:'雾港展馆',district:'港口艺术区',icon:'✦',description:'展览结束后的走廊空空荡荡，墙上的时间表格外刺眼。',x:47,y:46}
};
export const CLUES = {
  photo:{name:'奇怪的校友照片',place:'campus',text:'照片的校钟显示 18:40，但官方活动资料把它标为上午拍摄。',category:'视觉线索'},
  receipt:{name:'咖啡店收据',place:'cafe',text:'昨天傍晚有人用校友会的账户购买过两份饮品，收据时间为 18:37。',category:'书面记录'},
  timetable:{name:'末班电车记录',place:'plaza',text:'公开电子时刻表显示，照片中那班列车昨日临时停运。',category:'公开信息'},
  registry:{name:'展馆访客名单',place:'gallery',text:'目标的名字被登记了两次，第二次使用了不同的签名笔迹。',category:'档案记录'}
};
export const PEOPLE = [
  {name:'林见夏',role:'摄影社 / 熟悉校园',initial:'夏',key:'natsu',description:'看似漫不经心，却总能注意到别人忽略的细节。'},
  {name:'许渡',role:'咖啡店 / 夜班店员',initial:'渡',key:'xu',description:'记性异常好，谈起不熟悉的客人却十分谨慎。'},
  {name:'接线员',role:'身份未知 / 午夜事务所',initial:'?',key:'operator',description:'从不主动解释委托的来龙去脉。'}
];
const deepCopy = value => JSON.parse(JSON.stringify(value));
export function createGame(){
  return {schema:VERSION,day:1,period:1,location:'campus',energy:4,cash:120,study:50,stress:8,
    trust:{natsu:1,xu:0,operator:0},clues:[],flags:{},mission:'offered',outcome:null,theory:null,
    journal:['第一天 · 放学。你决定在雾港市重新开始一周的生活。'],history:[],
    settings:{reducedMotion:false,sound:false,hotspots:false}};
}
function validSave(value){
  return value && value.schema===VERSION && Number.isInteger(value.day) && value.day>=1 && value.day<=999 &&
    Number.isInteger(value.period) && value.period>=0 && value.period<4 &&
    Object.prototype.hasOwnProperty.call(PLACES,value.location) &&
    Array.isArray(value.clues) && value.clues.every(id=>Object.prototype.hasOwnProperty.call(CLUES,id)) &&
    value.flags && typeof value.flags==='object' &&
    value.trust && typeof value.trust==='object' &&
    ['offered','active','refused','resolved'].includes(value.mission) &&
    Number.isFinite(value.energy) && Number.isFinite(value.cash) && Number.isFinite(value.study) && Number.isFinite(value.stress);
}
export function deserialize(text){
  try{const obj=JSON.parse(text);return validSave(obj)?obj:null;}catch{return null;}
}
export function serialize(state){return JSON.stringify(state);}
function log(state,message){state.journal.unshift('第'+state.day+'天 · '+PERIODS[state.period]+'｜'+message);state.journal=state.journal.slice(0,45);}
function setFlag(state,key){state.flags[key]=true;}
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
export function hasClue(state,id){return state.clues.includes(id);}
export function gainClue(state,id){
  if(!CLUES[id]||hasClue(state,id))return false;
  state.clues.push(id);log(state,'获得线索：《'+CLUES[id].name+'》');return true;
}
export function isOpen(state,id){return id!=='gallery'||state.mission==='active'||state.clues.length>=2||state.mission==='resolved';}
export function travel(state,id){
  if(!PLACES[id])return {error:'未知的地点。'};
  if(!isOpen(state,id))return {error:'展馆暂时没有对外开放，先调查其他地点。'};
  if(state.location===id)return {title:'已经抵达',text:'你已经在这里。'};
  state.location=id;
  log(state,'前往'+PLACES[id].name);
  return {title:'抵达 · '+PLACES[id].name,text:PLACES[id].description};
}
export function advanceTime(state,reason='自由安排时间'){
  log(state,reason);
  state.period+=1;
  if(state.period>=4){
    state.period=0;state.day+=1;state.energy=clamp(state.energy+2,0,5);state.stress=clamp(state.stress-4,0,100);
    if(state.day===2){log(state,'校园里传开了关于旧照片的传闻。');setFlag(state,'rumor');}
    if(state.day===4&&state.mission==='active'&&!state.outcome){setFlag(state,'deadlineWarning');log(state,'委托的期限正在接近，接线员发来催促。');}
  }
  if(state.day>=6&&state.mission==='active'&&!state.outcome){state.mission='resolved';state.outcome='expired';log(state,'期限已过。组织单方面结束了这份委托。');}
  if(state.energy<=0)state.stress=clamp(state.stress+6,0,100);
}
export function dateLabel(state){
  const date=new Date(Date.UTC(2026,3,6+state.day-1));
  return {short:String(date.getUTCMonth()+1).padStart(2,'0')+'/'+String(date.getUTCDate()).padStart(2,'0'),
    day:'星期'+['日','一','二','三','四','五','六'][date.getUTCDay()],period:PERIODS[state.period]};
}
export function goal(state){
  if(state.outcome==='expired')return '委托已到期。继续生活，观察组织的后续反应。';
  if(state.mission==='refused')return '你拒绝了委托。生活还在继续，而组织没有忘记你的回答。';
  if(state.outcome)return '委托已经结束。查看结局记录，继续探索接下来的日常。';
  if(state.mission==='offered')return '打开「委托」查看陌生人留下的照片与要求。';
  if(state.clues.length<2)return '到不同的地点搜集线索；点击场景中的「◎ 探索」。';
  if(!state.theory)return '去「线索」面板提出一个关于照片的推测。';
  return '整理证据之后，前往「委托」作出最终选择。';
}
export function getHotspots(state){
  const spots={
    campus:[{id:'photo',x:28,y:44,label:'校友照片',icon:'⌕'}],
    cafe:[{id:'receipt',x:31,y:53,label:'桌上的收据',icon:'⌕'}],
    plaza:[{id:'timetable',x:62,y:42,label:'电子时刻表',icon:'⌕'}],
    gallery:[{id:'registry',x:64,y:53,label:'访客名单',icon:'⌕'}],
    room:[{id:'message',x:56,y:54,label:'加密消息',icon:'✉'}]
  };
  return spots[state.location]||[];
}
function note(title,text,choices){return {title,text,choices:choices||[{label:'继续',id:'dismiss'}]};}
export function act(state,id){
  switch(id){
    case 'dismiss':return null;
    case 'next':advanceTime(state,'自由安排下一时段');return note('时间流逝','电车鸣笛，街灯点亮。新的时段已经开始。');
    case 'class':
      if(state.period!==0)return note('课程时间不对','课程安排在上午。你可以先安排其他活动。');
      state.study=clamp(state.study+12,0,100);state.energy=clamp(state.energy-1,0,5);
      advanceTime(state,'认真参加大学课程');return note('大学课堂','你完成了今天的课程。最后一页讲义上有人用铅笔画了奇怪的校徽。');
    case 'study':
      state.study=clamp(state.study+8,0,100);state.energy=clamp(state.energy-1,0,5);
      advanceTime(state,'自习与复习');return note('安静的学习时间','你把作业推进了一些，也暂时远离了事务所的消息。');
    case 'work':
      state.cash+=65;state.energy=clamp(state.energy-1,0,5);state.trust.xu=clamp(state.trust.xu+1,0,10);
      advanceTime(state,'在咖啡店兼职');return note('一杯咖啡的时间','忙碌的轮班终于结束。你获得了 65 元工资，许渡开始记住你的点单习惯。');
    case 'rest':
      state.energy=clamp(state.energy+2,0,5);state.stress=clamp(state.stress-8,0,100);
      advanceTime(state,'回家休息');return note('关灯之前','窗外的城市还亮着。你决定把危险的事情暂时放在门外。');
    case 'natsu':
      return note('林见夏','“放学后有空吗？我想去拍一些港口的照片。”\n她说话时并没有看向你，而是在看你手里的那张纸。',[
        {label:'“好啊，正想放松一下。”',id:'natsu-friendly'},
        {label:'“今天不行，还有点事。”',id:'natsu-distance'}]);
    case 'natsu-friendly':
      state.trust.natsu=clamp(state.trust.natsu+2,0,10);
      state.energy=clamp(state.energy-1,0,5);advanceTime(state,'和林见夏一起散步');
      return note('一段普通的下午','见夏拿给你看她拍的鸽子。你们聊起开学第一天最无聊的课程。\n这段时间很普通，也因此值得珍惜。');
    case 'natsu-distance':
      state.trust.natsu=clamp(state.trust.natsu-1,0,10);
      log(state,'婉拒了林见夏的邀请');return note('林见夏','“这样啊。那下次再说。”\n她笑了笑，没有追问。');
    case 'xu':
      return note('许渡','“今天有个客人问了三遍展馆在哪里，还说自己从来没去过那里。”\n他的声音不大，像是在等待你自己理解。',[
        {label:'“你记得客人的样子吗？”',id:'xu-ask'},
        {label:'“先来杯热饮吧。”',id:'xu-drink'}]);
    case 'xu-ask':
      state.trust.xu=clamp(state.trust.xu+1,0,10);
      gainClue(state,'receipt');return note('许渡的记忆','许渡从抽屉里拿出一张被遗落的收据。\n“这上面的账户名可能对你有用，但别把我牵连进去。”');
    case 'xu-drink':
      state.cash=clamp(state.cash-18,0,9999);state.energy=clamp(state.energy+1,0,5);
      return note('温热的咖啡','许渡把杯子推了过来。你终于能慢慢整理自己的思路。');
    case 'message':
      setFlag(state,'readMessage');
      return note('来自未知号码','“照片标注的日期不对。委托对象与一份十年前的校友档案有关。别轻信任何简报。”\n号码无法直接回拨。');
    case 'photo':
      if(gainClue(state,'photo'))return note('奇怪的照片','你在校门旁发现一张贴错位置的校友合照。照片上的大钟明显指向傍晚，与说明文字不一致。');
      return note('校友照片','再次观察，已经没有新的信息。你可以在线索面板重新阅读这张照片。');
    case 'receipt':
      if(gainClue(state,'receipt'))return note('被遗落的收据','收据的时间和校友会的账户名都十分醒目。或许它能说明照片的拍摄时间。');
      return note('咖啡店收据','收据已经被你记录在案。');
    case 'timetable':
      if(gainClue(state,'timetable'))return note('车站电子屏','昨日的公开列车记录与照片背景冲突。即使没有专门的技术，你也能看出这件事不对劲。');
      return note('电子屏','有关的车次记录已经整理好。');
    case 'registry':
      if(gainClue(state,'registry'))return note('展馆访客记录','展馆保存了两份相同姓名的访客登记，但签名笔迹并不一样。');
      return note('访客记录','重复的名字依然让你心神不宁。');
    case 'accept':
      if(state.mission!=='offered')return note('无法接受','这份委托已经作出处理。');
      state.mission='active';state.trust.operator=clamp(state.trust.operator+1,0,10);log(state,'接受第一份夜间委托');
      return note('委托 N-01 已接收','接线员只给了一句回复：“别急着相信纸上的身份。”\n新地点「雾港展馆」已经在地图开放。');
    case 'refuse':
      if(state.mission!=='offered')return note('无法拒绝','目前没有可以拒绝的委托。');
      state.mission='refused';setFlag(state,'refusedMission');log(state,'拒绝了事务所的委托');
      return note('你拒绝了委托','消息发送后，屏幕静了一会儿。\n“记录在案。”\n拒绝不是失败。你可以继续上课、交友，看看后来会发生什么。');
    case 'theory-fake':
      state.theory='forged';log(state,'提出假说：照片记录并不可靠');
      return note('假说：有人修改了叙事','你认为照片和活动档案至少有一处不可信。'+(state.clues.length>=2?' 多条独立线索形成了支持。':' 但目前独立佐证不足。'));
    case 'theory-real':
      state.theory='literal';log(state,'提出假说：官方档案完全准确');
      return note('假说：官方时间准确','你尝试接受官方说法。但'+(state.clues.length>=2?'现有资料中确实存在矛盾。':'还需要更多观察才能验证。'));
    case 'resolve':
      if(state.mission!=='active')return note('无法提交','只有在接受委托后才能决定这次行动。');
      return note('最后的决定','调查到此并不意味着你拥有全部真相。你可以遵守命令，也可以尝试改变这份委托的结局。',[
        {label:'公开矛盾证据，让事情接受质询',id:'outcome-expose'},
        {label:'优先保护被牵连的人，违抗组织',id:'outcome-protect'},
        {label:'按照组织指令完成任务（暗线结局）',id:'outcome-obey'},
        {label:'还需要再调查',id:'dismiss'}]);
    case 'outcome-expose':{
      const verified=state.clues.length>=3&&state.theory==='forged';
      state.outcome=verified?'truth':'uncertain';state.mission='resolved';state.stress=clamp(state.stress+8,0,100);
      log(state,verified?'向公众揭露了档案矛盾':'提交了仍有疑点的档案');
      return note(verified?'结局 A · 公开的真相':'结局 B · 尚未得到证实',
        verified?'你把互相矛盾的档案交给公开调查的机构。委托被终止，组织对你的态度迅速变冷。\n第二天，林见夏给你发来了一张新照片。':'你的质疑被人听见了，但证据还不够完整。组织暂时停止委托，仍然有人在背后改写记录。\n你还可以继续过日常生活。');
    }
    case 'outcome-protect':
      state.outcome='protect';state.mission='resolved';state.trust.operator=clamp(state.trust.operator-2,0,10);
      state.stress=clamp(state.stress+5,0,100);log(state,'拒绝伤害目标并保护了被牵连者');
      return note('结局 C · 个人的底线','你选择将委托从致命的结局中拉开。事务所没有付钱，接线员从此不再用熟悉的语气说话。\n但你收到一条简短的匿名消息：“谢谢。”');
    case 'outcome-obey':
      state.outcome='obey';state.mission='resolved';state.cash+=180;state.stress=clamp(state.stress+25,0,100);
      state.trust.operator=clamp(state.trust.operator+3,0,10);log(state,'遵照组织指令；委托造成无法挽回的后果');
      return note('结局 D · 留在名单上的名字','夜晚的决定只用几个镜头带过：走廊的灯熄灭、讯息窗口变成灰色、远处传来救护车的声音。\n组织支付了报酬。你没有真正弄清它为什么选中那个人。');
    case 'journal':return note('最近的故事记录',state.journal.slice(0,7).join('\n'));
    default:return note('尚未解锁','这个行动尚未开放。');
  }
}
export function activities(state){
  const rows=[];
  if(state.period===0&&state.location==='campus')rows.push({id:'class',title:'认真上课',desc:'学业 +12 · 精力 -1 · 消耗 1 时段',icon:'▣'});
  if(state.location==='campus')rows.push({id:'natsu',title:'找林见夏聊天',desc:'社交事件 · 决定是否共度下午',icon:'♡'});
  if(state.location==='cafe'){
    rows.push({id:'xu',title:'和许渡交谈',desc:'可能获得情报，也能喝杯咖啡',icon:'☕'});
    rows.push({id:'work',title:'咖啡店兼职',desc:'金钱 +65 · 精力 -1 · 1 时段',icon:'◈'});
  }
  if(state.location==='room')rows.push({id:'rest',title:'回家休息',desc:'精力 +2 · 压力 -8 · 1 时段',icon:'☾'});
  rows.push({id:'study',title:'阅读与自习',desc:'学业 +8 · 精力 -1 · 1 时段',icon:'▤'});
  rows.push({id:'next',title:'进入下一时段',desc:'不参加额外活动，自由推进时间',icon:'→'});
  return rows;
}
export function outcomeLabel(outcome){
  return ({truth:'公开的真相',uncertain:'尚未得到证实',protect:'个人的底线',obey:'留在名单上的名字',expired:'过期的委托'})[outcome]||'尚无结局';
}
