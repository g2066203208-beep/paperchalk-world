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
  const cityArt=h('div','overworld-city-art');
  city.appendChild(cityArt);
  view.appendChild(city);
  const director=global.PaperWorldOverworldDirector?.create?.({root})||null;
  const surfaces=global.PaperWorldOverworldSurfaces?.create?.({
    engine,onTravel:place=>travel(place),onFeedback:message=>say(message)
  })||null;
  let paintedCity='',cityTime=-1;
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
    const current=engine.snapshot();
    traveling=true;
    const result=engine.travel(place);
    if(!result.ok){traveling=false;say(result.reason);return result}
    try{
      const swap=async()=>{
        if(dest.scene){
          const changed=await global.PaperWorldDailyLifeScene?.(dest.scene);
          if(changed===false&&stage.dataset.scene!==dest.scene)
            say('场景加载失败；请从地图重试。');
        }
        paintedCity='';draw();
      };
      // The host's existing scene transition owns the fade and source image.
      // Avoid layering another full-screen fade or fake home backdrop.
      await swap();
      say('到达'+dest.label+'。');
      if(dest.group==='城区'&&director)
        global.setTimeout(()=>{if(mode)director.playLocation(place,engine.snapshot())},260);
      return result;
    }finally{traveling=false;draw()}
  }
  function addAction(label,action,fn){
    const button=h('button','overworld-scene-action',label);
    button.type='button';button.dataset.action=action;
    button.addEventListener('click',fn);
    prompts.appendChild(button);
  }
  function draw(){
    const s=engine.snapshot();
    const isCity=mode&&!root.hidden&&
      Core.LOCATIONS[s.location]?.group==='城区'&&!Core.LOCATIONS[s.location]?.scene;
    city.hidden=!isCity;
    if(isCity&&!traveling){
      const signature=s.location+'/'+Math.floor(s.minute/60);
      if(signature!==paintedCity){
        cityArt.innerHTML=global.PaperWorldCityScenes?.markup?.(s.location,s.minute)||'';
        city.dataset.location=s.location;
        paintedCity=signature;
      }
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
      addAction('出门','exit',()=>surfaces?.openMap());
      addAction('回卧室','bedroom',()=>travel('bedroom'));
    }else if(s.location==='school'){
      if(s.day===1&&!s.homework.handedIn){
        if(s.homework.status!=='finished')
          addAction('补完作业','homework',()=>run(()=>engine.finishHomework()));
        else addAction('交作业','submit',()=>run(()=>engine.submitHomework()));
      }
      addAction('找女二','female2',()=>run(()=>engine.talk('female2'),res=>{
        director?.playSocial(res.message);
      }));
      addAction('离开学校','exit',()=>surfaces?.openMap());
    }else if(s.location==='convenience'){
      addAction('看看货架','shop',()=>surfaces?.openShop());
      addAction('离开便利店','exit',()=>surfaces?.openMap());
    }else if(s.location==='cafe'){
      addAction('开始兼职','shift',()=>run(()=>engine.act('shift')));
      addAction('离开店里','exit',()=>surfaces?.openMap());
    }else if(s.location==='park'){
      addAction('散散步','walk',()=>run(()=>engine.act('exercise')));
      addAction('查看地图','exit',()=>surfaces?.openMap());
    }else if(s.location==='mall'){
      addAction('进入商店','shop',()=>surfaces?.openShop());
      addAction('离开商场','exit',()=>surfaces?.openMap());
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
    director?.close?.();surfaces?.close?.();
    view.classList.remove('overworld-life-active');
    global.PaperWorldTopHUD?.refreshClock?.();
  }
  function onGameScene(name){
    if(name==='menu'||view.classList.contains('intro-waking')||
      (mode&&!Object.hasOwn(Core.LOCATIONS,name))){
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
    getContacts:()=>{
      const saved=engine.snapshot();
      // Phone book contains actual known contacts, not every stranger/NPC.
      // Female two's approved real name and biography are not yet confirmed.
      return [{
        id:'female2',display:'女二',note:'学校同学',
        relationship:'同学 · 熟悉',
        affinity:saved.relationships.female2,
        bio:'在学校等你，早上连续打来电话提醒交作业。',
        chatAvailable:true
      }];
    },
    getMemo:()=>{
      const s=engine.snapshot();
      if(s.day===1&&!s.homework.handedIn){
        return {title:'今天 · 作业',
          text:s.homework.status==='finished'?
            '作业已经补完。上午第一节课前交给老师。':
            '作业还差最后一页。女二说早点到学校一起补。'};
      }
      return {title:'今天',text:'没有必须完成的待办。可以照自己的安排生活。'};
    },
    getStatus:()=>{
      const current=engine.snapshot(),survival=global.PaperWorldTopHUD?.snapshot?.();
      return {money:current.money,energy:current.energy,
        stats:survival?.stats||null};
    },
    getMapState:()=>({state:engine.snapshot(),locations:Core.LOCATIONS}),
    onOpenMap:()=>{phone?.close?.();surfaces?.openMap?.();},
    onOpenBag:()=>{phone?.close?.();surfaces?.openBag?.();},
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
  function intercept(id,opener){
    const button=document.getElementById(id);
    button?.addEventListener('click',event=>{
      if(!mode||root.hidden)return;
      event.preventDefault();event.stopImmediatePropagation();
      opener();
    },true);
  }
  intercept('quick-map',()=>surfaces?.openMap?.());
  intercept('quick-backpack',()=>surfaces?.openBag?.());
  global.addEventListener('paperchalk:phone-visibility',()=>{
    if(mode)draw();
  });
  engine.subscribe(()=>{
    if(mode){
      draw();global.PaperWorldTopHUD?.refreshClock?.();
      phone?.refresh?.();
      surfaces?.refresh?.();
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
    engine,navigate,showCaption:say,surfaces,director
  });
})(window);
