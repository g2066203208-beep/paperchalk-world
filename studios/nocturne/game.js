import {createGame,deserialize,serialize,STORAGE_PREFIX,PERIODS,PLACES,CLUES,PEOPLE,travel,act,dateLabel,goal,activities,getHotspots,isOpen,outcomeLabel} from './engine.mjs';
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=slot=>STORAGE_PREFIX+slot;
const el={game:$('gameScreen'),title:$('titleScreen'),clock:$('clock'),panel:$('panel'),nav:$('nav'),scenery:$('scenery'),
  hotspots:$('hotspots'),toggleHotspots:$('toggleHotspots'),dialog:$('dialogBackdrop'),choices:$('dialogChoices'),
  toast:$('toast')};
let state=null,tab='day',modal=null,toastTimer=null,storageOkay=true;
function getSaved(slot='auto'){
  try{return deserialize(localStorage.getItem(key(slot))||'');}catch{return null;}
}
function save(slot='auto',quiet=false){
  if(!state)return false;
  try{localStorage.setItem(key(slot),serialize(state));storageOkay=true;if(!quiet)toast('已保存至 '+(slot==='auto'?'自动存档':'存档位 '+slot));return true;}
  catch{storageOkay=false;toast('当前浏览器不允许保存；请在设置中导出进度。');return false;}
}
function toast(message){
  el.toast.textContent=message;el.toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.toast.hidden=true;},3300);
}
function startGame(loaded=false){
  if(!loaded)state=createGame();
  if(!state)return;
  el.title.hidden=true;el.game.hidden=false;tab='day';
  render();save('auto',true);
  if(!loaded)dialog({title:'第一天 · 放学之后',text:'雾港大学的下课铃声响了。\n从今天开始，你可以自己安排时间。去校园里看看，或者打开委托档案。城市似乎藏着一个不愿被人发现的秘密。',choices:[{label:'开始探索',id:'dismiss'}]});
  else toast('欢迎回来。你的进度已经恢复。');
}
function lineBreak(text){return safe(text).replace(/\n/g,'<br>');}
function dialog(data){
  if(!data)return;
  modal=data;
  $('dialogTitle').textContent=data.title||'消息';
  $('dialogText').textContent=data.text||'';
  $('dialogKicker').textContent=data.kicker||'STORY / NOCTURNE';
  el.choices.innerHTML=(data.choices||[{label:'继续',id:'dismiss'}]).map((c,i)=>'<button type="button" data-dialog-choice="'+safe(c.id)+'">'+(i===0?'✦　':'　　')+safe(c.label)+'</button>').join('');
  el.dialog.hidden=false;
  document.body.style.overflow='hidden';
  el.choices.querySelector('button')?.focus({preventScroll:true});
}
function closeDialog(){
  el.dialog.hidden=true;modal=null;document.body.style.overflow='';
}
function handleStory(id){
  closeDialog();
  if(id==='dismiss')return;
  const result=act(state,id);
  render();save('auto',true);
  if(result)dialog(result);
}
function locationClass(){
  return state.location+(state.period>=2?' night':'');
}
function renderStage(){
  const place=PLACES[state.location];
  el.scenery.className='scenery '+locationClass();
  $('sceneTitle').textContent=place.name;
  $('sceneDescription').textContent=place.description;
  $('sceneEyebrow').textContent='DAY '+String(state.day).padStart(2,'0')+' · '+PERIODS[state.period]+' / '+place.district;
  $('objective').textContent=goal(state);
  el.toggleHotspots.setAttribute('aria-pressed',String(!!state.settings.hotspots));
  el.hotspots.innerHTML=state.settings.hotspots?getHotspots(state).map(h=>{
    const known=h.id!=='message'&&state.clues.includes(h.id);
    return '<button class="hotspot'+(known?' small':'')+'" type="button" data-action="'+safe(h.id)+'" aria-label="调查'+safe(h.label)+'" title="'+safe(h.label)+'" style="left:'+h.x+'%;top:'+h.y+'%">'+(known?'✓':h.icon)+'</button>';
  }).join(''):'';
}
function renderClock(){
  const d=dateLabel(state);
  el.clock.innerHTML='<strong>'+safe(d.short)+'</strong><span>'+safe(d.day)+'<br>'+safe(d.period)+'</span>';
}
function activityButton(activity){
  return '<button type="button" class="action-row" data-action="'+safe(activity.id)+'"><span class="action-icon">'+safe(activity.icon)+'</span><span class="action-body"><strong>'+safe(activity.title)+'</strong><small>'+safe(activity.desc)+'</small></span><span class="arr">›</span></button>';
}
function dayPanel(){
  const entries=['上午','放学后','傍晚','深夜'];
  const stats=[['精力',state.energy+'/5'],['学业',state.study],['金钱','¥'+state.cash]];
  return '<div class="section-kicker">DAILY PLANNER</div><h3>今天，想做些什么？</h3>'+
    '<p class="section-description">选择活动会推进时段。观察场景物件与地图移动不会消耗时间。</p>'+
    '<div class="slot-grid">'+entries.map((x,i)=>'<div class="slot '+(state.period===i?'active':'')+'"><strong>'+['☼','◒','◑','☾'][i]+'</strong><small>'+x+'</small></div>').join('')+'</div>'+
    '<div class="group-label"><span>当前状态</span><span>第 '+state.day+' 天</span></div>'+
    '<div class="stat-grid">'+stats.map(s=>'<div class="stat"><strong>'+safe(s[1])+'</strong><small>'+safe(s[0])+'</small></div>').join('')+'</div>'+
    '<div class="group-label"><span>可进行的活动</span><span>'+safe(PLACES[state.location].name)+'</span></div>'+
    activities(state).map(activityButton).join('')+
    '<div class="section-divider"></div><button class="action-row" data-action="journal"><span class="action-icon">☰</span><span class="action-body"><strong>回顾故事</strong><small>重新阅读最近发生的事</small></span><span class="arr">›</span></button>';
}
function mapPanel(){
  return '<div class="section-kicker">CITY OF MISTHARBOR</div><h3>雾港城市地图</h3>'+
    '<p class="section-description">点击地图节点或下方地点即可移动。展馆随委托推进解锁。</p>'+
    '<div class="map-layout"><div class="map-road"></div>'+Object.entries(PLACES).map(([id,p])=>{
    const locked=!isOpen(state,id);
    return '<button class="map-point '+(state.location===id?'active ':'')+(locked?'locked':'')+'" type="button" data-go="'+id+'" style="left:'+p.x+'%;top:'+p.y+'%" '+(locked?'disabled':'')+'>'+p.icon+' '+safe(p.name)+'</button>';
  }).join('')+'</div>'+
    Object.entries(PLACES).map(([id,p])=>'<button class="location-row" type="button" data-go="'+id+'" '+(!isOpen(state,id)?'disabled':'')+'><span class="pin">'+p.icon+'</span><span style="flex:1"><strong>'+safe(p.name)+'</strong><small>'+safe(p.district)+(isOpen(state,id)?' · 点击前往':' · 待解锁')+'</small></span><span class="arr">'+(state.location===id?'●':'→')+'</span></button>').join('');
}
function casePanel(){
  const found=state.clues.length;
  return '<div class="section-kicker">INVESTIGATION / EVIDENCE</div><h3>陌生人的照片</h3>'+
    '<p class="section-description">独立线索 '+found+'/4。照片上记录的时间和地点真的可信吗？点击「◎ 探索」观察各地物件。</p>'+
    '<div class="group-label"><span>调查笔记</span><span>已记录 '+found+' 件</span></div>'+
    Object.entries(CLUES).map(([id,c])=>{
      const yes=state.clues.includes(id);
      return '<div class="record '+(yes?'':'missing')+'"><strong>'+(yes?'✦　'+safe(c.name):'◇　尚未发现的记录')+'</strong><p>'+(yes?safe(c.text):'前往城市各处，寻找相互独立的证据。')+'</p></div>';
    }).join('')+
    '<div class="section-divider"></div><div class="group-label">推理假说</div>'+
    '<p class="section-description">'+(state.theory==='forged'?'当前判断：照片与档案的记录存在人为矛盾。':state.theory==='literal'?'当前判断：暂时相信官方记录。':'至少收集两条线索，再决定如何解释这些冲突。')+'</p>'+
    (found>=2?'<div class="panel-buttons"><button data-action="theory-fake">照片或档案有假</button><button class="outline" data-action="theory-real">官方记录可信</button></div>':'<div class="chip">尚缺少独立佐证</div>');
}
function missionPanel(){
  const status=state.mission==='offered'?'新委托':state.mission==='active'?'调查中':state.mission==='refused'?'已拒绝':'已结案';
  let buttons='';
  if(state.mission==='offered')buttons='<div class="panel-buttons"><button data-action="accept">接受委托</button><button data-action="refuse" class="outline">拒绝委托</button></div>';
  if(state.mission==='active')buttons='<div class="panel-buttons"><button data-action="resolve">决定委托结局</button><button data-tab="case" class="outline">查看线索</button></div>';
  if(state.mission==='resolved')buttons='<div class="record"><strong>本次结局 · '+safe(outcomeLabel(state.outcome))+'</strong><p>这份委托已经结束。选择造成的社会关系与状态变化仍会影响后续生活。</p></div>';
  if(state.mission==='refused')buttons='<div class="record"><strong>事务所的记录</strong><p>你选择了不接受。拒绝任务也是一种真实结果，生活仍可继续。</p></div>';
  return '<div class="section-kicker">CONTRACT / N-01</div><h3>组织委托</h3>'+
    '<div class="mission-banner"><small>CLASSIFIED / '+safe(status)+'</small><h3>陌生人的照片</h3><p>目标：确认校友档案背后的真实人物<br>背景：事务所提供的信息可能并不可靠<br>期限：第 5 天夜晚前（游戏内时间）</p></div>'+
    '<p class="section-description">根据获得的资料选择剧情方向。你可以拒绝指令、公开证据或以其他方式保护牵连者。这里强调故事后果，而不模拟现实犯罪操作。</p>'+
    '<div class="group-label"><span>情报完整度</span><span>'+state.clues.length+'/4</span></div>'+
    '<div class="meter" style="height:6px"><i style="width:'+(state.clues.length/4*100)+'%"></i></div>'+
    '<div class="group-label"><span>当前解释</span><span>'+(state.theory?'已提出假说':'尚未判断')+'</span></div>'+
    buttons;
}
function socialPanel(){
  return '<div class="section-kicker">SOCIAL CONNECTIONS</div><h3>熟悉与陌生的人</h3>'+
    '<p class="section-description">亲近或疏远都会在之后的场景中留下痕迹。关系不仅仅是加一个数字。</p>'+
    PEOPLE.map(p=>{
      const trust=Math.max(0,Math.min(10,state.trust[p.key]||0));
      return '<div class="social-row"><span class="avatar">'+safe(p.initial)+'</span><div class="social-info"><strong>'+safe(p.name)+'</strong><p>'+safe(p.role)+' · 信任 '+trust+'/10</p><p>'+safe(p.description)+'</p><div class="meter"><i style="width:'+(trust*10)+'%"></i></div></div></div>';
    }).join('');
}
function renderPanel(){
  const views={day:dayPanel,map:mapPanel,case:casePanel,mission:missionPanel,social:socialPanel};
  el.panel.innerHTML=(views[tab]||dayPanel)();
  el.nav.querySelectorAll('[data-tab]').forEach(button=>{const active=button.dataset.tab===tab;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');});
}
function render(){
  if(!state)return;
  renderClock();renderStage();renderPanel();
  $('statusLine').textContent=storageOkay?'进度自动保存 · '+state.clues.length+' 条线索':'自动存档失败 · 请导出进度';
}
function openSettings(){
  const slots=['1','2','3'];
  dialog({kicker:'SETTINGS / SAVE',title:'选项与存档',text:'关闭对话可继续游戏。支持三个手动存档位、自动存档和导出进度。',choices:[
    ...slots.map(id=>({label:'保存到 '+id+' 号存档位',id:'save:'+id})),
    ...slots.map(id=>({label:'读取 '+id+' 号存档位'+(getSaved(id)?'':'（空）'),id:'load:'+id})),
    {label:'导出当前存档（JSON）',id:'export'},
    {label:'导入存档（JSON 文件）',id:'import'},
    {label:'减少动态演出：'+(state.settings.reducedMotion?'已开启':'未开启'),id:'motion'},
    {label:'回到主标题',id:'title'},
    {label:'继续游戏',id:'dismiss'}]});
}
function downloadSave(){
  const blob=new Blob([serialize(state)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download='nocturne-save-day-'+state.day+'.json';document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已开始导出 JSON 存档。');
}
function importSave(){
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;document.body.appendChild(input);
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];if(!file){input.remove();return;}
    if(file.size>250000){toast('存档文件过大，无法读取。');input.remove();return;}
    let data=null;try{data=deserialize(await file.text());}catch{}
    if(!data){toast('存档格式不正确或版本不兼容。');input.remove();return;}
    state=data;state.settings=state.settings||{reducedMotion:false,sound:false,hotspots:false};render();save('auto');toast('存档导入成功。');input.remove();
  },{once:true});input.click();
}
function action(id){
  if(id.startsWith('save:')){save(id.slice(5));return;}
  if(id.startsWith('load:')){const loaded=getSaved(id.slice(5));if(loaded){state=loaded;state.settings=state.settings||{hotspots:false,reducedMotion:false,sound:false};render();save('auto',true);toast('存档读取成功。');}else toast('该存档位为空。');return;}
  if(id==='export'){downloadSave();return;}
  if(id==='import'){importSave();return;}
  if(id==='motion'){state.settings.reducedMotion=!state.settings.reducedMotion;document.documentElement.classList.toggle('reduce-motion',state.settings.reducedMotion);render();save('auto',true);toast(state.settings.reducedMotion?'已减少镜头动效':'已恢复动画');return;}
  if(id==='title'){el.game.hidden=true;el.title.hidden=false;renderTitle();return;}
  const result=act(state,id);render();save('auto',true);if(result)dialog(result);
}
function renderTitle(){
  const has=!!getSaved('auto');$('continueButton').disabled=!has;$('continueButton').textContent=has?'继续游戏':'暂无存档';
}
$('newGameButton').addEventListener('click',()=>{if(getSaved('auto')&&!confirm('重新开始会覆盖自动存档，确定吗？手动存档不会被覆盖。'))return;startGame(false);});
$('continueButton').addEventListener('click',()=>{
  const loaded=getSaved('auto');if(!loaded){toast('没有可以读取的存档。');return;}
  state=loaded;state.settings=state.settings||{hotspots:false,reducedMotion:false,sound:false};startGame(true);
});
el.nav.addEventListener('click',event=>{
  const btn=event.target.closest('[data-tab]');if(!btn||!state)return;tab=btn.dataset.tab;renderPanel();
});
$('panel').addEventListener('click',event=>{
  const btn=event.target.closest('button');if(!btn||!state)return;
  if(btn.dataset.tab){tab=btn.dataset.tab;renderPanel();return;}
  if(btn.dataset.go){const result=travel(state,btn.dataset.go);if(result.error)toast(result.error);else{render();save('auto',true);dialog(result);}return;}
  if(btn.dataset.action)action(btn.dataset.action);
});
el.hotspots.addEventListener('click',event=>{const btn=event.target.closest('[data-action]');if(btn&&state)action(btn.dataset.action);});
el.toggleHotspots.addEventListener('click',()=>{if(!state)return;state.settings.hotspots=!state.settings.hotspots;renderStage();save('auto',true);});
$('saveButton').addEventListener('click',()=>{if(state)save('1');});
$('settingsButton').addEventListener('click',()=>{if(state)openSettings();else toast('请先开始游戏。');});
el.choices.addEventListener('click',event=>{
  const btn=event.target.closest('[data-dialog-choice]');if(!btn)return;
  const id=btn.dataset.dialogChoice;closeDialog();
  if(id.startsWith('save:')||id.startsWith('load:')||['export','import','motion','title'].includes(id)){action(id);return;}
  handleStory(id);
});
$('closeDialog').addEventListener('click',closeDialog);
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!el.dialog.hidden)closeDialog();});
window.addEventListener('pagehide',()=>{if(state)save('auto',true);});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&state)save('auto',true);});
renderTitle();
