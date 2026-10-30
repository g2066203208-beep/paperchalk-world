// Research gallery for System 02. Only displays actual saved trained outputs.
// No inference or generated-art claims are made in the static browser itself.
const ROOT=document.getElementById('pixel-v2');
if(ROOT){
 const canvasNames=['reference','blueprint','generated','repaired'];
 const canvases=canvasNames.map(n=>ROOT.querySelector('[data-v2-canvas="'+n+'"]'));
 const picker=ROOT.querySelector('#pixel-v2-family');
 const toggle=ROOT.querySelector('#pixel-v2-grid');
 const status=ROOT.querySelector('#pixel-v2-status');
 const metrics=ROOT.querySelector('#pixel-v2-metrics');
 const colors=['#393657','#F2A5C2','#A9BAE9','#FFF5E6'];
 const labels={potion:'药水',lantern:'灯笼',chest:'宝箱',tree:'树木',cottage:'房屋',A_dynamic:'动态人物',B_standing:'站姿人物'};
 let dataset=null;
 let epoch=0;
 async function unpack(encoded){
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  const raw=new Uint8Array(await new Response(stream).arrayBuffer());
  if(raw.length!==48*64||raw.some(i=>i>3))throw Error('Invalid 48x64 four-color token array');
  return raw;
 }
 function draw(canvas,pixels,grid){
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.imageSmoothingEnabled=false;
  for(let y=0;y<64;y++)for(let x=0;x<48;x++){
   ctx.fillStyle=colors[pixels[y*48+x]];
   ctx.fillRect(x*8,y*8,8,8);
  }
  if(grid){
   ctx.beginPath();ctx.strokeStyle='rgba(255,255,255,.44)';ctx.lineWidth=.7;
   for(let x=0;x<=48;x++){let n=x*8+.5;ctx.moveTo(n,0);ctx.lineTo(n,512);}
   for(let y=0;y<=64;y++){let n=y*8+.5;ctx.moveTo(0,n);ctx.lineTo(384,n);}
   ctx.stroke();
  }
  canvas._pixelTokens=pixels;
 }
 async function render(){
  if(!dataset)return;
  const key=picker.value, sample=dataset.samples.find(s=>s.name===key);
  if(!sample)return;
  const run=++epoch;
  const all=await Promise.all(canvasNames.map(n=>unpack(sample[n])));
  if(run!==epoch)return;
  all.forEach((pixels,i)=>draw(canvases[i],pixels,toggle.checked));
  const item=dataset.report.held_out_procedural.find(x=>x.category===key);
  metrics.textContent=item
    ?'未见过的程序化参数测试：生成像素正确率 '+(item.generated_all*100).toFixed(1)+'%，仅复制形体蓝图的基线 '+(item.guided_layout_baseline*100).toFixed(1)+'%，前景像素召回 '+(item.generated_foreground_recall*100).toFixed(1)+'%，遮挡修复 '+(item.recover_hidden*100).toFixed(1)+'%。'
    :'原有角色姿势：训练阶段已见到该角色。展示的是模型生成与修复效果，不是新角色泛化测试。人物蓝图由已知样本提取。';
  status.textContent=labels[key]+' · 48×64 原生像素 · 准确四种 D 色';
 }
 picker.addEventListener('change',()=>render().catch(e=>status.textContent=e.message));
 toggle.addEventListener('change',()=>render().catch(e=>status.textContent=e.message));
 for(const canvas of canvases){
  canvas.addEventListener('click',event=>{
   if(!canvas._pixelTokens)return;
   const r=canvas.getBoundingClientRect();
   const x=Math.max(0,Math.min(47,Math.floor((event.clientX-r.left)/r.width*48)));
   const y=Math.max(0,Math.min(63,Math.floor((event.clientY-r.top)/r.height*64)));
   status.textContent='像素 ('+x+','+y+') = '+colors[canvas._pixelTokens[y*48+x]]+' · 单格就是一个原生像素';
  });
 }
 try{
  const res=await fetch('./style2/diffusion-v2-gallery.json',{cache:'no-store'});
  if(!res.ok)throw Error('实验结果尚未发布');
  dataset=await res.json();
  if(dataset.palette.join(',')!==colors.join(',')||dataset.samples.length<7)throw Error('Data validation failure');
  const sorted=dataset.samples.slice().sort((a,b)=>a.category-b.category);
  picker.replaceChildren(...sorted.map(s=>{const o=document.createElement('option');o.value=s.name;o.textContent=labels[s.name]||s.name;return o;}));
  picker.value='B_standing';
  await render();
  ROOT.dataset.ready='true';
 }catch(err){status.textContent='真实训练结果未加载：'+err.message;ROOT.dataset.ready='false';}
}
