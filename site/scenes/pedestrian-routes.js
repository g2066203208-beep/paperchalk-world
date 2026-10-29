/** Deterministic, authored pedestrian path data, independent of UI and animation engine. */
export const LOCATIONS={
 alley:{cell:'s0',entrances:[-11,111],lanes:[77,81,86,90],shop:34,ambient:['又听说那两个蒙面人的事了。','工厂今天还招人吗？','先去街口看一眼。']},
 market:{cell:'s4',entrances:[-11,111],lanes:[76,81,85,90],shop:40,ambient:['蔬菜要涨价了。','林姨的摊位开了吗？','买完菜早点回家。']},
 labor:{cell:'s5',entrances:[-11,111],lanes:[77,81,86,89],shop:54,ambient:['今天还有面试。','再去就业所问问。','厂门口又贴告示了。']},
 docks:{cell:'s2',entrances:[-11,111],lanes:[78,82,86,90],shop:36,ambient:['这批货什么时候到？','码头今天风真大。','干完这班就回家。']}
};
export function deterministicIndex(id,sequence=0){
 const digits=Number(String(id).replace(/\D/g,''))||0;
 return (digits*7+sequence*11)%997;
}
export function residentsForStreet(world,venue){
 const cfg=LOCATIONS[venue];
 if(!cfg)return [];
 const shift=world.slices.clock.shift;
 const location=p=>shift===1?p.work:shift===2?p.leisure:p.home;
 return world.slices.population.people.filter(p=>location(p)===cfg.cell)
  .sort((a,b)=>deterministicIndex(a.id,shift)-deterministicIndex(b.id,shift));
}
/** Geometry is percentages of the stage, not a tiny stationary oscillation. */
export function pedestrianPlan(person,venue,shift,sequence=0){
 const config=LOCATIONS[venue];
 if(!config)throw Error('street venue required');
 const value=deterministicIndex(person.id,sequence+shift*3);
 const fromLeft=((Math.floor(value/3)+sequence)%2===0);
 const hasShop=(value%5===1);
 const pause= value%3===0;
 const lane=config.lanes[value%config.lanes.length];
 const start=fromLeft?-11:111;
 const exit=hasShop?config.shop+(value%3-1)*4:(fromLeft?111:-11);
 const speed=13+(value%5)*1.25; // percent of stage per second
 const stop=pause?(fromLeft?36+(value%4)*7:65-(value%4)*7):null;
 return {id:person.id,name:person.name,occupation:person.occupation,fromLeft,
  start,exit,lane,speed,stop,shop:hasShop,delay:(value%4)*.16,
  color:['#6f8e9d','#b77e7e','#a2a486','#957c93','#c3a477'][value%5],
  skin:['#e8be9b','#d6a085','#f0d0b4'][value%3],
  hair:['#293742','#523a3b','#3c4148','#514333'][value%4],
  clothing:value%4,bubble:config.ambient[value%config.ambient.length],seed:value};
}
export function stepWalker(walker,dt){
 if(walker.phase==='talking'||walker.phase==='hovering')return walker;
 const copy={...walker};
 let remaining=Math.max(0,Math.min(.08,dt));
 if(copy.phase==='waiting'||copy.phase==='chatting'){
  copy.remaining=Math.max(0,(copy.remaining||0)-remaining);
  if(copy.remaining<=0){copy.phase='walking';copy.stopped=true;}
  return copy;
 }
 if(copy.phase==='entering-shop'||copy.phase==='leaving')return copy;
 const direction=copy.plan.fromLeft?1:-1;
 const prev=copy.x;
 copy.x+=direction*copy.plan.speed*remaining;
 if(!copy.stopped&&copy.plan.stop!==null&&
    (direction>0?prev<copy.plan.stop&&copy.x>=copy.plan.stop:prev>copy.plan.stop&&copy.x<=copy.plan.stop)){
    copy.x=copy.plan.stop;copy.phase='chatting';copy.remaining=1.25+(copy.plan.seed%3)*.5;
 }
 if(direction>0?copy.x>=copy.plan.exit:copy.x<=copy.plan.exit){
   copy.x=copy.plan.exit;
   copy.phase=copy.plan.shop?'entering-shop':'leaving';
   copy.remaining=copy.plan.shop?.56:.06;
 }
 return copy;
}
