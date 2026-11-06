/* Paperchalk World — immersive surface-world bridge.
 * Deliberately NO management panel, tabs, status cards, point ledger or
 * "today's life" popup. The city lives in the character's real phone; small
 * context hotspots stay in the illustrated scene. The simulation is hidden.
 */
(function(global){
  'use strict';
  const Core=global.PaperWorldDailyLife;
  if(!Core)return;
  const root=document.getElementById('novel-ui');
  const view=document.getElementById('view');
  const stage=document.getElementById('scene');
  if(!root||!view||!stage)return;
  const store=(()=>{try{return global.localStorage}catch(_){return null}})();
  const engine=Core.create({
    storage:store,
    onStatEvent:event=>global.PaperWorldTopHUD?.applyEvent?.(event)
  });
  let mode=false,hideTimer=null,traveling=false;
  const h=(tag,className,text)=>{
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(text!==undefined)el.textContent=String(text);
    return el;
  };
  const prompts=h('div','overworld-scene-prompts');
  prompts.id='overworld-scene-prompts';
  prompts.setAttribute('aria-label','场景互动');
  root.appendChild(prompts);
  const caption=h('div','overworld-scene-caption');
  caption.id='overworld-scene-caption';
  caption.hidden=true;
  caption.setAttribute('role','status');
  caption.setAttribute('aria-live','polite');
  root.appendChild(caption);
  // This is a location transition matte for UNILLUSTRATED city places.
  // It is not a second invented school image or a fake normal-room backdrop.
  const city=h('div','overworld-city-stage');
  city.id='overworld-city-stage';city.hidden=true;
  city.setAttribute('aria-label','尚未完成场景美术的城市地点');
  const cityLabel=h('span','overworld-city-label');
  city.appendChild(cityLabel);
  view.appendChild(city);
  const phone=global.PaperWorldQuickTools?.phone;
  function say(text){
    if(hideTimer)global.clearTimeout(hideTimer);
    caption.textContent=text;caption.hidden=false;
    hideTimer=global.setTimeout(()=>{caption.hidden=true},4100);
  }
  function openPhoneApp(name){
    if(!mode)return;
    if(!phone?.openApp){say('手机地图暂时打不开。');return}
    phone.openApp(name);
  }
  function run(fn,after=null){
    if(traveling)return;
    const result=fn();
    if(!result.ok){say(result.reason);return}
    say(result.message);
    if(after)after(result);
    draw();
  }
  async function travel(place){
    if(traveling)return {ok:false,reason:'正在前往目的地'};
    const dest=Core.LOCATIONS[place];
    if(!dest)return {ok:false,reason:'没有这个目的地'};
    const result=engine.travel(place);
    if(!result.ok){say(result.reason);return result}
    traveling=true;
    try{
      if(dest.scene){
        const changed=await global.PaperWorldDailyLifeScene?.(dest.scene);
        if(changed===false&&stage.dataset.scene!==dest.scene)
          say('场景美术加载失败，请从地图重试。');
      }
      draw();
      say('到达'+dest.label+'。');
      return result;
    }finally{traveling=false}
  }
  function addAction(label,action,fn){
    const button=h('button','overworld-scene-action',label);
    button.type='button';button.dataset.action=action;
    button.addEventListener('click',fn);
    prompts.appendChild(button);
  }
  function draw(){
    const s=engine.snapshot();
    const isCity=mode&&!root.hidden&&Core.LOCATIONS[s.location]?.group==='城区';
    city.hidden=!isCity;
    if(isCity){
      cityLabel.textContent=Core.LOCATIONS[s.location].label;
      city.dataset.location=s.location;
    }
    prompts.replaceChildren();
    prompts.hidden=!mode||root.hidden||s.nightStatus==='recalled';
    if(prompts.hidden)return;
    if(phone?.isOpen?.())prompts.hidden=true;
    // No persistent list of time, wealth, energy, relations or missions:
    // only two or three natural interactions in the current room.
    if(s.location==='bedroom'){
      if(s.day===1&&!s.homework.inspected)
        addAction('查看书包','bag',()=>run(()=>engine.inspectHomework()));
      addAction('去玄关','hall',()=>travel('entrance'));
    }else if(s.location==='living-room'){
      addAction('回卧室','bedroom',()=>travel('bedroom'));
      addAction('去玄关','hall',()=>travel('entrance'));
    }else if(s.location==='kitchen'){
      addAction('回卧室','bedroom',()=>travel('bedroom'));
      addAction('去玄关','hall',()=>travel('entrance'));
    }else if(s.location==='entrance'){
      addAction('出门','exit',()=>openPhoneApp('地图'));
      addAction('回卧室','bedroom',()=>travel('bedroom'));
    }else if(s.location==='school'){
      if(s.day===1&&!s.homework.handedIn){
        if(s.homework.status!=='finished')
          addAction('补完作业','homework',()=>run(()=>engine.finishHomework()));
        else addAction('交作业','submit',()=>run(()=>engine.submitHomework()));
      }
      addAction('找女二','female2',()=>run(()=>engine.talk('female2')));
      addAction('离开学校','exit',()=>openPhoneApp('地图'));
    }else if(s.location==='convenience'){
      addAction('买份简餐','buy-bread',()=>run(()=>engine.buy('bread')));
      addAction('看看地图','exit',()=>openPhoneApp('地图'));
    }else if(s.location==='cafe'){
      addAction('开始兼职','shift',()=>run(()=>engine.act('shift')));
      addAction('离开店里','exit',()=>openPhoneApp('地图'));
    }else if(s.location==='park'){
      addAction('散散步','walk',()=>run(()=>engine.act('exercise')));
      addAction('查看地图','exit',()=>openPhoneApp('地图'));
    }else if(s.location==='mall'){
      addAction('查看地图','exit',()=>openPhoneApp('地图'));
    }
  }
  function activate(){
    if(root.hidden)return false;
    mode=true;view.classList.add('overworld-life-active');
    draw();global.PaperWorldTopHUD?.refreshClock?.();
    phone?.refresh?.();return true;
  }
  function deactivate(){
    mode=false;
    prompts.hidden=true;city.hidden=true;caption.hidden=true;
    view.classList.remove('overworld-life-active');
    global.PaperWorldTopHUD?.refreshClock?.();
  }
  function onGameScene(name){
    if(name==='menu'||view.classList.contains('intro-waking')||
      (mode&&name!=='bedroom'&&name!=='living-room'&&
       name!=='kitchen'&&name!=='entrance')){
      deactivate();return;
    }
    draw();
  }
  function navigate(place){
    if(!mode)return {ok:false,reason:'尚未进入表世界'};
    if(traveling)return {ok:false,reason:'正在移动'};
    return travel(place);
  }
  // Keep the existing approved model of the protagonist's phone.
  phone?.configure?.({
    getNarrative:()=>engine.phoneInbox(),
    onPhoneRead:kind=>engine.markPhoneRead(kind),
    onPhoneReply:choice=>engine.replyHomework(choice),
    getMapState:()=>({state:engine.snapshot(),locations:Core.LOCATIONS}),
    onTravel:navigate,
    getInventory:()=>({
      state:engine.snapshot(),items:Core.ITEM_META
    }),
    onUseItem:id=>{
      const res=engine.use(id);
      if(res.ok)say(res.message);
      else say(res.reason);
      return res;
    }
  });
  function intercept(id,app){
    const button=document.getElementById(id);
    button?.addEventListener('click',event=>{
      if(!mode||root.hidden)return;
      event.preventDefault();event.stopImmediatePropagation();
      openPhoneApp(app);
    },true);
  }
  intercept('quick-map','地图');
  intercept('quick-backpack','背包');
  engine.subscribe(()=>{
    if(mode){
      draw();global.PaperWorldTopHUD?.refreshClock?.();
      phone?.refresh?.();
    }
  });
  // Existing dev or story scene-switch must not leave our caption behind.
  const watch=new MutationObserver(()=>{
    if(root.hidden&&mode)deactivate();
  });
  watch.observe(root,{attributes:true,attributeFilter:['hidden']});
  global.addEventListener('pagehide',()=>engine.persist());
  draw();
  global.PaperWorldDailyLifeUI=Object.freeze({
    activate,deactivate,onGameScene,
    snapshot:()=>engine.snapshot(),isModeActive:()=>mode,
    engine,navigate,showCaption:say
  });
})(window);
