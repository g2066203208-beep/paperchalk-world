import {CITY_DISTRICTS,BUS_STOPS,METRO_STATIONS,districtAt,nearbyTransit,transitDestinations} from '../world/CityLayout.mjs';

/** City navigation and transit UI. It deliberately has no jobs, rewards or needs. */
export function createCityExplorer({getPlayer,onPause,onResume,onTravel,onCancelTravel}){
  const events=new AbortController(),root=document.createElement('div');root.className='city-explorer';
  root.innerHTML=`<button class="city-map-button" type="button" aria-label="打开城市地图" aria-haspopup="dialog" aria-controls="cityExplorerDialog"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z M9 3v16 M15 5v16"/></svg> 城市地图 <kbd>M</kbd></button>
    <div class="city-navigation" hidden><span class="navigation-arrow">→</span><span class="navigation-text"></span><button type="button" aria-label="取消步行导航">×</button></div>
    <div class="city-district-arrival" aria-live="polite" hidden></div>
    <div class="city-explorer-overlay" hidden><section id="cityExplorerDialog" class="city-explorer-card" role="dialog" aria-modal="true" aria-labelledby="cityExplorerTitle"><header><div><p class="city-map-eyebrow">MOONLAMP CITY · 月灯市</p><h2 id="cityExplorerTitle"></h2><p class="city-map-intro"></p></div><button class="city-explorer-close" type="button" aria-label="关闭城市地图">×</button></header><div class="city-explorer-content"></div><footer></footer></section></div>
    <div class="city-ride-panel" hidden aria-live="polite"><div class="city-ride-heading"><span class="city-ride-mode"></span><strong class="city-ride-route"></strong><button type="button">返回出发站</button></div><div class="city-ride-track"><i></i></div><p class="city-ride-caption"></p></div>`;
  document.querySelector('.stage').appendChild(root);
  const $=s=>root.querySelector(s),overlay=$('.city-explorer-overlay'),content=$('.city-explorer-content');
  let opened=false,waypoint=null,lastDistrict='',arrivalTimer=0,riding=false,lastFocus=null;
  const visited=new Set();
  const listen=(el,type,fn)=>el.addEventListener(type,fn,{signal:events.signal});
  const coarsePointer=window.matchMedia('(any-pointer: coarse)'),backgroundInert=new Map();
  const touchDevice=/Android|iPhone|iPad|iPod|PaperchalkShell\//i.test(navigator.userAgent);
  let touch=touchDevice||coarsePointer.matches;
  function refreshInput(){
    touch=touchDevice||coarsePointer.matches;root.classList.toggle('city-touch',touch);
    $('.city-explorer-card footer').textContent=touch?'按住屏幕方向按钮行走 · 靠近接缝、人物或车站后，点右下角按钮交互':'方向键 / A D 步行 · E 与接缝、人物或车站交互 · M 地图';
  }
  listen(coarsePointer,'change',refreshInput);refreshInput();
  function setBackgroundInert(value){
    if(value){
      for(const element of [...root.parentElement.children,document.querySelector('.toolbar')]){
        if(!element||element===root)continue;
        backgroundInert.set(element,element.inert);element.inert=true;
      }
    }else{for(const [element,previous] of backgroundInert)element.inert=previous;backgroundInert.clear();}
  }
  function button(text,className,callback){const el=document.createElement('button');el.type='button';el.className=className;el.textContent=text;listen(el,'click',callback);return el;}
  function close(){
    if(!opened)return false;opened=false;overlay.hidden=true;document.body.classList.remove('city-explorer-open');
    setBackgroundInert(false);onResume();
    if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});else document.getElementById('viewport').focus({preventScroll:true});
    return true;
  }
  function open(title,intro){
    if(riding)return false;
    if(!opened){lastFocus=document.activeElement;opened=true;onPause();setBackgroundInert(true);}
    overlay.hidden=false;document.body.classList.add('city-explorer-open');
    $('#cityExplorerTitle').textContent=title;$('.city-map-intro').textContent=intro;content.replaceChildren();content.scrollTop=0;
    $('.city-explorer-close').focus({preventScroll:true});return true;
  }
  function navigate(place){waypoint={name:place.name,x:place.x};close();update(getPlayer().x);}
  function openMap(){
    const player=getPlayer(),current=districtAt(player.x),stop=nearbyTransit(player.x);
    if(!open('一座城市，慢慢走遍',`当前位置：${current.name} · 12 个城区 · 公交环城线 / 地铁月河线`))return;
    const summary=document.createElement('div');summary.className='city-map-summary';
    summary.textContent=stop?`你在${stop.kind==='metro'?'地铁':'公交'}站旁，可以选择目的地乘车。`:touch?'选择街区设置步行方向；走到站牌或地铁入口旁，点右下角的乘车按钮。':'选择街区设置步行方向；走到站牌或地铁入口旁，按 E 乘车。';
    if(stop)summary.appendChild(button('从本站乘车','city-small-action',()=>openTransit(stop)));
    content.appendChild(summary);
    const line=document.createElement('div');line.className='city-line-strip';
    for(const d of CITY_DISTRICTS){const dot=button(d.name,'city-line-stop'+(d.id===current.id?' current':''),()=>navigate(d));dot.style.setProperty('--district-color','#'+d.color.toString(16).padStart(6,'0'));line.appendChild(dot);}
    content.appendChild(line);
    const grid=document.createElement('div');grid.className='city-district-grid';
    for(const d of CITY_DISTRICTS){
      const card=document.createElement('article');card.className='city-district-card'+(d.id===current.id?' current':'');card.style.setProperty('--district-color','#'+d.color.toString(16).padStart(6,'0'));
      const metro=METRO_STATIONS.find(s=>s.districtId===d.id),bus=BUS_STOPS.find(s=>s.districtId===d.id);
      const number=document.createElement('span');number.className='city-district-number';number.textContent=String(d.index+1).padStart(2,'0');
      const title=document.createElement('h3');title.textContent=d.name;
      const desc=document.createElement('p');desc.textContent=d.description;
      const meta=document.createElement('small');meta.textContent=`${d.id===current.id?'你在这里':visited.has(d.id)?'已到访':'待探索'} · 公交${metro?' / 地铁':''}`;
      const actions=document.createElement('div');actions.className='city-district-actions';
      actions.append(button('街区导航','city-small-action',()=>navigate(d)),button(metro?'地铁入口 →':'公交站 →','city-small-action secondary',()=>navigate(metro??bus)));
      card.append(number,title,desc,meta,actions);grid.appendChild(card);
    }
    content.appendChild(grid);
  }
  function openTransit(stop=nearbyTransit(getPlayer().x)){
    if(!stop)return openMap();
    const metro=stop.kind==='metro';
    if(!open(`${stop.name} · ${metro?'地铁站':'公交站'}`,metro?'月河线 · 6 站连通城市东西两端':'01 路环城公交 · 12 个城区均可到达'))return;
    const info=document.createElement('p');info.className='city-transit-note';info.textContent=metro?'选择目的站，上车后可以看到地下车站和列车行驶。':'选择目的站，上车后沿街穿过不同城区。沿途车辆与行人在街上活动。';content.appendChild(info);
    const list=document.createElement('div');list.className='city-destination-list';
    for(const destination of transitDestinations(stop)){
      const index=(metro?METRO_STATIONS:BUS_STOPS).findIndex(s=>s.id===destination.id);
      const route=button('', 'city-destination',()=>{
        if(Math.abs(getPlayer().x-stop.x)>stop.radius+.2){close();return;}
        close();waypoint=null;onTravel(stop,destination);
      });
      const badge=document.createElement('span');badge.className='city-stop-badge';badge.textContent=metro?'M':String(index+1).padStart(2,'0');
      const label=document.createElement('strong');label.textContent=destination.name;
      const direction=document.createElement('span');direction.textContent=destination.x>stop.x?'向东 →':'← 向西';
      route.append(badge,label,direction);list.appendChild(route);
    }
    content.appendChild(list);
  }
  function update(x,ride=null){
    const d=districtAt(x);visited.add(d.id);
    if(d.id!==lastDistrict){
      if(lastDistrict&&!ride){const arrival=$('.city-district-arrival');arrival.textContent=d.name+' · '+d.description;arrival.hidden=false;clearTimeout(arrivalTimer);arrivalTimer=setTimeout(()=>arrival.hidden=true,3300);}
      lastDistrict=d.id;
    }
    riding=!!ride;$('.city-map-button').disabled=riding;$('.city-ride-panel').hidden=!riding;
    if(ride){
      $('.city-ride-mode').textContent=ride.kind==='metro'?'M 月河线':'01 环城公交';
      $('.city-ride-route').textContent=ride.fromName+' → '+ride.toName;
      $('.city-ride-track i').style.width=`${Math.max(0,Math.min(100,ride.progress*100))}%`;
      $('.city-ride-caption').textContent=ride.progress>.85?'即将到站，请准备下车':ride.kind==='metro'?'列车行进中 · 正在穿过地下线路':'沿城市街道行驶 · 目的站自动下车';
      $('.city-navigation').hidden=true;
    }else if(waypoint){
      const distance=Math.abs(waypoint.x-x);$('.city-navigation').hidden=false;
      $('.navigation-arrow').textContent=distance<4?'✓':waypoint.x>x?'→':'←';
      $('.navigation-text').textContent=distance<4?`已到达 ${waypoint.name}`:`${waypoint.name} · ${Math.round(distance)} m`;
    }else $('.city-navigation').hidden=true;
  }
  function handleKey(event){
    if(opened){
      if(event.key==='Escape'){event.preventDefault();close();return true;}
      if(event.key==='Tab'){
        const controls=[...overlay.querySelectorAll('button:not(:disabled)')],first=controls[0],last=controls.at(-1);
        if(!overlay.contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus();}
        else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
      return true;
    }
    if(event.code==='KeyM'&&!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.target?.closest?.('input,textarea,select,[contenteditable], [role="dialog"]')){event.preventDefault();openMap();return true;}
    return riding&&event.code==='KeyE';
  }
  listen($('.city-map-button'),'click',openMap);listen($('.city-explorer-close'),'click',close);
  listen(overlay,'click',e=>{if(e.target===overlay)close();});
  listen($('.city-navigation button'),'click',()=>{waypoint=null;update(getPlayer().x);});
  listen($('.city-ride-heading button'),'click',()=>onCancelTravel());
  return {openMap,openTransit,close,update,handleKey,get isOpen(){return opened;},dispose(){clearTimeout(arrivalTimer);events.abort();setBackgroundInert(false);document.body.classList.remove('city-explorer-open');root.remove();}};
}
