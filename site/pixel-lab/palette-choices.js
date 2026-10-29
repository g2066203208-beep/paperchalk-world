import { recolor, readSourceTokens, validateCanvas, PALETTE_ORIGINAL, ROLES } from './palette-core.js';
import { drawWorld,validateWorld,WORLD_W,WORLD_H } from './palette-worlds.js';

const $=id=>document.getElementById(id);
const W=384,H=512;
const model={palettes:[],tokens:null,canvases:new Map(),worlds:new Map(),active:'A',compare:'B',grid:true,focus:'face',inspectorOffset:{x:0,y:0}};
const $cards=$('cards');
const regions={face:{x:154,y:112},sleeve:{x:319,y:217},skirt:{x:177,y:251},shoe:{x:199,y:449}};
const inspect=$('inspectCanvas'),ic=inspect.getContext('2d',{willReadFrequently:true});
const hexToRgb=h=>[1,3,5].map(p=>parseInt(h.slice(p,p+2),16));
const copyText=async value=>{
  try{await navigator.clipboard.writeText(value);$('status').textContent='已复制到剪贴板：'+value;}
  catch{$('status').textContent='复制受到浏览器限制，颜色已在页面显示：'+value;}
};
function downloadLink(url,name){
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
}
async function downloadPNG(){
 const p=find(model.active);const canvas=model.canvases.get(p.id);
 if(!canvas){return}
 const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));
 if(!blob)throw Error('PNG导出失败');
 const url=URL.createObjectURL(blob);
 downloadLink(url,'game-palette-'+p.id+'-'+p.en.toLowerCase().replaceAll(' ','-')+'-384x512.png');
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function downloadJSON(){
 const p=find(model.active);
 const value={version:1,status:'candidate',id:p.id,name:p.name,en:p.en,
  source:'Same first-party 384x512 four-color full-body pixel sprite',
  artDirection:{scene:p.scene,shape:p.shape,ui:p.ui,motto:p.motto},
  colors:p.colors,roles:ROLES,width:W,height:H,noShading:true};
 const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 downloadLink(url,'game-palette-'+p.id+'.json');
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function find(id){return model.palettes.find(p=>p.id===id)||model.palettes[0]}
function displayColorList(p){
 const sizes=Array(4).fill(0);
 for(const v of model.tokens)sizes[v]++;
 return p.colors.map((hex,i)=>'<div class="palette-role"><span class="square" style="background:'+hex+'"></span>'+
  '<span><strong>'+ROLES[i]+'</strong><code>'+hex+'</code></span><span class="percent">'+(sizes[i]/model.tokens.length*100).toFixed(1)+'%</span></div>').join('');
}
function setActive(id){
 const p=find(id);
 model.active=p.id;
 if(model.compare===model.active){const next=model.palettes[(model.palettes.indexOf(p)+1)%model.palettes.length];model.compare=next.id;$('compareSelect').value=model.compare;}
 $('selectedLetter').textContent=p.id+'.';$('selectedTitle').textContent=p.name;
 $('selectedEnglish').textContent=p.en.toUpperCase();
 $('selectedDescription').textContent=p.description;
 $('selectedMotto').textContent=p.motto;
 $('selectedShape').textContent=p.shape;
 $('selectedUI').textContent=p.ui;
 $('activeWorldName').textContent=p.scene;
 $('selectedSwatches').innerHTML=displayColorList(p);
 $('activeId').textContent=p.id;$('activeStageName').textContent=p.name;
 renderSelected();
 for(const el of $cards.querySelectorAll('.palette-card')){
  const yes=el.dataset.id===p.id;el.setAttribute('aria-selected',String(yes));
  el.querySelector('.choose-button').textContent=yes?'已选择 ✓':'选择此方案';
 }
 const u=new URL(window.location.href);u.searchParams.set('p',p.id);history.replaceState({},'',u);
 window.PALETTE_STUDIO.active=p.id;
}
function setCompare(id){
 const p=find(id);
 model.compare=p.id;
 $('compareId').textContent=p.id;$('compareName').textContent=p.name;
 $('compareWorldName').textContent=p.scene;
 drawInto(model.canvases.get(p.id),$('compareCanvas'));
 drawIntoWorld(model.worlds.get(p.id),$('compareWorldCanvas'));
 window.PALETTE_STUDIO.compare=p.id;
}
function drawIntoWorld(from,to){
 if(!from)throw Error('Missing world artwork');
 const ctx=to.getContext('2d',{willReadFrequently:true});
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,WORLD_W,WORLD_H);ctx.drawImage(from,0,0);
}
function drawInto(from,to){
 const ctx=to.getContext('2d',{willReadFrequently:true});
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);ctx.drawImage(from,0,0);
}
function renderSelected(){
 const p=find(model.active);
 drawInto(model.canvases.get(p.id),$('activeCanvas'));
 drawIntoWorld(model.worlds.get(p.id),$('activeWorldCanvas'));
 setCompare(model.compare);
 drawInspector();
}
function drawInspector(){
 const src=model.canvases.get(model.active);if(!src)return;
 const x=Math.max(0,Math.min(W-48,regions[model.focus].x-24));
 const y=Math.max(0,Math.min(H-48,regions[model.focus].y-24));
 model.inspectorOffset={x,y};
 ic.imageSmoothingEnabled=false;
 ic.clearRect(0,0,384,384);
 ic.drawImage(src,x,y,48,48,0,0,384,384);
 if(model.grid){
  ic.save();ic.strokeStyle='rgba(245,251,255,0.47)';ic.lineWidth=1;
  ic.beginPath();
  for(let i=0;i<=48;i++){let p=i*8+.5;ic.moveTo(p,0);ic.lineTo(p,384);ic.moveTo(0,p);ic.lineTo(384,p);}
  ic.stroke();ic.strokeStyle='rgba(255,255,255,.75)';ic.lineWidth=1.5;ic.beginPath();
  for(let i=0;i<=48;i+=8){let p=i*8+.5;ic.moveTo(p,0);ic.lineTo(p,384);ic.moveTo(0,p);ic.lineTo(384,p);}ic.stroke();ic.restore();
 }
 $('inspectCoord').textContent='查看区域：x '+x+'–'+(x+47)+' · y '+y+'–'+(y+47);
 $('inspectColor').textContent='点击格子查看该坐标及 HEX 色值';
 $('inspectChip').style.background=find(model.active).colors[0];
}
function sampleInspector(event){
 const box=inspect.getBoundingClientRect();
 const px=Math.max(0,Math.min(47,Math.floor((event.clientX-box.left)/box.width*48)));
 const py=Math.max(0,Math.min(47,Math.floor((event.clientY-box.top)/box.height*48)));
 const x=model.inspectorOffset.x+px,y=model.inspectorOffset.y+py;
 const n=model.tokens[y*W+x],hex=find(model.active).colors[n];
 $('inspectCoord').textContent='像素坐标 ('+x+', '+y+')';
 $('inspectColor').textContent=hex+' · '+ROLES[n]+' · 第 '+(n+1)+' 色';
 $('inspectChip').style.background=hex;
}
function makeCard(p){
 const root=document.createElement('article');
 root.className='palette-card';root.dataset.id=p.id;root.setAttribute('aria-selected','false');
 const wrap=document.createElement('div');wrap.className='card-image-wrap';
 const canvas=model.canvases.get(p.id);canvas.setAttribute('aria-label',p.id+' '+p.name+' 384×512原生像素效果');
 wrap.append(canvas);wrap.title='点击选择 '+p.name;wrap.addEventListener('click',()=>setActive(p.id));
 const info=document.createElement('div');info.className='card-content';
 const top=document.createElement('div');top.className='card-top';
 const badge=document.createElement('span');badge.className='card-id';badge.textContent=p.id;
 const title=document.createElement('strong');title.className='card-name';title.textContent=p.name;
 top.append(badge,title);
 const en=document.createElement('div');en.className='card-en';en.textContent=p.en.toUpperCase();
 const description=document.createElement('div');description.className='card-desc';description.textContent=p.description;
 const swatches=document.createElement('div');swatches.className='card-swatches';
 for(const hex of p.colors){const el=document.createElement('div');el.className='mini-swatch';
  const s=document.createElement('div');s.className='sample';s.style.background=hex;
  const code=document.createElement('code');code.textContent=hex;el.append(s,code);swatches.append(el);}
 const worldBox=document.createElement('div');worldBox.className='card-world';
 const worldLabel=document.createElement('div');worldLabel.className='card-world-label';
 worldLabel.textContent='WORLD STUDY · '+p.scene;
 const worldCanvas=model.worlds.get(p.id);
 worldCanvas.className='card-world-canvas';
 worldCanvas.setAttribute('aria-label',p.name+'原创像素场景和HUD');
 worldBox.append(worldLabel,worldCanvas);
 const shape=document.createElement('div');shape.className='card-shape';
 shape.textContent='形状：'+p.shape;
 const act=document.createElement('div');act.className='card-actions';
 const btn=document.createElement('button');btn.className='choose-button';btn.type='button';btn.textContent='选择此方案';
 btn.addEventListener('click',()=>setActive(p.id));
 const val=document.createElement('span');val.className='card-validate';val.textContent='4 COLORS · 0 SHADING';
 act.append(btn,val);info.append(top,en,description,swatches,worldBox,shape,act);root.append(wrap,info);
 return root;
}
function sourceImage(path){
 return new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('无法读取参考像素图：'+path));img.src=path;
 });
}
async function boot(){
 try{
  const [res,img]=await Promise.all([fetch('./palette-choices.json'),sourceImage('./repixelized-384x512.png')]);
  if(!res.ok)throw Error('配色数据读取失败：HTTP '+res.status);
  model.palettes=await res.json();
  if(!Array.isArray(model.palettes)||model.palettes.length!==8)throw Error('要求恰好8套候选配色');
  if(img.width!==W||img.height!==H)throw Error('源图尺寸不正确：'+img.width+'×'+img.height);
  const src=document.createElement('canvas');src.width=W;src.height=H;
  const sx=src.getContext('2d',{willReadFrequently:true});sx.drawImage(img,0,0);
  model.tokens=readSourceTokens(sx.getImageData(0,0,W,H).data);
  for(const p of model.palettes){
   if(!/^[A-H]$/.test(p.id)||!Array.isArray(p.colors)||p.colors.length!==4||p.colors.some(h=>!/^#[0-9A-Fa-f]{6}$/.test(h)))throw Error('配色数据格式错误：'+p.id);
   const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
   const image=ctx.createImageData(W,H);recolor(model.tokens,p.colors,image.data);
   ctx.putImageData(image,0,0);const test=validateCanvas(image.data,p.colors);
   if(test.colors!==4||test.alpha!==0||test.other!==0)throw Error('四色失败：'+p.id);
   model.canvases.set(p.id,canvas);
   const worldCanvas=document.createElement('canvas');
   drawWorld(worldCanvas,p.colors,p.id);
   const worldCheck=validateWorld(worldCanvas,p.colors);
   if(worldCheck.colors!==4||worldCheck.invalid||worldCheck.transparency)throw Error('场景RGBA验证失败：'+p.id);
   model.worlds.set(p.id,worldCanvas);
  }
  const choose=$('compareSelect');for(const p of model.palettes){
   const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.id+' · '+p.name;choose.append(opt);
  }
  choose.value=model.compare;
  $cards.replaceChildren(...model.palettes.map(makeCard));
  const urlId=new URLSearchParams(location.search).get('p');
  const id=model.palettes.some(p=>p.id===urlId)?urlId:'A';
  window.PALETTE_STUDIO={
   ready:true,active:id,compare:model.compare,
   palettes:()=>model.palettes.map(p=>({id:p.id,colors:p.colors.slice(),name:p.name})),
   inspect:(letter)=>{const p=find(letter||model.active);const data=model.canvases.get(p.id).getContext('2d',{willReadFrequently:true}).getImageData(0,0,W,H).data;return {id:p.id,...validateCanvas(data,p.colors),world:validateWorld(model.worlds.get(p.id),p.colors),width:W,height:H,sourceTokens:model.tokens.length,grid:model.grid};},
   snapshot:(letter)=>model.canvases.get(find(letter||model.active).id).toDataURL('image/png')
  };
  setActive(id);$('downloadPNG').disabled=false;$('copyHEX').disabled=false;$('downloadJSON').disabled=false;
  $('status').textContent='8套差异化美术方向已加载：每套人物 + 原创场景 + HUD，均严格四色。点击任何一套比较。';
 }catch(err){$('status').classList.add('error');$('status').textContent='载入失败：'+err.message+'。请检查 GitHub Actions 是否已经发布源图。';console.error(err);}
}
$('compareSelect').addEventListener('change',e=>setCompare(e.target.value));
$('showGrid').addEventListener('change',e=>{model.grid=e.target.checked;drawInspector();});
$('inspectPart').addEventListener('change',e=>{model.focus=e.target.value;drawInspector();});
$('inspectCanvas').addEventListener('click',sampleInspector);
$('downloadPNG').addEventListener('click',()=>downloadPNG().catch(e=>{$('status').textContent=e.message;}));
$('downloadJSON').addEventListener('click',downloadJSON);
$('copyHEX').addEventListener('click',()=>copyText(find(model.active).colors.join('  ')));
boot();