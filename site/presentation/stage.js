/** Presentation adapter: web audio + CSS puppet / bubble. Never mutates the simulator. */
export function createStage(scene){
 const box=document.createElement('div');box.id='cinema-bubble';box.className='cinema-bubble';box.setAttribute('aria-live','polite');box.hidden=true;
 const label=document.createElement('small'),line=document.createElement('p');box.append(label,line);scene.append(box);
 const audioButton=document.createElement('button');
 audioButton.type='button';audioButton.className='cinema-audio';audioButton.title='切换音效';audioButton.setAttribute('aria-label','切换音效');audioButton.textContent='♪';
 scene.append(audioButton);
 let ctx=null,muted=true,hideTimer=null;
 function cue(tone='paper'){
   if(muted)return;
   try{
     const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
     ctx??=new AudioContext();
     if(ctx.state==='suspended')ctx.resume();
     const osc=ctx.createOscillator(),gain=ctx.createGain();
     osc.type='triangle';osc.frequency.value=tone==='bell'?660:tone==='phone'?430:tone==='step'?210:295;
     const now=ctx.currentTime;
     gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.065,now+.018);
     gain.gain.exponentialRampToValueAtTime(.0001,now+(tone==='bell'?.33:.12));
     osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+(tone==='bell'?.34:.14));
   }catch{muted=true;audioButton.textContent='♪';}
 }
 audioButton.addEventListener('click',()=>{
   muted=!muted;audioButton.textContent=muted?'♪':'♫';
   audioButton.setAttribute('aria-pressed',String(!muted));
   if(!muted)cue('bell');
 });
 function speak(speaker,text,kind='normal'){
   clearTimeout(hideTimer);
   label.textContent=speaker;line.textContent=text;
   box.hidden=false;scene.classList.add('puppet-speaking','scene-talking');
   box.classList.toggle('cinema-news',kind==='news');
   cue(kind==='news'?'bell':'paper');
   hideTimer=setTimeout(()=>{box.hidden=true;scene.classList.remove('puppet-speaking','scene-talking');},4200);
 }
 function transition(){
   scene.classList.remove('scene-turning');
   void scene.offsetWidth;
   scene.classList.add('scene-turning');
   cue('step');
   setTimeout(()=>scene.classList.remove('scene-turning'),780);
 }
 return Object.freeze({speak,transition,cue,setMuted(value){muted=!!value;audioButton.textContent=muted?'♪':'♫';}});
}
