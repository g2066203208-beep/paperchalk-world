const $=sel=>document.querySelector(sel);
let model=null,policy=null,original=[],damaged=[],predicted=[],selected=0,replayTimer=null;
const color=(token)=>token===0?null:(model.palette[token]||[255,255,255]);
function draw(id,tokens){
 const canvas=$(id),ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,16,16);
 for(let i=0;i<256;i++){
  const v=tokens[i];
  if(v<0){ctx.fillStyle=(i+Math.floor(i/16))%2===0?'#536575':'#43535c';}
  else {const rgb=color(v);if(!rgb)continue;ctx.fillStyle='rgb('+rgb.join(',')+')';}
  ctx.fillRect(i%16,Math.floor(i/16),1,1);
 }
}
let seed=2026;
function random(){
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 return seed/4294967296;
}
function setSelection(){
 selected=Number($('#sample').value)||0;
 original=model.examples[selected].pixels.slice();
 $('#naive-strokes').textContent=original.filter(x=>x>0).length+' 笔';
 hidePixels();
}
function hidePixels(){
 seed=Number($('#seed').value)||2026;
 const fraction=Number($('#mask').value)/100;
 damaged=original.map(v=>random()<fraction?-1:v);
 if(!damaged.some(v=>v===-1))damaged[0]=-1;
 predicted=damaged.slice();
 draw('#original',original);draw('#corrupted',damaged);draw('#predicted',predicted);
 $('#masked-pixels').textContent=damaged.filter(x=>x===-1).length;
 $('#local-accuracy').textContent='点击神经网络修复';
 if(replayTimer)clearInterval(replayTimer);
 replayTimer=null;draw('#rl-canvas',Array(256).fill(0));
 $('#rl-progress').textContent='0 / 0';$('#policy-strokes').textContent='—';
 $('#rl-action').textContent='点击播放，观察策略的每次绘制操作';
 $('#progress').style.width='0%';
}
function logitsAt(p,tokens){
 const x=p%16,y=Math.floor(p/16);
 const hidden=Float64Array.from(model.b1);
 let i=0;
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  const sx=x+dx,sy=y+dy;
  const token=(sx>=0&&sx<16&&sy>=0&&sy<16&&tokens[sy*16+sx]>=0)?tokens[sy*16+sx]:12;
  const weights=model.w1[i*13+token];
  for(let h=0;h<hidden.length;h++)hidden[h]+=weights[h];
  i++;
 }
 const wx=model.w1[325],wy=model.w1[326];
 for(let h=0;h<hidden.length;h++)hidden[h]=Math.max(0,hidden[h]+wx[h]*x/15+wy[h]*y/15);
 const scores=model.b2.slice();
 for(let h=0;h<hidden.length;h++){
  if(hidden[h]===0)continue;
  for(let k=0;k<scores.length;k++)scores[k]+=hidden[h]*model.w2[h][k];
 }
 let best=0;
 for(let k=1;k<scores.length;k++)if(scores[k]>scores[best])best=k;
 return {value:best,score:scores[best]};
}
async function restore(){
 if(!model)return;
 $('#restore').disabled=true;
 try{
  const working=damaged.slice();
  const hidden=[];
  for(let i=0;i<256;i++)if(working[i]===-1)hidden.push(i);
  let remaining=hidden;
  for(let round=0;round<5&&remaining.length;round++){
   const proposals=remaining.map(i=>({at:i,...logitsAt(i,working)}));
   proposals.sort((a,b)=>b.score-a.score);
   const n=round===4?proposals.length:Math.max(1,Math.ceil(proposals.length*.35));
   for(const p of proposals.slice(0,n))working[p.at]=p.value;
   remaining=proposals.slice(n).map(p=>p.at);
   draw('#predicted',working);
   // Yield a frame so the user sees the sequential learned reconstruction.
   await new Promise(resolve=>setTimeout(resolve,80));
  }
  predicted=working;
  let correct=0;
  for(const i of hidden)if(working[i]===original[i])correct++;
  $('#local-accuracy').textContent='本图遮挡区域 '+(correct/hidden.length*100).toFixed(1)+'% 像素正确';
  $('#ml-status').textContent='神经网络推理完成 · '+hidden.length+' 个遮挡像素';
 }finally{$('#restore').disabled=false;}
}
function candidate(target,current,p,action){
 const col=target[p],x=p%16,y=Math.floor(p/16);
 if(!col)return [];
 const valid=q=>q>=0&&q<256&&target[q]===col&&current[q]!==col;
 if(action===0)return [p];
 if(action===1)return Array.from({length:Math.min(4,16-x)},(_,i)=>p+i).filter(valid);
 if(action===2)return Array.from({length:Math.min(4,16-y)},(_,i)=>p+16*i).filter(valid);
 if(action===3)return [p,p+1,p+16,p+17].filter(q=>q<256&&q%16>=x&&Math.floor(q/16)>=y&&q%16<=x+1&&Math.floor(q/16)<=y+1&&valid(q));
 const seen=new Set([p]),stack=[p],out=[];
 while(stack.length&&out.length<48){
  const q=stack.pop();
  if(valid(q))out.push(q);
  const xx=q%16,yy=Math.floor(q/16);
  for(const n of [xx>0?q-1:-1,xx<15?q+1:-1,yy>0?q-16:-1,yy<15?q+16:-1]){
   if(n>=0&&!seen.has(n)&&target[n]===col){seen.add(n);stack.push(n);}
  }
 }
 return out;
}
function stateKey(target,current,p){
 const lens=[1,2,3,4].map(a=>Math.min(4,candidate(target,current,p,a).length));
 return [...lens,Number(target[p]>0)].join(':');
}
function nextPixel(target,current){
 for(let p=0;p<256;p++)if(target[p]>0&&target[p]!==current[p])return p;
 return -1;
}
function paintPlan(target,q){
 const canvas=Array(256).fill(0),ops=[];
 for(let n=0;n<256;n++){
  const p=nextPixel(target,canvas);
  if(p<0)break;
  const values=q[stateKey(target,canvas,p)]||Array(5).fill(0);
  let action=0;
  for(let i=1;i<5;i++)if(values[i]>values[action])action=i;
  const points=candidate(target,canvas,p,action);
  points.forEach(i=>canvas[i]=target[i]);
  ops.push({action,points,color:target[p]});
 }
 return ops;
}
function replay(){
 if(!model||!policy)return;
 if(replayTimer)clearInterval(replayTimer);
 const plan=paintPlan(original,policy.q);
 const canvas=Array(256).fill(0);
 let count=0;
 $('#policy-strokes').textContent=plan.length+' 笔';
 function tick(){
  const p=plan[count++];
  if(!p){clearInterval(replayTimer);replayTimer=null;$('#rl-action').textContent='策略绘制完成';return;}
  p.points.forEach(i=>canvas[i]=p.color);
  draw('#rl-canvas',canvas);
  $('#rl-action').textContent=['单点像素','横向笔画','纵向笔画','小矩形','连通区域填充'][p.action]+' · '+p.points.length+' 像素';
  $('#rl-progress').textContent=count+' / '+plan.length;
  $('#progress').style.width=(count/plan.length*100)+'%';
  if(count>=plan.length){clearInterval(replayTimer);replayTimer=null;}
 }
 tick();replayTimer=setInterval(tick,70);
}
function chart(history){
 const svg=$('#loss-chart');
 svg.replaceChildren();
 if(!history||history.length<2)return;
 const nums=history.map(p=>p.cross_entropy);
 const min=Math.min(...nums),max=Math.max(...nums),width=340,height=103;
 const points=nums.map((v,i)=>{
  const x=10+i/(nums.length-1)*width;
  const y=10+(max-v)/Math.max(.001,max-min)*height;
  return x.toFixed(2)+','+y.toFixed(2);
 }).join(' ');
 const ns='http://www.w3.org/2000/svg';
 for(const y of [13,45,80,115]){
  const line=document.createElementNS(ns,'line');
  for(const [a,v] of Object.entries({x1:0,x2:360,y1:y,y2:y,stroke:'#35515e','stroke-dasharray':'3 7'}))line.setAttribute(a,v);
  svg.append(line);
 }
 const path=document.createElementNS(ns,'polyline');
 path.setAttribute('points',points);path.setAttribute('fill','none');
 path.setAttribute('stroke','#a9d6b7');path.setAttribute('stroke-width','3');
 path.setAttribute('stroke-linejoin','round');svg.append(path);
}
async function init(){
 try{
  const [a,b]=await Promise.all([
   fetch('./model.json',{cache:'no-cache'}),fetch('./brush-policy.json',{cache:'no-cache'})
  ]);
  if(!a.ok||!b.ok)throw Error('训练文件尚未部署：模型 '+a.status+'，策略 '+b.status);
  [model,policy]=await Promise.all([a.json(),b.json()]);
  if(model.format!=='pixel-lab-neural-inpaint-v1'||policy.format!=='pixel-lab-q-brush-v1')
   throw Error('模型版本不匹配');
  if(model.input_features!==327||model.palette.length!==12||model.examples.length<2)
   throw Error('模型数据形状错误');
  model.examples.forEach((e,i)=>{
   const opt=document.createElement('option');
   opt.value=String(i);opt.textContent=e.label;
   $('#sample').append(opt);
  });
  const m=model.metrics,r=policy.metrics;
  $('#metric-images').textContent=m.training_sprites+m.validation_sprites;
  $('#metric-accuracy').textContent=(m.heldout_masked_accuracy*100).toFixed(1)+'%';
  $('#metric-steps').textContent=m.steps;
  $('#metric-rl').textContent=(r.stroke_reduction*100).toFixed(1)+'%';
  $('#ml-status').textContent='神经网络已训练 · 已验证';
  $('#data-status').textContent=model.sources.filter(p=>p.image_count>0).length+' 个 CC0 来源 · 留出集 '+m.validation_sprites+' 张';
  chart(m.loss_history);setSelection();
  window.__PIXEL_LAB__={get model(){return model;},get policy(){return policy;},
   get pixels(){return {original,damaged,predicted};},
   restore,replay,paintPlan};
 }catch(e){
  $('#ml-status').textContent='模型不可用：'+e.message;
  $('#data-status').textContent='需要 GitHub Actions 完成真实训练';
  console.error(e);
 }
}
$('#sample').addEventListener('change',setSelection);
$('#mask').addEventListener('input',()=>$('#mask-value').textContent=$('#mask').value+'%');
$('#seed').addEventListener('change',hidePixels);
$('#damage').addEventListener('click',hidePixels);
$('#restore').addEventListener('click',restore);
$('#replay').addEventListener('click',replay);
init();
