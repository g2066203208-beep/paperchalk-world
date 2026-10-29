/**
 * NIGHT HARBOR: deterministic, conservative city business economy.
 * Each unit is a discrete item (OpenTTD-style cargo), never fabricated sales.
 * Production -> owned-source transfer -> external procurement -> local retail/wholesale.
 * Pure functions for testability. The estates system owns all company assets.
 */
export const GOODS=[
 ['grain','谷物',3,5,false],['vegetables','蔬菜',4,8,true],['fish','鲜鱼',5,10,true],
 ['timber','原木',4,7,false],['ore','矿石',5,9,false],['cotton','棉花',4,7,false],
 ['flour','面粉',6,10,false],['steel','钢材',10,17,false],['fabric','布料',8,14,false],
 ['parts','零配件',14,23,false],['boards','木板',8,14,false],['bread','面包',11,18,true],
 ['furniture','家具',28,46,false],['clothes','服装',23,38,false],['meals','餐食',19,31,true],
 ['drinks','饮品',13,23,true],['medicine','药品',18,30,false],['repairs','维修服务',30,49,false],
 ['care','诊疗服务',35,59,false],['lodging','旅馆住宿',24,45,false],['tickets','娱乐票券',18,33,false],
 ['freight','仓储物流',17,30,false],['newspaper','报纸',9,17,true],['electronics','电子电器',38,64,false],
 ['coffee','咖啡豆',7,12,false]
].map(([id,name,cost,price,perishable])=>({id,name,cost,price,perishable}));
export const GOOD=Object.freeze(Object.fromEntries(GOODS.map(x=>[x.id,x])));
const type=(id,name,sector,stage,build,upkeep,output,batch,inputs={},opts={})=>({
 id,name,sector,stage,build,upkeep,output,batch,inputs,
 revenue:opts.revenue??(GOOD[output]?.price||15)*3,
 visitors:opts.visitors??8,
 info:opts.info||'基于居民需求与投入进行经营',
 staffWage:opts.wage||9,
 maxWorkers:opts.maxWorkers||6,
 service:!!opts.service,
 retail:opts.retail??(stage>=3),
 capacity:opts.capacity||75
});
export const INDUSTRIES=[
 type('farm','谷物农场','农业',0,130,7,'grain',11,{}, {retail:false,info:'向面粉厂与食品贸易供应谷物'}),
 type('greenhouse','蔬菜种植园','农业',0,135,8,'vegetables',10,{}, {info:'生鲜有保质期'}),
 type('fishery','渔业码头','农业',0,150,10,'fish',9,{}, {retail:false,info:'供给餐饮与海鲜市场'}),
 type('forestry','木材场','资源',0,160,10,'timber',10,{}, {retail:false}),
 type('mine','矿业工坊','资源',0,205,15,'ore',9,{}, {retail:false}),
 type('cottonfarm','棉花农场','农业',0,160,11,'cotton',9,{}, {retail:false}),
 type('mill','面粉厂','制造',1,180,11,'flour',9,{grain:6},{retail:false}),
 type('foundry','金属冶炼厂','制造',1,260,21,'steel',7,{ore:6},{retail:false}),
 type('textile','纺织厂','制造',1,230,15,'fabric',8,{cotton:6},{retail:false}),
 type('sawmill','木板加工厂','制造',1,195,12,'boards',8,{timber:6},{retail:false}),
 type('machine','机械零件厂','制造',2,300,20,'parts',6,{steel:4},{retail:false}),
 type('bakery','面包烘焙坊','食品',2,170,11,'bread',9,{flour:6},{retail:true,info:'面粉加工为面包，当天上架销售'}),
 type('furniture','家具作坊','制造',3,290,19,'furniture',5,{boards:4,parts:1},{retail:true}),
 type('tailor','服装工坊','零售',3,240,14,'clothes',6,{fabric:5}),
 type('electronics','电器装配坊','制造',3,390,27,'electronics',4,{parts:3,steel:1}),
 type('diner','街角食堂','餐饮',4,110,10,'meals',8,{bread:3,vegetables:3},{wage:11,info:'面包和蔬菜制作餐食，受街区客流影响'}),
 type('cafe','街区咖啡馆','餐饮',4,145,11,'drinks',9,{coffee:5},{wage:11}),
 type('grocery','社区杂货铺','零售',4,120,9,'bread',0,{}, {info:'从自产面包或市场采购再零售'}),
 type('hardware','五金门店','零售',4,150,12,'parts',0,{}, {info:'可由零件厂供货'}),
 type('garage','汽车修理厂','服务',4,180,17,'repairs',6,{parts:2},{wage:13,service:true}),
 type('clinic','社区诊所','服务',4,235,19,'care',6,{medicine:2},{wage:15,service:true,info:'购买药品维持诊疗服务'}),
 type('hotel','旧城旅馆','服务',4,260,20,'lodging',9,{}, {wage:12,service:true}),
 type('club','夜间俱乐部','文娱',4,240,24,'tickets',9,{}, {wage:14,service:true}),
 type('cinema','小型电影院','文娱',4,265,22,'tickets',8,{}, {wage:13,service:true}),
 type('printshop','街区印刷社','文化',4,175,11,'newspaper',9,{timber:2},{info:'以纸张耗材印刷报纸'}),
 type('warehouse','小型仓库','物流',4,145,14,'freight',8,{}, {wage:11,service:true,info:'物流订单可配合已有运输系统'})
];
export const INDUSTRY=Object.freeze(Object.fromEntries(INDUSTRIES.map(x=>[x.id,x])));
export const SECTORS=[...new Set(INDUSTRIES.map(x=>x.sector))];
export const PRICE_MODES={discount:{name:'平价促销',multiplier:0.8,demand:1.45},
 standard:{name:'普通定价',multiplier:1,demand:1},
 premium:{name:'品质溢价',multiplier:1.3,demand:.62}};
export const MAX_INVENTORY=200;

export function newFirm(typeId){
 const typ=INDUSTRY[typeId];if(!typ)throw Error('未知行业');
 return {stock:{},workers:1,price:'standard',autoSupply:true,open:true,
  reputation:55,lastSales:0,lastDemand:0,lastRevenue:0,lastExpenses:0,lastTax:0,
  lastWages:0,lastBought:0,lastTransfers:0,lastSpoilage:0,stockouts:0,
  lifetimeSales:0,lifetimeRevenue:0,daybook:[]};
}
export function upgradeFirm(b){
 if(!b||!INDUSTRY[b.type])return null;
 const template=newFirm(b.type);
 return {...template,...b,...(b.firm||{}),stock:{...(b.firm?.stock||{})}};
}
const cap=(x,min,max)=>Math.max(min,Math.min(max,x));
export function stockUnits(f){return Object.values(f?.stock||{}).reduce((a,n)=>a+n,0);}
export function cellDistance(a,b){
 const i=Number(String(a).slice(1)),j=Number(String(b).slice(1));
 return Math.abs(Math.floor(i/4)-Math.floor(j/4))+Math.abs(i%4-j%4);
}
export function demandFor(typ,lot,slices,price,competition=0,signal=0.5){
 const traffic=slices.population?.footTraffic?.[lot.cell]||0;
 const cell=slices.factions?.cells?.[Number(lot.cell.slice(1))];
 const mood=cell?.publicMood??50;
 const capacity=(lot.building?.level||1)*8+lot.building.firm.workers*6;
 const base=(3+traffic*.55+lot.building.level*2+signal*3)*typ.visitors/8;
 const priceMode=PRICE_MODES[price]||PRICE_MODES.standard;
 return cap(Math.floor(base*(.55+mood/180)*priceMode.demand*
   (0.75+(lot.condition||50)/200)/(1+competition*.34)),0,capacity);
}
export function runIndustryDay(parcels,{day,slices,context,signal}){
 const shops=parcels.filter(l=>l.owner==='player'&&l.building?.firm&&INDUSTRY[l.building.type])
  .sort((a,b)=>INDUSTRY[a.building.type].stage-INDUSTRY[b.building.type].stage||a.id.localeCompare(b.id));
 const books=new Map(),events=[],effects=[];
 let budget=Math.max(0,context.cash||0);
 const debit=(book,amount,kind)=>{
  if(!amount)return true;
  if(kind==='purchase'&&budget<amount)return false;
  if(kind==='purchase')budget-=amount;
  book.expenses+=amount;
  book[kind]=(book[kind]||0)+amount;
  return true;
 };
 for(const lot of shops){
  const b=lot.building,typ=INDUSTRY[b.type],f=b.firm;
  const book={lot:lot.id,type:typ.id,day,produced:0,sold:0,imports:0,transfers:0,
   revenue:0,expenses:0,tax:0,wages:0,purchase:0,maintenance:0,shipping:0,spoilage:0,stockouts:0,
   marketDemand:0,closingStock:0};
  books.set(lot.id,book);
  const wage=f.workers*typ.staffWage,operating=Math.ceil(typ.upkeep*(.5+.5*b.level));
  debit(book,wage,'wages');debit(book,operating,'maintenance');
  if(!f.open){lot.lastProfit=0;continue;}
  // Small per-unit capacity, real material constraints, deterministic quantities.
  const maxBatch=Math.max(1,Math.min(b.level,f.workers));
  const amount=typ.batch*maxBatch;
  if(typ.batch>0){
   let canRun=true;
   for(const [good,qty] of Object.entries(typ.inputs)){
    const needed=qty*maxBatch;
    let shortage=Math.max(0,needed-(f.stock[good]||0));
    if(shortage&&f.autoSupply){
     const providers=shops.filter(src=>src!==lot&&src.building.firm.open&&src.building.type!=='office'&&
       INDUSTRY[src.building.type].output===good).sort((a,b)=>cellDistance(a.cell,lot.cell)-cellDistance(b.cell,lot.cell));
     for(const src of providers){
      if(!shortage)break;
      const take=Math.min(shortage,src.building.firm.stock[good]||0,MAX_INVENTORY-stockUnits(f));
      if(take<1)continue;
      const fee=Math.ceil(take*(.3+.12*cellDistance(src.cell,lot.cell)));
      if(!debit(book,fee,'shipping'))break;
      src.building.firm.stock[good]-=take;
      f.stock[good]=(f.stock[good]||0)+take;
      book.transfers+=take;shortage-=take;
     }
     if(shortage){
      const price=Math.ceil(GOOD[good].cost*(1+((day+good.length)%6)*.035));
      const take=Math.min(shortage,MAX_INVENTORY-stockUnits(f),Math.floor(budget/price));
      if(take>0&&debit(book,take*price,'purchase')){
       f.stock[good]=(f.stock[good]||0)+take;book.imports+=take;shortage-=take;
      }
     }
    }
    if(shortage)canRun=false;
   }
   if(canRun){
    for(const [good,qty] of Object.entries(typ.inputs))f.stock[good]-=qty*maxBatch;
    const added=Math.min(amount,MAX_INVENTORY-stockUnits(f));
    f.stock[typ.output]=(f.stock[typ.output]||0)+added;
    book.produced=added;
   }
  }else if(f.autoSupply){
   // Retailers buy actual stock, not fictitious customer sales.
   const good=typ.output;
   let shortage=Math.max(0,Math.min(14*b.level,MAX_INVENTORY-stockUnits(f))-(f.stock[good]||0));
   const providers=shops.filter(src=>src!==lot&&INDUSTRY[src.building.type].output===good&&src.building.firm.open)
    .sort((a,b)=>cellDistance(a.cell,lot.cell)-cellDistance(b.cell,lot.cell));
   for(const src of providers){
    if(!shortage)break;
    const take=Math.min(shortage,src.building.firm.stock[good]||0);
    if(!take)continue;
    const fee=Math.ceil(take*(.3+.12*cellDistance(src.cell,lot.cell)));
    if(!debit(book,fee,'shipping'))break;
    src.building.firm.stock[good]-=take;f.stock[good]=(f.stock[good]||0)+take;
    book.transfers+=take;shortage-=take;
   }
   if(shortage){
    const price=Math.ceil(GOOD[good].cost*(1+((day+good.length)%6)*.035));
    const take=Math.min(shortage,Math.floor(budget/price));
    if(take&&debit(book,take*price,'purchase')){
     f.stock[good]=(f.stock[good]||0)+take;book.imports+=take;
    }
   }
  }
 }
 for(const lot of shops){
  const b=lot.building,typ=INDUSTRY[b.type],f=b.firm,book=books.get(lot.id);
  if(f.open){
   const rivals=shops.filter(x=>x!==lot&&x.cell===lot.cell&&INDUSTRY[x.building.type].output===typ.output).length;
   const demand=demandFor(typ,lot,slices,f.price,rivals,signal('demand-'+lot.id));
   book.marketDemand=demand;
   // Wholesale industries receive a real external order capped by local trade demand,
   // after player-owned downstream producers have drawn from their inventory.
   const available=f.stock[typ.output]||0;
   const sales=Math.min(available,typ.retail?demand:Math.max(2,Math.min(demand,12+b.level*3)));
   const unit=typ.retail?
     Math.round(GOOD[typ.output].price*PRICE_MODES[f.price].multiplier):
     Math.max(1,Math.round(GOOD[typ.output].cost*1.45*PRICE_MODES[f.price].multiplier));
   book.sold=sales;book.revenue=sales*unit;f.stock[typ.output]=(f.stock[typ.output]||0)-sales;
   if(available<demand)book.stockouts=demand-available;
   book.tax=Math.round(book.revenue*.11);
   debit(book,book.tax,'tax');
   debit(book,5,'license');
   f.reputation=cap(f.reputation+(demand?Math.round((sales/demand-.65)*2):0),10,100);
  }
  for(const item of GOODS.filter(x=>x.perishable)){
   const held=f.stock[item.id]||0;
   const lost=held?Math.floor(held*(day%3===0?.22:.08)):0;
   if(lost){f.stock[item.id]-=lost;book.spoilage+=lost;}
  }
  const closing=stockUnits(f);book.closingStock=closing;
  f.lastSales=book.sold;f.lastDemand=book.marketDemand;f.lastRevenue=book.revenue;
  f.lastExpenses=book.expenses;f.lastTax=book.tax;f.lastWages=book.wages;
  f.lastBought=book.imports;f.lastTransfers=book.transfers;f.lastSpoilage=book.spoilage;
  f.stockouts=book.stockouts;f.lifetimeSales+=book.sold;f.lifetimeRevenue+=book.revenue;
  lot.lastProfit=book.revenue-book.expenses;
  f.daybook.unshift({...book,profit:lot.lastProfit});
  f.daybook=f.daybook.slice(0,30);
  lot.condition=cap(lot.condition-(f.open?(b.level>=4?2:1):0),20,100);
  events.push({type:'estate.income',title:'商铺经营日报',lot:lot.id,profit:lot.lastProfit,
   tax:book.tax,license:book.license||0,
   text:typ.name+'：生产'+book.produced+'，售出'+book.sold+'，缺货'+book.stockouts+
     '，销售收入'+book.revenue+'，采购'+book.purchase+'，工资'+book.wages+
     '，维修'+book.maintenance+'，税'+book.tax+'，利润'+lot.lastProfit+'元。'});
  effects.push({kind:'cash',amount:lot.lastProfit,label:'商铺营业净结算：'+typ.name+' / '+lot.title});
  if(b.mode==='underground')events.push({type:'business.risky',title:'高风险经营记录',
    text:lot.title+'出现未经许可的经营活动，留有可供依法调查的经营记录。',
    lot:lot.id,severity:2,actor:'player'});
 }
 return {events,effects,books:[...books.values()],total:[...books.values()].reduce((n,x)=>n+x.revenue-x.expenses,0)};
}
