/* Original synthesized instrument kit. No sample files and no soundtrack playback. */
(() => {
'use strict';
class CabinetSound{
 constructor(){
  this.ac=null;this.master=null;this.noise=null;this.nextBeat=0;this.beat=0;this.lastImpact=-1;
  try{this.enabled=localStorage.getItem('cabinet.study.sound')!=='off'}catch{this.enabled=true}
 }
 unlock(){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{
   if(!this.ac){
    this.ac=new AC();this.master=this.ac.createGain();this.master.gain.value=.80;
    const limiter=this.ac.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=6;
    this.master.connect(limiter).connect(this.ac.destination);
    this.noise=this.ac.createBuffer(1,this.ac.sampleRate*.5,this.ac.sampleRate);
    const a=this.noise.getChannelData(0);let r=180721;
    for(let i=0;i<a.length;i++){r=(Math.imul(r,1664525)+1013904223)>>>0;a[i]=((r>>>18)/8192-1)*.72;}
   }
   if(this.ac.state==='suspended'&&this.enabled)this.ac.resume().catch(()=>{});
  }catch{}
 }
 get live(){return this.enabled&&this.ac?.state==='running'}
 setEnabled(value){
  this.enabled=value;if(value)this.unlock();
  else if(this.ac?.state==='running')this.ac.suspend().catch(()=>{});
  try{localStorage.setItem('cabinet.study.sound',value?'on':'off')}catch{}
 }
 suspend(){if(this.ac?.state==='running')this.ac.suspend().catch(()=>{});this.nextBeat=0}
 connect(source,seconds,volume,pan,when,attack=.002){
  const ac=this.ac,g=ac.createGain();
  g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.00015,volume),when+attack);
  g.gain.exponentialRampToValueAtTime(.0001,when+seconds);
  source.connect(g);
  const p=ac.createStereoPanner?ac.createStereoPanner():null;
  if(p){p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p).connect(this.master)}
  else g.connect(this.master);
  return ()=>{source.disconnect();g.disconnect();p?.disconnect()};
 }
 tone(hz,length,type,volume,end=hz,pan=0,delay=0){
  if(!this.live)return;
  const t=this.ac.currentTime+delay,o=this.ac.createOscillator();o.type=type;
  o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+length);
  o.onended=this.connect(o,length,volume,pan,t);o.start(t);o.stop(t+length+.012);
 }
 hiss(hz,length,volume,pan=0,delay=0,Q=.64){
  if(!this.live)return;
  const ac=this.ac,t=ac.currentTime+delay,source=ac.createBufferSource(),filter=ac.createBiquadFilter();
  filter.type='bandpass';filter.frequency.value=hz;filter.Q.value=Q;source.buffer=this.noise;source.connect(filter);
  const disconnect=this.connect(filter,length,volume,pan,t);
  source.onended=()=>{disconnect();source.disconnect()};source.start(t);source.stop(t+length+.008);
 }
 coin(e){
  if(!this.live)return;
  const t=this.ac.currentTime;
  if(t-this.lastImpact<.014&&e.kind!=='chute')return;
  this.lastImpact=t;const power=Math.min(1,e.power||.4),pan=e.pan??-.55;
  if(e.kind==='felt'){this.hiss(690,.037,.14*power,pan);this.tone(540,.051,'triangle',.058*power,413,pan);return}
  const pitch=Math.max(740,Math.min(2600,e.frequency||1220));
  const gain=(e.kind==='coin'?.19:.13)*Math.max(.18,power);
  this.tone(pitch,.139,'sine',gain,pitch*.99,pan);
  this.tone(pitch*1.56,.093,'sine',gain*.49,pitch*1.53,pan);
  this.tone(pitch*2.7,.048,'triangle',gain*.22,pitch*2.58,pan);
  this.hiss(e.kind==='wall'?3460:2380,.032,gain*.6,pan);
 }
 event(name,e){
  if(!this.live)return;
  const direction=((e.i??2)-2)*.24;
  switch(name){
   case 'tick':this.hiss(1480,.022,.042,-.18);break;
   case 'press':this.tone(109,.06,'triangle',.24,34);this.hiss(720,.033,.15);break;
   case 'latch':this.hiss(1600,.082,.22,direction);this.tone(137,.095,'triangle',.22,47,direction);break;
   case 'focus':this.tone(411+(e.i||0)*54,.078,'triangle',.075,390,direction);break;
   case 'impact':
    if(e.damage){this.hiss(e.item==='bow'?2340:1680,e.crit?.17:.10,.22,direction);this.tone(e.crit?207:152,.16,'sawtooth',.095,44,direction)}
    if(e.armor){this.tone(479,.16,'triangle',.115,335,.1);this.tone(1023,.10,'sine',.068,869,.19)}
    if(e.crit){[617,824,1234].forEach((h,i)=>this.tone(h,.20,'triangle',.095,h*1.002,-.15+i*.15,i*.046))}
    break;
   case 'enemyHit':this.hiss(1570,.23,.31,.64);this.tone(142,.28,'sawtooth',.15,33,.55);this.tone(1230,.115,'triangle',.10,396,.68);break;
   case 'payout':[349,440,523,699].forEach((h,i)=>this.tone(h,.19,'triangle',.10,h,0,i*.072));break;
   case 'purchase':this.tone(710,.085,'sine',.10,754,-.05);this.tone(1120,.15,'triangle',.081,1290,.16,.067);break;
   case 'deny':this.tone(110,.17,'square',.041,61);break;
   case 'end':this.tone(175,.67,'triangle',.14,32);break;
  }
 }
 pump(g){
  if(!this.live||g.paused)return;const t=this.ac.currentTime;
  if(!this.nextBeat||this.nextBeat<t-.10)this.nextBeat=t+.045;
  const tick=60/86/4;
  while(this.nextBeat<t+.10){
   const n=this.beat++%32,delay=Math.max(0,this.nextBeat-t)+(n%2?.018:0);
   const intensity=g.phase==='shop'?.65:1;
   if(n%8===0||n===19||n===27)this.tone(106,.18,'sine',.11*intensity,38,0,delay);
   if(n%8===4){this.hiss(1810,.115,.085*intensity,.09,delay);this.tone(168,.09,'triangle',.047,122,0,delay)}
   if(n%2===0||n===15||n===29)this.hiss(5400,n%8===6?.065:.027,(n%4===0?.039:.024)*intensity,-.16,delay,1.1);
   if(n===0||n===6||n===16||n===23){const f=[65.41,77.78,58.27,51.91][(this.beat>>3)%4];this.tone(f,.27,'triangle',.047*intensity,f*.995,.04,delay)}
   this.nextBeat+=tick;
  }
 }
}
window.CabinetSound=CabinetSound;
})();
