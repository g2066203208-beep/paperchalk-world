(function(){'use strict';
 const core=window.PaperWorldConvenience;if(!core)throw Error('Missing store-core.js');
 const storage=(()=>{try{return localStorage}catch(_){return null}})();
 const game=core.create({storage}),$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const PRODUCTS=game.products,productMap=Object.fromEntries(PRODUCTS.map(p=>[p.id,p]));
 let view='story',storyIndex=0,editing=false,drag=null,toastTimer=0;
 const dialogue=[
  ['旁白','玻璃门外的城市刚刚亮起灯，收银台上还留着上一班的交接单。'],
  ['店长','今天有人临时请假。要不要帮忙顶一班？工资会按完成的订单结算。'],
  ['主角','先试试收银吧。商品、扫码枪、收款终端，还有购物袋……应该不难。'],
  ['店长','记住顺序：选商品、扫码、收款、装袋。别让顾客等太久。']
 ];
 function text(el,val){$(el).textContent=String(val)}
 function toast(msg){text('#toast',msg);clearTimeout(toastTimer);toastTimer=setTimeout(()=>text('#toast','便利店 · 日常经营 V1 · 自动存档'),3300)}
 function selectView(next){view=next;$('#story-screen').hidden=next!=='story';$('#work-screen').hidden=next!=='work';$$('[data-view]').forEach(b=>{const on=b.dataset.view===next;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});render();window.dispatchEvent(new Event('resize'))}
 function advanceStory(){storyIndex=(storyIndex+1)%dialogue.length;const entry=dialogue[storyIndex];text('#story-speaker',entry[0]);text('#story-line',entry[1])}
 function money(n){return '¥'+n.toLocaleString('zh-CN')}
 function status(note){toast(note)}
 function act(name,...args){const result=game[name](...args);status(result.reason);render();return result.ok}
 function render(){
  const s=game.snapshot(),shift=s.shift,order=shift?.orders[shift.index]||null;
  text('#top-wallet',s.wallet.toLocaleString('zh-CN'));text('#reputation-label','♥ '+s.rating);text('#energy-label',s.energy+' / 100');
  const baseTime=shift?(shift.startHour*60+shift.minutes):(16*60);
  text('#top-clock',String(Math.floor(baseTime/60)%24).padStart(2,'0')+':'+String(baseTime%60).padStart(2,'0'));
  text('#shift-label',shift?(shift.type+(shift.finished?' · 已结束':' · 营业中')):'尚未上班');
  text('#shift-progress',(shift?.index||0)+' / 5');$('#progress-fill').style.width=((shift?.index||0)/5*100)+'%';
  $('#shift-intro').hidden=!!shift;
  $('#shift-summary').hidden=!shift?.finished;
  if(shift?.finished){text('#summary-copy','这班一共完成 '+shift.index+' 位顾客的订单，获得订单工资和底薪。');text('#summary-wage',money(shift.earnings));text('#summary-score',s.rating+' / 100');text('#summary-orders',shift.index+' / 5')}
  $('#action-layout').setAttribute('aria-pressed',String(editing));$('#action-layout').textContent=editing?'完成布置':'调整柜台';$('#counter-assembly').classList.toggle('editing',editing);
  text('#queue-name',order?order.name:'店内暂时无人');text('#request-bubble',order?'我要：'+order.items.map(i=>productMap[i].name).join('、'):'正在等待下一班');
  text('#order-title',order?(shift.paid?'已收款 · 请装袋':'请选择商品并扫码'):'开始班次后显示订单');
  const total=order?.items.reduce((a,id)=>a+productMap[id].price,0)||0;
  text('#order-total',money(total));text('#receipt-total',money(total));text('#receipt-status',shift?.finished?'已结算':shift?(shift.paid?'收款完成':'订单处理中'):'等待上班');
  const list=$('#receipt-list');list.replaceChildren();
  if(order){const counts={};for(const id of order.items)counts[id]=(counts[id]||0)+1;
   for(const [id,qty]of Object.entries(counts)){
    const scanned=shift.scanned.filter(x=>x===id).length;
    const row=document.createElement('div');row.className='receipt-row '+(scanned===qty?'done':'need');
    const left=document.createElement('span');left.textContent=(scanned===qty?'✓ ':'○ ')+productMap[id].name+' ×'+qty;
    const right=document.createElement('span');right.className='count';right.textContent=scanned+'/'+qty+' · '+money(productMap[id].price*qty);row.append(left,right);list.append(row);
   }
  }else{const row=document.createElement('p');row.style.color='#9c93a2';row.textContent='空闲中 · 等待顾客';list.append(row)}
  text('#receipt-note',shift?(shift.finished?'今天的工资已经存入钱包':shift.paid?'付款成功，请点击购物袋装袋':'将顾客要的商品扫描完毕后收款'):'工资、货架库存和班次会自动存档。');
  const tray=$('#goods-tray');tray.replaceChildren();
  for(const p of PRODUCTS){const btn=document.createElement('button');btn.type='button';btn.className='good'+(shift?.selected===p.id?' selected':'')+(shift?.scanned.includes(p.id)?' scanned':'');btn.disabled=!order||shift.paid;
   const qty=shift?.scanned.filter(x=>x===p.id).length||0;
   const remaining=order?.items.filter(x=>x===p.id).length||0;
   btn.innerHTML='<span class="good-count"></span><span class="good-icon"></span><span class="good-name"></span><span class="good-meta"></span>';
   btn.querySelector('.good-icon').textContent=p.icon;btn.querySelector('.good-name').textContent=p.name;
   btn.querySelector('.good-count').textContent=remaining?qty+'/'+remaining:'';
   btn.querySelector('.good-meta').textContent=money(p.price)+' · 库存'+s.inventory[p.id];
   btn.setAttribute('aria-label','选择'+p.name+'，库存'+s.inventory[p.id]);btn.addEventListener('click',()=>act('select',p.id));tray.append(btn);
  }
  const disabled=!order;['#action-scan','#action-charge','#action-bag','#action-stock','#action-clean'].forEach(id=>$(id).disabled=disabled);
  $('#action-charge').disabled=disabled||shift?.paid;
  $('#action-bag').disabled=disabled||!shift?.paid;
  if(!editing)for(const [name,value]of Object.entries(s.layout)){
   const el=$('[data-piece="'+name+'"]');if(!el)continue;el.style.left=value.left+'%';el.style.top=value.top+'%';el.style.bottom='auto';
  }
 }
 function flashScan(){const el=$('#scan-beam');el.classList.remove('active');void el.offsetWidth;el.classList.add('active')}
 function doScan(){if(act('scan'))flashScan()}
 function enterEdit(){editing=!editing;render();toast(editing?'柜台编辑：拖动收银设备、热食柜和购物袋，松手自动保存':'已退出柜台编辑')}
 const parts={'part-pos':'pos-terminal','part-scanner':'scanner','part-card':'card-reader','part-warmer':'food-warmer','part-bag':'bag-rack'};
 for(const [dom,name]of Object.entries(parts)){
  const el=$('#'+dom);el.addEventListener('click',()=>{
   if(editing)return;
   if(name==='pos-terminal')toast('当前订单请看右侧收银小票');
   if(name==='scanner')doScan();
   if(name==='card-reader')act('charge');
   if(name==='bag-rack')act('bag');
   if(name==='food-warmer')toast('热食柜 · 已开放独立柜台部件，可扩展加热玩法');
  });
  el.addEventListener('keydown',e=>{if(e.key==='Enter'&&!editing){e.preventDefault();el.click()}});
  el.addEventListener('pointerdown',e=>{if(!editing)return;const parent=$('#counter-assembly').getBoundingClientRect(),rect=el.getBoundingClientRect();drag={id:e.pointerId,el,name,offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top,parent};el.setPointerCapture(e.pointerId);e.preventDefault()});
  el.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||drag.el!==el)return;const p=drag.parent,w=el.getBoundingClientRect().width,h=el.getBoundingClientRect().height;const x=Math.max(0,Math.min(p.width-w,e.clientX-p.left-drag.offsetX));const y=Math.max(0,Math.min(p.height-h,e.clientY-p.top-drag.offsetY));el.style.left=(100*x/p.width)+'%';el.style.top=(100*y/p.height)+'%';el.style.bottom='auto';e.preventDefault()});
  const stop=e=>{if(!drag||drag.id!==e.pointerId||drag.el!==el)return;game.layout(name,{left:parseFloat(el.style.left),top:parseFloat(el.style.top)});drag=null;toast('部件位置已保存：'+({scanner:'扫码枪','pos-terminal':'收银电脑','card-reader':'收款设备','bag-rack':'购物袋','food-warmer':'热食柜'}[name]));};el.addEventListener('pointerup',stop);el.addEventListener('pointercancel',stop);
 }
 $$('[data-view]').forEach(x=>x.addEventListener('click',()=>selectView(x.dataset.view)));
 $$('[data-go]').forEach(x=>x.addEventListener('click',()=>selectView(x.dataset.go)));
 $('#story-next').addEventListener('click',advanceStory);
 $$('[data-shift]').forEach(x=>x.addEventListener('click',()=>act('startShift',x.dataset.shift)));
 $('#action-scan').addEventListener('click',doScan);
 $('#action-charge').addEventListener('click',()=>act('charge'));
 $('#action-bag').addEventListener('click',()=>act('bag'));
 $('#action-stock').addEventListener('click',()=>act('stock'));
 $('#action-clean').addEventListener('click',()=>act('clean'));
 $('#action-layout').addEventListener('click',enterEdit);
 $('#summary-continue').addEventListener('click',()=>{act('nextShift');selectView('story')});
 $('#summary-next').addEventListener('click',()=>{act('nextShift');selectView('work')});
 window.addEventListener('keydown',e=>{if(e.code==='Space'&&view==='work'&&!editing&&!e.repeat&&!['BUTTON','INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();doScan()}});
 window.PaperWorldConvenienceGame=Object.freeze({game,selectView,inspect:()=>game.snapshot()});
 render();const params=new URLSearchParams(location.search);if(params.get('view')==='work')selectView('work');
})();