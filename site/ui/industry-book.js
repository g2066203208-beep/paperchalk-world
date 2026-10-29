/** Business management inside the existing office files, not a disconnected admin site. */
import {GOODS,GOOD,INDUSTRIES,INDUSTRY,SECTORS,PRICE_MODES,stockUnits} from '../systems/industry-model.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[k]));
const fmt=n=>Math.round(n||0).toLocaleString('zh-CN');
const act=(attr,title,disabled=false)=>'<button type="button" class="choice" '+attr+(disabled?' disabled':'')+'>'+esc(title)+'</button>';
const stat=(name,value)=>'<div class="industry-stat"><small>'+esc(name)+'</small><strong>'+esc(value)+'</strong></div>';
const grid=types=>types.map(t=>{
 const input=Object.entries(t.inputs).map(([id,n])=>GOOD[id].name+' × '+n).join(' + ')||'设备、土地与劳动';
 return '<div class="industry-catalog-item"><div><small>'+esc(t.sector)+' · '+esc(t.stage>=4?'服务/零售':t.stage===0?'原材料':'制造生产')+'</small><strong>'+esc(t.name)+'</strong>'+
 '<p>'+esc(input)+' → '+esc(GOOD[t.output].name)+' × '+(t.batch||'商店进货')+'</p></div><span>建设 '+t.build+' 元</span></div>';
}).join('');
export function renderIndustryBook(world,legacy,ui={},tabs=''){
 const estate=world.slices.estates;
 const firms=estate.parcels.filter(p=>p.owner==='player'&&p.building?.type!=='office'&&INDUSTRY[p.building?.type]);
 const selected=firms.find(p=>p.id===ui.lot)||firms[0],type=INDUSTRY[selected?.building?.type],f=selected?.building?.firm;
 const day=estate.journal?.[0]||{};
 const allGoods=f?Object.entries(f.stock).filter(([id,n])=>n>0&&GOOD[id]):[];
 const chosenGood=allGoods.find(x=>x[0]===ui.industryGood)?.[0]||allGoods[0]?.[0];
 const recipients=firms.filter(p=>p!==selected&&p.building.firm);
 const recipient=recipients.find(x=>x.id===ui.industryTo)||recipients[0];
 const charts=estate.journal.slice(0,14).reverse();
 const maximum=Math.max(1,...charts.map(x=>Math.abs(x.profit)));
 const sector=SECTORS.includes(ui.industrySector)?ui.industrySector:'全部';
 const listed=sector==='全部'?INDUSTRIES:INDUSTRIES.filter(x=>x.sector===sector);
 let detail='';
 if(!selected)detail='<div class="industry-intro"><h3>你的第一间产业，应该开什么？</h3><p>先在地籍里购买一块土地，再投资开设店铺。初始办公室不是商铺，不会凭空产生营业额。</p>'+
  act('data-world-tab="estates"','前往地皮地产 · 选址开店')+'</div>';
 else if(!f)detail='<div class="industry-intro"><h3>'+esc(selected.building.name)+' · 旧式经营资产</h3>'+
 '<p>这家店来自旧存档，目前仍按照原有简化收入规则结算，避免升级游戏时突然改变过去收益。你可以自行改为真实采购、生产和零售。</p>'+
 act('data-industry-action="modernize"','开启精细经营（不可逆）')+'</div>';
 else{
  const last=f.daybook[0]||{},inventory=allGoods.length?
   allGoods.map(([id,n])=>'<button type="button" class="industry-inventory-item '+(chosenGood===id?'is-active':'')+'" data-industry-good="'+id+'"><b>'+esc(GOOD[id].name)+'</b><span>'+n+' 单位</span></button>').join(''):
   '<p class="map-hint">仓库没有现货。启用自动采购，或者让其他自有工厂供货。</p>';
  const fraction=Math.max(1,f.lastDemand);
  detail='<section class="industry-firm-detail"><div class="industry-detail-head"><div><small>'+esc(selected.title)+' / '+esc(selected.cell)+'</small>'+
   '<h3>'+esc(type.name)+' · Lv'+selected.building.level+'</h3><p>'+esc(type.info)+'</p></div>'+
   '<span class="industry-status '+(f.open?'open':'closed')+'">'+(f.open?'正在营业':'暂停营业')+'</span></div>'+
   '<div class="industry-metrics">'+stat('昨日营业额','＄'+fmt(f.lastRevenue))+stat('昨日利润','＄'+fmt(selected.lastProfit))+
     stat('服务顾客',f.lastSales+' / '+f.lastDemand)+stat('仓储量',stockUnits(f)+' / 200')+'</div>'+
   '<div class="industry-capacity"><span>销量 / 潜在需求</span><div><i style="width:'+Math.min(100,Math.round(f.lastSales/fraction*100))+'%"></i></div>'+
   '<b>'+f.lastSales+' / '+f.lastDemand+'</b></div>'+
   '<div class="industry-management"><h3>01 · 经营决策</h3><p>不同价格改变客流需求。店员人数限制产能并按日支付工资；库存不足会真实损失订单。</p>'+
   '<div class="industry-controls"><b>商品售价</b><div class="city-actions">'+Object.entries(PRICE_MODES).map(([id,p])=>
     act('data-industry-price="'+id+'"',p.name+(id===f.price?' ✓':''),id===f.price)).join('')+'</div></div>'+
   '<div class="industry-controls"><b>员工合同 · '+f.workers+'/'+type.maxWorkers+'</b><div class="city-actions">'+
     act('data-industry-action="hire"','招聘成年员工 · 18元',f.workers>=type.maxWorkers||legacy.cash<18)+
     act('data-industry-action="fire"','结束一份雇佣合同',f.workers<=1)+'</div></div>'+
   '<div class="industry-controls"><b>运营安排</b><div class="city-actions">'+
     act('data-industry-action="supply"',f.autoSupply?'自动采购：已开启':'自动采购：已关闭')+
     act('data-industry-action="toggle"',f.open?'暂停营业':'恢复营业')+
     act('data-industry-action="repair"','设备维护 · '+selected.condition+'/100',selected.condition>=99)+
     act('data-city-upgrade="'+selected.id+'"','扩建至 Lv'+(selected.building.level+1),selected.building.level>=5)+'</div></div></div>'+
   '<div class="industry-management"><h3>02 · 仓库与供应网络</h3>'+
   '<p>原料优先取自玩家自有生产企业，按真实数量扣除上游库存和运输费用；不足时才向外部市场采购。</p>'+
   '<div class="industry-inventory">'+inventory+'</div>'+
   (recipients.length&&chosenGood?'<div class="industry-controls"><b>调拨到其他自有产业</b><div class="city-actions">'+
    recipients.map(p=>act('data-industry-to="'+p.id+'"',p.building.name+(recipient?.id===p.id?' ✓':''),p.id===recipient?.id)).join('')+
    '</div><div class="city-actions">'+[1,5,10,25].map(n=>act('data-industry-qty="'+n+'"',n+'单位'+(ui.industryQty===n?' ✓':''))).join('')+'</div>'+
    act('data-industry-transfer="1"','确认转运 · 扣除实际运费',(f.stock[chosenGood]||0)<(ui.industryQty||1))+'</div>':'<p class="map-hint">拥有至少两家精细经营的产业后，可以进行跨店调拨。</p>')+
   '<div class="industry-costs"><h4>昨日收支明细</h4>'+
    [['实际销售',last.revenue],['工资',-(last.wages||0)],['采购',-(last.purchase||0)],['运输',-(last.shipping||0)],
     ['维护',-(last.maintenance||0)],['税金',-(last.tax||0)],['许可费',-(last.license||0)]].map(([name,n])=>
      '<p><span>'+name+'</span><b>'+((n||0)>0?'+':'')+fmt(n||0)+'</b></p>').join('')+
    '<p class="industry-total"><span>结算利润</span><b>'+fmt(selected.lastProfit)+'</b></p>'+
    '<small>生产 '+(last.produced||0)+' · 外采 '+(last.imports||0)+' · 自有供货 '+(last.transfers||0)+
    ' · 损耗 '+(last.spoilage||0)+' · 缺货 '+(last.stockouts||0)+'</small></div></div>'+
   '<div class="industry-management"><h3>03 · 最近10日经营</h3>'+
    (f.daybook.length?f.daybook.slice(0,10).map(p=>'<div class="industry-history"><span>DAY '+p.day+'</span><span>销量 '+p.sold+'</span>'+
     '<strong class="'+(p.profit>=0?'profit':'loss')+'">'+(p.profit>=0?'+':'')+fmt(p.profit)+'</strong></div>').join(''):
     '<p>完成一日结算后，这里会保留逐日可核对的真实数据。</p>')+'</div></section>';
 }
 return '<div class="eyebrow">NIGHT HARBOR / BUSINESS & SUPPLY CHAIN</div>'+
 '<h2 id="panel-title">产业经营与供应链</h2><p>从种植、原料加工、生产制造，到零售与服务。产品、资金和员工都纳入每日结算。</p>'+
 tabs+'<div class="industry-dashboard"><div class="industry-kpis">'+
 stat('自有企业',firms.length+' 家')+stat('昨日净利润','＄'+fmt(estate.playerIncome))+
 stat('实际销售额','＄'+fmt(day.sales))+
 stat('产业链库存',fmt(firms.reduce((sum,l)=>sum+stockUnits(l.building.firm),0))+' 单位')+'</div>'+
 '<div class="industry-grid"><div class="industry-sidebar"><h3>我的产业</h3>'+
 (firms.length?firms.map(p=>'<button class="industry-company '+(selected?.id===p.id?'selected':'')+'" type="button" data-industry-lot="'+p.id+'">'+
 '<strong>'+esc(p.building.name)+'</strong><span>'+esc(p.title)+' · Lv'+p.building.level+'</span>'+
 '<b class="'+(p.lastProfit>=0?'profit':'loss')+'">'+(p.lastProfit>=0?'+':'')+fmt(p.lastProfit)+'元</b></button>').join(''):
 '<p>尚无营业商铺；在地皮地产开设第一家企业。</p>')+
 act('data-world-tab="estates"','地产 / 新建商铺')+
 '<h3>可拓展行业 · '+INDUSTRIES.length+'</h3><div class="industry-sector-list">'+
 ['全部',...SECTORS].map(x=>act('data-industry-sector="'+x+'"',x+(x===sector?' ✓':''),x===sector)).join('')+'</div>'+
 '<div class="industry-catalog">'+grid(listed)+'</div></div><div>'+detail+'</div></div>'+
 '<div class="industry-system-note">市场由城市人流、居民情绪、竞争、价格、设备和真实存货共同影响。利润不保证为正，产业链也无法从空库存凭空产生商品。旧资产可选择保留旧结算方式。</div></div>';
}
