/* Surface-world life UI; a single compact overlay in the original game view.
 * Uses the existing home scene catalog; city areas are clearly marked as
 * text-only until actual art exists. Never swaps a random battle background.
 */
(function(global){
  'use strict';
  const Core=global.PaperWorldDailyLife;
  if(!Core)return;
  const storage=(()=>{try{return global.localStorage}catch(_){return null}})();
  const h=(tag,cls,text)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined)el.textContent=String(text);
    return el;
  };
  const root=document.getElementById('novel-ui');
  if(!root)return;
  const state=Core.create({
    storage,
    onStatEvent:event=>global.PaperWorldTopHUD?.applyEvent?.(event)
  });
  const panel=h('section','daily-life');
  panel.id='daily-life-ui';panel.hidden=true;panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','false');panel.setAttribute('aria-label','表世界日常生活');
  panel.innerHTML='<header class="daily-head"><div><small>表世界 · DAILY LIFE</small><h2>今天的生活</h2></div><div class="daily-head-right"><div class="daily-calendar" aria-live="polite"></div><button class="daily-close" type="button" aria-label="收起生活界面">×</button></div></header><div class="daily-body"><nav class="daily-tabs" aria-label="生活功能"></nav><div class="daily-main"><div class="daily-stats"></div><div class="daily-location"></div><div class="daily-content" aria-live="polite"></div><p class="daily-feedback" role="status" aria-live="polite"></p></div></div>';
  root.appendChild(panel);
  const cityCover=h('div','daily-city-cover');
  cityCover.hidden=true;cityCover.setAttribute('aria-label','尚未配备美术素材的城市生活地点');
  cityCover.innerHTML='<div class="daily-city-inner"><small>表世界 / 城市生活</small><strong></strong><span>当前地点已接入日程与交互，场景美术尚待制作。</span></div>';
  root.insertBefore(cityCover,panel);
  const tabs=panel.querySelector('.daily-tabs');
  const content=panel.querySelector('.daily-content');
  const feedback=panel.querySelector('.daily-feedback');
  const calendarEl=panel.querySelector('.daily-calendar');
  const locationEl=panel.querySelector('.daily-location');
  const statsEl=panel.querySelector('.daily-stats');
  const HOME_SCENES=new Set(['bedroom','living-room','kitchen','entrance']);
  const labels={schedule:'日程',places:'地点',people:'人物',news:'新闻',inventory:'背包',journal:'记录'};
  let tab='schedule',resetArmed=false,mode=false;
  function line(parent,cls,title,detail){
    const div=h('div',cls);
    div.appendChild(h('strong','daily-line-title',title));
    if(detail)div.appendChild(h('span','daily-line-detail',detail));
    parent.appendChild(div);
    return div;
  }
  function sectionTitle(title,description){
    content.appendChild(h('h3','daily-section-title',title));
    if(description)content.appendChild(h('p','daily-section-caption',description));
  }
  function button(parent,label,detail,fn,options={}){
    const el=h('button','daily-action',null);
    el.type='button';
    const left=h('span','daily-action-left');
    left.appendChild(h('strong','',label));
    if(detail)left.appendChild(h('small','',detail));
    el.appendChild(left);
    el.appendChild(h('span','daily-chevron',options.arrow||'›'));
    if(options.disabled){el.disabled=true;el.title=options.reason||'当前不可用'}
    else el.addEventListener('click',fn);
    parent.appendChild(el);return el;
  }
  function formatDuration(minutes){return minutes>=60&&minutes%60===0?minutes/60+'小时':minutes+'分钟'}
  function apply(fn){
    const result=fn();
    feedback.textContent=result.ok?result.message:result.reason;
    feedback.dataset.status=result.ok?'success':'warning';
    draw();
    return result;
  }
  async function afterTravel(id){
    const loc=Core.LOCATIONS[id];
    if(loc?.scene&&typeof global.PaperWorldDailyLifeScene==='function')
      try{await global.PaperWorldDailyLifeScene(loc.scene)}catch(err){
        feedback.textContent='地点已到达，但场景切换未成功：'+err.message;
      }
  }
  function refreshCity(s){
    const city=!Core.LOCATIONS[s.location]?.scene;
    cityCover.hidden=!city||root.hidden;
    cityCover.querySelector('strong').textContent=Core.LOCATIONS[s.location].label;
  }
  function renderSchedule(s){
    sectionTitle('今日安排','行动消耗游戏时间、精力与物资。没有离线扣除，也没有随机金钱奖励。');
    const box=h('div','daily-action-list');
    const today=s.calendar.weekdayLabel;
    line(box,'daily-summary','第'+s.day+'天 · '+today,
      '当前'+Core.LOCATIONS[s.location].label+'，'+s.calendar.time);
    const here=Object.entries(Core.ACTIONS).filter(([,a])=>a.location===s.location);
    for(const [id,a] of here){
      const used=a.limit&&(s.dailyUses[id]||0)>=a.limit;
      button(box,a.label,formatDuration(a.minutes)+(a.money?' · 收入 ¥'+a.money:'')+
        (a.knowledge?' · 知识 +'+a.knowledge:''),
      ()=>apply(()=>state.act(id)),{disabled:!!used,reason:'每日次数已用完'});
    }
    if(s.location==='bedroom')
      button(box,'今晚按时睡觉','22:00前入睡 · 次日06:00起床 · 里世界夜间豁免',
        ()=>apply(()=>state.sleep()),{arrow:'☾'});
    if(s.location==='convenience'){
      for(const [id,item] of Object.entries(Core.ITEM_META))
        button(box,'购买'+item.label,'¥'+item.price+' · 放入背包',
          ()=>apply(()=>state.buy(id)),{arrow:'+'});
    }
    if(s.location==='school'&&[0,6].includes(s.calendar.weekday)){
      line(box,'daily-tip','今天不需要上课','周末可以安排兼职、休息或其他个人活动。');
    }
    if(!here.length&&s.location!=='convenience'&&s.location!=='bedroom')
      line(box,'daily-tip','暂无固定活动','可以和在场人物交谈，或前往其他地点。');
    content.appendChild(box);
    sectionTitle('今日要闻');
    content.appendChild(h('p','daily-inline-news',s.news[0]));
    if(s.nightStatus==='recalled')
      content.appendChild(h('p','daily-danger','22:00召回已经触发。正式夜间出入场尚未接入本生活模块，不能用跳过按钮绕开。'));
  }
  function renderPlaces(s){
    sectionTitle('城市与家庭','家中地点沿用已绘制场景；城市地点先提供文字交互，不伪造背景美术。');
    for(const group of ['家','城区']){
      const list=h('div','daily-action-list');
      content.appendChild(h('h4','daily-group-title',group));
      for(const [id,loc] of Object.entries(Core.LOCATIONS)){
        if(loc.group!==group)continue;
        const current=s.location===id;
        const isWeekend=[0,6].includes(s.calendar.weekday);
        const open=(!loc.weekdaysOnly||!isWeekend)&&
          s.minute>=loc.open&&s.minute<loc.close;
        button(list,loc.label,current?'当前位置':
          (loc.scene?'已制作场景':'文字交互 · 美术待补')+
          ' · 移动'+(group==='家'?10:loc.travel)+'分钟',
          async()=>{const result=apply(()=>state.travel(id));if(result.ok)await afterTravel(id)},
          {disabled:current||!open,reason:current?'当前位置':'当前未开放',
            arrow:current?'●':'›'});
      }
      content.appendChild(list);
    }
  }
  function renderPeople(s){
    sectionTitle('联系与交往','NPC按地点、星期及时间出现。每天交流次数独立记录。');
    const list=h('div','daily-action-list');
    for(const [id,npc] of Object.entries(Core.NPCS)){
      const present=npc.location===s.location&&s.minute>=npc.from&&s.minute<npc.to&&
        (!npc.workdays||![0,6].includes(s.calendar.weekday));
      const met=(s.dailyUses['talk-'+id]||0)>0;
      button(list,npc.label,'关系 '+s.relationships[id]+
        ' · '+Core.LOCATIONS[npc.location].label+
        ' · '+String(Math.floor(npc.from/60)).padStart(2,'0')+':'+
        String(npc.from%60).padStart(2,'0')+'—'+
        String(Math.floor(npc.to/60)).padStart(2,'0')+':'+
        String(npc.to%60).padStart(2,'0'),
        ()=>apply(()=>state.talk(id)),
        {disabled:!present||met,reason:met?'今日已交流':'不在当前地点或时间'});
    }
    content.appendChild(list);
  }
  function renderNews(s){
    sectionTitle('城市新闻','随游戏日历与世界压力变化，公众认知从都市传说逐步走向公开危机。');
    line(content,'daily-news-stage',s.stageInfo.title,s.stageInfo.public);
    for(const [i,title] of s.news.entries()){
      const article=h('article','daily-news');
      article.appendChild(h('small','',i===0?'城市新闻':'社交与观察'));
      article.appendChild(h('h4','',title));
      article.appendChild(h('p','',i===0?s.stageInfo.note:
        '报道及网传内容并不等于已经查明的里世界真相。'));
      content.appendChild(article);
    }
    line(content,'daily-summary','世界压力 '+s.worldPressure,'此数值是当前世界演进的原型指标，非最终游戏平衡。');
  }
  function renderInventory(s){
    sectionTitle('随身物品','物品与金钱独立存档，饮食直接作用于现有饥饿HUD。');
    const list=h('div','daily-action-list');
    for(const [id,item] of Object.entries(Core.ITEM_META))
      button(list,item.label+' × '+(s.inventory[id]||0),'食用 · 饥饿 +'+item.hunger+
        ' · 花费10分钟',()=>apply(()=>state.use(id)),
        {disabled:!(s.inventory[id]>0),reason:'背包中没有'});
    content.appendChild(list);
    content.appendChild(h('p','daily-section-caption','继续购买食物请先前往便利店。'));
  }
  function renderJournal(s){
    sectionTitle('日记与结算','最近的日常行动、消费、出行和城市阶段变化。');
    for(const entry of [...s.log].reverse().slice(0,24)){
      const d=Core.dayDate(entry.day);
      line(content,'daily-log',
        (d.getUTCMonth()+1)+'月'+d.getUTCDate()+'日 '+
        String(Math.floor(entry.minute/60)).padStart(2,'0')+':'+
        String(entry.minute%60).padStart(2,'0'),entry.text);
    }
    content.appendChild(h('p','daily-section-caption','日常存档与原有场景对白、战斗测试、L2D数据分别保存。'));
    const resetButton=button(content,resetArmed?'确认清空日常存档':'重新开始日常模拟',
      '只重置本模块，不清除角色立绘、战斗或场景存档。',
      ()=>{
        if(!resetArmed){resetArmed=true;feedback.textContent='再点一次确认清空日常生活存档。';draw();return}
        resetArmed=false;state.reset();feedback.textContent='已重置生活存档。';
      },{arrow:'↺'});
    resetButton.classList.add('daily-reset');
  }
  function draw(){
    const s=state.snapshot();
    calendarEl.textContent=s.calendar.month+'月'+s.calendar.date+'日 '+s.calendar.weekdayLabel+' '+s.calendar.time;
    statsEl.replaceChildren();
    [['日数','DAY '+s.day],['现金','¥ '+s.money],
      ['精力',s.energy+'/100'],['知识',s.knowledge]].forEach(([label,val])=>{
        const div=h('div','daily-stat');div.appendChild(h('small','',label));
        div.appendChild(h('strong','',val));statsEl.appendChild(div);
      });
    locationEl.replaceChildren(
      h('span','',Core.LOCATIONS[s.location].label),
      h('span','',s.stageInfo.title));
    tabs.replaceChildren();
    for(const [id,label] of Object.entries(labels)){
      const item=h('button','daily-tab',label);item.type='button';
      item.dataset.current=String(tab===id);
      item.setAttribute('aria-pressed',String(tab===id));
      item.addEventListener('click',()=>{tab=id;resetArmed=false;feedback.textContent='';draw()});
      tabs.appendChild(item);
    }
    content.replaceChildren();content.scrollTop=0;
    if(tab==='schedule')renderSchedule(s);
    if(tab==='places')renderPlaces(s);
    if(tab==='people')renderPeople(s);
    if(tab==='news')renderNews(s);
    if(tab==='inventory')renderInventory(s);
    if(tab==='journal')renderJournal(s);
    panel.dataset.recalled=String(s.nightStatus==='recalled');
    refreshCity(s);
  }
  function open(requested){
    if(root.hidden)return false;
    mode=true;
    if(requested&&labels[requested])tab=requested;
    global.PaperWorldQuickTools?.close();
    const menu=document.getElementById('menu-choices');
    if(menu)menu.hidden=true;
    const toggle=document.getElementById('menu-toggle');
    toggle?.setAttribute('aria-expanded','false');
    panel.hidden=false;feedback.textContent='';draw();
    global.PaperWorldTopHUD?.refreshClock?.();return true;
  }
  function close(){panel.hidden=true;refreshCity(state.snapshot())}
  panel.querySelector('.daily-close').addEventListener('click',close);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!panel.hidden){event.preventDefault();close();}
  });
  for(const [id,view] of [['quick-map','places'],['quick-backpack','inventory']]){
    const control=document.getElementById(id);
    if(control)control.addEventListener('click',event=>{
      if(root.hidden)return;
      event.stopImmediatePropagation();event.preventDefault();
      if(!panel.hidden&&tab===view)close();else open(view);
    },true);
  }
  const onMenuBtn=document.getElementById('menu-daily-life');
  if(onMenuBtn)onMenuBtn.addEventListener('click',async()=>{
    const scene=document.getElementById('scene')?.dataset.scene;
    if(!HOME_SCENES.has(scene)){
      const ok=await global.PaperWorldDailyLifeScene?.('bedroom');
      if(!ok)return;
    }
    open('schedule');
  });
  const unsubscribe=state.subscribe(()=>{
    if(!panel.hidden)draw();else refreshCity(state.snapshot());
    if(mode)global.PaperWorldTopHUD?.refreshClock?.();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)state.persist()});
  global.addEventListener('pagehide',()=>state.persist());
  // The main scene router should call this when returning to the main menu.
  function onSceneChange(){if(root.hidden){
    panel.hidden=true;cityCover.hidden=true;mode=false;
    global.PaperWorldTopHUD?.refreshClock?.();
  }else refreshCity(state.snapshot())}
  const observer=new MutationObserver(onSceneChange);
  observer.observe(root,{attributes:true,attributeFilter:['hidden']});
  draw();
  function onGameScene(name){
    if(name==='menu'||(mode&&!HOME_SCENES.has(name))){
      panel.hidden=true;cityCover.hidden=true;mode=false;
      global.PaperWorldTopHUD?.refreshClock?.();
    }
  }
  global.PaperWorldDailyLifeUI=Object.freeze({
    open,close,onGameScene,isOpen:()=>!panel.hidden,isModeActive:()=>mode,snapshot:()=>state.snapshot(),
    engine:state,refresh:draw,dispose:()=>{unsubscribe();observer.disconnect()}
  });
})(window);
