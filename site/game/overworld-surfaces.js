/* Paperchalk World — two on-demand world surfaces, never a persistent dashboard.
 * Physical backpack and folded city map are discrete diegetic surfaces.
 * Rendering is derived from the SINGLE authoritative saved life engine.
 */
(function(global){
  'use strict';
  function create({engine,onTravel,onFeedback}){
    if(!engine||typeof engine.snapshot!=='function')throw Error('OverworldSurfaces requires saved state');
    const parent=document.getElementById('novel-ui');
    const locs=global.PaperWorldDailyLife.LOCATIONS;
    const meta=global.PaperWorldDailyLife.ITEM_META;
    const categories=global.PaperWorldDailyLife.CATEGORIES;
    const stock=global.PaperWorldDailyLife.STORE_ITEMS;
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
    frame.setAttribute('role','dialog');frame.setAttribute('aria-modal','true');
    const header=el('header','pw-surface-head');
    const heading=el('h2','pw-surface-heading');
    const right=el('div','pw-surface-right');
    const note=el('span','pw-surface-note');
    const close=el('button','pw-surface-close','×');
    close.type='button';close.setAttribute('aria-label','收起');
    right.append(note,close);header.append(heading,right);
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
    close.addEventListener('click',closeSurface);
    document.addEventListener('keydown',event=>{
      if(root.hidden)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeSurface();}
    });
    function open(which){
      if(!['map','bag','shop'].includes(which))return false;
      returnFocus=document.activeElement;
      mode=which;choice=null;filter='all';foot.textContent='';
      root.hidden=false;
      document.getElementById('view')?.classList.add('overworld-surface-open');
      draw();close.focus({preventScroll:true});return true;
    }
    function button(label,fn,className,disabled=false){
      const b=el('button',className,label);
      b.type='button';b.disabled=disabled;
      if(fn)b.addEventListener('click',fn);
      return b;
    }
    const pinData=Object.freeze([
      ['entrance','家',15,74],['school','学校',32,22],
      ['convenience','便利店',53,54],['cafe','咖啡店',36,78],
      ['mall','商场',81,31],['park','公园',80,76]
    ]);
    function projectedCost(from,to){
      const a=locs[from],b=locs[to];
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
      const s=get();heading.textContent='城区地图';
      note.textContent=s.calendar.month+'月'+s.calendar.date+'日 '+s.calendar.time;
      frame.dataset.view='map';
      const left=el('div','pw-map-drawing');
      left.innerHTML='<svg viewBox="0 0 900 610" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'+
        '<defs><pattern id="pwmapblock" width="104" height="84" patternUnits="userSpaceOnUse"><path d="M12 12h78v60H12z" fill="#636c69" opacity=".16" stroke="#b5beb4" stroke-opacity=".21"/></pattern>'+
        '<pattern id="pwmapnoise" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="6" cy="8" r=".8" fill="#c7c9bb" opacity=".3"/></pattern></defs>'+
        '<rect width="900" height="610" fill="#35413f"/><rect width="900" height="610" fill="url(#pwmapblock)"/>'+
        '<path d="M0 150L180 188L436 116L648 192L900 137 M0 430L170 337L430 370L684 287L900 420 M120 0L194 178L181 322L125 610 M455 0L436 121L437 370L457 610 M775 0L672 190L684 288L769 610" fill="none" stroke="#92998d" stroke-width="35" stroke-linecap="round" stroke-linejoin="round"/>'+
        '<path d="M0 150L180 188L436 116L648 192L900 137 M0 430L170 337L430 370L684 287L900 420 M120 0L194 178L181 322L125 610 M455 0L436 121L437 370L457 610 M775 0L672 190L684 288L769 610" fill="none" stroke="#dde0d1" stroke-opacity=".4" stroke-width="2" stroke-dasharray="16 18"/>'+
        '<path d="M520 0L530 610" fill="none" stroke="#556d71" stroke-width="40" opacity=".52"/>'+
        '<path d="M520 0L530 610" fill="none" stroke="#a2aba8" stroke-width="2" opacity=".6"/>'+
        '<path d="M0 535Q150 471 270 537T550 530T900 515" fill="none" stroke="#526e58" stroke-width="72" opacity=".6"/>'+
        '<rect width="900" height="610" fill="url(#pwmapnoise)"/></svg>';
      const coordinate=el('span','pw-map-caption','城区路线示意 · 非实景导航');
      left.appendChild(coordinate);
      for(const [id,name,x,y] of pinData){
        const state=availability(id,s);
        const b=button('',()=>{choice=id;draw()},'pw-map-pin');
        b.style.left=x+'%';b.style.top=y+'%';b.dataset.place=id;
        b.dataset.active=String(choice===id);
        b.dataset.current=String(s.location===id);
        // Always show non-open pins; explain why instead of hiding them.
        const dot=el('span','pw-pin-dot','');
        const label=el('span','pw-pin-label',name);
        b.append(dot,label);left.appendChild(b);
      }
      const detail=el('aside','pw-map-detail');
      const head=el('div','pw-detail-top');
      head.appendChild(el('small','','当前位置'));
      head.appendChild(el('strong','',locs[s.location].label));
      detail.appendChild(head);
      detail.appendChild(el('p','pw-detail-help',
        '选择地图上的地点，查看路程与开放状态。出门经过玄关，时间按游戏日历结算。'));
      if(choice){
        const a=availability(choice,s),def=locs[choice];
        const card=el('div','pw-map-select');
        card.appendChild(el('small','','已选地点'));
        card.appendChild(el('h3','',def.label));
        const hrs=String(Math.floor(def.open/60)).padStart(2,'0')+':'+
          String(def.open%60).padStart(2,'0')+'—'+
          String(Math.floor(def.close/60)).padStart(2,'0')+':'+
          String(def.close%60).padStart(2,'0');
        card.appendChild(el('p','',a.reason));
        card.appendChild(el('p','',def.group==='家'?'住所室内':('营业／开放 '+hrs)));
        card.appendChild(el('p','', '路程约 '+a.cost+' 分钟'));
        const go=button('前往 '+def.label,async()=>{
          if(busy)return;
          busy=true;
          const response=await onTravel?.(choice);
          busy=false;
          if(response?.ok)closeSurface();
          else{
            text(response?.reason||'无法抵达目的地',true);
            draw();
          }
        },'pw-map-depart',!a.ok);
        card.appendChild(go);detail.appendChild(card);
      }else{
        detail.appendChild(el('p','pw-map-empty','选中目的地后再决定是否前往。'));
      }
      body.replaceChildren(left,detail);
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
    function drawShop(){
      const s=get(),here=s.location,ids=stock[here]||[];
      heading.textContent=here==='mall'?'商场用品店':'便利店货架';
      note.textContent='现金 ¥ '+s.money;frame.dataset.view='shop';
      const left=el('div','pw-shop-list');
      for(const id of ids){
        const item=meta[id];
        const row=button('',()=>{choice=id;draw()},'pw-shop-row');
        row.dataset.item=id;row.dataset.active=String(choice===id);
        row.append(el('strong','',item.label),el('span','','¥'+item.price));
        left.appendChild(row);
      }
      const detail=el('aside','pw-item-detail');
      if(choice&&ids.includes(choice)){
        const item=meta[choice];
        detail.appendChild(el('small','','店内商品'));
        detail.appendChild(el('h3','',item.label));
        detail.appendChild(el('p','pw-item-description',item.description));
        detail.appendChild(el('p','pw-item-qty','单价 ¥'+item.price+' · 已有 '+(s.inventory[choice]||0)));
        const canAfford=s.money>=item.price,canCarry=(s.inventory[choice]||0)<item.stackMax;
        const pay=button('购买 · ¥'+item.price,()=>{
          const res=engine.buy(choice);
          text(res.ok?res.message:res.reason,!res.ok);draw();
        },'pw-item-use',!(canAfford&&canCarry));
        detail.appendChild(pay);
        if(!canAfford)detail.appendChild(el('small','pw-shop-warning','现金不足'));
        if(!canCarry)detail.appendChild(el('small','pw-shop-warning','携带数量已满'));
      }else detail.appendChild(el('p','pw-item-hint','挑选需要的东西。购买会花费游戏时间。'));
      body.replaceChildren(left,detail);
    }
    function draw(){
      if(root.hidden)return;
      if(mode==='map')drawMap();
      else if(mode==='bag')drawBag();
      else if(mode==='shop')drawShop();
    }
    const unsub=engine.subscribe(()=>{if(!root.hidden)draw()});
    return Object.freeze({openMap:()=>open('map'),openBag:()=>open('bag'),
      openShop:()=>open('shop'),close:closeSurface,
      isOpen:()=>!root.hidden,getMode:()=>mode,
      refresh:draw,dispose:()=>{unsub();root.remove()}});
  }
  global.PaperWorldOverworldSurfaces=Object.freeze({create});
})(window);
