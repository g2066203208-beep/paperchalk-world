// Native 384x512 fidelity inspector: no enlarged fake pixels, no source changes.
// All PNGs are built by the Python native-detail model in GitHub Actions.
const root=document.querySelector('#v3-native');
if(root){
 const sel=(q)=>root.querySelector(q);
 const naming={A_dynamic:'动态姿势',B_standing:'正常站姿'};
 const views=['original','coarse192','generated384','masked_repair384'];
 const anchors={face:[185,104],hair:[194,65],costume:[196,246],shoes:[205,460]};
 const images={};
 let report=null,epoch=0,pose='B_standing',area='face',zoom=12,showGrid=true;
 const dim={width:384,height:512};
 const files={};
 for(const n of views)images[n]=sel('[data-v3-image="'+n+'"]');
 const out=sel('#v3-readout'),stats=sel('#v3-metrics');
 const prefix='./style2/v3/';
 function within(n,min,max){return Math.max(min,Math.min(max,n))}
 function paint(which){
  const original=images[which],canvas=sel('[data-v3-zoom="'+which+'"]');
  if(!canvas||!original?.complete||original.naturalWidth!==384)return;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.clearRect(0,0,384,384);
  ctx.imageSmoothingEnabled=false;
  const side=384/zoom,c=anchors[area];
  const x=within(Math.round(c[0]-side/2),0,384-side);
  const y=within(Math.round(c[1]-side/2),0,512-side);
  canvas.dataset.startX=x;canvas.dataset.startY=y;
  ctx.drawImage(original,x,y,side,side,0,0,384,384);
  if(showGrid){
   ctx.beginPath();ctx.strokeStyle='rgba(255,255,255,.43)';ctx.lineWidth=.75;
   for(let k=0;k<=side;k++){
    const p=k*zoom+.5;ctx.moveTo(p,0);ctx.lineTo(p,384);
    ctx.moveTo(0,p);ctx.lineTo(384,p);
   }
   ctx.stroke();
  }
 }
 function repaint(){paint('original');paint('generated384')}
 async function load(){
  const id=++epoch,key=sel('#v3-pose').value;
  pose=key;out.textContent='正在读取 384×512 原生像素…';
  const downloads=views.map(async name=>{
   const src=prefix+key+'_'+name+'.png';
   files[name]=src;
   const img=images[name];
   img.src=src;
   await img.decode();
   if(img.naturalWidth!==dim.width||img.naturalHeight!==dim.height)throw Error('Source is not 384×512: '+src);
  });
  await Promise.all(downloads);
  if(id!==epoch)return;
  const sample=report.results.find(v=>v.asset===key);
  if(sample){
   const a=(sample.guide_foreground_accuracy*100).toFixed(2);
   const b=(sample.model_foreground_accuracy*100).toFixed(2);
   stats.textContent=naming[key]+'：192×256 放大前景像素匹配率 '+a+'%；384×512 模型前景匹配率 '+b+'%。'+
    '模型恢复先前丢失的像素 '+(sample.lost_pixel_recovery_by_model*100).toFixed(2)+'%；'+
    '遮挡修复 '+(sample.masked58_recovery*100).toFixed(2)+'%，已知像素全部保持：'+(sample.visible_locked?'是':'否')+'。'+
    (b>a?' 该样本前景测试超过基线。':' 注意：本样本前景还没有超过基线，未通过美术质量门槛。');
  }
  sel('#v3-save').href=files.generated384;
  sel('#v3-save').download='D-'+key+'-learned-detail-384x512.png';
  repaint();
  out.textContent='每格是 384×512 母版的一个原生像素；放大网格只是显示层。';
  root.dataset.ready='true';
 }
 async function start(){
  const r=await fetch(prefix+'report.json',{cache:'no-store'});
  if(!r.ok)throw Error('V3 trained report has not been deployed');
  report=await r.json();
  if(report.grid[0]!==384||report.grid[1]!==512||report.results.length!==2)
   throw Error('Invalid native model verification report');
  await load();
 }
 sel('#v3-pose').addEventListener('change',()=>load().catch(err=>{out.textContent=err.message;root.dataset.ready='false'}));
 sel('#v3-area').addEventListener('change',e=>{area=e.target.value;repaint()});
 sel('#v3-zoom').addEventListener('change',e=>{zoom=Number(e.target.value);repaint()});
 sel('#v3-grid').addEventListener('change',e=>{showGrid=e.target.checked;repaint()});
 for(const key of ['original','generated384']){
  const canvas=sel('[data-v3-zoom="'+key+'"]');
  canvas.addEventListener('click',event=>{
   const r=canvas.getBoundingClientRect();
   const scale=384/zoom,x=+canvas.dataset.startX+Math.floor((event.clientX-r.left)*scale/r.width);
   const y=+canvas.dataset.startY+Math.floor((event.clientY-r.top)*scale/r.height);
   const sample=document.createElement('canvas');sample.width=384;sample.height=512;
   const c=sample.getContext('2d',{willReadFrequently:true});
   c.drawImage(images[key],0,0);
   const pixel=c.getImageData(x,y,1,1).data;
   const color='#'+[...pixel].slice(0,3).map(v=>v.toString(16).padStart(2,'0').toUpperCase()).join('');
   out.textContent=(key==='original'?'原始母版':'模型预测')+' 像素 ('+x+', '+y+') = '+color;
  });
 }
 start().catch(err=>{out.textContent='V3 未能读取：'+err.message;root.dataset.ready='false'});
}
