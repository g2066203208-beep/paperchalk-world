/** Parcel ownership and legal storefronts: independent from gang influence/control. */
import {clamp} from '../core/runtime.js';
export const BUSINESS_TYPES=[
 {id:'diner',name:'街角食堂',build:110,revenue:40,upkeep:15,visitors:9,info:'以餐饮与附近客流产生收入'},
 {id:'garage',name:'汽车修理厂',build:180,revenue:66,upkeep:29,visitors:5,info:'车行与运输业务'},
 {id:'warehouse',name:'小型仓库',build:145,revenue:49,upkeep:20,visitors:3,info:'物流服务和地区订单'},
 {id:'club',name:'夜间俱乐部',build:240,revenue:84,upkeep:42,visitors:11,info:'夜生活与社交场所'}
];
export const priceOf=(index,sub)=>85+((index*13+sub*19)%9)*22;
export const estatesSystem={
 id:'estates',deps:['factions','people','population','clock'],
 init:()=>({parcels:Array.from({length:48},(_,i)=>{
    const cell=Math.floor(i/3),sub=i%3;
    return {id:'lot-'+i,cell:'s'+cell,title:'地块 '+String(cell+1).padStart(2,'0')+'-'+(sub+1),
      owner:i===0?'landlord':sub===0&&cell%4===2?'sail':'market',
      price:priceOf(cell,sub),building:i===0?{type:'office',level:1,mode:'legal',name:'破旧出租事务所'}:null,
      condition:62+(i*9)%35,manager:null,lastProfit:0};
   }),journal:[],playerIncome:0}),
 reduce(data,action,{context,slices,day}){
  const lot=data.parcels.find(p=>p.id===action.lot);
  if(!lot)return {error:'不存在的地块'};
  if(action.type==='buy'){
    if(lot.owner!=='market')return {error:'这块土地暂不出售'};
    const district=slices.factions.cells[Number(lot.cell.slice(1))];
    if(district.owner!=='player'&&district.influence.player<20)return {error:'先在此街区建立至少 20 点关系'};
    if(context.cash<lot.price)return {error:'购地预算不足'};
    lot.owner='player';
    return {data,events:[{type:'estate.purchased',title:'地产购入',text:'购置 '+lot.title+'，地契已存档。',lot:lot.id}],
     effects:[{kind:'cash',amount:-lot.price,label:'购入土地：'+lot.title}]};
  }
  if(action.type==='build'){
    const b=BUSINESS_TYPES.find(x=>x.id===action.building);
    if(lot.owner!=='player'||lot.building)return {error:'无法在这块地上施工'};
    if(!b)return {error:'未知建筑类型'};
    if(context.cash<b.build)return {error:'建设预算不足'};
    lot.building={type:b.id,level:1,mode:'legal',name:b.name};
    lot.condition=95;
    return {data,events:[{type:'estate.built',title:'新商业设施落成',text:lot.title+'的'+b.name+'已经开张。',lot:lot.id}],
      effects:[{kind:'cash',amount:-b.build,label:'建设'+b.name+' · '+lot.title}]};
  }
  if(action.type==='operate'){
    if(lot.owner!=='player'||!lot.building||lot.building.type==='office')return {error:'只能调整自己的营业设施'};
    if(!['legal','underground'].includes(action.mode))return {error:'营业类别无效'};
    if(lot.building.mode===action.mode)return {error:'已经处于该经营状态'};
    lot.building.mode=action.mode;
    return {data,events:[{type:'estate.mode',title:'业务调整',text:lot.title+'的业务安排已切换为'+(action.mode==='legal'?'合法经营':'高风险地下业务')+'。',lot:lot.id}]};
  }
  if(action.type==='upgrade'){
    if(lot.owner!=='player'||!lot.building||lot.building.type==='office'||lot.building.level>=3)return {error:'不可升级该建筑'};
    const cost=90*lot.building.level;
    if(context.cash<cost)return {error:'升级预算不足'};
    lot.building.level++;
    return {data,events:[{type:'estate.upgrade',title:'建筑扩建',text:lot.title+'升级至 '+lot.building.level+' 级。',lot:lot.id}],
     effects:[{kind:'cash',amount:-cost,label:'设施升级：'+lot.title}]};
  }
  return {error:'地产操作无效'};
 },
 tick(data,{day,slices,signal}){
  const effects=[],events=[],citizens=slices.population;
  let total=0;
  for(const lot of data.parcels){
    const b=lot.building;
    if(!b||lot.owner!=='player'||b.type==='office')continue;
    const typ=BUSINESS_TYPES.find(t=>t.id===b.type);
    const traffic=(citizens.footTraffic[lot.cell]||0);
    const mood=slices.factions.cells[Number(lot.cell.slice(1))].publicMood;
    const visitors=Math.min(typ.visitors*b.level,Math.round(traffic*.21+signal(lot.id)*5));
    const gross=Math.round((typ.revenue+visitors*3)*b.level*(.6+mood/250));
    const tax=Math.max(1,Math.round(gross*.12)),license=5;
    const cost=typ.upkeep*b.level+8+tax+license;
    const profit=gross-cost+(b.mode==='underground'?Math.floor(gross*.65):0);
    lot.lastProfit=profit;lot.condition=clamp(lot.condition-1,25,100);
    total+=profit;
    events.push({type:'estate.income',title:'商铺日报',text:b.name+'('+lot.title+')客流 '+visitors+'，税款 '+tax+'、经营许可费 '+license+'，营业结余 '+profit+' 元。',lot:lot.id,profit,tax,license});
    if(b.mode==='underground')events.push({type:'business.risky',title:'高风险经营记录',text:lot.title+'发生未经许可的经营活动，产生了可供警方调查的事件记录。',lot:lot.id,severity:2,actor:'player'});
  }
  if(total)effects.push({kind:'cash',amount:total,label:'合法门店与高风险副业净营业利润'});
  data.playerIncome=total;
  data.journal.unshift({day,profit:total});data.journal=data.journal.slice(0,60);
  return {data,events,effects};
 }
};
