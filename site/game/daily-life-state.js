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
  const ATLAS=typeof window!=='undefined'?window.PaperWorldAtlas:null;
  const ATLAS_LOCATIONS=Object.fromEntries((ATLAS?.POIS||[])
    .filter(p=>!['entrance','school','convenience','cafe','mall','park'].includes(p.id))
    .map(p=>[p.id,{label:p.name,group:'世界',scene:null,
      open:0,close:1320,travel:30}]));
  const HUB_LOCATIONS=Object.fromEntries((ATLAS?.CITIES||[])
    .map(c=>['hub-'+c.id,{label:c.name+'交通枢纽',group:'世界',
      scene:null,open:0,close:1320,travel:30}]));
  // Real authored platforms are valid exits even before their individual
  // station scene art exists. Never alias a generic city POI to a rail stop.
  const GRAPH=typeof window!=='undefined'?window.PaperWorldMetro:null;
  const METRO_STATION_LOCATIONS=Object.fromEntries(Object.entries(GRAPH?.STATIONS||{})
    .map(([id,s])=>[id,{label:s.label,group:'城区',
      scene:null,open:0,close:1320,travel:6}]));
  const LOCATIONS=Object.freeze({
    ...ATLAS_LOCATIONS,...HUB_LOCATIONS,...METRO_STATION_LOCATIONS,
    bedroom:{label:'卧室',group:'家',scene:'bedroom',open:0,close:1440,travel:10},
    'living-room':{label:'客厅',group:'家',scene:'living-room',open:0,close:1440,travel:10},
    kitchen:{label:'厨房',group:'家',scene:'kitchen',open:0,close:1440,travel:10},
    entrance:{label:'玄关',group:'家',scene:'entrance',open:0,close:1440,travel:10},
    central:{label:'中央换乘站',group:'城区',scene:null,open:0,close:1320,travel:6},
    northgate:{label:'北街口',group:'城区',scene:null,open:0,close:1320,travel:6},
    school:{label:'学校',group:'城区',scene:'school',open:7*60,close:17*60,travel:35,weekdaysOnly:true},
    convenience:{label:'便利店',group:'城区',scene:'convenience',open:6*60,close:22*60,travel:25},
    cafe:{label:'咖啡店',group:'城区',scene:'cafe',open:10*60,close:21*60,travel:30},
    park:{label:'社区公园',group:'城区',scene:'park',open:6*60,close:21*60,travel:25},
    mall:{label:'购物商场',group:'城区',scene:'mall',open:10*60,close:21*60,travel:40}
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
  // Single inventory metadata table shared by the bag, shop, phone and save.
  // Design-first item classes; only ordinary, plausible day-one possessions.
  const ITEM_META=Object.freeze({
    bread:{label:'简餐',category:'consumable',description:'便利店买来的简单早餐，拆开便能吃。',
      price:18,store:['convenience'],stackMax:12,effect:{type:'eat',amount:28},useMinutes:10},
    water:{label:'饮用水',category:'consumable',description:'一瓶普通的饮用水。',
      price:6,store:['convenience','mall'],stackMax:12,effect:{type:'eat',amount:4},useMinutes:3},
    bandage:{label:'急救包',category:'consumable',description:'随身携带的小型创伤处理包，用于简单包扎。',
      price:42,store:['convenience','mall'],stackMax:4,effect:{type:'heal',amount:20},useMinutes:12},
    keys:{label:'家门钥匙',category:'important',description:'回家会用到。钥匙圈边缘已经有些磨损。',
      price:null,store:[],stackMax:1,effect:null,useMinutes:0},
    homework:{label:'作业本',category:'important',description:'今天要交的作业，还差最后一页。',
      price:null,store:[],stackMax:1,effect:null,useMinutes:0}
  });
  const CATEGORIES=Object.freeze({
    all:'全部',consumable:'用品',important:'重要'
  });
  const STORE_ITEMS=Object.freeze({
    convenience:['bread','water','bandage'],
    mall:['water','bandage']
  });
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
      relationships:{female2:55,classmate:0,clerk:0,neighbor:0},
      inventory:{bread:1,water:1,bandage:1,keys:1,homework:1},dailyUses:{},nightStatus:'day',
      phone:{callsRead:false,messagesRead:false,reply:null},
      phoneThreads:{female2:[],classmate:[],clerk:[],neighbor:[]},
      phoneUnread:{female2:0,classmate:0,clerk:0,neighbor:0},
      contactRemarks:{female2:'',classmate:'',clerk:'',neighbor:''},
      phoneNotes:[],
      phoneCalls:[],transitRumors:[],
      metro:{onboard:false,station:null,lineId:null,direction:1,rides:0,anomaly:false},
      mediaPhotos:[],socialPosts:[],
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
    const savedLocation=String(raw.location||'');
    s.location=Object.hasOwn(LOCATIONS,savedLocation)?savedLocation:
      (GRAPH?.RETIRED_STOP_ALIASES?.[savedLocation]||'bedroom');
    s.money=CLAMP(INTEGER(raw.money,260),0,100000000);
    s.energy=CLAMP(INTEGER(raw.energy,78),0,100);
    s.knowledge=CLAMP(INTEGER(raw.knowledge,0),0,10000);
    s.evidence=CLAMP(INTEGER(raw.evidence,0),0,10000);
    s.worldPressure=CLAMP(INTEGER(raw.worldPressure,2),0,9999);
    for(const k of Object.keys(s.relationships))
      s.relationships[k]=CLAMP(INTEGER(raw.relationships?.[k],s.relationships[k]),0,100);
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
    const metro=raw.metro;
    if(metro&&typeof metro==='object'){
      const graph=typeof window!=='undefined'?window.PaperWorldMetro:null;
      const line=graph?.getLine?.(metro.lineId);
      const station=graph?.STATIONS?.[metro.station]?metro.station:
        graph?.RETIRED_STOP_ALIASES?.[metro.station];
      if(line&&line.stops.includes(station)&&!line.locked){
        s.metro={onboard:metro.onboard===true,station,lineId:line.id,
          direction:metro.direction===-1?-1:1,rides:CLAMP(INTEGER(metro.rides,0),0,100000),
          anomaly:metro.anomaly===true};
      }
    }
    // Bounded in-world phone/social state; never treat player text as HTML.
    for(const id of Object.keys(s.phoneThreads)){
      if(!Array.isArray(raw.phoneThreads?.[id]))continue;
      s.phoneThreads[id]=raw.phoneThreads[id].slice(-40).filter(m=>
        m&&typeof m.text==='string'&&m.text.length<=200&&
        ['me',id].includes(m.from)&&Number.isFinite(m.day))
        .map(m=>({from:m.from,text:m.text,day:CLAMP(INTEGER(m.day,1),1,9999),
          minute:CLAMP(INTEGER(m.minute,0),0,1440)}));
    }
    for(const id of Object.keys(s.phoneUnread)){
      s.phoneUnread[id]=CLAMP(INTEGER(raw.phoneUnread?.[id],0),0,40);
      const remark=raw.contactRemarks?.[id];
      s.contactRemarks[id]=typeof remark==='string'?remark.slice(0,28):'';
    }
    if(Array.isArray(raw.phoneNotes))
      s.phoneNotes=raw.phoneNotes.slice(0,24).filter(note=>
        note&&typeof note.id==='string'&&note.id.length<90&&
        typeof note.title==='string'&&note.title.length<=60&&
        typeof note.text==='string'&&note.text.length<=1200&&
        Number.isFinite(note.day)&&Number.isFinite(note.minute))
        .map(note=>({id:note.id,title:note.title,text:note.text,
          day:CLAMP(INTEGER(note.day,1),1,9999),
          minute:CLAMP(INTEGER(note.minute,0),0,1440)}));
    if(Array.isArray(raw.phoneCalls))
      s.phoneCalls=raw.phoneCalls.slice(-24).filter(m=>
        m&&Object.hasOwn(NPCS,m.to)&&Number.isFinite(m.day)).map(m=>({
          to:m.to,video:m.video===true,answered:m.answered===true,
          day:CLAMP(INTEGER(m.day,1),1,9999),minute:CLAMP(INTEGER(m.minute,0),0,1440)
        }));
    if(Array.isArray(raw.transitRumors))
      s.transitRumors=raw.transitRumors.slice(-40).filter(m=>
        m&&typeof m.id==='string'&&m.id.length<90&&typeof m.text==='string'&&m.text.length<240&&
        Number.isFinite(m.day)).map(m=>({
          id:m.id,text:m.text,day:CLAMP(INTEGER(m.day,1),1,9999)
        }));
    if(Array.isArray(raw.mediaPhotos))
      s.mediaPhotos=raw.mediaPhotos.slice(-8).filter(m=>
        m&&typeof m.id==='string'&&m.id.length<70&&
        typeof m.data==='string'&&m.data.length<175000&&
        /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(m.data)).map(m=>({
          id:m.id,data:m.data,day:CLAMP(INTEGER(m.day,1),1,9999),
          minute:CLAMP(INTEGER(m.minute,0),0,1440)
        }));
    if(Array.isArray(raw.socialPosts))
      s.socialPosts=raw.socialPosts.slice(-24).filter(m=>
        m&&typeof m.text==='string'&&m.text.length<=180&&typeof m.photoId==='string')
        .map(m=>({text:m.text,photoId:m.photoId.slice(0,70),
          day:CLAMP(INTEGER(m.day,1),1,9999),minute:CLAMP(INTEGER(m.minute,0),0,1440)}));
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
      const current=LOCATIONS[state.location];
      if(current.group==='家'&&dest.group!=='家'&&state.location!=='entrance')
        return fail('先去玄关，从家门口出门后才能前往城区');
      if(current.group!=='家'&&dest.group==='家'&&location!=='entrance')
        return fail('从城区回家需要先经过玄关');
      let cost=(current.group==='家'&&dest.group==='家')?10:
        dest.group==='家'?current.travel:dest.travel;
      if(current.group==='世界'||dest.group==='世界'){
        const network=typeof window!=='undefined'?window.PaperWorldDestinationNetwork:null;
        const trip=network?.journey(state.location,location);
        if(!trip)return fail('当前地点没有可去可回的交通路线');
        cost=Math.max(3,Math.round(trip.minutes));
      }
      if(state.energy<3)return fail('太疲倦，先休息');
      if(!isOpen(location,state.minute+cost))return fail('到达时该地点已经关闭');
      const can=spend(cost);if(!can.ok)return can;
      state.energy=CLAMP(state.energy-3,0,100);state.location=location;
      return finish('travel','到达'+dest.label+'，路上用了'+cost+'分钟。');
    }
    // A subway ride is a persistent physical state, not an instant change
    // of destination. Boarding requires the passenger to be AT a served station.
    function metroBoard(lineId,direction){
      const graph=typeof window!=='undefined'?window.PaperWorldMetro:null;
      if(!graph)return fail('交通网络尚未加载');
      if(state.metro.onboard)return fail('你已经在车厢里');
      if(state.nightStatus!=='day')return fail('末班车已经结束运营');
      const line=graph.getLine(lineId),dir=Number(direction)===-1?-1:1;
      if(!line||line.locked)return fail('该线路尚未开放');
      const station=state.location;
      if(!graph.neighbors(line,station).some(x=>x.direction===dir))
        return fail('当前地点没有这条线路的此方向列车');
      const paid=spend(2);
      if(!paid.ok)return paid;
      state.metro={onboard:true,station,lineId:line.id,direction:dir,
        rides:0,anomaly:false};
      return finish('metro-board','从'+graph.STATIONS[station].label+
        '乘上'+line.name+'。');
    }
    function metroNext(){
      const graph=typeof window!=='undefined'?window.PaperWorldMetro:null;
      const ride=state.metro;
      if(!ride.onboard||!graph)return fail('目前没有乘坐列车');
      if(ride.anomaly)return fail('车厢已经驶离正常线路');
      const target=graph.nextStop(ride.lineId,ride.station,ride.direction);
      if(!target)return {ok:false,terminal:true,reason:'已经抵达终点站'};
      const cost=5;
      if(state.minute+cost>=NIGHT){
        state.minute=NIGHT;
        ride.station=target;ride.rides++;ride.anomaly=true;
        state.nightStatus='recalled';
        return {...finish('metro-anomaly','22:00，末班车的广播忽然中断。车窗外的站台消失了。'),
          anomaly:true,station:target};
      }
      state.minute+=cost;ride.station=target;ride.rides++;
      return {...finish('metro-stop','列车抵达'+graph.STATIONS[target].label+'。'),
        station:target,terminal:!graph.nextStop(ride.lineId,target,ride.direction)};
    }
    function metroExit(){
      const graph=typeof window!=='undefined'?window.PaperWorldMetro:null;
      const ride=state.metro;
      if(!ride.onboard)return fail('目前不在列车里');
      if(ride.anomaly)return fail('车门没有打开，无法在这里下车');
      const station=ride.station;
      if(!LOCATIONS[station])return fail('这座站台尚未开放出入口');
      state.location=station;
      state.metro={onboard:false,station:null,lineId:null,direction:1,rides:0,anomaly:false};
      return {...finish('metro-exit','从'+graph.STATIONS[station].label+'走出站台。'),station};
    }
    function metroSwitch(lineId,direction){
      const graph=typeof window!=='undefined'?window.PaperWorldMetro:null;
      const ride=state.metro;
      if(!ride.onboard||ride.anomaly)return fail('现在无法换乘');
      const line=graph?.getLine(lineId),dir=Number(direction)===-1?-1:1;
      if(!line||line.locked||!graph.neighbors(line,ride.station).some(n=>n.direction===dir))
        return fail('当前站没有可换乘的此方向列车');
      if(line.id===ride.lineId&&dir===ride.direction)return fail('已经在这个方向的列车上');
      const paid=spend(5);if(!paid.ok)return paid;
      ride.lineId=line.id;ride.direction=dir;
      return finish('metro-transfer','在'+graph.STATIONS[ride.station].label+
        '换乘'+line.name+'。');
    }
    function metroRideToNight(){
      const graph=typeof window!=='undefined'?window.PaperWorldMetro:null;
      const ride=state.metro;
      const line=graph?.getLine(ride.lineId);
      if(!ride.onboard||ride.anomaly||!line?.ring)return fail('只有正在运行的环线可以持续乘坐');
      const count=Math.max(1,Math.ceil((NIGHT-state.minute)/5));
      const index=line.stops.indexOf(ride.station);
      ride.station=line.stops[((index+ride.direction*count)%line.stops.length+
        line.stops.length)%line.stops.length];
      ride.rides+=count;ride.anomaly=true;
      state.minute=NIGHT;state.nightStatus='recalled';
      return {...finish('metro-anomaly','一直坐到22:00，车厢不再报站，地图上出现了不存在的线路。'),
        anomaly:true,station:ride.station,stopsPassed:count};
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
      if(!item||!STORE_ITEMS[state.location]?.includes(itemId)||!Number.isFinite(item.price))
        return fail('这家店没有出售该物品');
      if(state.money<item.price)return fail('余额不足');
      if((state.inventory[itemId]||0)>=item.stackMax)return fail('这件物品已达到可携带数量上限');
      const can=spend(10);if(!can.ok)return can;
      state.money-=item.price;state.inventory[itemId]=(state.inventory[itemId]||0)+1;
      return finish('buy','买下'+item.label+'，支付'+item.price+'元。');
    }
    function use(itemId){
      const item=ITEM_META[itemId];
      if(!item||(state.inventory[itemId]||0)<1)return fail('背包没有这件物品');
      if(!item.effect)return fail('这是重要物品，不能消耗');
      const can=spend(item.useMinutes);if(!can.ok)return can;
      state.inventory[itemId]--;
      const action=item.effect.type==='heal'?'apply-medical':'eat';
      return finish(action,item.effect.type==='heal'?'使用'+item.label+'处理伤口。':
        '使用了'+item.label+'。',item.effect);
    }
    function inspectItem(itemId){
      const item=ITEM_META[itemId];
      if(!item||(state.inventory[itemId]||0)<1)return fail('背包没有这件物品');
      const text=itemId==='homework'&&state.homework.status==='finished'?
        '作业已经补齐。记得交给老师。':item.description;
      return {ok:true,message:text,itemId,description:text};
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
      const key=which==='calls'?'callsRead':'messagesRead';
      if(state.phone[key])return {ok:true,unchanged:true};
      state.phone[key]=true;
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
    function sendPhoneMessage(to,text){
      if(!Object.hasOwn(NPCS,to)||(!state.relationships[to]&&to!=='female2'))
        return fail('还没有这个联系人的联系方式');
      const body=String(text||'').trim().slice(0,180);
      if(!body)return fail('消息不能为空');
      const stamp={day:state.day,minute:state.minute};
      const thread=state.phoneThreads[to];
      thread.push({...stamp,from:'me',text:body});
      const recent=thread.filter(m=>m.from==='me').length;
      let reply='';
      const where=LOCATIONS[state.location]?.group==='家'?'在家':
        '在'+(LOCATIONS[state.location]?.label||'附近');
      if(to==='female2'){
        if(/作业|老师|交作业|补作业/.test(body))
          reply=state.homework.status==='finished'?'写完就好。记得交给老师，别再忘了。':
            '你还差最后一页不是吗？早点来教室，我帮你看。';
        else if(/在哪|哪里|到哪|学校/.test(body))
          reply=state.minute<16*HOUR?'我在学校呢。你现在'+where+'吗？':'我已经离开学校了。怎么了？';
        else if(/视频|传闻|怪事|监控|失踪|新闻/.test(body))
          reply=stageOf(state)===1?'我也看到了，不过别只看转发，原视频在哪儿？':
            '我也在查这件事。先别单独去那个地方。';
        else if(/早|起床|睡/.test(body))reply='你终于醒啦！快点看看今天要交的东西。';
        else if(/见面|一起|出来/.test(body))reply='好啊，等放学以后再联系我吧。';
        else{
          const pool=stageOf(state)===1?[
            '收到。你今天有什么安排？','你先忙，见面再慢慢说。','咦？你刚刚说的是认真的吗？','那你路上小心。'
          ]:[
            '看到了。我现在也有点担心。','别慌，我们先确认消息是不是真的。','你在哪里？先报个平安。'
          ];
          reply=pool[(state.day+recent)%pool.length];
        }
      }else if(to==='classmate'){
        reply=/作业|学校|考试/.test(body)?'我也还没复习完，别提了。':
          stageOf(state)>1?'听说有同学遇到怪事。下次在学校聊。':'收到！下次班里见。';
      }else if(to==='clerk'){
        reply=/商品|买|货|店/.test(body)?'货架上有的都能买，缺货还得等配送。':
          '店里正在忙，等空下来再回复你。';
      }else{
        reply=/公园|街|附近/.test(body)?'最近路口在施工，晚上最好绕开。':
          '知道了，有事就在社区群里说一声。';
      }
      const persona=NPCS[to];
      const busy=(to==='female2'&&state.minute>=8*HOUR&&state.minute<9*HOUR)||
        (to==='classmate'&&state.minute>=8*HOUR&&state.minute<15*HOUR);
      if(!busy){
        thread.push({...stamp,from:to,text:reply});
        state.phoneUnread[to]=Math.min(40,(state.phoneUnread[to]||0)+1);
      }
      thread.splice(0,Math.max(0,thread.length-40));
      return finish('phone-message',busy?'消息已送达，暂时没有回复。':
        persona.label+'回复了消息。');
    }
    function markThreadRead(to){
      if(!Object.hasOwn(NPCS,to))return fail('无效联系人');
      if(!state.phoneUnread[to])return {ok:true,unchanged:true};
      state.phoneUnread[to]=0;
      return finish('phone-thread-read','查看了'+NPCS[to].label+'的聊天记录。');
    }
    function setContactRemark(to,remark){
      if(!Object.hasOwn(NPCS,to)||(!state.relationships[to]&&to!=='female2'))
        return fail('尚未获得这位联系人的联系方式');
      const next=String(remark??'').trim().slice(0,28);
      if(state.contactRemarks[to]===next)return {ok:true,unchanged:true};
      state.contactRemarks[to]=next;
      return finish('phone-contact-remark','更新了联系人备注。');
    }
    function savePhoneNote(id,title,text){
      const body=String(text??'').trim().slice(0,1200);
      const heading=String(title??'').trim().slice(0,60)||'无标题';
      if(!body)return fail('请填写记录内容');
      const existing=id?state.phoneNotes.find(n=>n.id===id):null;
      if(id&&!existing)return fail('找不到这条记录');
      if(existing){
        existing.title=heading;existing.text=body;
        existing.day=state.day;existing.minute=state.minute;
      }else{
        const noteId='note-'+state.day+'-'+state.minute+'-'+Math.random().toString(36).slice(2,10);
        state.phoneNotes.unshift({id:noteId,title:heading,text:body,
          day:state.day,minute:state.minute});
        state.phoneNotes=state.phoneNotes.slice(0,24);
      }
      return finish('phone-note-save','保存了一条私人备忘录。');
    }
    function deletePhoneNote(id){
      const index=state.phoneNotes.findIndex(n=>n.id===id);
      if(index<0)return fail('找不到这条记录');
      state.phoneNotes.splice(index,1);
      return finish('phone-note-delete','删除了一条私人备忘录。');
    }
    function phoneCall(to,video=false){
      if(!Object.hasOwn(NPCS,to)||(!state.relationships[to]&&to!=='female2'))
        return fail('还没有这个联系人的联系方式');
      const now=state.minute,npc=NPCS[to];
      const available=to==='female2'?now>=6*HOUR+30&&now<21*HOUR:
        now>=npc.from&&now<npc.to;
      const answered=available&&state.nightStatus==='day';
      const say=answered?(to==='female2'?
        (stageOf(state)===1?'你终于打电话了。今天早点来学校，我有事找你。':
        '你现在在哪儿？最近的传闻越来越奇怪了，先确认安全。'):
        to==='classmate'?'喂？我刚刚在看班级群。怎么了？':
        to==='clerk'?'你好，我正在店里。需要帮你留什么吗？':
        '喂，刚刚看到你的电话了。'): '对方没有接听，已记入通话记录。';
      const cost=answered?4:1;
      const time=spend(cost);if(!time.ok)return time;
      state.phoneCalls.push({to,video:!!video,answered,day:state.day,minute:now});
      state.phoneCalls=state.phoneCalls.slice(-24);
      const note=answered?npc.label+'：'+say:'对方没有接听，已记入通话记录。';
      const res=finish('phone-call',note);
      return {...res,answered,video:!!video,speaker:answered?npc.label:'通话记录',text:note};
    }
    function recordTransitRumor(id,text){
      const key=String(id||'').slice(0,80),body=String(text||'').slice(0,220);
      if(!key||!body)return fail('无效的见闻');
      if(state.transitRumors.some(p=>p.id===key))return {ok:true,alreadyKnown:true};
      state.transitRumors.push({id:key,text:body,day:state.day});
      state.transitRumors=state.transitRumors.slice(-40);
      state.updatedBy='metro-rumor';persist();notify('metro-rumor');
      return {ok:true,discovered:true};
    }
    function addPhonePhoto(data){
      const bytes=String(data||'');
      if(bytes.length>175000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(bytes))
        return fail('照片需要是压缩后的 JPEG 图片');
      const id='photo-'+state.day+'-'+state.minute+'-'+Math.round(Math.random()*1000000);
      state.mediaPhotos.push({id,data:bytes,day:state.day,minute:state.minute});
      state.mediaPhotos=state.mediaPhotos.slice(-8);
      const res=finish('phone-photo','保存了一张手机照片。');
      return {...res,photoId:id};
    }
    function publishSocial(text,photoId=''){
      const body=String(text||'').trim().slice(0,180);
      const id=String(photoId||'').slice(0,70);
      if(!body&&!id)return fail('请输入文字或选择照片');
      if(id&&!state.mediaPhotos.some(p=>p.id===id))return fail('照片已经不在相册里');
      state.socialPosts.unshift({text:body,photoId:id,day:state.day,minute:state.minute});
      state.socialPosts=state.socialPosts.slice(0,24);
      return finish('phone-post','已发布到游戏世界的城市论坛。');
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
    return Object.freeze({snapshot,subscribe,persist,travel,metroBoard,metroNext,metroExit,
      metroSwitch,metroRideToNight,act,buy,use,inspectItem,talk,wait,sleep,
      phoneInbox,markPhoneRead,replyHomework,sendPhoneMessage,phoneCall,
      markThreadRead,setContactRemark,savePhoneNote,deletePhoneNote,
      recordTransitRumor,addPhonePhoto,publishSocial,
      inspectHomework,finishHomework,submitHomework,
      recordNightReturn,reset,calendar:()=>calendar(state)});
  }
  return Object.freeze({VERSION,KEY,LOCATIONS,NPCS,ACTIONS,ITEM_META,STAGES,dayDate,
    stageOf,headlines,defaultState,sanitize,create,CATEGORIES,STORE_ITEMS});
});
