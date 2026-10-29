import {SECOND_WEEK} from '../content/second-week-story.js';
/**
 * NIGHT HARBOR / CHAPTER 01 - DAYS ARE PLAYABLE
 * First seven days are fully authored two-scene beats. Days 8-15 offer recurring
 * voluntary-neighborhood work while the long campaign is being developed.
 * No user-facing UI or network access. Event state is replayable.
 */
export const SEASON_ARCS=[
 {id:'roof',start:1,end:15,title:'雨漏的屋顶',goal:'建立街坊互助点，获得第一批真实信任'},
 {id:'streets',start:16,end:45,title:'街巷的名字',goal:'公开经营、招聘，争取街区议事权'},
 {id:'bell',start:46,end:105,title:'钟楼下的协议',goal:'产业经营、势力谈判与司法危机'},
 {id:'inheritance',start:106,end:180,title:'城的继承者',goal:'重建城市秩序与不同结局'}
];
const beat=(id,venue,lead,title,line,choices)=>({id,venue,lead,title,line,choices});
const opt=(id,label,line,benefits={})=>({id,label,line,benefits});
export const FIRST_WEEK={
 1:{title:'买下一个名字',deadline:'先从巷口开始。街坊知道两个蒙面人的传说，却还不知道你是谁。',
   beats:[
     beat('knock', 'alley','楼下婶婶','敲不开的那扇门','巷尾的商户刚遭到勒索。邻居犹豫着问，你们敢不敢帮忙？',[
      opt('hear','和她一起挨家询问','她把几户愿意说话的人介绍给你。街角不再只有恐惧。',{trust:3,clues:1}),
      opt('guard','答应傍晚陪她走过巷口','“有人肯陪我们走这一段路，就够了。”',{trust:4})
     ]),
     beat('stall','market','摊主林姨','那块破损的摊板','菜摊被踢翻，巡查员却只顾着记摊位管理费。',[
      opt('repair','买木板，把摊子修好（-18元）','林姨把一只热馒头塞给阿凯：“以后你们来，不收钱。”',{cash:-18,trust:5,supplies:1}),
      opt('witness','把现场的收费单据留下来','摊主说：“有了这几张纸，也许不必再被他们吓住。”',{trust:2,clues:2})
     ])
 ]},
 2:{title:'失业名单',deadline:'旧厂停工，更多的人无法按时交租。',
  beats:[
   beat('names','labor','失业工人','就业所门口','旧厂临时工排在雨里，工作公告三周没更新。',[
    opt('listen','听完他们的情况','一个工人记下你们的联系方式，没有立即说谢谢。',{trust:3,clues:1}),
    opt('help','替一位工人支付应急伙食（-12元）','他把自己的面包掰了一半给另一位工友。',{cash:-12,trust:5})
   ]),
   beat('invoice','docks','码头工友','那份货运欠款','船行的收款单里多了一项来源不明的扣费。',[
    opt('copy','核对运单和出货记录','工友指着两张日期对不上的凭证：“这不是正常费用。”',{clues:2}),
    opt('work','帮他们搬完最后一趟货','天色已经暗了，工友把一份合法短途订单介绍给你们。',{cash:26,trust:2})
   ])
 ]},
 3:{title:'不收保护费的人',deadline:'附近地痞要求每个摊位交新的所谓管理费。',
  beats:[
   beat('notice','market','林姨','讨价还价','商户围着一张新收费告示，谁都不肯先撕掉。',[
    opt('petition','把大家的异议写成共同请愿','“你别替我签，我自己来。”林姨签下了第一个名字。',{clues:2,trust:3}),
    opt('open','组织一次公开的街坊商议','开始时只有三人留下，散场时又有几个店主走了过来。',{trust:5})
   ]),
   beat('walk','alley','阿凯','不做第二个地头蛇','兄弟俩经过一盏坏掉的路灯。阿凯问：“以后有人叫我们老大，怎么办？”',[
    opt('agree','我们是来让街坊能自己做主的','阿凯沉默了一下：“我记住了。”',{trust:4,resolve:1}),
    opt('promise','先保护大家，再谈名号','他看着街角：“那就别让自己忘了为什么开始。”',{trust:3,resolve:2})
   ])
 ]},
 4:{title:'缺少证人的账本',deadline:'有人在街上散播谣言，指称前几天的匿名义举是骗局。',
  beats:[
   beat('files','labor','就业所职员','失踪的公示','就业所职员把一份旧厂工资纠纷的登记册推给你们。',[
    opt('verify','比对登记日期与工人名单','原本互不相识的人在同一页上看见了自己的名字。',{clues:2,trust:2}),
    opt('mediate','让工人和职员坐下来谈','“制度有问题，不是每个坐在柜台后的人都坏。”',{trust:4})
   ]),
   beat('room','office','阿凯','办公室终于有盏灯','两个人在毛坯屋里数剩余的钱。屋顶漏水，账本却多了几个人的姓名。',[
    opt('repair','花钱修补屋顶（-25元）','终于有一小块角落可以安心放下档案。',{cash:-25,trust:2,supplies:1}),
    opt('plan','整理社区帮扶记录','阿凯把每张求助便条按日期叠好。你们第一次像是在经营一个组织。',{clues:2,resolve:1})
   ])
 ]},
 5:{title:'第一次正式委托',deadline:'一批捐赠的粮食需要安全送到旧港。',
  beats:[
   beat('route','docks','码头工会成员','一车粮食','两条路都通向旧港，但其中一条已经被街头混混拦住。',[
    opt('ask','联系工会与店家共同保障运送','工会成员说：“不靠威胁，人多也能守住秩序。”',{trust:4,supplies:2}),
    opt('record','先核实交货时间与收货人','这份单据会证明粮食确实抵达需要它的人手里。',{clues:3,supplies:1})
   ]),
   beat('food','market','林姨','分配食物','粮食到了，领取处已经排起长队；一位老人为后面的人让出了位置。',[
    opt('fair','按实际家庭需要分配','孩子们终于吃上了热食，排队的人没有再争。',{trust:6,supplies:-1}),
    opt('community','让志愿者轮流管理发放','几个平时少说话的年轻人主动站了出来。',{trust:5,resolve:1})
   ])
 ]},
 6:{title:'传言比人跑得快',deadline:'新一份小报想查出当年那两个蒙面人的名字。',
  beats:[
   beat('rumor','alley','街头少年','传闻中的蒙面人','街头少年问：你觉得那两个蒙面人是英雄，还是另一个新帮派？',[
    opt('quiet','让街坊自己评价','“那你们做的事情，比说出来的话管用。”',{trust:3,identity:-1}),
    opt('principle','只谈平民有权获得公平','围观的人开始谈社区下一步该怎么做，而不是追问面具后是谁。',{trust:4,resolve:1})
   ]),
   beat('document','labor','失业工人','留下姓名的人','有工人愿意在请愿书上署名，但要求他的家人不要被牵连。',[
    opt('consent','尊重他的决定，不公开个人信息','他松了一口气：“那我愿意做证。”',{clues:2,trust:3}),
    opt('protect','把公开与匿名材料分开保管','没人被迫站到聚光灯里，证据也没有丢失。',{clues:2,identity:-1})
   ])
 ]},
 7:{title:'有人愿意敲这扇门',deadline:'街坊准备在集市公开讨论长期互助点；如果无人站出来，告示可能被悄悄撤下。',
  beats:[
   beat('assembly','market','摊主林姨','在所有人面前','一张旧桌摆在集市旁边，街坊想知道：你们会不会变成新的收钱人？',[
    opt('voluntary','公开承诺：自愿参加，绝不索取保护费','有人鼓掌，也有人保持怀疑。至少这句话说在所有人面前。',{trust:6,resolve:2}),
    opt('ledger','公开自愿互助账本','林姨翻开每一笔记录：“大家可以自己核对。”',{trust:4,clues:2})
   ]),
   beat('key','office','阿凯','把钥匙留给谁','雨点从窗框滑下来。屋里的木箱上放着一枚备用钥匙和几张求助便条。',[
    opt('share','为街坊留一把钥匙，设立互助办公室','“以后他们来，先听他们把话说完。”',{trust:5,resolve:2}),
    opt('organize','先成立一个公开的小型社区理事会','“我们不是要替所有人做主，是让愿意做事的人能一起做事。”',{trust:4,resolve:3})
   ])
 ]}
};
const repeating=[
 beat('shift-work','labor','失业工人','新的工作机会','告示栏又多了一张短期招聘启事。有人担心雇主不按时付钱。',[
  opt('verify','核实招聘方的营业资格','工人得到一份能看懂的书面合同。',{trust:2,clues:1}),
  opt('coach','教新人核对劳动合同','一名年轻人第一次知道自己可以要求书面凭证。',{trust:3})
 ]),
 beat('day-market','market','林姨','每天都要营业','集市的账房在核对收支，几个店主正讨论是否参加公开互助。',[
  opt('trade','帮摊主核对一笔合法生意','拿到了小小的合理报酬。',{cash:12,trust:1}),
  opt('listen','听店主们讨论困难','他们开始提出具体、可执行的社区建议。',{trust:3})
 ]),
 beat('day-docks','docks','码头工友','灰色天空下的轮船','又一批货船到了码头，运输报价随时可能变化。',[
  opt('ledger','整理公开的货物收据','一张没有漏洞的凭据能减少日后的争执。',{clues:1,trust:1}),
  opt('deliver','接受合法临时运输工作','干完一趟活，足够支付一部分办公室电费。',{cash:18,trust:1})
 ]),
 beat('day-alley','alley','楼下婶婶','一条更安全的巷子','居民想自己组织巡查和照明维护。',[
  opt('repair','出资修缮路灯（-10元）','路灯重新亮起，晚归的人不用再摸黑。',{cash:-10,trust:3}),
  opt('volunteer','协调居民自愿互助','附近住户轮流照看街口，不需要替任何人卖命。',{trust:2,resolve:1})
 ])
];
export function todayStory(world){
 const day=world.day,state=world.slices.campaign;
 if(!state)return null;
 if(day<=7)return FIRST_WEEK[day]||null;
 if(day<=15)return SECOND_WEEK[day]||null;
 return null;
}
export function activeStoryBeat(world){
 const p=todayStory(world);
 return p?.beats[world.slices.campaign?.actionsToday||0]||null;
}
export function storySnapshot(world){
 const p=world.slices.campaign;
 return {chapter:SEASON_ARCS.find(x=>world.day<=x.end)?.title||'尾声之后',
  day:world.day, actions:p.actionsToday,trust:p.communityTrust,clues:p.evidence,resolution:p.resolve,
  identity:p.identityRisk,caseResult:p.firstWeekOutcome};
}
export const campaignSystem={
 id:'campaign',deps:['origin','clock','society'],
 init:({day})=>({
  actionsToday:0,communityTrust:0,evidence:0,resolve:0,identityRisk:0,supplies:0,
  firstWeekOutcome:null,firstChapterOutcome:null,history:[],daySummaries:[],introComplete:false
 }),
 reduce(data,action,{day,context,slices}){
  if(action.type!=='scene-choice')return {error:'未知的每日剧情命令'};
  const world={day,slices:{...slices,campaign:data}},event=activeStoryBeat(world);
  if(!event)return {error:'今天的日程已经结束，回办公室翻开日历'};
  if(slices.origin.prologue?.status==='active')return {error:'先完成第一天买下办公室的开场'};
  if(slices.origin.venue!==event.venue)return {error:'该剧情需要前往：'+event.venue};
  if(slices.clock.shift>=(data.actionsToday===0?2:3))return {error:'现在已经太晚，无法再完成这项活动'};
  const pick=event.choices.find(o=>o.id===action.choice);
  if(!pick)return {error:'无效剧情选择'};
  const e=pick.benefits||{};
  if((e.cash||0)<0&&context.cash<-(e.cash||0))return {error:'资金不足，选择其他方式帮助街坊'};
  data.actionsToday++;
  data.communityTrust=Math.max(0,data.communityTrust+(e.trust||0));
  data.evidence=Math.max(0,data.evidence+(e.clues||0));
  data.resolve=Math.max(0,data.resolve+(e.resolve||0));
  data.identityRisk=Math.max(0,data.identityRisk+(e.identity||0));
  data.supplies=Math.max(0,data.supplies+(e.supplies||0));
  data.history.unshift({id:day+'-'+event.id,day,venue:event.venue,beat:event.id,choice:pick.id,title:event.title,
    result:pick.line,benefits:e});
  data.history=data.history.slice(0,100);
  return {data,events:[{type:'campaign.choice',title:event.lead+' · '+event.title,
    text:pick.line,scene:event.venue,beat:event.id,choice:pick.id}],
   effects:[...((e.cash||0)!==0?[{kind:'cash',amount:e.cash,label:'街区剧情：'+event.title}]:[]),
    ...((e.trust||0)>0?[{kind:'respect',amount:Math.min(2,e.trust),label:'社区声望'}]:[]),
    {kind:'time-phase',to:data.actionsToday===1?2:3}]};
 },
 tick(data,{day}){
  const yesterday=day-1,previous=data.actionsToday;
  if(yesterday<=15){
   const summary={day:yesterday,completed:previous,trust:data.communityTrust,evidence:data.evidence};
   data.daySummaries.unshift(summary);data.daySummaries=data.daySummaries.slice(0,35);
  }
  const events=[];
  if(yesterday===7&&!data.firstWeekOutcome){
    const success=data.communityTrust>=20&&data.evidence>=4&&data.resolve>=1;
    data.firstWeekOutcome=success?'community-office':'fragile-start';
    events.push({type:'campaign.chapter',title:success?'第一周：有人敲门':'第一周：道路还很长',
     text:success?'街坊同意试办自愿互助办公室。钥匙不再只属于你们两个人，匿名蒙面人的身份仍然没有曝光。':
     '街坊尚未形成足够共识，但办公室仍在。有人留下联系地址，愿意以后再谈。'});
  }
  if(yesterday===15&&!data.firstChapterOutcome){
    const achieved=data.communityTrust>=45&&data.evidence>=9&&data.resolve>=5;
    data.firstChapterOutcome=achieved?'charter-founded':'community-in-progress';
    events.push({type:'campaign.chapter',title:achieved?'第一章完：街坊自己的钥匙':'第一章完：仍在成长',
      text:achieved?'居民共同制定自愿互助章程，社区办公室正式成立。主角与阿凯的蒙面身份仍未公开。':
        '互助组织暂未达成完整共识，但愿意继续帮忙的人正在增加。未来还可以重新争取居民的信任。'});
  }
  data.actionsToday=0;
  if(day<=15){
   const story=FIRST_WEEK[day]||SECOND_WEEK[day]||{title:'街坊的一天'};
   events.push({type:'campaign.morning',title:'DAY '+day+' · '+story.title,
    text:story.deadline||'新的问题出现在街头。'});
  }
  return {data,events};
 }
};
