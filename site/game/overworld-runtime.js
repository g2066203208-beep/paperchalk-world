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
  let mode=false,hideTimer=null,traveling=false,contextOpen=false,suppressContextTapUntil=0;
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
  // Passenger view owns the transition while the map is already closed.
  const transit=h('section','pw-transit-scene');
  transit.id='pw-transit-scene';transit.hidden=true;
  transit.setAttribute('role','dialog');transit.setAttribute('aria-label','列车途中');
  transit.innerHTML='<div class="pw-train-window" aria-hidden="true"><i></i><i></i><i></i></div>'+
    '<div class="pw-transit-header"><span class="pw-transit-line"></span>'+
    '<span class="pw-transit-stops"></span></div>'+
    '<div class="pw-transit-passengers" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>'+
    '<div class="pw-transit-conversation"><small class="pw-transit-speaker"></small>'+
    '<p class="pw-transit-words"></p><div class="pw-transit-progress"></div></div>'+
    '<button type="button" class="pw-transit-next" aria-label="继续车厢对话">继续 ›</button>';
  root.appendChild(transit);
  const director=global.PaperWorldOverworldDirector?.create?.({root})||null;
  const cabin=global.PaperWorldMetroCabin?.create?.({
    root,engine,onExit:exitFromMetro,onFeedback:message=>say(message)
  })||null;
  const surfaces=global.PaperWorldOverworldSurfaces?.create?.({
    engine,onTravel:(place,route)=>travel(place,route),
    onWorldTravel:(place,route)=>regionalTravel(place,route),
    onBoard:(lineId,direction)=>boardMetro(lineId,direction),
    onFeedback:message=>say(message)
  })||null;
  // Route all authored locations (including future atlas POIs) through the
  // SAME auto-generated scene registry, transition, image stage and realtime fog.
  // Unillustrated locations alone use the temporary city backdrop.
  function resolvedScene(place){
    const def=Core.LOCATIONS[place];
    if(!def)return null;
    const registered=global.PaperWorldSceneRegistry;
    const id=registered?.[place]?place:def.scene;
    return id&&registered?.[id]?id:null;
  }
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
    contextOpen=false;prompts.hidden=true;
    const result=fn();
    if(!result.ok){say(result.reason);return}
    say(result.message);
    if(after)after(result);
    draw();
  }
  let endTransit=null;
  function presentTransit(route,snapshot){
    const metro=global.PaperWorldMetro;
    if(!metro||!route?.segments?.length)return Promise.resolve();
    const dialogue=metro.conversation(snapshot,route);
    const slides=[];
    slides.push({speaker:'列车广播',
      text:route.lines.join(' / ')+' · '+route.connections+' 站 · '+(route.transfers.length?'需要换乘':'直达')});
    for(const turn of dialogue.slice(0,2))slides.push(turn);
    for(const at of route.transfers){
      slides.push({speaker:'站内广播',
        text:'中央换乘站到了。请前往另一条线路的站台换乘。',transfer:at});
    }
    slides.push(dialogue[2]);
    const text=transit.querySelector('.pw-transit-words');
    const speaker=transit.querySelector('.pw-transit-speaker');
    const progress=transit.querySelector('.pw-transit-progress');
    const next=transit.querySelector('.pw-transit-next');
    transit.querySelector('.pw-transit-line').textContent=route.lines.join('  /  ');
    transit.querySelector('.pw-transit-stops').textContent=
      route.stops.map(id=>metro.STATIONS[id]?.label||global.PaperWorldAtlas?.CITY_BY_ID?.[id]?.name||id).join('  ·  ');
    transit.hidden=false;
    view.classList.add('pw-traveling');
    contextOpen=false;prompts.hidden=true;
    return new Promise(resolve=>{
      let index=0,timer=0,done=false;
      const finish=()=>{
        if(done)return;done=true;
        clearTimeout(timer);next.removeEventListener('click',advance);
        transit.removeEventListener('click',onStageClick);
        endTransit=null;resolve();
      };
      const show=()=>{
        const slide=slides[index];
        speaker.textContent=slide.speaker;
        text.textContent=slide.text;
        progress.textContent=(index+1)+' / '+slides.length;
        transit.dataset.transfer=String(!!slide.transfer);
        next.textContent=index===slides.length-1?'到站 ›':'继续 ›';
        if(index>0&&index<=2){
          engine.recordTransitRumor?.(
            'train-'+snapshot.day+'-'+route.from+'-'+route.to+'-'+index,
            slide.speaker+'：'+slide.text);
        }
        clearTimeout(timer);
        timer=setTimeout(advance,slide.transfer?2800:3600);
      };
      const advance=()=>{
        if(done)return;
        if(index+1>=slides.length){finish();return}
        index++;show();
      };
      const onStageClick=e=>{
        if(e.target.closest('button'))return;
        advance();
      };
      next.addEventListener('click',advance);
      transit.addEventListener('click',onStageClick);
      endTransit=finish;
      show();
    });
  }
  async function exitFromMetro(station){
    const dest=Core.LOCATIONS[station];
    if(!dest)return;
    const scene=resolvedScene(station);
    if(scene){
      const result=await global.PaperWorldDailyLifeScene?.(scene);
      if(result===false&&stage.dataset.scene!==scene)
        say('场景未能加载，请重试。');
    }
    paintedCity='';draw();
    if(dest.group==='城区'&&director){
      global.setTimeout(()=>{if(mode)director.playLocation(station,engine.snapshot())},400);
    }
  }
  async function boardMetro(lineId,direction){
    if(traveling||!mode)return {ok:false,reason:'当前无法乘车'};
    surfaces?.close?.();
    const result=engine.metroBoard(lineId,direction);
    if(result.ok){
      contextOpen=false;prompts.hidden=true;
      cabin?.open();draw();
    }else say(result.reason);
    return result;
  }
  async function regionalTravel(place,route){
    // World travel is a genuine dated journey with an intercity route cost,
    // not an immediate jump to a map marker.
    if(!route)return {ok:false,reason:'此地点尚未接入公共交通'};
    return travel(place,null,route);
  }
  async function travel(place,route=null,regionalRoute=null){
    if(traveling)return {ok:false,reason:'正在前往目的地'};
    const dest=Core.LOCATIONS[place];
    if(!dest)return {ok:false,reason:'没有这个目的地'};
    const previous=engine.snapshot();
    traveling=true;
    contextOpen=false;prompts.hidden=true;
    // Close world surface BEFORE engine.travel() emits state notifications.
    // The old order redrew the map above the new scene and caused flashes.
    surfaces?.close?.();
    try{
      // A selected photo uses precisely the same physical train as clicking a
      // line, not the old flat passenger-shadow transition.
      if(route?.segments?.length&&route.from===previous.location&&cabin){
        const first=route.segments[0];
        const dir=global.PaperWorldMetro.neighbors(first.line,route.from)
          .find(x=>x.to===first.to)?.direction;
        if(!dir)return {ok:false,reason:'交通线路方向不可达'};
        const boarded=engine.metroBoard(first.line.id,dir);
        if(!boarded.ok)return boarded;
        const journey=await cabin.playRoute(route);
        if(!journey.ok)say(journey.reason||'列车运行受阻');
        return journey;
      }
      const result=engine.travel(place);
      if(!result.ok){say(result.reason);return result}
      if(regionalRoute?.legs?.length){
        // Intercity rail has a real side-view cabin, not a jump from map to photo.
        // Bus/ferry journeys use the route-specific travel matte, never a subway.
        const rail=regionalRoute.legs.every(leg=>
          ['regional','localrail'].includes(leg.line?.mode));
        if(rail&&cabin?.playRegionalJourney)
          await cabin.playRegionalJourney(regionalRoute);
        else await presentTransit({
          from:previous.location,to:place,
          segments:regionalRoute.legs,connections:regionalRoute.legs.length,
          transfers:[],lines:[...new Set(regionalRoute.legs.map(leg=>leg.line.name))],
          stops:[regionalRoute.legs[0].from,
            ...regionalRoute.legs.map(leg=>leg.to)]
        },previous);
      }else if(route?.segments?.length&&
          (Core.LOCATIONS[previous.location]?.group==='城区'||dest.group==='城区'))
        await presentTransit(route,previous);
      // Keep the train matte over the scene until scene swap completes.
      const scene=resolvedScene(place);
      if(scene){
        const changed=await global.PaperWorldDailyLifeScene?.(scene);
        if(changed===false&&stage.dataset.scene!==scene)
          say('场景加载失败；请从地图重试。');
      }
      paintedCity='';draw();
      say('到达'+dest.label+'。');
      if(dest.group==='城区'&&director)
        global.setTimeout(()=>{if(mode)director.playLocation(place,engine.snapshot())},380);
      return result;
    }finally{
      endTransit?.();endTransit=null;
      transit.hidden=true;view.classList.remove('pw-traveling');
      traveling=false;draw();
    }
  }
  function addAction(label,action,fn){
    const button=h('button','overworld-scene-action',label);
    button.type='button';button.dataset.action=action;
    button.addEventListener('click',fn);
    prompts.appendChild(button);
  }
  function draw(){
    const s=engine.snapshot();
    const worldPoi=global.PaperWorldAtlas?.POI_BY_ID?.[s.location];
    const isCity=mode&&!root.hidden&&
      ['城区','世界'].includes(Core.LOCATIONS[s.location]?.group)&&
      !resolvedScene(s.location);
    city.hidden=!isCity;
    if(isCity&&!traveling){
      const signature=s.location+'/'+Math.floor(s.minute/60);
      if(signature!==paintedCity){
        if(worldPoi){
          const photo=global.PaperWorldAtlas?.PHOTOS?.[worldPoi.photo]||
            global.PaperWorldAtlas?.PHOTOS?.street;
          cityArt.replaceChildren();
          const image=document.createElement('img');
          image.className='pw-world-preview-image';
          image.alt='';image.decoding='async';
          image.src=photo?.url||'';
          const text=document.createElement('span');
          text.className='pw-world-preview-label';
          text.textContent=worldPoi.name;
          const subtitle=document.createElement('small');
          subtitle.className='pw-world-preview-subtitle';
          subtitle.textContent=global.PaperWorldAtlas?.CITY_BY_ID?.[worldPoi.city]?.name||'';
          cityArt.append(image,text,subtitle);
          city.dataset.worldScene='true';
        }else{
          cityArt.innerHTML=global.PaperWorldCityScenes?.markup?.(s.location,s.minute)||'';
          city.dataset.worldScene='false';
        }
        city.dataset.location=s.location;
        paintedCity=signature;
      }
    }
    prompts.replaceChildren();
    const available=mode&&!root.hidden&&s.nightStatus!=='recalled';
    prompts.hidden=!available||!contextOpen||traveling||phone?.isOpen?.()||
      surfaces?.isOpen?.()||cabin?.isOpen?.();
    if(!available)return;
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
  // No permanent bottom-right menu. In-world click/tap reveals a tiny
  // transient contextual list where the player actually touched the scene.
  view.addEventListener('click',event=>{
    if(!mode||traveling||root.hidden||phone?.isOpen?.()||surfaces?.isOpen?.()||
       cabin?.isOpen?.()||!transit.hidden)return;
    if(performance.now()<suppressContextTapUntil)return;
    if(event.target.closest('button,#novel-ui,#dev-tools,#dev-stage,#scene-menu'))return;
    if(event.target.closest('#pw-world-director'))return;
    const rect=view.getBoundingClientRect();
    const px=Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width)));
    const py=Math.max(0,Math.min(1,(event.clientY-rect.top)/Math.max(1,rect.height)));
    contextOpen=!contextOpen;
    prompts.style.left=(Math.min(.73,Math.max(.035,px)) * 100)+'%';
    prompts.style.top=(Math.min(.63,Math.max(.09,py)) * 100)+'%';
    draw();
  });
    function activate(){
    if(root.hidden)return false;
    mode=true;contextOpen=false;view.classList.add('overworld-life-active');
    if(engine.snapshot().metro?.onboard)cabin?.open();
    draw();global.PaperWorldTopHUD?.refreshClock?.();
    phone?.refresh?.();return true;
  }
  function deactivate(){
    mode=false;contextOpen=false;endTransit?.();endTransit=null;
    cabin?.close();
    transit.hidden=true;view.classList.remove('pw-traveling','overworld-phone-open');
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
    onSendMessage:(to,msg)=>engine.sendPhoneMessage(to,msg),
    onPhoneCall:(to,video)=>engine.phoneCall(to,video),
    onTakePhoto:data=>engine.addPhonePhoto(data),
    onPublishPost:(text,photo)=>engine.publishSocial(text,photo),
    getPhoneWorld:()=>engine.snapshot(),
    onPhoneReply:choice=>engine.replyHomework(choice),
    getContacts:()=>{
      const saved=engine.snapshot();
      // Contacts appear when the protagonist actually knows a person.
      const contacts=[{
        id:'female2',display:'女二',note:'学校同学',
        relationship:'同学 · 熟悉',affinity:saved.relationships.female2,
        bio:'早上连续打来电话提醒交作业。平时经常保持联系。',
        chatAvailable:true
      }];
      const discoveries=[
        ['classmate','同班同学','学校','同学 · 初识',
          '同班的同学，课间经常会讨论学校发生的事。'],
        ['clerk','便利店店员','便利店','认识的人',
          '在附近便利店工作的店员，对街区消息很敏感。'],
        ['neighbor','邻居','住宅区','邻里关系',
          '住在附近的邻居，经常在公园里碰到。']
      ];
      for(const [id,display,note,relationship,bio] of discoveries){
        const affinity=saved.relationships[id]||0;
        if(affinity>0)contacts.push({id,display,note,relationship,bio,
          affinity,chatAvailable:true});
      }
      return contacts;
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
    view.classList.toggle('overworld-phone-open',!!phone?.isOpen?.());
    contextOpen=false;prompts.hidden=true;
    suppressContextTapUntil=performance.now()+280;
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
    engine,navigate,showCaption:say,surfaces,director,cabin
  });
})(window);
