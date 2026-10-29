const $=s=>document.querySelector(s);
let model=null,tab='generated',display=[],tick=20261029;
function rng(){tick=(Math.imul(1664525,tick)+1013904223)>>>0;return tick/4294967296;}
function setSeed(n){tick=(Number(n)>>>0)||20261029;}
const swatches=palette=>palette.map(c=>c.map(v=>Math.round(v)));
function draw(canvas,entry){
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.clearRect(0,0,16,16);
 const img=ctx.createImageData(16,16),palette=entry.palette;
 for(let i=0;i<256;i++){
  const t=entry.tokens[i];
  if(t>0&&t<palette.length){
   const c=palette[t];
   img.data[i*4]=c[0];img.data[i*4+1]=c[1];img.data[i*4+2]=c[2];img.data[i*4+3]=255;
  }
 }
 ctx.putImageData(img,0,0);
}
function render(entries){
 display=entries;
 const gallery=$('#gallery');gallery.replaceChildren();
 for(let i=0;i<entries.length;i++){
  const e=entries[i],cell=document.createElement('div');cell.className='cell';
  const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;
  cell.append(canvas);draw(canvas,e);
  const caption=document.createElement('small');
  caption.textContent=(tab==='generated'?'模型生成 #':'真实素材 #')+String(i+1).padStart(2,'0')+(e.source_id?' · '+e.source_id:'');
  cell.append(caption);gallery.append(cell);
 }
}
function latentSample(){
 const values=model.latent_values,policy=model.latent_policy;
 return policy.map(row=>{
  const mx=Math.max(...row),weights=row.map(v=>Math.exp(v-mx)),sum=weights.reduce((a,b)=>a+b,0);
  let p=rng()*sum;
  for(let i=0;i<weights.length;i++){p-=weights[i];if(p<=0)return values[i];}
  return values.at(-1);
 });
}
function decode(latent){
 const {w2,b2,w3,b3}=model.decoder;
 const hidden=b2.map((bias,j)=>{
  let value=bias;
  for(let k=0;k<latent.length;k++)value+=latent[k]*w2[k][j];
  return Math.max(0,value);
 });
 const out=Array(256).fill(0);
 for(let i=0;i<256;i++){
  let best=-Infinity,bestToken=0;
  for(let k=0;k<8;k++){
   const col=i*8+k;let v=b3[col];
   for(let j=0;j<hidden.length;j++)v+=hidden[j]*w3[j][col];
   if(v>best){best=v;bestToken=k;}
  }
  out[i]=bestToken;
 }
 return out;
}
function novelBatch(count=32){
 const all=[],seen=new Set();
 for(let i=0;i<count*9&&all.length<count;i++){
  const tokens=decode(latentSample());
  const alpha=tokens.filter(x=>x>0).length;
  if(alpha<15||alpha>232)continue;
  const key=tokens.join(',');
  if(seen.has(key))continue;
  seen.add(key);
  const palette=model.palettes[Math.floor(rng()*model.palettes.length)];
  all.push({tokens,palette});
 }
 return all;
}
function switchTab(name){
 tab=name;for(const button of document.querySelectorAll('[data-tab]'))
  button.classList.toggle('active',button.dataset.tab===name);
 const generated=name==='generated';
 $('#gallery-title').textContent=generated?'生成的角色，不是参考图':'原始 CC0 人物参考集';
 $('#gallery-subtitle').textContent=generated?'TRAINED MODEL · PIXEL OUTPUT':'LICENSED ORIGINALS · STRICT 16×16';
 $('#gallery-description').textContent=generated?
  '真实 VAE 解码器生成的 16×16 像素图；可以检查造型缺陷与训练结果。':
  '直接从原始获许可人物精灵图中提取，没有插值、没有人工重绘。';
 $('#generate').textContent=generated?'生成新一批':'查看下一组';
 if(generated)render(model.generated.slice(0,32));
 else render(model.real_samples.slice(0,32));
}
function chart(points){
 const el=$('#loss'),ns='http://www.w3.org/2000/svg';
 el.replaceChildren();
 if(!points?.length)return;
 const a=points.map(p=>p.recon_ce),mn=Math.min(...a),mx=Math.max(...a);
 const coords=a.map((v,i)=>
  (14+i/(a.length-1)*373).toFixed(1)+','+(97-(v-mn)/Math.max(.001,mx-mn)*79).toFixed(1)).join(' ');
 const grid=document.createElementNS(ns,'path');
 grid.setAttribute('d','M0 30 H400 M0 70 H400 M0 105 H400');
 grid.setAttribute('stroke','#385358');grid.setAttribute('fill','none');grid.setAttribute('stroke-dasharray','3 6');el.append(grid);
 const poly=document.createElementNS(ns,'polyline');
 poly.setAttribute('points',coords);poly.setAttribute('stroke','#b3d9b9');
 poly.setAttribute('stroke-width','2.8');poly.setAttribute('fill','none');el.append(poly);
}
function sources(list){
 const box=$('#sources');box.replaceChildren();
 for(const s of list){
  const item=document.createElement('div');item.className='source'+(s.accepted_frames?'':' inactive');
  const a=document.createElement('a');a.href=s.source;a.target='_blank';a.rel='noopener';
  a.textContent=s.id+' · CC0';item.append(a);
  const n=document.createElement('b');n.textContent=String(s.accepted_frames);item.append(n);box.append(item);
 }
}
function initHandlers(){
 for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>switchTab(b.dataset.tab));
 $('#generate').addEventListener('click',()=>{
  setSeed($('#seed').value);render(tab==='generated'?novelBatch(32):model.real_samples.slice(16,48));
 });
}
async function init(){
 try{
  const res=await fetch('./characters.json',{cache:'no-cache'});
  if(!res.ok)throw Error('GitHub Actions 训练文件还未发布 (HTTP '+res.status+')');
  model=await res.json();
  if(model.format!=='pixel-lab-character-generator-v1')throw Error('不兼容的训练权重');
  const r=model.report;
  $('#n-images').textContent=r.image_count;
  $('#n-sources').textContent=r.source_count;
  $('#accuracy').textContent=(100*r.metrics.source_disjoint_validation_accuracy).toFixed(1)+'%';
  $('#rl-count').textContent=r.rl.episodes;
  $('#status').textContent='完成真实训练 · '+r.image_count+' 张原生人物帧 · '+r.source_count+' 个 CC0 素材来源 · '+r.step_count+' 步 VAE · '+r.rl.episodes+' 回合 REINFORCE';
  $('#training-text').textContent='VAE '+r.step_count+' 步 · holdout '+r.holdout_images+' · 几何奖励 '+r.rl.prior_reward+' → '+r.rl.reinforced_reward;
  chart(r.loss_curve);sources(r.source_stats);switchTab('generated');initHandlers();
  window.__CHARACTER_MODEL__={get model(){return model;},get display(){return display;},decode,novelBatch,switchTab};
 }catch(e){
  console.error(e);$('#status').textContent='训练输出校验失败：'+e.message;
  $('#gallery').textContent=e.message;
 }
}
init();
