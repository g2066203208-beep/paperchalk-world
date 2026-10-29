/** Replaceable building interior scene templates. No canvas or DOM dependencies. */
const stableHash=id=>{let n=2166136261;for(const c of String(id))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const presets=[
 ['clinic',/诊所|医院|救护/,['接待大厅','候诊区','诊疗室','药品储藏']],
 ['education',/学校|图书馆/,['入口大厅','自习教室','办公室','馆藏档案']],
 ['harbor',/港|码头|船坞|海关|货场/,['物流接待区','装卸区域','调度办公室','货物堆场']],
 ['industrial',/矿|厂|场|站|仓|铁路|煤|工业|林业/,['生产作业区','装卸入口','值班室','工具库']],
 ['retail',/店|市|铺|餐|咖啡|鱼|银行|报社/,['顾客区','货架','后仓','收银处']],
 ['hotel',/旅馆|客栈|公寓/,['前厅','服务区','客房','公共走廊']],
 ['residential',/居民|住宅|住房|宿舍/,['客厅','厨房','卧室','储物间']]
];
const defaultSpec={id:'generic',matches:()=>true,rooms:['门厅','主要功能区','工作区域','储物间']};
export function createInteriorRegistry(){
 const templates=new Map();
 function register(id,{matches,rooms}){
  if(!/^[a-z][a-z0-9-]*$/.test(id)||templates.has(id))throw Error('duplicate or invalid interior '+id);
  if(typeof matches!=='function'||!Array.isArray(rooms)||rooms.length!==4||
   rooms.some(n=>typeof n!=='string'||!n.trim()))throw Error('invalid interior template');
  templates.set(id,{id,matches,rooms:[...rooms]});return id;
 }
 function remove(id){return templates.delete(id);}
 function build(b){
  if(!b?.id||!b?.name||!b?.street)throw Error('building requires stable id, name and street');
  const template=[...templates.values()].find(v=>v.matches(b))||defaultSpec;
  const seed=stableHash(b.id),seed2=stableHash(b.street);
  const room=template.id==='industrial'||template.id==='harbor'?'workshop':
   template.id==='retail'?'store':template.id==='clinic'||template.id==='education'?'civic':'home';
  const rooms=template.rooms,shift=seed%4;
  return {id:b.id,kind:b.name,street:b.street,template:template.id,room,rooms:[...rooms],
   width:13+seed%5,height:9+Math.floor(seed/6)%4,fixtureSeed:seed%9999,
   layout:rooms.map((name,i)=>({id:b.id+'-room-'+i,name,
    x:i%2===0?6+shift:52-shift,y:Math.floor(i/2)===0?9+seed2%5:55-seed2%5,w:40,h:37}))
  };
 }
 return Object.freeze({register,remove,build,registered:()=>[...templates.keys()]});
}
export const interiors=createInteriorRegistry();
for(const [id,re,rooms] of presets)interiors.register(id,{matches:b=>re.test(b.name),rooms});
export const interiorFor=b=>interiors.build(b);
