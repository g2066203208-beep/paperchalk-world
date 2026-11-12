/* Seven simultaneous, independently transformable 2D paper layers.
   This is the original paper-ocean scene entry, not a new unrelated renderer. */
(function (root) {
'use strict';
const MASTER='./assets/paper-ocean/depth-journey-master.png';
const CHAPTER=[
 {id:'village',name:'初始小村',kind:'安全区',from:70,to:100,detail:'离开村庄，踏上旅程'},
 {id:'fields',name:'麦田小路',kind:'旅途',from:59,to:85,detail:'沿田野道路继续前行'},
 {id:'forest',name:'幽深森林',kind:'旅途',from:46,to:72,detail:'森林渐渐笼罩道路'},
 {id:'ruins',name:'遗迹外道',kind:'旅途',from:36,to:60,detail:'穿过坍塌的古代石廊'},
 {id:'graveyard',name:'墓地与荒野',kind:'精英',from:27,to:49,detail:'前方出现静默的墓园'},
 {id:'fortress',name:'古堡前庭',kind:'旅途',from:15,to:39,detail:'前往深处的城堡入口'},
 {id:'throne',name:'深渊王座',kind:'最终 BOSS',from:0,to:26,detail:'旅程尽头的王座显现'}
];
function create({stage,view}={}) {
 if(!stage||!view)throw new Error('paper-depth requires stage and view');
 const doc=stage.ownerDocument;
 const board=doc.createElement('section');
 board.id='paper-ocean-stage';board.className='paper-depth-stage';board.hidden=true;
 board.setAttribute('aria-label','连续七层二维纸片景深舞台');
 const underlay=doc.createElement('div');underlay.className='paper-depth-underlay';board.appendChild(underlay);
 const world=doc.createElement('div');world.className='paper-depth-world';board.appendChild(world);
 const layers=[];
 // Draw back to front, preserving the original painted world's vertical alignment.
 CHAPTER.slice().reverse().forEach((item)=>{
  const node=doc.createElement('div');
  node.className='paper-depth-layer';node.dataset.layer=item.id;
  node.style.backgroundImage='url("'+MASTER+'")';
  const hi=Math.max(0,item.from), lo=Math.min(100,item.to);
  const a=Math.max(0,hi-3), b=Math.min(lo,hi+3), c=Math.max(b,lo-5), d=Math.min(100,lo+4);
  let mask;
  if(hi===0)mask='linear-gradient(to bottom, #000 0%, #000 '+c+'%, transparent '+d+'%)';
  else if(lo===100)mask='linear-gradient(to bottom, transparent '+a+'%, #000 '+b+'%, #000 100%)';
  else mask='linear-gradient(to bottom, transparent '+a+'%, #000 '+b+'%, #000 '+c+'%, transparent '+d+'%)';
  node.style.webkitMaskImage=mask;node.style.maskImage=mask;
  node.setAttribute('aria-hidden','true');
  world.appendChild(node);layers.push({item,node});
 });
 const overlay=doc.createElement('div');overlay.className='paper-depth-overlay';
 overlay.innerHTML='<div class="paper-depth-heading"><span>第一章 · 深入之路</span><strong id="paper-depth-level">01 / 07</strong></div>'+
 '<div class="paper-depth-caption"><span id="paper-depth-type">安全区</span><strong id="paper-depth-name">初始小村</strong><small id="paper-depth-detail">离开村庄，踏上旅程</small></div>'+
 '<div class="paper-depth-actions"><button type="button" id="paper-depth-back" aria-label="回到上一层">上一层</button>'+
 '<button type="button" id="paper-depth-next">通关 · 向深处前进</button>'+
 '<button type="button" id="paper-depth-reset">重新开始</button></div>'+
 '<div class="paper-depth-ruler" id="paper-depth-ruler" aria-label="七层场景进度"></div>';
 board.appendChild(overlay);
 const source=stage.querySelector('#source');
 if(source)source.insertAdjacentElement('afterend',board);else stage.appendChild(board);
 const $=id=>board.querySelector('#'+id);
 const back=$('paper-depth-back'),next=$('paper-depth-next'),resetButton=$('paper-depth-reset');
 const ruler=$('paper-depth-ruler');
 const markers=CHAPTER.map((v,i)=>{
  const dot=doc.createElement('span');dot.title=(i+1)+'. '+v.name;
  dot.setAttribute('aria-label',v.name);ruler.appendChild(dot);return dot;
 });
 let active=false,level=0,finished=false,loaded=false;
 const masterImg=new Image();
 masterImg.onload=()=>{loaded=true;};
 masterImg.onerror=()=>{loaded=false;};
 masterImg.src=MASTER;
 function layout(animate=true) {
  world.classList.toggle('no-motion',!animate);
  layers.forEach(({item,node})=>{
   const i=CHAPTER.indexOf(item);
   const passed=i<level;
   const distance=i-level;
   node.classList.toggle('has-passed',passed);
   const effective=Math.max(0,level-Math.max(0,distance)*0.43);
   const magnification=1+effective*0.33;
   const shift=2.8*effective*effective;
   node.style.zIndex=String(CHAPTER.length-i);
   node.style.transform=passed?'translateY(130%) scale(1.15)':
     'translateY('+shift.toFixed(2)+'%) scale('+magnification.toFixed(3)+')';
   node.style.opacity=passed?'0':'1';
  });
  const current=CHAPTER[level];
  $('paper-depth-level').textContent=String(level+1).padStart(2,'0')+' / 07';
  $('paper-depth-type').textContent=current.kind;
  $('paper-depth-name').textContent=current.name;
  $('paper-depth-detail').textContent=finished?'终章完成 · 返回村庄可重新体验':current.detail;
  next.textContent=finished?'旅程完成':level===6?'击败最终 BOSS':'通关 · 向深处前进';
  back.disabled=level===0;next.disabled=finished;
  markers.forEach((n,i)=>{n.className=i<level?'done':i===level?'current':'';});
  board.dataset.level=String(level);
  board.dataset.complete=String(finished);
 }
 function advance(){
  if(!active||finished)return false;
  if(level===CHAPTER.length-1){finished=true;layout();return true;}
  level++;layout();return true;
 }
 function retreat(){
  if(!active||level===0)return false;
  level--;finished=false;layout();return true;
 }
 function reset(){level=0;finished=false;layout();return true;}
 next.addEventListener('click',advance);
 back.addEventListener('click',retreat);
 resetButton.addEventListener('click',reset);
 board.addEventListener('keydown',e=>{
  if(e.target?.tagName==='BUTTON')return;
  if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();advance();}
  if(e.key==='ArrowLeft'){e.preventDefault();retreat();}
 });
 function setActive(on){
  active=!!on;board.hidden=!active;view.classList.toggle('paper-ocean-active',active);
  if(active)layout(false);
 }
 function inspect(){
  return {active,renderer:'continuous-2d-cutout-depth',perspective:false,
   layerCount:layers.length,layers:CHAPTER.map(x=>x.id),level:level+1,
   current:CHAPTER[level].id,finished,allLayersMounted:layers.every(x=>x.node.isConnected),
   assets:[{name:'master',complete:masterImg.complete,naturalWidth:masterImg.naturalWidth}],
   imagesLoaded:loaded&&masterImg.naturalWidth>0};
 }
 layout(false);
 return Object.freeze({setActive,advance,retreat,reset,inspect,get element(){return board;}});
}
root.PaperWorldPaperOcean=Object.freeze({create});
})(window);
