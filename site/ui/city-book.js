/** Typed presentation for the office's expandable files; reads snapshots, no side effects. */
import {clockLabel,SHIFTS} from '../systems/clock.js';
import {BUSINESS_TYPES} from '../systems/estates.js';
import {OPERATIONS} from '../systems/operations.js';
import {SPECIALISTS} from '../systems/contacts.js';
import {casePhase} from '../systems/justice.js';
import {shortestRoute} from '../systems/transport.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const head=(k,t,d)=>'<div class="eyebrow">'+k+'</div><h2 id="panel-title">'+t+'</h2><p>'+d+'</p>';
const tabs=tab=>'<nav class="world-tabs city-tabs" aria-label="桌上物件里的城市档案">'+[
['city','城市版图'],['estates','地皮地产'],['transport','运输路线'],['clock','时钟'],['citizens','城市居民'],['operations','组织事务'],['contacts','雇佣线人'],['justice','刑事案件'],['news','晚报']
].map(([id,name])=>'<button type="button" class="'+(tab===id?'selected':'')+'" data-world-tab="'+id+'">'+name+'</button>').join('')+'</nav>';
const cellName=(w,id)=>w.slices.factions.cells.find(c=>c.id===id)?.name||id;
const personName=(w,id)=>w.slices.people.members.find(p=>p.id===id)?.name||id;
const label=(name,value)=>'<p class="mini-stat"><b>'+name+'</b><span>'+value+'</span></p>';
const button=(attr,text,disabled=false)=>'<button type="button" class="choice" '+attr+(disabled?' disabled':'')+'>'+esc(text)+'</button>';
const box=(title,content)=>'<article class="city-file"><h3>'+title+'</h3>'+content+'</article>';
function parcelsPage(w,legacy,ui){
 const d=w.slices.estates,selected=ui.cell||'s0';
 const cells=w.slices.factions.cells;
 const parcels=d.parcels.filter(p=>p.cell===selected),lot=d.parcels.find(p=>p.id===ui.lot&&p.cell===selected)||parcels[0];
 const types=BUSINESS_TYPES.map(b=>button('data-city-build="'+lot.id+'" data-city-building="'+b.id+'"',b.name+' · '+b.build,lot.owner!=='player'||!!lot.building)).join('');
 return head('REAL ESTATE / TITLE DEEDS','夜港地籍与购置','16街区、48处独立地皮，商业产权与黑帮控制权分开计算。合法建筑有实际客流、收入、维护成本和升级。')+tabs('estates')+
 '<div class="world-paper-grid"><div><div class="mini-title">01 / 选择街区</div><div class="city-street-list">'+cells.map(c=>button('data-world-cell="'+c.id+'" class="'+(selected===c.id?'selected':'')+'"',c.name)).join('')+'</div>'+
 '<div class="mini-title">02 / 选择地皮</div><div class="city-lot-list">'+parcels.map(p=>'<button type="button" class="city-lot '+(lot.id===p.id?'selected':'')+'" data-city-lot="'+p.id+'"><b>'+p.title+'</b><small>'+ (p.owner==='player'?'名下资产':p.owner==='market'?'可交易土地':'其他家族产权') +'</small><span>'+(p.building?p.building.name:'空地')+'</span></button>').join('')+'</div>'+
 '<div class="info-box"><b>地产收益</b>｜本日地产经营净收入 '+d.playerIncome+' 元。注意：街区势力变化不会自动转移土地所有权。</div></div>'+
 '<div>'+box(lot.title,
 label('产权',lot.owner==='player'?'玩家持有':lot.owner==='market'?'市场挂牌':lot.owner)+
 label('地价',lot.price+' 元')+label('地况',lot.condition+'/100')+
 label('建筑',lot.building?lot.building.name+' · Lv'+lot.building.level:'尚未建设')+
 label('上日利润',lot.lastProfit+' 元')+
 '<div class="city-actions">'+button('data-city-buy="'+lot.id+'"','签购地契 · '+lot.price,lot.owner!=='market')+
 (lot.building&&lot.building.type!=='office'?
 button('data-city-upgrade="'+lot.id+'"','升级建筑 · '+(90*lot.building.level),lot.owner!=='player'||lot.building.level>=3):'')+'</div>')+
 '<div class="mini-title">建设商业设施 / 施工申请</div><div class="city-actions">'+types+'</div>'+
 '<div class="mini-title">经营性质</div><div class="city-actions">'+
 button('data-city-mode="'+lot.id+'" data-mode="legal"','正规经营',!lot.building||lot.building.type==='office')+
 button('data-city-mode="'+lot.id+'" data-mode="underground"','高风险地下业务',!lot.building||lot.building.type==='office')+'</div>'+
 '<p class="map-hint">地下业务抽象结算，不提供实施细节；会产生可追溯的警方调查事件。</p></div></div>';
}
function timePage(w){
 const c=w.slices.clock,p=w.slices.population,j=w.slices.justice;
 return head('OFFICE / CITY CLOCK','夜港时间与作息','时间由模拟器确定性推进。切换时段会改变居民所在场所；翻日历才完成当天企业、派系与刑事结算。')+tabs('clock')+
 '<div class="world-paper-grid"><div>'+box('办公室时钟',
 '<div class="city-clock-face"><small>DAY '+w.day+' / WEEK '+c.week+'</small><strong>'+SHIFTS[c.shift].split(' ')[1]+'</strong><span>'+clockLabel(w.day,c.shift)+'</span></div>'+
 '<div class="city-actions">'+button('data-city-nextshift="1"','推进至下一时段',c.shift>=3)+'</div>')+
 '<p>每昼夜四个时段：晨间通勤、下午上班、黄昏活动、深夜回家。</p>')+
 '</div><div>'+box('城市生活快报',label('今日气象',c.weather)+label('模拟居民',p.people.length+' 人')+
 label('关押人数',j.custody.length+' 人')+label('本周',c.week+' 周'))+
 '<p class="map-hint">当前:'+SHIFTS[c.shift]+'。翻办公室桌上的日历结束一天。</p></div></div>';
}
function residentsPage(w,ui){
 const c=w.slices.clock,p=w.slices.population,cell=ui.cell||'s0';
 const position=x=>c.shift===1?x.work:c.shift===2?x.leisure:x.home;
 const present=p.people.filter(x=>position(x)===cell);
 return head('CITIZEN REGISTER / STREET LIFE','城市路人与日常生活','80位居民具有固定住址、工作地、休闲地点及行程。每天四个时段变化，客流影响实际商铺利润。')+tabs('citizens')+
 '<div class="world-paper-grid"><div><div class="mini-title">所在街区</div><div class="city-street-list">'+w.slices.factions.cells.map(x=>button('data-world-cell="'+x.id+'"',x.name)).join('')+'</div>'+
 box(cellName(w,cell)+' · '+SHIFTS[c.shift],label('此刻区域居民',present.length+' 人')+
 label('全天经过',p.footTraffic[cell]||0)+
 '<div class="city-people-dots">'+present.slice(0,30).map((x,i)=>'<span title="'+esc(x.name)+'" aria-label="'+esc(x.name)+'" class="city-person-dot"></span>').join('')+'</div>')+
 '</div><div><div class="mini-title">当前活动人员</div>'+
 (present.length?present.slice(0,14).map(x=>'<div class="city-resident"><b>'+esc(x.name)+'</b><span>'+esc(x.occupation)+' · '+(c.shift===1?'工作':c.shift===2?'休闲':c.shift===0?'通勤':'回家')+'</span></div>').join(''):'<p>这个时段街道较安静。</p>')+
 '<div class="info-box">这是一套可扩展的后台作息/人口模型，不是已经实现了 80 个独立绘制的走路动画。</div></div></div>';
}
function transportation(w,legacy,ui){
 const d=w.slices.transport,s=w.slices.estates.parcels,ware=s.filter(x=>x.owner==='player'&&['garage','warehouse'].includes(x.building?.type));
 const origin=ware.find(x=>x.id===ui.from)||ware[0],destination=ui.destination||'s1';
 const route=origin?shortestRoute(w.slices.factions.cells,origin.cell,destination):null;
 return head('ROUTES / DELIVERY ORDERS','运输指挥与路线','运输必须由你名下真实仓库或车行出发，在城区相邻道路图上规划路径。经过竞争者辖区会影响最终利润。')+tabs('transport')+
 '<div class="world-paper-grid"><div><div class="mini-title">营业出发地</div><div class="city-actions">'+(ware.length?ware.map(x=>button('data-city-origin="'+x.id+'"',x.title+' · '+x.building.name)).join(''):'<p>还没有仓库或修理厂。先购地建设，才可安排运输。</p>')+'</div>'+
 '<div class="mini-title">目的街区</div><div class="city-street-list">'+w.slices.factions.cells.map(x=>button('data-city-destination="'+x.id+'"',x.name)).join('')+'</div>'+
 '<div class="city-route">'+(route?route.map((id,i)=>'<span>'+cellName(w,id)+'</span>').join('<b>›</b>'):'无可用路径')+'</div></div>'+
 '<div>'+box('派遣运输',
 label('起点',origin?.title||'尚无设施')+label('终点',cellName(w,destination))+
 label('路线段数',route?String(route.length-1):'无')+
 '<div class="mini-title">运输人手</div><div class="city-actions">'+legacy.crew.map(id=>button('data-city-courier="'+id+'"',personName(w,id))).join('')+'</div>'+
 '<p>当前选用：'+personName(w,ui.courier||'kai')+'</p>'+
 button('data-city-dispatch="1"','批准运输订单',!origin||!route||route.length<2))+
 '<div class="mini-title">待完成订单：'+d.shipments.length+'</div>'+
 d.shipments.map(t=>'<p class="map-hint">'+t.from+' → '+t.to+' · '+personName(w,t.courier)+'</p>').join('')+
 '<div class="mini-title">最近结算</div>'+d.completed.slice(0,5).map(t=>'<p class="map-hint">'+t.id+' · +'+t.net+' 元</p>').join(''))+'</div></div>';
}
function riskPage(w,legacy,ui){
 const o=w.slices.operations;
 const target=w.slices.people.members.filter(x=>x.faction!=='player'&&x.status!=='deceased');
 const selected=OPERATIONS.find(x=>x.id===ui.operation)||OPERATIONS[0];
 return head('UNDERWORLD / OPERATIONS','组织高风险事务','犯罪行为采用抽象的剧情结算，不是战术教学。可能造成伤害、证人记录、警方取证、通缉和人物长期损失。')+tabs('operations')+
 '<div class="world-paper-grid"><div>'+box('委托选择',
 '<div class="city-actions">'+OPERATIONS.map(x=>button('data-city-operation="'+x.id+'"',x.name+' · '+x.cost)).join('')+'</div>'+
 '<p>'+selected.name+'：费用 '+selected.cost+'，严重程度 '+selected.severity+'/5。</p>'+
 '<div class="mini-title">行动人员</div><div class="city-actions">'+legacy.crew.map(id=>button('data-city-courier="'+id+'"',personName(w,id))).join('')+'</div>'+
 '<p>派遣者：'+personName(w,ui.courier||'kai')+'</p>')+'</div>'+
 '<div>'+box('对象与后果',
 '<div class="city-actions">'+target.map(x=>button('data-city-target="'+x.id+'"',x.name)).join('')+'</div>'+
 '<p>目标：'+personName(w,ui.target||target[0]?.id)+'</p>'+
 button('data-city-commission="1"','登记委托 · 次日结算',!target.length)+
 '<p class="map-hint">不保证成功；也不会因为你委托别人就没有后续调查。</p>')+
 '<div class="mini-title">进行中的委托</div>'+o.pending.map(x=>'<p>'+x.kind+' / '+personName(w,x.target)+'</p>').join('')+
 '<div class="mini-title">已发生事件</div>'+o.history.slice(0,4).map(x=>'<p class="map-hint">DAY '+x.day+' · '+x.kind+' · '+(x.success?'发生后果':'未达目标')+'</p>').join('')+'</div></div>';
}
function contactsPage(w){
 const c=w.slices.contacts;
 return head('CONTACTS / PERSONAL NETWORK','雇佣与线人','专业人员会持续领取工资，线人信息有来源可信度，错误信息同样可能影响判断。不正当接触会产生法律风险。')+tabs('contacts')+
 '<div class="world-paper-grid"><div><div class="mini-title">可聘人员</div>'+SPECIALISTS.map(x=>box(x.name,
 label('签约',x.fee+' 元')+label('每日薪酬',x.wage+' 元')+
 button('data-city-hire="'+x.id+'"','签约雇佣',c.staff.some(s=>s.role===x.id)))).join('')+'</div>'+
 '<div><div class="mini-title">在册人员</div>'+ (c.staff.length?c.staff.map(x=>box(x.name,label('雇佣日',x.joined)+button('data-city-dismiss="'+x.id+'"','终止合约'))).join(''):'<p>尚未雇佣专业人员。</p>')+
 '<div class="city-actions">'+button('data-city-intel="1"','联系线人 · 查询消息')+
 button('data-city-bribe="1"','不当利益接触 · 110元')+'</div>'+
 '<div class="mini-title">线人讯息</div>'+c.reports.slice(0,6).map(x=>'<div class="report-card"><small>DAY '+x.day+' · 可信参考 '+x.confidence+'%</small><p>'+esc(x.text)+'</p></div>').join('')+
 '<p class="map-hint">不当利益接触既不能删除证据，也有可能让组织面临新的调查。</p></div></div>';
}
function casePage(w,legacy){
 const j=w.slices.justice;
 return head('PRECINCT / EVIDENCE / COURT','警方调查与通缉档案','每起事件建立独立案件和证据来源。调查、通缉、拘押、审判及释放按时间和证据推进。法律协助不能抹掉已存在的事实。')+tabs('justice')+
 '<div class="world-paper-grid"><div><div class="city-civic-stats">'+
 label('现有案件',j.cases.filter(x=>x.stage!=='closed').length)+
 label('通缉名单',j.wanted.length)+label('在押人员',j.custody.length)+'</div>'+
 '<div class="mini-title">通缉与刑期</div>'+ (j.wanted.length?j.wanted.map(x=>'<p>通缉：'+personName(w,x.subject)+' / '+x.caseId+'</p>').join(''):'<p>尚无通缉对象。</p>')+
 (j.custody.length?j.custody.map(x=>'<div class="report-card"><b>'+personName(w,x.subject)+'</b><p>'+x.kind+' · 至少至DAY '+x.until+'</p></div>').join(''):'<p>目前没有在押人员。</p>')+'</div>'+
 '<div><div class="mini-title">具体案件与证据</div>'+(j.cases.length?j.cases.slice(0,12).map(x=>box(x.id,
 label('程序',casePhase(x))+label('涉案人',personName(w,x.subject||'待查'))+
 label('案发地点',cellName(w,x.cell))+label('证据',x.evidence.map(e=>e.source).join('、'))+
 (x.stage!=='closed'?button('data-city-counsel="'+x.id+'"','聘请律师审阅 · 85元'):'')+
 '<small>记录起始 DAY '+x.opened+'</small>')).join(''):'<p>暂无独立案件。</p>')+'</div></div>';
}
export function renderCityBook(tab,w,legacy,ui={}){
 if(tab==='estates')return parcelsPage(w,legacy,ui);
 if(tab==='clock')return timePage(w);
 if(tab==='citizens')return residentsPage(w,ui);
 if(tab==='transport')return transportation(w,legacy,ui);
 if(tab==='operations')return riskPage(w,legacy,ui);
 if(tab==='contacts')return contactsPage(w);
 return casePage(w,legacy);
}
