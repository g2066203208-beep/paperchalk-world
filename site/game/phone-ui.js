
/* Lightweight, character-configurable smartphone UI.
 * Art is never baked together with controls: an Anima lock image can replace
 * the wallpaper via configure({wallpaperUrl}) without touching this keypad.
 * Demo fingerprint is an in-game interaction, not OS biometric authentication. */
(function(global){
  'use strict';
  const ICONS={
    '信息':'<path d="M4 5h16v11H9l-5 4z"/>',
    '联系人':'<circle cx="12" cy="7" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/>',
    '状态':'<path d="M2 12h5l3-6 4 12 3-6h5"/>',
    '电话':'<path d="M8 3l3 4-2 3c1 2 3 4 5 5l3-2 4 3-2 5C11 21 3 13 3 5z"/>',
    '相册':'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="9" r="2"/><path d="m4 18 6-6 3 3 3-3 4 5"/>',
    '地图':'<path d="m3 5 6-2 6 3 6-3v16l-6 3-6-3-6 2zM9 3v16M15 6v16"/>',
    '备忘录':'<path d="M6 3h12v18H6zM9 9h6M9 13h6M9 17h4"/>',
    '日历':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    '音乐':'<path d="M9 18V5l12-2v13M9 18c0 3-6 4-6 1s6-4 6-1ZM21 16c0 3-6 4-6 1s6-4 6-1Z"/>',
    '相机':'<path d="M3 7h5l2-3h5l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/>',
    '城市论坛':'<path d="M3 4h18v13H9l-5 4v-4H3zM7 9h10M7 13h7"/>',
    '新闻':'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h7v5H7zM16 7h2M16 11h2M7 15h11M7 18h11"/>',
    '直播':'<rect x="4" y="6" width="16" height="13" rx="2"/><path d="m10 10 5 3-5 3zM2 3l2-1M22 3l-2-1"/>',
    '设置':'<circle cx="12" cy="12" r="3"/><path d="m10 2-1 3-3 1-3-1-2 4 3 2v3l-3 2 2 4 3-1 3 1 1 3h4l1-3 3-1 3 1 2-4-3-2v-3l3-2-2-4-3 1-3-1-1-3z"/>'
  };
  const svg=p=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
  const finger=svg('<path d="M12 11a2 2 0 0 1 2 2c0 2.5-.3 4.8-1.1 7M9 19.2c.6-2.1.9-4.2.9-6.3a2.1 2.1 0 0 1 4.2 0M6.5 17.5c.4-1.6.5-3 .5-4.5a5 5 0 0 1 10 0c0 2.7-.2 4.9-.7 7M4.5 13a7.5 7.5 0 0 1 15 0c0 1.7-.1 3.1-.3 4.4M12 3a10 10 0 0 0-9.6 7M7.6 21c.9-2.4 1.2-4.6 1.2-7.5"/>');
  // Social information is available through the handset, not the world HUD.
  const defaultApps=['信息','电话','联系人','相机','相册','城市论坛','新闻','直播','地图','备忘录','日历','设置'];
  const defaultProfile={id:'protagonist',name:'女主角',passcode:'000000',
    apps:defaultApps,wallpaperUrl:null,shellUrl:'./assets/phones/char001-cat-ear-shell.webp?v=approved-0c8e0d-v3'};
  const weekdays=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  function create({root,profile={}}={}){
    if(!root)throw new Error('Phone requires #novel-ui root');
    let config={...defaultProfile,...profile};
    let pin='',page='lock',opened=false,clockTimer=0,mediaStream=null,selectedContact='female2';
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
    function stopCamera(){
      if(mediaStream){for(const track of mediaStream.getTracks())track.stop();mediaStream=null;}
    }
    function world(){
      try{return typeof config.getPhoneWorld==='function'?config.getPhoneWorld():null}
      catch(_){return null;}
    }
    const make=(tag,cls,txt)=>{
      const e=document.createElement(tag);
      if(cls)e.className=cls;
      if(txt!==undefined)e.textContent=String(txt);
      return e;
    };
    function appButton(label,fn,cls='phone-native-action'){
      const b=make('button',cls,label);
      b.type='button';b.addEventListener('click',fn);return b;
    }
    function panelNote(copy,title,body){
      const p=make('div','phone-news-card');
      p.append(make('small','',title),make('p','',body));copy.appendChild(p);return p;
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
      if(next!=='app')stopCamera();
      page=next;
      // While reading apps, the camera looks closer at the SAME phone screen.
      // The approved cat-ear shell remains unchanged on the lock view.
      section.dataset.focus=next==='lock'?'false':'true';
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
      const city=root.PaperWorldCityMap;
      if(city?.show){
        city.show(copy,data,id=>config.onTravel?.(id),()=>{
          close();root.PaperWorldQuickTools?.close?.();
        });
        return;
      }
      copy.textContent='城市地图尚未加载。';
    }
    function renderInventory(copy){
      const data=config.getInventory?.();
      if(!data){copy.textContent='背包还没有整理好。';return;}
      const caption=document.createElement('p');caption.className='phone-map-location';
      caption.textContent='随身携带';
      copy.appendChild(caption);
      const wallet=document.createElement('p');wallet.className='phone-map-info';
      wallet.textContent='现金余额 · ¥ '+data.state.money;
      copy.appendChild(wallet);
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
    function renderConversation(copy){
      const inbox=getInbox();
      const state=world();
      const person=(config.getContacts?.()||[]).find(c=>c.id===selectedContact)||
        {id:'female2',display:'女二',relationship:'学校同学'};
      const title=make('div','phone-chat-header');
      title.append(make('strong','',person.display),make('small','',person.relationship+' · 私人聊天'));
      if(selectedContact!=='female2')title.appendChild(make('small','','通过相识角色的联系方式进行交流'));
      copy.appendChild(title);
      const thread=make('div','phone-chat-thread');
      for(const msg of selectedContact==='female2'?(inbox?.messages||[]):[]){
        const line=make('div','phone-chat-bubble is-them');
        line.append(make('small','',msg.time),make('span','',msg.text));thread.appendChild(line);
      }
      if(selectedContact==='female2'&&inbox?.phone?.reply){
        const outgoing=make('div','phone-chat-bubble is-me');
        outgoing.append(make('small','','我'),make('span','',
          inbox.phone.reply==='coming'?'还没写，我现在过去！':'我先看看书包，马上出门。'));
        thread.appendChild(outgoing);
      }
      for(const msg of state?.phoneThreads?.[selectedContact]||[]){
        const line=make('div','phone-chat-bubble '+(msg.from==='me'?'is-me':'is-them'));
        const time=String(Math.floor(msg.minute/60)).padStart(2,'0')+':'+
          String(msg.minute%60).padStart(2,'0');
        line.append(make('small','',msg.from==='me'?'我 · '+time:time),
          make('span','',msg.text));
        thread.appendChild(line);
      }
      copy.appendChild(thread);
      const composer=make('form','phone-chat-composer');
      const input=make('textarea','phone-chat-input');
      input.placeholder='发送消息…';input.rows=2;input.maxLength=180;
      input.setAttribute('aria-label','输入聊天消息');
      const submit=make('button','','发送');submit.type='submit';
      composer.addEventListener('submit',event=>{
        event.preventDefault();const body=input.value.trim();
        if(!body)return;
        const res=config.onSendMessage?.(selectedContact,body);
        if(res?.ok)renderApp('信息');
        else panelNote(copy,'发送失败',res?.reason||'消息无法发送');
      });
      composer.append(input,submit);copy.appendChild(composer);
      if(selectedContact==='female2'&&typeof config.onPhoneRead==='function')config.onPhoneRead('messages');
      if(selectedContact==='female2'&&inbox?.phone&&!inbox.phone.reply){
        const quick=make('div','phone-chat-quick');
        for(const [id,txt] of [['coming','还没写，我现在过去！'],['checking','我先看看书包']]){
          quick.appendChild(appButton(txt,()=>{
            const res=config.onPhoneReply?.(id);
            if(res?.ok)renderApp('信息');
          },'phone-quick-reply'));
        }
        copy.appendChild(quick);
      }
      thread.scrollTop=thread.scrollHeight;
    }
    function renderCall(copy){
      const state=world(),inbox=getInbox();
      const person=(config.getContacts?.()||[]).find(c=>c.id===selectedContact)||{display:'女二'};
      const head=make('div','phone-call-contact');
      head.append(make('div','phone-call-avatar',person.display.slice(0,1)),make('strong','',person.display),
        make('small','','同班同学'));
      copy.appendChild(head);
      const controls=make('div','phone-call-actions');
      const call=video=>{
        const result=config.onPhoneCall?.(selectedContact,video);
        if(!result?.ok){panelNote(copy,'通话失败',result?.reason||'无法发起通话');return;}
        copy.replaceChildren();
        const screen=make('div','phone-call-screen');
        if(video){
          const heading=make('strong','','游戏内视频通话 · '+person.display);
          screen.appendChild(heading);
          const avatar=make('div','phone-call-video-avatar',person.display.slice(0,1));
          screen.appendChild(avatar);
          const caption=make('small','',result.answered?'对方正在通话 · 剧情画面':'无人接听');
          screen.appendChild(caption);
          const selfPreview=make('video','phone-call-self');
          selfPreview.autoplay=true;selfPreview.muted=true;selfPreview.playsInline=true;
          screen.appendChild(selfPreview);
          if(navigator.mediaDevices?.getUserMedia){
            navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false})
              .then(stream=>{
                if(!opened||!selfPreview.isConnected){stream.getTracks().forEach(t=>t.stop());return;}
                stopCamera();mediaStream=stream;selfPreview.srcObject=stream;
                selfPreview.play().catch(()=>{});
              }).catch(()=>{selfPreview.hidden=true});
          }else selfPreview.hidden=true;
        }else screen.append(make('strong','','正在与'+person.display+'通话'));
        screen.append(make('p','',result.text));
        copy.appendChild(screen);
        copy.appendChild(appButton('结束通话',()=>{stopCamera();renderApp('电话')},'phone-hangup'));
      };
      controls.append(appButton('语音通话',()=>call(false)),
        appButton('视频通话',()=>call(true)));
      copy.appendChild(controls);
      panelNote(copy,'近期通话','与游戏世界角色通话，通话会占用游戏时间。');
      for(const c of (state?.phoneCalls||[]).filter(c=>c.to===selectedContact).slice(-7).reverse()){
        const row=make('div','phone-call-history',
          (c.video?'视频':'语音')+' · '+(c.answered?'已接通':'未接听')+' · 第'+c.day+'天');
        copy.appendChild(row);
      }
      if(selectedContact==='female2'&&inbox?.missedCalls?.length){
        panelNote(copy,'女二','早上有 '+inbox.missedCalls.length+' 通未接来电。');
        config.onPhoneRead?.('calls');
      }
    }
    function renderNews(copy){
      const s=world();
      const hdr=make('p','phone-feed-intro','市民资讯 · 游戏世界内的新闻');
      copy.appendChild(hdr);
      const items=s?.news||['今天的城市生活继续。'];
      items.forEach((text,i)=>panelNote(copy,i===0?'最新消息':'城市快讯',text));
      if(s?.transitRumors?.length){
        copy.appendChild(make('h3','phone-feed-heading','车厢见闻'));
        for(const item of s.transitRumors.slice(-12).reverse())
          panelNote(copy,'第'+item.day+'天 · 乘客谈话',item.text);
      }
    }
    function renderGallery(copy,allowSelect=false,onSelect=null){
      const photos=world()?.mediaPhotos||[];
      if(!photos.length){panelNote(copy,'相册','还没有照片。可以使用相机拍摄或从设备选取。');return}
      const grid=make('div','phone-gallery-grid');
      for(const item of photos.slice().reverse()){
        const tile=make('button','phone-photo-tile');
        tile.type='button';
        const photo=make('img');photo.src=item.data;photo.alt='第'+item.day+'天拍摄';
        tile.append(photo,make('small','','第'+item.day+'天'));
        tile.addEventListener('click',()=>{
          if(allowSelect&&onSelect){onSelect(item.id);return}
          copy.replaceChildren();
          const larger=make('img','phone-photo-preview');
          larger.src=item.data;larger.alt='拍摄的照片';
          copy.append(larger,appButton('返回相册',()=>renderApp('相册')));
        });
        grid.appendChild(tile);
      }
      copy.appendChild(grid);
    }
    async function openRealCamera(copy,live=false){
      const preview=make('div','phone-camera-stage');
      const video=make('video','phone-camera-live');
      video.autoplay=true;video.muted=true;video.playsInline=true;
      preview.appendChild(video);copy.appendChild(preview);
      const status=make('p','phone-camera-status',
        live?'游戏世界直播预览 · 不会上传到现实网络':'使用设备摄像头，图片只保存到游戏存档');
      copy.appendChild(status);
      const controls=make('div','phone-camera-actions');
      copy.appendChild(controls);
      const take=()=>{
        if(!video.videoWidth){status.textContent='相机尚未就绪';return}
        const canvas=document.createElement('canvas');
        canvas.width=320;canvas.height=Math.round(320*video.videoHeight/video.videoWidth);
        canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
        const image=canvas.toDataURL('image/jpeg',.62);
        const res=config.onTakePhoto?.(image);
        status.textContent=res?.ok?'照片已保存到相册':res?.reason||'存储失败';
        if(res?.ok&&!live)renderApp('相册');
      };
      if(live){
        let broadcasting=false;
        const start=appButton('开始游戏内直播',()=>{
          broadcasting=!broadcasting;
          start.textContent=broadcasting?'结束直播':'开始游戏内直播';
          status.textContent=broadcasting?
            '直播中 · 游戏世界模拟观众：今天街区有什么新鲜事？':
            '直播已结束 · 未连接真实直播平台';
        });
        controls.appendChild(start);
      }
      controls.appendChild(appButton(live?'拍摄直播截图':'拍照',take));
      if(!live){
        const importBtn=make('label','phone-import-label','从设备选取照片');
        const input=make('input');input.type='file';input.accept='image/*';
        input.addEventListener('change',event=>{
          const file=event.target.files?.[0];if(!file)return;
          const img=new Image();const url=URL.createObjectURL(file);
          img.onload=()=>{
            const c=document.createElement('canvas');c.width=320;
            c.height=Math.max(1,Math.round(320*img.height/img.width));
            c.getContext('2d').drawImage(img,0,0,c.width,c.height);
            URL.revokeObjectURL(url);
            const res=config.onTakePhoto?.(c.toDataURL('image/jpeg',.58));
            if(res?.ok)renderApp('相册');
            else status.textContent=res?.reason||'无法导入照片';
          };
          img.onerror=()=>URL.revokeObjectURL(url);
          img.src=url;
        });
        importBtn.appendChild(input);controls.appendChild(importBtn);
      }
      if(!navigator.mediaDevices?.getUserMedia){
        video.hidden=true;
        status.textContent='当前设备不支持网页相机，可以从设备选取照片。';
        return;
      }
      try{
        stopCamera();
        const stream=await navigator.mediaDevices.getUserMedia({
          video:{facingMode:live?'user':'environment'},audio:false});
        if(!opened||!video.isConnected){stream.getTracks().forEach(t=>t.stop());return}
        mediaStream=stream;video.srcObject=stream;
        await video.play().catch(()=>{});
      }catch(error){
        video.hidden=true;
        status.textContent='相机未授权或不可用；可使用设备照片。';
      }
    }
    function renderForum(copy){
      const s=world();
      copy.appendChild(make('p','phone-feed-intro','城市论坛 · 仅在游戏世界内发布'));
      const form=make('form','phone-forum-composer');
      const field=make('textarea');field.placeholder='分享你在城里看到的事…';
      field.maxLength=180;field.rows=3;
      const photoLabel=make('small','','未选择照片');
      const selection=make('button','', '选择相册照片');
      selection.type='button';
      let photoId='';
      selection.addEventListener('click',()=>{
        copy.replaceChildren();
        copy.appendChild(appButton('‹ 返回论坛',()=>renderApp('城市论坛')));
        renderGallery(copy,true,id=>{section.dataset.forumPhoto=id;renderApp('城市论坛');});
      });
      // Album selection is stored on this handset until the next post.
      photoId=section.dataset.forumPhoto||'';
      if(photoId)photoLabel.textContent='已添加照片';
      form.addEventListener('submit',event=>{
        event.preventDefault();
        const result=config.onPublishPost?.(field.value,section.dataset.forumPhoto||'');
        if(result?.ok){delete section.dataset.forumPhoto;renderApp('城市论坛')}
        else panelNote(copy,'发布失败',result?.reason||'暂时无法发布');
      });
      const submit=make('button','', '发布');submit.type='submit';
      form.append(field,photoLabel,selection,submit);copy.appendChild(form);
      for(const post of s?.socialPosts||[]){
        const card=panelNote(copy,'我 · 第'+post.day+'天',post.text||'分享了一张照片');
        const photo=s?.mediaPhotos?.find(p=>p.id===post.photoId);
        if(photo){const image=make('img','phone-post-image');image.src=photo.data;image.alt='帖子图片';card.appendChild(image)}
      }
      (s?.news||[]).slice(0,2).forEach((txt,i)=>panelNote(copy,
        i?'城内讨论 · 热帖':'城内讨论 · 置顶',txt));
    }
    function renderContactProfile(contact,copy){
      selectedContact=contact.id;
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
      const actions=make('div','phone-contact-actions');
      actions.append(appButton('语音通话',()=>renderApp('电话')),
        appButton('视频通话',()=>{renderApp('电话');const b=get('phone-app-copy')
          .querySelectorAll('.phone-call-actions button')[1];b?.click();}),
        appButton('发消息',()=>renderApp('信息')));
      copy.appendChild(actions);
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
    function renderStatus(copy){
      const status=config.getStatus?.();
      if(!status){copy.textContent='暂无状态资料';return}
      const detail=document.createElement('div');detail.className='phone-private-status';
      const rows=[
        ['现金','¥ '+status.money],
        ['精力',status.energy+'/100'],
        ...(status.stats?[
          ['生命',status.stats.health.current+'/'+status.stats.health.max],
          ['饥饿',status.stats.hunger.current+'/'+status.stats.hunger.max],
          ['理智',status.stats.sanity.current+'/'+status.stats.sanity.max]
        ]:[])
      ];
      for(const [title,value] of rows){
        const row=document.createElement('div');row.className='phone-status-row';
        const name=document.createElement('span');name.textContent=title;
        const amount=document.createElement('strong');amount.textContent=value;
        row.append(name,amount);detail.appendChild(row);
      }
      copy.appendChild(detail);
    }
    function renderApp(name){
      const inbox=getInbox(),copy=get('phone-app-copy');
      get('phone-app-title').textContent=name;
      section.dataset.appName=name;
      copy.replaceChildren();
      if(name!=='相机'&&name!=='直播'&&name!=='电话')stopCamera();
      if(name==='联系人'){
        renderContacts(copy);showPage('app');return;
      }
      if(name==='信息'){
        renderConversation(copy);showPage('app');return;
      }
      if(name==='电话'){
        renderCall(copy);showPage('app');return;
      }
      if(name==='新闻'){
        renderNews(copy);showPage('app');return;
      }
      if(name==='城市论坛'){
        renderForum(copy);showPage('app');return;
      }
      if(name==='相册'){
        renderGallery(copy);showPage('app');return;
      }
      if(name==='相机'||name==='直播'){
        showPage('app');openRealCamera(copy,name==='直播');return;
      }
      if(name==='日历'){
        const state=world();
        panelNote(copy,'游戏日历',state?
          state.calendar.month+'月'+state.calendar.date+'日 · '+state.calendar.weekdayLabel:
          '尚未进入日常生活');
        showPage('app');return;
      }
      if(name==='设置'){
        panelNote(copy,'手机设置','点击手机外侧区域即可收起，应用内使用返回键。');
        showPage('app');return;
      }
      if(name==='备忘录'){
        renderMemo(copy);showPage('app');return;
      }
      if(name==='状态'){
        renderStatus(copy);showPage('app');return;
      }
      if(name==='地图'){
        if(typeof config.onOpenMap==='function'){config.onOpenMap();return}
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
      if(!opened)return;
      stopCamera();opened=false;section.hidden=true;pin='';updatePin();showPage('lock');
      clearInterval(clockTimer);clockTimer=0;
      global.dispatchEvent(new CustomEvent('paperchalk:phone-visibility',{detail:{open:false}}));
    }
    section.querySelectorAll('[data-key]').forEach(b=>b.addEventListener('click',()=>input(b.dataset.key)));
    get('phone-fingerprint').addEventListener('click',()=>{if(opened&&page==='lock')unlock('simulated-fingerprint')});
    get('phone-app-back').addEventListener('click',()=>showPage('home'));
    // A handset closes by tapping anywhere outside its silhouette.
    const view=document.getElementById('view');
    view?.addEventListener('pointerdown',event=>{
      if(!opened||section.contains(event.target)||event.target.closest('#quick-phone'))return;
      close();
      global.PaperWorldQuickTools?.close?.();
    },true);
    global.addEventListener('keydown',event=>{
      if(!opened)return;
      if(event.key==='Escape'){
        close();global.PaperWorldQuickTools?.close?.();
        event.preventDefault();event.stopImmediatePropagation();return;
      }
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
    function refresh(){if(!opened)return;drawApps();drawClock();}
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
