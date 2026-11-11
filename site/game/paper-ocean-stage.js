/* Paperchalk: a six-level 2D paper-stage progression.
   Retains the existing paper-ocean hosted entry and renderer API.
   Each independent DOM image is a masked 2D painted plane, not a 3D mesh.
   Future battle engine should call markCleared(), then advance().
*/
(function(root){
'use strict';
const ART='./assets/paper-depth/village-to-abyss-master.png';
const LEVELS=Object.freeze([
 {id:'village',name:'灯火村庄',hint:'第一层 · 村口',zoom:1,focus:.79,
  clip:'polygon(0 61%,10% 64%,22% 67%,35% 66%,49% 69%,63% 65%,76% 67%,89% 63%,100% 62%,100% 100%,0 100%)'},
 {id:'fields',name:'村外原野',hint:'第二层 · 金色麦田',zoom:1.46,focus:.74,
  clip:'polygon(0 51%,13% 55%,29% 59%,43% 60%,59% 61%,77% 58%,100% 51%,100% 87%,80% 83%,61% 89%,42% 82%,21% 87%,0 85%)'},
 {id:'forest',name:'迷雾森林',hint:'第三层 · 幽暗林间',zoom:1.93,focus:.59,
  clip:'polygon(0 36%,13% 43%,25% 41%,39% 48%,50% 46%,62% 48%,78% 41%,91% 44%,100% 36%,100% 73%,83% 67%,66% 72%,46% 68%,25% 73%,0 70%)'},
 {id:'graveyard',name:'荒废墓园',hint:'第四层 · 古老坟地',zoom:2.42,focus:.44,
  clip:'polygon(0 28%,17% 33%,31% 35%,47% 36%,65% 35%,82% 32%,100% 27%,100% 60%,81% 57%,65% 61%,46% 56%,28% 59%,0 57%)'},
 {id:'ruins',name:'诅咒遗迹',hint:'第五层 · 破碎城墙',zoom:2.95,focus:.29,
  clip:'polygon(0 14%,14% 18%,29% 16%,43% 20%,61% 19%,79% 16%,100% 13%,100% 44%,82% 40%,66% 44%,49% 40%,31% 45%,15% 41%,0 43%)'},
 {id:'boss',name:'深渊王座',hint:'最终层 · 守门者',zoom:3.55,focus:.13,
  clip:'polygon(0 0,100% 0,100% 35%,85% 33%,67% 35%,49% 31%,34% 35%,16% 33%,0 35%)'}
]);
const reduced=()=>Boolean(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches);
function node(tag,cls,parent){const v=document.createElement(tag);v.className=cls;parent.appendChild(v);return v;}
function create({stage,view}={}){
 if(!stage||!view)throw Error('paper-depth needs stage and view');
 const board=node('div','paper-depth-stage',stage);
 board.id='paper-ocean-stage';board.hidden=true;
 board.setAttribute('aria-label','从村庄向远方 Boss 逐层深入的六层 2D 纸片舞台');
 const backdrop=node('img','depth-backdrop',board);
 backdrop.src=ART;backdrop.alt='从灯火村庄一直通往深渊王座的完整绘画背景';backdrop.draggable=false;
 const stack=node('div','depth-stack',board);
 const planes=LEVELS.map((info,i)=>{
  const l=node('div','depth-layer',stack);
  l.dataset.depth=info.id;l.style.zIndex=String(30-i);
  const image=node('img','depth-layer-art',l);
  image.src=ART;image.alt='';image.draggable=false;image.decoding='async';
  image.style.clipPath=info.clip;
  return l;
 });
 node('div','depth-atmosphere',board);
 const ui=node('div','depth-ui',board);
 const heading=node('div','depth-heading',ui);
 const eyebrow=node('span','depth-eyebrow',heading);
 const title=node('h2','depth-title',heading);
 const subtitle=node('span','depth-subtitle',heading);
 const progress=node('div','depth-progress',ui);
 progress.setAttribute('aria-label','纵深关卡进度');
 const dots=LEVELS.map((info,i)=>{
  const d=node('span','depth-dot',progress);d.title=String(i+1)+' · '+info.name;return d;
 });
 const actions=node('div','depth-actions',ui);
 const status=node('span','depth-status',actions);status.setAttribute('aria-live','polite');
 const testBtn=node('button','depth-test-clear',actions);
 testBtn.type='button';testBtn.textContent='测试：本关完成';
 const nextBtn=node('button','depth-advance',actions);
 nextBtn.type='button';nextBtn.textContent='继续深入';
 const resetBtn=node('button','depth-reset',actions);
 resetBtn.type='button';resetBtn.textContent='重置';
 let active=false,level=0,cleared=false,transitioning=false,token=0;
 const pose=(zoom,focus)=>'translateY('+(zoom<=1?0:(.5-focus)*zoom*100).toFixed(3)+'%) scale('+zoom.toFixed(3)+')';
 function draw(){
  const here=LEVELS[level];
  backdrop.style.transform=pose(here.zoom,here.focus);
  for(let i=0;i<planes.length;i++){
   const p=planes[i];
   if(i<level){
    p.style.opacity='0';p.style.transform='translateY(126%) scale(1.25)';
   }else{
    const n=i-level;
    const tr=pose(here.zoom*(1-n*.022),here.focus);
    p.style.setProperty('--depth-pose',tr);
    p.style.transform=tr;
    p.style.opacity=String(Math.max(.56,1-n*.045));
   }
  }
  board.dataset.level=String(level+1);board.dataset.layer=here.id;
  eyebrow.textContent='PAPER DEPTH / '+String(level+1).padStart(2,'0')+' OF '+LEVELS.length;
  title.textContent=here.name;subtitle.textContent=here.hint;
  dots.forEach((d,i)=>{d.classList.toggle('is-current',i===level);d.classList.toggle('is-cleared',i<level);});
  status.textContent=transitioning?'正在向深处推进':cleared?(level===LEVELS.length-1?'最终 Boss 已击败（测试）':'本关已完成'):'场景推进测试 · 非正式战斗';
  testBtn.hidden=cleared||transitioning;
  nextBtn.hidden=!cleared||transitioning;
  nextBtn.textContent=level===LEVELS.length-1?'重新从村庄出发':'继续深入';
  resetBtn.hidden=transitioning||(level===0&&!cleared);
 }
 function emitStage(){
  board.dispatchEvent(new CustomEvent('paper-depth-stagechange',{detail:{level:level+1,id:LEVELS[level].id,title:LEVELS[level].name}}));
 }
 function reset(){
  token++;transitioning=false;level=0;cleared=false;
  planes.forEach(p=>p.classList.remove('is-exiting','is-approaching'));
  board.classList.remove('depth-is-moving');
  draw();emitStage();
  return true;
 }
 function markCleared(){
  if(!active||transitioning||cleared)return false;
  cleared=true;draw();
  board.dispatchEvent(new CustomEvent('paper-depth-cleared',{detail:{level:level+1,id:LEVELS[level].id}}));
  return true;
 }
 function advance(){
  if(!active||!cleared||transitioning)return false;
  if(level===LEVELS.length-1)return reset();
  const leaving=planes[level],coming=planes[level+1],id=++token;
  leaving.style.setProperty('--depth-start-pose',leaving.style.transform);
  transitioning=true;cleared=false;level++;
  leaving.classList.add('is-exiting');coming.classList.add('is-approaching');
  board.classList.add('depth-is-moving');
  draw();emitStage();
  const finish=()=>{
   if(id!==token)return;
   leaving.classList.remove('is-exiting');coming.classList.remove('is-approaching');
   board.classList.remove('depth-is-moving');transitioning=false;draw();
  };
  if(reduced())finish();else root.setTimeout(finish,1120);
  return true;
 }
 function setActive(on){
  const value=!!on;if(value===active)return;
  active=value;board.hidden=!active;view.classList.toggle('paper-ocean-active',active);
  if(active)reset();
  else{token++;transitioning=false;board.classList.remove('depth-is-moving');}
 }
 function inspect(){
  const images=[backdrop,...stack.querySelectorAll('img')];
  return {active,renderer:'flat-2d-depth-paper-stage',perspective:false,
   currentLevel:level+1,totalLevels:LEVELS.length,currentId:LEVELS[level].id,
   cleared,transitioning,renderMode:'independent-masked-2d-planes',
   layers:LEVELS.map(x=>x.id),imageCount:images.length,
   imagesLoaded:images.every(x=>x.complete&&x.naturalWidth>0),
   assets:images.map((img,i)=>({name:i?'layer-'+(i-1):'backdrop',complete:img.complete,naturalWidth:img.naturalWidth}))};
 }
 testBtn.addEventListener('click',markCleared);
 nextBtn.addEventListener('click',advance);
 resetBtn.addEventListener('click',reset);
 draw();
 return Object.freeze({setActive,inspect,markCleared,advance,reset,get element(){return board;}});
}
root.PaperWorldPaperOcean=Object.freeze({create,levels:LEVELS.map(v=>({id:v.id,name:v.name}))});
})(window);
