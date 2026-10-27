// Data-driven black-comedy narrative kernel. Deterministic, host-authoritative,
// text is data and side effects use only explicitly allowed state operations.
export const WORLD_LOCATIONS=Object.freeze({
 shop:{id:'shop',name:'路边小店',blurb:'零下十七度。收银机比市政府更准时。',exits:['street','stop'],layerIds:['sky','apartments','snow','kiosk','window']},
 street:{id:'street',name:'雪街',blurb:'环卫公告说积雪将在春季之前清理完毕。没有注明哪一年。',exits:['shop','stop','flats'],layerIds:['sky','apartments','trees','road','snow']},
 stop:{id:'stop',name:'末班车站',blurb:'站牌写着「请耐心等待」。涂改痕迹显示原句是「请等待」。',exits:['shop','street','flats'],layerIds:['sky','buildings','busstop','snow']},
 flats:{id:'flats',name:'居民楼口',blurb:'门铃坏了三年，告示却每月更新。',exits:['street','stop'],layerIds:['sky','building','entrance','snow']}
});
export const CAST=Object.freeze({
 clerk:{id:'clerk',name:'你',role:'店主',voice:'话不多，嘴上倔强，仍愿意给陌生人留一杯温水'},
 driver:{id:'driver',name:'周师傅',role:'末班车司机',voice:'任何坏消息都先用运营术语包装'},
 neighbor:{id:'neighbor',name:'娜佳',role:'小区住户',voice:'擅长从公告的标点符号推断城市的命运'},
 inspector:{id:'inspector',name:'街道办记录员',role:'检查员',voice:'认真执行荒谬制度，也可能被制度折磨'}
});
export const STORY_GRAPH=Object.freeze({
 notice:{
  id:'notice',scene:'shop',speaker:'narrator',text:'玻璃上贴着新公告：「为改善居民候车体验，本站将暂停车辆到站。」纸还没贴牢，风已经先表示赞成。',
  cue:'paper_rattle',
  choices:[
   {id:'read',text:'把公告读给自己听，确认不是看错。',next:'clerk_remark',effects:[{type:'flag',key:'read_notice',value:true}]},
   {id:'ignore',text:'不读。成年人对公文也有逃避的权利。',next:'clerk_remark',effects:[{type:'flag',key:'avoided_notice',value:true}]}
  ]
 },
 clerk_remark:{
  id:'clerk_remark',scene:'shop',speaker:'clerk',text:'有车的时候嫌它晚点。没有车了，倒是准时得很。',
  cue:'quiet_pause',
  choices:[
   {id:'tea',text:'擦净柜台，留一杯热茶。',next:'first_visitor',effects:[{type:'flag',key:'left_tea',value:true}]},
   {id:'silence',text:'什么也不说，听风吹过窗框。',next:'first_visitor',effects:[{type:'flag',key:'chose_silence',value:true}]}
  ]
 },
 first_visitor:{
  id:'first_visitor',scene:'shop',speaker:'driver',text:'周师傅在窗前抖了抖肩上的雪：「以后车不会晚点了。领导说，这叫服务质量提升。」',
  cue:'customer_stop',
  choices:[
   {id:'laugh',text:'「不发车确实最不容易迟到。」',next:'driver_reply',effects:[{type:'remember',actor:'driver',memory:'shared_joke'}]},
   {id:'ask',text:'「那每天等车的人呢？」',next:'driver_reply',effects:[{type:'remember',actor:'driver',memory:'asked_about_riders'}]},
   {id:'quiet',text:'把杯子推过去，不作评论。',next:'driver_reply',effects:[{type:'remember',actor:'driver',memory:'quiet_cup'}]}
  ]
 },
 driver_reply:{
  id:'driver_reply',scene:'shop',speaker:'driver',text:'他没有笑，只是把手放在杯壁上。「今晚还跑最后一班。要是有谁在等，叫他们别信公告。」',
  cue:'cup_touch',
  choices:[{id:'promise',text:'点头。把这句话记下来。',next:null,effects:[{type:'flag',key:'heard_last_bus',value:true}]}]
 },
 after_sale:{
  id:'after_sale',scene:'shop',speaker:'neighbor',text:'娜佳买完东西没走。「公告说公交站将永久优化。你说，永久是不是比临时更短？」',
  cue:'door_bell',
  choices:[
   {id:'answer',text:'「在这座城，得看公章的耐久度。」',next:'sale_end',effects:[{type:'remember',actor:'neighbor',memory:'stamp_joke'}]},
   {id:'listen',text:'等她说下去。',next:'sale_end',effects:[{type:'remember',actor:'neighbor',memory:'listened'}]}
  ]
 },
 sale_end:{
  id:'sale_end',scene:'shop',speaker:'neighbor',text:'她看了一眼窗外：「我去站牌那边看看。那里至少还有字写着‘明天’。」',
  cue:'exit_soft',
  choices:[{id:'later',text:'继续营业。',next:null,effects:[{type:'flag',key:'neighbor_at_stop',value:true}]}]
 },
 day_two:{
  id:'day_two',scene:'shop',speaker:'narrator',text:'第二天，公告不见了，胶带还在。有人把告示卷走，留下了「候车体验」四个字。',
  cue:'morning_wind',
  choices:[
   {id:'find',text:'去站台看看。',next:null,effects:[{type:'flag',key:'follow_notice',value:true}]},
   {id:'stay',text:'今天先营业。城市总会来通知你它又改了什么。',next:null,effects:[{type:'flag',key:'kept_open',value:true}]}
  ]
 },
 stop_event:{
  id:'stop_event',scene:'stop',speaker:'driver',text:'站台空着。时刻表被雪粘住，只剩最后一行：「如遇不可抗力，请谅解。」雪显然不准备道歉。',
  cue:'snow_pause',
  choices:[
   {id:'leave_note',text:'写下今晚末班车的消息。',next:null,effects:[{type:'flag',key:'posted_last_bus',value:true},{type:'remember',actor:'driver',memory:'helped_riders'}]},
   {id:'keep',text:'把消息留在心里，继续等。',next:null,effects:[{type:'flag',key:'waited_at_stop',value:true}]}
  ]
 }
});
export const STORY_EFFECT_TYPES=Object.freeze(['flag','remember']);
export const STORY_AVATARS=Object.freeze(['female','male']);
export function createStory(){
 return {version:1,avatar:null,location:'shop',active:'notice',visited:['shop'],
  flags:{},memories:{},history:[],completed:[],eventIds:[],salesSeen:0,lastCue:null};
}
export function ensureStory(shop){
 if(!shop||typeof shop!=='object')return null;
 if(!shop.story||shop.story.version!==1)shop.story=createStory();
 return shop.story;
}
export function storyNode(story){
 const node=story?.active?STORY_GRAPH[story.active]:null;
 return node||null;
}
export function canTravel(story,destination){
 return Boolean(WORLD_LOCATIONS[story?.location]?.exits.includes(destination));
}
function performEffects(story,effects){
 for(const effect of effects){
  if(!STORY_EFFECT_TYPES.includes(effect.type))throw Error('Forbidden narrative effect');
  if(effect.type==='flag')story.flags[effect.key]=effect.value;
  if(effect.type==='remember'){
   const a=story.memories[effect.actor]||[];
   if(!a.includes(effect.memory))story.memories[effect.actor]=[...a,effect.memory];
  }
 }
}
export function chooseStory(shop,choiceId,providedNodeId=null){
 const s=ensureStory(shop),node=storyNode(s);
 if(!node||typeof choiceId!=='string'||(providedNodeId&&providedNodeId!==node.id))return false;
 const option=node.choices.find(c=>c.id===choiceId);
 if(!option||!option.effects.every(e=>STORY_EFFECT_TYPES.includes(e.type)))return false;
 performEffects(s,option.effects);
 s.history.push({node:node.id,choice:option.id,day:shop.day,location:s.location});
 if(!s.completed.includes(node.id))s.completed.push(node.id);
 s.active=option.next||null;s.lastCue=s.active?STORY_GRAPH[s.active].cue:node.cue;
 shop.revision=(shop.revision||0)+1;
 return true;
}
export function chooseAvatar(shop,avatar){
 const s=ensureStory(shop);
 if(!STORY_AVATARS.includes(avatar)||s.avatar===avatar)return false;
 s.avatar=avatar;shop.revision=(shop.revision||0)+1;return true;
}
export function travelTo(shop,destination){
 const s=ensureStory(shop);
 if(!WORLD_LOCATIONS[destination]||!canTravel(s,destination))return false;
 s.location=destination;if(!s.visited.includes(destination))s.visited.push(destination);
 if(destination==='stop'&&s.flags.heard_last_bus&&!s.completed.includes('stop_event')&&!s.active)s.active='stop_event';
 s.lastCue='snow_footsteps';shop.revision=(shop.revision||0)+1;
 return true;
}
export function seeShopProgress(shop,previous={}){
 const s=ensureStory(shop);
 const oldTotal=previous.totalServed??shop.totalServed;
 if(shop.totalServed>oldTotal)s.salesSeen+=shop.totalServed-oldTotal;
 if(s.active)return false;
 if(!s.completed.includes('after_sale')&&s.salesSeen>=1&&s.completed.includes('driver_reply')){
  s.active='after_sale';s.lastCue='door_bell';return true;
 }
 if(shop.day>=2&&!s.completed.includes('day_two')&&!s.completed.includes('after_sale'))return false;
 if(shop.day>=2&&!s.completed.includes('day_two')){
  s.active='day_two';s.lastCue='morning_wind';return true;
 }
 return false;
}
export function applyStoryAction(shop,by,a){
 if(!shop?.players?.[by]||!a||typeof a!=='object')return false;
 if(a.cmd==='storyChoice')return chooseStory(shop,a.key,a.nodeId);
 if(a.cmd==='storyTravel')return travelTo(shop,a.key);
 if(a.cmd==='storyAvatar')return chooseAvatar(shop,a.key);
 return false;
}
export function validateStoryGraph(graph=STORY_GRAPH){
 const failures=[],ids=Object.keys(graph);
 for(const [id,n] of Object.entries(graph)){
  if(id!==n.id||!WORLD_LOCATIONS[n.scene]||!n.text||!n.speaker||!Array.isArray(n.choices)||!n.choices.length)failures.push('Malformed node '+id);
  const choices=new Set();
  for(const c of n.choices||[]){
   if(choices.has(c.id)||!c.id||!c.text)failures.push('Duplicate/empty option '+id);choices.add(c.id);
   if(c.next&&!graph[c.next])failures.push('Dangling link '+id+':'+c.next);
   for(const e of c.effects||[])if(!STORY_EFFECT_TYPES.includes(e.type))failures.push('Forbidden effect '+id);
  }
 }
 // Follow chains; all nodes must reach a terminal choice, including cyclic stories.
 for(const id of ids){
  const visiting=new Set();
  function hasEnd(n){if(visiting.has(n)||!graph[n])return false;visiting.add(n);
   return graph[n].choices.some(c=>!c.next||hasEnd(c.next));}
  if(!hasEnd(id))failures.push('No terminating path '+id);
 }
 return failures;
}
export function validateStoryState(s){
 return Boolean(s?.version===1&&(!s.active||STORY_GRAPH[s.active])&&WORLD_LOCATIONS[s.location]&&
  (s.avatar===null||STORY_AVATARS.includes(s.avatar))&&Array.isArray(s.history)&&
  Array.isArray(s.visited)&&Array.isArray(s.completed)&&
  Number.isInteger(s.salesSeen)&&s.salesSeen>=0);
}
