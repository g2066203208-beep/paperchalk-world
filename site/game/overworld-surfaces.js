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
      if(!['map','bag','shop'].includes(which))return false;
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
    // Fictional-city node positions. Photo previews are replaceable reference
    // photographs, NOT claims that these are the game's actual locations.
    // Existing destinations use the authoritative life engine; future nodes
    // remain visibly locked instead of navigating to nonexistent scenes.
    const pinData=Object.freeze([
      {id:'entrance',name:'家',x:16,y:23,
       photo:'https://img.livable.co.jp/?h=576&url=https%3A%2F%2Fwww.livable.co.jp%2Fproject-image%2F81%2F818%2F81889%2F81889_22863358.jpg%3F20180412221044&w=768'},
      {id:'school',name:'学校',x:46,y:17,
       photo:'./assets/classroom.webp'},
      {id:'convenience',name:'便利店',x:77,y:23,
       photo:'https://www.biz-lixil.com/case/images/B250014c.jpg'},
      {id:'cafe',name:'咖啡厅',x:24,y:49,
       photo:'https://images.unsplash.com/photo-1593344745356-6e4c8740c3af?auto=format&fit=crop&w=420&q=75'},
      {id:'mall',name:'商场',x:56,y:47,
       photo:'https://www.aeon-jreit.co.jp/file/portfolio-f42a862f3c3b544b4e48580a3f2c1f0702b4c23e.jpg'},
      {id:'park',name:'公园',x:84,y:50,
       photo:'https://ak-d.tripcdn.com/images/1mi1m224x8u2ae3b0B5E2.jpg?proc=source%2Ftrip'},
      {id:'hospital',name:'医院',x:15,y:75,locked:true},
      {id:'station',name:'车站',x:46,y:75,locked:true},
      {id:'police',name:'警察局',x:78,y:75,locked:true}
    ].map(p=>({...p,x:global.PaperWorldMetro?.STATIONS[p.id]?.x??p.x,
      y:global.PaperWorldMetro?.STATIONS[p.id]?.y??p.y})));
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
      const snapshot=get();
      frame.dataset.view='map';heading.textContent='点阵交通图';
      note.textContent=snapshot.calendar.time;
      foot.textContent='';
      const painter=global.PaperWorldTransitMap;
      frame.dataset.mapMode='dot-world';
      if(!painter){body.textContent='地图模块尚未加载';return}
      painter.draw({
        body,snapshot,locations:locs,availability,
        onTravel:async(place,route)=>{
          closeSurface();return onTravel?.(place,route);
        },
        onWorldTravel:async(place,route)=>{
          closeSurface();return onWorldTravel?.(place,route);
        },
        onBoard:async(lineId,direction)=>{
          closeSurface();return onBoard?.(lineId,direction);
        },
        onFeedback:message=>onFeedback?.(message)
      });
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
