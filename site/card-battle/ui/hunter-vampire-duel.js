/* Silver Moon Road — playable illustrated deck-builder encounter.
 * Single authoritative rules module. Mouse, touch and keyboard supported.
 * All original Anima portraits are unchanged; exterior near-white is removed
 * in an ephemeral canvas using edge-connected flood-fill only.
 */
(function(){
'use strict';
const rules=window.PaperchalkHunterVampireDuel,art=window.PaperchalkDuelCardArt;
if(!rules||!art)throw Error('The duel rules and local card artwork must be loaded before UI');
const battle=rules.create(),$=id=>document.getElementById(id);
const actor={hero:$('fighter-hunter'),boss:$('fighter-vampire')};
let selectedIndex=-1,playing=false,busy=false,sound=false,audio=null,resultPending=false,version=0;
let toastTimeout=0,layoutRequest=0,lastPointerType='mouse';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const s2=n=>String(n).padStart(2,'0');
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const dialog=(el,on)=>{if(on){if(!el.open)el.showModal()}else if(el.open)el.close()};
function notify(message){
 $('battle-toast').textContent=message;
 clearTimeout(toastTimeout);
 $('battle-toast').style.opacity='1';
 toastTimeout=setTimeout(()=>{$('battle-toast').style.opacity='.80'},1950);
}
function beep(f=220,d=.07,kind='sine',volume=.05){
 if(!sound)return;
 try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;if(!audio)audio=new A();
 if(audio.state==='suspended')audio.resume();
 const node=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
 node.type=kind;node.frequency.setValueAtTime(f,t);node.frequency.exponentialRampToValueAtTime(Math.max(45,f*.6),t+d);
 g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
 node.connect(g);g.connect(audio.destination);node.start(t);node.stop(t+d+.02);}catch(e){}
}
function gesture(who,kind,duration=350){
 const node=actor[who];if(!node)return;
 node.classList.remove('attack','hurt','dodge');void node.offsetWidth;
 node.classList.add(kind);setTimeout(()=>node.classList.remove(kind),duration);
}
function float(who,value,kind='damage'){
 const el=$(who==='hero'?'hero-effect':'vampire-effect');
 el.className='sprite-status '+kind;el.textContent=value;
 void el.offsetWidth;el.classList.add('show');
}
function muzzleFlash(){
 const host=$('shots'),root=host.getBoundingClientRect();
 const a=$('hero-wrap').getBoundingClientRect(),b=$('vampire-wrap').getBoundingClientRect();
 const x=a.left+a.width*.71-root.left,y=a.top+a.height*.46-root.top;
 const x2=b.left+b.width*.36-root.left,y2=b.top+b.height*.5-root.top;
 const line=document.createElement('div');line.className='bullet-trail';
 line.style.left=x+'px';line.style.top=y+'px';
 line.style.width=Math.hypot(x2-x,y2-y)+'px';
 line.style.transform='rotate('+Math.atan2(y2-y,x2-x)+'rad)';
 host.appendChild(line);setTimeout(()=>line.remove(),420);
}
function dots(el,n,max,cls){
 el.replaceChildren();
 for(let i=0;i<max;i++){
  const q=document.createElement('i');if(i>=n)q.className='empty';
  q.setAttribute('aria-hidden','true');el.append(q);
 }
 el.setAttribute('aria-label',cls+' '+n+'/'+max);
}
function categorize(c){
 return c.kind==='attack'?'攻击':c.kind==='guard'?'防御':
 c.kind==='reload'?'装填':c.kind==='roll'?'身法':'战术';
}
function exactCard(c,index){
 const el=document.createElement('button');el.type='button';el.className='action-card';
 if(c.silver)el.classList.add('is-silver');
 if(index===selectedIndex)el.classList.add('is-selected');
 el.dataset.kind=c.kind;el.dataset.index=String(index);
 el.setAttribute('aria-label',c.name+'，消耗'+c.cost+'行动力。'+c.detail+'。点击选中，再次点击使用');
 el.setAttribute('aria-pressed',String(index===selectedIndex));
 const can=playing&&!busy&&battle.snapshot().phase==='player'&&!battle.canPlay(c.id);
 el.disabled=!can;
 // card text and id originate exclusively from our local immutable catalogue
 el.innerHTML='<span class="card-art">'+art.render(c)+'</span>'+
 '<span class="card-type">'+categorize(c)+'</span>'+
 '<span class="card-energy">'+c.cost+'</span>'+
 '<span class="card-title">'+c.name+'</span>'+
 '<span class="card-description">'+c.detail+'</span>'+
 (c.ammo?'<span class="card-ammo">弹 '+c.ammo+'</span>':'');
 el.addEventListener('click',event=>{
  if(el.dataset.ignoreClick==='true'){el.dataset.ignoreClick='false';return;}
  if(!playing||busy)return;
  if(index===selectedIndex)playIndex(index);
  else select(index);
 });
 let dragStart=null;
 el.addEventListener('pointerdown',event=>{
  lastPointerType=event.pointerType||'mouse';
  if(!can||event.button!==0)return;
  dragStart={x:event.clientX,y:event.clientY,dragged:false};
 });
 el.addEventListener('pointermove',event=>{
  if(!dragStart)return;
  const dx=event.clientX-dragStart.x,dy=event.clientY-dragStart.y;
  if(Math.hypot(dx,dy)>16){
   dragStart.dragged=true;el.style.translate=dx+'px '+dy+'px';
   el.style.transition='none';el.style.zIndex='99';
  }
 });
 el.addEventListener('pointerup',event=>{
  if(!dragStart)return;
  const dragging=dragStart.dragged;dragStart=null;
  if(!dragging)return;
  el.style.translate='';el.style.transition='';el.style.zIndex='';
  el.dataset.ignoreClick='true';
  const battlefield=$('arena').getBoundingClientRect();
  if(event.clientY<Math.max(battlefield.bottom,battlefield.top+60)&&event.clientY>=battlefield.top){
   selectedIndex=index;playIndex(index);
  }else{select(index);notify('已选中 '+c.name+' · 再点一次打出');}
  setTimeout(()=>{el.dataset.ignoreClick='false'},180);
 });
 el.addEventListener('pointercancel',()=>{dragStart=null;el.style.translate='';el.style.transition='';el.style.zIndex=''});
 return el;
}
function fanLayout(){
 const host=$('hand');if(!host)return;
 const cards=[...host.querySelectorAll('.action-card')],n=cards.length;if(!n)return;
 const region=$('hand-region').getBoundingClientRect();
 const cardWidth=cards[0].offsetWidth;
 const maxSpread=Math.max(20,(region.width-cardWidth-40)/Math.max(1,n-1));
 const spread=Math.min(cardWidth*.77,maxSpread);
 for(let i=0;i<n;i++){
  const offset=i-(n-1)/2,el=cards[i],extent=(n-1)/2;
  const relative=extent?Math.abs(offset)/extent:0;
  el.style.setProperty('--fan-x',(offset*spread).toFixed(1)+'px');
  el.style.setProperty('--fan-y',(relative*clamp(cardWidth*.095,5,16)).toFixed(1)+'px');
  el.style.setProperty('--fan-r',(offset*3.6).toFixed(2)+'deg');
  el.style.setProperty('--card-z',String(i+1));
 }
}
function requestFan(){
 if(layoutRequest)cancelAnimationFrame(layoutRequest);
 layoutRequest=requestAnimationFrame(()=>{layoutRequest=0;fanLayout();});
}
function select(index){
 const state=battle.snapshot();if(!playing||busy||state.phase!=='player')return;
 if(index<0||index>=state.hand.length){selectedIndex=-1;render();return;}
 selectedIndex=index;beep(440,.04);
 const info=rules.CARD_LIST.find(x=>x.id===state.hand[index]);
 notify(info.name+' · '+info.detail+'（再点击卡牌或“打出此牌”使用）');
 render();
}
async function playIndex(index){
 if(!playing||busy)return;
 const state=battle.snapshot();
 if(index<0||index>=state.hand.length)return;
 const id=state.hand[index];selectedIndex=-1;
 await act(()=>battle.play(id));
}
function render(){
 const state=battle.snapshot(),h=state.hunter,v=state.vampire,turn=state.phase==='player';
 const cardIds=state.hand;
 $('turn-count').textContent=s2(state.turn);
 $('header-hp').textContent=h.hp+'/'+h.maxHp;
 $('hero-hpbar').style.width=(h.hp/h.maxHp*100)+'%';
 $('boss-hpbar').style.width=(v.hp/v.maxHp*100)+'%';
 $('hero-hp').textContent=h.hp+'/'+h.maxHp;
 $('boss-hp').textContent=v.hp+'/'+v.maxHp;
 $('hero-shield').hidden=!h.block;$('hero-shield').textContent='护盾 '+h.block;
 $('hero-focus').hidden=!h.focus;$('hero-focus').textContent='蓄力 +'+h.focus;
 $('boss-shield').hidden=!v.block;$('boss-shield').textContent='护盾 '+v.block;
 $('boss-seal').hidden=!v.silver;$('boss-seal').textContent='银弹封疗';
 $('energy-number').textContent=h.hp>0?state.ap:'0';
 dots($('ap-pips'),state.ap,state.maxAP,'行动力');
 dots($('ammo-pips'),h.ammo,h.maxAmmo,'弹药');
 const i=state.intent;
 $('intent-icon').textContent=i.symbol;
 $('intent-value').textContent=i.damage||('+'+(i.block||0));
 $('intent-name').textContent=i.title;
 $('intent-desc').textContent=i.text;
 $('intent-panel').classList.toggle('is-safe',i.kind==='ward'||i.kind==='flit');
 for(const btn of document.querySelectorAll('[data-lane]')){
  const lane=Number(btn.dataset.lane);
  btn.classList.toggle('is-hunter',lane===h.lane);
  btn.classList.toggle('is-vampire',lane===v.lane);
  btn.classList.toggle('is-danger',i.damage>0&&i.lane===lane);
  btn.querySelector('small').textContent=(lane===h.lane?'●':'')+(lane===v.lane?'◆':'');
  btn.disabled=!playing||busy||!turn||state.ap<1||lane===h.lane;
  btn.setAttribute('aria-pressed',String(lane===h.lane));
 }
 $('draw-cards').disabled=!playing||busy||!turn||state.drawAllowance<=0||state.hand.length>=7;
 $('end-turn').disabled=!playing||busy||!turn;
 $('draw-count').textContent=state.deckCount;
 $('discard-count').textContent=state.discardCount;
 $('draw-cards').setAttribute('aria-label','摸一张牌，本回合还可摸'+state.drawAllowance+'张，牌库剩余'+state.deckCount+'张');
 $('deck-status').textContent='手牌 '+cardIds.length+'/7'+(state.drawAllowance?' · 待摸 '+state.drawAllowance:'');
 if(selectedIndex>=cardIds.length)selectedIndex=-1;
 const preview=$('selected-preview');
 if(selectedIndex>=0){
  const c=rules.CARD_LIST.find(x=>x.id===cardIds[selectedIndex]);
  $('selected-text').textContent=c.name+' · '+c.detail;
  $('play-selected').disabled=!!battle.canPlay(c.id)||!playing||busy;
  preview.hidden=false;
 }else preview.hidden=true;
 const fragment=document.createDocumentFragment();
 for(let x=0;x<cardIds.length;x++){
  const c=rules.CARD_LIST.find(z=>z.id===cardIds[x]);
  fragment.append(exactCard(c,x));
 }
 $('hand').replaceChildren(fragment);
 requestFan();
 $('hint').textContent=state.drawAllowance?'点击左下牌库摸牌；选牌后再次点击出牌':
 selectedIndex>=0?'再点这张卡牌或点敌人打出':'点按卡牌预览，再次点按打出 · 可以拖向战场';
 if(state.phase==='victory'||state.phase==='defeat')showResult(state);
}
function showResult(state){
 if(resultPending||$('results').open)return;
 resultPending=true;
 $('result-title').textContent=state.result?.title||'本场结束';
 $('result-subtitle').textContent=state.result?.subtitle||'';
 $('result-round').textContent=state.turn;
 $('result-cards').textContent=state.plays;
 $('result-dodges').textContent=state.dodges;
 const current=version;
 setTimeout(()=>{if(version===current)dialog($('results'),true);resultPending=false},550);
}
async function effects(events,token){
 for(const e of events){
  if(token!==version)return;
  if(e.type==='shot'){
   gesture('hero','attack',350);muzzleFlash();beep(e.silver?610:285,.14,e.silver?'sine':'sawtooth');
   await wait(105);gesture('boss','hurt',270);float('boss','−'+e.amount);
   notify(e.silver?'银弹穿透血雾 · '+e.amount+'伤害':e.text);await wait(270);
  }else if(e.type==='hurt'){
   gesture('boss','attack');beep(130,.15,'sawtooth');
   await wait(175);gesture('hero','hurt');float('hero',e.amount?'−'+e.amount:'格挡');
   notify(e.text);await wait(270);
  }else if(e.type==='dodge'){
   gesture('hero','dodge');float('hero','闪避','dodge');beep(440,.06);notify(e.text);await wait(270);
  }else if(e.type==='ward'||e.type==='heal'){
   float('boss','+'+e.amount,'heal');beep(330,.11);notify(e.text);await wait(210);
  }else if(e.type==='guard'||e.type==='focus'||e.type==='reload'){
   float('hero','+'+e.amount,'heal');beep(440,.08);notify(e.text);await wait(220);
  }else if(e.type==='draw'){beep(530,.035,'triangle');notify(e.text);await wait(105);}
  else if(e.type==='move'){gesture('hero','dodge',220);beep(280,.05);notify(e.text);await wait(150);}
  else if(e.type==='enemy-turn'){notify(e.text);await wait(320);}
  else if(e.type==='sealed'){notify(e.text);await wait(170);}
  else if(e.type==='turn'){notify(e.text);}
  else if(e.type==='victory'||e.type==='defeat'){notify(e.text);}
 }
}
async function act(run){
 if(!playing||busy)return false;
 const output=run();
 if(!output.ok){notify(output.reason);beep(160,.045,'triangle');return false;}
 const token=version;
 busy=true;render();
 try{await effects(output.events,token);}finally{
  if(version===token){busy=false;render();}
 }
 return true;
}
function reset(start){
 version++;busy=false;resultPending=false;selectedIndex=-1;playing=start!==false;
 battle.reset();dialog($('results'),false);dialog($('help'),false);
 render();notify('新的一场狩猎开始 · 看清敌方意图');
}
function bind(){
 $('start-game').addEventListener('click',()=>{playing=true;dialog($('intro'),false);render();beep(420,.11);});
 $('retry-game').addEventListener('click',()=>reset(true));
 $('restart-top').addEventListener('click',()=>reset(true));
 $('end-turn').addEventListener('click',()=>{selectedIndex=-1;act(()=>battle.endTurn());});
 $('draw-cards').addEventListener('click',()=>{selectedIndex=-1;act(()=>battle.drawHand());});
 $('play-selected').addEventListener('click',()=>playIndex(selectedIndex));
 $('cancel-selected').addEventListener('click',()=>{selectedIndex=-1;render();});
 for(const btn of document.querySelectorAll('[data-lane]')){
  btn.addEventListener('click',()=>{selectedIndex=-1;act(()=>battle.move(Number(btn.dataset.lane)));});
 }
 // A selected attack can also be applied by tapping the opponent.
 const opponent=$('fighter-vampire');
 opponent.style.pointerEvents='auto';opponent.style.cursor='crosshair';
 opponent.addEventListener('click',()=>{
  const state=battle.snapshot();
  if(selectedIndex<0||busy||!playing)return;
  const c=rules.CARD_LIST.find(x=>x.id===state.hand[selectedIndex]);
  if(c?.kind==='attack')playIndex(selectedIndex);
 });
 $('open-help').addEventListener('click',()=>dialog($('help'),true));
 $('close-help').addEventListener('click',()=>dialog($('help'),false));
 $('sound').addEventListener('click',()=>{
  sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));
  $('sound').textContent=sound?'♫':'♪';if(sound)beep(510,.08);
 });
 $('intent-panel').addEventListener('click',()=>{$('intent-panel').classList.toggle('details-open')});
 window.addEventListener('resize',requestFan,{passive:true});
 window.addEventListener('orientationchange',requestFan,{passive:true});
 document.addEventListener('keydown',event=>{
  if(!playing||busy||$('intro').open||$('results').open||$('help').open||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='Escape'&&selectedIndex>=0){selectedIndex=-1;render();}
  if(event.key==='ArrowLeft')act(()=>battle.move(Math.max(0,battle.snapshot().hunter.lane-1)));
  if(event.key==='ArrowRight')act(()=>battle.move(Math.min(2,battle.snapshot().hunter.lane+1)));
  if(event.key==='e'||event.key==='E'){selectedIndex=-1;act(()=>battle.endTurn());}
  if(event.key==='d'||event.key==='D'){selectedIndex=-1;act(()=>battle.drawHand());}
  if(/^[1-7]$/.test(event.key)){
   const n=Number(event.key)-1;if(n<battle.snapshot().hand.length){
    if(selectedIndex===n)playIndex(n);else select(n);
   }
  }
 });
}
function peelWhiteBackground(img,canvas,wrap){
 try{
  const w=img.naturalWidth||704,h=img.naturalHeight||1024;
  if(!w||!h)return;
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,0,0,w,h);
  const image=ctx.getImageData(0,0,w,h),p=image.data;
  const visited=new Uint8Array(w*h),queue=new Int32Array(w*h);
  let head=0,tail=0;
  function nearlyPaper(idx){
   const off=idx*4,r=p[off],g=p[off+1],b=p[off+2];
   return r>229&&g>229&&b>229&&Math.max(r,g,b)-Math.min(r,g,b)<29;
  }
  function add(idx){
   if(visited[idx])return;visited[idx]=1;
   if(nearlyPaper(idx))queue[tail++]=idx;
  }
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}
  for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
  while(head<tail){
   const idx=queue[head++],x=idx%w;
   p[idx*4+3]=0;
   if(x>0)add(idx-1);if(x<w-1)add(idx+1);
   if(idx>=w)add(idx-w);if(idx<(h-1)*w)add(idx+w);
  }
  ctx.putImageData(image,0,0);
  wrap.classList.add('is-cutout');
 }catch(err){console.warn('Could not isolate original character image; keep original:',err);}
}
function loadPortrait(id,canvasId,wrapId){
 const img=$(id),run=()=>peelWhiteBackground(img,$(canvasId),$(wrapId));
 if(img.complete&&img.naturalWidth)run();
 else img.addEventListener('load',run,{once:true});
 img.addEventListener('error',()=>notify('原始人物图加载失败，请确认 GitHub Pages 资源状态'),{once:true});
}
bind();
loadPortrait('hero-original','hero-cutout','hero-wrap');
loadPortrait('vampire-original','vampire-cutout','vampire-wrap');
render();
dialog($('intro'),true);
window.__hunterVampireDuel=Object.freeze({
 get state(){return battle.snapshot();},
 action:id=>battle.play(id),
 draw:()=>battle.drawHand(),
 move:lane=>battle.move(lane),
 endTurn:()=>battle.endTurn(),
 reset:()=>reset(true),
 version:'2.0.0-fanned-hand'
});
})();