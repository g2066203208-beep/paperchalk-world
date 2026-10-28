/** Chapter 01: the legend predates the playable opening. Pure, testable narrative state.
 * No gameplay tutorial for crime: the masked event is a past public rumor, never an actionable operation.
 */
export const FIRST_CHAPTER={
 chapter:'第一章 · 两个人的办公室',
 incident:'旧港苦力码头的债主「马顺」曾靠扣发工钱和私设债契逼迫街坊。某夜他的账目被公开，工人取回欠薪，他的私人打手散去。人们只说看见两名蒙面人。',
 legend:'两名蒙面人的真实姓名从未出现在报纸或警方记录里。',
 origin:'你和阿凯在同一间孤儿院长大，后来合租打工阁楼。那段生活已经过去；游戏从买下第一间破旧办公室开始。',
 funding:'旧办公室的产权已经过户。支付购房款后剩下的190元，来自夜间事件后工友匿名赠与的谢礼与兄弟二人原有积蓄。',
 stakes:'没有地盘、没有下属、没有企业；社区混乱，政府失职，大黑帮根本没注意这两个年轻人。'
};
export const SCENE_DEFS={
 office:{id:'office',name:'刚买下的毛坯办公室',out:['alley'],mood:'空旷的水泥墙、破窗框、粉尘与只有两人的第一张桌子'},
 alley:{id:'alley',name:'旧港背街',out:['office','market','attic','docks'],mood:'楼梯间、煤烟、屋檐下的闲话和穿梭的居民'},
 market:{id:'market',name:'清晨集市',out:['alley','labor'],mood:'推车摊位、排队的人、争吵与路口的警卫'},
 labor:{id:'labor',name:'旧厂就业所',out:['market','docks'],mood:'工作告示、失业队伍、倒闭工厂的钟楼'},
 docks:{id:'docks',name:'旧港码头',out:['alley','labor'],mood:'吊机与海雾，商货码头和纠纷'},
 attic:{id:'attic',name:'旧打工阁楼',out:['alley'],mood:'以前打工时的住所，只是可以回访的地方，不是游戏起点'}
};
export const SCENE_PEOPLE={
 office:[{id:'kai',name:'阿凯',role:'兄弟'}],
 alley:[{id:'neighbor',name:'楼下婶婶',role:'街坊'},{id:'runner',name:'街头少年',role:'路人'}],
 market:[{id:'vendor',name:'摊主林姨',role:'商户'},{id:'guard',name:'路口巡查员',role:'治安'}],
 labor:[{id:'worker',name:'失业工人',role:'求职'},{id:'clerk',name:'就业所职员',role:'公职'}],
 docks:[{id:'docker',name:'码头工友',role:'搬运'},{id:'unionist',name:'老工会成员',role:'工会'}],
 attic:[{id:'caretaker',name:'旧房东',role:'街坊'}]
};
export function scenePopulation(state){return SCENE_PEOPLE[state.venue]||[];}
export const originSystem={
 id:'origin',deps:['clock','society'],
 init:({day})=>({
  chapter:1,venue:'office',sceneHistory:['office'],dateStarted:day,
  legend:22,identityExposure:0,streetTrust:8,officePurchased:true,officeCondition:'毛坯',
  flags:{heardRumor:false,openedDoor:false,readDeed:false,lookedAtMap:false,spokeBrother:false,inspectedAttic:false,helpedVendor:false,heardWorker:false,challengedHarassment:false},
  interactions:[],visitorLog:[],ambientCounter:0
 }),
 reduce(data,action,{day,context,slices}){
  const event=(type,title,text)=>({type,title,text,venue:data.venue,day});
  if(action.type==='travel'){
    const dest=SCENE_DEFS[action.to];
    if(!dest||!SCENE_DEFS[data.venue].out.includes(action.to))return {error:'这里没有直达道路'};
    const from=data.venue;data.venue=dest.id;data.sceneHistory.push(dest.id);data.sceneHistory=data.sceneHistory.slice(-30);
    if(dest.id==='alley'&&from==='office')data.flags.openedDoor=true;
    return {data,events:[event('origin.travel','走进'+dest.name,dest.mood)]};
  }
  if(action.type==='inspect'){
    const key=String(action.object||''),allowed={
     office:['deed','newspaper','map','window','barewall','desk'],
     alley:['poster','steps','lantern'],
     market:['stall','sign'],
     labor:['notice','factory'],
     docks:['crane','manifest'],
     attic:['bed','keepsake']
    };
    if(!allowed[data.venue]?.includes(key))return {error:'这里没有这个物件'};
    const desc={
     deed:'地契压在木箱底下：这间房已付清购房款。两人还没有组织或地盘，只有钥匙和余下的启动资金。',
     newspaper:'报纸只写“旧港两名蒙面者揭露恶债主”。没有姓名和照片。那是一场街区传说，旁人不知道主角与阿凯。',
     map:'折起的旧城区图：周围十六个街区分别落在大势力与地头蛇影响下，我们没有一块自己的地盘。',
     window:'楼下推车吱呀作响。街角有人争吵，工人沿着旧厂方向走去。城市没有在等你。',
     barewall:'墙面是剥落的石灰，空空荡荡。没人贴上家族标志，也没有豪华家具。',
     desk:'木箱盖临时当书桌，铅笔、旧地图、一部二手电话摆在上面。以后每件家具都应从经营中添置。',
     poster:'公告贴了又撕。有人写下“蒙面人没有留下名字”，另一人补了一句：“至少欠薪拿回来了。”',
     steps:'两位邻居谈起昨夜的传闻，没人知道你是谁。另一边又有人为拖欠工钱争吵。',
     lantern:'一盏坏了半边的路灯。晚间街上更加危险，街坊只能结伴回家。',
     stall:'摊位旁摆着剩余的蔬菜。店主说本月已经被收了三次不明费用。',
     sign:'市集公告栏堆满失业、寻人和搬迁通知。',
     notice:'求职栏的空白比工作介绍还多。大厂停工后，很多成年人排队等一份合同。',
     factory:'砖墙上停着一块大钟。工厂关门了，门内的生锈机器还没被搬走。',
     crane:'港口吊机穿过雾气，远处几艘轮船卸下货物。工人正争论仓库合同。',
     manifest:'这是一批合法食品的装运清单，价值取决于道路和客户，而不是点击“收款”凭空增加。',
     bed:'两人曾挤在阁楼床垫上，靠做零工度日。现在这里是可以回忆的旧址，不是开局画面。',
     keepsake:'孤儿院旧徽章仍在铁盒中。它说明他们的过去，但不能拿来雇佣儿童。'
    };
    if(key==='newspaper')data.flags.heardRumor=true;
    if(key==='deed')data.flags.readDeed=true;
    if(key==='map')data.flags.lookedAtMap=true;
    if(data.venue==='attic')data.flags.inspectedAttic=true;
    data.interactions.unshift({day,venue:data.venue,key});data.interactions=data.interactions.slice(0,80);
    return {data,events:[event('origin.inspect','留意到的细节',desc[key])]};
  }
  if(action.type==='talk'){
    const who=scenePopulation(data).find(p=>p.id===action.person);
    if(!who)return {error:'这个人不在场'};
    const dialogue={
     kai:'“钥匙还热着呢。我们俩从孤儿院到阁楼，到今天这间办公室……外头还在议论那晚的蒙面人。只要我们不自己说，谁知道？”',
     neighbor:'“有人说两个蒙面人帮工人讨回了钱。是真是假不知道。可巷口的地痞又在敲邻居的门。”',
     runner:'“听说打手们见到蒙面人就跑！不，可能有五个！我也不知道，都是别人说的。”',
     vendor:'“我只是想把摊子摆到黄昏。地头蛇整天来收钱，可巡查的人看见也不管。”',
     guard:'“警卫站得够久，路上的哭声却没人理。公务机构也有自己要讨的账。”',
     worker:'“工厂关了，家里又要吃饭。我不想跟谁混黑道，就想有人肯按时发工资。”',
     clerk:'“我们不是不想安排岗位，是区里根本没有预算。请不要在大厅惹事。”',
     docker:'“有人说有两个蒙面人打倒那个小债主；现在港口大公司在抢他的运输合约。”',
     unionist:'“真正值得敬重的是敢站出来保护普通人，却不再向他们要一份保护费。”',
     caretaker:'“原来住阁楼的两个孩子不回来啦？听说他们买了个办公室。好好过日子吧。”'
    };
    if(who.id==='kai')data.flags.spokeBrother=true;
    if(who.id==='worker')data.flags.heardWorker=true;
    if(['neighbor','runner','docker'].includes(who.id))data.flags.heardRumor=true;
    const text=dialogue[who.id];data.visitorLog.unshift({day,venue:data.venue,person:who.id,text});data.visitorLog=data.visitorLog.slice(0,40);
    return {data,events:[event('origin.talk',who.name,text)]};
  }
  if(action.type==='aid'){
    if(data.venue!=='market')return {error:'需要先来到集市'};
    if(data.flags.helpedVendor)return {error:'今天已经帮助过摊主'};
    if(context.cash<18)return {error:'你现在拿不出18元来帮忙'};
    data.flags.helpedVendor=true;data.streetTrust+=8;data.legend+=2;
    return {data,events:[event('origin.aid','商户的谢意','你出钱替林姨补齐被毁的摊位木板。附近几个店主记下的是“有人愿意帮忙”，而不是你的真实过去。')],
     effects:[{kind:'cash',amount:-18,label:'替摊主修缮摊位'},{kind:'respect',amount:2,label:'街坊感激'}]};
  }
  if(action.type==='protect'){
    if(data.venue!=='alley')return {error:'先去旧港背街'};
    if(data.flags.challengedHarassment)return {error:'今天已经帮街坊处理这件事'};
    data.flags.challengedHarassment=true;data.streetTrust+=5;data.legend+=1;
    return {data,events:[event('origin.protect','巷口重归平静','你和阿凯陪着居民一起把骚扰者劝离，并联系街坊互助者。你没有向居民收钱。')],
     effects:[{kind:'respect',amount:2,label:'平民支持'}]};
  }
  return {error:'未知开局场景操作'};
 },
 tick(data,{day}){
  data.ambientCounter++;
  return {data,events:[{type:'origin.ambient',title:'夜港仍在生活',text:'夜色变换，隔壁街道又有人开始工作。两名蒙面人依旧没有暴露真实身份。',day}]};
 }
};
