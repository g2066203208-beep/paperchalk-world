import {MATERIALS,SIZES,generateMaterial,quantizeImage,healSeams,exportRGBA,inspect} from './material-forge-core.mjs';
const $=id=>document.getElementById(id);
const canvas=$('edit'),ctx=canvas.getContext('2d'),repeat=$('repeat'),rctx=repeat.getContext('2d');
const negative='low quality, blurry, photographic, perspective view, isometric, room, environment, objects, text, watermark, bevel, bloom, strong directional shadow, depth of field, 3d, gradient lighting, vignette, border';
const promptMaterials={
wood:'oak wood plank floor texture, aligned planks, long wood grain, occasional wood knots, deliberately spaced narrow seams',
brick:'aged red brick wall texture, staggered rectangular brick pattern, thin uniform mortar joints, slight warm color variation',
stone:'rough gray stone masonry texture, irregular polygonal large stones, dark mortar gaps, carefully grouped cracks',
grass:'lush short grass ground texture, clustered blades of grass, dark green tufts, broad organic patches',
dirt:'damp brown soil ground texture, compact soil clumps, subtle large patches, occasional small pebbles',
sand:'fine beige sand ground texture, scattered tiny dune patterns, warm matte mineral colors',
metal:'weathered steel plate texture, repeatable square metal plates, narrow dark seams, small rivets, brushed metal details',
cloth:'woven dark purple fabric texture, clearly visible orderly cross-weave, subtle fabric fibers, flat lighting',
roof:'handmade terracotta roof tile texture, repeated overlapping roof shingles, horizontal staggered rows',
bark:'tree bark texture, long vertical ridges, broken deep cracks, warm brown rough bark',
water:'calm top down water surface texture, small layered blue ripples, limited foam accents',
moss:'old moss covered stone texture, large green moss patches, exposed pale gray stone, dark cracks'
};
let kind='wood',tile=generateMaterial(kind,64,42),original=null,pen=3,history=[],future=[],painting=false,grid=false,lastPoint=null;
const maxHistory=25;
const setStatus=(s,bad=false)=>{$('status').textContent=s;$('status').style.color=bad?'#f6a5bb':'#bfebc8';};
function snapshot(){return {indices:Uint8Array.from(tile.indices),palette:[...tile.palette],size:tile.size,kind:tile.kind,seed:tile.seed,source:tile.source}}
function restore(s){tile={...s,indices:Uint8Array.from(s.indices),palette:[...s.palette]};render()}
function push(before){if(before.indices.some((v,i)=>v!==tile.indices[i])){history.push(before);if(history.length>maxHistory)history.shift();future=[];}render()}
function paintRGBA(target,g,src){const im=g.createImageData(src.width,src.height);im.data.set(src.rgba);g.putImageData(im,0,0)}
function rawCanvas(t){const c=document.createElement('canvas');c.width=t.size;c.height=t.size;const g=c.getContext('2d');paintRGBA(c,g,{width:t.size,height:t.size,rgba:exportRGBA(t)});return c}
function showEdit(){const raw=rawCanvas(tile);ctx.clearRect(0,0,512,512);ctx.imageSmoothingEnabled=false;ctx.drawImage(raw,0,0,512,512);
if(grid&&tile.size<=64){const step=512/tile.size;ctx.strokeStyle='rgba(22,20,42,0.30)';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<=tile.size;i++){const xy=Math.round(i*step)+.5;ctx.moveTo(xy,0);ctx.lineTo(xy,512);ctx.moveTo(0,xy);ctx.lineTo(512,xy);}ctx.stroke();}}
function showRepeat(){const raw=rawCanvas(tile),n=Number($('repeatN').value),scale=450/n;rctx.clearRect(0,0,450,450);rctx.imageSmoothingEnabled=false;for(let y=0;y<n;y++)for(let x=0;x<n;x++)rctx.drawImage(raw,x*scale,y*scale,scale,scale)}
function paletteView(){const root=$('swatches');root.replaceChildren();tile.palette.forEach((col,i)=>{const b=document.createElement('button');b.style.background=col;b.type='button';b.title='颜色 '+i+' '+col;b.setAttribute('aria-label','选取颜色'+i+' '+col);if(i===pen)b.classList.add('selected');b.addEventListener('click',()=>{pen=i;paletteView()});root.append(b)})}
function readout(){const a=inspect(tile),detail=(a.exactEdgeMatch?'四边像素颜色严格匹配':'仍存在边缘像素差异');
$('viewname').textContent=(MATERIALS[tile.kind]?.name||'Anima导入纹理')+' · '+tile.size+'×'+tile.size;
$('statistics').textContent='原生：'+a.size+'×'+a.size+' · 颜色：'+a.colorsUsed+'/'+tile.palette.length+'\\n左右边界不一致格数：'+a.leftRightMismatches+'\\n上下边界不一致格数：'+a.topBottomMismatches+'\\n'+detail+'\\n视觉/艺术质量：待人工验收\\n来源：'+tile.source;
$('undo').disabled=!history.length;$('redo').disabled=!future.length;}
function updatePrompt(){const details=promptMaterials[kind],s='masterpiece, best quality, safe, no humans, '+details+', pixel art, game texture, orthographic top-down view, flat lighting, edge-to-edge repeating surface, seamless tileable material, no isolated objects, structured clean color clusters, crisp pixel edges, limited matte color palette, square image, uniform texel density';
$('prompt').textContent=s;}
function render(){showEdit();showRepeat();paletteView();readout();$('presets').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===kind)));updatePrompt();}
function newMaterial(){const n=Number($('size').value),seed=Math.floor(Number($('seed').value)||0);original=null;tile=generateMaterial(kind,n,seed);history=[];future=[];pen=Math.min(3,tile.palette.length-1);render();setStatus('已生成全新 '+n+'×'+n+' 原生格材质（程序化，非 Anima 生成）');}
for(const [k,info] of Object.entries(MATERIALS)){const b=document.createElement('button');b.type='button';b.dataset.kind=k;b.textContent=info.name.split(' / ')[0];b.title=info.name;b.addEventListener('click',()=>{kind=k;newMaterial()});$('presets').append(b)}
$('generate').addEventListener('click',newMaterial);$('reset').addEventListener('click',newMaterial);
$('grid').addEventListener('change',e=>{grid=e.target.checked;showEdit()});
$('repeatN').addEventListener('change',showRepeat);
$('size').addEventListener('change',newMaterial);
$('heal').addEventListener('click',()=>{const before=snapshot();tile.indices=healSeams(tile.indices,tile.size,tile.palette,4);push(before);setStatus('已锁定四边像素颜色；请检查3×3 / 5×5是否出现重复条带或不自然结构');});
function pos(e){const r=canvas.getBoundingClientRect();return {x:Math.min(tile.size-1,Math.max(0,Math.floor((e.clientX-r.left)/r.width*tile.size))),y:Math.min(tile.size-1,Math.max(0,Math.floor((e.clientY-r.top)/r.height*tile.size)))}} 
function drawAt(p){tile.indices[p.y*tile.size+p.x]=pen;showEdit();showRepeat();readout();}
canvas.addEventListener('pointerdown',e=>{if(e.button&&e.pointerType==='mouse')return;painting=true;lastPoint=snapshot();canvas.setPointerCapture(e.pointerId);drawAt(pos(e));});
canvas.addEventListener('pointermove',e=>{const p=pos(e);$('coord').textContent='位置 x:'+p.x+' y:'+p.y+' · 色号 '+tile.indices[p.y*tile.size+p.x];if(painting)drawAt(p)});
canvas.addEventListener('pointerup',()=>{if(!painting)return;painting=false;push(lastPoint);lastPoint=null;});
canvas.addEventListener('pointercancel',()=>{if(!painting)return;painting=false;restore(lastPoint);lastPoint=null;});
$('undo').addEventListener('click',()=>{if(!history.length)return;future.push(snapshot());restore(history.pop())});
$('redo').addEventListener('click',()=>{if(!future.length)return;history.push(snapshot());restore(future.pop())});
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);setStatus('已导出 '+name);}
function saveCanvas(c,name){c.toBlob(blob=>{if(blob)downloadBlob(blob,name);else setStatus('PNG编码失败',true)},'image/png')}
$('png').addEventListener('click',()=>saveCanvas(rawCanvas(tile),'pixelatelier-'+tile.kind+'-'+tile.size+'-native.png'));
$('repeatPNG').addEventListener('click',()=>saveCanvas(repeat,'pixelatelier-'+tile.kind+'-'+Number($('repeatN').value)+'x-repeat.png'));
$('json').addEventListener('click',()=>{const payload={schema:1,kind:tile.kind,size:tile.size,seed:tile.seed,source:tile.source,palette:tile.palette,indices:Array.from(tile.indices),audit:inspect(tile)};downloadBlob(new Blob([JSON.stringify(payload)],{type:'application/json'}),'pixelatelier-'+tile.kind+'-material.json')});
$('atlas').addEventListener('click',()=>{const n=tile.size,cols=4,rows=Math.ceil(Object.keys(MATERIALS).length/cols);const out=document.createElement('canvas');out.width=cols*n;out.height=rows*n;const g=out.getContext('2d');g.imageSmoothingEnabled=false;Object.keys(MATERIALS).forEach((k,i)=>{const t=kind===k&&tile.kind===k?tile:generateMaterial(k,n,Number($('seed').value)||42);g.drawImage(rawCanvas(t),i%cols*n,Math.floor(i/cols)*n)});saveCanvas(out,'pixelatelier-12materials-atlas-'+(cols*n)+'x'+(rows*n)+'.png')});
$('import').addEventListener('click',()=>{$('image').value='';$('image').click()});
$('image').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error('图片不得超过20MB');if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('仅支持PNG/JPEG/WebP');const img=await createImageBitmap(file);try{const n=Number($('size').value),c=document.createElement('canvas');c.width=n;c.height=n;const g=c.getContext('2d',{willReadFrequently:true});const crop=Math.min(img.width,img.height),sx=(img.width-crop)/2,sy=(img.height-crop)/2;g.imageSmoothingEnabled=true;g.drawImage(img,sx,sy,crop,crop,0,0,n,n);const result=quantizeImage(g.getImageData(0,0,n,n).data,n,Number($('colors').value));tile={...result,indices:healSeams(result.indices,n,result.palette,4)};original=result;history=[];future=[];pen=0;render();setStatus('Anima图已本地量化为 '+n+'×'+n+'，并修复边界。需要美术精修，非原生绘制证明。');}finally{img.close();}}catch(error){setStatus(error.message,true)}});
async function copy(s){try{await navigator.clipboard.writeText(s);setStatus('提示词已复制')}catch(e){setStatus('复制失败，请手动选取文本',true)}}
$('copyPrompt').addEventListener('click',()=>copy($('prompt').textContent));
$('copyNegative').addEventListener('click',()=>copy(negative));
render();setStatus('实验台已就绪：可以生成12种结构化原生材质，或导入Anima图片');
window.__MATERIAL_FORGE__={state:()=>({kind,size:tile.size,source:tile.source,audit:inspect(tile),paletteCount:tile.palette.length}),select:(k)=>{if(MATERIALS[k]){kind=k;newMaterial()}}};
