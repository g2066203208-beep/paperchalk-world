/** Data-only HTML renderer for the game's physical map, personnel file, newspaper and dialogue folder.
 * No command handlers, DOM globals or economy calculations live here.
 */
import {FACTIONS,ownership} from '../systems/factions.js';
import {JOBS} from '../systems/people.js';
import {CONVERSATIONS} from '../systems/dialogue.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const hero=(small,title,description)=>'<div class="eyebrow">'+small+'</div><h2 id="panel-title">'+title+'</h2><p>'+description+'</p>';
const tabs=(current)=>'<nav class="world-tabs" aria-label="组织和城市文件">'+[
 ['city','势力地图'],['estates','地契/产业'],['transport','运输'],['clock','时间'],['citizens','居民'],['personnel','人事册'],['operations','高风险委托'],['contacts','雇佣线人'],['justice','警局案件'],['news','夜港晚报'],['civic','城市公报'],['dialogue','当面会谈']
].map(([id,label])=>'<button type="button" data-world-tab="'+id+'" class="'+(id===current?'selected':'')+'">'+label+'</button>').join('')+'<button type="button" data-world-back="1">返回卷宗</button></nav>';
function factionMap(world,selected='s1'){
 const f=world.slices.factions;
 const own=ownership(f);
 const slots=f.cells.map(cell=>{
  const faction=FACTIONS.find(x=>x.id===cell.owner);
  return '<button type="button" data-world-cell="'+cell.id+'" class="world-cell '+(selected===cell.id?'selected':'')+'" style="--faction-color:'+faction.color+'" aria-label="'+esc(cell.name)+'，当前由'+faction.name+'主导">'+
  '<span class="world-cell-number">'+String(cell.index+1).padStart(2,'0')+'</span><strong>'+esc(cell.name)+'</strong><small>'+faction.name+'</small></button>';
 }).join('');
 const cell=f.cells.find(c=>c.id===selected)||f.cells[1],owner=FACTIONS.find(x=>x.id===cell.owner);
 return hero('ATLAS / CITY POWER','夜港 · 五方势力地图','这里记录真实的街区控制权。其他家族每天自行行动、消耗资源、影响商户。地图与行动日志来自同一个模拟器。')+
 tabs('city')+'<div class="world-paper-grid"><div><div class="world-atlas" role="group" aria-label="十六街区彩色势力地图">'+slots+'</div><p class="map-hint">地图颜色：不同家族控制街区，而非每个地块都由玩家控制。</p>'+
 '<div class="world-legend">'+FACTIONS.map(item=>'<span><i style="background:'+item.color+'"></i>'+item.name+' '+(own[item.id]||0)+'</span>').join('')+'</div></div>'+
 '<div><div class="mini-title">街区档案 / '+esc(cell.id.toUpperCase())+'</div><div class="world-casefile"><strong>'+esc(cell.name)+'</strong>'+
 '<p>目前主导：'+owner.name+'</p><p>你的影响力：'+cell.influence.player+' / 100<br/>当地民意：'+cell.publicMood+'<br/>基础治安：'+cell.security+'</p>'+
 '<div class="world-influence"><span style="width:'+cell.influence.player+'%"></span></div>'+
 '<button class="primary" type="button" data-world-influence="'+cell.id+'">委托建立联系 · 40 元</button><p class="map-hint">需相邻街区或现有地盘；街区影响力累积到足够程度才可能更迭。</p></div>'+
 '<div class="mini-title">最近的势力变化</div>'+world.events.filter(x=>x.type==='territory.changed'||x.type==='faction.influence').slice(0,5).map(x=>'<p class="map-hint">DAY '+x.day+' · '+esc(x.text)+'</p>').join('')+'</div></div>';
}
function personnel(world,legacy,person='kai'){
 const members=world.slices.people.members.filter(p=>p.faction==='player'&&legacy.crew.includes(p.id));
 const p=members.find(p=>p.id===person)||members[0];
 if(!p)return hero('PERSONNEL','组织人员册','当前没有人手');
 return hero('PERSONNEL / PRIVATE','组织人员册','任命、性格和培养分开记录。干部职位会真实影响街区任务；每次培训需要预算，改变成长值与士气。')+
 tabs('personnel')+'<div class="world-paper-grid"><div><div class="mini-title">人员名单 / '+members.length+'人</div><div class="world-person-list">'+members.map(x=>
 '<button type="button" data-world-person="'+x.id+'" class="world-person '+(p.id===x.id?'selected':'')+'"><span class="world-portrait">'+x.name[0]+'</span><span><strong>'+x.name+'</strong><small>'+((JOBS.find(j=>j.id===x.job)||{}).name||'成员')+' · 忠诚 '+x.loyalty+'</small></span></button>'
 ).join('')+'</div><div class="info-box">岗位不同于派遣：职级会决定授权范围，但“经营经理”不代表随时正在跑运输订单。</div></div>'+
 '<div><div class="world-personal-file"><span class="paper-chip">NO. '+esc(p.id.toUpperCase())+'</span><h3>'+esc(p.name)+'</h3>'+
 '<p>任命：'+((JOBS.find(x=>x.id===p.job)||{}).name||'普通成员')+'<br/>忠诚 '+p.loyalty+' / 士气 '+p.morale+' / 经验 '+p.experience+'</p>'+
 '<p>性格：野心 '+p.personality.ambition+' · 自律 '+p.personality.discipline+' · 同理 '+p.personality.empathy+' · 勇气 '+p.personality.courage+'</p>'+
 '<p>能力：商业 '+p.skills.trade+' · 交际 '+p.skills.network+' · 判断 '+p.skills.analysis+'</p></div>'+
 '<div class="mini-title">职务委任</div><div class="selection-list">'+JOBS.map(j=>'<button type="button" class="choice" data-world-appoint="'+p.id+'" data-job="'+j.id+'">'+j.name+'</button>').join('')+'</div>'+
 '<p class="map-hint">每次委任20元，同一职位不能有两个负责人。</p>'+
 '<div class="mini-title">培养方向 · 每次45元</div><div class="selection-list">'+[
 ['trade','商业'],['network','交际'],['analysis','判断']].map(([id,label])=>'<button class="choice" type="button" data-world-train="'+p.id+'" data-skill="'+id+'">'+label+'</button>').join('')+'</div></div></div>';
}
function newspaper(world){
 const articles=world.slices.news.articles;
 return hero('NIGHT HARBOR PRESS · EVENING','夜港晚报','报纸不是虚构的每日固定随机句子。它由真正发生的势力行动、警局记录与城市变化转化而来。')+
 tabs('news')+'<div class="world-newspaper"><div class="world-paper-masthead"><small>THE NIGHT HARBOR TIMES</small><strong>夜 港 晚 报</strong><span>第 '+String(world.day).padStart(3,'0')+' 日 · CITY EDITION</span></div>'+
 articles.slice(0,9).map((n,i)=>'<article class="world-article"><small>'+esc(n.source)+' / DAY '+n.day+'</small><h3>'+esc(n.headline)+'</h3>'+
 '<p>新闻来源可信度参考：'+n.credibility+'%。报道可能并不涵盖全部真相。</p></article>').join('')+'</div>';
}
function civic(world){
 const c=world.slices.civic;
 return hero('CIVIC BUREAU / SECURITY','城市公报','这是独立的公共治安与国家关系数据。具体案件必须有来源和证据；现阶段不模拟完整审判与战争战斗。')+
 tabs('civic')+'<div class="world-paper-grid"><div><div class="world-civic-numbers"><div><small>城市安全</small><strong>'+c.security+'</strong></div><div><small>公众情绪</small><strong>'+c.publicMood+'</strong></div><div><small>对外紧张</small><strong>'+c.conflict.pressure+'</strong></div></div>'+
 '<div class="mini-title">执法机构</div>'+c.precincts.map(p=>'<article class="report-card"><h3>'+p.name+'</h3><p>新登记线索 '+p.cases+' 项</p></article>').join('')+
 '<div class="mini-title">事件与线索</div>'+ (c.cases.length?c.cases.map(x=>'<article class="report-card"><small>DAY '+x.day+' / '+x.precinct+'</small><h3>'+x.subject+'</h3><p>阶段：'+x.stage+'；已有：'+x.evidence.join('、')+'</p></article>').join(''):'<p>尚无正式登记的案件。</p>')+'</div>'+
 '<div><div class="mini-title">国际背景 / 战略级系统预留</div>'+c.nations.map(n=>'<article class="report-card"><h3>'+n.name+'</h3><p>关系紧张指数：'+n.tension+'</p></article>').join('')+
 '<div class="info-box">这不是已经完成的战争模拟：目前国家层仅提供一致的背景状态和可发布新闻的变动事件。战争、外交、供应冲击将在后续模块实施。</div></div></div>';
}
function conversation(world,legacy,person='kai'){
 const list=Object.entries(CONVERSATIONS).filter(([id])=>legacy.crew.includes(id));
 const chosen=CONVERSATIONS[person]?person:(list[0]?.[0]||'kai');
 const info=CONVERSATIONS[chosen];
 const prev=world.slices.dialogue.last;
 const node=info.nodes.greet;
 return hero('AUDIENCE / DIALOGUE','办公室会谈','分支对话按角色和节点定义，选项由规则系统执行；选择会留下人物关系与事件记录，角色口吻和消息可以逐步扩展。')+
 tabs('dialogue')+'<div class="world-paper-grid"><div><div class="mini-title">接见对象</div><div class="selection-list">'+list.map(([id,c])=>
 '<button type="button" class="choice '+(chosen===id?'active':'')+'" data-world-talk="'+id+'">'+c.speaker+'</button>').join('')+'</div>'+
 '<div class="world-speech"><small>'+info.speaker+' · 来访对话</small><p>“'+esc(prev?.person===chosen?prev.line:node.line)+'”</p></div></div>'+
 '<div><div class="mini-title">你的回答</div><div class="world-choices">'+node.choices.map(c=>'<button type="button" class="choice" data-world-dialogue="'+chosen+'" data-dialogue-choice="'+c.id+'">'+c.label+'</button>').join('')+'</div>'+
 '<div class="mini-title">最近对话记录</div>'+world.slices.dialogue.history.slice(0,4).map(d=>'<p class="map-hint">DAY '+d.day+' · '+esc(d.line)+'</p>').join('')+'</div></div>';
}
export function renderWorldPanel(tab,world,legacy,ui={}){
 if(tab==='personnel')return personnel(world,legacy,ui.person);
 if(tab==='news')return newspaper(world);
 if(tab==='civic')return civic(world);
 if(tab==='dialogue')return conversation(world,legacy,ui.talker);
 return factionMap(world,ui.cell);
}
