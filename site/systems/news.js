import {FACTIONS} from './factions.js';
const headline=event=>{
 if(event.type==='territory.changed')return '街区势力更迭 · '+event.text;
 if(event.type==='police.case')return '警方消息 · '+event.text;
 if(event.type==='world.foreign')return '境外快讯 · '+event.text;
 if(event.type==='person.concern')return '人事风闻 · '+event.text;
 if(event.type==='civic.unrest')return '社区消息 · '+event.text;
 if(event.type==='faction.influence')return '商会动向 · '+event.text;
 return event.text;
};
export const newsSystem={
 id:'news',deps:['factions','people','civic','dialogue','estates','transport','justice','contacts'],
 init:()=>({articles:[{id:'opening-edition',day:1,headline:'夜港晚报：旧港出现新的事务所',source:'夜港晚报',category:'local',credibility:83}]}),
 reduce(data,action){if(action.type!=='read')return {error:'新闻只读'};return {data,events:[]};},
 tick(data,{day,events}){
   const recent=events.filter(e=>['faction.influence','territory.changed','police.case','civic.unrest','world.foreign','person.concern','estate.purchased','estate.built','estate.income','justice.opened','justice.progress','transport.completed','crime.incident'].includes(e.type));
   const visible=recent.filter(e=>!e.visible||e.visible).slice(0,5);
   if(!visible.length)visible.push({type:'daily',text:'夜港的各个商会仍在静静争夺生意。'});
   const newArticles=visible.map((e,i)=>({id:'article-'+day+'-'+i,day,headline:headline(e),source:e.type==='police.case'?'城区纪事':'夜港晚报',category:e.type,credibility:e.type==='faction.influence'?76:90}));
   data.articles=[...newArticles,...data.articles].slice(0,45);
   return {data,events:[]};
 }
};
