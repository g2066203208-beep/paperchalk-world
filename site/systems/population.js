/** Persistent residents follow jobs and homes. Aggregated city pedestrians avoid DOM-heavy full simulation. */
const first=['林','陈','顾','江','宋','许','赵','吴','周','韩','白','夏'];
const last=['远','欣','宁','舟','真','安','芙','澄','月','阳','然','雅'];
const occupations=['店员','码头工人','司机','餐馆职员','记者','护士','教师','保安','店主','学生'];
const duty=(p,shift)=>shift===0?'通勤':shift===1?'工作':shift===2?'休闲':'回家';
export function citizensInCell(data,cell){
 return data.people.filter(p=>p.location===cell);
}
export const populationSystem={
 id:'population',deps:['clock','factions'],
 init:({seed,slices})=>({people:Array.from({length:80},(_,i)=>{
  const home=(i*7+Math.floor(seed%5))%16,work=(i*11+5)%16;
  return {id:'cit-'+String(i).padStart(3,'0'),name:first[i%12]+last[(i*5+3)%12],
   age:18+(i*17)%48,occupation:occupations[i%occupations.length],home:'s'+home,work:'s'+work,
   leisure:'s'+(i*3+7)%16,location:'s'+home,activity:'回家',trust:35+(i*13)%52,witnessed:[]};
 }),lastPopulation:0,footTraffic:{} }),
 reduce(data,action){
  if(action.type!=='inspect')return {error:'人口模块仅支持查看统计'};
  return {data,events:[]};
 },
 tick(data,{day,slices}){
   const visits={},counts={};for(let i=0;i<16;i++){visits['s'+i]=0;counts['s'+i]=0;}
   for(const p of data.people){
     // Each daily tick simulates commute, work, leisure, sleep (four shifts).
     for(const shift of [0,1,2,3]){
       const loc=shift===1?p.work:shift===2?p.leisure:p.home;
       visits[loc]++;
       if(shift===3){p.location=loc;p.activity=duty(p,shift);}
     }
     counts[p.work]++;
   }
   data.lastPopulation=data.people.length;
   data.footTraffic=visits;
   return {data,events:[{type:'population.daily',title:'夜港市民作息',text:'今天有 '+data.people.length+' 位具有固定住址和工作的市民在城市里完成通勤、上班及休闲。'}]};
 }
};
