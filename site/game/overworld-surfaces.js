/* Paperchalk World — two on-demand world surfaces, never a persistent dashboard.
 * Physical backpack and folded city map are discrete diegetic surfaces.
 * Rendering is derived from the SINGLE authoritative saved life engine.
 */
(function(global){
  'use strict';
  function create({engine,onTravel,onBoard,onWorldTravel,onFeedback}){
    if(!engine||typeof engine.snapshot!=='function')throw Error('OverworldSurfaces requires saved state');
    const parent=document.getElementById('novel-ui');
    const locs=global.PaperWorldDailyLife.LOCATIONS;
    const meta=global.PaperWorldDailyLife.ITEM_META;
    const categories=global.PaperWorldDailyLife.CATEGORIES;
    const ICONS=Object.freeze({
      bread:'<path d="M4 11c-3-7 3-9 8-9s11 2 8 9l-2 10H6zM4 11h16M9 16v3M15 16v3"/>',
      water:'<path d="M9 3h6M10 5h4v3l4 4v8H6v-8l4-4zM7 14h10"/>',
      bandage:'<rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-30 12 12)"/><path d="m10 9 4 6M9 12h6"/>',
      keys:'<circle cx="7" cy="8" r="4"/><path d="M10 11l10 10m-4-4 3-3"/>',
      homework:'<path d="M6 2h12v20H6zM9 7h6M9 11h6M9 15h4"/>'
    });
    if(!parent)return null;
    const el=(tag,cls,txt)=>{
      const a=document.createElement(tag);
      if(cls)a.className=cls;
      if(txt!==undefined)a.textContent=String(txt);
      return a;
    };
    const root=el('div','pw-world-surface');
    root.id='pw-world-surface';root.hidden=true;
    const dim=el('div','pw-surface-dim');
    const frame=el('section','pw-surface-frame');
    frame.setAttribute('role','dialog');frame.setAttribute('aria-modal','true');frame.tabIndex=-1;
    const header=el('header','pw-surface-head');
    const heading=el('h2','pw-surface-heading');
    const right=el('div','pw-surface-right');
    const note=el('span','pw-surface-note');
    const close=el('button','pw-surface-close','×');
    close.type='button';close.setAttribute('aria-label','收起');
    right.append(note);header.append(heading,right);
    const body=el('div','pw-surface-body');
    const foot=el('div','pw-surface-foot');
    frame.append(header,body,foot);root.append(dim,frame);parent.appendChild(root);
    let mode='',choice=null,filter='all',busy=false,returnFocus=null;
    const get=()=>engine.snapshot();
    const text=(txt,error=false)=>{
      foot.textContent=txt||'';
      foot.dataset.warning=String(error);
      if(txt)onFeedback?.(txt);
    };
    function closeSurface(){
      root.hidden=true;mode='';busy=false;
      document.getElementById('view')?.classList.remove('overworld-surface-open');
      const node=returnFocus;returnFocus=null;
      if(node?.isConnected)node.focus({preventScroll:true});
    }
    dim.addEventListener('click',closeSurface);
    // World-space animated fog at all edges, already provided by the host.
    for(const edge of ['top','right','bottom','left']){
      const signal=el('span','pw-surface-fog-signal');
      signal.setAttribute('data-ui-fog-edge',edge);
      signal.setAttribute('aria-hidden','true');root.appendChild(signal);
    }
    document.addEventListener('keydown',event=>{
      if(root.hidden)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeSurface();}
    });
    function open(which){
      if(!['map','bag'].includes(which))return false;
      returnFocus=document.activeElement;
      mode=which;choice=null;filter='all';foot.textContent='';
      root.hidden=false;
      document.getElementById('view')?.classList.add('overworld-surface-open');
      draw();frame.focus({preventScroll:true});return true;
    }
    function button(label,fn,className,disabled=false){
      const b=el('button',className,label);
      b.type='button';b.disabled=disabled;
      if(fn)b.addEventListener('click',fn);
      return b;
    }
    function projectedCost(from,to){
      const a=locs[from],b=locs[to];
      if(!a||!b)return Infinity;
      if(a.group==='世界'||b.group==='世界'){
       const trip=global.PaperWorldDestinationNetwork?.journey(from,to);
       return trip?Math.max(3,trip.minutes):Infinity;
      }
      return a.group==='家'&&b.group==='家'?10:b.group==='家'?a.travel:b.travel;
    }
    function availability(id,s){
      const def=locs[id],dow=s.calendar.weekday,cost=projectedCost(s.location,id);
      if(id===s.location)return {ok:false,reason:'当前位置',cost};
      if(def.weekdaysOnly&&(dow===0||dow===6))
        return {ok:false,reason:'今天不开放',cost};
      if(s.minute<def.open||s.minute+cost>=def.close)
        return {ok:false,reason:'尚未开放或临近关门',cost};
      if(locs[s.location].group==='家'&&def.group==='城区'&&s.location!=='entrance')
        return {ok:false,reason:'先到玄关出门',cost};
      if(locs[s.location].group==='城区'&&def.group==='家'&&id!=='entrance')
        return {ok:false,reason:'回家须经玄关',cost};
      if(s.nightStatus==='recalled')return {ok:false,reason:'夜间召回已触发',cost};
      if(s.minute+cost>=1320)return {ok:false,reason:'今晚即将到22:00',cost};
      return {ok:true,reason:'可以前往',cost};
    }
    function drawMap(){
      const s=get(),graph=global.PaperWorldMetro;
      frame.dataset.view='travel';frame.removeAttribute('data-map-mode');
      heading.textContent='出行';note.textContent=s.calendar.time;
      foot.textContent='选择目的地';
      const panel=el('div','pw-travel-destinations');
      panel.appendChild(el('p','pw-travel-intro','前往其他地点'));
      const anchor=graph?.STATIONS?.[s.location]||graph?.STATIONS?.entrance;
      const nearby=Object.entries(graph?.STATIONS||{})
        .filter(([id,stop])=>!stop.locked&&Object.hasOwn(locs,id))
        .sort(([a,aa],[b,bb])=>Math.hypot((aa.gx??0)-(anchor?.gx??0),(aa.gy??0)-(anchor?.gy??0))
           -Math.hypot((bb.gx??0)-(anchor?.gx??0),(bb.gy??0)-(anchor?.gy??0))||a.localeCompare(b))
        .slice(0,7).map(([id])=>id);
      for(const id of [...new Set(['entrance','school','classmate-home',...nearby])]){
        const dest=locs[id];if(!dest)continue;
        const status=availability(id,s);
        panel.appendChild(button(dest.label+(status.ok?' · '+status.cost+' 分钟':' · '+status.reason),
          async()=>{if(busy)return;busy=true;closeSurface();
            const result=await onTravel?.(id);
            if(!result?.ok&&result?.reason)onFeedback?.(result.reason);},
          'pw-travel-destination',!status.ok));
      }
      if(graph?.STATIONS?.[s.location]&&!s.metro?.onboard){
        panel.appendChild(el('p','pw-travel-intro','乘车'));
        for(const line of graph.LINES||[]){
          if(line.locked||!line.stops.includes(s.location))continue;
          for(const dir of [-1,1]){
            const next=graph.neighbors(line,s.location).find(n=>n.direction===dir);
            if(next)panel.appendChild(button(line.name+' · 开往 '+(graph.STATIONS[next.to]?.label||next.to),
              ()=>{closeSurface();onBoard?.(line.id,dir)},'pw-travel-destination'));
          }
        }
      }
      body.replaceChildren(panel);
    }
    function drawBag(){
      const s=get(),items=Object.entries(meta).filter(([key,m])=>
        (s.inventory[key]||0)>0&&(filter==='all'||m.category===filter));
      heading.textContent='背包';
      note.textContent='¥ '+s.money;
      frame.dataset.view='bag';
      const left=el('div','pw-bag-left');
      const tabs=el('div','pw-bag-tabs');
      for(const [key,name] of Object.entries(categories)){
        const t=button(name,()=>{filter=key;choice=null;draw()},'pw-bag-tab');
        t.dataset.active=String(filter===key);
        tabs.appendChild(t);
      }
      const grid=el('div','pw-item-grid');
      for(const [id,item] of items){
        const b=button('',()=>{choice=id;draw()},'pw-item');
        b.dataset.item=id;b.dataset.active=String(choice===id);
        const icon=el('span','pw-item-symbol');
        icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '+
          'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
          (ICONS[id]||'<circle cx="12" cy="12" r="9"/>')+'</svg>';
        const label=el('span','pw-item-name',item.label);
        const qty=el('span','pw-item-quantity','×'+s.inventory[id]);
        b.append(icon,label,qty);grid.appendChild(b);
      }
      if(!items.length)grid.appendChild(el('p','pw-empty-items','这个分类还没有物品。'));
      left.append(tabs,grid);
      const detail=el('aside','pw-item-detail');
      if(choice&&meta[choice]&&(s.inventory[choice]||0)>0){
        const item=meta[choice];
        detail.appendChild(el('small','','随身物品 · '+(categories[item.category]||'物品')));
        detail.appendChild(el('h3','',item.label));
        detail.appendChild(el('p','pw-item-description',item.description));
        detail.appendChild(el('p','pw-item-qty','持有数量 '+s.inventory[choice]+
          (item.category==='consumable'?' / 上限 '+item.stackMax:'')));
        if(item.effect){
          const use=button('使用',()=>{
            const res=engine.use(choice);
            text(res.ok?res.message:res.reason,!res.ok);
            if(res.ok&&!(engine.snapshot().inventory[choice]||0))choice=null;
            draw();
          },'pw-item-use');
          detail.appendChild(use);
        }else{
          detail.appendChild(el('p','pw-item-important','重要物品 · 不能随意消耗'));
        }
      }else{
        detail.appendChild(el('p','pw-item-hint','查看随身携带的物品，选择后阅读说明或使用。'));
      }
      body.replaceChildren(left,detail);
    }
    function draw(){
      if(root.hidden)return;
      if(mode==='map')drawMap();
      else if(mode==='bag')drawBag();
    }
    const unsub=engine.subscribe(()=>{if(!root.hidden)draw()});
    return Object.freeze({openMap:()=>open('map'),openBag:()=>open('bag'),
      close:closeSurface,
      isOpen:()=>!root.hidden,getMode:()=>mode,
      refresh:draw,dispose:()=>{unsub();root.remove()}});
  }
  global.PaperWorldOverworldSurfaces=Object.freeze({create});
})(window);
