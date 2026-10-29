/** Office document renderer for social reconstruction, labor market and faction intrigue. Read-only views. */
import {RECRUIT_SOURCES} from '../systems/recruitment.js';
import {AID_ACTIONS} from '../systems/society.js';
import {FACTIONS} from '../systems/factions.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const head=(k,t,d)=>'<div class="eyebrow">'+k+'</div><h2 id="panel-title">'+t+'</h2><p>'+d+'</p>';
const tabs=tab=>'<nav class="world-tabs origin-tabs" aria-label="城市与组织档案">'+[
 ['society','政府与平民'],['recruitment','人才市场'],['politics','家族产业'],['city','地盘'],['industry','产业经营'],['estates','地契'],['personnel','内部人事'],['news','新闻']
].map(([id,t])=>'<button type="button" data-world-tab="'+id+'" class="'+(id===tab?'selected':'')+'">'+t+'</button>').join('')+'</nav>';
const action=(key,val,title,disabled=false)=>'<button type="button" class="choice" '+key+'="'+esc(val)+'"'+(disabled?' disabled':'')+'>'+esc(title)+'</button>';
const metric=(k,val,comment='')=>'<div class="origin-metric"><small>'+k+'</small><strong>'+val+'</strong><span>'+comment+'</span></div>';
const section=(title,body)=>'<section class="origin-paper"><h3>'+title+'</h3>'+body+'</section>';
function government(w,legacy){
 const s=w.slices.society,g=s.government,politics=w.slices.politics;
 return head('FEDERAL RECORD / A BROKEN CITY','临时政府与街区互助',
 '夜港是工业衰落、贫困和压迫下的港城。玩家初期没有地盘，组织依靠平民信任而非恐吓发展。')+tabs('society')+
 '<div class="world-paper-grid"><div><div class="origin-metrics">'+
 metric('失业',s.unemployment+'%','工厂停产与临工')+metric('贫困',s.poverty,'高值代表困难')+
 metric('政府公信',g.legitimacy,'信任非常低')+metric('机构腐败',g.corruption,'政商盘根错节')+
 metric('社区支持',s.communitySupport,'真正的社会基础')+metric('居民希望',s.hope,'改变取决于行动')+'</div>'+
 section('救助与互助 / HELP YOUR NEIGHBORS',
 AID_ACTIONS.map(a=>'<article class="origin-aid"><div><strong>'+a.name+'</strong><p>'+a.description+'</p></div>'+
 action('data-aid',a.id,'投入 '+a.cost+' 元',legacy.cash<a.cost||s.todayAids.includes(a.id))+'</article>').join('')+
 '<p class="map-hint">援助并非一次性“提高声望”的戏法，也影响招募时人们是否信任你的组织。</p>')+'</div>'+
 '<div>'+section('旧港的处境',
 '<p>港联邦临时政府债台高筑，工厂相继关闭。私营商会、地区警局和街头组织互相制约；不是所有公职人员都腐败。</p>'+
 '<p>你的起点：<b>没有任何街区所有权；只有一间刚买下的毛坯旧办公室和兄弟阿凯。</b></p>'+
 '<div class="origin-rule">原则：平民可以自愿支持你；强迫劳动、向儿童招工与收取恐吓性保护费都不是正面发展路线。</div>'+
 action('data-voluntary-dues','1','邀请商户自愿缴纳互助会费',s.communitySupport<25||s.voluntaryDues===w.day))+
 section('政务负担',
 '<p>营业企业需要按利润计税并缴纳经营许可费用。腐败接触是高风险选择，不会自动清除警方记录。</p>'+
 '<p>商户互助与合法维权可以让组织通过非暴力方式获得人心。</p>')+
 section('儿童之家',
 '<p>物资短缺、教育停摆，但儿童不会成为劳动力库存。支援儿童之家将改善福利条件与社区希望。</p>'+
 '<p>儿童福利：'+s.childWelfare+'/100</p>')+'</div></div>';
}
function recruitment(w,legacy,ui={}){
 const d=w.slices.recruitment;
 const source=RECRUIT_SOURCES.find(s=>s.id===ui.source)||RECRUIT_SOURCES[0];
 const pool=d.candidates.filter(c=>c.origin===source.id);
 const chosen=pool.find(c=>c.id===ui.candidate)||pool[0];
 return head('LABOR / OPEN CONTRACTS','人才市场与自愿雇佣',
 '招人不是买人。每位成年人有年龄、过去的工作、签约保障费、日薪和信任要求；工资会在每天结算时支付。')+
 tabs('recruitment')+'<div class="world-paper-grid"><div>'+
 '<div class="mini-title">人才来源 / ENTRY POINTS</div><div class="origin-sources">'+RECRUIT_SOURCES.map(s=>
 action('data-recruit-source',s.id,s.title,s.id===source.id)).join('')+'</div><p class="map-hint">'+source.detail+'</p>'+
 '<div class="mini-title">正在寻找机会的成年人</div><div class="origin-candidates">'+pool.map(c=>
 '<button type="button" data-recruit-person="'+c.id+'" class="origin-candidate '+(c.id===chosen?.id?'selected':'')+'">'+
 '<span class="origin-avatar">'+esc(c.face)+'</span><span><strong>'+esc(c.name)+'</strong><small>'+c.age+' 岁 · '+esc(c.role)+'</small></span>'+
 '<em>'+ (legacy.crew.includes(c.id)?'已入职':c.status==='available'?'可面谈':'已签约')+'</em></button>').join('')+'</div>'+
 '<div class="info-box">救助成年人不以加入组织为条件；双方可以拒绝或终止雇佣关系。</div></div>'+
 '<div>'+ (chosen?section('候选人个人档案 / '+chosen.name,
 '<p>'+chosen.trait+'</p>'+metric('年龄',chosen.age+' 岁')+
 metric('签约保障',chosen.fee+' 元')+metric('每日工资',chosen.wage+' 元')+
 metric('信任程度',chosen.trust+'/100')+
 '<div class="origin-actions">'+action('data-recruit-interview',chosen.id,'先当面谈谈',chosen.contactDay===w.day||legacy.crew.includes(chosen.id))+
 action('data-recruit-sign',chosen.id,'自愿签署劳动合同',legacy.crew.includes(chosen.id)||legacy.cash<chosen.fee)+
 (legacy.crew.includes(chosen.id)?action('data-recruit-dismiss',chosen.id,'结束雇佣合同'):'')+'</div>'
 ):'<p>这一来源暂时没有候选人。</p>')+
 section('受保护的儿童与家庭',
 '<p>孤儿院与儿童之家只提供教育、医疗、食物与安全。若城市存在人口剥削，组织可援助受害者，但绝不把儿童列为可雇佣资源。</p>')+
 section('现有组织成员','<p>除玩家本人外：'+legacy.crew.map(id=>esc(d.candidates.find(c=>c.id===id)?.name||id)).join('、')+'</p>')+'</div></div>';
}
function factions(w,legacy,ui){
 const p=w.slices.politics,listing=Object.entries(p.families);
 const chosen=listing.find(([id])=>id===ui.faction)||listing[0];
 const [fid,f]=chosen,base=FACTIONS.find(x=>x.id===fid);
 return head('POWER / ALLIANCE / SUCCESSION','四大家族与街头势力',
 '每个势力都有合法主业、地下业务、核心产业、财务与内部权力斗争。合作与冲突会改变日后事件，而不只是装饰名称。')+tabs('politics')+
 '<div class="world-paper-grid"><div><div class="mini-title">城市势力与核心产业</div>'+
 '<div class="origin-family-list">'+listing.map(([id,g])=>'<button type="button" data-politics-faction="'+id+'" class="origin-family '+(fid===id?'selected':'')+'">'+
 '<i style="background:'+FACTIONS.find(x=>x.id===id).color+'"></i><span><strong>'+FACTIONS.find(x=>x.id===id).name+'</strong><small>'+
 g.businesses.map(b=>b.main).join(' / ')+'</small></span></button>').join('')+'</div>'+
 '<div class="mini-title">关系与恩怨</div>'+p.ties.map(t=>'<p class="origin-tie"><b>'+FACTIONS.find(x=>x.id===t.a).name+' × '+FACTIONS.find(x=>x.id===t.b).name+'</b>'+
 '<span>'+ (t.status==='allied'?'合作':t.status==='feud'?'敌对':'观望')+' · '+t.value+'</span></p>').join('')+
 section('街头团伙 / 铁斧组','<p>红隼会外围出现了持械混混与名为“铁斧组”的街头团伙。他们会与其他势力冲突，恐吓商户，并影响普通居民的生活。</p>'+
 '<p>玩家可以选择调停、合法安保、援助受害店家，而不必须亲自发动巷战。</p>')+'</div>'+
 '<div>'+section(base.name+' · 产业与权力',
 metric('现任领袖',esc(f.leader))+
 metric('集团资金',f.treasury+' 元')+metric('内部矛盾',f.internalStress+'/100')+
 metric('权力更迭次数',f.coups)+
 '<div class="mini-title">合法主业与地下业务</div>'+
 f.businesses.map(b=>'<div class="origin-business"><b>'+b.name+'</b><small>'+b.cell+
 '</small><p>合法主业：'+b.main+'<br/>地下副业：'+b.side+'</p><em>最近经营：'+b.earnings+'</em></div>').join('')+
 '<div class="origin-actions">'+action('data-diplomacy','peace','提议停火')+
 action('data-diplomacy','cooperate','讨论合法商业合作 · 40元')+
 action('data-diplomacy','refuse','拒绝对方影响')+'</div>')+
 section('保护居民，不向居民收敲诈款',
 '<p>你可以为目标街区提供调解、巡查和法律援助，提升居民支持。所需经费来自组织，而非强制收取。</p>'+
 action('data-protect',ui.cell||'s0','帮助当前地图所选街区 · 30元'))+
 '<div class="mini-title">最近的家族事件</div>'+
 p.rivalIncidents.slice(0,4).map(x=>'<p class="map-hint">DAY '+x.day+' · '+x.kind+' / '+x.cell+'</p>').join('')+'</div></div>';
}
export function renderOriginBook(tab,world,legacy,ui){
 if(tab==='recruitment')return recruitment(world,legacy,ui);
 if(tab==='politics')return factions(world,legacy,ui);
 return government(world,legacy);
}