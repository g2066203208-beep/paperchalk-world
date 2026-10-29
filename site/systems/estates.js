/** Parcel ownership and legal storefronts: independent from gang influence/control. */
import {clamp} from '../core/runtime.js';
import {INDUSTRIES,INDUSTRY,PRICE_MODES,newFirm,runIndustryDay,MAX_INVENTORY,stockUnits,cellDistance} from './industry-model.js';
// Retains old API and parcel types while expanding to an extensible catalog.
export const BUSINESS_TYPES=INDUSTRIES;
export const priceOf=(index,sub)=>85+((index*13+sub*19)%9)*22;
export const estatesSystem={
 id:'estates',deps:['factions','people','population','clock'],
 init:()=>({parcels:Array.from({length:48},(_,i)=>{
    const cell=Math.floor(i/3),sub=i%3;
    return {id:'lot-'+i,cell:'s'+cell,title:'地块 '+String(cell+1).padStart(2,'0')+'-'+(sub+1),
      owner:i===0?'player':sub===0&&cell%4===2?'sail':'market',
      price:priceOf(cell,sub),building:i===0?{type:'office',level:1,mode:'legal',name:'毛坯旧办公室'}:null,
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
    lot.building={type:b.id,level:1,mode:'legal',name:b.name,firm:newFirm(b.id)};
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
    if(lot.owner!=='player'||!lot.building||lot.building.type==='office'||lot.building.level>=5)return {error:'不可升级该建筑'};
    const cost=Math.round(95*lot.building.level*(1+lot.building.level*.25));
    if(context.cash<cost)return {error:'升级预算不足'};
    lot.building.level++;
    return {data,events:[{type:'estate.upgrade',title:'建筑扩建',text:lot.title+'升级至 '+lot.building.level+' 级。',lot:lot.id}],
     effects:[{kind:'cash',amount:-cost,label:'设施升级：'+lot.title}]};
  }
  // Old saves used automatic flat income. Adoption is explicit so existing owners
  // never lose their profitable assets or have surprise inventory state changes.
  if(action.type==='modernize'){
    if(lot.owner!=='player'||!lot.building||lot.building.type==='office')return {error:'只能升级自己的商铺经营系统'};
    if(lot.building.firm)return {error:'此店已启用精细经营'};
    lot.building.firm=newFirm(lot.building.type);
    return {data,events:[{type:'estate.modernized',title:'企业管理改造',
      text:lot.title+'已进入进货、库存、用工、售价与税费的精细化经营。'}]};
  }
  if(['pricing','supply','hire','fire','repair','toggle','transfer'].includes(action.type)){
    if(lot.owner!=='player'||!lot.building?.firm)return {error:'先购买产业并启用精细化经营'};
    const b=lot.building,f=b.firm,kind=INDUSTRY[b.type];
    if(action.type==='pricing'){
      if(!Object.hasOwn(PRICE_MODES,action.price)||f.price===action.price)return {error:'请选择不同的有效定价'};
      f.price=action.price;
      return {data,events:[{type:'estate.price',title:'企业定价调整',text:kind.name+'改为'+PRICE_MODES[f.price].name+'。'}]};
    }
    if(action.type==='supply'){
      f.autoSupply=!f.autoSupply;
      return {data,events:[{type:'estate.supply',title:'采购策略',text:kind.name+(f.autoSupply?'恢复自动采购与内部供货':'关闭自动采购，由玩家手工调度存货')+'。'}]};
    }
    if(action.type==='hire'){
      if(f.workers>=kind.maxWorkers)return {error:'员工人数已达该企业上限'};
      if(context.cash<18)return {error:'招聘和培训需要18元启动经费'};
      f.workers++;
      return {data,events:[{type:'estate.worker',title:'商铺员工入职',text:kind.name+'有一名成年员工自愿签订劳动合同，每日工资计入实际经营费用。'}],
        effects:[{kind:'cash',amount:-18,label:'员工招聘培训：'+kind.name}]};
    }
    if(action.type==='fire'){
      if(f.workers<=1)return {error:'至少保留一名值班员工；可选择暂停营业'};
      f.workers--;
      return {data,events:[{type:'estate.worker',title:'结束员工合同',text:kind.name+'已安排劳动合同解除手续。'}]};
    }
    if(action.type==='toggle'){
      f.open=!f.open;
      return {data,events:[{type:'estate.open',title:'营业状态变更',text:kind.name+(f.open?'恢复营业':'暂时歇业，仍需支付员工工资与基本维护')+'。'}]};
    }
    if(action.type==='repair'){
      if(lot.condition>=99)return {error:'设备状况良好'};
      const cost=20+Math.ceil((100-lot.condition)*.65);
      if(context.cash<cost)return {error:'维修资金不足'};
      lot.condition=100;
      return {data,events:[{type:'estate.repair',title:'设备修复',text:kind.name+'设备修复到100%，花费'+cost+'元。'}],
       effects:[{kind:'cash',amount:-cost,label:'企业设备维修：'+kind.name}]};
    }
    if(action.type==='transfer'){
      const other=data.parcels.find(x=>x.id===action.to);
      const item=action.good,qty=action.quantity;
      if(!other||other.id===lot.id||other.owner!=='player'||!other.building?.firm)return {error:'目的地不是另一间自营商铺'};
      if(!INDUSTRY[b.type]||!INDUSTRY[other.building.type])return {error:'目标企业不存在'};
      if(typeof item!=='string'||!Object.hasOwn(f.stock,item)||!Number.isInteger(qty)||qty<1||qty>25)return {error:'必须从真实存货中转移1至25单位'};
      if((f.stock[item]||0)<qty)return {error:'源企业库存不足'};
      if(stockUnits(other.building.firm)+qty>MAX_INVENTORY)return {error:'目的地仓库容量不足'};
      const fee=Math.ceil(qty*(.3+.12*cellDistance(lot.cell,other.cell)));
      if(context.cash<fee)return {error:'无法支付实际运输费用'};
      f.stock[item]-=qty;
      other.building.firm.stock[item]=(other.building.firm.stock[item]||0)+qty;
      return {data,events:[{type:'estate.transfer',title:'企业间真实调拨',
        text:qty+'单位'+item+'从'+lot.title+'转到'+other.title+'，运费'+fee+'元。'}],
        effects:[{kind:'cash',amount:-fee,label:'内部物流调拨：'+lot.title+'→'+other.title}]};
    }
  }
  return {error:'地产操作无效'};
 },
 tick(data,{day,slices,signal,context}){
  const effects=[],events=[],citizens=slices.population;
  let total=0;
  for(const lot of data.parcels){
    const b=lot.building;
    if(!b||lot.owner!=='player'||b.type==='office'||b.firm)continue;
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
  if(total)effects.push({kind:'cash',amount:total,label:'旧版资产净营业利润'});
  const advanced=runIndustryDay(data.parcels,{day,slices,context,signal});
  effects.push(...advanced.effects);events.push(...advanced.events);
  total+=advanced.total;
  data.playerIncome=total;
  data.journal.unshift({day,profit:total,advanced:advanced.books.length,sales:advanced.books.reduce((n,x)=>n+x.revenue,0),
    costs:advanced.books.reduce((n,x)=>n+x.expenses,0)});data.journal=data.journal.slice(0,60);
  return {data,events,effects};
 }
};
