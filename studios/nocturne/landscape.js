import {createGame,deserialize,serialize,STORAGE_PREFIX,PERIODS,PLACES,CLUES,PEOPLE,travel,act,dateLabel,goal,activities,getHotspots,isOpen,outcomeLabel} from './engine.mjs';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const slotKey=n=>STORAGE_PREFIX+n;
const quote=s=>String(s||'').replace(/\n/g,'\n');
let state=null,app='home',hotspots=false,selectedClues=[],toastTimer=null,currentDialog=null,audioContext=null;
const stage=$('stage');
function notice(message){
  const box=$('toast');box.textContent=message;box.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.hidden=true,2800);
}
function loadSlot(slot){
  try{return deserialize(localStorage.getItem(slotKey(slot))||'');}catch{return null;}
}
function save(slot='auto',silent=true){
  if(!state)return false;
  try{localStorage.setItem(slotKey(slot),serialize(state));$('autosaveState').textContent=slot==='auto'?'● 自动存档已更新':'● 存档 '+slot+' 已保存';if(!silent)notice('存档已保存');return true;}
  catch{ $('autosaveState').textContent='! 保存失败，请导出数据';if(!silent)notice('浏览器无法写入存档，请导出备份');return false;}
}
function beep(){
  if(!state?.settings?.sound)return;
  try{
    audioContext??=new (window.AudioContext||window.webkitAudioContext)();
    const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='triangle';o.frequency.value=620;g.gain.value=.014;o.connect(g);g.connect(audioContext.destination);
    o.start();g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.09);o.stop(audioContext.currentTime+.11);
  }catch{}
}
function start(newGame){
  if(newGame){
    if(loadSlot('auto')&&!window.confirm('开始新游戏会覆盖自动存档（不会覆盖手动存档）。继续吗？'))return;
    state=createGame();state.location='room';state.period=3;
    state.flags.opening=true;state.settings.hotspots=false;
  }else{
    state=loadSlot('auto');if(!state){notice('还没有可继续的存档');return;}
    if(!state.settings)state.settings={reducedMotion:false,sound:false,hotspots:false};
  }
  $('titleLayer').hidden=true;
  app='home';hotspots=!!state.settings.hotspots;
  applySettings();renderAll();save();
  if(newGame){
    say('米卡','白天是学生，夜里……还是学生。至少我希望如此。\n手机又震了。这个号码为什么知道我的名字？',[
      {label:'查看匿名消息',action:'message'},
      {label:'先看看我的房间',app:'home'}],'MONOLOGUE · 23:12');
  }else{
    say('米卡','……好了，刚才的事情还没有做完。',[], 'WELCOME BACK');
  }
}
function applySettings(){
  document.documentElement.classList.toggle('reduce-motion',!!state?.settings?.reducedMotion);
  $('audioButton').textContent=state?.settings?.sound?'♫':'♪';
}
function say(name,text,choices=[],role='DIALOGUE'){
  $('speaker').textContent=name;$('speakerRole').textContent=role;$('line').textContent=text;
  $('choices').innerHTML=(choices.length?choices:[{label:'继续',action:'next-line'}]).map((o,i)=>
    '<button class="'+(i===0?'choice-main':'')+'" data-dialog-choice="'+esc(o.action||'')+'" data-dialog-app="'+esc(o.app||'')+'">'+esc(o.label)+(i===0?' <span>↗</span>':'')+'</button>').join('');
  beep();
}
function modal(title,text,opts=[{label:'好的',value:'dismiss'}],kicker='SYSTEM NOTICE'){
  currentDialog={title,opts};
  $('modalKicker').textContent=kicker;$('modalTitle').textContent=title;$('modalText').textContent=text;
  $('modalOptions').innerHTML=opts.map((o,i)=>'<button type="button" data-modal-action="'+esc(o.value)+'">'+(i===0?'✦　':'　　')+esc(o.label)+'</button>').join('');
  $('modal').hidden=false;
}
function closeModal(){$('modal').hidden=true;currentDialog=null}
function sceneView(){
  const loc=PLACES[state.location]||PLACES.room;
  $('locationChip').textContent='⌖ '+loc.name+' · '+PERIODS[state.period];
  stage.className='visual-stage '+state.location;
  $('sceneCaptionText').textContent=loc.description;
  // The GPTimg illustration is a cropped portrait, not a finished full-body rig.
  $('characterStage').style.opacity=state.location==='gallery'?'0.56':'1';
  $('inspectButton').setAttribute('aria-pressed',hotspots?'true':'false');
  $('sceneHotspots').innerHTML=hotspots?getHotspots(state).map(s=>'<button data-scene-action="'+esc(s.id)+'" title="'+esc(s.label)+'" aria-label="调查：'+esc(s.label)+'" style="left:'+s.x+'%;top:'+s.y+'%">'+(state.clues.includes(s.id)?'✓':s.icon)+'</button>').join(''):'';
}
function status(){
  const d=dateLabel(state);$('dateText').textContent=d.short+' · '+d.day;$('periodText').textContent=d.period;
  $('energyText').textContent=state.energy+'/5';$('studyText').textContent=state.study;
  $('moneyText').textContent=state.cash;$('taskHint').textContent=goal(state);
  $('unreadDot').hidden=!!state.flags.readMessage;
}
function paintHome(){
  return '<div class="win-kicker">MY DESKTOP / NIGHT SESSION</div><h2 class="win-heading">今晚，也要好好活着。</h2>'+
  '<p class="win-sub">你的日常和另一个世界，都在这台电脑上等待回复。<br>现在是第 '+state.day+' 天 · '+PERIODS[state.period]+'。</p>'+
  '<div class="win-row"><strong>今日状态</strong><span class="pill">'+(state.outcome?'委托已结束':state.mission==='active'?'秘密工作进行中':'学生生活')+'</span></div>'+
  '<button class="desktop-card" data-open="messages"><i>▤</i><div><strong>新消息 · '+(!state.flags.readMessage?'1 条未读':'已查看')+'</strong><small>未知联系人发送了一个问题。</small></div><span>›</span></button>'+
  '<button class="desktop-card" data-open="schedule"><i>▦</i><div><strong>今天的安排</strong><small>阅读课表、兼职、聊天或休息。</small></div><span>›</span></button>'+
  '<button class="desktop-card" data-open="mission"><i>✣</i><div><strong>午夜事务所</strong><small>'+(state.mission==='offered'?'N-01 有一份未签收的委托':'档案：N-01')+'</small></div><span>›</span></button>'+
  '<button class="desktop-card" data-open="map"><i>◇</i><div><strong>雾港城市交通</strong><small>去学校、咖啡店或站前广场。</small></div><span>›</span></button>';
}
function paintSchedule(){
  const slots=PERIODS.map((x,i)=>'<span class="'+(state.period===i?'on':'')+'">'+x+'</span>').join('');
  const actions=activities(state);
  return '<div class="win-kicker">PLANNER / SCHOOL & LIFE</div><h2 class="win-heading">今天的日程</h2>'+
    '<p class="win-sub">时间只会在活动完成后推进。移动和阅读消息都不会浪费时间。</p>'+
    '<div class="time-slots">'+slots+'</div>'+
    '<div class="win-row"><strong>可进行的活动</strong><span>'+esc(PLACES[state.location].name)+'</span></div>'+
    actions.map(a=>'<button class="desktop-card" data-act="'+esc(a.id)+'"><i>'+esc(a.icon)+'</i><div><strong>'+esc(a.title)+'</strong><small>'+esc(a.desc)+'</small></div><span>›</span></button>').join('');
}
function paintMessages(){
  return '<div class="win-kicker">CYBERSPACE / MESSAGES</div><h2 class="win-heading">消息列表</h2>'+
    '<div class="messenger"><div class="message-head"><span class="message-avatar">?</span><div><strong>未知号码</strong><small>22:18 · 加密通讯</small></div><span class="pill">'+(state.flags.readMessage?'已读':'未读')+'</span></div>'+
    '<div class="message-body">照片里的人，昨天已经死了。<br>但是今天，有人看见了“他”。<br><br>你想知道照片的真正来历吗？</div></div>'+
    '<div class="button-row"><button class="small-btn" data-act="message">阅读附件 / 回复</button><button class="small-btn alt" data-open="case">查看线索</button></div>'+
    '<div class="messenger"><div class="message-head"><span class="message-avatar">夏</span><div><strong>林见夏</strong><small>18:31 · 摄影社</small></div></div>'+
    '<div class="message-body">摄影社准备周末出去拍照。你真的不考虑来一次吗？</div></div>'+
    '<button class="small-btn alt" data-open="social">查看联系人</button>';
}
function paintMap(){
  return '<div class="win-kicker">CITY MAP / MISTHARBOR</div><h2 class="win-heading">雾港市交通图</h2><p class="win-sub">选择地点会切换舞台场景。展馆根据委托或证据解锁。</p>'+
    '<div class="map-preview">'+Object.entries(PLACES).map(([id,p])=>
      '<button class="map-pin '+(state.location===id?'active':'')+'" style="left:'+p.x+'%;top:'+p.y+'%" data-travel="'+esc(id)+'" '+(!isOpen(state,id)?'disabled':'')+'>'+esc(p.icon)+' '+esc(p.name)+'</button>').join('')+'</div>'+
    Object.entries(PLACES).map(([id,p])=>'<button class="desktop-card '+(state.location===id?'active':'')+'" data-travel="'+id+'" '+(!isOpen(state,id)?'disabled':'')+'><i>'+esc(p.icon)+'</i><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.district)+(!isOpen(state,id)?' · 尚未开放':' · 点击抵达')+'</small></div><span>↗</span></button>').join('');
}
function paintCase(){
  return '<div class="win-kicker">CASE BOARD / N-01</div><h2 class="win-heading">收集线索并推理</h2>'+
  '<p class="win-sub">搜集物件，再点选<strong>两张已获得的线索卡</strong>进行关联。没有自动答案。</p>'+
  '<div class="win-row"><strong>已发现证据</strong><span>'+state.clues.length+' / 4</span></div>'+
  Object.entries(CLUES).map(([id,c])=>{const yes=state.clues.includes(id),sel=selectedClues.includes(id);
    return '<button class="evidence-card '+(yes?'':'missing ')+(sel?'selected':'')+'" data-clue="'+id+'" '+(!yes?'disabled':'')+' style="width:100%;text-align:left"><strong>'+esc(yes?c.name:'未发现的线索')+(sel?'　✓':'')+'</strong><p>'+esc(yes?c.text:'到城市的不同地点调查寻找证据。')+'</p></button>';
  }).join('')+
  '<div class="evidence-pair">关联槽：'+(selectedClues.map(id=>esc(CLUES[id].name)).join('　＋　')||'请选择两个线索')+'</div>'+
  '<div class="button-row"><button class="small-btn" data-pair '+(selectedClues.length!==2?'disabled':'')+'>关联推理</button><button class="small-btn alt" data-clear-pair>清空</button></div>'+
  '<div class="win-sep"></div><p class="win-sub">当前假说：'+(state.theory==='forged'?'照片或官方记录有假':state.theory==='literal'?'官方记录可靠':'尚未提出')+'</p>';
}
function paintMission(){
  const stat={offered:'待签收',active:'调查进行中',resolved:'已结案',refused:'已拒绝'}[state.mission];
  return '<div class="win-kicker">MIDNIGHT BUREAU / CLASSIFIED</div><h2 class="win-heading">委托 N-01 · 陌生人的照片</h2>'+
  '<p class="win-sub">资料来源不明。指定对象的真实身份存在争议；委托期限为游戏内第 5 天。</p>'+
  '<div class="win-row"><strong>任务状态</strong><span class="pill">'+stat+'</span></div>'+
  '<div class="win-row"><strong>已调查资料</strong><span>'+state.clues.length+'/4</span></div>'+
  '<div class="progress"><i style="width:'+(state.clues.length*25)+'%"></i></div><div class="win-sep"></div>'+
  (state.mission==='offered'?'<div class="button-row"><button class="small-btn" data-act="accept">接受委托</button><button class="small-btn alt" data-act="refuse">拒绝委托</button></div>':'')+
  (state.mission==='active'?'<div class="button-row"><button class="small-btn" data-open="case">继续调查</button><button class="small-btn alt" data-act="resolve">决定任务方向</button></div>':'')+
  (state.mission==='resolved'?'<div class="messenger"><div class="message-body">本次结局：'+esc(outcomeLabel(state.outcome))+'<br>新的故事结果已写入存档。</div></div>':'')+
  (state.mission==='refused'?'<p class="win-sub">你拒绝了委托。继续生活仍然是有效剧情路线。</p>':'')+
  '<button class="desktop-card" data-open="messages"><i>✉</i><div><strong>组织联系人</strong><small>追查没有署名的讯息</small></div><span>›</span></button>';
}
function paintSocial(){
  return '<div class="win-kicker">SOCIAL / RELATIONSHIP</div><h2 class="win-heading">城市中的人</h2><p class="win-sub">每个选择都可能影响信任，不只是好感度数值。</p>'+
  PEOPLE.map(p=>'<div class="relation"><div class="relation-icon">'+esc(p.initial)+'</div><div style="flex:1"><strong>'+esc(p.name)+'</strong><small>'+esc(p.role)+' · '+(state.trust[p.key]||0)+'/10</small><div class="progress"><i style="width:'+Math.max(0,(state.trust[p.key]||0)*10)+'%"></i></div></div></div>').join('')+
  '<div class="button-row"><button class="small-btn" data-open="map">前往地点</button></div>';
}
function paintSaves(){
  return '<div class="win-kicker">SYSTEM / SAVE & LOAD</div><h2 class="win-heading">档案管理</h2>'+
  '<p class="win-sub">游戏按地点、时段、线索、人物关系和剧情后果保存。推荐定期导出 JSON 备份。</p>'+
  [1,2,3].map(n=>'<div class="win-row"><strong>存档栏 '+n+'</strong><span>'+(loadSlot(String(n))?'已保存':'空白')+'</span></div><div class="button-row"><button class="small-btn" data-save="'+n+'">保存</button><button class="small-btn alt" data-load="'+n+'" '+(!loadSlot(String(n))?'disabled':'')+'>读取</button></div>').join('')+
  '<div class="win-sep"></div><div class="button-row"><button class="small-btn" data-export>导出进度 JSON</button><button class="small-btn alt" data-import>导入 JSON</button></div>';
}
function paintSettings(){
  return '<div class="win-kicker">SYSTEM / OPTIONS</div><h2 class="win-heading">游戏设置</h2>'+
  '<p class="win-sub">设置与游戏存档关联。触屏点击可完成全部操作，不强制精细拖拽。</p>'+
  '<button class="desktop-card" data-settings="sound"><i>♪</i><div><strong>提示音</strong><small>'+(state.settings.sound?'开启':'关闭')+'</small></div></button>'+
  '<button class="desktop-card" data-settings="motion"><i>✧</i><div><strong>减少动画效果</strong><small>'+(state.settings.reducedMotion?'已开启':'未开启')+'</small></div></button>'+
  '<button class="desktop-card" data-settings="landscape"><i>▱</i><div><strong>横屏提示</strong><small>可继续使用竖屏，但横屏体验更完整</small></div></button>'+
  '<div class="button-row"><button class="small-btn alt" data-open="save">管理存档</button><button class="small-btn" data-title>返回标题画面</button></div>';
}
function paintWindow(){
  const views={home:paintHome,schedule:paintSchedule,messages:paintMessages,map:paintMap,case:paintCase,mission:paintMission,social:paintSocial,save:paintSaves,settings:paintSettings};
  const names={home:'MY DESKTOP',schedule:'DAILY PLANNER',messages:'MESSAGES',map:'CITY MAP',case:'CASE FILE',mission:'CLASSIFIED',social:'RELATIONS',save:'GAME ARCHIVE',settings:'SYSTEM SETTINGS'};
  $('windowTitle').textContent=(names[app]||'MY DESKTOP')+' / DAY '+String(state.day).padStart(2,'0');
  $('windowContent').innerHTML=(views[app]||paintHome)();
  document.querySelectorAll('.app-dock [data-app]').forEach(b=>b.classList.toggle('selected',b.dataset.app===app));
}
function renderAll(){status();sceneView();paintWindow()}
function setApp(next){
  if(!state)return;
  app=next;selectedClues=[];paintWindow();
  if(next==='messages')say('系统','收到两条聊天消息。未读的那一条，来自一个没有名字的人。',[{label:'阅读匿名消息',action:'message'},{label:'查看我的档案',app:'case'}],'MESSAGES');
}
function onAction(action){
  if(!state)return;
  if(action==='next-line'){say('米卡','还有什么事需要做？',[{label:'打开日程',app:'schedule'},{label:'查看城市地图',app:'map'}],'THINKING');return;}
  if(action==='resolve'){
    if(state.mission!=='active'){notice('请先接受委托');return;}
    modal('决定委托方向','这是剧情中的抽象行动选择。已知证据并不能保证委托人说的都是真的。',[
      {label:'公开矛盾证据',value:'outcome-expose'},{label:'保护可能被牵连的人',value:'outcome-protect'},
      {label:'按照组织要求执行',value:'outcome-obey'},{label:'先离开这里',value:'dismiss'}],'DECISION / N-01');
    return;
  }
  const result=act(state,action);renderAll();save();
  if(result){
    if(['outcome-expose','outcome-protect','outcome-obey','refuse'].includes(action))modal(result.title,result.text,[{label:'继续自己的生活',value:'dismiss'}],'STORY RESULT');
    else if(result.choices&&result.choices.length>2)modal(result.title,result.text,result.choices.map(c=>({label:c.label,value:c.id})),'INTERACTIVE STORY');
    else say(result.title,result.text,(result.choices||[]).filter(c=>c.id!=='dismiss').map(c=>({label:c.label,action:c.id})),'STORY / '+PERIODS[state.period]);
  }
}
function pairEvidence(){
  if(selectedClues.length!==2){notice('先选两张证据卡');return;}
  const ids=selectedClues.join(':');
  const strong=(selectedClues.includes('photo')&&selectedClues.includes('receipt'))||(selectedClues.includes('photo')&&selectedClues.includes('timetable'))||(selectedClues.includes('registry')&&selectedClues.includes('photo'));
  if(strong){
    onAction('theory-fake');
    say('米卡','等一下……这两条记录根本对不上。有人篡改过照片的时间，或者在误导我。',[{label:'重新查看委托',app:'mission'}],'INFERENCE CONFIRMED');
  }else{
    say('米卡','这两条资料目前还无法互相解释。也许需要一张来自其他地点的证据。',[{label:'继续调查',app:'case'}],'INFERENCE INCOMPLETE');
  }
  selectedClues=[];renderAll();
}
function move(id){
  const result=travel(state,id);
  if(result.error){notice(result.error);return;}
  app='home';renderAll();save();
  say('场景 · '+PLACES[id].name,result.text,[{label:'检查这里有什么',action:'inspect'},{label:'看看日程',app:'schedule'}],'LOCATION CHANGE');
}
function exportSave(){
  const blob=new Blob([serialize(state)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='nocturne-day'+state.day+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  notice('正在导出 JSON 存档');
}
function importSave(){
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;document.body.appendChild(input);
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];if(!file){input.remove();return;}
    if(file.size>200000){notice('存档过大');input.remove();return;}
    try{
      const loaded=deserialize(await file.text());if(!loaded)throw Error('incompatible');
      state=loaded;state.settings??={sound:false,reducedMotion:false,hotspots:false};
      hotspots=!!state.settings.hotspots;applySettings();renderAll();save();
      notice('进度已成功导入');
    }catch{notice('存档损坏或不兼容');}finally{input.remove()}
  },{once:true});input.click();
}
function handleButton(button){
  if(!button||!state)return;
  if(button.dataset.app){setApp(button.dataset.app);return;}
  if(button.dataset.open){setApp(button.dataset.open);return;}
  if(button.dataset.act){
    if(button.dataset.act==='inspect'){toggleInspect();return;}
    onAction(button.dataset.act);return;
  }
  if(button.dataset.travel){move(button.dataset.travel);return;}
  if(button.dataset.sceneAction){onAction(button.dataset.sceneAction);return;}
  if(button.dataset.clue){
    const id=button.dataset.clue;if(!state.clues.includes(id))return;
    if(selectedClues.includes(id))selectedClues=selectedClues.filter(x=>x!==id);
    else if(selectedClues.length>=2)selectedClues=[selectedClues[1],id];
    else selectedClues.push(id);
    paintWindow();return;
  }
  if(button.hasAttribute('data-pair')){pairEvidence();return;}
  if(button.hasAttribute('data-clear-pair')){selectedClues=[];paintWindow();return;}
  if(button.dataset.settings){
    const x=button.dataset.settings;if(x==='sound')state.settings.sound=!state.settings.sound;
    else if(x==='motion')state.settings.reducedMotion=!state.settings.reducedMotion;
    else if(x==='landscape'){$('rotateHint').hidden=false;return;}
    applySettings();renderAll();save();return;
  }
  if(button.dataset.save){save(button.dataset.save,false);paintWindow();return;}
  if(button.dataset.load){
    const found=loadSlot(button.dataset.load);if(!found){notice('没有存档');return;}
    state=found;state.settings??={sound:false,reducedMotion:false,hotspots:false};hotspots=!!state.settings.hotspots;
    applySettings();renderAll();save();notice('存档读取成功');return;
  }
  if(button.hasAttribute('data-export')){exportSave();return}
  if(button.hasAttribute('data-import')){importSave();return}
  if(button.hasAttribute('data-title')){save();$('titleLayer').hidden=false;const found=!!loadSlot('auto');$('startContinue').disabled=!found;return;}
}
function toggleInspect(){
  hotspots=!hotspots;state.settings.hotspots=hotspots;sceneView();save();
  if(hotspots)say('米卡','这里似乎有些值得注意的东西。点击发光的标记，就能仔细看看。',[],'INVESTIGATION');
}
function orientationCheck(){
  if(!state ||sessionStorage.getItem('nocturne.rotate.dismissed'))return;
  $('rotateHint').hidden=!(window.innerHeight>window.innerWidth);
}
$('startNew').addEventListener('click',()=>{start(true);orientationCheck()});
$('startContinue').addEventListener('click',()=>{start(false);orientationCheck()});
$('startContinue').disabled=!loadSlot('auto');
document.querySelector('.app-dock').addEventListener('click',e=>handleButton(e.target.closest('button')));
$('windowContent').addEventListener('click',e=>handleButton(e.target.closest('button')));
$('stage').addEventListener('click',e=>{
  const btn=e.target.closest('button');
  if(btn?.dataset?.dialogChoice!==undefined){
    if(btn.dataset.dialogApp){setApp(btn.dataset.dialogApp);say('米卡','那么，就先从这里开始吧。',[]);return;}
    if(btn.dataset.dialogChoice==='inspect'){toggleInspect();return;}
    onAction(btn.dataset.dialogChoice);return;
  }
  handleButton(btn);
});
$('inspectButton').addEventListener('click',toggleInspect);
$('quickNext').addEventListener('click',()=>onAction('next'));
$('minimizeButton').addEventListener('click',()=>setApp('home'));
$('historyButton').addEventListener('click',()=>modal('最近的故事',state?.journal?.slice(0,9).join('\n')||'还没有记录。'));
$('closeModal').addEventListener('click',closeModal);
$('modalOptions').addEventListener('click',e=>{const b=e.target.closest('[data-modal-action]');if(!b)return;const a=b.dataset.modalAction;closeModal();if(a!=='dismiss')onAction(a)});
$('audioButton').addEventListener('click',()=>{if(!state)return;state.settings.sound=!state.settings.sound;applySettings();save()});
$('dismissRotate').addEventListener('click',()=>{$('rotateHint').hidden=true;try{sessionStorage.setItem('nocturne.rotate.dismissed','true')}catch{}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('modal').hidden)closeModal();else setApp('home');}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save()});
window.addEventListener('pagehide',()=>save());
window.addEventListener('resize',()=>{if(state)orientationCheck()});
