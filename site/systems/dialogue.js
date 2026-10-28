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
export const dialogueSystem={
 id:'dialogue',deps:['people'],
 init:()=>({history:[],last:null}),
 reduce(data,action,{context,day}){
  if(action.type!=='choose')return {error:'未知对话指令'};
  const convo=CONVERSATIONS[action.person];
  if(!convo||(context.crew||[]).includes(action.person)===false)return {error:'该人物尚不能对话'};
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
