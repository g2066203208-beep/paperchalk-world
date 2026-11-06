
/* Lightweight, character-configurable smartphone UI.
 * Art is never baked together with controls: an Anima lock image can replace
 * the wallpaper via configure({wallpaperUrl}) without touching this keypad.
 * Demo fingerprint is an in-game interaction, not OS biometric authentication. */
(function(global){
  'use strict';
  const ICONS={
    '信息':'<path d="M4 5h16v11H9l-5 4z"/>',
    '联系人':'<circle cx="12" cy="7" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/>',
    '电话':'<path d="M8 3l3 4-2 3c1 2 3 4 5 5l3-2 4 3-2 5C11 21 3 13 3 5z"/>',
    '相册':'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="9" r="2"/><path d="m4 18 6-6 3 3 3-3 4 5"/>',
    '地图':'<path d="m3 5 6-2 6 3 6-3v16l-6 3-6-3-6 2zM9 3v16M15 6v16"/>',
    '备忘录':'<path d="M6 3h12v18H6zM9 9h6M9 13h6M9 17h4"/>',
    '日历':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    '音乐':'<path d="M9 18V5l12-2v13M9 18c0 3-6 4-6 1s6-4 6-1ZM21 16c0 3-6 4-6 1s6-4 6-1Z"/>',
    '设置':'<circle cx="12" cy="12" r="3"/><path d="m10 2-1 3-3 1-3-1-2 4 3 2v3l-3 2 2 4 3-1 3 1 1 3h4l1-3 3-1 3 1 2-4-3-2v-3l3-2-2-4-3 1-3-1-1-3z"/>'
  };
  const svg=p=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
  const finger=svg('<path d="M12 11a2 2 0 0 1 2 2c0 2.5-.3 4.8-1.1 7M9 19.2c.6-2.1.9-4.2.9-6.3a2.1 2.1 0 0 1 4.2 0M6.5 17.5c.4-1.6.5-3 .5-4.5a5 5 0 0 1 10 0c0 2.7-.2 4.9-.7 7M4.5 13a7.5 7.5 0 0 1 15 0c0 1.7-.1 3.1-.3 4.4M12 3a10 10 0 0 0-9.6 7M7.6 21c.9-2.4 1.2-4.6 1.2-7.5"/>');
  // Social information is available through the handset, not the world HUD.
  const defaultApps=['信息','电话','联系人','地图','备忘录','日历','相册','音乐','设置'];
  const defaultProfile={id:'protagonist',name:'女主角',passcode:'000000',
    apps:defaultApps,wallpaperUrl:null,shellUrl:'./assets/phones/char001-cat-ear-shell.webp?v=approved-0c8e0d-v3'};
  const weekdays=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  function create({root,profile={}}={}){
    if(!root)throw new Error('Phone requires #novel-ui root');
    let config={...defaultProfile,...profile};
    let pin='',page='lock',opened=false,clockTimer=0;
    const section=document.createElement('section');
    section.id='phone-ui';section.hidden=true;
    section.dataset.uiFogEdge='right';
    section.setAttribute('role','dialog');section.setAttribute('aria-label','女主角手机');
    section.setAttribute('aria-modal','false');
    section.innerHTML=`
      <div class="phone-device">
        <img class="phone-shell-art" src="./assets/phones/char001-cat-ear-shell.webp?v=approved-shell" alt="" aria-hidden="true" draggable="false" decoding="async">
        <div class="phone-screen">
          <div class="phone-wallpaper" aria-hidden="true"></div>
          <div class="phone-camera" aria-hidden="true"></div>
          <div class="phone-status" aria-hidden="true">
            <span id="phone-status-time">14:50</span>
            <span class="phone-status-right">
              ${svg('<path d="M3 17v3M7 13v7M11 9v11M15 5v15"/>')}
              ${svg('<path d="M2 8c6-6 14-6 20 0M5 11c4-4 10-4 14 0M9 15c2-2 4-2 6 0M12 19h.01"/>')}
              ${svg('<rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4"/>')}
            </span>
          </div>
          <div class="phone-lock" data-phone-page="lock">
            <div class="phone-headline">
              <div class="phone-big-time" id="phone-clock">14:50</div>
              <div class="phone-date" id="phone-date">11月3日 星期二</div>
            </div>
            <div class="phone-unread-preview" id="phone-unread-preview" hidden></div>
            <div class="phone-password" aria-live="polite">
              <div id="phone-prompt" class="phone-prompt">输入六位密码</div>
              <div class="phone-dots" aria-label="已输入0位密码">${'<span class="phone-dot"></span>'.repeat(6)}</div>
            </div>
            <div class="phone-keypad" role="group" aria-label="手机密码数字键盘">
              ${['1','2','3','4','5','6','7','8','9','','0','erase'].map(n=>
                 n===''?'<span class="phone-key phone-empty" aria-hidden="true"></span>':
                 '<button type="button" class="phone-key" data-key="'+n+'" aria-label="'+(n==='erase'?'删除一位':n)+'">'+(n==='erase'?'⌫':n)+'</button>'
              ).join('')}
            </div>
            <div class="phone-biometric">
              <button type="button" id="phone-fingerprint" class="phone-fingerprint" aria-label="使用指纹解锁（游戏模拟）">${finger}</button>
              <span class="phone-biometric-label">指纹解锁</span>
            </div>
          </div>
          <div class="phone-home" data-phone-page="home" hidden>
            <div class="phone-home-head">私人手机</div>
            <div class="phone-apps" id="phone-apps" role="group" aria-label="手机应用"></div>
            <span class="phone-home-indicator" aria-hidden="true"></span>
          </div>
          <div class="phone-app-view" data-phone-page="app" hidden>
            <button class="phone-app-back" id="phone-app-back" type="button">‹ 返回</button>
            <div class="phone-app-title" id="phone-app-title"></div>
            <div class="phone-app-copy" id="phone-app-copy">暂无内容</div>
            <span class="phone-home-indicator" aria-hidden="true"></span>
          </div>
        </div>
        <button class="phone-close" type="button" aria-label="收起手机">×</button>
      </div>`;
    root.appendChild(section);
    const get=id=>section.querySelector('#'+id);
    const prompt=get('phone-prompt'),dots=[...section.querySelectorAll('.phone-dot')];
    const pages=[...section.querySelectorAll('[data-phone-page]')];
    function syncWallpaper(){
      const wall=section.querySelector('.phone-wallpaper');
      const shellImage=section.querySelector('.phone-shell-art');
      if(config.shellUrl){
        const src=new URL(config.shellUrl,document.baseURI).href;
        if(shellImage.src!==src)shellImage.src=src;
      }
      wall.style.setProperty('--phone-lock-image',config.wallpaperUrl?'url("'+encodeURI(config.wallpaperUrl).replace(/"/g,'%22')+'")':'none');
    }
    function getInbox(){
      try{return typeof config.getNarrative==='function'?config.getNarrative():null}
      catch(_){return null}
    }
    function drawClock(){
      const life=global.PaperWorldDailyLifeUI;
      const state=life?.isModeActive?.()?life.snapshot():null;
      const now=new Date();
      const time=state?.calendar?.time||
        String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
      get('phone-clock').textContent=time;
      get('phone-status-time').textContent=time;
      get('phone-date').textContent=state?
        state.calendar.month+'月'+state.calendar.date+'日 '+state.calendar.weekdayLabel:
        (now.getMonth()+1)+'月'+now.getDate()+'日 '+weekdays[now.getDay()];
      const inbox=getInbox(),badge=get('phone-unread-preview');
      const count=inbox?((inbox.phone?.callsRead?0:inbox.missedCalls.length)+
        (inbox.phone?.messagesRead?0:inbox.messages.length)):0;
      badge.hidden=count===0;
      if(count)badge.textContent=inbox.contact+' · '+(inbox.phone?.callsRead?0:inbox.missedCalls.length)+
        ' 通未接来电 · '+(inbox.phone?.messagesRead?0:inbox.messages.length)+' 条消息';
    }
    function showPage(next){
      page=next;
      for(const element of pages)element.hidden=element.dataset.phonePage!==next;
      section.dataset.page=next;
    }
    function setPrompt(message='输入六位密码',error=false){
      prompt.textContent=message;prompt.dataset.error=String(error);
    }
    function updatePin(){
      dots.forEach((dot,index)=>dot.dataset.filled=String(index<pin.length));
      section.querySelector('.phone-dots').setAttribute('aria-label','已输入'+pin.length+'位密码');
    }
    function unlock(method){
      pin='';updatePin();showPage('home');section.dataset.unlockedBy=method;
      get('phone-apps').querySelector('button')?.focus({preventScroll:true});
    }
    function input(key){
      if(!opened||page!=='lock')return false;
      if(key==='erase'){pin=pin.slice(0,-1);updatePin();setPrompt();return true}
      if(!/^\d$/.test(key)||pin.length>=6)return false;
      pin+=key;updatePin();setPrompt();
      if(pin.length===6){
        if(pin===config.passcode)unlock('pin');
        else{pin='';updatePin();setPrompt('密码不正确，请重试',true)}
      }
      return true;
    }
    function renderMap(copy){
      const data=config.getMapState?.();
      if(!data){copy.textContent='暂时没有地图资料。';return;}
      const current=data.state.location,locations=data.locations;
      const caption=document.createElement('p');
      caption.className='phone-map-location';
      caption.textContent='当前位置 · '+locations[current].label;
      copy.appendChild(caption);
      const canvas=document.createElement('div');canvas.className='phone-map-art';
      canvas.innerHTML='<svg viewBox="0 0 200 220" aria-hidden="true"><path d="M17 176 L58 54 L113 110 L177 41 M17 176 L104 176 L177 41 M58 54 L169 172 L104 176" fill="none" stroke="#9da7a7" stroke-width="2" stroke-dasharray="4 5" opacity=".4"/><path d="M16 154 L114 110 L167 173" fill="none" stroke="#c2a97e" stroke-width="1" stroke-dasharray="3 6" opacity=".55"/></svg>';
      const pins=[['entrance','家',13,80],['school','学校',30,23],
        ['convenience','便利店',61,49],['cafe','咖啡店',37,81],
        ['mall','商场',83,18],['park','公园',84,81]];
      const info=document.createElement('p');info.className='phone-map-info';
      info.textContent=current==='entrance'?'选一个要去的地方。':
        locations[current].group==='家'?'先到玄关，从家门口出门。':'选择目的地，路程将消耗时间。';
      for(const [id,label,x,y] of pins){
        const def=locations[id],button=document.createElement('button');
        button.type='button';button.className='phone-map-pin';
        button.dataset.place=id;button.style.left=x+'%';button.style.top=y+'%';
        button.textContent=label;
        if(id===current)button.dataset.current='true';
        const now=data.state.minute,dow=data.state.calendar.weekday;
        const open=(!def.weekdaysOnly||(dow!==0&&dow!==6))&&now>=def.open&&now<def.close;
        const needsDoor=locations[current].group==='家'&&
          def.group==='城区'&&current!=='entrance';
        const needsReturn=locations[current].group==='城区'&&
          def.group==='家'&&id!=='entrance';
        button.disabled=id===current||!open||needsDoor||needsReturn;
        button.title=!open?'现在还没营业':label;
        button.addEventListener('click',()=>{
          const cost=locations[current].group==='家'&&def.group==='家'?10:
            def.group==='家'?locations[current].travel:def.travel;
          info.textContent='目的地 · '+def.label;
          for(const selected of canvas.querySelectorAll('.phone-map-pin'))
            selected.dataset.selected=String(selected.dataset.place===id);
          const old=copy.querySelector('.phone-map-depart');
          old?.remove();
          const depart=document.createElement('button');
          depart.className='phone-map-depart';depart.type='button';
          depart.textContent='前往'+def.label+' · '+cost+'分钟';
          depart.addEventListener('click',async()=>{
            depart.disabled=true;depart.textContent='正在出发…';
            const res=await config.onTravel?.(id);
            if(res?.ok){
              close();global.PaperWorldQuickTools?.close();
            }else{
              info.textContent=res?.reason||'暂时无法前往这个地点。';
              depart.disabled=false;depart.textContent='重试 · '+def.label;
            }
          });
          copy.appendChild(depart);
        });
        canvas.appendChild(button);
      }
      copy.append(canvas,info);
    }
    function renderInventory(copy){
      const data=config.getInventory?.();
      if(!data){copy.textContent='背包还没有整理好。';return;}
      const caption=document.createElement('p');caption.className='phone-map-location';
      caption.textContent='随身携带';
      copy.appendChild(caption);
      for(const [key,item] of Object.entries(data.items)){
        const count=data.state.inventory?.[key]||0;
        if(count<1)continue;
        const b=document.createElement('button');
        b.type='button';b.className='phone-item';
        b.textContent=item.label+' ×'+count;
        b.addEventListener('click',()=>{
          const result=config.onUseItem?.(key);
          if(result?.ok)renderApp('背包');
        });
        copy.appendChild(b);
      }
    }
    function renderContactProfile(contact,copy){
      copy.replaceChildren();
      const back=document.createElement('button');back.type='button';
      back.className='phone-contact-return';back.textContent='‹ 联系人';
      back.addEventListener('click',()=>renderApp('联系人'));
      copy.appendChild(back);
      const head=document.createElement('div');head.className='phone-contact-profile';
      const avatar=document.createElement('div');avatar.className='phone-contact-avatar';
      avatar.textContent=contact.display.slice(0,1);
      const details=document.createElement('div');details.className='phone-contact-person';
      const name=document.createElement('strong');name.textContent=contact.display;
      const subtitle=document.createElement('small');subtitle.textContent=contact.relationship||'联系人';
      details.append(name,subtitle);head.append(avatar,details);copy.appendChild(head);
      const section=document.createElement('div');section.className='phone-affection';
      const label=document.createElement('div');label.className='phone-affection-label';
      const pct=Math.max(0,Math.min(100,Math.round(Number(contact.affinity)||0)));
      const labelName=document.createElement('span');labelName.textContent='亲密度';
      const score=document.createElement('strong');score.textContent=pct+'/100';
      label.append(labelName,score);section.appendChild(label);
      const track=document.createElement('div');track.className='phone-affection-track';
      const fill=document.createElement('i');fill.style.width=pct+'%';
      track.appendChild(fill);section.appendChild(track);copy.appendChild(section);
      for(const [key,value] of [['联系人备注',contact.note||'—'],
        ['关系',contact.relationship||'未记录'],['个人信息',contact.bio||'尚未了解']]){
        const item=document.createElement('div');item.className='phone-profile-field';
        const k=document.createElement('small');k.textContent=key;
        const v=document.createElement('span');v.textContent=value;item.append(k,v);
        copy.appendChild(item);
      }
      if(contact.chatAvailable){
        const chat=document.createElement('button');chat.type='button';
        chat.className='phone-contact-chat';chat.textContent='查看聊天记录';
        chat.addEventListener('click',()=>renderApp('信息'));copy.appendChild(chat);
      }
    }
    function renderContacts(copy){
      const people=config.getContacts?.()||[];
      if(!people.length){copy.textContent='联系人列表是空的。';return}
      for(const contact of people){
        const row=document.createElement('button');row.type='button';
        row.className='phone-contact-row';row.dataset.contact=contact.id;
        const avatar=document.createElement('span');avatar.className='phone-contact-row-avatar';
        avatar.textContent=contact.display.slice(0,1);
        const body=document.createElement('span');body.className='phone-contact-row-body';
        const title=document.createElement('strong');title.textContent=contact.display;
        const sub=document.createElement('small');sub.textContent=contact.relationship||'联系人';
        body.append(title,sub);row.append(avatar,body);
        row.addEventListener('click',()=>renderContactProfile(contact,copy));
        copy.appendChild(row);
      }
    }
    function renderMemo(copy){
      const memo=config.getMemo?.();
      if(!memo){copy.textContent='暂无记录';return}
      const note=document.createElement('div');note.className='phone-memo-note';
      const title=document.createElement('strong');title.textContent=memo.title;
      const details=document.createElement('p');details.textContent=memo.text;
      note.append(title,details);copy.appendChild(note);
    }
    function renderApp(name){
      const inbox=getInbox(),copy=get('phone-app-copy');
      get('phone-app-title').textContent=name;
      section.dataset.appName=name;
      copy.replaceChildren();
      if(name==='联系人'){
        renderContacts(copy);showPage('app');return;
      }
      if(name==='备忘录'){
        renderMemo(copy);showPage('app');return;
      }
      if(name==='地图'){
        renderMap(copy);showPage('app');return;
      }
      if(name==='背包'){
        renderInventory(copy);showPage('app');return;
      }
      if(inbox&&['信息','电话'].includes(name)){
        const isMessage=name==='信息',key=isMessage?'messages':'missedCalls';
        const label=document.createElement('button');label.type='button';
        label.className='phone-conversation-header';
        label.textContent=inbox.contact+' · '+(isMessage?'消息':'未接来电')+' ›';
        label.addEventListener('click',()=>{
          const contact=(config.getContacts?.()||[]).find(x=>x.id==='female2');
          if(contact)renderContactProfile(contact,copy);
        });
        copy.appendChild(label);
        if(typeof config.onPhoneRead==='function')
          config.onPhoneRead(isMessage?'messages':'calls');
        for(const entry of inbox[key]){
          const item=document.createElement('div');item.className='phone-message-row';
          const time=document.createElement('small');time.textContent=entry.time;
          const message=document.createElement('span');message.textContent=entry.text;
          item.append(time,message);copy.appendChild(item);
        }
        if(isMessage){
          if(inbox.phone?.reply){
            const message=document.createElement('p');message.className='phone-my-reply';
            message.textContent=inbox.phone.reply==='coming'?
              '我：还没写，我现在过去！':'我：我先看看书包，马上出门。';
            copy.appendChild(message);
          }else{
            for(const [id,text] of [['coming','还没写，我现在过去！'],['checking','我先看看书包']]){
              const button=document.createElement('button');button.className='phone-reply';
              button.type='button';button.textContent=text;
              button.addEventListener('click',()=>{
                config.onPhoneReply?.(id);renderApp('信息');
              });
              copy.appendChild(button);
            }
          }
        }
      }else copy.textContent='暂无内容';
      showPage('app');
    }
    function drawApps(){
      const items=get('phone-apps');items.replaceChildren();
      for(const name of config.apps){
        const button=document.createElement('button');button.type='button';button.className='phone-app';
        button.dataset.app=name;button.setAttribute('aria-label','打开'+name);
        button.innerHTML='<span class="phone-app-icon">'+svg(ICONS[name]||ICONS['备忘录'])+'</span>';
        const label=document.createElement('span');label.className='phone-app-label';label.textContent=name;
        button.appendChild(label);
        const inbox=getInbox();
        const unread=name==='信息'&&!inbox?.phone?.messagesRead?inbox?.messages?.length:
          name==='电话'&&!inbox?.phone?.callsRead?inbox?.missedCalls?.length:0;
        if(unread){
          const mark=document.createElement('span');mark.className='phone-app-badge';
          mark.textContent=unread;button.appendChild(mark);
        }
        button.addEventListener('click',()=>renderApp(name));
        items.appendChild(button);
      }
    }
    function open(){
      opened=true;section.hidden=false;pin='';updatePin();setPrompt();showPage('lock');
      drawClock();clearInterval(clockTimer);clockTimer=setInterval(drawClock,30000);
      global.dispatchEvent(new CustomEvent('paperchalk:phone-visibility',{detail:{open:true}}));
    }
    function close(){
      opened=false;section.hidden=true;pin='';updatePin();showPage('lock');
      clearInterval(clockTimer);clockTimer=0;
      global.dispatchEvent(new CustomEvent('paperchalk:phone-visibility',{detail:{open:false}}));
    }
    section.querySelectorAll('[data-key]').forEach(b=>b.addEventListener('click',()=>input(b.dataset.key)));
    get('phone-fingerprint').addEventListener('click',()=>{if(opened&&page==='lock')unlock('simulated-fingerprint')});
    get('phone-app-back').addEventListener('click',()=>showPage('home'));
    section.querySelector('.phone-close').addEventListener('click',()=>{
      close();global.PaperWorldQuickTools?.close();
    });
    global.addEventListener('keydown',event=>{
      if(!opened)return;
      if(page==='lock'&&(/^\d$/.test(event.key)||event.key==='Backspace')){
        if(input(event.key==='Backspace'?'erase':event.key)){event.preventDefault();event.stopImmediatePropagation()}
      }else if([' ','Enter'].includes(event.key)&&event.target===document.body){
        event.preventDefault();event.stopImmediatePropagation();
      }
    });
    function configure(patch={}){
      config={...config,...patch,apps:Array.isArray(patch.apps)?[...patch.apps]:config.apps};
      syncWallpaper();drawApps();
      section.setAttribute('aria-label',config.name+'手机');
      return true;
    }
    configure({});
    function refresh(){drawApps();drawClock();}
    function openApp(name){
      if(!opened)open();
      if(page==='lock')unlock('local-quick-access');
      renderApp(name);return true;
    }
    return Object.freeze({open,close,openApp,configure,refresh,input,isOpen:()=>opened,page:()=>page,
      snapshot:()=>({owner:config.id,open:opened,page,pinLength:pin.length,unlockedBy:section.dataset.unlockedBy||null})});
  }
  global.PaperWorldPhoneUI=Object.freeze({create});
})(window);
