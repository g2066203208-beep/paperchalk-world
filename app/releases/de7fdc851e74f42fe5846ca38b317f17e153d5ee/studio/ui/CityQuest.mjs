export const CITY_QUEST_KEY='paperworld.city-prologue.quest.v1';
export const CITY_QUEST_VERSION=1;
export const CITY_QUEST_STEPS=Object.freeze([
  Object.freeze({id:'store',title:'顺路去便利店',text:'离开校门，沿学园街向东走到街角便利店。',targetX:12,triggerX:9.5,districtId:'academy'}),
  Object.freeze({id:'central',title:'穿过中央车站',text:'继续向东，走到中央车站的灯牌下。',targetX:480,triggerX:450,districtId:'central'}),
  Object.freeze({id:'river',title:'沿月河继续回家',text:'穿过市中心，到月河公园的河岸步道。',targetX:840,triggerX:810,districtId:'riverside'}),
  Object.freeze({id:'home',title:'回到星灯住宅区',text:'最后一段路了。沿街走到星灯住宅区，结束放学归途。',targetX:1320,triggerX:1290,districtId:'residential'}),
]);

function safeStorage(provided){
  try{
    const storage=provided===undefined?globalThis.localStorage:provided;
    return storage&&typeof storage.getItem==='function'&&typeof storage.setItem==='function'&&typeof storage.removeItem==='function'?storage:null;
  }catch{return null;}
}
function validIndex(value){return Number.isInteger(value)&&value>=0&&value<=CITY_QUEST_STEPS.length;}

export class CityPrologueQuest{
  constructor({storage,now=Date.now,key=CITY_QUEST_KEY}={}){
    this.key=key;this.storage=safeStorage(storage);this.now=typeof now==='function'?now:Date.now;this.index=0;this.updatedAt=0;
  }
  snapshot(){
    const completed=this.index>=CITY_QUEST_STEPS.length;
    const step=completed?null:CITY_QUEST_STEPS[this.index];
    return Object.freeze({index:this.index,total:CITY_QUEST_STEPS.length,completed,step,
      title:completed?'已经到家':step.title,
      text:completed?'放学归途完成。月灯市仍然可以继续自由漫游。':step.text,
      progress:`${Math.min(this.index,CITY_QUEST_STEPS.length)} / ${CITY_QUEST_STEPS.length}`,
      updatedAt:this.updatedAt});
  }
  load(){
    if(!this.storage)return {ok:false,status:'unavailable',snapshot:this.snapshot()};
    try{
      const text=this.storage.getItem(this.key);
      if(text===null)return {ok:true,status:'empty',snapshot:this.snapshot()};
      const record=JSON.parse(text);
      if(!record||record.version!==CITY_QUEST_VERSION||!validIndex(record.index))throw new Error('invalid quest save');
      this.index=record.index;this.updatedAt=Number.isFinite(record.updatedAt)&&record.updatedAt>=0?record.updatedAt:0;
      return {ok:true,status:'loaded',snapshot:this.snapshot()};
    }catch{
      this.index=0;this.updatedAt=0;
      return {ok:false,status:'corrupt',snapshot:this.snapshot()};
    }
  }
  save(){
    if(!this.storage)return false;
    try{
      const updatedAt=this.now();if(!Number.isFinite(updatedAt)||updatedAt<0)return false;
      this.updatedAt=updatedAt;
      this.storage.setItem(this.key,JSON.stringify({version:CITY_QUEST_VERSION,index:this.index,updatedAt}));
      return true;
    }catch{return false;}
  }
  update(x){
    if(!Number.isFinite(x))return {advanced:false,completedNow:false,snapshot:this.snapshot()};
    const before=this.index;
    while(this.index<CITY_QUEST_STEPS.length&&x>=CITY_QUEST_STEPS[this.index].triggerX)this.index++;
    const advanced=this.index!==before,completedNow=advanced&&this.index===CITY_QUEST_STEPS.length;
    if(advanced)this.save();
    return {advanced,completedNow,fromIndex:before,toIndex:this.index,snapshot:this.snapshot()};
  }
  reset(){
    this.index=0;this.updatedAt=0;
    if(this.storage){try{this.storage.removeItem(this.key);}catch{}}
    return this.snapshot();
  }
}
