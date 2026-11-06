/* Paperchalk World — Surface-world daily life simulation v1.
 * Deterministic, storage-backed, independent of rendering and combat.
 * This is GAME time, separate from the device clock. No offline progression.
 * All proposed prices/durations are first-pass economy numbers, not lore canon.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(root)root.PaperWorldDailyLife=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const VERSION=1, KEY='paperchalk-daily-life-v1';
  const START_UTC=Date.UTC(2026,3,13);
  const WEEK=['周日','周一','周二','周三','周四','周五','周六'];
  const HOUR=60, NIGHT=22*HOUR, DAY_START=6*HOUR;
  const LOCATIONS=Object.freeze({
    bedroom:{label:'卧室',group:'家',scene:'bedroom',open:0,close:1440,travel:10},
    'living-room':{label:'客厅',group:'家',scene:'living-room',open:0,close:1440,travel:10},
    kitchen:{label:'厨房',group:'家',scene:'kitchen',open:0,close:1440,travel:10},
    entrance:{label:'玄关',group:'家',scene:'entrance',open:0,close:1440,travel:10},
    school:{label:'学校',group:'城区',scene:null,open:7*60,close:17*60,travel:35,weekdaysOnly:true},
    convenience:{label:'便利店',group:'城区',scene:null,open:6*60,close:22*60,travel:25},
    cafe:{label:'咖啡店',group:'城区',scene:null,open:10*60,close:21*60,travel:30},
    park:{label:'社区公园',group:'城区',scene:null,open:6*60,close:21*60,travel:25},
    mall:{label:'购物商场',group:'城区',scene:null,open:10*60,close:21*60,travel:40}
  });
  const NPCS=Object.freeze({
    female2:{label:'女二',location:'school',from:7*60+30,to:16*60,workdays:true},
    classmate:{label:'同班同学',location:'school',from:9*60,to:16*60,workdays:true},
    clerk:{label:'便利店店员',location:'convenience',from:6*60,to:21*60},
    neighbor:{label:'邻居',location:'park',from:16*60,to:19*60}
  });
  const ACTIONS=Object.freeze({
    study:{label:'上课 / 自习',location:'school',minutes:90,energy:-13,knowledge:2,hunger:7,
      note:'记下今天的重点，课程进度推进。'},
    shift:{label:'兼职工作',location:'cafe',minutes:150,energy:-23,money:90,hunger:12,
      limit:1,note:'完成一班兼职，获得工资。'},
    exercise:{label:'散步锻炼',location:'park',minutes:45,energy:-9,knowledge:0,hunger:5,
      note:'沿着街道走了一圈，暂时离开拥挤的室内。'},
    investigate:{label:'记录街区见闻',location:'entrance',minutes:40,energy:-7,knowledge:1,hunger:4,
      limit:1,evidence:1,note:'记录一条尚待核实的街区传闻。'},
    tidy:{label:'整理房间',location:'bedroom',minutes:30,energy:-5,money:0,hunger:3,
      note:'整理房间，把日常琐事处理妥当。'},
    rest:{label:'休息一小时',location:'bedroom',minutes:60,energy:22,hunger:5,
      note:'休息之后，精神和体力恢复了一些。'}
  });
  const DIALOGUE=Object.freeze({
    female2:[
      '你来了！作业呢？别再发呆，老师第一节课就要收。',
      '听说昨天值日生在楼梯口见过一个穿校服的陌生人。',
      '你觉得学校的公告为什么突然变得这么多？',
      '今天早点回家。官方说部分路段要绕行。',
      '现在最重要的是确认大家都平安，不是作业了。'
    ],
    classmate:[
      '同学提起了明天要交的作业，顺便问你周末准备做什么。',
      '同学说有人把学校附近的监控故障剪成了恐怖视频。',
      '同学担心最近的临时停课消息，希望你们还能正常见面。',
      '同学认真讨论政府公布的避险地点，约好互相报平安。',
      '同学说班上有些人离开了城市，剩下的人在互相照顾。'
    ],
    clerk:[
      '店员一边找零一边抱怨今天的进货又晚了。',
      '店员说有客人坚持夜里看见了不存在的路口。',
      '店员担心货运路线改变会影响附近居民买到日用品。',
      '店员在柜台旁贴上了正式避险公告。',
      '店员和邻居商量给行动不便的人留出一份物资。'
    ],
    neighbor:[
      '邻居正讨论社区公告和公园最近的维修计划。',
      '邻居说楼下住户群又在争论一张模糊的夜间照片。',
      '邻居希望有人协助核对临时疏散名单。',
      '邻居邀请你参加社区应急物资分配。',
      '邻居说只要街坊还在互相照顾，城市就没有彻底停下来。'
    ]
  });
  const ITEM_META=Object.freeze({bread:{label:'简餐',price:18,hunger:28},water:{label:'饮用水',price:6,hunger:4}});
  const CLAMP=(x,a,b)=>Math.max(a,Math.min(b,x));
  const NUMBER=(x,f)=>Number.isFinite(x)?x:f;
  const INTEGER=(x,f)=>CLAMP(Math.trunc(NUMBER(x,f)),-1e9,1e9);
  function dayDate(dayIndex){
    return new Date(START_UTC+Math.max(0,dayIndex-1)*86400000);
  }
  function calendar(state){
    const date=dayDate(state.day);
    return {day:state.day,year:date.getUTCFullYear(),month:date.getUTCMonth()+1,
      date:date.getUTCDate(),weekday:date.getUTCDay(),
      weekdayLabel:WEEK[date.getUTCDay()],
      time:String(Math.floor(state.minute/60)).padStart(2,'0')+':'+
        String(state.minute%60).padStart(2,'0')};
  }
  const stageOf=s=>{
    const d=s.day,p=s.worldPressure;
    if(d>=75||p>=230)return 5;
    if(d>=45||p>=145)return 4;
    if(d>=21||p>=65)return 3;
    if(d>=7||p>=20)return 2;
    return 1;
  };
  const STAGES=Object.freeze([
    null,
    {title:'都市传说期',public:'网传怪谈与离奇事故',official:'普通事故调查',note:'多数人仍在正常上班上课。'},
    {title:'异常频发期',public:'离奇案件引发争论',official:'专项调查尚未公开',note:'路边开始出现越来越多的临时维修公告。'},
    {title:'社会动荡期',public:'异常现象得到更多证实',official:'公开初步研究及协调通报',note:'部分街区开始设立警戒与临时疏导。'},
    {title:'公开灾害期',public:'公众已确认异常灾害真实存在',official:'官方风险告知与救援',note:'部分公共场所关闭，城市发布避险提示。'},
    {title:'全民危机期',public:'社会转向生存与互助',official:'跨地区联合救援与调度',note:'供给、交通与公共服务受到严重冲击。'}
  ]);
  function headlines(s){
    const stage=stageOf(s),d=s.day;
    const tables={
      1:['某小区夜间设备故障，物业称正在排查','网络流传“消失的楼层”视频，真实性存疑','今日城市生活：社区春季活动照常开放'],
      2:['多起道路监控记录异常引发市民讨论','相关企业回应：部分设备已送检','城市论坛持续热议夜间失踪传闻'],
      3:['地方部门公布异常事件联合调查进展','研究人员呼吁公众保存原始影像证据','部分街区实施临时交通调整'],
      4:['市政府发布首批异常灾害避险提示','科研机构公开阶段性调查数据','多家企业启动紧急设施保障计划'],
      5:['跨地区救援力量增援受影响城区','居民社区发布饮水、食物与避难信息','公共广播：请以正式疏散渠道为准']
    };
    const pool=tables[stage];
    return [pool[(d-1)%pool.length],pool[d%pool.length],pool[(d+1)%pool.length]];
  }
  function defaultState(){
    return {version:VERSION,day:1,minute:7*60,location:'bedroom',
      money:260,energy:78,knowledge:0,evidence:0,worldPressure:2,
      relationships:{classmate:0,clerk:0,neighbor:0},
      inventory:{bread:1,water:1},dailyUses:{},nightStatus:'day',
      phone:{callsRead:false,messagesRead:false,reply:null},
      homework:{status:'unfinished',inspected:false,handedIn:false},
      log:[{day:1,minute:7*60,text:'新的一天开始了。先安排今天的生活。'}],
      updatedBy:'new-game'};
  }
  const copy=s=>JSON.parse(JSON.stringify(s));
  function sanitize(raw){
    if(!raw||raw.version!==VERSION||!Number.isSafeInteger(raw.day))return defaultState();
    const s=defaultState();
    s.day=CLAMP(raw.day,1,9999);
    s.minute=CLAMP(INTEGER(raw.minute,420),0,1440);
    s.location=Object.hasOwn(LOCATIONS,raw.location)?raw.location:'bedroom';
    s.money=CLAMP(INTEGER(raw.money,260),0,100000000);
    s.energy=CLAMP(INTEGER(raw.energy,78),0,100);
    s.knowledge=CLAMP(INTEGER(raw.knowledge,0),0,10000);
    s.evidence=CLAMP(INTEGER(raw.evidence,0),0,10000);
    s.worldPressure=CLAMP(INTEGER(raw.worldPressure,2),0,9999);
    for(const k of Object.keys(s.relationships))
      s.relationships[k]=CLAMP(INTEGER(raw.relationships?.[k],0),0,100);
    for(const k of Object.keys(s.inventory))
      s.inventory[k]=CLAMP(INTEGER(raw.inventory?.[k],s.inventory[k]),0,999);
    for(const k of Object.keys(ACTIONS))
      s.dailyUses[k]=CLAMP(INTEGER(raw.dailyUses?.[k],0),0,100);
    // Dialogue visits use a separate daily key and must survive reload:
    // otherwise reloading the page would reset NPC conversation limits.
    for(const k of Object.keys(NPCS))
      s.dailyUses['talk-'+k]=CLAMP(INTEGER(raw.dailyUses?.['talk-'+k],0),0,1);
    s.phone={
      callsRead:raw.phone?.callsRead===true,
      messagesRead:raw.phone?.messagesRead===true,
      reply:['coming','checking'].includes(raw.phone?.reply)?raw.phone.reply:null
    };
    s.homework={
      status:raw.homework?.status==='finished'?'finished':'unfinished',
      inspected:raw.homework?.inspected===true,
      handedIn:raw.homework?.handedIn===true
    };
    s.nightStatus=raw.nightStatus==='recalled'?'recalled':'day';
    if(s.minute>=NIGHT)s.nightStatus='recalled';
    if(Array.isArray(raw.log))s.log=raw.log.slice(-40).filter(x=>
      x&&typeof x.text==='string'&&x.text.length<280&&Number.isFinite(x.day))
      .map(x=>({day:CLAMP(INTEGER(x.day,1),1,9999),
        minute:CLAMP(INTEGER(x.minute,0),0,1440),text:x.text}));
    return s;
  }
  function create(options={}){
    const storage=options.storage||null;
    const onStatEvent=typeof options.onStatEvent==='function'?options.onStatEvent:()=>{};
    const listeners=new Set();
    let state=defaultState();
    if(storage)try{state=sanitize(JSON.parse(storage.getItem(KEY)||'null'))}catch(_){}
    function snapshot(){return copy({...state,calendar:calendar(state),
      stage:stageOf(state),stageInfo:STAGES[stageOf(state)],news:headlines(state)});}
    function persist(){if(!storage)return false;
      try{storage.setItem(KEY,JSON.stringify(state));return true}catch(_){return false}
    }
    function notify(evt){const value=snapshot();for(const f of listeners)try{f(value,evt)}catch(_){}}
    function subscribe(fn){if(typeof fn!=='function')throw new TypeError('listener required');
      listeners.add(fn);return()=>listeners.delete(fn);
    }
    function log(text){state.log.push({day:state.day,minute:state.minute,text});
      if(state.log.length>40)state.log=state.log.slice(-40);
    }
    function spend(minutes){
      if(state.nightStatus==='recalled')return {ok:false,reason:'22:00召回已触发，等待接入正式里世界流程。'};
      if(state.minute+minutes>=NIGHT){
        state.minute=NIGHT;state.nightStatus='recalled';
        log('22:00，你仍然清醒。已触发清道夫夜间强制召回。');
        persist();notify('recall');
        return {ok:false,reason:'22:00已到，夜间召回触发；本版尚未接入正式里世界出入场流程。',recalled:true};
      }
      state.minute+=minutes;
      return {ok:true};
    }
    function finish(event,msg,statEvent){
      state.updatedBy=event;log(msg);persist();
      if(statEvent)try{onStatEvent(statEvent)}catch(_){}
      notify(event);return {ok:true,state:snapshot(),message:msg};
    }
    function fail(reason){return {ok:false,reason};}
    function isOpen(loc,at){
      const def=LOCATIONS[loc];
      if(!def)return false;
      const date=dayDate(state.day),dow=date.getUTCDay();
      return (!def.weekdaysOnly||(dow>=1&&dow<=5))&&at>=def.open&&at<def.close;
    }
    function travel(location){
      const dest=LOCATIONS[location];
      if(!dest)return fail('无效地点');
      if(location===state.location)return fail('已经在这里');
      if(!isOpen(location,state.minute))return fail('该地点现在尚未开放');
      const cost=(LOCATIONS[state.location].group==='家'&&dest.group==='家')?10:dest.travel;
      if(state.energy<3)return fail('太疲倦，先休息');
      if(!isOpen(location,state.minute+cost))return fail('到达时该地点已经关闭');
      const can=spend(cost);if(!can.ok)return can;
      state.energy=CLAMP(state.energy-3,0,100);state.location=location;
      return finish('travel','到达'+dest.label+'，路上用了'+cost+'分钟。');
    }
    function act(id){
      const a=ACTIONS[id];
      if(!a)return fail('未知活动');
      if(a.location!==state.location)return fail('请先前往'+LOCATIONS[a.location].label);
      if(state.energy<(a.energy<0?-a.energy:0))return fail('精力不足');
      if(a.limit&&state.dailyUses[id]>=a.limit)return fail('今天已经完成该活动');
      if(!isOpen(state.location,state.minute)||state.minute+a.minutes>LOCATIONS[state.location].close)
        return fail('当前地点不在活动时间内');
      const can=spend(a.minutes);if(!can.ok)return can;
      state.energy=CLAMP(state.energy+a.energy,0,100);
      state.money=CLAMP(state.money+(a.money||0),0,100000000);
      state.knowledge+=a.knowledge||0;
      state.evidence+=a.evidence||0;
      state.dailyUses[id]=(state.dailyUses[id]||0)+1;
      return finish(id,a.note,{type:'exert',amount:a.hunger||2});
    }
    function buy(itemId){
      const item=ITEM_META[itemId];
      if(!item)return fail('没有这种商品');
      if(state.location!=='convenience')return fail('需要先到便利店');
      if(state.money<item.price)return fail('余额不足');
      if(state.inventory[itemId]>=99)return fail('背包已满');
      const can=spend(10);if(!can.ok)return can;
      state.money-=item.price;state.inventory[itemId]++;
      return finish('buy','购买'+item.label+'，支付'+item.price+'元。');
    }
    function use(itemId){
      const item=ITEM_META[itemId];
      if(!item||state.inventory[itemId]<1)return fail('背包没有这件物品');
      const can=spend(10);if(!can.ok)return can;
      state.inventory[itemId]--;
      return finish('eat','食用了'+item.label+'。',{type:'eat',amount:item.hunger});
    }
    function talk(npcId){
      const npc=NPCS[npcId];
      if(!npc)return fail('未知联系人');
      if(npc.location!==state.location)return fail('对方不在当前地点');
      const dow=dayDate(state.day).getUTCDay();
      if(npc.workdays&&(dow===0||dow===6))return fail('今天对方不在这里');
      if(state.minute<npc.from||state.minute>=npc.to)return fail('对方现在不在');
      if(state.dailyUses['talk-'+npcId])return fail('今天已经聊过了');
      if(state.minute+25>npc.to)return fail('对方马上要离开了');
      const can=spend(25);if(!can.ok)return can;
      state.relationships[npcId]=CLAMP(state.relationships[npcId]+1,0,100);
      state.dailyUses['talk-'+npcId]=1;
      return finish('social',npc.label+'：'+DIALOGUE[npcId][stageOf(state)-1]);
    }
    // Day-one homework hook. The second female character is an established
    // cast slot; deliberately do not invent a personal name or new family.
    function phoneInbox(){
      return {contact:'女二',
        missedCalls:[
          {time:'06:43',text:'未接来电'},
          {time:'06:47',text:'未接来电'},
          {time:'06:51',text:'未接来电'},
          {time:'06:54',text:'未接来电'},
          {time:'06:57',text:'未接来电'},
          {time:'06:59',text:'未接来电'}
        ],
        messages:[
          {time:'06:44',text:'起床了吗？！'},
          {time:'06:49',text:'作业写完没？今天要交！'},
          {time:'06:58',text:'没写就早点来学校补啊，我在教室等你。'}
        ],
        phone:{...state.phone},homework:{...state.homework}};
    }
    function markPhoneRead(which){
      if(!['calls','messages'].includes(which))return fail('无效的手机通知');
      state.phone[which==='calls'?'callsRead':'messagesRead']=true;
      return finish('phone-read',which==='calls'?'查看了女二的未接来电。':'读完了女二发来的消息。');
    }
    function replyHomework(choice){
      if(!['coming','checking'].includes(choice))return fail('无效回复');
      if(state.day!==1)return fail('这条消息已经过期');
      if(!state.phone.messagesRead)return fail('请先查看消息');
      state.phone.reply=choice;
      return finish('phone-reply',choice==='coming'?
        '回复女二：还没写，我现在过去！':'回复女二：我先看看书包，马上出门。');
    }
    function inspectHomework(){
      if(!['bedroom','living-room'].includes(state.location))return fail('书包留在卧室，先回去看看');
      if(state.day!==1)return fail('这是第一天的作业事件');
      if(state.homework.inspected)return fail('已经检查过书包');
      const can=spend(5);if(!can.ok)return can;
      state.homework.inspected=true;
      return finish('homework-inspect','翻了翻书包：作业还差最后一页。');
    }
    function finishHomework(){
      if(state.day!==1)return fail('这份作业已过期');
      if(state.location!=='school')return fail('女二在学校等你补作业');
      if(state.homework.status==='finished')return fail('作业已经补完了');
      if(state.minute+25>9*60)return fail('第一节课前已经来不及补完');
      const can=spend(25);if(!can.ok)return can;
      state.homework.status='finished';
      state.energy=CLAMP(state.energy-6,0,100);
      return finish('homework-finish','在女二旁边补好了最后一页作业。',{type:'exert',amount:2});
    }
    function submitHomework(){
      if(state.day!==1)return fail('作业已经过了截止日期');
      if(state.location!=='school')return fail('需要先到学校');
      if(state.homework.status!=='finished')return fail('作业还没有写完');
      if(state.homework.handedIn)return fail('已经交过作业');
      if(state.minute+5>9*60)return fail('已经错过第一节课的收作业时间');
      const can=spend(5);if(!can.ok)return can;
      state.homework.handedIn=true;
      state.relationships.female2=CLAMP(state.relationships.female2+2,0,100);
      return finish('homework-submitted','作业交上去了。女二终于松了口气。');
    }
    function wait(minutes=30){
      if(![15,30,60].includes(minutes))return fail('只可等待15、30或60分钟');
      const can=spend(minutes);if(!can.ok)return can;
      state.energy=CLAMP(state.energy-Math.ceil(minutes/30),0,100);
      return finish('wait','等待了'+minutes+'分钟。',{type:'exert',amount:minutes/30});
    }
    function sleep(){
      if(state.location!=='bedroom')return fail('请先回卧室睡觉');
      if(state.minute>=NIGHT||state.nightStatus!=='day')return fail('今晚已经无法通过睡眠躲开召回');
      const oldStage=stageOf(state);
      state.day+=1;state.minute=DAY_START;state.energy=CLAMP(state.energy+58,0,100);
      state.dailyUses={};state.location='bedroom';
      state.worldPressure=CLAMP(state.worldPressure+2+Math.floor((state.day-1)/15),0,9999);
      const newStage=stageOf(state);
      state.nightStatus='day';
      return finish('sleep','22:00前正常入睡，安全度过夜晚。'+
        (newStage>oldStage?'城市对异常的认知进入了新阶段。':'城里的其他人仍继续生活和行动。'),
        {type:'exert',amount:7});
    }
    // For integration with a completed night-world gameplay bridge only;
    // intentionally NOT exposed as a "skip recall" player button.
    function recordNightReturn(report){
      if(state.nightStatus!=='recalled'||report?.completed!==true)
        return fail('必须由正式夜间系统确认归返');
      state.day+=1;state.minute=DAY_START;state.nightStatus='day';
      state.location='bedroom';state.dailyUses={};
      state.energy=CLAMP(state.energy+36,0,100);
      state.worldPressure=CLAMP(state.worldPressure+2+Math.floor((state.day-1)/15)+
        CLAMP(INTEGER(report.pressureDelta,0),-100,100),0,9999);
      return finish('night-return','从里世界归返，天亮了。');
    }
    function reset(){
      state=defaultState();persist();notify('reset');return snapshot();
    }
    return Object.freeze({snapshot,subscribe,persist,travel,act,buy,use,talk,wait,sleep,
      phoneInbox,markPhoneRead,replyHomework,inspectHomework,finishHomework,submitHomework,
      recordNightReturn,reset,calendar:()=>calendar(state)});
  }
  return Object.freeze({VERSION,KEY,LOCATIONS,NPCS,ACTIONS,ITEM_META,STAGES,dayDate,
    stageOf,headlines,defaultState,sanitize,create});
});
