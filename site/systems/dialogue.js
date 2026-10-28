import {LOCAL_DIALOGUES} from '../scenes/scene-dialogues.js';
import {SCENE_PEOPLE} from './origin.js';
export const CONVERSATIONS={
 kai:{speaker:'阿凯',start:'greet',nodes:{
  greet:{line:'老板，旧港的运输商在问，我们是做一次生意，还是认真经营下去？',choices:[
   {id:'steady',label:'先把客户做好',next:'steady',respect:1},
   {id:'risky',label:'别急，先收集消息',next:'risky',respect:0}
  ]},
  steady:{line:'明白了。我会优先看合同和账单，别让自己的招牌坏掉。',choices:[]},
  risky:{line:'了解。我先去问问谁在暗中定价，不会贸然答应。',choices:[]}
 }},
 mio:{speaker:'米娅',start:'greet',nodes:{
  greet:{line:'我拿到了三份资料。老板想先看人事，还是看最近的街区舆论？',choices:[
   {id:'people',label:'先说说队伍',next:'people',respect:1},
   {id:'town',label:'先说说街上的人',next:'town',respect:1}
  ]},
  people:{line:'阿凯肯做事，但也希望被认可。安排得好，组织会更稳。',choices:[]},
  town:{line:'店主更在意货物能不能按时到。地盘和人情不能只看颜色。',choices:[]}
 }}
};
for(const [id,spec] of Object.entries(LOCAL_DIALOGUES)){
 const existing=CONVERSATIONS[id];
 if(existing){
   const greet=existing.nodes.greet;
   for(const choice of spec.options){
    if(!greet.choices.some(x=>x.id===choice.id))greet.choices.push({id:choice.id,label:choice.label,next:choice.id,respect:choice.effect==='trust'?1:0});
    existing.nodes[choice.id]={line:choice.reply,choices:[]};
   }
   continue;
 }
 CONVERSATIONS[id]={speaker:spec.speaker,start:'greet',nodes:{greet:{line:spec.opening,
  choices:spec.options.map(x=>({id:x.id,label:x.label,next:x.id,respect:x.effect==='trust'?1:0}))}}};
 for(const option of spec.options)CONVERSATIONS[id].nodes[option.id]={line:option.reply,choices:[]};
}
export const dialogueSystem={
 id:'dialogue',deps:['people'],
 init:()=>({history:[],last:null}),
 reduce(data,action,{context,day,slices}){
  if(action.type!=='choose')return {error:'未知对话指令'};
  if(data.history.some(entry=>entry.day===day&&entry.person===action.person))return {error:'今天已经进行过一次正式会谈'};
  const citizen=String(action.person||'').startsWith('cit-');
  const venue=slices.origin?.venue||'office';
  const isLocal=SCENE_PEOPLE[venue]?.some(p=>p.id===action.person);
  if(!citizen&&!isLocal&&!(context.crew||[]).includes(action.person))return {error:'此人不在这里'};
  const resident=citizen?slices.population?.people.find(x=>x.id===action.person):null;
  if(citizen){
   const site={office:'s0',alley:'s0',market:'s4',labor:'s5',docks:'s2'}[venue];
   const shift=slices.clock.shift;
   const at=shift===1?resident?.work:shift===2?resident?.leisure:resident?.home;
   if(!resident||at!==site)return {error:'此人已经离开'};
  }
  const convo=citizen?{speaker:resident.name,nodes:{greet:{choices:[
   {id:'work',next:'work',respect:0},{id:'help',next:'help',respect:1}]},
   work:{line:'白天工作，晚上回家。我们的生活不应该被各种地头蛇控制。'},
   help:{line:'希望这条街能慢慢变得安全一点。谢谢你肯听。'}}}:CONVERSATIONS[action.person];
  if(!convo)return {error:'此人没有可用对话'};
  const node=convo.nodes[action.node];
  const choice=node?.choices.find(c=>c.id===action.choice);
  if(!choice)return {error:'不存在此项对话选择'};
  const response=convo.nodes[choice.next];
  const result={day,person:action.person,choice:choice.id,line:response.line};
  data.last=result;data.history.unshift(result);data.history=data.history.slice(0,30);
  return {data,events:[{type:'dialogue.spoken',title:convo.speaker+'的回应',text:response.line,person:action.person}],
   effects:choice.respect?[{kind:'respect',amount:choice.respect,label:convo.speaker+'的信任'}]:[]};
 },
 tick(data){return {data,events:[]};}
};
