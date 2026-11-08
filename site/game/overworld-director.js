/* Paperchalk World — declarative daytime narrative director.
 * Controls ONLY natural scene entrances, captions and dialogue beats.
 * It never touches card combat, rig parameters, story master assets or saves.
 * First day is ordinary: no scripted jump scare or arbitrary sanity loss.
 */
(function(global){
  'use strict';
  const RUNTIME=Object.freeze({
    school:[
      {speaker:'旁白',text:'走廊里传来上课前的喧闹声。',hold:1200},
      {speaker:'女二',text:'你可算来了！作业呢？第一节课就要交了。',hold:2500}
    ],
    convenience:[
      {speaker:'旁白',text:'推门时，门口的提示铃轻轻响了一声。',hold:1700},
      {speaker:'店员',text:'早上好。慢慢看，需要什么再叫我。',hold:2100}
    ],
    cafe:[
      {speaker:'旁白',text:'咖啡店里很安静。吧台后传来杯碟的轻响。',hold:1800},
      {speaker:'店员',text:'到了？今天先帮忙整理一下吧台。',hold:1900}
    ],
    mall:[
      {speaker:'旁白',text:'商场刚开始营业。橱窗亮着，行人并不多。',hold:2000}
    ],
    park:[
      {speaker:'旁白',text:'树叶被微风吹动。远处有人在晨跑。',hold:1800}
    ]
  });
  function create({root=document.getElementById('novel-ui')}={}){
    if(!root)throw Error('NarrativeDirector requires game UI');
    const wrap=document.createElement('div');wrap.id='pw-world-director';
    wrap.hidden=true;wrap.setAttribute('aria-live','polite');
    const speaker=document.createElement('span');speaker.className='pw-director-speaker';
    const line=document.createElement('p');line.className='pw-director-line';
    const next=document.createElement('button');next.type='button';
    next.className='pw-director-next';next.textContent='继续 ›';
    next.setAttribute('aria-label','继续剧情');
    wrap.append(speaker,line,next);root.appendChild(wrap);
    let queue=[],index=0,active=false,resolvePending=null,task=null,waiting=null,hooks=null;
    const seen=new Set();
    function cleanupTimer(){
      if(task){global.clearTimeout(task);task=null}
      if(waiting){const cb=waiting;waiting=null;cb()}
    }
    function close(){
      cleanupTimer();
      queue=[];index=0;active=false;wrap.hidden=true;
      const ended=hooks;hooks=null;
      try{ended?.onClose?.()}catch(error){console.warn('[story] visual cleanup',error)}
      if(resolvePending){const done=resolvePending;resolvePending=null;done()}
    }
    function advance(){
      if(!active)return;
      cleanupTimer();
      index++;
      if(index>=queue.length){close();return}
      render();
    }
    next.addEventListener('click',advance);
    wrap.addEventListener('click',event=>{if(event.target!==next)advance()});
    const key=e=>{
      if(!active)return;
      if(['Escape',' ','Enter'].includes(e.key)){
        e.preventDefault();e.stopImmediatePropagation();
        if(e.key==='Escape')close();else advance();
      }
    };
    document.addEventListener('keydown',key,true);
    function render(){
      if(!active)return;
      const item=queue[index];
      speaker.textContent=item.speaker||'旁白';
      line.textContent=item.text;
      wrap.hidden=false;
      try{hooks?.onBeat?.(item)}catch(error){console.warn('[story] beat effect',error)}
      if(!global.matchMedia?.('(prefers-reduced-motion:reduce)').matches){
        wrap.dataset.animate='false';
        void wrap.offsetWidth;
        wrap.dataset.animate='true';
      }
      task=global.setTimeout(advance,
        Math.max(1000,Math.min(6000,Number(item.hold)||2000)));
    }
    function play(beats,options={}){
      close();
      if(!Array.isArray(beats)||!beats.length)return Promise.resolve();
      const accepted=beats.filter(x=>typeof x?.text==='string'&&x.text.trim());
      if(!accepted.length)return Promise.resolve();
      queue=accepted.map(x=>({speaker:x.speaker||'旁白',text:x.text,
        hold:x.hold||1900,effect:x.effect||null}));
      hooks=options;index=0;active=true;
      const promise=new Promise(resolve=>{resolvePending=resolve});
      render();return promise;
    }
    function playLocation(location,snapshot){
      if(!Object.hasOwn(RUNTIME,location)||seen.has(location))
        return Promise.resolve();
      seen.add(location);
      const beats=RUNTIME[location].slice();
      // The late-game city can become unsettling gradually, but the first
      // morning remains grounded and reassuring for the opening.
      if(snapshot?.stage>=3&&location==='school')
        beats.push({speaker:'旁白',
          text:'墙上的通知栏已经贴满了新的风险通告。',hold:2000});
      return play(beats);
    }
    function playSocial(message){
      if(typeof message!=='string'||!message.trim())return Promise.resolve();
      const idx=message.indexOf('：');
      return play([{speaker:idx>0?message.slice(0,idx):'旁白',
        text:idx>0?message.slice(idx+1):message,hold:3100}]);
    }
    return Object.freeze({play,playLocation,playSocial,close,
      active:()=>active,seen:()=>[...seen],dispose:()=>{close();document.removeEventListener('keydown',key,true);wrap.remove()}});
  }
  global.PaperWorldOverworldDirector=Object.freeze({create,RUNTIME});
})(window);
