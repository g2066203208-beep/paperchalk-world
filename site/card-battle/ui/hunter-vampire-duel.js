/* Hunter × Vampire complete encounter UI. Never substitutes AI-generated art
 * for the two original Anima character assets. */
(function(){
'use strict';
const rules=window.PaperchalkHunterVampireDuel;
if(!rules)throw Error('缺失 HunterVampireDuel 战斗规则');
const battle=rules.create(),$=id=>document.getElementById(id);
const ui={hero:$('fighter-hunter'),boss:$('fighter-vampire'),heroEffect:$('hero-effect'),bossEffect:$('vampire-effect'),hand:$('hand'),intro:$('intro'),result:$('results')};
let playing=false,busy=false,sound=false,audioContext=null,toaster=null,fxTimers=[];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const two=n=>String(n).padStart(2,'0');
const safeDialog=(node,show)=>{if(!node)return;if(show){if(!node.open&&node.showModal)node.showModal();else if(!node.open)node.setAttribute('open','');}
else if(node.open){if(node.close)node.close();else node.removeAttribute('open');}};
function toast(t){
 $('battle-toast').textContent=t;
 if(toaster)clearTimeout(toaster);
 $('battle-toast').style.opacity='1';
 toaster=setTimeout(()=>{$('battle-toast').style.opacity='.86'},1800);
}
function tone(freq=200,seconds=.08,type='sine',gain=.05){
 if(!sound)return;
 try{
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)return;
  if(!audioContext)audioContext=new C();
  if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  const o=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime;
  o.type=type;o.frequency.setValueAtTime(freq,t);
  o.frequency.exponentialRampToValueAtTime(Math.max(50,freq*.63),t+seconds);
  g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+seconds);
  o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+seconds+.02);
 }catch(e){}
}
function pop(which,label,kind){
 const node=which==='hero'?ui.heroEffect:ui.bossEffect;
 node.className='sprite-status '+(kind||'')+' show';
 node.textContent=label;
 void node.offsetWidth;
 node.classList.remove('show');void node.offsetWidth;node.classList.add('show');
}
function gesture(which,name,ms=380){
 const node=which==='hero'?ui.hero:ui.boss;
 node.classList.remove('attack','hurt','dodge');
 void node.offsetWidth;node.classList.add(name);
 setTimeout(()=>node.classList.remove(name),ms);
}
function bullet(){
 const host=$('shots'),frame=host.getBoundingClientRect(),a=$('hero-wrap').getBoundingClientRect(),b=$('vampire-wrap').getBoundingClientRect();
 const x1=a.left+a.width*.65-frame.left,y1=a.top+a.height*.52-frame.top;
 const x2=b.left+b.width*.42-frame.left,y2=b.top+b.height*.43-frame.top;
 const dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy);
 const line=document.createElement('div');line.className='bullet-trail';
 line.style.left=x1+'px';line.style.top=y1+'px';line.style.width=l+'px';
 line.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';
 host.append(line);setTimeout(()=>line.remove(),420);
}
function bullets(container,value,max,style){
 container.replaceChildren();
 for(let i=0;i<max;i++){const pip=document.createElement('i');if(i>=value)pip.className='empty';pip.setAttribute('aria-hidden','true');container.append(pip);}
 container.setAttribute('aria-label',(style==='ammo'?'弹药':'行动点')+value+'/'+max);
}
function render(){
 const s=battle.snapshot(),h=s.hunter,v=s.vampire;
 $('turn-count').textContent=two(s.turn);
 $('hero-hpbar').style.width=(h.hp/h.maxHp*100)+'%';
 $('boss-hpbar').style.width=(v.hp/v.maxHp*100)+'%';
 $('hero-hp').textContent=h.hp+' / '+h.maxHp;
 $('boss-hp').textContent=v.hp+' / '+v.maxHp;
 $('hero-shield').hidden=!h.block;$('hero-shield').textContent='护盾 '+h.block;
 $('hero-focus').hidden=!h.focus;$('hero-focus').textContent='蓄力 '+h.focus;
 $('boss-shield').hidden=!v.block;$('boss-shield').textContent='护盾 '+v.block;
 $('boss-seal').hidden=!v.silver;
 $('boss-seal').textContent='银弹封疗 · '+v.silver;
 bullets($('ap-pips'),s.ap,s.maxAP,'ap');bullets($('ammo-pips'),h.ammo,h.maxAmmo,'ammo');
 $('intent-name').textContent=s.intent.title;
 $('intent-icon').textContent=s.intent.symbol;
 $('intent-desc').textContent=s.intent.text;
 $('intent-panel').classList.toggle('is-safe',['ward','flit'].includes(s.intent.kind));
 $('end-turn').disabled=!playing||busy||s.phase!=='player';
 $('deck-status').textContent='第 '+s.turn+' 回合 · 手牌剩余 '+s.hand.length+' 张';
 const canMove=playing&&!busy&&s.phase==='player'&&s.ap>=1;
 for(const btn of document.querySelectorAll('[data-lane]')){
  const lane=Number(btn.dataset.lane);
  btn.classList.toggle('is-hunter',lane===h.lane);
  btn.classList.toggle('is-vampire',lane===v.lane);
  btn.classList.toggle('is-danger',s.intent.lane===lane&&s.intent.damage>0);
  btn.querySelector('small').textContent=(lane===h.lane?'● 猎人 ':'')+(lane===v.lane?'◆ 血族':'')||(s.intent.lane===lane&&s.intent.damage>0?'✕ 危险':'');
  btn.disabled=!canMove||lane===h.lane;
  btn.setAttribute('aria-pressed',String(lane===h.lane));
 }
 const frag=document.createDocumentFragment();
 for(let k=0;k<s.hand.length;k++){
  const id=s.hand[k],c=rules.CARD_LIST.find(x=>x.id===id);
  if(!c)continue;
  const button=document.createElement('button');button.type='button';button.className='action-card'+(c.silver?' is-silver':'');
  button.disabled=!playing||busy||s.phase!=='player'||!!battle.canPlay(id);
  button.setAttribute('aria-label',c.name+'。消耗'+c.cost+'行动点。'+c.detail);
  // All interpolated strings originate from the hard-coded, reviewed rule catalogue.
  button.innerHTML='<span class="cost">'+c.cost+'</span><span class="mark">'+c.mark+'</span><span class="card-name">'+c.name+'</span><span class="en">'+c.en+'</span><span class="detail">'+c.detail+'</span>'+(c.ammo?'<span class="ammo-cost">◈ '+c.ammo+'</span>':'');
  button.addEventListener('click',()=>act(()=>battle.play(id)));
  frag.append(button);
 }
 ui.hand.replaceChildren(frag);
 if(!s.hand.length&&s.ap>0)$('hint').textContent='手牌已经使用完 · 可选择站位，或结束回合';
 else $('hint').textContent='点击战术牌使用 · 与吸血鬼同一路线射击伤害+2';
 if(['victory','defeat'].includes(s.phase))showResult(s);
}
function showResult(s){
 if(ui.result.open)return;
 $('result-title').textContent=s.result?.title||'战斗结束';
 $('result-subtitle').textContent=s.result?.subtitle||'';
 $('result-round').textContent=s.turn;
 $('result-cards').textContent=s.plays;
 $('result-dodges').textContent=s.dodges;
 setTimeout(()=>safeDialog(ui.result,true),650);
}
async function effects(events){
 for(const e of events){
  if(e.type==='shot'){
   gesture('hero','attack',340);bullet();tone(e.silver?630:220,.13,e.silver?'sine':'sawtooth',.045);
   await delay(140);gesture('boss','hurt',250);
   pop('boss','−'+e.amount,'damage');
   if(e.silver)toast('银弹命中 · 血族短时间内无法回血');
   else toast(e.text);
   await delay(260);
  }else if(e.type==='hurt'){
   gesture('boss','attack',250);tone(110,.16,'sawtooth',.07);
   await delay(180);gesture('hero','hurt',320);pop('hero',e.amount?'−'+e.amount:'格挡','damage');
   toast(e.text);await delay(280);
  }else if(e.type==='dodge'){
   gesture('hero','dodge',360);pop('hero','闪避成功','dodge');tone(440,.07);toast(e.text);await delay(300);
  }else if(e.type==='ward'){
   pop('boss','护盾 +'+e.amount,'heal');tone(270,.13);
   toast(e.text);await delay(260);
  }else if(e.type==='heal'){
   pop('boss','+'+e.amount,'heal');toast(e.text);await delay(170);
  }else if(e.type==='move'){
   gesture('hero','dodge',210);tone(310,.04);toast(e.text);await delay(160);
  }else if(e.type==='focus'||e.type==='guard'||e.type==='reload'){
   pop('hero',e.type==='focus'?'蓄力 +'+e.amount:e.type==='guard'?'护盾 +'+e.amount:'弹药 +'+e.amount,'heal');
   tone(560,.07);toast(e.text);await delay(200);
  }else if(e.type==='sealed'){toast(e.text);await delay(160);}
  else if(e.type==='enemy-turn'){toast(e.text);await delay(310);}
  else if(e.type==='victory'||e.type==='defeat'){toast(e.text);}
  else if(e.type==='turn'){toast(e.text);}
 }
}
async function act(callback){
 if(!playing||busy)return;
 const output=callback();
 if(!output.ok){toast(output.reason);tone(130,.04,'triangle',.025);return;}
 busy=true;render();
 try{await effects(output.events);}finally{busy=false;render();}
}
function reset(start=true){
 battle.reset();busy=false;playing=start;
 safeDialog(ui.result,false);
 render();toast('预告已刷新 · 选择战术牌或调整路线');
}
function bind(){
 $('start-game').addEventListener('click',()=>{playing=true;safeDialog(ui.intro,false);render();tone(340,.1)});
 $('retry-game').addEventListener('click',()=>reset(true));
 $('restart-top').addEventListener('click',()=>reset(true));
 $('end-turn').addEventListener('click',()=>act(()=>battle.endTurn()));
 document.querySelectorAll('[data-lane]').forEach(btn=>btn.addEventListener('click',()=>act(()=>battle.move(Number(btn.dataset.lane)))));
 $('open-help').addEventListener('click',()=>safeDialog($('help'),true));
 $('close-help').addEventListener('click',()=>safeDialog($('help'),false));
 $('sound').addEventListener('click',()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').innerHTML='♪ <span>声音'+(sound?'开':'关')+'</span>';if(sound)tone(620,.09)});
 document.addEventListener('keydown',e=>{
  if(!playing||busy||ui.intro.open||ui.result.open||$('help').open||e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.key==='ArrowLeft')act(()=>battle.move(Math.max(0,battle.snapshot().hunter.lane-1)));
  if(e.key==='ArrowRight')act(()=>battle.move(Math.min(2,battle.snapshot().hunter.lane+1)));
  if(e.key.toLowerCase()==='e')act(()=>battle.endTurn());
 });
}
function removeWhiteFlood(img,canvas,wrap){
 try{
  const w=img.naturalWidth||704,h=img.naturalHeight||1024;
  if(!w||!h)return;
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);
  const frame=ctx.getImageData(0,0,w,h),p=frame.data;
  const max=w*h,queue=new Int32Array(max),visited=new Uint8Array(max);
  let head=0,tail=0;
  const nearWhite=i=>{
   const off=i*4,r=p[off],g=p[off+1],b=p[off+2];
   return r>229&&g>229&&b>229&&Math.max(r,g,b)-Math.min(r,g,b)<27;
  };
  function offer(i){if(visited[i])return;visited[i]=1;if(nearWhite(i))queue[tail++]=i;}
  for(let x=0;x<w;x++){offer(x);offer((h-1)*w+x);}
  for(let y=0;y<h;y++){offer(y*w);offer(y*w+w-1);}
  while(head<tail){
   const i=queue[head++],x=i%w,off=i*4;
   p[off+3]=0;
   if(x>0)offer(i-1);if(x<w-1)offer(i+1);
   if(i>=w)offer(i-w);if(i<max-w)offer(i+w);
  }
  // Only border-connected near-white pixels are removed. Light-colored
  // clothing and skin inside the silhouette remain intact.
  ctx.putImageData(frame,0,0);
  wrap.classList.add('is-cutout');
 }catch(e){console.warn('自动分离白底失败，保留原画：',e);}
}
function loadPortrait(imgId,canvasId,wrapId){
 const img=$(imgId);
 const run=()=>removeWhiteFlood(img,$(canvasId),$(wrapId));
 if(img.complete&&img.naturalWidth)run();
 else img.addEventListener('load',run,{once:true});
 img.addEventListener('error',()=>toast('原画加载失败，请检查 GitHub 图片路径'),{once:true});
}
bind();loadPortrait('hero-original','hero-cutout','hero-wrap');
loadPortrait('vampire-original','vampire-cutout','vampire-wrap');
render();
safeDialog(ui.intro,true);
window.__hunterVampireDuel=Object.freeze({
 snapshot:()=>battle.snapshot(),
 action:id=>battle.play(id),
 move:lane=>battle.move(lane),
 endTurn:()=>battle.endTurn(),
 reset:()=>reset(true),
 version:'1.0.0'
});
})();
